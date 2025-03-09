'use strict';

import supabase from "../supabaseClient.js";

/**
 * Fetch and display booking history with optional filters.
 * @param {string|null} dateFilter - Selected date filter.
 * @param {string|null} statusFilter - Selected status filter.
 */
async function fetchBookingHistory(dateFilter = null, statusFilter = null) {
    const tableBody = document.querySelector("#history-table");

    if (!tableBody) {
        console.error("Error: #history-table tbody not found.");
        return;
    }

    tableBody.innerHTML = "<tr><td colspan='6' class='p-2 text-center'>Loading...</td></tr>";

    try {
        let query = supabase.from("appointments").select("*");
        if (dateFilter) query = query.eq("appointment_date", dateFilter);
        if (statusFilter) query = query.eq("status", statusFilter);

        const { data: appointments, error: appError } = await query;
        if (appError) throw new Error(`Error fetching appointments: ${appError.message}`);

        console.log("Appointments fetched:", appointments);

        if (!appointments || appointments.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='6' class='p-2 text-center'>No records found</td></tr>";
            return;
        }

        // Ensure we only get valid appointment_ids
        const validAppointmentIds = appointments
            .map(a => a.appointment_id)
            .filter(id => id !== null && id !== undefined); // Filter out invalid IDs

        if (validAppointmentIds.length === 0) {
            console.error("No valid appointment IDs to fetch booking history.");
            tableBody.innerHTML = "<tr><td colspan='6' class='p-2 text-center'>No valid appointment records</td></tr>";
            return;
        }

        // Fetch pets and services concurrently
        const [{ data: pets }, { data: services }, { data: history, error: historyError }] = await Promise.all([
            supabase.from("pets").select("*").in("id", appointments.map(a => a.pet_id)),
            supabase.from("services").select("*").in("id", appointments.map(a => a.service_id)),
            supabase.from("booking_history").select("*").in("appointment_id", validAppointmentIds),
        ]);

        if (historyError) {
            console.error("Error fetching booking history:", historyError.message || historyError);
            return;
        }

        if (!pets || !services || !history) {
            console.error("Error: Missing data for pets, services, or history.");
            tableBody.innerHTML = "<tr><td colspan='6' class='p-2 text-center text-red-500'>Missing required data</td></tr>";
            return;
        }

        console.log("Pets fetched:", pets);
        console.log("Services fetched:", services);
        console.log("Booking history fetched:", history);

        const petMap = pets ? Object.fromEntries(pets.map(p => [p.id, p])) : {};
        const serviceMap = services ? Object.fromEntries(services.map(s => [s.id, s])) : {};
        const historyMap = history ? Object.fromEntries(history.map(h => [h.appointment_id, h])) : {};

        tableBody.innerHTML = ""; // Clear the table once before appending rows
        appointments.forEach(entry => {
            const pet = petMap[entry.pet_id] || { pet_name: "Unknown" };
            const service = serviceMap[entry.service_id] || { service_name: "Unknown", pricing: 0 };
            const historyEntry = historyMap[entry.appointment_id] || { old_status: "N/A" };
        
            const formattedDate = entry.appointment_date ? new Date(entry.appointment_date).toISOString().split("T")[0] : "Invalid Date";
        
            // Ensure service.pricing is a valid number
            const validPricing = Number(service.pricing);
            const formattedPricing = isNaN(validPricing) ? "N/A" : `₱${validPricing.toFixed(2)}`;
        
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
        console.error(error.message);
        tableBody.innerHTML = "<tr><td colspan='6' class='p-2 text-center text-red-500'>Error loading data</td></tr>";
    }
}

// Load booking history when the page loads
document.addEventListener("DOMContentLoaded", function() {
    fetchBookingHistory();
});

// Filter booking history
const filterBtn = document.getElementById("filter-btn");
if (filterBtn) {
    filterBtn.addEventListener("click", async () => {
        const dateFilter = document.getElementById("filter-date").value || null;
        const statusFilter = document.getElementById("filter-status").value || null;
        fetchBookingHistory(dateFilter, statusFilter);
    });
}

const downloadBtn = document.getElementById("download-pdf");
if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.text("Booking History", 10, 10);
        let y = 20; // Starting Y position

        const rows = document.querySelectorAll("#history-table tr");

        // Check if the table has valid rows
        if (!rows.length || rows[0].innerText.includes("No records found") || rows[0].innerText.includes("Loading")) {
            alert("No booking history to download.");
            return;
        }

        rows.forEach(row => {
            let rowData = [];
            row.querySelectorAll("td").forEach(cell => rowData.push(cell.innerText));
            doc.text(rowData.join(" | "), 10, y);
            y += 10;
        });

        doc.save("booking-history.pdf");
    });
}
