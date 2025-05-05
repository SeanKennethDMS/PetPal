"use strict";

import supabase from "../js/supabaseClient.js";
import { getBasePath } from "./path-config.js";

const LOCK_DURATION = 60 * 24 * 60 * 60 * 1000; 
const ADDRESS_LEVELS = ['region', 'province', 'municipality', 'barangay'];

const editProfileModal = document.getElementById("editProfileModal");
const editProfileForm = document.getElementById("editProfileForm");
const editButtons = document.querySelectorAll(".edit-btn");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

let formData = {
  last_name: "",
  first_name: "",
  middle_name: "",
  birthdate: "",
  phone: "",
  email: "",
  region: "",
  province: "",
  municipality: "",
  barangay: ""
};
let phAddresses = null;

document.addEventListener("DOMContentLoaded", async () => {
  if (!editProfileModal) return;

  try {
    await loadAddressData();
    await loadProfileData();
    initEventListeners();
  } catch (error) {
    console.error("Initialization error:", error);
    showAlert("Failed to initialize profile editor", "error");
  }
});

function initEventListeners() {
  editButtons.forEach(button => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      if (!button.disabled) {
        openModal();
      }
    });
  });

  closeModalBtn?.addEventListener("click", closeModal);
  cancelEditBtn?.addEventListener("click", closeModal);
  editProfileModal?.addEventListener("click", (e) => {
    if (e.target === editProfileModal) closeModal();
  });

  editProfileForm?.addEventListener("submit", handleSave);

  document.getElementById("input-region")?.addEventListener("change", updateProvinceDropdown);
  document.getElementById("input-province")?.addEventListener("change", updateMunicipalityDropdown);
  document.getElementById("input-municipality")?.addEventListener("change", updateBarangayDropdown);
}

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
    
    if (!data) {
      await createEmptyProfile(userId);
      return;
    }

    updateProfileDisplay(data);
    
    formData = {
      last_name: data.last_name || "",
      first_name: data.first_name || "",
      middle_name: data.middle_name || "",
      birthdate: data.birthdate || "",
      phone: data.phone_number || "",
      email: data.email || "",
      region: data.region || "",
      province: data.province || "",
      municipality: data.municipality || "",
      barangay: data.barangay || ""
    };

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

async function createEmptyProfile(userId) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return;

  const { error } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: userId,
      email: userData.user.email,
      first_name: "",
      last_name: "",
      middle_name: "",
      phone_number: "",
      region: "",
      province: "",
      municipality: "",
      barangay: ""
    }, {
      onConflict: ['user_id']
    });

  if (error) {
    console.error("Error creating empty profile:", error);
    throw error;
  }

  await loadProfileData();
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

function updateProfileDisplay(data) {
  const fields = {
    "last-name": data.last_name || "—",
    "first-name": data.first_name || "—",
    "middle-name": data.middle_name || "—",
    "birthdate": data.birthdate ? formatDate(data.birthdate) : "—",
    "view-phone": data.phone_number || "—",
    "view-email": data.email || "—",
    "region": data.region || "Not set",
    "province": data.province || "Not set",
    "municipality": data.municipality || "Not set",
    "barangay": data.barangay || "Not set"
  };

  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function openModal() {
  if (!editProfileModal) return;

  document.getElementById("input-last-name").value = formData.last_name;
  document.getElementById("input-first-name").value = formData.first_name;
  document.getElementById("input-middle-name").value = formData.middle_name;
  document.getElementById("input-birthdate").value = formData.birthdate;
  document.getElementById("input-phone").value = formData.phone;
  document.getElementById("input-email").value = formData.email;

  initAddressDropdowns();
  restoreAddressSelections();

  editProfileModal.style.opacity = "0";
  editProfileModal.classList.remove("hidden");

  setTimeout(() => {
    editProfileModal.style.opacity = "1";
  }, 10);
}

function closeModal() {
  editProfileModal.style.opacity = "0";
  setTimeout(() => editProfileModal.classList.add("hidden"), 300);
}

function initAddressDropdowns() {
  if (!phAddresses) return;

  const regionSelect = document.getElementById("input-region");
  if (!regionSelect) return;

  regionSelect.innerHTML = '<option value="">-- Select Region --</option>';
  Object.entries(phAddresses).forEach(([code, region]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = region.region_name;
    regionSelect.appendChild(option);
  });

  const provinceSelect = document.getElementById("input-province");
  provinceSelect.innerHTML = '<option value="">-- Select Province --</option>';
  provinceSelect.disabled = true;

  const municipalitySelect = document.getElementById("input-municipality");
  municipalitySelect.innerHTML = '<option value="">-- Select Municipality --</option>';
  municipalitySelect.disabled = true;

  const barangaySelect = document.getElementById("input-barangay");
  barangaySelect.innerHTML = '<option value="">-- Select Barangay --</option>';
  barangaySelect.disabled = true;
}

function updateProvinceDropdown() {
  const regionCode = this.value;
  const provinceSelect = document.getElementById("input-province");
  const municipalitySelect = document.getElementById("input-municipality");
  const barangaySelect = document.getElementById("input-barangay");

  provinceSelect.innerHTML = '<option value="">-- Select Province --</option>';
  provinceSelect.disabled = !regionCode;
  municipalitySelect.innerHTML = '<option value="">-- Select Municipality --</option>';
  municipalitySelect.disabled = true;
  barangaySelect.innerHTML = '<option value="">-- Select Barangay --</option>';
  barangaySelect.disabled = true;

  if (!regionCode) return;

  const regionData = phAddresses[regionCode];
  if (regionData?.province_list) {
    Object.entries(regionData.province_list).forEach(([provinceName, provinceData]) => {
      const option = document.createElement("option");
      option.value = provinceName;
      option.textContent = provinceName; 
      provinceSelect.appendChild(option);
    });
  }
}


function updateMunicipalityDropdown() {
  const regionCode = document.getElementById("input-region").value;
  const provinceCode = this.value;
  const municipalitySelect = document.getElementById("input-municipality");
  const barangaySelect = document.getElementById("input-barangay");

  municipalitySelect.innerHTML = '<option value="">-- Select Municipality --</option>';
  municipalitySelect.disabled = !provinceCode;
  barangaySelect.innerHTML = '<option value="">-- Select Barangay --</option>';
  barangaySelect.disabled = true;

  if (!regionCode || !provinceCode) return;

  const provinceData = phAddresses[regionCode]?.province_list?.[provinceCode];
  if (provinceData?.municipality_list) {
    Object.entries(provinceData.municipality_list).forEach(([municipalityName, municipalityData]) => {
      const option = document.createElement("option");
      option.value = municipalityName;
      option.textContent = municipalityName; 
      municipalitySelect.appendChild(option);
    });
  }
}

function updateBarangayDropdown() {
  const regionCode = document.getElementById("input-region").value;
  const provinceCode = document.getElementById("input-province").value;
  const municipalityCode = this.value;
  const barangaySelect = document.getElementById("input-barangay");

  barangaySelect.innerHTML = '<option value="">-- Select Barangay --</option>';
  barangaySelect.disabled = !municipalityCode;

  if (!regionCode || !provinceCode || !municipalityCode) return;

  const municipalityData = phAddresses[regionCode]?.province_list?.[provinceCode]?.municipality_list?.[municipalityCode];
  if (municipalityData?.barangay_list) {
    municipalityData.barangay_list.forEach(barangay => {
      const option = document.createElement("option");
      option.value = barangay;
      option.textContent = barangay;
      barangaySelect.appendChild(option);
    });
  }
}

function restoreAddressSelections() {
  if (!formData.region) return;

  const regionSelect = document.getElementById("input-region");
  regionSelect.value = formData.region;
  regionSelect.dispatchEvent(new Event("change"));

  setTimeout(() => {
    if (formData.province) {
      const provinceSelect = document.getElementById("input-province");
      provinceSelect.value = formData.province;
      provinceSelect.dispatchEvent(new Event("change"));

      setTimeout(() => {
        if (formData.municipality) {
          const municipalitySelect = document.getElementById("input-municipality");
          municipalitySelect.value = formData.municipality;
          municipalitySelect.dispatchEvent(new Event("change"));

          setTimeout(() => {
            if (formData.barangay) {
              const barangaySelect = document.getElementById("input-barangay");
              barangaySelect.value = formData.barangay;
            }
          }, 100);
        }
      }, 100);
    }
  }, 100);
}

async function handleSave(e) {
  e.preventDefault();
  
  formData = {
    last_name: document.getElementById("input-last-name").value,
    first_name: document.getElementById("input-first-name").value,
    middle_name: document.getElementById("input-middle-name").value,
    birthdate: document.getElementById("input-birthdate").value,
    phone: document.getElementById("input-phone").value,
    email: document.getElementById("input-email").value,
    region: document.getElementById("input-region").value,
    province: document.getElementById("input-province").value,
    municipality: document.getElementById("input-municipality").value,
    barangay: document.getElementById("input-barangay").value
  };

  if (!validateForm()) return;

  try {
    const userId = await getUserId();
    if (!userId) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("user_profiles")
      .upsert({
        user_id: userId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name,
        birthdate: formData.birthdate,
        phone_number: formData.phone,
        email: formData.email,
        region: formData.region,
        province: formData.province,
        municipality: formData.municipality,
        barangay: formData.barangay,
        last_profile_edit: new Date().toISOString()
      }, {
        onConflict: ['user_id']
      });

    if (error) throw error;

    showAlert("Profile updated successfully!");
    closeModal();
    await loadProfileData();
  } catch (error) {
    console.error("Error saving profile:", error);
    showAlert("Failed to save profile. Please try again.", "error");
  }
}

function validateForm() {
  let isValid = true;

  document.querySelectorAll(".error-message").forEach(el => el.remove());

  if (!formData.first_name?.trim() || !formData.last_name?.trim()) {
    showAlert("First name and last name are required", "error");
    isValid = false;
  }

  if (!formData.email?.trim()) {
    showAlert("Email is required", "error");
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    showAlert("Please enter a valid email address", "error");
    isValid = false;
  }

  return isValid;
}

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