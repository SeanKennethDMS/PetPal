import supabase from "../supabaseClient.js"; // Make sure to import supabase client

document.addEventListener("DOMContentLoaded", async () => {
    const editBtn = document.getElementById("edit-address-btn"); // Edit Button
    const modal = document.getElementById("edit-address-modal");
    const cancelBtn = document.getElementById("address-cancel-btn");
    const saveBtn = document.getElementById("address-save-btn");

    const barangaySpan = document.getElementById("barangay");
    const citySpan = document.getElementById("city");
    const regionSpan = document.getElementById("region");

    const editBarangayInput = document.getElementById("edit-barangay");
    const editCityInput = document.getElementById("edit-city");
    const editRegionInput = document.getElementById("edit-region");

    // Fetch and display address data when the page loads
    async function fetchAddress() {
        // Fetch authenticated user
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
            console.error("Authentication Error:", authError?.message || "User not logged in");
            alert("Please log in again.");
            return;
        }

        const userId = userData.user.id; // Correctly retrieve user ID

        // Fetch the user's address from the database
        const { data, error } = await supabase
            .from("user_profiles")
            .select("barangay, city, region")
            .eq("user_id", userId)
            .single(); // Use single() to get one result

        if (error) {
            console.error("Error fetching address:", error.message);
            alert("Could not load address.");
        } else {
            // Display the fetched address in the UI
            barangaySpan.textContent = data.barangay || "Not available";
            citySpan.textContent = data.city || "Not available";
            regionSpan.textContent = data.region || "Not available";
        }
    }

    // Fetch and display address data when the page loads
    await fetchAddress();

    // Open modal and set input values
    editBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");
        editBarangayInput.value = barangaySpan.textContent.trim();
        editCityInput.value = citySpan.textContent.trim();
        editRegionInput.value = regionSpan.textContent.trim();
    });

    // Close modal (Cancel Button)
    cancelBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    // Save new address details and update the database
    saveBtn.addEventListener("click", async () => {
        const updatedBarangay = editBarangayInput.value.trim();
        const updatedCity = editCityInput.value.trim();
        const updatedRegion = editRegionInput.value.trim();

        if (updatedBarangay === "" || updatedCity === "" || updatedRegion === "") {
            alert("All fields are required.");
            return;
        }

        // Fetch authenticated user
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
            console.error("Authentication Error:", authError?.message || "User not logged in");
            alert("Please log in again.");
            return;
        }

        const userId = userData.user.id; // Correctly retrieve user ID

        // Update the address in the user_profiles table
        const { data, error } = await supabase
            .from("user_profiles")
            .update({ 
                barangay: updatedBarangay, 
                city: updatedCity, 
                region: updatedRegion 
            })
            .eq("user_id", userId) // Ensure the address is updated for the correct user
            .select();

        if (error) {
            console.error("Error updating address:", error.message);
            alert("Update failed: " + error.message);
        } else {
            console.log("Address updated successfully:", data);
            alert("Address updated successfully!");

            // Update UI with the new address
            barangaySpan.textContent = updatedBarangay;
            citySpan.textContent = updatedCity;
            regionSpan.textContent = updatedRegion;

            modal.classList.add("hidden");
        }
    });

    // Close modal if clicking outside
    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
    });
});