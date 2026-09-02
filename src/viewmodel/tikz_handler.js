// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/tikz_handler.js
/**
 * TikZ Diagram Engine for XtraAnim Studio
 * - Free Tier: WebAssembly (TikzJax) - $0 Server Cost, zero server RAM
 * - Pro Tier: Server-side Native LaTeX Engine (pdflatex + sips / pdftoppm)
 */

(function () {
    'use strict';

    const defaultTikzCode = `% TikZ: Calculus Curve & Area Under Curve
\\begin{tikzpicture}[scale=1.2]
  % Coordinate Axes
  \\draw[->, >=stealth, thick, color=gray!70] (-0.5, 0) -- (4.5, 0) node[right, color=white] {$x$};
  \\draw[->, >=stealth, thick, color=gray!70] (0, -0.5) -- (0, 3.5) node[above, color=white] {$y$};
  
  % Shaded Integral
  \\fill[cyan!25, opacity=0.35, domain=1:3.5, variable=\\x]
    (1, 0) -- plot (\\x, {0.2*\\x*\\x + 0.3}) -- (3.5, 0) -- cycle;
    
  % Function Curve
  \\draw[very thick, color=cyan, domain=0:4, smooth, variable=\\x]
    plot (\\x, {0.2*\\x*\\x + 0.3}) node[right] {$f(x) = \\frac{1}{5}x^2 + 0.3$};
    
  % Bounds & Label
  \\draw[dashed, color=white!70] (1, 0) node[below, color=white] {$a$} -- (1, {0.2*1 + 0.3});
  \\draw[dashed, color=white!70] (3.5, 0) node[below, color=white] {$b$} -- (3.5, {0.2*3.5*3.5 + 0.3});
  \\node[color=cyan!90, font=\\bfseries] at (2.2, 0.8) {$\\int_a^b f(x)\\,dx$};
\\end{tikzpicture}`;

    /**
     * Generates Free WebAssembly (TikzJax) Preview Document
     */
    function renderTikz(tikzCode) {
        let code = (tikzCode || defaultTikzCode).trim();
        if (!code.includes('\\begin{tikzpicture}')) {
            code = `\\begin{tikzpicture}\n${code}\n\\end{tikzpicture}`;
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TikZ Preview</title>
  <link rel="stylesheet" type="text/css" href="https://tikzjax.com/v1/fonts.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%; height: 100%;
      background: #090b10; color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden; display: flex; align-items: center; justify-content: center;
      position: relative;
    }
    #viewport {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; overflow: auto;
    }
    #tikz-target {
      display: inline-flex; align-items: center; justify-content: center;
      background: transparent; padding: 18px 22px;
    }
    svg {
      max-width: 90vw; max-height: 80vh; height: auto;
      filter: drop-shadow(0 6px 20px rgba(0,0,0,0.5));
    }
    .loading-box {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; color: #94a3b8; font-size: 13px;
    }
    .spinner {
      width: 26px; height: 26px;
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6; border-radius: 50%;
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

      // Notify parent window with raw SVG
      window.parent.postMessage({
        type: 'TIKZ_RENDER_SUCCESS',
        svgContent: svg.outerHTML
      }, '*');

      // Auto-generate PNG data URI for export and Explore feed publishing
      try {
        let pw = 800, ph = 600;
        const pvb = svg.getAttribute('viewBox');
        if (pvb) {
          const pparts = pvb.trim().split(/[\s,]+/).map(Number);
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
      document.getElementById('dlSvgBtn').onclick = () => {
        const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.parent.postMessage({ type: 'TRIGGER_DOWNLOAD', dataUri: url, filename: 'diagram.svg' }, '*');
      };

      // PNG Download
      document.getElementById('dlPngBtn').onclick = () => {
        let w = 800, h = 600;
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
    }, 250);

    failTimer = setTimeout(() => {
      if (!isReady && !document.querySelector('svg')) {
        clearInterval(pollInterval);
        const loader = document.getElementById('loader');
        if (loader) {
          loader.innerHTML = 
            '<div style="color:#ef4444;text-align:center;padding:12px;">⚠️ TikZ Compilation Failed.<br><small style="color:#a1a1aa;">Check syntax or try the Pro Native Engine.</small></div>';
        }
      }
    }, 25000);
  <\/script>
</body>
</html>`;
    }

    /**
     * Generates Pro Native Engine Preview Document with Download Controls
     */
    function renderTikzPro(pngBase64) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TikZ Pro Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100vw; height: 100vh;
      background: #090b10; color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden; display: flex; align-items: center; justify-content: center;
      position: relative;
    }
    img {
      max-width: 90vw; max-height: 85vh; height: auto; object-fit: contain;
      filter: drop-shadow(0 6px 20px rgba(0,0,0,0.5));
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
  <img src="${pngBase64}" alt="TikZ Diagram" />
  <div class="canvas-actions">
    <button id="dlProPngBtn" class="canvas-btn">⬇ PNG</button>
  </div>
  <div class="badge-pro">👑 Pro Native Engine</div>
  <script>
    document.getElementById('dlProPngBtn').onclick = () => {
      window.parent.postMessage({ type: 'TRIGGER_DOWNLOAD', dataUri: '${pngBase64}', filename: 'diagram.png' }, '*');
    };
  <\/script>
</body>
</html>`;
    }

    // Universal message listener in parent window:
    // Triggers download from the top window, which is never blocked by iframe sandbox
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

    window.renderTikz = renderTikz;
    window.renderTikzPro = renderTikzPro;
    window.defaultTikzCode = defaultTikzCode;
    window.currentTikzSvg = null;
    window.currentTikzPng = null;
})();
