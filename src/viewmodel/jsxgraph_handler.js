// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/jsxgraph_handler.js

/**
 * JSXGraph (Interactive Dynamic Geometry, Calculus & Mathematics) Handler
 * Renders JSXGraph JavaScript code inside an interactive iframe.
 * 
 * @param {string} jxgCode The raw JavaScript code creating geometry, graphs, or calculus with JSXGraph.
 * @param {object|string} [options={}] Configuration options (e.g. background).
 * @returns {string} The full HTML document source for an iframe.
 */
window.renderJSXGraph = function(jxgCode, options = {}) {
    let background = '#0a0d14';

    if (typeof options === 'object' && options !== null) {
        if (options.background) background = options.background;
    }

    const rawCode = (jxgCode || '').trim();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>JSXGraph Interactive Math</title>
    
    <!-- JSXGraph Core CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/jsxgraph@1.8.0/distrib/jsxgraph.css">
    
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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            overflow: hidden;
            position: relative;
        }
        #jxgbox {
            width: 100vw !important;
            height: 100vh !important;
            background: ${background} !important;
            border: none !important;
            border-radius: 0 !important;
            outline: none !important;
            position: absolute;
            top: 0;
            left: 0;
        }
        /* Style JSXGraph SVG elements for sleek dark mode */
        .jxgbox svg {
            background-color: transparent !important;
        }
        .jxgbox text {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        .jxg-error-box {
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
        .jxg-error-box strong {
            color: #ef4444;
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div id="jxgbox" class="jxgbox"></div>

    <!-- JSXGraph Core JS Library -->
    <script src="https://cdn.jsdelivr.net/npm/jsxgraph@1.8.0/distrib/jsxgraphcore.js"><\/script>

    <script>
        function showError(title, message) {
            const errDiv = document.createElement('div');
            errDiv.className = 'jxg-error-box';
            errDiv.innerHTML = '<strong>' + title + '</strong>' + 
                (message ? String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
            document.body.appendChild(errDiv);
        }

        window.onerror = function(msg, url, line, col, error) {
            showError("JSXGraph Runtime Error", (msg || error) + (line ? " (Line " + line + ")" : ""));
        };

        // Dark mode configuration defaults
        if (window.JXG) {
            JXG.Options.board.showCopyright = false;
            JXG.Options.axis.strokeColor = '#52525b';
            JXG.Options.axis.highlightStrokeColor = '#a1a1aa';
            JXG.Options.axis.label = { color: '#a1a1aa', fontSize: 12 };
            JXG.Options.grid.strokeColor = '#27272a';
            JXG.Options.grid.strokeOpacity = 0.5;
        }

        try {
            ${rawCode ? rawCode : `document.getElementById('jxgbox').innerHTML = '<div style="color: #71717a; font-size: 14px; display:flex; align-items:center; justify-content:center; height:100%;">Write JSXGraph code to render interactive geometry & math...</div>';`}
        } catch (err) {
            console.error("JSXGraph Execution Error:", err);
            showError("JSXGraph Execution Error:", err.stack || err.message || String(err));
        }

        // Auto resize handler
        window.addEventListener('resize', () => {
            if (window.board && typeof window.board.resizeContainer === 'function') {
                window.board.resizeContainer(window.innerWidth, window.innerHeight);
            }
        });
    <\/script>
</body>
</html>`;
};
