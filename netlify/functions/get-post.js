export default async (req, res) => {
  try {
    const { slug } = req.query || {};
    if (!slug) return res.status(400).json({ error: 'slug required' });
    const url = `https://res.cloudinary.com/${process.env.CLD_CLOUD_NAME}/raw/upload/collages/${slug}/data.json`;
    const r = await fetch(url);
    if (!r.ok) return res.status(404).json({ error: 'not found' });
    const json = await r.json();
    return res.status(200).json(json);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
