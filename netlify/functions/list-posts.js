import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLD_CLOUD_NAME,
  api_key: process.env.CLD_API_KEY,
  api_secret: process.env.CLD_API_SECRET,
});

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

export default async () => {
  try {
    const items = [];
    let nextCursor = null;

    do {
      const res = await cloudinary.search
        .expression('resource_type:raw AND public_id:collages/*/data')
        .with_field('public_id')
        .max_results(100)
        .next_cursor(nextCursor || undefined)
        .execute();

      for (const r of res.resources || []) {
        const slug = r.public_id.replace(/^collages\//, '').replace(/\/data$/, '');
        const url = `https://res.cloudinary.com/${process.env.CLD_CLOUD_NAME}/raw/upload/${encodeURIComponent(r.public_id)}.json`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const data = await resp.json().catch(() => null);
        if (!data) continue;
        items.push({
          slug,
          title: data.title || slug,
          date: data.date || data.created_at,
          created_at: data.created_at,
          tags: data.tags || [],
          cover: data.cover || (Array.isArray(data.items) && data.items[0]?.url) || null,
          preview: data.preview || null,
        });
      }

      nextCursor = res.next_cursor || null;
    } while (nextCursor);

    items.sort((a,b)=> new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));

    return json({ items });
  } catch (e) {
    return json({ error: String(e && e.message || e) }, 500);
  }
}
