function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        }
    });
}

export async function onRequestGet(context) {
    const { env } = context;

    return jsonResponse({
        turnstileSiteKey: env.TURNSTILE_SITE_KEY || ""
    });
}