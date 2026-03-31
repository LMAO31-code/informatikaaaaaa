const expenseForm = document.getElementById('expenseForm');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const descriptionInput = document.getElementById('description');
const expenseHistory = document.getElementById('expenseHistory');
const totalBalance = document.getElementById('totalBalance');
const totalIncome = document.getElementById('totalIncome');
const totalExpenses = document.getElementById('totalExpenses');
const expenseChartCtx = document.getElementById('expenseChart').getContext('2d');


const radioButtons = document.querySelectorAll('input[name="transactionType"]');
const expenseTypeRadio = document.querySelector('input[name="transactionType"][value="expense"]');
const incomeTypeRadio = document.querySelector('input[name="transactionType"][value="income"]');

function formatCurrency(amount) {
    return 'Rp' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

class Transaction {
    constructor(id, type, amount, category, description, date) {
        this.id = id;
        this.type = type;
        this.amount = amount;
        this.category = category;
        this.description = description;
        this.date = date;
    }
}

let transactions = [];
let expenseChart = null;
let negativeBalanceWarningShown = false;

function init() {
    loadTransactions();
    renderTransactions();
    updateSummary();
    renderChart();
    setupEventListeners();
}

function loadTransactions() {
    const savedTransactions = localStorage.getItem('transactions');
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
    }
}

function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function addTransaction(type, amount, category, description) {
    const newTransaction = new Transaction(
        Date.now().toString(),
        type,
        parseFloat(amount),
        category,
        description,
        new Date().toLocaleDateString('id-ID')
    );
    
    transactions.push(newTransaction);
    saveTransactions();
    renderTransactions();
    updateSummary();
    renderChart();
}

function deleteTransaction(id) {
    transactions = transactions.filter(transaction => transaction.id !== id);
    saveTransactions();
    renderTransactions();
    updateSummary();
    renderChart();
}

function renderTransactions() {
    expenseHistory.innerHTML = '';
    
    if (transactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" style="text-align: center; padding: 1rem;">No transactions yet</td>';
        expenseHistory.appendChild(row);
        return;
    }
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td style="padding: 0.75rem 1.5rem;">${transaction.date}</td>
            <td style="padding: 0.75rem 1.5rem;">${transaction.category}</td>
            <td style="padding: 0.75rem 1.5rem;">${transaction.description || '-'}</td>
            <td style="padding: 0.75rem 1.5rem; color: ${transaction.type === 'income' ? '#6d2932' : '#163832'}">
                ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(Math.abs(transaction.amount))}
            </td>
            <td style="padding: 0.75rem 1.5rem;">
                <button class="delete-btn" data-id="${transaction.id}" style="background: none; border: none; color: #6d2932;; cursor: pointer;">
                    <i class="uil uil-trash-alt"></i>
                </button>
            </td>
        `;
        
        expenseHistory.appendChild(row);
    });
}

function showNegativeBalanceWarning() {
    if (!negativeBalanceWarningShown) {
        const warning = document.createElement('div');
        warning.id = 'balance-warning';
        warning.style.cssText = 'background-color: #fee; border-left: 4px solid #f00; color: #c00; padding: 1rem; margin-bottom: 1rem;';
        warning.innerHTML = `
            <p style="font-weight: bold;">Peringatan!</p>
            <p>Saldo Anda negatif. Harap tambahkan pemasukan atau kurangi pengeluaran.</p>
        `;
        document.querySelector('.container').prepend(warning);
        negativeBalanceWarningShown = true;
    }
}

function hideNegativeBalanceWarning() {
    const warning = document.getElementById('balance-warning');
    if (warning) {
        warning.remove();
        negativeBalanceWarningShown = false;
    }
}

function updateSummary() {
    const incomes = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = incomes - expenses;
    
    totalIncome.textContent = formatCurrency(incomes);
    totalExpenses.textContent = formatCurrency(expenses);
    totalBalance.textContent = formatCurrency(balance);
    
    if (balance < 0) {
        totalBalance.style.color = '#163832';
        showNegativeBalanceWarning();
    } else {
        totalBalance.style.color = '#6d2932';
        hideNegativeBalanceWarning();
    }
}

function renderChart() {
    if (expenseChart) {
        expenseChart.destroy();
    }
    
    const expenseData = transactions.filter(t => t.type === 'expense');
    
    if (expenseData.length === 0) {
        return;
    }
    
    const categories = {};
    expenseData.forEach(t => {
        if (!categories[t.category]) {
            categories[t.category] = 0;
        }
        categories[t.category] += t.amount;
    });
    
    const labels = Object.keys(categories);
    const data = Object.values(categories);
    
    const backgroundColors = labels.map((_, i) => {
        const hue = (i * 137.508) % 360;
        return `hsl(${hue}, 70%, 60%)`;
    });
    
    expenseChart = new Chart(expenseChartCtx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function setupEventListeners() {
  
    expenseHistory.addEventListener('click', function(e) {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            deleteTransaction(deleteBtn.dataset.id);
        }
    });


    expenseForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const selectedType = document.querySelector('input[name="transactionType"]:checked');
        
        if (!selectedType) {
            alert('Pilih tipe transaksi (Expense/Income)');
            return;
        }
        
        const type = selectedType.value;
        const amount = amountInput.value;
        
        if (!amount || parseFloat(amount) <= 0) {
            alert('Harap masukkan jumlah yang valid');
            return;
        }
        
        let category = categorySelect.value;
        const description = descriptionInput.value;
        
        if (type === 'expense') {
            if (!category) {
                alert('Harap pilih kategori');
                return;
            }
        } else {
            category = 'Income';
        }
        
        addTransaction(type, amount, category, description);
        
      
        amountInput.value = '';
        descriptionInput.value = '';
        categorySelect.value = '';
        
   
        expenseTypeRadio.checked = true;
        categorySelect.required = true;
        
        amountInput.focus();
    });

   
    radioButtons.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.value === 'expense') {
            categorySelect.required = true;
            categorySelect.disabled = false;
        } else {
            categorySelect.required = false;
            categorySelect.disabled = false;
            categorySelect.value = '';
        }
    });
});


    expenseTypeRadio.checked = true;
    categorySelect.required = true;
}


document.addEventListener('DOMContentLoaded', init);
