import { loadPersonalForm } from './editPersonalInfo.js';
import { loadContactForm } from './editContactInfo.js';
import { loadAddressForm } from './editAddress.js';

const modal = document.getElementById('profile-edit-modal');
const formContainer = document.getElementById('modal-form-container');

export function openModal(section) {
  // Clear previous form
  formContainer.innerHTML = '';
  
  // Load correct form
  switch(section) {
    case 'personal':
      loadPersonalForm(formContainer);
      break;
    case 'contact':
      loadContactForm(formContainer);
      break;
    case 'address':
      loadAddressForm(formContainer);
      break;
  }
  
  // Activate correct tab
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === section);
  });
  
  modal.classList.remove('hidden');
}

// Initialize all edit buttons
document.querySelectorAll('.edit-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(btn.dataset.target);
  });
});