// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/mermaid_handler.js

/**
 * Renders Mermaid.js code into an iframe-compatible HTML string.
 * @param {string} mermaidCode The raw Mermaid diagram code.
 * @param {number|string} [width=800] The width for the diagram's container.
 * @param {number|string} [height=600] The height for the diagram's container.
 * @returns {string} The full HTML document source for an iframe.
 */
window.renderMermaid = function(mermaidCode, width = 800, height = 600) {
    // Escape backticks and other characters that could break the template literal
    const escapedCode = mermaidCode.replace(/`/g, '\\`');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { 
                    margin: 0; 
                    background: #0a0d14; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    height: 100vh;
                    color: white;
                    font-family: sans-serif;
                    overflow: hidden; /* Prevent body scrollbars if container is large */
                }
                #mermaid-container {
                    /* Use the provided width and height for the container */
                    width: ${width}px;
                    height: ${height}px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #1e1e23; /* A slightly lighter background to see the container bounds */
                    border-radius: 8px;
                    padding: 15px;
                    box-sizing: border-box;
                }
                /* This ensures the generated SVG scales down to fit the container, preserving aspect ratio */
                #mermaid-container > svg {
                    max-width: 100%;
                    max-height: 100%;
                }
            </style>
        </head>
        <body>
            <div id="mermaid-container"></div>
            <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"><\/script>
            <script>
                document.addEventListener('DOMContentLoaded', function () {
                    try {
                        mermaid.initialize({
                            startOnLoad: false, // We will render manually
                            theme: 'dark',
                            securityLevel: 'loose',
                            themeVariables: {
                                'background': '#1e1e23', // Match container background
                                'primaryColor': '#1e1e23',
                                'primaryTextColor': '#e4e4e7',
                                'primaryBorderColor': '#8b5cf6',
                                'lineColor': '#a1a1aa',
                                'secondaryColor': '#3b82f6',
                                'tertiaryColor': '#1e1e23'
                            }
                        });

                        const code = \`${escapedCode}\`;
                        const container = document.getElementById('mermaid-container');
                        
                        mermaid.render('mermaid-svg', code).then(({ svg, bindFunctions }) => {
                            container.innerHTML = svg;
                            if (bindFunctions) {
                                bindFunctions(container);
                            }
                        }).catch(e => {
                            container.style.cssText = 'color:red; padding:20px; white-space:pre-wrap; background: #0a0d14;';
                            container.textContent = 'Mermaid Render Error:\\n' + e.message;
                        });

                    } catch (e) {
                        const container = document.getElementById('mermaid-container');
                        container.style.cssText = 'color:red; padding:20px; white-space:pre-wrap; background: #0a0d14;';
                        container.textContent = 'Mermaid Initialization Error:\\n' + e.message;
                    }
                });
            <\/script>
        </body>
        </html>
    `;
};