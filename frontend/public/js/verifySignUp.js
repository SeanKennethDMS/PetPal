import supabase from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const statusEl = document.getElementById('status-message');  
    const messageEl = document.getElementById('message');
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
        statusEl.textContent = 'Verification failed or session expired. Please try logging in.';
        messageEl.classList.remove('hidden');  
        messageEl.classList.add('bg-red-500');  
        messageEl.textContent = 'Verification failed or session expired.';
        return;
    }

    statusEl.textContent = 'Email verified successfully! Redirecting to login...';

    messageEl.classList.remove('hidden');  
    messageEl.classList.add('bg-green-500');  
    messageEl.textContent = 'Email successfully verified!';

    setTimeout(() => {
        window.location.href = '../index.html';
    }, 3000);
});
