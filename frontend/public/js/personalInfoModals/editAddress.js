document.addEventListener("DOMContentLoaded", () => {
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

    // Save new address details
    saveBtn.addEventListener("click", () => {
        if (editBarangayInput.value.trim() === "" || editCityInput.value.trim() === "" || editRegionInput.value.trim() === "") {
            alert("All fields are required.");
            return;
        }

        barangaySpan.textContent = editBarangayInput.value;
        citySpan.textContent = editCityInput.value;
        regionSpan.textContent = editRegionInput.value;

        modal.classList.add("hidden");
    });

    // Close modal if clicking outside
    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
    });
});