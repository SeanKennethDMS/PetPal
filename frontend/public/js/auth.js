

document.addEventListener("DOMContentLoaded", function () {
    const userSession = localStorage.getItem("userSession");
    const userRole = localStorage.getItem("userRole");

    if (!userSession) {
        alert("Access denied. Please log in.");
        window.location.href = "/frontend/public/index.html"; // Redirect to login page
        return;
    }

    // ✅ Ensure correct role-based access
    const currentPage = window.location.pathname;

    if (currentPage.includes("admin-dashboard.html") && userRole !== "admin") {
        alert("Unauthorized access!");
        window.location.href = "/frontend/public/index.html"; // Redirect to home
        return;
    }

    if (currentPage.includes("customer-dashboard-orig.html") && userRole !== "customer") {
        alert("Unauthorized access!");
        window.location.href = "/frontend/public/index.html"; // Redirect to home
        return;
    }
});