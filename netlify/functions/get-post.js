function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

export default async (request) => {
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
