'use strict';

import supabase from '../supabaseClient.js'; 
import { openModal, closeModal } from './modal.js'; 

document.addEventListener("DOMContentLoaded", () => {
  const openForgotPasswordLink = document.getElementById("openForgotPasswordLink");
  const closeForgotPasswordModalBtn = document.getElementById("closeForgotPasswordModalBtn");
  const backToLoginLink = document.getElementById("backToLoginLink");
  const forgotPasswordSubmitBtn = document.getElementById("forgotPasswordSubmitBtn");

  const forgotEmailInput = document.getElementById("forgot-email");
  const forgotPhoneInput = document.getElementById("forgot-phone");

  openForgotPasswordLink?.addEventListener("click", () => {
    closeModal("loginModal");
    openModal("forgotPasswordModal");
  });

  closeForgotPasswordModalBtn?.addEventListener("click", () => {
    closeModal("forgotPasswordModal");
  });

  backToLoginLink?.addEventListener("click", () => {
    closeModal("forgotPasswordModal");
    openModal("loginModal");
  });

  forgotPasswordSubmitBtn?.addEventListener("click", handleForgotPassword);

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


async function handleForgotPassword() {
  const email = document.getElementById("forgot-email").value.trim();
  const phone = document.getElementById("forgot-phone").value.trim();

  if (!email && !phone) {
    alert("Please enter your Email address (Phone OTP coming soon!).");
    return;
  }

  if (email) {
    if (!validateGmail(email)) {
      alert("Please enter a valid Email address (e.g. yourname@gmail.com).");
      return;
    }

    try {
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
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://pet-pal-alpha.vercel.app/pages/reset-password.html'
      });

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

  if (phone) {
    alert("Phone OTP reset coming soon!");
    return;
  }
}


function validateGmail(email) {
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  return gmailRegex.test(email);
}

function validatePHPhone(phone) {
  const phoneRegex = /^(09|\+639)\d{9}$/;
  return phoneRegex.test(phone);
}
