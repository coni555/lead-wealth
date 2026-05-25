// POST /sync/push — smart merge
export async function onRequestPost(context) {
  if (!auth(context)) return deny();
  const local = await context.request.json();
  const raw = await context.env.LUMEN_DATA.get('appData');
  const cloud = raw ? JSON.parse(raw) : null;
  const merged = mergeData(cloud, local);
  const out = JSON.stringify(merged);
  await context.env.LUMEN_DATA.put('appData', out);
  return json(out);
}

export async function onRequestOptions() {
  return new Response(null, { headers: cors() });
}

// Generate stable key for records that lack an id
function recordKey(r, prefix) {
  if (r.id) return r.id;
  return `${prefix}_${r.date}_${r.amount}_${r.category || r.source || ''}_${r.created_at || ''}`;
}

function mergeData(cloud, local) {
  if (!cloud) return local;
  if (!local) return cloud;
  const merged = JSON.parse(JSON.stringify(local));

  // Tombstones — union of both sides, capped at 500 to avoid unbounded growth
  const deletedSet = new Set([
    ...(Array.isArray(cloud.deleted_ids) ? cloud.deleted_ids : []),
    ...(Array.isArray(local.deleted_ids) ? local.deleted_ids : []),
  ]);
  merged.deleted_ids = [...deletedSet].slice(-500);

  const expMap = new Map();
  (cloud.expenses || []).forEach(e => expMap.set(recordKey(e, 'e'), e));
  (local.expenses || []).forEach(e => expMap.set(recordKey(e, 'e'), e));
  merged.expenses = [...expMap.values()]
    .filter(e => !e.id || !deletedSet.has(e.id))
    .sort((a, b) => a.date.localeCompare(b.date));

  const incMap = new Map();
  (cloud.incomes || []).forEach(e => incMap.set(recordKey(e, 'i'), e));
  (local.incomes || []).forEach(e => incMap.set(recordKey(e, 'i'), e));
  merged.incomes = [...incMap.values()]
    .filter(e => !e.id || !deletedSet.has(e.id))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (cloud.assets?.updated_at && local.assets?.updated_at) {
    merged.assets = cloud.assets.updated_at > local.assets.updated_at ? cloud.assets : local.assets;
  }
  if ((cloud.passive_sources || []).length > (local.passive_sources || []).length) {
    merged.passive_sources = cloud.passive_sources;
  }
  if (cloud.first_record_date && local.first_record_date) {
    merged.first_record_date = cloud.first_record_date < local.first_record_date
      ? cloud.first_record_date : local.first_record_date;
  }
  return merged;
}

function auth(ctx) {
  const url = new URL(ctx.request.url);
  return url.searchParams.get('token') === ctx.env.SYNC_TOKEN;
}
function deny() { return new Response('Unauthorized', { status: 401, headers: cors() }); }
function json(body) { return new Response(body, { headers: { 'Content-Type': 'application/json', ...cors() } }); }
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }; }
