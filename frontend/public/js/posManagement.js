'use strict';

import supabase from '../js/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const searchItemInput = document.getElementById('searchItem');
    const addToCartBtn = document.getElementById('addToCartBtn');
    const browseMoreBtn = document.getElementById('browseMoreBtn');
    const cartTable = document.getElementById('cartTable');
    const transactionTable = document.getElementById('transactionTable');
    const completeTransactionBtn = document.getElementById('completeTransactionBtn');
    const printReceiptBtn = document.getElementById('printReceiptBtn');
    const emailReceiptBtn = document.getElementById('emailReceiptBtn');
    const paymentMethodSelect = document.getElementById('paymentMethod');
    
    let browseModal;
    let productCategorySelect;
    let productSubCategorySelect;
    let serviceCategorySelect;
    let serviceSubCategorySelect;
    let activeTab = 'products';
    
    let cart = [];
    let products = [];
    let services = [];
    let productCategories = [];
    let serviceCategories = [];
    
    await loadProductsAndServices();
    await loadRecentTransactions();
    
    createBrowseModal();
    
    window.addEventListener('productAdded', async () => {
        await loadProductsAndServices();
        if (browseModal && !browseModal.classList.contains('hidden')) {
            populateCategories();
        }
    });
    
    addToCartBtn.addEventListener('click', addToCart);
    browseMoreBtn.addEventListener('click', openBrowseModal); 
    completeTransactionBtn.addEventListener('click', completeTransaction);
    printReceiptBtn.addEventListener('click', printReceipt);
    emailReceiptBtn.addEventListener('click', emailReceipt);
    searchItemInput.addEventListener('input', debounce(searchItems, 300));

    function createBrowseModal() {
        browseModal = document.createElement('div');
        browseModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
        browseModal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div class="p-4 border-b flex justify-between items-center">
                    <h3 class="text-lg font-semibold">Browse Items</h3>
                    <button class="close-modal text-gray-500 hover:text-gray-700">
                        &times;
                    </button>
                </div>
                
                <div class="flex border-b">
                    <button class="tab-btn px-4 py-2 font-medium ${activeTab === 'products' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}" 
                            data-tab="products">Products</button>
                    <button class="tab-btn px-4 py-2 font-medium ${activeTab === 'services' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}" 
                            data-tab="services">Services</button>
                </div>
                
                <div class="p-4 overflow-auto flex-1">
                    <!-- Products Tab Content -->
                    <div id="products-tab" class="${activeTab === 'products' ? 'block' : 'hidden'}">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select id="productCategory" class="w-full p-2 border rounded">
                                    <option value="">Select a category</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Item</label>
                                <select id="productSubCategory" class="w-full p-2 border rounded" disabled>
                                    <option value="">Select an item</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Services Tab Content -->
                    <div id="services-tab" class="${activeTab === 'services' ? 'block' : 'hidden'}">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select id="serviceCategory" class="w-full p-2 border rounded">
                                    <option value="">Select a category</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Item</label>
                                <select id="serviceSubCategory" class="w-full p-2 border rounded" disabled>
                                    <option value="">Select an item</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="p-4 border-t flex justify-end gap-2">
                    <button class="cancel-btn px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                        Cancel
                    </button>
                    <button class="add-to-cart-btn px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                            disabled>
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(browseModal);
        
        productCategorySelect = browseModal.querySelector('#productCategory');
        productSubCategorySelect = browseModal.querySelector('#productSubCategory');
        serviceCategorySelect = browseModal.querySelector('#serviceCategory');
        serviceSubCategorySelect = browseModal.querySelector('#serviceSubCategory');
        
        browseModal.querySelector('.close-modal').addEventListener('click', closeBrowseModal);
        browseModal.querySelector('.cancel-btn').addEventListener('click', closeBrowseModal);
        browseModal.querySelector('.add-to-cart-btn').addEventListener('click', addSelectedToCart);
        
        browseModal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                activeTab = btn.dataset.tab;
                
                browseModal.querySelectorAll('.tab-btn').forEach(t => {
                    const isActive = t.dataset.tab === activeTab;
                    
                    t.classList.toggle('text-blue-600', isActive);
                    t.classList.toggle('border-b-2', isActive);
                    t.classList.toggle('border-blue-600', isActive);
                    t.classList.toggle('text-gray-600', !isActive);
                });
                
                browseModal.querySelector('#products-tab').classList.toggle('hidden', activeTab !== 'products');
                browseModal.querySelector('#services-tab').classList.toggle('hidden', activeTab !== 'services');
                
                updateAddToCartButtonState();
            });
        });
        
        productCategorySelect.addEventListener('change', () => {
            updateProductSubCategories();
            updateAddToCartButtonState();
        });
        
        serviceCategorySelect.addEventListener('change', () => {
            updateServiceSubCategories();
            updateAddToCartButtonState();
        });
        
        productSubCategorySelect.addEventListener('change', updateAddToCartButtonState);
        serviceSubCategorySelect.addEventListener('change', updateAddToCartButtonState);
        
        browseModal.addEventListener('click', (e) => {
            if (e.target === browseModal) {
                closeBrowseModal();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !browseModal.classList.contains('hidden')) {
                closeBrowseModal();
            }
        });
    }
    
    function openBrowseModal() {
        populateCategories();
        
        productCategorySelect.value = '';
        productSubCategorySelect.innerHTML = '<option value="">Select an item</option>';
        productSubCategorySelect.disabled = true;
        serviceCategorySelect.value = '';
        serviceSubCategorySelect.innerHTML = '<option value="">Select an item</option>';
        serviceSubCategorySelect.disabled = true;
        
        browseModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    function closeBrowseModal() {
        browseModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    function populateCategories() {
        try {
            productCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
            productCategorySelect.innerHTML = '<option value="">Select a category</option>' + 
                productCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            
            serviceCategories = Array.from(new Set(services.map(s => s.category))).filter(Boolean);
            serviceCategorySelect.innerHTML = '<option value="">Select a category</option>' + 
                serviceCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        } catch (error) {
            console.error('Error populating categories:', error);
            productCategories = [];
            serviceCategories = [];
            productCategorySelect.innerHTML = '<option value="">No categories available</option>';
            serviceCategorySelect.innerHTML = '<option value="">No categories available</option>';
        }
    }
    
    function updateProductSubCategories() {
        const selectedCategory = productCategorySelect.value;
        productSubCategorySelect.innerHTML = '<option value="">Select an item</option>';
        
        if (selectedCategory) {
            const filteredProducts = products.filter(p => p.category === selectedCategory);
            productSubCategorySelect.disabled = false;
            
            filteredProducts.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                
                if (product.quantity <= 0) {
                    option.textContent = `${product.name} (Out of stock)`;
                    option.disabled = true;
                } else if (product.quantity <= 5) {
                    option.textContent = `${product.name} (Low stock: ${product.quantity})`;
                } else {
                    option.textContent = `${product.name} (₱${product.price.toFixed(2)})`;
                }
                
                productSubCategorySelect.appendChild(option);
            });
        } else {
            productSubCategorySelect.disabled = true;
        }
    }
    
    function updateServiceSubCategories() {
        const selectedCategory = serviceCategorySelect.value;
        serviceSubCategorySelect.innerHTML = '<option value="">Select an item</option>';
        
        if (selectedCategory) {
            const filteredServices = services.filter(s => s.category === selectedCategory);
            serviceSubCategorySelect.disabled = false;
            
            filteredServices.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                
                let priceText = 'Price varies';
                let priceValue = 0;
                
                if (service.price && typeof service.price === 'object') {
                    const firstPriceKey = Object.keys(service.price)[0];
                    if (firstPriceKey) {
                        priceValue = service.price[firstPriceKey];
                        priceText = `From ₱${priceValue.toFixed(2)}`;
                    }
                } else if (typeof service.price === 'number') {
                    priceValue = service.price;
                    priceText = `₱${priceValue.toFixed(2)}`;
                }
                
                option.textContent = `${service.name} (${priceText})`;
                option.dataset.price = priceValue; // Store numeric value for cart
                serviceSubCategorySelect.appendChild(option);
            });
        } else {
            serviceSubCategorySelect.disabled = true;
        }
    }
    
    function updateAddToCartButtonState() {
        const addToCartBtn = browseModal.querySelector('.add-to-cart-btn');
        
        if (activeTab === 'products') {
            addToCartBtn.disabled = !(productCategorySelect.value && productSubCategorySelect.value);
        } else {
            addToCartBtn.disabled = !(serviceCategorySelect.value && serviceSubCategorySelect.value);
        }
    }
    
    async function addSelectedToCart() {
        let item, itemType, price;
        
        if (activeTab === 'products') {
            const selectedId = productSubCategorySelect.value;
            item = products.find(p => p.id === selectedId);
            itemType = 'product';
            price = item.price;
            
            if (item.quantity <= 0) {
                showToast(`${item.name} is out of stock!`, 'error');
                return;
            }
        } else {
            const selectedOption = serviceSubCategorySelect.options[serviceSubCategorySelect.selectedIndex];
            const selectedId = serviceSubCategorySelect.value;
            item = services.find(s => s.id === selectedId);
            itemType = 'service';
            price = parseFloat(selectedOption.dataset.price) || 0;
        }
        
        if (!item) return;
        
        const existingItem = cart.find(i => i.id === item.id && i.type === itemType);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                ...item,
                type: itemType,
                quantity: 1,
                price: price,
                displayPrice: itemType === 'service' ? `From ₱${price.toFixed(2)}` : `₱${price.toFixed(2)}`
            });
        }
        
        renderCart();
        calculateTotals();
        closeBrowseModal();
        showToast(`${item.name} added to cart!`); 
    }
    
    
    //Load products and services from database
    async function loadProductsAndServices() {
        try {
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('*')
                .eq('status', 'Active')
                .order('name');
            
            if (productsError) throw productsError;
            
            const { data: servicesData, error: servicesError } = await supabase
                .from('services')
                .select('*')
                .eq('status', 'Active')
                .order('name');
            
            if (servicesError) throw servicesError;
            
            products = productsData || [];
            services = servicesData || [];
            
        } catch (error) {
            console.error('Error loading products/services:', error);
            alert('Failed to load products/services: ' + error.message);
        }
    }
    
    async function searchItems() {
        const searchTerm = searchItemInput.value.trim().toLowerCase();
        if (!searchTerm) return;
        
        const filteredProducts = products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            (p.sku && p.sku.toLowerCase().includes(searchTerm)) ||
            (p.category && p.category.toLowerCase().includes(searchTerm)));
        
        const filteredServices = services.filter(s => 
            s.name.toLowerCase().includes(searchTerm) ||
            (s.category && s.category.toLowerCase().includes(searchTerm)) ||
            (s.sub_category && s.sub_category.toLowerCase().includes(searchTerm)));
        
        console.log('Search results - Products:', filteredProducts);
        console.log('Search results - Services:', filteredServices);
    }
    

    async function checkStock(productId, quantityToAdd) {
        const { data, error } = await supabase
            .from('products')
            .select('quantity')
            .eq('id', productId)
            .single();
    
        if (error) {
            console.error('Error checking stock:', error);
            return false;
        }
    
        return data.quantity >= quantityToAdd;
    }
    
    async function addToCart() {
        const searchTerm = searchItemInput.value.trim();
        if (!searchTerm) {
            alert('Please enter an item to add');
            return;
        }
        
        // Find matching product or service
        const productMatch = products.find(p => 
            p.name.toLowerCase() === searchTerm.toLowerCase() ||
            (p.sku && p.sku.toLowerCase() === searchTerm.toLowerCase()));
        
        const serviceMatch = services.find(s => 
            s.name.toLowerCase() === searchTerm.toLowerCase());
        
        if (!productMatch && !serviceMatch) {
            alert('No matching item found');
            return;
        }
        
        const item = productMatch || serviceMatch;
        const itemType = productMatch ? 'product' : 'service';
        
        // Add stock check for products
        if (itemType === 'product') {
            // Silent stock check (no modal)
            if (item.quantity <= 0) {
                showToast(`${item.name} is out of stock!`, 'error');
                return;
            }
        }
        
        // Check if already in cart
        const existingItem = cart.find(i => 
            i.id === item.id && i.type === itemType);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                ...item,
                type: itemType === 'product' ? 'product' : 'service',
                quantity: 1,
                price: item.price,
                displayPrice: `₱${item.price.toFixed(2)}`
            });
        }
        
        renderCart();
        calculateTotals();
        searchItemInput.value = '';
    }
    
    // Render the shopping cart
    function renderCart() {
        cartTable.innerHTML = '';
        
        if (cart.length === 0) {
            cartTable.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-4 text-gray-500">
                        Your cart is empty
                    </td>
                </tr>`;
            return;
        }
        
        cart.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="border border-gray-300 p-2">
                    ${item.name}<br>
                    <span class="text-sm text-gray-500">${item.displayPrice || `₱${item.price.toFixed(2)}`}</span>
                </td>
                <td class="border border-gray-300 p-2">
                    <input type="number" min="1" value="${item.quantity}" 
                           class="w-16 text-center border rounded quantity-input"
                           data-index="${index}">
                </td>
                <td class="border border-gray-300 p-2">₱${(item.price * item.quantity).toFixed(2)}</td>
                <td class="border border-gray-300 p-2">
                    <button class="remove-item bg-red-500 text-white px-2 py-1 rounded hover:bg-red-700"
                            data-index="${index}">
                        Remove
                    </button>
                </td>
            `;
            cartTable.appendChild(row);
        });
        
        // Add event listeners for quantity changes
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                const newQuantity = parseInt(e.target.value);
                
                if (isNaN(newQuantity)) {
                    e.target.value = 1;
                    return;
                }
                
                if (newQuantity < 1) {
                    e.target.value = 1;
                    alert('Quantity must be at least 1');
                    return;
                }
                
                cart[index].quantity = newQuantity;
                calculateTotals();
            });
        });
        
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                cart.splice(index, 1);
                renderCart();
                calculateTotals();
            });
        });
    }
    
    function calculateTotals() {
        const subtotal = cart.reduce((sum, item) => {
            return sum + (Number(item.price) * item.quantity);
        }, 0);
        
        const tax = subtotal * 0.12;
        
        const total = subtotal + tax;
        
        const updateElement = (selector, value) => {
            const el = document.querySelector(selector);
            if (el) el.textContent = value;
        };
        
        updateElement('.subtotal-amount', `₱${subtotal.toFixed(2)}`);
        updateElement('.tax-amount', `₱${tax.toFixed(2)}`);
        updateElement('.total-amount', `₱${total.toFixed(2)}`);
        updateElement('.discount-amount', '₱0.00');
    }

    async function completeOrder(cartItems) {
        try {
            for (const item of cartItems) {
                const currentProduct = await getProductStock(item.id); 
                const newStock = currentProduct.quantity - item.quantity;
                
                if (newStock < 0) {
                    alert(`Not enough stock for ${item.name}!`);
                    return;
                }
    
                await debouncedUpdateStock(item.id, newStock); 
            }
            alert('Order completed! Stock updated.');
        } catch (error) {
            console.error('Checkout failed:', error);
        }
    }
    
    // Helper function to fetch current stock
    async function getProductStock(productId) {
        const { data, error } = await supabase
            .from('products')
            .select('quantity')
            .eq('id', productId)
            .single();
    
        if (error) throw error;
        return data;
    }
    
    // Complete the transaction
    async function completeTransaction() {
        if (cart.length === 0) {
            alert('Your cart is empty');
            return;
        }

        for (const item of cart) {
            if (item.type === 'product') {
                const currentStock = await getProductStock(item.id);
                if (currentStock.quantity < item.quantity) {
                    showToast(`Not enough ${item.name} (only ${currentStock.quantity} left)`, 'error');
                    return;
                }
            }
        }
    
        
        // Calculate amounts
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.12;
        const total = subtotal + tax;
    
        try {
            const { data: transaction, error: transactionError } = await supabase
                .from('transactions')
                .insert({
                    transaction_code: 'TXN-' + Date.now().toString(36).toUpperCase(),
                    total_amount: total,
                    tax_amount: tax,
                    subtotal_amount: subtotal,
                    payment_method: paymentMethodSelect.value || 'Cash',
                    status: 'Paid',
                    transaction_type: 'Sale'
                })
                .select();
    
            if (transactionError) throw transactionError;
    
            const transactionId = transaction[0].id;
    
            // Prepare transaction items with properly capitalized types
            const transactionItems = cart.map(item => ({
                transaction_id: transactionId,
                item_id: item.id,
                item_type: item.type === 'product' ? 'product' : 'service', // lowercase to match constraint
                quantity: item.quantity,
                price: item.price,
                item_name: item.name
            }));
            
            const { error: itemsError } = await supabase
                .from('transaction_items')
                .insert(transactionItems);
    
            if (itemsError) throw itemsError;
    
    
            const productUpdates = cart
                .filter(item => item.type === 'product')
                .map(item => ({
                    id: item.id,
                    quantity: item.quantity
                }));
    
            for (const update of productUpdates) {
                const { error: updateError } = await supabase.rpc('decrement_inventory', {
                    product_id: update.id,
                    amount: update.quantity
                });
                if (updateError) throw updateError;
            }
    
            cart = [];
            renderCart();
            calculateTotals();
            await loadRecentTransactions();
            alert('Transaction completed successfully!');
    
        } catch (error) {
            console.error('Transaction error:', error);
            alert(`Transaction failed: ${error.message}\n\nPlease verify:\n- Item types are 'Product' or 'Service'\n- Payment method is valid\n- All required fields are provided`);
        } finally {
            completeTransactionBtn.disabled = false;
            completeTransactionBtn.textContent = 'Complete Transaction';
        }
    }
    
    async function loadRecentTransactions() {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    id,
                    transaction_code,
                    created_at,
                    total_amount,
                    status,
                    payment_method,
                    urn,
                    transaction_items:transaction_items(
                        item_name,
                        quantity,
                        price
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            
            renderTransactions(data || []);
            
        } catch (error) {
            console.error('Error loading transactions:', error);
            alert('Failed to load transactions: ' + error.message);
        }
    }
    
    function renderTransactions(transactions) {
        transactionTable.innerHTML = '';
        
        if (transactions.length === 0) {
            transactionTable.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-4 text-gray-500">
                        No recent transactions
                    </td>
                </tr>`;
            return;
        }
        
        transactions.forEach(tx => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            const itemCount = tx.transaction_items.reduce((sum, item) => sum + item.quantity, 0);
            
            row.innerHTML = `
                <td class="border border-gray-300 p-2">${tx.transaction_code}</td>
                <td class="border border-gray-300 p-2">${tx.urn ? tx.urn : 'N/A'}</td>
                <td class="border border-gray-300 p-2">${new Date(tx.created_at).toLocaleString()}</td>
                <td class="border border-gray-300 p-2">${tx.payment_method}</td>
                <td class="border border-gray-300 p-2">₱${tx.total_amount.toFixed(2)}</td>
                <td class="border border-gray-300 p-2 ${tx.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}">
                    ${tx.status}
                </td>
            `;
            transactionTable.appendChild(row);
        });
    }
    
    function printReceipt() {
        if (cart.length === 0) {
            alert('No items in cart to print');
            return;
        }
        alert('Receipt printing would be implemented here');
    }
    
    function emailReceipt() {
        if (cart.length === 0) {
            alert('No items in cart to email');
            return;
        }
        alert('Email receipt would be implemented here');
    }
    
    function debounce(func, delay = 300) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(null, args);
            }, delay);
        };
    }
    
    const debouncedUpdateStock = debounce(async (productId, newQuantity) => {
        const { error } = await supabase
            .from('products')
            .update({ quantity: newQuantity })
            .eq('id', productId);
    
        if (error) {
            console.error('Failed to update stock:', error);
        }
    }, 300);

    calculateTotals();

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-white ${
            type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } animate-fade-in-up`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('animate-fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});