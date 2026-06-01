/* =========================================================
   PWA.JS
========================================================= */
let deferredPrompt;
/* =========================================================
   REGISTER SERVICE WORKER
========================================================= */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('./service-worker.js')
            .then((reg) => {
                console.log('SW Registered', reg.scope);
            })
            .catch((err) => {
                console.error(err);
            });
    });
}

/* =========================================================
   INSTALL APP EVENT
========================================================= */
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
});

/* =========================================================
   INSTALL BUTTON
========================================================= */
function showInstallButton() {
    if (document.getElementById('installBtn')) {
        return;
    }
    const btn = document.createElement('button');
    btn.id = 'installBtn';
    btn.className = 'btn btn-success position-fixed';
    btn.style.bottom = '95px';
    btn.style.right = '15px';
    btn.style.zIndex = '9999';
    btn.innerHTML = `
        <i class="fi fi-rr-download"></i>
        ติดตั้งแอป
    `;
    btn.onclick = installApp;
    document.body.appendChild(btn);
}

/* =========================================================
   INSTALL APP
========================================================= */
async function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
        console.log('User accepted install');
    }
    deferredPrompt = null;
}

/* =========================================================
   APP INSTALLED
========================================================= */
window.addEventListener(
    'appinstalled',
    () => {
        console.log('PWA Installed');
        const btn = document.getElementById('installBtn');
        if (btn) {
            btn.remove();
        }
    },
);
