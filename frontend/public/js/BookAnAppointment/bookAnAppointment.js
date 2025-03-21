'use strict';

import supabase from "../supabaseClient.js"; // Adjust the path as needed

document.addEventListener("DOMContentLoaded", async () => {
    const userId = await getUserId();
    console.log("User ID:", userId); // Debugging log

    if (!userId) {
        console.error("User ID is missing. Redirecting to login...");
        window.location.href = "../index.html"; // Adjust based on your structure
        return;
    }

    // Elements
    const serviceSelect = document.getElementById("service-select");
    const petSelect = document.getElementById("pet-select");
    const appointmentDateInput = document.getElementById("appointment-date");
    const appointmentTimeInput = document.getElementById("appointment-time");
    const confirmBookingBtn = document.getElementById("confirm-booking");
    const bookNowBtn = document.getElementById("book-now");
    const closeModalBtn = document.getElementById("close-modal");
    const bookingModal = document.getElementById("booking-modal");
    const appointmentDetails = document.getElementById("appointment-details");
    const refreshBookingBtn = document.getElementById("refresh-booking");

    // Load data on page load
    await loadServices();
    await loadPets();
    await loadAppointments();
    //  Set up Supabase real-time listener ONCE
    supabase
    .channel('public:appointments')
    .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'appointments'
    }, (payload) => {
        console.log('Change received!', payload);
        loadAppointments();
    })
    .subscribe();

    // Open Booking Modal
    bookNowBtn.addEventListener("click", () => {
        bookingModal.classList.remove("hidden");
    });

    // Close Booking Modal
    closeModalBtn.addEventListener("click", () => {
        bookingModal.classList.add("hidden");
    });

    // Load available services from Supabase
    async function loadServices() {
        const { data, error } = await supabase.from("services").select("id, service_name");
        if (error) return console.error("Error loading services:", error);

        serviceSelect.innerHTML = '<option value="" disabled selected>Select Service</option>';
        data.forEach(service => {
            serviceSelect.innerHTML += `<option value="${service.id}">${service.service_name}</option>`;
        });
    }

    const { data, error } = await supabase
        .from("users_table")
        .select("first_name")
        .eq("id", userId);

    if (error) {
        console.error("Error loading pets:", error);
        return;
    }

    let notificationName = "";

    data.forEach(name => {
        notificationName += name.first_name;
    });

    console.log(notificationName);

    // Load user's pets from Supabase
    async function loadPets() {
        console.log("Loading pets for user:", userId); // Debugging log

        const { data, error } = await supabase
            .from("pets")
            .select("id, pet_name")
            .eq("owner_id", userId);

        if (error) {
            console.error("Error loading pets:", error);
            return;
        }

        console.log("Fetched pets:", data); // Debugging log

        petSelect.innerHTML = '<option value="" disabled selected>Select Your Pet</option>';

        if (data.length === 0) {
            petSelect.innerHTML += '<option disabled>No pets found</option>';
        } else {
            data.forEach(pet => {
                petSelect.innerHTML += `<option value="${pet.id}">${pet.pet_name}</option>`;
            });
        }
    }

    // Confirm Booking with Pending Appointment Check
    confirmBookingBtn.addEventListener("click", async () => {
        const serviceId = serviceSelect.value;
        const petId = petSelect.value;
        const appointmentDate = appointmentDateInput.value; 
        const appointmentTime = appointmentTimeInput.value; 
    
        if (!serviceId || !petId || !appointmentDate || !appointmentTime) {
            alert("Please fill in all fields before booking.");
            return;
        }
    
        // Optional: validate time string
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(appointmentTime)) {
            alert("Please enter a valid time in HH:mm format.");
            return;
        }
    
        // Check for existing pending appointment for this pet
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
    
        // Book appointment - NOW we insert both date and time SEPARATELY
        const { error } = await supabase.from("appointments").insert([
            {
                user_id: userId,
                pet_id: petId,
                service_id: serviceId,
                appointment_date: appointmentDate,          // stores YYYY-MM-DD
                appointment_time: `${appointmentTime}:00`,  // stores HH:mm:ss (add seconds if column is TIME type)
                status: "pending"
            }
        ]);
    
        if (error) {
            alert("Error booking appointment.");
            console.error("Booking error:", error);
            return;
        }
    
        alert("Appointment booked successfully!");
        bookingModal.classList.add("hidden");
        await loadAppointments();
    
        // Insert notification here
        const petName = await getPetName(petId);
        const serviceName = await getServiceName(serviceId);
    
        const { error: notificationError } = await supabase.from("notifications").insert([
            {
                user_id: null, // Or specify admin id(s)
                message: `New appointment booked from ${notificationName} for ${petName} (${serviceName}) on ${appointmentDate} at ${appointmentTime}`,
                is_read: false
            }
        ]);
    
        if (notificationError) {
            console.error("Error inserting notification:", notificationError.message);
        } else {
            console.log("Notification sent to admin!");
        }
    });

    // Load Appointments
    async function loadAppointments() {
        try {
          const { data: appointments, error } = await supabase
            .from("appointments")
            .select("appointment_id, appointment_date, status, pet_id, service_id")
            .eq("user_id", userId);
      
          if (error) {
            console.error("Error loading appointments:", error);
            return;
          }
      
          // Clear all containers first
          clearAppointmentLists();
      
          // Separate by status
          const accepted = appointments.filter(app => app.status === "accepted");
          const pending = appointments.filter(app => app.status === "pending");
          const cancelled = appointments.filter(app => app.status === "cancelled");
      
          // Render in each container
          renderAppointments("accepted-details", accepted, "accepted");
          renderAppointments("appointment-details", pending, "pending");
          renderAppointments("cancelled-details", cancelled, "cancelled");
      
        } catch (err) {
          console.error("Unexpected error loading appointments:", err);
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
      
          const appointmentBox = document.createElement("div");
          appointmentBox.className = "p-3 bg-white rounded-lg border border-gray-300 mb-2 shadow-sm";
      
          // Basic Info
          appointmentBox.innerHTML = `
            <p><strong>Pet:</strong> ${petName}</p>
            <p><strong>Service:</strong> ${serviceName}</p>
            <p><strong>Date:</strong> ${new Date(appointment.appointment_date).toLocaleDateString()}</p>
          `;
      
          // For Pending appointments, add a Cancel button
          if (statusType === "pending") {
            const cancelBtn = document.createElement("button");
            cancelBtn.className = "cancel-btn px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 mt-2";
            cancelBtn.textContent = "Cancel";
      
            cancelBtn.setAttribute("data-id", appointment.appointment_id);

            cancelBtn.addEventListener("click", () => {
              cancelAppointment(appointment.appointment_id);
            });
      
            appointmentBox.appendChild(cancelBtn);
          }
      
          container.appendChild(appointmentBox);
        }
      }
      

    // Fetch pet name
    async function getPetName(petId) {
        const { data } = await supabase.from("pets").select("pet_name").eq("id", petId).single();
        return data ? data.pet_name : "Unknown";
    }

    // Fetch service name
    async function getServiceName(serviceId) {
        const { data } = await supabase.from("services").select("service_name").eq("id", serviceId).single();
        return data ? data.service_name : "Unknown";
    }

    // Cancel Appointment
    async function cancelAppointment(appointmentId) {
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
          await loadAppointments(); // Reload UI instead of manually removing
        }
    }

    // Attach event listener for dynamically created cancel buttons
    // document.addEventListener("click", (event) => {
    //     if (event.target.classList.contains("cancel-btn")) {
    //         cancelAppointment(event.target.dataset.id);
    //     }
    // });

    // Refresh Appointments
    if (refreshBookingBtn) {
        refreshBookingBtn.addEventListener("click", async () => {
          console.log("Refreshing appointments...");
          await loadAppointments();
        });
      } else {
        console.warn("Refresh Booking button not found");
      }
});

// Function to get user ID
async function getUserId() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
        console.error("Error fetching user:", error?.message || "No user data found.");
        return null;
    }
    return data.user.id;
}
