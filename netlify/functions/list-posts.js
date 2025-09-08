import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLD_CLOUD_NAME,
  api_key: process.env.CLD_API_KEY,
  api_secret: process.env.CLD_API_SECRET,
});

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

function errorJSON(err, status = 500) {
  const message = (err && (err.message || err.error?.message)) || undefined;
  const payload = { error: message || err || 'Unknown error' };
  try { console.error('[list-posts] error:', err); } catch {}
  return json(payload, status);
}

export default async (_request) => {
  try {
    if (!process.env.CLD_CLOUD_NAME || !process.env.CLD_API_KEY || !process.env.CLD_API_SECRET) {
      return errorJSON('Missing Cloudinary env vars (CLD_CLOUD_NAME / CLD_API_KEY / CLD_API_SECRET)', 500);
    }

    const items = [];
    let nextCursor = null;

    do {
      // 抓取 collages 資料夾底下所有 raw 檔，之後再在程式端過濾
      const res = await cloudinary.search
        .expression('resource_type:raw AND folder:collages')
        .max_results(100)
        .next_cursor(nextCursor || undefined)
        .execute();

      for (const r of res.resources || []) {
        const pid = r.public_id || '';
        // 接受兩種 public_id 形態：
        // 1) collages/{slug}/data            (無副檔名，由 format 決定 json)
        // 2) collages/{slug}/data.json       (public_id 本身含 .json)
        const m = pid.match(/^collages\/([^/]+)\/data(?:\.json)?$/i);
        if (!m) continue;
        const slug = m[1];

        // 依 public_id 是否已含 .json 來決定取檔 URL
        const hasExt = /\.json$/i.test(pid);
        const cloud = process.env.CLD_CLOUD_NAME;
        const url = `https://res.cloudinary.com/${cloud}/raw/upload/${encodeURIComponent(pid + (hasExt ? '' : '.json'))}`;

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
    return errorJSON(e, 500);
  }
}
