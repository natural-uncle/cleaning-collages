function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

export default async (request) => {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    if (!slug) return json({ error: 'slug required' }, 400);

    // Try read from Netlify Blobs
    try {
      const { getStore } = await import('@netlify/blobs');
      const store = getStore({ name: 'posts' });
      const value = await store.get(slug, { type: 'json' });
      if (value) return json(value);
    } catch (_) {
      // ignore and fall back
    }

    // Fall back to Cloudinary RAW JSON
    const cloud = process.env.CLD_CLOUD_NAME;
    const dataUrl = `https://res.cloudinary.com/${cloud}/raw/upload/collages/${slug}/data.json`;
    const r = await fetch(dataUrl);
    if (!r.ok) return json({ error: 'not found' }, 404);
    const jsonData = await r.json();
    return json(jsonData);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
