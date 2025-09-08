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
  // 讓錯誤更可讀：優先用 message，其次用 error.message，最後整個物件 JSON 字串化
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
      // 使用 folder:collages 與 resource_type:raw 取得所有 raw 檔
      const res = await cloudinary.search
        .expression('resource_type:raw AND folder:collages')
        // .with_field('public_id') // public_id 會預設回傳，這行在部分 SDK 版本會報錯，故移除
        .max_results(100)
        .next_cursor(nextCursor || undefined)
        .execute();

      for (const r of res.resources || []) {
        // 只收 collages/{slug}/data 這種 public_id
        if (!r.public_id || !/^(?:collages\/)[^/]+\/data$/.test(r.public_id)) continue;
        const slug = r.public_id.replace(/^collages\//, '').replace(/\/data$/, '');

        // 下載對應的 data.json（raw）
        const url = `https://res.cloudinary.com/${process.env.CLD_CLOUD_NAME}/raw/upload/${encodeURIComponent(r.public_id)}.json`;
        const resp = await fetch(url);
        if (!resp.ok) {
          // 略過單筆取回失敗，不中斷整體流程
          continue;
        }
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

    // 預設依日期（新→舊）
    items.sort((a,b)=> new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));

    return json({ items });
  } catch (e) {
    return errorJSON(e, 500);
  }
}
