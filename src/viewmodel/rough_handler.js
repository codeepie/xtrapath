// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/rough_handler.js

/**
 * Rough.js (Hand-Drawn & Sketchy Graphic Engine) Handler
 * Renders hand-drawn sketchy 2D canvas/SVG graphics with realistic pencil, chalk, and hachure textures.
 */

window.roughTemplates = {
    'sketch_diagram': `// --- Rough.js: Hand-Drawn System Architecture Diagram ---
// Available in scope: canvas, ctx, rc (rough.canvas instance), width, height

// 1. Draw Sketchy Grid Background & Border
rc.rectangle(20, 20, width - 40, height - 40, {
    roughness: 1.2,
    stroke: '#334155',
    strokeWidth: 2,
    bowing: 1.5
});

// 2. Title Badge
rc.rectangle(width / 2 - 160, 40, 320, 50, {
    roughness: 1.5,
    fill: 'rgba(59, 130, 246, 0.15)',
    fillStyle: 'hachure',
    stroke: '#60a5fa',
    strokeWidth: 2,
    hachureAngle: -35,
    hachureGap: 5
});

ctx.font = 'bold 18px "Courier New", monospace';
ctx.fillStyle = '#93c5fd';
ctx.textAlign = 'center';
ctx.fillText('⚡ DISTRIBUTED PIPELINE', width / 2, 72);

// 3. Service Nodes (Client, API Gateway, Microservice, Database)
const nodes = [
    { x: 120, y: 180, w: 140, h: 80, label: 'WEB CLIENT', fill: 'rgba(236, 72, 153, 0.2)', stroke: '#f472b6', style: 'zigzag' },
    { x: 380, y: 180, w: 160, h: 80, label: 'API GATEWAY', fill: 'rgba(168, 85, 247, 0.2)', stroke: '#c084fc', style: 'cross-hatch' },
    { x: 660, y: 180, w: 160, h: 80, label: 'WORKER CORE', fill: 'rgba(34, 197, 94, 0.2)', stroke: '#4ade80', style: 'dots' },
    { x: 940, y: 180, w: 140, h: 80, label: 'DATABASE', fill: 'rgba(234, 179, 8, 0.2)', stroke: '#facc15', style: 'hachure' }
];

nodes.forEach(node => {
    rc.rectangle(node.x, node.y, node.w, node.h, {
        roughness: 2.0,
        fill: node.fill,
        fillStyle: node.style,
        stroke: node.stroke,
        strokeWidth: 2.5,
        hachureGap: 6
    });

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(node.label, node.x + node.w / 2, node.y + node.h / 2 + 5);
});

// 4. Connecting Sketchy Arrows
const connect = (x1, y1, x2, y2, color) => {
    rc.line(x1, y1, x2, y2, { roughness: 1.8, stroke: color, strokeWidth: 2.5 });
    // Arrow Head
    rc.line(x2, y2, x2 - 12, y2 - 8, { roughness: 1.5, stroke: color, strokeWidth: 2.5 });
    rc.line(x2, y2, x2 - 12, y2 + 8, { roughness: 1.5, stroke: color, strokeWidth: 2.5 });
};

connect(260, 220, 380, 220, '#f472b6');
connect(540, 220, 660, 220, '#c084fc');
connect(820, 220, 940, 220, '#4ade80');

// 5. Cloud Cache Node (Lower Row)
rc.ellipse(width / 2, 400, 280, 110, {
    roughness: 2.5,
    fill: 'rgba(14, 165, 233, 0.2)',
    fillStyle: 'hachure',
    stroke: '#38bdf8',
    strokeWidth: 3,
    hachureAngle: 45,
    hachureGap: 7
});

ctx.fillStyle = '#38bdf8';
ctx.font = 'bold 16px "Courier New", monospace';
ctx.fillText('☁️ REDIS GLOBAL CACHE', width / 2, 405);

connect(460, 260, width / 2 - 40, 345, '#38bdf8');
connect(740, 260, width / 2 + 40, 345, '#38bdf8');
`,

    'hand_drawn_cartoon': `// --- Rough.js: Hand-Drawn Mascot & Sketchbook Character ---
// Available in scope: canvas, ctx, rc, width, height

const cx = width / 2;
const cy = height / 2;

// 1. Outer Head Contour
rc.circle(cx, cy, 260, {
    roughness: 2.8,
    stroke: '#27272a',
    strokeWidth: 4,
    fill: '#fef3c7',
    fillStyle: 'solid'
});

// 2. Ears with Hatching
rc.polygon([
    [cx - 110, cy - 90],
    [cx - 160, cy - 220],
    [cx - 30, cy - 130]
], {
    roughness: 2.2,
    stroke: '#27272a',
    strokeWidth: 3.5,
    fill: 'rgba(244, 63, 94, 0.4)',
    fillStyle: 'hachure',
    hachureAngle: -45,
    hachureGap: 6
});

rc.polygon([
    [cx + 110, cy - 90],
    [cx + 160, cy - 220],
    [cx + 30, cy - 130]
], {
    roughness: 2.2,
    stroke: '#27272a',
    strokeWidth: 3.5,
    fill: 'rgba(244, 63, 94, 0.4)',
    fillStyle: 'hachure',
    hachureAngle: 45,
    hachureGap: 6
});

// 3. Cute Anime Eyes
rc.ellipse(cx - 55, cy - 20, 45, 60, {
    roughness: 1.5,
    stroke: '#18181b',
    strokeWidth: 3,
    fill: '#18181b',
    fillStyle: 'solid'
});

rc.ellipse(cx + 55, cy - 20, 45, 60, {
    roughness: 1.5,
    stroke: '#18181b',
    strokeWidth: 3,
    fill: '#18181b',
    fillStyle: 'solid'
});

// Eye Highlights (Gleams)
rc.circle(cx - 62, cy - 32, 14, { fill: '#ffffff', fillStyle: 'solid', stroke: 'none' });
rc.circle(cx + 48, cy - 32, 14, { fill: '#ffffff', fillStyle: 'solid', stroke: 'none' });

// 4. Nose & Smiling Cat Mouth
rc.polygon([
    [cx - 10, cy + 20],
    [cx + 10, cy + 20],
    [cx, cy + 32]
], {
    roughness: 1.2,
    stroke: '#e11d48',
    strokeWidth: 2,
    fill: '#e11d48',
    fillStyle: 'solid'
});

rc.arc(cx - 22, cy + 42, 45, 30, 0, Math.PI, false, { roughness: 2.0, stroke: '#27272a', strokeWidth: 3 });
rc.arc(cx + 22, cy + 42, 45, 30, 0, Math.PI, false, { roughness: 2.0, stroke: '#27272a', strokeWidth: 3 });

// 5. Cheeks Blush Hatching
rc.rectangle(cx - 105, cy + 25, 45, 20, {
    roughness: 2.2,
    stroke: 'none',
    fill: '#f43f5e',
    fillStyle: 'zigzag',
    hachureGap: 4
});

rc.rectangle(cx + 60, cy + 25, 45, 20, {
    roughness: 2.2,
    stroke: 'none',
    fill: '#f43f5e',
    fillStyle: 'zigzag',
    hachureGap: 4
});

// 6. Whiskers
rc.line(cx - 85, cy + 15, cx - 165, cy + 5, { roughness: 2.2, stroke: '#52525b', strokeWidth: 2.5 });
rc.line(cx - 85, cy + 30, cx - 170, cy + 35, { roughness: 2.2, stroke: '#52525b', strokeWidth: 2.5 });
rc.line(cx + 85, cy + 15, cx + 165, cy + 5, { roughness: 2.2, stroke: '#52525b', strokeWidth: 2.5 });
rc.line(cx + 85, cy + 30, cx + 170, cy + 35, { roughness: 2.2, stroke: '#52525b', strokeWidth: 2.5 });
`,

    'generative_sketch': `// --- Rough.js: Generative Algorithmic Sketch Matrix ---
// Available in scope: canvas, ctx, rc, width, height

const cols = 8;
const rows = 4;
const padding = 70;
const cellW = (width - padding * 2) / cols;
const cellH = (height - padding * 2) / rows;

const styles = ['hachure', 'cross-hatch', 'zigzag', 'dots', 'dashed'];
const colors = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#34d399', '#facc15'];

for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
        const x = padding + c * cellW + cellW / 2;
        const y = padding + r * cellH + cellH / 2;
        const radius = Math.min(cellW, cellH) * 0.72;
        const color = colors[(r * cols + c) % colors.length];
        const fillStyle = styles[(r + c) % styles.length];

        if ((r + c) % 3 === 0) {
            rc.circle(x, y, radius, {
                roughness: 1.8 + Math.sin(r + c),
                fill: color,
                fillStyle: fillStyle,
                stroke: color,
                strokeWidth: 2,
                hachureAngle: (r + c) * 35,
                hachureGap: 5
            });
        } else if ((r + c) % 3 === 1) {
            rc.rectangle(x - radius / 2, y - radius / 2, radius, radius, {
                roughness: 2.2,
                fill: color,
                fillStyle: fillStyle,
                stroke: color,
                strokeWidth: 2,
                hachureAngle: 60,
                hachureGap: 6
            });
        } else {
            rc.polygon([
                [x, y - radius / 2],
                [x + radius / 2, y + radius / 2],
                [x - radius / 2, y + radius / 2]
            ], {
                roughness: 2.0,
                fill: color,
                fillStyle: fillStyle,
                stroke: color,
                strokeWidth: 2,
                hachureAngle: -45,
                hachureGap: 5
            });
        }
    }
}
`
};

window.roughTemplate = window.roughTemplates.sketch_diagram;

/**
 * Renders Rough.js hand-drawn graphics inside an isolated HTML document string for an iframe.
 * 
 * @param {string} roughCode The user JavaScript code using rc (rough.canvas).
 * @param {object} [options={}] Options including width, height, background.
 * @returns {string} The full HTML document source.
 */
window.renderRough = function(roughCode, options = {}) {
    const width = options.width || 1280;
    const height = options.height || 720;
    const background = options.background || '#0e1117';
    const rawCode = (roughCode || '').trim();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Rough.js Hand-Drawn Sketch</title>
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
        #sketch-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            background: ${background};
            overflow: hidden;
        }
        canvas {
            display: block;
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
        }
        .rough-error-box {
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
        .rough-error-box strong {
            color: #ef4444;
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div id="sketch-container">
        <canvas id="rough-canvas" width="${width}" height="${height}"></canvas>
    </div>

    <!-- Rough.js Engine Library -->
    <script src="https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js"><\/script>

    <script>
        function showError(title, message) {
            const errDiv = document.createElement('div');
            errDiv.className = 'rough-error-box';
            errDiv.innerHTML = '<strong>' + title + '</strong>' + 
                (message ? String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
            document.body.appendChild(errDiv);
        }

        window.onerror = function(msg, url, line, col, error) {
            showError("Rough.js Runtime Error", (msg || error) + (line ? " (Line " + line + ")" : ""));
        };

        const canvas = document.getElementById('rough-canvas');
        const ctx = canvas.getContext('2d');
        const width = ${width};
        const height = ${height};

        try {
            const roughLib = window.rough || (typeof rough !== 'undefined' ? rough : null);
            if (!roughLib) {
                throw new Error("Rough.js library failed to load from CDN. Please check your internet connection.");
            }
            const rc = roughLib.canvas(canvas);
            ${rawCode ? rawCode : `ctx.fillStyle = '#64748b'; ctx.font = '16px monospace'; ctx.fillText('Write Rough.js code to draw hand-drawn vector graphics...', 40, 60);`}
        } catch (err) {
            console.error("Rough.js Execution Error:", err);
            showError("Rough.js Execution Error", err.stack || err.message || String(err));
        }
    <\/script>
</body>
</html>`;
};

/**
 * Generates an interactive post card iframe for feed, reels, and profiles.
 * 
 * @param {string} code The raw Rough.js code.
 * @param {number} [width=1280]
 * @param {number} [height=720]
 * @returns {string} The HTML string containing an interactive iframe.
 */
window.renderRoughPostContent = function(code, width = 1280, height = 720) {
    if (!code) return '';
    const srcDoc = window.renderRough(code, { width, height });
    return `<div class="post-preview-container" style="position: relative; width: 100%; padding-top: 56.25%; background: #0e1117; border-radius: 8px; overflow: hidden;">
        <iframe 
            srcdoc="${srcDoc.replace(/"/g, '&quot;')}"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
            sandbox="allow-scripts allow-same-origin"
            loading="lazy">
        </iframe>
    </div>`;
};
