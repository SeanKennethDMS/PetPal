"use strict";

import supabase from "../supabaseClient.js";

const breedData = {
  dog: [
    "Aspin",
    "Labrador Retriever",
    "German Shepherd",
    "Golden Retriever",
    "Bulldog",
    "Beagle",
    "Poodle",
    "Rottweiler",
    "Yorkshire Terrier",
    "Others"
  ],
  cat: [
    "Puspin",
    "Siamese",
    "Persian",
    "Maine Coon",
    "Ragdoll",
    "Bengal",
    "British Shorthair",
    "Sphynx",
    "Scottish Fold"
  ]
};

// DOM Elements
const petList = document.getElementById("pet-list");
const petDisplay = document.getElementById("pet-display");
const petDisplayDefault = document.getElementById("pet-display-default");
const petDisplayImage = document.getElementById("pet-display-image");
const petDisplayName = document.getElementById("pet-display-name");
const petDisplaySpecies = document.getElementById("pet-display-species");
const petDisplayBreed = document.getElementById("pet-display-breed");
const petDisplayWeight = document.getElementById("pet-display-weight");
const petDisplayAge = document.getElementById("pet-display-age");
const petAppointments = document.getElementById("pet-appointments");
const addPetForm = document.getElementById("add-pet-form");
const addPetBtn = document.getElementById("add-pet-btn");

// Current selected pet ID
let currentPetId = null;

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

    renderPetList(pets);
    
    if (pets.length > 0 && !currentPetId) {
      showPetDetails(pets[0].pet_id || pets[0].id);
    } else if (pets.length === 0) {
      petDisplayDefault.classList.remove("hidden");
      petDisplay.classList.add("hidden");
    }

  } catch (error) {
    console.error("Unexpected error loading pets:", error);
  }
}

async function renderPetList(pets) {
  petList.innerHTML = "";

  if (!pets.length) {
    petList.innerHTML = '<li class="text-gray-500 italic">No pets added</li>';
    return;
  }

  pets.forEach(pet => {
    const petItem = document.createElement("li");
    petItem.className = "cursor-pointer p-2 rounded hover:bg-blue-50 transition-colors";
    petItem.textContent = pet.pet_name;
    petItem.dataset.petId = pet.pet_id || pet.id;
    
    // Highlight currently selected pet
    if (currentPetId === petItem.dataset.petId) {
      petItem.className += " bg-blue-100 font-medium";
    }

    petItem.addEventListener("click", () => {
      showPetDetails(petItem.dataset.petId);
    });

    petList.appendChild(petItem);
  });
}

async function showPetDetails(petId) {
  try {
    currentPetId = petId;
    
    const { data: pet, error } = await supabase
      .from('pets')
      .select('*')
      .eq('id', petId)
      .single();

    if (error) throw error;

    petDisplayName.textContent = pet.pet_name;
    petDisplaySpecies.textContent = pet.species;
    petDisplayBreed.textContent = pet.breed;
    petDisplayWeight.textContent = `${pet.weight} kg`;
    
    if (pet.pets_birthdate) {
      const birthDate = new Date(pet.pets_birthdate);
      const ageInYears = new Date().getFullYear() - birthDate.getFullYear();
      petDisplayAge.textContent = `${ageInYears} years`;
    } else {
      petDisplayAge.textContent = "Unknown";
    }

    if (pet.image_url) {
      petDisplayImage.src = pet.image_url;
    } else {
      petDisplayImage.src = pet.species === 'dog' 
        ? '/public/assets/images/defaultDogIcon.png' 
        : '/public/assets/images/defaultCatIcon.png';
    }

    await loadPetAppointments(petId);

    petDisplayDefault.classList.add("hidden");
    petDisplay.classList.remove("hidden");

    document.querySelectorAll("#pet-list li").forEach(item => {
      if (item.dataset.petId === petId) {
        item.classList.add("bg-blue-100", "font-medium");
      } else {
        item.classList.remove("bg-blue-100", "font-medium");
      }
    });

  } catch (error) {
    console.error("Error loading pet details:", error);
  }
}

async function loadPetAppointments(petId) {
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('pet_id', petId)
      .order('appointment_date', { ascending: false });

    if (error) throw error;

    petAppointments.innerHTML = "";

    if (!appointments.length) {
      petAppointments.innerHTML = '<p class="text-gray-500 py-4">No appointment history yet</p>';
      return;
    }

    appointments.forEach(appt => {
      const apptDate = new Date(appt.appointment_date);
      const apptItem = document.createElement("div");
      apptItem.className = "py-2 border-b";
      apptItem.innerHTML = `
        <p class="font-medium">${appt.service_type}</p>
        <p class="text-sm text-gray-500">${apptDate.toLocaleDateString()}</p>
        <p class="text-sm">Status: ${appt.status || 'Completed'}</p>
      `;
      petAppointments.appendChild(apptItem);
    });

  } catch (error) {
    console.error("Error loading appointments:", error);
    petAppointments.innerHTML = '<p class="text-red-500 py-4">Error loading appointments</p>';
  }
}

if (addPetForm) {
  addPetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userId = await getUser();
    if (!userId) {
      alert("No user found!");
      return;
    }

    const formData = new FormData(addPetForm);
    const petName = formData.get("pet_name").trim();
    const species = formData.get("species");
    const breed = formData.get("breed");
    const weight = formData.get("weight");
    const birthDate = formData.get("pets_birthdate");
    const petImage = formData.get("pet_image");

    let isValid = true;
    const fields = [
      { id: "pet-name", value: petName },
      { id: "species", value: species },
      { id: "breed", value: breed },
      { id: "weight", value: weight }
    ];

    document.querySelectorAll(".border-red-500").forEach(el => {
      el.classList.remove("border-red-500");
    });

    fields.forEach(field => {
      const isEmpty = field.id === "breed" 
        ? field.value === ""
        : !field.value.trim();
      
      if (isEmpty) {
        document.getElementById(field.id).classList.add("border-red-500");
        isValid = false;
      }
    });

    if (!isValid) {
      alert("Please fill out all required fields.");
      return;
    }

    try {
      let imageUrl = null;
      if (petImage && petImage.size > 0) {
        const fileExt = petImage.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `pet_images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('pet-images')
          .upload(filePath, petImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('pet-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const { data: newPet, error } = await supabase
        .from("pets")
        .insert([{
          pet_name: petName,
          species: species,
          breed: breed,
          weight: parseFloat(weight),
          pets_birthdate: birthDate,
          owner_id: userId,
          image_url: imageUrl
        }])
        .select()
        .single();

      if (error) throw error;

      alert("Pet added successfully!");
      addPetForm.reset();
      document.getElementById("add-pet-modal").classList.add("hidden");
      
      await loadPets();
      showPetDetails(newPet.pet_id || newPet.id);

    } catch (error) {
      console.error("Error adding pet:", error);
      alert(`Failed to add pet: ${error.message}`);
    }
  });
}

supabase
  .channel("public:pets")
  .on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "pets",
  }, (payload) => {
    console.log("Change received:", payload);
    loadPets(); 
    
    if (payload.new && (payload.new.pet_id === currentPetId || payload.new.id === currentPetId)) {
      showPetDetails(currentPetId);
    }
  })
  .subscribe();

async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    console.error("User not found", error);
    return null;
  }
  return data.user.id;
}

function updateBreedOptions() {
  const speciesSelect = document.getElementById("species");
  const breedSelect = document.getElementById("breed");

  if (!speciesSelect || !breedSelect) return;
  
  const selectedSpecies = speciesSelect.value;

  breedSelect.innerHTML = '<option value="">Select Breed</option>';

  if (selectedSpecies && breedData[selectedSpecies]) {
    breedData[selectedSpecies].forEach(breed => {
      const option = document.createElement("option");
      option.value = breed;
      option.textContent = breed;
      breedSelect.appendChild(option);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadPets();

  const speciesSelect = document.getElementById("species");
  if (speciesSelect) { 
    speciesSelect.addEventListener("change", updateBreedOptions);
  }

  if (addPetBtn) {
    addPetBtn.addEventListener("click", () => {
      const modal = document.getElementById("add-pet-modal");
      modal.classList.remove("hidden");

      document.getElementById("species").selectedIndex = 0;
      updateBreedOptions();
    });
  }

  const cancelAddPetBtn = document.getElementById("cancel-add-pet");
  if (cancelAddPetBtn) {
    cancelAddPetBtn.addEventListener("click", () => {
      document.getElementById("add-pet-modal").classList.add("hidden");
      addPetForm.reset();
    });
  }
});