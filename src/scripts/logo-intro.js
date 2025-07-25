import gsap from 'gsap';

document.addEventListener('DOMContentLoaded', () => {
  const main = document.getElementById('main-content');
  const nav = document.querySelector('header.nav');

  // If logo intro was already played, show content immediately
  if (sessionStorage.getItem('logoIntroPlayed')) {
    if (nav) nav.classList.add('logo-revealed');
    if (main) main.style.opacity = 1;
    return;
  }

  // Set initial state
  if (main) gsap.set(main, { opacity: 0 });

  // Animate main content after a delay
  gsap.to(main, {
    opacity: 1,
    duration: 0.7,
    delay: 0.95,
    ease: 'cubic-bezier(0.77, 0, 0, 0.175, 1)',
    onComplete: () => {
      if (nav) nav.classList.add('logo-revealed');
      sessionStorage.setItem('logoIntroPlayed', '1');
    }
  });
}); 