'use strict';

import supabase from "../supabaseClient.js"; // Adjust the path if needed

// GLOBAL VARIABLES
let userId = null;
let appointmentChannel = null;
let debounceTimer;

// DOM ELEMENTS (GLOBAL)
let petSelect;
let appointmentDateInput;
let appointmentTimeInput;
let confirmBookingBtn;
let bookNowBtn;
let closeModalBtn;
let bookingModal;
let refreshBookingBtn;
let categorySelect;
let serviceSelect;

// CONSTANTS
// Updated time slots with 30-minute increments from 8:00 AM to 6:00 PM
const BUSINESS_HOURS = [
  "08:00", "08:30", "09:00", "09:30", 
  "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30"
];

// DOMContentLoaded INIT
document.addEventListener("DOMContentLoaded", async () => {

  userId = await getUserId();
 
  if (!userId) {
    console.error("User ID is missing. Redirecting to login...");
    window.location.href = "../index.html";
    return;
  }

  // Initialize DOM Elements
  petSelect = document.getElementById("pet-select");
  appointmentDateInput = document.getElementById("appointment-date");
  appointmentTimeInput = document.getElementById("appointment-time"); 
  confirmBookingBtn = document.getElementById("confirm-booking");
  bookNowBtn = document.getElementById("book-now");
  closeModalBtn = document.getElementById("close-modal");
  bookingModal = document.getElementById("booking-modal");
  refreshBookingBtn = document.getElementById("refresh-booking");

  categorySelect = document.getElementById("category-select");
  serviceSelect = document.getElementById("service-select");

  // Disable past dates
  const today = new Date().toISOString().split("T")[0];
  appointmentDateInput.setAttribute("min", today);

  // Load data
  await loadCategoriesAndServices();
  await loadPets();
  await loadAppointments();
  
  // Event Listeners
  serviceSelect.addEventListener("change", () => {
    loadAvailableTimes();
  });

  appointmentDateInput.addEventListener("change", () => {
    loadAvailableTimes();
  });

  // Realtime subscription
  if (!appointmentChannel) {
    appointmentChannel = supabase
      .channel('public:appointments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments'
      }, (payload) => {
        console.log('Change received!', payload);
        debounceLoadAppointments();
      })
      .subscribe();
  }

  // Open Booking Modal
  bookNowBtn.addEventListener("click", () => {
    bookingModal.classList.remove("hidden");
  });

  // Close Booking Modal
  closeModalBtn.addEventListener("click", () => {
    bookingModal.classList.add("hidden");
  });

  if (refreshBookingBtn) {
    refreshBookingBtn.addEventListener("click", async () => {
      console.log("Refreshing appointments...");
      await loadAppointments();
    });
  } else {
    console.warn("Refresh Booking button not found");
  }

  // Confirm Booking Button
  confirmBookingBtn.addEventListener("click", async () => {
    const serviceId = serviceSelect.value;
    const petId = petSelect.value;
    const appointmentDate = appointmentDateInput.value;
    const appointmentTime = appointmentTimeInput.value;

    if (!serviceId || !petId || !appointmentDate || !appointmentTime) {
      alert("Please fill in all fields before booking.");
      return;
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(appointmentTime)) {
      alert("Please enter a valid time in HH:mm format.");
      return;
    }

    // Check for pending appointment
    const { data: pendingAppointments, error: pendingError } = await supabase
      .from("appointments")
      .select("appointment_id")
      .eq("pet_id", petId)
      .eq("status", "pending");

    if (pendingError) {
      console.error("Error checking pending appointments:", pendingError);
      alert("An error occurred while checking pending appointments.");
      return;
    }

    if (pendingAppointments.length > 0) {
      alert("This pet already has a pending appointment. Please cancel or complete it first.");
      return;
    }

    const { error } = await supabase.from("appointments").insert([{
      user_id: userId,
      pet_id: petId,
      service_id: serviceId,
      appointment_date: appointmentDate,
      appointment_time: `${appointmentTime}:00`,
      status: "pending"
    }]);

    if (error) {
      alert("Error booking appointment.");
      console.error("Booking error:", error);
      return;
    }

    alert("Appointment booked successfully!");
    bookingModal.classList.add("hidden");
    debounceLoadAppointments();

    // Insert Notification
    const petName = await getPetName(petId);
    const serviceName = await getServiceName(serviceId);

    const { error: notificationError } = await supabase.from("notifications").insert([{
      user_id: null,
      message: `New appointment booked from ${petName} (${serviceName}) on ${appointmentDate} at ${appointmentTime}`,
      is_read: false
    }]);

    if (notificationError) {
      console.error("Error inserting notification:", notificationError.message);
    } else {
      console.log("Notification sent to admin!");
    }
  });

});


// =============== HELPER FUNCTIONS ===============

async function loadAppointments() {
  try {
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("appointment_id, appointment_date, appointment_time, status, pet_id, service_id")
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading appointments:", error);
      return;
    }

    clearAppointmentLists();

    const accepted = appointments.filter(app => app.status === "accepted");
    const pending = appointments.filter(app => app.status === "pending");
    const cancelled = appointments.filter(app => app.status === "cancelled");

    renderAppointments("accepted-details", accepted, "accepted");
    renderAppointments("appointment-details", pending, "pending");
    renderAppointments("cancelled-details", cancelled, "cancelled");

  } catch (err) {
    console.error("Unexpected error loading appointments:", err);
  }
}

async function loadAvailableTimes() {
  const serviceId = serviceSelect.value;
  const appointmentDate = appointmentDateInput.value;

  if (!serviceId || !appointmentDate) {
    populateTimeDropdown([], "Select date & service first");
    return;
  }

  try {
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("appointment_time")
      .eq("service_id", serviceId)
      .eq("appointment_date", appointmentDate)
      .not("status", "eq", "cancelled");

    if (error) {
      console.error("Error fetching appointments:", error);
      populateTimeDropdown([], "Error loading times");
      return;
    }

    const bookedTimes = appointments.map(app => app.appointment_time.slice(0, 5));
    const availableTimes = BUSINESS_HOURS.filter(time => !bookedTimes.includes(time));

    populateTimeDropdown(availableTimes, "No times available");

  } catch (err) {
    console.error("Unexpected error loading times:", err);
    populateTimeDropdown([], "Error loading times");
  }
}

// Helper function to populate time dropdown
function populateTimeDropdown(availableTimes, emptyMessage) {
  appointmentTimeInput.innerHTML = "";
  
  if (availableTimes.length === 0) {
    const option = document.createElement("option");
    option.disabled = true;
    option.selected = true;
    option.textContent = emptyMessage;
    appointmentTimeInput.appendChild(option);
    return;
  }

  availableTimes.forEach(time => {
    const option = document.createElement("option");
    option.value = time;
    option.textContent = time;
    appointmentTimeInput.appendChild(option);
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

  const categoryMap = new Map();

  data.forEach(service => {
    const category = service.category || "Others";
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category).push(service);
  });

  categorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
  categoryMap.forEach((services, category) => {
    categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
  });

  categorySelect.addEventListener("change", () => {
    const selectedCategory = categorySelect.value;
    const services = categoryMap.get(selectedCategory) || [];

    serviceSelect.innerHTML = '<option value="" disabled selected>Select Service</option>';
    services.forEach(service => {
      serviceSelect.innerHTML += `<option value="${service.id}">${service.name}</option>`;
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
  petSelect.innerHTML = '<option value="" disabled selected>Select Your Pet</option>';

  if (data.length === 0) {
    petSelect.innerHTML += '<option disabled>No pets found</option>';
  } else {
    data.forEach(pet => {
      // Use pet.id or pet.pet_id depending on your database structure
      const petId = pet.pet_id || pet.id;
      petSelect.innerHTML += `<option value="${petId}">${pet.pet_name}</option>`;
    });
  }
}


async function getPetName(petId) {
  // Try both pet_id and id columns to handle different column naming
  const { data } = await supabase
    .from("pets")
    .select("pet_name")
    .eq("id", petId)
    .single();
    
  return data ? data.pet_name : "Unknown";
}

async function getServiceName(serviceId) {
  const { data } = await supabase.from("services").select("name").eq("id", serviceId).single();
  return data ? data.name : "Unknown";
}

async function cancelAppointment(appointmentId) {
  console.log("Cancelling appointment ID:", appointmentId);  

  if (!appointmentId) {
    console.error("No appointment ID provided to cancel!");
    return;
  }

  if (!confirm("Are you sure you want to cancel this appointment?")) return;

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("appointment_id", appointmentId);

  if (error) {
    alert("Error cancelling appointment.");
    console.error("Cancel error:", error);
  } else {
    alert("Appointment cancelled successfully.");
    debounceLoadAppointments(); 
  }
}

function clearAppointmentLists() {
  document.getElementById("accepted-details").innerHTML = "";
  document.getElementById("appointment-details").innerHTML = "";
  document.getElementById("cancelled-details").innerHTML = "";
}

async function renderAppointments(containerId, appointments, statusType) {
  const container = document.getElementById(containerId);

  if (!appointments || appointments.length === 0) {
    container.innerHTML = `<p class="text-gray-500 italic">No ${statusType} appointments.</p>`;
    return;
  }

  for (const appointment of appointments) {
    const petName = await getPetName(appointment.pet_id);
    const serviceName = await getServiceName(appointment.service_id);
    
    // Format appointment time to be more readable (optional)
    const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString();
    
    // Get time part from database (if available) or use empty string
    const appointmentTime = appointment.appointment_time ? 
      appointment.appointment_time.substring(0, 5) : "";
    
    const appointmentBox = document.createElement("div");
    appointmentBox.className = "p-3 bg-white rounded-lg border border-gray-300 mb-2 shadow-sm";

    appointmentBox.innerHTML = `
      <p><strong>Pet:</strong> ${petName}</p>
      <p><strong>Service:</strong> ${serviceName}</p>
      <p><strong>Date:</strong> ${appointmentDate}</p>
      ${appointmentTime ? `<p><strong>Time:</strong> ${appointmentTime}</p>` : ''}
    `;

    // Pending appointments get a Cancel button
    if (statusType === "pending") {
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "cancel-btn px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 mt-2";
      cancelBtn.textContent = "Cancel";
      cancelBtn.setAttribute("data-appointment-id", appointment.appointment_id);
      cancelBtn.onclick = function() {
        cancelAppointment(appointment.appointment_id);
      };
      appointmentBox.appendChild(cancelBtn);
    }

    container.appendChild(appointmentBox);
  }
}

function debounceLoadAppointments() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadAppointments();
  }, 500);
}

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    console.error("Error fetching user:", error?.message || "No user data found.");
    return null;
  }
  return data.user.id;
}

window.loadAppointments = loadAppointments;
window.cancelAppointment = cancelAppointment;