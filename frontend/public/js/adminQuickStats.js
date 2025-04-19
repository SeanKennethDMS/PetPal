import supabase from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    loadQuickStats();
});

async function loadQuickStats() {
    await Promise.all([
        loadInventoryPieChart(),
        loadSalesByPaymentMethodChart(),
        loadPOSSummaryChart(),
        loadMostAvailedServicesChart()
    ]);
}

async function loadInventoryPieChart() {
    const ctx = document.getElementById('inventoryPieChart');
    if (!ctx) return;

    try {
        const { data: products, error: prodErr } = await supabase
            .from('products')
            .select('quantity');

        if (prodErr) throw prodErr;

        const totalStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: usedItems, error: usageErr } = await supabase
            .from('transaction_items')
            .select('quantity')
            .eq('item_type', 'product')
            .gte('created_at', startOfMonth.toISOString());

        if (usageErr) throw usageErr;

        const totalUsed = usedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

        const data = {
            labels: ['In Stock', 'Used This Month'],
            datasets: [{
                data: [totalStock, totalUsed],
                backgroundColor: ['#3B82F6', '#EF4444'], 
            }]
        };

        new Chart(ctx, {
            type: 'pie',
            data,
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Inventory Overview (This Month)',
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

    } catch (err) {
        console.error('Inventory Pie Chart Error:', err);
    }
}



async function loadSalesByPaymentMethodChart() {
    const ctx = document.getElementById("paymentMethodPieChart");
    const legendContainer = document.getElementById("paymentMethodLegend");

    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from("transactions")
            .select("payment_method, total_amount, created_at");

        if (error) throw error;

        const thisMonthSales = data.filter(txn => {
            const txnDate = new Date(txn.created_at);
            return txnDate >= startOfMonth;
        });

        const methodTotals = {};

        thisMonthSales.forEach(txn => {
            const method = txn.payment_method || "Unknown";
            const amount = Number(txn.total_amount || 0);
            methodTotals[method] = (methodTotals[method] || 0) + amount;
        });

        const labels = Object.keys(methodTotals);
        const values = Object.values(methodTotals);
        const colors = labels.map(() => `hsl(${Math.random() * 360}, 70%, 70%)`);

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Sales by Payment Method (This Month)',
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (err) {
        console.error("Sales by Payment Method Error:", err);
        ctx.parentElement.innerHTML = `<p class="text-sm text-red-500">Failed to load sales by payment method chart.</p>`;
    }
}


async function loadPOSSummaryChart() {
    const ctx = document.getElementById("posSummaryPieChart");
    const legendContainer = document.getElementById("posSummaryLegend");

    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from("transactions")
            .select("transaction_type, created_at");

        if (error) throw error;

        const filtered = data.filter(txn => new Date(txn.created_at) >= startOfMonth);

        const typeCounts = {};
        filtered.forEach(txn => {
            const type = txn.transaction_type || "Unknown";
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        const labels = Object.keys(typeCounts);
        const values = Object.values(typeCounts);
        const colors = labels.map(() => `hsl(${Math.random() * 360}, 70%, 70%)`);

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'POS Transaction Types (This Month)',
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (err) {
        console.error("POS Summary Chart Error:", err);
        ctx.parentElement.innerHTML = `<p class="text-sm text-red-500">Failed to load POS summary chart.</p>`;
    }
}


async function loadMostAvailedServicesChart() {
    const ctx = document.getElementById("servicesPieChart");
    const legendContainer = document.getElementById("servicesLegend");

    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from("transaction_items")
            .select("item_name, item_type, created_at");

        if (error) throw error;

        const serviceItems = data.filter(item =>
            item.item_type === "service" &&
            new Date(item.created_at) >= startOfMonth
        );

        const serviceCounts = {};
        serviceItems.forEach(item => {
            serviceCounts[item.item_name] = (serviceCounts[item.item_name] || 0) + 1;
        });

        const labels = Object.keys(serviceCounts);
        const values = Object.values(serviceCounts);
        const colors = labels.map(() => `hsl(${Math.random() * 360}, 70%, 60%)`);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: "Times Availed",
                    data: values,
                    backgroundColor: colors
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Most Availed Services (This Month)',
                        font: { size: 16 }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Availments'
                        }
                    },
                    x: {
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                }
            }
        });

        legendContainer.innerHTML = labels.map((label, i) => `
            <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" style="background-color:${colors[i]}"></span>
                ${label} (${values[i]})
            </div>
        `).join('');
    } catch (err) {
        console.error("Most Availed Services Chart Error:", err);
        ctx.parentElement.innerHTML = `<p class="text-sm text-red-500">Failed to load chart.</p>`;
    }
}
