// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/d3_handler.js

/**
 * D3.js (Data-Driven Documents) Kinetic Visualization Engine Handler
 * Renders rich, interactive D3.js v7 animations & simulations inside isolated iframes.
 * 
 * @param {string} d3Code Raw JavaScript code utilizing the global `d3` object.
 * @param {object|string} [options={}] Configuration options (e.g. background).
 * @returns {string} The full HTML document source for an iframe.
 */
window.d3Templates = {
    'force_network': `// --- D3.js: Kinetic Force-Directed Cosmic Mesh ---
// Drag nodes with mouse or touch to interact with the physics simulation!

const width = window.innerWidth || 960;
const height = window.innerHeight || 540;

const svg = d3.select('#d3-svg')
    .attr('viewBox', [0, 0, width, height])
    .style('width', '100%')
    .style('height', '100%');

svg.selectAll('*').remove();

// 1. Defs & Glow Filters
const defs = svg.append('defs');
const filter = defs.append('filter')
    .attr('id', 'neon-glow')
    .attr('x', '-50%').attr('y', '-50%')
    .attr('width', '200%').attr('height', '200%');
filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
const feMerge = filter.append('feMerge');
feMerge.append('feMergeNode').attr('in', 'coloredBlur');
feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

// Linear Gradients for Links
const linkGrad = defs.append('linearGradient')
    .attr('id', 'link-grad')
    .attr('gradientUnits', 'userSpaceOnUse');
linkGrad.append('stop').attr('offset', '0%').attr('stop-color', '#38bdf8').attr('stop-opacity', 0.6);
linkGrad.append('stop').attr('offset', '100%').attr('stop-color', '#a855f7').attr('stop-opacity', 0.6);

// 2. Synthesize Clustered Graph Nodes
const clusterColors = ['#38bdf8', '#818cf8', '#ec4899', '#10b981'];
const nodeCount = 42;
const nodes = d3.range(nodeCount).map(i => {
    const cluster = i % 4;
    return {
        id: i,
        cluster: cluster,
        color: clusterColors[cluster],
        radius: i < 4 ? 14 : Math.floor(Math.random() * 6) + 4,
        isHub: i < 4
    };
});

// Synthesize Links
const links = [];
for (let i = 4; i < nodeCount; i++) {
    links.push({
        source: i,
        target: i % 4,
        distance: 70 + Math.random() * 50
    });
    if (Math.random() > 0.6) {
        links.push({
            source: i,
            target: (i + 1) % nodeCount,
            distance: 40 + Math.random() * 40
        });
    }
}
// Connect Hubs
links.push({ source: 0, target: 1, distance: 130 });
links.push({ source: 1, target: 2, distance: 130 });
links.push({ source: 2, target: 3, distance: 130 });
links.push({ source: 3, target: 0, distance: 130 });

// 3. Force Simulation Setup
const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.distance).strength(0.65))
    .force('charge', d3.forceManyBody().strength(d => d.isHub ? -260 : -75))
    .force('center', d3.forceCenter(width / 2, height / 2).strength(0.08))
    .force('collide', d3.forceCollide().radius(d => d.radius + 6).iterations(2));

// 4. Render Visual Elements
const g = svg.append('g').attr('class', 'network-group');

const linkGroup = g.append('g').attr('class', 'links');
const link = linkGroup.selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', 'url(#link-grad)')
    .attr('stroke-width', d => (d.source.isHub || d.target.isHub) ? 1.8 : 0.9)
    .attr('stroke-opacity', 0.45);

const nodeGroup = g.append('g').attr('class', 'nodes');

// Pulsing Auras on Hubs
const aura = nodeGroup.selectAll('.aura')
    .data(nodes.filter(d => d.isHub))
    .join('circle')
    .attr('class', 'aura')
    .attr('r', d => d.radius * 1.8)
    .attr('fill', d => d.color)
    .attr('fill-opacity', 0.15)
    .attr('stroke', d => d.color)
    .attr('stroke-width', 1.2)
    .attr('stroke-dasharray', '3,3');

// Main Nodes
const node = nodeGroup.selectAll('.node')
    .data(nodes)
    .join('circle')
    .attr('class', 'node')
    .attr('r', d => d.radius)
    .attr('fill', d => d.color)
    .attr('stroke', '#ffffff')
    .attr('stroke-width', d => d.isHub ? 2.5 : 1.2)
    .attr('filter', 'url(#neon-glow)')
    .style('cursor', 'grab')
    .call(d3.drag()
        .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        })
    );

// 5. Kinetic Simulation & Orbital Breathing Tick
let elapsedTicks = 0;
simulation.on('tick', () => {
    elapsedTicks += 0.015;

    // Add subtle organic harmonic oscillation to hubs
    nodes.filter(d => d.isHub).forEach((hub, idx) => {
        if (!hub.fx) {
            hub.vx += Math.cos(elapsedTicks + idx * 1.5) * 0.25;
            hub.vy += Math.sin(elapsedTicks + idx * 1.5) * 0.25;
        }
    });

    link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

    node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

    aura
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', d => d.radius * (1.6 + 0.3 * Math.sin(elapsedTicks * 3 + d.id)));
});
`,

    'streamgraph_flow': `// --- D3.js: Kinetic Streamgraph Spectral Wave Flow ---
// Continuously undulating stacked harmonic waves rendered via d3.stack & d3.curveBasis

const width = window.innerWidth || 960;
const height = window.innerHeight || 540;

const svg = d3.select('#d3-svg')
    .attr('viewBox', [0, 0, width, height])
    .style('width', '100%')
    .style('height', '100%');

svg.selectAll('*').remove();

const m = 35; // Number of sample points per wave
const n = 6;  // Number of harmonic wave layers

// Defs with Vivid Cyberpunk Gradients
const defs = svg.append('defs');
const palettes = [
    ['#38bdf8', '#0284c7'],
    ['#818cf8', '#4f46e5'],
    ['#c084fc', '#9333ea'],
    ['#f472b6', '#db2777'],
    ['#fb923c', '#ea580c'],
    ['#34d399', '#059669']
];

palettes.forEach((colors, i) => {
    const grad = defs.append('linearGradient')
        .attr('id', 'stream-grad-' + i)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '0%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', colors[0]).attr('stop-opacity', 0.85);
    grad.append('stop').attr('offset', '100%').attr('stop-color', colors[1]).attr('stop-opacity', 0.85);
});

// Generator for oscillating harmonic data
function generateData(t) {
    const data = [];
    for (let i = 0; i < m; i++) {
        const entry = { x: i };
        for (let j = 0; j < n; j++) {
            const freq = (j + 1) * 0.45;
            const phase = t * 1.8 + j * 0.9;
            const wave1 = Math.sin(i * freq * 0.28 + phase);
            const wave2 = Math.cos(i * 0.18 - phase * 0.6);
            entry['v' + j] = Math.max(0.1, 15 + 12 * Math.pow(wave1 * wave2, 2) * 2.5);
        }
        data.push(entry);
    }
    return data;
}

const keys = d3.range(n).map(i => 'v' + i);
const stack = d3.stack()
    .keys(keys)
    .offset(d3.stackOffsetWiggle)
    .order(d3.stackOrderInsideOut);

const xScale = d3.scaleLinear().domain([0, m - 1]).range([0, width]);
const yScale = d3.scaleLinear().domain([-80, 80]).range([height * 0.9, height * 0.1]);

const area = d3.area()
    .curve(d3.curveBasis)
    .x(d => xScale(d.data.x))
    .y0(d => yScale(d[0]))
    .y1(d => yScale(d[1]));

const g = svg.append('g');

// Initial Layer Paths
const paths = g.selectAll('path')
    .data(stack(generateData(0)))
    .join('path')
    .attr('fill', (d, i) => 'url(#stream-grad-' + i + ')')
    .attr('stroke', '#0a0d14')
    .attr('stroke-width', 0.8)
    .attr('stroke-opacity', 0.4);

// 60 FPS Kinetic Wave Loop
let time = 0;
d3.timer(() => {
    time += 0.016;
    const series = stack(generateData(time));
    paths.data(series).attr('d', area);
});
`,

    'sunburst_cluster': `// --- D3.js: Concentric Kinetic Sunburst & Harmonic Radial Matrix ---
// Pure visual geometry: Interlocking rotating radial arcs with spectral harmonic breathing

const width = window.innerWidth || 960;
const height = window.innerHeight || 540;
const radius = Math.min(width, height) / 2 - 20;

const svg = d3.select('#d3-svg')
    .attr('viewBox', [-width / 2, -height / 2, width, height])
    .style('width', '100%')
    .style('height', '100%');

svg.selectAll('*').remove();

// 1. Synthesize Concentric Rings Data
const ringCount = 5;
const ringsData = [];
const colorScales = [
    d3.interpolateBlues,
    d3.interpolateViridis,
    d3.interpolateCool,
    d3.interpolatePlasma,
    d3.interpolateWarm
];

for (let r = 0; r < ringCount; r++) {
    const segments = 6 + r * 6;
    const inner = (radius / ringCount) * r + 16;
    const outer = (radius / ringCount) * (r + 1) + 12;
    for (let s = 0; s < segments; s++) {
        ringsData.push({
            ring: r,
            segment: s,
            totalSegments: segments,
            innerRadius: inner,
            outerRadius: outer,
            startAngle: (s / segments) * 2 * Math.PI,
            endAngle: ((s + 0.85) / segments) * 2 * Math.PI,
            color: colorScales[r % colorScales.length]((s / segments))
        });
    }
}

// 2. Arc Generator
const arc = d3.arc()
    .innerRadius(d => d.innerRadius)
    .outerRadius(d => d.outerRadius)
    .startAngle(d => d.currentStart)
    .endAngle(d => d.currentEnd)
    .padAngle(0.018)
    .cornerRadius(3);

const g = svg.append('g');

// Render Sector Arcs
const sectors = g.selectAll('path')
    .data(ringsData)
    .join('path')
    .attr('fill', d => d.color)
    .attr('fill-opacity', d => 0.65 + 0.25 * Math.sin(d.ring))
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 0.5)
    .attr('stroke-opacity', 0.3);

// Center Pulsing Core
const core = svg.append('circle')
    .attr('r', 12)
    .attr('fill', '#38bdf8')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 2);

// 3. Kinetic Counter-Rotation & Breathing Animation
let elapsed = 0;
d3.timer(() => {
    elapsed += 0.015;

    // Animate individual rings in alternating opposite rotations
    ringsData.forEach(d => {
        const speed = (d.ring % 2 === 0 ? 1 : -1) * (0.35 + d.ring * 0.12);
        const rotation = elapsed * speed;
        const breath = Math.sin(elapsed * 2.5 + d.ring * 1.2) * 4;
        
        d.currentStart = d.startAngle + rotation;
        d.currentEnd = d.endAngle + rotation;
        d.innerRadius = ((radius / ringCount) * d.ring + 16) + breath * 0.5;
        d.outerRadius = ((radius / ringCount) * (d.ring + 1) + 12) + breath;
    });

    sectors.attr('d', arc);
    core.attr('r', 10 + 4 * Math.sin(elapsed * 4));
});
`,

    'voronoi_particles': `// --- D3.js: Morphing Voronoi Tessellation & Delaunay Mesh ---
// 60 FPS dynamic spatial tessellation with bouncy physics particles & Delaunay triangulation

const width = window.innerWidth || 960;
const height = window.innerHeight || 540;

const svg = d3.select('#d3-svg')
    .attr('viewBox', [0, 0, width, height])
    .style('width', '100%')
    .style('height', '100%');

svg.selectAll('*').remove();

// 1. Synthesize Autonomous Bouncing Particles
const numParticles = 48;
const particles = d3.range(numParticles).map(i => ({
    x: Math.random() * (width - 40) + 20,
    y: Math.random() * (height - 40) + 20,
    vx: (Math.random() - 0.5) * 1.8,
    vy: (Math.random() - 0.5) * 1.8,
    color: d3.interpolateCool(i / numParticles)
}));

const voronoiGroup = svg.append('g').attr('class', 'voronoi-cells');
const meshGroup = svg.append('g').attr('class', 'delaunay-mesh');
const pointsGroup = svg.append('g').attr('class', 'particle-dots');

// 2. 60 FPS Render Loop
d3.timer(() => {
    // Physics Step: Position Integration & Border Bounce
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x <= 15) { p.x = 15; p.vx *= -1; }
        if (p.x >= width - 15) { p.x = width - 15; p.vx *= -1; }
        if (p.y <= 15) { p.y = 15; p.vy *= -1; }
        if (p.y >= height - 15) { p.y = height - 15; p.vy *= -1; }
    });

    // Compute Delaunay & Voronoi
    const points = particles.map(p => [p.x, p.y]);
    const delaunay = d3.Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, width, height]);

    // Update Voronoi Polygons
    voronoiGroup.selectAll('path')
        .data(particles)
        .join('path')
        .attr('d', (d, i) => voronoi.renderCell(i))
        .attr('fill', d => d.color)
        .attr('fill-opacity', 0.12)
        .attr('stroke', d => d.color)
        .attr('stroke-width', 1.2)
        .attr('stroke-opacity', 0.5);

    // Update Delaunay Linkage Lines
    meshGroup.selectAll('path')
        .data([delaunay])
        .join('path')
        .attr('d', d => d.render())
        .attr('fill', 'none')
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 0.5)
        .attr('stroke-opacity', 0.25)
        .attr('stroke-dasharray', '2,4');

    // Update Particle Nuclei
    pointsGroup.selectAll('circle')
        .data(particles)
        .join('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', 3.5)
        .attr('fill', '#ffffff')
        .attr('stroke', d => d.color)
        .attr('stroke-width', 2);
});
`
};

window.d3Template = window.d3Templates.force_network;

/**
 * Generates an isolated HTML document string that loads D3.js and executes user code.
 * 
 * @param {string} d3Code 
 * @param {object} [options={}] 
 * @returns {string} Complete HTML string.
 */
window.renderD3 = function(d3Code, options = {}) {
    const rawCode = (d3Code || window.d3Template || '').trim();
    const background = (options && options.background) ? options.background : '#0a0d14';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>D3.js Visualization</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: ${background};
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            user-select: none;
        }
        #d3-container, #canvas-container {
            width: 100%;
            height: 100%;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        svg {
            display: block;
            width: 100%;
            height: 100%;
        }
        .d3-error-box {
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
    <div id="d3-container">
        <svg id="d3-svg"></svg>
    </div>
    <!-- Alias container for sketches expecting #canvas-container -->
    <div id="canvas-container" style="display: none;"></div>

    <!-- D3.js v7 Core Engine -->
    <script src="https://cdn.jsdelivr.net/npm/d3@7"><\/script>

    <script>
        function showError(title, message) {
            const errDiv = document.createElement('div');
            errDiv.className = 'd3-error-box';
            errDiv.innerHTML = '<strong>' + title + '</strong>\\n' + 
                (message ? String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
            document.body.appendChild(errDiv);
        }

        window.onerror = function(msg, url, line, col, error) {
            showError("D3.js Runtime Error", (msg || error) + (line ? " (Line " + line + ")" : ""));
        };

        try {
            ${rawCode ? rawCode : `d3.select('#d3-svg').append('text').attr('x', 20).attr('y', 40).attr('fill', '#888').text('Write D3.js code to visualize data...');`}
        } catch (err) {
            console.error("D3.js Execution Error:", err);
            showError("D3.js Execution Error:", err.stack || err.message || String(err));
        }
    <\/script>
</body>
</html>`;
};
