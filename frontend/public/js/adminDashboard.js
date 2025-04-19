import supabase from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    loadTodaysAppointment();
    loadPendingRequests();
    loadUpcomingAppointments();
    loadServicesToDo();
    populateDropdowns();
});

let products = [];
let services = [];

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

async function loadServicesToDo(page = 1, limit = 3) {
    const container = document.getElementById('todaysSchedule');
    const pagination = document.getElementById('schedulePagination');

    if (!container || !pagination) return;

    const offset = (page - 1) * limit;
    container.innerHTML = `<p class="text-sm text-gray-500">Loading...</p>`;
    pagination.innerHTML = '';

    try {
        const today = new Date().toISOString().split('T')[0];

        const { data: appointments, error, count } = await supabase
            .from('appointments')
            .select('appointment_id, appointment_date, appointment_time, pets(pet_name, image_url, species), services(name)', { count: 'exact' })
            .eq('appointment_date', today)
            .eq('status', 'accepted')
            .order('appointment_time', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        if (!appointments || appointments.length === 0) {
            container.innerHTML = `<p class="text-sm text-gray-500">No services scheduled for today.</p>`;
            return;
        }

        container.innerHTML = appointments.map(app => {
            const pet = app.pets;
            const service = app.services?.name || 'Service';
            const time = formatTime(app.appointment_time);
            const imageUrl = getPetImage(pet);

            return `
                <div class="bg-gray-50 p-4 rounded-lg shadow-sm space-y-2">
                    <div class="flex items-start gap-4">
                        <img src="${imageUrl}" class="w-12 h-12 rounded-full object-cover border" alt="${pet?.pet_name}" />
                        <div>
                            <p class="font-semibold text-gray-800">${pet?.pet_name || 'Pet Name'}</p>
                            <p class="text-sm text-gray-600">${service}</p>
                            <p class="text-xs text-gray-500">${formatdate(app.appointment_date)} at ${time}</p>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-2">
                        <button class="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                            onclick='openProceedModal(${JSON.stringify(app).replace(/'/g, '&#39;')})'>Proceed</button>
                        <button class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">No Show</button>
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
            prevBtn.onclick = () => loadServicesToDo(page - 1, limit);

            const nextBtn = document.createElement('button');
            nextBtn.textContent = '▶';
            nextBtn.className = `px-3 py-1 border rounded ${page === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-gray-100'}`;
            nextBtn.disabled = page === totalPages;
            nextBtn.onclick = () => loadServicesToDo(page + 1, limit);

            pagination.appendChild(prevBtn);
            pagination.appendChild(nextBtn);
        }

    } catch (err) {
        console.error('Error loading services to-do:', err);
        container.innerHTML = `<p class="text-sm text-red-500">Failed to load services to-do.</p>`;
    }
}


let currentBillingItems = [];
let currentAppointment = null;

function openProceedModal(appointment) {
    const modal = document.getElementById("proceedModal");
    const detailsContainer = document.getElementById("appointmentDetails");
    const billingList = document.getElementById("billingList");
    const billingTotal = document.getElementById("billingTotal");

    currentAppointment = appointment;
    currentBillingItems = [];

    const pet = appointment.pets;
    const service = appointment.services?.name || 'Unknown Service';
    const time = formatTime(appointment.appointment_time);
    const date = formatdate(appointment.appointment_date);
    const petImg = getPetImage(pet);

    detailsContainer.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="${petImg}" alt="${pet?.pet_name}" class="w-12 h-12 rounded-full object-cover border">
        <div>
          <p><strong>Pet:</strong> ${pet?.pet_name}</p>
          <p><strong>Service:</strong> ${service}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
        </div>
      </div>
    `;

    billingList.innerHTML = '';
    billingTotal.textContent = '0.00';

    modal.classList.remove('hidden');

    loadProductsAndServices().then(populateDropdowns);
}

async function loadProductsAndServices() {
    try {
        const { data: productData, error: productErr } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'Active');

        const { data: serviceData, error: serviceErr } = await supabase
            .from('services')
            .select('*')
            .eq('status', 'Active');

        if (productErr || serviceErr) throw productErr || serviceErr;

        products = productData || [];
        services = serviceData || [];
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

function updateBillingList() {
    const billingList = document.getElementById("billingList");
    const billingTotal = document.getElementById("billingTotal");

    if (!billingList || !billingTotal) return;

    billingList.innerHTML = currentBillingItems.map(item => {
        const qty = item.quantity || 1;
        const lineTotal = item.price * qty;

        return `
            <li class="flex justify-between">
                <span>${item.name} ${qty > 1 ? `x${qty}` : ''}</span>
                <span>₱${lineTotal.toFixed(2)}</span>
            </li>
        `;
    }).join('');

    const total = currentBillingItems.reduce((sum, item) => {
        const qty = item.quantity || 1;
        return sum + (item.price * qty);
    }, 0);

    billingTotal.textContent = total.toFixed(2);
}

function populateDropdowns() {
    const serviceSelect = document.getElementById('serviceSelect');
    const productSelect = document.getElementById('productSelect');

    serviceSelect.innerHTML = `<option value="">-- Select a Service --</option>` +
        services.flatMap(s => {
            const priceObj = s.price || {};
            return Object.entries(priceObj).map(([size, price]) => 
                `<option value="${s.id}|${size}">${s.name} (${size}) - ₱${Number(price).toFixed(2)}</option>`
            );
        }).join('');

    productSelect.innerHTML = `<option value="">-- Select a Product --</option>` +
        products.map(p => {
            const price = Number(p.price);
            return `<option value="${p.id}">${p.name} - ₱${!isNaN(price) ? price.toFixed(2) : '0.00'}</option>`;
        }).join('');
}

document.addEventListener("DOMContentLoaded", () => {
    const addProductBtn = document.getElementById("addProductBtn");
    const addServiceBtn = document.getElementById("addServiceBtn");
    const cancelBtn = document.getElementById("cancelBillingBtn");
    const closeBtn = document.getElementById("closeProceedModal");
    const completeBtn = document.getElementById("completeBillingBtn");

    if (addProductBtn) {
        addProductBtn.addEventListener("click", () => {
            const selectedId = document.getElementById('productSelect').value;
            const selected = products.find(p => p.id == selectedId);
            if (!selected) return;

            const existing = currentBillingItems.find(item => item.type === 'product' && item.id === selected.id);
            if (existing) {
                existing.quantity = (existing.quantity || 1) + 1;
            } else {
                currentBillingItems.push({
                    type: 'product',
                    id: selected.id,
                    name: selected.name,
                    price: Number(selected.price),
                    quantity: 1
                });
            }

            updateBillingList();
        });
    }

    if (addServiceBtn) {
        addServiceBtn.addEventListener("click", () => {
            const value = document.getElementById('serviceSelect').value;
            if (!value) return;

            const [serviceId, size] = value.split('|');
            const selected = services.find(s => s.id == serviceId);
            if (!selected || !selected.price || !selected.price[size]) return;

            const nameWithSize = `${selected.name} (${size})`;
            const exists = currentBillingItems.find(item => item.type === 'service' && item.name === nameWithSize);
            if (exists) return; 

            const price = Number(selected.price[size]);
            currentBillingItems.push({
                type: 'service',
                id: selected.id,
                name: nameWithSize,
                price: price,
                quantity: 1
            });

            updateBillingList();
        });
    }

    if (completeBtn) {
        completeBtn.addEventListener("click", async () => {
            if (currentBillingItems.length === 0) {
                alert("Nothing to complete. Please add items first.");
                return;
            }

            const subtotal = currentBillingItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
            const tax = subtotal * 0.12;
            const total = subtotal + tax;

            const paymentMethod = document.getElementById("paymentMethod")?.value || 'Cash';

            try {
                const transactionCode = 'TXN-' + Date.now().toString(36).toUpperCase();
                const { data: transaction, error: txnErr } = await supabase
                    .from("transactions")
                    .insert({
                        transaction_code: transactionCode,
                        subtotal_amount: subtotal,
                        tax_amount: tax,
                        total_amount: total,
                        payment_method: paymentMethod,
                        status: "Paid",
                        transaction_type: "Sale"
                    })
                    .select();

                if (txnErr) throw txnErr;

                const transactionId = transaction[0].id;

                const itemsToInsert = currentBillingItems.map(item => ({
                    transaction_id: transactionId,
                    item_id: item.id || null,
                    item_type: item.type,
                    item_name: item.name,
                    quantity: item.quantity || 1,
                    price: item.price
                }));

                const { error: itemErr } = await supabase
                    .from("transaction_items")
                    .insert(itemsToInsert);
                if (itemErr) throw itemErr;

                for (const item of currentBillingItems) {
                    if (item.type === "product" && item.id) {
                        await supabase.rpc("decrement_inventory", {
                            product_id: item.id,
                            amount: item.quantity || 1
                        });
                    }
                }
                await supabase
                    .from("appointments")
                    .update({ status: "completed" })
                    .eq("appointment_id", currentAppointment.appointment_id);

                alert("Transaction complete!");

                currentBillingItems = [];
                updateBillingList();
                document.getElementById("proceedModal").classList.add("hidden");
                await loadServicesToDo();

            } catch (error) {
                console.error("Complete Error:", error);
                alert("Something went wrong during transaction.");
            }
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            document.getElementById("proceedModal").classList.add("hidden");
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            document.getElementById("proceedModal").classList.add("hidden");
        });
    }
});
  
window.openProceedModal = openProceedModal;