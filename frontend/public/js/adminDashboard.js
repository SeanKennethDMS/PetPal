import { NotificationService, NOTIFICATION_TYPES } from './notificationService.js';
import supabase from './supabaseClient.js';

// Constants
const ITEMS_PER_PAGE = 10;

// State Management
const state = {
  currentPage: 1,
  totalPages: 1,
  currentFilter: 'pending',
  products: [],
  services: []
};

// Channel Management
let appointmentChannel = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  setupEventListeners();
  setupModalEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
  // Tab buttons
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      setActiveTab(tab);
      state.currentFilter = tab;
      state.currentPage = 1;
      loadAppointments(tab);
    });
  });
}

// Tab Management
function setActiveTab(tab) {
  document.querySelectorAll('.tab-button').forEach(button => {
    if (button.dataset.tab === tab) {
      button.classList.add('text-blue-600', 'font-semibold', 'border-b-2', 'border-blue-600');
      button.classList.remove('text-gray-600', 'hover:text-blue-600');
    } else {
      button.classList.remove('text-blue-600', 'font-semibold', 'border-b-2', 'border-blue-600');
      button.classList.add('text-gray-600', 'hover:text-blue-600');
    }
  });
}

// Dashboard Loading
async function loadDashboard() {
  try {
    // Clean up existing subscription if any
    if (appointmentChannel) {
      appointmentChannel.unsubscribe();
      appointmentChannel = null;
    }

    const channelName = `admin-appointments-${Date.now()}`;
    appointmentChannel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments'
      }, (payload) => {
        console.log('Admin appointment change received:', payload);
        // Reload all sections when there's a change
        loadTodaysSchedule();
        loadTodaysAppointments();
        loadPendingRequests();
        loadUpcomingAppointments();
        loadAppointments(state.currentFilter);
      })
      .subscribe();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (appointmentChannel) {
        appointmentChannel.unsubscribe();
        appointmentChannel = null;
      }
    });

    // Load initial data
    await Promise.all([
      loadTodaysSchedule(),
      loadTodaysAppointments(),
      loadPendingRequests(),
      loadUpcomingAppointments(),
      loadAppointments('pending')
    ]);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showError('Failed to load dashboard');
  }
}

// Today's Schedule
async function loadTodaysSchedule() {
  const container = document.getElementById('todaysSchedule');
  if (!container) return;

  container.innerHTML = `<p class="text-sm text-gray-500">Loading today's schedule...</p>`;

  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        pets!inner (
          pet_name,
          image_url,
          species
        ),
        services!inner (
          name
        )
      `)
      .eq('appointment_date', today)
      .eq('status', 'accepted')
      .order('appointment_time', { ascending: true });

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4">
          <p class="text-sm text-gray-500">No appointments scheduled for today.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = appointments.map(app => {
      const pet = app.pets;
      const service = app.services?.name || 'Service';
      const time = formatTime(app.appointment_time);
      const imageUrl = getPetImage(pet);

      return `
        <div class="flex items-start gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <img src="${imageUrl}" alt="${pet?.pet_name}" class="w-12 h-12 rounded-full object-cover border">
          <div class="flex-1">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-semibold text-gray-800">${pet?.pet_name || 'Pet Name'}</p>
                <p class="text-sm text-gray-600">${service}</p>
                <p class="text-xs text-gray-500">${time}</p>
              </div>
              <div class="flex gap-2">
                <button onclick="openProceedModal('${app.appointment_id}')" 
                  class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                  Proceed
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading today\'s schedule:', error);
    container.innerHTML = `
      <div class="text-center py-4">
        <p class="text-sm text-red-500">Failed to load today's schedule.</p>
      </div>
    `;
  }
}

// Today's Appointments
async function loadTodaysAppointments(page = 1, limit = 3) {
  const container = document.getElementById('todaysAppointmentsAdmin');
  const pagination = document.getElementById('todaysAppointmentsPagination');

  if (!container || !pagination) return;

  container.innerHTML = `<p class="text-sm text-gray-500">Loading today's appointments...</p>`;
  pagination.innerHTML = '';

  try {
    const today = new Date().toISOString().split('T')[0];
    const offset = (page - 1) * limit;

    const { data: appointments, error, count } = await supabase
      .from('appointments')
      .select(`
        *,
        pets!inner (
          pet_name,
          image_url,
          species,
          users_table!inner (
            first_name,
            last_name
          )
        ),
        services!inner (
          name
        )
      `, { count: 'exact' })
      .eq('appointment_date', today)
      .eq('status', 'accepted')
      .order('appointment_time', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      container.innerHTML = `<p class="text-sm text-gray-500">No appointments scheduled for today.</p>`;
      return;
    }

    container.innerHTML = appointments.map(app => {
      const pet = app.pets;
      const service = app.services?.name || 'Service';
      const time = formatTime(app.appointment_time);
      const imageUrl = getPetImage(pet);
      const customerName = `${pet.users_table.first_name} ${pet.users_table.last_name}`;

      return `
        <div class="flex items-start gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <img src="${imageUrl}" alt="${pet?.pet_name}" class="w-12 h-12 rounded-full object-cover border">
          <div class="flex-1">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-semibold text-gray-800">${pet?.pet_name || 'Pet Name'}</p>
                <p class="text-sm text-gray-600">${service}</p>
                <p class="text-xs text-gray-500">${time}</p>
                <p class="text-xs text-gray-500">Customer: ${customerName}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    renderPagination(pagination, page, Math.ceil(count / limit), loadTodaysAppointments);

  } catch (error) {
    console.error('Error loading today\'s appointments:', error);
    container.innerHTML = `<p class="text-sm text-red-500">Failed to load today's appointments.</p>`;
  }
}

// Pending Requests
async function loadPendingRequests(page = 1, limit = 3) {
  const container = document.getElementById('pendingRequestsAdmin');
  const pagination = document.getElementById('pendingRequestsPagination');

  if (!container || !pagination) return;

  container.innerHTML = `<p class="text-sm text-gray-500">Loading pending requests...</p>`;
  pagination.innerHTML = '';

  try {
    const offset = (page - 1) * limit;
    const { data: appointments, error, count } = await supabase
      .from('appointments')
      .select(`
        *,
        pets!inner (
          pet_name,
          image_url,
          species,
          users_table!inner (
            first_name,
            last_name
          )
        ),
        services!inner (
          name
        )
      `, { count: 'exact' })
      .in('status', ['pending', 'rescheduled'])
      .order('appointment_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      container.innerHTML = `<p class="text-sm text-gray-500">No pending requests found.</p>`;
      return;
    }

    container.innerHTML = appointments.map(app => {
      const pet = app.pets;
      const service = app.services?.name || 'Service';
      const date = formatDate(app.appointment_date);
      const time = formatTime(app.appointment_time);
      const imageUrl = getPetImage(pet);
      const customerName = `${pet.users_table.first_name} ${pet.users_table.last_name}`;

      return `
        <div class="flex items-start gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <img src="${imageUrl}" alt="${pet?.pet_name}" class="w-12 h-12 rounded-full object-cover border">
          <div class="flex-1">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-semibold text-gray-800">${pet?.pet_name || 'Pet Name'}</p>
                <p class="text-sm text-gray-600">${service}</p>
                <p class="text-xs text-gray-500">${date} at ${time}</p>
                <p class="text-xs text-gray-500">Customer: ${customerName}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    renderPagination(pagination, page, Math.ceil(count / limit), loadPendingRequests);

  } catch (error) {
    console.error('Error loading pending requests:', error);
    container.innerHTML = `<p class="text-sm text-red-500">Failed to load pending requests.</p>`;
  }
}

// Upcoming Appointments
async function loadUpcomingAppointments(page = 1, limit = 3) {
  const container = document.getElementById('upcomingAppointmentsAdmin');
  const pagination = document.getElementById('upcomingAppointmentsPagination');

  if (!container || !pagination) return;

  container.innerHTML = `<p class="text-sm text-gray-500">Loading upcoming appointments...</p>`;
  pagination.innerHTML = '';

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const offset = (page - 1) * limit;

    const { data: appointments, error, count } = await supabase
      .from('appointments')
      .select(`
        *,
        pets!inner (
          pet_name,
          image_url,
          species,
          users_table!inner (
            first_name,
            last_name
          )
        ),
        services!inner (
          name
        )
      `, { count: 'exact' })
      .eq('status', 'accepted')
      .gte('appointment_date', tomorrowStr)
      .order('appointment_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      container.innerHTML = `<p class="text-sm text-gray-500">No upcoming appointments.</p>`;
      return;
    }

    container.innerHTML = appointments.map(app => {
      const pet = app.pets;
      const service = app.services?.name || 'Service';
      const date = formatDate(app.appointment_date);
      const time = formatTime(app.appointment_time);
      const imageUrl = getPetImage(pet);
      const customerName = `${pet.users_table.first_name} ${pet.users_table.last_name}`;

      return `
        <div class="flex items-start gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <img src="${imageUrl}" alt="${pet?.pet_name}" class="w-12 h-12 rounded-full object-cover border">
          <div class="flex-1">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-semibold text-gray-800">${pet?.pet_name || 'Pet Name'}</p>
                <p class="text-sm text-gray-600">${service}</p>
                <p class="text-xs text-gray-500">${date} at ${time}</p>
                <p class="text-xs text-gray-500">Customer: ${customerName}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    renderPagination(pagination, page, Math.ceil(count / limit), loadUpcomingAppointments);

  } catch (error) {
    console.error('Error loading upcoming appointments:', error);
    container.innerHTML = `<p class="text-sm text-red-500">Failed to load upcoming appointments.</p>`;
  }
}

// Load Appointments
async function loadAppointments(status = 'pending', page = 1) {
  const container = document.getElementById('appointmentsList');
  if (!container) return;

  container.innerHTML = `<p class="text-sm text-gray-500">Loading appointments...</p>`;

  try {
    const offset = (page - 1) * ITEMS_PER_PAGE;
    const { data: appointments, error, count } = await supabase
      .from('appointments')
      .select(`
        *,
        pets!inner (
          pet_name,
          image_url,
          species,
          users_table!inner (
            first_name,
            last_name
          )
        ),
        services!inner (
          name
        )
      `, { count: 'exact' })
      .eq('status', status)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4">
          <p class="text-sm text-gray-500">No ${status} appointments found.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = appointments.map(app => {
      const pet = app.pets;
      const service = app.services?.name || 'Service';
      const date = formatDate(app.appointment_date);
      const time = formatTime(app.appointment_time);
      const imageUrl = getPetImage(pet);
      const customerName = `${pet.users_table.first_name} ${pet.users_table.last_name}`;

      return `
        <div class="flex items-start gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <img src="${imageUrl}" alt="${pet?.pet_name}" class="w-12 h-12 rounded-full object-cover border">
          <div class="flex-1">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-semibold text-gray-800">${pet?.pet_name || 'Pet Name'}</p>
                <p class="text-sm text-gray-600">${service}</p>
                <p class="text-xs text-gray-500">${date} at ${time}</p>
                <p class="text-xs text-gray-500">Customer: ${customerName}</p>
              </div>
              <div class="flex gap-2">
                ${status === 'pending' ? `
                  <button onclick="handleAppointmentAction('${app.appointment_id}', 'accept')" 
                    class="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded">
                    Accept
                  </button>
                  <button onclick="handleAppointmentAction('${app.appointment_id}', 'cancel')" 
                    class="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">
                    Cancel
                  </button>
                ` : ''}
                ${status === 'accepted' ? `
                  <button onclick="handleAppointmentAction('${app.appointment_id}', 'cancel')" 
                    class="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">
                    Cancel
                  </button>
                  <button onclick="handleAppointmentAction('${app.appointment_id}', 'reschedule')" 
                    class="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                    Reschedule
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Update pagination
    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
    state.totalPages = totalPages;
    state.currentPage = page;

    const paginationContainer = document.getElementById('appointmentsPagination');
    if (paginationContainer) {
      renderPagination(paginationContainer, page, totalPages, (newPage) => {
        loadAppointments(status, newPage);
      });
    }

  } catch (error) {
    console.error('Error loading appointments:', error);
    container.innerHTML = `
      <div class="text-center py-4">
        <p class="text-sm text-red-500">Failed to load appointments.</p>
      </div>
    `;
  }
}

// Appointment Actions
async function handleAppointmentAction(appointmentId, action) {
  try {
    const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
      .select(`
        *,
        pets!inner (
          pet_name,
          owner_id,
          users_table!inner (
            id,
            first_name,
            last_name
          )
        ),
        services!inner (
          service_name
        )
      `)
      .eq('appointment_id', appointmentId)
      .single();

    if (fetchError) throw fetchError;
    if (!appointment || !appointment.pets || !appointment.pets.owner_id) {
      throw new Error('Invalid appointment data');
    }

    const { newStatus, notificationType, notificationData } = getActionDetails(action, appointment);

    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('appointment_id', appointmentId);

    if (updateError) throw updateError;

    await NotificationService.sendNotification(
      appointment.pets.owner_id,
      notificationType,
      notificationData
    );

    await loadDashboard();
  } catch (error) {
    showError('Failed to process appointment action. Please try again.');
  }
}

// Inventory Management
async function checkLowStock() {
  try {
    const { data: lowStockItems, error } = await supabase
      .from('inventory')
            .select('*')
      .lt('quantity', 'minimum_stock');

    if (error) throw error;

    for (const item of lowStockItems) {
      await NotificationService.sendNotificationToAdmins(
        NOTIFICATION_TYPES.LOW_STOCK,
        {
          itemName: item.item_name,
          currentStock: item.quantity,
          minimumStock: item.minimum_stock
        }
      );
    }
  } catch (error) {
    showError('Failed to check low stock items.');
  }
}

// Utility Functions
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':');
  const h = parseInt(hour);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getPetImage(pet) {
  if (pet?.image_url && pet.image_url.startsWith('http')) {
    return pet.image_url;
  }
  return `../assets/images/${pet?.species === 'dog' ? 'defaultDogIcon.png' : 'defaultCatIcon.png'}`;
}

function renderPagination(container, currentPage, totalPages, callback) {
  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '◀';
  prevBtn.className = `px-3 py-1 border rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-gray-100'}`;
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) callback(currentPage - 1);
  };

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '▶';
  nextBtn.className = `px-3 py-1 border rounded ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-gray-100'}`;
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) callback(currentPage + 1);
  };

  container.appendChild(prevBtn);
  container.appendChild(nextBtn);
}

function getActionDetails(action, appointment) {
  const customerName = `${appointment.pets.users_table.first_name} ${appointment.pets.users_table.last_name}`;
  const baseData = {
    customerName,
    petName: appointment.pets.pet_name,
    serviceName: appointment.services.service_name,
    date: appointment.appointment_date,
    time: appointment.appointment_time
  };

  switch (action) {
    case 'accept':
      return {
        newStatus: 'accepted',
        notificationType: NOTIFICATION_TYPES.APPOINTMENT_ACCEPTED,
        notificationData: baseData
      };
    case 'cancel':
      return {
        newStatus: 'cancelled',
        notificationType: NOTIFICATION_TYPES.APPOINTMENT_CANCELLED,
        notificationData: baseData
      };
    case 'reschedule':
      return {
        newStatus: 'rescheduled',
        notificationType: NOTIFICATION_TYPES.RESCHEDULE_ACCEPTED,
        notificationData: {
          ...baseData,
          oldDate: appointment.appointment_date,
          oldTime: appointment.appointment_time,
          newDate: appointment.new_date,
          newTime: appointment.new_time
        }
      };
    default:
      throw new Error('Invalid action');
  }
}

function showError(message) {
  const alert = document.createElement("div");
  alert.className = "fixed top-4 right-4 p-4 rounded-lg shadow-lg bg-red-100 text-red-800";
  alert.textContent = message;
  document.body.appendChild(alert);

  setTimeout(() => {
    alert.style.opacity = "0";
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

// Modal Management
window.openProceedModal = async function(appointmentId) {
  try {
    const modal = document.getElementById('proceedModal');
    const appointmentDetails = document.getElementById('appointmentDetails');
    
    // Show loading state
    appointmentDetails.innerHTML = '<p class="text-sm text-gray-500">Loading appointment details...</p>';
    modal.classList.remove('hidden');

    // Fetch appointment details
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        pets!inner (
          pet_name,
          image_url,
          species,
          users_table!inner (
            first_name,
            last_name
          )
        ),
        services!inner (
          name,
          price
        )
      `)
      .eq('appointment_id', appointmentId)
      .single();

    if (error) throw error;

    // Populate appointment details
    populateAppointmentDetails(appointment);

    // Load services and products
    await loadServices();
    await loadProducts();

    // Initialize billing list
    initializeBillingList(appointment);

  } catch (error) {
    console.error('Error opening proceed modal:', error);
    showError('Failed to load appointment details');
  }
};

function populateAppointmentDetails(appointment) {
  const appointmentDetails = document.getElementById('appointmentDetails');
  const pet = appointment.pets;
  const service = appointment.services;
  const customerName = `${pet.users_table.first_name} ${pet.users_table.last_name}`;
  const imageUrl = getPetImage(pet);

  appointmentDetails.innerHTML = `
    <div class="flex items-start gap-4">
      <img src="${imageUrl}" alt="${pet.pet_name}" class="w-16 h-16 rounded-full object-cover border">
      <div>
        <h3 class="font-semibold text-lg">${pet.pet_name}</h3>
        <p class="text-sm text-gray-600">${service.name}</p>
        <p class="text-sm text-gray-500">Customer: ${customerName}</p>
        <p class="text-sm text-gray-500">Date: ${formatDate(appointment.appointment_date)}</p>
        <p class="text-sm text-gray-500">Time: ${formatTime(appointment.appointment_time)}</p>
      </div>
    </div>
  `;
}

async function loadServices() {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .order('name');

    if (error) throw error;

    const serviceSelect = document.getElementById('serviceSelect');
    serviceSelect.innerHTML = '<option value="">-- Select a Service --</option>' +
      services.map(service => `
        <option value="${service.service_id}" data-price="${service.price}">
          ${service.name} - ₱${service.price}
        </option>
      `).join('');

  } catch (error) {
    console.error('Error loading services:', error);
    showError('Failed to load services');
  }
}

async function loadProducts() {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) throw error;

    const productSelect = document.getElementById('productSelect');
    productSelect.innerHTML = '<option value="">-- Select a Product --</option>' +
      products.map(product => `
        <option value="${product.product_id}" data-price="${product.price}">
          ${product.item_name} - ₱${product.price}
        </option>
      `).join('');

  } catch (error) {
    console.error('Error loading products:', error);
    showError('Failed to load products');
  }
}

function initializeBillingList(appointment) {
  const billingList = document.getElementById('billingList');
  const billingTotal = document.getElementById('billingTotal');
  
  // Add initial service to billing
  const service = appointment.services;
  const price = parseFloat(service.price) || 0;
  
  billingList.innerHTML = `
    <li class="flex justify-between items-center">
      <span>${service.name}</span>
      <span>₱${price.toFixed(2)}</span>
    </li>
  `;
  billingTotal.textContent = price.toFixed(2);
}

// Event Listeners Setup
function setupModalEventListeners() {
  // Add Service Button
  document.getElementById('addServiceBtn').addEventListener('click', () => {
    const serviceSelect = document.getElementById('serviceSelect');
    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
    
    if (!serviceSelect.value) {
      showError('Please select a service');
      return;
    }

    const billingList = document.getElementById('billingList');
    const billingTotal = document.getElementById('billingTotal');
    
    // Add service to billing list
    billingList.innerHTML += `
      <li class="flex justify-between items-center">
        <span>${selectedOption.text}</span>
        <span>₱${selectedOption.dataset.price}</span>
      </li>
    `;

    // Update total
    const currentTotal = parseFloat(billingTotal.textContent);
    const newTotal = currentTotal + parseFloat(selectedOption.dataset.price);
    billingTotal.textContent = newTotal.toFixed(2);

    // Reset selection
    serviceSelect.value = '';
  });

  // Add Product Button
  document.getElementById('addProductBtn').addEventListener('click', () => {
    const productSelect = document.getElementById('productSelect');
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    
    if (!productSelect.value) {
      showError('Please select a product');
      return;
    }

    const billingList = document.getElementById('billingList');
    const billingTotal = document.getElementById('billingTotal');
    
    // Add product to billing list
    billingList.innerHTML += `
      <li class="flex justify-between items-center">
        <span>${selectedOption.text}</span>
        <span>₱${selectedOption.dataset.price}</span>
      </li>
    `;

    // Update total
    const currentTotal = parseFloat(billingTotal.textContent);
    const newTotal = currentTotal + parseFloat(selectedOption.dataset.price);
    billingTotal.textContent = newTotal.toFixed(2);

    // Reset selection
    productSelect.value = '';
  });

  // Cancel Button
  document.getElementById('cancelBillingBtn').addEventListener('click', () => {
    const modal = document.getElementById('proceedModal');
    modal.classList.add('hidden');
    // Reset form
    document.getElementById('billingList').innerHTML = '';
    document.getElementById('billingTotal').textContent = '0.00';
    document.getElementById('serviceSelect').value = '';
    document.getElementById('productSelect').value = '';
  });

  // Complete Button
  document.getElementById('completeBillingBtn').addEventListener('click', async () => {
    try {
      const paymentMethod = document.getElementById('paymentMethodSelect').value;
      const total = document.getElementById('billingTotal').textContent;
      
      // Here you would typically:
      // 1. Create a transaction record
      // 2. Update inventory
      // 3. Send receipt
      // 4. Close modal
      
      showError('Transaction completed successfully!');
      document.getElementById('proceedModal').classList.add('hidden');
      
      // Reload dashboard to reflect changes
      loadDashboard();
      
    } catch (error) {
      console.error('Error completing transaction:', error);
      showError('Failed to complete transaction');
    }
  });
}

// Export functions that need to be accessed from other files
export {
  handleAppointmentAction,
  checkLowStock,
  loadDashboard
};