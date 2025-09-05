import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLD_CLOUD_NAME,
  api_key:    process.env.CLD_API_KEY,
  api_secret: process.env.CLD_API_SECRET,
});

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

export default async (request) => {
  try {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();
    const { title = '', date = null, tags = '', slug: slugIn, items = [] } = body;
    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: 'items required' }, 400);
    }

    let slug = (slugIn || `${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    if (slug.length < 3) slug = slug + '-xx';

    const uploaded = [];
    for (const it of items) {
      if (!it.fileBase64) return json({ error: 'fileBase64 missing in item' }, 400);
      const up = await cloudinary.uploader.upload(`data:image/*;base64,${it.fileBase64}`, {
        folder: `collages/${slug}`,
        overwrite: true,
      });
      uploaded.push({ public_id: up.public_id, url: up.secure_url, caption: it.caption || '' });
    }

    const record = { slug, title, date, tags, items: uploaded, created_at: new Date().toISOString() };

    // Try Netlify Blobs first; if unavailable, fall back to Cloudinary RAW JSON
    let saved = false;
    try {
      const { getStore } = await import('@netlify/blobs');
      const store = getStore({ name: 'posts' });
      await store.set(slug, JSON.stringify(record));
      saved = true;
    } catch (_) {
      saved = false;
    }

    if (!saved) {
      const jsonBase64 = Buffer.from(JSON.stringify(record)).toString('base64');
      await cloudinary.uploader.upload(`data:application/json;base64,${jsonBase64}`, {
        resource_type: 'raw',
        public_id: `collages/${slug}/data`,
        overwrite: true,
        format: 'json',
      });
    }

    return json({ ok: true, slug, shareUrl: `#/v/${encodeURIComponent(slug)}` });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
