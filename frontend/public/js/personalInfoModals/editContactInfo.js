import supabase from "../supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
    const editBtn = document.getElementById("edit-contact-btn");
    const modal = document.getElementById("edit-contact-modal");
    const cancelBtn = document.getElementById("contact-cancel-btn");
    const saveBtn = document.getElementById("contact-save-phone-btn");
    const phoneSpan = document.getElementById("phone");
    const editPhoneInput = document.getElementById("edit-phone");

    // Function to validate Philippine phone number format
    function isValidPhoneNumber(phone) {
        const pattern = /^09\d{9}$/; // Must start with 09 and be 11 digits
        return pattern.test(phone);
    }

    // Fetch the phone number from the database
    async function fetchPhoneNumber() {
        // Fetch authenticated user
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
            console.error("Authentication Error:", authError?.message || "User not logged in");
            alert("Please log in again.");
            return;
        }

        const userId = userData.user.id;

        // Fetch user's phone number from the database
        const { data, error } = await supabase
            .from("user_profiles")
            .select("phone_number")
            .eq("user_id", userId)
            .single(); // Fetch only one record

        if (error) {
            console.error("Error fetching phone number:", error.message);
            alert("Could not load phone number.");
        } else {
            phoneSpan.textContent = data.phone_number || "Not available";
        }
    }

    // Fetch and display phone number on page load
    await fetchPhoneNumber();

    // Open modal and set input value
    editBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");
        editPhoneInput.value = phoneSpan.textContent.trim();
    });

    // Close modal
    cancelBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    // Save new phone number and update database
    saveBtn.addEventListener("click", async () => {
        const updatedPhone = editPhoneInput.value.trim();

        // Validate input
        if (updatedPhone === "") {
            alert("Phone number is required.");
            return;
        }

        if (!isValidPhoneNumber(updatedPhone)) {
            alert("Invalid phone number. It must start with 09 and be 11 digits.");
            return;
        }

        // Fetch authenticated user
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
            console.error("Authentication Error:", authError?.message || "User not logged in");
            alert("Please log in again.");
            return;
        }

        const userId = userData.user.id;

        // Disable save button while saving
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        try {
            // Update the phone number in the user_profiles table
            const { data, error } = await supabase
                .from("user_profiles")
                .update({ phone_number: updatedPhone })
                .eq("user_id", userId)
                .select();

            if (error) {
                console.error("Error updating phone number:", error.message);
                alert("Update failed: " + error.message);
            } else {
                console.log("Phone number updated successfully:", data);
                alert("Phone number updated successfully!");

                // Update UI with new phone number
                phoneSpan.textContent = updatedPhone;
                modal.classList.add("hidden");
            }
        } finally {
            // Re-enable save button
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
        }
    });

    // Close modal if clicking outside
    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
    });
});
