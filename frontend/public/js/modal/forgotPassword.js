'use strict';

import supabase from '../supabaseClient.js'; // adjust path if needed
import { openModal, closeModal } from './modal.js'; // import open/close modal functions

document.addEventListener("DOMContentLoaded", () => {
  // === FORGOT PASSWORD EVENT LISTENERS ===
  const openForgotPasswordLink = document.getElementById("openForgotPasswordLink");
  const closeForgotPasswordModalBtn = document.getElementById("closeForgotPasswordModalBtn");
  const backToLoginLink = document.getElementById("backToLoginLink");
  const forgotPasswordSubmitBtn = document.getElementById("forgotPasswordSubmitBtn");

  const forgotEmailInput = document.getElementById("forgot-email");
  const forgotPhoneInput = document.getElementById("forgot-phone");

  // === OPEN FORGOT PASSWORD MODAL ===
  openForgotPasswordLink?.addEventListener("click", () => {
    closeModal("loginModal");
    openModal("forgotPasswordModal");
  });

  // === CLOSE FORGOT PASSWORD MODAL ===
  closeForgotPasswordModalBtn?.addEventListener("click", () => {
    closeModal("forgotPasswordModal");
  });

  // === BACK TO LOGIN LINK ===
  backToLoginLink?.addEventListener("click", () => {
    closeModal("forgotPasswordModal");
    openModal("loginModal");
  });

  // === SUBMIT FORGOT PASSWORD BUTTON ===
  forgotPasswordSubmitBtn?.addEventListener("click", handleForgotPassword);

  // === MUTUAL EXCLUSION (email vs phone)
  forgotEmailInput?.addEventListener("input", () => {
    if (forgotEmailInput.value.trim() !== "") {
      forgotPhoneInput.value = "";
      forgotPhoneInput.disabled = true;
    } else {
      forgotPhoneInput.disabled = false;
    }
  });

  forgotPhoneInput?.addEventListener("input", () => {
    if (forgotPhoneInput.value.trim() !== "") {
      forgotEmailInput.value = "";
      forgotEmailInput.disabled = true;
    } else {
      forgotEmailInput.disabled = false;
    }
  });
});


// HANDLE FORGOT PASSWORD FUNCTION
async function handleForgotPassword() {
  const email = document.getElementById("forgot-email").value.trim();
  const phone = document.getElementById("forgot-phone").value.trim();

  // === If both empty
  if (!email && !phone) {
    alert("Please enter your Gmail address (Phone OTP coming soon!).");
    return;
  }

  // === EMAIL RESET LOGIC
  if (email) {
    if (!validateGmail(email)) {
      alert("Please enter a valid Gmail address (e.g. yourname@gmail.com).");
      return;
    }

    try {
      // Check if user exists in Supabase users table
      const { data, error } = await supabase
        .from('user_profiles') 
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        alert(`No account found with email: ${email}`);
        return;
      }

      // Send reset email via Supabase Auth
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

      if (resetError) {
        console.error("Supabase Reset Error:", resetError);
        alert("Failed to send reset email. Please try again later.");
        return;
      }

      alert(`Reset link sent to ${email}. Check your inbox (or spam folder)!`);
      closeModal("forgotPasswordModal");
      openModal("loginModal");

    } catch (err) {
      console.error("Unexpected Error:", err);
      alert("Something went wrong. Please try again later.");
    }

    return; 
  }

  // === PHONE LOGIC (COMING SOON)
  if (phone) {
    alert("Phone OTP reset coming soon!");
    return;
  }
}


// EMAIL VALIDATION FUNCTION
function validateGmail(email) {
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  return gmailRegex.test(email);
}

// PHONE VALIDATION FUNCTION (OPTIONAL - COMING SOON)
function validatePHPhone(phone) {
  const phoneRegex = /^(09|\+639)\d{9}$/; // PH format: starts with 09 or +639
  return phoneRegex.test(phone);
}
