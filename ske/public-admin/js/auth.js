// Admin login page.
import { auth } from './firebase.js?v=1608c3ca';
import { signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js';

const form = document.getElementById('login-form');
const button = document.getElementById('login-btn');
const message = document.getElementById('error-msg');

onAuthStateChanged(auth, (user) => {
  if (user) location.replace('dashboard.html' + location.search);
});

// Same wording for unknown email and wrong password, so the form does not
// reveal which emails have accounts.
function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes or reset your password.';
    case 'auth/network-request-failed':
      return 'No internet connection. Check your connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return 'Could not sign in. Please try again.';
  }
}

function showMessage(text, isError = true) {
  message.textContent = text;
  message.style.color = isError ? '#ef4444' : '#22c55e';
  message.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  message.hidden = true;
  button.disabled = true;
  button.textContent = 'Signing in…';
  try {
    await signInWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
  } catch (err) {
    showMessage(friendlyError(err.code));
    button.disabled = false;
    button.textContent = 'Login';
  }
});

document.getElementById('forgot-btn').addEventListener('click', async () => {
  const email = form.email.value.trim();
  if (!email) {
    showMessage('Enter your email above, then press "Forgot password?" again.');
    form.email.focus();
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    if (err.code === 'auth/network-request-failed') {
      showMessage(friendlyError(err.code));
      return;
    }
  }
  showMessage('If this email belongs to an admin, a password reset link is on its way.', false);
});
