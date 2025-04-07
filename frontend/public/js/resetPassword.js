'use strict';

import supabase from '../js/supabaseClient.js';

const form = document.getElementById('resetForm');
const messageDiv = document.getElementById('message');
const statusMessage = document.getElementById('status-message');

const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');

function setupPasswordToggle() {
    const passwordInputs = [newPasswordInput, confirmPasswordInput];
    
    passwordInputs.forEach(input => {
        const eyeIcon = document.createElement('span');
        eyeIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5 text-gray-500">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        `;
        eyeIcon.classList.add('absolute', 'right-3', 'top-1/2', '-translate-y-1/2', 'cursor-pointer');
        
        const eyeSlashIcon = document.createElement('span');
        eyeSlashIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5 text-gray-500">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
        `;
        eyeSlashIcon.classList.add('absolute', 'right-3', 'top-1/2', '-translate-y-1/2', 'cursor-pointer', 'hidden');
        
        const wrapper = document.createElement('div');
        wrapper.classList.add('relative');
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        wrapper.appendChild(eyeIcon);
        wrapper.appendChild(eyeSlashIcon);
        
        eyeIcon.addEventListener('click', () => {
            input.setAttribute('type', 'text');
            eyeIcon.classList.add('hidden');
            eyeSlashIcon.classList.remove('hidden');
        });
        
        eyeSlashIcon.addEventListener('click', () => {
            input.setAttribute('type', 'password');
            eyeSlashIcon.classList.add('hidden');
            eyeIcon.classList.remove('hidden');
        });
    });
}

setupPasswordToggle();

supabase.auth.onAuthStateChange(async (event, session) => {
    if(event === 'PASSWORD_RECOVERY'){
        statusMessage.textContent = "You're now able to set a new password.";
    }
});



form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;

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
        messageDiv.textContent = 'Password updated successfully, Redirecting to login...';
        messageDiv.classList.remove('hidden');
        messageDiv.classList.remove('text-red-600');
        messageDiv.classList.add('text-green-600');

        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
    }
});