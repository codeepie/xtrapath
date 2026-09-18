/**
 * ResearchLab & Experiment Editor Controller (research_editor_script.js)
 * --------------------------------------------------------------------------
 * Powers the studio environment for creating, tuning, testing, and publishing
 * interactive STEM research labs and hypotheses for XtraPath.
 */

(function (window, document) {
    'use strict';

    // Built-in starter templates for research simulations
    const STARTER_TEMPLATES = {
        projectile: `// --- 2D Kinematics Projectile Motion with Dynamic Air Drag ---
// Available parameters: velocity, angle, dragCoeff, gravity
// Canvas dimensions: windowWidth, windowHeight

let projectile = { x: 60, y: 0, vx: 0, vy: 0, history: [] };
let isLaunched = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  resetSimulation();
}

function resetSimulation() {
  const rad = radians(params.angle || 45);
  const v = params.velocity || 45;
  projectile.x = 60;
  projectile.y = height - 70;
  projectile.vx = v * cos(rad) * 0.45;
  projectile.vy = -v * sin(rad) * 0.45;
  projectile.history = [];
  isLaunched = true;
}

function draw() {
  background(6, 8, 18);

  // Ground Grid
  stroke(255, 255, 255, 30);
  strokeWeight(1);
  line(40, height - 70, width - 40, height - 70);

  // Trajectory Path History
  noFill();
  stroke(99, 102, 241, 190);
  strokeWeight(2.5);
  beginShape();
  for (let pt of projectile.history) {
    vertex(pt.x, pt.y);
  }
  endShape();

  // Physics Step
  if (isLaunched) {
    projectile.history.push({ x: projectile.x, y: projectile.y });
    projectile.x += projectile.vx;
    projectile.y += projectile.vy;
    
    // Gravity & Quadratic Air Drag
    const g = params.gravity || 9.81;
    const k = params.dragCoeff !== undefined ? params.dragCoeff : 0.06;
    projectile.vy += g * 0.02;
    projectile.vx *= (1 - k * 0.05);

    if (projectile.y >= height - 70) {
      projectile.y = height - 70;
      isLaunched = false;
    }
  }

  // Draw Projectile
  fill(6, 182, 212);
  stroke(255, 255, 255, 200);
  strokeWeight(2);
  circle(projectile.x, projectile.y, 14);
}

function mousePressed() {
  resetSimulation();
}`,

        optics: `// --- Young's Double Slit Wave Optics & Quantum Interference ---
// Available parameters: wavelength, slitDistance, screenDistance

let phase = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(5, 7, 14);

  const lambda = params.wavelength || 632;
  const d = (params.slitDistance || 0.25) * 120;
  const D = params.screenDistance || 1.5;

  const cx = width * 0.45;
  const cy = height / 2;
  const slitX = width * 0.22;
  const screenX = width * 0.82;

  // Slits Barrier
  stroke(100, 116, 139);
  strokeWeight(3);
  line(slitX, 0, slitX, cy - d / 2 - 8);
  line(slitX, cy - d / 2 + 8, slitX, cy + d / 2 - 8);
  line(slitX, cy + d / 2 + 8, slitX, height);

  // Laser Source Color
  let r = 239, g = 68, b = 68;
  if (lambda < 490) { r = 59; g = 130; b = 246; }
  else if (lambda < 570) { r = 16; g = 185; b = 129; }
  else if (lambda < 600) { r = 245; g = 158; b = 11; }

  // Screen Interference Pattern
  strokeWeight(1.5);
  for (let y = 30; y < height - 30; y += 3) {
    const deltaY = y - cy;
    const beta = (PI * d * deltaY) / (lambda * 0.15 * D);
    const intensity = sq(cos(beta));

    stroke(r, g, b, intensity * 240);
    line(screenX, y, screenX + intensity * 65, y);
  }

  // Wavefront propagation
  phase += 0.8;
  stroke(r, g, b, 50);
  strokeWeight(1);
  noFill();
  for (let rad = (phase % 18); rad < screenX - slitX; rad += 18) {
    arc(slitX, cy - d / 2, rad * 2, rad * 2, -PI / 2.5, PI / 2.5);
    arc(slitX, cy + d / 2, rad * 2, rad * 2, -PI / 2.5, PI / 2.5);
  }

  // Detector Screen line
  stroke(148, 163, 184, 120);
  strokeWeight(2);
  line(screenX, 20, screenX, height - 20);
}`,

        harmonic: `// --- Damped Harmonic Oscillator Phase Space Simulator ---
// Available parameters: mass, springConstant, damping

let pos = 100;
let vel = 0;
let history = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(8, 10, 20);

  const m = params.mass || 1.0;
  const k = params.springConstant || 5.0;
  const c = params.damping !== undefined ? params.damping : 0.08;

  // Spring & Damping force
  const fSpring = -k * pos;
  const fDamp = -c * vel;
  const accel = (fSpring + fDamp) / m;

  vel += accel * 0.3;
  pos += vel * 0.3;

  history.push(pos);
  if (history.length > width - 180) history.shift();

  // Draw Equilibrium Line
  stroke(255, 255, 255, 30);
  line(50, height / 2, width - 50, height / 2);

  // Oscillation Waveform
  noFill();
  stroke(6, 182, 212);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < history.length; i++) {
    vertex(120 + i, height / 2 + history[i]);
  }
  endShape();

  // Oscillating Mass
  fill(244, 63, 94);
  stroke(255, 255, 255, 180);
  strokeWeight(2);
  circle(80, height / 2 + pos, 24);
}
function mousePressed() {
  pos = 110;
  vel = 0;
}`,

        matter_pendulum: `// --- Matter.js: Double Pendulum Chaotic Dynamics ---
// Parameters: gravity, length1, length2, damping
const { Engine, Render, Runner, Bodies, Composite, Constraint } = Matter;

const engine = Engine.create();
engine.gravity.y = params.gravity !== undefined ? params.gravity : 1.0;

const render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    width: window.innerWidth,
    height: window.innerHeight,
    wireframes: false,
    background: '#060813'
  }
});
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

const cx = window.innerWidth / 2;
const cy = window.innerHeight * 0.22;
const l1 = params.length1 || 120;
const l2 = params.length2 || 100;

const bob1 = Bodies.circle(cx + l1, cy, 14, { frictionAir: params.damping !== undefined ? params.damping : 0.001, render: { fillStyle: '#38bdf8' } });
const bob2 = Bodies.circle(cx + l1 + l2, cy, 12, { frictionAir: params.damping !== undefined ? params.damping : 0.001, render: { fillStyle: '#f43f5e' } });

const link1 = Constraint.create({ pointA: { x: cx, y: cy }, bodyB: bob1, stiffness: 1.0, render: { strokeStyle: '#64748b', lineWidth: 3 } });
const link2 = Constraint.create({ bodyA: bob1, bodyB: bob2, stiffness: 1.0, render: { strokeStyle: '#64748b', lineWidth: 2.5 } });

Composite.add(engine.world, [bob1, bob2, link1, link2]);

window.onParamsChange = function(newParams) {
  engine.gravity.y = newParams.gravity !== undefined ? newParams.gravity : 1.0;
  bob1.frictionAir = newParams.damping !== undefined ? newParams.damping : 0.001;
  bob2.frictionAir = newParams.damping !== undefined ? newParams.damping : 0.001;
};`,

        matter_collision: `// --- Matter.js: Momentum Conservation & Collision Restitution ---
// Parameters: restitution, massA, massB, initialVelocity
const { Engine, Render, Runner, Bodies, Composite, Body } = Matter;

const engine = Engine.create();
engine.gravity.y = 0; // Frictionless air table

const render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    width: window.innerWidth,
    height: window.innerHeight,
    wireframes: false,
    background: '#060813'
  }
});
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

const cy = window.innerHeight / 2;
const w = window.innerWidth;

// Side barriers
const wallL = Bodies.rectangle(10, cy, 20, window.innerHeight, { isStatic: true, render: { fillStyle: '#1e293b' } });
const wallR = Bodies.rectangle(w - 10, cy, 20, window.innerHeight, { isStatic: true, render: { fillStyle: '#1e293b' } });

// Elastic pucks
const puckA = Bodies.circle(w * 0.25, cy, 24, {
  restitution: params.restitution || 0.9,
  friction: 0,
  frictionAir: 0,
  mass: params.massA || 2.0,
  render: { fillStyle: '#38bdf8' }
});
const puckB = Bodies.circle(w * 0.65, cy, 30, {
  restitution: params.restitution || 0.9,
  friction: 0,
  frictionAir: 0,
  mass: params.massB || 4.0,
  render: { fillStyle: '#10b981' }
});

Composite.add(engine.world, [wallL, wallR, puckA, puckB]);
Body.setVelocity(puckA, { x: params.initialVelocity || 8, y: 0 });

window.onParamsChange = function(newParams) {
  puckA.restitution = newParams.restitution !== undefined ? newParams.restitution : 0.9;
  puckB.restitution = newParams.restitution !== undefined ? newParams.restitution : 0.9;
};`,

        three_orbit: `// --- Three.js: 3D Planetary Gravitational Orbit ---
// Parameters: orbitRadius, orbitalSpeed, tiltAngle
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060813);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 50, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const grid = new THREE.GridHelper(160, 20, 0x1e293b, 0x0f172a);
scene.add(grid);

// Central Star
const sunGeo = new THREE.SphereGeometry(7, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Orbiting Planet
const planetGeo = new THREE.SphereGeometry(3.5, 24, 24);
const planetMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
const planet = new THREE.Mesh(planetGeo, planetMat);
scene.add(planet);

// Orbit path ring
const orbitRadius = params.orbitRadius || 45;
const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius * 0.85);
const orbitPoints = orbitCurve.getPoints(64);
const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y)));
const orbitLine = new THREE.Line(orbitGeo, new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.6 }));
scene.add(orbitLine);

let angle = 0;
function animate() {
  requestAnimationFrame(animate);
  const speed = (params.orbitalSpeed || 1.5) * 0.015;
  const rad = params.orbitRadius || 45;
  angle += speed;

  planet.position.x = Math.cos(angle) * rad;
  planet.position.z = Math.sin(angle) * rad * 0.85;
  planet.position.y = Math.sin(angle) * (params.tiltAngle || 5);

  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});`,

        three_refraction: `// --- Three.js: 3D Snell's Law Optical Refraction ---
// Parameters: refractiveIndex, incidentAngle
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060813);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 25, 65);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Glass Prism Block
const prismGeo = new THREE.BoxGeometry(30, 20, 10);
const prismMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.35 });
const prism = new THREE.Mesh(prismGeo, prismMat);
scene.add(prism);

const edges = new THREE.LineSegments(new THREE.EdgesGeometry(prismGeo), new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
scene.add(edges);

// Incoming & Refracted Laser Beam
const beamMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 3 });
const beamGeo = new THREE.BufferGeometry();
const beamLine = new THREE.Line(beamGeo, beamMat);
scene.add(beamLine);

function updateRay() {
  const theta1 = (params.incidentAngle || 45) * Math.PI / 180;
  const n2 = params.refractiveIndex || 1.52;
  const sinTheta2 = Math.sin(theta1) / n2;
  const theta2 = Math.asin(Math.min(0.999, sinTheta2));

  const pts = [
    new THREE.Vector3(-25, 25 * Math.tan(theta1), 0),
    new THREE.Vector3(-15, 0, 0),
    new THREE.Vector3(15, -30 * Math.tan(theta2), 0),
    new THREE.Vector3(30, -30 * Math.tan(theta2) - 15 * Math.tan(theta1), 0)
  ];
  beamGeo.setFromPoints(pts);
}
updateRay();
window.onParamsChange = updateRay;

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();`
    };

    // Metadata & parameter schemas for starter presets
    const TEMPLATE_METADATA = {
        projectile: {
            engine: 'p5',
            domain: 'physics',
            domainLabel: '⚡ Physics • 2D Kinematics',
            params: [
                { key: 'velocity', label: 'Launch Velocity', default: 45, min: 10, max: 80, step: 1, unit: 'm/s' },
                { key: 'angle', label: 'Launch Angle', default: 45, min: 15, max: 85, step: 1, unit: '°' },
                { key: 'dragCoeff', label: 'Air Drag (k)', default: 0.06, min: 0.00, max: 0.20, step: 0.01, unit: '' },
                { key: 'gravity', label: 'Gravity (g)', default: 9.81, min: 1.62, max: 24.79, step: 0.1, unit: 'm/s²' }
            ]
        },
        optics: {
            engine: 'p5',
            domain: 'optics',
            domainLabel: '🌈 Optics • Wave Interference',
            params: [
                { key: 'wavelength', label: 'Wavelength (λ)', default: 632, min: 400, max: 700, step: 2, unit: 'nm' },
                { key: 'slitDistance', label: 'Slit Separation (d)', default: 0.25, min: 0.10, max: 1.00, step: 0.05, unit: 'mm' },
                { key: 'screenDistance', label: 'Screen Distance (D)', default: 1.5, min: 0.5, max: 3.0, step: 0.1, unit: 'm' }
            ]
        },
        harmonic: {
            engine: 'p5',
            domain: 'physics',
            domainLabel: '⚙️ Mechanics • Oscillations',
            params: [
                { key: 'mass', label: 'Oscillator Mass (m)', default: 1.0, min: 0.2, max: 5.0, step: 0.1, unit: 'kg' },
                { key: 'springConstant', label: 'Spring Constant (k)', default: 5.0, min: 1.0, max: 20.0, step: 0.5, unit: 'N/m' },
                { key: 'damping', label: 'Damping Coefficient (c)', default: 0.08, min: 0.00, max: 0.50, step: 0.01, unit: 'N·s/m' }
            ]
        },
        matter_pendulum: {
            engine: 'matter',
            domain: 'physics',
            domainLabel: '⚙️ Classical Dynamics • Chaotic Links',
            params: [
                { key: 'gravity', label: 'Gravity Acceleration', default: 1.0, min: 0.0, max: 3.0, step: 0.1, unit: 'g' },
                { key: 'length1', label: 'Arm 1 Length', default: 120, min: 60, max: 200, step: 5, unit: 'px' },
                { key: 'length2', label: 'Arm 2 Length', default: 100, min: 50, max: 180, step: 5, unit: 'px' },
                { key: 'damping', label: 'Air Resistance', default: 0.001, min: 0.000, max: 0.020, step: 0.001, unit: '' }
            ]
        },
        matter_collision: {
            engine: 'matter',
            domain: 'physics',
            domainLabel: '💥 Mechanics • Momentum Conservation',
            params: [
                { key: 'restitution', label: 'Elasticity (Restitution)', default: 0.90, min: 0.00, max: 1.00, step: 0.05, unit: 'e' },
                { key: 'massA', label: 'Puck A Mass', default: 2.0, min: 0.5, max: 10.0, step: 0.5, unit: 'kg' },
                { key: 'massB', label: 'Puck B Mass', default: 4.0, min: 0.5, max: 10.0, step: 0.5, unit: 'kg' },
                { key: 'initialVelocity', label: 'Initial Velocity (v₀)', default: 8.0, min: 2.0, max: 20.0, step: 1.0, unit: 'm/s' }
            ]
        },
        three_orbit: {
            engine: 'three',
            domain: 'astronomy',
            domainLabel: '🪐 Astrophysics • Keplerian Orbits',
            params: [
                { key: 'orbitRadius', label: 'Semi-Major Axis (r)', default: 45, min: 20, max: 80, step: 1, unit: 'AU' },
                { key: 'orbitalSpeed', label: 'Orbital Velocity', default: 1.5, min: 0.2, max: 4.0, step: 0.1, unit: 'v' },
                { key: 'tiltAngle', label: 'Orbital Inclination (i)', default: 5, min: 0, max: 45, step: 1, unit: '°' }
            ]
        },
        three_refraction: {
            engine: 'three',
            domain: 'optics',
            domainLabel: '🌈 3D Optics • Snell\'s Refraction',
            params: [
                { key: 'refractiveIndex', label: 'Refractive Index (n₂)', default: 1.52, min: 1.00, max: 2.42, step: 0.02, unit: 'n' },
                { key: 'incidentAngle', label: 'Incident Angle (θ₁)', default: 45, min: 5, max: 85, step: 1, unit: '°' }
            ]
        }
    };

    function getEngineScriptTags(engine) {
        const closeScript = '<' + '/script>';
        if (engine === 'matter') {
            return '<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js">' + closeScript;
        }
        if (engine === 'three') {
            return '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js">' + closeScript +
                   '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js">' + closeScript;
        }
        if (engine === 'canvas') {
            return '';
        }
        return '<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js">' + closeScript;
    }

    // Default parameters for new experiments
    const DEFAULT_PARAMS = [
        { key: 'velocity', label: 'Launch Velocity', default: 45, min: 10, max: 80, step: 1, unit: 'm/s' },
        { key: 'angle', label: 'Launch Angle', default: 45, min: 15, max: 85, step: 1, unit: '°' },
        { key: 'dragCoeff', label: 'Air Drag (k)', default: 0.06, min: 0.00, max: 0.20, step: 0.01, unit: '' },
        { key: 'gravity', label: 'Gravity (g)', default: 9.81, min: 1.62, max: 24.79, step: 0.1, unit: 'm/s²' }
    ];

    let currentProposalId = null;
    let parameterSchema = [...DEFAULT_PARAMS];
    let activeParamValues = {};
    let criteriaList = [
        'Vacuum trajectory follows exact parabola $y(x) = x\\tan\\theta - \\frac{g x^2}{2 v_0^2 \\cos^2\\theta}$',
        'Maximum vacuum range occurs strictly at launch angle $\\theta = 45^\\circ$',
        'Air drag shifts the optimal launch angle downward and reduces flight time'
    ];

    // Resolves current authenticated user identity from Supabase or localStorage
    function getLoggedInUserInfo() {
        if (typeof window !== 'undefined' && typeof window.resolveCurrentUserInfo === 'function') {
            const resolved = window.resolveCurrentUserInfo();
            if (resolved && (resolved.userId || (resolved.username && resolved.username !== 'researcher'))) {
                return resolved;
            }
        }

        let userId = null;
        let username = '';
        let userEmail = '';
        let userBio = '';
        let userAvatar = '';

        try {
            if (typeof localStorage !== 'undefined') {
                userId = localStorage.getItem('userId') || null;
                username = localStorage.getItem('username') || '';
                userEmail = localStorage.getItem('userEmail') || '';
                userBio = localStorage.getItem('userBio') || '';
                userAvatar = localStorage.getItem('avatarUrl') || localStorage.getItem('userAvatar') || '';

                if (!username && localStorage.getItem('handle')) {
                    username = localStorage.getItem('handle').replace(/^@/, '');
                }

                // Check Supabase v2 tokens in localStorage
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && ((key.startsWith('sb-') && key.endsWith('-auth-token')) || key === 'supabase.auth.token')) {
                        try {
                            const raw = JSON.parse(localStorage.getItem(key));
                            const u = raw?.user || raw?.currentSession?.user;
                            if (u) {
                                if (!userId) userId = u.id;
                                if (!userEmail) userEmail = u.email || '';
                                if (!username) {
                                    username = u.user_metadata?.username || u.user_metadata?.full_name || u.user_metadata?.name || (u.email ? u.email.split('@')[0] : '');
                                }
                                if (!userBio && u.user_metadata?.bio) {
                                    userBio = u.user_metadata.bio;
                                }
                                if (!userAvatar) userAvatar = u.user_metadata?.avatar_url || '';
                            }
                        } catch (_) {}
                    }
                }
            }
        } catch (_) {}

        const handle = username ? username.trim().replace(/^@/, '').replace(/\s+/g, '_').toLowerCase() : '';
        const displayName = username || (userEmail ? userEmail.split('@')[0] : 'Lead Researcher');

        return {
            userId: userId || null,
            username: handle || (userId ? `user_${userId.substring(0, 8)}` : 'researcher'),
            displayName: displayName,
            bio: userBio || 'Principal Investigator',
            avatar: userAvatar || ''
        };
    }

    // Initialize Editor State
    function initEditor() {
        const urlParams = new URLSearchParams(window.location.search);
        currentProposalId = urlParams.get('id');
        const forkProposalId = urlParams.get('fork') || urlParams.get('remix');
        const discId = urlParams.get('discId');

        const rm = window.ResearchManager;
        let existingProposal = null;
        if (rm && (currentProposalId || forkProposalId)) {
            existingProposal = rm.getProposal(currentProposalId || forkProposalId);
        }

        const isFork = !!forkProposalId;

        if (isFork && existingProposal) {
            // Treat as a brand new clone owned by currently logged-in user
            currentProposalId = null;
            const cloned = JSON.parse(JSON.stringify(existingProposal));
            cloned.id = null;
            cloned.title = cloned.title.startsWith('[Remix]') ? cloned.title : `[Remix] ${cloned.title}`;
            const loggedUser = getLoggedInUserInfo();
            cloned.author = loggedUser.username;
            cloned.authorName = loggedUser.displayName;
            cloned.authorRole = loggedUser.bio;
            cloned.user_id = loggedUser.userId;
            loadProposalIntoForm(cloned);
            setTimeout(() => {
                showToast(`Forked "${existingProposal.title}"! Customize parameters, code, and publish your own version.`);
            }, 600);
        } else if (existingProposal) {
            if (discId && Array.isArray(existingProposal.discussions)) {
                const targetDisc = existingProposal.discussions.find(d => d.id === discId);
                if (targetDisc && targetDisc.testRun && targetDisc.testRun.params) {
                    existingProposal.activeParams = Object.assign({}, existingProposal.initialParams, targetDisc.testRun.params);
                }
            }
            loadProposalIntoForm(existingProposal);
        } else {
            const loggedUser = getLoggedInUserInfo();
            const nameEl = document.getElementById('expAuthorName');
            if (nameEl && (!nameEl.value || nameEl.value.toLowerCase().includes('galileo')) && loggedUser.displayName) {
                nameEl.value = loggedUser.displayName;
            }
            const roleEl = document.getElementById('expAuthorRole');
            if (roleEl && !roleEl.value && loggedUser.bio) {
                roleEl.value = loggedUser.bio;
            }
            loadDefaultTemplate('projectile');
            initDefaultValues();
        }

        renderParameterSchemaList();
        renderCriteriaList();
        renderLiveParameterSliders();
        attachEventListeners();
        updateKaTeXPreviews();

        const hashTab = (urlParams.get('tab') || window.location.hash.replace('#', '')).toLowerCase();
        if (hashTab === 'simulation' || hashTab === 'tabsimulation') {
            document.querySelectorAll('.editor-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'tabSimulation'));
            document.querySelectorAll('.editor-tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tabSimulation'));
        }

        runLiveSimulation();
    }

    function initDefaultValues(prop) {
        activeParamValues = {};
        const source = prop?.activeParams || prop?.initialParams || {};
        parameterSchema.forEach(p => {
            activeParamValues[p.key] = source[p.key] !== undefined ? source[p.key] : p.default;
        });
    }

    function loadProposalIntoForm(prop) {
        const loggedUser = getLoggedInUserInfo();
        const isGalileoOrStarter = !prop.user_id || prop.author === 'galileo_gal' || (prop.authorName && prop.authorName.toLowerCase().includes('galileo')) || prop.id === 'prop-physics-projectile';

        document.getElementById('expTitle').value = prop.title || '';
        document.getElementById('expDomain').value = prop.domain || 'physics';
        document.getElementById('expDomainLabel').value = prop.domainLabel || '⚡ Physics • 2D Kinematics';
        
        // If it was the Galileo starter lab or unassigned, bind author to the logged-in user!
        if (isGalileoOrStarter && loggedUser && loggedUser.displayName && loggedUser.displayName !== 'Lead Researcher') {
            document.getElementById('expAuthorName').value = loggedUser.displayName;
            document.getElementById('expAuthorRole').value = loggedUser.bio || 'Principal Investigator';
        } else if (isGalileoOrStarter && loggedUser && loggedUser.userId) {
            document.getElementById('expAuthorName').value = loggedUser.displayName || 'Lead Researcher';
            document.getElementById('expAuthorRole').value = loggedUser.bio || 'Principal Investigator';
        } else {
            document.getElementById('expAuthorName').value = prop.authorName || (loggedUser ? loggedUser.displayName : '');
            document.getElementById('expAuthorRole').value = prop.authorRole || (loggedUser ? loggedUser.bio : '');
        }

        document.getElementById('expHypothesis').value = prop.hypothesis || '';
        document.getElementById('expNotes').value = prop.notes || '';

        if (Array.isArray(prop.criteria) && prop.criteria.length > 0) {
            criteriaList = [...prop.criteria];
        }

        if (Array.isArray(prop.parameterSchema) && prop.parameterSchema.length > 0) {
            parameterSchema = JSON.parse(JSON.stringify(prop.parameterSchema));
            if (prop.activeParams) {
                parameterSchema.forEach(p => {
                    if (prop.activeParams[p.key] !== undefined) {
                        p.default = prop.activeParams[p.key];
                    }
                });
            }
        } else if (prop.initialParams) {
            const source = prop.activeParams || prop.initialParams;
            parameterSchema = Object.keys(prop.initialParams).map(key => {
                const val = Number(source[key] !== undefined ? source[key] : prop.initialParams[key]) || 0;
                let min = 0;
                let max = 100;
                let step = 1;
                let unit = '';

                // Smart physics defaults for legacy proposals without saved schema
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes('drag') || (val > 0 && val < 1)) {
                    min = 0;
                    max = Math.max(1, Math.ceil(val * 10) / 5);
                    step = 0.01;
                } else if (lowerKey.includes('angle') || lowerKey.includes('theta')) {
                    min = 0;
                    max = 90;
                    step = 1;
                    unit = '°';
                } else if (lowerKey.includes('velocity') || lowerKey.includes('speed')) {
                    min = 0;
                    max = Math.max(100, Math.ceil(val * 2.5));
                    step = 1;
                    unit = 'm/s';
                } else if (lowerKey.includes('grav')) {
                    min = 0;
                    max = 30;
                    step = 0.1;
                    unit = 'm/s²';
                } else {
                    min = Math.floor(val * 0.2);
                    max = Math.ceil(val * 2.5) || 100;
                    step = val % 1 !== 0 ? 0.1 : 1;
                }

                return {
                    key: key,
                    label: key.charAt(0).toUpperCase() + key.slice(1),
                    default: val,
                    min: min,
                    max: max,
                    step: step,
                    unit: unit
                };
            });
        }

        initDefaultValues(prop);

        if (prop.engine) {
            const engSelect = document.getElementById('simulationEngineSelect');
            if (engSelect) engSelect.value = prop.engine;
        }

        function cleanSimulationTextOverlays(code) {
            if (!code || typeof code !== 'string') return '';
            return code
                .replace(/\/\/\s*Telemetry HUD[\s\S]*?(?=\n\s*(?:function|\/\/|\w+\s*=|\}))/i, '')
                .replace(/\/\/\s*HUD\b[\s\S]*?(?=\n\s*(?:function|\/\/|\w+\s*=|\}))/i, '')
                .replace(/^\s*text\s*\(\s*["'`][^"'`]*(?:Live Bench|Projectile Flight|Click canvas|re-launch|Interference Pattern|Harmonic Oscillator)[^"'`]*["'`][^;]*\);?\s*$/gmi, '')
                .replace(/^\s*text\s*\(\s*["'`][^"'`]*(?:v[₀0]:|Wavelength:|Mass:)[^;]*\);?\s*$/gmi, '');
        }

        const codeArea = document.getElementById('simulationCode');
        if (prop.customSimulationCode) {
            codeArea.value = cleanSimulationTextOverlays(prop.customSimulationCode);
        } else {
            codeArea.value = STARTER_TEMPLATES.projectile;
        }
    }

    function loadDefaultTemplate(key) {
        const codeArea = document.getElementById('simulationCode');
        if (STARTER_TEMPLATES[key]) {
            codeArea.value = STARTER_TEMPLATES[key];
        }
    }

    // ============================================================
    // ⚙️ PARAMETER SCHEMA BUILDER (Sliders Configuration & Editing)
    // ============================================================
    function openEditParamModal(idx) {
        const param = parameterSchema[idx];
        if (!param) return;

        const addParamModal = document.getElementById('addParamModal');
        const titleText = document.getElementById('paramModalTitleText');
        const subtitle = document.getElementById('paramModalSubtitle');
        const confirmBtn = document.getElementById('btnConfirmAddParam');
        const editIdxInput = document.getElementById('editingParamIndex');

        if (editIdxInput) editIdxInput.value = idx;
        if (titleText) titleText.textContent = `Edit Parameter: ${param.key}`;
        if (subtitle) subtitle.textContent = `Update slider limits, default values, and units for params.${param.key}`;
        if (confirmBtn) confirmBtn.innerHTML = '<i class="ri-check-line"></i> Save Variable';

        const keyInput = document.getElementById('newParamKey');
        const labelInput = document.getElementById('newParamLabel');
        const defInput = document.getElementById('newParamDefault');
        const unitInput = document.getElementById('newParamUnit');
        const minInput = document.getElementById('newParamMin');
        const maxInput = document.getElementById('newParamMax');
        const stepInput = document.getElementById('newParamStep');

        if (keyInput) keyInput.value = param.key || '';
        if (labelInput) labelInput.value = param.label || '';
        if (defInput) defInput.value = param.default !== undefined ? param.default : '';
        if (unitInput) unitInput.value = param.unit || '';
        if (minInput) minInput.value = param.min !== undefined ? param.min : 0;
        if (maxInput) maxInput.value = param.max !== undefined ? param.max : 100;
        if (stepInput) stepInput.value = param.step !== undefined ? param.step : 1;

        const errHint = document.getElementById('paramKeyErrorHint');
        if (errHint) errHint.style.display = 'none';
        if (keyInput) keyInput.style.borderColor = 'var(--editor-border)';

        if (addParamModal) addParamModal.style.display = 'flex';
        labelInput?.focus();
    }

    function openAddParamModal() {
        const addParamModal = document.getElementById('addParamModal');
        const titleText = document.getElementById('paramModalTitleText');
        const subtitle = document.getElementById('paramModalSubtitle');
        const confirmBtn = document.getElementById('btnConfirmAddParam');
        const editIdxInput = document.getElementById('editingParamIndex');

        if (editIdxInput) editIdxInput.value = '-1';
        if (titleText) titleText.textContent = 'Add Simulation Variable';
        if (subtitle) subtitle.textContent = 'Create a dynamic slider variable for creators and students to experiment with.';
        if (confirmBtn) confirmBtn.innerHTML = '<i class="ri-add-line"></i> Save Variable';

        const keyInput = document.getElementById('newParamKey');
        const labelInput = document.getElementById('newParamLabel');
        const defInput = document.getElementById('newParamDefault');
        const unitInput = document.getElementById('newParamUnit');
        const minInput = document.getElementById('newParamMin');
        const maxInput = document.getElementById('newParamMax');
        const stepInput = document.getElementById('newParamStep');

        if (keyInput) keyInput.value = '';
        if (labelInput) labelInput.value = '';
        if (defInput) defInput.value = '10';
        if (unitInput) unitInput.value = '';
        if (minInput) minInput.value = '0';
        if (maxInput) maxInput.value = '100';
        if (stepInput) stepInput.value = '1';

        const errHint = document.getElementById('paramKeyErrorHint');
        if (errHint) errHint.style.display = 'none';
        if (keyInput) keyInput.style.borderColor = 'var(--editor-border)';

        if (addParamModal) addParamModal.style.display = 'flex';
        keyInput?.focus();
    }

    // Centralized function to update any parameter value and sync all UI representations + sandbox iframe
    function updateParameterValue(key, value, sourceElementId = null) {
        const num = parseFloat(value);
        if (isNaN(num)) return;
        activeParamValues[key] = num;
        const param = parameterSchema.find(p => p.key === key);
        const unit = param ? (param.unit || '') : '';

        // 1. Update Live Variable Slider value display & input (if not the source)
        const liveValDisplay = document.getElementById(`val_${key}`);
        if (liveValDisplay) {
            liveValDisplay.textContent = `${num} ${unit}`;
        }
        const liveSlider = document.getElementById(`slider_${key}`);
        if (liveSlider && liveSlider.id !== sourceElementId) {
            liveSlider.value = num;
        }

        // 2. Update Schema Card value display & mini-range (if present and not the source)
        const schemaValDisplay = document.getElementById(`schema_val_${key}`);
        if (schemaValDisplay) {
            schemaValDisplay.innerHTML = `<span style="color:#38bdf8; font-weight:700;">${num}</span> <span style="font-size:0.75rem; color:#94a3b8;">${escapeHtml(unit)}</span>`;
        }
        const schemaSlider = document.getElementById(`schema_slider_${key}`);
        if (schemaSlider && schemaSlider.id !== sourceElementId) {
            schemaSlider.value = num;
        }

        // 3. Dispatch to live preview sandbox iframe (zero reload, real-time message)
        const iframe = document.getElementById('previewSandboxFrame');
        if (iframe && iframe.contentWindow) {
            try {
                iframe.contentWindow.postMessage({ type: 'UPDATE_PARAMS', params: activeParamValues }, '*');
            } catch (err) {
                runLiveSimulation();
            }
        } else {
            runLiveSimulation();
        }
    }

    function renderParameterSchemaList() {
        const container = document.getElementById('schemaParametersList');
        if (!container) return;
        container.innerHTML = '';

        parameterSchema.forEach((param, idx) => {
            const curVal = activeParamValues[param.key] !== undefined ? activeParamValues[param.key] : param.default;
            const card = document.createElement('div');
            card.className = 'param-schema-card';
            card.dataset.idx = idx;
            card.innerHTML = `
                <div class="param-schema-header">
                    <span class="param-schema-badge">${escapeHtml(param.key)}</span>
                    <strong style="color:white; font-size:0.92rem; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(param.label)}">${escapeHtml(param.label)}</strong>
                    <span id="schema_val_${param.key}" style="font-size:0.85rem; margin-right:4px;">
                        <span style="color:#38bdf8; font-weight:700;">${curVal}</span> <span style="font-size:0.75rem; color:#94a3b8;">${escapeHtml(param.unit || '')}</span>
                    </span>
                    <div style="display:flex; align-items:center; gap:2px;">
                        <button type="button" class="btn-param-action btn-param-edit" data-idx="${idx}" title="Edit Parameter Configuration">
                            <i class="ri-edit-line"></i>
                        </button>
                        <button type="button" class="btn-param-action btn-param-del" data-idx="${idx}" title="Delete Parameter">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px; margin:3px 0 1px 0;" title="Live slider control for params.${escapeHtml(param.key)}">
                    <input type="range" class="schema-mini-range"
                        id="schema_slider_${param.key}"
                        min="${param.min}"
                        max="${param.max}"
                        step="${param.step}"
                        value="${curVal}">
                </div>
                <div class="param-schema-limits" data-idx="${idx}" title="Click to edit limits & default value">
                    <span>Min: <strong style="color:#e2e8f0;">${param.min}</strong></span>
                    <span>Max: <strong style="color:#e2e8f0;">${param.max}</strong></span>
                    <span>Step: <strong style="color:#e2e8f0;">${param.step}</strong></span>
                    <span>Def: <strong style="color:#a5b4fc;">${param.default}</strong></span>
                    <span>Unit: <strong style="color:#e2e8f0;">"${escapeHtml(param.unit || 'none')}"</strong></span>
                    <span class="param-edit-hint"><i class="ri-edit-2-line"></i> Edit</span>
                </div>
            `;
            container.appendChild(card);

            // Mini slider real-time listener
            const miniSlider = card.querySelector(`#schema_slider_${param.key}`);
            if (miniSlider) {
                miniSlider.addEventListener('input', (e) => {
                    updateParameterValue(param.key, e.target.value, `schema_slider_${param.key}`);
                });
            }
        });

        // Edit button listener
        container.querySelectorAll('.btn-param-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.currentTarget.dataset.idx, 10);
                openEditParamModal(idx);
            });
        });

        // Clicking the limits row also opens edit
        container.querySelectorAll('.param-schema-limits').forEach(limits => {
            limits.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.idx, 10);
                openEditParamModal(idx);
            });
        });

        // Delete button listener
        container.querySelectorAll('.btn-param-del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.currentTarget.dataset.idx, 10);
                if (parameterSchema.length <= 1) {
                    showToast('At least 1 simulation parameter is required.');
                    return;
                }
                const removed = parameterSchema.splice(idx, 1);
                delete activeParamValues[removed[0].key];
                renderParameterSchemaList();
                renderLiveParameterSliders();
                runLiveSimulation();
                saveDraftToLocal();
                showToast(`Deleted parameter: ${removed[0].label || removed[0].key}`);
            });
        });
    }

    // Render the interactive sliders below the preview canvas
    function renderLiveParameterSliders() {
        const container = document.getElementById('editorLiveSliders');
        if (!container) return;
        container.innerHTML = '';

        parameterSchema.forEach(param => {
            const curVal = activeParamValues[param.key] !== undefined ? activeParamValues[param.key] : param.default;
            const group = document.createElement('div');
            group.className = 'editor-slider-group';
            group.innerHTML = `
                <div class="editor-slider-label">
                    <span>${escapeHtml(param.label)}</span>
                    <span class="editor-slider-val" id="val_${param.key}">${curVal} ${param.unit || ''}</span>
                </div>
                <input type="range" class="editor-range-input" 
                    id="slider_${param.key}" 
                    min="${param.min}" 
                    max="${param.max}" 
                    step="${param.step}" 
                    value="${curVal}">
            `;
            container.appendChild(group);

            const input = group.querySelector('input');
            input.addEventListener('input', (e) => {
                updateParameterValue(param.key, e.target.value, `slider_${param.key}`);
            });
        });
    }

    // ============================================================
    // 🧪 LIVE SIMULATION TEST BENCH
    // ============================================================
    function runLiveSimulation() {
        const iframe = document.getElementById('previewSandboxFrame');
        if (!iframe) return;

        const engine = document.getElementById('simulationEngineSelect')?.value || 'p5';
        let rawCode = document.getElementById('simulationCode')?.value || '';
        rawCode = rawCode
            .replace(/\/\/\s*Telemetry HUD[\s\S]*?(?=\n\s*(?:function|\/\/|\w+\s*=|\}))/i, '')
            .replace(/\/\/\s*HUD\b[\s\S]*?(?=\n\s*(?:function|\/\/|\w+\s*=|\}))/i, '')
            .replace(/text\s*\(\s*["'`][^"'`]*(?:Live Bench|Projectile Flight|Click canvas|re-launch|Interference Pattern|Harmonic Oscillator)[^"'`]*["'`][^;]*\);?/gi, '')
            .replace(/text\s*\(\s*["'`][^"'`]*(?:v[₀0]:|Wavelength:|Mass:)[^;]*\);?/gi, '');
        const paramsJson = JSON.stringify(activeParamValues);
        const engineScripts = getEngineScriptTags(engine);
        const closeScript = '<' + '/script>';

        const iframeDoc = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${engineScripts}
    <style>
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #060813;
            user-select: none;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        canvas {
            display: block;
            width: 100% !important;
            height: 100% !important;
            cursor: crosshair;
        }
        #error-box {
            display: none;
            position: absolute;
            top: 10px;
            left: 10px;
            right: 10px;
            color: #ef4444;
            background: rgba(15, 23, 42, 0.95);
            padding: 12px 16px;
            font-family: monospace;
            font-size: 12px;
            border-radius: 8px;
            border: 1px solid #dc2626;
            z-index: 9999;
            box-shadow: 0 10px 25px rgba(0,0,0,0.8);
        }
    </style>
</head>
<body>
    <div id="error-box"></div>
    <script>
        window.params = ${paramsJson};

        // Normalize initial viewport dimensions with robust fallback minimums
        const initialDocW = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0;
        const initialDocH = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0;
        window.width = (initialDocW > 100) ? initialDocW : 600;
        window.height = (initialDocH > 100) ? initialDocH : 380;
        window.windowWidth = window.width;
        window.windowHeight = window.height;

        // Catch runtime errors
        window.onerror = function(msg, url, line) {
            const errBox = document.getElementById('error-box');
            if (errBox) {
                errBox.style.display = 'block';
                errBox.innerHTML = '<strong>Simulation Runtime Error (Line ' + line + '):</strong><br>' + msg;
            }
            return false;
        };

        // Real-time slider update listener via postMessage (zero flicker)
        window.addEventListener('message', function(ev) {
            if (ev.data && ev.data.type === 'UPDATE_PARAMS') {
                if (!window.params) window.params = {};
                Object.assign(window.params, ev.data.params);
                if (typeof window.onParamsChange === 'function') {
                    try { window.onParamsChange(window.params); } catch(e){}
                } else if (typeof window.resetSimulation === 'function') {
                    try { window.resetSimulation(); } catch(e){}
                } else if (typeof window.reset === 'function') {
                    try { window.reset(); } catch(e){}
                } else if (typeof window.init === 'function') {
                    try { window.init(); } catch(e){}
                } else if (typeof window.restart === 'function') {
                    try { window.restart(); } catch(e){}
                }
                // If matter.js engine exists, dynamically update gravity if params.gravity exists
                if (window.engine && window.engine.gravity && window.params.gravity !== undefined) {
                    window.engine.gravity.y = parseFloat(window.params.gravity) * 0.1;
                }
            }
        });

        // Window resize listener to keep canvas perfectly synced
        window.addEventListener('resize', function() {
            const rw = window.innerWidth || document.documentElement.clientWidth || 600;
            const rh = window.innerHeight || document.documentElement.clientHeight || 380;
            window.width = (rw > 100) ? rw : 600;
            window.height = (rh > 100) ? rh : 380;
            window.windowWidth = window.width;
            window.windowHeight = window.height;
            if (typeof resizeCanvas === 'function') {
                try { resizeCanvas(window.width, window.height); } catch(e){}
            }
            if (typeof window.windowResized === 'function') {
                try { window.windowResized(); } catch(e){}
            }
            if (typeof window.draw === 'function') {
                try { window.draw(); } catch(e){}
            }
        });
    ${closeScript}

    <!-- User Simulation Code Executed in Top-Level Scope -->
    <script>
${rawCode}
    ${closeScript}

    <!-- Engine Bootstrapper: p5.js with Fallback 2D Canvas Engine -->
    <script>
        function bootEngine() {
            // Expose declared functions to global window for p5 & canvas loops
            if (typeof setup === 'function') window.setup = setup;
            if (typeof draw === 'function') window.draw = draw;
            if (typeof resetSimulation === 'function') window.resetSimulation = resetSimulation;
            if (typeof mousePressed === 'function') window.mousePressed = mousePressed;
            if (typeof mouseReleased === 'function') window.mouseReleased = mouseReleased;
            if (typeof windowResized === 'function') window.windowResized = windowResized;

            if (typeof window.setup === 'function' || typeof window.draw === 'function') {
                if (typeof p5 !== 'undefined' && p5.prototype) {
                    const origProtoCreateCanvas = p5.prototype.createCanvas;
                    p5.prototype.createCanvas = function(w, h, renderer) {
                        const finalW = (!w || w <= 100) ? (window.innerWidth || 600) : w;
                        const finalH = (!h || h <= 100) ? (window.innerHeight || 380) : h;
                        return origProtoCreateCanvas.call(this, finalW, finalH, renderer);
                    };
                    const origProtoText = p5.prototype.text;
                    p5.prototype.text = function(str) {
                        if (typeof str === 'string' && (
                            str.includes('Click canvas') ||
                            str.includes('Live Bench') ||
                            str.includes('Projectile Flight') ||
                            str.includes('re-launch')
                        )) {
                            return;
                        }
                        return origProtoText ? origProtoText.apply(this, arguments) : undefined;
                    };
                    if (!window._p5Instance) {
                        try {
                            window._p5Instance = new p5();
                        } catch(err) {
                            console.warn('p5 init failed, starting canvas fallback:', err);
                            initCanvasFallback();
                        }
                    }
                } else {
                    initCanvasFallback();
                }
            }
        }

        function initCanvasFallback() {
            let canvas = document.querySelector('canvas');
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = 'defaultCanvas0';
                document.body.appendChild(canvas);
            }
            const docW = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0;
            const docH = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0;
            const w = canvas.width = (docW > 100) ? docW : 600;
            const h = canvas.height = (docH > 100) ? docH : 380;
            window.width = w;
            window.height = h;
            window.windowWidth = w;
            window.windowHeight = h;
            const ctx = canvas.getContext('2d');

            window.radians = function(d) { return (d * Math.PI) / 180; };
            window.degrees = function(r) { return (r * 180) / Math.PI; };
            window.sq = function(n) { return n * n; };
            window.sqrt = Math.sqrt;
            window.pow = Math.pow;
            window.abs = Math.abs;
            window.min = Math.min;
            window.max = Math.max;
            window.floor = Math.floor;
            window.ceil = Math.ceil;
            window.round = Math.round;
            window.cos = Math.cos;
            window.sin = Math.sin;
            window.tan = Math.tan;
            window.atan2 = Math.atan2;
            window.PI = Math.PI;
            window.HALF_PI = Math.PI / 2;
            window.TWO_PI = Math.PI * 2;
            window.dist = function(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); };
            window.map = function(n, start1, stop1, start2, stop2) { return (n - start1) / (stop1 - start1) * (stop2 - start2) + start2; };
            window.constrain = function(n, low, high) { return Math.max(Math.min(n, high), low); };
            window.random = function(a, b) {
                if (a === undefined) return Math.random();
                if (b === undefined) return Math.random() * a;
                return a + Math.random() * (b - a);
            };

            window.createCanvas = function(cw, ch) {
                canvas.width = (cw > 50) ? cw : w;
                canvas.height = (ch > 50) ? ch : h;
                window.width = canvas.width;
                window.height = canvas.height;
                window.windowWidth = canvas.width;
                window.windowHeight = canvas.height;
                return canvas;
            };
            window.resizeCanvas = function(rw, rh) {
                canvas.width = rw;
                canvas.height = rh;
                window.width = rw;
                window.height = rh;
                window.windowWidth = rw;
                window.windowHeight = rh;
            };
            window.background = function(r, g, b, a) {
                ctx.fillStyle = typeof r === 'string' ? r : (g !== undefined ? (a !== undefined ? 'rgba(' + r + ',' + g + ',' + b + ',' + (a/255) + ')' : 'rgb(' + r + ',' + g + ',' + b + ')') : 'rgb(' + r + ',' + r + ',' + r + ')');
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            };
            window.stroke = function(r, g, b, a) {
                ctx.strokeStyle = typeof r === 'string' ? r : (a !== undefined ? 'rgba(' + r + ',' + g + ',' + b + ',' + (a/255) + ')' : (g !== undefined ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgb(' + r + ',' + r + ',' + r + ')'));
            };
            window.fill = function(r, g, b, a) {
                ctx.fillStyle = typeof r === 'string' ? r : (a !== undefined ? 'rgba(' + r + ',' + g + ',' + b + ',' + (a/255) + ')' : (g !== undefined ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgb(' + r + ',' + r + ',' + r + ')'));
            };
            window.strokeWeight = function(wt) { ctx.lineWidth = wt; };
            window.noStroke = function() { ctx.strokeStyle = 'transparent'; };
            window.noFill = function() { ctx.fillStyle = 'transparent'; };
            window.line = function(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
            window.rect = function(x, y, rw, rh) { ctx.fillRect(x, y, rw, rh); ctx.strokeRect(x, y, rw, rh); };
            window.circle = function(x, y, d) { ctx.beginPath(); ctx.arc(x, y, d / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
            window.ellipse = function(x, y, ew, eh) { ctx.beginPath(); ctx.ellipse(x, y, ew/2, (eh||ew)/2, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke(); };
            window.arc = function(x, y, w, h, start, stop) { ctx.beginPath(); ctx.arc(x, y, w / 2, start, stop); ctx.stroke(); };
            window.point = function(x, y) { ctx.fillRect(x, y, 1, 1); };

            var inShape = false;
            var firstVertex = true;
            window.beginShape = function() { ctx.beginPath(); inShape = true; firstVertex = true; };
            window.vertex = function(x, y) {
                if (inShape) {
                    if (firstVertex) { ctx.moveTo(x, y); firstVertex = false; }
                    else { ctx.lineTo(x, y); }
                }
            };
            window.endShape = function() { ctx.stroke(); inShape = false; firstVertex = true; };

            window.textSize = function(sz) { ctx.font = sz + 'px Inter, -apple-system, sans-serif'; };
            window.textAlign = function(h, v) { ctx.textAlign = h; if (v) ctx.textBaseline = v; };
            window.text = function(txt, x, y) { ctx.fillText(txt, x, y); };
            window.color = function(r, g, b) { return g !== undefined ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgb(' + r + ',' + r + ',' + r + ')'; };

            window.push = function() { ctx.save(); };
            window.pop = function() { ctx.restore(); };
            window.translate = function(x, y) { ctx.translate(x, y); };
            window.rotate = function(a) { ctx.rotate(a); };
            window.scale = function(sx, sy) { ctx.scale(sx, sy || sx); };

            canvas.addEventListener('click', function(e) {
                if (typeof window.mousePressed === 'function') window.mousePressed(e);
                else if (typeof window.resetSimulation === 'function') window.resetSimulation();
            });

            if (typeof window.setup === 'function') {
                try { window.setup(); } catch(err){ console.error(err); }
            }

            function animLoop() {
                if (typeof window.draw === 'function') {
                    try { window.draw(); } catch(err){}
                }
                requestAnimationFrame(animLoop);
            }
            requestAnimationFrame(animLoop);
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            bootEngine();
        } else {
            window.addEventListener('DOMContentLoaded', bootEngine);
            window.addEventListener('load', bootEngine);
        }
    ${closeScript}
</body>
</html>`;

        iframe.srcdoc = iframeDoc;
    }

    // ============================================================
    // 📜 CRITERIA CHECKLIST BUILDER
    // ============================================================
    function renderCriteriaList() {
        const container = document.getElementById('criteriaListContainer');
        if (!container) return;
        container.innerHTML = '';

        criteriaList.forEach((criterion, idx) => {
            const item = document.createElement('div');
            item.className = 'criteria-chip-item';
            item.innerHTML = `
                <span class="criteria-bullet">${idx + 1}</span>
                <span class="criteria-text">${escapeHtml(criterion)}</span>
                <button type="button" class="btn-remove-criterion" data-idx="${idx}" title="Remove">
                    <i class="ri-close-line"></i>
                </button>
            `;
            container.appendChild(item);
        });

        container.querySelectorAll('.btn-remove-criterion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.idx, 10);
                criteriaList.splice(idx, 1);
                renderCriteriaList();
                updateKaTeXPreviews();
            });
        });
    }

    function addCriteriaFromInput() {
        const input = document.getElementById('newCriterionInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        criteriaList.push(text);
        input.value = '';
        renderCriteriaList();
        updateKaTeXPreviews();
    }

    // ============================================================
    // 📐 KATEX REAL-TIME MATH PREVIEW & PAPER DOSSIER
    // ============================================================
    function insertNoteSnippet(type) {
        const textarea = document.getElementById('expNotes');
        if (!textarea) return;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const text = textarea.value;
        let snippet = '';

        switch (type) {
            case 'formula':
                snippet = '\n$$\n\\frac{dv}{dt} = -g - k v\n$$\n';
                break;
            case 'inline_math':
                snippet = '$v_0$';
                break;
            case 'h2':
                snippet = '\n## Mathematical Derivation\n';
                break;
            case 'bullet':
                snippet = '\n- Experimental condition: ';
                break;
        }

        textarea.value = text.substring(0, start) + snippet + text.substring(end);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
        updateKaTeXPreviews();
        saveDraftToLocal();
    }
    window.insertNoteSnippet = insertNoteSnippet;

    function renderNotesMarkdown(text) {
        if (!text || !text.trim()) {
            return '<div style="color:#64748b; font-style:italic; padding:40px 20px; text-align:center;">' +
                   '<i class="ri-file-text-line" style="font-size:2rem; display:block; margin-bottom:8px; opacity:0.5;"></i>' +
                   'Your research paper, mathematical derivations, and notes will render here live as you type.</div>';
        }

        // Protect LaTeX math blocks ($$...$$ and $...$) from markdown replacements
        const mathBlocks = [];
        let placeholderIdx = 0;

        // 1. Display Math ($$...$$)
        let protectedText = text.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
            const token = `@@KATEX_DISPLAY_${placeholderIdx++}@@`;
            mathBlocks.push({ token, content: match });
            return token;
        });

        // 2. Inline Math ($...$)
        protectedText = protectedText.replace(/\$([^\$\n]+?)\$/g, (match) => {
            const token = `@@KATEX_INLINE_${placeholderIdx++}@@`;
            mathBlocks.push({ token, content: match });
            return token;
        });

        // 3. Escape HTML
        let html = escapeHtml(protectedText);

        // 4. Markdown Headings
        html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

        // 5. Horizontal rule
        html = html.replace(/^---$/gm, '<hr>');

        // 6. Blockquote
        html = html.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');

        // 7. Bold & Italic
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // 8. Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 9. Bullet lists
        html = html.replace(/^[\*\-] (.*?)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>(\n|$))+/g, '<ul>$&</ul>');

        // 10. Numbered lists
        html = html.replace(/^\d+\. (.*?)$/gm, '<li class="numbered-item">$1</li>');
        html = html.replace(/(<li class="numbered-item">.*<\/li>(\n|$))+/g, '<ol>$&</ol>');

        // 11. Paragraphs
        html = html.replace(/\n\n+/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');
        html = '<p>' + html + '</p>';
        html = html.replace(/<p><(h[1-4]|hr|blockquote|ul|ol|pre)/g, '<$1');
        html = html.replace(/<\/(h[1-4]|hr|blockquote|ul|ol|pre)><\/p>/g, '</$1>');
        html = html.replace(/<p><\/p>/g, '');

        // 12. Restore protected LaTeX math blocks
        mathBlocks.forEach(item => {
            html = html.replace(item.token, item.content);
        });

        return html;
    }

    function updateKaTeXPreviews() {
        // Tab 1: Hypothesis Real-time Preview
        const hypoText = document.getElementById('expHypothesis')?.value || '';
        const hypoPreviewEl = document.getElementById('hypoMathPreview');
        if (hypoPreviewEl) {
            hypoPreviewEl.innerHTML = formatMathText(hypoText);
            if (window.renderMathInElement) {
                try {
                    window.renderMathInElement(hypoPreviewEl, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false }
                        ],
                        throwOnError: false
                    });
                } catch (_) {}
            }
        }

        // Tab 3: Paper Dossier Live Typeset Markdown & KaTeX Preview
        const notesText = document.getElementById('expNotes')?.value || '';
        const dossierPreviewEl = document.getElementById('dossierMathPreview');
        if (dossierPreviewEl) {
            dossierPreviewEl.innerHTML = renderNotesMarkdown(notesText);
            if (window.renderMathInElement) {
                try {
                    window.renderMathInElement(dossierPreviewEl, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false },
                            { left: '\\[', right: '\\]', display: true },
                            { left: '\\(', right: '\\)', display: false }
                        ],
                        throwOnError: false
                    });
                } catch (_) {}
            }
        }

        const wordCountEl = document.getElementById('dossierWordCount');
        if (wordCountEl) {
            const words = notesText.trim() ? notesText.trim().split(/\s+/).length : 0;
            wordCountEl.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
        }
    }

    function formatMathText(text) {
        if (!text) return '<span style="color:#64748b; font-style:italic;">No hypothesis formulated yet.</span>';
        return escapeHtml(text).replace(/\n/g, '<br>');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ============================================================
    // 💾 PUBLISH & SAVE PIPELINE
    // ============================================================
    async function publishExperiment() {
        const title = document.getElementById('expTitle')?.value?.trim();
        const hypothesis = document.getElementById('expHypothesis')?.value?.trim();

        if (!title) {
            showToast('Please enter an Experiment Title.');
            document.getElementById('expTitle')?.focus();
            return;
        }

        if (!hypothesis) {
            showToast('Please write a scientific hypothesis.');
            document.getElementById('expHypothesis')?.focus();
            return;
        }

        const rm = window.ResearchManager;
        if (!rm) {
            showToast('ResearchManager unavailable.');
            return;
        }

        const publishBtn = document.getElementById('btnPublishExperiment');
        if (publishBtn) {
            publishBtn.disabled = true;
            publishBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Publishing...`;
        }

        const loggedUser = getLoggedInUserInfo();
        const domain = document.getElementById('expDomain')?.value || 'physics';
        const domainLabel = document.getElementById('expDomainLabel')?.value || '⚡ Physics • Lab Experiment';
        
        let inputAuthorName = document.getElementById('expAuthorName')?.value?.trim();
        let inputAuthorRole = document.getElementById('expAuthorRole')?.value?.trim();

        // If author name is blank or contains Galileo, override with logged-in user
        if (!inputAuthorName || inputAuthorName.toLowerCase().includes('galileo')) {
            inputAuthorName = loggedUser.displayName || 'Principal Researcher';
        }
        if (!inputAuthorRole || inputAuthorRole.toLowerCase().includes('peer review')) {
            inputAuthorRole = loggedUser.bio || 'Principal Investigator';
        }

        const authorName = inputAuthorName;
        const authorRole = inputAuthorRole;

        // Author handle: strictly the logged-in user's handle, never galileo_gal
        let authorHandle = loggedUser.username;
        if (!authorHandle || authorHandle === 'galileo_gal' || authorHandle === 'dr._galileo_galilei') {
            authorHandle = authorName.replace(/^@/, '').replace(/\s+/g, '_').toLowerCase();
        }
        if (!authorHandle || authorHandle === 'galileo_gal') {
            authorHandle = 'researcher_' + Math.random().toString(36).substring(2, 6);
        }

        const authorUserId = loggedUser.userId || (currentProposalId && currentProposalId !== 'prop-physics-projectile' ? undefined : 'usr_' + Date.now());
        const notes = document.getElementById('expNotes')?.value || '';
        const customSimulationCode = document.getElementById('simulationCode')?.value || '';
        const selectedEngine = document.getElementById('simulationEngineSelect')?.value || 'p5';

        // Initial parameter snapshot
        const initialParams = {};
        parameterSchema.forEach(p => {
            initialParams[p.key] = p.default;
        });

        const proposalPayload = {
            title: title,
            domain: domain,
            domainLabel: domainLabel,
            author: authorHandle,
            authorName: authorName,
            authorRole: authorRole,
            user_id: authorUserId,
            avatar: loggedUser.avatar || '',
            hypothesis: hypothesis,
            criteria: criteriaList,
            parameterSchema: parameterSchema,
            initialParams: initialParams,
            activeParams: Object.assign({}, initialParams),
            engine: selectedEngine,
            customSimulationCode: customSimulationCode,
            notes: notes,
            status: 'validated'
        };

        // If currentProposalId is an existing custom proposal (and not the starter template), update it!
        const isExistingCustom = !!(currentProposalId && currentProposalId !== 'prop-physics-projectile');
        let resultProposal;
        if (isExistingCustom) {
            resultProposal = rm.updateProposal(currentProposalId, proposalPayload);
        } else {
            resultProposal = rm.createProposal(proposalPayload);
        }

        let savedPostId = resultProposal.id;

        // Persist to Supabase posts table if client is available
        try {
            const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
            if (client) {
                const cloudPostData = {
                    title: resultProposal.title,
                    description: resultProposal.hypothesis || 'Research Lab Simulation & Scientific Experiment',
                    format: 'researchlab',
                    video_url: '',
                    pdf_url: '',
                    media_type: 'application/json',
                    username: resultProposal.author,
                    avatar_url: resultProposal.avatar || '',
                    user_id: loggedUser.userId || null,
                    source: {
                        engine: resultProposal.engine || 'custom_engine',
                        domain: resultProposal.domain,
                        domainLabel: resultProposal.domainLabel,
                        initialParams: resultProposal.initialParams,
                        parameterSchema: resultProposal.parameterSchema,
                        customSimulationCode: resultProposal.customSimulationCode || '',
                        hypothesis: resultProposal.hypothesis,
                        criteria: resultProposal.criteria,
                        notes: resultProposal.notes,
                        proposal: resultProposal
                    }
                };

                let dbData = null;
                let dbErr = null;

                // If editing an existing post, attempt to UPDATE instead of creating a duplicate row
                if (isExistingCustom) {
                    const updateRes = await client
                        .from('posts')
                        .update(cloudPostData)
                        .eq('id', currentProposalId)
                        .select();

                    if (!updateRes.error && updateRes.data && updateRes.data.length > 0) {
                        dbData = updateRes.data;
                        savedPostId = currentProposalId;
                    } else {
                        // If row was not found in Supabase (e.g. was local-only ID), insert fresh
                        cloudPostData.created_at = new Date().toISOString();
                        const insertRes = await client
                            .from('posts')
                            .insert([cloudPostData])
                            .select();
                        dbData = insertRes.data;
                        dbErr = insertRes.error;
                    }
                } else {
                    cloudPostData.created_at = new Date().toISOString();
                    const insertRes = await client
                        .from('posts')
                        .insert([cloudPostData])
                        .select();
                    dbData = insertRes.data;
                    dbErr = insertRes.error;
                }

                if (!dbErr && dbData && dbData[0]) {
                    savedPostId = dbData[0].id;
                    resultProposal.id = savedPostId;
                    resultProposal.proposal_id = savedPostId;
                    rm.updateProposal(savedPostId, resultProposal);
                    // Notify Google that new content was published (triggers sitemap re-crawl)
                    fetch('https://www.google.com/ping?sitemap=https://www.xtrapath.com/sitemap.xml').catch(() => {});
                } else if (dbErr) {
                    console.warn('[ResearchLabEditor] Supabase post save notice:', dbErr);
                }
            }
        } catch (cloudErr) {
            console.warn('[ResearchLabEditor] Cloud publish error:', cloudErr);
        }

        // Sync published experiment to userPosts so it appears on user profile immediately
        try {
            const userPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            const postObj = {
                id: savedPostId,
                title: resultProposal.title,
                format: 'researchlab',
                type: 'researchlab',
                is_research_lab: true,
                proposal_id: savedPostId,
                domain: resultProposal.domain,
                engine: resultProposal.engine || 'custom_engine',
                initialParams: resultProposal.initialParams,
                customSimulationCode: resultProposal.customSimulationCode || customSimulationCode || '',
                author: resultProposal.authorName,
                username: resultProposal.author,
                user_id: resultProposal.user_id,
                avatar_url: resultProposal.avatar || '',
                likes_count: resultProposal.consensusScore?.validated || 0,
                comments_count: (resultProposal.discussions && resultProposal.discussions.length) || 0,
                created_at: resultProposal.createdAt || new Date().toISOString(),
                status: 'published',
                proposal: resultProposal,
                source: {
                    engine: resultProposal.engine,
                    domain: resultProposal.domain,
                    initialParams: resultProposal.initialParams,
                    customSimulationCode: resultProposal.customSimulationCode || '',
                    proposal: resultProposal
                }
            };
            const existingIdx = userPosts.findIndex(p => p.id === savedPostId || p.proposal_id === savedPostId);
            if (existingIdx >= 0) {
                userPosts[existingIdx] = Object.assign({}, userPosts[existingIdx], postObj);
            } else {
                userPosts.unshift(postObj);
            }
            localStorage.setItem('userPosts', JSON.stringify(userPosts));
        } catch (e) {
            console.warn('[ResearchLabEditor] Could not sync to userPosts:', e);
        }

        // Invalidate feed & profile caches so Explore & Profile immediately show this newly published lab
        try {
            localStorage.removeItem('cached_explore_feed');
            localStorage.removeItem('cached_explore_feed_uid');
            localStorage.removeItem('cached_reels_feed');
            localStorage.removeItem('cached_my_profile_posts');
        } catch (_) {}

        window.dispatchEvent(new Event('user-posts-changed'));

        showToast(isExistingCustom ? 'Experiment updated successfully! Redirecting to Lab View...' : 'Experiment successfully published! Redirecting to Lab View...');
        setTimeout(() => {
            window.location.href = `/views/researchLab.html?id=${encodeURIComponent(savedPostId)}`;
        }, 800);
    }

    function saveDraft() {
        const loggedUser = getLoggedInUserInfo();
        const title = document.getElementById('expTitle')?.value || 'Untitled Experiment';
        let authorName = document.getElementById('expAuthorName')?.value?.trim() || loggedUser.displayName;
        if (!authorName || authorName.toLowerCase().includes('galileo')) {
            authorName = loggedUser.displayName || 'Principal Researcher';
        }
        let authorHandle = loggedUser.username;
        if (!authorHandle || authorHandle === 'galileo_gal') {
            authorHandle = authorName.replace(/^@/, '').replace(/\s+/g, '_').toLowerCase();
        }

        const draftData = {
            id: currentProposalId || 'draft_' + Date.now(),
            title: title,
            domain: document.getElementById('expDomain')?.value,
            domainLabel: document.getElementById('expDomainLabel')?.value,
            author: authorHandle,
            authorName: authorName,
            authorRole: document.getElementById('expAuthorRole')?.value || loggedUser.bio,
            user_id: loggedUser.userId,
            hypothesis: document.getElementById('expHypothesis')?.value,
            notes: document.getElementById('expNotes')?.value,
            engine: document.getElementById('simulationEngineSelect')?.value || 'p5',
            customSimulationCode: document.getElementById('simulationCode')?.value,
            criteria: criteriaList,
            parameterSchema: parameterSchema
        };

        localStorage.setItem('xtra_research_editor_draft', JSON.stringify(draftData));
        showToast('Draft saved successfully to local workspace.');
    }

    function showToast(msg) {
        let toast = document.getElementById('editorToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'editorToast';
            toast.className = 'editor-toast-banner';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ============================================================
    // 🎛️ EVENT LISTENERS & MODAL HANDLERS
    // ============================================================
    function attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.editor-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.editor-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.editor-tab-pane').forEach(p => p.classList.remove('active'));
                
                const tabId = e.currentTarget.dataset.tab;
                e.currentTarget.classList.add('active');
                document.getElementById(tabId)?.classList.add('active');

                // If opening the simulation workbench or dossier tab, trigger fresh layout/preview rendering
                if (tabId === 'tabSimulation') {
                    setTimeout(runLiveSimulation, 60);
                } else if (tabId === 'tabDossier') {
                    setTimeout(updateKaTeXPreviews, 60);
                }
            });
        });

        // Run simulation button (switches to simulation tab automatically if on another tab)
        document.getElementById('btnRunSimulation')?.addEventListener('click', () => {
            const simTabBtn = document.querySelector('.editor-tab-btn[data-tab="tabSimulation"]');
            if (simTabBtn && !simTabBtn.classList.contains('active')) {
                simTabBtn.click();
            } else {
                runLiveSimulation();
            }
        });

        // Publish & Save Draft
        document.getElementById('btnPublishExperiment')?.addEventListener('click', publishExperiment);
        document.getElementById('btnSaveDraft')?.addEventListener('click', saveDraft);

        // Hypothesis input -> math preview
        document.getElementById('expHypothesis')?.addEventListener('input', updateKaTeXPreviews);

        // Paper Notes input -> real-time markdown & KaTeX preview
        document.getElementById('expNotes')?.addEventListener('input', () => {
            updateKaTeXPreviews();
            saveDraftToLocal();
        });

        // Dossier View Toggle Controls (Split, Edit, Preview)
        const splitContainer = document.getElementById('dossierSplitContainer');
        const btnSplit = document.getElementById('btnDossierSplit');
        const btnEdit = document.getElementById('btnDossierEdit');
        const btnPreview = document.getElementById('btnDossierPreview');
        const editorPane = document.getElementById('dossierEditorPane');
        const previewPane = document.getElementById('dossierPreviewPane');

        btnSplit?.addEventListener('click', () => {
            btnSplit.classList.add('active');
            btnEdit?.classList.remove('active');
            btnPreview?.classList.remove('active');
            if (splitContainer) splitContainer.style.gridTemplateColumns = '1fr 1fr';
            if (editorPane) editorPane.style.display = 'flex';
            if (previewPane) previewPane.style.display = 'flex';
        });

        btnEdit?.addEventListener('click', () => {
            btnEdit.classList.add('active');
            btnSplit?.classList.remove('active');
            btnPreview?.classList.remove('active');
            if (splitContainer) splitContainer.style.gridTemplateColumns = '1fr';
            if (editorPane) editorPane.style.display = 'flex';
            if (previewPane) previewPane.style.display = 'none';
        });

        btnPreview?.addEventListener('click', () => {
            btnPreview.classList.add('active');
            btnSplit?.classList.remove('active');
            btnEdit?.classList.remove('active');
            if (splitContainer) splitContainer.style.gridTemplateColumns = '1fr';
            if (editorPane) editorPane.style.display = 'none';
            if (previewPane) previewPane.style.display = 'flex';
        });

        // Dossier Snippet Insertion Buttons
        document.getElementById('btnInsertFormula')?.addEventListener('click', () => insertNoteSnippet('formula'));
        document.getElementById('btnInsertInlineMath')?.addEventListener('click', () => insertNoteSnippet('inline_math'));
        document.getElementById('btnInsertH2')?.addEventListener('click', () => insertNoteSnippet('h2'));
        document.getElementById('btnInsertBullet')?.addEventListener('click', () => insertNoteSnippet('bullet'));

        // Add Criteria
        document.getElementById('btnAddCriterion')?.addEventListener('click', addCriteriaFromInput);
        document.getElementById('newCriterionInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCriteriaFromInput();
            }
        });

        // Template select
        document.getElementById('templatePresetSelect')?.addEventListener('change', (e) => {
            const key = e.target.value;
            if (key && STARTER_TEMPLATES[key]) {
                loadDefaultTemplate(key);
                const meta = TEMPLATE_METADATA[key];
                if (meta) {
                    const engSelect = document.getElementById('simulationEngineSelect');
                    if (engSelect) engSelect.value = meta.engine;
                    const domSelect = document.getElementById('expDomain');
                    if (domSelect) domSelect.value = meta.domain;
                    const domLabel = document.getElementById('expDomainLabel');
                    if (domLabel) domLabel.value = meta.domainLabel;
                    if (meta.params) {
                        parameterSchema = JSON.parse(JSON.stringify(meta.params));
                        initDefaultValues();
                        renderParameterSchemaList();
                        renderLiveParameterSliders();
                    }
                }
                runLiveSimulation();
                showToast(`Loaded starter preset: ${key}`);
            }
        });

        // Engine select manual change
        document.getElementById('simulationEngineSelect')?.addEventListener('change', () => {
            runLiveSimulation();
        });

        // Add / Edit Parameter Modal
        const addParamModal = document.getElementById('addParamModal');
        document.getElementById('btnOpenAddParamModal')?.addEventListener('click', () => {
            openAddParamModal();
        });
        document.getElementById('btnCloseAddParamModal')?.addEventListener('click', () => {
            if (addParamModal) addParamModal.style.display = 'none';
        });

        // Close on backdrop click
        addParamModal?.addEventListener('click', (e) => {
            if (e.target === addParamModal) {
                addParamModal.style.display = 'none';
            }
        });

        // Keyboard shortcuts inside modal: Enter to submit, Escape to close
        addParamModal?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT') {
                e.preventDefault();
                document.getElementById('btnConfirmAddParam')?.click();
            } else if (e.key === 'Escape') {
                addParamModal.style.display = 'none';
            }
        });

        document.getElementById('btnConfirmAddParam')?.addEventListener('click', () => {
            const editIdxInput = document.getElementById('editingParamIndex');
            const editingIdx = editIdxInput ? parseInt(editIdxInput.value, 10) : -1;
            const isEditing = !isNaN(editingIdx) && editingIdx >= 0 && editingIdx < parameterSchema.length;

            const key = document.getElementById('newParamKey')?.value?.trim();
            const label = document.getElementById('newParamLabel')?.value?.trim();
            const defVal = parseFloat(document.getElementById('newParamDefault')?.value || 0);
            const minVal = parseFloat(document.getElementById('newParamMin')?.value || 0);
            const maxVal = parseFloat(document.getElementById('newParamMax')?.value || 100);
            const stepVal = parseFloat(document.getElementById('newParamStep')?.value || 1);
            const unit = document.getElementById('newParamUnit')?.value?.trim() || '';

            if (!key || !label) {
                showToast('Please provide both Parameter Key and Label.');
                return;
            }

            // Enforce valid JavaScript identifier syntax for key (e.g. 'velocity', 'dragCoeff', 'v0')
            const JS_IDENTIFIER_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
            if (!JS_IDENTIFIER_REGEX.test(key)) {
                const keyInput = document.getElementById('newParamKey');
                const errHint = document.getElementById('paramKeyErrorHint');
                if (keyInput) keyInput.style.borderColor = '#ef4444';
                if (errHint) errHint.style.display = 'block';
                showToast('Parameter Key must be a valid JS identifier (e.g. "velocity", "dragCoeff"). No spaces or hyphens.');
                keyInput?.focus();
                return;
            }

            if (minVal >= maxVal) {
                showToast('Min value must be less than Max value.');
                return;
            }

            if (stepVal <= 0) {
                showToast('Step value must be greater than 0.');
                return;
            }

            if (isEditing) {
                const oldParam = parameterSchema[editingIdx];
                const oldKey = oldParam.key;

                // Check key collision if key changed
                if (oldKey !== key && parameterSchema.some((p, i) => i !== editingIdx && p.key === key)) {
                    showToast(`Parameter with key "${key}" already exists.`);
                    return;
                }

                // Update parameter schema definition
                parameterSchema[editingIdx] = {
                    key: key,
                    label: label,
                    default: defVal,
                    min: minVal,
                    max: maxVal,
                    step: stepVal,
                    unit: unit
                };

                // Migrate or sync activeParamValues
                if (oldKey !== key) {
                    delete activeParamValues[oldKey];
                }
                // When edited, set active value to the newly configured default value (clamped to bounds)
                activeParamValues[key] = Math.max(minVal, Math.min(maxVal, defVal));

                if (addParamModal) addParamModal.style.display = 'none';

                renderParameterSchemaList();
                renderLiveParameterSliders();
                // Send real-time message or refresh simulation
                const iframe = document.getElementById('previewSandboxFrame');
                if (iframe && iframe.contentWindow) {
                    try {
                        iframe.contentWindow.postMessage({ type: 'UPDATE_PARAMS', params: activeParamValues }, '*');
                    } catch (err) {
                        runLiveSimulation();
                    }
                } else {
                    runLiveSimulation();
                }
                saveDraftToLocal();
                showToast(`Updated parameter: ${label}`);
            } else {
                if (parameterSchema.some(p => p.key === key)) {
                    showToast(`Parameter with key "${key}" already exists.`);
                    return;
                }

                parameterSchema.push({
                    key: key,
                    label: label,
                    default: defVal,
                    min: minVal,
                    max: maxVal,
                    step: stepVal,
                    unit: unit
                });

                activeParamValues[key] = defVal;

                if (addParamModal) addParamModal.style.display = 'none';

                // Clear inputs
                document.getElementById('newParamKey').value = '';
                document.getElementById('newParamLabel').value = '';

                renderParameterSchemaList();
                renderLiveParameterSliders();
                const iframe = document.getElementById('previewSandboxFrame');
                if (iframe && iframe.contentWindow) {
                    try {
                        iframe.contentWindow.postMessage({ type: 'UPDATE_PARAMS', params: activeParamValues }, '*');
                    } catch (err) {
                        runLiveSimulation();
                    }
                } else {
                    runLiveSimulation();
                }
                saveDraftToLocal();
                showToast(`Added parameter: ${label}`);
            }
        });

        // Reset all live sliders to their configured schema defaults
        document.getElementById('btnResetLiveSliders')?.addEventListener('click', () => {
            parameterSchema.forEach(p => {
                activeParamValues[p.key] = p.default;
            });
            renderParameterSchemaList();
            renderLiveParameterSliders();
            const iframe = document.getElementById('previewSandboxFrame');
            if (iframe && iframe.contentWindow) {
                try {
                    iframe.contentWindow.postMessage({ type: 'UPDATE_PARAMS', params: activeParamValues }, '*');
                } catch (err) {
                    runLiveSimulation();
                }
            } else {
                runLiveSimulation();
            }
            showToast('Reset all sliders to configured defaults');
        });

        // Set current live slider positions as new defaults in the schema
        document.getElementById('btnSyncSlidersToDefaults')?.addEventListener('click', () => {
            let changedCount = 0;
            parameterSchema.forEach(p => {
                if (activeParamValues[p.key] !== undefined && activeParamValues[p.key] !== p.default) {
                    p.default = activeParamValues[p.key];
                    changedCount++;
                }
            });
            renderParameterSchemaList();
            saveDraftToLocal();
            showToast(changedCount > 0 ? `Saved current slider values as default parameters (${changedCount} updated)` : 'Slider values already match schema defaults');
        });

        // Live validation for parameter key input in modal
        const keyInput = document.getElementById('newParamKey');
        const keyErrHint = document.getElementById('paramKeyErrorHint');
        keyInput?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (val && !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(val)) {
                keyInput.style.borderColor = '#ef4444';
                if (keyErrHint) keyErrHint.style.display = 'block';
            } else {
                keyInput.style.borderColor = 'var(--editor-border)';
                if (keyErrHint) keyErrHint.style.display = 'none';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEditor);
    } else {
        initEditor();
    }

})(window, document);
