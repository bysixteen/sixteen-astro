// Wait for GSAP and Three.js to be available
function waitForLibraries() {
  return new Promise((resolve) => {
    const checkLibraries = () => {
      if (typeof gsap !== 'undefined' && typeof THREE !== 'undefined') {
        console.log('GSAP and Three.js loaded successfully');
        
        // Register GSAP plugins if available
        if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
        if (typeof CustomEase !== 'undefined') gsap.registerPlugin(CustomEase);
        if (typeof SplitText !== 'undefined') gsap.registerPlugin(SplitText);
        
        resolve();
      } else {
        console.log('Waiting for GSAP and Three.js to load...');
        setTimeout(checkLibraries, 100);
      }
    };
    checkLibraries();
  });
}

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
let titleTextSplit = null;
let categoryTextSplit = null;
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

	hoverLabelTitle = document.createElement("span");
	hoverLabelTitle.className = "project-hover-label__title";

	hoverLabelCategory = document.createElement("span");
	hoverLabelCategory.className = "project-hover-label__category";

	hoverLabelContainer.appendChild(hoverLabelTitle);
	hoverLabelContainer.appendChild(hoverLabelCategory);
	document.body.appendChild(hoverLabelContainer);

  // Performance: quickSetter for GPU-accelerated moves
	hoverLabelContainer._lastLeft = 0; // was: _lastL
	hoverLabelContainer._lastTop = 0; // was: _lastT
	hoverLabelContainer._justActivated = false;
	hoverLabelContainer.style.left = "0px";
	hoverLabelContainer.style.top = "0px";
}

// ============================================================================
// ANIMATION SYSTEM CONFIGURATION
// ============================================================================

// Create custom easing curve like CodePen
if (typeof CustomEase !== "undefined") {
	CustomEase.create("customEase", "0.65, 0.05, 0, 1");
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
  desiredPixelWidth: 640, // Desired on-screen width of each card in pixels (480×320)
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
// ---------------------------------------------------------------------------
const TEXT_ANIM = {
  inDuration: 0.6, // Animation duration for text appearing (in seconds). Higher = slower.
  outDuration: 0.4, // Animation duration for text disappearing (in seconds). Higher = slower.
  charStagger: 0.01, // Delay between each letter animating. Higher = more of a 'cascade' effect.
  categoryStagger: 0.005, // Stagger for the category text, can be different for effect.
};

// Project data storage
let projectData = [];
// Cache for already-loaded textures to avoid reloading duplicates
const textureCache = new Map();

// Loader progress globals
let totalTexturesToLoad = 0;

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
  
  console.log(`Found ${projectItems.length} project items in DOM`);
  
  if (projectItems.length === 0) {
    console.error('No project items found in DOM!');
    console.log('Project data container:', document.getElementById('project-data'));
    console.log('Project data container innerHTML:', document.getElementById('project-data')?.innerHTML);
  }
  
  projectData = Array.from(projectItems).map((item, index) => {
    const data = {
      id: index,
      title: item.dataset.title,
      category: item.dataset.category,
      imageUrl: item.dataset.image,
      url: item.dataset.url,
    };
    
    console.log(`Project ${index}:`, data);
    return data;
  });
  
  console.log(`Extracted ${projectData.length} projects for gallery`);
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
    console.error('Canvas element not found!');
    const canvasStatusElement = document.getElementById('canvas-status');
    if (canvasStatusElement) {
      canvasStatusElement.textContent = 'Canvas not found';
    }
    return;
  }
  
  console.log('Canvas found, initializing Three.js scene...');
  if (canvasStatusElement) {
    canvasStatusElement.textContent = 'Initializing...';
  }
  
  // Scene setup
  scene = new THREE.Scene();
	// scene.background = new THREE.Color(0x0a0a0a); // Add background color for visibility

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

  CONFIG.cardWidth = CONFIG.desiredPixelWidth * unitsPerPixel;
  CONFIG.cardHeight = CONFIG.cardWidth / 1.5;
  // Maintain 3:2 aspect ratio (1.5)
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
  
  console.log('Three.js scene initialized successfully');
  const canvasStatusElement = document.getElementById('canvas-status');
  if (canvasStatusElement) {
    canvasStatusElement.textContent = 'Ready';
  }
}

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
		// Error creating gallery
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

				// Debug: Log the URL being loaded
				console.log(`Loading texture: ${url} (attempt ${retryCount + 1})`);

				textureLoader.load(
					url,
					(tx) => {
						console.log(`✅ Successfully loaded texture: ${url}`);
						textureCache.set(projectInfo.imageUrl, tx);
						onTextureReady(tx);
					},
					(progress) => {},
					(error) => {
						console.log(`❌ Failed to load texture: ${url}`, error);
						if (retryCount < maxRetries) {
							setTimeout(
								() => {
									loadTextureWithRetry(url, retryCount + 1);
								},
								1000 * (retryCount + 1),
							); // Exponential backoff
						} else {
							console.log(`💀 Giving up on texture: ${url}`);
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

// Animation is now handled entirely in createGallery()

/**
 * Setup controls for scrolling & interactions
 */
function setupControls() {
  // Get Keyboard UI elements
	leftNavigationArrow = document.getElementById("key-arrow-left");
	rightNavigationArrow = document.getElementById("key-arrow-right");

  // Mouse tracking for effects
  const mouseMoveHandler = (event) => {
    if (!hasMouseMoved) hasMouseMoved = true;
		mousePosition.x = event.clientX;
		mousePosition.y = event.clientY;
		mousePosition.normalized.x = (event.clientX / window.innerWidth) * 2 - 1;
		mousePosition.normalized.y = -(event.clientY / window.innerHeight) * 2 + 1;
    // Update raycaster
		mouseVector.x = mousePosition.normalized.x;
		mouseVector.y = mousePosition.normalized.y;
    mouseMovedSinceLastFrame = true;
  };
  window.addEventListener("mousemove", mouseMoveHandler);
  eventHandlers.push(["mousemove", mouseMoveHandler]);

  // Re-enable wheel scrolling for desktop
  const wheelHandler = (event) => {
    event.preventDefault();
    // Dynamic scroll: accelerate for faster wheel events
    const base = CONFIG.scrollSensitivity;
    const acceleration = 0.01; // tweak for how much extra per fast scroll
    const dynamicFactor = 1 + acceleration * Math.abs(event.deltaY);
    const delta = event.deltaY * base * dynamicFactor;
    scrollVelocity += delta;
    scrollVelocity = Math.max(
      -CONFIG.maxVelocity,
      Math.min(CONFIG.maxVelocity, scrollVelocity),
    );
  };
  window.addEventListener("wheel", wheelHandler, { passive: false });
  eventHandlers.push(["wheel", wheelHandler]);

  // Click handling
  const clickHandler = (event) => {
    updateHoverStates();
    // Find clicked project
    const intersects = raycaster.intersectObjects(allProjectCards);
    if (intersects.length > 0) {
      const project = intersects[0].object;
      const url = project.userData.projectInfo.url;
      if (url) {
        // Dispatch custom event for animated page transition
        window.dispatchEvent(new CustomEvent("project:navigate", { detail: { url } }));
        return;
      }
    }
  };
  window.addEventListener("click", clickHandler);
  eventHandlers.push(["click", clickHandler]);

  // Keyboard controls
  const keydownHandler = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateLeft();
			if (leftNavigationArrow)
				leftNavigationArrow.classList.add("navigation-controls__arrow--active");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateRight();
			if (rightNavigationArrow)
				rightNavigationArrow.classList.add(
					"navigation-controls__arrow--active",
				);
    }
  };
  window.addEventListener("keydown", keydownHandler);
  eventHandlers.push(["keydown", keydownHandler]);

  const keyupHandler = (event) => {
    if (event.key === "ArrowLeft") {
			if (leftNavigationArrow)
				leftNavigationArrow.classList.remove(
					"navigation-controls__arrow--active",
				);
    } else if (event.key === "ArrowRight") {
			if (rightNavigationArrow)
				rightNavigationArrow.classList.remove(
					"navigation-controls__arrow--active",
				);
    }
  };
  window.addEventListener("keyup", keyupHandler);
  eventHandlers.push(["keyup", keyupHandler]);

  // Click controls for arrows
	if (leftNavigationArrow) {
		const leftClick = () => navigateLeft();
		const leftDown = () => leftNavigationArrow.classList.add("navigation-controls__arrow--active");
		const leftUp = () => leftNavigationArrow.classList.remove("navigation-controls__arrow--active");
		const leftLeave = () => leftNavigationArrow.classList.remove("navigation-controls__arrow--active");
		leftNavigationArrow.addEventListener("click", leftClick);
		eventHandlers.push(["click", leftClick, leftNavigationArrow]);
		leftNavigationArrow.addEventListener("mousedown", leftDown);
		eventHandlers.push(["mousedown", leftDown, leftNavigationArrow]);
		leftNavigationArrow.addEventListener("mouseup", leftUp);
		eventHandlers.push(["mouseup", leftUp, leftNavigationArrow]);
		leftNavigationArrow.addEventListener("mouseleave", leftLeave);
		eventHandlers.push(["mouseleave", leftLeave, leftNavigationArrow]);
  }

	if (rightNavigationArrow) {
		const rightClick = () => navigateRight();
		const rightDown = () => rightNavigationArrow.classList.add("navigation-controls__arrow--active");
		const rightUp = () => rightNavigationArrow.classList.remove("navigation-controls__arrow--active");
		const rightLeave = () => rightNavigationArrow.classList.remove("navigation-controls__arrow--active");
		rightNavigationArrow.addEventListener("click", rightClick);
		eventHandlers.push(["click", rightClick, rightNavigationArrow]);
		rightNavigationArrow.addEventListener("mousedown", rightDown);
		eventHandlers.push(["mousedown", rightDown, rightNavigationArrow]);
		rightNavigationArrow.addEventListener("mouseup", rightUp);
		eventHandlers.push(["mouseup", rightUp, rightNavigationArrow]);
		rightNavigationArrow.addEventListener("mouseleave", rightLeave);
		eventHandlers.push(["mouseleave", rightLeave, rightNavigationArrow]);
  }

  // Resize handling
  const resizeHandler = () => {
		if (!isSceneInitialized) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", resizeHandler);
  eventHandlers.push(["resize", resizeHandler]);
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

	// --- NEW: Remove hover state if gallery is scrolling ---
	if (Math.abs(scrollVelocity) > 0.0001) {
		hoveredProjectIndex = -1;
		hoveredProjectMesh = null;
		if (hoverLabelContainer) hoverLabelContainer.style.display = "none";
		document.body.style.cursor = "default";
		return;
	}
	// --- END NEW ---

  raycaster.setFromCamera(mouseVector, camera);
	const intersects = raycaster.intersectObjects(allProjectCards);

  if (intersects.length > 0) {
    const intersected = intersects[0].object;
    const newIndex = intersected.userData.index;
		const meshChanged = intersected !== hoveredProjectMesh;

		if (newIndex !== hoveredProjectIndex || meshChanged) {
			const prevHoveredIndex = hoveredProjectIndex;
			const prevMesh = hoveredProjectMesh;

			hoveredProjectIndex = newIndex;
			hoveredProjectMesh = intersected;

			const data = projectData[hoveredProjectIndex] || {};
      const expectedTitle = intersected.userData.projectInfo?.title;
      const retrievedTitle = data.title;

			if (hoverLabelTitle) hoverLabelTitle.textContent = data.title || "";

			if (hoverLabelCategory)
				hoverLabelCategory.textContent = data.category || "";

      // SplitText animation with forced DOM update and micro-delay
      if (typeof SplitText !== "undefined") {
        // AGGRESSIVE CLEANUP: Kill everything immediately for clean state
				if (hoverExitAnimation) {
					hoverExitAnimation.kill();
					hoverExitAnimation = null;
        }
				if (hoverAnimationTimeline) {
					hoverAnimationTimeline.kill();
					hoverAnimationTimeline = null;
        }
				if (titleTextSplit) {
					titleTextSplit.revert();
					titleTextSplit = null;
        }
				if (categoryTextSplit) {
					categoryTextSplit.revert();
					categoryTextSplit = null;
        }

        // Ensure clean text state before split
				if (hoverLabelTitle) hoverLabelTitle.style.opacity = "1";
				if (hoverLabelCategory) hoverLabelCategory.style.opacity = "1";

        // Validate text content before creating splits
        const expectedTitle = data.title || "";
        const expectedCategory = data.category || "";
				const actualTitle = hoverLabelTitle.textContent;
				const actualCategory = hoverLabelCategory.textContent;

        // Force text update if mismatch detected
        if (actualTitle !== expectedTitle) {
					hoverLabelTitle.textContent = expectedTitle;
        }
        if (actualCategory !== expectedCategory) {
					hoverLabelCategory.textContent = expectedCategory;
        }

				titleTextSplit = new SplitText(hoverLabelTitle, {
					type: "chars",
				});
				categoryTextSplit = new SplitText(hoverLabelCategory, {
					type: "chars",
				});

				hoverAnimationTimeline = gsap.timeline();
				hoverAnimationTimeline
					.from(titleTextSplit.chars, {
            yPercent: -125,
            opacity: 0,
            duration: TEXT_ANIM.inDuration,
            ease: "power2.out",
            stagger: TEXT_ANIM.charStagger,
          })
          .from(
						categoryTextSplit.chars,
            {
              yPercent: -125,
              opacity: 0,
              duration: TEXT_ANIM.inDuration,
              ease: "power2.out",
              stagger: TEXT_ANIM.categoryStagger,
            },
            "<0.01",
					); // start 0.01 s after the title tween's START
      }
    }

		hoverLabelContainer.style.display = "flex";
		hoverLabelContainer.style.opacity = "1";
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
    } else if (
      typeof SplitText !== "undefined" &&
			(titleTextSplit || categoryTextSplit)
    ) {
      // Animate out SplitText characters
			const tSplit = titleTextSplit;
			const cSplit = categoryTextSplit;

      // Immediately null out globals to prevent conflicts
			titleTextSplit = null;
			categoryTextSplit = null;

      if (tSplit || cSplit) {
        const allChars = [
          ...(tSplit ? tSplit.chars : []),
          ...(cSplit ? cSplit.chars : []),
        ];

				hoverExitAnimation = gsap.to(allChars, {
          yPercent: -125,
          opacity: 0,
          duration: TEXT_ANIM.outDuration,
          ease: "power2.in",
          stagger: TEXT_ANIM.charStagger,
          onComplete: () => {
						hoverExitAnimation = null;
            if (tSplit) tSplit.revert();
            if (cSplit) cSplit.revert();
						if (hoverLabelContainer) hoverLabelContainer.style.display = "none";
          },
        });
      }
    } else if (typeof gsap !== "undefined") {
      // Fallback simple fade out
			hoverExitAnimation = gsap.to([hoverLabelTitle, hoverLabelCategory], {
        opacity: 0,
        duration: 0.15,
        ease: "power2.in",
        onComplete: () => {
					hoverExitAnimation = null;
					if (hoverLabelContainer) hoverLabelContainer.style.display = "none";
        },
      });
		} else if (!hoverExitAnimation && hoverLabelContainer) {
			hoverLabelContainer.style.display = "none";
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
 * Enhanced hover animation system with performance optimizations
 */
function updateHoverState(mesh, isHovered) {
  if (!mesh || !isHovered) return;
  
  // Skip if we're in heavy animation mode
	if (
		isHeavyAnimationActive &&
		AnimationSystem.activeCount >= ANIMATION_CONFIG.performance.heavyThreshold
	) {
    return;
  }

  const hoverTimeline = gsap.timeline({
    defaults: {
			duration: ANIMATION_CONFIG.hover.scale.duration,
			ease: ANIMATION_CONFIG.hover.scale.ease,
		},
  });

  // Use composite properties for better performance
  hoverTimeline
    .to(mesh.scale, {
			x: isHovered ? ANIMATION_CONFIG.hover.scale.value : 1,
			y: isHovered ? ANIMATION_CONFIG.hover.scale.value : 1,
			z: isHovered ? ANIMATION_CONFIG.hover.scale.value : 1,
			overwrite: true,
    })
		.to(
			mesh.material.uniforms.uHover,
			{
      value: isHovered ? 1 : 0,
				duration: ANIMATION_CONFIG.hover.scale.duration,
				ease: ANIMATION_CONFIG.hover.scale.ease,
				overwrite: true,
			},
			0,
		);

  return hoverTimeline;
}

/**
 * Optimized hover label positioning with GPU acceleration and vector pooling
 */
function updateHoverLabelPosition() {
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
		if (hoverLabelContainer.style.display === "none") {
			hoverLabelContainer.style.display = "flex";
			hoverLabelContainer._justActivated = true;
    }

    // Use floating-point precision for transform
		hoverLabelContainer.style.transform = `translate3d(${blX.toFixed(3)}px, ${(blY + offset).toFixed(3)}px, 0)`;
		hoverLabelContainer.style.width = `${(brX - blX).toFixed(3)}px`;
  } else {
		hoverLabelContainer.style.display = "none";
  }

  // Return vectors to pool
  returnPooledVector(bottomLeft);
  returnPooledVector(bottomRight);
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

// Performance optimizations - cache frequently used values (variables now declared at top)

/**
 * startRenderLoop() – master RAF with performance optimizations
 */
function startRenderLoop() {
  function animate() {
    frameCounter++;

    // Render as soon as scene is initialised and primary assets are ready – no mouse-movement required
		if (
			!isSceneInitialized ||
			!isGalleryFullyLoaded ||
			allProjectCards.length === 0
		) {
			// Still render the scene even if gallery isn't fully loaded to show background
			if (isSceneInitialized && scene && camera && renderer) {
				renderer.render(scene, camera);
			}
    return;
		}

    const now = performance.now();
		if (lastFrameTimestamp === 0) {
			lastFrameTimestamp = now;
    }
		const deltaTime = now - lastFrameTimestamp;
		lastFrameTimestamp = now;
    const deltaSec = deltaTime * 0.001;

    // Performance monitoring and adaptive frame skipping
		if (now - lastPerformanceCheckTimestamp > 1000) {
			// Check every second
      const targetFrameTime = 16.67; // 60fps target
      isPerformanceModeActive = deltaTime > targetFrameTime * 1.5; // If frame time > 25ms
			lastPerformanceCheckTimestamp = now;
    }

    const elapsedTime = clock.getElapsedTime();

    // Prevent extreme velocities
		const maxVelocity = CONFIG.maxVelocity * (isGalleryFullyLoaded ? 1 : 0.5);
		scrollVelocity = Math.max(
			-maxVelocity,
			Math.min(maxVelocity, scrollVelocity),
		);

    // Update positions with interpolation
		targetScrollPosition += scrollVelocity * deltaSec * 60;

    // Smooth friction application
    scrollVelocity *= Math.pow(CONFIG.friction, deltaSec * 60);

    // Check if a keyboard-initiated snap has completed
		if (
			isKeyboardNavigationActive &&
			Math.abs(currentScrollPosition - targetScrollPosition) < 0.001
		) {
			isKeyboardNavigationActive = false;
			currentScrollPosition = targetScrollPosition; // Final snap for precision
    }

    // Gentler stopping & snapping (for mouse/touch scroll)
		if (Math.abs(scrollVelocity) < 0.0001 && !isKeyboardNavigationActive) {
      scrollVelocity = 0;
			const nearestCard = findNearestCard(currentScrollPosition);
      if (nearestCard) {
				targetScrollPosition =
					nearestCard.userData.baseX + nearestCard.userData.offset;
      }
    }

    // Handle infinite scroll - skip during heavy animations
		if (!isHeavyAnimationActive) {
      handleInfiniteScroll();
    }

		// Smooth currentScrollPosition with damp
    // 5: Damping coefficient for MathUtils.damp; higher = snappier, lower = floatier. Tuned for premium feel.
		currentScrollPosition = THREE.MathUtils.damp(
			currentScrollPosition,
			targetScrollPosition,
			5,
			deltaSec,
		);
		// Clamp to avoid sub-pixel drift
		currentScrollPosition = clampToEpsilon(
			currentScrollPosition,
			targetScrollPosition,
		);

    // Throttle expensive operations based on performance mode
		const updateInterval =
			isPerformanceModeActive || isHeavyAnimationActive ? 3 : 1;
		const galleryMoving =
			Math.abs(scrollVelocity) > 0.0001 || isKeyboardNavigationActive;
    
		if (
			(mouseMovedSinceLastFrame || galleryMoving) &&
			frameCounter % updateInterval === 0
		) {
      updateHoverStates();
      mouseMovedSinceLastFrame = false;
    }

    // Update hover labels with adaptive frequency
		const hoverUpdateInterval =
			isPerformanceModeActive || isHeavyAnimationActive
				? 4
				: HOVER_UPDATE_INTERVAL;
		if (
			hoveredProjectMesh &&
			hoverLabelContainer &&
			frameCounter % hoverUpdateInterval === 0
		) {
			// Only update DOM if transform changed
			updateHoverLabelPositionOptimized();
    }

    // Batch all card updates for better performance
    updateAllCards(elapsedTime, deltaSec);

		// Force render with clear color
		// renderer.setClearColor(0x0a0a0a, 1);
    renderer.render(scene, camera);
  }

	// Use WebGLRenderer's internal timing – automatically adapts to refresh-rate and pauses in background tabs
  renderer.setAnimationLoop(animate);
}

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
  const motionBlurIntensity = Math.min(Math.abs(scrollVelocity) * 2.0, 1.0);

  // Add a helper to check if the gallery is moving
  function isGalleryScrolling() {
    // Consider the gallery moving if velocity is above a small threshold
    // 0.0001: below this, motion is visually imperceptible and considered "at rest"
    return Math.abs(scrollVelocity) > 0.0001;
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
      // During intro the card is already animating; estimate position quickly
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
      
			if (hasUniformChanged(project, "uVelocity", scrollVelocity)) {
        uniforms.uVelocity.value = scrollVelocity;
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

// Performance cleanup function
function performanceCleanup() {
  // Clear uniform cache
  uniformCache.clear();
  
  // Clear vector pool
  vectorPool.length = 0;
  
  // Reset performance flags
  isPerformanceModeActive = false;
	isHeavyAnimationActive = false;
  frameCounter = 0;
}

// Add performance cleanup to window unload
window.addEventListener("beforeunload", performanceCleanup);

// Add page visibility and focus event handlers for proper reinitialization
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
		// Page is hidden, pause animations but don't destroy everything
		if (isSceneInitialized && renderer) {
			// Pause the render loop
			renderer.setAnimationLoop(null);
			// Kill GSAP animations but keep scene intact
			AnimationSystem.killAll();
		}
  } else {
		// Page is visible again, restart render loop and refresh textures if needed
    setTimeout(() => {
			if (isSceneInitialized && renderer) {
				// Check if textures need to be refreshed (WebGL context might have been lost)
				if (allProjectCards.length > 0) {
					allProjectCards.forEach((card) => {
						if (
							card.material &&
							card.material.uniforms &&
							card.material.uniforms.uTexture
						) {
							const texture = card.material.uniforms.uTexture.value;
							if (texture && texture.image) {
								texture.needsUpdate = true;
							}
						}
					});
				}

				startRenderLoop();
			}
		}, 100);
	}
});

// Handle page focus events - only restart render loop, don't reinitialize
window.addEventListener("focus", () => {
	if (isSceneInitialized && renderer) {
		setTimeout(() => {
			startRenderLoop();
		}, 100);
	}
});

// Clamp helper for micro-jitter
function clampToEpsilon(val, target, epsilon = 0.0001) {
	return Math.abs(val - target) < epsilon ? target : val;
}

// Set uniform only if changed by epsilon
function setUniformIfChanged(uniform, value, epsilon = 0.0001) {
	if (typeof uniform.value === "number") {
		if (Math.abs(uniform.value - value) > epsilon) {
			uniform.value = value;
		}
	} else if (uniform.value && typeof uniform.value.set === "function") {
		if (
			Math.abs(uniform.value.x - value.x) > epsilon ||
			Math.abs(uniform.value.y - value.y) > epsilon
		) {
			uniform.value.set(value.x, value.y);
		}
	}
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
		if (hoverLabelContainer.style.display === "none") {
			hoverLabelContainer.style.display = "flex";
			hoverLabelContainer._justActivated = true;
		}

		// Use floating-point precision for transform
		const transform = `translate3d(${blX.toFixed(3)}px, ${(blY + offset).toFixed(3)}px, 0)`;
		if (transform !== lastHoverLabelTransform) {
			hoverLabelContainer.style.transform = transform;
			lastHoverLabelTransform = transform;
		}
		hoverLabelContainer.style.width = `${(brX - blX).toFixed(3)}px`;
	} else {
		hoverLabelContainer.style.display = "none";
	}

	// Return vectors to pool
	returnPooledVector(bottomLeft);
	returnPooledVector(bottomRight);
}

// Restore these constants, as they are used in the render loop and elsewhere
const UNIFORM_UPDATE_INTERVAL = 2; // Update uniforms every 2 frames during heavy animations
const HOVER_UPDATE_INTERVAL = 2; // Update hover labels every 2 frames

// Initialize gallery on 'page:transition:end' or DOMContentLoaded as fallback
async function startGallery() {
  if (window.portfolioGalleryInitialized) return;
  
  // Update status
  const galleryStatusElement = document.getElementById('gallery-status');
  if (galleryStatusElement) {
    galleryStatusElement.textContent = 'Initializing...';
  }
  
  console.log('Starting gallery initialization...');
  
  // Wait for libraries to be loaded
  await waitForLibraries();
  
  // Check if project data is available
  const projectItems = document.querySelectorAll("#project-data .project-item");
  if (projectItems.length === 0) {
    console.log('No project data found, waiting...');
    if (galleryStatusElement) {
      galleryStatusElement.textContent = 'Waiting for data...';
    }
    // Retry after a short delay
    setTimeout(() => {
      if (!window.portfolioGalleryInitialized) {
        startGallery().catch(console.error);
      }
    }, 500);
    return;
  }
  
  // Also check global flag
  if (!window.projectDataReady) {
    console.log('Project data not ready yet, waiting...');
    if (galleryStatusElement) {
      galleryStatusElement.textContent = 'Waiting for data flag...';
    }
    // Retry after a short delay
    setTimeout(() => {
      if (!window.portfolioGalleryInitialized) {
        startGallery().catch(console.error);
      }
    }, 500);
    return;
  }
  
  console.log(`Found ${projectItems.length} project items, proceeding with initialization`);
  
  extractProjectData();
  initThreeScene();
  createGallery();
  setupControls();
  startRenderLoop();
  createHoverTitle();
  window.portfolioGalleryInitialized = true;
  
  // Update status
  if (galleryStatusElement) {
    galleryStatusElement.textContent = 'Running';
  }
  console.log('Gallery initialization complete');
}

// Make startGallery globally available
window.startGallery = startGallery;

// Listen for page transition end (for page transitions)
window.addEventListener('page:transition:end', () => {
  console.log('Page transition end event fired');
  startGallery().catch(console.error);
});

// Listen for custom project data ready event
window.addEventListener('projectData:ready', (event) => {
  console.log('Project data ready event fired', event.detail);
  startGallery().catch(console.error);
});

// Fallback: also initialize on DOMContentLoaded if not already initialized
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired');
  // Wait a bit to ensure data is loaded, then try to initialize
  setTimeout(() => {
    if (!window.portfolioGalleryInitialized) {
      console.log('Initializing gallery from DOMContentLoaded fallback');
      startGallery().catch(console.error);
    }
  }, 1000);
});

// Debug: Log when the script loads
console.log('Gallery script loaded and event listeners set up');