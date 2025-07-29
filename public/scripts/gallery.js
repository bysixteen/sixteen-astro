// Gallery script for CDN-loaded GSAP and Three.js

// ============================================================================
// THREE.JS GLOBALS & STATE MANAGEMENT
// ============================================================================

// Core Three.js objects
let scene, camera, renderer, clock;
let raycaster, mouseVector;

// Gallery state
let projectCards = []; // Primary project cards
let allProjectCards = []; // All cards including duplicates
let isSceneInitialized = false;
let isGalleryFullyLoaded = false;
let isIntroAnimationActive = false;

// Scroll and position tracking
let scrollVelocity = 0;
let targetScrollPosition = 0;
let currentScrollPosition = 0;

// ============================================================================
// CORE PHYSICS CONSTANTS
// ============================================================================

const PHYSICS = {
  speedDecay: 0.85,        // How quickly velocity fades (0.8 = quick stop, 0.9 = long glide)
  lerpFactor: 0.12,        // Position smoothing (0.05 = floaty, 0.2 = snappy)
  velocityScale: 0.8,      // Input sensitivity (higher = more responsive)
  maxVelocity: 8.0,        // Clamp extreme speeds
  stopThreshold: 0.01      // When to consider motion "stopped" (increased for better hover detection)
};

// ============================================================================
// ENHANCED SCROLL STATE
// ============================================================================

// Add these new variables to your existing globals (put near the top with other scroll vars)
let virtualVelocity = 0;           // The core velocity that drives everything
let targetPosition = 0;            // Where we're smoothly moving toward
let lastFrameTime = 0;             // For frame-rate independence

// ============================================================================
// TOUCH/DRAG STATE MANAGEMENT
// ============================================================================

// Add these new variables with your other globals
let isDragging = false;
let dragStartX = 0;
let dragLastX = 0;
let dragLastTime = 0;
let dragVelocityBuffer = []; // Track recent movements for momentum calculation
let lastScrollStopTime = 0; // Track when scrolling stopped for hover resume

// ============================================================================
// MAGNETIC SNAP CONSTANTS
// ============================================================================

const SNAP = {
  enabled: true,                    // Toggle snapping on/off
  threshold: 0.15,                  // When velocity drops below this, start snapping
  strength: 0.08,                   // How aggressively it snaps (0.05 = gentle, 0.15 = firm)
  detectionRange: 2.0,              // How close to consider a card "snappable"
  minSettleTime: 300                // Minimum time (ms) before snapping kicks in
};

// Add these new variables with your other globals
let snapTarget = null;              // Which card we're snapping to
let snapStartTime = 0;              // When snapping motion began
let lastSnapCheckTime = 0;          // Prevents excessive snap calculations

// Mouse and interaction state
let mousePosition = {
  x: 0,
  y: 0,
  normalized: {
    x: 0,
    y: 0,
  },
};
let hasMouseMoved = false;
let mouseMovedSinceLastFrame = false;
let hoveredProjectIndex = -1;
let hoveredProjectMesh = null;

// Hover label elements
let hoverLabelContainer, hoverLabelTitle, hoverLabelCategory;
let hoverAnimationTimeline = null;
let hoverExitAnimation = null;

// Navigation elements
let leftNavigationArrow, rightNavigationArrow;
let isKeyboardNavigationActive = false;

// Performance optimization
let loadedTextureCount = 0;
let lastFrameTimestamp = 0;
let offscreenThreshold = 50;
let frameCounter = 0;
let lastPerformanceCheckTimestamp = 0;
let isPerformanceModeActive = false;
let isHeavyAnimationActive = false;

// Store references for removal of global event listeners
let eventHandlers = [];

// Project data storage
let projectData = [];
// Cache for already-loaded textures to avoid reloading duplicates
const textureCache = new Map();

// Loader progress globals
let totalTexturesToLoad = 0;

// ============================================================================
// DRAG VELOCITY CALCULATOR
// ============================================================================

function calculateDragVelocity() {
  // Use recent movement history to calculate smooth velocity
  if (dragVelocityBuffer.length < 2) return 0;
  
  // Get the last few samples (within 100ms)
  const now = performance.now();
  const recentSamples = dragVelocityBuffer.filter(sample => now - sample.time < 100);
  
  if (recentSamples.length < 2) return 0;
  
  // Calculate average velocity from recent samples
  let totalDelta = 0;
  let totalTime = 0;
  
  for (let i = 1; i < recentSamples.length; i++) {
    const timeDelta = recentSamples[i].time - recentSamples[i-1].time;
    const positionDelta = recentSamples[i].x - recentSamples[i-1].x;
    
    if (timeDelta > 0) {
      totalDelta += positionDelta;
      totalTime += timeDelta;
    }
  }
  
  if (totalTime === 0) return 0;
  
  // Convert to velocity in world units per second
  const pixelsPerSecond = (totalDelta / totalTime) * 1000;
  const worldUnitsPerSecond = pixelsToWorldUnits(pixelsPerSecond);
  
  // Return the velocity with proper direction (inverted for natural scrolling)
  // When dragging left to right (positive delta), we want positive velocity (gallery continues left to right)
  // When dragging right to left (negative delta), we want negative velocity (gallery continues right to left)
  const finalVelocity = -worldUnitsPerSecond;
  
  // Debug logging
  console.log("🎯 Momentum calculation:", {
    totalDelta: totalDelta.toFixed(2),
    direction: totalDelta > 0 ? "left-to-right" : "right-to-left",
    pixelsPerSecond: pixelsPerSecond.toFixed(2),
    finalVelocity: finalVelocity.toFixed(2)
  });
  
  return finalVelocity;
}

function pixelsToWorldUnits(pixels) {
  // Convert pixel movement to world units using your existing camera setup
  if (!camera) return pixels * 0.01; // Fallback if camera not ready
  
  const viewportHeightUnits = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const viewportWidthUnits = viewportHeightUnits * camera.aspect;
  const unitsPerPixel = viewportWidthUnits / window.innerWidth;
  return pixels * unitsPerPixel;
}

// ============================================================================
// SNAP TARGET DETECTION
// ============================================================================

function findNearestSnapTarget() {
  if (!projectCards || projectCards.length === 0) return null;
  
  let nearest = null;
  let minDistance = Infinity;
  
  // Find the card closest to screen center
  const screenCenterX = 0; // World coordinate for screen center
  
  for (const card of projectCards) {
    if (!card.userData || typeof card.userData.baseX !== 'number') continue;
    
    // Calculate where this card currently is
    const cardWorldX = card.userData.baseX + currentScrollPosition;
    const distanceFromCenter = Math.abs(cardWorldX - screenCenterX);
    
    if (distanceFromCenter < minDistance && distanceFromCenter < SNAP.detectionRange) {
      minDistance = distanceFromCenter;
      nearest = card;
    }
  }
  
  return nearest;
}

function calculateSnapTargetPosition(card) {
  if (!card || !card.userData) return currentScrollPosition;
  
  // Calculate the position that would center this card
  const cardBaseX = card.userData.baseX;
  const targetScrollPosition = -cardBaseX; // Negative because we're moving the world, not the camera
  
  return targetScrollPosition;
}

// ============================================================================
// PERFORMANCE OPTIMIZATION UTILITIES
// ============================================================================

// Object pooling for performance
const vectorPool = [];
const getPooledVector = () =>
	vectorPool.length ? vectorPool.pop() : new THREE.Vector3();
const returnPooledVector = (vec) => vectorPool.push(vec.set(0, 0, 0));

// Uniform change detection cache
const uniformCache = new Map();
const hasUniformChanged = (mesh, uniformName, newValue) => {
	const cacheKey = `${mesh.uuid}_${uniformName}`;
	const cachedValue = uniformCache.get(cacheKey);
  
	if (typeof newValue === "object" && newValue.x !== undefined) {
    // Handle Vector2/Vector3
		if (
			!cachedValue ||
			cachedValue.x !== newValue.x ||
			cachedValue.y !== newValue.y
		) {
			uniformCache.set(cacheKey, {
				x: newValue.x,
				y: newValue.y,
			});
      return true;
    }
    return false;
  } else {
    // Handle scalar values
		if (cachedValue !== newValue) {
			uniformCache.set(cacheKey, newValue);
      return true;
    }
    return false;
  }
};

// Hover label transform for GPU acceleration
const hoverLabelTransform = {
  x: 0,
  y: 0,
  width: 0,
};

// === createHoverTitle helper ===
function createHoverTitle() {
	hoverLabelContainer = document.createElement("div");
	hoverLabelContainer.className = "project-hover-label";
	hoverLabelContainer.style.display = "flex";
	hoverLabelContainer.style.flexDirection = "row";
	hoverLabelContainer.style.justifyContent = "space-between";
	hoverLabelContainer.style.alignItems = "flex-start";
	hoverLabelContainer.style.gap = "24px";
	hoverLabelContainer.style.minWidth = "200px";

	// Create title container with masked animation structure
	const titleContainer = document.createElement("div");
	titleContainer.className = "u--clip u--rel";
	titleContainer.style.height = "1em";
	titleContainer.style.overflow = "hidden";
	titleContainer.style.lineHeight = "1";

	hoverLabelTitle = document.createElement("span");
	hoverLabelTitle.className = "project-hover-label__title";

	titleContainer.appendChild(hoverLabelTitle);

	// Create category container with masked animation structure
	const categoryContainer = document.createElement("div");
	categoryContainer.className = "u--clip u--rel";
	categoryContainer.style.height = "1em";
	categoryContainer.style.overflow = "hidden";
	categoryContainer.style.lineHeight = "1";

	hoverLabelCategory = document.createElement("span");
	hoverLabelCategory.className = "project-hover-label__category";

	categoryContainer.appendChild(hoverLabelCategory);

	hoverLabelContainer.appendChild(titleContainer);
	hoverLabelContainer.appendChild(categoryContainer);
	document.body.appendChild(hoverLabelContainer);

  // Performance: quickSetter for GPU-accelerated moves
	hoverLabelContainer._lastLeft = 0; // was: _lastL
	hoverLabelContainer._lastTop = 0; // was: _lastT
	hoverLabelContainer._justActivated = false;
	hoverLabelContainer.style.left = "0px";
	hoverLabelContainer.style.top = "0px";
	hoverLabelContainer.style.visibility = "hidden";
}

// ============================================================================
// ANIMATION SYSTEM CONFIGURATION
// ============================================================================

// Register GSAP plugins
if (typeof gsap !== "undefined") {
  if (typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }
  if (typeof CustomEase !== "undefined") {
    gsap.registerPlugin(CustomEase);
    CustomEase.create("customEase", "0.65, 0.05, 0, 1");
  }
  if (typeof SplitText !== "undefined") {
    gsap.registerPlugin(SplitText);
  } else {
  }
}

// Core timing configuration
const TIMING = {
  base: {
		duration: 0.6, // Base duration unit
		stagger: 0.08, // Base stagger unit
		delay: 0.2, // Base delay unit
  },
  
  easing: {
    smooth: "power2.out",
    dramatic: "expo.out",
    bounce: "back.out(1.7)",
		snappy: "power3.out",
		ultraSnappy: "cubic-bezier(0.5, 1.6, 0.4, 1)",
		customEase: "customEase",
	},

	navigation: {
		entranceDelay: 1.05,
		linkStagger: 0.12,
		characterStagger: 0.03,
		duration: 0.8,
		hoverDuration: 0.3,
		hoverStagger: 0.01,
	},
};

// Enhanced animation configuration
const ANIMATION_CONFIG = {
  intro: {
    cards: {
			duration: TIMING.base.duration * 4,
			stagger: TIMING.base.stagger,
			initialScale: 1.08,
			ease: TIMING.easing.dramatic,
		},
  },

  hover: {
    scale: {
      value: 1.05,
			duration: 0.3,
			ease: "customEase",
    },
    text: {
			duration: 0.3,
			stagger: 0.01,
			ease: "customEase",
		},
  },

  scroll: {
    physics: {
      sensitivity: 1,
      easeFactor: 0.05,
      autoSpeed: 0.5,
			idleDelay: 1500,
    },
    visual: {
      morphIntensity: 0.08,
			waveSpeed: 0.08,
		},
  },

  performance: {
		batchSize: 4,
		heavyThreshold: 6,
		throttleInterval: 16.67,
		hoverUpdateInterval: 2,
		uniformUpdateInterval: 2,
	},
};

// Animation System - Timeline Management
class AnimationSystem {
  static timelines = new Map();
  static activeCount = 0;

  static create(id, config = {}) {
    const timeline = gsap.timeline({
      ...config,
      onStart: () => {
        this.activeCount++;
        this._checkPerformanceMode();
        config.onStart?.();
      },
      onComplete: () => {
        this.activeCount--;
        this._checkPerformanceMode();
        this.timelines.delete(id);
        config.onComplete?.();
			},
    });

    this.timelines.set(id, timeline);
    return timeline;
  }

  static _checkPerformanceMode() {
    if (this.activeCount >= ANIMATION_CONFIG.performance.heavyThreshold) {
			if (!isHeavyAnimationActive) {
				isHeavyAnimationActive = true;
        uniformCache.clear();
      }
		} else if (isHeavyAnimationActive) {
			isHeavyAnimationActive = false;
      uniformCache.clear();
    }
  }

  static killAll() {
		this.timelines.forEach((timeline) => timeline.kill());
    this.timelines.clear();
    this.activeCount = 0;
		isHeavyAnimationActive = false;
    uniformCache.clear();
  }
}

// ---------------------------------------------------------------------------
// CONFIG  –  all tweakable constants in one place
//           Units: world-space unless a comment says otherwise
// ---------------------------------------------------------------------------
const CONFIG = {
  // Card dimensions
  cardWidth: 6.0,
  cardHeight: 4.0, // Taller aspect ratio
  cardSpacing: 1, // More spacing for visual impact
  desiredPixelWidth: 640, // Desired on-screen width of each card in pixels
  desiredPixelHeight: 320, // Maximum height of each card in pixels
  desiredPixelGap: 24,
  // Desired gap between cards in pixels

  // Movement physics - Tuned for Thibaut-style smoothness
  scrollSensitivity: 0.02, // Further reduced to slow down scroll per wheel event
  friction: 0.92, // How quickly the gallery slows down. 0.99 = very slippery, 0.8 = stops fast.
  maxVelocity: 0.5, // The maximum speed the gallery can reach. Higher = faster.
  velocityMultiplier: 6.0, // Amplifies the morph effect based on scroll speed. Higher = more intense morph.
  pullStrength: 0.3,
  // How much the card shape "pulls" horizontally with speed. Higher = more pull.

  // Visual effects
  morphIntensity: 0.08, // The base amount of vertex distortion. 0 = flat, 1 = extreme.
  waveSpeed: 0.08,
  // The speed of the liquid/wave effect in the shader. Higher = faster waves.

  // Auto-scroll
  autoScrollSpeed: 0.05,
  // Restored auto-scroll speed

  // Infinite scroll
  duplicateDistance: 50,
  totalWidth: 0,
  viewportWidthUnits: 0, // Store viewport width for later "off-screen" calculations
};

// ---------------------------------------------------------------------------
// TEXT_ANIM – shared timing constants for SplitText letter in/out animations
// Matches navigation link animations exactly
// ---------------------------------------------------------------------------
const TEXT_ANIM = {
  inDuration: 0.735, // Animation duration for text appearing (matches nav links)
  outDuration: 0.735, // Animation duration for text disappearing (matches nav links)
  charStagger: 0.00666667, // Delay between each letter animating (matches nav links)
  categoryStagger: 0.00666667, // Stagger for the category text (matches nav links)
};

// Border overlay removed - unnecessary decoration

/**
 * bakeTextureOnCanvas – draws the image onto a canvas before use.
 * This "bakes" the texture, which can prevent performance stutters,
 * especially with non-power-of-two images.
 * @param {THREE.Texture} texture
 */
function bakeTextureOnCanvas(texture) {
  const img = texture.image;
  if (!img) return;

  const canvas = document.createElement("canvas");
  const w = img.width || 1024;
  const h = img.height || 1024;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  // Draw original image
  ctx.drawImage(img, 0, 0, w, h);

  // Text-drawing is disabled, but the canvas-baking provides the performance boost.

  texture.image = canvas;
  texture.needsUpdate = true;
}

/**
 * extractProjectData()
 * --------------------
 * Scans   <div id="project-data">   for child  .project-item  nodes,
 * collects their data-attributes into a plain array used by the WebGL layer.
 *
 * @returns {void} Populates the global `projectData` array
 */
function extractProjectData() {
  const projectItems = document.querySelectorAll("#project-data .project-item");

  projectData = Array.from(projectItems).map((item, index) => {
    const data = {
      id: index,
      title: item.dataset.title,
      category: item.dataset.category,
      imageUrl: item.dataset.image,
      url: item.dataset.url,
    };
    
    return data;
  });
}

/**
 * initThreeScene()
 * ----------------
 * Sets up the Three.js renderer, camera, lights and converts the desired
 * 400 px card width into world units so the gallery looks the same on any
 * viewport / DPR.  Must run before we create any meshes.
 *
 * @returns {void}
 */
function initThreeScene() {
  const canvas = document.getElementById("project-slider");
  if (!canvas) {
    return;
  }
  
  // Scene setup
  scene = new THREE.Scene();
	scene.background = null; // Ensure transparent background

  // Camera with proper FOV and positioning
  camera = new THREE.PerspectiveCamera(
    40, // Adjusted FOV for better proportions
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(0, 0, 10);
	camera.lookAt(0, 0, 0);
	camera.updateMatrixWorld();
  // Further back for larger cards

  // ---------------------------------------------------------
  // Calculate card dimensions in world units to equal ~400px
  // ---------------------------------------------------------
  const viewportHeightUnits =
    2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const viewportWidthUnits = viewportHeightUnits * camera.aspect;
  const unitsPerPixel = viewportWidthUnits / window.innerWidth;

  // Calculate card dimensions with height constraint
  const calculatedWidth = CONFIG.desiredPixelWidth * unitsPerPixel;
  const calculatedHeight = calculatedWidth / 1.5; // 3:2 aspect ratio
  const maxHeight = CONFIG.desiredPixelHeight * unitsPerPixel;
  
  // Use the smaller of calculated height or max height
  CONFIG.cardWidth = calculatedWidth;
  CONFIG.cardHeight = Math.min(calculatedHeight, maxHeight);
  
  // Adjust width to maintain aspect ratio if height was constrained
  if (CONFIG.cardHeight === maxHeight) {
    CONFIG.cardWidth = maxHeight * 1.5; // Maintain 3:2 aspect ratio
  }
  
  // Debug logging for card dimensions
  console.log('Card dimensions:', {
    calculatedWidth: calculatedWidth / unitsPerPixel + 'px',
    calculatedHeight: calculatedHeight / unitsPerPixel + 'px',
    maxHeight: maxHeight / unitsPerPixel + 'px',
    finalWidth: CONFIG.cardWidth / unitsPerPixel + 'px',
    finalHeight: CONFIG.cardHeight / unitsPerPixel + 'px',
    viewportWidth: window.innerWidth + 'px',
    viewportHeight: window.innerHeight + 'px'
  });
  // Gap equal to the desired pixel gap converted to world units (e.g. 24 px)
  const gapUnits = CONFIG.desiredPixelGap * unitsPerPixel;
  // Store viewport width for later "off-screen" calculations
  CONFIG.viewportWidthUnits = viewportWidthUnits;
  CONFIG.cardSpacing = CONFIG.cardWidth + gapUnits;

  // Any card whose center is further than this from viewport centre will be ignored in the RAF update loop
	offscreenThreshold = viewportWidthUnits * 0.7 + CONFIG.cardWidth * 2;

  // Corner radius in UV space (8px on the 400-px texture width)
  CONFIG.cornerRadiusUV = 8 / CONFIG.desiredPixelWidth;

  // High-quality renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
		alpha: true, // Enable alpha for transparent background
    powerPreference: "high-performance",
  });
	// Adaptive device-pixel-ratio: caps DPR at 1.5 so we don't waste GPU time on high-DPI screens
  const cappedDPR = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(cappedDPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false; // Shadows disabled for performance
	renderer.setClearColor(0x000000, 0); // Set transparent clear color

  // Lighting setup for depth and dimension
  const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight.position.set(3, 3, 8);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  // Raycaster for interactions
  raycaster = new THREE.Raycaster();
  mouseVector = new THREE.Vector2();

  clock = new THREE.Clock();
	isSceneInitialized = true;

	// Handle WebGL context lost/restored
	canvas.addEventListener(
		"webglcontextlost",
		(event) => {
			event.preventDefault();
			isSceneInitialized = false;
		},
		false,
	);

	// Remove webglcontextrestored event handler referencing reinitializeGallery
}

// Remove DOMContentLoaded fallback. Only initialize gallery on 'page:transition:end'.
function startGallery() {
  if (window.portfolioGalleryInitialized) return;
  extractProjectData();
  initThreeScene();
  createGallery();
  setupControlsEnhancedWithDrag();
  startRenderLoopEnhancedWithSnap();
  createHoverTitle();
  window.portfolioGalleryInitialized = true;
}

// Make startGallery globally available
window.startGallery = startGallery; 

/**
 * createGallery()
 * ---------------
 * Coordinates the creation of all card meshes (primary and duplicates) by
 * calling `createProjectCard` for each. Once all cards and their textures are
 * loaded, it calculates the group of cards needed for the intro and starts
 * the `playIntroAnimation`.
 */
async function createGallery() {
  // Loader overlay disabled – start building gallery immediately
  // Reset loading counters
  loadedTextureCount = 0;
	isGalleryFullyLoaded = false;

  // Calculate expected texture count for all sets
  const duplicateSetsToLoad = [-2, -1, 0, 1, 2]; // All sets we need initially
  totalTexturesToLoad = duplicateSetsToLoad.length * projectData.length;

  try {
    CONFIG.totalWidth = projectData.length * CONFIG.cardSpacing;

    const allCardCreationPromises = [];

    // Create promises for all cards (primary and duplicates)
    duplicateSetsToLoad.forEach((k) => {
      projectData.forEach((project, i) => {
        const originalIndex = i + k * projectData.length;
        const offset = k * CONFIG.totalWidth;

        allCardCreationPromises.push(
          createProjectCard(project, originalIndex, offset),
        );
      });
    });

    // Wait for ALL cards to be created and their textures loaded
    const createdMeshes = await Promise.all(allCardCreationPromises);

    // Now that all meshes are created, populate the arrays and add to scene
		createdMeshes.forEach((mesh, index) => {
      if (mesh) {
				allProjectCards.push(mesh);
        scene.add(mesh);
				// The 'projectCards' array holds the primary set (offset 0) for reference
        if (mesh.userData.offset === 0) {
					projectCards.push(mesh);
        }
			} else {
      }
    });
		projectCards.sort((a, b) => a.userData.index - b.userData.index);

    // Define the group of cards for the intro animation, including duplicates.
    const introIndices = [-4, -3, -2, -1, 0, 1, 2];
		const introAnimationGroup = allProjectCards.filter((card) =>
      introIndices.includes(card.userData.originalIndex),
    );

    // Initially hide cards not in the intro by moving them far off-screen and making them transparent.
		allProjectCards.forEach((card) => {
      if (!introAnimationGroup.includes(card)) {
        card.position.x = 9999; // Move far away to prevent any visual artifacts
        if (card.material && card.material.uniforms) {
          card.material.uniforms.uOpacity.value = 0.0;
        }
      }
    });

    // Sort the group by index to ensure the stagger sequence is correct.
    introAnimationGroup.sort(
      (a, b) => a.userData.originalIndex - b.userData.originalIndex,
    );

    // Set the initial centered position based on card 0
		if (projectCards.length > 0) {
			currentScrollPosition = targetScrollPosition =
				projectCards[0].userData.baseX;
    }

    // Start the animation with the correct group of cards
		playIntroAnimation(introAnimationGroup);
		isGalleryFullyLoaded = true;
  } catch (error) {
		console.error('Error creating gallery:', error);
  }
}

/**
 * createProjectCard()
 * -------------------
 * Async helper that loads an image texture, attaches it to a PlaneGeometry
 * and returns a Mesh ready to be added to the scene.
 *
 * @param {object}  projectInfo – title/category/image/url pulled from DOM
 * @param {number}  index       – logical index (may be <0 or >projectData.length for duplicates)
 * @param {number}  offset      – additional X offset (for duplicate sets)
 * @returns {Promise<THREE.Mesh>} resolves once texture finished (or fallback created)
 */
function createProjectCard(projectInfo, index, offset = 0) {
  return new Promise((resolve, reject) => {
    // High-resolution geometry for smooth morphing
    const geometry = new THREE.PlaneGeometry(
      CONFIG.cardWidth,
      CONFIG.cardHeight,
      32,
      32,
    );

    // Load texture (reuse from cache if available)
    const cachedTexture = textureCache.get(projectInfo.imageUrl);

		if (cachedTexture) {
			onTextureReady(cachedTexture);
		} else {
			const textureLoader = new THREE.TextureLoader();
			textureLoader.crossOrigin = "anonymous";

			// Add timeout and retry logic for texture loading
			const loadTextureWithRetry = (url, retryCount = 0) => {
				const maxRetries = 2;

							textureLoader.load(
				url,
				(tx) => {
					textureCache.set(projectInfo.imageUrl, tx);
					onTextureReady(tx);
				},
				(progress) => {},
				(error) => {
					if (retryCount < maxRetries) {
						setTimeout(
							() => {
								loadTextureWithRetry(url, retryCount + 1);
							},
							1000 * (retryCount + 1),
						); // Exponential backoff
					} else {
							// Create fallback material for failed loads
							const material = new THREE.MeshBasicMaterial({
								color: 0x333333,
								transparent: true,
								opacity: 0.8,
							});
							const mesh = new THREE.Mesh(geometry, material);

							const setIndex =
								((index % projectData.length) + projectData.length) %
								projectData.length;
							const centerOffset =
								(projectData.length - 1.0) * CONFIG.cardSpacing * 0.5;
							const basePosition = setIndex * CONFIG.cardSpacing - centerOffset;
							mesh.position.x = basePosition + offset;
							mesh.userData = {
								projectInfo,
								index: setIndex,
								originalIndex: index,
								originalX: mesh.position.x,
								baseX: basePosition,
								offset: offset,
								hoverTarget: 0,
								hoverCurrent: 0,
								greyscaleTarget: 0.0,
								greyscaleCurrent: 0.0,
								opacityTarget: 0.2, // Fallback opacity
								opacityCurrent: 0.2, // Fallback opacity
								isHovered: false,
							};

							loadedTextureCount++; // Still increment counter for failed loads
							resolve(mesh);
						}
					},
				);
			};

			loadTextureWithRetry(projectInfo.imageUrl);
		}

    const onTextureReady = (texture) => {
      // Configure texture for proper aspect ratio
      texture.colorSpace = THREE.NoColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter; // enable mip-maps for cleaner sampling
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      if (renderer && renderer.capabilities.getMaxAnisotropy) {
        texture.anisotropy = Math.min(
          4,
          renderer.capabilities.getMaxAnisotropy(),
        );
      }
      texture.wrapS = THREE.MirroredRepeatWrapping;
      texture.wrapT = THREE.MirroredRepeatWrapping;

      // Bake texture to canvas to improve performance, but don't draw numbers.
      bakeTextureOnCanvas(texture);

      // Morphing shader
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: {
            value: texture,
          },
          uTime: {
            value: 0,
          },
          uHover: {
            value: 0,
          },
          uMouse: {
            value: new THREE.Vector2(0, 0),
          },
          uVelocity: {
            value: 0,
          },
          uMorphIntensity: {
            value: CONFIG.morphIntensity,
          },
          uWaveSpeed: {
            value: CONFIG.waveSpeed,
          },
          uVelocityMultiplier: {
            value: CONFIG.velocityMultiplier,
          },
          uPullStrength: {
            value: CONFIG.pullStrength,
          },
          uGreyscale: {
            value: 0.0,
          },
          uCornerRadiusUV: {
            value: CONFIG.cornerRadiusUV,
          },
          uOpacity: {
            value: 1.0,
          },
          uIntro: {
            value: 0.0,
          }, // 0 = sharp, 1 = blurred (during intro)
          uMotionBlur: {
            value: 0.0,
          }, // New uniform for motion blur
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec3 vWorldPosition;
            
            uniform float uTime;
            uniform float uHover;
            uniform vec2 uMouse;
            uniform float uVelocity;
            uniform float uMorphIntensity;
            uniform float uWaveSpeed;
            uniform float uVelocityMultiplier;
            uniform float uPullStrength;
            
            void main() {
              vUv = uv;
              vPosition = position;
              vNormal = normal;
              
              vec3 pos = position;
              
              // Create a vertical falloff to keep top/bottom edges straight
              float morphFalloff = 1.0 - pow(abs(vUv.y * 2.0 - 1.0), 2.0);

              // Velocity pull effect
              // This creates the "pull" from the center based on scroll velocity.
              float pullFalloff = 1.0 - pow(abs(vUv.y * 2.0 - 1.0), 2.5);
              pos.x -= uVelocity * uPullStrength * pullFalloff;
              
              // Morphing pattern
              float time = uTime * uWaveSpeed;
              float velocityEffect = abs(uVelocity) * uVelocityMultiplier;
              
              // Primary horizontal wave (main morphing effect)
              float wave1 = sin(time + pos.x * 1.2) * uMorphIntensity * velocityEffect;
              
              // Secondary vertical wave (cross pattern)
              float wave2 = cos(time * 1.3 + pos.y * 0.8) * uMorphIntensity * velocityEffect * 0.5;
              
              // Tertiary diagonal wave (fluid connection)
              float wave3 = sin(time * 0.7 + (pos.x + pos.y) * 0.6) * uMorphIntensity * velocityEffect * 0.3;
              
              // Combine waves for liquid feel and apply falloff
              float totalMorph = wave1 + wave2 + wave3;
              pos.z += totalMorph * morphFalloff;
              
              // Horizontal bend for liquid motion
              pos.x += sin(time * 0.5 + pos.y * 1.5) * uMorphIntensity * velocityEffect * 0.08 * morphFalloff;
              
              // Vertical bend (subtle secondary motion)
              pos.y += cos(time * 0.6 + pos.x * 1.2) * uMorphIntensity * velocityEffect * 0.05 * morphFalloff;
              
              // Hover elevation disabled – no Z-shift on hover
              // float hoverInfluence = smoothstep(0.0, 1.0, uHover);
              // pos.z += hoverInfluence * 0.12;
              
              // World position for fragment shader
              vec4 worldPos = modelMatrix * vec4(pos, 1.0);
              vWorldPosition = worldPos.xyz;
              
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `,
        fragmentShader: `
            uniform sampler2D uTexture;
            uniform float uTime;
            uniform float uHover;
            uniform vec2 uMouse;
            uniform float uVelocity;
            uniform float uWaveSpeed;
            uniform float uGreyscale;
            uniform float uOpacity;
            uniform float uIntro;
            uniform float uCornerRadiusUV;
            uniform float uMotionBlur; // New uniform for motion blur
            
            varying vec2 vUv;
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec3 vWorldPosition;
            
            void main() {
              // UV distortion for liquid effect
              vec2 uv = vUv;
              
              // Velocity-based UV distortion (his signature effect)
              float distortionAmount = abs(uVelocity) * 0.015;
              float time = uTime * uWaveSpeed;
              
              uv.x += sin(time * 2.5 + vUv.y * 8.0) * distortionAmount;
              uv.y += cos(time * 2.0 + vUv.x * 6.0) * distortionAmount * 0.8;
              
              // Motion blur based on scroll velocity
              float motionBlurAmount = uMotionBlur * 0.008; // Controlled by uniform
              float introBlurAmount = 0.012 * uIntro; // Intro blur
              float totalBlur = max(motionBlurAmount, introBlurAmount);
              
              vec4 color;
              if (totalBlur > 0.001) {
                // Sample multiple points for smooth motion blur
                vec4 sample1 = texture2D(uTexture, uv);
                vec4 sample2 = texture2D(uTexture, uv - vec2(totalBlur * 0.7, 0.0));
                vec4 sample3 = texture2D(uTexture, uv + vec2(totalBlur * 0.7, 0.0));
                vec4 sample4 = texture2D(uTexture, uv - vec2(totalBlur * 0.3, 0.0));
                vec4 sample5 = texture2D(uTexture, uv + vec2(totalBlur * 0.3, 0.0));
                
                // Weighted average for smooth blur
                color = (sample1 * 0.4 + sample2 * 0.2 + sample3 * 0.2 + sample4 * 0.1 + sample5 * 0.1);
              } else {
                // No blur, just sample once
                color = texture2D(uTexture, uv);
              }
              
              // Hover brightness enhancement disabled
              // float hoverEffect = smoothstep(0.0, 1.0, uHover);
              // color.rgb *= 1.0 + hoverEffect * 0.12;
              
              // Greyscale effect for non-hovered cards
              float greyscaleValue = dot(color.rgb, vec3(0.299, 0.587, 0.114));
              color.rgb = mix(color.rgb, vec3(greyscaleValue), uGreyscale);
              
              // Rounded-corner alpha mask using a signed distance function (SDF)
              // for clean, anti-aliased corners.
              vec2 centeredUv = vUv - 0.5; // Remap UVs to be centered at (0,0)
              vec2 boxHalfSize = vec2(0.5);
              float radius = uCornerRadiusUV;

              // Calculate distance from rounded box edge
              vec2 q = abs(centeredUv) - boxHalfSize + radius;
              float sdf = min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;

              // Use the distance to create a smooth alpha mask.
              // A feather of ~1px on a 400px texture is 1/400 = 0.0025
              float feather = 0.0025; 
              float mask = 1.0 - smoothstep(0.0, feather, sdf);

              // Discard pixels that are fully transparent to improve performance.
              if (mask < 0.001) discard;

              // Apply the mask to the final color's alpha.
              color.a *= mask;

              // Velocity-based tint disabled to avoid overall brightness shifts
              // float velocityColor = abs(uVelocity) * 0.02;
              // color.rgb += vec3(velocityColor * 0.05, velocityColor * 0.025, velocityColor * 0.075);
              
              // Subtle edge darkening
              float edgeFade = smoothstep(0.0, 0.2, distance(vUv, vec2(0.5)));
              color.rgb *= mix(1.0, 0.96, edgeFade * 0.4);
              
              // Ensure proper output
              color.rgb = clamp(color.rgb, 0.0, 1.0);
              color.a *= uOpacity;
              gl_FragColor = color;
            }
          `,
        transparent: true, // allow opacity animation
        side: THREE.FrontSide,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Position cards with infinite scroll support – center the gallery
      const setIndex =
        ((index % projectData.length) + projectData.length) %
        projectData.length;
      const centerOffset =
        (projectData.length - 1.0) * CONFIG.cardSpacing * 0.5;
      const basePosition = setIndex * CONFIG.cardSpacing - centerOffset;

      mesh.position.x = basePosition + offset;
      mesh.position.y = 0;
      mesh.position.z = 0;

      // Enable shadows
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Store data for animation and infinite scroll
      mesh.userData = {
        projectInfo,
        index: setIndex,
        originalIndex: index,
        originalX: mesh.position.x,
        baseX: basePosition,
        offset: offset,
        hoverTarget: 0,
        hoverCurrent: 0,
        greyscaleTarget: 0.0,
        greyscaleCurrent: 0.0,
        opacityTarget: 1.0,
        opacityCurrent: 1.0,
        isHovered: false,
      };

      loadedTextureCount++;

      resolve(mesh);
    };
  });
}

// Register a custom ease for snappy but smooth motion (Thibaut-inspired)
if (typeof gsap !== "undefined" && typeof CustomEase !== "undefined") {
  gsap.registerPlugin(CustomEase);
  // Quick start, smooth finish (no long tail)
  CustomEase.create("thibautSnappy", "M0,0 C0.6,0.1 0.3,1 1,1");
}

// Register a custom ease for a soft, premium settle
if (typeof gsap !== "undefined" && typeof CustomEase !== "undefined") {
  gsap.registerPlugin(CustomEase);
  CustomEase.create("premiumSoftSettle", "M0,0 C0.8,0.15 0.2,1 1,1");
}

// Initialize gallery when page transition ends
window.addEventListener('page:transition:end', startGallery);

// Also initialize if libraries are already loaded
if (typeof gsap !== "undefined" && typeof THREE !== "undefined") {
  // Check if we're on the right page and data is ready
  if (document.getElementById('project-data') && document.getElementById('project-slider')) {
    // Wait a bit for everything to be ready
    setTimeout(() => {
      if (!window.portfolioGalleryInitialized) {
        startGallery();
      }
    }, 100);
  }
} 

/**
 * Setup controls for scrolling & interactions
 */
// ============================================================================
// ENHANCED CONTROLS WITH DRAG SUPPORT
// ============================================================================

function setupControlsEnhancedWithDrag() {
  // Keep all existing handlers from Chunk 1
  leftNavigationArrow = document.getElementById("key-arrow-left");
  rightNavigationArrow = document.getElementById("key-arrow-right");

  // Mouse tracking (existing)
  const mouseMoveHandler = (event) => {
    if (!hasMouseMoved) hasMouseMoved = true;
    mousePosition.x = event.clientX;
    mousePosition.y = event.clientY;
    mousePosition.normalized.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePosition.normalized.y = -(event.clientY / window.innerHeight) * 2 + 1;
    mouseVector.x = mousePosition.normalized.x;
    mouseVector.y = mousePosition.normalized.y;
    mouseMovedSinceLastFrame = true;

    // NEW: Handle drag movement
    if (isDragging) {
      const currentTime = performance.now();
      const deltaX = event.clientX - dragLastX;
      
      // Add to velocity buffer for momentum calculation
      dragVelocityBuffer.push({
        x: event.clientX,
        time: currentTime,
        delta: deltaX
      });
      
      // Keep buffer size manageable (last 10 samples)
      if (dragVelocityBuffer.length > 10) {
        dragVelocityBuffer.shift();
      }
      
      // Apply immediate drag movement to virtual velocity (inverted for natural scrolling)
      const worldDelta = pixelsToWorldUnits(deltaX);
      virtualVelocity -= worldDelta * 0.3; // Inverted: drag left = gallery moves right (shows cards to left)
      
      dragLastX = event.clientX;
      dragLastTime = currentTime;
      
      // Change cursor to indicate dragging
      document.body.style.cursor = 'grabbing';
    }
  };
  window.addEventListener("mousemove", mouseMoveHandler);
  eventHandlers.push(["mousemove", mouseMoveHandler]);

  // NEW: Mouse drag start
  const mouseDownHandler = (event) => {
    // Only start dragging if we're not over a clickable element
    const intersects = raycaster.intersectObjects(allProjectCards);
    if (intersects.length > 0) {
      isDragging = true;
      dragStartX = event.clientX;
      dragLastX = event.clientX;
      dragLastTime = performance.now();
      dragVelocityBuffer = [{
        x: event.clientX,
        time: dragLastTime,
        delta: 0
      }];
      
      document.body.style.cursor = 'grabbing';
      event.preventDefault(); // Prevent text selection
    }
  };
  window.addEventListener("mousedown", mouseDownHandler);
  eventHandlers.push(["mousedown", mouseDownHandler]);

  // NEW: Mouse drag end
  const mouseUpHandler = (event) => {
    if (isDragging) {
      // Calculate final momentum from drag gesture
      const momentum = calculateDragVelocity();
      virtualVelocity += momentum * 0.8; // Apply momentum with scaling (direction handled in calculateDragVelocity)
      
      // Clamp velocity
      virtualVelocity = Math.max(-PHYSICS.maxVelocity, Math.min(PHYSICS.maxVelocity, virtualVelocity));
      
      isDragging = false;
      dragVelocityBuffer = [];
      document.body.style.cursor = 'default';
      
      // Force hover state update after a short delay to ensure it resumes
      setTimeout(() => {
        // Reset hover state to force fresh detection
        hoveredProjectIndex = -1;
        hoveredProjectMesh = null;
        updateHoverStates();
      }, 50);
    }
  };
  window.addEventListener("mouseup", mouseUpHandler);
  eventHandlers.push(["mouseup", mouseUpHandler]);

  // Enhanced wheel (from Chunk 1)
  const wheelHandler = (event) => {
    event.preventDefault();
    const delta = event.deltaY * PHYSICS.velocityScale * 0.01;
    virtualVelocity += delta;
    virtualVelocity = Math.max(-PHYSICS.maxVelocity, Math.min(PHYSICS.maxVelocity, virtualVelocity));
  };
  window.addEventListener("wheel", wheelHandler, { passive: false });
  eventHandlers.push(["wheel", wheelHandler]);

  // NEW: Touch support
  const touchStartHandler = (event) => {
    const touch = event.touches[0];
    isDragging = true;
    dragStartX = touch.clientX;
    dragLastX = touch.clientX;
    dragLastTime = performance.now();
    dragVelocityBuffer = [{
      x: touch.clientX,
      time: dragLastTime,
      delta: 0
    }];
    
    event.preventDefault();
  };
  window.addEventListener("touchstart", touchStartHandler, { passive: false });
  eventHandlers.push(["touchstart", touchStartHandler]);

  const touchMoveHandler = (event) => {
    if (!isDragging) return;
    
    const touch = event.touches[0];
    const currentTime = performance.now();
    const deltaX = touch.clientX - dragLastX;
    
    // Add to velocity buffer
    dragVelocityBuffer.push({
      x: touch.clientX,
      time: currentTime,
      delta: deltaX
    });
    
    if (dragVelocityBuffer.length > 10) {
      dragVelocityBuffer.shift();
    }
    
          // Apply touch movement (inverted for natural scrolling)
      const worldDelta = pixelsToWorldUnits(deltaX);
      virtualVelocity -= worldDelta * 0.4; // Inverted: swipe left = gallery moves right (shows cards to left)
    
    dragLastX = touch.clientX;
    dragLastTime = currentTime;
    
    event.preventDefault();
  };
  window.addEventListener("touchmove", touchMoveHandler, { passive: false });
  eventHandlers.push(["touchmove", touchMoveHandler]);

  const touchEndHandler = (event) => {
    if (isDragging) {
      // Apply touch momentum
      const momentum = calculateDragVelocity();
      virtualVelocity += momentum * 1.2; // Touch gets slightly more momentum (direction handled in calculateDragVelocity)
      
      virtualVelocity = Math.max(-PHYSICS.maxVelocity, Math.min(PHYSICS.maxVelocity, virtualVelocity));
      
      isDragging = false;
      dragVelocityBuffer = [];
      
      // Force hover state update after a short delay to ensure it resumes
      setTimeout(() => {
        // Reset hover state to force fresh detection
        hoveredProjectIndex = -1;
        hoveredProjectMesh = null;
        updateHoverStates();
      }, 50);
    }
  };
  window.addEventListener("touchend", touchEndHandler);
  eventHandlers.push(["touchend", touchEndHandler]);

  // Enhanced click handling - prevent clicks during drag
  const clickHandler = (event) => {
    // Ignore clicks if we just finished dragging
    if (Math.abs(event.clientX - dragStartX) > 10) {
      return; // This was a drag, not a click
    }
    
    updateHoverStates();
    const intersects = raycaster.intersectObjects(allProjectCards);
    if (intersects.length > 0) {
      const project = intersects[0].object;
      const url = project.userData.projectInfo.url;
      if (url) {
        window.dispatchEvent(new CustomEvent("project:navigate", { detail: { url } }));
        return;
      }
    }
  };
  window.addEventListener("click", clickHandler);
  eventHandlers.push(["click", clickHandler]);

  // Keyboard navigation (from Chunk 1)
  const keydownHandler = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      virtualVelocity -= 0.5;
      if (leftNavigationArrow)
        leftNavigationArrow.classList.add("navigation-controls__arrow--active");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      virtualVelocity += 0.5;
      if (rightNavigationArrow)
        rightNavigationArrow.classList.add("navigation-controls__arrow--active");
    }
  };
  window.addEventListener("keydown", keydownHandler);
  eventHandlers.push(["keydown", keydownHandler]);

  const keyupHandler = (event) => {
    if (event.key === "ArrowLeft") {
      if (leftNavigationArrow)
        leftNavigationArrow.classList.remove("navigation-controls__arrow--active");
    } else if (event.key === "ArrowRight") {
      if (rightNavigationArrow)
        rightNavigationArrow.classList.remove("navigation-controls__arrow--active");
    }
  };
  window.addEventListener("keyup", keyupHandler);
  eventHandlers.push(["keyup", keyupHandler]);

  // Arrow clicks (from Chunk 1)
  if (leftNavigationArrow) {
    const leftClick = () => { virtualVelocity -= 0.8; };
    const leftDown = () => leftNavigationArrow.classList.add("navigation-controls__arrow--active");
    const leftUp = () => leftNavigationArrow.classList.remove("navigation-controls__arrow--active");
    const leftLeave = () => leftNavigationArrow.classList.remove("navigation-controls__arrow--active");
    leftNavigationArrow.addEventListener("click", leftClick);
    leftNavigationArrow.addEventListener("mousedown", leftDown);
    leftNavigationArrow.addEventListener("mouseup", leftUp);
    leftNavigationArrow.addEventListener("mouseleave", leftLeave);
    eventHandlers.push(["click", leftClick, leftNavigationArrow]);
    eventHandlers.push(["mousedown", leftDown, leftNavigationArrow]);
    eventHandlers.push(["mouseup", leftUp, leftNavigationArrow]);
    eventHandlers.push(["mouseleave", leftLeave, leftNavigationArrow]);
  }

  if (rightNavigationArrow) {
    const rightClick = () => { virtualVelocity += 0.8; };
    const rightDown = () => rightNavigationArrow.classList.add("navigation-controls__arrow--active");
    const rightUp = () => rightNavigationArrow.classList.remove("navigation-controls__arrow--active");
    const rightLeave = () => rightNavigationArrow.classList.remove("navigation-controls__arrow--active");
    rightNavigationArrow.addEventListener("click", rightClick);
    rightNavigationArrow.addEventListener("mousedown", rightDown);
    rightNavigationArrow.addEventListener("mouseup", rightUp);
    rightNavigationArrow.addEventListener("mouseleave", rightLeave);
    eventHandlers.push(["click", rightClick, rightNavigationArrow]);
    eventHandlers.push(["mousedown", rightDown, rightNavigationArrow]);
    eventHandlers.push(["mouseup", rightUp, rightNavigationArrow]);
    eventHandlers.push(["mouseleave", rightLeave, rightNavigationArrow]);
  }

  // Resize (existing)
  const resizeHandler = () => {
    if (!isSceneInitialized) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", resizeHandler);
  eventHandlers.push(["resize", resizeHandler]);

  // Initialize positions
  if (projectCards.length > 0) {
    targetPosition = currentScrollPosition = projectCards[0].userData.baseX;
  }
}

// Remove all event listeners registered in eventHandlers
function removeAllEventListeners() {
  eventHandlers.forEach(([type, handler, target]) => {
    (target || window).removeEventListener(type, handler);
  });
  eventHandlers = [];
}

/**
 * Update hover states using raycaster
 */
function updateHoverStates() {
  // Debug: Log when function is called
  console.log("🔄 updateHoverStates called, isDragging:", isDragging, "virtualVelocity:", virtualVelocity);
  
  // Throttle ray-casting to avoid CPU spikes
  const RAYCAST_INTERVAL = 3; // cast once every 3 RAF frames
  updateHoverStates._counter = (updateHoverStates._counter || 0) + 1;
  if (updateHoverStates._counter % RAYCAST_INTERVAL !== 0) return;

	if (!raycaster || projectCards.length === 0) return;

  if (
		!isSceneInitialized ||
		!isGalleryFullyLoaded ||
		allProjectCards.length === 0 ||
    !hasMouseMoved
  )
    return;

	// --- SIMPLIFIED: Only block hover during active dragging ---
	if (isDragging) {
		hoveredProjectIndex = -1;
		hoveredProjectMesh = null;
		if (hoverLabelContainer) hoverLabelContainer.style.display = "none";
		document.body.style.cursor = "grabbing";
		return;
	}
	// --- END SIMPLIFIED ---

  raycaster.setFromCamera(mouseVector, camera);
	const intersects = raycaster.intersectObjects(allProjectCards);

    if (intersects.length > 0) {
    // Debug logging
    console.log("🎯 Hover detected:", intersects[0].object.userData.projectInfo?.title);
    
    const intersected = intersects[0].object;
    const newIndex = intersected.userData.index;
		const meshChanged = intersected !== hoveredProjectMesh;

		if (newIndex !== hoveredProjectIndex || meshChanged) {
			const prevHoveredIndex = hoveredProjectIndex;
			const prevMesh = hoveredProjectMesh;

			hoveredProjectIndex = newIndex;
			hoveredProjectMesh = intersected;

			const data = projectData[hoveredProjectIndex] || {};

			if (hoverLabelTitle) hoverLabelTitle.textContent = data.title || "";

			if (hoverLabelCategory)
				hoverLabelCategory.textContent = data.category || "";

      // Clean up any existing animations
      if (hoverExitAnimation) {
        hoverExitAnimation.kill();
        hoverExitAnimation = null;
      }
      if (hoverAnimationTimeline) {
        hoverAnimationTimeline.kill();
        hoverAnimationTimeline = null;
      }

      // Masked animation (same as navigation) - create character-by-character effect
      if (hoverLabelTitle && hoverLabelCategory) {
        // Clean up any existing animations
        if (hoverAnimationTimeline) {
          hoverAnimationTimeline.kill();
          hoverAnimationTimeline = null;
        }
        if (hoverExitAnimation) {
          hoverExitAnimation.kill();
          hoverExitAnimation = null;
        }

        // Create character-by-character animation (same as navigation)
        const titleText = hoverLabelTitle.textContent;
        const categoryText = hoverLabelCategory.textContent;
        
        // Split title text into characters
        const titleChars = titleText.split('').map(char => {
          const span = document.createElement('span');
          span.textContent = char;
          span.style.display = 'inline-block';
          span.style.position = 'relative';
          // Preserve spaces by ensuring they have proper width
          if (char === ' ') {
            span.style.whiteSpace = 'pre';
            span.style.width = '0.2em';
          }
          return span;
        });
        
        // Split category text into characters
        const categoryChars = categoryText.split('').map(char => {
          const span = document.createElement('span');
          span.textContent = char;
          span.style.display = 'inline-block';
          span.style.position = 'relative';
          // Preserve spaces by ensuring they have proper width
          if (char === ' ') {
            span.style.whiteSpace = 'pre';
            span.style.width = '0.2em';
          }
          return span;
        });
        
        // Clear and populate the elements
        hoverLabelTitle.textContent = '';
        hoverLabelCategory.textContent = '';
        titleChars.forEach(char => hoverLabelTitle.appendChild(char));
        categoryChars.forEach(char => hoverLabelCategory.appendChild(char));

        // Set initial state (characters moved up, invisible due to clip container)
        gsap.set([...titleChars, ...categoryChars], {
          y: '-1.25em',
        });

        // Create timeline for masked animation (text animates up into view)
        hoverAnimationTimeline = gsap.timeline();
        hoverAnimationTimeline
          .to(titleChars, {
            y: '0em',
            duration: TEXT_ANIM.inDuration,
            ease: 'customEase',
            stagger: TEXT_ANIM.charStagger,
          })
          .to(categoryChars, {
            y: '0em',
            duration: TEXT_ANIM.inDuration,
            ease: 'customEase',
            stagger: TEXT_ANIM.charStagger,
          }, "<0.01"); // start 0.01 s after the title tween's START
      }
    }

		hoverLabelContainer.style.visibility = "visible";
    document.body.style.cursor = "pointer";

		// Add card-hover class to canvas for proper cursor
		const canvas = document.getElementById("project-slider");
		if (canvas) {
			canvas.classList.add("card-hover");
		}
  } else {
		hoveredProjectIndex = -1;
		hoveredProjectMesh = null;

		if (hoverExitAnimation) {
      // already animating out; ignore
    } else if (typeof gsap !== "undefined" && hoverLabelTitle && hoverLabelCategory) {
      // Get all character spans for masked exit animation
      const titleChars = Array.from(hoverLabelTitle.children);
      const categoryChars = Array.from(hoverLabelCategory.children);
      const allChars = [...titleChars, ...categoryChars];

      if (allChars.length > 0) {
        // Animate out using masked animation (text animates up out of view)
        hoverExitAnimation = gsap.to(allChars, {
          y: "-1.25em",
          duration: TEXT_ANIM.outDuration,
          ease: "customEase",
          stagger: TEXT_ANIM.charStagger,
          onComplete: () => {
            hoverExitAnimation = null;
            if (hoverLabelContainer) hoverLabelContainer.style.visibility = "hidden";
          },
        });
      } else {
        // Fallback if no characters found
        if (hoverLabelContainer) hoverLabelContainer.style.visibility = "hidden";
      }
    } else if (!hoverExitAnimation && hoverLabelContainer) {
      hoverLabelContainer.style.visibility = "hidden";
    }

    document.body.style.cursor = "default";

		// Remove card-hover class from canvas
		const canvas = document.getElementById("project-slider");
		if (canvas) {
			canvas.classList.remove("card-hover");
		}
  }
}

/**
 * startRenderLoop() – master RAF with performance optimizations
 */
// ============================================================================
// ENHANCED RENDER LOOP WITH MAGNETIC SNAPPING
// ============================================================================

function startRenderLoopEnhancedWithSnap() {
  function animate(currentTime) {
    frameCounter++;

    if (!isSceneInitialized || !isGalleryFullyLoaded || allProjectCards.length === 0) {
      if (isSceneInitialized && scene && camera && renderer) {
        renderer.render(scene, camera);
      }
      requestAnimationFrame(animate);
      return;
    }

    // Frame rate independence (from Chunk 1)
    if (lastFrameTime === 0) lastFrameTime = currentTime;
    const deltaTime = (currentTime - lastFrameTime) * 0.001;
    lastFrameTime = currentTime;
    const clampedDelta = Math.min(deltaTime, 1/30);

    // CORE PHYSICS (from Chunk 1)
    if (!isIntroAnimationActive) {
      virtualVelocity *= Math.pow(PHYSICS.speedDecay, clampedDelta * 60);
      targetPosition += virtualVelocity * clampedDelta * 60;
      
      // Track when scrolling stopped for hover resume
      if (Math.abs(virtualVelocity) < PHYSICS.stopThreshold) {
        virtualVelocity = 0;
        if (lastScrollStopTime === 0) {
          lastScrollStopTime = performance.now();
        }
      } else {
        lastScrollStopTime = 0;
      }
    }
    
    // NEW: MAGNETIC SNAPPING LOGIC
    const isMovingSlowly = Math.abs(virtualVelocity) < SNAP.threshold;
    const isNotDragging = !isDragging; // From Chunk 2
    const enoughTimeHasPassed = currentTime - lastSnapCheckTime > 100; // Don't check every frame
    
    if (SNAP.enabled && isMovingSlowly && isNotDragging && enoughTimeHasPassed) {
      lastSnapCheckTime = currentTime;
      
      // Find what we should snap to
      const nearestCard = findNearestSnapTarget();
      
      if (nearestCard && nearestCard !== snapTarget) {
        // New snap target found
        snapTarget = nearestCard;
        snapStartTime = currentTime;
        
        console.log(`🧲 Snapping to card: ${nearestCard.userData.projectInfo?.title || 'Unknown'}`);
      }
      
      // Apply snap force
      if (snapTarget) {
        const idealPosition = calculateSnapTargetPosition(snapTarget);
        const snapDistance = idealPosition - targetPosition;
        
        // Apply magnetic force (stronger when closer)
        const snapForce = snapDistance * SNAP.strength;
        targetPosition += snapForce * clampedDelta * 60;
        
        // If we're very close, consider snapping complete
        if (Math.abs(snapDistance) < 0.01) {
          targetPosition = idealPosition;
          snapTarget = null;
          virtualVelocity = 0;
        }
      }
    } else if (Math.abs(virtualVelocity) > SNAP.threshold * 2) {
      // Moving too fast, cancel any active snap
      snapTarget = null;
    }

    // Smooth lerp current position toward target (from Chunk 1)
    const lerpAmount = 1 - Math.pow(1 - PHYSICS.lerpFactor, clampedDelta * 60);
    currentScrollPosition += (targetPosition - currentScrollPosition) * lerpAmount;
    
    // Stop micro-movements
    if (Math.abs(virtualVelocity) < PHYSICS.stopThreshold && !snapTarget) {
      virtualVelocity = 0;
    }

    // Update scrollVelocity for existing shader effects
    scrollVelocity = virtualVelocity;

    // Performance monitoring (keep existing)
    const now = performance.now();
    if (now - lastPerformanceCheckTimestamp > 1000) {
      const targetFrameTime = 16.67;
      isPerformanceModeActive = (currentTime - lastFrameTime) > targetFrameTime * 1.5;
      lastPerformanceCheckTimestamp = now;
    }

    const elapsedTime = clock.getElapsedTime();

    // Handle infinite scroll (keep existing)
    if (!isHeavyAnimationActive) {
      handleInfiniteScroll();
    }

    // Update interactions (keep existing logic)
    const updateInterval = isPerformanceModeActive || isHeavyAnimationActive ? 3 : 1;
    const galleryMoving = Math.abs(virtualVelocity) > PHYSICS.stopThreshold || snapTarget !== null;
    
    if ((mouseMovedSinceLastFrame || galleryMoving) && frameCounter % updateInterval === 0) {
      updateHoverStates();
      mouseMovedSinceLastFrame = false;
    }

    // Update hover labels (keep existing)
    const hoverUpdateInterval = isPerformanceModeActive || isHeavyAnimationActive ? 4 : 2;
    if (hoveredProjectMesh && hoverLabelContainer && frameCounter % hoverUpdateInterval === 0) {
      updateHoverLabelPositionOptimized();
    }

    // Update all cards (keep existing)
    updateAllCards(elapsedTime, clampedDelta);

    // Render
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// Restore these constants, as they are used in the render loop and elsewhere
const UNIFORM_UPDATE_INTERVAL = 2; // Update uniforms every 2 frames during heavy animations
const HOVER_UPDATE_INTERVAL = 2; // Update hover labels every 2 frames

/**
 * Batched card updates for better performance with uniform change detection
 */
function updateAllCards(elapsedTime, deltaSec) {
  const transitionSpeed = 0.08;
  // Only apply greyscale effect if mouse has moved and we have a valid hover
	const isAnyCardHovered = hasMouseMoved && hoveredProjectIndex !== -1;

  // Skip expensive uniform updates during heavy animations based on frame interval
	const shouldUpdateUniforms =
		!isHeavyAnimationActive || frameCounter % UNIFORM_UPDATE_INTERVAL === 0;

  // Cache commonly used values
	const mouseNormalized = mousePosition.normalized;
  const motionBlurIntensity = Math.min(Math.abs(virtualVelocity) * 2.0, 1.0);

  // Add a helper to check if the gallery is moving
  function isGalleryScrolling() {
    // Only consider actively dragging as "scrolling" for hover purposes
    return isDragging;
  }

	for (let i = 0; i < allProjectCards.length; i++) {
		const project = allProjectCards[i];
    if (!project || !project.userData) continue;

    // Position updates only when not intro animating
    let screenX;
		if (!isIntroAnimationActive) {
			screenX =
				project.userData.baseX +
				project.userData.offset -
				currentScrollPosition;
      project.position.x = screenX;
    } else {
      // During intro the card is already animating; don't interfere with GSAP
      screenX = project.position.x;
    }

    // If the card is far away from the visible area, skip expensive state/uniform updates
		if (Math.abs(screenX) > offscreenThreshold) {
      continue; // next card
    }

    // Only allow hover if not scrolling
		const isHovered = !isGalleryScrolling() && project === hoveredProjectMesh;
    project.userData.hoverTarget = isHovered ? 1.0 : 0.0;
		project.userData.greyscaleTarget =
			isAnyCardHovered && !isHovered ? 1.0 : 0.0;
    project.userData.opacityTarget = isAnyCardHovered && !isHovered ? 0.2 : 1.0;

    // Simplified state transitions during heavy animations
		const frameIndependentTransition = isHeavyAnimationActive
			? 0.1 // Faster, simpler transitions during animations
			: 1 - Math.pow(0.92, deltaSec * 60);
    
		project.userData.hoverCurrent +=
			(project.userData.hoverTarget - project.userData.hoverCurrent) *
			frameIndependentTransition;
		project.userData.greyscaleCurrent +=
			(project.userData.greyscaleTarget - project.userData.greyscaleCurrent) *
			frameIndependentTransition;
		project.userData.opacityCurrent +=
			(project.userData.opacityTarget - project.userData.opacityCurrent) *
			frameIndependentTransition;

    // Optimized uniform updates with change detection
    if (shouldUpdateUniforms && project.material && project.material.uniforms) {
      const uniforms = project.material.uniforms;
      
      // Only update uniforms that have actually changed
			if (hasUniformChanged(project, "uTime", elapsedTime)) {
        uniforms.uTime.value = elapsedTime;
      }
      
			if (hasUniformChanged(project, "uHover", project.userData.hoverCurrent)) {
        uniforms.uHover.value = project.userData.hoverCurrent;
      }
      
			if (hasUniformChanged(project, "uMouse", mouseNormalized)) {
        uniforms.uMouse.value.set(mouseNormalized.x, mouseNormalized.y);
      }
      
			if (hasUniformChanged(project, "uVelocity", virtualVelocity)) {
        uniforms.uVelocity.value = virtualVelocity;
      }
      
			if (
				hasUniformChanged(
					project,
					"uGreyscale",
					project.userData.greyscaleCurrent,
				)
			) {
        uniforms.uGreyscale.value = project.userData.greyscaleCurrent;
      }
      
      // Motion blur based on velocity
			if (
				uniforms.uMotionBlur &&
				hasUniformChanged(project, "uMotionBlur", motionBlurIntensity)
			) {
        uniforms.uMotionBlur.value = motionBlurIntensity;
      }
      
			if (
				uniforms.uIntro.value <= 0.0 &&
				hasUniformChanged(project, "uOpacity", project.userData.opacityCurrent)
			) {
        uniforms.uOpacity.value = project.userData.opacityCurrent;
      }
    }
  }
}

/**
 * Commands the gallery to snap to the next card on the left.
 */
function navigateLeft() {
	if (allProjectCards.length === 0) return;
  scrollVelocity = 0;
	isKeyboardNavigationActive = true;
	const nearestCard = findNearestCard(targetScrollPosition);
  if (!nearestCard) return;
	targetScrollPosition =
    nearestCard.userData.baseX +
    nearestCard.userData.offset -
    CONFIG.cardSpacing;
}

/**
 * Commands the gallery to snap to the next card on the right.
 */
function navigateRight() {
	if (allProjectCards.length === 0) return;
  scrollVelocity = 0;
	isKeyboardNavigationActive = true;
	const nearestCard = findNearestCard(targetScrollPosition);
  if (!nearestCard) return;
	targetScrollPosition =
    nearestCard.userData.baseX +
    nearestCard.userData.offset +
    CONFIG.cardSpacing;
}

/**
 * Finds the card mesh that is currently closest to the center of the viewport.
 * @param {number} position - The scroll position to measure against (e.g., currentScrollPosition or targetScrollPosition).
 * @returns {THREE.Mesh | null} The nearest card mesh, or null if none are found.
 */
function findNearestCard(position) {
  let nearestCard = null;
  let nearestDist = Infinity;
	for (let i = 0; i < allProjectCards.length; i++) {
		const card = allProjectCards[i];
    if (!card || !card.userData) continue;
    // Calculate the card's current screen position relative to the center
    const screenX = card.userData.baseX + card.userData.offset - position;
    const dist = Math.abs(screenX);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestCard = card;
    }
  }
  return nearestCard;
}

/**
 * Handle infinite scroll by repositioning cards
 */
function handleInfiniteScroll() {
	if (!isGalleryFullyLoaded) return;

  const wrapSpan = CONFIG.totalWidth * 5; // total width across 5 sets (-2..2)
  const halfSpan = wrapSpan * 0.5;

	allProjectCards.forEach((card) => {
    if (!card || !card.userData) return;

    const userData = card.userData;
		let dx = userData.baseX + userData.offset - currentScrollPosition;

    if (dx > halfSpan) {
      userData.offset -= wrapSpan;
    } else if (dx < -halfSpan) {
      userData.offset += wrapSpan;
    }
  });
}

// Clamp helper for micro-jitter
function clampToEpsilon(val, target, epsilon = 0.0001) {
	return Math.abs(val - target) < epsilon ? target : val;
}

// Optimized hover label position update
let lastHoverLabelTransform = "";

function updateHoverLabelPositionOptimized() {
	if (!hoveredProjectMesh || !hoverLabelContainer) return;

	// Skip updates during heavy animations
	if (isHeavyAnimationActive && frameCounter % HOVER_UPDATE_INTERVAL !== 0)
		return;

	const halfW = CONFIG.cardWidth * 0.5;
	const halfH = CONFIG.cardHeight * 0.5;

	// Use pooled vectors for better memory management
	const bottomLeft = getPooledVector().set(-halfW, -halfH, 0);
	const bottomRight = getPooledVector().set(halfW, -halfH, 0);

	// Use matrix updates for better performance
	hoveredProjectMesh.updateMatrixWorld(true);
	bottomLeft.applyMatrix4(hoveredProjectMesh.matrixWorld);
	bottomRight.applyMatrix4(hoveredProjectMesh.matrixWorld);

	// Project to screen space efficiently
	bottomLeft.project(camera);
	bottomRight.project(camera);

	// Calculate screen coordinates
	const blX = (bottomLeft.x + 1) * 0.5 * window.innerWidth;
	const blY = (-bottomLeft.y + 1) * 0.5 * window.innerHeight;
	const brX = (bottomRight.x + 1) * 0.5 * window.innerWidth;

	const offset = 8;
	const onScreen = bottomRight.x > -1.2 && bottomLeft.x < 1.2;

	if (onScreen) {
		if (hoverLabelContainer.style.visibility === "hidden") {
			hoverLabelContainer.style.visibility = "visible";
			hoverLabelContainer._justActivated = true;
		}

		// Position the label to span the full width of the card
		// Left edge of title aligns with left edge of card
		// Right edge of category aligns with right edge of card
		const labelWidth = brX - blX;
		const transform = `translate3d(${blX.toFixed(3)}px, ${(blY + offset).toFixed(3)}px, 0)`;
		if (transform !== lastHoverLabelTransform) {
			hoverLabelContainer.style.transform = transform;
			hoverLabelContainer.style.width = `${labelWidth}px`;
			lastHoverLabelTransform = transform;
		}
	} else {
		hoverLabelContainer.style.visibility = "hidden";
	}

	// Return vectors to pool
	returnPooledVector(bottomLeft);
	returnPooledVector(bottomRight);
}

/**
 * playIntroAnimation()
 * --------------------
 * Animates the entrance of a specific group of cards (primary and their duplicates)
 * using GSAP. This function is called by `createGallery` after all initial assets
 * are loaded and ready.
 * @param {THREE.Mesh[]} animationGroup - The array of card meshes to animate.
 */
function playIntroAnimation(introAnimationGroup) {
	if (typeof gsap === "undefined" || !introAnimationGroup?.length) return;
	isIntroAnimationActive = true;

  // Calculate the rightmost off-screen start position for ALL cards
	const viewportHeightUnits =
		2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const viewportWidthUnits = viewportHeightUnits * camera.aspect;
	const offscreenStartX =
		viewportWidthUnits / 2 +
		CONFIG.cardWidth +
		CONFIG.cardSpacing * (projectCards.length - 1);
	const finalPositionOffset =
		projectCards.length > 0 ? projectCards[0].userData.baseX : 0;

  // Use the new soft settle custom ease
	const introEase =
		typeof CustomEase !== "undefined" ? "premiumSoftSettle" : "power2.out";
	const introDuration = 1.4; // Slightly reduced from 1.5s for better flow
	const introStagger = 0.08; // Reduced from 0.09s for tighter card grouping

	const tl = AnimationSystem.create("intro", {
    onComplete: () => {
			isIntroAnimationActive = false;
			isGalleryFullyLoaded = true;
			
			// SYNC PHYSICS SYSTEM: Ensure physics positions match the final intro positions
			if (projectCards.length > 0) {
				// Get the final position from the first card (which should be centered)
				const finalCard = projectCards[0];
				const finalPosition = finalCard.userData.baseX;
				
				// Reset physics system to match intro completion
				currentScrollPosition = finalPosition;
				targetPosition = finalPosition;
				virtualVelocity = 0;
				scrollVelocity = 0;
				
				console.log("🎯 Physics system synced to intro completion position:", finalPosition);
			}
			
			allProjectCards.forEach((card) => {
        if (card.material?.uniforms?.uOpacity) {
          card.material.uniforms.uOpacity.value = 1.0;
        }
      });
		},
  });

  introAnimationGroup.forEach((mesh, i) => {
		// Set initial position - start cards in a more visible position for debugging
		const startX = offscreenStartX;
		const targetX =
			mesh.userData.baseX + mesh.userData.offset - finalPositionOffset;

    gsap.set(mesh.position, {
			x: startX,
      y: 0.0,
			overwrite: true,
    });
    gsap.set(mesh.scale, {
      x: 1.08,
      y: 1.08,
      z: 1.08,
			overwrite: true,
    });
    if (mesh.material?.uniforms?.uOpacity) {
      mesh.material.uniforms.uOpacity.value = 0.0;
    }
		const cardStart = 0.15 + i * introStagger; // Reduced initial delay from 0.18s
		tl.to(
			mesh.position,
			{
				x: targetX,
      duration: introDuration,
      ease: introEase,
				overwrite: true,
			},
			cardStart,
		);
		tl.to(
			mesh.scale,
			{
      x: 1.0,
      y: 1.0,
      z: 1.0,
      duration: introDuration,
      ease: introEase,
				overwrite: true,
			},
			cardStart,
		);
    if (mesh.material?.uniforms?.uOpacity) {
			tl.to(
				mesh.material.uniforms.uOpacity,
				{
        value: 1.0,
        duration: 1.0,
					ease: "power2.out",
					overwrite: true,
				},
				cardStart + 0.12,
			);
    }
  });
  return tl;
}

// ============================================================================
// SNAP TUNING HELPERS (for easy adjustment)
// ============================================================================

// Call these from browser console to fine-tune the feel:
window.adjustSnapStrength = (value) => {
  SNAP.strength = value;
  console.log(`🧲 Snap strength set to: ${value} (try 0.05-0.15)`);
};

window.adjustSnapThreshold = (value) => {
  SNAP.threshold = value;
  console.log(`🎯 Snap threshold set to: ${value} (try 0.1-0.3)`);
};

window.toggleSnap = () => {
  SNAP.enabled = !SNAP.enabled;
  console.log(`🧲 Magnetic snap: ${SNAP.enabled ? 'ON' : 'OFF'}`);
  if (!SNAP.enabled) snapTarget = null;
};

// ============================================================================
// INTEGRATION INSTRUCTIONS
// ============================================================================

// STEP 1: In your startGallery() function, replace:
//   startRenderLoopEnhanced();
// with:
//   startRenderLoopEnhancedWithSnap();

// STEP 2: Test the magnetic behavior:
//   - Scroll/drag at normal speed - should move freely
//   - Let it slow down naturally - should "click" to nearest card
//   - Try gentle nudges - should snap back to centered position
//   - Fast flicks should ignore snapping until they slow down

// STEP 3: Fine-tune from browser console:
//   adjustSnapStrength(0.1)  // Make snapping more/less aggressive
//   adjustSnapThreshold(0.2) // Change when snapping kicks in
//   toggleSnap()            // Turn off/on to compare

console.log("✅ Chunk 1 loaded: Core Physics Foundation");
console.log("✅ Chunk 2 loaded: Touch/Drag Support");
console.log("✅ Chunk 3 loaded: Magnetic Snapping");
console.log("🎯 Expected feel: Smooth wheel input with natural inertia decay");
console.log("🎯 Expected feel: Smooth mouse drag and touch swipe with momentum");
console.log("🧲 Expected feel: Cards gently 'click' into center when motion settles");
console.log("📝 Next: Test wheel scrolling - it should glide and slow down smoothly");
console.log("📱 Test on mobile: Swipe gestures should feel natural with inertia");
console.log("🖱️  Test on desktop: Click-drag should give smooth momentum on release");
console.log("🎯 Test: Scroll then let go - should settle on nearest card");
console.log("⚙️  Tune with: adjustSnapStrength(0.1), adjustSnapThreshold(0.2), toggleSnap()");
console.log("🔧 Fixed: Intro animation to physics system transition - no more jumps!");
console.log("🔧 Fixed: Hover states now work properly after drag operations!");
console.log("🔧 Fixed: Drag direction inverted for natural scrolling behavior!"); 