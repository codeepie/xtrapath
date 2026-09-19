// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/two_handler.js

/**
 * Two.js (2D Vector Motion & Procedural Graphics Engine) Handler
 * Renders Two.js vector scenes, geometric shapes, and path animations inside an isolated sandbox iframe.
 */

window.twoTemplates = {
    'geometric_starburst': `// --- Two.js: Hypnotic Geometric Starburst & Neon Kaleidoscope ---
// Available in scope: two, Two, width, height, container

const cx = width / 2;
const cy = height / 2;

// 1. Center Glowing Core & Ambient Aura
const aura = two.makeCircle(cx, cy, 90);
aura.fill = 'rgba(59, 130, 246, 0.08)';
aura.noStroke();

const core = two.makeCircle(cx, cy, 28);
core.fill = '#38bdf8';
core.stroke = '#93c5fd';
core.linewidth = 3;

// 2. Multi-Layered Rotating Polygons (Kaleidoscopic Geometry)
const polyLayers = [];
const layerCount = 7;

for (let i = 0; i < layerCount; i++) {
    const radius = 55 + i * 42;
    const sides = 3 + i;
    const poly = two.makePolygon(cx, cy, radius, sides);
    poly.fill = 'transparent';
    const hue = (i * 38 + 195) % 360;
    poly.stroke = 'hsl(' + hue + ', 90%, 65%)';
    poly.linewidth = 2.2;
    polyLayers.push({
        shape: poly,
        baseRadius: radius,
        speed: (i % 2 === 0 ? 0.012 : -0.01) * (1 + i * 0.12),
        pulseOffset: i * 0.45
    });
}

// 3. Orbiting Star Satellites with Dual-Track Precession
const stars = [];
const starCount = 12;

for (let s = 0; s < starCount; s++) {
    const angle = (s / starCount) * Math.PI * 2;
    const isOuter = s % 2 === 0;
    const dist = isOuter ? 280 : 200;
    const star = two.makeStar(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 16, 7, 5);
    const starHue = isOuter ? 325 : 165;
    star.fill = 'hsl(' + starHue + ', 85%, 60%)';
    star.stroke = '#ffffff';
    star.linewidth = 1.5;
    stars.push({
        star: star,
        angle: angle,
        baseRadius: dist,
        speed: isOuter ? 0.018 : -0.022,
        rotSpeed: isOuter ? 0.04 : -0.05
    });
}

// 4. Harmonic Animation Loop
two.bind('update', function(frameCount) {
    const time = frameCount * 0.035;

    // Breathing Core & Aura Pulse
    core.scale = 1 + Math.sin(time * 1.5) * 0.18;
    aura.scale = 1 + Math.sin(time) * 0.25;

    // Synchronized Polygon Rotations & Dynamic Radii
    polyLayers.forEach(layer => {
        layer.shape.rotation += layer.speed;
        const breath = 1 + Math.sin(time + layer.pulseOffset) * 0.04;
        layer.shape.scale = breath;
    });

    // Orbiting Star Precession
    stars.forEach(item => {
        item.angle += item.speed;
        const r = item.baseRadius + Math.sin(time * 2 + item.angle) * 15;
        item.star.translation.x = cx + Math.cos(item.angle) * r;
        item.star.translation.y = cy + Math.sin(item.angle) * r;
        item.star.rotation += item.rotSpeed;
    });
}).play();`,

    'vector_vortex': `// --- Two.js: Vector Particle Vortex & Nebula Orbit ---
// Available in scope: two, Two, width, height, container

const cx = width / 2;
const cy = height / 2;

// 1. Deep Space Boundary Rings
const rings = [];
const ringCount = 5;
for (let i = 0; i < ringCount; i++) {
    const r = 90 + i * 55;
    const circle = two.makeCircle(cx, cy, r);
    circle.fill = 'transparent';
    circle.stroke = 'rgba(129, 140, 248, ' + (0.12 + i * 0.04) + ')';
    circle.linewidth = 1.5;
    rings.push({ circle, baseRadius: r, speed: (i % 2 === 0 ? 0.008 : -0.006) });
}

// 2. Swirling Particle Vortex Nodes
const particles = [];
const particleCount = 28;
for (let p = 0; p < particleCount; p++) {
    const t = p / particleCount;
    const initialAngle = t * Math.PI * 4;
    const dist = 60 + t * 240;
    const size = 3 + (1 - t) * 6;
    const node = two.makeCircle(cx, cy, size);
    const hue = (t * 260 + 180) % 360;
    node.fill = 'hsl(' + hue + ', 95%, 65%)';
    node.stroke = '#ffffff';
    node.linewidth = 1;
    particles.push({
        node,
        angle: initialAngle,
        radius: dist,
        baseRadius: dist,
        speed: 0.015 + (1 - t) * 0.035,
        wobbleFreq: 2 + p * 0.2
    });
}

// 3. Central Singularity Eye
const singularity = two.makeCircle(cx, cy, 36);
singularity.fill = '#0f172a';
singularity.stroke = '#38bdf8';
singularity.linewidth = 3;

const innerDot = two.makeCircle(cx, cy, 10);
innerDot.fill = '#f43f5e';
innerDot.noStroke();

// 4. Vortex Dynamics Loop
two.bind('update', function(frameCount) {
    const time = frameCount * 0.04;

    singularity.scale = 1 + Math.sin(time * 2) * 0.12;
    innerDot.scale = 1 + Math.cos(time * 3) * 0.25;

    rings.forEach(r => {
        r.circle.rotation += r.speed;
    });

    particles.forEach((p, idx) => {
        p.angle += p.speed;
        const radialWobble = Math.sin(time * 1.5 + p.angle * 2) * 16;
        const currentR = p.baseRadius + radialWobble;
        p.node.translation.x = cx + Math.cos(p.angle) * currentR;
        p.node.translation.y = cy + Math.sin(p.angle) * currentR;
        const pulse = 1 + Math.sin(time * 3 + idx) * 0.25;
        p.node.scale = pulse;
    });
}).play();`,

    'morphing_curve': `// --- Two.js: Undulating Harmonic Bézier Wave Ribbon ---
// Available in scope: two, Two, width, height, container

const cx = width / 2;
const cy = height / 2;
const pointCount = 14;
const segmentWidth = (width + 120) / (pointCount - 1);

// 1. Construct Two Dual Sine Wave Ribbons
function makeWavePath(strokeColor, fillColor) {
    const anchors = [];
    for (let i = 0; i < pointCount; i++) {
        const x = -60 + i * segmentWidth;
        const y = cy;
        anchors.push(new Two.Anchor(x, y));
    }
    const path = two.makeCurve(anchors, false);
    path.fill = fillColor;
    path.stroke = strokeColor;
    path.linewidth = 4;
    path.cap = 'round';
    path.join = 'round';
    return { path, anchors };
}

const wave1 = makeWavePath('#38bdf8', 'transparent');
const wave2 = makeWavePath('#ec4899', 'transparent');
wave2.path.linewidth = 2.5;

// 2. Beacon Nodes riding along peaks
const beacons = [];
for (let b = 0; b < 4; b++) {
    const beacon = two.makeCircle(0, 0, 7);
    beacon.fill = b % 2 === 0 ? '#38bdf8' : '#ec4899';
    beacon.stroke = '#ffffff';
    beacon.linewidth = 2;
    beacons.push({ beacon, targetIndex: 2 + b * 3 });
}

// 3. Harmonic Wave Simulation Loop
two.bind('update', function(frameCount) {
    const time = frameCount * 0.045;

    // Deform wave 1 vertices
    wave1.anchors.forEach((anchor, i) => {
        const offset = i * 0.45;
        const yOffset = Math.sin(time * 1.6 + offset) * 110 + Math.cos(time * 0.8 + offset * 1.5) * 40;
        anchor.y = cy + yOffset;
    });

    // Deform wave 2 vertices with phase lag
    wave2.anchors.forEach((anchor, i) => {
        const offset = i * 0.45;
        const yOffset = Math.sin(time * 1.6 + offset + Math.PI * 0.6) * 95 + Math.sin(time * 1.1 - offset) * 35;
        anchor.y = cy + yOffset;
    });

    // Ride beacons on key anchors
    beacons.forEach((b, idx) => {
        const sourceAnchor = (idx % 2 === 0 ? wave1 : wave2).anchors[b.targetIndex];
        if (sourceAnchor) {
            b.beacon.translation.set(sourceAnchor.x, sourceAnchor.y);
            b.beacon.scale = 1 + Math.sin(time * 3 + idx) * 0.3;
        }
    });
}).play();`,

    'orbital_gears': `// --- Two.js: Synchronized Mechanical Vector Gear Train ---
// Available in scope: two, Two, width, height, container

const cx = width / 2;
const cy = height / 2;

function createGear(x, y, radius, teeth, color) {
    const group = two.makeGroup();
    const points = [];
    const toothDepth = radius * 0.16;
    const numPoints = teeth * 4;

    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const r = (i % 4 === 1 || i % 4 === 2) ? radius + toothDepth : radius;
        points.push(new Two.Anchor(Math.cos(angle) * r, Math.sin(angle) * r));
    }

    // Outer Gear Rim with Involute Teeth
    const outer = two.makePolygon(0, 0, radius, teeth * 2);
    outer.vertices = points;
    outer.fill = 'transparent';
    outer.stroke = color;
    outer.linewidth = 3.5;
    group.add(outer);

    // Spokes Crossbar
    const spokeCount = 4;
    for (let s = 0; s < spokeCount; s++) {
        const spokeAngle = (s / spokeCount) * Math.PI;
        const len = radius * 0.75;
        const line = two.makeLine(
            Math.cos(spokeAngle) * len, Math.sin(spokeAngle) * len,
            -Math.cos(spokeAngle) * len, -Math.sin(spokeAngle) * len
        );
        line.stroke = color;
        line.linewidth = 2;
        group.add(line);
    }

    // Inner Cutout Ring
    const inner = two.makeCircle(0, 0, radius * 0.45);
    inner.fill = 'transparent';
    inner.stroke = color;
    inner.linewidth = 2;
    group.add(inner);

    // Center Hub Bearing
    const hub = two.makeCircle(0, 0, radius * 0.16);
    hub.fill = color;
    hub.noStroke();
    group.add(hub);

    const pin = two.makeCircle(0, 0, radius * 0.06);
    pin.fill = '#090b10';
    pin.noStroke();
    group.add(pin);

    group.translation.set(x, y);
    return group;
}

// 1. Gear Layout with meshing center distances
const gear1 = createGear(cx - 150, cy - 20, 110, 16, '#38bdf8');
const gear2 = createGear(cx + 105, cy - 20, 80, 12, '#ec4899');
const gear3 = createGear(cx - 20, cy + 145, 68, 10, '#a855f7');
const gear4 = createGear(cx + 175, cy + 145, 52, 8, '#34d399');

// 2. Meshed Rotational Speeds (ratio inverted)
const baseSpeed = 0.015;
two.bind('update', function(frameCount) {
    gear1.rotation += baseSpeed;
    gear2.rotation -= baseSpeed * (16 / 12);
    gear3.rotation -= baseSpeed * (16 / 10);
    gear4.rotation += baseSpeed * (16 / 8);
}).play();`
};

window.twoTemplate = window.twoTemplates.geometric_starburst;

/**
 * Renders Two.js animation inside an isolated HTML document string for an iframe.
 * 
 * @param {string} twoCode The user JavaScript animation code.
 * @param {object} [options={}] Configuration options (width, height, background).
 * @returns {string} The full HTML document source.
 */
window.renderTwo = function(twoCode, options = {}) {
    const width = options.width || 1280;
    const height = options.height || 720;
    const background = options.background || '#090b10';
    let rawCode = (twoCode || '').trim();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Two.js 2D Vector Animation</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
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
        }
        #two-container {
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            background: ${background};
            overflow: hidden;
            margin: 0;
            padding: 0;
        }
        #two-container svg, #two-container canvas {
            display: block;
            width: 100%;
            height: 100%;
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .two-error-box {
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
        .two-error-box strong {
            color: #ef4444;
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div id="two-container"></div>

    <!-- Two.js Core Library -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/two.js/0.8.10/two.min.js"><\/script>

    <script>
        function showError(title, message) {
            const errDiv = document.createElement('div');
            errDiv.className = 'two-error-box';
            errDiv.innerHTML = '<strong>' + title + '</strong>' + 
                (message ? String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
            document.body.appendChild(errDiv);
        }

        window.onerror = function(msg, url, line, col, error) {
            showError("Two.js Runtime Error", (msg || error) + (line ? " (Line " + line + ")" : ""));
        };

        const container = document.getElementById('two-container');
        const width = ${width};
        const height = ${height};

        try {
            const twoLib = window.Two || (typeof Two !== 'undefined' ? Two : null);
            if (!twoLib) {
                throw new Error("Two.js library failed to load from CDN. Please check your internet connection.");
            }
            const two = new twoLib({
                width: width,
                height: height,
                type: twoLib.Types.svg
            }).appendTo(container);

            if (two.renderer && two.renderer.domElement) {
                two.renderer.domElement.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
                two.renderer.domElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                two.renderer.domElement.style.width = '100%';
                two.renderer.domElement.style.height = '100%';
                two.renderer.domElement.style.maxWidth = '100%';
                two.renderer.domElement.style.maxHeight = '100%';
            }

            ${rawCode ? rawCode : `two.makeCircle(width/2, height/2, 60).fill = '#3b82f6'; two.update();`}
        } catch (err) {
            console.error("Two.js Execution Error:", err);
            showError("Two.js Execution Error", err.stack || err.message || String(err));
        }
    <\/script>
</body>
</html>`;
};

/**
 * Generates an interactive post card iframe for feed, reels, and profiles.
 * 
 * @param {string} code The raw Two.js code.
 * @param {number} [width=1280]
 * @param {number} [height=720]
 * @returns {string} The HTML string containing an interactive iframe.
 */
window.renderTwoPostContent = function(code, width = 1280, height = 720) {
    if (!code) return '';
    const srcDoc = window.renderTwo(code, { width, height });
    return `<div class="post-preview-container" style="position: relative; width: 100%; padding-top: 56.25%; background: #090b10; border-radius: 8px; overflow: hidden;">
        <iframe 
            srcdoc="${srcDoc.replace(/"/g, '&quot;')}"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
            sandbox="allow-scripts allow-same-origin"
            loading="lazy">
        </iframe>
    </div>`;
};
