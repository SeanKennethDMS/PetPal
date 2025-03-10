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
    const appointmentDateInput = document.getElementById("appointment-date-time");
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

    // Load user's pets from Supabase
    async function loadPets() {
        console.log("Loading pets for user:", userId); // Debugging log
    
        const { data, error } = await supabase
            .from("pets") 
            .select("id, pet_name") // Removed "status" since it's in "appointments"
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

    // Prevent booking if pet has a pending appointment
    petSelect.addEventListener("change", () => {
        const selectedPet = petSelect.options[petSelect.selectedIndex];
        if (selectedPet.dataset.status === "pending") {
            alert("This pet already has a pending appointment. Complete or cancel it first.");
            petSelect.value = ""; // Reset selection
        }
    });

    // Confirm Booking
    confirmBookingBtn.addEventListener("click", async () => {
        const serviceId = serviceSelect.value;
        const petId = petSelect.value;
        const appointmentDate = appointmentDateInput.value;

        if (!serviceId || !petId || !appointmentDate) {
            alert("Please fill in all fields before booking.");
            return;
        }

        const { error } = await supabase.from("appointments").insert([
            {
                user_id: userId,
                pet_id: petId,
                service_id: serviceId,
                appointment_date: appointmentDate,
                status: "pending"
            }
        ]);

        if (error) {
            alert("Error booking appointment.");
            console.error("Booking error:", error);
        } else {
            alert("Appointment booked successfully!");
            bookingModal.classList.add("hidden");
            await loadAppointments();
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
