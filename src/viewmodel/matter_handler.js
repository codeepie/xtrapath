// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/matter_handler.js

/**
 * Matter.js 2D Rigid & Soft-Body Physics Simulation Engine Handler
 * Renders interactive 60 FPS physics worlds inside isolated iframes with mouse drag constraints.
 * 
 * @param {string} matterCode The raw JavaScript code utilizing the global `Matter` object.
 * @param {object|string} [options={}] Configuration options (e.g. background).
 * @returns {string} The full HTML document source for an iframe.
 */
window.matterTemplates = {
    'newton_cradle': `// --- Matter.js: Kinetic Newton's Cradle & Momentum Wave ---
// Interactive momentum conservation: Click & drag any ball with mouse or touch!

const { Engine, Render, Runner, Bodies, Composite, Constraint, Mouse, MouseConstraint } = Matter;

const engine = Engine.create({
    gravity: { x: 0, y: 1.2, scale: 0.001 }
});
const world = engine.world;

const width = 800;
const height = 450;

const render = Render.create({
    element: document.getElementById('matter-container'),
    engine: engine,
    options: {
        width: width,
        height: height,
        wireframes: false,
        background: '#0a0d14',
        showVelocity: false
    }
});
Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

// 1. Overhead Mounting Beam
const topBeam = Bodies.rectangle(width / 2, 45, 380, 14, {
    isStatic: true,
    render: {
        fillStyle: '#1e293b',
        strokeStyle: '#38bdf8',
        lineWidth: 2
    }
});
Composite.add(world, topBeam);

// 2. Synthesize 6 High-Restitution Spheres
const ballCount = 6;
const ballRadius = 18;
const ropeLength = 190;
const startX = width / 2 - ((ballCount - 1) * ballRadius * 2) / 2;
const palette = ['#38bdf8', '#818cf8', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b'];

const balls = [];
for (let i = 0; i < ballCount; i++) {
    const x = startX + i * ballRadius * 2;
    const y = 45 + ropeLength;

    const ball = Bodies.circle(x, y, ballRadius, {
        density: 0.005,
        friction: 0.0001,
        frictionAir: 0.0001,
        restitution: 1.0,
        slop: 0,
        render: {
            fillStyle: palette[i % palette.length],
            strokeStyle: '#ffffff',
            lineWidth: 2
        }
    });

    const rope = Constraint.create({
        pointA: { x: x, y: 45 },
        bodyB: ball,
        stiffness: 1,
        length: ropeLength,
        render: {
            strokeStyle: 'rgba(255, 255, 255, 0.45)',
            lineWidth: 1.5
        }
    });

    balls.push(ball);
    Composite.add(world, [ball, rope]);
}

// 3. Initial Impulse: Pull back the first ball with ample clearance
Matter.Body.setPosition(balls[0], { x: balls[0].position.x - 95, y: balls[0].position.y - 35 });

// 4. Interactive Mouse Drag Constraint
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: true,
            strokeStyle: '#ec4899',
            lineWidth: 2
        }
    }
});
Composite.add(world, mouseConstraint);
render.mouse = mouse;

// 5. Perpetual Kinetic Pulse if simulation settles
let lastPulse = Date.now();
Matter.Events.on(engine, 'afterUpdate', () => {
    const speedSum = balls.reduce((acc, b) => acc + Math.hypot(b.velocity.x, b.velocity.y), 0);
    if (speedSum < 0.5 && Date.now() - lastPulse > 3500) {
        lastPulse = Date.now();
        Matter.Body.applyForce(balls[0], balls[0].position, { x: -0.08, y: -0.03 });
    }
});
`,

    'cloth_jelly': `// --- Matter.js: Elastic Soft-Body Cloth & Jelly Blob Physics ---
// Grab any vertex or the jelly blob to stretch, whip, and bounce!

const { Engine, Render, Runner, Bodies, Composite, Constraint, Mouse, MouseConstraint } = Matter;

const engine = Engine.create({
    gravity: { x: 0, y: 1.0, scale: 0.001 }
});
const world = engine.world;

const width = 800;
const height = 450;

const render = Render.create({
    element: document.getElementById('matter-container'),
    engine: engine,
    options: {
        width: width,
        height: height,
        wireframes: false,
        background: '#0a0d14'
    }
});
Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

// 1. Static Boundaries & Neon Inclined Ramp
const ground = Bodies.rectangle(width / 2, height - 12, width, 24, {
    isStatic: true,
    render: { fillStyle: '#18181b', strokeStyle: '#3f3f46', lineWidth: 1 }
});

const ramp = Bodies.rectangle(550, 310, 290, 14, {
    isStatic: true,
    angle: -0.32,
    render: { fillStyle: '#1e293b', strokeStyle: '#06b6d4', lineWidth: 2 }
});

const bumper = Bodies.circle(680, 245, 24, {
    isStatic: true,
    render: { fillStyle: '#ec4899', strokeStyle: '#ffffff', lineWidth: 2 }
});

Composite.add(world, [ground, ramp, bumper]);

// 2. Hanging Elastic Cloth Matrix
const clothCols = 10;
const clothRows = 7;
const colGap = 18;
const rowGap = 18;
const startX = 65;
const startY = 40;

const clothGroup = Composite.create();
const clothGrid = [];

for (let r = 0; r < clothRows; r++) {
    clothGrid[r] = [];
    for (let c = 0; c < clothCols; c++) {
        const p = Bodies.circle(startX + c * colGap, startY + r * rowGap, 4, {
            isStatic: r === 0,
            frictionAir: 0.02,
            restitution: 0.3,
            render: {
                fillStyle: r === 0 ? '#f59e0b' : '#38bdf8',
                strokeStyle: '#0284c7',
                lineWidth: 1
            }
        });
        clothGrid[r][c] = p;
        Composite.add(clothGroup, p);

        // Horizontal constraint
        if (c > 0) {
            Composite.add(clothGroup, Constraint.create({
                bodyA: clothGrid[r][c - 1],
                bodyB: p,
                stiffness: 0.9,
                render: { strokeStyle: 'rgba(56, 189, 248, 0.45)', lineWidth: 1.2 }
            }));
        }
        // Vertical constraint
        if (r > 0) {
            Composite.add(clothGroup, Constraint.create({
                bodyA: clothGrid[r - 1][c],
                bodyB: p,
                stiffness: 0.9,
                render: { strokeStyle: 'rgba(56, 189, 248, 0.45)', lineWidth: 1.2 }
            }));
        }
    }
}
Composite.add(world, clothGroup);

// 3. Pressurized Bouncy Soft Jelly Blob
const jellyGroup = Composite.create();
const jCenterX = 490;
const jCenterY = 90;
const jRadius = 32;
const jPoints = 8;
const jParticles = [];

const core = Bodies.circle(jCenterX, jCenterY, 14, {
    density: 0.003,
    restitution: 0.9,
    render: { fillStyle: '#c084fc', strokeStyle: '#ffffff', lineWidth: 1.5 }
});
Composite.add(jellyGroup, core);

for (let i = 0; i < jPoints; i++) {
    const angle = (i / jPoints) * Math.PI * 2;
    const px = jCenterX + Math.cos(angle) * jRadius;
    const py = jCenterY + Math.sin(angle) * jRadius;
    const p = Bodies.circle(px, py, 9, {
        density: 0.002,
        restitution: 0.85,
        friction: 0.01,
        render: { fillStyle: '#a855f7', strokeStyle: '#e9d5ff', lineWidth: 1 }
    });
    jParticles.push(p);
    Composite.add(jellyGroup, p);

    // Spoke constraint to core
    Composite.add(jellyGroup, Constraint.create({
        bodyA: core,
        bodyB: p,
        stiffness: 0.25,
        damping: 0.05,
        render: { strokeStyle: 'rgba(192, 132, 252, 0.4)', lineWidth: 1.5 }
    }));
}

// Perimeter spring constraints
for (let i = 0; i < jPoints; i++) {
    Composite.add(jellyGroup, Constraint.create({
        bodyA: jParticles[i],
        bodyB: jParticles[(i + 1) % jPoints],
        stiffness: 0.4,
        render: { strokeStyle: 'rgba(168, 85, 247, 0.8)', lineWidth: 2 }
    }));
}
Composite.add(world, jellyGroup);

// 4. Interactive Mouse Drag Constraint
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: true,
            strokeStyle: '#10b981',
            lineWidth: 2
        }
    }
});
Composite.add(world, mouseConstraint);
render.mouse = mouse;

// 5. Periodic gentle impulse to keep jelly dynamic
let tickCount = 0;
Matter.Events.on(engine, 'beforeUpdate', () => {
    tickCount++;
    if (tickCount % 350 === 0) {
        Matter.Body.applyForce(core, core.position, { x: -0.05, y: -0.09 });
    }
});
`,

    'domino_cascade': `// --- Matter.js: Kinetic Domino Chain & Marble Plinko Run ---
// Multi-stage Rube Goldberg chain reaction with toppling dominos, weighted hammer & Plinko grid

const { Engine, Render, Runner, Bodies, Composite, Constraint, Mouse, MouseConstraint } = Matter;

const engine = Engine.create({
    gravity: { x: 0, y: 1.2, scale: 0.001 }
});
const world = engine.world;

const width = 800;
const height = 450;

const render = Render.create({
    element: document.getElementById('matter-container'),
    engine: engine,
    options: {
        width: width,
        height: height,
        wireframes: false,
        background: '#0a0d14'
    }
});
Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

// 1. Static Platforms & Rails
const topTrack = Bodies.rectangle(150, 90, 260, 12, {
    isStatic: true,
    angle: 0.16,
    render: { fillStyle: '#1e293b', strokeStyle: '#38bdf8', lineWidth: 2 }
});

const dominoPlatform = Bodies.rectangle(430, 140, 310, 14, {
    isStatic: true,
    render: { fillStyle: '#1e293b', strokeStyle: '#818cf8', lineWidth: 2 }
});

const ground = Bodies.rectangle(width / 2, height - 10, width, 20, {
    isStatic: true,
    render: { fillStyle: '#18181b' }
});

Composite.add(world, [topTrack, dominoPlatform, ground]);

// 2. Heavy Starter Rolling Marble
const starterBall = Bodies.circle(40, 50, 17, {
    density: 0.006,
    restitution: 0.6,
    friction: 0.001,
    render: { fillStyle: '#38bdf8', strokeStyle: '#ffffff', lineWidth: 2 }
});
Composite.add(world, starterBall);

// 3. Upright Domino Sequence (12 Blocks)
const dominoCount = 12;
const dominoW = 7;
const dominoH = 45;
const dominoStart = 290;
const dominoGap = 21;
const dominos = [];

for (let i = 0; i < dominoCount; i++) {
    const x = dominoStart + i * dominoGap;
    const y = 140 - 7 - dominoH / 2;
    const d = Bodies.rectangle(x, y, dominoW, dominoH, {
        density: 0.002,
        friction: 0.4,
        restitution: 0.1,
        render: {
            fillStyle: i % 2 === 0 ? '#ec4899' : '#f43f5e',
            strokeStyle: '#ffffff',
            lineWidth: 1
        }
    });
    dominos.push(d);
}
Composite.add(world, dominos);

// 4. Pivoting Hammer at end of Domino Track
const hammerPivotX = 565;
const hammerPivotY = 130;
const hammerArm = Bodies.rectangle(hammerPivotX, hammerPivotY + 38, 10, 76, {
    density: 0.003,
    render: { fillStyle: '#eab308' }
});
const hammerWeight = Bodies.circle(hammerPivotX, hammerPivotY + 76, 20, {
    density: 0.015,
    render: { fillStyle: '#f59e0b', strokeStyle: '#ffffff', lineWidth: 2 }
});
const hammerGroup = Matter.Body.create({
    parts: [hammerArm, hammerWeight]
});
const hammerPin = Constraint.create({
    pointA: { x: hammerPivotX, y: hammerPivotY },
    bodyB: hammerGroup,
    pointB: { x: 0, y: -38 },
    stiffness: 1,
    length: 0,
    render: { strokeStyle: '#ffffff', lineWidth: 2 }
});
Composite.add(world, [hammerGroup, hammerPin]);

// 5. Triangular Plinko Peg Grid
const pegRows = 5;
const pegStartY = 230;
const pegSpacingX = 46;
const pegSpacingY = 32;
const pegs = [];

for (let r = 0; r < pegRows; r++) {
    const countInRow = r + 3;
    const rowStartX = 620 - ((countInRow - 1) * pegSpacingX) / 2;
    for (let c = 0; c < countInRow; c++) {
        const px = rowStartX + c * pegSpacingX;
        const py = pegStartY + r * pegSpacingY;
        pegs.push(Bodies.circle(px, py, 5, {
            isStatic: true,
            render: { fillStyle: '#34d399', strokeStyle: '#6ee7b7', lineWidth: 1.5 }
        }));
    }
}
Composite.add(world, pegs);

// Bottom Funnel Chutes
for (let b = 0; b < 6; b++) {
    const bx = 620 - 115 + b * 46;
    Composite.add(world, Bodies.rectangle(bx, height - 30, 5, 42, {
        isStatic: true,
        render: { fillStyle: '#475569' }
    }));
}

// 6. Cascading Neon Marbles
const plinkoMarbles = [];
const marbleColors = ['#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];
for (let m = 0; m < 10; m++) {
    const marble = Bodies.circle(580 + (Math.random() - 0.5) * 50, 170 - m * 24, 9, {
        restitution: 0.75,
        friction: 0.02,
        render: {
            fillStyle: marbleColors[m % marbleColors.length],
            strokeStyle: '#ffffff',
            lineWidth: 1
        }
    });
    plinkoMarbles.push(marble);
}
Composite.add(world, plinkoMarbles);

// 7. Interactive Mouse Drag Constraint
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: true,
            strokeStyle: '#38bdf8',
            lineWidth: 2
        }
    }
});
Composite.add(world, mouseConstraint);
render.mouse = mouse;
`,

    'planetary_gears': `// --- Matter.js: Rotating Gyroscopic Wheel & Tumbling Tumbler ---
// Hypnotic rotating mechanism with motorized central rotor & trapped tumbling kinetic marbles

const { Engine, Render, Runner, Bodies, Composite, Constraint, Body, Mouse, MouseConstraint } = Matter;

const engine = Engine.create({
    gravity: { x: 0, y: 0.9, scale: 0.001 }
});
const world = engine.world;

const width = 800;
const height = 450;

const render = Render.create({
    element: document.getElementById('matter-container'),
    engine: engine,
    options: {
        width: width,
        height: height,
        wireframes: false,
        background: '#0a0d14'
    }
});
Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

const centerX = width / 2;
const centerY = height / 2;
const outerRadius = 140;

// 1. Tumbler Outer Cage (Circular polygon formed of 24 static segments attached to revolving core)
const segmentCount = 24;
const segments = [];
const angleStep = (Math.PI * 2) / segmentCount;
const segmentLength = (2 * Math.PI * outerRadius) / segmentCount + 4;

for (let i = 0; i < segmentCount; i++) {
    const angle = i * angleStep;
    const x = centerX + Math.cos(angle) * outerRadius;
    const y = centerY + Math.sin(angle) * outerRadius;

    const seg = Bodies.rectangle(x, y, segmentLength, 10, {
        angle: angle + Math.PI / 2,
        render: {
            fillStyle: i % 2 === 0 ? '#38bdf8' : '#818cf8',
            strokeStyle: '#ffffff',
            lineWidth: 1
        }
    });
    segments.push(seg);
}

// Central Rotary Hub Cross-Beams
const beam1 = Bodies.rectangle(centerX, centerY, outerRadius * 2 - 8, 11, {
    render: { fillStyle: '#1e293b', strokeStyle: '#38bdf8', lineWidth: 1.5 }
});
const beam2 = Bodies.rectangle(centerX, centerY, outerRadius * 2 - 8, 11, {
    angle: Math.PI / 2,
    render: { fillStyle: '#1e293b', strokeStyle: '#ec4899', lineWidth: 1.5 }
});
const beam3 = Bodies.rectangle(centerX, centerY, outerRadius * 2 - 8, 11, {
    angle: Math.PI / 4,
    render: { fillStyle: '#1e293b', strokeStyle: '#eab308', lineWidth: 1.5 }
});
const beam4 = Bodies.rectangle(centerX, centerY, outerRadius * 2 - 8, 11, {
    angle: -Math.PI / 4,
    render: { fillStyle: '#1e293b', strokeStyle: '#10b981', lineWidth: 1.5 }
});

const rotorWheel = Body.create({
    parts: [beam1, beam2, beam3, beam4, ...segments]
});

// Pin Rotor to Center
const rotorPin = Constraint.create({
    pointA: { x: centerX, y: centerY },
    bodyB: rotorWheel,
    pointB: { x: 0, y: 0 },
    stiffness: 1,
    length: 0,
    render: { visible: false }
});

Composite.add(world, [rotorWheel, rotorPin]);

// 2. Trapped Kinetic Tumbling Balls
const ballCount = 30;
const colors = ['#f43f5e', '#ec4899', '#38bdf8', '#06b6d4', '#10b981', '#eab308'];
const balls = [];

for (let i = 0; i < ballCount; i++) {
    const r = Math.random() * (outerRadius * 0.72);
    const theta = Math.random() * Math.PI * 2;
    const bx = centerX + Math.cos(theta) * r;
    const by = centerY + Math.sin(theta) * r;

    const b = Bodies.circle(bx, by, Math.floor(Math.random() * 5) + 7, {
        restitution: 0.7,
        friction: 0.05,
        render: {
            fillStyle: colors[i % colors.length],
            strokeStyle: '#ffffff',
            lineWidth: 1
        }
    });
    balls.push(b);
}
Composite.add(world, balls);

// 3. Central Glowing Axle Core
const axle = Bodies.circle(centerX, centerY, 18, {
    isStatic: true,
    render: {
        fillStyle: '#0f172a',
        strokeStyle: '#ffffff',
        lineWidth: 2.5
    }
});
Composite.add(world, axle);

// 4. Continuous Motorized Rotation (Angular Velocity Drive)
Matter.Events.on(engine, 'beforeUpdate', () => {
    Body.setAngle(rotorWheel, rotorWheel.angle + 0.018);
    Body.setAngularVelocity(rotorWheel, 0.018);
});

// 5. Interactive Mouse Drag Constraint
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: true,
            strokeStyle: '#f43f5e',
            lineWidth: 2
        }
    }
});
Composite.add(world, mouseConstraint);
render.mouse = mouse;
`
};

window.matterTemplate = window.matterTemplates.newton_cradle;

/**
 * Generates an isolated HTML document string that loads Matter.js and executes user code.
 * Standardizes canvas to 800x450 and uses responsive CSS scaling so the physics simulation
 * always fits cleanly and perfectly inside any preview screen or container.
 * 
 * @param {string} matterCode 
 * @param {object} [options={}] 
 * @returns {string} Complete HTML string.
 */
window.renderMatter = function(matterCode, options = {}) {
    const rawCode = (matterCode || window.matterTemplate || '').trim();
    const background = (options && options.background) ? options.background : '#0a0d14';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Matter.js Physics Simulation</title>
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
            overflow: hidden;
            background-color: ${background};
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            user-select: none;
        }
        #matter-container, #canvas-container {
            width: 100%;
            height: 100%;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        canvas {
            display: block;
            max-width: 100% !important;
            max-height: 100% !important;
            width: auto !important;
            height: auto !important;
            aspect-ratio: 16 / 9;
            object-fit: contain;
        }
        .matter-error-box {
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            background: rgba(220, 38, 38, 0.9);
            color: #fff;
            padding: 14px 18px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 13px;
            white-space: pre-wrap;
            z-index: 9999;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            border: 1px solid #f87171;
        }
    </style>
</head>
<body>
    <div id="matter-container"></div>
    <!-- Alias container for sketches expecting #canvas-container -->
    <div id="canvas-container" style="display: none;"></div>

    <!-- Matter.js Physics Engine Library -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"><\/script>

    <script>
        function showError(title, message) {
            const errDiv = document.createElement('div');
            errDiv.className = 'matter-error-box';
            errDiv.innerHTML = '<strong>' + title + '</strong>\\n' + 
                (message ? String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
            document.body.appendChild(errDiv);
        }

        window.onerror = function(msg, url, line, col, error) {
            showError("Matter.js Runtime Error", (msg || error) + (line ? " (Line " + line + ")" : ""));
        };

        try {
            ${rawCode ? rawCode : `document.getElementById('matter-container').innerHTML = '<div style="color: #71717a; font-size: 14px;">Write Matter.js code to create physics simulations...</div>';`}
        } catch (err) {
            console.error("Matter.js Execution Error:", err);
            showError("Matter.js Execution Error:", err.stack || err.message || String(err));
        }
    <\/script>
</body>
</html>`;
};
