'use strict';

import supabase from "../supabaseClient.js";

let userId = null;
let appointmentChannel = null;
let debounceTimer;
let currentTab = 'pending';

const pageSize = 5;

const paginationState = {
  pending: { page: 1 },
  accepted: { page: 1 },
  cancelled: { page: 1 }
};

const elements = {
  petSelect: document.getElementById("pet-select"),
  appointmentDate: document.getElementById("appointment-date"),
  appointmentTime: document.getElementById("appointment-time"),
  confirmBookingBtn: document.getElementById("confirm-booking"),
  bookNowBtn: document.getElementById("book-now"),
  bookingModal: document.getElementById("booking-modal"),
  refreshBookingBtn: document.getElementById("refresh-booking"),
  categorySelect: document.getElementById("category-select"),
  serviceSelect: document.getElementById("service-select"),
  addPetBtn: document.getElementById("add-pet"),
  appointmentsContainer: document.getElementById("appointmentsContainer"),
  noAppointmentsMessage: document.getElementById("noAppointmentsMessage"),
  tabButtons: document.querySelectorAll('.tab-button')
};

let currentAppointments = [];

const BUSINESS_HOURS = Array.from({ length: 21 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2); 
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`; 
});

document.addEventListener("DOMContentLoaded", async () => {
  userId = await getUserId();
  
  if (!userId) {
    console.error("User not authenticated");
    window.location.href = "../index.html";
    return;
  }

  initializeDateRestrictions();
  await loadInitialData();
  setupEventListeners();
  setupRealtimeUpdates();
  setupTabNavigation();
});

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

function initializeDateRestrictions() {
  const today = new Date();
  const allowedStartDate = new Date(today);
  allowedStartDate.setDate(today.getDate() + 15);

  const formatDate = (date) => date.toISOString().split("T")[0];

  elements.appointmentDate.setAttribute("min", formatDate(allowedStartDate));
}

async function loadInitialData() {
  await Promise.all([
    loadCategoriesAndServices(),
    loadPets(),
    loadAppointments()
  ]);
}

function setupTabNavigation() {
  elements.tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      elements.tabButtons.forEach(btn => {
        btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        btn.classList.add('text-gray-600', 'hover:text-blue-600');
      });
      this.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
      this.classList.remove('text-gray-600', 'hover:text-blue-600');
      currentTab = this.getAttribute('data-tab');
      paginationState[currentTab].page = 1;
      loadAppointments();
    });
  });
}

function setupEventListeners() {
  document.getElementById("close-booking-modal")?.addEventListener("click", () => {
    closeModal("booking-modal");
    resetAndCloseModal();
  });

  document.getElementById("cancel-add-pet")?.addEventListener("click", () => {
    closeModal("add-pet-modal");
    openModal("booking-modal");
  });

  elements.serviceSelect.addEventListener("change", loadAvailableTimes);
  elements.appointmentDate.addEventListener("change", loadAvailableTimes);

  elements.bookNowBtn.addEventListener("click", () => {
    openModal("booking-modal");
  });

  elements.refreshBookingBtn?.addEventListener("click", async () => {
    console.log('Refreshing Appointments...');
    Object.keys(paginationState).forEach(status => paginationState[status].page = 1);
    await loadAppointments();
  });

  elements.addPetBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal("booking-modal");
    openModal("add-pet-modal");

    const handlePetAdded = () => {
      closeModal("add-pet-modal");
      loadPets().then(() => openModal("booking-modal"));
      document.removeEventListener("petAdded", handlePetAdded);
    };

    document.addEventListener("petAdded", handlePetAdded, { once: true });
  });

  elements.confirmBookingBtn.addEventListener("click", handleBookingConfirmation);
}

function setupRealtimeUpdates() {
  if (!appointmentChannel) {
    appointmentChannel = supabase
      .channel('public:appointments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('Appointment change:', payload);
        debounceLoadAppointments();
      })
      .subscribe();
  }
}

function resetAndCloseModal() {
  elements.bookingModal.classList.add("hidden");
  elements.categorySelect.value = "";
  elements.serviceSelect.innerHTML = '<option value="" disabled selected>Select Service</option>';
  elements.appointmentDate.value = "";
  elements.appointmentTime.innerHTML = '<option value="" disabled selected>Select Date & Service First</option>';
}

async function handleBookingConfirmation() {
  try {
    const { serviceId, petId, date, time } = getFormValues();
    
    if (!validateForm(serviceId, petId, date, time)) return;
    if (await hasPendingAppointment(petId)) return;

    const time24 = convertTo24Hour(time);
    await createAppointment(serviceId, petId, date, time24);

    await sendBookingNotification(petId, serviceId, date, time);
    
    alert("Appointment booked successfully!");
    resetAndCloseModal();
    
  } catch (error) {
    console.error("Booking error:", error);
    alert(error.message || "An error occurred while booking.");
  }
}

function getFormValues() {
  return {
    serviceId: elements.serviceSelect.value,
    petId: elements.petSelect.value,
    date: elements.appointmentDate.value,
    time: elements.appointmentTime.value
  };
}

function validateForm(serviceId, petId, date, time) {
  if (!serviceId || !petId || !date || !time) {
    alert("Please fill in all fields before booking.");
    return false;
  }

  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (selectedDate < today) {
    alert("Cannot book appointments in the past.");
    return false;
  }

  return true;
}

async function hasPendingAppointment(petId) {
  const { data: pendingAppointments, error } = await supabase
    .from("appointments")
    .select("appointment_id")
    .eq("pet_id", petId)
    .eq("status", "pending");

  if (error) throw error;
  if (pendingAppointments.length > 0) {
    alert("This pet already has a pending appointment.");
    return true;
  }
  return false;
}

async function createAppointment(serviceId, petId, date, time) {
  const { error } = await supabase.from("appointments").insert([{
    user_id: userId,
    pet_id: petId,
    service_id: serviceId,
    appointment_date: date,
    appointment_time: time,
    status: "pending"
  }]);

  if (error) throw error;
  debounceLoadAppointments();
}

async function sendBookingNotification(petId, serviceId, date, time) {
  const [petName, serviceName] = await Promise.all([ 
    getPetName(petId),
    getServiceName(serviceId)
  ]);

  const adminIds = await getAllAdminIds(); 

  if (!adminIds || adminIds.length === 0) {
    console.error("No admin found to send notifications.");
    return;
  }

  for (const adminId of adminIds) {
    const { error } = await supabase.from("notifications").insert([{
      recipient_id: adminId, 
      message: `New appointment booked for ${petName} (${serviceName}) on ${date} at ${time}`,
      status: 'unread'
    }]);

    if (error) {
      console.error(`Notification error for admin ${adminId}:`, error);
    } else {
      console.log(`Notification sent to admin ${adminId}`);
    }
  }
}

async function notifyAdminsCancelPending(petId, serviceId, date, time) {
  const [petName, serviceName, adminIds] = await Promise.all([
    getPetName(petId),
    getServiceName(serviceId),
    getAllAdminIds()
  ]);

  if (!adminIds || adminIds.length === 0) {
    console.error("No admin found to send cancel-pending notification.");
    return;
  }

  const message = `Pending appointment for ${petName} (${serviceName}) on ${date} at ${time} was canceled by the customer.`;

  for (const adminId of adminIds) {
    const { error } = await supabase.from("notifications").insert([{
      recipient_id: adminId,
      message,
      status: 'unread'
    }]);

    if (error) console.error(`Notification error for admin ${adminId}:`, error);
  }
}

async function notifyAdminsCancelAccepted(petId, serviceId, date, time) {
  const [petName, serviceName, adminIds] = await Promise.all([
    getPetName(petId),
    getServiceName(serviceId),
    getAllAdminIds()
  ]);

  if (!adminIds || adminIds.length === 0) {
    console.error("No admin found to send cancel-accepted notification.");
    return;
  }

  const message = `Accepted appointment for ${petName} (${serviceName}) on ${date} at ${time} was canceled by the customer.`;

  for (const adminId of adminIds) {
    const { error } = await supabase.from("notifications").insert([{
      recipient_id: adminId,
      message,
      status: 'unread'
    }]);

    if (error) console.error(`Notification error for admin ${adminId}:`, error);
  }
}

async function notifyAdminsRescheduleRequest(petId, serviceId, oldDate, oldTime, newDate, newTime) {
  const [petName, serviceName] = await Promise.all([
    getPetName(petId),
    getServiceName(serviceId)
  ]);

  const adminIds = await getAllAdminIds();

  if (!adminIds || adminIds.length === 0) {
    console.error("No admin found to send notifications.");
    return;
  }

  for (const adminId of adminIds) {
    const { error } = await supabase.from("notifications").insert([{
      recipient_id: adminId,
      message: `<strong>${petName}</strong> (<strong>${serviceName}</strong>) requested to reschedule from <strong>${oldDate} ${oldTime}</strong> to <strong>${newDate} ${newTime}</strong>. <a href="/appointments/${petId}" target="_blank" style="color: blue; text-decoration: underline;">View</a>`,
      status: 'unread'
    }]);

    if (error) {
      console.error(`Notification error for admin ${adminId}:`, error);
    } else {
      console.log(`Reschedule notification sent to admin ${adminId}`);
    }
  }
}

async function getAllAdminIds() {
  const { data, error } = await supabase
    .from('users_table')
    .select('id')  
    .eq('role', 'admin');  

  if (error) {
    console.error('Error fetching admin IDs:', error);
    return [];
  }

  return data.map(admin => admin.id);  
}

async function loadAppointments() {
  try {
    if (currentTab === 'pending') {
      await autoCancelOldPendingAppointments();
    }

    const page = paginationState[currentTab].page;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: appointments, error, count } = await supabase
      .from("appointments")
      .select(`
        appointment_id,
        appointment_date,
        appointment_time,
        created_at,
        status,
        pet_id,
        service_id,
        pets(pet_name),
        services(name)
      `, { count: "exact" })
      .eq("user_id", userId)
      .in("status", currentTab === 'pending' ? ['pending', 'rescheduled'] : [currentTab])
      .order("appointment_date", { ascending: true })
      .range(from, to);

    if (error) throw error;

    if (appointments.length > 0) {
      elements.noAppointmentsMessage.classList.add('hidden');
      currentAppointments = appointments;
      renderAppointments(appointments);
    } else {
      elements.noAppointmentsMessage.classList.remove('hidden');
      elements.appointmentsContainer.innerHTML = '<div class="text-center text-gray-500 mt-16">No appointments found.</div>';
    }

    renderPagination(count);

  } catch (error) {
    console.error("Error loading appointments:", error);
    alert("Failed to load appointments. Please try again.");
  }
}

function renderAppointments(appointments) {
  let html = '';
  const today = new Date();

  appointments.forEach(app => {
    const petName = app.pets?.pet_name || "Unknown Pet";
    const serviceName = app.services?.name || "Unknown Service";
    const formattedDate = formatDate(app.appointment_date);
    const formattedTime = convertToAMPM(app.appointment_time);
    const appointmentDate = new Date(app.appointment_date);
    const daysUntilAppointment = Math.ceil((appointmentDate - today) / (1000 * 60 * 60 * 24));

    html += `
      <div class="bg-gray-50 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div class="mb-2 md:mb-0">
          <h3 class="font-semibold">${serviceName}</h3>
          <p class="text-sm text-gray-600">${petName} • ${formattedDate} at ${formattedTime}</p>
            ${app.status === 'pending' || app.status === 'rescheduled' ? `
              <p class="text-xs mt-1 italic ${app.status === 'pending' ? 'text-yellow-700' : 'text-blue-600'}">
                ${app.status === 'pending' ? 'Wait for staff to accept your booking.' : 'Reschedule request sent. Waiting for approval.'}
              </p>` : ''
            }
          ${app.status === 'accepted' ? `
            <p class="text-xs text-yellow-700 mt-1">
              We are excited to see you on your appointed date!
            </p>
          ` : ''
          }
        </div>
        <div class="flex gap-2">`;

    if (app.status === 'pending') {
      html += `
        <button class="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200" data-details='${JSON.stringify(app)}'>
          Details
        </button>
        <button class="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200" data-id="${app.appointment_id}">
          Cancel
        </button>`;
    }

    if (app.status === 'accepted' && !app.original_appointment_date) {
      if (daysUntilAppointment > 7) {
        html += `
          <button class="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200" data-details='${JSON.stringify(app)}'>
            Details
          </button>
          <button class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200" data-resched="${app.appointment_id}">
            Reschedule
          </button>
          <button class="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200" data-id="${app.appointment_id}">
            Cancel
          </button>`;
      } else {
        html += `<span class="text-sm text-gray-500 italic">Appointment cannot be changed within 7 days.</span>`;
      }
    }

    if (app.status === 'cancelled') {
      html += `
        <button class="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200" disabled>
          Cancelled
        </button>`;
    }

    html += `</div></div>`;
  });

  elements.appointmentsContainer.innerHTML = html;

  document.querySelectorAll('[data-id]').forEach(button => {
    button.addEventListener('click', function () {
      const appointmentId = this.getAttribute('data-id');
      cancelAppointment(appointmentId);
    });
  });

  document.querySelectorAll('[data-resched]').forEach(button => {
    button.addEventListener('click', function () {
      const appointmentId = this.getAttribute('data-resched');
      const appData = currentAppointments.find(app => app.appointment_id == appointmentId);
      if (!appData) return;

      document.getElementById('resched-service-name').textContent = appData.services?.name || 'N/A';
      document.getElementById('resched-current').textContent = `${formatDate(appData.appointment_date)} at ${convertToAMPM(appData.appointment_time)}`;
      document.getElementById('resched-date').dataset.originalDate = appData.appointment_date;
      document.getElementById('resched-date').value = '';
      document.getElementById('resched-time').innerHTML = `<option value="" disabled selected>Select date first</option>`;
      document.getElementById('reschedule-modal').classList.remove('hidden');
      document.getElementById('confirm-reschedule').dataset.id = appointmentId;
    });
  });

  document.getElementById('cancel-reschedule').addEventListener('click', () => {
    document.getElementById('reschedule-modal').classList.add('hidden');
  });

  document.getElementById('resched-date').addEventListener('focus', function () {
    const input = this;
    const originalDate = new Date(input.dataset.originalDate);
    const today = new Date();

    const minDate = originalDate > today ? originalDate : today;
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 60);

    input.min = minDate.toISOString().split('T')[0];
    input.max = maxDate.toISOString().split('T')[0];
  });

  document.getElementById('resched-date').addEventListener('change', async (e) => {
    const selectedDate = e.target.value;
    const serviceName = document.getElementById('resched-service-name').textContent;

    const timeOptions = await getAvailableTimes(selectedDate, serviceName);
    const timeSelect = document.getElementById('resched-time');
    timeSelect.innerHTML = '';
    timeOptions.forEach(time => {
      timeSelect.innerHTML += `<option value="${time}">${convertToAMPM(time)}</option>`;
    });
  });

  
}

document.getElementById('confirm-reschedule').addEventListener('click', async () => {
  const button = document.getElementById('confirm-reschedule');
  const id = button.dataset.id;
  const newDate = document.getElementById('resched-date').value;
  const newTime = document.getElementById('resched-time').value;

  if (!newDate || !newTime) return alert("Please select a new date and time.");

  button.disabled = true;

  const { data: appt, error: fetchErr } = await supabase
    .from('appointments')
    .select('appointment_date, appointment_time, original_appointment_date, original_appointment_time')
    .eq('appointment_id', Number(id))
    .single();

  console.log("Fetched appointment:", appt);

  if (fetchErr) {
    alert("Failed to fetch original appointment.");
    console.error(fetchErr.message);
    button.disabled = false;
    return;
  }

  const updates = {
    appointment_date: newDate,
    appointment_time: newTime,
    status: 'rescheduled',
  };

  if (!appt.original_appointment_date || !appt.original_appointment_time) {
    updates.original_appointment_date = appt.appointment_date;
    updates.original_appointment_time = appt.appointment_time;
  }

  const { error: updateErr } = await supabase
    .from('appointments')
    .update(updates)
    .eq('appointment_id', id);

  if (updateErr) {
    alert("Failed to reschedule.");
    console.error("Reschedule error:", updateErr.message);
    button.disabled = false;
    return;
  }

  const { data: apptDetails, error: detailsError } = await supabase
    .from('appointments')
    .select('pet_id, service_id')
    .eq('appointment_id', id)
    .single();

  if (detailsError || !apptDetails) {
    console.error("Failed to fetch pet/service for notification:", detailsError);
  } else {
    await notifyAdminsRescheduleRequest(
      apptDetails.pet_id,
      apptDetails.service_id,
      appt.original_appointment_date || appt.appointment_date,
      appt.original_appointment_time || appt.appointment_time,
      newDate,
      newTime
    );
  }

  alert("Reschedule request sent.");
  document.getElementById('reschedule-modal').classList.add('hidden');
  loadAppointments();
});


function renderPagination(totalCount) {
  const paginationContainer = document.getElementById("pagination");
  paginationContainer.innerHTML = "";

  const currentPage = paginationState[currentTab].page;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages <= 1) {
    paginationContainer.classList.add("hidden");
    return;
  }

  paginationContainer.classList.remove("hidden");

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Previous";
  prevBtn.className = "px-3 py-1 bg-gray-200 rounded hover:bg-gray-300";
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      paginationState[currentTab].page--;
      loadAppointments();
    }
  });

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.className = "px-3 py-1 bg-gray-200 rounded hover:bg-gray-300";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      paginationState[currentTab].page++;
      loadAppointments();
    }
  });

  const info = document.createElement("span");
  info.className = "px-2 py-1 text-sm text-gray-700";
  info.textContent = `Page ${currentPage} of ${totalPages}`;

  paginationContainer.appendChild(prevBtn);
  paginationContainer.appendChild(info);
  paginationContainer.appendChild(nextBtn);
}

async function loadAvailableTimes() {
  const serviceId = elements.serviceSelect.value;
  const date = elements.appointmentDate.value;

  if (!serviceId || !date) {
    populateTimeDropdown([], "Select date & service first");
    return;
  }

  try {
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("appointment_time")
      .eq("service_id", serviceId)
      .eq("appointment_date", date)
      .not("status", "eq", "cancelled");

    if (error) throw error;

    const bookedTimes = appointments.map(app => convertToAMPM(app.appointment_time));
    const availableTimes = BUSINESS_HOURS.filter(time => !bookedTimes.includes(time));

    populateTimeDropdown(availableTimes, "No times available");

  } catch (error) {
    console.error("Error loading times:", error);
    populateTimeDropdown([], "Error loading times");
  }
}

async function autoCancelOldPendingAppointments() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: oldAppointments, error } = await supabase
      .from("appointments")
      .select("appointment_id, appointment_date, created_at")
      .eq("status", "pending")
      .eq("user_id", userId);

    if (error) throw error;

    const toCancel = oldAppointments.filter(app => {
      const createdAt = new Date(app.created_at);
      return createdAt <= sevenDaysAgo;
    });

    if (toCancel.length > 0) {
      const ids = toCancel.map(a => a.appointment_id);
      await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .in("appointment_id", ids);

      console.log("Auto-cancelled:", ids.length, "appointment(s).");
    }
  } catch (err) {
    console.error("Error in auto-cancel logic:", err);
  }
}

function populateTimeDropdown(times, emptyMessage) {
  elements.appointmentTime.innerHTML = "";

  if (!times.length) {
    const option = document.createElement("option");
    option.disabled = true;
    option.selected = true;
    option.textContent = emptyMessage;
    elements.appointmentTime.appendChild(option);
    return;
  }

  times.forEach(time => {
    const option = document.createElement("option");
    option.value = time;
    option.textContent = convertToAMPM(time);
    elements.appointmentTime.appendChild(option);
  });
}

async function loadCategoriesAndServices() {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, category");

  if (error) {
    console.error("Error loading services:", error);
    return;
  }

  const categoryMap = data.reduce((map, service) => {
    const category = service.category || "Others";
    if (!map.has(category)) map.set(category, []);
    map.get(category).push(service);
    return map;
  }, new Map());

  elements.categorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
  categoryMap.forEach((services, category) => {
    elements.categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
  });

  elements.categorySelect.addEventListener("change", () => {
    const services = categoryMap.get(elements.categorySelect.value) || [];
    elements.serviceSelect.innerHTML = '<option value="" disabled selected>Select Service</option>';
    services.forEach(service => {
      elements.serviceSelect.innerHTML += `<option value="${service.id}">${service.name}</option>`;
    });
    loadAvailableTimes();
  });
}

async function loadPets() {
  const { data, error } = await supabase
    .from("pets")
    .select("id, pet_name")
    .eq("owner_id", userId);

  if (error) {
    console.error("Error loading pets:", error);
    return;
  }

  elements.petSelect.innerHTML = '<option value="" disabled selected>Select Your Pet</option>';
  
  if (!data.length) {
    elements.petSelect.innerHTML += '<option disabled>No pets found</option>';
    return;
  }

  data.forEach(pet => {
    const option = document.createElement("option");
    option.value = pet.id;
    option.textContent = pet.pet_name;
    elements.petSelect.appendChild(option);
  });
}

function convertToAMPM(timeStr) {
  if (!timeStr) return "";

  const [hourStr, minuteStr] = timeStr.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr.padStart(2, '0');
  const ampm = hour >= 12 ? "PM" : "AM";

  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${ampm}`;
}

function convertTo24Hour(timeAMPM) {
  if (!timeAMPM) return "";
  const [time, period] = timeAMPM.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (period === 'PM' && hours !== '12') {
    hours = String(+hours + 12);
  } else if (period === 'AM' && hours === '12') {
    hours = '00';
  }
  
  return `${hours.padStart(2, '0')}:${minutes}:00`;
}

async function getAvailableTimes(date, serviceName) {
  const { data: serviceData, error: serviceError } = await supabase
    .from("services")
    .select("id")
    .eq("name", serviceName)
    .single();

  if (serviceError || !serviceData) {
    console.error("Service lookup failed:", serviceError?.message);
    return [];
  }

  const serviceId = serviceData.id;
  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("appointment_time, status")
    .eq("service_id", serviceId)
    .eq("appointment_date", date)
    .not("status", "in", '("cancelled","no show")');

  if (appointmentsError || !appointments) {
    console.error("Appointment fetch error:", appointmentsError?.message);
    return [];
  }

  const validAppointments = appointments.filter(app =>
    app.status !== "cancelled" && app.status !== "no show"
  );

  const bookedTimes = validAppointments.map(app => convertToAMPM(app.appointment_time));
  return BUSINESS_HOURS.filter(time => !bookedTimes.includes(time));
}

async function getPetName(petId) {
  const { data } = await supabase
    .from("pets")
    .select("pet_name")
    .eq("id", petId)
    .single();
  return data?.pet_name || "Unknown";
}

async function getServiceName(serviceId) {
  const { data } = await supabase
    .from("services")
    .select("name")
    .eq("id", serviceId)
    .single();
  return data?.name || "Unknown";
}

async function cancelAppointment(appointmentId) {
  if (!appointmentId || !confirm("Are you sure you want to cancel this appointment?")) return;

  const { data: appointment, error: fetchError } = await supabase
    .from("appointments")
    .select("pet_id, service_id, appointment_date, appointment_time, status")
    .eq("appointment_id", appointmentId)
    .single();

  if (fetchError || !appointment) {
    console.error("Fetch appointment error:", fetchError);
    alert("Error fetching appointment details.");
    return;
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("appointment_id", appointmentId);

  if (error) {
    console.error("Cancel error:", error);
    alert("Error cancelling appointment.");
    return;
  }

  const { pet_id, service_id, appointment_date, appointment_time, status } = appointment;

  if (status === "pending") {
    await notifyAdminsCancelPending(pet_id, service_id, appointment_date, appointment_time);
  } else if (status === "accepted") {
    await notifyAdminsCancelAccepted(pet_id, service_id, appointment_date, appointment_time);
  }

  alert("Appointment cancelled successfully.");
  debounceLoadAppointments();
}

document.addEventListener("click", (e) => {
  if (e.target.matches("[data-details]")) {
    const app = JSON.parse(e.target.getAttribute("data-details"));
    const modal = document.getElementById("appointment-details-modal");
    const content = document.getElementById("appointment-details-content");

    const formattedDate = formatDate(app.appointment_date);
    const formattedTime = convertToAMPM(app.appointment_time);
    
    const dateBooked = new Date(app.created_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit' 
    });
    

    content.innerHTML = `
      <p><strong>Service:</strong> ${app.services?.name || "N/A"}</p>
      <p><strong>Pet:</strong> ${app.pets?.pet_name || "N/A"}</p>
      <p><strong>Appointment Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${formattedTime}</p>
      <p><strong>Date Booked:</strong> ${dateBooked}</p>
      <p><strong>Status:</strong> ${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</p>
      ${app.status === 'pending' ? `
            <p class="text-xs text-red-700 mt-1">
              Note: If your booking is not accepted in 7 days. The booking is automatically cancelled.
            </p>
          ` : ''
          }
    `;

    modal.classList.remove("hidden");
  }
});

document.getElementById("close-details-modal").addEventListener("click", () => {
  document.getElementById("appointment-details-modal").classList.add("hidden");
});

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function debounceLoadAppointments() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadAppointments, 500);
}

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    console.error("Authentication error:", error?.message || "No user");
    return null;
  }
  return data.user.id;
}

window.cancelAppointment = cancelAppointment;
window.loadAppointments = loadAppointments;