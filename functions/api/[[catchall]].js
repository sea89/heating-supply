export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = 'https://hs-app-4ist.onrender.com' + url.pathname + url.search;

  // Forward only essential headers
  const headers = new Headers();
  if (request.headers.has('Authorization')) {
    headers.set('Authorization', request.headers.get('Authorization'));
  }
  if (request.headers.has('Content-Type')) {
    headers.set('Content-Type', request.headers.get('Content-Type'));
  }
  if (request.headers.has('Accept')) {
    headers.set('Accept', request.headers.get('Accept'));
  }

  const init = {
    method: request.method,
    headers: headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  return fetch(targetUrl, init);
}