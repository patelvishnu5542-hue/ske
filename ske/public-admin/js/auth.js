import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
onAuthStateChanged(auth, (user) => {
 if (user) {
 window.location.href = "dashboard.html";
 }
});
const loginForm = document.getElementById('login-form');
if (loginForm) {
 loginForm.addEventListener('submit', async (e) => {
 e.preventDefault();
 const email = document.getElementById('email').value;
 const password = document.getElementById('password').value;
 const loginBtn = document.getElementById('login-btn');
 const errorMsg = document.getElementById('error-msg');
 loginBtn.innerText = 'Logging in...';
 loginBtn.disabled = true;
 errorMsg.style.display = 'none';
 try {
 await signInWithEmailAndPassword(auth, email, password);
 } catch (error) {
 console.error(error);
 errorMsg.style.display = 'block';
 errorMsg.innerText = error.message;
 loginBtn.innerText = 'Login';
 loginBtn.disabled = false;
 }
 });
}