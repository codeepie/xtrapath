// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/anime_handler.js

/**
 * Anime.js (Kinetic Motion Graphics Engine) Handler
 * Renders Anime.js kinetic animations, vector paths, and motion graphics inside an isolated sandbox iframe.
 */

window.animeTemplates = {
    'kinetic_grid': `// Anime.js: Kinetic Stagger Matrix & Harmonic Radiant Waves
const container = document.getElementById('canvas-container') || document.body;
container.innerHTML = \`
<div style="position: relative; width: 100%; height: 100%; background: #060814; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  
  <!-- Glowing Ambient Atmosphere Orbs -->
  <div class="ambient-glow" style="position: absolute; width: 450px; height: 450px; background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(236, 72, 153, 0.1) 45%, transparent 70%); border-radius: 50%; filter: blur(50px); pointer-events: none;"></div>
  
  <!-- Sleek Minimal Header -->
  <div style="z-index: 10; text-align: center; margin-bottom: 24px;">
    <div class="matrix-badge" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; color: #a5b4fc; margin-bottom: 8px;">
      <span style="width: 6px; height: 6px; background: #6366f1; border-radius: 50%; box-shadow: 0 0 8px #6366f1;"></span>
      Kinetic Harmonic Grid
    </div>
    <h1 class="matrix-title" style="margin: 0; font-size: 2.0rem; font-weight: 800; background: linear-gradient(135deg, #38bdf8, #818cf8, #f43f5e); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 1px;">
      Geometric Stagger Matrix
    </h1>
  </div>

  <!-- Kinetic 9x9 Node Matrix (81 Nodes) -->
  <div id="gridMatrix" style="display: grid; grid-template-columns: repeat(9, 32px); grid-template-rows: repeat(9, 32px); gap: 10px; z-index: 5; padding: 12px; background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; backdrop-filter: blur(10px);"></div>

  <!-- Synchronized Bottom Progress Timeline -->
  <div style="position: absolute; bottom: 28px; width: 340px; height: 4px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
    <div class="matrix-timeline" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8, #f43f5e); border-radius: 4px;"></div>
  </div>
</div>
\`;

// Populate 81 Grid Elements
const grid = document.getElementById('gridMatrix');
const totalNodes = 81;
for (let i = 0; i < totalNodes; i++) {
  const node = document.createElement('div');
  node.className = 'grid-node';
  node.style.cssText = 'width: 32px; height: 32px; background: #1e293b; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); will-change: transform, background-color, box-shadow;';
  grid.appendChild(node);
}

// Master Timeline Choreography
const tl = anime.timeline({
  easing: 'easeInOutQuad',
  loop: true
});

tl
.add({
  targets: '.ambient-glow',
  scale: [0.85, 1.3, 0.85],
  opacity: [0.35, 0.75, 0.35],
  duration: 2400,
  easing: 'easeInOutSine'
}, 0)
.add({
  targets: '.matrix-timeline',
  width: ['0%', '100%'],
  duration: 3600,
  easing: 'linear'
}, 0)
.add({
  targets: '.grid-node',
  scale: [
    { value: 0.15, easing: 'easeOutSine', duration: 400 },
    { value: 1.25, easing: 'easeInOutQuad', duration: 700 },
    { value: 1.0, easing: 'easeInOutQuad', duration: 450 }
  ],
  rotateZ: anime.stagger([0, 180], { grid: [9, 9], from: 'center' }),
  borderRadius: [
    { value: '50%', duration: 500 },
    { value: '8px', duration: 600 }
  ],
  backgroundColor: [
    { value: '#06b6d4', duration: 400 },
    { value: '#6366f1', duration: 500 },
    { value: '#ec4899', duration: 500 },
    { value: '#1e293b', duration: 400 }
  ],
  boxShadow: [
    { value: '0 0 16px rgba(6, 182, 212, 0.8)', duration: 400 },
    { value: '0 0 24px rgba(236, 72, 153, 0.8)', duration: 500 },
    { value: '0 0 0px transparent', duration: 500 }
  ],
  delay: anime.stagger(55, { grid: [9, 9], from: 'center' }),
  duration: 1800
}, 200)
.add({
  targets: '.matrix-title',
  scale: [0.95, 1.03, 1.0],
  duration: 1200,
  easing: 'easeInOutSine'
}, 300);`,

    'svg_morph': `// Anime.js: Fluid Organic SVG Path Morphing & Elastic Bloom
const container = document.getElementById('canvas-container') || document.body;
container.innerHTML = \`
<div style="position: relative; width: 100%; height: 100%; background: #060713; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  
  <!-- Subtle Gradient Background Glow -->
  <div class="morph-glow" style="position: absolute; width: 380px; height: 380px; background: radial-gradient(circle, rgba(236, 72, 153, 0.22) 0%, rgba(56, 189, 248, 0.15) 50%, transparent 70%); border-radius: 50%; filter: blur(50px); pointer-events: none;"></div>
  
  <!-- SVG Canvas with Filters & Morph Paths -->
  <svg viewBox="0 0 400 400" style="width: 380px; height: 380px; z-index: 5; filter: drop-shadow(0 0 25px rgba(236, 72, 153, 0.35));">
    <defs>
      <linearGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="50%" stop-color="#a855f7" />
        <stop offset="100%" stop-color="#f43f5e" />
      </linearGradient>
      <linearGradient id="strokeGrad" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="50%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#ec4899" />
      </linearGradient>
    </defs>
    
    <!-- Outer Orbiting Dashed Ring -->
    <circle class="orbit-ring" cx="200" cy="200" r="175" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" stroke-dasharray="8 6" />
    
    <!-- Orbiting Accent Satellites -->
    <circle class="sat-dot sat-1" cx="200" cy="25" r="4.5" fill="#38bdf8" filter="drop-shadow(0 0 6px #38bdf8)" />
    <circle class="sat-dot sat-2" cx="375" cy="200" r="4.5" fill="#f43f5e" filter="drop-shadow(0 0 6px #f43f5e)" />
    <circle class="sat-dot sat-3" cx="200" cy="375" r="4.5" fill="#a855f7" filter="drop-shadow(0 0 6px #a855f7)" />
    
    <!-- Central Fluid Morphing Blob Path -->
    <path id="morphBlob" 
      d="M200,60 C290,60 340,120 340,200 C340,285 285,340 200,340 C115,340 60,285 60,200 C60,115 115,60 200,60 Z" 
      fill="url(#blobGrad)" 
      stroke="url(#strokeGrad)" 
      stroke-width="3" 
      opacity="0.88" />
      
    <!-- Inner Radiant Core -->
    <circle class="inner-core" cx="200" cy="200" r="32" fill="rgba(255,255,255,0.9)" filter="drop-shadow(0 0 16px rgba(255,255,255,0.9))" />
  </svg>

  <div style="z-index: 10; text-align: center; margin-top: 10px;">
    <span class="morph-label" style="font-size: 0.85rem; letter-spacing: 3px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">Fluid Morphing Polygon</span>
  </div>
</div>
\`;

// 4 Geometric & Organic SVG Path Keyframes
const path1 = "M200,60 C290,60 340,120 340,200 C340,285 285,340 200,340 C115,340 60,285 60,200 C60,115 115,60 200,60 Z";
const path2 = "M200,45 C320,80 365,180 310,270 C260,350 140,365 75,290 C10,210 70,110 200,45 Z";
const path3 = "M200,75 C295,40 370,140 330,235 C290,330 180,360 105,310 C30,250 85,120 200,75 Z";
const path4 = "M200,50 C310,50 355,160 355,200 C355,310 270,350 200,350 C90,350 45,290 45,200 C45,90 120,50 200,50 Z";

// Master Morphing Loop
anime({
  targets: '#morphBlob',
  d: [
    { value: path2, duration: 1600, easing: 'easeInOutQuint' },
    { value: path3, duration: 1700, easing: 'easeInOutCubic' },
    { value: path4, duration: 1600, easing: 'easeInOutSine' },
    { value: path1, duration: 1800, easing: 'easeInOutQuint' }
  ],
  loop: true
});

// Subtle 360 Rotation on Path
anime({
  targets: '#morphBlob',
  rotate: '1turn',
  transformOrigin: '200px 200px',
  duration: 22000,
  loop: true,
  easing: 'linear'
});

// Counter-rotating Orbit Ring
anime({
  targets: '.orbit-ring',
  rotate: '-1turn',
  transformOrigin: '200px 200px',
  duration: 16000,
  loop: true,
  easing: 'linear'
});

// Satellite Pulse & Scale
anime({
  targets: '.sat-dot',
  scale: [0.7, 1.4, 0.7],
  opacity: [0.5, 1.0, 0.5],
  delay: anime.stagger(300),
  duration: 1800,
  loop: true,
  easing: 'easeInOutSine'
});

// Inner Core Pulsing Glow
anime({
  targets: '.inner-core',
  scale: [0.8, 1.2, 0.8],
  opacity: [0.7, 1.0, 0.7],
  duration: 1500,
  loop: true,
  easing: 'easeInOutSine'
});`,

    'typo_wave': `// Anime.js: Kinetic Typographic Wave with 3D Letter Stagger
const container = document.getElementById('canvas-container') || document.body;
container.innerHTML = \`
<div style="position: relative; width: 100%; height: 100%; background: #070913; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;">
  
  <!-- Subtle Background Bokeh Light Orbs -->
  <div class="bokeh-orb" style="position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, rgba(168, 85, 247, 0.12) 40%, transparent 70%); border-radius: 50%; filter: blur(40px); pointer-events: none;"></div>
  
  <!-- Main Display Typography Stage -->
  <div style="z-index: 10; text-align: center; perspective: 1000px;">
    
    <div id="typoHeader" style="display: inline-flex; align-items: center; margin-bottom: 12px; overflow: hidden;">
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #38bdf8; display: inline-block;">K</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #38bdf8; display: inline-block;">I</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #38bdf8; display: inline-block;">N</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #38bdf8; display: inline-block;">E</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #38bdf8; display: inline-block;">T</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #38bdf8; display: inline-block;">I</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #38bdf8; display: inline-block;">C</span>
      <span style="display:inline-block; width: 12px;"></span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #c084fc; display: inline-block;">W</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #c084fc; display: inline-block;">A</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #c084fc; display: inline-block;">V</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #c084fc; display: inline-block;">E</span>
    </div>

    <div id="typoMain" style="display: flex; justify-content: center; gap: 4px; font-size: 4.2rem; font-weight: 900; letter-spacing: 4px;">
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">X</span>
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">T</span>
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">R</span>
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">A</span>
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #e879f9); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">A</span>
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">N</span>
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #fb7185); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">I</span>
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #f43f5e); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">M</span>
    </div>

    <!-- Animated Underline Tracer -->
    <div style="width: 100%; height: 3px; margin: 16px auto 0; background: rgba(255,255,255,0.1); border-radius: 3px; position: relative; overflow: hidden;">
      <div class="line-tracer" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(90deg, #38bdf8, #c084fc, #f43f5e); border-radius: 3px; transform: scaleX(0); transform-origin: left;"></div>
    </div>
  </div>
</div>
\`;

// Master Choreographed Typographic Timeline
const tl = anime.timeline({
  loop: true,
  direction: 'alternate',
  easing: 'easeInOutQuad'
});

tl
.add({
  targets: '.bokeh-orb',
  scale: [0.8, 1.3],
  opacity: [0.25, 0.65],
  duration: 2000,
  easing: 'easeInOutSine'
}, 0)
.add({
  targets: '.sub-letter',
  translateY: [-25, 0],
  opacity: [0, 1],
  duration: 600,
  delay: anime.stagger(40),
  easing: 'easeOutQuad'
}, 100)
.add({
  targets: '.typo-char',
  translateY: [
    { value: -45, duration: 600, easing: 'easeOutBack' },
    { value: 0, duration: 800, easing: 'easeOutBounce' }
  ],
  rotateX: [
    { value: -45, duration: 500, easing: 'easeOutQuad' },
    { value: 0, duration: 600, easing: 'easeOutBack' }
  ],
  rotateZ: function(el, i) {
    return [i % 2 === 0 ? -12 : 12, 0];
  },
  scale: [
    { value: 1.25, duration: 500, easing: 'easeOutQuad' },
    { value: 1.0, duration: 600, easing: 'easeOutElastic(1, .6)' }
  ],
  filter: [
    { value: 'drop-shadow(0 15px 25px rgba(244,63,94,0.6))', duration: 600 },
    { value: 'drop-shadow(0 0 0px transparent)', duration: 600 }
  ],
  delay: anime.stagger(90, { from: 'center' }),
  duration: 1600
}, 300)
.add({
  targets: '.line-tracer',
  scaleX: [0, 1],
  duration: 800,
  easing: 'easeInOutExpo'
}, 700);`,

    'neon_hud': `// Anime.js: Cybernetic Circular HUD Reticle & Radar Scanner
const container = document.getElementById('canvas-container') || document.body;
container.innerHTML = \`
<div style="position: relative; width: 100%; height: 100%; background: #050811; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
  
  <!-- Subtle Background Radar Glow -->
  <div class="hud-glow" style="position: absolute; width: 420px; height: 420px; background: radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.1) 50%, transparent 70%); border-radius: 50%; filter: blur(45px); pointer-events: none;"></div>

  <!-- SVG Holographic HUD Container -->
  <svg viewBox="0 0 440 440" style="width: 400px; height: 400px; z-index: 5; filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.35));">
    
    <!-- Coordinate Crosshairs -->
    <line x1="220" y1="40" x2="220" y2="400" stroke="rgba(16, 185, 129, 0.2)" stroke-width="1" stroke-dasharray="4 4" />
    <line x1="40" y1="220" x2="400" y2="220" stroke="rgba(16, 185, 129, 0.2)" stroke-width="1" stroke-dasharray="4 4" />

    <!-- Outer Compass Ring with Dashes -->
    <circle class="hud-outer-ring" cx="220" cy="220" r="180" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="6 8" opacity="0.65" />
    
    <!-- Reverse Caliper Ring Arcs -->
    <circle class="hud-caliper-1" cx="220" cy="220" r="150" fill="none" stroke="#06b6d4" stroke-width="3" stroke-dasharray="70 40 30 50" opacity="0.85" />
    <circle class="hud-caliper-2" cx="220" cy="220" r="125" fill="none" stroke="#34d399" stroke-width="2" stroke-dasharray="120 60" opacity="0.75" />

    <!-- Center Radar Scanning Sweep Beam -->
    <g class="radar-beam">
      <path d="M220,220 L320,130 A140,140 0 0,0 220,80 Z" fill="rgba(16, 185, 129, 0.25)" />
      <line x1="220" y1="220" x2="320" y2="130" stroke="#10b981" stroke-width="2" />
    </g>

    <!-- Inner Rotating Hex Core -->
    <polygon class="hud-hex" points="220,185 250,202 250,238 220,255 190,238 190,202" fill="none" stroke="#38bdf8" stroke-width="2" />
    
    <!-- Central Pulsing Target Lock Dot -->
    <circle class="hud-lock" cx="220" cy="220" r="7" fill="#10b981" filter="drop-shadow(0 0 8px #10b981)" />

    <!-- Corner Sci-Fi Telemetry Readouts -->
    <text x="50" y="70" fill="#34d399" font-size="11" font-weight="600" letter-spacing="2">SYS::RADAR.V4</text>
    <text x="310" y="70" fill="#38bdf8" font-size="11" font-weight="600" letter-spacing="2">LOCK::ENGAGED</text>
    <text x="50" y="380" fill="#10b981" font-size="11" font-weight="600" letter-spacing="2">BRG::342.5°</text>
    <text class="hud-counter" x="310" y="380" fill="#34d399" font-size="11" font-weight="600" letter-spacing="2">RNG::1840M</text>
  </svg>

  <div style="z-index: 10; margin-top: 10px; display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #6ee7b7; letter-spacing: 2px;">
    <span class="hud-ping" style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
    <span>AUTONOMOUS TARGETING INTERFACE</span>
  </div>
</div>
\`;

// Radar Sweep Continuous Rotation
anime({
  targets: '.radar-beam',
  rotate: '1turn',
  transformOrigin: '220px 220px',
  duration: 3500,
  loop: true,
  easing: 'linear'
});

// Counter-Rotating Calipers
anime({
  targets: '.hud-outer-ring',
  rotate: '1turn',
  transformOrigin: '220px 220px',
  duration: 20000,
  loop: true,
  easing: 'linear'
});

anime({
  targets: '.hud-caliper-1',
  rotate: '-1turn',
  transformOrigin: '220px 220px',
  duration: 12000,
  loop: true,
  easing: 'linear'
});

anime({
  targets: '.hud-caliper-2',
  rotate: '1turn',
  transformOrigin: '220px 220px',
  duration: 8000,
  loop: true,
  easing: 'linear'
});

// Hex Core Fast Flip
anime({
  targets: '.hud-hex',
  rotate: '-1turn',
  transformOrigin: '220px 220px',
  scale: [0.9, 1.15, 0.9],
  duration: 6000,
  loop: true,
  easing: 'easeInOutSine'
});

// Central Lock Ping
anime({
  targets: '.hud-lock, .hud-ping',
  scale: [0.7, 1.5, 0.7],
  opacity: [0.5, 1.0, 0.5],
  duration: 1000,
  loop: true,
  easing: 'easeInOutQuad'
});`,

    'orbital_wave': `// --- Anime.js: Orbital Particle Rings & Motion Waves ---
const container = document.getElementById('canvas-container') || document.body;
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
