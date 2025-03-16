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
        const { data: appointments, error } = await supabase
            .from("appointments")
            .select("appointment_id, appointment_date, status, pet_id, service_id")
            .eq("user_id", userId)
            .neq("status", "completed")
            .neq("status", "cancelled");

        if (error) {
            console.error("Error loading appointments:", error);
            return;
        }

        appointmentDetails.innerHTML = appointments.length === 0
            ? '<p class="text-gray-500 italic">No pending appointments.</p>'
            : '';

        for (const appointment of appointments) {
            const petName = await getPetName(appointment.pet_id);
            const serviceName = await getServiceName(appointment.service_id);

            const appointmentBox = document.createElement("div");
            appointmentBox.classList.add("p-3", "bg-white", "rounded-lg", "border", "mb-2", "shadow-md");
            appointmentBox.dataset.id = appointment.appointment_id; // Store ID for easy deletion
            appointmentBox.innerHTML = `
                <p class="text-gray-700"><strong>Pet:</strong> ${petName}</p>
                <p class="text-gray-700"><strong>Service:</strong> ${serviceName}</p>
                <p class="text-gray-700"><strong>Date:</strong> ${new Date(appointment.appointment_date).toLocaleString()}</p>
                <button class="cancel-btn px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600" data-id="${appointment.appointment_id}">Cancel</button>
            `;

            appointmentDetails.appendChild(appointmentBox);
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
            document.querySelector(`[data-id="${appointmentId}"]`).remove(); // Remove from UI
        }
    }

    // Attach event listener for dynamically created cancel buttons
    document.addEventListener("click", (event) => {
        if (event.target.classList.contains("cancel-btn")) {
            cancelAppointment(event.target.dataset.id);
        }
    });

    // Refresh Appointments
    refreshBookingBtn.addEventListener("click", async () => {
        console.log("Refreshing appointments...");
        await loadAppointments();
    });
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
