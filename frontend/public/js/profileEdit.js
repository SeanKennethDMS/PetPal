'use strict';

import supabase from '../js/supabaseClient.js';
import { getBasePath } from './path-config.js';

// Initialize elements with null checks
const profileModal = document.getElementById('profile-edit-modal');
const modalFormContainer = document.getElementById('modal-form-container');
const tabs = document.querySelectorAll('.tab-btn');
const editButtons = document.querySelectorAll('.edit-btn');
const saveButton = document.getElementById('save-changes');

// Get tab elements
const personalTab = document.getElementById('personal-tab');
const contactTab = document.getElementById('contact-tab');
const addressTab = document.getElementById('address-tab');

let phAddresses = null;
const LOCK_DURATION = 60 * 24 * 60 * 60 * 1000; // 60 days in ms

// Form data storage object
let formData = {
    personal: {},
    contact: {},
    address: {}
};

// Add CSS fix for dropdown visibility
const style = document.createElement('style');
style.textContent = `
    #profile-edit-modal select {
        appearance: auto !important;
        -webkit-appearance: menulist !important;
        -moz-appearance: menulist !important;
        background-color: white !important;
        z-index: 50 !important;
    }
    #profile-edit-modal option {
        background-color: white !important;
        color: #374151 !important;
        padding: 0.5rem !important;
        position: relative !important;
        z-index: 100 !important;
    }
`;
document.head.appendChild(style);

// Only set transitions if elements exist
if (profileModal) profileModal.style.transition = 'opacity 0.3s ease';
if (modalFormContainer) modalFormContainer.style.transition = 'opacity 0.2s ease';

document.addEventListener('DOMContentLoaded', async () => {
    await loadAddressData();
    await loadProfileData();
    initTabs();

    // Safely add event listeners to edit buttons
    if (editButtons.length > 0) {
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                if (!button.disabled) {
                    const section = button.getAttribute('data-target');
                    if (section) {
                        openModal(section);
                    }
                }
            });
        });
    }

    // Safely add event listener to close modal
    if (profileModal) {
        profileModal.addEventListener('click', closeModal);
    }

    // Add save button handler
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            // Collect all data first
            collectFormData();
            
            // Validate all sections
            const isPersonalValid = validateFormData({
                last_name: formData.personal.lastName,
                first_name: formData.personal.firstName,
                birthdate: formData.personal.birthdate
            }, 'personal');
            
            const isContactValid = validateFormData({
                phone: formData.contact.phone,
                email: formData.contact.email
            }, 'contact');
            
            const isAddressValid = validateFormData({
                region: formData.address.region,
                province: formData.address.province,
                municipality: formData.address.municipality,
                barangay: formData.address.barangay
            }, 'address');
            
            if (!isPersonalValid || !isContactValid || !isAddressValid) {
                showAlert('Please complete all required fields in all tabs', 'error');
                return;
            }
            
            try {
                const userId = await getUserId();
                if (!userId) throw new Error('User not authenticated');
                
                const { error } = await supabase
                    .from('user_profiles')
                    .upsert({
                        user_id: userId,
                        last_name: formData.personal.lastName,
                        first_name: formData.personal.firstName,
                        middle_name: formData.personal.middleName,
                        birthdate: formData.personal.birthdate,
                        phone_number: formData.contact.phone,
                        email: formData.contact.email,
                        region: formData.address.region,
                        province: formData.address.province,
                        municipality: formData.address.municipality,
                        barangay: formData.address.barangay,
                        last_profile_edit: new Date().toISOString()
                    });
                
                if (error) throw error;
                
                showAlert('Profile updated successfully!');
                closeModal({ target: profileModal });
                await loadProfileData();
            } catch (error) {
                console.error('Error saving profile:', error);
                showAlert('Failed to save profile. Please try again.', 'error');
            }
        });
    }
});

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

            // Initialize formData with existing values
            formData.personal = {
                lastName: data.last_name || '',
                firstName: data.first_name || '',
                middleName: data.middle_name || '',
                birthdate: data.birthdate || ''
            };
            formData.contact = {
                phone: data.phone_number || '',
                email: data.email || ''
            };
            formData.address = {
                region: data.region || '',
                province: data.province || '',
                municipality: data.municipality || '',
                barangay: data.barangay || ''
            };

            if (data.last_profile_edit) {
                const lastProfileEdit = new Date(data.last_profile_edit).getTime();
                checkEditLock(lastProfileEdit);
            }
        } else {
            console.log('No profile data found');
            enableEditButtons();
        }
    } catch (error) {
        console.error('Error loading profile data:', error);
        enableEditButtons();
    }
}

function checkEditLock(lastProfileEdit) {
    const currentTime = new Date().getTime();
    if (lastProfileEdit && (currentTime - lastProfileEdit < LOCK_DURATION)) {
        lockEditButtons();
    } else {
        enableEditButtons();
    }
}

function lockEditButtons() {
    editButtons.forEach(btn => {
        btn.disabled = true;
        btn.innerHTML = `<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
        </svg>`;
        btn.title = 'Editing locked for 60 days after last save';
    });
}

function enableEditButtons() {
    editButtons.forEach(btn => {
        btn.disabled = false;
        btn.innerHTML = `<svg class="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
        </svg>`;
        btn.title = 'Edit information';
    });
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
    
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    
    for (const key in data) {
        if (!data[key]?.trim()) {
            const fieldId = `edit-${key.replace('_', '-')}`;
            const field = document.getElementById(fieldId);
            if (field) {
                field.classList.add('border-red-500', 'bg-red-50');
                const error = document.createElement('p');
                error.className = 'error-message text-red-500 text-sm mt-1';
                error.textContent = 'This field is required';
                field.after(error);
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

function initTabs() {
    if (personalTab && contactTab && addressTab) {
        personalTab.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(personalTab, 'personal');
        });

        contactTab.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(contactTab, 'contact');
        });

        addressTab.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(addressTab, 'address');
        });
    }
}

function switchTab(activeTab, section) {
    // Collect data from current form before switching
    collectFormData();
    
    // Remove active classes from all tabs
    [personalTab, contactTab, addressTab].forEach(tab => {
        tab.classList.remove('active', 'border-blue-500', 'text-blue-500');
        tab.classList.add('text-gray-700');
    });

    // Add active classes to clicked tab
    activeTab.classList.add('active', 'border-blue-500', 'text-blue-500');
    activeTab.classList.remove('text-gray-700');

    // Load the corresponding form content
    loadFormContent(section);
}

function openModal(section) {
    if (!profileModal || !modalFormContainer) return;
    
    profileModal.style.opacity = '0';
    profileModal.classList.remove('hidden');
    
    setTimeout(() => {
        profileModal.style.opacity = '1';
        
        // Initialize the correct tab based on which edit button was clicked
        let activeTab;
        switch(section) {
            case 'personal':
                activeTab = personalTab;
                break;
            case 'contact':
                activeTab = contactTab;
                break;
            case 'address':
                activeTab = addressTab;
                break;
        }
        
        if (activeTab) {
            switchTab(activeTab, section);
        }
    }, 10);
}

function closeModal(e) {
    if (e.target === profileModal || e.target.id === 'close-modal' || e.target.closest('#close-modal')) {
        profileModal.style.opacity = '0';
        setTimeout(() => profileModal.classList.add('hidden'), 300);
    }
}

function collectFormData() {
    // Personal data
    formData.personal = {
        lastName: document.getElementById('edit-last-name')?.value || '',
        firstName: document.getElementById('edit-first-name')?.value || '',
        middleName: document.getElementById('edit-middle-name')?.value || '',
        birthdate: document.getElementById('edit-birthdate')?.value || ''
    };

    // Contact data
    formData.contact = {
        phone: document.getElementById('edit-phone')?.value || '',
        email: document.getElementById('edit-email')?.value || ''
    };

    // Address data
    formData.address = {
        region: document.getElementById('edit-region')?.value || '',
        province: document.getElementById('edit-province')?.value || '',
        municipality: document.getElementById('edit-municipality')?.value || '',
        barangay: document.getElementById('edit-barangay')?.value || ''
    };
}

function loadFormContent(section) {
    let formHTML = '';
    switch (section) {
        case 'personal':
            formHTML = `
                <div class="space-y-4">
                    <div>
                        <label for="edit-last-name" class="block text-sm font-medium text-gray-700">Last Name</label>
                        <input type="text" id="edit-last-name" value="${formData.personal.lastName || ''}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="edit-first-name" class="block text-sm font-medium text-gray-700">First Name</label>
                        <input type="text" id="edit-first-name" value="${formData.personal.firstName || ''}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="edit-middle-name" class="block text-sm font-medium text-gray-700">Middle Name</label>
                        <input type="text" id="edit-middle-name" value="${formData.personal.middleName || ''}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="edit-birthdate" class="block text-sm font-medium text-gray-700">Birthdate</label>
                        <input type="date" id="edit-birthdate" value="${formData.personal.birthdate || ''}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>
            `;
            break;
        case 'contact':
            formHTML = `
                <div class="space-y-4">
                    <div>
                        <label for="edit-phone" class="block text-sm font-medium text-gray-700">Phone Number</label>
                        <input type="tel" id="edit-phone" value="${formData.contact.phone || ''}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="edit-email" class="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" id="edit-email" value="${formData.contact.email || ''}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>
            `;
            break;
        case 'address':
            formHTML = `
                <div class="space-y-4">
                    <div>
                        <label for="edit-region" class="block text-sm font-medium text-gray-700">Region</label>
                        <select id="edit-region" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Select Region</option>
                        </select>
                    </div>
                    <div>
                        <label for="edit-province" class="block text-sm font-medium text-gray-700">Province</label>
                        <select id="edit-province" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" disabled>
                            <option value="">Select Province</option>
                        </select>
                    </div>
                    <div>
                        <label for="edit-municipality" class="block text-sm font-medium text-gray-700">City/Municipality</label>
                        <select id="edit-municipality" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" disabled>
                            <option value="">Select Municipality</option>
                        </select>
                    </div>
                    <div>
                        <label for="edit-barangay" class="block text-sm font-medium text-gray-700">Barangay</label>
                        <select id="edit-barangay" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" disabled>
                            <option value="">Select Barangay</option>
                        </select>
                    </div>
                </div>
            `;
            break;
    }
    modalFormContainer.innerHTML = formHTML;

    if (section === 'address') {
        loadAddressDropdowns();
        // Restore address selections if they exist
        if (formData.address.region) {
            setTimeout(() => {
                const regionSelect = document.getElementById('edit-region');
                if (regionSelect) regionSelect.value = formData.address.region;
                regionSelect.dispatchEvent(new Event('change'));
                
                // These will be set after the change events propagate
                setTimeout(() => {
                    if (formData.address.province) {
                        const provinceSelect = document.getElementById('edit-province');
                        if (provinceSelect) provinceSelect.value = formData.address.province;
                        provinceSelect.dispatchEvent(new Event('change'));
                    }
                    
                    setTimeout(() => {
                        if (formData.address.municipality) {
                            const municipalitySelect = document.getElementById('edit-municipality');
                            if (municipalitySelect) municipalitySelect.value = formData.address.municipality;
                            municipalitySelect.dispatchEvent(new Event('change'));
                        }
                        
                        setTimeout(() => {
                            if (formData.address.barangay) {
                                const barangaySelect = document.getElementById('edit-barangay');
                                if (barangaySelect) barangaySelect.value = formData.address.barangay;
                            }
                        }, 100);
                    }, 100);
                }, 100);
            }, 100);
        }
    }
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

    // Reset all dropdowns
    [regionSelect, provinceSelect, municipalitySelect, barangaySelect].forEach(select => {
        // Clear existing options except the first one
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Apply consistent styling
        select.className = 'mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white';
        select.style.zIndex = 'auto';
        select.disabled = select.id !== 'edit-region';
    });

    // Populate regions
    Object.keys(phAddresses).forEach(regionCode => {
        const region = phAddresses[regionCode];
        const option = new Option(region.region_name, regionCode);
        regionSelect.add(option);
    });

    // Region change handler
    regionSelect.addEventListener('change', function() {
        provinceSelect.disabled = !this.value;
        municipalitySelect.disabled = true;
        barangaySelect.disabled = true;
        
        // Clear dependent dropdowns
        provinceSelect.innerHTML = '<option value="">Select Province</option>';
        municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';

        if (!this.value) return;

        // Populate provinces
        const region = phAddresses[this.value];
        Object.keys(region.province_list).forEach(provinceCode => {
            const province = region.province_list[provinceCode];
            provinceSelect.add(new Option(province.province_name, provinceCode));
        });
    });

    // Province change handler
    provinceSelect.addEventListener('change', function() {
        municipalitySelect.disabled = !this.value;
        barangaySelect.disabled = true;
        
        // Clear dependent dropdowns
        municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';

        if (!this.value) return;

        // Populate municipalities
        const province = phAddresses[regionSelect.value].province_list[this.value];
        Object.keys(province.municipality_list).forEach(municipalityCode => {
            const municipality = province.municipality_list[municipalityCode];
            municipalitySelect.add(new Option(municipality.municipality_name, municipalityCode));
        });
    });

    // Municipality change handler
    municipalitySelect.addEventListener('change', function() {
        barangaySelect.disabled = !this.value;
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';

        if (!this.value) return;

        // Populate barangays
        const municipality = phAddresses[regionSelect.value]
            .province_list[provinceSelect.value]
            .municipality_list[this.value];
            
        municipality.barangay_list.forEach(barangay => {
            barangaySelect.add(new Option(barangay, barangay));
        });
    });
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

function showAlert(message, type = 'success') {
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