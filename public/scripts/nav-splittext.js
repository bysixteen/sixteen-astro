// Debug function to log availability positions
window.logAvailabilityPositions = () => {
  const availLink = document.getElementById("availability-link");
  if (availLink) {
    const defaultSpan = availLink.querySelector(".availability-default");
    const emailSpan = availLink.querySelector(".availability-email");
    
    if (defaultSpan && emailSpan) {
      // Debug function - kept for potential future use but cleaned up
    }
  }
};

// Wait for GSAP to be available
function waitForGSAP() {
  return new Promise((resolve) => {
    const checkGSAP = () => {
      if (typeof gsap !== 'undefined' && typeof CustomEase !== 'undefined') {
        
        // Register GSAP plugins
        gsap.registerPlugin(CustomEase);
        
        CustomEase.create("customEase", "0.65, 0.05, 0, 1");
        
        resolve();
      } else {
        setTimeout(checkGSAP, 100);
      }
    };
    checkGSAP();
  });
}

// Test function to verify GSAP is working
function testGSAP() {
  // Function kept for potential future use but cleaned up
}

// Animation sequence for gallery and nav (navigation-controls removed)
window.addEventListener('DOMContentLoaded', async () => {
  // Wait for GSAP to be available
  await waitForGSAP();
  
  const gallery = document.getElementById('project-slider');
  const nav = document.querySelector('header.nav');

  // Set initial states
  if (gallery) gsap.set(gallery, { opacity: 0 });

  // Timeline sequence
  const tl = gsap.timeline({delay: 3.5}); // 3.5-second delay
  if (gallery) tl.to(gallery, { opacity: 1, duration: 0.8, ease: 'power2.out' });
  if (nav) tl.to(nav, { opacity: 1, duration: 0.7, ease: 'power2.out' }, '-=0.3');
});

document.fonts.ready.then(async () => {
  // Wait for GSAP to be available
  await waitForGSAP();
  
  // Test GSAP functionality
  testGSAP();
  
  // --- REGULAR NAV LINKS & BUTTONS ---
  document.querySelectorAll('[data-split="letters"]').forEach(el => {
    // Skip availability link children
    if (el.closest('#availability-link')) return;

    // Determine hover container: nav links use .nav-split, buttons use .btn-split or the <button> element itself
    const container = el.closest('.nav-split, .btn-split, button');
    if (!container) return;

    // Create a simple character-by-character animation without SplitText
    const text = el.textContent;
    const chars = text.split('').map(char => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.display = 'inline-block';
      span.style.position = 'relative';
      // Preserve spaces by ensuring they have proper width
      if (char === ' ') {
        span.style.whiteSpace = 'pre';
        span.style.width = '0.2em'; // Give spaces a small width
      }
      return span;
    });
    
    // Clear the element and add the character spans
    el.textContent = '';
    chars.forEach(char => el.appendChild(char));
    
    const tl = gsap.timeline({ paused: true })
      .to(chars, {
        y: '-1.25em',
        duration: 0.735,
        stagger: 0.00666667,
        ease: 'customEase'
      });

    container.addEventListener('mouseenter', () => tl.play());
    container.addEventListener('mouseleave', () => tl.reverse());
  });

  // --- AVAILABILITY LINK - CHARACTER ANIMATION ---
  const availLink = document.getElementById("availability-link");
  if (availLink) {
    const defaultSpan = availLink.querySelector(".availability-default");
    const emailSpan = availLink.querySelector(".availability-email");

    if (defaultSpan && emailSpan) {
      availLink.classList.add('js-enabled'); // Signal that JS is in control

      // Create character-by-character animation for availability text
      const defaultText = defaultSpan.textContent;
      const emailText = emailSpan.textContent;
      
      // Split default text into characters
      const defaultChars = defaultText.split('').map(char => {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.display = 'inline-block';
        span.style.position = 'relative';
        // Preserve spaces by ensuring they have proper width
        if (char === ' ') {
          span.style.whiteSpace = 'pre';
          span.style.width = '0.2em'; // Give spaces a small width
        }
        return span;
      });
      
      // Split email text into characters
      const emailChars = emailText.split('').map(char => {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.display = 'inline-block';
        span.style.position = 'relative';
        // Preserve spaces by ensuring they have proper width
        if (char === ' ') {
          span.style.whiteSpace = 'pre';
          span.style.width = '0.2em'; // Give spaces a small width
        }
        return span;
      });
      
      // Clear and populate the spans
      defaultSpan.textContent = '';
      emailSpan.textContent = '';
      defaultChars.forEach(char => defaultSpan.appendChild(char));
      emailChars.forEach(char => emailSpan.appendChild(char));

      const tl = gsap.timeline({
          paused: true,
          defaults: {
              duration: 0.735,
              ease: "customEase",
              stagger: 0.00666667
          }
      });

      // Set initial positions
      gsap.set(defaultChars, { y: "0em", opacity: 1 });
      gsap.set(emailChars, { y: "1.25em", opacity: 0 });

      // Define the animation
      tl.to(defaultChars, { y: "-1.25em", opacity: 0 });
      tl.to(emailChars, { y: "0em", opacity: 1 }, "<"); // Start at the same time

      // Add event listeners
      availLink.addEventListener("mouseenter", () => tl.play());
      availLink.addEventListener("mouseleave", () => tl.reverse());
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav__link');

  navLinks.forEach(link => {
    // Handle the root path ("/") specifically
    if (link.pathname === '/' && currentPath === '/') {
      link.classList.add('nav-link--current');
    } else if (link.pathname !== '/' && currentPath.startsWith(link.pathname)) {
      // Handle other paths
      link.classList.add('nav-link--current');
    }
  });
}); 