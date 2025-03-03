
    document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("logoutModal");
    const openModalButtons = document.querySelectorAll("#openLogoutModal, #openLogoutModalSidebar");
    const closeModalButton = document.getElementById("cancelLogout");
    const confirmLogoutButton = document.getElementById("confirmLogout");

    // Open modal when clicking logout buttons
    openModalButtons.forEach(button => {
        button.addEventListener("click", () => {
            modal.classList.remove("hidden");
        });
    });

    // Close modal when clicking cancel button
    closeModalButton.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    // Logout function
    window.logoutUser = async function (event) {
        try {
            // If using Supabase for authentication
            if (typeof supabase !== "undefined") {
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error("Logout failed:", error.message);
                    return;
                }
            }

            // Clear local/session storage
            localStorage.removeItem("userSession"); // Modify based on your stored session data
            sessionStorage.clear();

            // Redirect to login page
            window.location.href = "../index.html"; // Ensure this is your login page
        } catch (error) {
            console.error("Error logging out:", error);
        }
    }

    // Confirm Logout: Execute logout function
    confirmLogoutButton.addEventListener("click", () => {
        modal.classList.add("hidden"); // Close the modal
        logoutUser(); // Call the logout function
    });
});