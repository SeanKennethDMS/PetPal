'use strict';

import supabase from "../supabaseClient.js";

let currentPage = 1;
const pageSize = 15;

async function fetchBookingHistory(dateFilter = null, statusFilter = null, petFilter = "", serviceFilter = "", page = 1) {
    const tableBody = document.querySelector("#history-table");
    const filterBtn = document.getElementById("filter-btn");
    const paginationControls = document.querySelectorAll(".pagination-btn");

    if (!tableBody) {
        console.error("Error: #history-table tbody not found.");
        return;
    }

    if (filterBtn) filterBtn.disabled = true;
    paginationControls.forEach(btn => btn.disabled = true);

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

        if (dateFilter) {
            console.log("Applying date filter:", dateFilter);
            query = query.eq("appointment_date", dateFilter);
        }

        if (statusFilter) {
            const trimmedStatus = statusFilter.trim();
            console.log("Applying status filter:", trimmedStatus);
            if (trimmedStatus !== "" && trimmedStatus.toLowerCase() !== "all") {
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

        tableBody.innerHTML = "";

        let filteredAppointments = appointments.filter(entry => {
            const pet = petMap[entry.pet_id] || {};
            const service = serviceMap[entry.service_id] || {};

            return (pet.pet_name || "").toLowerCase().includes((petFilter || "").toLowerCase()) &&
                (service.service_name || "").toLowerCase().includes((serviceFilter || "").toLowerCase());
        });

        const totalPages = Math.ceil(filteredAppointments.length / pageSize);
        const paginatedAppointments = filteredAppointments.slice((page - 1) * pageSize, page * pageSize);

        if (filteredAppointments.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='6' class='p-2 text-center'>No records found</td></tr>";
            return;
        }
        
        const pageInfo = document.getElementById('page-info');
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');

        if (pageInfo) pageInfo.innerText = `Page ${page} of ${totalPages}`;
        if (prevPageBtn) prevPageBtn.disabled = page <= 1;
        if (nextPageBtn) nextPageBtn.disabled = page >= totalPages;

        paginatedAppointments.forEach(entry => {
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

            const previousStatus = historyEntry.status || "N/A";
            const currentStatus = entry.status;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="border p-2">${formattedDate}</td>
                <td class="border p-2">${pet.pet_name}</td>
                <td class="border p-2">${service.name}</td>
                <td class="border p-2">${previousStatus}</td>
                <td class="border p-2">${currentStatus}</td>
                <td class="border p-2">${formattedPricing}</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Fetch error:", error.message);
        tableBody.innerHTML = "<tr><td colspan='6' class='p-2 text-center text-red-500'>Error loading data</td></tr>";
    } finally {
        if (filterBtn) filterBtn.disabled = false;
        paginationControls.forEach(btn => btn.disabled = false);
    }
}

function applyFilters() {
    const dateFilter = document.getElementById('filter-date')?.value || null;
    const statusFilter = document.getElementById('filter-status')?.value || null;
    const petFilter = document.getElementById('filter-pet')?.value || "";
    const serviceFilter = document.getElementById('filter-service')?.value || "";

    fetchBookingHistory(dateFilter, statusFilter, petFilter, serviceFilter, currentPage);
}

document.addEventListener("DOMContentLoaded", () => {
    currentPage = 1;
    applyFilters();

    const filterBtn = document.getElementById('filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            currentPage = 1;
            applyFilters();
        });
    }

    document.getElementById('prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            applyFilters();
        }
    });

    document.getElementById('next-page')?.addEventListener('click', () => {
        currentPage++;
        applyFilters();
    });
});

const downloadBtn = document.getElementById("download-pdf");
if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const headers = [["Date", "Pet Name", "Service", "Old Status", "New Status", "Price"]];

        const data = Array.from(document.querySelectorAll("#history-table tr")).map(row => {
            return Array.from(row.querySelectorAll("td")).map(cell => cell.innerText);
        });

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
