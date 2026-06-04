/* =========================================================
   THAI HELP PLUS
   APP.JS
========================================================= */
const DAILY_LIMIT = 200;
const MONTHLY_LIMIT = 1000;
const STORAGE_KEY = 'thaihelp_plus_transactions';
const THEME_MODE_KEY = 'thaihelp_theme_mode';
let currentCalculation = null;
let isQuickSelect = false;
const APP_VERSION = APP_CONFIG.version;
const APP_AUTHOR = 'ณัฐชนน ศรีเปล่ง';

/* =========================================================
   INITIALIZE
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    initDate();
    initTheme();
    initNavigation();
    loadHistory();
    updateBalance();
    bindEvents();
    initFooter();
    checkVersion();
    hideSplash();
});

/* =========================================================
   SPLASH
========================================================= */

function hideSplash() {
    const splash = document.getElementById('splash-screen');
    setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.remove();
        }, 1000);
    }, 3000);
}

/* =========================================================
   DATE
========================================================= */

function initDate() {
    const today = new Date();
    document.getElementById('currentDate').textContent = today.toLocaleDateString('en-GB');
}

/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {
    document.getElementById('btnCalculate')?.addEventListener('click', calculate);
    document.getElementById('btnSave')?.addEventListener('click', saveTransaction);
    document.getElementById('clearAllBtn')?.addEventListener('click', clearAllTransactions);
    document.getElementById('historySearch')?.addEventListener('keyup', searchHistory);
    document.getElementById('toggleTheme')?.addEventListener('click', toggleTheme);

    // ==============================
    // AMOUNT INPUT (PRO VERSION)
    // ==============================
    const input = document.getElementById('totalAmount');
    const btnClear = document.getElementById('btnClearAmount');
    if (!input || !btnClear) return;
    let isFormatting = false;
    input.addEventListener('input', function (e) {
        btnClear.classList.toggle('show', input.value.length > 0);
        if (!isQuickSelect) {
            resetQuickAmount();
        }
        if (isFormatting) return;
        isFormatting = true;
        const el = e.target;
        const oldValue = el.value;
        const cursorPos = el.selectionStart;
        let value = oldValue.replace(/,/g, '').replace(/[^0-9.]/g, '');
        // กัน dot ซ้ำ
        const firstDot = value.indexOf('.');
        if (firstDot !== -1) {
            value = value.substring(0, firstDot + 1) + value.substring(firstDot + 1).replace(/\./g, '');
        }
        let [intPart, decPart] = value.split('.');
        intPart = intPart ? Number(intPart).toLocaleString('en-US') : '';
        const newValue = decPart !== undefined ? `${intPart}.${decPart}` : intPart;
        el.value = newValue;
        // ===== FIX CURSOR (ไม่กระพริบ) =====
        const diff = newValue.length - oldValue.length;
        const newCursor = Math.max(0, cursorPos + diff);
        requestAnimationFrame(() => {
            el.setSelectionRange(newCursor, newCursor);
            isFormatting = false;
        });
    });

    // const toggle = document.getElementById('themeToggle');
    // const autoBtn = document.getElementById('themeAutoBtn');

    // toggle?.addEventListener('change', () => {
    //     const mode = toggle.checked ? 'dark' : 'light';
    //     localStorage.setItem(THEME_MODE_KEY, mode);
    //     applyTheme(mode);
    //     syncToggleUI(mode);
    // });

    // autoBtn?.addEventListener('click', () => {
    //     const mode = 'auto';
    //     localStorage.setItem(THEME_MODE_KEY, mode);
    //     applyTheme(mode);
    //     syncToggleUI(mode);
    // });

    document.querySelectorAll('.amount-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const input = document.getElementById('totalAmount');
            isQuickSelect = true; // 👈 สำคัญ
            resetQuickAmount();
            btn.classList.add('active');
            input.value = btn.dataset.value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            calculate();
            // input.focus();
            setTimeout(() => {
                isQuickSelect = false;
            }, 0);
        });
    });

    document.querySelectorAll('.step-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const input = document.getElementById('totalAmount');
            let current = parseMoney(input.value || '0');
            const step = Number(btn.dataset.step);
            current += step;
            input.value = current.toString();
            input.dispatchEvent(new Event('input', { bubbles: true }));
            calculate(); // 👉 auto recalc
        });
    });

    document.getElementById('btnUpdateApp')?.addEventListener('click', async () => {
        if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map((name) => caches.delete(name)));
        }
        if (navigator.serviceWorker) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((reg) => reg.unregister()));
        }
        location.reload(true);
    });
    // paste support
    input.addEventListener('paste', () => {
        setTimeout(() => {
            input.dispatchEvent(new Event('input'));
        }, 0);
    });

    // clear button
    input.addEventListener('input', function () {
        btnClear.classList.toggle('show', input.value.length > 0);
    });

    btnClear.addEventListener('click', function () {
        input.value = '';
        btnClear.classList.remove('show');
        input.focus();
        resetQuickAmount();
    });
}

/* =========================================================
   STORAGE
========================================================= */

function getTransactions() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}
function saveTransactions(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* =========================================================
   BALANCE
========================================================= */

function calculateUsage() {
    const transactions = getTransactions();
    const today = new Date().toLocaleDateString('en-CA');
    const monthKey = today.substring(0, 7);
    let daily = 0;
    let monthly = 0;
    transactions.forEach((item) => {
        if (item.date === today) {
            daily += Number(item.gov);
        }
        if (item.date.substring(0, 7) === monthKey) {
            monthly += Number(item.gov);
        }
    });
    return {
        daily,
        monthly,
    };
}

function updateBalance() {
    const usage = calculateUsage();
    const remainDaily = Math.max(DAILY_LIMIT - usage.daily, 0);
    const remainMonthly = Math.max(MONTHLY_LIMIT - usage.monthly, 0);
    document.getElementById('remainDaily').textContent = remainDaily.toFixed(2);
    document.getElementById('remainMonthly').textContent = remainMonthly.toFixed(2);
    const percent = (usage.monthly / MONTHLY_LIMIT) * 100;
    document.getElementById('monthlyProgress').style.width = Math.min(percent, 100) + '%';
}

/* =========================================================
   CALCULATE
========================================================= */

function calculate() {
    const total = parseMoney(totalAmount.value);
    if (isNaN(total) || total <= 0) {
        showToast('กรุณากรอกจำนวนเงิน');
        return;
    }
    const usage = calculateUsage();
    const remainDaily = DAILY_LIMIT - usage.daily;
    const remainMonthly = MONTHLY_LIMIT - usage.monthly;
    let gov = total * 0.6;
    gov = Math.min(gov, remainDaily, remainMonthly);
    gov = Math.max(gov, 0);
    const user = total - gov;
    currentCalculation = {
        total,
        gov,
        user,
    };
    document.getElementById('govAmount').textContent = gov.toFixed(2) + ' บาท';
    document.getElementById('userAmount').textContent = user.toFixed(2) + ' บาท';

    let note = '';
    if (gov < total * 0.6) {
        note = 'วงเงินช่วยเหลือคงเหลือไม่เพียงพอ';
    }
    document.getElementById('capNote').textContent = note;
    document.getElementById('resultCard').classList.remove('d-none');
    btnSave.classList.replace('btn-outline-success', 'btn-success');
    document.getElementById('btnSave').disabled = false;
}

/* =========================================================
   SAVE
========================================================= */

function saveTransaction() {
    if (!currentCalculation) return;
    const transactions = getTransactions();
    const now = new Date();
    transactions.push({
        date: now.toLocaleDateString('en-CA'),
        time: now.toLocaleTimeString('en-GB'),
        total: currentCalculation.total,
        gov: currentCalculation.gov,
        user: currentCalculation.user,
    });
    saveTransactions(transactions);
    loadHistory();
    updateBalance();
    showToast('บันทึกรายการสำเร็จ');
    resetCalculator();
    resetQuickAmount();
    if (typeof refreshCharts === 'function') {
        refreshCharts();
    }
}

/* =========================================================
   RESET
========================================================= */

function resetCalculator() {
    const input = document.getElementById('totalAmount');
    const btnClear = document.getElementById('btnClearAmount');
    input.value = '';
    btnClear.classList.remove('show');
    document.getElementById('resultCard').classList.add('d-none');
    btnSave.classList.replace('btn-success', 'btn-outline-success');
    document.getElementById('btnSave').disabled = true;
    resetQuickAmount();
}

/* =========================================================
   HISTORY
========================================================= */

function loadHistory() {
    const table = document.getElementById('historyTable');
    const empty = document.getElementById('historyEmpty');
    const transactions = getTransactions();
    table.innerHTML = '';
    if (transactions.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    [...transactions].reverse().forEach((row, index) => {
        table.innerHTML += `
                <tr>
                    <td>
                        ${formatDate(row.date)}
                        <br>
                        <small>${row.time}</small>
                    </td>
                    <td>
                        ${row.total.toFixed(2)}
                    </td>
                    <td>
                        ${row.gov.toFixed(2)}
                    </td>
                    <td>
                        ${row.user.toFixed(2)}
                    </td>
                    <td>
                        <button
                            class="btn btn-sm btn-danger"
                            onclick="deleteRow(${transactions.length - 1 - index})">
                            <i class="fi fi-rr-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
    });
}

/* =========================================================
   DELETE
========================================================= */

function deleteRow(index) {
    const data = getTransactions();
    data.splice(index, 1);
    saveTransactions(data);
    loadHistory();
    updateBalance();
    showToast('ลบรายการสำเร็จ');

    if (typeof refreshCharts === 'function') {
        refreshCharts();
    }
}

/* =========================================================
   CLEAR
========================================================= */

function clearAllTransactions() {
    if (!confirm('ล้างข้อมูลทั้งหมด?')) {
        return;
    }
    localStorage.removeItem(STORAGE_KEY);
    loadHistory();
    updateBalance();
    showToast('ล้างข้อมูลสำเร็จ');
    if (typeof refreshCharts === 'function') {
        refreshCharts();
    }
}

/* =========================================================
   SEARCH
========================================================= */

function searchHistory() {
    const keyword = this.value.toLowerCase();
    const rows = document.querySelectorAll('#historyTable tr');
    rows.forEach((row) => {
        row.style.display = row.innerText.toLowerCase().includes(keyword) ? '' : 'none';
    });
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB');
}

/* =========================================================
   TOAST
========================================================= */

function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast text-bg-success border-0';
    toast.innerHTML = `
        <div class="toast-header">
            <i class="fi fi-rr-check me-2 text-success"></i>
            <strong class="me-auto">ไทยช่วยไทย พลัส แจ้งว่า</strong>
            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="toast">
            </button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    container.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, {
        delay: 3000,
    });
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

/* =========================================================
   THEME
========================================================= */

function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem(THEME_KEY, document.body.classList.contains('dark') ? 'dark' : 'light');
}

/* =========================================================
   NAVIGATION
========================================================= */

function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
        btn.addEventListener('click', function () {
            const page = this.dataset.page;
            document.querySelectorAll('.page').forEach((p) => {
                p.classList.remove('active-page');
            });
            document.getElementById('page-' + page).classList.add('active-page');
            document.querySelectorAll('.nav-btn').forEach((b) => {
                b.classList.remove('active');
            });
            this.classList.add('active');
            // ===== Refresh Chart ตอนเปิดหน้าสรุป =====
            if (page === 'summary' && typeof refreshCharts === 'function') {
                setTimeout(() => {
                    refreshCharts();
                }, 100);
            }
        });
    });
}

function showSuccess(message) {
    const toast = document.getElementById('toastSuccess');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

function parseMoney(value) {
    return parseFloat(value.replace(/,/g, '')) || 0;
}

function handleMoneyInput(e) {
    if (isFormatting) return;
    isFormatting = true;
    const input = e.target;
    // เก็บตำแหน่ง cursor
    const selectionStart = input.selectionStart;
    const oldValue = input.value;
    // clean input
    let value = oldValue.replace(/,/g, '').replace(/[^0-9.]/g, '');
    // กัน dot เกิน 1 จุด
    const firstDot = value.indexOf('.');
    if (firstDot !== -1) {
        value = value.substring(0, firstDot + 1) + value.substring(firstDot + 1).replace(/\./g, '');
    }
    let [intPart, decimalPart] = value.split('.');
    intPart = intPart ? Number(intPart).toLocaleString('en-US') : '';
    let newValue = decimalPart !== undefined ? `${intPart}.${decimalPart}` : intPart;
    input.value = newValue;
    // ===== cursor fix (กันกระพริบ) =====
    const diff = newValue.length - oldValue.length;
    const newCursorPos = Math.max(0, selectionStart + diff);
    requestAnimationFrame(() => {
        input.setSelectionRange(newCursorPos, newCursorPos);
        isFormatting = false;
    });
}

function resetQuickAmount() {
    document.querySelectorAll('.amount-btn').forEach((btn) => btn.classList.remove('active'));
}

function initFooter() {
    const footer = document.getElementById('appFooter');
    if (!footer) return;
    footer.innerHTML = `
        App Version ${APP_CONFIG.version} • พัฒนาโดย ${APP_AUTHOR}
    `;
}

function initTheme() {
    const mode = localStorage.getItem(THEME_MODE_KEY) || 'auto';
    applyTheme(mode);
    watchSystemTheme();
    initThemeButton();
}

function applyTheme(mode) {
    document.body.classList.remove('dark');
    if (mode === 'dark') {
        document.body.classList.add('dark');
    }
    if (mode === 'auto') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
            document.body.classList.add('dark');
        }
    }
    updateThemeButton(mode);
}

function initThemeButton() {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const current = localStorage.getItem(THEME_MODE_KEY) || 'auto';
        let next = 'auto';
        switch (current) {
            case 'auto':
                next = 'light';
                break;
            case 'light':
                next = 'dark';
                break;
            case 'dark':
                next = 'auto';
                break;
        }
        localStorage.setItem(THEME_MODE_KEY, next);
        applyTheme(next);
    });
}

function updateThemeButton(mode) {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    const icons = {
        auto: 'fi fi-rr-operation',
        light: 'fi fi-rr-brightness',
        dark: 'fi fi-rr-moon-stars'
    };
    btn.innerHTML = `<i class="${icons[mode]}"></i>`;
    btn.title = {
        auto: 'ตามระบบ',
        light: 'โหมดสว่าง',
        dark: 'โหมดมืด'
    }[mode];
}

function watchSystemTheme() {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', () => {
        const mode = localStorage.getItem(THEME_MODE_KEY);
        if (mode !== 'auto') return;
        applyTheme('auto');
    });
}

async function checkVersion() {
    try {
        const res = await fetch('./version.json?t=' + Date.now());
        const latest = await res.json();
        console.log('Current:', APP_CONFIG.version, APP_CONFIG.build);
        console.log('Latest :', latest.version, latest.build);
        if (
            latest.version !== APP_CONFIG.version ||
            latest.build !== APP_CONFIG.build
        ) {
            console.log('NEW VERSION FOUND');
            showUpdateButton();
        }
    } catch (err) {
        console.error(err);
    }
}

function showUpdateButton() {
    const banner = document.getElementById('updateBanner');
    if (!banner) return;

    banner.classList.add('show');
}
async function updateApplication() {
    try {
        localStorage.removeItem('thaihelp_plus_theme');
        if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map((name) => caches.delete(name)));
        }
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) {
                await reg.unregister();
            }
        }
        location.reload();
    } catch (err) {
        console.error(err);
        alert('ไม่สามารถอัปเดตได้');
    }
}
