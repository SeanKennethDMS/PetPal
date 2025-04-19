import supabase from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    loadTodaysAppointment();
    loadPendingRequests();
    loadUpcomingAppointments();
  });

  async function loadTodaysAppointment(page = 1, limit = 3) {
    const container = document.getElementById('todaysAppointmentsAdmin');
    const pagination = document.getElementById('todaysAppointmentsPagination');
  
    if (!container || !pagination) return;
  
    container.innerHTML = `<p>Loading today's appointments...</p>`;
    pagination.innerHTML = '';
  
    try {
      const today = new Date().toISOString().split('T')[0];
      const offset = (page - 1) * limit;
  
      const { data: appointments, error, count } = await supabase
        .from('appointments')
        .select('appointment_date, appointment_time, pets(pet_name, image_url, species), services(name)', { count: 'exact' })
        .eq('appointment_date', today)
        .eq('status', 'accepted')
        .order('appointment_time', { ascending: true })
        .range(offset, offset + limit - 1);
  
      if (error) throw error;
  
      if (!appointments || appointments.length === 0) {
        container.innerHTML = `<p class="text-sm text-gray-500">No appointments scheduled for today.</p>`;
        return;
      }
  
      container.innerHTML = appointments.map(app => {
        const pet = app.pets;
        const service = app.services?.name || 'Service';
        const time = formatTime(app.appointment_time);
        const imageUrl = getPetImage(pet);
  
        return `
          <div class="flex items-start gap-4 bg-gray-50 p-3 rounded-lg shadow-sm">
            <img src="${imageUrl}" alt="${pet?.pet_name}" class="w-12 h-12 rounded-full object-cover border">
            <div>
              <p class="font-semibold text-gray-800">${pet?.pet_name || 'Pet Name'}</p>
              <p class="text-sm text-gray-600">${service}</p>
              <p class="text-xs text-gray-500">${formatdate(app.appointment_date)} at ${time}</p>
            </div>
          </div>
        `;
      }).join('');
  
      const totalPages = Math.ceil(count / limit);
  
      if (page > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '←';
        prevBtn.className = 'px-3 py-1 border rounded bg-white text-blue-600';
        prevBtn.onclick = () => loadTodaysAppointment(page - 1, limit);
        pagination.appendChild(prevBtn);
      }
  
      if (page < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '→';
        nextBtn.className = 'px-3 py-1 border rounded bg-white text-blue-600';
        nextBtn.onclick = () => loadTodaysAppointment(page + 1, limit);
        pagination.appendChild(nextBtn);
      }
  
    } catch (err) {
      console.error("Error loading today's appointments:", err);
      container.innerHTML = `<p class="text-sm text-red-500">Failed to load today's appointments.</p>`;
    }
  }

function formatTime(timeStr) {
    if(!timeStr) return '';
    const [hour, minute] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayhour = h % 12 || 12;
    return `${displayhour}:${minute} ${ampm}`;
}

function formatdate(dateStr){
    return new Date(dateStr).toLocaleDateString(undefined, {month: 'short', day:'numeric', year: 'numeric'});
}

function getPetImage(pet){
    if(pet?.image_url && pet.image_url.startsWith('http')){
        return pet.image_url;
    }
    return `../assets/images/${pet?.species === 'dog' ? 'defaultDogIcon.png' : 'defaultCatIcon.png'}`;
}

async function loadPendingRequests(page = 1, limit = 3){
    const container = document.getElementById('pendingRequestsAdmin');
    const pagination = document.getElementById('pendingRequestsPagination');

    if(!container || !pagination) return;

    const offset = (page - 1) * limit;
    container.innerHTML = `<p class="text-sm text-gray-500">Loading...</p>`;
    pagination.innerHTML = '';

    try {
        const {data, error, count } = await supabase
            .from('appointments')
            .select('appointment_id, appointment_date, appointment_time, pets(pet_name, image_url, species), services(name)', { count: 'exact'})
            .eq('status', 'pending')
            .range(offset, offset + limit - 1)
            .order('appointment_date', { ascending: true});

        if (error) throw error;    

        if (!data || data.length === 0) {
            container.innerHTML = `<p class="text-sm text-gray-500">No pending requests found.</p>`;
            return;
        }

        container.innerHTML = data.map(app => {
            const pet = app.pets;
            const service = app.services?.name || 'Unknown Service';
            const date = new Date(app.appointment_date).toLocaleDateString();
            const time = formatTime(app.appointment_time);
            const image = app.pets?.image_url
                ? pet.image_url
                : `../assets/images/${pet?.species === 'dog' ? 'defaultDogIcon.png' : 'defaultCatIcon.png'}`;

            return `
                <div class="flex items-start gap-3 bg-gray-50 p-3 rounded-lg shadow-sm">
                    <img src="${image}" class="w-12 h-12 rounded-full object-cover" alt="${pet?.pet_name || 'Pet'}"/>
                    <div>
                        <p class="font-semibold">${pet?.pet_name || 'Unknown Pet'}</p>
                        <p class="text-sm text-gray-600">${service}</p>
                        <p class="text-xs text-gray-500">${date} at ${time}</p>
                    </div>
                </div>
            `;
        }).join('');

        const totalPages = Math.ceil(count / limit);
        if (totalPages > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.textContent = '◀';
            prevBtn.className = `px-3 py-1 border rounded ${page === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-gray-100'}`;
            prevBtn.disabled = page === 1;
            prevBtn.onclick = () => {
                if (page > 1) loadPendingRequests(page - 1, limit);
            };

            const nextBtn = document.createElement('button');
            nextBtn.textContent = '▶';
            nextBtn.className = `px-3 py-1 border rounded ${page === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-gray-100'}`;
            nextBtn.disabled = page === totalPages;
            nextBtn.onclick = () => {
                if (page < totalPages) loadPendingRequests(page + 1, limit);
            };

            pagination.appendChild(prevBtn);
            pagination.appendChild(nextBtn);
        }
    } catch (err) {
        console.error('Error loading pending requests:', err);
        container.innerHTML = `<p class="text-sm text-red-500">Failed to load pending requests.</p>`;
    }
}

async function loadUpcomingAppointments(page = 1, limit = 3) {
    const container = document.getElementById('upcomingAppointmentsAdmin');
    const pagination = document.getElementById('upcomingAppointmentsPagination');

    if (!container || !pagination) return;

    const offset = (page - 1) * limit;
    container.innerHTML = `<p class="text-sm text-gray-500">Loading...</p>`;
    pagination.innerHTML = '';

    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const { data, error, count } = await supabase
            .from('appointments')
            .select('appointment_date, appointment_time, pets(pet_name, image_url, species), services(name)', { count: 'exact' })
            .eq('status', 'accepted')
            .gte('appointment_date', tomorrowStr)
            .order('appointment_date', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `<p class="text-sm text-gray-500">No upcoming appointments.</p>`;
            return;
        }

        container.innerHTML = data.map(app => {
            const pet = app.pets;
            const service = app.services?.name || 'Service';
            const date = new Date(app.appointment_date).toLocaleDateString();
            const time = formatTime(app.appointment_time);
            const image = pet?.image_url
                ? pet.image_url
                : `../assets/images/${pet?.species === 'dog' ? 'defaultDogIcon.png' : 'defaultCatIcon.png'}`;

            return `
                <div class="flex items-start gap-3 bg-gray-50 p-3 rounded-lg shadow-sm">
                    <img src="${image}" class="w-12 h-12 rounded-full object-cover" alt="${pet?.pet_name || 'Pet'}"/>
                    <div>
                        <p class="font-semibold">${pet?.pet_name || 'Unknown Pet'}</p>
                        <p class="text-sm text-gray-600">${service}</p>
                        <p class="text-xs text-gray-500">${date} at ${time}</p>
                    </div>
                </div>
            `;
        }).join('');

        const totalPages = Math.ceil(count / limit);
        if (totalPages > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.textContent = '◀';
            prevBtn.className = `px-3 py-1 border rounded ${page === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-gray-100'}`;
            prevBtn.disabled = page === 1;
            prevBtn.onclick = () => {
                if (page > 1) loadUpcomingAppointments(page - 1, limit);
            };

            const nextBtn = document.createElement('button');
            nextBtn.textContent = '▶';
            nextBtn.className = `px-3 py-1 border rounded ${page === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-gray-100'}`;
            nextBtn.disabled = page === totalPages;
            nextBtn.onclick = () => {
                if (page < totalPages) loadUpcomingAppointments(page + 1, limit);
            };

            pagination.appendChild(prevBtn);
            pagination.appendChild(nextBtn);
        }

    } catch (err) {
        console.error('Error loading upcoming appointments:', err);
        container.innerHTML = `<p class="text-sm text-red-500">Failed to load upcoming appointments.</p>`;
    }
}