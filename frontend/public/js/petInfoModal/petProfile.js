"use strict";

import supabase from "../supabaseClient.js";

//DOM Elements
const petTableBody = document.getElementById("pet-table-body");
const addPetForm = document.getElementById("add-pet-form");
const addPetBtn = document.getElementById("add-pet-btn");

// Load Pets Function (Main)
async function loadPets() {
  try {
    const userId = await getUser();
    if (!userId) {
      console.error("No user logged in.");
      return;
    }

    const { data: pets, error } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', userId)
      .order('pet_name', { ascending: true });

    if (error) {
      console.error("Error fetching pets:", error);
      return;
    }

    renderPetsTable(pets);

  } catch (error) {
    console.error("Unexpected error loading pets:", error);
  }
}

// Render Pets Table Function
async function renderPetsTable(pets) {
  // Clear existing table content
  petTableBody.innerHTML = "";

  if (!pets.length) {
    petTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4">No pets available. Add a pet to get started.</td>
      </tr>`;
    return;
  }

  let rowsHTML = "";

  for (const pet of pets) {
    const appointmentStatus = await getAppointmentStatus(pet.pet_id || pet.id);

    rowsHTML += `
      <tr data-pet-id="${pet.pet_id || pet.id}" class="hover:bg-gray-50 transition-all duration-300">
        <td class="border px-4 py-2">${pet.pet_name}</td>
        <td class="border px-4 py-2">${pet.species}</td>
        <td class="border px-4 py-2">${pet.breed}</td>
        <td class="border px-4 py-2">${pet.weight}</td>
        <td class="border px-4 py-2">${pet.pets_birthdate}</td>
        <td class="border px-4 py-2">${appointmentStatus}</td>
      </tr>`;
  }

  petTableBody.innerHTML = rowsHTML;
}

// Get Appointment Status Function (Dummy Placeholder)
async function getAppointmentStatus(petId) {
  // Placeholder logic (replace with your real logic!)
  return "No Appointments"; // or "Upcoming Appointment"
}

//Add Pet Form Submit Handler
if (addPetForm) {
  addPetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userId = await getUser();
    if (!userId) {
      alert("No user found!");
      return;
    }

    const petName = document.getElementById("pet-name").value.trim();
    const species = document.getElementById("species").value.trim();
    const breed = document.getElementById("breed").value.trim();
    const weight = document.getElementById("weight").value.trim();
    const birthDate = document.getElementById("birthdate").value;

    if (!petName || !species || !breed || !weight || !birthDate) {
      alert("Please fill out all fields.");
      return;
    }

    const { error } = await supabase
      .from("pets")
      .insert([{
        pet_name: petName,
        species: species,
        breed: breed,
        weight: weight,
        pets_birthdate: birthDate,
        owner_id: userId,
      }]);

    if (error) {
      console.error("Error adding pet:", error);
      alert("Failed to add pet.");
      return;
    }

    alert("Pet added successfully!");
    addPetForm.reset();
    loadPets();
  });
}

// Supabase Real-time Listener for Pets Table
supabase
  .channel("public:pets")
  .on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "pets",
  }, (payload) => {
    console.log("Change received:", payload);
    loadPets(); // Auto-refresh table
  })
  .subscribe();

// Dummy User Function (Replace with Real Logic)
async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    console.error("User not found", error);
    return null;
  }
  return data.user.id;
}

// Initial Load
document.addEventListener("DOMContentLoaded", () => {
  loadPets();

  if (addPetBtn) {
    addPetBtn.addEventListener("click", () => {
      document.getElementById("add-pet-modal").classList.remove("hidden");
    });
  }

  // Cancel button to close modal
  const cancelAddPetBtn = document.getElementById("cancel-add-pet");
  if (cancelAddPetBtn) {
    cancelAddPetBtn.addEventListener("click", () => {
      document.getElementById("add-pet-modal").classList.add("hidden");
      addPetForm.reset();
    });
  }
});

