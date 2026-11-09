const STATUS_LABELS = {
  new: 'Нове',
  calling: 'Дзвонимо',
  confirmed: 'Підтверджено',
  done: 'Виконано',
  cancelled: 'Скасовано'
};

const loginScreen = document.getElementById('loginScreen');
const adminApp = document.getElementById('adminApp');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginHint = document.getElementById('loginHint');
const modeBadge = document.getElementById('modeBadge');
const adminUser = document.getElementById('adminUser');
const logoutBtn = document.getElementById('logoutBtn');
const ordersList = document.getElementById('ordersList');
const orderDetail = document.getElementById('orderDetail');
const detailBody = document.getElementById('detailBody');
const detailTitle = document.getElementById('detailTitle');
const detailClose = document.getElementById('detailClose');
const adminMain = document.getElementById('adminMain') || document.querySelector('.admin-main');

let allOrders = [];
let filterStatus = 'all';
let selectedId = null;
let unsub = null;

function formatTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('uk-UA', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

function showApp(user) {
  loginScreen.hidden = true;
  loginScreen.style.display = 'none';
  adminApp.hidden = false;
  adminApp.classList.add('is-open');
  adminApp.style.display = 'flex';
  adminUser.textContent = (user && (user.email || user.login)) || 'Адмін';

  let mode = 'demo';
  try {
    if (typeof OrdersAPI !== 'undefined') mode = OrdersAPI.mode();
  } catch (_) {}
  modeBadge.textContent = mode === 'firebase' ? 'cloud' : 'demo';
  modeBadge.classList.toggle('firebase', mode === 'firebase');
  if (mode === 'firebase' && loginHint) loginHint.hidden = true;

  startOrdersWatch();
}

window.__avoskaShowApp = showApp;
window.__avoskaAfterLogin = showApp;

function startOrdersWatch() {
  if (typeof OrdersAPI === 'undefined') return;
  if (unsub) unsub();
  unsub = OrdersAPI.onOrdersChange(list => {
    allOrders = list || [];
    renderStats();
    renderList();
    if (selectedId) {
      const o = allOrders.find(x => x.id === selectedId);
      if (o) renderDetail(o);
      else closeDetail();
    }
  });
}

function showLogin() {
  adminApp.hidden = true;
  adminApp.classList.remove('is-open');
  adminApp.style.display = 'none';
  loginScreen.hidden = false;
  loginScreen.style.display = '';
  if (unsub) { unsub(); unsub = null; }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (loginError) {
    loginError.hidden = true;
    loginError.style.display = 'none';
  }

  const login = (document.getElementById('loginInput').value || '').trim();
  const password = (document.getElementById('passwordInput').value || '');

  if (!login || !password) {
    if (loginError) {
      loginError.textContent = 'Введи логін і пароль';
      loginError.hidden = false;
      loginError.style.display = '';
    }
    return;
  }

  // Основний шлях через API
  if (typeof OrdersAPI !== 'undefined') {
    try {
      await OrdersAPI.init();
      const user = await OrdersAPI.login(login, password);
      showApp(user);
      return;
    } catch (err) {
      console.error(err);
      if (loginError) {
        loginError.textContent = err.message || 'Помилка входу';
        loginError.hidden = false;
        loginError.style.display = '';
      }
      return;
    }
  }

  // Фолбек без API
  const demoLogin = (typeof DEMO_ADMIN !== 'undefined' && DEMO_ADMIN.login) ? DEMO_ADMIN.login : 'admin';
  const demoPass = (typeof DEMO_ADMIN !== 'undefined' && DEMO_ADMIN.password) ? DEMO_ADMIN.password : 'avoska2026';
  if (login.toLowerCase() === String(demoLogin).toLowerCase() && password === String(demoPass)) {
    showApp({ login: demoLogin });
  } else if (loginError) {
    loginError.textContent = 'Невірний логін або пароль';
    loginError.hidden = false;
    loginError.style.display = '';
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      if (typeof OrdersAPI !== 'undefined') await OrdersAPI.logout();
    } catch (_) {}
    try { sessionStorage.removeItem('avoska_admin_session'); } catch (_) {}
    showLogin();
  });
}

document.querySelectorAll('.af').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.af').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterStatus = btn.dataset.status;
    renderList();
  });
});

if (detailClose) detailClose.addEventListener('click', closeDetail);

function renderStats() {
  const n = allOrders.filter(o => o.status === 'new').length;
  const a = allOrders.filter(o => o.status === 'calling' || o.status === 'confirmed').length;
  const d = allOrders.filter(o => o.status === 'done').length;
  const el = id => document.getElementById(id);
  if (el('statNew')) el('statNew').textContent = n;
  if (el('statActive')) el('statActive').textContent = a;
  if (el('statDone')) el('statDone').textContent = d;
  if (el('statAll')) el('statAll').textContent = allOrders.length;
}

function renderList() {
  if (!ordersList) return;
  const list = filterStatus === 'all'
    ? allOrders
    : allOrders.filter(o => o.status === filterStatus);

  if (!list.length) {
    ordersList.innerHTML = '<p class="orders-empty">Немає замовлень у цій категорії</p>';
    return;
  }

  ordersList.innerHTML = list.map(o => {
    const itemsCount = (o.items || []).reduce((s, i) => s + (i.qty || 0), 0);
    return `
      <article class="order-card ${o.id === selectedId ? 'active' : ''}" data-id="${o.id}">
        <div class="order-card-top">
          <h3>${escapeHtml(o.customerName || 'Клієнт')}</h3>
          <span class="status-pill status-${o.status}">${STATUS_LABELS[o.status] || o.status}</span>
        </div>
        <div class="order-card-meta">
          <span><b>${o.total || 0}</b> грн</span>
          <span>${itemsCount} поз.</span>
          <span>${escapeHtml(o.customerPhone || '')}</span>
          <time>${formatTime(o.createdAt)}</time>
        </div>
      </article>
    `;
  }).join('');
}

if (ordersList) {
  ordersList.addEventListener('click', (e) => {
    const card = e.target.closest('.order-card');
    if (!card) return;
    selectedId = card.dataset.id;
    const o = allOrders.find(x => x.id === selectedId);
    if (o) {
      renderDetail(o);
      renderList();
    }
  });
}

function closeDetail() {
  selectedId = null;
  if (orderDetail) {
    orderDetail.hidden = true;
    orderDetail.style.display = 'none';
  }
  if (adminMain) adminMain.classList.add('no-detail');
  renderList();
}

function renderDetail(o) {
  if (adminMain) adminMain.classList.remove('no-detail');
  if (orderDetail) {
    orderDetail.hidden = false;
    orderDetail.style.display = '';
  }
  if (detailTitle) detailTitle.textContent = o.customerName || 'Замовлення';

  const itemsHtml = (o.items || []).map(i =>
    `<li>${escapeHtml(i.name)}${i.options?.length ? `<small class="order-item-options">${i.options.map(escapeHtml).join(' · ')}</small>` : ''} × ${i.qty} — <b>${i.lineTotal} грн</b></li>`
  ).join('') || '<li>Немає позицій</li>';

  const phone = (o.customerPhone || '').replace(/\s/g, '');

  detailBody.innerHTML = `
    <div class="detail-section">
      <h4>Статус</h4>
      <span class="status-pill status-${o.status}">${STATUS_LABELS[o.status] || o.status}</span>
    </div>
    <div class="detail-section">
      <h4>Клієнт</h4>
      <p><b>${escapeHtml(o.customerName || '—')}</b></p>
      <p><a class="detail-phone" href="tel:${escapeHtml(phone)}">📞 ${escapeHtml(o.customerPhone || '—')}</a></p>
      ${o.address ? `<p>${escapeHtml(o.address)}</p>` : ''}
    </div>
    <div class="detail-section">
      <h4>Страви</h4>
      <ul>${itemsHtml}</ul>
      <p class="detail-total" style="margin-top:10px">${o.total || 0} грн</p>
    </div>
    <div class="detail-section">
      <h4>Оплата</h4>
      <p>${escapeHtml(o.paymentLabel || o.payment || '—')}</p>
    </div>
    ${o.comment ? `<div class="detail-section"><h4>Коментар</h4><p>${escapeHtml(o.comment)}</p></div>` : ''}
    <div class="detail-section">
      <h4>Час</h4>
      <p>Створено: ${formatTime(o.createdAt)}</p>
      <p>Оновлено: ${formatTime(o.updatedAt)}</p>
    </div>
    <div class="detail-section">
      <h4>Дії</h4>
      <div class="detail-actions">
        <button type="button" data-status="calling">Дзвонимо</button>
        <button type="button" data-status="confirmed">Підтверджено</button>
        <button type="button" data-status="done">Виконано</button>
        <button type="button" data-status="cancelled">Скасувати</button>
        <button type="button" data-status="new">Повернути в нові</button>
        <button type="button" class="danger" data-action="delete">Видалити</button>
      </div>
    </div>
  `;
}

if (detailBody) {
  detailBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn || !selectedId || typeof OrdersAPI === 'undefined') return;
    if (btn.dataset.action === 'delete') {
      if (!confirm('Видалити замовлення назавжди?')) return;
      await OrdersAPI.deleteOrder(selectedId);
      closeDetail();
      return;
    }
    if (btn.dataset.status) {
      await OrdersAPI.updateStatus(selectedId, btn.dataset.status);
    }
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

(async function boot() {
  try {
    if (typeof OrdersAPI !== 'undefined') {
      await OrdersAPI.init();
      if (OrdersAPI.mode() === 'firebase' && loginHint) {
        loginHint.textContent = 'Увійди з email/паролем користувача Firebase Authentication';
      }
      const user = await OrdersAPI.currentUser();
      if (user) showApp(user);
    } else {
      // session restore without API
      try {
        const s = JSON.parse(sessionStorage.getItem('avoska_admin_session') || 'null');
        if (s) showApp(s);
      } catch (_) {}
    }
  } catch (err) {
    console.error(err);
  }
})();
