// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/jsxgraph_handler.js

/**
 * JSXGraph (Interactive Dynamic Geometry, Calculus & Mathematics) Handler
 * Renders JSXGraph JavaScript code inside an interactive iframe.
 * 
 * @param {string} jxgCode The raw JavaScript code creating geometry, graphs, or calculus with JSXGraph.
 * @param {object|string} [options={}] Configuration options (e.g. background).
 * @returns {string} The full HTML document source for an iframe.
 */
window.jsxgraphTemplates = {
    'calculus_tangent': `// --- JSXGraph: Kinetic Wave Calculus & Tangent Dynamics ---
// Pure kinetic animation: Traveling harmonic wave, dynamic tangent & normal lines

const board = JXG.JSXGraph.initBoard('jxgbox', {
    boundingbox: [-5, 4, 5, -4],
    axis: true,
    showCopyright: false,
    showNavigation: false
});
window.board = board;

let t = 0;

// 1. Primary Traveling Wave Curve
board.create('curve', [
    function(x) { return x; },
    function(x) { return 1.8 * Math.sin(x - t) * Math.cos(0.4 * x + 0.3 * t); },
    -5, 5
], {
    strokeColor: '#38bdf8',
    strokeWidth: 3.5,
    highlightStrokeColor: '#0ea5e9'
});

// Dual Counter-Phase Harmonic Envelope Curve
board.create('curve', [
    function(x) { return x; },
    function(x) { return -1.8 * Math.sin(x - t) * Math.cos(0.4 * x + 0.3 * t); },
    -5, 5
], {
    strokeColor: '#818cf8',
    strokeWidth: 1.5,
    dash: 3
});

// 2. Animated Point Traveling Smoothly Along Wave
const pX = function() { return 3.2 * Math.sin(0.35 * t); };
const pY = function() {
    const x = pX();
    return 1.8 * Math.sin(x - t) * Math.cos(0.4 * x + 0.3 * t);
};

const p = board.create('point', [pX, pY], {
    name: '',
    color: '#ec4899',
    fillColor: '#f43f5e',
    size: 6,
    strokeColor: '#fda4af',
    strokeWidth: 2
});

// Pulsing Aura Ring around Point P
board.create('circle', [p, function() { return 0.25 + 0.12 * Math.sin(3 * t); }], {
    strokeColor: '#ec4899',
    strokeWidth: 1.5,
    dash: 2,
    fillColor: '#ec4899',
    fillOpacity: 0.15
});

// 3. Dynamic Derivative Slope & Tangent Line
const dx = 0.001;
const slope = function() {
    const x = pX();
    const y1 = 1.8 * Math.sin(x + dx - t) * Math.cos(0.4 * (x + dx) + 0.3 * t);
    const y0 = 1.8 * Math.sin(x - dx - t) * Math.cos(0.4 * (x - dx) + 0.3 * t);
    return (y1 - y0) / (2 * dx);
};

// Tangent Line Guide Points
const t1 = board.create('point', [
    function() { return pX() - 2.5; },
    function() { return pY() - 2.5 * slope(); }
], { visible: false });

const t2 = board.create('point', [
    function() { return pX() + 2.5; },
    function() { return pY() + 2.5 * slope(); }
], { visible: false });

board.create('line', [t1, t2], {
    strokeColor: '#f59e0b',
    strokeWidth: 2.5,
    dash: 2
});

// 4. Dynamic Normal Line (Perpendicular)
const n1 = board.create('point', [
    function() { return pX() - 1.8 * slope(); },
    function() { return pY() + 1.8; }
], { visible: false });

const n2 = board.create('point', [
    function() { return pX() + 1.8 * slope(); },
    function() { return pY() - 1.8; }
], { visible: false });

board.create('line', [n1, n2], {
    strokeColor: '#10b981',
    strokeWidth: 1.5,
    dash: 4
});

// 5. Differential Step Polygon (dx, dy)
const q = board.create('point', [
    function() { return pX() + 1.2; },
    function() { return pY(); }
], { visible: false });

const r = board.create('point', [
    function() { return pX() + 1.2; },
    function() { return pY() + 1.2 * slope(); }
], { visible: false });

board.create('polygon', [p, q, r], {
    fillColor: '#f59e0b',
    fillOpacity: 0.18,
    borders: { strokeColor: '#f59e0b', strokeWidth: 1.5, dash: 1 },
    hasInnerPoints: false
});

// 6. Oscillating Secant Chord (Demonstrating limit as h -> 0)
const hStep = function() { return 1.4 * (0.5 + 0.5 * Math.sin(1.8 * t)); };
const secantPoint = board.create('point', [
    function() { return pX() + hStep(); },
    function() {
        const sx = pX() + hStep();
        return 1.8 * Math.sin(sx - t) * Math.cos(0.4 * sx + 0.3 * t);
    }
], {
    name: '',
    color: '#a855f7',
    size: 4,
    strokeColor: '#d8b4fe'
});

board.create('line', [p, secantPoint], {
    strokeColor: '#a855f7',
    strokeWidth: 1.5,
    dash: 3
});

// 7. 60 FPS Kinetic Render Loop
function animate() {
    t += 0.025;
    board.update();
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
`,

    'riemann_integral': `// --- JSXGraph: Kinetic Breathing Riemann Sum & Integral ---
// Pure visual animation: Dynamic oscillating wave with pulsating Riemann rectangles

const board = JXG.JSXGraph.initBoard('jxgbox', {
    boundingbox: [-4.5, 6, 4.5, -2],
    axis: true,
    showCopyright: false,
    showNavigation: false
});
window.board = board;

let t = 0;

// 1. Oscillating Integrand Curve
const f = function(x) {
    return 2.2 + 1.2 * Math.sin(x + 0.8 * t) * Math.cos(0.6 * x - 0.4 * t);
};

board.create('curve', [function(x) { return x; }, f, -4.5, 4.5], {
    strokeColor: '#38bdf8',
    strokeWidth: 3.5,
    highlightStrokeColor: '#0ea5e9'
});

// 2. Continuous Breathing Riemann Sum Partition Rectangles
const riemann = board.create('riemannsum', [
    f,
    function() { return Math.round(8 + 18 * Math.pow(Math.sin(0.25 * t), 2)); },
    'middle',
    function() { return -3.2 + 0.6 * Math.sin(0.2 * t); },
    function() { return 3.2 + 0.6 * Math.cos(0.2 * t); }
], {
    fillColor: '#6366f1',
    fillOpacity: 0.35,
    strokeColor: '#818cf8',
    strokeWidth: 1.5
});

// 3. Dynamic Integration Limits with Glowing Markers
const aPt = board.create('point', [
    function() { return -3.2 + 0.6 * Math.sin(0.2 * t); },
    0
], { name: '', color: '#ec4899', size: 5, strokeColor: '#fda4af', strokeWidth: 2 });

const bPt = board.create('point', [
    function() { return 3.2 + 0.6 * Math.cos(0.2 * t); },
    0
], { name: '', color: '#10b981', size: 5, strokeColor: '#6ee7b7', strokeWidth: 2 });

// Vertical Limit Guide Drops
board.create('segment', [
    aPt,
    board.create('point', [function() { return aPt.X(); }, function() { return f(aPt.X()); }], { visible: false })
], { strokeColor: '#ec4899', strokeWidth: 1.5, dash: 3 });

board.create('segment', [
    bPt,
    board.create('point', [function() { return bPt.X(); }, function() { return f(bPt.X()); }], { visible: false })
], { strokeColor: '#10b981', strokeWidth: 1.5, dash: 3 });

// 4. 60 FPS Kinetic Render Loop
function animate() {
    t += 0.025;
    board.update();
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
`,

    'euler_geometry': `// --- JSXGraph: Kinetic Orbiting Triangle & Euler Line Geometry ---
// Pure visual geometry: Dynamic orbiting vertices, circumcircle, incircle, medians, altitudes & Euler line

const board = JXG.JSXGraph.initBoard('jxgbox', {
    boundingbox: [-6, 6, 6, -6],
    axis: false,
    showCopyright: false,
    showNavigation: false
});
window.board = board;

let t = 0;

// 1. Vertices in Harmonic Orbital Motion
const A = board.create('point', [
    function() { return -2.8 + 1.2 * Math.cos(0.35 * t); },
    function() { return -1.6 + 0.8 * Math.sin(0.35 * t); }
], { name: '', color: '#38bdf8', fillColor: '#38bdf8', size: 5 });

const B = board.create('point', [
    function() { return 2.8 + 1.0 * Math.sin(0.28 * t + 1); },
    function() { return -1.6 + 0.9 * Math.cos(0.28 * t); }
], { name: '', color: '#38bdf8', fillColor: '#38bdf8', size: 5 });

const C = board.create('point', [
    function() { return 0.4 + 1.5 * Math.sin(0.32 * t + 2); },
    function() { return 3.2 + 0.8 * Math.cos(0.45 * t); }
], { name: '', color: '#38bdf8', fillColor: '#38bdf8', size: 5 });

// Triangle Body Polygon
board.create('polygon', [A, B, C], {
    fillColor: '#38bdf8',
    fillOpacity: 0.12,
    borders: { strokeColor: '#38bdf8', strokeWidth: 2.5 }
});

// 2. Circumcircle & Circumcenter O
const circum = board.create('circumcircle', [A, B, C], {
    strokeColor: '#06b6d4',
    strokeWidth: 2,
    dash: 2,
    fillColor: '#06b6d4',
    fillOpacity: 0.05,
    center: { name: '', color: '#06b6d4', size: 5 }
});
const O = circum.center;

// 3. Centroid G (Center of Mass)
const G = board.create('point', [
    function() { return (A.X() + B.X() + C.X()) / 3; },
    function() { return (A.Y() + B.Y() + C.Y()) / 3; }
], {
    name: '',
    color: '#eab308',
    fillColor: '#fde047',
    size: 5
});

// Medians connecting vertices to opposite midpoints
const mAB = board.create('midpoint', [A, B], { visible: false });
const mBC = board.create('midpoint', [B, C], { visible: false });
const mCA = board.create('midpoint', [C, A], { visible: false });
board.create('segment', [C, mAB], { strokeColor: '#eab308', strokeWidth: 1.2, dash: 3 });
board.create('segment', [A, mBC], { strokeColor: '#eab308', strokeWidth: 1.2, dash: 3 });
board.create('segment', [B, mCA], { strokeColor: '#eab308', strokeWidth: 1.2, dash: 3 });

// 4. Orthocenter H (Altitudes Intersection via Euler Formula: H = 3G - 2O)
const H = board.create('point', [
    function() { return 3 * G.X() - 2 * O.X(); },
    function() { return 3 * G.Y() - 2 * O.Y(); }
], {
    name: '',
    color: '#ec4899',
    fillColor: '#f43f5e',
    size: 5
});

// Altitude Lines from Vertices to Opposite Sides
const lineAB = board.create('line', [A, B], { visible: false });
const lineBC = board.create('line', [B, C], { visible: false });
board.create('perpendicular', [lineAB, C], { strokeColor: '#ec4899', strokeWidth: 1.2, dash: 3 });
board.create('perpendicular', [lineBC, A], { strokeColor: '#ec4899', strokeWidth: 1.2, dash: 3 });

// 5. Incircle & Incenter
board.create('incircle', [A, B, C], {
    strokeColor: '#10b981',
    strokeWidth: 2,
    dash: 3,
    fillColor: '#10b981',
    fillOpacity: 0.05,
    center: { name: '', color: '#10b981', size: 4 }
});

// 6. Nine-Point Center N & Feuerbach Circle
const N = board.create('point', [
    function() { return (O.X() + H.X()) / 2; },
    function() { return (O.Y() + H.Y()) / 2; }
], {
    name: '',
    color: '#a855f7',
    fillColor: '#c084fc',
    size: 4
});

board.create('circle', [
    N,
    function() { return Math.hypot(O.X() - A.X(), O.Y() - A.Y()) / 2; }
], {
    strokeColor: '#c084fc',
    strokeWidth: 1.8,
    dash: 2,
    fillColor: '#c084fc',
    fillOpacity: 0.04
});

// 7. Collinear Ruby Euler Line (Passes through O, N, G, H)
board.create('line', [H, O], {
    strokeColor: '#f43f5e',
    strokeWidth: 3,
    dash: 1
});

// 8. 60 FPS Kinetic Render Loop
function animate() {
    t += 0.02;
    board.update();
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
`,

    'fourier_harmonics': `// --- JSXGraph: Kinetic Fourier Epicycles & Wave Synthesizer ---
// Pure visual animation: Multi-arm rotating harmonic phasors synthesizing square waveform

const board = JXG.JSXGraph.initBoard('jxgbox', {
    boundingbox: [-5, 4, 8, -4],
    axis: false,
    showCopyright: false,
    showNavigation: false
});
window.board = board;

let t = 0;
const origin = board.create('point', [-2.5, 0], { visible: false, fixed: true });

// 1. Quad Harmonic Epicycle Radii & Frequencies
const r1 = 1.6;
const r2 = r1 / 3;
const r3 = r1 / 5;
const r4 = r1 / 7;

// Harmonic 1 (n=1)
const c1 = board.create('circle', [origin, r1], {
    strokeColor: '#3b82f6',
    strokeWidth: 1.5,
    dash: 2
});
const p1 = board.create('point', [
    function() { return origin.X() + r1 * Math.cos(t); },
    function() { return origin.Y() + r1 * Math.sin(t); }
], { name: '', color: '#3b82f6', size: 3 });
board.create('segment', [origin, p1], { strokeColor: '#3b82f6', strokeWidth: 2 });

// Harmonic 2 (n=3)
const c2 = board.create('circle', [p1, r2], {
    strokeColor: '#ec4899',
    strokeWidth: 1.3,
    dash: 2
});
const p2 = board.create('point', [
    function() { return p1.X() + r2 * Math.cos(3 * t); },
    function() { return p1.Y() + r2 * Math.sin(3 * t); }
], { name: '', color: '#ec4899', size: 3 });
board.create('segment', [p1, p2], { strokeColor: '#ec4899', strokeWidth: 1.8 });

// Harmonic 3 (n=5)
const c3 = board.create('circle', [p2, r3], {
    strokeColor: '#f59e0b',
    strokeWidth: 1.2,
    dash: 2
});
const p3 = board.create('point', [
    function() { return p2.X() + r3 * Math.cos(5 * t); },
    function() { return p2.Y() + r3 * Math.sin(5 * t); }
], { name: '', color: '#f59e0b', size: 3 });
board.create('segment', [p2, p3], { strokeColor: '#f59e0b', strokeWidth: 1.8 });

// Harmonic 4 (n=7)
const c4 = board.create('circle', [p3, r4], {
    strokeColor: '#06b6d4',
    strokeWidth: 1.1,
    dash: 2
});
const p4 = board.create('point', [
    function() { return p3.X() + r4 * Math.cos(7 * t); },
    function() { return p3.Y() + r4 * Math.sin(7 * t); }
], { name: '', color: '#06b6d4', size: 4, fillColor: '#38bdf8' });
board.create('segment', [p3, p4], { strokeColor: '#06b6d4', strokeWidth: 1.5 });

// 2. Synthesizer Output Drawing Pen
const waveX = 1.2;
const wavePoint = board.create('point', [
    waveX,
    function() { return p4.Y(); }
], { name: '', color: '#10b981', size: 4, strokeColor: '#6ee7b7' });

// Connecting Guide Wire
board.create('segment', [p4, wavePoint], {
    strokeColor: '#a1a1aa',
    strokeWidth: 1.2,
    dash: 3
});

// 3. Continuously Scrolling Synthesized Square Wave
board.create('curve', [
    function(theta) { return waveX + theta; },
    function(theta) {
        return origin.Y() +
            r1 * Math.sin(t - theta) +
            r2 * Math.sin(3 * (t - theta)) +
            r3 * Math.sin(5 * (t - theta)) +
            r4 * Math.sin(7 * (t - theta));
    },
    0, 6.28
], {
    strokeColor: '#10b981',
    strokeWidth: 3.5
});

// Dual Inverted Reflection Wave
board.create('curve', [
    function(theta) { return waveX + theta; },
    function(theta) {
        return origin.Y() - (
            r1 * Math.sin(t - theta) +
            r2 * Math.sin(3 * (t - theta)) +
            r3 * Math.sin(5 * (t - theta)) +
            r4 * Math.sin(7 * (t - theta))
        ) * 0.4;
    },
    0, 6.28
], {
    strokeColor: '#6366f1',
    strokeWidth: 1.5,
    dash: 2
});

// 4. 60 FPS Kinetic Render Loop
function animate() {
    t += 0.035;
    board.update();
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
`
};

window.jsxgraphTemplate = window.jsxgraphTemplates.calculus_tangent;

window.renderJSXGraph = function(jxgCode, options = {}) {
    let background = '#0a0d14';

    if (typeof options === 'object' && options !== null) {
        if (options.background) background = options.background;
    }

    const rawCode = (jxgCode || '').trim();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>JSXGraph Interactive Math</title>
    
    <!-- JSXGraph Core CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/jsxgraph@1.8.0/distrib/jsxgraph.css">
    
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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            overflow: hidden;
            position: relative;
        }
        #jxgbox {
            width: 100vw !important;
            height: 100vh !important;
            background: ${background} !important;
            border: none !important;
            border-radius: 0 !important;
            outline: none !important;
            position: absolute;
            top: 0;
            left: 0;
        }
        /* Style JSXGraph SVG elements for sleek dark mode */
        .jxgbox svg {
            background-color: transparent !important;
        }
        .jxgbox text {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        .jxg-error-box {
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
        .jxg-error-box strong {
            color: #ef4444;
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div id="jxgbox" class="jxgbox"></div>

    <!-- JSXGraph Core JS Library -->
    <script src="https://cdn.jsdelivr.net/npm/jsxgraph@1.8.0/distrib/jsxgraphcore.js"><\/script>

    <script>
        function showError(title, message) {
            const errDiv = document.createElement('div');
            errDiv.className = 'jxg-error-box';
            errDiv.innerHTML = '<strong>' + title + '</strong>' + 
                (message ? String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
            document.body.appendChild(errDiv);
        }

        window.onerror = function(msg, url, line, col, error) {
            showError("JSXGraph Runtime Error", (msg || error) + (line ? " (Line " + line + ")" : ""));
        };

        // Dark mode configuration defaults
        if (window.JXG) {
            JXG.Options.board.showCopyright = false;
            JXG.Options.axis.strokeColor = '#52525b';
            JXG.Options.axis.highlightStrokeColor = '#a1a1aa';
            JXG.Options.axis.label = { color: '#a1a1aa', fontSize: 12 };
            JXG.Options.grid.strokeColor = '#27272a';
            JXG.Options.grid.strokeOpacity = 0.5;
        }

        try {
            ${rawCode ? rawCode : `document.getElementById('jxgbox').innerHTML = '<div style="color: #71717a; font-size: 14px; display:flex; align-items:center; justify-content:center; height:100%;">Write JSXGraph code to render interactive geometry & math...</div>';`}
        } catch (err) {
            console.error("JSXGraph Execution Error:", err);
            showError("JSXGraph Execution Error:", err.stack || err.message || String(err));
        }

        // Auto resize handler
        window.addEventListener('resize', () => {
            if (window.board && typeof window.board.resizeContainer === 'function') {
                window.board.resizeContainer(window.innerWidth, window.innerHeight);
            }
        });
    <\/script>
</body>
</html>`;
};
