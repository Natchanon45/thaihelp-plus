/* =========================================================
   THAI HELP PLUS
   BACKUP.JS
   - Export: JSON / TXT / XLSX
   - Import: JSON / TXT / XLSX
========================================================= */
(function () {
    const BACKUP_VERSION = 1;
    const FILE_PREFIX = 'thaihelp-plus-backup';

    document.addEventListener('DOMContentLoaded', initBackupTools);

    function initBackupTools() {
        document.getElementById('btnExportJson')?.addEventListener('click', exportJsonBackup);
        document.getElementById('btnExportTxt')?.addEventListener('click', exportTxtBackup);
        document.getElementById('btnExportXlsx')?.addEventListener('click', exportXlsxBackup);
        document.getElementById('btnImportData')?.addEventListener('click', openImportPicker);
        document.getElementById('importDataFile')?.addEventListener('change', importBackupFile);
    }

    function buildBackupPayload() {
        return {
            app: 'thaihelp-plus',
            backupVersion: BACKUP_VERSION,
            exportedAt: new Date().toISOString(),
            appVersion: window.APP_CONFIG?.version || '',
            appBuild: window.APP_CONFIG?.build || '',
            transactions: getSafeTransactions(),
        };
    }

    function getSafeTransactions() {
        const source = typeof getTransactions === 'function' ? getTransactions() : [];
        return normalizeTransactions(source);
    }

    function normalizeTransactions(rows) {
        if (!Array.isArray(rows)) return [];
        return rows
            .map((row) => ({
                date: String(row.date || '').trim(),
                time: String(row.time || '').trim(),
                total: toNumber(row.total),
                gov: toNumber(row.gov),
                user: toNumber(row.user),
            }))
            .filter((row) => row.date && isFinite(row.total) && isFinite(row.gov) && isFinite(row.user));
    }

    function toNumber(value) {
        if (typeof value === 'number') return value;
        return Number(String(value ?? '').replace(/,/g, '').trim());
    }

    function timestamp() {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
    }

    function downloadFile(filename, blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function exportJsonBackup() {
        const payload = buildBackupPayload();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        downloadFile(`${FILE_PREFIX}-${timestamp()}.json`, blob);
        notify('สำรองข้อมูล JSON สำเร็จ');
    }

    function exportTxtBackup() {
        const payload = buildBackupPayload();
        const lines = [
            'THAI HELP PLUS BACKUP',
            `exportedAt=${payload.exportedAt}`,
            `appVersion=${payload.appVersion}`,
            '',
            'date\ttime\ttotal\tgov\tuser',
            ...payload.transactions.map((row) => `${row.date}\t${row.time}\t${row.total}\t${row.gov}\t${row.user}`),
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        downloadFile(`${FILE_PREFIX}-${timestamp()}.txt`, blob);
        notify('สำรองข้อมูล TXT สำเร็จ');
    }

    function exportXlsxBackup() {
        if (!window.XLSX) {
            notify('ไม่พบไลบรารี XLSX กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่');
            return;
        }
        const payload = buildBackupPayload();
        const rows = payload.transactions.map((row) => ({
            วันที่: row.date,
            เวลา: row.time,
            ยอดซื้อ: row.total,
            รัฐช่วย: row.gov,
            คุณจ่าย: row.user,
        }));
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'transactions');
        XLSX.writeFile(workbook, `${FILE_PREFIX}-${timestamp()}.xlsx`);
        notify('สำรองข้อมูล XLSX สำเร็จ');
    }

    function openImportPicker() {
        document.getElementById('importDataFile')?.click();
    }

    async function importBackupFile(event) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        try {
            const ext = file.name.split('.').pop().toLowerCase();
            let importedRows = [];
            if (ext === 'xlsx') {
                importedRows = await readXlsx(file);
            } else {
                const text = await file.text();
                importedRows = ext === 'json' ? readJson(text) : readTxt(text);
            }

            importedRows = normalizeTransactions(importedRows);
            if (!importedRows.length) {
                notify('ไม่พบข้อมูลที่นำเข้าได้');
                return;
            }

            const mode = confirm(`พบข้อมูล ${importedRows.length} รายการ\nกด OK เพื่อรวมกับข้อมูลเดิม\nกด Cancel เพื่อแทนที่ข้อมูลเดิมทั้งหมด`);
            const currentRows = typeof getTransactions === 'function' ? getTransactions() : [];
            const nextRows = mode ? mergeTransactions(currentRows, importedRows) : importedRows;

            if (typeof saveTransactions !== 'function') {
                throw new Error('saveTransactions is not available');
            }
            saveTransactions(nextRows);
            refreshAppAfterImport();
            notify(`นำเข้าข้อมูลสำเร็จ ${importedRows.length} รายการ`);
        } catch (error) {
            console.error(error);
            notify('นำเข้าข้อมูลไม่สำเร็จ กรุณาตรวจสอบไฟล์');
        }
    }

    function readJson(text) {
        const data = JSON.parse(text);
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.transactions)) return data.transactions;
        return [];
    }

    function readTxt(text) {
        const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const dataLines = lines.filter((line) => !line.startsWith('THAI HELP') && !line.includes('=') && !/^date\s+/i.test(line));
        return dataLines.map((line) => {
            const cells = line.split(/\t|,/).map((cell) => cell.trim());
            return {
                date: cells[0],
                time: cells[1],
                total: cells[2],
                gov: cells[3],
                user: cells[4],
            };
        });
    }

    function readXlsx(file) {
        return new Promise((resolve, reject) => {
            if (!window.XLSX) {
                reject(new Error('XLSX library is not available'));
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const workbook = XLSX.read(e.target.result, { type: 'array' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                    resolve(rows.map(mapXlsxRow));
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    function mapXlsxRow(row) {
        return {
            date: row.date || row.Date || row['วันที่'],
            time: row.time || row.Time || row['เวลา'],
            total: row.total || row.Total || row['ยอดซื้อ'],
            gov: row.gov || row.Gov || row['รัฐช่วย'],
            user: row.user || row.User || row['คุณจ่าย'],
        };
    }

    function mergeTransactions(currentRows, importedRows) {
        const map = new Map();
        [...normalizeTransactions(currentRows), ...importedRows].forEach((row) => {
            const key = `${row.date}|${row.time}|${row.total}|${row.gov}|${row.user}`;
            map.set(key, row);
        });
        return Array.from(map.values()).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    }

    function refreshAppAfterImport() {
        if (typeof loadHistory === 'function') loadHistory();
        if (typeof updateBalance === 'function') updateBalance();
        if (typeof refreshCharts === 'function') refreshCharts();
    }

    function notify(message) {
        if (typeof showToast === 'function') {
            showToast(message);
        } else {
            alert(message);
        }
    }
})();
