/* ============================================================
   ABC FC Store — Main JavaScript
   Mobile-first, no dependencies
   ============================================================ */

'use strict';

// ── Product Catalogue ──────────────────────────────────────
const PRODUCTS = [
  {
    id: 'p1',
    name: '2025/26 Home Kit Jersey',
    category: ['kits'],
    price: 550,
    oldPrice: null,
    badge: 'new',
    description: 'Official ABC FC home jersey for the 2025/26 championship season. Gold and black colourway with the Lion of the North crest and a limited championship badge. 100% polyester moisture-wicking fabric.',
    sizes: ['XS','S','M','L','XL','XXL'],
    soldOut: false,
    image: null, // SVG placeholder used
    svgColor: '#F5A800',
  },
  {
    id: 'p2',
    name: '2025/26 Away Kit Jersey',
    category: ['kits'],
    price: 550,
    oldPrice: null,
    badge: 'new',
    description: 'Official ABC FC away jersey for the 2025/26 season. Black colourway with gold trim and Lion of the North crest. Moisture-wicking polyester.',
    sizes: ['XS','S','M','L','XL','XXL'],
    soldOut: false,
    image: null,
    svgColor: '#1a1a1a',
  },
  {
    id: 'p3',
    name: '2025/26 GK Jersey',
    category: ['kits'],
    price: 499,
    oldPrice: null,
    badge: null,
    description: 'Official goalkeeper jersey with reinforced elbows and padded chest. Official ABC FC branding.',
    sizes: ['S','M','L','XL','XXL'],
    soldOut: false,
    image: null,
    svgColor: '#2d5a1b',
  },
  {
    id: 'p4',
    name: '2025/26 Home Kit — Kids',
    category: ['kits','kids'],
    price: 380,
    oldPrice: null,
    badge: null,
    description: 'Kids\' official home jersey. Same championship design as the adult kit, sized for ages 4–14. Lightweight and durable.',
    sizes: ['4–6','6–8','8–10','10–12','12–14'],
    soldOut: false,
    image: null,
    svgColor: '#F5A800',
  },
  {
    id: 'p5',
    name: '2025/26 Home Kit — Ladies',
    category: ['kits','ladies'],
    price: 520,
    oldPrice: null,
    badge: null,
    description: 'Ladies\' fitted home jersey with the full championship badge. Tailored cut, moisture-wicking fabric.',
    sizes: ['XS','S','M','L','XL'],
    soldOut: false,
    image: null,
    svgColor: '#F5A800',
  },
  {
    id: 'p6',
    name: 'Training Tracksuit',
    category: ['training'],
    price: 699,
    oldPrice: 850,
    badge: 'sale',
    description: 'Full ABC FC training tracksuit — zip-up jacket and matching pants. Gold/black colourway with embroidered crest.',
    sizes: ['S','M','L','XL','XXL'],
    soldOut: false,
    image: null,
    svgColor: '#111',
  },
  {
    id: 'p7',
    name: 'Training T-Shirt',
    category: ['training'],
    price: 280,
    oldPrice: null,
    badge: null,
    description: 'Lightweight training tee with ABC FC print. Breathable mesh panels, moisture-wicking.',
    sizes: ['XS','S','M','L','XL','XXL'],
    soldOut: false,
    image: null,
    svgColor: '#222',
  },
  {
    id: 'p8',
    name: 'Supporters Scarf',
    category: ['accessories'],
    price: 150,
    oldPrice: null,
    badge: null,
    description: 'Woven supporters scarf in official gold and black. "Lion of the North" text embroidered. One size fits all.',
    sizes: ['One Size'],
    soldOut: false,
    image: null,
    svgColor: '#F5A800',
  },
  {
    id: 'p9',
    name: 'Snapback Cap',
    category: ['accessories'],
    price: 220,
    oldPrice: null,
    badge: null,
    description: 'Adjustable snapback cap with embroidered ABC FC crest. One size fits most.',
    sizes: ['One Size'],
    soldOut: false,
    image: null,
    svgColor: '#0d0d0d',
  },
  {
    id: 'p10',
    name: 'Supporters Polo',
    category: ['training'],
    price: 320,
    oldPrice: null,
    badge: null,
    description: 'Smart supporters polo shirt with ABC FC badge. Suitable for match days and casual wear.',
    sizes: ['S','M','L','XL','XXL'],
    soldOut: false,
    image: null,
    svgColor: '#c98700',
  },
  {
    id: 'p11',
    name: 'Away Kit Junior',
    category: ['kits','kids'],
    price: 380,
    oldPrice: null,
    badge: null,
    description: 'Kids\' away kit in black and gold. Sizes for ages 4–14.',
    sizes: ['4–6','6–8','8–10','10–12','12–14'],
    soldOut: true,
    image: null,
    svgColor: '#1a1a1a',
  },
  {
    id: 'p12',
    name: 'Gym Bag',
    category: ['accessories'],
    price: 390,
    oldPrice: null,
    badge: null,
    description: 'Large ABC FC branded gym/kit bag with shoulder strap and front zip pocket. Gold/black.',
    sizes: ['One Size'],
    soldOut: false,
    image: null,
    svgColor: '#141414',
  },
];

// ── State ──────────────────────────────────────────────────
let cart = [];
let currentProduct = null;
let currentCategory = 'all';
let currentSort = 'featured';
let currentPage = 'shop';

// ── SVG Placeholder Image Builder ─────────────────────────
function buildPlaceholderSVG(product) {
  const c = encodeURIComponent(product.svgColor || '#222');
  return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><rect width='400' height='400' fill='${c}'/><rect x='20' y='20' width='360' height='360' fill='none' stroke='rgba(245,168,0,0.3)' stroke-width='2' rx='8'/><text x='200' y='175' font-family='Arial' font-size='38' font-weight='bold' fill='%23F5A800' text-anchor='middle'>ABC</text><text x='200' y='225' font-family='Arial' font-size='22' fill='rgba(255,255,255,0.7)' text-anchor='middle'>FC</text><circle cx='200' cy='280' r='28' fill='none' stroke='rgba(245,168,0,0.5)' stroke-width='2'/><text x='200' y='287' font-family='Arial' font-size='13' fill='%23F5A800' text-anchor='middle'>🦁</text></svg>`;
}

function productImgSrc(product) {
  return product.image || buildPlaceholderSVG(product);
}

// ── Cart Persistence ───────────────────────────────────────
function saveCart() {
  try { localStorage.setItem('abcfc_cart', JSON.stringify(cart)); } catch(e){}
}
function loadCart() {
  try {
    const raw = localStorage.getItem('abcfc_cart');
    if (raw) cart = JSON.parse(raw);
  } catch(e) { cart = []; }
}

// ── Cart Counts ────────────────────────────────────────────
function cartItemCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}
function cartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}
function updateCartBadges() {
  const count = cartItemCount();
  document.querySelectorAll('#cart-badge, #bqn-cart-badge').forEach(el => {
    el.textContent = count;
    el.classList.toggle('visible', count > 0);
  });
  const label = document.getElementById('cart-count-label');
  if (label) label.textContent = count;
}

// ── Toast ──────────────────────────────────────────────────
function showToast(msg, isGold = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (isGold ? ' gold' : '');
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Render Products ────────────────────────────────────────
function getFilteredProducts() {
  let list = PRODUCTS.filter(p => {
    if (currentCategory === 'all') return true;
    return p.category.includes(currentCategory);
  });

  // Search filter
  const searchVal = (window._searchQuery || '').toLowerCase().trim();
  if (searchVal) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(searchVal) ||
      (p.description && p.description.toLowerCase().includes(searchVal)) ||
      p.category.some(c => c.toLowerCase().includes(searchVal))
    );
  }

  switch (currentSort) {
    case 'price-asc':  list.sort((a,b) => a.price - b.price); break;
    case 'price-desc': list.sort((a,b) => b.price - a.price); break;
    case 'name-asc':   list.sort((a,b) => a.name.localeCompare(b.name)); break;
    case 'newest':     list.sort((a,b) => (b.badge === 'new') - (a.badge === 'new')); break;
    default: break; // featured = original order
  }
  return list;
}

function formatZAR(amount) {
  return 'R ' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  const list = getFilteredProducts();
  const countEl = document.getElementById('product-count');
  if (countEl) countEl.textContent = list.length;

  grid.innerHTML = '';
  if (list.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 16px;color:var(--text-muted);font-family:var(--font-sub);font-size:15px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">No products found</div>`;
    return;
  }

  list.forEach(product => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `View ${product.name}, ${formatZAR(product.price)}`);

    let badgeHTML = '';
    if (product.soldOut) {
      badgeHTML = `<span class="product-badge badge-sold-out">Sold Out</span>`;
    } else if (product.badge === 'new') {
      badgeHTML = `<span class="product-badge badge-new">New</span>`;
    } else if (product.badge === 'sale') {
      badgeHTML = `<span class="product-badge badge-sale">Sale</span>`;
    }

    const quickAddHTML = !product.soldOut
      ? `<button class="product-quick-add" data-id="${product.id}" aria-label="Quick add ${product.name}" onclick="event.stopPropagation();quickAdd('${product.id}')">+</button>`
      : '';

    const oldPriceHTML = product.oldPrice
      ? `<span class="product-price-old">${formatZAR(product.oldPrice)}</span>`
      : '';

    card.innerHTML = `
      <div class="product-img-wrap">
        <img src="${productImgSrc(product)}" alt="${product.name}" loading="lazy" width="400" height="400" />
        ${badgeHTML}
        ${quickAddHTML}
      </div>
      <div class="product-card-body">
        <div class="product-name">${product.name}</div>
        <div class="product-meta">Official ABC FC Merchandise</div>
        <div class="product-price-row">
          <span class="product-price">${formatZAR(product.price)}</span>
          ${oldPriceHTML}
        </div>
      </div>
    `;

    card.addEventListener('click', () => openProductModal(product.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProductModal(product.id); }});

    grid.appendChild(card);
  });
}

// ── Quick Add (single size or "One Size") ──────────────────
function quickAdd(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product || product.soldOut) return;

  if (product.sizes.length === 1) {
    addToCart(product, product.sizes[0], 1);
    showToast(`${product.name} added to cart`, true);
  } else {
    openProductModal(productId);
  }
}

// ── Product Modal ──────────────────────────────────────────
function openProductModal(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  currentProduct = product;

  document.getElementById('modal-img').src = productImgSrc(product);
  document.getElementById('modal-img').alt = product.name;
  document.getElementById('modal-product-name').textContent = product.name;
  document.getElementById('modal-price').textContent = formatZAR(product.price);
  const oldEl = document.getElementById('modal-price-old');
  oldEl.textContent = product.oldPrice ? formatZAR(product.oldPrice) : '';
  document.getElementById('modal-desc').textContent = product.description;

  // Sizes
  const sizesWrap = document.getElementById('modal-sizes');
  sizesWrap.innerHTML = '';
  product.sizes.forEach(size => {
    const btn = document.createElement('button');
    btn.className = 'size-btn';
    btn.textContent = size;
    btn.setAttribute('data-size', size);
    if (product.sizes.length === 1) {
      btn.classList.add('selected');
    }
    btn.addEventListener('click', () => {
      sizesWrap.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    sizesWrap.appendChild(btn);
  });

  // Qty reset
  document.getElementById('qty-value').value = 1;

  const addBtn = document.getElementById('add-to-cart-btn');
  if (product.soldOut) {
    addBtn.textContent = 'Sold Out';
    addBtn.disabled = true;
  } else {
    addBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> Add to Cart`;
    addBtn.disabled = false;
  }

  const overlay = document.getElementById('product-modal-overlay');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  document.getElementById('product-modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
  currentProduct = null;
}

// ── Add to Cart ────────────────────────────────────────────
function addToCart(product, size, qty) {
  const key = `${product.id}_${size}`;
  const existing = cart.find(i => i.key === key);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, 10);
  } else {
    cart.push({
      key,
      id: product.id,
      name: product.name,
      size,
      price: product.price,
      qty,
      image: productImgSrc(product),
    });
  }
  saveCart();
  updateCartBadges();
  renderCartItems();
}

// ── Cart Render ────────────────────────────────────────────
function renderCartItems() {
  const list = document.getElementById('cart-items-list');
  const emptyState = document.getElementById('cart-empty-state');
  const footer = document.getElementById('cart-footer');
  if (!list) return;

  // Remove old item elements (keep empty state)
  list.querySelectorAll('.cart-item').forEach(el => el.remove());

  if (cart.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    if (footer) footer.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (footer) footer.style.display = 'flex';

  cart.forEach(item => {
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-meta">Size: ${item.size}</div>
        <div class="cart-item-price">${formatZAR(item.price)}</div>
        <div class="cart-item-ctrl">
          <button class="ci-qty-btn" onclick="adjustCartItem('${item.key}', -1)" aria-label="Decrease">−</button>
          <span class="ci-qty-val">${item.qty}</span>
          <button class="ci-qty-btn" onclick="adjustCartItem('${item.key}', 1)" aria-label="Increase">+</button>
          <button class="ci-remove-btn" onclick="removeCartItem('${item.key}')" aria-label="Remove item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    `;
    list.appendChild(el);
  });

  const totalEl = document.getElementById('cart-total-val');
  if (totalEl) totalEl.textContent = formatZAR(cartTotal());
}

function adjustCartItem(key, delta) {
  const item = cart.find(i => i.key === key);
  if (!item) return;
  item.qty = Math.max(1, Math.min(10, item.qty + delta));
  saveCart();
  updateCartBadges();
  renderCartItems();
}

function removeCartItem(key) {
  cart = cart.filter(i => i.key !== key);
  saveCart();
  updateCartBadges();
  renderCartItems();
}

// ── Cart Drawer ────────────────────────────────────────────
function openCart() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ── Page Navigation ────────────────────────────────────────
function showPage(page) {
  document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');
  currentPage = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update bottom nav active state
  document.querySelectorAll('.bqn-item').forEach(b => b.classList.remove('active'));
  if (page === 'shop') {
    const homeBtn = document.getElementById('bqn-home');
    if (homeBtn) homeBtn.classList.add('active');
  }
}

function showCat(cat) {
  currentCategory = cat;
  document.querySelectorAll('.cat-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.cat === cat);
  });
  showPage('shop');
  renderProducts();
}

// ── Info / Policy Pages ────────────────────────────────────
const INFO = {
  shipping: {
    title: 'Shipping & Delivery',
    html: `
      <p>We currently deliver <strong>within Limpopo only</strong>. You can pay securely online by card or Instant EFT (via iKhokha), or choose <strong>Cash on Delivery</strong> — you pay when your order arrives. Nationwide delivery is coming soon.</p>
      <h2>Delivery Times</h2>
      <ul>
        <li>Within Limpopo: typically <strong>2–5 business days</strong>.</li>
        <li>Remote areas may take slightly longer.</li>
      </ul>
      <h2>Delivery Fees</h2>
      <ul>
        <li><strong>FREE</strong> on orders over <strong>R500</strong>.</li>
        <li>Flat <strong>R99</strong> on orders under R500.</li>
        <li>Pay online (card / Instant EFT) at checkout, or Cash on Delivery (Limpopo).</li>
      </ul>
      <p>You'll receive your invoice by email when you order, and we'll be in touch to arrange delivery. Outside Limpopo? Contact us and we'll let you know as soon as we deliver to your area.</p>`,
  },
  returns: {
    title: 'Returns & Exchanges',
    html: `
      <p>We want you to love your ABC FC gear. If something isn't right, you can return it within <strong>7 days</strong> of delivery.</p>
      <h2>What can be returned</h2>
      <ul>
        <li>Unused, unworn and unwashed items in their original packaging with tags attached.</li>
      </ul>
      <h2>What cannot be returned</h2>
      <ul>
        <li>Items that have been worn, washed or damaged after delivery.</li>
        <li>Personalised or custom-printed items.</li>
      </ul>
      <h2>How to return</h2>
      <ol>
        <li>Email or WhatsApp us with your order number and the reason for the return.</li>
        <li>We'll confirm the return and how to send the item back.</li>
        <li>Once we receive and inspect the item, we'll process your exchange or refund.</li>
      </ol>
      <p>Return shipping is the customer's responsibility unless the item is faulty or incorrect, in which case we'll cover it. This policy is in addition to your rights under the Consumer Protection Act.</p>`,
  },
  sizing: {
    title: 'Sizing Guide',
    html: `
      <p>All measurements are approximate. If you're between sizes, we recommend sizing up. Not sure? Message us before ordering and we'll help.</p>
      <h2>Adult Jerseys (chest)</h2>
      <table>
        <thead><tr><th>Size</th><th>Chest (cm)</th></tr></thead>
        <tbody>
          <tr><td>XS</td><td>86–91</td></tr>
          <tr><td>S</td><td>91–97</td></tr>
          <tr><td>M</td><td>97–102</td></tr>
          <tr><td>L</td><td>102–107</td></tr>
          <tr><td>XL</td><td>107–112</td></tr>
          <tr><td>XXL</td><td>112–117</td></tr>
        </tbody>
      </table>
      <h2>Kids</h2>
      <p>Kids' kits are sized by age range: 4–6, 6–8, 8–10, 10–12 and 12–14 years.</p>
      <h2>Accessories</h2>
      <p>Scarves, caps and bags are one size fits all.</p>`,
  },
  faq: {
    title: 'Frequently Asked Questions',
    html: `
      <h2>How can I pay?</h2>
      <p>You can pay securely online by card or Instant EFT via iKhokha, or choose <strong>Cash on Delivery</strong> within Limpopo — you pay when your order arrives.</p>
      <h2>Where do you deliver?</h2>
      <p>We currently deliver within <strong>Limpopo</strong> only. If you're elsewhere, contact us and we'll let you know when we reach your area.</p>
      <h2>How long does delivery take?</h2>
      <p>Typically 2–5 business days within Limpopo. See our Shipping & Delivery page for details.</p>
      <h2>Can I track my order?</h2>
      <p>Yes — use the Track Order page with your order number and the email you ordered with, or contact us and we'll update you.</p>
      <h2>What's your returns policy?</h2>
      <p>Unused items can be returned within 7 days. See the Returns & Exchanges page.</p>
      <h2>How do I choose the right size?</h2>
      <p>Check our Sizing Guide. If you're between sizes, size up or message us first.</p>`,
  },
  privacy: {
    title: 'Privacy Policy',
    html: `
      <p>ABC FC Foundation (NPC) respects your privacy and handles your information in line with South Africa's Protection of Personal Information Act (POPIA).</p>
      <h2>What we collect</h2>
      <ul>
        <li>Your name, email, phone number and delivery address.</li>
        <li>Order details (items, sizes, amounts).</li>
      </ul>
      <h2>Why we collect it</h2>
      <ul>
        <li>To process, fulfil and deliver your orders.</li>
        <li>To email your invoice and provide customer support.</li>
      </ul>
      <h2>How it's handled</h2>
      <ul>
        <li>We do not sell your personal information.</li>
        <li>Order records are retained only as long as needed to support your order.</li>
        <li>Your shopping cart is stored locally in your own browser, not on our servers.</li>
      </ul>
      <h2>Your rights</h2>
      <p>You may request access to, correction of, or deletion of your personal information at any time by contacting us.</p>`,
  },
  terms: {
    title: 'Terms & Conditions',
    html: `
      <p>This store is operated by ABC FC Foundation (NPC), Thohoyandou, Limpopo, South Africa. By placing an order you agree to these terms.</p>
      <h2>Orders & Pricing</h2>
      <ul>
        <li>All prices are in South African Rand (ZAR) and may change without notice.</li>
        <li>Orders are subject to acceptance and stock availability. If an item is unavailable we'll contact you to arrange a refund or alternative.</li>
      </ul>
      <h2>Payment</h2>
      <ul>
        <li>You may pay securely online by card or Instant EFT, processed by iKhokha — we never see or store your card details.</li>
        <li>Alternatively, choose <strong>Cash on Delivery</strong> within Limpopo — you pay when your order is delivered.</li>
      </ul>
      <h2>Delivery & Risk</h2>
      <p>Delivery timeframes are estimates. Risk in the goods passes to you on delivery.</p>
      <h2>Returns</h2>
      <p>Returns are handled per our Returns & Exchanges policy and your rights under the Consumer Protection Act.</p>
      <h2>Governing Law</h2>
      <p>These terms are governed by the laws of South Africa.</p>`,
  },
  track: {
    title: 'Track Your Order',
    html: `
      <p>Enter your order number (for example, <strong>ABC-7K2P9Q</strong>) and the email you used to order. For your security, both must match.</p>
      <div class="track-form">
        <input type="text" id="track-input" placeholder="ABC-XXXXXX" autocomplete="off" />
        <input type="email" id="track-email" placeholder="Email used on the order" autocomplete="email" />
        <button class="place-order-btn" id="track-submit" style="width:auto;">Track</button>
      </div>
      <div class="track-result" id="track-result"></div>`,
  },
};

function showInfo(topic) {
  const data = INFO[topic];
  if (!data) return;
  const titleEl = document.getElementById('info-title');
  const crumbEl = document.getElementById('info-crumb');
  const bodyEl  = document.getElementById('info-content');
  if (titleEl) titleEl.textContent = data.title;
  if (crumbEl) crumbEl.textContent = data.title;
  if (bodyEl)  bodyEl.innerHTML = data.html;

  if (topic === 'track') wireTrackOrder();
  showPage('info');
}

function wireTrackOrder() {
  const input  = document.getElementById('track-input');
  const emailInput = document.getElementById('track-email');
  const btn    = document.getElementById('track-submit');
  const result = document.getElementById('track-result');
  if (!input || !btn || !result) return;

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, m => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
  ));
  const contactLine = 'contact us at <a href="mailto:tshibalo.lucas@gmail.com" style="color:var(--gold);">tshibalo.lucas@gmail.com</a> / <a href="https://wa.me/27711092360" style="color:var(--gold);" target="_blank" rel="noopener">WhatsApp</a>';

  function lookup() {
    const num = input.value.trim();
    const email = (emailInput?.value || '').trim();
    if (!num || !email) {
      result.innerHTML = '<p style="color:var(--text-muted);">Please enter both your order number and the email you ordered with.</p>';
      return;
    }
    result.innerHTML = '<p style="color:var(--text-muted);">Looking up your order…</p>';
    // Lookup requires order number AND matching email; the server returns
    // only a minimal status (never the full address/phone).
    fetch('/api/orders?orderNum=' + encodeURIComponent(num) + '&email=' + encodeURIComponent(email))
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(order => {
        const when = order.createdAt
          ? new Date(order.createdAt).toLocaleDateString('en-ZA', { day:'2-digit', month:'long', year:'numeric' })
          : '';
        result.innerHTML = `
          <div style="background:var(--surface);border:1px solid rgba(245,168,0,0.2);border-radius:var(--radius-md);padding:16px;">
            <p style="color:var(--gold);font-weight:700;margin:0 0 6px;">Order ${esc(order.orderNum || num)} found</p>
            <p style="color:var(--text-muted);margin:0;">${when ? 'Placed ' + esc(when) + '. ' : ''}${Number(order.itemCount) || 0} item(s). Status: ${esc(order.status || 'received and being processed')}. We'll be in touch to arrange delivery.</p>
          </div>`;
      })
      .catch(() => {
        result.innerHTML = `<p style="color:var(--text-muted);">We couldn't find an order matching that number and email. Please double-check both, or ${contactLine} and we'll help.</p>`;
      });
  }

  btn.addEventListener('click', lookup);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') lookup(); });
  emailInput?.addEventListener('keydown', e => { if (e.key === 'Enter') lookup(); });
}

// ── Checkout ───────────────────────────────────────────────
function buildCheckoutPage() {
  // Render cart items in checkout summary
  const itemsEl = document.getElementById('checkout-items');
  if (!itemsEl) return;
  itemsEl.innerHTML = '';
  cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'order-summary-item';
    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="os-img" />
      <div class="os-info">
        <div class="os-name">${item.name}</div>
        <div class="os-meta">Size: ${item.size} · Qty: ${item.qty}</div>
      </div>
      <span class="os-price">${formatZAR(item.price * item.qty)}</span>
    `;
    itemsEl.appendChild(div);
  });

  const subtotal = cartTotal();
  const delivery = subtotal >= 500 ? 0 : 99;
  const total = subtotal + delivery;

  const subtotalEl = document.getElementById('ot-subtotal');
  const deliveryEl = document.getElementById('ot-delivery');
  const totalEl = document.getElementById('ot-total');
  if (subtotalEl) subtotalEl.textContent = formatZAR(subtotal);
  if (deliveryEl) deliveryEl.textContent = delivery === 0 ? 'FREE' : formatZAR(delivery);
  if (totalEl) totalEl.textContent = formatZAR(total);
}

function validateCheckout() {
  const firstName = document.getElementById('first-name')?.value.trim();
  const lastName = document.getElementById('last-name')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const phone = document.getElementById('phone')?.value.trim();
  const address = document.getElementById('address-line1')?.value.trim();
  const city = document.getElementById('city')?.value.trim();
  const postal = document.getElementById('postal-code')?.value.trim();
  const province = document.getElementById('province')?.value;

  if (!firstName) { showToast('Please enter your first name'); return false; }
  if (!lastName)  { showToast('Please enter your last name');  return false; }
  if (!email || !email.includes('@')) { showToast('Please enter a valid email address'); return false; }
  if (!phone) { showToast('Please enter your phone number'); return false; }
  if (!address) { showToast('Please enter your street address'); return false; }
  if (!city) { showToast('Please enter your city or town'); return false; }
  if (!postal) { showToast('Please enter your postal code'); return false; }
  if (!province) { showToast('Please select your province'); return false; }
  if (province !== 'Limpopo') {
    showToast('We currently deliver within Limpopo only — contact us for other areas');
    return false;
  }
  if (cart.length === 0) { showToast('Your cart is empty'); return false; }
  return true;
}

function placeOrder() {
  if (!validateCheckout()) return;

  const btn = document.getElementById('place-order-btn');
  btn.textContent = 'Processing…';
  btn.disabled = true;

  const firstName = document.getElementById('first-name').value.trim();
  const lastName  = document.getElementById('last-name').value.trim();
  const email     = document.getElementById('email').value.trim();
  const payment   = document.querySelector('input[name="payment"]:checked')?.value === 'online' ? 'online' : 'cod';

  // Local view used only for the confirmation display. The server is the
  // source of truth for the order number, item prices and totals.
  const displayOrder = {
    name: `${firstName} ${lastName}`,
    email,
    payment,
    items: [...cart],
    subtotal: cartTotal(),
    delivery: cartTotal() >= 500 ? 0 : 99,
    total: cartTotal() + (cartTotal() >= 500 ? 0 : 99),
  };

  // Slim, server-validated payload — no prices, no client order number.
  const payload = {
    name: displayOrder.name,
    email,
    phone: document.getElementById('phone').value.trim(),
    address: {
      line1:    document.getElementById('address-line1').value.trim(),
      line2:    document.getElementById('address-line2')?.value.trim() || '',
      city:     document.getElementById('city').value.trim(),
      postal:   document.getElementById('postal-code').value.trim(),
      province: document.getElementById('province').value,
    },
    payment,
    items: cart.map(i => ({ id: i.id, size: i.size, qty: i.qty })),
  };

  fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  .then(r => r.json().then(data => ({ ok: r.ok, data })))
  .catch(() => ({ ok: false, data: null }))
  .then(({ ok, data: result }) => {
    if (payment === 'online') {
      if (ok && result && result.paymentUrl) {
        // Hand off to iKhokha's hosted checkout. We stash just enough to
        // look the order back up (by order number + email) when the
        // customer is redirected back to us.
        try {
          sessionStorage.setItem('abcfc_pending_order', JSON.stringify({ orderNum: result.orderNum, email }));
        } catch (e) {}
        window.location.href = result.paymentUrl;
        return;
      }
      showToast((result && result.error) || 'Could not start online payment. Please try again or choose Cash on Delivery.');
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Place Order`;
      btn.disabled = false;
      return;
    }

    const finalOrder = {
      ...displayOrder,
      orderNum: (result && result.orderNum) || ('ABC-' + Date.now().toString(36).slice(-6).toUpperCase()),
      subtotal: (result && result.subtotal != null) ? result.subtotal : displayOrder.subtotal,
      delivery: (result && result.delivery != null) ? result.delivery : displayOrder.delivery,
      total:    (result && result.total    != null) ? result.total    : displayOrder.total,
    };
    showConfirmPage(finalOrder, result);
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Place Order`;
    btn.disabled = false;
  });
}

// ── Returning from iKhokha's hosted checkout ────────────────
function handlePaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const result = params.get('payment');
  if (!result) return;

  let pending = null;
  try { pending = JSON.parse(sessionStorage.getItem('abcfc_pending_order') || 'null'); } catch (e) {}
  sessionStorage.removeItem('abcfc_pending_order');
  // Drop the query string so a refresh doesn't replay this.
  history.replaceState(null, '', window.location.pathname);

  if (result === 'success' && pending && pending.orderNum && pending.email) {
    cart = [];
    saveCart();
    updateCartBadges();
    renderCartItems();
    fetch('/api/orders?orderNum=' + encodeURIComponent(pending.orderNum) + '&email=' + encodeURIComponent(pending.email))
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(order => {
        const paid = order && order.status === 'paid';
        const numEl = document.getElementById('confirm-order-num');
        if (numEl) numEl.textContent = `Order ${pending.orderNum}`;
        const emailNoteEl = document.getElementById('confirm-email-note');
        if (emailNoteEl) {
          emailNoteEl.textContent = paid
            ? `📧 A paid invoice has been emailed to ${pending.email}`
            : `We're confirming your payment with iKhokha — your invoice will be emailed to ${pending.email} shortly.`;
        }
        const detailsEl = document.getElementById('confirm-details');
        if (detailsEl) {
          detailsEl.innerHTML = `
            <div class="checkout-section" style="width:100%;text-align:left;margin-top:16px;">
              <div class="checkout-section-body" style="padding:12px 16px;">
                <div style="padding:14px;background:var(--gold-faint);border:1px solid rgba(245,168,0,0.2);border-radius:var(--radius-md);">
                  <p style="font-family:var(--font-sub);font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;">${paid ? 'Payment Confirmed' : 'Payment Processing'}</p>
                  <p style="font-size:13px;color:var(--text-muted);line-height:1.8;">
                    ${paid ? `Thank you — we've received ${order.total != null ? formatZAR(order.total) : 'your payment'} via iKhokha.` : 'We\'re still confirming your payment with iKhokha. You\'ll receive an email invoice as soon as it clears.'}
                  </p>
                </div>
              </div>
            </div>`;
        }
        showPage('confirm');
      });
    return;
  }

  if (result === 'failed') { showToast('Your payment did not go through. Please try again.'); showPage('checkout'); return; }
  if (result === 'cancelled') { showToast('Payment cancelled.'); showPage('checkout'); return; }
}

function showConfirmPage(orderData, apiResult) {
  const numEl = document.getElementById('confirm-order-num');
  if (numEl) numEl.textContent = `Order ${orderData.orderNum}`;

  // Only promise an invoice email if the server actually sent one.
  const emailNoteEl = document.getElementById('confirm-email-note');
  if (emailNoteEl) {
    emailNoteEl.textContent = (apiResult && apiResult.emailSent)
      ? `📧 An invoice has been emailed to ${orderData.email}`
      : `📧 We'll email your invoice to ${orderData.email} shortly`;
  }

  const detailsEl = document.getElementById('confirm-details');
  if (detailsEl) {
    const delivery = orderData.delivery;
    const total    = orderData.total;

    let itemsHTML = orderData.items.map(i =>
      `<div class="ot-row"><span>${i.name} ×${i.qty}</span><span>${formatZAR(i.price * i.qty)}</span></div>`
    ).join('');

    detailsEl.innerHTML = `
      <div class="checkout-section" style="width:100%;text-align:left;margin-top:16px;">
        <div class="checkout-section-head" style="padding:12px 16px;">
          <h3 style="font-family:var(--font-sub);font-size:14px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--text);">Order Details</h3>
        </div>
        <div class="checkout-section-body" style="padding:12px 16px;">
          <div class="order-totals">
            ${itemsHTML}
            <div class="ot-row"><span>Delivery</span><span>${delivery === 0 ? 'FREE' : formatZAR(delivery)}</span></div>
            <div class="ot-row total"><span>Total</span><span>${formatZAR(total)}</span></div>
          </div>
          <div style="margin-top:16px;padding:14px;background:var(--gold-faint);border:1px solid rgba(245,168,0,0.2);border-radius:var(--radius-md);">
            <p style="font-family:var(--font-sub);font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;">Cash on Delivery</p>
            <p style="font-size:13px;color:var(--text-muted);line-height:1.8;">
              Pay <strong>${formatZAR(total)}</strong> in cash when your order is delivered (Limpopo).
              We'll be in touch to arrange delivery.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // Clear cart after order
  cart = [];
  saveCart();
  updateCartBadges();
  renderCartItems();

  showPage('confirm');
}

// ── Search ─────────────────────────────────────────────────
function openSearch() {
  document.getElementById('search-overlay').classList.add('active');
  // Pre-fill with any active query so the user can refine it
  const input = document.getElementById('search-input');
  if (input) input.value = window._searchQuery || '';
  setTimeout(() => input?.focus(), 100);
}
function closeSearch() {
  document.getElementById('search-overlay').classList.remove('active');
  window._searchQuery = '';
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  renderProducts(); // reset the grid to the full catalogue
}

// ── Theme Toggle ───────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('abcfc_store_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('abcfc_store_theme', next); } catch(e){}
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadCart();
  updateCartBadges();
  renderCartItems();
  renderProducts();

  // Footer year
  const fy = document.getElementById('footer-year');
  if (fy) fy.textContent = new Date().getFullYear();

  // Returning from iKhokha's hosted checkout (success/failed/cancelled)
  handlePaymentReturn();

  // Cart button
  document.getElementById('cart-btn')?.addEventListener('click', openCart);
  document.getElementById('cart-drawer-close')?.addEventListener('click', closeCart);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
  document.getElementById('cart-continue-btn')?.addEventListener('click', closeCart);

  // Checkout from cart
  document.getElementById('checkout-btn')?.addEventListener('click', () => {
    closeCart();
    buildCheckoutPage();
    showPage('checkout');
  });

  // Back to shop
  document.getElementById('back-to-shop')?.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('shop');
  });

  // Info pages "Store" breadcrumb back link
  document.getElementById('info-back')?.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('shop');
  });

  // Place order
  document.getElementById('place-order-btn')?.addEventListener('click', placeOrder);

  // Confirm continue
  document.getElementById('confirm-continue')?.addEventListener('click', () => showPage('shop'));

  // Sort
  document.getElementById('sort-select')?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderProducts();
  });

  // Category pills
  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => showCat(pill.dataset.cat));
  });

  // Search
  document.getElementById('search-btn')?.addEventListener('click', openSearch);
  document.getElementById('search-close')?.addEventListener('click', closeSearch);
  document.getElementById('search-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSearch();
  });
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    window._searchQuery = e.target.value;
    showPage('shop');
    renderProducts();
  });
  document.getElementById('search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
  });

  // Theme toggle
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });

  // Modal close
  document.getElementById('modal-close-btn')?.addEventListener('click', closeProductModal);
  document.getElementById('product-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeProductModal();
  });

  // Qty controls
  document.getElementById('qty-plus')?.addEventListener('click', () => {
    const input = document.getElementById('qty-value');
    input.value = Math.min(10, parseInt(input.value) + 1);
  });
  document.getElementById('qty-minus')?.addEventListener('click', () => {
    const input = document.getElementById('qty-value');
    input.value = Math.max(1, parseInt(input.value) - 1);
  });

  // Add to cart from modal
  document.getElementById('add-to-cart-btn')?.addEventListener('click', () => {
    if (!currentProduct) return;
    const selectedSizeBtn = document.querySelector('#modal-sizes .size-btn.selected');
    if (!selectedSizeBtn && currentProduct.sizes.length > 1) {
      showToast('Please select a size');
      return;
    }
    const size = selectedSizeBtn ? selectedSizeBtn.dataset.size : currentProduct.sizes[0];
    const qty = parseInt(document.getElementById('qty-value').value) || 1;
    addToCart(currentProduct, size, qty);
    closeProductModal();
    showToast(`${currentProduct.name} added to cart`, true);
  });

  // Announcement bar dismiss
  document.getElementById('announce-close')?.addEventListener('click', () => {
    const bar = document.getElementById('announce-bar');
    if (bar) bar.style.display = 'none';
  });

  // Guest / Login toggle
  document.getElementById('toggle-guest')?.addEventListener('click', () => {
    document.getElementById('toggle-guest')?.classList.add('active');
    document.getElementById('toggle-login')?.classList.remove('active');
    document.getElementById('guest-fields').style.display = '';
    document.getElementById('login-fields').style.display = 'none';
  });
  document.getElementById('toggle-login')?.addEventListener('click', () => {
    document.getElementById('toggle-login')?.classList.add('active');
    document.getElementById('toggle-guest')?.classList.remove('active');
    document.getElementById('login-fields').style.display = '';
    document.getElementById('guest-fields').style.display = 'none';
  });
  document.getElementById('switch-to-guest')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('toggle-guest')?.click();
  });

  // Sign In is not built yet — give honest feedback instead of a dead button
  document.getElementById('login-submit-btn')?.addEventListener('click', () => {
    showToast('Accounts are coming soon — please continue as guest', true);
    document.getElementById('toggle-guest')?.click();
  });

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
      closeCart();
      closeSearch();
    }
  });
});
