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

    /**
     * 4 Premium Default AI 3D Model Templates for SVG to 3D Engine
     */
    const svg3dTemplates = {
        cyber_mech_falcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <!-- Primary Swept Wings & Armor Core -->
  <path d="M 250 45 L 340 135 L 470 110 L 410 200 L 460 215 L 390 290 L 430 310 L 330 365 L 295 320 L 295 435 L 250 470 L 205 435 L 205 320 L 170 365 L 70 310 L 110 290 L 40 215 L 90 200 L 30 110 L 160 135 Z" fill="#2563eb"/>
  <!-- Secondary Interior Aerodynamic Slats -->
  <path d="M 250 110 L 320 180 L 400 160 L 350 225 L 380 240 L 320 295 L 290 265 L 290 350 L 250 380 L 210 350 L 210 265 L 180 295 L 120 240 L 150 225 L 100 160 L 180 180 Z" fill="#60a5fa"/>
  <!-- Central Reactor Core & Hexagon Portal -->
  <path d="M 250 160 L 290 210 L 290 270 L 250 320 L 210 270 L 210 210 Z M 250 195 L 225 225 L 225 255 L 250 285 L 275 255 L 275 225 Z" fill="#93c5fd"/>
  <!-- Core Singularity Jewel -->
  <polygon points="250,220 265,240 250,260 235,240" fill="#ffffff"/>
</svg>`,

        quantum_hypercube: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <!-- Outer Beveled Octagon Ring with Hollow Voids -->
  <path d="M 250 35 L 395 95 L 455 240 L 395 385 L 250 445 L 105 385 L 45 240 L 105 95 Z M 250 75 L 135 125 L 85 240 L 135 355 L 250 405 L 365 355 L 415 240 L 365 125 Z" fill="#8b5cf6"/>
  <!-- 4D Hypercube Rotated Diamond Lattice -->
  <path d="M 250 90 L 400 240 L 250 390 L 100 240 Z M 250 135 L 145 240 L 250 345 L 355 240 Z" fill="#06b6d4"/>
  <!-- Concentric Inner Stargate Frame -->
  <path d="M 250 150 L 320 180 L 350 250 L 320 320 L 250 350 L 180 320 L 150 250 L 180 180 Z M 250 185 L 195 205 L 175 250 L 195 295 L 250 315 L 305 295 L 325 250 L 305 205 Z" fill="#ec4899"/>
  <!-- Central Stellated Octagram Energy Core -->
  <polygon points="250,205 262,238 295,250 262,262 250,295 238,262 205,250 238,238" fill="#ffffff"/>
</svg>`,

        chronos_tourbillon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <!-- 12-Tooth Planetary Cycloid Gear Rim with Internal Void -->
  <path d="M 420.0 250.0 L 457.7 280.7 L 450.4 312.8 L 403.1 324.0 L 397.2 335.0 L 414.6 380.4 L 392.1 404.6 L 345.6 390.6 L 335.0 397.2 L 324.0 444.6 L 292.8 457.7 L 260.7 420.0 L 250.0 420.0 L 219.3 457.7 L 187.2 444.6 L 176.0 397.2 L 165.0 390.6 L 118.5 404.6 L 96.0 380.4 L 113.4 335.0 L 107.5 324.0 L 60.2 312.8 L 52.9 280.7 L 90.6 250.0 L 90.6 239.3 L 52.9 208.6 L 60.2 176.5 L 107.5 165.3 L 113.4 154.3 L 96.0 108.9 L 118.5 84.7 L 165.0 98.7 L 176.0 92.1 L 187.2 44.7 L 219.3 31.6 L 250.0 69.3 L 260.7 69.3 L 292.8 31.6 L 324.0 44.7 L 335.0 92.1 L 345.6 98.7 L 392.1 84.7 L 414.6 108.9 L 397.2 154.3 L 403.1 165.3 L 450.4 176.5 L 457.7 208.6 L 420.0 239.3 Z M 250 120 A 130 130 0 1 0 250 380 A 130 130 0 1 0 250 120 Z" fill="#10b981"/>
  <!-- Tourbillon Tri-Spoke Skeleton Bridge -->
  <path d="M 250 110 L 265 190 L 360 280 L 335 305 L 250 265 L 165 305 L 140 280 L 235 190 Z" fill="#34d399"/>
  <!-- Balance Wheel Weight Apertures -->
  <circle cx="250" cy="165" r="16" fill="#064e3b"/>
  <circle cx="315" cy="275" r="16" fill="#064e3b"/>
  <circle cx="185" cy="275" r="16" fill="#064e3b"/>
  <!-- Central Chronometer Hex Arbor Axle -->
  <path d="M 250 200 L 285 220 L 285 260 L 250 280 L 215 260 L 215 220 Z M 250 225 L 230 237 L 230 253 L 250 265 L 270 253 L 270 237 Z" fill="#a7f3d0"/>
  <circle cx="250" cy="240" r="7" fill="#ffffff"/>
</svg>`,

        sacred_golden_helix: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <!-- Tier 1: Majestic Outer Fibonacci Coil -->
  <path d="M 250 40 C 370 40 460 130 460 250 C 460 360 375 450 260 450 C 150 450 65 365 65 255 C 65 160 140 85 235 85 C 315 85 380 150 380 230 C 380 295 330 350 265 350 C 210 350 165 305 165 250 C 165 205 200 170 245 170 C 280 170 310 200 310 235 C 310 265 285 290 255 290 C 230 290 210 270 210 245 L 225 245 C 225 260 238 272 253 272 C 270 272 288 255 288 238 C 288 212 268 188 242 188 C 210 188 182 216 182 248 C 182 292 218 328 262 328 C 315 328 358 285 358 232 C 358 165 305 105 238 105 C 155 105 88 172 88 255 C 88 350 165 428 260 428 C 362 428 438 352 438 250 C 438 142 358 62 250 62 Z" fill="#f59e0b"/>
  <!-- Tier 2: Radial Harmonic Lattice Rays -->
  <path d="M 250 85 L 250 170 M 380 230 L 310 235 M 265 350 L 255 290 M 165 250 L 210 245 M 345 125 L 290 195 M 345 315 L 285 270 M 190 325 L 230 275 M 180 165 L 225 205" stroke="#fbbf24" stroke-width="12" stroke-linecap="round" fill="none"/>
  <!-- Tier 3: Biomimetic Chamber Spores -->
  <circle cx="250" cy="120" r="16" fill="#fef3c7"/>
  <circle cx="345" cy="180" r="18" fill="#fef3c7"/>
  <circle cx="345" cy="280" r="17" fill="#fef3c7"/>
  <circle cx="280" cy="330" r="15" fill="#fef3c7"/>
  <circle cx="195" cy="285" r="13" fill="#fef3c7"/>
  <circle cx="190" cy="205" r="11" fill="#fef3c7"/>
  <circle cx="250" cy="245" r="10" fill="#ffffff"/>
</svg>`
    };

    window.svg3dTemplates = svg3dTemplates;
    window.defaultSvg3dCode = svg3dTemplates.cyber_mech_falcon;

})();
