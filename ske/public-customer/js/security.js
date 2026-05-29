(function () {
 document.addEventListener('contextmenu', function (e) {
 e.preventDefault();
 showSecurityWarningToast();
 });
 document.addEventListener('keydown', function (e) {
 if (e.keyCode === 123) {
 blockAction(e);
 }
 if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.keyCode === 73 || e.key === 'I' || e.key === 'i')) {
 blockAction(e);
 }
 if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.keyCode === 74 || e.key === 'J' || e.key === 'j')) {
 blockAction(e);
 }
 if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.keyCode === 67 || e.key === 'C' || e.key === 'c')) {
 blockAction(e);
 }
 if ((e.ctrlKey || e.metaKey) && (e.keyCode === 85 || e.key === 'U' || e.key === 'u')) {
 blockAction(e);
 }
 if ((e.ctrlKey || e.metaKey) && (e.keyCode === 83 || e.key === 'S' || e.key === 's')) {
 blockAction(e);
 }
 });
 function blockAction(e) {
 e.preventDefault();
 e.stopPropagation();
 showSecurityWarningToast();
 }
 function showSecurityWarningToast() {
 let toast = document.getElementById('security-toast');
 if (!toast) {
 toast = document.createElement('div');
 toast.id = 'security-toast';
 toast.style.cssText = `
 position: fixed;
 bottom: 30px;
 left: 50%;
 transform: translateX(-50%) translateY(100px);
 background: rgba(10, 15, 29, 0.95);
 color: #25D366;
 padding: 12px 24px;
 border-radius: 8px;
 border: 1px solid rgba(37, 211, 102, 0.3);
 font-family: 'Inter', sans-serif;
 font-size: 0.9rem;
 font-weight: 600;
 box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
 z-index: 100000;
 pointer-events: none;
 transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
 display: flex;
 align-items: center;
 gap: 10px;
 backdrop-filter: blur(10px);
 `;
 toast.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Inspecting source code is disabled.`;
 document.body.appendChild(toast);
 }
 toast.offsetHeight;
 toast.style.transform = 'translateX(-50%) translateY(0)';
 setTimeout(() => {
 toast.style.transform = 'translateX(-50%) translateY(150px)';
 }, 2500);
 }
 const antiDebugger = function () {
 function debugCheck(index) {
 if (("" + index / index).length !== 1 || index % 20 === 0) {
 (function () {}.constructor("debugger")());
 } else {
 (function () {}.constructor("debugger")());
 }
 debugCheck(++index);
 }
 try {
 debugCheck(0);
 } catch (e) {}
 };
 setInterval(function () {
 antiDebugger();
 }, 100);
 let isDevToolsOpen = false;
 const threshold = 160;
 function detectDevTools() {
 const widthDiff = window.outerWidth - window.innerWidth > threshold;
 const heightDiff = window.outerHeight - window.innerHeight > threshold;
 if (widthDiff || heightDiff) {
 if (!isDevToolsOpen) {
 isDevToolsOpen = true;
 triggerDevToolsReaction();
 }
 }
 }
 function triggerDevToolsReaction() {
 document.body.innerHTML = `
 <div style="
 display: flex;
 flex-direction: column;
 justify-content: center;
 align-items: center;
 height: 100vh;
 background-color: #0a0f1d;
 color: #ffffff;
 font-family: 'Outfit', 'Inter', sans-serif;
 text-align: center;
 padding: 2rem;
 box-sizing: border-box;
 z-index: 99999999;
 position: fixed;
 top: 0;
 left: 0;
 width: 100%;
 ">
 <!-- Glowing solar icon -->
 <div style="
 width: 100px;
 height: 100px;
 border-radius: 50%;
 background: radial-gradient(circle, rgba(37, 211, 102, 0.2) 0%, transparent 70%);
 border: 2px solid #25D366;
 display: flex;
 align-items: center;
 justify-content: center;
 margin-bottom: 2rem;
 box-shadow: 0 0 20px rgba(37, 211, 102, 0.4);
 ">
 <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
 <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
 <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
 </svg>
 </div>
 <h1 style="font-size: 2.2rem; font-weight: 800; color: #25D366; margin: 0 0 1rem 0; letter-spacing: -0.03em;">SECURITY PROTOCOL ACTIVE</h1>
 <p style="font-size: 1.1rem; color: #94a3b8; max-width: 500px; line-height: 1.6; margin: 0 0 2rem 0;">
 Developer tools are disabled on this application to safeguard the proprietary source code and assets.
 </p>
 <button onclick="window.location.reload()" style="
 background-color: #25D366;
 color: #0a0f1d;
 border: none;
 padding: 0.8rem 2rem;
 font-size: 1rem;
 font-weight: 700;
 border-radius: 6px;
 cursor: pointer;
 box-shadow: 0 4px 14px rgba(37, 211, 102, 0.4);
 transition: transform 0.2s ease;
 " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
 Reload App
 </button>
 </div>
 `;
 }
 setInterval(detectDevTools, 500);
 window.addEventListener('resize', detectDevTools);
 detectDevTools();
})();