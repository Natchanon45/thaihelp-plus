/* =========================================================
   THAI HELP PLUS
   CHARTS.JS
========================================================= */
let barChart = null;
let lineChart = null;
/* =========================================================
   LOAD CHARTS WHEN PAGE READY
========================================================= */

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
            },
            scales: {
                y: {
                    beginAtZero: true,
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
            },
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
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
