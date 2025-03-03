document.addEventListener("DOMContentLoaded", () => {
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

    // Save Changes
    saveBtn.addEventListener("click", () => {
        lastName.textContent = editLastName.value;
        firstName.textContent = editFirstName.value;
        middleName.textContent = editMiddleName.value;
        birthdate.textContent = editBirthdate.value;
        modal.classList.add("hidden");
    });

    // Close modal if clicking outside the modal content
    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
    });
});