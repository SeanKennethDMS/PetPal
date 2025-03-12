'use strict';

import supabase from "../supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {

    async function getUser() {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
            console.error("Error fetching user:", error);
            return null;
        }
        return data?.user?.id;
    }

    const petModal = document.getElementById('add-pet-modal');
    const addPetBtn = document.getElementById('add-pet-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const petForm = document.getElementById('add-pet-form');
    const petTableBody = document.getElementById('pet-table-body');
    const speciesSelect = document.getElementById('species');
    const breedSelect = document.getElementById('breed');

    // Show modal
    addPetBtn?.addEventListener('click', () => {
        petModal?.classList.remove('hidden');
    });

    // Close modal & clear form
    closeModalBtn?.addEventListener('click', () => {
        petModal?.classList.add('hidden');
        petForm?.reset();
    });

    // Breed options based on species
    const breedOptions = {
        dog: ["Aspin", "Labrador Retriever", "German Shepherd", "Golden Retriever", "Bulldog", "Beagle", "Poodle", "Shih Tzu", "Siberian Husky", "Dachshund", "Pomeranian", "Labradoodle (Labrador + Poodle)", "Shorkie (Shih Tzu + Yorkie)", "Others"],
        cat: ["Puspin", "Persian", "Siamese", "Maine Coon", "Bengal", "Ragdoll", "Scottish Fold", "Sphynx", "British Shorthair", "Himalayan", "Norwegian Forest", "Bambino (Sphynx + Munchkin)", "Tonkinese (Siamese + Burmese)", "Others"],
        // bird: ["Parrot", "Canary", "Cockatiel", "Macaw", "Lovebird", "Finch", "Others"],
        // rabbit: ["Holland Lop", "Flemish Giant", "Mini Rex", "Angora", "Netherland Dwarf", "Others"]
    };

    // Update breeds when species is selected
    speciesSelect?.addEventListener('change', () => {
        breedSelect.innerHTML = '<option value="">Select Breed</option>';
        const selectedSpecies = speciesSelect.value;
        if (breedOptions[selectedSpecies]) {
            breedOptions[selectedSpecies].forEach(breed => {
                const option = document.createElement('option');
                option.value = breed;
                option.textContent = breed;
                breedSelect.appendChild(option);
            });
        }
    });

    // Add pet to Supabase & update UI
    petForm?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const petName = document.getElementById("pet-name").value.trim();
        const species = document.getElementById("species").value;
        const breed = document.getElementById("breed").value;
        const weight = parseFloat(document.getElementById("weight").value);
        const birthdate = document.getElementById("pets_birthdate").value;

        const userId = await getUser();
        if (!userId) {
            alert("User not logged in.");
            return;
        }

        const petData = {
            owner_id: userId, // Added user_id for linking pets to users
            pet_name: petName,
            species: species,
            breed: breed,
            weight: weight,
            pets_birthdate: birthdate
        };

        // Insert pet into Supabase
        const { data, error } = await supabase.from('pets').insert([petData]);

        if (error) {
            console.error("Error adding pet:", error);
            alert(`Failed to add pet: ${error.message}`);
            return;
        }

        console.log("Inserted pet data:", data);
        alert("Pet added successfully!");

        // Refresh table with updated pets from database
        await loadPets();

        // Close modal & clear form
        petModal?.classList.add('hidden');
        petForm?.reset();
    });

    async function loadPets() {
        const userId = await getUser();
        if (!userId) {
            console.error("No user logged in.");
            return;
        }

        const { data, error } = await supabase
            .from('pets')
            .select('*')
            .eq('owner_id', userId);

        if (error) {
            console.error("Error fetching pets:", error);
            return;
        }

        // Clear existing table rows
        petTableBody.innerHTML = "";

        if (!data.length) {
            petTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">No pets available. Add a pet to get started.</td>
                </tr>`;
        } else {
            data.forEach((pet) => {
                const newRow = `
                    <tr>
                        <td class="border px-4 py-2">${pet.pet_name}</td>
                        <td class="border px-4 py-2">${pet.species}</td>
                        <td class="border px-4 py-2">${pet.breed}</td>
                        <td class="border px-4 py-2">${pet.weight}</td>
                        <td class="border px-4 py-2">${pet.pets_birthdate}</td>
                        <td class="border px-4 py-2">No Appointment</td>
                    </tr>`;
                petTableBody.innerHTML += newRow;
            });
        }
    }

    // Load pets when the page loads
    await loadPets();
});