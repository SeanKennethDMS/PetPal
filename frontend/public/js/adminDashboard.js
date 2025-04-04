// adminDashboard.js - Today's Appointments Implementation

import supabase from '../js/supabaseClient.js';

document.addEventListener("DOMContentLoaded", async () => {
    // Check admin session first
    if (!await verifyAdminSession()) {
        window.location.href = '../index.html';
        return;
    }

    // Initialize dashboard
    await loadTodaysAppointments();
    setupAppointmentListeners();
});

/**
 * Verify admin session using your existing auth system
 */
async function verifyAdminSession() {
    const userSession = localStorage.getItem("userSession");
    const userRole = localStorage.getItem("userRole");
    return userSession && userRole === 'admin';
}

/**
 * Load and display today's appointments
 */
async function loadTodaysAppointments() {
    try {
        showLoading('#appointments-container');
        
        // Get today's date range
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        // Corrected Supabase query
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                appointment_id,
                user_id,
                pet_id,
                service_id,
                appointment_date,
                appointment_time,
                status,
                pets!pet_id(pet_name, species, breed),
                services!service_id(name, price),
                users_table!user_id(first_name, last_name, email)
            `)
            .gte('appointment_date', startOfDay)
            .lte('appointment_date', endOfDay)
            .order('appointment_time', { ascending: true });

        if (error) throw error;

        if (appointments.length === 0) {
            renderNoAppointments();
        } else {
            renderAppointments(appointments);
        }
    } catch (error) {
        console.error("Failed to load appointments:", error);
        showError("Failed to load appointments. Please try again.");
    }
}

/**
 * Render appointments to the dashboard
 */
function renderAppointments(appointments) {
    const container = document.querySelector('#appointments-container');
    
    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">📅 Today's Schedule (${appointments.length})</h2>
            <button class="btn-primary" id="refresh-appointments">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                </svg>
                Refresh
            </button>
        </div>
        <div class="space-y-4">
            ${appointments.map(appt => createAppointmentCard(appt)).join('')}
        </div>
    `;
}

/**
 * Create HTML for an appointment card
 */
function createAppointmentCard(appointment) {
    const formattedTime = new Date(`1970-01-01T${appointment.appointment_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ownerName = `${appointment.users_table.first_name} ${appointment.users_table.last_name}`;
    const price = appointment.services.price?.amount || '0'; // Handle jsonb price
    
    return `
        <div class="appointment-card bg-white p-4 rounded-lg shadow border-l-4 ${getStatusBorderClass(appointment.status)}" data-id="${appointment.appointment_id}">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold">${escapeHtml(appointment.pets.pet_name)} (${escapeHtml(appointment.pets.species)})</h3>
                    <p class="text-gray-600">Owner: ${escapeHtml(ownerName)}</p>
                    <p class="text-sm text-gray-500">
                        ${formattedTime} • ${escapeHtml(appointment.services.name)} (₱${price})
                    </p>
                </div>
                <span class="status-badge ${getStatusClass(appointment.status)}">
                    ${escapeHtml(appointment.status)}
                </span>
            </div>
            
            <div class="mt-3 pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button class="action-btn view-btn bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                    View Details
                </button>
                ${appointment.status === 'pending' ? `
                <button class="action-btn confirm-btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">
                    Confirm
                </button>
                ` : ''}
                <button class="action-btn cancel-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">
                    Cancel
                </button>
            </div>
        </div>
    `;
}

/**
 * Show loading state
 */
function showLoading(selector) {
    const container = document.querySelector(selector);
    container.innerHTML = `
        <div class="flex justify-center items-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    `;
}

/**
 * Show no appointments message
 */
function renderNoAppointments() {
    document.querySelector('#appointments-container').innerHTML = `
        <div class="text-center py-8">
            <h2 class="text-xl font-bold">Today's Schedule</h2>
            <p class="text-gray-600 mt-2">No appointments scheduled for today</p>
        </div>
    `;
}

/**
 * Setup event listeners for appointment actions
 */
function setupAppointmentListeners() {
    // Refresh button
    document.addEventListener('click', async (e) => {
        if (e.target.closest('#refresh-appointments')) {
            await loadTodaysAppointments();
        }
    });

    // Appointment action buttons
    document.addEventListener('click', async (e) => {
        const card = e.target.closest('.appointment-card');
        if (!card) return;

        const appointmentId = card.dataset.id;
        const actionBtn = e.target.closest('.action-btn');

        if (!actionBtn) return;

        try {
            if (actionBtn.classList.contains('view-btn')) {
                await showAppointmentDetails(appointmentId);
            } 
            else if (actionBtn.classList.contains('confirm-btn')) {
                await updateAppointmentStatus(appointmentId, 'confirmed');
            } 
            else if (actionBtn.classList.contains('cancel-btn')) {
                await updateAppointmentStatus(appointmentId, 'cancelled');
            }
        } catch (error) {
            console.error("Action failed:", error);
            showError("Failed to perform action. Please try again.");
        }
    });
}

/**
 * Update appointment status securely
 */
async function updateAppointmentStatus(appointmentId, newStatus) {
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid status value');
    }

    const { error } = await supabase
        .from('appointments')
        .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq('appointment_id', appointmentId);

    if (error) throw error;

    showSuccess(`Appointment ${newStatus}`);
    await loadTodaysAppointments();
}

/**
 * Show appointment details modal
 */
async function showAppointmentDetails(appointmentId) {
    try {
        const { data: appointment, error } = await supabase
            .from('appointments')
            .select(`
                *,
                pets:pet_id(name, type, breed),
                services:service_id(name, description, price),
                customers:user_id(name, email, phone, address)
            `)
            .eq('appointment_id', appointmentId)
            .single();

        if (error) throw error;

        // Create and show modal
        const modalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Appointment Details</h3>
                        <button class="close-modal text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                    </div>
                    
                    <div class="space-y-3">
                        <p><strong>Pet:</strong> ${escapeHtml(appointment.pets.name)} (${escapeHtml(appointment.pets.type)})</p>
                        <p><strong>Service:</strong> ${escapeHtml(appointment.services.name)} - ₱${appointment.services.price}</p>
                        <p><strong>Date:</strong> ${new Date(appointment.appointment_date).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> ${new Date(`1970-01-01T${appointment.appointment_time}`).toLocaleTimeString()}</p>
                        <p><strong>Status:</strong> <span class="${getStatusClass(appointment.status)} px-2 py-1 rounded-full text-xs">${appointment.status}</span></p>
                        <p><strong>Owner:</strong> ${escapeHtml(appointment.customers.name)}</p>
                        <p><strong>Contact:</strong> ${escapeHtml(appointment.customers.phone)}</p>
                        ${appointment.notes ? `<p><strong>Notes:</strong> ${escapeHtml(appointment.notes)}</p>` : ''}
                    </div>
                    
                    <div class="mt-6 flex justify-end">
                        <button class="close-modal bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);

        // Add close handlers
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });

    } catch (error) {
        console.error("Failed to load details:", error);
        showError("Failed to load appointment details");
    }
}

/**
 * Helper function to escape HTML
 */
function escapeHtml(unsafe) {
    return unsafe?.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;") || '';
}

/**
 * Get CSS class for status badge
 */
function getStatusClass(status) {
    const classes = {
        pending: 'bg-yellow-100 text-yellow-800',
        confirmed: 'bg-blue-100 text-blue-800',
        cancelled: 'bg-red-100 text-red-800',
        completed: 'bg-green-100 text-green-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get border color class based on status
 */
function getStatusBorderClass(status) {
    const classes = {
        pending: 'border-yellow-500',
        confirmed: 'border-blue-500',
        cancelled: 'border-red-500',
        completed: 'border-green-500'
    };
    return classes[status] || 'border-gray-500';
}

/**
 * Show success message
 */
function showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center';
    toast.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        ${message}
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

/**
 * Show error message
 */
function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center';
    toast.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        ${message}
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}