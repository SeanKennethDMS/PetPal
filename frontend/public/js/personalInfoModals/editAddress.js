import supabase from "../supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
    const editBtn = document.getElementById("edit-address-btn");
    const modal = document.getElementById("edit-address-modal");
    const cancelBtn = document.getElementById("address-cancel-btn");
    const saveBtn = document.getElementById("address-save-btn");

    const barangaySpan = document.getElementById("barangay");
    const municipalitySpan = document.getElementById("municipality");
    const provinceSpan = document.getElementById("province");
    const regionSpan = document.getElementById("region");

    const regionSelect = document.getElementById("edit-region");
    const provinceSelect = document.getElementById("edit-province");
    const municipalitySelect = document.getElementById("edit-city"); // this is now municipality
    const barangaySelect = document.getElementById("edit-barangay");

    let addressData = {}; // Define it here to store fetched data

    // 🔥 Fetch address data JSON from your server or public folder
    async function fetchAddressData() {
        try {
            const response = await fetch('../js/data/philippines-addresses.json');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            addressData = await response.json();
            populateRegions(); // Populate dropdowns after fetching
        } catch (error) {
            console.error("Failed to fetch address data:", error);
            alert("Unable to load address data.");
        }
    }

    // Populate region dropdown
    function populateRegions() {
        regionSelect.innerHTML = '<option value="">Select Region</option>';

        Object.entries(addressData).forEach(([regionCode, regionData]) => {
            const option = document.createElement("option");
            option.value = regionData.region_name;
            option.textContent = regionData.region_name;
            regionSelect.appendChild(option);
        });
    }

    // Populate provinces based on selected region
    function populateProvinces(regionName) {
        provinceSelect.innerHTML = '<option value="">Select Province</option>';
        municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';

        const regionEntry = Object.values(addressData).find(
            (region) => region.region_name === regionName
        );

        if (regionEntry) {
            Object.keys(regionEntry.province_list).forEach((provinceName) => {
                const option = document.createElement("option");
                option.value = provinceName;
                option.textContent = provinceName;
                provinceSelect.appendChild(option);
            });
        }
    }

    // Populate municipalities based on selected province
    function populateMunicipalities(regionName, provinceName) {
        municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';

        const regionEntry = Object.values(addressData).find(
            (region) => region.region_name === regionName
        );

        if (regionEntry) {
            const provinceEntry = regionEntry.province_list[provinceName];

            if (provinceEntry) {
                Object.keys(provinceEntry.municipality_list).forEach((municipalityName) => {
                    const option = document.createElement("option");
                    option.value = municipalityName;
                    option.textContent = municipalityName;
                    municipalitySelect.appendChild(option);
                });
            }
        }
    }

    // Populate barangays based on selected municipality
    function populateBarangays(regionName, provinceName, municipalityName) {
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';

        const regionEntry = Object.values(addressData).find(
            (region) => region.region_name === regionName
        );

        if (regionEntry) {
            const provinceEntry = regionEntry.province_list[provinceName];

            if (provinceEntry) {
                const municipalityEntry = provinceEntry.municipality_list[municipalityName];

                if (municipalityEntry) {
                    municipalityEntry.barangay_list.forEach((barangayName) => {
                        const option = document.createElement("option");
                        option.value = barangayName;
                        option.textContent = barangayName;
                        barangaySelect.appendChild(option);
                    });
                }
            }
        }
    }

    // Event listeners for dropdowns
    regionSelect.addEventListener("change", (e) => {
        const regionName = e.target.value;
        populateProvinces(regionName);
    });

    provinceSelect.addEventListener("change", (e) => {
        const regionName = regionSelect.value;
        const provinceName = e.target.value;
        populateMunicipalities(regionName, provinceName);
    });

    municipalitySelect.addEventListener("change", (e) => {
        const regionName = regionSelect.value;
        const provinceName = provinceSelect.value;
        const municipalityName = e.target.value;
        populateBarangays(regionName, provinceName, municipalityName);
    });

    // Fetch user's address from Supabase
    async function fetchAddress() {
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
            console.error("Authentication Error:", authError?.message || "User not logged in");
            alert("Please log in again.");
            return;
        }

        const userId = userData.user.id;

        const { data, error } = await supabase
            .from("user_profiles")
            .select("barangay, municipality, province, region")
            .eq("user_id", userId)
            .single();

        if (error) {
            console.error("Error fetching address:", error.message);
            alert("Could not load address.");
        } else {
            barangaySpan.textContent = data.barangay || "Not available";
            municipalitySpan.textContent = data.municipality || "Not available";
            provinceSpan.textContent = data.province || "Not available";
            regionSpan.textContent = data.region || "Not available";
        }
    }

    // Fetch initial address + address data
    await fetchAddress();
    await fetchAddressData(); // load JSON dynamically here

    editBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");

        const currentRegion = regionSpan.textContent.trim();
        const currentProvince = provinceSpan.textContent.trim();
        const currentMunicipality = municipalitySpan.textContent.trim();
        const currentBarangay = barangaySpan.textContent.trim();

        regionSelect.value = currentRegion;
        populateProvinces(currentRegion);

        provinceSelect.value = currentProvince;
        populateMunicipalities(currentRegion, currentProvince);

        municipalitySelect.value = currentMunicipality;
        populateBarangays(currentRegion, currentProvince, currentMunicipality);

        barangaySelect.value = currentBarangay;
    });

    cancelBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    saveBtn.addEventListener("click", async () => {
        const updatedRegion = regionSelect.value.trim();
        const updatedProvince = provinceSelect.value.trim();
        const updatedMunicipality = municipalitySelect.value.trim();
        const updatedBarangay = barangaySelect.value.trim();

        if (!updatedRegion || !updatedProvince || !updatedMunicipality || !updatedBarangay) {
            alert("Please complete the address.");
            return;
        }

        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
            console.error("Authentication Error:", authError?.message || "User not logged in");
            alert("Please log in again.");
            return;
        }

        const userId = userData.user.id;

        const { data, error } = await supabase
            .from("user_profiles")
            .update({
                region: updatedRegion,
                province: updatedProvince,
                municipality: updatedMunicipality,
                barangay: updatedBarangay
            })
            .eq("user_id", userId)
            .select();

        if (error) {
            console.error("Error updating address:", error.message);
            alert("Update failed: " + error.message);
        } else {
            console.log("Address updated successfully:", data);
            alert("Address updated successfully!");

            barangaySpan.textContent = updatedBarangay;
            municipalitySpan.textContent = updatedMunicipality;
            provinceSpan.textContent = updatedProvince;
            regionSpan.textContent = updatedRegion;

            modal.classList.add("hidden");
        }
    });

    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
    });
});
