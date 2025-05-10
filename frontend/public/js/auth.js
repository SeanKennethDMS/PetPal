document.addEventListener("DOMContentLoaded", function () {
    const userSession = localStorage.getItem("userSession");
    const userRole = localStorage.getItem("userRole");
    const currentPage = window.location.pathname;

    if (!userSession) {
        alert("Access denied. Please log in.");
        window.location.href = "/frontend/public/index.html";
        return;
    }

    // Admin page access: system_admin and business_admin only
    if (
        currentPage.includes("admin-dashboard.html") &&
        !["system_admin", "business_admin"].includes(userRole)
    ) {
        alert("Unauthorized access!");
        window.location.href = "/frontend/public/index.html";
        return;
    }

    // Customer page access: customer only
    if (
        currentPage.includes("customer-dashboard.html") &&
        userRole !== "customer"
    ) {
        alert("Unauthorized access!");
        window.location.href = "/frontend/public/index.html";
        return;
    }
});
