'use strict';

import supabase from "../js/supabaseClient.js";

const pendingAppointmentsContainer = document.getElementById("pendingAppointments");
const acceptedAppointmentsContainer = document.getElementById("acceptedAppointments");
const cancelledAppointmentsContainer = document.getElementById("cancelledAppointments");
const completedAppointmentsContainer = document.getElementById("completedAppointments"); // ✅ New container

async function fetchAppointmentsByStatus(status, container) {
  container.innerHTML = `<p class="text-gray-500 italic">Loading ${status} appointments...</p>`;

  const { data, error } = await supabase
    .from("appointments")
    .select(`
        appointment_id,
        appointment_date,
        appointment_time,
        status,
        user_profiles (
        user_id,
        first_name,
        last_name,
        phone_number
        ),
        pets (
        id,
        pet_name
        ),
        services (
        id,
        service_name
        )
    `)
    .eq("status", status)
    .order("appointment_date", { ascending: true });

  if (error) {
    console.error(`Error fetching ${status} appointments:`, error);
    container.innerHTML = `<p class="text-red-500 italic">Error fetching ${status} appointments.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p class="text-gray-500 italic">No ${status} appointments yet.</p>`;
    return;
  }

  container.innerHTML = "";
  data.forEach((appointment) => {
    const item = createAppointmentItem(appointment, status);
    container.prepend(item);
  });
}

// ==============================
// Create Appointment Item Element
// ==============================
function createAppointmentItem(appointment, status) {
  const item = document.createElement("div");
  item.className = "border p-4 rounded shadow bg-gray-50";

  const ownerFirstName = appointment.user_profiles?.first_name || "";
  const ownerLastName = appointment.user_profiles?.last_name || "";
  const ownerName = `${ownerFirstName} ${ownerLastName}`.trim() || "N/A";
  const petName = appointment.pets?.pet_name || "N/A";
  const serviceName = appointment.services?.service_name || "N/A";
  const date = appointment.appointment_date;
  const time = appointment.appointment_time;

  let buttonsHTML = "";

  if (status === "pending") {
    buttonsHTML = `
      <button class="accept-btn bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">Accept</button>
      <button class="cancel-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Cancel</button>
    `;
  }

  if (status === "accepted") {
    buttonsHTML = `
      <button class="complete-btn bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Mark as Completed</button>
    `;
  }

  if (status === "completed") {
    buttonsHTML = `
      <button class="delete-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Delete</button>
    `;
  }

  item.innerHTML = `
    <div class="flex justify-between items-center">
      <div>
        <h4 class="font-bold text-lg">${petName}</h4>
        <p class="text-gray-600 text-sm">Owner: ${ownerName}</p>
        <p class="text-gray-600 text-sm">Date: ${date}</p>
        <p class="text-gray-600 text-sm">Time: ${time}</p>
        <p class="text-gray-600 text-sm">Service: ${serviceName}</p>
      </div>
      <div class="flex gap-2">
        ${buttonsHTML}
      </div>
    </div>
  `;

  // Safely query buttons AFTER setting innerHTML
  const acceptBtn = item.querySelector(".accept-btn");
  const cancelBtn = item.querySelector(".cancel-btn");
  const completeBtn = item.querySelector(".complete-btn");
  const deleteBtn = item.querySelector(".delete-btn");

  if (acceptBtn) {
    acceptBtn.addEventListener("click", () => {
      acceptAppointment(appointment.appointment_id);
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      cancelAppointment(appointment.appointment_id);
    });
  }

  if (completeBtn) {
    completeBtn.addEventListener("click", () => {
      markAsCompleted(appointment.appointment_id);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      deleteAppointment(appointment.appointment_id);
    });
  }

  return item;
}

// ==============================
// Action Buttons (Accept / Cancel / Complete / Delete)
// ==============================
async function acceptAppointment(appointmentId) {
  const { error } = await supabase
    .from("appointments")
    .update({ status: "accepted" })
    .eq("appointment_id", appointmentId);

  if (error) {
    alert("Error accepting appointment.");
    console.error(error);
  } else {
    alert("Appointment accepted!");
    refreshAllAppointments();
  }
}

async function cancelAppointment(appointmentId) {
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("appointment_id", appointmentId);

  if (error) {
    alert("Error cancelling appointment.");
    console.error(error);
  } else {
    alert("Appointment cancelled!");
    refreshAllAppointments();
  }
}

async function markAsCompleted(appointmentId) {
  const { error } = await supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("appointment_id", appointmentId);

  if (error) {
    alert("Error marking appointment as completed.");
    console.error(error);
  } else {
    alert("Appointment marked as completed!");
    refreshAllAppointments();
  }
}

async function deleteAppointment(appointmentId) {
  if (!confirm("Are you sure you want to delete this appointment? This action cannot be undone.")) {
    return;
  }

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("appointment_id", appointmentId);

  if (error) {
    alert("Error deleting appointment.");
    console.error(error);
  } else {
    alert("Appointment deleted!");
    refreshAllAppointments();
  }
}

// ==============================
// Refresh Appointments
// ==============================
function refreshAllAppointments() {
  fetchAppointmentsByStatus("pending", pendingAppointmentsContainer);
  fetchAppointmentsByStatus("accepted", acceptedAppointmentsContainer);
  fetchAppointmentsByStatus("cancelled", cancelledAppointmentsContainer);
  fetchAppointmentsByStatus("completed", completedAppointmentsContainer); // ✅ New status added
}

// ==============================
// Init
// ==============================
refreshAllAppointments();
