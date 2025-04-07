'use strict';

import supabase from '../js/supabaseClient.js';

const form = document.getElementById('resetForm');
const messageDiv = document.getElementById('message');
const statusMessage = document.getElementById('status-message');

supabase.auth.onAuthStateChange(async (event, session) => {
    if(event === 'PASSWORD_RECOVERY'){
        statusMessage.textContent = "You're now able to set a new password.";
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Clear previous messages
    messageDiv.textContent = '';
    messageDiv.classList.add('hidden');

    // Validation
    if(newPassword !== confirmPassword) {
        messageDiv.textContent = "Passwords don't match!";
        messageDiv.classList.remove('hidden');
        messageDiv.classList.remove('text-green-600');
        messageDiv.classList.add('text-red-600');
        return;
    }

    if(newPassword.length < 8){
        messageDiv.textContent = "Password must be at least 8 characters.";
        messageDiv.classList.remove('hidden');
        messageDiv.classList.remove('text-green-600');
        messageDiv.classList.add('text-red-600');
        return;
    }

    const { data, error } = await supabase.auth.updateUser({ password: newPassword });

    if(error) {
        messageDiv.textContent = error.message;
        messageDiv.classList.remove('hidden');
        messageDiv.classList.add('text-red-600');
    } else {
        messageDiv.textContent = 'Password updated successfully! Redirecting to login...';
        messageDiv.classList.remove('hidden');
        messageDiv.classList.remove('text-red-600');
        messageDiv.classList.add('text-green-600');

        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
    }
});