'use strict';

import supabase from "../js/supabaseClient.js";

let customers = [];

/* ========================
   SEARCH CUSTOMER BY NAME/EMAIL/CONTACT
======================== */
document.getElementById('searchCustomer').addEventListener('input', (e) => {
  const searchValue = e.target.value.toLowerCase();

  const filteredCustomers = customers.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchValue) ||
    c.email.toLowerCase().includes(searchValue) ||
    c.phone_number.includes(searchValue)
  );

  displayCustomers(filteredCustomers);
});

/* ========================
   LOAD CUSTOMERS (users_table + user_profiles)
======================== */
async function loadCustomers() {
  const { data: customersData, error } = await supabase
    .from('users_table')
    .select(`
      id,
      role,
      user_profiles (
        user_id,
        first_name,
        last_name,
        email,
        phone_number
      )
    `)
    .eq('role', 'customer');

  if (error) {
    console.error('Error loading customers:', error);
    return;
  }

  const customersWithAppointments = await Promise.all(customersData.map(async (user) => {
    const profile = user.user_profiles;
    const appointment_id = 65;
    const { data:count, error:appointmentError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (appointmentError) {
      console.error('Error fetching appointments:', appointmentError);
    }

    return {
      id: user.id,
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      email: profile?.email || '',
      phone_number: profile?.phone_number || '',
      appointment_count: count || 0
    };
  }));

  // Sort by last name
  customersWithAppointments.sort((a, b) => {
    const nameA = a.last_name.toUpperCase();
    const nameB = b.last_name.toUpperCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  customers = customersWithAppointments;
  displayCustomers(customers);
}

/* ========================
   DISPLAY CUSTOMERS IN TABLE
======================== */
function displayCustomers(customersToShow) {
  const tableBody = document.getElementById('customerTable');
  tableBody.innerHTML = '';

  customersToShow.forEach(c => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="border p-2">${c.first_name}</td>
      <td class="border p-2">${c.last_name}</td>
      <td class="border p-2">${c.email}</td>
      <td class="border p-2">${c.phone_number}</td>
      <td class="border p-2">${c.appointment_count} Appointments</td>
      <td class="border p-2 flex gap-2">
        <button onclick="editCustomer('${c.id}', '${c.phone_number}')" class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-700">Edit</button>
        <button onclick="openDeleteModal('${c.id}')" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-700">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

/* ========================
   EDIT CUSTOMER PHONE NUMBER USING MODAL
======================== */
function editCustomer(id, currentPhoneNumber) {
  const modal = document.getElementById('editModal');
  const phoneInput = document.getElementById('editPhoneInput');
  const confirmBtn = document.getElementById('confirmEditBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  const closeBtn = document.getElementById('closeEditModalBtn');

  // Show modal
  modal.classList.remove('hidden');

  // Pre-fill phone number
  phoneInput.value = currentPhoneNumber;

  // Clean up previous listeners to prevent duplicates
  const newPhoneInputHandler = (e) => {
    let value = e.target.value;
    value = value.replace(/[^\d+]/g, '');
    if (value.includes('+') && value.indexOf('+') > 0) {
      value = value.replace(/\+/g, '');
    }
    if (value.startsWith('+')) {
      value = value.substring(0, 13);
    } else {
      value = value.substring(0, 11);
    }
    e.target.value = value;
  };
  phoneInput.removeEventListener('input', newPhoneInputHandler);
  phoneInput.addEventListener('input', newPhoneInputHandler);

  // Confirm button listener
  confirmBtn.onclick = async () => {
    const newPhone = phoneInput.value.trim();

    if (!isValidPhilippinePhone(newPhone)) {
      alert('Please enter a valid Philippine phone number!\n\nFormats allowed:\n09xxxxxxxxx or +639xxxxxxxxx');
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ phone_number: newPhone })
      .eq('user_id', id);

    if (error) {
      alert('Failed to update phone number');
      console.error(error);
    } else {
      console.log('Phone number updated successfully!');
      modal.classList.add('hidden');
      loadCustomers();
    }
  };

  // Close handlers
  cancelBtn.onclick = () => modal.classList.add('hidden');
  closeBtn.onclick = () => modal.classList.add('hidden');
}

/* ========================
   VALIDATE PHILIPPINE PHONE NUMBER
======================== */
function isValidPhilippinePhone(number) {
  const regex = /^(09\d{9}|\+639\d{9})$/;
  return regex.test(number);
}

/* ========================
   DELETE CUSTOMER WITH MODAL CONFIRMATION
======================== */
function openDeleteModal(id) {
  const modal = document.querySelectorAll('.deleteModal');
  const mod = document.getElementById('delmodal');
  const confirmBtn = document.getElementById('confirmDeleteBtn');
  const cancelBtn = document.getElementById('cancelDeleteBtn');
  const closeBtn = document.querySelectorAll('.closeDeleteModalBtn');

  // Show the modal
  modal.forEach(del => {
   del.classList.remove("hidden");
  })

  // Remove old listeners before adding new ones
  confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  closeBtn.replaceWith(closeBtn.cloneNode(true));

  // Select the cloned buttons again
  const newConfirmBtn = document.getElementById('confirmDeleteBtn');
  const newCancelBtn = document.getElementById('cancelDeleteBtn');
  const newCloseBtn = document.querySelector('.closeDeleteModalBtn');

  // Add listeners to the fresh cloned buttons
  newConfirmBtn.addEventListener('click', () => deleteCustomer(id));
  newCancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
  newCloseBtn.addEventListener('click', () =>  {
    // modal.classList.remove('hidden');
    mod.remove();
  });
}

async function deleteCustomer(id) {
  const modal = document.getElementById('deleteModal');

  console.log(`Deleting customer with ID: ${id}`);

  try {
    // Delete from user_profiles first
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', id);

    if (profileError) {
      console.error('Error deleting user profile:', profileError);
      alert('Failed to delete customer profile!');
      return;
    }

    // Then delete from users_table
    const { error: userError } = await supabase
      .from('users_table')
      .delete()
      .eq('id', id);

    if (userError) {
      console.error('Error deleting user:', userError);
      alert('Failed to delete user!');
      return;
    }

    console.log('Customer deleted successfully!');
    alert('Customer deleted successfully!');
    modal.classList.add('hidden');
    loadCustomers();

  } catch (error) {
    console.error('Unexpected error:', error);
    alert('An unexpected error occurred!');
  }
}

/* ========================
   ADD CUSTOMER
======================== */
async function addCustomerHandler(e) {
  e.preventDefault();

  const firstName = document.getElementById('customerFirstName').value.trim();
  const lastName = document.getElementById('customerLastName').value.trim();
  const email = document.getElementById('customerEmail').value.trim();
  const phone = document.getElementById('customerContact').value.trim();

  if (!firstName || !lastName || !email || !phone) {
    alert('Please fill out all fields');
    return;
  }

  const { data: newUser, error: userError } = await supabase
    .from('users_table')
    .insert([{ role: 'customer' }])
    .select()
    .single();

  if (userError || !newUser) {
    alert('Failed to create customer user');
    console.error(userError);
    return;
  }

  const userId = newUser.id;

  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert([{
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone_number: phone
    }]);

  if (profileError) {
    alert('Failed to create customer profile');
    console.error(profileError);
    return;
  }

  console.log('Customer added successfully');
  document.getElementById('addCustomerForm').reset();
  loadCustomers();
}

/* ========================
   EVENT LISTENERS
======================== */
document.getElementById('addCustomerForm').addEventListener('submit', addCustomerHandler);

/* ========================
   INITIAL LOAD
======================== */
loadCustomers();

/* ========================
   GLOBAL SCOPE FUNCTIONS
======================== */
window.editCustomer = editCustomer;
window.openDeleteModal = openDeleteModal;
