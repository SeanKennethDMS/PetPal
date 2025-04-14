'use strict';

import supabase from "../supabaseClient.js";

// GLOBAL VARIABLES
let userId = null;
let appointmentChannel = null;
let debounceTimer;

const paginationState = {
  pending: { page: 1 },
  accepted: { page: 1 },
  cancelled: { page: 1 }
};

// DOM ELEMENTS
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
  addPetBtn: document.getElementById("add-pet")
};

// BUSINESS HOURS (8AM-6PM in 30-minute increments)
const BUSINESS_HOURS = Array.from({ length: 21 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute} ${period}`;
}).slice(0, -1);

// INITIALIZATION
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

function setupEventListeners() {
  // Bind the cancel button of the Booking Modal with new unique id "close-booking-modal"
  document.getElementById("close-booking-modal")?.addEventListener("click", () => {
    closeModal("booking-modal");
    resetAndCloseModal();
  });

  // Bind the cancel button inside the Add Pet Modal
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

  document.addEventListener('click', (e) => {
    const cancelBtn = e.target.closest('.cancel-btn');
    if (cancelBtn) {
      const appointmentId = cancelBtn.dataset.appointmentId;
      cancelAppointment(appointmentId);
    }
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
    
    alert("Appointment booked successfully!");
    resetAndCloseModal();
    await sendBookingNotification(petId, serviceId, date, time);
    
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

  const { error } = await supabase.from("notifications").insert([{
    user_id: null,
    message: `New appointment booked for ${petName} (${serviceName}) on ${date} at ${time}`,
    is_read: false
  }]);

  if (error) console.error("Notification error:", error);
}

// DATA LOADING FUNCTIONS
async function loadAppointments() {
  try {
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        appointment_id,
        appointment_date,
        appointment_time,
        status,
        pet_id,
        service_id,
        pets(pet_name),
        services(name)
      `)
      .eq("user_id", userId)
      .order("appointment_date", { ascending: true });

    if (error) throw error;

    clearAppointmentLists();

    const statusGroups = appointments.reduce((groups, app) => {
      const status = app.status;
      if (!groups[status]) groups[status] = [];
      groups[status].push(app);
      return groups;
    }, {});

    Object.entries(statusGroups).forEach(([status, apps]) => {
      renderAppointments(`${status}-details`, apps, status);
    });

  } catch (error) {
    console.error("Error loading appointments:", error);
    alert("Failed to load appointments. Please try again.");
  }
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
    option.textContent = time;
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

// UTILITY FUNCTIONS
function convertToAMPM(time24) {
  if (!time24) return "";
  const [hours, minutes] = time24.slice(0, 5).split(':');
  const period = +hours >= 12 ? 'PM' : 'AM';
  const hours12 = +hours % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
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

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("appointment_id", appointmentId);

  if (error) {
    console.error("Cancel error:", error);
    alert("Error cancelling appointment.");
    return;
  }

  alert("Appointment cancelled successfully.");
  debounceLoadAppointments();
}

function clearAppointmentLists() {
  ["accepted", "pending", "cancelled"].forEach(status => {
    const element = document.getElementById(`${status}-details`);
    if (element) element.innerHTML = "";
  });
}

async function renderAppointments(containerId, appointments, status) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  const currentPage = paginationState[status]?.page || 1;
  const itemsPerPage = 5;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginated = appointments.slice(startIdx, startIdx + itemsPerPage);

  if (!paginated.length) {
    container.innerHTML = `<p class="text-gray-500 italic">No ${status} appointments.</p>`;
    return;
  }

  for (const appt of paginated) {
    const petName = appt.pets?.pet_name || await getPetName(appt.pet_id);
    const serviceName = appt.services?.name || await getServiceName(appt.service_id);
    const apptDate = new Date(appt.appointment_date).toLocaleDateString();
    const apptTime = appt.appointment_time ? convertToAMPM(appt.appointment_time) : "";

    const apptBox = document.createElement("div");
    apptBox.className = "p-3 bg-white rounded-lg border border-gray-300 mb-2 shadow-sm";
    apptBox.innerHTML = `
      <p><strong>Pet:</strong> ${petName}</p>
      <p><strong>Service:</strong> ${serviceName}</p>
      <p><strong>Date:</strong> ${apptDate}</p>
      ${apptTime ? `<p><strong>Time:</strong> ${apptTime}</p>` : ''}
    `;

    if (status === "pending") {
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "cancel-btn px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 mt-2";
      cancelBtn.textContent = "Cancel";
      cancelBtn.dataset.appointmentId = appt.appointment_id;
      apptBox.appendChild(cancelBtn);
    }

    container.appendChild(apptBox); 
  }

  renderPaginationControls(container, appointments.length, currentPage, status);
}

function renderPaginationControls(container, totalItems, currentPage, status) { 
  const totalPages = Math.ceil(totalItems / 5);
  if (totalItems <= 1) return;

  const nav = document.createElement("div");
  nav.className = "flex justify-center space-x-2 mt-4";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Previous";
  prevBtn.disabled = currentPage === 1;
  prevBtn.className = "px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50";
  prevBtn.addEventListener('click', () => {
    paginationState[status].page--;
    loadAppointments();
  });

  const nextBtn = document.createElement('button');
  nextBtn.textContent = "Next";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.className = "px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50";
  nextBtn.addEventListener('click', () => {
    paginationState[status].page++;
    loadAppointments();
  });

  nav.appendChild(prevBtn);
  nav.appendChild(nextBtn);
  container.appendChild(nav);
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

// Expose to window if needed
window.cancelAppointment = cancelAppointment;
window.loadAppointments = loadAppointments;
