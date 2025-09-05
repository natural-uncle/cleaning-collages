import { getStore } from '@netlify/blobs';
const store = getStore({ name: 'posts' });

export default async (req, res) => {
  try {
    const { slug } = req.query || {};
    if (!slug) return res.status(400).json({ error: 'slug required' });
    const json = await store.get(slug, { type: 'json' });
    if (!json) return res.status(404).json({ error: 'not found' });
    return res.status(200).json(json);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
