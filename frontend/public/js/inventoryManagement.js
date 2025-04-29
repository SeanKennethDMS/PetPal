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
    // showToast('Product added successfully!');
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

  // Functions
  async function loadProducts() {
    inventoryTable.innerHTML = "";
    lowStockList.innerHTML = "";

    try {
      // Initial load
      const { data, error } = await supabase
        .from("products")
        .select("*")
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
                    ${
                      product.updated_at
                        ? new Date(product.updated_at).toLocaleDateString()
                        : "N/A"
                    }
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
});
