import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
const firebaseConfig = {
 apiKey: "AIzaSyDx97Ps0fgoTqIiPc-IPqkIP23bkXtPIoQ",
 authDomain: "chating-45c19.firebaseapp.com",
 projectId: "chating-45c19",
 storageBucket: "chating-45c19.firebasestorage.app",
 messagingSenderId: "140576648620",
 appId: "1:140576648620:web:00c4e0e4ec0a7697911e09",
 measurementId: "G-5FLZDE4L5C"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
enableIndexedDbPersistence(db).catch((err) => {
 if (err.code == 'failed-precondition') {
 console.warn('Firestore offline caching: persistence disabled due to multiple open tabs.');
 } else if (err.code == 'unimplemented') {
 console.warn('Firestore offline caching: browser does not support persistence.');
 }
});
export { app, db, auth };