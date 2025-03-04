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

    // Fetch authenticated user
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData?.user) {
        console.error("Error fetching user login:", authError?.message || "User not logged in");
        return;
    }

    const userId = userData.user.id; // Get logged-in user's ID

    // Fetch the user's profile data from the user_profiles table
    const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, middle_name, birthdate")
        .eq("user_id", userId)
        .single(); // Fetch the profile data for the authenticated user

    if (profileError) {
        console.error("Error fetching user profile:", profileError.message);
        return;
    }

    // Populate the main card with user data
    lastName.textContent = userProfile.last_name;
    firstName.textContent = userProfile.first_name;
    middleName.textContent = userProfile.middle_name;
    birthdate.textContent = userProfile.birthdate;

    // Open Modal
    editBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");
        editLastName.value = lastName.textContent;
        editFirstName.value = firstName.textContent;
        editMiddleName.value = middleName.textContent;
        editBirthdate.value = birthdate.textContent;
    });

    // Close Modal
    cancelBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    // Save Changes and Update Database
    saveBtn.addEventListener("click", async () => {
        const updatedData = {
            first_name: editFirstName.value.trim(),
            last_name: editLastName.value.trim(),
            middle_name: editMiddleName.value.trim(),
            birthdate: editBirthdate.value.trim(),
        };

        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
            console.error("Authentication Error:", authError?.message || "User not logged in");
            alert("Please log in again.");
            return;
        }

        const userId = userData.user.id; // Correctly retrieve user ID
        console.log("User ID:", userId);
        console.log("Data to Update:", updatedData);

        // Perform update
        const { data, error } = await supabase
            .from("user_profiles")
            .update(updatedData)
            .eq("user_id", userId) // Ensure correct column
            .select();

        if (error) {
            console.error("Error updating profile:", error.message);
            alert("Update failed: " + error.message);
        } else {
            console.log("Update successful:", data);
            alert("Profile updated successfully!");

            // Update UI
            lastName.textContent = updatedData.last_name;
            firstName.textContent = updatedData.first_name;
            middleName.textContent = updatedData.middle_name;
            birthdate.textContent = updatedData.birthdate;

            modal.classList.add("hidden");
        }
    });

    // Close modal if clicking outside the modal content
    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
    });
});