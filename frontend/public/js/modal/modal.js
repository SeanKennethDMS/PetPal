'use strict';

// === DOM CONTENT LOADED ===
document.addEventListener("DOMContentLoaded", () => {

  // === OPEN MODAL BUTTONS ===
  const openLoginBtn = document.getElementById("openLoginBtn");
  const bookNowBtn = document.getElementById("bookNowBtn");
  const openLoginFromSignup = document.getElementById("openLoginFromSignup");
  const openSignupFromLogin = document.getElementById("openSignupFromLogin");

  // === CLOSE MODAL BUTTONS ===
  const closeSignupModalBtn = document.getElementById("closeSignupModalBtn");
  const closeLoginModalBtn = document.getElementById("closeLoginModalBtn");

  // === REMEMBER ME ===
  loadRememberMe();

  // === PASSWORD VISIBILITY TOGGLE ===
  const togglePassword = document.getElementById("togglePassword");
  togglePassword?.addEventListener("click", togglePasswordVisibility);

  // === OPEN MODALS ===
  openLoginBtn?.addEventListener("click", () => openModal("loginModal"));
  bookNowBtn?.addEventListener("click", () => openModal("loginModal"));
  openLoginFromSignup?.addEventListener("click", () => openModal("loginModal"));
  openSignupFromLogin?.addEventListener("click", () => openModal("signupModal"));

  // === CLOSE MODALS ===
  closeSignupModalBtn?.addEventListener("click", () => closeModal("signupModal"));
  closeLoginModalBtn?.addEventListener("click", () => closeModal("loginModal"));

  // === CLOSE MODALS ON OUTSIDE CLICK ===
  window.addEventListener("click", (event) => {
    document.querySelectorAll(".modal").forEach((modal) => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  // === CLOSE MODALS ON ESC KEY ===
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });

  // === REMEMBER ME CHECKBOX ===
  const rememberMeCheckbox = document.getElementById("rememberMe");
  rememberMeCheckbox?.addEventListener("change", handleRememberMe);
});

// ============================================
// MODAL CONTROLS
// ============================================
function openModal(modalId) {
  closeAllModals();
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "flex";
  } else {
    console.warn(`Modal with ID '${modalId}' not found.`);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
    resetModal(modalId);
  }
}

function closeAllModals() {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    modal.style.display = "none";
  });
}

function resetModal(modalId) {
  if (modalId === "loginModal") {
    const rememberMe = localStorage.getItem("rememberMe") === "true";
    if (!rememberMe) {
      document.getElementById("login-email").value = "";
      document.getElementById("login-password").value = "";
      document.getElementById("rememberMe").checked = false;
    }
  }

  if (modalId === "signupModal") {
    document.getElementById("first_name").value = "";
    document.getElementById("last_name").value = "";
    document.getElementById("sign-up-email").value = "";
    document.getElementById("sign-up-password").value = "";
  }
}

// ============================================
// REMEMBER ME LOGIC
// ============================================
function handleRememberMe() {
  const rememberMe = document.getElementById("rememberMe").checked;
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  if (rememberMe) {
    localStorage.setItem("rememberMe", true);
    localStorage.setItem("email", email);
    localStorage.setItem("password", password);
  } else {
    localStorage.setItem("rememberMe", false);
    localStorage.removeItem("email");
    localStorage.removeItem("password");
  }
}

function loadRememberMe() {
  const rememberMe = localStorage.getItem("rememberMe") === "true";
  const email = localStorage.getItem("email");
  const password = localStorage.getItem("password");

  if (rememberMe) {
    document.getElementById("login-email").value = email || "";
    document.getElementById("login-password").value = password || "";
    document.getElementById("rememberMe").checked = true;
  }
}

// ============================================
// PASSWORD VISIBILITY TOGGLE
// ============================================
function togglePasswordVisibility() {
  const passwordInput = document.getElementById("login-password");
  const toggleSpan = document.getElementById("togglePassword");
  const existingIcon = document.getElementById("eyeIcon");

  if (existingIcon) existingIcon.remove();

  let newIcon;

  if (passwordInput.type === "password") {
    passwordInput.type = "text";

    newIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    newIcon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    newIcon.setAttribute("fill", "none");
    newIcon.setAttribute("viewBox", "0 0 24 24");
    newIcon.setAttribute("stroke", "currentColor");
    newIcon.setAttribute("class", "w-5 h-5");
    newIcon.setAttribute("id", "eyeIcon");

    newIcon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M13.875 18.825A10.05 10.05 0 0112 19
           c-4.478 0-8.268-2.943-9.542-7
           a9.974 9.974 0 012.041-3.362M6.657 6.657A9.953 9.953 0 0112 5
           c4.478 0 8.268 2.943 9.542 7
           a9.978 9.978 0 01-4.421 5.642M15 12
           a3 3 0 11-6 0 3 3 0 016 0z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M3 3l18 18" />
    `;
  } else {
    passwordInput.type = "password";

    newIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    newIcon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    newIcon.setAttribute("fill", "none");
    newIcon.setAttribute("viewBox", "0 0 24 24");
    newIcon.setAttribute("stroke", "currentColor");
    newIcon.setAttribute("class", "w-5 h-5");
    newIcon.setAttribute("id", "eyeIcon");

    newIcon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M2.458 12C3.732 7.943 7.523 5 12 5
           c4.478 0 8.268 2.943 9.542 7
           -1.274 4.057-5.064 7-9.542 7
           -4.477 0-8.268-2.943-9.542-7z" />
    `;
  }

  toggleSpan.appendChild(newIcon);
  passwordInput.focus();
}

export { openModal, closeModal, closeAllModals };