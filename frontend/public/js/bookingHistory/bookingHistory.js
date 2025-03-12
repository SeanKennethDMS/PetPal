'use strict';

import supabase from "../supabaseClient.js";

/**
 * Fetch and display booking history with optional filters.
 * @param {string|null} dateFilter - Selected date filter.
 * @param {string|null} statusFilter - Selected status filter.
 */
async function fetchBookingHistory(dateFilter = null, statusFilter = null) {
    const tableBody = document.querySelector("#history-table");
    const filterBtn = document.getElementById("filter-btn");
    const paginationControls = document.querySelectorAll(".pagination-btn");

    if (!tableBody) {
        console.error("Error: #history-table tbody not found.");
        return;
    }

    // ✅ Disable filter button and pagination during loading
    if (filterBtn) filterBtn.disabled = true;
    paginationControls.forEach(btn => btn.disabled = true);

    // ✅ Show loading spinner
    tableBody.innerHTML = `
        <tr>
            <td colspan='6' class='p-2 text-center'>
                <div class="flex justify-center items-center">
                    <svg class="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <span class="ml-2">Loading...</span>
                </div>
            </td>
        </tr>
    `;

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            const message = userError ? userError.message : "User not logged in";
            console.error("Auth error:", message);
            tableBody.innerHTML = `<tr><td colspan='6' class='p-2 text-center text-red-500'>${message}</td></tr>`;
            return;
        }

        const userId = user.id;

        let query = supabase
            .from("appointments")
            .select("*")
            .eq("user_id", userId);

        // ✅ Apply filters
        if (dateFilter) {
            console.log("Applying date filter:", dateFilter);
            query = query.eq("appointment_date", dateFilter);
        }
        
        if (statusFilter) {
            const trimmedStatus = statusFilter.trim(); // Remove extra spaces
            console.log("Applying status filter:", trimmedStatus);
            if (trimmedStatus !== "" && trimmedStatus.toLowerCase() !== "all") { // Handle "All" if you have that option
                query = query.eq("status", trimmedStatus);
            }
        }

        const { data: appointments, error: appError } = await query;

        if (appError) throw new Error(`Error fetching appointments: ${appError.message}`);

        if (!appointments || appointments.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='6' class='p-2 text-center'>No records found</td></tr>";
            return;
        }

        const validAppointmentIds = appointments
            .map(a => a.appointment_id)
            .filter(id => id !== null && id !== undefined);

        if (validAppointmentIds.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='6' class='p-2 text-center'>No valid appointment records</td></tr>";
            return;
        }

        const [{ data: pets }, { data: services }, { data: history, error: historyError }] = await Promise.all([
            supabase.from("pets").select("*").in("id", appointments.map(a => a.pet_id)),
            supabase.from("services").select("*").in("id", appointments.map(a => a.service_id)),
            supabase.from("booking_history").select("*").in("appointment_id", validAppointmentIds),
        ]);

        if (historyError || !pets || !services || !history) {
            tableBody.innerHTML = "<tr><td colspan='6' class='p-2 text-center text-red-500'>Error fetching related data</td></tr>";
            return;
        }

        const petMap = Object.fromEntries(pets.map(p => [p.id, p]));
        const serviceMap = Object.fromEntries(services.map(s => [s.id, s]));
        const historyMap = Object.fromEntries(history.map(h => [h.appointment_id, h]));

        tableBody.innerHTML = ""; // ✅ Clear table rows before adding new ones

        appointments.forEach(entry => {
            const pet = petMap[entry.pet_id] || { pet_name: "Unknown" };
            const service = serviceMap[entry.service_id] || { service_name: "Unknown", pricing: 0 };
            const historyEntry = historyMap[entry.appointment_id] || { old_status: "N/A" };

            const date = new Date(entry.appointment_date);
            const formattedDate = !isNaN(date) ? date.toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : "Invalid Date";

            const validPricing = Number(service.pricing);
            const formattedPricing = isNaN(validPricing)
                ? "N/A"
                : `₱${validPricing.toFixed(2)}`;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="border p-2">${formattedDate}</td>
                <td class="border p-2">${pet.pet_name}</td>
                <td class="border p-2">${service.service_name}</td>
                <td class="border p-2">${historyEntry.old_status}</td>
                <td class="border p-2">${entry.status}</td>
                <td class="border p-2">${formattedPricing}</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Fetch error:", error.message);
        tableBody.innerHTML = "<tr><td colspan='6' class='p-2 text-center text-red-500'>Error loading data</td></tr>";
    } finally {
        // ✅ Re-enable buttons after loading
        if (filterBtn) filterBtn.disabled = false;
        paginationControls.forEach(btn => btn.disabled = false);
    }
}

// ✅ Load booking history on page load
document.addEventListener("DOMContentLoaded", () => {
    fetchBookingHistory();
});

// ✅ Filter booking history on button click
const filterBtn = document.getElementById("filter-btn");
if (filterBtn) {
    filterBtn.addEventListener("click", async () => {
        const dateFilter = document.getElementById("filter-date").value || null;
        const statusFilter = document.getElementById("filter-status").value || null;

        console.log("Filters applied:", { dateFilter, statusFilter });

        // Disable button during load
        filterBtn.disabled = true;
        filterBtn.innerText = "Filtering...";

        try {
            await fetchBookingHistory(dateFilter, statusFilter);
        } catch (error) {
            console.error("Error during filter:", error);
        } finally {
            // Enable button after load
            filterBtn.disabled = false;
            filterBtn.innerText = "Filter";
        }
    });
}

// ✅ Download booking history as PDF
const downloadBtn = document.getElementById("download-pdf");
if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const headers = [["Date", "Pet Name", "Service", "Old Status", "New Status", "Price"]];

        const data = Array.from(document.querySelectorAll("#history-table tr")).map(row => {
            return Array.from(row.querySelectorAll("td")).map(cell => cell.innerText);
        });

        // Check if there's data
        if (!data.length || data[0][0].includes("No records") || data[0][0].includes("Loading")) {
            alert("No booking history to download.");
            return;
        }

        doc.autoTable({
            head: headers,
            body: data,
            styles: { halign: 'center' },
        });

        doc.save("booking-history.pdf");
    });
}
