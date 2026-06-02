/* =========================================================
   THAI HELP PLUS
   CHARTS.JS
========================================================= */
let barChart = null;
let lineChart = null;
/* =========================================================
   LOAD CHARTS WHEN PAGE READY
========================================================= */

const tooltipEl = document.getElementById('chartTooltip');

function getOrCreateTooltip() {
    return tooltipEl;
}

document.addEventListener('DOMContentLoaded', () => {
    const summaryPage = document.getElementById('page-summary');
    if (summaryPage && summaryPage.classList.contains('active-page')) {
        createCharts();
    }
});

/* =========================================================
   GET DATA
========================================================= */

function getChartTransactions() {
    try {
        return JSON.parse(localStorage.getItem('thaihelp_plus_transactions')) || [];
    } catch (e) {
        return [];
    }
}
/* =========================================================
   DAILY SUMMARY
========================================================= */

function buildDailySummary() {
    const transactions = getChartTransactions();
    const summary = {};
    transactions.forEach((row) => {
        const date = row.date;
        if (!summary[date]) {
            summary[date] = 0;
        }
        summary[date] += Number(row.gov);
    });

    const labels = Object.keys(summary).sort();
    const values = labels.map((key) => summary[key]);
    return {
        labels: labels.map(formatChartDate),
        values,
    };
}

/* =========================================================
   CUMULATIVE SUMMARY
========================================================= */

function buildCumulativeSummary() {
    const transactions = getChartTransactions();
    const grouped = {};
    transactions.forEach((row) => {
        const date = row.date;
        if (!grouped[date]) {
            grouped[date] = 0;
        }
        grouped[date] += Number(row.gov);
    });

    const dates = Object.keys(grouped).sort();
    let runningTotal = 0;
    const cumulative = [];

    dates.forEach((date) => {
        runningTotal += grouped[date];
        cumulative.push(Number(runningTotal.toFixed(2)));
    });

    return {
        labels: dates.map(formatChartDate),
        values: cumulative,
    };
}

/* =========================================================
   CREATE CHARTS
========================================================= */

function createCharts() {
    createBarChart();
    createLineChart();
}

/* =========================================================
   BAR CHART
========================================================= */

function createBarChart() {
    const canvas = document.getElementById('barChart');
    if (!canvas) return;
    const data = buildDailySummary();
    if (barChart) {
        barChart.destroy();
    }

    barChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'ยอดรัฐช่วย',
                    data: data.values,
                    borderRadius: 10,
                    backgroundColor: '#06C755',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    enabled: false,
                    external: externalTooltipHandler,
                },
            },
        },
    });
}

/* =========================================================
   LINE CHART
========================================================= */

function createLineChart() {
    const canvas = document.getElementById('lineChart');
    if (!canvas) return;
    const data = buildCumulativeSummary();

    if (lineChart) {
        lineChart.destroy();
    }
    lineChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'ยอดสะสม',
                    data: data.values,
                    borderWidth: 3,
                    borderColor: '#06C755',
                    backgroundColor: 'rgba(6,199,85,.15)',
                    tension: 0.35,
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 10,
                    pointHitRadius: 30,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: [
                {
                    afterDraw(chart) {
                        if (chart.tooltip?._active?.length) {
                            const ctx = chart.ctx;
                            const x = chart.tooltip._active[0].element.x;
                            ctx.save();
                            ctx.beginPath();
                            ctx.moveTo(x, chart.chartArea.top);
                            ctx.lineTo(x, chart.chartArea.bottom);
                            ctx.strokeStyle = '#06C755';
                            ctx.lineWidth = 1;
                            ctx.stroke();
                            ctx.restore();
                        }
                    },
                },
            ],
        },
    });
}

/* =========================================================
   REFRESH
========================================================= */

function refreshCharts() {
    if (barChart) {
        barChart.destroy();
        barChart = null;
    }
    if (lineChart) {
        lineChart.destroy();
        lineChart = null;
    }
    setTimeout(() => {
        createBarChart();
        createLineChart();
    }, 200);
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatChartDate(dateStr) {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
}

function externalTooltipHandler(context) {
    const { tooltip, chart } = context;
    const tooltipEl = getOrCreateTooltip();
    // ❌ hide
    if (!tooltip || tooltip.opacity === 0) {
        tooltipEl.classList.remove('show');
        return;
    }
    const data = tooltip.dataPoints?.[0];
    if (!data) return;
    const label = data.label;
    const value = data.formattedValue;
    tooltipEl.innerHTML = `
        <div style="font-weight:600;margin-bottom:2px">${label}</div>
        <div style="color:#22c55e;display:flex;align-items:center;gap:6px;">
            <i class="fi fi-rr-coins"></i>
            ${value} บาท
        </div>
    `;
    const canvasRect = chart.canvas.getBoundingClientRect();
    // base position
    let left = canvasRect.left + window.pageXOffset + tooltip.caretX;
    let top = canvasRect.top + window.pageYOffset + tooltip.caretY;
    // 📌 AUTO FLIP (สำคัญ)
    const tooltipHeight = 40;
    const viewportHeight = window.innerHeight;
    const projectedTop = top - tooltipHeight;
    if (projectedTop < window.scrollY) {
        // ถ้าชนบน → ไปด้านล่าง
        tooltipEl.style.transform = 'translate(-50%, 20%) scale(1)';
    } else {
        tooltipEl.style.transform = 'translate(-50%, -120%) scale(1)';
    }
    // 📌 CLAMP X (ไม่ให้หลุดจอ)
    const tooltipWidth = tooltipEl.offsetWidth || 120;
    const minX = tooltipWidth / 2 + 10;
    const maxX = window.innerWidth - tooltipWidth / 2 - 10;

    left = Math.max(minX, Math.min(left, maxX));
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
    tooltipEl.classList.add('show');
}
