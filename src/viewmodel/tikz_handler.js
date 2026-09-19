// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/tikz_handler.js
/**
 * TikZ Diagram Engine for XtraAnim Studio
 * - Pro Tier: Server-side Native LaTeX Engine (pdflatex + sips / pdftoppm) - 100% Reliable
 * - Free Tier: WebAssembly (TikzJax) fallback
 * Supports full preview screen size responsive auto-fit and 4 premium templates.
 */

(function () {
    'use strict';

    const tikzTemplates = {
        neural_network: `% TikZ: Deep Neural Network Architecture & Latent Features
\\begin{tikzpicture}[
    scale=0.92,
    every node/.style={font=\\small},
    input_node/.style={circle, draw=cyan!90, fill=cyan!15, thick, minimum size=24pt, inner sep=0pt},
    hidden_node/.style={circle, draw=purple!90, fill=purple!15, thick, minimum size=24pt, inner sep=0pt},
    latent_node/.style={circle, draw=emerald!90, fill=emerald!15, thick, minimum size=24pt, inner sep=0pt},
    output_node/.style={circle, draw=amber!90, fill=amber!15, thick, minimum size=24pt, inner sep=0pt}
]
    \\node[input_node] (I1) at (0, 1.5) {$x_1$};
    \\node[input_node] (I2) at (0, 0.5) {$x_2$};
    \\node[input_node] (I3) at (0, -0.5) {$x_3$};
    \\node[input_node] (I4) at (0, -1.5) {$x_4$};
    \\node[above=6pt, color=cyan!90, font=\\bfseries\\footnotesize] at (0, 1.5) {Input $\\mathbf{x}$};

    \\node[hidden_node] (H1) at (2.6, 2.0) {$h_1$};
    \\node[hidden_node] (H2) at (2.6, 1.0) {$h_2$};
    \\node[hidden_node] (H3) at (2.6, 0.0) {$h_3$};
    \\node[hidden_node] (H4) at (2.6, -1.0) {$h_4$};
    \\node[hidden_node] (H5) at (2.6, -2.0) {$h_5$};
    \\node[above=6pt, color=purple!90, font=\\bfseries\\footnotesize] at (2.6, 2.0) {Dense Layer};

    \\node[latent_node] (Z1) at (5.2, 1.5) {$z_1$};
    \\node[latent_node] (Z2) at (5.2, 0.5) {$z_2$};
    \\node[latent_node] (Z3) at (5.2, -0.5) {$z_3$};
    \\node[latent_node] (Z4) at (5.2, -1.5) {$z_4$};
    \\node[above=6pt, color=emerald!90, font=\\bfseries\\footnotesize] at (5.2, 1.5) {Latent $\\mathbf{z}$};

    \\node[output_node] (O1) at (7.8, 1.0) {$\\hat{y}_1$};
    \\node[output_node] (O2) at (7.8, 0.0) {$\\hat{y}_2$};
    \\node[output_node] (O3) at (7.8, -1.0) {$\\hat{y}_3$};
    \\node[above=6pt, color=amber!90, font=\\bfseries\\footnotesize] at (7.8, 1.0) {Output $\\hat{\\mathbf{y}}$};

    \\foreach \\i in {1,2,3,4} {
        \\foreach \\j in {1,2,3,4,5} {
            \\draw[->, >=stealth, draw=gray!40, opacity=0.35, thin] (I\\i) -- (H\\j);
        }
    }
    \\foreach \\i in {1,2,3,4,5} {
        \\foreach \\j in {1,2,3,4} {
            \\draw[->, >=stealth, draw=purple!50, opacity=0.45, thin] (H\\i) -- (Z\\j);
        }
    }
    \\foreach \\i in {1,2,3,4} {
        \\foreach \\j in {1,2,3} {
            \\draw[->, >=stealth, draw=emerald!50, opacity=0.55, thick] (Z\\i) -- (O\\j);
        }
    }
    \\draw[dashed, draw=gray!50, rounded corners=8pt, opacity=0.6] (-0.8, -2.6) rectangle (8.6, 2.7);
    \\node[below=4pt, color=gray!60, font=\\scriptsize] at (3.9, -2.6) {Deep Feedforward Latent Representation Architecture};
\\end{tikzpicture}`,

        wave_optics: `% TikZ: Young's Double Slit Interference & Wave Diffraction
\\begin{tikzpicture}[scale=1.05, >=stealth]
    \\draw[dashed, color=gray!60] (-1.5, 0) -- (7.5, 0);

    \\foreach \\x in {-1.2, -0.8, -0.4} {
        \\draw[thick, color=cyan!70] (\\x, -1.8) -- (\\x, 1.8);
    }
    \\node[color=cyan!90, font=\\bfseries\\footnotesize, align=center] at (-0.8, 2.2) {Coherent Wavefront\\\\$\\lambda = 550\\,\\text{nm}$};

    \\fill[fill=gray!85] (0, 0.4) rectangle (0.15, 2.0);
    \\fill[fill=gray!85] (0, -0.4) rectangle (0.15, 0.4);
    \\fill[fill=gray!85] (0, -2.0) rectangle (0.15, -0.4);

    \\coordinate (S1) at (0.15, 0.4);
    \\coordinate (S2) at (0.15, -0.4);
    \\node[left, color=cyan, font=\\footnotesize] at (0, 0.4) {$S_1$};
    \\node[left, color=cyan, font=\\footnotesize] at (0, -0.4) {$S_2$};
    \\draw[<->, color=white, font=\\scriptsize] (-0.25, -0.4) -- (-0.25, 0.4) node[midway, left] {$d$};

    \\fill[fill=gray!75] (6.0, -2.2) rectangle (6.12, 2.2);
    \\node[above, color=white, font=\\bfseries\\footnotesize] at (6.06, 2.25) {Detection Screen};

    \\coordinate (P) at (6.0, 1.3);
    \\fill[color=amber] (P) circle (2.2pt);
    \\node[right=2pt, color=amber, font=\\bfseries\\footnotesize] at (P) {$P(y)$ [Bright Fringe]};

    \\draw[thick, color=cyan!90] (S1) -- (P) node[midway, above, sloped, font=\\scriptsize] {$r_1$};
    \\draw[thick, color=purple!90] (S2) -- (P) node[midway, below, sloped, font=\\scriptsize] {$r_2$};

    \\draw[thin, dashed, color=emerald!80] (S1) -- (0.55, 0.15);
    \\draw[<->, color=emerald, font=\\scriptsize] (0.15, -0.4) -- (0.55, 0.15) node[midway, right=1pt] {$\\Delta x = d \\sin\\theta$};

    \\draw[<->, color=gray!40] (0.15, -2.1) -- (6.0, -2.1) node[midway, below, font=\\scriptsize] {Screen Distance $D \\gg d$};

    \\draw[thick, color=amber!90] 
        (6.35, -2.0) -- (7.4, -1.8) -- (6.35, -1.3) -- (7.4, -0.8) -- 
        (6.35, 0.0) -- (7.4, 0.8) -- (6.35, 1.3) -- (7.4, 1.8) -- (6.35, 2.0);
    \\node[right, color=amber!90, font=\\scriptsize] at (7.5, 1.3) {$I = I_0 \\cos^2\\left(\\frac{\\pi d y}{\\lambda D}\\right)$};
\\end{tikzpicture}`,

        carnot_engine: `% TikZ: Carnot Cycle & Reversible Thermodynamic Engine
\\begin{tikzpicture}[scale=1.1, >=stealth]
    \\draw[->, thick, color=gray!50] (0, 0) -- (6.8, 0) node[right, color=white, font=\\footnotesize] {Volume $V$};
    \\draw[->, thick, color=gray!50] (0, 0) -- (0, 5.0) node[above, color=white, font=\\footnotesize] {Pressure $P$};

    \\coordinate (A) at (1.2, 4.2);
    \\coordinate (B) at (3.2, 3.1);
    \\coordinate (C) at (5.2, 1.4);
    \\coordinate (D) at (2.4, 1.8);

    \\fill[purple!25, opacity=0.35] 
        (A) to[bend right=14] (B) 
        to[bend right=18] (C) 
        to[bend left=14] (D) 
        to[bend left=18] (A);

    \\draw[very thick, color=cyan!90, ->] (A) to[bend right=14] node[midway, above right, font=\\scriptsize] {Isothermal $T_H$} (B);
    \\draw[very thick, color=emerald!90, ->] (B) to[bend right=18] node[midway, above right, font=\\scriptsize] {Adiabatic $Q=0$} (C);
    \\draw[very thick, color=blue!90, ->] (C) to[bend left=14] node[midway, below left, font=\\scriptsize] {Isothermal $T_C$} (D);
    \\draw[very thick, color=amber!90, ->] (D) to[bend left=18] node[midway, left, font=\\scriptsize] {Adiabatic $Q=0$} (A);

    \\fill[color=white] (A) circle (2pt) node[above=2pt, color=white, font=\\scriptsize] {$\\mathbf{1}\\,(P_1,V_1)$};
    \\fill[color=white] (B) circle (2pt) node[right=2pt, color=white, font=\\scriptsize] {$\\mathbf{2}\\,(P_2,V_2)$};
    \\fill[color=white] (C) circle (2pt) node[below right=2pt, color=white, font=\\scriptsize] {$\\mathbf{3}\\,(P_3,V_3)$};
    \\fill[color=white] (D) circle (2pt) node[below left=2pt, color=white, font=\\scriptsize] {$\\mathbf{4}\\,(P_4,V_4)$};

    \\draw[->, very thick, color=red!90] (1.8, 4.5) -- (2.2, 3.7) node[midway, right, font=\\scriptsize\\bfseries] {$Q_{\\text{in}} (T_H)$};
    \\draw[->, very thick, color=cyan!90] (3.8, 1.6) -- (4.2, 0.8) node[midway, right, font=\\scriptsize\\bfseries] {$Q_{\\text{out}} (T_C)$};

    \\node[color=purple!90, font=\\bfseries\\footnotesize, align=center] at (3.0, 2.5) {Net Work\\\\$W_{\\text{net}} = \\oint P\\,dV$};

    \\node[draw=emerald!80, fill=emerald!10, rounded corners=4pt, inner sep=5pt, font=\\footnotesize, color=emerald!90] at (4.6, 4.3) 
        {$\\eta = 1 - \\frac{T_C}{T_H} = \\frac{W_{\\text{net}}}{Q_{\\text{in}}}$};
\\end{tikzpicture}`,

        bloch_sphere: `% TikZ: Quantum Bloch Sphere & Qubit Superposition Vector
\\begin{tikzpicture}[scale=1.2, >=stealth]
    \\shade[ball color=cyan!15, opacity=0.25] (0, 0) circle (2.2);
    \\draw[thick, color=gray!60] (0, 0) circle (2.2);
    \\draw[dashed, color=gray!50] (0, 0) ellipse [x radius=2.2, y radius=0.65];

    \\draw[->, thick, color=gray!70] (0, -2.7) -- (0, 2.8) node[above, color=white, font=\\footnotesize] {$|z\\rangle$};
    \\draw[->, thick, color=gray!70] (0, 0) -- (2.8, 0) node[right, color=white, font=\\footnotesize] {$|y\\rangle$};
    \\draw[->, thick, color=gray!70] (0, 0) -- (-1.87, -0.99) node[below left, color=white, font=\\footnotesize] {$|x\\rangle$};

    \\node[above=2pt, color=cyan!90, font=\\bfseries\\footnotesize] at (0, 2.2) {$|0\\rangle$};
    \\node[below=2pt, color=cyan!90, font=\\bfseries\\footnotesize] at (0, -2.2) {$|1\\rangle$};
    \\fill[color=cyan] (0, 2.2) circle (2pt);
    \\fill[color=cyan] (0, -2.2) circle (2pt);

    \\coordinate (Origin) at (0, 0);
    \\coordinate (Psi) at (0.9, 1.8);
    \\coordinate (Proj) at (0.9, -0.2);

    \\draw[dashed, color=purple!70, thin] (Psi) -- (Proj);
    \\draw[dashed, color=purple!70, thin] (Origin) -- (Proj);

    \\draw[->, very thick, color=purple!90] (Origin) -- (Psi) node[above right, font=\\bfseries\\footnotesize] {$|\\psi\\rangle$};
    \\fill[color=purple] (Psi) circle (2pt);

    \\draw[->, color=amber, thick] (0, 0.9) arc (90:63:1.0);
    \\node[color=amber, font=\\footnotesize] at (0.35, 1.1) {$\\theta$};

    \\draw[->, color=emerald, thick] (-0.35, -0.18) arc (-150:-20:0.45);
    \\node[color=emerald, font=\\footnotesize] at (0.45, -0.35) {$\\phi$};

    \\node[draw=purple!80, fill=purple!10, rounded corners=4pt, inner sep=5pt, font=\\scriptsize, color=purple!90, align=center] at (0, -3.2)
        {$|\\psi\\rangle = \\cos\\frac{\\theta}{2}|0\\rangle + e^{i\\phi}\\sin\\frac{\\theta}{2}|1\\rangle$};
\\end{tikzpicture}`
    };

    const defaultTikzCode = tikzTemplates.neural_network;

    /**
     * Generates Free WebAssembly (TikzJax) Preview Document with full preview screen auto-fit
     */
    function renderTikz(tikzCode, options = {}) {
        let code = (tikzCode || defaultTikzCode).trim();
        if (!code.includes('\\begin{tikzpicture}')) {
            code = `\\begin{tikzpicture}\n${code}\n\\end{tikzpicture}`;
        }

        const background = (options && options.background) ? options.background : '#090b10';
        const fitMode = (options && options.fitMode) ? options.fitMode : 'auto';

        let stageRatioStyle = 'width: 100%; height: 100%;';
        if (fitMode === 'cinema') {
            stageRatioStyle = 'width: 100%; height: 100%; aspect-ratio: 16 / 9; max-width: 100%; max-height: 100%;';
        } else if (fitMode === 'square') {
            stageRatioStyle = 'width: 100%; height: 100%; aspect-ratio: 1 / 1; max-width: 100%; max-height: 100%;';
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>TikZ Preview</title>
  <link rel="stylesheet" type="text/css" href="https://tikzjax.com/v1/fonts.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%; height: 100%;
      background: ${background}; color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden; display: flex; align-items: center; justify-content: center;
      position: relative; user-select: none;
    }
    #viewport {
      ${stageRatioStyle}
      display: flex; align-items: center; justify-content: center;
      padding: 16px; box-sizing: border-box; overflow: hidden;
      position: relative;
    }
    #tikz-target {
      width: 100%; height: 100%;
      max-width: 100%; max-height: 100%;
      display: inline-flex; align-items: center; justify-content: center;
      box-sizing: border-box; overflow: hidden;
    }
    #tikz-target svg {
      max-width: 100% !important;
      max-height: 100% !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      filter: drop-shadow(0 8px 24px rgba(0,0,0,0.55));
    }
    .loading-box {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; color: #94a3b8; font-size: 13px;
    }
    .spinner {
      width: 28px; height: 28px;
      border: 3px solid rgba(56, 189, 248, 0.2);
      border-top-color: #38bdf8; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .canvas-actions {
      position: absolute; top: 12px; right: 12px;
      display: none; gap: 8px; z-index: 10;
    }
    .canvas-btn {
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff; padding: 6px 12px; border-radius: 6px;
      font-size: 12px; font-weight: 600; cursor: pointer;
      transition: all 0.2s;
    }
    .canvas-btn:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-1px);
    }
    .badge-wasm {
      position: absolute; bottom: 10px; right: 12px;
      font-size: 10px; font-weight: 600; color: #10b981;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 3px 8px; border-radius: 4px;
    }
  </style>
  <script src="https://tikzjax.com/v1/tikzjax.js"><\/script>
</head>
<body>
  <div id="viewport">
    <div id="loader" class="loading-box">
      <div class="spinner"></div>
      <span>Compiling TikZ in WebAssembly...</span>
    </div>

    <div id="tikz-target" style="display: none;">
      <script type="text/tikz">
${code}
      <\/script>
    </div>

    <div id="actions" class="canvas-actions">
      <button id="dlSvgBtn" class="canvas-btn">⬇ SVG</button>
      <button id="dlPngBtn" class="canvas-btn">⬇ PNG</button>
    </div>

    <div class="badge-wasm">⚡ TikzJax WebAssembly</div>
  </div>

  <script>
    let isReady = false;
    let failTimer = null;

    function handleSvgFound(svg) {
      if (isReady) return;
      isReady = true;
      if (failTimer) clearTimeout(failTimer);

      const loader = document.getElementById('loader');
      if (loader) {
        loader.style.display = 'none';
        loader.innerHTML = '';
      }

      const target = document.getElementById('tikz-target');
      if (target) target.style.display = 'inline-flex';

      const actions = document.getElementById('actions');
      if (actions) actions.style.display = 'flex';

      // Ensure SVG scales to fit the preview screen size without cutoffs
      try {
        let vb = svg.getAttribute('viewBox');
        const origW = svg.getAttribute('width');
        const origH = svg.getAttribute('height');

        if (!vb && origW && origH) {
          const numW = parseFloat(origW) || 600;
          const numH = parseFloat(origH) || 450;
          svg.setAttribute('viewBox', \`0 0 \${numW} \${numH}\`);
        }

        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.maxWidth = '100%';
        svg.style.maxHeight = '100%';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.objectFit = 'contain';
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      } catch (e) {
        console.warn('TikZ SVG ViewBox sizing adjustment error:', e);
      }

      // Notify parent window with raw SVG
      window.parent.postMessage({
        type: 'TIKZ_RENDER_SUCCESS',
        svgContent: svg.outerHTML
      }, '*');

      // Auto-generate PNG data URI for export and Explore feed publishing
      try {
        let pw = 1200, ph = 900;
        const pvb = svg.getAttribute('viewBox');
        if (pvb) {
          const pparts = pvb.trim().split(/[\\s,]+/).map(Number);
          if (pparts.length === 4 && pparts[2] > 0 && pparts[3] > 0) {
            pw = pparts[2];
            ph = pparts[3];
          }
        }
        const pclone = svg.cloneNode(true);
        pclone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        pclone.setAttribute('width', pw);
        pclone.setAttribute('height', ph);
        const psvgXml = new XMLSerializer().serializeToString(pclone);
        const psvgDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(psvgXml);
        const pimg = new Image();
        pimg.onload = () => {
          const pcanvas = document.createElement('canvas');
          const pscale = 2;
          pcanvas.width = pw * pscale;
          pcanvas.height = ph * pscale;
          const pctx = pcanvas.getContext('2d');
          pctx.scale(pscale, pscale);
          pctx.drawImage(pimg, 0, 0, pw, ph);
          try {
            const pngUri = pcanvas.toDataURL('image/png');
            window.parent.postMessage({ type: 'TIKZ_PNG_READY', dataUri: pngUri }, '*');
          } catch (e) {}
        };
        pimg.src = psvgDataUri;
      } catch (e) {}

      // SVG Download via parent window
      const dlSvg = document.getElementById('dlSvgBtn');
      if (dlSvg) {
        dlSvg.onclick = () => {
          const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          window.parent.postMessage({ type: 'TRIGGER_DOWNLOAD', dataUri: url, filename: 'diagram.svg' }, '*');
        };
      }

      // PNG Download
      const dlPng = document.getElementById('dlPngBtn');
      if (dlPng) {
        dlPng.onclick = () => {
          let w = 1200, h = 900;
          const vb = svg.getAttribute('viewBox');
          if (vb) {
            const parts = vb.trim().split(/[\\s,]+/).map(Number);
            if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
              w = parts[2];
              h = parts[3];
            }
          }

          const clone = svg.cloneNode(true);
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          clone.setAttribute('width', w);
          clone.setAttribute('height', h);

          const svgXml = new XMLSerializer().serializeToString(clone);
          const svgDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgXml);

          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = 2;
            canvas.width = w * scale;
            canvas.height = h * scale;
            const ctx = canvas.getContext('2d');
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0, w, h);

            try {
              const pngDataUri = canvas.toDataURL('image/png');
              window.parent.postMessage({ type: 'TRIGGER_DOWNLOAD', dataUri: pngDataUri, filename: 'diagram.png' }, '*');
            } catch (err) {
              window.parent.postMessage({ type: 'TRIGGER_DOWNLOAD', dataUri: svgDataUri, filename: 'diagram.svg' }, '*');
            }
          };

          img.onerror = () => {
            window.parent.postMessage({ type: 'TRIGGER_DOWNLOAD', dataUri: svgDataUri, filename: 'diagram.svg' }, '*');
          };

          img.src = svgDataUri;
        };
      }

      if (observer) observer.disconnect();
    }

    const observer = new MutationObserver(() => {
      const svg = document.querySelector('svg');
      if (svg) handleSvgFound(svg);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('tikzjax-load-finished', () => {
      const svg = document.querySelector('svg');
      if (svg) handleSvgFound(svg);
    });

    const pollInterval = setInterval(() => {
      const svg = document.querySelector('svg');
      if (svg) {
        clearInterval(pollInterval);
        handleSvgFound(svg);
      }
    }, 200);

    failTimer = setTimeout(() => {
      if (!isReady && !document.querySelector('svg')) {
        clearInterval(pollInterval);
        const loader = document.getElementById('loader');
        if (loader) {
          loader.innerHTML = 
            '<div style="color:#ef4444;text-align:center;padding:12px;">⚠️ TikZ Compilation Failed.<br><small style="color:#a1a1aa;">Check syntax or switch to Pro Native LaTeX Engine in Settings.</small></div>';
        }
      }
    }, 25000);
  <\/script>
</body>
</html>`;
    }

    /**
     * Generates Pro Native Engine Preview Document with Download Controls & Full Screen Auto-Fit
     */
    function renderTikzPro(pngBase64, options = {}) {
        const background = (options && options.background) ? options.background : '#090b10';
        const fitMode = (options && options.fitMode) ? options.fitMode : 'auto';

        let stageRatioStyle = 'width: 100%; height: 100%;';
        if (fitMode === 'cinema') {
            stageRatioStyle = 'width: 100%; height: 100%; aspect-ratio: 16 / 9; max-width: 100%; max-height: 100%;';
        } else if (fitMode === 'square') {
            stageRatioStyle = 'width: 100%; height: 100%; aspect-ratio: 1 / 1; max-width: 100%; max-height: 100%;';
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>TikZ Pro Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%; height: 100%;
      background: ${background}; color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden; display: flex; align-items: center; justify-content: center;
      position: relative; user-select: none;
    }
    #viewport {
      ${stageRatioStyle}
      display: flex; align-items: center; justify-content: center;
      padding: 16px; box-sizing: border-box; overflow: hidden;
      position: relative;
    }
    img {
      max-width: 100%; max-height: 100%;
      width: auto; height: auto;
      object-fit: contain;
      filter: drop-shadow(0 8px 25px rgba(0,0,0,0.55));
    }
    .canvas-actions {
      position: absolute; top: 12px; right: 12px;
      display: flex; gap: 8px; z-index: 10;
    }
    .canvas-btn {
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff; padding: 6px 12px; border-radius: 6px;
      font-size: 12px; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; gap: 4px;
      transition: all 0.2s;
    }
    .canvas-btn:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-1px);
    }
    .badge-pro {
      position: absolute; bottom: 10px; right: 12px;
      font-size: 10px; font-weight: 600; color: #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 3px 8px; border-radius: 4px;
    }
  </style>
</head>
<body>
  <div id="viewport">
    <img src="${pngBase64}" alt="TikZ Diagram" />
    <div class="canvas-actions">
      <button id="dlProPngBtn" class="canvas-btn">⬇ PNG</button>
    </div>
    <div class="badge-pro">👑 Pro Native LaTeX</div>
  </div>
  <script>
    window.parent.postMessage({ type: 'TIKZ_PNG_READY', dataUri: '${pngBase64}' }, '*');
    window.parent.postMessage({ type: 'TIKZ_RENDER_SUCCESS', isReady: true }, '*');
    const btn = document.getElementById('dlProPngBtn');
    if (btn) {
      btn.onclick = () => {
        window.parent.postMessage({ type: 'TRIGGER_DOWNLOAD', dataUri: '${pngBase64}', filename: 'diagram.png' }, '*');
      };
    }
  </script>
</body>
</html>`;
    }

    // Universal message listener in parent window:
    // Triggers download from the top window, which is never blocked by iframe sandbox
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('message', function (e) {
            if (e.data) {
                if (e.data.type === 'TIKZ_RENDER_SUCCESS') {
                    window.currentTikzSvg = e.data.svgContent;
                } else if (e.data.type === 'TIKZ_PNG_READY' && e.data.dataUri) {
                    window.currentTikzPng = e.data.dataUri;
                } else if (e.data.type === 'TRIGGER_DOWNLOAD' && e.data.dataUri) {
                    const a = document.createElement('a');
                    a.href = e.data.dataUri;
                    a.download = e.data.filename || 'diagram.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            }
        });
    }

    window.tikzTemplates = tikzTemplates;
    window.renderTikz = renderTikz;
    window.renderTikzPro = renderTikzPro;
    window.defaultTikzCode = defaultTikzCode;
    window.currentTikzSvg = null;
    window.currentTikzPng = null;
})();
