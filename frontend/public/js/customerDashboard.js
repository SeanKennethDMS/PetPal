import supabase from './supabaseClient.js';

loadRecentActivities();

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

loadRecentActivities();

document.getElementById("bookNowBtn").addEventListener("click", () => {
    const dashboardSection = document.getElementById("dashboard");
    const bookSection = document.getElementById("book-appointment");
  
    if (bookSection && dashboardSection) {
      dashboardSection.classList.add("hidden");
      bookSection.classList.remove("hidden");
    }
  });

async function loadRecentActivities() {
  const activitiesEl = document.getElementById("recentActivities");

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user.id;

    const { data: activities, error } = await supabase
      .from('appointments')
      .select('appointment_date, appointment_time, status, pets(pet_name), services(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !activities.length) {
      activitiesEl.innerHTML = `<p class="text-sm text-gray-500">No recent activities found.</p>`;
      return;
    }

    activitiesEl.innerHTML = `
      <ul class="space-y-2 text-sm text-gray-700">
        ${activities.map(app => {
          const pet = app.pets?.pet_name || "Unknown Pet";
          const service = app.services?.name || "Service";
          const date = new Date(app.appointment_date).toLocaleDateString();
          const time = formatTime(app.appointment_time);
          return `
            <li class="flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 7V3m8 4V3m-9 4h10M5 11h14M5 19h14M5 15h14" />
              </svg>
              ${pet} • ${service} on ${date} at ${time}
            </li>`;
        }).join('')}
      </ul>
    `;
  } catch (err) {
    console.error("Error loading recent activities:", err);
    activitiesEl.innerHTML = `<p class="text-sm text-red-500">Failed to load activities.</p>`;
  }
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':');
  const h = parseInt(hour);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}
