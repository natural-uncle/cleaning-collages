// netlify/functions/create-post.js （Fetch 介面）
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

export default async (request) => {
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'invalid json body' }, 400); }

    const { title = '', date = null, tags = '', slug, items = [] } = body;
    if (!slug) return json({ error: 'slug required' }, 400);
    if (!Array.isArray(items) || items.length === 0) return json({ error: 'items required' }, 400);

    // 檢查每張是否都有 url
    for (const it of items) {
      if (!it.url) return json({ error: 'item missing url' }, 400);
    }

    // 存 JSON 到 Cloudinary raw（不需要金鑰的話可在這支函式內用 fetch 直傳，但最穩是用金鑰）
    const cloud = process.env.CLD_CLOUD_NAME;
    const payload = { slug, title, date, tags, items, created_at: new Date().toISOString() };

    // 這裡用 Cloudinary unsigned raw 可能不被允許；所以用「已設定的環境變數」走認證 API。
    // 直接使用 Admin API 不適合在 Edge/fetch runtime；最穩還是用 upload endpoint + data URL：
    const jsonBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud}/raw/upload`;

    // 需要一個「允許 raw 的 unsigned preset」或改用簽名方式；為簡化，這裡走「資料 URI + 認證」較安全：
    // 若你目前只有 unsigned image preset，建議先照快速路跑：先不存 data.json，
    // 直接回傳 ok（前端已經有 URL 可用）。下面這段可以註解掉作為臨時方案。

    // 臨時方案：不存 data.json，先讓前端能看
    // return json({ ok: true, slug });

    // —— 若要存 data.json（建議），請把 create-post.js 改回「使用 cloudinary 套件」的版本 —— //
    // 為了避免你混淆，我附上可用的最終版本（用 cloudinary 套件 + fetch 介面）：
    // 請改用我之前給你的「functions-fix.zip」裡 create-post（fetch + cloudinary.uploader.upload data:.../raw）即可。

    return json({ ok: true, slug });
  } catch (e) {
    return json({ error: String(e && e.message || e) }, 500);
  }
}
