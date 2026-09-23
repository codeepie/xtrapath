// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/cartoon_handler.js

/**
 * Cartoon Studio Engine Handler
 * Embeds the 3D Cartoon, MoCap, Alan Becker Combat, Math Teacher, and Animal Studio
 * inside XtraAnim Studio with full 360° WebGL interactive preview and cartoon.js scriptable API.
 */

window.cartoonStudioTemplates = {
    cinematic_movie: `// 🎬 Cartoon Studio: Multi-Shot Cinematic Movie Director (Alan Becker Style)
// Features: Automated Camera Cuts, 360° Bullet-Time Orbits, Slow-Mo Speed Ramps & Hit-Stops

Studio.setMode('parkour');
Studio.setParkourAction('hurdle_vault');
Studio.setParkourStyle('stickman_orange');

// 1. Initialize Cinematic Director
const director = Studio.createDirector();

// 🎥 SHOT 1: Wide Dynamic Sprint Dolly (0.0s - 1.8s)
director.addShot({
  name: 'Sprint Approach',
  startTime: 0.0,
  duration: 1.8,
  cameraPos: [-16, 2, 14],
  cameraEndPos: [-5, 1, 10],
  lookAt: [-8, 0, 0],
  lookAtEnd: [-2, 1, 0],
  fov: 48,
  speedStart: 1.0,
  speedEnd: 1.0,
  dialogue: 'Approach & Sprint Acceleration'
});

// 🎥 SHOT 2: Mid-Air 360° Bullet-Time Slow-Mo (1.8s - 3.8s)
director.addShot({
  name: 'Obstacle Vault & 360 Flip',
  startTime: 1.8,
  duration: 2.0,
  cameraPos: [0, 4, 11],
  cameraEndPos: [3, 6, 8],
  lookAt: [0, 2.5, 0],
  fov: 38, // Telephoto focus on acrobatics
  speedStart: 0.25, // Silky Smooth Slow-Mo
  speedEnd: 0.20,
  orbitSpeed: 35, // 360° Orbital Bullet-Time
  dialogue: 'Kinetic Obstacle Vault (0.25x Slow-Mo)',
  onStart: () => {
    director.triggerHitStop(0.06, 0.4); // Micro-pause on hurdle push-off
  }
});

// 🎥 SHOT 3: Heavy Impact Landing & Hero Pose (3.8s - 5.5s)
director.addShot({
  name: 'Impact Landing & Recovery',
  startTime: 3.8,
  duration: 1.7,
  cameraPos: [8, 0.8, 9],
  cameraEndPos: [9, 1.5, 11],
  lookAt: [7, 0, 0],
  fov: 42,
  roll: -5, // Dynamic Dutch tilt angle
  speedStart: 1.2, // Snap back to full impact speed
  speedEnd: 1.0,
  dialogue: 'Precision Roll & Impact Recovery',
  onStart: () => {
    director.triggerHitStop(0.08, 1.4); // Heavy impact hit-stop + screen shake
  }
});

// 2. Play live director storyboard in canvas
director.play();

// 🎬 To Export Full 1080p 60FPS Movie as MP4, run:
// director.exportMovie({ durationSec: 5.5, width: 1920, height: 1080, fps: 60 });
`,

    parkour_physics: `// 🏃‍♂️ Cartoon Studio: The Physics of Parkour (Alan Becker Style)
// 3D Stickman Kinematics, hurdle obstacle vault, 360° flip & impact landing

Studio.setMode('parkour');
Studio.setParkourStyle('stickman_orange'); // 'stickman_orange', 'stickman_black', 'stickman_red', 'stickman_blue', 'stickman_green'
Studio.setParkourSpeed(0.35); // 0.20x to 1.0x slow-mo playback
Studio.enableParkourTelemetry(false); // Clean screen (HUD badge disabled)

// 🎬 Export Manim-Grade 1080p 60FPS Video (Run whenever you want to export):
// Studio.exportVideo({ durationSec: 4.5, width: 1920, height: 1080, fps: 60 });
`,

    dual_parkour: `// 🏀 Cartoon Studio: Seamless Dual-Athlete Arena Loop
// Primary (Orange): Fastbreak sprint, jump shot, ball retrieval & walk back
// Companion (White): Sprint, 360° hurdle vault, shock absorption & jog back

Studio.setMode('parkour');
Studio.setParkourAction('basketball_dunk');
Studio.setParkourStyle('stickman_orange');
Studio.setParkourSpeed(0.35);
Studio.enableParkourTelemetry(false); // Clean screen (HUD badge disabled)
Studio.enableBoundary(true);          // Illuminated glass boundary arena

// 🏃 White Stick Figure on the Tartan Parkour Track (Z = -10)
Studio.setCompanionParkour({
    enabled: true,
    style: 'stickman_white',
    action: 'hurdle_vault',
    offsetZ: -10,
    speed: 0.35
});

// 🎬 Seamless Director Choreography (Continuous Loop)
const director = Studio.createDirector();

// 🎥 1. STADIUM OVERVIEW (0.0s - 2.0s)
director.addShot({
    name: 'Arena Overview & Dual Sprint Approach',
    startTime: 0.0,
    duration: 2.0,
    cameraPos: [0, 38, 52],
    cameraEndPos: [18, 11, 24],
    lookAt: [0, 0, -5],
    fov: 62,
    fovEnd: 44,
    ease: 'easeInOut'
});

// 🎥 2. FOCUS ON ORANGE (2.0s - 3.8s): Hardwood Maple Court Jump Shot & Swish
director.addShot({
    name: 'Orange: Jump Shot & Swish',
    startTime: 2.0,
    duration: 1.8,
    cameraPos: [18, 11, 24],
    cameraEndPos: [11, 4.2, 11],
    lookAt: [0, 0, -5],
    lookAtEnd: [3.5, 2.5, 0],
    fov: 44,
    fovEnd: 36,
    ease: 'easeInOut'
});

// 🎥 3. FOCUS ON WHITE (3.8s - 5.6s): Tartan Track 360° Hurdle Vault
director.addShot({
    name: 'White: 360° Hurdle Vault & Cushion',
    startTime: 3.8,
    duration: 1.8,
    cameraPos: [11, 4.2, 11],
    cameraEndPos: [8.5, 4.8, -2],
    lookAt: [3.5, 2.5, 0],
    lookAtEnd: [2.5, 3.8, -10],
    fov: 36,
    fovEnd: 34,
    ease: 'easeInOut'
});

// 🎥 4. WHITE FOREGROUND & ORANGE BALL RETRIEVAL (5.6s - 7.6s)
director.addShot({
    name: 'Ball Retrieval & White Foreground Perspective',
    startTime: 5.6,
    duration: 2.0,
    cameraPos: [8.5, 4.8, -2],
    cameraEndPos: [15, 5.2, -24],
    lookAt: [2.5, 3.8, -10],
    lookAtEnd: [4.0, 1.2, -5],
    fov: 34,
    fovEnd: 42,
    ease: 'easeInOut'
});

// 🎥 5. 0° TO 720° ARENA PANORAMA (7.6s - 10.4s)
director.addShot({
    name: '0-720° Arena Orbital Sweep (Walk Back to Start)',
    startTime: 7.6,
    duration: 2.8,
    orbitAngleStart: 0,
    orbitAngleEnd: 180,
    orbitRadius: 38,
    orbitHeight: 15,
    lookAt: [0, 0, -5],
    fov: 46,
    fovEnd: 46,
    ease: 'easeInOut'
});

// 🎥 6. DUAL ALIGNMENT (10.4s - 12.38s): Seamless return to starting line
director.addShot({
    name: 'Ready Stance: Return to Start Line for 2nd Attempt',
    startTime: 10.4,
    duration: 1.98,
    cameraPos: [18, 9.5, 24],
    cameraEndPos: [0, 38, 52],
    lookAt: [0, 0, -5],
    fov: 46,
    fovEnd: 62,
    ease: 'easeInOut'
});

director.play();
`,

    generative_matrix: `// 🌐 Cartoon Studio: Generative 3D Cartoon World & Props
// Write your own JavaScript code to spawn 3D cartoon characters, props & orbital animations

Studio.setMode('fight'); // Base environment with floor & 3-point toon lighting
Studio.hideArenaFighters(); // Clean stage without default combatants
Studio.setCameraPreset('iso');

// 1. Spawn a custom Emerald Stickman Hero
const hero = Studio.createCharacter({
  style: 'stickman_green',
  position: [-3, 0, 0],
  scale: 1.1,
  color: 0x10b981
});

// 2. Spawn a glowing floating cartoon energy orb
const orb = Studio.createProp('energy_sphere', {
  color: 0x38bdf8,
  radius: 1.5,
  position: [0, 9, 0]
});

// 3. Spawn a defensive holographic shield
const shield = Studio.createProp('shield', {
  color: 0x818cf8,
  position: [3.5, 8, 0]
});

// 4. Real-time procedural animation loop (User-scripted physics)
Studio.onUpdate((delta, elapsed) => {
  // Float the energy orb up and down with harmonic oscillation
  orb.position.y = 9 + Math.sin(elapsed * 2.5) * 1.2;
  orb.rotation.y += delta * 1.5;
  
  // Rotate the energy shield in orbit
  shield.rotation.z += delta * 2.0;
  shield.position.y = 8 + Math.cos(elapsed * 2.0) * 0.8;
});
`,

    custom_battle: `// ⚔️ Cartoon Studio: Scriptable Timeline Battle Choreography
// Program step-by-step fight choreography with camera shake & impact FX

Studio.setMode('fight');
Studio.setSpeed(1.0);

const f1 = Studio.getFighter1();
const f2 = Studio.getFighter2();

// Create an action timeline with synchronized camera and impact FX
const battle = Studio.timeline();

battle
  // 0.0s: Fighter 1 dashes in
  .at(0.0, () => {
    f1.moveTo(2.4, 0, 0, 0.25);
  })
  // 0.25s: Fighter 1 delivers a straight punch, Fighter 2 blocks
  .at(0.25, () => {
    f1.attack('punch', 0.12);
    f2.attack('block', 0.12);
    Studio.fx.sparks(0.5, 12, 0);
    Studio.fx.shockwave(0.5, 12, 0, 0xffea00);
    Studio.camera.shake(0.5);
  })
  // 0.6s: Fighter 2 counter-kicks
  .at(0.6, () => {
    f2.attack('kick', 0.18);
    Studio.fx.sparks(-0.5, 13.5, 0);
    Studio.camera.shake(0.35);
  })
  // 1.0s: Fighter 1 recoils from knockback
  .at(1.0, () => {
    f1.attack('knockback', 0.3);
  })
  // 1.5s: Both reset to ready stance
  .at(1.5, () => {
    f1.reset(0.3);
    f2.reset(0.3);
  });
`,

    fight_arena: `// ⚔️ Cartoon Studio: Stickman Combat Arena (Alan Becker Style)
// Program 3D stickman fighting choreography, acrobatics & combos

Studio.setMode('fight');
Studio.setSpeed(1.0);
Studio.enableCameraShake(true);

// Fighter 1 Setup (The Second Coming)
Studio.setFighter1({
  name: 'The Second Coming',
  style: 'stickman_orange'
});

// Fighter 2 Setup (Rival)
Studio.setFighter2({
  name: 'Blue Rival',
  style: 'stickman_blue'
});

// Play the full Alan Becker choreographed battle sequence
Studio.playCombo();
`,

    math_teacher: `// 🧑‍🏫 Cartoon Studio: 3D Math & Science Teacher
// Animated professor with chalkboard writing, pointing, and speech

Studio.setMode('teacher');
Studio.setLesson('quadratic'); // 'quadratic', 'derivative', 'linear', 'euler', 'pythagoras', 'integral'
Studio.setTeacherStyle('hero'); // 'hero', 'runner', 'robot'

// Auto-teach the interactive blackboard step-by-step
Studio.autoExplain();
`,

    animal_studio: `// 🐾 Cartoon Studio: Quadruped & Creature Locomotion
// Procedural quadruped inverse kinematics with gait dynamics

Studio.setMode('animal');
Studio.setSpecies('dino'); // 'dog', 'cat', 'dino', 'bird'
Studio.setGait('trot');   // 'walk', 'trot', 'sprint', 'stalk', 'sit'
Studio.setSpeed(1.15);
Studio.setTailWag(true);
Studio.setCameraPreset('side'); // 'side', 'front', 'iso'
`,

    solo_mocap: `// 🏃 Cartoon Studio: Solo MoCap Character Studio
// CMU Motion Capture with customizable 3D cartoon skins

Studio.setMode('solo');
Studio.setMotion('walk'); // 'walk', 'run'
Studio.setCharacterStyle('stickman_orange'); // 'stickman_orange', 'stickman_black', 'hero', 'runner', 'robot'
Studio.setInPlace(true);
Studio.setSpeed(1.0);
Studio.setCameraPreset('side'); // 'side', 'front', 'iso'
`
};

/**
 * Renders the Cartoon Studio 3D WebGL engine inside an iframe.
 * @param {string} userCode The cartoon.js code written by user in the Studio editor.
 * @param {object} options Configuration options from XtraAnim Studio.
 * @returns {string} The full HTML document source for the player iframe.
 */
window.renderCartoonStudio = function(userCode, options = {}) {
    const rawCode = (userCode || '').trim();
    // Escape script closing tag in user code to prevent prematurely breaking the script tag
    const safeUserCode = rawCode.replace(/<\/script>/gi, '<\\/script>');

    // Resolve target active mode: CODE SPECIFIED MODE ALWAYS TAKES PRECEDENCE OVER UI PRESET!
    let targetMode = '';
    if (/Studio\.setMode\(\s*['"]fight['"]\s*\)/i.test(safeUserCode)) targetMode = 'fight';
    else if (/Studio\.setMode\(\s*['"]parkour['"]\s*\)/i.test(safeUserCode)) targetMode = 'parkour';
    else if (/Studio\.setMode\(\s*['"]teacher['"]\s*\)/i.test(safeUserCode)) targetMode = 'teacher';
    else if (/Studio\.setMode\(\s*['"]animal['"]\s*\)/i.test(safeUserCode)) targetMode = 'animal';
    else if (/Studio\.setMode\(\s*['"]solo['"]\s*\)/i.test(safeUserCode)) targetMode = 'solo';
    else if (/Studio\.createCharacter|Studio\.createProp|\.dance\(|customStudioGroup/i.test(safeUserCode)) targetMode = 'fight';
    else if (options.mode) targetMode = options.mode;
    else if (options.defaultPreset) {
        const p = options.defaultPreset;
        if (p === 'dual_parkour' || p === 'cinematic_movie' || p === 'parkour_physics' || p === 'parkour') targetMode = 'parkour';
        else if (p === 'fight_arena' || p === 'custom_battle' || p === 'fight') targetMode = 'fight';
        else if (p === 'animal_studio' || p === 'animal') targetMode = 'animal';
        else if (p === 'solo_mocap' || p === 'solo') targetMode = 'solo';
        else targetMode = 'teacher';
    } else {
        targetMode = 'parkour';
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <base href="/engines/cartoon_studio/">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <title>Cartoon Studio (3D MoCap)</title>
    <link rel="stylesheet" href="style.css?v=55">
    
    <!-- 100% Local Self-Contained Import Map for Three.js (Zero CDN/Network Dependencies) -->
    <script type="importmap">
        {
            "imports": {
                "three": "./vendor/three.module.js",
                "three/addons/loaders/BVHLoader.js": "./vendor/BVHLoader.js",
                "three/addons/controls/OrbitControls.js": "./vendor/OrbitControls.js"
            }
        }
    </script>
    <style>
        /* Pure 3D cartoon view - hide in-canvas controls overlay & sidebar toggle */
        #ui-overlay,
        #sidebar-toggle-btn {
            display: none !important;
        }
        html, body, #canvas-container {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
        }
        canvas {
            display: block !important;
            width: 100% !important;
            height: 100% !important;
        }
    </style>
    <script>
        window.addEventListener('error', function(e) {
            console.error('Cartoon Studio Window Error:', e);
            var b = document.getElementById('diag-error-banner');
            if (b) {
                b.style.display = 'block';
                b.textContent = '❌ JS Error: ' + (e.message || e.error || 'Failed to load script');
            }
        });
    </script>
</head>
<body>
    <div id="diag-error-banner" style="display:none; position:fixed; top:0; left:0; width:100%; background:#ef4444; color:#fff; padding:10px 16px; font-weight:bold; font-size:13px; z-index:999999; box-shadow:0 4px 12px rgba(0,0,0,0.5);"></div>
    <div id="canvas-container"></div>

    <!-- Floating Sidebar Toggle Button -->
    <button id="sidebar-toggle-btn" class="sidebar-floating-toggle" title="Toggle Controls Sidebar (Shortcut: H)">
        <span class="toggle-icon">◀</span>
        <span class="toggle-label">Hide Controls</span>
    </button>

    <!-- UI Overlay -->
    <div id="ui-overlay">
        <header class="panel-header">
            <div class="header-title-wrap">
                <h1>🎨 Cartoon Studio</h1>
                <span class="badge">3D MoCap & Combat</span>
            </div>
            <button id="btn-close-sidebar" class="sidebar-close-btn" title="Hide Sidebar (Shortcut: H)">◀</button>
        </header>

        <div class="mode-tabs">
            <button id="tab-parkour" class="tab-btn active" title="The Physics of Parkour 3D Kinematics">🏃‍♂️ Parkour</button>
            <button id="tab-solo" class="tab-btn" title="Solo MoCap Walk & Run Viewer">🏃 Solo MoCap</button>
            <button id="tab-fight" class="tab-btn" title="Alan Becker 2-Fighter Combat Arena">⚔️ Fight Arena</button>
            <button id="tab-teacher" class="tab-btn" title="3D Cartoon Math Teacher with Smart Board">🧑‍🏫 Math Teacher</button>
            <button id="tab-animal" class="tab-btn" title="Quadruped & Dinosaur Skeletons with Procedural Gaits">🐾 Animal Studio</button>
        </div>

        <!-- Parkour Physics Panel -->
        <div id="parkour-panel" class="controls-panel" style="display: none;">
            <div class="control-group row">
                <div class="sub-group">
                    <label for="parkour-action-select">Parkour Action:</label>
                    <select id="parkour-action-select">
                        <option value="basketball_dunk" selected>🏀 Basketball Slam Dunk</option>
                        <option value="hurdle_vault">🏃‍♂️ 360° Hurdle Vault</option>
                    </select>
                </div>
                <div class="sub-group">
                    <label for="parkour-style-select">Character Style:</label>
                    <select id="parkour-style-select">
                        <option value="stickman_orange" selected>🔥 Stickman (The Second Coming)</option>
                        <option value="stickman_black">✏️ Stickman (Alan Becker Classic)</option>
                        <option value="stickman_red">🔴 Stickman (Red)</option>
                        <option value="stickman_blue">🔵 Stickman (Blue)</option>
                        <option value="stickman_green">🟢 Stickman (Green)</option>
                        <option value="stickman_yellow">🟡 Stickman (Yellow)</option>
                        <option value="hero">⚡ Neon Hero</option>
                    </select>
                </div>
                <div class="sub-group">
                    <label for="parkour-speed-slider">Speed: <span id="parkour-speed-val">0.35x</span></label>
                    <input type="range" id="parkour-speed-slider" min="0.1" max="1.0" step="0.05" value="0.35">
                </div>
            </div>
            <div class="control-group">
                <label>Camera View:</label>
                <div class="btn-group">
                    <button id="parkour-view-side" class="active">Side Profile</button>
                    <button id="parkour-view-iso">3/4 Isometric</button>
                    <button id="parkour-view-front">Front Track</button>
                </div>
            </div>
        </div>

        <!-- Solo MoCap Panel -->
        <div id="solo-panel" class="controls-panel" style="display: none;">
            <div class="control-group row">
                <div class="sub-group">
                    <label for="anim-select">Motion:</label>
                    <select id="anim-select" disabled>
                        <option value="walk">🚶 Real Walk (02_01)</option>
                        <option value="run">🏃 Real Run/Jog (02_03)</option>
                    </select>
                </div>
                <div class="sub-group">
                    <label for="style-select">Character Style:</label>
                    <select id="style-select">
                        <option value="hero">⚡ Neon Hero</option>
                        <option value="runner">🏃 Sporty Runner</option>
                        <option value="robot">🤖 Cyber Droid</option>
                        <option value="stickman_black">✏️ Stickman (Alan Becker Classic)</option>
                        <option value="stickman_orange" selected>🔥 Stickman (The Second Coming)</option>
                        <option value="stickman_red">🔴 Stickman (Red)</option>
                        <option value="stickman_blue">🔵 Stickman (Blue)</option>
                        <option value="stickman_green">🟢 Stickman (Green)</option>
                    </select>
                </div>
            </div>

            <div class="control-group">
                <label for="speed-slider">Speed: <span id="speed-val">1.0x</span></label>
                <input type="range" id="speed-slider" min="0.25" max="2.0" step="0.25" value="1.0">
            </div>

            <div class="control-group">
                <label>Camera View:</label>
                <div class="btn-group">
                    <button id="view-side" class="active" title="2D Side Profile Walk Cycle">Side (2D)</button>
                    <button id="view-front" title="Frontal walking view">Front</button>
                    <button id="view-iso" title="3/4 Isometric 3D view">3/4 Angle</button>
                </div>
            </div>

            <div class="control-group toggles">
                <label class="checkbox-container">
                    <input type="checkbox" id="in-place-toggle" checked>
                    <span class="checkmark"></span>
                    Walk In-Place (Treadmill)
                </label>
                <label class="checkbox-container">
                    <input type="checkbox" id="skeleton-toggle">
                    <span class="checkmark"></span>
                    Show Bone Skeleton
                </label>
                <label class="checkbox-container">
                    <input type="checkbox" id="grid-toggle" checked>
                    <span class="checkmark"></span>
                    Floor Grid & Shadows
                </label>
            </div>

            <div class="control-group actions">
                <button id="play-pause-btn" disabled>Loading...</button>
                <button id="reset-btn" title="Reset animation and camera">Reset</button>
                <div class="status" id="status-text">Loading MoCap...</div>
            </div>

            <div class="hint">
                💡 Drag with mouse to orbit 360° around the cartoon character. Scroll to zoom.
            </div>
        </div>

        <!-- Fight Arena Panel -->
        <div id="fight-panel" class="controls-panel" style="display: none;">
            <div class="matchup-banner">
                <span class="fighter-tag orange">Fighter 1 (Orange)</span>
                <span class="vs-badge">VS</span>
                <span class="fighter-tag blue">Fighter 2 (Blue)</span>
            </div>

            <div class="control-group">
                <button id="play-fight-btn" class="primary-fight-btn">⚔️ Play Full Fight Combo</button>
            </div>

            <div class="control-group row fight-options">
                <label class="checkbox-container">
                    <input type="checkbox" id="fight-loop-toggle">
                    <span class="checkmark"></span>
                    Auto-Loop Battle
                </label>
                <label class="checkbox-container">
                    <input type="checkbox" id="fx-toggle" checked>
                    <span class="checkmark"></span>
                    Hit Sparks & Camera Shake
                </label>
            </div>

            <div class="control-group">
                <label>Trigger Move On Demand:</label>
                <div class="action-grid">
                    <button id="btn-action-punch" class="action-btn" title="Fighter 1 dashes in and jabs">🥊 Dash & Jab</button>
                    <button id="btn-action-block" class="action-btn" title="Fighter 2 blocks with sparks">🛡️ Guard Block</button>
                    <button id="btn-action-kick" class="action-btn" title="Fighter 2 spins roundhouse kick">🦵 Roundhouse Kick</button>
                    <button id="btn-action-sweep" class="action-btn" title="Fighter 1 ducks and sweeps">🌪️ Duck & Sweep</button>
                    <button id="btn-action-flip" class="action-btn" title="Fighter 2 does an aerial backflip">🤸 Aerial Flip</button>
                    <button id="btn-action-knockback" class="action-btn" title="Heavy hit knockback slide">💥 Knockback Strike</button>
                    <button id="btn-action-flurry" class="action-btn combo" title="Rapid punch-block exchange clash">⚡ Rapid Flurry Clash</button>
                    <button id="btn-fight-reset" class="action-btn reset" title="Reset both fighters to combat stance">🔄 Reset Stance</button>
                </div>
            </div>

            <div class="control-group row">
                <div class="sub-group">
                    <label for="fighter1-style">Fighter 1 Style:</label>
                    <select id="fighter1-style">
                        <option value="stickman_orange" selected>🔥 The Second Coming (Orange)</option>
                        <option value="stickman_red">🔴 Red</option>
                        <option value="stickman_blue">🔵 Blue</option>
                        <option value="stickman_green">🟢 Green</option>
                    </select>
                </div>
                <div class="sub-group">
                    <label for="fight-speed">Combat Speed:</label>
                    <select id="fight-speed">
                        <option value="0.5">0.5x Slow-Mo</option>
                        <option value="1.0" selected>1.0x Real-Time</option>
                        <option value="1.3">1.3x Hyper AvA</option>
                    </select>
                </div>
            </div>

            <div class="status" id="fight-status-text">Combat ready. Click Play or trigger a move!</div>
        </div>

        <!-- Math Teacher & Smart Board Panel -->
        <div id="teacher-panel" class="controls-panel" style="display: flex;">
            <div class="matchup-banner teacher-banner">
                <span class="fighter-tag orange">🧑‍🏫 3D Cartoon Math Teacher</span>
                <span class="vs-badge">📐</span>
                <span class="fighter-tag blue">Smart Board</span>
            </div>

            <div class="control-group row">
                <div class="sub-group">
                    <label for="lesson-select">Math Topic:</label>
                    <select id="lesson-select">
                        <option value="quadratic" selected>📐 Quadratic Formula & Roots</option>
                        <option value="derivative">📈 Calculus: Derivative as Tangent Limit</option>
                        <option value="linear">📉 Linear Equation: y = mx + b</option>
                        <option value="euler">🌀 Euler's Beautiful Identity: e^(iπ) + 1 = 0</option>
                        <option value="pythagoras">🔺 Pythagorean Theorem: a² + b² = c²</option>
                        <option value="integral">📊 Calculus: Definite Integral Area</option>
                    </select>
                </div>
                <div class="sub-group">
                    <label for="teacher-style-select">Teacher Avatar:</label>
                    <select id="teacher-style-select">
                        <option value="hero" selected>⚡ Neon Hero (MoCap)</option>
                        <option value="runner">🏃 Sporty Runner (MoCap)</option>
                        <option value="robot">🤖 Cyber Droid (MoCap)</option>
                        <option value="stickman_orange">🟠 Stickman (The Second Coming)</option>
                        <option value="stickman_black">⚫ Stickman (The Chosen One)</option>
                        <option value="stickman_blue">🔵 Stickman (Blue)</option>
                        <option value="stickman_red">🔴 Stickman (Red)</option>
                        <option value="stickman_green">🟢 Stickman (Green)</option>
                    </select>
                </div>
            </div>

            <div class="control-group">
                <label>Lesson Step (<span id="step-counter">1 / 4</span>):</label>
                <div class="teacher-step-nav">
                    <button id="btn-teacher-prev" class="step-nav-btn" title="Previous step">⏮️ Prev</button>
                    <button id="btn-teacher-play" class="step-nav-btn primary" title="Auto play whole explanation">▶️ Auto Explain</button>
                    <button id="btn-teacher-next" class="step-nav-btn" title="Next step">Next ⏭️</button>
                </div>
            </div>

            <div class="control-group">
                <label>Teacher Actions & Motion:</label>
                <div class="teacher-action-buttons">
                    <button id="btn-teacher-write" class="action-btn write-btn" title="Watch teacher physically write on blackboard with chalk">✍️ Write on Board</button>
                    <button id="btn-teacher-explain" class="action-btn explain-btn" title="Turn & gesture to student">💬 Explain & Point</button>
                </div>
                <div class="teacher-walk-nav">
                    <span class="walk-label">🚶 Walk To:</span>
                    <button id="btn-walk-left" class="walk-btn" title="Walk to left (Equation area)">Left (Equation)</button>
                    <button id="btn-walk-mid" class="walk-btn" title="Walk to center">Center</button>
                    <button id="btn-walk-right" class="walk-btn" title="Walk to right (Graph area)">Right (Graph)</button>
                </div>
            </div>

            <div class="control-group">
                <label>Click Term for Teacher to Point & Highlight:</label>
                <div id="equation-term-badges" class="term-badge-container"></div>
            </div>

            <div class="control-group toggles">
                <label class="checkbox-container">
                    <input type="checkbox" id="teacher-voice-toggle" checked>
                    <span class="checkmark"></span>
                    🔊 Speak Explanation (TTS Voice)
                </label>
                <label class="checkbox-container">
                    <input type="checkbox" id="teacher-chalk-toggle" checked>
                    <span class="checkmark"></span>
                    ✨ Real-Time Finger & Chalk Dust Sparks
                </label>
                <label class="checkbox-container">
                    <input type="checkbox" id="teacher-gestures-toggle" checked>
                    <span class="checkmark"></span>
                    🎭 Cartoon Head Nodding & Gestures
                </label>
            </div>

            <div class="teacher-speech-card">
                <div class="speech-header">
                    <span class="speech-label">💬 Teacher Explanation:</span>
                    <button id="btn-replay-speech" title="Re-speak current explanation" class="mini-icon-btn">🔊</button>
                </div>
                <div id="teacher-speech-text" class="speech-body">
                    "Welcome class! Today we solve any quadratic equation ax² + bx + c = 0."
                </div>
            </div>

            <div class="status" id="teacher-status-text">Teacher is ready. Click any term or hit Auto Explain!</div>
        </div>

        <!-- Animal Studio Panel -->
        <div id="animal-panel" class="controls-panel" style="display: none;">
            <div class="panel-section-header">
                <span class="fighter-tag orange">🐾 3D Animal Studio</span>
                <span class="sub-badge">Quadruped Kinematics</span>
            </div>

            <div class="control-group">
                <label for="animal-species-select">Species & Rig:</label>
                <select id="animal-species-select">
                    <option value="dog" selected>🐕 Shiba Inu / Wolf (Canine)</option>
                    <option value="cat">🐆 Cheetah / Black Panther (Feline)</option>
                    <option value="dino">🦖 Velociraptor (Theropod Dinosaur)</option>
                    <option value="bird">🦅 Eagle / Falcon (Avian Raptor)</option>
                </select>
            </div>

            <div class="control-group row">
                <div class="sub-group">
                    <label for="animal-gait-select">Locomotion Gait:</label>
                    <select id="animal-gait-select">
                        <option value="walk">🐾 4-Beat Walk / Soar Glide</option>
                        <option value="trot" selected>⚡ 2-Beat Trot / Ground Hop</option>
                        <option value="sprint">🚀 Gallop / Power Flap</option>
                        <option value="stalk">🐾 Stealth Prowl / Low Glide</option>
                        <option value="sit">🦅 Sit & Wag / Perch & Survey</option>
                    </select>
                </div>
                <div class="sub-group">
                    <label for="animal-coat-select">Coat & Color:</label>
                    <select id="animal-coat-select">
                        <option value="default" selected>Default Species</option>
                        <option value="golden">Golden Amber</option>
                        <option value="midnight">Midnight Shadow</option>
                        <option value="snow">Arctic Snow White</option>
                    </select>
                </div>
            </div>

            <div class="control-group">
                <label>Display & Rig Options:</label>
                <div class="toggle-row">
                    <label class="toggle-label">
                        <input type="checkbox" id="animal-skeleton-toggle">
                        <span>Show Skeleton Rig</span>
                    </label>
                    <label class="toggle-label">
                        <input type="checkbox" id="animal-mesh-toggle" checked>
                        <span>Show 3D Skin</span>
                    </label>
                </div>
                <div class="toggle-row">
                    <label class="toggle-label">
                        <input type="checkbox" id="animal-inplace-toggle" checked>
                        <span>Treadmill (In Place)</span>
                    </label>
                    <label class="toggle-label">
                        <input type="checkbox" id="animal-tailwag-toggle" checked>
                        <span>Dynamic Tail Wave</span>
                    </label>
                </div>
            </div>

            <div class="control-group">
                <div class="slider-header">
                    <label for="animal-speed-slider">Gait Speed:</label>
                    <span id="animal-speed-val">1.00x</span>
                </div>
                <input type="range" id="animal-speed-slider" min="0.2" max="2.5" step="0.05" value="1.0">
            </div>

            <div class="control-group">
                <label>Camera View:</label>
                <div class="btn-grid">
                    <button id="animal-view-side" class="preset-btn active">Side View</button>
                    <button id="animal-view-front" class="preset-btn">Front View</button>
                    <button id="animal-view-iso" class="preset-btn">3/4 Isometric</button>
                </div>
            </div>

            <div class="status" id="animal-status-text">🐾 Shiba Inu Trot ready at 60 FPS.</div>
        </div>
    </div>
    
    <!-- Set initial mode global before loading app.js -->
    <script>
        window.__CARTOON_INITIAL_MODE__ = "${targetMode}";
        // Pre-initialize Studio stub to prevent undefined errors before app.js finishes module load
        window.Studio = window.Studio || {
            _exportQueue: [],
            exportVideo(opts) {
                return new Promise((resolve, reject) => {
                    this._exportQueue.push({ opts, resolve, reject });
                });
            }
        };
    </script>
    <!-- Load 3D WebGL Engine Module with dynamic cache buster -->
    <script type="module" src="app.js?v=${Date.now()}&mode=${targetMode}"></script>

    <!-- Execute User Script from XtraAnim Studio -->
    <script type="module">
        function executeStudioScript() {
            try {
                ${safeUserCode}
            } catch (err) {
                console.error("Cartoon Studio Script Execution Error:", err);
                const banner = document.getElementById('diag-error-banner');
                if (banner) {
                    banner.style.display = 'block';
                    banner.textContent = '❌ Script Error: ' + err.message;
                }
            }
        }

        if (window.__STUDIO_READY__) {
            executeStudioScript();
        } else {
            window.addEventListener('studio-ready', () => {
                executeStudioScript();
            }, { once: true });
        }
    </script>
</body>
</html>`;
};

/**
 * Generates or extracts a high-quality thumbnail poster for Cartoon Studio 3D posts on the Explore grid.
 * @param {object} post The feed post object.
 * @returns {string} Image URL or Data URI suitable for <img src="...">.
 */
window.getCartoonStudioThumbnail = function(post) {
    if (!post) return '';
    const src = typeof post.source === 'string' ? (() => { try { return JSON.parse(post.source); } catch(_) { return {}; } })() : (post.source || {});
    
    // Check if thumbnail already exists in post or source
    const existing = post.video_url || post.media_url || post.thumbnail_url || post.cover_url || src.video_url || src.thumbnail || src.cover_image || '';
    if (existing && (existing.startsWith('http') || existing.startsWith('data:image') || existing.startsWith('/media') || existing.startsWith('/static'))) {
        if (existing.startsWith('http') || existing.startsWith('data:')) return existing;
        const backend = typeof getBackendUrl === 'function' ? getBackendUrl() : '';
        return `${backend}${existing}`;
    }

    const code = (src.code || post.code || '').toLowerCase();
    const title = String(post.title || '3D Cartoon Animation').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const author = String(post.username || src.author || 'XtraAnim Creator').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 1. Math Teacher & Chalkboard Mode
    if (code.includes('teacher') || code.includes('lesson') || code.includes('blackboard') || code.includes('quadratic') || title.toLowerCase().includes('math') || title.toLowerCase().includes('teacher')) {
        const svgTeacher = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%">
            <defs>
                <linearGradient id="boardGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#062118"/>
                    <stop offset="50%" stop-color="#0b3829"/>
                    <stop offset="100%" stop-color="#041812"/>
                </linearGradient>
                <radialGradient id="lampGlow" cx="45%" cy="30%" r="55%">
                    <stop offset="0%" stop-color="#34d399" stop-opacity="0.18"/>
                    <stop offset="100%" stop-color="#34d399" stop-opacity="0"/>
                </radialGradient>
            </defs>
            <rect width="640" height="360" fill="#020617"/>
            <!-- Chalkboard Frame -->
            <rect x="25" y="20" width="590" height="320" rx="14" fill="#1e293b" stroke="#334155" stroke-width="4"/>
            <rect x="35" y="30" width="570" height="300" rx="10" fill="url(#boardGrad)"/>
            <rect x="35" y="30" width="570" height="300" fill="url(#lampGlow)"/>
            
            <!-- Chalk Grid & Formulas -->
            <g stroke="rgba(255,255,255,0.06)" stroke-width="1">
                <line x1="70" y1="40" x2="70" y2="310"/>
                <line x1="140" y1="40" x2="140" y2="310"/>
                <line x1="210" y1="40" x2="210" y2="310"/>
                <line x1="280" y1="40" x2="280" y2="310"/>
                <line x1="350" y1="40" x2="350" y2="310"/>
                <line x1="420" y1="40" x2="420" y2="310"/>
                <line x1="490" y1="40" x2="490" y2="310"/>
                <line x1="40" y1="90" x2="600" y2="90"/>
                <line x1="40" y1="150" x2="600" y2="150"/>
                <line x1="40" y1="210" x2="600" y2="210"/>
                <line x1="40" y1="270" x2="600" y2="270"/>
            </g>
            
            <!-- Mathematical Formulas in chalk white -->
            <text x="75" y="85" fill="#f8fafc" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="20" font-weight="700" letter-spacing="1">f(x) = ax² + bx + c</text>
            <text x="75" y="125" fill="#6ee7b7" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="16" font-style="italic">x = (-b ± √(b² - 4ac)) / 2a</text>
            <path d="M 75 220 Q 150 120 225 250" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
            <circle cx="150" cy="120" r="5" fill="#f43f5e"/>
            <text x="160" y="125" fill="#fda4af" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="12">Vertex (h, k)</text>
            <text x="75" y="270" fill="#a7f3d0" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="14">∫ eˣ dx = eˣ + C</text>
            <text x="210" y="270" fill="#fed7aa" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="14">∇ · E = ρ / ε₀</text>

            <!-- 3D Teacher Stylized Silhouette with Pointer -->
            <g transform="translate(420, 110)">
                <!-- Pointer stick -->
                <line x1="-120" y1="40" x2="40" y2="110" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
                <circle x1="-120" cy="40" r="4" fill="#fbbf24"/>
                <!-- Head -->
                <circle cx="65" cy="45" r="32" fill="#0284c7" stroke="#38bdf8" stroke-width="3"/>
                <circle cx="55" cy="40" r="5" fill="#ffffff"/>
                <circle cx="75" cy="40" r="5" fill="#ffffff"/>
                <!-- Torso / Jacket -->
                <path d="M 30 90 L 100 90 L 115 220 L 15 220 Z" fill="#0369a1" stroke="#38bdf8" stroke-width="2"/>
                <path d="M 65 90 L 65 220" stroke="#bae6fd" stroke-width="3"/>
                <!-- Arm holding pointer -->
                <path d="M 35 110 L -10 140 L 40 110" fill="none" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
            </g>

            <!-- Bottom Badge Banner -->
            <rect x="35" y="280" width="570" height="50" fill="rgba(15,23,42,0.85)" backdrop-filter="blur(6px)"/>
            <text x="55" y="312" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="16" font-weight="700">${title}</text>
            <rect x="490" y="292" width="100" height="26" rx="13" fill="#10b981"/>
            <text x="540" y="309" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="11" font-weight="800" text-anchor="middle">3D TEACHER</text>
        </svg>`;
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgTeacher);
    }

    // 2. Animal & Creature Studio
    if (code.includes('animal') || code.includes('dino') || code.includes('dog') || code.includes('species') || code.includes('gait') || title.toLowerCase().includes('animal') || title.toLowerCase().includes('dino')) {
        const svgAnimal = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%">
            <defs>
                <linearGradient id="creatureBg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#0b0f19"/>
                    <stop offset="50%" stop-color="#181329"/>
                    <stop offset="100%" stop-color="#0a0518"/>
                </linearGradient>
                <radialGradient id="creatureGlow" cx="50%" cy="50%" r="45%">
                    <stop offset="0%" stop-color="#a855f7" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
                </radialGradient>
            </defs>
            <rect width="640" height="360" fill="url(#creatureBg)"/>
            <rect width="640" height="360" fill="url(#creatureGlow)"/>

            <!-- 3D Perspective Grid -->
            <g stroke="rgba(168,85,247,0.18)" stroke-width="1.5">
                <line x1="320" y1="180" x2="0" y2="360"/>
                <line x1="320" y1="180" x2="110" y2="360"/>
                <line x1="320" y1="180" x2="215" y2="360"/>
                <line x1="320" y1="180" x2="320" y2="360"/>
                <line x1="320" y1="180" x2="425" y2="360"/>
                <line x1="320" y1="180" x2="530" y2="360"/>
                <line x1="320" y1="180" x2="640" y2="360"/>
                <line x1="160" y1="225" x2="480" y2="225"/>
                <line x1="105" y1="265" x2="535" y2="265"/>
                <line x1="45" y1="312" x2="595" y2="312"/>
            </g>

            <!-- Quadruped / Velociraptor Dinosaur Rig (Stylized 3D) -->
            <g transform="translate(190, 80)">
                <!-- Tail Curve -->
                <path d="M 0 100 Q 60 75 120 110 Q 180 140 240 120" fill="none" stroke="#c084fc" stroke-width="6" stroke-linecap="round"/>
                <!-- Spine & Head -->
                <path d="M 120 110 Q 170 85 220 80 Q 255 75 280 65 L 295 72 L 275 88 Z" fill="#e879f9" stroke="#f0abfc" stroke-width="3"/>
                <!-- Glowing Rig Nodes -->
                <circle cx="120" cy="110" r="7" fill="#38bdf8"/>
                <circle cx="170" cy="85" r="7" fill="#38bdf8"/>
                <circle cx="220" cy="80" r="7" fill="#38bdf8"/>
                <circle cx="280" cy="65" r="6" fill="#f43f5e"/>
                <!-- Hind Leg (Forefront) -->
                <path d="M 120 110 L 105 160 L 140 205 L 155 208" fill="none" stroke="#a855f7" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Hind Leg (Background) -->
                <path d="M 120 110 L 140 155 L 110 198 L 100 200" fill="none" stroke="#7e22ce" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Front Arm / Foreleg -->
                <path d="M 220 80 L 235 120 L 225 140 L 235 145" fill="none" stroke="#e879f9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Ground Contact Spark -->
                <ellipse cx="155" cy="210" rx="14" ry="4" fill="rgba(56,189,248,0.5)"/>
            </g>

            <!-- Bottom Badge Banner -->
            <rect x="0" y="295" width="640" height="65" fill="rgba(11,15,25,0.92)"/>
            <text x="30" y="333" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="17" font-weight="700">${title}</text>
            <rect x="495" y="310" width="115" height="28" rx="14" fill="#a855f7"/>
            <text x="552" y="328" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="11" font-weight="800" text-anchor="middle">CREATURE 3D</text>
        </svg>`;
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgAnimal);
    }

    // 3. Stickman Combat Arena (Alan Becker Style) - Default & High Action
    const svgCombat = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%">
        <defs>
            <linearGradient id="fightBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#080c16"/>
                <stop offset="50%" stop-color="#0f172a"/>
                <stop offset="100%" stop-color="#1c1917"/>
            </linearGradient>
            <radialGradient id="sparkExplosion" cx="50%" cy="42%" r="40%">
                <stop offset="0%" stop-color="#fb923c" stop-opacity="0.45"/>
                <stop offset="40%" stop-color="#f43f5e" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
            </radialGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
        </defs>
        <rect width="640" height="360" fill="url(#fightBg)"/>
        <rect width="640" height="360" fill="url(#sparkExplosion)"/>

        <!-- 3D Combat Arena Grid Floor -->
        <g stroke="rgba(249,115,22,0.22)" stroke-width="1.5">
            <line x1="320" y1="185" x2="0" y2="360"/>
            <line x1="320" y1="185" x2="105" y2="360"/>
            <line x1="320" y1="185" x2="210" y2="360"/>
            <line x1="320" y1="185" x2="320" y2="360"/>
            <line x1="320" y1="185" x2="430" y2="360"/>
            <line x1="320" y1="185" x2="535" y2="360"/>
            <line x1="320" y1="185" x2="640" y2="360"/>
            <line x1="165" y1="230" x2="475" y2="230"/>
            <line x1="110" y1="270" x2="530" y2="270"/>
            <line x1="45" y1="315" x2="595" y2="315"/>
        </g>

        <!-- Dynamic Action Speed Lines -->
        <g stroke="rgba(255,255,255,0.18)" stroke-width="2" stroke-linecap="round">
            <line x1="80" y1="110" x2="220" y2="135"/>
            <line x1="70" y1="145" x2="200" y2="155"/>
            <line x1="90" y1="180" x2="230" y2="175"/>
        </g>

        <!-- Fighter 1 (The Second Coming - Orange Stickman) Flying Kick Pose -->
        <g transform="translate(140, 60)" filter="url(#neonGlow)">
            <!-- Head -->
            <circle cx="100" cy="50" r="16" fill="none" stroke="#fb923c" stroke-width="6"/>
            <!-- Torso (horizontal flying dropkick angle) -->
            <line x1="100" y1="66" x2="160" y2="95" stroke="#fb923c" stroke-width="7" stroke-linecap="round"/>
            <!-- Lead Kick Leg (thrusting straight toward Fighter 2) -->
            <line x1="160" y1="95" x2="225" y2="98" stroke="#fb923c" stroke-width="7" stroke-linecap="round"/>
            <!-- Trailing Leg (tucked in) -->
            <polyline points="160,95 130,125 155,145" fill="none" stroke="#fb923c" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- Punching / Balancing Arms -->
            <polyline points="115,75 140,55 175,70" fill="none" stroke="#fb923c" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="115" y1="75" x2="85" y2="95" stroke="#fb923c" stroke-width="5" stroke-linecap="round"/>
        </g>

        <!-- Hit Impact Spark / Energy Burst -->
        <g transform="translate(365, 158)">
            <polygon points="0,-25 7,-7 25,0 7,7 0,25 -7,7 -25,0 -7,-7" fill="#fde047"/>
            <circle cx="0" cy="0" r="10" fill="#ffffff"/>
            <circle cx="0" cy="0" r="22" fill="none" stroke="#f97316" stroke-width="3" opacity="0.8"/>
            <line x1="-35" y1="-20" x2="35" y2="20" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
            <line x1="35" y1="-20" x2="-35" y2="20" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
        </g>

        <!-- Fighter 2 (Blue Stickman) Defensive Guard / Impact Slide -->
        <g transform="translate(380, 75)" filter="url(#neonGlow)">
            <!-- Head -->
            <circle cx="70" cy="40" r="16" fill="none" stroke="#38bdf8" stroke-width="6"/>
            <!-- Torso (leaning back from impact) -->
            <line x1="70" y1="56" x2="80" y2="125" stroke="#38bdf8" stroke-width="7" stroke-linecap="round"/>
            <!-- Guard Arms (crossed blocking) -->
            <polyline points="73,75 40,85 45,60" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="73,75 42,92 50,110" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- Braced Stance Legs -->
            <polyline points="80,125 60,165 40,205" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="80,125 110,165 130,205" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        </g>

        <!-- Bottom Badge Banner -->
        <rect x="0" y="295" width="640" height="65" fill="rgba(8,12,22,0.92)"/>
        <text x="30" y="333" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="17" font-weight="700">${title}</text>
        <rect x="495" y="310" width="115" height="28" rx="14" fill="#f43f5e"/>
        <text x="552" y="328" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="11" font-weight="800" text-anchor="middle">COMBAT 3D</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgCombat);
};

