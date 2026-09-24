// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/katex_handler.js

/**
 * Premium Class 12th Level Mathematics & Physics Formula Templates
 * Full Preview Screen Auto-Fit with Zero Cutoffs & Dynamic Viewport Scaling.
 */
window.katexTemplates = {
    physics_electrodynamics: `% Class 12 Physics: Electrodynamics & AC Wave Circuits
\\begin{aligned}
\\textcolor{#38bdf8}{\\oint \\mathbf{E} \\cdot d\\mathbf{A}} &= \\textcolor{#38bdf8}{\\frac{q_{\\text{enclosed}}}{\\varepsilon_0}} \\qquad \\text{(Gauss's Law of Electrostatics)} \\\\[10pt]
\\textcolor{#ec4899}{\\varepsilon} &= -\\textcolor{#ec4899}{\\frac{d\\Phi_B}{dt}} = -L \\frac{dI}{dt} \\qquad \\text{(Faraday-Lenz Law of Induction)} \\\\[10pt]
\\textcolor{#10b981}{Z} &= \\sqrt{R^2 + \\left(\\omega L - \\frac{1}{\\omega C}\\right)^2}, \\quad \\textcolor{#10b981}{\\omega_0 = \\frac{1}{\\sqrt{LC}}} \\quad \\text{(LCR Resonance)} \\\\[10pt]
\\textcolor{#f59e0b}{\\frac{1}{f}} &= (\\mu - 1) \\left( \\frac{1}{R_1} - \\frac{1}{R_2} \\right) \\qquad \\text{(Lens Maker's Formula)}
\\end{aligned}`,

    physics_modern: `% Class 12 Physics: Modern Physics & Quantum Dual Nature
\\begin{aligned}
\\textcolor{#38bdf8}{h\\nu} &= \\textcolor{#38bdf8}{\\phi_0 + K_{\\max}} = h\\nu_0 + e V_0 \\qquad \\text{(Einstein's Photoelectric Effect)} \\\\[10pt]
\\textcolor{#a855f7}{\\lambda} &= \\frac{h}{p} = \\textcolor{#a855f7}{\\frac{h}{\\sqrt{2mqV}}} \\qquad \\text{(de Broglie Matter Wavelength)} \\\\[10pt]
\\textcolor{#10b981}{L = mvr} &= \\textcolor{#10b981}{\\frac{nh}{2\\pi}}, \\quad \\frac{1}{\\lambda} = R_H \\left( \\frac{1}{n_1^2} - \\frac{1}{n_2^2} \\right) \\quad \\text{(Bohr's Hydrogen Model)} \\\\[10pt]
\\textcolor{#f43f5e}{N(t)} &= N_0 e^{-\\lambda t}, \\quad \\textcolor{#f43f5e}{T_{1/2} = \\frac{\\ln 2}{\\lambda} \\approx \\frac{0.693}{\\lambda}} \\quad \\text{(Radioactive Decay)}
\\end{aligned}`,

    math_calculus: `% Class 12 Mathematics: Definite Integrals & Differential Equations
\\begin{aligned}
\\textcolor{#38bdf8}{\\int_a^b f(x) \\, dx} &= \\textcolor{#38bdf8}{F(b) - F(a)}, \\quad \\int_0^a f(x) \\, dx = \\int_0^a f(a - x) \\, dx \\\\[10pt]
\\textcolor{#a855f7}{\\int u \\cdot v \\, dx} &= \\textcolor{#a855f7}{u \\int v \\, dx - \\int \\left( u' \\int v \\, dx \\right) dx} \\quad \\text{(Integration by Parts)} \\\\[10pt]
\\textcolor{#10b981}{\\frac{dy}{dx} + P(x) y} &= \\textcolor{#10b981}{Q(x)} \\implies \\textcolor{#f59e0b}{\\text{I.F.} = e^{\\int P(x) \\, dx}} \\\\[10pt]
\\textcolor{#10b981}{y \\cdot e^{\\int P(x) \\, dx}} &= \\int \\left( Q(x) \\cdot e^{\\int P(x) \\, dx} \\right) dx + C \\quad \\text{(General Solution)}
\\end{aligned}`,

    math_vectors_prob: `% Class 12 Mathematics: 3D Vector Geometry & Bayes' Probability
\\begin{aligned}
\\textcolor{#38bdf8}{\\vec{r}} &= \\textcolor{#38bdf8}{\\vec{a} + \\lambda \\vec{b}}, \\qquad \\textcolor{#38bdf8}{\\vec{r} \\cdot \\hat{n} = d} \\quad \\text{(Line \\& Plane in 3D)} \\\\[10pt]
\\textcolor{#ec4899}{d} &= \\textcolor{#ec4899}{\\left| \\frac{(\\vec{a}_2 - \\vec{a}_1) \\cdot (\\vec{b}_1 \\times \\vec{b}_2)}{|\\vec{b}_1 \\times \\vec{b}_2|} \\right|} \\qquad \\text{(Shortest Distance Between Skew Lines)} \\\\[10pt]
\\textcolor{#10b981}{\\cos \\theta} &= \\frac{\\vec{a} \\cdot \\vec{b}}{|\\vec{a}| |\\vec{b}|}, \\quad \\textcolor{#10b981}{\\vec{a} \\times \\vec{b} = |\\vec{a}| |\\vec{b}| \\sin \\theta \\, \\hat{n}} \\\\[10pt]
\\textcolor{#f59e0b}{P(E_i | A)} &= \\textcolor{#f59e0b}{\\frac{P(E_i) \\cdot P(A | E_i)}{\\sum_{k=1}^n P(E_k) \\cdot P(A | E_k)}} \\qquad \\text{(Bayes' Theorem of Probability)}
\\end{aligned}`
};

window.katexTemplate = window.katexTemplates.physics_electrodynamics;

/**
 * Renders LaTeX / KaTeX code into an iframe-compatible HTML string.
 * Uses the full preview screen size with dynamic responsive auto-fit.
 *
 * @param {string} latexCode The raw LaTeX / Math code.
 * @param {object|string} [options={}] Configuration options or fontSize string.
 * @returns {string} The full HTML document source for an iframe.
 */
window.renderKatex = function(latexCode, options = {}) {
    let fontSize = '1.8em';
    let textColor = '#f8fafc';
    let background = '#0a0d14';
    let fitMode = 'auto'; // 'auto', 'cinema', 'square', 'transparent'

    if (typeof options === 'string') {
        fontSize = options;
    } else if (typeof options === 'object' && options !== null) {
        if (options.fontSize) fontSize = options.fontSize;
        if (options.color || options.textColor) textColor = options.color || options.textColor;
        if (options.background) background = options.background;
        if (options.fitMode) fitMode = options.fitMode;
    }

    const codeToRender = (latexCode && latexCode.trim().length > 0)
        ? latexCode
        : (window.katexTemplate || window.katexTemplates.physics_electrodynamics);

    const jsonCode = JSON.stringify(codeToRender);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>12th Math & Physics KaTeX Preview</title>
    <!-- KaTeX CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <style>
        * {
            box-sizing: border-box;
        }
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: ${background};
            color: ${textColor};
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
        }
        #katex-stage {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            overflow: hidden;
            position: relative;
        }
        #katex-scaler {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transform-origin: center center;
            will-change: transform;
        }
        #katex-content {
            display: inline-block;
            text-align: center;
            font-size: ${fontSize};
            line-height: 1.25;
            white-space: nowrap;
            filter: drop-shadow(0 12px 32px rgba(0, 0, 0, 0.55));
        }
        .katex-display {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            overflow: visible !important;
        }
        .katex {
            font-size: 1em !important;
            color: inherit;
            white-space: nowrap !important;
        }
        /* Clip MathML fallback to eliminate phantom bounding-box overflows */
        .katex .katex-mathml {
            position: absolute !important;
            clip: rect(1px, 1px, 1px, 1px) !important;
            padding: 0 !important;
            border: 0 !important;
            height: 1px !important;
            width: 1px !important;
            overflow: hidden !important;
        }
        .katex-error-box {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.35);
            border-radius: 12px;
            padding: 18px 24px;
            font-size: 14px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            white-space: pre-wrap;
            max-width: 90%;
            line-height: 1.5;
            word-break: break-word;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
    </style>
</head>
<body>
    <div id="katex-stage">
        <div id="katex-scaler">
            <div id="katex-content"></div>
        </div>
    </div>

    <!-- KaTeX Core and Extensions -->
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/mhchem.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"><\/script>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const rawCode = (${jsonCode}).trim();
            const stage = document.getElementById('katex-stage');
            const scaler = document.getElementById('katex-scaler');
            const content = document.getElementById('katex-content');

            /**
             * Full Preview Screen Size Auto-Fit
             * Dynamically measures rendered formula bounding box and scales it
             * to prominently fill available preview screen width & height with 0 cutoffs.
             */
            function fitToViewport() {
                if (!stage || !scaler || !content) return;

                // 1. Available viewport boundary with 32px safe margins
                const availW = Math.max(50, stage.clientWidth - 32);
                const availH = Math.max(50, stage.clientHeight - 32);

                // 2. Measure natural dimensions of unscaled content
                const naturalW = content.scrollWidth || content.offsetWidth;
                const naturalH = content.scrollHeight || content.offsetHeight;

                if (naturalW > 0 && naturalH > 0 && availW > 0 && availH > 0) {
                    const scaleX = availW / naturalW;
                    const scaleY = availH / naturalH;

                    // Fully utilize preview screen size without cutoff!
                    const targetScale = Math.min(scaleX, scaleY) * 0.96;
                    scaler.style.transform = 'scale(' + targetScale + ')';
                }
            }

            // Sanitize against common non-KaTeX constructs that cause red lines
            let cleanCode = rawCode
                .replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, '')
                .replace(/\\bbox\[[^\]]*\]\{([\s\S]*?)\}/g, '$1')
                .replace(/\\hspace\{[^}]*\}/g, ' ')
                .trim();

            if (!cleanCode) {
                content.innerHTML = '<span style="color: #71717a; font-size: 0.8em;">Type Math/Physics equation to render...</span>';
                return;
            }

            try {
                if (cleanCode.includes('$$') || (cleanCode.includes('$') && !cleanCode.startsWith('\\begin'))) {
                    content.innerHTML = cleanCode.replace(/\\n/g, '<br/>');
                    renderMathInElement(content, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false },
                            { left: '\\[', right: '\\]', display: true },
                            { left: '\\(', right: '\\)', display: false }
                        ],
                        output: 'html',
                        throwOnError: false
                    });
                } else {
                    katex.render(cleanCode, content, {
                        displayMode: true,
                        output: 'html',
                        throwOnError: true,
                        strict: false,
                        trust: true
                    });
                }
            } catch (err) {
                console.error("KaTeX Render Error:", err);
                try {
                    katex.render(cleanCode, content, {
                        displayMode: true,
                        output: 'html',
                        throwOnError: false,
                        strict: false,
                        trust: true
                    });
                } catch (fallbackErr) {
                    content.innerHTML = '<div class="katex-error-box"><strong>KaTeX Render Error:</strong><br/>' + (err.message || String(err)) + '</div>';
                }
            }

            // Immediately calculate fit, and recalculate on webfont completion & viewport resize
            fitToViewport();
            window.addEventListener('resize', fitToViewport);

            if (window.ResizeObserver) {
                const ro = new ResizeObserver(() => fitToViewport());
                ro.observe(document.body);
            }

            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(fitToViewport);
            }

            setTimeout(fitToViewport, 40);
            setTimeout(fitToViewport, 150);
            setTimeout(fitToViewport, 350);
        });
    <\/script>
</body>
</html>`;
};
