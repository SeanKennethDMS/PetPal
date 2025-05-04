"use strict";

import supabase from "../js/supabaseClient.js";
import { getBasePath } from "./path-config.js";

// Constants
const LOCK_DURATION = 60 * 24 * 60 * 60 * 1000; // 60 days in ms
const ADDRESS_LEVELS = ['region', 'province', 'municipality', 'barangay'];

// DOM Elements
const profileModal = document.getElementById("profile-edit-modal");
const modalFormContainer = document.getElementById("modal-form-container");
const editButtons = document.querySelectorAll(".edit-btn");
const saveButton = document.getElementById("save-changes");
const personalTab = document.getElementById("personal-tab");
const contactTab = document.getElementById("contact-tab");
const addressTab = document.getElementById("address-tab");

// State
let currentTab = "personal";
let formData = {
  personal: {},
  contact: {},
  address: {}
};
let phAddresses = null;

// Initialize the module
document.addEventListener("DOMContentLoaded", async () => {
  if (!profileModal) return;

  try {
    await loadAddressData();
    await loadProfileData();
    initEventListeners();
  } catch (error) {
    console.error("Initialization error:", error);
    showAlert("Failed to initialize profile editor", "error");
  }
});

// Event Listeners
function initEventListeners() {
  // Edit buttons
  editButtons.forEach(button => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      if (!button.disabled) {
        const section = button.getAttribute("data-target");
        if (section) openModal(section);
      }
    });
  });

  // Modal close
  profileModal.addEventListener("click", closeModal);

  // Save button
  saveButton?.addEventListener("click", handleSave);

  // Tab switching
  personalTab?.addEventListener("click", (e) => {
    e.preventDefault();
    switchTab("personal");
  });
  contactTab?.addEventListener("click", (e) => {
    e.preventDefault();
    switchTab("contact");
  });
  addressTab?.addEventListener("click", (e) => {
    e.preventDefault();
    switchTab("address");
  });
}

// Data Loading
async function loadProfileData() {
  const userId = await getUserId();
  if (!userId) return;

  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return;

    // Update UI with profile data
    updateProfileDisplay(data);
    
    // Store form data
    formData = {
      personal: {
        lastName: data.last_name || "",
        firstName: data.first_name || "",
        middleName: data.middle_name || "",
        birthdate: data.birthdate || ""
      },
      contact: {
        phone: data.phone_number || "",
        email: data.email || ""
      },
      address: {
        region: data.region || "",
        province: data.province || "",
        municipality: data.municipality || "",
        barangay: data.barangay || ""
      }
    };

    // Check if editing is locked
    if (data.last_profile_edit) {
      const lastEdit = new Date(data.last_profile_edit).getTime();
      const currentTime = new Date().getTime();
      if (currentTime - lastEdit < LOCK_DURATION) {
        lockEditButtons();
      }
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    throw error;
  }
}

function updateProfileDisplay(data) {
  const fields = {
    "last-name": data.last_name || "—",
    "first-name": data.first_name || "—",
    "middle-name": data.middle_name || "—",
    "birthdate": data.birthdate || "—",
    "phone": data.phone_number || "—",
    "email": data.email || "—",
    "region": data.region || "—",
    "province": data.province || "—",
    "municipality": data.municipality || "—",
    "barangay": data.barangay || "—"
  };

  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });
}

async function loadAddressData() {
  try {
    const basePath = getBasePath();
    const response = await fetch(`${basePath}/js/data/philippines-addresses.json`);
    if (!response.ok) throw new Error("Failed to load address data");
    phAddresses = await response.json();
  } catch (error) {
    console.error("Error loading address data:", error);
    throw error;
  }
}

// Modal Management
function openModal(section) {
  if (!profileModal || !modalFormContainer) return;

  profileModal.style.opacity = "0";
  profileModal.classList.remove("hidden");

  setTimeout(() => {
    profileModal.style.opacity = "1";
    switchTab(section);
  }, 10);
}

function closeModal(e) {
  if (e.target === profileModal || e.target.closest("#close-modal")) {
    profileModal.style.opacity = "0";
    setTimeout(() => profileModal.classList.add("hidden"), 300);
  }
}

// Tab Management
function switchTab(section) {
  // Collect data from current form before switching
  collectFormData();

  // Update tab UI
  [personalTab, contactTab, addressTab].forEach(tab => {
    if (tab) {
      tab.classList.remove("active", "border-blue-500", "text-blue-500");
      tab.classList.add("text-gray-700");
    }
  });

  const activeTab = {
    personal: personalTab,
    contact: contactTab,
    address: addressTab
  }[section];

  if (activeTab) {
    activeTab.classList.add("active", "border-blue-500", "text-blue-500");
    activeTab.classList.remove("text-gray-700");
  }

  currentTab = section;
  loadFormContent(section);
}

// Form Management
function collectFormData() {
  const getValue = id => {
    const element = document.getElementById(id);
    return element?.value || "";
  };

  switch (currentTab) {
    case "personal":
      formData.personal = {
        lastName: getValue("edit-last-name"),
        firstName: getValue("edit-first-name"),
        middleName: getValue("edit-middle-name"),
        birthdate: getValue("edit-birthdate")
      };
      break;

    case "contact":
      formData.contact = {
        phone: getValue("edit-phone"),
        email: getValue("edit-email")
      };
      break;

    case "address":
      formData.address = {
        region: getValue("edit-region"),
        province: getValue("edit-province"),
        municipality: getValue("edit-municipality"),
        barangay: getValue("edit-barangay")
      };
      break;
  }
}

function loadFormContent(section) {
  collectFormData();
  
  const templates = {
    personal: getPersonalFormTemplate(),
    contact: getContactFormTemplate(),
    address: getAddressFormTemplate()
  };

  modalFormContainer.innerHTML = templates[section] || "";

  if (section === "address") {
    initAddressDropdowns();
    restoreAddressSelections();
  }
}

function getPersonalFormTemplate() {
  const { lastName, firstName, middleName, birthdate } = formData.personal;
  return `
    <div class="space-y-4">
      <div>
        <label for="edit-last-name" class="block text-sm font-medium text-gray-700">Last Name</label>
        <input type="text" id="edit-last-name" value="${lastName}" 
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
      </div>
      <div>
        <label for="edit-first-name" class="block text-sm font-medium text-gray-700">First Name</label>
        <input type="text" id="edit-first-name" value="${firstName}" 
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
      </div>
      <div>
        <label for="edit-middle-name" class="block text-sm font-medium text-gray-700">Middle Name</label>
        <input type="text" id="edit-middle-name" value="${middleName}" 
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
      </div>
      <div>
        <label for="edit-birthdate" class="block text-sm font-medium text-gray-700">Birthdate</label>
        <input type="date" id="edit-birthdate" value="${birthdate}" 
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
      </div>
    </div>
  `;
}

function getContactFormTemplate() {
  const { phone, email } = formData.contact;
  return `
    <div class="space-y-4">
      <div>
        <label for="edit-phone" class="block text-sm font-medium text-gray-700">Phone Number</label>
        <input type="tel" id="edit-phone" value="${phone}" 
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
      </div>
      <div>
        <label for="edit-email" class="block text-sm font-medium text-gray-700">Email</label>
        <input type="email" id="edit-email" value="${email}" 
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
      </div>
    </div>
  `;
}

function getAddressFormTemplate() {
  return `
    <div class="space-y-4">
      ${ADDRESS_LEVELS.map(level => `
        <div>
          <label for="edit-${level}" class="block text-sm font-medium text-gray-700">
            ${level.charAt(0).toUpperCase() + level.slice(1).replace('-', '/')}
          </label>
          <select id="edit-${level}" 
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
            ${level !== 'region' ? 'disabled' : ''}>
            <option value="">-- Select ${level.charAt(0).toUpperCase() + level.slice(1)} --</option>
          </select>
        </div>
      `).join('')}
    </div>
  `;
}

// Address Dropdown Management
function initAddressDropdowns() {
  if (!phAddresses) {
    console.error("Address data not loaded");
    return;
  }

  const regionSelect = document.getElementById("edit-region");
  if (!regionSelect) return;

  // Clear and populate region dropdown
  regionSelect.innerHTML = '<option value="">-- Select Region --</option>';
  Object.entries(phAddresses).forEach(([code, region]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = region.region_name;
    regionSelect.appendChild(option);
  });

  // Set up cascading dropdowns
  setupCascadingDropdown('region', 'province');
  setupCascadingDropdown('province', 'municipality');
  setupCascadingDropdown('municipality', 'barangay');
}

function setupCascadingDropdown(parentLevel, childLevel) {
  const parentSelect = document.getElementById(`edit-${parentLevel}`);
  const childSelect = document.getElementById(`edit-${childLevel}`);

  if (!parentSelect || !childSelect) return;

  parentSelect.addEventListener("change", () => {
    const parentValue = parentSelect.value;
    childSelect.innerHTML = `<option value="">-- Select ${childLevel.charAt(0).toUpperCase() + childLevel.slice(1)} --</option>`;
    childSelect.disabled = !parentValue;

    if (!parentValue) return;

    // Get the child data based on parent selection
    let childData = [];
    if (parentLevel === 'region') {
      const regionData = phAddresses[parentValue];
      if (regionData && regionData.province_list) {
        childData = Object.entries(regionData.province_list);
      }
    } else if (parentLevel === 'province') {
      const region = document.getElementById("edit-region").value;
      const provinceData = phAddresses[region]?.province_list?.[parentValue];
      if (provinceData && provinceData.municipality_list) {
        childData = Object.entries(provinceData.municipality_list);
      }
    } else if (parentLevel === 'municipality') {
      const region = document.getElementById("edit-region").value;
      const province = document.getElementById("edit-province").value;
      const municipalityData = phAddresses[region]?.province_list?.[province]?.municipality_list?.[parentValue];
      if (municipalityData && municipalityData.barangay_list) {
        childData = municipalityData.barangay_list.map(barangay => [barangay, barangay]);
      }
    }

    // Populate child dropdown
    childData.forEach(([code, data]) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = typeof data === 'object' ? data[`${childLevel}_name`] || code : data;
      childSelect.appendChild(option);
    });

    // Enable child dropdown if there are options
    childSelect.disabled = childSelect.options.length <= 1;
  });
}

async function restoreAddressSelections() {
  if (!formData.address) return;

  const { region, province, municipality, barangay } = formData.address;
  if (!region) return;

  const regionSelect = document.getElementById("edit-region");
  if (!regionSelect) return;

  // Set region and trigger change
  regionSelect.value = region;
  regionSelect.dispatchEvent(new Event("change"));

  // Wait for dropdowns to populate
  await wait(200);

  if (province) {
    const provinceSelect = document.getElementById("edit-province");
    if (provinceSelect) {
      provinceSelect.value = province;
      provinceSelect.dispatchEvent(new Event("change"));
      await wait(200);
    }
  }

  if (municipality) {
    const municipalitySelect = document.getElementById("edit-municipality");
    if (municipalitySelect) {
      municipalitySelect.value = municipality;
      municipalitySelect.dispatchEvent(new Event("change"));
      await wait(200);
    }
  }

  if (barangay) {
    const barangaySelect = document.getElementById("edit-barangay");
    if (barangaySelect) barangaySelect.value = barangay;
  }
}

// Save Handler
async function handleSave() {
  collectFormData();

  // Validation
  if (!validateForm()) return;

  try {
    const userId = await getUserId();
    if (!userId) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("user_profiles")
      .update({
        first_name: formData.personal.firstName,
        last_name: formData.personal.lastName,
        middle_name: formData.personal.middleName,
        birthdate: formData.personal.birthdate,
        phone_number: formData.contact.phone,
        email: formData.contact.email,
        region: formData.address.region,
        province: formData.address.province,
        municipality: formData.address.municipality,
        barangay: formData.address.barangay,
        last_profile_edit: new Date().toISOString()
      })
      .eq("user_id", userId);

    if (error) throw error;

    showAlert("Profile updated successfully!");
    closeModal({ target: profileModal });
    await loadProfileData();
  } catch (error) {
    console.error("Error saving profile:", error);
    showAlert("Failed to save profile. Please try again.", "error");
  }
}

function validateForm() {
  let isValid = true;

  // Clear previous errors
  document.querySelectorAll(".error-message").forEach(el => el.remove());

  // Personal info validation
  if (!formData.personal.firstName?.trim() || !formData.personal.lastName?.trim()) {
    showAlert("First name and last name are required", "error");
    isValid = false;
  }

  // Contact info validation
  if (!formData.contact.email?.trim()) {
    showAlert("Email is required", "error");
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact.email)) {
    showAlert("Please enter a valid email address", "error");
    isValid = false;
  }

  return isValid;
}

// Utility Functions
async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

function lockEditButtons() {
  editButtons.forEach(btn => {
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
      </svg>`;
    btn.title = "Editing locked for 60 days after last save";
  });
}

function showAlert(message, type = "success") {
  const alert = document.createElement("div");
  alert.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
    type === "error" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
  }`;
  alert.textContent = message;
  document.body.appendChild(alert);

  setTimeout(() => {
    alert.style.opacity = "0";
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}