import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLD_CLOUD_NAME,
  api_key:    process.env.CLD_API_KEY,
  api_secret: process.env.CLD_API_SECRET,
});

export default async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = JSON.parse(req.body || '{}');
    const { title = '', date = null, tags = '', slug: slugIn, items = [] } = body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items required' });

    let slug = (slugIn || `${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    if (slug.length < 3) slug = slug + '-xx';

    const uploaded = [];
    for (const it of items) {
      if (!it.fileBase64) return res.status(400).json({ error: 'fileBase64 missing in item' });
      const up = await cloudinary.uploader.upload(`data:image/*;base64,${it.fileBase64}`, {
        folder: `collages/${slug}`,
        overwrite: true,
      });
      uploaded.push({ public_id: up.public_id, url: up.secure_url, caption: it.caption || '' });
    }

    const record = { slug, title, date, tags, items: uploaded, created_at: new Date().toISOString() };
    const jsonBase64 = Buffer.from(JSON.stringify(record)).toString('base64');
    // 存為 raw JSON：collages/<slug>/data.json
    await cloudinary.uploader.upload(`data:application/json;base64,${jsonBase64}`, {
      resource_type: 'raw',
      public_id: `collages/${slug}/data`,
      overwrite: true,
      format: 'json',
    });

    return res.status(200).json({ ok: true, slug, shareUrl: `#/v/${encodeURIComponent(slug)}` });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
