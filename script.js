const PHONE_WA = '380969449971'; // WhatsApp number without +

const filters = document.querySelectorAll('.filter');
let activeCategory = 'all';
const catalog = window.AVOSKA_CATALOG || [];
const categoryLabels = {pizza:'Піца',sushi:'Суші та роли',sets:'Сети',shawarma:'Шаурма',extras:'Додатки'};
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderCatalog(){
 const query=(document.getElementById('menuSearch')?.value||'').trim().toLocaleLowerCase('uk');
 const shown=catalog.filter(p=>(activeCategory==='all'||p.category===activeCategory)&&`${p.name} ${p.desc}`.toLocaleLowerCase('uk').includes(query));
 document.getElementById('productGrid').innerHTML=shown.length?shown.map((p)=>{const i=catalog.indexOf(p);const photo=p.photo||(p.category==='pizza'?'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=85':p.category==='sets'?'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=900&q=85':'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=85');return `<article class="product-card" data-index="${i}"><button class="product-open" type="button" data-open="${i}" aria-label="Детальніше: ${escapeHTML(p.name)}"><div class="product-photo"><img loading="lazy" src="${photo}" alt="${escapeHTML(p.name)}"><span class="product-badge">${escapeHTML(categoryLabels[p.category]||'Меню')}</span></div><div class="product-info"><div><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.desc)}</p></div><b>${p.sizes?.length?'від ':''}${p.price} грн</b></div></button><button class="add-btn" type="button" data-open="${i}" aria-label="Обрати ${escapeHTML(p.name)}">+</button></article>`}).join(''):'<p class="menu-disclaimer">Нічого не знайшлося. Спробуй змінити пошук або категорію.</p>';
 filters.forEach(f=>{const n=catalog.filter(p=>f.dataset.filter==='all'||p.category===f.dataset.filter).length;const span=f.querySelector('span');if(span)span.textContent=String(n).padStart(2,'0')});
}
filters.forEach(btn=>btn.addEventListener('click',()=>{filters.forEach(f=>f.classList.remove('active'));btn.classList.add('active');activeCategory=btn.dataset.filter;renderCatalog()}));
document.getElementById('menuSearch').addEventListener('input',renderCatalog);
renderCatalog();

const toast = document.getElementById('toast');
let toastTimer;
const cart = {}; // унікальний рядок з вибраними опціями -> товар

const cartCount = document.getElementById('cartCount');
const fabCart = document.getElementById('fabCart');
const fabCount = document.getElementById('fabCount');
const navCartBadge = document.getElementById('navCartBadge');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutForm = document.getElementById('checkoutForm');
const orderSuccess = document.getElementById('orderSuccess');
const submitBtn = document.getElementById('submitOrder');

const paymentLabels = {
  cash: 'Готівка при отриманні',
  card_on_delivery: 'Картка при отриманні',
  online: 'Онлайн-оплата (посилання від менеджера)'
};

function getCartSnapshot() {
  const names = Object.keys(cart);
  let totalQty = 0;
  let totalSum = 0;
  const lines = names.map(name => {
    const item = cart[name];
    totalQty += item.qty;
    totalSum += item.price * item.qty;
    return { key:name, ...item, lineTotal: item.price * item.qty };
  });
  return { names, lines, totalQty, totalSum };
}

function updateCartUI() {
  const { names, lines, totalQty, totalSum } = getCartSnapshot();

  if (names.length === 0) {
    cartItems.innerHTML = '<p class="cart-empty">Кошик порожній. <a href="#menu">Обери страви в меню</a></p>';
  } else {
    cartItems.innerHTML = lines.map(item => `
      <div class="cart-item" data-name="${item.key}">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <span>${item.price} грн / шт${item.options?.length ? `<br>${item.options.map(escapeHTML).join(' · ')}` : ''}</span>
        </div>
        <div class="cart-item-qty">
          <button type="button" data-action="dec" aria-label="Менше">−</button>
          <span>${item.qty}</span>
          <button type="button" data-action="inc" aria-label="Більше">+</button>
        </div>
        <div class="cart-item-price">${item.lineTotal} грн</div>
        <button type="button" class="cart-item-remove" data-action="remove" aria-label="Видалити">×</button>
      </div>
    `).join('');
  }

  cartTotal.textContent = totalSum + ' грн';
  const countText = totalQty > 0 ? String(totalQty) : '';
  cartCount.textContent = countText;
  cartCount.dataset.empty = totalQty === 0 ? '1' : '0';
  fabCount.textContent = countText || '0';
  fabCart.hidden = totalQty === 0;

  if (totalQty > 0) {
    navCartBadge.hidden = false;
    navCartBadge.textContent = totalQty;
  } else {
    navCartBadge.hidden = true;
  }

  if (submitBtn) {
    submitBtn.disabled = totalQty === 0;
  }
  // If user adds items after successful order, show form again
  if (totalQty > 0 && orderSuccess && !orderSuccess.hidden) {
    orderSuccess.hidden = true;
    checkoutForm.hidden = false;
    checkoutForm.reset();
  }
}

cartItems.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const itemEl = btn.closest('.cart-item');
  if (!itemEl) return;
  const name = itemEl.dataset.name;
  const action = btn.dataset.action;

  if (action === 'inc') {
    cart[name].qty += 1;
  } else if (action === 'dec') {
    cart[name].qty -= 1;
    if (cart[name].qty <= 0) delete cart[name];
  } else if (action === 'remove') {
    delete cart[name];
  }
  updateCartUI();
});

let selectedProduct=null;
const dialog=document.getElementById('productDialog');
function showProduct(index){
 const p=catalog[index];if(!p)return;selectedProduct=p;
 const sizeField=p.sizes?.length?`<label class="option-field">Розмір<select id="dishSize">${p.sizes.map((v,i)=>`<option value="${v}">${[25,35,45,60][i]||`${i+1} розмір`} см — ${v} грн</option>`).join('')}</select></label>`:'';
 let extras='';
 if(p.category==='pizza')extras='<label class="check-option"><input type="checkbox" data-extra="Сирний бортик (вартість уточнити)" data-cost="0"> Сирний бортик <span>ціну уточнити</span></label>';
 if(p.category==='sushi'||p.category==='sets')extras='<label class="option-field">Кількість приборів<select id="utensils"><option value="0">Без приборів</option><option value="1">1 комплект</option><option value="2">2 комплекти</option><option value="3">3 комплекти</option><option value="4">4 комплекти</option></select></label><div class="extra-title">Додатки</div>'+[['Соєвий соус',15],['Імбир',15],['Васабі',10]].map(([n,c])=>`<label class="check-option"><input type="checkbox" data-extra="${n}" data-cost="${c}"> ${n} <span>+${c} грн</span></label>`).join('');
 if(p.category==='shawarma')extras='<div class="extra-title">Додаткові інгредієнти</div>'+[['Моцарела',30],['Сир чедер',20],['Гриби',30],['М’ясо',70],['Гострий соус',10],['Кукурудза',10],['Картопля фрі',70]].map(([n,c])=>`<label class="check-option"><input type="checkbox" data-extra="${n}" data-cost="${c}"> ${n} <span>+${c} грн</span></label>`).join('')+'<div class="extra-title">Додаткові соуси</div>'+['Часниковий','Кетчуп','Майонез','Цезар'].map(n=>`<label class="check-option"><input type="checkbox" data-extra="Додатковий соус: ${n}" data-cost="0"> ${n}<span>ціну уточнити</span></label>`).join('');
 const sizes=p.sizes?.length?`<p class="detail-prices">Ціни за розмірами: ${p.sizes.join(' / ')} грн</p>`:'';
 document.getElementById('productDetails').innerHTML=`<div class="dialog-category">${escapeHTML(categoryLabels[p.category]||'Меню')}</div><h2>${escapeHTML(p.name)}</h2><p>${escapeHTML(p.desc)}</p>${sizes}${sizeField}<div class="product-options">${extras}</div><p class="dialog-price">Ціна: <b id="dialogPrice">${p.price} грн</b></p>`;
 const refresh=()=>{let price=p.sizes?.length?Number(document.getElementById('dishSize').value):p.price;document.querySelectorAll('#productDetails [data-extra]:checked').forEach(x=>price+=Number(x.dataset.cost)||0);document.getElementById('dialogPrice').textContent=`${price} грн`};
 document.getElementById('productDetails').querySelectorAll('input,select').forEach(el=>el.addEventListener('change',refresh));dialog.showModal();
}
document.getElementById('productGrid').addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)showProduct(Number(b.dataset.open))});
document.getElementById('dialogAdd').addEventListener('click',()=>{
 if(!selectedProduct)return;const p=selectedProduct;let price=p.sizes?.length?Number(document.getElementById('dishSize').value):p.price;const options=[];
 document.querySelectorAll('#productDetails [data-extra]:checked').forEach(x=>{options.push(x.dataset.extra);price+=Number(x.dataset.cost)||0});
 const utens=document.getElementById('utensils');if(utens?.value!=='0'&&utens)options.push(`Прибори: ${utens.value} компл.`);
 const key=`${p.name}|${price}|${options.join(',')}`;if(cart[key])cart[key].qty++;else cart[key]={name:p.name,price,qty:1,options};
 document.getElementById('toastName').textContent=p.name;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);dialog.close();updateCartUI();
});

function buildWhatsAppMessage(formData, snapshot) {
  const lines = [
    '🍕 *Нове замовлення Avoska*',
    '',
    '*Страви:*'
  ];
  snapshot.lines.forEach(item => {
    lines.push(`• ${item.name}${item.options?.length ? ` (${item.options.join(', ')})` : ''} × ${item.qty} = ${item.lineTotal} грн`);
  });
  lines.push('');
  lines.push(`*Разом (орієнтовно):* ${snapshot.totalSum} грн`);
  lines.push('');
  lines.push(`*Клієнт:* ${formData.name}`);
  lines.push(`*Телефон:* ${formData.phone}`);
  if (formData.address) lines.push(`*Адреса / отримання:* ${formData.address}`);
  if (formData.comment) lines.push(`*Коментар:* ${formData.comment}`);
  lines.push(`*Оплата:* ${paymentLabels[formData.payment] || formData.payment}`);
  lines.push('');
  lines.push('_Будь ласка, перетелефонуйте клієнту для підтвердження._');
  return lines.join('\n');
}

checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const snapshot = getCartSnapshot();
  if (snapshot.totalQty === 0) {
    alert('Кошик порожній. Додай страви з меню.');
    return;
  }

  const fd = new FormData(checkoutForm);
  const formData = {
    name: (fd.get('name') || '').toString().trim(),
    phone: (fd.get('phone') || '').toString().trim(),
    address: (fd.get('address') || '').toString().trim(),
    comment: (fd.get('comment') || '').toString().trim(),
    payment: (fd.get('payment') || 'cash').toString()
  };

  if (!formData.name || !formData.phone) {
    alert('Вкажи ім’я та телефон.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Надсилаємо…';

  const orderPayload = {
    customerName: formData.name,
    customerPhone: formData.phone,
    address: formData.address,
    comment: formData.comment,
    payment: formData.payment,
    paymentLabel: paymentLabels[formData.payment] || formData.payment,
    items: snapshot.lines.map(l => ({
      name: l.name,
      price: l.price,
      qty: l.qty,
      options: l.options || [],
      lineTotal: l.lineTotal
    })),
    total: snapshot.totalSum
  };

  try {
    await OrdersAPI.init();
    await OrdersAPI.createOrder(orderPayload);
  } catch (err) {
    console.error(err);
    alert('Не вдалося зберегти замовлення. Спробуй ще раз або зателефонуй.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Надіслати замовлення <span>↗</span>';
    return;
  }

  // Додатково — WhatsApp (опційно, якщо відкриється)
  try {
    const message = buildWhatsAppMessage(formData, snapshot);
    const waUrl = `https://wa.me/${PHONE_WA}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  } catch (_) {}

  checkoutForm.hidden = true;
  orderSuccess.hidden = false;

  Object.keys(cart).forEach(k => delete cart[k]);
  updateCartUI();

  submitBtn.disabled = false;
  submitBtn.innerHTML = 'Надіслати замовлення <span>↗</span>';
});

// Mobile nav
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
toggle.addEventListener('click', () => nav.classList.toggle('open'));
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

// Hide FAB when already on cart section (optional polish)
function updateFabVisibility() {
  const snapshot = getCartSnapshot();
  if (snapshot.totalQty === 0) {
    fabCart.hidden = true;
    return;
  }
  const cartSection = document.getElementById('cart');
  const rect = cartSection.getBoundingClientRect();
  const onCart = rect.top < window.innerHeight * 0.5 && rect.bottom > 100;
  fabCart.hidden = onCart;
}
window.addEventListener('scroll', updateFabVisibility, { passive: true });
window.addEventListener('hashchange', () => {
  setTimeout(updateFabVisibility, 50);
  // Reset success view if user navigates away and back with empty form needs
});

// Hero parallax
const art = document.querySelector('.hero-art');
if (art && window.matchMedia('(pointer:fine)').matches) {
  art.addEventListener('mousemove', e => {
    const r = art.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    art.style.transform = `rotateY(${x * 5}deg) rotateX(${-y * 5}deg)`;
  });
  art.addEventListener('mouseleave', () => art.style.transform = '');
}

OrdersAPI.init().then(() => updateCartUI());
