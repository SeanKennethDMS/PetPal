"use strict";

import supabase from "../js/supabaseClient.js";

function debounce(func, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const inventoryTable = document.getElementById("inventoryTable");
  const lowStockList = document.getElementById("lowStockList");
  const searchProductInput = document.getElementById("searchProduct");
  const addProductForm = document.getElementById("addProductForm");

  let products = []; // Global products list

  // Load Products
  await loadProducts();

  // Add Product Form
  addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const productName = document.getElementById("productName").value.trim();
    const productStock = parseInt(
      document.getElementById("productStock").value
    );
    const productPrice = parseFloat(
      document.getElementById("productPrice").value
    );
    const productCategory = document
      .getElementById("productCategory")
      .value.trim();

    if (
      !productName ||
      !productCategory ||
      isNaN(productStock) ||
      isNaN(productPrice)
    ) {
      alert("Please fill in all product fields with valid values");
      return;
    }

    const { error } = await supabase.from("products").insert([
      {
        name: productName,
        quantity: productStock,
        price: productPrice,
        category: productCategory,
        status: "Active",
      },
    ]);

    if (error) {
      alert("Failed to add product: " + error.message);
      return;
    }

    await loadProducts();
    window.dispatchEvent(new Event("productAdded"));
    showToast("Product added successfully!");
    addProductForm.reset();
  });

  // Debounced Search
  searchProductInput.addEventListener(
    "input",
    debounce((e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm) ||
          product.category.toLowerCase().includes(searchTerm)
      );
      displayProducts(filtered);
    }, 300)
  );

  // Add Batch Modal open/close logic
const openAddBatchModalBtn = document.getElementById("openAddBatchModalBtn");
const addBatchModal = document.getElementById("addBatchModal");
const closeAddBatchModal = document.getElementById("closeAddBatchModal");
const cancelAddBatch = document.getElementById("cancelAddBatch");
const addBatchForm = document.getElementById("addBatchForm");
const batchSupplier = document.getElementById("batchSupplier");
const toggleNewSupplierBtn = document.getElementById("toggleNewSupplierBtn");

// New Supplier Modal Elements
const addSupplierModal = document.getElementById("addSupplierModal");
const closeAddSupplierModal = document.getElementById("closeAddSupplierModal");
const cancelAddSupplier = document.getElementById("cancelAddSupplier");
const addSupplierForm = document.getElementById("addSupplierForm");
// Fix: Define supplier input fields
const supplierNameInput = document.getElementById("supplierName");
const supplierContactPersonInput = document.getElementById("supplierContactPerson");
const supplierPhoneInput = document.getElementById("supplierPhone");
const supplierAddressInput = document.getElementById("supplierAddress");

// Open Add Batch Modal
if (openAddBatchModalBtn && addBatchModal) {
  openAddBatchModalBtn.addEventListener("click", () => {
    addBatchForm.reset();
    fetchAndRenderSuppliers();
    addBatchModal.classList.remove("hidden");
  });
}

// Close Add Batch Modal
function closeAddBatchModalFn() {
  if (addBatchModal) addBatchModal.classList.add("hidden");
  if (addBatchForm) addBatchForm.reset();
}

if (closeAddBatchModal) {
  closeAddBatchModal.addEventListener("click", closeAddBatchModalFn);
}
if (cancelAddBatch) {
  cancelAddBatch.addEventListener("click", closeAddBatchModalFn);
}

// Open Add Supplier Modal (from new button outside batch modal)
const openAddSupplierModalBtn = document.getElementById("openAddSupplierModalBtn");
if (openAddSupplierModalBtn && addSupplierModal) {
  openAddSupplierModalBtn.addEventListener("click", () => {
    if (addSupplierForm) addSupplierForm.reset();
    addSupplierModal.classList.remove("hidden");
  });
}

// Close Add Supplier Modal
function closeAddSupplierModalFn() {
  addSupplierModal.classList.add("hidden");
  if (addSupplierForm) addSupplierForm.reset();
}

// Attach close event to all elements with id 'cancelAddSupplier' (X and Cancel button)
const cancelAddSupplierBtns = document.querySelectorAll('#cancelAddSupplier');
cancelAddSupplierBtns.forEach(btn => {
  btn.addEventListener('click', closeAddSupplierModalFn);
});

// Add Supplier Form Submission
if (addSupplierForm) {
  addSupplierForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    // Only validate supplier fields, not batch fields
    const name = supplierNameInput.value.trim();
    const contactPerson = supplierContactPersonInput.value.trim();
    const phone = supplierPhoneInput.value.trim();
    const address = supplierAddressInput.value.trim();
    // Validate phone again on submit
    const phRegex = /^(09\d{9}|\+639\d{9})$/;
    if (!name || !contactPerson || !phone || !address) {
      alert("All fields are required.");
      return;
    }
    if (!phRegex.test(phone)) {
      alert("Please enter a valid Philippine phone number (09XXXXXXXXX or +639XXXXXXXXX)");
      supplierPhoneInput.focus();
      return;
    }
    let newSupplier = null;
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ name, contact_person: contactPerson, phone, address })
        .select()
        .single();
      if (error) throw error;
      newSupplier = data;
    } catch (error) {
      alert('Failed to add new supplier: ' + error.message);
      return;
    }
    // Close addSupplierModal, open addBatchModal, refresh suppliers, select new
    closeAddSupplierModalFn();
    if (addBatchModal) addBatchModal.classList.remove("hidden");
    await fetchAndRenderSuppliers(newSupplier.id);
  });
}

  // Function to close Add Batch Modal
  function closeAddBatchModalFn() {
    if (addBatchModal) addBatchModal.classList.add("hidden");
    if (addBatchForm) addBatchForm.reset();
  }
  if (closeAddBatchModal) closeAddBatchModal.addEventListener("click", closeAddBatchModalFn);
  if (cancelAddBatch) cancelAddBatch.addEventListener("click", closeAddBatchModalFn);

  // Populate suppliers when opening modal
  function openAddBatchModal() {
    if (addBatchForm) addBatchForm.reset();
    fetchAndRenderSuppliers();
    if (addBatchModal) addBatchModal.classList.remove("hidden");
  }

  if (openAddBatchModalBtn && addBatchModal) {
    openAddBatchModalBtn.addEventListener("click", openAddBatchModal);
  }

  // Functions
  async function loadProducts() {
    inventoryTable.innerHTML = "";
    lowStockList.innerHTML = "";

    try {
      // Initial load
      const { data, error } = await supabase
        .from("products")
        .select("*, product_batches(expiration_date)")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading products:", error);
        alert("Failed to load products: " + error.message);
        return;
      }

      products = data || [];
      displayProducts(products);

      // Subscribe to real-time updates
      supabase
        .channel("products_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          async (payload) => {
            await loadProducts(); // Refresh the list on any change
          }
        )
        .subscribe();
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred while loading products");
    }
  }

  function displayProducts(productsToShow) {
    inventoryTable.innerHTML = "";
    lowStockList.innerHTML = ""; // Clear previous low stock items

    const LOW_STOCK_THRESHOLD = 5;

    if (productsToShow.length === 0) {
      inventoryTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-gray-500">
                        No products found. Try a different search term.
                    </td>
                </tr>`;
      return;
    }

    productsToShow.forEach((product) => {
      // Add to low stock list if applicable (but don't show modal)
      if (product.quantity <= LOW_STOCK_THRESHOLD) {
        const li = document.createElement("li");
        li.className = "flex items-center py-1";
        li.innerHTML = `
                    <span class="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    ${product.name} - ${product.quantity} left
                `;
        lowStockList.appendChild(li);
      }

      // Find soonest expiration date from product_batches or fallback to products.expiration_date
      let soonestExpiration = "N/A";
      if (product.product_batches && product.product_batches.length > 0) {
        const validDates = product.product_batches
          .map(b => b.expiration_date)
          .filter(date => !!date)
          .sort();
        if (validDates.length > 0) {
          soonestExpiration = new Date(validDates[0]).toLocaleDateString();
        }
      } else if (product.expiration_date) {
        soonestExpiration = new Date(product.expiration_date).toLocaleDateString();
      }

      // Create table row (existing code remains)
      const row = document.createElement("tr");
      row.className = "hover:bg-gray-50";
      row.innerHTML = `
                <td class="border border-gray-300 p-2">${product.name}</td>
                <td class="border border-gray-300 p-2 ${
                  product.quantity <= LOW_STOCK_THRESHOLD
                    ? "text-red-600 font-semibold"
                    : ""
                }">
                    ${product.quantity}
                </td>
                <td class="border border-gray-300 p-2">₱${product.price.toFixed(
                  2
                )}</td>
                <td class="border border-gray-300 p-2">
                    ${soonestExpiration}
                </td>
                <td class="border border-gray-300 p-2 space-x-2">
                    <button class="restockBtn bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition" 
                            data-id="${product.id}">
                        Restock
                    </button>
                    <button class="deleteBtn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition" 
                            data-id="${product.id}">
                        Delete
                    </button>
                </td>
            `;
      inventoryTable.appendChild(row);
    });

    addEditDeleteListeners();
  }

  function addEditDeleteListeners() {
    const restockBtns = document.querySelectorAll(".restockBtn");
    const deleteBtns = document.querySelectorAll(".deleteBtn");

    // Get modal elements
    const restockModal = document.getElementById("restockModal");
    const closeRestockModal = document.getElementById("closeRestockModal");
    const cancelRestock = document.getElementById("cancelRestock");
    const restockForm = document.getElementById("restockForm");
    const restockProductId = document.getElementById("restockProductId");
    const restockQuantity = document.getElementById("restockQuantity");

    // Close modal function
    const closeModal = () => {
      restockModal.classList.add("hidden");
      document.body.style.overflow = "auto";
    };

    // Modal event listeners
    closeRestockModal.addEventListener("click", closeModal);
    cancelRestock.addEventListener("click", closeModal);

    // Handle clicks outside modal
    restockModal.addEventListener("click", (e) => {
      if (e.target === restockModal) {
        closeModal();
      }
    });

    // Restock button click handler
    restockBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const productId = btn.getAttribute("data-id");
        const product = products.find((p) => p.id === productId);

        if (product) {
          restockProductId.value = productId;
          restockQuantity.value = 1; // Default to adding 1 item

          // Update modal title
          document.querySelector(
            "#restockModal h3"
          ).textContent = `Restock ${product.name}`;

          restockModal.classList.remove("hidden");
          document.body.style.overflow = "hidden";
          restockQuantity.focus();
        }
      });
    });

    // Quantity input validation
    restockQuantity.addEventListener("input", (e) => {
      const newValue = parseInt(e.target.value);
      if (isNaN(newValue)) {
        e.target.value = 1;
        return;
      }

      if (newValue < 1) {
        e.target.value = 1;
        alert("You must add at least 1 item");
      }
    });

    // Form submission
    restockForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const productId = restockProductId.value;
      const quantityToAdd = parseInt(restockQuantity.value);
      const currentProduct = products.find((p) => p.id === productId);

      // Validation checks
      if (isNaN(quantityToAdd)) {
        alert("Please enter a valid number of items to add");
        restockQuantity.focus();
        return;
      }

      if (quantityToAdd < 1) {
        alert("You must add at least 1 item");
        restockQuantity.value = 1;
        restockQuantity.focus();
        return;
      }

      // Calculate new total stock
      const newStock = currentProduct.quantity + quantityToAdd;

      // Show loading state
      const submitBtn = restockForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = "Adding Stock...";
      submitBtn.disabled = true;

      try {
        const { error } = await supabase
          .from("products")
          .update({
            quantity: newStock,
            updated_at: new Date(),
          })
          .eq("id", productId);

        if (error) throw error;

        // Success - close modal and refresh
        closeModal();
        await loadProducts();
      } catch (error) {
        console.error("Restock error:", error);
        alert("Failed to add stock: " + error.message);
      } finally {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });

    // Delete buttons
    deleteBtns.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const productId = btn.getAttribute("data-id");
        const productName =
          products.find((p) => p.id === productId)?.name || "this product";

        if (
          !confirm(
            `Are you sure you want to delete "${productName}"? This action cannot be undone.`
          )
        ) {
          return;
        }

        // Show loading state on the button
        const originalBtnText = btn.textContent;
        btn.textContent = "Deleting...";
        btn.disabled = true;

        try {
          const { error } = await supabase
            .from("products")
            .delete()
            .eq("id", productId);

          if (error) throw error;

          await loadProducts();
        } catch (error) {
          console.error("Delete error:", error);
          alert("Failed to delete product: " + error.message);
        } finally {
          btn.textContent = originalBtnText;
          btn.disabled = false;
        }
      });
    });
  }

  // Fetch and Render Suppliers in Dropdown
  async function fetchAndRenderSuppliers(selectedSupplierId = null) {
    if (!batchSupplier) return;
    batchSupplier.innerHTML = '<option value="">Select Supplier</option>';
    const { data: suppliers, error } = await supabase.from('suppliers').select('id, name').order('name');
    if (error) {
      alert('Failed to load suppliers');
      return;
    }
    // Use a Set to avoid duplicate supplier names
    const seenNames = new Set();
    suppliers.forEach(supplier => {
      if (!seenNames.has(supplier.name)) {
        seenNames.add(supplier.name);
        const option = document.createElement('option');
        option.value = supplier.id;
        option.textContent = supplier.name;
        if (selectedSupplierId && supplier.id === selectedSupplierId) {
          option.selected = true;
        }
        batchSupplier.appendChild(option);
      }
    });
  }

  // Add Batch Form Submission (Add Product Batch)
  if (addBatchForm) {
    addBatchForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      const productName = document.getElementById("batchProductName").value.trim();
      const productCategory = document.getElementById("batchProductCategory").value.trim();
      const quantity = parseInt(document.getElementById("batchQuantity").value, 10);
      const expirationDate = document.getElementById("batchExpirationDate").value;
      const deliveredDate = document.getElementById("batchDeliveredDate").value;
      const costPerUnit = parseFloat(document.getElementById("batchCostPerUnit").value) || null;
      const supplierId = batchSupplier.value;

      if (!productName || !productCategory || !quantity || !expirationDate || !deliveredDate || !costPerUnit || !supplierId) {
        alert('Please fill in all required fields.');
        return;
      }

      // Generate a unique batch number (e.g., BATCH-yyyyMMddHHmmss-<random4>)
      function generateBatchNumber() {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const dateStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `BATCH-${dateStr}-${rand}`;
      }
      const batchNumber = generateBatchNumber();

      let productId = null;
      try {
        // Insert product (or get existing)
        let { data: existingProducts, error: fetchError } = await supabase
          .from('products')
          .select('id, quantity')
          .eq('name', productName)
          .eq('category', productCategory)
          .maybeSingle();
        if (fetchError) throw fetchError;
        if (existingProducts && existingProducts.id) {
          productId = existingProducts.id;
          // Update price and increment quantity
          const newQuantity = (existingProducts.quantity || 0) + quantity;
          await supabase.from('products').update({ price: costPerUnit, quantity: newQuantity }).eq('id', productId);
        } else {
          // Insert new product with initial quantity
          let { data: newProduct, error: insertError } = await supabase
            .from('products')
            .insert({
              name: productName,
              category: productCategory,
              price: costPerUnit,
              quantity: quantity, // Set initial quantity
              status: 'Active',
            })
            .select()
            .single();
          if (insertError) throw insertError;
          productId = newProduct.id;
        }
      } catch (err) {
        alert('Failed to add or fetch product: ' + (err.message || err));
        return;
      }

      try {
        // Insert new batch with batch quantity
        const { error: batchError } = await supabase.from('product_batches').insert({
          product_id: productId,
          supplier_id: supplierId,
          quantity: quantity, // Insert batch quantity
          expiration_date: expirationDate,
          purchase_date: deliveredDate,
          batch_number: batchNumber
        });
        if (batchError) throw batchError;
      } catch (err) {
        alert('Failed to add product batch: ' + (err.message || err));
        return;
      }
      addBatchModal.classList.add("hidden");
      addBatchForm.reset();
      await loadProducts();
    });
  }
});
