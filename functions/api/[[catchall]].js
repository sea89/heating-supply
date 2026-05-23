export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = 'https://hs-app-4ist.onrender.com' + url.pathname + url.search;
  
  const res = await fetch(target, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.method === 'GET' || context.request.method === 'HEAD' ? null : context.request.body,
    redirect: 'follow',
  });

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}