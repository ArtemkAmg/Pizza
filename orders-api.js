/**
 * Єдиний API замовлень: Firebase Firestore АБО localStorage (демо).
 * Підключай після firebase-config.js
 */
(function (global) {
  const STORAGE_KEY = 'avoska_orders_v1';
  const SESSION_KEY = 'avoska_admin_session';

  let db = null;
  let auth = null;
  let firebaseReady = false;

  async function initFirebase() {
    if (!USE_FIREBASE) return false;
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK не завантажено');
      return false;
    }
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'YOUR_API_KEY') {
      console.warn('Заповни firebase-config.js');
      return false;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
      firebaseReady = true;
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveLocal(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function uid() {
    return 'ord_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  const OrdersAPI = {
    mode: () => (firebaseReady ? 'firebase' : 'local'),

    async init() {
      await initFirebase();
      return OrdersAPI.mode();
    },

    async createOrder(order) {
      const payload = {
        ...order,
        id: uid(),
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (firebaseReady) {
        const ref = await db.collection('orders').add({
          ...payload,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        payload.id = ref.id;
        return payload;
      }

      const list = loadLocal();
      list.unshift(payload);
      saveLocal(list);
      // сповіщення іншим вкладкам
      try {
        localStorage.setItem('avoska_orders_ping', String(Date.now()));
      } catch (_) {}
      return payload;
    },

    async listOrders() {
      if (firebaseReady) {
        const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(200).get();
        return snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || '',
            updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || ''
          };
        });
      }
      return loadLocal();
    },

    async updateStatus(id, status) {
      if (firebaseReady) {
        await db.collection('orders').doc(id).update({
          status,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return;
      }
      const list = loadLocal();
      const i = list.findIndex(o => o.id === id);
      if (i >= 0) {
        list[i].status = status;
        list[i].updatedAt = new Date().toISOString();
        saveLocal(list);
      }
    },

    async deleteOrder(id) {
      if (firebaseReady) {
        await db.collection('orders').doc(id).delete();
        return;
      }
      saveLocal(loadLocal().filter(o => o.id !== id));
    },

    // ——— Auth ———
    async login(loginOrEmail, password) {
      if (firebaseReady) {
        const cred = await auth.signInWithEmailAndPassword(loginOrEmail, password);
        return { uid: cred.user.uid, email: cred.user.email };
      }
      const demoLogin = (typeof DEMO_ADMIN !== 'undefined' && DEMO_ADMIN.login) ? DEMO_ADMIN.login : 'admin';
      const demoPass = (typeof DEMO_ADMIN !== 'undefined' && DEMO_ADMIN.password) ? DEMO_ADMIN.password : 'avoska2026';
      if (String(loginOrEmail).trim().toLowerCase() === String(demoLogin).trim().toLowerCase()
          && String(password) === String(demoPass)) {
        const session = { login: demoLogin, at: Date.now() };
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) {}
        return session;
      }
      throw new Error('Невірний логін або пароль');
    },

    async logout() {
      if (firebaseReady) {
        await auth.signOut();
        return;
      }
      sessionStorage.removeItem(SESSION_KEY);
    },

    async currentUser() {
      if (firebaseReady) {
        return new Promise(resolve => {
          const unsub = auth.onAuthStateChanged(u => {
            unsub();
            resolve(u ? { uid: u.uid, email: u.email } : null);
          });
        });
      }
      try {
        const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
        return s;
      } catch {
        return null;
      }
    },

    onOrdersChange(callback) {
      if (firebaseReady) {
        return db.collection('orders').orderBy('createdAt', 'desc').limit(200)
          .onSnapshot(snap => {
            const list = snap.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || '',
                updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || ''
              };
            });
            callback(list);
          });
      }
      // local: poll + storage event
      const tick = () => callback(loadLocal());
      tick();
      const id = setInterval(tick, 2500);
      const onStorage = (e) => {
        if (e.key === STORAGE_KEY || e.key === 'avoska_orders_ping') tick();
      };
      window.addEventListener('storage', onStorage);
      return () => {
        clearInterval(id);
        window.removeEventListener('storage', onStorage);
      };
    }
  };

  global.OrdersAPI = OrdersAPI;
})(window);
