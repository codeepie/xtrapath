// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/fabric_handler.js

/**
 * Fabric.js (High-Performance Interactive Thumbnail & Vector Graphic Engine) Handler
 * Renders Fabric.js canvas code inside an interactive iframe with full transform,
 * typography, and high-DPI export support.
 * 
 * @param {string} fabricCode The raw JavaScript code creating/styling objects on the Fabric canvas.
 * @param {object|string} [options={}] Configuration options (width, height, background).
 * @returns {string} The full HTML document source for an iframe.
 */
window.renderFabric = function(fabricCode, options = {}) {
    let background = '#09090b';
    let width = 1280;
    let height = 720;

    if (typeof options === 'object' && options !== null) {
        if (options.background) background = options.background;
        if (options.width) width = parseInt(options.width, 10) || 1280;
        if (options.height) height = parseInt(options.height, 10) || 720;
    }

    const rawCode = (fabricCode || '').trim();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Thumbnail Studio Canvas</title>
    
    <!-- Google Fonts for High-Converting Thumbnails -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&family=Outfit:wght@600;800;900&family=Montserrat:wght@800;900&display=swap" rel="stylesheet">

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
            background: #000000;
            color: #ffffff;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            touch-action: none;
        }
        #canvas-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            background: radial-gradient(circle at center, #18181b 0%, #09090b 100%);
            padding: 16px;
        }
        .canvas-frame {
            position: relative;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            overflow: hidden;
            background-color: ${background};
        }
        /* Style Fabric controls for sleek look */
        .fabric-error-box {
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
        .fabric-error-box strong {
            color: #ef4444;
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div id="canvas-container">
        <div id="canvas-frame" class="canvas-frame">
            <canvas id="fabric-canvas"></canvas>
        </div>
    </div>

    <!-- Fabric.js Core Library (v5.3.1) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"><\/script>

    <script>
        function showError(title, message) {
            const errDiv = document.createElement('div');
            errDiv.className = 'fabric-error-box';
            errDiv.innerHTML = '<strong>' + title + '</strong>' + 
                (message ? String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
            document.body.appendChild(errDiv);
        }

        window.onerror = function(msg, url, line, col, error) {
            showError("Fabric.js Runtime Error", (msg || error) + (line ? " (Line " + line + ")" : ""));
        };

        const logicalWidth = ${width};
        const logicalHeight = ${height};

        // Initialize Fabric Interactive Canvas
        const canvas = new fabric.Canvas('fabric-canvas', {
            width: logicalWidth,
            height: logicalHeight,
            backgroundColor: ${JSON.stringify(background)},
            preserveObjectStacking: true,
            selection: true,
            fireRightClick: true,
            stopContextMenu: true
        });

        // Global references
        window.canvas = canvas;
        window.logicalWidth = logicalWidth;
        window.logicalHeight = logicalHeight;

        // Customise Fabric transform handles for high visibility
        fabric.Object.prototype.transparentCorners = false;
        fabric.Object.prototype.cornerColor = '#3b82f6';
        fabric.Object.prototype.cornerStrokeColor = '#ffffff';
        fabric.Object.prototype.borderColor = '#60a5fa';
        fabric.Object.prototype.cornerSize = 10;
        fabric.Object.prototype.cornerStyle = 'circle';
        fabric.Object.prototype.padding = 6;

        // Auto-fit responsive zoom while preserving logical resolution
        function resizeToFit() {
            const container = document.getElementById('canvas-container');
            if (!container) return;
            const availW = container.clientWidth - 32;
            const availH = container.clientHeight - 32;
            if (availW <= 0 || availH <= 0) return;

            const scale = Math.min(availW / logicalWidth, availH / logicalHeight, 1);
            canvas.setDimensions({
                width: Math.round(logicalWidth * scale),
                height: Math.round(logicalHeight * scale)
            });
            canvas.setZoom(scale);
            canvas.renderAll();
        }

        window.addEventListener('resize', resizeToFit);

        // Export helper that always exports at full 1:1 logical resolution
        window.getExportDataUrl = function(format = 'png', quality = 0.95) {
            const currentZoom = canvas.getZoom() || 1;
            return canvas.toDataURL({
                format: format,
                quality: quality,
                multiplier: 1 / currentZoom
            });
        };

        // Built-in Helper Functions for Quick Thumbnail & Banner Creation
        window.helpers = {
            // Rounded badge / pill
            createPill: function(text, left, top, bgColor = '#6366f1', textColor = '#ffffff') {
                const padX = 22;
                const padY = 9;
                const txt = new fabric.Text(text, {
                    fontSize: 18,
                    fontWeight: '800',
                    fontFamily: 'Inter, sans-serif',
                    fill: textColor,
                    originX: 'center',
                    originY: 'center'
                });
                const w = (txt.width || 100) + padX * 2;
                const h = (txt.height || 22) + padY * 2;
                txt.set({ left: w / 2, top: h / 2 });

                const rect = new fabric.Rect({
                    width: w,
                    height: h,
                    rx: h / 2,
                    ry: h / 2,
                    fill: bgColor,
                    originX: 'left',
                    originY: 'top',
                    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 10, offsetX: 0, offsetY: 4 })
                });

                return new fabric.Group([rect, txt], { left: left, top: top });
            },

            // Preset Category & Status Stickers
            createSticker: function(type = 'formula', left = 80, top = 80, customText = '') {
                const stickers = {
                    formula: { text: customText || '📐 MATH & FORMULA', bg: '#2563eb', color: '#ffffff' },
                    simulation: { text: customText || '🚀 3D SIMULATION', bg: '#7c3aed', color: '#ffffff' },
                    interactive: { text: customText || '⚡ INTERACTIVE CODE', bg: '#059669', color: '#ffffff' },
                    pro: { text: customText || '👑 PRO ACCESS', bg: '#db2777', color: '#ffffff' },
                    course: { text: customText || '📘 COMPLETE MASTERCLASS', bg: '#d97706', color: '#ffffff' },
                    article: { text: customText || '📰 FEATURED ARTICLE', bg: '#4f46e5', color: '#ffffff' },
                    verified: { text: customText || '✓ VERIFIED SCIENTIFIC', bg: '#0891b2', color: '#ffffff' },
                    physics: { text: customText || '⚛️ QUANTUM PHYSICS', bg: '#9333ea', color: '#ffffff' }
                };
                const conf = stickers[type] || stickers.formula;
                return window.helpers.createPill(conf.text, left, top, conf.bg, conf.color);
            },

            // Glowing Ambient Light Orb
            createGlowOrb: function(left, top, radius, color = '#6366f1', blur = 90) {
                return new fabric.Circle({
                    left: left,
                    top: top,
                    radius: radius,
                    fill: color,
                    opacity: 0.35,
                    selectable: false,
                    evented: false,
                    shadow: new fabric.Shadow({
                        color: color,
                        blur: blur,
                        offsetX: 0,
                        offsetY: 0
                    })
                });
            },

            // Linear Gradient Generator
            createGradient: function(coords, colorStops) {
                return new fabric.Gradient({
                    type: 'linear',
                    gradientUnits: 'pixels',
                    coords: coords || { x1: 0, y1: 0, x2: logicalWidth, y2: logicalHeight },
                    colorStops: colorStops || [
                        { offset: 0, color: '#09090b' },
                        { offset: 1, color: '#1e1b4b' }
                    ]
                });
            },

            // Modern Glassmorphism Card Overlay
            createGlassCard: function(left = 80, top = 340, width = 500, height = 220, title = 'Interactive Model', subtitle = 'Explore live parameters with high-precision physics simulation') {
                const bgRect = new fabric.Rect({
                    width: width,
                    height: height,
                    rx: 16,
                    ry: 16,
                    fill: 'rgba(255, 255, 255, 0.05)',
                    stroke: 'rgba(255, 255, 255, 0.15)',
                    strokeWidth: 1.5,
                    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 25, offsetX: 0, offsetY: 10 })
                });

                const tText = new fabric.Text(title, {
                    left: 28,
                    top: 28,
                    fontSize: 26,
                    fontWeight: '800',
                    fontFamily: 'Outfit, sans-serif',
                    fill: '#ffffff'
                });

                const sText = new fabric.Textbox(subtitle, {
                    left: 28,
                    top: 72,
                    width: width - 56,
                    fontSize: 16,
                    lineHeight: 1.3,
                    fontWeight: '400',
                    fontFamily: 'Inter, sans-serif',
                    fill: '#a1a1aa'
                });

                return new fabric.Group([bgRect, tText, sText], { left: left, top: top });
            },

            // Gradient Accent Bar / Divider Line
            createAccentBar: function(left = 80, top = 150, width = 120, height = 6, color1 = '#3b82f6', color2 = '#8b5cf6') {
                const bar = new fabric.Rect({
                    left: left,
                    top: top,
                    width: width,
                    height: height,
                    rx: height / 2,
                    ry: height / 2,
                    fill: new fabric.Gradient({
                        type: 'linear',
                        coords: { x1: 0, y1: 0, x2: width, y2: 0 },
                        colorStops: [{ offset: 0, color: color1 }, { offset: 1, color: color2 }]
                    })
                });
                return bar;
            },

            // Scientific Blueprint Coordinate Grid Overlay
            createGridPattern: function(gridSpacing = 50, strokeColor = 'rgba(255, 255, 255, 0.04)') {
                const lines = [];
                for (let x = 0; x < logicalWidth; x += gridSpacing) {
                    lines.push(new fabric.Line([x, 0, x, logicalHeight], { stroke: strokeColor, strokeWidth: 1, selectable: false, evented: false }));
                }
                for (let y = 0; y < logicalHeight; y += gridSpacing) {
                    lines.push(new fabric.Line([0, y, logicalWidth, y], { stroke: strokeColor, strokeWidth: 1, selectable: false, evented: false }));
                }
                return new fabric.Group(lines, { left: 0, top: 0, selectable: false, evented: false });
            },

            // Metric Stat Badge
            createMetricBadge: function(number = '99.8%', label = 'ACCURACY', left = 80, top = 460, accentColor = '#38bdf8') {
                const bg = new fabric.Rect({
                    width: 180,
                    height: 90,
                    rx: 12,
                    ry: 12,
                    fill: 'rgba(0, 0, 0, 0.6)',
                    stroke: 'rgba(255, 255, 255, 0.1)',
                    strokeWidth: 1
                });
                const numText = new fabric.Text(number, {
                    left: 20,
                    top: 14,
                    fontSize: 32,
                    fontWeight: '900',
                    fontFamily: 'Outfit, sans-serif',
                    fill: accentColor
                });
                const lblText = new fabric.Text(label, {
                    left: 20,
                    top: 56,
                    fontSize: 12,
                    fontWeight: '700',
                    fontFamily: 'Inter, sans-serif',
                    fill: '#a1a1aa'
                });
                return new fabric.Group([bg, numText, lblText], { left: left, top: top });
            }
        };

        // Execute User Script
        try {
            ${rawCode ? rawCode : `
                const bg = new fabric.Rect({
                    left: 0, top: 0, width: logicalWidth, height: logicalHeight,
                    selectable: false,
                    fill: helpers.createGradient(null, [
                        { offset: 0, color: '#09090b' },
                        { offset: 0.6, color: '#1e1b4b' },
                        { offset: 1, color: '#4c0519' }
                    ])
                });
                canvas.add(bg);
                const title = new fabric.Textbox('THUMBNAIL STUDIO', {
                    left: 80, top: 180, width: 900,
                    fontSize: 84, fontWeight: '900',
                    fontFamily: 'Outfit, sans-serif',
                    fill: '#ffffff', stroke: '#000000', strokeWidth: 4,
                    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.9)', blur: 20, offsetX: 6, offsetY: 6 })
                });
                canvas.add(title);
                canvas.renderAll();
            `}
            setTimeout(resizeToFit, 60);
        } catch (err) {
            console.error("Fabric Execution Error:", err);
            showError("Fabric Execution Error:", err.stack || err.message || String(err));
        }
    <\/script>
</body>
</html>`;
};
