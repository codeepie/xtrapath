// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/two_handler.js

/**
 * Two.js (2D Vector Motion & Procedural Graphics Engine) Handler
 * Renders Two.js vector scenes, geometric shapes, and path animations inside an isolated sandbox iframe.
 */

window.twoTemplates = {
    'geometric_starburst': `// --- Two.js: Geometric Starburst & Neon Rings ---
// Available in scope: two, Two, width, height, container

const cx = width / 2;
const cy = height / 2;

// 1. Center Glowing Core
const core = two.makeCircle(cx, cy, 32);
core.fill = '#3b82f6';
core.stroke = '#60a5fa';
core.linewidth = 4;

// 2. Multi-Layered Rotating Polygons
const polyLayers = [];
const layerCount = 6;

for (let i = 0; i < layerCount; i++) {
    const radius = 60 + i * 45;
    const sides = 3 + i;
    const poly = two.makePolygon(cx, cy, radius, sides);
    poly.fill = 'transparent';
    poly.stroke = 'hsl(' + (i * 45 + 190) + ', 85%, 65%)';
    poly.linewidth = 2.5;
    polyLayers.push({ shape: poly, speed: (i % 2 === 0 ? 0.015 : -0.012) * (1 + i * 0.15) });
}

// 3. Orbiting Star Accents
const stars = [];
for (let s = 0; s < 8; s++) {
    const angle = (s / 8) * Math.PI * 2;
    const star = two.makeStar(cx + Math.cos(angle) * 260, cy + Math.sin(angle) * 260, 16, 8, 5);
    star.fill = '#ec4899';
    star.stroke = '#f472b6';
    star.linewidth = 2;
    stars.push({ star, angle, baseRadius: 260, speed: 0.02 });
}

// 4. Animation Loop
two.bind('update', function(frameCount) {
    // Pulse core
    const scale = 1 + Math.sin(frameCount * 0.05) * 0.18;
    core.scale = scale;

    // Rotate polygons
    polyLayers.forEach(layer => {
        layer.shape.rotation += layer.speed;
    });

    // Orbit stars
    stars.forEach((item, idx) => {
        item.angle += item.speed;
        item.star.translation.x = cx + Math.cos(item.angle) * item.baseRadius;
        item.star.translation.y = cy + Math.sin(item.angle) * item.baseRadius;
        item.star.rotation += 0.04;
    });
}).play();`,

    'orbital_gears': `// --- Two.js: Synchronized Mechanical Vector Gears ---
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

    const outer = two.makePolygon(0, 0, radius, teeth * 2);
    outer.vertices = points;
    outer.fill = 'transparent';
    outer.stroke = color;
    outer.linewidth = 3.5;
    group.add(outer);

    const inner = two.makeCircle(0, 0, radius * 0.45);
    inner.fill = 'transparent';
    inner.stroke = color;
    inner.linewidth = 2;
    group.add(inner);

    const hub = two.makeCircle(0, 0, radius * 0.16);
    hub.fill = color;
    hub.noStroke();
    group.add(hub);

    group.translation.set(x, y);
    return group;
}

const gear1 = createGear(cx - 130, cy, 110, 16, '#38bdf8');
const gear2 = createGear(cx + 110, cy, 80, 12, '#ec4899');
const gear3 = createGear(cx - 10, cy + 150, 70, 10, '#a855f7');

two.bind('update', function(frameCount) {
    gear1.rotation += 0.015;
    gear2.rotation -= 0.02;
    gear3.rotation -= 0.024;
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
