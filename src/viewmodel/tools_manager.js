/**
 * XtraAnim Universal Tools & Presets Manager (tools_manager.js)
 * -------------------------------------------------------------
 * Centralized registry and management for all creation tools, studio customizers,
 * math presets, color palettes, and snippet export utilities:
 * - Tools Registry: Central definition of all 12+ creation engines and studios
 * - Studio Choice Customizer: Pinned tools management (max 4 pinned for quick (+) modal)
 * - Math & STEM Presets: LaTeX formulas, KaTeX equations, Mermaid diagrams, physics formulas
 * - Scientific Color Palettes: Curated color schemes for animations, diagrams, and math visualizers
 * - Export Utilities: Code snippet clipboard, SVG export, and embed helpers
 */

(function (window) {
    'use strict';

    // 1. Central Tools Registry
    const ALL_XTRA_TOOLS = [
        {
            id: 'xtraanim',
            name: 'Animation',
            description: 'Create stunning physics and math animations with Python (Manim) and JavaScript (p5.js).',
            icon: 'ri-movie-2-line',
            gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            url: '/views/xtraAnim.html',
            status: 'active',
            category: 'animation'
        },
        {
            id: 'xtrabook',
            name: 'Book',
            description: 'Generate professional, interactive textbooks and papers using the power of LaTeX.',
            icon: 'ri-book-open-line',
            gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
            url: '/views/xtraBook.html',
            status: 'active',
            category: 'publication'
        },
        {
            id: 'xtracover',
            name: 'KDP Cover',
            description: 'Design 300 DPI print-ready Amazon KDP book covers with spine calculation and XtraAnim graphics.',
            icon: 'ri-book-2-line',
            gradient: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            url: '/views/xtraCover.html',
            status: 'active',
            category: 'publication'
        },
        {
            id: 'xtragraph',
            name: 'Graph',
            description: 'Plot functions, analyze data, and create beautiful, recordable graph animations with Desmos.',
            icon: 'ri-bar-chart-2-line',
            gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            url: '/views/xtraGraph.html',
            status: 'active',
            category: 'math'
        },
        {
            id: 'xtraarticle',
            name: 'Article',
            description: 'Write rich, embeddable articles and tutorials with a modern block-based editor.',
            icon: 'ri-file-text-line',
            gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            url: '/views/xtraArticle.html',
            status: 'active',
            category: 'publication'
        },
        {
            id: 'xtracourse',
            name: 'Course',
            description: 'Build and structure multimedia courses using all your XtraPath creations.',
            icon: 'ri-graduation-cap-line',
            gradient: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            url: '/views/xtraCourse.html',
            status: 'active',
            category: 'education'
        },
        {
            id: 'mermaid',
            name: 'Diagram',
            description: 'Create flowcharts, sequence diagrams, and more with Mermaid.js.',
            icon: 'ri-flow-chart',
            gradient: 'linear-gradient(135deg, #14b8a6, #3b82f6)',
            url: '/views/xtraAnim.html?tool=mermaid',
            status: 'active',
            category: 'diagram'
        },
        {
            id: 'katex',
            name: 'LaTeX Math',
            description: 'Typeset equations and mathematical formulas with KaTeX.',
            icon: 'ri-functions',
            gradient: 'linear-gradient(135deg, #f43f5e, #a855f7)',
            url: '/views/xtraAnim.html?tool=katex',
            status: 'active',
            category: 'math'
        },
        {
            id: 'jsxgraph',
            name: 'JSXGraph Math',
            description: 'Interactive dynamic geometry, calculus, and function plots.',
            icon: 'ri-compasses-2-line',
            gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            url: '/views/xtraAnim.html?tool=jsxgraph',
            status: 'active',
            category: 'math'
        },
        {
            id: 'zdog',
            name: 'Zdog 3D',
            description: 'Pseudo-3D vector illustration & kinetic animation for canvas.',
            icon: 'ri-shape-line',
            gradient: 'linear-gradient(135deg, #e11d48, #fb7185)',
            url: '/views/xtraAnim.html?tool=zdog',
            status: 'active',
            category: '3d'
        },
        {
            id: 'thumbnail',
            name: 'Thumbnail Studio',
            description: 'Design high-converting thumbnails, social cards, and banners with Fabric.',
            icon: 'ri-image-edit-line',
            gradient: 'linear-gradient(135deg, #f59e0b, #ec4899)',
            url: '/views/xtraAnim.html?tool=thumbnail',
            status: 'active',
            category: 'design'
        },
        {
            id: 'svg_to_3d',
            name: 'SVG to 3D',
            description: 'Extrude SVG files into 3D models with interactive WebGL preview.',
            icon: 'ri-cube-line',
            gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            url: '/views/xtraAnim.html?tool=svg_to_3d',
            status: 'active',
            category: '3d'
        },
        {
            id: 'tikz',
            name: 'TikZ Graphics',
            description: 'Compile vector TikZ & PGF plots into ultra crisp SVG figures.',
            icon: 'ri-markup-line',
            gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)',
            url: '/views/xtraAnim.html?tool=tikz',
            status: 'active',
            category: 'math'
        },
        {
            id: 'image_to_ascii',
            name: 'ASCII Art',
            description: 'Convert images into text-based art for creative coding and terminal outputs.',
            icon: 'ri-font-size-2',
            gradient: 'linear-gradient(135deg, #f97316, #eab308)',
            url: '#',
            status: 'upcoming',
            category: 'art'
        }
    ];

    const DEFAULT_PINNED_TOOLS = ['xtraanim', 'xtrabook', 'xtragraph', 'xtraarticle'];

    // 2. Studio Quick Access Customizer Sub-Module
    const StudioChoice = {
        getPinnedTools() {
            try {
                const saved = JSON.parse(localStorage.getItem('userSelectedTools') || '[]');
                if (Array.isArray(saved) && saved.length > 0) return saved.slice(0, 4);
            } catch (_) {}
            return [...DEFAULT_PINNED_TOOLS];
        },

        setPinnedTools(ids) {
            const cleanIds = Array.isArray(ids) ? ids.slice(0, 4) : DEFAULT_PINNED_TOOLS;
            localStorage.setItem('userSelectedTools', JSON.stringify(cleanIds));
            window.dispatchEvent(new Event('xtra-tools-changed'));
            if (typeof window.rebuildStudioChoiceGrid === 'function') {
                window.rebuildStudioChoiceGrid();
            }
        },

        getActiveToolsList() {
            const pinnedIds = this.getPinnedTools();
            const valid = [];
            pinnedIds.forEach(id => {
                const found = ALL_XTRA_TOOLS.find(t => t.id === id);
                if (found) valid.push(found);
            });

            // Ensure 4 cards always displayed
            if (valid.length < 4) {
                const fallbacks = ALL_XTRA_TOOLS.filter(t => t.status === 'active' && !valid.some(v => v.id === t.id));
                while (valid.length < 4 && fallbacks.length > 0) {
                    valid.push(fallbacks.shift());
                }
            }
            return valid.slice(0, 4);
        }
    };

    // 3. Math & STEM Presets Library
    const Presets = {
        latex: [
            { label: 'Circle Equation', code: '$x^2 + y^2 = r^2$' },
            { label: 'Fraction', code: '$\\frac{a}{b}$' },
            { label: 'Square Root', code: '$\\sqrt{x^2 + y^2}$' },
            { label: 'Definite Integral', code: '$$\\int_{a}^{b} f(x) \\, dx$$' },
            { label: 'Summation', code: '$$\\sum_{i=1}^{n} x_i$$' },
            { label: 'Limit', code: '$$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$' },
            { label: 'Matrix 2x2', code: '$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$' },
            { label: 'Newton Second Law', code: '$\\vec{F} = m\\vec{a}$' },
            { label: 'Schrödinger Eq', code: '$$i\\hbar \\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi$$' },
            { label: 'Maxwell Ampere', code: '$$\\nabla \\times \\vec{B} = \\mu_0 \\vec{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\vec{E}}{\\partial t}$$' },
            { label: 'Euler Identity', code: '$$e^{i\\pi} + 1 = 0$$' },
            { label: 'Quadratic Formula', code: '$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$' }
        ],

        diagrams: [
            {
                label: 'Flowchart',
                code: '```mermaid\ngraph TD\n  A[Start] --> B(Calculate Force)\n  B --> C{Verified?}\n  C -->|Yes| D[Render Animation]\n  C -->|No| B\n```'
            },
            {
                label: 'Sequence Diagram',
                code: '```mermaid\nsequenceDiagram\n  autonumber\n  User->>Studio: Input Equation\n  Studio->>KaTeX: Compile Math\n  KaTeX-->>User: Vector SVG Preview\n```'
            },
            {
                label: 'State Machine',
                code: '```mermaid\nstateDiagram-v2\n  [*] --> Rest\n  Rest --> Motion: Force Applied\n  Motion --> Rest: Friction & Drag\n```'
            },
            {
                label: 'Mindmap',
                code: '```mermaid\nmindmap\n  root((Physics))\n    Mechanics\n      Kinematics\n      Dynamics\n    Thermodynamics\n      Entropy\n    Quantum\n      Wavefunction\n```'
            }
        ]
    };

    // 4. Scientific & UI Color Palettes
    const Palettes = {
        quantum: {
            name: 'Quantum Spectrum',
            primary: '#3b82f6',
            secondary: '#8b5cf6',
            accent: '#06b6d4',
            bg: '#09090b',
            text: '#f4f4f5'
        },
        solar: {
            name: 'Solar Kinetic',
            primary: '#f59e0b',
            secondary: '#ef4444',
            accent: '#fbbf24',
            bg: '#18181b',
            text: '#ffffff'
        },
        emerald: {
            name: 'Emerald STEM',
            primary: '#10b981',
            secondary: '#059669',
            accent: '#34d399',
            bg: '#0f172a',
            text: '#f8fafc'
        },
        cyber: {
            name: 'Cyberpunk Vector',
            primary: '#ec4899',
            secondary: '#a855f7',
            accent: '#22d3ee',
            bg: '#030712',
            text: '#f9fafb'
        }
    };

    // 5. Export & Clipboard Utilities
    const Export = {
        async copyToClipboard(text, onSuccess, onError) {
            try {
                await navigator.clipboard.writeText(text);
                if (typeof onSuccess === 'function') onSuccess();
                return true;
            } catch (err) {
                if (typeof onError === 'function') onError(err);
                return false;
            }
        },

        downloadSvg(svgContent, filename = 'xtra_creation.svg') {
            const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    // Main ToolsManager Object
    const ToolsManager = {
        tools: ALL_XTRA_TOOLS,
        StudioChoice,
        Presets,
        Palettes,
        Export,

        getToolById(id) {
            return ALL_XTRA_TOOLS.find(t => t.id === id) || null;
        },

        getToolsByCategory(category) {
            return ALL_XTRA_TOOLS.filter(t => t.category === category);
        }
    };

    // Global Bindings
    window.ToolsManager = ToolsManager;
    window.allXtraTools = ALL_XTRA_TOOLS;
    window.getSelectedToolIds = StudioChoice.getPinnedTools.bind(StudioChoice);
    window.setSelectedToolIds = StudioChoice.setPinnedTools.bind(StudioChoice);

})(typeof window !== 'undefined' ? window : this);
