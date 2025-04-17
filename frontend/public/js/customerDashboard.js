import supabase from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const nameEl = document.getElementById('customerName');
    const welcomeEl = document.getElementById('dashboardWelcomeText');

    try{
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if(authError || !authData?.user){
            console.error('Auth error:', authError);
            nameEl.textContent = 'Customer';
            welcomeEl.textContent = "We couldn't fetch your info. Please refresh.";
            return;
        }

        const userId = authData.user.id;
        const { data: userProfile, error: userError } = await supabase 
        .from('users_table')
        .select('first_name')
        .eq('id', userId)
        .single();

        if(userError || !userProfile){
            console.error('Failed to load user profile:', userError);
            nameEl.textContent = 'Customer';
            welcomeEl.textContent = 'Welcome to your dashboard.';
            return;
        }
        nameEl.textContent = userProfile.first_name;
        welcomeEl.textContent = `Here is an overview of your pets, appointments, and recent activity.`;
    } catch (err) {
        console.error('Unexpected error:', err);
        nameEl.textContent = 'Customer';
        welcomeEl.textContent = 'Welcome to your dashboard.';
    }
});