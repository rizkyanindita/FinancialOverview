// --- Utils & State ---
let expenses = [];
let plannerItems = [];

const defaultPlannerTemplate = [
    { id: '1', group: 'INSTALLMENT', category: 'Installment', name: 'Quota suami', amount: 50000 },
    { id: '2', group: 'INSTALLMENT', category: 'Installment', name: 'Quota istri', amount: 40000 },
    { id: '3', group: 'BILLS', category: 'Bills', name: 'PDAM', amount: 9000 },
    { id: '4', group: 'BILLS', category: 'Bills', name: 'PLN', amount: 182000 },
    { id: '5', group: 'BILLS', category: 'Bills', name: 'Wi-fi', amount: 235000 },
    { id: '6', group: 'KEBUTUHAN', category: 'Kebutuhan', name: 'Gas lpg', amount: 20000 },
    { id: '7', group: 'KEBUTUHAN', category: 'Kebutuhan', name: 'bensin', amount: 150000 },
    { id: '8', group: 'KEBUTUHAN', category: 'Kebutuhan', name: 'Laundry', amount: 80000 },
    { id: '9', group: 'KEBUTUHAN', category: 'Kebutuhan', name: 'sangu suami', amount: 980000 },
    { id: '10', group: 'KEBUTUHAN', category: 'Kebutuhan', name: 'Pasar', amount: 870000 },
    { id: '11', group: 'GROCERIES', category: 'Groceries', name: 'Beras', amount: 60000 },
    { id: '12', group: 'GROCERIES', category: 'Groceries', name: 'Galon', amount: 77500 },
    { id: '13', group: 'GROCERIES', category: 'Groceries', name: 'skincare', amount: 250000 },
    { id: '14', group: 'GROCERIES', category: 'Groceries', name: 'Kado dek tata', amount: 800000 },
    { id: '15', group: 'GROCERIES', category: 'Groceries', name: 'Tol+bensin jkt', amount: 1100000 },
    { id: '16', group: 'GROCERIES', category: 'Groceries', name: 'Tiket kereta adek', amount: 355000 }
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
const saveDataToCloud = async () => {
    toggleLoader(true, 'Menyimpan ke Cloud...');
    try {
        const res = await fetch('/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ expenses, plannerItems })
        });
        if(!res.ok) throw new Error('Failed to save to cloud');
    } catch (e) {
        console.error(e);
        showToast('Gagal sinkronisasi ke Cloud!', true);
    } finally {
        toggleLoader(false);
    }
};

const formatRp = (amount) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const showToast = (msg, isError = false) => {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const icon = toast.querySelector('i');
    
    if(isError) {
        toast.className = toast.className.replace('bg-emerald-600 shadow-emerald-900/20', 'bg-red-600 shadow-red-900/20');
        icon.className = 'bx bx-error-circle text-xl';
    } else {
        toast.className = toast.className.replace('bg-red-600 shadow-red-900/20', 'bg-emerald-600 shadow-emerald-900/20');
        icon.className = 'bx bx-check-circle text-xl';
    }
    toastMsg.textContent = msg;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
};

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
window.switchTab = function(tabId) {
    document.querySelectorAll('.nav-btn, .nav-btn-m').forEach(btn => {
        btn.classList.remove('bg-gray-800', 'text-blue-400');
        btn.classList.add('text-gray-400');
    });
    
    // desktop
    const activeBtn = document.getElementById(`nav-${tabId}`);
    if(activeBtn) {
        activeBtn.classList.remove('text-gray-400');
        activeBtn.classList.add('bg-gray-800', 'text-blue-400');
    }
    
    // mobile
    const mActiveBtn = document.getElementById(`nav-${tabId}-m`);
    if(mActiveBtn) {
        mActiveBtn.classList.remove('text-gray-400');
        mActiveBtn.classList.add('text-blue-400');
    }

    document.querySelectorAll('.tab-content').forEach(sec => sec.classList.add('hide'));
    document.getElementById(`tab-${tabId}`).classList.remove('hide');

    if(tabId === 'monthly') renderMonthly();
    if(tabId === 'weekly') renderWeekly();
    if(tabId === 'history') renderHistory();
    if(tabId === 'planner') renderPlanner();
};

// --- Planner Data Structure & Logic ---
let plannerViewingDate = new Date(); 

function getPlannerMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

window.changePlannerMonth = function(delta) {
    plannerViewingDate.setMonth(plannerViewingDate.getMonth() + delta);
    renderPlanner();
};

const groupOrder = ['INSTALLMENT', 'BILLS', 'KEBUTUHAN', 'GROCERIES', 'LAINNYA'];

function renderPlanner() {
    const monthKey = getPlannerMonthKey(plannerViewingDate);
    const monthName = plannerViewingDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    document.getElementById('plannerCurrentMonthStr').innerText = monthName;

    const tbody = document.getElementById('plannerTableBody');
    const cardContainer = document.getElementById('plannerCardContainer');
    tbody.innerHTML = '';
    cardContainer.innerHTML = '';
    
    let totalEstimasi = 0;
    let totalDibayar = 0;

    const groupedItems = {};
    plannerItems.forEach(item => {
        if(!groupedItems[item.group]) groupedItems[item.group] = [];
        groupedItems[item.group].push(item);
    });

    const groupsToRender = [...groupOrder];
    Object.keys(groupedItems).forEach(g => {
        if(!groupsToRender.includes(g)) groupsToRender.push(g);
    });

    groupsToRender.forEach(groupName => {
        if(!groupedItems[groupName] || groupedItems[groupName].length === 0) return;

        // === Desktop: Table Row Header ===
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <td colspan="5" class="p-3 bg-blue-500/20 text-blue-400 font-bold uppercase text-center tracking-wider text-sm border-y border-blue-500/30">${groupName}</td>
        `;
        tbody.appendChild(headerRow);

        // === Mobile: Group Header Card ===
        const mGroupHeader = document.createElement('div');
        mGroupHeader.className = 'bg-blue-500/20 text-blue-400 font-bold uppercase text-center tracking-wider text-xs py-2 px-4 rounded-xl border border-blue-500/30';
        mGroupHeader.innerText = groupName;
        cardContainer.appendChild(mGroupHeader);

        groupedItems[groupName].forEach(item => {
            totalEstimasi += item.amount;
            
            const amountPaid = expenses
                .filter(ex => ex.plannerRef === item.id && ex.date.startsWith(monthKey))
                .reduce((sum, ex) => sum + ex.amount, 0);

            totalDibayar += amountPaid;
            const sisa = item.amount - amountPaid;
            const isLunas = sisa <= 0;

            // === Desktop: Table Row ===
            const tr = document.createElement('tr');
            if(isLunas) tr.classList.add('bg-emerald-900/10');
            tr.innerHTML = `
                <td class="p-3 text-gray-200">${item.name}</td>
                <td class="p-3 font-medium text-gray-400">${formatRp(item.amount)}</td>
                <td class="p-3 font-semibold text-emerald-400">${formatRp(amountPaid)}</td>
                <td class="p-3 font-bold ${isLunas ? 'text-gray-500' : 'text-red-400'}">${formatRp(Math.max(0, sisa))}</td>
                <td class="p-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                        ${!isLunas ? `<button onclick="openPayModal('${item.id}', '${item.category}', '${item.name}', ${sisa}, '${monthKey}')" class="px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-md text-xs font-semibold transition-colors">Bayar</button>` : `<span class="text-xs font-bold text-emerald-500 px-3 py-1">LUNAS</span>`}
                        <button onclick="editPlannerItem('${item.id}')" class="p-1.5 text-blue-400 hover:bg-gray-800 rounded-md transition-colors" title="Edit"><i class='bx bx-edit'></i></button>
                        <button onclick="deletePlannerItem('${item.id}')" class="p-1.5 text-red-400 hover:bg-gray-800 rounded-md transition-colors" title="Hapus"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);

            // === Mobile: Item Card ===
            const card = document.createElement('div');
            card.className = `glass-panel rounded-xl p-4 space-y-3 ${isLunas ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-gray-700'}`;
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <h4 class="font-semibold text-gray-100 text-sm">${item.name}</h4>
                    <div class="flex items-center gap-1">
                        <button onclick="editPlannerItem('${item.id}')" class="p-1.5 text-blue-400 hover:bg-gray-800 rounded-md transition-colors"><i class='bx bx-edit text-base'></i></button>
                        <button onclick="deletePlannerItem('${item.id}')" class="p-1.5 text-red-400 hover:bg-gray-800 rounded-md transition-colors"><i class='bx bx-trash text-base'></i></button>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2 text-center">
                    <div class="bg-gray-900/60 rounded-lg p-2">
                        <p class="text-[9px] text-gray-500 uppercase tracking-wide">Estimasi</p>
                        <p class="text-xs font-semibold text-gray-300 mt-0.5">${formatRp(item.amount)}</p>
                    </div>
                    <div class="bg-gray-900/60 rounded-lg p-2">
                        <p class="text-[9px] text-emerald-500 uppercase tracking-wide">Dibayar</p>
                        <p class="text-xs font-semibold text-emerald-400 mt-0.5">${formatRp(amountPaid)}</p>
                    </div>
                    <div class="bg-gray-900/60 rounded-lg p-2">
                        <p class="text-[9px] ${isLunas ? 'text-gray-500' : 'text-red-500'} uppercase tracking-wide">Sisa</p>
                        <p class="text-xs font-bold ${isLunas ? 'text-gray-500' : 'text-red-400'} mt-0.5">${formatRp(Math.max(0, sisa))}</p>
                    </div>
                </div>
                <div class="pt-1">
                    ${!isLunas 
                        ? `<button onclick="openPayModal('${item.id}', '${item.category}', '${item.name}', ${sisa}, '${monthKey}')" class="w-full py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold transition-colors">💰 Bayar</button>` 
                        : `<div class="w-full py-2 bg-emerald-900/20 text-emerald-500 rounded-lg text-xs font-bold text-center">✅ LUNAS</div>`}
                </div>
            `;
            cardContainer.appendChild(card);
        });
    });

    // Desktop summary
    document.getElementById('plannerTotalEstimasi').innerText = formatRp(totalEstimasi);
    document.getElementById('plannerTotalDibayar').innerText = formatRp(totalDibayar);
    document.getElementById('plannerSisa').innerText = formatRp(totalEstimasi - totalDibayar);
    // Mobile summary
    document.getElementById('plannerTotalEstimasiM').innerText = formatRp(totalEstimasi);
    document.getElementById('plannerTotalDibayarM').innerText = formatRp(totalDibayar);
    document.getElementById('plannerSisaM').innerText = formatRp(totalEstimasi - totalDibayar);
}

// --- Modals Planner CRUD ---
window.openPlannerModal = function() {
    document.getElementById('formPlannerCrud').reset();
    document.getElementById('crudPlannerId').value = '';
    document.getElementById('modalPlannerCrudTitle').innerText = 'Tambah Tagihan Rutin';
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
        document.getElementById('crudPlannerAmount').value = item.amount;
        document.getElementById('modalPlannerCrudTitle').innerText = 'Edit Tagihan Rutin';
        document.getElementById('modalPlannerCrud').classList.remove('hidden');
    }
};

window.deletePlannerItem = function(id) {
    const item = plannerItems.find(p => p.id === id);
    showConfirm({
        title: 'Hapus Item Planner',
        message: `Hapus "${item?.name || 'item ini'}" dari Planner? Riwayat pembayaran yang sudah tercatat tidak akan ikut terhapus.`,
        okLabel: 'Hapus',
    }, (confirmed) => {
        if(!confirmed) return;
        plannerItems = plannerItems.filter(p => p.id !== id);
        saveDataToCloud().then(() => {
            renderPlanner();
            showToast('Item berhasil dihapus!', true);
        });
    });
};

document.getElementById('formPlannerCrud').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('crudPlannerId').value;
    const group = document.getElementById('crudPlannerGroup').value;
    const name = document.getElementById('crudPlannerName').value;
    const amount = parseFloat(document.getElementById('crudPlannerAmount').value);
    
    // Auto-map category based on group
    const catMap = { 'INSTALLMENT': 'Installment', 'BILLS': 'Bills', 'KEBUTUHAN': 'Kebutuhan', 'GROCERIES': 'Groceries' };
    const category = catMap[group] || 'Lainnya';

    if(id) {
        const idx = plannerItems.findIndex(p => p.id === id);
        if(idx > -1) {
            plannerItems[idx] = { ...plannerItems[idx], group, name, amount, category };
            showToast('Item diperbarui!');
        }
    } else {
        plannerItems.push({
            id: 'p_' + Date.now().toString(),
            group, name, amount, category
        });
    }
    
    saveDataToCloud().then(() => {
        closePlannerModal();
        renderPlanner();
        showToast('Item Planner tersimpan!');
    });
});

window.openPayModal = function(id, category, name, sisaAmount, monthKey) {
    document.getElementById('payPlannerId').value = id;
    document.getElementById('payPlannerCategory').value = category;
    document.getElementById('payPlannerName').value = name;
    document.getElementById('payPlannerMonthKey').value = monthKey;
    
    document.getElementById('payPlannerSubtitle').innerText = name;
    document.getElementById('payPlannerAmount').value = sisaAmount;
    
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
    const amountPaid = parseFloat(document.getElementById('payPlannerAmount').value);

    const now = new Date();
    const viewingMonth = parseInt(monthKey.split('-')[1]) - 1;
    const viewingYear = parseInt(monthKey.split('-')[0]);
    
    let txDate = new Date(viewingYear, viewingMonth, 1);
    if(now.getMonth() === viewingMonth && now.getFullYear() === viewingYear) {
        txDate = now; 
    }

    const dateStr = `${txDate.getFullYear()}-${String(txDate.getMonth()+1).padStart(2,'0')}-${String(txDate.getDate()).padStart(2,'0')}`;

    expenses.push({
        id: Date.now().toString(),
        plannerRef: plannerRefId,
        date: dateStr,
        amount: amountPaid,
        category: category,
        desc: `[Planner] ${name}`
    });
    
    saveDataToCloud().then(() => {
        showToast('Pembayaran dicatat!');
        closePayModal();
        renderPlanner();
    });
});


// --- Standard CRUD Operations ---
document.getElementById('expenseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const date = document.getElementById('inpDate').value;
    const amount = parseFloat(document.getElementById('inpAmount').value);
    const category = document.querySelector('input[name="category"]:checked').value;
    const desc = document.getElementById('inpDesc').value || '-';

    if(id) {
        const index = expenses.findIndex(ex => ex.id === id);
        if(index > -1) {
            // retain plannerRef if it exists
            const pRef = expenses[index].plannerRef;
             expenses[index] = { id, plannerRef: pRef, date, amount, category, desc };
            showToast('Berhasil diubah!');
        }
    } else {
        expenses.push({ id: Date.now().toString(), plannerRef: null, date, amount, category, desc });
    }

    saveDataToCloud().then(() => {
        cancelEdit();
        showToast('Transaksi tersimpan!');
        renderHistory();
        if(category === 'Dana Darurat' || category === 'Tabungan Liburan') renderMonthly();
    });
});

window.deleteExpense = function(id) {
    const ex = expenses.find(e => e.id === id);
    showConfirm({
        title: 'Hapus Transaksi',
        message: `Hapus transaksi "${ex?.desc || 'ini'}" sebesar ${ex ? formatRp(ex.amount) : ''}? Aksi ini tidak dapat dibatalkan.`,
        okLabel: 'Hapus',
    }, (confirmed) => {
        if(!confirmed) return;
        expenses = expenses.filter(e => e.id !== id);
        saveDataToCloud().then(() => {
            renderHistory();
            showToast('Berhasil dihapus!', true);
        });
    });
};

window.editExpense = function(id) {
    const ex = expenses.find(e => e.id === id);
    if(ex) {
        document.getElementById('editId').value = ex.id;
        document.getElementById('inpDate').value = ex.date;
        document.getElementById('inpAmount').value = ex.amount;
        document.getElementById('inpDesc').value = ex.desc === '-' ? '' : ex.desc;
        const radio = document.querySelector(`input[name="category"][value="${ex.category}"]`);
        if(radio) radio.checked = true;
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
            btn.classList.remove('border-gray-700', 'bg-gray-800', 'text-gray-300');
            btn.classList.add('border-blue-500', 'bg-blue-600/20', 'text-blue-400');
        } else {
            btn.classList.remove('border-blue-500', 'bg-blue-600/20', 'text-blue-400');
            btn.classList.add('border-gray-700', 'bg-gray-800', 'text-gray-300');
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
const catColors = {
    'Installment': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    'Bills': 'text-red-400 bg-red-500/10 border-red-500/20',
    'Kebutuhan': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    'Groceries': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    'Dana Darurat': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    'Tabungan Liburan': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    'Lainnya': 'text-gray-300 bg-gray-500/10 border-gray-500/20',
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
        const isPlanner = ex.plannerRef ? '<i class="bx bx-list-check text-blue-400" title="Dari Planner"></i>' : '';
        const displayDate = new Date(ex.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
        
        const card = document.createElement('div');
        card.className = "glass-panel p-4 md:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-gray-800 hover:border-gray-700 transition-colors";
        
        card.innerHTML = `
            <div class="flex items-start md:items-center gap-4">
                <div class="hidden md:flex flex-shrink-0 w-12 h-12 bg-gray-900 rounded-xl items-center justify-center border border-gray-800">
                    <span class="text-xl">💰</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${colorClass}">${ex.category}</span>
                        <span class="text-xs text-gray-400">${displayDate}</span>
                    </div>
                    <p class="font-semibold text-gray-100 truncate text-sm md:text-base flex items-center gap-1">
                        ${isPlanner} ${ex.desc}
                    </p>
                </div>
            </div>
            
            <div class="flex items-center justify-between md:flex-col md:items-end gap-2 border-t md:border-t-0 border-gray-800/50 pt-3 md:pt-0">
                <span class="font-bold text-gray-100 text-base md:text-lg">${formatRp(ex.amount)}</span>
                <div class="flex items-center gap-1">
                    <button onclick="editExpense('${ex.id}')" class="p-2 text-blue-400 bg-gray-900 md:bg-transparent hover:bg-gray-800 rounded-lg transition-colors border border-gray-800 md:border-none">
                        <i class='bx bx-edit-alt'></i>
                    </button>
                    <button onclick="deleteExpense('${ex.id}')" class="p-2 text-red-400 bg-gray-900 md:bg-transparent hover:bg-gray-800 rounded-lg transition-colors border border-gray-800 md:border-none">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// --- Dashboard & Charts Logic ---
Chart.defaults.color = '#9ca3af';
Chart.defaults.font.family = "'Inter', sans-serif";

let catChartIns, compChartIns, weekChartIns;

function renderMonthly() {
    const now = new Date();
    const currM = now.getMonth();
    const currY = now.getFullYear();
    
    let lastM = currM - 1;
    let lastY = currY;
    if (lastM < 0) { lastM = 11; lastY = currY - 1; }

    let totalThisM = 0;
    let totalLastM = 0;
    let sumDarurat = 0;
    let sumLiburan = 0;

    const catAgg = {};

    expenses.forEach(ex => {
        const d = new Date(ex.date);
        const amt = ex.amount;

        if(ex.category === 'Dana Darurat') sumDarurat += amt;
        if(ex.category === 'Tabungan Liburan') sumLiburan += amt;

        if(d.getMonth() === currM && d.getFullYear() === currY) {
            totalThisM += amt;
            catAgg[ex.category] = (catAgg[ex.category] || 0) + amt;
        }

        if(d.getMonth() === lastM && d.getFullYear() === lastY) {
            totalLastM += amt;
        }
    });

    document.getElementById('moTotalExpense').innerText = formatRp(totalThisM);
    document.getElementById('moDanaDarurat').innerText = formatRp(sumDarurat);
    document.getElementById('moLiburan').innerText = formatRp(sumLiburan);
    document.getElementById('moLastMonth').innerText = formatRp(totalLastM);

    const trendBadge = document.getElementById('trendBadge');
    if(totalLastM === 0) {
        trendBadge.innerText = 'N/A';
        trendBadge.className = 'text-xs font-semibold bg-gray-500/20 text-gray-400 px-2 py-1 rounded-md';
    } else {
        const diff = totalThisM - totalLastM;
        const pct = Math.abs((diff / totalLastM) * 100).toFixed(1);
        if(diff > 0) {
            trendBadge.className = 'text-xs font-semibold bg-red-500/20 text-red-400 px-2 py-1 rounded-md';
            trendBadge.innerHTML = `<i class='bx bx-trending-up'></i> Naik ${pct}%`;
        } else {
            trendBadge.className = 'text-xs font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md';
            trendBadge.innerHTML = `<i class='bx bx-trending-down'></i> Turun ${pct}%`;
        }
    }

    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    if(catChartIns) catChartIns.destroy();
    
    const catLabels = Object.keys(catAgg);
    const catData = Object.values(catAgg);
    const catBg = ['#f97316', '#ef4444', '#3b82f6', '#a855f7', '#10b981', '#06b6d4', '#6b7280'];

    if(catData.length === 0) {
        catChartIns = new Chart(ctxCat, {
            type: 'doughnut',
            data: { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: ['#374151'] }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { legend: {display: false}} }
        });
    } else {
        catChartIns = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: catLabels,
                datasets: [{ data: catData, backgroundColor: catBg, borderWidth: 0 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '70%',
                plugins: {
                    legend: { position: 'right', labels: { usePointStyle: true, color: '#e5e7eb' } },
                    tooltip: { callbacks: { label: (c) => ` ${c.label}: ${formatRp(c.raw)}` } }
                }
            }
        });
    }

    const ctxComp = document.getElementById('comparisonChart').getContext('2d');
    if(compChartIns) compChartIns.destroy();

    compChartIns = new Chart(ctxComp, {
        type: 'bar',
        data: {
            labels: ['Bulan Lalu', 'Bulan Ini'],
            datasets: [{
                label: 'Total Pengeluaran',
                data: [totalLastM, totalThisM],
                backgroundColor: ['#6b7280', '#ef4444'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => formatRp(c.raw) } } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });
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

    expenses.forEach(ex => {
        const d = new Date(ex.date);
        if(d >= weekStart && d <= now) {
            const amt = ex.amount;
            totalWeek += amt;
            
            let dIdx = d.getDay() || 7; 
            dailySums[dIdx - 1] += amt;

            catSums[ex.category] = (catSums[ex.category] || 0) + amt;
        }
    });

    document.getElementById('wkTotal').innerText = formatRp(totalWeek);

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
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });

    const listHtml = Object.entries(catSums).sort((a,b)=>b[1]-a[1]).map(([cat, amt]) => {
        const colorClass = catColors[cat] || catColors['Lainnya'];
        return `
            <div class="flex justify-between items-center p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                <span class="px-3 py-1.5 text-sm font-medium rounded-lg border ${colorClass}">${cat}</span>
                <span class="font-bold text-gray-100">${formatRp(amt)}</span>
            </div>
        `;
    }).join('');
    
    document.getElementById('weeklyCategoryList').innerHTML = listHtml || '<p class="text-gray-500 text-sm italic">Belum ada pengeluaran minggu ini.</p>';
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
    link.setAttribute("download", `FinTracker_Export_${new Date().toISOString().slice(0,10)}.csv`);
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
        title: '⚠️ Hapus Semua Data',
        message: 'Semua riwayat transaksi (termasuk pembayaran dari Planner) akan dihapus secara permanen. Aksi ini TIDAK bisa dibatalkan.',
        okLabel: 'Ya, Hapus Semua',
        okClass: 'bg-red-600 hover:bg-red-700',
        iconClass: 'bx bx-error-circle',
        iconBg: 'bg-red-500/20 text-red-400'
    }, (confirmed) => {
        if(!confirmed) return;
        expenses = [];
        saveDataToCloud().then(() => {
            renderHistory();
            showToast('Semua data berhasil dihapus!', true);
        });
    });
};

// --- Planner Preview Sheet ---
window.openPlannerPreview = function() {
    const monthKey = getPlannerMonthKey(plannerViewingDate);
    const monthName = plannerViewingDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    document.getElementById('previewMonthLabel').textContent = monthName;

    let totalEstimasi = 0, totalDibayar = 0, lunasCount = 0, belumCount = 0;

    const groupedItems = {};
    plannerItems.forEach(item => {
        if(!groupedItems[item.group]) groupedItems[item.group] = [];
        groupedItems[item.group].push(item);
    });

    const listEl = document.getElementById('previewItemList');
    listEl.innerHTML = '';

    const groupsToRender = [...groupOrder];
    Object.keys(groupedItems).forEach(g => { if(!groupsToRender.includes(g)) groupsToRender.push(g); });

    groupsToRender.forEach(groupName => {
        if(!groupedItems[groupName] || groupedItems[groupName].length === 0) return;

        const groupHeader = document.createElement('p');
        groupHeader.className = 'text-[10px] font-bold uppercase tracking-widest text-blue-400 mt-3 mb-1 px-1';
        groupHeader.textContent = groupName;
        listEl.appendChild(groupHeader);

        groupedItems[groupName].forEach(item => {
            totalEstimasi += item.amount;
            const amountPaid = expenses
                .filter(ex => ex.plannerRef === item.id && ex.date.startsWith(monthKey))
                .reduce((sum, ex) => sum + ex.amount, 0);
            totalDibayar += amountPaid;
            const sisa = item.amount - amountPaid;
            const isLunas = sisa <= 0;
            isLunas ? lunasCount++ : belumCount++;

            const row = document.createElement('div');
            row.className = `flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl ${isLunas ? 'bg-emerald-900/20 border border-emerald-500/20' : 'bg-gray-800/50 border border-gray-700/50'}`;
            row.innerHTML = `
                <div class="flex items-center gap-2 min-w-0">
                    <i class='bx ${isLunas ? 'bx-check-circle text-emerald-400' : 'bx-circle text-gray-500'} text-lg flex-shrink-0'></i>
                    <span class="text-sm text-gray-200 truncate">${item.name}</span>
                </div>
                <div class="text-right flex-shrink-0">
                    <p class="text-xs font-semibold ${isLunas ? 'text-emerald-400' : 'text-red-400'}">${isLunas ? 'LUNAS' : formatRp(sisa)}</p>
                    <p class="text-[10px] text-gray-500">${formatRp(item.amount)}</p>
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
    toggleLoader(true, 'Menyiapkan data...');

    try {
        const res = await fetch('/api/data', {
            method: 'GET'
        });

        if (!res.ok) {
            showToast('Terjadi kesalahan pada server saat mengambil data.', true);
        } else {
            // Berhasil
            const data = await res.json();
            
            expenses = data.expenses || [];
            plannerItems = data.plannerItems || [];
            
            // If completely empty (first time ever), init with templates
            if(plannerItems.length === 0) {
                plannerItems = [...defaultPlannerTemplate];
                await saveDataToCloud();
            }

            setQuickDate(0);
            switchTab('planner');
        }
    } catch(err) {
        showToast('Gagal menghubungi server.', true);
    } finally {
        toggleLoader(false);
    }
});
