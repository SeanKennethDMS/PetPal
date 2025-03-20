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
    c.phone_number.includes(searchValue) ||
    c.customer_type.toLowerCase().includes(searchValue)
  );

  displayCustomers(filteredCustomers);
});

/* ========================
   LOAD CUSTOMERS (users_table + user_profiles)
======================== */
async function loadAllCustomers() {

  try {
    //1. Load si registered users
    const {data: registeredData, error: regError } = await supabase
    .from('users_table')
    .select(`
      id,
      role,
      user_profiles(
        user_id,
        first_name,
        last_name,
        email,
        phone_number
        )
      `)
      .eq('role', 'customer');
 
      if (regError) {
        console.error('Error loading registered customers:', regError);
      }

      //Map registered users to common structure
      const registeredCustomers = (registeredData || []).map((user) => {
        const profile = user.user_profiles;
        return {
          id: user.id,
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          email: profile?.email || '',
          phone_number: profile?.phone_number || '',
          appointment_count: 'Registered Account', //para distinguishable
          customer_type: 'registered'
        };
      });

      //2. Load natin si walk-in customers
      const { data: walkInData, error: walkInError } = await supabase
      .from('walk_in_customers')
      .select('*');

      if(walkInError) {
        console.error('Error loading walk-in customers:',walkInError);
      }

      //Map walk-in customers to the same structure
      const walkInCustomers = (walkInData || []).map((walkin) => {
        return {
          id: walkin.id,
          first_name: walkin.first_name,
          last_name: walkin.last_name,
          email: walkin.email || 'N/A',
          phone_number: walkin.phone_number,
          appointment_count: 'Walk-in Client',
          customer_type: 'walk-in'
        };
      });

      //3. Combine the two lists
      const combinedCustomers = [...registeredCustomers, ...walkInCustomers];

      //4. Sort by last name 
      combinedCustomers.sort((a,b) => {
        const nameA = a.last_name.toUpperCase();
        const nameB = b.last_name.toUpperCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });

      //5. Save to global array tsaka display
      customers = combinedCustomers;
      displayCustomers(customers);
  } catch (err) {
    console.error('Unexpected error loading customers:', err);
  }
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
      <td class="border p-2">${c.last_name}</td>
      <td class="border p-2">${c.first_name}</td>
      <td class="border p-2">${c.email}</td>
      <td class="border p-2">${c.phone_number}</td>
      <td class="border p-2">${c.customer_type === 'walk-in' ? 'Walk-in' : 'Registered'}</td>
      
      <td class="border p-2 flex gap-2">
        <button onclick="editCustomer('${c.id}', '${c.phone_number}')" class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-700">Edit</button>
        <button onclick="openDeleteModal('${c.id}', '${c.customer_type}')"class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-700">Delete</button>
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
      loadAllCustomers();
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
function openDeleteModal(id, type) {
  const modal = document.querySelectorAll('.deleteModal');
  const mod = document.getElementById('delmodal');
  const confirmBtn = document.getElementById('confirmDeleteBtn');
  const cancelBtn = document.getElementById('cancelDeleteBtn');
  const closeBtns = document.querySelectorAll('.closeDeleteModalBtn');

  // Show the modal
  modal.forEach(del => {
    del.classList.remove("hidden");
  })

  const newConfirmBtn = confirmBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);

  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

  const newCloseBtns = [];
  closeBtns.forEach((btn) => {
    const clonedBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(clonedBtn, btn);
    newCloseBtns.push(clonedBtn);
  });

  newConfirmBtn.addEventListener('click', () => deleteCustomer(id, type));
  newCancelBtn.addEventListener('click', () => {
    modal.forEach(del => del.classList.add('hidden'));
  });

  newCloseBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      modal.forEach(del => del.classList.add('hidden'));
    });
  });
}


async function deleteCustomer(id, type) {
  const modal = document.getElementById('delmodal');

  console.log(`Deleting customer with ID: ${id}, Type: ${type}`);

  try {
    if (type === 'registered') {
      // 1. Delete from user_profiles first
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', id);

      if (profileError) {
        console.error('Error deleting user profile:', profileError);
        alert('Failed to delete customer profile!');
        return;
      }

      // 2. Then delete from users_table
      const { error: userError } = await supabase
        .from('users_table')
        .delete()
        .eq('id', id);

      if (userError) {
        console.error('Error deleting user:', userError);
        alert('Failed to delete registered user!');
        return;
      }

    } else if (type === 'walk-in') {
      // 3. Delete from walk_in_customers
      const { error: walkInError } = await supabase
        .from('walk_in_customers')
        .delete()
        .eq('id', id);

      if (walkInError) {
        console.error('Error deleting walk-in customer:', walkInError);
        alert('Failed to delete walk-in customer!');
        return;
      }

    } else {
      console.warn('Unknown customer type!');
      alert('Unknown customer type!');
      return;
    }

    // Success feedback
    console.log('Customer deleted successfully!');
    alert('Customer deleted successfully!');

    // Hide modal if it exists
    if (modal) {
      modal.classList.add('hidden');
    } else {
      console.warn('Delete modal not found!');
    }

    //Reload customers list
    loadAllCustomers();

  } catch (error) {
    console.error('Unexpected error:', error);
    alert('An unexpected error occurred!');
  }
}

/* ========================
   ADD CUSTOMER
======================== */
async function addWalkInCustomer(e) {
  e.preventDefault();

  const firstName = document.getElementById('customerFirstName').value.trim();
  const lastName = document.getElementById('customerLastName').value.trim();
  const emailInput = document.getElementById('customerEmail').value.trim();
  const email = emailInput === '' ? null : emailInput;
  const phone = document.getElementById('customerContact').value.trim();

  if (!firstName || !lastName || !phone) {
    alert('Please fill out all fields (First Name, Last Name, Contact).');
    return;
  }

  try {
    const {data, error } = await supabase
    .from('walk_in_customers')
    .insert([{
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone_number: phone
    }])
    .select()
    .single();

    if (error) {
      console.error('Error adding walk-in customer: ', error);
      alert('Something went wrong while adding walk-in client');
      return;
    }

    console.log('Walk-in customer added succesfully!', data);
    alert('Walk-in customer added succesfully! ');

    //Reset ung form para ready sa next entry
    document.getElementById('addCustomerForm').reset();

    //Reload table kung ginagamit rin sa customer list display
    loadAllCustomers();
  } catch (err) {
    console.error('Unexpected error:', err);
    alert('Unexpected error occured. Check console!');
  }
}

/* ========================
   EVENT LISTENERS
======================== */
document.getElementById('addCustomerForm').addEventListener('submit', addWalkInCustomer);

/* ========================
   INITIAL LOAD
======================== */
loadAllCustomers();

/* ========================
   GLOBAL SCOPE FUNCTIONS
======================== */
window.editCustomer = editCustomer;
window.openDeleteModal = openDeleteModal;
