import { gsap } from "gsap";

const TRANSITION_DEFAULTS = {
  duration: 1.2,
  stagger: 0.25,
  revealDelay: 0.5,
  loadDelay: 500,
};

const loader = document.querySelector(".loader-wrap");
const path = document.getElementById("transitionPath");
const path2 = document.getElementById("transitionPath2");

// SVG Path States - Working paths with proper direction
const hidden = "M 0 0 V 0 Q 50 0 100 0 V 0 Z";        // completely hidden (no fill)
const covered = "M 0 0 V 100 Q 50 100 100 100 V 0 Z";  // completely covered (full fill)

// Wave paths with proper direction  
const waveDown = "M 0 0 V 50 Q 50 100 100 50 V 0 Z";   // wave curving down (top-to-bottom reveal)
const waveUp = "M 0 0 V 50 Q 50 0 100 50 V 0 Z";       // wave curving up (bottom-to-top cover)

// BOTTOM-START paths for OUT animation - actually starts from bottom edge
const bottomHidden = "M 0 100 V 100 Q 50 100 100 100 V 100 Z"; // hidden at very bottom edge (zero-height)
const bottomWaveUp = "M 0 100 V 50 Q 50 0 100 50 V 100 Z";    // wave pulled up from bottom edge
const coveredFromBottom = "M 0 100 V 0 Q 50 0 100 0 V 100 Z"; // fully covered, drawn from bottom for a smooth morph

// Show loader and set to full coverage (page starts covered)
function showLoader() {
  loader.classList.remove("hidden");
  gsap.set(path, { attr: { d: covered } });
  gsap.set(path2, { attr: { d: covered } });
  loader.style.opacity = "1";
  loader.style.pointerEvents = "all";
}

// 🔹 INTERNAL LINK OUT ANIMATION (when clicking to leave current page)
// This function is called when user clicks an internal link
function loaderIn(onComplete) {
  loader.classList.remove("hidden");
  loader.style.opacity = "1";
  loader.style.pointerEvents = "all";
  
  // 🎯 OUT ANIMATION: Start at bottom edge, get pulled UP to top
  gsap.set(path, { attr: { d: bottomHidden } });     // Red starts at bottom edge
  gsap.set(path2, { attr: { d: bottomHidden } });    // Green starts at bottom edge
  
  const tl = gsap.timeline();
  
  // 🎯 GREEN PATH ANIMATION SEQUENCE (first layer - leads the animation)
  tl.to(path2, {
    duration: TRANSITION_DEFAULTS.duration,
    keyframes: [
      { attr: { d: bottomWaveUp } },            // 🌊 Wave being pulled UP from bottom edge
      { attr: { d: coveredFromBottom } }        // 🎯 ENDING POSITION: Fully covers screen at top
    ],
    ease: "power4.inOut",                       // 🎨 Easing curve
  });
  
  // 🎯 RED PATH ANIMATION SEQUENCE (second layer, follows green with a delay)
  tl.to(path, {
    duration: TRANSITION_DEFAULTS.duration,
    keyframes: [
      { attr: { d: bottomWaveUp } },            // 🌊 Wave being pulled UP from bottom edge
      { attr: { d: coveredFromBottom } }        // 🎯 ENDING POSITION: Fully covers screen at top
    ],
    ease: "power4.inOut",                       // 🎨 Easing curve
    onComplete,                                 // 🚀 Triggers page navigation
  }, `-=${TRANSITION_DEFAULTS.duration - TRANSITION_DEFAULTS.stagger}`);                                 // ⏰ Delay: starts 0.25s after green starts
}

// 🔹 INTERNAL LINK IN ANIMATION (when arriving at new page)
// This function is called on new page load to reveal content
function loaderOut(onComplete) {
  // Ensure main content starts hidden
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    gsap.set(mainContent, { opacity: 0 });
  }

  // 🎯 IN ANIMATION: Start covered, arch DOWN to reveal content
  gsap.set(path, { attr: { d: covered } });   // Red path starts covering screen
  gsap.set(path2, { attr: { d: covered } });  // Green path starts covering screen
  
  const tl = gsap.timeline();
  
  // 🎯 RED PATH ANIMATION SEQUENCE (first layer reveals)
  tl.to(path, {
    duration: TRANSITION_DEFAULTS.duration,
    delay: TRANSITION_DEFAULTS.revealDelay,
    keyframes: [
      { attr: { d: waveDown } },                // 🌊 Wave arching DOWN (revealing from bottom)
      { attr: { d: hidden } }                   // 🎯 ENDING POSITION: Hidden, reveals page
    ],
    ease: "power4.inOut",                       // 🎨 Easing curve
    onStart: () => {
      loader.classList.remove("hidden");
      loader.style.opacity = "1";
      loader.style.pointerEvents = "all";
      
      // Show main content as the loader starts revealing
      if (mainContent) {
        gsap.to(mainContent, { 
          opacity: 1, 
          duration: 0.5, 
          ease: "power2.out" 
        });
      }
    },
    onComplete: () => {
      // Hide loader after animation is completely done
      loader.classList.add("hidden");
      loader.style.opacity = "0";
      loader.style.pointerEvents = "none";
      
      if (onComplete) onComplete();
      // Dispatch custom event to signal gallery start
      window.dispatchEvent(new Event('page:transition:end'));
    },
  });
  
  // 🎯 GREEN PATH ANIMATION SEQUENCE (second layer follows red)
  tl.to(path2, {
    duration: TRANSITION_DEFAULTS.duration,
    keyframes: [
      { attr: { d: waveDown } },                // 🌊 Wave arching DOWN (revealing from bottom)
      { attr: { d: hidden } }                   // 🎯 ENDING POSITION: Hidden, reveals page
    ],
    ease: "power4.inOut"                        // 🎨 Easing curve
  }, `-=${TRANSITION_DEFAULTS.duration - TRANSITION_DEFAULTS.stagger}`);
}

// On first page load, show loader, then animate out
window.addEventListener("DOMContentLoaded", () => {
  // Immediately show loader in covered state
  showLoader();
  
  // Hide main content initially (backup for CSS)
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    gsap.set(mainContent, { opacity: 0 });
  }
  
  // Start the reveal animation after a short delay
  setTimeout(() => {
    loaderOut();
  }, TRANSITION_DEFAULTS.loadDelay);
});

// 🔹 INTERNAL LINK CLICK HANDLER - Triggers OUT animation
// This event listener catches clicks on internal links and starts the exit transition
document.body.addEventListener("click", (e) => {
  const link = e.target.closest("a");
  if (
    link &&
    link.origin === window.location.origin &&
    !link.hasAttribute("target") &&
    !link.hasAttribute("download") &&
    !link.href.includes("#") &&
    !link.classList.contains("no-transition") &&
    !link.classList.contains("nav-link--current") // Ignore clicks on the current link
  ) {
    e.preventDefault();
    
    // Clean up gallery event listeners before navigation
    if (typeof removeAllEventListeners === 'function') {
      removeAllEventListeners();
    }
    
    // 🚀 CALLS loaderIn() - This is your OUT animation function
    loaderIn(() => {
      window.location = link.href;              // 🎯 Navigation happens after animation
    });
  }
});

// 🔹 THREE.JS PROJECT NAVIGATION - Also triggers OUT animation  
// Listen for custom event from Three.js gallery project cards
window.addEventListener("project:navigate", (event) => {
  const url = event.detail && event.detail.url;
  if (url) {
    // Clean up gallery event listeners before navigation
    if (typeof removeAllEventListeners === 'function') {
      removeAllEventListeners();
    }
    
    // 🚀 CALLS loaderIn() - Same OUT animation as regular links
    loaderIn(() => {
      window.location = url;                    // 🎯 Navigation happens after animation
    });
  }
});
