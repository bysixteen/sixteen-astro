console.log("nav-splittext.js loaded");

// Debug function to log availability positions
window.logAvailabilityPositions = () => {
  const availLink = document.getElementById("availability-link");
  if (availLink) {
    const defaultSpan = availLink.querySelector(".availability-default");
    const emailSpan = availLink.querySelector(".availability-email");
    
    if (defaultSpan && emailSpan) {
      console.log("=== MANUAL POSITION DEBUG ===");
      console.log("Default span (Available):", {
        text: defaultSpan.textContent,
        transform: defaultSpan.style.transform,
        getBoundingClientRect: defaultSpan.getBoundingClientRect(),
        computedStyle: window.getComputedStyle(defaultSpan)
      });
      console.log("Email span (daniel@bysixteen.co.uk):", {
        text: emailSpan.textContent,
        transform: emailSpan.style.transform,
        getBoundingClientRect: emailSpan.getBoundingClientRect(),
        computedStyle: window.getComputedStyle(emailSpan)
      });
      
      // Also log individual characters if SplitText is available
      if (SplitText) {
        try {
          const splitDefault = new SplitText(defaultSpan, { 
            type: "chars",
            charsClass: "split-char",
            position: "relative"
          });
          const splitEmail = new SplitText(emailSpan, { 
            type: "chars",
            charsClass: "split-char",
            position: "relative"
          });
          
          console.log("Default characters:");
          splitDefault.chars.forEach((char, i) => {
            const rect = char.getBoundingClientRect();
            console.log(`  ${i}: "${char.textContent}" - transform: "${char.style.transform}" - Y: ${rect.top}px`);
          });
          
          console.log("Email characters:");
          splitEmail.chars.forEach((char, i) => {
            const rect = char.getBoundingClientRect();
            console.log(`  ${i}: "${char.textContent}" - transform: "${char.style.transform}" - Y: ${rect.top}px`);
          });
        } catch (error) {
          console.log("SplitText already initialized or not available");
        }
      }
    }
  }
};

// Register GSAP plugins
gsap.registerPlugin(CustomEase);

// Note: SplitText is a premium plugin, so we'll handle it gracefully
let SplitText = null;

CustomEase.create("customEase", "0.65, 0.05, 0, 1");

// Test function to verify GSAP and SplitText are working
function testGSAP() {
  console.log("GSAP version:", gsap.version);
  console.log("SplitText plugin available:", !!SplitText);
  console.log("CustomEase plugin:", CustomEase);
}

// Animation sequence for gallery and nav (navigation-controls removed)
window.addEventListener('DOMContentLoaded', () => {
  const gallery = document.getElementById('project-slider');
  const nav = document.querySelector('header.nav');

  // Set initial states
  if (gallery) gsap.set(gallery, { opacity: 0 });

  // Timeline sequence
  const tl = gsap.timeline({delay: 3.5}); // 3.5-second delay
  if (gallery) tl.to(gallery, { opacity: 1, duration: 0.8, ease: 'power2.out' });
  if (nav) tl.to(nav, { opacity: 1, duration: 0.7, ease: 'power2.out' }, '-=0.3');
});

document.fonts.ready.then(() => {
  // Test GSAP functionality
  testGSAP();
  // --- REGULAR NAV LINKS & BUTTONS ---
  document.querySelectorAll('[data-split="letters"]').forEach(el => {
    // Skip availability link children
    if (el.closest('#availability-link')) return;

    // Determine hover container: nav links use .nav-split, buttons use .btn-split or the <button> element itself
    const container = el.closest('.nav-split, .btn-split, button');
    if (!container) return;

    if (SplitText) {
      const split = new SplitText(el, { type: 'chars' });
      const tl = gsap.timeline({ paused: true })
        .to(split.chars, {
          y: '-1.25em',
          duration: 0.735,
          stagger: 0.00666667,
          ease: 'customEase'
        });

      container.addEventListener('mouseenter', () => tl.play());
      container.addEventListener('mouseleave', () => tl.reverse());
    }
  });

  // --- AVAILABILITY LINK - CHARACTER ANIMATION ---
  const availLink = document.getElementById("availability-link");
  if (availLink) {
    const defaultSpan = availLink.querySelector(".availability-default");
    const emailSpan = availLink.querySelector(".availability-email");

    if (defaultSpan && emailSpan && SplitText) {
      availLink.classList.add('js-enabled'); // Signal that JS is in control

      const splitDefault = new SplitText(defaultSpan, { type: "chars" });
      const splitEmail = new SplitText(emailSpan, { type: "chars" });

      const tl = gsap.timeline({
          paused: true,
          defaults: {
              duration: 0.735,
              ease: "customEase",
              stagger: 0.00666667
          }
      });

      // Set initial positions
      gsap.set(splitDefault.chars, { y: "0em", opacity: 1 });
      gsap.set(splitEmail.chars, { y: "1.25em", opacity: 0 });

      // Define the animation
      tl.to(splitDefault.chars, { y: "-1.25em", opacity: 0 });
      tl.to(splitEmail.chars, { y: "0em", opacity: 1 }, "<"); // Start at the same time

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