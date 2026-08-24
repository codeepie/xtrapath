// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/zdog_handler.js

/**
 * Zdog (Pseudo-3D Vector Illustration & Animation Engine) Handler
 * Renders Zdog canvas/SVG 3D scenes inside an interactive iframe with full drag-to-rotate support.
 * 
 * @param {string} zdogCode The raw JavaScript code creating 3D shapes with Zdog.
 * @param {object|string} [options={}] Configuration options (e.g. background, zoom).
 * @returns {string} The full HTML document source for an iframe.
 */
window.renderZdog = function(zdogCode, options = {}) {
    let background = '#0a0d14';

    if (typeof options === 'object' && options !== null) {
        if (options.background) background = options.background;
    }

    const rawCode = (zdogCode || '').trim();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Zdog 3D Vector Illustration</title>
    
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
            background: ${background};
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            touch-action: none;
        }
        #zdog-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            background: ${background};
        }
        canvas, .zdog-canvas, svg, .zdog-svg {
            display: block;
            max-width: 100%;
            max-height: 100%;
            cursor: grab;
            object-fit: contain;
        }
        canvas:active, .zdog-canvas:active, svg:active, .zdog-svg:active {
            cursor: grabbing;
        }
        .zdog-error-box {
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
        .zdog-error-box strong {
            color: #ef4444;
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div id="zdog-container">
        <canvas id="zdog-canvas" class="zdog-canvas" width="600" height="600"></canvas>
        <svg id="zdog-svg" class="zdog-svg" width="600" height="600" style="display: none;"></svg>
    </div>

    <!-- Zdog Core Engine Library -->
    <script src="https://cdn.jsdelivr.net/npm/zdog@1/dist/zdog.dist.min.js"><\/script>

    <script>
        function showError(title, message) {
            const errDiv = document.createElement('div');
            errDiv.className = 'zdog-error-box';
            errDiv.innerHTML = '<strong>' + title + '</strong>' + 
                (message ? String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
            document.body.appendChild(errDiv);
        }

        window.onerror = function(msg, url, line, col, error) {
            showError("Zdog Runtime Error", (msg || error) + (line ? " (Line " + line + ")" : ""));
        };

        const canvas = document.getElementById('zdog-canvas');
        const svg = document.getElementById('zdog-svg');

        // Toggle elements if user code specifies SVG target
        const userCode = ${JSON.stringify(rawCode)};
        if (userCode.includes('.zdog-svg') || userCode.includes('#zdog-svg') || userCode.includes("'svg'") || userCode.includes('"svg"')) {
            if (canvas) canvas.style.display = 'none';
            if (svg) svg.style.display = 'block';
        }

        try {
            ${rawCode ? rawCode : `document.getElementById('zdog-container').innerHTML = '<div style="color: #71717a; font-size: 14px;">Write Zdog JavaScript code to render pseudo-3D vector illustrations...</div>';`}
        } catch (err) {
            console.error("Zdog Execution Error:", err);
            showError("Zdog Execution Error:", err.stack || err.message || String(err));
        }

        // Auto re-render on resize if illo exists globally
        window.addEventListener('resize', () => {
            if (window.illo && typeof window.illo.updateRenderGraph === 'function') {
                window.illo.updateRenderGraph();
            }
        });
    <\/script>
</body>
</html>`;
};
