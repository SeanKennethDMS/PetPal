'use strict';

import supabase from "../supabaseClient.js";

document.addEventListener("DOMContentLoaded", async function () {
    console.log("DOM fully loaded and parsed! ");

    // Select Buttons
    const bookNowBtn = document.getElementById("book-now");
    const closeModalBtn = document.getElementById("close-modal");
    const confirmBookingBtn = document.getElementById("confirm-booking");
    const cancelBookingBtn = document.getElementById("cancel-booking");
    const refreshBookingBtn = document.getElementById("refresh-booking");

    // Select Modal & Inputs
    const bookingModal = document.getElementById("booking-modal");
    const serviceSelect = document.getElementById("service-select");
    const petSelect = document.getElementById("pet-select");
    const appointmentDateTime = document.getElementById("appointment-date-time");

    // Select Appointment Display
    const pendingAppointment = document.getElementById("pending-appointment");
    const appointmentDetails = document.getElementById("appointment-details");

    console.log("Elements selected successfully! ");

    // Open Booking Modal
    if (bookNowBtn) {
        bookNowBtn.addEventListener("click", function() {
            bookingModal.classList.remove("hidden");
            console.log("Booking modal opened!");
        });
    }

    // Close Booking Modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", function () {
            bookingModal.classList.add("hidden");
            console.log("Booking modal closed!");
        });
    }

    // Load Pets & Pending Appointments on Page Load
    await loadPets(); 
    await loadPendingAppointment();

    // Cancel Booking Event Listener
    if (cancelBookingBtn) {
        cancelBookingBtn.addEventListener("click", cancelPendingAppointment);
    }

    // Refresh Booking Event Listener
    if (refreshBookingBtn) {
        refreshBookingBtn.addEventListener("click", async function () {
            console.log("Refreshing appointments...");

            // Show loading indicator
            refreshBookingBtn.textContent = "Refreshing..."; 
            refreshBookingBtn.disabled = true;

            await loadPendingAppointment(); // Refresh the pending appointments list

            // Restore button text after refresh
            refreshBookingBtn.textContent = "Refresh";
            refreshBookingBtn.disabled = false;

            console.log("Appointments refreshed successfully!");
        });
    }

    // 👉 Function to get the current user's ID
    async function getUserId() {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error("Error fetching user:", error.message);
            return null;
        }
        
        return user ? user.id : null;
    }

    // Load Pets from Database
    async function loadPets() {
        petSelect.innerHTML = '<option value="" disabled selected>Loading pets...</option>';
    
        const userId = await getUserId();
        if (!userId) {
            console.error("User ID not found. Unable to fetch pets.");
            petSelect.innerHTML = '<option value="" disabled selected>Error loading pets</option>';
            return;
        }
    
        const { data: pets, error } = await supabase
            .from("pets")
            .select("*")
            .eq("owner_id", userId); // Only fetch pets owned by the logged-in user
    
        if (error) {
            console.error("Error fetching pets: ", error.message);
            petSelect.innerHTML = '<option value="" disabled selected>Error loading pets</option>';
            return;
        }
    
        if (pets.length === 0) {
            petSelect.innerHTML = '<option value="" disabled selected>No pets found</option>';
            return;
        }
    
        // Populate Dropdown
        petSelect.innerHTML = '<option value="" disabled selected>Select Your Pet</option>';
        pets.forEach((pet) => {
            const option = document.createElement("option");
            option.value = pet.id; // Use pet ID as value
            option.textContent = pet.pet_name; // Display pet name
            petSelect.appendChild(option);
        });
    
        console.log("Pets loaded successfully!", pets);
    }
    

    // Handle Booking Submission
    if (confirmBookingBtn) {
        confirmBookingBtn.addEventListener("click", async function () {
            const userId = await getUserId();
            if (!userId) {
                alert("Error: User not found. Please log in again.");
                return;
            }
    
            // Fetch User's First Name
            const { data: userData, error: userError } = await supabase
                .from("users_table")
                .select("first_name")
                .eq("id", userId)
                .single();
    
            if (userError) {
                console.error("Error fetching user details:", userError.message);
                alert("Failed to get user information.");
                return;
            }
    
            const userFirstname = userData.firstname;
    
            const selectedPet = petSelect.value;
            const selectedService = serviceSelect.value;
            const selectedDateTime = appointmentDateTime.value;
    
            // Validate Input Fields
            if (!selectedPet || !selectedService || !selectedDateTime) {
                alert("Please fill in all fields before booking!");
                return;
            }
    
            console.log("Booking appointment...", {
                user_id: userId,
                user_firstname: userFirstname,
                pet_id: selectedPet,
                service_type: selectedService,
                appointment_date: selectedDateTime
            });
    
            // Insert Appointment into Supabase
            const { data, error } = await supabase.from("appointments").insert([
                {
                    user_id: userId,  // 🔥 Save user_id
                    user_firstname: userFirstname,  // 🔥 Save user_firstname
                    pet_id: selectedPet,
                    service_type: selectedService,
                    appointment_date: selectedDateTime,
                    status: "Pending"
                }
            ]);
    
            if (error) {
                console.error("Error booking appointment:", error.message);
                alert("Failed to book the appointment. Please try again.");
                return;
            }
    
            console.log("Appointment booked successfully!", data);
            alert("Appointment booked successfully!");
    
            // Close Modal & Refresh Appointments
            bookingModal.classList.add("hidden");
            await loadPendingAppointment();
        });
    }

    // Load Pending Appointment
    async function loadPendingAppointment() {
        console.log("Loading pending appointment...");
    
        const userId = await getUserId();
        if (!userId) {
            console.error("User ID not found. Unable to fetch appointments.");
            return;
        }
    
        const { data: appointment, error } = await supabase
            .from("appointments")
            .select("id, pet_id, service_type, appointment_date, status") // Fetch pet_id instead
            .eq("user_id", userId)
            .eq("status", "Pending")
            .order("appointment_date", { ascending: true })
            .limit(1);

        if (error || !appointment || appointment.length === 0) {
            console.error("Error fetching appointment:", error?.message);
            appointmentDetails.innerHTML = `<p class="text-gray-500 italic">No pending appointments.</p>`;
            return;
        }

        // Fetch pet details separately
        const { data: pet, error: petError } = await supabase
            .from("pets")
            .select("pet_name")
            .eq("id", appointment[0].pet_id)
            .single();

        if (petError) {
            console.error("Error fetching pet details:", petError.message);
            return;
        }

        // Now display the appointment
        appointmentDetails.innerHTML = `
            <p class="text-gray-700"><span class="font-medium">🐶 Pet:</span> ${pet.pet_name}</p>
            <p class="text-gray-700"><span class="font-medium">🛁 Service:</span> ${appointment[0].service_type}</p>
            <p class="text-gray-700"><span class="font-medium">📆 Date & Time:</span> ${new Date(appointment[0].appointment_date).toLocaleString()}</p>
            <p class="text-gray-700"><span class="font-medium">📌 Status:</span> <span class="text-yellow-600 font-semibold">${appointment[0].status}</span></p>
        `;
    }

    // Cancel Pending Appointment
    async function cancelPendingAppointment() {
        console.log("Cancelling pending appointment...");
    
        const userId = await getUserId();
        if (!userId) {
            console.error("User ID not found. Unable to cancel appointment.");
            return;
        }
    
        // Fetch the latest pending appointment for the logged-in user
        const { data: appointment, error } = await supabase
            .from("appointments")
            .select("id")
            .eq("user_id", userId)  // 🛑 Only fetch the logged-in user's appointment
            .eq("status", "Pending")
            .order("appointment_date", { ascending: true })
            .limit(1)
            .single();
    
        if (error || !appointment) {
            console.error("No pending appointment found or error occurred:", error?.message);
            alert("No pending appointment to cancel.");
            return;
        }
    
        // Confirm Cancellation
        const confirmCancel = confirm("Are you sure you want to cancel this appointment?");
        if (!confirmCancel) return;
    
        // Delete the Appointment from the Database
        const { error: deleteError } = await supabase
            .from("appointments")
            .delete()
            .eq("id", appointment.id);
    
        if (deleteError) {
            console.error("Error cancelling appointment:", deleteError.message);
            alert("Failed to cancel the appointment. Please try again.");
            return;
        }
    
        console.log("Appointment cancelled successfully!");
        alert("Appointment cancelled successfully! ");
    
        // Reset UI to "No Pending Appointments"
        appointmentDetails.innerHTML = `
            <p class="text-gray-500 italic">No pending appointments.</p>
        `;
    
        console.log("UI updated after cancellation.");
    }
});










// document.addEventListener("DOMContentLoaded", async function () {
//     let pendingAppointment = null;
//     await loadPendingAppointment();
//     updatePendingAppointmentUI(); // 🔥 Ensure UI updates after loading appointments

//     // Select elements
//     const bookNowBtn = document.getElementById("book-now");
//     const bookingModal = document.getElementById("booking-modal");
//     const confirmBookingBtn = document.getElementById("confirm-booking");
//     const closeModalBtn = document.getElementById("close-modal");
//     const appointmentDetails = document.getElementById("appointment-details");
//     const petSelect = document.getElementById("pet-select");
//     const serviceSelect = document.getElementById("service-select");
//     const appointmentDateInput = document.getElementById("appointment-date-time");

//     async function getUserId() {
//         const { data, error } = await supabase.auth.getUser();
//         if (error || !data?.user?.id) {
//             console.error("Error fetching user:", error);
//             return null;
//         }
//         return data.user.id;
//     }

    

//     async function updatePendingAppointmentUI() {
//         const pendingAppointmentDiv = document.getElementById("pending-appointment");
//         const appointmentDetails = document.getElementById("appointment-details");
    
//         if (!pendingAppointmentDiv || !appointmentDetails) {
//             console.error("Error: Missing pending appointment elements in HTML.");
//             return;
//         }
    
//         // Ensure the UI is visible even if no appointment is found
//         pendingAppointmentDiv.classList.remove("hidden");
    
//         try {
//             // Fetch the latest pending appointment from Supabase
//             const { data, error } = await supabase
//                 .from("appointments")
//                 .select("*")
//                 .eq("status", "pending") // Get only pending appointments
//                 .order("created_at", { ascending: false }) // Get the latest one
//                 .limit(1)
//                 .maybeSingle(); // ✅ Fix: Allows zero or one row (prevents 406 error)
    
//             if (error) {
//                 console.error("Error fetching appointment:", error.message);
//                 appointmentDetails.innerHTML = `<p class="text-gray-500 italic">Error loading appointment.</p>`;
//                 return;
//             }
    
//             if (data) {
//                 console.log("Fetched appointment:", data); // Debugging log
    
//                 appointmentDetails.innerHTML = `
//                     <p class="text-gray-700 mt-2"><span class="font-medium">🐶 Pet:</span> ${data.pet_name}</p>
//                     <p class="text-gray-700"><span class="font-medium">🛁 Service:</span> ${data.service}</p>
//                     <p class="text-gray-700"><span class="font-medium">📆 Date & Time:</span> ${new Date(data.date_time).toLocaleString()}</p>
//                     <p class="text-gray-700"><span class="font-medium">📌 Status:</span> <span class="text-yellow-600 font-semibold">${data.status}</span></p>
//                     <div class="mt-3 flex space-x-2">
//                         <button id="cancel-booking" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Cancel</button>
//                         <button id="refresh-booking" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Refresh</button>
//                     </div>
//                 `;
    
//                 // Add event listeners
//                 document.getElementById("cancel-booking").addEventListener("click", () => cancelAppointment(data.id));
//                 document.getElementById("refresh-booking").addEventListener("click", updatePendingAppointmentUI);
//             } else {
//                 console.warn("No pending appointment found."); // Debugging log
//                 appointmentDetails.innerHTML = `<p class="text-gray-500 italic">No pending appointments.</p>`;
//             }
//         } catch (err) {
//             console.error("Unexpected error:", err);
//             appointmentDetails.innerHTML = `<p class="text-gray-500 italic">Failed to load appointments.</p>`;
//         }
//     }

  
    
//     // Cancel appointment function
//     function cancelAppointment() {
//         localStorage.removeItem("appointment");
//         updatePendingAppointmentUI();
//     }

//     bookNowBtn?.addEventListener("click", async function () {
//         bookingModal.classList.remove("hidden");
//         await loadUserPets();
//     });

//     closeModalBtn?.addEventListener("click", function () {
//         bookingModal.classList.add("hidden");
//     });

//     bookingModal?.addEventListener("click", function (event) {
//         if (event.target === bookingModal) {
//             bookingModal.classList.add("hidden");
//         }
//     });

//     confirmBookingBtn?.addEventListener("click", async function (event) {
//         event.preventDefault();
//         await bookAppointment();
//     });

//     async function loadUserPets() {
//         const userId = await getUserId();
//         if (!userId) return;

//         const { data: pets, error } = await supabase
//             .from("pets")
//             .select("id, pet_name")
//             .eq("owner_id", userId);

//         if (error) {
//             console.error("Error fetching pets:", error);
//             return;
//         }

//         petSelect.innerHTML = `<option value="" disabled selected>Select a pet</option>`;
//         pets?.forEach(pet => {
//             const option = document.createElement("option");
//             option.value = pet.id;
//             option.textContent = pet.pet_name;
//             petSelect.appendChild(option);
//         });
//     }

//     async function loadPendingAppointment() {
//         const userId = await getUserId();
//         if (!userId) return;

//         const { data: appointments, error } = await supabase
//             .from("appointments")
//             .select("id, pet_id, service_type, appointment_date, status, pets (pet_name)")
//             .eq("user_id", userId)
//             .order("appointment_date", { ascending: true })
//             .limit(1);

//         if (error) {
//             console.error("Error fetching appointments:", error);
//             return;
//         }

//         if (appointments.length > 0) {
//             const appointment = appointments[0];
//             const { data: petData } = await supabase
//                 .from("pets")
//                 .select("pet_name")
//                 .eq("id", appointment.pet_id)
//                 .single();

//             pendingAppointment = {
//                 pet: petData?.pet_name || "Unknown",
//                 service: appointment.service_type,
//                 dateTime: appointment.appointment_date,
//                 status: appointment.status || "Pending"
//             };
//         } else {
//             pendingAppointment = null;
//         }
//         updatePendingAppointmentUI();
//     }

//     async function bookAppointment() {
//         const userId = await getUserId();
//         if (!userId) return;

//         const petId = petSelect.value;
//         const serviceType = serviceSelect.value;
//         const appointmentDate = appointmentDateInput.value;

//         if (!petId || !serviceType || !appointmentDate) {
//             alert("Please fill out all fields.");
//             return;
//         }

//         const { error } = await supabase
//             .from("appointments")
//             .insert([{ pet_id: petId, user_id: userId, service_type: serviceType, appointment_date: appointmentDate, status: "Pending" }]);

//         if (error) {
//             console.error("Error booking appointment:", error);
//             alert("Failed to book appointment. Please try again.");
//         } else {
//             alert("Appointment booked successfully!");
//             bookingModal.classList.add("hidden"); 
//             await loadPendingAppointment();
//         }
//     }

//     async function cancelAppointment() {
//         const userId = await getUserId();
//         if (!userId || !pendingAppointment) return;

//         const { error } = await supabase
//             .from("appointments")
//             .delete()
//             .eq("user_id", userId)
//             .eq("appointment_date", pendingAppointment.dateTime)
//             .eq("status", "Pending");

//         if (error) {
//             console.error("Error canceling appointment:", error);
//             alert("Failed to cancel appointment. Please try again.");
//         } else {
//             alert("Appointment canceled successfully!");
//             pendingAppointment = null;
//             updatePendingAppointmentUI();
//         }
//     }
// });
