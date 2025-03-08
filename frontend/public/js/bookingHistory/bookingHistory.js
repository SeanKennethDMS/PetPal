'use strict';

import supabase from "../supabaseClient.js";

// 📌 Filter booking history
document.getElementById("filter-btn").addEventListener("click", async () => {
    const dateFilter = document.getElementById("filter-date").value;
    const statusFilter = document.getElementById("filter-status").value;
    const tableBody = document.querySelector("#history-table tbody"); // Target tbody only

    // Clear previous results & show loading state
    tableBody.innerHTML = "<tr><td colspan='6' class='p-2 text-center'>Loading...</td></tr>";

    let query = supabase.from("appointments").select("*");

    // Apply filters correctly
    if (dateFilter) {
        query = query.eq("date", dateFilter);
    }
    if (statusFilter) {
        query = query.eq("status", statusFilter);
    }

    // Fetch filtered data
    const { data, error } = await query;

    if (error) {
        console.error("Error fetching data:", error);
        tableBody.innerHTML = "<tr><td colspan='6' class='p-2 text-center text-red-500'>Error loading data</td></tr>";
        return;
    }

    // Handle empty results
    if (!data || data.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='6' class='p-2 text-center'>No records found</td></tr>";
        return;
    }

    // Insert rows dynamically
    tableBody.innerHTML = "";
    data.forEach(entry => {
        const formattedDate = new Date(entry.date).toISOString().split("T")[0]; // Ensure proper date format

        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="border p-2">${formattedDate}</td>
            <td class="border p-2">${entry.pet_name}</td>
            <td class="border p-2">${entry.service}</td>
            <td class="border p-2">${entry.old_status || "N/A"}</td>
            <td class="border p-2">${entry.status}</td>
            <td class="border p-2">${entry.cost ? `₱${entry.cost.toFixed(2)}` : "N/A"}</td>
        `;
        tableBody.appendChild(row);
    });
});

// 📌 Download Booking History as PDF
document.getElementById("download-pdf").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Booking History", 10, 10);

    let y = 20; // Starting Y position
    const rows = document.querySelectorAll("#history-table tbody tr");

    if (!rows.length || rows[0].innerText.includes("No records found")) {
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
