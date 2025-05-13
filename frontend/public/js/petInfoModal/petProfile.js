"use strict";

import supabase from "../supabaseClient.js";
import { getBasePath } from "../path-config.js";

const breedData = {
  dog: [
    "Aspin",
    "Labrador Retriever",
    "Shih Tzu",
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
    "Scottish Fold",
    "Others"
  ]
};

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
const editBtn = document.getElementById('edit-pet-modal');

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
    petItem.className = "flex justify-between items-center p-2 rounded hover:bg-blue-50 transition-colors";
    petItem.dataset.petId = pet.pet_id || pet.id;
    
    const petName = document.createElement("span");
    petName.className = "cursor-pointer flex-grow";
    petName.textContent = pet.pet_name;
    petName.addEventListener("click", () => {
      showPetDetails(petItem.dataset.petId);
    });

    const actionButtons = document.createElement("div");
    actionButtons.className = "flex space-x-2 ml-4";

    const editBtn = document.createElement("button");
    editBtn.className = "edit-pet-btn p-1 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-100";
    editBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
    `;
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditPetModal(pet.id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-pet-btn p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100";
    deleteBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
    `;
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm(`Are you sure you want to delete ${pet.pet_name}?`)) {
        await deletePet(pet.id);
      }
    });

    actionButtons.appendChild(editBtn);
    actionButtons.appendChild(deleteBtn);
    
    petItem.appendChild(petName);
    petItem.appendChild(actionButtons);

    if (currentPetId === petItem.dataset.petId) {
      petItem.className += " bg-blue-100 font-medium";
    }

    petList.appendChild(petItem);
  });
}

async function openEditPetModal(petId) {
  try {
    const { data: pet, error } = await supabase
      .from('pets')
      .select('*')
      .eq('id', petId)
      .single();

    if (error) throw error;

    document.getElementById('edit-pet-id').value = pet.id;
    document.getElementById('edit-pet-name').value = pet.pet_name;
    document.getElementById('edit-species').value = pet.species;
    
    document.getElementById('edit-breed').dataset.current = pet.breed;
    updateEditBreedOptions();
    
    document.getElementById('edit-weight').value = pet.weight;
    document.getElementById('edit-birthdate').value = pet.pets_birthdate;
    
    document.getElementById('edit-pet-modal').classList.remove('hidden');
  } catch (error) {
    console.error('Error loading pet for edit:', error);
    alert('Failed to load pet details for editing');
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
      const today = new Date();
      
      let age = today.getFullYear() - birthDate.getFullYear();
      
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age <= 0) {
        let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
        months += today.getMonth() - birthDate.getMonth();
        
        if (today.getDate() < birthDate.getDate()) {
          months--;
        }
        
        months = Math.max(0, months);
        
        if (months === 0) {
          const days = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));
          petDisplayAge.textContent = `${days} day${days !== 1 ? 's' : ''}`;
        } else {
          petDisplayAge.textContent = `${months} month${months !== 1 ? 's' : ''}`;
        }
      } else {
        petDisplayAge.textContent = `${age} year${age !== 1 ? 's' : ''}`;
      }
    } else {
      petDisplayAge.textContent = "Unknown";
    }

    if (pet.image_url) {
      petDisplayImage.src = pet.image_url;
    } else {
      const basePath = getBasePath();
      petDisplayImage.src = `${basePath}/assets/images/${
        pet.species === 'dog' ? 'defaultDogIcon.png' : 'defaultCatIcon.png'
      }`;
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

async function deletePet(petId) {
  try {
    // Check both active and completed appointments
    const [{ data: activeAppointments, error: activeError }, { data: completedAppointments, error: completedError }] = await Promise.all([
      supabase
        .from('appointments')
        .select('appointment_id')
        .eq('pet_id', petId),
      supabase
        .from('completed_appointments')
        .select('appointment_id')
        .eq('pet_id', petId)
    ]);

    if (activeError) throw activeError;
    if (completedError) throw completedError;

    const hasAppointments = (activeAppointments && activeAppointments.length > 0) ||
                          (completedAppointments && completedAppointments.length > 0);

    if (hasAppointments) {
      // Show warning modal
      const modal = document.getElementById('warningModal');
      const modalText = document.getElementById('warningModalText');
      const confirmBtn = document.getElementById('confirmWarningBtn');
      const cancelBtn = document.getElementById('cancelWarningBtn');

      modalText.textContent = 'This pet has appointment history. Deleting this pet will also remove all associated appointment records. Are you sure you want to proceed?';
      
      // Show the modal
      modal.style.display = 'block';

      // Handle confirmation
      confirmBtn.onclick = async () => {
        try {
          // Delete appointments from both tables
          await Promise.all([
            supabase
              .from('appointments')
              .delete()
              .eq('pet_id', petId),
            supabase
              .from('completed_appointments')
              .delete()
              .eq('pet_id', petId)
          ]);

          // Then delete the pet
          const { error: deletePetError } = await supabase
            .from('pets')
            .delete()
            .eq('id', petId);

          if (deletePetError) throw deletePetError;

          // Close modal and refresh
          modal.style.display = 'none';
          await loadPets();
          showAlert('Pet deleted successfully', 'success');
        } catch (error) {
          console.error('Error in deletion process:', error);
          showAlert('Error deleting pet and associated records', 'error');
        }
      };

      // Handle cancellation
      cancelBtn.onclick = () => {
        modal.style.display = 'none';
      };

      return;
    }

    // If no appointments, proceed with normal deletion
    const { error: deleteError } = await supabase
      .from('pets')
      .delete()
      .eq('id', petId);

    if (deleteError) throw deleteError;

    await loadPets();
    showAlert('Pet deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting pet:', error);
    showAlert('Error deleting pet', 'error');
  }
}

async function loadPetAppointments(petId) {
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *, services: service_id (name, description)
        `)
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
        <p class="font-medium">${appt.services?.name || 'Unknown Service'}</p>
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
    const petImage = formData.get("pet_image");
    const birthDate = formData.get("pets_birthdate");

    const processedBirthDate = birthDate === "" ? null : birthDate;
    

    if(birthDate && new Date (birthDate) > new Date ()){
      showAlert('Birthdate cannot be in the future', 'error');
      document.getElementById('edit-birthdate');
      return;
    }

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
          pets_birthdate: processedBirthDate,
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

function updateEditBreedOptions() {
  const speciesSelect = document.getElementById("edit-species");
  const breedSelect = document.getElementById("edit-breed");

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
    const currentBreed = document.getElementById('edit-breed').dataset.current;
    if (currentBreed) {
      breedSelect.value = currentBreed;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadPets();

  document.getElementById('edit-species')?.addEventListener('change', updateEditBreedOptions);

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

  // Close edit modal handlers
  document.getElementById('close-edit-pet-modal')?.addEventListener('click', () => {
    document.getElementById('edit-pet-modal').classList.add('hidden');
  });

  document.getElementById('cancel-edit-pet')?.addEventListener('click', () => {
    document.getElementById('edit-pet-modal').classList.add('hidden');
  });

  // Edit form submission
  document.getElementById('edit-pet-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const petId = document.getElementById('edit-pet-id').value;
    
    const petName = formData.get('pet_name')?.trim();
    const species = formData.get('species');
    const breed = formData.get('breed');
    const weight = formData.get('weight');
    const birthDate = formData.get('pets_birthdate');

    const processedBirthDate = birthDate === "" ? null : birthDate;
    
    // Clear previous errors
    document.querySelectorAll('.border-red-500').forEach(el => {
      el.classList.remove('border-red-500');
    });
    
    // Validate inputs
    let isValid = true;
    if (!petName || petName.trim() === "") {
      document.getElementById('edit-pet-name').classList.add('border-red-500');
      isValid = false;
    }
    if (!species || species === "") {
      document.getElementById('edit-species').classList.add('border-red-500');
      isValid = false;
    }
    if (!breed || breed === "") {
      document.getElementById('edit-breed').classList.add('border-red-500');
      isValid = false;
    }
    if (!weight || isNaN(parseFloat(weight))) {
      document.getElementById('edit-weight').classList.add('border-red-500');
      isValid = false;
    }
    if (!birthDate || birthDate === ""){
      document.getElementById('edit-birthdate').classList.add('border-red-500');
      isValid = false;
    }
  
    try {

      if(birthDate && new Date(birthDate) > new Date ()) {
        showAlert('Birthdate cannot be in the future', 'error');
        document.getElementById('edit-birthdate').classList.add('border-red-500');
        return;
      }

      let imageUrl = null;
      const petImage = formData.get('pet_image');
      
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
  
      const updateData = {
        pet_name: petName,
        species: species,
        breed: breed,
        weight: parseFloat(weight),
        pets_birthdate: processedBirthDate
      };
  
      if (imageUrl) {
        updateData.image_url = imageUrl;
      }
  
      const { error } = await supabase
        .from('pets')
        .update(updateData)
        .eq('id', petId);
  
      if (error) throw error;
  
      document.getElementById('edit-pet-modal').classList.add('hidden');
      showAlert('Pet updated successfully');
      await loadPets();
    } catch (error) {
      console.error('Error updating pet:', error);
      if (error.code === '23502') {
        showAlert('Database error: Please fill out all required fields', 'error');
      } else {
        showAlert('Failed to update pet', 'error');
      }
    }
  });
});

