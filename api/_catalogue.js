// Shared product catalogue — single source of truth for the API.
// Files prefixed with "_" are not exposed as routes by Vercel, but can be
// imported by the real endpoints (api/products.js, api/orders.js).
// The server uses this to validate items and recompute prices/totals, so a
// tampered client request can never set its own prices.

const PRODUCTS = [
  { id:'p1',  name:'2025/26 Home Kit Jersey',  category:['kits'],        price:199.99, oldPrice:null, badge:'new', soldOut:false, sizes:['XS','S','M','L','XL','XXL'] },
  { id:'p2',  name:'2025/26 Hooped Jersey (Gold)', category:['kits'],    price:199.99, oldPrice:null, badge:'new', soldOut:false, sizes:['XS','S','M','L','XL','XXL'] },
  { id:'p3',  name:'2025/26 Hooped Jersey (Red)',  category:['kits'],    price:199.99, oldPrice:null, badge:'new', soldOut:false, sizes:['XS','S','M','L','XL','XXL'] },
  { id:'p4',  name:'GK Jersey (Red)',             category:['kits'],    price:199.99, oldPrice:null, badge:'new', soldOut:false, sizes:['XS','S','M','L','XL','XXL'] },
  { id:'p5',  name:'GK Jersey (Black)',            category:['kits'],    price:199.99, oldPrice:null, badge:'new', soldOut:false, sizes:['XS','S','M','L','XL','XXL'] },
  { id:'p6',  name:'ABC FC Drawstring Bag',        category:['accessories'], price:100, oldPrice:null, badge:'new', soldOut:false, sizes:['One Size'] },
  { id:'p7',  name:'ABC FC Puffer Jacket',         category:['accessories'], price:900, oldPrice:null, badge:'new', soldOut:false, sizes:['XS','S','M','L','XL','XXL'] },
  { id:'p8',  name:'Away Jersey (Red & Black)',    category:['kits'],    price:199.99, oldPrice:null, badge:'new', soldOut:false, sizes:['XS','S','M','L','XL','XXL'] },
  { id:'p13', name:'Test Item (R1)',               category:['accessories'], price:1,   oldPrice:null, badge:null,  soldOut:false, sizes:['One Size'] },
];

const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

// Delivery rule: flat rate by destination — R50 within Limpopo, R75 elsewhere in SA.
function deliveryFee(province) {
  return province === 'Limpopo' ? 50 : 75;
}

module.exports = { PRODUCTS, byId, deliveryFee };
