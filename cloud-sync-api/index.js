// GET /sync — read cloud data
// PUT /sync — overwrite cloud data
export async function onRequestGet(context) {
  if (!auth(context)) return deny();
  const raw = await context.env.LUMEN_DATA.get('appData');
  return json(raw || 'null');
}

export async function onRequestPut(context) {
  if (!auth(context)) return deny();
  const body = await context.request.text();
  await context.env.LUMEN_DATA.put('appData', body);
  return json(JSON.stringify({ ok: true, ts: Date.now() }));
}

export async function onRequestOptions() {
  return new Response(null, { headers: cors() });
}

function auth(ctx) {
  const url = new URL(ctx.request.url);
  return url.searchParams.get('token') === ctx.env.SYNC_TOKEN;
}
function deny() { return new Response('Unauthorized', { status: 401, headers: cors() }); }
function json(body) { return new Response(body, { headers: { 'Content-Type': 'application/json', ...cors() } }); }
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }; }
