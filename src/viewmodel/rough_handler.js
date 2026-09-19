// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/rough_handler.js

/**
 * Rough.js (Hand-Drawn & Sketchy Graphic Engine) Handler
 * Renders hand-drawn sketchy 2D canvas/SVG graphics with realistic pencil, chalk, and hachure textures.
 */

window.roughTemplates = {
    'sketch_diagram': `// --- Rough.js: Hand-Drawn System Architecture Blueprint ---
// Available in scope: canvas, ctx, rc (rough.canvas instance), width, height

// 1. Draw Sketchy Grid Background & Outer Border
rc.rectangle(24, 24, width - 48, height - 48, {
    roughness: 1.4,
    stroke: '#334155',
    strokeWidth: 2,
    bowing: 1.8
});

// 2. Title Header Banner
rc.rectangle(width / 2 - 190, 44, 380, 52, {
    roughness: 1.6,
    fill: 'rgba(56, 189, 248, 0.16)',
    fillStyle: 'hachure',
    stroke: '#38bdf8',
    strokeWidth: 2.2,
    hachureAngle: -35,
    hachureGap: 5
});

ctx.font = 'bold 18px "Courier New", monospace';
ctx.fillStyle = '#38bdf8';
ctx.textAlign = 'center';
ctx.fillText('⚡ DISTRIBUTED ARCHITECTURE', width / 2, 76);

// 3. Core Service Nodes (Microservices Pipeline)
const nodes = [
    { x: 100, y: 180, w: 160, h: 86, label: 'CLIENT UI', sub: 'React / Next.js', fill: 'rgba(244, 114, 182, 0.2)', stroke: '#f472b6', style: 'zigzag' },
    { x: 380, y: 180, w: 180, h: 86, label: 'API GATEWAY', sub: 'Reverse Proxy', fill: 'rgba(192, 132, 252, 0.2)', stroke: '#c084fc', style: 'cross-hatch' },
    { x: 680, y: 180, w: 180, h: 86, label: 'EVENT WORKER', sub: 'Kafka Consumer', fill: 'rgba(74, 222, 128, 0.2)', stroke: '#4ade80', style: 'dots' },
    { x: 980, y: 180, w: 160, h: 86, label: 'POSTGRES DB', sub: 'Sharded Cluster', fill: 'rgba(250, 204, 21, 0.2)', stroke: '#facc15', style: 'hachure' }
];

nodes.forEach(node => {
    rc.rectangle(node.x, node.y, node.w, node.h, {
        roughness: 2.2,
        fill: node.fill,
        fillStyle: node.style,
        stroke: node.stroke,
        strokeWidth: 2.5,
        hachureGap: 6
    });

    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(node.label, node.x + node.w / 2, node.y + 38);

    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(node.sub, node.x + node.w / 2, node.y + 62);
});

// 4. Connecting Hand-Drawn Directed Arrows
const drawArrow = (x1, y1, x2, y2, color, label) => {
    rc.line(x1, y1, x2, y2, { roughness: 1.8, stroke: color, strokeWidth: 2.5 });
    // Arrow Head
    rc.line(x2, y2, x2 - 14, y2 - 8, { roughness: 1.5, stroke: color, strokeWidth: 2.5 });
    rc.line(x2, y2, x2 - 14, y2 + 8, { roughness: 1.5, stroke: color, strokeWidth: 2.5 });
    if (label) {
        ctx.font = '11px "Courier New", monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(label, (x1 + x2) / 2, y1 - 10);
    }
};

drawArrow(260, 223, 380, 223, '#f472b6', 'HTTPS/REST');
drawArrow(560, 223, 680, 223, '#c084fc', 'gRPC / TCP');
drawArrow(860, 223, 980, 223, '#4ade80', 'SQL POOL');

// 5. Cloud Cache & Message Broker (Lower Level)
rc.ellipse(width / 2, 430, 320, 110, {
    roughness: 2.4,
    fill: 'rgba(14, 165, 233, 0.18)',
    fillStyle: 'hachure',
    stroke: '#38bdf8',
    strokeWidth: 2.8,
    hachureAngle: 45,
    hachureGap: 7
});

ctx.fillStyle = '#38bdf8';
ctx.font = 'bold 16px "Courier New", monospace';
ctx.textAlign = 'center';
ctx.fillText('☁️ REDIS GLOBAL REPLICA', width / 2, 435);

drawArrow(470, 266, width / 2 - 50, 375, '#38bdf8', 'Cache Hit');
drawArrow(770, 266, width / 2 + 50, 375, '#38bdf8', 'Pub/Sub');
`,

    'hand_drawn_cartoon': `// --- Rough.js: Animated Wobbly Cartoon Mascot ---
// Available in scope: canvas, ctx, rc (rough.canvas instance), width, height

let frame = 0;
function drawMascot() {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const wobble = Math.sin(frame * 0.12) * 3;
    const earWiggle = Math.cos(frame * 0.08) * 5;

    // 1. Outer Head Contour
    rc.circle(cx, cy + wobble, 260, {
        roughness: 2.6,
        stroke: '#27272a',
        strokeWidth: 4,
        fill: '#fef3c7',
        fillStyle: 'solid'
    });

    // 2. Ears with Hatching
    rc.polygon([
        [cx - 110, cy - 90 + wobble],
        [cx - 160 + earWiggle, cy - 220 + wobble],
        [cx - 30, cy - 130 + wobble]
    ], {
        roughness: 2.2,
        stroke: '#27272a',
        strokeWidth: 3.5,
        fill: 'rgba(244, 63, 94, 0.45)',
        fillStyle: 'hachure',
        hachureAngle: -45,
        hachureGap: 6
    });

    rc.polygon([
        [cx + 110, cy - 90 + wobble],
        [cx + 160 - earWiggle, cy - 220 + wobble],
        [cx + 30, cy - 130 + wobble]
    ], {
        roughness: 2.2,
        stroke: '#27272a',
        strokeWidth: 3.5,
        fill: 'rgba(244, 63, 94, 0.45)',
        fillStyle: 'hachure',
        hachureAngle: 45,
        hachureGap: 6
    });

    // 3. Cute Anime Eyes
    rc.ellipse(cx - 55, cy - 20 + wobble, 45, 60, {
        roughness: 1.5,
        stroke: '#18181b',
        strokeWidth: 3,
        fill: '#18181b',
        fillStyle: 'solid'
    });
    rc.ellipse(cx + 55, cy - 20 + wobble, 45, 60, {
        roughness: 1.5,
        stroke: '#18181b',
        strokeWidth: 3,
        fill: '#18181b',
        fillStyle: 'solid'
    });

    // Eye Highlights (Gleams)
    rc.circle(cx - 62, cy - 32 + wobble, 14, { fill: '#ffffff', fillStyle: 'solid', stroke: 'none' });
    rc.circle(cx + 48, cy - 32 + wobble, 14, { fill: '#ffffff', fillStyle: 'solid', stroke: 'none' });

    // 4. Nose & Smiling Cat Mouth
    rc.polygon([[cx - 10, cy + 20 + wobble], [cx + 10, cy + 20 + wobble], [cx, cy + 32 + wobble]], {
        roughness: 1.2,
        stroke: '#e11d48',
        strokeWidth: 2,
        fill: '#e11d48',
        fillStyle: 'solid'
    });
    rc.arc(cx - 22, cy + 42 + wobble, 45, 30, 0, Math.PI, false, { roughness: 2.0, stroke: '#27272a', strokeWidth: 3 });
    rc.arc(cx + 22, cy + 42 + wobble, 45, 30, 0, Math.PI, false, { roughness: 2.0, stroke: '#27272a', strokeWidth: 3 });

    // 5. Cheeks Blush Hatching
    rc.rectangle(cx - 105, cy + 25 + wobble, 45, 20, {
        roughness: 2.2,
        stroke: 'none',
        fill: '#f43f5e',
        fillStyle: 'zigzag',
        hachureGap: 4
    });
    rc.rectangle(cx + 60, cy + 25 + wobble, 45, 20, {
        roughness: 2.2,
        stroke: 'none',
        fill: '#f43f5e',
        fillStyle: 'zigzag',
        hachureGap: 4
    });

    // 6. Whiskers
    rc.line(cx - 85, cy + 15 + wobble, cx - 165, cy + 5 + wobble, { roughness: 2.2, stroke: '#52525b', strokeWidth: 2.5 });
    rc.line(cx - 85, cy + 30 + wobble, cx - 170, cy + 35 + wobble, { roughness: 2.2, stroke: '#52525b', strokeWidth: 2.5 });
    rc.line(cx + 85, cy + 15 + wobble, cx + 165, cy + 5 + wobble, { roughness: 2.2, stroke: '#52525b', strokeWidth: 2.5 });
    rc.line(cx + 85, cy + 30 + wobble, cx + 170, cy + 35 + wobble, { roughness: 2.2, stroke: '#52525b', strokeWidth: 2.5 });

    frame++;
    requestAnimationFrame(drawMascot);
}
drawMascot();
`,

    'math_graph': `// --- Rough.js: Hand-Drawn Coordinate System & Calculus Curve ---
// Available in scope: canvas, ctx, rc (rough.canvas instance), width, height

const ox = 140;
const oy = height / 2;

// 1. Sketchy Coordinate Axes
rc.line(ox, 60, ox, height - 60, { roughness: 1.8, stroke: '#64748b', strokeWidth: 2.5 });
rc.line(ox - 40, oy, width - 80, oy, { roughness: 1.8, stroke: '#64748b', strokeWidth: 2.5 });

// Axis Arrow Heads
rc.line(ox, 60, ox - 10, 75, { roughness: 1.4, stroke: '#64748b', strokeWidth: 2 });
rc.line(ox, 60, ox + 10, 75, { roughness: 1.4, stroke: '#64748b', strokeWidth: 2 });
rc.line(width - 80, oy, width - 95, oy - 10, { roughness: 1.4, stroke: '#64748b', strokeWidth: 2 });
rc.line(width - 80, oy, width - 95, oy + 10, { roughness: 1.4, stroke: '#64748b', strokeWidth: 2 });

ctx.font = 'bold 16px "Courier New", monospace';
ctx.fillStyle = '#94a3b8';
ctx.fillText('f(x)', ox - 20, 50);
ctx.fillText('x', width - 70, oy + 25);

// 2. Shaded Area Under Curve (Definite Integral with Hachure)
const areaPoints = [[ox, oy]];
for (let x = 0; x <= 650; x += 15) {
    const px = ox + x;
    const py = oy - Math.sin(x * 0.012) * 140;
    areaPoints.push([px, py]);
}
areaPoints.push([ox + 650, oy]);

rc.polygon(areaPoints, {
    roughness: 1.6,
    fill: 'rgba(56, 189, 248, 0.25)',
    fillStyle: 'hachure',
    stroke: 'none',
    hachureAngle: -45,
    hachureGap: 6
});

// 3. Main Oscillating Wave Curve
const curvePoints = [];
for (let x = 0; x <= width - 240; x += 12) {
    const px = ox + x;
    const py = oy - Math.sin(x * 0.012) * 140;
    curvePoints.push([px, py]);
}
rc.curve(curvePoints, { roughness: 2.2, stroke: '#38bdf8', strokeWidth: 3.5 });

// 4. Tangent Vector Slope at x = 320
const tx = ox + 320;
const ty = oy - Math.sin(320 * 0.012) * 140;
rc.circle(tx, ty, 14, { roughness: 1.5, fill: '#f43f5e', fillStyle: 'solid', stroke: '#f43f5e' });
rc.line(tx - 120, ty + 60, tx + 120, ty - 60, { roughness: 1.6, stroke: '#fb7185', strokeWidth: 3 });

// 5. Mathematical Formula Badge
rc.rectangle(width - 360, 60, 310, 85, {
    roughness: 1.8,
    fill: 'rgba(15, 23, 42, 0.85)',
    fillStyle: 'solid',
    stroke: '#38bdf8',
    strokeWidth: 2
});

ctx.font = 'bold 15px "Courier New", monospace';
ctx.fillStyle = '#38bdf8';
ctx.textAlign = 'left';
ctx.fillText('f(x) = A · sin(ωx)', width - 330, 95);
ctx.fillStyle = '#fb7185';
ctx.fillText("f'(x) = Aω · cos(ωx)", width - 330, 122);
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
