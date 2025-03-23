'use strict';

import supabase from '../js/supabaseClient.js';


function debounce(func, delay = 300) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(null, args);
      }, delay);
    };
  }


  document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const inventoryTable = document.getElementById('inventoryTable');
    const lowStockList = document.getElementById('lowStockList');
    const searchProductInput = document.getElementById('searchProduct');
    const addProductForm = document.getElementById('addProductForm');
  
    let products = []; // Global products list
  
    // Load Products
    await loadProducts();
  
    // Add Product Form
    addProductForm.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const productName = document.getElementById('productName').value.trim();
      const productStock = parseInt(document.getElementById('productStock').value);
      const productPrice = parseFloat(document.getElementById('productPrice').value);
      const productCategory = document.getElementById('productCategory').value.trim();
  
      if (!productName ||!productCategory || isNaN(productStock) || isNaN(productPrice)) {
        alert('Fill in all product fields');
        return;
      }
  
      const { error } = await supabase.from('products').insert([{
        name: productName,
        quantity: productStock,
        price: productPrice,
        category: productCategory,
        status: 'Active'
      }]);
  
      if (error) {
        alert('Failed to add product.');
        console.error(error);
        return;
      }
  
      alert('Product added!');
      addProductForm.reset();
      await loadProducts();
    });
  
    // Debounced Search
    searchProductInput.addEventListener('input', debounce((e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filtered = products.filter(product => product.name.toLowerCase().includes(searchTerm));
      displayProducts(filtered);
    }, 300));
  
    // Functions
    async function loadProducts() {
      inventoryTable.innerHTML = '';
      lowStockList.innerHTML = '';
  
      try {
        const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', {acending: true} );
  
        if (error) {
          console.error('Error loading products:', error);
          return;
        }
  
        products = data || [];
        displayProducts(products);
  
      } catch (err) {
        console.error('Unexpected error:', err);
      }
    }
  
    function displayProducts(productsToShow) {
      inventoryTable.innerHTML = '';
      lowStockList.innerHTML = '';
  
      const LOW_STOCK_THRESHOLD = 5;
  
      if (productsToShow.length === 0) {
        inventoryTable.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No products found.</td></tr>`;
        return;
      }
  
      productsToShow.forEach(product => {
        if (product.quantity <= LOW_STOCK_THRESHOLD) {
          const li = document.createElement('li');
          li.textContent = `${product.name} - Only ${product.quantity} left!`;
          lowStockList.appendChild(li);
        }
  
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="border border-gray-300 p-2">${product.name}</td>
          <td class="border border-gray-300 p-2 ${product.quantity <= LOW_STOCK_THRESHOLD ? 'text-red-600' : ''}">${product.quantity}</td>
          <td class="border border-gray-300 p-2">₱${product.price.toFixed(2)}</td>
          <td class="border border-gray-300 p-2">${new Date(product.updated_at).toLocaleDateString()}</td>
          <td class="border border-gray-300 p-2">
            <button class="editBtn bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-700" data-id="${product.id}">Edit</button>
            <button class="deleteBtn bg-red-500 text-white px-2 py-1 rounded hover:bg-red-700" data-id="${product.id}">Delete</button>
          </td>
        `;
        inventoryTable.appendChild(row);
      });
  
      addEditDeleteListeners();
    }
  
    function addEditDeleteListeners() {
      const editBtns = document.querySelectorAll('.editBtn');
      const deleteBtns = document.querySelectorAll('.deleteBtn');
  
      editBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
          const productId = btn.getAttribute('data-id');
          const newStock = prompt('Enter new stock quantity:');
          const newPrice = prompt('Enter new price:');
  
          if (!newStock || !newPrice) return;
  
          const { error } = await supabase
            .from('products')
            .update({
              quantity: parseInt(newStock),
              price: parseFloat(newPrice),
              updated_at: new Date()
            })
            .eq('id', productId);
  
          if (error) {
            alert('Failed to update product');
            console.error(error);
            return;
          }
  
          alert('Product updated!');
          await loadProducts();
        });
      });
  
      deleteBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
          const productId = btn.getAttribute('data-id');
  
          if (!confirm('Are you sure you want to delete this product?')) return;
  
          const { error } = await supabase.from('products').delete().eq('id', productId);
  
          if (error) {
            alert('Failed to delete product.');
            console.error(error);
            return;
          }
  
          alert('Product deleted');
          await loadProducts();
        });
      });
    }
  });
  
