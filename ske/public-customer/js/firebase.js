// Firestore connection for the public website. The website only reads
// catalogue content and creates leads, so it does not load Firebase Auth.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';

// This config is public by design: it only names the Firebase project.
// Access is controlled by firestore.rules, not by keeping these values secret.
const PRODUCTION_CONFIG = {
  apiKey: 'AIzaSyDx97Ps0fgoTqIiPc-IPqkIP23bkXtPIoQ',
  authDomain: 'chating-45c19.firebaseapp.com',
  projectId: 'chating-45c19',
  storageBucket: 'chating-45c19.firebasestorage.app',
  messagingSenderId: '140576648620',
  appId: '1:140576648620:web:00c4e0e4ec0a7697911e09',
};

// Local testing against the Firebase emulator: open any page on localhost with
// ?emulator (and ?emulator=0 to switch back). Never active on the live domain.
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
  ? { apiKey: 'demo-key', projectId: 'demo-ske', appId: 'demo-app' }
  : PRODUCTION_CONFIG);

// Keeps fetched documents in IndexedDB so repeat visits can skip the network.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (usingEmulator) connectFirestoreEmulator(db, '127.0.0.1', 8085);
