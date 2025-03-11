import supabase from "../supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
    const modal = document.getElementById("modal");
    const editBtn = document.getElementById("edit-personal-info-btn");
    const cancelBtn = document.getElementById("personal-cancel-btn");
    const saveBtn = document.getElementById("personal-save-btn");

    // Fields in the modal
    const editLastName = document.getElementById("edit-last-name");
    const editFirstName = document.getElementById("edit-first-name");
    const editMiddleName = document.getElementById("edit-middle-name");
    const editBirthdate = document.getElementById("edit-birthdate");

    // Fields in the main card
    const lastName = document.getElementById("last-name");
    const firstName = document.getElementById("first-name");
    const middleName = document.getElementById("middle-name");
    const birthdate = document.getElementById("birthdate");

    // Confirmation Modal Elements
    const confirmModal = document.getElementById("confirm-modal");
    const confirmYesBtn = document.getElementById("confirm-yes-btn");
    const confirmNoBtn = document.getElementById("confirm-no-btn");

    let lastUpdatedDate = null;

    // ✅ Function to capitalize first letter of each word
    function capitalizeName(name) {
        if (!name) return "";
        return name
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Function to check if 60 days have passed
    function canEditPersonalInfo(lastUpdatedDate) {
        if (!lastUpdatedDate) return true;

        const today = new Date();
        const lastUpdated = new Date(lastUpdatedDate);

        const diffTime = today - lastUpdated;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        return diffDays >= 60;
    }

    // Fetch authenticated user
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData?.user) {
        console.error("Error fetching user login:", authError?.message || "User not logged in");
        alert("Please log in again.");
        return;
    }

    const userId = userData.user.id;

    // Fetch the user's profile data
    const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, middle_name, birthdate, last_updated")
        .eq("user_id", userId)
        .single();

    if (profileError) {
        console.error("Error fetching user profile:", profileError.message);
        return;
    }

    // Populate the main card with user data
    lastName.textContent = userProfile.last_name || "";
    firstName.textContent = userProfile.first_name || "";
    middleName.textContent = userProfile.middle_name || "";
    birthdate.textContent = userProfile.birthdate || "";

    lastUpdatedDate = userProfile.last_updated;

    // Disable Edit Button if not allowed
    if (!canEditPersonalInfo(lastUpdatedDate)) {
        if (editBtn) {
            editBtn.disabled = true;
            editBtn.textContent = "Edit (Available after 60 days)";
        }
    }

    // Open Modal
    if (editBtn && modal) {
        editBtn.addEventListener("click", () => {
            if (!canEditPersonalInfo(lastUpdatedDate)) {
                alert("You can only edit your personal info every 60 days. Please try again later.");
                return;
            }

            modal.classList.remove("hidden");

            // Prefill modal inputs with current values
            editLastName.value = lastName.textContent;
            editFirstName.value = firstName.textContent;
            editMiddleName.value = middleName.textContent;
            editBirthdate.value = birthdate.textContent;
        });
    } else {
        console.warn("Edit button or modal not found.");
    }

    // Cancel button closes modal
    if (cancelBtn && modal) {
        cancelBtn.addEventListener("click", () => {
            modal.classList.add("hidden");
        });
    } else {
        console.warn("Cancel button or modal not found.");
    }

    // Save button opens confirm modal
    if (saveBtn && confirmModal) {
        saveBtn.addEventListener("click", () => {
            confirmModal.classList.remove("hidden");
        });
    } else {
        console.warn("Save button or confirm modal not found.");
    }

    // Confirm No (Cancel)
    if (confirmNoBtn && confirmModal) {
        confirmNoBtn.addEventListener("click", () => {
            confirmModal.classList.add("hidden");
        });
    } else {
        console.warn("Confirm No button or confirm modal not found.");
    }

    // Confirm Yes (Proceed with Save)
    if (confirmYesBtn && confirmModal) {
        confirmYesBtn.addEventListener("click", async () => {
            confirmModal.classList.add("hidden");

            const updatedData = {
                first_name: capitalizeName(editFirstName.value.trim()),
                last_name: capitalizeName(editLastName.value.trim()),
                middle_name: capitalizeName(editMiddleName.value.trim()),
                birthdate: editBirthdate.value.trim(),
                last_updated: new Date().toISOString()
            };

            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = "Saving...";
            }

            try {
                const { data, error } = await supabase
                    .from("user_profiles")
                    .update(updatedData)
                    .eq("user_id", userId)
                    .select();

                if (error) {
                    console.error("Error updating profile:", error.message);
                    alert("Update failed: " + error.message);
                } else {
                    console.log("Update successful:", data);
                    alert("Profile updated successfully!");

                    // Update UI with new data
                    lastName.textContent = updatedData.last_name;
                    firstName.textContent = updatedData.first_name;
                    middleName.textContent = updatedData.middle_name;
                    birthdate.textContent = updatedData.birthdate;

                    lastUpdatedDate = updatedData.last_updated;

                    if (!canEditPersonalInfo(lastUpdatedDate) && editBtn) {
                        editBtn.disabled = true;
                        editBtn.textContent = "Edit (Available after 60 days)";
                    }

                    if (modal) {
                        modal.classList.add("hidden");
                    }
                }
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = "Save";
                }
            }
        });
    } else {
        console.warn("Confirm Yes button or confirm modal not found.");
    }

    // Close modals if clicking outside
    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }

        if (e.target === confirmModal) {
            confirmModal.classList.add("hidden");
        }
    });

});
