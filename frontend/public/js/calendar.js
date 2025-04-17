import supabase from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl || typeof FullCalendar === 'undefined') {
    console.error('FullCalendar not loaded or calendar element not found.');
    return;
  }

  const userId = await getUserId();
  if (!userId) return;

  const events = await fetchAppointments(userId);

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 300,
    headerToolbar: {
      start: 'title',
      center: '',
      end: 'prev,next today'
    },
    events,
    eventColor: '#3882F6',
    eventTextColor: 'white'
  });

  calendar.render();
});

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    console.error("Auth error or user not logged in:", error);
    return null;
  }
  return data.user.id;
}

async function fetchAppointments(userId) {
  const { data, error } = await supabase
    .from('appointments')
    .select('appointment_date, pets(pet_name), services(name)')
    .eq('user_id', userId)
    .not('status', 'eq', 'cancelled');

  if (error) {
    console.error("Failed to load appointments:", error);
    return [];
  }

  return data.map(app => ({
    title: `${app.pets?.pet_name} • ${app.services?.name}`,
    start: app.appointment_date
  }));
}
