// dashboardStats.js
import supabase from '../js/supabaseClient.js';

async function updateDashboardStats() {
    try {
        // 1. Today's Appointments
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const { count: todayAppointmentsCount, error: appointmentsError } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('appointment_date', todayStr)
            .eq('status', 'confirmed'); // Only count confirmed appointments

        // Yesterday's appointments for comparison
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const { count: yesterdayAppointmentsCount, error: yesterdayError } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('appointment_date', yesterdayStr)
            .eq('status', 'confirmed');

        // Update UI
        document.getElementById('todayAppointments').textContent = todayAppointmentsCount || 0;
        const changeElement = document.getElementById('appointmentsChange');
        const change = (todayAppointmentsCount || 0) - (yesterdayAppointmentsCount || 0);
        
        if (change > 0) {
            changeElement.textContent = `↑ ${change} from yesterday`;
            changeElement.className = 'text-sm text-green-600';
        } else if (change < 0) {
            changeElement.textContent = `↓ ${Math.abs(change)} from yesterday`;
            changeElement.className = 'text-sm text-red-600';
        } else {
            changeElement.textContent = 'No change from yesterday';
            changeElement.className = 'text-sm';
        }

        // 2. Monthly Revenue (using transactions table)
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        const firstDay = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(currentYear, currentMonth, 0).getDate();
        const lastDayStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
        
        const { data: monthlyRevenue, error: revenueError } = await supabase
            .from('transactions')
            .select('total_amount')
            .eq('status', 'completed')
            .gte('created_at', firstDay)
            .lte('created_at', lastDayStr);

        // Last month for comparison
        const lastMonthDate = new Date(currentYear, currentMonth - 2, 1);
        const lastMonth = lastMonthDate.getMonth() + 1;
        const lastMonthYear = lastMonthDate.getFullYear();
        const lastMonthFirstDay = `${lastMonthYear}-${lastMonth.toString().padStart(2, '0')}-01`;
        const lastMonthLastDay = new Date(lastMonthYear, lastMonth, 0).getDate();
        const lastMonthLastDayStr = `${lastMonthYear}-${lastMonth.toString().padStart(2, '0')}-${lastMonthLastDay.toString().padStart(2, '0')}`;
        
        const { data: lastMonthRevenue, error: lastMonthError } = await supabase
            .from('transactions')
            .select('total_amount')
            .eq('status', 'completed')
            .gte('created_at', lastMonthFirstDay)
            .lte('created_at', lastMonthLastDayStr);

        // Calculate revenue
        const currentRevenue = monthlyRevenue?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;
        const lastMonthTotal = lastMonthRevenue?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;
        const revenueChange = lastMonthTotal > 0 
            ? Math.round(((currentRevenue - lastMonthTotal) / lastMonthTotal * 100))
            : currentRevenue > 0 ? 100 : 0;

        // Update UI
        document.getElementById('monthlyRevenue').textContent = `₱${currentRevenue.toLocaleString()}`;
        const revenueChangeElement = document.getElementById('revenueChange');
        
        if (revenueChange > 0) {
            revenueChangeElement.textContent = `${revenueChange}% ↑ from last month`;
            revenueChangeElement.className = 'text-sm text-green-600';
        } else if (revenueChange < 0) {
            revenueChangeElement.textContent = `${Math.abs(revenueChange)}% ↓ from last month`;
            revenueChangeElement.className = 'text-sm text-red-600';
        } else {
            revenueChangeElement.textContent = 'No change from last month';
            revenueChangeElement.className = 'text-sm';
        }

        // 3. Pending Requests (appointments with 'pending' status)
        const { count: pendingCount, error: pendingError } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        document.getElementById('pendingRequests').textContent = pendingCount || 0;

        // 4. Low Stock Items (products with quantity < 5)
        const { count: lowStockCount, error: lowStockError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .lt('quantity', 5)
            .eq('status', 'active'); // Only count active products

        document.getElementById('lowStockItems').textContent = lowStockCount || 0;

    } catch (error) {
        console.error('Error updating dashboard:', error);
        // Optionally show error to user
        document.getElementById('todayAppointments').textContent = "Error";
        document.getElementById('monthlyRevenue').textContent = "Error";
        document.getElementById('pendingRequests').textContent = "Error";
        document.getElementById('lowStockItems').textContent = "Error";
    }
}

// Initial load
updateDashboardStats();

// Auto-refresh every 5 minutes
const refreshInterval = setInterval(updateDashboardStats, 300000);

// For manual refresh if needed
window.updateDashboardStats = updateDashboardStats;