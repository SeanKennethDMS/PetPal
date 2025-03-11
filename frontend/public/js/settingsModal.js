document.addEventListener('DOMContentLoaded', () => {
    const openSettingsModalSidebar = document.getElementById('openSettingsModalSidebar');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const closeSettingsBtn2 = document.getElementById('closeSettingsBtn2');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  
    // Open Modal
    openSettingsModalSidebar.addEventListener('click', (e) => {
      e.preventDefault();
      settingsModal.classList.remove('hidden');
    });
  
    // Close Modal Buttons
    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });
  
    closeSettingsBtn2.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });
  
    // Save Settings (for now, close modal)
    saveSettingsBtn.addEventListener('click', () => {
      alert('Settings saved!');
      settingsModal.classList.add('hidden');
    });
  
    // Close by clicking outside the modal box
    window.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
      }
    });
  });