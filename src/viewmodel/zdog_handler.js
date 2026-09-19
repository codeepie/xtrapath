// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/zdog_handler.js

/**
 * Zdog (Pseudo-3D Vector Illustration & Animation Engine) Handler
 * Renders Zdog canvas/SVG 3D scenes inside an interactive iframe with full drag-to-rotate support.
 * 
 * @param {string} zdogCode The raw JavaScript code creating 3D shapes with Zdog.
 * @param {object|string} [options={}] Configuration options (e.g. background, zoom).
 * @returns {string} The full HTML document source for an iframe.
 */
window.zdogTemplates = {
    'cyber_gem': `// --- Zdog 3D: Kinetic Orbiting Cyber-Gem ---
// Drag with mouse or touch to rotate the 3D scene in real-time!

const illo = new Zdog.Illustration({
    element: '.zdog-canvas',
    dragRotate: true,
    zoom: 1.2,
    rotate: { x: -Zdog.TAU / 12, y: Zdog.TAU / 8 },
    onDragStart: function() {
        isSpinning = false;
    }
});
window.illo = illo;

let isSpinning = true;

// 1. Central Floating Gem Group
const gemGroup = new Zdog.Group({
    addTo: illo,
    translate: { y: 0 }
});

// Polyhedron Core
new Zdog.Box({
    addTo: gemGroup,
    width: 64,
    height: 64,
    depth: 64,
    stroke: false,
    color: '#6366f1',
    leftFace: '#4f46e5',
    rightFace: '#4338ca',
    topFace: '#818cf8',
    bottomFace: '#3730a3'
});

// Inner Glowing Core
new Zdog.Shape({
    addTo: gemGroup,
    stroke: 28,
    color: '#38bdf8'
});

// 2. Multi-Axis Orbiting Rings
const ring1 = new Zdog.Ellipse({
    addTo: illo,
    diameter: 140,
    stroke: 4,
    color: '#06b6d4',
    rotate: { x: Zdog.TAU / 4, y: Zdog.TAU / 8 }
});

const ring2 = new Zdog.Ellipse({
    addTo: illo,
    diameter: 180,
    stroke: 3,
    color: '#ec4899',
    rotate: { x: -Zdog.TAU / 6, z: Zdog.TAU / 6 }
});

// 3. Orbiting Satellite Spheres
new Zdog.Shape({
    addTo: ring1,
    translate: { x: 70 },
    stroke: 16,
    color: '#f43f5e'
});

new Zdog.Shape({
    addTo: ring2,
    translate: { x: 90 },
    stroke: 14,
    color: '#a855f7'
});

new Zdog.Shape({
    addTo: ring2,
    translate: { x: -90 },
    stroke: 12,
    color: '#38bdf8'
});

// 4. Background Star Dust Field
const starGroup = new Zdog.Group({ addTo: illo });
for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Zdog.TAU;
    const distance = 110 + (i % 3) * 25;
    const zOffset = ((i % 5) - 2) * 35;
    new Zdog.Shape({
        addTo: starGroup,
        translate: {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance * 0.6,
            z: zOffset
        },
        stroke: (i % 2 === 0) ? 5 : 3,
        color: (i % 2 === 0) ? '#fbbf24' : '#e2e8f0'
    });
}

// 5. Kinetic Animation Loop
let ticker = 0;
function animate() {
    ticker += 0.02;

    if (isSpinning) {
        illo.rotate.y += 0.012;
        illo.rotate.x = Math.sin(ticker * 0.5) * 0.15 - 0.2;
    }

    // Dynamic bobbing and ring rotation
    gemGroup.translate.y = Math.sin(ticker) * 8;
    gemGroup.rotate.y += 0.01;
    ring1.rotate.z += 0.02;
    ring2.rotate.z -= 0.015;

    illo.updateRenderGraph();
    requestAnimationFrame(animate);
}
animate();
`,

    'robot_mascot': `// --- Zdog 3D: Kinetic Cute Robot Mascot ---
// Drag with mouse or touch to inspect in 3D!

const illo = new Zdog.Illustration({
    element: '.zdog-canvas',
    dragRotate: true,
    zoom: 1.15,
    rotate: { x: -0.15, y: 0.3 }
});
window.illo = illo;

// 1. Robot Body Group
const bot = new Zdog.Group({ addTo: illo, translate: { y: 10 } });

// Torso Cylinder
const torso = new Zdog.Cylinder({
    addTo: bot,
    diameter: 76,
    length: 70,
    stroke: false,
    color: '#38bdf8',
    frontFace: '#0284c7',
    rotate: { x: Zdog.TAU / 4 }
});

// Chest Screen Badge
new Zdog.Rect({
    addTo: bot,
    width: 38,
    height: 24,
    stroke: 3,
    color: '#0f172a',
    fill: true,
    translate: { z: 40, y: -2 }
});

// Heartbeat indicator on screen
new Zdog.Shape({
    addTo: bot,
    path: [{ x: -12, y: 0 }, { x: -4, y: 0 }, { x: 0, y: -6 }, { x: 4, y: 6 }, { x: 8, y: 0 }, { x: 12, y: 0 }],
    closed: false,
    stroke: 2,
    color: '#4ade80',
    translate: { z: 42, y: -2 }
});

// 2. Robot Head
const headGroup = new Zdog.Group({ addTo: bot, translate: { y: -65 } });

// Spherical Head
new Zdog.Hemisphere({
    addTo: headGroup,
    diameter: 64,
    stroke: false,
    color: '#e0f2fe',
    rotate: { x: -Zdog.TAU / 4 }
});
new Zdog.Hemisphere({
    addTo: headGroup,
    diameter: 64,
    stroke: false,
    color: '#bae6fd',
    rotate: { x: Zdog.TAU / 4 }
});

// Visor Screen
new Zdog.RoundedRect({
    addTo: headGroup,
    width: 44,
    height: 18,
    cornerRadius: 8,
    stroke: 2,
    color: '#09090b',
    fill: true,
    translate: { z: 32 }
});

// Cyan Glowing Eyes
new Zdog.Shape({
    addTo: headGroup,
    stroke: 6,
    color: '#38bdf8',
    translate: { x: -11, z: 34 }
});
new Zdog.Shape({
    addTo: headGroup,
    stroke: 6,
    color: '#38bdf8',
    translate: { x: 11, z: 34 }
});

// Antenna Stem & Pulsing Beacon
new Zdog.Shape({
    addTo: headGroup,
    path: [{ y: -32 }, { y: -50 }],
    stroke: 3,
    color: '#64748b'
});
const beacon = new Zdog.Shape({
    addTo: headGroup,
    stroke: 10,
    color: '#f43f5e',
    translate: { y: -54 }
});

// 3. Articulated Arms
const leftArm = new Zdog.Shape({
    addTo: bot,
    path: [{ x: -46, y: -20 }, { x: -62, y: 0 }, { x: -55, y: 22 }],
    closed: false,
    stroke: 10,
    color: '#0284c7'
});

const rightArm = new Zdog.Shape({
    addTo: bot,
    path: [{ x: 46, y: -20 }, { x: 62, y: 0 }, { x: 55, y: 22 }],
    closed: false,
    stroke: 10,
    color: '#0284c7'
});

// 4. Hover Thruster Base
new Zdog.Cone({
    addTo: bot,
    diameter: 46,
    length: 24,
    stroke: false,
    color: '#475569',
    translate: { y: 46 },
    rotate: { x: Zdog.TAU / 4 }
});
const thrusterFlame = new Zdog.Cone({
    addTo: bot,
    diameter: 28,
    length: 28,
    stroke: false,
    color: '#f59e0b',
    translate: { y: 68 },
    rotate: { x: Zdog.TAU / 4 }
});

// 5. Animation Loop
let ticker = 0;
function animate() {
    ticker += 0.03;
    bot.translate.y = Math.sin(ticker * 2) * 8;
    headGroup.rotate.y = Math.sin(ticker) * 0.25;
    leftArm.rotate.x = Math.sin(ticker * 2) * 0.35;
    rightArm.rotate.x = -Math.sin(ticker * 2) * 0.35;
    thrusterFlame.length = 24 + Math.sin(ticker * 8) * 8;
    beacon.stroke = 9 + Math.sin(ticker * 4) * 3;

    illo.rotate.y += 0.008;
    illo.updateRenderGraph();
    requestAnimationFrame(animate);
}
animate();
`,

    'polyhedral_star': `// --- Zdog 3D: Geometric Polyhedral Sacred Star ---
// Drag with mouse or touch to rotate!

const illo = new Zdog.Illustration({
    element: '.zdog-canvas',
    dragRotate: true,
    zoom: 1.25,
    rotate: { x: -0.3, y: 0.4 }
});
window.illo = illo;

// 1. Central Sacred Icosahedron Cage
const cage = new Zdog.Group({ addTo: illo });

// Polyhedral Anchor Spikes
const colors = ['#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#38bdf8', '#10b981', '#f59e0b'];
const spikes = [];
const numSpikes = 12;

for (let i = 0; i < numSpikes; i++) {
    const phi = Math.acos(-1 + (2 * i) / numSpikes);
    const theta = Math.sqrt(numSpikes * Math.PI) * phi;
    const x = Math.cos(theta) * Math.sin(phi);
    const y = Math.sin(theta) * Math.sin(phi);
    const z = Math.cos(phi);

    const spikeGroup = new Zdog.Group({
        addTo: cage,
        rotate: {
            x: Math.atan2(Math.hypot(x, y), z),
            y: Math.atan2(y, x)
        }
    });

    const cone = new Zdog.Cone({
        addTo: spikeGroup,
        diameter: 24,
        length: 64,
        stroke: false,
        color: colors[i % colors.length],
        translate: { z: 42 }
    });

    const sphere = new Zdog.Shape({
        addTo: spikeGroup,
        stroke: 10,
        color: '#ffffff',
        translate: { z: 108 }
    });

    spikes.push({ cone, sphere, baseLen: 64, phase: i * 0.5 });
}

// 2. Core Octahedron
new Zdog.Box({
    addTo: cage,
    width: 36,
    height: 36,
    depth: 36,
    stroke: false,
    color: '#ffffff',
    leftFace: '#cbd5e1',
    rightFace: '#94a3b8',
    topFace: '#f8fafc',
    bottomFace: '#64748b'
});

// 3. Orbiting Gyro Track
const orbit = new Zdog.Ellipse({
    addTo: illo,
    diameter: 250,
    stroke: 2,
    color: 'rgba(56, 189, 248, 0.4)',
    rotate: { x: Zdog.TAU / 3 }
});

const satellite = new Zdog.Shape({
    addTo: orbit,
    stroke: 14,
    color: '#38bdf8',
    translate: { x: 125 }
});

// 4. Kinetic Animation Loop
let ticker = 0;
function animate() {
    ticker += 0.02;

    cage.rotate.x += 0.01;
    cage.rotate.y += 0.015;
    cage.rotate.z += 0.008;

    orbit.rotate.z -= 0.025;
    satellite.stroke = 12 + Math.sin(ticker * 3) * 4;

    spikes.forEach(s => {
        s.cone.length = s.baseLen + Math.sin(ticker * 2 + s.phase) * 12;
    });

    illo.updateRenderGraph();
    requestAnimationFrame(animate);
}
animate();
`,

    'retro_ship': `// --- Zdog 3D: Retro Arcade Vector Starship ---
// Drag to orbit around the fighter ship in 3D!

const illo = new Zdog.Illustration({
    element: '.zdog-canvas',
    dragRotate: true,
    zoom: 1.2,
    rotate: { x: -0.2, y: 0.5 }
});
window.illo = illo;

// 1. Ship Group
const ship = new Zdog.Group({ addTo: illo });

// Main Cockpit Fuselage
new Zdog.Cone({
    addTo: ship,
    diameter: 44,
    length: 120,
    stroke: false,
    color: '#0284c7',
    rotate: { x: Zdog.TAU / 4 },
    translate: { z: 20 }
});

// Canopy Glass
new Zdog.Hemisphere({
    addTo: ship,
    diameter: 28,
    stroke: false,
    color: '#38bdf8',
    translate: { y: -16, z: 20 },
    rotate: { x: -0.2 }
});

// Left Swept Wing
new Zdog.Shape({
    addTo: ship,
    path: [
        { x: -16, y: 0, z: 30 },
        { x: -90, y: 4, z: -40 },
        { x: -80, y: 4, z: -55 },
        { x: -16, y: 0, z: -35 }
    ],
    fill: true,
    stroke: 3,
    color: '#0ea5e9'
});

// Right Swept Wing
new Zdog.Shape({
    addTo: ship,
    path: [
        { x: 16, y: 0, z: 30 },
        { x: 90, y: 4, z: -40 },
        { x: 80, y: 4, z: -55 },
        { x: 16, y: 0, z: -35 }
    ],
    fill: true,
    stroke: 3,
    color: '#0ea5e9'
});

// Wingtip Laser Cannons
new Zdog.Cylinder({
    addTo: ship,
    diameter: 6,
    length: 42,
    stroke: false,
    color: '#f43f5e',
    translate: { x: -88, y: 4, z: -30 }
});
new Zdog.Cylinder({
    addTo: ship,
    diameter: 6,
    length: 42,
    stroke: false,
    color: '#f43f5e',
    translate: { x: 88, y: 4, z: -30 }
});

// Dual Jet Thrusters
const thrusterL = new Zdog.Cone({
    addTo: ship,
    diameter: 22,
    length: 35,
    stroke: false,
    color: '#fb923c',
    translate: { x: -22, y: 0, z: -50 },
    rotate: { x: -Zdog.TAU / 4 }
});
const thrusterR = new Zdog.Cone({
    addTo: ship,
    diameter: 22,
    length: 35,
    stroke: false,
    color: '#fb923c',
    translate: { x: 22, y: 0, z: -50 },
    rotate: { x: -Zdog.TAU / 4 }
});

// 2. Flight Animation Loop
let ticker = 0;
function animate() {
    ticker += 0.035;

    // Banking flight motion
    ship.translate.y = Math.sin(ticker) * 12;
    ship.rotate.z = Math.sin(ticker * 0.7) * 0.2;
    ship.rotate.x = Math.sin(ticker * 0.5) * 0.1;

    // Flickering engine exhaust flames
    const flameFlicker = 30 + Math.sin(ticker * 12) * 8;
    thrusterL.length = flameFlicker;
    thrusterR.length = flameFlicker;

    illo.rotate.y += 0.008;
    illo.updateRenderGraph();
    requestAnimationFrame(animate);
}
animate();
`
};

window.zdogTemplate = window.zdogTemplates.cyber_gem;

window.renderZdog = function(zdogCode, options = {}) {
    let background = '#0a0d14';

    if (typeof options === 'object' && options !== null) {
        if (options.background) background = options.background;
    }

    const rawCode = (zdogCode || '').trim();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Zdog 3D Vector Illustration</title>
    
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: ${background};
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            touch-action: none;
        }
        #zdog-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            background: ${background};
        }
        canvas, .zdog-canvas, svg, .zdog-svg {
            display: block;
            max-width: 100%;
            max-height: 100%;
            cursor: grab;
            object-fit: contain;
        }
        canvas:active, .zdog-canvas:active, svg:active, .zdog-svg:active {
            cursor: grabbing;
        }
        .zdog-error-box {
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            color: #f87171;
            background: rgba(24, 24, 27, 0.95);
            border: 1px solid rgba(239, 68, 68, 0.4);
            border-radius: 10px;
            padding: 16px 20px;
            font-size: 13px;
            font-family: ui-monospace, Menlo, Monaco, Consolas, monospace;
            white-space: pre-wrap;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
            z-index: 1000;
            line-height: 1.5;
            max-height: 80vh;
            overflow-y: auto;
        }
        .zdog-error-box strong {
            color: #ef4444;
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div id="zdog-container">
        <canvas id="zdog-canvas" class="zdog-canvas" width="600" height="600"></canvas>
        <svg id="zdog-svg" class="zdog-svg" width="600" height="600" style="display: none;"></svg>
    </div>

    <!-- Zdog Core Engine Library -->
    <script src="https://cdn.jsdelivr.net/npm/zdog@1/dist/zdog.dist.min.js"><\/script>

    <script>
        function showError(title, message) {
            const errDiv = document.createElement('div');
            errDiv.className = 'zdog-error-box';
            errDiv.innerHTML = '<strong>' + title + '</strong>' + 
                (message ? String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
            document.body.appendChild(errDiv);
        }

        window.onerror = function(msg, url, line, col, error) {
            showError("Zdog Runtime Error", (msg || error) + (line ? " (Line " + line + ")" : ""));
        };

        const canvas = document.getElementById('zdog-canvas');
        const svg = document.getElementById('zdog-svg');

        // Toggle elements if user code specifies SVG target
        const userCode = ${JSON.stringify(rawCode)};
        if (userCode.includes('.zdog-svg') || userCode.includes('#zdog-svg') || userCode.includes("'svg'") || userCode.includes('"svg"')) {
            if (canvas) canvas.style.display = 'none';
            if (svg) svg.style.display = 'block';
        }

        try {
            ${rawCode ? rawCode : `document.getElementById('zdog-container').innerHTML = '<div style="color: #71717a; font-size: 14px;">Write Zdog JavaScript code to render pseudo-3D vector illustrations...</div>';`}
        } catch (err) {
            console.error("Zdog Execution Error:", err);
            showError("Zdog Execution Error:", err.stack || err.message || String(err));
        }

        // Auto re-render on resize if illo exists globally
        window.addEventListener('resize', () => {
            if (window.illo && typeof window.illo.updateRenderGraph === 'function') {
                window.illo.updateRenderGraph();
            }
        });
    <\/script>
</body>
</html>`;
};
