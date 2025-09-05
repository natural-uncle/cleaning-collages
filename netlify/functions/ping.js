export default async () => {
  const info = {
    runtime: process.versions.node,
    env: {
      CLD_CLOUD_NAME: !!process.env.CLD_CLOUD_NAME,
      CLD_API_KEY: !!process.env.CLD_API_KEY,
      CLD_API_SECRET: !!process.env.CLD_API_SECRET
    },
    blobs: { available: false, writable: false, error: null }
  };
  try {
    const { getStore } = await import('@netlify/blobs');
    info.blobs.available = true;
    const store = getStore({ name: 'posts' });
    // try a no-op read
    try {
      await store.list?.({ cursor: '' });
      info.blobs.writable = true;
    } catch (e) {
      info.blobs.error = String(e && e.message || e);
    }
  } catch (e) {
    info.blobs.error = String(e && e.message || e);
  }

  return new Response(JSON.stringify({ ok: true, info }), {
    headers: { 'content-type': 'application/json' }
  });
}
