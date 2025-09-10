function json(obj, status = 200) {

function withCors(res){
  const h = new Headers(res.headers || {});
  h.set('access-control-allow-origin','*');
  h.set('access-control-allow-methods','GET,POST,OPTIONS');
  h.set('access-control-allow-headers','content-type');
  return withCors(new Response(res.body, { status: res.status || 200, headers: h });
}
  return withCors(new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

export default async (request) => {
  if (request.method === 'OPTIONS') return withCors(new Response(null, {status:204}));
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    if (!slug) return json({ error: 'slug required' }, 400);
    const cloud = process.env.CLD_CLOUD_NAME;
    const dataUrl = `https://res.cloudinary.com/${cloud}/raw/upload/collages/${slug}/data.json`;
    const r = await fetch(dataUrl);
    if (!r.ok) return json({ error: 'not found' }, 404);
    const jsonData = await r.json();
    return json(jsonData);
  } catch (e) {
    return json({ error: String(e && e.message || e) }, 500);
  }
}
