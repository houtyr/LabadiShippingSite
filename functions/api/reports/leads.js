function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}

function optionsResponse() {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400"
        }
    });
}

function sanitizeCsvValue(value) {
    const asText = String(value ?? "").replace(/"/g, '""');

    // Prevent CSV formula injection in spreadsheet apps.
    if (/^[=+\-@]/.test(asText)) {
        return `"'${asText}"`;
    }

    return `"${asText}"`;
}

export async function onRequestGet(context) {
    const { env, request } = context;

    try {
        if (!env.DB) {
            return jsonResponse({ success: false, error: "Database binding is not configured." }, 500);
        }

        // This header is injected by Cloudflare Access after successful identity verification.
        const accessUserEmail = (request.headers.get("cf-access-authenticated-user-email") || "").trim().toLowerCase();
        if (!accessUserEmail) {
            return jsonResponse({ success: false, error: "Cloudflare Access authentication required." }, 401);
        }

        const allowedEmailsRaw = String(env.ACCESS_ALLOWED_EMAILS || "").trim();
        if (allowedEmailsRaw) {
            const allowedEmails = new Set(
                allowedEmailsRaw
                    .split(",")
                    .map((email) => email.trim().toLowerCase())
                    .filter(Boolean)
            );

            if (!allowedEmails.has(accessUserEmail)) {
                return jsonResponse({ success: false, error: "Access denied for this account." }, 403);
            }
        }

        const queryOutcome = await env.DB.prepare(
            "SELECT id, name, phone, email, origin, destination, created_at FROM leads ORDER BY created_at DESC"
        ).all();

        const rows = queryOutcome.results || [];
        const headers = [
            "ID",
            "Name",
            "Phone Number",
            "Email",
            "Route Origin",
            "Route Destination",
            "Registration Timestamp"
        ];

        const csvLines = [headers.map((header) => sanitizeCsvValue(header)).join(",")];

        for (const row of rows) {
            const line = [
                row.id,
                row.name,
                row.phone,
                row.email,
                row.origin,
                row.destination,
                row.created_at
            ].map((cell) => sanitizeCsvValue(cell)).join(",");

            csvLines.push(line);
        }

        const csvPayload = csvLines.join("\r\n");
        const exportDateStamp = new Date().toISOString().split("T")[0];
        const filename = `labadi_shipping_leads_export_${exportDateStamp}.csv`;

        return new Response(csvPayload, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename=\"${filename}\"`,
                "Cache-Control": "no-store, must-revalidate",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        });
    } catch {
        return jsonResponse({ success: false, error: "Internal report generation failure." }, 500);
    }
}

export function onRequestOptions() {
    return optionsResponse();
}
