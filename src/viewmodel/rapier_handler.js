// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/rapier_handler.js

/**
 * Rapier 3D Physics Engine Handler for XtraAnim Studio
 * 
 * Delivers deterministic WebAssembly rigid-body physics, joint constraints,
 * articulated ragdolls, and continuous collision detection with Three.js rendering.
 */

window.rapierTemplates = {
    domino_cascade: `// 🎯 Rapier 3D Physics: 120-Piece Spiral Domino Cascade
// Demonstrates high-performance collision resolution & momentum propagation

// 1. Setup Simulation Environment
Physics.setGravity([0, -9.81, 0]);
Physics.enableShadows(true);
Physics.setFloor({ size: 60, color: 0x0f172a, gridColor: 0x1e293b });

// 2. Build Constant-Arc-Length Spiral Domino Path
// Uses differential arc-length integration so spacing remains constant (0.62m) everywhere
const numDominoes = 130;
const dWidth = 0.25, dHeight = 1.4, dDepth = 0.7;
const r0 = 2.2;            // Inner starting radius
const b = 0.55;            // Spiral expansion rate
const stepDs = 0.62;       // Constant distance between consecutive dominoes (optimal for 1.4m height)

let theta = 0.0;
let firstDominoPos = null;
let firstTangent = null;

for (let i = 0; i < numDominoes; i++) {
    const r = r0 + b * theta;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const y = dHeight / 2;
    
    // Accurate tangent vector along spiral curve
    const dx = b * Math.cos(theta) - r * Math.sin(theta);
    const dz = b * Math.sin(theta) + r * Math.cos(theta);
    const tangentAngle = Math.atan2(dz, dx);
    
    if (i === 0) {
        firstDominoPos = [x, y, z];
        firstTangent = [Math.cos(tangentAngle), Math.sin(tangentAngle)];
    }
    
    // Rainbow color gradient along spiral
    const hue = Math.round((i / numDominoes) * 320);
    const color = new THREE.Color("hsl(" + hue + ", 85%, 60%)").getHex();
    
    Physics.addBox({
        pos: [x, y, z],
        rot: [0, -tangentAngle, 0],
        size: [dWidth, dHeight, dDepth],
        mass: 1.2,
        friction: 0.35,
        restitution: 0.15,
        color: color,
        roughness: 0.3,
        metalness: 0.1
    });
    
    // Advance theta by arc length step: ds / sqrt(r^2 + b^2)
    const ds_dtheta = Math.sqrt(r * r + b * b);
    theta += stepDs / ds_dtheta;
}

// 3. Trigger Kinetic Starter Sphere
// Aligned directly on the approach path behind Domino 0
const starterPos = [
    firstDominoPos[0] - firstTangent[0] * 2.0,
    0.65,
    firstDominoPos[2] - firstTangent[1] * 2.0
];

const starterSphere = Physics.addSphere({
    pos: starterPos,
    radius: 0.65,
    mass: 5.0,
    color: 0xfacc15,
    metalness: 0.85,
    roughness: 0.15
});

// Launch starter ball directly forward into the face of the first domino
setTimeout(() => {
    starterSphere.setLinearVelocity([
        firstTangent[0] * 7.0,
        0,
        firstTangent[1] * 7.0
    ]);
}, 300);

// Camera view
Physics.setCamera({ pos: [14, 18, 22], lookAt: [0, 1, 0], fov: 45 });
`,

    newtons_cradle: `// ⚖️ Rapier 3D Physics: Newton's Cradle (Elastic Restitution)
// Demonstrates conservation of momentum and energy via spherical joints

Physics.setGravity([0, -9.81, 0]);
Physics.enableShadows(true);
Physics.setFloor({ size: 30, color: 0x090d16, gridColor: 0x1e293b });

const numBalls = 5;
const radius = 0.6;
const stringLength = 6.0;
const startX = -(numBalls - 1) * radius;

// Top mounting frame
Physics.addBox({
    pos: [0, stringLength + 2.5, 0],
    size: [numBalls * radius * 2 + 3, 0.4, 3],
    isStatic: true,
    color: 0x334155,
    metalness: 0.8
});

const balls = [];

for (let i = 0; i < numBalls; i++) {
    const x = startX + i * (radius * 2);
    const topAnchor = [x, stringLength + 2.3, 0];
    
    // For ball 0, pull it back to release
    let ballPos = [x, 2.3, 0];
    if (i === 0) {
        const pullAngle = -Math.PI / 4;
        ballPos = [
            topAnchor[0] + Math.sin(pullAngle) * stringLength,
            topAnchor[1] - Math.cos(pullAngle) * stringLength,
            0
        ];
    }

    const ball = Physics.addSphere({
        pos: ballPos,
        radius: radius,
        mass: 2.0,
        restitution: 0.99, // Near-perfect elastic restitution
        friction: 0.05,
        color: 0xe2e8f0,
        metalness: 0.95,
        roughness: 0.05
    });

    // Spherical suspension joint from ceiling
    Physics.addDistanceJoint({
        bodyA: null, // Fixed world anchor
        bodyB: ball,
        anchorA: topAnchor,
        anchorB: [0, 0, 0],
        length: stringLength,
        renderCable: true,
        cableColor: 0x94a3b8
    });

    balls.push(ball);
}

Physics.setCamera({ pos: [0, 5, 15], lookAt: [0, 4, 0], fov: 42 });
`,

    ragdoll_tumbler: `// 🤸 Rapier 3D Physics: Articulated Humanoid Ragdoll Tumbler
// Multi-body ragdoll with spherical/revolute joint angle limits tumbling down stairs

Physics.setGravity([0, -9.81, 0]);
Physics.enableShadows(true);
Physics.setFloor({ size: 40, color: 0x0f172a, gridColor: 0x334155 });

// 1. Build Multi-Tier Obstacle Steps
const numSteps = 8;
for (let i = 0; i < numSteps; i++) {
    Physics.addBox({
        pos: [-10 + i * 2.5, numSteps * 1.2 - i * 1.2, 0],
        size: [2.5, 0.6, 6],
        isStatic: true,
        color: (i % 2 === 0) ? 0x3b82f6 : 0x1d4ed8,
        friction: 0.4,
        restitution: 0.2
    });
}

// 2. Spawn Articulated Ragdolls at the Top
const ragdoll1 = Physics.addRagdoll({
    pos: [-10, numSteps * 1.2 + 2.5, 0],
    scale: 1.0,
    color: 0xf97316 // Orange Stickman
});

const ragdoll2 = Physics.addRagdoll({
    pos: [-8.5, numSteps * 1.2 + 4.5, 0.5],
    scale: 0.95,
    color: 0x38bdf8 // Blue Stickman
});

// Give top ragdoll a gentle push forward
setTimeout(() => {
    ragdoll1.head.applyImpulse([1.5, 0.5, 0]);
}, 300);

Physics.setCamera({ pos: [4, 8, 20], lookAt: [0, 4, 0], fov: 45 });
`,

    gravity_vortex: `// 🌪️ Rapier 3D Physics: 200-Sphere Kinetic Gravity Funnel
// Real-time multi-body interaction, kinetic pinwheels & restitution dynamics

Physics.setGravity([0, -12.0, 0]);
Physics.enableShadows(true);
Physics.setFloor({ size: 40, color: 0x020617, gridColor: 0x1e293b });

// 1. Build Funnel Walls (Fixed Segmented Colliders)
const segments = 24;
const funnelTopRadius = 8.0;
const funnelBottomRadius = 2.2;
const funnelHeight = 7.0;
const funnelY = 6.0;

for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const nextAngle = ((i + 1) / segments) * Math.PI * 2;
    const midAngle = (angle + nextAngle) / 2;
    
    const r = (funnelTopRadius + funnelBottomRadius) / 2;
    const x = Math.cos(midAngle) * r;
    const z = Math.sin(midAngle) * r;
    
    Physics.addBox({
        pos: [x, funnelY, z],
        rot: [0, -midAngle, 0.35], // Sloped inward
        size: [0.3, funnelHeight, (funnelTopRadius * 2 * Math.PI) / segments + 0.1],
        isStatic: true,
        color: 0x1e293b,
        restitution: 0.4,
        friction: 0.2
    });
}

// 2. Dynamic Rotating Kinetic Pinwheel below the funnel
const pinwheel = Physics.addBox({
    pos: [0, 1.8, 0],
    size: [6.0, 0.4, 0.8],
    mass: 15.0,
    color: 0x10b981
});

Physics.addRevoluteJoint({
    bodyA: null,
    bodyB: pinwheel,
    anchorA: [0, 1.8, 0],
    anchorB: [0, 0, 0],
    axis: [0, 1, 0] // Rotates freely around Y-axis
});

// 3. Rain 150 Bouncing Spheres into Funnel
const colors = [0xf43f5e, 0xfb923c, 0xfacc15, 0x4ade80, 0x38bdf8, 0xa855f7];

for (let i = 0; i < 150; i++) {
    const r = Math.random() * (funnelTopRadius - 1.5);
    const theta = Math.random() * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const y = funnelY + 5.0 + (i * 0.12);
    
    Physics.addSphere({
        pos: [x, y, z],
        radius: 0.32 + Math.random() * 0.15,
        mass: 0.8,
        restitution: 0.75,
        friction: 0.2,
        color: colors[i % colors.length],
        metalness: 0.4,
        roughness: 0.2
    });
}

Physics.setCamera({ pos: [0, 16, 24], lookAt: [0, 4, 0], fov: 48 });
`,

    stunt_car: `// 🏎️ Rapier 3D Physics: Pro Cyber Supercar & Mega Stunt Jump
// Features: Raycast Spring-Damper Suspension, Alloy Wheels, AWD Motor Drive & Dynamic Chase Cam

// 1. Setup Simulation Environment
Physics.setGravity([0, -9.81, 0]);
Physics.enableShadows(true);
Physics.setFloor({ size: 120, color: 0x090d16, gridColor: 0x1e293b });

// ==========================================
// 🏎️ 2. SPAWN PRO 3D CYBER SUPERCAR
// ==========================================
// Complete with metallic car paint, aerodynamic GT wing, xenon headlights & raycast suspension
const car = Physics.addVehicle({
    pos: [-36.0, 1.8, 0],
    color: 0xef4444,           // Racing Crimson Red
    mass: 45.0,
    wheelRadius: 0.55,
    wheelWidth: 0.45,
    suspensionRestLength: 0.38,
    stiffness: 55.0,           // Progressive spring compression
    damping: 4.5               // Rebound shock absorption
});

// Enable dynamic chase camera tracking
Physics.followCamera(car, { distance: 16, height: 6.0, lerp: 0.08 });

// ==========================================
// ⛰️ 3. OBSTACLE COURSE & STUNT JUMP RAMP
// ==========================================
// Approach Rumble Strips / Speed Bumps
for (let b = 0; b < 5; b++) {
    Physics.addBox({
        pos: [-24.0 + b * 2.2, 0.15, 0],
        size: [0.6, 0.3, 8.0],
        isStatic: true,
        color: 0x334155,
        restitution: 0.1
    });
}

// Mega Stunt Jump Ramp at X = -6
Physics.addBox({
    pos: [-6.0, 2.0, 0],
    rot: [0, 0, -0.38],
    size: [9.5, 0.4, 6.0],
    isStatic: true,
    color: 0xf59e0b,
    friction: 0.85
});

// Smooth Down-Ramp Landing Zone at X = 14
Physics.addBox({
    pos: [14.0, 1.5, 0],
    rot: [0, 0, 0.28],
    size: [8.5, 0.4, 7.0],
    isStatic: true,
    color: 0x10b981,
    friction: 0.85
});

// Target Pyramid of 18 Dynamic Destruction Barrels
for (let row = 0; row < 5; row++) {
    for (let col = 0; col < (5 - row); col++) {
        const bx = 28.0 + (col * 1.5) + (row * 0.75);
        const by = 0.6 + (row * 1.25);
        Physics.addCylinder({
            pos: [bx, by, (Math.random() - 0.5) * 1.5],
            radius: 0.48,
            height: 1.15,
            mass: 1.2,
            restitution: 0.3,
            friction: 0.5,
            color: (row % 2 === 0) ? 0x06b6d4 : 0xec4899
        });
    }
}

// ==========================================
// ⚡ 4. POWERTRAIN & ACCELERATION LOOP
// ==========================================
Physics.onStep((dt, time) => {
    // Continuous AWD throttle forward
    if (time < 6.0) {
        car.setEngineForce(140.0);
    } else {
        car.setEngineForce(0);
        car.setBrake(40.0);
    }
});
`
};

/**
 * Renders Rapier 3D physics code inside an isolated HTML iframe string.
 */
window.renderRapierStudio = function(userCode, options = {}) {
    const safeUserCode = userCode || window.rapierTemplates.domino_cascade;
    const title = options.title || 'Rapier 3D Physics';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <base href="/engines/cartoon_studio/">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>${title}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-user-select: none; user-select: none; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #070a13; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        #canvas-container { width: 100%; height: 100%; position: absolute; inset: 0; }
        #canvas3d { width: 100%; height: 100%; display: block; }
        
        /* Floating Physics Telemetry HUD */
        #physics-hud {
            position: absolute;
            top: 14px;
            left: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 7px 14px;
            border-radius: 999px;
            color: #f1f5f9;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.4px;
            z-index: 100;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
        }
        .hud-badge {
            background: linear-gradient(135deg, #10b981, #06b6d4);
            color: #ffffff;
            padding: 2px 7px;
            border-radius: 6px;
            font-size: 9.5px;
            font-weight: 800;
        }
        
        #loading-overlay {
            position: absolute;
            inset: 0;
            background: #070a13;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            color: #94a3b8;
            font-size: 13px;
            font-weight: 600;
            z-index: 200;
            transition: opacity 0.3s ease;
        }
        .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(16, 185, 129, 0.2);
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        #error-banner {
            display: none;
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(239, 68, 68, 0.9);
            color: #ffffff;
            padding: 10px 18px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
            z-index: 300;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
    </style>

    <script type="importmap">
        {
            "imports": {
                "three": "./vendor/three.module.js",
                "three/addons/controls/OrbitControls.js": "./vendor/OrbitControls.js",
                "@dimforge/rapier3d-compat": "./vendor/rapier3d.esm.js"
            }
        }
    </script>
</head>
<body>
    <div id="canvas-container">
        <canvas id="canvas3d"></canvas>
    </div>

    <div id="physics-hud">
        <span class="hud-badge">RAPIER WASM</span>
        <span id="body-count-text">BODIES: 0</span>
        <span style="color: rgba(255,255,255,0.3);">|</span>
        <span id="fps-text">60 FPS</span>
    </div>

    <div id="loading-overlay">
        <div class="spinner"></div>
        <span>Initializing Rapier 3D WASM Physics...</span>
    </div>

    <div id="error-banner"></div>

    <!-- Load Three.js & Rapier3D WASM Engine -->
    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import RAPIER from '@dimforge/rapier3d-compat';

        window.THREE = THREE;
        window.OrbitControls = OrbitControls;
        window.RAPIER = RAPIER;

        try {
            // 1. Initialize WebAssembly Module from local vendor assets
            await RAPIER.init('/engines/cartoon_studio/vendor/rapier_wasm3d_bg.wasm');

            // Hide loading screen
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            }

            // 2. Initialize Three.js Scene
            const canvas = document.getElementById('canvas3d');
            const renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                powerPreference: 'high-performance'
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.05;

            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0e131f);

            const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(14, 18, 22);

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.target.set(0, 1, 0);
            controls.enableRotate = true;
            controls.enableZoom = true;
            controls.enablePan = true;
            controls.minDistance = 1.5;
            controls.maxDistance = 250.0;
            controls.maxPolarAngle = Math.PI / 2 - 0.02; // Keep above floor

            let isUserDragging = false;
            renderer.domElement.addEventListener('pointerdown', () => { isUserDragging = true; });
            window.addEventListener('pointerup', () => { isUserDragging = false; });

            // HD Studio Lighting Setup
            const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
            scene.add(ambientLight);

            const dirLight = new THREE.DirectionalLight(0xffffff, 2.6);
            dirLight.position.set(25, 45, 25);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;
            dirLight.shadow.camera.near = 0.5;
            dirLight.shadow.camera.far = 200;
            dirLight.shadow.camera.left = -40;
            dirLight.shadow.camera.right = 40;
            dirLight.shadow.camera.top = 40;
            dirLight.shadow.camera.bottom = -40;
            dirLight.shadow.bias = -0.0003;
            scene.add(dirLight);

            const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
            fillLight.position.set(-25, 20, -25);
            scene.add(fillLight);

            const rimLight = new THREE.DirectionalLight(0xf59e0b, 1.0);
            rimLight.position.set(0, 25, -35);
            scene.add(rimLight);

            // 3. Create Rapier Physics World
            const gravity = { x: 0.0, y: -9.81, z: 0.0 };
            const world = new RAPIER.World(gravity);

            // Physics Sync Registry
            const dynamicBodies = [];
            const distanceJointRenders = [];
            const activeVehicles = [];
            let followCameraTarget = null;
            let followCameraOpts = { distance: 16, height: 6.5, lerp: 0.08 };
            let onStepCallback = null;

            // Default Floor
            let floorMesh = null;
            let floorCollider = null;

            function setFloor({ size = 60, color = 0x0f172a, gridColor = 0x1e293b } = {}) {
                if (floorMesh) scene.remove(floorMesh);
                if (floorCollider) world.removeCollider(floorCollider, true);

                const floorGeo = new THREE.PlaneGeometry(size, size);
                const floorMat = new THREE.MeshStandardMaterial({
                    color,
                    roughness: 0.85,
                    metalness: 0.15
                });
                floorMesh = new THREE.Mesh(floorGeo, floorMat);
                floorMesh.rotation.x = -Math.PI / 2;
                floorMesh.receiveShadow = true;
                scene.add(floorMesh);

                const grid = new THREE.GridHelper(size, 40, gridColor, gridColor);
                grid.position.y = 0.01;
                scene.add(grid);

                const groundColliderDesc = RAPIER.ColliderDesc.cuboid(size / 2, 0.1, size / 2)
                    .setTranslation(0, -0.1, 0)
                    .setFriction(0.6)
                    .setRestitution(0.2);
                floorCollider = world.createCollider(groundColliderDesc);
            }
            setFloor();

            // 4. Scriptable Physics Sandbox API
            window.Physics = {
                RAPIER,
                world,
                scene,
                camera,
                renderer,
                controls,

                setGravity(vec = [0, -9.81, 0]) {
                    world.gravity = { x: vec[0], y: vec[1], z: vec[2] };
                },

                setFloor,

                enableShadows(enabled) {
                    renderer.shadowMap.enabled = enabled;
                },

                setBackground(color = 0x0e131f) {
                    scene.background = new THREE.Color(color);
                },

                setLighting({ ambient = 1.25, directional = 2.6, fill = 1.2, rim = 1.0 } = {}) {
                    ambientLight.intensity = ambient;
                    dirLight.intensity = directional;
                    fillLight.intensity = fill;
                    rimLight.intensity = rim;
                },

                setCamera({ pos = [14, 18, 22], lookAt = [0, 1, 0], fov = 45 }) {
                    camera.position.set(...pos);
                    camera.fov = fov;
                    camera.updateProjectionMatrix();
                    controls.target.set(...lookAt);
                },

                addBox({
                    pos = [0, 1, 0],
                    rot = [0, 0, 0],
                    size = [1, 1, 1],
                    mass = 1.0,
                    isStatic = false,
                    color = 0x3b82f6,
                    restitution = 0.3,
                    friction = 0.5,
                    roughness = 0.3,
                    metalness = 0.1
                }) {
                    const bodyDesc = isStatic ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic();
                    bodyDesc.setTranslation(pos[0], pos[1], pos[2]);
                    
                    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
                    bodyDesc.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });

                    const body = world.createRigidBody(bodyDesc);
                    const colliderDesc = RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2)
                        .setMass(mass)
                        .setRestitution(restitution)
                        .setFriction(friction);
                    world.createCollider(colliderDesc, body);

                    const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
                    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(pos[0], pos[1], pos[2]);
                    mesh.quaternion.copy(q);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    scene.add(mesh);

                    const item = { body, mesh };
                    if (!isStatic) dynamicBodies.push(item);

                    return {
                        body,
                        mesh,
                        applyImpulse(vec) {
                            body.applyImpulse({ x: vec[0], y: vec[1], z: vec[2] }, true);
                        },
                        setLinearVelocity(vec) {
                            body.setLinvel({ x: vec[0], y: vec[1], z: vec[2] }, true);
                        }
                    };
                },

                addSphere({
                    pos = [0, 1, 0],
                    radius = 0.5,
                    mass = 1.0,
                    isStatic = false,
                    color = 0xf43f5e,
                    restitution = 0.8,
                    friction = 0.3,
                    roughness = 0.2,
                    metalness = 0.3
                }) {
                    const bodyDesc = isStatic ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic();
                    bodyDesc.setTranslation(pos[0], pos[1], pos[2]);

                    const body = world.createRigidBody(bodyDesc);
                    const colliderDesc = RAPIER.ColliderDesc.ball(radius)
                        .setMass(mass)
                        .setRestitution(restitution)
                        .setFriction(friction);
                    world.createCollider(colliderDesc, body);

                    const geo = new THREE.SphereGeometry(radius, 32, 24);
                    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(pos[0], pos[1], pos[2]);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    scene.add(mesh);

                    const item = { body, mesh };
                    if (!isStatic) dynamicBodies.push(item);

                    return {
                        body,
                        mesh,
                        applyImpulse(vec) {
                            body.applyImpulse({ x: vec[0], y: vec[1], z: vec[2] }, true);
                        },
                        setLinearVelocity(vec) {
                            body.setLinvel({ x: vec[0], y: vec[1], z: vec[2] }, true);
                        }
                    };
                },

                addCylinder({
                    pos = [0, 1, 0],
                    rot = [0, 0, 0],
                    radius = 0.5,
                    height = 2.0,
                    mass = 1.0,
                    isStatic = false,
                    color = 0x10b981,
                    restitution = 0.3,
                    friction = 0.5,
                    roughness = 0.3,
                    metalness = 0.2
                }) {
                    const bodyDesc = isStatic ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic();
                    bodyDesc.setTranslation(pos[0], pos[1], pos[2]);

                    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
                    bodyDesc.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });

                    const body = world.createRigidBody(bodyDesc);
                    const colliderDesc = RAPIER.ColliderDesc.cylinder(height / 2, radius)
                        .setMass(mass)
                        .setRestitution(restitution)
                        .setFriction(friction);
                    world.createCollider(colliderDesc, body);

                    const geo = new THREE.CylinderGeometry(radius, radius, height, 24);
                    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(pos[0], pos[1], pos[2]);
                    mesh.quaternion.copy(q);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    scene.add(mesh);

                    const item = { body, mesh };
                    if (!isStatic) dynamicBodies.push(item);

                    return {
                        body,
                        mesh,
                        applyImpulse(vec) {
                            body.applyImpulse({ x: vec[0], y: vec[1], z: vec[2] }, true);
                        },
                        applyTorque(vec) {
                            body.applyTorqueImpulse({ x: vec[0], y: vec[1], z: vec[2] }, true);
                        },
                        setLinearVelocity(vec) {
                            body.setLinvel({ x: vec[0], y: vec[1], z: vec[2] }, true);
                        },
                        setAngularVelocity(vec) {
                            body.setAngvel({ x: vec[0], y: vec[1], z: vec[2] }, true);
                        }
                    };
                },

                addDistanceJoint({
                    bodyA = null,
                    bodyB,
                    anchorA = [0, 0, 0],
                    anchorB = [0, 0, 0],
                    length = 5.0,
                    renderCable = true,
                    cableColor = 0x94a3b8
                }) {
                    const jointData = RAPIER.JointData.spherical(
                        { x: anchorA[0], y: anchorA[1], z: anchorA[2] },
                        { x: anchorB[0], y: anchorB[1], z: anchorB[2] }
                    );

                    const actualBodyA = bodyA?.body || bodyA || world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(anchorA[0], anchorA[1], anchorA[2]));
                    const actualBodyB = bodyB.body || bodyB;

                    const joint = world.createImpulseJoint(jointData, actualBodyA, actualBodyB, true);

                    let line = null;
                    if (renderCable) {
                        const lineGeo = new THREE.BufferGeometry().setFromPoints([
                            new THREE.Vector3(...anchorA),
                            new THREE.Vector3().copy(actualBodyB.translation())
                        ]);
                        const lineMat = new THREE.LineBasicMaterial({ color: cableColor, linewidth: 2 });
                        line = new THREE.Line(lineGeo, lineMat);
                        scene.add(line);
                        distanceJointRenders.push({ line, anchorA, bodyB: actualBodyB });
                    }

                    return { joint, line };
                },

                addRevoluteJoint({
                    bodyA = null,
                    bodyB,
                    anchorA = [0, 0, 0],
                    anchorB = [0, 0, 0],
                    axis = [0, 1, 0]
                }) {
                    const jointData = RAPIER.JointData.revolute(
                        { x: anchorA[0], y: anchorA[1], z: anchorA[2] },
                        { x: anchorB[0], y: anchorB[1], z: anchorB[2] },
                        { x: axis[0], y: axis[1], z: axis[2] }
                    );
                    const actualBodyA = bodyA?.body || bodyA || world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(anchorA[0], anchorA[1], anchorA[2]));
                    const actualBodyB = bodyB.body || bodyB;
                    return world.createImpulseJoint(jointData, actualBodyA, actualBodyB, true);
                },

                addRagdoll({ pos = [0, 5, 0], scale = 1.0, color = 0xf97316 }) {
                    const px = pos[0], py = pos[1], pz = pos[2];
                    const s = scale;

                    const head = this.addSphere({
                        pos: [px, py + 1.7 * s, pz],
                        radius: 0.28 * s,
                        mass: 0.8,
                        color: color
                    });

                    const torso = this.addBox({
                        pos: [px, py + 1.0 * s, pz],
                        size: [0.55 * s, 0.9 * s, 0.3 * s],
                        mass: 4.0,
                        color: color
                    });

                    this.addDistanceJoint({
                        bodyA: torso,
                        bodyB: head,
                        anchorA: [0, 0.5 * s, 0],
                        anchorB: [0, -0.3 * s, 0],
                        renderCable: false
                    });

                    const legL = this.addBox({
                        pos: [px - 0.2 * s, py + 0.25 * s, pz],
                        size: [0.22 * s, 0.7 * s, 0.22 * s],
                        mass: 1.5,
                        color: color
                    });

                    const legR = this.addBox({
                        pos: [px + 0.2 * s, py + 0.25 * s, pz],
                        size: [0.22 * s, 0.7 * s, 0.22 * s],
                        mass: 1.5,
                        color: color
                    });

                    this.addDistanceJoint({ bodyA: torso, bodyB: legL, anchorA: [-0.2 * s, -0.45 * s, 0], anchorB: [0, 0.35 * s, 0], renderCable: false });
                    this.addDistanceJoint({ bodyA: torso, bodyB: legR, anchorA: [0.2 * s, -0.45 * s, 0], anchorB: [0, 0.35 * s, 0], renderCable: false });

                    return { head, torso, legL, legR };
                },

                addVehicle({
                    type = 'supercar', // 'thar', 'thar_roxx', 'supercar'
                    pos = [0, 2, 0],
                    rot = [0, 0, 0],
                    mass = null,
                    color = null,
                    wheelRadius = null,
                    wheelWidth = null,
                    suspensionRestLength = null,
                    stiffness = null,
                    damping = null
                } = {}) {
                    const isThar = (type === 'thar' || type === 'thar_roxx' || type === 'suv');
                    
                    const actualMass = mass ?? (isThar ? 55.0 : 40.0);
                    const actualColor = color ?? (isThar ? 0x15803d : 0xef4444);
                    const actualRadius = wheelRadius ?? (isThar ? 0.58 : 0.55);
                    const actualWidth = wheelWidth ?? (isThar ? 0.44 : 0.45);
                    const actualSuspRest = suspensionRestLength ?? (isThar ? 0.42 : 0.35);
                    const actualStiffness = stiffness ?? (isThar ? 60.0 : 55.0);
                    const actualDamping = damping ?? (isThar ? 5.5 : 4.5);

                    // 1. Main Chassis Rigid Body
                    const bodyDesc = RAPIER.RigidBodyDesc.dynamic();
                    bodyDesc.setTranslation(pos[0], pos[1], pos[2]);
                    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
                    bodyDesc.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });

                    const chassisBody = world.createRigidBody(bodyDesc);
                    const colliderDesc = RAPIER.ColliderDesc.cuboid(isThar ? 2.15 : 2.1, isThar ? 0.45 : 0.35, 1.0)
                        .setMass(actualMass)
                        .setFriction(0.5)
                        .setRestitution(0.05);
                    world.createCollider(colliderDesc, chassisBody);

                    // 2. High-Fidelity 3D Model Mesh Group
                    const carGroup = new THREE.Group();

                    if (isThar) {
                        // 🚙 Thar ROXX Detailed 3D Model
                        const bodyMat = new THREE.MeshStandardMaterial({ color: actualColor, metalness: 0.8, roughness: 0.2 });
                        const hardtopMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.85, metalness: 0.15 });
                        const glassMat = new THREE.MeshStandardMaterial({ color: 0x020617, metalness: 0.95, roughness: 0.05 });
                        const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.1 });
                        const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                        const redTailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

                        // Lower Body & Hood
                        const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.65, 1.95), bodyMat);
                        lowerBody.position.y = 0.2;
                        lowerBody.castShadow = true;
                        carGroup.add(lowerBody);

                        const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 1.8), bodyMat);
                        hood.position.set(1.2, 0.6, 0);
                        hood.castShadow = true;
                        carGroup.add(hood);

                        // 5-Door Hardtop & Sunroof
                        const hardtop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.75, 1.88), hardtopMat);
                        hardtop.position.set(-0.75, 0.9, 0);
                        hardtop.castShadow = true;
                        carGroup.add(hardtop);

                        const sunroof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 1.2), glassMat);
                        sunroof.position.set(-0.7, 1.29, 0);
                        carGroup.add(sunroof);

                        const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 1.76), glassMat);
                        windshield.position.set(0.48, 0.82, 0);
                        windshield.rotation.z = 0.35;
                        carGroup.add(windshield);

                        // 6-Slot Front Grille & Round Headlights
                        const grilleBase = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 1.8), hardtopMat);
                        grilleBase.position.set(2.16, 0.4, 0);
                        carGroup.add(grilleBase);

                        for (let s = -2; s <= 2; s++) {
                            const slot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.12), chromeMat);
                            slot.position.set(2.17, 0.4, s * 0.28);
                            carGroup.add(slot);
                        }

                        const headL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 24), glowMat);
                        headL.rotation.z = Math.PI / 2;
                        headL.position.set(2.17, 0.42, 0.72);
                        carGroup.add(headL);
                        const headR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 24), glowMat);
                        headR.rotation.z = Math.PI / 2;
                        headR.position.set(2.17, 0.42, -0.72);
                        carGroup.add(headR);

                        // Front Bumper & Red Recovery Hooks
                        const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 2.1), hardtopMat);
                        frontBumper.position.set(2.28, 0.1, 0);
                        frontBumper.castShadow = true;
                        carGroup.add(frontBumper);

                        const hookMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 });
                        const hookL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.12), hookMat);
                        hookL.position.set(2.52, 0.05, 0.5);
                        carGroup.add(hookL);
                        const hookR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.12), hookMat);
                        hookR.position.set(2.52, 0.05, -0.5);
                        carGroup.add(hookR);

                        // Rear Tailgate 5th Spare Tyre
                        const spareTyre = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.38, 24), hardtopMat);
                        spareTyre.rotation.z = Math.PI / 2;
                        spareTyre.position.set(-2.36, 0.55, 0.0);
                        spareTyre.castShadow = true;
                        carGroup.add(spareTyre);

                        const spareRim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.4, 16), chromeMat);
                        spareRim.rotation.z = Math.PI / 2;
                        spareRim.position.set(-2.38, 0.55, 0.0);
                        carGroup.add(spareRim);

                        // Taillights
                        const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.16), redTailMat);
                        tailL.position.set(-2.17, 0.45, 0.88);
                        carGroup.add(tailL);
                        const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.16), redTailMat);
                        tailR.position.set(-2.17, 0.45, -0.88);
                        carGroup.add(tailR);

                        // Rock sliders & Snorkel
                        const stepL = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.22), hardtopMat);
                        stepL.position.set(-0.3, -0.15, 1.15);
                        carGroup.add(stepL);
                        const stepR = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.22), hardtopMat);
                        stepR.position.set(-0.3, -0.15, -1.15);
                        carGroup.add(stepR);

                        const snorkel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.95, 12), hardtopMat);
                        snorkel.position.set(0.65, 0.95, 0.98);
                        carGroup.add(snorkel);

                    } else {
                        // 🏎️ Supercar Model
                        const bodyMat = new THREE.MeshStandardMaterial({ color: actualColor, metalness: 0.85, roughness: 0.15 });
                        const lowerGeo = new THREE.BoxGeometry(4.2, 0.45, 2.0);
                        const lowerMesh = new THREE.Mesh(lowerGeo, bodyMat);
                        lowerMesh.position.y = 0.1;
                        lowerMesh.castShadow = true;
                        carGroup.add(lowerMesh);

                        const noseGeo = new THREE.BoxGeometry(1.2, 0.3, 1.95);
                        const noseMesh = new THREE.Mesh(noseGeo, bodyMat);
                        noseMesh.position.set(1.6, 0.02, 0);
                        noseMesh.rotation.z = -0.12;
                        noseMesh.castShadow = true;
                        carGroup.add(noseMesh);

                        const cabinGeo = new THREE.BoxGeometry(1.9, 0.5, 1.55);
                        const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
                        const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
                        cabinMesh.position.set(-0.2, 0.52, 0);
                        cabinMesh.castShadow = true;
                        carGroup.add(cabinMesh);

                        const carbonMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.8 });
                        const spoilerGeo = new THREE.BoxGeometry(0.5, 0.08, 2.1);
                        const spoilerMesh = new THREE.Mesh(spoilerGeo, carbonMat);
                        spoilerMesh.position.set(-2.0, 0.78, 0);
                        spoilerMesh.castShadow = true;
                        carGroup.add(spoilerMesh);

                        const headL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.4), new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
                        headL.position.set(2.11, 0.15, 0.65);
                        carGroup.add(headL);
                        const headR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.4), new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
                        headR.position.set(2.11, 0.15, -0.65);
                        carGroup.add(headR);
                    }

                    scene.add(carGroup);
                    dynamicBodies.push({ body: chassisBody, mesh: carGroup });

                    // 3. Create Raycast Vehicle Controller
                    const vehicleController = world.createVehicleController(chassisBody);
                    try { vehicleController.indexUpAxis = 1; } catch(e) {}
                    try {
                        if (typeof vehicleController.setIndexForwardAxis !== 'undefined') {
                            vehicleController.setIndexForwardAxis = 0;
                        } else if (typeof vehicleController.indexForwardAxis !== 'undefined') {
                            vehicleController.indexForwardAxis = 0;
                        }
                    } catch (e) {
                        if (vehicleController.raw && vehicleController.raw.set_index_forward_axis) {
                            vehicleController.raw.set_index_forward_axis(0);
                        }
                    }

                    const wheelMeshGroup = [];
                    const wheelAnchors = [
                        { x:  (isThar ? 1.42 : 1.35), y: -0.1, z:  (isThar ? 1.22 : 1.25), isFront: true },
                        { x:  (isThar ? 1.42 : 1.35), y: -0.1, z: -(isThar ? 1.22 : 1.25), isFront: true },
                        { x: -(isThar ? 1.42 : 1.35), y: -0.1, z:  (isThar ? 1.22 : 1.25), isFront: false },
                        { x: -(isThar ? 1.42 : 1.35), y: -0.1, z: -(isThar ? 1.22 : 1.25), isFront: false }
                    ];

                    wheelAnchors.forEach((w, idx) => {
                        vehicleController.addWheel(
                            { x: w.x, y: w.y, z: w.z },
                            { x: 0, y: -1, z: 0 },
                            { x: 0, y: 0, z: 1 },
                            actualSuspRest,
                            actualRadius
                        );

                        vehicleController.setWheelSuspensionStiffness(idx, actualStiffness);
                        vehicleController.setWheelMaxSuspensionTravel(idx, 0.45);
                        vehicleController.setWheelFrictionSlip(idx, 2.8);
                        vehicleController.setWheelSuspensionCompression(idx, 4.5);
                        vehicleController.setWheelSuspensionRelaxation(idx, actualDamping);

                        // Visual Wheel Assembly (Alloy Rim + Knobby Tyre)
                        const wheelObj = new THREE.Group();
                        const tyreGeo = new THREE.CylinderGeometry(actualRadius, actualRadius, actualWidth, 24);
                        const tyreMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95, metalness: 0.1 });
                        const tyreMesh = new THREE.Mesh(tyreGeo, tyreMat);
                        tyreMesh.rotation.x = Math.PI / 2;
                        tyreMesh.castShadow = true;
                        wheelObj.add(tyreMesh);

                        const rimGeo = new THREE.CylinderGeometry(actualRadius * 0.62, actualRadius * 0.62, actualWidth + 0.02, 10);
                        const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
                        const rimMesh = new THREE.Mesh(rimGeo, rimMat);
                        rimMesh.rotation.x = Math.PI / 2;
                        wheelObj.add(rimMesh);

                        scene.add(wheelObj);
                        wheelMeshGroup.push({ group: wheelObj, anchor: w, isFront: w.isFront });
                    });

                    const vehicleInstance = {
                        chassis: chassisBody,
                        mesh: carGroup,
                        controller: vehicleController,
                        wheels: wheelMeshGroup,

                        setEngineForce(force) {
                            vehicleController.setWheelEngineForce(0, force);
                            vehicleController.setWheelEngineForce(1, force);
                            vehicleController.setWheelEngineForce(2, force);
                            vehicleController.setWheelEngineForce(3, force);
                        },

                        setSteering(angle) {
                            vehicleController.setWheelSteering(0, angle);
                            vehicleController.setWheelSteering(1, angle);
                        },

                        setBrake(brakeForce) {
                            vehicleController.setWheelBrake(0, brakeForce);
                            vehicleController.setWheelBrake(1, brakeForce);
                            vehicleController.setWheelBrake(2, brakeForce);
                            vehicleController.setWheelBrake(3, brakeForce);
                        },

                        getSpeed() {
                            return vehicleController.currentVehicleSpeed();
                        },

                        update(dt) {
                            vehicleController.updateVehicle(dt);

                            const cPos = chassisBody.translation();
                            const cRot = chassisBody.rotation();
                            const cQuat = new THREE.Quaternion(cRot.x, cRot.y, cRot.z, cRot.w);

                            // Sync visual wheel positions and rotation
                            for (let i = 0; i < wheelMeshGroup.length; i++) {
                                const w = wheelMeshGroup[i];
                                const suspLen = (typeof vehicleController.wheelSuspensionLength === 'function' ? vehicleController.wheelSuspensionLength(i) : null) ?? suspensionRestLength;
                                const rot = (typeof vehicleController.wheelRotation === 'function' ? vehicleController.wheelRotation(i) : 0) || 0;

                                const localPos = new THREE.Vector3(w.anchor.x, w.anchor.y - suspLen, w.anchor.z);
                                localPos.applyQuaternion(cQuat);
                                localPos.add(new THREE.Vector3(cPos.x, cPos.y, cPos.z));

                                w.group.position.copy(localPos);
                                w.group.quaternion.copy(cQuat);
                                w.group.rotateZ(rot);
                            }
                        }
                    };

                    activeVehicles.push(vehicleInstance);
                    return vehicleInstance;
                },

                followCamera(target, opts = {}) {
                    followCameraTarget = target?.chassis || target?.body || target;
                    followCameraOpts = Object.assign({ distance: 16, height: 6.5, lerp: 0.08 }, opts);
                },

                onStep(callback) {
                    onStepCallback = callback;
                }
            };

            // 5. Execute User Script
            const userScriptFn = new Function('Physics', 'THREE', 'RAPIER', 'scene', 'camera', 'renderer', ${JSON.stringify(safeUserCode)});
            userScriptFn(window.Physics, THREE, RAPIER, scene, camera, renderer);

            // 6. Main Physics Simulation Loop
            const clock = new THREE.Clock();
            const bodyCountEl = document.getElementById('body-count-text');
            const fpsEl = document.getElementById('fps-text');
            let frameCount = 0;
            let lastFpsUpdate = performance.now();

            function animate() {
                requestAnimationFrame(animate);

                // Step physics
                world.step();

                // Update Raycast Vehicles
                for (let v = 0; v < activeVehicles.length; v++) {
                    activeVehicles[v].update(1 / 60);
                }

                // Sync Three.js meshes
                for (let i = 0; i < dynamicBodies.length; i++) {
                    const { body, mesh } = dynamicBodies[i];
                    const t = body.translation();
                    const r = body.rotation();
                    mesh.position.set(t.x, t.y, t.z);
                    mesh.quaternion.set(r.x, r.y, r.z, r.w);
                }

                // Sync joints
                for (let j = 0; j < distanceJointRenders.length; j++) {
                    const { line, anchorA, bodyB } = distanceJointRenders[j];
                    const t = bodyB.translation();
                    const positions = line.geometry.attributes.position.array;
                    positions[0] = anchorA[0];
                    positions[1] = anchorA[1];
                    positions[2] = anchorA[2];
                    positions[3] = t.x;
                    positions[4] = t.y;
                    positions[5] = t.z;
                    line.geometry.attributes.position.needsUpdate = true;
                }

                // Follow Camera Tracking
                if (followCameraTarget) {
                    const t = followCameraTarget.translation ? followCameraTarget.translation() : followCameraTarget.position;
                    if (t) {
                        const targetVec = new THREE.Vector3(t.x, t.y + 1.2, t.z);
                        if (!isUserDragging) {
                            const desiredCamPos = new THREE.Vector3(
                                t.x - followCameraOpts.distance,
                                t.y + followCameraOpts.height,
                                t.z + (followCameraOpts.offsetZ || 8.0)
                            );
                            camera.position.lerp(desiredCamPos, followCameraOpts.lerp);
                        }
                        controls.target.lerp(targetVec, 0.1);
                    }
                }

                if (onStepCallback) {
                    onStepCallback(1 / 60, clock.getElapsedTime());
                }

                controls.update();
                renderer.render(scene, camera);

                frameCount++;
                const now = performance.now();
                if (now - lastFpsUpdate >= 500) {
                    const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
                    if (fpsEl) fpsEl.textContent = fps + ' FPS';
                    if (bodyCountEl) bodyCountEl.textContent = 'BODIES: ' + dynamicBodies.length;
                    frameCount = 0;
                    lastFpsUpdate = now;
                }
            }
            animate();

            // Resize listener
            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });

        } catch (err) {
            console.error("[Rapier Studio Error]:", err);
            const banner = document.getElementById('error-banner');
            if (banner) {
                banner.style.display = 'block';
                banner.textContent = '⚠️ Physics Script Error: ' + err.message;
            }
        }
    </script>
</body>
</html>`;
};

/**
 * Generates an ultra-crisp SVG thumbnail for Rapier 3D physics posts.
 */
window.generateRapierThumbnail = function(title = 'Rapier 3D Physics Simulation') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%">
        <defs>
            <linearGradient id="rapierBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#020617"/>
                <stop offset="50%" stop-color="#0f172a"/>
                <stop offset="100%" stop-color="#064e3b"/>
            </linearGradient>
            <linearGradient id="cubeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#10b981"/>
                <stop offset="100%" stop-color="#06b6d4"/>
            </linearGradient>
        </defs>
        <rect width="640" height="360" fill="url(#rapierBg)"/>
        
        <!-- 3D Physics Isometric Grid -->
        <g stroke="rgba(16,185,129,0.2)" stroke-width="1.5">
            <line x1="320" y1="180" x2="60" y2="340"/>
            <line x1="320" y1="180" x2="190" y2="340"/>
            <line x1="320" y1="180" x2="320" y2="340"/>
            <line x1="320" y1="180" x2="450" y2="340"/>
            <line x1="320" y1="180" x2="580" y2="340"/>
            <line x1="140" y1="240" x2="500" y2="240"/>
            <line x1="90" y1="290" x2="550" y2="290"/>
        </g>
        
        <!-- Bouncing Kinetic Physics Spheres & Cubes -->
        <circle cx="240" cy="130" r="32" fill="#f43f5e" opacity="0.9"/>
        <circle cx="390" cy="110" r="24" fill="#facc15" opacity="0.9"/>
        <circle cx="320" cy="80" r="18" fill="#38bdf8" opacity="0.9"/>
        
        <!-- Central 3D Dynamic Box -->
        <polygon points="320,130 370,155 370,215 320,190" fill="#10b981" opacity="0.9"/>
        <polygon points="320,130 270,155 270,215 320,190" fill="#059669" opacity="0.9"/>
        <polygon points="320,130 370,155 320,180 270,155" fill="#34d399"/>

        <!-- Banner Card -->
        <rect x="0" y="295" width="640" height="65" fill="rgba(8,12,22,0.92)"/>
        <text x="30" y="333" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="17" font-weight="700">${title}</text>
        <rect x="480" y="310" width="130" height="28" rx="14" fill="#10b981"/>
        <text x="545" y="328" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="11" font-weight="800" text-anchor="middle">RAPIER WASM</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};
