// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/cover_script.js
/**
 * Amazon KDP Print-Ready Book Cover Studio
 * - Full Wrap Paperback (Bleed + Back + Spine + Front + Bleed)
 * - 300 DPI Mathematical KDP Compliance
 * - Interactive Fabric.js Canvas & XtraAnim Hero Visual Integration
 */

(function () {
    'use strict';

    // 1. KDP Specifications Reference Data
    const TRIM_SIZES = {
        '6x9': { width: 6.0, height: 9.0, label: '6" × 9" Trade Paperback' },
        '8.5x11': { width: 8.5, height: 11.0, label: '8.5" × 11" Workbook' },
        '5.5x8.5': { width: 5.5, height: 8.5, label: '5.5" × 8.5" Digest' },
        '7x10': { width: 7.0, height: 10.0, label: '7" × 10" Technical' }
    };

    const PAPER_MULTIPLIERS = {
        'white': 0.002252, // Amazon KDP standard white paper
        'cream': 0.002500, // Amazon KDP cream paper
        'color': 0.002347  // Amazon KDP premium color paper
    };

    const BLEED = 0.125; // 0.125 in (3.2 mm) outer bleed on all edges
    const DPI = 300;     // Amazon KDP Print requirement: 300 DPI

    // Editor State
    let canvas = null;
    let currentTrim = '6x9';
    let currentPageCount = 150;
    let currentPaperType = 'white';
    let currentBgColor = '#090a0f';
    let currentHeroImgObj = null;
    let guidesVisible = true;
    let scaleFactor = 0.25; // Scale for displaying 300 DPI on standard screen

    // Canvas Text / Element References
    let bgRect = null;
    let frontTitleText = null;
    let frontSubtitleText = null;
    let frontAuthorText = null;
    let spineTitleText = null;
    let backHeadlineText = null;
    let backBlurbText = null;
    let barcodeBox = null;

    // Default High-Converting Sample Hero Graphic (TikZ Calculus Curve)
    const DEFAULT_HERO_IMG = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&fit=crop&q=80';

    document.addEventListener('DOMContentLoaded', () => {
        initUrlParams();
        initTabs();
        initCanvas();
        initEventListeners();
        initAssetPicker();
        updateKdpCalculations();
    });

    /**
     * Read any parameters passed from xtraBook (e.g. ?trim=6x9&pages=180&title=...)
     */
    function initUrlParams() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('trim') && TRIM_SIZES[params.get('trim')]) {
            currentTrim = params.get('trim');
            document.getElementById('kdpTrimSelect').value = currentTrim;
        }
        if (params.get('pages')) {
            currentPageCount = Math.max(24, Math.min(828, parseInt(params.get('pages'), 10) || 150));
            document.getElementById('kdpPageCount').value = currentPageCount;
        }
        if (params.get('title')) {
            document.getElementById('frontTitleInput').value = params.get('title');
        }
        if (params.get('author')) {
            document.getElementById('frontAuthorInput').value = params.get('author');
        }
    }

    /**
     * Sidebar Tab Navigation
     */
    function initTabs() {
        const tabs = document.querySelectorAll('.sidebar-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

                tab.classList.add('active');
                const targetPanel = document.getElementById(`tab-${tab.dataset.tab}`);
                if (targetPanel) targetPanel.classList.add('active');
            });
        });
    }

    /**
     * Calculate exact KDP Dimensions in Inches & Pixels
     */
    function calculateDimensions() {
        const trim = TRIM_SIZES[currentTrim];
        const multiplier = PAPER_MULTIPLIERS[currentPaperType] || PAPER_MULTIPLIERS.white;
        const spineInches = currentPageCount * multiplier;

        const fullWidthInches = BLEED + trim.width + spineInches + trim.width + BLEED;
        const fullHeightInches = BLEED + trim.height + BLEED;

        // Pixel dimensions at 300 DPI
        const fullWidthPx = Math.round(fullWidthInches * DPI);
        const fullHeightPx = Math.round(fullHeightInches * DPI);
        const spineWidthPx = Math.round(spineInches * DPI);
        const trimWidthPx = Math.round(trim.width * DPI);
        const trimHeightPx = Math.round(trim.height * DPI);
        const bleedPx = Math.round(BLEED * DPI);

        // Boundary Positions (X coordinates at 300 DPI)
        const backCoverStartX = bleedPx;
        const spineStartX = bleedPx + trimWidthPx;
        const spineCenterX = spineStartX + (spineWidthPx / 2);
        const frontCoverStartX = spineStartX + spineWidthPx;
        const frontCoverEndX = frontCoverStartX + trimWidthPx;

        return {
            trim,
            spineInches,
            fullWidthInches,
            fullHeightInches,
            fullWidthPx,
            fullHeightPx,
            spineWidthPx,
            trimWidthPx,
            trimHeightPx,
            bleedPx,
            backCoverStartX,
            spineStartX,
            spineCenterX,
            frontCoverStartX,
            frontCoverEndX
        };
    }

    /**
     * Initialize Fabric.js Canvas
     */
    function initCanvas() {
        const dims = calculateDimensions();

        // Calculate screen display scale so it fits nicely in the viewport with balanced margins on ALL sides
        const viewport = document.getElementById('canvasViewport');
        const paddingX = window.innerWidth <= 768 ? 32 : 80;
        const paddingY = window.innerWidth <= 768 ? 40 : 80;
        const availWidth = (viewport && viewport.clientWidth > 50 ? viewport.clientWidth : window.innerWidth) - paddingX;
        const availHeight = (viewport && viewport.clientHeight > 50 ? viewport.clientHeight : (window.innerHeight - 140)) - paddingY;

        const scaleX = availWidth / dims.fullWidthPx;
        const scaleY = availHeight / dims.fullHeightPx;
        scaleFactor = Math.min(scaleX, scaleY, 0.35);

        const zoomEl = document.getElementById('zoomLevel');
        if (zoomEl) zoomEl.textContent = `${Math.round(scaleFactor / 0.25 * 100)}%`;

        canvas = new fabric.Canvas('kdpCanvas', {
            width: dims.fullWidthPx * scaleFactor,
            height: dims.fullHeightPx * scaleFactor,
            selection: true,
            preserveObjectStacking: true,
            backgroundColor: '#090a0f'
        });

        buildCoverElements();
        renderGuideOverlay(dims, scaleFactor);
    }

    /**
     * Build All Visual & Typography Elements on the Cover
     */
    function buildCoverElements() {
        if (!canvas) return;
        canvas.clear();

        const dims = calculateDimensions();
        const sf = scaleFactor;
        const scaleRatio = sf / 0.25;

        // 1. Background Rectangle
        bgRect = new fabric.Rect({
            left: 0,
            top: 0,
            width: dims.fullWidthPx * sf,
            height: dims.fullHeightPx * sf,
            fill: currentBgColor,
            selectable: false,
            evented: false
        });
        canvas.add(bgRect);

        // 2. Barcode Safe Zone Placeholder (Lower Right of Back Cover)
        // Amazon KDP standard: 2.0" x 1.2", 0.25" from margin
        const bcWidth = 2.0 * DPI * sf;
        const bcHeight = 1.2 * DPI * sf;
        const bcLeft = (dims.spineStartX * sf) - bcWidth - (0.35 * DPI * sf);
        const bcTop = (dims.fullHeightPx * sf) - (dims.bleedPx * sf) - bcHeight - (0.35 * DPI * sf);

        const barcodeRect = new fabric.Rect({
            width: bcWidth,
            height: bcHeight,
            fill: '#ffffff',
            stroke: '#d4d4d8',
            strokeWidth: 1,
            rx: 4,
            ry: 4
        });
        const barcodeText = new fabric.Text("ISBN BARCODE\nSAFE ZONE", {
            fontSize: Math.max(5, Math.round(10 * scaleRatio)),
            fill: '#71717a',
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            left: bcWidth / 2,
            top: bcHeight / 2,
            fontFamily: 'Inter',
            fontWeight: '600'
        });
        const isBarcodeVisible = document.getElementById('showBarcodeToggle') ? document.getElementById('showBarcodeToggle').checked : true;

        barcodeBox = new fabric.Group([barcodeRect, barcodeText], {
            left: bcLeft,
            top: bcTop,
            selectable: false,
            evented: false,
            opacity: 0.95,
            visible: isBarcodeVisible
        });
        canvas.add(barcodeBox);

        // 3. Front Cover Typography
        const frontCenter = (dims.frontCoverStartX + (dims.trimWidthPx / 2)) * sf;
        const fontFamily = document.getElementById('fontFamilySelect').value || 'Outfit';
        const titleColor = document.getElementById('titleColorInput').value || '#ffffff';

        // Front Title
        frontTitleText = new fabric.Text(document.getElementById('frontTitleInput').value.toUpperCase(), {
            left: frontCenter,
            top: (dims.bleedPx + (dims.trimHeightPx * 0.12)) * sf,
            fontSize: Math.max(8, Math.round(26 * scaleRatio)),
            fontFamily: fontFamily,
            fontWeight: '800',
            fill: titleColor,
            originX: 'center',
            textAlign: 'center',
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.8)', blur: Math.round(15 * scaleRatio), offsetX: 0, offsetY: Math.round(4 * scaleRatio) })
        });
        canvas.add(frontTitleText);

        // Front Subtitle
        frontSubtitleText = new fabric.Text(document.getElementById('frontSubtitleInput').value, {
            left: frontCenter,
            top: (dims.bleedPx + (dims.trimHeightPx * 0.22)) * sf,
            fontSize: Math.max(6, Math.round(12 * scaleRatio)),
            fontFamily: 'Inter',
            fontWeight: '500',
            fill: '#93c5fd',
            originX: 'center',
            textAlign: 'center',
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.6)', blur: Math.round(8 * scaleRatio) })
        });
        canvas.add(frontSubtitleText);

        // Front Author
        frontAuthorText = new fabric.Text(document.getElementById('frontAuthorInput').value.toUpperCase(), {
            left: frontCenter,
            top: (dims.bleedPx + (dims.trimHeightPx * 0.88)) * sf,
            fontSize: Math.max(7, Math.round(14 * scaleRatio)),
            fontFamily: fontFamily,
            fontWeight: '700',
            fill: '#ffffff',
            originX: 'center',
            textAlign: 'center',
            letterSpacing: Math.max(1, Math.round(2 * scaleRatio)),
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.8)', blur: Math.round(10 * scaleRatio) })
        });
        canvas.add(frontAuthorText);

        // 4. Back Cover Typography
        const backCenter = (dims.backCoverStartX + (dims.trimWidthPx / 2)) * sf;

        backHeadlineText = new fabric.Text(document.getElementById('backHeadlineInput').value, {
            left: backCenter,
            top: (dims.bleedPx + (dims.trimHeightPx * 0.15)) * sf,
            fontSize: Math.max(8, Math.round(16 * scaleRatio)),
            fontFamily: fontFamily,
            fontWeight: '700',
            fill: '#ffffff',
            originX: 'center',
            textAlign: 'center'
        });
        canvas.add(backHeadlineText);

        backBlurbText = new fabric.Textbox(document.getElementById('backBlurbInput').value, {
            left: backCenter,
            top: (dims.bleedPx + (dims.trimHeightPx * 0.25)) * sf,
            width: (dims.trimWidthPx * 0.75) * sf,
            fontSize: Math.max(6, Math.round(11 * scaleRatio)),
            lineHeight: 1.4,
            fontFamily: 'Inter',
            fill: '#d4d4d8',
            originX: 'center',
            textAlign: 'left'
        });
        canvas.add(backBlurbText);

        // 5. Spine Title (Rotated 90° for vertical reading)
        const spineCenter = dims.spineCenterX * sf;
        const isSpineEligible = currentPageCount >= 79;

        spineTitleText = new fabric.Text(document.getElementById('spineTitleInput').value.toUpperCase(), {
            left: spineCenter,
            top: (dims.fullHeightPx * 0.5) * sf,
            fontSize: Math.max(5, Math.round(dims.spineWidthPx * sf * 0.55)),
            fontFamily: fontFamily,
            fontWeight: '700',
            fill: '#ffffff',
            angle: 90,
            originX: 'center',
            originY: 'center',
            visible: isSpineEligible
        });
        canvas.add(spineTitleText);

        // 6. Insert Default / Current Hero Image
        const currentHeroSrc = document.getElementById('heroBoxImg').src || DEFAULT_HERO_IMG;
        loadHeroImage(currentHeroSrc, false);

        renderGuideOverlay(dims, sf);
        canvas.renderAll();
    }

    /**
     * Load & Place Hero Graphic on the Front Cover
     */
    function loadHeroImage(imgUrl, reCenter = true) {
        if (!imgUrl || !canvas) return;

        fabric.Image.fromURL(imgUrl, (img) => {
            if (currentHeroImgObj) {
                canvas.remove(currentHeroImgObj);
            }

            const dims = calculateDimensions();
            const sf = scaleFactor;
            const frontCenter = (dims.frontCoverStartX + (dims.trimWidthPx / 2)) * sf;
            const heroCenterY = (dims.bleedPx + (dims.trimHeightPx * 0.54)) * sf;

            const targetWidth = dims.trimWidthPx * sf * 0.75;
            const scale = targetWidth / img.width;

            img.set({
                originX: 'center',
                originY: 'center',
                left: frontCenter,
                top: heroCenterY,
                scaleX: scale * parseFloat(document.getElementById('heroScaleSlider').value || 0.85),
                scaleY: scale * parseFloat(document.getElementById('heroScaleSlider').value || 0.85),
                cornerColor: '#3b82f6',
                cornerStyle: 'circle',
                borderColor: '#60a5fa',
                transparentCorners: false
            });

            if (document.getElementById('heroShadowToggle').checked) {
                img.set('shadow', new fabric.Shadow({
                    color: 'rgba(0, 0, 0, 0.75)',
                    blur: 25,
                    offsetX: 0,
                    offsetY: 8
                }));
            }

            currentHeroImgObj = img;
            canvas.add(img);
            canvas.bringToFront(img);
            if (frontAuthorText) canvas.bringToFront(frontAuthorText);
            canvas.renderAll();

            // Update Left Sidebar Preview Box
            const boxImg = document.getElementById('heroBoxImg');
            const boxEmpty = document.getElementById('heroBoxEmpty');
            if (boxImg && boxEmpty) {
                boxImg.src = imgUrl;
                boxImg.style.display = 'block';
                boxEmpty.style.display = 'none';
            }
        }, { crossOrigin: 'anonymous' });
    }

    /**
     * Render KDP Visual Guides (Bleed, Trim, Spine, Margins)
     */
    function renderGuideOverlay(dims, sf) {
        const overlay = document.getElementById('guideOverlay');
        if (!overlay) return;

        if (!guidesVisible) {
            overlay.innerHTML = '';
            overlay.style.display = 'none';
            return;
        }

        overlay.style.display = 'block';

        const bPx = dims.bleedPx * sf;
        const bStartX = dims.backCoverStartX * sf;
        const sStartX = dims.spineStartX * sf;
        const fStartX = dims.frontCoverStartX * sf;
        const fEndX = dims.frontCoverEndX * sf;
        const fH = dims.fullHeightPx * sf;
        const fW = dims.fullWidthPx * sf;

        overlay.innerHTML = `
            <svg width="${fW}" height="${fH}" style="position: absolute; inset: 0; pointer-events: none;">
                <!-- Bleed Outer Guide (Red) -->
                <rect x="${bPx}" y="${bPx}" width="${fW - (bPx * 2)}" height="${fH - (bPx * 2)}" 
                      fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.8"/>
                
                <!-- Spine Folds (Yellow) -->
                <line x1="${sStartX}" y1="0" x2="${sStartX}" y2="${fH}" stroke="#facc15" stroke-width="1.5" stroke-dasharray="5,5" opacity="0.85"/>
                <line x1="${fStartX}" y1="0" x2="${fStartX}" y2="${fH}" stroke="#facc15" stroke-width="1.5" stroke-dasharray="5,5" opacity="0.85"/>
                
                <!-- Zone Labels -->
                <text x="${bStartX + 15}" y="${bPx + 20}" fill="#ef4444" font-size="10" font-family="Inter" font-weight="700">BACK COVER</text>
                <text x="${fStartX + 15}" y="${bPx + 20}" fill="#3b82f6" font-size="10" font-family="Inter" font-weight="700">FRONT COVER</text>
                <text x="${sStartX + 2}" y="${bPx + 20}" fill="#facc15" font-size="8" font-family="Inter" font-weight="700" style="writing-mode: vertical-rl;">SPINE</text>
            </svg>
        `;
    }

    /**
     * Update Mathematical Calculations Display
     */
    function updateKdpCalculations() {
        const dims = calculateDimensions();

        document.getElementById('specFullWidth').textContent = `${dims.fullWidthInches.toFixed(2)} in`;
        document.getElementById('specFullHeight').textContent = `${dims.fullHeightInches.toFixed(2)} in`;
        document.getElementById('specSpineWidth').textContent = `${dims.spineInches.toFixed(3)} in`;

        const isSpineEligible = currentPageCount >= 79;
        const spineStatusEl = document.getElementById('spineTextStatus');
        if (spineStatusEl) {
            if (isSpineEligible) {
                spineStatusEl.textContent = '✓ Spine text enabled (≥ 79 pages)';
                spineStatusEl.style.color = '#34d399';
            } else {
                spineStatusEl.textContent = '⚠️ Spine text omitted (KDP requires ≥ 79 pages)';
                spineStatusEl.style.color = '#f87171';
            }
        }

        // Toolbar Badges
        document.getElementById('toolbarTrimBadge').textContent = `${dims.trim.width}" × ${dims.trim.height}" KDP`;
        document.getElementById('toolbarPagesBadge').textContent = `${currentPageCount} Pages`;
        document.getElementById('toolbarSpineBadge').textContent = `Spine: ${dims.spineInches.toFixed(2)}"`;
    }

    /**
     * Synchronize All Controls with Canvas
     */
    function initEventListeners() {
        // Trim Select
        document.getElementById('kdpTrimSelect').addEventListener('change', (e) => {
            currentTrim = e.target.value;
            updateKdpCalculations();
            initCanvas();
        });

        // Page Count
        document.getElementById('kdpPageCount').addEventListener('input', (e) => {
            currentPageCount = Math.max(24, Math.min(828, parseInt(e.target.value, 10) || 150));
            updateKdpCalculations();
            initCanvas();
        });

        // Paper Color
        document.getElementById('kdpPaperType').addEventListener('change', (e) => {
            currentPaperType = e.target.value;
            updateKdpCalculations();
            initCanvas();
        });

        // Background Preset
        document.getElementById('bgPresetSelect').addEventListener('change', (e) => {
            currentBgColor = e.target.value;
            document.getElementById('customBgColor').value = currentBgColor;
            if (bgRect) bgRect.set('fill', currentBgColor);
            canvas.renderAll();
        });

        // Custom Background Color
        document.getElementById('customBgColor').addEventListener('input', (e) => {
            currentBgColor = e.target.value;
            if (bgRect) bgRect.set('fill', currentBgColor);
            canvas.renderAll();
        });

        // Text Inputs Dynamic Binding
        document.getElementById('frontTitleInput').addEventListener('input', (e) => {
            if (frontTitleText) {
                frontTitleText.set('text', e.target.value.toUpperCase());
                canvas.renderAll();
            }
        });
        document.getElementById('frontSubtitleInput').addEventListener('input', (e) => {
            if (frontSubtitleText) {
                frontSubtitleText.set('text', e.target.value);
                canvas.renderAll();
            }
        });
        document.getElementById('frontAuthorInput').addEventListener('input', (e) => {
            if (frontAuthorText) {
                frontAuthorText.set('text', e.target.value.toUpperCase());
                canvas.renderAll();
            }
        });
        document.getElementById('backHeadlineInput').addEventListener('input', (e) => {
            if (backHeadlineText) {
                backHeadlineText.set('text', e.target.value);
                canvas.renderAll();
            }
        });
        document.getElementById('backBlurbInput').addEventListener('input', (e) => {
            if (backBlurbText) {
                backBlurbText.set('text', e.target.value);
                canvas.renderAll();
            }
        });
        document.getElementById('spineTitleInput').addEventListener('input', (e) => {
            if (spineTitleText) {
                spineTitleText.set('text', e.target.value.toUpperCase());
                canvas.renderAll();
            }
        });

        // ISBN Barcode Placeholder Toggle
        const barcodeToggle = document.getElementById('showBarcodeToggle');
        if (barcodeToggle) {
            barcodeToggle.addEventListener('change', (e) => {
                if (barcodeBox) {
                    barcodeBox.set('visible', e.target.checked);
                    canvas.renderAll();
                }
            });
        }

        // Font Family Select
        document.getElementById('fontFamilySelect').addEventListener('change', (e) => {
            const font = e.target.value;
            if (frontTitleText) frontTitleText.set('fontFamily', font);
            if (frontAuthorText) frontAuthorText.set('fontFamily', font);
            if (backHeadlineText) backHeadlineText.set('fontFamily', font);
            if (spineTitleText) spineTitleText.set('fontFamily', font);
            canvas.renderAll();
        });

        // Title Color Input
        document.getElementById('titleColorInput').addEventListener('input', (e) => {
            if (frontTitleText) {
                frontTitleText.set('fill', e.target.value);
                canvas.renderAll();
            }
        });

        // Hero Image Scale Slider
        document.getElementById('heroScaleSlider').addEventListener('input', (e) => {
            if (currentHeroImgObj) {
                const dims = calculateDimensions();
                const sf = scaleFactor;
                const baseScale = (dims.trimWidthPx * sf * 0.75) / currentHeroImgObj.width;
                const factor = parseFloat(e.target.value);
                currentHeroImgObj.set({
                    scaleX: baseScale * factor,
                    scaleY: baseScale * factor
                });
                canvas.renderAll();
            }
        });

        // Hero Shadow Toggle
        document.getElementById('heroShadowToggle').addEventListener('change', (e) => {
            if (currentHeroImgObj) {
                if (e.target.checked) {
                    currentHeroImgObj.set('shadow', new fabric.Shadow({
                        color: 'rgba(0, 0, 0, 0.75)',
                        blur: 25,
                        offsetX: 0,
                        offsetY: 8
                    }));
                } else {
                    currentHeroImgObj.set('shadow', null);
                }
                canvas.renderAll();
            }
        });

        // Custom File Upload
        document.getElementById('uploadCustomImg').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    loadHeroImage(evt.target.result);
                };
                reader.readAsDataURL(file);
            }
        });

        // Toggle Guides
        document.getElementById('toggleGuidesBtn').addEventListener('click', () => {
            guidesVisible = !guidesVisible;
            const dims = calculateDimensions();
            renderGuideOverlay(dims, scaleFactor);
        });

        // Zoom Controls
        document.getElementById('zoomInBtn').addEventListener('click', () => adjustZoom(1.15));
        document.getElementById('zoomOutBtn').addEventListener('click', () => adjustZoom(0.85));
        document.getElementById('zoomResetBtn').addEventListener('click', () => initCanvas());

        // Reset Layout
        document.getElementById('resetLayoutBtn').addEventListener('click', () => {
            if (confirm('Reset cover layout to default template?')) {
                initCanvas();
            }
        });

        // Export Buttons
        const frontPngBtn = document.getElementById('exportFrontPngBtn');
        if (frontPngBtn) frontPngBtn.addEventListener('click', exportFrontCover);

        const fullPdfBtn = document.getElementById('exportFullPdfBtn');
        if (fullPdfBtn) fullPdfBtn.addEventListener('click', exportFullWrapPdf);
    }

    /**
     * Adjust Canvas Display Zoom
     */
    function adjustZoom(factor) {
        if (!canvas) return;
        scaleFactor = Math.max(0.04, Math.min(scaleFactor * factor, 1.2));
        const dims = calculateDimensions();

        canvas.setWidth(dims.fullWidthPx * scaleFactor);
        canvas.setHeight(dims.fullHeightPx * scaleFactor);

        document.getElementById('zoomLevel').textContent = `${Math.round(scaleFactor / 0.25 * 100)}%`;
        buildCoverElements();
        renderGuideOverlay(dims, scaleFactor);
    }

    /**
     * Initialize Asset Picker (Loads user's XtraAnim creations & TikZ outputs)
     */
    function initAssetPicker() {
        const modal = document.getElementById('assetPickerModal');
        const openBtn = document.getElementById('openAssetPickerBtn');
        const heroBox = document.getElementById('heroPreviewBox');
        const closeBtn = document.getElementById('closeAssetPickerBtn');
        const grid = document.getElementById('assetsGrid');

        const openModal = () => {
            populateAssetsGrid(grid);
            modal.style.display = 'flex';
        };
        const closeModal = () => {
            modal.style.display = 'none';
        };

        if (openBtn) openBtn.addEventListener('click', openModal);
        if (heroBox) heroBox.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    /**
     * Populate Asset Grid from Local Posts / Creations & Curated Math Visuals
     */
    function populateAssetsGrid(grid) {
        if (!grid) return;
        grid.innerHTML = '';

        // Curated XtraAnim Visual Presets
        const curatedAssets = [
            {
                title: 'TikZ Calculus & Dynamics Curve',
                tag: 'TikZ Engine',
                url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&fit=crop&q=80'
            },
            {
                title: 'Quantum Field Simulation',
                tag: 'Manim (Pro)',
                url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&fit=crop&q=80'
            },
            {
                title: 'Cosmic Geometry & Manifold',
                tag: '3D Scene',
                url: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=600&fit=crop&q=80'
            },
            {
                title: 'Tensor & Vector Flow',
                tag: 'Desmos Graph',
                url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&fit=crop&q=80'
            }
        ];

        // Also fetch user's local creations
        let userCreations = [];
        try {
            const rawPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            userCreations = rawPosts
                .filter(p => p.video_url && !p.video_url.endsWith('.mp4'))
                .map(p => ({
                    title: p.title || 'My Creation',
                    tag: p.format || 'XtraAnim',
                    url: p.video_url.startsWith('http') ? p.video_url : `${window.location.origin}${p.video_url}`
                }));
        } catch (e) {}

        const allAssets = [...userCreations, ...curatedAssets];

        allAssets.forEach(asset => {
            const card = document.createElement('div');
            card.className = 'asset-card';
            card.innerHTML = `
                <div class="asset-thumb">
                    <img src="${asset.url}" alt="${asset.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&fit=crop&q=80'">
                </div>
                <div class="asset-meta">
                    <span style="display: block; font-size: 0.72rem; color: #60a5fa; text-transform: uppercase;">${asset.tag}</span>
                    <span style="font-size: 0.8rem; font-weight: 600;">${asset.title}</span>
                </div>
            `;
            card.addEventListener('click', () => {
                loadHeroImage(asset.url);
                document.getElementById('assetPickerModal').style.display = 'none';
            });
            grid.appendChild(card);
        });
    }

    /**
     * Export High-Resolution Front Cover Only (Kindle eBook / Store Listing)
     */
    function exportFrontCover() {
        if (!canvas) return;

        const dims = calculateDimensions();
        // Multiplier to render at full 300 DPI
        const multiplier = 1 / scaleFactor;

        // Front Cover crop rectangle in 300 DPI coordinates
        const frontStartX = dims.frontCoverStartX;
        const frontWidth = dims.trimWidthPx;
        const frontHeight = dims.trimHeightPx;
        const frontStartY = dims.bleedPx;

        // Export cropped data URL
        const dataUrl = canvas.toDataURL({
            format: 'png',
            multiplier: multiplier,
            left: frontStartX * scaleFactor,
            top: frontStartY * scaleFactor,
            width: frontWidth * scaleFactor,
            height: frontHeight * scaleFactor
        });

        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `kdp_front_cover_${currentTrim}_300dpi.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /**
     * Export Full Wrap Paperback Cover as 300 DPI Amazon KDP Print-Ready PDF
     */
    function exportFullWrapPdf() {
        if (!canvas || !window.jspdf) {
            alert('PDF generator is initializing, please try again.');
            return;
        }

        const dims = calculateDimensions();
        const multiplier = 1 / scaleFactor;

        // Generate Full Wrap PNG at full 300 DPI
        const fullWrapDataUrl = canvas.toDataURL({
            format: 'png',
            multiplier: multiplier
        });

        // Using jsPDF: create custom print size in inches
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'in',
            format: [dims.fullWidthInches, dims.fullHeightInches]
        });

        pdf.addImage(fullWrapDataUrl, 'PNG', 0, 0, dims.fullWidthInches, dims.fullHeightInches, undefined, 'FAST');
        pdf.save(`kdp_paperback_cover_${currentTrim}_${currentPageCount}pages_300dpi.pdf`);
    }

    // Expose helpers for mobile switch preview & bottomsheet
    window.fitCanvasToViewport = initCanvas;
    window.exportFrontCover = exportFrontCover;
    window.exportFullWrapPdf = exportFullWrapPdf;

})();
