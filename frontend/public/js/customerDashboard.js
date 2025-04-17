import supabase from './supabaseClient.js';

loadRecentActivities();
loadUpcomingAppointments();

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

async function loadUpcomingAppointments() {
    const upcomingEl = document.getElementById("upcomingAppointments");
  
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user.id;
  
      const today = new Date().toISOString().split('T')[0]; 
  
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('appointment_date, appointment_time, pets(pet_name), services(name)')
        .eq('status', 'accepted')
        .eq('user_id', userId)
        .not('status', 'eq', 'cancelled')
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .limit(5);
  
      if (error || !appointments.length) {
        upcomingEl.innerHTML = `<p class="text-sm text-gray-500">No upcoming appointments.</p>`;
        return;
      }
  
      upcomingEl.innerHTML = `
        <ul class="text-sm text-gray-700 space-y-2">
            ${appointments.map(app => {
            const pet = app.pets?.pet_name || "Pet";
            const service = app.services?.name || "Service";
            const appointmentDate = new Date(app.appointment_date);
            const date = appointmentDate.toLocaleDateString();
            const time = formatTime(app.appointment_time);

            const message = getCountdownMessage(appointmentDate);

            return `
                <li class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                    <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 7V3m8 4V3m-9 4h10M5 11h14M5 19h14M5 15h14" />
                    </svg>
                    ${date} - ${pet} • ${service} at ${time}
                </div>
                ${message ? `<p class="text-xs text-gray-500 pl-7">${message}</p>` : ""}
                </li>`;
            }).join('')}
        </ul>
        `;
    } catch (err) {
      console.error("Error loading upcoming appointments:", err);
      upcomingEl.innerHTML = `<p class="text-sm text-red-500">Failed to load upcoming appointments.</p>`;
    }
  }

  function getCountdownMessage(appointmentDate) {
    const today = new Date();
    const oneDay = 1000 * 60 * 60 * 24;
  
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const appMid = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
  
    const diff = Math.round((appMid - todayMid) / oneDay);
  
    if (diff === 0) return "Your appointment is today!";
    if (diff === 1) return "Your appointment is tomorrow.";
    if (diff > 1 && diff <= 5) return `Your appointment is in ${diff} days.`;
  
    return "See you on your appointed date!";
  }
  
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':');
  const h = parseInt(hour);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}
