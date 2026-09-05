// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/anime_handler.js

/**
 * Anime.js (Kinetic Motion Graphics Engine) Handler
 * Renders Anime.js kinetic animations, vector paths, and motion graphics inside an isolated sandbox iframe.
 */

window.animeTemplates = {
    'kinetic_grid': `// --- Anime.js: Kinetic Grid & Glowing Particle Matrix ---
const container = document.getElementById('canvas-container');
container.innerHTML = \`
<div style="position: relative; width: 100%; height: 100%; background: #080a10; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; font-family: system-ui, sans-serif;">
  
  <!-- Glowing Background Orbs -->
  <div class="glow-orb" style="position: absolute; width: 350px; height: 350px; background: radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%); border-radius: 50%; filter: blur(40px); pointer-events: none;"></div>
  
  <!-- Central Title -->
  <div style="z-index: 10; text-align: center; margin-bottom: 20px;">
    <h1 class="anime-title" style="margin: 0; font-size: 2.2rem; font-weight: 800; background: linear-gradient(135deg, #60a5fa, #c084fc, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 2px;">
      XtraAnim Studio
    </h1>
    <p class="anime-subtitle" style="margin: 4px 0 0; font-size: 0.9rem; color: #94a3b8; font-weight: 500; letter-spacing: 1px;">
      Anime.js Kinetic Engine
    </p>
  </div>

  <!-- Kinetic Grid Matrix -->
  <div id="gridMatrix" style="display: grid; grid-template-columns: repeat(14, 1fr); gap: 10px; z-index: 5; padding: 10px;"></div>

  <!-- Progress Bar Timeline -->
  <div style="position: absolute; bottom: 24px; width: 60%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
    <div class="timeline-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #3b82f6, #a855f7, #ec4899); border-radius: 4px;"></div>
  </div>
</div>
\`;

// 1. Generate Kinetic Matrix Grid Elements
const grid = document.getElementById('gridMatrix');
const totalDots = 14 * 6; // 84 nodes
for (let i = 0; i < totalDots; i++) {
  const dot = document.createElement('div');
  dot.classList.add('grid-node');
  dot.style.cssText = 'width: 14px; height: 14px; background: #1e293b; border-radius: 4px; border: 1px solid rgba(255,255,255,0.08);';
  grid.appendChild(dot);
}

// 2. Create Master Choreographed Timeline
const tl = anime.timeline({
  easing: 'easeInOutQuad',
  loop: true
});

tl
.add({
  targets: '.anime-title, .anime-subtitle',
  translateY: [-30, 0],
  opacity: [0, 1],
  duration: 900,
  delay: anime.stagger(150),
  easing: 'easeOutExpo'
})
.add({
  targets: '.grid-node',
  scale: [
    { value: 0.2, easing: 'easeOutSine', duration: 300 },
    { value: 1.6, easing: 'easeInOutQuad', duration: 600 },
    { value: 1.0, easing: 'easeInOutQuad', duration: 400 }
  ],
  rotateZ: anime.stagger([0, 180], { grid: [14, 6], from: 'center' }),
  borderRadius: ['4px', '50%', '4px'],
  backgroundColor: [
    { value: '#3b82f6', duration: 300 },
    { value: '#a855f7', duration: 400 },
    { value: '#ec4899', duration: 400 },
    { value: '#1e293b', duration: 400 }
  ],
  boxShadow: [
    { value: '0 0 12px #3b82f6', duration: 300 },
    { value: '0 0 18px #ec4899', duration: 400 },
    { value: '0 0 0px transparent', duration: 400 }
  ],
  delay: anime.stagger(40, { grid: [14, 6], from: 'center' }),
  duration: 1200
}, '-=400')
.add({
  targets: '.glow-orb',
  scale: [0.8, 1.4, 1.0],
  opacity: [0.3, 0.7, 0.4],
  duration: 1500,
  easing: 'easeInOutSine'
}, 0)
.add({
  targets: '.timeline-bar',
  width: ['0%', '100%'],
  duration: 3500,
  easing: 'linear'
}, 0);`,

    'orbital_wave': `// --- Anime.js: Orbital Particle Rings & Motion Waves ---
const container = document.getElementById('canvas-container');
container.innerHTML = \`
<div style="width: 100%; height: 100%; background: #050508; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
  <div id="orbitStage" style="position: relative; width: 300px; height: 300px; display: flex; align-items: center; justify-content: center;">
    <div style="position: absolute; width: 40px; height: 40px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 30px #3b82f6; z-index: 10;"></div>
  </div>
</div>
\`;

const stage = document.getElementById('orbitStage');
const rings = 4;
const particlesPerRing = 12;

for (let r = 1; r <= rings; r++) {
  const radius = r * 35;
  for (let p = 0; p < particlesPerRing; p++) {
    const angle = (p / particlesPerRing) * Math.PI * 2;
    const dot = document.createElement('div');
    dot.className = \`orb-dot ring-\${r}\`;
    dot.style.cssText = \`
      position: absolute;
      width: \${8 - r}px;
      height: \${8 - r}px;
      background: hsl(\${r * 60 + 180}, 90%, 65%);
      border-radius: 50%;
      box-shadow: 0 0 10px hsl(\${r * 60 + 180}, 90%, 65%);
      transform: translate(\${Math.cos(angle) * radius}px, \${Math.sin(angle) * radius}px);
    \`;
    stage.appendChild(dot);
  }
}

anime({
  targets: '#orbitStage .orb-dot',
  rotate: function(el, i) { return (i % 2 === 0 ? 360 : -360); },
  scale: [
    { value: 1.5, duration: 800, easing: 'easeInOutQuad' },
    { value: 0.5, duration: 800, easing: 'easeInOutQuad' },
    { value: 1.0, duration: 800, easing: 'easeInOutQuad' }
  ],
  delay: anime.stagger(30, { from: 'center' }),
  duration: 3000,
  loop: true,
  easing: 'linear'
});

anime({
  targets: '#orbitStage',
  rotateZ: 360,
  duration: 12000,
  loop: true,
  easing: 'linear'
});`
};

window.animeTemplate = window.animeTemplates.kinetic_grid;

/**
 * Renders Anime.js animation inside an isolated HTML document string for an iframe.
 * 
 * @param {string} animeCode The user JavaScript animation code.
 * @param {object} [options={}] Options including width, height, background.
 * @returns {string} The full HTML document source.
 */
window.renderAnime = function(animeCode, options = {}) {
    const width = options.width || 1280;
    const height = options.height || 720;
    const background = options.background || '#080a10';
    let code = (animeCode || '').trim();

    // Replace resolution placeholders
    code = code.replace(/__WIDTH__/g, width).replace(/__HEIGHT__/g, height);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Anime.js Kinetic Animation</title>
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
        #canvas-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            background: ${background};
            overflow: hidden;
        }
        #canvas-container > div, #canvas-container > svg {
            max-width: 100%;
            max-height: 100%;
        }
        .anime-error-box {
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
        .anime-error-box strong {
            color: #ef4444;
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div id="canvas-container"></div>

    <!-- Anime.js Engine Library -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js"><\/script>

    <script>
        function showError(title, message) {
            const errDiv = document.createElement('div');
            errDiv.className = 'anime-error-box';
            errDiv.innerHTML = '<strong>' + title + '</strong>' + 
                (message ? String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
            document.body.appendChild(errDiv);
        }

        window.onerror = function(msg, url, line, col, error) {
            showError("Anime.js Runtime Error", (msg || error) + (line ? " (Line " + line + ")" : ""));
        };

        try {
            ${code ? code : `document.getElementById('canvas-container').innerHTML = '<div style="color: #71717a; font-size: 14px;">Write Anime.js animation code to render...</div>';`}
        } catch (err) {
            console.error("Anime.js Execution Error:", err);
            showError("Anime.js Execution Error", err.stack || err.message || String(err));
        }
    <\/script>
</body>
</html>`;
};

/**
 * Generates an interactive post card iframe for feed, reels, and profiles.
 * 
 * @param {string} code The raw Anime.js code.
 * @param {number} [width=1280]
 * @param {number} [height=720]
 * @returns {string} The HTML string containing an interactive iframe.
 */
window.renderAnimePostContent = function(code, width = 1280, height = 720) {
    if (!code) return '';
    const srcDoc = window.renderAnime(code, { width, height });
    return `<div class="post-preview-container" style="position: relative; width: 100%; padding-top: 56.25%; background: #080a10; border-radius: 8px; overflow: hidden;">
        <iframe 
            srcdoc="${srcDoc.replace(/"/g, '&quot;')}"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
            sandbox="allow-scripts allow-same-origin"
            loading="lazy">
        </iframe>
    </div>`;
};
