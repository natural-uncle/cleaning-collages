// netlify/functions/list-posts.js
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
    // 1) 列出 collages 目錄下的所有 data.json（raw）
    // 以 Cloudinary Search API 查詢 public_id: collages/*/data
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
        const slug = r.public_id.replace(/^collages\\//, '').replace(/\\/data$/, '');
        // 2) 取回每筆 data.json 內容
        const url = `https://res.cloudinary.com/${process.env.CLD_CLOUD_NAME}/raw/upload/${encodeURIComponent(r.public_id)}.json`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const data = await resp.json().catch(() => null);
        if (!data) continue;

        // 3) 彙整欄位（前端會顯示）
        items.push({
          slug,
          title: data.title || slug,
          date: data.date || data.created_at,
          created_at: data.created_at,
          tags: data.tags || [],
          // 嘗試給一張封面：從 items 的第一張圖或 data.cover
          cover: data.cover || (Array.isArray(data.items) && data.items[0]?.url) || null,
        });
      }

      nextCursor = res.next_cursor || null;
    } while (nextCursor);

    // 按日期新到舊
    items.sort((a,b)=> new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));

    return json({ items });
  } catch (e) {
    return json({ error: String(e && e.message || e) }, 500);
  }
}
