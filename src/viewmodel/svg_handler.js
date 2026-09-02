/**
 * SVG to PNG Vector Engine for XtraAnim Studio
 * - Supports raw SVGs with or without xmlns, width, height, or viewBox
 * - Auto-normalizes SVG namespaces and dimensions
 * - Default: Transparent background & High Quality (4× Ultra HD 300 DPI)
 * - Ultra-minimal UI: Clean color picker, preset swatches, ⬇ PNG & ⬇ SVG
 */

(function () {
    'use strict';

    const defaultSvgCode = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Ambient Orbit Circles -->
  <circle cx="250" cy="250" r="190" fill="none" stroke="#1e293b" stroke-width="2" />
  <circle cx="250" cy="250" r="155" fill="none" stroke="url(#primaryGrad)" stroke-width="3" stroke-dasharray="8,8" opacity="0.8" />
  <circle cx="250" cy="250" r="120" fill="none" stroke="#60a5fa" stroke-width="1.5" opacity="0.4" />

  <!-- Outer Hexagonal Shield -->
  <polygon points="250,75 395,160 395,340 250,425 105,340 105,160" fill="none" stroke="url(#primaryGrad)" stroke-width="4" filter="url(#glow)" />
  <polygon points="250,105 365,175 365,325 250,395 135,325 135,175" fill="url(#primaryGrad)" opacity="0.12" />

  <!-- Central Dynamic Vector Crystal -->
  <polygon points="250,140 330,250 250,360 170,250" fill="url(#accentGrad)" opacity="0.85" />
  <polygon points="250,170 305,250 250,330 195,250" fill="#0f172a" opacity="0.7" />

  <!-- Focal Nodes -->
  <circle cx="250" cy="250" r="32" fill="#ffffff" />
  <circle cx="250" cy="250" r="18" fill="#3b82f6" />
  
  <!-- Orbiting Satellites -->
  <circle cx="395" cy="160" r="9" fill="#06b6d4" />
  <circle cx="105" cy="340" r="9" fill="#ec4899" />
  <circle cx="250" cy="75" r="7" fill="#60a5fa" />
</svg>`;

    window.defaultSvgToPngCode = defaultSvgCode;

    /**
     * Generates a clean preview document for the SVG to PNG engine
     * @param {string} svgCode - Raw SVG XML
     * @param {object} options - Custom options (fillColor, strokeColor, backgroundColor, scale, isFeed)
     */
    window.renderSvgToPng = function (svgCode, options = {}) {
        let code = (svgCode || defaultSvgCode).trim();

        // 1. If no <svg> root tag exists, wrap the inner elements
        if (!code.startsWith('<svg') && !code.includes('<svg')) {
            code = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">${code}</svg>`;
        }

        // 2. Ensure xmlns is present on <svg> tag (critical for standalone rendering and image conversion)
        if (!/<svg[^>]*\bxmlns\s*=/i.test(code)) {
            code = code.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        const initialFill = options.fillColor || '';
        const initialBg = options.backgroundColor || 'transparent';
        const initialScale = options.scale || 4;
        const isFeed = !!options.isFeed;

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SVG to PNG</title>
  <!-- Remix Icons -->
  <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%; height: 100%;
      background: #080b11; color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif;
      overflow: hidden; display: flex; flex-direction: column;
      position: relative;
    }

    /* Subtle transparency checkerboard */
    .checkerboard {
      background-color: #0b0f19;
      background-image: linear-gradient(45deg, #101626 25%, transparent 25%),
                        linear-gradient(-45deg, #101626 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #101626 75%),
                        linear-gradient(-45deg, transparent 75%, #101626 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }

    #viewport {
      flex: 1;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: auto;
      position: relative;
    }

    #svgWrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      max-width: 90vw;
      max-height: 80vh;
      background: ${initialBg};
    }

    #svgContainer {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    /* Force robust sizing so SVGs without width/height never collapse */
    #svgContainer svg {
      width: min(75vw, 68vh, 520px) !important;
      height: min(75vw, 68vh, 520px) !important;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
      filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5));
    }

    /* Floating Minimal Bottom Controls */
    .minimal-dock {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: ${isFeed ? 'none' : 'flex'};
      align-items: center;
      gap: 12px;
      background: rgba(13, 18, 28, 0.9);
      backdrop-filter: blur(18px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 6px 14px;
      border-radius: 9999px;
      z-index: 100;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    }

    .palette-swatches {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .swatch-pill {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid rgba(255, 255, 255, 0.25);
      transition: all 0.15s ease;
    }

    .swatch-pill:hover {
      transform: scale(1.18);
      border-color: #ffffff;
    }

    .swatch-orig {
      background: linear-gradient(135deg, #3b82f6 50%, #ec4899 50%);
      border: 2px solid rgba(255, 255, 255, 0.4);
    }

    .color-picker-wrapper {
      position: relative;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      overflow: hidden;
      cursor: pointer;
      border: 2px solid rgba(255, 255, 255, 0.35);
      background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red);
      transition: transform 0.15s;
    }

    .color-picker-wrapper:hover {
      transform: scale(1.18);
      border-color: #ffffff;
    }

    .color-picker-wrapper input[type="color"] {
      position: absolute;
      top: -10px;
      left: -10px;
      width: 44px;
      height: 44px;
      opacity: 0;
      cursor: pointer;
    }

    .divider {
      width: 1px;
      height: 18px;
      background: rgba(255, 255, 255, 0.15);
    }

    .btn-download {
      background: #2563eb;
      border: none;
      color: #ffffff;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 6px 13px;
      border-radius: 9999px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .btn-download:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }

    .btn-download-svg {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
    }

    .btn-download-svg:hover {
      background: #334155;
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }
  </style>
</head>
<body class="checkerboard">

  <!-- Central Viewport -->
  <div id="viewport">
    <div id="svgWrapper">
      <div id="svgContainer">
        ${code}
      </div>
    </div>
  </div>

  <!-- Minimal Bottom Floating Bar -->
  <div class="minimal-dock">
    <!-- Color Swatches -->
    <div class="palette-swatches">
      <!-- Original Reset Pill -->
      <div class="swatch-pill swatch-orig" id="origSwatch" title="Original Colors"></div>
      <!-- Color Presets -->
      <div class="swatch-pill" style="background: #38bdf8;" data-color="#38bdf8" title="Electric Blue"></div>
      <div class="swatch-pill" style="background: #34d399;" data-color="#34d399" title="Emerald Mint"></div>
      <div class="swatch-pill" style="background: #fbbf24;" data-color="#fbbf24" title="Sunset Gold"></div>
      <div class="swatch-pill" style="background: #f43f5e;" data-color="#f43f5e" title="Crimson Coral"></div>
      <div class="swatch-pill" style="background: #c084fc;" data-color="#c084fc" title="Cyber Violet"></div>
      <div class="swatch-pill" style="background: #ffffff;" data-color="#ffffff" title="Monochrome White"></div>
      <!-- Custom Color Picker Wheel -->
      <div class="color-picker-wrapper" title="Pick Any Custom Color">
        <input type="color" id="customColorPicker" value="${initialFill || '#3b82f6'}">
      </div>
    </div>

    <div class="divider"></div>

    <!-- Download High-Res PNG Button -->
    <button id="downloadBtn" class="btn-download" title="Download High Quality Transparent PNG">
      <i class="ri-download-2-line"></i> <span>PNG</span>
    </button>

    <!-- Download Vector SVG Button -->
    <button id="downloadSvgBtn" class="btn-download btn-download-svg" title="Download Vector SVG File">
      <i class="ri-download-2-line"></i> <span>SVG</span>
    </button>
  </div>

  <!-- Hidden Working Canvas for Rasterization -->
  <canvas id="rasterCanvas" style="display: none;"></canvas>

  <script>
    (function () {
      let currentColorOverride = "";
      const currentScale = ${initialScale};

      const svgContainer = document.getElementById('svgContainer');
      const rasterCanvas = document.getElementById('rasterCanvas');
      const downloadBtn = document.getElementById('downloadBtn');
      const downloadSvgBtn = document.getElementById('downloadSvgBtn');
      const customColorPicker = document.getElementById('customColorPicker');
      const origSwatch = document.getElementById('origSwatch');

      // Ensure xmlns on DOM SVG
      const mainSvg = svgContainer.querySelector('svg');
      if (mainSvg && !mainSvg.getAttribute('xmlns')) {
        mainSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }

      // Cache original attributes for lossless reset
      function cacheOriginalAttributes() {
        const svg = svgContainer.querySelector('svg');
        if (!svg) return;
        svg.querySelectorAll('*').forEach(el => {
          if (!el.dataset.origFill && el.hasAttribute('fill')) {
            el.dataset.origFill = el.getAttribute('fill');
          }
          if (!el.dataset.origStroke && el.hasAttribute('stroke')) {
            el.dataset.origStroke = el.getAttribute('stroke');
          }
        });
      }
      cacheOriginalAttributes();

      // Apply Color Changes
      function applyColor(color) {
        currentColorOverride = color || '';
        const svg = svgContainer.querySelector('svg');
        if (!svg) return;

        svg.querySelectorAll('*').forEach(el => {
          if (currentColorOverride) {
            const origF = el.dataset.origFill;
            if (origF !== 'none' && !el.closest('defs')) {
              el.setAttribute('fill', currentColorOverride);
            }
            if (el.hasAttribute('stroke') && el.dataset.origStroke !== 'none' && !el.closest('defs')) {
              el.setAttribute('stroke', currentColorOverride);
            }
          } else {
            // Revert to original
            if (el.dataset.origFill !== undefined) el.setAttribute('fill', el.dataset.origFill);
            if (el.dataset.origStroke !== undefined) el.setAttribute('stroke', el.dataset.origStroke);
          }
        });

        rasterizeToPng();
      }

      // Convert SVG DOM into High-Resolution Transparent PNG Data URL
      function rasterizeToPng() {
        const svg = svgContainer.querySelector('svg');
        if (!svg) return;

        // Determine base viewBox or intrinsic dimensions
        let vbWidth = 500, vbHeight = 500;
        const vbAttr = svg.getAttribute('viewBox');
        if (vbAttr) {
          const parts = vbAttr.trim().split(/[\\s,]+/).map(Number);
          if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            vbWidth = parts[2];
            vbHeight = parts[3];
          }
        } else {
          vbWidth = parseFloat(svg.getAttribute('width')) || 500;
          vbHeight = parseFloat(svg.getAttribute('height')) || 500;
        }

        // Target high-res canvas dimensions (at least 1000px base for ultra crisp quality)
        const baseDimension = Math.max(vbWidth, vbHeight);
        const targetBase = baseDimension < 300 ? 400 : baseDimension;
        const exportWidth = Math.round((vbWidth / baseDimension) * targetBase * currentScale);
        const exportHeight = Math.round((vbHeight / baseDimension) * targetBase * currentScale);

        // Clone SVG and enforce standalone XML requirements
        const clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('width', exportWidth);
        clone.setAttribute('height', exportHeight);
        if (!clone.getAttribute('viewBox')) {
          clone.setAttribute('viewBox', '0 0 ' + vbWidth + ' ' + vbHeight);
        }

        const svgXml = new XMLSerializer().serializeToString(clone);
        const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
        const blobUrl = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          rasterCanvas.width = exportWidth;
          rasterCanvas.height = exportHeight;
          const ctx = rasterCanvas.getContext('2d');
          ctx.clearRect(0, 0, rasterCanvas.width, rasterCanvas.height);

          // Always Transparent Background
          ctx.drawImage(img, 0, 0, exportWidth, exportHeight);
          URL.revokeObjectURL(blobUrl);

          const pngDataUrl = rasterCanvas.toDataURL('image/png');

          // Notify Parent Studio Window
          window.parent.postMessage({
            type: 'svg_to_png_ready',
            pngDataUrl: pngDataUrl,
            width: exportWidth,
            height: exportHeight,
            currentColor: currentColorOverride
          }, '*');
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
        };
        img.src = blobUrl;
      }

      // Color Swatches Click Event
      document.querySelectorAll('.swatch-pill[data-color]').forEach(pill => {
        pill.addEventListener('click', () => {
          applyColor(pill.dataset.color);
        });
      });

      // Original Colors Click Event
      if (origSwatch) {
        origSwatch.addEventListener('click', () => {
          applyColor('');
        });
      }

      // Custom Color Picker Event
      if (customColorPicker) {
        customColorPicker.addEventListener('input', (e) => {
          applyColor(e.target.value);
        });
      }

      // Download High-Res Transparent PNG
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          rasterizeToPng();
          setTimeout(() => {
            const link = document.createElement('a');
            link.download = 'vector_transparent_' + rasterCanvas.width + 'x' + rasterCanvas.height + '.png';
            link.href = rasterCanvas.toDataURL('image/png');
            link.click();
          }, 60);
        });
      }

      // Download Clean Vector SVG File
      if (downloadSvgBtn) {
        downloadSvgBtn.addEventListener('click', () => {
          const svg = svgContainer.querySelector('svg');
          if (!svg) return;
          const clone = svg.cloneNode(true);
          if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          const svgXml = '<?xml version="1.0" encoding="UTF-8"?>\\n' + new XMLSerializer().serializeToString(clone);
          const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          const link = document.createElement('a');
          link.download = 'vector_' + Date.now() + '.svg';
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        });
      }

      // Initial Rasterize
      setTimeout(rasterizeToPng, 80);
    })();
  </script>
</body>
</html>`;
    };

})();
