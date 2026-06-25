const ALLOWED_ORIGIN = "*";
const ROUTE_ORIGIN = "Massachusetts / New England";
const ROUTE_DESTINATIONS = new Map([
    ["Ghana", "Ghana"],
    ["Ghana (Accra / Tema)", "Ghana"]
]);

function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}

function optionsResponse() {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400"
        }
    });
}

function isValidEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) && value.length <= 254;
}

function isValidPhone(value) {
    const phoneRegex = /^[0-9+()\-\s]{7,25}$/;
    return phoneRegex.test(value);
}

export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        if (!env.DB) {
            return jsonResponse({ success: false, error: "Database binding is not configured." }, 500);
        }

        if (!env.TURNSTILE_SECRET_KEY) {
            return jsonResponse({ success: false, error: "Turnstile secret key is not configured." }, 500);
        }

        const payload = await request.json();
        const {
            name,
            phone,
            email,
            origin,
            destination,
            turnstileToken
        } = payload;

        if (!name || !phone || !email || !origin || !destination || !turnstileToken) {
            return jsonResponse({ success: false, error: "Missing required registration fields." }, 400);
        }

        const cleanName = String(name).trim();
        const cleanPhone = String(phone).trim();
        const cleanEmail = String(email).trim().toLowerCase();
        const cleanOrigin = String(origin).trim();
        const cleanDestination = String(destination).trim();

        if (cleanName.length < 2 || cleanName.length > 120) {
            return jsonResponse({ success: false, error: "Name must be between 2 and 120 characters." }, 400);
        }

        if (!isValidPhone(cleanPhone)) {
            return jsonResponse({ success: false, error: "Invalid phone number format." }, 400);
        }

        if (!isValidEmail(cleanEmail)) {
            return jsonResponse({ success: false, error: "Invalid email format." }, 400);
        }

        if (cleanOrigin.length > 120 || cleanDestination.length > 120) {
            return jsonResponse({ success: false, error: "Route values are too long." }, 400);
        }

        if (cleanOrigin !== ROUTE_ORIGIN) {
            return jsonResponse({ success: false, error: "Unsupported origin location." }, 400);
        }

        const normalizedDestination = ROUTE_DESTINATIONS.get(cleanDestination);
        if (!normalizedDestination) {
            return jsonResponse({ success: false, error: "Unsupported destination country." }, 400);
        }

        const challengeForm = new FormData();
        challengeForm.append("secret", env.TURNSTILE_SECRET_KEY);
        challengeForm.append("response", turnstileToken);
        challengeForm.append("remoteip", request.headers.get("CF-Connecting-IP") || "");

        const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            body: challengeForm
        });

        if (!verifyResponse.ok) {
            return jsonResponse({ success: false, error: "Security verification service unavailable." }, 503);
        }

        const verification = await verifyResponse.json();
        if (!verification.success) {
            return jsonResponse({ success: false, error: "Security verification failed." }, 403);
        }

        const createdAt = new Date().toISOString();

        const dbResult = await env.DB.prepare(
            "INSERT INTO leads (name, phone, email, origin, destination, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(cleanName, cleanPhone, cleanEmail, cleanOrigin, normalizedDestination, createdAt).run();

        if (!dbResult.success) {
            throw new Error("D1 insert failed");
        }

        return jsonResponse({ success: true, message: "Lead registered successfully." }, 201);
    } catch (error) {
        if (error.message && error.message.includes("UNIQUE constraint failed")) {
            return jsonResponse({ success: false, error: "This email is already registered." }, 409);
        }

        return jsonResponse({ success: false, error: "System error while registering lead." }, 500);
    }
}

export function onRequestOptions() {
    return optionsResponse();
}
