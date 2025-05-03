import supabase from './supabaseClient.js';
import { notifyCustomerOfAppointmentStatus } from '../js/modal/notification.js';

document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-button");
  const appointmentsContainer = document.getElementById("appointmentsContainer");
  const noAppointmentsMessage = document.getElementById("noAppointmentsMessage");
  let activeTab = "pending";

  function setActiveTab(tab) {
    tabButtons.forEach(btn => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle("text-blue-600", isActive);
      btn.classList.toggle("font-semibold", isActive);
      btn.classList.toggle("border-b-2", isActive);
      btn.classList.toggle("border-blue-600", isActive);
      btn.classList.toggle("text-gray-600", !isActive);
    });
    activeTab = tab;
  }

  async function loadAppointments(status) {
    appointmentsContainer.innerHTML = "";
    noAppointmentsMessage.classList.remove("hidden");
    noAppointmentsMessage.textContent = `Loading ${status} appointments...`;

    try {
      let statusFilter = status;
      if (status === 'cancelled') {
        statusFilter = ['cancelled', 'no show'];
      }

      const sourceTable = (status === "completed") ? "completed_appointments" : "appointments";

      const { data, error } = await supabase
        .from(sourceTable)
        .select(`
          appointment_id,
          appointment_date,
          appointment_time,
          created_at,
          completed_at,
          status,
          original_appointment_date,
          original_appointment_time,
          users_table (
            first_name,
            last_name
          ),
          pets (
            pet_name,
            species
          ),
          services (
            name
          )
        `)
        [Array.isArray(statusFilter) ? 'in' : 'eq']("status", statusFilter)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const isEmpty = !data || data.length === 0;

      if (isEmpty) {
        const statusMessageMap = {
          pending: "No pending booking requests.",
          accepted: "No accepted appointments.",
          cancelled: "No cancelled or no-show appointments.",
          completed: "No completed appointments.",
          rescheduled: "No rescheduled appointments.",
        };

        noAppointmentsMessage.classList.remove("hidden");
        noAppointmentsMessage.textContent = statusMessageMap[status] || "No appointments found.";
        return;
      }

      noAppointmentsMessage.classList.add("hidden");

      data.forEach(appointment => {
        const card = createAppointmentCard(appointment);
        appointmentsContainer.appendChild(card);
      });

    } catch (err) {
      console.error("Supabase error:", err.message);
      noAppointmentsMessage.classList.remove("hidden");
      noAppointmentsMessage.textContent = "Failed to load appointments.";
    }
  }

  function createAppointmentCard(appt) {
    const ownerName = `${appt.users_table?.first_name || ""} ${appt.users_table?.last_name || ""}`.trim();
    const petName = appt.pets?.pet_name || "N/A";
    const species = appt.pets?.species || "N/A";
    const service = appt.services?.name || "N/A";
    const appointmentDate = new Date(appt.appointment_date).toLocaleDateString();
    const appointmentTime = appt.appointment_time?.slice(0, 5) || "—";
    const bookedDate = new Date(appt.created_at).toLocaleDateString();
    const statusLabel = appt.status === 'no show' ? 'No Show' : appt.status.charAt(0).toUpperCase() + appt.status.slice(1);
  
    const div = document.createElement("div");
    div.className = "bg-gray-50 p-4 rounded-xl shadow border";
  
    div.innerHTML = `
      <div class="card-inner flex flex-col gap-2">
        <h3 class="font-bold text-lg">${petName} (${species})</h3>
        <p class="text-gray-700">👤 Owner: <span class="font-medium">${ownerName}</span></p>
        <p class="text-gray-700">🛁 Service: <span class="font-medium">${service}</span></p>
        <p class="text-gray-700">📅 Appointment: 
          <span class="font-medium">${appointmentDate}</span> 
          at <span class="font-medium">${appointmentTime}</span>
        </p>
        <p class="text-gray-700">🕓 Booked On: <span class="font-medium">${bookedDate}</span></p>
        <p class="text-sm text-gray-500 italic">Status: ${statusLabel}</p>
      </div>
    `;
  
    const container = div.querySelector(".card-inner");
  
    if (appt.status === 'pending') {
      const acceptBtn = document.createElement("button");
      acceptBtn.textContent = "Accept";
      acceptBtn.className = "accept-btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm";
      acceptBtn.addEventListener('click', () => handleStatusUpdate(appt.appointment_id, 'accepted'));
  
      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.className = "cancel-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm";
      cancelBtn.addEventListener('click', () => handleStatusUpdate(appt.appointment_id, 'cancelled'));
  
      const btnWrapper = document.createElement("div");
      btnWrapper.className = "flex gap-2 mt-3";
      btnWrapper.appendChild(acceptBtn);
      btnWrapper.appendChild(cancelBtn);
      container.appendChild(btnWrapper);
    }
  
    if (appt.status === 'accepted') {
      const today = new Date().toISOString().split("T")[0];
      const apptDate = new Date(appt.appointment_date).toISOString().split("T")[0];
  
      const actionBtn = document.createElement("button");
      actionBtn.className = "px-3 py-1 rounded text-sm mt-3 w-28 text-center";
  
      if (today === apptDate) {
        actionBtn.textContent = "Mark as No Show";
        actionBtn.classList.add("bg-yellow-500", "hover:bg-yellow-600", "text-white");
        actionBtn.addEventListener("click", () => handleStatusUpdate(appt.appointment_id, 'no show'));
      } else {
        actionBtn.textContent = "Cancel";
        actionBtn.classList.add("bg-red-500", "hover:bg-red-600", "text-white");
        actionBtn.addEventListener("click", () => handleStatusUpdate(appt.appointment_id, 'cancelled'));
      }
  
      container.appendChild(actionBtn);
    }
  
    if (appt.status === 'rescheduled') {
      const acceptBtn = document.createElement("button");
      acceptBtn.textContent = "Accept Reschedule";
      acceptBtn.className = "bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm w-40";
      acceptBtn.addEventListener("click", () => handleStatusUpdate(appt.appointment_id, 'accepted'));
  
      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel Reschedule";
      cancelBtn.className = "bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm w-40";
      cancelBtn.addEventListener("click", () => revertReschedule(appt));
  
      const wrapper = document.createElement("div");
      wrapper.className = "flex flex-col gap-2 mt-3";
      wrapper.appendChild(acceptBtn);
      wrapper.appendChild(cancelBtn);
      container.appendChild(wrapper);
    }
  
    if (appt.status === 'completed') {
      const completedAt = new Date(appt.completed_at).toLocaleString();
      const label = document.createElement("div");
      label.className = "mt-2 text-sm text-green-700 font-medium";
      label.textContent = `Completed on ${completedAt}`;
      container.appendChild(label);
    }
  
    return div;
  }

  async function revertReschedule(appt) {
    if (!appt.original_appointment_date || !appt.original_appointment_time) {
      console.warn("Missing original appointment data:", appt);
      alert("Cannot revert reschedule — original date/time not found.");
      return;
    }
  
    const { error } = await supabase
      .from('appointments')
      .update({
        appointment_date: appt.original_appointment_date,
        appointment_time: appt.original_appointment_time,
        original_appointment_date: null,
        original_appointment_time: null,
        status: 'accepted'
      })
      .eq('appointment_id', appt.appointment_id);
  
    if (error) {
      alert("Failed to revert appointment.");
      console.error(error.message);
    } else {
      alert("Reschedule cancelled, reverted to original date.");
      loadAppointments(activeTab);
    }
  }
  

  async function handleStatusUpdate(appointmentId, newStatus) {
    const updates = { status: newStatus };
  
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
  
    const { error } = await supabase
      .from("appointments")
      .update(updates)
      .eq("appointment_id", appointmentId);
  
    if (error) {
      console.error("Status update error:", error.message);
      alert("Failed to update appointment status.");
    } else {
      console.log(`Appointment ${appointmentId} set to ${newStatus}`);
  
      notifyCustomerOfAppointmentStatus(appointmentId, newStatus);
  
      if (newStatus === 'completed') {
        const { data: apptData, error: selectErr } = await supabase
          .from("appointments")
          .select("*")
          .eq("appointment_id", appointmentId)
          .single();
  
        if (selectErr) {
          console.error("Failed to fetch completed appointment data:", selectErr.message);
        } else {
          const { error: insertErr } = await supabase
            .from("completed_appointments")
            .insert([apptData]);
  
          if (insertErr) {
            console.error("Failed to insert into completed_appointments:", insertErr.message);
          }
        }
      }
  
      loadAppointments(activeTab);
    }
  }

  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      if (tab !== activeTab) {
        setActiveTab(tab);
        loadAppointments(tab || 'pending');
      }
    });
  });

  setActiveTab(activeTab);
  loadAppointments(activeTab);

  supabase
    .channel('realtime-appointments')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'appointments'
    }, payload => {
      const newStatus = payload.new?.status;
      const oldStatus = payload.old?.status;

      if (newStatus === activeTab || oldStatus === activeTab) {
        loadAppointments(activeTab);
      }
    })
    .subscribe();
});
