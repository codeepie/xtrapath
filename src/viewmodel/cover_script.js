// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/cover_script.js
/**
 * Amazon KDP Print-Ready Book Cover Studio
 * - Kodeco / O'Reilly / Stripe Press calibre book design
 * - Full Wrap Paperback (Bleed + Back + Spine + Front + Bleed)
 * - 300 DPI Mathematical KDP Compliance
 * - Interactive Fabric.js Canvas + 3D Realistic Book Perspective
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

    // Cover Templates Configuration
    const COVER_TEMPLATES = {
        'kodeco': {
            bg: '#0c1017',
            titleColor: '#ffffff',
            subtitleColor: '#60a5fa',
            authorColor: '#f1f5f9',
            fontFamily: 'Comic Sans MS',
            badgeText: 'KODECO TECHNICAL GUIDES • 1ST ED.',
            badgeColor: '#60a5fa',
            badgeBg: 'rgba(37, 99, 235, 0.12)',
            badgeBorder: 'rgba(59, 130, 246, 0.35)'
        },
        'emerald': {
            bg: '#052922',
            titleColor: '#ffffff',
            subtitleColor: '#34d399',
            authorColor: '#ecfdf5',
            fontFamily: 'Comic Sans MS',
            badgeText: 'ADVANCED MATHEMATICS & SCIENCE',
            badgeColor: '#34d399',
            badgeBg: 'rgba(52, 211, 153, 0.12)',
            badgeBorder: 'rgba(52, 211, 153, 0.35)'
        },
        'scientific': {
            bg: '#0a1128',
            titleColor: '#ffffff',
            subtitleColor: '#38bdf8',
            authorColor: '#e0f2fe',
            fontFamily: 'Comic Sans MS',
            badgeText: 'THEORETICAL PHYSICS & CALCULUS',
            badgeColor: '#38bdf8',
            badgeBg: 'rgba(56, 189, 248, 0.12)',
            badgeBorder: 'rgba(56, 189, 248, 0.35)'
        },
        'crimson': {
            bg: '#360909',
            titleColor: '#fef08a',
            subtitleColor: '#fecaca',
            authorColor: '#ffffff',
            fontFamily: 'Comic Sans MS',
            badgeText: 'CLASSICAL ACADEMIC EDITION',
            badgeColor: '#fef08a',
            badgeBg: 'rgba(254, 240, 138, 0.12)',
            badgeBorder: 'rgba(254, 240, 138, 0.35)'
        }
    };

    // Editor State
    let canvas = null;
    let currentTrim = '6x9';
    let currentPageCount = 150;
    let currentPaperType = 'white';
    let currentBgColor = '#0c1017';
    let currentTemplate = 'kodeco';
    let currentHeroImgObj = null;
    let guidesVisible = true;
    let currentPreviewMode = 'flat'; // 'flat' or '3d'
    let scaleFactor = 0.25; // Scale for displaying 300 DPI on standard screen

    // Canvas Element References
    let bgRect = null;
    let frontTitleText = null;
    let frontSubtitleText = null;
    let frontAuthorText = null;
    let spineTitleText = null;
    let backHeadlineText = null;
    let backBlurbText = null;
    let barcodeBox = null;
    let seriesBadgeGroup = null;
    let badgeLabel = null;
    let categoryTag = null;
    let bulletText = null;
    let colophon = null;

    // High-Converting Sample Hero Graphic (TikZ Calculus Curve)
    const DEFAULT_HERO_IMG = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&fit=crop&q=80';

    document.addEventListener('DOMContentLoaded', () => {
        initUrlParams();
        initTabs();
        initCanvas();
        initEventListeners();
        initAssetPicker();
        updateKdpCalculations();
        init3dOrbitController();
    });

    /**
     * Read any parameters passed from xtraBook (e.g. ?trim=6x9&pages=180&title=...)
     */
    function initUrlParams() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('trim') && TRIM_SIZES[params.get('trim')]) {
            currentTrim = params.get('trim');
            const el = document.getElementById('kdpTrimSelect');
            if (el) el.value = currentTrim;
        }
        if (params.get('pages')) {
            currentPageCount = Math.max(24, Math.min(828, parseInt(params.get('pages'), 10) || 150));
            const el = document.getElementById('kdpPageCount');
            if (el) el.value = currentPageCount;
        }
        if (params.get('title')) {
            const el = document.getElementById('frontTitleInput');
            if (el) el.value = params.get('title');
        }
        if (params.get('author')) {
            const el = document.getElementById('frontAuthorInput');
            if (el) el.value = params.get('author');
        }
    }

    /**
     * Sidebar Tab Navigation
     */
    function initTabs() {
        const tabButtons = document.querySelectorAll('.sidebar-tab');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                const targetId = `tab-${btn.dataset.tab}`;
                const targetPanel = document.getElementById(targetId);
                if (targetPanel) targetPanel.classList.add('active');
            });
        });
    }

    /**
     * Mathematical Calculation of Amazon KDP Full Wrap Dimensions (in inches & pixels)
     */
    function calculateDimensions() {
        const trim = TRIM_SIZES[currentTrim] || TRIM_SIZES['6x9'];
        const multiplier = PAPER_MULTIPLIERS[currentPaperType] || PAPER_MULTIPLIERS['white'];

        // KDP Spine Width formula: Page Count * Paper Thickness
        const spineWidthInches = Math.max(0.06, currentPageCount * multiplier);

        // Full wrap dimensions: Bleed + Back + Spine + Front + Bleed
        const fullWidthInches = (BLEED * 2) + (trim.width * 2) + spineWidthInches;
        const fullHeightInches = (BLEED * 2) + trim.height;

        return {
            trimWidthInches: trim.width,
            trimHeightInches: trim.height,
            spineWidthInches: spineWidthInches,
            fullWidthInches: fullWidthInches,
            fullHeightInches: fullHeightInches,

            // Pixel values at 300 DPI
            trimWidthPx: Math.round(trim.width * DPI),
            trimHeightPx: Math.round(trim.height * DPI),
            spineWidthPx: Math.round(spineWidthInches * DPI),
            fullWidthPx: Math.round(fullWidthInches * DPI),
            fullHeightPx: Math.round(fullHeightInches * DPI),
            bleedPx: Math.round(BLEED * DPI),

            // Key layout horizontal anchors
            backCoverStartX: Math.round(BLEED * DPI),
            spineStartX: Math.round((BLEED + trim.width) * DPI),
            spineCenterX: Math.round((BLEED + trim.width + (spineWidthInches / 2)) * DPI),
            frontCoverStartX: Math.round((BLEED + trim.width + spineWidthInches) * DPI),
            frontCoverEndX: Math.round((BLEED + (trim.width * 2) + spineWidthInches) * DPI)
        };
    }

    /**
     * Initialize Fabric Canvas with Symmetrical Centering
     */
    function initCanvas() {
        const dims = calculateDimensions();
        const viewport = document.getElementById('canvasViewport');

        const availableWidth = viewport ? (viewport.clientWidth - 48) : 900;
        const availableHeight = viewport ? (viewport.clientHeight - 48) : 560;

        const scaleX = availableWidth / dims.fullWidthPx;
        const scaleY = availableHeight / dims.fullHeightPx;
        scaleFactor = Math.min(scaleX, scaleY, 0.32);

        const canvasEl = document.getElementById('kdpCanvas');
        if (!canvasEl) return;

        if (canvas) {
            canvas.dispose();
        }

        canvas = new fabric.Canvas('kdpCanvas', {
            width: Math.round(dims.fullWidthPx * scaleFactor),
            height: Math.round(dims.fullHeightPx * scaleFactor),
            backgroundColor: currentBgColor,
            selection: true,
            preserveObjectStacking: true
        });

        buildCoverElements();
        renderGuideOverlay(dims, scaleFactor);
    }

    /**
     * Build All Visual & Typography Elements on the Cover
     * Includes series badge, author divider, book folds, and authentic barcode
     */
    function buildCoverElements() {
        if (!canvas) return;
        canvas.clear();

        const dims = calculateDimensions();
        const sf = scaleFactor;
        const scaleRatio = sf / 0.25;
        const tmpl = COVER_TEMPLATES[currentTemplate] || COVER_TEMPLATES['kodeco'];

        // 1. Full Cover Background
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

        // 2. Physical Spine Crease Folds (Realistic ambient paper shadow)
        const spineLeftPx = dims.spineStartX * sf;
        const spineRightPx = dims.frontCoverStartX * sf;
        const foldShadowWidth = Math.max(3, Math.round(5 * scaleRatio));

        const spineFoldLeft = new fabric.Rect({
            left: spineLeftPx - (foldShadowWidth / 2),
            top: 0,
            width: foldShadowWidth,
            height: dims.fullHeightPx * sf,
            fill: 'rgba(0, 0, 0, 0.22)',
            selectable: false,
            evented: false
        });
        const spineFoldRight = new fabric.Rect({
            left: spineRightPx - (foldShadowWidth / 2),
            top: 0,
            width: foldShadowWidth,
            height: dims.fullHeightPx * sf,
            fill: 'rgba(0, 0, 0, 0.22)',
            selectable: false,
            evented: false
        });
        canvas.add(spineFoldLeft);
        canvas.add(spineFoldRight);

        // 3. Barcode Safe Zone with Realistic Retail Barcode Stripes
        const bcWidth = 2.0 * DPI * sf;
        const bcHeight = 1.2 * DPI * sf;
        const bcLeft = (dims.spineStartX * sf) - bcWidth - (0.35 * DPI * sf);
        const bcTop = (dims.fullHeightPx * sf) - (dims.bleedPx * sf) - bcHeight - (0.35 * DPI * sf);

        const barcodeRect = new fabric.Rect({
            width: bcWidth,
            height: bcHeight,
            fill: '#ffffff',
            stroke: '#cbd5e1',
            strokeWidth: 1,
            rx: 4,
            ry: 4
        });

        // Generate realistic vertical barcode lines
        const barcodeElements = [barcodeRect];
        const barH = bcHeight * 0.58;
        const startX = 10 * scaleRatio;
        const startY = 8 * scaleRatio;
        const barPattern = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 2, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 2];
        let curX = startX;

        barPattern.forEach((w, i) => {
            if (i % 2 === 0) {
                barcodeElements.push(new fabric.Rect({
                    left: curX,
                    top: startY,
                    width: Math.max(1, w * scaleRatio * 0.8),
                    height: barH,
                    fill: '#0f172a'
                }));
            }
            curX += (w * scaleRatio * 0.8) + (1.2 * scaleRatio);
        });

        const isbnDigits = new fabric.Text("ISBN 978-3-16-148410-0", {
            left: bcWidth / 2,
            top: bcHeight - (6 * scaleRatio),
            fontSize: Math.max(5, Math.round(6.5 * scaleRatio)),
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: '600',
            fill: '#0f172a',
            originX: 'center',
            originY: 'bottom'
        });
        barcodeElements.push(isbnDigits);

        const isBarcodeVisible = document.getElementById('showBarcodeToggle') ? document.getElementById('showBarcodeToggle').checked : true;
        barcodeBox = new fabric.Group(barcodeElements, {
            left: bcLeft,
            top: bcTop,
            selectable: false,
            evented: false,
            opacity: 0.95,
            visible: isBarcodeVisible
        });
        canvas.add(barcodeBox);

        // 4. Front Cover Layout
        const frontCenter = (dims.frontCoverStartX + (dims.trimWidthPx / 2)) * sf;
        const fontFamily = document.getElementById('fontFamilySelect').value || tmpl.fontFamily;
        const titleColor = document.getElementById('titleColorInput').value || tmpl.titleColor;

        // Series / Edition Pill Badge at Top
        const badgeWidth = Math.min(dims.trimWidthPx * sf * 0.7, 160 * scaleRatio);
        const badgeHeight = 18 * scaleRatio;
        const badgeRect = new fabric.Rect({
            width: badgeWidth,
            height: badgeHeight,
            rx: 9 * scaleRatio,
            ry: 9 * scaleRatio,
            fill: tmpl.badgeBg,
            stroke: tmpl.badgeBorder,
            strokeWidth: 1,
            originX: 'center',
            originY: 'center'
        });
        badgeLabel = new fabric.Text(tmpl.badgeText, {
            fontSize: Math.max(5, Math.round(6.8 * scaleRatio)),
            fontFamily: fontFamily,
            fontWeight: 'bold',
            fill: tmpl.badgeColor,
            originX: 'center',
            originY: 'center',
            letterSpacing: Math.round(1 * scaleRatio)
        });
        seriesBadgeGroup = new fabric.Group([badgeRect, badgeLabel], {
            left: frontCenter,
            top: (dims.bleedPx + (dims.trimHeightPx * 0.08)) * sf,
            selectable: false,
            evented: false
        });
        canvas.add(seriesBadgeGroup);

        // Front Title
        frontTitleText = new fabric.Text(document.getElementById('frontTitleInput').value.toUpperCase(), {
            left: frontCenter,
            top: (dims.bleedPx + (dims.trimHeightPx * 0.13)) * sf,
            fontSize: Math.max(8, Math.round(25 * scaleRatio)),
            fontFamily: fontFamily,
            fontWeight: 'bold',
            fill: titleColor,
            originX: 'center',
            textAlign: 'center',
            shadow: new fabric.Shadow({
                color: 'rgba(0,0,0,0.7)',
                blur: Math.round(12 * scaleRatio),
                offsetX: 0,
                offsetY: Math.round(3 * scaleRatio)
            })
        });
        canvas.add(frontTitleText);

        // Front Subtitle
        frontSubtitleText = new fabric.Text(document.getElementById('frontSubtitleInput').value, {
            left: frontCenter,
            top: (dims.bleedPx + (dims.trimHeightPx * 0.23)) * sf,
            fontSize: Math.max(6, Math.round(11.5 * scaleRatio)),
            fontFamily: fontFamily,
            fontWeight: 'bold',
            fill: tmpl.subtitleColor,
            originX: 'center',
            textAlign: 'center'
        });
        canvas.add(frontSubtitleText);

        // Decorative Halo Ring behind Hero Image
        const heroHalo = new fabric.Circle({
            left: frontCenter,
            top: (dims.bleedPx + (dims.trimHeightPx * 0.53)) * sf,
            radius: Math.round(dims.trimWidthPx * sf * 0.38),
            fill: 'rgba(255, 255, 255, 0.02)',
            stroke: 'rgba(255, 255, 255, 0.08)',
            strokeWidth: 1,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
        });
        canvas.add(heroHalo);

        // Author Horizontal Divider Rule
        const dividerWidth = dims.trimWidthPx * sf * 0.45;
        const dividerY = (dims.bleedPx + (dims.trimHeightPx * 0.84)) * sf;
        const authorDivider = new fabric.Line([
            frontCenter - (dividerWidth / 2), dividerY,
            frontCenter + (dividerWidth / 2), dividerY
        ], {
            stroke: 'rgba(255, 255, 255, 0.18)',
            strokeWidth: 1,
            selectable: false,
            evented: false
        });
        canvas.add(authorDivider);

        // Front Author
        frontAuthorText = new fabric.Text(document.getElementById('frontAuthorInput').value.toUpperCase(), {
            left: frontCenter,
            top: (dims.bleedPx + (dims.trimHeightPx * 0.88)) * sf,
            fontSize: Math.max(7, Math.round(13 * scaleRatio)),
            fontFamily: fontFamily,
            fontWeight: 'bold',
            fill: tmpl.authorColor,
            originX: 'center',
            textAlign: 'center',
            letterSpacing: Math.max(1, Math.round(2 * scaleRatio))
        });
        canvas.add(frontAuthorText);

        // 5. Back Cover Editorial Layout
        const backCenter = (dims.backCoverStartX + (dims.trimWidthPx / 2)) * sf;

        // Category Tag
        categoryTag = new fabric.Text("TECHNICAL PUBLISHING • MATHEMATICAL DYNAMICS", {
            left: backCenter,
            top: (dims.bleedPx + (dims.trimHeightPx * 0.09)) * sf,
            fontSize: Math.max(5, Math.round(7 * scaleRatio)),
            fontFamily: fontFamily,
            fontWeight: 'bold',
            fill: '#64748b',
            originX: 'center',
            textAlign: 'center',
            letterSpacing: Math.round(1 * scaleRatio)
        });
        canvas.add(categoryTag);

        // Back Headline
        backHeadlineText = new fabric.Text(document.getElementById('backHeadlineInput').value, {
            left: backCenter,
            top: (dims.bleedPx + (dims.trimHeightPx * 0.15)) * sf,
            fontSize: Math.max(8, Math.round(15 * scaleRatio)),
            fontFamily: fontFamily,
            fontWeight: 'bold',
            fill: '#ffffff',
            originX: 'center',
            textAlign: 'center'
        });
        canvas.add(backHeadlineText);

        // Back Synopsis Paragraph
        backBlurbText = new fabric.Textbox(document.getElementById('backBlurbInput').value, {
            left: backCenter,
            top: (dims.bleedPx + (dims.trimHeightPx * 0.24)) * sf,
            width: (dims.trimWidthPx * 0.76) * sf,
            fontSize: Math.max(6, Math.round(10.5 * scaleRatio)),
            lineHeight: 1.45,
            fontFamily: fontFamily,
            fontWeight: 'bold',
            fill: '#cbd5e1',
            originX: 'center',
            textAlign: 'left'
        });
        canvas.add(backBlurbText);

        // Feature Highlights
        bulletText = new fabric.Textbox("✦ Rigorous Geometric Intuition & Calculus\n✦ High-Resolution 300 DPI Print Specifications\n✦ Authored for Engineers, Creators & Thinkers", {
            left: backCenter,
            top: (dims.bleedPx + (dims.trimHeightPx * 0.46)) * sf,
            width: (dims.trimWidthPx * 0.76) * sf,
            fontSize: Math.max(5, Math.round(9 * scaleRatio)),
            lineHeight: 1.6,
            fontFamily: fontFamily,
            fontWeight: 'bold',
            fill: '#94a3b8',
            originX: 'center',
            textAlign: 'left'
        });
        canvas.add(bulletText);

        // Publisher Colophon at Bottom Left of Back Cover
        colophon = new fabric.Text("XTRAPATH PUBLISHING • WWW.XTRAPATH.COM", {
            left: (dims.backCoverStartX + (0.4 * DPI)) * sf,
            top: (dims.fullHeightPx - dims.bleedPx - (0.35 * DPI)) * sf,
            fontSize: Math.max(5, Math.round(6.5 * scaleRatio)),
            fontFamily: fontFamily,
            fontWeight: 'bold',
            fill: '#475569',
            originX: 'left',
            originY: 'bottom'
        });
        canvas.add(colophon);

        // 6. Spine Title (Rotated 90° for vertical reading)
        const spineCenter = dims.spineCenterX * sf;
        const isSpineEligible = currentPageCount >= 79;

        spineTitleText = new fabric.Text(document.getElementById('spineTitleInput').value.toUpperCase(), {
            left: spineCenter,
            top: (dims.fullHeightPx * 0.5) * sf,
            fontSize: Math.max(5, Math.round(dims.spineWidthPx * sf * 0.52)),
            fontFamily: fontFamily,
            fontWeight: 'bold',
            fill: '#ffffff',
            angle: 90,
            originX: 'center',
            originY: 'center',
            visible: isSpineEligible
        });
        canvas.add(spineTitleText);

        // 7. Insert Default / Current Hero Image
        const currentHeroSrc = document.getElementById('heroBoxImg').src || DEFAULT_HERO_IMG;
        loadHeroImage(currentHeroSrc, false);

        renderGuideOverlay(dims, sf);
        canvas.renderAll();

        // Update 3D model if active
        if (currentPreviewMode === '3d') {
            update3dMockup();
        }
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
            const heroCenterY = (dims.bleedPx + (dims.trimHeightPx * 0.53)) * sf;

            const targetWidth = dims.trimWidthPx * sf * 0.72;
            const scale = targetWidth / img.width;

            img.set({
                originX: 'center',
                originY: 'center',
                left: frontCenter,
                top: heroCenterY,
                scaleX: scale,
                scaleY: scale,
                selectable: true,
                hasControls: true,
                cornerColor: '#2563eb',
                cornerStrokeColor: '#ffffff',
                cornerSize: 8,
                transparentCorners: false
            });

            const shadowToggle = document.getElementById('heroShadowToggle');
            if (shadowToggle && shadowToggle.checked) {
                img.set('shadow', new fabric.Shadow({
                    color: 'rgba(0, 0, 0, 0.75)',
                    blur: 24,
                    offsetX: 0,
                    offsetY: 8
                }));
            }

            currentHeroImgObj = img;
            canvas.add(img);
            canvas.renderAll();

            // Sync with sidebar box preview
            const boxImg = document.getElementById('heroBoxImg');
            const boxEmpty = document.getElementById('heroBoxEmpty');
            if (boxImg && boxEmpty) {
                boxImg.src = imgUrl;
                boxImg.style.display = 'block';
                boxEmpty.style.display = 'none';
            }

            if (currentPreviewMode === '3d') {
                update3dMockup();
            }
        }, { crossOrigin: 'anonymous' });
    }

    /**
     * Render KDP Visual Guides (Bleed, Trim, Spine, Margins)
     */
    function renderGuideOverlay(dims, sf) {
        const overlay = document.getElementById('guideOverlay');
        if (!overlay) return;

        if (!guidesVisible || currentPreviewMode === '3d') {
            overlay.innerHTML = '';
            overlay.style.display = 'none';
            return;
        }

        overlay.style.display = 'block';

        const bPx = dims.bleedPx * sf;
        const bStartX = dims.backCoverStartX * sf;
        const sStartX = dims.spineStartX * sf;
        const fStartX = dims.frontCoverStartX * sf;
        const fH = dims.fullHeightPx * sf;
        const fW = dims.fullWidthPx * sf;

        overlay.innerHTML = `
            <svg width="${fW}" height="${fH}" style="position: absolute; inset: 0; pointer-events: none;">
                <!-- Bleed Outer Guide (Draftsman dashed cyan/slate) -->
                <rect x="${bPx}" y="${bPx}" width="${fW - (bPx * 2)}" height="${fH - (bPx * 2)}" 
                      fill="none" stroke="#38bdf8" stroke-width="1" stroke-dasharray="4,4" opacity="0.75"/>
                
                <!-- Spine Folds (Draftsman dashed blue) -->
                <line x1="${sStartX}" y1="0" x2="${sStartX}" y2="${fH}" stroke="#3b82f6" stroke-width="1" stroke-dasharray="4,4" opacity="0.8"/>
                <line x1="${fStartX}" y1="0" x2="${fStartX}" y2="${fH}" stroke="#3b82f6" stroke-width="1" stroke-dasharray="4,4" opacity="0.8"/>
                
                <!-- Zone Labels (Clean monospaced pill badges) -->
                <text x="${bStartX + 16}" y="${bPx + 18}" fill="#38bdf8" font-size="9" font-family="'JetBrains Mono', monospace" font-weight="600" opacity="0.9">BACK COVER</text>
                <text x="${fStartX + 16}" y="${bPx + 18}" fill="#60a5fa" font-size="9" font-family="'JetBrains Mono', monospace" font-weight="600" opacity="0.9">FRONT COVER</text>
                <text x="${sStartX + 2}" y="${bPx + 18}" fill="#cbd5e1" font-size="8" font-family="'JetBrains Mono', monospace" font-weight="600" opacity="0.8" style="writing-mode: vertical-rl;">SPINE</text>
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
        document.getElementById('specSpineWidth').textContent = `${dims.spineWidthInches.toFixed(2)} in`;

        // Toolbar badges
        const toolbarTrim = document.getElementById('toolbarTrimBadge');
        if (toolbarTrim) toolbarTrim.textContent = `${dims.trimWidthInches}" × ${dims.trimHeightInches}"`;

        const toolbarPages = document.getElementById('toolbarPagesBadge');
        if (toolbarPages) toolbarPages.textContent = `${currentPageCount} Pgs`;

        const toolbarSpine = document.getElementById('toolbarSpineBadge');
        if (toolbarSpine) toolbarSpine.textContent = `Spine: ${dims.spineWidthInches.toFixed(2)}"`;

        // Spine eligibility banner
        const statusEl = document.getElementById('spineTextStatus');
        if (statusEl) {
            if (currentPageCount >= 79) {
                statusEl.innerHTML = '<i class="ri-checkbox-circle-fill"></i> <span>Spine text enabled (≥ 79 pages)</span>';
                statusEl.style.color = '#60a5fa';
                statusEl.style.borderColor = 'rgba(59, 130, 246, 0.25)';
                statusEl.style.background = 'rgba(37, 99, 235, 0.08)';
            } else {
                statusEl.innerHTML = '<i class="ri-alert-line"></i> <span>Spine too narrow for text (&lt; 79 pages)</span>';
                statusEl.style.color = '#f59e0b';
                statusEl.style.borderColor = 'rgba(245, 158, 11, 0.25)';
                statusEl.style.background = 'rgba(245, 158, 11, 0.08)';
            }
        }
    }

    /**
     * Render Realistic 3D Perspective Book Mockup with Full 360-Degree Mesh
     */
    function update3dMockup() {
        if (!canvas) return;

        const dims = calculateDimensions();
        const sf = scaleFactor;

        // 1. Extract Front Cover cropped snapshot
        const frontUrl = canvas.toDataURL({
            format: 'png',
            left: dims.frontCoverStartX * sf,
            top: dims.bleedPx * sf,
            width: dims.trimWidthPx * sf,
            height: dims.trimHeightPx * sf
        });

        // 2. Extract Spine cropped snapshot
        const spineUrl = canvas.toDataURL({
            format: 'png',
            left: dims.spineStartX * sf,
            top: dims.bleedPx * sf,
            width: dims.spineWidthPx * sf,
            height: dims.trimHeightPx * sf
        });

        // 3. Extract Back Cover cropped snapshot
        const backUrl = canvas.toDataURL({
            format: 'png',
            left: dims.backCoverStartX * sf,
            top: dims.bleedPx * sf,
            width: dims.trimWidthPx * sf,
            height: dims.trimHeightPx * sf
        });

        const frontImg = document.getElementById('book3dFrontImg');
        const spineImg = document.getElementById('book3dSpineImg');
        const backImg = document.getElementById('book3dBackImg');
        const bookObj = document.getElementById('book3dObject');

        if (frontImg) frontImg.src = frontUrl;
        if (spineImg) spineImg.src = spineUrl;
        if (backImg) backImg.src = backUrl;

        // Dynamic 3D depth based on spine width
        if (bookObj) {
            const depthPx = Math.max(16, Math.min(Math.round(dims.spineWidthInches * 48), 65));
            bookObj.style.setProperty('--spine-thickness', `${depthPx}px`);
        }
    }

    // 360 Orbit State
    let rotY = -25;
    let rotX = 10;
    let isDragging3D = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let isAutoSpinning = true;
    let spinAnimId = null;

    function apply3dRotation() {
        const stage = document.getElementById('book3dStage');
        if (stage) {
            stage.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        }
    }

    function startAutoSpin() {
        isAutoSpinning = true;
        const btn = document.getElementById('btn3dAutoSpin');
        if (btn) btn.classList.add('active');

        function spinLoop() {
            if (isAutoSpinning) {
                rotY = (rotY + 0.45) % 360;
                apply3dRotation();
                spinAnimId = requestAnimationFrame(spinLoop);
            }
        }
        cancelAnimationFrame(spinAnimId);
        spinAnimId = requestAnimationFrame(spinLoop);
    }

    function stopAutoSpin() {
        isAutoSpinning = false;
        cancelAnimationFrame(spinAnimId);
        const btn = document.getElementById('btn3dAutoSpin');
        if (btn) btn.classList.remove('active');
    }

    function toggleAutoSpin() {
        if (isAutoSpinning) {
            stopAutoSpin();
        } else {
            startAutoSpin();
        }
    }

    function set3dAngle(preset) {
        stopAutoSpin();
        const stage = document.getElementById('book3dStage');
        if (stage) stage.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';

        if (preset === 'front') { rotY = -12; rotX = 8; }
        else if (preset === 'spine') { rotY = -82; rotX = 6; }
        else if (preset === 'back') { rotY = 168; rotX = 8; }
        else if (preset === 'pages') { rotY = 82; rotX = 6; }

        apply3dRotation();

        setTimeout(() => {
            if (stage) stage.style.transition = 'none';
        }, 460);
    }

    function init3dOrbitController() {
        const container = document.getElementById('book3dContainer');
        if (!container) return;

        // Mouse Drag Orbit
        container.addEventListener('mousedown', (e) => {
            if (e.target.closest('.orbit-360-controls')) return;
            isDragging3D = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            stopAutoSpin();
            container.style.cursor = 'grabbing';
            const stage = document.getElementById('book3dStage');
            if (stage) stage.style.transition = 'none';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging3D) return;
            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;
            dragStartX = e.clientX;
            dragStartY = e.clientY;

            rotY += deltaX * 0.7;
            rotX = Math.max(-65, Math.min(65, rotX - (deltaY * 0.5)));
            apply3dRotation();
        });

        window.addEventListener('mouseup', () => {
            if (isDragging3D) {
                isDragging3D = false;
                if (container) container.style.cursor = 'grab';
            }
        });

        // Touch Drag Orbit for Mobile
        container.addEventListener('touchstart', (e) => {
            if (e.target.closest('.orbit-360-controls')) return;
            if (e.touches.length === 1) {
                isDragging3D = true;
                dragStartX = e.touches[0].clientX;
                dragStartY = e.touches[0].clientY;
                stopAutoSpin();
                const stage = document.getElementById('book3dStage');
                if (stage) stage.style.transition = 'none';
            }
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!isDragging3D || e.touches.length !== 1) return;
            const deltaX = e.touches[0].clientX - dragStartX;
            const deltaY = e.touches[0].clientY - dragStartY;
            dragStartX = e.touches[0].clientX;
            dragStartY = e.touches[0].clientY;

            rotY += deltaX * 0.8;
            rotX = Math.max(-65, Math.min(65, rotX - (deltaY * 0.55)));
            apply3dRotation();
        }, { passive: true });

        container.addEventListener('touchend', () => {
            isDragging3D = false;
        });

        apply3dRotation();
    }

    /**
     * Switch Between Full Wrap (2D Flat) and 3D Book Perspective
     */
    function switchPreviewCanvasMode(mode) {
        currentPreviewMode = mode;
        const outer2d = document.getElementById('canvasContainerOuter');
        const outer3d = document.getElementById('book3dContainer');
        const btnFlat = document.getElementById('viewFlatWrapBtn');
        const btn3d = document.getElementById('view3dBookBtn');

        if (mode === '3d') {
            if (outer2d) outer2d.style.display = 'none';
            if (outer3d) outer3d.style.display = 'flex';
            if (btnFlat) btnFlat.classList.remove('active');
            if (btn3d) btn3d.classList.add('active');
            update3dMockup();
            startAutoSpin();
        } else {
            stopAutoSpin();
            if (outer2d) outer2d.style.display = 'flex';
            if (outer3d) outer3d.style.display = 'none';
            if (btnFlat) btnFlat.classList.add('active');
            if (btn3d) btn3d.classList.remove('active');
            const dims = calculateDimensions();
            renderGuideOverlay(dims, scaleFactor);
        }
    }

    /**
     * Apply Curated Cover Design Template
     */
    function applyCoverTemplate(templateId) {
        const tmpl = COVER_TEMPLATES[templateId];
        if (!tmpl) return;

        currentTemplate = templateId;
        currentBgColor = tmpl.bg;

        // Update Inputs
        const bgSelect = document.getElementById('bgPresetSelect');
        if (bgSelect) bgSelect.value = tmpl.bg;

        const customColor = document.getElementById('customBgColor');
        if (customColor) customColor.value = tmpl.bg;

        const titleColorInput = document.getElementById('titleColorInput');
        if (titleColorInput) titleColorInput.value = tmpl.titleColor;

        const fontSelect = document.getElementById('fontFamilySelect');
        if (fontSelect) fontSelect.value = tmpl.fontFamily;

        // Update active chip
        document.querySelectorAll('.template-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.template === templateId);
        });

        // Rebuild Canvas
        buildCoverElements();
    }

    /**
     * Bind all Interactive UI Controls
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

        // Paper Type
        document.getElementById('kdpPaperType').addEventListener('change', (e) => {
            currentPaperType = e.target.value;
            updateKdpCalculations();
            initCanvas();
        });

        // Background Color Preset
        document.getElementById('bgPresetSelect').addEventListener('change', (e) => {
            currentBgColor = e.target.value;
            document.getElementById('customBgColor').value = currentBgColor;
            if (bgRect) {
                bgRect.set('fill', currentBgColor);
                canvas.renderAll();
                if (currentPreviewMode === '3d') update3dMockup();
            }
        });

        // Custom Background Color
        document.getElementById('customBgColor').addEventListener('input', (e) => {
            currentBgColor = e.target.value;
            if (bgRect) {
                bgRect.set('fill', currentBgColor);
                canvas.renderAll();
                if (currentPreviewMode === '3d') update3dMockup();
            }
        });

        // Text Inputs Dynamic Redraw
        ['frontTitleInput', 'frontSubtitleInput', 'frontAuthorInput', 'backHeadlineInput', 'spineTitleInput'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    buildCoverElements();
                });
            }
        });

        // Back Blurb
        const blurbEl = document.getElementById('backBlurbInput');
        if (blurbEl) {
            blurbEl.addEventListener('input', (e) => {
                if (backBlurbText) {
                    backBlurbText.set('text', e.target.value);
                    canvas.renderAll();
                }
            });
        }

        // Barcode Toggle
        const barcodeToggle = document.getElementById('showBarcodeToggle');
        if (barcodeToggle) {
            barcodeToggle.addEventListener('change', (e) => {
                if (barcodeBox) {
                    barcodeBox.set('visible', e.target.checked);
                    canvas.renderAll();
                }
            });
        }

        // Font Family Select - Apply to ALL text elements
        document.getElementById('fontFamilySelect').addEventListener('change', (e) => {
            const font = e.target.value;
            const weight = (font === 'Comic Sans MS') ? 'bold' : '700';
            const titleWeight = (font === 'Comic Sans MS') ? 'bold' : '800';

            if (frontTitleText) {
                frontTitleText.set('fontFamily', font);
                frontTitleText.set('fontWeight', titleWeight);
            }
            if (frontSubtitleText) {
                frontSubtitleText.set('fontFamily', font);
                frontSubtitleText.set('fontWeight', weight);
            }
            if (frontAuthorText) {
                frontAuthorText.set('fontFamily', font);
                frontAuthorText.set('fontWeight', weight);
            }
            if (backHeadlineText) {
                backHeadlineText.set('fontFamily', font);
                backHeadlineText.set('fontWeight', weight);
            }
            if (backBlurbText) {
                backBlurbText.set('fontFamily', font);
                backBlurbText.set('fontWeight', weight);
            }
            if (bulletText) {
                bulletText.set('fontFamily', font);
                bulletText.set('fontWeight', weight);
            }
            if (categoryTag) {
                categoryTag.set('fontFamily', font);
                categoryTag.set('fontWeight', weight);
            }
            if (colophon) {
                colophon.set('fontFamily', font);
                colophon.set('fontWeight', weight);
            }
            if (badgeLabel) {
                badgeLabel.set('fontFamily', font);
                badgeLabel.set('fontWeight', weight);
            }
            if (spineTitleText) {
                spineTitleText.set('fontFamily', font);
                spineTitleText.set('fontWeight', weight);
            }
            canvas.renderAll();
            if (currentPreviewMode === '3d') update3dMockup();
        });

        // Title Color Input
        document.getElementById('titleColorInput').addEventListener('input', (e) => {
            if (frontTitleText) {
                frontTitleText.set('fill', e.target.value);
                canvas.renderAll();
                if (currentPreviewMode === '3d') update3dMockup();
            }
        });

        // Hero Scale Slider
        document.getElementById('heroScaleSlider').addEventListener('input', (e) => {
            if (currentHeroImgObj) {
                const dims = calculateDimensions();
                const sf = scaleFactor;
                const baseScale = (dims.trimWidthPx * sf * 0.72) / currentHeroImgObj.width;
                const factor = parseFloat(e.target.value);
                currentHeroImgObj.set({
                    scaleX: baseScale * factor,
                    scaleY: baseScale * factor
                });
                canvas.renderAll();
                if (currentPreviewMode === '3d') update3dMockup();
            }
        });

        // Hero Shadow Toggle
        document.getElementById('heroShadowToggle').addEventListener('change', (e) => {
            if (currentHeroImgObj) {
                if (e.target.checked) {
                    currentHeroImgObj.set('shadow', new fabric.Shadow({
                        color: 'rgba(0, 0, 0, 0.75)',
                        blur: 24,
                        offsetX: 0,
                        offsetY: 8
                    }));
                } else {
                    currentHeroImgObj.set('shadow', null);
                }
                canvas.renderAll();
                if (currentPreviewMode === '3d') update3dMockup();
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
            if (confirm('Reset cover layout to default Kodeco template?')) {
                applyCoverTemplate('kodeco');
                initCanvas();
            }
        });

        // Export Full PDF
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

        canvas.setWidth(Math.round(dims.fullWidthPx * scaleFactor));
        canvas.setHeight(Math.round(dims.fullHeightPx * scaleFactor));

        buildCoverElements();
        renderGuideOverlay(dims, scaleFactor);

        const zoomLabel = document.getElementById('zoomLevel');
        if (zoomLabel) {
            zoomLabel.textContent = `${Math.round((scaleFactor / 0.25) * 100)}%`;
        }
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
                    <span style="font-weight: 700; color: #fff;">${asset.title}</span>
                    <span style="font-size: 0.65rem; color: #60a5fa; display: block;">${asset.tag}</span>
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

    // Expose helpers globally
    window.fitCanvasToViewport = initCanvas;
    window.exportFullWrapPdf = exportFullWrapPdf;
    window.switchPreviewCanvasMode = switchPreviewCanvasMode;
    window.applyCoverTemplate = applyCoverTemplate;
    window.set3dAngle = set3dAngle;
    window.toggleAutoSpin = toggleAutoSpin;

})();
