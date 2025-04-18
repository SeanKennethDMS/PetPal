const images = [
    '../assets/Slideshow/2025-Formula1-Ferrari-SF-25-001-1080.jpg',
    '../assets/Slideshow/2024-Formula1-Mercedes-AMG-W15-F1-E-Performance-001-1080.jpg',
    '../assets/Slideshow/2024-Formula1-McLaren-MCL38-002-1080.jpg',
    '../assets/Slideshow/2025-Formula1-Ferrari-SF-25-001-1080.jpg'
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