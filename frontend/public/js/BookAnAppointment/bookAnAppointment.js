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

const BUSINESS_HOURS = Array.from({ length: 21 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute} ${period}`;
}).slice(0, -1);

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

async function loadAppointments() {
  try {
    const page = paginationState[currentTab].page;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: appointments, error, count } = await supabase
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
      `, { count: "exact" })
      .eq("user_id", userId)
      .eq("status", currentTab)
      .order("appointment_date", { ascending: true })
      .range(from, to);

    if (error) throw error;

    if (appointments.length > 0) {
      elements.noAppointmentsMessage.classList.add('hidden');
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
          ${app.status === 'pending' ? `
            <p class="text-xs text-yellow-700 mt-1">
              Wait for staff to accept your booking. 
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

    if (app.status === 'accepted') {
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

    html += `
        </div>
      </div>`;
  });

  elements.appointmentsContainer.innerHTML = html;

  // Add listeners
  document.querySelectorAll('[data-id]').forEach(button => {
    button.addEventListener('click', function () {
      const appointmentId = this.getAttribute('data-id');
      cancelAppointment(appointmentId);
    });
  });

  document.querySelectorAll('[data-resched]').forEach(button => {
    button.addEventListener('click', function () {
      alert("Reschedule clicked. Implement logic here later.");
      // Future: Open reschedule modal here
    });
  });
}

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

document.addEventListener("click", (e) => {
  if (e.target.matches("[data-details]")) {
    const app = JSON.parse(e.target.getAttribute("data-details"));
    const modal = document.getElementById("appointment-details-modal");
    const content = document.getElementById("appointment-details-content");

    const formattedDate = formatDate(app.appointment_date);
    const formattedTime = convertToAMPM(app.appointment_time);

    content.innerHTML = `
      <p><strong>Service:</strong> ${app.services?.name || "N/A"}</p>
      <p><strong>Pet:</strong> ${app.pets?.pet_name || "N/A"}</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${formattedTime}</p>
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