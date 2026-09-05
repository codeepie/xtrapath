/**
 * XtraAnim Universal Engine Manager (engine_manager.js)
 * -----------------------------------------------------------
 * Coordinates and renders all 10+ interactive graphical & animation engines:
 * (Anime.js, Rough.js, Two.js, Zdog, KaTeX, JSXGraph, Mermaid, Fabric, SVG, TikZ, p5.js).
 * 
 * Features:
 * - Unified dispatch & detection across formats
 * - Secure iframe sandboxing (sandbox="allow-scripts")
 * - Safe source parsing (JSON string or object)
 * - Extensible engine registry (EngineManager.register)
 * - 100% backward-compatible fallback handling
 */

(function (window) {
    'use strict';

    const registry = new Map();

    /**
     * Safely parse post.source if it's stored as a JSON string
     */
    function normalizeSource(source) {
        if (!source) return {};
        if (typeof source === 'object') return source;
        if (typeof source === 'string') {
            try {
                return JSON.parse(source);
            } catch (_) {
                return {};
            }
        }
        return {};
    }

    /**
     * Detect engine name from post data
     */
    function detectEngine(post) {
        if (!post) return null;
        const src = normalizeSource(post.source);
        if (src.engine) return String(src.engine).toLowerCase().trim();
        if (post.format) return String(post.format).toLowerCase().trim();
        if (post.engine) return String(post.engine).toLowerCase().trim();
        return null;
    }

    /**
     * Escape HTML special characters for safe card fallback rendering
     */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    const EngineManager = {
        /**
         * Register a custom or future rendering engine driver
         * @param {string} engineName - e.g. 'anime', 'three', 'lottie'
         * @param {Function} rendererFn - (code, source, options) => HTML srcdoc string
         */
        register(engineName, rendererFn) {
            if (typeof engineName === 'string' && typeof rendererFn === 'function') {
                registry.set(engineName.toLowerCase().trim(), rendererFn);
            }
        },

        /**
         * Check if an engine has a registered driver or global handler
         */
        hasEngine(engineName) {
            if (!engineName) return false;
            const name = engineName.toLowerCase().trim();
            return registry.has(name);
        },

        /**
         * Parse post source safely
         */
        parseSource(post) {
            return normalizeSource(post?.source);
        },

        /**
         * Detect engine for a given post
         */
        getEngine(post) {
            return detectEngine(post);
        },

        /**
         * Render post source into an HTML srcdoc document string
         */
        renderHtml(post, options = {}) {
            if (!post) return null;
            const src = normalizeSource(post.source);
            const engine = detectEngine(post);
            const code = src.code || post.code;

            if (!code && !src.svg) return null;

            const opt = {
                width: options.width || 1280,
                height: options.height || 720,
                background: options.background || src.background || src.backgroundColor || '#090b10',
                ...options
            };

            // 1. Check custom registry first
            if (engine && registry.has(engine)) {
                try {
                    return registry.get(engine)(code, src, opt);
                } catch (e) {
                    console.error(`[EngineManager] Registry error rendering '${engine}':`, e);
                }
            }

            // 2. Built-in Engine Drivers
            try {
                if ((engine === 'rough') && code && typeof window.renderRough === 'function') {
                    return window.renderRough(code, { width: opt.width, height: opt.height, background: opt.background || '#0e1117' });
                }

                if ((engine === 'anime') && code && typeof window.renderAnime === 'function') {
                    return window.renderAnime(code, { width: opt.width, height: opt.height, background: opt.background || '#080a10' });
                }

                if ((engine === 'two') && code && typeof window.renderTwo === 'function') {
                    return window.renderTwo(code, { width: opt.width, height: opt.height, background: opt.background || '#090b10' });
                }

                if (engine === 'zdog' && code && typeof window.renderZdog === 'function') {
                    return window.renderZdog(code, { background: opt.background || '#0a0d14' });
                }

                if (engine === 'katex' && code && typeof window.renderKatex === 'function') {
                    return window.renderKatex(code, { fontSize: src.fontSize || options.fontSize || '1.8em', color: src.color || options.color || '#ffffff' });
                }

                if (engine === 'jsxgraph' && code && typeof window.renderJSXGraph === 'function') {
                    return window.renderJSXGraph(code, { background: opt.background || '#0a0d14' });
                }

                if (engine === 'mermaid' && code && typeof window.renderMermaid === 'function') {
                    return window.renderMermaid(code, src.width || opt.width, src.height || opt.height);
                }

                if ((engine === 'tikz') && code && typeof window.renderTikz === 'function') {
                    return window.renderTikz(code);
                }

                if (engine === 'svg_to_png' && code && typeof window.renderSvgToPng === 'function') {
                    return window.renderSvgToPng(code, {
                        fillColor: src.fillColor,
                        strokeColor: src.strokeColor,
                        backgroundColor: src.backgroundColor || 'transparent',
                        isFeed: options.isFeed !== undefined ? options.isFeed : true
                    });
                }

                if (engine === 'svg_to_3d' && code && typeof window.createSVG3DViewerIframeContent === 'function') {
                    const svgCode = typeof code === 'string' ? code : JSON.stringify(code);
                    return window.createSVG3DViewerIframeContent(svgCode, src.color || '#3b82f6', options.isFeed || false);
                }

                if (engine === 'fabric' && code && typeof window.renderFabric === 'function') {
                    return window.renderFabric(code, { background: opt.background });
                }

                if (engine === 'p5' && code && typeof window.renderP5PostContent === 'function') {
                    return window.renderP5PostContent(code, opt.width, opt.height);
                }
            } catch (err) {
                console.error(`[EngineManager] Error rendering engine '${engine}':`, err);
            }

            return null;
        },

        /**
         * Create a configured, securely sandboxed iframe element
         */
        createIframe(post, options = {}) {
            const html = this.renderHtml(post, options);
            if (!html) return null;

            const iframe = document.createElement('iframe');
            iframe.srcdoc = html;
            
            // Security: isolate script execution context
            iframe.setAttribute('sandbox', options.sandbox || 'allow-scripts');
            iframe.setAttribute('loading', 'lazy');
            
            const isInteractive = options.interactive === true;
            const bg = options.background || normalizeSource(post.source).background || '#0a0d14';
            iframe.style.cssText = `width: 100%; height: 100%; min-height: ${options.minHeight || '100%'}; border: none; background: ${bg}; ${isInteractive ? '' : 'pointer-events: none;'}`;

            return iframe;
        },

        /**
         * Render a post directly into a container element or replace an existing media element
         */
        renderInto(containerOrMediaEl, post, options = {}) {
            if (!containerOrMediaEl) return false;

            const iframe = this.createIframe(post, options);
            if (iframe) {
                if (containerOrMediaEl.tagName === 'IMG' || containerOrMediaEl.tagName === 'VIDEO') {
                    containerOrMediaEl.replaceWith(iframe);
                } else {
                    containerOrMediaEl.innerHTML = '';
                    containerOrMediaEl.appendChild(iframe);
                }
                return true;
            }
            return false;
        },

        /**
         * 100% Backward-compatible fallback handler for broken media links in feeds & cards
         */
        handleMediaFallback(mediaEl, postId, format, iconClass, title) {
            if (!mediaEl || !mediaEl.parentNode) return;
            mediaEl.onerror = null;

            // Try interactive recovery from window._allRenderedPosts
            const post = (window._allRenderedPosts && postId) ? window._allRenderedPosts[String(postId)] : null;
            if (post) {
                const rendered = EngineManager.renderInto(mediaEl, post, { interactive: false });
                if (rendered) return;
            }

            // Fallback placeholder card
            const fallback = document.createElement('div');
            fallback.className = 'fallback-post-card';
            const displayTitle = title || 'Interactive Simulation';
            fallback.innerHTML = `
                <i class="${iconClass || 'ri-image-line'}"></i>
                <span>${escapeHtml(displayTitle)}</span>
                <small style="color:#94a3b8;margin-top:6px;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;">${format || 'Visual'}</small>
            `;
            mediaEl.replaceWith(fallback);
        }
    };

    // Expose to window for global access
    window.EngineManager = EngineManager;
    window.handleMediaFallback = EngineManager.handleMediaFallback;

})(typeof window !== 'undefined' ? window : this);
