// --- Utils & State ---
let expenses = [];
let plannerItems = [];
let wishlist = [];
let monthlyHistory = [];
let incomeEntries = []; // Track pemasukan per entry: {id, date, amount, desc}

// Kategori pengeluaran (jenis: "pengeluaran") — mutually exclusive, satu bahasa.
const EXPENSE_CATEGORIES = ['Cicilan', 'Tagihan', 'Kebutuhan', 'Belanja', 'Lainnya'];
// Tujuan tabungan (jenis: "tabungan") — aliran terpisah dari kategori pengeluaran.
const SAVINGS_GOALS = ['Dana Darurat', 'Tabungan Liburan'];

// Mapping label grup planner (key internal grup TIDAK diubah agar data planner lama tetap valid)
const groupLabels = {
    'INSTALLMENT': 'Cicilan',
    'BILLS': 'Tagihan',
    'KEBUTUHAN': 'Kebutuhan',
    'GROCERIES': 'Belanja',
    'LAINNYA': 'Lainnya'
};

// Terjemahan kategori lama (Bahasa Inggris) -> kategori pengeluaran baru
const legacyCategoryMap = {
    'Installment': 'Cicilan',
    'Bills': 'Tagihan',
    'Kebutuhan': 'Kebutuhan',
    'Groceries': 'Belanja',
    'Lainnya': 'Lainnya'
};

const defaultPlannerTemplate = [
    { id: '1', group: 'INSTALLMENT', category: 'Cicilan', name: 'Quota suami', amount: 50000 },
    { id: '2', group: 'INSTALLMENT', category: 'Cicilan', name: 'Quota istri', amount: 40000 },
    { id: '3', group: 'BILLS', category: 'Tagihan', name: 'PDAM', amount: 9000 },
    { id: '4', group: 'BILLS', category: 'Tagihan', name: 'PLN', amount: 182000 },
    { id: '5', group: 'BILLS', category: 'Tagihan', name: 'Wi-fi', amount: 235000 },
    { id: '6', group: 'KEBUTUHAN', category: 'Kebutuhan', name: 'Gas lpg', amount: 20000 },
    { id: '7', group: 'KEBUTUHAN', category: 'Kebutuhan', name: 'bensin', amount: 150000 },
    { id: '8', group: 'KEBUTUHAN', category: 'Kebutuhan', name: 'Laundry', amount: 80000 },
    { id: '9', group: 'KEBUTUHAN', category: 'Kebutuhan', name: 'sangu suami', amount: 980000 },
    { id: '10', group: 'KEBUTUHAN', category: 'Kebutuhan', name: 'Pasar', amount: 870000 },
    { id: '11', group: 'GROCERIES', category: 'Belanja', name: 'Beras', amount: 60000 },
    { id: '12', group: 'GROCERIES', category: 'Belanja', name: 'Galon', amount: 77500 },
    { id: '13', group: 'GROCERIES', category: 'Belanja', name: 'skincare', amount: 250000 },
    { id: '14', group: 'GROCERIES', category: 'Belanja', name: 'Kado dek tata', amount: 800000 },
    { id: '15', group: 'GROCERIES', category: 'Belanja', name: 'Tol+bensin jkt', amount: 1100000 },
    { id: '16', group: 'GROCERIES', category: 'Belanja', name: 'Tiket kereta adek', amount: 355000 }
];

// Show/Hide Global Loader
const toggleLoader = (show, text = 'Menyimpan...') => {
    const loader = document.getElementById('globalLoader');
    document.getElementById('globalLoaderText').textContent = text;
    if(show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
};

// Sync to Cloud
// Setiap simpan mengirim SELURUH data, jadi satu simpan yang berhasil
// otomatis ikut mengirim perubahan yang tadi gagal.
let dataLoaded = false;        // jangan pernah menimpa cloud sebelum data cloud berhasil dimuat
let hasUnsavedChanges = false;

// Return true kalau tersimpan. Pemanggil hanya boleh menampilkan pesan sukses bila true.
const saveDataToCloud = async () => {
    if (!dataLoaded) {
        hasUnsavedChanges = true;
        showToast('Data belum termuat, jadi perubahan tidak disimpan. Muat ulang halaman.', true);
        return false;
    }
    toggleLoader(true, 'Menyimpan...');
    try {
        const res = await fetch('/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ expenses, plannerItems, incomeEntries, wishlist, monthlyHistory })
        });
        if(!res.ok) throw new Error('Failed to save to cloud');
        hasUnsavedChanges = false;
        return true;
    } catch (e) {
        console.error(e);
        hasUnsavedChanges = true;
        showToast('Gagal menyimpan. Cek internet, nanti dikirim ulang otomatis.', true);
        return false;
    } finally {
        toggleLoader(false);
    }
};

// Kirim ulang otomatis saat internet kembali; peringatkan kalau halaman ditutup sebelum tersimpan.
window.addEventListener('online', () => {
    if (hasUnsavedChanges && dataLoaded) {
        saveDataToCloud().then(ok => { if (ok) showToast('Perubahan tadi sudah tersimpan.'); });
    }
});
window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges && dataLoaded) { e.preventDefault(); e.returnValue = ''; }
});

const formatRp = (amount) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

window.formatInputCurrency = function(el) {
    let raw = el.value.replace(/[^0-9]/g, '');
    if(raw) {
        el.value = parseInt(raw, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    } else {
        el.value = '';
    }
};

const parseCurrencyValue = (str) => {
    if(!str) return 0;
    return parseFloat(str.toString().replace(/\./g, '')) || 0;
};

const formatCurrencyValue = (num) => {
    if(!num) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// action (opsional): { label, onClick } → tombol di dalam toast, mis. "Batalkan".
const showToast = (msg, isError = false, action = null) => {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const icon = document.getElementById('toastIcon');
    const iconBg = document.getElementById('toastIconBg');
    
    if(isError) {
        toast.classList.add('border-rose-200', 'shadow-sm');
        toast.classList.remove('border-slate-200');
        iconBg.className = 'w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100';
        icon.className = 'bx bx-error font-bold text-xl';
    } else {
        toast.classList.remove('border-rose-200', 'shadow-sm');
        toast.classList.add('border-slate-200');
        iconBg.className = 'w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100';
        icon.className = 'bx bx-check font-bold text-xl';
    }
    toastMsg.textContent = msg;
    // Error: role=alert (langsung dibacakan) dan TIDAK hilang sendiri — gagal simpan harus tetap
    // terlihat sampai ditutup atau sampai simpan berikutnya berhasil (ui-ux-pro-max: Persistent Error Messages).
    toast.setAttribute('role', isError ? 'alert' : 'status');
    const actionBtn = document.getElementById('toastAction');
    actionBtn.classList.toggle('hidden', !action);
    actionBtn.textContent = action ? action.label : '';
    actionBtn.onclick = action ? (e) => { e.stopPropagation(); hideToast(); action.onClick(); } : null;
    document.getElementById('toastClose').classList.toggle('hidden', !isError);
    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    // Timer toast sebelumnya dibatalkan supaya toast baru tidak ikut tertutup.
    clearTimeout(toastTimer);
    if (!isError) toastTimer = setTimeout(hideToast, action ? 6000 : 3000);
};
let toastTimer = null;
// pointer-events-none: toast yang tersembunyi (transparan) tidak boleh menghalangi tap di bawahnya.
const hideToast = () => document.getElementById('toast').classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
document.getElementById('toast').addEventListener('click', hideToast);

// Hapus satu item langsung + tombol "Batalkan" (DESIGN_BRIEF: "Dihapus — Batalkan").
// getArr dipanggil saat itu juga supaya tetap benar walau array global sudah diganti.
function deleteWithUndo(getArr, id, what, rerender) {
    const arr = getArr();
    const idx = arr.findIndex(x => x.id === id);
    if (idx < 0) return;
    const [removed] = arr.splice(idx, 1);
    rerender();
    saveDataToCloud().then((ok) => {
        if (!ok) return;
        showToast(`${what} dihapus.`, false, { label: 'Batalkan', onClick: () => {
            const cur = getArr();
            cur.splice(Math.min(idx, cur.length), 0, removed);
            rerender();
            saveDataToCloud().then(ok2 => { if (ok2) showToast(`${what} dikembalikan.`); });
        }});
    });
}

// --- Custom Confirm Dialog ---
let _confirmCallback = null;

window.showConfirm = function({ title = 'Konfirmasi', message, okLabel = 'Hapus', okClass = 'bg-red-600 hover:bg-red-700', iconClass = 'bx bx-error', iconBg = 'bg-red-500/20 text-red-400' }, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmOkBtn').textContent = okLabel;
    document.getElementById('confirmOkBtn').className = `flex-1 ${okClass} text-white font-medium py-2.5 rounded-xl text-sm transition-colors`;
    const iconEl = document.getElementById('confirmIcon');
    iconEl.className = `${iconBg} p-2.5 rounded-xl flex-shrink-0`;
    iconEl.innerHTML = `<i class='${iconClass} text-xl'></i>`;
    _confirmCallback = callback;
    const modal = document.getElementById('modalConfirm');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeConfirm = function(result) {
    const modal = document.getElementById('modalConfirm');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if(_confirmCallback) { _confirmCallback(result); _confirmCallback = null; }
};

// --- Tab Navigation ---
// --- Tema (dark / light) ---
let currentTabId = 'beranda';

function applyChartTheme() {
    if (typeof Chart === 'undefined') return;
    const isDark = document.documentElement.classList.contains('dark');
    Chart.defaults.color = isDark ? '#94a3b8' : '#64748b';
    Chart.defaults.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
}

window.toggleTheme = function() {
    const root = document.documentElement;
    const isDark = root.classList.toggle('dark');
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch(e) {}

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0f172a' : '#f8fafc');

    applyChartTheme();
    // Render ulang tab aktif supaya chart & elemen dinamis ikut tema baru.
    switchTab(currentTabId);
};

window.switchTab = function(tabId) {
    currentTabId = tabId;
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-slate-50', 'text-slate-800', 'active');
        btn.classList.add('text-slate-500');
    });
    document.querySelectorAll('.nav-btn-m').forEach(btn => {
        btn.classList.remove('active', 'text-blue-500');
        if(btn.id !== 'nav-input-m') {
            btn.classList.add('text-slate-500');
        }
    });
    
    // desktop
    const activeBtn = document.getElementById(`nav-${tabId}`);
    if(activeBtn) {
        activeBtn.classList.remove('text-slate-500');
        activeBtn.classList.add('bg-slate-50', 'text-slate-800', 'active');
    }
    
    // mobile
    const mActiveBtn = document.getElementById(`nav-${tabId}-m`);
    if(mActiveBtn) {
        if(tabId !== 'input') {
            mActiveBtn.classList.remove('text-slate-500');
            mActiveBtn.classList.add('text-blue-500');
        }
        mActiveBtn.classList.add('active');
    }

    document.querySelectorAll('.tab-content').forEach(sec => sec.classList.add('hide'));
    document.getElementById(`tab-${tabId}`).classList.remove('hide');

    if(tabId === 'beranda') renderBeranda();
    if(tabId === 'monthly') renderMonthly();
    if(tabId === 'weekly') renderWeekly();
    if(tabId === 'history') renderHistory();
    if(tabId === 'planner') renderPlanner();
    if(tabId === 'wishlist') renderWishlist();
    if(tabId === 'monthhistory') renderMonthHistory();
    if(tabId === 'panduan') { try { localStorage.setItem(PANDUAN_KEY, '1'); } catch(e) {} }
};

// --- Periode keuangan: mengikuti gajian tanggal 25 ---
// Periode "November 2026" = 25 Okt – 24 Nov (gaji 25 Okt membiayai tagihan November).
// Key periode tetap berformat 'YYYY-MM', jadi data planner & riwayat lama tetap valid.
const PAYDAY = 25;

function getPlannerMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Key periode untuk sebuah Date atau string 'YYYY-MM-DD'.
function getPeriodKey(d) {
    let y, m, day;
    if (typeof d === 'string') {
        [y, m, day] = d.split('-').map(Number);
        m -= 1;
    } else {
        y = d.getFullYear(); m = d.getMonth(); day = d.getDate();
    }
    return getPlannerMonthKey(new Date(y, day >= PAYDAY ? m + 1 : m, 1));
}

// Tanggal 1 pada bulan sebuah key (selalu berada di dalam periodenya).
function periodKeyToDate(key) {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1);
}

function prevPeriodKey(key) {
    const d = periodKeyToDate(key);
    return getPlannerMonthKey(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

// "25 Okt – 24 Nov"
function formatPeriodRange(key) {
    const d = periodKeyToDate(key);
    const fmt = (x) => x.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    return `${fmt(new Date(d.getFullYear(), d.getMonth() - 1, PAYDAY))} – ${fmt(new Date(d.getFullYear(), d.getMonth(), PAYDAY - 1))}`;
}

function formatPeriodName(key) {
    return periodKeyToDate(key).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

// --- Planner Data Structure & Logic ---
// Selalu tanggal 1 bulan periode yang sedang dilihat.
let plannerViewingDate = periodKeyToDate(getPeriodKey(new Date()));

window.changePlannerMonth = function(delta) {
    plannerViewingDate.setMonth(plannerViewingDate.getMonth() + delta);
    renderPlanner();
};

window.setPlannerMonth = function(val) {
    if (!val) return;
    const [year, month] = val.split('-');
    plannerViewingDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    renderPlanner();
};

const groupOrder = ['INSTALLMENT', 'BILLS', 'KEBUTUHAN', 'GROCERIES', 'LAINNYA'];

// --- Planner: filter tampilan (Belum Bayar / Semua) ---
let plannerFilter = 'unpaid';

window.setPlannerFilter = function(filter) {
    plannerFilter = filter;
    const activeClasses = ['bg-primary', 'text-white', 'shadow-lg', 'shadow-blue-500/30'];
    const inactiveClasses = ['bg-white', 'text-slate-600', 'border', 'border-slate-200'];
    // Ada 2 instance tombol filter (cluster sticky mobile + baris statis desktop) — samakan keduanya.
    document.querySelectorAll('.planner-filter-btn').forEach(btn => {
        if(btn.dataset.filter === filter) {
            btn.classList.remove(...inactiveClasses);
            btn.classList.add(...activeClasses);
        } else {
            btn.classList.remove(...activeClasses);
            btn.classList.add(...inactiveClasses);
        }
    });
    renderPlanner();
};

// --- Planner: menu "..." di mobile ---
window.togglePlannerMenu = function() {
    document.getElementById('plannerMenuDropdown').classList.toggle('hidden');
};
window.closePlannerMenu = function() {
    document.getElementById('plannerMenuDropdown').classList.add('hidden');
};
document.addEventListener('click', (e) => {
    const menu = document.getElementById('plannerMenuDropdown');
    const btn = document.getElementById('btnPlannerMenu');
    if(!menu || menu.classList.contains('hidden')) return;
    if(!menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

// Tombol Bayar di daftar: gaya "tinted", bukan solid — banyak tombol solid
// berderet saling berebut perhatian (HIG: maks 1–2 tombol menonjol per layar).
// Solid hijau dipakai sekali saja, di tombol konfirmasi modal Bayar.
const PAY_BTN_CLASS = 'min-h-[44px] px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-sm font-bold transition-colors';

// Total yang sudah dibayar untuk satu item planner. Item planner unik per periode
// (salin bulan lalu = id baru), jadi cukup dicocokkan lewat plannerRef — tidak lewat tanggal.
function getPlannerPaid(item) {
    return expenses
        .filter(ex => ex.plannerRef === item.id)
        .reduce((sum, ex) => sum + ex.amount, 0);
}

function renderPlanner() {
    const monthKey = getPlannerMonthKey(plannerViewingDate);
    const monthName = formatPeriodName(monthKey);
    document.getElementById('plannerCurrentMonthStr').innerText = monthName;
    document.getElementById('plannerMonthLabel').innerText =
        `Periode ${formatPeriodRange(monthKey)}. Tagihan rutin yang sudah kamu rencanakan — tekan Bayar saat dibayar.`;
    const monthPicker = document.getElementById('plannerMonthPicker');
    if (monthPicker) {
        monthPicker.value = monthKey;
    }

    const tbody = document.getElementById('plannerTableBody');
    const cardContainer = document.getElementById('plannerCardContainer');
    tbody.innerHTML = '';
    cardContainer.innerHTML = '';
    
    let totalEstimasi = 0;
    let totalDibayar = 0;

    const groupedItems = {};
    let currentMonthItemsCount = 0;
    plannerItems.forEach(item => {
        if (item.monthKey !== monthKey) return;
        currentMonthItemsCount++;
        if(!groupedItems[item.group]) groupedItems[item.group] = [];
        groupedItems[item.group].push(item);
    });

    const copyBtn = document.getElementById('btnCopyPlanner');
    if (copyBtn) {
        if (currentMonthItemsCount === 0) {
            copyBtn.classList.remove('hidden');
        } else {
            copyBtn.classList.add('hidden');
        }
    }

    const groupsToRender = [...groupOrder];
    Object.keys(groupedItems).forEach(g => {
        if(!groupsToRender.includes(g)) groupsToRender.push(g);
    });

    groupsToRender.forEach(groupName => {
        if(!groupedItems[groupName] || groupedItems[groupName].length === 0) return;

        // Hitung dulu semua item di grup ini (totals selalu dihitung dari SEMUA item,
        // terlepas dari filter tampilan yang sedang aktif).
        const computedItems = groupedItems[groupName].map(item => {
            const amountPaid = getPlannerPaid(item);
            totalEstimasi += item.amount;
            totalDibayar += amountPaid;
            const sisa = item.amount - amountPaid;
            const isLunas = sisa <= 0;
            return { item, amountPaid, sisa, isLunas };
        });

        // Filter tampilan: "unpaid" hanya tampilkan yang belum lunas.
        const visibleItems = plannerFilter === 'unpaid'
            ? computedItems.filter(c => !c.isLunas)
            : computedItems;

        if(visibleItems.length === 0) return; // grup kosong di filter ini, jangan tampilkan header

        // === Desktop: Table Row Header ===
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <td colspan="5" class="p-3 bg-slate-50/80 text-slate-500 font-bold text-center text-xs border-y border-slate-100">${groupLabels[groupName] || groupName}</td>
        `;
        tbody.appendChild(headerRow);

        // === Mobile: Group Header ===
        const mGroupHeader = document.createElement('h3');
        mGroupHeader.className = 'text-slate-500 font-bold text-xs pt-2 px-1';
        mGroupHeader.innerText = groupLabels[groupName] || groupName;
        cardContainer.appendChild(mGroupHeader);

        visibleItems.forEach(({ item, amountPaid, sisa, isLunas }) => {
            // Merah HANYA untuk bayar melebihi rencana. Sisa tagihan biasa = netral.
            const lebih = amountPaid - item.amount;
            const lebihNote = lebih > 0 ? `<span class="text-rose-600 font-bold">Lebih ${formatRp(lebih)}</span>` : '';
            // Hapus ada di dalam form Edit, supaya tidak salah pencet di sebelah tombol Bayar.
            const payBtn = !isLunas
                ? `<button onclick="payPlannerItem('${item.id}')" class="${PAY_BTN_CLASS}">Bayar</button>`
                : `<span class="text-xs font-bold text-emerald-700 px-3 py-2">Lunas</span>`;
            const editBtn = `<button onclick="editPlannerItem('${item.id}')" aria-label="Ubah ${item.name}" title="Ubah" class="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"><i class='bx bx-edit text-lg' aria-hidden="true"></i></button>`;

            // === Desktop: Table Row ===
            const tr = document.createElement('tr');
            if(isLunas) tr.classList.add('bg-emerald-50/50');
            tr.innerHTML = `
                <td class="p-5 font-bold text-slate-800">${item.name}</td>
                <td class="p-5 font-semibold text-slate-500">${formatRp(item.amount)}</td>
                <td class="p-5 font-bold text-slate-700">${formatRp(amountPaid)} ${lebihNote}</td>
                <td class="p-5 font-black ${isLunas ? 'text-slate-500' : 'text-slate-800'}">${formatRp(Math.max(0, sisa))}</td>
                <td class="p-5 text-center">
                    <div class="flex items-center justify-center gap-2">${payBtn}${editBtn}</div>
                </td>
            `;
            tbody.appendChild(tr);

            // === Mobile: Item Card (ringkas — 1 baris nama+sisa, progress bar, meta kecil) ===
            const pct = item.amount > 0 ? Math.min(100, Math.round((amountPaid / item.amount) * 100)) : 0;
            const card = document.createElement('div');
            card.className = `glass-panel rounded-2xl p-4 ${isLunas ? 'border-l-4 border-l-emerald-400' : ''}`;
            card.innerHTML = `
                <div class="flex items-center justify-between gap-2 mb-2">
                    <h4 class="font-extrabold text-slate-800 text-sm truncate">${item.name}</h4>
                    <span class="font-black text-sm flex-shrink-0 ${isLunas ? 'text-emerald-700' : 'text-slate-800'}">${isLunas ? 'Lunas' : formatRp(Math.max(0, sisa))}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Sudah dibayar ${pct}%">
                    <div class="h-full rounded-full ${isLunas ? 'bg-emerald-500' : 'bg-blue-500'}" style="width:${pct}%"></div>
                </div>
                <div class="flex items-center justify-between gap-2">
                    <p class="text-xs text-slate-500 font-semibold">${formatRp(amountPaid)} dari ${formatRp(item.amount)} ${lebihNote}</p>
                    <div class="flex items-center gap-3 flex-shrink-0">${editBtn}${payBtn}</div>
                </div>
            `;
            cardContainer.appendChild(card);
        });
    });

    // Empty state kalau filter "Belum Bayar" tidak menyisakan apa-apa
    if(currentMonthItemsCount > 0 && tbody.children.length === 0) {
        cardContainer.innerHTML = `
            <div class="glass-panel rounded-[1.5rem] p-8 text-center border border-slate-100">
                <div class="text-4xl mb-3">🎉</div>
                <p class="font-bold text-slate-700">Semua tagihan periode ini sudah lunas!</p>
                <button onclick="setPlannerFilter('all')" class="mt-4 text-sm font-bold text-blue-600">Lihat semua tagihan</button>
            </div>
        `;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" class="p-8 text-center text-slate-500 font-bold">🎉 Semua tagihan periode ini sudah lunas!</td>`;
        tbody.appendChild(tr);
    }

    // Desktop summary
    document.getElementById('plannerTotalEstimasi').innerText = formatRp(totalEstimasi);
    document.getElementById('plannerTotalDibayar').innerText = formatRp(totalDibayar);
    document.getElementById('plannerSisa').innerText = formatRp(totalEstimasi - totalDibayar);
    // Mobile sticky summary bar (dobel sebagai tombol Ringkasan)
    const stickyAmount = document.getElementById('plannerStickyAmount');
    const stickyBar = document.getElementById('plannerStickyProgressBar');
    if(stickyAmount) stickyAmount.innerText = `${formatRp(totalDibayar)} / ${formatRp(totalEstimasi)}`;
    if(stickyBar) {
        const pctPaid = totalEstimasi > 0 ? Math.min(100, Math.round((totalDibayar / totalEstimasi) * 100)) : 0;
        stickyBar.style.width = `${pctPaid}%`;
    }
}

// --- Modals Planner CRUD ---
window.openPlannerModal = function() {
    document.getElementById('formPlannerCrud').reset();
    document.getElementById('crudPlannerId').value = '';
    document.getElementById('modalPlannerCrudTitle').innerText = 'Tambah tagihan rutin';
    document.getElementById('btnDeletePlannerItem').classList.add('hidden');
    document.getElementById('modalPlannerCrud').classList.remove('hidden');
};

window.closePlannerModal = function() {
    document.getElementById('modalPlannerCrud').classList.add('hidden');
};

window.editPlannerItem = function(id) {
    const item = plannerItems.find(p => p.id === id);
    if(item) {
        document.getElementById('crudPlannerId').value = item.id;
        document.getElementById('crudPlannerGroup').value = item.group;
        document.getElementById('crudPlannerName').value = item.name;
        document.getElementById('crudPlannerAmount').value = formatCurrencyValue(item.amount);
        document.getElementById('modalPlannerCrudTitle').innerText = 'Ubah tagihan rutin';
        document.getElementById('btnDeletePlannerItem').classList.remove('hidden');
        document.getElementById('modalPlannerCrud').classList.remove('hidden');
    }
};

// Riwayat pembayaran yang sudah tercatat tidak ikut terhapus. Bisa dibatalkan lewat toast.
window.deletePlannerItem = function(id) {
    const item = plannerItems.find(p => p.id === id);
    closePlannerModal();
    deleteWithUndo(() => plannerItems, id, `Tagihan "${item?.name || ''}"`, () => {
        renderPlanner();
        if (currentTabId === 'beranda') renderBeranda();
    });
};

window.copyPlannerFromPreviousMonth = function() {
    const currentMonthKey = getPlannerMonthKey(plannerViewingDate);
    
    // Calculate previous month key
    const prevDate = new Date(plannerViewingDate);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonthKey = getPlannerMonthKey(prevDate);

    const prevItems = plannerItems.filter(p => p.monthKey === prevMonthKey);
    
    if (prevItems.length === 0) {
        showToast('Tidak ada data di bulan sebelumnya untuk disalin.', true);
        return;
    }

    // Duplicate them with new IDs
    const newItems = prevItems.map((item, idx) => ({
        ...item,
        id: 'p_' + Date.now().toString() + '_' + idx,
        monthKey: currentMonthKey
    }));

    plannerItems = [...plannerItems, ...newItems];

    saveDataToCloud().then((ok) => {
        renderPlanner();
        if (currentTabId === 'beranda') renderBeranda();
        if (ok) showToast(`${newItems.length} tagihan disalin dari ${formatPeriodName(prevMonthKey)}.`);
    });
};

window.deleteAllPlannerItems = function() {
    const currentMonthKey = getPlannerMonthKey(plannerViewingDate);
    const monthItems = plannerItems.filter(p => p.monthKey === currentMonthKey);
    
    if (monthItems.length === 0) {
        showToast('Tidak ada tagihan untuk dihapus di bulan ini.', true);
        return;
    }

    showConfirm({
        title: 'Hapus semua tagihan',
        message: `Hapus ${monthItems.length} tagihan di periode ${formatPeriodName(currentMonthKey)}? Ini tidak bisa dibatalkan.`,
        okLabel: 'Hapus semua',
    }, (confirmed) => {
        if (!confirmed) return;
        plannerItems = plannerItems.filter(p => p.monthKey !== currentMonthKey);
        saveDataToCloud().then((ok) => {
            renderPlanner();
            if (ok) showToast('Semua tagihan periode ini dihapus.');
        });
    });
};

document.getElementById('formPlannerCrud').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('crudPlannerId').value;
    const group = document.getElementById('crudPlannerGroup').value;
    const name = document.getElementById('crudPlannerName').value;
    const amount = parseCurrencyValue(document.getElementById('crudPlannerAmount').value);
    
    // Auto-map category based on group
    const category = groupLabels[group] || 'Lainnya';
    const monthKey = getPlannerMonthKey(plannerViewingDate);

    if(id) {
        const idx = plannerItems.findIndex(p => p.id === id);
        if(idx > -1) {
            plannerItems[idx] = { ...plannerItems[idx], group, name, amount, category, monthKey };
        }
    } else {
        plannerItems.push({
            id: 'p_' + Date.now().toString(),
            group, name, amount, category, monthKey
        });
    }

    saveDataToCloud().then((ok) => {
        closePlannerModal();
        renderPlanner();
        if (ok) showToast('Tagihan tersimpan.');
    });
});

window.openPayModal = function(id, category, name, sisaAmount, monthKey) {
    document.getElementById('payPlannerId').value = id;
    document.getElementById('payPlannerCategory').value = category;
    document.getElementById('payPlannerName').value = name;
    document.getElementById('payPlannerMonthKey').value = monthKey;
    
    document.getElementById('payPlannerSubtitle').innerText = name;
    document.getElementById('payPlannerAmount').value = formatCurrencyValue(sisaAmount);
    
    document.getElementById('modalPayPlanner').classList.remove('hidden');
    // Focus the input
    setTimeout(() => document.getElementById('payPlannerAmount').focus(), 100);
};

window.closePayModal = function() {
    document.getElementById('modalPayPlanner').classList.add('hidden');
};

document.getElementById('formPayPlanner').addEventListener('submit', (e) => {
    e.preventDefault();
    const plannerRefId = document.getElementById('payPlannerId').value;
    const category = document.getElementById('payPlannerCategory').value;
    const name = document.getElementById('payPlannerName').value;
    const monthKey = document.getElementById('payPlannerMonthKey').value;
    const amountPaid = parseCurrencyValue(document.getElementById('payPlannerAmount').value);

    // Bayar di periode yang sedang berjalan = tanggal hari ini.
    // Bayar tagihan periode lain = tanggal 1 bulan itu (selalu masuk ke periodenya).
    const now = new Date();
    const txDate = getPeriodKey(now) === monthKey ? now : periodKeyToDate(monthKey);

    const dateStr = `${txDate.getFullYear()}-${String(txDate.getMonth()+1).padStart(2,'0')}-${String(txDate.getDate()).padStart(2,'0')}`;

    expenses.push({
        id: Date.now().toString(),
        plannerRef: plannerRefId,
        date: dateStr,
        amount: amountPaid,
        type: 'pengeluaran',
        category: category,
        desc: `[Planner] ${name}`
    });
    
    saveDataToCloud().then((ok) => {
        if (ok) showToast(`${name} dibayar ${formatRp(amountPaid)}.`);
        closePayModal();
        renderPlanner();
        if (currentTabId === 'beranda') renderBeranda();
    });
});


// --- Standard CRUD Operations ---
window.setTxType = function(type) {
    document.getElementById('inpTxType').value = type;

    const btnPengeluaran = document.getElementById('btnTxPengeluaran');
    const btnTabungan = document.getElementById('btnTxTabungan');
    const btnPemasukan = document.getElementById('btnTxPemasukan');
    const gridPengeluaran = document.getElementById('categoryGridPengeluaran');
    const gridTabungan = document.getElementById('categoryGridTabungan');
    const inpDesc = document.getElementById('inpDesc');

    const activeClasses = {
        pengeluaran: ['bg-primary', 'text-white', 'shadow-lg', 'shadow-blue-500/30'],
        tabungan: ['bg-sky-700', 'text-white', 'shadow-lg', 'shadow-sky-500/30'],
        pemasukan: ['bg-emerald-700', 'text-white', 'shadow-lg', 'shadow-emerald-500/30'],
    };
    const inactiveClasses = ['bg-white', 'text-slate-600', 'border', 'border-slate-200'];
    const buttons = { pengeluaran: btnPengeluaran, tabungan: btnTabungan, pemasukan: btnPemasukan };

    Object.keys(buttons).forEach(key => {
        const btn = buttons[key];
        if(key === type) {
            btn.classList.remove(...inactiveClasses);
            btn.classList.add(...activeClasses[key]);
        } else {
            btn.classList.remove(...activeClasses[key]);
            btn.classList.add(...inactiveClasses);
        }
    });

    if(type === 'tabungan') {
        gridTabungan.classList.remove('hide');
        gridPengeluaran.classList.add('hide');
        gridPengeluaran.querySelectorAll('input[name="category"]').forEach(r => r.checked = false);
        const firstGoal = gridTabungan.querySelector('input[name="category"]');
        if(firstGoal && !gridTabungan.querySelector('input[name="category"]:checked')) firstGoal.checked = true;
        inpDesc.placeholder = 'Contoh: Setor Dana Darurat bulanan...';
    } else if(type === 'pemasukan') {
        gridPengeluaran.classList.add('hide');
        gridTabungan.classList.add('hide');
        gridPengeluaran.querySelectorAll('input[name="category"]').forEach(r => r.checked = false);
        gridTabungan.querySelectorAll('input[name="category"]').forEach(r => r.checked = false);
        inpDesc.placeholder = 'Contoh: Gaji bulanan, bonus, THR...';
    } else {
        gridPengeluaran.classList.remove('hide');
        gridTabungan.classList.add('hide');
        gridTabungan.querySelectorAll('input[name="category"]').forEach(r => r.checked = false);
        const firstCat = gridPengeluaran.querySelector('input[name="category"]');
        if(firstCat && !gridPengeluaran.querySelector('input[name="category"]:checked')) firstCat.checked = true;
        inpDesc.placeholder = 'Contoh: Beli makan siang, ongkos...';
    }
};

// Shortcut dari tombol "Catat Pengeluaran" di Beranda
window.goCatatPengeluaran = function() {
    setTxType('pengeluaran');
    switchTab('input');
};

document.getElementById('expenseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const date = document.getElementById('inpDate').value;
    const amount = parseCurrencyValue(document.getElementById('inpAmount').value);
    const type = document.getElementById('inpTxType').value || 'pengeluaran';
    let category;
    if(type === 'pemasukan') {
        category = 'Pemasukan';
    } else {
        const checkedRadio = document.querySelector('input[name="category"]:checked');
        category = checkedRadio ? checkedRadio.value : (type === 'tabungan' ? SAVINGS_GOALS[0] : 'Lainnya');
        if(category === '__custom__') {
            category = (document.getElementById('inpTujuanCustom').value || 'Tabungan Lainnya').trim();
        }
    }
    const desc = document.getElementById('inpDesc').value || '-';

    if(id) {
        const index = expenses.findIndex(ex => ex.id === id);
        if(index > -1) {
            // retain plannerRef if it exists
            const pRef = expenses[index].plannerRef;
             expenses[index] = { id, plannerRef: pRef, date, amount, type, category, desc };
        }
    } else {
        expenses.push({ id: Date.now().toString(), plannerRef: null, date, amount, type, category, desc });
    }

    saveDataToCloud().then((ok) => {
        cancelEdit();
        if (ok) showToast('Transaksi tersimpan.');
        renderHistory();
        if(type !== 'pengeluaran') renderMonthly();
    });
});

window.deleteExpense = function(id) {
    const ex = expenses.find(e => e.id === id);
    deleteWithUndo(() => expenses, id, `Transaksi ${ex ? formatRp(ex.amount) : ''}`, renderHistory);
};

window.editExpense = function(id) {
    const ex = expenses.find(e => e.id === id);
    if(ex) {
        document.getElementById('editId').value = ex.id;
        document.getElementById('inpDate').value = ex.date;
        document.getElementById('inpAmount').value = formatCurrencyValue(ex.amount);
        document.getElementById('inpDesc').value = ex.desc === '-' ? '' : ex.desc;

        const type = (ex.type === 'tabungan' || ex.type === 'pemasukan') ? ex.type : 'pengeluaran';
        setTxType(type);

        const radio = document.querySelector(`input[name="category"][value="${ex.category}"]`);
        if(radio) {
            radio.checked = true;
        } else if(type === 'tabungan') {
            // Tujuan custom yang tidak ada di daftar preset
            const customRadio = document.getElementById('crudTujuanCustomRadio');
            if(customRadio) {
                customRadio.checked = true;
                document.getElementById('inpTujuanCustom').value = ex.category;
                document.getElementById('inpTujuanCustom').classList.remove('hide');
            }
        }
        updateDateDisplay();

        document.getElementById('btnCancelEdit').classList.remove('hidden');
        switchTab('input');
        window.scrollTo(0,0);
    }
};

window.cancelEdit = function() {
    document.getElementById('expenseForm').reset();
    document.getElementById('editId').value = '';
    setQuickDate(0); // Reset to today
    setTxType('pengeluaran');
    document.getElementById('btnCancelEdit').classList.add('hidden');
};

// --- Indonesian Date Helpers ---
const bulanIndo = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const hariIndo = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

function formatDateIndo(dateObj) {
    const hari = hariIndo[dateObj.getDay()];
    const tgl = dateObj.getDate();
    const bulan = bulanIndo[dateObj.getMonth()];
    const tahun = dateObj.getFullYear();
    return `${hari}, ${tgl} ${bulan} ${tahun}`;
}

function updateDateDisplay() {
    const val = document.getElementById('inpDate').value;
    const display = document.getElementById('dateDisplay');
    if(val) {
        const d = new Date(val + 'T00:00:00');
        display.innerText = formatDateIndo(d);
    } else {
        display.innerText = 'Pilih tanggal...';
    }
    // Highlight active quick button
    const today = new Date(); today.setHours(0,0,0,0);
    const selected = val ? new Date(val + 'T00:00:00') : null;
    document.querySelectorAll('.quick-date-btn').forEach((btn, i) => {
        const offset = [0, -1, -2][i];
        const compare = new Date(today); compare.setDate(compare.getDate() + offset);
        if(selected && selected.getTime() === compare.getTime()) {
            btn.classList.remove('border-slate-200', 'bg-white', 'text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-800');
            btn.classList.add('border-blue-200', 'bg-blue-50', 'text-blue-600');
        } else {
            btn.classList.remove('border-blue-200', 'bg-blue-50', 'text-blue-600');
            btn.classList.add('border-slate-200', 'bg-white', 'text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-800');
        }
    });
}

window.setQuickDate = function(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    document.getElementById('inpDate').value = dateStr;
    updateDateDisplay();
};

// Listen for native picker changes
document.getElementById('inpDate').addEventListener('change', updateDateDisplay);

// --- Render Logic: History ---
// Merah sengaja tidak dipakai untuk kategori: merah = masalah (minus / lebih bayar / hapus).
const CATEGORY_CHART_COLORS = {
    'Cicilan': '#ea580c',
    'Tagihan': '#0891b2',
    'Kebutuhan': '#2563eb',
    'Belanja': '#9333ea',
    'Lainnya': '#64748b',
};
const catColors = {
    'Cicilan': 'text-orange-600 bg-orange-50 border-orange-200 shadow-sm',
    'Tagihan': 'text-cyan-700 bg-cyan-50 border-cyan-200 shadow-sm',
    'Kebutuhan': 'text-blue-600 bg-blue-50 border-blue-200 shadow-sm',
    'Belanja': 'text-purple-600 bg-purple-50 border-purple-200 shadow-sm',
    'Dana Darurat': 'text-emerald-600 bg-emerald-50 border-emerald-200 shadow-sm',
    'Tabungan Liburan': 'text-sky-600 bg-sky-50 border-sky-200 shadow-sm',
    'Pemasukan': 'text-green-600 bg-green-50 border-green-200 shadow-sm',
    'Lainnya': 'text-slate-700 bg-slate-100 border-slate-300 shadow-sm',
};

function renderHistory() {
    const listContainer = document.getElementById('historyList');
    const emptyState = document.getElementById('emptyState');
    const filterValue = document.getElementById('historyDateFilter').value; // Format: YYYY-MM-DD
    
    listContainer.innerHTML = '';
    
    // Filter expenses
    let filteredExpenses = [...expenses];
    if (filterValue) {
        filteredExpenses = filteredExpenses.filter(ex => ex.date === filterValue);
    }
    
    if(filteredExpenses.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    const sorted = filteredExpenses.sort((a,b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(ex => {
        const colorClass = catColors[ex.category] || catColors['Lainnya'];
        const isPlanner = ex.plannerRef ? '<i class="bx bx-list-check text-blue-400" title="Dari Planner" aria-hidden="true"></i>' : '';
        const isTabungan = ex.type === 'tabungan';
        const isPemasukan = ex.type === 'pemasukan';
        const typeBadge = isPemasukan
            ? `<span class="px-2 py-0.5 text-xs font-bold rounded-lg border text-emerald-700 bg-emerald-50 border-emerald-200">Pemasukan</span>`
            : isTabungan
                ? `<span class="px-2 py-0.5 text-xs font-bold rounded-lg border text-sky-700 bg-sky-50 border-sky-200">Tabungan</span>`
                : `<span class="px-2 py-0.5 text-xs font-bold rounded-lg border text-slate-600 bg-slate-50 border-slate-200">Pengeluaran</span>`;
        const displayDate = new Date(ex.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

        const card = document.createElement('div');
        card.className = "glass-panel p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-100 hover:border-slate-200 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 group";

        card.innerHTML = `
            <div class="flex items-start md:items-center gap-4">
                <div class="flex flex-shrink-0 w-12 h-12 bg-slate-50 rounded-2xl items-center justify-center border border-slate-100 shadow-sm">
                    <i class='bx ${isPlanner ? 'bx-list-check' : (isPemasukan ? 'bx-plus-circle' : (isTabungan ? 'bx-coin-stack' : 'bx-minus-circle'))} text-2xl text-slate-600' aria-hidden="true"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                        ${typeBadge}
                        <span class="px-2 py-0.5 text-xs font-bold rounded-lg border ${colorClass}">${ex.category}</span>
                        <span class="text-xs font-semibold text-slate-500">${displayDate}</span>
                    </div>
                    <p class="font-extrabold text-slate-800 truncate text-base flex items-center gap-1.5">
                        ${ex.desc}
                    </p>
                </div>
            </div>
            
            <div class="flex items-center justify-between md:flex-col md:items-end gap-3 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                <span class="font-black text-slate-800 text-lg tracking-tight">${formatRp(ex.amount)}</span>
                <div class="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editExpense('${ex.id}')" aria-label="Ubah transaksi" title="Ubah" class="w-10 h-10 flex items-center justify-center text-blue-500 bg-white hover:bg-blue-50 rounded-xl transition-all border border-slate-200 hover:border-blue-200">
                        <i class='bx bx-edit-alt text-lg' aria-hidden="true"></i>
                    </button>
                    <button onclick="deleteExpense('${ex.id}')" aria-label="Hapus transaksi" title="Hapus" class="w-10 h-10 flex items-center justify-center text-rose-500 bg-white hover:bg-rose-50 rounded-xl transition-all border border-slate-200 hover:border-rose-200">
                        <i class='bx bx-trash text-lg' aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// --- Income Tracking ---
window.openIncomeModal = function(defaultDate) {
    document.getElementById('formIncomeAdd').reset();
    const t = new Date();
    document.getElementById('incomeDate').value = typeof defaultDate === 'string' ? defaultDate
        : `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    document.getElementById('incomeModalTitle').innerText = 'Catat pemasukan';
    document.getElementById('modalIncomeAdd').classList.remove('hidden');
    setTimeout(() => document.getElementById('incomeAmount').focus(), 100);
};

window.closeIncomeModal = function() {
    document.getElementById('modalIncomeAdd').classList.add('hidden');
};

document.getElementById('formIncomeAdd')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('incomeDate').value;
    const amount = parseCurrencyValue(document.getElementById('incomeAmount').value);
    const desc = document.getElementById('incomeDesc').value || 'Pemasukan';

    if(amount <= 0) {
        showToast('Nominal harus lebih dari Rp 0', true);
        return;
    }

    incomeEntries.push({
        id: Date.now().toString(),
        date: date,
        amount: amount,
        desc: desc
    });

    saveDataToCloud().then((ok) => {
        closeIncomeModal();
        renderBeranda();
        if (ok) showToast('Pemasukan tercatat.');
        if (_reopenMonthCloseKey) { openMonthCloseModal(_reopenMonthCloseKey); _reopenMonthCloseKey = null; }
    });
});

// --- Beranda (Halaman Pembuka) ---
// Banner panduan hanya untuk pemula: hilang setelah halaman Panduan pernah dibuka.
const PANDUAN_KEY = 'panduanDilihat';
function isPanduanSeen() {
    try { return localStorage.getItem(PANDUAN_KEY) === '1'; } catch(e) { return false; }
}
window.dismissPanduanBanner = function() {
    try { localStorage.setItem(PANDUAN_KEY, '1'); } catch(e) {}
    document.getElementById('berandaPanduanBanner').classList.add('hidden');
};

// Bayar lewat id saja, supaya nama tagihan berisi tanda kutip tidak merusak tombol.
window.payPlannerItem = function(id) {
    const item = plannerItems.find(p => p.id === id);
    if (item) openPayModal(item.id, item.category, item.name, item.amount - getPlannerPaid(item), item.monthKey);
};

// Salin tagihan periode lalu ke periode yang sedang berjalan (dari Beranda).
window.copyPlannerToCurrentPeriod = function() {
    plannerViewingDate = periodKeyToDate(getPeriodKey(new Date()));
    copyPlannerFromPreviousMonth();
};

const BERANDA_TAGIHAN_LIMIT = 5;

function renderBeranda() {
    const periodKey = getPeriodKey(new Date());
    const t = computeMonthTotals(periodKey);

    // Periode & hitung mundur gajian
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const periodStart = periodKeyToDate(periodKey);
    const nextPayday = new Date(periodStart.getFullYear(), periodStart.getMonth(), PAYDAY);
    const daysLeft = Math.round((nextPayday - today) / 86400000);
    document.getElementById('berandaPeriod').innerText = `Periode ${formatPeriodName(periodKey)}, ${formatPeriodRange(periodKey)}`;
    document.getElementById('berandaPayday').innerText = daysLeft <= 1 ? 'Gajian besok' : `Gajian ${daysLeft} hari lagi`;

    // Tagihan planner periode ini yang belum lunas (urut sesuai grup di Planner)
    const items = plannerItems.filter(p => p.monthKey === periodKey);
    const unpaid = items
        .map(item => ({ item, paid: getPlannerPaid(item) }))
        .map(x => ({ ...x, sisa: x.item.amount - x.paid }))
        .filter(x => x.sisa > 0)
        .sort((a, b) => groupOrder.indexOf(a.item.group) - groupOrder.indexOf(b.item.group));
    const sisaTagihan = unpaid.reduce((s, x) => s + x.sisa, 0);

    // Hero: tanpa pemasukan, angka "sisa" pasti minus dan menyesatkan —
    // tampilkan yang sudah keluar + ajakan mencatat gaji.
    const heroLabel = document.getElementById('berandaHeroLabel');
    const heroNum = document.getElementById('berandaSisa');
    const heroNote = document.getElementById('berandaHeroNote');
    const heroBase = 'hero-number font-extrabold tracking-tight';
    if (t.masuk === 0) {
        heroLabel.innerText = 'Sudah keluar periode ini';
        heroNum.innerText = formatRp(t.keluar + t.nabung);
        heroNum.className = `${heroBase} text-slate-800`;
        // Aksi terpenting saat gaji belum dicatat → tombol sungguhan, bukan tautan di dalam kalimat.
        heroNote.innerHTML = `Gaji periode ini belum dicatat, jadi sisa uang belum bisa dihitung.
            <button onclick="openIncomeModal()" class="mt-3 w-full min-h-[44px] bg-primary hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"><i class='bx bx-plus-circle text-lg' aria-hidden="true"></i> Catat gaji</button>`;
    } else {
        heroLabel.innerText = 'Sisa uang sampai gajian';
        heroNum.innerText = formatRp(t.sisa);
        heroNum.className = `${heroBase} ${t.sisa < 0 ? 'text-rose-600' : 'text-slate-800'}`;
        heroNote.innerText = sisaTagihan > 0
            ? `Masih ada tagihan ${formatRp(sisaTagihan)}. Setelah semuanya dibayar, sisa sekitar ${formatRp(t.sisa - sisaTagihan)}.`
            : (items.length > 0 ? 'Semua tagihan periode ini sudah dibayar.' : '');
    }

    document.getElementById('berandaMasuk').innerText = formatRp(t.masuk);
    document.getElementById('berandaKeluar').innerText = formatRp(t.keluar);
    document.getElementById('berandaNabung').innerText = formatRp(t.nabung);

    // Daftar tagihan belum dibayar
    const listEl = document.getElementById('berandaTagihanList');
    const countEl = document.getElementById('berandaTagihanCount');
    const moreEl = document.getElementById('berandaTagihanMore');
    if (items.length === 0) {
        const prevKey = prevPeriodKey(periodKey);
        const prevCount = plannerItems.filter(p => p.monthKey === prevKey).length;
        countEl.innerText = '';
        listEl.innerHTML = `
            <li class="py-4">
                <p class="text-sm text-slate-600 font-medium">Belum ada tagihan untuk periode ${formatPeriodName(periodKey)}.</p>
                ${prevCount > 0
                    ? `<button onclick="copyPlannerToCurrentPeriod()" class="mt-3 w-full bg-primary text-white font-bold py-3 rounded-xl text-sm">Salin ${prevCount} tagihan dari ${formatPeriodName(prevKey)}</button>`
                    : `<button onclick="switchTab('planner')" class="mt-3 w-full bg-primary text-white font-bold py-3 rounded-xl text-sm">Buat tagihan rutin</button>`}
            </li>`;
        moreEl.classList.add('hidden');
    } else if (unpaid.length === 0) {
        countEl.innerText = `${items.length} dari ${items.length} lunas`;
        listEl.innerHTML = `<li class="py-4 text-sm text-slate-600 font-medium">Semua tagihan periode ini sudah lunas. 🎉</li>`;
        moreEl.classList.add('hidden');
    } else {
        countEl.innerText = `${items.length - unpaid.length} dari ${items.length} lunas`;
        listEl.innerHTML = unpaid.slice(0, BERANDA_TAGIHAN_LIMIT).map(({ item, paid, sisa }) => `
            <li class="flex items-center gap-3 py-3">
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-slate-800 text-sm truncate">${item.name}</p>
                    <p class="text-xs text-slate-500 font-medium">${paid > 0 ? `Sudah ${formatRp(paid)} dari ${formatRp(item.amount)}` : (groupLabels[item.group] || item.category)}</p>
                </div>
                <span class="font-extrabold text-slate-800 text-sm">${formatRp(sisa)}</span>
                <button onclick="payPlannerItem('${item.id}')" class="${PAY_BTN_CLASS}">Bayar</button>
            </li>`).join('');
        const rest = unpaid.length - BERANDA_TAGIHAN_LIMIT;
        moreEl.classList.toggle('hidden', rest <= 0);
        moreEl.innerText = `Lihat ${rest} tagihan lainnya`;
    }

    document.getElementById('berandaPanduanBanner').classList.toggle('hidden', isPanduanSeen());
    renderBerandaWishlistTeaser();
}

// Teaser: 3 wishlist terdekat ke target (exclude yang sudah 100%)
function renderBerandaWishlistTeaser() {
    const teaser = document.getElementById('berandaWishlistTeaser');
    const list = document.getElementById('berandaWishlistList');
    if(!teaser || !list) return;

    const active = wishlist
        .map(w => ({ ...w, pct: w.targetAmount > 0 ? (w.currentAmount / w.targetAmount) * 100 : 0 }))
        .filter(w => w.pct < 100)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 3);

    if(active.length === 0) {
        teaser.classList.add('hidden');
        return;
    }
    teaser.classList.remove('hidden');

    list.innerHTML = active.map(w => {
        const pct = Math.min(100, Math.round(w.pct));
        const emoji = priorityMeta[w.priority]?.emoji || '⭐';
        return `
            <div class="flex items-center gap-3">
                <span class="text-lg flex-shrink-0">${emoji}</span>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-xs font-bold text-slate-700 truncate">${w.name}</span>
                        <span class="text-[10px] font-black text-slate-500 flex-shrink-0 ml-2">${pct}%</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-primary" style="width:${pct}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== WISHLIST ====================
const priorityMeta = {
    penting: { emoji: '⭐', label: 'Penting', color: 'rose', order: 0 },
    rencana: { emoji: '📌', label: 'Rencana', color: 'amber', order: 1 },
    impian:  { emoji: '💭', label: 'Impian',  color: 'violet', order: 2 },
};
const priorityOrder = ['penting', 'rencana', 'impian'];

window.openWishlistModal = function(id) {
    document.getElementById('formWishlist').reset();
    document.getElementById('wishlistId').value = '';
    document.getElementById('wishlistModalTitle').innerText = 'Tambah wishlist';

    if(id) {
        const w = wishlist.find(x => x.id === id);
        if(w) {
            document.getElementById('wishlistId').value = w.id;
            document.getElementById('wishlistName').value = w.name;
            document.getElementById('wishlistTarget').value = formatCurrencyValue(w.targetAmount);
            document.getElementById('wishlistCurrent').value = formatCurrencyValue(w.currentAmount);
            document.getElementById('wishlistNotes').value = w.notes || '';
            const radio = document.querySelector(`input[name="wishlistPriority"][value="${w.priority}"]`);
            if(radio) radio.checked = true;
            document.getElementById('wishlistModalTitle').innerText = 'Ubah wishlist';
        }
    }
    document.getElementById('modalWishlist').classList.remove('hidden');
};

window.closeWishlistModal = function() {
    document.getElementById('modalWishlist').classList.add('hidden');
};

document.getElementById('formWishlist')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('wishlistId').value;
    const name = document.getElementById('wishlistName').value.trim();
    const targetAmount = parseCurrencyValue(document.getElementById('wishlistTarget').value);
    const currentAmount = parseCurrencyValue(document.getElementById('wishlistCurrent').value);
    const notes = document.getElementById('wishlistNotes').value.trim();
    const priority = document.querySelector('input[name="wishlistPriority"]:checked')?.value || 'penting';
    const today = new Date().toISOString().slice(0, 10);

    if(targetAmount <= 0) {
        showToast('Target harus lebih dari Rp 0', true);
        return;
    }

    if(id) {
        const idx = wishlist.findIndex(w => w.id === id);
        if(idx > -1) {
            wishlist[idx] = { ...wishlist[idx], name, targetAmount, currentAmount, notes, priority, updatedDate: today };
        }
    } else {
        wishlist.push({
            id: 'wish_' + Date.now().toString(),
            name, targetAmount, currentAmount, notes, priority,
            createdDate: today, updatedDate: today
        });
    }

    saveDataToCloud().then((ok) => {
        closeWishlistModal();
        renderWishlist();
        if (ok) showToast('Wishlist tersimpan.');
    });
});

window.deleteWishlist = function(id) {
    const w = wishlist.find(x => x.id === id);
    deleteWithUndo(() => wishlist, id, `Wishlist "${w?.name || ''}"`, renderWishlist);
};

// Tambah dana ke wishlist
window.openWishlistFundModal = function(id) {
    const w = wishlist.find(x => x.id === id);
    if(!w) return;
    document.getElementById('formWishlistFund').reset();
    document.getElementById('wishlistFundId').value = id;
    document.getElementById('wishlistFundSubtitle').innerText = w.name;
    document.getElementById('modalWishlistFund').classList.remove('hidden');
    setTimeout(() => document.getElementById('wishlistFundAmount').focus(), 100);
};

window.closeWishlistFundModal = function() {
    document.getElementById('modalWishlistFund').classList.add('hidden');
};

document.getElementById('formWishlistFund')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('wishlistFundId').value;
    const amount = parseCurrencyValue(document.getElementById('wishlistFundAmount').value);
    const idx = wishlist.findIndex(w => w.id === id);
    if(idx > -1 && amount > 0) {
        wishlist[idx].currentAmount += amount;
        wishlist[idx].updatedDate = new Date().toISOString().slice(0, 10);
    }
    saveDataToCloud().then((ok) => {
        closeWishlistFundModal();
        renderWishlist();
        if (ok) showToast('Dana ditambahkan.');
    });
});

function renderWishlist() {
    const container = document.getElementById('wishlistContainer');
    const emptyEl = document.getElementById('wishlistEmpty');
    if(!container) return;

    // Summary
    const totalTarget = wishlist.reduce((s, w) => s + w.targetAmount, 0);
    const totalCollected = wishlist.reduce((s, w) => s + w.currentAmount, 0);
    document.getElementById('wishlistTotalTarget').innerText = formatRp(totalTarget);
    document.getElementById('wishlistTotalCollected').innerText = formatRp(totalCollected);

    if(wishlist.length === 0) {
        container.innerHTML = '';
        emptyEl.classList.remove('hidden');
        document.getElementById('wishlistSummary').classList.add('hidden');
        return;
    }
    emptyEl.classList.add('hidden');
    document.getElementById('wishlistSummary').classList.remove('hidden');

    const colorMap = {
        rose:   { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', bar: 'from-rose-400 to-rose-500', borderL: 'border-l-rose-300' },
        amber:  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', bar: 'from-amber-400 to-amber-500', borderL: 'border-l-amber-300' },
        violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', bar: 'from-violet-400 to-violet-500', borderL: 'border-l-violet-300' },
    };

    container.innerHTML = '';
    priorityOrder.forEach(prio => {
        const items = wishlist.filter(w => w.priority === prio);
        if(items.length === 0) return;

        const meta = priorityMeta[prio];
        const c = colorMap[meta.color];
        const reached = items.filter(w => w.currentAmount >= w.targetAmount).length;

        const section = document.createElement('div');
        section.className = 'space-y-3';
        section.innerHTML = `
            <div class="flex items-center gap-2 px-1">
                <span class="text-lg">${meta.emoji}</span>
                <h3 class="font-extrabold text-slate-800 text-base">${meta.label}</h3>
                <span class="text-[10px] font-bold ${c.text} ${c.bg} px-2 py-0.5 rounded-lg border ${c.border}">${reached}/${items.length} tercapai</span>
            </div>
        `;

        items.forEach(w => {
            const pct = w.targetAmount > 0 ? Math.min(100, Math.round((w.currentAmount / w.targetAmount) * 100)) : 0;
            const sisa = Math.max(0, w.targetAmount - w.currentAmount);
            const isDone = w.currentAmount >= w.targetAmount;

            const card = document.createElement('div');
            card.className = `glass-panel rounded-2xl p-4 md:p-5 ${isDone ? 'border-l-4 border-l-emerald-400' : `border-l-4 ${c.borderL}`}`;
            card.innerHTML = `
                <div class="flex items-start justify-between gap-2 mb-3">
                    <div class="min-w-0">
                        <h4 class="font-extrabold text-slate-800 text-sm md:text-base truncate">${w.name} ${isDone ? '✨' : ''}</h4>
                        ${w.notes ? `<p class="text-xs text-slate-500 font-medium truncate mt-0.5">${w.notes}</p>` : ''}
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button onclick="openWishlistModal('${w.id}')" aria-label="Ubah ${w.name}" class="w-11 h-11 flex items-center justify-center text-blue-600 active:bg-blue-50 rounded-lg" title="Ubah"><i class='bx bx-edit text-lg' aria-hidden="true"></i></button>
                        <button onclick="deleteWishlist('${w.id}')" aria-label="Hapus ${w.name}" class="w-11 h-11 flex items-center justify-center text-rose-600 active:bg-rose-50 rounded-lg" title="Hapus"><i class='bx bx-trash text-lg' aria-hidden="true"></i></button>
                    </div>
                </div>
                <div class="flex justify-between items-baseline mb-1.5">
                    <span class="text-xs font-bold text-slate-500">${formatRp(w.currentAmount)} <span class="text-slate-300">/</span> ${formatRp(w.targetAmount)}</span>
                    <span class="text-sm font-black ${isDone ? 'text-emerald-500' : 'text-slate-700'}">${pct}%</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-3">
                    <div class="h-full rounded-full ${isDone ? 'bg-emerald-400' : `bg-gradient-to-r ${c.bar}`}" style="width:${pct}%"></div>
                </div>
                <div class="flex items-center justify-between gap-2">
                    <span class="text-[11px] font-bold ${isDone ? 'text-emerald-600' : 'text-slate-500'}">${isDone ? '🎉 Target tercapai!' : `Kurang ${formatRp(sisa)}`}</span>
                    ${!isDone ? `<button onclick="openWishlistFundModal('${w.id}')" class="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[11px] font-bold active:scale-95 transition-transform">+ Tambah Dana</button>` : ''}
                </div>
            `;
            section.appendChild(card);
        });

        container.appendChild(section);
    });
}

// ==================== MONTHLY CLOSE & RIWAYAT BULANAN ====================
// Total satu periode gajian (lihat getPeriodKey). Satu-satunya sumber angka
// Masuk/Keluar/Nabung untuk Beranda, tutup buku, dan riwayat.
function computeMonthTotals(monthKey) {
    const inPeriod = (date) => date && getPeriodKey(date) === monthKey;
    let masuk = incomeEntries
        .filter(inc => inPeriod(inc.date))
        .reduce((s, inc) => s + inc.amount, 0);
    let keluar = 0, nabung = 0;
    expenses.forEach(ex => {
        if(!inPeriod(ex.date)) return;
        if(ex.type === 'tabungan') nabung += ex.amount;
        else if(ex.type === 'pemasukan') masuk += ex.amount; // pemasukan dari Input Manual
        else keluar += ex.amount;
    });
    return { masuk, keluar, nabung, sisa: masuk - keluar - nabung };
}

// Mulai tanggal gajian, tawarkan tutup buku untuk periode yang baru selesai.
function checkMonthClose() {
    const monthKey = prevPeriodKey(getPeriodKey(new Date()));
    // Sudah ditutup?
    if(monthlyHistory.some(m => m.monthKey === monthKey)) return;
    // Ada aktivitas di periode itu? (jangan prompt kalau kosong)
    const t = computeMonthTotals(monthKey);
    if(t.masuk === 0 && t.keluar === 0 && t.nabung === 0) return;
    openMonthCloseModal(monthKey);
}

let _monthCloseKey = null;
function openMonthCloseModal(monthKey) {
    _monthCloseKey = monthKey;
    const label = `${formatPeriodName(monthKey)} (${formatPeriodRange(monthKey)})`;
    const t = computeMonthTotals(monthKey);
    document.getElementById('monthCloseMonthLabel').innerText = label;
    document.getElementById('monthCloseMasuk').innerText = formatRp(t.masuk);
    document.getElementById('monthCloseKeluar').innerText = formatRp(t.keluar);
    document.getElementById('monthCloseNabung').innerText = formatRp(t.nabung);
    document.getElementById('monthCloseSisa').innerText = formatRp(t.sisa);
    document.getElementById('monthCloseWarn').classList.toggle('hidden', t.masuk > 0);
    document.getElementById('modalMonthClose').classList.remove('hidden');
}

window.closeMonthCloseModal = function() {
    document.getElementById('modalMonthClose').classList.add('hidden');
};

// Dari modal tutup buku: catat gaji yang lupa dicatat, bertanggal hari gajian
// periode itu, lalu tampilkan lagi modal tutup buku dengan angka terbaru.
let _reopenMonthCloseKey = null;
window.recordIncomeForClosingPeriod = function() {
    const key = _monthCloseKey;
    const start = periodKeyToDate(key);
    const payday = new Date(start.getFullYear(), start.getMonth() - 1, PAYDAY);
    _reopenMonthCloseKey = key;
    closeMonthCloseModal();
    openIncomeModal(`${payday.getFullYear()}-${String(payday.getMonth()+1).padStart(2,'0')}-${String(payday.getDate()).padStart(2,'0')}`);
};

window.confirmMonthClose = function() {
    if(!_monthCloseKey) return;
    const t = computeMonthTotals(_monthCloseKey);
    const label = formatPeriodName(_monthCloseKey);

    // Simpan snapshot ke riwayat. Pemasukan TIDAK dihapus: semua hitungan sudah
    // dipisah per periode, jadi periode baru otomatis mulai dari Rp 0.
    monthlyHistory.push({
        id: 'month_' + _monthCloseKey,
        monthKey: _monthCloseKey,
        label: label,
        pemasukan: t.masuk,
        pengeluaran: t.keluar,
        tabungan: t.nabung,
        sisa: t.sisa,
        closedDate: new Date().toISOString().slice(0, 10)
    });

    saveDataToCloud().then((ok) => {
        closeMonthCloseModal();
        renderBeranda();
        if (ok) showToast(`Buku ${label} ditutup.`);
        _monthCloseKey = null;
    });
};

let monthHistoryChartIns;
function renderMonthHistory() {
    const listEl = document.getElementById('monthHistoryList');
    const emptyEl = document.getElementById('monthHistoryEmpty');
    if(!listEl) return;

    const sorted = [...monthlyHistory].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    const totalSaved = monthlyHistory.reduce((s, m) => s + m.sisa, 0);
    const totalEl = document.getElementById('monthHistoryTotal');
    totalEl.innerText = formatRp(totalSaved);
    // Hijau hanya kalau memang surplus; minus = merah.
    totalEl.className = `text-2xl md:text-3xl font-extrabold tracking-tight ${totalSaved < 0 ? 'text-rose-600' : 'text-emerald-700'}`;

    if(monthlyHistory.length === 0) {
        listEl.innerHTML = '';
        emptyEl.classList.remove('hidden');
        if(monthHistoryChartIns) { monthHistoryChartIns.destroy(); monthHistoryChartIns = null; }
        return;
    }
    emptyEl.classList.add('hidden');

    // Chart (7 bulan terakhir)
    const recent = sorted.slice(-7);
    const ctx = document.getElementById('monthHistoryChart').getContext('2d');
    if(monthHistoryChartIns) monthHistoryChartIns.destroy();
    monthHistoryChartIns = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: recent.map(m => m.label.split(' ')[0].slice(0, 3)),
            datasets: [{
                label: 'Sisa', data: recent.map(m => m.sisa),
                backgroundColor: recent.map(m => m.sisa < 0 ? '#e11d48' : '#059669'), borderRadius: 6
            }]
        },
        plugins: [barValueLabels],
        options: {
            responsive: true, maintainAspectRatio: false,
            // ruang untuk label nilai di atas batang plus & di bawah batang minus
            layout: { padding: { top: 22, bottom: 4 } },
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => formatRp(c.raw) } } },
            scales: {
                y: { beginAtZero: true, grace: '12%', grid: zeroLineGrid, border: { display: false }, ticks: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });
    document.getElementById('monthHistoryChart').setAttribute('aria-label',
        `Sisa tiap periode: ${recent.map(m => `${m.label} ${formatRp(m.sisa)}`).join(', ')}`);

    // Detail list (terbaru dulu)
    listEl.innerHTML = [...sorted].reverse().map(m => `
        <div class="glass-panel rounded-2xl p-5">
            <div class="flex items-center justify-between mb-3">
                <div>
                    <h4 class="font-extrabold text-slate-800 text-base">${m.label}</h4>
                    <p class="text-xs text-slate-500 font-semibold mt-0.5">Ditutup ${new Date(m.closedDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div class="text-right">
                    <p class="text-xs font-semibold text-slate-500">Sisa</p>
                    <p class="text-lg font-extrabold ${m.sisa < 0 ? 'text-rose-600' : 'text-emerald-700'}">${formatRp(m.sisa)}</p>
                </div>
            </div>
            <dl class="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                <div><dt class="text-xs font-semibold text-slate-500">Masuk</dt><dd class="text-sm font-bold text-slate-800 mt-0.5">${formatRp(m.pemasukan)}</dd></div>
                <div><dt class="text-xs font-semibold text-slate-500">Keluar</dt><dd class="text-sm font-bold text-slate-800 mt-0.5">${formatRp(m.pengeluaran)}</dd></div>
                <div><dt class="text-xs font-semibold text-slate-500">Nabung</dt><dd class="text-sm font-bold text-slate-800 mt-0.5">${formatRp(m.tabungan)}</dd></div>
            </dl>
        </div>
    `).join('');
}

// --- Dashboard & Charts Logic ---
Chart.defaults.color = '#64748b';
Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

// "Rp 9,3 jt" / "Rp 350 rb" — ringkas untuk label grafik di layar HP.
function formatRpShort(n) {
    const a = Math.abs(n), s = n < 0 ? '−' : '';
    if (a >= 1e6) return `${s}Rp ${(a / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
    if (a >= 1e3) return `${s}Rp ${Math.round(a / 1e3).toLocaleString('id-ID')} rb`;
    return `${s}Rp ${a}`;
}

// Tulis nilai langsung di ujung tiap batang (di bawah batang kalau minus),
// supaya angka terbaca tanpa tap tooltip dan tanpa sumbu Y.
const barValueLabels = {
    id: 'barValueLabels',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const values = chart.data.datasets[0].data;
        ctx.save();
        ctx.font = "700 11px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = Chart.defaults.color;
        ctx.textAlign = 'center';
        chart.getDatasetMeta(0).data.forEach((bar, i) => {
            const v = values[i];
            if (!v) return;
            ctx.textBaseline = v < 0 ? 'top' : 'bottom';
            ctx.fillText(formatRpShort(v), bar.x, v < 0 ? bar.y + 4 : bar.y - 4);
        });
        ctx.restore();
    }
};

// Garis nol dipertegas: batas surplus vs minus harus terlihat jelas.
const zeroLineGrid = {
    color: (c) => c.tick && c.tick.value === 0 ? (document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b') : Chart.defaults.borderColor,
    lineWidth: (c) => c.tick && c.tick.value === 0 ? 1.5 : 1,
};

let catChartIns, compChartIns, weekChartIns;

function renderMonthly() {
    // Periode gajian (25–24), sama dengan Beranda & Riwayat Bulanan.
    const thisKey = getPeriodKey(new Date());
    const lastKey = prevPeriodKey(thisKey);
    document.getElementById('moPeriodLabel').innerText = `Periode ${formatPeriodName(thisKey)}, ${formatPeriodRange(thisKey)}.`;

    let totalThisM = 0;
    let totalLastM = 0;
    let sumDarurat = 0;
    let sumLiburan = 0;

    const catAgg = {};

    expenses.forEach(ex => {
        if(!ex.date) return;
        const key = getPeriodKey(ex.date);
        const amt = ex.amount;
        const isTabungan = ex.type === 'tabungan';

        if(isTabungan && ex.category === 'Dana Darurat') sumDarurat += amt;
        if(isTabungan && ex.category === 'Tabungan Liburan') sumLiburan += amt;

        // Total Pengeluaran HANYA menjumlah jenis "pengeluaran" — tabungan & pemasukan tidak dihitung.
        if(ex.type !== 'pengeluaran') return;

        if(key === thisKey) {
            totalThisM += amt;
            catAgg[ex.category] = (catAgg[ex.category] || 0) + amt;
        }

        if(key === lastKey) {
            totalLastM += amt;
        }
    });

    document.getElementById('moTotalExpense').innerText = formatRp(totalThisM);
    document.getElementById('moDanaDarurat').innerText = formatRp(sumDarurat);
    document.getElementById('moLiburan').innerText = formatRp(sumLiburan);
    document.getElementById('moLastMonth').innerText = formatRp(totalLastM);
    // Rp 0 tanpa penjelasan dilarang (DESIGN_BRIEF) — beri keterangan.
    document.getElementById('moDanaDaruratNote').classList.toggle('hidden', sumDarurat > 0);
    document.getElementById('moLiburanNote').classList.toggle('hidden', sumLiburan > 0);

    const trendBadge = document.getElementById('trendBadge');
    if(totalLastM === 0) {
        trendBadge.innerText = 'Belum ada data';
        trendBadge.className = 'text-xs font-bold bg-slate-100 border border-slate-200 text-slate-500 px-2 py-1 rounded-md';
    } else {
        const diff = totalThisM - totalLastM;
        const pct = Math.abs((diff / totalLastM) * 100).toFixed(1);
        if(diff > 0) {
            trendBadge.className = 'text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700 px-2 py-1 rounded-md';
            trendBadge.innerHTML = `<i class='bx bx-trending-up' aria-hidden="true"></i> Naik ${pct}%`;
        } else {
            trendBadge.className = 'text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-1 rounded-md';
            trendBadge.innerHTML = `<i class='bx bx-trending-down' aria-hidden="true"></i> Turun ${pct}%`;
        }
    }

    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    if(catChartIns) { catChartIns.destroy(); catChartIns = null; }
    
    // Urut terbesar dulu: irisan terbesar mulai dari jam 12 (ui-ux-pro-max: chart › Part-to-Whole).
    const catEntries = Object.entries(catAgg).sort((a, b) => b[1] - a[1]);
    const catLabels = catEntries.map(e => e[0]);
    const catData = catEntries.map(e => e[1]);
    // Warna tetap per kategori (bukan per urutan), sama dengan chip di Riwayat.
    const catBg = catLabels.map(c => CATEGORY_CHART_COLORS[c] || CATEGORY_CHART_COLORS['Lainnya']);

    // Grafik kosong dilarang (DESIGN_BRIEF) — tampilkan keterangan.
    document.getElementById('categoryChart').classList.toggle('hidden', catData.length === 0);
    document.getElementById('categoryEmpty').classList.toggle('hidden', catData.length > 0);
    if(catData.length > 0) {
        catChartIns = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: catLabels,
                datasets: [{ data: catData, backgroundColor: catBg, borderWidth: 0 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '70%',
                plugins: {
                    legend: { display: false }, // diganti daftar berlabel di bawah grafik
                    tooltip: { callbacks: { label: (c) => ` ${c.label}: ${formatRp(c.raw)}` } }
                }
            }
        });
    }

    // Label langsung: nama, nominal, dan persentase tiap kategori (terbesar dulu).
    const catTotal = catData.reduce((s, v) => s + v, 0);
    const catRows = catLabels.map((c, i) => ({ c, v: catData[i], color: catBg[i] })).sort((a, b) => b.v - a.v);
    document.getElementById('categoryList').innerHTML = catRows.map(r => `
        <li class="flex items-center gap-3 py-2.5">
            <span class="w-3 h-3 rounded-full flex-shrink-0" style="background:${r.color}" aria-hidden="true"></span>
            <span class="flex-1 text-sm font-semibold text-slate-700">${r.c}</span>
            <span class="text-sm font-bold text-slate-800">${formatRp(r.v)}</span>
            <span class="w-12 text-right text-xs font-semibold text-slate-500">${Math.round(r.v / catTotal * 100)}%</span>
        </li>`).join('');
    document.getElementById('categoryChart').setAttribute('aria-label',
        catRows.length ? `Pengeluaran per kategori: ${catRows.map(r => `${r.c} ${formatRp(r.v)}`).join(', ')}` : 'Belum ada pengeluaran');

    const ctxComp = document.getElementById('comparisonChart').getContext('2d');
    if(compChartIns) compChartIns.destroy();

    const monthOnly = (k) => periodKeyToDate(k).toLocaleDateString('id-ID', { month: 'long' });
    compChartIns = new Chart(ctxComp, {
        type: 'bar',
        data: {
            labels: [monthOnly(lastKey), `${monthOnly(thisKey)} (sekarang)`],
            datasets: [{
                label: 'Total Pengeluaran',
                data: [totalLastM, totalThisM],
                backgroundColor: ['#94a3b8', '#2563eb'],
                borderRadius: 6
            }]
        },
        plugins: [barValueLabels],
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 22 } },
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => formatRp(c.raw) } } },
            scales: {
                y: { beginAtZero: true, grid: { display: false }, border: { display: false }, ticks: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });
    document.getElementById('comparisonChart').setAttribute('aria-label',
        `Total pengeluaran ${monthOnly(lastKey)} ${formatRp(totalLastM)}, ${monthOnly(thisKey)} ${formatRp(totalThisM)}`);
}

function renderWeekly() {
    const now = new Date();
    const day = now.getDay() || 7; 
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - day + 1);
    weekStart.setHours(0,0,0,0);

    let totalWeek = 0;
    const dailySums = [0,0,0,0,0,0,0];
    const catSums = {};
    const catItems = {}; // transaksi per kategori, supaya keterangan (deskripsi) ikut tampil

    expenses.forEach(ex => {
        if(ex.type !== 'pengeluaran') return; // Weekly tracking hanya untuk pengeluaran
        const d = new Date(ex.date + 'T00:00:00'); // tanggal lokal, bukan UTC
        if(d >= weekStart && d <= now) {
            const amt = ex.amount;
            totalWeek += amt;

            let dIdx = d.getDay() || 7;
            dailySums[dIdx - 1] += amt;

            catSums[ex.category] = (catSums[ex.category] || 0) + amt;
            (catItems[ex.category] ||= []).push(ex);
        }
    });

    document.getElementById('wkTotal').innerText = formatRp(totalWeek);
    // Grafik kosong dilarang (DESIGN_BRIEF) — ganti dengan keterangan + ajakan.
    document.getElementById('weeklyChartWrap').classList.toggle('hidden', totalWeek === 0);
    document.getElementById('weeklyEmpty').classList.toggle('hidden', totalWeek > 0);

    const ctxWk = document.getElementById('weeklyChart').getContext('2d');
    if(weekChartIns) weekChartIns.destroy();

    weekChartIns = new Chart(ctxWk, {
        type: 'bar', 
        data: {
            labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
            datasets: [{
                label: 'Pengeluaran',
                data: dailySums,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => formatRp(c.raw) } } },
            scales: {
                y: { beginAtZero: true, grid: { color: Chart.defaults.borderColor }, ticks: { maxTicksLimit: 5, callback: (v) => formatRpShort(v) } },
                x: { grid: { display: false } }
            }
        }
    });
    const hari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    document.getElementById('weeklyChart').setAttribute('aria-label',
        `Pengeluaran per hari minggu ini: ${dailySums.map((v, i) => `${hari[i]} ${formatRp(v)}`).join(', ')}`);

    // Teks dari user (keterangan) di-escape sebelum masuk innerHTML.
    const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const listHtml = Object.entries(catSums).sort((a,b)=>b[1]-a[1]).map(([cat, amt]) => {
        const colorClass = catColors[cat] || catColors['Lainnya'];
        // Rincian per transaksi: keterangan dari Input manual / nama tagihan Planner, tanggal, nominal.
        const rows = catItems[cat]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map(ex => {
                const desc = (ex.desc && ex.desc !== '-') ? ex.desc.replace(/^\[Planner\]\s*/, '') : 'belum diisi keterangan';
                const tgl = new Date(ex.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                return `
                    <li class="flex items-start justify-between gap-3 py-2">
                        <div class="min-w-0">
                            <p class="text-sm font-semibold text-slate-800 break-words">${esc(desc)}</p>
                            <p class="text-xs text-slate-500 font-medium">${tgl}${ex.plannerRef ? ' · dari Planner' : ''}</p>
                        </div>
                        <span class="text-sm font-bold text-slate-700 flex-shrink-0">${formatRp(ex.amount)}</span>
                    </li>`;
            }).join('');
        return `
            <div class="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div class="flex justify-between items-center">
                    <span class="px-3 py-1.5 text-sm font-bold rounded-lg border ${colorClass}">${cat}</span>
                    <span class="font-black text-slate-800">${formatRp(amt)}</span>
                </div>
                <ul class="mt-2 divide-y divide-slate-100">${rows}</ul>
            </div>
        `;
    }).join('');
    
    document.getElementById('weeklyCategoryList').innerHTML = listHtml || '<p class="text-slate-500 text-sm font-medium italic">Belum ada pengeluaran minggu ini.</p>';
}

// --- Export CSV ---
window.exportCSV = function() {
    if(expenses.length === 0) {
        showToast('Tidak ada data untuk diexport!', true);
        return;
    }
    
    const headers = ['Tanggal', 'Kategori', 'Nominal', 'Deskripsi'];
    const rows = expenses.map(ex => [
        ex.date,
        `"${ex.category}"`,
        ex.amount,
        `"${ex.desc.replace(/"/g, '""')}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Keuangan_Rahma_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- Clear All Data ---
window.clearAllExpenses = function() {
    if(expenses.length === 0) {
        showToast('Tidak ada data untuk dihapus!', true);
        return;
    }
    showConfirm({
        title: 'Hapus semua transaksi',
        message: 'Semua riwayat transaksi (termasuk pembayaran dari Planner) akan dihapus secara permanen. Aksi ini TIDAK bisa dibatalkan.',
        okLabel: 'Ya, hapus semua',
        okClass: 'bg-red-600 hover:bg-red-700',
        iconClass: 'bx bx-error-circle',
        iconBg: 'bg-red-500/20 text-red-400'
    }, (confirmed) => {
        if(!confirmed) return;
        expenses = [];
        saveDataToCloud().then((ok) => {
            renderHistory();
            if (ok) showToast('Semua transaksi dihapus.');
        });
    });
};

// --- Planner Preview Sheet ---
window.openPlannerPreview = function() {
    const monthKey = getPlannerMonthKey(plannerViewingDate);
    document.getElementById('previewMonthLabel').textContent = `${formatPeriodName(monthKey)}, ${formatPeriodRange(monthKey)}`;

    let totalEstimasi = 0, totalDibayar = 0, lunasCount = 0, belumCount = 0;

    const groupedItems = {};
    plannerItems.forEach(item => {
        if (item.monthKey !== monthKey) return;
        if(!groupedItems[item.group]) groupedItems[item.group] = [];
        groupedItems[item.group].push(item);
    });

    const listEl = document.getElementById('previewItemList');
    listEl.innerHTML = '';

    const groupsToRender = [...groupOrder];
    Object.keys(groupedItems).forEach(g => { if(!groupsToRender.includes(g)) groupsToRender.push(g); });

    groupsToRender.forEach(groupName => {
        if(!groupedItems[groupName] || groupedItems[groupName].length === 0) return;

        const groupHeader = document.createElement('h4');
        groupHeader.className = 'text-xs font-bold text-slate-500 mt-3 mb-1 px-1';
        groupHeader.textContent = groupLabels[groupName] || groupName;
        listEl.appendChild(groupHeader);

        groupedItems[groupName].forEach(item => {
            totalEstimasi += item.amount;
            const amountPaid = getPlannerPaid(item);
            totalDibayar += amountPaid;
            const sisa = item.amount - amountPaid;
            const isLunas = sisa <= 0;
            isLunas ? lunasCount++ : belumCount++;

            const row = document.createElement('div');
            row.className = `flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl ${isLunas ? 'bg-emerald-50 border border-emerald-100' : 'bg-white border border-slate-200 shadow-sm'}`;
            row.innerHTML = `
                <div class="flex items-center gap-2 min-w-0">
                    <i class='bx ${isLunas ? 'bx-check-circle text-emerald-600' : 'bx-circle text-slate-500'} text-lg flex-shrink-0' aria-hidden="true"></i>
                    <span class="text-sm font-semibold text-slate-800 truncate">${item.name}</span>
                </div>
                <div class="text-right flex-shrink-0">
                    <p class="text-sm font-extrabold ${isLunas ? 'text-emerald-700' : 'text-slate-800'}">${isLunas ? 'Lunas' : formatRp(sisa)}</p>
                    <p class="text-xs text-slate-500 font-semibold">dari ${formatRp(item.amount)}</p>
                </div>
            `;
            listEl.appendChild(row);
        });
    });

    const pct = totalEstimasi > 0 ? Math.round((totalDibayar / totalEstimasi) * 100) : 0;
    document.getElementById('pvTotalEstimasi').textContent = formatRp(totalEstimasi);
    document.getElementById('pvLunas').textContent = `${lunasCount} item`;
    document.getElementById('pvBelum').textContent = `${belumCount} item`;
    document.getElementById('pvPercent').textContent = `${pct}%`;
    document.getElementById('pvProgressBar').style.width = `${pct}%`;

    const modal = document.getElementById('modalPlannerPreview');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closePlannerPreview = function() {
    const modal = document.getElementById('modalPlannerPreview');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

// Close preview when clicking backdrop
document.getElementById('modalPlannerPreview').addEventListener('click', (e) => {
    if(e.target === e.currentTarget) closePlannerPreview();
});

// Close confirm when clicking backdrop
document.getElementById('modalConfirm').addEventListener('click', (e) => {
    if(e.target === e.currentTarget) closeConfirm(false);
});

// --- Initial Load Logic ---
window.addEventListener('DOMContentLoaded', async () => {
    applyChartTheme();
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', document.documentElement.classList.contains('dark') ? '#0f172a' : '#f8fafc');

    toggleLoader(true, 'Menyiapkan data...');

    try {
        const res = await fetch('/api/data', {
            method: 'GET'
        });

        if (!res.ok) {
            showToast('Data gagal dimuat dari server. Muat ulang halaman sebentar lagi.', true);
        } else {
            // Berhasil
            const data = await res.json();
            
            expenses = data.expenses || [];
            plannerItems = data.plannerItems || [];
            incomeEntries = data.incomeEntries || [];
            wishlist = data.wishlist || [];
            monthlyHistory = data.monthlyHistory || [];
            dataLoaded = true; // baru sekarang aman menyimpan ke cloud

            // MIGRATION: Auto-assign existing items without monthKey to current active month
            let needsMigration = false;
            const currentMonthKey = getPeriodKey(new Date());
            plannerItems.forEach(item => {
                if (!item.monthKey) {
                    item.monthKey = currentMonthKey;
                    needsMigration = true;
                }
            });

            // MIGRATION: normalize old expenses to the new type/category model.
            // - Dana Darurat / Tabungan Liburan -> type: tabungan
            // - Kategori pengeluaran lama (Installment/Bills/Groceries/dst) -> diterjemahkan
            // - Kategori tak dikenal -> type: pengeluaran, kategori "Lainnya"
            const remapReport = [];
            expenses.forEach(ex => {
                if (ex.type === 'pengeluaran' || ex.type === 'tabungan') return; // sudah dalam format baru

                const oldCategory = ex.category;
                let newType, newCategory;

                if (oldCategory === 'Dana Darurat' || oldCategory === 'Tabungan Liburan') {
                    newType = 'tabungan';
                    newCategory = oldCategory;
                } else if (legacyCategoryMap[oldCategory]) {
                    newType = 'pengeluaran';
                    newCategory = legacyCategoryMap[oldCategory];
                } else {
                    newType = 'pengeluaran';
                    newCategory = 'Lainnya';
                }

                if (newType !== ex.type || newCategory !== oldCategory) {
                    remapReport.push({
                        id: ex.id,
                        desc: ex.desc,
                        kategoriLama: oldCategory,
                        kategoriBaru: newCategory,
                        jenisBaru: newType
                    });
                }

                ex.type = newType;
                ex.category = newCategory;
                needsMigration = true;
            });

            if (remapReport.length > 0) {
                console.log(`Migrasi kategori: ${remapReport.length} transaksi dipetakan ulang.`);
                console.table(remapReport);
                showToast(`${remapReport.length} transaksi lama dipetakan ke kategori baru (lihat console).`, false);
            }

            if (needsMigration) {
                await saveDataToCloud();
            }
            
            // MIGRATION LOGIC: Check if Upstash is empty but localStorage has old data
            if (expenses.length === 0 && plannerItems.length === 0) {
                const localExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
                const localPlanner = JSON.parse(localStorage.getItem('plannerItems') || '[]');
                
                if (localExpenses.length > 0 || localPlanner.length > 0) {
                    console.log('Migrating old localStorage data to Upstash...');
                    expenses = localExpenses;
                    plannerItems = localPlanner.length > 0 ? localPlanner : [...defaultPlannerTemplate];
                    
                    // Upload to Upstash
                    await saveDataToCloud();
                    
                    // Optional: clear localStorage after successful migration
                    // localStorage.removeItem('expenses');
                    // localStorage.removeItem('plannerItems');
                    showToast('Data lama berhasil dipindahkan ke Cloud!', false);
                } else {
                    // Completely empty (first time ever), init with templates
                    plannerItems = [...defaultPlannerTemplate];
                    await saveDataToCloud();
                }
            }

            setQuickDate(0);
            switchTab('beranda');

            // Cek tutup buku bulanan (tanggal >= 26 & belum ditutup)
            checkMonthClose();
        }
    } catch(err) {
        console.error(err);
        showToast(dataLoaded ? 'Terjadi kesalahan saat menampilkan data. Muat ulang halaman.' : 'Tidak bisa terhubung. Cek internet, lalu muat ulang halaman.', true);
    } finally {
        toggleLoader(false);
    }
});
