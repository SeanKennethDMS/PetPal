'use strict';

import supabase from "../js/supabaseClient.js";
import { getBasePath } from "../js/path-config.js";

// Global
let customers = [];

// DOM Elements
const searchInput = document.getElementById('searchCustomer');
const customerTable = document.getElementById('customerTable');
const editModal = document.getElementById('editModal');
const editPhoneInput = document.getElementById('editPhoneInput');
const confirmEditBtn = document.getElementById('confirmEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const submitEditBtn = document.getElementById('submitEditBtn');
const closeEditBtn = document.getElementById('closeEditModalBtn');

const deleteModal = document.getElementById('delmodal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const closeDeleteBtns = document.querySelectorAll('.closeDeleteModalBtn');

// Account Creation Elements
const addAccountBtn = document.getElementById('addAccountBtn');
const createAccountModal = document.getElementById('createAccountModal');
const saveAccountBtn = document.getElementById('saveAccountBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const accountTypeRadios = document.querySelectorAll('input[name="accountType"]');
const customerForm = document.getElementById('customerForm');
const businessAdminForm = document.getElementById('businessAdminForm');

// Edit Customer Modal Elements
const editCustomerModal = document.getElementById('editCustomerModal');
const editCustomerForm = document.getElementById('editCustomerForm');
const editCustomerId = document.getElementById('editCustomerId');
const editCustomerFirstName = document.getElementById('editCustomerFirstName');
const editCustomerLastName = document.getElementById('editCustomerLastName');
const editCustomerEmail = document.getElementById('editCustomerEmail');
const editCustomerContact = document.getElementById('editCustomerContact');

// Add In-Store Customer Form
const addCustomerForm = document.getElementById('addCustomerForm');

// ====================== Event Listeners ======================
document.addEventListener('DOMContentLoaded', () => {
  loadAllCustomers();
  
  // Account Type Toggle
  accountTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'customer') {
        customerForm.classList.remove('hidden');
        businessAdminForm.classList.add('hidden');
      } else {
        customerForm.classList.add('hidden');
        businessAdminForm.classList.remove('hidden');
      }
    });
  });

  // Create Account
  addAccountBtn.addEventListener('click', () => openModal(createAccountModal));
  closeModalBtn.addEventListener('click', () => closeModal(createAccountModal));
  saveAccountBtn.addEventListener('click', handleCreateAccount);
  cancelEditBtn.addEventListener('click', () => closeModal(editCustomerModal));

  // Edit Customer
  editCustomerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = editCustomerId.value;
    const firstName = editCustomerFirstName.value.trim();
    const lastName = editCustomerLastName.value.trim();
    const email = editCustomerEmail.value.trim();
    const phone = editCustomerContact.value.trim();
  
    // Validation
    if (!isValidName(firstName) || !isValidName(lastName)) {
      return alert('Names must start with capital letter');
    }
    if (!isValidEmail(email)) {
      return alert('Please enter a valid email');
    }
    if (!isValidPhilippinePhone(phone)) {
      return alert('Invalid phone number (09xxxxxxxxx or +639xxxxxxxxx)');
    }
  
    try {
      const { error } = await supabase.from('user_profiles')
        .update({
          first_name: capitalizeName(firstName),
          last_name: capitalizeName(lastName),
          email,
          phone_number: phone,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', id);
  
      if (error) throw error;
  
      alert('Customer updated successfully!');
      closeModal(editCustomerModal);
      await loadAllCustomers();
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update customer');
    }
  });

  // Add In-Store Customer
  addCustomerForm.addEventListener('submit', handleAddInStoreCustomer);
});

searchInput.addEventListener('input', (e) => {
  const searchValue = e.target.value.toLowerCase();

  const filtered = customers.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchValue) ||
    c.email.toLowerCase().includes(searchValue) ||
    c.phone_number.includes(searchValue) ||
    c.customer_type.toLowerCase().includes(searchValue)
  );

  displayCustomers(filtered);
});

// ====================== Load Customers ======================
async function loadAllCustomers() {
  try {
    // Registered (active only)
    const { data: registeredData, error: regError } = await supabase
    .from('users_table')
    .select(`
      id, role, role_type,
      user_profiles(
        user_id, first_name, last_name, email, phone_number
      )
    `)
    .eq('role', 'customer')
    .is('deleted_at', null);

    if (regError) throw regError;

    const registeredCustomers = (registeredData || []).map(user => {
      const p = user.user_profiles || {};
      return {
        id: user.id,
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        email: p.email || '',
        phone_number: p.phone_number || '',
        appointment_count: 'Registered Account',
        customer_type: 'registered'
      };
    });

    // Walk-in (active only)
    const { data: walkInData, error: walkInError } = await supabase
      .from('walk_in_customers')
      .select('*')
      .is('deleted_at', null);

    if (walkInError) throw walkInError;

    const walkInCustomers = (walkInData || []).map(walkin => ({
      id: walkin.id,
      first_name: walkin.first_name,
      last_name: walkin.last_name,
      email: walkin.email || 'N/A',
      phone_number: walkin.phone_number,
      appointment_count: 'Walk-in Client',
      customer_type: 'walk-in'
    }));

    customers = [...registeredCustomers, ...walkInCustomers]
      .sort((a, b) => a.last_name.localeCompare(b.last_name));

    displayCustomers(customers);

  } catch (err) {
    console.error('Error loading customers:', err);
    alert('Failed to load customers');
  }
}

// ====================== Display Customers ======================
function displayCustomers(list) {
  customerTable.innerHTML = '';

  list.forEach(c => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="border p-2">${c.last_name}</td>
      <td class="border p-2">${c.first_name}</td>
      <td class="border p-2">${c.email}</td>
      <td class="border p-2">${c.phone_number}</td>
      <td class="border p-2">${c.customer_type === 'walk-in' ? 'Walk-in' : 'Registered'}</td>
      <td class="border p-2 flex gap-2">
        <button class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-700" data-id="${c.id}" data-type="${c.customer_type}" onclick="window.handleEdit(this)">Edit</button>
        <button class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-700" data-id="${c.id}" data-type="${c.customer_type}" onclick="window.handleDelete(this)">Delete</button>
      </td>
    `;
    customerTable.appendChild(row);
  });
}

// ====================== Create Account ======================
async function handleCreateAccount() {
  const accountType = document.querySelector('input[name="accountType"]:checked').value;
  
  if (accountType === 'customer') {
    await createCustomerAccount();
  } else {
    await createBusinessAdminAccount();
  }
}

async function createCustomerAccount() {
  const firstName = document.getElementById('customerFirstName').value.trim();
  const lastName = document.getElementById('customerLastName').value.trim();
  const email = document.getElementById('customerEmail').value.trim();
  const password = document.getElementById('customerPhone').value.trim(); // Note: This is actually password field

  // Validation
  if (!isValidName(firstName) || !isValidName(lastName)) {
    return alert('Names must start with capital letter and contain only letters');
  }
  if (!isValidEmail(email)) {
    return alert('Please enter a valid email address');
  }
  if (password.length < 6) {
    return alert('Password must be at least 6 characters');
  }

  try {
    // Create auth user with email confirmation
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'customer',
          role_type: 'customer'
        },
        emailRedirectTo: `${getBasePath()}/pages/verifySignUp.html`
      }
    });

    if (error) throw error;

    // Create profile in user_profiles table
    const { error: profileError } = await supabase.from('user_profiles')
      .upsert({
        user_id: signUpData.user.id,
        first_name: capitalizeName(firstName),
        last_name: capitalizeName(lastName),
        email: email,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (profileError) throw profileError;

    alert('Account created successfully! A confirmation email has been sent to the user.');
    closeModal(createAccountModal);
    document.getElementById('customerForm').reset();
    await loadAllCustomers();
  } catch (error) {
    console.error('Account creation error:', error);
    alert(`Account creation failed: ${error.message}`);
  }
}

async function createBusinessAdminAccount() {
  const firstName = document.getElementById('businessFirstName').value.trim();
  const lastName = document.getElementById('businessLastName').value.trim();
  const email = document.getElementById('businessEmail').value.trim();
  const password = document.getElementById('businessPassword').value.trim();

  // Validation
  if (!isValidName(firstName) || !isValidName(lastName)) {
    return alert('Names must start with capital letter and contain only letters');
  }
  if (!isValidEmail(email)) {
    return alert('Please enter a valid email address');
  }
  if (password.length < 6) {
    return alert('Password must be at least 6 characters');
  }

  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'business_admin',
          role_type: 'business_admin'
        },
        emailRedirectTo: `${getBasePath()}/auth/callback`
      }
    });

    if (signUpError) throw signUpError;
    if (!signUpData.user) throw new Error('User creation failed');

    const { error: userTableError } = await supabase.from('users_table').upsert({
      id: signUpData.user.id,
      email: email,
      role: 'business_admin',
      role_type: 'business_admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (userTableError) throw userTableError;

    const { error: profileError } = await supabase.from('user_profiles')
      .upsert({
        user_id: signUpData.user.id,
        first_name: capitalizeName(firstName),
        last_name: capitalizeName(lastName),
        email: email,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (profileError) throw profileError;

    alert('Business admin account created successfully! A confirmation email has been sent.');
    
    document.getElementById('businessFirstName').value = '';
    document.getElementById('businessLastName').value = '';
    document.getElementById('businessEmail').value = '';
    document.getElementById('businessPassword').value = '';
    
    closeModal(createAccountModal);
  } catch (error) {
    console.error('Business admin creation error:', error);
    alert(`Account creation failed: ${error.message}`);
  }
}

// ====================== Edit Customer ======================
window.handleEdit = (btn) => {
  const id = btn.dataset.id;
  const type = btn.dataset.type;
  
  if (type !== 'registered') {
    return alert('Only registered customers can be edited');
  }

  const customer = customers.find(c => c.id === id && c.customer_type === 'registered');
  if (!customer) return;

  // Populate edit form
  editCustomerId.value = id;
  editCustomerFirstName.value = customer.first_name;
  editCustomerLastName.value = customer.last_name;
  editCustomerEmail.value = customer.email;
  editCustomerContact.value = customer.phone_number;

  openModal(editCustomerModal);
};

async function handleEditCustomerSubmit(e) {
  e.preventDefault();
  
  const id = editCustomerId.value;
  const firstName = editCustomerFirstName.value.trim();
  const lastName = editCustomerLastName.value.trim();
  const email = editCustomerEmail.value.trim();
  const phone = editCustomerContact.value.trim();

  // Validation
  if (!isValidName(firstName) || !isValidName(lastName)) {
    return alert('Names must start with capital letter and contain only letters');
  }
  if (!isValidEmail(email)) {
    return alert('Please enter a valid email address');
  }
  if (!isValidPhilippinePhone(phone)) {
    return alert('Invalid phone number format (09xxxxxxxxx or +639xxxxxxxxx)');
  }

  try {
    // Update user profile
    const { error } = await supabase.from('user_profiles')
      .update({
        first_name: capitalizeName(firstName),
        last_name: capitalizeName(lastName),
        email: email,
        phone_number: phone
      })
      .eq('user_id', id);

    if (error) throw error;

    alert('Customer updated successfully!');
    closeModal(editCustomerModal);
    await loadAllCustomers();
  } catch (error) {
    console.error('Update error:', error);
    alert('Failed to update customer');
  }
}

// ====================== Delete Customer ======================
window.handleDelete = (btn) => {
  const id = btn.dataset.id;
  const type = btn.dataset.type;

  openModal(deleteModal);

  confirmDeleteBtn.onclick = () => archiveCustomer(id, type);
  cancelDeleteBtn.onclick = () => closeModal(deleteModal);
  closeDeleteBtns.forEach(btn => btn.onclick = () => closeModal(deleteModal));
};

async function archiveCustomer(id, type) {
  try {
    if (type === 'registered') {
      const { error } = await supabase.from('users_table')
        .update({ 
          deleted_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', id);
      if (error) throw error;
    } else if (type === 'walk-in') {
      const { error } = await supabase.from('walk_in_customers')
        .update({ 
          deleted_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', id);
      if (error) throw error;
    }

    alert('Customer has been archived and will be permanently deleted after 60 days');
    closeModal(deleteModal);
    await loadAllCustomers();
  } catch (error) {
    console.error('Archive error:', error);
    alert('Failed to archive customer');
  }
}

// ====================== Add In-Store Customer ======================
async function handleAddInStoreCustomer(e) {
  e.preventDefault();
  
  const firstName = document.getElementById('walkinFirstName').value.trim();
  const lastName = document.getElementById('walkinLastName').value.trim();
  const email = document.getElementById('walkinEmail').value.trim();
  const phone = document.getElementById('walkinContact').value.trim();

  // Validation
  if (!firstName || !lastName) {
    return alert('First name and last name are required');
  }
  if (email && !isValidEmail(email)) {
    return alert('Please enter a valid email address');
  }
  if (!phone || !isValidPhilippinePhone(phone)) {
    return alert('Valid phone number is required (09xxxxxxxxx or +639xxxxxxxxx)');
  }

  try {
    const { error } = await supabase.from('walk_in_customers').insert({
      first_name: capitalizeName(firstName),
      last_name: capitalizeName(lastName),
      email: email || null,
      phone_number: phone,
      created_at: new Date().toISOString()
    });

    if (error) throw error;

    alert('Walk-in customer added successfully!');
    addCustomerForm.reset();
    await loadAllCustomers();
  } catch (error) {
    console.error('Add customer error:', error);
    alert('Failed to add walk-in customer');
  }
}

// ====================== Helper Functions ======================
function openModal(modal) {
  if (modal) modal.classList.remove('hidden');
}

function closeModal(modal) {
  if (modal) modal.classList.add('hidden');
}

function isValidName(name) {
  return /^[A-Z][a-zA-Z]*$/.test(name);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhilippinePhone(number) {
  return /^(09\d{9}|\+639\d{9})$/.test(number);
}

function capitalizeName(name) {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

// Initialize
loadAllCustomers();