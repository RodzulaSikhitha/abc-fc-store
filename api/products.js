// Vercel Serverless Function — /api/products
// Returns the product catalogue as JSON (sourced from the shared catalogue).

const { PRODUCTS } = require('./_catalogue');

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'application/json');

  const { category, id } = req.query || {};

  if (id) {
    const product = PRODUCTS.find(p => p.id === id);
    return product
      ? res.status(200).json(product)
      : res.status(404).json({ error: 'Product not found' });
  }

  let list = PRODUCTS;
  if (category && category !== 'all') {
    list = list.filter(p => p.category.includes(category));
  }
  return res.status(200).json({ products: list, total: list.length });
};
