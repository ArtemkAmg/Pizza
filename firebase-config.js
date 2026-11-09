/**
 * Налаштування Firebase (безкоштовний план Spark).
 *
 * 1. Зайди на https://console.firebase.google.com/
 * 2. Створи проєкт (наприклад Avoska)
 * 3. Authentication → Sign-in method → Email/Password → Увімкни
 * 4. Authentication → Users → Add user (email + пароль для персоналу)
 * 5. Firestore Database → Create database → production mode → region europe-west
 * 6. Rules для Firestore (на час старту можна так, потім обмеж):
 *      rules_version = '2';
 *      service cloud.firestore {
 *        match /databases/{database}/documents {
 *          match /orders/{id} {
 *            allow create: if true;
 *            allow read, update, delete: if request.auth != null;
 *          }
 *        }
 *      }
 * 7. Project settings → Your apps → Web → скопіюй firebaseConfig сюди
 * 8. Постав USE_FIREBASE = true
 */

const USE_FIREBASE = false; // ← постав true після заповнення конфігу

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Демо-логін (лише коли USE_FIREBASE = false). Зміни пароль!
const DEMO_ADMIN = {
  login: "admin",
  password: "avoska2026"
};
