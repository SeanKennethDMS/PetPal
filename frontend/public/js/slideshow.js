const images = [
    '../assets/Slideshow/Welcome to PetPal Scheduler.jpg'
    
  ];
  
  let currentIndex = 0;
  
  function startSlideshow() {
    const slideEl = document.getElementById('slideImage');
    if (!slideEl) return;
  
    slideEl.src = images[currentIndex];
    slideEl.classList.remove('opacity-0');
  
    setInterval(() => {
      slideEl.classList.add('opacity-0');
  
      setTimeout(() => {
        currentIndex = (currentIndex + 1) % images.length;
        slideEl.src = images[currentIndex];
        slideEl.classList.remove('opacity-0');
      }, 500); 
    }, 5000); 
  }
  
  document.addEventListener('DOMContentLoaded', startSlideshow);