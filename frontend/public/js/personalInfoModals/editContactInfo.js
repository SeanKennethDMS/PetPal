document.addEventListener("DOMContentLoaded", () => {
    const editBtn = document.getElementById("edit-contact-btn");
    const modal = document.getElementById("edit-contact-modal");
    const cancelBtn = document.getElementById("contact-cancel-btn");
    const saveBtn = document.getElementById("contact-save-phone-btn");
    const phoneSpan = document.getElementById("phone");
    const editPhoneInput = document.getElementById("edit-phone");

    // Open modal and set input value
    editBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");
        editPhoneInput.value = phoneSpan.textContent;
    });

    // Close modal
    cancelBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    // Save new phone number
    saveBtn.addEventListener("click", () => {
        phoneSpan.textContent = editPhoneInput.value;
        modal.classList.add("hidden");
    });

    // Close modal if clicking outside
    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
    });
});