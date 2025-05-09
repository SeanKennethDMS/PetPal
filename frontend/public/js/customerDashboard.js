import supabase from './supabaseClient.js';

loadRecentActivities();
loadUpcomingAppointments();
loadPetList();

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

async function loadPetList() {
  const petListEl = document.getElementById('petList');

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user.id;

    const { data: pets, error } = await supabase
      .from('pets')
      .select('id, pet_name, species, breed, weight, pets_birthdate, image_url')
      .eq('owner_id', userId);

    if(error || !pets.length) {
      petListEl.innerHTML = `<li class="text-sm text-gray-500">You have no pets listed.</li>`;
      return;
    }
    petListEl.innerHTML = pets.map(pet => {
      let imageHTML = '';
      
      if (pet.image_url && pet.image_url.startsWith('http')) {
        imageHTML = `<img src="${pet.image_url}" alt="${pet.pet_name}" class="w-10 h-10 rounded-full object-cover">`;
      } 
      else if (pet.image_url && pet.image_url.trim() !== '') {
        const { data } = supabase
          .storage
          .from('pet_images')
          .getPublicUrl(pet.image_url);
        if (data?.publicUrl) {
          imageHTML = `<img src="${data.publicUrl}" alt="${pet.pet_name}" class="w-10 h-10 rounded-full object-cover">`;
        }
      } 
      else {
        imageHTML = `<img src="../assets/images/${pet.species === 'dog' ? 'defaultDogIcon.png' : 'defaultCatIcon.png'}"
                     alt="Default Pet Image" class="w-10 h-10 rounded-full object-cover">`;
      }

      return `
        <li class="flex items-center gap-3 py-2">
          ${imageHTML}
          <div class="flex-grow">
            <p class="font-medium">${pet.pet_name}</p>
            <p class="text-xs text-gray-500">${pet.species} • ${pet.breed}</p>
          </div>
          <button class="text-blue-500 text-sm hover:underline" data-pet='${JSON.stringify(pet)}'>
            View Details
          </button>
        </li>
      `;
    }).join('');

    document.querySelectorAll('[data-pet]').forEach(button => {
      button.addEventListener('click', () => {
        const pet = JSON.parse(button.getAttribute('data-pet'));
        showPetModal(pet);
      });
    });
  } catch (err) {
    console.error('Error loading pets:', err);
    petListEl.innerHTML = `<li class="text-lg text-red-500">Failed to load pets.</li>`;
  }
}

function showPetModal(pet) {
  const modal = document.getElementById("petModal");
  const content = document.getElementById("petModalContent");
  let imageHTML = `
    <div class="w-20 h-20 rounded-full mx-auto mb-4 bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
      No Image
    </div>
  `;
  if (pet.image_url && pet.image_url.startsWith('http')) {
    imageHTML = `
      <img src="${pet.image_url}" alt="${pet.pet_name}" 
           class="w-20 h-20 object-cover rounded-full mx-auto mb-4 shadow" />
    `;
  } 
  else if (pet.image_url && pet.image_url.trim() !== '') {
    const { data, error } = supabase
      .storage
      .from('pet_images')
      .getPublicUrl(pet.image_url);
    if (data?.publicUrl && !error) {
      imageHTML = `
        <img src="${data.publicUrl}" alt="${pet.pet_name}" 
             class="w-20 h-20 object-cover rounded-full mx-auto mb-4 shadow" />
      `;
    }
  } 
  else {
    imageHTML = `
      <img src="../assets/images/${pet.species === 'dog' ? 'defaultDogIcon.png' : 'defaultCatIcon.png'}"
           alt="Default Pet Image"
           class="w-20 h-20 object-cover rounded-full mx-auto mb-4 shadow" />
    `;
  }
  content.innerHTML = `
    ${imageHTML}
    <p class="text-xl font-bold text-center text-gray-800">${pet.pet_name}</p>
    <p><strong>Species:</strong> ${pet.species}</p>
    <p><strong>Breed:</strong> ${pet.breed}</p>
    ${pet.weight ? `<p><strong>Weight:</strong> ${pet.weight} kg</p>` : ""}
    ${pet.pets_birthdate ? `<p><strong>Birthdate:</strong> ${new Date(pet.pets_birthdate).toLocaleDateString()}</p>` : ""}
  `;
  modal.classList.remove("hidden");
}

document.getElementById('closePetModal').addEventListener('click', () => {
  document.getElementById('petModal').classList.add('hidden');
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
              <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"/>
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
                <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 6V4m8 2V4m-9 4h10M3 10h18M21 10v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10m16 0H5m7 4v2m0 0h2m-2 0H9" />
                </svg>
                ${date} - ${pet} • ${service} at ${time}
              </div>
              ${message ? `<p class="text-xs pl-7">${message}</p>` : ""}
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

  if (diff === 0)
    return `<span class="text-blue-600">Your appointment is today!</span>`;
  if (diff === 1)
    return `<span class="text-amber-600">Your appointment is tomorrow.</span>`;
  if (diff > 1 && diff <= 5)
    return `<span class="text-slate-600">Your appointment is in ${diff} days.</span>`;
  
  return `<span class="text-gray-500">See you on your appointed date!</span>`;
}
  
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':');
  const h = parseInt(hour);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}
loadRecentActivities();
loadUpcomingAppointments();
loadPetList();