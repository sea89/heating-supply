export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = 'https://hs-app-4ist.onrender.com' + url.pathname + url.search;

  try {
    // Build headers to forward
    const headers = new Headers();
    const forwardHeaders = ['authorization', 'content-type', 'accept', 'x-requested-with'];
    for (const h of forwardHeaders) {
      if (request.headers.has(h)) {
        headers.set(h, request.headers.get(h));
      }
    }

    // Build the proxied request
    const init = {
      method: request.method,
      headers: headers,
    };

    // Forward body for non-GET requests
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
      const body = await request.clone().text();
      init.body = body;
    }

    const response = await fetch(targetUrl, init);

    // Return the response with a new Response to ensure all headers pass through
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('access-control-allow-origin', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error: ' + err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}