// Firebase for the admin panel: login (Auth) and full Firestore access.
// Admin rights come from firestore.rules (/admins/{uid}), not from this file.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';

// Public by design: these values only name the Firebase project.
const PRODUCTION_CONFIG = {
  apiKey: 'AIzaSyDx97Ps0fgoTqIiPc-IPqkIP23bkXtPIoQ',
  authDomain: 'chating-45c19.firebaseapp.com',
  projectId: 'chating-45c19',
  storageBucket: 'chating-45c19.firebasestorage.app',
  messagingSenderId: '140576648620',
  appId: '1:140576648620:web:00c4e0e4ec0a7697911e09',
};

// Local testing against the Firebase emulator: open the admin on localhost
// with ?emulator (and ?emulator=0 to switch back). Never active on a real domain.
function emulatorRequested() {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) return false;
  try {
    const flag = new URLSearchParams(location.search).get('emulator');
    if (flag !== null) sessionStorage.setItem('ske:emulator', flag === '0' ? '' : '1');
    return sessionStorage.getItem('ske:emulator') === '1';
  } catch {
    return false;
  }
}

export const usingEmulator = emulatorRequested();

const app = initializeApp(usingEmulator
  ? { apiKey: 'demo-key', authDomain: 'demo-ske.firebaseapp.com', projectId: 'demo-ske', appId: 'demo-app' }
  : PRODUCTION_CONFIG);

export const auth = getAuth(app);
export const db = getFirestore(app);

if (usingEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8085);
}
