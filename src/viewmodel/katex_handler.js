// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/katex_handler.js

/**
 * Renders LaTeX / KaTeX code into an iframe-compatible HTML string.
 * @param {string} latexCode The raw LaTeX / Math code.
 * @param {object|string} [options={}] Configuration options or fontSize string.
 * @returns {string} The full HTML document source for an iframe.
 */
window.renderKatex = function(latexCode, options = {}) {
    let fontSize = '1.8em';
    let textColor = '#ffffff';

    if (typeof options === 'string') {
        fontSize = options;
    } else if (typeof options === 'object' && options !== null) {
        if (options.fontSize) fontSize = options.fontSize;
        if (options.color || options.textColor) textColor = options.color || options.textColor;
    }

    const jsonCode = JSON.stringify(latexCode || '');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>KaTeX Equation Preview</title>
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
            background: #0a0d14;
            color: ${textColor};
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #katex-wrapper {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            overflow: hidden;
            position: relative;
        }
        #katex-container {
            max-width: 95vw;
            max-height: 90vh;
            background: #18181b;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 14px;
            padding: 20px 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: ${fontSize};
            color: ${textColor};
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            transition: transform 0.15s ease-out;
            transform-origin: center center;
            word-break: break-word;
            overflow-wrap: anywhere;
            box-sizing: border-box;
        }
        .katex-display {
            margin: 0 !important;
            padding: 4px 0;
            max-width: 100% !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
        }
        .katex {
            font-size: 1em !important;
            color: inherit;
            white-space: normal;
        }
        /* Force-hide MathML fallback so it doesn't duplicate or overflow */
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
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            padding: 14px 18px;
            font-size: 13px;
            font-family: monospace;
            white-space: pre-wrap;
            max-width: 90%;
            line-height: 1.4;
            word-break: break-word;
        }
        /* Custom scrollbars */
        #katex-wrapper::-webkit-scrollbar,
        #katex-container::-webkit-scrollbar,
        .katex-display::-webkit-scrollbar {
            width: 4px;
            height: 4px;
        }
        #katex-wrapper::-webkit-scrollbar-thumb,
        #katex-container::-webkit-scrollbar-thumb,
        .katex-display::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
        }
    </style>
</head>
<body>
    <div id="katex-wrapper">
        <div id="katex-container"></div>
    </div>

    <!-- KaTeX Core and Extensions -->
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/mhchem.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"><\/script>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const rawCode = (${jsonCode}).trim();
            const container = document.getElementById('katex-container');
            const wrapper = document.getElementById('katex-wrapper');

            function fitToViewport() {
                if (!container || !wrapper) return;
                container.style.transform = 'none';

                const availW = wrapper.clientWidth - 32;
                const availH = wrapper.clientHeight - 32;
                const naturalW = container.scrollWidth;
                const naturalH = container.scrollHeight;

                if (availW > 0 && availH > 0 && (naturalW > availW || naturalH > availH)) {
                    const scaleX = availW / naturalW;
                    const scaleY = availH / naturalH;
                    const scale = Math.min(scaleX, scaleY, 0.98);
                    container.style.transform = 'scale(' + scale + ')';
                }
            }

            if (!rawCode) {
                container.innerHTML = '<span style="color: #71717a; font-size: 0.7em;">Type LaTeX math equation to render...</span>';
                return;
            }

            try {
                if (rawCode.includes('$$') || (rawCode.includes('$') && !rawCode.startsWith('\\begin'))) {
                    container.innerHTML = rawCode.replace(/\\n/g, '<br/>');
                    renderMathInElement(container, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false },
                            { left: '\\\\[', right: '\\\\]', display: true },
                            { left: '\\\\(', right: '\\\\)', display: false }
                        ],
                        output: 'html',
                        throwOnError: false
                    });
                } else {
                    katex.render(rawCode, container, {
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
                    katex.render(rawCode, container, {
                        displayMode: true,
                        output: 'html',
                        throwOnError: false,
                        strict: false,
                        trust: true
                    });
                } catch (fallbackErr) {
                    container.innerHTML = '<div class="katex-error-box"><strong>KaTeX Error:</strong>\\n' + (err.message || err) + '</div>';
                }
            }

            // Adjust scaling so it fits perfectly on all screen sizes
            fitToViewport();
            window.addEventListener('resize', fitToViewport);
            setTimeout(fitToViewport, 60);
            setTimeout(fitToViewport, 250);
        });
    <\/script>
</body>
</html>`;
};
