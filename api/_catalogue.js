// Shared product catalogue — single source of truth for the API.
// Files prefixed with "_" are not exposed as routes by Vercel, but can be
// imported by the real endpoints (api/products.js, api/orders.js).
// The server uses this to validate items and recompute prices/totals, so a
// tampered client request can never set its own prices.

const PRODUCTS = [
  { id:'p1',  name:'2025/26 Home Kit Jersey',   category:['kits'],          price:199, oldPrice:null, badge:'new',  soldOut:false, sizes:['XS','S','M','L','XL','XXL'] },
  { id:'p2',  name:'2025/26 Away Kit Jersey',   category:['kits'],          price:199, oldPrice:null, badge:'new',  soldOut:false, sizes:['XS','S','M','L','XL','XXL'] },
  { id:'p3',  name:'2025/26 GK Jersey',         category:['kits'],          price:189, oldPrice:null, badge:null,   soldOut:false, sizes:['S','M','L','XL','XXL'] },
  { id:'p4',  name:'2025/26 Home Kit — Kids',   category:['kits','kids'],   price:149, oldPrice:null, badge:null,   soldOut:false, sizes:['4–6','6–8','8–10','10–12','12–14'] },
  { id:'p5',  name:'2025/26 Home Kit — Ladies', category:['kits','ladies'], price:189, oldPrice:null, badge:null,   soldOut:false, sizes:['XS','S','M','L','XL'] },
  { id:'p6',  name:'Training Tracksuit',        category:['training'],      price:179, oldPrice:229,  badge:'sale', soldOut:false, sizes:['S','M','L','XL','XXL'] },
  { id:'p7',  name:'Training T-Shirt',          category:['training'],      price:129, oldPrice:null, badge:null,   soldOut:false, sizes:['XS','S','M','L','XL','XXL'] },
  { id:'p8',  name:'Supporters Scarf',          category:['accessories'],   price:99,  oldPrice:null, badge:null,   soldOut:false, sizes:['One Size'] },
  { id:'p9',  name:'Snapback Cap',              category:['accessories'],   price:129, oldPrice:null, badge:null,   soldOut:false, sizes:['One Size'] },
  { id:'p10', name:'Supporters Polo',           category:['training'],      price:159, oldPrice:null, badge:null,   soldOut:false, sizes:['S','M','L','XL','XXL'] },
  { id:'p11', name:'Away Kit Junior',           category:['kits','kids'],   price:149, oldPrice:null, badge:null,   soldOut:true,  sizes:['4–6','6–8','8–10','10–12','12–14'] },
  { id:'p12', name:'Gym Bag',                   category:['accessories'],   price:179, oldPrice:null, badge:null,   soldOut:false, sizes:['One Size'] },
  { id:'p13', name:'Test Item (R1)',             category:['accessories'],   price:1,   oldPrice:null, badge:null,   soldOut:false, sizes:['One Size'] },
];

const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

// Delivery rule: free over R500, otherwise R99.
function deliveryFee(subtotal) {
  return subtotal >= 500 ? 0 : 99;
}

module.exports = { PRODUCTS, byId, deliveryFee };
