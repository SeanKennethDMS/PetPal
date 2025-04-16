'use strict';

import supabase from '../js/supabaseClient.js';
import { getBasePath } from './path-config.js';

const profileModal = document.getElementById('profile-edit-modal');
const modalFormContainer = document.getElementById('modal-form-container');
const tabs = document.querySelectorAll('.tab-btn');
const editButtons = document.querySelectorAll('.edit-btn');

const saveButton = document.getElementById('save-changes');

let phAddresses = null;

let lastSavedTimestamp = localStorage.getItem('profileLastSaved') || 0;
const LOCK_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

profileModal.style.transition = 'opacity 0.3s ease';
modalFormContainer.style.transition = 'opacity 0.2s ease';

document.addEventListener('DOMContentLoaded', async () => {
    await loadAddressData();
    await loadProfileData();
    checkEditLock();

    tabs.forEach(t => t.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="personal"]').classList.add('active');
});

function checkEditLock() {
    const currentTime = new Date().getTime();
    if (currentTime - lastSavedTimestamp < LOCK_DURATION){
        editButtons.forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = `<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
            </svg>`;
            btn.title = 'Editing locked for 30 days after last save';
        });
    }
}

  
async function loadAddressData() {
    try {
      const basePath = getBasePath();
      const response = await fetch(`${basePath}/js/data/philippines-addresses.json`);
      
      if (!response.ok) throw new Error('Failed to load address data');
      phAddresses = await response.json();
    } catch (error) {
      console.error('Error loading address JSON:', error);
      alert('Unable to load address data. Please try again later.');
    }
}

function showAlert(message, type = 'success'){
    const alert = document.createElement('div');
    alert.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
        type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
    }`;
    alert.textContent = message;
    document.body.appendChild(alert);

    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

async function getUserId() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
}

function sanitizeInputs(data) {
    const sanitized = {};
    for (const key in data) {
        sanitized[key] = data[key]?.replace(/[<>]/g, '') || '';
    }
    return sanitized;
}

function validateFormData(data, section) {
    let isValid = true;
    
    document.querySelectorAll('.border-red-500').forEach(el => {
        el.classList.remove('border-red-500', 'bg-red-50');
    });
    
    for (const key in data) {
        if (!data[key]?.trim()) {
            const fieldId = `edit-${key.replace('_', '-')}`;
            const field = document.getElementById(fieldId);
            if (field) {
                field.classList.add('border-red-500', 'bg-red-50');
                isValid = false;
            }
        }
    }
    
    if (section === 'contact') {
        const email = data.email;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            document.getElementById('edit-email').classList.add('border-red-500', 'bg-red-50');
            isValid = false;
        }
    }
    
    return isValid;
}


function openModal(section) {
    profileModal.style.opacity = '0';
    profileModal.classList.remove('hidden');
    setTimeout(() => profileModal.style.opacity = '1', 10);
    
    modalFormContainer.style.opacity = '0';
    setTimeout(() => {
        loadFormContent(section);
        modalFormContainer.style.opacity = '1';
    }, 200);
}

function closeModal(e) {
    if (e.target === profileModal || e.target.id === 'close-modal' || e.target.closest('#close-modal')) {
        profileModal.style.opacity = '0';
        setTimeout(() => profileModal.classList.add('hidden'), 300);
    }
}

function loadFormContent(section) {
    let formHTML = '';
    switch (section) {
        case 'personal':
            formHTML = `
                <div class="space-y-4">
                        <div>
                            <label class="block text-gray-700 mb-1">Last Name</label>
                            <input type="text" id="edit-last-name" class="w-full p-2 border rounded transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                                   value="${document.getElementById('last-name').textContent}" />
                        </div>
                        <div>
                            <label class="block text-gray-700">First Name</label>
                            <input type="text" id="edit-first-name" class="w-full p-2 border rounded transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                                value="${document.getElementById('first-name').textContent}" />
                        </div>
                        <div>
                            <label class="block text-gray-700">Middle Name</label>
                            <input type="text" id="edit-middle-name" class="w-full p-2 border rounded transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                                value="${document.getElementById('middle-name').textContent}" />
                        </div>
                        <div>
                            <label class="block text-gray-700">Birthdate</label>
                            <input type="date" id="edit-birthdate" class="w-full p-2 border rounded transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                                value="${document.getElementById('birthdate').textContent}" />
                        </div>
                    </div>
            `;
            break;
        case 'contact':
            formHTML = `
                <div class="space-y-4">
                        <div>
                            <label class="block text-gray-700 mb-1">Phone</label>
                            <input type="tel" id="edit-phone" class="w-full p-2 border rounded transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                                value="${document.getElementById('phone').textContent}" />
                        </div>
                        <div>
                            <label class="block text-gray-700">Email</label>
                            <input type="email" id="edit-email" class="w-full p-2 border rounded transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                                value="${document.getElementById('email').textContent}" />
                        </div>
                    </div>
            `;
            break;
        case 'address':
            formHTML = `
                <div class="space-y-4">
                        <div>
                            <label class="block text-gray-700 mb-1">Region</label>
                            <select id="edit-region" class="w-full p-2 border rounded transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"></select>
                        </div>
                        <div>
                            <label class="block text-gray-700">Province</label>
                            <select id="edit-province" class="w-full p-2 border rounded transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" disabled></select>
                        </div>
                        <div>
                            <label class="block text-gray-700">City/Municipality</label>
                            <select id="edit-municipality" class="w-full p-2 border rounded transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" disabled></select>
                        </div>
                        <div>
                            <label class="block text-gray-700">Barangay</label>
                            <select id="edit-barangay" class="w-full p-2 border rounded transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" disabled></select>
                        </div>
                    </div>
            `;
            break;
    }
    modalFormContainer.innerHTML = formHTML;

    if (section === 'address') loadAddressDropdowns();
}

function switchTab(newTab) {
    const currentTab = document.querySelector('.tab-btn.active');
    if (currentTab === newTab) return;
    
    modalFormContainer.style.opacity = '0';
    setTimeout(() => {
        currentTab.classList.remove('active');
        newTab.classList.add('active');
        loadFormContent(newTab.getAttribute('data-tab'));
        modalFormContainer.style.opacity = '1';
    }, 200);
}

function loadAddressDropdowns() {
    if (!phAddresses) {
        console.error('Address data not loaded');
        return;
    }

    const regionSelect = document.getElementById('edit-region');
    const provinceSelect = document.getElementById('edit-province');
    const municipalitySelect = document.getElementById('edit-municipality');
    const barangaySelect = document.getElementById('edit-barangay');

    // Clear existing options
    regionSelect.innerHTML = '<option value="">Select Region</option>';
    provinceSelect.innerHTML = '<option value="">Select Province</option>';
    municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
    barangaySelect.innerHTML = '<option value="">Select Barangay</option>';

    // Populate regions
    Object.keys(phAddresses).forEach(regionCode => {
        const region = phAddresses[regionCode];
        regionSelect.innerHTML += `<option value="${regionCode}">${region.region_name}</option>`;
    });

    // Region change handler
    regionSelect.addEventListener('change', () => {
        const regionCode = regionSelect.value;
        provinceSelect.innerHTML = '<option value="">Select Province</option>';
        municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
        provinceSelect.disabled = !regionCode;

        if (regionCode) {
            const provinces = phAddresses[regionCode].province_list;
            Object.keys(provinces).forEach(provinceName => {
                provinceSelect.innerHTML += `<option value="${provinceName}">${provinceName}</option>`;
            });
        }
    });

    // Province change handler
    provinceSelect.addEventListener('change', () => {
        const regionCode = regionSelect.value;
        const provinceName = provinceSelect.value;
        municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
        municipalitySelect.disabled = !provinceName;

        if (regionCode && provinceName) {
            const municipalities = phAddresses[regionCode].province_list[provinceName].municipality_list;
            Object.keys(municipalities).forEach(municipalityName => {
                municipalitySelect.innerHTML += `<option value="${municipalityName}">${municipalityName}</option>`;
            });
        }
    });

    // Municipality change handler
    municipalitySelect.addEventListener('change', () => {
        const regionCode = regionSelect.value;
        const provinceName = provinceSelect.value;
        const municipalityName = municipalitySelect.value;
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
        barangaySelect.disabled = !municipalityName;

        if (regionCode && provinceName && municipalityName) {
            const barangays = phAddresses[regionCode]
                .province_list[provinceName]
                .municipality_list[municipalityName]
                .barangay_list;

            barangays.forEach(barangay => {
                barangaySelect.innerHTML += `<option value="${barangay}">${barangay}</option>`;
            });
        }
    });
}

async function loadProfileData() {
    const userId = await getUserId();
    if (!userId) return;

    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle(); 

        if (error) throw error;

        if (data) {
            document.getElementById('last-name').textContent = data.last_name || '—';
            document.getElementById('first-name').textContent = data.first_name || '—';
            document.getElementById('middle-name').textContent = data.middle_name || '—';
            document.getElementById('birthdate').textContent = data.birthdate || '—';
            document.getElementById('phone').textContent = data.phone_number || '—';
            document.getElementById('email').textContent = data.email || '—';
            document.getElementById('region').textContent = data.region || '—';
            document.getElementById('province').textContent = data.province || '—';
            document.getElementById('municipality').textContent = data.municipality || '—';
            document.getElementById('barangay').textContent = data.barangay || '—';

            if (!lastSavedTimestamp) {
                lastSavedTimestamp = new Date().getTime();
                localStorage.setItem('profileLastSaved', lastSavedTimestamp);
            }
        } else {
            console.log('No profile data found');
           
            lastSavedTimestamp = new Date().getTime();
            localStorage.setItem('profileLastSaved', lastSavedTimestamp);
        }
    } catch (error) {
        console.error('Error loading profile:', error.message);
        showAlert('Failed to load profile.', 'error');
    }
}

async function saveProfileData(section) {
    const userId = await getUserId();
    if (!userId) return;

    const updatedData = getFormData(section);
    const isValid = validateFormData(updatedData, section);
    
    if (!isValid) {
        showAlert('Please fix the highlighted fields', 'error');
        return;
    }

    saveButton.disabled = true;
    saveButton.innerHTML = `
        <span class="inline-flex items-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
        </span>
    `;

    try {
        const { error } = await supabase
            .from('user_profiles')
            .update(sanitizeInputs(updatedData))
            .eq('user_id', userId);

        if (error) throw error;
        
        lastSavedTimestamp = new Date().getTime();
        localStorage.setItem('profileLastSaved', lastSavedTimestamp);
        
        showAlert('Profile updated! Editing locked for 30 days.');
        checkEditLock();
        closeModal({ target: profileModal });
        loadProfileData();
    } catch (error) {
        console.error('Save error:', error);
        showAlert('Error saving changes', 'error');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save Changes';
    }
}

function getFormData(section) {
    switch (section) {
        case 'personal':
            return {
                last_name: document.getElementById('edit-last-name').value,
                first_name: document.getElementById('edit-first-name').value,
                middle_name: document.getElementById('edit-middle-name').value,
                birthdate: document.getElementById('edit-birthdate').value
            };
        case 'contact':
            return {
                phone_number: document.getElementById('edit-phone').value,
                email: document.getElementById('edit-email').value
            };
        case 'address':
            return {
                region: document.getElementById('edit-region').value,
                province: document.getElementById('edit-province').value,
                municipality: document.getElementById('edit-municipality').value,
                barangay: document.getElementById('edit-barangay').value
            };
    }
}

editButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (button.disabled) {
            showAlert('Editing is locked for 30 days after saving', 'error');
            return;
        }
        
        const section = button.getAttribute('data-target');
        const targetTab = document.querySelector(`.tab-btn[data-tab="${section}"]`);
        switchTab(targetTab);
        openModal(section);
    });
});

tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab));
});

document.getElementById('close-modal').addEventListener('click', closeModal);
profileModal.addEventListener('click', closeModal);



document.getElementById('save-changes').addEventListener('click', async () => {
    const activeTab = document.querySelector('.tab-btn.active');
    const section = activeTab.getAttribute('data-tab');
    await saveProfileData(section);
});

