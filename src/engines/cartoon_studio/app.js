import * as THREE from './vendor/three.module.js';
import { BVHLoader } from './vendor/BVHLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { exportManimQualityVideo } from './manim_exporter.js?v=105';
import { CinematicDirector } from './cinematic_director.js?v=105';

// Core variables
let scene, camera, renderer, controls, mixer, clock;
let currentSkeleton, skeletonHelper, gridHelper, boneGroup;
let cartoonCharacterGroup;
let baseWalkBvh = null;
let templateMoCapSkeleton = null;
let teacherMixer = null, teacherWalkAction = null;

// UI Elements
let playPauseBtn, resetBtn, statusText, animSelect, speedSlider, speedVal;
let inPlaceToggle, skeletonToggle, gridToggle, styleSelect;
let btnSide, btnFront, btnIso;

// Animation state
let clips = {};
let currentAction = null;

// Camera view presets
const CAMERA_PRESETS = {
    side: { pos: new THREE.Vector3(38, -4, 0), target: new THREE.Vector3(0, -4, 0) },
    front: { pos: new THREE.Vector3(0, -4, 38), target: new THREE.Vector3(0, -4, 0) },
    iso: { pos: new THREE.Vector3(26, 6, 28), target: new THREE.Vector3(0, -4, 0) },
    low: { pos: new THREE.Vector3(28, -12, 22), target: new THREE.Vector3(0, 2, 0) },
    top: { pos: new THREE.Vector3(0, 48, 8), target: new THREE.Vector3(0, -4, 0) }
};

let ambientLight = null;
let keyLight = null;
let fillLight = null;
let rimLight = null;
let groundPlaneMesh = null;
let customStudioGroup = null;

// Mode & Fight Arena State
let currentMode = 'solo'; // 'solo' | 'fight' | 'teacher'
let fightArenaGroup = null;
let fighter1 = null; // Left: Fighter 1 (Orange stickman)
let fighter2 = null; // Right: Fighter 2 (Blue stickman, identical structure)
let isFightPlaying = false;
let fightSpeedMultiplier = 1.0;
let hitStopTimer = 0;
let cameraShakeIntensity = 0;
let activeFXGroup = null;
let originalCameraTarget = new THREE.Vector3(0, 8, 0);

// Teacher Classroom State
let teacherClassroomGroup = null;
let teacherAvatar = null;
let blackboardMesh = null;
let blackboardCanvas = null;
let blackboardCtx = null;
let blackboardTexture = null;
let pointerLaserMesh = null;
let laserTargetPoint = new THREE.Vector3(2.5, 9.5, 0);
let currentLessonId = 'quadratic';
let currentStepIndex = 0;
let isTeacherAutoPlaying = false;
let autoPlayTimer = null;
let teacherTalkingIntensity = 0;
let teacherTargetAim = new THREE.Vector3(2.5, 9.5, 0);
let currentAimPos = new THREE.Vector3(2.5, 9.5, 0);

// Teacher Locomotion & Behavior State
let teacherState = 'idle'; // 'idle' | 'walking' | 'writing' | 'pointing' | 'explaining'
let teacherCurrentX = -5.8;
let teacherTargetX = -5.8;
const TEACHER_WALK_PLAY_RATE = 0.45;
let teacherWalkSpeed = 4.12; // Synchronized stride rate (9.17 * 0.45) for true MoCap walk
let teacherFacingAngle = 0.25;
let onWalkArrivalCallback = null;

let writeProgress = 1.0;
let isWritingActive = false;
let writeAnimationTimer = 0.0;
let writeDuration = 3.2; // Letter-by-letter writing pacing
let chalkDustGroup = null;
let currentChalkTraceTarget = new THREE.Vector3(-2.0, 9.5, 0.2);
let isChalkTouchingBoard = false;

let blinkTimer = 0;
let isBlinking = false;
let teacherGestureTimer = 0;

// Animal Studio State Variables
let animalStudioGroup = null;
let currentAnimalSkeleton = null;
let animalSkeletonHelper = null;
let currentAnimalMeshGroup = null;
let animalBoneMap = {};
let currentAnimalSpecies = 'dog'; // 'dog' | 'cat' | 'dino'
let currentAnimalGait = 'trot'; // 'walk' | 'trot' | 'sprint' | 'stalk' | 'sit'
let currentAnimalCoat = 'default';
let animalSpeedMultiplier = 1.0;
let animalBreathingCycle = 0.0;
let animalWalkCycle = 0.0;
let animalTailWagCycle = 0.0;

// Parkour Physics State Variables (The Physics of Parkour • Alan Becker Kinematics)
let parkourStudioGroup = null;
let parkourPrimaryRig = null;
let parkourStickmanGroup = null;
let parkourSpineGroup = null;
let parkourLArmGroup = null, parkourLElbGroup = null, parkourLHandMesh = null;
let parkourRArmGroup = null, parkourRElbGroup = null, parkourRHandMesh = null;
const _pHandWorldPos = new THREE.Vector3();
const _pLHandWorldPos = new THREE.Vector3();
let parkourLLegGroup = null, parkourLKneeGroup = null;
let parkourRLegGroup = null, parkourRKneeGroup = null;
let parkourShadowPlane = null;
let parkourFistLight = null;
let parkourHurdleMesh = null;
let parkourHeadMesh = null;
let parkourStickMat = null;
let parkourBasketballMesh = null;
let parkourHoopGroup = null;
let parkourBackboardMesh = null;
let parkourRimMesh = null;
let parkourNetMesh = null;
let parkourCurrentAction = 'basketball_dunk'; // 'basketball_dunk' | 'hurdle_vault'
let parkourCurrentStyle = 'stickman_orange';
let parkourSpeedFactor = 0.28;
let parkourShowTelemetry = false;
const parkourTotalFrames = 360;
let parkourStartTime = performance.now();
let parkourTelemetryOverlay = null;

// Multi-Character Parkour Companion Rig & State
let parkourCompanionEnabled = false;
let parkourCompanionStyle = 'stickman_white';
let parkourCompanionAction = 'hurdle_vault';
let parkourCompanionOffsetZ = -10;
let parkourCompanionSpeed = 0.35;
let parkourCompanionRig = null;
let parkourCompanionMat = null;
let parkourCompanionHurdleMesh = null;
let parkourCompanionShadowPlane = null;
let parkourCompanionFistLight = null;
let parkourPlaygroundGroup = null;

window.addEventListener('error', (e) => {
    const el = document.getElementById('status-text');
    if (el) {
        el.textContent = 'Runtime Error: ' + (e.error?.stack || e.message);
        el.style.color = '#ef4444';
        el.style.whiteSpace = 'pre-wrap';
    }
});

window.addEventListener('unhandledrejection', (e) => {
    const el = document.getElementById('status-text');
    if (el) {
        el.textContent = 'Promise Error: ' + (e.reason?.stack || e.reason?.message || e.reason);
        el.style.color = '#ef4444';
        el.style.whiteSpace = 'pre-wrap';
    }
});

async function init() {
    clock = new THREE.Clock();

    const container = document.getElementById('canvas-container');
    playPauseBtn = document.getElementById('play-pause-btn');
    resetBtn = document.getElementById('reset-btn');
    statusText = document.getElementById('status-text');
    animSelect = document.getElementById('anim-select');
    speedSlider = document.getElementById('speed-slider');
    speedVal = document.getElementById('speed-val');
    inPlaceToggle = document.getElementById('in-place-toggle');
    skeletonToggle = document.getElementById('skeleton-toggle');
    gridToggle = document.getElementById('grid-toggle');
    styleSelect = document.getElementById('style-select');
    btnSide = document.getElementById('view-side');
    btnFront = document.getElementById('view-front');
    btnIso = document.getElementById('view-iso');

    // 1. WebGL Renderer with toon shading & shadow support
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0f172a, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 2. Scene & Camera
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    applyCameraPreset('side');

    // Orbit Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, -4, 0);
    controls.maxDistance = 150;
    controls.minDistance = 5;

    // Vibrant 3-Point Cartoon Lighting
    setupLighting();

    // Floor Grid & Shadow receiver
    setupGround();

    // Setup UI event listeners immediately so tabs and controls are responsive from frame 0
    setupUIEvents();

    // Start 60 FPS animation render loop immediately
    animate();

    // Expose scriptable Studio API immediately so Studio and exportVideo are available synchronously
    exposeStudioAPI();

    // Check initial mode from window global, URL param or hash (default to 'parkour')
    const urlParams = new URLSearchParams(window.location.search);
    const initialMode = window.__CARTOON_INITIAL_MODE__ || urlParams.get('mode') || (window.location.hash ? window.location.hash.replace('#', '') : 'parkour');

    // Load MoCap BVH Files first so base skeleton is immediately available for character building in all modes
    await loadMoCapBVH();

    switchViewerMode(initialMode);
    exposeStudioAPI();
}

async function loadMoCapBVH() {
    try {
        if (statusText && currentMode === 'solo') {
            statusText.textContent = "Loading MoCap assets...";
            statusText.style.color = "#f59e0b";
        }

        const bvhLoader = new BVHLoader();
        const loadBvh = (url) => new Promise((resolve, reject) => {
            bvhLoader.load(url, resolve, undefined, reject);
        });

        // Resolve absolute URL via import.meta.url to be immune to URL path differences
        const walkUrl = new URL('assets/walk.bvh', import.meta.url).href;
        const runUrl = new URL('assets/run.bvh', import.meta.url).href;

        const [walkBvh, runBvh] = await Promise.all([
            loadBvh(walkUrl),
            loadBvh(runUrl)
        ]);

        normalizeRootTrack(walkBvh.clip);
        normalizeRootTrack(runBvh.clip);

        baseWalkBvh = walkBvh;

        // Preserve pristine rest-pose template skeleton before any mixer updates
        const templateRoot = walkBvh.skeleton.bones[0].clone(true);
        templateRoot.updateWorldMatrix(true, true);
        const templateBones = [];
        templateRoot.traverse(b => { if (b.isBone) templateBones.push(b); });
        templateMoCapSkeleton = new THREE.Skeleton(templateBones);
        templateMoCapSkeleton.calculateInverses();

        currentSkeleton = walkBvh.skeleton;
        clips.walk = walkBvh.clip;
        clips.run = runBvh.clip;

        // If teacher classroom is already initialized, build teacher avatar immediately
        if (teacherClassroomGroup && !teacherAvatar) {
            buildTeacherAvatar(document.getElementById('teacher-style-select')?.value || 'hero');
        } else if (teacherAvatar && clips.walk) {
            if (teacherMixer) teacherMixer.stopAllAction();
            teacherMixer = new THREE.AnimationMixer(teacherAvatar.hips);
            teacherWalkAction = teacherMixer.clipAction(clips.walk);
            teacherWalkAction.loop = THREE.LoopRepeat;
        }

        const rootBone = currentSkeleton.bones[0];

        boneGroup = new THREE.Group();
        boneGroup.add(rootBone);
        scene.add(boneGroup);

        // Skeleton line helper
        skeletonHelper = new THREE.SkeletonHelper(rootBone);
        skeletonHelper.skeleton = currentSkeleton;
        skeletonHelper.visible = skeletonToggle ? skeletonToggle.checked : false;
        scene.add(skeletonHelper);

        // Build Realistic 3D Cartoon Character
        buildCartoonCharacter(currentSkeleton, styleSelect ? styleSelect.value : 'hero');

        // Setup Animation Mixer
        mixer = new THREE.AnimationMixer(rootBone);
        playAnimation('walk');

        if (animSelect) animSelect.disabled = false;

        if (currentMode === 'solo') {
            boneGroup.visible = true;
            if (cartoonCharacterGroup) cartoonCharacterGroup.visible = true;
            if (skeletonHelper) skeletonHelper.visible = skeletonToggle ? skeletonToggle.checked : false;
            if (mixer) mixer.timeScale = parseFloat(speedSlider?.value || 1.0);
            if (statusText) {
                statusText.textContent = "Playing Walk.";
                statusText.style.color = "#38bdf8";
            }
        } else {
            boneGroup.visible = false;
            if (cartoonCharacterGroup) cartoonCharacterGroup.visible = false;
            if (skeletonHelper) skeletonHelper.visible = false;
            if (mixer) mixer.timeScale = 0;
        }
    } catch (error) {
        console.error("MoCap BVH load error:", error);
        if (statusText && currentMode === 'solo') {
            statusText.textContent = "MoCap Error: " + (error?.message || String(error));
            statusText.style.color = "#ef4444";
        }
    }
}

/**
 * Vibrant 3-Point Toon Lighting setup
 */
function setupLighting() {
    ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    // Key Light (warm sunlight)
    keyLight = new THREE.DirectionalLight(0xfff1e6, 1.6);
    keyLight.position.set(25, 35, 30);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 100;
    const d = 25;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    scene.add(keyLight);

    // Fill Light (cool sky reflection)
    fillLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    fillLight.position.set(-25, 20, -20);
    scene.add(fillLight);

    // Rim / Back Light (neon edge glow)
    rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    rimLight.position.set(0, 20, -35);
    scene.add(rimLight);
}

/**
 * Floor grid with soft shadow ground plane
 */
function setupGround() {
    gridHelper = new THREE.GridHelper(80, 40, 0x38bdf8, 0x334155);
    gridHelper.position.y = -16.2;
    scene.add(gridHelper);

    // Shadow receiver ground plane
    const planeGeom = new THREE.PlaneGeometry(100, 100);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    groundPlaneMesh = new THREE.Mesh(planeGeom, planeMat);
    groundPlaneMesh.rotation.x = -Math.PI / 2;
    groundPlaneMesh.position.y = -16.21;
    groundPlaneMesh.receiveShadow = true;
    scene.add(groundPlaneMesh);
}

/**
 * Normalizes root position tracks in the BVH clip so the initial frame starts at (0, 0, 0).
 */
function normalizeRootTrack(clip) {
    for (const track of clip.tracks) {
        if (track.name.endsWith('.position')) {
            const x0 = track.values[0];
            const y0 = track.values[1];
            const z0 = track.values[2];
            for (let i = 0; i < track.values.length; i += 3) {
                track.values[i] -= x0;
                track.values[i + 1] -= y0;
                track.values[i + 2] -= z0;
            }
            break;
        }
    }
}

/**
 * Palettes for realistic cartoon character styles
 */
/**
 * Vibrant palettes for realistic cartoon character styles
 */
const STYLES = {
    hero: {
        skin: 0xffdfc4,
        blush: 0xff8fa3,
        shirt: 0x06d6a0,
        hoodieDark: 0x05b587,
        shorts: 0x1d4ed8,
        shortsDark: 0x1e40af,
        shoes: 0xf43f5e,
        sole: 0xf8fafc,
        soleStripe: 0x0f172a,
        socks: 0xffffff,
        gloves: 0xffffff,
        hair: 0x27272a,
        cap: 0xfbbf24,
        capBrim: 0xf59e0b,
        iris: 0x0284c7,
        eyeWhite: 0xffffff,
        pupil: 0x09090b,
        mouth: 0xbe123c,
        eyebrow: 0x18181b
    },
    runner: {
        skin: 0xf5d0b5,
        blush: 0xf472b6,
        shirt: 0xef4444,
        hoodieDark: 0xb91c1c,
        shorts: 0x18181b,
        shortsDark: 0x09090b,
        shoes: 0xfacc15,
        sole: 0xffffff,
        soleStripe: 0xef4444,
        socks: 0xffffff,
        gloves: 0xffffff,
        hair: 0xd97706,
        cap: 0x18181b,
        capBrim: 0xef4444,
        iris: 0x15803d,
        eyeWhite: 0xffffff,
        pupil: 0x09090b,
        mouth: 0x991b1b,
        eyebrow: 0x78350f
    },
    robot: {
        skin: 0xcfd8dc,
        blush: 0x38bdf8,
        shirt: 0x38bdf8,
        hoodieDark: 0x0284c7,
        shorts: 0x0f172a,
        shortsDark: 0x020617,
        shoes: 0x06b6d4,
        sole: 0x1e293b,
        soleStripe: 0x38bdf8,
        socks: 0x475569,
        gloves: 0xe2e8f0,
        hair: 0x0284c7,
        cap: 0x0f172a,
        capBrim: 0x06b6d4,
        iris: 0x38bdf8,
        eyeWhite: 0xffffff,
        pupil: 0x020617,
        mouth: 0x0284c7,
        eyebrow: 0x0284c7
    }
};

/**
 * Generates a smooth, tapered 3D tube geometry along an array of 3D points.
 * Computes Frenet frames along a CatmullRomCurve3, interpolates radius smoothly,
 * generates surface normals, and caps both ends with rounded tips.
 */
function createTaperedTubeGeometry(points, radiusStart, radiusEnd, tubularSegments = 24, radialSegments = 12) {
    const curve = new THREE.CatmullRomCurve3(points);
    const sampledPoints = curve.getPoints(tubularSegments);
    const frames = curve.computeFrenetFrames(tubularSegments, false);

    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const numRings = tubularSegments + 1;
    const ringVertexCount = radialSegments + 1;

    for (let i = 0; i < numRings; i++) {
        const t = i / tubularSegments;
        const radius = radiusStart * (1 - t) + radiusEnd * t;
        const P = sampledPoints[i];
        const N = frames.normals[i];
        const B = frames.binormals[i];

        for (let j = 0; j <= radialSegments; j++) {
            const angle = (j / radialSegments) * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const nx = cos * N.x + sin * B.x;
            const ny = cos * N.y + sin * B.y;
            const nz = cos * N.z + sin * B.z;

            vertices.push(
                P.x + radius * nx,
                P.y + radius * ny,
                P.z + radius * nz
            );
            normals.push(nx, ny, nz);
            uvs.push(j / radialSegments, t);
        }
    }

    for (let i = 0; i < tubularSegments; i++) {
        for (let j = 0; j < radialSegments; j++) {
            const a = i * ringVertexCount + j;
            const b = (i + 1) * ringVertexCount + j;
            const c = (i + 1) * ringVertexCount + (j + 1);
            const d = i * ringVertexCount + (j + 1);

            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    // Rounded start cap (inner brow head)
    const startCenterIdx = vertices.length / 3;
    const startTangent = frames.tangents[0];
    vertices.push(
        sampledPoints[0].x - startTangent.x * radiusStart * 0.45,
        sampledPoints[0].y - startTangent.y * radiusStart * 0.45,
        sampledPoints[0].z - startTangent.z * radiusStart * 0.45
    );
    normals.push(-startTangent.x, -startTangent.y, -startTangent.z);
    uvs.push(0.5, 0);

    for (let j = 0; j < radialSegments; j++) {
        indices.push(startCenterIdx, j + 1, j);
    }

    // Rounded end cap (outer brow tail tip)
    const endCenterIdx = vertices.length / 3;
    const endTangent = frames.tangents[tubularSegments];
    vertices.push(
        sampledPoints[tubularSegments].x + endTangent.x * radiusEnd * 0.75,
        sampledPoints[tubularSegments].y + endTangent.y * radiusEnd * 0.75,
        sampledPoints[tubularSegments].z + endTangent.z * radiusEnd * 0.75
    );
    normals.push(endTangent.x, endTangent.y, endTangent.z);
    uvs.push(0.5, 1);

    const lastRingStart = tubularSegments * ringVertexCount;
    for (let j = 0; j < radialSegments; j++) {
        indices.push(endCenterIdx, lastRingStart + j, lastRingStart + j + 1);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return geom;
}

/**
 * Mathematically generates an ultra-smooth parametric Face Decal geometry
 * that clings 1:1 to the front curvature of the character's ellipsoid skull.
 * Spans from chin to upper forehead and from temple to temple with clean [0,1]x[0,1] UVs.
 */
function createParametricFaceGeometry(RX = 1.95, RY = 2.0475, RZ = 1.911, uSegments = 40, vSegments = 40) {
    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const thetaMax = (110.0 * Math.PI / 180.0); // 110 deg horizontal temple-to-temple span
    const phiMax = (88.0 * Math.PI / 180.0);    // 88 deg vertical chin-to-forehead span

    for (let iv = 0; iv <= vSegments; iv++) {
        const v = iv / vSegments;
        const phi = (v - 0.5) * phiMax;
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);

        for (let iu = 0; iu <= uSegments; iu++) {
            const u = iu / uSegments;
            const theta = (u - 0.5) * thetaMax;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            // Exactly on the skull ellipsoid surface with an imperceptible offset (0.008)
            const x = RX * sinTheta * cosPhi;
            const y = RY * sinPhi;
            const z = RZ * cosTheta * cosPhi + 0.008;

            const gradX = x / (RX * RX);
            const gradY = y / (RY * RY);
            const gradZ = (z - 0.008) / (RZ * RZ);
            const len = Math.hypot(gradX, gradY, gradZ) || 1;

            vertices.push(x, y, z);
            normals.push(gradX / len, gradY / len, gradZ / len);
            uvs.push(u, v);
        }
    }

    const rowSize = uSegments + 1;
    for (let iv = 0; iv < vSegments; iv++) {
        for (let iu = 0; iu < uSegments; iu++) {
            const a = iv * rowSize + iu;
            const b = (iv + 1) * rowSize + iu;
            const c = (iv + 1) * rowSize + (iu + 1);
            const d = iv * rowSize + (iu + 1);

            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return geom;
}

/**
 * Generates an ultra-high-resolution (2048x2048) state-of-the-art Pixar/Disney Face Canvas Texture.
 * Procedurally draws:
 * 1. Expressive Pixar/Disney cartoon eyes with multi-stage iris gradients, glowing inner crescent,
 *    pitch black pupil, triple sparkle catchlights, sleek eyeliner, and winged lash flick.
 * 2. Tapered, expressive anime/Disney eyebrows that sit perfectly on the forehead.
 * 3. Soft glowing blush on cheekbones with smooth radial gradient falloff.
 * 4. Charming open cartoon smile with warm rose mouth cavity, pearly tooth highlight, and corner dimples.
 * 5. Subtle cartoon button nose bridge and tip contour.
 */
function createFaceCanvasTexture(colors) {
    const W = 2048;
    const H = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, W, H);

    function hexToRgba(hex, alpha = 1.0) {
        const r = (hex >> 16) & 255;
        const g = (hex >> 8) & 255;
        const b = hex & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    const eyeColor = colors.iris || 0x0284c7;
    const browColor = hexToRgba(colors.eyebrow || 0x18181b, 1.0);
    const blushColor = colors.blush || 0xff8fa3;
    const mouthColor = hexToRgba(colors.mouth || 0xbe123c, 1.0);

    // ==========================================================
    // 1. SOFT GLOWING BLUSHING CHEEKS (Smooth Radial Falloff)
    // ==========================================================
    const blushY = 1110;
    const blushRadius = 210;
    [410, 1638].forEach(bx => {
        const grad = ctx.createRadialGradient(bx, blushY, 25, bx, blushY, blushRadius);
        grad.addColorStop(0, hexToRgba(blushColor, 0.45));
        grad.addColorStop(0.45, hexToRgba(blushColor, 0.20));
        grad.addColorStop(1.0, hexToRgba(blushColor, 0.0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, blushY, blushRadius, 0, Math.PI * 2);
        ctx.fill();
    });

    // ==========================================================
    // 2. EXPRESSIVE PIXAR/DISNEY CARTOON EYES
    // ==========================================================
    const eyeY = 890;
    const eyeCenters = [655, 1393]; // Right eye, Left eye

    eyeCenters.forEach((cx, idx) => {
        const isRightEye = idx === 1;
        const sign = isRightEye ? 1 : -1;

        ctx.save();
        ctx.translate(cx, eyeY);

        const ew = 244;
        const eh = 278;

        // --- Sclera (Smooth glossy white eye oval) ---
        ctx.beginPath();
        ctx.ellipse(0, 0, ew / 2, eh / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.save();
        ctx.clip(); // Restrict iris and shadows within the eye boundary

        // Soft ambient occlusion shadow from upper lid
        const scleraShadow = ctx.createLinearGradient(0, -eh / 2, 0, 10);
        scleraShadow.addColorStop(0, 'rgba(15, 23, 42, 0.20)');
        scleraShadow.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
        ctx.fillStyle = scleraShadow;
        ctx.fillRect(-ew / 2, -eh / 2, ew, eh / 2 + 10);

        // --- Multi-Layered Luminous Iris ---
        const ix = sign * 14;
        const iy = -4;
        const irX = 108;
        const irY = 116;

        // Rich Multi-Stop Iris Gradient
        const irisGrad = ctx.createLinearGradient(ix, iy - irY, ix, iy + irY);
        irisGrad.addColorStop(0, '#060913');
        irisGrad.addColorStop(0.35, hexToRgba(eyeColor, 0.85));
        irisGrad.addColorStop(0.75, hexToRgba(eyeColor, 1.0));
        irisGrad.addColorStop(1.0, '#38bdf8');

        ctx.beginPath();
        ctx.ellipse(ix, iy, irX, irY, 0, 0, Math.PI * 2);
        ctx.fillStyle = irisGrad;
        ctx.fill();

        // Dark Limbal Ring (Anime outer iris border)
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#050811';
        ctx.stroke();

        // Glowing Inner Crescent Highlight (Spark of life)
        ctx.beginPath();
        ctx.ellipse(ix, iy + 24, irX * 0.72, irY * 0.46, 0, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.lineWidth = 14;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.stroke();

        // Deep Pitch-Black Pupil
        const prX = 54;
        const prY = 58;
        ctx.beginPath();
        ctx.ellipse(ix, iy, prX, prY, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#09090b';
        ctx.fill();

        // Triple Disney/Pixar Specular Catchlights (The sparkle of life)
        // 1. Primary large oval catchlight (at 1 o'clock)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(ix + 28, iy - 32, 26, 20, Math.PI * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // 2. Secondary soft circular sparkle (at 7 o'clock)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.beginPath();
        ctx.arc(ix - 26, iy + 28, 12, 0, Math.PI * 2);
        ctx.fill();

        // 3. Tiny accent sparkle (at 11 o'clock)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.beginPath();
        ctx.arc(ix - 12, iy - 44, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // Exit sclera clip

        // --- Sleek Upper Eyelash / Eyeliner Arch ---
        ctx.beginPath();
        const lashStart = -ew / 2 - 12;
        const lashEnd = ew / 2 + 16;
        ctx.moveTo(lashStart, 10);
        ctx.bezierCurveTo(lashStart + 20, -eh / 2 - 24, lashEnd - 20, -eh / 2 - 24, lashEnd, 14);
        ctx.bezierCurveTo(lashEnd - 15, -eh / 2 + 4, lashStart + 15, -eh / 2 + 4, lashStart, 10);
        ctx.fillStyle = '#09090b';
        ctx.fill();

        // Winged lash flick on outer corner
        const flickX = isRightEye ? ew / 2 + 14 : -ew / 2 - 14;
        ctx.beginPath();
        ctx.moveTo(flickX, 12);
        ctx.quadraticCurveTo(flickX + sign * 24, -16, flickX + sign * 38, -32);
        ctx.quadraticCurveTo(flickX + sign * 14, -8, flickX, 12);
        ctx.fillStyle = '#09090b';
        ctx.fill();

        // Subtle Lower Lash Line
        ctx.beginPath();
        ctx.ellipse(0, eh / 2 + 6, ew * 0.32, 4, 0, 0, Math.PI);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.40)';
        ctx.stroke();

        // Delicate Upper Eyelid Crease
        ctx.beginPath();
        ctx.bezierCurveTo(-ew * 0.35, -eh / 2 - 38, ew * 0.35, -eh / 2 - 38, ew * 0.40, -eh / 2 - 18);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.32)';
        ctx.stroke();

        ctx.restore();
    });

    // ==========================================================
    // 3. EXPRESSIVE TAPERED CARTOON EYEBROWS
    // ==========================================================
    // Right Brow (viewer left)
    ctx.save();
    ctx.fillStyle = browColor;
    ctx.beginPath();
    ctx.moveTo(760, 675); // Inner brow anchor near bridge
    ctx.bezierCurveTo(710, 550, 630, 550, 470, 635); // Top arch
    ctx.bezierCurveTo(440, 645, 450, 660, 480, 654); // Tail flick
    ctx.bezierCurveTo(620, 588, 690, 588, 755, 700); // Bottom curve
    ctx.closePath();
    ctx.fill();

    // Left Brow (viewer right)
    ctx.beginPath();
    ctx.moveTo(1288, 675); // Inner brow anchor
    ctx.bezierCurveTo(1338, 550, 1418, 550, 1578, 635); // Top arch
    ctx.bezierCurveTo(1608, 645, 1598, 660, 1568, 654); // Tail flick
    ctx.bezierCurveTo(1428, 588, 1358, 588, 1293, 700); // Bottom curve
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // ==========================================================
    // 4. CUTE CARTOON NOSE
    // ==========================================================
    const noseY = 1145;
    ctx.save();
    // Soft shadow arc beneath nose tip
    ctx.beginPath();
    ctx.arc(1024, noseY, 32, Math.PI * 0.15, Math.PI * 0.85);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.38)';
    ctx.stroke();

    // Delicate nose tip highlight
    ctx.beginPath();
    ctx.arc(1024, noseY - 8, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();
    ctx.restore();

    // ==========================================================
    // 5. CHARMING EXPRESSIVE CARTOON MOUTH / SMILE
    // ==========================================================
    const mouthY = 1430;
    ctx.save();
    ctx.translate(1024, mouthY);

    // Cheerful crescent open smile cavity
    ctx.beginPath();
    ctx.moveTo(-160, 0);
    ctx.bezierCurveTo(-110, 140, 110, 140, 160, 0); // Lower lip smile line
    ctx.bezierCurveTo(90, 35, -90, 35, -160, 0);   // Upper lip arch
    ctx.closePath();
    ctx.fillStyle = '#881337'; // Deep warm rose mouth cavity
    ctx.fill();

    // Upper pearly tooth crescent highlight
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(-130, 0);
    ctx.bezierCurveTo(-80, 45, 80, 45, 130, 0);
    ctx.bezierCurveTo(70, -10, -70, -10, -130, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Cute lower tongue highlight
    ctx.beginPath();
    ctx.arc(0, 95, 75, 0, Math.PI * 2);
    ctx.fillStyle = '#fb7185';
    ctx.fill();
    ctx.restore();

    // Crisp smile boundary line with cheerful upturned corner dimples
    ctx.beginPath();
    ctx.moveTo(-175, -8);
    ctx.quadraticCurveTo(-165, 4, -150, 2);
    ctx.bezierCurveTo(-90, 35, 90, 35, 150, 2);
    ctx.quadraticCurveTo(165, 4, 175, -8);
    ctx.lineWidth = 8;
    ctx.strokeStyle = mouthColor;
    ctx.stroke();

    // Subtle lower lip contour
    ctx.beginPath();
    ctx.arc(0, 155, 45, Math.PI * 0.25, Math.PI * 0.75);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)';
    ctx.stroke();

    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16;
    return texture;
}

/**
 * Builds an authentic Alan Becker stickman figure attached to CMU MoCap bone nodes.
 * Features the iconic hollow-ring head (The Chosen One / Classic) or solid stylized head (The Second Coming, Red, Blue, Green),
 * slender cylindrical stick limbs, smooth ball joints, and minimalist stick hands/feet.
 */
function buildAlanBeckerStickman(skeleton, styleName, boneMap, attach, createConnectingLimb, addJointSphere) {
    const STICKMAN_PALETTES = {
        stickman_black: {
            body: 0x141416,   // The Chosen One / Animator Classic Pure Ink Black
            isHollow: true
        },
        stickman_orange: {
            body: 0xff6f00,   // The Second Coming (Iconic Solid Orange)
            isHollow: false
        },
        stickman_red: {
            body: 0xff2a2a,   // Red
            isHollow: false
        },
        stickman_blue: {
            body: 0x2979ff,   // Blue
            isHollow: false
        },
        stickman_green: {
            body: 0x00e676,   // Green
            isHollow: false
        }
    };

    const cfg = STICKMAN_PALETTES[styleName] || STICKMAN_PALETTES.stickman_black;

    // Alan Becker Bold Vector Animation Aesthetic (smooth organic satin finish)
    const matStick = new THREE.MeshStandardMaterial({
        color: cfg.body,
        roughness: 0.38,
        metalness: 0.05
    });

    // Uniform, bold stroke weight: consistent thickness across each limb chain
    const SPINE_R = 0.88;
    const LEG_R = 0.82;
    const ARM_R = 0.76;
    const NECK_R = 0.76;

    // Helper: add flush joint sphere to perfectly round corners at joint bends
    function addSmoothJoint(bone, radius) {
        if (!bone) return null;
        // 1.04x radius softly envelopes bent corner normals without creating any bulging dumbbell look
        const geom = new THREE.SphereGeometry(radius * 1.04, 36, 36);
        const sphere = new THREE.Mesh(geom, matStick);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        bone.add(sphere);
        return sphere;
    }

    /**
     * Creates a smooth capsule limb between parentBone and childBone.
     * Uses CapsuleGeometry whose hemispherical end caps center precisely at (0,0,0) and target,
     * ensuring corners at every bend angle are rounded, silky smooth, and free of flat-edge creases.
     */
    function createSmoothCapsuleLimb(parentBone, childBone, radius) {
        if (!parentBone || !childBone) return null;

        const target = childBone.position.clone();
        const len = target.length();
        if (len < 0.01) return null;

        const geom = new THREE.CapsuleGeometry(radius, len, 16, 36);
        const dir = target.clone().normalize();
        const mid = target.clone().multiplyScalar(0.5);

        const mesh = new THREE.Mesh(geom, matStick);
        mesh.position.copy(mid);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parentBone.add(mesh);
        return mesh;
    }

    // 1. Alan Becker Expressive Elliptical Head (Vertical oval silhouette)
    const headBone = boneMap['Head'];
    if (headBone) {
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 1.45, 0);

        if (cfg.isHollow) {
            // The Chosen One / Animator Classic: Signature chunky hollow-ring elliptical head
            const ringGeom = new THREE.TorusGeometry(2.30, 0.74, 36, 64);
            const headRing = new THREE.Mesh(ringGeom, matStick);
            headRing.scale.set(0.88, 1.20, 0.88); // Expressive vertical ellipse
            headGroup.add(headRing);
        } else {
            // The Second Coming & Friends: Bold solid 3D elliptical head
            const headSphere = new THREE.Mesh(new THREE.SphereGeometry(2.40, 48, 48), matStick);
            headSphere.scale.set(0.88, 1.20, 0.88); // Expressive vertical ellipse
            headGroup.add(headSphere);
        }

        headBone.add(headGroup);
    }

    // 2. Neck Connection (Smooth & flexible capsule connection to head)
    const neck = boneMap['Neck'];
    const neck1 = boneMap['Neck1'];
    if (neck && neck1) {
        createSmoothCapsuleLimb(neck, neck1, NECK_R);
    }
    if (neck1 && headBone) {
        addSmoothJoint(neck1, NECK_R);
        createSmoothCapsuleLimb(neck1, headBone, NECK_R);
    }

    // 3. Spine & Torso (Single continuous trunk from Pelvis to Chest with silky smooth bends)
    const hips = boneMap['Hips'];
    const lowerBack = boneMap['LowerBack'];
    const spine = boneMap['Spine'];
    const spine1 = boneMap['Spine1'];

    if (hips) {
        addSmoothJoint(hips, SPINE_R);
    }
    if (lowerBack && spine) {
        createSmoothCapsuleLimb(lowerBack, spine, SPINE_R);
    }
    if (spine && spine1) {
        addSmoothJoint(spine, SPINE_R);
        createSmoothCapsuleLimb(spine, spine1, SPINE_R);
    }
    if (spine1) {
        addSmoothJoint(spine1, SPINE_R);
    }

    // 4. Arms & Shoulder Struts (Smooth capsule limbs with rounded, non-angular corners)
    const lShoulder = boneMap['LeftShoulder'];
    const lArm = boneMap['LeftArm'];
    const lForeArm = boneMap['LeftForeArm'];
    const lHand = boneMap['LeftHand'];

    const rShoulder = boneMap['RightShoulder'];
    const rArm = boneMap['RightArm'];
    const rForeArm = boneMap['RightForeArm'];
    const rHand = boneMap['RightHand'];

    // Left Arm Chain
    if (lShoulder && lArm) {
        createSmoothCapsuleLimb(lShoulder, lArm, ARM_R);
    }
    if (lArm && lForeArm) {
        addSmoothJoint(lArm, ARM_R); // Smooth rounded shoulder turn
        createSmoothCapsuleLimb(lArm, lForeArm, ARM_R);
    }
    if (lForeArm && lHand) {
        addSmoothJoint(lForeArm, ARM_R); // Smooth rounded elbow bend
        createSmoothCapsuleLimb(lForeArm, lHand, ARM_R);
    }
    if (lHand) {
        addSmoothJoint(lHand, ARM_R); // Smooth rounded hand tip
    }

    // Right Arm Chain
    if (rShoulder && rArm) {
        createSmoothCapsuleLimb(rShoulder, rArm, ARM_R);
    }
    if (rArm && rForeArm) {
        addSmoothJoint(rArm, ARM_R); // Smooth rounded shoulder turn
        createSmoothCapsuleLimb(rArm, rForeArm, ARM_R);
    }
    if (rForeArm && rHand) {
        addSmoothJoint(rForeArm, ARM_R); // Smooth rounded elbow bend
        createSmoothCapsuleLimb(rForeArm, rHand, ARM_R);
    }
    if (rHand) {
        addSmoothJoint(rHand, ARM_R); // Smooth rounded hand tip
    }

    // 5. Legs & Hip Struts (Smooth capsule legs with rounded, non-angular corners)
    const lHipJoint = boneMap['LHipJoint'];
    const lUpLeg = boneMap['LeftUpLeg'];
    const lLeg = boneMap['LeftLeg'];
    const lFoot = boneMap['LeftFoot'];
    const lToe = boneMap['LeftToeBase'];

    const rHipJoint = boneMap['RHipJoint'];
    const rUpLeg = boneMap['RightUpLeg'];
    const rLeg = boneMap['RightLeg'];
    const rFoot = boneMap['RightFoot'];
    const rToe = boneMap['RightToeBase'];

    // Left Leg Chain
    if (lHipJoint && lUpLeg) {
        createSmoothCapsuleLimb(lHipJoint, lUpLeg, LEG_R);
    }
    if (lUpLeg && lLeg) {
        addSmoothJoint(lUpLeg, LEG_R); // Smooth rounded hip turn
        createSmoothCapsuleLimb(lUpLeg, lLeg, LEG_R);
    }
    if (lLeg && lFoot) {
        addSmoothJoint(lLeg, LEG_R); // Smooth rounded knee bend
        createSmoothCapsuleLimb(lLeg, lFoot, LEG_R);
    }
    if (lFoot) {
        addSmoothJoint(lFoot, LEG_R); // Smooth rounded ankle bend
        if (lToe) {
            createSmoothCapsuleLimb(lFoot, lToe, LEG_R);
            addSmoothJoint(lToe, LEG_R); // Smooth rounded toe tip
        }
    }

    // Right Leg Chain
    if (rHipJoint && rUpLeg) {
        createSmoothCapsuleLimb(rHipJoint, rUpLeg, LEG_R);
    }
    if (rUpLeg && rLeg) {
        addSmoothJoint(rUpLeg, LEG_R); // Smooth rounded hip turn
        createSmoothCapsuleLimb(rUpLeg, rLeg, LEG_R);
    }
    if (rLeg && rFoot) {
        addSmoothJoint(rLeg, LEG_R); // Smooth rounded knee bend
        createSmoothCapsuleLimb(rLeg, rFoot, LEG_R);
    }
    if (rFoot) {
        addSmoothJoint(rFoot, LEG_R); // Smooth rounded ankle bend
        if (rToe) {
            createSmoothCapsuleLimb(rFoot, rToe, LEG_R);
            addSmoothJoint(rToe, LEG_R); // Smooth rounded toe tip
        }
    }
}

/**
 * Builds a realistic 3D cartoon character dynamically attached to CMU MoCap bone nodes.
 * Limbs are mathematically computed directly from parent bone to child bone,
 * guaranteeing zero displacement, zero criss-crossing, zero gaps, and flawless organic articulation.
 */
/**
 * Completely purges and disposes any previously attached character meshes from skeleton bones,
 * ensuring zero mesh stacking, ghosting, or multiple characters sharing the same skeleton.
 */
function clearSkeletonMeshes(skeleton) {
    if (!skeleton || !skeleton.bones) return;
    skeleton.bones.forEach(b => {
        for (let i = b.children.length - 1; i >= 0; i--) {
            const child = b.children[i];
            // Preserve actual skeleton Bone instances; purge all non-bone meshes, groups, and accessories
            if (!child.isBone && child.type !== 'Bone') {
                if (child.traverse) {
                    child.traverse(c => {
                        if (c.geometry) c.geometry.dispose();
                        if (c.material) {
                            if (Array.isArray(c.material)) {
                                c.material.forEach(m => m.dispose());
                            } else {
                                c.material.dispose();
                            }
                        }
                    });
                }
                b.remove(child);
            }
        }
    });
}

function buildCartoonCharacter(skeleton, styleName = 'hero') {
    if (!skeleton || !skeleton.bones) return;

    // Purge any previously attached meshes from bones so character skins never overlap or stack
    clearSkeletonMeshes(skeleton);

    if (skeleton === currentSkeleton) {
        if (cartoonCharacterGroup) {
            scene.remove(cartoonCharacterGroup);
        }
        cartoonCharacterGroup = new THREE.Group();
    }

    const colors = STYLES[styleName] || STYLES.hero;

    // Rich cartoon materials (smooth soft specular highlight, subtle metallic sheen)
    function makeMat(color, roughness = 0.38, metalness = 0.08) {
        return new THREE.MeshStandardMaterial({
            color: color,
            roughness: roughness,
            metalness: metalness
        });
    }

    const matSkin = makeMat(colors.skin, 0.42, 0.04);
    const matBlush = makeMat(colors.blush, 0.5, 0.0);
    const matShirt = makeMat(colors.shirt, 0.38, 0.06);
    const matHoodieDark = makeMat(colors.hoodieDark, 0.42, 0.06);
    const matShorts = makeMat(colors.shorts, 0.38, 0.06);
    const matShortsDark = makeMat(colors.shortsDark, 0.4, 0.06);
    const matShoes = makeMat(colors.shoes, 0.32, 0.08);
    const matSole = makeMat(colors.sole, 0.25, 0.04);
    const matSoleStripe = makeMat(colors.soleStripe, 0.3, 0.1);
    const matSocks = makeMat(colors.socks, 0.4, 0.02);
    const matGloves = makeMat(colors.gloves, 0.35, 0.04);
    const matHair = makeMat(colors.hair, 0.65, 0.02);
    const matCap = makeMat(colors.cap, 0.35, 0.06);
    const matCapBrim = makeMat(colors.capBrim, 0.35, 0.06);
    const matIris = makeMat(colors.iris, 0.2, 0.1);
    const matEyeWhite = makeMat(colors.eyeWhite, 0.15, 0.0);
    const matPupil = makeMat(colors.pupil, 0.1, 0.0);
    const matMouth = makeMat(colors.mouth, 0.3, 0.0);
    const matEyebrow = makeMat(colors.eyebrow, 0.5, 0.0);

    // Map bone name to bone object
    const boneMap = {};
    skeleton.bones.forEach(b => { boneMap[b.name] = b; });

    // Helper: attach a styled mesh to a bone
    function attach(boneName, mesh) {
        const bone = boneMap[boneName];
        if (bone && mesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });
            bone.add(mesh);
        }
    }

    /**
     * Mathematically connects parentBone (0,0,0) to childBone (childBone.position).
     * Automatically scales, offsets, and rotates the cylinder so it bridges the exact joint span.
     * With overlap > 0, the cylinder embeds into the joint spheres at both ends, preventing any gap.
     */
    function createConnectingLimb(parentBone, childBone, radiusTop, radiusBottom, material, options = {}) {
        if (!parentBone || !childBone) return null;

        const target = childBone.position.clone();
        const factor = options.lengthFactor || 1.0;
        const len = target.length() * factor;
        if (len < 0.01) return null;

        const overlap = options.overlap || 0.0;
        const totalHeight = len + overlap;
        const geom = new THREE.CylinderGeometry(radiusTop, radiusBottom, totalHeight, options.radialSegments || 24);
        const dir = target.clone().normalize();
        const mid = target.clone().multiplyScalar(0.5 * factor);

        const mesh = new THREE.Mesh(geom, material);
        mesh.position.copy(mid);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parentBone.add(mesh);
        return mesh;
    }

    /**
     * Adds a smooth ball-joint sphere at (0, 0, 0) of a bone to prevent any joint gaps.
     */
    function addJointSphere(bone, radius, material) {
        if (!bone) return null;
        const geom = new THREE.SphereGeometry(radius, 24, 24);
        const sphere = new THREE.Mesh(geom, material);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        bone.add(sphere);
        return sphere;
    }

    // Check for Alan Becker Stickman Styles
    if (styleName.startsWith('stickman')) {
        buildAlanBeckerStickman(skeleton, styleName, boneMap, attach, createConnectingLimb, addJointSphere);
        return;
    }

    // ==========================================
    // 1. HEAD & ADVANCED CARTOON FACE
    // ==========================================
    const headBone = boneMap['Head'];
    if (headBone) {
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 1.25, 0);

        // 1. Sculpted Cartoon Skull (smooth organic proportions)
        const headGeom = new THREE.SphereGeometry(1.95, 48, 48);
        headGeom.scale(1.0, 1.05, 0.98);
        const headMesh = new THREE.Mesh(headGeom, matSkin);
        headGroup.add(headMesh);

        // Helper: compute surface Z on the character skull ellipsoid
        const getSkullZ = (x, y, extraOffset = 0.0) => {
            const normSq = (x / 1.95) ** 2 + (y / 2.0475) ** 2;
            const safe = Math.max(0.001, 1 - normSq);
            return 1.911 * Math.sqrt(safe) + extraOffset;
        };

        // 2. Beautifully Sculpted 3D Cartoon Nose (Enlarged, Extended Upwards & Naturally Absorbed)
        const noseGroup = new THREE.Group();

        // 1. Upper Bridge Transition - extends up to Y = +0.03 between the eyes with a soft rounded dome
        // so it absorbs gently and naturally into the forehead without any sharp point or edge
        const topDomeY = 0.03;
        const topDomeZ = getSkullZ(0, topDomeY, 0.006);
        const topDomeGeom = new THREE.SphereGeometry(0.065, 20, 20);
        topDomeGeom.scale(1.0, 0.85, 0.35);
        const topDome = new THREE.Mesh(topDomeGeom, matSkin);
        topDome.position.set(0, topDomeY, topDomeZ);
        noseGroup.add(topDome);

        // 2. Smooth Tapered Nasal Bridge connecting from the upper brow down into the tip
        const apexY = 0.025;
        const apexZ = getSkullZ(0, apexY, 0.008);
        const baseY = -0.33;
        const baseZ = getSkullZ(0, baseY, 0.045);
        const bridgeLen = Math.hypot(baseY - apexY, baseZ - apexZ);
        const bridgeGeom = new THREE.CylinderGeometry(0.062, 0.105, bridgeLen, 24);
        bridgeGeom.scale(1.0, 1.0, 0.45);
        const bridge = new THREE.Mesh(bridgeGeom, matSkin);
        bridge.position.set(0, (apexY + baseY) * 0.5, (apexZ + baseZ) * 0.5);
        bridge.rotation.x = Math.atan2(baseZ - apexZ, -(baseY - apexY));
        noseGroup.add(bridge);

        // 3. Prominent, Naturally Rounded Cartoon Nose Tip
        const tipX = 0;
        const tipY = -0.34;
        const tipZ = getSkullZ(0, tipY, 0.045);
        const rx = 0.145 * 1.15;
        const ry = 0.145 * 0.95;
        const rz = 0.145 * 0.65;

        const tipGeom = new THREE.SphereGeometry(0.145, 24, 24);
        tipGeom.scale(1.15, 0.95, 0.65);
        const noseTip = new THREE.Mesh(tipGeom, matSkin);
        noseTip.position.set(tipX, tipY, tipZ);
        noseGroup.add(noseTip);

        // 4. Well-Proportioned Rounded Alar Wings
        [-0.135, 0.135].forEach(nx => {
            const alarGeom = new THREE.SphereGeometry(0.078, 20, 20);
            alarGeom.scale(0.95, 0.75, 0.50);
            const alarZ = getSkullZ(nx, -0.365, 0.024);
            const alar = new THREE.Mesh(alarGeom, matSkin);
            alar.position.set(nx, -0.365, alarZ);
            noseGroup.add(alar);
        });

        // 5. Two Distinct, Clearly Visible 3D Nostrils (Positioned on the Visible Lower Surface)
        const matNostril = makeMat(0x24110b, 0.95, 0.0);
        [-0.072, 0.072].forEach((nx, idx) => {
            const isRight = idx === 1;
            const ny = -0.380;
            const dx = (nx - tipX) / rx;
            const dy = (ny - tipY) / ry;
            const surfDist = Math.max(0.001, 1.0 - dx * dx - dy * dy);
            const nz = tipZ + rz * Math.sqrt(surfDist) + 0.006; // Rests on visible outer surface

            const nostrilGeom = new THREE.SphereGeometry(0.034, 16, 14);
            nostrilGeom.scale(1.30, 0.55, 0.35);
            const nostril = new THREE.Mesh(nostrilGeom, matNostril);
            nostril.position.set(nx, ny, nz);
            nostril.rotation.x = 0.22;
            nostril.rotation.z = isRight ? 0.32 : -0.32;
            noseGroup.add(nostril);
        });

        headGroup.add(noseGroup);

        // 2. High-Fidelity 3D Cartoon Eyes (Properly Placed & Proportioned)
        const eyeGroups = [];
        [-0.52, 0.52].forEach((eyeX, idx) => {
            const isRight = idx === 1;
            const eyeGroup = new THREE.Group();
            
            // Placed naturally around eye level
            const eyeY = -0.10;
            const eyeZ = getSkullZ(eyeX, eyeY, -0.04);
            eyeGroup.position.set(eyeX, eyeY, eyeZ);
            eyeGroup.rotation.y = isRight ? 0.26 : -0.26;
            eyeGroup.rotation.x = -0.03;

            // Sclera (White eye background - smooth, organic oval)
            const scleraGeom = new THREE.SphereGeometry(0.32, 28, 24);
            scleraGeom.scale(0.92, 1.05, 0.40);
            const sclera = new THREE.Mesh(scleraGeom, matEyeWhite);
            eyeGroup.add(sclera);

            // Iris (Vibrant cartoon eye color)
            const irisGeom = new THREE.SphereGeometry(0.20, 24, 24);
            irisGeom.scale(1.0, 1.05, 0.16);
            const iris = new THREE.Mesh(irisGeom, matIris);
            iris.position.set(isRight ? -0.02 : 0.02, 0.0, 0.125);
            eyeGroup.add(iris);

            // Limbal Ring (Crisp boundary ring defining iris)
            const limbalGeom = new THREE.TorusGeometry(0.20, 0.014, 12, 28);
            const limbal = new THREE.Mesh(limbalGeom, matPupil);
            limbal.position.set(isRight ? -0.02 : 0.02, 0.0, 0.132);
            eyeGroup.add(limbal);

            // Pupil (Deep glossy black)
            const pupilGeom = new THREE.SphereGeometry(0.105, 20, 20);
            pupilGeom.scale(1.0, 1.05, 0.18);
            const pupil = new THREE.Mesh(pupilGeom, matPupil);
            pupil.position.set(isRight ? -0.02 : 0.02, 0.0, 0.142);
            eyeGroup.add(pupil);

            // Dual Catchlights (Pixar-style lively reflection highlights)
            const catch1 = new THREE.Mesh(new THREE.SphereGeometry(0.040, 14, 14), matEyeWhite);
            catch1.position.set(0.045, 0.045, 0.17);
            eyeGroup.add(catch1);

            const catch2 = new THREE.Mesh(new THREE.SphereGeometry(0.020, 12, 12), matEyeWhite);
            catch2.position.set(-0.035, -0.035, 0.17);
            eyeGroup.add(catch2);

            headGroup.add(eyeGroup);
            eyeGroups.push(eyeGroup);
        });
        headGroup.userData.eyeGroups = eyeGroups;
        headBone.userData.eyeGroups = eyeGroups;

        // 3. Single Arched 3D Eyebrow Pair (Clean & natural, no duplicate eyelid lines)
        [-1, 1].forEach(side => {
            const p1 = { x: side * 0.20, y: 0.20 };
            const p2 = { x: side * 0.50, y: 0.27 };
            const p3 = { x: side * 0.78, y: 0.18 };

            const points = [
                new THREE.Vector3(p1.x, p1.y, getSkullZ(p1.x, p1.y, 0.035)),
                new THREE.Vector3(p2.x, p2.y, getSkullZ(p2.x, p2.y, 0.035)),
                new THREE.Vector3(p3.x, p3.y, getSkullZ(p3.x, p3.y, 0.035))
            ];

            const browCurve = new THREE.CatmullRomCurve3(points);
            const browGeom = new THREE.TubeGeometry(browCurve, 20, 0.036, 10, false);
            const browMesh = new THREE.Mesh(browGeom, matEyebrow);
            headGroup.add(browMesh);

            // Rounded smooth brow end tips
            const tip1 = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), matEyebrow);
            tip1.position.copy(points[0]);
            headGroup.add(tip1);

            const tip2 = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), matEyebrow);
            tip2.position.copy(points[2]);
            headGroup.add(tip2);
        });

        // 5. Perfectly Proportioned 3D Cartoon Smile & Lip
        const mouthPoints = [
            new THREE.Vector3(-0.35, -0.72, getSkullZ(-0.35, -0.72, 0.025)),
            new THREE.Vector3(-0.18, -0.78, getSkullZ(-0.18, -0.78, 0.025)),
            new THREE.Vector3(0.0,   -0.80, getSkullZ(0.0,   -0.80, 0.025)),
            new THREE.Vector3(0.18,  -0.78, getSkullZ(0.18,  -0.78, 0.025)),
            new THREE.Vector3(0.35,  -0.72, getSkullZ(0.35,  -0.72, 0.025))
        ];

        const mouthCurve = new THREE.CatmullRomCurve3(mouthPoints);
        const mouthGeom = new THREE.TubeGeometry(mouthCurve, 24, 0.032, 12, false);
        const mouthMesh = new THREE.Mesh(mouthGeom, matMouth);
        headGroup.add(mouthMesh);
        headGroup.userData.smileGroup = mouthMesh;
        headBone.userData.smileGroup = mouthMesh;

        // Smile corner dimples
        [-0.35, 0.35].forEach(cx => {
            const cy = -0.72;
            const dimple = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), matMouth);
            dimple.position.set(cx, cy, getSkullZ(cx, cy, 0.025));
            headGroup.add(dimple);
        });

        // Lower lip accent
        const lipZ = getSkullZ(0, -0.87, 0.015);
        const lipGeom = new THREE.SphereGeometry(0.13, 16, 14);
        lipGeom.scale(1.25, 0.40, 0.45);
        const lowerLip = new THREE.Mesh(lipGeom, matSkin);
        lowerLip.position.set(0, -0.87, lipZ);
        headGroup.add(lowerLip);

        // 6. Cartoon Ears (Sculpted with outer helix and inner lobe, aligned to face level)
        [-1.98, 1.98].forEach((xPos, idx) => {
            const earGeom = new THREE.SphereGeometry(0.55, 16, 16);
            earGeom.scale(0.35, 1.0, 0.7);
            const ear = new THREE.Mesh(earGeom, matSkin);
            ear.position.set(xPos, -0.15, -0.1);
            headGroup.add(ear);
        });

        // 5. Volumetric Layered 3D Cartoon Hair
        const hairGroup = new THREE.Group();

        // Front layered bangs flowing naturally from under the cap band
        const frontBangs = [
            { x: 0.08, y: 0.94, rx: 0.34, ry: 0.08, rz: -0.22, rad: 0.16, len: 0.32 },
            { x: -0.24, y: 0.92, rx: 0.30, ry: -0.16, rz: 0.28, rad: 0.14, len: 0.28 },
            { x: 0.32, y: 0.90, rx: 0.28, ry: 0.18, rz: -0.32, rad: 0.13, len: 0.26 },
            { x: -0.06, y: 0.96, rx: 0.36, ry: -0.05, rz: 0.10, rad: 0.13, len: 0.26 }
        ];

        frontBangs.forEach(cfg => {
            const cone = new THREE.ConeGeometry(cfg.rad, cfg.len, 14);
            cone.scale(1.15, 1.0, 0.45);
            cone.translate(0, -cfg.len * 0.45, 0);
            const tuft = new THREE.Mesh(cone, matHair);
            const z = getSkullZ(cfg.x, cfg.y, 0.04);
            tuft.position.set(cfg.x, cfg.y, z);
            tuft.rotation.set(cfg.rx, cfg.ry, cfg.rz);
            tuft.castShadow = true;
            hairGroup.add(tuft);
        });

        // Stylish sideburn locks framing the jaw in front of each ear
        [-1.72, 1.72].forEach((xPos, idx) => {
            const isRight = idx === 1;
            const sbGeom = new THREE.ConeGeometry(0.18, 0.75, 12);
            sbGeom.scale(0.55, 1.0, 1.0);
            sbGeom.translate(0, -0.32, 0);
            const sideburn = new THREE.Mesh(sbGeom, matHair);
            sideburn.position.set(xPos, 0.45, 0.25);
            sideburn.rotation.z = isRight ? -0.12 : 0.12;
            sideburn.rotation.x = -0.10;
            hairGroup.add(sideburn);
        });

        // Back hair volume covering the nape of the neck beneath the cap
        const backHairGeom = new THREE.CylinderGeometry(1.82, 1.74, 0.85, 24, 1, false, Math.PI * 0.45, Math.PI * 1.1);
        const backHair = new THREE.Mesh(backHairGeom, matHair);
        backHair.position.set(0, -0.05, -0.42);
        hairGroup.add(backHair);

        headGroup.add(hairGroup);

        // 6. Backwards Snapback Cap
        const capGroup = new THREE.Group();
        capGroup.position.set(0, 0.48, -0.18);
        capGroup.rotation.x = -0.22;

        const capDome = new THREE.Mesh(new THREE.SphereGeometry(2.02, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.48), matCap);
        capDome.position.set(0, 0.05, 0);
        capGroup.add(capDome);

        const capTrimGeom = new THREE.TorusGeometry(1.98, 0.08, 12, 32);
        const capTrim = new THREE.Mesh(capTrimGeom, matCapBrim);
        capTrim.rotation.x = Math.PI * 0.5;
        capTrim.position.set(0, -0.05, 0);
        capGroup.add(capTrim);

        const brimGeom = new THREE.CylinderGeometry(2.28, 2.28, 0.14, 24, 1, false, -Math.PI * 0.35, Math.PI * 0.7);
        const brim = new THREE.Mesh(brimGeom, matCapBrim);
        brim.position.set(0, -0.1, -1.82);
        capGroup.add(brim);

        const strapGeom = new THREE.TorusGeometry(2.02, 0.08, 10, 24, Math.PI * 0.45);
        const strap = new THREE.Mesh(strapGeom, matCapBrim);
        strap.rotation.x = Math.PI * 0.52;
        strap.rotation.z = Math.PI * 0.78;
        strap.position.set(0, 0.04, -0.15);
        capGroup.add(strap);

        const capBtn = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 14), matCapBrim);
        capBtn.position.set(0, 2.05, 0);
        capGroup.add(capBtn);

        headGroup.add(capGroup);
        headBone.add(headGroup);
    }

    // ==========================================
    // 2. NECK (CLEARLY VISIBLE, SLENDER & ELEGANT)
    // ==========================================
    const neck1 = boneMap['Neck1'];
    if (neck1) {
        // Distinct, slender neck connecting collar cleanly to the chin
        const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.8, 1.8, 24), matSkin);
        neckMesh.position.set(0, 0.85, 0.02);
        neck1.add(neckMesh);
    }

    // ==========================================
    // 3. LAYERED HOODIE, ATHLETIC SHOULDERS & TORSO
    // ==========================================
    // Upper Chest Hoodie on Spine1 with clean, slim athletic silhouette
    const spine1 = boneMap['Spine1'];
    if (spine1) {
        const chestGroup = new THREE.Group();

        // 1. Athletic Tapered Chest Body (Slim, sculpted cartoon silhouette)
        const chestGeom = new THREE.CylinderGeometry(2.25, 2.05, 2.7, 28);
        chestGeom.scale(1.15, 1.0, 0.78);
        const chestMesh = new THREE.Mesh(chestGeom, matShirt);
        chestMesh.position.set(0, 0.1, 0);
        chestGroup.add(chestMesh);

        // 2. Soft Natural Shoulder Yoke (Low-profile slope, never burying the neck)
        const shoulderYokeGeom = new THREE.CylinderGeometry(1.5, 2.3, 0.8, 28);
        shoulderYokeGeom.scale(1.2, 1.0, 0.8);
        const shoulderYoke = new THREE.Mesh(shoulderYokeGeom, matShirt);
        shoulderYoke.position.set(0, 1.35, 0);
        chestGroup.add(shoulderYoke);

        // 3. Sleek Hoodie Collar resting neatly at the base of the neck
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.22, 16, 28), matHoodieDark);
        collar.rotation.x = Math.PI * 0.5;
        collar.position.set(0, 1.68, 0.05);
        chestGroup.add(collar);

        // Contrast inner collar ring
        const collarTrim = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.12, 14, 24), matShirt);
        collarTrim.rotation.x = Math.PI * 0.5;
        collarTrim.position.set(0, 1.74, 0.05);
        chestGroup.add(collarTrim);

        // 4. Hanging Drawstrings with Metallic Aglet Tips
        [-0.42, 0.42].forEach(xPos => {
            const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.25, 10), matEyeWhite);
            cord.position.set(xPos, 0.85, 1.55);
            cord.rotation.x = 0.08;

            const aglet = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 12), matCapBrim);
            aglet.position.set(0, -0.65, 0);
            cord.add(aglet);

            chestGroup.add(cord);
        });

        // 5. Clean, Flush Collar Back (Smooth & aerodynamic, ZERO awkward bump)
        const backCollar = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.18, 14, 24, Math.PI * 0.85), matHoodieDark);
        backCollar.rotation.x = Math.PI * 0.52;
        backCollar.rotation.z = Math.PI * 0.075;
        backCollar.position.set(0, 1.62, -0.12);
        chestGroup.add(backCollar);

        // Subtle athletic spine seam down the back of the hoodie
        const spineSeam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.06), matHoodieDark);
        spineSeam.position.set(0, 0.25, -0.98);
        chestGroup.add(spineSeam);

        spine1.add(chestGroup);
    }

    // Lower Hoodie & Kangaroo Pocket on Spine
    // Slim athletic fit that neatly drapes over the shorts.
    const spine = boneMap['Spine'];
    if (spine) {
        const lowerHoodieGroup = new THREE.Group();
        const bellyGeom = new THREE.CylinderGeometry(2.05, 2.18, 2.6, 28);
        bellyGeom.scale(1.12, 1.0, 0.78);
        const bellyMesh = new THREE.Mesh(bellyGeom, matShirt);
        lowerHoodieGroup.add(bellyMesh);

        // Ribbed Bottom Hem of Hoodie (overlaps shorts waist cleanly)
        const hemGeom = new THREE.CylinderGeometry(2.26, 2.3, 0.55, 28);
        hemGeom.scale(1.14, 1.0, 0.8);
        const hem = new THREE.Mesh(hemGeom, matHoodieDark);
        hem.position.y = -1.15;
        lowerHoodieGroup.add(hem);

        // Slim front kangaroo pocket
        const pocketGeom = new THREE.BoxGeometry(2.2, 1.1, 0.35);
        const pocket = new THREE.Mesh(pocketGeom, matHoodieDark);
        pocket.position.set(0, -0.3, 1.4);
        lowerHoodieGroup.add(pocket);

        lowerHoodieGroup.position.set(0, 0.35, 0);
        spine.add(lowerHoodieGroup);
    }

    // ==========================================
    // 4. HIPS & SHORTS (SEAMLESS PELVIS)
    // ==========================================
    const hips = boneMap['Hips'];
    if (hips) {
        const hipsGroup = new THREE.Group();
        // Shorts Pelvis Body (extends from waist down to hips)
        const shortsGeom = new THREE.CylinderGeometry(2.15, 2.25, 2.4, 28);
        shortsGeom.scale(1.12, 1.0, 0.78);
        const shortsMesh = new THREE.Mesh(shortsGeom, matShorts);
        shortsMesh.position.y = -0.15;
        hipsGroup.add(shortsMesh);

        // Waistband
        const waistbandGeom = new THREE.CylinderGeometry(2.2, 2.2, 0.45, 24);
        waistbandGeom.scale(1.13, 1.0, 0.79);
        const waistband = new THREE.Mesh(waistbandGeom, matShortsDark);
        waistband.position.y = 1.05;
        hipsGroup.add(waistband);

        hips.add(hipsGroup);
    }

    // ==========================================
    // 5. LEGS & CHUNKY CARTOON SNEAKERS
    // ==========================================
    // 5. LEGS & CHUNKY CARTOON SNEAKERS
    // ==========================================
    // Builds a stylized cartoon sneaker with an integrated ankle joint sphere & collar.
    // The sneaker body and sole are offset laterally outward with contoured medial profiles
    // to provide generous, clean gap between legs at the bottom and ensure shoes never touch.
    function createSneaker(footBone, isRight) {
        const shoeGroup = new THREE.Group();

        // Lateral outward offset: pushes shoes away from the midline to ensure generous stride clearance
        const xShift = isRight ? -0.48 : 0.48;
        // Collar & cuff outward offset: smooth transition from calf down to outer shoe body
        const collarXShift = xShift * 0.35;

        // 1. Ankle Ball Joint Sphere: contoured laterally to eliminate medial bulk while maintaining seamless joint contact
        const ankleGeom = new THREE.SphereGeometry(0.85, 24, 24);
        ankleGeom.scale(0.82, 1.0, 0.96);
        const ankleSphere = new THREE.Mesh(ankleGeom, matSocks);
        ankleSphere.position.set(collarXShift * 0.5, 0, 0);
        shoeGroup.add(ankleSphere);

        // 2. High-Top Sneaker Collar: contoured laterally (y = -0.3 to y = +1.15)
        const collarGeom = new THREE.CylinderGeometry(0.82, 0.88, 1.5, 24);
        collarGeom.scale(0.82, 1.0, 1.05);
        const collar = new THREE.Mesh(collarGeom, matShoes);
        collar.position.set(collarXShift, 0.45, 0.08);
        shoeGroup.add(collar);

        // 3. Thick White Crew Sock Cuff emerging out of the sneaker top
        const sockCuffGeom = new THREE.CylinderGeometry(0.78, 0.78, 0.8, 24);
        sockCuffGeom.scale(0.82, 1.0, 1.05);
        const sockCuff = new THREE.Mesh(sockCuffGeom, matSocks);
        sockCuff.position.set(collarXShift, 0.9, 0.08);
        shoeGroup.add(sockCuff);

        // Sock accent stripe
        const sockStripeGeom = new THREE.TorusGeometry(0.79, 0.065, 12, 24);
        sockStripeGeom.scale(0.82, 1.05, 1.0);
        const sockStripe = new THREE.Mesh(sockStripeGeom, matSoleStripe);
        sockStripe.position.set(collarXShift, 1.08, 0.08);
        sockStripe.rotation.x = Math.PI * 0.5;
        shoeGroup.add(sockStripe);

        // 4. Chunky Platform Rubber Outsole (Sleek width with rounded edges)
        const soleGeom = new THREE.BoxGeometry(1.42, 0.58, 4.0);
        const sole = new THREE.Mesh(soleGeom, matSole);
        sole.position.set(xShift, -1.35, 1.15);
        shoeGroup.add(sole);

        // Rubber Midsole Accent Stripe (Wraparound foxing stripe)
        const stripeGeom = new THREE.BoxGeometry(1.46, 0.12, 4.04);
        const stripe = new THREE.Mesh(stripeGeom, matSoleStripe);
        stripe.position.set(xShift, -1.35, 1.15);
        shoeGroup.add(stripe);

        // 5. Main Sneaker Upper (Rear & Midfoot body)
        const upperGeom = new THREE.BoxGeometry(1.34, 1.25, 2.6);
        const upper = new THREE.Mesh(upperGeom, matShoes);
        upper.position.set(xShift, -0.48, 0.5);
        shoeGroup.add(upper);

        // 6. Forefoot / Vamp (Gently sloped towards the toe)
        const vampGeom = new THREE.CylinderGeometry(0.66, 0.68, 1.3, 20);
        vampGeom.rotateX(Math.PI * 0.5);
        vampGeom.scale(1.0, 0.85, 1.2);
        const vamp = new THREE.Mesh(vampGeom, matShoes);
        vamp.position.set(xShift, -0.62, 1.95);
        shoeGroup.add(vamp);

        // 7. Iconic Rubber Shell Toe Cap (Smooth rounded bumper)
        const toeCapGeom = new THREE.SphereGeometry(0.72, 20, 16);
        toeCapGeom.scale(0.92, 0.72, 1.1);
        const toeCap = new THREE.Mesh(toeCapGeom, matSole);
        toeCap.position.set(xShift, -0.76, 2.8);
        shoeGroup.add(toeCap);

        // 8. Padded Sneaker Tongue
        const tongueGeom = new THREE.BoxGeometry(0.9, 1.2, 0.2);
        const tongue = new THREE.Mesh(tongueGeom, matShoes);
        tongue.rotation.x = -0.32;
        tongue.position.set(xShift, 0.1, 1.15);
        shoeGroup.add(tongue);

        // 9. Crisp White Sneaker Laces
        [0.35, 0.85, 1.35, 1.85].forEach(zPos => {
            const laceGeom = new THREE.BoxGeometry(0.92, 0.08, 0.18);
            const lace = new THREE.Mesh(laceGeom, matSocks);
            lace.position.set(xShift, -0.15 + (1.9 - zPos) * 0.18, zPos);
            shoeGroup.add(lace);
        });

        // 10. Sneaker Side Accent Stripe / Star Patch
        const sideStripeGeom = new THREE.BoxGeometry(1.4, 0.16, 1.2);
        const sideStripe = new THREE.Mesh(sideStripeGeom, matSole);
        sideStripe.position.set(xShift, -0.48, 0.55);
        shoeGroup.add(sideStripe);

        attach(footBone.name, shoeGroup);
    }

    // --- Left Leg Assembly ---
    const lUpLeg = boneMap['LeftUpLeg'];
    const lLeg = boneMap['LeftLeg'];
    const lFoot = boneMap['LeftFoot'];

    if (lUpLeg && lLeg) {
        // Hip joint sphere to smoothly bridge pelvis and shorts leg
        addJointSphere(lUpLeg, 1.55, matShorts);

        // Shorts Pant Leg covering upper thigh
        createConnectingLimb(lUpLeg, lLeg, 1.52, 1.36, matShorts, { lengthFactor: 0.65, overlap: 0.4 });

        // Folded Cuff on Shorts Hem
        const target = lLeg.position.clone();
        const dir = target.clone().normalize();
        const cuffGeom = new THREE.TorusGeometry(1.38, 0.16, 14, 24);
        const cuff = new THREE.Mesh(cuffGeom, matShortsDark);
        cuff.position.copy(dir.clone().multiplyScalar(target.length() * 0.65));
        cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        lUpLeg.add(cuff);

        // Thigh skin cylinder spanning from hip to knee with generous joint overlap
        createConnectingLimb(lUpLeg, lLeg, 1.25, 1.08, matSkin, { overlap: 0.5 });
    }

    if (lLeg && lFoot) {
        // Knee Joint Sphere
        addJointSphere(lLeg, 1.12, matSkin);

        // Calf skin cylinder spanning from knee all the way into the ankle sneaker collar (athletic taper)
        createConnectingLimb(lLeg, lFoot, 1.04, 0.78, matSkin, { overlap: 0.8 });
    }

    if (lFoot) {
        createSneaker(lFoot, false);
    }

    // --- Right Leg Assembly ---
    const rUpLeg = boneMap['RightUpLeg'];
    const rLeg = boneMap['RightLeg'];
    const rFoot = boneMap['RightFoot'];

    if (rUpLeg && rLeg) {
        // Hip joint sphere to smoothly bridge pelvis and shorts leg
        addJointSphere(rUpLeg, 1.55, matShorts);

        // Shorts Pant Leg covering upper thigh
        createConnectingLimb(rUpLeg, rLeg, 1.52, 1.36, matShorts, { lengthFactor: 0.65, overlap: 0.4 });

        // Folded Cuff on Shorts Hem
        const target = rLeg.position.clone();
        const dir = target.clone().normalize();
        const cuffGeom = new THREE.TorusGeometry(1.38, 0.16, 14, 24);
        const cuff = new THREE.Mesh(cuffGeom, matShortsDark);
        cuff.position.copy(dir.clone().multiplyScalar(target.length() * 0.65));
        cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        rUpLeg.add(cuff);

        // Thigh skin cylinder spanning from hip to knee with generous joint overlap
        createConnectingLimb(rUpLeg, rLeg, 1.25, 1.08, matSkin, { overlap: 0.5 });
    }

    if (rLeg && rFoot) {
        // Knee Joint Sphere
        addJointSphere(rLeg, 1.12, matSkin);

        // Calf skin cylinder spanning from knee all the way into the ankle sneaker collar (athletic taper)
        createConnectingLimb(rLeg, rFoot, 1.04, 0.78, matSkin, { overlap: 0.8 });
    }

    if (rFoot) {
        createSneaker(rFoot, true);
    }

    // ==========================================
    // 6. ARMS & CARTOON HANDS
    // ==========================================
    // Helper to build a stylized cartoon hand
    function createCartoonHand(handBone, isRight) {
        const handGroup = new THREE.Group();
        handGroup.name = isRight ? 'RightHandGroup' : 'LeftHandGroup';
        // In CMU BVH, LeftHand extends along +X, RightHand extends along -X.
        // Rotating handGroup around Z aligns fingers down the arm bone axis with palms/thumbs facing forward.
        handGroup.rotation.z = isRight ? -Math.PI * 0.5 : Math.PI * 0.5;
        handBone.userData.handGroup = handGroup;

        // Glove Palm
        const palmGeom = new THREE.SphereGeometry(0.95, 20, 20);
        palmGeom.scale(1.1, 0.75, 1.0);
        const palm = new THREE.Mesh(palmGeom, matGloves);
        handGroup.add(palm);

        // Opposable Thumb
        const thumbGeom = new THREE.CapsuleGeometry(0.32, 0.55, 12, 16);
        const thumb = new THREE.Mesh(thumbGeom, matGloves);
        thumb.position.set(isRight ? -0.55 : 0.55, 0.25, 0.45);
        thumb.rotation.set(0.4, isRight ? 0.5 : -0.5, isRight ? -0.4 : 0.4);
        handGroup.add(thumb);

        // 4 Stylized Cartoon Fingers (relaxed walk pose)
        [-0.45, -0.15, 0.15, 0.45].forEach(xOffset => {
            const fingerGeom = new THREE.CapsuleGeometry(0.24, 0.55, 10, 14);
            const finger = new THREE.Mesh(fingerGeom, matGloves);
            finger.position.set(xOffset, -0.65, 0.1);
            finger.rotation.x = 0.25;
            handGroup.add(finger);
        });

        // Glove Wrist Cuff
        const cuffGeom = new THREE.TorusGeometry(0.72, 0.2, 14, 24);
        const cuff = new THREE.Mesh(cuffGeom, matGloves);
        cuff.position.set(0, 0.62, 0);
        cuff.rotation.x = Math.PI * 0.5;
        handGroup.add(cuff);

        if (!isRight) {
            // Sporty Smartwatch on Left Wrist
            const watchStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.35, 24), matShortsDark);
            watchStrap.position.set(0, 0.42, 0);
            handGroup.add(watchStrap);

            const watchFace = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.14), matIris);
            watchFace.position.set(0, 0.42, 0.76);
            handGroup.add(watchFace);
        }

        attach(handBone.name, handGroup);
    }

    // --- Left Arm Assembly ---
    const lArm = boneMap['LeftArm'];
    const lForeArm = boneMap['LeftForeArm'];
    const lHand = boneMap['LeftHand'];

    if (lArm && lForeArm) {
        // Sleek athletic shoulder joint sphere
        addJointSphere(lArm, 1.15, matShirt);
        // Slim hoodie sleeve tapering towards the elbow
        createConnectingLimb(lArm, lForeArm, 1.12, 0.92, matShirt, { overlap: 0.3 });
    }

    if (lForeArm && lHand) {
        // Compact elbow joint sphere
        addJointSphere(lForeArm, 0.92, matShirt);

        // Forearm: Hoodie sleeve cuff + skin
        const armTarget = lHand.position.clone();
        const armDir = armTarget.clone().normalize();
        const armLen = armTarget.length();

        // Forearm Sleeve Cuff
        const cuffLen = armLen * 0.38;
        const sleeveGeom = new THREE.CylinderGeometry(0.92, 0.84, cuffLen, 24);
        const sleeveMesh = new THREE.Mesh(sleeveGeom, matHoodieDark);
        sleeveMesh.position.copy(armDir.clone().multiplyScalar(cuffLen * 0.5));
        sleeveMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), armDir);
        lForeArm.add(sleeveMesh);

        // Ribbed Cuff Ring
        const cuffRing = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.12, 12, 20), matShirt);
        cuffRing.position.copy(armDir.clone().multiplyScalar(cuffLen));
        cuffRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), armDir);
        lForeArm.add(cuffRing);

        // Forearm Skin
        createConnectingLimb(lForeArm, lHand, 0.82, 0.7, matSkin, { overlap: 0.3 });
    }

    if (lHand) {
        createCartoonHand(lHand, false);
    }

    // --- Right Arm Assembly ---
    const rArm = boneMap['RightArm'];
    const rForeArm = boneMap['RightForeArm'];
    const rHand = boneMap['RightHand'];

    if (rArm && rForeArm) {
        // Sleek athletic shoulder joint sphere
        addJointSphere(rArm, 1.15, matShirt);
        // Slim hoodie sleeve tapering towards the elbow
        createConnectingLimb(rArm, rForeArm, 1.12, 0.92, matShirt, { overlap: 0.3 });
    }

    if (rForeArm && rHand) {
        // Compact elbow joint sphere
        addJointSphere(rForeArm, 0.92, matShirt);

        // Forearm: Hoodie sleeve cuff + skin
        const armTarget = rHand.position.clone();
        const armDir = armTarget.clone().normalize();
        const armLen = armTarget.length();

        // Forearm Sleeve Cuff
        const cuffLen = armLen * 0.38;
        const sleeveGeom = new THREE.CylinderGeometry(0.92, 0.84, cuffLen, 24);
        const sleeveMesh = new THREE.Mesh(sleeveGeom, matHoodieDark);
        sleeveMesh.position.copy(armDir.clone().multiplyScalar(cuffLen * 0.5));
        sleeveMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), armDir);
        rForeArm.add(sleeveMesh);

        // Ribbed Cuff Ring
        const cuffRing = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.12, 12, 20), matShirt);
        cuffRing.position.copy(armDir.clone().multiplyScalar(cuffLen));
        cuffRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), armDir);
        rForeArm.add(cuffRing);

        // Forearm Skin
        createConnectingLimb(rForeArm, rHand, 0.82, 0.7, matSkin, { overlap: 0.3 });
    }

    if (rHand) {
        createCartoonHand(rHand, true);
    }

    if (skeleton === currentSkeleton && cartoonCharacterGroup) {
        scene.add(cartoonCharacterGroup);
    }
}

/**
 * Cross-fades smoothly between walk and run clips.
 */
function playAnimation(animName) {
    if (!mixer || !clips[animName]) return;
    
    const newClip = clips[animName];
    const newAction = mixer.clipAction(newClip);
    
    if (currentAction && currentAction !== newAction) {
        newAction.reset();
        newAction.time = currentAction.time % newClip.duration;
        newAction.play();
        currentAction.crossFadeTo(newAction, 0.35, true);
        currentAction = newAction;
    } else {
        newAction.play();
        currentAction = newAction;
    }
}

/**
 * Sets camera preset and OrbitControls target.
 */
function applyCameraPreset(presetName) {
    const preset = CAMERA_PRESETS[presetName];
    if (!preset) return;

    camera.position.copy(preset.pos);
    camera.lookAt(preset.target);

    if (controls) {
        controls.target.copy(preset.target);
        controls.update();
    }

    [btnSide, btnFront, btnIso].forEach(b => b?.classList.remove('active'));
    if (presetName === 'side') btnSide?.classList.add('active');
    if (presetName === 'front') btnFront?.classList.add('active');
    if (presetName === 'iso') btnIso?.classList.add('active');
}

function setupUIEvents() {
    try {
        if (playPauseBtn) {
            playPauseBtn.disabled = false;
            playPauseBtn.textContent = 'Pause';
            playPauseBtn.addEventListener('click', togglePlayback);
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (currentAction) currentAction.reset();
                if (controls) controls.reset();
                applyCameraPreset('side');
            });
        }

        if (animSelect) {
            animSelect.disabled = false;
            animSelect.addEventListener('change', (e) => {
                playAnimation(e.target.value);
                if (statusText) statusText.textContent = `Playing ${e.target.value.toUpperCase()}...`;
            });
        }

        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const speed = parseFloat(e.target.value);
                if (speedVal) speedVal.textContent = `${speed.toFixed(2)}x`;
                if (mixer) mixer.timeScale = speed;
            });
        }

        if (btnSide) btnSide.addEventListener('click', () => applyCameraPreset('side'));
        if (btnFront) btnFront.addEventListener('click', () => applyCameraPreset('front'));
        if (btnIso) btnIso.addEventListener('click', () => applyCameraPreset('iso'));

        if (skeletonToggle) {
            skeletonToggle.addEventListener('change', (e) => {
                if (skeletonHelper) skeletonHelper.visible = e.target.checked;
            });
        }

        if (gridToggle) {
            gridToggle.addEventListener('change', (e) => {
                if (gridHelper) gridHelper.visible = e.target.checked;
            });
        }

    if (styleSelect) {
        styleSelect.addEventListener('change', (e) => {
            if (currentSkeleton) {
                buildCartoonCharacter(currentSkeleton, e.target.value);
            }
        });
    }

    // ==========================================================
    // PARKOUR & FIGHT ARENA UI & MODE SWITCHING
    // ==========================================================
    const tabParkour = document.getElementById('tab-parkour');
    const tabSolo = document.getElementById('tab-solo');
    const tabFight = document.getElementById('tab-fight');
    const soloPanel = document.getElementById('solo-panel');
    const fightPanel = document.getElementById('fight-panel');
    const parkourPanel = document.getElementById('parkour-panel');

    const parkourStyleSelect = document.getElementById('parkour-style-select');
    const parkourActionSelect = document.getElementById('parkour-action-select');
    const parkourSpeedSlider = document.getElementById('parkour-speed-slider');
    const parkourSpeedVal = document.getElementById('parkour-speed-val');
    const parkourViewSide = document.getElementById('parkour-view-side');
    const parkourViewIso = document.getElementById('parkour-view-iso');
    const parkourViewFront = document.getElementById('parkour-view-front');

    if (tabParkour) {
        tabParkour.addEventListener('click', () => switchViewerMode('parkour'));
    }
    if (parkourActionSelect) {
        parkourActionSelect.addEventListener('change', (e) => {
            setParkourAction(e.target.value);
        });
    }
    if (parkourStyleSelect) {
        parkourStyleSelect.addEventListener('change', (e) => {
            setParkourStyle(e.target.value);
        });
    }
    if (parkourSpeedSlider) {
        parkourSpeedSlider.addEventListener('input', (e) => {
            setParkourSpeed(parseFloat(e.target.value));
        });
    }
    if (parkourViewSide) parkourViewSide.addEventListener('click', () => applyParkourCamera('side'));
    if (parkourViewIso) parkourViewIso.addEventListener('click', () => applyParkourCamera('iso'));
    if (parkourViewFront) parkourViewFront.addEventListener('click', () => applyParkourCamera('front'));

    const playFightBtn = document.getElementById('play-fight-btn');
    const fightLoopToggle = document.getElementById('fight-loop-toggle');
    const fxToggle = document.getElementById('fx-toggle');
    const fighter1StyleSelect = document.getElementById('fighter1-style');
    const fightSpeedSelect = document.getElementById('fight-speed');
    const fightStatusText = document.getElementById('fight-status-text');

    const btnPunch = document.getElementById('btn-action-punch');
    const btnBlock = document.getElementById('btn-action-block');
    const btnKick = document.getElementById('btn-action-kick');
    const btnSweep = document.getElementById('btn-action-sweep');
    const btnFlip = document.getElementById('btn-action-flip');
    const btnKnockback = document.getElementById('btn-action-knockback');
    const btnFlurry = document.getElementById('btn-action-flurry');
    const btnFightReset = document.getElementById('btn-fight-reset');

    const tabTeacher = document.getElementById('tab-teacher');
    const teacherPanel = document.getElementById('teacher-panel');

    if (tabSolo && tabFight) {
        tabSolo.addEventListener('click', () => switchViewerMode('solo'));
        tabFight.addEventListener('click', () => switchViewerMode('fight'));
    }
    if (tabTeacher) {
        tabTeacher.addEventListener('click', () => switchViewerMode('teacher'));
    }

    const tabAnimal = document.getElementById('tab-animal');
    if (tabAnimal) {
        tabAnimal.addEventListener('click', () => switchViewerMode('animal'));
    }

    // Animal Studio UI hooks
    const animalSpeciesSelect = document.getElementById('animal-species-select');
    const animalGaitSelect = document.getElementById('animal-gait-select');
    const animalCoatSelect = document.getElementById('animal-coat-select');
    const animalSkeletonToggle = document.getElementById('animal-skeleton-toggle');
    const animalMeshToggle = document.getElementById('animal-mesh-toggle');
    const animalSpeedSlider = document.getElementById('animal-speed-slider');
    const animalSpeedVal = document.getElementById('animal-speed-val');
    const animalViewSide = document.getElementById('animal-view-side');
    const animalViewFront = document.getElementById('animal-view-front');
    const animalViewIso = document.getElementById('animal-view-iso');

    if (animalSpeciesSelect) {
        animalSpeciesSelect.addEventListener('change', (e) => {
            currentAnimalSpecies = e.target.value;
            rebuildAnimalCharacter();
        });
    }
    if (animalGaitSelect) {
        animalGaitSelect.addEventListener('change', (e) => {
            setAnimalGait(e.target.value);
        });
    }
    if (animalCoatSelect) {
        animalCoatSelect.addEventListener('change', (e) => {
            currentAnimalCoat = e.target.value;
            rebuildAnimalCharacter();
        });
    }
    if (animalSkeletonToggle) {
        animalSkeletonToggle.addEventListener('change', (e) => {
            if (animalSkeletonHelper) animalSkeletonHelper.visible = e.target.checked;
        });
    }
    if (animalMeshToggle) {
        animalMeshToggle.addEventListener('change', (e) => {
            if (currentAnimalMeshGroup) currentAnimalMeshGroup.visible = e.target.checked;
        });
    }
    if (animalSpeedSlider) {
        animalSpeedSlider.addEventListener('input', (e) => {
            animalSpeedMultiplier = parseFloat(e.target.value);
            if (animalSpeedVal) animalSpeedVal.textContent = `${animalSpeedMultiplier.toFixed(2)}x`;
        });
    }
    if (animalViewSide) animalViewSide.addEventListener('click', () => applyAnimalCamera('side'));
    if (animalViewFront) animalViewFront.addEventListener('click', () => applyAnimalCamera('front'));
    if (animalViewIso) animalViewIso.addEventListener('click', () => applyAnimalCamera('iso'));

    // Teacher UI hooks
    const lessonSelect = document.getElementById('lesson-select');
    const teacherStyleSelect = document.getElementById('teacher-style-select');
    const btnTeacherPrev = document.getElementById('btn-teacher-prev');
    const btnTeacherPlay = document.getElementById('btn-teacher-play');
    const btnTeacherNext = document.getElementById('btn-teacher-next');
    const btnReplaySpeech = document.getElementById('btn-replay-speech');
    const teacherVoiceToggle = document.getElementById('teacher-voice-toggle');
    const teacherChalkToggle = document.getElementById('teacher-chalk-toggle');

    const btnTeacherWrite = document.getElementById('btn-teacher-write');
    const btnTeacherExplain = document.getElementById('btn-teacher-explain');
    const btnWalkLeft = document.getElementById('btn-walk-left');
    const btnWalkMid = document.getElementById('btn-walk-mid');
    const btnWalkRight = document.getElementById('btn-walk-right');

    if (lessonSelect) lessonSelect.addEventListener('change', (e) => loadTeacherLesson(e.target.value));
    if (teacherStyleSelect) teacherStyleSelect.addEventListener('change', (e) => rebuildTeacherAvatar(e.target.value));
    if (btnTeacherPrev) btnTeacherPrev.addEventListener('click', () => stepTeacherLesson(-1));
    if (btnTeacherNext) btnTeacherNext.addEventListener('click', () => stepTeacherLesson(1));
    if (btnTeacherPlay) btnTeacherPlay.addEventListener('click', () => toggleTeacherAutoPlay());
    if (btnReplaySpeech) btnReplaySpeech.addEventListener('click', () => speakCurrentTeacherStep());

    if (btnTeacherWrite) btnTeacherWrite.addEventListener('click', () => startTeacherWriting());
    if (btnTeacherExplain) btnTeacherExplain.addEventListener('click', () => triggerTeacherExplainGesture());
    if (btnWalkLeft) btnWalkLeft.addEventListener('click', () => walkTeacherTo(-5.8));
    if (btnWalkMid) btnWalkMid.addEventListener('click', () => walkTeacherTo(-1.2));
    if (btnWalkRight) btnWalkRight.addEventListener('click', () => walkTeacherTo(3.2));

    if (playFightBtn) playFightBtn.addEventListener('click', () => playFullFightCombo());
    if (btnPunch) btnPunch.addEventListener('click', () => triggerSingleMove('punch'));
    if (btnBlock) btnBlock.addEventListener('click', () => triggerSingleMove('block'));
    if (btnKick) btnKick.addEventListener('click', () => triggerSingleMove('kick'));
    if (btnSweep) btnSweep.addEventListener('click', () => triggerSingleMove('sweep'));
    if (btnFlip) btnFlip.addEventListener('click', () => triggerSingleMove('flip'));
    if (btnKnockback) btnKnockback.addEventListener('click', () => triggerSingleMove('knockback'));
    if (btnFlurry) btnFlurry.addEventListener('click', () => triggerSingleMove('flurry'));
    if (btnFightReset) btnFightReset.addEventListener('click', () => resetFightersToStance());

    // Sidebar Hide/Show Controls Toggle
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => toggleSidebar());
    }
    if (btnCloseSidebar) {
        btnCloseSidebar.addEventListener('click', () => toggleSidebar(false));
    }

    // Keyboard shortcut 'H' to toggle sidebar
    window.addEventListener('keydown', (e) => {
        if (e.key === 'h' || e.key === 'H') {
            const tag = document.activeElement?.tagName;
            if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
                toggleSidebar();
            }
        }
    });

    window.addEventListener('resize', onWindowResize);
} catch (e) {
    console.warn('setupUIEvents error:', e);
}
}

function toggleSidebar(forceOpen) {
    const uiOverlay = document.getElementById('ui-overlay');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    if (!uiOverlay) return;

    const willCollapse = forceOpen !== undefined ? !forceOpen : !uiOverlay.classList.contains('collapsed');

    if (willCollapse) {
        uiOverlay.classList.add('collapsed');
        document.body.classList.add('sidebar-hidden');
        if (toggleBtn) {
            toggleBtn.innerHTML = '<span class="toggle-icon">▶</span><span class="toggle-label">Show Controls</span>';
            toggleBtn.title = "Show Controls Sidebar (Shortcut: H)";
        }
    } else {
        uiOverlay.classList.remove('collapsed');
        document.body.classList.remove('sidebar-hidden');
        if (toggleBtn) {
            toggleBtn.innerHTML = '<span class="toggle-icon">◀</span><span class="toggle-label">Hide Controls</span>';
            toggleBtn.title = "Hide Controls Sidebar (Shortcut: H)";
        }
    }
}

// =========================================================================
// TWO-CHARACTER COMBAT ARENA & ALAN BECKER FIGHT CHOREOGRAPHY ENGINE
// =========================================================================

function switchViewerMode(mode) {
    currentMode = mode;

    const tabParkour = document.getElementById('tab-parkour');
    const tabSolo = document.getElementById('tab-solo');
    const tabFight = document.getElementById('tab-fight');
    const tabTeacher = document.getElementById('tab-teacher');
    const tabAnimal = document.getElementById('tab-animal');
    const parkourPanel = document.getElementById('parkour-panel');
    const soloPanel = document.getElementById('solo-panel');
    const fightPanel = document.getElementById('fight-panel');
    const teacherPanel = document.getElementById('teacher-panel');
    const animalPanel = document.getElementById('animal-panel');
    const blackboardOverlay = document.getElementById('blackboard-overlay-container');

    tabParkour?.classList.remove('active');
    tabSolo?.classList.remove('active');
    tabFight?.classList.remove('active');
    tabTeacher?.classList.remove('active');
    tabAnimal?.classList.remove('active');
    if (parkourPanel) parkourPanel.style.display = 'none';
    if (soloPanel) soloPanel.style.display = 'none';
    if (fightPanel) fightPanel.style.display = 'none';
    if (teacherPanel) teacherPanel.style.display = 'none';
    if (animalPanel) animalPanel.style.display = 'none';
    if (blackboardOverlay) blackboardOverlay.style.display = 'none';
    if (parkourTelemetryOverlay) parkourTelemetryOverlay.style.display = 'none';

    // Hide all sub-systems first
    if (mixer) mixer.timeScale = 0;
    if (boneGroup) boneGroup.visible = false;
    if (cartoonCharacterGroup) cartoonCharacterGroup.visible = false;
    if (skeletonHelper) skeletonHelper.visible = false;
    if (fightArenaGroup) fightArenaGroup.visible = false;
    if (teacherClassroomGroup) teacherClassroomGroup.visible = false;
    if (animalStudioGroup) animalStudioGroup.visible = false;
    if (parkourStudioGroup) parkourStudioGroup.visible = false;

    // Purge any dynamically scripted custom user characters or props on mode change
    if (customStudioGroup) {
        while (customStudioGroup.children.length > 0) {
            const obj = customStudioGroup.children[0];
            customStudioGroup.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        }
    }

    if (mode === 'parkour') {
        tabParkour?.classList.add('active');
        if (parkourPanel) parkourPanel.style.display = 'flex';

        if (gridHelper) {
            gridHelper.visible = true;
            gridHelper.position.y = -6.5;
        }
        if (groundPlaneMesh) {
            groundPlaneMesh.position.y = -6.51;
            groundPlaneMesh.visible = true;
        }

        initParkourStudio();
        if (parkourStudioGroup) parkourStudioGroup.visible = true;

        applyParkourCamera('side');
    } else if (mode === 'fight') {
        tabFight?.classList.add('active');
        if (fightPanel) fightPanel.style.display = 'flex';

        // Floor grid at Y=0 for combat ring and fighters
        if (gridHelper) {
            gridHelper.visible = true;
            gridHelper.position.y = 0;
        }
        if (groundPlaneMesh) {
            groundPlaneMesh.position.y = -0.001;
            groundPlaneMesh.visible = true;
        }

        // Init and show Fight Arena
        initFightArena();
        if (fightArenaGroup) fightArenaGroup.visible = true;

        // Position camera for cinematic fight arena
        camera.position.set(0, 11, 26);
        if (controls) {
            controls.target.copy(originalCameraTarget);
            controls.update();
        }
    } else if (mode === 'teacher') {
        tabTeacher?.classList.add('active');
        if (teacherPanel) teacherPanel.style.display = 'flex';
        if (blackboardOverlay) blackboardOverlay.style.display = 'block';

        // Teacher mode has full 3D polished classroom floor; hide wire grid and place shadow receiver at Y=0
        if (gridHelper) {
            gridHelper.visible = false;
            gridHelper.position.y = 0;
        }
        if (groundPlaneMesh) {
            groundPlaneMesh.position.y = 0.001;
            groundPlaneMesh.visible = true;
        }

        // Init and show 3D Math Classroom & Teacher
        initMathTeacherClassroom();
        if (teacherClassroomGroup) teacherClassroomGroup.visible = true;

        // Position camera perfectly framing teacher and blackboard
        camera.position.set(-0.5, 9.2, 22.0);
        if (controls) {
            controls.target.set(0.5, 8.5, 0);
            controls.update();
        }
        loadTeacherLesson(document.getElementById('lesson-select')?.value || 'quadratic');
    } else if (mode === 'animal') {
        tabAnimal?.classList.add('active');
        if (animalPanel) animalPanel.style.display = 'flex';

        if (gridHelper) {
            gridHelper.visible = true;
            gridHelper.position.y = -16.2;
        }
        if (groundPlaneMesh) {
            groundPlaneMesh.position.y = -16.21;
            groundPlaneMesh.visible = true;
        }

        initAnimalStudio();
        if (animalStudioGroup) animalStudioGroup.visible = true;

        applyAnimalCamera('side');
    } else {
        tabSolo?.classList.add('active');
        if (soloPanel) soloPanel.style.display = 'flex';

        if (gridHelper) {
            gridHelper.visible = true;
            gridHelper.position.y = -16.2;
        }
        if (groundPlaneMesh) {
            groundPlaneMesh.position.y = -16.21;
            groundPlaneMesh.visible = true;
        }

        if (boneGroup) boneGroup.visible = true;
        if (cartoonCharacterGroup) cartoonCharacterGroup.visible = true;
        if (skeletonHelper) skeletonHelper.visible = skeletonToggle ? skeletonToggle.checked : false;
        if (mixer) {
            mixer.timeScale = parseFloat(speedSlider?.value || 1.0);
            if (statusText) {
                statusText.textContent = currentAction ? `Playing ${animSelect?.value === 'run' ? 'Run' : 'Walk'}.` : 'Playing Walk.';
                statusText.style.color = '#38bdf8';
            }
        } else {
            if (statusText) {
                statusText.textContent = 'Loading MoCap...';
                statusText.style.color = '#f59e0b';
            }
        }

        applyCameraPreset('side');
    }
}

// =========================================================================
// 🏃‍♂️ THE PHYSICS OF PARKOUR (ALAN BECKER 3D KINEMATICS ENGINE)
// =========================================================================

const PARKOUR_STICKMAN_PALETTES = {
    stickman_orange: 0xff6f00,
    stickman_black: 0x141416,
    stickman_red: 0xff2a2a,
    stickman_blue: 0x2979ff,
    stickman_green: 0x00e676,
    stickman_yellow: 0xfbbf24,
    stickman_white: 0xffffff,
    white: 0xffffff,
    stickman_purple: 0xa855f7,
    stickman_cyan: 0x06b6d4,
    hero: 0x38bdf8
};

function createParkourStickmanRig(material) {
    const rig = {
        group: new THREE.Group(),
        spine: null,
        head: null,
        lArm: null,
        lElb: null,
        lHand: null,
        rArm: null,
        rElb: null,
        rHand: null,
        lLeg: null,
        lKnee: null,
        rLeg: null,
        rKnee: null,
        mat: material
    };

    // Creates a seamless stroke limb where cylinder and spherical end-caps have identical radius
    function createSeamlessLimb(radius, len) {
        const limbGroup = new THREE.Group();
        
        // Central smooth cylinder (smooth shading)
        const cylGeom = new THREE.CylinderGeometry(radius, radius, len, 24, 1, false);
        const cylMesh = new THREE.Mesh(cylGeom, material);
        cylMesh.position.y = -len / 2;
        cylMesh.castShadow = true;
        limbGroup.add(cylMesh);

        // Top spherical pivot cap with EXACT matching radius
        const sphereGeom = new THREE.SphereGeometry(radius, 24, 24);
        const topCap = new THREE.Mesh(sphereGeom, material);
        topCap.castShadow = true;
        limbGroup.add(topCap);

        // Bottom spherical pivot cap with EXACT matching radius
        const botCap = new THREE.Mesh(sphereGeom, material);
        botCap.position.y = -len;
        botCap.castShadow = true;
        limbGroup.add(botCap);

        return limbGroup;
    }

    const TORSO_R = 0.44;
    const ARM_R = 0.28;
    const LEG_R = 0.30;
    const spineLen = 2.2;
    const neckLen = 0.8;
    const shoulderSpan = 0.85;
    const hipSpan = 0.54;

    // Pelvis base cap
    const pelvisGeom = new THREE.SphereGeometry(TORSO_R, 24, 24);
    const pelvisMesh = new THREE.Mesh(pelvisGeom, material);
    rig.group.add(pelvisMesh);

    // Spine & Torso (Single continuous wider stroke)
    rig.spine = new THREE.Group();
    const spineCyl = new THREE.Mesh(new THREE.CylinderGeometry(TORSO_R * 1.05, TORSO_R * 0.95, spineLen, 24, 1, false), material);
    spineCyl.position.y = spineLen / 2;
    spineCyl.castShadow = true;
    rig.spine.add(spineCyl);

    const chestCap = new THREE.Mesh(new THREE.SphereGeometry(TORSO_R * 1.05, 24, 24), material);
    chestCap.position.y = spineLen;
    rig.spine.add(chestCap);

    // Wider Athletic Shoulder / Clavicle Yoke
    const clavicleGeom = new THREE.CylinderGeometry(TORSO_R * 0.72, TORSO_R * 0.72, shoulderSpan * 2, 24, 1, false);
    const clavicleMesh = new THREE.Mesh(clavicleGeom, material);
    clavicleMesh.rotation.x = Math.PI / 2;
    clavicleMesh.position.y = spineLen - 0.15;
    clavicleMesh.castShadow = true;
    rig.spine.add(clavicleMesh);

    // Neck
    const neckCyl = new THREE.Mesh(new THREE.CylinderGeometry(TORSO_R * 0.78, TORSO_R * 0.78, neckLen, 24, 1, false), material);
    neckCyl.position.y = spineLen + neckLen / 2;
    rig.spine.add(neckCyl);

    const headBaseCap = new THREE.Mesh(new THREE.SphereGeometry(TORSO_R * 0.78, 24, 24), material);
    headBaseCap.position.y = spineLen + neckLen;
    rig.spine.add(headBaseCap);

    // Alan Becker Smooth Ring Head
    const headR = 1.30;
    rig.head = new THREE.Mesh(new THREE.TorusGeometry(headR, 0.32, 24, 48), material);
    rig.head.position.set(0, spineLen + neckLen + headR + 0.05, 0);
    rig.head.rotation.y = 0.12;
    rig.head.castShadow = true;
    rig.spine.add(rig.head);

    // --- Left Arm (Continuous Smooth Stroke with Wider Shoulder Span) ---
    rig.lArm = new THREE.Group();
    rig.lArm.position.set(0, spineLen - 0.15, shoulderSpan);
    const lUpArm = createSeamlessLimb(ARM_R, 2.2);
    rig.lArm.add(lUpArm);

    rig.lElb = new THREE.Group();
    rig.lElb.position.set(0, -2.2, 0);
    const lForeArm = createSeamlessLimb(ARM_R, 2.0);
    rig.lElb.add(lForeArm);

    // Reference node for hand tracking
    const lHandNode = new THREE.Group();
    lHandNode.position.set(0, -2.0, 0);
    rig.lHand = lHandNode;
    rig.lElb.add(lHandNode);
    rig.lArm.add(rig.lElb);
    rig.spine.add(rig.lArm);

    // --- Right Arm (Continuous Smooth Stroke with Wider Shoulder Span) ---
    rig.rArm = new THREE.Group();
    rig.rArm.position.set(0, spineLen - 0.15, -shoulderSpan);
    const rUpArm = createSeamlessLimb(ARM_R, 2.2);
    rig.rArm.add(rUpArm);

    rig.rElb = new THREE.Group();
    rig.rElb.position.set(0, -2.2, 0);
    const rForeArm = createSeamlessLimb(ARM_R, 2.0);
    rig.rElb.add(rForeArm);

    const rHandNode = new THREE.Group();
    rHandNode.position.set(0, -2.0, 0);
    rig.rHand = rHandNode;
    rig.rElb.add(rHandNode);
    rig.rArm.add(rig.rElb);
    rig.spine.add(rig.rArm);

    rig.group.add(rig.spine);

    // --- Left Leg (Continuous Smooth Stroke) ---
    rig.lLeg = new THREE.Group();
    rig.lLeg.position.set(0, 0, hipSpan);
    const lThigh = createSeamlessLimb(LEG_R, 2.6);
    rig.lLeg.add(lThigh);

    rig.lKnee = new THREE.Group();
    rig.lKnee.position.set(0, -2.6, 0);
    const lCalf = createSeamlessLimb(LEG_R, 2.6);
    rig.lKnee.add(lCalf);

    // Smooth rounded foot
    const lFootGroup = new THREE.Group();
    lFootGroup.position.set(0.35, -2.6, 0);
    const lFootCyl = new THREE.Mesh(new THREE.CylinderGeometry(LEG_R * 0.85, LEG_R * 0.85, 0.9, 20), material);
    lFootCyl.rotation.z = Math.PI / 2;
    lFootGroup.add(lFootCyl);
    const lToeCap = new THREE.Mesh(new THREE.SphereGeometry(LEG_R * 0.85, 20, 20), material);
    lToeCap.position.x = 0.45;
    lFootGroup.add(lToeCap);
    const lHeelCap = new THREE.Mesh(new THREE.SphereGeometry(LEG_R * 0.85, 20, 20), material);
    lHeelCap.position.x = -0.45;
    lFootGroup.add(lHeelCap);
    rig.lKnee.add(lFootGroup);

    rig.lLeg.add(rig.lKnee);
    rig.group.add(rig.lLeg);

    // --- Right Leg (Continuous Smooth Stroke) ---
    rig.rLeg = new THREE.Group();
    rig.rLeg.position.set(0, 0, -hipSpan);
    const rThigh = createSeamlessLimb(LEG_R, 2.6);
    rig.rLeg.add(rThigh);

    rig.rKnee = new THREE.Group();
    rig.rKnee.position.set(0, -2.6, 0);
    const rCalf = createSeamlessLimb(LEG_R, 2.6);
    rig.rKnee.add(rCalf);

    const rFootGroup = new THREE.Group();
    rFootGroup.position.set(0.35, -2.6, 0);
    const rFootCyl = new THREE.Mesh(new THREE.CylinderGeometry(LEG_R * 0.85, LEG_R * 0.85, 0.9, 20), material);
    rFootCyl.rotation.z = Math.PI / 2;
    rFootGroup.add(rFootCyl);
    const rToeCap = new THREE.Mesh(new THREE.SphereGeometry(LEG_R * 0.85, 20, 20), material);
    rToeCap.position.x = 0.45;
    rFootGroup.add(rToeCap);
    const rHeelCap = new THREE.Mesh(new THREE.SphereGeometry(LEG_R * 0.85, 20, 20), material);
    rHeelCap.position.x = -0.45;
    rFootGroup.add(rHeelCap);
    rig.rKnee.add(rFootGroup);

    rig.rLeg.add(rig.rKnee);
    rig.group.add(rig.rLeg);

    return rig;
}

/**
 * Generates a high-definition dual-sport procedural court texture for the playground arena:
 * - Front Track (Z: -5 to +7): Polished honey maple hardwood basketball court with key, 3-point arc & center crest
 * - Back Track (Z: -17 to -5): High-tech graphite Tartan sprint track with cyan distance yard markings
 * - Center dividing strip with glowing dashed boundary
 */
function createParkourCourtTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // 1. Dark Stadium Floor Surround
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, 2048, 1024);

    // 2. Zone 1: Polished Maple Hardwood Basketball Court (Bottom Half: Y = 512 to 980)
    ctx.save();
    ctx.beginPath();
    ctx.rect(48, 512, 1952, 470);
    ctx.clip();

    ctx.fillStyle = '#d4934f';
    ctx.fillRect(48, 512, 1952, 470);

    const plankH = 38;
    const plankW = 220;
    const rows = 470 / plankH;
    for (let r = 0; r < rows; r++) {
        const y = 512 + r * plankH;
        const rowOffset = (r % 2) * (plankW * 0.5);
        for (let x = 48 - rowOffset; x < 2000 + plankW; x += plankW) {
            const seed = Math.abs(Math.sin(r * 15.17 + x * 83.41) * 31415.9);
            const toneVar = Math.floor((seed % 1) * 26) - 13;
            ctx.fillStyle = `rgb(${212 + toneVar}, ${147 + Math.floor(toneVar * 0.8)}, ${79 + Math.floor(toneVar * 0.5)})`;
            ctx.fillRect(x, y, plankW, plankH);

            // Subtle wood grain
            ctx.strokeStyle = 'rgba(110, 55, 18, 0.14)';
            ctx.lineWidth = 1;
            for (let g = 8; g < plankH; g += 10) {
                ctx.beginPath();
                ctx.moveTo(x, y + g);
                ctx.lineTo(x + plankW, y + g);
                ctx.stroke();
            }

            ctx.strokeStyle = '#945822';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(x, y, plankW, plankH);
        }
    }

    // Specular varnish sheen
    const woodGrad = ctx.createLinearGradient(48, 512, 2000, 982);
    woodGrad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
    woodGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
    woodGrad.addColorStop(1, 'rgba(255, 255, 255, 0.12)');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(48, 512, 1952, 470);

    // Basketball Court Markings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(64, 528, 1920, 438);

    // Half-court line
    ctx.beginPath();
    ctx.moveTo(1024, 528);
    ctx.lineTo(1024, 966);
    ctx.stroke();

    // Center Circle
    ctx.beginPath();
    ctx.arc(1024, 747, 120, 0, Math.PI * 2);
    ctx.stroke();

    // Basketball Paint / Key Area on right side (under hoop at X = 7.2)
    ctx.fillStyle = 'rgba(37, 99, 235, 0.85)';
    ctx.fillRect(1480, 630, 480, 234);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(1480, 630, 480, 234);

    // Free Throw Circle
    ctx.beginPath();
    ctx.arc(1480, 747, 117, -Math.PI / 2, Math.PI / 2, true);
    ctx.stroke();
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.arc(1480, 747, 117, Math.PI / 2, -Math.PI / 2, true);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3-Point Arc
    ctx.beginPath();
    ctx.arc(1800, 747, 340, Math.PI * 0.65, Math.PI * 1.35);
    ctx.stroke();

    // Center Court Crest
    ctx.fillStyle = 'rgba(56, 189, 248, 0.92)';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ XTRA ANIM ARENA', 1024, 758);
    ctx.restore();

    // 3. Zone 2: Parkour Synthetic Tartan Sprint Track (Upper Half: Y = 42 to 490)
    ctx.save();
    ctx.beginPath();
    ctx.rect(48, 42, 1952, 450);
    ctx.clip();

    ctx.fillStyle = '#182234';
    ctx.fillRect(48, 42, 1952, 450);

    // Tartan stipple texture
    ctx.fillStyle = '#0f172a';
    for (let i = 0; i < 600; i++) {
        const sx = 48 + Math.random() * 1952;
        const sy = 42 + Math.random() * 450;
        ctx.fillRect(sx, sy, 4, 4);
    }

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 4;
    ctx.strokeRect(64, 58, 1920, 418);

    // Running Lane Divider
    ctx.setLineDash([20, 15]);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(64, 267);
    ctx.lineTo(1984, 267);
    ctx.stroke();
    ctx.setLineDash([]);

    // Distance Markers
    const markers = [
        { x: 180, label: 'START [-14M]' },
        { x: 520, label: 'ACCEL [-9M]' },
        { x: 860, label: 'TAKEOFF [-3M]' },
        { x: 1200, label: '⚡ VAULT [0M]' },
        { x: 1540, label: 'LANDING [+6M]' },
        { x: 1840, label: 'FINISH [+12M]' }
    ];

    markers.forEach(m => {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(m.x, 58);
        ctx.lineTo(m.x, 476);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 22px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(m.label, m.x, 92);
        ctx.fillText(m.label, m.x, 455);
    });

    // Vault Zone Box
    ctx.fillStyle = 'rgba(6, 182, 212, 0.18)';
    ctx.fillRect(1080, 58, 260, 418);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(1080, 58, 260, 418);

    ctx.restore();

    // 4. Center Dividing Luminous Strip
    ctx.fillStyle = '#0b111e';
    ctx.fillRect(48, 492, 1952, 20);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.setLineDash([28, 20]);
    ctx.beginPath();
    ctx.moveTo(48, 502);
    ctx.lineTo(2000, 502);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Outer Court Border Glow
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.95)';
    ctx.lineWidth = 8;
    ctx.strokeRect(32, 26, 1984, 972);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    return texture;
}

function createParkourPlaygroundArena() {
    const group = new THREE.Group();

    // 1. High-Res Dual-Sport Court Floor (54m x 30m centered at X = 0, Z = -5, Y = -6.49)
    const courtTexture = createParkourCourtTexture();
    const courtMat = new THREE.MeshStandardMaterial({
        map: courtTexture,
        roughness: 0.35,
        metalness: 0.10
    });
    const courtMesh = new THREE.Mesh(new THREE.PlaneGeometry(54, 30), courtMat);
    courtMesh.rotation.x = -Math.PI / 2;
    courtMesh.position.set(0, -6.49, -5);
    courtMesh.receiveShadow = true;
    group.add(courtMesh);

    // 2. Beveled Metallic Arena Baseboard Curb
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 0.3, metalness: 0.8 });
    const curbNorth = new THREE.Mesh(new THREE.BoxGeometry(54.4, 0.4, 0.6), curbMat);
    curbNorth.position.set(0, -6.3, -20.2);
    const curbSouth = new THREE.Mesh(new THREE.BoxGeometry(54.4, 0.4, 0.6), curbMat);
    curbSouth.position.set(0, -6.3, 10.2);
    const curbWest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 30.6), curbMat);
    curbWest.position.set(-27.2, -6.3, -5);
    const curbEast = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 30.6), curbMat);
    curbEast.position.set(27.2, -6.3, -5);
    group.add(curbNorth, curbSouth, curbWest, curbEast);

    // 3. Frosted Tempered Glass Boundary Barriers (Height = 1.8m)
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.22,
        roughness: 0.05,
        metalness: 0.25
    });

    const railMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.2,
        metalness: 0.85
    });

    function createBarrierSegment(length, isZAxis) {
        const segGroup = new THREE.Group();
        const glassGeom = isZAxis ? new THREE.BoxGeometry(0.12, 1.8, length) : new THREE.BoxGeometry(length, 1.8, 0.12);
        const glass = new THREE.Mesh(glassGeom, glassMat);
        glass.position.y = 0.9;
        segGroup.add(glass);

        // Glowing Neon Top Handrail Tube
        const railGeom = isZAxis ? new THREE.CylinderGeometry(0.08, 0.08, length, 16) : new THREE.CylinderGeometry(0.08, 0.08, length, 16);
        const rail = new THREE.Mesh(railGeom, railMat);
        if (isZAxis) rail.rotation.x = Math.PI / 2;
        else rail.rotation.z = Math.PI / 2;
        rail.position.y = 1.82;
        segGroup.add(rail);

        return segGroup;
    }

    const barrierNorth = createBarrierSegment(54, false);
    barrierNorth.position.set(0, -6.48, -20);
    const barrierSouth = createBarrierSegment(54, false);
    barrierSouth.position.set(0, -6.48, 10);
    const barrierWest = createBarrierSegment(30, true);
    barrierWest.position.set(-27, -6.48, -5);
    const barrierEast = createBarrierSegment(30, true);
    barrierEast.position.set(27, -6.48, -5);
    group.add(barrierNorth, barrierSouth, barrierWest, barrierEast);

    // 4. Four Futuristic Corner Stadium Light Towers
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
    const corners = [
        { x: -26.5, z: -19.5, lightTarget: [-8, -6, -10], col: 0x38bdf8 },
        { x:  26.5, z: -19.5, lightTarget: [ 8, -6, -10], col: 0x38bdf8 },
        { x: -26.5, z:   9.5, lightTarget: [-8, -6,   0], col: 0xf97316 },
        { x:  26.5, z:   9.5, lightTarget: [ 8, -6,   0], col: 0xf97316 }
    ];

    corners.forEach(c => {
        const tower = new THREE.Group();
        tower.position.set(c.x, -6.48, c.z);

        // Mast
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 10, 16), towerMat);
        mast.position.y = 5.0;
        tower.add(mast);

        // Light head luminaire
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), towerMat);
        head.position.y = 10.2;
        tower.add(head);

        // LED Face
        const ledFace = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshBasicMaterial({ color: c.col }));
        ledFace.position.set(0, 10.0, 0.61);
        tower.add(ledFace);

        // Soft spotlight aiming at the court
        const spot = new THREE.SpotLight(c.col, 1.2, 45, Math.PI / 3.5, 0.4, 1.0);
        spot.position.set(c.x, 8.0, c.z);
        spot.target.position.set(c.lightTarget[0], c.lightTarget[1], c.lightTarget[2]);
        group.add(spot);
        group.add(spot.target);

        group.add(tower);
    });

    return group;
}

function initParkourStudio() {
    if (parkourStudioGroup) {
        setParkourStyle(parkourCurrentStyle);
        if (parkourCompanionEnabled) {
            setupParkourCompanion(true, parkourCompanionStyle, parkourCompanionAction, parkourCompanionOffsetZ, parkourCompanionSpeed);
        }
        return;
    }

    parkourStudioGroup = new THREE.Group();
    scene.add(parkourStudioGroup);

    // Build Beautiful Playground Arena with Boundary Rails & Stadium Lighting
    parkourPlaygroundGroup = createParkourPlaygroundArena();
    parkourStudioGroup.add(parkourPlaygroundGroup);

    const col = PARKOUR_STICKMAN_PALETTES[parkourCurrentStyle] || PARKOUR_STICKMAN_PALETTES.stickman_orange;

    parkourStickMat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.25,
        metalness: 0.15
    });

    // 1. Primary Stickman Rig
    parkourPrimaryRig = createParkourStickmanRig(parkourStickMat);
    parkourStudioGroup.add(parkourPrimaryRig.group);

    // Expose aliases for compatibility
    parkourStickmanGroup = parkourPrimaryRig.group;
    parkourSpineGroup = parkourPrimaryRig.spine;
    parkourHeadMesh = parkourPrimaryRig.head;
    parkourLArmGroup = parkourPrimaryRig.lArm;
    parkourLElbGroup = parkourPrimaryRig.lElb;
    parkourLHandMesh = parkourPrimaryRig.lHand;
    parkourRArmGroup = parkourPrimaryRig.rArm;
    parkourRElbGroup = parkourPrimaryRig.rElb;
    parkourRHandMesh = parkourPrimaryRig.rHand;
    parkourLLegGroup = parkourPrimaryRig.lLeg;
    parkourLKneeGroup = parkourPrimaryRig.lKnee;
    parkourRLegGroup = parkourPrimaryRig.rLeg;
    parkourRKneeGroup = parkourPrimaryRig.rKnee;

    // Obstacle Box Hurdle (High-tech glass hurdle with glowing neon edges)
    const hurdleGeom = new THREE.BoxGeometry(3.0, 4.0, 3.0);
    const hurdleMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.9
    });
    parkourHurdleMesh = new THREE.Mesh(hurdleGeom, hurdleMat);
    parkourHurdleMesh.position.set(1.5, -4.5, 0);

    const edges = new THREE.EdgesGeometry(hurdleGeom);
    const edgeLines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 }));
    parkourHurdleMesh.add(edgeLines);
    parkourStudioGroup.add(parkourHurdleMesh);

    // 3. 3D Basketball Mesh (Textured Orange Sphere with 3 Black Ribbed Seams)
    const ballGeom = new THREE.SphereGeometry(0.72, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        roughness: 0.38,
        metalness: 0.12
    });
    parkourBasketballMesh = new THREE.Mesh(ballGeom, ballMat);
    const seamMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
    const seamX = new THREE.Mesh(new THREE.TorusGeometry(0.725, 0.025, 12, 48), seamMat);
    const seamY = new THREE.Mesh(new THREE.TorusGeometry(0.725, 0.025, 12, 48), seamMat);
    seamY.rotation.x = Math.PI / 2;
    const seamZ = new THREE.Mesh(new THREE.TorusGeometry(0.725, 0.025, 12, 48), seamMat);
    seamZ.rotation.y = Math.PI / 2;
    parkourBasketballMesh.add(seamX, seamY, seamZ);
    parkourBasketballMesh.position.set(-11.0, -1.2, 0.8);
    parkourStudioGroup.add(parkourBasketballMesh);

    // 4. 3D Basketball Hoop & Stanchion Group (Positioned at NBA regulation clearance)
    parkourHoopGroup = new THREE.Group();
    parkourHoopGroup.position.set(0, 0, 0);

    // Main Support Pole (Heavy steel stanchion anchored well back at x = 12.0)
    const poleGeom = new THREE.CylinderGeometry(0.30, 0.35, 11.0, 20);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.set(12.0, -1.0, 0);
    parkourHoopGroup.add(pole);

    // Base Crash Pad
    const padGeom = new THREE.BoxGeometry(1.6, 3.2, 1.6);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 });
    const pad = new THREE.Mesh(padGeom, padMat);
    pad.position.set(12.0, -4.9, 0);
    parkourHoopGroup.add(pad);

    // Overhang Boom Arm extending forward from pole (12.0, 4.2) to backboard (8.6, 3.4)
    const boomGeom = new THREE.CylinderGeometry(0.22, 0.24, 4.6, 16);
    const boom = new THREE.Mesh(boomGeom, poleMat);
    boom.rotation.z = Math.PI / 2.75;
    boom.position.set(10.3, 3.8, 0);
    parkourHoopGroup.add(boom);

    // Backboard Frame & Frosted Acrylic Board at x = 8.6
    const boardGeom = new THREE.BoxGeometry(0.12, 3.2, 4.6);
    const boardMat = new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.65,
        roughness: 0.05,
        metalness: 0.15
    });
    parkourBackboardMesh = new THREE.Mesh(boardGeom, boardMat);
    parkourBackboardMesh.position.set(8.6, 3.1, 0);

    // Outer Backboard White Border
    const boardEdges = new THREE.EdgesGeometry(boardGeom);
    const boardBorder = new THREE.LineSegments(boardEdges, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
    parkourBackboardMesh.add(boardBorder);

    // Inner Target Square (Orange Outline)
    const targetGeom = new THREE.BoxGeometry(0.13, 1.1, 1.5);
    const targetEdges = new THREE.EdgesGeometry(targetGeom);
    const targetSquare = new THREE.LineSegments(targetEdges, new THREE.LineBasicMaterial({ color: 0xf97316, linewidth: 2 }));
    targetSquare.position.set(0, -0.2, 0);
    parkourBackboardMesh.add(targetSquare);
    parkourHoopGroup.add(parkourBackboardMesh);

    // Breakaway Steel Rim (Torus lying flat on X-Z plane at x = 7.2)
    const rimGeom = new THREE.TorusGeometry(1.05, 0.09, 16, 36);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xff4500, roughness: 0.3, metalness: 0.6 });
    parkourRimMesh = new THREE.Mesh(rimGeom, rimMat);
    parkourRimMesh.rotation.x = Math.PI / 2;
    parkourRimMesh.position.set(7.2, 2.35, 0);
    parkourHoopGroup.add(parkourRimMesh);

    // Rim Mounting Bracket to Backboard (from x = 7.2 to x = 8.6)
    const bracketGeom = new THREE.BoxGeometry(1.4, 0.25, 0.4);
    const bracket = new THREE.Mesh(bracketGeom, rimMat);
    bracket.position.set(7.9, 2.35, 0);
    parkourHoopGroup.add(bracket);

    // Woven Basketball Net (Tapered Cylinder with wireframe lattice at x = 7.2)
    const netGeom = new THREE.CylinderGeometry(1.02, 0.52, 1.7, 18, 6, true);
    const netMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        wireframe: true,
        roughness: 0.6,
        transparent: true,
        opacity: 0.85
    });
    parkourNetMesh = new THREE.Mesh(netGeom, netMat);
    parkourNetMesh.position.set(7.2, 1.5, 0);
    parkourHoopGroup.add(parkourNetMesh);

    parkourStudioGroup.add(parkourHoopGroup);

    // Dynamic Drop Shadow Plane
    const shadowGeom = new THREE.PlaneGeometry(3.2, 3.2);
    const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.65
    });
    parkourShadowPlane = new THREE.Mesh(shadowGeom, shadowMat);
    parkourShadowPlane.rotation.x = -Math.PI / 2;
    parkourShadowPlane.position.set(0, -6.48, 0);
    parkourStudioGroup.add(parkourShadowPlane);

    // Hero Power Fist Sparkler Light
    parkourFistLight = new THREE.PointLight(0xfbbf24, 0, 12);
    parkourStudioGroup.add(parkourFistLight);

    setParkourAction(parkourCurrentAction);

    if (parkourCompanionEnabled) {
        setupParkourCompanion(true, parkourCompanionStyle, parkourCompanionAction, parkourCompanionOffsetZ, parkourCompanionSpeed);
    }

    parkourStartTime = performance.now();
}

function setupParkourCompanion(enabled, style = 'stickman_white', action = 'hurdle_vault', offsetZ = -10, speed = 0.35) {
    parkourCompanionEnabled = !!enabled;
    parkourCompanionStyle = style;
    parkourCompanionAction = action;
    parkourCompanionOffsetZ = offsetZ;
    parkourCompanionSpeed = Math.max(0.05, Math.min(2.0, parseFloat(speed) || 0.35));

    if (!parkourStudioGroup) return;

    if (!parkourCompanionEnabled) {
        if (parkourCompanionRig?.group) parkourCompanionRig.group.visible = false;
        if (parkourCompanionHurdleMesh) parkourCompanionHurdleMesh.visible = false;
        if (parkourCompanionShadowPlane) parkourCompanionShadowPlane.visible = false;
        return;
    }

    const col = PARKOUR_STICKMAN_PALETTES[style] || PARKOUR_STICKMAN_PALETTES.stickman_white || 0xffffff;
    if (!parkourCompanionMat) {
        parkourCompanionMat = new THREE.MeshStandardMaterial({
            color: col,
            roughness: 0.25,
            metalness: 0.15
        });
    } else {
        parkourCompanionMat.color.setHex(col);
    }

    if (!parkourCompanionRig) {
        parkourCompanionRig = createParkourStickmanRig(parkourCompanionMat);
        parkourStudioGroup.add(parkourCompanionRig.group);
    }
    parkourCompanionRig.group.visible = true;

    // Companion Obstacle Hurdle
    if (!parkourCompanionHurdleMesh) {
        const hurdleGeom = new THREE.BoxGeometry(3.0, 4.0, 3.0);
        const hurdleMat = new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: 0.55,
            roughness: 0.1,
            metalness: 0.9
        });
        parkourCompanionHurdleMesh = new THREE.Mesh(hurdleGeom, hurdleMat);
        const edges = new THREE.EdgesGeometry(hurdleGeom);
        const edgeLines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 }));
        parkourCompanionHurdleMesh.add(edgeLines);
        parkourStudioGroup.add(parkourCompanionHurdleMesh);
    }
    parkourCompanionHurdleMesh.position.set(1.5, -4.5, parkourCompanionOffsetZ);
    parkourCompanionHurdleMesh.visible = (parkourCompanionAction === 'hurdle_vault');

    // Companion Drop Shadow Plane
    if (!parkourCompanionShadowPlane) {
        const shadowGeom = new THREE.PlaneGeometry(3.2, 3.2);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.65
        });
        parkourCompanionShadowPlane = new THREE.Mesh(shadowGeom, shadowMat);
        parkourCompanionShadowPlane.rotation.x = -Math.PI / 2;
        parkourStudioGroup.add(parkourCompanionShadowPlane);
    }
    parkourCompanionShadowPlane.position.set(0, -6.48, parkourCompanionOffsetZ);
    parkourCompanionShadowPlane.visible = true;
}

function setParkourAction(action) {
    parkourCurrentAction = (action === 'dance') ? 'dance' : ((action === 'hurdle_vault') ? 'hurdle_vault' : 'basketball_dunk');
    const isDunk = (parkourCurrentAction === 'basketball_dunk');
    const isDance = (parkourCurrentAction === 'dance');
    if (parkourHoopGroup) parkourHoopGroup.visible = isDunk;
    if (parkourBasketballMesh) parkourBasketballMesh.visible = isDunk;
    if (parkourHurdleMesh) parkourHurdleMesh.visible = (!isDunk && !isDance);

    const actSel = document.getElementById('parkour-action-select');
    if (actSel && actSel.value !== parkourCurrentAction) actSel.value = parkourCurrentAction;

    parkourStartTime = performance.now();
}

function setParkourStyle(styleName) {
    parkourCurrentStyle = styleName;
    const col = PARKOUR_STICKMAN_PALETTES[styleName] || PARKOUR_STICKMAN_PALETTES.stickman_orange;
    if (parkourStickMat) {
        parkourStickMat.color.setHex(col);
    }
    const sel = document.getElementById('parkour-style-select');
    if (sel && sel.value !== styleName) sel.value = styleName;
}

function setParkourSpeed(speed) {
    parkourSpeedFactor = Math.max(0.05, Math.min(2.0, parseFloat(speed) || 0.28));
    const slider = document.getElementById('parkour-speed-slider');
    const val = document.getElementById('parkour-speed-val');
    if (slider) slider.value = parkourSpeedFactor;
    if (val) val.textContent = parkourSpeedFactor.toFixed(2) + 'x';
}

function enableParkourTelemetry(enabled) {
    parkourShowTelemetry = !!enabled;
    if (parkourTelemetryOverlay) {
        parkourTelemetryOverlay.style.display = (currentMode === 'parkour' && parkourShowTelemetry) ? 'flex' : 'none';
        if (!parkourShowTelemetry) {
            parkourTelemetryOverlay.remove();
            parkourTelemetryOverlay = null;
        }
    }
    if (!parkourShowTelemetry) {
        const badge = document.getElementById('parkour-telemetry-badge');
        if (badge) badge.remove();
    }
}

function removeParkourHUD() {
    enableParkourTelemetry(false);
}

function applyParkourCamera(preset) {
    if (!camera || !controls) return;
    const PARKOUR_CAMERAS = {
        side:            { pos: new THREE.Vector3(0.5, 3.2, 30),   target: new THREE.Vector3(1.2, 0.5, -5) },
        iso:             { pos: new THREE.Vector3(18, 12, 22),     target: new THREE.Vector3(0, 0, -5) },
        front:           { pos: new THREE.Vector3(26, 3, -5),      target: new THREE.Vector3(0, 0, -5) },
        chase:           { pos: new THREE.Vector3(-22, 6, -5),     target: new THREE.Vector3(2, 0, -5) },
        back:            { pos: new THREE.Vector3(-22, 6, -5),     target: new THREE.Vector3(2, 0, -5) },
        top:             { pos: new THREE.Vector3(0, 38, -5),      target: new THREE.Vector3(0, -1, -5) },
        bird:            { pos: new THREE.Vector3(0, 38, -5),      target: new THREE.Vector3(0, -1, -5) },
        overhead:        { pos: new THREE.Vector3(0, 38, -5),      target: new THREE.Vector3(0, -1, -5) },
        cinematic:       { pos: new THREE.Vector3(6.5, -0.5, 14),  target: new THREE.Vector3(4.5, 2.0, -5) },
        dunk:            { pos: new THREE.Vector3(9, 3, 10),       target: new THREE.Vector3(7.2, 2.5, 0) },
        wide:            { pos: new THREE.Vector3(0, 7.5, 38),     target: new THREE.Vector3(0, 0, -5) },
        // White Stickman Foreground Viewpoints (Z < -10)
        white_side:      { pos: new THREE.Vector3(0.5, 3.2, -30),  target: new THREE.Vector3(1.2, 0.5, -5) },
        white_iso:       { pos: new THREE.Vector3(18, 10, -26),    target: new THREE.Vector3(0, 0, -5) },
        white_cinematic: { pos: new THREE.Vector3(6.5, 0.5, -20),  target: new THREE.Vector3(3.5, 2.0, -5) },
        reverse:         { pos: new THREE.Vector3(18, 10, -26),    target: new THREE.Vector3(0, 0, -5) }
    };
    const cfg = PARKOUR_CAMERAS[preset] || PARKOUR_CAMERAS.side;
    camera.position.copy(cfg.pos);
    controls.target.copy(cfg.target);
    controls.update();

    ['parkour-view-side', 'parkour-view-iso', 'parkour-view-front'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    document.getElementById(`parkour-view-${preset}`)?.classList.add('active');
}

function updateParkourTelemetryHUD(frame, posX, posY, phaseName) {
    if (!parkourShowTelemetry || currentMode !== 'parkour') {
        if (parkourTelemetryOverlay) {
            parkourTelemetryOverlay.remove();
            parkourTelemetryOverlay = null;
        }
        return;
    }
    if (!parkourTelemetryOverlay) {
        parkourTelemetryOverlay = document.createElement('div');
        parkourTelemetryOverlay.id = 'parkour-telemetry-badge';
        parkourTelemetryOverlay.style.cssText = 'position: absolute; top: 16px; left: 16px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 8px; padding: 6px 12px; display: flex; align-items: center; gap: 10px; font-family: "Fira Code", monospace; font-size: 11px; font-weight: 700; color: #38bdf8; box-shadow: 0 4px 16px rgba(0,0,0,0.4); pointer-events: none; z-index: 100;';
        document.getElementById('canvas-container')?.appendChild(parkourTelemetryOverlay);
    }
    parkourTelemetryOverlay.style.display = 'flex';
    parkourTelemetryOverlay.innerHTML = `<span style="color: #f59e0b; display:inline-block; width:8px; height:8px; border-radius:50%; background:#f59e0b; box-shadow:0 0 8px #f59e0b;"></span><span>KINEMATICS • FR:${String(frame).padStart(3, '0')}</span><span style="color:rgba(255,255,255,0.3);">|</span><span style="color:#94a3b8; font-size:10px;">${phaseName}</span>`;
}

function computeParkourKinematics(action, f) {
    let posX = -8, posY = -1.2, offsetZ = 0;
    let rotX = 0, rotY = 0, rotZ = 0;
    let spineTiltX = 0, spineTiltY = 0, spineTiltZ = 0;
    let headRotX = 0, headRotY = 0.12, headRotZ = 0;
    let lThighRot = 0, lKneeRot = 0, rThighRot = 0, rKneeRot = 0;
    let lLegRotX = 0, rLegRotX = 0;
    let lArmRotX = 0, lArmRotY = 0, lArmRotZ = 0, lElbRot = 0;
    let rArmRotX = 0, rArmRotY = 0, rArmRotZ = 0, rElbRot = 0;
    let phaseName = 'PHASE 1: SPRINT';
    let fistLightIntensity = 0;
    let fistLightPos = null;

    if (action === 'dance') {
        const beat = (f / 65);
        if (f < 65) {
            phaseName = 'STAGE DANCE: RHYTHMIC GROOVE & HIP SWAY';
            const cad = (f / 65) * Math.PI * 4;
            posX = 0;
            posY = -1.2 + Math.abs(Math.sin(cad)) * 0.45;
            spineTiltZ = Math.sin(cad) * 0.22;
            spineTiltX = Math.cos(cad * 2) * 0.08;
            lThighRot = Math.sin(cad) * 0.35;
            rThighRot = -Math.sin(cad) * 0.35;
            lKneeRot = -Math.abs(Math.sin(cad)) * 0.55;
            rKneeRot = -Math.abs(Math.cos(cad)) * 0.55;
            lArmRotZ = 0.8 + Math.sin(cad) * 0.65;
            rArmRotZ = 0.8 - Math.sin(cad) * 0.65;
            lElbRot = 0.9 + Math.cos(cad) * 0.45;
            rElbRot = 0.9 - Math.cos(cad) * 0.45;
            headRotZ = -Math.sin(cad) * 0.15;
            headRotY = Math.sin(cad * 0.5) * 0.2;
        } else if (f < 130) {
            phaseName = 'STAGE DANCE: WAVE ARMS & SIDE STEP';
            const t = (f - 65) / 65;
            const cad = t * Math.PI * 4;
            posX = Math.sin(t * Math.PI * 2) * 2.2;
            posY = -1.2 + Math.abs(Math.sin(cad)) * 0.5;
            spineTiltZ = Math.sin(cad) * 0.28;
            lArmRotZ = 1.35 + Math.sin(cad * 2) * 0.45;
            rArmRotZ = 1.35 - Math.sin(cad * 2) * 0.45;
            lArmRotY = Math.sin(cad) * 0.35;
            rArmRotY = -Math.sin(cad) * 0.35;
            lElbRot = 0.55 + Math.sin(cad) * 0.35;
            rElbRot = 0.55 - Math.sin(cad) * 0.35;
            lThighRot = Math.sin(cad) * 0.4;
            rThighRot = -Math.sin(cad) * 0.4;
            lKneeRot = -Math.abs(Math.sin(cad)) * 0.6;
            rKneeRot = -Math.abs(Math.cos(cad)) * 0.6;
            headRotZ = -Math.sin(cad) * 0.2;
        } else if (f < 195) {
            phaseName = 'STAGE DANCE: RHYTHMIC KICK TAPS & CROSSED ARMS';
            const t = (f - 130) / 65;
            const cad = t * Math.PI * 4;
            posX = 0;
            posY = -1.2 + Math.abs(Math.sin(cad)) * 0.55;
            lThighRot = Math.sin(cad) * 0.65;
            rThighRot = -Math.sin(cad) * 0.65;
            lKneeRot = (lThighRot > 0 ? -0.85 : -0.15);
            rKneeRot = (rThighRot > 0 ? -0.85 : -0.15);
            lArmRotZ = 0.45 + Math.sin(cad) * 0.4;
            rArmRotZ = 0.45 + Math.cos(cad) * 0.4;
            lElbRot = 1.45;
            rElbRot = 1.45;
            spineTiltZ = Math.sin(cad) * 0.18;
            headRotZ = Math.sin(cad * 2) * 0.15;
        } else {
            phaseName = 'STAGE DANCE: 360° SPIN & HERO POSE';
            const t = (f - 195) / 65;
            if (t < 0.72) {
                const spinT = t / 0.72;
                rotY = spinT * Math.PI * 2;
                posX = 0;
                posY = -1.2 + Math.sin(spinT * Math.PI) * 1.4;
                lArmRotZ = 1.25;
                rArmRotZ = 1.25;
                lElbRot = 0.6;
                rElbRot = 0.6;
                lThighRot = 0.3;
                rThighRot = -0.3;
                lKneeRot = -0.5;
                rKneeRot = -0.5;
            } else {
                rotY = 0;
                posX = 0;
                posY = -1.2;
                spineTiltZ = 0.15;
                lArmRotZ = 1.55;
                rArmRotZ = -0.35;
                lElbRot = 0.2;
                rElbRot = 1.25;
                lThighRot = 0.35;
                rThighRot = -0.35;
                lKneeRot = -0.4;
                rKneeRot = -0.4;
            }
        }
    } else if (action === 'basketball_dunk') {
        if (f < 42) {
            phaseName = 'PHASE 1: FASTBREAK SPRINT & TWO-HANDED GATHER';
            const t = f / 42;
            posX = -14.0 + t * 11.0;
            const cad = t * 7.5;
            const bounce = Math.abs(Math.sin(cad)) * 0.45;
            posY = -1.2 + bounce;
            spineTiltZ = -0.32;
            const stride = Math.sin(cad);
            lThighRot = stride * 0.95;
            rThighRot = -stride * 0.95;
            lKneeRot = (stride < 0 ? -Math.abs(stride) * 1.55 : -0.15 - stride * 0.25);
            rKneeRot = (stride > 0 ? -Math.abs(stride) * 1.55 : -0.15 - Math.abs(stride) * 0.25);
            
            const dribbleCycle = (f % 14) / 14;
            const armPush = Math.sin(dribbleCycle * Math.PI * 2);
            
            if (f < 32) {
                // Right hand dribble, left arm natural sprint pump
                lArmRotZ = -stride * 0.85;
                lArmRotY = 0;
                lElbRot = 0.85;
                rArmRotZ = 0.60 + armPush * 0.25;
                rArmRotY = 0.12;
                rElbRot = 0.90 + armPush * 0.20;
            } else {
                // Two-handed gather: Left hand reaches over and both hands cup the ball symmetrically
                const gT = (f - 32) / 10;
                lArmRotZ = (-stride * 0.85) * (1 - gT) + 0.70 * gT;
                lArmRotY = -0.25 * gT;
                lElbRot = 0.85 * (1 - gT) + 0.90 * gT;
                rArmRotZ = (0.60 + armPush * 0.25) * (1 - gT) + 0.70 * gT;
                rArmRotY = 0.12 * (1 - gT) + 0.25 * gT;
                rElbRot = (0.90 + armPush * 0.20) * (1 - gT) + 0.90 * gT;
            }
        } else if (f < 72) {
            const t = (f - 42) / 30;
            if (t < 0.35) {
                phaseName = 'PHASE 2: TWO-HANDED GATHER & JUMP LAUNCH';
                const launchT = t / 0.35;
                posX = -3.0;
                posY = -1.2 + Math.sin(launchT * Math.PI * 0.5) * 2.8;
                spineTiltZ = -0.15 + launchT * 0.20;
                lThighRot = 0.35 * launchT;
                lKneeRot = -1.15 * launchT;
                rThighRot = 0.25 * launchT;
                rKneeRot = -1.25 * launchT;
                
                // Both arms rise together in complete symmetry holding the ball with both hands
                lArmRotZ = 0.70 + launchT * 0.65;
                rArmRotZ = 0.70 + launchT * 0.65;
                lArmRotY = -0.25 * (1 - launchT) - 0.18 * launchT;
                rArmRotY = 0.25 * (1 - launchT) + 0.18 * launchT;
                lElbRot = 0.90 * (1 - launchT) + 0.15 * launchT;
                rElbRot = 0.90 * (1 - launchT) + 0.15 * launchT;
            } else if (t < 0.75) {
                phaseName = 'PHASE 2: TWO-HANDED HIGH RELEASE & FOLLOW-THROUGH';
                const descT = (t - 0.35) / 0.40;
                posX = -3.0;
                posY = -1.2 + Math.cos(descT * Math.PI * 0.5) * 2.8;
                spineTiltZ = 0.05;
                lThighRot = 0.35 * (1 - descT) + 0.20 * descT;
                lKneeRot = -1.15 * (1 - descT) - 0.35 * descT;
                rThighRot = 0.25 * (1 - descT) + 0.20 * descT;
                rKneeRot = -1.25 * (1 - descT) - 0.35 * descT;
                
                // Symmetrical two-handed follow-through (both wrists and arms extended pointing to rim)
                lArmRotZ = 1.35;
                rArmRotZ = 1.35;
                lArmRotY = -0.18;
                rArmRotY = 0.18;
                lElbRot = 0.15;
                rElbRot = 0.15;
            } else {
                phaseName = 'PHASE 2: GROUND TOUCHDOWN';
                const landT = (t - 0.75) / 0.25;
                posX = -3.0;
                const dip = Math.sin(landT * Math.PI) * 0.45;
                posY = -1.2 - dip;
                spineTiltZ = 0.05 - dip * 0.25;
                lThighRot = 0.20 + dip * 0.65;
                lKneeRot = -0.35 - dip * 1.10;
                rThighRot = 0.20 + dip * 0.65;
                rKneeRot = -0.35 - dip * 1.10;
                lArmRotZ = 1.35 * (1 - landT) + 0.40 * landT;
                rArmRotZ = 1.35 * (1 - landT) + 0.40 * landT;
                lArmRotY = -0.18 * (1 - landT);
                rArmRotY = 0.18 * (1 - landT);
                lElbRot = 0.15 + 0.50 * landT;
                rElbRot = 0.15 + 0.50 * landT;
            }
        } else if (f < 96) {
            phaseName = 'PHASE 3: WATCHING BALL SWISH';
            const t = (f - 72) / 24;
            posX = -3.0 + t * 1.5;
            posY = -1.2;
            spineTiltZ = 0.04;
            headRotZ = -0.15;
            lThighRot = 0.10;
            rThighRot = -0.10;
            lKneeRot = -0.12;
            rKneeRot = -0.12;
            lArmRotZ = 0.35;
            rArmRotZ = 0.35;
            lArmRotY = -0.15;
            rArmRotY = 0.15;
            lElbRot = 0.65;
            rElbRot = 0.65;
        } else if (f < 130) {
            phaseName = 'PHASE 4: APPROACH & PICK UP BASKETBALL';
            const t = (f - 96) / 34;
            if (t < 0.55) {
                // Jog towards the ball under the basket
                const jogT = t / 0.55;
                posX = -1.5 + jogT * 6.9; // reaches ~5.4
                const cad = jogT * 6.0;
                posY = -1.2 + Math.abs(Math.sin(cad)) * 0.25;
                const stride = Math.sin(cad);
                lThighRot = stride * 0.65;
                rThighRot = -stride * 0.65;
                lKneeRot = (stride < 0 ? -Math.abs(stride) * 1.0 : -0.15);
                rKneeRot = (stride > 0 ? -Math.abs(stride) * 1.0 : -0.15);
                lArmRotZ = -stride * 0.55;
                rArmRotZ = stride * 0.55;
                lArmRotY = 0;
                rArmRotY = 0;
                lElbRot = 0.70;
                rElbRot = 0.70;
            } else {
                // Bend down and gather ball off the floor, then stand up
                const pickT = (t - 0.55) / 0.45;
                posX = 5.4 + pickT * 0.4;
                const crouch = Math.sin(pickT * Math.PI);
                posY = -1.2 - crouch * 1.35;
                spineTiltZ = -crouch * 0.52;
                headRotZ = crouch * 0.25;
                lThighRot = crouch * 0.75;
                rThighRot = crouch * 0.65;
                lKneeRot = -crouch * 1.40;
                rKneeRot = -crouch * 1.30;
                lArmRotZ = crouch * 1.35 + (1 - crouch) * 0.60;
                rArmRotZ = crouch * 1.35 + (1 - crouch) * 0.60;
                lElbRot = 0.35 + (1 - crouch) * 0.75;
                rElbRot = 0.35 + (1 - crouch) * 0.75;
                lArmRotY = -0.32;
                rArmRotY = 0.32;
            }
        } else {
            phaseName = 'PHASE 5: SLOW-MOTION WALK BACK TO START LINE';
            const t = (f - 130) / 130;
            posX = 5.8 - t * 19.8; // smoothly walks back from 5.8 to -14.0
            
            // Turn around smoothly
            if (t < 0.08) {
                rotY = (t / 0.08) * Math.PI;
            } else if (t > 0.92) {
                rotY = Math.PI - ((t - 0.92) / 0.08) * Math.PI;
            } else {
                rotY = Math.PI;
            }

            // Real human slow-motion walking gait (inverted pendulum)
            // 5 complete, deliberate walking step cycles over the 20m distance
            const walkCad = t * Math.PI * 10.0;
            const stride = Math.sin(walkCad);
            
            // Subtle vertical pelvic bobbing (highest at mid-stance, lowest at double-support)
            const walkBob = Math.cos(walkCad * 2.0) * 0.08;
            posY = -1.2 + walkBob;
            spineTiltZ = 0.02;
            spineTiltY = Math.sin(walkCad) * 0.05; // slight pelvic twist

            // Natural leg swing & knee flexion during walk
            lThighRot = stride * 0.42;
            rThighRot = -stride * 0.42;
            
            // Stance leg is straight; swing leg flexes softly
            const lSwing = Math.max(0, -stride);
            const rSwing = Math.max(0, stride);
            lKneeRot = -0.06 - lSwing * 0.65;
            rKneeRot = -0.06 - rSwing * 0.65;

            // Holding the basketball calmly in two hands at waist height in slow motion
            const ballWalkBob = walkBob * 0.35;
            lArmRotZ = 0.65 + ballWalkBob;
            rArmRotZ = 0.65 + ballWalkBob;
            lArmRotY = -0.30;
            rArmRotY = 0.30;
            lElbRot = 1.05;
            rElbRot = 1.05;
            headRotZ = 0;
            headRotY = 0.12;
            
            // Smoothly lower basketball to right-hand ready dribble stance as Orange nears -14.0
            if (t > 0.88) {
                const trans = (t - 0.88) / 0.12;
                rArmRotZ = 0.65 * (1 - trans) + 0.60 * trans;
                rElbRot = 1.05 * (1 - trans) + 0.90 * trans;
                lArmRotZ = 0.65 * (1 - trans) + 0.35 * trans;
                lArmRotY = -0.30 * (1 - trans);
                rArmRotY = 0.30 * (1 - trans) + 0.12 * trans;
            }
        }
    } else {
        // hurdle_vault
        if (f < 55) {
            phaseName = 'PHASE 1: SPRINT STRIDE';
            const t = f / 55;
            posX = -11.0 + t * 8.5;
            const cad = f * 0.44;
            const bounce = Math.abs(Math.sin(cad)) * 0.55;
            posY = -1.2 + bounce;
            spineTiltZ = -0.28;
            const stride = Math.sin(cad);
            lThighRot = stride * 0.85;
            rThighRot = -stride * 0.85;
            lKneeRot = (stride < 0 ? -Math.abs(stride) * 1.55 : -0.15 - stride * 0.25);
            rKneeRot = (stride > 0 ? -Math.abs(stride) * 1.55 : -0.15 - Math.abs(stride) * 0.25);
            lArmRotZ = -stride * 0.80;
            rArmRotZ = stride * 0.80;
            lElbRot = 0.85 + (stride < 0 ? -stride * 0.35 : -stride * 0.15);
            rElbRot = 0.85 + (stride > 0 ? stride * 0.35 : stride * 0.15);
        } else if (f < 70) {
            phaseName = 'PHASE 2: SPRING CROUCH';
            const t = (f - 55) / 15;
            posX = -2.5 + t * 0.7;
            const dip = Math.sin(t * Math.PI);
            posY = -1.2 - dip * 0.85;
            spineTiltZ = -0.42 * (1 - t) - 0.15 * t;
            lThighRot = 0.75 * dip;
            rThighRot = 0.65 * dip;
            lKneeRot = -1.45 * dip;
            rKneeRot = -1.35 * dip;
            lArmRotZ = -0.85 * (1 - t) + 1.25 * t;
            rArmRotZ = -0.85 * (1 - t) + 1.25 * t;
            lElbRot = 0.95;
            rElbRot = 0.95;
        } else if (f < 135) {
            phaseName = 'PHASE 3: 360° AERIAL VAULT';
            const t = (f - 70) / 65;
            posX = -1.8 + t * 9.2;
            const apex = 7.4;
            posY = -1.2 + Math.sin(t * Math.PI) * apex;
            rotZ = -t * Math.PI * 2;
            spineTiltZ = -0.55 * Math.sin(t * Math.PI);
            lThighRot = 1.15 * Math.sin(t * Math.PI);
            rThighRot = 1.05 * Math.sin(t * Math.PI);
            lKneeRot = -1.65 * Math.sin(t * Math.PI);
            rKneeRot = -1.55 * Math.sin(t * Math.PI);
            lArmRotZ = 1.45 * Math.sin(t * Math.PI);
            rArmRotZ = 1.45 * Math.sin(t * Math.PI);
            lElbRot = 0.85;
            rElbRot = 0.85;
        } else if (f < 155) {
            phaseName = 'PHASE 4: LANDING BUFFER';
            const t = (f - 135) / 20;
            posX = 7.4 + t * 0.6;
            const dip = Math.sin(t * Math.PI);
            posY = -1.2 - dip * 0.55;
            rotZ = 0;
            spineTiltZ = -0.35 * (1 - t);
            lThighRot = 0.45 * dip;
            rThighRot = 0.45 * dip;
            lKneeRot = -0.95 * dip;
            rKneeRot = -0.95 * dip;
            lArmRotZ = 0.75 * (1 - t);
            rArmRotZ = 0.75 * (1 - t);
            lElbRot = 0.85;
            rElbRot = 0.85;
        } else {
            phaseName = 'PHASE 5: SLOW-MOTION WALK BACK TO START TRACK';
            const t = (f - 155) / 105;
            posX = 8.0 - t * 19.0; // returns calmly to -11.0
            offsetZ = Math.sin(t * Math.PI) * 1.8; // smoothly walks around the hurdle box
            
            if (t < 0.08) {
                rotY = (t / 0.08) * Math.PI;
            } else if (t > 0.92) {
                rotY = Math.PI - ((t - 0.92) / 0.08) * Math.PI;
            } else {
                rotY = Math.PI;
            }

            // Real slow-motion walking gait (calm, natural human walking strides)
            const walkCad = t * Math.PI * 9.0;
            const stride = Math.sin(walkCad);
            const walkBob = Math.cos(walkCad * 2.0) * 0.08;
            posY = -1.2 + walkBob;
            rotZ = 0;
            spineTiltZ = 0.02;
            spineTiltY = Math.sin(walkCad) * 0.05;

            // Leg swings & soft knee bends
            lThighRot = stride * 0.42;
            rThighRot = -stride * 0.42;
            const lSwing = Math.max(0, -stride);
            const rSwing = Math.max(0, stride);
            lKneeRot = -0.06 - lSwing * 0.65;
            rKneeRot = -0.06 - rSwing * 0.65;

            // Relaxed, slow-motion alternating arm swings
            lArmRotZ = -stride * 0.32;
            rArmRotZ = stride * 0.32;
            lArmRotY = 0;
            rArmRotY = 0;
            lElbRot = 0.38 + Math.abs(stride) * 0.15;
            rElbRot = 0.38 + Math.abs(stride) * 0.15;
            headRotZ = 0;
            headRotY = 0.12;
        }
    }

    return {
        posX, posY, offsetZ, rotX, rotY, rotZ,
        spineTiltX, spineTiltY, spineTiltZ,
        headRotX, headRotY, headRotZ,
        lThighRot, lKneeRot, rThighRot, rKneeRot,
        lLegRotX, rLegRotX,
        lArmRotX, lArmRotY, lArmRotZ, lElbRot,
        rArmRotX, rArmRotY, rArmRotZ, rElbRot,
        phaseName,
        fistLightPos, fistLightIntensity
    };
}

function applyParkourPoseToRig(rig, pose, baseOffsetZ = 0) {
    if (!rig || !rig.group) return;
    const finalZ = baseOffsetZ + (pose.offsetZ || 0);
    rig.group.position.set(pose.posX, pose.posY, finalZ);
    rig.group.rotation.set(pose.rotX, pose.rotY, pose.rotZ);

    if (rig.spine) rig.spine.rotation.set(pose.spineTiltX, pose.spineTiltY, pose.spineTiltZ);
    if (rig.head) rig.head.rotation.set(pose.headRotX, pose.headRotY, pose.headRotZ);

    if (rig.lArm) rig.lArm.rotation.set(pose.lArmRotX, pose.lArmRotY, pose.lArmRotZ);
    if (rig.lElb) rig.lElb.rotation.z = pose.lElbRot;
    if (rig.rArm) rig.rArm.rotation.set(pose.rArmRotX, pose.rArmRotY, pose.rArmRotZ);
    if (rig.rElb) rig.rElb.rotation.z = pose.rElbRot;

    if (rig.lLeg) rig.lLeg.rotation.set(pose.lLegRotX, 0, pose.lThighRot);
    if (rig.lKnee) rig.lKnee.rotation.z = pose.lKneeRot;
    if (rig.rLeg) rig.rLeg.rotation.set(pose.rLegRotX, 0, pose.rThighRot);
    if (rig.rKnee) rig.rKnee.rotation.z = pose.rKneeRot;

    rig.group.updateMatrixWorld(true);
}

function updateParkourAnimation(delta, explicitElapsed) {
    if (!parkourPrimaryRig?.group && !parkourStickmanGroup) return;

    // Synchronized loop duration (260 frames for both athletes)
    const totalFrames = 260;
    const LOOP_DURATION = (totalFrames / 60) / parkourSpeedFactor;
    const elapsed = (typeof explicitElapsed === 'number') ? explicitElapsed : ((performance.now() - parkourStartTime) / 1000);
    const progress = (elapsed % LOOP_DURATION) / LOOP_DURATION;
    const f = progress * totalFrames;
    const frame = Math.floor(f);

    const primaryPose = computeParkourKinematics(parkourCurrentAction, f);
    applyParkourPoseToRig(parkourPrimaryRig, primaryPose, 0);

    const posX = primaryPose.posX;
    const posY = primaryPose.posY;
    const phaseName = primaryPose.phaseName;

    if (parkourFistLight) {
        if (primaryPose.fistLightPos) {
            parkourFistLight.position.set(primaryPose.fistLightPos[0], primaryPose.fistLightPos[1], primaryPose.fistLightPos[2]);
            parkourFistLight.intensity = primaryPose.fistLightIntensity;
        } else {
            parkourFistLight.intensity = 0;
        }
    }

    if (parkourRHandMesh) parkourRHandMesh.getWorldPosition(_pHandWorldPos);
    if (parkourLHandMesh) parkourLHandMesh.getWorldPosition(_pLHandWorldPos);

    // Basketball Physical Dynamics: Fastbreak Dribble -> Jump Shot -> Swish -> Rebound -> Pick up -> Carry Back
    if (parkourCurrentAction === 'basketball_dunk' && parkourBasketballMesh) {
        const handMidX = (_pHandWorldPos.x + _pLHandWorldPos.x) * 0.5;
        const handMidY = (_pHandWorldPos.y + _pLHandWorldPos.y) * 0.5;
        const handMidZ = (_pHandWorldPos.z + _pLHandWorldPos.z) * 0.5;

        if (f < 42) {
            // Phase 1: Fastbreak dribble on right side transitioning to two-handed gather
            const dribbleCycle = (f % 14) / 14;
            let bounceY = -4.75 + 1.65 * Math.sin(dribbleCycle * Math.PI);
            let ballX = posX + 1.15;
            let ballZ = -0.45;
            if (f >= 32) {
                const gatherT = (f - 32) / 10;
                ballX = ballX * (1 - gatherT) + (handMidX + 0.35) * gatherT;
                bounceY = bounceY * (1 - gatherT) + (handMidY + 0.15) * gatherT;
                ballZ = ballZ * (1 - gatherT) + handMidZ * gatherT;
            }
            parkourBasketballMesh.position.set(ballX, bounceY, ballZ);
            parkourBasketballMesh.rotation.x += delta * 18;
        } else if (f < 52) {
            // Phase 2: Held securely between BOTH forward shooting hands during jump launch
            const ballHoldX = handMidX + 0.35;
            const ballHoldY = handMidY + 0.15;
            const ballHoldZ = handMidZ;
            parkourBasketballMesh.position.set(ballHoldX, ballHoldY, ballHoldZ);
            parkourBasketballMesh.rotation.z -= delta * 8; // Gentle backspin in hands
        } else if (f < 76) {
            // Phase 2 (Two-Handed Release): Released directly from both fingertips forward towards hoop
            const throwT = (f - 52) / 24;
            const releaseX = 1.45; // Forward fingertip coordinate in front of shooter (X = -3.0)
            const releaseY = 3.35; // Apex release height
            const lobX = releaseX + throwT * (7.20 - releaseX); // Strictly forward motion (1.45m -> 7.20m)
            const lobY = releaseY * (1 - throwT) + 2.35 * throwT + Math.sin(throwT * Math.PI) * 2.20;
            parkourBasketballMesh.position.set(lobX, lobY, 0);
            parkourBasketballMesh.rotation.z -= delta * 14; // Pure symmetrical two-handed backspin
        } else if (f < 88) {
            // Phase 3: Swish cleanly through net
            const t = (f - 76) / 12;
            const netY = 2.35 - t * 2.45;
            parkourBasketballMesh.position.set(7.20, netY, 0);
            parkourBasketballMesh.rotation.x += delta * 20;

            if (parkourRimMesh) {
                parkourRimMesh.position.y = 2.35 - Math.sin(t * Math.PI * 2) * 0.16;
            }
            if (parkourNetMesh) {
                const swish = 1 + Math.sin(t * Math.PI) * 0.28;
                parkourNetMesh.scale.set(swish, 1, swish);
            }
        } else if (f < 118) {
            // Phase 3: Rebound bounce under the basket settling on court floor
            const t = (f - 88) / 30;
            const bTime = (f - 88) * 0.28;
            const bApex = Math.max(0, 1.8 - (f - 88) * 0.06);
            const bY = -5.10 + Math.abs(Math.sin(bTime)) * bApex;
            const bX = 7.20 - t * 1.40; // settles at 5.80
            parkourBasketballMesh.position.set(bX, bY, 0);
            parkourBasketballMesh.rotation.z -= delta * 5;
            if (parkourRimMesh) parkourRimMesh.position.y = 2.35;
            if (parkourNetMesh) parkourNetMesh.scale.set(1, 1, 1);
        } else if (f < 130) {
            // Phase 4: Orange bends down and gathers ball off the floor into hands
            const pickT = (f - 118) / 12;
            const floorX = 5.80;
            const floorY = -5.10;
            const ballX = floorX * (1 - pickT) + handMidX * pickT;
            const ballY = floorY * (1 - pickT) + handMidY * pickT;
            const ballZ = handMidZ * pickT;
            parkourBasketballMesh.position.set(ballX, ballY, ballZ);
        } else if (f < 255) {
            // Phase 5: Ball is securely carried in Orange's hands while walking back in slow motion
            parkourBasketballMesh.position.set(handMidX, handMidY, handMidZ);
            parkourBasketballMesh.rotation.x += delta * 2;
        } else {
            // Transition from hands to right dribble position for 2nd Attempt
            const transT = (f - 255) / 5;
            const targetX = posX + 1.15;
            const targetY = -4.75;
            const targetZ = -0.45;
            const ballX = handMidX * (1 - transT) + targetX * transT;
            const ballY = handMidY * (1 - transT) + targetY * transT;
            const ballZ = handMidZ * (1 - transT) + targetZ * transT;
            parkourBasketballMesh.position.set(ballX, ballY, ballZ);
        }
    }

    // Primary Shadow Plane
    if (parkourShadowPlane) {
        parkourShadowPlane.position.x = posX;
        const hRatio = Math.max(0, posY - (-1.2));
        const sScale = Math.max(0.35, 1 - hRatio / 8);
        parkourShadowPlane.scale.set(sScale, sScale, sScale);
        parkourShadowPlane.material.opacity = Math.max(0.2, 0.85 * (1 - hRatio / 9));
    }

    // 2. Companion Stickman Animation (if enabled on the same ground)
    if (parkourCompanionEnabled && parkourCompanionRig?.group) {
        const compTotalFrames = 260;
        const compLoopDuration = (compTotalFrames / 60) / parkourCompanionSpeed;
        const compProgress = (elapsed % compLoopDuration) / compLoopDuration;
        const compF = compProgress * compTotalFrames;

        const compPose = computeParkourKinematics(parkourCompanionAction, compF);
        applyParkourPoseToRig(parkourCompanionRig, compPose, parkourCompanionOffsetZ);

        if (parkourCompanionShadowPlane) {
            parkourCompanionShadowPlane.position.x = compPose.posX;
            parkourCompanionShadowPlane.position.z = parkourCompanionOffsetZ + (compPose.offsetZ || 0);
            const compHRatio = Math.max(0, compPose.posY - (-1.2));
            const compSScale = Math.max(0.35, 1 - compHRatio / 8);
            parkourCompanionShadowPlane.scale.set(compSScale, compSScale, compSScale);
            parkourCompanionShadowPlane.material.opacity = Math.max(0.2, 0.85 * (1 - compHRatio / 9));
        }
    }

    // Update Telemetry Badge Overlay
    updateParkourTelemetryHUD(frame, posX, posY, phaseName);
}

/**
 * Builds an authentic Alan Becker combat stick figure with full hierarchical bone nodes.
 * Symmetric body facing local +X direction.
 */
function createCombatFighter(styleName, startX, faceDir = 1) {
    const root = new THREE.Group();
    root.position.set(startX, 0, 0);

    const STICKMAN_PALETTES = {
        stickman_black: { body: 0x141416, isHollow: true },
        stickman_orange: { body: 0xff6f00, isHollow: false },
        stickman_red: { body: 0xff2a2a, isHollow: false },
        stickman_blue: { body: 0x2979ff, isHollow: false },
        stickman_green: { body: 0x00e676, isHollow: false }
    };
    const cfg = STICKMAN_PALETTES[styleName] || STICKMAN_PALETTES.stickman_orange;

    // High-end Quantized Cel-Shaded Toon Material
    const mat = new THREE.MeshToonMaterial({
        color: cfg.body,
        emissive: new THREE.Color(cfg.body).multiplyScalar(0.08)
    });

    const SPINE_R = 0.88;
    const LEG_R = 0.82;
    const ARM_R = 0.76;
    const NECK_R = 0.76;

    // Helper: smooth capsule segment between two positions
    function addCapsuleSegment(parent, p1, p2, radius) {
        const len = p1.distanceTo(p2);
        if (len < 0.01) return null;
        const geom = new THREE.CapsuleGeometry(radius, len, 16, 36);
        const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(mid);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }

    // Helper: add flush joint sphere
    function addJoint(parent, pos, radius) {
        const geom = new THREE.SphereGeometry(radius * 1.04, 32, 32);
        const sphere = new THREE.Mesh(geom, mat);
        sphere.position.copy(pos);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        parent.add(sphere);
        return sphere;
    }

    // --- Hierarchical Bone Structure (Facing +X) ---
    const hips = new THREE.Group();
    hips.position.set(0, 8.8, 0);
    root.add(hips);
    addJoint(hips, new THREE.Vector3(0, 0, 0), SPINE_R);

    // Spine & Torso
    const spine = new THREE.Group();
    hips.add(spine);
    const chest = new THREE.Group();
    chest.position.set(0, 3.2, 0);
    spine.add(chest);
    addCapsuleSegment(spine, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 3.2, 0), SPINE_R);
    addJoint(chest, new THREE.Vector3(0, 0, 0), SPINE_R);

    // Neck & Elliptical Head
    const neck = new THREE.Group();
    neck.position.set(0, 1.4, 0);
    chest.add(neck);
    addCapsuleSegment(neck, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.6, 0), NECK_R);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 3.4, 0);
    neck.add(headGroup);

    // Identical solid 3D elliptical head for both fighters (only color differs)
    const headSphere = new THREE.Mesh(new THREE.SphereGeometry(2.40, 48, 48), mat);
    headSphere.scale.set(0.88, 1.20, 0.88); // Iconic vertical elliptical head
    headSphere.castShadow = true;
    headGroup.add(headSphere);

    // Arms (Z+ is camera near side, Z- is far side)
    const rShoulder = new THREE.Group();
    rShoulder.position.set(0, 0.3, 1.05); // Near/lead arm
    chest.add(rShoulder);
    addJoint(rShoulder, new THREE.Vector3(0, 0, 0), ARM_R);

    const rElbow = new THREE.Group();
    rElbow.position.set(0, -2.6, 0);
    rShoulder.add(rElbow);
    addCapsuleSegment(rShoulder, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -2.6, 0), ARM_R);
    addJoint(rElbow, new THREE.Vector3(0, 0, 0), ARM_R);

    const rHand = new THREE.Group();
    rHand.position.set(0, -2.4, 0);
    rElbow.add(rHand);
    addCapsuleSegment(rElbow, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -2.4, 0), ARM_R);
    addJoint(rHand, new THREE.Vector3(0, 0, 0), ARM_R);

    const lShoulder = new THREE.Group();
    lShoulder.position.set(0, 0.3, -1.05); // Far/rear arm
    chest.add(lShoulder);
    addJoint(lShoulder, new THREE.Vector3(0, 0, 0), ARM_R);

    const lElbow = new THREE.Group();
    lElbow.position.set(0, -2.6, 0);
    lShoulder.add(lElbow);
    addCapsuleSegment(lShoulder, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -2.6, 0), ARM_R);
    addJoint(lElbow, new THREE.Vector3(0, 0, 0), ARM_R);

    const lHand = new THREE.Group();
    lHand.position.set(0, -2.4, 0);
    lElbow.add(lHand);
    addCapsuleSegment(lElbow, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -2.4, 0), ARM_R);
    addJoint(lHand, new THREE.Vector3(0, 0, 0), ARM_R);

    // Legs (Z+ is camera near leg, Z- is far leg)
    const rHip = new THREE.Group();
    rHip.position.set(0, -0.2, 0.75);
    hips.add(rHip);
    addJoint(rHip, new THREE.Vector3(0, 0, 0), LEG_R);

    const rKnee = new THREE.Group();
    rKnee.position.set(0, -4.3, 0);
    rHip.add(rKnee);
    addCapsuleSegment(rHip, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -4.3, 0), LEG_R);
    addJoint(rKnee, new THREE.Vector3(0, 0, 0), LEG_R);

    const rFoot = new THREE.Group();
    rFoot.position.set(0, -4.3, 0);
    rKnee.add(rFoot);
    addCapsuleSegment(rKnee, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -4.3, 0), LEG_R);
    addJoint(rFoot, new THREE.Vector3(0, 0, 0), LEG_R);

    const lHip = new THREE.Group();
    lHip.position.set(0, -0.2, -0.75);
    hips.add(lHip);
    addJoint(lHip, new THREE.Vector3(0, 0, 0), LEG_R);

    const lKnee = new THREE.Group();
    lKnee.position.set(0, -4.3, 0);
    lHip.add(lKnee);
    addCapsuleSegment(lHip, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -4.3, 0), LEG_R);
    addJoint(lKnee, new THREE.Vector3(0, 0, 0), LEG_R);

    const lFoot = new THREE.Group();
    lFoot.position.set(0, -4.3, 0);
    lKnee.add(lFoot);
    addCapsuleSegment(lKnee, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -4.3, 0), LEG_R);
    addJoint(lFoot, new THREE.Vector3(0, 0, 0), LEG_R);

    // Precise Orientation: faceDir > 0 faces +X (right), faceDir < 0 faces -X (left)
    if (faceDir < 0) {
        root.rotation.y = Math.PI; // Perfectly faces opponent on the left!
    } else {
        root.rotation.y = 0;       // Perfectly faces opponent on the right!
    }

    return {
        root,
        startX,
        faceDir,
        styleName,
        mat,
        bones: {
            hips, spine, chest, neck, headGroup,
            rShoulder, rElbow, rHand,
            lShoulder, lElbow, lHand,
            rHip, rKnee, rFoot,
            lHip, lKnee, lFoot
        },
        currentPose: {},
        applyPose(pose) {
            const b = this.bones;

            // Symmetrical forward translation: positive forwardX always moves toward opponent
            if (pose.forwardX !== undefined) {
                this.root.position.x = this.startX + (this.faceDir * pose.forwardX);
            }
            if (pose.rootY !== undefined) this.root.position.y = pose.rootY;
            if (pose.rootZ !== undefined) this.root.position.z = pose.rootZ;
            if (pose.rootRotZ !== undefined) this.root.rotation.z = this.faceDir * pose.rootRotZ;

            if (pose.hipsY !== undefined) b.hips.position.y = pose.hipsY;
            if (pose.spineRotZ !== undefined) b.spine.rotation.z = pose.spineRotZ;
            if (pose.spineRotX !== undefined) b.spine.rotation.x = pose.spineRotX;
            if (pose.chestRotY !== undefined) b.chest.rotation.y = pose.chestRotY;
            if (pose.neckRotZ !== undefined) b.neck.rotation.z = pose.neckRotZ;

            // Arms (Positive Z rotation reaches forward toward opponent)
            if (pose.rShRotZ !== undefined) b.rShoulder.rotation.z = pose.rShRotZ;
            if (pose.rShRotX !== undefined) b.rShoulder.rotation.x = pose.rShRotX;
            if (pose.rElRotZ !== undefined) b.rElbow.rotation.z = pose.rElRotZ;

            if (pose.lShRotZ !== undefined) b.lShoulder.rotation.z = pose.lShRotZ;
            if (pose.lShRotX !== undefined) b.lShoulder.rotation.x = pose.lShRotX;
            if (pose.lElRotZ !== undefined) b.lElbow.rotation.z = pose.lElRotZ;

            // Legs (Positive Z rotation steps / kicks forward toward opponent)
            if (pose.rHipRotZ !== undefined) b.rHip.rotation.z = pose.rHipRotZ;
            if (pose.rKnRotZ !== undefined) b.rKnee.rotation.z = pose.rKnRotZ;

            if (pose.lHipRotZ !== undefined) b.lHip.rotation.z = pose.lHipRotZ;
            if (pose.lKnRotZ !== undefined) b.lKnee.rotation.z = pose.lKnRotZ;
        }
    };
}

// Preset Combat Poses (Positive Z rotation = Forward toward opponent)
const COMBAT_POSES = {
    // 1. Martial Arts Ready Stance (Alan Becker dynamic bounce)
    stance: {
        forwardX: 0, rootY: 0, rootRotZ: 0,
        hipsY: 8.6, spineRotZ: 0.12, spineRotX: 0, chestRotY: 0.25, neckRotZ: -0.08,
        rShRotZ: 0.65, rShRotX: 0.25, rElRotZ: 1.35,  // Lead arm raised in front guard
        lShRotZ: 0.35, lShRotX: -0.25, lElRotZ: 1.65, // Rear arm protecting chin
        rHipRotZ: 0.28, rKnRotZ: -0.52,                // Lead leg forward bent
        lHipRotZ: -0.32, lKnRotZ: -0.40                // Rear leg back braced
    },

    // 2. Forward Dash Lunge
    dash: {
        forwardX: 2.2,
        hipsY: 7.8, spineRotZ: 0.48, chestRotY: 0.1, neckRotZ: -0.25,
        rShRotZ: 1.2, rShRotX: 0.1, rElRotZ: 0.4,
        lShRotZ: -0.8, lShRotX: 0.1, lElRotZ: 0.8,
        rHipRotZ: 0.8, rKnRotZ: -1.1,
        lHipRotZ: -0.8, lKnRotZ: -0.2
    },

    // 3. Lightning Straight Punch / Jab
    punch: {
        forwardX: 2.6,
        hipsY: 8.2, spineRotZ: 0.22, chestRotY: 0.55, neckRotZ: -0.15,
        rShRotZ: 1.57, rShRotX: 0, rElRotZ: 0,        // Fist punched straight at opponent!
        lShRotZ: 0.25, lShRotX: -0.35, lElRotZ: 1.75, // Rear hand guard
        rHipRotZ: 0.45, rKnRotZ: -0.85,
        lHipRotZ: -0.65, lKnRotZ: -0.35
    },

    // 4. Tight Forearm Cross Block
    block: {
        forwardX: 0,
        hipsY: 8.1, spineRotZ: -0.15, chestRotY: 0.1, neckRotZ: -0.1,
        rShRotZ: 0.95, rShRotX: -0.35, rElRotZ: 1.85, // Forearms crossed shielding head
        lShRotZ: 0.95, lShRotX: 0.35, lElRotZ: 1.85,
        rHipRotZ: 0.35, rKnRotZ: -0.7,
        lHipRotZ: -0.45, lKnRotZ: -0.6
    },

    // 5. Spinning High Roundhouse Kick
    kick: {
        forwardX: 2.2,
        hipsY: 9.2, spineRotZ: -0.35, chestRotY: 0.8, neckRotZ: 0.2,
        rHipRotZ: 1.65, rKnRotZ: 0,                   // Leg lifted high & extended horizontally at opponent
        lHipRotZ: -0.15, lKnRotZ: -0.25,              // Standing pivot leg
        rShRotZ: -0.4, lShRotZ: 0.6
    },

    // 6. Deep Crouch & Low Leg Sweep
    duck_sweep: {
        forwardX: 2.4,
        hipsY: 4.8, spineRotZ: 0.55, chestRotY: 0.4, neckRotZ: -0.3,
        rHipRotZ: 1.55, rKnRotZ: 0,                   // Sweeping leg extended along floor toward opponent
        lHipRotZ: -1.1, lKnRotZ: -1.5,                // Crouched support leg
        rShRotZ: -0.2, lShRotZ: 0.4
    },

    // 7. Mid-Air Tuck for Aerial Flip
    aerial_tuck: {
        rootY: 7.5,
        hipsY: 8.0, spineRotZ: -0.9, chestRotY: 0, neckRotZ: -0.5,
        rShRotZ: -1.8, lShRotZ: -1.8,
        rHipRotZ: -1.7, rKnRotZ: -2.2,
        lHipRotZ: -1.7, lKnRotZ: -2.2
    },

    // 8. Superhero Landing Pose
    landing: {
        forwardX: 0, rootY: 0, rootRotZ: 0,
        hipsY: 4.6, spineRotZ: 0.65, chestRotY: 0.35, neckRotZ: -0.5,
        rShRotZ: 0.4, rElRotZ: 1.0,                   // Fist planted firmly on ground
        lShRotZ: -0.8, lElRotZ: 0.5,                  // Trailing arm thrown back
        rHipRotZ: 0.9, rKnRotZ: -1.6,
        lHipRotZ: -0.95, lKnRotZ: -1.4
    },

    // 9. Violent Knockback Recoil Slide
    knockback: {
        forwardX: -2.2, // Slides backward away from opponent!
        hipsY: 7.9, spineRotZ: -0.65, chestRotY: -0.2, neckRotZ: -0.45,
        rShRotZ: -0.8, rShRotX: 0.5, rElRotZ: -0.4,   // Arms flung back from impact
        lShRotZ: -0.9, lShRotX: -0.5, lElRotZ: -0.4,
        rHipRotZ: 0.6, rKnRotZ: -0.3,
        lHipRotZ: 0.2, lKnRotZ: -0.4
    }
};

/**
 * Initializes the Two-Character Fight Arena.
 */
function initFightArena() {
    if (fightArenaGroup) return;

    fightArenaGroup = new THREE.Group();

    // Subtle dark circular combat perimeter on the floor
    const ringGeom = new THREE.RingGeometry(9.8, 10.0, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = -Math.PI * 0.5;
    ringMesh.position.y = 0.02;
    fightArenaGroup.add(ringMesh);

    // Instantiate Fighter 1 (Left, Orange, facing right toward opponent)
    const f1Style = document.getElementById('fighter1-style')?.value || 'stickman_orange';
    fighter1 = createCombatFighter(f1Style, -4.2, 1);
    fighter1.applyPose(COMBAT_POSES.stance);
    fightArenaGroup.add(fighter1.root);

    // Instantiate Fighter 2 (Right, Blue, facing left toward opponent)
    fighter2 = createCombatFighter('stickman_blue', 4.2, -1);
    fighter2.applyPose(COMBAT_POSES.stance);
    fightArenaGroup.add(fighter2.root);

    // Particle FX Group
    activeFXGroup = new THREE.Group();
    fightArenaGroup.add(activeFXGroup);

    scene.add(fightArenaGroup);
}

function rebuildFighter1Style(newStyle) {
    if (!fightArenaGroup || !fighter1) return;
    const curX = fighter1.root.position.x;
    fightArenaGroup.remove(fighter1.root);
    fighter1 = createCombatFighter(newStyle, curX, 1);
    fighter1.applyPose(COMBAT_POSES.stance);
    fightArenaGroup.add(fighter1.root);
}

function rebuildFighter2Style(newStyle) {
    if (!fightArenaGroup || !fighter2) return;
    const curX = fighter2.root.position.x;
    fightArenaGroup.remove(fighter2.root);
    fighter2 = createCombatFighter(newStyle, curX, -1);
    fighter2.applyPose(COMBAT_POSES.stance);
    fightArenaGroup.add(fighter2.root);
}

/**
 * Procedurally transitions a fighter's pose over duration (seconds).
 */
function transitionPose(fighter, targetPose, durationSec) {
    return new Promise((resolve) => {
        const speed = parseFloat(document.getElementById('fight-speed')?.value || 1.0);
        const actualDuration = (durationSec / speed) * 1000;
        const startTime = performance.now();
        const startPose = Object.assign({}, fighter.currentPose);

        function updateFrame(now) {
            const elapsed = now - startTime;
            const progress = Math.min(1.0, elapsed / actualDuration);
            // Smooth easeOutCubic
            const ease = 1 - Math.pow(1 - progress, 3);

            const blended = {};
            for (const key in targetPose) {
                const sVal = startPose[key] !== undefined ? startPose[key] : (COMBAT_POSES.stance[key] || 0);
                const tVal = targetPose[key];
                blended[key] = sVal + (tVal - sVal) * ease;
            }

            fighter.applyPose(blended);
            fighter.currentPose = blended;

            if (progress < 1.0) {
                requestAnimationFrame(updateFrame);
            } else {
                fighter.applyPose(targetPose);
                fighter.currentPose = Object.assign({}, targetPose);
                resolve();
            }
        }

        requestAnimationFrame(updateFrame);
    });
}

function waitMs(ms) {
    const speed = parseFloat(document.getElementById('fight-speed')?.value || 1.0);
    return new Promise(resolve => setTimeout(resolve, ms / speed));
}

/**
 * Creates Alan Becker impact sparks, shockwave ring, and camera shake.
 */
function spawnHitFX(x, y, z) {
    const fxEnabled = document.getElementById('fx-toggle')?.checked !== false;
    if (!fxEnabled || !activeFXGroup) return;

    // 1. Shockwave Flash Ring
    const ringGeom = new THREE.RingGeometry(0.2, 0.45, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.set(x, y, z);
    activeFXGroup.add(ring);

    // 2. Dispersing Sparks
    const sparkCount = 12;
    const sparks = [];
    for (let i = 0; i < sparkCount; i++) {
        const sparkGeom = new THREE.SphereGeometry(0.12, 8, 8);
        const sparkMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xff3d00 : 0xffea00 });
        const spark = new THREE.Mesh(sparkGeom, sparkMat);
        spark.position.set(x, y, z);
        const ang = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.4;
        const vel = new THREE.Vector3(Math.cos(ang) * 9, (Math.random() * 4) + 1.5, Math.sin(ang) * 9);
        activeFXGroup.add(spark);
        sparks.push({ mesh: spark, vel });
    }

    // Camera Shake & Hit-Stop
    cameraShakeIntensity = 0.45;
    hitStopTimer = 0.045; // 45ms freeze frame for impactful crunch

    const startTime = performance.now();
    function animateFX(now) {
        const t = (now - startTime) / 300;
        if (t < 1.0) {
            ring.scale.setScalar(1 + t * 4.5);
            ring.material.opacity = Math.max(0, 0.9 * (1 - t));

            sparks.forEach(s => {
                s.mesh.position.addScaledVector(s.vel, 0.016);
                s.vel.y -= 9.8 * 0.016; // Gravity
                s.mesh.scale.setScalar(Math.max(0.1, 1 - t));
            });
            requestAnimationFrame(animateFX);
        } else {
            activeFXGroup.remove(ring);
            sparks.forEach(s => activeFXGroup.remove(s.mesh));
        }
    }
    requestAnimationFrame(animateFX);
}

function resetFightersToStance() {
    if (!fighter1 || !fighter2) return;
    fighter1.applyPose(COMBAT_POSES.stance);
    fighter1.currentPose = Object.assign({}, COMBAT_POSES.stance);

    fighter2.applyPose(COMBAT_POSES.stance);
    fighter2.currentPose = Object.assign({}, COMBAT_POSES.stance);

    const fightStatus = document.getElementById('fight-status-text');
    if (fightStatus) fightStatus.textContent = 'Fighters facing each other in neutral combat stances.';
}

/**
 * Triggers a single combat move on demand.
 */
async function triggerSingleMove(moveName) {
    if (!fighter1 || !fighter2 || isFightPlaying) return;
    const fightStatus = document.getElementById('fight-status-text');

    switch (moveName) {
        case 'punch':
            if (fightStatus) fightStatus.textContent = 'Fighter 1: Lightning Dash & Straight Jab!';
            await transitionPose(fighter1, COMBAT_POSES.dash, 0.22);
            await transitionPose(fighter1, COMBAT_POSES.punch, 0.14);
            spawnHitFX(0.5, 12.0, 0);
            await waitMs(120);
            await transitionPose(fighter1, COMBAT_POSES.stance, 0.32);
            break;

        case 'block':
            if (fightStatus) fightStatus.textContent = 'Fighter 2: Tight Guard Block!';
            await transitionPose(fighter2, COMBAT_POSES.block, 0.16);
            spawnHitFX(0.5, 12.2, 0);
            await waitMs(250);
            await transitionPose(fighter2, COMBAT_POSES.stance, 0.25);
            break;

        case 'kick':
            if (fightStatus) fightStatus.textContent = 'Fighter 2: Spinning High Roundhouse Kick!';
            await transitionPose(fighter2, COMBAT_POSES.dash, 0.22);
            await transitionPose(fighter2, COMBAT_POSES.kick, 0.18);
            spawnHitFX(-0.5, 13.5, 0);
            await waitMs(180);
            await transitionPose(fighter2, COMBAT_POSES.stance, 0.32);
            break;

        case 'sweep':
            if (fightStatus) fightStatus.textContent = 'Fighter 1: Low Crouch Duck & Floor Sweep!';
            await transitionPose(fighter1, COMBAT_POSES.duck_sweep, 0.22);
            spawnHitFX(0.4, 3.2, 0);
            await waitMs(200);
            await transitionPose(fighter1, COMBAT_POSES.stance, 0.32);
            break;

        case 'flip':
            if (fightStatus) fightStatus.textContent = 'Fighter 2: Acrobatic Aerial 360° Backflip!';
            await transitionPose(fighter2, Object.assign({}, COMBAT_POSES.aerial_tuck, { rootRotZ: -Math.PI }), 0.3);
            await transitionPose(fighter2, Object.assign({}, COMBAT_POSES.landing, { rootRotZ: -Math.PI * 2 }), 0.25);
            fighter2.root.rotation.z = 0;
            await waitMs(200);
            await transitionPose(fighter2, COMBAT_POSES.stance, 0.28);
            break;

        case 'knockback':
            if (fightStatus) fightStatus.textContent = 'Heavy Knockback Impact!';
            spawnHitFX(-1.0, 11.5, 0);
            await transitionPose(fighter1, COMBAT_POSES.knockback, 0.35);
            await waitMs(250);
            await transitionPose(fighter1, COMBAT_POSES.stance, 0.4);
            break;

        case 'flurry':
            await playFlurryExchange();
            break;
    }
}

/**
 * High-speed rapid punch-block flurry exchange.
 */
async function playFlurryExchange() {
    const fightStatus = document.getElementById('fight-status-text');
    if (fightStatus) fightStatus.textContent = '⚡ Rapid Clash: Supersonic Flurry Exchange!';

    // Move close to each other
    await Promise.all([
        transitionPose(fighter1, Object.assign({}, COMBAT_POSES.dash, { forwardX: 2.4 }), 0.25),
        transitionPose(fighter2, Object.assign({}, COMBAT_POSES.dash, { forwardX: 2.4 }), 0.25)
    ]);

    // Flurry hits
    for (let i = 0; i < 6; i++) {
        const isF1Attacking = i % 2 === 0;
        await Promise.all([
            transitionPose(fighter1, isF1Attacking ? COMBAT_POSES.punch : COMBAT_POSES.block, 0.08),
            transitionPose(fighter2, isF1Attacking ? COMBAT_POSES.block : COMBAT_POSES.punch, 0.08)
        ]);
        spawnHitFX((Math.random() - 0.5) * 0.8, 11.5 + (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 0.8);
        await waitMs(40);
    }

    // Leap back to neutral
    await Promise.all([
        transitionPose(fighter1, COMBAT_POSES.stance, 0.3),
        transitionPose(fighter2, COMBAT_POSES.stance, 0.3)
    ]);
    if (fightStatus) fightStatus.textContent = 'Clash complete!';
}

/**
 * Plays the full Alan Becker choreographed battle sequence.
 */
async function playFullFightCombo() {
    if (!fighter1 || !fighter2 || isFightPlaying) return;
    isFightPlaying = true;
    const playBtn = document.getElementById('play-fight-btn');
    const fightStatus = document.getElementById('fight-status-text');
    const loopToggle = document.getElementById('fight-loop-toggle');

    if (playBtn) playBtn.disabled = true;

    try {
        do {
            resetFightersToStance();
            if (fightStatus) fightStatus.textContent = '⚔️ Round 1: Combatants enter stance...';
            await waitMs(600);

            // Phase 1: Fighter 1 Dashes in & Jabs
            if (fightStatus) fightStatus.textContent = '🥊 Fighter 1 dashes in with a supersonic jab!';
            await transitionPose(fighter1, COMBAT_POSES.dash, 0.22);
            await Promise.all([
                transitionPose(fighter1, COMBAT_POSES.punch, 0.14),
                transitionPose(fighter2, COMBAT_POSES.block, 0.14) // Fighter 2 blocks
            ]);
            spawnHitFX(0.5, 12.0, 0); // Impact sparks!
            await waitMs(180);

            // Phase 2: Fighter 2 Counters with Roundhouse Kick, Fighter 1 Ducks & Sweeps!
            if (fightStatus) fightStatus.textContent = '🦵 Fighter 2 counters with roundhouse! Fighter 1 ducks under!';
            await Promise.all([
                transitionPose(fighter2, COMBAT_POSES.kick, 0.22),
                transitionPose(fighter1, COMBAT_POSES.duck_sweep, 0.22)
            ]);
            spawnHitFX(0.0, 3.8, 0); // Sweep impact on Fighter 2's leg!
            await waitMs(150);

            // Phase 3: Fighter 2 gets launched, does an Aerial Backflip and Lands!
            if (fightStatus) fightStatus.textContent = '🤸 Fighter 2 swept into the air, backflips and sticks landing!';
            await Promise.all([
                transitionPose(fighter1, COMBAT_POSES.stance, 0.28),
                (async () => {
                    await transitionPose(fighter2, Object.assign({}, COMBAT_POSES.aerial_tuck, { rootRotZ: -Math.PI }), 0.28);
                    await transitionPose(fighter2, Object.assign({}, COMBAT_POSES.landing, { rootRotZ: -Math.PI * 2 }), 0.22);
                    fighter2.root.rotation.z = 0;
                })()
            ]);
            await waitMs(200);
            await transitionPose(fighter2, COMBAT_POSES.stance, 0.25);

            // Phase 4: Supersonic Flurry Clash in the Center!
            await playFlurryExchange();
            await waitMs(200);

            // Phase 5: Heavy Knockback Finish
            if (fightStatus) fightStatus.textContent = '💥 Heavy strike lands! Fighter 1 knocked back!';
            await Promise.all([
                transitionPose(fighter2, COMBAT_POSES.punch, 0.18),
                (async () => {
                    await waitMs(100);
                    spawnHitFX(-0.6, 12.0, 0);
                    await transitionPose(fighter1, COMBAT_POSES.knockback, 0.35);
                })()
            ]);

            await waitMs(300);
            if (fightStatus) fightStatus.textContent = 'Fighter 1 recovers into stance!';
            await Promise.all([
                transitionPose(fighter1, COMBAT_POSES.stance, 0.4),
                transitionPose(fighter2, COMBAT_POSES.stance, 0.3)
            ]);

            await waitMs(1000);
        } while (loopToggle && loopToggle.checked);

        if (fightStatus) fightStatus.textContent = 'Battle sequence finished! Choose next action.';
    } finally {
        isFightPlaying = false;
        if (playBtn) playBtn.disabled = false;
    }
}

function togglePlayback() {
    if (!mixer) return;
    
    if (mixer) {
        if (mixer.timeScale === 0) {
            mixer.timeScale = parseFloat(speedSlider?.value || 1.0);
            if (playPauseBtn) playPauseBtn.textContent = 'Pause';
            if (statusText) statusText.textContent = 'Playing...';
        } else {
            mixer.timeScale = 0;
            if (playPauseBtn) playPauseBtn.textContent = 'Play';
            if (statusText) statusText.textContent = 'Paused.';
        }
    }
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock ? clock.getDelta() : 0.016;

    // Hit-stop micro-pause for visceral Alan Becker impact feel
    if (hitStopTimer > 0) {
        hitStopTimer -= delta;
        return;
    }

    if (currentMode === 'solo') {
        if (mixer) {
            mixer.update(delta);

            // Treadmill lock: Keep root X and Z at origin so it walks in place
            if (inPlaceToggle?.checked && currentSkeleton) {
                const root = currentSkeleton.bones[0];
                root.position.x = 0;
                root.position.z = 0;
            }
        }
    } else if (currentMode === 'parkour') {
        updateParkourAnimation(delta);
    } else if (currentMode === 'fight') {
    } else if (currentMode === 'teacher') {
        updateMathTeacher(delta);
    } else if (currentMode === 'animal') {
        updateAnimalLocomotion(delta);
    }

    // Execute user registered frame callbacks (Generative 3D Scripting)
    if (window._userUpdateCallbacks && window._userUpdateCallbacks.length > 0) {
        const elapsed = clock ? clock.getElapsedTime() : 0;
        for (let i = 0; i < window._userUpdateCallbacks.length; i++) {
            try {
                window._userUpdateCallbacks[i](delta, elapsed);
            } catch (err) {
                console.warn('[Studio.onUpdate Error]:', err);
            }
        }
    }

    // Execute active Cinematic Director
    let directorControllingCamera = false;
    if (window._activeDirector && window._activeDirector.isPlaying && window._activeDirector.shots && window._activeDirector.shots.length > 0) {
        try {
            window._activeDirector.update(delta);
            directorControllingCamera = true;
        } catch (err) {
            console.warn('[Director Error]:', err);
        }
    }

    // Execute active Studio timelines
    if (window._activeStudioTimelines && window._activeStudioTimelines.length > 0) {
        for (let i = window._activeStudioTimelines.length - 1; i >= 0; i--) {
            const tl = window._activeStudioTimelines[i];
            tl.update(delta);
            if (tl.isFinished) {
                window._activeStudioTimelines.splice(i, 1);
            }
        }
    }

    // Procedural Camera Shake decay
    if (cameraShakeIntensity > 0.001) {
        camera.position.x += (Math.random() - 0.5) * cameraShakeIntensity;
        camera.position.y += (Math.random() - 0.5) * cameraShakeIntensity;
        cameraShakeIntensity *= Math.pow(0.1, delta * 8); // Rapid organic decay
    }

    // Auto camera cycler timer
    if (window._autoCameraInterval && !directorControllingCamera) {
        window._autoCameraElapsed = (window._autoCameraElapsed || 0) + delta;
        if (window._autoCameraElapsed >= window._autoCameraInterval) {
            window._autoCameraElapsed = 0;
            if (typeof window.Studio?.cycleCamera === 'function') {
                window.Studio.cycleCamera();
            }
        }
    }

    if (controls && !directorControllingCamera) {
        controls.update();
    }

    renderer.render(scene, camera);
}

// =========================================================================
// 🧑‍🏫 3D CARTOON MATH TEACHER & SMART BLACKBOARD CLASSROOM SYSTEM
// =========================================================================

// Comprehensive Math Lessons with step equations, speech, and coordinates to point at
const MATH_LESSONS = {
    quadratic: {
        title: "Quadratic Formula & Roots",
        subtitle: "Solving ax² + bx + c = 0 step-by-step",
        terms: [
            { id: "term_std", label: "ax² + bx + c = 0", target: [0.5, 10.8, 0], desc: "Standard quadratic equation form" },
            { id: "term_disc", label: "Δ = b² - 4ac", target: [2.5, 10.2, 0], desc: "Discriminant determines the nature of roots" },
            { id: "term_b", label: "-b", target: [1.2, 9.4, 0], desc: "Axis of symmetry component" },
            { id: "term_sqrt", label: "±√(b² - 4ac)", target: [3.4, 9.4, 0], desc: "Square root distance to both roots" },
            { id: "term_2a", label: "2a", target: [2.5, 8.4, 0], desc: "Denominator scaling by leading coefficient" },
            { id: "term_roots", label: "Parabola Roots (x₁, x₂)", target: [4.2, 7.6, 0], desc: "Where the curve cuts the x-axis" }
        ],
        steps: [
            {
                equationText: "a·x² + b·x + c = 0",
                stepTitle: "Step 1: Standard Form & Coefficients",
                speech: "Welcome class! Any quadratic equation starts in standard form: a x squared plus b x plus c equals zero. The numbers a, b, and c dictate the shape of our parabola.",
                pointTarget: [0.5, 10.8, 0],
                activeTerm: "term_std",
                graphType: "parabola",
                graphParams: { a: 1, b: -2, c: -3 }
            },
            {
                equationText: "Δ = b² - 4ac",
                stepTitle: "Step 2: The Discriminant (Delta)",
                speech: "Next, we calculate the discriminant, Delta equals b squared minus four a c. If Delta is greater than zero, our parabola crosses the x-axis twice with two real roots!",
                pointTarget: [2.5, 10.2, 0],
                activeTerm: "term_disc",
                graphType: "discriminant",
                graphParams: { delta: 16 }
            },
            {
                equationText: "x = (-b ± √(b² - 4ac)) / (2a)",
                stepTitle: "Step 3: The Complete Quadratic Formula",
                speech: "Now we assemble the master formula: x equals minus b plus or minus the square root of Delta, all divided by two a. The plus-minus gives us both symmetric roots!",
                pointTarget: [3.4, 9.4, 0],
                activeTerm: "term_sqrt",
                graphType: "roots",
                graphParams: { r1: -1, r2: 3 }
            },
            {
                equationText: "x₁ = 3,   x₂ = -1",
                stepTitle: "Step 4: Real Roots on the Graph",
                speech: "Looking at the chalkboard graph, the parabola intersects the x-axis at x equals negative one and x equals positive three. Solution complete!",
                pointTarget: [4.2, 7.6, 0],
                activeTerm: "term_roots",
                graphType: "parabola_roots",
                graphParams: { a: 1, b: -2, c: -3, r1: -1, r2: 3 }
            }
        ]
    },
    derivative: {
        title: "Calculus: The Derivative",
        subtitle: "Instantaneous rate of change as a tangent limit",
        terms: [
            { id: "term_diff", label: "f(x + h) - f(x)", target: [2.5, 10.8, 0], desc: "Change in vertical height (Δy)" },
            { id: "term_h", label: "h (run)", target: [2.5, 9.6, 0], desc: "Horizontal separation between points (Δx)" },
            { id: "term_lim", label: "lim (h → 0)", target: [0.2, 10.2, 0], desc: "Taking the limit as separation shrinks to 0" },
            { id: "term_prime", label: "f'(x)", target: [-1.2, 10.2, 0], desc: "Instantaneous slope of the tangent line" }
        ],
        steps: [
            {
                equationText: "Δy / Δx = (f(x+h) - f(x)) / h",
                stepTitle: "Step 1: Secant Line Slope (Average Rate)",
                speech: "In calculus, we begin by drawing a secant line between two points separated by a distance h. The average slope is f of x plus h minus f of x, divided by h.",
                pointTarget: [2.5, 10.8, 0],
                activeTerm: "term_diff",
                graphType: "secant",
                graphParams: { h: 2.0 }
            },
            {
                equationText: "f'(x) = lim[h→0] (f(x+h) - f(x)) / h",
                stepTitle: "Step 2: Shrinking h to Zero (The Limit)",
                speech: "Now watch closely as we take the limit as h approaches zero. The two points merge into one, and the secant line becomes the instantaneous tangent line!",
                pointTarget: [0.2, 10.2, 0],
                activeTerm: "term_lim",
                graphType: "tangent_limit",
                graphParams: { h: 0.1 }
            },
            {
                equationText: "f'(x) = Tangent Slope at P(x, y)",
                stepTitle: "Step 3: Tangent Slope Derived",
                speech: "The derivative f prime of x gives us the exact instantaneous slope at any point along the curve. This is the foundation of differential calculus!",
                pointTarget: [-1.2, 10.2, 0],
                activeTerm: "term_prime",
                graphType: "tangent",
                graphParams: { x0: 1.5, slope: 3.0 }
            }
        ]
    },
    linear: {
        title: "Linear Equation: y = mx + b",
        subtitle: "Slope-intercept form & rate of change",
        terms: [
            { id: "term_y", label: "y (output)", target: [-1.2, 10.2, 0], desc: "Dependent variable" },
            { id: "term_m", label: "m (slope)", target: [0.8, 10.2, 0], desc: "Rate of change: rise over run" },
            { id: "term_x", label: "x (input)", target: [2.0, 10.2, 0], desc: "Independent variable" },
            { id: "term_b", label: "b (y-intercept)", target: [3.4, 10.2, 0], desc: "Where the line crosses the y-axis" }
        ],
        steps: [
            {
                equationText: "y = m·x + b",
                stepTitle: "Step 1: Slope-Intercept Formula",
                speech: "The slope-intercept form y equals m x plus b describes any straight line. m is the slope, and b is the y-intercept where x equals zero.",
                pointTarget: [0.8, 10.2, 0],
                activeTerm: "term_m",
                graphType: "line",
                graphParams: { m: 1.5, b: 2 }
            },
            {
                equationText: "m = Rise / Run = (y₂ - y₁) / (x₂ - x₁)",
                stepTitle: "Step 2: Calculating the Slope m",
                speech: "The slope m is simply rise over run: how much y increases for each unit of x. A positive slope climbs upward, while a negative slope falls.",
                pointTarget: [0.8, 10.2, 0],
                activeTerm: "term_m",
                graphType: "slope_triangle",
                graphParams: { m: 1.5, b: 2 }
            },
            {
                equationText: "(0, b) = (0, 2)  ⟹  y = 1.5x + 2",
                stepTitle: "Step 3: Graphing the Intercept",
                speech: "Plotting the point (0, 2) on the y-axis and moving up 1.5 for every 1 step right gives our exact line. Clean and intuitive!",
                pointTarget: [3.4, 10.2, 0],
                activeTerm: "term_b",
                graphType: "line_plotted",
                graphParams: { m: 1.5, b: 2 }
            }
        ]
    },
    euler: {
        title: "Euler's Beautiful Identity",
        subtitle: "e^(iπ) + 1 = 0: Connecting the fundamental constants",
        terms: [
            { id: "term_e", label: "e (base)", target: [-0.5, 10.4, 0], desc: "Euler's constant 2.718..." },
            { id: "term_i", label: "i (imaginary)", target: [0.5, 10.8, 0], desc: "Square root of -1" },
            { id: "term_pi", label: "π (geometry)", target: [1.2, 10.8, 0], desc: "Half-turn rotation in radians" },
            { id: "term_one", label: "+ 1", target: [2.5, 10.4, 0], desc: "Multiplicative identity" },
            { id: "term_zero", label: "= 0", target: [3.8, 10.4, 0], desc: "Additive identity" }
        ],
        steps: [
            {
                equationText: "e^(iθ) = cos(θ) + i·sin(θ)",
                stepTitle: "Step 1: Euler's General Formula",
                speech: "Euler's formula reveals that exponential growth with an imaginary exponent corresponds to pure rotation around the complex unit circle!",
                pointTarget: [0.5, 10.8, 0],
                activeTerm: "term_i",
                graphType: "complex_circle",
                graphParams: { theta: 0.8 }
            },
            {
                equationText: "e^(iπ) = cos(π) + i·sin(π) = -1 + 0i",
                stepTitle: "Step 2: Rotating by Angle Pi",
                speech: "When theta equals pi radians, a half-turn of 180 degrees lands directly on negative one along the real axis: e to the i pi equals negative one.",
                pointTarget: [1.2, 10.8, 0],
                activeTerm: "term_pi",
                graphType: "complex_pi",
                graphParams: { theta: Math.PI }
            },
            {
                equationText: "e^(iπ) + 1 = 0",
                stepTitle: "Step 3: The Most Beautiful Equation",
                speech: "Adding one to both sides gives Euler's identity: e to the i pi plus one equals zero. It unites the 5 greatest constants of mathematics in one single line!",
                pointTarget: [3.8, 10.4, 0],
                activeTerm: "term_zero",
                graphType: "complex_pi",
                graphParams: { theta: Math.PI }
            }
        ]
    },
    pythagoras: {
        title: "Pythagorean Theorem",
        subtitle: "a² + b² = c² in Euclidean Geometry",
        terms: [
            { id: "term_a2", label: "a² (Leg A)", target: [0.5, 10.2, 0], desc: "Area of square on leg a" },
            { id: "term_b2", label: "b² (Leg B)", target: [2.0, 10.2, 0], desc: "Area of square on leg b" },
            { id: "term_c2", label: "c² (Hypotenuse)", target: [3.8, 10.2, 0], desc: "Area of square on hypotenuse c" }
        ],
        steps: [
            {
                equationText: "a² + b² = c²",
                stepTitle: "Step 1: Right-Angled Triangle",
                speech: "For any right triangle with perpendicular sides a and b, the sum of the areas of the squares on the legs equals the area of the square on hypotenuse c.",
                pointTarget: [0.5, 10.2, 0],
                activeTerm: "term_a2",
                graphType: "triangle",
                graphParams: { a: 3, b: 4, c: 5 }
            },
            {
                equationText: "3² + 4² = 9 + 16 = 25 = 5²",
                stepTitle: "Step 2: The 3-4-5 Triangle Example",
                speech: "For example, 3 squared is 9, plus 4 squared which is 16, equals 25, which is exactly 5 squared. Thus the hypotenuse is exactly 5!",
                pointTarget: [3.8, 10.2, 0],
                activeTerm: "term_c2",
                graphType: "triangle_squares",
                graphParams: { a: 3, b: 4, c: 5 }
            }
        ]
    },
    integral: {
        title: "Calculus: Definite Integral",
        subtitle: "Area under a curve via Riemann integration",
        terms: [
            { id: "term_int", label: "∫ (Integral)", target: [-0.5, 10.2, 0], desc: "Continuous summation symbol" },
            { id: "term_ab", label: "Limits [a, b]", target: [0.5, 10.8, 0], desc: "Interval of integration" },
            { id: "term_fx", label: "f(x) dx", target: [2.2, 10.2, 0], desc: "Height times infinitesimal width dx" },
            { id: "term_ftc", label: "F(b) - F(a)", target: [4.0, 10.2, 0], desc: "Fundamental Theorem of Calculus" }
        ],
        steps: [
            {
                equationText: "Area ≈ ∑ [i=1..n] f(xᵢ) · Δx",
                stepTitle: "Step 1: Riemann Rectangles Sum",
                speech: "To find the area under any curved function, we partition the region into vertical rectangle strips with width delta x and height f of x.",
                pointTarget: [2.2, 10.2, 0],
                activeTerm: "term_fx",
                graphType: "riemann",
                graphParams: { n: 6 }
            },
            {
                equationText: "∫[a..b] f(x) dx = F(b) - F(a)",
                stepTitle: "Step 2: Fundamental Theorem of Calculus",
                speech: "As the number of strips n approaches infinity, the width shrinks to dx, and the sum becomes the exact definite integral from a to b.",
                pointTarget: [-0.5, 10.2, 0],
                activeTerm: "term_int",
            }
        ]
    }
};

function initMathTeacherClassroom() {
    if (teacherClassroomGroup) return;

    teacherClassroomGroup = new THREE.Group();
    scene.add(teacherClassroomGroup);

    // 0. Classroom Architectural Shell: Hardwood Floor, Baseboards & Studio Wall
    const floorTexture = createClassroomFloorTexture();
    const floorMat = new THREE.MeshStandardMaterial({
        map: floorTexture,
        roughness: 0.38,
        metalness: 0.05
    });
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(2.5, 0, 12);
    floorMesh.receiveShadow = true;
    teacherClassroomGroup.add(floorMesh);

    // Warm classroom back wall behind blackboard
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0x182133, // Premium dark slate/navy modern classroom wall
        roughness: 0.88,
        metalness: 0.02
    });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(60, 24), wallMat);
    backWall.position.set(2.5, 12, -0.2);
    backWall.receiveShadow = true;
    teacherClassroomGroup.add(backWall);

    // Baseboard Skirting along bottom of wall (dark polished mahogany)
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x3d1d0c, roughness: 0.5 });
    const baseboard = new THREE.Mesh(new THREE.BoxGeometry(60, 0.5, 0.3), baseboardMat);
    baseboard.position.set(2.5, 0.25, -0.05);
    teacherClassroomGroup.add(baseboard);

    // Soft overhead classroom downlight for board and teacher
    const classroomSpot = new THREE.SpotLight(0xfff1de, 1.4, 45, Math.PI / 3.2, 0.45, 1.1);
    classroomSpot.position.set(0, 20, 14);
    classroomSpot.target.position.set(0, 4, 2);
    classroomSpot.castShadow = true;
    teacherClassroomGroup.add(classroomSpot);
    teacherClassroomGroup.add(classroomSpot.target);

    // 1. Build the 3D Chalkboard Frame & High-Res Slate Texture in Scene
    const boardGroup = new THREE.Group();
    boardGroup.position.set(2.5, 8.5, 0);

    // Create high-res dynamic CanvasTexture for the 3D blackboard slate
    blackboardCanvas = document.createElement('canvas');
    blackboardCanvas.width = 1200;
    blackboardCanvas.height = 720;
    blackboardCtx = blackboardCanvas.getContext('2d');
    blackboardTexture = new THREE.CanvasTexture(blackboardCanvas);
    blackboardTexture.anisotropy = 16;

    // Frame (Dark Mahogany Wood)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.5, metalness: 0.1 });
    
    // Front face with dynamic math canvas texture, sides with dark slate
    const slateFrontMat = new THREE.MeshStandardMaterial({
        map: blackboardTexture,
        roughness: 0.65,
        metalness: 0.05
    });
    const slateSideMat = new THREE.MeshStandardMaterial({ color: 0x090e17, roughness: 0.8 });
    const slateMaterials = [
        slateSideMat, slateSideMat, slateSideMat, slateSideMat,
        slateFrontMat, // Front face (+Z)
        slateSideMat  // Back face (-Z)
    ];

    // Main Slate Board (16m wide x 9.5m tall)
    const slateGeo = new THREE.BoxGeometry(16, 9.5, 0.3);
    blackboardMesh = new THREE.Mesh(slateGeo, slateMaterials);
    blackboardMesh.castShadow = true;
    blackboardMesh.receiveShadow = true;
    boardGroup.add(blackboardMesh);

    // Outer Wooden Molding Borders
    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.4, 0.6), frameMat);
    topFrame.position.set(0, 4.95, 0.1);
    const btmFrame = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.5, 0.9), frameMat);
    btmFrame.position.set(0, -4.95, 0.25); // Chalk ledge
    const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 10.3, 0.6), frameMat);
    leftFrame.position.set(-8.2, 0, 0.1);
    const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 10.3, 0.6), frameMat);
    rightFrame.position.set(8.2, 0, 0.1);

    boardGroup.add(topFrame, btmFrame, leftFrame, rightFrame);

    // Chalk Pieces on Ledge
    const chalkMatWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const chalkMatYellow = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const chalkMatBlue = new THREE.MeshBasicMaterial({ color: 0x60a5fa });

    const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), chalkMatWhite);
    c1.rotation.z = Math.PI / 2;
    c1.position.set(2, -4.7, 0.5);
    const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), chalkMatYellow);
    c2.rotation.z = Math.PI / 2.3;
    c2.position.set(3.2, -4.7, 0.5);
    const c3 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), chalkMatBlue);
    c3.rotation.z = Math.PI / 1.8;
    c3.position.set(4.3, -4.7, 0.5);

    boardGroup.add(c1, c2, c3);
    teacherClassroomGroup.add(boardGroup);

    // 2. Build 3D Cartoon Math Teacher Character (Neon Hero)
    buildTeacherAvatar('hero');

    // 3. Chalk Dust Sparks System for Real-time Writing
    const sparkGeo = new THREE.SphereGeometry(0.045, 6, 6);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.85 });
    chalkDustGroup = new THREE.Group();
    for (let i = 0; i < 24; i++) {
        const spark = new THREE.Mesh(sparkGeo, sparkMat);
        spark.visible = false;
        spark.userData = { vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1 };
        chalkDustGroup.add(spark);
    }
    teacherClassroomGroup.add(chalkDustGroup);

    // Immediately paint blackboard content for initial render
    const initialLesson = MATH_LESSONS[currentLessonId] || MATH_LESSONS.quadratic;
    const initialStep = initialLesson.steps[currentStepIndex] || initialLesson.steps[0];
    draw3DBlackboardContent(initialLesson, initialStep, 1.0);
    if (blackboardTexture) blackboardTexture.needsUpdate = true;
}

/**
 * Creates high-res procedural oak plank classroom floor texture.
 */
function createClassroomFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base warm oak / amber classroom floor tone
    ctx.fillStyle = '#b37d46';
    ctx.fillRect(0, 0, 1024, 1024);

    // Draw realistic wooden floor planks
    const plankHeight = 64;
    const plankWidth = 256;
    const rows = 1024 / plankHeight;

    for (let r = 0; r < rows; r++) {
        const y = r * plankHeight;
        const rowOffset = (r % 2) * (plankWidth * 0.5);

        for (let x = -rowOffset; x < 1024 + plankWidth; x += plankWidth) {
            const seed = Math.abs(Math.sin(r * 12.9898 + x * 78.233) * 43758.5453);
            const toneVar = Math.floor((seed % 1) * 28) - 14;
            ctx.fillStyle = `rgb(${179 + toneVar}, ${125 + Math.floor(toneVar * 0.8)}, ${70 + Math.floor(toneVar * 0.6)})`;
            ctx.fillRect(x, y, plankWidth, plankHeight);

            // Subtle wood grain lines
            ctx.strokeStyle = 'rgba(90, 50, 20, 0.15)';
            ctx.lineWidth = 1;
            for (let g = 10; g < plankHeight; g += 14) {
                ctx.beginPath();
                ctx.moveTo(x, y + g);
                ctx.bezierCurveTo(
                    x + plankWidth * 0.33, y + g + (seed % 3 - 1),
                    x + plankWidth * 0.66, y + g - (seed % 3 - 1),
                    x + plankWidth, y + g
                );
                ctx.stroke();
            }

            // Plank border groove
            ctx.strokeStyle = '#4a260c';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, plankWidth, plankHeight);
        }
    }

    // Specular varnish sheen
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.09)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.04)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.06)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 6);
    texture.anisotropy = 16;
    return texture;
}

function applyTeacherStandingPose(boneMap) {
    if (!boneMap) return;

    // Reset all bone rotations cleanly without touching translations
    for (const name in boneMap) {
        boneMap[name].rotation.set(0, 0, 0);
    }

    // 1. Natural straight standing legs under hips (brings legs in from T-pose spread)
    if (boneMap['RightUpLeg']) boneMap['RightUpLeg'].rotation.set(0, 0, Math.PI * 0.115);
    if (boneMap['LeftUpLeg']) boneMap['LeftUpLeg'].rotation.set(0, 0, -Math.PI * 0.115);
    if (boneMap['RightLeg']) boneMap['RightLeg'].rotation.set(0, 0, 0);
    if (boneMap['LeftLeg']) boneMap['LeftLeg'].rotation.set(0, 0, 0);

    // 2. Natural relaxed arms resting in front of hips (brings arms down and bends elbows forward)
    if (boneMap['RightArm']) boneMap['RightArm'].rotation.set(0, 0.22, Math.PI * 0.43);
    if (boneMap['LeftArm']) boneMap['LeftArm'].rotation.set(0, -0.22, -Math.PI * 0.43);
    if (boneMap['RightForeArm']) boneMap['RightForeArm'].rotation.set(0, 0.25, 0);
    if (boneMap['LeftForeArm']) boneMap['LeftForeArm'].rotation.set(0, -0.25, 0);

    // 3. Upright head and spine
    if (boneMap['Head']) boneMap['Head'].rotation.set(0, 0, 0);
    if (boneMap['Spine']) boneMap['Spine'].rotation.set(0, 0, 0);
    if (boneMap['Spine1']) boneMap['Spine1'].rotation.set(0, 0, 0);
}

function buildTeacherAvatar(styleName = 'hero') {
    if (teacherAvatar && teacherClassroomGroup) {
        if (teacherMixer) {
            teacherMixer.stopAllAction();
            teacherMixer = null;
            teacherWalkAction = null;
        }
        teacherClassroomGroup.remove(teacherAvatar.group);
    }

    const skeletonSource = templateMoCapSkeleton || (baseWalkBvh ? baseWalkBvh.skeleton : null);
    if (!skeletonSource) {
        console.warn("Base MoCap skeleton not yet loaded, postponing teacher avatar build");
        return;
    }

    const TEACHER_SCALE = 0.44;
    const group = new THREE.Group();
    // Scale on group isolates character scale from any bone operations
    group.scale.set(TEACHER_SCALE, TEACHER_SCALE, TEACHER_SCALE);

    teacherCurrentX = teacherAvatar ? teacherAvatar.group.position.x : -5.8;
    teacherTargetX = teacherCurrentX;
    group.position.set(teacherCurrentX, 0, 3.2);

    // 1. Clone from pristine REST-POSE template skeleton
    const origRoot = skeletonSource.bones[0];
    const clonedRoot = origRoot.clone(true);
    clonedRoot.updateWorldMatrix(true, true);
    const clonedBones = [];
    clonedRoot.traverse(b => {
        if (b.isBone) clonedBones.push(b);
    });
    const teacherSkeleton = new THREE.Skeleton(clonedBones);
    teacherSkeleton.calculateInverses();

    // Map bones by name
    const boneMap = {};
    teacherSkeleton.bones.forEach(b => { boneMap[b.name] = b; });

    // 2. Build the EXACT SAME character using buildCartoonCharacter on pristine bind-pose skeleton
    buildCartoonCharacter(teacherSkeleton, styleName);

    // 3. Apply the clean, natural Teacher Standing Pose
    applyTeacherStandingPose(boneMap);

    // 4. Ground registration: sneaker soles sit at Y = -18.24 in local bone coords.
    // Setting clonedRoot Y = 18.24 puts sneaker soles at Y = 0.000 flat on classroom floor.
    const TEACHER_HIPS_Y = 18.24;
    clonedRoot.position.set(0, TEACHER_HIPS_Y, 0);
    group.add(clonedRoot);

    // 5. Attach Chalk Stick to Right Hand for Blackboard Writing
    const rHandBone = boneMap['RightHand'] || boneMap['RightForeArm'];
    const chalkStick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.65, 8),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    chalkStick.position.set(0, -0.65, 0.25);
    chalkStick.rotation.x = Math.PI / 2;

    const chalkTipSpark = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    chalkTipSpark.position.set(0, 0.35, 0);
    chalkStick.add(chalkTipSpark);

    if (rHandBone && rHandBone.userData && rHandBone.userData.handGroup) {
        rHandBone.userData.handGroup.add(chalkStick);
    } else if (rHandBone) {
        rHandBone.add(chalkStick);
    }

    // 6. Head Facial Expressions (blinking & speech lip sync)
    const headBone = boneMap['Head'];
    const eyeGroups = headBone?.userData?.eyeGroups || [];
    const smileGroup = headBone?.userData?.smileGroup || null;

    teacherAvatar = {
        group,
        skeleton: teacherSkeleton,
        boneMap: boneMap,
        scale: TEACHER_SCALE,
        baseHipsY: TEACHER_HIPS_Y,
        hips: clonedRoot,
        spine: boneMap['Spine'],
        neck: boneMap['Neck1'] || boneMap['Neck'],
        headGroup: headBone,
        smileGroup: smileGroup,
        eyeGroups: eyeGroups,
        rightShoulder: boneMap['RightArm'],
        rightElbow: boneMap['RightForeArm'],
        rightHand: rHandBone,
        fingerTipNode: chalkTipSpark,
        leftShoulder: boneMap['LeftArm'],
        leftElbow: boneMap['LeftForeArm'],
        leftHand: boneMap['LeftHand'],
        leftHip: boneMap['LeftUpLeg'],
        rightHip: boneMap['RightUpLeg']
    };

    teacherClassroomGroup.add(group);

    // Setup Teacher Animation Mixer with exact Solo MoCap Walk Clip
    const walkClip = clips.walk || (baseWalkBvh ? baseWalkBvh.clip : null);
    if (walkClip) {
        teacherMixer = new THREE.AnimationMixer(clonedRoot);
        teacherWalkAction = teacherMixer.clipAction(walkClip);
        teacherWalkAction.loop = THREE.LoopRepeat;
    }
}

function rebuildTeacherAvatar(styleName) {
    buildTeacherAvatar(styleName);
}

/**
 * Procedural walking across the chalkboard floor
 */
function walkTeacherTo(targetX, onDone = null) {
    if (Math.abs(teacherCurrentX - targetX) < 0.1) {
        if (onDone) onDone();
        return;
    }
    teacherTargetX = targetX;
    onWalkArrivalCallback = onDone;
    teacherState = 'walking';

    // Activate the exact Solo MoCap Walk Action
    const walkClip = clips.walk || (baseWalkBvh ? baseWalkBvh.clip : null);
    if (!teacherWalkAction && walkClip && teacherAvatar) {
        teacherMixer = new THREE.AnimationMixer(teacherAvatar.hips);
        teacherWalkAction = teacherMixer.clipAction(walkClip);
        teacherWalkAction.loop = THREE.LoopRepeat;
    }

    if (teacherWalkAction) {
        teacherWalkAction.reset();
        teacherWalkAction.enabled = true;
        teacherWalkAction.paused = false;
        teacherWalkAction.setEffectiveWeight(1.0);
        teacherWalkAction.play();
    }

    const btnLeft = document.getElementById('btn-walk-left');
    const btnMid = document.getElementById('btn-walk-mid');
    const btnRight = document.getElementById('btn-walk-right');
    if (btnLeft) btnLeft.classList.toggle('active', Math.abs(targetX - (-5.8)) < 0.5);
    if (btnMid) btnMid.classList.toggle('active', Math.abs(targetX - (-1.2)) < 0.5);
    if (btnRight) btnRight.classList.toggle('active', Math.abs(targetX - 3.2) < 0.5);

    const statusText = document.getElementById('teacher-status-text');
    if (statusText) statusText.textContent = `🚶 Teacher walking to ${targetX < -3 ? 'Left (Equation)' : targetX < 1 ? 'Center' : 'Right (Graph)'}...`;
}

/**
 * Animated Letter-by-Letter Finger Tracing on Blackboard
 */
function startTeacherWriting(onDone = null) {
    const lesson = MATH_LESSONS[currentLessonId] || MATH_LESSONS.quadratic;
    const step = lesson.steps[currentStepIndex] || lesson.steps[0];

    // Position teacher in front of active formula area
    const writeLocationX = -3.6;

    const executeWriting = () => {
        teacherState = 'writing';
        isWritingActive = true;
        writeProgress = 0.0;
        writeAnimationTimer = 0.0;

        const statusText = document.getElementById('teacher-status-text');
        if (statusText) statusText.textContent = `✍️ Teacher is writing letter-by-letter on chalkboard...`;

        playChalkScribbleSound();
    };

    if (Math.abs(teacherCurrentX - writeLocationX) > 0.6) {
        walkTeacherTo(writeLocationX, executeWriting);
    } else {
        executeWriting();
    }
}

function triggerTeacherExplainGesture() {
    teacherGestureTimer = 2.5;
    teacherState = 'explaining';
    speakCurrentTeacherStep();
}

function playChalkScribbleSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        for (let s = 0; s < 5; s++) {
            setTimeout(() => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(360 + Math.random() * 220, ctx.currentTime);
                gain.gain.setValueAtTime(0.035, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.18);
            }, s * 220);
        }
    } catch (e) {
        // AudioContext silent fallback
    }
}

function loadTeacherLesson(lessonId) {
    currentLessonId = lessonId;
    currentStepIndex = 0;
    const lesson = MATH_LESSONS[lessonId] || MATH_LESSONS.quadratic;

    const boardTitle = document.getElementById('board-topic-title');
    if (boardTitle) boardTitle.textContent = lesson.title;

    const termContainer = document.getElementById('equation-term-badges');
    if (termContainer) {
        termContainer.innerHTML = '';
        lesson.terms.forEach(term => {
            const badge = document.createElement('button');
            badge.className = 'math-term-badge';
            badge.textContent = term.label;
            badge.title = term.desc;
            badge.onclick = () => pointTeacherAtTerm(term);
            termContainer.appendChild(badge);
        });
    }

    renderTeacherStep();
}

function renderTeacherStep() {
    const lesson = MATH_LESSONS[currentLessonId] || MATH_LESSONS.quadratic;
    const step = lesson.steps[currentStepIndex] || lesson.steps[0];

    const counter = document.getElementById('step-counter');
    if (counter) counter.textContent = `${currentStepIndex + 1} / ${lesson.steps.length}`;

    const speechText = document.getElementById('teacher-speech-text');
    if (speechText) speechText.textContent = `"${step.speech}"`;

    const statusText = document.getElementById('teacher-status-text');
    if (statusText) statusText.textContent = `Teaching: ${step.stepTitle}`;

    document.querySelectorAll('.math-term-badge').forEach(b => b.classList.remove('active'));
    if (step.activeTerm) {
        document.querySelectorAll('.math-term-badge').forEach(b => {
            if (b.textContent.includes(step.activeTerm) || b.title.includes(step.activeTerm)) {
                b.classList.add('active');
            }
        });
    }

    if (step.pointTarget) {
        teacherTargetAim.set(step.pointTarget[0], step.pointTarget[1], step.pointTarget[2]);
    }

    startTeacherWriting(() => {
        const voiceToggle = document.getElementById('teacher-voice-toggle');
        if (voiceToggle && voiceToggle.checked) {
            speakTeacherText(step.speech);
        }
    });
}

function stepTeacherLesson(direction) {
    const lesson = MATH_LESSONS[currentLessonId] || MATH_LESSONS.quadratic;
    currentStepIndex += direction;
    if (currentStepIndex < 0) currentStepIndex = 0;
    if (currentStepIndex >= lesson.steps.length) currentStepIndex = lesson.steps.length - 1;
    renderTeacherStep();
}

function pointTeacherAtTerm(term) {
    if (term.target) {
        teacherTargetAim.set(term.target[0], term.target[1], term.target[2]);
        teacherState = 'pointing';
    }
    const statusText = document.getElementById('teacher-status-text');
    if (statusText) statusText.textContent = `Pointing at: ${term.label} (${term.desc})`;

    document.querySelectorAll('.math-term-badge').forEach(b => {
        b.classList.toggle('active', b.textContent === term.label);
    });

    const voiceToggle = document.getElementById('teacher-voice-toggle');
    if (voiceToggle && voiceToggle.checked && term.desc) {
        speakTeacherText(`${term.label}: ${term.desc}`);
    }
}

function toggleTeacherAutoPlay() {
    isTeacherAutoPlaying = !isTeacherAutoPlaying;
    const playBtn = document.getElementById('btn-teacher-play');
    if (playBtn) {
        playBtn.textContent = isTeacherAutoPlaying ? "⏸️ Pause Auto" : "▶️ Auto Explain";
        playBtn.classList.toggle('primary', !isTeacherAutoPlaying);
    }

    if (isTeacherAutoPlaying) {
        runAutoPlayCycle();
    } else {
        if (autoPlayTimer) clearTimeout(autoPlayTimer);
    }
}

function runAutoPlayCycle() {
    if (!isTeacherAutoPlaying) return;
    const lesson = MATH_LESSONS[currentLessonId] || MATH_LESSONS.quadratic;
    renderTeacherStep();

    autoPlayTimer = setTimeout(() => {
        if (!isTeacherAutoPlaying) return;
        currentStepIndex++;
        if (currentStepIndex >= lesson.steps.length) {
            currentStepIndex = 0;
        }
        runAutoPlayCycle();
    }, 8500);
}

function speakCurrentTeacherStep() {
    const lesson = MATH_LESSONS[currentLessonId] || MATH_LESSONS.quadratic;
    const step = lesson.steps[currentStepIndex];
    if (step) speakTeacherText(step.speech);
}

function speakTeacherText(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.2;

    teacherTalkingIntensity = 1.0;

    utterance.onend = () => {
        teacherTalkingIntensity = 0.0;
    };
    utterance.onerror = () => {
        teacherTalkingIntensity = 0.0;
    };

    window.speechSynthesis.speak(utterance);
}

/**
 * Main per-frame update loop for 3D Cartoon Math Teacher & Blackboard Classroom
 */
function updateMathTeacher(delta) {
    if (!teacherClassroomGroup || !teacherAvatar) return;

    const lesson = MATH_LESSONS[currentLessonId] || MATH_LESSONS.quadratic;
    const step = lesson.steps[currentStepIndex] || lesson.steps[0];
    const time = clock ? clock.getElapsedTime() : performance.now() * 0.001;

    const TEACHER_HIPS_Y = teacherAvatar.baseHipsY || 18.24;

    // 1. Locomotion / Walking Across the Classroom Floor (Exact Solo MoCap BVH Walk)
    if (teacherState === 'walking') {
        const dx = teacherTargetX - teacherCurrentX;
        const stepDist = teacherWalkSpeed * delta;
        
        if (Math.abs(dx) > stepDist) {
            const dir = Math.sign(dx);
            teacherCurrentX += dir * stepDist;

            // Run the exact Solo MoCap animation mixer
            if (teacherMixer) {
                teacherMixer.update(delta * TEACHER_WALK_PLAY_RATE);
            }

            // Treadmill lock: root X and Z stay centered, keep soles flat on classroom floor
            if (teacherAvatar.hips) {
                teacherAvatar.hips.position.x = 0;
                teacherAvatar.hips.position.z = 0;
                teacherAvatar.hips.position.y += TEACHER_HIPS_Y;
            }

            // Facing direction: face walking direction (+X when moving right, -X when moving left)
            const targetAngle = dir > 0 ? (Math.PI * 0.5) : (-Math.PI * 0.5);
            teacherFacingAngle = THREE.MathUtils.lerp(teacherFacingAngle, targetAngle, delta * 9);
        } else {
            teacherCurrentX = teacherTargetX;
            teacherState = 'idle';
            if (teacherWalkAction) {
                teacherWalkAction.stop();
            }
            applyTeacherStandingPose(teacherAvatar.boneMap);
            if (teacherAvatar.hips) {
                teacherAvatar.hips.position.set(0, TEACHER_HIPS_Y, 0);
                teacherAvatar.hips.rotation.set(0, 0, 0);
            }

            // Update active state on navigation buttons upon arrival
            const btnLeft = document.getElementById('btn-walk-left');
            const btnMid = document.getElementById('btn-walk-mid');
            const btnRight = document.getElementById('btn-walk-right');
            if (btnLeft) btnLeft.classList.toggle('active', Math.abs(teacherCurrentX - (-5.8)) < 0.5);
            if (btnMid) btnMid.classList.toggle('active', Math.abs(teacherCurrentX - (-1.2)) < 0.5);
            if (btnRight) btnRight.classList.toggle('active', Math.abs(teacherCurrentX - 3.2) < 0.5);

            const statusText = document.getElementById('teacher-status-text');
            if (statusText) statusText.textContent = `Teacher arrived at ${teacherCurrentX < -3 ? 'Left' : teacherCurrentX < 1 ? 'Center' : 'Right'}`;

            if (onWalkArrivalCallback) {
                const cb = onWalkArrivalCallback;
                onWalkArrivalCallback = null;
                cb();
            }
        }
    } else {
        // In idle / pointing / writing states, keep feet firmly on the ground Y=0
        if (teacherAvatar.hips) teacherAvatar.hips.position.y = TEACHER_HIPS_Y;
    }

    // Update teacher group position and orientation
    teacherAvatar.group.position.set(teacherCurrentX, 0, 3.2);

    // 2. Writing on Blackboard State
    if (teacherState === 'writing' && isWritingActive) {
        writeAnimationTimer += delta;
        writeProgress = Math.min(1.0, writeAnimationTimer / writeDuration);

        // Turn body slightly towards blackboard for realistic chalkboard writing posture
        teacherFacingAngle = THREE.MathUtils.lerp(teacherFacingAngle, Math.PI * 0.72, delta * 6);

        // Legs stay in clean standing pose
        if (teacherAvatar.leftHip) teacherAvatar.leftHip.rotation.set(0, 0, -Math.PI * 0.115);
        if (teacherAvatar.rightHip) teacherAvatar.rightHip.rotation.set(0, 0, Math.PI * 0.115);
        if (teacherAvatar.boneMap['LeftLeg']) teacherAvatar.boneMap['LeftLeg'].rotation.set(0, 0, 0);
        if (teacherAvatar.boneMap['RightLeg']) teacherAvatar.boneMap['RightLeg'].rotation.set(0, 0, 0);

        // Draw blackboard stroke-by-stroke
        draw3DBlackboardContent(lesson, step, writeProgress);
        if (blackboardTexture) blackboardTexture.needsUpdate = true;

        // Inverse Kinematics / Aiming Right Arm with Quaternion (Zero Mesh Twisting)
        const rArm = teacherAvatar.rightShoulder;
        if (rArm && rArm.parent) {
            const rArmWorldPos = new THREE.Vector3();
            rArm.getWorldPosition(rArmWorldPos);
            const targetDirWorld = currentChalkTraceTarget.clone().sub(rArmWorldPos).normalize();
            const parentWorldQuat = new THREE.Quaternion();
            rArm.parent.getWorldQuaternion(parentWorldQuat);
            const localTargetDir = targetDirWorld.applyQuaternion(parentWorldQuat.invert()).normalize();
            const vRest = new THREE.Vector3(-1, 0, 0);
            const targetQuat = new THREE.Quaternion().setFromUnitVectors(vRest, localTargetDir);
            rArm.quaternion.slerp(targetQuat, Math.min(1.0, delta * 18));
        }
        if (teacherAvatar.rightElbow) {
            teacherAvatar.rightElbow.rotation.set(0, 0.25, 0);
        }

        // Left arm rests naturally at side
        if (teacherAvatar.leftShoulder) teacherAvatar.leftShoulder.rotation.set(0, -0.22, -Math.PI * 0.43);
        if (teacherAvatar.leftElbow) teacherAvatar.leftElbow.rotation.set(0, -0.25, 0);

        // Subtle head tracking of chalk writing spot
        if (teacherAvatar.headGroup) {
            teacherAvatar.headGroup.rotation.y = THREE.MathUtils.lerp(teacherAvatar.headGroup.rotation.y, -0.4, delta * 6);
            teacherAvatar.headGroup.rotation.x = THREE.MathUtils.lerp(teacherAvatar.headGroup.rotation.x, 0.15, delta * 6);
        }

        // Spawn chalk dust sparks if finger/chalk is touching board
        if (isChalkTouchingBoard && chalkDustGroup) {
            spawnChalkDustParticle(currentChalkTraceTarget.x, currentChalkTraceTarget.y, currentChalkTraceTarget.z);
        }

        if (writeProgress >= 1.0) {
            isWritingActive = false;
            teacherState = 'idle';
            applyTeacherStandingPose(teacherAvatar.boneMap);
            const statusText = document.getElementById('teacher-status-text');
            if (statusText) statusText.textContent = `Lesson ready: ${step.stepTitle}`;
        }
    } else if (teacherState === 'pointing') {
        // Teacher facing class with slight tilt
        teacherFacingAngle = THREE.MathUtils.lerp(teacherFacingAngle, 0.25, delta * 6);

        // Legs stay in clean standing pose
        if (teacherAvatar.leftHip) teacherAvatar.leftHip.rotation.set(0, 0, -Math.PI * 0.115);
        if (teacherAvatar.rightHip) teacherAvatar.rightHip.rotation.set(0, 0, Math.PI * 0.115);
        if (teacherAvatar.boneMap['LeftLeg']) teacherAvatar.boneMap['LeftLeg'].rotation.set(0, 0, 0);
        if (teacherAvatar.boneMap['RightLeg']) teacherAvatar.boneMap['RightLeg'].rotation.set(0, 0, 0);

        // Smoothly lerp current aim target
        currentAimPos.lerp(teacherTargetAim, delta * 6);

        // Aim Right Arm with Quaternion (zero mesh twisting)
        const rArm = teacherAvatar.rightShoulder;
        if (rArm && rArm.parent) {
            const rArmWorldPos = new THREE.Vector3();
            rArm.getWorldPosition(rArmWorldPos);
            const targetDirWorld = currentAimPos.clone().sub(rArmWorldPos).normalize();
            const parentWorldQuat = new THREE.Quaternion();
            rArm.parent.getWorldQuaternion(parentWorldQuat);
            const localTargetDir = targetDirWorld.applyQuaternion(parentWorldQuat.invert()).normalize();
            const vRest = new THREE.Vector3(-1, 0, 0);
            const targetQuat = new THREE.Quaternion().setFromUnitVectors(vRest, localTargetDir);
            rArm.quaternion.slerp(targetQuat, Math.min(1.0, delta * 12));
        }
        if (teacherAvatar.rightElbow) {
            teacherAvatar.rightElbow.rotation.set(0, 0.20, 0);
        }

        // Left arm rests naturally at side
        if (teacherAvatar.leftShoulder) teacherAvatar.leftShoulder.rotation.set(0, -0.22, -Math.PI * 0.43);
        if (teacherAvatar.leftElbow) teacherAvatar.leftElbow.rotation.set(0, -0.25, 0);
        if (teacherAvatar.headGroup) teacherAvatar.headGroup.rotation.set(0, 0.15, 0);

    } else if (teacherState === 'explaining' || teacherTalkingIntensity > 0) {
        // Teacher facing class
        teacherFacingAngle = THREE.MathUtils.lerp(teacherFacingAngle, 0.25, delta * 6);

        // Legs stay in clean standing pose
        if (teacherAvatar.leftHip) teacherAvatar.leftHip.rotation.set(0, 0, -Math.PI * 0.115);
        if (teacherAvatar.rightHip) teacherAvatar.rightHip.rotation.set(0, 0, Math.PI * 0.115);
        if (teacherAvatar.boneMap['LeftLeg']) teacherAvatar.boneMap['LeftLeg'].rotation.set(0, 0, 0);
        if (teacherAvatar.boneMap['RightLeg']) teacherAvatar.boneMap['RightLeg'].rotation.set(0, 0, 0);

        // Both arms gesture expressively in front of body
        if (teacherAvatar.rightShoulder) {
            teacherAvatar.rightShoulder.rotation.set(
                Math.sin(time * 3.2) * 0.18,
                0.22,
                Math.PI * 0.35 + Math.cos(time * 2.5) * 0.12
            );
        }
        if (teacherAvatar.rightElbow) {
            teacherAvatar.rightElbow.rotation.set(0, 0.30 + Math.sin(time * 3.0) * 0.12, 0);
        }
        if (teacherAvatar.leftShoulder) {
            teacherAvatar.leftShoulder.rotation.set(
                -Math.sin(time * 2.8) * 0.18,
                -0.22,
                -Math.PI * 0.35 - Math.cos(time * 2.2) * 0.12
            );
        }
        if (teacherAvatar.leftElbow) {
            teacherAvatar.leftElbow.rotation.set(0, -0.30 - Math.cos(time * 2.8) * 0.12, 0);
        }

        // Animated head nod while speaking
        if (teacherAvatar.headGroup) {
            teacherAvatar.headGroup.rotation.x = Math.sin(time * 4.2) * 0.08;
            teacherAvatar.headGroup.rotation.y = THREE.MathUtils.lerp(teacherAvatar.headGroup.rotation.y, Math.sin(time * 2.0) * 0.12, delta * 4);
        }
    } else if (teacherState === 'walking') {
        // WALKING STATE: The Solo MoCap BVH walk clip (teacherMixer) has 100% authority over bones!
        // Arms swing, legs stride, and hips sway with pure MoCap walk locomotion.
    } else {
        // IDLE STATE: Pristine, relaxed upright teacher standing posture
        teacherFacingAngle = THREE.MathUtils.lerp(teacherFacingAngle, 0.25, delta * 6);

        // Legs straight down under hips (shoulder-width)
        if (teacherAvatar.leftHip) teacherAvatar.leftHip.rotation.set(0, 0, -Math.PI * 0.115);
        if (teacherAvatar.rightHip) teacherAvatar.rightHip.rotation.set(0, 0, Math.PI * 0.115);
        if (teacherAvatar.boneMap['LeftLeg']) teacherAvatar.boneMap['LeftLeg'].rotation.set(0, 0, 0);
        if (teacherAvatar.boneMap['RightLeg']) teacherAvatar.boneMap['RightLeg'].rotation.set(0, 0, 0);

        // Arms smoothly relax to sides in front of hips
        const restRightQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.22, Math.PI * 0.43));
        if (teacherAvatar.rightShoulder) teacherAvatar.rightShoulder.quaternion.slerp(restRightQuat, Math.min(1.0, delta * 8));
        const restLeftQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.22, -Math.PI * 0.43));
        if (teacherAvatar.leftShoulder) teacherAvatar.leftShoulder.quaternion.slerp(restLeftQuat, Math.min(1.0, delta * 8));

        if (teacherAvatar.rightElbow) teacherAvatar.rightElbow.rotation.set(0, 0.25, 0);
        if (teacherAvatar.leftElbow) teacherAvatar.leftElbow.rotation.set(0, -0.25, 0);

        // Subtle lifelike breathing motion
        const breathe = Math.sin(time * 1.8) * 0.02;
        if (teacherAvatar.spine) teacherAvatar.spine.rotation.x = breathe;
        if (teacherAvatar.headGroup) teacherAvatar.headGroup.rotation.set(breathe * 0.5, 0.12, 0);
    }

    teacherAvatar.group.rotation.y = teacherFacingAngle;

    // 3. Facial Expression & Blinking
    blinkTimer += delta;
    if (blinkTimer > 3.8) isBlinking = true;
    if (blinkTimer > 4.0) {
        isBlinking = false;
        blinkTimer = 0;
    }
    if (teacherAvatar.eyeGroups) {
        teacherAvatar.eyeGroups.forEach(eg => {
            eg.scale.y = isBlinking ? 0.1 : 1.0;
        });
    }

    // Mouth Animation for Speech
    if (teacherAvatar.smileGroup) {
        if (teacherTalkingIntensity > 0.1) {
            teacherAvatar.smileGroup.scale.y = 1.0 + Math.sin(time * 22) * 0.75 * teacherTalkingIntensity;
            teacherAvatar.smileGroup.scale.x = 1.0 - Math.sin(time * 22) * 0.25 * teacherTalkingIntensity;
        } else {
            teacherAvatar.smileGroup.scale.set(1, 1, 1);
        }
    }

    // 4. Update Chalk Dust Particles
    if (chalkDustGroup) {
        chalkDustGroup.children.forEach(spark => {
            if (spark.visible) {
                spark.position.x += spark.userData.vx * delta;
                spark.position.y += spark.userData.vy * delta;
                spark.position.z += spark.userData.vz * delta;
                spark.userData.vy -= 9.8 * delta; // Gravity
                spark.userData.life += delta;
                
                const t = spark.userData.life / spark.userData.maxLife;
                if (t >= 1.0) {
                    spark.visible = false;
                } else {
                    spark.scale.setScalar(Math.max(0.1, 1.0 - t));
                }
            }
        });
    }
}

function spawnChalkDustParticle(x, y, z) {
    if (!chalkDustGroup) return;
    const spark = chalkDustGroup.children.find(s => !s.visible);
    if (spark) {
        spark.visible = true;
        spark.position.set(x + (Math.random() - 0.5) * 0.1, y + (Math.random() - 0.5) * 0.1, z + 0.05);
        spark.userData.vx = (Math.random() - 0.5) * 1.8;
        spark.userData.vy = Math.random() * 1.5 + 0.4;
        spark.userData.vz = Math.random() * 1.2 + 0.2;
        spark.userData.life = 0;
        spark.userData.maxLife = 0.35 + Math.random() * 0.25;
        spark.scale.setScalar(1.0);
    }
}

// =========================================================================
// PROCEDURAL HUMAN CHALK HANDWRITING VECTOR ENGINE
// =========================================================================
const STROKE_GLYPHS = {
    'x': [
        [{x: 0.15, y: 0.2}, {x: 0.85, y: 0.85}],
        [{x: 0.85, y: 0.2}, {x: 0.15, y: 0.85}]
    ],
    'y': [
        [{x: 0.15, y: 0.2}, {x: 0.5, y: 0.55}],
        [{x: 0.85, y: 0.2}, {x: 0.2, y: 1.05}]
    ],
    '=': [
        [{x: 0.12, y: 0.38}, {x: 0.88, y: 0.38}],
        [{x: 0.12, y: 0.65}, {x: 0.88, y: 0.65}]
    ],
    '+': [
        [{x: 0.15, y: 0.5}, {x: 0.85, y: 0.5}],
        [{x: 0.5, y: 0.15}, {x: 0.5, y: 0.85}]
    ],
    '-': [
        [{x: 0.15, y: 0.5}, {x: 0.85, y: 0.5}]
    ],
    '±': [
        [{x: 0.15, y: 0.38}, {x: 0.85, y: 0.38}],
        [{x: 0.5, y: 0.12}, {x: 0.5, y: 0.64}],
        [{x: 0.2, y: 0.86}, {x: 0.8, y: 0.86}]
    ],
    '√': [
        [{x: 0.05, y: 0.55}, {x: 0.2, y: 0.45}, {x: 0.38, y: 0.95}, {x: 0.62, y: 0.08}, {x: 1.05, y: 0.08}]
    ],
    '(': [
        [{x: 0.7, y: 0.05}, {x: 0.3, y: 0.5}, {x: 0.7, y: 0.95}]
    ],
    ')': [
        [{x: 0.3, y: 0.05}, {x: 0.7, y: 0.5}, {x: 0.3, y: 0.95}]
    ],
    '/': [
        [{x: 0.85, y: 0.05}, {x: 0.15, y: 0.95}]
    ],
    '²': [
        [{x: 0.15, y: 0.18}, {x: 0.45, y: 0.02}, {x: 0.8, y: 0.18}, {x: 0.2, y: 0.48}, {x: 0.8, y: 0.48}]
    ],
    '³': [
        [{x: 0.2, y: 0.05}, {x: 0.75, y: 0.05}, {x: 0.45, y: 0.28}, {x: 0.75, y: 0.38}, {x: 0.25, y: 0.52}]
    ],
    'a': [
        [{x: 0.8, y: 0.45}, {x: 0.45, y: 0.25}, {x: 0.2, y: 0.55}, {x: 0.45, y: 0.85}, {x: 0.8, y: 0.65}],
        [{x: 0.8, y: 0.25}, {x: 0.8, y: 0.85}]
    ],
    'b': [
        [{x: 0.2, y: 0.05}, {x: 0.2, y: 0.85}],
        [{x: 0.2, y: 0.42}, {x: 0.7, y: 0.32}, {x: 0.85, y: 0.62}, {x: 0.55, y: 0.88}, {x: 0.2, y: 0.85}]
    ],
    'c': [
        [{x: 0.85, y: 0.32}, {x: 0.45, y: 0.22}, {x: 0.2, y: 0.55}, {x: 0.45, y: 0.88}, {x: 0.85, y: 0.78}]
    ],
    'd': [
        [{x: 0.8, y: 0.05}, {x: 0.8, y: 0.85}],
        [{x: 0.8, y: 0.42}, {x: 0.3, y: 0.32}, {x: 0.15, y: 0.62}, {x: 0.45, y: 0.88}, {x: 0.8, y: 0.85}]
    ],
    'e': [
        [{x: 0.2, y: 0.52}, {x: 0.82, y: 0.52}, {x: 0.7, y: 0.22}, {x: 0.3, y: 0.22}, {x: 0.18, y: 0.58}, {x: 0.4, y: 0.88}, {x: 0.82, y: 0.82}]
    ],
    'f': [
        [{x: 0.75, y: 0.1}, {x: 0.45, y: 0.05}, {x: 0.45, y: 0.88}],
        [{x: 0.2, y: 0.45}, {x: 0.75, y: 0.45}]
    ],
    'i': [
        [{x: 0.5, y: 0.35}, {x: 0.5, y: 0.85}],
        [{x: 0.5, y: 0.15}, {x: 0.52, y: 0.18}]
    ],
    'l': [
        [{x: 0.5, y: 0.08}, {x: 0.5, y: 0.88}]
    ],
    'm': [
        [{x: 0.15, y: 0.85}, {x: 0.15, y: 0.35}, {x: 0.45, y: 0.35}, {x: 0.45, y: 0.85}],
        [{x: 0.45, y: 0.35}, {x: 0.85, y: 0.35}, {x: 0.85, y: 0.85}]
    ],
    'n': [
        [{x: 0.2, y: 0.85}, {x: 0.2, y: 0.35}, {x: 0.75, y: 0.35}, {x: 0.75, y: 0.85}]
    ],
    'p': [
        [{x: 0.2, y: 0.35}, {x: 0.2, y: 1.05}],
        [{x: 0.2, y: 0.42}, {x: 0.7, y: 0.35}, {x: 0.8, y: 0.6}, {x: 0.55, y: 0.75}, {x: 0.2, y: 0.75}]
    ],
    'r': [
        [{x: 0.25, y: 0.85}, {x: 0.25, y: 0.35}, {x: 0.55, y: 0.25}, {x: 0.8, y: 0.35}]
    ],
    's': [
        [{x: 0.78, y: 0.3}, {x: 0.45, y: 0.22}, {x: 0.25, y: 0.4}, {x: 0.75, y: 0.65}, {x: 0.5, y: 0.85}, {x: 0.2, y: 0.78}]
    ],
    't': [
        [{x: 0.45, y: 0.1}, {x: 0.45, y: 0.85}, {x: 0.65, y: 0.85}],
        [{x: 0.2, y: 0.35}, {x: 0.75, y: 0.35}]
    ],
    'u': [
        [{x: 0.2, y: 0.35}, {x: 0.2, y: 0.75}, {x: 0.5, y: 0.88}, {x: 0.8, y: 0.75}, {x: 0.8, y: 0.35}],
        [{x: 0.8, y: 0.5}, {x: 0.8, y: 0.88}]
    ],
    'v': [
        [{x: 0.15, y: 0.35}, {x: 0.5, y: 0.88}, {x: 0.85, y: 0.35}]
    ],
    'w': [
        [{x: 0.15, y: 0.35}, {x: 0.35, y: 0.88}, {x: 0.5, y: 0.5}, {x: 0.65, y: 0.88}, {x: 0.85, y: 0.35}]
    ],
    'π': [
        [{x: 0.15, y: 0.25}, {x: 0.85, y: 0.25}],
        [{x: 0.35, y: 0.25}, {x: 0.3, y: 0.85}],
        [{x: 0.65, y: 0.25}, {x: 0.7, y: 0.85}]
    ],
    'θ': [
        [{x: 0.5, y: 0.1}, {x: 0.2, y: 0.5}, {x: 0.5, y: 0.9}, {x: 0.8, y: 0.5}, {x: 0.5, y: 0.1}],
        [{x: 0.22, y: 0.5}, {x: 0.78, y: 0.5}]
    ],
    '0': [
        [{x: 0.5, y: 0.1}, {x: 0.2, y: 0.5}, {x: 0.5, y: 0.9}, {x: 0.8, y: 0.5}, {x: 0.5, y: 0.1}]
    ],
    '1': [
        [{x: 0.25, y: 0.3}, {x: 0.5, y: 0.1}, {x: 0.5, y: 0.9}],
        [{x: 0.2, y: 0.9}, {x: 0.8, y: 0.9}]
    ],
    '2': [
        [{x: 0.2, y: 0.3}, {x: 0.5, y: 0.1}, {x: 0.8, y: 0.3}, {x: 0.2, y: 0.9}, {x: 0.85, y: 0.9}]
    ],
    '3': [
        [{x: 0.2, y: 0.18}, {x: 0.8, y: 0.18}, {x: 0.45, y: 0.48}, {x: 0.8, y: 0.68}, {x: 0.3, y: 0.9}]
    ],
    '4': [
        [{x: 0.75, y: 0.1}, {x: 0.2, y: 0.62}, {x: 0.9, y: 0.62}],
        [{x: 0.75, y: 0.3}, {x: 0.75, y: 0.9}]
    ],
    '5': [
        [{x: 0.8, y: 0.15}, {x: 0.25, y: 0.15}, {x: 0.25, y: 0.48}, {x: 0.78, y: 0.55}, {x: 0.65, y: 0.9}, {x: 0.25, y: 0.85}]
    ],
    '9': [
        [{x: 0.78, y: 0.45}, {x: 0.5, y: 0.1}, {x: 0.22, y: 0.35}, {x: 0.5, y: 0.58}, {x: 0.78, y: 0.45}, {x: 0.78, y: 0.9}]
    ],
    '∫': [
        [{x: 0.75, y: 0.08}, {x: 0.4, y: 0.15}, {x: 0.4, y: 0.8}, {x: 0.25, y: 0.92}]
    ]
};

/**
 * Converts any formula string into a connected sequence of parametric 2D human handwriting strokes
 */
function compileFormulaVectorStrokes(text, startX = 65, startY = 195, glyphW = 20, glyphH = 38) {
    const strokes = [];
    let curX = startX;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === ' ') {
            curX += glyphW * 0.75;
            continue;
        }

        const glyphDef = STROKE_GLYPHS[char] || STROKE_GLYPHS[char.toLowerCase()];
        const w = (char === 'm' || char === 'w' || char === '√') ? glyphW * 1.3 : (char === 'i' || char === 'l' || char === '(' || char === ')') ? glyphW * 0.65 : glyphW;

        if (glyphDef) {
            glyphDef.forEach(strokePoints => {
                const worldPts = strokePoints.map(p => ({
                    x: curX + p.x * w,
                    y: startY + p.y * glyphH
                }));
                strokes.push(worldPts);
            });
        } else {
            // Generic legible fallback stroke
            strokes.push([
                { x: curX + w * 0.2, y: startY + glyphH * 0.2 },
                { x: curX + w * 0.8, y: startY + glyphH * 0.8 }
            ]);
        }

        curX += w + 4;
    }

    return strokes;
}

/**
 * Renders human handwriting strokes onto canvas and computes live 3D chalk pen position
 */
function renderHumanChalkStrokes(ctx, strokes, progress) {
    let totalLength = 0;
    const strokeLengths = [];

    strokes.forEach(pts => {
        let len = 0;
        for (let i = 1; i < pts.length; i++) {
            const dx = pts[i].x - pts[i - 1].x;
            const dy = pts[i].y - pts[i - 1].y;
            len += Math.sqrt(dx * dx + dy * dy);
        }
        strokeLengths.push(len);
        totalLength += len;
    });

    const targetDist = progress * totalLength;
    let accumDist = 0;
    let penX = strokes[0]?.[0]?.x || 65;
    let penY = strokes[0]?.[0]?.y || 195;
    let penDown = true;

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 3;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';

    for (let s = 0; s < strokes.length; s++) {
        const pts = strokes[s];
        const sLen = strokeLengths[s];

        if (accumDist + sLen <= targetDist) {
            // Full stroke completed
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let p = 1; p < pts.length; p++) {
                ctx.lineTo(pts[p].x, pts[p].y);
            }
            ctx.stroke();
            accumDist += sLen;
            penX = pts[pts.length - 1].x;
            penY = pts[pts.length - 1].y;
            penDown = false; // Lifting between strokes
        } else if (accumDist < targetDist) {
            // Partially drawn active stroke
            const rem = targetDist - accumDist;
            let subAccum = 0;

            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);

            for (let p = 1; p < pts.length; p++) {
                const segLen = Math.hypot(pts[p].x - pts[p - 1].x, pts[p].y - pts[p - 1].y);
                if (subAccum + segLen <= rem) {
                    ctx.lineTo(pts[p].x, pts[p].y);
                    subAccum += segLen;
                    penX = pts[p].x;
                    penY = pts[p].y;
                } else {
                    const frac = (rem - subAccum) / Math.max(0.001, segLen);
                    penX = pts[p - 1].x + (pts[p].x - pts[p - 1].x) * frac;
                    penY = pts[p - 1].y + (pts[p].y - pts[p - 1].y) * frac;
                    ctx.lineTo(penX, penY);
                    break;
                }
            }
            ctx.stroke();
            penDown = true;
            break;
        } else {
            break;
        }
    }

    ctx.restore();

    return { penX, penY, penDown };
}

/**
 * Paints complete equations, highlights, and graphs directly on the 3D blackboard canvas texture
 * Supports genuine human vector chalk writing and tracks live 3D finger writing coordinates
 */
function draw3DBlackboardContent(lesson, step, writeP = 1.0) {
    if (!blackboardCanvas || !blackboardCtx) return;
    const ctx = blackboardCtx;
    const w = blackboardCanvas.width;
    const h = blackboardCanvas.height;

    // 1. Dark Slate Chalkboard Base
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, 700);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#060911');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Chalk dust faint grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let x = 0; x < w; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = 0; y < h; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // Outer border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, w - 30, h - 30);

    // 2. Header Bar
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 34px "Inter", sans-serif';
    ctx.fillText(`📐 ${lesson.title}`, 45, 65);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 24px "Inter", sans-serif';
    ctx.fillText(`${step.stepTitle}`, 45, 105);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(45, 122);
    ctx.lineTo(w - 45, 122);
    ctx.stroke();

    // 3. Left Formula Box: Authentic Human Vector Stroke Chalk Writing
    const leftW = 540;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(45, 150, leftW, 200, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 15px "Inter", sans-serif';
    ctx.fillText("EQUATION FORMULA", 65, 180);

    // Generate and render human handwriting strokes for the equation
    const vectorStrokes = compileFormulaVectorStrokes(step.equationText, 65, 205, 22, 42);
    const penState = renderHumanChalkStrokes(ctx, vectorStrokes, writeP);

    if (writeP < 1.0) {
        // Convert canvas pixel (1200 x 720) to 3D world coordinates on blackboard
        const chalkWorldX = 2.5 + (penState.penX / w - 0.5) * 16;
        const chalkWorldY = 8.5 + (0.5 - penState.penY / h) * 9.5;
        const chalkWorldZ = penState.penDown ? 0.18 : 0.42;

        currentChalkTraceTarget.set(chalkWorldX, chalkWorldY, chalkWorldZ);
        isChalkTouchingBoard = penState.penDown;
    } else {
        isChalkTouchingBoard = false;
    }

    // Active Term Focus Box
    if (step.activeTerm && writeP > 0.3) {
        const found = lesson.terms.find(t => t.id === step.activeTerm);
        if (found) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(65, 270, leftW - 40, 65, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fca5a5';
            ctx.font = 'bold 16px "Inter", sans-serif';
            ctx.fillText(`Focus: ${found.label}`, 80, 295);
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '14px "Inter", sans-serif';
            ctx.fillText(found.desc, 80, 320);
        }
    }

    // Explanation Transcript Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(45, 375, leftW, 280, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 17px "Inter", sans-serif';
    ctx.fillText(`💡 ${step.stepTitle}`, 65, 410);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '16px "Inter", sans-serif';
    wrapText(ctx, step.speech, 65, 450, leftW - 40, 28);

    // 4. Right 2D Math Coordinate Grid & Graphs
    const rightX = 630;
    const rightY = 150;
    const rightW = 525;
    const rightH = 505;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(rightX, rightY, rightW, rightH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.fillText("VISUAL GRAPH & GEOMETRY", rightX + 20, rightY + 32);

    const cx = rightX + rightW / 2;
    const cy = rightY + rightH / 2 + 15;

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let gx = -200; gx <= 200; gx += 30) {
        ctx.beginPath();
        ctx.moveTo(cx + gx, rightY + 50);
        ctx.lineTo(cx + gx, rightY + rightH - 20);
        ctx.stroke();
    }
    for (let gy = -180; gy <= 180; gy += 30) {
        ctx.beginPath();
        ctx.moveTo(rightX + 20, cy + gy);
        ctx.lineTo(rightX + rightW - 20, cy + gy);
        ctx.stroke();
    }

    // Main Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rightX + 20, cy);
    ctx.lineTo(rightX + rightW - 20, cy);
    ctx.moveTo(cx, rightY + 50);
    ctx.lineTo(cx, rightY + rightH - 20);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "Inter"';
    ctx.fillText("+X", rightX + rightW - 35, cy - 8);
    ctx.fillText("+Y", cx + 8, rightY + 65);

    // Draw active mathematical shape with writeProgress
    drawLessonGraph(ctx, step.graphType, cx, cy, step.graphParams, writeP);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '13px "Inter", sans-serif';
    ctx.fillText("XtraPath SmartBoard • Interactive Math Classroom Engine", 45, h - 25);

    if (blackboardTexture) blackboardTexture.needsUpdate = true;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
}

function drawLessonGraph(ctx, type, cx, cy, params, writeP = 1.0) {
    if (!type) return;

    if (type.startsWith('parabola')) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        const maxPts = Math.floor(80 * Math.min(1.0, writeP * 1.2));
        let ptCount = 0;
        for (let px = -3.5; px <= 5.5; px += 0.1) {
            if (ptCount++ > maxPts) break;
            const py = (px - 1) * (px - 1) - 4;
            const sx = cx + px * 24;
            const sy = cy - py * 24 * 0.35;
            if (px === -3.5) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        if (writeP > 0.6) {
            const r1x = cx - 1 * 24;
            const r2x = cx + 3 * 24;
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(r1x, cy, 7, 0, Math.PI * 2);
            ctx.arc(r2x, cy, 7, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 15px "JetBrains Mono", monospace';
            ctx.fillText("x = -1", r1x - 22, cy + 26);
            ctx.fillText("x = 3", r2x - 12, cy + 26);

            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(cx + 24, cy + 4 * 24 * 0.35, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillText("Vertex (1, -4)", cx + 24 - 45, cy + 4 * 24 * 0.35 + 24);
        }
    } else if (type.startsWith('tangent') || type.startsWith('secant')) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        for (let px = -4; px <= 4; px += 0.1) {
            const py = 0.12 * px * px * px;
            const sx = cx + px * 40;
            const sy = cy - py * 30;
            if (px === -4) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 100, cy + 55);
        ctx.lineTo(cx + 100, cy - 75);
        ctx.stroke();
    } else if (type.startsWith('riemann') || type.startsWith('integral')) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        const barW = 28;
        for (let bx = -4; bx <= 4; bx += 1) {
            const hVal = Math.max(0, (4 - 0.25 * bx * bx) * 20);
            const sx = cx + bx * barW;
            const sy = cy - hVal;
            ctx.fillRect(sx - barW / 2, sy, barW, hVal);
            ctx.strokeRect(sx - barW / 2, sy, barW, hVal);
        }

        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        for (let px = -5; px <= 5; px += 0.1) {
            const py = (4 - 0.25 * px * px) * 20;
            const sx = cx + px * barW;
            const sy = cy - py;
            if (px === -5) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 15px "JetBrains Mono"';
        ctx.fillText("Area = ∫ f(x) dx", cx - 60, cy - 110);
    }
}

// =========================================================================
// 🐾 3D ANIMAL STUDIO & QUADRUPED KINEMATICS ENGINE
// =========================================================================

/**
 * Initializes the Animal Studio 3D environment, ground anchor, and default animal rig.
 */
function initAnimalStudio() {
    if (animalStudioGroup) return;

    animalStudioGroup = new THREE.Group();
    // Anchor animal at ground level (-16.2 is where the floor grid sits)
    animalStudioGroup.position.set(0, -16.2, 0);
    scene.add(animalStudioGroup);

    rebuildAnimalCharacter();
}

/**
 * Rebuilds the animal skeleton and cartoon mesh for current species & coat.
 */
function rebuildAnimalCharacter() {
    if (!animalStudioGroup) return;

    // Remove previous character children
    while (animalStudioGroup.children.length > 0) {
        animalStudioGroup.remove(animalStudioGroup.children[0]);
    }
    animalBoneMap = {};
    currentAnimalMeshGroup = null;
    animalSkeletonHelper = null;

    // 1. Build true articulated THREE.Skeleton
    const rig = createAnimalSkeleton(currentAnimalSpecies);
    currentAnimalSkeleton = rig.skeleton;
    animalBoneMap = rig.boneMap;

    const rootBone = rig.rootBone;
    animalStudioGroup.add(rootBone);

    // 2. Wireframe Skeleton Helper
    animalSkeletonHelper = new THREE.SkeletonHelper(rootBone);
    animalSkeletonHelper.skeleton = currentAnimalSkeleton;
    const skeletonToggle = document.getElementById('animal-skeleton-toggle');
    animalSkeletonHelper.visible = skeletonToggle ? skeletonToggle.checked : false;
    animalStudioGroup.add(animalSkeletonHelper);

    // 3. Realistic Stylized Cartoon Mesh Skin
    currentAnimalMeshGroup = buildAnimalCartoonMesh(currentAnimalSkeleton, currentAnimalSpecies, currentAnimalCoat);
    const meshToggle = document.getElementById('animal-mesh-toggle');
    currentAnimalMeshGroup.visible = meshToggle ? meshToggle.checked : true;
    rootBone.add(currentAnimalMeshGroup);

    // Update status text
    const statusEl = document.getElementById('animal-status-text');
    if (statusEl) {
        const speciesNames = { 
            dog: '🐕 Shiba Inu', 
            cat: '🐆 Cheetah / Panther', 
            dino: '🦖 Velociraptor',
            bird: '🦅 Golden Eagle / Falcon'
        };
        statusEl.textContent = `🐾 ${speciesNames[currentAnimalSpecies] || 'Animal'} loaded. Gait: ${currentAnimalGait.toUpperCase()}`;
        statusEl.style.color = '#34d399';
    }
}

/**
 * Creates anatomically authentic articulated bones for Quadruped (Dog/Cat) or Theropod (Dino).
 */
function createAnimalSkeleton(species) {
    const bones = [];
    const boneMap = {};

    function addBone(name, parent = null, localPos = new THREE.Vector3()) {
        const b = new THREE.Bone();
        b.name = name;
        b.position.copy(localPos);
        if (parent) {
            parent.add(b);
        }
        bones.push(b);
        boneMap[name] = b;
        return b;
    }

    if (species === 'dino') {
        // Theropod Dinosaur Skeleton (Velociraptor horizontal posture)
        const root = addBone('Pelvis', null, new THREE.Vector3(0, 10.5, 0));
        const spine1 = addBone('Spine1', root, new THREE.Vector3(0, 0.4, 2.5));
        const spine2 = addBone('Spine2', spine1, new THREE.Vector3(0, 0.3, 2.6));
        const chest = addBone('Chest', spine2, new THREE.Vector3(0, 0.2, 2.5));
        const neck = addBone('Neck', chest, new THREE.Vector3(0, 1.8, 2.2));
        const skull = addBone('Skull', neck, new THREE.Vector3(0, 0.5, 2.4));
        addBone('Snout', skull, new THREE.Vector3(0, -0.4, 2.6));
        addBone('LowerJaw', skull, new THREE.Vector3(0, -0.9, 1.8));

        // Long counter-balancing tail chain
        const t1 = addBone('Tail1', root, new THREE.Vector3(0, -0.2, -2.6));
        const t2 = addBone('Tail2', t1, new THREE.Vector3(0, -0.2, -3.0));
        const t3 = addBone('Tail3', t2, new THREE.Vector3(0, -0.1, -3.0));
        const t4 = addBone('Tail4', t3, new THREE.Vector3(0, 0.0, -3.0));
        const t5 = addBone('Tail5', t4, new THREE.Vector3(0, 0.1, -2.8));
        addBone('Tail6', t5, new THREE.Vector3(0, 0.1, -2.6));

        // Raptor Arms
        const lArm = addBone('L_Scapula', chest, new THREE.Vector3(1.6, -0.8, 1.2));
        const lForearm = addBone('L_Radius', lArm, new THREE.Vector3(0.2, -2.0, 1.4));
        addBone('L_FrontPaw', lForearm, new THREE.Vector3(0, -0.8, 0.8));

        const rArm = addBone('R_Scapula', chest, new THREE.Vector3(-1.6, -0.8, 1.2));
        const rForearm = addBone('R_Radius', rArm, new THREE.Vector3(-0.2, -2.0, 1.4));
        addBone('R_FrontPaw', rForearm, new THREE.Vector3(0, -0.8, 0.8));

        // Powerful Digitigrade Raptor Legs with Sickle Claws
        const lFemur = addBone('L_Femur', root, new THREE.Vector3(2.2, -0.8, -0.4));
        const lTibia = addBone('L_Tibia', lFemur, new THREE.Vector3(0.3, -4.2, -1.8));
        const lHock = addBone('L_Hock', lTibia, new THREE.Vector3(-0.2, -3.8, 2.4));
        const lMeta = addBone('L_Metatarsus', lHock, new THREE.Vector3(0, -1.7, 0.8));
        addBone('L_HindPaw', lMeta, new THREE.Vector3(0, -0.6, 0.8));

        const rFemur = addBone('R_Femur', root, new THREE.Vector3(-2.2, -0.8, -0.4));
        const rTibia = addBone('R_Tibia', rFemur, new THREE.Vector3(-0.3, -4.2, -1.8));
        const rHock = addBone('R_Hock', rTibia, new THREE.Vector3(0.2, -3.8, 2.4));
        const rMeta = addBone('R_Metatarsus', rHock, new THREE.Vector3(0, -1.7, 0.8));
        addBone('R_HindPaw', rMeta, new THREE.Vector3(0, -0.6, 0.8));
    } else if (species === 'bird') {
        // Avian Raptor Skeleton (Eagle / Falcon)
        // Central pelvic synsacrum
        const root = addBone('Pelvis', null, new THREE.Vector3(0, 11.2, -0.6));
        const spine1 = addBone('Spine1', root, new THREE.Vector3(0, 0.2, 1.5));
        const chest = addBone('Chest', spine1, new THREE.Vector3(0, 0.3, 1.8));

        // Flexible S-Curve Avian Cervical Neck
        const neck1 = addBone('Neck1', chest, new THREE.Vector3(0, 1.1, 0.9));
        const neck2 = addBone('Neck2', neck1, new THREE.Vector3(0, 1.0, 0.5));
        const head = addBone('Head', neck2, new THREE.Vector3(0, 0.8, 0.8));
        addBone('Beak', head, new THREE.Vector3(0, -0.2, 1.3));
        addBone('LowerBeak', head, new THREE.Vector3(0, -0.5, 1.0));
        addBone('Crest', head, new THREE.Vector3(0, 1.0, -0.6));

        // Pygostyle & Rudder Fan Tail
        const tail1 = addBone('Tail1', root, new THREE.Vector3(0, -0.1, -1.8));
        addBone('Tail2', tail1, new THREE.Vector3(0, -0.2, -2.4));

        // Articulated Flight Wings: Scapula -> Humerus -> Radius -> Carpus -> WingTip
        const lScap = addBone('L_Scapula', chest, new THREE.Vector3(1.2, 0.3, 0.4));
        const lHum = addBone('L_Humerus', lScap, new THREE.Vector3(2.0, 0.1, -0.2));
        const lRad = addBone('L_Radius', lHum, new THREE.Vector3(2.6, -0.1, 0.4));
        const lCarp = addBone('L_Carpus', lRad, new THREE.Vector3(2.4, -0.2, -0.3));
        addBone('L_WingTip', lCarp, new THREE.Vector3(2.2, -0.1, -0.5));

        const rScap = addBone('R_Scapula', chest, new THREE.Vector3(-1.2, 0.3, 0.4));
        const rHum = addBone('R_Humerus', rScap, new THREE.Vector3(-2.0, 0.1, -0.2));
        const rRad = addBone('R_Radius', rHum, new THREE.Vector3(-2.6, -0.1, 0.4));
        const rCarp = addBone('R_Carpus', rRad, new THREE.Vector3(-2.4, -0.2, -0.3));
        addBone('R_WingTip', rCarp, new THREE.Vector3(-2.2, -0.1, -0.5));

        // Avian Legs & Grasping Talons: Femur -> Tibia -> Hock -> Paw
        const lFem = addBone('L_Femur', root, new THREE.Vector3(1.0, -0.5, -0.2));
        const lTib = addBone('L_Tibia', lFem, new THREE.Vector3(0.2, -2.2, 0.8));
        const lTars = addBone('L_Hock', lTib, new THREE.Vector3(-0.1, -2.1, -0.9));
        addBone('L_HindPaw', lTars, new THREE.Vector3(0, -0.9, 0.4));

        const rFem = addBone('R_Femur', root, new THREE.Vector3(-1.0, -0.5, -0.2));
        const rTib = addBone('R_Tibia', rFem, new THREE.Vector3(-0.2, -2.2, 0.8));
        const rTars = addBone('R_Hock', rTib, new THREE.Vector3(0.1, -2.1, -0.9));
        addBone('R_HindPaw', rTars, new THREE.Vector3(0, -0.9, 0.4));
    } else {
        // Quadruped Skeleton (Canine & Feline)
        const isCat = (species === 'cat');
        const hipH = isCat ? 9.5 : 10.2;
        const root = addBone('Pelvis', null, new THREE.Vector3(0, hipH, -3.6));
        const spine1 = addBone('Spine1', root, new THREE.Vector3(0, 0.2, 2.7));
        const spine2 = addBone('Spine2', spine1, new THREE.Vector3(0, 0.3, 2.8));
        const chest = addBone('Chest', spine2, new THREE.Vector3(0, 0.2, 2.8));
        const neck = addBone('Neck', chest, new THREE.Vector3(0, 2.2, 1.8));
        const head = addBone('Head', neck, new THREE.Vector3(0, 1.6, 1.6));
        addBone('Snout', head, new THREE.Vector3(0, -0.2, isCat ? 1.4 : 1.9));
        addBone('Jaw', head, new THREE.Vector3(0, -0.8, 1.0));
        addBone('L_Ear', head, new THREE.Vector3(isCat ? 1.0 : 1.2, isCat ? 1.2 : 1.6, -0.3));
        addBone('R_Ear', head, new THREE.Vector3(isCat ? -1.0 : -1.2, isCat ? 1.2 : 1.6, -0.3));

        // Articulated Tail Chain
        const t1 = addBone('Tail1', root, new THREE.Vector3(0, 0.4, -1.6));
        const t2 = addBone('Tail2', t1, new THREE.Vector3(0, -0.2, -2.0));
        const t3 = addBone('Tail3', t2, new THREE.Vector3(0, -0.4, -2.0));
        const t4 = addBone('Tail4', t3, new THREE.Vector3(0, -0.3, -2.0));
        if (isCat) {
            addBone('Tail5', t4, new THREE.Vector3(0, 0.2, -1.8));
        }

        // Forelimbs: Scapula -> Humerus -> Radius -> Carpus -> Paw
        // Forelimbs have narrower shoulder track width (X ~ 1.55-1.65)
        const foreX = isCat ? 1.55 : 1.65;
        // Hindlimbs have wider pelvic track width (X ~ 2.20-2.35) to prevent leg clipping
        const hindX = isCat ? 2.20 : 2.35;

        const lScapula = addBone('L_Scapula', chest, new THREE.Vector3(foreX, 0.4, 0.8));
        const lHumerus = addBone('L_Humerus', lScapula, new THREE.Vector3(0.15, -3.2, -0.4));
        const lRadius = addBone('L_Radius', lHumerus, new THREE.Vector3(0.0, -3.4, 0.8));
        const lCarpus = addBone('L_Carpus', lRadius, new THREE.Vector3(0, -1.4, 0.2));
        addBone('L_FrontPaw', lCarpus, new THREE.Vector3(0, -0.8, 0.5));

        const rScapula = addBone('R_Scapula', chest, new THREE.Vector3(-foreX, 0.4, 0.8));
        const rHumerus = addBone('R_Humerus', rScapula, new THREE.Vector3(-0.15, -3.2, -0.4));
        const rRadius = addBone('R_Radius', rHumerus, new THREE.Vector3(0.0, -3.4, 0.8));
        const rCarpus = addBone('R_Carpus', rRadius, new THREE.Vector3(0, -1.4, 0.2));
        addBone('R_FrontPaw', rCarpus, new THREE.Vector3(0, -0.8, 0.5));

        // Hindlimbs: Femur -> Tibia -> Hock -> Metatarsus -> Paw
        const lFemur = addBone('L_Femur', root, new THREE.Vector3(hindX, -0.5, -0.6));
        const lTibia = addBone('L_Tibia', lFemur, new THREE.Vector3(0.2, -3.4, -1.2));
        const lHock = addBone('L_Hock', lTibia, new THREE.Vector3(-0.05, -3.0, 1.8));
        const lMeta = addBone('L_Metatarsus', lHock, new THREE.Vector3(0, -1.5, 0.2));
        addBone('L_HindPaw', lMeta, new THREE.Vector3(0, -0.8, 0.5));

        const rFemur = addBone('R_Femur', root, new THREE.Vector3(-hindX, -0.5, -0.6));
        const rTibia = addBone('R_Tibia', rFemur, new THREE.Vector3(-0.2, -3.4, -1.2));
        const rHock = addBone('R_Hock', rTibia, new THREE.Vector3(0.05, -3.0, 1.8));
        const rMeta = addBone('R_Metatarsus', rHock, new THREE.Vector3(0, -1.5, 0.2));
        addBone('R_HindPaw', rMeta, new THREE.Vector3(0, -0.8, 0.5));
    }

    const skeleton = new THREE.Skeleton(bones);
    return { skeleton, boneMap, rootBone: bones[0] };
}

/**
 * Builds the 3D stylized cartoon character geometry attached to the skeleton bones.
 */
function buildAnimalCartoonMesh(skeleton, species, coat) {
    const meshRoot = new THREE.Group();

    // Color Palettes
    const PALETTES = {
        dog: {
            default: { fur: 0xd97706, belly: 0xfef3c7, nose: 0x18181b, eyes: 0x451a03, collar: 0xdc2626, tag: 0xfacc15 },
            golden:  { fur: 0xf59e0b, belly: 0xfef9c3, nose: 0x18181b, eyes: 0x292524, collar: 0x2563eb, tag: 0xfacc15 },
            midnight:{ fur: 0x1e293b, belly: 0x64748b, nose: 0x09090b, eyes: 0x38bdf8, collar: 0x9333ea, tag: 0xfacc15 },
            snow:    { fur: 0xf8fafc, belly: 0xffffff, nose: 0x0f172a, eyes: 0x0284c7, collar: 0xef4444, tag: 0xfacc15 }
        },
        cat: {
            default: { fur: 0xeab308, belly: 0xfef08a, nose: 0xf43f5e, eyes: 0x10b981, collar: 0x8b5cf6, tag: 0xfacc15 },
            golden:  { fur: 0xf97316, belly: 0xffedd5, nose: 0xfb7185, eyes: 0x059669, collar: 0x0284c7, tag: 0xfacc15 },
            midnight:{ fur: 0x09090b, belly: 0x18181b, nose: 0x09090b, eyes: 0xfacc15, collar: 0xe11d48, tag: 0xfacc15 },
            snow:    { fur: 0xf1f5f9, belly: 0xffffff, nose: 0xf472b6, eyes: 0x38bdf8, collar: 0x10b981, tag: 0xfacc15 }
        },
        dino: {
            default: { fur: 0x15803d, belly: 0xa3e635, nose: 0x052e16, eyes: 0xef4444, collar: 0xf59e0b, tag: 0xfacc15 },
            golden:  { fur: 0xd97706, belly: 0xfde047, nose: 0x451a03, eyes: 0xdc2626, collar: 0x10b981, tag: 0xfacc15 },
            midnight:{ fur: 0x0f172a, belly: 0x334155, nose: 0x020617, eyes: 0xfacc15, collar: 0xef4444, tag: 0xfacc15 },
            snow:    { fur: 0x93c5fd, belly: 0xdbeafe, nose: 0x1e3a8a, eyes: 0x6366f1, collar: 0x059669, tag: 0xfacc15 }
        },
        bird: {
            default: { fur: 0x451a03, belly: 0xfef3c7, head: 0xf8fafc, beak: 0xfbbf24, eyes: 0xfacc15, talon: 0xf59e0b, wing: 0x2e1005, tip: 0x18181b },
            golden:  { fur: 0xd97706, belly: 0xfef08a, head: 0xf97316, beak: 0xfacc15, eyes: 0x38bdf8, talon: 0xfbbf24, wing: 0xb45309, tip: 0x7c2d12 },
            midnight:{ fur: 0x09090b, belly: 0x18181b, head: 0x1e293b, beak: 0x64748b, eyes: 0x60a5fa, talon: 0x334155, wing: 0x0f172a, tip: 0x020617 },
            snow:    { fur: 0xf8fafc, belly: 0xffffff, head: 0xf1f5f9, beak: 0x334155, eyes: 0xfacc15, talon: 0x475569, wing: 0xe2e8f0, tip: 0x94a3b8 }
        }
    };

    const colors = (PALETTES[species] && (PALETTES[species][coat] || PALETTES[species].default)) || PALETTES.dog.default;

    function mat(c, rough = 0.45, metal = 0.05) {
        return new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });
    }

    const matFur = mat(colors.fur, 0.52);
    const matBelly = mat(colors.belly, 0.48);
    const matNose = mat(colors.nose || 0x18181b, 0.25, 0.1);
    const matEye = mat(colors.eyes, 0.15, 0.1);
    const matWhite = mat(0xffffff, 0.2);
    const matCollar = mat(colors.collar || 0xdc2626, 0.4, 0.1);
    const matTag = mat(colors.tag || 0xfacc15, 0.2, 0.7);
    const matClaw = mat(0x18181b, 0.3, 0.2);
    const matHead = mat(colors.head || colors.fur, 0.48);
    const matBeak = mat(colors.beak || 0xfbbf24, 0.3, 0.1);
    const matTalon = mat(colors.talon || 0xf59e0b, 0.35, 0.1);
    const matWing = mat(colors.wing || colors.fur, 0.5);
    const matTip = mat(colors.tip || 0x18181b, 0.55);
    const matTail = mat(colors.tail || colors.head || colors.fur, 0.48);

    const boneMap = {};
    skeleton.bones.forEach(b => { boneMap[b.name] = b; });

    // Helper: connect two bones with a smooth cylinder limb
    function connectLimb(pBone, cBone, rTop, rBot, material) {
        if (!pBone || !cBone) return null;
        const target = cBone.position.clone();
        const len = target.length();
        if (len < 0.05) return null;

        const geom = new THREE.CylinderGeometry(rTop, rBot, len * 1.08, 16);
        const mesh = new THREE.Mesh(geom, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.copy(target.clone().multiplyScalar(0.5));
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), target.clone().normalize());
        pBone.add(mesh);
        return mesh;
    }

    // Helper: add joint sphere at bone origin
    function addJoint(bone, radius, material) {
        if (!bone) return null;
        const geom = new THREE.SphereGeometry(radius, 16, 16);
        const mesh = new THREE.Mesh(geom, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        bone.add(mesh);
        return mesh;
    }

    if (species === 'dino') {
        // Velociraptor Dinosaur Mesh
        // 1. Torso & Belly
        const chestBone = boneMap['Chest'];
        if (chestBone) {
            const ribGeom = new THREE.SphereGeometry(2.3, 24, 24);
            ribGeom.scale(0.85, 1.15, 1.25);
            const ribMesh = new THREE.Mesh(ribGeom, matFur);
            ribMesh.castShadow = true;
            chestBone.add(ribMesh);
        }

        const pelvisBone = boneMap['Pelvis'];
        if (pelvisBone) {
            const pelGeom = new THREE.SphereGeometry(2.1, 24, 24);
            pelGeom.scale(0.9, 1.05, 1.15);
            const pelMesh = new THREE.Mesh(pelGeom, matFur);
            pelMesh.castShadow = true;
            pelvisBone.add(pelMesh);
        }

        // 2. Spine & Neck bridging
        connectLimb(boneMap['Pelvis'], boneMap['Spine1'], 1.9, 1.8, matFur);
        connectLimb(boneMap['Spine1'], boneMap['Spine2'], 1.8, 1.9, matFur);
        connectLimb(boneMap['Spine2'], boneMap['Chest'], 1.9, 2.0, matFur);
        connectLimb(boneMap['Chest'], boneMap['Neck'], 1.6, 1.25, matBelly);
        addJoint(boneMap['Neck'], 1.25, matFur);
        connectLimb(boneMap['Neck'], boneMap['Skull'], 1.25, 1.05, matFur);

        // 3. Raptor Skull & Predatory Snout
        const skullBone = boneMap['Skull'];
        if (skullBone) {
            const headG = new THREE.Group();
            const skullM = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 2.2), matFur);
            skullM.position.set(0, 0.2, 0.4);
            headG.add(skullM);

            const snoutM = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 16), matFur);
            snoutM.rotation.x = -Math.PI / 2;
            snoutM.position.set(0, 0, 1.8);
            headG.add(snoutM);

            // Teeth Ridge
            const toothG = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.18, 1.8), matWhite);
            toothG.position.set(0, -0.5, 1.6);
            headG.add(toothG);

            // Eyes
            [-0.78, 0.78].forEach(xSide => {
                const eyeM = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), matEye);
                eyeM.position.set(xSide, 0.35, 0.9);
                headG.add(eyeM);
            });
            skullBone.add(headG);
        }

        // 4. Stiffened Counterbalance Tail
        const tailKeys = ['Tail1', 'Tail2', 'Tail3', 'Tail4', 'Tail5', 'Tail6'];
        for (let i = 0; i < tailKeys.length - 1; i++) {
            const r1 = Math.max(0.4, 1.5 - i * 0.22);
            const r2 = Math.max(0.3, 1.5 - (i + 1) * 0.22);
            connectLimb(boneMap[tailKeys[i]], boneMap[tailKeys[i + 1]], r1, r2, matFur);
            addJoint(boneMap[tailKeys[i]], r1, matFur);
        }

        // 5. Short Arms with Claws
        ['L', 'R'].forEach(side => {
            connectLimb(boneMap[`${side}_Scapula`], boneMap[`${side}_Radius`], 0.55, 0.45, matFur);
            const paw = boneMap[`${side}_FrontPaw`];
            if (paw) {
                const clawM = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 8), matClaw);
                clawM.rotation.x = Math.PI / 3;
                paw.add(clawM);
            }
        });

        // 6. Powerful Digitigrade Legs with Sickle Claw
        ['L', 'R'].forEach((side, idx) => {
            const sign = idx === 0 ? 1 : -1;
            addJoint(boneMap[`${side}_Femur`], 1.5, matFur);
            connectLimb(boneMap[`${side}_Femur`], boneMap[`${side}_Tibia`], 1.4, 0.95, matFur);
            addJoint(boneMap[`${side}_Tibia`], 0.9, matFur);
            connectLimb(boneMap[`${side}_Tibia`], boneMap[`${side}_Hock`], 0.95, 0.7, matFur);
            connectLimb(boneMap[`${side}_Hock`], boneMap[`${side}_Metatarsus`], 0.7, 0.55, matFur);

            const foot = boneMap[`${side}_HindPaw`];
            if (foot) {
                const footM = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 1.4), matFur);
                footM.position.set(0, 0, 0.4);
                foot.add(footM);
        // Legendary Raptor Curved Sickle Claw on Inner Toe
                const sickleG = new THREE.TorusGeometry(0.65, 0.16, 8, 16, Math.PI * 0.65);
                const sickleM = new THREE.Mesh(sickleG, matClaw);
                sickleM.rotation.y = sign * 0.35;
                sickleM.rotation.z = Math.PI * 0.45;
                sickleM.position.set(sign * 0.4, 0.5, 0.4);
                foot.add(sickleM);
            }
        });

    } else if (species === 'bird') {
        // ====================================================
        // PIXAR/GAME-GRADE STYLIZED RAPTOR (EAGLE / FALCON)
        // ====================================================
        
        // Helper: creates a sleek aerodynamic stylized feather blade
        function createFeatherBlade(len, width, thickness = 0.08) {
            const geom = new THREE.CylinderGeometry(0.04, width, len, 16);
            geom.scale(1.0, thickness / width, 1.0);
            return geom;
        }

        // 1. Aerodynamic Streamlined Fuselage & Breast Plumage
        const chestBone = boneMap['Chest'];
        if (chestBone) {
            // Main body: sleek aerodynamic egg/teardrop fuselage
            const bodyGeom = new THREE.SphereGeometry(2.0, 32, 32);
            bodyGeom.scale(0.85, 1.15, 1.45);
            const bodyMesh = new THREE.Mesh(bodyGeom, matFur);
            bodyMesh.castShadow = true;
            chestBone.add(bodyMesh);

            // Fluffy layered breast bib
            const bibGeom = new THREE.SphereGeometry(1.65, 24, 24);
            bibGeom.scale(0.78, 1.05, 1.18);
            const bibMesh = new THREE.Mesh(bibGeom, matBelly);
            bibMesh.position.set(0, -0.32, 0.6);
            chestBone.add(bibMesh);

            // Feathered flank cushions (left & right plumage fullness)
            [-0.9, 0.9].forEach(x => {
                const flankGeom = new THREE.SphereGeometry(1.1, 16, 16);
                flankGeom.scale(0.65, 0.85, 1.3);
                const flankMesh = new THREE.Mesh(flankGeom, matFur);
                flankMesh.position.set(x, -0.2, -0.2);
                chestBone.add(flankMesh);
            });
        }

        const pelvisBone = boneMap['Pelvis'];
        if (pelvisBone) {
            const pelGeom = new THREE.SphereGeometry(1.65, 24, 24);
            pelGeom.scale(0.80, 0.95, 1.15);
            const pelMesh = new THREE.Mesh(pelGeom, matFur);
            pelvisBone.add(pelMesh);
        }

        // Smooth spine bridging
        connectLimb(boneMap['Pelvis'], boneMap['Spine1'], 1.6, 1.7, matFur);
        connectLimb(boneMap['Spine1'], boneMap['Chest'], 1.7, 1.9, matFur);

        // 2. Continuous Feathered S-Curve Neck
        connectLimb(boneMap['Chest'], boneMap['Neck1'], 1.35, 1.10, matFur);
        addJoint(boneMap['Neck1'], 1.12, matHead);
        connectLimb(boneMap['Neck1'], boneMap['Neck2'], 1.10, 0.92, matHead);
        addJoint(boneMap['Neck2'], 0.94, matHead);
        connectLimb(boneMap['Neck2'], boneMap['Head'], 0.92, 0.85, matHead);

        // Neck feather ruff / cape
        const neckRuff = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.22, 16, 24), matHead);
        neckRuff.rotation.x = Math.PI * 0.45;
        neckRuff.position.set(0, 0.1, 0.1);
        if (boneMap['Neck1']) boneMap['Neck1'].add(neckRuff);

        // 3. Charismatic Raptor Cranium, Hooked Beak & Pixar Eyes
        const headBone = boneMap['Head'];
        if (headBone) {
            const headG = new THREE.Group();
            
            // Sleek aerodynamic raptor cranium
            const craniumGeom = new THREE.SphereGeometry(1.15, 32, 32);
            craniumGeom.scale(0.88, 1.0, 1.2);
            const craniumMesh = new THREE.Mesh(craniumGeom, matHead);
            headG.add(craniumMesh);

            // Fleshy Cere (Nose base with nostrils)
            const cereM = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 16), matBeak);
            cereM.scale.set(0.82, 0.72, 0.85);
            cereM.position.set(0, -0.05, 0.88);
            headG.add(cereM);

            // Nostril cavities (Nares)
            [-0.18, 0.18].forEach(x => {
                const nare = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), matClaw);
                nare.scale.set(0.6, 1.4, 1.8);
                nare.position.set(x, 0.05, 1.0);
                headG.add(nare);
            });

            // Sculpted Hooked Raptor Beak
            const beakG = new THREE.Group();
            // Upper culmen horn
            const upperBeak = new THREE.Mesh(new THREE.ConeGeometry(0.50, 1.4, 20), matBeak);
            upperBeak.rotation.x = -Math.PI / 2 + 0.18;
            upperBeak.position.set(0, -0.05, 1.15);
            beakG.add(upperBeak);

            // Hooked curved raptor tip
            const hookM = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.85, 16), matBeak);
            hookM.rotation.x = -Math.PI / 2 + 0.72;
            hookM.position.set(0, -0.38, 1.62);
            beakG.add(hookM);

            // Sleek nested lower mandible
            const lowerBeak = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.15, 16), matBeak);
            lowerBeak.rotation.x = -Math.PI / 2 + 0.08;
            lowerBeak.position.set(0, -0.35, 1.05);
            beakG.add(lowerBeak);
            headG.add(beakG);

            // Pixar-Style Expressive Eyes with Highlights & Mask
            [-0.72, 0.72].forEach((xSide, i) => {
                const eyeG = new THREE.Group();
                eyeG.position.set(xSide, 0.28, 0.65);
                eyeG.rotation.y = (i === 0 ? 0.28 : -0.28);

                // Falcon/Eagle dark eyeliner mask patch
                const maskM = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), matClaw);
                maskM.scale.set(0.4, 0.8, 1.1);
                maskM.position.set(0, 0, -0.05);
                eyeG.add(maskM);

                // Glossy Sclera
                const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 20), matWhite);
                eyeG.add(sclera);

                // Glowing Amber Iris
                const iris = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 16), matEye);
                iris.position.set(0, 0, 0.19);
                sclera.add(iris);

                // Deep Black Pupil
                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), matClaw);
                pupil.position.set(0, 0, 0.14);
                iris.add(pupil);

                // Specular Highlights (Disney/Pixar sparkle)
                const hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), matWhite);
                hl1.position.set(0.06, 0.06, 0.12);
                iris.add(hl1);

                const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), matWhite);
                hl2.position.set(-0.05, -0.05, 0.12);
                iris.add(hl2);

                // Heroic Brow Ridge
                const brow = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.55), matHead);
                brow.position.set(0, 0.26, 0.05);
                brow.rotation.z = (i === 0 ? -0.22 : 0.22);
                brow.rotation.x = -0.15;
                eyeG.add(brow);

                headG.add(eyeG);
            });

            // Aerodynamic Layered Crown Crest
            const crestG = new THREE.Group();
            for (let c = 0; c < 4; c++) {
                const plumeGeom = new THREE.ConeGeometry(0.24 - c * 0.04, 1.2 - c * 0.16, 12);
                plumeGeom.scale(0.85, 0.35, 1.2);
                const plume = new THREE.Mesh(plumeGeom, matHead);
                plume.position.set(0, 0.88 + c * 0.08, -0.35 - c * 0.35);
                plume.rotation.x = -0.55 - c * 0.16;
                crestG.add(plume);
            }
            headG.add(crestG);

            headBone.add(headG);
        }

        // 4. Sleek Aerodynamic Sculpted Wings (Layered plumage & airfoil)
        ['L', 'R'].forEach((side, idx) => {
            const sign = idx === 0 ? 1 : -1;
            
            // Slender wing arm joints
            addJoint(boneMap[`${side}_Scapula`], 0.55, matFur);
            connectLimb(boneMap[`${side}_Scapula`], boneMap[`${side}_Humerus`], 0.55, 0.48, matFur);
            addJoint(boneMap[`${side}_Humerus`], 0.48, matFur);
            connectLimb(boneMap[`${side}_Humerus`], boneMap[`${side}_Radius`], 0.48, 0.40, matWing);
            addJoint(boneMap[`${side}_Radius`], 0.40, matWing);
            connectLimb(boneMap[`${side}_Radius`], boneMap[`${side}_Carpus`], 0.40, 0.32, matWing);
            addJoint(boneMap[`${side}_Carpus`], 0.32, matWing);
            connectLimb(boneMap[`${side}_Carpus`], boneMap[`${side}_WingTip`], 0.32, 0.22, matTip);

            // Upper Wing Covert Airfoil (smooth aerodynamic mantle)
            const humBone = boneMap[`${side}_Humerus`];
            if (humBone) {
                const covertGeom = new THREE.SphereGeometry(1.3, 16, 16);
                covertGeom.scale(1.4, 0.22, 1.8);
                const covertMesh = new THREE.Mesh(covertGeom, matFur);
                covertMesh.position.set(sign * 1.0, 0.05, -0.4);
                covertMesh.rotation.y = sign * 0.12;
                humBone.add(covertMesh);
            }

            // Secondary Flight Feathers on Radius (Smooth tapered feather blades)
            const radBone = boneMap[`${side}_Radius`];
            if (radBone) {
                const secGroup = new THREE.Group();
                for (let f = 0; f < 6; f++) {
                    const fLen = 2.4 + f * 0.25;
                    const fWidth = 0.52 - f * 0.02;
                    const featherM = new THREE.Mesh(createFeatherBlade(fLen, fWidth), matWing);
                    featherM.rotation.x = Math.PI / 2 - 0.15;
                    featherM.rotation.z = sign * (0.05 - f * 0.04);
                    featherM.position.set(sign * (f * 0.48 - 1.1), -0.05, -fLen * 0.45);
                    secGroup.add(featherM);
                }
                radBone.add(secGroup);
            }

            // Primary Flight Feathers on Carpus & WingTip (Splayed raptor wingtips)
            const carpBone = boneMap[`${side}_Carpus`];
            if (carpBone) {
                const primGroup = new THREE.Group();
                for (let f = 0; f < 6; f++) {
                    const fLen = 3.2 + f * 0.35;
                    const fWidth = 0.48 - f * 0.03;
                    const featherM = new THREE.Mesh(createFeatherBlade(fLen, fWidth), matTip);
                    featherM.rotation.x = Math.PI / 2 - 0.18;
                    featherM.rotation.z = sign * (0.15 + f * 0.12);
                    featherM.rotation.y = sign * (f * 0.05);
                    featherM.position.set(sign * (f * 0.52 - 0.2), -0.05, -fLen * 0.42);
                    primGroup.add(featherM);
                }
                carpBone.add(primGroup);
            }
        });

        // 5. Layered Fan Tail (Rectrices Rudder)
        const tailBone = boneMap['Tail1'];
        if (tailBone) {
            const tailG = new THREE.Group();
            for (let t = -3; t <= 3; t++) {
                const tLen = 3.8 - Math.abs(t) * 0.35;
                const tFeather = new THREE.Mesh(createFeatherBlade(tLen, 0.48), matFur);
                tFeather.rotation.x = Math.PI / 2 - 0.12;
                tFeather.rotation.z = t * 0.14;
                tFeather.position.set(t * 0.35, -0.05, -tLen * 0.48);
                tailG.add(tFeather);
            }
            tailBone.add(tailG);
        }

        // 6. Feathered Thigh Pantaloons, Scaled Shanks & Curved Talons
        ['L', 'R'].forEach((side, idx) => {
            const sign = idx === 0 ? 1 : -1;
            
            // Feathered Thigh Pantaloon (fluffy leg coverts)
            const femBone = boneMap[`${side}_Femur`];
            if (femBone) {
                const pantGeom = new THREE.ConeGeometry(0.72, 1.8, 16);
                const pantMesh = new THREE.Mesh(pantGeom, matFur);
                pantMesh.position.set(0, -0.8, 0.2);
                pantMesh.rotation.x = 0.3;
                femBone.add(pantMesh);
            }

            addJoint(boneMap[`${side}_Femur`], 0.65, matFur);
            connectLimb(boneMap[`${side}_Femur`], boneMap[`${side}_Tibia`], 0.65, 0.45, matFur);
            addJoint(boneMap[`${side}_Tibia`], 0.45, matTalon);
            connectLimb(boneMap[`${side}_Tibia`], boneMap[`${side}_Hock`], 0.42, 0.32, matTalon);

            const foot = boneMap[`${side}_HindPaw`];
            if (foot) {
                const footG = new THREE.Group();
                const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), matTalon);
                footG.add(knuckle);

                // 3 Front Curved Talons
                [-0.28, 0.0, 0.28].forEach((xOff, toeIdx) => {
                    const toe = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.08, 0.95, 10), matTalon);
                    toe.rotation.x = Math.PI / 2 - 0.25;
                    toe.rotation.y = (toeIdx - 1) * 0.25;
                    toe.position.set(xOff, -0.12, 0.48);
                    footG.add(toe);

                    // Sharp curved black talon
                    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.52, 10), matClaw);
                    claw.rotation.x = Math.PI / 2 + 0.65;
                    claw.position.set(xOff, -0.28, 0.95);
                    footG.add(claw);
                });

                // 1 Rear Hallux Toe with Talon
                const rearToe = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.08, 0.75, 10), matTalon);
                rearToe.rotation.x = -Math.PI / 2 + 0.28;
                rearToe.position.set(0, -0.08, -0.38);
                footG.add(rearToe);

                const rearClaw = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 10), matClaw);
                rearClaw.rotation.x = -Math.PI / 2 - 0.55;
                rearClaw.position.set(0, -0.22, -0.75);
                footG.add(rearClaw);

                foot.add(footG);
            }
        });

    } else {
        // Quadruped Dog / Cat Mesh
        const isCat = (species === 'cat');

        // 1. Ribcage & Pelvis
        const chestBone = boneMap['Chest'];
        if (chestBone) {
            const chestGeom = new THREE.SphereGeometry(isCat ? 2.0 : 2.3, 24, 24);
            chestGeom.scale(0.9, 1.05, 1.25);
            const chestM = new THREE.Mesh(chestGeom, matFur);
            chestM.castShadow = true;
            chestBone.add(chestM);

            // Fluffy Chest / Bib
            const bibGeom = new THREE.SphereGeometry(isCat ? 1.6 : 1.9, 16, 16);
            bibGeom.scale(0.8, 0.95, 1.05);
            const bibM = new THREE.Mesh(bibGeom, matBelly);
            bibM.position.set(0, -0.4, 0.6);
            chestBone.add(bibM);

            // Cute Collar with Gold Tag
            const collarM = new THREE.Mesh(new THREE.TorusGeometry(isCat ? 1.4 : 1.7, 0.18, 12, 24), matCollar);
            collarM.rotation.x = Math.PI * 0.45;
            collarM.position.set(0, 0.7, 1.2);
            chestBone.add(collarM);

            const tagM = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16), matTag);
            tagM.position.set(0, 0.2, 2.3);
            tagM.rotation.x = Math.PI / 2;
            chestBone.add(tagM);
        }

        const pelvisBone = boneMap['Pelvis'];
        if (pelvisBone) {
            const pelGeom = new THREE.SphereGeometry(isCat ? 1.8 : 2.0, 24, 24);
            pelGeom.scale(0.9, 0.95, 1.15);
            const pelM = new THREE.Mesh(pelGeom, matFur);
            pelM.castShadow = true;
            pelvisBone.add(pelM);
        }

        // 2. Spine & Neck bridging
        connectLimb(boneMap['Pelvis'], boneMap['Spine1'], 1.8, 1.7, matFur);
        connectLimb(boneMap['Spine1'], boneMap['Spine2'], 1.7, 1.8, matFur);
        connectLimb(boneMap['Spine2'], boneMap['Chest'], 1.8, 2.0, matFur);
        connectLimb(boneMap['Chest'], boneMap['Neck'], 1.5, 1.25, matFur);
        addJoint(boneMap['Neck'], 1.22, matFur);
        connectLimb(boneMap['Neck'], boneMap['Head'], 1.22, isCat ? 1.05 : 1.15, matFur);

        // 3. Head, Snout, Expressive Ears, and Eyes
        const headBone = boneMap['Head'];
        if (headBone) {
            const headG = new THREE.Group();
            const skullGeom = new THREE.SphereGeometry(isCat ? 1.4 : 1.6, 24, 24);
            skullGeom.scale(1.0, 0.95, 1.05);
            const skullM = new THREE.Mesh(skullGeom, matFur);
            headG.add(skullM);

            // Muzzle / Snout
            const muzzleGeom = new THREE.CylinderGeometry(isCat ? 0.6 : 0.75, isCat ? 0.75 : 0.9, isCat ? 1.0 : 1.3, 16);
            muzzleGeom.scale(1.0, 0.85, 1.0);
            const muzzleM = new THREE.Mesh(muzzleGeom, matBelly);
            muzzleM.rotation.x = -Math.PI / 2;
            muzzleM.position.set(0, -0.25, isCat ? 1.1 : 1.4);
            headG.add(muzzleM);

            // Cute Wet Nose
            const noseM = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), matNose);
            noseM.scale.set(1.1, 0.8, 1.0);
            noseM.position.set(0, -0.05, isCat ? 1.65 : 2.1);
            headG.add(noseM);

            // 3D Cartoon Eyes
            [-0.65, 0.65].forEach(xSide => {
                // Sclera White
                const scleraM = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), matWhite);
                scleraM.position.set(xSide, 0.35, isCat ? 0.85 : 0.95);

                // Iris / Pupil
                const irisM = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), matEye);
                irisM.position.set(0, 0, 0.22);
                scleraM.add(irisM);

                // Cornea Highlight
                const hlM = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), matWhite);
                hlM.position.set(0.08, 0.08, 0.16);
                irisM.add(hlM);

                headG.add(scleraM);
            });

            // Ears
            const earGeom = isCat
                ? new THREE.ConeGeometry(0.55, 0.95, 12)
                : new THREE.ConeGeometry(0.65, 1.3, 12);
            [-0.95, 0.95].forEach((xSide, i) => {
                const earM = new THREE.Mesh(earGeom, matFur);
                earM.position.set(xSide, 1.4, -0.2);
                earM.rotation.z = (i === 0 ? 0.35 : -0.35);
                earM.rotation.x = -0.15;
                headG.add(earM);
            });

            headBone.add(headG);
        }

        // 4. Articulated Tail
        const tailNames = isCat
            ? ['Tail1', 'Tail2', 'Tail3', 'Tail4', 'Tail5']
            : ['Tail1', 'Tail2', 'Tail3', 'Tail4'];
        for (let i = 0; i < tailNames.length - 1; i++) {
            const r1 = Math.max(0.3, isCat ? 0.45 : 0.65 - i * 0.1);
            const r2 = Math.max(0.25, isCat ? 0.4 : 0.6 - i * 0.1);
            connectLimb(boneMap[tailNames[i]], boneMap[tailNames[i + 1]], r1, r2, matFur);
            addJoint(boneMap[tailNames[i]], r1, matFur);
        }

        // 5. Forelimbs (Scapula -> Humerus -> Radius -> Carpus -> Paw)
        ['L', 'R'].forEach(side => {
            addJoint(boneMap[`${side}_Scapula`], 0.85, matFur);
            connectLimb(boneMap[`${side}_Scapula`], boneMap[`${side}_Humerus`], 0.85, 0.7, matFur);
            addJoint(boneMap[`${side}_Humerus`], 0.7, matFur);
            connectLimb(boneMap[`${side}_Humerus`], boneMap[`${side}_Radius`], 0.7, 0.55, matBelly);
            connectLimb(boneMap[`${side}_Radius`], boneMap[`${side}_Carpus`], 0.55, 0.45, matBelly);

            // Paw
            const paw = boneMap[`${side}_FrontPaw`];
            if (paw) {
                const pawM = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 12), matBelly);
                pawM.scale.set(0.9, 0.6, 1.25);
                pawM.position.set(0, 0, 0.2);
                paw.add(pawM);
            }
        });

        // 6. Hindlimbs with Digitigrade Hocks
        ['L', 'R'].forEach(side => {
            addJoint(boneMap[`${side}_Femur`], 1.2, matFur);
            connectLimb(boneMap[`${side}_Femur`], boneMap[`${side}_Tibia`], 1.2, 0.8, matFur);
            addJoint(boneMap[`${side}_Tibia`], 0.8, matFur);
            connectLimb(boneMap[`${side}_Tibia`], boneMap[`${side}_Hock`], 0.8, 0.6, matFur);
            connectLimb(boneMap[`${side}_Hock`], boneMap[`${side}_Metatarsus`], 0.6, 0.5, matBelly);

            const paw = boneMap[`${side}_HindPaw`];
            if (paw) {
                const pawM = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), matBelly);
                pawM.scale.set(0.95, 0.6, 1.3);
                pawM.position.set(0, 0, 0.2);
                paw.add(pawM);
            }
        });
    }

    return meshRoot;
}

/**
 * Procedural 60 FPS quadruped & dinosaur locomotion engine.
 */
function updateAnimalLocomotion(delta) {
    if (!currentAnimalSkeleton || !animalStudioGroup) return;

    const b = animalBoneMap;
    if (!b['Pelvis']) return;

    const tailWagToggle = document.getElementById('animal-tailwag-toggle');
    const inplaceToggle = document.getElementById('animal-inplace-toggle');
    const isInPlace = inplaceToggle ? inplaceToggle.checked : true;

    // Frequency & stride pacing
    let baseFreq = 5.5;
    if (currentAnimalGait === 'sprint') baseFreq = 9.0;
    else if (currentAnimalGait === 'trot') baseFreq = 6.2;
    else if (currentAnimalGait === 'walk') baseFreq = 3.8;
    else if (currentAnimalGait === 'stalk') baseFreq = 2.4;
    else if (currentAnimalGait === 'sit') baseFreq = 1.0;

    const speed = baseFreq * animalSpeedMultiplier;
    animalWalkCycle += delta * speed;
    animalTailWagCycle += delta * (speed * 1.3);
    animalBreathingCycle += delta * 2.2;

    // Forward surface translation when in-place treadmill is false (Real walking across ground surface)
    if (!isInPlace && currentAnimalGait !== 'sit') {
        const strideSpeed = (
            currentAnimalGait === 'sprint' ? 24.0 :
            currentAnimalGait === 'trot' ? 14.0 :
            currentAnimalGait === 'stalk' ? 5.5 :
            currentAnimalGait === 'walk' ? 8.5 : 0
        ) * animalSpeedMultiplier;

        animalStudioGroup.position.z += strideSpeed * delta;
        // Seamless loop across the 3D ground runway (-38 to +38 units)
        if (animalStudioGroup.position.z > 38) {
            animalStudioGroup.position.z = -38;
        }
    } else if (isInPlace) {
        animalStudioGroup.position.z = 0;
    }

    const cycle = animalWalkCycle;
    const isCat = (currentAnimalSpecies === 'cat');
    const isDino = (currentAnimalSpecies === 'dino');
    const isBird = (currentAnimalSpecies === 'bird');

    if (currentAnimalGait === 'sit') {
        // ==========================================
        // SIT & WAG IDLE POSE (QUADRUPED / DINO / BIRD PERCH)
        // ==========================================
        if (isBird) {
            b['Pelvis'].position.y = 8.8;
            b['Pelvis'].rotation.x = 0.25;

            // Legs bend supporting weight on perch
            if (b['L_Femur']) b['L_Femur'].rotation.x = -0.45;
            if (b['R_Femur']) b['R_Femur'].rotation.x = -0.45;
            if (b['L_Tibia']) b['L_Tibia'].rotation.x = 0.85;
            if (b['R_Tibia']) b['R_Tibia'].rotation.x = 0.85;
            if (b['L_Hock']) b['L_Hock'].rotation.x = -0.4;
            if (b['R_Hock']) b['R_Hock'].rotation.x = -0.4;

            // Wings folded neatly along flanks
            ['L', 'R'].forEach((side, idx) => {
                const sign = idx === 0 ? 1 : -1;
                if (b[`${side}_Humerus`]) b[`${side}_Humerus`].rotation.set(0.6, sign * 0.35, sign * -0.9);
                if (b[`${side}_Radius`]) b[`${side}_Radius`].rotation.set(-1.3, sign * -0.2, sign * 0.75);
                if (b[`${side}_Carpus`]) b[`${side}_Carpus`].rotation.set(1.0, 0, sign * -0.35);
            });

            if (b['Tail1']) b['Tail1'].rotation.x = -0.25 + Math.sin(animalBreathingCycle) * 0.05;

            if (b['Head']) {
                const twitch = Math.sin(animalBreathingCycle * 0.8);
                b['Head'].rotation.y = twitch * 0.3;
                b['Head'].rotation.z = Math.cos(animalBreathingCycle * 0.6) * 0.1;
                b['Head'].rotation.x = Math.sin(animalBreathingCycle * 1.5) * 0.06;
            }
            return;
        }

        const targetHipY = isDino ? 6.5 : 4.4;
        b['Pelvis'].position.y += (targetHipY - b['Pelvis'].position.y) * 0.1;
        b['Pelvis'].rotation.x = isDino ? -0.3 : 0.45;

        // Front legs brace vertical
        if (b['L_Scapula']) b['L_Scapula'].rotation.x = -0.45;
        if (b['R_Scapula']) b['R_Scapula'].rotation.x = -0.45;
        if (b['L_Humerus']) b['L_Humerus'].rotation.x = 0.1;
        if (b['R_Humerus']) b['R_Humerus'].rotation.x = 0.1;

        // Hind legs fold tightly underneath
        if (b['L_Femur']) b['L_Femur'].rotation.x = -1.35;
        if (b['R_Femur']) b['R_Femur'].rotation.x = -1.35;
        if (b['L_Tibia']) b['L_Tibia'].rotation.x = 1.6;
        if (b['R_Tibia']) b['R_Tibia'].rotation.x = 1.6;
        if (b['L_Hock']) b['L_Hock'].rotation.x = -0.8;
        if (b['R_Hock']) b['R_Hock'].rotation.x = -0.8;

        // Dynamic tail wagging
        if (tailWagToggle && tailWagToggle.checked) {
            const wag = Math.sin(animalTailWagCycle * 3.5) * (isDino ? 0.3 : 0.6);
            ['Tail1', 'Tail2', 'Tail3', 'Tail4', 'Tail5', 'Tail6'].forEach((tName, i) => {
                if (b[tName]) {
                    b[tName].rotation.y = wag * (0.4 + i * 0.2);
                    b[tName].rotation.x = 0.15;
                }
            });
        }

        // Curious head look-at with subtle breath
        if (b['Head'] || b['Skull']) {
            const targetBone = b['Head'] || b['Skull'];
            targetBone.rotation.y = Math.sin(animalBreathingCycle * 0.6) * 0.25;
            targetBone.rotation.z = Math.cos(animalBreathingCycle * 0.5) * 0.08;
            targetBone.rotation.x = Math.sin(animalBreathingCycle * 1.2) * 0.06;
        }
        return;
    }

    // Reset base hip height
    const baseHipY = isDino ? 10.5 : (isBird ? 11.2 : (isCat ? 9.5 : 10.2));

    if (isDino) {
        // ==========================================
        // THEROPOD DINOSAUR (RAPTOR) BIPEDAL STRIDE
        // ==========================================
        const swingAmp = (currentAnimalGait === 'sprint' ? 0.75 : currentAnimalGait === 'walk' ? 0.45 : 0.6);
        const lSwing = Math.sin(cycle) * swingAmp;
        const rSwing = Math.sin(cycle + Math.PI) * swingAmp;

        // Hip vertical dip & bob
        b['Pelvis'].position.y = baseHipY + Math.abs(Math.cos(cycle * 2)) * (currentAnimalGait === 'sprint' ? 0.9 : 0.4);
        b['Pelvis'].rotation.z = Math.sin(cycle) * 0.06;
        b['Pelvis'].rotation.x = (currentAnimalGait === 'sprint' ? 0.35 : 0.15);

        // Legs
        if (b['L_Femur']) b['L_Femur'].rotation.x = lSwing;
        if (b['R_Femur']) b['R_Femur'].rotation.x = rSwing;
        if (b['L_Tibia']) b['L_Tibia'].rotation.x = Math.max(0, -lSwing * 1.2);
        if (b['R_Tibia']) b['R_Tibia'].rotation.x = Math.max(0, -rSwing * 1.2);
        if (b['L_Hock']) b['L_Hock'].rotation.x = lSwing * 0.6;
        if (b['R_Hock']) b['R_Hock'].rotation.x = rSwing * 0.6;

        // Arms tucked forward predatory
        if (b['L_Scapula']) b['L_Scapula'].rotation.x = 0.3 + Math.sin(cycle) * 0.15;
        if (b['R_Scapula']) b['R_Scapula'].rotation.x = 0.3 + Math.sin(cycle + Math.PI) * 0.15;

        // Counterbalance tail swing (sways opposite to leg kick to balance body)
        if (tailWagToggle && tailWagToggle.checked) {
            const tailSwing = -Math.sin(cycle) * 0.4;
            ['Tail1', 'Tail2', 'Tail3', 'Tail4', 'Tail5', 'Tail6'].forEach((tName, i) => {
                if (b[tName]) {
                    b[tName].rotation.y = tailSwing * (0.3 + i * 0.15);
                    b[tName].rotation.x = Math.sin(cycle * 2) * 0.08;
                }
            });
        }

        if (b['Neck']) b['Neck'].rotation.x = -0.15 + Math.sin(cycle * 2) * 0.08;
        if (b['Skull']) b['Skull'].rotation.x = -b['Pelvis'].rotation.x * 0.8;

    } else if (isBird) {
        // ==========================================
        // AVIAN FLIGHT, GLIDE & HOPPING LOCOMOTION
        // ==========================================
        const isHop = (currentAnimalGait === 'trot');
        const isDive = (currentAnimalGait === 'sprint');
        const isSoar = (currentAnimalGait === 'walk' || currentAnimalGait === 'stalk');

        if (isHop) {
            // Ground Bipedal Hop & Inquisitive Peck
            const hopCycle = cycle * 1.6;
            const hopAir = Math.max(0, Math.sin(hopCycle));
            b['Pelvis'].position.y = 8.8 + hopAir * 2.0;
            b['Pelvis'].rotation.x = 0.2 + hopAir * 0.2;

            ['L', 'R'].forEach(side => {
                if (b[`${side}_Femur`]) b[`${side}_Femur`].rotation.x = -0.4 + hopAir * 0.4;
                if (b[`${side}_Tibia`]) b[`${side}_Tibia`].rotation.x = 0.8 - hopAir * 0.6;
                if (b[`${side}_Hock`]) b[`${side}_Hock`].rotation.x = -0.4 + hopAir * 0.5;
            });

            ['L', 'R'].forEach((side, idx) => {
                const sign = idx === 0 ? 1 : -1;
                const flapZ = sign * (0.3 + hopAir * 0.6);
                if (b[`${side}_Humerus`]) b[`${side}_Humerus`].rotation.z = flapZ;
                if (b[`${side}_Radius`]) b[`${side}_Radius`].rotation.z = flapZ * 0.5;
            });

            if (b['Head']) b['Head'].rotation.x = (hopAir < 0.2 ? -0.35 : 0.1);
            if (b['Neck1']) b['Neck1'].rotation.x = (hopAir < 0.2 ? 0.25 : -0.1);

        } else {
            // Majestic Aerial Flight: Soaring or Powered Flap
            const flapSpeed = isDive ? 8.0 : (isSoar ? 2.5 : 4.5);
            const flapAmp = isDive ? 0.85 : (isSoar ? 0.35 : 0.75);
            const flap = Math.sin(cycle * (flapSpeed / baseFreq)) * flapAmp;
            const upstroke = Math.max(0, -flap);

            // Torso aerodynamic bobbing & pitch
            b['Pelvis'].position.y = 11.5 + Math.sin(cycle * (flapSpeed / baseFreq)) * 0.6;
            b['Pelvis'].rotation.x = 0.35 + (isDive ? 0.4 : 0) + Math.cos(cycle * (flapSpeed / baseFreq)) * 0.08;
            b['Pelvis'].rotation.z = Math.sin(cycle * 0.5) * 0.08; // banking

            // Aerodynamic multi-stage wing stroke
            ['L', 'R'].forEach((side, idx) => {
                const sign = idx === 0 ? 1 : -1;
                
                // Humerus: main up/down stroke + feather twist
                if (b[`${side}_Humerus`]) {
                    b[`${side}_Humerus`].rotation.z = sign * (flap * 0.85 - 0.2);
                    b[`${side}_Humerus`].rotation.y = sign * (0.2 + upstroke * 0.3);
                    b[`${side}_Humerus`].rotation.x = Math.cos(cycle * (flapSpeed / baseFreq)) * 0.15;
                }
                // Forearm (Radius): folds inward on upstroke, extends on downstroke
                if (b[`${side}_Radius`]) {
                    b[`${side}_Radius`].rotation.z = sign * (flap * 0.6 + upstroke * 0.4);
                    b[`${side}_Radius`].rotation.y = sign * (upstroke * 0.3);
                }
                // Hand (Carpus / Primaries): whips at tip of stroke
                if (b[`${side}_Carpus`]) {
                    b[`${side}_Carpus`].rotation.z = sign * (flap * 0.45 - upstroke * 0.3);
                }
            });

            // Legs tucked back streamlined under tail
            ['L', 'R'].forEach(side => {
                if (b[`${side}_Femur`]) b[`${side}_Femur`].rotation.x = 0.8;
                if (b[`${side}_Tibia`]) b[`${side}_Tibia`].rotation.x = -1.1;
                if (b[`${side}_Hock`]) b[`${side}_Hock`].rotation.x = 0.5;
            });

            // Tail Fan: aerodynamic rudder steering
            if (b['Tail1']) {
                b['Tail1'].rotation.x = -0.15 - Math.sin(cycle * (flapSpeed / baseFreq)) * 0.1;
                b['Tail1'].rotation.y = Math.sin(cycle * 0.5) * 0.15;
            }

            // Head: steady forward predator gaze lock
            if (b['Neck1']) b['Neck1'].rotation.x = -b['Pelvis'].rotation.x * 0.5;
            if (b['Head']) b['Head'].rotation.x = -b['Pelvis'].rotation.x * 0.5;
        }

    } else {
        // ==========================================
        // QUADRUPED CANINE & FELINE LOCOMOTION
        // ==========================================
        let lfPhase = 0, rfPhase = 0, lhPhase = 0, rhPhase = 0;
        let spineFlex = 0;

        if (currentAnimalGait === 'sprint') {
            // High-Speed Rotary Gallop: Rear legs push together, spine compresses dynamically!
            lfPhase = cycle;
            rfPhase = cycle + 0.35;
            lhPhase = cycle + Math.PI * 0.85;
            rhPhase = cycle + Math.PI * 0.85 + 0.35;

            spineFlex = Math.sin(cycle) * (isCat ? 0.38 : 0.28);
            b['Pelvis'].position.y = baseHipY + Math.sin(cycle) * 1.2;
            b['Pelvis'].rotation.x = spineFlex * 0.8;

        } else if (currentAnimalGait === 'trot') {
            // 2-Beat Diagonal Trot: (LF + RH) sync, (RF + LH) sync 180° apart
            lfPhase = cycle;
            rhPhase = cycle;
            rfPhase = cycle + Math.PI;
            lhPhase = cycle + Math.PI;

            b['Pelvis'].position.y = baseHipY + Math.abs(Math.sin(cycle * 2)) * 0.55;
            b['Pelvis'].rotation.z = Math.sin(cycle) * 0.05;

        } else if (currentAnimalGait === 'stalk') {
            // Stealth Prowl: Low crouch, deliberate slow reach
            lfPhase = cycle;
            rhPhase = cycle + Math.PI * 0.5;
            rfPhase = cycle + Math.PI;
            lhPhase = cycle + Math.PI * 1.5;

            b['Pelvis'].position.y = baseHipY - 1.2 + Math.sin(cycle * 2) * 0.2;
            spineFlex = Math.sin(cycle) * 0.08;

        } else {
            // 4-Beat Walk: Classic lateral sequence
            lfPhase = cycle;
            rhPhase = cycle + Math.PI * 0.5;
            rfPhase = cycle + Math.PI;
            lhPhase = cycle + Math.PI * 1.5;

            b['Pelvis'].position.y = baseHipY + Math.abs(Math.sin(cycle * 2)) * 0.3;
            b['Pelvis'].rotation.z = Math.sin(cycle) * 0.04;
        }

        // Spine flexion
        if (b['Spine1']) b['Spine1'].rotation.x = spineFlex * 0.6;
        if (b['Spine2']) b['Spine2'].rotation.x = spineFlex * 0.4;
        if (b['Chest']) b['Chest'].rotation.z = -b['Pelvis'].rotation.z;

        // Limb Kinematics: Scapula / Femur swing & knee/hock bend
        const amp = (currentAnimalGait === 'sprint' ? 0.72 : currentAnimalGait === 'trot' ? 0.46 : currentAnimalGait === 'stalk' ? 0.26 : 0.35);

        function updateLeg(scapulaName, radiusName, carpusName, phase) {
            const swing = Math.sin(phase) * amp;
            // During forward swing (sin(phase) > 0), flex elbow/radius to lift front foot cleanly
            const forwardSwing = Math.max(0, Math.sin(phase));
            if (b[scapulaName]) b[scapulaName].rotation.x = swing;
            if (b[radiusName]) b[radiusName].rotation.x = forwardSwing * 0.55;
            if (b[carpusName]) b[carpusName].rotation.x = -forwardSwing * 0.3;
        }

        function updateHind(femurName, tibiaName, hockName, phase) {
            const swing = Math.sin(phase) * amp;
            // During forward swing (sin(phase) > 0), flex knee and hock to lift foot and prevent leg collision
            const forwardSwing = Math.max(0, Math.sin(phase));
            if (b[femurName]) b[femurName].rotation.x = swing;
            if (b[tibiaName]) b[tibiaName].rotation.x = -forwardSwing * 0.65;
            if (b[hockName]) b[hockName].rotation.x = forwardSwing * 0.5;
        }

        updateLeg('L_Scapula', 'L_Radius', 'L_Carpus', lfPhase);
        updateLeg('R_Scapula', 'R_Radius', 'R_Carpus', rfPhase);
        updateHind('L_Femur', 'L_Tibia', 'L_Hock', lhPhase);
        updateHind('R_Femur', 'R_Tibia', 'R_Hock', rhPhase);

        // Tail Wave Physics
        if (tailWagToggle && tailWagToggle.checked) {
            const wagSpeed = (currentAnimalGait === 'sprint' ? 1.8 : 1.2);
            const wagAmp = (currentAnimalGait === 'sprint' ? 0.25 : 0.45);
            ['Tail1', 'Tail2', 'Tail3', 'Tail4', 'Tail5'].forEach((tName, i) => {
                if (b[tName]) {
                    b[tName].rotation.y = Math.sin(animalTailWagCycle * wagSpeed - i * 0.6) * wagAmp;
                    b[tName].rotation.x = 0.2 + (currentAnimalGait === 'sprint' ? Math.cos(cycle) * 0.3 : 0);
                }
            });
        }

        // Head stability & gentle nodding
        if (b['Neck']) b['Neck'].rotation.x = Math.sin(cycle * 2) * 0.08;
        if (b['Head']) b['Head'].rotation.x = -Math.sin(cycle * 2) * 0.06;
    }
}

/**
 * Sets current animal locomotion gait.
 */
function setAnimalGait(gait) {
    currentAnimalGait = gait;
    const statusEl = document.getElementById('animal-status-text');
    if (statusEl) {
        statusEl.textContent = `🐾 Gait changed to: ${gait.toUpperCase()} at 60 FPS.`;
        statusEl.style.color = '#34d399';
    }
}

/**
 * Sets camera viewpoint presets specifically tailored for animal framing.
 */
function applyAnimalCamera(preset) {
    if (!camera || !controls) return;

    const ANIMAL_CAMERAS = {
        side:  { pos: new THREE.Vector3(32, -6, 0), target: new THREE.Vector3(0, -7.5, 0) },
        front: { pos: new THREE.Vector3(0, -5, 30), target: new THREE.Vector3(0, -7.5, 0) },
        iso:   { pos: new THREE.Vector3(22, 2, 22), target: new THREE.Vector3(0, -7.5, 0) }
    };

    const cfg = ANIMAL_CAMERAS[preset] || ANIMAL_CAMERAS.side;
    camera.position.copy(cfg.pos);
    controls.target.copy(cfg.target);
    controls.update();

    ['animal-view-side', 'animal-view-front', 'animal-view-iso'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    document.getElementById(`animal-view-${preset}`)?.classList.add('active');
}

/**
 * Exposes a clean scriptable API on window.Studio for XtraAnim Studio code editor.
 * Allows programmatic control of animations, combats, math teacher, animals, and camera.
 */
function exposeStudioAPI() {
    const priorQueue = (window.Studio && window.Studio._exportQueue) ? window.Studio._exportQueue : [];

    window.Studio = {
        // Mode Switcher
        setMode(mode) {
            if (typeof switchViewerMode === 'function') switchViewerMode(mode);
        },
        getMode() {
            return currentMode;
        },

        // Speed & Timing
        setSpeed(speed) {
            const val = Math.max(0.1, Math.min(3.0, parseFloat(speed) || 1.0));
            fightSpeedMultiplier = val;
            animalSpeedMultiplier = val;
            if (speedSlider) {
                speedSlider.value = val;
                if (speedVal) speedVal.textContent = val.toFixed(2) + 'x';
            }
            const aSlider = document.getElementById('animal-speed-slider');
            const aVal = document.getElementById('animal-speed-val');
            if (aSlider) {
                aSlider.value = val;
                if (aVal) aVal.textContent = val.toFixed(2) + 'x';
            }
            if (mixer) mixer.timeScale = val;
        },

        // Cinematic Director & Movie Sequencer API
        createDirector() {
            if (window._activeDirector) {
                window._activeDirector.pause();
            }
            const director = new CinematicDirector({
                scene,
                camera,
                renderer,
                controls,
                studio: window.Studio
            });
            director.play();
            window._activeDirector = director;
            return director;
        },
        createTimeline() {
            return this.createDirector();
        },
        addCameraShake(intensity = 0.8) {
            cameraShakeIntensity = Math.max(cameraShakeIntensity, intensity);
            if (window._activeDirector) window._activeDirector.addCameraShake(intensity);
        },
        triggerHitStop(durationSec = 0.08, shakeAmount = 1.2) {
            hitStopTimer = Math.max(hitStopTimer, durationSec);
            this.addCameraShake(shakeAmount);
        },

        // Camera Control
        setCameraPreset(preset) {
            if (currentMode === 'parkour' && typeof applyParkourCamera === 'function') {
                applyParkourCamera(preset);
            } else if (currentMode === 'animal' && typeof applyAnimalCamera === 'function') {
                applyAnimalCamera(preset);
            } else if (typeof applyCameraPreset === 'function') {
                applyCameraPreset(preset);
            }
        },
        enableAutoCamera(options = {}) {
            const isBool = (typeof options === 'boolean');
            const enabled = isBool ? options : (options.enabled !== undefined ? !!options.enabled : true);
            if (!enabled) {
                this.disableAutoCamera();
                return;
            }
            window._autoCameraInterval = (typeof options === 'object' && options.interval) ? parseFloat(options.interval) : 2.5;
            window._autoCameraPresets = (typeof options === 'object' && Array.isArray(options.presets)) ? options.presets : ['iso', 'front', 'side', 'top', 'cinematic', 'chase'];
            window._autoCameraIndex = 0;
            window._autoCameraElapsed = 0;
            this.setCameraPreset(window._autoCameraPresets[0]);
        },
        disableAutoCamera() {
            window._autoCameraInterval = null;
            window._autoCameraPresets = null;
        },
        cycleCamera() {
            const presets = window._autoCameraPresets || ['iso', 'front', 'side', 'top', 'cinematic', 'chase'];
            window._autoCameraIndex = ((window._autoCameraIndex || 0) + 1) % presets.length;
            const nextPreset = presets[window._autoCameraIndex];
            this.setCameraPreset(nextPreset);
        },

        // Parkour Studio API (The Physics of Parkour • Alan Becker Kinematics)
        setParkourAction(action) {
            if (typeof setParkourAction === 'function') setParkourAction(action);
        },
        dance() {
            this.setMode('parkour');
            if (typeof setParkourAction === 'function') setParkourAction('dance');
        },
        playDance() {
            this.setMode('parkour');
            if (typeof setParkourAction === 'function') setParkourAction('dance');
        },
        playBasketball() {
            this.setMode('parkour');
            if (typeof setParkourAction === 'function') setParkourAction('basketball_dunk');
        },
        setSport(sport) {
            if (sport === 'dance' || sport === 'dancing') {
                this.setParkourAction('dance');
            } else if (sport === 'basketball' || sport === 'basketball_dunk' || sport === 'dunk') {
                this.setParkourAction('basketball_dunk');
            } else if (sport === 'hurdle' || sport === 'hurdle_vault' || sport === 'vault') {
                this.setParkourAction('hurdle_vault');
            }
        },
        setParkourStyle(style) {
            if (typeof setParkourStyle === 'function') setParkourStyle(style);
        },
        setParkourSpeed(speed) {
            if (typeof setParkourSpeed === 'function') setParkourSpeed(speed);
        },
        enableParkourTelemetry(enabled) {
            if (typeof enableParkourTelemetry === 'function') enableParkourTelemetry(enabled);
        },
        hideHUD() {
            if (typeof enableParkourTelemetry === 'function') enableParkourTelemetry(false);
        },
        removeHUD() {
            if (typeof enableParkourTelemetry === 'function') enableParkourTelemetry(false);
        },
        hideBadge() {
            if (typeof enableParkourTelemetry === 'function') enableParkourTelemetry(false);
        },
        removeBadge() {
            if (typeof enableParkourTelemetry === 'function') enableParkourTelemetry(false);
        },
        enableBoundary(enabled = true) {
            if (parkourPlaygroundGroup) {
                parkourPlaygroundGroup.visible = !!enabled;
            }
        },
        setCompanionParkour(options = {}) {
            const enabled = (options.enabled !== undefined) ? !!options.enabled : true;
            const style = options.style || 'stickman_white';
            const action = options.action || 'hurdle_vault';
            const offsetZ = (options.offsetZ !== undefined) ? options.offsetZ : -10;
            const speed = (options.speed !== undefined) ? options.speed : (options.speedFactor || parkourSpeedFactor);
            if (typeof setupParkourCompanion === 'function') {
                setupParkourCompanion(enabled, style, action, offsetZ, speed);
            }
        },
        addParkourRunner(options = {}) {
            this.setCompanionParkour(options);
        },
        addStickman(options = {}) {
            if (currentMode === 'parkour' || options.mode === 'parkour' || options.action) {
                this.setCompanionParkour(options);
            } else {
                return this.createCharacter(options);
            }
        },
        triggerParkourJump() {
            parkourStartTime = performance.now();
        },
        setCameraPosition(x, y, z) {
            if (camera) {
                camera.position.set(x, y, z);
                if (controls) controls.update();
            }
        },
        setCameraTarget(x, y, z) {
            if (controls) {
                controls.target.set(x, y, z);
                controls.update();
            }
        },
        setFOV(fov) {
            if (camera) {
                camera.fov = Math.max(20, Math.min(100, parseFloat(fov) || 45));
                camera.updateProjectionMatrix();
            }
        },
        setEnvironment(theme) {
            if (!renderer) return;
            switch(theme) {
                case 'void':
                    renderer.setClearColor(0x050508, 1);
                    if (scene?.fog) scene.fog.color.setHex(0x050508);
                    break;
                case 'dojo':
                    renderer.setClearColor(0x1a0f0a, 1);
                    if (scene?.fog) scene.fog.color.setHex(0x1a0f0a);
                    break;
                case 'neon':
                    renderer.setClearColor(0x05131f, 1);
                    if (scene?.fog) scene.fog.color.setHex(0x05131f);
                    break;
                case 'sunset':
                    renderer.setClearColor(0x2d121b, 1);
                    if (scene?.fog) scene.fog.color.setHex(0x2d121b);
                    break;
                case 'slate':
                default:
                    renderer.setClearColor(0x0f172a, 1);
                    if (scene?.fog) scene.fog.color.setHex(0x0f172a);
                    break;
            }
        },
        setLighting(preset) {
            if (!ambientLight || !keyLight || !fillLight || !rimLight) return;
            switch(preset) {
                case 'cyber':
                    ambientLight.intensity = 0.8;
                    keyLight.color.setHex(0x06b6d4);
                    keyLight.intensity = 1.8;
                    fillLight.color.setHex(0x8b5cf6);
                    fillLight.intensity = 1.2;
                    rimLight.color.setHex(0xf43f5e);
                    rimLight.intensity = 2.2;
                    break;
                case 'sunset':
                    ambientLight.intensity = 0.9;
                    keyLight.color.setHex(0xfb923c);
                    keyLight.intensity = 2.0;
                    fillLight.color.setHex(0xc084fc);
                    fillLight.intensity = 0.8;
                    rimLight.color.setHex(0xfde047);
                    rimLight.intensity = 1.6;
                    break;
                case 'soft':
                    ambientLight.intensity = 1.5;
                    keyLight.color.setHex(0xffffff);
                    keyLight.intensity = 1.2;
                    fillLight.color.setHex(0xe2e8f0);
                    fillLight.intensity = 1.0;
                    rimLight.color.setHex(0xffffff);
                    rimLight.intensity = 0.8;
                    break;
                case 'toon':
                default:
                    ambientLight.intensity = 1.2;
                    keyLight.color.setHex(0xfff1e6);
                    keyLight.intensity = 1.6;
                    fillLight.color.setHex(0x93c5fd);
                    fillLight.intensity = 0.9;
                    rimLight.color.setHex(0x38bdf8);
                    rimLight.intensity = 1.4;
                    break;
            }
        },
        setGrid(visible) {
            if (gridHelper) gridHelper.visible = !!visible;
            const toggle = document.getElementById('grid-toggle');
            if (toggle) toggle.checked = !!visible;
        },
        setShadows(visible) {
            if (groundPlaneMesh) groundPlaneMesh.visible = !!visible;
        },

        // Fight Arena API
        setFighter1(opts = {}) {
            if (opts.style && typeof rebuildFighter1Style === 'function') {
                const sel = document.getElementById('fighter1-style');
                if (sel) sel.value = opts.style;
                rebuildFighter1Style(opts.style);
            }
            if (opts.position && fighter1 && fighter1.root) {
                fighter1.root.position.set(opts.position[0], opts.position[1], opts.position[2]);
            }
        },
        setFighter2(opts = {}) {
            if (opts.style && typeof rebuildFighter2Style === 'function') {
                rebuildFighter2Style(opts.style);
            }
            if (opts.position && fighter2 && fighter2.root) {
                fighter2.root.position.set(opts.position[0], opts.position[1], opts.position[2]);
            }
        },
        hideArenaFighters() {
            if (fighter1 && fighter1.root) fighter1.root.visible = false;
            if (fighter2 && fighter2.root) fighter2.root.visible = false;
            const ring = fightArenaGroup?.children?.[0];
            if (ring) ring.visible = false;
        },
        showArenaFighters() {
            if (fighter1 && fighter1.root) fighter1.root.visible = true;
            if (fighter2 && fighter2.root) fighter2.root.visible = true;
            const ring = fightArenaGroup?.children?.[0];
            if (ring) ring.visible = true;
        },
        playCombo() {
            if (typeof playFullFightCombo === 'function') {
                playFullFightCombo();
            }
        },
        triggerMove(moveName) {
            const btn = document.getElementById('btn-action-' + moveName) || (moveName === 'reset' ? document.getElementById('btn-fight-reset') : null);
            if (btn) btn.click();
        },
        enableSlowMotionHits(enabled) {
            // Available in battle choreography
        },
        enableCameraShake(enabled) {
            const toggle = document.getElementById('fx-toggle');
            if (toggle) toggle.checked = !!enabled;
        },
        setFightLoop(enabled) {
            const toggle = document.getElementById('fight-loop-toggle');
            if (toggle) toggle.checked = !!enabled;
        },

        // Math Teacher Classroom API
        setLesson(lessonId) {
            const sel = document.getElementById('lesson-select');
            if (sel) sel.value = lessonId;
            if (typeof loadTeacherLesson === 'function') loadTeacherLesson(lessonId);
        },
        setStep(stepIdx) {
            currentStepIndex = stepIdx;
            if (typeof renderTeacherStep === 'function') renderTeacherStep();
        },
        nextStep() {
            const btn = document.getElementById('btn-teacher-next');
            if (btn) btn.click();
        },
        prevStep() {
            const btn = document.getElementById('btn-teacher-prev');
            if (btn) btn.click();
        },
        autoExplain(opts = {}) {
            if (typeof toggleTeacherAutoPlay === 'function' && !isTeacherAutoPlaying) {
                toggleTeacherAutoPlay();
            }
        },
        stopAutoExplain() {
            if (isTeacherAutoPlaying && typeof toggleTeacherAutoPlay === 'function') {
                toggleTeacherAutoPlay();
            }
        },
        speak(text) {
            if (typeof speakTeacherText === 'function') speakTeacherText(text);
        },
        setTeacherStyle(styleName) {
            const sel = document.getElementById('teacher-style-select');
            if (sel) {
                sel.value = styleName;
                sel.dispatchEvent(new Event('change'));
            }
        },
        pointAtTerm(termKey) {
            const lesson = MATH_LESSONS[currentLessonId] || MATH_LESSONS.quadratic;
            if (lesson && lesson.terms) {
                const term = lesson.terms.find(t => t.label.toLowerCase().includes(termKey.toLowerCase()));
                if (term && typeof pointTeacherAtTerm === 'function') {
                    pointTeacherAtTerm(term);
                }
            }
        },

        // Animal Studio API
        setSpecies(species) {
            currentAnimalSpecies = species;
            const sel = document.getElementById('animal-species-select');
            if (sel) sel.value = species;
            if (typeof rebuildAnimalCharacter === 'function') rebuildAnimalCharacter();
        },
        setGait(gait) {
            const sel = document.getElementById('animal-gait-select');
            if (sel) sel.value = gait;
            if (typeof setAnimalGait === 'function') setAnimalGait(gait);
        },
        setCoat(coat) {
            currentAnimalCoat = coat;
            const sel = document.getElementById('animal-coat-select');
            if (sel) sel.value = coat;
            if (typeof rebuildAnimalCharacter === 'function') rebuildAnimalCharacter();
        },
        setTailWag(enabled) {
            const toggle = document.getElementById('animal-tailwag-toggle');
            if (toggle) toggle.checked = !!enabled;
        },

        // Solo MoCap API
        setMotion(motion) {
            if (typeof playAnimation === 'function') playAnimation(motion);
            if (animSelect) animSelect.value = motion;
        },
        setCharacterStyle(style) {
            if (styleSelect) styleSelect.value = style;
            if (currentSkeleton && typeof buildCartoonCharacter === 'function') {
                buildCartoonCharacter(currentSkeleton, style);
            }
        },
        setInPlace(inPlace) {
            if (inPlaceToggle) inPlaceToggle.checked = !!inPlace;
            const animalInplace = document.getElementById('animal-inplace-toggle');
            if (animalInplace) animalInplace.checked = !!inPlace;
        },
        setTreadmill(treadmill) {
            this.setInPlace(treadmill);
        },

        // 3D Scene Accessors
        getScene() { return scene; },
        getCamera() { return camera; },
        getRenderer() { return renderer; },
        getControls() { return controls; },

        // ==========================================================
        // 🚀 ADVANCED SCRIPTABLE GENERATIVE & CHOREOGRAPHY SUITE
        // ==========================================================

        // 1. Frame Update Event Hook (Generative Animations & Mathematics)
        onUpdate(callback) {
            if (!window._userUpdateCallbacks) window._userUpdateCallbacks = [];
            if (typeof callback === 'function') {
                window._userUpdateCallbacks.push(callback);
            }
            return () => {
                const idx = window._userUpdateCallbacks.indexOf(callback);
                if (idx >= 0) window._userUpdateCallbacks.splice(idx, 1);
            };
        },
        clearUpdates() {
            window._userUpdateCallbacks = [];
        },

        // 2. Timeline Choreography Engine
        timeline() {
            if (!window._activeStudioTimelines) window._activeStudioTimelines = [];
            const tl = {
                events: [],
                currentTime: 0,
                isFinished: false,
                loop: false,
                duration: 0,

                at(timeSec, callback) {
                    this.events.push({ time: parseFloat(timeSec) || 0, fn: callback, executed: false });
                    this.events.sort((a, b) => a.time - b.time);
                    this.duration = Math.max(this.duration, timeSec);
                    return this;
                },
                wait(durationSec) {
                    this.duration += durationSec;
                    return this;
                },
                setLoop(enabled = true) {
                    this.loop = !!enabled;
                    return this;
                },
                update(delta) {
                    if (this.isFinished) return;
                    this.currentTime += delta;
                    for (let i = 0; i < this.events.length; i++) {
                        const ev = this.events[i];
                        if (!ev.executed && this.currentTime >= ev.time) {
                            ev.executed = true;
                            try { ev.fn(); } catch(e) { console.warn('[Timeline Event Error]:', e); }
                        }
                    }
                    if (this.currentTime >= this.duration) {
                        if (this.loop) {
                            this.currentTime = 0;
                            this.events.forEach(e => e.executed = false);
                        } else {
                            this.isFinished = true;
                        }
                    }
                },
                reset() {
                    this.currentTime = 0;
                    this.isFinished = false;
                    this.events.forEach(e => e.executed = false);
                },
                stop() {
                    this.isFinished = true;
                    const idx = window._activeStudioTimelines.indexOf(this);
                    if (idx >= 0) window._activeStudioTimelines.splice(idx, 1);
                }
            };
            window._activeStudioTimelines.push(tl);
            return tl;
        },

        // 3. Generative 3D Cartoon Shapes
        shapes: {
            box(w = 2, h = 2, d = 2, color = 0x38bdf8, options = {}) {
                const geom = new THREE.BoxGeometry(w, h, d);
                const mat = new THREE.MeshToonMaterial({
                    color: color,
                    roughness: 0.3
                });
                const mesh = new THREE.Mesh(geom, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                if (options.position) mesh.position.set(options.position[0] || 0, options.position[1] || 0, options.position[2] || 0);
                scene.add(mesh);
                return mesh;
            },
            sphere(radius = 1.5, color = 0xf43f5e, options = {}) {
                const geom = new THREE.SphereGeometry(radius, 32, 32);
                const mat = new THREE.MeshToonMaterial({
                    color: color,
                    roughness: 0.2
                });
                const mesh = new THREE.Mesh(geom, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                if (options.position) mesh.position.set(options.position[0] || 0, options.position[1] || 0, options.position[2] || 0);
                scene.add(mesh);
                return mesh;
            },
            cylinder(radiusTop = 1, radiusBottom = 1, height = 3, color = 0x10b981, options = {}) {
                const geom = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32);
                const mat = new THREE.MeshToonMaterial({ color: color });
                const mesh = new THREE.Mesh(geom, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                if (options.position) mesh.position.set(options.position[0] || 0, options.position[1] || 0, options.position[2] || 0);
                scene.add(mesh);
                return mesh;
            },
            torus(radius = 2, tube = 0.5, color = 0xfbbf24, options = {}) {
                const geom = new THREE.TorusGeometry(radius, tube, 24, 48);
                const mat = new THREE.MeshToonMaterial({ color: color });
                const mesh = new THREE.Mesh(geom, mat);
                mesh.castShadow = true;
                if (options.position) mesh.position.set(options.position[0] || 0, options.position[1] || 0, options.position[2] || 0);
                scene.add(mesh);
                return mesh;
            }
        },

        // 4. Generative Cartoon Character Spawner
        createCharacter(options = {}) {
            const style = options.style || 'stickman_orange';
            const posX = options.position ? options.position[0] : 0;
            const posY = options.position ? options.position[1] : 0;
            const posZ = options.position ? options.position[2] : 0;
            const faceDir = options.facing === 'left' ? -1 : 1;

            const fighter = createCombatFighter(style, posX, faceDir);
            fighter.root.position.set(posX, posY, posZ);
            if (options.scale) {
                fighter.root.scale.setScalar(options.scale);
            }
            if (options.color) {
                fighter.mat.color.set(options.color);
            }
            fighter.applyPose(COMBAT_POSES.stance);
            if (!customStudioGroup) {
                customStudioGroup = new THREE.Group();
                scene.add(customStudioGroup);
            }
            customStudioGroup.add(fighter.root);

            if (camera) {
                camera.position.set(0, 11, 24);
                if (controls) {
                    controls.target.set(0, 9, 0);
                    controls.update();
                }
            }

            const b = fighter.bones || {};
            b.leftShoulder = b.lShoulder;
            b.rightShoulder = b.rShoulder;
            b.leftElbow = b.lElbow;
            b.rightElbow = b.rElbow;
            b.leftHand = b.lHand;
            b.rightHand = b.rHand;
            b.leftHip = b.lHip;
            b.rightHip = b.rHip;
            b.leftKnee = b.lKnee;
            b.rightKnee = b.rKnee;
            b.leftFoot = b.lFoot;
            b.rightFoot = b.rFoot;
            b.head = b.headGroup;

            return {
                root: fighter.root,
                bones: fighter.bones,
                dance(style = 'groove', speed = 4) {
                    Studio.onUpdate((delta, elapsed) => {
                        const t = elapsed * speed;
                        fighter.root.position.y = posY + Math.abs(Math.sin(t)) * 1.2;
                        if (b.hips) b.hips.rotation.z = Math.sin(t) * 0.35;
                        if (b.chest) b.chest.rotation.z = -Math.sin(t) * 0.15;
                        if (b.lShoulder) b.lShoulder.rotation.z = Math.sin(t) * 0.9;
                        if (b.rShoulder) b.rShoulder.rotation.z = -Math.sin(t) * 0.9;
                        if (b.lElbow) b.lElbow.rotation.z = Math.max(0, Math.cos(t) * 1.2);
                        if (b.rElbow) b.rElbow.rotation.z = -Math.max(0, Math.cos(t) * 1.2);
                        if (b.lKnee) b.lKnee.rotation.x = Math.max(0, Math.sin(t) * 0.8);
                        if (b.rKnee) b.rKnee.rotation.x = Math.max(0, -Math.sin(t) * 0.8);
                        if (b.neck) b.neck.rotation.z = -Math.sin(t) * 0.2;
                    });
                    return this;
                },
                pose(poseName) {
                    if (COMBAT_POSES[poseName]) {
                        fighter.applyPose(COMBAT_POSES[poseName]);
                    }
                },
                moveTo(x, y, z, duration = 0.3) {
                    return transitionPose(fighter, Object.assign({}, fighter.currentPose, { forwardX: x, rootY: y }), duration);
                },
                attack(type = 'punch', duration = 0.2) {
                    const pose = COMBAT_POSES[type] || COMBAT_POSES.punch;
                    return transitionPose(fighter, pose, duration);
                },
                reset(duration = 0.25) {
                    return transitionPose(fighter, COMBAT_POSES.stance, duration);
                },
                setColor(hex) {
                    fighter.mat.color.set(hex);
                },
                remove() {
                    if (customStudioGroup) customStudioGroup.remove(fighter.root);
                    else scene.remove(fighter.root);
                }
            };
        },

        // 5. Generative Cartoon Props & Weapons
        createProp(type = 'energy_sphere', options = {}) {
            const group = new THREE.Group();
            const color = options.color || 0x38bdf8;
            const pos = options.position || [0, 8, 0];

            if (type === 'energy_sphere' || type === 'orb') {
                const geom = new THREE.SphereGeometry(options.radius || 1.4, 32, 32);
                const mat = new THREE.MeshBasicMaterial({ color: color, wireframe: false });
                const mesh = new THREE.Mesh(geom, mat);
                group.add(mesh);

                const ringGeom = new THREE.TorusGeometry((options.radius || 1.4) * 1.5, 0.08, 16, 48);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                const ring = new THREE.Mesh(ringGeom, ringMat);
                ring.rotation.x = Math.PI * 0.5;
                group.add(ring);
            } else if (type === 'sword' || type === 'katana') {
                const bladeGeom = new THREE.BoxGeometry(0.12, 3.8, 0.35);
                const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
                const blade = new THREE.Mesh(bladeGeom, bladeMat);
                blade.position.y = 1.9;
                group.add(blade);

                const guardGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 16);
                const guardMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
                const guard = new THREE.Mesh(guardGeom, guardMat);
                group.add(guard);

                const hiltGeom = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 16);
                const hiltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
                const hilt = new THREE.Mesh(hiltGeom, hiltMat);
                hilt.position.y = -0.5;
                group.add(hilt);
            } else if (type === 'shield') {
                const shieldGeom = new THREE.CylinderGeometry(1.6, 1.6, 0.18, 32);
                const shieldMat = new THREE.MeshToonMaterial({ color: color });
                const shield = new THREE.Mesh(shieldGeom, shieldMat);
                shield.rotation.x = Math.PI * 0.5;
                group.add(shield);
            } else {
                const boxGeom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
                const boxMat = new THREE.MeshToonMaterial({ color: color });
                group.add(new THREE.Mesh(boxGeom, boxMat));
            }

            group.position.set(pos[0], pos[1], pos[2]);
            if (!customStudioGroup) {
                customStudioGroup = new THREE.Group();
                scene.add(customStudioGroup);
            }
            customStudioGroup.add(group);
            return group;
        },

        // 6. Scriptable Visual FX & Impact Sparks
        fx: {
            sparks(x = 0, y = 10, z = 0) {
                if (typeof spawnHitFX === 'function') {
                    spawnHitFX(x, y, z);
                }
            },
            shockwave(x = 0, y = 10, z = 0, color = 0xffea00) {
                const ringGeom = new THREE.RingGeometry(0.2, 0.6, 32);
                const ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
                const ring = new THREE.Mesh(ringGeom, ringMat);
                ring.position.set(x, y, z);
                scene.add(ring);

                const startTime = performance.now();
                function anim(now) {
                    const t = (now - startTime) / 350;
                    if (t < 1.0) {
                        ring.scale.setScalar(1 + t * 6);
                        ring.material.opacity = Math.max(0, 0.95 * (1 - t));
                        requestAnimationFrame(anim);
                    } else {
                        scene.remove(ring);
                    }
                }
                requestAnimationFrame(anim);
            }
        },

        // 7. Cinematic Camera Choreography
        camera: {
            shake(intensity = 0.5) {
                cameraShakeIntensity = Math.max(cameraShakeIntensity, intensity);
            },
            slowMotion(speed = 0.25, durationSec = 1.0) {
                fightSpeedMultiplier = speed;
                setTimeout(() => {
                    fightSpeedMultiplier = 1.0;
                }, durationSec * 1000);
            },
            lookAt(x, y, z) {
                if (controls) {
                    controls.target.set(x, y, z);
                    controls.update();
                }
            },
            setPreset(name) {
                if (typeof applyCameraPreset === 'function') applyCameraPreset(name);
            }
        },

        // 8. Direct Fighter Handles
        getFighter1() { return fighter1; },
        getFighter2() { return fighter2; },

        // Snapshot & Thumbnail capture
        getSnapshot() {
            try {
                if (renderer && scene && camera) {
                    renderer.render(scene, camera);
                    return renderer.domElement.toDataURL('image/png');
                }
            } catch (e) {
                console.warn('Studio.getSnapshot failed:', e);
            }
            return null;
        },

        // Manim-Grade Local Video Exporter (4K/1080p 60FPS)
        async exportVideo(options = {}) {
            const durationSec = options.durationSec || 5.0;
            const fps = options.fps || 60;
            const width = options.width || 1920;
            const height = options.height || 1080;
            const bitrate = options.bitrate || 35_000_000;

            console.log(`[Cartoon Studio] 🎬 Starting Manim-Grade Local Video Export: ${width}x${height} @ ${fps}fps (${bitrate / 1e6} Mbps)...`);

            return await exportManimQualityVideo({
                renderer,
                scene,
                camera,
                durationSec,
                fps,
                width,
                height,
                bitrate,
                onStepFrame: (currentTime, delta, frameIndex, totalFrames) => {
                    if (currentMode === 'solo' && mixer) {
                        mixer.setTime(currentTime);
                    } else if (currentMode === 'parkour') {
                        updateParkourAnimation(delta, currentTime);
                    } else if (currentMode === 'teacher') {
                        updateMathTeacher(delta);
                    } else if (currentMode === 'animal') {
                        updateAnimalLocomotion(delta);
                    }

                    if (window._activeDirector) {
                        try { window._activeDirector.update(delta, currentTime); } catch(e) {}
                    }

                    if (window._userUpdateCallbacks) {
                        for (let i = 0; i < window._userUpdateCallbacks.length; i++) {
                            try { window._userUpdateCallbacks[i](delta, currentTime); } catch(e) {}
                        }
                    }

                    if (window._activeStudioTimelines) {
                        for (let i = 0; i < window._activeStudioTimelines.length; i++) {
                            window._activeStudioTimelines[i].update(delta);
                        }
                    }

                    if (controls) controls.update();
                },
                onProgress: (pct, frame, total) => {
                    if (options.onProgress) options.onProgress(pct, frame, total);
                    window.parent.postMessage({
                        type: 'EXPORT_PROGRESS',
                        percent: pct,
                        frame,
                        total
                    }, '*');
                }
            }).then(result => {
                console.log(`[Cartoon Studio] ✅ Export completed: ${result.filename}`);
                // Trigger instant download
                const a = document.createElement('a');
                a.href = result.downloadUrl;
                a.download = result.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                window.parent.postMessage({
                    type: 'EXPORT_COMPLETE',
                    url: result.downloadUrl,
                    filename: result.filename
                }, '*');

                return result;
            }).catch(err => {
                console.error("[Cartoon Studio] ❌ Export failed:", err);
                window.parent.postMessage({
                    type: 'EXPORT_ERROR',
                    error: err.message
                }, '*');
                throw err;
            });
        }
    };

    // Listen for parent window export trigger
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'START_MANIM_EXPORT') {
            if (window.Studio && typeof window.Studio.exportVideo === 'function') {
                window.Studio.exportVideo(e.data.options || {});
            }
        }
    });

    // Flush any export requests that were queued before app.js initialization completed
    if (priorQueue && priorQueue.length > 0) {
        priorQueue.forEach(q => {
            window.Studio.exportVideo(q.opts || {}).then(q.resolve).catch(q.reject);
        });
    }

    window.__STUDIO_READY__ = true;
    window.dispatchEvent(new CustomEvent('studio-ready', { detail: window.Studio }));
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); });
} else {
    init();
}

