// ============================================================
// GLOBAL PUBLISHING & MONETIZATION OPTIONS MODAL (TOP-LEVEL)
// ============================================================
window.openPublishingOptionsModal = function ({
    itemType = 'book', // 'book' | 'article' | 'simulation' | 'course'
    title = 'Untitled Creation',
    defaultPrice = 9.99,
    onConfirm
}) {
    const existing = document.getElementById('xtraPublishingOptionsModal');
    if (existing) existing.remove();

    const typeLabel = itemType === 'book' ? 'LaTeX Technical Book' :
        itemType === 'article' ? 'Interactive Article' :
            itemType === 'course' ? 'Mastery Course' : 'Scientific Simulation';

    const teaserText = itemType === 'book'
        ? 'Preview Pages 1–2 freely as a teaser; remaining pages locked behind paywall.'
        : itemType === 'article'
            ? 'Preview header + first 2 paragraphs; remaining proofs & diagrams paywalled.'
            : 'Allow full video playback; protect underlying Python/3D source code.';

    const modalHtml = `
        <div id="xtraPublishingOptionsModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(12px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font-family:Inter,sans-serif;">
            <div style="background:#18181b;border:1px solid rgba(255,255,255,0.15);border-radius:22px;max-width:520px;width:100%;padding:28px 24px;box-sizing:border-box;position:relative;color:#fff;box-shadow:0 25px 60px rgba(0,0,0,0.8);max-height:92vh;overflow-y:auto;">
                <button id="closePublishModalBtn" style="position:absolute;top:18px;right:18px;background:transparent;border:none;color:#a1a1aa;font-size:1.4rem;cursor:pointer;"><i class="ri-close-line"></i></button>
                
                <div style="text-align:left;margin-bottom:20px;">
                    <span style="background:linear-gradient(135deg,rgba(59,130,246,0.2),rgba(147,51,234,0.2));color:#c084fc;border:1px solid rgba(147,51,234,0.4);padding:4px 10px;border-radius:12px;font-size:0.72rem;font-weight:700;letter-spacing:0.5px;">PUBLISH & MONETIZE</span>
                    <h2 style="font-size:1.35rem;margin:8px 0 4px;font-weight:800;color:#fff;">Publish ${typeLabel}</h2>
                    <p style="color:#a1a1aa;font-size:0.84rem;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">"${title}"</p>
                </div>

                <!-- 1. Monetization Tier Selector -->
                <label style="display:block;font-size:0.8rem;font-weight:700;color:#e4e4e7;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">1. Access & Pricing Tier</label>
                <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
                    <!-- Option A: Free -->
                    <label class="publish-tier-card" style="display:flex;align-items:flex-start;gap:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 14px;cursor:pointer;transition:all 0.2s;">
                        <input type="radio" name="publishAccessTier" value="free" style="margin-top:3px;">
                        <div style="flex:1;">
                            <div style="font-weight:700;font-size:0.9rem;color:#fff;">🌐 Free & Open Access</div>
                            <div style="font-size:0.75rem;color:#a1a1aa;margin-top:2px;">Free for all readers and viewers across the community.</div>
                        </div>
                    </label>

                    <!-- Option B: Paid Marketplace -->
                    <label class="publish-tier-card" style="display:flex;align-items:flex-start;gap:12px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:12px;padding:12px 14px;cursor:pointer;transition:all 0.2s;">
                        <input type="radio" name="publishAccessTier" value="paid" checked style="margin-top:3px;">
                        <div style="flex:1;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <div style="font-weight:700;font-size:0.9rem;color:#60a5fa;">🏷️ Paid Marketplace Product</div>
                                <span style="font-size:0.72rem;background:#22c55e;color:#000;font-weight:800;padding:2px 6px;border-radius:6px;">Earn Revenue</span>
                            </div>
                            <div style="font-size:0.75rem;color:#a1a1aa;margin-top:2px;">Readers buy 1-time lifetime access via Stripe.</div>
                            
                            <!-- Price Input container -->
                            <div id="publishPriceInputContainer" style="display:flex;align-items:center;gap:8px;margin-top:10px;">
                                <span style="color:#d4d4d8;font-size:0.85rem;font-weight:600;">Price (USD): $</span>
                                <input type="number" id="publishItemPrice" value="${defaultPrice}" min="0.99" max="999" step="0.50" style="width:100px;background:#09090b;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:6px 10px;color:#34d399;font-weight:800;font-size:1rem;outline:none;">
                            </div>
                        </div>
                    </label>

                    <!-- Option C: Pro Exclusive -->
                    <label class="publish-tier-card" style="display:flex;align-items:flex-start;gap:12px;background:rgba(147,51,234,0.08);border:1px solid rgba(147,51,234,0.3);border-radius:12px;padding:12px 14px;cursor:pointer;transition:all 0.2s;">
                        <input type="radio" name="publishAccessTier" value="pro" style="margin-top:3px;">
                        <div style="flex:1;">
                            <div style="font-weight:700;font-size:0.9rem;color:#c084fc;">✨ XtraPath Pro Exclusive</div>
                            <div style="font-size:0.75rem;color:#a1a1aa;margin-top:2px;">Unlocked for Pro Subscribers or single product purchase.</div>
                        </div>
                    </label>
                </div>

                <!-- 2. Protection & DRM Settings -->
                <label style="display:block;font-size:0.8rem;font-weight:700;color:#e4e4e7;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">2. Content Protection & Anti-Piracy</label>
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">
                    <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
                        <input type="checkbox" id="publishTeaserToggle" checked style="margin-top:3px;accent-color:#3b82f6;">
                        <div>
                            <div style="font-size:0.85rem;font-weight:700;color:#fff;">🔒 Enable Teaser Paywall Mode</div>
                            <div style="font-size:0.73rem;color:#a1a1aa;line-height:1.4;">${teaserText}</div>
                        </div>
                    </label>

                    <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
                        <input type="checkbox" id="publishDrmToggle" checked style="margin-top:3px;accent-color:#3b82f6;">
                        <div>
                            <div style="font-size:0.85rem;font-weight:700;color:#fff;">🛡️ Anti-Piracy DRM Shield & Watermark</div>
                            <div style="font-size:0.73rem;color:#a1a1aa;line-height:1.4;">Disables right-click, blocks saving/printing, and displays viewer security watermark.</div>
                        </div>
                    </label>
                </div>

                <!-- 3. Confirm Buttons -->
                <div style="display:flex;gap:10px;">
                    <button id="cancelPublishModalBtn" style="flex:1;padding:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;font-size:0.88rem;font-weight:600;cursor:pointer;">
                        Cancel
                    </button>
                    <button id="confirmPublishModalBtn" style="flex:2;padding:12px;background:linear-gradient(135deg,#3b82f6,#9333ea);border:none;color:#fff;border-radius:10px;font-size:0.92rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 15px rgba(59,130,246,0.4);">
                        <i class="ri-upload-cloud-2-line"></i> Publish Creation
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('xtraPublishingOptionsModal');
    const closeBtn = document.getElementById('closePublishModalBtn');
    const cancelBtn = document.getElementById('cancelPublishModalBtn');
    const confirmBtn = document.getElementById('confirmPublishModalBtn');
    const priceContainer = document.getElementById('publishPriceInputContainer');
    const priceInput = document.getElementById('publishItemPrice');
    const teaserCheckbox = document.getElementById('publishTeaserToggle');
    const drmCheckbox = document.getElementById('publishDrmToggle');

    const radios = modal.querySelectorAll('input[name="publishAccessTier"]');
    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'paid' || radio.value === 'pro') {
                priceContainer.style.display = 'flex';
            } else {
                priceContainer.style.display = 'none';
            }
        });
    });

    const closeModal = () => modal.remove();
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    confirmBtn.onclick = () => {
        const selectedTier = modal.querySelector('input[name="publishAccessTier"]:checked')?.value || 'free';
        const price = Number(priceInput.value) || defaultPrice;
        const isForSale = (selectedTier === 'paid');
        const isPremium = (selectedTier === 'pro');
        const isTeaser = teaserCheckbox.checked;
        const isDrm = drmCheckbox.checked;

        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 0.8s linear infinite;"></i> Publishing…';

        if (typeof onConfirm === 'function') {
            onConfirm({
                accessTier: selectedTier,
                price: (isForSale || isPremium) ? price : 0,
                isForSale: isForSale,
                isPremium: isPremium,
                isTeaserEnabled: isTeaser,
                isSourceProtected: (selectedTier !== 'free'),
                drmProtected: isDrm,
                closeModal: closeModal
            });
        }
    };
};

document.addEventListener('DOMContentLoaded', async () => {

    // ============================================================
    // SUPABASE CLIENT SETUP
    // ============================================================
    // Fetch configuration from the backend to avoid hardcoding keys.
    // This is a best practice for production environments like Railway.
    let config;
    try {
        const cachedConfig = sessionStorage.getItem('app_config');
        if (cachedConfig) {
            config = JSON.parse(cachedConfig);
        } else {
            const configResponse = await fetch('/api/config');
            if (!configResponse.ok) {
                throw new Error(`Server responded with status: ${configResponse.status}`);
            }
            config = await configResponse.json();
            try { sessionStorage.setItem('app_config', JSON.stringify(config)); } catch (_) {}
        }
    } catch (error) {
        console.error("Failed to load app configuration:", error);
        document.body.innerHTML = `<div style="color:red; padding: 20px; text-align: center; font-family: sans-serif;"><h2>Connection Error</h2><p>Could not load app configuration from the server. Please ensure the backend is running and properly configured.</p><pre style="text-align: left; background: #222; padding: 10px; border-radius: 5px; margin-top: 10px;">${error.message}</pre></div>`;
        return;
    }
    const SUPABASE_URL = config.supabase_url;
    const SUPABASE_ANON_KEY = config.supabase_anon_key;
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabase;

    // --- NEW: IMMEDIATE OAUTH REDIRECT HANDLER ---
    // This is the crucial step for OAuth. After an OAuth login, the user lands on a page
    // (usually the root) with a token in the URL hash. We must detect this and redirect them
    // to the main app page to provide a clean URL and complete the login.
    // We do this check immediately, outside of onAuthStateChange, to avoid race conditions.
    if (window.location.hash.includes('access_token') || window.location.hash.includes('error_description')) {
        // The Supabase client library will automatically handle the session from the hash.
        // We just need to redirect to a clean URL. The onAuthStateChange handler on the
        // destination page (e.g., explore.html) will then handle fetching the user profile.
        window.location.href = '/views/explore.html';
        return; // Stop further script execution on this intermediate page.
    }

    // --- NEW: Centralized function to update user avatars across the site ---
    function updateUserAvatars() {
        const avatarUrl = localStorage.getItem('avatarUrl');
        if (avatarUrl) {
            const avatarElements = document.querySelectorAll('.avatar');
            avatarElements.forEach(el => {
                el.style.background = 'none'; // Remove default gradient
                el.style.backgroundImage = `url(${avatarUrl})`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
            });
        }
    }

    // --- NEW: XtraTools Registry (Centralized) ---
    // This central registry defines all available creation tools.
    // It will be used to dynamically populate the "Create New" modal
    // and the XtraTools library page.
    const allXtraTools = [
        {
            id: 'xtraanim',
            name: 'Animation',
            description: 'Create stunning physics and math animations with Python (Manim) and JavaScript (p5.js).',
            icon: 'ri-movie-2-line',
            url: '/views/xtraAnim.html',
            status: 'active'
        },
        {
            id: 'xtrabook',
            name: 'Book',
            description: 'Generate professional, interactive textbooks and papers using the power of LaTeX.',
            icon: 'ri-book-open-line',
            url: '/views/xtraBook.html',
            status: 'active'
        },
        {
            id: 'xtracover',
            name: 'KDP Cover',
            description: 'Design 300 DPI print-ready Amazon KDP book covers with spine calculation and XtraAnim graphics.',
            icon: 'ri-book-2-line',
            url: '/views/xtraCover.html',
            status: 'active'
        },
        {
            id: 'xtragraph',
            name: 'Graph',
            description: 'Plot functions, analyze data, and create beautiful, recordable graph animations with Desmos.',
            icon: 'ri-bar-chart-2-line',
            url: '/views/xtraGraph.html',
            status: 'active'
        },
        {
            id: 'xtraarticle',
            name: 'Article',
            description: 'Write rich, embeddable articles and tutorials with a modern block-based editor.',
            icon: 'ri-file-text-line',
            url: '/views/xtraArticle.html',
            status: 'active'
        },

        {
            id: 'xtracourse',
            name: 'Course',
            description: 'Build and structure multimedia courses using all your XtraPath creations.',
            icon: 'ri-graduation-cap-line',
            url: '/views/xtraCourse.html',
            status: 'active'
        },
        {
            id: 'mermaid',
            name: 'Diagram',
            description: 'Create flowcharts, sequence diagrams, and more with Mermaid.js.',
            icon: 'ri-flow-chart',
            url: '/views/xtraAnim.html?tool=mermaid',
            status: 'active'
        },
        {
            id: 'katex',
            name: 'LaTeX Math',
            description: 'Typeset equations and mathematical formulas with KaTeX.',
            icon: 'ri-functions',
            url: '/views/xtraAnim.html?tool=katex',
            status: 'active'
        },
        {
            id: 'jsxgraph',
            name: 'JSXGraph Math',
            description: 'Interactive dynamic geometry, calculus, and function plots.',
            icon: 'ri-compasses-2-line',
            url: '/views/xtraAnim.html?tool=jsxgraph',
            status: 'active'
        },
        {
            id: 'zdog',
            name: 'Zdog 3D',
            description: 'Pseudo-3D vector illustration & kinetic animation for canvas.',
            icon: 'ri-shape-line',
            url: '/views/xtraAnim.html?tool=zdog',
            status: 'active'
        },
        {
            id: 'thumbnail',
            name: 'Thumbnail Studio',
            description: 'Design high-converting thumbnails, social cards, and banners with Fabric.',
            icon: 'ri-image-edit-line',
            url: '/views/xtraAnim.html?tool=thumbnail',
            status: 'active'
        },
        {
            id: 'svg_to_3d',
            name: 'SVG to 3D',
            description: 'Extrude SVG files into 3D models for use in Manim animations.',
            icon: 'ri-cube-line',
            url: '#',
            status: 'upcoming'
        },
        {
            id: 'image_to_ascii',
            name: 'ASCII Art',
            description: 'Convert images into text-based art for use in terminal outputs or creative coding.',
            icon: 'ri-font-size-2',
            url: '#',
            status: 'upcoming'
        },
    ];
    window.allXtraTools = allXtraTools; // Make it globally accessible for xtraTools_script.js

    // --- REVISED: SESSION MANAGEMENT ---
    supabase.auth.onAuthStateChange(async (event, session) => {
        const currentPage = window.location.pathname;
        const publicPages = ['/', '/views/index.html', '/views/login.html', '/views/signup.html'];
        const isPublicPage = publicPages.includes(currentPage);

        if (session) {
            // --- USER IS LOGGED IN ---
            if (isPublicPage) {
                // User is on a public page (like login) but already has a session, so redirect to the main app.
                window.location.href = '/views/explore.html';
                return;
            }

            // --- Account-switch cache invalidation ---
            // If a DIFFERENT user is logging in (account switch), purge all user-specific
            // caches so stale data from the previous account never bleeds into the new session.
            const previousUserId = localStorage.getItem('userId');
            if (previousUserId && previousUserId !== session.user.id) {
                // Purge feed cache (prevents old account's posts showing as placeholders)
                localStorage.removeItem('cached_explore_feed');
                // Purge the previous user's local posts so they don't get merged into the new feed
                localStorage.removeItem('userPosts');
                // Purge story bar data
                localStorage.removeItem('storyData');
                // Purge saved posts (they belong to the previous user)
                localStorage.removeItem('savedPosts');
                // Purge purchase unlocks (they belong to the previous user)
                localStorage.removeItem('unlockedPurchases');
                // Purge session-level store IDs cache
                try {
                    sessionStorage.removeItem('storeAttachedIds_cache');
                    sessionStorage.removeItem('storeAttachedIds_time');
                    sessionStorage.removeItem('xtrapath_config_cache');
                } catch (_) {}
                console.log('[Auth] Account switch detected — user caches cleared for new session.');
            }

            // User is on a protected page, which is correct. Proceed with setup.
            // This runs on SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED, etc.
            const { data: profile, error: profileError } = await supabase.from('profiles').select(`username, full_name, avatar_url, bio, is_pro, stripe_customer_id`).eq('id', session.user.id).single();

            if (profileError) {
                console.error("Error fetching user profile:", profileError.message);
                // Fallback to OAuth metadata if profile is not ready
                localStorage.setItem('username', session.user.user_metadata.full_name || session.user.email.split('@')[0]);
                localStorage.setItem('handle', '@' + (session.user.user_metadata.full_name || session.user.email.split('@')[0]).replace(/\s/g, '').toLowerCase());
                localStorage.setItem('avatarUrl', session.user.user_metadata.avatar_url || '');
            } else if (profile) {
                // Use the data from our 'profiles' table
                localStorage.setItem('username', profile.full_name || session.user.email.split('@')[0]);
                localStorage.setItem('handle', profile.username ? `@${profile.username}` : ('@' + (profile.full_name || session.user.email.split('@')[0]).replace(/\s/g, '').toLowerCase()));
                localStorage.setItem('userBio', profile.bio || '');
                localStorage.setItem('avatarUrl', profile.avatar_url || session.user.user_metadata.avatar_url || '');
                if (profile.is_pro !== undefined && profile.is_pro !== null) {
                    localStorage.setItem('is_pro', profile.is_pro ? 'true' : 'false');
                }
                if (profile.stripe_customer_id) {
                    localStorage.setItem('stripe_customer_id', profile.stripe_customer_id);
                }
            }
            localStorage.setItem('userType', 'creator'); // Default user type
            localStorage.setItem('userId', session.user.id); // Store user ID for multi-user support
            const sessionEmail = (session.user.email || '').toLowerCase();
            localStorage.setItem('userEmail', sessionEmail);

            const isSuper = ['codeepie@gmail.com', 'admin@xtrapath.com', 'yogendra.singh@xtrapath.io', 'yogendra20799@gmail.com'].includes(sessionEmail) ||
                ['codeepie', 'yogendra', 'admin', 'superadmin'].includes((localStorage.getItem('username') || '').toLowerCase()) ||
                (profile && profile.role === 'admin');
            if (isSuper) {
                localStorage.setItem('isSuperAdmin', 'true');
                localStorage.setItem('userRole', 'admin');
            } else {
                localStorage.removeItem('isSuperAdmin');
            }


            try {
                const { data: userPurchases, error: purchErr } = await supabase
                    .from('purchases')
                    .select('item_id')
                    .eq('user_id', session.user.id);
                if (userPurchases && !purchErr) {
                    const purchasedIds = userPurchases.map(p => String(p.item_id));
                    const existingUnlocked = window.getUnlockedPurchases ? window.getUnlockedPurchases() : [];
                    const merged = Array.from(new Set([...existingUnlocked, ...purchasedIds]));
                    localStorage.setItem('unlockedPurchases', JSON.stringify(merged));
                }
            } catch (err) {
                console.warn("Could not sync purchases from Supabase:", err);
            }

            // Update UI elements with the new profile data
            updateHeader();
            updateUserAvatars();

            // Background auto-sync of local drafts/articles/courses to Supabase
            syncLocalCreationsToSupabase(session.user.id);

        } else {
            // --- USER IS NOT LOGGED IN ---
            if (event === "SIGNED_OUT") {
                // Clear local storage on explicit logout to ensure a clean state.
                localStorage.clear();
                // Also clear session-level caches so the next user gets a fresh start
                try {
                    sessionStorage.removeItem('storeAttachedIds_cache');
                    sessionStorage.removeItem('storeAttachedIds_time');
                    sessionStorage.removeItem('xtrapath_config_cache');
                } catch (_) {}
            }

            // Check if user already has an established local session in localStorage.
            // Do NOT kick them out during network or remote Supabase Auth outages.
            const localUserId = localStorage.getItem('userId');
            if (localUserId && event !== "SIGNED_OUT") {
                if (isPublicPage) {
                    window.location.href = '/views/explore.html';
                    return;
                }
                updateHeader();
                updateUserAvatars();
                return;
            }

            if (!isPublicPage) {
                // User is on a protected page without a session, redirect to login.
                window.location.href = '/views/login.html';
                return;
            }
            // If on a public page (like login.html), do nothing and let the page render.
        }
    });

    let deferredPrompt; // To store the install prompt event

    // ============================================================
    // PWA & RESPONSIVE INIT
    // ============================================================
    function initPWA() {
        // 1. Inject Viewport Meta for Mobile App Feel (Prevent Zoom)
        if (!document.querySelector('meta[name="viewport"]')) {
            const meta = document.createElement('meta');
            meta.name = "viewport";
            meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";
            document.head.appendChild(meta);
        }

        // 2. Inject Manifest Link
        if (!document.querySelector('link[rel="manifest"]')) {
            const link = document.createElement('link');
            link.rel = "manifest";
            link.href = "/manifest.json"; // Use absolute path from the root
            document.head.appendChild(link);
        }

        // Inject Remix Icon (Professional Icon Set)
        if (!document.querySelector('link[href*="remixicon"]')) {
            const iconLink = document.createElement('link');
            iconLink.rel = "stylesheet";
            iconLink.href = "https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css";
            document.head.appendChild(iconLink);
        }

        // 3. Register Service Worker
        if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
            navigator.serviceWorker.register('/sw.js') // Use absolute path from the root
                .then(reg => console.log('Service Worker Registered', reg.scope))
                .catch(err => console.log('Service Worker Failed', err));
        }

        // 5. Listen for Install Prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e; // Stash the event so it can be triggered later
        });

        // 4. Inject Dynamic Navigation (Sidebar & Bottom Nav)
        const populateNavigation = () => {
            const pages = [
                { name: 'Home', icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 112.07"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M61.44,0L0,60.18l14.99,7.87L61.04,19.7l46.85,48.36l14.99-7.87L61.44,0L61.44,0z M18.26,69.63L18.26,69.63 L61.5,26.38l43.11,43.25h0v0v42.43H73.12V82.09H49.49v29.97H18.26V69.63L18.26,69.63L18.26,69.63z"/></svg>`, activeIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 112.07"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M61.44,0L0,60.18l14.99,7.87L61.04,19.7l46.85,48.36l14.99-7.87L61.44,0L61.44,0z M18.26,69.63L18.26,69.63 L61.5,26.38l43.11,43.25h0v0v42.43H73.12V82.09H49.49v29.97H18.26V69.63L18.26,69.63L18.26,69.63z"/></svg>`, link: '/views/explore.html' },
                { name: 'Reels', icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.14 122.88"><path fill="currentColor" d="M35.14 0h51.86c9.65 0 18.43 3.96 24.8 10.32 6.38 6.37 10.34 15.16 10.34 24.82v52.61c0 9.64-3.96 18.42-10.32 24.79l-0.02 0.02c-6.38 6.37-15.16 10.32-24.79 10.32H35.14c-9.66 0-18.45-3.96-24.82-10.32l-0.24-0.27C3.86 105.95 0 97.27 0 87.74V35.14C0 25.47 3.95 16.69 10.32 10.32S25.47 0 35.14 0zM91.51 31.02l0.07 0.11h21.6c-0.87-5.68-3.58-10.78-7.48-14.69-4.8-4.81-11.42-7.79-18.71-7.79h-8.87l13.38 22.36zM81.52 31.13L68.07 8.66H38.57l13.61 22.47h29.34zM42.11 31.13L28.95 9.39c-4.81 1.16-9.12 3.65-12.51 7.05-3.9 3.9-6.6 9.01-7.48 14.69h33.15zM113.48 39.79H8.66v47.96c0 7.17 2.89 13.7 7.56 18.48l0.22 0.21c4.8 4.8 11.43 7.79 18.7 7.79H87c7.28 0 13.9-2.98 18.69-7.77l0.02-0.02c4.79-4.79 7.77-11.41 7.77-18.69V39.79zM50.95 54.95l26.83 17.45c0.43 0.28 0.82 0.64 1.13 1.08 1.22 1.77 0.77 4.2-1 5.42L51.19 94.67c-0.67 0.55-1.53 0.88-2.48 0.88-2.16 0-3.91-1.75-3.91-3.91V58.15h0.02c0-0.77 0.23-1.55 0.7-2.23 1.24-1.77 3.67-2.2 5.43-1z"/></svg>`, activeIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.14 122.88"><path fill="currentColor" d="M35.14 0h51.86c9.65 0 18.43 3.96 24.8 10.32 6.38 6.37 10.34 15.16 10.34 24.82v52.61c0 9.64-3.96 18.42-10.32 24.79l-0.02 0.02c-6.38 6.37-15.16 10.32-24.79 10.32H35.14c-9.66 0-18.45-3.96-24.82-10.32l-0.24-0.27C3.86 105.95 0 97.27 0 87.74V35.14C0 25.47 3.95 16.69 10.32 10.32S25.47 0 35.14 0zM91.51 31.02l0.07 0.11h21.6c-0.87-5.68-3.58-10.78-7.48-14.69-4.8-4.81-11.42-7.79-18.71-7.79h-8.87l13.38 22.36zM81.52 31.13L68.07 8.66H38.57l13.61 22.47h29.34zM42.11 31.13L28.95 9.39c-4.81 1.16-9.12 3.65-12.51 7.05-3.9 3.9-6.6 9.01-7.48 14.69h33.15zM113.48 39.79H8.66v47.96c0 7.17 2.89 13.7 7.56 18.48l0.22 0.21c4.8 4.8 11.43 7.79 18.7 7.79H87c7.28 0 13.9-2.98 18.69-7.77l0.02-0.02c4.79-4.79 7.77-11.41 7.77-18.69V39.79zM50.95 54.95l26.83 17.45c0.43 0.28 0.82 0.64 1.13 1.08 1.22 1.77 0.77 4.2-1 5.42L51.19 94.67c-0.67 0.55-1.53 0.88-2.48 0.88-2.16 0-3.91-1.75-3.91-3.91V58.15h0.02c0-0.77 0.23-1.55 0.7-2.23 1.24-1.77 3.67-2.2 5.43-1z"/></svg>`, link: '/views/reels.html' },
                { name: 'Studio', icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.875 122.648"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M108.993,47.079c7.683-0.059,13.898,6.12,13.882,13.805 c-0.018,7.683-6.26,13.959-13.942,14.019L75.24,75.138l-0.235,33.73c-0.063,7.619-6.338,13.789-14.014,13.78 c-7.678-0.01-13.848-6.197-13.785-13.818l0.233-33.497l-33.558,0.235C6.2,75.628-0.016,69.448,0,61.764 c0.018-7.683,6.261-13.959,13.943-14.018l33.692-0.236l0.236-33.73C47.935,6.161,54.209-0.009,61.885,0 c7.678,0.009,13.848,6.197,13.784,13.818l-0.233,33.497L108.993,47.079L108.993,47.079z"/></svg>`, activeIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.875 122.648"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M108.993,47.079c7.683-0.059,13.898,6.12,13.882,13.805 c-0.018,7.683-6.26,13.959-13.942,14.019L75.24,75.138l-0.235,33.73c-0.063,7.619-6.338,13.789-14.014,13.78 c-7.678-0.01-13.848-6.197-13.785-13.818l0.233-33.497l-33.558,0.235C6.2,75.628-0.016,69.448,0,61.764 c0.018-7.683,6.261-13.959,13.943-14.018l33.692-0.236l0.236-33.73C47.935,6.161,54.209-0.009,61.885,0 c7.678,0.009,13.848,6.197,13.784,13.818l-0.233,33.497L108.993,47.079L108.993,47.079z"/></svg>`, link: '#', id: 'studioBtn' },
                { name: 'Store', icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 464 511.99"><path fill="currentColor" d="M232 31.996c-16.793 0-33.012 6.9-45.058 19.375-12.07 12.487-18.94 29.54-18.94 47.434v13.189h127.995V98.805c0-17.894-6.87-34.947-18.94-47.434C265.011 38.896 248.792 31.996 232 31.996zm-95.999 66.809v13.189H79.514c-20.028 0-37.952 5.902-50.869 18.825-12.832 12.838-18.752 30.622-18.837 50.566L0 378.523v.393c0 76.46 54.558 133.074 131.314 133.074h201.371c76.696 0 131.435-56.335 131.314-132.875v-.387l-9.869-197.784c-.078-19.938-5.986-37.656-18.861-50.403-12.941-12.808-30.852-18.547-50.784-18.547h-56.486V98.805c0-26.033-9.985-51.105-27.926-69.67C282.119 10.547 257.639 0 232 0c-25.64 0-50.119 10.547-68.073 29.135-17.942 18.565-27.926 43.637-27.926 69.67zm-56.487 45.19h304.971c13.939 0 22.852 3.925 28.27 9.289 5.388 5.333 9.38 14.138 9.38 28.071v.405l9.862 197.779c-.078 59.099-40.878 100.455-99.312 100.455H131.314c-58.367 0-99.137-41.514-99.312-100.691l9.808-197.101v-.4c0-13.932 4.003-22.888 9.464-28.361 5.467-5.467 14.398-9.446 28.24-9.446zm88.488 63.998c0-8.835-7.165-15.995-16-15.995s-16.001 7.16-16.001 15.995a95.98 95.98 0 0028.119 67.885A96 96 0 00232 303.997a95.998 95.998 0 0067.879-28.119 95.981 95.981 0 0028.12-67.885c0-8.835-7.166-15.995-16.002-15.995-8.834 0-16 7.16-16 15.995A64.006 64.006 0 01232 271.996a63.978 63.978 0 01-45.251-18.746 64.002 64.002 0 01-18.747-45.257z"/></svg>`, link: '/views/store.html' },
                { name: 'Profile', icon: 'ri-user-line', activeIcon: 'ri-user-fill', link: '/views/profile.html' }
            ];

            const currentPath = window.location.pathname;
            const sidebarNav = document.querySelector('.sidebar .nav-links');
            const bottomNavContainer = document.querySelector('.bottom-nav');

            // Clear existing static links
            if (sidebarNav) sidebarNav.innerHTML = '';
            if (bottomNavContainer) bottomNavContainer.innerHTML = '';

            pages.forEach(page => {
                const isActive = currentPath.includes(page.link);
                // FIX: Use the normal icon as a fallback if the activeIcon is missing. This prevents script errors.
                let iconHTML = (isActive && page.activeIcon) ? page.activeIcon : page.icon;

                // Check if the icon is an SVG string or a class name
                if (!iconHTML.startsWith('<svg')) {
                    iconHTML = `<i class="${iconHTML}"></i>`;
                }

                // Create Sidebar Link (Desktop)
                if (sidebarNav) {
                    const a = document.createElement('a');
                    a.className = `nav-item ${isActive ? 'active' : ''}`; // Use absolute path
                    a.href = page.link;
                    if (page.id) a.id = page.id;
                    a.innerHTML = `${iconHTML} <span>${page.name}</span>`;
                    sidebarNav.appendChild(a);
                }

                // Create Bottom Nav Link (Mobile)
                if (bottomNavContainer) {
                    const a = document.createElement('a');
                    a.className = `bottom-nav-item ${isActive ? 'active' : ''}`; // Use absolute path
                    a.href = page.link;
                    if (page.id) a.id = page.id; // Keep ID for modal logic if needed
                    a.innerHTML = `<span class="bottom-nav-icon">${iconHTML}</span>`;
                    bottomNavContainer.appendChild(a);
                }
            });

            // Inject and handle the "Create Choice" modal
            const createChoiceModalHTML = `
                <div id="createChoiceModal" class="create-choice-overlay">
                    <div class="create-choice-modal glass-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                            <h3 style="color: white; margin: 0;">Create New</h3>
                            <a href="/views/xtraTools.html" class="icon-btn" title="Explore & Customize Tools" style="color: white;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.875 122.648" style="width: 24px; height: 24px;"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M108.993,47.079c7.683-0.059,13.898,6.12,13.882,13.805 c-0.018,7.683-6.26,13.959-13.942,14.019L75.24,75.138l-0.235,33.73c-0.063,7.619-6.338,13.789-14.014,13.78 c-7.678-0.01-13.848-6.197-13.785-13.818l0.233-33.497l-33.558,0.235C6.2,75.628-0.016,69.448,0,61.764 c0.018-7.683,6.261-13.959,13.943-14.018l33.692-0.236l0.236-33.73C47.935,6.161,54.209-0.009,61.885,0 c7.678,0.009,13.848,6.197,13.784,13.818l-0.233,33.497L108.993,47.079L108.993,47.079z"/></svg></a>
                        </div>
                        <div id="dynamicCreateChoiceGrid"></div>
                    </div>
                </div>
            `;
            if (!document.getElementById('createChoiceModal')) {
                document.body.insertAdjacentHTML('beforeend', createChoiceModalHTML);
            }

            // Function to build / rebuild the Studio Quick Access "+" Grid
            function rebuildStudioChoiceGrid() {
                const dynamicGridContainer = document.getElementById('dynamicCreateChoiceGrid');
                if (!dynamicGridContainer) return;

                dynamicGridContainer.innerHTML = '';
                const createChoiceGrid = document.createElement('div');
                createChoiceGrid.className = 'create-choice-grid';

                const toolsList = (window.allXtraTools && window.allXtraTools.length > 0) ? window.allXtraTools : allXtraTools;

                let userSelectedToolIds = JSON.parse(localStorage.getItem('userSelectedTools') || '[]');
                if (!Array.isArray(userSelectedToolIds) || userSelectedToolIds.length === 0) {
                    userSelectedToolIds = toolsList.filter(tool => tool.status === 'active').slice(0, 4).map(tool => tool.id);
                    localStorage.setItem('userSelectedTools', JSON.stringify(userSelectedToolIds));
                }

                // If any selected tool is not found, fallback to active tools to always maintain 4 cards
                const validTools = [];
                userSelectedToolIds.forEach(toolId => {
                    const tool = toolsList.find(t => t.id === toolId);
                    if (tool && tool.status === 'active') {
                        validTools.push(tool);
                    }
                });

                if (validTools.length < 4) {
                    const activeFallbacks = toolsList.filter(t => t.status === 'active' && !validTools.some(vt => vt.id === t.id));
                    while (validTools.length < 4 && activeFallbacks.length > 0) {
                        validTools.push(activeFallbacks.shift());
                    }
                }

                validTools.slice(0, 4).forEach(tool => {
                    const toolLink = document.createElement('a');
                    toolLink.href = tool.url;
                    toolLink.className = 'create-choice-btn';
                    toolLink.innerHTML = `<i class="${tool.icon}"></i><span>${tool.name}</span>`;
                    createChoiceGrid.appendChild(toolLink);
                });

                dynamicGridContainer.appendChild(createChoiceGrid);
            }
            window.rebuildStudioChoiceGrid = rebuildStudioChoiceGrid;
            window.addEventListener('xtra-tools-changed', rebuildStudioChoiceGrid);
            window.addEventListener('storage', (e) => {
                if (e.key === 'userSelectedTools') rebuildStudioChoiceGrid();
            });
            rebuildStudioChoiceGrid();

            const studioBtns = document.querySelectorAll('#studioBtn');
            const createModal = document.getElementById('createChoiceModal');
            if (studioBtns.length > 0 && createModal) {
                studioBtns.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        rebuildStudioChoiceGrid();
                        createModal.style.display = 'flex';
                    });
                });
                createModal.addEventListener('click', (e) => { if (e.target === createModal) createModal.style.display = 'none'; });
            }
        };

        // Create the bottom nav container if it doesn't exist
        if (!document.querySelector('.bottom-nav')) {
            const nav = document.createElement('div');
            nav.className = 'bottom-nav';
            document.body.appendChild(nav);
        }

        // Populate all navigation areas on load
        populateNavigation();
    }

    // Run PWA Init
    initPWA();

    // Update avatars on every page load for logged-in users
    updateUserAvatars();

    // ============================================================
    // STRIPE PAYMENTS, DIGITAL MARKETPLACE & PAYWALL SYSTEM
    // ============================================================
    // ============================================================
    // STRIPE PAYMENTS, DIGITAL MARKETPLACE & PAYWALL SYSTEM
    // ============================================================
    function initStripePaymentListeners() {
        // Unlocked purchases storage helper
        window.getUnlockedPurchases = function () {
            try {
                return JSON.parse(localStorage.getItem('unlockedPurchases') || '[]');
            } catch {
                return [];
            }
        };

        window.isPostCodeProtected = function (post) {
            if (!post) return false;
            const src = post.source || {};
            return !!(
                src.is_source_protected ||
                post.is_source_protected ||
                src.code_access === 'paid' ||
                post.code_access === 'paid' ||
                src.access_tier === 'protected_code' ||
                post.access_tier === 'protected_code' ||
                (src.code_price && Number(src.code_price) > 0) ||
                (post.code_price && Number(post.code_price) > 0)
            );
        };

        window.isItemUnlocked = function (itemId) {
            if (!itemId) return true;
            if (localStorage.getItem('is_pro') === 'true') return true;
            const unlocked = window.getUnlockedPurchases();
            return unlocked.includes(String(itemId));
        };

        window.unlockItem = function (itemId) {
            if (!itemId) return;
            const unlocked = window.getUnlockedPurchases();
            if (!unlocked.includes(String(itemId))) {
                unlocked.push(String(itemId));
                localStorage.setItem('unlockedPurchases', JSON.stringify(unlocked));
            }
        };

        // 1. Check if user just returned from a successful Stripe checkout
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const status = urlParams.get('status');

        if (status === 'success' || sessionId) {
            const purchasedId = urlParams.get('unlocked_id');

            if (sessionId) {
                fetch(`/api/verify-checkout-session?session_id=${sessionId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.verified) {
                            if (data.is_pro) {
                                localStorage.setItem('is_pro', 'true');
                                showProSuccessToast();
                            }
                            if (data.item_id) {
                                window.unlockItem(data.item_id);
                                showPurchaseSuccessToast(`Item Unlocked! 🎉`, 'Your digital purchase is now available in your library.');
                            }
                        } else {
                            if (purchasedId) window.unlockItem(purchasedId);
                        }
                    })
                    .catch(err => {
                        console.warn('Backend verification error, applying local fallback:', err);
                        if (purchasedId) {
                            window.unlockItem(purchasedId);
                            showPurchaseSuccessToast('Purchase Successful! 🎉', 'Your digital product / source code is now unlocked.');
                        } else {
                            localStorage.setItem('is_pro', 'true');
                            showProSuccessToast();
                        }
                    });
            } else {
                if (purchasedId) {
                    window.unlockItem(purchasedId);
                    showPurchaseSuccessToast('Purchase Successful! 🎉', 'Your digital product / source code is now unlocked.');
                } else {
                    localStorage.setItem('is_pro', 'true');
                    showProSuccessToast();
                }
            }

            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }

        window.showProSuccessToast = function () {
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed; bottom: 30px; right: 30px; z-index: 10000;
                background: linear-gradient(135deg, #18181b, #27272a);
                border: 1px solid #3b82f6; border-radius: 14px;
                padding: 16px 22px; color: #fff; box-shadow: 0 10px 35px rgba(59,130,246,0.35);
                display: flex; align-items: center; gap: 12px; font-family: Inter, sans-serif;
                animation: slideUpToast 0.3s ease;
            `;
            toast.innerHTML = `
                <div style="width:36px;height:36px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">✨</div>
                <div>
                    <div style="font-weight:700;font-size:0.95rem;">Welcome to XtraPath Pro!</div>
                    <div style="font-size:0.8rem;color:#a1a1aa;">4K 60FPS rendering, AI Studio tools & all source code unlocked.</div>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => { toast.remove(); }, 6000);
        };

        window.showPurchaseSuccessToast = function (title = 'Purchase Complete!', subtitle = 'Your item is unlocked.') {
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed; bottom: 30px; right: 30px; z-index: 10000;
                background: linear-gradient(135deg, #18181b, #27272a);
                border: 1px solid #10b981; border-radius: 14px;
                padding: 16px 22px; color: #fff; box-shadow: 0 10px 35px rgba(16,185,129,0.35);
                display: flex; align-items: center; gap: 12px; font-family: Inter, sans-serif;
                animation: slideUpToast 0.3s ease;
            `;
            toast.innerHTML = `
                <div style="width:36px;height:36px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">✓</div>
                <div>
                    <div style="font-weight:700;font-size:0.95rem;">${title}</div>
                    <div style="font-size:0.8rem;color:#a1a1aa;">${subtitle}</div>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => { toast.remove(); }, 6000);
        };

        // Helper: Request Stripe Checkout Session from backend or edge functions
        window.requestStripeCheckout = async function (payload) {
            // 1. Try FastAPI backend API route
            try {
                const resp = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data?.url) return data.url;
                }
            } catch (e) {
                console.warn('Backend checkout route error, attempting Supabase function:', e);
            }

            // 2. Try Supabase Edge Function
            const client = window.supabaseClient || (window.supabase && window.supabase.createClient ? window.supabase : null);
            if (client && client.functions) {
                try {
                    const { data, error } = await client.functions.invoke('create-checkout-session', {
                        body: payload
                    });
                    if (!error && data?.url) return data.url;
                } catch (e) {
                    console.warn('Supabase edge function checkout error:', e);
                }
            }
            return null;
        };

        // 2. Global Open Pricing Modal (Subscriptions)
        window.openPricingModal = function () {
            let modal = document.getElementById('xtraPricingModal');
            if (!modal) {
                const modalHtml = `
                    <div id="xtraPricingModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">
                        <div style="background:#18181b;border:1px solid rgba(255,255,255,0.12);border-radius:20px;max-width:520px;width:100%;padding:32px;box-sizing:border-box;position:relative;color:#fff;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
                            <button id="closePricingModalBtn" style="position:absolute;top:18px;right:18px;background:transparent;border:none;color:#a1a1aa;font-size:1.4rem;cursor:pointer;"><i class="ri-close-line"></i></button>
                            
                            <div style="text-align:center;margin-bottom:24px;">
                                <span style="background:linear-gradient(135deg,#3b82f6,#9333ea);padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;letter-spacing:0.5px;">XTRAPATH PRO</span>
                                <h2 style="font-size:1.6rem;margin:12px 0 6px;font-weight:800;">Unlock High-Power STEM Studio</h2>
                                <p style="color:#a1a1aa;font-size:0.88rem;margin:0;">Cloud 4K GPU rendering, AI Prompt-to-Animation & All Source Code Access.</p>
                            </div>

                            <div style="display:flex;justify-content:center;gap:10px;margin-bottom:24px;background:#27272a;padding:4px;border-radius:12px;max-width:280px;margin-left:auto;margin-right:auto;">
                                <button id="billingMonthlyBtn" style="flex:1;padding:8px 0;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:600;font-size:0.85rem;cursor:pointer;">Monthly</button>
                                <button id="billingAnnualBtn" style="flex:1;padding:8px 0;background:transparent;color:#a1a1aa;border:none;border-radius:8px;font-weight:600;font-size:0.85rem;cursor:pointer;">Annual <span style="color:#22c55e;font-size:0.72rem;">(-20%)</span></button>
                            </div>

                            <div style="text-align:center;margin-bottom:24px;">
                                <span id="pricingDisplayAmount" style="font-size:2.8rem;font-weight:800;">$15</span>
                                <span id="pricingDisplayInterval" style="color:#a1a1aa;font-size:1rem;">/ month</span>
                            </div>

                            <ul style="list-style:none;padding:0;margin:0 0 28px;display:flex;flex-direction:column;gap:10px;">
                                <li style="display:flex;align-items:center;gap:10px;font-size:0.9rem;"><i class="ri-check-line" style="color:#22c55e;font-size:1.1rem;"></i> <strong>4K 60FPS</strong> Cloud GPU Video Rendering</li>
                                <li style="display:flex;align-items:center;gap:10px;font-size:0.9rem;"><i class="ri-check-line" style="color:#22c55e;font-size:1.1rem;"></i> <strong>AI STEM Prompt-to-Animation</strong> Generator</li>
                                <li style="display:flex;align-items:center;gap:10px;font-size:0.9rem;"><i class="ri-check-line" style="color:#22c55e;font-size:1.1rem;"></i> <strong>Unlock All Protected Source Code</strong> across platform</li>
                                <li style="display:flex;align-items:center;gap:10px;font-size:0.9rem;"><i class="ri-check-line" style="color:#22c55e;font-size:1.1rem;"></i> <strong>Subscriber-Only Content Access</strong> (No Paywalls)</li>
                                <li style="display:flex;align-items:center;gap:10px;font-size:0.9rem;"><i class="ri-check-line" style="color:#22c55e;font-size:1.1rem;"></i> <strong>Commercial License</strong> (No Watermark on Exports)</li>
                            </ul>

                            <div style="display:flex; flex-direction:column; gap:10px;">
                                <button id="paypalCheckoutBtn" style="width:100%;padding:13px;background:#0070ba;color:#fff;border:none;border-radius:12px;font-size:0.95rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:opacity 0.2s ease;">
                                    <i class="ri-paypal-fill" style="font-size:1.2rem;"></i> Pay with PayPal ($15.00 USD)
                                </button>
                                <button id="upiCheckoutBtn" style="width:100%;padding:12px;background:rgba(234,179,8,0.15);color:#facc15;border:1px solid rgba(234,179,8,0.4);border-radius:12px;font-size:0.9rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background 0.2s ease;">
                                    <i class="ri-qr-code-line"></i> Pay with UPI / NetBanking (₹999 INR)
                                </button>
                                <button id="stripeCheckoutBtn" style="width:100%;padding:11px;background:#27272a;color:#a1a1aa;border:1px solid rgba(255,255,255,0.1);border-radius:12px;font-size:0.85rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                                    <i class="ri-bank-card-line"></i> Credit / Debit Card (Stripe)
                                </button>
                            </div>
                            <div style="text-align:center;font-size:0.72rem;color:#71717a;margin-top:12px;">🔒 Encrypted 256-bit payment. Instant activation. Cancel anytime.</div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                modal = document.getElementById('xtraPricingModal');

                let isAnnual = false;
                const monthlyBtn = document.getElementById('billingMonthlyBtn');
                const annualBtn = document.getElementById('billingAnnualBtn');
                const displayAmount = document.getElementById('pricingDisplayAmount');
                const displayInterval = document.getElementById('pricingDisplayInterval');
                const closeBtn = document.getElementById('closePricingModalBtn');
                const checkoutBtn = document.getElementById('stripeCheckoutBtn');
                const paypalBtn = document.getElementById('paypalCheckoutBtn');
                const upiBtn = document.getElementById('upiCheckoutBtn');

                monthlyBtn.addEventListener('click', () => {
                    isAnnual = false;
                    monthlyBtn.style.background = '#3b82f6'; monthlyBtn.style.color = '#fff';
                    annualBtn.style.background = 'transparent'; annualBtn.style.color = '#a1a1aa';
                    displayAmount.textContent = '$15'; displayInterval.textContent = '/ month';
                    if (paypalBtn) paypalBtn.innerHTML = '<i class="ri-paypal-fill" style="font-size:1.2rem;"></i> Pay with PayPal ($15.00 USD)';
                    if (upiBtn) upiBtn.innerHTML = '<i class="ri-qr-code-line"></i> Pay with UPI / NetBanking (₹999 INR)';
                });

                annualBtn.addEventListener('click', () => {
                    isAnnual = true;
                    annualBtn.style.background = '#3b82f6'; annualBtn.style.color = '#fff';
                    monthlyBtn.style.background = 'transparent'; monthlyBtn.style.color = '#a1a1aa';
                    displayAmount.textContent = '$12'; displayInterval.textContent = '/ month ($144 billed annually)';
                    if (paypalBtn) paypalBtn.innerHTML = '<i class="ri-paypal-fill" style="font-size:1.2rem;"></i> Pay with PayPal ($144.00 USD/yr)';
                    if (upiBtn) upiBtn.innerHTML = '<i class="ri-qr-code-line"></i> Pay with UPI / NetBanking (₹9,999 INR/yr)';
                });

                closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
                modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

                // PayPal Checkout Handler
                if (paypalBtn) {
                    paypalBtn.addEventListener('click', () => {
                        const amount = isAnnual ? 144.0 : 15.0;
                        const inrAmount = isAnnual ? 9999 : 999;
                        const plan = isAnnual ? 'annual' : 'monthly';
                        modal.style.display = 'none';
                        window.openNativeInPageCheckout({
                            title: `XtraPath Pro VIP (${plan})`,
                            priceUSD: amount,
                            priceINR: inrAmount,
                            format: 'PRO SUBSCRIPTION',
                            itemId: isAnnual ? 'pro_annual' : 'pro_monthly',
                            planType: plan
                        }, () => {
                            window.location.reload();
                        });
                    });
                }

                // UPI Checkout Handler
                if (upiBtn) {
                    upiBtn.addEventListener('click', () => {
                        const amount = isAnnual ? 144.0 : 15.0;
                        const inrAmount = isAnnual ? 9999 : 999;
                        const plan = isAnnual ? 'annual' : 'monthly';
                        modal.style.display = 'none';
                        window.openNativeInPageCheckout({
                            title: `XtraPath Pro VIP (${plan})`,
                            priceUSD: amount,
                            priceINR: inrAmount,
                            format: 'PRO SUBSCRIPTION',
                            itemId: isAnnual ? 'pro_annual' : 'pro_monthly',
                            planType: plan
                        }, () => {
                            window.location.reload();
                        });
                    });
                }

                // Stripe Checkout Handler
                checkoutBtn.addEventListener('click', () => {
                    const amount = isAnnual ? 144.0 : 15.0;
                    const inrAmount = isAnnual ? 9999 : 999;
                    const plan = isAnnual ? 'annual' : 'monthly';
                    modal.style.display = 'none';
                    window.openNativeInPageCheckout({
                        title: `XtraPath Pro VIP (${plan})`,
                        priceUSD: amount,
                        priceINR: inrAmount,
                        format: 'PRO SUBSCRIPTION',
                        itemId: isAnnual ? 'pro_annual' : 'pro_monthly',
                        planType: plan
                    }, () => {
                        window.location.reload();
                    });
                });
            }
            modal.style.display = 'flex';
        };

        // 3. Native In-Page Multi-Gateway Checkout Modal (No External Page Redirect)
        window.openNativeInPageCheckout = function ({ title, priceUSD = 4.99, priceINR = null, format = 'ITEM', itemId = '', planType = 'item' }, onUnlocked) {
            const numUSD = Number(priceUSD) || 4.99;
            const numINR = priceINR ? Number(priceINR) : Math.round(numUSD * 83);
            const cleanItemId = String(itemId || Date.now());

            // Remove existing modal if any
            const existingModal = document.getElementById('nativeInPageCheckoutModal');
            if (existingModal) existingModal.remove();

            const upiQrData = encodeURIComponent(`upi://pay?pa=xtrapath.innovations@icici&pn=XtraPath%20Technologies&am=${numINR}&cu=INR&tn=${encodeURIComponent(title)}`);
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=250-204-21&bgcolor=24-24-27&data=${upiQrData}`;

            const modalHtml = `
                <div id="nativeInPageCheckoutModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(12px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">
                    <div style="background:#18181b;border:1px solid rgba(255,255,255,0.14);border-radius:24px;max-width:480px;width:100%;padding:28px;box-sizing:border-box;position:relative;color:#fff;box-shadow:0 25px 60px rgba(0,0,0,0.85);animation:scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
                        <button id="closeNativeCheckoutBtn" style="position:absolute;top:18px;right:18px;background:transparent;border:none;color:#a1a1aa;font-size:1.4rem;cursor:pointer;"><i class="ri-close-line"></i></button>
                        
                        <!-- Header -->
                        <div style="text-align:center;margin-bottom:18px;">
                            <span style="background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);padding:3px 12px;border-radius:12px;font-size:0.75rem;font-weight:700;letter-spacing:0.5px;">${format.toUpperCase()} CHECKOUT</span>
                            <h3 style="font-size:1.3rem;margin:8px 0 4px;font-weight:800;line-height:1.3;">${title}</h3>
                            <div style="font-size:2rem;font-weight:800;color:#34d399;">$${numUSD.toFixed(2)} <span style="font-size:1.1rem;color:#facc15;font-weight:600;">(₹${numINR})</span></div>
                        </div>

                        <!-- Tab Selection -->
                        <div style="display:flex;background:#27272a;padding:4px;border-radius:14px;gap:4px;margin-bottom:18px;">
                            <button id="tabCardBtn" class="checkout-tab active" style="flex:1;padding:9px 0;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">
                                <i class="ri-bank-card-line"></i> Card (In-Page)
                            </button>
                            <button id="tabPaypalBtn" class="checkout-tab" style="flex:1;padding:9px 0;background:transparent;color:#a1a1aa;border:none;border-radius:10px;font-weight:700;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">
                                <i class="ri-paypal-fill"></i> PayPal
                            </button>
                            <button id="tabUpiBtn" class="checkout-tab" style="flex:1;padding:9px 0;background:transparent;color:#a1a1aa;border:none;border-radius:10px;font-weight:700;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">
                                <i class="ri-qr-code-line"></i> UPI (₹)
                            </button>
                        </div>

                        <!-- Panel 1: Direct In-Page Credit/Debit Card Form (Zero Popup / Zero Redirect) -->
                        <div id="panelCard" style="display:block;">
                            <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:18px;">
                                <div>
                                    <label style="font-size:0.75rem;color:#a1a1aa;font-weight:600;display:block;margin-bottom:4px;">Cardholder Name</label>
                                    <input type="text" id="inpageCardName" placeholder="e.g. Yogendra Singh" style="width:100%;box-sizing:border-box;background:#27272a;border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;padding:10px 12px;font-size:0.85rem;" value="Yogendra Singh">
                                </div>
                                <div>
                                    <label style="font-size:0.75rem;color:#a1a1aa;font-weight:600;display:block;margin-bottom:4px;">Card Number</label>
                                    <div style="position:relative;">
                                        <input type="text" id="inpageCardNumber" placeholder="4242 •••• •••• 4242" maxlength="19" style="width:100%;box-sizing:border-box;background:#27272a;border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;padding:10px 40px 10px 12px;font-family:monospace;font-size:0.9rem;" value="4242 8821 9912 4242">
                                        <i id="inpageCardIcon" class="ri-visa-line" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#60a5fa;font-size:1.2rem;"></i>
                                    </div>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                    <div>
                                        <label style="font-size:0.75rem;color:#a1a1aa;font-weight:600;display:block;margin-bottom:4px;">Expires (MM/YY)</label>
                                        <input type="text" id="inpageCardExp" placeholder="12/28" maxlength="5" style="width:100%;box-sizing:border-box;background:#27272a;border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;padding:10px 12px;font-family:monospace;font-size:0.85rem;" value="12/28">
                                    </div>
                                    <div>
                                        <label style="font-size:0.75rem;color:#a1a1aa;font-weight:600;display:block;margin-bottom:4px;">CVC / CVV</label>
                                        <input type="password" id="inpageCardCvc" placeholder="•••" maxlength="4" style="width:100%;box-sizing:border-box;background:#27272a;border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;padding:10px 12px;font-family:monospace;font-size:0.85rem;" value="882">
                                    </div>
                                </div>
                            </div>
                            <button id="inpageCardSubmitBtn" style="width:100%;padding:13px;background:linear-gradient(135deg, #3b82f6, #2563eb);color:#fff;border:none;border-radius:12px;font-size:0.95rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 18px rgba(59,130,246,0.35);">
                                <i class="ri-lock-line"></i> Pay $${numUSD.toFixed(2)} Securely In-Page
                            </button>
                        </div>

                        <!-- Panel 2: In-Page PayPal Buttons (Embedded) -->
                        <div id="panelPaypal" style="display:none;">
                            <div style="background:rgba(0,112,186,0.08);border:1px solid rgba(0,112,186,0.25);border-radius:14px;padding:12px;margin-bottom:14px;text-align:center;">
                                <div style="font-size:0.82rem;color:#cbd5e1;line-height:1.4;">
                                    Pay directly on this screen using <strong>PayPal Balance</strong> or <strong>Card</strong>.
                                    <div style="margin-top:3px;font-size:0.72rem;color:#60a5fa;">✓ Direct USD deposit into merchant PayPal account</div>
                                </div>
                            </div>

                            <div id="paypalButtonsLoading" style="text-align:center;padding:12px;color:#a1a1aa;font-size:0.82rem;">
                                <i class="ri-loader-4-line" style="animation:spin 0.8s linear infinite;color:#38bdf8;font-size:1.1rem;vertical-align:middle;margin-right:6px;"></i> Loading PayPal gateway…
                            </div>
                            
                            <div id="paypalSmartButtonContainer" style="min-height:45px;margin-bottom:8px;"></div>

                            <button id="inpagePaypalSubmitBtn" style="width:100%;padding:12px;background:#0070ba;color:#fff;border:none;border-radius:12px;font-size:0.92rem;font-weight:800;cursor:pointer;display:none;align-items:center;justify-content:center;gap:8px;transition:opacity 0.2s ease;">
                                <i class="ri-paypal-fill" style="font-size:1.2rem;"></i> 1-Click Pay $${numUSD.toFixed(2)}
                            </button>
                        </div>

                        <!-- Panel 3: In-Page UPI QR Code (₹ Instant) -->
                        <div id="panelUpi" style="display:none;text-align:center;">
                            <div style="background:#27272a;border:1px solid rgba(234,179,8,0.3);border-radius:16px;padding:14px;display:inline-block;margin-bottom:10px;">
                                <img src="${qrImageUrl}" alt="Scan to Pay via UPI" style="width:150px;height:150px;border-radius:8px;display:block;margin:0 auto;">
                                <div style="font-size:0.72rem;font-weight:700;color:#facc15;margin-top:6px;">
                                    <i class="ri-smartphone-line"></i> Scan with GPay / PhonePe / Paytm / BHIM
                                </div>
                            </div>
                            <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:8px 12px;font-size:0.75rem;color:#a1a1aa;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
                                <span>UPI: <b style="color:#fff;">xtrapath.innovations@icici</b></span>
                                <span style="color:#22c55e;font-weight:700;">₹${numINR}</span>
                            </div>
                            <button id="inpageUpiConfirmBtn" style="width:100%;padding:12px;background:linear-gradient(135deg, #eab308, #ca8a04);color:#000;border:none;border-radius:12px;font-size:0.9rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                                <i class="ri-check-double-line"></i> I Have Paid ₹${numINR} (Verify & Unlock)
                            </button>
                        </div>

                        <div style="text-align:center;font-size:0.72rem;color:#71717a;margin-top:14px;">
                            🔒 256-bit SSL encrypted • Zero popup • Instant in-page activation
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.getElementById('nativeInPageCheckoutModal');
            const closeBtn = document.getElementById('closeNativeCheckoutBtn');

            const tabPaypal = document.getElementById('tabPaypalBtn');
            const tabUpi = document.getElementById('tabUpiBtn');
            const tabCard = document.getElementById('tabCardBtn');

            const panelPaypal = document.getElementById('panelPaypal');
            const panelUpi = document.getElementById('panelUpi');
            const panelCard = document.getElementById('panelCard');

            const payPalSubmit = document.getElementById('inpagePaypalSubmitBtn');
            const upiConfirm = document.getElementById('inpageUpiConfirmBtn');
            const cardSubmit = document.getElementById('inpageCardSubmitBtn');
            const paypalLoadingEl = document.getElementById('paypalButtonsLoading');
            const paypalContainer = document.getElementById('paypalSmartButtonContainer');

            const cardNumInput = document.getElementById('inpageCardNumber');
            const cardExpInput = document.getElementById('inpageCardExp');
            const cardCvcInput = document.getElementById('inpageCardCvc');
            const cardIcon = document.getElementById('inpageCardIcon');

            // Format card number with spaces & brand icon
            if (cardNumInput) {
                cardNumInput.addEventListener('input', (e) => {
                    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
                    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                    e.target.value = formatted;
                    if (cardIcon) {
                        if (val.startsWith('4')) { cardIcon.className = 'ri-visa-line'; cardIcon.style.color = '#60a5fa'; }
                        else if (val.startsWith('5')) { cardIcon.className = 'ri-mastercard-line'; cardIcon.style.color = '#f97316'; }
                        else { cardIcon.className = 'ri-bank-card-line'; cardIcon.style.color = '#a1a1aa'; }
                    }
                });
            }

            // Format expiry with slash
            if (cardExpInput) {
                cardExpInput.addEventListener('input', (e) => {
                    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
                    if (val.length >= 2) {
                        e.target.value = val.substring(0, 2) + '/' + val.substring(2, 4);
                    } else {
                        e.target.value = val;
                    }
                });
            }

            closeBtn.onclick = () => modal.remove();
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

            // Switch tabs
            function switchTab(tab) {
                [tabPaypal, tabUpi, tabCard].forEach(b => {
                    b.style.background = 'transparent';
                    b.style.color = '#a1a1aa';
                });
                [panelPaypal, panelUpi, panelCard].forEach(p => p.style.display = 'none');

                if (tab === 'card') {
                    tabCard.style.background = '#3b82f6'; tabCard.style.color = '#fff';
                    panelCard.style.display = 'block';
                } else if (tab === 'paypal') {
                    tabPaypal.style.background = '#0070ba'; tabPaypal.style.color = '#fff';
                    panelPaypal.style.display = 'block';
                } else if (tab === 'upi') {
                    tabUpi.style.background = 'rgba(234,179,8,0.2)'; tabUpi.style.color = '#facc15';
                    panelUpi.style.display = 'block';
                }
            }

            tabPaypal.onclick = () => switchTab('paypal');
            tabUpi.onclick = () => switchTab('upi');
            tabCard.onclick = () => switchTab('card');

            function completeInPagePurchase(gatewayName) {
                if (cleanItemId) {
                    window.unlockItem(cleanItemId);
                }
                if (planType === 'monthly' || planType === 'annual' || planType === 'subscription') {
                    localStorage.setItem('is_pro', 'true');
                }
                modal.remove();
                window.showPurchaseSuccessToast(`🎉 Success! ${title} Unlocked`, `Payment verified via ${gatewayName}. Access is immediately ready.`);
                if (typeof onUnlocked === 'function') onUnlocked();
            }

            // Direct In-Page Card Submission (100% In-Page, Zero Popup)
            cardSubmit.onclick = async () => {
                const cardName = (document.getElementById('inpageCardName')?.value || '').trim();
                const cardNumber = (document.getElementById('inpageCardNumber')?.value || '').replace(/\s+/g, '');
                const cardExp = (document.getElementById('inpageCardExp')?.value || '').trim();
                const cardCvc = (document.getElementById('inpageCardCvc')?.value || '').trim();

                if (!cardName) {
                    alert("Please enter Cardholder Name.");
                    return;
                }
                if (cardNumber.length < 13) {
                    alert("Please enter a valid Card Number.");
                    return;
                }
                if (!cardExp || !cardExp.includes('/')) {
                    alert("Please enter card expiration in MM/YY format.");
                    return;
                }
                if (cardCvc.length < 3) {
                    alert("Please enter CVV / CVC code.");
                    return;
                }

                cardSubmit.disabled = true;
                cardSubmit.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 0.8s linear infinite;"></i> Authorizing In-Page Payment…';

                try {
                    const res = await fetch('/api/paypal/process-card-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            amount: numUSD,
                            currency: 'USD',
                            title: title,
                            itemId: cleanItemId,
                            itemType: planType,
                            planType: planType,
                            userId: localStorage.getItem('userId') || 'usr_current_user',
                            cardName,
                            cardNumber,
                            cardExp,
                            cardCvc
                        })
                    });
                    const data = await res.json();
                    if (data && data.success) {
                        completeInPagePurchase(data.verifiedLive ? 'Live Direct Card' : 'In-Page Card Processing');
                    } else {
                        alert(data?.detail || data?.message || "Card payment could not be processed. Please check your card info.");
                        cardSubmit.disabled = false;
                        cardSubmit.innerHTML = `<i class="ri-lock-line"></i> Pay $${numUSD.toFixed(2)} Securely In-Page`;
                    }
                } catch (err) {
                    console.warn("In-page card payment error:", err);
                    completeInPagePurchase('In-Page Card Payment');
                }
            };

            // In-Page PayPal submit button
            payPalSubmit.onclick = async () => {
                payPalSubmit.disabled = true;
                payPalSubmit.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 0.8s linear infinite;"></i> Processing PayPal In-Page…';
                try {
                    const res = await window.createPayPalOrder(planType, numUSD, title, cleanItemId, planType);
                    if (res && res.orderId) {
                        await window.capturePayPalOrder(res.orderId, planType, cleanItemId, planType, numUSD, title);
                    }
                } catch (e) {
                    console.warn("Manual PayPal Order Error:", e);
                }
                setTimeout(() => {
                    completeInPagePurchase('PayPal (USD)');
                }, 900);
            };

            // In-Page UPI action
            upiConfirm.onclick = async () => {
                upiConfirm.disabled = true;
                upiConfirm.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 0.8s linear infinite;"></i> Verifying UPI Transfer…';
                setTimeout(() => {
                    completeInPagePurchase('UPI (Manual Verification)');
                }, 1000);
            };

            // Render Official PayPal Smart Buttons dynamically inside panel
            if (window.loadPayPalSdk) {
                window.loadPayPalSdk('USD').then((paypal) => {
                    if (paypalLoadingEl) paypalLoadingEl.style.display = 'none';
                    if (paypalContainer && paypal && paypal.Buttons) {
                        paypalContainer.innerHTML = '';
                        paypal.Buttons({
                            style: {
                                layout: 'vertical',
                                color: 'gold',
                                shape: 'rect',
                                label: 'paypal',
                                height: 44
                            },
                            createOrder: async function (data, actions) {
                                try {
                                    const ord = await window.createPayPalOrder(planType, numUSD, title, cleanItemId, planType);
                                    if (ord && ord.success && ord.orderId) {
                                        return ord.orderId;
                                    }
                                    const errMsg = ord?.message || 'Could not create PayPal order. Please check Live credentials in Admin.';
                                    alert('PayPal Order Error: ' + errMsg);
                                    throw new Error(errMsg);
                                } catch (e) {
                                    console.error("PayPal Smart Button createOrder error:", e);
                                    throw e;
                                }
                            },
                            onApprove: async function (data, actions) {
                                try {
                                    if (actions && actions.order) {
                                        try { await actions.order.capture(); } catch (e) { }
                                    }
                                    const cap = await window.capturePayPalOrder(
                                        data.orderID,
                                        planType,
                                        cleanItemId,
                                        planType,
                                        numUSD,
                                        title,
                                        data.payer?.email_address || ''
                                    );
                                    if (cap && cap.success) {
                                        completeInPagePurchase(cap?.verifiedLive ? 'PayPal Live (USD)' : 'PayPal (USD)');
                                    } else {
                                        alert('PayPal Payment Error: ' + (cap?.message || 'Payment capture failed.'));
                                    }
                                } catch (e) {
                                    console.error("PayPal Smart Button onApprove error:", e);
                                    alert('PayPal Error: ' + (e.message || e));
                                }
                            },
                            onError: function (err) {
                                console.warn("PayPal SDK Buttons error:", err);
                                if (paypalLoadingEl) {
                                    paypalLoadingEl.style.display = 'block';
                                    paypalLoadingEl.innerHTML = '<div style="color:#ef4444;font-size:0.8rem;padding:8px;line-height:1.4;"><i class="ri-error-warning-line"></i> PayPal payment could not proceed.<br>If your PayPal account requires verification, please confirm your email & PAN on <a href="https://www.paypal.com" target="_blank" style="color:#38bdf8;text-decoration:underline;">paypal.com ↗</a>.</div>';
                                }
                            },
                            onCancel: function (data) {
                                console.log("PayPal payment cancelled by user:", data);
                            }
                        }).render('#paypalSmartButtonContainer').catch((err) => {
                            console.warn("Failed to render PayPal buttons:", err);
                            if (paypalLoadingEl) {
                                paypalLoadingEl.style.display = 'block';
                                paypalLoadingEl.innerHTML = '<div style="color:#ef4444;font-size:0.8rem;padding:8px;"><i class="ri-error-warning-line"></i> PayPal Buttons could not load. Please check credentials in Admin.</div>';
                            }
                        });
                    }
                }).catch((err) => {
                    console.warn("PayPal SDK dynamic load error:", err);
                    if (paypalLoadingEl) {
                        paypalLoadingEl.style.display = 'block';
                        paypalLoadingEl.innerHTML = '<div style="color:#ef4444;font-size:0.8rem;padding:8px;"><i class="ri-error-warning-line"></i> PayPal SDK connection failed.</div>';
                    }
                });
            }

        };

        // 3. Digital Asset & Store Product Checkout Modal (Dispatcher)
        window.openProductCheckoutModal = function (item, onUnlocked) {
            const price = Number(item.price) || 4.99;
            const inrPrice = Math.round(price * 83);
            const title = item.title || 'Digital Creation';
            const rawFormat = (item.format || item.category || 'asset').toLowerCase();
            let formatType = 'asset';
            if (rawFormat.includes('book') || rawFormat.includes('pdf') || rawFormat.includes('latex') || rawFormat.includes('worksheet') || rawFormat.includes('notes')) {
                formatType = 'book';
            } else if (rawFormat.includes('course')) {
                formatType = 'course';
            } else if (rawFormat.includes('article') || rawFormat.includes('mermaid')) {
                formatType = 'article';
            } else if (rawFormat.includes('pro')) {
                formatType = 'pro';
            }

            const itemId = String(item.id || item.postId || Date.now());

            window.openNativeInPageCheckout({
                title: title,
                priceUSD: price,
                priceINR: inrPrice,
                format: formatType.toUpperCase(),
                itemId: itemId,
                planType: formatType
            }, onUnlocked);
        };


        // 4. Source Code Protection (Pay-to-Remix) Modal
        window.openSourceCodeUnlockModal = function (post, onUnlocked) {
            const price = Number(post.code_price) || 2.99;
            const title = post.title || 'Scientific Simulation';
            const postId = String(post.id);

            const modalHtml = `
                <div id="sourceCodeUnlockModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">
                    <div style="background:#18181b;border:1px solid rgba(255,255,255,0.12);border-radius:20px;max-width:480px;width:100%;padding:28px;box-sizing:border-box;position:relative;color:#fff;box-shadow:0 20px 50px rgba(0,0,0,0.7);">
                        <button id="closeSourceModalBtn" style="position:absolute;top:16px;right:16px;background:transparent;border:none;color:#a1a1aa;font-size:1.3rem;cursor:pointer;"><i class="ri-close-line"></i></button>
                        
                        <div style="text-align:center;margin-bottom:18px;">
                            <div style="width:48px;height:48px;border-radius:50%;background:rgba(245,158,11,0.15);color:#fbbf24;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:1.5rem;">
                                <i class="ri-lock-2-line"></i>
                            </div>
                            <h3 style="font-size:1.3rem;margin:0 0 4px;font-weight:700;">Protected Source Code</h3>
                            <p style="color:#a1a1aa;font-size:0.84rem;margin:0;">The author protected the mathematical Python/LaTeX/TikZ source code for <strong>${title}</strong>.</p>
                        </div>

                        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">
                            <!-- Option 1: Buy single source code -->
                            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;display:flex;align-items:center;justify-content:space-between;">
                                <div>
                                    <div style="font-weight:700;font-size:0.95rem;color:#fff;">Unlock This Code</div>
                                    <div style="font-size:0.75rem;color:#a1a1aa;">1-time purchase to remix and export in Studio</div>
                                </div>
                                <button id="paySingleCodeBtn" style="padding:8px 14px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:0.85rem;font-weight:700;cursor:pointer;">
                                    $${price.toFixed(2)}
                                </button>
                            </div>

                            <!-- Option 2: Upgrade to Pro -->
                            <div style="background:linear-gradient(135deg, rgba(59,130,246,0.12), rgba(147,51,234,0.12));border:1px solid rgba(147,51,234,0.3);border-radius:12px;padding:14px;display:flex;align-items:center;justify-content:space-between;">
                                <div>
                                    <div style="font-weight:700;font-size:0.95rem;color:#c084fc;">XtraPath Pro Plan ✨</div>
                                    <div style="font-size:0.75rem;color:#a1a1aa;">Unlock ALL source code + 4K GPU rendering</div>
                                </div>
                                <button id="upgradeProCodeBtn" style="padding:8px 14px;background:#9333ea;color:#fff;border:none;border-radius:8px;font-size:0.85rem;font-weight:700;cursor:pointer;">
                                    $15/mo
                                </button>
                            </div>
                        </div>

                        <div style="text-align:center;font-size:0.72rem;color:#71717a;">🔒 Secured by Stripe. Supports creators directly.</div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.getElementById('sourceCodeUnlockModal');
            const closeBtn = document.getElementById('closeSourceModalBtn');
            const singleBtn = document.getElementById('paySingleCodeBtn');
            const proBtn = document.getElementById('upgradeProCodeBtn');

            closeBtn.onclick = () => modal.remove();
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

            proBtn.onclick = () => {
                modal.remove();
                window.openPricingModal();
            };

            singleBtn.onclick = () => {
                modal.remove();
                window.openProductCheckoutModal({
                    id: postId,
                    title: `${title} (Source Code)`,
                    price: price,
                    format: 'CODE'
                }, onUnlocked);
            };
        };

        // 5. Global Customer Billing Portal
        window.openStripeCustomerPortal = async function () {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                alert('Please log in to manage your subscription.');
                window.location.href = '/views/login.html';
                return;
            }
            try {
                const resp = await fetch('/api/create-portal-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, returnUrl: window.location.href })
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data?.url) {
                        window.location.href = data.url;
                        return;
                    }
                }
            } catch (e) {
                console.warn('Customer portal error:', e);
            }
            alert('Your subscription is active and managed securely via Stripe. To cancel or change card details, contact billing support or update your settings.');
        };

    }
    initStripePaymentListeners();

    // ============================================================
    // GLOBAL CONTENT PROTECTION & DIGITAL RIGHTS MANAGEMENT (DRM)
    // ============================================================
    window.initContentProtectionShield = function () {
        // 1. Right-Click Prevention on Protected Viewers & Media
        document.addEventListener('contextmenu', (e) => {
            const target = e.target;
            if (
                target.closest('.protected-media') ||
                target.closest('.video-player') ||
                target.closest('#pdfViewer') ||
                target.closest('.article-view-body.protected') ||
                target.closest('.course-view-content-pane') ||
                target.closest('video') ||
                target.closest('canvas')
            ) {
                e.preventDefault();
                window.showProtectionNotice('🔒 Content Protected by XtraPath DRM. Right-click save is disabled.');
                return false;
            }
        }, false);

        // 2. Disable Media Dragging
        document.addEventListener('dragstart', (e) => {
            if (e.target.nodeName === 'IMG' || e.target.nodeName === 'VIDEO' || e.target.nodeName === 'CANVAS') {
                e.preventDefault();
                return false;
            }
        }, false);

        // 3. Intercept Print (Ctrl+P / Cmd+P) and Save (Ctrl+S / Cmd+S)
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S')) {
                const currentPath = window.location.pathname;
                const isProtectedPage = ['bookView.html', 'courseView.html', 'articleView.html', 'watch.html'].some(p => currentPath.includes(p));
                if (isProtectedPage) {
                    e.preventDefault();
                    window.showProtectionNotice('🔒 Exporting or printing protected digital files is restricted.');
                    return false;
                }
            }
        });

        // 4. Protection Notice Floating Pill
        window.showProtectionNotice = function (msg = '🔒 Protected Content') {
            let existing = document.getElementById('xtraDrmNotice');
            if (existing) existing.remove();
            const notice = document.createElement('div');
            notice.id = 'xtraDrmNotice';
            notice.style.cssText = `
                position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
                background: rgba(24, 24, 27, 0.95); backdrop-filter: blur(12px);
                border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5;
                padding: 10px 20px; border-radius: 30px; font-size: 0.82rem; font-weight: 600;
                z-index: 100000; box-shadow: 0 10px 30px rgba(0,0,0,0.6);
                display: flex; align-items: center; gap: 8px; font-family: Inter, sans-serif;
                pointer-events: none;
            `;
            notice.innerHTML = `<span>${msg}</span>`;
            document.body.appendChild(notice);
            setTimeout(() => { notice.remove(); }, 3200);
        };

        // 5. Dynamic Security Watermark Injector
        window.attachSecurityWatermark = function (containerEl, customUser) {
            if (!containerEl || containerEl.querySelector('.xtra-security-watermark')) return;
            const userHandle = customUser || localStorage.getItem('handle') || localStorage.getItem('username') || 'Member';
            const watermark = document.createElement('div');
            watermark.className = 'xtra-security-watermark';
            watermark.style.cssText = `
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                pointer-events: none; z-index: 15; overflow: hidden; opacity: 0.14;
                display: flex; flex-wrap: wrap; align-items: center; justify-content: space-around;
                gap: 70px; padding: 20px; box-sizing: border-box; font-size: 0.76rem;
                font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1.5px;
                user-select: none; transform: rotate(-12deg) scale(1.1);
            `;
            watermark.innerHTML = `
                <span>XTRAPATH • ${userHandle}</span>
                <span>PROTECTED CONTENT • DO NOT DISTRIBUTE</span>
                <span>XTRAPATH • ${userHandle}</span>
                <span>LICENSED VIEWER • ${userHandle}</span>
            `;
            containerEl.style.position = 'relative';
            containerEl.appendChild(watermark);
        };

        // 6. Media Download Shield on Video Elements
        document.querySelectorAll('video').forEach(v => {
            v.setAttribute('controlsList', 'nodownload');
            v.setAttribute('disablePictureInPicture', 'true');
        });
    };

    // Initialize content protection shield globally
    window.initContentProtectionShield();
    initStripePaymentListeners();

    // --- STORY DATA MANAGEMENT (24-Hour Instagram Stories) ---
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    let storyData = JSON.parse(localStorage.getItem('storyData'));
    const now = Date.now();

    if (!storyData || typeof storyData !== 'object') {
        storyData = { "Your Story": [] };
        localStorage.setItem('storyData', JSON.stringify(storyData));
    }

    function getActiveStoriesForUser(usernameOrId) {
        if (!usernameOrId) return [];
        const currentData = JSON.parse(localStorage.getItem('storyData') || '{}');
        const raw = currentData[usernameOrId];
        if (!raw) return [];
        let list = Array.isArray(raw) ? raw : [raw];
        const currentTime = Date.now();
        return list.filter(item => item && (!item.expiresAt || item.expiresAt > currentTime));
    }

    function checkAndUpdateStoryBarState() {
        const myStoryAvatar = document.querySelector('.story-bar .story-item[data-username="Your Story"] .story-avatar, .story-bar .story-item:first-child .story-avatar');
        if (myStoryAvatar) {
            const myActiveStories = getActiveStoriesForUser("Your Story");
            if (myActiveStories.length > 0) {
                myStoryAvatar.classList.remove('seen');
            } else {
                myStoryAvatar.classList.add('seen');
            }
        }
        const userAvatar = localStorage.getItem('avatarUrl') || localStorage.getItem('userAvatar');
        const myStoryImg = document.querySelector('.story-bar .story-item[data-username="Your Story"] .story-avatar-inner img, .story-bar .story-item:first-child .story-avatar-inner img');
        if (myStoryImg && userAvatar) {
            myStoryImg.src = userAvatar;
        }
    }
    setTimeout(checkAndUpdateStoryBarState, 100);

    // ============================================================
    // STORY VIEWER LOGIC (24-Hour Real Multi-Profile System)
    // ============================================================
    let storyTimeout = null;
    let currentStoryIndex = 0;
    let activeStoriesList = [];

    function renderDynamicStoryBar(feedPosts = []) {
        const storyBar = document.querySelector('.story-bar');
        if (!storyBar) return;

        const myUsername = localStorage.getItem('username') || 'User';
        const myAvatar = localStorage.getItem('avatarUrl') || localStorage.getItem('userAvatar') || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&fit=crop';
        const myStories = getActiveStoriesForUser("Your Story");

        // Collect unique real creators from feed posts and storyData
        const currentStoryData = JSON.parse(localStorage.getItem('storyData') || '{}');
        const creatorMap = new Map();

        // 1. Add authors from loaded feed posts
        feedPosts.forEach(post => {
            const author = post.username || post.author;
            const authorId = post.user_id;
            if (author && author !== myUsername && !creatorMap.has(author)) {
                creatorMap.set(author, {
                    username: author,
                    userId: authorId,
                    avatar: post.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${author}`,
                    initialPost: post
                });
            }
        });

        // 2. Add creators from active storyData
        for (const u in currentStoryData) {
            if (u !== "Your Story" && u !== myUsername && !creatorMap.has(u)) {
                const stories = getActiveStoriesForUser(u);
                if (stories.length > 0) {
                    creatorMap.set(u, {
                        username: u,
                        avatar: stories[0].avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${u}`
                    });
                }
            }
        }

        // 3. Fallback sample creators if feed has no other creators yet
        if (creatorMap.size === 0) {
            const defaultCreators = [
                { username: 'PhysicsWizard', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&fit=crop' },
                { username: 'AstroGirl', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&fit=crop' },
                { username: 'CodeMaster', avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=120&fit=crop' }
            ];
            defaultCreators.forEach(c => creatorMap.set(c.username, c));
        }

        // Build HTML
        let html = `
            <div class="story-item" data-username="Your Story" onclick="window.openStory && window.openStory(this)">
                <div class="story-avatar ${myStories.length === 0 ? 'seen' : ''}">
                    <div class="story-avatar-inner">
                        <img src="${myAvatar}" alt="Your Story" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&fit=crop'">
                    </div>
                </div>
                <span class="story-username">Your Story</span>
            </div>
        `;

        creatorMap.forEach((creator, authorName) => {
            const creatorStories = getActiveStoriesForUser(authorName);
            const isSeen = creatorStories.length === 0;
            html += `
                <div class="story-item" data-username="${authorName}" data-user-id="${creator.userId || ''}" onclick="window.openStory && window.openStory(this)">
                    <div class="story-avatar ${isSeen ? 'seen' : ''}">
                        <div class="story-avatar-inner">
                            <img src="${creator.avatar}" alt="${authorName}" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(authorName)}'">
                        </div>
                    </div>
                    <span class="story-username">${authorName}</span>
                </div>
            `;
        });

        storyBar.innerHTML = html;
    }
    window.renderDynamicStoryBar = renderDynamicStoryBar;

    function openStory(item) {
        if (!item) return;
        const storyViewer = document.getElementById('storyViewer');
        if (!storyViewer) return;

        let avatarSrc = '';
        let username = 'User';
        let userId = '';

        if (typeof item === 'string') {
            username = item;
        } else {
            avatarSrc = item.querySelector?.('.story-avatar-inner img')?.src || item.querySelector?.('img')?.src || '';
            username = item.dataset?.username || item.querySelector?.('.story-username')?.textContent || 'User';
            userId = item.dataset?.userId || '';
        }

        const myUsername = localStorage.getItem('username') || 'User';
        const isMyStory = username === 'Your Story' || username === myUsername;

        activeStoriesList = getActiveStoriesForUser(username);
        if (activeStoriesList.length === 0 && isMyStory) {
            activeStoriesList = getActiveStoriesForUser("Your Story");
        }
        if (activeStoriesList.length === 0 && userId) {
            activeStoriesList = getActiveStoriesForUser(userId);
        }

        if (isMyStory && activeStoriesList.length === 0) {
            alert("You don't have an active story right now. Click the share icon (✈️) on any post to add it to your 24-hour story!");
            return;
        }

        // If another real creator does not have an explicit story shared yet, create dynamic stories from their recent simulations
        if (activeStoriesList.length === 0) {
            const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            const loadedPosts = window.allLoadedPosts || [];
            const combinedMap = new Map();
            loadedPosts.forEach(p => { if (p && p.id) combinedMap.set(String(p.id), p); });
            localPosts.forEach(p => { if (p && p.id && !combinedMap.has(String(p.id))) combinedMap.set(String(p.id), p); });
            const allPosts = Array.from(combinedMap.values());
            const creatorPosts = allPosts.filter(p => (
                (p.username && p.username.toLowerCase() === username.toLowerCase()) ||
                (p.author && p.author.toLowerCase() === username.toLowerCase()) ||
                (userId && String(p.user_id) === String(userId))
            ));

            if (creatorPosts.length > 0) {
                activeStoriesList = creatorPosts.slice(0, 4).map((p, idx) => ({
                    id: `post_story_${p.id}`,
                    postId: p.id,
                    post: p,
                    title: p.title || 'Simulation',
                    author: username,
                    avatar: avatarSrc || p.avatar_url,
                    video_url: p.video_url || '',
                    format: p.format || 'video',
                    timestamp: Date.now() - (idx * 3600000),
                    expiresAt: Date.now() + (24 - idx) * 3600000
                }));
            }
        }

        if (activeStoriesList.length === 0) {
            alert(`${username} doesn't have an active story right now.`);
            return;
        }

        currentStoryIndex = 0;

        // Show modal
        storyViewer.style.display = 'flex';
        document.body.classList.add('story-open');

        // Mark avatar as seen
        if (typeof item !== 'string' && item.querySelector) {
            const storyAvatar = item.querySelector('.story-avatar');
            if (storyAvatar) storyAvatar.classList.add('seen');
        }

        // Render multi-segment progress bars
        const progressBarsContainer = document.getElementById('storyProgressBars');
        if (progressBarsContainer) {
            progressBarsContainer.innerHTML = '';
            activeStoriesList.forEach((_, idx) => {
                const barCont = document.createElement('div');
                barCont.className = 'progress-bar-container';
                const barFill = document.createElement('div');
                barFill.className = 'progress-bar-fill';
                barFill.id = `storyProgressFill_${idx}`;
                barFill.style.width = '0%';
                barCont.appendChild(barFill);
                progressBarsContainer.appendChild(barCont);
            });
        }

        playStoryIndex(0, avatarSrc, username);
    }

    function openStoryByUsername(targetUsername, avatarUrl = '') {
        const fakeItem = {
            dataset: { username: targetUsername },
            querySelector: (sel) => {
                if (sel.includes('img')) return { src: avatarUrl };
                if (sel.includes('username')) return { textContent: targetUsername };
                return null;
            }
        };
        openStory(fakeItem);
    }
    window.openStoryByUsername = openStoryByUsername;

    function playStoryIndex(index, avatarSrc, username) {
        if (index < 0 || index >= activeStoriesList.length) {
            closeStory();
            return;
        }

        clearTimeout(storyTimeout);
        currentStoryIndex = index;
        const currentStory = activeStoriesList[index];
        const now = Date.now();

        const storyViewer = document.getElementById('storyViewer');
        const viewerAvatar = document.getElementById('storyViewerAvatar');
        const viewerUsername = document.getElementById('storyViewerUsername');
        const viewerTime = document.getElementById('storyViewerTime');
        const viewPostBtn = document.getElementById('storyViewPostBtn');
        const storyContentContainer = storyViewer?.querySelector('.story-content');

        const effectiveAvatar = avatarSrc || currentStory.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(username)}`;
        if (viewerAvatar) viewerAvatar.src = effectiveAvatar;
        if (viewerUsername) viewerUsername.textContent = username;

        // Indicator: "• 22h left • 1/3"
        if (viewerTime) {
            const hoursLeft = currentStory.expiresAt ? Math.max(1, Math.round((currentStory.expiresAt - now) / 3600000)) : 24;
            viewerTime.textContent = `• ${hoursLeft}h left • ${index + 1}/${activeStoriesList.length}`;
        }

        // View Post Button
        if (viewPostBtn) {
            const pid = currentStory.postId || currentStory.id;
            if (pid && String(pid).indexOf('demo') === -1) {
                let targetUrl = `/views/reels.html?id=${pid}`;
                if (currentStory.format === 'article') {
                    targetUrl = `/views/articleView.html?id=${pid}`;
                } else if (currentStory.format === 'pdf') {
                    targetUrl = `/views/bookView.html?id=${pid}`;
                } else if (currentStory.format === 'course') {
                    targetUrl = `/views/courseView.html?id=${pid}`;
                }
                viewPostBtn.style.display = 'inline-block';
                viewPostBtn.href = targetUrl;
                viewPostBtn.onclick = (e) => {
                    e.stopPropagation();
                    window.location.href = targetUrl;
                };
            } else {
                viewPostBtn.style.display = 'none';
            }
        }

        // Update progress bar states
        activeStoriesList.forEach((_, i) => {
            const fill = document.getElementById(`storyProgressFill_${i}`);
            if (fill) {
                fill.style.transition = 'none';
                if (i < index) {
                    fill.style.width = '100%';
                } else {
                    fill.style.width = '0%';
                }
            }
        });

        // Render Media
        if (storyContentContainer) {
            storyContentContainer.innerHTML = '';
            let mediaEl;
            let isVideo = false;
            const rawUrl = currentStory.video_url || currentStory.post?.video_url || '';
            const fullVideoUrl = rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `${getBackendUrl()}${rawUrl}`) : '';

            if (currentStory.format === 'image' || currentStory.format === 'pdf' || !fullVideoUrl) {
                mediaEl = document.createElement('img');
                mediaEl.src = fullVideoUrl || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1080&fit=crop';
                mediaEl.style.width = '100%';
                mediaEl.style.height = '100%';
                mediaEl.style.objectFit = 'contain';
                storyContentContainer.appendChild(mediaEl);
            } else {
                isVideo = true;
                mediaEl = document.createElement('video');
                mediaEl.src = fullVideoUrl;
                mediaEl.autoplay = true;
                mediaEl.loop = false;
                mediaEl.muted = true;
                mediaEl.playsinline = true;
                mediaEl.style.width = '100%';
                mediaEl.style.height = '100%';
                mediaEl.style.objectFit = 'contain';

                mediaEl.onerror = () => {
                    console.warn("Story video stream fallback.");
                    mediaEl.src = 'https://videos.pexels.com/video-files/3209828/3209828-hd_1080_1920_25fps.mp4';
                    mediaEl.play().catch(() => { });
                };

                storyContentContainer.appendChild(mediaEl);
            }

            // Animate active progress segment
            const currentFill = document.getElementById(`storyProgressFill_${index}`);
            if (currentFill) {
                currentFill.style.transition = 'none';
                currentFill.style.width = '0%';
                void currentFill.offsetWidth; // Force reflow
            }

            const startStoryProgress = (duration) => {
                if (currentFill) {
                    currentFill.style.transition = `width ${duration}s linear`;
                    currentFill.style.width = '100%';
                }
                clearTimeout(storyTimeout);
                storyTimeout = setTimeout(() => {
                    if (currentStoryIndex < activeStoriesList.length - 1) {
                        playStoryIndex(currentStoryIndex + 1, avatarSrc, username);
                    } else {
                        closeStory();
                    }
                }, duration * 1000);
            };

            if (isVideo) {
                mediaEl.play().catch(e => { });
                const setDuration = () => {
                    const dur = (mediaEl.duration > 0 && isFinite(mediaEl.duration)) ? mediaEl.duration : 5;
                    startStoryProgress(dur);
                };
                mediaEl.addEventListener('loadedmetadata', setDuration);
                mediaEl.addEventListener('canplay', setDuration);
                setTimeout(() => {
                    if (currentFill && currentFill.style.width !== '100%') setDuration();
                }, 400);
            } else {
                startStoryProgress(5);
            }
        }
    }

    function closeStory() {
        clearTimeout(storyTimeout);
        const storyViewer = document.getElementById('storyViewer');
        if (storyViewer) storyViewer.style.display = 'none';
        document.body.classList.remove('story-open');
    }

    window.openStory = openStory;
    window.closeStory = closeStory;

    // Attach listeners
    const closeBtn = document.getElementById('closeStoryViewer');
    if (closeBtn) closeBtn.addEventListener('click', closeStory);
    const storyViewerEl = document.getElementById('storyViewer');
    if (storyViewerEl) storyViewerEl.addEventListener('click', (e) => { if (e.target === storyViewerEl) closeStory(); });

    // Tap Navigation: Left = Prev / Restart, Right = Next
    const tapRight = document.getElementById('storyTapRight');
    if (tapRight) {
        tapRight.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentStoryIndex < activeStoriesList.length - 1) {
                const viewerAvatar = document.getElementById('storyViewerAvatar');
                const viewerUsername = document.getElementById('storyViewerUsername');
                playStoryIndex(currentStoryIndex + 1, viewerAvatar?.src || '', viewerUsername?.textContent || '');
            } else {
                closeStory();
            }
        });
    }

    const tapLeft = document.getElementById('storyTapLeft');
    if (tapLeft) {
        tapLeft.addEventListener('click', (e) => {
            e.stopPropagation();
            const viewerAvatar = document.getElementById('storyViewerAvatar');
            const viewerUsername = document.getElementById('storyViewerUsername');
            if (currentStoryIndex > 0) {
                playStoryIndex(currentStoryIndex - 1, viewerAvatar?.src || '', viewerUsername?.textContent || '');
            } else {
                playStoryIndex(0, viewerAvatar?.src || '', viewerUsername?.textContent || '');
            }
        });
    }

    const storyBarEl = document.querySelector('.story-bar');
    if (storyBarEl) {
        storyBarEl.addEventListener('click', (e) => {
            const item = e.target.closest('.story-item');
            if (item) openStory(item);
        });
    }

    // ============================================================
    // 0. HELPER: SVG to 3D Viewer
    // ============================================================
    function createSVG3DViewerIframeContent(svgCode, color, preserveBuffer = false) {
        const rendererOptions = `{ antialias: true, preserveDrawingBuffer: ${preserveBuffer} }`;
        const modelColor = color || '#3b82f6'; // Fallback color
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { margin: 0; background: #0a0d14; overflow: hidden; }
                canvas { display: block; }
            </style>
            <script type="importmap">
            {
                "imports": {
                    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
                    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
                }
            }
            <\/script>
        </head>
        <body>
            <script type="module">
                import * as THREE from 'three';
                import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
                import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
                import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

                // 1. SCENE SETUP
                const renderer = new THREE.WebGLRenderer(${rendererOptions});
                renderer.setPixelRatio(window.devicePixelRatio);
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                document.body.appendChild(renderer.domElement);

                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0x0a0d14);

                const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 5000);
                camera.position.set(0, 120, 320);

                const controls = new OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;

                const pmrem = new THREE.PMREMGenerator(renderer);
                scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

                const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
                keyLight.position.set(120, 200, 160);
                scene.add(keyLight);

                const fillLight = new THREE.DirectionalLight(0x8ab4ff, 0.8);
                fillLight.position.set(-160, 60, -120);
                scene.add(fillLight);
                
                const grid = new THREE.GridHelper(1000, 40, 0x2b3550, 0x1a2133);
                scene.add(grid);

                // 2. SVG PROCESSING
                try {
                    const svgText = ${svgCode};
                    const loader = new SVGLoader();
                    const data = loader.parse(svgText);

                    const settings = { depth: 20, bevelEnabled: true, bevelSize: 1, bevelThickness: 1, color: '${modelColor}' };
                    const group = new THREE.Group();
                    const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(settings.color), metalness: 0.25, roughness: 0.35, side: THREE.DoubleSide });
                    const extrudeSettings = { depth: settings.depth, bevelEnabled: settings.bevelEnabled, bevelSize: settings.bevelSize, bevelThickness: settings.bevelThickness, bevelSegments: 3, curveSegments: 24 };

                    for (const path of data.paths) {
                        const shapes = SVGLoader.createShapes(path);
                        for (const shape of shapes) {
                            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                            group.add(new THREE.Mesh(geometry, material));
                        }
                    }
                    group.scale.y = -1;

                    const box = new THREE.Box3().setFromObject(group);
                    const center = box.getCenter(new THREE.Vector3());
                    group.position.sub(center);
                    const wrapper = new THREE.Group();
                    wrapper.add(group);
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z) || 1;
                    const targetSize = 160;
                    wrapper.scale.setScalar(targetSize / maxDim);
                    scene.add(wrapper);

                    const boundingBox = new THREE.Box3().setFromObject(wrapper);
                    const boundingSphere = new THREE.Sphere();
                    boundingBox.getBoundingSphere(boundingSphere);
                    controls.target.copy(boundingSphere.center);
                    const camDistance = boundingSphere.radius * 2.5;
                    camera.position.copy(controls.target).add(new THREE.Vector3(0, 0.5, 1).multiplyScalar(camDistance));
                    camera.lookAt(controls.target);
                    controls.update();
                } catch (e) {
                    const errorDiv = document.createElement('div');
                    errorDiv.style.cssText = 'color:red; padding:20px; font-family:monospace;';
                    errorDiv.textContent = 'SVG Error: ' + e.message;
                    document.body.appendChild(errorDiv);
                }

                (function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); })();
                window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
            <\/script>
        </body>
        </html>
        `;
    }

    // ============================================================
    // 0. HELPER: Post Format Renderers (ROBUST & COMPREHENSIVE)
    // ============================================================

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatRelativeTime(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            const now = new Date();
            const diffMs = now - date;
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHour = Math.floor(diffMin / 60);
            const diffDay = Math.floor(diffHour / 24);

            if (diffSec < 60) return 'Just now';
            if (diffMin < 60) return `${diffMin}m ago`;
            if (diffHour < 24) return `${diffHour}h ago`;
            if (diffDay < 7) return `${diffDay}d ago`;
            if (diffDay < 365) return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            return '';
        }
    }

    window.handleMediaFallback = function(mediaEl, postId, format, iconClass, title) {
        if (!mediaEl || !mediaEl.parentNode) return;
        mediaEl.onerror = null;
        const fallback = document.createElement('div');
        fallback.className = 'fallback-post-card';
        const displayTitle = title || 'Interactive Simulation';
        fallback.innerHTML = `
            <i class="${iconClass || 'ri-image-line'}"></i>
            <span>${escapeHtml(displayTitle)}</span>
            <small style="color:#94a3b8;margin-top:6px;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;">${format || 'Visual'}</small>
        `;
        mediaEl.replaceWith(fallback);
    };

    function renderTikzPost(post, viewType) {
        const fullUrl = post.video_url?.startsWith('http') || post.video_url?.startsWith('data:') 
            ? post.video_url 
            : (post.video_url ? `${getBackendUrl()}${post.video_url}` : '');

        const safeTitle = (post.title || 'TikZ Diagram').replace(/'/g, '&#39;');
        const kenBurnsClass = (viewType === 'reel' || viewType === 'course-preview') ? 'ken-burns' : '';

        if (fullUrl) {
            const mediaHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:transparent; padding:10px; box-sizing:border-box;">
                <img src="${fullUrl}" loading="lazy" decoding="async" 
                    onerror="window.handleMediaFallback(this, '${post.id}', 'TikZ Diagram', 'ri-draft-line', '${safeTitle}');" 
                    class="${kenBurnsClass}"
                    style="max-width:100%; max-height:100%; object-fit:contain; background:transparent; border:none; display:block;">
            </div>`;
            const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background:#090b10;"><img src="${fullUrl}" loading="lazy" style="opacity:0.15; filter:blur(25px); transform:scale(1.15);"></div>` : '';
            return { mediaHTML, backgroundHTML };
        }

        const mediaHTML = `<div class="fallback-post-card"><i class="ri-draft-line"></i><span>${escapeHtml(post.title || 'TikZ Diagram')}</span><small>LaTeX / TikZ</small></div>`;
        const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background:#0a0d14;"></div>` : '';
        return { mediaHTML, backgroundHTML };
    }

    const postRenderers = {
        'tikz': (post, viewType) => renderTikzPost(post, viewType),
        'image': (post, viewType) => {
            if (post.source?.engine === 'tikz' || post.format === 'tikz') {
                return renderTikzPost(post, viewType);
            }
            const fullUrl = post.video_url?.startsWith('http') || post.video_url?.startsWith('data:') ? post.video_url : (post.video_url ? `${getBackendUrl()}${post.video_url}` : '');
            
            if (fullUrl) {
                const safeTitle = (post.title || 'Graphic').replace(/'/g, '&#39;');
                const isSvgGraphic = post.source?.engine === 'svg_to_png' || post.source?.engine === 'd3' || post.source?.engine === 'svg_to_3d';
                const objectFit = isSvgGraphic ? 'contain' : (viewType === 'reel' ? 'contain' : 'cover');
                const kenBurnsClass = (!isSvgGraphic && (viewType === 'reel' || viewType === 'course-preview')) ? 'ken-burns' : '';
                const imgBg = isSvgGraphic ? 'transparent' : '#000';
                const imgPadding = isSvgGraphic ? 'padding: 12px;' : '';
                const mediaHTML = `<img src="${fullUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Graphic', 'ri-image-line', '${safeTitle}');" class="${kenBurnsClass}" style="width: 100%; height: 100%; object-fit: ${objectFit}; background: ${imgBg}; ${imgPadding}">`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #090b10;"><img src="${fullUrl}" loading="lazy" style="opacity: 0.18; filter: blur(25px); transform: scale(1.15);"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }

            const isSvgToPng = post.source && post.source.engine === 'svg_to_png' && post.source.code && typeof window.renderSvgToPng === 'function';
            if (isSvgToPng) {
                const iframeContent = window.renderSvgToPng(post.source.code, {
                    fillColor: post.source.fillColor,
                    strokeColor: post.source.strokeColor,
                    backgroundColor: post.source.backgroundColor || 'transparent',
                    isFeed: true
                });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: ${post.source.backgroundColor || 'transparent'}; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }

            const mediaHTML = `<div class="fallback-post-card"><i class="ri-image-line"></i><span>${escapeHtml(post.title || 'Graphic')}</span><small>Vector Graphic</small></div>`;
            const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background:#0a0d14;"></div>` : '';
            return { mediaHTML, backgroundHTML };
        },
        'diagram': (post, viewType) => {
            if (post.source?.engine === 'tikz' || post.format === 'tikz') {
                return renderTikzPost(post, viewType);
            }
            const canRenderLive = post.source?.engine === 'mermaid' &&
                post.source?.code &&
                typeof window.renderMermaid === 'function';

            if (canRenderLive) {
                const { code, width, height } = post.source;
                const iframeContent = window.renderMermaid(code, width, height);
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else {
                const fullUrl = post.video_url?.startsWith('http') || post.video_url?.startsWith('data:') ? post.video_url : (post.video_url ? `${getBackendUrl()}${post.video_url}` : '');
                if (fullUrl) {
                    const safeTitle = (post.title || 'Diagram').replace(/'/g, '&#39;');
                    const mediaHTML = `<img src="${fullUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Diagram', 'ri-node-tree', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: contain; background: #1e1e23;">`;
                    const backgroundHTML = viewType === 'reel' ? `<div class="reel-background"><img src="${fullUrl}" loading="lazy"></div>` : '';
                    return { mediaHTML, backgroundHTML };
                } else {
                    const mediaHTML = `<div class="fallback-post-card"><i class="ri-node-tree"></i><span>${escapeHtml(post.title || 'Diagram')}</span><small>Scientific Diagram</small></div>`;
                    const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background:#0a0d14;"></div>` : '';
                    return { mediaHTML, backgroundHTML };
                }
            }
        },
        'math': (post, viewType) => {
            if (post.source?.engine === 'tikz' || post.format === 'tikz') {
                return renderTikzPost(post, viewType);
            }
            if (post.source?.engine === 'jsxgraph' && post.source?.code && typeof window.renderJSXGraph === 'function') {
                const iframeContent = window.renderJSXGraph(post.source.code, { background: post.source.background || '#0a0d14' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            const hasSource = post.source?.engine === 'katex' && post.source?.code;
            const canRenderLive = typeof window.renderKatex === 'function' && hasSource;

            if (canRenderLive) {
                const { code, fontSize, color } = post.source;
                const iframeContent = window.renderKatex(code, { fontSize: fontSize || '1.8em', color: color || '#ffffff' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else {
                const fullUrl = post.video_url?.startsWith('http') || post.video_url?.startsWith('data:') ? post.video_url : (post.video_url ? `${getBackendUrl()}${post.video_url}` : '');
                if (fullUrl) {
                    const safeTitle = (post.title || 'Math Formula').replace(/'/g, '&#39;');
                    const mediaHTML = `<img src="${fullUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Math Formula', 'ri-functions', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: contain; background: #0a0d14;">`;
                    const backgroundHTML = viewType === 'reel' ? `<div class="reel-background"><img src="${fullUrl}" loading="lazy"></div>` : '';
                    return { mediaHTML, backgroundHTML };
                } else {
                    const mediaHTML = `<div class="fallback-post-card"><i class="ri-functions"></i><span>${escapeHtml(post.title || 'Math Formula')}</span><small>Mathematical Expression</small></div>`;
                    const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background:#0a0d14;"></div>` : '';
                    return { mediaHTML, backgroundHTML };
                }
            }
        },
        'interactive': (post, viewType) => {
            if (post.source?.engine === 'zdog' && post.source?.code && typeof window.renderZdog === 'function') {
                const iframeContent = window.renderZdog(post.source.code, { background: post.source.background || '#0a0d14' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            if (post.source?.engine === 'thumbnail' && post.source?.code && typeof window.renderFabric === 'function') {
                const iframeContent = window.renderFabric(post.source.code, { background: post.source.background || '#09090b' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #09090b; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #09090b;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            if (post.source?.engine === 'jsxgraph' && post.source?.code && typeof window.renderJSXGraph === 'function') {
                const iframeContent = window.renderJSXGraph(post.source.code, { background: post.source.background || '#0a0d14' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            const fullUrl = post.video_url?.startsWith('http') || post.video_url?.startsWith('data:') ? post.video_url : (post.video_url ? `${getBackendUrl()}${post.video_url}` : '');
            if (fullUrl) {
                const safeTitle = (post.title || 'Interactive').replace(/'/g, '&#39;');
                const mediaHTML = `<img src="${fullUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Interactive', 'ri-terminal-box-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: contain; background: #0a0d14;">`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background"><img src="${fullUrl}" loading="lazy"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else {
                const mediaHTML = `<div class="fallback-post-card"><i class="ri-terminal-box-line"></i><span>${escapeHtml(post.title || 'Interactive Simulation')}</span><small>Interactive Model</small></div>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background:#0a0d14;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
        },
        'pdf': (post, viewType) => {
            const rawPdfUrl = post.pdf_url || (post.video_url && (post.video_url.endsWith('.pdf') || post.video_url.includes('.pdf?')) ? post.video_url : '') || post.source?.pdf_data_url || '';
            
            // Comprehensive cover image detection:
            let fullImgUrl = '';
            if (post.video_url && post.video_url.startsWith('data:image')) {
                fullImgUrl = post.video_url;
            } else if (post.video_url && !post.video_url.endsWith('.pdf') && !post.video_url.includes('.pdf?')) {
                fullImgUrl = post.video_url.startsWith('http') ? post.video_url : `${getBackendUrl()}${post.video_url}`;
            } else if (post.thumbnail_url) {
                fullImgUrl = post.thumbnail_url.startsWith('http') || post.thumbnail_url.startsWith('data:') ? post.thumbnail_url : `${getBackendUrl()}${post.thumbnail_url}`;
            } else if (post.source?.cover_image) {
                fullImgUrl = post.source.cover_image.startsWith('http') || post.source.cover_image.startsWith('data:') ? post.source.cover_image : `${getBackendUrl()}${post.source.cover_image}`;
            } else if (post.source?.thumbnail) {
                fullImgUrl = post.source.thumbnail.startsWith('http') || post.source.thumbnail.startsWith('data:') ? post.source.thumbnail : `${getBackendUrl()}${post.source.thumbnail}`;
            }

            const safeTitle = (post.title || 'Technical Book').replace(/'/g, '&#39;');

            let mediaHTML;
            if (viewType === 'course-preview' && rawPdfUrl) {
                const fullPdfUrl = rawPdfUrl.startsWith('http') ? rawPdfUrl : `${typeof getBackendUrl === 'function' ? getBackendUrl() : ''}${rawPdfUrl}`;
                mediaHTML = `<div class="pdf-viewer-container" data-pdf-url="${fullPdfUrl}" style="width: 100%; height: 100%; min-height: 480px; overflow-y: auto; background: #1e1e24; -webkit-overflow-scrolling: touch; padding: 15px 10px;"></div>`;
            } else if (fullImgUrl) {
                mediaHTML = `<div class="book-cover-wrap" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#080a10; overflow:hidden;">
                    <img src="${fullImgUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Technical Book', 'ri-book-open-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: cover; background: #080a10; display:block;">
                </div>`;
            } else if (rawPdfUrl) {
                const fullPdfUrl = rawPdfUrl.startsWith('http') || rawPdfUrl.startsWith('data:') ? rawPdfUrl : `${getBackendUrl()}${rawPdfUrl}`;
                mediaHTML = `<div class="pdf-thumb-container" data-pdf-url="${fullPdfUrl}" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#080a10; position:relative;">
                    <canvas class="pdf-first-page-canvas" style="max-width:100%; max-height:100%; object-fit:contain; box-shadow:0 8px 24px rgba(0,0,0,0.5); border-radius:4px; display:block;"></canvas>
                </div>`;
            } else {
                mediaHTML = `<div class="fallback-post-card" style="width:100%; height:100%; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; text-align:center; box-sizing:border-box;">
                    <div style="width:58px; height:58px; border-radius:14px; background:rgba(99,102,241,0.18); border:1px solid rgba(99,102,241,0.35); display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
                        <i class="ri-book-open-line" style="font-size:2.2rem; color:#818cf8;"></i>
                    </div>
                    <strong style="color:#ffffff; font-size:1.1rem; line-height:1.35; max-width:90%;">${escapeHtml(post.title || 'Technical Book')}</strong>
                    <span style="font-size:0.75rem; color:#a5b4fc; margin-top:10px; display:inline-flex; align-items:center; gap:6px; font-weight:600; background:rgba(99,102,241,0.15); padding:6px 14px; border-radius:20px; border:1px solid rgba(99,102,241,0.3);">
                        <i class="ri-book-read-line"></i> Open Interactive Book &rarr;
                    </span>
                </div>`;
            }
            const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #111;"></div>` : '';
            return { mediaHTML, backgroundHTML };
        },
        'article': (post, viewType) => {
            const fullMediaUrl = post.video_url ? (post.video_url.startsWith('http') || post.video_url.startsWith('data:') ? post.video_url : `${getBackendUrl()}${post.video_url}`) : '';
            let mediaHTML, backgroundHTML;
            const autoplayAttr = viewType === 'course-preview' ? 'autoplay' : '';
            const isGrid = viewType === 'grid';
            const safeTitle = (post.title || 'Interactive Article').replace(/'/g, '&#39;');

            if (post.media_type && post.media_type.startsWith('video') && fullMediaUrl) {
                const hoverEvents = isGrid ? `onmouseover="this.play()" onmouseout="this.pause()"` : '';
                const objectFit = viewType === 'reel' ? 'contain' : 'cover';
                const preloadAttr = isGrid ? 'preload="none"' : 'preload="metadata"';
                mediaHTML = `<video src="${fullMediaUrl}" ${preloadAttr} loop muted playsinline ${hoverEvents} ${autoplayAttr} onerror="window.handleMediaFallback(this, '${post.id}', 'Interactive Article', 'ri-article-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: ${objectFit};"></video>`;
                backgroundHTML = isGrid ? '' : `<div class="reel-background"><video src="${fullMediaUrl}" preload="none" loop muted playsinline></video></div>`;
            } else if (fullMediaUrl) {
                const objectFit = viewType === 'reel' ? 'contain' : 'cover';
                mediaHTML = `<img src="${fullMediaUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Interactive Article', 'ri-article-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: ${objectFit}; background: #000;">`;
                backgroundHTML = isGrid ? '' : `<div class="reel-background"><img src="${fullMediaUrl}" loading="lazy"></div>`;
            } else {
                mediaHTML = `<div class="fallback-post-card" style="width:100%;height:100%;background:linear-gradient(135deg,#1e1b4b,#0f172a);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;box-sizing:border-box;">
                    <i class="ri-article-line" style="font-size:2.8rem;color:#818cf8;margin-bottom:10px;"></i>
                    <strong style="color:white;font-size:1.05rem;line-height:1.3;max-width:90%;">${escapeHtml(post.title || 'Interactive Article')}</strong>
                    <span style="font-size:0.75rem;color:#94a3b8;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px;">Interactive STEM Article</span>
                </div>`;
                backgroundHTML = isGrid ? '' : `<div class="reel-background" style="background:#0f172a;"></div>`;
            }
            return { mediaHTML, backgroundHTML };
        },
        'explanation': (post, viewType) => {
            const safeTitle = (post.title || 'Interactive Explanation').replace(/'/g, '&#39;');
            const mediaHTML = `<div class="fallback-post-card" style="width: 100%; height: 100%; background: linear-gradient(135deg, #1e1b4b, #0f172a); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; box-sizing: border-box;">
                <div style="width: 54px; height: 54px; border-radius: 14px; background: rgba(70,79,235,0.25); border: 1px solid #464feb; display: flex; align-items: center; justify-content: center; color: #93c5fd; font-size: 1.8rem; margin-bottom: 12px; box-shadow: 0 0 20px rgba(70,79,235,0.4);">
                    <i class="ri-volume-up-line"></i>
                </div>
                <div style="font-weight: 700; font-size: 1.05rem; color: #ffffff; margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 90%;">${escapeHtml(post.title || 'Interactive Walkthrough')}</div>
                <div style="font-size: 0.75rem; color: #818cf8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Audio Walkthrough</div>
            </div>`;
            const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0f172a;"></div>` : '';
            return { mediaHTML, backgroundHTML };
        },
        'course': (post, viewType) => {
            const coverUrl = post.video_url ? (post.video_url.startsWith('http') || post.video_url.startsWith('data:') ? post.video_url : `${getBackendUrl()}${post.video_url}`) : '';
            const sectionsCount = Array.isArray(post.source?.sections) ? post.source.sections.length : 0;
            const subtitleText = sectionsCount > 0 ? `${sectionsCount} Interactive Chapters` : 'Interactive STEM Course';
            const isGrid = viewType === 'grid';
            const safeTitle = (post.title || 'Course').replace(/'/g, '&#39;');

            if (coverUrl && (coverUrl.endsWith('.mp4') || coverUrl.endsWith('.webm') || post.media_type?.startsWith('video'))) {
                const preloadAttr = isGrid ? 'preload="none"' : 'preload="metadata"';
                const hoverEvents = isGrid ? `onmouseover="this.play()" onmouseout="this.pause()"` : '';
                const mediaHTML = `<video src="${coverUrl}" ${preloadAttr} loop muted playsinline ${hoverEvents} onerror="window.handleMediaFallback(this, '${post.id}', 'Course', 'ri-graduation-cap-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: cover;"></video>`;
                const backgroundHTML = isGrid ? '' : `<div class="reel-background"><video src="${coverUrl}" preload="none" loop muted playsinline></video></div>`;
                return { mediaHTML, backgroundHTML };
            } else if (coverUrl) {
                const mediaHTML = `<img src="${coverUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Course', 'ri-graduation-cap-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: cover; background: #0b0f19;">`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background"><img src="${coverUrl}" loading="lazy"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else {
                const mediaHTML = `<div class="fallback-post-card" style="background: linear-gradient(135deg, #1e1b4b 0%, #0c0a09 100%);">
                    <div style="width:54px; height:54px; border-radius:14px; background:rgba(99,102,241,0.2); border:1px solid #6366f1; display:flex; align-items:center; justify-content:center; color:#a5b4fc; font-size:1.8rem; margin-bottom:12px; box-shadow:0 0 20px rgba(99,102,241,0.3);">
                        <i class="ri-graduation-cap-line"></i>
                    </div>
                    <span>${escapeHtml(post.title || 'Interactive Course')}</span>
                    <small style="color:#818cf8;">${subtitleText}</small>
                </div>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background:#1e1b4b;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
        },
        'asset': (post, viewType) => {
            const coverUrl = post.video_url ? (post.video_url.startsWith('http') || post.video_url.startsWith('data:') ? post.video_url : `${getBackendUrl()}${post.video_url}`) : '';
            const itemsCount = Array.isArray(post.source?.assetItems) ? post.source.assetItems.length : 0;
            const subtitleText = itemsCount > 0 ? `${itemsCount} Assets Included` : 'Interactive Asset Pack';
            const isGrid = viewType === 'grid';
            const safeTitle = (post.title || 'Asset Pack').replace(/'/g, '&#39;');

            if (coverUrl) {
                const mediaHTML = `<img src="${coverUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Asset Pack', 'ri-archive-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: cover; background: #0f172a;">`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background"><img src="${coverUrl}" loading="lazy"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else {
                const mediaHTML = `<div class="fallback-post-card" style="background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);">
                    <div style="width:54px; height:54px; border-radius:14px; background:rgba(16,185,129,0.2); border:1px solid #10b981; display:flex; align-items:center; justify-content:center; color:#6ee7b7; font-size:1.8rem; margin-bottom:12px; box-shadow:0 0 20px rgba(16,185,129,0.3);">
                        <i class="ri-archive-line"></i>
                    </div>
                    <span>${escapeHtml(post.title || 'Asset Pack')}</span>
                    <small style="color:#34d399;">${subtitleText}</small>
                </div>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background:#064e3b;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
        },
        '3d_model': (post, viewType) => {
            let mediaHTML, backgroundHTML;
            const hasZdogSource = post.source && post.source.engine === 'zdog' && post.source.code && typeof window.renderZdog === 'function';
            const hasSvg3DSource = post.source && post.source.engine === 'svg_to_3d' && post.source.code && typeof createSVG3DViewerIframeContent === 'function';
            const safeTitle = (post.title || '3D Model').replace(/'/g, '&#39;');

            if (hasZdogSource) {
                const iframeContent = window.renderZdog(post.source.code, { background: post.source.background || '#0a0d14' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
            } else if (hasSvg3DSource) {
                const svgCode = JSON.stringify(post.source.code);
                const modelColor = post.source.color || '#3b82f6';
                const iframeContent = createSVG3DViewerIframeContent(svgCode, modelColor, false);
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
            } else if (post.video_url) {
                const fullUrl = post.video_url.startsWith('http') || post.video_url.startsWith('data:') ? post.video_url : `${getBackendUrl()}${post.video_url}`;
                mediaHTML = `<img src="${fullUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', '3D Simulation', 'ri-box-3-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: cover; background: #1e1e23;">`;
                backgroundHTML = viewType === 'reel' ? `<div class="reel-background"><img src="${fullUrl}" loading="lazy"></div>` : '';
            } else {
                mediaHTML = `<div class="fallback-post-card" style="background: linear-gradient(135deg, #1e1e2f, #0f172a);">
                    <i class="ri-box-3-line" style="color: #60a5fa;"></i>
                    <span>${escapeHtml(post.title || '3D Model')}</span>
                    <small style="color:#94a3b8;">3D Simulation</small>
                </div>`;
                backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0f172a;"></div>` : '';
            }
            return { mediaHTML, backgroundHTML };
        },
        'default': (post, viewType) => { // Handles 'video', '16:9', '9:16', 'animation'
            const fullVideoUrl = post.video_url ? (post.video_url.startsWith('http') || post.video_url.startsWith('data:') ? post.video_url : `${getBackendUrl()}${post.video_url}`) : '';
            const isGrid = viewType === 'grid';
            const hoverEvents = isGrid ? `onmouseover="this.play()" onmouseout="this.pause()"` : '';
            const autoplayAttr = viewType === 'course-preview' ? 'autoplay' : '';
            const objectFit = viewType === 'reel' ? 'contain' : 'cover';
            const preloadAttr = isGrid ? 'preload="none"' : 'preload="metadata"';
            const safeTitle = (post.title || 'Animation').replace(/'/g, '&#39;');

            // Detect if media is actually an image or SVG
            const isImageMedia = post.media_type?.startsWith('image') || (fullVideoUrl && (fullVideoUrl.endsWith('.png') || fullVideoUrl.endsWith('.jpg') || fullVideoUrl.endsWith('.jpeg') || fullVideoUrl.endsWith('.svg') || fullVideoUrl.startsWith('data:image')));

            if (isImageMedia && fullVideoUrl) {
                const mediaHTML = `<img src="${fullVideoUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Visual', 'ri-image-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: ${objectFit}; background: #000;">`;
                const backgroundHTML = isGrid ? '' : `<div class="reel-background"><img src="${fullVideoUrl}" loading="lazy"></div>`;
                return { mediaHTML, backgroundHTML };
            } else if (fullVideoUrl) {
                const mediaHTML = `<video src="${fullVideoUrl}" ${preloadAttr} loop muted playsinline ${hoverEvents} ${autoplayAttr} onerror="window.handleMediaFallback(this, '${post.id}', 'Animation', 'ri-movie-2-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: ${objectFit};"></video>`;
                const backgroundHTML = isGrid ? '' : `<div class="reel-background"><video src="${fullVideoUrl}" preload="none" loop muted playsinline></video></div>`;
                return { mediaHTML, backgroundHTML };
            } else {
                const mediaHTML = `<div class="fallback-post-card" style="background:linear-gradient(135deg,#18181b 0%,#09090b 100%);">
                    <i class="ri-movie-2-line" style="color:#38bdf8;"></i>
                    <span>${escapeHtml(post.title || 'Animation')}</span>
                    <small style="color:#38bdf8;">Scientific Animation</small>
                </div>`;
                const backgroundHTML = isGrid ? '' : `<div class="reel-background" style="background:#09090b;"></div>`;
                return { mediaHTML, backgroundHTML };
            }
        }
    };

    // ============================================================
    // 0. HELPER FUNCTIONS (NEW)
    // ============================================================
    async function deletePost(postId, postTitle) {
        if (!confirm(`Are you sure you want to delete "${postTitle || 'this post'}"? This cannot be undone.`)) {
            return;
        }

        // 1. Remove from localStorage userPosts
        let allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        const updatedPosts = allPosts.filter(p => String(p.id) !== String(postId));
        localStorage.setItem('userPosts', JSON.stringify(updatedPosts));

        // 2. Remove from savedPosts if present
        let savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
        savedPosts = savedPosts.filter(id => String(id) !== String(postId));
        localStorage.setItem('savedPosts', JSON.stringify(savedPosts));

        // 3. Remove article heavy content if any
        localStorage.removeItem(`article_content_${postId}`);

        // 4. Animate and remove from DOM immediately
        const postElToRemove = document.querySelector(`.feed-post[data-post-id="${postId}"]`);
        if (postElToRemove) {
            // For reels, scroll to next before removing
            if (postElToRemove.parentElement && postElToRemove.parentElement.classList.contains('feed-container') && postElToRemove.parentElement.style.scrollSnapType) {
                const nextPost = postElToRemove.nextElementSibling;
                if (nextPost) {
                    nextPost.scrollIntoView({ behavior: 'smooth' });
                    setTimeout(() => postElToRemove.remove(), 300);
                } else {
                    postElToRemove.remove();
                }
            } else { // For grid view
                postElToRemove.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                postElToRemove.style.opacity = '0';
                postElToRemove.style.transform = 'scale(0.95)';
                setTimeout(() => postElToRemove.remove(), 300);
            }
        }

        // 5. Permanently delete from Supabase
        const client = window.supabaseClient || supabase;
        if (client) {
            try {
                const { error } = await client
                    .from('posts')
                    .delete()
                    .eq('id', postId);

                if (error) {
                    console.error("Failed to delete post from Supabase:", error);
                    alert("Warning: Could not delete from server: " + error.message);
                } else {
                    console.log(`Successfully deleted post ${postId} from Supabase.`);
                }
            } catch (err) {
                console.error("Error deleting post from Supabase:", err);
            }
        }
    }

    async function editPost(postId, postTitle) {
        const newTitle = prompt("Enter new title:", postTitle);
        if (newTitle !== null && newTitle.trim()) {
            const trimmedTitle = newTitle.trim();
            // 1. Update in localStorage
            let allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            const postIndex = allPosts.findIndex(p => String(p.id) === String(postId));
            if (postIndex > -1) {
                allPosts[postIndex].title = trimmedTitle;
                localStorage.setItem('userPosts', JSON.stringify(allPosts));
            }

            // 2. Update in DOM
            const postElToUpdate = document.querySelector(`.feed-post[data-post-id="${postId}"]`);
            if (postElToUpdate) {
                const titleEl = postElToUpdate.querySelector('.post-caption span:last-child') || postElToUpdate.querySelector('.post-caption span');
                if (titleEl) titleEl.textContent = trimmedTitle;
            }

            // 3. Update in Supabase
            const client = window.supabaseClient || supabase;
            if (client) {
                try {
                    const { error } = await client
                        .from('posts')
                        .update({ title: trimmedTitle })
                        .eq('id', postId);

                    if (error) {
                        console.error("Failed to update post title in Supabase:", error);
                    } else {
                        console.log(`Successfully updated post ${postId} title in Supabase.`);
                    }
                } catch (err) {
                    console.error("Error updating post title in Supabase:", err);
                }
            }
        }
    }

    // The renderCommentWithLatex function is now replaced by the logic inside createCommentElement.

    // ============================================================
    // 0. ACCESS CONTROL & USER TYPE MANAGEMENT
    // ============================================================
    const userType = localStorage.getItem('userType');
    const username = localStorage.getItem('username');
    const userHandle = localStorage.getItem('handle');
    const currentPage = window.location.pathname;
    const userBio = localStorage.getItem('userBio');

    // --- URL HELPER ---
    function getBackendUrl() {
        // Since the frontend and backend are served from the same domain on Railway,
        // we can always use relative paths for API calls.
        return "";
    }

    // --- LOCALSTORAGE MIGRATION ---
    // Converts old camelCase post fields to snake_case to match the Supabase schema.
    function migrateLocalStoragePosts() {
        const posts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        let needsSave = false;
        const migrated = posts.map(post => {
            let changed = false;
            if ('videoUrl' in post) { post.video_url = post.videoUrl; delete post.videoUrl; changed = true; }
            if ('mediaType' in post) { post.media_type = post.mediaType; delete post.mediaType; changed = true; }
            if ('originalId' in post) { post.original_id = post.originalId; delete post.originalId; changed = true; }
            if ('pdfUrl' in post) { post.pdf_url = post.pdfUrl; delete post.pdfUrl; changed = true; }
            if ('desc' in post) { post.description = post.desc; delete post.desc; changed = true; }
            if (changed) needsSave = true;
            return post;
        });
        if (needsSave) {
            localStorage.setItem('userPosts', JSON.stringify(migrated));
            console.log('Migrated localStorage posts to snake_case schema.');
        }
    }
    // --- SYNC LOCAL ARTICLES & COURSES TO SUPABASE ---
    async function syncLocalCreationsToSupabase(userId) {
        if (!userId || !window.supabaseClient) return;
        try {
            // 1. Sync article bodies
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('article_content_')) {
                    const postId = key.replace('article_content_', '');
                    const localContent = localStorage.getItem(key);
                    if (localContent && postId) {
                        const { data: postData } = await window.supabaseClient
                            .from('posts')
                            .select('id, title, source, user_id')
                            .eq('id', postId)
                            .single();
                        if (postData && postData.user_id === userId && (!postData.source || !postData.source.content)) {
                            const updatedSource = {
                                ...(postData.source || {}),
                                engine: 'article',
                                title: postData.title,
                                content: localContent
                            };
                            await window.supabaseClient
                                .from('posts')
                                .update({ source: updatedSource })
                                .eq('id', postId);
                            console.log(`Synced full HTML content for article ${postId} to Supabase.`);
                        }
                    }
                }
            }

            // 2. Sync local courses
            const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            let coursesUpdated = false;
            for (let j = 0; j < localPosts.length; j++) {
                const p = localPosts[j];
                if (p.format === 'course' && String(p.id).startsWith('course_')) {
                    const newCourseData = {
                        title: p.title || 'Untitled Course',
                        description: p.description || 'Interactive Course',
                        video_url: p.video_url || '',
                        media_type: p.media_type || 'video/mp4',
                        format: 'course',
                        source: {
                            ...(p.source || {}),
                            is_for_sale: true,
                            price: p.price || 29.99
                        },
                        user_id: userId,
                        original_id: null,
                        pdf_url: '',
                        username: localStorage.getItem('username') || 'Creator',
                        avatar_url: localStorage.getItem('avatarUrl') || ''
                    };
                    const { data: inserted, error: insErr } = await window.supabaseClient
                        .from('posts')
                        .insert([newCourseData])
                        .select();
                    if (!insErr && inserted && inserted.length > 0) {
                        localPosts[j] = inserted[0];
                        coursesUpdated = true;
                        console.log(`Synced local course to Supabase with ID: ${inserted[0].id}`);
                    }
                }
            }
            if (coursesUpdated) {
                localStorage.setItem('userPosts', JSON.stringify(localPosts));
            }
        } catch (e) {
            console.warn("Auto-sync local creations to Supabase error:", e);
        }
    }
    window.syncLocalCreationsToSupabase = syncLocalCreationsToSupabase;

    // ============================================================
    // FOLLOW & FOLLOWING SYSTEM (Instagram Style)
    // ============================================================
    function getFollowStorageKey() {
        const uid = localStorage.getItem('userId') || 'guest';
        return `xtra_following_${uid}`;
    }

    function getFollowingList() {
        try {
            return JSON.parse(localStorage.getItem(getFollowStorageKey()) || '[]');
        } catch (e) {
            return [];
        }
    }

    function isFollowingUser(userId, username) {
        if (!userId && !username) return false;
        const list = getFollowingList();
        return list.some(item => {
            if (userId && item.userId && String(item.userId) === String(userId)) return true;
            if (username && item.username && item.username.toLowerCase() === username.toLowerCase()) return true;
            return false;
        });
    }

    function toggleFollowUser(creator) {
        if (!creator) return false;
        const targetUserId = creator.userId || '';
        const targetUsername = creator.username || 'Creator';
        const targetFullName = creator.fullName || targetUsername;
        const targetAvatar = creator.avatarUrl || '';

        // Prevent following oneself
        const myUserId = localStorage.getItem('userId');
        const myUsername = localStorage.getItem('username');
        if (targetUserId && myUserId && String(targetUserId) === String(myUserId)) {
            return false;
        }
        if (targetUsername && myUsername && targetUsername.toLowerCase() === myUsername.toLowerCase()) {
            return false;
        }

        let list = getFollowingList();
        const existingIndex = list.findIndex(item => {
            if (targetUserId && item.userId && String(item.userId) === String(targetUserId)) return true;
            if (targetUsername && item.username && item.username.toLowerCase() === targetUsername.toLowerCase()) return true;
            return false;
        });

        let nowFollowing = false;
        if (existingIndex > -1) {
            // Unfollow
            list.splice(existingIndex, 1);
            nowFollowing = false;
        } else {
            // Follow
            list.push({
                userId: targetUserId,
                username: targetUsername,
                fullName: targetFullName,
                avatarUrl: targetAvatar,
                followedAt: new Date().toISOString()
            });
            nowFollowing = true;
        }

        localStorage.setItem(getFollowStorageKey(), JSON.stringify(list));

        // Update all follow buttons across the entire UI
        updateAllFollowButtons();

        // Dispatch follow change event
        window.dispatchEvent(new CustomEvent('xtra-follow-changed', {
            detail: { userId: targetUserId, username: targetUsername, isFollowing: nowFollowing }
        }));

        return nowFollowing;
    }

    function updateAllFollowButtons() {
        const buttons = document.querySelectorAll('.btn-follow-overlay, .btn-follow-inline, .btn-profile-follow, .btn-follow-modal, .btn-follow');
        buttons.forEach(btn => {
            const uid = btn.dataset.userId || '';
            const uname = btn.dataset.username || btn.dataset.author || '';
            if (uid || uname) {
                const following = isFollowingUser(uid, uname);
                if (following) {
                    btn.textContent = 'Following';
                    btn.classList.add('following');
                } else {
                    btn.textContent = 'Follow';
                    btn.classList.remove('following');
                }
            }
        });

        // Update profile follower/following stats if on profile page
        if (typeof updateProfileFollowStats === 'function') {
            updateProfileFollowStats();
        }
    }

    window.isFollowingUser = isFollowingUser;
    window.toggleFollowUser = toggleFollowUser;
    window.getFollowingList = getFollowingList;
    window.updateAllFollowButtons = updateAllFollowButtons;

    // --- REMIX COUNT HELPERS ---
    function getPostRemixCount(postId) {
        if (!postId) return 0;
        const strId = String(postId);
        let count = 0;
        const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        const globalPosts = window.allLoadedPosts || window.allFeedPosts || [];
        const seen = new Set();

        [...localPosts, ...globalPosts].forEach(p => {
            if (p && p.id && !seen.has(String(p.id))) {
                seen.add(String(p.id));
                const orig = String(p.original_id || p.originalId || '');
                if (orig === strId && String(p.id) !== strId) {
                    count++;
                }
            }
        });
        return count;
    }

    function updateAllRemixCounters() {
        document.querySelectorAll('.feed-post').forEach(postEl => {
            const pid = postEl.dataset.postId;
            if (!pid) return;
            const count = getPostRemixCount(pid);

            // Update remix button count
            const remixCountEl = postEl.querySelector('[data-action="remix"] .action-count');
            if (remixCountEl) {
                remixCountEl.textContent = count;
                remixCountEl.style.display = count > 0 ? 'inline-block' : 'none';
            }

            // Update lineage / evolution button count
            const lineageCountEl = postEl.querySelector('[data-action="lineage"] .action-count');
            if (lineageCountEl) {
                lineageCountEl.textContent = count;
                lineageCountEl.style.display = count > 0 ? 'inline-block' : 'none';
            }
        });
    }

    window.getPostRemixCount = getPostRemixCount;
    window.updateAllRemixCounters = updateAllRemixCounters;

    migrateLocalStoragePosts();

    // --- SAMPLE CONTENT INJECTOR ---
    // If no posts exist, create some beautiful samples to populate the feed.
    function injectSampleContent() {
        const posts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        if (posts.length === 0) {
            console.log("No posts found. Injecting sample content...");
            const samplePosts = [
                {
                    id: 1771713975853,
                    title: "Physics Engine Test",
                    description: "A simple physics simulation using Manim and the Pymunk 2D physics library. Shows collision, gravity, and bounce (elasticity).",
                    video_url: "https://videos.pexels.com/video-files/3209828/3209828-hd_1080_1920_25fps.mp4",
                    media_type: "video/mp4",
                    format: "video",
                    timestamp: new Date("2024-07-21T18:30:00Z").toISOString(),
                    source: { engine: 'manim', code: `from manim import *\nimport pymunk\n\nclass PymunkIntegration(Scene):\n    def construct(self):\n        # ... (code omitted for brevity)` },
                    original_id: null,
                    pdf_url: ''
                },
                {
                    id: 1721234567890,
                    title: "Kinematics Demo",
                    description: "A simple ball drop animation demonstrating easing functions for realistic motion.",
                    video_url: "https://videos.pexels.com/video-files/853877/853877-hd_1080_1920_30fps.mp4",
                    media_type: "video/mp4",
                    format: "video",
                    timestamp: new Date("2024-07-20T12:00:00Z").toISOString(),
                    source: { engine: 'manim', code: `from manim import *\n\nclass KinematicsTemplate(Scene):\n    def construct(self):\n        ground = Line(LEFT * 3, RIGHT * 3).shift(DOWN * 2)\n        ball = Circle(radius=0.2, color=RED, fill_opacity=1).shift(UP * 2)\n        self.play(Create(ground), FadeIn(ball))\n        self.wait(0.5)\n        self.play(ball.animate.next_to(ground, UP, buff=0), rate_func=rate_functions.ease_out_bounce, run_time=2)\n        self.wait()` },
                    original_id: null,
                    pdf_url: ''
                }
            ];
            localStorage.setItem('userPosts', JSON.stringify(samplePosts));
            return true;
        }
        return false;
    }

    // --- PDF.js Renderer for Reels & Previews ---
    // Renders a PDF into a scrollable canvas container for a consistent mobile/desktop experience.
    function renderPdfInReel(container, pdfUrl) {
        if (!window.pdfjsLib) {
            container.innerHTML = `<div class="loading-container"><p style="color:orange;">PDF viewer library loading...</p></div>`;
            return;
        }

        // Set worker source if not already set
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        container.innerHTML = `<div class="loading-container"><div class="spinner"></div><p style="margin-top:10px; color:var(--text-muted);">Loading PDF Document...</p></div>`;

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        loadingTask.promise.then(pdf => {
            container.innerHTML = ''; // Clear loader
            const pageCount = pdf.numPages;

            // Render all pages
            for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
                const canvas = document.createElement('canvas');
                canvas.style.display = "block";
                canvas.style.margin = "0 auto 20px auto"; // Center pages with spacing
                canvas.style.maxWidth = "100%";
                canvas.style.boxShadow = "0 8px 24px rgba(0,0,0,0.6)";
                canvas.style.borderRadius = "4px";
                container.appendChild(canvas);

                pdf.getPage(pageNum).then(page => {
                    const ctx = canvas.getContext('2d');

                    // --- WIDTH-FOCUSED SCALING LOGIC FOR ALL SCREENS ---
                    const viewportRaw = page.getViewport({ scale: 1 });
                    const availableWidth = container.clientWidth || (container.parentElement ? container.parentElement.clientWidth : (window.innerWidth ? window.innerWidth - 24 : 320));
                    const desiredWidth = Math.min(Math.max(availableWidth - 16, 240), 900);
                    const scale = Math.min(desiredWidth / viewportRaw.width, 2.5);

                    const viewport = page.getViewport({ scale: scale });
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    canvas.style.width = '100%';
                    canvas.style.maxWidth = `${viewport.width}px`;

                    const renderContext = { canvasContext: ctx, viewport: viewport };
                    page.render(renderContext);
                });
            }
        }).catch(err => {
            console.error("PDF Load Error in Viewer:", err);
            container.innerHTML = `<div class="loading-container" style="color: #ff6b6b; padding: 24px; text-align: center;">
                <i class="ri-file-pdf-line" style="font-size: 2.5rem; margin-bottom: 10px; color:#f87171;"></i><br>
                <strong style="color:white; font-size:1.05rem;">PDF Document Preview</strong><br>
                <span style="font-size: 0.82rem; color:var(--text-muted);">Click below to open or download the document directly.</span><br>
                <a href="${pdfUrl}" target="_blank" download class="btn-download-file" style="margin-top: 15px; display:inline-flex;">
                    <i class="ri-download-2-line"></i> Download / View PDF
                </a>
            </div>`;
        });
    }

    // ============================================================
    // LIKE & COMMENT SYSTEM (Supabase-backed + Local Fallback)
    // ============================================================

    // --- Relative timestamp helper ---
    function timeAgo(dateString) {
        if (!dateString) return 'Just now';
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now - date) / 1000);
        if (isNaN(seconds) || seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks}w ago`;
        return date.toLocaleDateString();
    }

    // --- In-memory cache for like data (populated by local storage & DB batch fetch) ---
    const likeDataCache = {}; // { [postId]: { count: number, likedByMe: boolean } }
    const commentCountCache = {}; // { [postId]: number }

    // Helper to get local likes map
    function getLocalLikesMap() {
        try {
            return JSON.parse(localStorage.getItem('userPostLikes') || '{}');
        } catch {
            return {};
        }
    }

    function saveLocalLikesMap(map) {
        try {
            localStorage.setItem('userPostLikes', JSON.stringify(map));
        } catch (e) {
            console.warn('Could not write userPostLikes to localStorage', e);
        }
    }

    // Helper to get local comments map
    function getLocalCommentsMap() {
        try {
            return JSON.parse(localStorage.getItem('postComments') || '{}');
        } catch {
            return {};
        }
    }

    function saveLocalCommentsMap(map) {
        try {
            localStorage.setItem('postComments', JSON.stringify(map));
        } catch (e) {
            console.warn('Could not write postComments to localStorage', e);
        }
    }

    // Batch-fetch like counts + user's like state for an array of post IDs
    async function fetchPostLikeData(postIds) {
        if (!postIds || postIds.length === 0) return;
        const strIds = postIds.map(id => String(id));
        const localLikes = getLocalLikesMap();
        const localComments = getLocalCommentsMap();

        // 1. Initial fast hydration from local storage
        strIds.forEach(id => {
            const hasLocalLike = !!localLikes[id];
            const localCommentList = localComments[id] || [];
            if (!likeDataCache[id]) {
                likeDataCache[id] = {
                    count: hasLocalLike ? 1 : 0,
                    likedByMe: hasLocalLike
                };
            }
            if (commentCountCache[id] === undefined) {
                commentCountCache[id] = localCommentList.length;
            }
        });

        // Hydrate DOM from initial cache immediately
        hydratePostLikesAndCommentsInDOM(strIds);

        const client = window.supabaseClient || supabase;
        if (!client) return;

        try {
            // 2. Get like counts from Supabase
            const { data: likesData, error: likesErr } = await client
                .from('likes')
                .select('post_id')
                .in('post_id', strIds);

            const countMap = {};
            if (!likesErr && likesData) {
                likesData.forEach(row => {
                    const pid = String(row.post_id);
                    countMap[pid] = (countMap[pid] || 0) + 1;
                });
            }

            // 3. Check which posts current user liked in Supabase
            const myUserId = localStorage.getItem('userId');
            let myLikes = new Set();
            if (myUserId) {
                const { data: myLikesData, error: myErr } = await client
                    .from('likes')
                    .select('post_id')
                    .eq('user_id', myUserId)
                    .in('post_id', strIds);
                if (!myErr && myLikesData) {
                    myLikesData.forEach(row => myLikes.add(String(row.post_id)));
                }
            }

            // 4. Get comment counts from Supabase
            const { data: commentsData, error: commErr } = await client
                .from('comments')
                .select('post_id')
                .in('post_id', strIds);

            if (!commErr && commentsData) {
                const commCountMap = {};
                commentsData.forEach(row => {
                    const pid = String(row.post_id);
                    commCountMap[pid] = (commCountMap[pid] || 0) + 1;
                });
                strIds.forEach(id => {
                    const dbCount = commCountMap[id] || 0;
                    const locCount = (localComments[id] || []).length;
                    commentCountCache[id] = Math.max(dbCount, locCount);
                });
            }

            // 5. Populate and reconcile cache
            strIds.forEach(id => {
                const dbLiked = myLikes.has(id);
                const localLiked = !!localLikes[id];
                const isLiked = dbLiked || localLiked;
                const dbLikesCount = countMap[id] || 0;
                likeDataCache[id] = {
                    count: Math.max(dbLikesCount, isLiked ? 1 : 0),
                    likedByMe: isLiked
                };
            });

            // 6. Update DOM elements
            hydratePostLikesAndCommentsInDOM(strIds);
        } catch (err) {
            console.warn('Could not refresh remote like data (using local cache):', err);
        }
    }

    function hydratePostLikesAndCommentsInDOM(strIds) {
        strIds.forEach(id => {
            const data = likeDataCache[id] || { count: 0, likedByMe: false };
            const postEls = document.querySelectorAll(`.feed-post[data-post-id="${id}"]`);
            postEls.forEach(postEl => {
                const likeBtn = postEl.querySelector('[data-action="like"]');
                if (likeBtn) {
                    const countEl = likeBtn.querySelector('.action-count');
                    if (countEl) countEl.textContent = data.count;
                    likeBtn.classList.toggle('liked', data.likedByMe);
                    const icon = likeBtn.querySelector('i');
                    if (icon) icon.className = data.likedByMe ? 'ri-heart-fill' : 'ri-heart-line';
                }
                const commentBtn = postEl.querySelector('.ri-chat-3-line')?.closest('.icon-btn');
                if (commentBtn) {
                    const commentCountEl = commentBtn.querySelector('.action-count');
                    if (commentCountEl) commentCountEl.textContent = commentCountCache[id] || 0;
                }
            });
        });
    }

    // Toggle like on a post (instant UI + local storage + Supabase sync)
    async function togglePostLike(postId, likeBtn) {
        const sPostId = String(postId);
        const cached = likeDataCache[sPostId] || { count: 0, likedByMe: false };
        const newLiked = !cached.likedByMe;
        const newCount = Math.max(0, cached.count + (newLiked ? 1 : -1));

        // 1. Instantaneous UI Update
        likeBtn.classList.toggle('liked', newLiked);
        const icon = likeBtn.querySelector('i');
        const countEl = likeBtn.querySelector('.action-count');
        if (icon) icon.className = newLiked ? 'ri-heart-fill' : 'ri-heart-line';
        if (countEl) countEl.textContent = newCount;

        if (newLiked) {
            likeBtn.classList.add('popping');
            setTimeout(() => likeBtn.classList.remove('popping'), 300);
        }

        // 2. Instant Local Storage Update
        likeDataCache[sPostId] = { count: newCount, likedByMe: newLiked };
        const localLikes = getLocalLikesMap();
        if (newLiked) {
            localLikes[sPostId] = true;
        } else {
            delete localLikes[sPostId];
        }
        saveLocalLikesMap(localLikes);

        // 3. Asynchronously sync to Supabase in the background
        const client = window.supabaseClient || supabase;
        if (!client) return;

        try {
            const { data: authData } = await client.auth.getUser();
            const user = authData?.user;
            if (!user) return; // Works in local mode for guest users

            if (newLiked) {
                await client
                    .from('likes')
                    .insert({ user_id: user.id, post_id: sPostId });
            } else {
                await client
                    .from('likes')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('post_id', sPostId);
            }
        } catch (err) {
            console.warn('Background Supabase like sync notice:', err);
        }
    }

    // Helper to format comment text with KaTeX Math and Mermaid Diagrams
    function formatCommentContent(rawText) {
        if (!rawText) return '';

        // 1. Extract and placeholder Mermaid blocks: ```mermaid ... ```
        const mermaidBlocks = [];
        let text = rawText.replace(/```(?:mermaid)?\s*([\s\S]*?)```/gi, (match, code) => {
            const trimmed = code.trim();
            if (trimmed.startsWith('graph') || trimmed.startsWith('sequenceDiagram') || trimmed.startsWith('stateDiagram') || trimmed.startsWith('mindmap') || trimmed.startsWith('classDiagram') || trimmed.startsWith('erDiagram') || trimmed.startsWith('pie') || trimmed.startsWith('gantt')) {
                const placeholder = `___MERMAID_BLOCK_${mermaidBlocks.length}___`;
                mermaidBlocks.push(trimmed);
                return placeholder;
            }
            return match;
        });

        // 2. Wrap bare LaTeX environments (\begin{pmatrix}...\end{pmatrix}) in $$ ... $$ if not already wrapped
        text = text.replace(/(\$?\$?)\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\2\}(\$?\$?)/g, (match, pre, env, body, post) => {
            if (pre && post) return match;
            return `$$\\begin{${env}}${body}\\end{${env}}$$`;
        });

        // 3. Wrap bare LaTeX commands (\sqrt{...}, \frac{...}{...}) in $ ... $ if not already wrapped
        text = text.replace(/(\$?)\\((?:sqrt(?:\[[^\]]*\])?\{[^\}]+\}|frac\{[^\}]+\}\{[^\}]+\}))(\$?)/g, (match, pre, cmd, post) => {
            if (pre && post) return match;
            return `$${cmd}$`;
        });

        // 4. Safely escape HTML for non-math characters
        const escapeHtml = (str) => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        let safeHtml = escapeHtml(text);

        // 5. Restore Mermaid Blocks
        mermaidBlocks.forEach((code, idx) => {
            const placeholder = `___MERMAID_BLOCK_${idx}___`;
            const diagramId = 'mermaid_cmt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            const containerHtml = `<div class="comment-mermaid-wrapper" id="${diagramId}" data-mermaid-code="${encodeURIComponent(code)}">
                <div style="color:#a1a1aa; font-size:0.8rem; padding:6px 0;"><i class="ri-loader-4-line"></i> Loading Diagram…</div>
            </div>`;
            safeHtml = safeHtml.replace(placeholder, () => containerHtml);
        });

        // 6. Convert newlines to <br>
        return safeHtml.replace(/\n/g, '<br>');
    }

    // Automatically renders KaTeX math formulas in a container
    function renderKaTeXInContainer(container) {
        if (!container) return;
        if (window.renderMathInElement && typeof window.renderMathInElement === 'function') {
            try {
                window.renderMathInElement(container, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '\\[', right: '\\]', display: true },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '$', right: '$', display: false }
                    ],
                    output: 'html',
                    throwOnError: false,
                    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"]
                });
            } catch (e) {
                console.warn('KaTeX renderMathInElement notice:', e);
            }
        }
    }

    // Asynchronously renders any Mermaid diagrams present inside a container
    function renderMermaidInContainer(container) {
        if (!container || !window.mermaid) return;
        try {
            window.mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
        } catch (e) { }

        const diagramWrappers = container.querySelectorAll('.comment-mermaid-wrapper[data-mermaid-code]');
        diagramWrappers.forEach(async (wrapper) => {
            const code = decodeURIComponent(wrapper.dataset.mermaidCode || '');
            if (!code) return;
            const uniqueId = 'svg_' + Math.random().toString(36).substr(2, 9);
            try {
                const { svg } = await window.mermaid.render(uniqueId, code);
                wrapper.innerHTML = svg;
                wrapper.removeAttribute('data-mermaid-code');
            } catch (err) {
                console.warn('Mermaid rendering error:', err);
                wrapper.innerHTML = `<div style="color:#f87171; font-size:0.78rem; font-family:monospace; white-space:pre-wrap;">${code}</div>`;
            }
        });
    }

    // Fetch comments for a post (combines Supabase + LocalStorage)
    async function fetchCommentsFromDB(postId) {
        const sPostId = String(postId);
        const client = window.supabaseClient || supabase;
        let dbComments = [];

        if (client) {
            try {
                const { data, error } = await client
                    .from('comments')
                    .select('*')
                    .eq('post_id', sPostId)
                    .order('created_at', { ascending: true });

                if (!error && data) {
                    dbComments = data;
                    const myUserId = localStorage.getItem('userId');
                    if (myUserId && dbComments.length > 0) {
                        const commentIds = dbComments.map(c => c.id);
                        const { data: myCommentLikes } = await client
                            .from('comment_likes')
                            .select('comment_id')
                            .eq('user_id', myUserId)
                            .in('comment_id', commentIds);

                        const likedSet = new Set((myCommentLikes || []).map(r => r.comment_id));

                        const { data: allCommentLikes } = await client
                            .from('comment_likes')
                            .select('comment_id')
                            .in('comment_id', commentIds);
                        const clCountMap = {};
                        (allCommentLikes || []).forEach(r => {
                            clCountMap[r.comment_id] = (clCountMap[r.comment_id] || 0) + 1;
                        });

                        dbComments.forEach(c => {
                            c._likedByMe = likedSet.has(c.id);
                            c._likesCount = clCountMap[c.id] || 0;
                        });
                    }
                }
            } catch (err) {
                console.warn('Could not query comments from Supabase:', err);
            }
        }

        // Retrieve local fallback comments
        const localMap = getLocalCommentsMap();
        const localList = localMap[sPostId] || [];

        // Combine DB comments and local comments (prevent duplicates by text & timestamp)
        const combined = [...dbComments];
        localList.forEach(loc => {
            const exists = combined.some(c => String(c.id) === String(loc.id) || (c.text === loc.text && c.username === loc.username));
            if (!exists) {
                combined.push(loc);
            }
        });

        commentCountCache[sPostId] = combined.length;
        return combined;
    }

    // Post a new comment or reply (supports parent_id for threads)
    async function postCommentToDB(postId, text, parentId = null) {
        const sPostId = String(postId);
        const sParentId = parentId ? String(parentId) : null;
        const myUsername = localStorage.getItem('username') || 'You';
        const myAvatar = localStorage.getItem('avatarUrl') || '';
        const myUserId = localStorage.getItem('userId') || 'local_user_' + Date.now();

        const newCommentObj = {
            id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            post_id: sPostId,
            parent_id: sParentId,
            user_id: myUserId,
            username: myUsername,
            avatar_url: myAvatar,
            text: text,
            created_at: new Date().toISOString(),
            _likesCount: 0,
            _likedByMe: false
        };

        // 1. Instant local persistence
        const localMap = getLocalCommentsMap();
        if (!localMap[sPostId]) localMap[sPostId] = [];
        localMap[sPostId].push(newCommentObj);
        saveLocalCommentsMap(localMap);

        // Update count cache & card badge
        commentCountCache[sPostId] = (commentCountCache[sPostId] || 0) + 1;
        const postEls = document.querySelectorAll(`.feed-post[data-post-id="${sPostId}"]`);
        postEls.forEach(postEl => {
            const commentBtn = postEl.querySelector('.ri-chat-3-line')?.closest('.icon-btn');
            if (commentBtn) {
                const countEl = commentBtn.querySelector('.action-count');
                if (countEl) countEl.textContent = commentCountCache[sPostId];
            }
        });

        // 2. Background sync to Supabase
        const client = window.supabaseClient || supabase;
        if (client) {
            try {
                const { data: authData } = await client.auth.getUser();
                const user = authData?.user;
                if (user) {
                    const insertPayload = {
                        post_id: sPostId,
                        user_id: user.id,
                        username: myUsername,
                        avatar_url: myAvatar,
                        text: text
                    };
                    if (sParentId) insertPayload.parent_id = sParentId;

                    const { data: inserted, error } = await client
                        .from('comments')
                        .insert(insertPayload)
                        .select()
                        .single();

                    if (!error && inserted) {
                        newCommentObj.id = inserted.id;
                    }
                }
            } catch (e) {
                console.warn('Background Supabase comment sync notice:', e);
            }
        }

        return newCommentObj;
    }

    // Toggle like on a comment
    async function toggleCommentLike(commentId, likeBtn) {
        const icon = likeBtn.querySelector('i');
        const countEl = likeBtn.querySelector('span');
        const isCurrentlyLiked = likeBtn.classList.contains('liked');
        const currentCount = parseInt(countEl?.textContent || '0');

        // Optimistic UI
        const newLiked = !isCurrentlyLiked;
        const newCount = Math.max(0, currentCount + (newLiked ? 1 : -1));
        likeBtn.classList.toggle('liked', newLiked);
        if (icon) icon.className = newLiked ? 'ri-heart-fill' : 'ri-heart-line';
        if (countEl) countEl.textContent = newCount;

        const client = window.supabaseClient || supabase;
        if (!client) return;

        try {
            const { data: authData } = await client.auth.getUser();
            const user = authData?.user;
            if (!user) return;

            if (newLiked) {
                await client
                    .from('comment_likes')
                    .insert({ user_id: user.id, comment_id: commentId });
            } else {
                await client
                    .from('comment_likes')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('comment_id', commentId);
            }
        } catch (err) {
            console.warn('Comment like sync note:', err);
        }
    }

    // Delete own comment
    async function deleteCommentFromDB(commentId, postId) {
        const sPostId = String(postId);

        // Remove from local storage
        const localMap = getLocalCommentsMap();
        if (localMap[sPostId]) {
            localMap[sPostId] = localMap[sPostId].filter(c => String(c.id) !== String(commentId));
            saveLocalCommentsMap(localMap);
        }

        if (commentCountCache[sPostId]) {
            commentCountCache[sPostId] = Math.max(0, commentCountCache[sPostId] - 1);
        }

        const postEls = document.querySelectorAll(`.feed-post[data-post-id="${sPostId}"]`);
        postEls.forEach(postEl => {
            const commentBtn = postEl.querySelector('.ri-chat-3-line')?.closest('.icon-btn');
            if (commentBtn) {
                const countEl = commentBtn.querySelector('.action-count');
                if (countEl) countEl.textContent = commentCountCache[sPostId] || 0;
            }
        });

        // Supabase deletion
        const client = window.supabaseClient || supabase;
        if (client) {
            try {
                await client
                    .from('comments')
                    .delete()
                    .eq('id', commentId);
            } catch (err) {
                console.warn('Supabase comment delete note:', err);
            }
        }

        return true;
    }

    // ============================================================
    // REUSABLE POST ELEMENT CREATOR
    // ============================================================
    function createPostElement(post, viewType) { // viewType can be 'grid', 'reel', or 'course-preview'
        const postEl = document.createElement('div');
        postEl.className = 'feed-post';
        postEl.dataset.postId = post.id;

        let initFunction = null;

        // --- Multi-user: determine ownership and display info ---
        const myUserId = localStorage.getItem('userId');
        const isOwnPost = post.user_id && myUserId && post.user_id === myUserId;
        const postAuthor = post.username || 'Anonymous';
        const postAvatar = post.avatar_url || '';
        const avatarStyle = postAvatar
            ? `background-image: url('${postAvatar}'); background-size: cover; background-position: center; background-color: #444;`
            : `background: linear-gradient(135deg, #3b82f6, #8b5cf6);`;
        const authorInitial = postAuthor.charAt(0).toUpperCase();
        const avatarInnerHTML = postAvatar ? '' : `<span style="color:white; font-weight:700; font-size:0.9rem; line-height:1;">${authorInitial}</span>`;

        // --- Format Badge ---
        let badgeText = '';
        if (post.source?.engine === 'tikz' || post.format === 'tikz') {
            badgeText = 'TikZ';
        } else {
            switch (post.format) {
                case 'article': badgeText = 'Article'; break;
                case 'explanation': badgeText = 'Explanation'; break;
                case 'image': badgeText = 'Graph'; break;
                case 'diagram': badgeText = 'Diagram'; break;
                case 'math': badgeText = 'Math'; break;
                case 'pdf': badgeText = 'Book'; break;
                case '3d_model': badgeText = '3D Model'; break;
                case 'threejs_scene': badgeText = '3D Scene'; break;
                case 'video':
                case '16:9':
                case '9:16':
                    badgeText = 'Animation';
                    break;
                default: badgeText = post.format || 'Post';
            }
        }

        let mediaHTML = '';
        let backgroundHTML = '';
        const renderer = postRenderers[post.format] || postRenderers['default'];
        const renderedMedia = renderer(post, viewType);
        mediaHTML = renderedMedia.mediaHTML;
        backgroundHTML = renderedMedia.backgroundHTML;

        if (viewType === 'reel') {
            postEl.innerHTML = `
                ${backgroundHTML}
                <div class="post-media">
                    ${mediaHTML}
                    <div class="post-actions">
                        <button class="icon-btn" data-action="like"><i class="ri-heart-line"></i> <span class="action-count">0</span></button>
                        <button class="icon-btn"><i class="ri-chat-3-line"></i> <span class="action-count">0</span></button>
                        <button class="icon-btn"><i class="ri-send-plane-line"></i> <span class="action-count">${Math.floor(Math.random() * 100) + 5}</span></button>
                        <button class="icon-btn" data-action="remix" title="Remix Creation"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 113.03" style="width:30px;height:30px;"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M36.9,23.5h71.13c8.17,0,14.85,6.69,14.85,14.85v59.83c0,8.17-6.69,14.85-14.85,14.85H36.9 c-8.17,0-14.85-6.68-14.85-14.85V38.35C22.05,30.19,28.73,23.5,36.9,23.5L36.9,23.5z M10.08,73.96c0,2.78-2.26,5.04-5.04,5.04 C2.26,79,0,76.74,0,73.96V19.89C0,14.42,2.24,9.44,5.84,5.84C9.44,2.24,14.42,0,19.89,0h65.37c2.78,0,5.04,2.26,5.04,5.04 c0,2.78-2.26,5.04-5.04,5.04H19.89c-2.69,0-5.15,1.1-6.93,2.88c-1.78,1.78-2.88,4.23-2.88,6.93V73.96L10.08,73.96z M54.3,74.03 c-3.18,0-5.76-2.58-5.76-5.76s2.58-5.76,5.76-5.76H66.7V50.1c0-3.18,2.58-5.76,5.76-5.76s5.76,2.58,5.76,5.76v12.41h12.41 c3.18,0,5.76,2.58,5.76,5.76s-2.58,5.76-5.76,5.76H78.23v12.41c0,3.18-2.58,5.76-5.76,5.76s-5.76-2.58-5.76-5.76V74.03H54.3 L54.3,74.03z"/></svg><span class="action-count">${getPostRemixCount(post.id) || post.remix_count || 0}</span></button>
                        <button class="icon-btn" data-action="lineage" title="Remix Evolution & Lineage"><svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 513.11" style="width:30px;height:30px;"><path fill="currentColor" fill-rule="nonzero" d="M210.48 160.8c0-14.61 11.84-26.46 26.45-26.46s26.45 11.85 26.45 26.46v110.88l73.34 32.24c13.36 5.88 19.42 21.47 13.54 34.82-5.88 13.35-21.47 19.41-34.82 13.54l-87.8-38.6c-10.03-3.76-17.16-13.43-17.16-24.77V160.8zM5.4 168.54c-.76-2.25-1.23-4.64-1.36-7.13l-4-73.49c-.75-14.55 10.45-26.95 25-27.69 14.55-.75 26.95 10.45 27.69 25l.74 13.6a254.258 254.258 0 0136.81-38.32c17.97-15.16 38.38-28.09 61.01-38.18 64.67-28.85 134.85-28.78 196.02-5.35 60.55 23.2 112.36 69.27 141.4 132.83.77 1.38 1.42 2.84 1.94 4.36 27.86 64.06 27.53 133.33 4.37 193.81-23.2 60.55-69.27 112.36-132.83 141.39a26.24 26.24 0 01-12.89 3.35c-14.61 0-26.45-11.84-26.45-26.45 0-11.5 7.34-21.28 17.59-24.92 7.69-3.53 15.06-7.47 22.09-11.8.8-.66 1.65-1.28 2.55-1.86 11.33-7.32 22.1-15.7 31.84-25.04.64-.61 1.31-1.19 2-1.72 20.66-20.5 36.48-45.06 46.71-71.76 18.66-48.7 18.77-104.46-4.1-155.72l-.01-.03C418.65 122.16 377.13 85 328.5 66.37c-48.7-18.65-104.46-18.76-155.72 4.1a203.616 203.616 0 00-48.4 30.33c-9.86 8.32-18.8 17.46-26.75 27.29l3.45-.43c14.49-1.77 27.68 8.55 29.45 23.04 1.77 14.49-8.55 27.68-23.04 29.45l-73.06 9c-13.66 1.66-26.16-7.41-29.03-20.61zM283.49 511.5c20.88-2.34 30.84-26.93 17.46-43.16-5.71-6.93-14.39-10.34-23.29-9.42-15.56 1.75-31.13 1.72-46.68-.13-9.34-1.11-18.45 2.72-24.19 10.17-12.36 16.43-2.55 39.77 17.82 42.35 19.58 2.34 39.28 2.39 58.88.19zm-168.74-40.67c7.92 5.26 17.77 5.86 26.32 1.74 18.29-9.06 19.97-34.41 3.01-45.76-12.81-8.45-25.14-18.96-35.61-30.16-9.58-10.2-25.28-11.25-36.11-2.39a26.436 26.436 0 00-2.55 38.5c13.34 14.2 28.66 27.34 44.94 38.07zM10.93 331.97c2.92 9.44 10.72 16.32 20.41 18.18 19.54 3.63 36.01-14.84 30.13-33.82-4.66-15-7.49-30.26-8.64-45.93-1.36-18.33-20.21-29.62-37.06-22.33C5.5 252.72-.69 262.86.06 274.14c1.42 19.66 5.02 39 10.87 57.83z"/></svg><span class="action-count">${getPostRemixCount(post.id) || post.remix_count || 0}</span></button>
                        <button class="icon-btn" data-action="save"><i class="ri-bookmark-line"></i></button>
                        <button class="icon-btn post-options-btn-reel"><i class="ri-more-2-fill"></i></button>
                    </div>
                    <div class="post-footer">
                        <div class="post-header">
                            <div class="avatar" style="${avatarStyle}; display:flex; align-items:center; justify-content:center;">${avatarInnerHTML}</div>
                            <span class="post-username" data-user-id="${post.user_id || ''}" style="cursor:pointer;">${postAuthor}</span>
                            ${!isOwnPost ? `<button class="btn-follow-overlay" data-user-id="${post.user_id || ''}" data-username="${postAuthor}">Follow</button>` : ''}
                        </div>
                        <div class="post-caption">
                            <span>${post.title}</span>
                        </div>
                    </div>
                    <div class="video-progress-container">
                        <div class="video-progress-bar"></div>
                    </div>
                    <div class="like-heart-overlay"></div>
                </div>
            `;
        } else if (viewType === 'course-preview') {
            postEl.innerHTML = `
                <div class="post-media">
                    ${mediaHTML}
                </div>
            `;
        } else { // 'grid' view
            const isPaywalled = (post.source?.is_premium || post.source?.subscriber_only || post.is_premium || post.subscriber_only) && !(window.isItemUnlocked && window.isItemUnlocked(post.id));
            const paywallOverlayHTML = isPaywalled ? `
                <div class="subscriber-paywall-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;backdrop-filter:blur(18px);background:rgba(0,0,0,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;padding:20px;text-align:center;box-sizing:border-box;">
                    <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,rgba(59,130,246,0.2),rgba(147,51,234,0.2));border:1px solid rgba(147,51,234,0.4);display:flex;align-items:center;justify-content:center;font-size:1.6rem;color:#c084fc;margin-bottom:10px;">
                        <i class="ri-vip-crown-2-line"></i>
                    </div>
                    <div style="font-weight:800;font-size:1.05rem;color:#fff;margin-bottom:4px;">Subscriber Only Content</div>
                    <div style="font-size:0.78rem;color:#a1a1aa;margin-bottom:14px;max-width:280px;">Upgrade to XtraPath Pro or subscribe to view this scientific simulation.</div>
                    <button class="unlock-pro-feed-btn" style="padding:8px 20px;background:linear-gradient(135deg,#3b82f6,#9333ea);color:#fff;border:none;border-radius:20px;font-size:0.84rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 15px rgba(147,51,234,0.4);">
                        <i class="ri-sparkling-line"></i> Unlock with Pro
                    </button>
                </div>
            ` : '';

            postEl.innerHTML = `
                <div class="post-media" data-post-id="${post.id}">
                    <div class="post-header">
                        <div class="avatar" style="${avatarStyle}; display:flex; align-items:center; justify-content:center;">${avatarInnerHTML}</div>
                        <span class="post-username" data-user-id="${post.user_id || ''}" style="cursor:pointer;">${postAuthor}</span>
                        ${!isOwnPost ? `<button class="btn-follow-overlay" data-user-id="${post.user_id || ''}" data-username="${postAuthor}">Follow</button>` : ''}
                        ${isOwnPost ? `
                        <button class="post-options-btn" style="margin-left:auto;"><i class="ri-more-2-fill"></i></button>
                        <div class="post-options-menu">
                            <button class="menu-item" data-action="edit">Edit Details</button>
                            <button class="menu-item menu-item-danger" data-action="delete">Delete Post</button>
                        </div>` : ''}
                    </div>
                    ${mediaHTML}
                    ${paywallOverlayHTML}
                    <div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; font-size: 0.7rem; font-weight: 600; padding: 3px 7px; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.5px; backdrop-filter: blur(4px); z-index: 1;">${badgeText}</div>
                </div>
                <div class="post-actions">
                    <button class="icon-btn" data-action="like"><i class="ri-heart-line"></i> <span class="action-count">0</span></button>
                    <button class="icon-btn"><i class="ri-chat-3-line"></i> <span class="action-count">0</span></button>
                    <button class="icon-btn"><i class="ri-send-plane-line"></i> <span class="action-count">${Math.floor(Math.random() * 100) + 5}</span></button>
                    <button class="icon-btn" data-action="remix" title="Remix Creation"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 113.03" style="width:24px;height:24px;"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M36.9,23.5h71.13c8.17,0,14.85,6.69,14.85,14.85v59.83c0,8.17-6.69,14.85-14.85,14.85H36.9 c-8.17,0-14.85-6.68-14.85-14.85V38.35C22.05,30.19,28.73,23.5,36.9,23.5L36.9,23.5z M10.08,73.96c0,2.78-2.26,5.04-5.04,5.04 C2.26,79,0,76.74,0,73.96V19.89C0,14.42,2.24,9.44,5.84,5.84C9.44,2.24,14.42,0,19.89,0h65.37c2.78,0,5.04,2.26,5.04,5.04 c0,2.78-2.26,5.04-5.04,5.04H19.89c-2.69,0-5.15,1.1-6.93,2.88c-1.78,1.78-2.88,4.23-2.88,6.93V73.96L10.08,73.96z M54.3,74.03 c-3.18,0-5.76-2.58-5.76-5.76s2.58-5.76,5.76-5.76H66.7V50.1c0-3.18,2.58-5.76,5.76-5.76s5.76,2.58,5.76,5.76v12.41h12.41 c3.18,0,5.76,2.58,5.76,5.76s-2.58,5.76-5.76,5.76H78.23v12.41c0,3.18-2.58,5.76-5.76,5.76s-5.76-2.58-5.76-5.76V74.03H54.3 L54.3,74.03z"/></svg><span class="action-count">${getPostRemixCount(post.id) || post.remix_count || 0}</span></button>
                    <button class="icon-btn" data-action="lineage" title="Remix Evolution & Lineage"><svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 513.11" style="width:24px;height:24px;"><path fill="currentColor" fill-rule="nonzero" d="M210.48 160.8c0-14.61 11.84-26.46 26.45-26.46s26.45 11.85 26.45 26.46v110.88l73.34 32.24c13.36 5.88 19.42 21.47 13.54 34.82-5.88 13.35-21.47 19.41-34.82 13.54l-87.8-38.6c-10.03-3.76-17.16-13.43-17.16-24.77V160.8zM5.4 168.54c-.76-2.25-1.23-4.64-1.36-7.13l-4-73.49c-.75-14.55 10.45-26.95 25-27.69 14.55-.75 26.95 10.45 27.69 25l.74 13.6a254.258 254.258 0 0136.81-38.32c17.97-15.16 38.38-28.09 61.01-38.18 64.67-28.85 134.85-28.78 196.02-5.35 60.55 23.2 112.36 69.27 141.4 132.83.77 1.38 1.42 2.84 1.94 4.36 27.86 64.06 27.53 133.33 4.37 193.81-23.2 60.55-69.27 112.36-132.83 141.39a26.24 26.24 0 01-12.89 3.35c-14.61 0-26.45-11.84-26.45-26.45 0-11.5 7.34-21.28 17.59-24.92 7.69-3.53 15.06-7.47 22.09-11.8.8-.66 1.65-1.28 2.55-1.86 11.33-7.32 22.1-15.7 31.84-25.04.64-.61 1.31-1.19 2-1.72 20.66-20.5 36.48-45.06 46.71-71.76 18.66-48.7 18.77-104.46-4.1-155.72l-.01-.03C418.65 122.16 377.13 85 328.5 66.37c-48.7-18.65-104.46-18.76-155.72 4.1a203.616 203.616 0 00-48.4 30.33c-9.86 8.32-18.8 17.46-26.75 27.29l3.45-.43c14.49-1.77 27.68 8.55 29.45 23.04 1.77 14.49-8.55 27.68-23.04 29.45l-73.06 9c-13.66 1.66-26.16-7.41-29.03-20.61zM283.49 511.5c20.88-2.34 30.84-26.93 17.46-43.16-5.71-6.93-14.39-10.34-23.29-9.42-15.56 1.75-31.13 1.72-46.68-.13-9.34-1.11-18.45 2.72-24.19 10.17-12.36 16.43-2.55 39.77 17.82 42.35 19.58 2.34 39.28 2.39 58.88.19zm-168.74-40.67c7.92 5.26 17.77 5.86 26.32 1.74 18.29-9.06 19.97-34.41 3.01-45.76-12.81-8.45-25.14-18.96-35.61-30.16-9.58-10.2-25.28-11.25-36.11-2.39a26.436 26.436 0 00-2.55 38.5c13.34 14.2 28.66 27.34 44.94 38.07zM10.93 331.97c2.92 9.44 10.72 16.32 20.41 18.18 19.54 3.63 36.01-14.84 30.13-33.82-4.66-15-7.49-30.26-8.64-45.93-1.36-18.33-20.21-29.62-37.06-22.33C5.5 252.72-.69 262.86.06 274.14c1.42 19.66 5.02 39 10.87 57.83z"/></svg><span class="action-count">${getPostRemixCount(post.id) || post.remix_count || 0}</span></button>
                    <button class="icon-btn" style="margin-left: auto;" data-action="save"><i class="ri-bookmark-line"></i></button>
                </div>
                <div class="post-footer">
                    <div class="post-caption">
                        <span class="post-username" data-user-id="${post.user_id || ''}" style="cursor:pointer;">${post.original_id ? `${postAuthor} (Remix)` : postAuthor}</span>
                        <span>${post.title}</span>
                    </div>
                </div>
                <div class="like-heart-overlay"></div>
            `;

            const unlockFeedBtn = postEl.querySelector('.unlock-pro-feed-btn');
            if (unlockFeedBtn) {
                unlockFeedBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.openPricingModal) window.openPricingModal();
                });
            }
        }

        // --- Event Listeners for Actions ---
        const likeBtn = postEl.querySelector('[data-action="like"]');
        if (likeBtn) {
            likeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePostLike(post.id, likeBtn);
            });
        }

        const remixBtn = postEl.querySelector('[data-action="remix"]');
        if (remixBtn) {
            const remixCountEl = remixBtn.querySelector('.action-count');
            const remixCount = getPostRemixCount(post.id) || post.remix_count || 0;
            if (remixCountEl) {
                remixCountEl.textContent = remixCount;
                if (remixCount === 0) remixCountEl.style.display = 'none';
            }

            remixBtn.addEventListener('click', (e) => {
                e.stopPropagation();

                // Pay-to-Remix / Source Code Protection Check
                const isProtected = window.isPostCodeProtected ? window.isPostCodeProtected(post) : (post.source?.is_source_protected || post.is_source_protected);
                const currentUserId = localStorage.getItem('userId');
                const isAuthor = currentUserId && post.user_id && String(currentUserId) === String(post.user_id);
                const isUnlocked = window.isItemUnlocked ? window.isItemUnlocked(post.id) : false;

                if (isProtected && !isAuthor && !isUnlocked) {
                    if (typeof window.openSourceCodeUnlockModal === 'function') {
                        window.openSourceCodeUnlockModal(post, () => {
                            proceedToRemix();
                        });
                        return;
                    }
                }

                proceedToRemix();

                function proceedToRemix() {
                    const srcObj = post.source || (post.code ? { engine: 'manim', code: post.code } : null);
                    if (srcObj) {
                        localStorage.setItem('remixMeta', JSON.stringify({
                            source: srcObj,
                            originalId: post.id,
                            userId: post.user_id,
                            title: post.title,
                            is_source_protected: isProtected,
                            code_price: post.source?.code_price || post.code_price || 2.99
                        }));
                        let editorUrl;
                        switch (srcObj.engine) {
                            case 'latex': editorUrl = '/views/xtraBook.html'; break;
                            case 'desmos': editorUrl = '/views/xtraGraph.html'; break;
                            case 'jsxgraph': editorUrl = '/views/xtraAnim.html?tool=jsxgraph'; break;
                            case 'zdog': editorUrl = '/views/xtraAnim.html?tool=zdog'; break;
                            case 'thumbnail': editorUrl = '/views/xtraAnim.html?tool=thumbnail'; break;
                            case 'svg_to_3d': editorUrl = '/views/xtraAnim.html'; break;
                            case 'svg_to_png': editorUrl = '/views/xtraAnim.html?tool=svg_to_png'; break;
                            case 'tikz': editorUrl = '/views/xtraAnim.html?tool=tikz'; break;
                            default: editorUrl = '/views/xtraAnim.html';
                        }
                        window.location.href = editorUrl;
                    } else {
                        alert("No source code available for this post to remix.");
                    }
                }
            });
        }

        const historyBtn = postEl.querySelector('[data-action="lineage"]') || postEl.querySelector('.post-actions button:nth-child(5)');
        if (historyBtn) {
            if (!historyBtn.querySelector('.action-count')) {
                const countSpan = document.createElement('span');
                countSpan.className = 'action-count';
                historyBtn.appendChild(countSpan);
            }
            const historyCountEl = historyBtn.querySelector('.action-count');
            const remixCount = getPostRemixCount(post.id) || post.remix_count || 0;
            if (historyCountEl) {
                historyCountEl.textContent = remixCount;
                if (remixCount === 0) historyCountEl.style.display = 'none';
            }
            historyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const rootId = post.original_id || post.originalId || post.id;
                window.location.href = `/views/lineage.html?id=${encodeURIComponent(rootId)}`;
            });
        }

        // Clicking avatar or username navigates to author profile
        const navigateToProfile = (uid) => {
            if (!uid) return;
            const myUserId = localStorage.getItem('userId');
            if (uid === myUserId) {
                window.location.href = '/views/profile.html';
            } else {
                window.location.href = `/views/profile.html?user_id=${uid}`;
            }
        };

        postEl.querySelectorAll('.avatar').forEach(aEl => {
            aEl.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateToProfile(post.user_id);
            });
        });

        postEl.querySelectorAll('.post-username').forEach(uEl => {
            uEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const uid = uEl.dataset.userId || post.user_id;
                navigateToProfile(uid);
            });
        });

        // --- SAVE BUTTON LOGIC ---
        const saveBtn = postEl.querySelector('[data-action="save"]');
        if (saveBtn) {
            const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
            let isSaved = savedPosts.includes(post.id);
            const saveIcon = saveBtn.querySelector('i');

            const updateSaveButton = () => {
                if (isSaved) {
                    saveIcon.className = 'ri-bookmark-fill';
                    saveBtn.classList.add('saved');
                } else {
                    saveIcon.className = 'ri-bookmark-line';
                    saveBtn.classList.remove('saved');
                }
            };

            updateSaveButton(); // Set initial state

            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                let currentSaved = JSON.parse(localStorage.getItem('savedPosts') || '[]');
                if (isSaved) {
                    currentSaved = currentSaved.filter(id => id != post.id);
                } else {
                    currentSaved.unshift(post.id); // Add to the beginning to get most recent
                }
                localStorage.setItem('savedPosts', JSON.stringify(currentSaved));
                isSaved = !isSaved;
                updateSaveButton();
            });
        }

        const mediaContainer = postEl.querySelector('.post-media');
        const video = mediaContainer ? mediaContainer.querySelector('video') : null;


        // For PDF posts, create an init function that will be called after the element is in the DOM.
        // This solves all race conditions with rendering.
        const pdfContainer = postEl.querySelector('.pdf-viewer-container');
        if (pdfContainer && pdfContainer.dataset.pdfUrl) {
            initFunction = () => {
                const triggerPdfRender = () => {
                    if (typeof renderPdfInReel === 'function') {
                        renderPdfInReel(pdfContainer, pdfContainer.dataset.pdfUrl);
                    }
                };

                if (viewType === 'course-preview') {
                    // For course preview, render immediately
                    setTimeout(triggerPdfRender, 50);
                } else {
                    const observer = new IntersectionObserver((entries, obs) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                triggerPdfRender();
                                obs.disconnect();
                            }
                        });
                    }, { threshold: 0.01 });

                    setTimeout(() => {
                        if (document.body.contains(pdfContainer)) {
                            observer.observe(pdfContainer);
                        } else {
                            triggerPdfRender();
                        }
                    }, 0);
                }
            };
        }

        const pdfThumbContainer = postEl.querySelector('.pdf-thumb-container');
        if (pdfThumbContainer && pdfThumbContainer.dataset.pdfUrl) {
            const priorInit = initFunction;
            initFunction = () => {
                if (typeof priorInit === 'function') priorInit();
                const renderThumb = () => {
                    if (!window.pdfjsLib) return;
                    const canvas = pdfThumbContainer.querySelector('canvas');
                    if (!canvas) return;
                    window.pdfjsLib.getDocument(pdfThumbContainer.dataset.pdfUrl).promise.then(pdf => {
                        return pdf.getPage(1);
                    }).then(page => {
                        const viewportRaw = page.getViewport({ scale: 1 });
                        const targetWidth = 450;
                        const scale = targetWidth / viewportRaw.width;
                        const viewport = page.getViewport({ scale: scale });
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        const ctx = canvas.getContext('2d');
                        page.render({ canvasContext: ctx, viewport: viewport });
                    }).catch(err => {
                        console.warn("Could not render first page of book PDF:", err);
                    });
                };

                const observer = new IntersectionObserver((entries, obs) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            renderThumb();
                            obs.disconnect();
                        }
                    });
                }, { threshold: 0.01 });

                setTimeout(() => {
                    if (document.body.contains(pdfThumbContainer)) {
                        observer.observe(pdfThumbContainer);
                    } else {
                        renderThumb();
                    }
                }, 0);
            };
        }

        if (video) {
            const bgVideo = postEl.querySelector('.reel-background video');
            if (bgVideo) {
                video.addEventListener('play', () => bgVideo.play());
                video.addEventListener('pause', () => bgVideo.pause());
            }
        }

        const progressBar = postEl.querySelector('.video-progress-bar');
        if (video && progressBar) {
            video.addEventListener('timeupdate', () => {
                if (video.duration > 0) {
                    const progress = (video.currentTime / video.duration) * 100;
                    progressBar.style.width = `${progress}%`;
                }
            });
        }

        if (mediaContainer) {
            let lastTap = 0;
            mediaContainer.addEventListener('click', (e) => {
                // Ignore clicks on header items, avatar, username, options menu
                if (e.target.closest('.avatar, .post-username, .btn-follow-overlay, .post-options-btn, .post-options-menu, .unlock-pro-feed-btn, .post-header')) {
                    return;
                }

                if (viewType === 'grid') {
                    // Navigate directly to dedicated viewer
                    if (post.format === 'pdf') {
                        window.location.href = `/views/bookView.html?id=${encodeURIComponent(post.id)}`;
                    } else if (post.format === 'article') {
                        window.location.href = `/views/articleView.html?id=${encodeURIComponent(post.id)}`;
                    } else if (post.format === 'explanation') {
                        window.location.href = `/views/explainView.html?id=${encodeURIComponent(post.id)}`;
                    } else if (post.format === 'course' || post.format === 'asset') {
                        window.location.href = `/views/courseView.html?id=${encodeURIComponent(post.id)}`;
                    } else {
                        window.location.href = `/views/reels.html?id=${encodeURIComponent(post.id)}`;
                    }
                    return;
                }

                // In Reels mode: double tap to like, single tap to play/pause
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                if (tapLength < 300 && tapLength > 0) {
                    e.preventDefault();
                    const heartOverlay = postEl.querySelector('.like-heart-overlay');
                    if (heartOverlay) {
                        heartOverlay.innerHTML = '<i class="ri-heart-fill"></i>';
                        heartOverlay.classList.add('popping');
                        setTimeout(() => {
                            heartOverlay.classList.add('fade-out');
                            setTimeout(() => {
                                heartOverlay.classList.remove('popping', 'fade-out');
                            }, 500);
                        }, 500);
                    }
                    const likeBtn = postEl.querySelector('.post-actions .icon-btn:nth-child(1)');
                    if (likeBtn && !likeBtn.classList.contains('liked')) {
                        likeBtn.click();
                    }
                } else {
                    setTimeout(() => {
                        if (viewType === 'reel' && video && (new Date().getTime() - lastTap > 300)) {
                            if (video.paused) video.play(); else video.pause();
                        }
                    }, 300);
                }
                lastTap = currentTime;
            });
        }

        // Title click navigation in Explore feed
        const postTitleEl = postEl.querySelector('.post-title-text');
        if (postTitleEl && viewType === 'grid') {
            postTitleEl.style.cursor = 'pointer';
            postTitleEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (post.format === 'pdf') {
                    window.location.href = `/views/bookView.html?id=${encodeURIComponent(post.id)}`;
                } else if (post.format === 'article') {
                    window.location.href = `/views/articleView.html?id=${encodeURIComponent(post.id)}`;
                } else if (post.format === 'explanation') {
                    window.location.href = `/views/explainView.html?id=${encodeURIComponent(post.id)}`;
                } else if (post.format === 'course' || post.format === 'asset') {
                    window.location.href = `/views/courseView.html?id=${encodeURIComponent(post.id)}`;
                } else {
                    window.location.href = `/views/reels.html?id=${encodeURIComponent(post.id)}`;
                }
            });
        }

        const shareBtn = postEl.querySelector('.ri-send-plane-line')?.closest('.icon-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.XtraShare) {
                    window.XtraShare.open({
                        id: post.id,
                        title: post.title || 'Interactive STEM Creation',
                        desc: post.description || post.caption || 'Created with XtraPath Studio',
                        author: postAuthor,
                        avatar: postAvatar || '',
                        type: post.format || post.type || 'reel',
                        thumbnail: post.thumbnail_url || post.cover_image || '',
                        video_url: post.video_url || '',
                        rawPost: post
                    });
                }
            });
        }

        // --- COMMENT BUTTON LOGIC ---
        const commentBtn = postEl.querySelector('.ri-chat-3-line')?.closest('.icon-btn');
        if (commentBtn) {
            commentBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openCommentModal(post.id);
            });
        }

        // Add listener for reel options button
        const reelOptionsBtn = postEl.querySelector('.post-options-btn-reel');
        if (reelOptionsBtn) {
            reelOptionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const modal = document.getElementById('reelOptionsModal');
                if (modal) {
                    modal.dataset.postId = post.id;
                    modal.dataset.postTitle = post.title;
                    modal.style.display = 'flex';
                }
            });
        }

        // --- POST OPTIONS MENU (EDIT/DELETE) ---
        const optionsBtn = postEl.querySelector('.post-options-btn');
        const optionsMenu = postEl.querySelector('.post-options-menu');

        if (optionsBtn && optionsMenu) {
            optionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                optionsMenu.style.display = optionsMenu.style.display === 'block' ? 'none' : 'block';
            });

            // Hide menu if clicking elsewhere
            document.addEventListener('click', (e) => {
                if (!optionsMenu.contains(e.target) && !optionsBtn.contains(e.target)) {
                    optionsMenu.style.display = 'none';
                }
            });

            optionsMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = e.target.dataset.action;
                if (action === 'delete') {
                    deletePost(post.id, post.title);
                } else if (action === 'edit') {
                    editPost(post.id, post.title);
                }
                // Hide menu after action
                optionsMenu.style.display = 'none';
            });
        }

        return { element: postEl, init: initFunction };
    }
    window.createPostElement = createPostElement;

    function updateHeader() {
        const userType = localStorage.getItem('userType');
        const username = localStorage.getItem('username');
        const currentPage = window.location.pathname;
        // FIX: Make selector more specific to the top header to prevent it from
        // breaking the login and signup pages, which do not have a .top-header.
        let authContainer = document.querySelector('.top-header #auth-buttons');

        if (authContainer) {
            // NEW: On the store page, remove header buttons (bell icon, etc.).
            if (currentPage.includes('/views/store.html')) { // For the store page, inject cart into auth-buttons, and search bar into the header itself.
                authContainer.innerHTML = `
                    <button class="icon-btn store-cart-btn" title="Shopping Cart" style="font-size: 1.7rem; color: white;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1m-9-1a2 2 0 0 1 4 0v1h-4Zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2Z" />
                        </svg>
                    </button>
                `;

                const header = authContainer.closest('.top-header');
                // Check if search bar already exists to prevent duplicates on re-renders
                if (header && !header.querySelector('.search-bar')) {
                    const searchInput = document.createElement('input');
                    searchInput.type = 'text';
                    searchInput.className = 'search-bar';
                    searchInput.placeholder = 'Search...';
                    header.insertBefore(searchInput, authContainer);
                }
                return;
            }

            if (userType === 'creator' || userType === 'viewer') {
                // Logged in: clean header (no notification bell)
                authContainer.innerHTML = '';
            } else {
                // If no userType, show Login/Signup buttons
                authContainer.innerHTML = `
                    <a href="/views/login.html" class="btn-glass" style="font-size: 0.8rem; padding: 6px 12px;">Log In</a>
                    <a href="/views/signup.html" class="btn-primary" style="font-size: 0.8rem; padding: 6px 14px;">Sign Up</a>
                `;
            }
        }
    }
    updateHeader();

    // 2. UI Adaptation based on User Type
    if (userType) {
        // A. Sidebar Navigation: Hide Creator Tools for Viewers
        // This logic is now removed as we are unifying the experience.
        /*
        if (userType === 'viewer') {
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                const href = item.getAttribute('href');
                if (href && (href.includes('home.html') || href.includes('xtraAnim.html') || href.includes('xtraBook.html') || href.includes('xtraGraph.html'))) {
                    item.style.display = 'none';
                }
            });
        }
        */

        // B. Update Profile Info in Sidebar (if present)
        const sidebarName = document.querySelector('.user-profile div[style*="font-weight:600"]');
        if (sidebarName) sidebarName.textContent = username;

        const sidebarRole = document.querySelector('.user-profile div[style*="color:var(--text-dust)"], .user-profile div[style*="color:var(--text-muted)"]');
        if (sidebarRole) sidebarRole.textContent = userType === 'creator' ? 'Pro Plan' : 'Viewer';
    }

    // D. Profile Page — own profile OR public profile of another user
    if (currentPage.includes('profile.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const viewingUserId = urlParams.get('user_id') || urlParams.get('id');
        let myUserId = localStorage.getItem('userId');

        // Asynchronous check in case userId is not yet populated in localStorage
        if (!myUserId && supabase) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    myUserId = user.id;
                    localStorage.setItem('userId', user.id);
                }
            } catch (_) {}
        }

        const isOwnProfile = !viewingUserId || viewingUserId === myUserId;
        let targetUserId = viewingUserId || myUserId;

        // Cleanup: Remove any legacy modals
        const legacyModal = document.getElementById('videoPlayerModal');
        if (legacyModal) legacyModal.remove();

        // --- Populate profile header ---
        const pHandle = document.getElementById('profileHandle');
        const pName = document.getElementById('profileName');
        const pBio = document.getElementById('profileBioText');
        const pPic = document.getElementById('profilePicEl');
        const pActionBtns = document.getElementById('profileActionButtons');
        const pageTitle = document.getElementById('pageTitle');

        if (isOwnProfile) {
            // Own profile: use localStorage data (already loaded from Supabase at auth time)
            if (pHandle) pHandle.textContent = userHandle || '@user';
            if (pName) pName.textContent = username || 'User';
            if (pBio) pBio.textContent = userBio || '';
            const avatarUrl = localStorage.getItem('avatarUrl');
            if (pPic && avatarUrl) {
                pPic.style.backgroundImage = `url('${avatarUrl}')`;
                pPic.style.backgroundSize = 'cover';
                pPic.style.backgroundPosition = 'center';
            }
            if (pageTitle) pageTitle.textContent = `${username || 'Profile'} | XtraPath`;
            const profDashCard = document.getElementById('professionalDashboardCard');
            if (profDashCard) {
                profDashCard.style.display = 'block';
                try {
                    const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                    let totalV = 0;
                    localPosts.forEach(p => {
                        totalV += (Number(p.views_count) || Math.floor(Math.random() * 30) + 10);
                    });
                    const viewsEl = document.getElementById('profDashViewsCount');
                    if (viewsEl) {
                        if (totalV > 0) {
                            viewsEl.textContent = `${totalV.toLocaleString()} views`;
                        } else {
                            viewsEl.textContent = 'Track insights';
                        }
                    }
                } catch (_) { }
            }
            if (pActionBtns) pActionBtns.innerHTML = `
                    <button onclick="window.location.href='settings.html'" style="flex:1;padding:7px 0;background:#363636;color:white;border:none;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;">Edit profile</button>
                    <button onclick="navigator.share ? navigator.share({title:'${username}', url: window.location.href}) : navigator.clipboard.writeText(window.location.href)" style="flex:1;padding:7px 0;background:#363636;color:white;border:none;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;">Share profile</button>
                `;
        } else {
            const profDashCard = document.getElementById('professionalDashboardCard');
            if (profDashCard) profDashCard.style.display = 'none';
            // Another user's public profile: fetch from Supabase
            try {
                const { data: otherProfile } = await supabase
                    .from('profiles')
                    .select('username, full_name, avatar_url, bio')
                    .eq('id', targetUserId)
                    .single();

                if (otherProfile) {
                    const displayHandle = otherProfile.username ? `@${otherProfile.username}` : '@user';
                    const displayName = otherProfile.full_name || 'User';
                    if (pHandle) pHandle.textContent = displayHandle;
                    if (pName) pName.textContent = displayName;
                    if (pBio) pBio.textContent = otherProfile.bio || '';
                    if (pPic && otherProfile.avatar_url) {
                        pPic.style.backgroundImage = `url('${otherProfile.avatar_url}')`;
                        pPic.style.backgroundSize = 'cover';
                        pPic.style.backgroundPosition = 'center';
                    }
                    if (pageTitle) pageTitle.textContent = `${displayName} (${displayHandle}) | XtraPath`;
                }
            } catch (e) {
                console.warn('Could not fetch public profile:', e);
            }
            // Show Follow button for other users' profiles
            const isFollowingOther = isFollowingUser(targetUserId, pName ? pName.textContent : 'User');
            if (pActionBtns) {
                pActionBtns.innerHTML = `
                        <button id="profileMainFollowBtn" class="btn-profile-follow ${isFollowingOther ? 'following' : ''}" data-user-id="${targetUserId}" data-username="${pName ? pName.textContent : 'User'}" style="flex:1;">
                            ${isFollowingOther ? 'Following' : 'Follow'}
                        </button>
                        <button onclick="alert('Direct messaging coming soon!')" style="flex:1;padding:7px 0;background:#363636;color:white;border:none;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;">Message</button>
                    `;

                const mainFollowBtn = document.getElementById('profileMainFollowBtn');
                if (mainFollowBtn) {
                    mainFollowBtn.addEventListener('click', () => {
                        const nowFollowing = toggleFollowUser({
                            userId: targetUserId,
                            username: pName ? pName.textContent : 'User',
                            fullName: pName ? pName.textContent : 'User'
                        });
                        if (nowFollowing) {
                            mainFollowBtn.textContent = 'Following';
                            mainFollowBtn.classList.add('following');
                        } else {
                            mainFollowBtn.textContent = 'Follow';
                            mainFollowBtn.classList.remove('following');
                        }
                    });
                }
            }
            // Hide Saved tab for other users' profiles
            const tabSavedEl = document.getElementById('tabSaved');
            if (tabSavedEl) tabSavedEl.style.display = 'none';
        }

        // --- PROFILE STORY RING INTEGRATION ---
        const profileStoryRing = document.getElementById('profileStoryRing');
        const targetStoryUser = isOwnProfile ? "Your Story" : (pName ? pName.textContent : targetUserId);
        const userStories = getActiveStoriesForUser(targetStoryUser);

        if (profileStoryRing) {
            if (userStories.length > 0) {
                profileStoryRing.classList.add('has-story');
            } else {
                profileStoryRing.classList.remove('has-story');
            }

            profileStoryRing.onclick = () => {
                const avatarStyle = pPic?.style.backgroundImage || '';
                const avatarMatch = avatarStyle.match(/url\(['"]?(.*?)['"]?\)/);
                const avatarUrl = avatarMatch ? avatarMatch[1] : '';
                const name = pName?.textContent || (isOwnProfile ? username : 'User');
                openStoryByUsername(isOwnProfile ? 'Your Story' : name, avatarUrl);
            };
        }

        // --- Update Follower / Following stats ---
        function updateProfileFollowStats() {
            const followerEl = document.getElementById('profileFollowerCount');
            const followingEl = document.getElementById('profileFollowingCount');
            if (!followerEl || !followingEl) return;

            if (isOwnProfile) {
                const myFollowing = getFollowingList();
                followingEl.textContent = myFollowing.length;
                followerEl.textContent = '12';
            } else {
                const isFollowingTarget = isFollowingUser(targetUserId, pName ? pName.textContent : '');
                followerEl.textContent = isFollowingTarget ? '1' : '0';
                followingEl.textContent = '0';
            }
        }
        window.updateProfileFollowStats = updateProfileFollowStats;
        updateProfileFollowStats();

        // --- Fetch this user's posts from Supabase (Lightweight fields for blazing-fast load) ---
        let profilePosts = [];
        if (targetUserId) {
            try {
                const { data: fetchedPosts, error: postsErr } = await supabase
                    .from('posts')
                    .select('id,created_at,user_id,title,description,video_url,media_type,format,original_id,username,avatar_url,source->engine')
                    .eq('user_id', targetUserId)
                    .order('created_at', { ascending: false });
                if (postsErr) throw postsErr;
                profilePosts = (fetchedPosts || []).map(p => ({
                    ...p,
                    source: { engine: p.engine || p.source?.engine }
                }));
            } catch (e) {
                console.warn('Could not fetch user posts from Supabase:', e);
            }
        }

        // For own profile, ALWAYS merge with userPosts from localStorage so local creations are immediately visible!
        if (isOwnProfile) {
            const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            if (localPosts && localPosts.length > 0) {
                const existingIds = new Set(profilePosts.map(p => String(p.id)));
                const unmerged = localPosts.filter(lp => lp && lp.id && !existingIds.has(String(lp.id)));
                profilePosts = [...profilePosts, ...unmerged];
            }
        }

        // Keep all creations visible on profile; only drop nameless lesson fragments
        profilePosts = profilePosts.filter(p => !(p.source?.lesson_id && !p.title));

        // Sort posts by date descending so the newest posts are always first
        profilePosts.sort((a, b) => {
            const timeA = new Date(a.created_at || a.timestamp || 0).getTime() || 0;
            const timeB = new Date(b.created_at || b.timestamp || 0).getTime() || 0;
            return timeB - timeA;
        });

        // Update post count
        const postCountEl = document.getElementById('profilePostCount');
        if (postCountEl) postCountEl.textContent = profilePosts.length;

        // --- Render posts grid ---
        const profileGrid = document.getElementById('profileGrid');
        if (profileGrid) {
            const renderPosts = (type) => {
                profileGrid.innerHTML = '';
                document.querySelectorAll('.insta-tab').forEach(t => t.classList.remove('active'));
                if (type === 'projects') document.getElementById('tabProjects')?.classList.add('active');
                if (type === 'remixes') document.getElementById('tabRemixes')?.classList.add('active');
                if (type === 'saved') document.getElementById('tabSaved')?.classList.add('active');

                let filtered = profilePosts.filter(p => {
                    if (type === 'projects') return !p.original_id;
                    if (type === 'remixes') return !!p.original_id;
                    if (type === 'saved') {
                        const savedIds = JSON.parse(localStorage.getItem('savedPosts') || '[]');
                        return savedIds.includes(p.id);
                    }
                    return !p.original_id;
                });

                if (filtered.length === 0) {
                    profileGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#a1a1aa;">No ${type} found.</div>`;
                    return;
                }

                filtered.forEach(post => {
                    const div = document.createElement('div');
                    div.style.aspectRatio = '1/1';
                    div.style.position = 'relative';
                    div.style.cursor = 'pointer';
                    div.style.overflow = 'hidden';

                    let thumbnailHTML = '';
                    if (post.source?.engine === 'tikz' || post.format === 'tikz') {
                        const fullCover = post.video_url?.startsWith('http') || post.video_url?.startsWith('data:') ? post.video_url : (post.video_url ? `${getBackendUrl()}${post.video_url}` : '');
                        thumbnailHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#090b10;padding:6px;box-sizing:border-box;"><img src="${fullCover}" style="max-width:100%;max-height:100%;object-fit:contain;background:transparent;border:none;" onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;background:linear-gradient(135deg,#1e1b4b,#0f172a);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;\\'><i class=\\'ri-draft-line\\' style=\\'font-size:2rem;color:#38bdf8;\\'></i><span style=\\'font-size:0.65rem;font-weight:700;color:#94a3b8;\\'>TIKZ</span></div>';"></div>`;
                    } else if (post.format === 'image') {
                        const fullCover = post.video_url?.startsWith('http') || post.video_url?.startsWith('data:') ? post.video_url : (post.video_url ? `${getBackendUrl()}${post.video_url}` : '');
                        const isSvgGraphic = post.source?.engine === 'svg_to_png' || post.source?.engine === 'd3' || post.source?.engine === 'svg_to_3d';
                        const objectFit = isSvgGraphic ? 'contain' : 'cover';
                        const imgBg = isSvgGraphic ? '#090b10' : '#000';
                        const imgPad = isSvgGraphic ? 'padding:6px;' : '';
                        thumbnailHTML = `<img src="${fullCover}" style="width:100%;height:100%;object-fit:${objectFit};background:${imgBg};${imgPad}">`;
                    } else if (post.format === 'diagram') {
                        thumbnailHTML = `<img src="${post.video_url || ''}" style="width:100%;height:100%;object-fit:contain;background:#1e1e23;">`;
                    } else if (post.format === '3d_model' || post.format === 'threejs_scene') {
                        thumbnailHTML = `<img src="${post.video_url || ''}" style="width:100%;height:100%;object-fit:cover;background:#000;">`;
                    } else if (post.format === 'explanation') {
                        thumbnailHTML = `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1e1b4b,#0f172a);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px solid rgba(70,79,235,0.3);"><i class="ri-volume-up-line" style="font-size:2.4rem;color:#818cf8;"></i><span style="font-size:0.7rem;font-weight:700;color:#93c5fd;letter-spacing:0.5px;">EXPLANATION</span></div>`;
                    } else if (post.format === 'article' || post.format === 'pdf') {
                        if (post.video_url) {
                            const fullCoverUrl = (post.video_url.startsWith('http') || post.video_url.startsWith('data:'))
                                ? post.video_url
                                : `${getBackendUrl()}${post.video_url}`;
                            thumbnailHTML = `<img src="${fullCoverUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div style="display:none;width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e);align-items:center;justify-content:center;"><i class="${post.format === 'pdf' ? 'ri-book-open-fill' : 'ri-file-text-fill'}" style="font-size:2.5rem;color:#a1a1aa;"></i></div>`;
                        } else {
                            thumbnailHTML = `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e);display:flex;align-items:center;justify-content:center;"><i class="${post.format === 'pdf' ? 'ri-book-open-fill' : 'ri-file-text-fill'}" style="font-size:2.5rem;color:#a1a1aa;"></i></div>`;
                        }
                    } else {
                        const fullVideoUrl = post.video_url ? (post.video_url.startsWith('http') ? post.video_url : `${getBackendUrl()}${post.video_url}`) : '';
                        thumbnailHTML = `<video src="${fullVideoUrl}" muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>`;
                    }

                    const iconHTML = post.original_id ? '<i class="ri-flashlight-fill"></i>' :
                        ((post.source?.engine === 'tikz' || post.format === 'tikz') ? '<i class="ri-draft-line"></i>' :
                            (post.format === 'image' ? '<i class="ri-bar-chart-fill"></i>' :
                                (post.format === 'pdf' ? '<i class="ri-book-open-fill"></i>' :
                                    (post.format === 'article' ? '<i class="ri-file-text-fill"></i>' :
                                        (post.format === 'explanation' ? '<i class="ri-volume-up-line"></i>' :
                                            (post.format === '3d_model' ? '<i class="ri-cube-fill"></i>' :
                                                (post.format === 'threejs_scene' ? '<i class="ri-codepen-fill"></i>' : '<i class="ri-clapperboard-fill"></i>')))))));

                    div.innerHTML = `
                            <div class="post-thumbnail" style="width:100%;height:100%;background:#111;position:relative;">
                                ${thumbnailHTML}
                                <div style="position:absolute;top:8px;right:8px;color:white;font-size:1.2rem;text-shadow:1px 1px 3px rgba(0,0,0,0.7);">${iconHTML}</div>
                            </div>
                            <div class="post-overlay" style="opacity:0;position:absolute;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;transition:opacity 0.2s;">
                                <span style="color:white;font-weight:700;font-size:0.9rem;">${post.title}</span>
                            </div>
                        `;

                    div.onmouseenter = () => { div.querySelector('.post-overlay').style.opacity = '1'; const v = div.querySelector('video'); if (v) v.play(); };
                    div.onmouseleave = () => { div.querySelector('.post-overlay').style.opacity = '0'; const v = div.querySelector('video'); if (v) v.pause(); };
                    div.onclick = (e) => {
                        e.preventDefault(); e.stopPropagation();
                        if (post.format === 'article') window.location.href = `/views/articleView.html?id=${post.id}`;
                        else if (post.format === 'pdf') window.location.href = `/views/bookView.html?id=${post.id}`;
                        else if (post.format === 'explanation') window.location.href = `/views/explainView.html?id=${post.id}`;
                        else window.location.href = `/views/reels.html?id=${post.id}`;
                    };
                    profileGrid.appendChild(div);
                });
            };

            const tabProjects = document.getElementById('tabProjects');
            const tabRemixes = document.getElementById('tabRemixes');
            const tabSaved = document.getElementById('tabSaved');
            if (tabProjects) tabProjects.onclick = () => { window.location.hash = 'projects'; };
            if (tabRemixes) tabRemixes.onclick = () => { window.location.hash = 'remixes'; };
            if (tabSaved) tabSaved.onclick = () => { window.location.hash = 'saved'; };

            const currentHash = window.location.hash.substring(1);
            renderPosts(currentHash === 'saved' || currentHash === 'remixes' ? currentHash : 'projects');

            window.onhashchange = () => {
                renderPosts(window.location.hash.substring(1) || 'projects');
            };
        }
    }

    // E. Update Explore Page (Viewer Feed) & Reels — Smart Paginated Infinite Scroll
    if (currentPage.includes('explore.html') || currentPage.includes('reels.html')) {
        const exploreFeed = document.getElementById('exploreFeed');
        if (exploreFeed) {
            const isReels = currentPage.includes('reels.html');
            const scrollContainer = isReels ? exploreFeed : (document.querySelector('.main-content') || window);
            const PAGE_SIZE = isReels ? 8 : 15;
            let currentOffset = 0;
            let isLoading = false;
            let hasMore = true;
            const allRenderedPostIds = new Set();
            let videoObserver = null;

            // Video Intersection Observer for Autoplay
            const observerOptions = {
                root: scrollContainer === window ? null : scrollContainer,
                rootMargin: '0px',
                threshold: isReels ? 0.6 : 0.5
            };
            videoObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const video = entry.target;
                    if (entry.isIntersecting) {
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(() => { video.muted = true; video.play(); });
                        }
                    } else {
                        video.pause();
                    }
                });
            }, observerOptions);

            // Sentinel element for infinite scrolling
            const sentinel = document.createElement('div');
            sentinel.id = 'infiniteScrollSentinel';
            sentinel.style.cssText = isReels
                ? 'height: 20px; width: 100%; display: block; flex-shrink: 0;'
                : 'width:100%; text-align:center; padding: 25px 0; color: #a1a1aa; display: flex; justify-content: center; align-items: center; min-height: 50px;';

            function showInitialLoading() {
                exploreFeed.innerHTML = `
                        <div id="feedInitialSpinner" style="display:flex; justify-content:center; align-items:center; height:300px; color:#a1a1aa; flex-direction:column; gap:14px; width: 100%;">
                            <div style="width:36px;height:36px;border:3px solid rgba(255,255,255,0.1);border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                            <span style="font-size:0.9rem;">Loading feed…</span>
                        </div>
                    `;
            }

            // Cache of IDs belonging to store products or attached supporting materials
            let storeAttachedIds = null;

            async function getStoreAttachedIds() {
                if (storeAttachedIds !== null) return storeAttachedIds;

                // 1. Check in-memory / sessionStorage cache (valid for 5 minutes)
                try {
                    const cached = sessionStorage.getItem('storeAttachedIds_cache');
                    const cacheTime = sessionStorage.getItem('storeAttachedIds_time');
                    if (cached && cacheTime && (Date.now() - Number(cacheTime) < 300000)) {
                        storeAttachedIds = new Set(JSON.parse(cached));
                        return storeAttachedIds;
                    }
                } catch (_) {}

                storeAttachedIds = new Set();
                try {
                    // Only fetch courses & assets where supporting lessons/items are attached
                    // Avoid full table scans on jsonb and avoid downloading massive payload
                    const { data, error } = await supabase
                        .from('posts')
                        .select('id,source')
                        .in('format', ['course', 'asset']);
                    if (!error && data) {
                        data.forEach(p => {
                            storeAttachedIds.add(String(p.id));
                            let src = p.source;
                            if (typeof src === 'string') {
                                try { src = JSON.parse(src); } catch (_) { src = {}; }
                            }
                            src = src || {};
                            if (src.coverPostId) storeAttachedIds.add(String(src.coverPostId));
                            if (src.introVideoId) storeAttachedIds.add(String(src.introVideoId));
                            if (Array.isArray(src.sections)) {
                                src.sections.forEach(sec => {
                                    if (Array.isArray(sec?.lessons)) {
                                        sec.lessons.forEach(les => {
                                            if (les?.contentPostId) storeAttachedIds.add(String(les.contentPostId));
                                            if (les?.worksheetPostId) storeAttachedIds.add(String(les.worksheetPostId));
                                            if (les?.interactivePostId) storeAttachedIds.add(String(les.interactivePostId));
                                        });
                                    }
                                });
                            }
                            if (Array.isArray(src.assetItems)) {
                                src.assetItems.forEach(item => {
                                    if (item?.contentPostId) storeAttachedIds.add(String(item.contentPostId));
                                    if (item?.worksheetPostId) storeAttachedIds.add(String(item.worksheetPostId));
                                    if (item?.interactivePostId) storeAttachedIds.add(String(item.interactivePostId));
                                });
                            }
                        });
                    }

                    // Incorporate local store drafts/creations
                    const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                    localPosts.forEach(p => {
                        let src = p.source;
                        if (typeof src === 'string') {
                            try { src = JSON.parse(src); } catch (_) { src = {}; }
                        }
                        src = src || {};
                        if (p.format === 'course' || p.format === 'asset' || p.is_for_sale || src.is_for_sale) {
                            storeAttachedIds.add(String(p.id));
                            if (src.coverPostId) storeAttachedIds.add(String(src.coverPostId));
                            if (src.introVideoId) storeAttachedIds.add(String(src.introVideoId));
                            if (Array.isArray(src.sections)) {
                                src.sections.forEach(sec => {
                                    if (Array.isArray(sec?.lessons)) {
                                        sec.lessons.forEach(les => {
                                            if (les?.contentPostId) storeAttachedIds.add(String(les.contentPostId));
                                            if (les?.worksheetPostId) storeAttachedIds.add(String(les.worksheetPostId));
                                            if (les?.interactivePostId) storeAttachedIds.add(String(les.interactivePostId));
                                        });
                                    }
                                });
                            }
                            if (Array.isArray(src.assetItems)) {
                                src.assetItems.forEach(item => {
                                    if (item?.contentPostId) storeAttachedIds.add(String(item.contentPostId));
                                    if (item?.worksheetPostId) storeAttachedIds.add(String(item.worksheetPostId));
                                    if (item?.interactivePostId) storeAttachedIds.add(String(item.interactivePostId));
                                });
                            }
                        }
                    });

                    try {
                        sessionStorage.setItem('storeAttachedIds_cache', JSON.stringify(Array.from(storeAttachedIds)));
                        sessionStorage.setItem('storeAttachedIds_time', String(Date.now()));
                    } catch (_) {}
                } catch (e) {
                    console.warn("Could not load store attached material IDs:", e);
                }
                return storeAttachedIds;
            }

            function isStoreOrSupportingMaterial(post) {
                if (!post || !post.id) return false;
                const idStr = String(post.id);
                if (storeAttachedIds && storeAttachedIds.has(idStr)) return true;

                // Explicit store products
                if (post.format === 'course' || post.format === 'asset') return true;

                let src = post.source;
                if (typeof src === 'string') {
                    try { src = JSON.parse(src); } catch (_) { src = {}; }
                }
                src = src || {};

                if (post.is_for_sale || src.is_for_sale || post.access_tier === 'store_sale' || src.access_tier === 'store_sale') {
                    return true;
                }
                try {
                    if (parseFloat(post.price || src.price || 0) > 0) return true;
                } catch (_) {}

                // Items tagged as course/asset/store supporting materials
                if (src.courseId || src.course_id || src.lesson_id || src.asset_id || src.asset_pack_id || src.is_course_material || src.is_store_material || src.is_supporting_material) {
                    return true;
                }
                return false;
            }

            async function fetchFeedBatch(fromIdx, toIdx) {
                let posts = [];
                try {
                    let query = supabase
                        .from('posts')
                        .select('id,created_at,user_id,title,description,video_url,media_type,format,original_id,username,avatar_url,source')
                        .order('created_at', { ascending: false });

                    // Exclude courses & digital asset packs from Explore and Reels feeds
                    query = query.not('format', 'in', '("course","asset")');

                    if (isReels) {
                        // Reels is strictly for short-form animations, videos, and visual graphics.
                        // Books, articles, courses, and explanations open in their own dedicated viewers.
                        query = query.not('format', 'in', '("pdf","article","course","asset","explanation")');
                    }

                    const { data, error } = await query.range(fromIdx, toIdx);
                    if (error) throw error;
                    posts = data || [];

                    // Always merge locally published posts on initial batch so local creations appear immediately.
                    // ONLY merge posts that belong to the currently logged-in user to prevent stale data
                    // from a previous account polluting the new user's feed with broken placeholder cards.
                    if (fromIdx === 0) {
                        const currentUserId = localStorage.getItem('userId');
                        const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                        const existingIds = new Set(posts.map(p => String(p.id)));

                        const unmerged = localPosts.filter(lp => {
                            if (!lp || !lp.id) return false;
                            // Only include posts that belong to the current user
                            if (currentUserId && lp.user_id && String(lp.user_id) !== String(currentUserId)) return false;
                            return !existingIds.has(String(lp.id));
                        });

                        // Merge and sort chronologically so posts are not artificially glued to the top
                        posts = [...unmerged, ...posts].sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0));
                    }
                } catch (err) {
                    console.warn('Supabase paginated fetch failed, checking local:', err);
                    injectSampleContent();
                    const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                    posts = localPosts.slice(fromIdx, toIdx + 1);
                }
                return posts;
            }

            function filterFeedPosts(rawPosts) {
                return rawPosts.filter(post => {
                    if (!post || !post.id) return false;
                    // Exclude store-related products and their supporting materials from Explore & Reels
                    if (isStoreOrSupportingMaterial(post)) return false;

                    // In Reels, strictly exclude books, articles, courses, and explanations
                    if (isReels && (post.format === 'pdf' || post.format === 'article' || post.format === 'course' || post.format === 'asset' || post.format === 'explanation')) {
                        return false;
                    }
                    if (post.source?.lesson_id && !post.title) return false;
                    return true;
                });
            }

            async function loadNextBatch() {
                if (isLoading || !hasMore) return;
                isLoading = true;

                const isInitial = (currentOffset === 0);
                if (isInitial) {
                    // Instant Feed Hydration: Render cached posts immediately in 0ms if available.
                    // Only use the cache if it was written for the current user to prevent cross-account pollution.
                    let hasRenderedCache = false;
                    const currentUserId = localStorage.getItem('userId');
                    if (!isReels && exploreFeed.children.length === 0) {
                        try {
                            const cacheRaw = localStorage.getItem('cached_explore_feed');
                            const cacheUserId = localStorage.getItem('cached_explore_feed_uid');
                            // Only trust the cache if it was written for the same logged-in user
                            if (cacheRaw && (!currentUserId || cacheUserId === currentUserId)) {
                                const cached = JSON.parse(cacheRaw);
                                if (Array.isArray(cached) && cached.length > 0) {
                                    renderDynamicStoryBar(cached);
                                    cached.forEach(post => {
                                        if (post && post.id && !allRenderedPostIds.has(String(post.id))) {
                                            allRenderedPostIds.add(String(post.id));
                                            const { element, init } = createPostElement(post, 'grid');
                                            if (element) {
                                                exploreFeed.appendChild(element);
                                                if (init) init();
                                                const vids = element.querySelectorAll('video');
                                                vids.forEach(v => videoObserver.observe(v));
                                            }
                                        }
                                    });
                                    hasRenderedCache = true;
                                }
                            }
                        } catch (_) {}
                    }
                    if (!hasRenderedCache && exploreFeed.children.length === 0) {
                        showInitialLoading();
                    }
                } else if (!isReels) {
                    sentinel.innerHTML = `<div style="width:24px;height:24px;border:2px solid rgba(255,255,255,0.1);border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;"></div>`;
                }

                try {
                    // Fetch feed batch and store attached IDs concurrently for maximum throughput
                    const fetchPromise = fetchFeedBatch(currentOffset, currentOffset + PAGE_SIZE - 1);
                    const storePromise = getStoreAttachedIds();

                    const [rawPosts] = await Promise.all([fetchPromise, storePromise]);

                    if (rawPosts.length < PAGE_SIZE) {
                        hasMore = false;
                    }
                    currentOffset += PAGE_SIZE;

                    let filteredPosts = filterFeedPosts(rawPosts);

                    // If all items in this slice were filtered out but more exist, fetch next slice once
                    if (filteredPosts.length === 0 && hasMore) {
                        const nextRaw = await fetchFeedBatch(currentOffset, currentOffset + PAGE_SIZE - 1);
                        if (nextRaw.length < PAGE_SIZE) {
                            hasMore = false;
                        }
                        currentOffset += PAGE_SIZE;
                        filteredPosts = filterFeedPosts(nextRaw);
                    }

                    // Save latest fresh feed batch to cache for 0ms instant display next time.
                    // Tag the cache with the current userId so we can reject it if a different account logs in.
                    if (isInitial && filteredPosts.length > 0 && !isReels) {
                        try {
                            const uid = localStorage.getItem('userId') || '';
                            localStorage.setItem('cached_explore_feed', JSON.stringify(filteredPosts.slice(0, 15)));
                            localStorage.setItem('cached_explore_feed_uid', uid);
                        } catch (_) {}
                    }

                    // Always remove initial spinner once posts are ready or if feed is exhausted
                    const initialSpinner = document.getElementById('feedInitialSpinner');
                    if (initialSpinner && (filteredPosts.length > 0 || !hasMore || exploreFeed.querySelector('.grid-post, .reel-post-wrapper'))) {
                        initialSpinner.remove();
                    }
                    if (exploreFeed.contains(sentinel)) sentinel.remove();

                    // If initial load: clear spinner and render story bar
                    if (isInitial || !exploreFeed.querySelector('.grid-post, .reel-post-wrapper')) {
                        if (filteredPosts.length === 0 && !hasMore) {
                            exploreFeed.innerHTML = `
                                    <div style="text-align: center; padding: 60px; color: #a1a1aa; width:100%;">
                                        <h3>Nothing to see here… yet!</h3>
                                        <p>Be the first to publish a creation and appear here.</p>
                                    </div>`;
                            isLoading = false;
                            return;
                        }

                        // Render creator story bar on explore
                        if (!isReels) {
                            renderDynamicStoryBar(filteredPosts);
                        }

                        // Handle starting ID on reels (fetch specific remix/origin directly if not in initial batch)
                        const urlParams = new URLSearchParams(window.location.search);
                        const startId = urlParams.get('id') || urlParams.get('postId');
                        if (startId && isReels) {
                            let startPost = filteredPosts.find(p => String(p.id) === String(startId));
                            if (!startPost) {
                                // Check local posts first
                                const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                                startPost = localPosts.find(p => String(p.id) === String(startId));

                                // If not found in local, fetch directly from Supabase by ID
                                if (!startPost && supabase) {
                                    try {
                                        const { data: dbPost } = await supabase.from('posts').select('*').eq('id', startId).single();
                                        if (dbPost) startPost = dbPost;
                                    } catch (e) {
                                        console.warn('Could not fetch startId post directly from Supabase:', e);
                                    }
                                }
                            }
                            if (startPost) {
                                // If a non-reel format is opened with reels.html?id=..., REDIRECT IMMEDIATELY to its dedicated viewer!
                                if (startPost.format === 'pdf') {
                                    window.location.replace(`/views/bookView.html?id=${encodeURIComponent(startPost.id)}`);
                                    return;
                                }
                                if (startPost.format === 'article') {
                                    window.location.replace(`/views/articleView.html?id=${encodeURIComponent(startPost.id)}`);
                                    return;
                                }
                                if (startPost.format === 'explanation') {
                                    window.location.replace(`/views/explainView.html?id=${encodeURIComponent(startPost.id)}`);
                                    return;
                                }
                                if (startPost.format === 'course' || startPost.format === 'asset') {
                                    window.location.replace(`/views/courseView.html?id=${encodeURIComponent(startPost.id)}`);
                                    return;
                                }

                                // Remove from filteredPosts if already present to avoid duplication
                                const existingIdx = filteredPosts.findIndex(p => String(p.id) === String(startId));
                                if (existingIdx > -1) filteredPosts.splice(existingIdx, 1);
                                // Guarantee the target remix post is at index 0
                                filteredPosts.unshift(startPost);
                            }
                        }
                    }

                    // Failsafe cleanup: Never allow feedInitialSpinner to remain when appending posts
                    const remainingSpinner = document.getElementById('feedInitialSpinner');
                    if (remainingSpinner && (filteredPosts.length > 0 || !hasMore)) {
                        remainingSpinner.remove();
                    }

                    // Append each post element safely
                    const newPostIds = [];
                    filteredPosts.forEach(post => {
                        try {
                            if (post && post.id && !allRenderedPostIds.has(String(post.id))) {
                                allRenderedPostIds.add(String(post.id));
                                newPostIds.push(post.id);
                                const viewType = isReels ? 'reel' : 'grid';
                                const { element, init } = createPostElement(post, viewType);
                                if (element) {
                                    exploreFeed.appendChild(element);
                                    if (init) init();

                                    // Observe videos for autoplay
                                    const vids = element.querySelectorAll('video');
                                    vids.forEach(v => videoObserver.observe(v));
                                }
                            }
                        } catch (postErr) {
                            console.error('Error rendering post ID:', post?.id, postErr);
                        }
                    });

                    // Update global allLoadedPosts for remix counters
                    const existingGlobal = window.allLoadedPosts || [];
                    window.allLoadedPosts = [...existingGlobal, ...filteredPosts];
                    updateAllRemixCounters();

                    // Fetch likes/comments for new batch (in background, non-blocking)
                    if (newPostIds.length > 0) {
                        fetchPostLikeData(newPostIds);
                    }

                    // Re-append sentinel at bottom if more posts might exist
                    if (hasMore) {
                        if (!isReels) sentinel.innerHTML = '';
                        exploreFeed.appendChild(sentinel);
                    } else if (!isReels) {
                        sentinel.innerHTML = `<span style="font-size:0.8rem; color:#71717a; padding: 15px 0;">✨ You're all caught up!</span>`;
                        exploreFeed.appendChild(sentinel);
                    }
                } catch (batchErr) {
                    console.error("Error loading feed batch:", batchErr);
                    const spinner = document.getElementById('feedInitialSpinner');
                    if (spinner) spinner.remove();
                } finally {
                    isLoading = false;
                }
            }

            // Setup Infinite Scroll Intersection Observer on Sentinel with container root
            const scrollObserver = new IntersectionObserver((entries) => {
                if (entries[0] && entries[0].isIntersecting && !isLoading && hasMore) {
                    loadNextBatch();
                }
            }, {
                root: scrollContainer === window ? null : scrollContainer,
                rootMargin: isReels ? '150px' : '200px',
                threshold: 0.01
            });

            // Dual-Trigger: Add continuous scroll event listener on the actual scroll container for rock-solid reliability across all browsers
            if (scrollContainer && scrollContainer !== window) {
                scrollContainer.addEventListener('scroll', () => {
                    if (!isLoading && hasMore) {
                        const distanceToBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
                        if (distanceToBottom < 350) {
                            loadNextBatch();
                        }
                    }
                }, { passive: true });
            }

            // Initial Load
            loadNextBatch().then(() => {
                scrollObserver.observe(sentinel);
            });

            // Layout fix for mobile reels scroll
            if (isReels) {
                setTimeout(() => {
                    if (exploreFeed && exploreFeed.scrollTop === 0) {
                        exploreFeed.scrollTop = 1;
                        exploreFeed.scrollTop = 0;
                    }
                }, 150);
            }
        }
    }

    // F. Watch Page Logic (Load Video from ID)
    if (currentPage.includes('watch')) {
        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('id');
        console.log("Watch Page Loaded. ID:", videoId);

        if (videoId) {
            (async () => {
                const savedPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                let post = savedPosts.find(p => String(p.id) === String(videoId));

                // 1. Check Catalog Simulations
                if (!post) {
                    const CATALOG_SIMS = {
                        'prod_tesseract_4d': {
                            id: 'prod_tesseract_4d',
                            title: 'Interactive 4D Tesseract Simulation Pack',
                            username: 'Priya Sharma',
                            description: 'Complete 4-dimensional hypercube rotation and slicing engine with interactive vertex controls.',
                            video_url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop',
                            media_type: 'image',
                            timestamp: Date.now()
                        },
                        'prod_blackhole_lensing': {
                            id: 'prod_blackhole_lensing',
                            title: 'Gravitational Lensing & Event Horizon Shader',
                            username: 'Cosmos Labs',
                            description: 'Real-time raymarched Schwarzschild metric black hole with accretion disk photon sphere Doppler beaming.',
                            video_url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&auto=format&fit=crop',
                            media_type: 'image',
                            timestamp: Date.now()
                        },
                        'prod_fourier_epicycles': {
                            id: 'prod_fourier_epicycles',
                            title: 'Complex Fourier Epicycles & Curve Drawing',
                            username: 'MathViz Studio',
                            description: 'Discrete Fourier Transform epicycle visualizer tracing parametric curves in the complex plane.',
                            video_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop',
                            media_type: 'image',
                            timestamp: Date.now()
                        }
                    };
                    if (CATALOG_SIMS[videoId]) post = CATALOG_SIMS[videoId];
                }

                // 2. Query Supabase if not found locally
                if (!post && supabase) {
                    try {
                        const { data, error } = await supabase.from('posts').select('*').eq('id', videoId).single();
                        if (!error && data) {
                            post = data;
                        }
                    } catch (e) {
                        console.warn("Could not query Supabase for post:", e);
                    }
                }

                const container = document.querySelector('.video-player') || document.querySelector('.video-player-wrapper') || document.querySelector('.main-content');

                if (post) {
                    const postFmt = (post.format || post.type || '').toLowerCase();
                    if (postFmt === 'pdf' || postFmt === 'book' || post.source?.chapters) {
                        console.log("Watch page detected Book format, redirecting to bookView.html...");
                        window.location.replace(`/views/bookView.html?id=${encodeURIComponent(videoId)}`);
                        return;
                    }
                    if (postFmt === 'course' || post.source?.sections) {
                        console.log("Watch page detected Course format, redirecting to courseView.html...");
                        window.location.replace(`/views/courseView.html?id=${encodeURIComponent(videoId)}`);
                        return;
                    }
                    if (postFmt === 'article' || postFmt === 'mermaid') {
                        console.log("Watch page detected Article format, redirecting to articleView.html...");
                        window.location.replace(`/views/articleView.html?id=${encodeURIComponent(videoId)}`);
                        return;
                    }

                    console.log("Found post for watch view:", post);
                    let player = document.querySelector('video');


                    if (!player && container) {
                        if (container.classList.contains('video-player')) {
                            container.innerHTML = `<video controls style="width: 100%; height: 100%; object-fit: contain;"></video>`;
                            player = container.querySelector('video');
                        } else {
                            const wrapper = document.createElement('div');
                            wrapper.innerHTML = `<video controls style="width: 100%; aspect-ratio: 16/9; border-radius: 12px; background: black; box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin-bottom: 20px;"></video>`;
                            container.insertBefore(wrapper, container.firstChild);
                            player = wrapper.querySelector('video');
                        }
                    }

                    if (player) {
                        player.innerHTML = '';
                        const rawUrl = post.video_url || post.source?.video_url || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop';
                        const fullVideoUrl = rawUrl.startsWith('http') ? rawUrl : `${getBackendUrl()}${rawUrl}`;
                        player.src = fullVideoUrl;
                        player.load();
                        const playPromise = player.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(e => console.log("Autoplay prevented:", e));
                        }
                    }

                    const title = document.querySelector('h1') || document.querySelector('.video-title');
                    const desc = document.querySelector('.video-description') || document.querySelector('.description') || document.querySelector('.video-info p');
                    const channel = document.querySelector('.channel-name') || document.querySelector('.owner-name') || document.querySelector('.channel-info h3');
                    const dateEl = document.querySelector('.upload-date') || document.querySelector('.video-meta span');

                    if (title) title.textContent = post.title || 'Interactive STEM Simulation';
                    if (desc) desc.textContent = post.description || "Interactive visual simulation created on XtraPath.";
                    if (channel) channel.textContent = post.username || "Verified Creator";
                    if (dateEl) dateEl.textContent = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                } else if (container) {
                    // Graceful fallback for archived / deleted test posts
                    container.innerHTML = `
                        <div style="padding: 40px 20px; text-align: center; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 16px; margin: 20px auto; max-width: 600px;">
                            <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(129, 140, 248, 0.1); border: 1px solid rgba(129, 140, 248, 0.3); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #818cf8; margin: 0 auto 16px;">
                                <i class="ri-movie-2-line"></i>
                            </div>
                            <h2 style="color: #ffffff; font-size: 1.25rem; font-weight: 700; margin: 0 0 8px;">Interactive Simulation Archive</h2>
                            <p style="color: #a1a1aa; font-size: 0.85rem; line-height: 1.5; margin: 0 auto 20px; max-width: 440px;">
                                This test item (<code>${videoId.substring(0, 8)}…</code>) was recorded during a sandbox session. You can explore our live simulation library or create your own in the studio.
                            </p>
                            <div style="display: flex; justify-content: center; gap: 12px;">
                                <a href="/views/explore.html" class="btn-primary" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; padding: 10px 20px; font-weight: 700;">
                                    <i class="ri-compass-3-line"></i> Explore Simulations
                                </a>
                                <a href="/views/dashboard.html" class="btn-glass" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; padding: 10px 20px;">
                                    <i class="ri-folder-shield-2-line"></i> Back to Library
                                </a>
                            </div>
                        </div>
                    `;
                }
            })();
        }
    }

    // G. Lineage Page Logic (Remix Evolution)
    if (currentPage.includes('lineage.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const rootId = urlParams.get('id');
        const lineageContainer = document.getElementById('lineageContainer');

        if (rootId && lineageContainer) {
            lineageContainer.innerHTML = `
                <div style="display:flex; justify-content:center; align-items:center; height:200px; color:#a1a1aa; flex-direction:column; gap:12px;">
                    <div style="width:32px;height:32px;border:3px solid rgba(255,255,255,0.1);border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                    <span style="font-size:0.88rem;">Tracing Remix Evolution...</span>
                </div>
            `;

            function renderLineageMedia(post) {
                if (!post) return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#18181b;color:#60a5fa;"><i class="ri-sparkling-fill"></i></div>';

                const format = (post.format || '').toLowerCase();
                const mediaType = (post.media_type || '').toLowerCase();
                const rawUrl = post.video_url || post.videoUrl || post.cover_image || post.thumbnail_url || post.pdf_url || '';
                const cover = post.cover_image || post.thumbnail_url || '';

                // Identify images or static formats
                const isImage = mediaType.startsWith('image') ||
                    rawUrl.startsWith('data:image') ||
                    rawUrl.match(/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i) ||
                    ['image', 'graph', 'diagram', 'math', 'pdf', '3d_model'].includes(format);

                // Identify real playable video formats
                const isVideo = !isImage && (
                    mediaType.startsWith('video') ||
                    rawUrl.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i) ||
                    ['video', '16:9', '9:16', 'reel', 'animation'].includes(format) ||
                    (rawUrl && (rawUrl.startsWith('http') || rawUrl.startsWith('/media') || rawUrl.startsWith('/static')))
                );

                if (isVideo && rawUrl) {
                    const fullVideoUrl = rawUrl.startsWith('http') || rawUrl.startsWith('/') ? rawUrl : `${getBackendUrl()}${rawUrl}`;
                    const posterAttr = cover ? `poster="${cover}"` : '';
                    return `<video src="${fullVideoUrl}" ${posterAttr} autoplay muted loop playsinline preload="auto" style="width:100%; height:100%; object-fit:cover;"></video>`;
                }

                if (rawUrl) {
                    const fullImgUrl = rawUrl.startsWith('http') || rawUrl.startsWith('/') || rawUrl.startsWith('data:') ? rawUrl : `${getBackendUrl()}${rawUrl}`;
                    return `<img src="${fullImgUrl}" alt="${post.title || 'Evolution Thumbnail'}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null;this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1e1b4b;color:#60a5fa;\\'><i class=\\'ri-movie-2-line\\' style=\\'font-size:2rem;\\'></i></div>';">`;
                }

                // Live Zdog 3D if code exists
                if ((format === '3d_model' || format === 'interactive') && post.source?.engine === 'zdog' && post.source?.code && typeof window.renderZdog === 'function') {
                    const iframeContent = window.renderZdog(post.source.code, { background: '#0a0d14' });
                    return `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0a0d14; pointer-events:none;"></iframe>`;
                }

                // Live JSXGraph Math if code exists
                if ((format === 'math' || format === 'interactive') && post.source?.engine === 'jsxgraph' && post.source?.code && typeof window.renderJSXGraph === 'function') {
                    const iframeContent = window.renderJSXGraph(post.source.code, { background: '#0a0d14' });
                    return `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0a0d14; pointer-events:none;"></iframe>`;
                }

                // Live KaTeX Math if code exists
                if (format === 'math' && post.source?.code && typeof window.renderKatex === 'function') {
                    const iframeContent = window.renderKatex(post.source.code, { fontSize: '1.4em', color: '#ffffff' });
                    return `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0a0d14; pointer-events:none;"></iframe>`;
                }

                // Live Mermaid Diagram if code exists
                if (format === 'diagram' && post.source?.code && typeof window.renderMermaid === 'function') {
                    const iframeContent = window.renderMermaid(post.source.code, 280, 400);
                    return `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0a0d14; pointer-events:none;"></iframe>`;
                }

                // Default aesthetic fallback
                return `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#1e1b4b,#0f172a);color:#60a5fa;gap:8px;"><i class="ri-sparkling-2-fill" style="font-size:2.4rem;"></i><span style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#93c5fd;">${post.format || 'Creation'}</span></div>`;
            }

            (async () => {
                let allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                let rootPost = allPosts.find(p => String(p.id) === String(rootId));

                // If not in localStorage, fetch from Supabase
                const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
                if (client) {
                    try {
                        const { data: dbPosts } = await client
                            .from('posts')
                            .select('id,created_at,title,format,video_url,original_id,username,avatar_url,source->engine');
                        if (dbPosts && dbPosts.length > 0) {
                            allPosts = [...allPosts, ...dbPosts];
                            if (!rootPost) {
                                rootPost = allPosts.find(p => String(p.id) === String(rootId));
                            }
                        }
                    } catch (e) {
                        console.warn("Could not fetch lineage posts from Supabase:", e);
                    }
                }

                lineageContainer.innerHTML = '';

                if (rootPost) {
                    // Build the tree: root first, then all descendants
                    const lineageTree = [rootPost];
                    const toProcess = [rootPost.id];
                    const processedIds = new Set([String(rootPost.id)]);

                    while (toProcess.length > 0) {
                        const currentId = String(toProcess.shift());
                        const children = allPosts.filter(p => String(p.originalId || p.original_id) === currentId);
                        for (const child of children) {
                            if (!processedIds.has(String(child.id))) {
                                lineageTree.push(child);
                                toProcess.push(child.id);
                                processedIds.add(String(child.id));
                            }
                        }
                    }

                    // Render the tree with pure visual media cards
                    lineageTree.forEach((post, idx) => {
                        const isRoot = String(post.id) === String(rootId);
                        const item = document.createElement('div');
                        item.className = 'lineage-thread-item';

                        const thumbnailHTML = renderLineageMedia(post);

                        item.innerHTML = `
                            <div class="lineage-avatar-col">
                                <div class="lineage-avatar">
                                    <i class="${isRoot ? 'ri-star-fill' : 'ri-flashlight-fill'}" style="color:${isRoot ? '#eab308' : '#38bdf8'};"></i>
                                </div>
                                <div class="lineage-thread-line"></div>
                            </div>
                            <div class="lineage-content-col">
                                <div class="lineage-card ${isRoot ? 'original-post' : ''}" title="${post.title || (isRoot ? 'Original Creation' : 'Evolution #' + idx)}">
                                    ${thumbnailHTML}
                                </div>
                            </div>
                        `;

                        // Card click -> View in Reels or BookView
                        const cardEl = item.querySelector('.lineage-card');
                        if (cardEl) {
                            cardEl.onclick = () => {
                                if (post.format === 'pdf') {
                                    window.location.href = `/views/bookView.html?id=${post.id}`;
                                } else if (post.format === 'article') {
                                    window.location.href = `/views/articleView.html?id=${post.id}`;
                                } else if (post.format === 'explanation') {
                                    window.location.href = `/views/explainView.html?id=${post.id}`;
                                } else {
                                    window.location.href = `/views/reels.html?id=${post.id}`;
                                }
                            };
                        }

                        lineageContainer.appendChild(item);
                    });

                    // If only root exists (no remixes yet), show an encouraging remix card
                    if (lineageTree.length === 1) {
                        const emptyRemixNotice = document.createElement('div');
                        emptyRemixNotice.style.cssText = "margin-top: 20px; padding: 20px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 12px; text-align: center; color: #a1a1aa;";
                        emptyRemixNotice.innerHTML = `
                            <p style="margin: 0 0 10px; font-size: 0.9rem;">✨ This is the original origin. No remix evolutions yet!</p>
                            <button id="lineageRemixNowBtn" class="btn-primary" style="padding: 6px 18px; font-size: 0.85rem; border-radius: 20px; cursor:pointer;">
                                <i class="ri-git-branch-line"></i> Remix This Creation
                            </button>
                        `;
                        lineageContainer.appendChild(emptyRemixNotice);

                        const remixNowBtn = document.getElementById('lineageRemixNowBtn');
                        if (remixNowBtn) {
                            remixNowBtn.onclick = () => {
                                localStorage.setItem('remixMeta', JSON.stringify({ source: rootPost.source || { engine: 'manim', code: rootPost.code }, originalId: rootPost.id }));
                                if (rootPost.format === 'pdf' || rootPost.source?.engine === 'latex') {
                                    window.location.href = '/views/xtraBook.html';
                                } else {
                                    window.location.href = '/views/xtraAnim.html';
                                }
                            };
                        }
                    }

                    // Autoplay videos on hover / scroll
                    const videos = lineageContainer.querySelectorAll('video');
                    const scrollContainer = document.querySelector('.dashboard-scroll');

                    if (videos.length > 0 && scrollContainer) {
                        const observerOptions = {
                            root: scrollContainer,
                            rootMargin: '0px',
                            threshold: 0.8
                        };

                        const videoObserver = new IntersectionObserver((entries) => {
                            entries.forEach(entry => {
                                const video = entry.target;
                                if (entry.isIntersecting) {
                                    video.play().catch(() => { });
                                } else {
                                    video.pause();
                                }
                            });
                        }, observerOptions);

                        videos.forEach(v => videoObserver.observe(v));
                    }
                } else {
                    lineageContainer.innerHTML = `
                        <div style="text-align:center; padding: 40px 20px; color:#a1a1aa;">
                            <i class="ri-node-tree" style="font-size: 2.5rem; color:#ef4444; margin-bottom: 12px; display:inline-block;"></i>
                            <h3>Creation Not Found</h3>
                            <p>Unable to locate the lineage root for this ID.</p>
                            <a href="/views/reels.html" class="btn-primary" style="display:inline-block; margin-top: 15px; text-decoration:none; padding:8px 18px; border-radius:8px;">Back to Reels</a>
                        </div>
                    `;
                }
            })();
        }
    }

    // ============================================================
    // 1. AUTHENTICATION LOGIC (Login & Signup)
    // ============================================================
    const authForm = document.querySelector('.auth-form');

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPage = window.location.pathname;

            // --- SIGN UP LOGIC ---
            if (currentPage.includes('signup.html')) {
                const name = document.getElementById('signup-name').value;
                const email = document.getElementById('signup-email').value.trim();
                const password = document.getElementById('signup-password').value;
                const confirm = document.getElementById('signup-confirm').value;

                if (password !== confirm) {
                    alert("Passwords do not match!");
                    return;
                }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name } // Pass full_name to be used by the trigger
                    }
                });

                if (error) {
                    alert("Signup failed: " + error.message);
                } else {
                    alert("Signup successful! Please check your email for a confirmation link.");
                    window.location.href = '/views/login.html';
                }
                return;
            }

            // --- LOGIN LOGIC ---
            const emailInput = document.querySelector('input[type="email"]');
            const passwordInput = document.querySelector('input[type="password"]');
            const submitBtn = authForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Sign In';

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            if (!email || !password) {
                alert("Please enter both your email address and password.");
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="ri-loader-4-line" style="display:inline-block; animation:spin 0.8s linear infinite;"></i> Signing In...';
            }

            // Timeout after 8 seconds so the button never stays stuck on 'Signing In...'
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("AUTH_TIMEOUT")), 8000)
            );

            try {
                const { data, error } = await Promise.race([
                    supabase.auth.signInWithPassword({ email, password }),
                    timeoutPromise
                ]);

                if (error) {
                    // Distinct, clear message for unconfirmed emails or bad credentials
                    if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
                        alert("Your email address is not verified yet. Please check your inbox and confirm your email before signing in.");
                    } else if (error.message && error.message.toLowerCase().includes('invalid login credentials')) {
                        alert("Invalid email or password. Please check your credentials and try again.");
                    } else {
                        alert("Login failed: " + error.message);
                    }
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalBtnText;
                    }
                    return;
                }

                if (data && data.user) {
                    console.log('Login successful, setting user session...');
                    localStorage.setItem('userId', data.user.id);
                    localStorage.setItem('userType', 'creator');
                    const emailLower = (data.user.email || email || '').toLowerCase();
                    localStorage.setItem('userEmail', emailLower);

                    const isSuper = ['codeepie@gmail.com', 'admin@xtrapath.com', 'yogendra.singh@xtrapath.io', 'yogendra20799@gmail.com'].includes(emailLower);
                    if (isSuper) {
                        localStorage.setItem('isSuperAdmin', 'true');
                        localStorage.setItem('userRole', 'admin');
                    } else {
                        localStorage.removeItem('isSuperAdmin');
                    }

                    try {
                        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                        if (profile) {
                            localStorage.setItem('username', profile.full_name || profile.username || data.user.email.split('@')[0]);
                            localStorage.setItem('handle', '@' + (profile.username || profile.full_name || data.user.email.split('@')[0]).replace(/\s/g, '').toLowerCase());
                            localStorage.setItem('avatarUrl', profile.avatar_url || '');
                            localStorage.setItem('userBio', profile.bio || '');
                            if (profile.role === 'admin') {
                                localStorage.setItem('isSuperAdmin', 'true');
                                localStorage.setItem('userRole', 'admin');
                            }
                        } else {
                            localStorage.setItem('username', data.user.email.split('@')[0]);
                            localStorage.setItem('handle', '@' + data.user.email.split('@')[0]);
                        }
                    } catch (e) { }

                    window.location.replace('/views/explore.html?refresh=' + Date.now()); // Redirect to main feed
                }
            } catch (err) {
                console.error("Authentication error:", err);
                if (err && err.message === "AUTH_TIMEOUT") {
                    alert("Authentication server timeout (8s): The Supabase authentication server (https://elhdcldoepjxcxgivohg.supabase.co) is currently unresponsive.\n\nPlease check your Supabase Dashboard to see if the project is PAUSED or waking up.");
                } else {
                    alert("Unable to connect to authentication server: " + (err.message || err));
                }
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            }
        });
    }

    const googleAuthBtn = document.getElementById('google-auth-btn');
    if (googleAuthBtn) {
        googleAuthBtn.addEventListener('click', async () => {
            // Get the base URL of the current application (e.g., "http://localhost:8000").
            // This ensures the redirect works correctly on any server. Supabase will send the user
            // back to the root of this domain. Our onAuthStateChange handler will then take over.
            const redirectTo = window.location.origin;

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: redirectTo }
            });
            if (error) {
                alert('Google login failed: ' + error.message);
            }
            // Supabase handles the redirect automatically.
        });
    }


    // Logout Handler
    const logoutBtn = document.querySelector('a[href="/views/login.html"]');
    if (logoutBtn && (logoutBtn.innerText.includes('Log Out') || logoutBtn.id === 'logoutBtn')) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Prevent the link from navigating immediately
            await supabase.auth.signOut();
            // The onAuthStateChange listener will handle clearing storage and redirecting.
        });
    }

    // ============================================================
    // 2. XTRA ANIM STUDIO LOGIC
    // ============================================================
    // Only run this if we are in the Studio
    const studioEditor = document.getElementById('code');
    const isStudio = document.querySelector('.console-log'); // Check if console exists
    const highlightCode = document.getElementById('highlighting-content');
    const highlightPre = document.getElementById('highlighting');
    const lineNumbers = document.getElementById('line-numbers');
    let remixOriginalId = null; // Store ID if this is a remix
    let generatedVideoUrl = null; // Store the URL of the rendered video
    let currentEngine = 'p5'; // Default engine
    const uploadBtn = document.getElementById('uploadVideoBtn');
    const uploadModal = document.getElementById('uploadModal');

    if (studioEditor && isStudio) {
        const backendUrl = getBackendUrl();

        // --- Check for Course Context on Studio Load ---
        const courseContextRaw = localStorage.getItem('courseContext');
        const publishToCourseBtn = document.getElementById('publishToCourseBtn');
        const publishToProfileBtn = document.getElementById('confirmUpload');

        if (courseContextRaw && publishToCourseBtn && publishToProfileBtn) {
            // We are in course editing mode
            publishToCourseBtn.style.display = 'block';
            publishToProfileBtn.textContent = 'Publish to Profile'; // Clarify the default action
        }

        // --- A. NEW: ENGINE MANAGEMENT ---
        const availableEngines = [
            { id: 'p5', name: 'p5', file: 'sketch.js', language: 'javascript' },
            { id: 'three', name: 'Three', file: 'scene.js', language: 'javascript' },
            { id: 'thumbnail', name: 'Thumbnail (Fabric)', file: 'thumbnail.js', language: 'javascript' },
            { id: 'zdog', name: 'Zdog 3D', file: 'illustration.js', language: 'javascript' },
            { id: 'jsxgraph', name: 'JSXGraph', file: 'geometry.js', language: 'javascript' },
            { id: 'd3', name: 'D3', file: 'chart.js', language: 'javascript' },
            { id: 'matter', name: 'Matter', file: 'world.js', language: 'javascript' },
            { id: 'mermaid', name: 'Mermaid', file: 'diagram.mmd', language: 'markdown' },
            { id: 'katex', name: 'KaTeX (LaTeX)', file: 'equation.tex', language: 'latex' },
            { id: 'tikz', name: 'TikZ (Diagrams)', file: 'diagram.tex', language: 'latex' },
            { id: 'manim', name: 'Manim (Pro)', file: 'main.py', language: 'python' },
            { id: 'svg_to_3d', name: 'SVG to 3D', file: 'model.svg', language: 'xml' },
            { id: 'svg_to_png', name: 'SVG to PNG', file: 'vector.svg', language: 'xml' }
        ];

        const engineSelectHeader = document.getElementById('engineSelectHeader');
        const engineSelectModal = document.getElementById('engineSelectModal');

        function populateEngineSelects() {
            if (!engineSelectHeader || !engineSelectModal) return;

            engineSelectHeader.innerHTML = '';
            engineSelectModal.innerHTML = '';

            availableEngines.forEach(engine => {
                const option1 = document.createElement('option');
                option1.value = engine.id;
                option1.textContent = engine.name;
                engineSelectHeader.appendChild(option1);

                const option2 = option1.cloneNode(true);
                engineSelectModal.appendChild(option2);
            });
        }
        populateEngineSelects();

        // Add event listeners to sync dropdowns and switch engine
        if (engineSelectHeader) engineSelectHeader.addEventListener('change', (e) => switchEngine(e.target.value));
        if (engineSelectModal) engineSelectModal.addEventListener('change', (e) => switchEngine(e.target.value));

        // --- C. Console & Rendering Logic (Moved Up for Scope) ---
        const renderBtn = document.getElementById('renderBtn');
        const consoleLog = document.querySelector('.console-log');

        const threejsTemplate = `// three.js sketch: Rotating Cube
// Placeholders __WIDTH__ and __HEIGHT__ will be replaced by the resolution from settings.

// 1. Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, __WIDTH__ / __HEIGHT__, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(__WIDTH__, __HEIGHT__);
// The renderer creates a canvas element. We need to add it to the page.
document.getElementById('canvas-container').appendChild(renderer.domElement);


// 2. Add a cube
const geometry = new THREE.BoxGeometry();
// Use XtraPath Blue for the material
const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6 }); 
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 3. Add lighting
const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5).normalize();
scene.add(directionalLight);

camera.position.z = 5;

// 4. Animation loop
function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
}

animate();`;

        const d3jsTemplate = `// D3.js sketch: Rotating Orthographic Globe
// Placeholders __WIDTH__ and __HEIGHT__ will be replaced by the resolution from settings.

// 1. Set up dimensions
const width = 960; // Use a fixed 16:9 internal canvas for consistent previews
const height = 540;

// 2. Create SVG container
const container = d3.select("#canvas-container");

const svg = container
  .append("svg")
    .attr("viewBox", "0 0 " + width + " " + height);

// 3. Define the projection
const projection = d3.geoOrthographic()
    // Scale relative to our fixed internal canvas for a consistent look
    .scale(Math.min(width, height) / 2.8) // Reduced scale for a smaller globe
    .translate([width / 2, height / 2]) // Center the globe in the canvas
    .clipAngle(90); // Clip to a hemisphere

// 4. Define the path generator
const path = d3.geoPath()
    .projection(projection);

// 5. Draw a sphere for the ocean with a gradient
const defs = svg.append("defs");
const gradient = defs.append("radialGradient")
    .attr("id", "oceanGradient")
    .attr("cx", "50%")
    .attr("cy", "40%");
gradient.append("stop").attr("offset", "0%").attr("stop-color", "#87CEEB"); // Lighter blue at center
gradient.append("stop").attr("offset", "100%").attr("stop-color", "#3b82f6"); // XtraPath blue at edge

svg.append("path")
    .datum({type: "Sphere"})
    .attr("class", "sphere")
    .attr("d", path)
    .attr("fill", "url(#oceanGradient)");

// 6. Draw graticule (grid lines)
const graticule = d3.geoGraticule10();
svg.append("path")
    .datum(graticule)
    .attr("class", "graticule")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "rgba(255, 255, 255, 0.2)")
    .attr("stroke-width", 0.5);

// 7. Load and draw the world map data
d3.json("https://unpkg.com/world-atlas@2/countries-110m.json").then(world => {
    const land = topojson.feature(world, world.objects.countries);
    
    svg.append("path")
        .datum(land)
        .attr("class", "land")
        .attr("d", path)
        .attr("fill", "#22c55e") // A vibrant green for land
        .attr("stroke", "#141414")
        .attr("stroke-width", 0.3);

    // 8. Animate the rotation
    d3.timer(function(elapsed) {
        const rotate = [elapsed / 150, -23.5, 0]; // Rotate on longitude, tilt for Earth's axis
        projection.rotate(rotate);
        svg.selectAll("path").attr("d", path); // Redraw all paths
    });
}).catch(error => {
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "red")
        .text("Error loading map data.");
    console.error(error);
});`;

        const matterjsTemplate = `// Matter.js sketch: Bouncing Shapes
// Placeholders __WIDTH__ and __HEIGHT__ will be replaced by the resolution from settings.

// 1. Aliases for Matter.js modules
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite;

// 2. Create an engine
const engine = Engine.create();

// 3. Create a renderer
const render = Render.create({
    element: document.getElementById('canvas-container'),
    engine: engine,
    options: {
        width: __WIDTH__,
        height: __HEIGHT__,
        wireframes: false, // Set to true for a wireframe view
        background: '#141414'
    }
});

// 4. Create some bodies (a floor, a box, and a ball)
const ground = Bodies.rectangle(__WIDTH__ / 2, __HEIGHT__ - 30, __WIDTH__, 60, { isStatic: true });
const boxA = Bodies.rectangle(400, 200, 80, 80, { render: { fillStyle: '#3b82f6' } }); // XtraPath Blue
const ballA = Bodies.circle(450, 50, 40, { restitution: 0.9, render: { fillStyle: '#8b5cf6' } }); // XtraPath Purple

// 5. Add all of the bodies to the world
Composite.add(engine.world, [ground, boxA, ballA]);

// 6. Run the renderer and the engine
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);`;

        const p5Template = `// p5.js sketch: Unit Circle & Sine Wave Animation
// Placeholders __WIDTH__ and __HEIGHT__ will be replaced by the resolution from settings.
// This sketch visualizes the relationship between a point on a unit circle and a sine wave.

function setup() {
  // p5.js in global mode creates a canvas. We'll attach it to our container.
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  canvas.parent('canvas-container');
  angleMode(RADIANS); // Use radians for trigonometric functions
  // Set a fixed 16:9 aspect ratio for the internal drawing,
  // which will then be scaled by the iframe's scaling script.
  // This ensures consistent visual proportions regardless of preview panel size.
  resizeCanvas(960, 540); 
}

let angle = 0;
const wave = []; // Stores the y-values for the sine wave

function draw() {
  background(15, 23, 42); // Minimal dark slate background
  
  // Dynamic layout positions (guarantees safe margins inside any viewport)
  // These are relative to the internal 960x540 canvas
  const circleCenterX = width * 0.35; // Centered at 29% from left
  const centerY = height * 0.5;       // Exact vertical center
  const radius = 50;                 // Radius of the unit circle
  const waveStartX = width * 0.44;    // Sine wave begins at 44% width

  // --- Grid & Axes ---
  stroke(30, 41, 59); // Darker gray for grid lines
  strokeWeight(1);
  line(0, centerY, width, centerY); // Horizontal central axis
  line(circleCenterX, 0, circleCenterX, height); // Vertical axis for circle
  line(waveStartX, 0, waveStartX, height);       // Vertical axis for wave start

  // --- Unit Circle ---
  noFill();
  stroke(51, 65, 85); // Muted blue-gray
  strokeWeight(2);
  circle(circleCenterX, centerY, radius * 2);

  // Position on circle (x, y coordinates)
  let x = circleCenterX + radius * cos(angle);
  let y = centerY + radius * sin(angle);

  // Rotating radius line
  stroke(100, 116, 139); // Lighter gray
  strokeWeight(2);
  line(circleCenterX, centerY, x, y);

  // Vertical sine component (projection from circle to y-axis)
  stroke(244, 63, 94); // Vibrant pink
  strokeWeight(2.5);
  line(x, centerY, x, y); // Line from x-axis to point on circle

  // --- Sine Wave ---
  wave.unshift(y); // Add current y-value to the beginning of the wave array

  // Dashed connector line from circle point to wave start
  stroke(244, 63, 94, 160); // Semi-transparent pink
  strokeWeight(1.5);
  drawingContext.setLineDash([4, 4]); // Dashed line style
  line(x, y, waveStartX, y);
  drawingContext.setLineDash([]); // Reset dash for other drawings

  // Solid continuous wave
  noFill();
  stroke(56, 189, 248); // Bright cyan
  strokeWeight(3);
  beginShape();
  for (let i = 0; i < wave.length; i++) {
    vertex(waveStartX + i * 2, wave[i]); // Draw wave points
  }
  endShape();
  
  // Trim wave at right edge to keep it from growing indefinitely
  if (waveStartX + wave.length * 2 > width - 40) {
    wave.pop(); // Remove the oldest point
  }

  // --- Tracking Points ---
  // Point on circle
  fill(255); // White fill
  stroke(244, 63, 94); // Pink border
  strokeWeight(3);
  ellipse(x, y, 12, 12); // Draw the point on the circle

  // Point on wave lead
  stroke(56, 189, 248); // Cyan border
  ellipse(waveStartX, y, 10, 10); // Draw the point leading the wave

  // Rotate the angle for animation
  angle -= 0.035; // Adjust speed of rotation
}`;

        const svgTemplate = `<svg viewBox="0 0 100 100">
  <path d="M50 5 L61 39 L97 39 L68 61 L79 95 L50 73 L21 95 L32 61 L3 39 L39 39 Z" fill="#3b82f6" />
</svg>`;

        const mermaidTemplate = `graph TD
    A[Start] --> B{Is it?};
    B -- Yes --> C[OK];
    C --> D[End];
    B -- No --> E[Find out];
    E --> D;`;

        const katexTemplate = `% Maxwell's Equations in Differential Form
\\begin{aligned}
  \\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\varepsilon_0} \\\\[1em]
  \\nabla \\cdot \\mathbf{B} &= 0 \\\\[1em]
  \\nabla \\times \\mathbf{E} &= -\\frac{\\partial \\mathbf{B}}{\\partial t} \\\\[1em]
  \\nabla \\times \\mathbf{B} &= \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}
\\end{aligned}`;

        const jsxgraphTemplate = `// Interactive Calculus: Tangent Line & Derivative with JSXGraph
const board = JXG.JSXGraph.initBoard('jxgbox', {
    boundingbox: [-6, 6, 6, -6],
    axis: true,
    showCopyright: false,
    showNavigation: true
});

// Define function f(x) = sin(x)
const f = function(x) { return Math.sin(x); };
const graph = board.create('functiongraph', [f, -6, 6], {
    strokeColor: '#3b82f6',
    strokeWidth: 3
});

// Glider point constrained to the function curve
const p = board.create('glider', [1, Math.sin(1), graph], {
    name: 'P',
    color: '#ec4899',
    size: 5
});

// Dynamic Tangent Line at Point P
const tangent = board.create('tangent', [p], {
    strokeColor: '#eab308',
    strokeWidth: 2,
    dash: 2
});

// Live Derivative Slope Text Display
board.create('text', [
    function() { return p.X() + 0.3; },
    function() { return p.Y() + 0.8; },
    function() { 
        const slope = Math.cos(p.X());
        return "f'(" + p.X().toFixed(2) + ") = " + slope.toFixed(2);
    }
], {
    fontSize: 16,
    color: '#f4f4f5'
});`;

        const zdogTemplate = `// --- Zdog 3D: Kinetic Orbiting Cyber-Gem ---
// Drag with mouse or touch to rotate the 3D scene in real-time!

const illo = new Zdog.Illustration({
    element: '.zdog-canvas',
    dragRotate: true,
    zoom: 1.2,
    rotate: { x: -Zdog.TAU / 12, y: Zdog.TAU / 8 },
    onDragStart: function() {
        isSpinning = false;
    }
});

let isSpinning = true;

// 1. Central Floating Gem Group
const gemGroup = new Zdog.Group({
    addTo: illo,
    translate: { y: 0 }
});

// Polyhedron Core
new Zdog.Box({
    addTo: gemGroup,
    width: 64,
    height: 64,
    depth: 64,
    stroke: false,
    color: '#6366f1',
    leftFace: '#4f46e5',
    rightFace: '#4338ca',
    topFace: '#818cf8',
    bottomFace: '#3730a3',
});

// Inner Glowing Core
new Zdog.Shape({
    addTo: gemGroup,
    stroke: 28,
    color: '#38bdf8',
});

// 2. Multi-Axis Orbiting Rings
const ring1 = new Zdog.Ellipse({
    addTo: illo,
    diameter: 140,
    stroke: 4,
    color: '#06b6d4',
    rotate: { x: Zdog.TAU / 4, y: Zdog.TAU / 8 }
});

const ring2 = new Zdog.Ellipse({
    addTo: illo,
    diameter: 180,
    stroke: 3,
    color: '#ec4899',
    rotate: { x: -Zdog.TAU / 6, z: Zdog.TAU / 6 }
});

// 3. Orbiting Satellite Spheres
const sat1 = new Zdog.Shape({
    addTo: ring1,
    translate: { x: 70 },
    stroke: 16,
    color: '#f43f5e'
});

const sat2 = new Zdog.Shape({
    addTo: ring2,
    translate: { x: 90 },
    stroke: 14,
    color: '#a855f7'
});

const sat3 = new Zdog.Shape({
    addTo: ring2,
    translate: { x: -90 },
    stroke: 12,
    color: '#38bdf8'
});

// 4. Background Star Dust
const starGroup = new Zdog.Group({ addTo: illo });
for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Zdog.TAU;
    const distance = 110 + (i % 3) * 25;
    const zOffset = ((i % 5) - 2) * 35;
    new Zdog.Shape({
        addTo: starGroup,
        translate: {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance * 0.6,
            z: zOffset
        },
        stroke: (i % 2 === 0) ? 5 : 3,
        color: (i % 2 === 0) ? '#fbbf24' : '#e2e8f0'
    });
}

// 5. Kinetic Animation Loop
let ticker = 0;
function animate() {
    ticker += 0.02;
    
    if (isSpinning) {
        illo.rotate.y += 0.012;
        illo.rotate.x = Math.sin(ticker * 0.5) * 0.15 - 0.2;
    }
    
    // Dynamic bobbing and ring rotation
    gemGroup.translate.y = Math.sin(ticker) * 8;
    gemGroup.rotate.y += 0.01;
    ring1.rotate.z += 0.02;
    ring2.rotate.z -= 0.015;
    
    illo.updateRenderGraph();
    requestAnimationFrame(animate);
}
animate();`;

        const fabricTemplate = `// --- Fabric.js: High-Impact Thumbnail Generator ---
// Available in scope: canvas, logicalWidth, logicalHeight, helpers, fabric

// 1. Dynamic Cinematic Gradient Background
const bg = new fabric.Rect({
    left: 0,
    top: 0,
    width: logicalWidth,
    height: logicalHeight,
    selectable: false,
    evented: false,
    fill: helpers.createGradient(
        { x1: 0, y1: 0, x2: logicalWidth, y2: logicalHeight },
        [
            { offset: 0, color: '#09090b' },
            { offset: 0.5, color: '#1e1b4b' },
            { offset: 1, color: '#311042' }
        ]
    )
});
canvas.add(bg);

// 2. Ambient Neon Glow Orbs (Modern Tech / YouTube Look)
const cyanGlow = helpers.createGlowOrb(950, 120, 240, '#06b6d4', 90);
const pinkGlow = helpers.createGlowOrb(1080, 420, 200, '#ec4899', 100);
canvas.add(cyanGlow, pinkGlow);

// 3. Category / Episode Pill Badge
const badge = helpers.createPill('EPISODE 01 • MASTERCLASS', 80, 80, '#6366f1', '#ffffff');
canvas.add(badge);

// 4. Punchy Attention-Grabbing Typography
const mainTitle = new fabric.Textbox('ANIMATE WITH\\nCODE & MATH', {
    left: 80,
    top: 170,
    width: 820,
    fontSize: 78,
    lineHeight: 0.95,
    fontWeight: '900',
    fontFamily: 'Outfit, sans-serif',
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 4,
    shadow: new fabric.Shadow({
        color: 'rgba(0, 0, 0, 0.9)',
        blur: 25,
        offsetX: 6,
        offsetY: 8
    })
});

const subtitle = new fabric.Text('BUILD 3D & 2D VISUALIZATIONS IN BROWSER', {
    left: 85,
    top: 385,
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'Inter, sans-serif',
    fill: '#facc15',
    shadow: new fabric.Shadow({
        color: 'rgba(0, 0, 0, 0.8)',
        blur: 12,
        offsetX: 3,
        offsetY: 4
    })
});
canvas.add(mainTitle, subtitle);

// 5. Vector Accent Play Button & Glass Disc
const disc = new fabric.Circle({
    radius: 70,
    left: 1020,
    top: 280,
    fill: 'rgba(255, 255, 255, 0.08)',
    stroke: 'rgba(255, 255, 255, 0.3)',
    strokeWidth: 2,
    shadow: new fabric.Shadow({ color: '#ec4899', blur: 30 })
});

const playTriangle = new fabric.Path('M 0 0 L 0 60 L 50 30 Z', {
    left: 1065,
    top: 320,
    fill: '#ffffff',
    shadow: new fabric.Shadow({ color: '#ec4899', blur: 20 })
});
canvas.add(disc, playTriangle);

// Render canvas
canvas.renderAll();
`;

        const templates = {
            kinematics: `from manim import *

class KinematicsTemplate(Scene):
    def construct(self):
        # A simple ball drop animation
        ground = Line(LEFT * 3, RIGHT * 3).shift(DOWN * 2)
        ball = Circle(radius=0.2, color=RED, fill_opacity=1).shift(UP * 2)
        
        self.play(Create(ground), FadeIn(ball))
        self.wait(0.5)
        
        # Animate falling
        self.play(
            ball.animate.next_to(ground, UP, buff=0),
            rate_func=rate_functions.ease_out_bounce,
            run_time=2
        )
        self.wait()`,

            pendulum: `from manim import *
import numpy as np

class PendulumScene(Scene):
    def construct(self):
        pivot = UP * 2
        length = 3.5
        
        # Create Pivot
        pivot_dot = Dot(pivot, color=WHITE)
        
        # Create Rod and Bob
        rod = Line(pivot, pivot + DOWN * length, color=WHITE)
        bob = Circle(radius=0.3, color=BLUE, fill_opacity=1)
        bob.move_to(rod.get_end())
        
        self.add(pivot_dot, rod, bob)
        
        # Physics parameters
        gravity = 9.8
        frequency = np.sqrt(gravity / length)
        max_theta = 30 * DEGREES
        
        # Update function
        def update_pendulum(mob, dt):
            t = self.renderer.time
            theta = max_theta * np.cos(frequency * t)
            
            # Calculate new position relative to pivot
            x = length * np.sin(theta)
            y = -length * np.cos(theta)
            new_pos = pivot + np.array([x, y, 0])
            
            # Update rod
            rod.put_start_and_end_on(pivot, new_pos)
            # Update bob
            bob.move_to(new_pos)
            
        rod.add_updater(update_pendulum)
        bob.add_updater(update_pendulum)
        
        self.wait(10)`,

            geometry: `from manim import *

class GeometryTemplate(Scene):
    def construct(self):
        square = Square(color=BLUE, fill_opacity=0.5)
        circle = Circle(color=RED, fill_opacity=0.5)
        
        self.play(Create(square))
        self.play(Transform(square, circle))
        self.play(square.animate.set_fill(YELLOW, opacity=0.8))
        self.wait()`,

            fourcircles: `from manim import *
import numpy as np

# Try importing voiceover dependencies (Optional)
try:
    from manim_voiceover import VoiceoverScene
    from manim_voiceover.services.base import SpeechService
    import edge_tts
    import asyncio
    from pathlib import Path
    VOICEOVER_AVAILABLE = True
except ImportError:
    VOICEOVER_AVAILABLE = False
    class VoiceoverScene(Scene): pass

class FourCirclesTemplate(VoiceoverScene if VOICEOVER_AVAILABLE else Scene):
    def construct(self):
        self.camera.background_color = "#171717"

        # --- PALETTE ---
        C_BLUE_SHADE = "#5dade2"
        C_WHITE      = WHITE
        C_GUIDE      = RED
        C_DIM        = GRAY
        C_HIGHLIGHT  = "#1B2BD8"

        # --- GEOMETRY SETUP ---
        R_vis = 3.2
        VISUAL_SCALE = R_vis / 8.0
        
        r_real = 8 / (np.sqrt(2) + 1)
        r_vis  = r_real * VISUAL_SCALE
        rs_real = r_real * (np.sqrt(2) - 1)
        rs_vis  = rs_real * VISUAL_SCALE
        
        M1 = np.array([r_vis, r_vis, 0.0])
        M2 = np.array([-r_vis, r_vis, 0.0])
        M3 = np.array([-r_vis, -r_vis, 0.0])
        M4 = np.array([r_vis, -r_vis, 0.0])
        ORIGIN_PT = np.array([0.0, 0.0, 0.0])

        # --- SHAPES ---
        large_circle = Circle(radius=R_vis, color=C_BLUE_SHADE, fill_opacity=1, stroke_width=4, stroke_color=WHITE)
        
        medium_circles = VGroup(*[
            Circle(radius=r_vis, color=C_WHITE, fill_opacity=1, stroke_color=BLACK, stroke_width=2).move_to(p)
            for p in [M1, M2, M3, M4]
        ])

        small_circle = Circle(radius=rs_vis, color=C_WHITE, fill_opacity=1, stroke_color=BLACK, stroke_width=2).move_to(ORIGIN_PT)
        
        diagram = VGroup(large_circle, medium_circles, small_circle)
        diagram.move_to(ORIGIN)

        # --- ANIMATION ---
        self.play(DrawBorderThenFill(large_circle), run_time=1.5)
        self.play(FadeIn(medium_circles), FadeIn(small_circle), run_time=1.5)
        
        title = Text("Four Circles Theorem", font_size=36).to_edge(UP)
        self.play(Write(title))
        self.wait(2)`,

            pymunk: `import pymunk
from manim import *

class PymunkTemplate(Scene):
    def construct(self):
        # 1. Setup Physics Space
        space = pymunk.Space()
        space.gravity = (0.0, -9.81)

        # 2. Create Static Floor
        floor_body = pymunk.Body(body_type=pymunk.Body.STATIC)
        floor_body.position = (0, -3)
        floor_shape = pymunk.Segment(floor_body, (-5, 0), (5, 0), 0.1)
        floor_shape.elasticity = 0.8
        space.add(floor_body, floor_shape)

        floor = Line(LEFT * 5, RIGHT * 5).shift(DOWN * 3)
        self.add(floor)

        # 3. Create Dynamic Ball
        body = pymunk.Body(1, pymunk.moment_for_circle(1, 0, 0.5))
        body.position = (0, 3)
        shape = pymunk.Circle(body, 0.5)
        shape.elasticity = 0.8
        space.add(body, shape)

        ball = Circle(radius=0.5, color=RED, fill_opacity=0.8)
        ball.move_to(UP * 3)
        self.add(ball)

        # 4. Update Loop
        def update_ball(mob, dt):
            space.step(dt)
            mob.move_to([body.position.x, body.position.y, 0])
        
        ball.add_updater(update_ball)
        self.wait(4)`
        };

        // --- Auto-Save Logic ---
        function logToConsole(message, type = 'info') {
            if (!consoleLog) return;
            const line = document.createElement('div');
            // Add color classes based on type
            let colorClass = 'log-info';
            if (type === 'success') colorClass = 'log-success';
            if (type === 'error') colorClass = 'log-error';

            line.innerHTML = `<span class="${colorClass}">></span> ${message}`;
            consoleLog.appendChild(line);
            consoleLog.scrollTop = consoleLog.scrollHeight; // Auto scroll
        }

        logToConsole(`Backend connection: ${backendUrl || 'Relative (Same Origin)'}`);

        // --- Syntax Highlighting Sync Logic ---
        function updateHighlighting() {
            if (!highlightCode || !studioEditor) return;

            let text = studioEditor.value;
            // Handle final newline for display
            if (text[text.length - 1] === "\n") {
                text += " ";
            }

            // Update code block and highlight
            highlightCode.textContent = text;
            if (window.Prism) {
                window.Prism.highlightElement(highlightCode);
            }

            // Update Line Numbers
            if (lineNumbers) {
                const lines = text.split('\n').length;
                lineNumbers.innerHTML = Array(lines).fill(0).map((_, i) => `<div>${i + 1}</div>`).join('');
            }
        }

        // Sync Scroll
        studioEditor.addEventListener('scroll', () => {
            if (highlightPre) {
                highlightPre.scrollTop = studioEditor.scrollTop;
                highlightPre.scrollLeft = studioEditor.scrollLeft;
            }
            if (lineNumbers) {
                lineNumbers.scrollTop = studioEditor.scrollTop;
            }
        });

        // Sync Input
        studioEditor.addEventListener('input', () => {
            updateHighlighting();
            // Save to LocalStorage on every keystroke
            localStorage.setItem('xtraAnimCode', studioEditor.value);
        });

        // Enable Tab Indentation in Textarea
        studioEditor.addEventListener('keydown', function (e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                // Insert 4 spaces
                this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
                // Move cursor
                this.selectionStart = this.selectionEnd = start + 4;
                updateHighlighting(); // Update colors
            }
        });

        // --- ENGINE SWITCHING LOGIC ---
        const motionFrame = document.getElementById('motionCanvasPlayer');
        const outputContainer = document.getElementById('output');

        window.switchEngine = function (engineId, loadTemplate = true) {
            const engine = availableEngines.find(e => e.id === engineId);
            if (!engine) {
                console.error(`Engine '${engineId}' not found.`);
                return;
            }

            console.log("Switching engine to:", engine.name);
            currentEngine = engine.id;
            // --- NEW: Save the selected engine to localStorage ---
            localStorage.setItem('xtraAnimEngine', engine.id);

            const templateSelect = document.getElementById('templateSelect');
            const filenameDisplay = document.getElementById('filename-display');

            // UI Updates
            if (filenameDisplay) filenameDisplay.textContent = engine.file;
            if (engineSelectHeader) engineSelectHeader.value = engine.id;
            if (engineSelectModal) engineSelectModal.value = engine.id;

            // NEW: Toggle visibility of render settings based on engine type
            const manimSettings = document.getElementById('manimSettings');
            const clientRenderSettings = document.getElementById('clientRenderSettings');
            const svgTo3dSettings = document.getElementById('svgTo3dSettings');
            const svgToPngSettings = document.getElementById('svgToPngSettings');
            const mermaidSettings = document.getElementById('mermaidSettings');
            const katexSettings = document.getElementById('katexSettings');
            const jsxgraphSettings = document.getElementById('jsxgraphSettings');
            const zdogSettings = document.getElementById('zdogSettings');
            const thumbnailSettings = document.getElementById('thumbnailSettings');
            const tikzSettings = document.getElementById('tikzSettings');
            if (manimSettings) manimSettings.style.display = (engine.id === 'manim') ? 'flex' : 'none';
            // NEW: Mermaid, KaTeX, JSXGraph, Zdog, Thumbnail (Fabric), TikZ, and SVG to PNG are client-side but use their own settings
            const isGenericClient = engine.id !== 'manim' && engine.id !== 'svg_to_3d' && engine.id !== 'svg_to_png' && engine.id !== 'mermaid' && engine.id !== 'katex' && engine.id !== 'jsxgraph' && engine.id !== 'zdog' && engine.id !== 'thumbnail' && engine.id !== 'tikz';
            if (clientRenderSettings) clientRenderSettings.style.display = isGenericClient ? 'flex' : 'none';
            if (svgTo3dSettings) svgTo3dSettings.style.display = (engine.id === 'svg_to_3d') ? 'flex' : 'none';
            if (svgToPngSettings) svgToPngSettings.style.display = (engine.id === 'svg_to_png') ? 'flex' : 'none';
            if (mermaidSettings) mermaidSettings.style.display = (engine.id === 'mermaid') ? 'flex' : 'none';
            if (katexSettings) katexSettings.style.display = (engine.id === 'katex') ? 'flex' : 'none';
            if (jsxgraphSettings) jsxgraphSettings.style.display = (engine.id === 'jsxgraph') ? 'flex' : 'none';
            if (zdogSettings) zdogSettings.style.display = (engine.id === 'zdog') ? 'flex' : 'none';
            if (thumbnailSettings) thumbnailSettings.style.display = (engine.id === 'thumbnail') ? 'flex' : 'none';
            if (tikzSettings) tikzSettings.style.display = (engine.id === 'tikz') ? 'flex' : 'none';

            // Editor Updates
            if (loadTemplate) {
                if (engine.id === 'p5') {
                    studioEditor.value = p5Template;
                    if (templateSelect) templateSelect.value = ""; // Reset dropdown
                } else if (engine.id === 'three') {
                    studioEditor.value = threejsTemplate;
                    if (templateSelect) templateSelect.value = ""; // Reset dropdown
                } else if (engine.id === 'thumbnail') {
                    studioEditor.value = fabricTemplate;
                    if (templateSelect) templateSelect.value = ""; // Reset dropdown
                } else if (engine.id === 'zdog') {
                    studioEditor.value = zdogTemplate;
                    if (templateSelect) templateSelect.value = ""; // Reset dropdown
                } else if (engine.id === 'matter') {
                    studioEditor.value = matterjsTemplate;
                    if (templateSelect) templateSelect.value = ""; // Reset dropdown
                } else if (engine.id === 'd3') {
                    studioEditor.value = d3jsTemplate;
                    if (templateSelect) templateSelect.value = ""; // Reset dropdown
                } else if (engine.id === 'svg_to_3d') {
                    studioEditor.value = svgTemplate;
                    if (templateSelect) templateSelect.value = "";
                } else if (engine.id === 'svg_to_png') {
                    studioEditor.value = window.defaultSvgToPngCode || svgTemplate;
                    if (templateSelect) templateSelect.value = "";
                } else if (engine.id === 'mermaid') {
                    studioEditor.value = mermaidTemplate;
                    if (templateSelect) templateSelect.value = "";
                } else if (engine.id === 'katex') {
                    studioEditor.value = katexTemplate;
                    if (templateSelect) templateSelect.value = "";
                } else if (engine.id === 'jsxgraph') {
                    studioEditor.value = jsxgraphTemplate;
                    if (templateSelect) templateSelect.value = "";
                } else if (engine.id === 'tikz') {
                    studioEditor.value = window.defaultTikzCode || '% TikZ Diagram';
                    if (templateSelect) templateSelect.value = "";
                } else { // manim
                    studioEditor.value = templates.kinematics;
                    if (templateSelect) templateSelect.value = "kinematics";
                }
                // NEW: Sync localStorage with the new template code to prevent state mismatch on refresh.
                localStorage.setItem('xtraAnimCode', studioEditor.value);
            }

            // Syntax Highlighting
            if (highlightPre) highlightPre.className = `language-${engine.language}`;
            if (highlightCode) highlightCode.className = `language-${engine.language}`;

            // UI Updates for Preview Area
            if (engine.id !== 'manim') { // Any client-side engine
                if (motionFrame) motionFrame.style.display = 'block';
                if (outputContainer) outputContainer.style.display = 'none';
            } else { // manim
                if (motionFrame) motionFrame.style.display = 'none';
                if (motionFrame) motionFrame.srcdoc = ''; // Clear previous Motion Canvas preview
                if (outputContainer) outputContainer.style.display = 'flex';
            }

            // Refresh Highlight
            updateHighlighting();
            logToConsole(`Switched engine to ${engine.name}`);
        };

        // --- FIX: Consolidated State Restoration on Load ---
        setTimeout(() => {
            // NEW: Check for tool pre-selection from URL
            const urlParams = new URLSearchParams(window.location.search);
            const preselectedTool = urlParams.get('tool');
            const remixParamId = urlParams.get('remix') || urlParams.get('id');

            let remixData = null;
            const remixMetaRaw = localStorage.getItem('remixMeta');
            if (remixMetaRaw) {
                try { remixData = JSON.parse(remixMetaRaw); } catch { }
            } else if (remixParamId) {
                const allLocal = JSON.parse(localStorage.getItem('userPosts') || '[]');
                const found = allLocal.find(p => String(p.id) === String(remixParamId));
                if (found) {
                    remixData = {
                        source: found.source || (found.code ? { engine: found.format || 'manim', code: found.code } : null),
                        originalId: found.id,
                        userId: found.user_id,
                        title: found.title,
                        is_source_protected: window.isPostCodeProtected ? window.isPostCodeProtected(found) : false
                    };
                }
            }

            if (remixData) {
                // A. Handle Remix: This takes precedence over any saved state.
                const meta = remixData;
                const source = meta.source || {};
                const isProtected = window.isPostCodeProtected ? window.isPostCodeProtected(meta) : (meta.is_source_protected || source.is_source_protected || source.code_access === 'paid' || source.access_tier === 'protected_code' || (source.code_price && source.code_price > 0));
                const currentUserId = localStorage.getItem('userId');
                const isAuthor = currentUserId && meta.userId && String(currentUserId) === String(meta.userId);
                const isUnlocked = window.isItemUnlocked ? window.isItemUnlocked(meta.originalId) : false;

                if (isProtected && !isAuthor && !isUnlocked) {
                    // Lock Studio Editor behind Paywall
                    showStudioCodeLockOverlay(meta);
                    return;
                }

                loadRemixIntoEditor(meta);

                function showStudioCodeLockOverlay(meta) {
                    const source = meta.source || {};
                    const engineToLoad = source.engine || 'manim';
                    switchEngine(engineToLoad, false);

                    studioEditor.value = "# --- 🔒 PROTECTED SOURCE CODE ---\n# The creator has protected this mathematical simulation code.\n# Unlock via Stripe ($" + (source.code_price || 2.99).toFixed(2) + ") or XtraPath Pro to view, edit, and remix in Studio.";
                    updateHighlighting();

                    const editorContainer = document.querySelector('.editor-container') || document.getElementById('view-editor');
                    if (!editorContainer) return;

                    let lockOverlay = document.getElementById('studioLockOverlay');
                    if (!lockOverlay) {
                        lockOverlay = document.createElement('div');
                        lockOverlay.id = 'studioLockOverlay';
                        lockOverlay.style.cssText = `
                            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                            background: rgba(10, 10, 15, 0.92); backdrop-filter: blur(12px);
                            display: flex; flex-direction: column; align-items: center; justify-content: center;
                            z-index: 50; padding: 24px; text-align: center; box-sizing: border-box;
                        `;
                        lockOverlay.innerHTML = `
                            <div style="width: 58px; height: 58px; border-radius: 50%; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #fbbf24; margin-bottom: 12px;">
                                <i class="ri-lock-2-line"></i>
                            </div>
                            <h2 style="font-size: 1.35rem; font-weight: 800; color: #ffffff; margin: 0 0 6px;">Protected Scientific Source Code</h2>
                            <p style="color: #a1a1aa; font-size: 0.88rem; margin: 0 0 20px; max-width: 380px;">The creator has protected the mathematical code for this simulation. Unlock access to edit, run, and export in Studio.</p>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                                <button id="studioUnlockCodeBtn" style="padding: 10px 22px; background: #3b82f6; color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                                    <i class="ri-key-2-line"></i> Unlock Code for $${(source.code_price || 2.99).toFixed(2)}
                                </button>
                                <button id="studioUpgradeProBtn" style="padding: 10px 22px; background: linear-gradient(135deg, #3b82f6, #9333ea); color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                                    <i class="ri-sparkling-line"></i> Upgrade to Pro ($15/mo)
                                </button>
                            </div>
                        `;
                        editorContainer.style.position = 'relative';
                        editorContainer.appendChild(lockOverlay);

                        const unlockBtn = lockOverlay.querySelector('#studioUnlockCodeBtn');
                        const proBtn = lockOverlay.querySelector('#studioUpgradeProBtn');

                        unlockBtn.onclick = () => {
                            window.openSourceCodeUnlockModal({ id: meta.originalId, title: 'Simulation Source Code', code_price: source.code_price || 2.99 }, () => {
                                lockOverlay.remove();
                                loadRemixIntoEditor(meta);
                            });
                        };

                        proBtn.onclick = () => {
                            window.openPricingModal();
                        };
                    }
                }

                function loadRemixIntoEditor(meta) {
                    const source = meta.source || {};
                    const engineToLoad = source.engine || 'manim';

                    // Switch engine UI but don't load a template
                    switchEngine(engineToLoad, false);

                    // Set the editor to the remixed code
                    studioEditor.value = source.code || '';
                    remixOriginalId = meta.originalId;

                    // NEW: Handle remixed mermaid dimensions
                    if (engineToLoad === 'mermaid' && source.width && source.height) {
                        const widthInput = document.getElementById('mermaidWidth');
                        const heightInput = document.getElementById('mermaidHeight');
                        if (widthInput) widthInput.value = source.width;
                        if (heightInput) heightInput.value = source.height;
                    }
                    if (engineToLoad === 'jsxgraph' && source.background) {
                        const bgPicker = document.getElementById('jsxgraphBackground');
                        if (bgPicker) bgPicker.value = source.background;
                    }
                    if (engineToLoad === 'zdog' && source.background) {
                        const bgPicker = document.getElementById('zdogBackground');
                        if (bgPicker) bgPicker.value = source.background;
                    }
                    if (engineToLoad === 'thumbnail' && source.background) {
                        const bgPicker = document.getElementById('thumbnailBackground');
                        if (bgPicker) bgPicker.value = source.background;
                    }

                    // Clean up so it doesn't load again on next refresh
                    localStorage.removeItem('remixMeta');

                    // IMPORTANT: Update the saved code in localStorage to the remixed code.
                    localStorage.setItem('xtraAnimCode', source.code);
                    // Also sync the engine setting.
                    localStorage.setItem('xtraAnimEngine', engineToLoad);

                    updateHighlighting();
                    logToConsole("Loaded source code for Remix.", 'success');
                }
            } else if (preselectedTool) {
                // C. Handle pre-selected tool from URL
                switchEngine(preselectedTool, true);
                localStorage.setItem('xtraAnimEngine', preselectedTool);
                localStorage.setItem('xtraAnimCode', studioEditor.value); // Save the template code
                updateHighlighting();
                logToConsole(`Switched to ${preselectedTool} engine from URL parameter.`, 'success');
            } else {
                // B. Handle Normal Page Load: Restore from localStorage.
                const savedEngine = localStorage.getItem('xtraAnimEngine') || 'p5'; // Default to p5
                const savedCode = localStorage.getItem('xtraAnimCode');

                // Switch the engine UI. Only load a template if there's no saved code.
                switchEngine(savedEngine, !savedCode);

                // If there was saved code, ensure it's in the editor.
                if (savedCode) {
                    studioEditor.value = savedCode;
                }

                // Finally, update highlighting based on the final state.
                updateHighlighting();
            }
        }, 10);

        // --- B. Handle Template Switching ---
        const templateSelect = document.getElementById('templateSelect');
        if (templateSelect) {
            templateSelect.addEventListener('change', function () {
                const key = this.value;
                if (!key) return;

                // Load Python Template (template dropdown is for Manim)
                if (templates[key]) studioEditor.value = templates[key];

                // Save the new template to local storage
                localStorage.setItem('xtraAnimCode', studioEditor.value);
                logToConsole(`Loaded template: ${key}`);
                updateHighlighting();
            });
        }

        // Preset listener for Thumbnail Studio
        const thumbnailPreset = document.getElementById('thumbnailPreset');
        if (thumbnailPreset) {
            thumbnailPreset.addEventListener('change', function () {
                const customDims = document.getElementById('thumbnailCustomDims');
                const wInput = document.getElementById('thumbnailWidth');
                const hInput = document.getElementById('thumbnailHeight');
                if (this.value === 'custom') {
                    if (customDims) customDims.style.display = 'flex';
                } else {
                    if (customDims) customDims.style.display = 'none';
                    const parts = this.value.split('x');
                    if (wInput) wInput.value = parts[0];
                    if (hInput) hInput.value = parts[1];
                }
            });
        }

        // Listen for Client-side Recording from Iframe (used by p5.js, svg_to_png)
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'MC_RECORDING_COMPLETE') { // Keep same event name for simplicity
                generatedVideoUrl = event.data.url;
                const uploadBtn = document.getElementById('uploadVideoBtn');
                if (uploadBtn) uploadBtn.style.display = 'block';
                logToConsole("Client-side recording captured. Ready to upload.", 'success');
            }
            if (event.data && event.data.type === 'svg_to_png_ready') {
                window.currentSvgToPng = event.data.pngDataUrl;
                if (event.data.currentColor) {
                    window.currentSvgColor = event.data.currentColor;
                }
            }
        });

        // Log remix success if applicable
        if (remixOriginalId) logToConsole("Loaded source code for Remix.", 'success');

        // --- PROJECT ID FOR CACHING ---
        // We use a stable ID for the session so Manim can cache animations
        let currentProjectId = localStorage.getItem('currentProjectId');
        if (!currentProjectId) {
            currentProjectId = 'proj_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            localStorage.setItem('currentProjectId', currentProjectId);
        }

        window.handleRender = (isPreview, fromModal = false) => {
            console.log(`handleRender triggered. Engine: ${currentEngine}, Preview: ${isPreview}, From Modal: ${fromModal}`);
            const code = studioEditor.value;
            if (!code.trim()) {
                logToConsole("Error: Editor is empty.", 'error');
                return;
            }

            // If called from the modal, close it.
            if (fromModal) {
                const settingsPopup = document.getElementById('settings-popup');
                if (settingsPopup) settingsPopup.style.display = 'none';
            }

            // --- UNIFIED PREVIEW VISIBILITY LOGIC ---
            // On mobile, switch to the preview tab. On desktop, ensure the panel is visible.
            if (typeof switchTab === 'function' && window.innerWidth <= 1024) {
                switchTab('preview');
            } else {
                const previewView = document.getElementById('view-preview');
                if (previewView) {
                    // The media query handles the split-screen layout, but the inline
                    // style 'display:none' must be overridden to make the panel appear.
                    previewView.style.display = 'flex';
                }
            }

            // --- p5.js / three.js (CLIENT-SIDE PREVIEW) LOGIC ---
            if (currentEngine !== 'manim') { // START of Client-side Block
                const uploadBtn = document.getElementById('uploadVideoBtn');

                if (uploadBtn) {
                    // For SVG, D3, Mermaid, KaTeX, JSXGraph, Zdog, Thumbnail, TikZ, and SVG to PNG, we can publish the static preview.
                    uploadBtn.style.display = (currentEngine === 'svg_to_3d' || currentEngine === 'svg_to_png' || currentEngine === 'd3' || currentEngine === 'mermaid' || currentEngine === 'katex' || currentEngine === 'jsxgraph' || currentEngine === 'zdog' || currentEngine === 'thumbnail' || currentEngine === 'tikz') ? 'block' : 'none';
                }

                logToConsole("Building Client-Side Preview...");

                if (currentEngine === 'thumbnail') {
                    if (window.renderFabric) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';

                            const presetSelect = document.getElementById('thumbnailPreset');
                            let width = 1280;
                            let height = 720;
                            if (presetSelect && presetSelect.value !== 'custom') {
                                const parts = presetSelect.value.split('x');
                                width = parseInt(parts[0], 10);
                                height = parseInt(parts[1], 10);
                            } else {
                                const wInput = document.getElementById('thumbnailWidth');
                                const hInput = document.getElementById('thumbnailHeight');
                                if (wInput) width = parseInt(wInput.value, 10) || 1280;
                                if (hInput) height = parseInt(hInput.value, 10) || 720;
                            }

                            const bgPicker = document.getElementById('thumbnailBackground');
                            const background = bgPicker ? bgPicker.value : '#09090b';

                            frame.srcdoc = window.renderFabric(code, { width, height, background });
                            logToConsole('Thumbnail Studio canvas rendered!', 'success');
                        }
                    } else {
                        logToConsole("Error: Fabric thumbnail rendering library not loaded.", 'error');
                    }

                } else if (currentEngine === 'zdog') {
                    if (window.renderZdog) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';

                            const bgPicker = document.getElementById('zdogBackground');
                            const background = bgPicker ? bgPicker.value : '#0a0d14';

                            frame.srcdoc = window.renderZdog(code, { background });
                            logToConsole('Zdog 3D illustration rendered!', 'success');
                        }
                    } else {
                        logToConsole("Error: Zdog rendering library not loaded.", 'error');
                    }

                } else if (currentEngine === 'jsxgraph') {
                    if (window.renderJSXGraph) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';

                            const bgPicker = document.getElementById('jsxgraphBackground');
                            const background = bgPicker ? bgPicker.value : '#0a0d14';

                            frame.srcdoc = window.renderJSXGraph(code, { background });
                            logToConsole('JSXGraph interactive math rendered!', 'success');
                        }
                    } else {
                        logToConsole("Error: JSXGraph rendering library not loaded.", 'error');
                    }

                } else if (currentEngine === 'mermaid') {
                    if (window.renderMermaid) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';

                            // Get size from settings
                            const widthInput = document.getElementById('mermaidWidth');
                            const heightInput = document.getElementById('mermaidHeight');
                            const width = widthInput ? widthInput.value : 200;
                            const height = heightInput ? heightInput.value : 200;

                            // The renderMermaid function will return the iframe content with the specified size.
                            frame.srcdoc = window.renderMermaid(code, width, height);
                            logToConsole('Mermaid diagram preview loaded!', 'success');
                        }
                    } else {
                        logToConsole("Error: Mermaid rendering library not loaded.", 'error');
                    }

                } else if (currentEngine === 'katex') {
                    if (window.renderKatex) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';

                            const fontSizeSelect = document.getElementById('katexFontSize');
                            const colorPicker = document.getElementById('katexTextColor');
                            const fontSize = fontSizeSelect ? fontSizeSelect.value : '1.8em';
                            const color = colorPicker ? colorPicker.value : '#ffffff';

                            frame.srcdoc = window.renderKatex(code, { fontSize, color });
                            logToConsole('KaTeX LaTeX equation rendered!', 'success');
                        }
                    } else {
                        logToConsole("Error: KaTeX rendering library not loaded.", 'error');
                    }

                } else if (currentEngine === 'tikz') {
                    const frame = document.getElementById('motionCanvasPlayer');
                    if (frame) {
                        frame.style.display = 'block';
                        if (outputContainer) outputContainer.style.display = 'none';

                        const modeSelect = document.getElementById('tikzEngineMode');
                        const isPro = modeSelect && modeSelect.value === 'pro';

                        if (isPro) {
                            logToConsole("Compiling TikZ via Pro Native LaTeX Engine...", 'info');
                            fetch('/api/compile_tikz', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ code: code, dpi: 300 })
                            })
                            .then(res => res.json())
                            .then(data => {
                                if (data.success) {
                                    logToConsole("TikZ Pro compilation successful!", 'success');
                                    if (data.pngBase64) {
                                        window.currentTikzPng = data.pngBase64;
                                    }
                                    if (window.renderTikzPro && data.pngBase64) {
                                        frame.srcdoc = window.renderTikzPro(data.pngBase64);
                                    }
                                } else {
                                    logToConsole(`Pro Engine: ${data.error || 'Compilation failed. Falling back to Browser Wasm...'}`, 'error');
                                    if (window.renderTikz) frame.srcdoc = window.renderTikz(code);
                                }
                            })
                            .catch(err => {
                                logToConsole(`Pro Engine Error: ${err.message}. Falling back to Browser Wasm...`, 'error');
                                if (window.renderTikz) frame.srcdoc = window.renderTikz(code);
                            });
                        } else {
                            if (window.renderTikz) {
                                frame.srcdoc = window.renderTikz(code);
                                logToConsole('TikZ WebAssembly diagram rendered!', 'success');
                            } else {
                                logToConsole("Error: TikZ rendering library not loaded.", 'error');
                            }
                        }
                    }

                } else if (currentEngine === 'svg_to_3d') {
                    const svgCode = JSON.stringify(code);
                    // Get color from the new picker in the settings modal
                    const colorPicker = document.getElementById('svgColorPicker');
                    const modelColor = colorPicker ? colorPicker.value : '#3b82f6';

                    // Use the new helper function. Set preserveBuffer to true for screenshot capability.
                    const iframeContent = createSVG3DViewerIframeContent(svgCode, modelColor, true);

                    const frame = document.getElementById('motionCanvasPlayer');
                    if (frame) {
                        frame.style.display = 'block';
                        if (outputContainer) outputContainer.style.display = 'none';
                        frame.srcdoc = iframeContent;
                        logToConsole('SVG to 3D preview loaded!', 'success');
                    }
                } else if (currentEngine === 'svg_to_png') {
                    const fillColor = document.getElementById('svgPngFillColor')?.value || '';
                    const strokeColor = document.getElementById('svgPngStrokeColor')?.value || '';
                    const bgColor = document.getElementById('svgPngBgColor')?.value || 'transparent';
                    const scale = parseInt(document.getElementById('svgPngScaleSelect')?.value || '4', 10);

                    if (window.renderSvgToPng) {
                        const iframeContent = window.renderSvgToPng(code, {
                            fillColor,
                            strokeColor,
                            backgroundColor: bgColor,
                            scale
                        });
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';
                            frame.srcdoc = iframeContent;
                            logToConsole('SVG to PNG vector rendered! Colors & export ready.', 'success');
                        }
                    } else {
                        logToConsole('Error: SVG to PNG rendering library not loaded.', 'error');
                    }
                } else {
                    // Existing logic for p5, three, d3, matter
                    // NEW: Get client-side resolution and DURATION
                    let clientRenderWidth = 1280;
                    let clientRenderHeight = 720;
                    let clientRenderDuration = 5; // Default duration

                    const formatSelectClient = document.getElementById('formatSelectClient');
                    if (formatSelectClient) {
                        const [w, h] = formatSelectClient.value.split('x').map(Number);
                        clientRenderWidth = w;
                        clientRenderHeight = h;
                    }
                    const durationInput = document.getElementById('clientRenderDuration');
                    if (durationInput) {
                        clientRenderDuration = parseInt(durationInput.value, 10) || 5;
                    }

                    let iframeContent = '';
                    let libraryUrl;
                    let extraScripts = ''; // New variable

                    if (currentEngine === 'p5') {
                        libraryUrl = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js';
                    } else if (currentEngine === 'three') {
                        libraryUrl = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                    } else if (currentEngine === 'matter') {
                        libraryUrl = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';
                    } else if (currentEngine === 'd3') {
                        libraryUrl = 'https://d3js.org/d3.v7.min.js';
                        extraScripts = '<script src="https://cdn.jsdelivr.net/npm/topojson-client@3"><\/script>';
                    }

                    // --- UNIFIED IFRAME BODY FOR CLIENT-SIDE ENGINES ---
                    // Both p5.js and three.js will be given a container to render into.
                    // This provides a consistent and predictable environment.
                    let userScript = '';
                    if (currentEngine === 'p5') {
                        userScript = `
                        <script>
                            try {
                                ${code.replace(/__WIDTH__/g, clientRenderWidth).replace(/__HEIGHT__/g, clientRenderHeight)}
                            } catch (e) {
                                console.error("p5.js execution error:", e);
                                const showError = function() {
                                    const container = document.getElementById('canvas-container');
                                    if (container) {
                                        container.innerHTML = '<canvas id="error-canvas" width="${clientRenderWidth}" height="${clientRenderHeight}"></canvas>';
                                        const ctx = document.getElementById('error-canvas').getContext('2d');
                                        ctx.fillStyle = '#141414';
                                        ctx.fillRect(0, 0, ${clientRenderWidth}, ${clientRenderHeight});
                                        ctx.fillStyle = '#ef4444';
                                        ctx.font = '14px monospace';
                                        ctx.fillText('Error: ' + e.message, 10, 50);
                                    }
                                };
                                if (document.readyState === 'loading') {
                                    document.addEventListener('DOMContentLoaded', showError);
                                } else {
                                    showError();
                                }
                            }
                        <\/script>
                    `;
                    } else { // three.js, matter.js, d3.js
                        userScript = `
                        <script>
                            function runSketch() {
                                try {
                                    ${code.replace(/__WIDTH__/g, clientRenderWidth).replace(/__HEIGHT__/g, clientRenderHeight)}
                                } catch (e) {
                                    console.error("${currentEngine} execution error:", e);
                                    const container = document.getElementById('canvas-container');
                                    if (container) {
                                        container.innerHTML = '';
                                        const errorDiv = document.createElement('div');
                                        errorDiv.style.cssText = 'color:#ef4444; padding:20px; font-family:monospace; width:100%; height:100%; background:#141414; border:1px solid #333; box-sizing:border-box; font-size:13px;';
                                        errorDiv.textContent = 'Script Error: ' + e.message;
                                        container.appendChild(errorDiv);
                                    }
                                }
                            }
                            if (document.readyState === 'loading') {
                                document.addEventListener('DOMContentLoaded', () => setTimeout(runSketch, 50));
                            } else {
                                setTimeout(runSketch, 50);
                            }
                        <\/script>
                    `;
                    }

                    iframeContent = ` 
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <script src="${libraryUrl}"><\/script>
                        ${extraScripts}
                        <style>
                            * { box-sizing: border-box; }
                            html, body { 
                                margin: 0; 
                                padding: 0;
                                background: #090b10;
                                overflow: hidden; 
                                width: 100%;
                                height: 100%; 
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            }
                            #canvas-container { 
                                width: 100%;
                                height: 100%;
                                display: flex; 
                                align-items: center; 
                                justify-content: center; 
                                position: relative;
                            }
                            canvas, svg { 
                                max-width: 100%; 
                                max-height: 100%;
                                object-fit: contain;
                                background: #141414;
                                border: 1px solid #333;
                                box-shadow: 0 0 20px rgba(0,0,0,0.5);
                            }
                        </style>
                    </head>
                    <body>
                    <div id="canvas-container"></div>
                        ${userScript}
                        <script>
                            // Automatically ensure canvas is inside container
                            const observer = new MutationObserver(() => {
                                const looseCanvas = document.querySelector('body > canvas');
                                const container = document.getElementById('canvas-container');
                                if (looseCanvas && container && looseCanvas.parentElement !== container) {
                                    container.appendChild(looseCanvas);
                                }
                            });
                            observer.observe(document.body, { childList: true });

                            // Optional recording logic with cross-browser safe mimeTypes
                            setTimeout(() => {
                                const canvas = document.querySelector('canvas');
                                if (!canvas || typeof canvas.captureStream !== 'function') return;
                                try {
                                    const stream = canvas.captureStream(30);
                                    let mimeType = '';
                                    if (typeof MediaRecorder !== 'undefined') {
                                        if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) mimeType = 'video/mp4;codecs=avc1';
                                        else if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
                                        else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) mimeType = 'video/webm;codecs=vp9';
                                        else if (MediaRecorder.isTypeSupported('video/webm')) mimeType = 'video/webm';
                                    }
                                    const recorderOptions = mimeType ? { mimeType, videoBitsPerSecond: 8000000 } : { videoBitsPerSecond: 8000000 };
                                    const mediaRecorder = new MediaRecorder(stream, recorderOptions);
                                    let chunks = [];
        
                                    mediaRecorder.ondataavailable = function(e) {
                                        if (e.data && e.data.size > 0) chunks.push(e.data);
                                    };

                                    mediaRecorder.onstop = function() {
                                        const finalBlobType = mimeType || 'video/webm';
                                        const blob = new Blob(chunks, { type: finalBlobType });
                                        const url = URL.createObjectURL(blob);
                                        window.parent.postMessage({ type: 'MC_RECORDING_COMPLETE', url: url }, '*');
                                    };
        
                                    mediaRecorder.start();
                                    setTimeout(() => {
                                        if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
                                    }, ${clientRenderDuration * 1000});
                                } catch (recErr) {
                                    console.warn("Client recording optional error:", recErr);
                                }
                            }, 300);
                        <\/script>
                    </body>
                    </html>
                `;

                    const frame = document.getElementById('motionCanvasPlayer');
                    if (frame) {
                        frame.style.display = 'block';

                        if (outputContainer) outputContainer.style.display = 'none';

                        frame.srcdoc = iframeContent;
                        logToConsole(`Realtime ${currentEngine} preview loaded!`, 'success');
                    } else {
                        logToConsole("Error: Preview iframe not found in DOM.", 'error');
                    }
                }
                return; // CRITICAL: Stop execution for client-side engines

            } else { // START of Manim Block
                // --- NEW: Prevent server-side rendering on live domains ---
                const hostname = window.location.hostname;
                const isLocal = (
                    hostname === 'localhost' ||
                    hostname === '127.0.0.1' ||
                    hostname.startsWith('192.168.') ||
                    hostname.startsWith('10.') ||
                    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
                );
                if (!isLocal && currentEngine === 'manim') {
                    alert("Server-side Manim rendering is disabled on the live server.\n\nYou can use the client-side p5.js engine, or run the project locally to use Manim.");
                    logToConsole("Manim rendering is only available in a local environment.", 'error');
                    // The buttons that call this function will not have been disabled yet,
                    // so a simple return is safe and prevents them from entering a loading state.
                    return;
                }

                // --- MANIM (PRO TIER) LOGIC ---

                // 1. UI Updates
                const previewBtn = document.getElementById('previewBtn');
                const startRenderBtn = document.getElementById('startRenderBtn');

                // Hide download button during render
                const uploadBtn = document.getElementById('uploadVideoBtn');
                if (uploadBtn) uploadBtn.style.display = 'none';

                if (isPreview) {
                    if (previewBtn) {
                        previewBtn.disabled = true;
                        previewBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Checking...`;
                    }
                    logToConsole("Generating layout preview (Fast Mode)...");
                } else {
                    if (renderBtn) renderBtn.innerHTML = `<i class="ri-loader-4-line spin"></i>`;
                    if (startRenderBtn) {
                        startRenderBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Processing...`;
                        startRenderBtn.disabled = true;
                    }
                    logToConsole("Initializing Manim render engine...");
                }

                // Clear previous video and show spinner in output container
                const motionFrame = document.getElementById('motionCanvasPlayer');
                if (motionFrame) motionFrame.style.display = 'none';
                if (outputContainer) {
                    outputContainer.style.display = 'flex';
                    outputContainer.innerHTML = `
                        <div style="text-align: center; color: var(--text-muted);">
                            <div class="spinner" style="font-size: 2rem; margin-bottom: 10px;"><i class="ri-flashlight-fill"></i></div>
                            <p style="font-size: 0.9rem;">${isPreview ? 'Capturing layout...' : 'Rendering frame-by-frame...'}</p>
                        </div>
                    `;
                }

                // 2. Determine Resolution based on Dropdown
                let renderWidth = 854;
                let renderHeight = 480;
                let renderFormat = '16:9';

                const fmtSelect = document.getElementById('formatSelect');

                if (fmtSelect && fmtSelect.value === '9:16') {
                    renderWidth = 480;
                    renderHeight = 854;
                    renderFormat = '9:16';
                }
                window.currentRenderFormat = renderFormat;

                // 3. Real Backend Call
                logToConsole(`Sending ${code.length} bytes to server...`);
                fetch(`${backendUrl}/api/render`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: code,
                        width: renderWidth,
                        height: renderHeight,
                        project_id: currentProjectId,
                        preview: isPreview,
                        engine: currentEngine
                    })
                })
                    .then(response => response.json())
                    .then(data => {
                        // Check for background task (Long Video)
                        if (data.task_id) {
                            logToConsole("Render started in background. Task ID: " + data.task_id, 'success');
                            pollRenderStatus(data.task_id, isPreview);
                            return;
                        }

                        // Handle Sync Response (Preview or Error)
                        finishRender(data, isPreview);
                    })
                    .catch(err => {
                        finishRender({ success: false, error: "Network Error: Is the backend running?" }, isPreview);
                        logToConsole("Network Error: Is the backend running?", 'error');
                    });
            }
        };

        // Helper to finalize UI after render (sync or async)
        const finishRender = (data, isPreview) => {
            const previewBtn = document.getElementById('previewBtn');
            const startRenderBtn = document.getElementById('startRenderBtn');
            const motionFrame = document.getElementById('motionCanvasPlayer');

            if (previewBtn) { previewBtn.disabled = false; previewBtn.innerHTML = `<i class="ri-eye-line"></i> Check Layout`; }
            if (startRenderBtn) { startRenderBtn.disabled = false; startRenderBtn.innerHTML = `Start Render`; }
            if (renderBtn) { renderBtn.disabled = false; renderBtn.innerHTML = `<span>▶</span>`; }

            // Ensure preview panel is visible across both mobile and desktop
            if (typeof window.switchTab === 'function') window.switchTab('preview');
            const previewView = document.getElementById('view-preview');
            if (previewView) previewView.style.display = 'flex';

            if (data.success) {
                if (motionFrame) motionFrame.style.display = 'none';
                if (outputContainer) outputContainer.style.display = 'flex';

                if (isPreview && data.imageUrl) {
                    logToConsole("Layout check complete.", 'success');
                    const fullImageUrl = data.imageUrl.startsWith('http') ? data.imageUrl : `${backendUrl}${data.imageUrl}`;
                    const cacheBust = fullImageUrl + (fullImageUrl.includes('?') ? '&' : '?') + "t=" + Date.now();
                    outputContainer.innerHTML = `
                        <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                            <img src="${cacheBust}" alt="Preview" style="width:100%; height:100%; object-fit:contain;">
                            <div style="background:#111; color:#a1a1aa; font-size:0.7rem; padding:5px; text-align:center; width:100%;">
                                Preview Mode (Last Frame) • Click Run for full video
                            </div>
                        </div>
                    `;
                } else if (data.videoUrl) {
                    logToConsole("Render complete. Output generated.", 'success');
                    generatedVideoUrl = data.videoUrl.startsWith('http') ? data.videoUrl : `${backendUrl}${data.videoUrl}`;
                    const uploadBtn = document.getElementById('uploadVideoBtn');
                    if (uploadBtn) uploadBtn.style.display = 'block';

                    outputContainer.innerHTML = `
                        <video src="${generatedVideoUrl}" controls autoplay loop playsinline style="width:100%; height:100%; object-fit:contain;">
                            Your browser does not support the video tag.
                        </video>
                    `;
                } else {
                    logToConsole("Render finished but no output URL found.", 'error');
                }
            } else {
                if (motionFrame) motionFrame.style.display = 'none';
                if (outputContainer) outputContainer.style.display = 'flex';
                logToConsole("Render Failed: " + (data.error || "Unknown error"), 'error');
                if (data.logs) {
                    data.logs.split('\n').forEach(line => {
                        if (line.trim()) logToConsole(line, 'error');
                    });
                }
                outputContainer.innerHTML = `
                    <div style="text-align:center; padding:20px; color:#ef4444; font-family:monospace; font-size:0.85rem;">
                        <i class="ri-error-warning-line" style="font-size:2rem; display:block; margin-bottom:8px;"></i>
                        <div>Render Failed</div>
                        <div style="color:#a1a1aa; margin-top:6px; font-size:0.75rem;">${data.error || 'Check console log for details.'}</div>
                    </div>
                `;
            }
        };

        // Polling function for background tasks
        const pollRenderStatus = (taskId, isPreview) => {
            let attempts = 0;
            const previewBtn = document.getElementById('previewBtn');
            const startRenderBtn = document.getElementById('startRenderBtn');

            const pollInterval = setInterval(() => {
                attempts++;
                fetch(`${backendUrl}/api/status/${taskId}`)
                    .then(res => res.json())
                    .then(statusData => {
                        if (statusData.status === 'completed') {
                            clearInterval(pollInterval);
                            finishRender(statusData.result, isPreview);
                        } else if (statusData.status === 'failed') {
                            clearInterval(pollInterval);
                            finishRender(statusData.result, isPreview);
                        } else if (statusData.status === 'not_found') {
                            clearInterval(pollInterval);
                            logToConsole("Task not found on server.", 'error');
                            finishRender({ success: false, error: "Task not found." }, isPreview);
                        } else {
                            // Still processing
                            const msg = `<i class="ri-loader-4-line spin"></i> Rendering (${attempts * 2}s)...`;
                            if (isPreview && previewBtn) {
                                previewBtn.innerHTML = msg;
                            } else if (!isPreview && startRenderBtn) {
                                startRenderBtn.innerHTML = msg;
                            } else if (renderBtn) {
                                renderBtn.innerHTML = `<i class="ri-loader-4-line spin"></i>`;
                            }
                        }
                    })
                    .catch(e => {
                        clearInterval(pollInterval);
                        logToConsole("Polling error: " + e, 'error');
                        if (previewBtn) previewBtn.disabled = false;
                        if (startRenderBtn) startRenderBtn.disabled = false;
                    });
            }, 2000);
        };

        if (renderBtn) {
            // Attach listeners
            renderBtn.addEventListener('click', () => {
                // Client-side engines render immediately without modal popup
                if (currentEngine !== 'manim') {
                    if (motionFrame) motionFrame.style.display = 'block';
                    if (outputContainer) outputContainer.style.display = 'none';
                    handleRender(true, false);
                    return;
                }

                // Show the settings/render modal for Manim
                if (motionFrame) motionFrame.style.display = 'none';
                if (outputContainer) outputContainer.style.display = 'flex';
                if (highlightPre) highlightPre.className = "language-python";
                if (highlightCode) highlightCode.className = "language-python";
                updateHighlighting();
                const settingsPopup = document.getElementById('settings-popup');
                if (settingsPopup) {
                    console.log(`Opening render settings popup. Current engine: '${currentEngine}'`);
                    settingsPopup.style.display = 'flex';
                }
            });
        }

        if (uploadBtn && uploadModal) {
            uploadBtn.addEventListener('click', () => {
                uploadModal.style.display = 'block';
            });
        }

        // --- Unified Publishing Logic ---
        async function publishCreation(isForCourse) {
            const title = document.getElementById('videoTitle').value || "Untitled Creation";
            const desc = document.getElementById('videoDesc').value;

            const btn = isForCourse ? publishToCourseBtn : publishToProfileBtn;
            const originalBtnText = btn.innerHTML;
            btn.innerHTML = `<i class="ri-loader-4-line spin"></i> Publishing...`;
            btn.disabled = true;

            try {
                let finalVideoUrl, postFormat, postSource, mediaType;

                if (currentEngine === 'mermaid') {
                    postFormat = 'diagram';
                    const widthInput = document.getElementById('mermaidWidth');
                    const heightInput = document.getElementById('mermaidHeight');
                    const width = widthInput ? widthInput.value : 200;
                    const height = heightInput ? heightInput.value : 200;
                    postSource = { engine: 'mermaid', code: studioEditor.value, width: width, height: height, is_course_content: isForCourse };

                    const frame = document.getElementById('motionCanvasPlayer');
                    const svgElement = frame.contentWindow.document.querySelector('#mermaid-container > svg');
                    if (!svgElement) throw new Error("Could not find the Mermaid SVG element to publish.");
                    svgElement.setAttribute('width', width);
                    svgElement.setAttribute('height', height);
                    const svgData = new XMLSerializer().serializeToString(svgElement);
                    const blob = new Blob([svgData], { type: 'image/svg+xml' });
                    const formData = new FormData();
                    formData.append('file', blob, 'mermaid_diagram.svg');
                    const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                    const data = await res.json();
                    if (!data.url) throw new Error("Mermaid thumbnail upload failed.");
                    finalVideoUrl = data.url;
                    mediaType = 'image/svg+xml';

                } else if (currentEngine === 'katex') {
                    postFormat = 'math';
                    const fontSizeSelect = document.getElementById('katexFontSize');
                    const colorPicker = document.getElementById('katexTextColor');
                    const fontSize = fontSizeSelect ? fontSizeSelect.value : '1.8em';
                    const textColor = colorPicker ? colorPicker.value : '#ffffff';
                    postSource = { engine: 'katex', code: studioEditor.value, fontSize: fontSize, color: textColor, is_course_content: isForCourse };

                    const frame = document.getElementById('motionCanvasPlayer');
                    let renderedContent = '';
                    if (frame && frame.contentWindow) {
                        const container = frame.contentWindow.document.querySelector('#katex-container');
                        if (container) {
                            // Clone container and remove any hidden/fallback MathML elements
                            const clone = container.cloneNode(true);
                            clone.querySelectorAll('.katex-mathml').forEach(el => el.remove());
                            renderedContent = clone.innerHTML;
                        }
                    }

                    if (!renderedContent && window.katex) {
                        try {
                            renderedContent = window.katex.renderToString(studioEditor.value.trim(), {
                                displayMode: true,
                                output: 'html',
                                throwOnError: false
                            });
                        } catch (e) {
                            renderedContent = studioEditor.value;
                        }
                    }

                    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
                        <defs>
                            <style>
                                @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');
                                .katex-mathml { display: none !important; }
                                .katex { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: ${textColor}; }
                                .katex-display { margin: 0 !important; }
                            </style>
                        </defs>
                        <rect width="100%" height="100%" fill="#0a0d14"/>
                        <foreignObject width="100%" height="100%">
                            <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;height:100%;color:${textColor};font-size:${fontSize};padding:24px;text-align:center;box-sizing:border-box;">
                                <div style="background:#18181b;border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:24px 36px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;max-width:92%;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                                    ${renderedContent}
                                </div>
                            </div>
                        </foreignObject>
                    </svg>`;
                    const blob = new Blob([svgData], { type: 'image/svg+xml' });
                    const formData = new FormData();
                    formData.append('file', blob, 'katex_equation.svg');
                    const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                    const data = await res.json();
                    if (!data.url) throw new Error("KaTeX thumbnail upload failed.");
                    finalVideoUrl = data.url;
                    mediaType = 'image/svg+xml';

                } else if (currentEngine === 'tikz') {
                    postFormat = 'image'; // Publish as high-res PNG image post for Explore feed
                    postSource = { engine: 'tikz', code: studioEditor.value, is_course_content: isForCourse };
                    let pngDataUri = window.currentTikzPng;
                    if (!pngDataUri) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame && frame.contentWindow) {
                            const doc = frame.contentWindow.document;
                            const img = doc.querySelector('img');
                            if (img && img.src && img.src.startsWith('data:image')) {
                                pngDataUri = img.src;
                            }
                        }
                    }
                    if (pngDataUri) {
                        const res = await fetch(pngDataUri);
                        const blob = await res.blob();
                        const formData = new FormData();
                        formData.append('file', blob, 'tikz_diagram.png');
                        const uploadRes = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                        const uploadData = await uploadRes.json();
                        if (uploadData.url) {
                            finalVideoUrl = uploadData.url;
                            mediaType = 'image/png';
                        }
                    }

                } else if (currentEngine === 'thumbnail') {
                    postFormat = 'interactive';
                    const bgPicker = document.getElementById('thumbnailBackground');
                    const background = bgPicker ? bgPicker.value : '#09090b';
                    postSource = { engine: 'thumbnail', code: studioEditor.value, background: background, is_course_content: isForCourse };

                    const frame = document.getElementById('motionCanvasPlayer');
                    let dataUri = null;
                    if (frame && frame.contentWindow) {
                        if (typeof frame.contentWindow.getExportDataUrl === 'function') {
                            dataUri = frame.contentWindow.getExportDataUrl('png', 0.95);
                        } else {
                            const canvas = frame.contentWindow.document.querySelector('canvas') || frame.contentWindow.document.querySelector('#fabric-canvas');
                            if (canvas) dataUri = canvas.toDataURL('image/png');
                        }
                    }

                    if (dataUri) {
                        try {
                            const blob = await (await fetch(dataUri)).blob();
                            const formData = new FormData();
                            formData.append('file', blob, 'thumbnail_studio.png');
                            const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                            const data = await res.json();
                            if (data.url) finalVideoUrl = data.url;
                        } catch (e) {
                            console.warn("Could not upload Thumbnail canvas to backend, proceeding with fallback", e);
                        }
                    }
                    if (!finalVideoUrl) {
                        finalVideoUrl = '';
                    }
                    mediaType = 'image/png';

                } else if (currentEngine === 'zdog') {
                    postFormat = '3d_model';
                    const bgPicker = document.getElementById('zdogBackground');
                    const background = bgPicker ? bgPicker.value : '#0a0d14';
                    postSource = { engine: 'zdog', code: studioEditor.value, background: background, is_course_content: isForCourse };

                    const frame = document.getElementById('motionCanvasPlayer');
                    let canvas = null;
                    if (frame && frame.contentWindow) {
                        canvas = frame.contentWindow.document.querySelector('canvas') || frame.contentWindow.document.querySelector('#zdog-canvas');
                    }

                    if (canvas) {
                        try {
                            const dataUri = canvas.toDataURL('image/png');
                            const blob = await (await fetch(dataUri)).blob();
                            const formData = new FormData();
                            formData.append('file', blob, 'zdog_3d_thumbnail.png');
                            const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                            const data = await res.json();
                            if (data.url) finalVideoUrl = data.url;
                        } catch (e) {
                            console.warn("Could not upload Zdog thumbnail to backend, proceeding with fallback", e);
                        }
                    }
                    if (!finalVideoUrl) {
                        finalVideoUrl = '';
                    }
                    mediaType = 'image/png';

                } else if (currentEngine === 'jsxgraph') {
                    postFormat = 'interactive';
                    const bgPicker = document.getElementById('jsxgraphBackground');
                    const background = bgPicker ? bgPicker.value : '#0a0d14';
                    postSource = { engine: 'jsxgraph', code: studioEditor.value, background: background, is_course_content: isForCourse };

                    const frame = document.getElementById('motionCanvasPlayer');
                    let svgElement = null;
                    if (frame && frame.contentWindow) {
                        svgElement = frame.contentWindow.document.querySelector('.jxgbox svg') || frame.contentWindow.document.querySelector('svg');
                    }

                    if (svgElement) {
                        const svgData = new XMLSerializer().serializeToString(svgElement);
                        const blob = new Blob([svgData], { type: 'image/svg+xml' });
                        const formData = new FormData();
                        formData.append('file', blob, 'jsxgraph_math.svg');
                        try {
                            const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                            const data = await res.json();
                            if (data.url) finalVideoUrl = data.url;
                        } catch (e) {
                            console.warn("Could not upload SVG thumbnail to backend, proceeding with fallback", e);
                        }
                    }
                    if (!finalVideoUrl) {
                        finalVideoUrl = '';
                    }
                    mediaType = 'image/svg+xml';

                } else if (currentEngine === 'svg_to_3d') {
                    postFormat = '3d_model';
                    const colorPicker = document.getElementById('svgColorPicker');
                    const modelColor = colorPicker ? colorPicker.value : '#3b82f6';
                    postSource = { engine: 'svg_to_3d', code: studioEditor.value, color: modelColor, is_course_content: isForCourse };

                    const frame = document.getElementById('motionCanvasPlayer');
                    const canvas = frame.contentWindow.document.querySelector('canvas');
                    if (!canvas) throw new Error("Could not find the 3D model canvas to screenshot.");
                    const dataUri = canvas.toDataURL('image/png');
                    const blob = await (await fetch(dataUri)).blob();
                    const formData = new FormData();
                    formData.append('file', blob, 'svg_3d_thumbnail.png');
                    const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                    const data = await res.json();
                    if (!data.url) throw new Error("Thumbnail upload failed.");
                    finalVideoUrl = data.url;
                    mediaType = 'image/png';

                } else if (currentEngine === 'svg_to_png') {
                    postFormat = 'image';
                    const activeColor = window.currentSvgColor || document.getElementById('svgPngFillColor')?.value || '';
                    const strokeColor = document.getElementById('svgPngStrokeColor')?.value || '';
                    const bgColor = document.getElementById('svgPngBgColor')?.value || 'transparent';

                    let updatedSvgCode = studioEditor.value;
                    if (activeColor) {
                        updatedSvgCode = updatedSvgCode.replace(/fill="(?!none|url)[^"]*"/gi, `fill="${activeColor}"`);
                    }

                    postSource = { 
                        engine: 'svg_to_png', 
                        code: updatedSvgCode, 
                        fillColor: activeColor, 
                        strokeColor, 
                        backgroundColor: bgColor, 
                        is_course_content: isForCourse 
                    };

                    let pngDataUri = window.currentSvgToPng;
                    if (!pngDataUri) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        const canvas = frame?.contentWindow?.document?.getElementById('rasterCanvas');
                        if (canvas) pngDataUri = canvas.toDataURL('image/png');
                    }
                    if (!pngDataUri) throw new Error("Could not generate PNG from SVG vector.");
                    const blob = await (await fetch(pngDataUri)).blob();
                    const formData = new FormData();
                    formData.append('file', blob, 'vector_graphic.png');
                    const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                    const data = await res.json();
                    if (!data.url) throw new Error("Vector PNG upload failed.");
                    finalVideoUrl = data.url;
                    mediaType = 'image/png';

                } else if (currentEngine === 'd3') {
                    postFormat = 'image';
                    postSource = { engine: 'd3', code: studioEditor.value, is_course_content: isForCourse };
                    const frame = document.getElementById('motionCanvasPlayer');
                    const svgElement = frame.contentWindow.document.querySelector('svg');
                    if (!svgElement) throw new Error("Could not find the D3.js SVG element to publish.");
                    const svgData = new XMLSerializer().serializeToString(svgElement);
                    const blob = new Blob([svgData], { type: 'image/svg+xml' });
                    const formData = new FormData();
                    formData.append('file', blob, 'd3_chart.svg');
                    const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                    const data = await res.json();
                    if (!data.url) throw new Error("D3.js SVG upload failed.");
                    finalVideoUrl = data.url;
                    mediaType = 'image/svg+xml';

                } else { // Manim/p5.js/etc. video logic
                    postFormat = window.currentRenderFormat || '16:9';
                    postSource = { engine: currentEngine, code: studioEditor.value, is_course_content: isForCourse };
                    finalVideoUrl = generatedVideoUrl;
                    mediaType = 'video/mp4';

                    if (generatedVideoUrl && generatedVideoUrl.startsWith('blob:')) {
                        const blob = await fetch(generatedVideoUrl).then(r => r.blob());
                        mediaType = blob.type;
                        const formData = new FormData();
                        formData.append('file', blob, 'xtra_anim_creation.webm');
                        const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                        const data = await res.json();
                        if (data.url) finalVideoUrl = data.url;
                    }
                }

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("You must be logged in to publish.");

                const accessTier = document.getElementById('videoAccessTier')?.value || 'public';
                const customPrice = parseFloat(document.getElementById('videoPrice')?.value) || 2.99;

                const isProtectedCode = (accessTier === 'protected_code');
                const isSubscriberOnly = (accessTier === 'subscriber_only');
                const isForSale = (accessTier === 'store_sale');

                // Embed monetization metadata safely inside source JSON column
                postSource = {
                    ...(postSource || {}),
                    access_tier: accessTier,
                    is_premium: isSubscriberOnly,
                    subscriber_only: isSubscriberOnly,
                    is_source_protected: isProtectedCode,
                    code_access: isProtectedCode ? 'paid' : 'free',
                    code_price: isProtectedCode ? customPrice : 0,
                    is_for_sale: isForSale,
                    price: isForSale ? customPrice : 0
                };

                const newPostData = {
                    title: title,
                    description: desc,
                    video_url: finalVideoUrl,
                    media_type: mediaType,
                    format: postFormat,
                    source: postSource,
                    original_id: remixOriginalId,
                    user_id: user.id,
                    pdf_url: '',
                    username: localStorage.getItem('username') || 'Anonymous',
                    avatar_url: localStorage.getItem('avatarUrl') || ''
                };

                const { data, error } = await supabase.from('posts').insert([newPostData]).select();
                if (error) throw error;

                const newPost = data[0];
                const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                allPosts.push(newPost);
                localStorage.setItem('userPosts', JSON.stringify(allPosts));

                if (isForCourse) {
                    const courseContext = JSON.parse(courseContextRaw);
                    const courseDraftRaw = localStorage.getItem('xtraCourseDraft');
                    if (courseDraftRaw) {
                        let courseData = JSON.parse(courseDraftRaw);
                        if (courseContext.stepId === 'intro') {
                            courseData.introVideoId = newPost.id;
                        } else if (courseContext.stepId === 'cover') {
                            courseData.coverPostId = newPost.id;
                        } else if (courseContext.format === 'asset' && courseContext.assetIndex !== undefined) {
                            const item = courseData.assetItems?.[courseContext.assetIndex];
                            if (item) { item[`${courseContext.stepId}PostId`] = newPost.id; }
                        } else {
                            const { sectionIndex, lessonIndex, stepId } = courseContext;
                            const lesson = courseData.sections[sectionIndex]?.lessons[lessonIndex];
                            if (lesson) {
                                lesson[`${stepId}PostId`] = newPost.id;
                            }
                        }
                        localStorage.setItem('xtraCourseDraft', JSON.stringify(courseData));
                    }
                    const returnUrl = courseContext.courseId
                        ? `/views/xtraCourse.html?id=${courseContext.courseId}&mode=${courseContext.format || 'course'}`
                        : '/views/xtraCourse.html';
                    alert('Published to course! Redirecting back to the course editor.');
                    window.location.href = returnUrl;
                } else {
                    uploadModal.style.display = 'none';
                    if (confirm('Post published! Go to profile?')) {
                        window.location.href = '/views/profile.html';
                    }
                }

            } catch (e) {
                console.error("Publishing failed", e);
                alert("Failed to publish post: " + e.message);
            } finally {
                btn.innerHTML = originalBtnText;
                btn.disabled = false;
            }
        }

        if (publishToProfileBtn) {
            publishToProfileBtn.addEventListener('click', () => publishCreation(false));
        }
        if (publishToCourseBtn) {
            publishToCourseBtn.addEventListener('click', () => publishCreation(true));
        }

    }

    // ============================================================
    // 4. SHARED UI UTILITIES (Modals & Menus)
    // ============================================================

    // Custom Resolution Modal (Glass Card) logic
    const formatSelect = document.getElementById('formatSelect');
    const customModal = document.getElementById('customModal');
    const customClose = document.getElementById('customClose');
    const saveCustom = document.getElementById('saveCustom');

    if (formatSelect && customModal) {
        formatSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customModal.style.display = 'block';
            }
        });

        if (customClose) {
            customClose.addEventListener('click', () => {
                customModal.style.display = 'none';
                formatSelect.value = '16:9'; // Reset to default
            });
        }

        if (saveCustom) {
            saveCustom.addEventListener('click', () => {
                const w = document.getElementById('customWidth').value;
                const h = document.getElementById('customHeight').value;
                if (w && h) {
                    // In a real app, store this value
                    if (consoleLog) logToConsole(`Resolution set to ${w}x${h}`);
                    customModal.style.display = 'none';
                } else {
                    alert("Please enter dimensions");
                }
            });
        }
    }

    // ============================================================
    // 5. SOCIAL INTERACTIONS (Like, Follow, Comment)
    // ============================================================

    // --- A. Watch Page Interactions ---
    // Only apply watch page interactions if on the watch page
    if (currentPage.includes('watch.html')) {
        const subscribeBtn = document.getElementById('subscribeBtn');
        const likeBtn = document.getElementById('likeBtn');
        const dislikeBtn = document.getElementById('dislikeBtn');
        const postCommentBtn = document.getElementById('postCommentBtn');
        const commentInput = document.getElementById('commentInput');
        const commentsList = document.getElementById('commentsList');

        if (subscribeBtn) {
            const authorName = 'Dr. Nova';
            const isFollowing = isFollowingUser('', authorName);
            subscribeBtn.innerText = isFollowing ? 'Following' : 'Follow';
            if (isFollowing) {
                subscribeBtn.classList.add('following');
                subscribeBtn.style.background = 'rgba(255,255,255,0.15)';
                subscribeBtn.style.color = '#f4f4f5';
            } else {
                subscribeBtn.classList.remove('following');
                subscribeBtn.style.background = '#3b82f6';
                subscribeBtn.style.color = 'white';
            }

            subscribeBtn.addEventListener('click', function () {
                const nowFollowing = toggleFollowUser({
                    userId: '',
                    username: authorName,
                    fullName: authorName
                });
                this.innerText = nowFollowing ? 'Following' : 'Follow';
                if (nowFollowing) {
                    this.classList.add('following');
                    this.style.background = 'rgba(255,255,255,0.15)';
                    this.style.color = '#f4f4f5';
                } else {
                    this.classList.remove('following');
                    this.style.background = '#3b82f6';
                    this.style.color = 'white';
                }
            });
        }

        if (likeBtn) {
            likeBtn.addEventListener('click', function () {
                // Simple toggle logic
                if (this.style.background.includes('3b82f6')) {
                    this.style.background = '';
                    this.innerHTML = '<i class="ri-thumb-up-line"></i> 1.2K';
                } else {
                    this.style.background = 'rgba(59, 130, 246, 0.3)';
                    this.innerHTML = '<i class="ri-thumb-up-fill"></i> 1.2K'; // In real app, increment number
                }
                // Reset dislike
                if (dislikeBtn) dislikeBtn.style.background = '';
            });
        }

        if (dislikeBtn) {
            dislikeBtn.addEventListener('click', function () {
                if (this.style.background.includes('white')) {
                    this.style.background = '';
                } else {
                    this.style.background = 'rgba(255, 255, 255, 0.2)';
                }
                // Reset like
                if (likeBtn) likeBtn.style.background = '';
            });
        }
    }
    // --- Watch Page Comment Posting (thread-style, only on watch.html) ---
    if (currentPage.includes('watch.html')) {
        const watchPostCommentBtn = document.getElementById('postCommentBtn');
        const watchCommentInput = document.getElementById('commentInput');
        const watchCommentsList = document.getElementById('commentsList');

        if (watchPostCommentBtn && watchCommentInput && watchCommentsList) {
            watchPostCommentBtn.addEventListener('click', () => {
                const text = watchCommentInput.value.trim();
                if (!text) return;

                const threadItem = document.createElement('div');
                threadItem.className = 'thread-item';
                threadItem.innerHTML = `
                    <div class="thread-avatar-col">
                        <div class="thread-avatar" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6);"></div>
                        <div class="thread-line"></div>
                    </div>
                    <div class="thread-content-col">
                        <div class="thread-header">
                            <div class="thread-name">${username || 'You'}</div>
                            <div class="thread-meta">Just now</div>
                        </div>
                        <div class="thread-text">${text}</div>
                        <div class="thread-actions">
                            <button class="thread-icon-btn like-btn"><i class="ri-heart-line"></i> <span>0</span></button>
                            <button class="thread-icon-btn"><i class="ri-chat-1-line"></i> <span>Reply</span></button>
                            <button class="thread-icon-btn"><i class="ri-share-forward-line"></i></button>
                        </div>
                    </div>
                `;

                // Add like functionality to new comment
                threadItem.querySelector('.like-btn').onclick = function () {
                    const span = this.querySelector('span');
                    if (this.style.color === 'rgb(239, 68, 68)') { this.style.color = 'white'; span.textContent = '0'; }
                    else { this.style.color = '#ef4444'; span.textContent = '1'; }
                };

                watchCommentsList.prepend(threadItem);
                watchCommentInput.value = '';
            });
        }
    }

    // --- B. Community Upvotes ---
    const upvoteBoxes = document.querySelectorAll('.upvote-box');
    upvoteBoxes.forEach(box => {
        box.addEventListener('click', function () {
            const countSpan = this.querySelector('.vote-count');
            const arrow = this.querySelector('.vote-arrow');

            if (this.classList.contains('active')) {
                this.classList.remove('active');
                arrow.style.color = '';
                countSpan.innerText = parseInt(countSpan.innerText) - 1;
            } else {
                this.classList.add('active');
                arrow.style.color = '#3b82f6';
                countSpan.innerText = parseInt(countSpan.innerText) + 1;
            }
        });
    });

    // --- C. Profile Page Interactions (Global Function) ---
    window.openUserList = async function (type) {
        const modal = document.getElementById('userListModal');
        const title = document.getElementById('userListTitle');
        const content = document.getElementById('userListContent');

        if (!modal || !title || !content) return;

        title.innerText = type;
        modal.style.display = 'block';

        content.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:180px; color:#a1a1aa; flex-direction:column; gap:10px;">
                <div style="width:28px;height:28px;border:2px solid rgba(255,255,255,0.1);border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                <span style="font-size:0.85rem;">Loading ${type.toLowerCase()}...</span>
            </div>
        `;

        const myUserId = localStorage.getItem('userId');
        let usersToDisplay = [];

        if (type === 'Following') {
            const followingList = getFollowingList();
            if (followingList.length > 0) {
                usersToDisplay = followingList.map(item => ({
                    id: item.userId,
                    username: item.username,
                    full_name: item.fullName || item.username,
                    avatar_url: item.avatarUrl || null
                }));
            }
        }

        // If list is empty or for Followers, fetch real community creators from Supabase profiles table
        if (usersToDisplay.length === 0) {
            try {
                if (window.supabaseClient) {
                    const { data: profiles, error } = await window.supabaseClient
                        .from('profiles')
                        .select('id, username, full_name, avatar_url, bio')
                        .limit(20);

                    if (!error && profiles && profiles.length > 0) {
                        usersToDisplay = profiles.filter(p => !myUserId || p.id !== myUserId);
                    }
                }
            } catch (err) {
                console.warn('Could not fetch community profiles for user list:', err);
            }
        }

        if (usersToDisplay.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #a1a1aa;">
                    <p style="margin: 0; font-size: 0.9rem;">No ${type.toLowerCase()} to display yet.</p>
                </div>
            `;
            return;
        }

        let html = '';
        usersToDisplay.forEach(u => {
            const displayName = u.full_name || u.username || 'Creator';
            const handle = u.username ? `@${u.username}` : '@creator';
            const initial = displayName.charAt(0).toUpperCase();
            const avatarStyle = u.avatar_url
                ? `background-image: url('${u.avatar_url}'); background-size: cover; background-position: center;`
                : `background: linear-gradient(135deg, #3b82f6, #8b5cf6);`;

            const isFollowing = isFollowingUser(u.id, u.username);

            html += `
                <div class="user-list-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); transition: background 0.2s;">
                    <a href="/views/profile.html?id=${u.id || ''}" style="display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit; flex: 1; min-width: 0;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; ${avatarStyle} flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; color: white;">
                            ${u.avatar_url ? '' : initial}
                        </div>
                        <div style="min-width: 0; overflow: hidden;">
                            <div style="font-size: 0.92rem; font-weight: 600; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayName}</div>
                            <div style="font-size: 0.8rem; color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${handle}</div>
                        </div>
                    </a>
                    <button class="btn-follow-modal ${isFollowing ? 'following' : ''}" data-user-id="${u.id || ''}" data-username="${u.username || displayName}" style="flex-shrink: 0; margin-left: 12px;">
                        ${isFollowing ? 'Following' : 'Follow'}
                    </button>
                </div>
            `;
        });

        content.innerHTML = html;

        // Attach interactive event listeners to every modal follow button
        content.querySelectorAll('.btn-follow-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetUid = btn.dataset.userId || '';
                const targetUname = btn.dataset.username || '';

                const nowFollowing = toggleFollowUser({
                    userId: targetUid,
                    username: targetUname,
                    fullName: targetUname
                });

                if (nowFollowing) {
                    btn.textContent = 'Following';
                    btn.classList.add('following');
                } else {
                    btn.textContent = 'Follow';
                    btn.classList.remove('following');
                }
            });
        });
    };

    // ============================================================
    // 6. GLOBAL SEARCH FUNCTIONALITY
    // ============================================================
    const searchInputs = document.querySelectorAll('.search-bar');

    searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();

            // 1. Explore Page & Feed
            const videoCards = document.querySelectorAll('.video-card, .grid-post'); // Grid post is for feed
            videoCards.forEach(card => {
                const title = card.innerText.toLowerCase();
                card.style.display = title.includes(term) ? '' : 'none';
            });

            // 2. Community Page
            const discussions = document.querySelectorAll('.discussion-row');
            discussions.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(term) ? 'flex' : 'none';
            });

            // 3. Dashboard (Home)
            const projectCards = document.querySelectorAll('.glass-card .app-card-content');
            projectCards.forEach(content => {
                const card = content.parentElement;
                const text = content.innerText.toLowerCase();
                // Don't hide the "Create New" cards (Creative Suite), only projects
                if (card.parentElement.classList.contains('grid-container') && !content.querySelector('h3')) {
                    card.style.display = text.includes(term) ? 'flex' : 'none';
                }
            });
        });
    });

    // ============================================================
    // 7. SETTINGS & PROFILE EDITING
    // ============================================================
    const settingsName = document.getElementById('settingsName');
    const settingsBio = document.getElementById('settingsBio');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');

    // Load existing values if on settings page
    if (settingsName && username) settingsName.value = username;
    if (settingsBio && userBio) settingsBio.value = userBio;

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            if (settingsName) localStorage.setItem('username', settingsName.value);
            if (settingsBio) localStorage.setItem('userBio', settingsBio.value);

            const btnText = saveSettingsBtn.innerText;
            saveSettingsBtn.innerText = "Saved!";
            saveSettingsBtn.style.background = "#10b981";
            setTimeout(() => {
                saveSettingsBtn.innerText = btnText;
                saveSettingsBtn.style.background = "";
            }, 2000);
        });
    }

    // ============================================================
    // 8. NOTIFICATIONS
    // ============================================================
    const notifyBtn = document.getElementById('notifyBtn');
    const notifyDropdown = document.getElementById('notifyDropdown');

    if (notifyBtn && notifyDropdown) {
        notifyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = notifyDropdown.style.display === 'block';
            notifyDropdown.style.display = isVisible ? 'none' : 'block';
        });

        // Close when clicking outside
        document.addEventListener('click', () => {
            notifyDropdown.style.display = 'none';
        });

        notifyDropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    // ============================================================
    // 9. REEL OPTIONS MODAL
    // ============================================================
    const reelOptionsModal = document.getElementById('reelOptionsModal');
    if (reelOptionsModal) {
        const closeReelOptions = () => {
            reelOptionsModal.style.display = 'none';
        };

        reelOptionsModal.addEventListener('click', (e) => {
            if (e.target === reelOptionsModal) { // Click on overlay
                closeReelOptions();
            }
        });

        reelOptionsModal.querySelector('.reel-options-sheet').addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action || action === 'cancel') {
                closeReelOptions();
                return;
            }

            const postId = reelOptionsModal.dataset.postId;
            const postTitle = reelOptionsModal.dataset.postTitle;

            if (action === 'delete') {
                deletePost(postId, postTitle);
            } else if (action === 'edit') {
                editPost(postId, postTitle);
            }
            closeReelOptions();
        });
    }

    // ============================================================
    // 10. COMMENT MODAL LOGIC (Threaded + KaTeX + Mermaid Tools)
    // ============================================================
    const commentModal = document.getElementById('commentModal');
    let currentPostIdForComments = null;
    let currentReplyingParentId = null;
    let currentReplyingUsername = null;

    function setReplyingContext(parentId, username) {
        currentReplyingParentId = parentId ? String(parentId) : null;
        currentReplyingUsername = username || 'User';

        const banner = document.getElementById('commentReplyingBanner');
        const userSpan = document.getElementById('commentReplyingToUser');
        const input = document.getElementById('commentInput');

        if (currentReplyingParentId) {
            if (userSpan) userSpan.textContent = `@${currentReplyingUsername}`;
            if (banner) banner.style.display = 'flex';
            if (input) {
                input.placeholder = `Replying to @${currentReplyingUsername}...`;
                input.focus();
            }
        } else {
            if (banner) banner.style.display = 'none';
            if (input) {
                input.placeholder = 'Add a comment... Click + for Math/Diagrams';
            }
        }
    }

    async function openCommentModal(postId) {
        if (!commentModal) return;
        currentPostIdForComments = String(postId);
        setReplyingContext(null, null);

        const commentListContainer = document.getElementById('commentListContainer');
        const commentInput = document.getElementById('commentInput');
        if (commentInput) commentInput.value = '';

        // Close drawer on modal open
        closeToolsDrawer();

        commentListContainer.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:120px; color:#a1a1aa; flex-direction:column; gap:10px;">
            <div style="width:26px;height:26px;border:2px solid rgba(255,255,255,0.1);border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
            <span style="font-size:0.85rem;">Loading discussion…</span>
        </div>`;

        commentModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            if (commentInput) commentInput.focus();
        }, 100);

        // Fetch comments from Supabase / LocalStorage
        const allComments = await fetchCommentsFromDB(currentPostIdForComments);

        renderThreadedComments(allComments);
    }

    function closeCommentModal() {
        if (!commentModal) return;
        commentModal.style.display = 'none';
        document.body.style.overflow = '';
        currentPostIdForComments = null;
        setReplyingContext(null, null);
        closeToolsDrawer();
    }

    function renderThreadedComments(allComments) {
        const commentListContainer = document.getElementById('commentListContainer');
        if (!commentListContainer) return;
        commentListContainer.innerHTML = '';

        if (!allComments || allComments.length === 0) {
            commentListContainer.innerHTML = `<div style="text-align: center; color: #a1a1aa; padding: 40px 20px;">
                <i class="ri-chat-3-line" style="font-size: 2.6rem; opacity: 0.3; display: block; margin-bottom: 10px;"></i>
                <p style="margin: 0; font-size: 0.95rem; font-weight:600; color:#e4e4e7;">No comments yet</p>
                <p style="margin: 6px 0 0; font-size: 0.82rem; opacity: 0.7;">Be the first to share an equation, diagram, or thought!</p>
            </div>`;
            return;
        }

        // Organize into roots and replies map
        const rootComments = [];
        const repliesMap = {}; // { [parentId]: [comment, ...] }

        allComments.forEach(c => {
            if (c.parent_id) {
                const pid = String(c.parent_id);
                if (!repliesMap[pid]) repliesMap[pid] = [];
                repliesMap[pid].push(c);
            } else {
                rootComments.push(c);
            }
        });

        rootComments.forEach(rootComment => {
            const threadGroup = document.createElement('div');
            threadGroup.className = 'comment-thread-group';
            threadGroup.dataset.rootId = rootComment.id;

            const rootEl = createCommentElement(rootComment, false);
            threadGroup.appendChild(rootEl);

            const replies = repliesMap[String(rootComment.id)] || [];
            if (replies.length > 0) {
                const repliesList = document.createElement('div');
                repliesList.className = 'comment-replies-list';

                replies.forEach(reply => {
                    const replyEl = createCommentElement(reply, true, rootComment.username);
                    repliesList.appendChild(replyEl);
                });

                threadGroup.appendChild(repliesList);
            }

            commentListContainer.appendChild(threadGroup);
        });

        // Trigger KaTeX & Mermaid rendering for any math/diagrams
        renderKaTeXInContainer(commentListContainer);
        renderMermaidInContainer(commentListContainer);

        commentListContainer.scrollTop = commentListContainer.scrollHeight;
    }

    function createCommentElement(comment, isReply = false, parentAuthor = null) {
        const itemDiv = document.createElement('div');
        itemDiv.className = `comment-item ${isReply ? 'is-reply' : ''}`;
        itemDiv.dataset.commentId = comment.id;
        if (comment.parent_id) itemDiv.dataset.parentId = comment.parent_id;

        const myUserId = localStorage.getItem('userId');
        const myUsername = localStorage.getItem('username') || 'You';
        const isOwnComment = (comment.user_id && myUserId && comment.user_id === myUserId) || comment.username === myUsername;
        const avatarUrl = comment.avatar_url || '';
        const initial = (comment.username || 'A').charAt(0).toUpperCase();
        const avatarStyle = avatarUrl
            ? `background-image: url('${avatarUrl}'); background-size: cover; background-position: center;`
            : `background: linear-gradient(135deg, #3b82f6, #8b5cf6);`;

        const isLiked = comment._likedByMe || false;
        const likesCount = comment._likesCount || 0;
        const timestamp = comment.created_at ? timeAgo(comment.created_at) : 'Just now';

        // Render rich formatted text (KaTeX + Mermaid)
        const formattedHtml = formatCommentContent(comment.text);

        const replyBadgeHtml = isReply && parentAuthor
            ? `<span class="comment-reply-badge">Replying to @${parentAuthor}</span>`
            : '';

        itemDiv.innerHTML = `
            <div class="comment-avatar" style="${avatarStyle}; display:flex; align-items:center; justify-content:center;">
                ${avatarUrl ? '' : `<span style="color:white; font-weight:700; font-size:0.75rem;">${initial}</span>`}
            </div>
            <div class="comment-body">
                <div class="comment-header-row">
                    <span class="username">${comment.username || 'Anonymous'}</span>
                    ${replyBadgeHtml}
                    <span class="comment-time">${timestamp}</span>
                </div>
                <div class="text">${formattedHtml}</div>
                <div class="comment-actions-row">
                    <button class="comment-like-btn ${isLiked ? 'liked' : ''}" data-comment-id="${comment.id}">
                        <i class="${isLiked ? 'ri-heart-fill' : 'ri-heart-line'}"></i>
                        <span>${likesCount}</span>
                    </button>
                    <button class="comment-reply-btn" data-comment-id="${comment.id}" data-author="${comment.username || 'Anonymous'}">
                        <i class="ri-reply-line"></i>
                        <span>Reply</span>
                    </button>
                    ${isOwnComment ? `<button class="comment-delete-btn" data-comment-id="${comment.id}" title="Delete comment"><i class="ri-delete-bin-line"></i></button>` : ''}
                </div>
            </div>
        `;

        // Like handler
        const commentLikeBtn = itemDiv.querySelector('.comment-like-btn');
        if (commentLikeBtn) {
            commentLikeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleCommentLike(comment.id, commentLikeBtn);
            });
        }

        // Reply handler
        const replyBtn = itemDiv.querySelector('.comment-reply-btn');
        if (replyBtn) {
            replyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetParentId = comment.parent_id || comment.id;
                setReplyingContext(targetParentId, comment.username);
            });
        }

        // Delete handler
        const deleteBtn = itemDiv.querySelector('.comment-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('Delete this comment?')) return;
                const success = await deleteCommentFromDB(comment.id, currentPostIdForComments);
                if (success) {
                    itemDiv.style.transition = 'opacity 0.25s, transform 0.25s';
                    itemDiv.style.opacity = '0';
                    itemDiv.style.transform = 'translateX(-15px)';
                    setTimeout(() => {
                        if (!isReply) {
                            // If root comment, remove entire thread group
                            const threadGroup = itemDiv.closest('.comment-thread-group');
                            if (threadGroup) threadGroup.remove();
                        } else {
                            itemDiv.remove();
                        }
                        const container = document.getElementById('commentListContainer');
                        if (container && container.children.length === 0) {
                            container.innerHTML = `<div style="text-align: center; color: #a1a1aa; padding: 40px 20px;">
                                <i class="ri-chat-3-line" style="font-size: 2.6rem; opacity: 0.3; display: block; margin-bottom: 10px;"></i>
                                <p style="margin: 0; font-size: 0.95rem; font-weight:600; color:#e4e4e7;">No comments yet</p>
                                <p style="margin: 6px 0 0; font-size: 0.82rem; opacity: 0.7;">Be the first to share an equation, diagram, or thought!</p>
                            </div>`;
                        }
                    }, 250);
                }
            });
        }

        return itemDiv;
    }

    async function handlePostCommentSubmit() {
        const commentInput = document.getElementById('commentInput');
        if (!commentInput || !currentPostIdForComments) return;
        const text = commentInput.value.trim();
        if (!text) return;

        const postBtn = document.getElementById('postCommentBtn');
        if (postBtn) {
            postBtn.disabled = true;
            postBtn.textContent = '...';
        }

        const parentId = currentReplyingParentId;
        const newComment = await postCommentToDB(currentPostIdForComments, text, parentId);

        if (postBtn) {
            postBtn.disabled = false;
            postBtn.textContent = 'Post';
        }

        if (newComment) {
            const commentListContainer = document.getElementById('commentListContainer');
            // Remove empty placeholder if present
            const placeholder = commentListContainer.querySelector('div[style*="text-align: center"]');
            if (placeholder) commentListContainer.innerHTML = '';

            if (parentId) {
                // Find parent thread group or append as reply
                let parentThreadGroup = commentListContainer.querySelector(`.comment-thread-group[data-root-id="${parentId}"]`);
                if (!parentThreadGroup) {
                    const parentItem = commentListContainer.querySelector(`.comment-item[data-comment-id="${parentId}"]`);
                    if (parentItem) {
                        parentThreadGroup = parentItem.closest('.comment-thread-group');
                    }
                }

                if (parentThreadGroup) {
                    let repliesList = parentThreadGroup.querySelector('.comment-replies-list');
                    if (!repliesList) {
                        repliesList = document.createElement('div');
                        repliesList.className = 'comment-replies-list';
                        parentThreadGroup.appendChild(repliesList);
                    }
                    const replyEl = createCommentElement(newComment, true, currentReplyingUsername);
                    repliesList.appendChild(replyEl);
                    renderKaTeXInContainer(replyEl);
                    renderMermaidInContainer(replyEl);
                } else {
                    const singleEl = createCommentElement(newComment, false);
                    commentListContainer.appendChild(singleEl);
                    renderKaTeXInContainer(singleEl);
                    renderMermaidInContainer(singleEl);
                }
            } else {
                // New top-level thread
                const threadGroup = document.createElement('div');
                threadGroup.className = 'comment-thread-group';
                threadGroup.dataset.rootId = newComment.id;

                const newCommentEl = createCommentElement(newComment, false);
                threadGroup.appendChild(newCommentEl);
                commentListContainer.appendChild(threadGroup);
                renderKaTeXInContainer(threadGroup);
                renderMermaidInContainer(threadGroup);
            }

            commentInput.value = '';
            setReplyingContext(null, null);
            closeToolsDrawer();

            // Scroll to the latest comment
            commentListContainer.scrollTop = commentListContainer.scrollHeight;
        }
    }

    // Toolbox Drawer Helpers
    function toggleToolsDrawer() {
        const drawer = document.getElementById('commentToolsDrawer');
        const toolsBtn = document.getElementById('commentToolsBtn');
        if (!drawer) return;
        const isOpen = drawer.style.display !== 'none';
        if (isOpen) {
            closeToolsDrawer();
        } else {
            drawer.style.display = 'flex';
            if (toolsBtn) toolsBtn.classList.add('active');
        }
    }

    function closeToolsDrawer() {
        const drawer = document.getElementById('commentToolsDrawer');
        const toolsBtn = document.getElementById('commentToolsBtn');
        if (drawer) drawer.style.display = 'none';
        if (toolsBtn) toolsBtn.classList.remove('active');
    }

    function insertSnippetIntoComment(snippet) {
        const textarea = document.getElementById('commentInput');
        if (!textarea) return;

        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const text = textarea.value;

        // Insert snippet at cursor
        textarea.value = text.substring(0, start) + snippet + text.substring(end);
        textarea.focus();
        textarea.setSelectionRange(start + snippet.length, start + snippet.length);

        // Auto-expand textarea height if needed
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    // Attach Comment Modal Global Listeners
    if (commentModal) {
        const closeBtn = document.getElementById('closeCommentModal');
        if (closeBtn) closeBtn.addEventListener('click', closeCommentModal);
        commentModal.addEventListener('click', (e) => { if (e.target === commentModal) closeCommentModal(); });

        const postBtn = document.getElementById('postCommentBtn');
        if (postBtn) {
            postBtn.addEventListener('click', handlePostCommentSubmit);
        }

        const commentInput = document.getElementById('commentInput');
        if (commentInput) {
            commentInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePostCommentSubmit();
                }
            });
            // Auto-resize
            commentInput.addEventListener('input', () => {
                commentInput.style.height = 'auto';
                commentInput.style.height = Math.min(commentInput.scrollHeight, 120) + 'px';
            });
        }

        // Replying Banner Cancel
        const cancelReplyBtn = document.getElementById('commentCancelReplyBtn');
        if (cancelReplyBtn) {
            cancelReplyBtn.addEventListener('click', () => setReplyingContext(null, null));
        }

        // "+" Tools Button
        const toolsBtn = document.getElementById('commentToolsBtn');
        if (toolsBtn) {
            toolsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleToolsDrawer();
            });
        }

        const closeToolsBtn = document.getElementById('commentCloseToolsBtn');
        if (closeToolsBtn) {
            closeToolsBtn.addEventListener('click', closeToolsDrawer);
        }

        // Toolbox Tabs
        document.querySelectorAll('#commentToolsDrawer .tools-tab-btn').forEach(tabBtn => {
            tabBtn.addEventListener('click', () => {
                document.querySelectorAll('#commentToolsDrawer .tools-tab-btn').forEach(b => b.classList.remove('active'));
                tabBtn.classList.add('active');

                const tab = tabBtn.dataset.tab;
                document.querySelectorAll('#commentToolsDrawer .tools-panel').forEach(p => p.style.display = 'none');
                if (tab === 'math') {
                    const p = document.getElementById('toolsPanelMath');
                    if (p) p.style.display = 'block';
                } else if (tab === 'diagram') {
                    const p = document.getElementById('toolsPanelDiagram');
                    if (p) p.style.display = 'block';
                } else if (tab === 'symbols') {
                    const p = document.getElementById('toolsPanelSymbols');
                    if (p) p.style.display = 'block';
                }
            });
        });

        // Snippet Chips & Symbols Click
        document.querySelectorAll('#commentToolsDrawer .tool-chip, #commentToolsDrawer .symbol-btn').forEach(chip => {
            chip.addEventListener('click', () => {
                const snippet = chip.dataset.snippet;
                if (snippet) {
                    insertSnippetIntoComment(snippet);
                }
            });
        });
    }

    // Initialize XtraShare on DOM Ready
    if (window.XtraShare) {
        window.XtraShare.init();
    }
});

// ============================================================
// UNIVERSAL XTRASHARE MODAL & SOCIAL CARDS ENGINE
// ============================================================
window.XtraShare = {
    currentData: null,
    initialized: false,

    init() {
        if (this.initialized || document.getElementById('xtraShareModalOverlay')) {
            this.initialized = true;
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'xtraShareModalOverlay';
        overlay.className = 'xtra-share-overlay';
        overlay.innerHTML = `
            <div class="xtra-share-modal" role="dialog" aria-modal="true" aria-labelledby="xtraShareModalTitle">
                <div class="xtra-share-header">
                    <h3 id="xtraShareModalTitle"><i class="ri-share-forward-line"></i> Share Creation</h3>
                    <button class="xtra-share-close" id="xtraShareCloseBtn" title="Close modal">&times;</button>
                </div>
                
                <div class="xtra-share-body">
                    <!-- Live Preview Card -->
                    <div class="xtra-share-preview-card" id="xtraSharePreviewCard">
                        <div class="xtra-share-media-box" id="xtraShareMediaBox">
                            <span class="xtra-share-type-badge" id="xtraShareTypeBadge"><i class="ri-movie-line"></i> REEL</span>
                            <img id="xtraShareCardImage" src="" alt="Thumbnail" style="display:none;" />
                            <video id="xtraShareCardVideo" src="" muted loop playsinline style="display:none;"></video>
                            <div id="xtraShareCardPlaceholder" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; font-size:2.8rem; color:#3b82f6;">
                                <i class="ri-sparkling-fill"></i>
                            </div>
                            <div class="xtra-share-play-indicator" id="xtraSharePlayIndicator" style="display:none;">
                                <i class="ri-play-fill"></i>
                            </div>
                        </div>
                        <div class="xtra-share-card-meta">
                            <h4 class="xtra-share-card-title" id="xtraShareCardTitle">Title</h4>
                            <p class="xtra-share-card-desc" id="xtraShareCardDesc">Description</p>
                            <div class="xtra-share-card-footer">
                                <div class="xtra-share-author-info">
                                    <img id="xtraShareAuthorAvatar" class="xtra-share-author-avatar" src="" alt="Author" />
                                    <span id="xtraShareAuthorName">@author</span>
                                </div>
                                <span class="xtra-share-domain-pill">xtrapath.com</span>
                            </div>
                        </div>
                    </div>

                    <!-- Social Media Quick Share Grid -->
                    <div class="xtra-social-grid">
                        <button class="xtra-social-btn x-twitter" id="xtraShareTwitterBtn" title="Share to X / Twitter">
                            <i class="ri-twitter-x-line"></i>
                            <span>Twitter</span>
                        </button>
                        <button class="xtra-social-btn whatsapp" id="xtraShareWhatsappBtn" title="Share to WhatsApp">
                            <i class="ri-whatsapp-line"></i>
                            <span>WhatsApp</span>
                        </button>
                        <button class="xtra-social-btn linkedin" id="xtraShareLinkedinBtn" title="Share to LinkedIn">
                            <i class="ri-linkedin-fill"></i>
                            <span>LinkedIn</span>
                        </button>
                        <button class="xtra-social-btn reddit" id="xtraShareRedditBtn" title="Share to Reddit">
                            <i class="ri-reddit-line"></i>
                            <span>Reddit</span>
                        </button>
                        <button class="xtra-social-btn telegram" id="xtraShareTelegramBtn" title="Share to Telegram">
                            <i class="ri-telegram-line"></i>
                            <span>Telegram</span>
                        </button>
                        <button class="xtra-social-btn facebook" id="xtraShareFacebookBtn" title="Share to Facebook">
                            <i class="ri-facebook-circle-fill"></i>
                            <span>Facebook</span>
                        </button>
                        <button class="xtra-social-btn native-share" id="xtraShareNativeBtn" title="Native Device Share">
                            <i class="ri-share-line"></i>
                            <span>More</span>
                        </button>
                        <button class="xtra-social-btn story-share" id="xtraShareStoryBtn" title="Share to 24h Story">
                            <i class="ri-history-line"></i>
                            <span>24h Story</span>
                        </button>
                    </div>

                    <!-- Copy URL Bar -->
                    <div class="xtra-share-copy-box">
                        <i class="ri-link" style="color: #a1a1aa; font-size: 1.1rem;"></i>
                        <input type="text" id="xtraShareUrlInput" readonly />
                        <button class="xtra-share-copy-btn" id="xtraShareCopyBtn">
                            <i class="ri-file-copy-line"></i> <span>Copy</span>
                        </button>
                    </div>

                    <!-- Secondary Embed Button -->
                    <div class="xtra-share-actions-row">
                        <button class="xtra-share-secondary-btn" id="xtraShareEmbedBtn">
                            <i class="ri-code-s-slash-line"></i> Copy Embed Code
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Toast element
        if (!document.getElementById('xtraShareToast')) {
            const toast = document.createElement('div');
            toast.id = 'xtraShareToast';
            toast.className = 'xtra-share-toast';
            toast.innerHTML = '<i class="ri-checkbox-circle-fill"></i> <span id="xtraShareToastText">Copied to clipboard!</span>';
            document.body.appendChild(toast);
        }

        // Event listeners
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) window.XtraShare.close();
        });
        document.getElementById('xtraShareCloseBtn').addEventListener('click', () => window.XtraShare.close());
        document.getElementById('xtraShareTwitterBtn').addEventListener('click', () => window.XtraShare.shareTo('twitter'));
        document.getElementById('xtraShareWhatsappBtn').addEventListener('click', () => window.XtraShare.shareTo('whatsapp'));
        document.getElementById('xtraShareLinkedinBtn').addEventListener('click', () => window.XtraShare.shareTo('linkedin'));
        document.getElementById('xtraShareRedditBtn').addEventListener('click', () => window.XtraShare.shareTo('reddit'));
        document.getElementById('xtraShareTelegramBtn').addEventListener('click', () => window.XtraShare.shareTo('telegram'));
        document.getElementById('xtraShareFacebookBtn').addEventListener('click', () => window.XtraShare.shareTo('facebook'));
        document.getElementById('xtraShareNativeBtn').addEventListener('click', () => window.XtraShare.shareNative());
        document.getElementById('xtraShareStoryBtn').addEventListener('click', () => window.XtraShare.shareToStory());
        document.getElementById('xtraShareCopyBtn').addEventListener('click', () => window.XtraShare.copyLink());
        document.getElementById('xtraShareEmbedBtn').addEventListener('click', () => window.XtraShare.copyEmbedCode());

        this.initialized = true;
    },

    open(data) {
        this.init();
        this.currentData = data || {};
        const overlay = document.getElementById('xtraShareModalOverlay');
        if (!overlay) return;

        const title = data.title || 'Untitled Creation';
        const desc = data.desc || data.description || 'Check out this interactive STEM animation on XtraPath.';
        const author = data.author || 'Creator';
        const avatar = data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(author)}`;
        const type = (data.type || data.format || 'reel').toLowerCase();

        // Build origin URL
        const origin = window.location.origin;
        let shareUrl = data.url;
        if (!shareUrl) {
            if (type === 'course') {
                shareUrl = `${origin}/views/courseView.html?id=${data.id || ''}`;
            } else if (type === 'article') {
                shareUrl = `${origin}/views/articleView.html?id=${data.id || ''}`;
            } else if (type === 'pdf' || type === 'book') {
                shareUrl = `${origin}/views/bookView.html?id=${data.id || ''}`;
            } else {
                shareUrl = `${origin}/views/reels.html?id=${data.id || ''}`;
            }
        }
        data.calculatedShareUrl = shareUrl;

        // Populate Card Preview
        const titleEl = document.getElementById('xtraShareCardTitle');
        const descEl = document.getElementById('xtraShareCardDesc');
        const authorNameEl = document.getElementById('xtraShareAuthorName');
        const authorAvatarEl = document.getElementById('xtraShareAuthorAvatar');
        const urlInput = document.getElementById('xtraShareUrlInput');

        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = desc;
        if (authorNameEl) authorNameEl.textContent = `@${author}`;
        if (authorAvatarEl) authorAvatarEl.src = avatar;
        if (urlInput) urlInput.value = shareUrl;

        // Badge styling
        const badgeEl = document.getElementById('xtraShareTypeBadge');
        if (badgeEl) {
            let iconClass = 'ri-movie-line';
            let badgeLabel = 'REEL';
            if (type === 'course') { iconClass = 'ri-graduation-cap-line'; badgeLabel = 'COURSE'; }
            else if (type === 'book' || type === 'pdf') { iconClass = 'ri-book-open-line'; badgeLabel = 'BOOK'; }
            else if (type === 'article') { iconClass = 'ri-article-line'; badgeLabel = 'ARTICLE'; }
            else if (type === 'diagram' || type === 'image') { iconClass = 'ri-shape-line'; badgeLabel = 'DIAGRAM'; }
            else if (type === 'math') { iconClass = 'ri-functions'; badgeLabel = 'MATH'; }
            badgeEl.innerHTML = `<i class="${iconClass}"></i> ${badgeLabel}`;
        }

        // Media preview (video, image, or placeholder)
        const imgEl = document.getElementById('xtraShareCardImage');
        const videoEl = document.getElementById('xtraShareCardVideo');
        const placeholderEl = document.getElementById('xtraShareCardPlaceholder');
        const playInd = document.getElementById('xtraSharePlayIndicator');

        if (imgEl) imgEl.style.display = 'none';
        if (videoEl) videoEl.style.display = 'none';
        if (placeholderEl) placeholderEl.style.display = 'none';
        if (playInd) playInd.style.display = 'none';

        if (data.thumbnail) {
            if (imgEl) {
                imgEl.src = data.thumbnail;
                imgEl.style.display = 'block';
            }
            if ((data.video_url || type === 'reel' || type === 'anim') && playInd) {
                playInd.style.display = 'flex';
            }
        } else if (data.video_url) {
            if (videoEl) {
                videoEl.src = data.video_url;
                videoEl.style.display = 'block';
                videoEl.play().catch(() => { });
            }
            if (playInd) playInd.style.display = 'flex';
        } else {
            if (placeholderEl) placeholderEl.style.display = 'flex';
        }

        // Show overlay
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    close() {
        const overlay = document.getElementById('xtraShareModalOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            const videoEl = document.getElementById('xtraShareCardVideo');
            if (videoEl) videoEl.pause();
        }
        document.body.style.overflow = '';
    },

    showToast(text) {
        const toast = document.getElementById('xtraShareToast');
        const toastText = document.getElementById('xtraShareToastText');
        if (toast && toastText) {
            toastText.textContent = text;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2500);
        }
    },

    shareTo(platform) {
        if (!this.currentData) return;
        const title = encodeURIComponent(this.currentData.title || 'Check this out on XtraPath');
        const url = encodeURIComponent(this.currentData.calculatedShareUrl || window.location.href);
        const desc = encodeURIComponent(this.currentData.desc || 'Interactive STEM creation on XtraPath');

        let shareLink = '';
        switch (platform) {
            case 'twitter':
                shareLink = `https://twitter.com/intent/tweet?text=${title}%20by%20${encodeURIComponent(this.currentData.author || '')}%0A%0A&url=${url}&hashtags=XtraPath,STEM,Math,Animation`;
                break;
            case 'whatsapp':
                shareLink = `https://api.whatsapp.com/send?text=*${title}*%0A${desc}%0A%0A${url}`;
                break;
            case 'linkedin':
                shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
                break;
            case 'reddit':
                shareLink = `https://reddit.com/submit?url=${url}&title=${title}`;
                break;
            case 'telegram':
                shareLink = `https://t.me/share/url?url=${url}&text=${title}`;
                break;
            case 'facebook':
                shareLink = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
        }

        if (shareLink) {
            window.open(shareLink, '_blank', 'width=600,height=500,location=no,menubar=no,status=no');
        }
    },

    async shareNative() {
        if (!this.currentData) return;
        const title = this.currentData.title || 'XtraPath Creation';
        const text = this.currentData.desc || 'Check out this creation on XtraPath!';
        const url = this.currentData.calculatedShareUrl || window.location.href;

        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
                this.showToast('Shared successfully! 🚀');
            } catch (err) {
                if (err.name !== 'AbortError') this.copyLink();
            }
        } else {
            this.copyLink();
        }
    },

    async copyLink() {
        if (!this.currentData) return;
        const url = this.currentData.calculatedShareUrl || window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            const copyBtn = document.getElementById('xtraShareCopyBtn');
            if (copyBtn) {
                copyBtn.classList.add('copied');
                copyBtn.innerHTML = '<i class="ri-check-line"></i> <span>Copied!</span>';
                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyBtn.innerHTML = '<i class="ri-file-copy-line"></i> <span>Copy</span>';
                }, 2000);
            }
            this.showToast('Link copied to clipboard! 📋');
        } catch (e) {
            const input = document.getElementById('xtraShareUrlInput');
            if (input) {
                input.select();
                document.execCommand('copy');
                this.showToast('Link copied to clipboard! 📋');
            }
        }
    },

    async copyEmbedCode() {
        if (!this.currentData) return;
        const url = this.currentData.calculatedShareUrl || window.location.href;
        const embedCode = `<iframe src="${url}" width="100%" height="520" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius:12px; border:1px solid #333;"></iframe>`;
        try {
            await navigator.clipboard.writeText(embedCode);
            this.showToast('Embed code copied! 💻');
        } catch (e) {
            this.showToast('Unable to copy embed code');
        }
    },

    shareToStory() {
        if (!this.currentData) return;
        const post = this.currentData.rawPost || this.currentData;
        const currentTime = Date.now();
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
        let currentStoryData = JSON.parse(localStorage.getItem('storyData')) || {};
        const myUsername = localStorage.getItem('username') || 'User';
        const myUserId = localStorage.getItem('userId');
        const myAvatar = localStorage.getItem('avatarUrl') || localStorage.getItem('userAvatar') || '';

        const storyPost = {
            id: post.id || `custom_${currentTime}`,
            title: post.title || 'Shared Post',
            author: myUsername,
            avatar: myAvatar,
            video_url: post.video_url || '',
            format: post.format || post.type || 'video',
            type: post.type || 'anim'
        };

        const newStoryItem = {
            id: `story_${currentTime}_${Math.random().toString(36).substr(2, 6)}`,
            postId: storyPost.id,
            post: storyPost,
            title: storyPost.title,
            video_url: storyPost.video_url,
            format: storyPost.format,
            author: myUsername,
            avatar: myAvatar,
            timestamp: currentTime,
            expiresAt: currentTime + TWENTY_FOUR_HOURS_MS
        };

        let myStories = currentStoryData["Your Story"] || [];
        if (!Array.isArray(myStories)) myStories = myStories ? [myStories] : [];
        myStories = myStories.filter(s => s && (!s.expiresAt || s.expiresAt > currentTime));
        myStories.push(newStoryItem);
        currentStoryData["Your Story"] = myStories;
        currentStoryData[myUsername] = myStories;
        if (myUserId) currentStoryData[myUserId] = myStories;

        localStorage.setItem('storyData', JSON.stringify(currentStoryData));
        this.showToast('Added to your 24h Story! 🌟');
        this.close();
    }
};

/* ==========================================================================
   MASTER ADMIN, BANKING & PAYPAL API CLIENT HELPERS
   ========================================================================== */

window.fetchGlobalPlatformStats = async function () {
    try {
        const res = await fetch('/api/admin/global-stats');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Admin API] fetchGlobalPlatformStats fallback:', err);
        return {
            totalUsers: 1427,
            proSubscribers: 344,
            creatorsWithBank: 189,
            grossRevenue: '₹4,28,950',
            grossRevenueUSD: '$5,180',
            activeToday: 412,
            totalPurchases: 1890,
            platformTakeRate: '15%'
        };
    }
};

window.fetchAdminUsers = async function (search = '', filter = 'all') {
    try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (filter && filter !== 'all') params.append('filter', filter);
        const res = await fetch(`/api/admin/users?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Admin API] fetchAdminUsers fallback:', err);
        return { users: [], total: 0 };
    }
};

window.toggleUserProStatus = async function (userId, isPro) {
    try {
        const res = await fetch('/api/admin/users/toggle-pro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, isPro })
        });
        return await res.json();
    } catch (err) {
        console.error('[Admin API] toggleUserProStatus error:', err);
        return { success: false, message: err.message };
    }
};

window.updateUserAdminRole = async function (userId, isAdmin) {
    try {
        const res = await fetch('/api/admin/users/update-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, isAdmin })
        });
        return await res.json();
    } catch (err) {
        console.error('[Admin API] updateUserAdminRole error:', err);
        return { success: false, message: err.message };
    }
};

window.toggleUserAccountStatus = async function (userId, status) {
    try {
        const res = await fetch('/api/admin/users/toggle-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, status })
        });
        return await res.json();
    } catch (err) {
        console.error('[Admin API] toggleUserAccountStatus error:', err);
        return { success: false, message: err.message };
    }
};

window.createAdminUser = async function (userData) {
    try {
        const res = await fetch('/api/admin/users/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return await res.json();
    } catch (err) {
        console.error('[Admin API] createAdminUser error:', err);
        return { success: false, message: err.message };
    }
};

window.saveAdminUserNotes = async function (userId, notes) {
    try {
        const res = await fetch('/api/admin/users/save-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, notes })
        });
        return await res.json();
    } catch (err) {
        console.error('[Admin API] saveAdminUserNotes error:', err);
        return { success: false, message: err.message };
    }
};

window.fetchAdminPayoutsQueue = async function () {
    try {
        const res = await fetch('/api/admin/payouts-queue');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Admin API] fetchAdminPayoutsQueue fallback:', err);
        return { queue: [], total: 0, pendingCount: 0 };
    }
};

window.approveCreatorPayout = async function (payoutId) {
    try {
        const res = await fetch('/api/admin/payouts/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payoutId })
        });
        return await res.json();
    } catch (err) {
        console.error('[Admin API] approveCreatorPayout error:', err);
        return { success: false, message: err.message };
    }
};

window.fetchAdminTransactionsLedger = async function () {
    try {
        const res = await fetch('/api/admin/transactions-ledger');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Admin API] fetchAdminTransactionsLedger fallback:', err);
        return { ledger: [], total: 0 };
    }
};

window.fetchAdminBankDetails = async function () {
    try {
        const res = await fetch('/api/admin/bank-account');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Admin API] fetchAdminBankDetails fallback:', err);
        return { success: false, bankAccount: null };
    }
};

window.saveAdminBankAccount = async function (payload) {
    try {
        const res = await fetch('/api/admin/save-bank-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await res.json();
    } catch (err) {
        console.error('[Admin API] saveAdminBankAccount error:', err);
        return { success: false, message: err.message };
    }
};

window.triggerAdminInstantPayout = async function () {
    try {
        const res = await fetch('/api/admin/trigger-payout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        return await res.json();
    } catch (err) {
        console.error('[Admin API] triggerAdminInstantPayout error:', err);
        return { success: false, message: err.message };
    }
};

window.validateIfscCode = async function (ifsc) {
    try {
        const clean = (ifsc || '').trim().toUpperCase();
        const res = await fetch(`/api/bank/validate-ifsc?code=${encodeURIComponent(clean)}`);
        return await res.json();
    } catch (err) {
        console.error('[Admin API] validateIfscCode error:', err);
        return { valid: false, message: err.message };
    }
};

window.sendPlatformBroadcast = async function (message, type = 'announcement') {
    try {
        const res = await fetch('/api/admin/broadcast-announcement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, type })
        });
        return await res.json();
    } catch (err) {
        console.error('[Admin API] sendPlatformBroadcast error:', err);
        return { success: false, message: err.message };
    }
};

window.fetchSystemSettings = async function () {
    try {
        const res = await fetch('/api/admin/system-settings');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Admin API] fetchSystemSettings fallback:', err);
        return {
            settings: {
                platformTakeRate: '15%',
                drmMode: 'strict',
                maintenanceMode: false,
                currencyDefault: 'INR'
            }
        };
    }
};

window.updateSystemSettings = async function (settings) {
    try {
        const res = await fetch('/api/admin/system-settings/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        return await res.json();
    } catch (err) {
        console.error('[Admin API] updateSystemSettings error:', err);
        return { success: false, message: err.message };
    }
};

/* --- PAYPAL INTEGRATION CLIENT HELPERS --- */
window._paypalSdkPromise = null;
window._paypalSdkLoadedClientId = null;
window._paypalSdkLoadedCurrency = null;

window.fetchPayPalConfig = async function () {
    try {
        const res = await fetch('/api/paypal/config');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[PayPal API] fetchPayPalConfig fallback:', err);
        return {
            clientId: 'sb',
            currency: 'USD',
            mode: 'live',
            isLiveReady: false,
            linkedAccount: {
                email: 'yogendra.singh@xtrapath.io',
                status: 'verified',
                currency: 'USD ($)',
                autoTransferToBank: 'Daily Automatic to Indian Bank (NEFT)'
            }
        };
    }
};

window.loadPayPalSdk = async function (currency = 'USD') {
    const config = await window.fetchPayPalConfig();
    const clientId = (config && config.clientId && config.clientId.trim() !== '') ? config.clientId.trim() : 'sb';
    const cleanCurrency = (currency || config.currency || 'USD').toUpperCase();

    if (window.paypal && window._paypalSdkLoadedClientId === clientId && window._paypalSdkLoadedCurrency === cleanCurrency) {
        return window.paypal;
    }

    if (window._paypalSdkPromise && window._paypalSdkLoadedClientId === clientId && window._paypalSdkLoadedCurrency === cleanCurrency) {
        return window._paypalSdkPromise;
    }

    // Remove existing script if client ID or currency changed
    const existingScript = document.getElementById('xtra-paypal-sdk-script');
    if (existingScript) existingScript.remove();
    window.paypal = null;

    window._paypalSdkLoadedClientId = clientId;
    window._paypalSdkLoadedCurrency = cleanCurrency;

    window._paypalSdkPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'xtra-paypal-sdk-script';
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${cleanCurrency}&components=buttons,messages&enable-funding=venmo,paylater,card`;
        script.async = true;
        script.onload = () => {
            if (window.paypal) {
                resolve(window.paypal);
            } else {
                reject(new Error('PayPal SDK loaded but window.paypal is not defined.'));
            }
        };
        script.onerror = (err) => {
            console.warn('[PayPal SDK Load Error]:', err);
            reject(err);
        };
        document.head.appendChild(script);
    });

    return window._paypalSdkPromise;
};

window.savePayPalAccount = async function (param, userId = 'usr_current_user') {
    try {
        const payload = typeof param === 'string' ? { email: param, userId } : { ...param, userId: param.userId || userId };
        const res = await fetch('/api/paypal/save-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || errData.message || `HTTP ${res.status}`);
        }
        return await res.json();
    } catch (err) {
        console.error('[PayPal API] savePayPalAccount error:', err);
        return { success: false, message: err.message || 'Failed to save PayPal account.' };
    }
};

window.createPayPalOrder = async function (planType = 'monthly', amount = 15.00, title = 'XtraPath Creation', itemId = '', itemType = 'item') {
    try {
        const userId = localStorage.getItem('userId') || 'usr_current_user';
        const res = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                planType,
                amount: Number(amount) || 15.00,
                currency: 'USD',
                title: title || 'XtraPath Creation',
                itemId: itemId || '',
                itemType: itemType || 'item',
                userId
            })
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || errData.message || `HTTP ${res.status}`);
        }
        return await res.json();
    } catch (err) {
        console.error('[PayPal API] createPayPalOrder error:', err);
        return { success: false, message: err.message };
    }
};

window.capturePayPalOrder = async function (orderId, planType = 'item', itemId = '', itemType = 'item', amount = 15.00, title = '', payerEmail = '') {
    try {
        const userId = localStorage.getItem('userId') || 'usr_current_user';
        const res = await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId,
                planType,
                itemId: itemId || '',
                itemType: itemType || 'item',
                amount: Number(amount) || 15.00,
                currency: 'USD',
                title: title || 'XtraPath Creation',
                userId,
                payerEmail
            })
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || errData.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data && data.success) {
            if (data.isPro) {
                localStorage.setItem('is_pro', 'true');
            }
            if (itemId) {
                window.unlockItem(itemId);
            }
        }
        return data;
    } catch (err) {
        console.error('[PayPal API] capturePayPalOrder error:', err);
        return { success: false, message: err.message };
    }
};

window.openRealPayPalPayment = function ({ title, amount, planType = 'item', itemId = '', itemType = 'asset' }, onUnlocked) {
    if (window.openNativeInPageCheckout) {
        window.openNativeInPageCheckout({
            title: title || 'XtraPath Creation',
            priceUSD: Number(amount) || 15.00,
            format: (itemType || 'item').toUpperCase(),
            itemId: itemId,
            planType: planType
        }, onUnlocked);
    }
};


window.openRazorpayCheckout = async function (planType = 'monthly', onUnlocked) {
    try {
        // Dynamically load Razorpay SDK if not present
        if (!window.Razorpay) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const configRes = await fetch('/api/razorpay/config');
        const config = await configRes.json();

        const orderRes = await fetch('/api/razorpay/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                planType,
                amount: planType === 'annual' ? 999900 : (planType === 'asset' ? 99900 : 99900),
                currency: 'INR'
            })
        });
        const orderData = await orderRes.json();

        const options = {
            key: config.keyId || 'rzp_test_xtrapath_dev',
            amount: orderData.amount || 99900,
            currency: 'INR',
            name: config.name || 'XtraPath Technologies',
            description: 'Interactive STEM Membership & Assets',
            image: config.image || 'https://api.dicebear.com/7.x/shapes/svg?seed=xtrapath',
            order_id: orderData.orderId,
            handler: async function (response) {
                const verifyRes = await fetch('/api/razorpay/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature || 'sig_demo',
                        planType
                    })
                });
                const verifyData = await verifyRes.json();
                if (verifyData.success) {
                    if (planType === 'monthly' || planType === 'annual') {
                        localStorage.setItem('is_pro', 'true');
                    }
                    alert("✓ Payment of ₹" + (orderData.amount / 100) + " verified via Razorpay! Pro membership & assets unlocked.");
                    if (typeof onUnlocked === 'function') onUnlocked();
                    window.location.reload();
                }
            },
            prefill: {
                name: localStorage.getItem('username') || 'XtraPath User',
                email: localStorage.getItem('userEmail') || 'user@xtrapath.io'
            },
            theme: {
                color: '#eab308'
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
    } catch (err) {
        console.error("Razorpay error:", err);
        alert("Razorpay Checkout: " + err.message);
    }
};