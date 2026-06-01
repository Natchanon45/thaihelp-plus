/* =========================================================
   THAI HELP PLUS
   APP.JS
========================================================= */
const DAILY_LIMIT = 200;
const MONTHLY_LIMIT = 1000;
const STORAGE_KEY = 'thaihelp_plus_transactions';
const THEME_KEY = 'thaihelp_plus_theme';
let currentCalculation = null;
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
        }, 500);
    }, 800);
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
    const total = parseFloat(document.getElementById('totalAmount').value);
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

    if (typeof refreshCharts === 'function') {
        refreshCharts();
    }
}

/* =========================================================
   RESET
========================================================= */

function resetCalculator() {
    document.getElementById('totalAmount').value = '';
    document.getElementById('resultCard').classList.add('d-none');
    document.getElementById('btnSave').disabled = true;
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
            <strong class="me-auto">ระบบ</strong>
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

function initTheme() {
    const theme = localStorage.getItem(THEME_KEY);
    if (theme === 'dark') {
        document.body.classList.add('dark');
    }
}

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
