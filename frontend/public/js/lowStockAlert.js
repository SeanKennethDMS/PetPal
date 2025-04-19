import supabase from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    loadLowStockAndCriticalAlerts();

    document.body.addEventListener('click', (e) => {
        const target = e.target;
        if (target.matches('a[href="#inventory"]')) {
            e.preventDefault();

            const inventorySection = document.getElementById("inventory");
            const dashboardSection = document.getElementById("dashboard");

            if (inventorySection) {
                inventorySection.classList.remove("hidden");
            }

            if (dashboardSection) {
                dashboardSection.classList.add("hidden");
            }
        }
    });
});

async function loadLowStockAndCriticalAlerts() {
    const container = document.getElementById("lowStockAndAlerts");
    if (!container) return;

    container.innerHTML = `<p class="text-sm text-gray-500">Loading...</p>`;

    try {
        const { data: products, error } = await supabase
            .from("products")
            .select("id, name, quantity");

        if (error) throw error;

        const lowStockItems = products.filter(p =>
            typeof p.quantity === 'number' && p.quantity <= 5
        );

        if (lowStockItems.length === 0) {
            container.innerHTML = `<p class="text-sm text-green-600">All inventory levels are healthy. </p>`;
            return;
        }

        container.innerHTML = lowStockItems.map(item => `
            <div class="bg-red-100 text-red-800 p-2 rounded flex justify-between items-center">
                <span>
                    <strong>${item.name}</strong> is low on stock (${item.quantity} left)</span>
                <a href="#inventory" class="text-blue-600 underline text-sm hover:text-blue-800">Go to Inventory</a>
            </div>
        `).join('');
    } catch (err) {
        console.error("Error loading low stock alerts:", err);
        container.innerHTML = `<p class="text-sm text-red-500">Failed to load stock alerts.</p>`;
    }
}
