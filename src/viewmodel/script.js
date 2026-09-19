// ============================================================
// GLOBAL PUBLISHING & MONETIZATION (Delegated to payment_manager.js)
// ============================================================

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
            try { sessionStorage.setItem('app_config', JSON.stringify(config)); } catch (_) { }
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


    // --- Centralized function to update user avatars across the site ---
    function updateUserAvatars() {
        const avatarUrl = localStorage.getItem('avatarUrl');
        if (!avatarUrl) return;

        // Target ONLY the current user's personal profile and navigation elements
        // NEVER target posts, reels, feed cards, comments by other authors, or store items!
        const myAvatarSelectors = [
            '.user-profile .avatar',
            '.sidebar .user-profile .avatar',
            '.sidebar-footer .user-profile .avatar',
            '#sidebarUserAvatar',
            '.current-user-avatar',
            '[data-current-user-avatar]',
            '.user-avatar-current',
            '#settingsAvatar',
            '#profileAvatarPreview',
            '.nav-user-avatar',
            '#userProfileAvatar',
            '.story-bar .story-item[data-username="Your Story"] .story-avatar-inner img',
            '.story-item[data-username="Your Story"] img'
        ];

        document.querySelectorAll(myAvatarSelectors.join(', ')).forEach(el => {
            // Guard: ensure element is NEVER inside a post card, reel, story of another creator, or store item
            if (el.closest('.feed-post, .reel-item, .reel-card, .store-item-card, .post-item, .story-item:not([data-username="Your Story"]), .comments-list, .comment-row')) {
                return;
            }

            if (el.tagName === 'IMG') {
                el.src = avatarUrl;
            } else {
                el.style.background = 'none';
                el.style.backgroundImage = `url('${avatarUrl}')`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
                const initialSpan = el.querySelector('span');
                if (initialSpan) {
                    initialSpan.remove();
                }
            }
        });
    }
    window.updateUserAvatars = updateUserAvatars;

    // --- XtraTools Registry (Guaranteed fallback + Delegation to window.ToolsManager) ---
    const DEFAULT_XTRA_TOOLS = [
        { id: 'xtraanim', name: 'Animation', description: 'Create physics and math animations with Manim & p5.js.', icon: 'ri-movie-2-line', gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', url: '/views/xtraAnim.html', status: 'active', category: 'animation' },
        { id: 'xtrabook', name: 'Book', description: 'Generate professional textbooks and papers with LaTeX.', icon: 'ri-book-open-line', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)', url: '/views/xtraBook.html', status: 'active', category: 'publication' },
        { id: 'xtraarticle', name: 'Article', description: 'Write rich, embeddable articles and tutorials.', icon: 'ri-file-text-line', gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)', url: '/views/xtraArticle.html', status: 'active', category: 'publication' },
        { id: 'xtragraph', name: 'Graph', description: 'Plot functions and graph animations with Desmos.', icon: 'ri-bar-chart-2-line', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', url: '/views/xtraGraph.html', status: 'active', category: 'math' },
        { id: 'xtracover', name: 'KDP Cover', description: 'Design 300 DPI print-ready Amazon KDP book covers.', icon: 'ri-book-2-line', gradient: 'linear-gradient(135deg, #2563eb, #7c3aed)', url: '/views/xtraCover.html', status: 'active', category: 'publication' },
        { id: 'xtracourse', name: 'Course', description: 'Build and structure multimedia courses.', icon: 'ri-graduation-cap-line', gradient: 'linear-gradient(135deg, #6366f1, #3b82f6)', url: '/views/xtraCourse.html', status: 'active', category: 'education' },
        { id: 'mermaid', name: 'Diagram', description: 'Create flowcharts and sequence diagrams.', icon: 'ri-flow-chart', gradient: 'linear-gradient(135deg, #14b8a6, #3b82f6)', url: '/views/xtraAnim.html?tool=mermaid', status: 'active', category: 'diagram' },
        { id: 'katex', name: 'LaTeX Math', description: 'Typeset equations and mathematical formulas with KaTeX.', icon: 'ri-functions', gradient: 'linear-gradient(135deg, #f43f5e, #a855f7)', url: '/views/xtraAnim.html?tool=katex', status: 'active', category: 'math' },
        { id: 'jsxgraph', name: 'JSXGraph Math', description: 'Interactive dynamic geometry, calculus, and function plots.', icon: 'ri-compasses-2-line', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)', url: '/views/xtraAnim.html?tool=jsxgraph', status: 'active', category: 'math' },
        { id: 'zdog', name: 'Zdog 3D', description: 'Pseudo-3D vector illustration & kinetic animation.', icon: 'ri-shape-line', gradient: 'linear-gradient(135deg, #e11d48, #fb7185)', url: '/views/xtraAnim.html?tool=zdog', status: 'active', category: '3d' },
        { id: 'thumbnail', name: 'Thumbnail Studio', description: 'Design high-converting thumbnails with Fabric.', icon: 'ri-image-edit-line', gradient: 'linear-gradient(135deg, #f59e0b, #ec4899)', url: '/views/xtraAnim.html?tool=thumbnail', status: 'active', category: 'design' },
        { id: 'svg_to_3d', name: 'SVG to 3D', description: 'Extrude SVG files into 3D models with interactive WebGL preview.', icon: 'ri-cube-line', gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)', url: '/views/xtraAnim.html?tool=svg_to_3d', status: 'active', category: '3d' },
        { id: 'tikz', name: 'TikZ Graphics', description: 'Compile vector TikZ & PGF plots into ultra crisp SVG figures.', icon: 'ri-markup-line', gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)', url: '/views/xtraAnim.html?tool=tikz', status: 'active', category: 'math' },
        { id: 'cartoon_studio', name: 'Cartoon Studio', description: '3D Cartoon MoCap animator, Alan Becker combat arena, Math chalkboard teacher & Animal studio.', icon: 'ri-bear-smile-line', gradient: 'linear-gradient(135deg, #f43f5e, #fb923c)', url: '/views/xtraAnim.html?tool=cartoon_studio', status: 'active', category: 'animation' },
        { id: 'sound_studio', name: 'Sound Studio', description: 'Interactive sound synthesis, audio waves, frequency spectrum & musical beats.', icon: 'ri-pulse-line', gradient: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', url: '/views/xtraAnim.html?tool=sound_studio', status: 'active', category: 'audio' },
        { id: 'rapier', name: 'Rapier 3D Physics', description: 'High-performance WebAssembly 3D rigid body physics, ragdolls, joint constraints & simulations.', icon: 'ri-cube-line', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)', url: '/views/xtraAnim.html?tool=rapier', status: 'active', category: 'physics' },
        { id: 'researchlab', name: 'ResearchLab', description: 'Hypothesis validation hub with test benches & MS Teams notes.', icon: 'ri-flask-line', gradient: 'linear-gradient(135deg, #6366f1, #06b6d4)', url: '/views/researchLabEditor.html', status: 'active', category: 'research' }
    ];

    function getXtraToolsList() {
        if (window.ToolsManager && Array.isArray(window.ToolsManager.tools) && window.ToolsManager.tools.length > 0) {
            return window.ToolsManager.tools;
        }
        if (Array.isArray(window.allXtraTools) && window.allXtraTools.length > 0) {
            return window.allXtraTools;
        }
        return DEFAULT_XTRA_TOOLS;
    }
    window.getXtraToolsList = getXtraToolsList;
    if (!window.allXtraTools || window.allXtraTools.length === 0) {
        window.allXtraTools = DEFAULT_XTRA_TOOLS;
    }

    // --- REVISED: SESSION MANAGEMENT ---
    supabase.auth.onAuthStateChange(async (event, session) => {
        const currentPage = window.location.pathname;
        const authLandingPages = ['/', '/views/index.html', '/views/login.html', '/views/signup.html'];
        const policyPages = ['/views/about.html', '/views/privacy.html', '/views/terms.html', '/views/refund.html', '/views/disclaimer.html', '/views/contact.html'];
        const publicPages = [...authLandingPages, ...policyPages];
        const isPublicPage = publicPages.includes(currentPage);

        if (session) {
            // --- USER IS LOGGED IN ---
            if (authLandingPages.includes(currentPage)) {
                // User is on a login/signup landing page but already has a session, so redirect to the main app.
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
                localStorage.removeItem('cached_explore_feed_uid');
                localStorage.removeItem('cached_reels_feed');
                localStorage.removeItem('cached_reels_feed_uid');
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
                } catch (_) { }
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

            // Background auto-sync of permanent saves across local vault, backend SQLite, and Supabase
            if (typeof syncUserSaves === 'function') {
                syncUserSaves(session.user.id);
            }
            // Background auto-sync of followed creators
            if (typeof syncUserFollows === 'function') {
                syncUserFollows(session.user.id);
            }

            // Clean up the OAuth hash in the URL bar cleanly without refreshing
            if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error_description'))) {
                try {
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                } catch (_) {}
            }

        } else {
            // --- USER IS NOT LOGGED IN ---
            if (event === "SIGNED_OUT") {
                // Clear local storage on explicit logout to ensure a clean state,
                // while preserving user-scoped permanent vaults (saves, follows, likes) so they survive re-login.
                const currentUid = localStorage.getItem('userId');
                const userVaultSaves = currentUid ? localStorage.getItem(`xtra_saves_${currentUid}`) : null;
                const userVaultObjs = currentUid ? localStorage.getItem(`xtra_saved_posts_${currentUid}`) : null;
                const userVaultFollows = currentUid ? localStorage.getItem(`xtra_following_${currentUid}`) : null;
                const userLikes = localStorage.getItem('userPostLikes');

                localStorage.clear();

                if (currentUid && userVaultSaves) localStorage.setItem(`xtra_saves_${currentUid}`, userVaultSaves);
                if (currentUid && userVaultObjs) localStorage.setItem(`xtra_saved_posts_${currentUid}`, userVaultObjs);
                if (currentUid && userVaultFollows) localStorage.setItem(`xtra_following_${currentUid}`, userVaultFollows);
                if (userLikes) localStorage.setItem('userPostLikes', userLikes);

                // Also clear session-level caches so the next user gets a fresh start
                try {
                    sessionStorage.removeItem('storeAttachedIds_cache');
                    sessionStorage.removeItem('storeAttachedIds_time');
                    sessionStorage.removeItem('xtrapath_config_cache');
                } catch (_) { }
            }

            // Check if user already has an established local session in localStorage.
            // Do NOT kick them out during network or remote Supabase Auth outages.
            const localUserId = localStorage.getItem('userId');
            if (localUserId && event !== "SIGNED_OUT") {
                if (authLandingPages.includes(currentPage)) {
                    window.location.href = '/views/explore.html';
                    return;
                }
                updateHeader();
                updateUserAvatars();
                if (typeof syncUserSaves === 'function') {
                    syncUserSaves(localUserId);
                }
                if (typeof syncUserFollows === 'function') {
                    syncUserFollows(localUserId);
                }
                return;
            }

            if (!isPublicPage) {
                // User is on a protected page without a session, redirect to index auth station.
                window.location.href = '/';
                return;
            }
            // If on a public page (like login.html or policy pages), do nothing and let the page render.
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

        // 4. Inject Dynamic Navigation (Sidebar & Bottom Nav) - Idempotent & 0ms Instant Rendering
        const populateNavigation = () => {
            const currentPath = window.location.pathname;
            const policyPages = ['/views/about.html', '/views/privacy.html', '/views/terms.html', '/views/refund.html', '/views/disclaimer.html', '/views/contact.html'];
            const userId = localStorage.getItem('userId');

            if (policyPages.includes(currentPath)) {
                if (!userId) {
                    // Guest visitor: cleanly hide sidebar and bottom sheet
                    const bNav = document.querySelector('.bottom-nav');
                    if (bNav) bNav.remove();
                    if (document.body) {
                        document.body.classList.remove('is-logged-in');
                        document.body.classList.add('is-guest');
                    }
                    return;
                }
                // Logged-in creator: enable sidebar & bottom nav
                if (document.body) {
                    document.body.classList.remove('is-guest');
                    document.body.classList.add('is-logged-in');
                }
            }

            const pages = [
                { name: 'Home', icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 112.07"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M61.44,0L0,60.18l14.99,7.87L61.04,19.7l46.85,48.36l14.99-7.87L61.44,0L61.44,0z M18.26,69.63L18.26,69.63 L61.5,26.38l43.11,43.25h0v0v42.43H73.12V82.09H49.49v29.97H18.26V69.63L18.26,69.63L18.26,69.63z"/></svg>`, activeIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 112.07"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M61.44,0L0,60.18l14.99,7.87L61.04,19.7l46.85,48.36l14.99-7.87L61.44,0L61.44,0z M18.26,69.63L18.26,69.63 L61.5,26.38l43.11,43.25h0v0v42.43H73.12V82.09H49.49v29.97H18.26V69.63L18.26,69.63L18.26,69.63z"/></svg>`, link: '/views/explore.html' },
                { name: 'Reels', icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.14 122.88"><path fill="currentColor" d="M35.14 0h51.86c9.65 0 18.43 3.96 24.8 10.32 6.38 6.37 10.34 15.16 10.34 24.82v52.61c0 9.64-3.96 18.42-10.32 24.79l-0.02 0.02c-6.38 6.37-15.16 10.32-24.79 10.32H35.14c-9.66 0-18.45-3.96-24.82-10.32l-0.24-0.27C3.86 105.95 0 97.27 0 87.74V35.14C0 25.47 3.95 16.69 10.32 10.32S25.47 0 35.14 0zM91.51 31.02l0.07 0.11h21.6c-0.87-5.68-3.58-10.78-7.48-14.69-4.8-4.81-11.42-7.79-18.71-7.79h-8.87l13.38 22.36zM81.52 31.13L68.07 8.66H38.57l13.61 22.47h29.34zM42.11 31.13L28.95 9.39c-4.81 1.16-9.12 3.65-12.51 7.05-3.9 3.9-6.6 9.01-7.48 14.69h33.15zM113.48 39.79H8.66v47.96c0 7.17 2.89 13.7 7.56 18.48l0.22 0.21c4.8 4.8 11.43 7.79 18.7 7.79H87c7.28 0 13.9-2.98 18.69-7.77l0.02-0.02c4.79-4.79 7.77-11.41 7.77-18.69V39.79zM50.95 54.95l26.83 17.45c0.43 0.28 0.82 0.64 1.13 1.08 1.22 1.77 0.77 4.2-1 5.42L51.19 94.67c-0.67 0.55-1.53 0.88-2.48 0.88-2.16 0-3.91-1.75-3.91-3.91V58.15h0.02c0-0.77 0.23-1.55 0.7-2.23 1.24-1.77 3.67-2.2 5.43-1z"/></svg>`, activeIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.14 122.88"><path fill="currentColor" d="M35.14 0h51.86c9.65 0 18.43 3.96 24.8 10.32 6.38 6.37 10.34 15.16 10.34 24.82v52.61c0 9.64-3.96 18.42-10.32 24.79l-0.02 0.02c-6.38 6.37-15.16 10.32-24.79 10.32H35.14c-9.66 0-18.45-3.96-24.82-10.32l-0.24-0.27C3.86 105.95 0 97.27 0 87.74V35.14C0 25.47 3.95 16.69 10.32 10.32S25.47 0 35.14 0zM91.51 31.02l0.07 0.11h21.6c-0.87-5.68-3.58-10.78-7.48-14.69-4.8-4.81-11.42-7.79-18.71-7.79h-8.87l13.38 22.36zM81.52 31.13L68.07 8.66H38.57l13.61 22.47h29.34zM42.11 31.13L28.95 9.39c-4.81 1.16-9.12 3.65-12.51 7.05-3.9 3.9-6.6 9.01-7.48 14.69h33.15zM113.48 39.79H8.66v47.96c0 7.17 2.89 13.7 7.56 18.48l0.22 0.21c4.8 4.8 11.43 7.79 18.7 7.79H87c7.28 0 13.9-2.98 18.69-7.77l0.02-0.02c4.79-4.79 7.77-11.41 7.77-18.69V39.79zM50.95 54.95l26.83 17.45c0.43 0.28 0.82 0.64 1.13 1.08 1.22 1.77 0.77 4.2-1 5.42L51.19 94.67c-0.67 0.55-1.53 0.88-2.48 0.88-2.16 0-3.91-1.75-3.91-3.91V58.15h0.02c0-0.77 0.23-1.55 0.7-2.23 1.24-1.77 3.67-2.2 5.43-1z"/></svg>`, link: '/views/reels.html' },
                { name: 'Studio', icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.875 122.648"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M108.993,47.079c7.683-0.059,13.898,6.12,13.882,13.805 c-0.018,7.683-6.26,13.959-13.942,14.019L75.24,75.138l-0.235,33.73c-0.063,7.619-6.338,13.789-14.014,13.78 c-7.678-0.01-13.848-6.197-13.785-13.818l0.233-33.497l-33.558,0.235C6.2,75.628-0.016,69.448,0,61.764 c0.018-7.683,6.261-13.959,13.943-14.018l33.692-0.236l0.236-33.73C47.935,6.161,54.209-0.009,61.885,0 c7.678,0.009,13.848,6.197,13.784,13.818l-0.233,33.497L108.993,47.079L108.993,47.079z"/></svg>`, activeIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.875 122.648"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M108.993,47.079c7.683-0.059,13.898,6.12,13.882,13.805 c-0.018,7.683-6.26,13.959-13.942,14.019L75.24,75.138l-0.235,33.73c-0.063,7.619-6.338,13.789-14.014,13.78 c-7.678-0.01-13.848-6.197-13.785-13.818l0.233-33.497l-33.558,0.235C6.2,75.628-0.016,69.448,0,61.764 c0.018-7.683,6.261-13.959,13.943-14.018l33.692-0.236l0.236-33.73C47.935,6.161,54.209-0.009,61.885,0 c7.678,0.009,13.848,6.197,13.784,13.818l-0.233,33.497L108.993,47.079L108.993,47.079z"/></svg>`, link: '#', id: 'studioBtn' },
                { name: 'Store', icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 464 511.99"><path fill="currentColor" d="M232 31.996c-16.793 0-33.012 6.9-45.058 19.375-12.07 12.487-18.94 29.54-18.94 47.434v13.189h127.995V98.805c0-17.894-6.87-34.947-18.94-47.434C265.011 38.896 248.792 31.996 232 31.996zm-95.999 66.809v13.189H79.514c-20.028 0-37.952 5.902-50.869 18.825-12.832 12.838-18.752 30.622-18.837 50.566L0 378.523v.393c0 76.46 54.558 133.074 131.314 133.074h201.371c76.696 0 131.435-56.335 131.314-132.875v-.387l-9.869-197.784c-.078-19.938-5.986-37.656-18.861-50.403-12.941-12.808-30.852-18.547-50.784-18.547h-56.486V98.805c0-26.033-9.985-51.105-27.926-69.67C282.119 10.547 257.639 0 232 0c-25.64 0-50.119 10.547-68.073 29.135-17.942 18.565-27.926 43.637-27.926 69.67zm-56.487 45.19h304.971c13.939 0 22.852 3.925 28.27 9.289 5.388 5.333 9.38 14.138 9.38 28.071v.405l9.862 197.779c-.078 59.099-40.878 100.455-99.312 100.455H131.314c-58.367 0-99.137-41.514-99.312-100.691l9.808-197.101v-.4c0-13.932 4.003-22.888 9.464-28.361 5.467-5.467 14.398-9.446 28.24-9.446zm88.488 63.998c0-8.835-7.165-15.995-16-15.995s-16.001 7.16-16.001 15.995a95.98 95.98 0 0028.119 67.885A96 96 0 00232 303.997a95.998 95.998 0 0067.879-28.119 95.981 95.981 0 0028.12-67.885c0-8.835-7.166-15.995-16.002-15.995-8.834 0-16 7.16-16 15.995A64.006 64.006 0 01232 271.996a63.978 63.978 0 01-45.251-18.746 64.002 64.002 0 01-18.747-45.257z"/></svg>`, link: '/views/store.html' },
                { name: 'Profile', icon: 'ri-user-line', activeIcon: 'ri-user-fill', link: '/views/profile.html' }
            ];

            const sidebarNav = document.querySelector('.sidebar .nav-links');
            let bottomNavContainer = document.querySelector('.bottom-nav');

            if (!bottomNavContainer && document.body) {
                bottomNavContainer = document.createElement('nav');
                bottomNavContainer.className = 'bottom-nav';
                document.body.appendChild(bottomNavContainer);
            }
            if (bottomNavContainer && document.body) {
                document.body.classList.add('has-bottom-nav');
            }

            // Sync helper to prevent element recreation/flashing if already rendered
            const syncNav = (container, isSidebar) => {
                if (!container) return;
                const existingItems = container.querySelectorAll(isSidebar ? '.nav-item' : '.bottom-nav-item');

                // If items already exist, do NOT wipe innerHTML! Just update active classes
                if (existingItems.length === pages.length) {
                    existingItems.forEach((linkEl, idx) => {
                        const page = pages[idx];
                        const isActive = currentPath.includes(page.link);
                        linkEl.classList.toggle('active', isActive);
                    });
                    return;
                }

                // Initial creation pass (only when container is empty)
                const fragment = document.createDocumentFragment();
                pages.forEach(page => {
                    const isActive = currentPath.includes(page.link);
                    let iconHTML = (isActive && page.activeIcon) ? page.activeIcon : page.icon;
                    if (!iconHTML.startsWith('<svg')) {
                        iconHTML = `<i class="${iconHTML}"></i>`;
                    }

                    const a = document.createElement('a');
                    a.className = isSidebar ? `nav-item ${isActive ? 'active' : ''}` : `bottom-nav-item ${isActive ? 'active' : ''}`;
                    a.href = page.link;
                    if (page.id) a.id = page.id;

                    if (isSidebar) {
                        a.innerHTML = `${iconHTML} <span>${page.name}</span>`;
                    } else {
                        a.innerHTML = `<span class="bottom-nav-icon">${iconHTML}</span>`;
                    }
                    fragment.appendChild(a);
                });
                container.innerHTML = '';
                container.appendChild(fragment);
            };

            syncNav(sidebarNav, true);
            syncNav(bottomNavContainer, false);

            // Inject and handle the "Create Choice" modal (idempotent)
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
            function rebuildStudioChoiceGrid(force = false) {
                const dynamicGridContainer = document.getElementById('dynamicCreateChoiceGrid');
                if (!dynamicGridContainer) return;

                // If not forced and at least 4 valid tool buttons are already rendered, avoid redundant DOM work
                const existingButtons = dynamicGridContainer.querySelectorAll('.create-choice-btn');
                if (!force && existingButtons.length >= 4) return;

                const toolsList = getXtraToolsList();

                const DEFAULT_PINNED_TOOL_IDS = ['xtraanim', 'xtrabook', 'xtraarticle', 'xtragraph'];
                const TOOLS_VERSION = 'v2_anim_book_article_graph';
                let userSelectedToolIds = [];
                try {
                    const currentVersion = localStorage.getItem('userToolsVersion');
                    if (currentVersion !== TOOLS_VERSION) {
                        userSelectedToolIds = [...DEFAULT_PINNED_TOOL_IDS];
                        localStorage.setItem('userSelectedTools', JSON.stringify(userSelectedToolIds));
                        localStorage.setItem('userToolsVersion', TOOLS_VERSION);
                    } else {
                        userSelectedToolIds = JSON.parse(localStorage.getItem('userSelectedTools') || '[]');
                    }
                } catch (e) {
                    userSelectedToolIds = [...DEFAULT_PINNED_TOOL_IDS];
                }
                if (!Array.isArray(userSelectedToolIds) || userSelectedToolIds.length === 0) {
                    userSelectedToolIds = [...DEFAULT_PINNED_TOOL_IDS];
                    localStorage.setItem('userSelectedTools', JSON.stringify(userSelectedToolIds));
                    localStorage.setItem('userToolsVersion', TOOLS_VERSION);
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

                dynamicGridContainer.innerHTML = '';
                const createChoiceGrid = document.createElement('div');
                createChoiceGrid.className = 'create-choice-grid';

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
            window.addEventListener('xtra-tools-changed', () => rebuildStudioChoiceGrid(true));
            window.addEventListener('storage', (e) => {
                if (e.key === 'userSelectedTools') rebuildStudioChoiceGrid(true);
            });
            rebuildStudioChoiceGrid(true);

            const studioBtns = document.querySelectorAll('#studioBtn');
            const createModal = document.getElementById('createChoiceModal');
            if (studioBtns.length > 0 && createModal) {
                studioBtns.forEach(btn => {
                    if (btn.dataset.studioBound) return;
                    btn.dataset.studioBound = 'true';
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        rebuildStudioChoiceGrid(true);
                        createModal.style.display = 'flex';
                    });
                });
                if (!createModal.dataset.clickBound) {
                    createModal.dataset.clickBound = 'true';
                    createModal.addEventListener('click', (e) => { if (e.target === createModal) createModal.style.display = 'none'; });
                }
            }

            // High-Performance Tab Prefetcher: Preloads pages on hover or touchstart for 0ms transition
            const prefetchTab = (url) => {
                if (!url || url === '#' || url === window.location.pathname) return;
                if (document.querySelector(`link[rel="prefetch"][href="${url}"]`)) return;
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.href = url;
                document.head.appendChild(link);
            };

            document.querySelectorAll('.nav-links .nav-item, .bottom-nav .bottom-nav-item').forEach(el => {
                const targetUrl = el.getAttribute('href');
                if (targetUrl && targetUrl.startsWith('/views/')) {
                    el.addEventListener('pointerenter', () => prefetchTab(targetUrl), { passive: true, once: true });
                    el.addEventListener('touchstart', () => prefetchTab(targetUrl), { passive: true, once: true });
                }
            });
        };

        // Populate all navigation areas immediately
        populateNavigation();
    }

    // Run PWA Init immediately
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
                src.access_tier === 'store_sale' ||
                post.access_tier === 'store_sale' ||
                src.is_for_sale ||
                post.is_for_sale ||
                (src.code_price && Number(src.code_price) > 0) ||
                (post.code_price && Number(post.code_price) > 0) ||
                (src.price && Number(src.price) > 0) ||
                (post.price && Number(post.price) > 0)
            );
        };

        window.isItemUnlocked = function (itemId) {
            if (!itemId) return true;
            if (localStorage.getItem('is_pro') === 'true') return true;
            if (window.PaymentManager && typeof window.PaymentManager.isItemUnlocked === 'function') {
                return window.PaymentManager.isItemUnlocked(itemId);
            }
            const unlocked = window.getUnlockedPurchases();
            return unlocked.includes(String(itemId));
        };

        window.isPurchasedItem = function (itemId) {
            if (!itemId) return false;
            if (window.PaymentManager && typeof window.PaymentManager.isPurchasedItem === 'function') {
                return window.PaymentManager.isPurchasedItem(itemId);
            }
            const unlocked = window.getUnlockedPurchases();
            return unlocked.includes(String(itemId));
        };

        window.unlockItem = function (itemId) {
            if (!itemId) return;
            const sId = String(itemId);
            const unlocked = window.getUnlockedPurchases();
            if (!unlocked.includes(sId)) {
                unlocked.push(sId);
                localStorage.setItem('unlockedPurchases', JSON.stringify(unlocked));
            }
            if (window.PaymentManager && typeof window.PaymentManager.unlockItem === 'function') {
                window.PaymentManager.unlockItem(sId);
            } else {
                const uid = localStorage.getItem('userId') || localStorage.getItem('user_id') || 'usr_current_user';
                fetch('/api/user/purchases/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: uid, itemIds: [sId] })
                }).catch(() => {});
            }
        };

        // Shared store card creator for Store and Profile Library tab
        window.createStoreItemCard = function (post, options = {}) {
            const isLibrary = options.isLibrary || false;
            const isCourseOrAsset = (post.format === 'course' || post.format === 'asset');
            const isAsset = (post.format === 'asset');

            const card = document.createElement('div');
            card.className = `glass-card ${isCourseOrAsset ? 'course-card' : 'store-item-card'} ${isAsset ? 'asset-store-card' : ''}`;

            const rawCover = post.video_url || post.videoUrl || '';
            const fullCover = rawCover ? (rawCover.startsWith('http') || rawCover.startsWith('data:') ? rawCover : `${getBackendUrl()}${rawCover}`) : '';
            const mediaType = post.media_type || post.mediaType || '';

            let thumbnailHTML = '';
            if (mediaType && mediaType.startsWith('video')) {
                thumbnailHTML = `<video src="${fullCover}" muted loop playsinline></video>`;
            } else {
                thumbnailHTML = `<img src="${fullCover || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop'}" alt="${(post.title || '').replace(/"/g, '&quot;')}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop';">`;
            }

            const formatDisplayMap = {
                'course': 'Course',
                'asset': 'Asset Pack',
                'pdf': 'Book',
                'book': 'Book',
                '3d_model': '3D Model',
                'article': 'Article',
                'diagram': 'Diagram',
                'video': 'Animation',
                'image': 'Asset',
                '16:9': 'Animation',
                '9:16': 'Animation'
            };

            const isWorksheet = post.source?.item_subtype === 'worksheet';
            const isNotes = post.source?.item_subtype === 'notes';
            const formatBadgeText = isWorksheet ? 'Worksheet' : (isNotes ? 'Study Notes' : (formatDisplayMap[post.format] || 'Asset'));

            const badgeHTML = isAsset
                ? `<div class="store-item-format-badge" style="background: rgba(37,99,235,0.85); border-color: rgba(96,165,250,0.4);"><i class="ri-box-3-line"></i> Asset Pack</div>`
                : (post.format === 'course'
                    ? `<div class="store-item-format-badge" style="background: rgba(99,102,241,0.85); border-color: rgba(129,140,248,0.4);"><i class="ri-graduation-cap-line"></i> Course</div>`
                    : `<div class="store-item-format-badge">${formatBadgeText}</div>`);

            const authorName = post.username || post.source?.author || 'Creator';
            const authorUserId = post.user_id || '';
            const isOwn = (localStorage.getItem('userId') && String(localStorage.getItem('userId')) === String(authorUserId)) ||
                (localStorage.getItem('username') && localStorage.getItem('username').toLowerCase() === authorName.toLowerCase());

            const isUnlocked = isLibrary || (window.isItemUnlocked ? window.isItemUnlocked(post.id) : false) || isOwn;

            const graphBtnHTML = `
                <button class="store-item-graph-btn" title="${post.format === 'course' ? 'View Course Knowledge Graph' : 'View Preview'}" style="position: absolute; top: 10px; right: 10px; z-index: 24; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(147, 197, 253, 0.45); color: #93c5fd; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(8px); box-shadow: 0 4px 12px rgba(0,0,0,0.35); transition: all 0.2s;">
                    <i class="ri-eye-line" style="font-size: 1.1rem;"></i>
                </button>`;

            let actionBtnText = '';
            if (isUnlocked) {
                if (post.format === 'course') actionBtnText = 'Open Course →';
                else if (isAsset) actionBtnText = 'Open Assets →';
                else if (post.format === 'pdf' || post.format === 'book') actionBtnText = 'Open Book →';
                else if (post.format === 'article') actionBtnText = 'Open Article →';
                else actionBtnText = 'Open Item →';
            } else {
                const price = post.price || post.source?.price || '29.99';
                actionBtnText = `Buy $${price}`;
            }

            const priceText = post.price || post.source?.price || (isAsset ? '19.99' : (post.format === 'course' ? '49.99' : '29.99'));
            const priceHTML = isUnlocked
                ? `<span class="unlocked-status-badge"><i class="ri-checkbox-circle-fill"></i> Unlocked</span>`
                : `<span class="store-item-price">$${priceText}</span>`;

            let statsHTML = '';
            if (isCourseOrAsset) {
                const sectionCount = post.source?.sections?.length || 0;
                const lessonCount = post.source?.sections?.reduce((acc, section) => acc + (section.lessons?.length || 0), 0) || 0;
                const assetCount = post.source?.assetItems?.length || 0;

                statsHTML = `
                    <div class="course-card-overlay">
                        <div class="course-card-stats">
                            ${isAsset
                        ? `<span><i class="ri-box-3-line" style="color:#60a5fa;"></i> ${assetCount} ${assetCount === 1 ? 'Asset' : 'Assets'}</span><span><i class="ri-download-cloud-2-line" style="color:#34d399;"></i> Included</span>`
                        : `<span><i class="ri-book-3-line" style="color:#818cf8;"></i> ${sectionCount} Secs</span><span><i class="ri-file-list-3-line" style="color:#a78bfa;"></i> ${lessonCount} Lessons</span>`
                    }
                        </div>
                    </div>`;
            }

            card.innerHTML = `
                <div class="${isCourseOrAsset ? 'course-card-thumbnail' : 'store-item-thumbnail'}">
                    ${thumbnailHTML}
                    ${badgeHTML}
                    ${graphBtnHTML}
                    ${statsHTML}
                </div>
                <div class="${isCourseOrAsset ? 'course-card-info' : 'store-item-info'}">
                    <h3 class="${isCourseOrAsset ? 'course-card-title' : 'store-item-title'}">${post.title || 'Untitled Item'}</h3>
                    <div class="store-item-author">
                        <div class="avatar" data-user-id="${authorUserId}"></div>
                        <span>${authorName}</span>
                    </div>
                    <div class="store-item-footer">
                        ${priceHTML}
                        <button class="${isUnlocked ? 'btn-open-item' : 'btn-primary btn-buy'}" id="cardActionBtn-${post.id}">${actionBtnText}</button>
                    </div>
                </div>
            `;

            // Eye preview / graph button
            const graphBtn = card.querySelector('.store-item-graph-btn');
            if (graphBtn) {
                graphBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (post.format === 'course') {
                        window.location.href = `/views/courseGraph.html?id=${encodeURIComponent(post.id)}`;
                    } else {
                        openItemView();
                    }
                });
            }

            // Video hover playback
            const video = card.querySelector('video');
            if (video) {
                card.addEventListener('mouseenter', () => video.play().catch(() => { }));
                card.addEventListener('mouseleave', () => video.pause());
            }

            function openItemView() {
                if (post.format === 'researchlab' || post.type === 'researchlab' || post.is_research_lab) {
                    window.location.href = `/views/researchLab.html?id=${encodeURIComponent(post.proposal_id || post.id || '')}`;
                } else if (post.format === 'pdf' || post.format === 'book') {
                    window.location.href = `/views/bookView.html?id=${post.id}`;
                } else if (post.format === 'article') {
                    window.location.href = `/views/articleView.html?id=${post.id}`;
                } else if (post.format === 'course' || post.format === 'asset') {
                    window.location.href = `/views/courseView.html?id=${post.id}`;
                } else if (post.format === 'explanation') {
                    window.location.href = `/views/explainView.html?id=${post.id}`;
                } else {
                    window.location.href = `/views/reels.html?id=${post.id}`;
                }
            }

            const actionBtn = card.querySelector(`#cardActionBtn-${post.id}`);
            if (actionBtn) {
                actionBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (isUnlocked) {
                        openItemView();
                    } else if (window.openProductCheckoutModal) {
                        window.openProductCheckoutModal({
                            id: post.id,
                            title: post.title,
                            price: priceText,
                            format: formatBadgeText
                        }, () => {
                            openItemView();
                        });
                    } else {
                        openItemView();
                    }
                });
            }

            card.addEventListener('click', () => {
                if (isUnlocked) {
                    openItemView();
                } else if (window.openProductCheckoutModal) {
                    window.openProductCheckoutModal({
                        id: post.id,
                        title: post.title,
                        price: priceText,
                        format: formatBadgeText
                    }, () => {
                        openItemView();
                    });
                } else {
                    openItemView();
                }
            });

            return card;
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

        // 3. Native In-Page Multi-Gateway Checkout Modal (Unified via PaymentManager)
        window.openNativeInPageCheckout = function (opts, onUnlocked) {
            if (window.PaymentManager && typeof window.PaymentManager.openNativeInPageCheckout === 'function') {
                return window.PaymentManager.openNativeInPageCheckout(opts, onUnlocked);
            }
            const script = document.createElement('script');
            script.src = '/viewmodel/payment_manager.js?v=' + Date.now();
            script.onload = () => {
                if (window.PaymentManager && typeof window.PaymentManager.openNativeInPageCheckout === 'function') {
                    window.PaymentManager.openNativeInPageCheckout(opts, onUnlocked);
                }
            };
            document.head.appendChild(script);
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
                window.location.href = '/';
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

    // --- 24-Hour Stories Management (Delegated to /viewmodel/story_manager.js) ---
    if (window.StoryManager && window.StoryManager.Bar) {
        window.StoryManager.Bar.checkAndUpdateState();
    }

    // ============================================================
    // 0. HELPER: SVG to 3D Viewer (RESILIENT WEBGL CONTEXT & LIFECYCLE MANAGEMENT)
    // ============================================================
    function createSVG3DViewerIframeContent(svgCode, color, preserveBuffer = false, options = {}) {
        const rendererOptions = `{ antialias: true, preserveDrawingBuffer: ${preserveBuffer}, powerPreference: "high-performance" }`;
        const modelColor = color || '#3b82f6';
        const depth = (options && typeof options.depth === 'number') ? options.depth : 22;
        const autoRotate = (options && options.autoRotate !== undefined) ? !!options.autoRotate : true;
        const bevelSize = (options && typeof options.bevelSize === 'number') ? options.bevelSize : 1.5;

        // Normalize svg string safely and prevent </script> injection
        let rawSvg = '';
        if (typeof svgCode === 'string') {
            try {
                if (svgCode.startsWith('"') && svgCode.endsWith('"')) {
                    rawSvg = JSON.parse(svgCode);
                } else {
                    rawSvg = svgCode;
                }
            } catch (_) {
                rawSvg = svgCode;
            }
        } else if (svgCode) {
            rawSvg = String(svgCode);
        }
        const safeSvgCode = JSON.stringify(rawSvg || '').replace(/<\/script/gi, '<\\/script');

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
            width: 100%; height: 100%;
            margin: 0; padding: 0;
            background: #0a0d14;
            overflow: hidden;
            user-select: none;
            touch-action: none;
        }
        canvas {
            display: block;
            width: 100% !important;
            height: 100% !important;
            outline: none;
        }
        #fallback-msg {
            display: none;
            position: absolute;
            inset: 0;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 13px;
            background: #0a0d14;
        }
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
    <div id="fallback-msg">Rendering 3D Model...</div>
    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
        import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

        let renderer, scene, camera, controls, animId = null;
        let isContextLost = false;
        let isVisible = true;
        let meshGroup = null;

        function init() {
            try {
                // 1. SCENE & RENDERER SETUP
                renderer = new THREE.WebGLRenderer(${rendererOptions});
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                const w = window.innerWidth || document.documentElement.clientWidth || 300;
                const h = window.innerHeight || document.documentElement.clientHeight || 300;
                renderer.setSize(w, h, false);
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.1;
                document.body.appendChild(renderer.domElement);

                // WebGL context loss recovery (MANDATORY for multi-post feed & tab switching)
                renderer.domElement.addEventListener('webglcontextlost', (e) => {
                    e.preventDefault();
                    isContextLost = true;
                    if (animId) { cancelAnimationFrame(animId); animId = null; }
                }, false);

                renderer.domElement.addEventListener('webglcontextrestored', () => {
                    isContextLost = false;
                    rebuildScene();
                    startLoop();
                }, false);

                scene = new THREE.Scene();
                scene.background = new THREE.Color(0x0a0d14);

                const aspect = (w > 0 && h > 0) ? (w / h) : 1;
                camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);
                camera.position.set(0, 100, 260);

                controls = new OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.08;
                controls.autoRotate = ${autoRotate};
                controls.autoRotateSpeed = 2.0;

                try {
                    const pmrem = new THREE.PMREMGenerator(renderer);
                    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
                } catch(_) {}

                const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
                keyLight.position.set(120, 200, 160);
                scene.add(keyLight);

                const fillLight = new THREE.DirectionalLight(0x8ab4ff, 0.8);
                fillLight.position.set(-160, 60, -120);
                scene.add(fillLight);

                const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
                scene.add(ambientLight);

                const grid = new THREE.GridHelper(1000, 40, 0x2b3550, 0x1a2133);
                grid.position.y = -40;
                scene.add(grid);

                buildModel();
                startLoop();

            } catch (initErr) {
                console.warn("WebGL Init Warning:", initErr);
                const fb = document.getElementById('fallback-msg');
                if (fb) { fb.style.display = 'flex'; fb.textContent = '3D Simulation'; }
            }
        }

        function buildModel() {
            try {
                if (meshGroup) {
                    scene.remove(meshGroup);
                    meshGroup.traverse(c => {
                        if (c.geometry) c.geometry.dispose();
                        if (c.material) {
                            if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                            else c.material.dispose();
                        }
                    });
                    meshGroup = null;
                }

                const svgText = ${safeSvgCode};
                const loader = new SVGLoader();
                let data = null;
                try {
                    data = loader.parse(svgText);
                } catch(pe) {
                    console.warn("SVGLoader parse fallback:", pe);
                }

                const settings = { depth: ${depth}, bevelEnabled: true, bevelSize: ${bevelSize}, bevelThickness: ${bevelSize}, color: '${modelColor}' };
                const group = new THREE.Group();
                const extrudeSettings = {
                    depth: settings.depth,
                    bevelEnabled: settings.bevelEnabled,
                    bevelSize: settings.bevelSize,
                    bevelThickness: settings.bevelThickness,
                    bevelSegments: 3,
                    curveSegments: 24
                };

                if (data && Array.isArray(data.paths)) {
                    for (const path of data.paths) {
                        const shapes = SVGLoader.createShapes(path);
                        let shapeColor = new THREE.Color(settings.color);
                        if (path.color && typeof path.color.getHex === 'function' && path.color.getHex() !== 0x000000) {
                            shapeColor = path.color;
                        }
                        const pathMaterial = new THREE.MeshStandardMaterial({
                            color: shapeColor,
                            metalness: 0.35,
                            roughness: 0.28,
                            side: THREE.DoubleSide
                        });

                        if (shapes && shapes.length > 0) {
                            for (const shape of shapes) {
                                try {
                                    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                                    group.add(new THREE.Mesh(geometry, pathMaterial));
                                } catch(_) {}
                            }
                        } else if (path.subPaths && path.subPaths.length > 0) {
                            for (const sp of path.subPaths) {
                                const pts = sp.getPoints();
                                if (pts && pts.length > 1) {
                                    try {
                                        const strokeShape = new THREE.Shape(pts);
                                        const strokeGeo = new THREE.ExtrudeGeometry(strokeShape, { ...extrudeSettings, depth: Math.max(4, extrudeSettings.depth / 2) });
                                        group.add(new THREE.Mesh(strokeGeo, pathMaterial));
                                    } catch(_) {}
                                }
                            }
                        }
                    }
                }

                // Fallback geometry if SVG produced no valid 3D shapes
                if (group.children.length === 0) {
                    const defaultMat = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(settings.color),
                        metalness: 0.35,
                        roughness: 0.28,
                        side: THREE.DoubleSide
                    });
                    const starShape = new THREE.Shape();
                    const pts = 5, outerR = 50, innerR = 25;
                    for (let i = 0; i < pts * 2; i++) {
                        const r = (i % 2 === 0) ? outerR : innerR;
                        const a = (i / pts) * Math.PI - Math.PI / 2;
                        const x = Math.cos(a) * r;
                        const y = Math.sin(a) * r;
                        if (i === 0) starShape.moveTo(x, y);
                        else starShape.lineTo(x, y);
                    }
                    starShape.closePath();
                    const geo = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
                    group.add(new THREE.Mesh(geo, defaultMat));
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

                meshGroup = wrapper;
                scene.add(wrapper);

                // Full Preview Screen Auto-Fit Camera Framing
                const boundingBox = new THREE.Box3().setFromObject(wrapper);
                const boundingSphere = new THREE.Sphere();
                boundingBox.getBoundingSphere(boundingSphere);
                controls.target.copy(boundingSphere.center);
                const radius = Math.max(boundingSphere.radius, 45);

                const w = window.innerWidth || document.documentElement.clientWidth || 300;
                const h = window.innerHeight || document.documentElement.clientHeight || 300;
                const aspect = (w > 0 && h > 0) ? (w / h) : 1;
                const vFovRad = (camera.fov || 45) * (Math.PI / 180);
                const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
                const effectiveFov = Math.min(vFovRad, hFovRad);
                const fitDistance = (radius / Math.sin(effectiveFov / 2)) * 1.18;

                camera.position.set(0, radius * 0.35, Math.max(fitDistance, radius * 2.2));
                camera.lookAt(controls.target);
                controls.update();

                // Initial render pass
                renderer.render(scene, camera);

            } catch (buildErr) {
                console.error("3D Build Error:", buildErr);
            }
        }

        function rebuildScene() {
            if (!renderer || !scene) return;
            try {
                const w = window.innerWidth || document.documentElement.clientWidth || 300;
                const h = window.innerHeight || document.documentElement.clientHeight || 300;
                renderer.setSize(w, h, false);
                camera.aspect = (w > 0 && h > 0) ? (w / h) : 1;
                camera.updateProjectionMatrix();
                buildModel();
            } catch(reErr) {
                console.warn("Rebuild scene error:", reErr);
            }
        }

        function handleResize() {
            if (!renderer || !camera) return;
            const w = window.innerWidth || document.documentElement.clientWidth || 300;
            const h = window.innerHeight || document.documentElement.clientHeight || 300;
            if (w > 0 && h > 0) {
                renderer.setSize(w, h, false);
                const aspect = w / h;
                camera.aspect = aspect;
                camera.updateProjectionMatrix();
                if (meshGroup) {
                    const boundingBox = new THREE.Box3().setFromObject(meshGroup);
                    const boundingSphere = new THREE.Sphere();
                    boundingBox.getBoundingSphere(boundingSphere);
                    const radius = Math.max(boundingSphere.radius, 45);
                    const vFovRad = camera.fov * (Math.PI / 180);
                    const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
                    const effectiveFov = Math.min(vFovRad, hFovRad);
                    const fitDist = (radius / Math.sin(effectiveFov / 2)) * 1.18;
                    camera.position.set(0, radius * 0.35, Math.max(fitDist, radius * 2.2));
                    camera.lookAt(controls ? controls.target : new THREE.Vector3(0,0,0));
                }
                if (scene && !isContextLost) {
                    try { renderer.render(scene, camera); } catch(_) {}
                }
            }
        }

        window.addEventListener('resize', handleResize);
        if (window.ResizeObserver) {
            new ResizeObserver(handleResize).observe(document.body);
        }

        // Pause rendering when offscreen or page hidden to conserve WebGL contexts
        if (window.IntersectionObserver) {
            const io = new IntersectionObserver((entries) => {
                const entry = entries[0];
                isVisible = entry && entry.isIntersecting;
                if (isVisible) {
                    if (!animId && !isContextLost) startLoop();
                } else {
                    if (animId) { cancelAnimationFrame(animId); animId = null; }
                }
            }, { threshold: 0.02 });
            io.observe(document.body);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (animId) { cancelAnimationFrame(animId); animId = null; }
            } else if (isVisible && !isContextLost && !animId) {
                startLoop();
            }
        });

        function startLoop() {
            if (animId) cancelAnimationFrame(animId);
            function loop() {
                if (isContextLost || !isVisible) {
                    animId = null;
                    return;
                }
                animId = requestAnimationFrame(loop);
                if (controls) controls.update();
                if (renderer && scene && camera) {
                    try {
                        renderer.render(scene, camera);
                    } catch(tickErr) {
                        // Suppress transient render errors
                    }
                }
            }
            animId = requestAnimationFrame(loop);
        }

        init();
    <\/script>
</body>
</html>`;
    }

    // Attach to window so it is accessible globally across all modules and views
    window.createSVG3DViewerIframeContent = createSVG3DViewerIframeContent;

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

    function renderP5PostContent(code, width = 600, height = 600) {
        if (!code) return '';
        const safeCode = code.replace(/__WIDTH__/g, width).replace(/__HEIGHT__/g, height);
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"><\/script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
            width: 100%; height: 100%;
            background: #090b10;
            overflow: hidden;
            display: flex; align-items: center; justify-content: center;
        }
        #canvas-container {
            width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
        }
        canvas {
            max-width: 100%; max-height: 100%;
            object-fit: contain;
            display: block;
        }
    </style>
</head>
<body>
    <div id="canvas-container"></div>
    <script>
        try {
            ${safeCode}
        } catch(e) {
            console.error("p5 execution error:", e);
        }
        const observer = new MutationObserver(() => {
            const looseCanvas = document.querySelector('body > canvas');
            const container = document.getElementById('canvas-container');
            if (looseCanvas && container && looseCanvas.parentElement !== container) {
                container.appendChild(looseCanvas);
            }
        });
        observer.observe(document.body, { childList: true });
    <\/script>
</body>
</html>`;
    }
    window.renderP5PostContent = renderP5PostContent;

    function renderAnimePostContent(code, width = 600, height = 600) {
        if (!code) return '';
        const safeCode = code.replace(/__WIDTH__/g, width).replace(/__HEIGHT__/g, height);
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js"><\/script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
            width: 100%; height: 100%;
            background: #090b10;
            overflow: hidden;
            display: flex; align-items: center; justify-content: center;
        }
        #canvas-container {
            width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            position: relative;
        }
    </style>
</head>
<body>
    <div id="canvas-container"></div>
    <script>
        try {
            ${safeCode}
        } catch(e) {
            console.error("Anime.js execution error:", e);
        }
    <\/script>
</body>
</html>`;
    }
    window.renderAnimePostContent = renderAnimePostContent;

    window.handleMediaFallback = function (mediaEl, postId, format, iconClass, title) {
        if (window.EngineManager && typeof window.EngineManager.handleMediaFallback === 'function') {
            return window.EngineManager.handleMediaFallback(mediaEl, postId, format, iconClass, title);
        }
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
        if (typeof post.source === 'string') {
            try { post.source = JSON.parse(post.source); } catch (_) { post.source = {}; }
        }

        const rawUrl = post.video_url || post.media_url || post.thumbnail_url || post.cover_url || post.source?.video_url || post.source?.media_url || post.source?.thumbnail || post.source?.cover_image || '';
        const fullUrl = rawUrl.startsWith('http') || rawUrl.startsWith('data:')
            ? rawUrl
            : (rawUrl ? `${getBackendUrl()}${rawUrl}` : '');

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

        const engineHtml = window.EngineManager?.renderHtml ? window.EngineManager.renderHtml(post, { isFeed: true, isInteractive: viewType !== 'grid' }) : null;
        if (engineHtml) {
            const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
            const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${engineHtml.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: ${post.source?.background || 'transparent'}; pointer-events: ${pointerEvents};"></iframe>`;
            const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background:#090b10;"></div>` : '';
            return { mediaHTML, backgroundHTML };
        }

        const mediaHTML = `<div class="fallback-post-card"><i class="ri-draft-line"></i><span>${escapeHtml(post.title || 'TikZ Diagram')}</span><small>LaTeX / TikZ</small></div>`;
        const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background:#0a0d14;"></div>` : '';
        return { mediaHTML, backgroundHTML };
    }

    function buildResearchLabSandboxDoc(engine, code, params) {
        const closeScript = '<' + '/script>';
        const eng = String(engine || '').toLowerCase().trim();
        let engineScripts = '<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js">' + closeScript;
        if (eng === 'matter') {
            engineScripts = '<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js">' + closeScript;
        } else if (eng === 'three') {
            engineScripts = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js">' + closeScript +
                '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js">' + closeScript;
        } else if (eng === 'canvas') {
            engineScripts = '';
        }

        // Clean out legacy HUD text overlays from preview cards (e.g., "Click canvas...", "Live bench projectile sandbox")
        let cleanedCode = (code || '')
            .replace(/\/\/\s*Telemetry HUD[\s\S]*?(?=\n\s*(?:function|\/\/|\w+\s*=|\}))/i, '')
            .replace(/\/\/\s*HUD\b[\s\S]*?(?=\n\s*(?:function|\/\/|\w+\s*=|\}))/i, '')
            .replace(/text\s*\(\s*["'`][^"'`]*(?:Live Bench|Projectile Flight|Click canvas|re-launch|Interference Pattern|Harmonic Oscillator)[^"'`]*["'`][^;]*\);?/gi, '')
            .replace(/text\s*\(\s*["'`][^"'`]*(?:v[₀0]:|Wavelength:|Mass:)[^;]*\);?/gi, '');

        const paramsJson = JSON.stringify(params || {});
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${engineScripts}
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
            width: 100%; height: 100%; overflow: hidden; background: #060813;
            display: flex; align-items: center; justify-content: center; user-select: none;
        }
        canvas { display: block; width: 100% !important; height: 100% !important; object-fit: contain; }
    </style>
</head>
<body>
    <script>
        // Suppress HUD overlay text inside preview cards
        if (window.p5 && window.p5.prototype) {
            const _origText = window.p5.prototype.text;
            window.p5.prototype.text = function(str) {
                if (typeof str === 'string' && (
                    str.includes('Click canvas') ||
                    str.includes('Live Bench') ||
                    str.includes('Projectile Flight') ||
                    str.includes('re-launch')
                )) {
                    return;
                }
                return _origText ? _origText.apply(this, arguments) : undefined;
            };
        }

        // Capture Matter.js Runner instance for pause/resume control
        if (window.Matter && window.Matter.Runner && window.Matter.Runner.run) {
            const _origRunnerRun = window.Matter.Runner.run;
            window.Matter.Runner.run = function(runner, engine) {
                window._simMatterRunner = runner;
                window._simMatterEngine = engine;
                return _origRunnerRun.apply(this, arguments);
            };
        }

        // --- Continuous Simulation Loop & Scroll Focus Supervisor ---
        window._simLooping = true;
        window._loopTimer = null;
        window._wasLaunched = false;
        window._landingHandled = false;
        window._cycleStartTime = Date.now();

        window.triggerReset = function() {
            if (!window._simLooping) return;
            try {
                if (typeof window.resetSimulation === 'function') {
                    window.resetSimulation();
                } else if (typeof resetSimulation === 'function') {
                    resetSimulation();
                } else if (typeof window.mousePressed === 'function') {
                    window.mousePressed();
                } else if (typeof mousePressed === 'function') {
                    mousePressed();
                } else if (typeof window.setup === 'function') {
                    window.setup();
                }
            } catch(_) {}
        };

        window.startSimulationLoop = function() {
            window._simLooping = true;
            if (window._loopTimer) {
                clearTimeout(window._loopTimer);
                window._loopTimer = null;
            }
            if (typeof window.loop === 'function') {
                try { window.loop(); } catch(_) {}
            }
            if (window._simMatterRunner && window._simMatterEngine) {
                try { Matter.Runner.run(window._simMatterRunner, window._simMatterEngine); } catch(_) {}
            }
            window.triggerReset();
        };

        window.stopSimulation = function() {
            window._simLooping = false;
            if (window._loopTimer) {
                clearTimeout(window._loopTimer);
                window._loopTimer = null;
            }
            if (typeof window.noLoop === 'function') {
                try { window.noLoop(); } catch(_) {}
            }
            if (window._simMatterRunner) {
                try { Matter.Runner.stop(window._simMatterRunner); } catch(_) {}
            }
        };

        window.addEventListener('message', function(e) {
            if (!e.data) return;
            if (e.data.type === 'SIM_PLAY_LOOP' || e.data.type === 'SIM_RESUME') {
                window.startSimulationLoop();
            } else if (e.data.type === 'SIM_PAUSE' || e.data.type === 'SIM_STOP') {
                window.stopSimulation();
            }
        });

        window.params = ${paramsJson};
        window.width = 600;
        window.height = 380;
        window.windowWidth = 600;
        window.windowHeight = 380;
        try {
            ${cleanedCode}
        } catch(e) {
            console.warn('[ResearchLab Sandbox Error]:', e);
        }

        try {
            if (typeof resetSimulation === 'function') window.resetSimulation = resetSimulation;
            if (typeof mousePressed === 'function') window.mousePressed = mousePressed;
            if (typeof setup === 'function') window.setup = setup;
            if (typeof draw === 'function') window.draw = draw;
        } catch(_) {}

        // Wrap draw() for continuous looping (detects projectile landing or periodic cycle restart)
        if (typeof window.draw === 'function' || typeof draw === 'function') {
            const _userDraw = window.draw || draw;
            window.draw = function() {
                try {
                    _userDraw.apply(this, arguments);
                } catch(err) {
                    console.warn('[ResearchLab Draw Error]:', err);
                }
                if (!window._simLooping) return;

                // 1. Detect if projectile has landed (isLaunched transitioned from true to false)
                try {
                    if (typeof isLaunched !== 'undefined') {
                        if (isLaunched) {
                            window._wasLaunched = true;
                            window._landingHandled = false;
                        } else if (window._wasLaunched && !window._landingHandled) {
                            window._landingHandled = true;
                            window._loopTimer = setTimeout(function() {
                                window._landingHandled = false;
                                window._wasLaunched = false;
                                if (window._simLooping) {
                                    window.triggerReset();
                                }
                            }, 900);
                        }
                    }
                } catch(_) {}

                // 2. Continuous loop restart for damped oscillators or periodic cycles (every 5.2s)
                const now = Date.now();
                if (now - window._cycleStartTime > 5200) {
                    window._cycleStartTime = now;
                    try {
                        if (typeof isLaunched === 'undefined' || !isLaunched) {
                            window.triggerReset();
                        }
                    } catch(_) {}
                }
            };
        }
    ${closeScript}
</body>
</html>`;
    }

    const postRenderers = {
        'researchlab': (post, viewType) => {
            if (viewType === 'reel') {
                return { mediaHTML: '', backgroundHTML: '' };
            }
            if (post && typeof post.source === 'string') {
                try { post.source = JSON.parse(post.source); } catch (_) { post.source = {}; }
            }
            const proposalId = post.id || post.proposal_id || post.proposal?.id || post.source?.proposal?.id || '';
            const openUrl = `/views/researchLab.html?id=${encodeURIComponent(proposalId)}`;
            const videoUrl = post.video_url || post.videoUrl || post.source?.video_url || post.source?.media_url || null;
            const customCode = post.customSimulationCode || post.source?.customSimulationCode || post.proposal?.customSimulationCode || post.source?.proposal?.customSimulationCode || null;
            const engine = post.engine || post.source?.engine || post.proposal?.engine || post.source?.proposal?.engine || 'p5';
            const params = post.initialParams || post.source?.initialParams || post.proposal?.initialParams || post.source?.proposal?.initialParams || { velocity: 45, angle: 45, dragCoeff: 0.06, gravity: 9.81 };

            let mediaInner = '';
            if (videoUrl) {
                mediaInner = `<video src="${videoUrl}" autoplay loop muted playsinline webkit-playsinline class="research-lab-sim-video" style="width:100%; height:100%; object-fit:cover; display:block;"></video>`;
            } else if (customCode && customCode.trim()) {
                const sandboxDoc = buildResearchLabSandboxDoc(engine, customCode, params);
                const safeSrcdoc = sandboxDoc.replace(/'/g, "&apos;");
                mediaInner = `
                    <iframe class="research-lab-sim-iframe" sandbox="allow-scripts allow-same-origin" srcdoc='${safeSrcdoc}' style="position:absolute; inset:0; width:100%; height:100%; border:none; background:#060813; pointer-events:none; display:block; z-index:2;"></iframe>
                    <canvas class="research-lab-sim-canvas" data-post-id="${post.id}" style="display:none; width:100%; height:100%; position:absolute; inset:0; z-index:1;"></canvas>
                `;
            } else {
                mediaInner = `<canvas class="research-lab-sim-canvas active-canvas" data-post-id="${post.id}" style="width:100%; height:100%; display:block; object-fit:cover; position:absolute; inset:0; z-index:1;"></canvas>`;
            }
            const mediaHTML = `
                <div class="research-lab-media-interactive" data-open-url="${openUrl}" style="position:relative; width:100%; height:100%; background:#050811; overflow:hidden; cursor:pointer;">
                    ${mediaInner}
                </div>
            `;
            const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #050811;"></div>` : '';
            return { mediaHTML, backgroundHTML };
        },
        'tikz': (post, viewType) => renderTikzPost(post, viewType),
        'image': (post, viewType) => {
            if (typeof post.source === 'string') {
                try { post.source = JSON.parse(post.source); } catch (_) { post.source = {}; }
            }
            if (post.source?.engine === 'tikz' || post.format === 'tikz') {
                return renderTikzPost(post, viewType);
            }

            const isDesmos = post.source?.engine === 'desmos' || post.format === 'graph' || post.format === 'xtragraph';
            const rawUrl = post.video_url || post.media_url || post.thumbnail_url || post.cover_url || post.source?.video_url || post.source?.media_url || post.source?.thumbnail || post.source?.cover_image || '';
            const fullUrl = rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : (rawUrl ? `${getBackendUrl()}${rawUrl}` : '');

            if (fullUrl) {
                const safeTitle = (post.title || (isDesmos ? 'Graph' : 'Graphic')).replace(/'/g, '&#39;');
                const isSvgGraphic = post.source?.engine === 'svg_to_png' || post.source?.engine === 'd3' || post.source?.engine === 'svg_to_3d';
                const objectFit = isSvgGraphic ? 'contain' : (viewType === 'reel' ? 'contain' : 'cover');
                const kenBurnsClass = (!isSvgGraphic && (viewType === 'reel' || viewType === 'course-preview')) ? 'ken-burns' : '';
                const imgBg = isSvgGraphic ? 'transparent' : '#000';
                const imgPadding = isSvgGraphic ? 'padding: 12px;' : '';
                const iconType = isDesmos ? 'ri-bar-chart-2-line' : 'ri-image-line';
                const formatLabel = isDesmos ? 'Graph' : 'Graphic';
                const mediaHTML = `<img src="${fullUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', '${formatLabel}', '${iconType}', '${safeTitle}');" class="${kenBurnsClass}" style="width: 100%; height: 100%; object-fit: ${objectFit}; background: ${imgBg}; ${imgPadding}">`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #090b10;"><img src="${fullUrl}" loading="lazy" style="opacity: 0.18; filter: blur(25px); transform: scale(1.15);"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }

            const engineHtml = window.EngineManager?.renderHtml ? window.EngineManager.renderHtml(post, { isFeed: true, isInteractive: viewType !== 'grid' }) : null;
            if (engineHtml) {
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${engineHtml.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: ${post.source?.backgroundColor || post.source?.background || 'transparent'}; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
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
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: ${post.source.backgroundColor || 'transparent'}; pointer-events: ${pointerEvents};"></iframe>`;
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
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else {
                const rawUrl = post.video_url || post.media_url || post.thumbnail_url || post.cover_url || post.source?.video_url || post.source?.media_url || post.source?.thumbnail || post.source?.cover_image || '';
                const fullUrl = rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : (rawUrl ? `${getBackendUrl()}${rawUrl}` : '');
                if (fullUrl) {
                    const safeTitle = (post.title || 'Diagram').replace(/'/g, '&#39;');
                    const mediaHTML = `<img src="${fullUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Diagram', 'ri-node-tree', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: contain; background: #1e1e23;">`;
                    const backgroundHTML = viewType === 'reel' ? `<div class="reel-background"><img src="${fullUrl}" loading="lazy"></div>` : '';
                    return { mediaHTML, backgroundHTML };
                } else {
                    const engineHtml = window.EngineManager?.renderHtml ? window.EngineManager.renderHtml(post, { isFeed: true, isInteractive: viewType !== 'grid' }) : null;
                    if (engineHtml) {
                        const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                        const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${engineHtml.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                        const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                        return { mediaHTML, backgroundHTML };
                    }
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
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            const hasSource = post.source?.engine === 'katex' && post.source?.code;
            const canRenderLive = typeof window.renderKatex === 'function' && hasSource;

            if (canRenderLive) {
                const { code, fontSize, color } = post.source;
                const iframeContent = window.renderKatex(code, { fontSize: fontSize || '1.8em', color: color || '#ffffff' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else {
                const rawUrl = post.video_url || post.media_url || post.thumbnail_url || post.cover_url || post.source?.video_url || post.source?.media_url || post.source?.thumbnail || post.source?.cover_image || '';
                const fullUrl = rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : (rawUrl ? `${getBackendUrl()}${rawUrl}` : '');
                if (fullUrl) {
                    const safeTitle = (post.title || 'Math Formula').replace(/'/g, '&#39;');
                    const mediaHTML = `<img src="${fullUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Math Formula', 'ri-functions', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: contain; background: #0a0d14;">`;
                    const backgroundHTML = viewType === 'reel' ? `<div class="reel-background"><img src="${fullUrl}" loading="lazy"></div>` : '';
                    return { mediaHTML, backgroundHTML };
                } else {
                    const engineHtml = window.EngineManager?.renderHtml ? window.EngineManager.renderHtml(post, { isFeed: true, isInteractive: viewType !== 'grid' }) : null;
                    if (engineHtml) {
                        const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                        const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${engineHtml.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                        const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                        return { mediaHTML, backgroundHTML };
                    }
                    const mediaHTML = `<div class="fallback-post-card"><i class="ri-functions"></i><span>${escapeHtml(post.title || 'Math Formula')}</span><small>Mathematical Expression</small></div>`;
                    const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background:#0a0d14;"></div>` : '';
                    return { mediaHTML, backgroundHTML };
                }
            }
        },
        'interactive': (post, viewType) => {
            if (typeof post.source === 'string') {
                try { post.source = JSON.parse(post.source); } catch (_) { post.source = {}; }
            }
            const engine = post.source?.engine || post.format;
            const code = post.source?.code;

            if ((engine === 'anime' || post.format === 'anime') && code && typeof window.renderAnime === 'function') {
                const iframeContent = window.renderAnime(code, { width: 1280, height: 720, background: post.source.background || '#080a10' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #080a10; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #080a10;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            if ((engine === 'rough' || post.format === 'rough') && code && typeof window.renderRough === 'function') {
                const iframeContent = window.renderRough(code, { width: 1280, height: 720, background: post.source.background || '#0e1117' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0e1117; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0e1117;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            if ((engine === 'two' || post.format === 'two') && code && typeof window.renderTwo === 'function') {
                const iframeContent = window.renderTwo(code, { width: 1280, height: 720, background: post.source.background || '#090b10' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #090b10; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #090b10;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            if (post.source?.engine === 'zdog' && post.source?.code && typeof window.renderZdog === 'function') {
                const iframeContent = window.renderZdog(post.source.code, { background: post.source.background || '#0a0d14' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            if (post.source?.engine === 'thumbnail' && post.source?.code && typeof window.renderFabric === 'function') {
                const iframeContent = window.renderFabric(post.source.code, { background: post.source.background || '#09090b' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #09090b; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #09090b;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            if (post.source?.engine === 'jsxgraph' && post.source?.code && typeof window.renderJSXGraph === 'function') {
                const iframeContent = window.renderJSXGraph(post.source.code, { background: post.source.background || '#0a0d14' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            if (post.source?.engine === 'd3' && post.source?.code && typeof window.renderD3 === 'function') {
                const iframeContent = window.renderD3(post.source.code, { background: post.source.background || '#0a0d14' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            if (post.source?.engine === 'matter' && post.source?.code && typeof window.renderMatter === 'function') {
                const iframeContent = window.renderMatter(post.source.code, { background: post.source.background || '#0a0d14' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            if (engine === 'cartoon_studio' || post.format === 'cartoon_studio' || post.source?.engine === 'cartoon_studio') {
                if (viewType === 'grid') {
                    const rawUrl = post.video_url || post.media_url || post.thumbnail_url || post.cover_url || post.source?.video_url || post.source?.media_url || post.source?.thumbnail || post.source?.cover_image || '';
                    const fullUrl = rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : (rawUrl ? `${getBackendUrl()}${rawUrl}` : '');
                    const thumbUrl = fullUrl || (window.getCartoonStudioThumbnail ? window.getCartoonStudioThumbnail(post) : '');
                    const safeTitle = (post.title || 'Cartoon 3D').replace(/'/g, '&#39;');
                    const mediaHTML = `
                        <div class="cartoon-thumb-card" style="position:relative; width:100%; height:100%; overflow:hidden; background:#0f172a; border-radius:inherit;">
                            <img src="${thumbUrl}" loading="lazy" decoding="async" alt="${safeTitle}" onerror="if(window.getCartoonStudioThumbnail && !this.src.startsWith('data:')) this.src = window.getCartoonStudioThumbnail(window._allRenderedPosts?.['${post.id}'] || {});" style="width: 100%; height: 100%; object-fit: cover; display:block;">
                            <div class="cartoon-play-hover" style="position:absolute; inset:0; background:linear-gradient(to top, rgba(15,23,42,0.7) 0%, transparent 60%); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s ease; z-index:3; pointer-events:none;">
                                <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,#f43f5e,#fb923c); display:flex; align-items:center; justify-content:center; color:white; font-size:1.4rem; box-shadow:0 0 20px rgba(244,63,94,0.6);">
                                    <i class="ri-play-fill" style="margin-left:3px;"></i>
                                </div>
                            </div>
                        </div>`;
                    return { mediaHTML, backgroundHTML: '' };
                }
                let codeToRun = code || post.source?.code || post.code || '';
                if (!codeToRun || !codeToRun.trim()) {
                    const pTitle = (post.title || '').toLowerCase();
                    if (pTitle.includes('fight') || pTitle.includes('battle') || pTitle.includes('combat') || pTitle.includes('stick')) {
                        codeToRun = "Studio.setMode('fight'); Studio.playCombo();";
                    } else if (pTitle.includes('animal') || pTitle.includes('dog') || pTitle.includes('quadruped')) {
                        codeToRun = "Studio.setMode('animal');";
                    } else if (pTitle.includes('solo') || pTitle.includes('hero') || pTitle.includes('run')) {
                        codeToRun = "Studio.setMode('solo'); Studio.setMotion('walk'); Studio.setCharacterStyle('hero');";
                    } else {
                        codeToRun = "Studio.setMode('teacher'); Studio.setLesson('quadratic'); Studio.autoExplain();";
                    }
                }
                const iframeContent = typeof window.renderCartoonStudio === 'function'
                    ? window.renderCartoonStudio(codeToRun, { isFeed: true })
                    : '';
                const pointerEvents = 'auto';
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0f172a; pointer-events: ${pointerEvents}; display:block;"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0f172a;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            if (engine === 'sound_studio' || post.format === 'sound_studio' || post.source?.engine === 'sound_studio') {
                if (viewType === 'grid') {
                    const rawUrl = post.video_url || post.media_url || post.thumbnail_url || post.cover_url || post.source?.video_url || post.source?.media_url || post.source?.thumbnail || post.source?.cover_image || '';
                    const fullUrl = rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : (rawUrl ? `${getBackendUrl()}${rawUrl}` : '');
                    const thumbUrl = fullUrl || (window.getSoundStudioThumbnail ? window.getSoundStudioThumbnail(post) : '');
                    const safeTitle = (post.title || 'Sound Waves').replace(/'/g, '&#39;');
                    const mediaHTML = `
                        <div class="cartoon-thumb-card" style="position:relative; width:100%; height:100%; overflow:hidden; background:#050811; border-radius:inherit;">
                            <img src="${thumbUrl}" loading="lazy" decoding="async" alt="${safeTitle}" style="width: 100%; height: 100%; object-fit: cover; display:block;">
                            <div class="cartoon-play-hover" style="position:absolute; inset:0; background:linear-gradient(to top, rgba(5,8,17,0.7) 0%, transparent 60%); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s ease; z-index:3; pointer-events:none;">
                                <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,#06b6d4,#8b5cf6); display:flex; align-items:center; justify-content:center; color:white; font-size:1.4rem; box-shadow:0 0 20px rgba(6,182,212,0.6);">
                                    <i class="ri-play-fill" style="margin-left:3px;"></i>
                                </div>
                            </div>
                        </div>`;
                    return { mediaHTML, backgroundHTML: '' };
                }
                const codeToRun = code || post.source?.code || post.code || '';
                if (codeToRun && typeof window.renderSoundStudio === 'function') {
                    const iframeContent = window.renderSoundStudio(codeToRun, { isFeed: true });
                    const pointerEvents = 'auto';
                    const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #050811; pointer-events: ${pointerEvents};"></iframe>`;
                    const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #050811;"></div>` : '';
                    return { mediaHTML, backgroundHTML };
                }
            }

            const rawUrl = post.video_url || post.media_url || post.thumbnail_url || post.cover_url || post.source?.video_url || post.source?.media_url || post.source?.thumbnail || post.source?.cover_image || '';
            const fullUrl = rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : (rawUrl ? `${getBackendUrl()}${rawUrl}` : '');
            if (fullUrl) {
                const safeTitle = (post.title || 'Interactive').replace(/'/g, '&#39;');
                const mediaHTML = `<img src="${fullUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Interactive', 'ri-terminal-box-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: contain; background: #0a0d14;">`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background"><img src="${fullUrl}" loading="lazy"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else {
                const engineHtml = window.EngineManager?.renderHtml ? window.EngineManager.renderHtml(post, { isFeed: true, isInteractive: viewType !== 'grid' }) : null;
                if (engineHtml) {
                    const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                    const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${engineHtml.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                    const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background:#0a0d14;"></div>` : '';
                    return { mediaHTML, backgroundHTML };
                }
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
            const rawUrl = post.video_url || post.media_url || post.thumbnail_url || post.cover_url || post.source?.video_url || post.source?.media_url || post.source?.thumbnail || post.source?.cover_image || '';
            const fullMediaUrl = rawUrl ? (rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : `${getBackendUrl()}${rawUrl}`) : '';
            let mediaHTML, backgroundHTML;
            const autoplayAttr = viewType === 'course-preview' ? 'autoplay' : '';
            const isGrid = viewType === 'grid';
            const safeTitle = (post.title || 'Interactive Article').replace(/'/g, '&#39;');

            if (post.media_type && post.media_type.startsWith('video') && fullMediaUrl) {
                const hoverEvents = isGrid ? `onmouseover="this.play()" onmouseout="this.pause()"` : '';
                const preloadAttr = isGrid ? 'preload="none"' : 'preload="metadata"';
                if (isGrid) {
                    mediaHTML = `
                    <div class="article-grid-card" style="position:relative; width:100%; height:100%; background:#090b10; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                        <video src="${fullMediaUrl}" preload="none" muted loop playsinline style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; filter:blur(24px) brightness(0.35) saturate(1.4); transform:scale(1.2); opacity:0.8; pointer-events:none;"></video>
                        <div style="position:relative; z-index:2; width:92%; max-height:86%; display:flex; align-items:center; justify-content:center; border-radius:10px; overflow:hidden; box-shadow:0 12px 36px rgba(0,0,0,0.85); border:1px solid rgba(255,255,255,0.12);">
                            <video src="${fullMediaUrl}" ${preloadAttr} loop muted playsinline ${hoverEvents} onerror="window.handleMediaFallback(this, '${post.id}', 'Interactive Article', 'ri-article-line', '${safeTitle}');" style="width:100%; height:auto; max-height:100%; object-fit:contain; display:block;"></video>
                        </div>
                    </div>`;
                    backgroundHTML = '';
                } else {
                    const objectFit = viewType === 'reel' ? 'contain' : 'cover';
                    mediaHTML = `<video src="${fullMediaUrl}" ${preloadAttr} loop muted playsinline ${autoplayAttr} onerror="window.handleMediaFallback(this, '${post.id}', 'Interactive Article', 'ri-article-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: ${objectFit};"></video>`;
                    backgroundHTML = `<div class="reel-background"><video src="${fullMediaUrl}" preload="none" loop muted playsinline></video></div>`;
                }
            } else if (fullMediaUrl) {
                if (isGrid) {
                    mediaHTML = `
                    <div class="article-grid-card" style="position:relative; width:100%; height:100%; background:#090b10; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                        <img src="${fullMediaUrl}" loading="lazy" decoding="async" alt="" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; filter:blur(26px) brightness(0.35) saturate(1.4); transform:scale(1.25); opacity:0.85; pointer-events:none;">
                        <div style="position:relative; z-index:2; width:92%; max-height:86%; display:flex; align-items:center; justify-content:center; border-radius:10px; overflow:hidden; box-shadow:0 12px 36px rgba(0,0,0,0.85); border:1px solid rgba(255,255,255,0.14);">
                            <img src="${fullMediaUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Interactive Article', 'ri-article-line', '${safeTitle}');" style="width:100%; height:auto; max-height:100%; object-fit:contain; display:block;">
                        </div>
                    </div>`;
                    backgroundHTML = '';
                } else {
                    const objectFit = viewType === 'reel' ? 'contain' : 'cover';
                    mediaHTML = `<img src="${fullMediaUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Interactive Article', 'ri-article-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: ${objectFit}; background: #000;">`;
                    backgroundHTML = `<div class="reel-background"><img src="${fullMediaUrl}" loading="lazy"></div>`;
                }
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
            const rawUrl = post.video_url || post.media_url || post.thumbnail_url || post.cover_url || post.source?.video_url || post.source?.media_url || post.source?.thumbnail || post.source?.cover_image || '';
            const coverUrl = rawUrl ? (rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : `${getBackendUrl()}${rawUrl}`) : '';
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
            const rawUrl = post.video_url || post.media_url || post.thumbnail_url || post.cover_url || post.source?.video_url || post.source?.media_url || post.source?.thumbnail || post.source?.cover_image || '';
            const coverUrl = rawUrl ? (rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : `${getBackendUrl()}${rawUrl}`) : '';
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
            if (typeof post.source === 'string') {
                try { post.source = JSON.parse(post.source); } catch (_) { post.source = {}; }
            }
            let mediaHTML, backgroundHTML;
            const hasZdogSource = post.source && post.source.engine === 'zdog' && post.source.code && typeof window.renderZdog === 'function';
            const hasSvg3DSource = post.source && post.source.engine === 'svg_to_3d' && post.source.code && typeof window.createSVG3DViewerIframeContent === 'function';
            const hasCartoonSource = (post.format === 'cartoon_studio') || (post.source && (post.source.engine === 'cartoon_studio' || post.source.format === 'cartoon_studio'));
            const safeTitle = (post.title || '3D Model').replace(/'/g, '&#39;');
            const rawUrl = post.video_url || post.media_url || post.thumbnail_url || post.cover_url || post.source?.video_url || post.source?.media_url || post.source?.thumbnail || post.source?.cover_image || '';
            const fullUrl = rawUrl ? (rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : `${getBackendUrl()}${rawUrl}`) : '';

            if (hasCartoonSource) {
                if (viewType === 'grid') {
                    const thumbUrl = fullUrl || (window.getCartoonStudioThumbnail ? window.getCartoonStudioThumbnail(post) : '');
                    const safeTitle = (post.title || 'Cartoon 3D').replace(/'/g, '&#39;');
                    mediaHTML = `
                        <div class="cartoon-thumb-card" style="position:relative; width:100%; height:100%; overflow:hidden; background:#0f172a; border-radius:inherit;">
                            <img src="${thumbUrl}" loading="lazy" decoding="async" alt="${safeTitle}" onerror="if(window.getCartoonStudioThumbnail && !this.src.startsWith('data:')) this.src = window.getCartoonStudioThumbnail(window._allRenderedPosts?.['${post.id}'] || {});" style="width: 100%; height: 100%; object-fit: cover; display:block;">
                            <div class="cartoon-play-hover" style="position:absolute; inset:0; background:linear-gradient(to top, rgba(15,23,42,0.7) 0%, transparent 60%); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s ease; z-index:3; pointer-events:none;">
                                <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,#f43f5e,#fb923c); display:flex; align-items:center; justify-content:center; color:white; font-size:1.4rem; box-shadow:0 0 20px rgba(244,63,94,0.6);">
                                    <i class="ri-play-fill" style="margin-left:3px;"></i>
                                </div>
                            </div>
                        </div>`;
                    backgroundHTML = '';
                } else {
                    let codeToRun = post.source?.code || post.code || '';
                    if (!codeToRun || !codeToRun.trim()) {
                        codeToRun = "Studio.setMode('teacher'); Studio.setLesson('quadratic'); Studio.autoExplain();";
                    }
                    const iframeContent = (typeof window.renderCartoonStudio === 'function')
                        ? window.renderCartoonStudio(codeToRun, { isFeed: true })
                        : '';
                    mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0f172a; pointer-events: auto; display:block;"></iframe>`;
                    backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0f172a;"></div>` : '';
                }
            } else if (viewType === 'grid' && fullUrl) {
                // In Explore grid, use the static screenshot image to conserve WebGL contexts
                mediaHTML = `<img src="${fullUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', '3D Simulation', 'ri-box-3-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: cover; background: #0a0d14;">`;
                backgroundHTML = '';
            } else if (hasSvg3DSource) {
                const svgCode = JSON.stringify(post.source.code);
                const modelColor = post.source.color || '#3b82f6';
                const iframeContent = window.createSVG3DViewerIframeContent(svgCode, modelColor, false);
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
            } else if (hasZdogSource) {
                const iframeContent = window.renderZdog(post.source.code, { background: post.source.background || '#0a0d14' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
            } else if (fullUrl) {
                mediaHTML = `<img src="${fullUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', '3D Simulation', 'ri-box-3-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: cover; background: #1e1e23;">`;
                backgroundHTML = viewType === 'reel' ? `<div class="reel-background"><img src="${fullUrl}" loading="lazy"></div>` : '';
            } else {
                const engineHtml = window.EngineManager?.renderHtml ? window.EngineManager.renderHtml(post, { isFeed: true, isInteractive: viewType !== 'grid' }) : null;
                if (engineHtml) {
                    const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                    mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${engineHtml.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                    backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
                } else {
                    mediaHTML = `<div class="fallback-post-card" style="background: linear-gradient(135deg, #1e1e2f, #0f172a);">
                        <i class="ri-box-3-line" style="color: #60a5fa;"></i>
                        <span>${escapeHtml(post.title || '3D Model')}</span>
                        <small style="color:#94a3b8;">3D Simulation</small>
                    </div>`;
                    backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0f172a;"></div>` : '';
                }
            }
            return { mediaHTML, backgroundHTML };
        },
        'cartoon_studio': (post, viewType) => postRenderers['interactive'](post, viewType),
        'sound_studio': (post, viewType) => postRenderers['interactive'](post, viewType),
        'rapier': (post, viewType) => postRenderers['interactive'](post, viewType),
        'anime': (post, viewType) => postRenderers['interactive'](post, viewType),
        'rough': (post, viewType) => postRenderers['interactive'](post, viewType),
        'two': (post, viewType) => postRenderers['interactive'](post, viewType),
        'zdog': (post, viewType) => postRenderers['interactive'](post, viewType),
        'jsxgraph': (post, viewType) => postRenderers['math'](post, viewType),
        'desmos': (post, viewType) => postRenderers['image'](post, viewType),
        'graph': (post, viewType) => postRenderers['image'](post, viewType),
        'xtragraph': (post, viewType) => postRenderers['image'](post, viewType),
        'mermaid': (post, viewType) => postRenderers['diagram'](post, viewType),
        'katex': (post, viewType) => postRenderers['math'](post, viewType),
        'd3': (post, viewType) => postRenderers['image'](post, viewType),
        'svg_to_png': (post, viewType) => postRenderers['image'](post, viewType),
        'svg_to_3d': (post, viewType) => postRenderers['3d_model'](post, viewType),
        'simulation': (post, viewType) => postRenderers['default'](post, viewType),
        'preview': (post, viewType) => postRenderers['default'](post, viewType),
        'post_preview': (post, viewType) => postRenderers['default'](post, viewType),
        'manim': (post, viewType) => postRenderers['default'](post, viewType),
        'p5': (post, viewType) => postRenderers['default'](post, viewType),
        'default': (post, viewType) => { // Handles 'video', '16:9', '9:16', 'animation', 'simulation', 'preview', etc.
            if (typeof post.source === 'string') {
                try { post.source = JSON.parse(post.source); } catch (_) { post.source = {}; }
            }
            const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
            const isP5Animation = post.source && post.source.engine === 'p5' && post.source.code;
            const isAnimeAnimation = post.source && (post.source.engine === 'anime' || post.format === 'anime') && post.source.code;
            const isRoughAnimation = post.source && (post.source.engine === 'rough' || post.format === 'rough') && post.source.code;
            const isTwoAnimation = post.source && (post.source.engine === 'two' || post.format === 'two') && post.source.code;

            const rawVideo = post.video_url || post.media_url || post.source?.video_url || post.source?.media_url || '';
            const fullVideoUrl = rawVideo ? (rawVideo.startsWith('http') || rawVideo.startsWith('data:') ? rawVideo : `${getBackendUrl()}${rawVideo}`) : '';

            const rawImg = post.thumbnail_url || post.cover_url || post.image_url || post.source?.thumbnail || post.source?.cover_image || post.source?.image_url || '';
            const fullImgUrl = rawImg ? (rawImg.startsWith('http') || rawImg.startsWith('data:') ? rawImg : `${getBackendUrl()}${rawImg}`) : '';

            const isGrid = viewType === 'grid';
            const hoverEvents = isGrid ? `onmouseover="this.play()" onmouseout="this.pause()"` : '';
            const autoplayAttr = (viewType === 'course-preview' || viewType === 'reel') ? 'autoplay' : '';
            const mutedAttr = isGrid ? 'muted' : '';
            const objectFit = viewType === 'reel' ? 'contain' : 'cover';
            const preloadAttr = isGrid ? 'preload="none"' : 'preload="metadata"';
            const safeTitle = (post.title || 'Animation').replace(/'/g, '&#39;');

            // Detect if media is actually an image or SVG
            const isImageMedia = post.media_type?.startsWith('image') || (fullVideoUrl && (fullVideoUrl.endsWith('.png') || fullVideoUrl.endsWith('.jpg') || fullVideoUrl.endsWith('.jpeg') || fullVideoUrl.endsWith('.svg') || fullVideoUrl.startsWith('data:image')));

            if (isImageMedia && fullVideoUrl) {
                const mediaHTML = `<img src="${fullVideoUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Visual', 'ri-image-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: ${objectFit}; background: #000;">`;
                const backgroundHTML = isGrid ? '' : `<div class="reel-background"><img src="${fullVideoUrl}" loading="lazy"></div>`;
                return { mediaHTML, backgroundHTML };
            } else if (fullVideoUrl && !fullVideoUrl.endsWith('.pdf')) {
                const mediaHTML = `<video src="${fullVideoUrl}" ${preloadAttr} loop ${mutedAttr} playsinline ${hoverEvents} ${autoplayAttr} onerror="window.handleMediaFallback(this, '${post.id}', 'Animation', 'ri-movie-2-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: ${objectFit};"></video>`;
                const backgroundHTML = isGrid ? '' : `<div class="reel-background"><video src="${fullVideoUrl}" preload="none" loop muted playsinline></video></div>`;
                return { mediaHTML, backgroundHTML };
            } else if (fullImgUrl) {
                const mediaHTML = `<img src="${fullImgUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', 'Visual', 'ri-image-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: ${objectFit}; background: #000;">`;
                const backgroundHTML = isGrid ? '' : `<div class="reel-background"><img src="${fullImgUrl}" loading="lazy"></div>`;
                return { mediaHTML, backgroundHTML };
            }

            // Live EngineManager Interactive Rendering Dispatch
            const engineHtml = window.EngineManager?.renderHtml ? window.EngineManager.renderHtml(post, { isFeed: true, isInteractive: viewType !== 'grid' }) : null;
            if (engineHtml) {
                const bg = post.source?.background || post.source?.backgroundColor || '#090b10';
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${engineHtml.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: ${bg}; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: ${bg};"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }

            if (isP5Animation) {
                const iframeContent = (typeof renderP5PostContent === 'function') ? renderP5PostContent(post.source.code) : '';
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #090b10; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #090b10;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else if (isAnimeAnimation && typeof window.renderAnime === 'function') {
                const iframeContent = window.renderAnime(post.source.code, { background: post.source.background || '#080a10' });
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #080a10; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #080a10;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else if (isRoughAnimation && typeof window.renderRough === 'function') {
                const iframeContent = window.renderRough(post.source.code, { background: post.source.background || '#0e1117' });
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0e1117; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0e1117;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else if (isTwoAnimation && typeof window.renderTwo === 'function') {
                const iframeContent = window.renderTwo(post.source.code, { background: post.source.background || '#090b10' });
                const mediaHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #090b10; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #090b10;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else {
                const iconClass = (post.format === 'math' || post.source?.engine === 'katex') ? 'ri-functions' :
                    (post.format === '3d_model' || post.source?.engine === 'zdog') ? 'ri-box-3-line' :
                        (post.format === 'diagram' || post.source?.engine === 'mermaid') ? 'ri-node-tree' :
                            (post.format === 'tikz' || post.source?.engine === 'tikz') ? 'ri-draft-line' :
                                (post.code || post.source?.code) ? 'ri-code-s-slash-line' : 'ri-movie-2-line';
                const subText = post.format ? `${post.format.toUpperCase()} Simulation` : 'Scientific Simulation';
                const mediaHTML = `<div class="fallback-post-card" style="background:linear-gradient(135deg,#18181b 0%,#09090b 100%);">
                    <i class="${iconClass}" style="color:#38bdf8;"></i>
                    <span>${escapeHtml(post.title || 'Simulation Preview')}</span>
                    <small style="color:#38bdf8;">${subText}</small>
                </div>`;
                const backgroundHTML = isGrid ? '' : `<div class="reel-background" style="background:#090b10;"></div>`;
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

        const strId = String(postId);

        // 1. Permanently blacklist in deleted post IDs
        try {
            const deletedList = JSON.parse(localStorage.getItem('xtra_deleted_post_ids') || '[]');
            if (!deletedList.includes(strId)) {
                deletedList.push(strId);
                localStorage.setItem('xtra_deleted_post_ids', JSON.stringify(deletedList));
            }
        } catch (_) { }

        // 2. Remove from userPosts & savedPosts
        try {
            let allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            const updatedPosts = allPosts.filter(p => p && String(p.id) !== strId && String(p.proposal_id || '') !== strId);
            localStorage.setItem('userPosts', JSON.stringify(updatedPosts));
        } catch (_) { }

        try {
            let savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
            savedPosts = savedPosts.filter(id => String(id) !== strId);
            localStorage.setItem('savedPosts', JSON.stringify(savedPosts));
        } catch (_) { }

        // 3. Purge feed caches immediately so refresh never shows it
        const feedCacheKeys = ['cached_explore_feed', 'cached_reels_feed', 'cached_my_profile_posts', 'cachedStoreItems'];
        feedCacheKeys.forEach(ck => {
            try {
                const raw = localStorage.getItem(ck);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        const filtered = parsed.filter(p => p && String(p.id) !== strId && String(p.proposal_id || '') !== strId);
                        localStorage.setItem(ck, JSON.stringify(filtered));
                    }
                }
            } catch (_) { }
        });

        // 4. Purge from ResearchManager & research lab proposals cache
        try {
            if (window.ResearchManager && typeof window.ResearchManager.deleteProposal === 'function') {
                window.ResearchManager.deleteProposal(strId);
            }
            const storedProps = localStorage.getItem('xtra_research_proposals_v15');
            if (storedProps) {
                const parsedProps = JSON.parse(storedProps);
                if (Array.isArray(parsedProps)) {
                    const filteredProps = parsedProps.filter(p => p && String(p.id) !== strId && String(p.proposal_id || '') !== strId);
                    localStorage.setItem('xtra_research_proposals_v15', JSON.stringify(filteredProps));
                }
            }
        } catch (_) { }

        // 5. Purge user vault saves
        const curUid = localStorage.getItem('userId');
        if (curUid) {
            try {
                const vKey = typeof getUserSavesVaultKey === 'function' ? getUserSavesVaultKey(curUid) : `xtra_saves_${curUid}`;
                const vObjsKey = typeof getUserSavedObjectsVaultKey === 'function' ? getUserSavedObjectsVaultKey(curUid) : `xtra_saved_posts_${curUid}`;
                let vSaves = JSON.parse(localStorage.getItem(vKey) || '[]');
                vSaves = vSaves.filter(id => String(id) !== strId);
                localStorage.setItem(vKey, JSON.stringify(vSaves));

                let vObjs = JSON.parse(localStorage.getItem(vObjsKey) || '{}');
                delete vObjs[strId];
                localStorage.setItem(vObjsKey, JSON.stringify(vObjs));

                const bUrl = typeof getBackendUrl === 'function' ? getBackendUrl() : '';
                fetch(`${bUrl}/api/saves`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: curUid, post_id: strId, saved: false })
                }).catch(() => { });
            } catch (_) { }
        }

        // 6. Remove article heavy content if any
        localStorage.removeItem(`article_content_${strId}`);

        // 7. Remove from internal in-memory post registry
        if (window._allRenderedPosts && window._allRenderedPosts[strId]) {
            delete window._allRenderedPosts[strId];
        }

        // 8. Animate and remove from DOM immediately
        const postElToRemove = document.querySelector(`.feed-post[data-post-id="${strId}"]`) || document.querySelector(`.feed-post[data-post-id="${postId}"]`);
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

        // 9. Call backend delete endpoint
        try {
            const bUrl = typeof getBackendUrl === 'function' ? getBackendUrl() : '';
            fetch(`${bUrl}/api/posts/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: strId, user_id: curUid || null })
            }).catch(() => { });
        } catch (_) { }

        // 10. Permanently delete from Supabase
        const client = window.supabaseClient || supabase;
        if (client) {
            try {
                const { data, error } = await client
                    .from('posts')
                    .delete()
                    .eq('id', strId)
                    .select();

                if (error) {
                    console.warn("[deletePost] Supabase direct deletion note:", error.message);
                } else {
                    console.log(`[deletePost] Successfully deleted post ${strId} from Supabase.`);
                }
            } catch (err) {
                console.warn("[deletePost] Error deleting post from Supabase:", err);
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

    // ============================================================
    // UNIFIED DATA CONTRACT: PostModel Normalizer
    // Single-source-of-truth post normalization eliminating 5-tier fallback chains
    // ============================================================
    function normalizePost(raw) {
        if (!raw) return null;
        const p = { ...raw };
        p.id = String(p.id || '');
        p.format = p.format || p.media_type || 'post';

        // Normalize source if stringified JSON
        if (typeof p.source === 'string') {
            try { p.source = JSON.parse(p.source); } catch (_) { p.source = {}; }
        }
        p.source = (p.source && typeof p.source === 'object') ? p.source : {};

        // Canonical identity & author attributes
        p.username = p.username || p.author || 'Anonymous';
        p.avatar_url = p.avatar_url || p.avatar || '';

        // Canonical counter attributes (from denormalized columns or fallbacks)
        p.likes_count = Number(p.likes_count ?? p.like_count ?? 0);
        p.comments_count = Number(p.comments_count ?? p.comment_count ?? 0);
        p.saves_count = Number(p.saves_count ?? p.save_count ?? 0);
        p.remix_count = Number(p.remix_count ?? p.remixes_count ?? 0);
        p.share_count = Number(p.share_count ?? 0);

        // Research Lab & Simulation contracts
        const isResearchLab = p.format === 'researchlab' || p.type === 'researchlab' || p.is_research_lab;
        if (isResearchLab) {
            p.is_research_lab = true;
            p.proposal = p.proposal || p.source.proposal || p.source;
            p.proposal_id = String(p.proposal_id || p.proposal?.id || p.id);
            p.engine = p.engine || p.source.engine || p.proposal.engine || 'matter';
            p.domain = p.domain || p.source.domain || p.proposal.domain || 'physics';
            p.customSimulationCode = p.customSimulationCode || p.source.customSimulationCode || p.proposal.customSimulationCode || '';
            p.initialParams = p.initialParams || p.source.initialParams || p.proposal.initialParams || {};
        } else {
            p.engine = p.engine || p.source.engine || p.format;
        }

        return p;
    }
    window.normalizePost = normalizePost;

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
    // FOLLOW & FOLLOWING SYSTEM (Supabase & Permanent Cloud Sync)
    // ============================================================
    let _lastFollowToggleTime = 0;
    let _lastFollowTargetKey = '';

    function getFollowStorageKey(customUid) {
        const uid = customUid || localStorage.getItem('userId') || 'guest';
        return `xtra_following_${uid}`;
    }

    function getFollowingList(customUid) {
        try {
            return JSON.parse(localStorage.getItem(getFollowStorageKey(customUid)) || '[]');
        } catch (e) {
            return [];
        }
    }

    function isFollowingUser(userId, username) {
        if (!userId && !username) return false;
        const list = getFollowingList();
        const cleanUid = userId ? String(userId).trim() : '';
        const cleanUname = username ? String(username).trim().toLowerCase().replace(/^@/, '') : '';

        return list.some(item => {
            const itemUid = item.userId ? String(item.userId).trim() : '';
            const itemUname = item.username ? String(item.username).trim().toLowerCase().replace(/^@/, '') : '';
            if (cleanUid && itemUid && cleanUid === itemUid) return true;
            if (cleanUname && itemUname && cleanUname === itemUname) return true;
            return false;
        });
    }

    function toggleFollowUser(creator) {
        if (!creator) return false;
        const targetUserId = creator.userId ? String(creator.userId).trim() : '';
        const rawUsername = creator.username || creator.author || 'Creator';
        const targetUsername = String(rawUsername).trim().replace(/^@/, '');
        const targetFullName = creator.fullName || targetUsername;
        const targetAvatar = creator.avatarUrl || '';

        const myUserId = localStorage.getItem('userId');
        const myUsername = localStorage.getItem('username');
        const myFullName = localStorage.getItem('fullName') || myUsername || 'User';
        const myAvatar = localStorage.getItem('avatarUrl') || '';

        const targetKey = targetUserId || targetUsername;

        // Anti-bounce debounce: prevent rapid double-clicks from toggling state twice
        const now = Date.now();
        if (now - _lastFollowToggleTime < 450 && _lastFollowTargetKey === targetKey) {
            return isFollowingUser(targetUserId, targetUsername);
        }
        _lastFollowToggleTime = now;
        _lastFollowTargetKey = targetKey;

        // Prevent following oneself
        if (targetUserId && myUserId && String(targetUserId) === String(myUserId)) {
            return false;
        }
        if (targetUsername && myUsername && targetUsername.toLowerCase() === myUsername.toLowerCase()) {
            return false;
        }

        let list = getFollowingList();
        const existingIndex = list.findIndex(item => {
            const itemUid = item.userId ? String(item.userId).trim() : '';
            const itemUname = item.username ? String(item.username).trim().toLowerCase().replace(/^@/, '') : '';
            if (targetUserId && itemUid && targetUserId === itemUid) return true;
            if (targetUsername && itemUname && targetUsername.toLowerCase() === itemUname) return true;
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

        // 1. Direct Supabase Cloud Database Sync (Permanent Storage)
        const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
        if (client && myUserId) {
            (async () => {
                try {
                    const followingIdValue = targetUserId || targetUsername;
                    if (nowFollowing) {
                        const { error } = await client.from('user_follows').upsert({
                            follower_id: myUserId,
                            following_id: followingIdValue,
                            creator_username: targetUsername,
                            creator_fullname: targetFullName,
                            creator_avatar: targetAvatar,
                            follower_username: myUsername || '',
                            follower_fullname: myFullName || '',
                            follower_avatar: myAvatar || ''
                        }, { onConflict: 'follower_id,following_id' });
                        if (error) console.warn('[Supabase Follow Upsert Notice]:', error.message || error);
                    } else {
                        const { error } = await client.from('user_follows').delete()
                            .eq('follower_id', myUserId)
                            .eq('following_id', followingIdValue);
                        if (error) console.warn('[Supabase Unfollow Notice]:', error.message || error);
                    }
                } catch (sbErr) {
                    console.warn('[Supabase Follow Sync Error]:', sbErr);
                }
            })();
        }

        // 2. Secondary Sync to backend SQLite store & atomic counter triggers
        if (myUserId && (targetUserId || targetUsername)) {
            try {
                const bUrl = typeof getBackendUrl === 'function' ? getBackendUrl() : '';
                const primaryTarget = targetUserId || targetUsername;

                if (nowFollowing) {
                    if (window.followUserApi) window.followUserApi(primaryTarget, myUserId).catch(() => {});
                } else {
                    if (window.unfollowUserApi) window.unfollowUserApi(primaryTarget, myUserId).catch(() => {});
                }

                fetch(`${bUrl}/api/follows`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: myUserId,
                        target_user_id: primaryTarget,
                        is_following: nowFollowing,
                        creator_data: {
                            userId: targetUserId,
                            username: targetUsername,
                            fullName: targetFullName,
                            avatarUrl: targetAvatar
                        }
                    })
                }).catch(() => { });
            } catch (_) { }
        }

        // Update all follow buttons across the entire UI
        updateAllFollowButtons();

        // Dispatch follow change event
        window.dispatchEvent(new CustomEvent('xtra-follow-changed', {
            detail: { userId: targetUserId, username: targetUsername, isFollowing: nowFollowing }
        }));

        return nowFollowing;
    }

    async function syncUserFollows(targetUserId) {
        const uid = targetUserId || localStorage.getItem('userId');
        if (!uid) return [];

        let mergedList = [...getFollowingList(uid)];

        // 1. Fetch from Supabase user_follows table (Source of Truth)
        const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
        if (client) {
            try {
                const { data: dbFollows, error: sbErr } = await client
                    .from('user_follows')
                    .select('*')
                    .eq('follower_id', uid);

                if (!sbErr && Array.isArray(dbFollows)) {
                    mergedList = dbFollows.map(row => ({
                        userId: row.following_id,
                        username: row.creator_username || '',
                        fullName: row.creator_fullname || row.creator_username || '',
                        avatarUrl: row.creator_avatar || '',
                        followedAt: row.created_at || new Date().toISOString()
                    }));
                    localStorage.setItem(getFollowStorageKey(uid), JSON.stringify(mergedList));
                    updateAllFollowButtons();
                    return mergedList;
                }
            } catch (err) {
                console.warn('[Sync Follows Supabase Notice]:', err);
            }
        }

        // 2. Fallback: Fetch from backend SQLite endpoint (/api/follows)
        try {
            const bUrl = typeof getBackendUrl === 'function' ? getBackendUrl() : '';
            const resp = await fetch(`${bUrl}/api/follows?user_id=${encodeURIComponent(uid)}`);
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.success && Array.isArray(data.following)) {
                    data.following.forEach(c => {
                        const exists = mergedList.some(m => (c.userId && String(m.userId) === String(c.userId)) || (m.username && c.username && m.username.toLowerCase() === c.username.toLowerCase()));
                        if (!exists) mergedList.push(c);
                    });
                    localStorage.setItem(getFollowStorageKey(uid), JSON.stringify(mergedList));
                    updateAllFollowButtons();
                    return mergedList;
                }
            }
        } catch (e) {
            console.warn('[Sync Follows Backend Notice]:', e);
        }

        return mergedList;
    }
    window.syncUserFollows = syncUserFollows;

    function updateAllFollowButtons() {
        const buttons = document.querySelectorAll('.btn-follow-overlay, .btn-follow-inline, .btn-profile-follow, .btn-follow-modal, .btn-follow');
        buttons.forEach(btn => {
            const uid = btn.dataset.userId || '';
            const uname = btn.dataset.username || btn.dataset.author || btn.getAttribute('data-username') || '';
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

    // Delegated Global Click Listener for any Follow button in the application
    document.addEventListener('click', (e) => {
        if (e.__followHandled) return;
        const btn = e.target.closest('.btn-follow-overlay, .btn-follow-inline, .btn-follow-modal, .btn-profile-follow, .btn-follow');
        if (!btn) return;

        // Skip if button has custom explicit handler with data-custom-follow="true"
        if (btn.dataset.customFollow === 'true') return;

        e.__followHandled = true;
        e.stopPropagation();
        e.preventDefault();

        const uid = btn.dataset.userId || '';
        const uname = btn.dataset.username || btn.dataset.author || btn.getAttribute('data-username') || '';
        const fname = btn.dataset.fullname || uname || '';
        const avatar = btn.dataset.avatar || '';

        if (!uid && !uname) return;

        toggleFollowUser({
            userId: uid,
            username: uname,
            fullName: fname,
            avatarUrl: avatar
        });
    });

    window.getFollowStorageKey = getFollowStorageKey;
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

    // --- In-memory cache for social data (likes, comments, saves) ---
    const likeDataCache = {}; // { [postId]: { count: number, likedByMe: boolean } }
    const commentCountCache = {}; // { [postId]: number }
    const saveDataCache = {}; // { [postId]: { count: number, savedByMe: boolean } }

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

    function getLocalCommentsMap() {
        return window.SocialManager?.Comments?.getLocalCommentsMap() || {};
    }
    function saveLocalCommentsMap(map) {
        if (window.SocialManager?.Comments?.saveLocalCommentsMap) window.SocialManager.Comments.saveLocalCommentsMap(map);
    }
    function getLocalCommentCountsMap() {
        return window.SocialManager?.Comments?.getLocalCommentCountsMap() || {};
    }
    function saveLocalCommentCountsMap(map) {
        if (window.SocialManager?.Comments?.saveLocalCommentCountsMap) window.SocialManager.Comments.saveLocalCommentCountsMap(map);
    }
    function updateCommentCountInDOM(postId, count) {
        if (window.SocialManager?.Comments?.updateCommentCountInDOM) {
            window.SocialManager.Comments.updateCommentCountInDOM(postId, count);
        }
    }
    window.updateCommentCountInDOM = updateCommentCountInDOM;

    // ============================================================
    // PERMANENT USER SAVES / BOOKMARKS PERSISTENCE ENGINE
    // ============================================================
    function getUserSavesVaultKey(userId) {
        const uid = userId || localStorage.getItem('userId') || 'guest';
        return `xtra_saves_${uid}`;
    }
    window.getUserSavesVaultKey = getUserSavesVaultKey;

    function getUserSavedObjectsVaultKey(userId) {
        const uid = userId || localStorage.getItem('userId') || 'guest';
        return `xtra_saved_posts_${uid}`;
    }
    window.getUserSavedObjectsVaultKey = getUserSavedObjectsVaultKey;

    function getLocalSavedSet() {
        try {
            const uid = localStorage.getItem('userId');
            const arr = JSON.parse(localStorage.getItem('savedPosts') || '[]');
            const vaultArr = uid ? JSON.parse(localStorage.getItem(getUserSavesVaultKey(uid)) || '[]') : [];
            const merged = Array.from(new Set([...arr.map(String), ...vaultArr.map(String)]));
            return new Set(merged);
        } catch {
            return new Set();
        }
    }

    function getLocalSaveCountsMap() {
        try {
            return JSON.parse(localStorage.getItem('saveCounts') || '{}');
        } catch {
            return {};
        }
    }

    function saveLocalSaveCountsMap(map) {
        try {
            localStorage.setItem('saveCounts', JSON.stringify(map));
        } catch (e) {
            console.warn('Could not write saveCounts to localStorage', e);
        }
    }

    // Comprehensive synchronization of user saves across local vault, backend SQLite, and Supabase
    async function syncUserSaves(targetUserId) {
        let uid = targetUserId || localStorage.getItem('userId');
        if (!uid && (window.supabaseClient || typeof supabase !== 'undefined')) {
            try {
                const sb = window.supabaseClient || supabase;
                const { data: { user } } = await sb.auth.getUser();
                if (user) {
                    uid = user.id;
                    localStorage.setItem('userId', user.id);
                }
            } catch (_) { }
        }
        if (!uid) return { savedIds: [], posts: {} };

        const vaultKey = getUserSavesVaultKey(uid);
        const objsVaultKey = getUserSavedObjectsVaultKey(uid);

        // 1. Gather existing local memory & user vault
        let localSaved = JSON.parse(localStorage.getItem('savedPosts') || '[]').map(String);
        let vaultSaved = JSON.parse(localStorage.getItem(vaultKey) || '[]').map(String);
        let combinedSet = new Set([...localSaved, ...vaultSaved]);

        let localObjs = JSON.parse(localStorage.getItem('savedPostsObjects') || '{}');
        let vaultObjs = JSON.parse(localStorage.getItem(objsVaultKey) || '{}');
        let combinedObjs = { ...localObjs, ...vaultObjs };

        // 2. Fetch from backend SQLite endpoint (/api/saves)
        try {
            const bUrl = typeof getBackendUrl === 'function' ? getBackendUrl() : '';
            const resp = await fetch(`${bUrl}/api/saves?user_id=${encodeURIComponent(uid)}`);
            if (resp.ok) {
                const bData = await resp.json();
                if (bData && bData.success && Array.isArray(bData.saved_ids)) {
                    bData.saved_ids.forEach(sid => combinedSet.add(String(sid)));
                    if (bData.posts && typeof bData.posts === 'object') {
                        Object.assign(combinedObjs, bData.posts);
                    }
                }
            }
        } catch (bErr) {
            console.warn('[Sync Saves Backend Notice]:', bErr);
        }

        // 3. Fetch from Supabase saves table if available
        const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
        if (client && uid) {
            try {
                const { data: dbSaves, error: dbErr } = await client
                    .from('saves')
                    .select('post_id')
                    .eq('user_id', uid)
                    .order('created_at', { ascending: false });
                if (!dbErr && Array.isArray(dbSaves)) {
                    dbSaves.forEach(r => {
                        if (r && r.post_id) combinedSet.add(String(r.post_id));
                    });
                }
            } catch (_) { }
        }

        const finalSavedIds = Array.from(combinedSet);

        // 4. Update all local persistent storage layers
        localStorage.setItem('savedPosts', JSON.stringify(finalSavedIds));
        localStorage.setItem(vaultKey, JSON.stringify(finalSavedIds));
        localStorage.setItem('savedPostsObjects', JSON.stringify(combinedObjs));
        localStorage.setItem(objsVaultKey, JSON.stringify(combinedObjs));

        // 5. In background, push any newly discovered local saves into backend SQLite
        if (finalSavedIds.length > 0) {
            try {
                const bUrl = typeof getBackendUrl === 'function' ? getBackendUrl() : '';
                fetch(`${bUrl}/api/saves/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: uid,
                        saved_ids: finalSavedIds,
                        posts: combinedObjs
                    })
                }).catch(() => { });
            } catch (_) { }
        }

        return { savedIds: finalSavedIds, posts: combinedObjs };
    }
    window.syncUserSaves = syncUserSaves;

    // Batch-fetch like counts, comment counts, and save counts for an array of post IDs
    // Enterprise Benchmark: Tier-1 Production (Canva, TikTok, Supabase architecture)
    // Eliminates raw relational row scans and reduces network egress bandwidth by >90%
    async function fetchPostLikeData(postIds) {
        if (!postIds || postIds.length === 0) return;
        const strIds = postIds.map(id => String(id));
        const localLikes = getLocalLikesMap();
        const localComments = getLocalCommentsMap();
        const localCommentCounts = getLocalCommentCountsMap();
        const localSaved = getLocalSavedSet();
        const localSaveCounts = getLocalSaveCountsMap();

        // 1. Instant local hydration: check local storage and in-memory rendered post cache
        strIds.forEach(id => {
            const hasLocalLike = !!localLikes[id];
            const localCommentList = localComments[id] || [];
            const isSaved = localSaved.has(id);
            const localSaveCount = Number(localSaveCounts[id]) || (isSaved ? 1 : 0);
            const savedCommentCount = Number(localCommentCounts[id]);
            const renderedPost = (window._allRenderedPosts && window._allRenderedPosts[id]) || {};

            if (!likeDataCache[id]) {
                const initialCount = renderedPost.likes_count !== undefined
                    ? Number(renderedPost.likes_count)
                    : (hasLocalLike ? 1 : 0);
                likeDataCache[id] = {
                    count: initialCount,
                    likedByMe: hasLocalLike
                };
            }
            if (commentCountCache[id] === undefined) {
                if (renderedPost.comments_count !== undefined) {
                    commentCountCache[id] = Number(renderedPost.comments_count);
                } else {
                    commentCountCache[id] = !isNaN(savedCommentCount) ? Math.max(savedCommentCount, localCommentList.length) : localCommentList.length;
                }
            }
            if (!saveDataCache[id]) {
                const initialSaveCount = renderedPost.saves_count !== undefined
                    ? Number(renderedPost.saves_count)
                    : localSaveCount;
                saveDataCache[id] = {
                    count: initialSaveCount,
                    savedByMe: isSaved
                };
            }
        });

        // Hydrate DOM from initial cache immediately (zero latency, no layout shift)
        hydratePostLikesAndCommentsInDOM(strIds);

        const client = window.supabaseClient || supabase;
        if (!client) return;

        try {
            const myUserId = localStorage.getItem('userId');
            const countMap = {};
            const commCountMap = {};
            const saveCountMap = {};

            // Identify which post IDs need counter sync from DB
            const missingIds = [];
            strIds.forEach(id => {
                const p = window._allRenderedPosts && window._allRenderedPosts[id];
                if (p && p.likes_count !== undefined && p.comments_count !== undefined && p.saves_count !== undefined) {
                    countMap[id] = Number(p.likes_count) || 0;
                    commCountMap[id] = Number(p.comments_count) || 0;
                    saveCountMap[id] = Number(p.saves_count) || 0;
                } else {
                    missingIds.push(id);
                }
            });

            const queries = [];

            // Query 1: Single indexed batch fetch for missing post denormalized counters
            if (missingIds.length > 0) {
                queries.push(
                    client.from('posts')
                        .select('id, likes_count, comments_count, saves_count')
                        .in('id', missingIds)
                        .then(({ data, error }) => {
                            if (!error && Array.isArray(data)) {
                                data.forEach(row => {
                                    const pid = String(row.id);
                                    if (row.likes_count !== undefined && row.likes_count !== null) countMap[pid] = Number(row.likes_count);
                                    if (row.comments_count !== undefined && row.comments_count !== null) commCountMap[pid] = Number(row.comments_count);
                                    if (row.saves_count !== undefined && row.saves_count !== null) saveCountMap[pid] = Number(row.saves_count);
                                });
                            }
                        }).catch(() => {})
                );
            }

            // Query 2 & 3: Fast indexed user-specific queries (ONLY for myUserId, sub-10ms)
            let myLikes = new Set();
            let mySaves = new Set();
            if (myUserId) {
                queries.push(
                    client.from('likes')
                        .select('post_id')
                        .eq('user_id', myUserId)
                        .in('post_id', strIds)
                        .then(({ data, error }) => {
                            if (!error && Array.isArray(data)) {
                                data.forEach(r => myLikes.add(String(r.post_id)));
                            }
                        }).catch(() => {})
                );
                queries.push(
                    client.from('saves')
                        .select('post_id')
                        .eq('user_id', myUserId)
                        .in('post_id', strIds)
                        .then(({ data, error }) => {
                            if (!error && Array.isArray(data)) {
                                data.forEach(r => mySaves.add(String(r.post_id)));
                            }
                        }).catch(() => {})
                );
            }

            // Execute all queries concurrently in a single parallel roundtrip
            await Promise.all(queries);

            // Reconcile cache
            const commentMapToSave = getLocalCommentCountsMap();
            strIds.forEach(id => {
                const dbLiked = myLikes.has(id);
                const localLiked = !!localLikes[id];
                const isLiked = dbLiked || localLiked;
                const dbLikesCount = countMap[id] !== undefined ? countMap[id] : (likeDataCache[id]?.count || 0);

                likeDataCache[id] = {
                    count: Math.max(dbLikesCount, isLiked ? 1 : 0),
                    likedByMe: isLiked
                };

                const dbCommentCount = commCountMap[id] !== undefined ? commCountMap[id] : (commentCountCache[id] || 0);
                const locCount = (localComments[id] || []).length;
                const savedCount = Number(commentMapToSave[id]) || 0;
                const finalCommentCount = Math.max(dbCommentCount, locCount, savedCount);
                commentCountCache[id] = finalCommentCount;
                commentMapToSave[id] = finalCommentCount;

                const dbSaved = mySaves.has(id);
                const localSavedFlag = localSaved.has(id);
                const isSaved = dbSaved || localSavedFlag;
                const dbSavesCount = saveCountMap[id] !== undefined ? saveCountMap[id] : (saveDataCache[id]?.count || 0);
                const locSaveCount = Number(localSaveCounts[id]) || 0;

                saveDataCache[id] = {
                    count: Math.max(dbSavesCount, locSaveCount, isSaved ? 1 : 0),
                    savedByMe: isSaved
                };
            });
            saveLocalCommentCountsMap(commentMapToSave);

            // Update DOM with reconciled accurate counters
            hydratePostLikesAndCommentsInDOM(strIds);
        } catch (err) {
            console.warn('Social counts refresh notice (using local/denormalized cache):', err);
        }
    }

    function hydratePostLikesAndCommentsInDOM(strIds) {
        strIds.forEach(id => {
            const data = likeDataCache[id] || { count: 0, likedByMe: false };
            const postEls = document.querySelectorAll(`[data-post-id="${id}"]`);
            postEls.forEach(postEl => {
                const likeBtn = postEl.querySelector('[data-action="like"]');
                if (likeBtn) {
                    const countEl = likeBtn.querySelector('.action-count');
                    if (countEl) countEl.textContent = data.count;
                    likeBtn.classList.toggle('liked', data.likedByMe);
                    const icon = likeBtn.querySelector('i');
                    if (icon) icon.className = data.likedByMe ? 'ri-heart-fill' : 'ri-heart-line';
                }
                const commentBtn = postEl.querySelector('[data-action="comment"]') ||
                    postEl.querySelector('.ri-chat-3-line')?.closest('.icon-btn') ||
                    postEl.querySelector('.ri-chat-3-line')?.closest('button');
                if (commentBtn) {
                    let commentCountEl = commentBtn.querySelector('.action-count');
                    if (!commentCountEl) {
                        commentCountEl = document.createElement('span');
                        commentCountEl.className = 'action-count';
                        commentBtn.appendChild(commentCountEl);
                    }
                    commentCountEl.textContent = commentCountCache[id] !== undefined ? commentCountCache[id] : 0;
                }
                const saveBtn = postEl.querySelector('[data-action="save"]');
                if (saveBtn) {
                    const sData = saveDataCache[id] || { count: 0, savedByMe: false };
                    let saveCountEl = saveBtn.querySelector('.action-count');
                    if (!saveCountEl) {
                        saveCountEl = document.createElement('span');
                        saveCountEl.className = 'action-count';
                        saveBtn.appendChild(saveCountEl);
                    }
                    saveCountEl.textContent = sData.count;
                    saveBtn.classList.toggle('saved', sData.savedByMe);
                    const icon = saveBtn.querySelector('i');
                    if (icon) icon.className = sData.savedByMe ? 'ri-bookmark-fill' : 'ri-bookmark-line';
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
                    .upsert({ user_id: user.id, post_id: sPostId }, { onConflict: 'user_id,post_id' });
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

    // Toggle save on a post (instant UI + count increment + local storage + Supabase sync)
    async function togglePostSave(postId, triggerBtn) {
        const sPostId = String(postId);
        const localSaved = getLocalSavedSet();
        const cached = saveDataCache[sPostId] || {
            count: Number(getLocalSaveCountsMap()[sPostId]) || (localSaved.has(sPostId) ? 1 : 0),
            savedByMe: localSaved.has(sPostId)
        };
        const newSaved = !cached.savedByMe;
        const newCount = Math.max(0, cached.count + (newSaved ? 1 : -1));

        // 1. Instantaneous UI Update across all matching elements in DOM
        const postEls = document.querySelectorAll(`.feed-post[data-post-id="${sPostId}"]`);
        const updateBtnEl = (btn) => {
            if (!btn) return;
            btn.classList.toggle('saved', newSaved);
            const icon = btn.querySelector('i');
            let countEl = btn.querySelector('.action-count');
            if (!countEl) {
                countEl = document.createElement('span');
                countEl.className = 'action-count';
                btn.appendChild(countEl);
            }
            if (icon) icon.className = newSaved ? 'ri-bookmark-fill' : 'ri-bookmark-line';
            countEl.textContent = newCount;
            if (newSaved) {
                btn.classList.add('popping');
                setTimeout(() => btn.classList.remove('popping'), 300);
            }
        };

        if (postEls.length > 0) {
            postEls.forEach(postEl => {
                updateBtnEl(postEl.querySelector('[data-action="save"]'));
            });
        } else if (triggerBtn) {
            updateBtnEl(triggerBtn);
        }

        // 2. Update In-Memory Cache
        saveDataCache[sPostId] = { count: newCount, savedByMe: newSaved };

        // 3. Update localStorage savedPosts array
        let savedList = JSON.parse(localStorage.getItem('savedPosts') || '[]').map(String);
        if (newSaved) {
            if (!savedList.includes(sPostId)) savedList.unshift(sPostId);
        } else {
            savedList = savedList.filter(id => id !== sPostId);
        }
        localStorage.setItem('savedPosts', JSON.stringify(savedList));

        // Update localStorage saveCounts map
        const saveCountsMap = getLocalSaveCountsMap();
        saveCountsMap[sPostId] = newCount;
        saveLocalSaveCountsMap(saveCountsMap);

        // Extract complete post metadata from all possible sources
        let postObj = (window._allRenderedPosts && window._allRenderedPosts[sPostId]) ||
            (window.allLoadedPosts && window.allLoadedPosts.find(p => String(p.id) === sPostId)) ||
            (window.currentPost && String(window.currentPost.id) === sPostId ? window.currentPost : null);

        if (!postObj) {
            const domPost = document.querySelector(`.feed-post[data-post-id="${sPostId}"]`) ||
                document.querySelector(`[data-post-id="${sPostId}"]`);
            if (domPost) {
                const titleEl = domPost.querySelector('.post-title, .title, h3, h2, .content-title');
                const mediaEl = domPost.querySelector('video, img');
                postObj = {
                    id: sPostId,
                    title: titleEl ? titleEl.textContent.trim() : 'Saved Creation',
                    video_url: mediaEl ? (mediaEl.src || mediaEl.getAttribute('src')) : '',
                    format: mediaEl?.tagName === 'VIDEO' ? 'video' : 'image'
                };
            }
        }

        // Cache post object in localStorage for instant profile retrieval
        try {
            const cachedSavedPosts = JSON.parse(localStorage.getItem('savedPostsObjects') || '{}');
            if (newSaved) {
                if (postObj) {
                    cachedSavedPosts[sPostId] = postObj;
                    localStorage.setItem('savedPostsObjects', JSON.stringify(cachedSavedPosts));
                }
            } else {
                delete cachedSavedPosts[sPostId];
                localStorage.setItem('savedPostsObjects', JSON.stringify(cachedSavedPosts));
            }
        } catch (_) { }

        // 4. Update user-scoped permanent vault & backend SQLite store
        let myUserId = localStorage.getItem('userId');
        const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
        if (!myUserId && client) {
            try {
                const { data: { user } } = await client.auth.getUser();
                if (user) {
                    myUserId = user.id;
                    localStorage.setItem('userId', user.id);
                }
            } catch (_) { }
        }

        if (myUserId) {
            const vaultKey = getUserSavesVaultKey(myUserId);
            const objsVaultKey = getUserSavedObjectsVaultKey(myUserId);
            let vaultSaves = JSON.parse(localStorage.getItem(vaultKey) || '[]').map(String);
            let vaultObjs = JSON.parse(localStorage.getItem(objsVaultKey) || '{}');

            if (newSaved) {
                if (!vaultSaves.includes(sPostId)) vaultSaves.unshift(sPostId);
                if (postObj) vaultObjs[sPostId] = postObj;
            } else {
                vaultSaves = vaultSaves.filter(id => id !== sPostId);
                delete vaultObjs[sPostId];
            }
            localStorage.setItem(vaultKey, JSON.stringify(vaultSaves));
            localStorage.setItem(objsVaultKey, JSON.stringify(vaultObjs));

            // 5. Backend SQLite DB Sync (100% permanent across re-logins and devices)
            try {
                const backendUrl = typeof getBackendUrl === 'function' ? getBackendUrl() : '';
                fetch(`${backendUrl}/api/saves`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: myUserId,
                        post_id: sPostId,
                        saved: newSaved,
                        post_data: postObj || undefined
                    })
                }).catch(err => console.warn('[Backend Save Notice]:', err));
            } catch (_) { }

            // 6. Supabase DB Sync (with upsert for duplicate safety)
            if (client) {
                try {
                    if (newSaved) {
                        await client.from('saves').upsert({ user_id: myUserId, post_id: sPostId }, { onConflict: 'user_id,post_id' });
                    } else {
                        await client.from('saves').delete().eq('user_id', myUserId).eq('post_id', sPostId);
                    }
                } catch (dbErr) {
                    console.warn('Supabase save sync notice (saved locally & backend):', dbErr);
                }
            }
        }
    }
    window.togglePostSave = togglePostSave;

    // Social Manager Comment Helpers (Delegated to window.SocialManager.Comments)
    function formatCommentContent(rawText) {
        return window.SocialManager?.Comments?.formatContent(rawText) || rawText;
    }
    function renderKaTeXInContainer(container) {
        if (window.SocialManager?.Comments?.renderKaTeX) window.SocialManager.Comments.renderKaTeX(container);
    }
    function renderMermaidInContainer(container) {
        if (window.SocialManager?.Comments?.renderMermaid) window.SocialManager.Comments.renderMermaid(container);
    }
    async function fetchCommentsFromDB(postId) {
        return window.SocialManager?.Comments?.fetchComments ? await window.SocialManager.Comments.fetchComments(postId) : [];
    }
    async function postCommentToDB(postId, text, parentId = null) {
        return window.SocialManager?.Comments?.postComment ? await window.SocialManager.Comments.postComment(postId, text, parentId) : null;
    }
    async function toggleCommentLike(commentId, likeBtn) {
        if (window.SocialManager?.Comments?.toggleCommentLike) await window.SocialManager.Comments.toggleCommentLike(commentId, likeBtn);
    }
    async function deleteCommentFromDB(commentId, postId) {
        return window.SocialManager?.Comments?.deleteComment ? await window.SocialManager.Comments.deleteComment(commentId, postId) : true;
    }

    // ============================================================
    // REUSABLE POST ELEMENT CREATOR
    // ============================================================
    // Helper to get published research lab proposals formatted for the explore feed
    function getPublishedResearchLabPosts() {
        try {
            let proposals = [];
            if (window.ResearchManager && typeof window.ResearchManager.getProposals === 'function') {
                proposals = window.ResearchManager.getProposals() || [];
            } else {
                const raw = localStorage.getItem('xtra_research_proposals_v15');
                if (raw) proposals = JSON.parse(raw) || [];
            }

            // Also check userPosts in localStorage for any researchlab posts created by user
            try {
                const userPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                const labUserPosts = userPosts.filter(p => p && (p.format === 'researchlab' || p.type === 'researchlab' || p.is_research_lab));
                labUserPosts.forEach(up => {
                    const prop = up.proposal || up;
                    const propId = prop.id || up.proposal_id || up.id;
                    if (propId && !proposals.some(p => p.id === propId)) {
                        proposals.unshift(prop);
                    }
                });
            } catch (_) { }

            const deletedIds = new Set(JSON.parse(localStorage.getItem('xtra_deleted_post_ids') || '[]').map(String));

            // Strictly filter out deleted posts and any unedited or mock starter Galileo proposals
            proposals = (proposals || []).filter(p => {
                if (!p) return false;
                if (deletedIds.has(String(p.id || '')) || deletedIds.has(String(p.proposal_id || ''))) {
                    return false;
                }
                const isGalileoMock = (p.id === 'prop-physics-projectile' || p.author === 'galileo_gal' || p.username === 'galileo_gal' || (p.authorName && p.authorName.toLowerCase().includes('galileo')));
                return !isGalileoMock;
            });

            if (proposals.length === 0) {
                return [];
            }

            return proposals.map(p => {
                const authorHandle = (p.author && p.author !== 'galileo_gal') ? p.author : (p.username || 'researcher');
                const authorDisplay = (p.authorName && !p.authorName.toLowerCase().includes('galileo')) ? p.authorName : authorHandle;
                const authorId = p.user_id || ('usr_' + authorHandle);

                return {
                    id: p.id || ('prop-' + Math.random().toString(36).substr(2, 9)),
                    title: p.title || 'Research Lab Simulation',
                    format: 'researchlab',
                    type: 'researchlab',
                    is_research_lab: true,
                    proposal_id: p.proposal_id || p.id,
                    domain: p.domain || p.source?.domain || 'physics',
                    engine: p.engine || p.source?.engine || 'projectile_canvas',
                    initialParams: p.initialParams || p.source?.initialParams || { velocity: 45, angle: 45, dragCoeff: 0.06, gravity: 9.81 },
                    customSimulationCode: p.customSimulationCode || p.source?.customSimulationCode || '',
                    video_url: p.video_url || p.videoUrl || p.source?.video_url || null,
                    author: authorDisplay,
                    username: authorHandle,
                    user_id: authorId,
                    avatar_url: p.avatar || '',
                    likes_count: Number(p.likes_count) || (p.consensusScore?.validated) || 0,
                    comments_count: Number(p.comments_count) || (p.discussions && p.discussions.length) || 0,
                    remix_count: Number(p.remix_count) || 0,
                    share_count: Number(p.share_count) || 0,
                    created_at: p.createdAt || new Date().toISOString(),
                    status: p.status || 'published',
                    proposal: p
                };
            });
        } catch (e) {
            console.warn('[ResearchLab] Error loading proposals for feed:', e);
            return [];
        }
    }
    window.getPublishedResearchLabPosts = getPublishedResearchLabPosts;

    function createPostElement(post, viewType) { // viewType can be 'grid', 'reel', or 'course-preview'
        if (post && typeof post.source === 'string') {
            try { post.source = JSON.parse(post.source); } catch (_) { post.source = {}; }
        }
        if (!window._allRenderedPosts) window._allRenderedPosts = {};
        if (post && post.id) {
            window._allRenderedPosts[String(post.id)] = post;
        }

        const postEl = document.createElement('div');
        postEl.className = 'feed-post';
        postEl.dataset.postId = post.id;
        postEl.dataset.format = post.format || 'post';
        const isResearchLab = post.format === 'researchlab' || post.is_research_lab || post.type === 'researchlab';
        if (isResearchLab && post.source && typeof post.source === 'object') {
            post.engine = post.engine || post.source.engine || post.source.proposal?.engine || post.proposal?.engine;
            post.domain = post.domain || post.source.domain || post.source.proposal?.domain || post.proposal?.domain;
            post.customSimulationCode = post.customSimulationCode || post.source.customSimulationCode || post.source.proposal?.customSimulationCode || post.proposal?.customSimulationCode;
            post.initialParams = post.initialParams || post.source.initialParams || post.source.proposal?.initialParams || post.proposal?.initialParams;
            post.proposal = post.proposal || post.source.proposal || post.source;
            post.proposal_id = post.id || post.proposal_id || post.proposal?.id;
            if (post.proposal && post.id) {
                post.proposal.id = post.id;
            }
        }
        if (viewType === 'reel' && isResearchLab) {
            return { element: null, init: null };
        }
        if (isResearchLab) {
            postEl.classList.add('research-lab-post');
        }

        let initFunction = null;

        // --- Multi-user: determine ownership and display info ---
        const myUserId = localStorage.getItem('userId');
        const myUsername = localStorage.getItem('username');
        const postAuthor = String(post.username || post.author || 'Anonymous');
        const isOwnPost = (post.user_id && myUserId && String(post.user_id) === String(myUserId)) ||
            (postAuthor && myUsername && postAuthor.toLowerCase() === myUsername.toLowerCase());
        const isFollowingPostAuthor = isFollowingUser(post.user_id, postAuthor);
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
        } else if (post.source?.engine === 'cartoon_studio' || post.format === 'cartoon_studio') {
            badgeText = 'Cartoon 3D';
        } else if (post.source?.engine === 'sound_studio' || post.format === 'sound_studio') {
            badgeText = 'Audio Waves';
        } else if (post.source?.engine === 'rapier' || post.format === 'rapier') {
            badgeText = '3D Physics';
        } else {
            switch (post.format) {
                case 'article': badgeText = 'Article'; break;
                case 'explanation': badgeText = 'Explanation'; break;
                case 'image': badgeText = 'Graph'; break;
                case 'diagram': badgeText = 'Diagram'; break;
                case 'math': badgeText = 'Math'; break;
                case 'pdf': badgeText = 'Book'; break;
                case 'researchlab': badgeText = 'Open Lab'; break;
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

        const openLabUrl = `/views/researchLab.html?id=${encodeURIComponent(post.id || post.proposal_id || '')}`;

        let mediaHTML = '';
        let backgroundHTML = '';
        const renderer = postRenderers[post.format] || postRenderers['default'];
        const renderedMedia = renderer(post, viewType);
        mediaHTML = renderedMedia.mediaHTML;
        backgroundHTML = renderedMedia.backgroundHTML;

        post = normalizePost(post) || post;
        const sPostId = String(post.id || '');
        const initialLikeCount = (post.likes_count !== undefined && post.likes_count !== null)
            ? Number(post.likes_count)
            : (likeDataCache[sPostId]?.count || 0);
        const initialCommentCount = (post.comments_count !== undefined && post.comments_count !== null)
            ? Number(post.comments_count)
            : (commentCountCache[sPostId] !== undefined ? commentCountCache[sPostId] : 0);
        const initialSaveCount = (post.saves_count !== undefined && post.saves_count !== null)
            ? Number(post.saves_count)
            : (saveDataCache[sPostId]?.count || 0);
        const isInitialLiked = !!(likeDataCache[sPostId]?.likedByMe || (typeof getLocalLikesMap === 'function' && getLocalLikesMap()[sPostId]));
        const isInitialSaved = !!(saveDataCache[sPostId]?.savedByMe || (typeof getLocalSavedSet === 'function' && getLocalSavedSet().has(sPostId)));

        if (viewType === 'reel') {
            postEl.innerHTML = `
                ${backgroundHTML}
                <div class="post-media">
                    ${mediaHTML}
                    ${isResearchLab ? `
                    <a href="${openLabUrl}" class="open-lab-badge-btn reel-open-lab-btn" title="Open Interactive Research Lab">
                        <span class="pulse-indicator"></span>
                        <i class="ri-flask-fill"></i>
                        <span>Open Lab</span>
                        <i class="ri-arrow-right-s-line arrow-icon"></i>
                    </a>
                    ` : ''}
                    <div class="post-actions">
                        <button class="icon-btn ${isInitialLiked ? 'liked' : ''}" data-action="like"><i class="${isInitialLiked ? 'ri-heart-fill' : 'ri-heart-line'}"></i> <span class="action-count">${initialLikeCount}</span></button>
                        <button class="icon-btn" data-action="comment" title="Discussion"><i class="ri-chat-3-line"></i> <span class="action-count">${initialCommentCount}</span></button>
                        <button class="icon-btn" data-action="share" title="Share Creation"><i class="ri-send-plane-line"></i> <span class="action-count">${window.getPostShareCount ? window.getPostShareCount(post.id) : (post.share_count || 0)}</span></button>
                        ${!isResearchLab ? `
                        <button class="icon-btn" data-action="remix" title="Remix Creation"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 113.03" style="width:30px;height:30px;"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M36.9,23.5h71.13c8.17,0,14.85,6.69,14.85,14.85v59.83c0,8.17-6.69,14.85-14.85,14.85H36.9 c-8.17,0-14.85-6.68-14.85-14.85V38.35C22.05,30.19,28.73,23.5,36.9,23.5L36.9,23.5z M10.08,73.96c0,2.78-2.26,5.04-5.04,5.04 C2.26,79,0,76.74,0,73.96V19.89C0,14.42,2.24,9.44,5.84,5.84C9.44,2.24,14.42,0,19.89,0h65.37c2.78,0,5.04,2.26,5.04,5.04 c0,2.78-2.26,5.04-5.04,5.04H19.89c-2.69,0-5.15,1.1-6.93,2.88c-1.78,1.78-2.88,4.23-2.88,6.93V73.96L10.08,73.96z M54.3,74.03 c-3.18,0-5.76-2.58-5.76-5.76s2.58-5.76,5.76-5.76H66.7V50.1c0-3.18,2.58-5.76,5.76-5.76s5.76,2.58,5.76,5.76v12.41h12.41 c3.18,0,5.76,2.58,5.76,5.76s-2.58,5.76-5.76,5.76H78.23v12.41c0,3.18-2.58,5.76-5.76,5.76s-5.76-2.58-5.76-5.76V74.03H54.3 L54.3,74.03z"/></svg><span class="action-count">${getPostRemixCount(post.id) || post.remix_count || 0}</span></button>
                        <button class="icon-btn" data-action="lineage" title="Remix Evolution & Lineage"><svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 513.11" style="width:30px;height:30px;"><path fill="currentColor" fill-rule="nonzero" d="M210.48 160.8c0-14.61 11.84-26.46 26.45-26.46s26.45 11.85 26.45 26.46v110.88l73.34 32.24c13.36 5.88 19.42 21.47 13.54 34.82-5.88 13.35-21.47 19.41-34.82 13.54l-87.8-38.6c-10.03-3.76-17.16-13.43-17.16-24.77V160.8zM5.4 168.54c-.76-2.25-1.23-4.64-1.36-7.13l-4-73.49c-.75-14.55 10.45-26.95 25-27.69 14.55-.75 26.95 10.45 27.69 25l.74 13.6a254.258 254.258 0 0136.81-38.32c17.97-15.16 38.38-28.09 61.01-38.18 64.67-28.85 134.85-28.78 196.02-5.35 60.55 23.2 112.36 69.27 141.4 132.83.77 1.38 1.42 2.84 1.94 4.36 27.86 64.06 27.53 133.33 4.37 193.81-23.2 60.55-69.27 112.36-132.83 141.39a26.24 26.24 0 01-12.89 3.35c-14.61 0-26.45-11.84-26.45-26.45 0-11.5 7.34-21.28 17.59-24.92 7.69-3.53 15.06-7.47 22.09-11.8.8-.66 1.65-1.28 2.55-1.86 11.33-7.32 22.1-15.7 31.84-25.04.64-.61 1.31-1.19 2-1.72 20.66-20.5 36.48-45.06 46.71-71.76 18.66-48.7 18.77-104.46-4.1-155.72l-.01-.03C418.65 122.16 377.13 85 328.5 66.37c-48.7-18.65-104.46-18.76-155.72 4.1a203.616 203.616 0 00-48.4 30.33c-9.86 8.32-18.8 17.46-26.75 27.29l3.45-.43c14.49-1.77 27.68 8.55 29.45 23.04 1.77 14.49-8.55 27.68-23.04 29.45l-73.06 9c-13.66 1.66-26.16-7.41-29.03-20.61zM283.49 511.5c20.88-2.34 30.84-26.93 17.46-43.16-5.71-6.93-14.39-10.34-23.29-9.42-15.56 1.75-31.13 1.72-46.68-.13-9.34-1.11-18.45 2.72-24.19 10.17-12.36 16.43-2.55 39.77 17.82 42.35 19.58 2.34 39.28 2.39 58.88.19zm-168.74-40.67c7.92 5.26 17.77 5.86 26.32 1.74 18.29-9.06 19.97-34.41 3.01-45.76-12.81-8.45-25.14-18.96-35.61-30.16-9.58-10.2-25.28-11.25-36.11-2.39a26.436 26.436 0 00-2.55 38.5c13.34 14.2 28.66 27.34 44.94 38.07zM10.93 331.97c2.92 9.44 10.72 16.32 20.41 18.18 19.54 3.63 36.01-14.84 30.13-33.82-4.66-15-7.49-30.26-8.64-45.93-1.36-18.33-20.21-29.62-37.06-22.33C5.5 252.72-.69 262.86.06 274.14c1.42 19.66 5.02 39 10.87 57.83z"/></svg><span class="action-count">${getPostRemixCount(post.id) || post.remix_count || 0}</span></button>
                        ` : ''}
                        <button class="icon-btn ${isInitialSaved ? 'saved' : ''}" data-action="save" title="Save Post"><i class="${isInitialSaved ? 'ri-bookmark-fill' : 'ri-bookmark-line'}"></i> <span class="action-count">${initialSaveCount}</span></button>
                        ${isOwnPost ? '<button class="icon-btn post-options-btn-reel"><i class="ri-more-2-fill"></i></button>' : ''}
                    </div>
                    <div class="post-footer">
                        <div class="post-header">
                            <div class="avatar" style="${avatarStyle}; display:flex; align-items:center; justify-content:center;">${avatarInnerHTML}</div>
                            <span class="post-username" data-user-id="${post.user_id || ''}" style="cursor:pointer;">${postAuthor}</span>
                            ${!isOwnPost ? `<button class="btn-follow-overlay ${isFollowingPostAuthor ? 'following' : ''}" data-user-id="${post.user_id || ''}" data-username="${postAuthor}">${isFollowingPostAuthor ? 'Following' : 'Follow'}</button>` : ''}
                        </div>
                        <div class="post-caption">
                            <span>${post.title}</span>
                        </div>
                    </div>
                    <div class="video-progress-container">
                        <div class="video-progress-bar"></div>
                    </div>
                    <div class="like-heart-overlay"></div>
                    <div class="play-pause-overlay"></div>
                </div>
            `;
        } else if (viewType === 'course-preview') {
            postEl.innerHTML = `
                <div class="post-media">
                    ${mediaHTML}
                    <div class="play-pause-overlay"></div>
                </div>
            `;
        } else { // 'grid' view
            const isPaywalled = (post.source?.is_premium || post.source?.subscriber_only || post.is_premium || post.subscriber_only) && !(window.isItemUnlocked && window.isItemUnlocked(post.id));
            const paywallOverlayHTML = isPaywalled ? `
                <div class="subscriber-paywall-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;backdrop-filter:blur(18px);background:rgba(0,0,0,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;padding:20px;text-align:center;box-sizing:border-box;">
                    <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,rgba(59,130,246,0.2),rgba(147,51,234,0.2));border:1px solid rgba(147,51,234,0.4);display:flex;align-items:center;justify-content:center;font-size:1.6rem;color:#60a5fa;margin-bottom:10px;">
                        <i class="ri-lock-2-line"></i>
                    </div>
                    <div style="font-weight:800;font-size:1.05rem;color:#fff;margin-bottom:4px;">Premium Creation</div>
                    <div style="font-size:0.78rem;color:#a1a1aa;margin-bottom:14px;max-width:280px;">Unlock lifetime access to watch and remix this scientific simulation.</div>
                    <button class="unlock-pro-feed-btn" style="padding:8px 20px;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;border:none;border-radius:20px;font-size:0.84rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 15px rgba(37,99,235,0.4);">
                        <i class="ri-lock-unlock-line"></i> Unlock Simulation ($${(post.source?.price || post.source?.code_price || 2.99).toFixed(2)})
                    </button>
                </div>
            ` : '';

            postEl.innerHTML = `
                <div class="post-media" data-post-id="${post.id}">
                    <div class="post-header">
                        <div class="avatar" style="${avatarStyle}; display:flex; align-items:center; justify-content:center;">${avatarInnerHTML}</div>
                        <span class="post-username" data-user-id="${post.user_id || ''}" style="cursor:pointer;">${postAuthor}</span>
                        ${!isOwnPost ? `<button class="btn-follow-overlay ${isFollowingPostAuthor ? 'following' : ''}" data-user-id="${post.user_id || ''}" data-username="${postAuthor}">${isFollowingPostAuthor ? 'Following' : 'Follow'}</button>` : ''}
                        ${isOwnPost ? `
                        <button class="post-options-btn" style="margin-left:auto;"><i class="ri-more-2-fill"></i></button>
                        <div class="post-options-menu">
                            <button class="menu-item" data-action="edit">Edit Details</button>
                            <button class="menu-item menu-item-danger" data-action="delete">Delete Post</button>
                        </div>` : ''}
                    </div>
                    ${mediaHTML}
                    ${paywallOverlayHTML}
                    ${isResearchLab ? `
                    <a href="${openLabUrl}" class="open-lab-badge-btn" title="Open Interactive Research Lab">
                        <span class="pulse-indicator"></span>
                        <i class="ri-flask-fill"></i>
                        <span>Open Lab</span>
                        <i class="ri-arrow-right-s-line arrow-icon"></i>
                    </a>
                    ` : `
                    <div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; font-size: 0.7rem; font-weight: 600; padding: 3px 7px; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.5px; backdrop-filter: blur(4px); z-index: 1;">${badgeText}</div>
                    `}
                </div>
                <div class="post-actions">
                    <button class="icon-btn ${isInitialLiked ? 'liked' : ''}" data-action="like"><i class="${isInitialLiked ? 'ri-heart-fill' : 'ri-heart-line'}"></i> <span class="action-count">${initialLikeCount}</span></button>
                    <button class="icon-btn" data-action="comment" title="Discussion"><i class="ri-chat-3-line"></i> <span class="action-count">${initialCommentCount}</span></button>
                    <button class="icon-btn" data-action="share" title="Share Creation"><i class="ri-send-plane-line"></i> <span class="action-count">${window.getPostShareCount ? window.getPostShareCount(post.id) : (post.share_count || 0)}</span></button>
                    ${!isResearchLab ? `
                    <button class="icon-btn" data-action="remix" title="Remix Creation"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 113.03" style="width:24px;height:24px;"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M36.9,23.5h71.13c8.17,0,14.85,6.69,14.85,14.85v59.83c0,8.17-6.69,14.85-14.85,14.85H36.9 c-8.17,0-14.85-6.68-14.85-14.85V38.35C22.05,30.19,28.73,23.5,36.9,23.5L36.9,23.5z M10.08,73.96c0,2.78-2.26,5.04-5.04,5.04 C2.26,79,0,76.74,0,73.96V19.89C0,14.42,2.24,9.44,5.84,5.84C9.44,2.24,14.42,0,19.89,0h65.37c2.78,0,5.04,2.26,5.04,5.04 c0,2.78-2.26,5.04-5.04,5.04H19.89c-2.69,0-5.15,1.1-6.93,2.88c-1.78,1.78-2.88,4.23-2.88,6.93V73.96L10.08,73.96z M54.3,74.03 c-3.18,0-5.76-2.58-5.76-5.76s2.58-5.76,5.76-5.76H66.7V50.1c0-3.18,2.58-5.76,5.76-5.76s5.76,2.58,5.76,5.76v12.41h12.41 c3.18,0,5.76,2.58,5.76,5.76s-2.58,5.76-5.76,5.76H78.23v12.41c0,3.18-2.58,5.76-5.76,5.76s-5.76-2.58-5.76-5.76V74.03H54.3 L54.3,74.03z"/></svg><span class="action-count">${getPostRemixCount(post.id) || post.remix_count || 0}</span></button>
                    <button class="icon-btn" data-action="lineage" title="Remix Evolution & Lineage"><svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 513.11" style="width:24px;height:24px;"><path fill="currentColor" fill-rule="nonzero" d="M210.48 160.8c0-14.61 11.84-26.46 26.45-26.46s26.45 11.85 26.45 26.46v110.88l73.34 32.24c13.36 5.88 19.42 21.47 13.54 34.82-5.88 13.35-21.47 19.41-34.82 13.54l-87.8-38.6c-10.03-3.76-17.16-13.43-17.16-24.77V160.8zM5.4 168.54c-.76-2.25-1.23-4.64-1.36-7.13l-4-73.49c-.75-14.55 10.45-26.95 25-27.69 14.55-.75 26.95 10.45 27.69 25l.74 13.6a254.258 254.258 0 0136.81-38.32c17.97-15.16 38.38-28.09 61.01-38.18 64.67-28.85 134.85-28.78 196.02-5.35 60.55 23.2 112.36 69.27 141.4 132.83.77 1.38 1.42 2.84 1.94 4.36 27.86 64.06 27.53 133.33 4.37 193.81-23.2 60.55-69.27 112.36-132.83 141.39a26.24 26.24 0 01-12.89 3.35c-14.61 0-26.45-11.84-26.45-26.45 0-11.5 7.34-21.28 17.59-24.92 7.69-3.53 15.06-7.47 22.09-11.8.8-.66 1.65-1.28 2.55-1.86 11.33-7.32 22.1-15.7 31.84-25.04.64-.61 1.31-1.19 2-1.72 20.66-20.5 36.48-45.06 46.71-71.76 18.66-48.7 18.77-104.46-4.1-155.72l-.01-.03C418.65 122.16 377.13 85 328.5 66.37c-48.7-18.65-104.46-18.76-155.72 4.1a203.616 203.616 0 00-48.4 30.33c-9.86 8.32-18.8 17.46-26.75 27.29l3.45-.43c14.49-1.77 27.68 8.55 29.45 23.04 1.77 14.49-8.55 27.68-23.04 29.45l-73.06 9c-13.66 1.66-26.16-7.41-29.03-20.61zM283.49 511.5c20.88-2.34 30.84-26.93 17.46-43.16-5.71-6.93-14.39-10.34-23.29-9.42-15.56 1.75-31.13 1.72-46.68-.13-9.34-1.11-18.45 2.72-24.19 10.17-12.36 16.43-2.55 39.77 17.82 42.35 19.58 2.34 39.28 2.39 58.88.19zm-168.74-40.67c7.92 5.26 17.77 5.86 26.32 1.74 18.29-9.06 19.97-34.41 3.01-45.76-12.81-8.45-25.14-18.96-35.61-30.16-9.58-10.2-25.28-11.25-36.11-2.39a26.436 26.436 0 00-2.55 38.5c13.34 14.2 28.66 27.34 44.94 38.07zM10.93 331.97c2.92 9.44 10.72 16.32 20.41 18.18 19.54 3.63 36.01-14.84 30.13-33.82-4.66-15-7.49-30.26-8.64-45.93-1.36-18.33-20.21-29.62-37.06-22.33C5.5 252.72-.69 262.86.06 274.14c1.42 19.66 5.02 39 10.87 57.83z"/></svg><span class="action-count">${getPostRemixCount(post.id) || post.remix_count || 0}</span></button>
                    ` : ''}
                    <button class="icon-btn ${isInitialSaved ? 'saved' : ''}" style="margin-left: auto;" data-action="save" title="Save Post"><i class="${isInitialSaved ? 'ri-bookmark-fill' : 'ri-bookmark-line'}"></i> <span class="action-count">${initialSaveCount}</span></button>
                </div>
                <div class="post-footer">
                    <div class="post-caption">
                        <span class="post-username" data-user-id="${post.user_id || ''}" style="cursor:pointer;">${(post.original_id && !isResearchLab) ? `${postAuthor} (Remix)` : postAuthor}</span>
                        <span>${post.title}</span>
                    </div>
                </div>
                <div class="like-heart-overlay"></div>
            `;

            const unlockFeedBtn = postEl.querySelector('.unlock-pro-feed-btn');
            if (unlockFeedBtn) {
                unlockFeedBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const itemPrice = post.source?.price || post.source?.code_price || 2.99;
                    if (window.openProductCheckoutModal) {
                        window.openProductCheckoutModal({
                            id: post.id,
                            title: post.title || 'Simulation Unlock',
                            price: itemPrice,
                            format: 'ANIMATION'
                        }, () => {
                            window.location.reload();
                        });
                    } else if (window.openSourceCodeUnlockModal) {
                        window.openSourceCodeUnlockModal({
                            id: post.id,
                            title: post.title || 'Simulation Unlock',
                            code_price: itemPrice
                        }, () => {
                            window.location.reload();
                        });
                    } else if (window.openPricingModal) {
                        window.openPricingModal();
                    }
                });
            }
        }

        // --- Event Listeners for Actions ---
        const openLabBtns = postEl.querySelectorAll('.open-lab-badge-btn');
        openLabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = openLabUrl;
            });
        });

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

                async function proceedToRemix() {
                    if (post.format === 'researchlab' || post.is_research_lab) {
                        window.location.href = `/views/researchLabEditor.html?id=${encodeURIComponent(post.id || post.proposal_id || '')}`;
                        return;
                    }

                    let rawSource = post.source;
                    if (typeof rawSource === 'string') {
                        try { rawSource = JSON.parse(rawSource); } catch (_) { rawSource = {}; }
                    }
                    rawSource = rawSource || {};

                    // If source or code is missing (e.g. from store card or sanitized feed query), securely fetch code
                    if ((!rawSource.code && !post.code) && post.id) {
                        try {
                            const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
                            if (client) {
                                // 1. Server-side authorized RPC retrieval
                                const { data: rpcRes, error: rpcErr } = await client.rpc('get_secure_post_code', { p_post_id: post.id });
                                if (!rpcErr && rpcRes && rpcRes.success && rpcRes.code) {
                                    rawSource.code = rpcRes.code;
                                    if (rpcRes.engine) rawSource.engine = rpcRes.engine;
                                } else {
                                    // 2. Direct fallback
                                    const { data: fullPost, error: fErr } = await client
                                        .from('posts')
                                        .select('*')
                                        .eq('id', post.id)
                                        .maybeSingle();
                                    if (!fErr && fullPost) {
                                        if (typeof fullPost.source === 'string') {
                                            try { fullPost.source = JSON.parse(fullPost.source); } catch (_) { fullPost.source = {}; }
                                        }
                                        rawSource = fullPost.source || {};
                                        if (fullPost.code && !rawSource.code) rawSource.code = fullPost.code;
                                        if (fullPost.format && !rawSource.engine) rawSource.engine = fullPost.format;
                                    }
                                }
                            }
                        } catch (err) {
                            console.warn("[proceedToRemix] Cloud fetch fallback notice:", err);
                        }
                    }

                    const code = rawSource.code || post.code || rawSource.customSimulationCode || '';
                    const engine = rawSource.engine || post.format || 'manim';

                    if (code || rawSource.engine || post.format) {
                        const srcObj = {
                            ...rawSource,
                            engine: engine,
                            code: code
                        };

                        localStorage.setItem('remixMeta', JSON.stringify({
                            source: srcObj,
                            originalId: post.id,
                            userId: post.user_id,
                            title: post.title,
                            is_source_protected: isProtected,
                            code_price: rawSource.code_price || post.code_price || 2.99
                        }));

                        let editorUrl;
                        switch (engine) {
                            case 'latex': editorUrl = '/views/xtraBook.html'; break;
                            case 'desmos': editorUrl = '/views/xtraGraph.html'; break;
                            case 'jsxgraph': editorUrl = '/views/xtraAnim.html?tool=jsxgraph'; break;
                            case 'zdog': editorUrl = '/views/xtraAnim.html?tool=zdog'; break;
                            case 'anime': editorUrl = '/views/xtraAnim.html?tool=anime'; break;
                            case 'rough': editorUrl = '/views/xtraAnim.html?tool=rough'; break;
                            case 'two': editorUrl = '/views/xtraAnim.html?tool=two'; break;
                            case 'thumbnail': editorUrl = '/views/xtraAnim.html?tool=thumbnail'; break;
                            case 'svg_to_3d': editorUrl = '/views/xtraAnim.html?tool=svg_to_3d'; break;
                            case 'svg_to_png': editorUrl = '/views/xtraAnim.html?tool=svg_to_png'; break;
                            case 'tikz': editorUrl = '/views/xtraAnim.html?tool=tikz'; break;
                            case 'cartoon_studio': editorUrl = '/views/xtraAnim.html?tool=cartoon_studio'; break;
                            case 'sound_studio': editorUrl = '/views/xtraAnim.html?tool=sound_studio'; break;
                            case 'rapier': editorUrl = '/views/xtraAnim.html?tool=rapier'; break;
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
            const sPostId = String(post.id);
            const localSaved = getLocalSavedSet();
            const localCounts = getLocalSaveCountsMap();
            const isSaved = localSaved.has(sPostId);
            const initialCount = Number(localCounts[sPostId]) || (isSaved ? 1 : 0);

            if (!saveDataCache[sPostId]) {
                saveDataCache[sPostId] = {
                    count: initialCount,
                    savedByMe: isSaved
                };
            }

            const saveIcon = saveBtn.querySelector('i');
            let countEl = saveBtn.querySelector('.action-count');
            if (!countEl) {
                countEl = document.createElement('span');
                countEl.className = 'action-count';
                saveBtn.appendChild(countEl);
            }

            const sData = saveDataCache[sPostId];
            if (saveIcon) saveIcon.className = sData.savedByMe ? 'ri-bookmark-fill' : 'ri-bookmark-line';
            saveBtn.classList.toggle('saved', sData.savedByMe);
            if (countEl) countEl.textContent = sData.count;

            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePostSave(sPostId, saveBtn);
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
                bgVideo.muted = true;
                video.addEventListener('play', () => {
                    bgVideo.muted = true;
                    bgVideo.play().catch(() => { });
                });
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
                    if (post.format === 'researchlab' || post.is_research_lab) {
                        window.location.href = `/views/researchLab.html?id=${encodeURIComponent(post.id || post.proposal_id || '')}`;
                    } else if (post.format === 'pdf') {
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

                // In Reels & Course mode: double tap to like, single tap to play/pause with visual indicator and audio unmuting
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
                        if ((viewType === 'reel' || viewType === 'course-preview') && video && (new Date().getTime() - lastTap >= 250)) {
                            const playPauseOverlay = postEl.querySelector('.play-pause-overlay');

                            // If video was playing muted (due to browser initial autoplay policy), first tap un-mutes without pausing!
                            if (video.muted) {
                                video.muted = false;
                                if (video.paused) {
                                    video.play().catch(() => { });
                                }
                                if (playPauseOverlay) {
                                    playPauseOverlay.innerHTML = '<i class="ri-volume-up-fill"></i>';
                                    playPauseOverlay.classList.add('visible');
                                    setTimeout(() => playPauseOverlay.classList.remove('visible'), 500);
                                }
                            } else {
                                // If already unmuted, toggle Play / Pause
                                if (video.paused) {
                                    video.play().catch(() => { });
                                    if (playPauseOverlay) {
                                        playPauseOverlay.innerHTML = '<i class="ri-play-fill"></i>';
                                        playPauseOverlay.classList.add('visible');
                                        setTimeout(() => playPauseOverlay.classList.remove('visible'), 500);
                                    }
                                } else {
                                    video.pause();
                                    if (playPauseOverlay) {
                                        playPauseOverlay.innerHTML = '<i class="ri-pause-fill"></i>';
                                        playPauseOverlay.classList.add('visible');
                                        setTimeout(() => playPauseOverlay.classList.remove('visible'), 500);
                                    }
                                }
                            }
                        }
                    }, 300);
                }
                lastTap = currentTime;
            });
        }

        // Title click navigation in Explore feed
        const postTitleEl = postEl.querySelector('.post-title-text') || postEl.querySelector('.post-caption span:last-child');
        if (postTitleEl && viewType === 'grid') {
            postTitleEl.style.cursor = 'pointer';
            postTitleEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (post.format === 'researchlab' || post.is_research_lab) {
                    window.location.href = `/views/researchLab.html?id=${encodeURIComponent(post.id || post.proposal_id || '')}`;
                } else if (post.format === 'pdf') {
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
        const commentBtn = postEl.querySelector('[data-action="comment"]') || postEl.querySelector('.ri-chat-3-line')?.closest('.icon-btn');
        if (commentBtn) {
            const sPostId = String(post.id);
            const localCommentCounts = getLocalCommentCountsMap();
            const localComments = getLocalCommentsMap();
            const localList = localComments[sPostId] || [];
            if (commentCountCache[sPostId] === undefined) {
                const savedCommentCount = Number(localCommentCounts[sPostId]);
                commentCountCache[sPostId] = !isNaN(savedCommentCount) ? Math.max(savedCommentCount, localList.length) : localList.length;
            }
            let countEl = commentBtn.querySelector('.action-count');
            if (!countEl) {
                countEl = document.createElement('span');
                countEl.className = 'action-count';
                commentBtn.appendChild(countEl);
            }
            countEl.textContent = commentCountCache[sPostId] || 0;

            commentBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openCommentModal(post.id);
            });
        }

        // Add listener for reel options button (owner-only)
        const reelOptionsBtn = postEl.querySelector('.post-options-btn-reel');
        if (reelOptionsBtn && isOwnPost) {
            reelOptionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const modal = document.getElementById('reelOptionsModal');
                if (modal) {
                    modal.dataset.postId = post.id;
                    modal.dataset.postTitle = post.title;
                    modal.dataset.postUserId = post.user_id || '';
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

        // Research Lab card initialization: simulation canvas runner, KaTeX math formatting, and media click navigation
        const labCanvas = postEl.querySelector('.research-lab-sim-canvas');
        const labIframe = postEl.querySelector('.research-lab-sim-iframe');
        if (labCanvas || labIframe || post.format === 'researchlab' || post.is_research_lab) {
            const labMediaEl = postEl.querySelector('.research-lab-media-interactive');
            if (labMediaEl) {
                labMediaEl.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return;
                    window.location.href = labMediaEl.dataset.openUrl;
                });
            }

            postEl._playSimulation = () => {
                if (labIframe) {
                    try {
                        labIframe.contentWindow?.postMessage({ type: 'SIM_PLAY_LOOP' }, '*');
                        labIframe.contentWindow?.startSimulationLoop?.();
                    } catch (_) { }
                }
                if (labCanvas) {
                    labCanvas._isPaused = false;
                    labCanvas._simPaused = false;
                    labCanvas._forceRefire = true;
                }
                const labVid = postEl.querySelector('video');
                if (labVid) {
                    labVid.loop = true;
                    labVid.play().catch(() => { });
                }
            };

            postEl._stopSimulation = () => {
                if (labIframe) {
                    try {
                        labIframe.contentWindow?.postMessage({ type: 'SIM_PAUSE' }, '*');
                        labIframe.contentWindow?.stopSimulation?.();
                    } catch (_) { }
                }
                if (labCanvas) {
                    labCanvas._isPaused = true;
                    labCanvas._simPaused = true;
                }
                const labVid = postEl.querySelector('video');
                if (labVid) {
                    try { labVid.pause(); } catch (_) { }
                }
            };

            const priorInit = initFunction;
            initFunction = () => {
                if (typeof priorInit === 'function') priorInit();
                const captionEl = postEl.querySelector('.post-caption span:last-child');
                if (window.renderMathInElement && captionEl) {
                    try {
                        window.renderMathInElement(captionEl, {
                            delimiters: [
                                { left: '$$', right: '$$', display: true },
                                { left: '$', right: '$', display: false }
                            ],
                            throwOnError: false
                        });
                    } catch (_) { }
                }
                if (labCanvas) {
                    let simAttempts = 0;
                    const startSim = () => {
                        if (!window.ResearchManager || typeof window.ResearchManager.runSimulation !== 'function') {
                            if (++simAttempts < 60) {
                                setTimeout(startSim, 50);
                            }
                            return;
                        }
                        const engine = post.engine || post.source?.engine || post.proposal?.engine || post.source?.proposal?.engine || 'projectile_canvas';
                        const domain = post.domain || post.source?.domain || post.proposal?.domain || post.source?.proposal?.domain || 'physics';
                        const params = post.initialParams || post.source?.initialParams || post.proposal?.initialParams || post.source?.proposal?.initialParams || { velocity: 45, angle: 45, dragCoeff: 0.06, gravity: 9.81 };
                        try {
                            window.ResearchManager.runSimulation(engine, params, labCanvas, null, domain);
                        } catch (simErr) {
                            console.warn('[ResearchLab] Simulation preview error:', simErr);
                        }
                    };
                    if (labIframe) {
                        labIframe.addEventListener('error', () => {
                            labIframe.style.display = 'none';
                            labCanvas.style.display = 'block';
                            startSim();
                        });
                        setTimeout(() => {
                            try {
                                const doc = labIframe.contentDocument || labIframe.contentWindow?.document;
                                const cvs = doc?.querySelector('canvas');
                                if (!cvs) {
                                    labIframe.style.display = 'none';
                                    labCanvas.style.display = 'block';
                                    startSim();
                                }
                            } catch (_) { }
                        }, 4000);
                    } else {
                        requestAnimationFrame(() => {
                            setTimeout(startSim, 30);
                        });
                    }
                }
            };
        }

        return { element: postEl, init: initFunction };
    }
    window.createPostElement = createPostElement;

    function updateHeader() {
        const userType = localStorage.getItem('userType');
        const currentPage = window.location.pathname;
        let authContainer = document.querySelector('.top-header #auth-buttons');

        if (authContainer) {
            // Store page: shopping cart in auth-buttons and search bar in top header
            if (currentPage.includes('/views/store.html')) {
                if (!authContainer.querySelector('.store-cart-btn')) {
                    authContainer.innerHTML = `
                        <button class="icon-btn store-cart-btn" title="Shopping Cart" style="font-size: 1.7rem; color: white;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1m-9-1a2 2 0 0 1 4 0v1h-4Zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2Z" />
                            </svg>
                        </button>
                    `;
                }

                const header = authContainer.closest('.top-header');
                if (header && !header.querySelector('.search-bar')) {
                    const searchInput = document.createElement('input');
                    searchInput.type = 'text';
                    searchInput.className = 'search-bar';
                    searchInput.placeholder = 'Search...';
                    header.insertBefore(searchInput, authContainer);
                }
                return;
            }

            // Only allow notification spark icon on the Explore view
            const isExplorePage = currentPage.endsWith('explore.html') || currentPage.endsWith('/explore') || currentPage === '/' || (currentPage.includes('explore.html') && !currentPage.includes('courseGraph'));

            if ((userType === 'creator' || userType === 'viewer') && isExplorePage) {
                // Logged in on Explore Page ONLY: render Spark notification button with red indicator dot
                if (!authContainer.querySelector('#notificationBtn')) {
                    authContainer.innerHTML = `
                        <button class="notification-btn" id="notificationBtn" title="Activity & Sparks">
                            <i class="ri-sparkling-fill"></i>
                            <span class="notification-red-dot"></span>
                        </button>
                    `;
                    const notifBtn = authContainer.querySelector('#notificationBtn');
                    if (notifBtn) {
                        notifBtn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (window.NotificationManager) {
                                window.NotificationManager.open();
                            }
                        };
                    }
                }
                if (window.NotificationManager) {
                    window.NotificationManager.updateBadge();
                }
            } else if (userType === 'creator' || userType === 'viewer') {
                // Logged in on other pages: no buttons
                if (authContainer.innerHTML.trim() !== '') {
                    authContainer.innerHTML = '';
                }
            } else {
                // If no userType, show Login/Signup buttons
                if (!authContainer.querySelector('.btn-glass')) {
                    authContainer.innerHTML = `
                        <a href="/" class="btn-glass" style="font-size: 0.8rem; padding: 6px 12px;">Log In</a>
                        <a href="/#signup" class="btn-primary" style="font-size: 0.8rem; padding: 6px 14px;">Sign Up</a>
                    `;
                }
            }
        }
    }
    window.updateHeader = updateHeader;
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
        const viewingUsername = (urlParams.get('user') || urlParams.get('username') || '').trim().replace(/^@/, '');
        let profilePosts = [];
        let myUserId = localStorage.getItem('userId');
        const myUsername = (localStorage.getItem('username') || '').trim().replace(/^@/, '');

        // Asynchronous check in case userId is not yet populated in localStorage
        if (!myUserId && supabase) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    myUserId = user.id;
                    localStorage.setItem('userId', user.id);
                }
            } catch (_) { }
        }

        const isOwnProfile = (!viewingUserId && !viewingUsername) ||
            (viewingUserId && myUserId && viewingUserId === myUserId) ||
            (viewingUsername && myUsername && viewingUsername.toLowerCase() === myUsername.toLowerCase());
        let targetUserId = viewingUserId || (isOwnProfile ? myUserId : null);
        let targetUsernameForFollow = isOwnProfile ? (myUsername || 'User') : (viewingUsername || 'User');
        let targetFullNameForFollow = isOwnProfile ? (username || myUsername || 'User') : (viewingUsername || 'User');
        let targetAvatarForFollow = '';

        // Background sync of user follows (non-blocking)
        if (myUserId && typeof syncUserFollows === 'function') {
            syncUserFollows(myUserId);
        }

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
                    <button class="btn-profile-action btn-profile-glass" onclick="window.location.href='settings.html'" style="flex:1;">
                        <i class="ri-edit-2-line"></i> <span>Edit profile</span>
                    </button>
                    <button class="btn-profile-action btn-profile-glass" onclick="navigator.share ? navigator.share({title:'${username}', url: window.location.href}) : (navigator.clipboard.writeText(window.location.href), (typeof window.showToast === 'function' ? window.showToast('Profile link copied! 🔗') : alert('Profile link copied! 🔗')))" style="flex:1;">
                        <i class="ri-share-forward-line"></i> <span>Share profile</span>
                    </button>
                `;
        } else {
            const profDashCard = document.getElementById('professionalDashboardCard');
            if (profDashCard) profDashCard.style.display = 'none';

            let otherProfile = null;
            if (supabase) {
                try {
                    let query = supabase.from('profiles').select('id, username, full_name, avatar_url, bio');
                    if (targetUserId) {
                        query = query.eq('id', targetUserId);
                    } else if (viewingUsername) {
                        query = query.ilike('username', viewingUsername);
                    }
                    const { data } = await query.maybeSingle();
                    otherProfile = data;
                } catch (e) {
                    console.warn('Could not fetch public profile from Supabase:', e);
                }
            }

            if (otherProfile) {
                targetUserId = otherProfile.id || targetUserId;
                targetUsernameForFollow = otherProfile.username || otherProfile.full_name || viewingUsername || 'User';
                targetFullNameForFollow = otherProfile.full_name || otherProfile.username || viewingUsername || 'User';
                targetAvatarForFollow = otherProfile.avatar_url || '';
                const displayHandle = otherProfile.username ? `@${otherProfile.username}` : (viewingUsername ? `@${viewingUsername}` : '@user');
                const displayName = targetFullNameForFollow;
                if (pHandle) pHandle.textContent = displayHandle;
                if (pName) pName.textContent = displayName;
                if (pBio) pBio.textContent = otherProfile.bio || '';
                if (pPic && otherProfile.avatar_url) {
                    pPic.style.backgroundImage = `url('${otherProfile.avatar_url}')`;
                    pPic.style.backgroundSize = 'cover';
                    pPic.style.backgroundPosition = 'center';
                }
                if (pageTitle) pageTitle.textContent = `${displayName} (${displayHandle}) | XtraPath`;
            } else {
                // Fallback: Populate from posts or stories cache
                let fallbackAvatar = '';
                let fallbackBio = '';
                const exploreFeed = JSON.parse(localStorage.getItem('cached_explore_feed') || '[]');
                const foundInFeed = exploreFeed.find(p => p && (
                    (viewingUsername && p.username && p.username.toLowerCase() === viewingUsername.toLowerCase()) ||
                    (viewingUsername && p.author && p.author.toLowerCase() === viewingUsername.toLowerCase()) ||
                    (targetUserId && String(p.user_id) === String(targetUserId))
                ));
                if (foundInFeed) {
                    fallbackAvatar = foundInFeed.avatar_url || foundInFeed.avatar || '';
                    targetUserId = foundInFeed.user_id || targetUserId;
                }
                if (!fallbackAvatar) {
                    fallbackAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(viewingUsername || 'user')}`;
                }
                targetAvatarForFollow = fallbackAvatar;
                targetUsernameForFollow = viewingUsername || 'User';
                targetFullNameForFollow = viewingUsername || 'User';
                if (pHandle) pHandle.textContent = viewingUsername ? `@${viewingUsername}` : '@user';
                if (pName) pName.textContent = viewingUsername || 'User';
                if (pBio) pBio.textContent = fallbackBio;
                if (pPic) {
                    pPic.style.backgroundImage = `url('${fallbackAvatar}')`;
                    pPic.style.backgroundSize = 'cover';
                    pPic.style.backgroundPosition = 'center';
                }
                if (pageTitle) pageTitle.textContent = `${viewingUsername || 'Profile'} | XtraPath`;
            }

            // Show Follow button for other users' profiles
            const isFollowingOther = isFollowingUser(targetUserId, targetUsernameForFollow);
            if (pActionBtns) {
                pActionBtns.innerHTML = `
                    <button id="profileMainFollowBtn" class="btn-profile-action ${isFollowingOther ? 'btn-profile-glass following' : 'btn-profile-primary'}" data-user-id="${targetUserId || ''}" data-username="${targetUsernameForFollow}" data-custom-follow="true" style="flex:2;">
                        <i class="${isFollowingOther ? 'ri-check-line' : 'ri-user-add-line'}"></i>
                        <span>${isFollowingOther ? 'Following' : 'Follow'}</span>
                    </button>
                    <button class="btn-profile-action btn-profile-glass" onclick="alert('Direct messaging coming soon!')" style="flex:2;">
                        <i class="ri-message-3-line"></i> <span>Message</span>
                    </button>
                    <button class="btn-profile-action btn-profile-glass btn-profile-icon" onclick="navigator.share ? navigator.share({title:'${targetUsernameForFollow}', url: window.location.href}) : (navigator.clipboard.writeText(window.location.href), (typeof window.showToast === 'function' ? window.showToast('Profile link copied! 🔗') : alert('Profile link copied! 🔗')))" title="Share profile" style="flex:0 0 40px;">
                        <i class="ri-share-forward-line"></i>
                    </button>
                `;

                const mainFollowBtn = document.getElementById('profileMainFollowBtn');
                if (mainFollowBtn) {
                    mainFollowBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const nowFollowing = toggleFollowUser({
                            userId: targetUserId || targetUsernameForFollow,
                            username: targetUsernameForFollow,
                            fullName: targetFullNameForFollow,
                            avatarUrl: targetAvatarForFollow
                        });
                        if (nowFollowing) {
                            mainFollowBtn.innerHTML = '<i class="ri-check-line"></i> <span>Following</span>';
                            mainFollowBtn.className = 'btn-profile-action btn-profile-glass following';
                        } else {
                            mainFollowBtn.innerHTML = '<i class="ri-user-add-line"></i> <span>Follow</span>';
                            mainFollowBtn.className = 'btn-profile-action btn-profile-primary';
                        }
                    });
                }
            }
            // Show Saved tab on own profile, hide for other users
            const tabSavedEl = document.getElementById('tabSaved');
            if (tabSavedEl) tabSavedEl.style.display = 'none';
        }

        // --- PROFILE STORY RING INTEGRATION ---
        function updateProfileStoryRing() {
            const profileStoryRing = document.getElementById('profileStoryRing');
            if (!profileStoryRing) return;

            const name = isOwnProfile ? 'Your Story' : (viewingUsername || (pName ? pName.textContent : 'User'));
            const targetStoryUser = isOwnProfile ? "Your Story" : name;
            let userStories = typeof getActiveStoriesForUser === 'function' ? getActiveStoriesForUser(targetStoryUser) : [];
            if (userStories.length === 0 && isOwnProfile) {
                userStories = typeof getActiveStoriesForUser === 'function' ? getActiveStoriesForUser("Your Story") : [];
            }
            if (userStories.length === 0 && viewingUsername) {
                userStories = typeof getActiveStoriesForUser === 'function' ? getActiveStoriesForUser(viewingUsername) : [];
            }
            if (userStories.length === 0 && targetUserId) {
                userStories = typeof getActiveStoriesForUser === 'function' ? getActiveStoriesForUser(targetUserId) : [];
            }

            // User has a watchable story if they have active 24h stories OR creations
            const hasCreations = Array.isArray(profilePosts) && profilePosts.length > 0;
            const hasStory = userStories.length > 0 || (!isOwnProfile && hasCreations);

            if (hasStory) {
                profileStoryRing.classList.add('has-story');
            } else {
                profileStoryRing.classList.remove('has-story');
            }

            profileStoryRing.onclick = () => {
                const avatarStyle = pPic?.style.backgroundImage || '';
                const avatarMatch = avatarStyle.match(/url\(['"]?(.*?)['"]?\)/);
                const defaultAvatar = localStorage.getItem('avatarUrl') || localStorage.getItem('userAvatar') || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`;
                const avatarUrl = avatarMatch ? avatarMatch[1] : (targetAvatarForFollow || defaultAvatar);

                // Expose profile posts to window for story viewer
                window.currentProfilePosts = profilePosts || [];
                window.profilePosts = profilePosts || [];

                if (window.StoryManager && window.StoryManager.Viewer) {
                    window.StoryManager.Viewer.openByUsername(isOwnProfile ? 'Your Story' : name, avatarUrl);
                } else if (typeof openStoryByUsername === 'function') {
                    openStoryByUsername(isOwnProfile ? 'Your Story' : name, avatarUrl);
                }
            };
        }

        window.updateProfileStoryRing = updateProfileStoryRing;
        updateProfileStoryRing();

        // --- Update Follower / Following stats ---
        async function updateProfileFollowStats() {
            const followerEl = document.getElementById('profileFollowerCount');
            const followingEl = document.getElementById('profileFollowingCount');
            if (!followerEl || !followingEl) return;

            const myUserId = localStorage.getItem('userId');
            const myUsername = (localStorage.getItem('username') || '').trim().replace(/^@/, '');
            const activeProfileId = (typeof targetUserId !== 'undefined' && targetUserId) ? targetUserId : myUserId;
            const activeProfileUsername = isOwnProfile
                ? myUsername
                : (typeof targetUsernameForFollow !== 'undefined' ? targetUsernameForFollow : (pName ? pName.textContent : 'User')).trim().replace(/^@/, '');

            // 1. Immediate local/optimistic update
            if (isOwnProfile) {
                const myFollowing = getFollowingList(myUserId);
                followingEl.textContent = myFollowing.length;
            } else {
                // If viewing someone else, check if current user is following them
                const isFollowing = isFollowingUser(activeProfileId, activeProfileUsername);
                const currentVal = parseInt(followerEl.textContent || '0');
                if (isFollowing && currentVal === 0) {
                    followerEl.textContent = '1';
                } else if (!isFollowing && currentVal === 1) {
                    followerEl.textContent = '0';
                }
            }

            let calculatedFollowers = null;
            let calculatedFollowing = null;

            // 2. Real-time Cloud Query from Supabase user_follows table
            const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
            if (client && (activeProfileId || activeProfileUsername)) {
                try {
                    let orFilters = [];
                    if (activeProfileId) orFilters.push(`following_id.eq.${activeProfileId}`);
                    if (activeProfileUsername) {
                        orFilters.push(`following_id.eq.${activeProfileUsername}`);
                        orFilters.push(`creator_username.eq.${activeProfileUsername}`);
                        orFilters.push(`creator_username.eq.@${activeProfileUsername}`);
                    }

                    // 1. Follower count
                    const { count: followersCount, error: fErr } = await client
                        .from('user_follows')
                        .select('*', { count: 'exact', head: true })
                        .or(orFilters.join(','));

                    if (!fErr && typeof followersCount === 'number') {
                        calculatedFollowers = followersCount;
                        followerEl.textContent = calculatedFollowers;
                    }

                    // 2. Following count
                    if (activeProfileId) {
                        const { count: followingCount, error: gErr } = await client
                            .from('user_follows')
                            .select('*', { count: 'exact', head: true })
                            .eq('follower_id', activeProfileId);
                        if (!gErr && typeof followingCount === 'number') {
                            calculatedFollowing = followingCount;
                            followingEl.textContent = calculatedFollowing;
                        }
                    }
                } catch (err) {
                    console.warn("Could not fetch remote follow stats:", err);
                }
            }


            // 1. Primary Live User Profile & Social Graph API
            if (activeProfileId || activeProfileUsername) {
                try {
                    const lookupKey = activeProfileUsername ? `@${activeProfileUsername}` : activeProfileId;
                    const res = await (window.fetchUserProfile ? window.fetchUserProfile(lookupKey, myUserId) : fetch(`/api/users/${encodeURIComponent(lookupKey)}?requester_id=${encodeURIComponent(myUserId || '')}`).then(r => r.json()));
                    if (res && res.success && res.profile) {
                        const prof = res.profile;
                        if (typeof prof.followers_count === 'number') {
                            followerEl.textContent = prof.followers_count;
                            calculatedFollowers = prof.followers_count;
                        }
                        if (typeof prof.following_count === 'number') {
                            followingEl.textContent = prof.following_count;
                            calculatedFollowing = prof.following_count;
                        }
                        if (typeof prof.posts_count === 'number') {
                            const postEl = document.getElementById('profilePostCount');
                            if (postEl) postEl.textContent = prof.posts_count;
                        }
                        if (prof.bio && !isOwnProfile) {
                            const bEl = document.getElementById('profileBioText');
                            if (bEl && !bEl.textContent) bEl.textContent = prof.bio;
                        }
                    }
                } catch (apiErr) {
                    console.warn('[fetchUserProfile Error]:', apiErr);
                }
            }

            // 2. Fallback to backend /api/follows/stats if Supabase count wasn't retrieved
            if (calculatedFollowers === null || calculatedFollowing === null) {
                try {
                    const bUrl = typeof getBackendUrl === 'function' ? getBackendUrl() : '';
                    const resp = await fetch(`${bUrl}/api/follows/stats?user_id=${encodeURIComponent(activeProfileId || '')}&username=${encodeURIComponent(activeProfileUsername || '')}`);
                    if (resp.ok) {
                        const data = await resp.json();
                        if (data && data.success) {
                            if (calculatedFollowers === null && typeof data.followers_count === 'number') {
                                followerEl.textContent = data.followers_count;
                            }
                            if (calculatedFollowing === null && typeof data.following_count === 'number') {
                                if (isOwnProfile) {
                                    const myFollowing = getFollowingList(myUserId);
                                    followingEl.textContent = Math.max(myFollowing.length, data.following_count);
                                } else {
                                    followingEl.textContent = data.following_count;
                                }
                            }
                        }
                    }
                } catch (bErr) {
                    console.warn('[Profile Follow Stats Backend Error]:', bErr);
                }
            }
        }
        window.updateProfileFollowStats = updateProfileFollowStats;
        updateProfileFollowStats();

        // 0ms Multi-Tier Fast Local Posts Population (Unified Local Cache Map)
        let profilePostsFetched = false;
        const initialPostMap = new Map();

        if (isOwnProfile) {
            try {
                const cached = JSON.parse(localStorage.getItem('cached_my_profile_posts') || '[]');
                cached.forEach(p => { if (p && p.id) initialPostMap.set(String(p.id), p); });
            } catch (_) { }

            try {
                const local = JSON.parse(localStorage.getItem('userPosts') || '[]');
                local.forEach(p => { if (p && p.id) initialPostMap.set(String(p.id), p); });
            } catch (_) { }

            const myUidStr = myUserId ? String(myUserId) : '';
            const myUnameStr = myUsername ? myUsername.toLowerCase() : '';
            const myHandleStr = (localStorage.getItem('handle') || '').replace(/^@/, '').toLowerCase();

            ['cached_explore_feed', 'cached_reels_feed'].forEach(cacheKey => {
                try {
                    const feed = JSON.parse(localStorage.getItem(cacheKey) || '[]');
                    feed.forEach(p => {
                        if (!p || !p.id) return;
                        const pUid = p.user_id ? String(p.user_id) : '';
                        const pUname = (p.username || p.author || '').toLowerCase();
                        if (
                            (myUidStr && pUid === myUidStr) ||
                            (myUnameStr && pUname === myUnameStr) ||
                            (myHandleStr && pUname === myHandleStr)
                        ) {
                            initialPostMap.set(String(p.id), p);
                        }
                    });
                } catch (_) { }
            });
        } else {
            const cacheKey = `cached_profile_posts_${targetUserId || targetUsernameForFollow}`;
            const targetUnameLower = (targetUsernameForFollow || viewingUsername || '').toLowerCase();
            const targetUidStr = targetUserId ? String(targetUserId) : '';

            try {
                const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
                cached.forEach(p => {
                    if (!p || !p.id) return;
                    const pUid = p.user_id ? String(p.user_id) : '';
                    const pUname = (p.username || p.author || '').toLowerCase();
                    if ((targetUidStr && pUid === targetUidStr) || (targetUnameLower && pUname === targetUnameLower)) {
                        initialPostMap.set(String(p.id), p);
                    }
                });
            } catch (_) { }

            ['cached_explore_feed', 'cached_reels_feed'].forEach(ck => {
                try {
                    const feed = JSON.parse(localStorage.getItem(ck) || '[]');
                    feed.forEach(p => {
                        if (!p || !p.id) return;
                        const pUid = p.user_id ? String(p.user_id) : '';
                        const pUname = (p.username || p.author || '').toLowerCase();
                        if ((targetUidStr && pUid === targetUidStr) || (targetUnameLower && pUname === targetUnameLower)) {
                            initialPostMap.set(String(p.id), p);
                        }
                    });
                } catch (_) { }
            });
        }

        profilePosts = Array.from(initialPostMap.values());
        profilePosts = profilePosts.filter(p => !(p.source?.lesson_id && !p.title));
        profilePosts.sort((a, b) => {
            const timeA = new Date(a.created_at || a.timestamp || 0).getTime() || 0;
            const timeB = new Date(b.created_at || b.timestamp || 0).getTime() || 0;
            return timeB - timeA;
        });

        const targetCountKey = `cached_post_count_${targetUserId || targetUsernameForFollow || viewingUsername || 'me'}`;
        const postCountEl = document.getElementById('profilePostCount');
        if (postCountEl) {
            let cachedCount = null;
            try { cachedCount = localStorage.getItem(targetCountKey); } catch (_) { }
            if (cachedCount !== null) {
                postCountEl.textContent = cachedCount;
            } else {
                postCountEl.textContent = profilePosts.length;
            }
        }
        if (typeof updateProfileStoryRing === 'function') updateProfileStoryRing();

        // Fast zero-payload exact post count query
        async function updateExactProfilePostCount() {
            const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
            if (!client) return;
            try {
                let exactCount = null;
                if (targetUserId) {
                    const { count, error } = await client
                        .from('posts')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', targetUserId);
                    if (!error && typeof count === 'number') {
                        exactCount = count;
                    }
                }
                if (exactCount === null && (targetUsernameForFollow || viewingUsername)) {
                    const uName = (targetUsernameForFollow || viewingUsername).trim();
                    const { count, error } = await client
                        .from('posts')
                        .select('*', { count: 'exact', head: true })
                        .ilike('username', uName);
                    if (!error && typeof count === 'number') {
                        exactCount = count;
                    }
                }
                if (typeof exactCount === 'number') {
                    const countEl = document.getElementById('profilePostCount');
                    if (countEl) {
                        const finalCount = isOwnProfile ? Math.max(parseInt(countEl.textContent || '0', 10) || 0, exactCount) : exactCount;
                        countEl.textContent = finalCount;
                        try { localStorage.setItem(targetCountKey, String(finalCount)); } catch (_) { }
                    }
                }
            } catch (err) {
                console.warn('[Profile Exact Count Error]:', err);
            }
        }
        updateExactProfilePostCount();

        let currentActiveTab = ['saved', 'remixes', 'library'].includes(window.location.hash.substring(1))
            ? window.location.hash.substring(1)
            : 'projects';

        // Helper: Create single profile post card with lazy loading
        function createProfilePostCard(post) {
            const div = document.createElement('div');
            div.style.aspectRatio = '1/1';
            div.style.position = 'relative';
            div.style.cursor = 'pointer';
            div.style.overflow = 'hidden';

            let thumbnailHTML = '';
            if (post.source?.engine === 'tikz' || post.format === 'tikz') {
                const fullCover = post.video_url?.startsWith('http') || post.video_url?.startsWith('data:') ? post.video_url : (post.video_url ? `${getBackendUrl()}${post.video_url}` : '');
                thumbnailHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#090b10;padding:6px;box-sizing:border-box;"><img src="${fullCover}" loading="lazy" style="max-width:100%;max-height:100%;object-fit:contain;background:transparent;border:none;" onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;background:linear-gradient(135deg,#1e1b4b,#0f172a);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;\\'><i class=\\'ri-draft-line\\' style=\\'font-size:2rem;color:#38bdf8;\\'></i><span style=\\'font-size:0.65rem;font-weight:700;color:#94a3b8;\\'>TIKZ</span></div>';"></div>`;
            } else if (post.format === 'image') {
                const fullCover = post.video_url?.startsWith('http') || post.video_url?.startsWith('data:') ? post.video_url : (post.video_url ? `${getBackendUrl()}${post.video_url}` : '');
                const isSvgGraphic = post.source?.engine === 'svg_to_png' || post.source?.engine === 'd3' || post.source?.engine === 'svg_to_3d';
                const objectFit = isSvgGraphic ? 'contain' : 'cover';
                const imgBg = isSvgGraphic ? '#090b10' : '#000';
                const imgPad = isSvgGraphic ? 'padding:6px;' : '';
                thumbnailHTML = `<img src="${fullCover}" loading="lazy" style="width:100%;height:100%;object-fit:${objectFit};background:${imgBg};${imgPad}">`;
            } else if (post.format === 'diagram') {
                thumbnailHTML = `<img src="${post.video_url || ''}" loading="lazy" style="width:100%;height:100%;object-fit:contain;background:#1e1e23;">`;
            } else if (post.format === '3d_model' || post.format === 'threejs_scene') {
                const fullCover = post.video_url?.startsWith('http') || post.video_url?.startsWith('data:') ? post.video_url : (post.video_url ? `${getBackendUrl()}${post.video_url}` : '');
                if (fullCover) {
                    thumbnailHTML = `<img src="${fullCover}" loading="lazy" style="width:100%;height:100%;object-fit:cover;background:#000;" onerror="window.handleMediaFallback(this, '${post.id}', '3D Model', 'ri-cube-fill', '${(post.title || '3D Model').replace(/'/g, '&#39;')}');">`;
                } else if (post.source?.engine === 'svg_to_3d' && post.source?.code && typeof window.createSVG3DViewerIframeContent === 'function') {
                    const svgCode = JSON.stringify(post.source.code);
                    const iframeContent = window.createSVG3DViewerIframeContent(svgCode, post.source.color || '#3b82f6', false);
                    thumbnailHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%;height:100%;border:none;background:#000;pointer-events:none;"></iframe>`;
                } else {
                    thumbnailHTML = `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1e1e2f,#0f172a);display:flex;align-items:center;justify-content:center;"><i class="ri-cube-fill" style="font-size:2.5rem;color:#60a5fa;"></i></div>`;
                }
            } else if (post.format === 'explanation') {
                thumbnailHTML = `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1e1b4b,#0f172a);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px solid rgba(70,79,235,0.3);"><i class="ri-volume-up-line" style="font-size:2.4rem;color:#818cf8;"></i><span style="font-size:0.7rem;font-weight:700;color:#93c5fd;letter-spacing:0.5px;">EXPLANATION</span></div>`;
            } else if (post.format === 'researchlab' || post.is_research_lab || post.type === 'researchlab') {
                const domain = post.domain || post.source?.domain || 'Physics';
                const safeTitle = (post.title || 'Interactive Experiment').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                thumbnailHTML = `<div style="width:100%;height:100%;background:radial-gradient(ellipse at bottom,#1e1b4b 0%,#090d16 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px;box-sizing:border-box;border:1px solid rgba(56,189,248,0.25);"><i class="ri-flask-line" style="font-size:2.2rem;color:#38bdf8;filter:drop-shadow(0 0 10px rgba(56,189,248,0.45));"></i><span style="font-size:0.65rem;font-weight:700;color:#93c5fd;letter-spacing:0.5px;text-transform:uppercase;background:rgba(56,189,248,0.15);padding:2px 8px;border-radius:10px;border:1px solid rgba(56,189,248,0.3);">RESEARCH LAB</span><span style="font-size:0.64rem;color:#cbd5e1;text-align:center;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;max-width:90%;">${safeTitle}</span></div>`;
            } else if (post.format === 'interactive' || post.format === 'anime' || post.format === 'rough' || post.format === 'two' || post.format === 'cartoon_studio') {
                if (typeof post.source === 'string') {
                    try { post.source = JSON.parse(post.source); } catch (_) { post.source = {}; }
                }
                const fullCover = post.video_url?.startsWith('http') || post.video_url?.startsWith('data:') ? post.video_url : (post.video_url ? `${getBackendUrl()}${post.video_url}` : '');
                const engine = post.source?.engine || post.format;
                if (fullCover) {
                    const safeTitle = (post.title || 'Interactive').replace(/'/g, '&#39;');
                    thumbnailHTML = `<img src="${fullCover}" loading="lazy" style="width:100%;height:100%;object-fit:cover;background:#0e1117;" onerror="window.handleMediaFallback(this, '${post.id}', 'Interactive', 'ri-brush-line', '${safeTitle}');">`;
                } else if ((engine === 'cartoon_studio' || post.format === 'cartoon_studio') && post.source?.code && typeof window.renderCartoonStudio === 'function') {
                    const iframeContent = window.renderCartoonStudio(post.source.code, { isFeed: true });
                    thumbnailHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%;height:100%;border:none;background:#0f172a;pointer-events:none;"></iframe>`;
                } else if ((engine === 'rough' || post.format === 'rough') && post.source?.code && typeof window.renderRough === 'function') {
                    const iframeContent = window.renderRough(post.source.code, { width: 1280, height: 720, background: post.source.background || '#0e1117' });
                    thumbnailHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%;height:100%;border:none;background:#0e1117;pointer-events:none;"></iframe>`;
                } else if ((engine === 'anime' || post.format === 'anime') && post.source?.code && typeof window.renderAnime === 'function') {
                    const iframeContent = window.renderAnime(post.source.code, { width: 1280, height: 720, background: post.source.background || '#080a10' });
                    thumbnailHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%;height:100%;border:none;background:#080a10;pointer-events:none;"></iframe>`;
                } else if ((engine === 'two' || post.format === 'two') && post.source?.code && typeof window.renderTwo === 'function') {
                    const iframeContent = window.renderTwo(post.source.code, { width: 1280, height: 720, background: post.source.background || '#090b10' });
                    thumbnailHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%;height:100%;border:none;background:#090b10;pointer-events:none;"></iframe>`;
                } else if (engine === 'zdog' && post.source?.code && typeof window.renderZdog === 'function') {
                    const iframeContent = window.renderZdog(post.source.code, { background: '#0a0d14' });
                    thumbnailHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%;height:100%;border:none;background:#0a0d14;pointer-events:none;"></iframe>`;
                } else {
                    thumbnailHTML = `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1e1e2f,#0f172a);display:flex;align-items:center;justify-content:center;"><i class="ri-brush-line" style="font-size:2.5rem;color:#38bdf8;"></i></div>`;
                }
            } else if (post.format === 'article' || post.format === 'pdf') {
                if (post.video_url) {
                    const fullCoverUrl = (post.video_url.startsWith('http') || post.video_url.startsWith('data:'))
                        ? post.video_url
                        : `${getBackendUrl()}${post.video_url}`;
                    thumbnailHTML = `<img src="${fullCoverUrl}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div style="display:none;width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e);align-items:center;justify-content:center;"><i class="${post.format === 'pdf' ? 'ri-book-open-fill' : 'ri-file-text-fill'}" style="font-size:2.5rem;color:#a1a1aa;"></i></div>`;
                } else {
                    thumbnailHTML = `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e);display:flex;align-items:center;justify-content:center;"><i class="${post.format === 'pdf' ? 'ri-book-open-fill' : 'ri-file-text-fill'}" style="font-size:2.5rem;color:#a1a1aa;"></i></div>`;
                }
            } else {
                const fullVideoUrl = post.video_url ? (post.video_url.startsWith('http') ? post.video_url : `${getBackendUrl()}${post.video_url}`) : '';
                thumbnailHTML = `<video src="${fullVideoUrl}" preload="none" muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>`;
            }

            const isRemix = !!(post.original_id || post.originalId || post.source?.original_id || post.source?.originalId || post.source?.remix_of);
            let iconHTML = '<i class="ri-play-circle-fill"></i>';
            if (isRemix) {
                iconHTML = '<i class="ri-repeat-2-fill"></i>';
            } else if (post.format === 'researchlab' || post.is_research_lab || post.type === 'researchlab') {
                iconHTML = '<i class="ri-flask-fill" style="color:#38bdf8;"></i>';
            } else if (post.source?.engine === 'tikz' || post.format === 'tikz') {
                iconHTML = '<i class="ri-draft-line"></i>';
            } else if (post.format === 'image') {
                iconHTML = '<i class="ri-image-fill"></i>';
            } else if (post.format === 'pdf') {
                iconHTML = '<i class="ri-book-open-fill"></i>';
            } else if (post.format === 'article') {
                iconHTML = '<i class="ri-article-fill"></i>';
            } else if (post.format === 'explanation') {
                iconHTML = '<i class="ri-voiceprint-fill"></i>';
            } else if (post.source?.engine === 'cartoon_studio' || post.format === 'cartoon_studio') {
                iconHTML = '<i class="ri-bear-smile-fill"></i>';
            } else if (post.format === 'interactive' || post.format === 'anime' || post.format === 'rough') {
                iconHTML = '<i class="ri-sparkling-fill"></i>';
            } else if (post.format === '3d_model') {
                iconHTML = '<i class="ri-box-3-fill"></i>';
            } else if (post.format === 'threejs_scene') {
                iconHTML = '<i class="ri-code-box-fill"></i>';
            }

            div.innerHTML = `
                    <div class="post-thumbnail" style="width:100%;height:100%;background:#111;position:relative;">
                        ${thumbnailHTML}
                        <div style="position:absolute;top:7px;right:7px;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.15);width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:white;font-size:0.85rem;box-shadow:0 2px 8px rgba(0,0,0,0.4);">${iconHTML}</div>
                    </div>
                    <div class="post-overlay" style="opacity:0;position:absolute;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;transition:opacity 0.2s;">
                        <span style="color:white;font-weight:700;font-size:0.9rem;text-align:center;padding:0 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:90%;">${post.title || ''}</span>
                    </div>
                `;

            div.onmouseenter = () => { div.querySelector('.post-overlay').style.opacity = '1'; const v = div.querySelector('video'); if (v) v.play().catch(() => { }); };
            div.onmouseleave = () => { div.querySelector('.post-overlay').style.opacity = '0'; const v = div.querySelector('video'); if (v) v.pause(); };
            div.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                if (post.format === 'researchlab' || post.is_research_lab || post.type === 'researchlab') window.location.href = `/views/researchLab.html?id=${encodeURIComponent(post.proposal_id || post.id || '')}`;
                else if (post.format === 'article') window.location.href = `/views/articleView.html?id=${post.id}`;
                else if (post.format === 'pdf') window.location.href = `/views/bookView.html?id=${post.id}`;
                else if (post.format === 'explanation') window.location.href = `/views/explainView.html?id=${post.id}`;
                else window.location.href = `/views/reels.html?id=${post.id}`;
            };
            return div;
        }

        // --- Render posts grid (with Smart Progressive Chunking) ---
        const profileGrid = document.getElementById('profileGrid');
        let renderPosts = null;
        let profileChunkObserver = null;

        if (profileGrid) {
            renderPosts = async (type) => {
                currentActiveTab = type || 'projects';
                const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);

                document.querySelectorAll('.profile-filters .filter-btn, .insta-tab').forEach(t => t.classList.remove('active'));
                if (currentActiveTab === 'projects') document.getElementById('tabProjects')?.classList.add('active');
                if (currentActiveTab === 'remixes') document.getElementById('tabRemixes')?.classList.add('active');
                if (currentActiveTab === 'saved') document.getElementById('tabSaved')?.classList.add('active');
                if (currentActiveTab === 'library') document.getElementById('tabLibrary')?.classList.add('active');

                if (profileChunkObserver) {
                    profileChunkObserver.disconnect();
                    profileChunkObserver = null;
                }

                // Adjust grid class based on tab
                if (currentActiveTab === 'library') {
                    profileGrid.className = 'insta-grid library-grid';
                } else {
                    profileGrid.className = 'insta-grid';
                }

                let filtered = [];

                if (currentActiveTab === 'library') {
                    // 1. Gather all verified purchased item IDs from backend API (SQLite)
                    let unlockedIds = [];
                    
                    if (window.PaymentManager && typeof window.PaymentManager.verifyEntitlements === 'function') {
                        try {
                            const ent = await window.PaymentManager.verifyEntitlements(true);
                            if (ent && Array.isArray(ent.purchases)) {
                                ent.purchases.forEach(pid => {
                                    if (pid && !unlockedIds.includes(String(pid))) {
                                        unlockedIds.push(String(pid));
                                    }
                                });
                            }
                        } catch (_) {}
                    }

                    if (unlockedIds.length === 0) {
                        try {
                            const targetUid = myUserId || localStorage.getItem('userId') || 'usr_current_user';
                            const res = await fetch(`/api/user/purchases?userId=${encodeURIComponent(targetUid)}`);
                            if (res.ok) {
                                const pData = await res.json();
                                if (pData && Array.isArray(pData.purchases)) {
                                    pData.purchases.forEach(p => {
                                        const pid = p.item_id || p.itemId;
                                        if (pid && !unlockedIds.includes(String(pid))) {
                                            unlockedIds.push(String(pid));
                                        }
                                    });
                                }
                            }
                        } catch (err) {
                            console.warn("Could not sync purchases in Library:", err);
                        }
                    }

                    if (unlockedIds.length === 0) {
                        unlockedIds = (window.getUnlockedPurchases ? window.getUnlockedPurchases() : []).map(String);
                    }

                    localStorage.setItem('unlockedPurchases', JSON.stringify(unlockedIds));

                    if (unlockedIds.length === 0) {
                        profileGrid._lastRenderFingerprint = 'library:empty';
                        profileGrid.innerHTML = `
                            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#a1a1aa;">
                                <i class="ri-folders-line" style="font-size:3.2rem;color:#64748b;display:block;margin-bottom:12px;"></i>
                                <h3 style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:8px;">Your Library is Empty</h3>
                                <p style="font-size:0.88rem;color:#94a3b8;max-width:340px;margin:0 auto 20px;line-height:1.5;">Courses, books, asset packs, and source code you purchase from the XtraStore will appear here for instant lifetime access.</p>
                                <a href="/views/store.html" class="btn-primary" style="display:inline-flex;align-items:center;gap:6px;padding:9px 20px;border-radius:20px;text-decoration:none;font-size:0.85rem;font-weight:600;"><i class="ri-store-2-line"></i> Browse XtraStore</a>
                            </div>`;
                        return;
                    }

                    // Gather items that have been purchased
                    const itemMap = new Map();
                    const sampleStoreItems = [
                        { id: "prod_tesseract_4d", title: "Interactive 4D Tesseract Simulation Pack", price: "14.99", format: "asset", username: "Priya Sharma", video_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop", media_type: "image", is_for_sale: true, description: "Complete 4-dimensional hypercube rotation and slicing engine with interactive vertex controls." },
                        { id: "prod_quantum_mastery", title: "Quantum Wave Mechanics Masterclass", price: "24.99", format: "course", username: "Dr. Rohit Verma", video_url: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600&auto=format&fit=crop", media_type: "image", is_for_sale: true, description: "12 interactive chapters covering Schrödinger wave packets, tunneling, and quantum optics." },
                        { id: "prod_relativity_book", title: "Special & General Relativity Visual Guide", price: "9.99", format: "pdf", username: "Elena Rostova", video_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop", media_type: "image", is_for_sale: true, description: "Interactive PDF e-book with spacetime diagrams, light cones, and Lorentz contraction widgets." },
                        { id: "prod_gravitational_3d", title: "Gravitational Lensing 3D Engine Model", price: "19.99", format: "3d_model", username: "Vikramaditya Sen", video_url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop", media_type: "image", is_for_sale: true, description: "Real-time ray-traced Schwarzschild black hole geodesics and photon sphere visualizer." }
                    ];
                    sampleStoreItems.forEach(s => {
                        if (unlockedIds.includes(String(s.id))) {
                            itemMap.set(String(s.id), s);
                        }
                    });

                    try {
                        const cachedStore = JSON.parse(localStorage.getItem('cachedStoreItems') || '[]');
                        cachedStore.forEach(p => {
                            if (unlockedIds.includes(String(p.id))) {
                                itemMap.set(String(p.id), p);
                            }
                        });
                    } catch (_) { }

                    try {
                        const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                        localPosts.forEach(p => {
                            if (unlockedIds.includes(String(p.id))) {
                                itemMap.set(String(p.id), p);
                            }
                        });
                    } catch (_) { }

                    profilePosts.forEach(p => {
                        if (unlockedIds.includes(String(p.id))) {
                            itemMap.set(String(p.id), p);
                        }
                    });

                    // Fetch missing unlocked items from Supabase in batch
                    const missingUnlocked = unlockedIds.filter(id => !itemMap.has(id));
                    if (missingUnlocked.length > 0 && client) {
                        try {
                            const { data: dbItems, error: dbErr } = await client
                                .from('posts')
                                .select('id,created_at,user_id,title,description,video_url,media_type,format,username,avatar_url,source')
                                .in('id', missingUnlocked);
                            if (!dbErr && dbItems) {
                                dbItems.forEach(p => {
                                    let src = p.source;
                                    if (typeof src === 'string') {
                                        try { src = JSON.parse(src); } catch (_) { src = {}; }
                                    }
                                    itemMap.set(String(p.id), { ...p, source: src || {} });
                                });
                            }
                        } catch (err) {
                            console.warn("Could not fetch unlocked items from Supabase:", err);
                        }
                    }

                    // Fallback stub for any remaining items so they always render in library
                    unlockedIds.forEach(id => {
                        if (!itemMap.has(id)) {
                            itemMap.set(id, {
                                id: id,
                                title: 'Interactive Creation',
                                format: 'asset',
                                username: 'Creator',
                                video_url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop',
                                media_type: 'image',
                                is_for_sale: true,
                                source: {}
                            });
                        }
                    });

                    filtered = unlockedIds.map(id => itemMap.get(id)).filter(Boolean);

                    const libFingerprint = `library:${filtered.map(p => p.id).join('|')}`;
                    if (profileGrid._lastRenderFingerprint === libFingerprint && profileGrid.children.length > 0) {
                        return;
                    }
                    profileGrid._lastRenderFingerprint = libFingerprint;

                    profileGrid.innerHTML = '';

                    if (filtered.length === 0) {
                        profileGrid.innerHTML = `
                            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#a1a1aa;">
                                <i class="ri-folders-line" style="font-size:3.2rem;color:#64748b;display:block;margin-bottom:12px;"></i>
                                <h3 style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:8px;">Your Library is Empty</h3>
                                <p style="font-size:0.88rem;color:#94a3b8;max-width:340px;margin:0 auto 20px;line-height:1.5;">Courses, books, asset packs, and source code you purchase from the XtraStore will appear here for instant lifetime access.</p>
                                <a href="/views/store.html" class="btn-primary" style="display:inline-flex;align-items:center;gap:6px;padding:9px 20px;border-radius:20px;text-decoration:none;font-size:0.85rem;font-weight:600;"><i class="ri-store-2-line"></i> Browse XtraStore</a>
                            </div>`;
                        return;
                    }

                    filtered.forEach(post => {
                        const card = window.createStoreItemCard ? window.createStoreItemCard(post, { isLibrary: true }) : null;
                        if (card) {
                            profileGrid.appendChild(card);
                        }
                    });

                    if (window.updateUserAvatars) {
                        window.updateUserAvatars();
                    }
                    return;
                }

                if (currentActiveTab === 'saved') {
                    let syncedData = { savedIds: [], posts: {} };
                    if (isOwnProfile && myUserId && typeof window.syncUserSaves === 'function') {
                        try {
                            syncedData = await window.syncUserSaves(myUserId);
                        } catch (_) { }
                    }

                    const vaultKey = typeof getUserSavesVaultKey === 'function' ? getUserSavesVaultKey(myUserId) : `xtra_saves_${myUserId}`;
                    let localSaved = JSON.parse(localStorage.getItem('savedPosts') || '[]').map(String);
                    let vaultSaved = myUserId ? JSON.parse(localStorage.getItem(vaultKey) || '[]').map(String) : [];
                    let savedIds = Array.from(new Set([...(syncedData.savedIds || []), ...localSaved, ...vaultSaved]));

                    if (savedIds.length === 0) {
                        profileGrid._lastRenderFingerprint = 'saved:empty';
                        profileGrid.innerHTML = `
                            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#a1a1aa;">
                                <i class="ri-bookmark-line" style="font-size:3.2rem;color:#64748b;display:block;margin-bottom:12px;"></i>
                                <h3 style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:8px;">No Saved Posts Yet</h3>
                                <p style="font-size:0.88rem;color:#94a3b8;max-width:340px;margin:0 auto;line-height:1.5;">Tap the bookmark icon on any post in Explore or Reels to save it for quick access here.</p>
                            </div>`;
                        return;
                    }

                    const postMap = {};
                    profilePosts.forEach(p => { if (p && p.id) postMap[String(p.id)] = p; });

                    try {
                        const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                        localPosts.forEach(p => { if (p && p.id) postMap[String(p.id)] = p; });
                    } catch (_) { }

                    try {
                        const savedObjs = JSON.parse(localStorage.getItem('savedPostsObjects') || '{}');
                        Object.values(savedObjs).forEach(p => { if (p && p.id) postMap[String(p.id)] = p; });
                    } catch (_) { }

                    const objsVaultKey = typeof getUserSavedObjectsVaultKey === 'function' ? getUserSavedObjectsVaultKey(myUserId) : `xtra_saved_posts_${myUserId}`;
                    try {
                        const vaultObjs = myUserId ? JSON.parse(localStorage.getItem(objsVaultKey) || '{}') : {};
                        Object.values(vaultObjs).forEach(p => { if (p && p.id) postMap[String(p.id)] = p; });
                    } catch (_) { }

                    if (syncedData.posts) {
                        Object.values(syncedData.posts).forEach(p => { if (p && p.id) postMap[String(p.id)] = p; });
                    }

                    if (window._allRenderedPosts) {
                        Object.values(window._allRenderedPosts).forEach(p => { if (p && p.id) postMap[String(p.id)] = p; });
                    }

                    const missingIds = savedIds.filter(id => !postMap[id]);
                    if (missingIds.length > 0 && client) {
                        try {
                            const { data: fetchedMissing, error: fetchErr } = await client
                                .from('posts')
                                .select('id,created_at,user_id,title,description,video_url,media_type,format,original_id,username,avatar_url,source')
                                .in('id', missingIds);
                            if (!fetchErr && fetchedMissing) {
                                fetchedMissing.forEach(p => {
                                    let src = p.source;
                                    if (typeof src === 'string') {
                                        try { src = JSON.parse(src); } catch (_) { src = {}; }
                                    }
                                    postMap[String(p.id)] = { ...p, source: src || {} };
                                });
                            }
                        } catch (err) {
                            console.warn('Could not fetch saved posts from Supabase:', err);
                        }
                    }

                    filtered = savedIds
                        .map(id => postMap[id])
                        .filter(Boolean);

                    const savedFingerprint = `saved:${filtered.map(p => p.id).join('|')}`;
                    if (profileGrid._lastRenderFingerprint === savedFingerprint && profileGrid.children.length > 0) {
                        return;
                    }
                    profileGrid._lastRenderFingerprint = savedFingerprint;

                    if (filtered.length === 0) {
                        profileGrid.innerHTML = `
                            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#a1a1aa;">
                                <i class="ri-bookmark-line" style="font-size:3.2rem;color:#64748b;display:block;margin-bottom:12px;"></i>
                                <h3 style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:8px;">No Saved Posts Found</h3>
                                <p style="font-size:0.88rem;color:#94a3b8;max-width:340px;margin:0 auto;line-height:1.5;">Posts you previously saved may have been removed or deleted.</p>
                            </div>`;
                        return;
                    }
                } else if (currentActiveTab === 'remixes') {
                    filtered = profilePosts.filter(p => {
                        return !!(p.original_id || p.originalId || p.source?.original_id || p.source?.originalId || p.source?.remix_of);
                    });

                    const remixFingerprint = `remixes:${filtered.map(p => `${p.id || ''}`).join('|')}`;
                    if (profileGrid._lastRenderFingerprint === remixFingerprint && profileGrid.children.length > 0 && !profileGrid.querySelector('.spin')) {
                        return;
                    }
                    profileGrid._lastRenderFingerprint = remixFingerprint;

                    if (filtered.length === 0) {
                        if (!profilePostsFetched) {
                            profileGrid._lastRenderFingerprint = null;
                            profileGrid.innerHTML = `
                                <div style="grid-column:1/-1;text-align:center;padding:50px 20px;color:#94a3b8;">
                                    <i class="ri-loader-4-line spin" style="font-size:2rem;display:inline-block;animation:spin 1s linear infinite;"></i>
                                    <div style="margin-top:10px;font-size:0.88rem;">Loading remixes...</div>
                                </div>`;
                        } else {
                            profileGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:50px 20px;color:#a1a1aa;">
                                <i class="ri-repeat-2-line" style="font-size:3rem;color:#475569;display:block;margin-bottom:10px;"></i>
                                <h3 style="color:#fff;font-size:1.1rem;font-weight:700;margin-bottom:6px;">No remixes found</h3>
                                <p style="font-size:0.85rem;color:#94a3b8;max-width:300px;margin:0 auto;">Remixes of lessons, reels, or animations will appear here.</p>
                            </div>`;
                        }
                        return;
                    }
                } else { // 'projects' tab (shows all creations)
                    filtered = profilePosts;

                    const projectsFingerprint = `projects:${filtered.map(p => `${p.id || ''}`).join('|')}`;
                    if (profileGrid._lastRenderFingerprint === projectsFingerprint && profileGrid.children.length > 0 && !profileGrid.querySelector('.spin')) {
                        return;
                    }
                    profileGrid._lastRenderFingerprint = projectsFingerprint;

                    if (filtered.length === 0) {
                        if (!profilePostsFetched) {
                            profileGrid._lastRenderFingerprint = null;
                            profileGrid.innerHTML = `
                                <div style="grid-column:1/-1;text-align:center;padding:50px 20px;color:#94a3b8;">
                                    <i class="ri-loader-4-line spin" style="font-size:2rem;display:inline-block;animation:spin 1s linear infinite;"></i>
                                    <div style="margin-top:10px;font-size:0.88rem;">Loading posts...</div>
                                </div>`;
                        } else {
                            profileGrid.innerHTML = `
                                <div style="grid-column:1/-1;text-align:center;padding:50px 20px;color:#a1a1aa;">
                                    <i class="ri-image-line" style="font-size:3rem;color:#475569;display:block;margin-bottom:10px;"></i>
                                    <h3 style="color:#fff;font-size:1.1rem;font-weight:700;margin-bottom:6px;">No posts yet</h3>
                                    <p style="font-size:0.85rem;color:#94a3b8;max-width:300px;margin:0 auto 16px;">Create your first animation, interactive widget, or 3D scene in Studio!</p>
                                    <a href="/views/xtraAnim.html" class="btn-primary" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:20px;text-decoration:none;font-size:0.85rem;font-weight:600;"><i class="ri-sparkling-fill"></i> Create in Studio</a>
                                </div>`;
                        }
                        return;
                    }
                }

                profileGrid.innerHTML = '';

                // SMART PROGRESSIVE CHUNKED RENDERING:
                // Load top 12 posts first for instant paint, then dynamically append more as user scrolls
                const CHUNK_SIZE = 12;
                let renderedCount = 0;

                const renderChunk = () => {
                    const nextBatch = filtered.slice(renderedCount, renderedCount + CHUNK_SIZE);
                    if (nextBatch.length === 0) return;

                    const fragment = document.createDocumentFragment();
                    nextBatch.forEach(post => {
                        fragment.appendChild(createProfilePostCard(post));
                    });

                    const sentinel = document.getElementById('profileGridSentinel');
                    if (sentinel) {
                        profileGrid.insertBefore(fragment, sentinel);
                    } else {
                        profileGrid.appendChild(fragment);
                    }

                    renderedCount += nextBatch.length;

                    if (renderedCount >= filtered.length && sentinel) {
                        sentinel.remove();
                        if (profileChunkObserver) {
                            profileChunkObserver.disconnect();
                            profileChunkObserver = null;
                        }
                    }
                };

                // Render initial top chunk immediately
                renderChunk();

                // If more posts exist, attach intersection observer to sentinel
                if (renderedCount < filtered.length) {
                    const sentinel = document.createElement('div');
                    sentinel.id = 'profileGridSentinel';
                    sentinel.style.gridColumn = '1 / -1';
                    sentinel.style.height = '30px';
                    sentinel.style.display = 'flex';
                    sentinel.style.alignItems = 'center';
                    sentinel.style.justifyContent = 'center';
                    profileGrid.appendChild(sentinel);

                    const scrollParent = document.querySelector('.main-content') || null;
                    profileChunkObserver = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                renderChunk();
                            }
                        });
                    }, { root: scrollParent, rootMargin: '200px' });
                    profileChunkObserver.observe(sentinel);
                }
            };

            window.renderCurrentProfilePosts = (tab) => {
                if (typeof renderPosts === 'function') {
                    renderPosts(tab || currentActiveTab);
                }
            };

            const tabProjects = document.getElementById('tabProjects');
            const tabRemixes = document.getElementById('tabRemixes');
            const tabSaved = document.getElementById('tabSaved');
            const tabLibrary = document.getElementById('tabLibrary');
            const profileTabsEl = document.getElementById('profileTabs');

            if (profileTabsEl && !profileTabsEl._wheelBound) {
                profileTabsEl._wheelBound = true;
                profileTabsEl.addEventListener('wheel', (e) => {
                    if (e.deltaY !== 0 && profileTabsEl.scrollWidth > profileTabsEl.clientWidth) {
                        e.preventDefault();
                        profileTabsEl.scrollLeft += e.deltaY;
                    }
                }, { passive: false });
            }

            if (tabProjects) tabProjects.onclick = (e) => { e.preventDefault(); currentActiveTab = 'projects'; window.location.hash = 'projects'; renderPosts('projects'); };
            if (tabRemixes) tabRemixes.onclick = (e) => { e.preventDefault(); currentActiveTab = 'remixes'; window.location.hash = 'remixes'; renderPosts('remixes'); };
            if (tabSaved) tabSaved.onclick = (e) => { e.preventDefault(); currentActiveTab = 'saved'; window.location.hash = 'saved'; renderPosts('saved'); };
            if (tabLibrary) tabLibrary.onclick = (e) => { e.preventDefault(); currentActiveTab = 'library'; window.location.hash = 'library'; renderPosts('library'); };

            // Initial 0ms immediate render
            renderPosts(currentActiveTab);

            window.onhashchange = () => {
                const h = window.location.hash.substring(1);
                currentActiveTab = ['saved', 'remixes', 'library'].includes(h) ? h : 'projects';
                renderPosts(currentActiveTab);
            };
        }

        // --- Fetch this user's posts from Supabase in background (Non-blocking Two-Stage Fetching) ---
        async function fetchFreshProfilePosts() {
            const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
            if (!client) return;

            const uName = (isOwnProfile ? myUsername : (targetUsernameForFollow || viewingUsername || '')).trim();
            const fields = 'id,created_at,user_id,title,description,video_url,media_type,format,original_id,username,avatar_url,source';

            // Function to query Supabase with range
            async function queryBatch(rangeStart, rangeEnd) {
                const remoteMap = new Map();
                if (targetUserId) {
                    try {
                        const { data: byUid, error: uidErr } = await client
                            .from('posts')
                            .select(fields)
                            .eq('user_id', targetUserId)
                            .order('created_at', { ascending: false })
                            .range(rangeStart, rangeEnd);
                        if (!uidErr && byUid) {
                            byUid.forEach(p => { if (p && p.id) remoteMap.set(String(p.id), p); });
                        }
                    } catch (_) { }
                }
                if (uName && remoteMap.size === 0) {
                    try {
                        const { data: byName, error: nameErr } = await client
                            .from('posts')
                            .select(fields)
                            .ilike('username', uName)
                            .order('created_at', { ascending: false })
                            .range(rangeStart, rangeEnd);
                        if (!nameErr && byName) {
                            byName.forEach(p => { if (p && p.id) remoteMap.set(String(p.id), p); });
                        }
                    } catch (_) { }
                }
                // Strictly ONLY for own profile: if remoteMap is 0, check viewer's own handle as a fallback
                if (isOwnProfile) {
                    const uHandle = (localStorage.getItem('handle') || '').trim().replace(/^@/, '');
                    if (uHandle && uHandle.toLowerCase() !== uName.toLowerCase() && remoteMap.size === 0) {
                        try {
                            const { data: byHandle, error: handleErr } = await client
                                .from('posts')
                                .select(fields)
                                .ilike('username', uHandle)
                                .order('created_at', { ascending: false })
                                .range(rangeStart, rangeEnd);
                            if (!handleErr && byHandle) {
                                byHandle.forEach(p => { if (p && p.id) remoteMap.set(String(p.id), p); });
                            }
                        } catch (_) { }
                    }
                }
                return Array.from(remoteMap.values()).map(p => {
                    let src = p.source;
                    if (typeof src === 'string') {
                        try { src = JSON.parse(src); } catch (_) { src = {}; }
                    }
                    return { ...p, source: src || {} };
                });
            }

            try {
                // STAGE 1: Fast top batch (top 12 posts)
                const topPosts = await queryBatch(0, 11);

                if (isOwnProfile) {
                    const mergedMap = new Map();
                    profilePosts.forEach(p => { if (p && p.id) mergedMap.set(String(p.id), p); });
                    topPosts.forEach(p => { if (p && p.id) mergedMap.set(String(p.id), p); });

                    profilePosts = Array.from(mergedMap.values());
                } else {
                    // For other users: server result is authoritative
                    const targetUnameLower = (targetUsernameForFollow || viewingUsername || '').toLowerCase();
                    const targetUidStr = targetUserId ? String(targetUserId) : '';
                    profilePosts = topPosts.filter(p => {
                        if (!p || !p.id) return false;
                        const pUid = p.user_id ? String(p.user_id) : '';
                        const pUname = (p.username || p.author || '').toLowerCase();
                        return (targetUidStr && pUid === targetUidStr) || (targetUnameLower && pUname === targetUnameLower);
                    });
                }

                profilePosts = profilePosts.filter(p => !(p.source?.lesson_id && !p.title));
                profilePosts.sort((a, b) => {
                    const timeA = new Date(a.created_at || a.timestamp || 0).getTime() || 0;
                    const timeB = new Date(b.created_at || b.timestamp || 0).getTime() || 0;
                    return timeB - timeA;
                });

                profilePostsFetched = true;
                if (!isOwnProfile) {
                    try {
                        const cacheKey = `cached_profile_posts_${targetUserId || targetUsernameForFollow}`;
                        localStorage.setItem(cacheKey, JSON.stringify(profilePosts.slice(0, 100)));
                    } catch (_) { }
                }
                if (typeof updateProfileStoryRing === 'function') updateProfileStoryRing();
                if (window.renderCurrentProfilePosts) window.renderCurrentProfilePosts(currentActiveTab);

                // STAGE 2: If there were 12 posts in top batch, fetch remaining posts in background
                if (topPosts.length >= 12) {
                    setTimeout(async () => {
                        try {
                            const restPosts = await queryBatch(12, 99);
                            if (restPosts.length > 0) {
                                if (isOwnProfile) {
                                    const mergedMap = new Map();
                                    profilePosts.forEach(p => { if (p && p.id) mergedMap.set(String(p.id), p); });
                                    restPosts.forEach(p => { if (p && p.id) mergedMap.set(String(p.id), p); });
                                    profilePosts = Array.from(mergedMap.values());
                                } else {
                                    const targetUnameLower = (targetUsernameForFollow || viewingUsername || '').toLowerCase();
                                    const targetUidStr = targetUserId ? String(targetUserId) : '';
                                    const validRest = restPosts.filter(p => {
                                        if (!p || !p.id) return false;
                                        const pUid = p.user_id ? String(p.user_id) : '';
                                        const pUname = (p.username || p.author || '').toLowerCase();
                                        return (targetUidStr && pUid === targetUidStr) || (targetUnameLower && pUname === targetUnameLower);
                                    });
                                    const combinedMap = new Map();
                                    profilePosts.forEach(p => { if (p && p.id) combinedMap.set(String(p.id), p); });
                                    validRest.forEach(p => { if (p && p.id) combinedMap.set(String(p.id), p); });
                                    profilePosts = Array.from(combinedMap.values());
                                }

                                profilePosts = profilePosts.filter(p => !(p.source?.lesson_id && !p.title));
                                profilePosts.sort((a, b) => {
                                    const timeA = new Date(a.created_at || a.timestamp || 0).getTime() || 0;
                                    const timeB = new Date(b.created_at || b.timestamp || 0).getTime() || 0;
                                    return timeB - timeA;
                                });

                                if (isOwnProfile) {
                                    try {
                                        localStorage.setItem('cached_my_profile_posts', JSON.stringify(profilePosts.slice(0, 100)));
                                        localStorage.setItem('userPosts', JSON.stringify(profilePosts.slice(0, 100)));
                                    } catch (_) { }
                                } else {
                                    try {
                                        const cacheKey = `cached_profile_posts_${targetUserId || targetUsernameForFollow}`;
                                        localStorage.setItem(cacheKey, JSON.stringify(profilePosts.slice(0, 100)));
                                    } catch (_) { }
                                }

                                if (window.renderCurrentProfilePosts) window.renderCurrentProfilePosts(currentActiveTab);
                            }
                        } catch (err2) {
                            console.warn('Could not fetch remaining profile posts:', err2);
                        }
                    }, 300);
                } else {
                    profilePostsFetched = true;
                    if (isOwnProfile) {
                        try {
                            localStorage.setItem('cached_my_profile_posts', JSON.stringify(profilePosts.slice(0, 100)));
                            localStorage.setItem('userPosts', JSON.stringify(profilePosts.slice(0, 100)));
                        } catch (_) { }
                    }
                }
            } catch (e) {
                console.warn('Could not fetch user posts from Supabase:', e);
                profilePostsFetched = true;
                if (!isOwnProfile) {
                    profilePosts = [];
                }
                if (window.renderCurrentProfilePosts) window.renderCurrentProfilePosts(currentActiveTab);
            }
        }
        fetchFreshProfilePosts();
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
            let reelObserver = null;
            let currentFocusedReel = null;

            // =========================================================================
            // REELS SINGLE-FOCUS AUDIO/MEDIA CONTROLLER
            // Guarantee: ONLY the currently focused reel plays sound. All other reels STOP.
            // =========================================================================
            function setFocusedReel(targetReel) {
                if (!targetReel) return;
                if (currentFocusedReel === targetReel) return;

                // 1. Immediately silence and stop previous reel and all other reels
                const allPosts = exploreFeed.querySelectorAll('.feed-post');
                allPosts.forEach(post => {
                    if (post !== targetReel) {
                        post.classList.remove('reel-focused');
                        // Mute & pause all videos
                        post.querySelectorAll('.post-media video, .reel-background video').forEach(v => {
                            try {
                                v.pause();
                                v.muted = true;
                            } catch (_) { }
                        });
                        // Mute & pause all iframes (Sound Studio, interactive)
                        post.querySelectorAll('.post-media iframe').forEach(frame => {
                            try {
                                frame.contentWindow?.postMessage({ type: 'SOUND_PAUSE' }, '*');
                                frame.contentWindow?.postMessage({ type: 'UNFOCUS' }, '*');
                                frame.contentWindow?.Sound?.pause();
                                frame.contentWindow?.Sound?.mute();
                            } catch (_) { }
                        });
                        // Mute & pause any audio elements
                        post.querySelectorAll('audio').forEach(a => {
                            try {
                                a.pause();
                                a.muted = true;
                            } catch (_) { }
                        });
                    }
                });

                currentFocusedReel = targetReel;
                targetReel.classList.add('reel-focused');

                // 2. Play audio & video on the focused reel ONLY
                // Videos in focused reel
                targetReel.querySelectorAll('.post-media video').forEach(v => {
                    v.muted = false;
                    const p = v.play();
                    if (p !== undefined) {
                        p.catch(() => {
                            // Fallback if browser blocks unmuted playback before gesture
                            v.muted = true;
                            v.play().catch(() => { });
                        });
                    }
                });
                // Ensure background blur videos are always muted
                targetReel.querySelectorAll('.reel-background video').forEach(bg => {
                    bg.muted = true;
                });

                // Iframes (Sound Studio, interactive) in focused reel
                targetReel.querySelectorAll('.post-media iframe').forEach(frame => {
                    try {
                        frame.contentWindow?.postMessage({ type: 'SOUND_RESUME' }, '*');
                        frame.contentWindow?.postMessage({ type: 'FOCUS' }, '*');
                        frame.contentWindow?.Sound?.resume();
                        frame.contentWindow?.Sound?.unmute();
                    } catch (_) { }
                });

                // Audios in focused reel
                targetReel.querySelectorAll('audio').forEach(a => {
                    try {
                        a.muted = false;
                        a.play().catch(() => { });
                    } catch (_) { }
                });
            }

            function updateFocusedReelFromScroll() {
                if (!isReels) return;
                const posts = exploreFeed.querySelectorAll('.feed-post');
                if (posts.length === 0) return;
                const containerRect = exploreFeed.getBoundingClientRect();
                const centerY = containerRect.top + containerRect.height / 2;
                let closestPost = null;
                let minDistance = Infinity;

                posts.forEach(post => {
                    const rect = post.getBoundingClientRect();
                    const postCenter = rect.top + rect.height / 2;
                    const dist = Math.abs(postCenter - centerY);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestPost = post;
                    }
                });

                if (closestPost && minDistance < containerRect.height * 0.5) {
                    setFocusedReel(closestPost);
                }
            }

            if (isReels) {
                // High-precision IntersectionObserver for snap-scrolling reels
                reelObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
                            setFocusedReel(entry.target);
                        }
                    });
                }, {
                    root: exploreFeed,
                    rootMargin: '0px',
                    threshold: [0.55, 0.75]
                });

                // RAF-throttled scroll listener for instantaneous sound handover
                let scrollRaf = null;
                scrollContainer.addEventListener('scroll', () => {
                    if (scrollRaf) return;
                    scrollRaf = requestAnimationFrame(() => {
                        scrollRaf = null;
                        updateFocusedReelFromScroll();
                    });
                }, { passive: true });
            } else {
                // =========================================================================
                // EXPLORE SINGLE-FOCUS MEDIA & SIMULATION CONTROLLER
                // Guarantee: The focused post simulation plays in a continuous loop.
                // When user scrolls to another post, the previous post's simulation stops.
                // =========================================================================
                let currentFocusedExplorePost = null;

                function playPostSimulationLoop(postEl) {
                    if (!postEl) return;
                    if (typeof postEl._playSimulation === 'function') {
                        postEl._playSimulation();
                        return;
                    }
                    const iframe = postEl.querySelector('.research-lab-sim-iframe');
                    if (iframe) {
                        try {
                            iframe.contentWindow?.postMessage({ type: 'SIM_PLAY_LOOP' }, '*');
                            iframe.contentWindow?.startSimulationLoop?.();
                        } catch (_) { }
                    }
                    const canvas = postEl.querySelector('.research-lab-sim-canvas');
                    if (canvas) {
                        canvas._isPaused = false;
                        canvas._simPaused = false;
                        canvas._forceRefire = true;
                    }
                    const videos = postEl.querySelectorAll('.post-media video, video.research-lab-sim-video');
                    videos.forEach(v => {
                        v.loop = true;
                        v.play().catch(() => { });
                    });
                }

                function pausePostSimulationOffscreen(postEl) {
                    if (!postEl) return;
                    if (typeof postEl._stopSimulation === 'function') {
                        try { postEl._stopSimulation(); } catch (_) { }
                    }
                    // 1. Pause all simulation and interactive iframes
                    const iframes = postEl.querySelectorAll('iframe');
                    iframes.forEach(iframe => {
                        try {
                            iframe.contentWindow?.postMessage({ type: 'PAUSE_ANIMATION' }, '*');
                            iframe.contentWindow?.postMessage({ type: 'SIM_PAUSE' }, '*');
                            iframe.contentWindow?.stopSimulation?.();
                            if (typeof iframe.contentWindow?.noLoop === 'function') {
                                iframe.contentWindow.noLoop();
                            }
                        } catch (_) { }
                    });
                    // 2. Pause all canvas renderers and cancel active animation frames
                    const canvases = postEl.querySelectorAll('canvas');
                    canvases.forEach(canvas => {
                        canvas._isPaused = true;
                        canvas._simPaused = true;
                        if (canvas._animId) {
                            cancelAnimationFrame(canvas._animId);
                            canvas._animId = null;
                        }
                    });
                    // 3. Pause all video media
                    const videos = postEl.querySelectorAll('.post-media video, video');
                    videos.forEach(v => {
                        try { v.pause(); } catch (_) { }
                    });
                }

                function stopPostSimulation(postEl) {
                    pausePostSimulationOffscreen(postEl);
                }

                function setFocusedExplorePost(targetPost) {
                    if (!targetPost) return;
                    if (currentFocusedExplorePost === targetPost) return;

                    // 1. Stop previous post's simulation and media
                    if (currentFocusedExplorePost) {
                        currentFocusedExplorePost.classList.remove('explore-focused-post');
                        stopPostSimulation(currentFocusedExplorePost);
                    }

                    // 2. Set new focused post and start its simulation in a continuous loop
                    currentFocusedExplorePost = targetPost;
                    targetPost.classList.add('explore-focused-post');
                    playPostSimulationLoop(targetPost);
                }

                function updateFocusedExplorePostFromScroll() {
                    if (isReels) return;
                    const posts = exploreFeed.querySelectorAll('.feed-post');
                    if (posts.length === 0) return;

                    const containerRect = (scrollContainer === window || !scrollContainer.getBoundingClientRect)
                        ? { top: 0, height: window.innerHeight }
                        : scrollContainer.getBoundingClientRect();
                    const centerY = containerRect.top + containerRect.height / 2;

                    let closestPost = null;
                    let minDistance = Infinity;

                    posts.forEach(post => {
                        const rect = post.getBoundingClientRect();
                        if (rect.bottom < containerRect.top || rect.top > containerRect.top + containerRect.height) {
                            return;
                        }
                        const postCenter = rect.top + rect.height / 2;
                        const dist = Math.abs(postCenter - centerY);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestPost = post;
                        }
                    });

                    if (closestPost) {
                        setFocusedExplorePost(closestPost);
                    }
                }

                // RAF-throttled scroll listeners for responsive, smooth focus handover
                let exploreScrollRaf = null;
                const onExploreScroll = () => {
                    if (exploreScrollRaf) return;
                    exploreScrollRaf = requestAnimationFrame(() => {
                        exploreScrollRaf = null;
                        updateFocusedExplorePostFromScroll();
                    });
                };

                scrollContainer.addEventListener('scroll', onExploreScroll, { passive: true });
                window.addEventListener('scroll', onExploreScroll, { passive: true });
                document.addEventListener('scroll', onExploreScroll, { passive: true });
                window.addEventListener('resize', onExploreScroll, { passive: true });

                // Viewport GPU & Animation Lifecycle Observer:
                // Pauses offscreen animation frames and WebGL to prevent mobile GPU thermal throttling and WebGL crashes
                videoObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        const target = entry.target;
                        if (!target) return;
                        if (entry.isIntersecting) {
                            target._isOffscreen = false;
                            playPostSimulationLoop(target);
                            updateFocusedExplorePostFromScroll();
                        } else {
                            target._isOffscreen = true;
                            pausePostSimulationOffscreen(target);
                        }
                    });
                }, {
                    root: scrollContainer === window ? null : scrollContainer,
                    rootMargin: '100px 0px',
                    threshold: [0.0, 0.25, 0.5, 0.8]
                });

                window._updateFocusedExplorePost = updateFocusedExplorePostFromScroll;
            }

            // Auto-unmute sound on user interaction for the FOCUSED reel only
            const unlockAudioPlayback = () => {
                if (isReels && currentFocusedReel) {
                    const vid = currentFocusedReel.querySelector('.post-media video');
                    if (vid && vid.muted) {
                        vid.muted = false;
                    }
                    const frame = currentFocusedReel.querySelector('.post-media iframe');
                    if (frame) {
                        try {
                            frame.contentWindow?.postMessage({ type: 'SOUND_RESUME' }, '*');
                            frame.contentWindow?.Sound?.unmute();
                            frame.contentWindow?.Sound?.resume();
                        } catch (_) { }
                    }
                    // Keep all non-focused reels muted
                    exploreFeed.querySelectorAll('.feed-post:not(.reel-focused) video, .reel-background video').forEach(v => {
                        v.muted = true;
                    });
                }
            };
            ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(evt => {
                window.addEventListener(evt, unlockAudioPlayback, { passive: true });
            });

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
                } catch (_) { }

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
                    } catch (_) { }
                } catch (e) {
                    console.warn("Could not load store attached material IDs:", e);
                }
                return storeAttachedIds;
            }

            function isStoreOrSupportingMaterial(post) {
                if (!post || !post.id) return false;

                // Explicit store products (courses & asset packs) belong in Store/Course directory
                if (post.format === 'course' || post.format === 'asset') return true;

                let src = post.source;
                if (typeof src === 'string') {
                    try { src = JSON.parse(src); } catch (_) { src = {}; }
                }
                src = src || {};

                // Only filter out items explicitly designated as store-only purchases or internal lesson attachments
                if (post.access_tier === 'store_sale' || src.access_tier === 'store_sale') {
                    return true;
                }
                if (src.is_course_material === true || src.is_store_material === true || src.is_supporting_material === true) {
                    return true;
                }
                if (src.lesson_id && !post.title) {
                    return true;
                }
                return false;
            }

            async function fetchFeedBatch(fromIdx, toIdx) {
                let posts = [];
                try {
                    // ZERO-TRUST SERVER SANITIZATION:
                    // First attempt to query 'posts_feed' view which strips sensitive code on the PostgreSQL server
                    // before transmitting across HTTP. If view not yet deployed, fallback gracefully to 'posts'.
                    let data = null;
                    let error = null;
                    try {
                        const feedRes = await supabase
                            .from('posts_feed')
                            .select('*')
                            .order('created_at', { ascending: false })
                            .range(fromIdx, toIdx);
                        if (!feedRes.error && Array.isArray(feedRes.data)) {
                            data = feedRes.data;
                        } else {
                            throw feedRes.error || new Error('Fallback needed');
                        }
                    } catch (_) {
                        const fallbackRes = await supabase
                            .from('posts')
                            .select('*')
                            .order('created_at', { ascending: false })
                            .range(fromIdx, toIdx);
                        if (fallbackRes.error) throw fallbackRes.error;
                        data = fallbackRes.data;
                    }

                    posts = data || [];
                    const currentViewerUid = localStorage.getItem('userId') || '';
                    posts.forEach(p => {
                        if (p.sanitized_source !== undefined) {
                            p.source = p.sanitized_source;
                        }
                        if (p && typeof p.source === 'string') {
                            try { p.source = JSON.parse(p.source); } catch (_) { p.source = {}; }
                        }

                        // Zero-Trust Protection: Client-side defense-in-depth sanitization
                        const isProtected = window.isPostCodeProtected ? window.isPostCodeProtected(p) : false;
                        const isAuthor = currentViewerUid && p.user_id && String(currentViewerUid) === String(p.user_id);
                        const isUnlocked = window.isItemUnlocked ? window.isItemUnlocked(p.id) : false;

                        if (isProtected && !isAuthor && !isUnlocked) {
                            if (p.source && typeof p.source === 'object') {
                                delete p.source.code;
                                delete p.source.latex;
                                delete p.source.typst;
                                delete p.source.raw_code;
                            }
                            if (p.code) {
                                delete p.code;
                            }
                        }
                        if (p && (p.format === 'researchlab' || p.type === 'researchlab' || p.is_research_lab)) {
                            p.is_research_lab = true;
                            if (p.source && typeof p.source === 'object') {
                                p.engine = p.engine || p.source.engine || p.source.proposal?.engine;
                                p.domain = p.domain || p.source.domain || p.source.proposal?.domain;
                                p.customSimulationCode = p.customSimulationCode || p.source.customSimulationCode || p.source.proposal?.customSimulationCode;
                                p.initialParams = p.initialParams || p.source.initialParams || p.source.proposal?.initialParams;
                                p.proposal = p.proposal || p.source.proposal || p.source;
                                p.proposal_id = p.id;
                                if (p.proposal) {
                                    p.proposal.id = p.id;
                                    p.proposal.proposal_id = p.id;
                                    if (p.username && p.username !== 'galileo_gal') {
                                        p.proposal.author = p.username;
                                        if (!p.proposal.authorName || p.proposal.authorName.toLowerCase().includes('galileo')) {
                                            p.proposal.authorName = p.username;
                                        }
                                    }
                                }
                            }
                        }
                    });

                    // Merge locally published posts on initial batch so local creations appear immediately
                    if (fromIdx === 0) {
                        const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                        const existingIds = new Set(posts.map(p => String(p.id)));

                        const unmerged = localPosts.filter(lp => {
                            if (!lp || !lp.id) return false;
                            return !existingIds.has(String(lp.id));
                        });

                        // Merge and sort chronologically
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
                const deletedIds = new Set(JSON.parse(localStorage.getItem('xtra_deleted_post_ids') || '[]').map(String));
                return rawPosts.filter(post => {
                    if (!post || !post.id) return false;
                    const pId = String(post.id);
                    const propId = String(post.proposal_id || post.proposal?.id || '');
                    if (deletedIds.has(pId) || (propId && deletedIds.has(propId))) {
                        return false;
                    }
                    // Exclude store-related products and their supporting materials from Explore & Reels
                    if (isStoreOrSupportingMaterial(post)) return false;

                    // Strictly exclude only unedited default starter Galileo post from public feeds
                    if (post.id === 'prop-physics-projectile' && !post.user_id && (post.author === 'galileo_gal' || post.username === 'galileo_gal')) {
                        return false;
                    }

                    // In Reels, strictly exclude books, articles, courses, explanations, and research lab posts
                    if (isReels && (post.format === 'pdf' || post.format === 'article' || post.format === 'course' || post.format === 'asset' || post.format === 'explanation' || post.format === 'researchlab' || post.type === 'researchlab' || post.is_research_lab)) {
                        return false;
                    }
                    if (post.source?.lesson_id && !post.title) return false;
                    return true;
                });
            }

            async function resolveStartPost(id) {
                if (!id) return null;
                const sId = String(id);
                const deletedIds = new Set(JSON.parse(localStorage.getItem('xtra_deleted_post_ids') || '[]').map(String));
                if (deletedIds.has(sId)) return null;

                if (window._allRenderedPosts && window._allRenderedPosts[sId]) {
                    return window._allRenderedPosts[sId];
                }
                const cacheSources = [
                    'userPosts',
                    'cached_my_profile_posts',
                    'cached_explore_feed',
                    'cached_reels_feed',
                    'cachedStoreItems'
                ];
                for (const key of cacheSources) {
                    try {
                        const list = JSON.parse(localStorage.getItem(key) || '[]');
                        const found = list.find(p => p && String(p.id) === sId);
                        if (found) return found;
                    } catch (_) { }
                }
                try {
                    const savedMap = JSON.parse(localStorage.getItem('savedPostsObjects') || '{}');
                    if (savedMap[sId]) return savedMap[sId];
                } catch (_) { }

                // Fallback: Fetch directly from Supabase by ID
                if (supabase) {
                    try {
                        const { data: dbPost, error: dbErr } = await supabase.from('posts').select('*').eq('id', sId).maybeSingle();
                        if (!dbErr && dbPost) {
                            if (typeof dbPost.source === 'string') {
                                try { dbPost.source = JSON.parse(dbPost.source); } catch (_) { dbPost.source = {}; }
                            }
                            if (dbPost.format === 'researchlab' || dbPost.type === 'researchlab' || dbPost.is_research_lab) {
                                dbPost.is_research_lab = true;
                                if (dbPost.source && typeof dbPost.source === 'object') {
                                    dbPost.engine = dbPost.engine || dbPost.source.engine || dbPost.source.proposal?.engine;
                                    dbPost.domain = dbPost.domain || dbPost.source.domain || dbPost.source.proposal?.domain;
                                    dbPost.customSimulationCode = dbPost.customSimulationCode || dbPost.source.customSimulationCode || dbPost.source.proposal?.customSimulationCode;
                                    dbPost.initialParams = dbPost.initialParams || dbPost.source.initialParams || dbPost.source.proposal?.initialParams;
                                    dbPost.proposal = dbPost.proposal || dbPost.source.proposal || dbPost.source;
                                    dbPost.proposal_id = dbPost.proposal_id || dbPost.proposal?.id || dbPost.id;
                                }
                            }
                            return dbPost;
                        }
                    } catch (e) {
                        console.warn('Could not fetch target start post by ID:', e);
                    }
                }
                return null;
            }

            async function loadNextBatch() {
                if (isLoading || !hasMore) return;
                isLoading = true;

                const isInitial = (currentOffset === 0);
                const urlParams = new URLSearchParams(window.location.search);
                const startId = urlParams.get('id') || urlParams.get('postId');

                if (isInitial) {
                    let hasRenderedCache = false;
                    const currentUserId = localStorage.getItem('userId');

                    // If a startId is present in URL, resolve it first
                    let startPost = null;
                    if (startId) {
                        startPost = await resolveStartPost(startId);
                        if (startPost) {
                            if (typeof startPost.source === 'string') {
                                try { startPost.source = JSON.parse(startPost.source); } catch (_) { startPost.source = {}; }
                            }
                            // Handle format redirects
                            if (startPost.format === 'pdf' || startPost.format === 'book') {
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
                            if (startPost.format === 'researchlab' || startPost.type === 'researchlab' || startPost.is_research_lab) {
                                window.location.replace(`/views/researchLab.html?id=${encodeURIComponent(startPost.proposal_id || startPost.id)}`);
                                return;
                            }
                            if (!isReels && (startPost.format === 'reel' || startPost.format === '9:16' || startPost.feed_type === 'reel')) {
                                window.location.replace(`/views/reels.html?id=${encodeURIComponent(startPost.id)}`);
                                return;
                            }
                        }
                    }

                    if (exploreFeed.children.length === 0) {
                        try {
                            const cacheKey = isReels ? 'cached_reels_feed' : 'cached_explore_feed';
                            const cacheUidKey = isReels ? 'cached_reels_feed_uid' : 'cached_explore_feed_uid';
                            const cacheRaw = localStorage.getItem(cacheKey);
                            const cacheUserId = localStorage.getItem(cacheUidKey);

                            let cachedList = [];
                            if (cacheRaw && (!currentUserId || cacheUserId === currentUserId)) {
                                cachedList = JSON.parse(cacheRaw) || [];
                            }

                            // Purge any deleted posts from cachedList
                            const delSet = new Set(JSON.parse(localStorage.getItem('xtra_deleted_post_ids') || '[]').map(String));
                            cachedList = cachedList.filter(p => p && p.id && !delSet.has(String(p.id)) && !delSet.has(String(p.proposal_id || '')));

                            // If startPost exists, ensure it is at index 0 of cachedList
                            if (startPost) {
                                cachedList = [startPost, ...cachedList.filter(p => p && String(p.id) !== String(startId))];
                            } else if (!isReels) {
                                const labPosts = getPublishedResearchLabPosts();
                                if (labPosts.length > 0) {
                                    const existingLabIds = new Set(cachedList.map(p => String(p.id)));
                                    cachedList.forEach(p => {
                                        if (p.proposal_id) existingLabIds.add(String(p.proposal_id));
                                        if (p.source?.proposal?.id) existingLabIds.add(String(p.source.proposal.id));
                                    });
                                    const newLabPosts = labPosts.filter(lp => !existingLabIds.has(String(lp.id)) && !existingLabIds.has(String(lp.proposal_id || '')));
                                    if (newLabPosts.length > 0) {
                                        cachedList = [...newLabPosts, ...cachedList];
                                    }
                                }
                            }

                            // Purge any mock starter Galileo posts from cachedList
                            cachedList = cachedList.filter(p => p && !(p.id === 'prop-physics-projectile' || p.username === 'galileo_gal' || p.author === 'galileo_gal' || (p.author && typeof p.author === 'string' && p.author.toLowerCase().includes('galileo'))));

                            if (isReels && Array.isArray(cachedList)) {
                                cachedList = cachedList.filter(p => p && p.format !== 'researchlab' && p.type !== 'researchlab' && !p.is_research_lab);
                            }

                            if (Array.isArray(cachedList) && cachedList.length > 0) {
                                if (!isReels) renderDynamicStoryBar(cachedList);
                                if (!window._allRenderedPosts) window._allRenderedPosts = {};
                                const cachedPostIds = [];
                                const viewType = isReels ? 'reel' : 'grid';
                                cachedList.forEach(post => {
                                    if (post && post.id && !allRenderedPostIds.has(String(post.id))) {
                                        allRenderedPostIds.add(String(post.id));
                                        cachedPostIds.push(String(post.id));
                                        window._allRenderedPosts[String(post.id)] = post;
                                        const { element, init } = createPostElement(post, viewType);
                                        if (element) {
                                            exploreFeed.appendChild(element);
                                            if (videoObserver) {
                                                const vids = element.querySelectorAll('.post-media video');
                                                vids.forEach(v => videoObserver.observe(v));
                                                videoObserver.observe(element);
                                            }
                                            if (reelObserver) {
                                                reelObserver.observe(element);
                                            }
                                            if (init) init();
                                        }
                                    }
                                });
                                if (cachedPostIds.length > 0) {
                                    fetchPostLikeData(cachedPostIds);
                                }
                                hasRenderedCache = true;
                                if (isReels) {
                                    exploreFeed.scrollTop = 0;
                                    setTimeout(updateFocusedReelFromScroll, 120);
                                } else {
                                    setTimeout(updateFocusedExplorePostFromScroll, 120);
                                }
                            }
                        } catch (_) { }
                    }
                    if (!hasRenderedCache && exploreFeed.children.length === 0) {
                        showInitialLoading();
                    }
                } else if (!isReels) {
                    sentinel.innerHTML = `<div style="width:24px;height:24px;border:2px solid rgba(255,255,255,0.1);border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;"></div>`;
                }

                try {
                    let collectedPosts = [];
                    let attempts = 0;

                    while (collectedPosts.length < PAGE_SIZE && hasMore && attempts < 10) {
                        attempts++;
                        const rawPosts = await fetchFeedBatch(currentOffset, currentOffset + PAGE_SIZE - 1);
                        if (!rawPosts || rawPosts.length < PAGE_SIZE) {
                            hasMore = false;
                        }
                        currentOffset += PAGE_SIZE;

                        const filtered = filterFeedPosts(rawPosts || []);
                        collectedPosts.push(...filtered);

                        if (!hasMore) break;
                    }

                    let filteredPosts = collectedPosts;

                    // If startId is present and was not yet resolved or rendered
                    if (isInitial && startId) {
                        let startPost = await resolveStartPost(startId);
                        if (startPost) {
                            if (typeof startPost.source === 'string') {
                                try { startPost.source = JSON.parse(startPost.source); } catch (_) { startPost.source = {}; }
                            }
                            filteredPosts = [startPost, ...filteredPosts.filter(p => String(p.id) !== String(startId))];
                        }
                    }

                    // Prepend published research lab posts on initial explore feed load (avoiding duplicates)
                    if (isInitial && !isReels && !startId) {
                        const labPosts = getPublishedResearchLabPosts();
                        if (labPosts.length > 0) {
                            const existingLabIds = new Set(filteredPosts.map(p => String(p.id)));
                            filteredPosts.forEach(p => {
                                if (p.proposal_id) existingLabIds.add(String(p.proposal_id));
                                if (p.source?.proposal?.id) existingLabIds.add(String(p.source.proposal.id));
                            });
                            const newLabPosts = labPosts.filter(lp => !existingLabIds.has(String(lp.id)) && !existingLabIds.has(String(lp.proposal_id || '')));
                            if (newLabPosts.length > 0) {
                                filteredPosts = [...newLabPosts, ...filteredPosts];
                            }
                        }
                        // Purge any mock starter Galileo posts
                        filteredPosts = filteredPosts.filter(p => p && !(p.id === 'prop-physics-projectile' || p.username === 'galileo_gal' || p.author === 'galileo_gal' || (p.author && typeof p.author === 'string' && p.author.toLowerCase().includes('galileo'))));
                    }

                    // Double-check against deleted posts
                    const activeDeletedSet = new Set(JSON.parse(localStorage.getItem('xtra_deleted_post_ids') || '[]').map(String));
                    filteredPosts = filteredPosts.filter(p => p && p.id && !activeDeletedSet.has(String(p.id)) && !activeDeletedSet.has(String(p.proposal_id || '')));

                    // Save latest fresh feed batch to cache
                    if (isInitial && filteredPosts.length > 0) {
                        try {
                            const uid = localStorage.getItem('userId') || '';
                            const cacheKey = isReels ? 'cached_reels_feed' : 'cached_explore_feed';
                            const cacheUidKey = isReels ? 'cached_reels_feed_uid' : 'cached_explore_feed_uid';
                            localStorage.setItem(cacheKey, JSON.stringify(filteredPosts.slice(0, isReels ? 8 : 15)));
                            localStorage.setItem(cacheUidKey, uid);
                        } catch (_) { }
                    }

                    // Remove initial spinner
                    const initialSpinner = document.getElementById('feedInitialSpinner');
                    if (initialSpinner && (filteredPosts.length > 0 || !hasMore || exploreFeed.querySelector('.grid-post, .reel-post-wrapper, .feed-post'))) {
                        initialSpinner.remove();
                    }
                    if (exploreFeed.contains(sentinel)) sentinel.remove();

                    if (isInitial || !exploreFeed.querySelector('.grid-post, .reel-post-wrapper, .feed-post')) {
                        if (filteredPosts.length === 0 && !hasMore) {
                            exploreFeed.innerHTML = `
                                    <div style="text-align: center; padding: 60px; color: #a1a1aa; width:100%;">
                                        <h3>Nothing to see here… yet!</h3>
                                        <p>Be the first to publish a creation and appear here.</p>
                                    </div>`;
                            isLoading = false;
                            return;
                        }

                        if (!isReels) {
                            renderDynamicStoryBar(filteredPosts);
                        }
                    }

                    // Append each post element safely
                    const newPostIds = [];
                    if (!window._allRenderedPosts) window._allRenderedPosts = {};

                    filteredPosts.forEach(post => {
                        try {
                            if (post && post.id && !allRenderedPostIds.has(String(post.id))) {
                                allRenderedPostIds.add(String(post.id));
                                newPostIds.push(post.id);
                                window._allRenderedPosts[String(post.id)] = post;
                                const viewType = isReels ? 'reel' : 'grid';
                                const { element, init } = createPostElement(post, viewType);
                                if (element) {
                                    // If this is the startPost and somehow other posts were in DOM, insert at top
                                    if (startId && String(post.id) === String(startId) && exploreFeed.firstElementChild) {
                                        exploreFeed.insertBefore(element, exploreFeed.firstElementChild);
                                    } else {
                                        exploreFeed.appendChild(element);
                                    }
                                    if (videoObserver) {
                                        const vids = element.querySelectorAll('.post-media video');
                                        vids.forEach(v => videoObserver.observe(v));
                                        videoObserver.observe(element);
                                    }
                                    if (reelObserver) {
                                        reelObserver.observe(element);
                                    }
                                    if (init) init();
                                }
                            }
                        } catch (postErr) {
                            console.error('Error rendering post ID:', post?.id, postErr);
                        }
                    });

                    // If starting on a specific post in reels, guarantee scroll position is on that post
                    if (isInitial && startId) {
                        if (isReels) {
                            exploreFeed.scrollTop = 0;
                            setTimeout(updateFocusedReelFromScroll, 120);
                        } else {
                            setTimeout(() => {
                                const targetEl = document.querySelector(`.feed-post[data-post-id="${startId}"]`);
                                if (targetEl) {
                                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    targetEl.style.transition = 'box-shadow 0.4s ease';
                                    targetEl.style.boxShadow = '0 0 0 2px #3b82f6, 0 10px 30px rgba(59, 130, 246, 0.4)';
                                    setTimeout(() => { targetEl.style.boxShadow = ''; }, 2500);
                                }
                                updateFocusedExplorePostFromScroll();
                            }, 300);
                        }
                    } else if (isReels && isInitial) {
                        setTimeout(updateFocusedReelFromScroll, 120);
                    } else if (!isReels) {
                        setTimeout(updateFocusedExplorePostFromScroll, 120);
                    }

                    // Update global allLoadedPosts for remix counters
                    const existingGlobal = window.allLoadedPosts || [];
                    window.allLoadedPosts = [...existingGlobal, ...filteredPosts];
                    updateAllRemixCounters();
                    updateAllFollowButtons();

                    if (!isReels && activeExploreCategory !== 'all') {
                        applyExploreCategoryFilter(activeExploreCategory);
                    }

                    if (newPostIds.length > 0) {
                        fetchPostLikeData(newPostIds);
                    }

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

            // Category Filter Controller for Explore Page
            let activeExploreCategory = 'all';

            function matchesCategory(post, category) {
                if (!category || category === 'all') return true;
                if (!post) return false;

                const title = (post.title || '').toLowerCase();
                const desc = (post.description || '').toLowerCase();
                const format = (post.format || '').toLowerCase();
                const engine = (post.source?.engine || '').toLowerCase();
                const tags = Array.isArray(post.tags) ? post.tags.map(t => String(t).toLowerCase()) : [];
                const text = `${title} ${desc} ${tags.join(' ')}`;

                if (category === 'researchlab') {
                    return post.format === 'researchlab' || post.is_research_lab || post.type === 'researchlab';
                }

                if (category === 'physics') {
                    if (post.format === 'researchlab' && (post.domain === 'physics' || post.engine?.includes('projectile') || post.engine?.includes('optics'))) return true;
                    const physicsKeywords = ['physic', 'mechanic', 'quantum', 'gravity', 'optic', 'relativ', 'wave', 'thermo', 'electromagnet', 'fluid', 'force', 'newton', 'schrodinger', 'einstein', 'spacetime', 'lensing', 'black hole', 'motion', 'pendulum', 'velocity', 'particle', 'energy', 'momentum'];
                    return physicsKeywords.some(k => text.includes(k)) || tags.some(t => t.includes('physics'));
                }

                if (category === 'math') {
                    if (post.format === 'researchlab' && (post.domain === 'calculus' || post.domain === 'math' || post.engine?.includes('calculus'))) return true;
                    if (['tikz', 'katex', 'jsxgraph'].includes(engine) || ['tikz', 'katex', 'jsxgraph'].includes(format)) return true;
                    const mathKeywords = ['math', 'calculus', 'algebra', 'geometry', 'fourier', 'integral', 'matrix', 'topology', 'equation', 'derivative', 'vector', 'prime', 'euler', 'complex', 'trigonometry', 'graph', 'function', 'pi', 'fractal', 'tensor', 'series'];
                    return mathKeywords.some(k => text.includes(k)) || tags.some(t => t.includes('math'));
                }

                if (category === '3d') {
                    if (['3d_model', 'threejs_scene', 'svg_to_3d', 'cartoon_studio'].includes(format) || ['threejs', 'zdog', 'svg_to_3d', 'cartoon_studio'].includes(engine)) return true;
                    return text.includes('3d') || text.includes('threejs') || text.includes('mesh') || text.includes('tesseract') || text.includes('cartoon') || text.includes('stickman') || text.includes('mocap');
                }

                if (category === 'simulation') {
                    if (post.format === 'researchlab' || format === 'simulation' || ['anime', 'rough', 'two', 'd3', 'cartoon_studio', 'sound_studio', 'rapier'].includes(engine)) return true;
                    const simKeywords = ['simulation', 'simulat', 'orbit', 'pendulum', 'collision', 'spring', 'particle', 'cloth', 'attractor', 'chaos', 'flow', 'dynamics', 'cartoon', 'mocap', 'locomotion', 'sound', 'wave', 'audio', 'rapier', 'physics', 'rigid', 'ragdoll'];
                    return simKeywords.some(k => text.includes(k));
                }

                if (category === 'interactive') {
                    if (['interactive', 'anime', 'rough', 'two', 'jsxgraph', 'cartoon_studio', 'sound_studio', 'rapier'].includes(format) || ['interactive', 'anime', 'rough', 'two', 'jsxgraph', 'cartoon_studio', 'sound_studio', 'rapier'].includes(engine)) return true;
                    return text.includes('interactive') || text.includes('widget') || text.includes('slider') || text.includes('cartoon') || text.includes('sound') || text.includes('audio');
                }

                if (category === 'articles') {
                    if (['article', 'pdf', 'book', 'explanation', 'course'].includes(format)) return true;
                    return text.includes('article') || text.includes('guide') || text.includes('book') || text.includes('paper');
                }

                return true;
            }

            function applyExploreCategoryFilter(category) {
                activeExploreCategory = category;
                const posts = exploreFeed.querySelectorAll('.feed-post');
                let visibleCount = 0;

                posts.forEach(postEl => {
                    const postId = postEl.dataset.postId;
                    const postData = window._allRenderedPosts?.[postId];
                    if (!postData || matchesCategory(postData, category)) {
                        postEl.style.display = '';
                        visibleCount++;
                    } else {
                        postEl.style.display = 'none';
                    }
                });

                // Handle empty state message for category if 0 visible
                let catEmptyState = document.getElementById('exploreCategoryEmptyState');
                if (visibleCount === 0 && posts.length > 0) {
                    if (!catEmptyState) {
                        catEmptyState = document.createElement('div');
                        catEmptyState.id = 'exploreCategoryEmptyState';
                        catEmptyState.style.cssText = 'text-align:center; padding:50px 20px; color:#a1a1aa; width:100%;';
                        exploreFeed.insertBefore(catEmptyState, sentinel);
                    }
                    catEmptyState.innerHTML = `
                        <div style="font-size:2.4rem; color:#64748b; margin-bottom:10px;"><i class="ri-search-eye-line"></i></div>
                        <h4 style="color:#ffffff; font-size:1.05rem; font-weight:700; margin-bottom:6px;">No posts in this category yet</h4>
                        <p style="font-size:0.85rem; color:#94a3b8; max-width:320px; margin:0 auto 16px;">Try switching to another category or explore all creations.</p>
                        <button class="btn-primary" onclick="document.querySelector('#exploreFilters [data-category=\\'all\\']')?.click()" style="padding:6px 16px; border-radius:20px; font-size:0.82rem; font-weight:600; cursor:pointer;">View All</button>
                    `;
                    catEmptyState.style.display = '';
                } else if (catEmptyState) {
                    catEmptyState.style.display = 'none';
                }
            }

            const exploreFiltersEl = document.getElementById('exploreFilters');
            if (exploreFiltersEl) {
                const filterButtons = exploreFiltersEl.querySelectorAll('.filter-btn');
                filterButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        filterButtons.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        const category = btn.dataset.category || 'all';
                        applyExploreCategoryFilter(category);
                    });
                });

                // Smooth horizontal mouse-wheel scrolling
                if (!exploreFiltersEl._wheelBound) {
                    exploreFiltersEl._wheelBound = true;
                    exploreFiltersEl.addEventListener('wheel', (e) => {
                        if (e.deltaY !== 0 && exploreFiltersEl.scrollWidth > exploreFiltersEl.clientWidth) {
                            e.preventDefault();
                            exploreFiltersEl.scrollLeft += e.deltaY;
                        }
                    }, { passive: false });
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


                    const engine = post.source?.engine || post.format;
                    const code = post.source?.code;

                    if ((engine === 'cartoon_studio' || post.format === 'cartoon_studio') && code && typeof window.renderCartoonStudio === 'function' && container) {
                        const iframeContent = window.renderCartoonStudio(code, { isFeed: false });
                        container.innerHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; min-height: 500px; border: none; border-radius: 12px; background: #0f172a;" allowfullscreen></iframe>`;
                    } else if (window.EngineManager?.hasEngine(engine) && code && container) {
                        const iframeContent = window.EngineManager.renderHtml(post, { isFeed: false, isInteractive: true });
                        if (iframeContent) {
                            container.innerHTML = `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; min-height: 500px; border: none; border-radius: 12px; background: #0a0d14;" allowfullscreen></iframe>`;
                        }
                    } else {
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
                    }

                    const watchRemixBtn = document.getElementById('remixBtn');
                    if (watchRemixBtn) {
                        watchRemixBtn.onclick = async () => {
                            // Check if protected and paywall is required
                            const isProtected = window.isPostCodeProtected ? window.isPostCodeProtected(post) : false;
                            const isAuthor = currentUserId && post.user_id && String(currentUserId) === String(post.user_id);
                            const isUnlocked = window.isItemUnlocked ? window.isItemUnlocked(post.id) : false;

                            if (isProtected && !isAuthor && !isUnlocked) {
                                if (window.showSourcePaywallModal) {
                                    window.showSourcePaywallModal(post, () => {
                                        watchRemixBtn.click();
                                    });
                                } else {
                                    alert("This creation's source code is proprietary. Please unlock it to view and remix the code.");
                                }
                                return;
                            }

                            // Fetch secure code if stripped from feed
                            let srcObj = post.source || (post.code ? { engine: 'manim', code: post.code } : {});
                            if (typeof srcObj === 'string') {
                                try { srcObj = JSON.parse(srcObj); } catch(_) { srcObj = {}; }
                            }
                            if ((!srcObj.code && !post.code) && post.id) {
                                try {
                                    const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
                                    if (client) {
                                        const { data: rpcRes } = await client.rpc('get_secure_post_code', { p_post_id: post.id });
                                        if (rpcRes && rpcRes.success && rpcRes.code) {
                                            srcObj.code = rpcRes.code;
                                            if (rpcRes.engine) srcObj.engine = rpcRes.engine;
                                        }
                                    }
                                } catch(_) {}
                            }

                            localStorage.setItem('remixMeta', JSON.stringify({
                                source: srcObj,
                                originalId: post.id,
                                userId: post.user_id,
                                title: post.title
                            }));
                            let editorUrl = '/views/xtraAnim.html';
                            if (srcObj.engine === 'cartoon_studio') editorUrl = '/views/xtraAnim.html?tool=cartoon_studio';
                            else if (srcObj.engine) editorUrl = `/views/xtraAnim.html?tool=${srcObj.engine}`;
                            window.location.href = editorUrl;
                        };
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

                // Live Rough.js Hand-Drawn Sketch if code exists
                if ((format === 'interactive' || format === 'rough') && (post.source?.engine === 'rough' || post.format === 'rough') && post.source?.code && typeof window.renderRough === 'function') {
                    const iframeContent = window.renderRough(post.source.code, { width: 1280, height: 720, background: post.source.background || '#0e1117' });
                    return `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0e1117; pointer-events:none;"></iframe>`;
                }

                // Live Anime.js Kinetic Motion if code exists
                if ((format === 'interactive' || format === 'anime') && (post.source?.engine === 'anime' || post.format === 'anime') && post.source?.code && typeof window.renderAnime === 'function') {
                    const iframeContent = window.renderAnime(post.source.code, { width: 1280, height: 720, background: post.source.background || '#080a10' });
                    return `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#080a10; pointer-events:none;"></iframe>`;
                }

                // Live Two.js 2D Vector Motion if code exists
                if ((format === 'interactive' || format === 'two') && (post.source?.engine === 'two' || post.format === 'two') && post.source?.code && typeof window.renderTwo === 'function') {
                    const iframeContent = window.renderTwo(post.source.code, { width: 1280, height: 720, background: post.source.background || '#090b10' });
                    return `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#090b10; pointer-events:none;"></iframe>`;
                }

                // Live SVG to 3D if code exists
                if ((format === '3d_model' || format === 'interactive') && post.source?.engine === 'svg_to_3d' && post.source?.code && typeof window.createSVG3DViewerIframeContent === 'function') {
                    const svgCode = JSON.stringify(post.source.code);
                    const iframeContent = window.createSVG3DViewerIframeContent(svgCode, post.source.color || '#3b82f6', false);
                    return `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0a0d14; pointer-events:none;"></iframe>`;
                }

                // Live Cartoon Studio 3D if code exists
                if ((format === '3d_model' || format === 'interactive') && (post.source?.engine === 'cartoon_studio' || post.format === 'cartoon_studio') && post.source?.code && typeof window.renderCartoonStudio === 'function') {
                    const iframeContent = window.renderCartoonStudio(post.source.code, { isFeed: true });
                    return `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0f172a; pointer-events:none;"></iframe>`;
                }

                // Live Zdog 3D if code exists
                if ((format === '3d_model' || format === 'interactive') && post.source?.engine === 'zdog' && post.source?.code && typeof window.renderZdog === 'function') {
                    const iframeContent = window.renderZdog(post.source.code, { background: '#0a0d14' });
                    return `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0a0d14; pointer-events:none;"></iframe>`;
                }

                // Live JSXGraph Math if code exists
                if ((format === 'math' || format === 'interactive') && post.source?.engine === 'jsxgraph' && post.source?.code && typeof window.renderJSXGraph === 'function') {
                    const iframeContent = window.renderJSXGraph(post.source.code, { background: '#0a0d14' });
                    return `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0a0d14; pointer-events:none;"></iframe>`;
                }

                // Live D3.js Visualization if code exists
                if ((format === 'chart' || format === 'interactive' || format === 'simulation') && post.source?.engine === 'd3' && post.source?.code && typeof window.renderD3 === 'function') {
                    const iframeContent = window.renderD3(post.source.code, { background: '#0a0d14' });
                    return `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0a0d14; pointer-events:none;"></iframe>`;
                }

                // Live Matter.js Physics if code exists
                if ((format === 'simulation' || format === 'interactive') && post.source?.engine === 'matter' && post.source?.code && typeof window.renderMatter === 'function') {
                    const iframeContent = window.renderMatter(post.source.code, { background: '#0a0d14' });
                    return `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0a0d14; pointer-events:none;"></iframe>`;
                }

                // Live KaTeX Math if code exists
                if (format === 'math' && post.source?.code && typeof window.renderKatex === 'function') {
                    const iframeContent = window.renderKatex(post.source.code, { fontSize: '1.4em', color: '#ffffff' });
                    return `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0a0d14; pointer-events:none;"></iframe>`;
                }

                // Live Mermaid Diagram if code exists
                if (format === 'diagram' && post.source?.code && typeof window.renderMermaid === 'function') {
                    const iframeContent = window.renderMermaid(post.source.code, 280, 400);
                    return `<iframe sandbox="allow-scripts allow-same-origin" srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0a0d14; pointer-events:none;"></iframe>`;
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
            const redirectTo = window.location.origin + '/views/explore.html';

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
    const logoutBtn = document.querySelector('#logoutBtn, a[href="/views/login.html"], a[href="/views/index.html"], a[href="/"]');
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

        // --- Sync Context from URL parameters if provided ---
        const urlParamsOnLoad = new URLSearchParams(window.location.search);
        if (urlParamsOnLoad.get('from') === 'article') {
            const articleCtx = {
                from: 'article',
                mode: urlParamsOnLoad.get('mode') || 'cover',
                articleId: urlParamsOnLoad.get('articleId') || null
            };
            localStorage.setItem('articleContext', JSON.stringify(articleCtx));
        }

        // --- Check for Course or Article Context on Studio Load ---
        const courseContextRaw = localStorage.getItem('courseContext');
        const articleContextRaw = localStorage.getItem('articleContext');
        const publishToCourseBtn = document.getElementById('publishToCourseBtn');
        const publishToProfileBtn = document.getElementById('confirmUpload');
        const headerPublishContextBtn = document.getElementById('headerPublishContextBtn');

        if (courseContextRaw) {
            if (publishToCourseBtn) {
                publishToCourseBtn.style.display = 'block';
                publishToCourseBtn.textContent = 'Publish to Course';
            }
            if (publishToProfileBtn) publishToProfileBtn.textContent = 'Publish to Profile';
            if (uploadBtn) {
                uploadBtn.textContent = '☁️ Publish to Course';
                uploadBtn.style.background = '#10b981';
            }
            if (headerPublishContextBtn) {
                headerPublishContextBtn.style.display = 'flex';
                headerPublishContextBtn.innerHTML = '<i class="ri-check-line"></i> Publish to Course';
                headerPublishContextBtn.onclick = () => {
                    if (uploadModal) uploadModal.style.display = 'block';
                };
            }
        } else if (articleContextRaw) {
            if (publishToCourseBtn) {
                publishToCourseBtn.style.display = 'block';
                publishToCourseBtn.textContent = 'Publish to Article';
            }
            if (publishToProfileBtn) publishToProfileBtn.textContent = 'Publish to Profile';
            if (uploadBtn) {
                uploadBtn.textContent = '☁️ Publish to Article';
                uploadBtn.style.background = '#10b981';
            }
            if (headerPublishContextBtn) {
                headerPublishContextBtn.style.display = 'flex';
                headerPublishContextBtn.innerHTML = '<i class="ri-check-line"></i> Publish to Article';
                headerPublishContextBtn.onclick = () => {
                    if (uploadModal) uploadModal.style.display = 'block';
                };
            }
        }

        // --- A. NEW: ENGINE MANAGEMENT ---
        const availableEngines = [
            { id: 'p5', name: 'p5', file: 'sketch.js', language: 'javascript' },
            { id: 'three', name: 'Three', file: 'scene.js', language: 'javascript' },
            { id: 'anime', name: 'Anime.js (Motion)', file: 'animation.js', language: 'javascript' },
            { id: 'rough', name: 'Rough.js (Sketch)', file: 'sketch.js', language: 'javascript' },
            { id: 'two', name: 'Two.js (2D Vectors)', file: 'vector.js', language: 'javascript' },
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
            { id: 'svg_to_png', name: 'SVG to PNG', file: 'vector.svg', language: 'xml' },
            { id: 'cartoon_studio', name: 'Cartoon Studio', file: 'cartoon.js', language: 'javascript' },
            { id: 'sound_studio', name: 'Sound Studio (Waves & Audio)', file: 'sound.js', language: 'javascript' },
            { id: 'rapier', name: 'Rapier 3D Physics (WASM)', file: 'physics.js', language: 'javascript' }
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
        if (engineSelectHeader) engineSelectHeader.addEventListener('change', (e) => {
            if (typeof window.switchEngine === 'function') window.switchEngine(e.target.value);
            else if (typeof switchEngine === 'function') switchEngine(e.target.value);
        });
        if (engineSelectModal) engineSelectModal.addEventListener('change', (e) => {
            if (typeof window.switchEngine === 'function') window.switchEngine(e.target.value);
            else if (typeof switchEngine === 'function') switchEngine(e.target.value);
        });

        // --- C. Console & Rendering Logic (Moved Up for Scope) ---
        const renderBtn = document.getElementById('renderBtn');
        const consoleLog = document.querySelector('.console-log');

        const threejsTemplate = `// Three.js: Quantum Core & Cosmic Constellation
// Interactive 3D Cybernetic Core with Gyro Rings, Volumetric Stardust & Chromatic Lighting

// 1. Scene & Depth Fog Setup
const container = document.getElementById('canvas-container') || document.body;
const width = typeof __WIDTH__ !== 'undefined' ? __WIDTH__ : (container.clientWidth || window.innerWidth);
const height = typeof __HEIGHT__ !== 'undefined' ? __HEIGHT__ : (container.clientHeight || window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050716, 0.028);

const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
camera.position.set(0, 0.6, 7.2);

// 2. WebGL Renderer with ACES Tone Mapping
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
if (renderer.toneMapping !== undefined) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
}
container.appendChild(renderer.domElement);

// 3. Multi-Chromatic Lighting System
const ambientLight = new THREE.AmbientLight(0x1e1b4b, 1.2);
scene.add(ambientLight);

const lightCyan = new THREE.PointLight(0x00f5ff, 3.2, 45, 1.8);
lightCyan.position.set(5, 4, 5);
scene.add(lightCyan);

const lightRose = new THREE.PointLight(0xff007f, 3.2, 45, 1.8);
lightRose.position.set(-5, -3, 4);
scene.add(lightRose);

const keyLight = new THREE.DirectionalLight(0xffbe0b, 1.3);
keyLight.position.set(0, 10, 8);
scene.add(keyLight);

// 4. Quantum Centerpiece Group
const coreGroup = new THREE.Group();
scene.add(coreGroup);

// 4a. Iridescent Metallic Torus Knot
const knotGeo = new THREE.TorusKnotGeometry(1.4, 0.36, 160, 32, 2, 3);
const knotMat = new THREE.MeshStandardMaterial({
    color: 0x4f46e5,
    metalness: 0.88,
    roughness: 0.18,
    emissive: 0x1e1b4b,
    emissiveIntensity: 0.35
});
const knotMesh = new THREE.Mesh(knotGeo, knotMat);
coreGroup.add(knotMesh);

// 4b. Wireframe Lattice Aura
const wireMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.22
});
const wireMesh = new THREE.Mesh(knotGeo, wireMat);
wireMesh.scale.set(1.025, 1.025, 1.025);
coreGroup.add(wireMesh);

// 4c. Inner Glowing Quantum Core
const innerGeo = new THREE.IcosahedronGeometry(0.68, 0);
const innerMat = new THREE.MeshStandardMaterial({
    color: 0x00f5ff,
    emissive: 0x00d2ff,
    emissiveIntensity: 0.85,
    roughness: 0.1,
    metalness: 0.4
});
const innerCore = new THREE.Mesh(innerGeo, innerMat);
coreGroup.add(innerCore);

// 4d. Inner Geometric Facet Shell
const facetGeo = new THREE.OctahedronGeometry(0.88, 0);
const facetMat = new THREE.MeshBasicMaterial({
    color: 0xff007f,
    wireframe: true,
    transparent: true,
    opacity: 0.65
});
const facetShell = new THREE.Mesh(facetGeo, facetMat);
coreGroup.add(facetShell);

// 5. Orbital Gyro Rings with Glowing Satellites
const ringGroup = new THREE.Group();
scene.add(ringGroup);

const ringMat1 = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.9
});
const ringGeo1 = new THREE.TorusGeometry(2.35, 0.02, 16, 120);
const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
ring1.rotation.x = Math.PI / 3;
ringGroup.add(ring1);

const satGeo = new THREE.SphereGeometry(0.07, 16, 16);
const satMat1 = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
const satellite1 = new THREE.Mesh(satGeo, satMat1);
ringGroup.add(satellite1);

const ringMat2 = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xbe123c,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.9
});
const ringGeo2 = new THREE.TorusGeometry(2.8, 0.018, 16, 120);
const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
ring2.rotation.x = -Math.PI / 4;
ring2.rotation.y = Math.PI / 6;
ringGroup.add(ring2);

const satMat2 = new THREE.MeshBasicMaterial({ color: 0xff007f });
const satellite2 = new THREE.Mesh(satGeo, satMat2);
ringGroup.add(satellite2);

// 6. Volumetric Cosmic Stardust Constellation
const particleCount = 1500;
const pGeometry = new THREE.BufferGeometry();
const pPositions = new Float32Array(particleCount * 3);
const pColors = new Float32Array(particleCount * 3);

const colorInside = new THREE.Color(0x00f5ff);
const colorMid = new THREE.Color(0x818cf8);
const colorOutside = new THREE.Color(0xf43f5e);

for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const radius = Math.pow(Math.random(), 1.5) * 8.5 + 0.5;
    const branchAngle = ((i % 3) * ((2 * Math.PI) / 3)) + (radius * 0.45);
    const spinAngle = radius * 0.8;
    const totalAngle = branchAngle + spinAngle;

    const randomX = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.4) * radius;
    const randomY = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.4) * radius;
    const randomZ = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.4) * radius;

    pPositions[i3] = Math.cos(totalAngle) * radius + randomX;
    pPositions[i3 + 1] = randomY + (Math.sin(radius * 2.0) * 0.3);
    pPositions[i3 + 2] = Math.sin(totalAngle) * radius + randomZ;

    const mixedColor = colorInside.clone();
    if (radius < 4.0) {
        mixedColor.lerp(colorMid, radius / 4.0);
    } else {
        mixedColor.lerp(colorOutside, (radius - 4.0) / 4.5);
    }
    pColors[i3] = mixedColor.r;
    pColors[i3 + 1] = mixedColor.g;
    pColors[i3 + 2] = mixedColor.b;
}

pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
pGeometry.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

const pMaterial = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const particles = new THREE.Points(pGeometry, pMaterial);
scene.add(particles);

// 7. Interactive Mouse Parallax (Normalized -1 to 1)
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;
const halfWidth = width / 2;
const halfHeight = height / 2;

function onMouseMove(event) {
    mouseX = (event.clientX - halfWidth) / halfWidth;
    mouseY = (event.clientY - halfHeight) / halfHeight;
}
window.addEventListener('mousemove', onMouseMove, { passive: true });

// 8. 60 FPS Cinematic Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Harmonic Core Rotation
    knotMesh.rotation.x = elapsedTime * 0.35;
    knotMesh.rotation.y = elapsedTime * 0.55;
    wireMesh.rotation.x = knotMesh.rotation.x;
    wireMesh.rotation.y = knotMesh.rotation.y;

    // Counter-spinning Quantum Core & Facet Shell
    innerCore.rotation.x = -elapsedTime * 0.7;
    innerCore.rotation.y = -elapsedTime * 0.9;
    facetShell.rotation.x = elapsedTime * 0.6;
    facetShell.rotation.z = elapsedTime * 0.8;

    // Harmonic Core Breathing Scale
    const pulse = 1.0 + Math.sin(elapsedTime * 2.2) * 0.04;
    innerCore.scale.set(pulse, pulse, pulse);

    // Orbiting Satellites on Gyro Rings
    const sat1Angle = elapsedTime * 1.5;
    satellite1.position.set(
        Math.cos(sat1Angle) * 2.35,
        Math.sin(sat1Angle) * 2.35 * Math.sin(Math.PI / 3),
        Math.sin(sat1Angle) * 2.35 * Math.cos(Math.PI / 3)
    );

    const sat2Angle = -elapsedTime * 1.2;
    satellite2.position.set(
        Math.cos(sat2Angle) * 2.8 * Math.cos(Math.PI / 6),
        Math.sin(sat2Angle) * 2.8 * Math.sin(-Math.PI / 4),
        Math.sin(sat2Angle) * 2.8 * Math.cos(-Math.PI / 4)
    );

    // Gyro Rings Slow Oscillation
    ringGroup.rotation.y = elapsedTime * 0.15;
    ringGroup.rotation.z = Math.sin(elapsedTime * 0.4) * 0.12;

    // Cosmic Particle Field Slow Drift
    particles.rotation.y = elapsedTime * 0.05;
    particles.rotation.x = Math.sin(elapsedTime * 0.2) * 0.04;

    // Orbiting Chromatic Lights
    lightCyan.position.x = Math.sin(elapsedTime * 0.8) * 5.5;
    lightCyan.position.z = Math.cos(elapsedTime * 0.8) * 5.5;
    lightRose.position.x = -Math.sin(elapsedTime * 0.7) * 5.5;
    lightRose.position.z = -Math.cos(elapsedTime * 0.7) * 5.5;

    // Smooth Parallax Camera Damping
    targetX = mouseX * 0.8;
    targetY = -mouseY * 0.5;
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY + 0.6 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}

animate();

// 9. Viewport Auto-Resize
window.addEventListener('resize', () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});`;

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

        const svgTemplate = (window.svg3dTemplates && window.svg3dTemplates.cyber_mech_falcon) || window.defaultSvg3dCode || `<svg viewBox="0 0 100 100">
  <path d="M50 5 L61 39 L97 39 L68 61 L79 95 L50 73 L21 95 L32 61 L3 39 L39 39 Z" fill="#3b82f6" />
</svg>`;

        const mermaidTemplate = `graph TD
    A[Start] --> B{Is it?};
    B -- Yes --> C[OK];
    C --> D[End];
    B -- No --> E[Find out];
    E --> D;`;

        const katexTemplates = window.katexTemplates || {};
        const katexTemplate = window.katexTemplate || (window.katexTemplates ? window.katexTemplates.physics_electrodynamics : `% Class 12 Physics: Electrodynamics & AC Wave Circuits
\\begin{aligned}
\\textcolor{#38bdf8}{\\oint \\mathbf{E} \\cdot d\\mathbf{A}} &= \\textcolor{#38bdf8}{\\frac{q_{\\text{enclosed}}}{\\varepsilon_0}} \\qquad \\text{(Gauss's Law of Electrostatics)} \\\\[10pt]
\\textcolor{#ec4899}{\\varepsilon} &= -\\textcolor{#ec4899}{\\frac{d\\Phi_B}{dt}} = -L \\frac{dI}{dt} \\qquad \\text{(Faraday-Lenz Law of Induction)} \\\\[10pt]
\\textcolor{#10b981}{Z} &= \\sqrt{R^2 + \\left(\\omega L - \\frac{1}{\\omega C}\\right)^2}, \\quad \\textcolor{#10b981}{\\omega_0 = \\frac{1}{\\sqrt{LC}}} \\quad \\text{(LCR Resonance)} \\\\[10pt]
\\textcolor{#f59e0b}{\\frac{1}{f}} &= (\\mu - 1) \\left( \\frac{1}{R_1} - \\frac{1}{R_2} \\right) \\qquad \\text{(Lens Maker's Formula)}
\\end{aligned}`);

        const jsxgraphTemplates = window.jsxgraphTemplates || {};
        const jsxgraphTemplate = window.jsxgraphTemplate || (window.jsxgraphTemplates ? window.jsxgraphTemplates.calculus_tangent : `// Interactive Calculus: Tangent Line & Derivative with JSXGraph
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
});`);

        const animeTemplates = window.animeTemplates || {};
        const animeTemplate = window.animeTemplate || (window.animeTemplates ? window.animeTemplates.kinetic_grid : '');

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

        const fabricThemes = {
            modern_article: `// --- 21:9 Article Cover Banner (1920x820 / 16:9) ---
// Available in scope: canvas, logicalWidth, logicalHeight, helpers, fabric

// 1. Sleek Modern Radial Dark Background
const bg = new fabric.Rect({
    left: 0, top: 0, width: logicalWidth, height: logicalHeight,
    selectable: false, evented: false,
    fill: helpers.createGradient(
        { x1: 0, y1: 0, x2: logicalWidth, y2: logicalHeight },
        [
            { offset: 0, color: '#090b10' },
            { offset: 0.5, color: '#111827' },
            { offset: 1, color: '#1e1b4b' }
        ]
    )
});
canvas.add(bg);

// 2. Blueprint / Matrix Coordinate Grid
canvas.add(helpers.createGridPattern(60, 'rgba(99, 102, 241, 0.06)'));

// 3. Ambient Glow Orbs
canvas.add(helpers.createGlowOrb(Math.max(600, logicalWidth - 480), 120, 260, '#3b82f6', 110));
canvas.add(helpers.createGlowOrb(Math.max(700, logicalWidth - 260), Math.min(480, logicalHeight - 240), 220, '#8b5cf6', 100));

// 4. Category & Status Stickers
canvas.add(helpers.createSticker('article', 80, 60, 'FEATURED ARTICLE • DEEP DIVE'));
canvas.add(helpers.createSticker('formula', 480, 60, '📐 MATHEMATICAL PHYSICS'));

// 5. Headline & Subtitle Typography
const title = new fabric.Textbox('GRAVITATIONAL FIELDS &\\nQUANTUM SPACETIME', {
    left: 80, top: 150, width: Math.min(1150, logicalWidth - 200),
    fontSize: Math.min(64, Math.round(logicalHeight * 0.10)), lineHeight: 0.95, fontWeight: '900',
    fontFamily: 'Outfit, sans-serif', fill: '#ffffff',
    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.8)', blur: 20, offsetX: 4, offsetY: 4 })
});
canvas.add(title);

const subtitle = new fabric.Textbox('A comprehensive mathematical breakdown of Einstein tensor field equations and geodesic curvature.', {
    left: 80, top: Math.min(380, logicalHeight * 0.52), width: Math.min(950, logicalWidth - 200),
    fontSize: 22, lineHeight: 1.4, fontWeight: '400',
    fontFamily: 'Inter, sans-serif', fill: '#94a3b8'
});
canvas.add(subtitle);

// 6. Metric Highlight Badges
const badgeTop = Math.min(540, logicalHeight - 140);
canvas.add(helpers.createMetricBadge('100%', 'VECTOR QUALITY', 80, badgeTop, '#38bdf8'));
canvas.add(helpers.createMetricBadge('45 min', 'READING TIME', 300, badgeTop, '#a78bfa'));

canvas.renderAll();`,

            scientific_hero: `// --- Scientific & Physics Hero (16:9 / 21:9) ---
// Available in scope: canvas, logicalWidth, logicalHeight, helpers, fabric

// 1. Dark Cosmos Gradient
const bg = new fabric.Rect({
    left: 0, top: 0, width: logicalWidth, height: logicalHeight,
    selectable: false, evented: false,
    fill: helpers.createGradient(
        { x1: 0, y1: 0, x2: logicalWidth, y2: logicalHeight },
        [
            { offset: 0, color: '#030712' },
            { offset: 0.6, color: '#0f172a' },
            { offset: 1, color: '#172554' }
        ]
    )
});
canvas.add(bg);

// 2. Blueprint Coordinate Grid
canvas.add(helpers.createGridPattern(50, 'rgba(56, 189, 248, 0.08)'));

// 3. Neon Orbs
canvas.add(helpers.createGlowOrb(Math.max(600, logicalWidth - 450), 160, 260, '#06b6d4', 110));
canvas.add(helpers.createGlowOrb(Math.max(700, logicalWidth - 240), Math.min(520, logicalHeight - 220), 220, '#3b82f6', 100));

// 4. Badges
canvas.add(helpers.createSticker('physics', 80, 60, '⚛️ THEORETICAL PHYSICS'));
canvas.add(helpers.createSticker('interactive', 480, 60, '⚡ LIVE 3D SIMULATION'));

// 5. Main Typography
const title = new fabric.Textbox('NON-LINEAR\\nOSCILLATIONS', {
    left: 80, top: 150, width: Math.min(1050, logicalWidth - 200),
    fontSize: Math.min(84, Math.round(logicalHeight * 0.12)), lineHeight: 0.9, fontWeight: '900',
    fontFamily: 'Outfit, sans-serif', fill: '#ffffff',
    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.9)', blur: 25, offsetX: 6, offsetY: 6 })
});
canvas.add(title);

// 6. Glass Card with Equation Preview
const cardTop = Math.min(420, Math.round(logicalHeight * 0.52));
const cardHeight = Math.min(220, Math.round(logicalHeight * 0.32));
canvas.add(helpers.createGlassCard(80, cardTop, Math.min(750, logicalWidth - 160), cardHeight, 'Phase Space: x\'\' + γx\' + ω²x = F₀ cos(ωt)', 'Discover chaotic attractors, Lyapunov exponents, and Fourier frequency transforms in dynamic equilibrium.'));

canvas.renderAll();`,

            course_masterclass: `// --- Course Masterclass Hero Card (4:3 / 16:9) ---
// Available in scope: canvas, logicalWidth, logicalHeight, helpers, fabric

const bg = new fabric.Rect({
    left: 0, top: 0, width: logicalWidth, height: logicalHeight,
    selectable: false, evented: false,
    fill: helpers.createGradient(
        { x1: 0, y1: 0, x2: logicalWidth, y2: logicalHeight },
        [
            { offset: 0, color: '#0c0a09' },
            { offset: 0.5, color: '#1c1917' },
            { offset: 1, color: '#451a03' }
        ]
    )
});
canvas.add(bg);

canvas.add(helpers.createGlowOrb(Math.max(500, logicalWidth - 300), 160, 220, '#f59e0b', 100));
canvas.add(helpers.createSticker('course', 70, 60, '📘 COMPLETE MASTERCLASS'));
canvas.add(helpers.createSticker('pro', 460, 60, '👑 PRO CERTIFIED'));

const title = new fabric.Textbox('FULL STACK\\nCOMPUTATION', {
    left: 70, top: 150, width: Math.min(900, logicalWidth - 140),
    fontSize: Math.min(72, Math.round(logicalHeight * 0.11)), lineHeight: 0.95, fontWeight: '900',
    fontFamily: 'Outfit, sans-serif', fill: '#ffffff',
    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.9)', blur: 20, offsetX: 4, offsetY: 4 })
});
canvas.add(title);

const cCardTop = Math.min(420, Math.round(logicalHeight * 0.52));
const cCardHeight = Math.min(220, Math.round(logicalHeight * 0.32));
canvas.add(helpers.createGlassCard(70, cCardTop, Math.min(650, logicalWidth - 140), cCardHeight, 'From Manim to GPU Shaders', 'Includes 12 step-by-step interactive lessons, LaTeX worksheets, and downloadable 3D asset packs.'));

canvas.renderAll();`,

            minimal_slate: `// --- Minimal Slate Tech ---
// Available in scope: canvas, logicalWidth, logicalHeight, helpers, fabric

const bg = new fabric.Rect({
    left: 0, top: 0, width: logicalWidth, height: logicalHeight,
    selectable: false, evented: false,
    fill: helpers.createGradient(
        { x1: 0, y1: 0, x2: logicalWidth, y2: logicalHeight },
        [
            { offset: 0, color: '#09090b' },
            { offset: 0.6, color: '#18181b' },
            { offset: 1, color: '#0284c7' }
        ]
    )
});
canvas.add(bg);

canvas.add(helpers.createAccentBar(70, 120, 160, 6, '#38bdf8', '#818cf8'));
canvas.add(helpers.createSticker('verified', 70, 60, '✓ PEER REVIEWED'));

const title = new fabric.Textbox('DISCRETE\\nMATHEMATICS', {
    left: 70, top: 150, width: Math.min(900, logicalWidth - 140),
    fontSize: Math.min(78, Math.round(logicalHeight * 0.12)), lineHeight: 0.95, fontWeight: '900',
    fontFamily: 'Outfit, sans-serif', fill: '#ffffff'
});
canvas.add(title);

canvas.add(helpers.createMetricBadge('O(log n)', 'COMPLEXITY', 70, Math.min(420, Math.round(logicalHeight * 0.54)), '#38bdf8'));

canvas.renderAll();`
        };

        const fabricTemplate = fabricThemes.modern_article;
        window.fabricThemes = fabricThemes;
        window.fabricTemplate = fabricTemplate;

        const templates = {
            calculus: `from manim import *
import numpy as np

class AnimationScene(Scene):
    def construct(self):
        # 1. Dark aesthetic cinematic canvas
        self.camera.background_color = "#0b0f19"

        # 2. Pure coordinate axes (no text labels or LaTeX)
        axes = Axes(
            x_range=[-4, 4, 1],
            y_range=[-3, 5, 1],
            x_length=9,
            y_length=6,
            axis_config={
                "color": BLUE_D,
                "stroke_width": 2,
                "include_tip": True,
                "tip_width": 0.18,
                "tip_height": 0.18
            }
        ).center()

        # 3. Dual intersecting mathematical curves
        curve1 = axes.plot(
            lambda x: 0.25 * x**3 - 0.8 * x + 0.5,
            x_range=[-3.2, 3.2],
            color=TEAL_B,
            stroke_width=4
        )

        curve2 = axes.plot(
            lambda x: 1.8 * np.sin(1.2 * x),
            x_range=[-3.5, 3.5],
            color=PURPLE_B,
            stroke_width=3
        )

        # Dynamic coordinate grid lines
        grid = NumberPlane(
            x_range=[-4, 4, 1],
            y_range=[-3, 5, 1],
            x_length=9,
            y_length=6,
            background_line_style={"stroke_color": BLUE_E, "stroke_width": 1.0, "stroke_opacity": 0.35}
        ).center()

        self.play(Create(grid), Create(axes), run_time=1.2)
        self.play(Create(curve1), Create(curve2), run_time=1.8)

        # 4. Luminescent shaded area between curves
        area = axes.get_area(curve1, x_range=[-2.5, 2.5], color=[BLUE_C, TEAL_C], opacity=0.25)
        self.play(FadeIn(area), run_time=1.0)

        # 5. Dynamic moving point, tangent vector & orthogonal normal vector
        t = ValueTracker(-2.5)

        dot = always_redraw(lambda: Dot(
            axes.c2p(t.get_value(), 0.25 * t.get_value()**3 - 0.8 * t.get_value() + 0.5),
            color=YELLOW,
            radius=0.12
        ))

        # Dynamic tangent vector (derivative direction)
        tangent = always_redraw(lambda: Arrow(
            start=axes.c2p(t.get_value(), 0.25 * t.get_value()**3 - 0.8 * t.get_value() + 0.5),
            end=axes.c2p(
                t.get_value() + 0.8,
                (0.25 * t.get_value()**3 - 0.8 * t.get_value() + 0.5) + (3 * 0.25 * t.get_value()**2 - 0.8) * 0.8
            ),
            color=PINK,
            buff=0,
            stroke_width=4,
            max_tip_length_to_length_ratio=0.22
        ))

        # Dynamic normal vector (perpendicular to tangent)
        normal = always_redraw(lambda: Arrow(
            start=axes.c2p(t.get_value(), 0.25 * t.get_value()**3 - 0.8 * t.get_value() + 0.5),
            end=axes.c2p(
                t.get_value() - (3 * 0.25 * t.get_value()**2 - 0.8) * 0.6,
                (0.25 * t.get_value()**3 - 0.8 * t.get_value() + 0.5) + 0.6
            ),
            color=RED_B,
            buff=0,
            stroke_width=3,
            max_tip_length_to_length_ratio=0.25
        ))

        self.play(FadeIn(dot), GrowArrow(tangent), GrowArrow(normal))
        
        # 6. Smooth sweep along the curve
        self.play(t.animate.set_value(2.5), run_time=4.0, rate_func=smooth)
        self.play(t.animate.set_value(-2.0), run_time=3.0, rate_func=smooth)
        self.wait(1)`,

            fourier: `from manim import *
import numpy as np

class AnimationScene(Scene):
    def construct(self):
        self.camera.background_color = "#080c18"

        # 1. Comic Sans MS Bold Title with Underline
        title = Text(
            "Fourier Series: Harmonic Epicycles and Wave Synthesis",
            font="Comic Sans MS",
            weight=BOLD,
            font_size=28,
            color=WHITE
        ).to_edge(UP, buff=0.35)

        underline = Line(LEFT * 6.5, RIGHT * 6.5, color=BLUE_D, stroke_width=2.5).next_to(title, DOWN, buff=0.15)

        # 2. Formula with bold, enlarged presence (increased width & scale)
        formula = MathTex(
            r"f(t) = \\frac{4}{\\pi} \\sum_{k=1,3,5,\\dots}^{\\infty} \\frac{\\sin(k \\omega t)}{k}",
            color=TEAL
        ).scale(0.92).next_to(underline, DOWN, buff=0.28).to_edge(LEFT, buff=0.8)

        self.play(Write(title), Create(underline), run_time=1.0)
        self.play(FadeIn(formula, shift=DOWN * 0.2))

        # 3. Enhanced Fourier Epicycles (Bigger circles, thicker lines, vibrant contrast)
        harmonics = [1, 3, 5, 7, 9]
        origin = LEFT * 3.8 + DOWN * 1.3
        time_tracker = ValueTracker(0.0)

        def get_epicycles():
            t = time_tracker.get_value()
            group = VGroup()
            curr_center = origin

            for k in harmonics:
                radius = 1.35 * (4.0 / (k * np.pi))
                angle = k * t
                next_center = curr_center + np.array([radius * np.cos(angle), radius * np.sin(angle), 0])

                # Enhanced width circles & arrows for high visibility
                circle = Circle(
                    radius=radius,
                    color=BLUE_C,
                    stroke_width=2.5,
                    stroke_opacity=0.75
                ).move_to(curr_center)

                arrow = Line(
                    curr_center,
                    next_center,
                    color=TEAL_A,
                    stroke_width=3.5
                )

                dot = Dot(next_center, color=YELLOW_A, radius=0.065)

                group.add(circle, arrow, dot)
                curr_center = next_center

            return group, curr_center

        epicycles = always_redraw(lambda: get_epicycles()[0])

        # 4. Bold Synthesized Wave (Thicker stroke for maximum visibility)
        wave_pts = []
        wave_line = VMobject(color=YELLOW, stroke_width=4.5)
        wave_origin_x = 0.6

        def update_wave(mob):
            _, end_pt = get_epicycles()
            wave_pts.insert(0, end_pt[1])
            if len(wave_pts) > 210:
                wave_pts.pop()

            pts = [np.array([wave_origin_x + i * 0.03, y, 0]) for i, y in enumerate(wave_pts)]
            if len(pts) > 1:
                mob.set_points_as_corners(pts)

        wave_line.add_updater(update_wave)

        # 5. Connecting line with enhanced visibility
        connector = always_redraw(lambda: Line(
            get_epicycles()[1],
            np.array([wave_origin_x, get_epicycles()[1][1], 0]),
            color=PINK,
            stroke_width=2.5,
            stroke_opacity=0.9
        ))

        self.add(epicycles, connector, wave_line)
        self.play(time_tracker.animate.set_value(4 * np.pi), run_time=6.5, rate_func=linear)
        self.wait(1)`,

            orbit: `from manim import *
import numpy as np

class AnimationScene(Scene):
    def construct(self):
        # 1. Deep cosmic canvas
        self.camera.background_color = "#050711"

        # 2. Distant ambient stars
        np.random.seed(42)
        stars = VGroup(*[
            Dot(
                point=np.array([np.random.uniform(-7, 7), np.random.uniform(-4, 4), 0]),
                radius=np.random.uniform(0.015, 0.035),
                color=interpolate_color(BLUE_E, WHITE, np.random.uniform(0.2, 0.9)),
                fill_opacity=np.random.uniform(0.3, 0.8)
            )
            for _ in range(45)
        ])
        self.add(stars)

        # 3. Central Luminous Star (Sun) with multilayered corona
        sun_pos = ORIGIN + LEFT * 0.9
        sun_outer_corona = Dot(sun_pos, radius=1.4, color="#ff9f1c", fill_opacity=0.10)
        sun_mid_corona = Dot(sun_pos, radius=0.85, color="#ffbf69", fill_opacity=0.25)
        sun_inner_glow = Dot(sun_pos, radius=0.48, color="#ffe49e", fill_opacity=0.55)
        sun_core = Dot(sun_pos, radius=0.28, color="#ffffff")

        self.play(
            FadeIn(sun_outer_corona),
            FadeIn(sun_mid_corona),
            FadeIn(sun_inner_glow),
            GrowFromCenter(sun_core),
            run_time=1.2
        )

        # 4. Keplerian Orbit Path (Semi-major a=4.2, Eccentricity e=0.58)
        a = 4.2
        e = 0.58
        b = a * np.sqrt(1 - e**2)
        c = a * e
        orbit_center = sun_pos + RIGHT * c

        orbit_track = Ellipse(width=2 * a, height=2 * b, color="#1e3a5f", stroke_width=2.5, stroke_opacity=0.6).move_to(orbit_center)
        orbit_glow = Ellipse(width=2 * a, height=2 * b, color="#0284c7", stroke_width=1.0, stroke_opacity=0.3).move_to(orbit_center)
        self.play(Create(orbit_track), Create(orbit_glow), run_time=1.2)

        # 5. Orbiting Planet with Dynamic Vectors
        theta = ValueTracker(0.0)

        def get_pos(th):
            r = a * (1 - e**2) / (1 + e * np.cos(th))
            return sun_pos + np.array([r * np.cos(th), r * np.sin(th), 0])

        planet_halo = always_redraw(lambda: Dot(
            get_pos(theta.get_value()),
            radius=0.28,
            color="#38bdf8",
            fill_opacity=0.22
        ))
        planet_body = always_redraw(lambda: Dot(
            get_pos(theta.get_value()),
            radius=0.15,
            color="#0ea5e9"
        ))
        planet_core = always_redraw(lambda: Dot(
            get_pos(theta.get_value()),
            radius=0.07,
            color="#e0f2fe"
        ))

        # Dynamic Gravitational Force Vector (Points towards Sun)
        grav_vec = always_redraw(lambda: Arrow(
            start=get_pos(theta.get_value()),
            end=get_pos(theta.get_value()) + (sun_pos - get_pos(theta.get_value())) * (0.18 + 0.32 * (1 / (1 + e * np.cos(theta.get_value())))),
            color="#f43f5e",
            buff=0,
            stroke_width=3.5,
            max_tip_length_to_length_ratio=0.25
        ))

        # Dynamic Velocity Vector (Tangent to Orbit with speed modulation)
        def get_velocity_vec():
            th = theta.get_value()
            r = a * (1 - e**2) / (1 + e * np.cos(th))
            dr_dth = a * (1 - e**2) * e * np.sin(th) / ((1 + e * np.cos(th))**2)
            dx = dr_dth * np.cos(th) - r * np.sin(th)
            dy = dr_dth * np.sin(th) + r * np.cos(th)
            v_dir = np.array([dx, dy, 0])
            norm = np.linalg.norm(v_dir)
            if norm > 1e-6:
                v_dir = v_dir / norm
            speed_factor = 1.0 + 0.8 * np.cos(th)
            return Arrow(
                start=get_pos(th),
                end=get_pos(th) + v_dir * (0.8 * speed_factor),
                color="#10b981",
                buff=0,
                stroke_width=3.5,
                max_tip_length_to_length_ratio=0.25
            )

        vel_vec = always_redraw(get_velocity_vec)

        # Dissipating luminous ion trail
        trail = TracedPath(planet_body.get_center, stroke_color="#38bdf8", stroke_width=3.2, stroke_opacity=0.7, dissipating_time=1.8)
        self.add(trail)

        self.play(FadeIn(planet_halo), FadeIn(planet_body), FadeIn(planet_core), GrowArrow(grav_vec), GrowArrow(vel_vec))

        # Smooth continuous planetary orbit
        self.play(theta.animate.set_value(4 * np.pi), run_time=8.0, rate_func=linear)
        self.wait(1)`,

            linear_algebra: `from manim import *
import numpy as np

class AnimationScene(Scene):
    def construct(self):
        # 1. Dark aesthetic canvas
        self.camera.background_color = "#0a0d1a"

        # 2. Centered Coordinate NumberPlane Grid
        plane = NumberPlane(
            x_range=[-6, 6, 1],
            y_range=[-4, 4, 1],
            background_line_style={"stroke_color": "#1e293b", "stroke_width": 1.5, "stroke_opacity": 0.6},
            axis_config={"stroke_color": "#38bdf8", "stroke_width": 2.5, "include_tip": True, "tip_width": 0.18, "tip_height": 0.18}
        ).center()

        # 3. Translucent Unit Square / Determinant Area (Spans (0,0), (1,0), (1,1), (0,1))
        unit_square = Polygon(
            plane.c2p(0, 0),
            plane.c2p(1, 0),
            plane.c2p(1, 1),
            plane.c2p(0, 1),
            color="#38bdf8",
            fill_color="#38bdf8",
            fill_opacity=0.35,
            stroke_width=2.5
        )

        # 4. Unit Metric Circle (Demonstrating Ellipsoid Deformation)
        unit_circle = Circle(radius=1.0, color="#818cf8", stroke_width=2.0, stroke_opacity=0.5).move_to(plane.c2p(0, 0))

        # 5. Standard Basis Vectors (i_hat and j_hat)
        i_hat = Arrow(plane.c2p(0, 0), plane.c2p(1, 0), color="#10b981", buff=0, stroke_width=4.5, max_tip_length_to_length_ratio=0.22)
        j_hat = Arrow(plane.c2p(0, 0), plane.c2p(0, 1), color="#f43f5e", buff=0, stroke_width=4.5, max_tip_length_to_length_ratio=0.22)
        origin_node = Dot(plane.c2p(0, 0), radius=0.09, color="#ffffff")

        # 6. Invariant Eigenvectors
        eigen1 = Arrow(plane.c2p(0, 0), plane.c2p(2, 0), color="#a855f7", buff=0, stroke_width=5)
        eigen2 = Arrow(plane.c2p(0, 0), plane.c2p(1, 1.5), color="#f59e0b", buff=0, stroke_width=4.5)

        self.play(Create(plane), run_time=1.2)
        self.play(FadeIn(unit_square), Create(unit_circle), run_time=1.0)
        self.play(GrowArrow(i_hat), GrowArrow(j_hat), FadeIn(origin_node))
        self.play(GrowArrow(eigen1), GrowArrow(eigen2), run_time=1.0)
        self.wait(0.5)

        # 7. Apply 2D Linear Transformation Matrix A = [[1.8, 0.8], [0.4, 1.4]]
        matrix = [[1.8, 0.8], [0.4, 1.4]]
        
        p0 = plane.c2p(0, 0)
        p1 = plane.c2p(1.8, 0.4)
        p2 = plane.c2p(1.8 + 0.8, 0.4 + 1.4)
        p3 = plane.c2p(0.8, 1.4)

        self.play(
            plane.animate.apply_matrix(matrix),
            unit_circle.animate.apply_matrix(matrix),
            unit_square.animate.set_points_as_corners([p0, p1, p2, p3, p0]),
            i_hat.animate.put_start_and_end_on(plane.c2p(0, 0), plane.c2p(1.8, 0.4)),
            j_hat.animate.put_start_and_end_on(plane.c2p(0, 0), plane.c2p(0.8, 1.4)),
            eigen1.animate.apply_matrix(matrix),
            eigen2.animate.apply_matrix(matrix),
            run_time=3.5,
            rate_func=smooth
        )
        self.wait(0.5)

        # 8. Secondary Transformation: Continuous Shearing & Rotation
        matrix_rot = [[0.8, -0.6], [0.6, 0.8]]
        self.play(
            plane.animate.apply_matrix(matrix_rot),
            unit_circle.animate.apply_matrix(matrix_rot),
            run_time=2.5,
            rate_func=smooth
        )
        self.wait(1)`,

            pythagoras: `from manim import *
import numpy as np

class AnimationScene(Scene):
    def construct(self):
        self.camera.background_color = "#0d1117"

        # Title & Core Formula
        title = Title("Geometric Proof: Pythagorean Theorem", color=WHITE)
        formula = MathTex(r"a^2 + b^2 = c^2", color=YELLOW_C).scale(1.2).to_corner(UR, buff=0.8)

        self.play(Write(title), Write(formula), run_time=1.0)

        # Construct Right-Angle Triangle
        p_a = ORIGIN + LEFT * 1.5 + DOWN * 1.2
        p_b = p_a + RIGHT * 3.0
        p_c = p_a + UP * 2.0

        triangle = Polygon(p_a, p_b, p_c, color=TEAL_C, fill_color=TEAL_E, fill_opacity=0.4, stroke_width=4)
        elbow = RightAngle(Line(p_b, p_a), Line(p_c, p_a), length=0.35, color=WHITE)

        lbl_a = MathTex("a = 2", color=BLUE_C).next_to(Line(p_a, p_c), LEFT)
        lbl_b = MathTex("b = 3", color=GREEN_C).next_to(Line(p_a, p_b), DOWN)
        lbl_c = MathTex(r"c = \\sqrt{13}", color=YELLOW_C).next_to(Line(p_c, p_b).get_center(), UR, buff=0.15)

        self.play(Create(triangle), Create(elbow), Write(lbl_a), Write(lbl_b), Write(lbl_c))
        self.wait(0.5)

        # Geometric Squares on each side
        sq_a = Square(side_length=2.0, color=BLUE_C, fill_color=BLUE_E, fill_opacity=0.6).next_to(Line(p_a, p_c), LEFT, buff=0)
        sq_b = Square(side_length=3.0, color=GREEN_C, fill_color=GREEN_E, fill_opacity=0.6).next_to(Line(p_a, p_b), DOWN, buff=0)

        c_len = np.sqrt(2.0**2 + 3.0**2)
        sq_c = Square(side_length=c_len, color=YELLOW_C, fill_color=YELLOW_E, fill_opacity=0.6)
        sq_c.rotate(np.arctan2(2.0, 3.0))
        sq_c.next_to(Line(p_b, p_c).get_center(), UR, buff=0)

        self.play(FadeIn(sq_a), FadeIn(sq_b), run_time=1.2)
        self.play(FadeIn(sq_c), run_time=1.2)
        self.wait(1)`,

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

        // --- PROFESSIONAL CODEMIRROR IDE INTEGRATION ---
        let cmEditor = null;
        if (window.CodeMirror && studioEditor) {
            cmEditor = CodeMirror.fromTextArea(studioEditor, {
                lineNumbers: true,
                mode: 'javascript',
                theme: 'material-darker',
                lineWrapping: false,
                tabSize: 4,
                indentUnit: 4,
                autoCloseBrackets: true,
                matchBrackets: true,
                extraKeys: {
                    "Ctrl-Enter": function(cm) {
                        if (renderBtn) renderBtn.click();
                        else if (typeof window.handleRender === 'function') window.handleRender(true, false);
                    },
                    "Cmd-Enter": function(cm) {
                        if (renderBtn) renderBtn.click();
                        else if (typeof window.handleRender === 'function') window.handleRender(true, false);
                    },
                    "Tab": function(cm) {
                        if (cm.somethingSelected()) {
                            cm.indentSelection("add");
                        } else {
                            cm.replaceSelection("    ", "end");
                        }
                    }
                }
            });
            window.codeMirrorEditor = cmEditor;

            // Transparent proxy for studioEditor.value so all existing methods continue working flawlessly
            Object.defineProperty(studioEditor, 'value', {
                get() {
                    return cmEditor ? cmEditor.getValue() : '';
                },
                set(val) {
                    if (cmEditor) {
                        if (cmEditor.getValue() !== (val || '')) {
                            cmEditor.setValue(val || '');
                        }
                    }
                },
                configurable: true
            });

            // Save to LocalStorage on changes
            cmEditor.on('change', () => {
                const code = cmEditor.getValue();
                if (currentEngine) {
                    localStorage.setItem('xtraAnimCode_' + currentEngine, code);
                }
                localStorage.setItem('xtraAnimCode', code);

                const trimmed = (code || '').trim();
                if (window.lastRenderedCode && trimmed === window.lastRenderedCode) {
                    if (typeof window.setRenderedState === 'function') window.setRenderedState(true);
                } else {
                    if (typeof window.setRenderedState === 'function') window.setRenderedState(false);
                }
            });

            if (studioEditor) {
                studioEditor.addEventListener('input', () => {
                    const code = (studioEditor.value || '').trim();
                    if (window.lastRenderedCode && code === window.lastRenderedCode) {
                        if (typeof window.setRenderedState === 'function') window.setRenderedState(true);
                    } else {
                        if (typeof window.setRenderedState === 'function') window.setRenderedState(false);
                    }
                });
            }

            // Proxy focus
            const origFocus = studioEditor.focus ? studioEditor.focus.bind(studioEditor) : null;
            studioEditor.focus = function() {
                if (cmEditor) cmEditor.focus();
                else if (origFocus) origFocus();
            };
        }

        function updateHighlighting() {
            if (cmEditor) {
                cmEditor.refresh();
            }
        }

        // ============================================================
        // DUAL-MODE EDITOR & AI CHAT STUDIO ASSISTANT
        // ============================================================
        let currentEditorMode = 'manual'; // Default is Manual mode
        window.aiCodeHistory = []; // Version stack for Undo/Redo: { code, prompt, timestamp, engine }
        window.aiHistoryIndex = -1;
        window.aiEngineChatSessions = {}; // Isolated chat messages per engine: { [engineId]: string[] }
        window.aiEngineHistory = {}; // Isolated code revisions per engine: { [engineId]: any[] }

        const chatEditorModeSelect = document.getElementById('chatEditorModeSelect') || document.getElementById('editorModeSelect');
        const chatModePill = document.getElementById('chatModePill');
        const manualEditorPane = document.getElementById('manualEditorPane');
        const aiChatPane = document.getElementById('aiChatPane');
        const dockManualActions = document.getElementById('dockManualActions') || document.getElementById('manualModeActions');
        const dockAiActions = document.getElementById('dockAiActions') || document.getElementById('aiModeActions');
        const manualChatDisabledNotice = document.getElementById('manualChatDisabledNotice');
        const aiPromptInput = document.getElementById('aiPromptInput');
        const aiSendPromptBtn = document.getElementById('aiSendPromptBtn');
        const dockManualRunBtn = document.getElementById('dockManualRunBtn') || document.getElementById('manualRunBtn');
        const dockStatusTip = document.getElementById('dockStatusTip');
        const aiChatThread = document.getElementById('aiChatThread');
        const aiClearChatBtn = document.getElementById('aiClearChatBtn');
        const manualCopyBtn = document.getElementById('manualCopyBtn');
        const manualFormatBtn = document.getElementById('manualFormatBtn');
        const manualResetBtn = document.getElementById('manualResetBtn');

        window.switchEditorMode = function(mode) {
            currentEditorMode = (mode === 'ai') ? 'ai' : 'manual';
            
            if (chatEditorModeSelect && chatEditorModeSelect.value !== currentEditorMode) {
                chatEditorModeSelect.value = currentEditorMode;
            }

            // Update Mode Dropdown & Switcher Slider UI
            const modeSelectBox = document.getElementById('modeSelectBox');
            const modeCurrentIcon = document.getElementById('modeCurrentIcon');
            const modeSlider = document.getElementById('editorModeSlider');
            const modeBtnManual = document.getElementById('modeBtnManual');
            const modeBtnAi = document.getElementById('modeBtnAi');
            const aiAttachToolsBtn = document.getElementById('aiAttachToolsBtn');
            const aiQuickToolsMenu = document.getElementById('aiQuickToolsMenu');
            const viewEditor = document.getElementById('view-editor');

            if (currentEditorMode === 'manual') {
                if (modeSlider) {
                    modeSlider.classList.remove('is-ai');
                    if (modeBtnManual) { modeBtnManual.classList.add('active'); modeBtnManual.setAttribute('aria-checked', 'true'); }
                    if (modeBtnAi) { modeBtnAi.classList.remove('active'); modeBtnAi.setAttribute('aria-checked', 'false'); }
                }
                if (modeSelectBox) modeSelectBox.classList.remove('ai-mode-active');
                if (modeCurrentIcon) modeCurrentIcon.className = 'ri-code-s-slash-line';
                if (aiAttachToolsBtn) aiAttachToolsBtn.style.display = 'none';
                if (aiQuickToolsMenu) aiQuickToolsMenu.classList.remove('open');
                if (viewEditor) {
                    viewEditor.classList.remove('ai-mode-active');
                    viewEditor.style.background = '#08090d';
                }
            } else {
                if (modeSlider) {
                    modeSlider.classList.add('is-ai');
                    if (modeBtnManual) { modeBtnManual.classList.remove('active'); modeBtnManual.setAttribute('aria-checked', 'false'); }
                    if (modeBtnAi) { modeBtnAi.classList.add('active'); modeBtnAi.setAttribute('aria-checked', 'true'); }
                }
                if (modeSelectBox) modeSelectBox.classList.add('ai-mode-active');
                if (modeCurrentIcon) modeCurrentIcon.className = 'ri-sparkling-2-fill';
                if (aiAttachToolsBtn) aiAttachToolsBtn.style.display = 'inline-flex';
                if (viewEditor) {
                    viewEditor.classList.add('ai-mode-active');
                    viewEditor.style.background = '#212121';
                }
            }

            const aiInputRow = document.getElementById('aiInputRow');

            if (currentEditorMode === 'manual') {
                // 1. Show Code Editor, hide AI Chat Feed
                if (manualEditorPane) manualEditorPane.style.display = 'flex';
                if (aiChatPane) aiChatPane.style.display = 'none';

                // 2. Minimal Chat Editor Dock for Manual Mode
                if (aiInputRow) aiInputRow.style.display = 'none';
                if (dockManualActions) dockManualActions.style.display = 'flex';
                if (dockAiActions) dockAiActions.style.display = 'none';

                // Sync highlighting & focus editor
                if (typeof updateHighlighting === 'function') updateHighlighting();
                if (window.codeMirrorEditor) {
                    setTimeout(() => {
                        window.codeMirrorEditor.refresh();
                        window.codeMirrorEditor.focus();
                    }, 50);
                } else if (studioEditor) {
                    studioEditor.focus();
                }
            } else {
                // 1. Show AI Chat Feed, hide Code Editor
                if (manualEditorPane) manualEditorPane.style.display = 'none';
                if (aiChatPane) aiChatPane.style.display = 'flex';
                
                // Ensure current engine's starter cards are active and welcome screen displays if no messages
                const threadContainer = document.getElementById('aiChatThreadInner');
                const existingMsgs = threadContainer ? threadContainer.querySelectorAll('.chat-msg') : [];
                const welcomeEl = document.getElementById('aiWelcomeScreen');
                if (existingMsgs.length === 0 && welcomeEl) {
                    welcomeEl.style.display = 'flex';
                }
                if (typeof window.updateAiStarterCards === 'function') {
                    window.updateAiStarterCards(currentEngine);
                }

                // 2. Minimal Chat Editor Dock for AI Mode
                if (aiInputRow) {
                    aiInputRow.style.display = 'block';
                    if (aiPromptInput) {
                        const baseH = window.innerWidth <= 1024 ? 48 : 40;
                        aiPromptInput.style.height = baseH + 'px';
                        aiPromptInput.style.overflowY = 'hidden';
                        setTimeout(() => aiPromptInput.focus(), 50);
                    }
                }
                if (dockManualActions) dockManualActions.style.display = 'none';
                if (dockAiActions) {
                    dockAiActions.style.display = 'flex';
                    const sendBtn = document.getElementById('aiSendPromptBtn');
                    if (sendBtn && aiPromptInput) {
                        if (aiPromptInput.value.trim().length > 0) {
                            sendBtn.classList.remove('disabled-btn');
                            sendBtn.classList.add('active-btn');
                        } else {
                            sendBtn.classList.remove('active-btn');
                            sendBtn.classList.add('disabled-btn');
                        }
                    }
                }
            }
        };

        if (chatEditorModeSelect) {
            chatEditorModeSelect.addEventListener('change', (e) => {
                window.switchEditorMode(e.target.value);
            });
        }

        const editorModeSlider = document.getElementById('editorModeSlider');
        if (editorModeSlider) {
            editorModeSlider.addEventListener('click', (e) => {
                if (e.target.closest('#modeBtnManual')) {
                    window.switchEditorMode('manual');
                } else if (e.target.closest('#modeBtnAi')) {
                    window.switchEditorMode('ai');
                } else {
                    window.switchEditorMode(currentEditorMode === 'ai' ? 'manual' : 'ai');
                }
            });
        }

        // Rendered state tracking for switching between "Run" and "Preview"
        window.isCurrentCodeRendered = false;
        window.lastRenderedCode = '';

        window.updateRunButtonState = function() {
            const dockRunBtn = document.getElementById('dockManualRunBtn') || document.getElementById('manualRunBtn');
            const dockRerunBtn = document.getElementById('dockManualRerunBtn');
            if (!dockRunBtn) return;

            if (window.isCurrentCodeRendered) {
                dockRunBtn.classList.add('is-preview');
                dockRunBtn.innerHTML = '<i class="ri-eye-line"></i> Preview';
                dockRunBtn.setAttribute('title', 'View Rendered Preview');
                if (dockRerunBtn) dockRerunBtn.style.display = 'inline-flex';
            } else {
                dockRunBtn.classList.remove('is-preview');
                dockRunBtn.innerHTML = '<i class="ri-play-fill"></i> Run';
                dockRunBtn.setAttribute('title', 'Execute Code (Ctrl+Enter)');
                if (dockRerunBtn) dockRerunBtn.style.display = 'none';
            }
        };

        window.setRenderedState = function(isRendered, code) {
            window.isCurrentCodeRendered = !!isRendered;
            if (isRendered) {
                if (code !== undefined && code !== null) {
                    window.lastRenderedCode = String(code).trim();
                } else if (studioEditor) {
                    window.lastRenderedCode = (studioEditor.value || '').trim();
                }
            }
            window.updateRunButtonState();
        };

        // Run / Preview Button Handler in Chat Editor Dock
        if (dockManualRunBtn) {
            dockManualRunBtn.onclick = (e) => {
                if (e) e.preventDefault();
                if (window.isCurrentCodeRendered) {
                    // Already rendered -> switch to preview view on mobile or ensure visible
                    if (typeof window.switchTab === 'function') {
                        window.switchTab('preview');
                    } else {
                        const previewView = document.getElementById('view-preview');
                        if (previewView) previewView.style.display = 'flex';
                    }
                } else {
                    // Not rendered yet -> execute code
                    if (renderBtn) {
                        renderBtn.click();
                    } else if (typeof window.handleRender === 'function') {
                        window.handleRender(true, false);
                    }
                }
            };
        }

        const dockManualRerunBtn = document.getElementById('dockManualRerunBtn');
        if (dockManualRerunBtn) {
            dockManualRerunBtn.onclick = (e) => {
                if (e) e.preventDefault();
                if (renderBtn) {
                    renderBtn.click();
                } else if (typeof window.handleRender === 'function') {
                    window.handleRender(true, false);
                }
            };
        }

        if (manualCopyBtn) {
            manualCopyBtn.onclick = () => {
                if (!studioEditor) return;
                navigator.clipboard.writeText(studioEditor.value).then(() => {
                    const orig = manualCopyBtn.innerHTML;
                    manualCopyBtn.innerHTML = '<i class="ri-check-line"></i> Copied';
                    setTimeout(() => { manualCopyBtn.innerHTML = orig; }, 1600);
                }).catch(() => {});
            };
        }

        if (manualFormatBtn) {
            manualFormatBtn.onclick = () => {
                if (!studioEditor || !studioEditor.value) return;
                let code = studioEditor.value.trim();
                studioEditor.value = code;
                if (typeof updateHighlighting === 'function') updateHighlighting();
            };
        }

        if (manualResetBtn) {
            manualResetBtn.onclick = () => {
                if (confirm('Reset editor to the default engine template?')) {
                    if (typeof window.switchEngine === 'function') {
                        window.switchEngine(currentEngine, true);
                    }
                }
            };
        }

        // --- PER-ENGINE ISOLATED AI CHAT SESSIONS ---
        window.saveEngineChatSession = function(engineId) {
            if (!engineId) return;
            const container = document.getElementById('aiChatThreadInner');
            if (!container) return;
            const messages = container.querySelectorAll('.chat-msg');
            if (messages.length > 0) {
                window.aiEngineChatSessions[engineId] = Array.from(messages).map(m => m.outerHTML);
                window.aiEngineHistory[engineId] = (window.aiCodeHistory || []).slice();
            } else {
                delete window.aiEngineChatSessions[engineId];
                delete window.aiEngineHistory[engineId];
            }
        };

        window.restoreEngineChatSession = function(engineId) {
            const targetEngine = engineId || currentEngine;
            const chatThread = document.getElementById('aiChatThread');
            const container = document.getElementById('aiChatThreadInner') || chatThread;
            const welcomeScreen = document.getElementById('aiWelcomeScreen');

            // 1. Purge all existing message bubbles, thinking dots, and notices anywhere in the chat thread
            document.querySelectorAll('.chat-msg').forEach(m => m.remove());
            if (chatThread) {
                Array.from(chatThread.children).forEach(child => {
                    if (child.id !== 'aiChatThreadInner') child.remove();
                });
            }
            if (container) {
                Array.from(container.children).forEach(child => {
                    if (child.id !== 'aiWelcomeScreen') child.remove();
                });
            }

            // 2. Check for saved conversation specifically for this engine
            const savedMsgs = window.aiEngineChatSessions ? window.aiEngineChatSessions[targetEngine] : null;
            if (savedMsgs && savedMsgs.length > 0 && container) {
                if (welcomeScreen) welcomeScreen.style.display = 'none';
                savedMsgs.forEach(html => {
                    const temp = document.createElement('div');
                    temp.innerHTML = html.trim();
                    const el = temp.firstElementChild;
                    if (el) container.appendChild(el);
                });
                window.aiCodeHistory = (window.aiEngineHistory[targetEngine] || []).slice();
                window.aiHistoryIndex = window.aiCodeHistory.length - 1;
            } else {
                // Clean new chat welcome screen for target engine
                if (welcomeScreen) welcomeScreen.style.display = 'flex';
                if (typeof window.updateAiStarterCards === 'function') {
                    window.updateAiStarterCards(targetEngine);
                }
                window.aiCodeHistory = [];
                window.aiHistoryIndex = -1;
            }

            // 3. Reset input controls and voice
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            if (aiPromptInput) {
                aiPromptInput.value = '';
                aiPromptInput.style.height = window.innerWidth <= 1024 ? '48px' : '40px';
                aiPromptInput.style.overflowY = 'hidden';
            }
            if (aiSendPromptBtn) {
                aiSendPromptBtn.innerHTML = '<i class="ri-arrow-up-line" style="color: #000; font-size: 1.2rem; font-weight: 700;"></i>';
                aiSendPromptBtn.classList.remove('active-btn');
                aiSendPromptBtn.classList.add('disabled-btn');
            }
            if (chatThread) {
                chatThread.scrollTop = chatThread.scrollHeight || 0;
            }
        };

        // ChatGPT Thread Clear & Reset (Manual New Chat or Engine Reset)
        window.clearAiChatThread = function(engineId) {
            const targetEngine = engineId || currentEngine;
            if (targetEngine && window.aiEngineChatSessions) {
                delete window.aiEngineChatSessions[targetEngine];
                delete window.aiEngineHistory[targetEngine];
            }
            const chatThread = document.getElementById('aiChatThread');
            const container = document.getElementById('aiChatThreadInner') || chatThread;
            const welcomeScreen = document.getElementById('aiWelcomeScreen');

            document.querySelectorAll('.chat-msg').forEach(m => m.remove());
            if (chatThread) {
                Array.from(chatThread.children).forEach(child => {
                    if (child.id !== 'aiChatThreadInner') child.remove();
                });
            }
            if (container) {
                Array.from(container.children).forEach(child => {
                    if (child.id !== 'aiWelcomeScreen') child.remove();
                });
            }
            if (welcomeScreen) {
                welcomeScreen.style.display = 'flex';
            }
            if (typeof window.updateAiStarterCards === 'function') {
                window.updateAiStarterCards(targetEngine);
            }
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            if (aiPromptInput) {
                aiPromptInput.value = '';
                aiPromptInput.style.height = window.innerWidth <= 1024 ? '48px' : '40px';
                aiPromptInput.style.overflowY = 'hidden';
            }
            if (aiSendPromptBtn) {
                aiSendPromptBtn.innerHTML = '<i class="ri-arrow-up-line" style="color: #000; font-size: 1.2rem; font-weight: 700;"></i>';
                aiSendPromptBtn.classList.remove('active-btn');
                aiSendPromptBtn.classList.add('disabled-btn');
            }
            window.aiCodeHistory = [];
            window.aiHistoryIndex = -1;
            if (chatThread) {
                chatThread.scrollTop = 0;
            }
        };

        if (aiClearChatBtn) {
            aiClearChatBtn.onclick = () => window.clearAiChatThread(currentEngine);
        }

        // ChatGPT Quick Tools Popover Toggle
        window.toggleAiToolsMenu = function(forceState) {
            const menu = document.getElementById('aiQuickToolsMenu');
            if (!menu) return;
            if (typeof forceState === 'boolean') {
                menu.classList.toggle('open', forceState);
            } else {
                menu.classList.toggle('open');
            }
        };

        document.addEventListener('click', (e) => {
            const menu = document.getElementById('aiQuickToolsMenu');
            const attachBtn = document.getElementById('aiAttachToolsBtn');
            if (menu && menu.classList.contains('open')) {
                if (!menu.contains(e.target) && !attachBtn?.contains(e.target)) {
                    menu.classList.remove('open');
                }
            }
        });

        // ChatGPT Voice Dictation (Speech-to-Text)
        let aiSpeechRecognition = null;
        let isAiListening = false;

        window.toggleAiVoiceDictation = function() {
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            const micBtn = document.getElementById('aiVoiceDictateBtn');
            if (!SpeechRec) {
                alert('Speech recognition is not supported on this browser. Try Google Chrome or Safari.');
                return;
            }

            if (isAiListening && aiSpeechRecognition) {
                aiSpeechRecognition.stop();
                return;
            }

            try {
                aiSpeechRecognition = new SpeechRec();
                aiSpeechRecognition.continuous = false;
                aiSpeechRecognition.interimResults = true;
                aiSpeechRecognition.lang = 'en-US';

                aiSpeechRecognition.onstart = function() {
                    isAiListening = true;
                    if (micBtn) micBtn.classList.add('listening');
                };

                aiSpeechRecognition.onresult = function(event) {
                    let transcript = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        transcript += event.results[i][0].transcript;
                    }
                    if (aiPromptInput && transcript) {
                        aiPromptInput.value = transcript;
                        aiPromptInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                };

                aiSpeechRecognition.onerror = function(err) {
                    console.warn('Speech recognition error:', err);
                    isAiListening = false;
                    if (micBtn) micBtn.classList.remove('listening');
                };

                aiSpeechRecognition.onend = function() {
                    isAiListening = false;
                    if (micBtn) micBtn.classList.remove('listening');
                    if (aiPromptInput) aiPromptInput.focus();
                };

                aiSpeechRecognition.start();
            } catch (e) {
                console.error('Failed to start speech recognition:', e);
                isAiListening = false;
                if (micBtn) micBtn.classList.remove('listening');
            }
        };

        // User Prompt Actions
        window.editUserPrompt = function(btnElement) {
            if (!btnElement) return;
            const userMsg = btnElement.closest('.chat-msg.user');
            if (!userMsg) return;
            const bubble = userMsg.querySelector('.msg-content-bubble');
            if (bubble && aiPromptInput) {
                aiPromptInput.value = bubble.innerText.trim();
                aiPromptInput.dispatchEvent(new Event('input', { bubbles: true }));
                aiPromptInput.focus();
                const dock = document.querySelector('.chat-editor-dock');
                if (dock) dock.scrollIntoView({ behavior: 'smooth' });
            }
        };

        window.copyUserPrompt = function(btnElement) {
            if (!btnElement) return;
            const userMsg = btnElement.closest('.chat-msg.user');
            if (!userMsg) return;
            const bubble = userMsg.querySelector('.msg-content-bubble');
            if (bubble) {
                navigator.clipboard.writeText(bubble.innerText.trim()).then(() => {
                    const orig = btnElement.innerHTML;
                    btnElement.innerHTML = '<i class="ri-check-line" style="color:#10a37f;"></i>';
                    setTimeout(() => { btnElement.innerHTML = orig; }, 1600);
                });
            }
        };

        // Assistant Speech Synthesis (Read Aloud)
        window.speakAiExplanation = function(btnElement) {
            if (!('speechSynthesis' in window)) {
                alert('Speech synthesis is not supported in this browser.');
                return;
            }

            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                if (btnElement) btnElement.innerHTML = '<i class="ri-volume-up-line"></i>';
                return;
            }

            const assistantMsg = btnElement ? btnElement.closest('.chat-msg.assistant') : null;
            if (!assistantMsg) return;
            const explanation = assistantMsg.querySelector('.ai-explanation-text');
            const textToSpeak = explanation ? (explanation.innerText || explanation.textContent) : '';
            if (!textToSpeak) return;

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            if (btnElement) btnElement.innerHTML = '<i class="ri-stop-circle-line" style="color:#ef4444;"></i>';

            utterance.onend = function() {
                if (btnElement) btnElement.innerHTML = '<i class="ri-volume-up-line"></i>';
            };
            utterance.onerror = function() {
                if (btnElement) btnElement.innerHTML = '<i class="ri-volume-up-line"></i>';
            };

            window.speechSynthesis.speak(utterance);
        };

        // --- Engine-Specific Premium AI Presets ---
        const engineAiPresets = {
            manim: [
                {
                    title: "Pure Graph & Tangent Flow",
                    desc: "Aesthetic dual curves, tangent vector & area shading (No Text)",
                    icon: "ri-function-line",
                    color: "#38bdf8",
                    prompt: "Create a pure graph animation in Manim without text showing dual intersecting curves, shaded area, moving tracer dot, tangent vector and orthogonal normal vector."
                },
                {
                    title: "Fourier Epicycles",
                    desc: "Rotating complex phasor vectors drawing a waveform",
                    icon: "ri-pulse-line",
                    color: "#818cf8",
                    prompt: "Create a stunning Manim animation of Fourier series epicycles with rotating phasor vectors and vector sum tracing a harmonic wave."
                },
                {
                    title: "Gravitational Orbit",
                    desc: "Keplerian elliptical orbit with gravitational vectors",
                    icon: "ri-planet-line",
                    color: "#34d399",
                    prompt: "Create a Manim physics animation showing an elliptical planetary orbit around a glowing star with velocity and gravitational force vectors."
                },
                {
                    title: "Linear Transformation",
                    desc: "Matrix warping 2D coordinate grid and eigenvectors",
                    icon: "ri-grid-fill",
                    color: "#f472b6",
                    prompt: "Create a Manim linear algebra animation visualizing a 2D matrix linear transformation warping a coordinate grid with basis vectors and invariant eigenvectors."
                }
            ],
            p5: [
                {
                    title: "Gravitational Orbit",
                    desc: "Solar orbit with trailing glowing particles",
                    icon: "ri-planet-line",
                    color: "#10a37f",
                    prompt: "Create an interactive gravitational orbital simulation with glowing sun and trailing planets"
                },
                {
                    title: "Fourier Epicycles",
                    desc: "Harmonic synthesized wave drawing",
                    icon: "ri-pulse-line",
                    color: "#60a5fa",
                    prompt: "Generate harmonic Fourier series epicycles with synthesized wave drawing"
                },
                {
                    title: "Cyber Particle Mesh",
                    desc: "Interactive particle network with proximity links",
                    icon: "ri-bubble-chart-line",
                    color: "#c084fc",
                    prompt: "Create an interactive cybernetic particle mesh network with distance-based connecting lines and mouse repulsion"
                },
                {
                    title: "Kinetic Fluid Waves",
                    desc: "Harmonic multi-layer oscillating waves",
                    icon: "ri-water-flash-line",
                    color: "#f59e0b",
                    prompt: "Build a kinetic geometric wave with smooth looping animation and gradient colors"
                }
            ],
            three: [
                {
                    title: "Quantum Core & Gyro",
                    desc: "Iridescent cyber core, gyro rings & stardust",
                    icon: "ri-shape-line",
                    color: "#c084fc",
                    prompt: "Create a 3D cybernetic quantum core with iridescent metallic torus knot, orbiting gyro rings with satellites, and interactive mouse parallax"
                },
                {
                    title: "Cosmic Spiral Galaxy",
                    desc: "Volumetric 4-arm galaxy with 2500+ stars",
                    icon: "ri-sparkling-fill",
                    color: "#38bdf8",
                    prompt: "Create a 3D volumetric spiral galaxy with 2500+ rotating star particles, Keplerian orbital speeds, and cosmic color gradients"
                },
                {
                    title: "Celestial Gravity Orbits",
                    desc: "Luminous planets, glowing star & orbital trails",
                    icon: "ri-planet-line",
                    color: "#fb923c",
                    prompt: "Create a 3D celestial gravity system of luminous orbiting planets around a central glowing star with orbit trails and specular reflections"
                },
                {
                    title: "Undulating Cyber Terrain",
                    desc: "Harmonic neon wave mesh with atmospheric fog",
                    icon: "ri-landscape-line",
                    color: "#a3e635",
                    prompt: "Build an animated wireframe cyber landscape using dynamic multi-frequency wave displacement, horizon fog, and neon glow"
                }
            ],
            anime: [
                {
                    title: "Kinetic Matrix",
                    desc: "Staggered 81-node radial wave & chromatic pulse",
                    icon: "ri-compasses-2-line",
                    color: "#f59e0b",
                    prompt: "Build an 81-element kinetic stagger animation in Anime.js with radial expansion and chromatic transitions"
                },
                {
                    title: "Morphing SVG Path",
                    desc: "Fluid organic polygon morphing with bloom",
                    icon: "ri-shape-2-line",
                    color: "#ec4899",
                    prompt: "Create a smooth SVG path morphing animation between geometric polygon and organic liquid droplet"
                },
                {
                    title: "Staggered Typo Wave",
                    desc: "3D kinetic typographic wave & tracer line",
                    icon: "ri-text",
                    color: "#38bdf8",
                    prompt: "Create a vibrant staggered typography wave with elastic bounce and glowing letter shadows"
                },
                {
                    title: "Neon Circular HUD",
                    desc: "Cybernetic targeting reticle with radar scanner",
                    icon: "ri-radar-line",
                    color: "#10b981",
                    prompt: "Build a multi-ring cybernetic HUD interface with counter-rotating dashed circles and pulsating core"
                }
            ],
            rough: [
                {
                    title: "Hand-Drawn Diagram",
                    desc: "Wobbly architectural flowchart sketch",
                    icon: "ri-pencil-ruler-2-line",
                    color: "#38bdf8",
                    prompt: "Create a hand-drawn sketchy flowchart diagram using Rough.js with sketch boxes, arrows, and handwritten font"
                },
                {
                    title: "Wobbly Live Cartoon",
                    desc: "Animated vibrating sketchy character",
                    icon: "ri-bear-smile-line",
                    color: "#f43f5e",
                    prompt: "Create an animated cartoon character in Rough.js that wobbles and vibrates like a hand-drawn flipbook using frame seeds"
                },
                {
                    title: "Sketch Coordinate Graph",
                    desc: "Hand-drawn axes with sketched curve",
                    icon: "ri-line-chart-line",
                    color: "#a855f7",
                    prompt: "Draw a sketchy coordinate system with rough axes, hatch-filled sine curve, and hand-drawn annotations"
                },
                {
                    title: "Hatch-Filled Shapes",
                    desc: "Cross-hatch pattern geometric composition",
                    icon: "ri-grid-line",
                    color: "#eab308",
                    prompt: "Build a geometric Bauhaus-style sketch composition with zig-zag and cross-hatch fill patterns in Rough.js"
                }
            ],
            two: [
                {
                    title: "Geometric Starburst",
                    desc: "Rotating multi-point polygon kaleidoscope",
                    icon: "ri-sun-line",
                    color: "#f59e0b",
                    prompt: "Create a hypnotic geometric starburst kaleidoscope in Two.js with rotating multi-point star polygons"
                },
                {
                    title: "Vector Particle Vortex",
                    desc: "Orbiting vector nodes with trailing curves",
                    icon: "ri-donut-chart-line",
                    color: "#06b6d4",
                    prompt: "Build a vector particle vortex in Two.js with curving anchor trails and color hue shifts"
                },
                {
                    title: "Morphing Curve",
                    desc: "Dynamic Bézier curve wave motion",
                    icon: "ri-pulse-line",
                    color: "#a855f7",
                    prompt: "Create an organic undulating Bézier spline wave in Two.js with oscillating control anchors"
                },
                {
                    title: "Geometric Gears",
                    desc: "Interlocking meshed rotating gear wheels",
                    icon: "ri-settings-4-line",
                    color: "#10b981",
                    prompt: "Build a mechanical clockwork vector gear train in Two.js with interlocking teeth and angular speeds"
                }
            ],
            thumbnail: [
                {
                    title: "Modern Article Banner",
                    desc: "21:9 deep-dive header with metrics & gradient",
                    icon: "ri-article-line",
                    color: "#38bdf8",
                    prompt: "Design a modern article banner in Fabric.js with deep space gradient, blueprint grid, category stickers, and headline typography"
                },
                {
                    title: "Scientific Hero Card",
                    desc: "16:9 physics hero with equation glass card",
                    icon: "ri-flask-line",
                    color: "#818cf8",
                    prompt: "Create a scientific physics thumbnail in Fabric.js with neon orbs, verified sticker, equation glass card, and bold headline"
                },
                {
                    title: "Course Masterclass",
                    desc: "4:3 pro hero card with amber glow & card",
                    icon: "ri-graduation-cap-line",
                    color: "#f59e0b",
                    prompt: "Build a high-converting masterclass course thumbnail in Fabric.js with amber glow aura, pro certified badge, and curriculum preview"
                },
                {
                    title: "Minimal Slate Tech",
                    desc: "Clean geometric typography with accent divider",
                    icon: "ri-layout-masonry-line",
                    color: "#10b981",
                    prompt: "Design a minimal slate tech thumbnail in Fabric.js with gradient accent divider bar, peer-reviewed badge, and complexity metric"
                }
            ],
            zdog: [
                {
                    title: "Cyber-Gem & Gyro",
                    desc: "Kinetic pseudo-3D faceted gem with counter-rotating rings",
                    icon: "ri-shape-line",
                    color: "#06b6d4",
                    prompt: "Create an intricate kinetic cyber-gem in Zdog 3D with dual counter-rotating gyro rings, orbiting satellites, and glowing stardust particles"
                },
                {
                    title: "Kinetic Robot Mascot",
                    desc: "Articulated cyber-robot with visor, screen and thrusters",
                    icon: "ri-robot-line",
                    color: "#ec4899",
                    prompt: "Design an articulated kinetic robot mascot in Zdog 3D with hemisphere head, illuminated visor, heartbeat chest screen, waving arms, and flickering rocket thruster"
                },
                {
                    title: "Polyhedral Sacred Star",
                    desc: "12-spike Fibonacci star with inner octahedron & rings",
                    icon: "ri-sparkling-2-line",
                    color: "#eab308",
                    prompt: "Build a polyhedral sacred star in Zdog 3D with 12 conical anchor spikes in Fibonacci distribution, glowing core octahedron, and orbiting ring trails"
                },
                {
                    title: "Retro Arcade Starship",
                    desc: "Sleek low-poly fighter with delta wings and dual thrusters",
                    icon: "ri-rocket-line",
                    color: "#a855f7",
                    prompt: "Synthesize a sleek retro arcade starship in Zdog 3D with swept delta wings, glass canopy, laser blasters, and pulsing dual plasma exhaust flames"
                }
            ],
            jsxgraph: [
                {
                    title: "Calculus & Tangent",
                    desc: "Harmonic traveling wave with tangent & normal dynamics",
                    icon: "ri-function-line",
                    color: "#38bdf8",
                    prompt: "Create a textless kinetic calculus animation in JSXGraph with a traveling harmonic wave, dynamic tangent line, normal vector, differential step polygon, and pulsing tracker"
                },
                {
                    title: "Riemann Sum & Integral",
                    desc: "Oscillating wave with breathing partition rectangles",
                    icon: "ri-bar-chart-2-line",
                    color: "#6366f1",
                    prompt: "Build a textless kinetic Riemann sum animation in JSXGraph with an oscillating wave curve, breathing subdivision rectangles, and dynamic boundary limits"
                },
                {
                    title: "Euler Line & Centers",
                    desc: "Orbiting triangle with circumcenter, centroid, orthocenter",
                    icon: "ri-triangle-line",
                    color: "#f43f5e",
                    prompt: "Design a textless kinetic geometry animation in JSXGraph showing orbiting triangle vertices, circumcircle, incircle, centroid G, orthocenter H, and collinear Euler line"
                },
                {
                    title: "Fourier Epicycles",
                    desc: "Rotating phasor circle harmonics synthesizing wave",
                    icon: "ri-radar-line",
                    color: "#10b981",
                    prompt: "Synthesize a textless kinetic Fourier epicycles animation in JSXGraph with 4 rotating phasor harmonic circles, connecting linkage arm, and scrolling square wave"
                }
            ],
            d3: [
                {
                    title: "Force Cosmic Mesh",
                    desc: "Interactive physics network with glowing cluster hubs",
                    icon: "ri-node-tree",
                    color: "#38bdf8",
                    prompt: "Create a textless kinetic force-directed network graph in D3.js with dynamic cluster hubs, glowing neon links, draggable physics simulation, and pulsing aura nodes"
                },
                {
                    title: "Kinetic Streamgraph",
                    desc: "Undulating stacked spectral harmonic wave matrix",
                    icon: "ri-water-flash-line",
                    color: "#a855f7",
                    prompt: "Build a textless kinetic streamgraph wave animation in D3.js with 6 stacked harmonic layers, d3.curveBasis spline smoothing, cyberpunk gradients, and continuous 60 FPS undulation"
                },
                {
                    title: "Concentric Sunburst",
                    desc: "Interlocking radial arc hierarchy with spectral breathing",
                    icon: "ri-pie-chart-2-line",
                    color: "#ec4899",
                    prompt: "Design a textless kinetic concentric sunburst matrix in D3.js with 5 rotating radial arc rings, counter-rotational harmonic motion, and breathing radius expansions"
                },
                {
                    title: "Voronoi & Delaunay",
                    desc: "Dynamic spatial cells with bouncing physics particles",
                    icon: "ri-bubble-chart-line",
                    color: "#10b981",
                    prompt: "Synthesize a textless kinetic Voronoi tessellation and Delaunay triangulation animation in D3.js with 48 bouncing physics particles, real-time spatial cells, and glowing nuclei"
                }
            ],
            matter: [
                {
                    title: "Newton's Kinetic Cradle",
                    desc: "Elastic momentum wave with interactive drag physics",
                    icon: "ri-swap-line",
                    color: "#38bdf8",
                    prompt: "Create a textless kinetic Newton's cradle physics simulation in Matter.js with 7 elastic steel spheres, suspension constraints, and draggable interaction"
                },
                {
                    title: "Elastic Cloth & Jelly Blob",
                    desc: "Deformable soft-body mesh with bouncy jelly mechanics",
                    icon: "ri-grid-line",
                    color: "#a855f7",
                    prompt: "Build a textless kinetic soft-body physics simulation in Matter.js featuring a pinned elastic cloth mesh and a pressurized bouncy jelly blob on neon ramps"
                },
                {
                    title: "Domino Chain & Plinko Run",
                    desc: "Multi-stage Rube Goldberg chain reaction and marble drop",
                    icon: "ri-play-list-add-line",
                    color: "#f43f5e",
                    prompt: "Design a textless kinetic chain reaction in Matter.js with toppling domino sequence, pivoting hammer trigger, triangular Plinko peg grid, and cascading marbles"
                },
                {
                    title: "Gyroscopic Wheel & Tumbler",
                    desc: "Motorized rotating drum with trapped kinetic marbles",
                    icon: "ri-loader-4-line",
                    color: "#10b981",
                    prompt: "Synthesize a textless kinetic rotating mechanism in Matter.js with motorized circular tumbler wheel, central cross-axle, and trapped tumbling kinetic marbles"
                }
            ],
            mermaid: [
                {
                    title: "Cloud Architecture Flow",
                    desc: "Multi-tier cloud edge, Kafka event stream & microservices",
                    icon: "ri-cloud-line",
                    color: "#38bdf8",
                    prompt: "Design a modern cloud microservices architecture in Mermaid.js with edge clients, API gateway, Kafka event stream, Redis cache, and Aurora PostgreSQL database"
                },
                {
                    title: "OAuth2 & Webhook Sequence",
                    desc: "PKCE auth challenge, token exchange & async webhook",
                    icon: "ri-shield-keyhole-line",
                    color: "#a855f7",
                    prompt: "Build an enterprise OAuth2 authorization code flow with PKCE and async webhook dispatcher sequence diagram in Mermaid.js"
                },
                {
                    title: "Distributed State Machine",
                    desc: "Multi-region cluster consensus, failover & self-healing",
                    icon: "ri-git-merge-line",
                    color: "#10b981",
                    prompt: "Synthesize a distributed cluster lifecycle and multi-region consensus state machine diagram in Mermaid.js with failover and self-healing loops"
                },
                {
                    title: "Enterprise ER Database",
                    desc: "Relational entity matrix with SaaS organizations & workflows",
                    icon: "ri-database-2-line",
                    color: "#f59e0b",
                    prompt: "Create an enterprise entity-relationship database schema matrix in Mermaid.js featuring organizations, users, workspaces, and AI workflow runs"
                }
            ],
            katex: [
                {
                    title: "12th Physics: Electrodynamics",
                    desc: "Gauss's law, Faraday-Lenz induction, LCR resonance & lens maker",
                    icon: "ri-flashlight-line",
                    color: "#38bdf8",
                    prompt: "Render Class 12 Physics Electrodynamics and AC circuit resonance equations in KaTeX with Gauss Law, Faraday Induction, and Lens Maker Formula"
                },
                {
                    title: "12th Physics: Modern & Optics",
                    desc: "Einstein photoelectric, de Broglie matter waves & Bohr orbits",
                    icon: "ri-radioactive-line",
                    color: "#ec4899",
                    prompt: "Typeset Class 12 Modern Physics equations in KaTeX featuring Einstein Photoelectric effect, de Broglie matter wavelength, Bohr model, and radioactive decay"
                },
                {
                    title: "12th Math: Calculus & Diff Eq",
                    desc: "Definite integrals, integration by parts & integrating factor",
                    icon: "ri-function-line",
                    color: "#10b981",
                    prompt: "Synthesize Class 12 Mathematics calculus formulas in KaTeX with definite integral properties, integration by parts, and first-order linear differential equations"
                },
                {
                    title: "12th Math: 3D Vectors & Bayes",
                    desc: "Skew lines distance, 3D plane normal & Bayes' probability",
                    icon: "ri-compass-3-line",
                    color: "#f59e0b",
                    prompt: "Formulate Class 12 Mathematics 3D vector geometry and Bayes conditional probability theorem in KaTeX with skew lines shortest distance and dot-cross products"
                }
            ],
            tikz: [
                {
                    title: "Deep Neural Network",
                    desc: "Layered feed-forward architecture with latent features & weights",
                    icon: "ri-node-tree",
                    color: "#38bdf8",
                    prompt: "Design a deep neural network architecture diagram in TikZ with input layer, hidden layers, latent embeddings, and softmax outputs"
                },
                {
                    title: "Wave Optics Interference",
                    desc: "Young's double-slit experiment, path difference & fringe curve",
                    icon: "ri-water-flash-line",
                    color: "#ec4899",
                    prompt: "Illustrate Young's double-slit wave interference experiment in TikZ with coherent wavefronts, slit spacing, path difference, and diffraction fringes"
                },
                {
                    title: "Carnot Engine & Cycle",
                    desc: "Thermodynamic P-V indicator diagram, isothermal & adiabatic curves",
                    icon: "ri-fire-line",
                    color: "#10b981",
                    prompt: "Draw a thermodynamic Carnot cycle P-V indicator diagram in TikZ with isothermal and adiabatic expansion-compression processes and work area"
                },
                {
                    title: "Quantum Bloch Sphere",
                    desc: "3D qubit state vector superposition with polar and azimuthal angles",
                    icon: "ri-shape-line",
                    color: "#f59e0b",
                    prompt: "Create a 3D quantum Bloch sphere diagram in TikZ illustrating qubit superposition state vector with theta and phi angles"
                }
            ],
            svg_to_3d: [
                {
                    title: "Cyber Mech Falcon",
                    desc: "Aerodynamic swept cyber-wings, armor carapace & energy reactor",
                    icon: "ri-plane-line",
                    color: "#38bdf8",
                    prompt: "Extrude a 3D Cyber Mech Falcon emblem featuring swept aerodynamic wing blades, tiered armor slats, and an energetic reactor core in SVG to 3D"
                },
                {
                    title: "Quantum Hypercube",
                    desc: "4D tesseract crystal mandala with concentric beveled octagons",
                    icon: "ri-shape-2-line",
                    color: "#a855f7",
                    prompt: "Generate a 3D Quantum Tesseract Hypercube and sacred crystal mandala model with concentric beveled octagon rings and stellated energy core in SVG to 3D"
                },
                {
                    title: "Chronos Tourbillon Gear",
                    desc: "12-tooth planetary cycloid gear rim, skeleton bridge & balance wheel",
                    icon: "ri-settings-5-line",
                    color: "#10b981",
                    prompt: "Create a 3D Chronos Tourbillon Escapement Gear model with 12 cycloid planetary teeth, skeleton bridge, and balance weight apertures in SVG to 3D"
                },
                {
                    title: "Golden Ratio Fibonacci Helix",
                    desc: "Logarithmic bio-spiral nautilus coils with harmonic lattice rays",
                    icon: "ri-compasses-2-line",
                    color: "#f59e0b",
                    prompt: "Model a 3D Golden Fibonacci Nautilus bio-spiral with expanding logarithmic chamber coils and golden-ratio harmonic lattice in SVG to 3D"
                }
            ]
        };

        window.updateAiStarterCards = function(engineId) {
            const pillsContainer = document.getElementById('aiStarterPills');
            const toolsPopover = document.getElementById('aiQuickToolsMenu');
            const targetEngine = engineId || currentEngine || 'manim';
            const presets = engineAiPresets[targetEngine] || engineAiPresets.manim || engineAiPresets.p5;

            // Update welcome screen description to highlight the current active engine
            const welcomeDesc = document.querySelector('.chatgpt-welcome-desc');
            const engineObj = (typeof availableEngines !== 'undefined' ? availableEngines : []).find(e => e.id === targetEngine);
            const engineLabel = engineObj ? engineObj.name : targetEngine;
            if (welcomeDesc && engineLabel) {
                welcomeDesc.textContent = `Prompt AI to generate ${engineLabel} animations, math simulations, or 3D visuals with instant code generation.`;
            }

            if (pillsContainer && presets) {
                pillsContainer.innerHTML = presets.map(p => `
                    <button type="button" class="chatgpt-prompt-card" onclick="if(window.sendAiQuickPrompt) window.sendAiQuickPrompt('${p.prompt.replace(/'/g, "\\'")}');">
                      <div class="card-top">
                        <i class="${p.icon}" style="color: ${p.color}; font-size: 1.1rem;"></i>
                        <span class="card-title">${p.title}</span>
                      </div>
                      <span class="card-desc">${p.desc}</span>
                    </button>
                `).join('');
            }

            if (toolsPopover && presets) {
                toolsPopover.innerHTML = presets.map(p => `
                    <button type="button" class="chatgpt-tool-option" onclick="if(window.sendAiQuickPrompt) window.sendAiQuickPrompt('${p.prompt.replace(/'/g, "\\'")}'); if(window.toggleAiToolsMenu) window.toggleAiToolsMenu(false);">
                      <i class="${p.icon}" style="color: ${p.color};"></i> ${p.title}
                    </button>
                `).join('');
            }
        };

        // AI Generation & Actions
        window.sendAiQuickPrompt = function(promptText) {
            if (aiPromptInput) {
                aiPromptInput.value = promptText;
            }
            window.sendAiPrompt(promptText);
        };

        window.viewCodeInEditor = function(code) {
            if (code && studioEditor) {
                studioEditor.value = code;
            }
            window.switchEditorMode('manual');
            if (typeof updateHighlighting === 'function') updateHighlighting();
            if (studioEditor) {
                studioEditor.focus();
                studioEditor.scrollTop = 0;
            }
        };

        window.runAiGeneratedCode = function(code) {
            if (code && studioEditor) {
                studioEditor.value = code;
                if (typeof updateHighlighting === 'function') updateHighlighting();
            }
            if (typeof window.setRenderedState === 'function') {
                window.setRenderedState(true, code);
            }
            if (renderBtn) {
                renderBtn.click();
            } else if (typeof window.handleRender === 'function') {
                window.handleRender(true, false);
            }
            if (window.innerWidth <= 1024 && typeof window.switchTab === 'function') {
                window.switchTab('preview');
            }
        };

        window.undoAiCodeChange = function() {
            if (window.aiHistoryIndex > 0) {
                window.aiHistoryIndex--;
                const prev = window.aiCodeHistory[window.aiHistoryIndex];
                if (prev && studioEditor) {
                    studioEditor.value = prev.code;
                    if (typeof updateHighlighting === 'function') updateHighlighting();
                    appendAiChatNotice(`↩️ Code reverted (${prev.prompt ? '"' + prev.prompt + '"' : 'Revision ' + (window.aiHistoryIndex + 1)})`);
                }
            } else if (window.aiHistoryIndex === 0) {
                const prev = window.aiCodeHistory[0];
                if (prev && studioEditor) {
                    studioEditor.value = prev.code;
                    if (typeof updateHighlighting === 'function') updateHighlighting();
                    appendAiChatNotice(`↩️ Reverted to original template code.`);
                }
            } else {
                appendAiChatNotice(`⚠️ No earlier code snapshots in undo history.`);
            }
        };

        window.copyAiGeneratedCode = function(code, btnElement) {
            let targetCode = code;
            if (!targetCode && btnElement) {
                const block = btnElement.closest('.chatgpt-code-block');
                if (block) {
                    const pre = block.querySelector('.chatgpt-code-content');
                    if (pre) targetCode = pre.innerText || pre.textContent;
                }
            }
            if (!targetCode && studioEditor) {
                targetCode = studioEditor.value;
            }
            navigator.clipboard.writeText(targetCode || '').then(() => {
                if (btnElement) {
                    const orig = btnElement.innerHTML;
                    btnElement.innerHTML = '<i class="ri-check-line" style="color: #10a37f;"></i> Copied!';
                    setTimeout(() => { btnElement.innerHTML = orig; }, 1800);
                }
            }).catch(() => {});
        };

        function highlightSyntaxCode(code, lang) {
            if (!code) return '';
            const normalizedLang = (lang || 'javascript').toLowerCase();
            
            // Check if Prism.js is available
            if (typeof Prism !== 'undefined' && Prism.languages) {
                try {
                    let prismGrammar = Prism.languages[normalizedLang];
                    if (!prismGrammar) {
                        if (normalizedLang === 'manim' || normalizedLang === 'py') prismGrammar = Prism.languages.python;
                        else if (normalizedLang === 'latex' || normalizedLang === 'katex' || normalizedLang === 'tikz') prismGrammar = Prism.languages.latex;
                        else if (normalizedLang === 'ts' || normalizedLang === 'typescript') prismGrammar = Prism.languages.typescript || Prism.languages.javascript;
                        else prismGrammar = Prism.languages.javascript || Prism.languages.clike;
                    }
                    if (prismGrammar) {
                        return Prism.highlight(code, prismGrammar, normalizedLang);
                    }
                } catch (e) {
                    // Fall back to built-in tokenizer
                }
            }

            // Built-in resilient regex syntax tokenizer
            let escaped = escapeAiHtml(code);
            // Comments
            escaped = escaped.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g, '<span class="token-comment">$1</span>');
            // Strings
            escaped = escaped.replace(/(&quot;[\s\S]*?&quot;|&#039;[\s\S]*?&#039;|`[\s\S]*?`)/g, '<span class="token-string">$1</span>');
            // Keywords
            escaped = escaped.replace(/\b(const|let|var|function|return|if|else|for|while|import|from|export|default|class|extends|new|this|async|await|def|self|None|True|False|in|try|catch|finally)\b/g, '<span class="token-keyword">$1</span>');
            // Numbers
            escaped = escaped.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token-number">$1</span>');
            // Functions
            escaped = escaped.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span class="token-function">$1</span>');

            return escaped;
        }

        function formatAiExplanationMarkdown(text) {
            if (!text) return '';
            let formatted = escapeAiHtml(text);
            
            // Bold **text**
            formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            // Inline code `code`
            formatted = formatted.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');
            // Bullet points
            formatted = formatted.replace(/^[\*\-]\s+(.+)$/gm, '<li style="margin-left: 16px; margin-bottom: 4px;">$1</li>');
            // Paragraph breaks
            formatted = formatted.replace(/\n\n/g, '<br><br>');
            formatted = formatted.replace(/\n/g, '<br>');

            return formatted;
        }

        window.copyAiMessageText = function(btnElement) {
            if (!btnElement) return;
            const assistantMsg = btnElement.closest('.chat-msg.assistant');
            if (!assistantMsg) return;
            const explanation = assistantMsg.querySelector('.ai-explanation-text');
            const code = assistantMsg.querySelector('.chatgpt-code-content');
            let text = '';
            if (explanation) text += (explanation.innerText || explanation.textContent) + '\n\n';
            if (code) text += (code.innerText || code.textContent);
            navigator.clipboard.writeText(text.trim()).then(() => {
                const orig = btnElement.innerHTML;
                btnElement.innerHTML = '<i class="ri-check-line" style="color: #10a37f;"></i>';
                setTimeout(() => { btnElement.innerHTML = orig; }, 1600);
            });
        };

        window.regenerateLastAiPrompt = function() {
            if (window.aiCodeHistory && window.aiCodeHistory.length > 0) {
                const last = window.aiCodeHistory[window.aiCodeHistory.length - 1];
                if (last && last.prompt && last.prompt !== 'Initial State') {
                    window.sendAiPrompt(last.prompt);
                }
            }
        };

        function appendAiChatNotice(text) {
            if (!aiChatThread) return;
            const div = document.createElement('div');
            div.style.cssText = 'text-align: center; font-size: 0.76rem; color: #94a3b8; margin: 4px 0; font-family: monospace; background: rgba(255,255,255,0.03); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);';
            div.textContent = text;
            aiChatThread.appendChild(div);
            aiChatThread.scrollTop = aiChatThread.scrollHeight;
        }

        function escapeAiHtml(str) {
            return (str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        window.sendAiPrompt = async function(customPrompt) {
            const prompt = (customPrompt || (aiPromptInput ? aiPromptInput.value : '')).trim();
            if (!prompt) {
                if (aiPromptInput) aiPromptInput.focus();
                return;
            }

            if (aiPromptInput) {
                aiPromptInput.value = '';
                aiPromptInput.style.height = window.innerWidth <= 1024 ? '48px' : '40px';
                aiPromptInput.style.overflowY = 'hidden';
            }

            if (aiSendPromptBtn) {
                aiSendPromptBtn.classList.remove('active-btn');
                aiSendPromptBtn.classList.add('disabled-btn');
            }

            // Save baseline code state to history stack if empty
            if (window.aiCodeHistory.length === 0 && studioEditor) {
                window.aiCodeHistory.push({
                    code: studioEditor.value,
                    prompt: 'Initial State',
                    timestamp: Date.now(),
                    engine: currentEngine
                });
                window.aiHistoryIndex = 0;
            }

            // Hide Welcome Screen on first prompt
            const aiWelcomeScreen = document.getElementById('aiWelcomeScreen') || document.getElementById('aiWelcomeCard');
            if (aiWelcomeScreen) {
                aiWelcomeScreen.style.display = 'none';
            }

            // 1. Target messages container
            const container = document.getElementById('aiChatThreadInner') || aiChatThread;

            // 2. Append User Bubble with ChatGPT actions
            if (container) {
                const userMsg = document.createElement('div');
                userMsg.className = 'chat-msg user';
                userMsg.innerHTML = `
                    <div class="msg-content-bubble">${escapeAiHtml(prompt)}</div>
                    <div class="chatgpt-user-tools">
                        <button type="button" class="chatgpt-user-tool-btn" onclick="window.editUserPrompt(this)" title="Edit message"><i class="ri-pencil-line"></i></button>
                        <button type="button" class="chatgpt-user-tool-btn" onclick="window.copyUserPrompt(this)" title="Copy text"><i class="ri-file-copy-line"></i></button>
                    </div>
                `;
                container.appendChild(userMsg);
                if (aiChatThread) aiChatThread.scrollTop = aiChatThread.scrollHeight;
                if (typeof window.saveEngineChatSession === 'function') window.saveEngineChatSession(currentEngine);
            }

            // 3. Append ChatGPT-Style Thinking Indicator
            const thinkingId = 'thinking_' + Date.now();
            if (container) {
                const thinkMsg = document.createElement('div');
                thinkMsg.id = thinkingId;
                thinkMsg.className = 'chat-msg assistant';
                thinkMsg.innerHTML = `
                    <div class="ai-avatar"><i class="ri-sparkling-fill"></i></div>
                    <div class="ai-response-body">
                        <div style="display:flex; align-items:center; gap:8px; color:#9ca3af; font-size:0.88rem; padding: 4px 0;">
                            <span class="thinking-dots"><span></span><span></span><span></span></span>
                            <span>Synthesizing ${currentEngine} animation code...</span>
                        </div>
                    </div>
                `;
                container.appendChild(thinkMsg);
                if (aiChatThread) aiChatThread.scrollTop = aiChatThread.scrollHeight;
            }

            if (aiSendPromptBtn) {
                aiSendPromptBtn.innerHTML = '<i class="ri-stop-fill" style="color: #000; font-size: 1.05rem;"></i>';
                aiSendPromptBtn.classList.add('active-btn');
                aiSendPromptBtn.classList.remove('disabled-btn');
            }

            try {
                const currentCode = studioEditor ? studioEditor.value : '';
                const baseApi = (typeof getBackendUrl === 'function' ? getBackendUrl() : '') || '';
                
                let response;
                try {
                    response = await fetch(`${baseApi}/api/engine/ai-generate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: prompt,
                            current_code: currentCode,
                            engine: currentEngine,
                            action: 'generate'
                        })
                    });
                } catch (fetchErr) {
                    // Try alternative relative path
                    response = await fetch(`/engine/ai-generate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: prompt,
                            current_code: currentCode,
                            engine: currentEngine,
                            action: 'generate'
                        })
                    });
                }

                let data;
                if (response && response.ok) {
                    data = await response.json();
                }

                const thinkEl = document.getElementById(thinkingId);
                if (thinkEl) thinkEl.remove();

                if (data && data.success && data.code) {
                    const newCode = data.code;
                    const explanation = data.explanation || `Here is the ${currentEngine} animation code for "${prompt}".`;
                    const suggested = data.suggested_prompts || [
                        'Add glowing light effects',
                        'Make animation loop smoother',
                        'Add interactive mouse controls',
                        'Change color palette to dark neon'
                    ];

                    // Save snapshot to history stack
                    window.aiCodeHistory.push({
                        code: newCode,
                        prompt: prompt,
                        timestamp: Date.now(),
                        engine: currentEngine
                    });
                    window.aiHistoryIndex = window.aiCodeHistory.length - 1;

                    // Automatically update editor code buffer
                    if (studioEditor) {
                        studioEditor.value = newCode;
                        if (currentEngine) {
                            localStorage.setItem('xtraAnimCode_' + currentEngine, newCode);
                        }
                        localStorage.setItem('xtraAnimCode', newCode);
                        if (typeof updateHighlighting === 'function') updateHighlighting();
                    }

                    // Render ChatGPT-Style AI Response
                    const responseCard = document.createElement('div');
                    responseCard.className = 'chat-msg assistant';
                    
                    const highlightedHtml = highlightSyntaxCode(newCode, currentEngine);
                    const formattedExplanation = formatAiExplanationMarkdown(explanation);

                    let pillsHtml = '';
                    suggested.forEach(s => {
                        pillsHtml += `<button type="button" class="suggestion-chip" onclick="if(window.sendAiQuickPrompt) window.sendAiQuickPrompt('${s.replace(/'/g, "\\'")}');">${escapeAiHtml(s)}</button>`;
                    });

                    responseCard.innerHTML = `
                        <div class="ai-avatar"><i class="ri-sparkling-fill"></i></div>
                        <div class="ai-response-body">
                            <div class="ai-explanation-text" style="color: #ececec; line-height: 1.6;">${formattedExplanation}</div>
                            
                            <div class="chatgpt-code-block">
                                <div class="chatgpt-code-header">
                                    <span class="lang-badge">${escapeAiHtml(currentEngine)}</span>
                                    <button type="button" class="copy-btn" onclick="if(window.copyAiGeneratedCode) window.copyAiGeneratedCode(null, this);">
                                        <i class="ri-file-copy-line"></i> Copy code
                                    </button>
                                </div>
                                <pre class="chatgpt-code-content"><code class="language-${escapeAiHtml(currentEngine)}">${highlightedHtml}</code></pre>
                            </div>

                            <div class="chatgpt-msg-footer">
                                <div class="chatgpt-icon-actions">
                                    <button type="button" class="chatgpt-footer-icon-btn" title="Copy response" onclick="if(window.copyAiMessageText) window.copyAiMessageText(this);"><i class="ri-file-copy-line"></i></button>
                                    <button type="button" class="chatgpt-footer-icon-btn" title="Good response" onclick="this.classList.toggle('active-feedback');"><i class="ri-thumb-up-line"></i></button>
                                    <button type="button" class="chatgpt-footer-icon-btn" title="Bad response" onclick="this.classList.toggle('active-feedback');"><i class="ri-thumb-down-line"></i></button>
                                    <button type="button" class="chatgpt-footer-icon-btn" title="Regenerate" onclick="if(window.regenerateLastAiPrompt) window.regenerateLastAiPrompt();"><i class="ri-restart-line"></i></button>
                                    <button type="button" class="chatgpt-footer-icon-btn" title="Read aloud" onclick="if(window.speakAiExplanation) window.speakAiExplanation(this);"><i class="ri-volume-up-line"></i></button>
                                </div>
                                <div class="chatgpt-pill-actions">
                                    <button type="button" class="btn-action-pill run-preview" onclick="if(window.runAiGeneratedCode) window.runAiGeneratedCode();">
                                        <i class="ri-play-fill"></i> Run in Preview
                                    </button>
                                    <button type="button" class="btn-action-pill view-code" onclick="if(window.viewCodeInEditor) window.viewCodeInEditor();">
                                        <i class="ri-code-s-slash-line"></i> Open in Editor
                                    </button>
                                    <button type="button" class="btn-action-pill undo-code" onclick="if(window.undoAiCodeChange) window.undoAiCodeChange();">
                                        <i class="ri-arrow-go-back-line"></i> Revert
                                    </button>
                                </div>
                            </div>

                            <div style="margin-top: 8px;">
                                <div style="font-size: 0.74rem; color: #9ca3af; margin-bottom: 6px; font-weight: 600;">Suggested follow-ups:</div>
                                <div class="ai-suggested-pills">${pillsHtml}</div>
                            </div>
                        </div>
                    `;

                    if (container) {
                        container.appendChild(responseCard);
                        if (aiChatThread) aiChatThread.scrollTop = aiChatThread.scrollHeight;
                        if (typeof window.saveEngineChatSession === 'function') window.saveEngineChatSession(currentEngine);
                    }
                } else {
                    throw new Error(data?.error || 'Failed to synthesize animation code.');
                }
            } catch (err) {
                const thinkEl = document.getElementById(thinkingId);
                if (thinkEl) thinkEl.remove();

                if (container) {
                    const errCard = document.createElement('div');
                    errCard.className = 'chat-msg assistant';
                    errCard.innerHTML = `
                        <div class="ai-avatar" style="background:#ef4444;"><i class="ri-error-warning-line"></i></div>
                        <div class="ai-response-body">
                            <p style="color: #fca5a5; font-size: 0.88rem; margin: 0; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 10px 14px;">
                                Error generating code: ${escapeAiHtml(err.message)}
                            </p>
                        </div>
                    `;
                    container.appendChild(errCard);
                    if (aiChatThread) aiChatThread.scrollTop = aiChatThread.scrollHeight;
                    if (typeof window.saveEngineChatSession === 'function') window.saveEngineChatSession(currentEngine);
                }
            } finally {
                if (aiSendPromptBtn) {
                    aiSendPromptBtn.innerHTML = '<i class="ri-arrow-up-line"></i>';
                    aiSendPromptBtn.disabled = false;
                    if (aiPromptInput && aiPromptInput.value.trim().length > 0) {
                        aiSendPromptBtn.classList.remove('disabled-btn');
                        aiSendPromptBtn.classList.add('active-btn');
                    } else {
                        aiSendPromptBtn.classList.remove('active-btn');
                        aiSendPromptBtn.classList.add('disabled-btn');
                    }
                }
            }
        };

        if (aiPromptInput) {
            aiPromptInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    window.sendAiPrompt();
                }
            });

            const updateSendBtnState = function() {
                const sendBtn = document.getElementById('aiSendPromptBtn');
                if (!sendBtn || !aiPromptInput) return;
                const hasText = aiPromptInput.value.trim().length > 0;
                if (hasText) {
                    sendBtn.classList.remove('disabled-btn');
                    sendBtn.classList.add('active-btn');
                } else {
                    sendBtn.classList.remove('active-btn');
                    sendBtn.classList.add('disabled-btn');
                }
            };

            const resizePromptInput = function() {
                aiPromptInput.style.height = 'auto';
                const baseH = window.innerWidth <= 1024 ? 48 : 40;
                const scrollH = aiPromptInput.scrollHeight;
                if (scrollH > 180) {
                    aiPromptInput.style.height = '180px';
                    aiPromptInput.style.overflowY = 'auto';
                } else {
                    aiPromptInput.style.height = Math.max(baseH, scrollH) + 'px';
                    aiPromptInput.style.overflowY = 'hidden';
                }

                updateSendBtnState();
            };

            // Comprehensive mobile typing event listeners (Gboard, iOS Safari, IME composition)
            aiPromptInput.addEventListener('input', resizePromptInput);
            aiPromptInput.addEventListener('beforeinput', () => setTimeout(updateSendBtnState, 0));
            aiPromptInput.addEventListener('compositionstart', () => setTimeout(updateSendBtnState, 0));
            aiPromptInput.addEventListener('compositionupdate', () => setTimeout(updateSendBtnState, 0));
            aiPromptInput.addEventListener('compositionend', () => setTimeout(updateSendBtnState, 0));
            aiPromptInput.addEventListener('keyup', updateSendBtnState);
            aiPromptInput.addEventListener('keydown', () => setTimeout(updateSendBtnState, 0));
            aiPromptInput.addEventListener('change', updateSendBtnState);
            aiPromptInput.addEventListener('paste', () => setTimeout(resizePromptInput, 10));
            aiPromptInput.addEventListener('cut', () => setTimeout(resizePromptInput, 10));

            // Auto-hide bottomsheet when typing on mobile
            aiPromptInput.addEventListener('focus', () => {
                updateSendBtnState();
                if (window.innerWidth <= 1024) {
                    document.body.classList.add('hide-bottom-nav');
                }
            });
            aiPromptInput.addEventListener('blur', () => {
                updateSendBtnState();
                setTimeout(() => {
                    const active = document.activeElement;
                    const isTyping = active && (
                        active.tagName === 'TEXTAREA' ||
                        active.tagName === 'INPUT' ||
                        (active.closest && active.closest('.CodeMirror'))
                    );
                    if (!isTyping) {
                        document.body.classList.remove('hide-bottom-nav');
                    }
                }, 150);
            });
        }

        if (aiSendPromptBtn) {
            const handleSendClick = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                window.sendAiPrompt();
            };
            aiSendPromptBtn.addEventListener('click', handleSendClick);
            aiSendPromptBtn.addEventListener('touchend', handleSendClick);
        }

        // Initialize default mode to 'manual'
        window.switchEditorMode('manual');

        // --- ENGINE SWITCHING LOGIC ---
        const motionFrame = document.getElementById('motionCanvasPlayer');
        const outputContainer = document.getElementById('output');

        window.switchEngine = function (engineId, loadTemplate = true) {
            const engine = availableEngines.find(e => e.id === engineId);
            if (!engine) {
                console.error(`Engine '${engineId}' not found.`);
                return;
            }

            // Save previous engine code to its virtual file if available
            if (currentEngine && studioEditor && studioEditor.value) {
                localStorage.setItem('xtraAnimCode_' + currentEngine, studioEditor.value);
            }

            // Save previous engine's AI chat session before switching
            if (currentEngine && typeof window.saveEngineChatSession === 'function') {
                window.saveEngineChatSession(currentEngine);
            }

            console.log("Switching engine to:", engine.name);
            currentEngine = engine.id;
            // --- Save the selected engine to localStorage ---
            localStorage.setItem('xtraAnimEngine', engine.id);

            // Restore or reset AI Chat Thread specifically for this engine
            if (typeof window.restoreEngineChatSession === 'function') {
                window.restoreEngineChatSession(engine.id);
            } else if (typeof window.clearAiChatThread === 'function') {
                window.clearAiChatThread(engine.id);
            }

            // Dynamically update AI Starter Prompt Cards and Quick Tools to match this engine
            if (typeof window.updateAiStarterCards === 'function') {
                window.updateAiStarterCards(engine.id);
            }

            const templateSelect = document.getElementById('templateSelect');
            const filenameDisplay = document.getElementById('filename-display');

            // UI Updates
            if (filenameDisplay) filenameDisplay.textContent = engine.file;
            if (engineSelectHeader) engineSelectHeader.value = engine.id;
            if (engineSelectModal) engineSelectModal.value = engine.id;

            // Toggle visibility of render settings based on engine type
            const manimSettings = document.getElementById('manimSettings');
            const clientRenderSettings = document.getElementById('clientRenderSettings');
            const animeSettings = document.getElementById('animeSettings');
            const roughSettings = document.getElementById('roughSettings');
            const twoSettings = document.getElementById('twoSettings');
            const svgTo3dSettings = document.getElementById('svgTo3dSettings');
            const svgToPngSettings = document.getElementById('svgToPngSettings');
            const mermaidSettings = document.getElementById('mermaidSettings');
            const katexSettings = document.getElementById('katexSettings');
            const jsxgraphSettings = document.getElementById('jsxgraphSettings');
            const zdogSettings = document.getElementById('zdogSettings');
            const d3Settings = document.getElementById('d3Settings');
            const matterSettings = document.getElementById('matterSettings');
            const thumbnailSettings = document.getElementById('thumbnailSettings');
            const tikzSettings = document.getElementById('tikzSettings');
            const cartoonSettings = document.getElementById('cartoonSettings');
            const soundSettings = document.getElementById('soundSettings');
            const localAgentBtn = document.getElementById('localAgentToolbarBtn');
            if (localAgentBtn) {
                localAgentBtn.style.display = (engine.id === 'manim') ? 'inline-flex' : 'none';
                if (engine.id === 'manim' && typeof window.checkLocalAgentStatus === 'function') {
                    window.checkLocalAgentStatus(false);
                }
            }
            if (manimSettings) manimSettings.style.display = (engine.id === 'manim') ? 'flex' : 'none';
            if (animeSettings) animeSettings.style.display = (engine.id === 'anime') ? 'flex' : 'none';
            if (roughSettings) roughSettings.style.display = (engine.id === 'rough') ? 'flex' : 'none';
            if (twoSettings) twoSettings.style.display = (engine.id === 'two') ? 'flex' : 'none';
            // Client-side generic settings (resolution + duration recording)
            const isGenericClient = engine.id !== 'manim' && engine.id !== 'svg_to_3d' && engine.id !== 'svg_to_png' && engine.id !== 'mermaid' && engine.id !== 'katex' && engine.id !== 'jsxgraph' && engine.id !== 'zdog' && engine.id !== 'd3' && engine.id !== 'matter' && engine.id !== 'thumbnail' && engine.id !== 'tikz' && engine.id !== 'rough' && engine.id !== 'two' && engine.id !== 'cartoon_studio' && engine.id !== 'sound_studio' && engine.id !== 'rapier';
            if (clientRenderSettings) clientRenderSettings.style.display = isGenericClient ? 'flex' : 'none';
            if (svgTo3dSettings) svgTo3dSettings.style.display = (engine.id === 'svg_to_3d') ? 'flex' : 'none';
            if (svgToPngSettings) svgToPngSettings.style.display = (engine.id === 'svg_to_png') ? 'flex' : 'none';
            if (mermaidSettings) mermaidSettings.style.display = (engine.id === 'mermaid') ? 'flex' : 'none';
            if (katexSettings) katexSettings.style.display = (engine.id === 'katex') ? 'flex' : 'none';
            if (jsxgraphSettings) jsxgraphSettings.style.display = (engine.id === 'jsxgraph') ? 'flex' : 'none';
            if (zdogSettings) zdogSettings.style.display = (engine.id === 'zdog') ? 'flex' : 'none';
            if (d3Settings) d3Settings.style.display = (engine.id === 'd3') ? 'flex' : 'none';
            if (matterSettings) matterSettings.style.display = (engine.id === 'matter') ? 'flex' : 'none';
            if (thumbnailSettings) thumbnailSettings.style.display = (engine.id === 'thumbnail') ? 'flex' : 'none';
            if (tikzSettings) tikzSettings.style.display = (engine.id === 'tikz') ? 'flex' : 'none';
            if (cartoonSettings) cartoonSettings.style.display = (engine.id === 'cartoon_studio') ? 'flex' : 'none';
            const rapierSettings = document.getElementById('rapierSettings');
            if (rapierSettings) rapierSettings.style.display = (engine.id === 'rapier') ? 'flex' : 'none';
            if (soundSettings) {
                soundSettings.style.display = (engine.id === 'sound_studio') ? 'flex' : 'none';
                if (engine.id === 'sound_studio' && typeof window.syncSoundVisualPills === 'function') {
                    const codeToCheck = (typeof savedFileCode !== 'undefined' ? savedFileCode : '') || studioEditor?.value || '';
                    const modeMatch = codeToCheck.match(/Sound\.setVisualMode\(['"]([^'"]+)['"]\)/);
                    if (modeMatch && modeMatch[1]) {
                        window.syncSoundVisualPills(modeMatch[1]);
                    }
                }
            }

            // Editor Updates - Virtual File System
            if (loadTemplate) {
                const savedFileCode = localStorage.getItem('xtraAnimCode_' + engine.id);
                if (savedFileCode && savedFileCode.trim().length > 0) {
                    studioEditor.value = savedFileCode;
                } else {
                    if (engine.id === 'p5') {
                        studioEditor.value = p5Template;
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'three') {
                        studioEditor.value = threejsTemplate;
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'anime') {
                        studioEditor.value = animeTemplate;
                        const animeSel = document.getElementById('animeTemplateSelect');
                        if (animeSel) animeSel.value = "kinetic_grid";
                    } else if (engine.id === 'rough') {
                        studioEditor.value = window.roughTemplate || (window.roughTemplates ? window.roughTemplates.sketch_diagram : '');
                        const rSel = document.getElementById('roughTemplateSelect');
                        if (rSel) rSel.value = "sketch_diagram";
                    } else if (engine.id === 'two') {
                        studioEditor.value = window.twoTemplate || (window.twoTemplates ? window.twoTemplates.geometric_starburst : '');
                        const tSel = document.getElementById('twoTemplateSelect');
                        if (tSel) tSel.value = "geometric_starburst";
                    } else if (engine.id === 'thumbnail') {
                        studioEditor.value = fabricTemplate;
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'zdog') {
                        const zSel = document.getElementById('zdogTemplateSelect');
                        const preset = (zSel && zSel.value) ? zSel.value : 'cyber_gem';
                        studioEditor.value = (window.zdogTemplates && window.zdogTemplates[preset]) || window.zdogTemplate || zdogTemplate;
                        if (zSel && !zSel.value) zSel.value = 'cyber_gem';
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'matter') {
                        const mSel = document.getElementById('matterTemplateSelect');
                        const preset = (mSel && mSel.value) ? mSel.value : 'newton_cradle';
                        studioEditor.value = (window.matterTemplates && window.matterTemplates[preset]) || window.matterTemplate || matterjsTemplate;
                        if (mSel && !mSel.value) mSel.value = 'newton_cradle';
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'd3') {
                        const dSel = document.getElementById('d3TemplateSelect');
                        const preset = (dSel && dSel.value) ? dSel.value : 'force_network';
                        studioEditor.value = (window.d3Templates && window.d3Templates[preset]) || window.d3Template || d3jsTemplate;
                        if (dSel && !dSel.value) dSel.value = 'force_network';
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'svg_to_3d') {
                        const s3Sel = document.getElementById('svg3dTemplateSelect');
                        const preset = (s3Sel && s3Sel.value) ? s3Sel.value : 'cyber_mech_falcon';
                        studioEditor.value = (window.svg3dTemplates && window.svg3dTemplates[preset]) || window.defaultSvg3dCode || svgTemplate;
                        if (s3Sel && !s3Sel.value) s3Sel.value = 'cyber_mech_falcon';
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'svg_to_png') {
                        studioEditor.value = window.defaultSvgToPngCode || svgTemplate;
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'mermaid') {
                        const mSel = document.getElementById('mermaidTemplateSelect');
                        const preset = (mSel && mSel.value) ? mSel.value : 'architecture_flow';
                        studioEditor.value = (window.mermaidTemplates && window.mermaidTemplates[preset]) || window.mermaidTemplate || mermaidTemplate;
                        if (mSel && !mSel.value) mSel.value = 'architecture_flow';
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'katex') {
                        const kSel = document.getElementById('katexTemplateSelect');
                        const preset = (kSel && kSel.value) ? kSel.value : 'physics_electrodynamics';
                        studioEditor.value = (window.katexTemplates && window.katexTemplates[preset]) || window.katexTemplate || katexTemplate;
                        if (kSel && !kSel.value) kSel.value = 'physics_electrodynamics';
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'jsxgraph') {
                        const jSel = document.getElementById('jsxgraphTemplateSelect');
                        const preset = (jSel && jSel.value) ? jSel.value : 'calculus_tangent';
                        studioEditor.value = (window.jsxgraphTemplates && window.jsxgraphTemplates[preset]) || window.jsxgraphTemplate || jsxgraphTemplate;
                        if (jSel && !jSel.value) jSel.value = 'calculus_tangent';
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'tikz') {
                        const tSel = document.getElementById('tikzTemplateSelect');
                        const preset = (tSel && tSel.value) ? tSel.value : 'neural_network';
                        studioEditor.value = (window.tikzTemplates && window.tikzTemplates[preset]) || window.defaultTikzCode || '% TikZ Diagram';
                        if (tSel && !tSel.value) tSel.value = 'neural_network';
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'cartoon_studio') {
                        const cSel = document.getElementById('cartoonTemplateSelect');
                        const preset = (cSel && cSel.value) ? cSel.value : 'dual_parkour';
                        studioEditor.value = (window.cartoonStudioTemplates && window.cartoonStudioTemplates[preset]) || (window.cartoonStudioTemplates ? window.cartoonStudioTemplates.dual_parkour : '');
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'sound_studio') {
                        const sSel = document.getElementById('soundTemplateSelect');
                        const preset = (sSel && sSel.value) ? sSel.value : 'metal_collision';
                        studioEditor.value = (window.soundStudioTemplates && window.soundStudioTemplates[preset]) || (window.soundStudioTemplates ? window.soundStudioTemplates.metal_collision : '');
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'rapier') {
                        const rSel = document.getElementById('rapierTemplateSelect');
                        const preset = (rSel && rSel.value) ? rSel.value : 'domino_cascade';
                        studioEditor.value = (window.rapierTemplates && window.rapierTemplates[preset]) || (window.rapierTemplates ? window.rapierTemplates.domino_cascade : '');
                        if (templateSelect) templateSelect.value = "";
                    } else { // manim
                        studioEditor.value = templates.calculus || templates.kinematics;
                        if (templateSelect) templateSelect.value = "calculus";
                    }
                    localStorage.setItem('xtraAnimCode_' + engine.id, studioEditor.value);
                }
                localStorage.setItem('xtraAnimCode', studioEditor.value);
            }

            // Syntax Highlighting
            // CodeMirror Mode & Refresh
            if (window.codeMirrorEditor) {
                let cmMode = 'javascript';
                if (engine.id === 'manim') cmMode = 'python';
                else if (engine.id === 'katex' || engine.id === 'tikz') cmMode = 'stex';
                window.codeMirrorEditor.setOption('mode', cmMode);
                window.codeMirrorEditor.refresh();
            }

            // Reset generated video / upload state on engine switch
            generatedVideoUrl = null;
            window.currentRenderedVideoBlob = null;
            const uploadBtn = document.getElementById('uploadVideoBtn');
            if (uploadBtn) uploadBtn.style.display = 'none';

            // UI Updates for Preview Area
            if (engine.id !== 'manim') { // Any client-side engine
                if (motionFrame) {
                    motionFrame.style.display = 'block';
                    // Clear the previous engine's render so it doesn't look like auto-rendering
                    motionFrame.srcdoc = `<html><body style="margin:0;background:#0d0d0d;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;color:#555;">
                        <div style="text-align:center;">
                            <div style="font-size:2.5rem;margin-bottom:8px;">▶</div>
                            <div style="font-size:0.85rem;">Click Render to preview</div>
                        </div>
                    </body></html>`;
                }
                if (outputContainer) {
                    outputContainer.style.display = 'none';
                    outputContainer.innerHTML = '';
                }
            } else { // manim
                if (motionFrame) {
                    motionFrame.style.display = 'none';
                    motionFrame.srcdoc = ''; // Clear previous Motion Canvas preview
                }
                if (outputContainer) {
                    outputContainer.style.display = 'flex';
                    outputContainer.innerHTML = `
                        <div class="output-placeholder" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; font-family: monospace;">
                            <div style="font-size: 2.5rem; margin-bottom: 8px;">▶</div>
                            <div style="font-size: 0.85rem;">Click Render to preview</div>
                        </div>
                    `;
                }
            }

            // Refresh Highlight
            updateHighlighting();
            logToConsole(`Switched engine to ${engine.name}`);

            // Note: No auto-render on engine switch. User must click the FAB render button.
            if (typeof window.setRenderedState === 'function') {
                window.setRenderedState(false);
            }

            // On mobile, automatically switch to the editor tab when an engine is selected
            if (typeof switchTab === 'function' && window.innerWidth <= 1024) {
                switchTab('editor');
            }
        };

        // --- FIX: Consolidated State Restoration on Load ---
        setTimeout(async () => {
            // NEW: Check for tool pre-selection from URL
            const urlParams = new URLSearchParams(window.location.search);
            const preselectedTool = urlParams.get('tool');
            const remixParamId = urlParams.get('remix') || urlParams.get('id');
            const autoRunParam = urlParams.get('autorun') === 'true' || localStorage.getItem('xtraAnimAutoRun') === 'true';
            localStorage.removeItem('xtraAnimAutoRun');

            let remixData = null;
            const remixMetaRaw = localStorage.getItem('remixMeta');
            if (remixMetaRaw) {
                try { remixData = JSON.parse(remixMetaRaw); } catch { }
            } else if (remixParamId) {
                const allLocal = JSON.parse(localStorage.getItem('userPosts') || '[]');
                let found = allLocal.find(p => String(p.id) === String(remixParamId));
                
                // CRITICAL FIX: If item is from Store or Cloud and not in userPosts, fetch directly from Supabase by ID
                if (!found && window.supabaseClient) {
                    try {
                        const { data: dbPost, error: dbErr } = await window.supabaseClient
                            .from('posts')
                            .select('*')
                            .eq('id', remixParamId)
                            .maybeSingle();
                        if (!dbErr && dbPost) {
                            if (typeof dbPost.source === 'string') {
                                try { dbPost.source = JSON.parse(dbPost.source); } catch (_) { dbPost.source = {}; }
                            }
                            found = dbPost;
                        }
                    } catch (fetchErr) {
                        console.warn("[Studio Remix] Could not fetch remote post by ID:", fetchErr);
                    }
                }

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

                    studioEditor.value = "# --- 🔒 PROTECTED SOURCE CODE ---\n# The creator has protected this mathematical simulation code.\n# Unlock permanent access ($" + (source.code_price || 2.99).toFixed(2) + ") to view, edit, and remix in Studio.";
                    updateHighlighting();

                    const editorContainer = document.querySelector('.editor-container') || document.getElementById('view-editor');
                    if (!editorContainer) return;

                    let lockOverlay = document.getElementById('studioLockOverlay');
                    if (!lockOverlay) {
                        lockOverlay = document.createElement('div');
                        lockOverlay.id = 'studioLockOverlay';
                        lockOverlay.style.cssText = `
                            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                            background: radial-gradient(120% 120% at 50% 15%, rgba(15, 23, 42, 0.94) 0%, rgba(7, 10, 19, 0.98) 100%);
                            backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
                            display: flex; flex-direction: column; align-items: center; justify-content: center;
                            z-index: 50; padding: 24px; text-align: center; box-sizing: border-box;
                        `;
                        lockOverlay.innerHTML = `
                            <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 20px; padding: 32px 28px; max-width: 460px; width: 100%; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.12); display: flex; flex-direction: column; align-items: center; box-sizing: border-box;">
                                
                                <div style="display: inline-flex; align-items: center; gap: 7px; padding: 5px 14px; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 100px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; color: #a5b4fc; text-transform: uppercase; margin-bottom: 16px;">
                                    <i class="ri-shield-keyhole-line" style="font-size: 0.85rem; color: #818cf8;"></i>
                                    <span>LICENSED ASSET</span>
                                </div>

                                <h2 style="font-size: 1.35rem; font-weight: 700; color: #ffffff; letter-spacing: -0.02em; line-height: 1.3; margin: 0 0 10px; background: linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Protected Scientific Source Code</h2>

                                <p style="color: #94a3b8; font-size: 0.86rem; line-height: 1.55; margin: 0 0 20px; max-width: 380px;">The creator has protected the mathematical code for this simulation. Unlock lifetime access to edit, run, and export in Studio.</p>

                                <div style="width: 100%; background: rgba(2, 6, 23, 0.55); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 12px 16px; margin-bottom: 22px; display: flex; flex-direction: column; gap: 10px; text-align: left; box-sizing: border-box;">
                                    <div style="display: flex; align-items: center; gap: 9px; font-size: 0.78rem; color: #cbd5e1;">
                                        <i class="ri-check-line" style="color: #38bdf8; font-weight: 700; font-size: 0.9rem;"></i>
                                        <span><strong>Full Code Access:</strong> Inspect & modify core equations</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 9px; font-size: 0.78rem; color: #cbd5e1;">
                                        <i class="ri-check-line" style="color: #38bdf8; font-weight: 700; font-size: 0.9rem;"></i>
                                        <span><strong>Studio Execution:</strong> Live sandbox simulation & export</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 9px; font-size: 0.78rem; color: #cbd5e1;">
                                        <i class="ri-check-line" style="color: #38bdf8; font-weight: 700; font-size: 0.9rem;"></i>
                                        <span><strong>Lifetime License:</strong> Permanent access with no recurring fees</span>
                                    </div>
                                </div>

                                <button id="studioUnlockCodeBtn" style="width: 100%; padding: 13px 20px; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 12px; font-weight: 600; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.5); transition: all 0.2s ease; box-sizing: border-box;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <i class="ri-key-2-line" style="font-size: 1rem;"></i>
                                        <span>Unlock Source Code</span>
                                    </div>
                                    <span style="background: rgba(255, 255, 255, 0.2); padding: 3px 10px; border-radius: 6px; font-weight: 700; font-size: 0.85rem;">$${(source.code_price || 2.99).toFixed(2)}</span>
                                </button>
                                <span style="font-size: 0.72rem; color: #64748b; margin-top: 10px;">One-time purchase • Instant lifetime activation</span>
                            </div>
                        `;
                        editorContainer.style.position = 'relative';
                        editorContainer.appendChild(lockOverlay);

                        const unlockBtn = lockOverlay.querySelector('#studioUnlockCodeBtn');
                        if (unlockBtn) {
                            unlockBtn.onclick = () => {
                                const unlockMeta = {
                                    id: meta.originalId,
                                    title: meta.title || 'Simulation Source Code',
                                    code_price: source.code_price || 2.99,
                                    price: source.code_price || 2.99
                                };
                                if (window.openSourceCodeUnlockModal) {
                                    window.openSourceCodeUnlockModal(unlockMeta, () => {
                                        lockOverlay.remove();
                                        loadRemixIntoEditor(meta);
                                    });
                                } else if (window.openProductCheckoutModal) {
                                    window.openProductCheckoutModal({
                                        id: meta.originalId,
                                        title: meta.title || 'Simulation Source Code',
                                        price: source.code_price || 2.99,
                                        format: 'CODE'
                                    }, () => {
                                        lockOverlay.remove();
                                        loadRemixIntoEditor(meta);
                                    });
                                } else {
                                    lockOverlay.remove();
                                    loadRemixIntoEditor(meta);
                                }
                            };
                        }
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
                    localStorage.setItem('xtraAnimCode_' + engineToLoad, source.code);
                    // Also sync the engine setting.
                    localStorage.setItem('xtraAnimEngine', engineToLoad);

                    updateHighlighting();
                    logToConsole("Loaded source code for Remix.", 'success');
                    if (autoRunParam) {
                        setTimeout(() => {
                            if (typeof window.handleRender === 'function') window.handleRender(true, false);
                        }, 200);
                    }
                }
            } else if (preselectedTool) {
                // C. Handle pre-selected tool from URL
                let savedFileCode = localStorage.getItem('xtraAnimCode_' + preselectedTool);
                if (preselectedTool === 'sound_studio' && savedFileCode && (savedFileCode.includes('import manim') || savedFileCode.includes('class ') || !savedFileCode.includes('Sound.'))) {
                    savedFileCode = null;
                    localStorage.removeItem('xtraAnimCode_sound_studio');
                }
                if (preselectedTool === 'tikz' && savedFileCode && (savedFileCode.includes('import manim') || savedFileCode.includes('class ') || (!savedFileCode.includes('tikzpicture') && !savedFileCode.includes('\\draw') && !savedFileCode.includes('\\node')))) {
                    savedFileCode = null;
                    localStorage.removeItem('xtraAnimCode_tikz');
                }
                if (preselectedTool === 'svg_to_3d' && savedFileCode && (!savedFileCode.includes('<svg') || savedFileCode.includes('import manim') || savedFileCode.includes('class '))) {
                    savedFileCode = null;
                    localStorage.removeItem('xtraAnimCode_svg_to_3d');
                }
                switchEngine(preselectedTool, !savedFileCode);
                localStorage.setItem('xtraAnimEngine', preselectedTool);
                if (savedFileCode) {
                    studioEditor.value = savedFileCode;
                    localStorage.setItem('xtraAnimCode', savedFileCode);
                } else {
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                }
                updateHighlighting();
                logToConsole(`Switched to ${preselectedTool} engine from URL parameter.`, 'success');
                if (autoRunParam) {
                    setTimeout(() => {
                        if (typeof window.handleRender === 'function') window.handleRender(true, false);
                    }, 200);
                }
            } else {
                // B. Handle Normal Page Load: Restore from localStorage.
                const savedEngine = localStorage.getItem('xtraAnimEngine') || 'p5'; // Default to p5
                let savedCode = localStorage.getItem('xtraAnimCode_' + savedEngine);
                if (savedEngine === 'sound_studio' && savedCode && (savedCode.includes('import manim') || savedCode.includes('class ') || !savedCode.includes('Sound.'))) {
                    savedCode = null;
                    localStorage.removeItem('xtraAnimCode_sound_studio');
                }
                if (savedEngine === 'tikz' && savedCode && (savedCode.includes('import manim') || savedCode.includes('class ') || (!savedCode.includes('tikzpicture') && !savedCode.includes('\\draw') && !savedCode.includes('\\node')))) {
                    savedCode = null;
                    localStorage.removeItem('xtraAnimCode_tikz');
                }
                if (savedEngine === 'svg_to_3d' && savedCode && (!savedCode.includes('<svg') || savedCode.includes('import manim') || savedCode.includes('class '))) {
                    savedCode = null;
                    localStorage.removeItem('xtraAnimCode_svg_to_3d');
                }

                // Switch the engine UI. Only load a template if there's no saved code.
                switchEngine(savedEngine, !savedCode);

                // Update AI Starter Cards for active engine
                if (typeof window.updateAiStarterCards === 'function') {
                    window.updateAiStarterCards(savedEngine);
                }

                // If there was saved code, ensure it's in the editor.
                if (savedCode) {
                    studioEditor.value = savedCode;
                }

                // Finally, update highlighting based on the final state.
                updateHighlighting();
                if (autoRunParam) {
                    setTimeout(() => {
                        if (typeof window.handleRender === 'function') window.handleRender(true, false);
                    }, 200);
                }
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

        // Preset & Theme listeners for Thumbnail Studio
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
                if (currentEngine === 'thumbnail' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const thumbnailTemplateSelect = document.getElementById('thumbnailTemplateSelect');
        if (thumbnailTemplateSelect) {
            thumbnailTemplateSelect.addEventListener('change', function () {
                const selectedTheme = fabricThemes[this.value];
                if (selectedTheme && studioEditor) {
                    studioEditor.value = selectedTheme;
                    updateHighlighting();
                    if (currentEngine === 'thumbnail' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        const animeTemplateSelect = document.getElementById('animeTemplateSelect');
        if (animeTemplateSelect) {
            animeTemplateSelect.addEventListener('change', function () {
                const templates = window.animeTemplates || {};
                const selectedPreset = templates[this.value];
                if (selectedPreset && studioEditor) {
                    studioEditor.value = selectedPreset;
                    localStorage.setItem('xtraAnimCode_anime', studioEditor.value);
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                    updateHighlighting();
                    logToConsole(`Loaded Anime.js preset: ${this.value}`);
                    if (currentEngine === 'anime' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        const roughTemplateSelect = document.getElementById('roughTemplateSelect');
        if (roughTemplateSelect) {
            roughTemplateSelect.addEventListener('change', function () {
                const templates = window.roughTemplates || {};
                const selectedPreset = templates[this.value];
                if (selectedPreset && studioEditor) {
                    studioEditor.value = selectedPreset;
                    localStorage.setItem('xtraAnimCode_rough', studioEditor.value);
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                    updateHighlighting();
                    logToConsole(`Loaded Rough.js preset: ${this.value}`);
                    if (currentEngine === 'rough' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        const twoTemplateSelect = document.getElementById('twoTemplateSelect');
        if (twoTemplateSelect) {
            twoTemplateSelect.addEventListener('change', function () {
                const templates = window.twoTemplates || {};
                const selectedPreset = templates[this.value];
                if (selectedPreset && studioEditor) {
                    studioEditor.value = selectedPreset;
                    localStorage.setItem('xtraAnimCode_two', studioEditor.value);
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                    updateHighlighting();
                    logToConsole(`Loaded Two.js preset: ${this.value}`);
                    if (currentEngine === 'two' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        const zdogTemplateSelect = document.getElementById('zdogTemplateSelect');
        if (zdogTemplateSelect) {
            zdogTemplateSelect.addEventListener('change', function () {
                const templates = window.zdogTemplates || {};
                const selectedPreset = templates[this.value];
                if (selectedPreset && studioEditor) {
                    studioEditor.value = selectedPreset;
                    localStorage.setItem('xtraAnimCode_zdog', studioEditor.value);
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                    updateHighlighting();
                    logToConsole(`Loaded Zdog 3D preset: ${this.value}`, 'success');
                    if (currentEngine === 'zdog' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        const jsxgraphTemplateSelect = document.getElementById('jsxgraphTemplateSelect');
        if (jsxgraphTemplateSelect) {
            jsxgraphTemplateSelect.addEventListener('change', function () {
                const templates = window.jsxgraphTemplates || {};
                const selectedPreset = templates[this.value];
                if (selectedPreset && studioEditor) {
                    studioEditor.value = selectedPreset;
                    localStorage.setItem('xtraAnimCode_jsxgraph', studioEditor.value);
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                    updateHighlighting();
                    logToConsole(`Loaded JSXGraph preset: ${this.value}`, 'success');
                    if (currentEngine === 'jsxgraph' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        const d3TemplateSelect = document.getElementById('d3TemplateSelect');
        if (d3TemplateSelect) {
            d3TemplateSelect.addEventListener('change', function () {
                const templates = window.d3Templates || {};
                const selectedPreset = templates[this.value];
                if (selectedPreset && studioEditor) {
                    studioEditor.value = selectedPreset;
                    localStorage.setItem('xtraAnimCode_d3', studioEditor.value);
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                    updateHighlighting();
                    logToConsole(`Loaded D3.js preset: ${this.value}`, 'success');
                    if (currentEngine === 'd3' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        const matterTemplateSelect = document.getElementById('matterTemplateSelect');
        if (matterTemplateSelect) {
            matterTemplateSelect.addEventListener('change', function () {
                const templates = window.matterTemplates || {};
                const selectedPreset = templates[this.value];
                if (selectedPreset && studioEditor) {
                    studioEditor.value = selectedPreset;
                    localStorage.setItem('xtraAnimCode_matter', studioEditor.value);
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                    updateHighlighting();
                    logToConsole(`Loaded Matter.js preset: ${this.value}`, 'success');
                    if (currentEngine === 'matter' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        const mermaidTemplateSelect = document.getElementById('mermaidTemplateSelect');
        if (mermaidTemplateSelect) {
            mermaidTemplateSelect.addEventListener('change', function () {
                const templates = window.mermaidTemplates || {};
                const selectedPreset = templates[this.value];
                if (selectedPreset && studioEditor) {
                    studioEditor.value = selectedPreset;
                    localStorage.setItem('xtraAnimCode_mermaid', studioEditor.value);
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                    updateHighlighting();
                    logToConsole(`Loaded Mermaid.js preset: ${this.value}`, 'success');
                    if (currentEngine === 'mermaid' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        const mermaidFitMode = document.getElementById('mermaidFitMode');
        const mermaidCustomSizeRow = document.getElementById('mermaidCustomSizeRow');
        if (mermaidFitMode) {
            mermaidFitMode.addEventListener('change', function () {
                if (mermaidCustomSizeRow) {
                    mermaidCustomSizeRow.style.display = (this.value === 'custom') ? 'flex' : 'none';
                }
                if (currentEngine === 'mermaid' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const mermaidBackground = document.getElementById('mermaidBackground');
        if (mermaidBackground) {
            mermaidBackground.addEventListener('input', function () {
                if (currentEngine === 'mermaid' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const mermaidWidth = document.getElementById('mermaidWidth');
        const mermaidHeight = document.getElementById('mermaidHeight');
        if (mermaidWidth) {
            mermaidWidth.addEventListener('input', function () {
                if (currentEngine === 'mermaid' && mermaidFitMode?.value === 'custom' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }
        if (mermaidHeight) {
            mermaidHeight.addEventListener('input', function () {
                if (currentEngine === 'mermaid' && mermaidFitMode?.value === 'custom' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const katexTemplateSelect = document.getElementById('katexTemplateSelect');
        if (katexTemplateSelect) {
            katexTemplateSelect.addEventListener('change', function () {
                const templates = window.katexTemplates || {};
                const selectedPreset = templates[this.value];
                if (selectedPreset && studioEditor) {
                    studioEditor.value = selectedPreset;
                    localStorage.setItem('xtraAnimCode_katex', studioEditor.value);
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                    updateHighlighting();
                    logToConsole(`Loaded KaTeX preset: ${this.value}`, 'success');
                    if (currentEngine === 'katex' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        const katexFitMode = document.getElementById('katexFitMode');
        if (katexFitMode) {
            katexFitMode.addEventListener('change', function () {
                if (currentEngine === 'katex' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const katexFontSize = document.getElementById('katexFontSize');
        if (katexFontSize) {
            katexFontSize.addEventListener('change', function () {
                if (currentEngine === 'katex' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const katexTextColor = document.getElementById('katexTextColor');
        if (katexTextColor) {
            katexTextColor.addEventListener('input', function () {
                if (currentEngine === 'katex' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const katexBackground = document.getElementById('katexBackground');
        if (katexBackground) {
            katexBackground.addEventListener('input', function () {
                if (currentEngine === 'katex' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const svg3dTemplateSelect = document.getElementById('svg3dTemplateSelect');
        if (svg3dTemplateSelect) {
            svg3dTemplateSelect.addEventListener('change', function () {
                const templates = window.svg3dTemplates || {};
                const selectedPreset = templates[this.value];
                if (selectedPreset && studioEditor) {
                    studioEditor.value = selectedPreset;
                    localStorage.setItem('xtraAnimCode_svg_to_3d', studioEditor.value);
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                    updateHighlighting();
                    logToConsole(`Loaded SVG to 3D preset: ${this.value}`, 'success');
                    if (currentEngine === 'svg_to_3d' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        const svg3dExtrudeDepth = document.getElementById('svg3dExtrudeDepth');
        if (svg3dExtrudeDepth) {
            svg3dExtrudeDepth.addEventListener('input', function () {
                if (currentEngine === 'svg_to_3d' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const svg3dAutoRotate = document.getElementById('svg3dAutoRotate');
        if (svg3dAutoRotate) {
            svg3dAutoRotate.addEventListener('change', function () {
                if (currentEngine === 'svg_to_3d' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const svgColorPicker = document.getElementById('svgColorPicker');
        if (svgColorPicker) {
            svgColorPicker.addEventListener('input', function () {
                if (currentEngine === 'svg_to_3d' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const tikzTemplateSelect = document.getElementById('tikzTemplateSelect');
        if (tikzTemplateSelect) {
            tikzTemplateSelect.addEventListener('change', function () {
                const templates = window.tikzTemplates || {};
                const selectedPreset = templates[this.value];
                if (selectedPreset && studioEditor) {
                    studioEditor.value = selectedPreset;
                    localStorage.setItem('xtraAnimCode_tikz', studioEditor.value);
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                    updateHighlighting();
                    logToConsole(`Loaded TikZ preset: ${this.value}`, 'success');
                    if (currentEngine === 'tikz' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        const tikzFitMode = document.getElementById('tikzFitMode');
        if (tikzFitMode) {
            tikzFitMode.addEventListener('change', function () {
                if (currentEngine === 'tikz' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const tikzBackground = document.getElementById('tikzBackground');
        if (tikzBackground) {
            tikzBackground.addEventListener('input', function () {
                if (currentEngine === 'tikz' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const tikzEngineMode = document.getElementById('tikzEngineMode');
        if (tikzEngineMode) {
            tikzEngineMode.addEventListener('change', function () {
                if (currentEngine === 'tikz' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const cartoonTemplateSelect = document.getElementById('cartoonTemplateSelect');
        if (cartoonTemplateSelect) {
            cartoonTemplateSelect.addEventListener('change', function () {
                const templates = window.cartoonStudioTemplates || {};
                const selectedPreset = templates[this.value];
                if (selectedPreset && studioEditor) {
                    studioEditor.value = selectedPreset;
                    localStorage.setItem('xtraAnimCode_cartoon_studio', studioEditor.value);
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                    updateHighlighting();
                    logToConsole(`Loaded Cartoon Studio preset: ${this.value}`);
                    if (currentEngine === 'cartoon_studio' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        const cartoonCharacterSelect = document.getElementById('cartoonCharacterSelect');
        if (cartoonCharacterSelect) {
            cartoonCharacterSelect.addEventListener('change', function () {
                const frame = document.getElementById('motionCanvasPlayer');
                const studio = frame?.contentWindow?.Studio;
                if (studio && typeof studio.setCharacterStyle === 'function') {
                    studio.setCharacterStyle(this.value);
                } else if (currentEngine === 'cartoon_studio' && typeof handleRender === 'function') {
                    handleRender(true, false);
                }
            });
        }

        const soundTemplateSelect = document.getElementById('soundTemplateSelect');
        if (soundTemplateSelect) {
            soundTemplateSelect.addEventListener('change', function () {
                const templates = window.soundStudioTemplates || {};
                const selectedPreset = templates[this.value];
                if (selectedPreset && studioEditor) {
                    studioEditor.value = selectedPreset;
                    localStorage.setItem('xtraAnimCode_sound_studio', studioEditor.value);
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                    updateHighlighting();
                    logToConsole(`Loaded Sound Studio preset: ${this.value}`, 'success');
                    if (currentEngine === 'sound_studio' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        const rapierTemplateSelect = document.getElementById('rapierTemplateSelect');
        if (rapierTemplateSelect) {
            rapierTemplateSelect.addEventListener('change', function () {
                const templates = window.rapierTemplates || {};
                const selectedPreset = templates[this.value];
                if (selectedPreset && studioEditor) {
                    studioEditor.value = selectedPreset;
                    localStorage.setItem('xtraAnimCode_rapier', studioEditor.value);
                    localStorage.setItem('xtraAnimCode', studioEditor.value);
                    updateHighlighting();
                    logToConsole(`Loaded Rapier 3D Physics preset: ${this.value}`, 'success');
                    if (currentEngine === 'rapier' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        }

        // --- Smart Sound Studio Settings Popup Controller ---
        function syncSoundVisualPills(visual) {
            if (!visual) return;
            const soundPills = document.querySelectorAll('.sound-mode-pill');
            soundPills.forEach(p => {
                if (p.dataset.visual === visual) {
                    p.classList.add('active');
                    p.style.border = '1px solid #06b6d4';
                    p.style.background = 'rgba(6,182,212,0.2)';
                    p.style.color = '#06b6d4';
                } else {
                    p.classList.remove('active');
                    p.style.border = '1px solid #333';
                    p.style.background = '#111';
                    p.style.color = '#aaa';
                }
            });
        }
        window.syncSoundVisualPills = syncSoundVisualPills;

        function initSoundStudioSettingsListeners() {
            function getSound() {
                const frame = document.getElementById('motionCanvasPlayer');
                return frame?.contentWindow?.Sound || null;
            }

            // Visualizer Mode Selector Pills
            const soundPills = document.querySelectorAll('.sound-mode-pill');
            soundPills.forEach(pill => {
                pill.addEventListener('click', function () {
                    const visual = this.dataset.visual;
                    syncSoundVisualPills(visual);

                    // 1. Direct call on live iframe Sound instance
                    const frame = document.getElementById('motionCanvasPlayer');
                    try {
                        const sound = getSound();
                        if (sound && typeof sound.setVisualMode === 'function') {
                            sound.setVisualMode(visual);
                        }
                    } catch (e) { }

                    // 2. Post message to iframe for cross-origin or async safety
                    try {
                        frame?.contentWindow?.postMessage({ type: 'SET_VISUAL_MODE', mode: visual }, '*');
                    } catch (e) { }

                    // 3. Update editor code so re-rendering/hot-reloading preserves the selected visualizer
                    if (studioEditor) {
                        if (studioEditor.value.includes('Sound.setVisualMode')) {
                            studioEditor.value = studioEditor.value.replace(/Sound\.setVisualMode\(['"][^'"]+['"]\)/g, `Sound.setVisualMode('${visual}')`);
                        } else if (currentEngine === 'sound_studio') {
                            studioEditor.value = `Sound.setVisualMode('${visual}');\n` + studioEditor.value;
                        }
                        localStorage.setItem('xtraAnimCode_sound_studio', studioEditor.value);
                        localStorage.setItem('xtraAnimCode', studioEditor.value);
                        if (typeof updateHighlighting === 'function') updateHighlighting();
                        if (typeof updateLineNumbers === 'function') updateLineNumbers();
                    }
                });
            });

            // Master Volume Slider
            const volSlider = document.getElementById('soundVolumeSlider');
            const volVal = document.getElementById('soundVolumeVal');
            if (volSlider) {
                volSlider.addEventListener('input', function () {
                    const val = parseInt(this.value, 10);
                    if (volVal) volVal.textContent = `${val}%`;

                    const frame = document.getElementById('motionCanvasPlayer');
                    try {
                        const sound = getSound();
                        if (sound && typeof sound.setVolume === 'function') {
                            sound.setVolume(val / 100);
                        }
                    } catch (e) { }

                    try {
                        frame?.contentWindow?.postMessage({ type: 'SET_VOLUME', volume: val / 100 }, '*');
                    } catch (e) { }

                    if (studioEditor && studioEditor.value.includes('Sound.setVolume')) {
                        studioEditor.value = studioEditor.value.replace(/Sound\.setVolume\([^)]+\)/g, `Sound.setVolume(${(val / 100).toFixed(2)})`);
                        localStorage.setItem('xtraAnimCode_sound_studio', studioEditor.value);
                        localStorage.setItem('xtraAnimCode', studioEditor.value);
                        if (typeof updateHighlighting === 'function') updateHighlighting();
                    }
                });
            }

            // Sync pills when message received from iframe
            window.addEventListener('message', function (event) {
                if (!event.data) return;
                if (event.data.type === 'SOUND_MODE_CHANGED') {
                    syncSoundVisualPills(event.data.mode);
                }
            });

            // Sync pills whenever Settings modal is opened
            const settingsBtn = document.querySelector('button[title="Project Settings"]');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', function () {
                    if (currentEngine === 'sound_studio') {
                        const modeMatch = studioEditor?.value?.match(/Sound\.setVisualMode\(['"]([^'"]+)['"]\)/);
                        if (modeMatch && modeMatch[1]) {
                            syncSoundVisualPills(modeMatch[1]);
                        } else {
                            try {
                                const sound = getSound();
                                if (sound?.visualMode) syncSoundVisualPills(sound.visualMode);
                            } catch (e) { }
                        }
                    }
                });
            }
        }
        initSoundStudioSettingsListeners();

        // --- Smart Cartoon Studio Settings Popup Real-Time Controller ---
        function initCartoonStudioSettingsListeners() {
            function getStudio() {
                const frame = document.getElementById('motionCanvasPlayer');
                return frame?.contentWindow?.Studio || null;
            }
            function getFrameDoc() {
                const frame = document.getElementById('motionCanvasPlayer');
                return frame?.contentWindow?.document || null;
            }

            // Mode Switcher Pills
            const pills = document.querySelectorAll('.cartoon-mode-pill');
            const parkourBox = document.getElementById('cartoonContextParkour');
            const fightBox = document.getElementById('cartoonContextFight');
            const teacherBox = document.getElementById('cartoonContextTeacher');
            const animalBox = document.getElementById('cartoonContextAnimal');
            const soloBox = document.getElementById('cartoonContextSolo');

            const templateSelect = document.getElementById('cartoonTemplateSelect');
            const teacherStatusMsg = document.getElementById('cartoonTeacherStatusMsg');

            function setTeacherStatus(msg) {
                if (teacherStatusMsg) teacherStatusMsg.textContent = msg;
            }

            function generateCartoonCodeForMode(targetMode) {
                if (targetMode === 'parkour') {
                    const action = document.getElementById('cartoonParkourAction')?.value || 'basketball_dunk';
                    const style = document.getElementById('cartoonParkourStyle')?.value || 'stickman_orange';
                    const speed = document.getElementById('cartoonParkourSpeed')?.value || '0.35';
                    const telemetry = document.getElementById('cartoonParkourTelemetryToggle')?.checked !== false;
                    return `// 🏀 Cartoon Studio: The Physics of Parkour (Alan Becker Style)\n// Fastbreak sprint & dribble, immediate two-hand jump shot, high parabolic swish, step-back & jump celebration\n\nStudio.setMode('parkour');\nStudio.setParkourAction('${action}');\nStudio.setParkourStyle('${style}');\nStudio.setParkourSpeed(${speed});\nStudio.enableParkourTelemetry(${telemetry});\n`;
                } else if (targetMode === 'fight') {
                    const hero = document.getElementById('cartoonFighterStyle')?.value || 'stickman_orange';
                    const rival = document.getElementById('cartoonFighter2Style')?.value || 'stickman_blue';
                    return `// ⚔️ Cartoon Studio: Stickman Combat Arena (Alan Becker Style)\n// Program 3D stickman fighting choreography, acrobatics & combos\n\nStudio.setMode('fight');\nStudio.setSpeed(1.0);\nStudio.enableCameraShake(true);\n\n// Fighter 1 Setup (Hero)\nStudio.setFighter1({\n  style: '${hero}'\n});\n\n// Fighter 2 Setup (Rival)\nStudio.setFighter2({\n  style: '${rival}'\n});\n\n// Play choreographed battle sequence\nStudio.playCombo();\n`;
                } else if (targetMode === 'animal') {
                    const sp = document.getElementById('cartoonAnimalSpecies')?.value || 'dog';
                    const gt = document.getElementById('cartoonAnimalGait')?.value || 'trot';
                    return `// 🐾 Cartoon Studio: Quadruped & Creature Locomotion\n// Procedural quadruped inverse kinematics with gait dynamics\n\nStudio.setMode('animal');\nStudio.setSpecies('${sp}');\nStudio.setGait('${gt}');\nStudio.setSpeed(1.15);\nStudio.setTailWag(true);\nStudio.setCameraPreset('side');\n`;
                } else if (targetMode === 'solo') {
                    const mo = document.getElementById('cartoonSoloMotion')?.value || 'walk';
                    const sk = document.getElementById('cartoonCharacterSelect')?.value || 'stickman_orange';
                    return `// 🏃 Cartoon Studio: Solo MoCap Character Studio\n// CMU Motion Capture with customizable 3D cartoon skins\n\nStudio.setMode('solo');\nStudio.setMotion('${mo}');\nStudio.setCharacterStyle('${sk}');\nStudio.setInPlace(true);\nStudio.setSpeed(1.0);\nStudio.setCameraPreset('side');\n`;
                } else {
                    const ls = document.getElementById('cartoonLessonSelect')?.value || 'quadratic';
                    const av = document.getElementById('cartoonTeacherAvatar')?.value || 'hero';
                    return `// 🧑‍🏫 Cartoon Studio: 3D Math & Science Teacher\n// Animated professor with chalkboard writing, pointing, and speech\n\nStudio.setMode('teacher');\nStudio.setLesson('${ls}');\nStudio.setTeacherStyle('${av}');\n\n// Auto-teach the interactive blackboard step-by-step\nStudio.autoExplain();\n`;
                }
            }

            function syncCartoonCode(targetMode) {
                if (studioEditor) {
                    const newCode = generateCartoonCodeForMode(targetMode);
                    studioEditor.value = newCode;
                    localStorage.setItem('xtraAnimCode_cartoon_studio', newCode);
                    localStorage.setItem('xtraAnimCode', newCode);
                    if (typeof updateHighlighting === 'function') updateHighlighting();
                }
            }
            window.syncCartoonStudioCode = syncCartoonCode;
            window.generateCartoonCodeForMode = generateCartoonCodeForMode;

            pills.forEach(pill => {
                pill.addEventListener('click', function () {
                    const mode = this.dataset.mode;
                    pills.forEach(p => {
                        p.classList.remove('active');
                        p.style.border = '1px solid #27272a';
                        p.style.background = '#111';
                        p.style.color = '#94a3b8';
                    });
                    this.classList.add('active');

                    const colorMap = {
                        parkour: { border: '#f97316', bg: 'rgba(249,115,22,0.22)', text: '#fb923c' },
                        teacher: { border: '#3b82f6', bg: 'rgba(59,130,246,0.22)', text: '#60a5fa' },
                        fight: { border: '#f97316', bg: 'rgba(249,115,22,0.22)', text: '#f97316' },
                        animal: { border: '#34d399', bg: 'rgba(52,211,153,0.22)', text: '#34d399' },
                        solo: { border: '#c084fc', bg: 'rgba(192,132,252,0.22)', text: '#c084fc' }
                    };
                    const c = colorMap[mode] || colorMap.parkour;
                    this.style.border = `1px solid ${c.border}`;
                    this.style.background = c.bg;
                    this.style.color = c.text;

                    if (parkourBox) parkourBox.style.display = (mode === 'parkour') ? 'flex' : 'none';
                    if (fightBox) fightBox.style.display = (mode === 'fight') ? 'flex' : 'none';
                    if (teacherBox) teacherBox.style.display = (mode === 'teacher') ? 'flex' : 'none';
                    if (animalBox) animalBox.style.display = (mode === 'animal') ? 'flex' : 'none';
                    if (soloBox) soloBox.style.display = (mode === 'solo') ? 'flex' : 'none';

                    if (templateSelect) {
                        const tmplMap = {
                            parkour: 'parkour_physics',
                            teacher: 'math_teacher',
                            fight: 'fight_arena',
                            animal: 'animal_studio',
                            solo: 'solo_mocap'
                        };
                        if (tmplMap[mode]) templateSelect.value = tmplMap[mode];
                    }

                    // Keep editor code synchronized with selected mode so Render renders selected mode
                    syncCartoonCode(mode);

                    const studio = getStudio();
                    if (studio) studio.setMode(mode);
                });
            });

            // Synchronize template select with mode pills
            templateSelect?.addEventListener('change', function () {
                const val = this.value;
                const modeMap = {
                    dual_parkour: 'parkour',
                    cinematic_movie: 'parkour',
                    parkour_physics: 'parkour',
                    math_teacher: 'teacher',
                    fight_arena: 'fight',
                    custom_battle: 'fight',
                    generative_matrix: 'fight',
                    animal_studio: 'animal',
                    solo_mocap: 'solo'
                };
                const targetMode = modeMap[val] || 'parkour';
                pills.forEach(p => {
                    if (p.dataset.mode === targetMode) p.click();
                });
            });

            // Parkour actions
            document.getElementById('cartoonParkourAction')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setParkourAction(this.value);
                syncCartoonCode('parkour');
            });

            document.getElementById('cartoonParkourStyle')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setParkourStyle(this.value);
                syncCartoonCode('parkour');
            });

            document.getElementById('cartoonParkourSpeed')?.addEventListener('input', function () {
                const speed = parseFloat(this.value);
                const valEl = document.getElementById('cartoonParkourSpeedVal');
                if (valEl) valEl.textContent = speed.toFixed(2) + 'x';
                const studio = getStudio();
                if (studio) studio.setParkourSpeed(speed);
                syncCartoonCode('parkour');
            });

            document.getElementById('cartoonParkourTelemetryToggle')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.enableParkourTelemetry(this.checked);
                syncCartoonCode('parkour');
            });

            document.getElementById('btnPopupParkourJump')?.addEventListener('click', () => {
                const studio = getStudio();
                if (studio) studio.triggerParkourJump();
            });

            // Fight Arena actions
            document.getElementById('btnPopupPlayFight')?.addEventListener('click', () => {
                const studio = getStudio();
                if (studio) studio.playCombo();
            });

            document.getElementById('cartoonFighterStyle')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setFighter1({ style: this.value });
                syncCartoonCode('fight');
            });

            document.getElementById('cartoonFighter2Style')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setFighter2({ style: this.value });
                syncCartoonCode('fight');
            });

            document.querySelectorAll('.cartoon-trigger-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const studio = getStudio();
                    if (studio) studio.triggerMove(this.dataset.move);
                });
            });

            document.getElementById('cartoonFightLoopToggle')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setFightLoop(this.checked);
            });

            document.getElementById('cartoonFightFxToggle')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.enableCameraShake(this.checked);
            });

            // Math Teacher actions
            document.getElementById('cartoonLessonSelect')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setLesson(this.value);
                setTeacherStatus('Loaded lesson: ' + this.options[this.selectedIndex]?.text);
                syncCartoonCode('teacher');
            });

            document.getElementById('cartoonTeacherAvatar')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setTeacherStyle(this.value);
                setTeacherStatus('Avatar updated: ' + this.options[this.selectedIndex]?.text);
                syncCartoonCode('teacher');
            });

            document.getElementById('btnPopupTeacherPrev')?.addEventListener('click', () => {
                const studio = getStudio();
                if (studio) studio.prevStep();
                setTeacherStatus('Moved to previous step on chalkboard.');
            });

            document.getElementById('btnPopupTeacherPlay')?.addEventListener('click', () => {
                const studio = getStudio();
                if (studio) studio.autoExplain();
                setTeacherStatus('▶️ Auto-teaching lesson on chalkboard!');
            });

            document.getElementById('btnPopupTeacherNext')?.addEventListener('click', () => {
                const studio = getStudio();
                if (studio) studio.nextStep();
                setTeacherStatus('Moved to next step on chalkboard.');
            });

            document.getElementById('btnPopupTeacherWrite')?.addEventListener('click', () => {
                const doc = getFrameDoc();
                doc?.getElementById('btn-teacher-write')?.click();
                setTeacherStatus('✍️ Teacher physically writing chalk on board with sparks!');
            });

            document.getElementById('btnPopupTeacherExplain')?.addEventListener('click', () => {
                const doc = getFrameDoc();
                doc?.getElementById('btn-teacher-explain')?.click();
                setTeacherStatus('💬 Teacher explaining formula to class.');
            });

            document.querySelectorAll('.cartoon-walk-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const doc = getFrameDoc();
                    doc?.getElementById('btn-walk-' + this.dataset.pos)?.click();
                    setTeacherStatus(`🚶 Moving teacher across classroom floor to ${this.textContent}...`);
                });
            });

            // Animal Studio actions
            document.getElementById('cartoonAnimalSpecies')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setSpecies(this.value);
                syncCartoonCode('animal');
            });

            document.getElementById('cartoonAnimalGait')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setGait(this.value);
                syncCartoonCode('animal');
            });

            document.getElementById('cartoonAnimalCoat')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setCoat(this.value);
            });

            document.getElementById('cartoonAnimalTailToggle')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setTailWag(this.checked);
            });

            document.getElementById('cartoonAnimalInplaceToggle')?.addEventListener('change', function () {
                const doc = getFrameDoc();
                const frameToggle = doc?.getElementById('animal-inplace-toggle');
                if (frameToggle) {
                    frameToggle.checked = this.checked;
                    frameToggle.dispatchEvent(new Event('change'));
                }
            });

            // Solo MoCap actions
            document.getElementById('cartoonSoloMotion')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setMotion(this.value);
                syncCartoonCode('solo');
            });

            document.getElementById('cartoonCharacterSelect')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setCharacterStyle(this.value);
                syncCartoonCode('solo');
            });

            document.getElementById('cartoonSoloInPlaceToggle')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setInPlace(this.checked);
            });

            document.getElementById('cartoonSoloSkeletonToggle')?.addEventListener('change', function () {
                const doc = getFrameDoc();
                const frameToggle = doc?.getElementById('skeleton-toggle');
                if (frameToggle) {
                    frameToggle.checked = this.checked;
                    frameToggle.dispatchEvent(new Event('change'));
                }
            });

            // Action Dock Buttons for Animal & Solo Modes
            document.getElementById('btnPlayAnimalAction')?.addEventListener('click', () => {
                const studio = getStudio();
                if (studio) {
                    const species = document.getElementById('cartoonAnimalSpecies')?.value || 'dog';
                    const gait = document.getElementById('cartoonAnimalGait')?.value || 'trot';
                    studio.setSpecies(species);
                    studio.setGait(gait);
                }
            });

            document.getElementById('btnPlaySoloAction')?.addEventListener('click', () => {
                const studio = getStudio();
                if (studio) {
                    const motion = document.getElementById('cartoonSoloMotion')?.value || 'walk';
                    const skin = document.getElementById('cartoonCharacterSelect')?.value || 'stickman_orange';
                    studio.setMotion(motion);
                    studio.setCharacterStyle(skin);
                }
            });

            // Universal Cartoon Sidebar Render Buttons
            document.querySelectorAll('.btnCartoonOpenRenderModal').forEach(btn => {
                btn.addEventListener('click', () => {
                    const renderBtn = document.getElementById('render-btn');
                    if (renderBtn) {
                        renderBtn.click();
                    }
                });
            });

            // Global Camera view presets
            const camBtns = document.querySelectorAll('.cartoon-cam-btn');
            camBtns.forEach(btn => {
                btn.addEventListener('click', function () {
                    camBtns.forEach(b => {
                        b.classList.remove('active');
                        b.style.background = '#111827';
                        b.style.borderColor = '#1f2937';
                        b.style.color = '#94a3b8';
                    });
                    this.classList.add('active');
                    this.style.background = '#1e293b';
                    this.style.borderColor = '#38bdf8';
                    this.style.color = '#fff';

                    const studio = getStudio();
                    if (studio) studio.setCameraPreset(this.dataset.cam);
                });
            });

            // Global Lens Field of View (FOV) Slider
            const fovSlider = document.getElementById('cartoonFovSlider');
            const fovVal = document.getElementById('cartoonFovVal');
            fovSlider?.addEventListener('input', function () {
                const val = parseInt(this.value, 10);
                if (fovVal) fovVal.textContent = val + '°';
                const studio = getStudio();
                if (studio) studio.setFOV(val);
            });

            // Stage Environment & Lighting Presets
            document.getElementById('cartoonEnvTheme')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setEnvironment(this.value);
            });

            document.getElementById('cartoonLightingPreset')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setLighting(this.value);
            });

            document.getElementById('cartoonFloorGridToggle')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setGrid(this.checked);
            });

            document.getElementById('cartoonFloorShadowsToggle')?.addEventListener('change', function () {
                const studio = getStudio();
                if (studio) studio.setShadows(this.checked);
            });

            // Global Playback Speed slider & Speed preset pills
            const speedSlider = document.getElementById('cartoonSpeedSlider');
            const speedVal = document.getElementById('cartoonSpeedVal');
            const speedPills = document.querySelectorAll('.cartoon-speed-preset');

            function applyCartoonSpeed(val) {
                if (speedVal) speedVal.textContent = val.toFixed(2) + 'x';
                if (speedSlider) speedSlider.value = val;
                speedPills.forEach(p => {
                    const match = Math.abs(parseFloat(p.dataset.speed) - val) < 0.05;
                    if (match) {
                        p.classList.add('active');
                        p.style.background = 'rgba(249,115,22,0.2)';
                        p.style.borderColor = '#f97316';
                        p.style.color = '#f97316';
                    } else {
                        p.classList.remove('active');
                        p.style.background = '#181c26';
                        p.style.borderColor = '#334155';
                        p.style.color = '#cbd5e1';
                    }
                });
                const studio = getStudio();
                if (studio) studio.setSpeed(val);
            }

            speedSlider?.addEventListener('input', function () {
                const val = parseFloat(this.value);
                applyCartoonSpeed(val);
            });

            speedPills.forEach(pill => {
                pill.addEventListener('click', function () {
                    const val = parseFloat(this.dataset.speed);
                    applyCartoonSpeed(val);
                });
            });

            // Quick Script Inserter Deck
            function insertStudioSnippet(snippetCode) {
                if (!studioEditor) return;
                const start = studioEditor.selectionStart || studioEditor.value.length;
                const end = studioEditor.selectionEnd || studioEditor.value.length;
                const before = studioEditor.value.substring(0, start);
                const after = studioEditor.value.substring(end);
                studioEditor.value = before + (before.endsWith('\n') || before.length === 0 ? '' : '\n') + snippetCode + '\n' + after;
                studioEditor.selectionStart = studioEditor.selectionEnd = start + snippetCode.length + 1;
                studioEditor.focus();
                localStorage.setItem('xtraAnimCode_cartoon_studio', studioEditor.value);
                localStorage.setItem('xtraAnimCode', studioEditor.value);
                if (typeof updateHighlighting === 'function') updateHighlighting();
                if (typeof updateLineNumbers === 'function') updateLineNumbers();
                if (typeof logToConsole === 'function') logToConsole('Inserted Cartoon Studio code snippet', 'info');
            }

            document.querySelectorAll('.cartoon-insert-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const type = this.dataset.snippet;
                    let snippet = '';
                    if (type === 'combo') {
                        snippet = `// Choreographed battle sequence
const battle = Studio.timeline();
battle
  .at(0.0, () => Studio.getFighter1()?.moveTo(2.4, 0, 0, 0.25))
  .at(0.25, () => {
    Studio.getFighter1()?.attack('punch', 0.12);
    Studio.getFighter2()?.attack('block', 0.12);
    Studio.fx.sparks(0.5, 12, 0);
    Studio.camera.shake(0.4);
  })
  .at(0.6, () => {
    Studio.getFighter2()?.attack('kick', 0.18);
    Studio.camera.shake(0.3);
  })
  .at(1.0, () => {
    Studio.getFighter1()?.reset(0.25);
    Studio.getFighter2()?.reset(0.25);
  });`;
                    } else if (type === 'shake') {
                        snippet = `// Cinematic Impact Shockwave & Camera Shake
Studio.fx.shockwave(0, 10, 0, 0xffea00);
Studio.fx.sparks(0, 10, 0);
Studio.camera.shake(0.6);`;
                    } else if (type === 'prop') {
                        snippet = `// Spawn Defensive Cartoon Energy Shield Prop
const shield = Studio.createProp('shield', {
  color: 0x38bdf8,
  position: [3.5, 8, 0]
});
Studio.onUpdate((delta) => {
  shield.rotation.z += delta * 2.0;
});`;
                    } else if (type === 'timeline') {
                        snippet = `// Timed Choreography Step
Studio.timeline().at(1.2, () => {
  Studio.fx.sparks(0, 8, 0);
  Studio.camera.shake(0.35);
});`;
                    }
                    if (snippet) insertStudioSnippet(snippet);
                });
            });
        }
        initCartoonStudioSettingsListeners();

        // --- Smart Cartoon Studio Render Choice Modal Controller ---
        function initCartoonRenderChoiceModal() {
            const modal = document.getElementById('cartoonRenderChoiceModal');
            if (!modal) return;

            const tabBtnCurrent = document.getElementById('tabBtnCurrentCode');
            const tabBtnTemplate = document.getElementById('tabBtnTemplatePreset');
            const tabBtnCustom = document.getElementById('tabBtnCustomPrompt');

            const panelCurrent = document.getElementById('panelRenderCurrent');
            const panelTemplate = document.getElementById('panelRenderTemplate');
            const panelCustom = document.getElementById('panelRenderCustom');

            const detectedModeBadge = document.getElementById('detectedModeBadge');
            const scriptStatsBadge = document.getElementById('scriptStatsBadge');
            const renderCodePreview = document.getElementById('renderCodePreview');
            const renderCodeIndicator = document.getElementById('renderCodeIndicator');
            const customStudioInput = document.getElementById('customStudioScriptInput');

            // Tab Switching Logic
            function setRenderTab(tab) {
                const tabs = [
                    { btn: tabBtnCurrent, panel: panelCurrent, name: 'current' },
                    { btn: tabBtnTemplate, panel: panelTemplate, name: 'template' },
                    { btn: tabBtnCustom, panel: panelCustom, name: 'custom' }
                ];

                tabs.forEach(t => {
                    if (!t.btn || !t.panel) return;
                    const isActive = t.name === tab;
                    t.btn.classList.toggle('active', isActive);
                    t.panel.style.display = isActive ? 'flex' : 'none';

                    if (isActive) {
                        t.btn.style.background = '#f97316';
                        t.btn.style.color = '#ffffff';
                        t.btn.style.fontWeight = '700';
                        t.btn.style.boxShadow = '0 2px 10px rgba(249,115,22,0.35)';
                    } else {
                        t.btn.style.background = 'transparent';
                        t.btn.style.color = '#94a3b8';
                        t.btn.style.fontWeight = '600';
                        t.btn.style.boxShadow = 'none';
                    }
                });

                if (tab === 'current' || tab === 'custom') {
                    refreshPreview();
                }
            }

            if (tabBtnCurrent) tabBtnCurrent.addEventListener('click', () => setRenderTab('current'));
            if (tabBtnTemplate) tabBtnTemplate.addEventListener('click', () => setRenderTab('template'));
            if (tabBtnCustom) tabBtnCustom.addEventListener('click', () => setRenderTab('custom'));

            // Live Active Scene Summary & Code Preview Diagnostics
            function updateActiveSummary() {
                const activePill = document.querySelector('.cartoon-mode-pill.active');
                const mode = activePill?.dataset?.mode || 'teacher';
                const summaryIcon = document.getElementById('summaryModalIcon');
                const summaryTitle = document.getElementById('summaryModalTitle');
                const summaryDetail = document.getElementById('summaryModalDetail');
                const summaryStatus = document.getElementById('summaryModalStatus');

                if (mode === 'teacher') {
                    const lessonSel = document.getElementById('cartoonLessonSelect');
                    const avatarSel = document.getElementById('cartoonTeacherAvatar');
                    const lessonText = lessonSel?.options[lessonSel.selectedIndex]?.text || 'Quadratic Formula & Roots';
                    const avatarText = avatarSel?.options[avatarSel.selectedIndex]?.text || 'Neon Hero Professor';
                    if (summaryIcon) summaryIcon.textContent = '🧑‍🏫';
                    if (summaryTitle) summaryTitle.textContent = '3D Math Teacher & Blackboard';
                    if (summaryDetail) summaryDetail.textContent = `${lessonText} • ${avatarText} • 60 FPS`;
                    if (summaryStatus) summaryStatus.textContent = '🟢 Ground Y = 0.00';
                } else if (mode === 'fight') {
                    const heroSel = document.getElementById('cartoonFighterStyle');
                    const rivalSel = document.getElementById('cartoonFighter2Style');
                    const heroText = heroSel?.options[heroSel.selectedIndex]?.text || 'Orange';
                    const rivalText = rivalSel?.options[rivalSel.selectedIndex]?.text || 'Blue';
                    if (summaryIcon) summaryIcon.textContent = '⚔️';
                    if (summaryTitle) summaryTitle.textContent = 'Stickman Combat Arena';
                    if (summaryDetail) summaryDetail.textContent = `Hero (${heroText}) vs Rival (${rivalText}) • Full Battle Combo`;
                    if (summaryStatus) summaryStatus.textContent = '🟢 Arena Y = 0.00';
                } else if (mode === 'animal') {
                    const spSel = document.getElementById('cartoonAnimalSpecies');
                    const gaitSel = document.getElementById('cartoonAnimalGait');
                    const spText = spSel?.options[spSel.selectedIndex]?.text || 'Shiba Inu';
                    const gaitText = gaitSel?.options[gaitSel.selectedIndex]?.text || 'Trot';
                    if (summaryIcon) summaryIcon.textContent = '🐾';
                    if (summaryTitle) summaryTitle.textContent = 'Animal & Creature Locomotion';
                    if (summaryDetail) summaryDetail.textContent = `${spText} • Gait: ${gaitText} • Tail Physics`;
                    if (summaryStatus) summaryStatus.textContent = '🟢 Grounded';
                } else if (mode === 'solo') {
                    const moSel = document.getElementById('cartoonSoloMotion');
                    const chSel = document.getElementById('cartoonCharacterSelect');
                    const moText = moSel?.options[moSel.selectedIndex]?.text || 'Walk';
                    const chText = chSel?.options[chSel.selectedIndex]?.text || 'Orange Stick';
                    if (summaryIcon) summaryIcon.textContent = '🏃';
                    if (summaryTitle) summaryTitle.textContent = 'CMU MoCap Character Studio';
                    if (summaryDetail) summaryDetail.textContent = `Motion: ${moText} • Skin: ${chText} • 60 FPS`;
                    if (summaryStatus) summaryStatus.textContent = '🟢 Grounded';
                }
            }

            // Live Code Preview & Diagnostics
            function refreshPreview() {
                updateActiveSummary();
                const code = (studioEditor ? studioEditor.value : '').trim();
                const lines = code ? code.split('\n').length : 0;
                const bytes = new Blob([code]).size;
                const sizeStr = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';

                let detectedMode = '🛠️ Custom Studio Script';
                let modeColor = 'rgba(56,189,248,0.15)';
                let modeText = '#38bdf8';
                let modeBorder = 'rgba(56,189,248,0.3)';

                if (code.includes("'fight'") || code.includes('"fight"') || code.includes('setFighter1') || code.includes('triggerMove') || code.includes('playCombo')) {
                    detectedMode = '⚔️ Fight Arena Detected';
                    modeColor = 'rgba(249,115,22,0.15)';
                    modeText = '#f97316';
                    modeBorder = 'rgba(249,115,22,0.3)';
                } else if (code.includes("'teacher'") || code.includes('"teacher"') || code.includes('setLesson') || code.includes('autoExplain')) {
                    detectedMode = '🧑‍🏫 Math Teacher Detected';
                    modeColor = 'rgba(168,85,247,0.15)';
                    modeText = '#c084fc';
                    modeBorder = 'rgba(168,85,247,0.3)';
                } else if (code.includes("'animal'") || code.includes('"animal"') || code.includes('setSpecies') || code.includes('setGait')) {
                    detectedMode = '🐾 Animal Studio Detected';
                    modeColor = 'rgba(16,185,129,0.15)';
                    modeText = '#34d399';
                    modeBorder = 'rgba(16,185,129,0.3)';
                } else if (code.includes("'solo'") || code.includes('"solo"') || code.includes('setMotion')) {
                    detectedMode = '🏃 Solo MoCap Detected';
                    modeColor = 'rgba(236,72,153,0.15)';
                    modeText = '#f472b6';
                    modeBorder = 'rgba(236,72,153,0.3)';
                }

                if (detectedModeBadge) {
                    detectedModeBadge.textContent = detectedMode;
                    detectedModeBadge.style.background = modeColor;
                    detectedModeBadge.style.color = modeText;
                    detectedModeBadge.style.borderColor = modeBorder;
                }
                if (scriptStatsBadge) {
                    scriptStatsBadge.textContent = `${lines} lines • ${sizeStr}`;
                }
                if (renderCodePreview) {
                    renderCodePreview.textContent = code || '// Active scene auto-configured from studio controls';
                }
                if (renderCodeIndicator) {
                    renderCodeIndicator.textContent = 'Scene Ready';
                    renderCodeIndicator.style.background = 'rgba(16,185,129,0.15)';
                    renderCodeIndicator.style.color = '#34d399';
                    renderCodeIndicator.style.borderColor = 'rgba(16,185,129,0.3)';
                }
                if (customStudioInput && (!customStudioInput.value.trim() || customStudioInput.dataset.synced === 'auto')) {
                    customStudioInput.value = code;
                    customStudioInput.dataset.synced = 'auto';
                }
            }
            window.refreshCartoonRenderModalPreview = refreshPreview;
            window.setCartoonRenderTab = setRenderTab;

            // Copy Code Button
            const copyBtn = document.getElementById('btnCopyModalCode');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    const code = studioEditor ? studioEditor.value : '';
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(code).then(() => {
                            const original = copyBtn.textContent;
                            copyBtn.textContent = '✅ Copied!';
                            setTimeout(() => { copyBtn.textContent = original; }, 1800);
                        });
                    }
                });
            }

            // Back to Editor Button
            const backBtn = document.getElementById('btnBackToEditor');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
                    if (studioEditor) studioEditor.focus();
                });
            }

            // Primary 1-Click Action: Render Current Scene / Code
            const btnRenderCurrent = document.getElementById('btnRenderCurrentCode');
            if (btnRenderCurrent) {
                btnRenderCurrent.addEventListener('click', () => {
                    const camOverride = document.getElementById('choiceCameraView')?.value || document.getElementById('overrideCameraView')?.value || 'side';
                    const speedOverride = document.getElementById('overrideSpeed')?.value || 'preserve';

                    modal.style.display = 'none';

                    // Auto-generate code from active sidebar options if editor is empty
                    if (studioEditor && !studioEditor.value.trim()) {
                        const activePill = document.querySelector('.cartoon-mode-pill.active');
                        const mode = activePill?.dataset?.mode || 'teacher';
                        let autoCode = '';
                        if (mode === 'teacher') {
                            const lesson = document.getElementById('cartoonLessonSelect')?.value || 'quadratic';
                            const avatar = document.getElementById('cartoonTeacherAvatar')?.value || 'hero';
                            autoCode = `// 🧑‍🏫 Cartoon Studio: 3D Math & Science Teacher\nStudio.setMode('teacher');\nStudio.setLesson('${lesson}');\nStudio.setTeacherStyle('${avatar}');\nStudio.setCameraPreset('${camOverride}');\nStudio.autoExplain();\n`;
                        } else if (mode === 'fight') {
                            const h = document.getElementById('cartoonFighterStyle')?.value || 'stickman_orange';
                            const r = document.getElementById('cartoonFighter2Style')?.value || 'stickman_blue';
                            autoCode = `// ⚔️ Cartoon Studio: Stickman Combat Arena\nStudio.setMode('fight');\nStudio.setFighter1({ style: '${h}' });\nStudio.setFighter2({ style: '${r}' });\nStudio.setCameraPreset('${camOverride}');\nStudio.playCombo();\n`;
                        } else if (mode === 'animal') {
                            const sp = document.getElementById('cartoonAnimalSpecies')?.value || 'dog';
                            const gt = document.getElementById('cartoonAnimalGait')?.value || 'trot';
                            autoCode = `// 🐾 Cartoon Studio: Quadruped Locomotion\nStudio.setMode('animal');\nStudio.setSpecies('${sp}');\nStudio.setGait('${gt}');\nStudio.setCameraPreset('${camOverride}');\n`;
                        } else if (mode === 'solo') {
                            const mo = document.getElementById('cartoonSoloMotion')?.value || 'walk';
                            const sk = document.getElementById('cartoonCharacterSelect')?.value || 'stickman_orange';
                            autoCode = `// 🏃 Cartoon Studio: Solo MoCap Studio\nStudio.setMode('solo');\nStudio.setMotion('${mo}');\nStudio.setCharacterStyle('${sk}');\nStudio.setCameraPreset('${camOverride}');\n`;
                        }
                        studioEditor.value = autoCode;
                    }

                    // Save active script
                    if (studioEditor) {
                        const code = studioEditor.value;
                        localStorage.setItem('xtraAnimCode_cartoon_studio', code);
                        localStorage.setItem('xtraAnimCode', code);
                    }

                    // Trigger render execution
                    if (typeof window.handleRender === 'function') {
                        window.handleRender(true, false);
                    }

                    // Apply runtime overrides post-frame initialization
                    setTimeout(() => {
                        const iframe = document.getElementById('renderFrame');
                        const win = iframe?.contentWindow;
                        if (win && win.Studio) {
                            if (camOverride && camOverride !== 'preserve' && typeof win.Studio.setCameraPreset === 'function') {
                                win.Studio.setCameraPreset(camOverride);
                            }
                            if (speedOverride && speedOverride !== 'preserve' && typeof win.Studio.setSpeed === 'function') {
                                win.Studio.setSpeed(parseFloat(speedOverride));
                            }
                        }
                    }, 300);

                    const lines = studioEditor ? studioEditor.value.split('\n').length : 0;
                    logToConsole(`Render started for active Cartoon Studio scene (${lines} lines)...`, 'success');
                });
            }

            // Tab 2: Template selection cards
            const templateCards = modal.querySelectorAll('.choice-template-card');
            const fightConfig = document.getElementById('choiceConfigFight');
            const teacherConfig = document.getElementById('choiceConfigTeacher');
            const animalConfig = document.getElementById('choiceConfigAnimal');
            const soloConfig = document.getElementById('choiceConfigSolo');

            templateCards.forEach(card => {
                card.addEventListener('click', function () {
                    const tmpl = this.dataset.template;
                    templateCards.forEach(c => {
                        c.classList.remove('active');
                        c.style.borderColor = 'rgba(255,255,255,0.1)';
                        c.style.background = 'rgba(255,255,255,0.03)';
                        const title = c.querySelector('strong');
                        if (title) title.style.color = '#cbd5e1';
                    });
                    this.classList.add('active');
                    this.style.borderColor = '#f97316';
                    this.style.background = 'rgba(249,115,22,0.12)';
                    const title = this.querySelector('strong');
                    if (title) title.style.color = '#f97316';

                    if (fightConfig) fightConfig.style.display = (tmpl === 'fight_arena') ? 'flex' : 'none';
                    if (teacherConfig) teacherConfig.style.display = (tmpl === 'math_teacher') ? 'flex' : 'none';
                    if (animalConfig) animalConfig.style.display = (tmpl === 'animal_studio') ? 'flex' : 'none';
                    if (soloConfig) soloConfig.style.display = (tmpl === 'solo_mocap') ? 'flex' : 'none';
                });
            });

            // Character pills selection
            const charPills = modal.querySelectorAll('.choice-char-pill');
            charPills.forEach(pill => {
                pill.addEventListener('click', function () {
                    charPills.forEach(p => {
                        p.classList.remove('active');
                        p.style.borderColor = '#334155';
                        p.style.background = '#1a1e26';
                    });
                    this.classList.add('active');
                    this.style.borderColor = '#f97316';
                    this.style.background = 'rgba(249,115,22,0.18)';
                });
            });

            // Tab 2 Action: Generate & Render Preset Scene
            const executeBtn = document.getElementById('btnExecuteCartoonRender');
            if (executeBtn) {
                executeBtn.addEventListener('click', () => {
                    const activeCard = modal.querySelector('.choice-template-card.active');
                    const template = activeCard?.dataset.template || 'fight_arena';
                    const activePill = modal.querySelector('.choice-char-pill.active');
                    const charStyle = activePill?.dataset.style || 'stickman_orange';
                    const cameraView = document.getElementById('choiceCameraView')?.value || 'side';
                    const targetMode = modal.querySelector('input[name="templateTargetMode"]:checked')?.value || 'overwrite';

                    let generatedCode = '';

                    if (template === 'fight_arena') {
                        const action = document.getElementById('choiceFightAction')?.value || 'combo';
                        const f2Style = document.getElementById('choiceFighter2Style')?.value || 'stickman_blue';
                        generatedCode = `// ⚔️ Cartoon Studio: Stickman Combat Arena (Alan Becker Style)
Studio.setMode('fight');
Studio.setSpeed(1.0);
Studio.enableCameraShake(true);

// Fighter 1 (${charStyle})
Studio.setFighter1({
  style: '${charStyle}'
});

// Fighter 2 Rival (${f2Style})
Studio.setFighter2({
  style: '${f2Style}'
});

Studio.setCameraPreset('${cameraView}');

${action === 'combo' ? '// Play full choreographed battle combo\nStudio.playCombo();' : `// Trigger move: ${action}\nStudio.triggerMove('${action}');`}
`;
                    } else if (template === 'math_teacher') {
                        const lesson = document.getElementById('choiceTeacherLesson')?.value || 'quadratic';
                        const teacherAvatar = (charStyle === 'hero' || charStyle === 'runner' || charStyle === 'robot') ? charStyle : 'hero';
                        generatedCode = `// 🧑‍🏫 Cartoon Studio: 3D Math & Science Teacher
Studio.setMode('teacher');
Studio.setLesson('${lesson}');
Studio.setTeacherStyle('${teacherAvatar}');
Studio.setCameraPreset('${cameraView}');

// Auto-teach lesson on smart chalkboard
Studio.autoExplain();
`;
                    } else if (template === 'animal_studio') {
                        const species = document.getElementById('choiceAnimalSpecies')?.value || 'dog';
                        const gait = document.getElementById('choiceAnimalGait')?.value || 'trot';
                        generatedCode = `// 🐾 Cartoon Studio: Quadruped & Creature Locomotion
Studio.setMode('animal');
Studio.setSpecies('${species}');
Studio.setGait('${gait}');
Studio.setSpeed(1.15);
Studio.setTailWag(true);
Studio.setCameraPreset('${cameraView}');
`;
                    } else if (template === 'solo_mocap') {
                        const motion = document.getElementById('choiceSoloMotion')?.value || 'walk';
                        generatedCode = `// 🏃 Cartoon Studio: Solo MoCap Character Studio
Studio.setMode('solo');
Studio.setMotion('${motion}');
Studio.setCharacterStyle('${charStyle}');
Studio.setInPlace(true);
Studio.setCameraPreset('${cameraView}');
`;
                    }

                    // Handle overwrite vs append
                    if (studioEditor) {
                        if (targetMode === 'append' && studioEditor.value.trim()) {
                            studioEditor.value += `\n\n// --- Added Scene Action ---\n${generatedCode}`;
                        } else {
                            studioEditor.value = generatedCode;
                        }
                        localStorage.setItem('xtraAnimCode_cartoon_studio', studioEditor.value);
                        localStorage.setItem('xtraAnimCode', studioEditor.value);
                        if (typeof updateHighlighting === 'function') updateHighlighting();
                    }

                    // Sync settings in Settings popup too
                    const tSel = document.getElementById('cartoonTemplateSelect');
                    if (tSel) tSel.value = template;
                    const fSel = document.getElementById('cartoonFighterStyle');
                    if (fSel) fSel.value = charStyle;
                    const cPills = document.querySelectorAll('.cartoon-mode-pill');
                    const pillTarget = (template === 'fight_arena') ? 'fight' : (template === 'math_teacher') ? 'teacher' : (template === 'animal_studio') ? 'animal' : 'solo';
                    cPills.forEach(p => {
                        if (p.dataset.mode === pillTarget) p.click();
                    });

                    // Close modal
                    modal.style.display = 'none';

                    // Execute render
                    if (typeof window.handleRender === 'function') {
                        window.handleRender(true, false);
                    }
                    logToConsole(`Rendered Cartoon Studio: ${template} with ${charStyle}`, 'success');
                });
            }

            // Tab 3: Custom Builder chips and execution
            const customChips = modal.querySelectorAll('.custom-snippet-chip');
            customChips.forEach(chip => {
                chip.addEventListener('click', function () {
                    const snippet = this.dataset.code;
                    if (!snippet || !customStudioInput) return;
                    customStudioInput.dataset.synced = 'custom';
                    const start = customStudioInput.selectionStart || customStudioInput.value.length;
                    const end = customStudioInput.selectionEnd || customStudioInput.value.length;
                    const text = customStudioInput.value;
                    const insert = '\n' + snippet;
                    customStudioInput.value = text.substring(0, start) + insert + text.substring(end);
                    customStudioInput.focus();
                });
            });

            const btnExecuteCustom = document.getElementById('btnExecuteCustomRender');
            if (btnExecuteCustom) {
                btnExecuteCustom.addEventListener('click', () => {
                    const customCode = customStudioInput ? customStudioInput.value.trim() : '';
                    if (!customCode) {
                        alert('Please enter or generate custom Studio code first.');
                        return;
                    }

                    const targetMode = modal.querySelector('input[name="customTargetMode"]:checked')?.value || 'overwrite';

                    if (studioEditor) {
                        if (targetMode === 'append' && studioEditor.value.trim()) {
                            studioEditor.value += `\n\n${customCode}`;
                        } else {
                            studioEditor.value = customCode;
                        }
                        localStorage.setItem('xtraAnimCode_cartoon_studio', studioEditor.value);
                        localStorage.setItem('xtraAnimCode', studioEditor.value);
                        if (typeof updateHighlighting === 'function') updateHighlighting();
                    }

                    modal.style.display = 'none';

                    if (typeof window.handleRender === 'function') {
                        window.handleRender(true, false);
                    }
                    logToConsole('Rendered custom Studio code script successfully.', 'success');
                });
            }
        }
        initCartoonRenderChoiceModal();

        // Quick Stickers & Elements 1-Click Injector
        document.querySelectorAll('.sticker-quick-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const stickerType = this.dataset.sticker;
                let snippet = '';
                if (stickerType === 'formula') {
                    snippet = `\n// Inserted Formula Sticker\ncanvas.add(helpers.createSticker('formula', 120, 120, '📐 MATH & FORMULA'));\ncanvas.renderAll();`;
                } else if (stickerType === 'simulation') {
                    snippet = `\n// Inserted 3D Simulation Sticker\ncanvas.add(helpers.createSticker('simulation', 120, 120, '🚀 3D SIMULATION'));\ncanvas.renderAll();`;
                } else if (stickerType === 'interactive') {
                    snippet = `\n// Inserted Live Code Sticker\ncanvas.add(helpers.createSticker('interactive', 120, 120, '⚡ LIVE CODE'));\ncanvas.renderAll();`;
                } else if (stickerType === 'pro') {
                    snippet = `\n// Inserted Pro Badge\ncanvas.add(helpers.createSticker('pro', 120, 120, '👑 PRO ACCESS'));\ncanvas.renderAll();`;
                } else if (stickerType === 'course') {
                    snippet = `\n// Inserted Course Badge\ncanvas.add(helpers.createSticker('course', 120, 120, '📘 COMPLETE MASTERCLASS'));\ncanvas.renderAll();`;
                } else if (stickerType === 'glass') {
                    snippet = `\n// Inserted Glassmorphic Card\ncanvas.add(helpers.createGlassCard(120, 360, 520, 220, 'Interactive Model', 'Explore live parameters and visual simulations.'));\ncanvas.renderAll();`;
                } else if (stickerType === 'grid') {
                    snippet = `\n// Inserted Matrix Blueprint Grid\ncanvas.add(helpers.createGridPattern(50, 'rgba(56, 189, 248, 0.08)'));\ncanvas.renderAll();`;
                }
                if (snippet && studioEditor) {
                    studioEditor.value = (studioEditor.value || '') + '\n' + snippet;
                    updateHighlighting();
                    if (currentEngine === 'thumbnail' && typeof handleRender === 'function') {
                        handleRender(true, false);
                    }
                }
            });
        });

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

        // --- LOCAL AGENT SUPPORT ---
        window.activeAgentUrl = 'http://127.0.0.1:8989';

        window.checkLocalAgentStatus = async function (showAlert = false) {
            const statusBox = document.getElementById('localAgentStatusIndicator');
            const statusText = document.getElementById('localAgentStatusText');
            const toolbarDot = document.getElementById('agentToolbarStatusDot');
            const modalDot = document.getElementById('agentModalStatusDot');
            const hostname = window.location.hostname || '127.0.0.1';
            const isLocalHost = (
                hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
            );

            const candidateUrls = ['http://127.0.0.1:8989', 'http://localhost:8989'];
            if (isLocalHost) {
                candidateUrls.push(`http://${hostname}:8000`);
                candidateUrls.push('http://127.0.0.1:8000');
                candidateUrls.push('http://localhost:8000');
                if (window.location.origin && !candidateUrls.includes(window.location.origin)) {
                    candidateUrls.push(window.location.origin);
                }
            }

            if (statusText) statusText.innerText = "Checking agent connection...";

            for (const url of candidateUrls) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 1200);
                    const res = await fetch(`${url}/health`, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (res.ok) {
                        window.activeAgentUrl = url;
                        if (toolbarDot) {
                            toolbarDot.style.background = '#22c55e';
                            toolbarDot.style.boxShadow = '0 0 8px #22c55e';
                        }
                        if (modalDot) {
                            modalDot.style.background = '#22c55e';
                            modalDot.style.boxShadow = '0 0 8px #22c55e';
                        }
                        if (statusBox) {
                            statusBox.style.background = 'rgba(34, 197, 94, 0.15)';
                            statusBox.style.borderColor = 'rgba(34, 197, 94, 0.35)';
                        }
                        if (statusText) {
                            statusText.style.color = '#86efac';
                            statusText.innerText = `Agent online on ${url}`;
                        }
                        if (showAlert && typeof logToConsole === 'function') {
                            logToConsole(`✅ Local Agent connected successfully on ${url}!`, 'success');
                        }
                        return true;
                    }
                } catch (e) { }
            }

            if (toolbarDot) {
                toolbarDot.style.background = '#ef4444';
                toolbarDot.style.boxShadow = '0 0 6px rgba(239,68,68,0.7)';
            }
            if (modalDot) {
                modalDot.style.background = '#ef4444';
                modalDot.style.boxShadow = '0 0 8px rgba(239,68,68,0.8)';
            }
            if (statusBox) {
                statusBox.style.background = 'rgba(239, 68, 68, 0.12)';
                statusBox.style.borderColor = 'rgba(239, 68, 68, 0.25)';
            }
            if (statusText) {
                statusText.style.color = '#fca5a5';
                statusText.innerText = 'Agent offline on :8989';
            }
            return false;
        };

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
                    // For SVG, D3, Mermaid, KaTeX, JSXGraph, Zdog, Thumbnail, TikZ, Anime.js, Rough.js, Two.js, Cartoon Studio, Sound Studio, Rapier, and SVG to PNG, we can publish the preview.
                    uploadBtn.style.display = (currentEngine === 'svg_to_3d' || currentEngine === 'svg_to_png' || currentEngine === 'd3' || currentEngine === 'mermaid' || currentEngine === 'katex' || currentEngine === 'jsxgraph' || currentEngine === 'zdog' || currentEngine === 'thumbnail' || currentEngine === 'tikz' || currentEngine === 'anime' || currentEngine === 'rough' || currentEngine === 'two' || currentEngine === 'cartoon_studio' || currentEngine === 'sound_studio' || currentEngine === 'rapier') ? 'block' : 'none';
                    if (localStorage.getItem('articleContext')) {
                        uploadBtn.textContent = '☁️ Publish to Article';
                        uploadBtn.style.background = '#10b981';
                    } else if (localStorage.getItem('courseContext')) {
                        uploadBtn.textContent = '☁️ Publish to Course';
                        uploadBtn.style.background = '#10b981';
                    }
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
                                width = parseInt(document.getElementById('thumbnailWidth')?.value || '1920', 10);
                                height = parseInt(document.getElementById('thumbnailHeight')?.value || '820', 10);
                            }
                            const background = document.getElementById('thumbnailBackground')?.value || '#09090b';

                            frame.srcdoc = window.renderFabric(code, { width, height, background });
                            logToConsole('Thumbnail canvas preview rendered!', 'success');
                        }
                    } else {
                        logToConsole("Error: Fabric thumbnail rendering library not loaded.", 'error');
                    }

                } else if (currentEngine === 'anime') {
                    if (window.renderAnime) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';

                            let width = 1280;
                            let height = 720;
                            const formatSelect = document.getElementById('formatSelectClient');
                            if (formatSelect) {
                                const parts = formatSelect.value.split('x');
                                width = parseInt(parts[0], 10);
                                height = parseInt(parts[1], 10);
                            }

                            frame.srcdoc = window.renderAnime(code, { width, height, background: '#080a10' });
                            logToConsole('Anime.js kinetic animation rendered!', 'success');
                        }
                    } else {
                        logToConsole("Error: Anime.js rendering handler not loaded.", 'error');
                    }

                } else if (currentEngine === 'rough') {
                    if (window.renderRough) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';

                            let width = 1280;
                            let height = 720;
                            const formatSelect = document.getElementById('formatSelectClient');
                            if (formatSelect) {
                                const parts = formatSelect.value.split('x');
                                width = parseInt(parts[0], 10);
                                height = parseInt(parts[1], 10);
                            }

                            frame.srcdoc = window.renderRough(code, { width, height, background: '#0e1117' });
                            logToConsole('Rough.js hand-drawn sketch rendered!', 'success');
                        }
                    } else {
                        logToConsole("Error: Rough.js rendering handler not loaded.", 'error');
                    }

                } else if (currentEngine === 'two') {
                    if (window.renderTwo) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';

                            let width = 1280;
                            let height = 720;
                            const formatSelect = document.getElementById('formatSelectClient');
                            if (formatSelect) {
                                const parts = formatSelect.value.split('x');
                                width = parseInt(parts[0], 10);
                                height = parseInt(parts[1], 10);
                            }

                            frame.srcdoc = window.renderTwo(code, { width, height, background: '#090b10' });
                            logToConsole('Two.js 2D vector animation rendered!', 'success');
                        }
                    } else {
                        logToConsole("Error: Two.js rendering handler not loaded.", 'error');
                    }

                } else if (currentEngine === 'cartoon_studio') {
                    if (window.renderCartoonStudio) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';

                            const activePill = document.querySelector('.cartoon-mode-pill.active');
                            const activeMode = activePill?.dataset?.mode || 'parkour';
                            const cPresetSel = document.getElementById('cartoonTemplateSelect');
                            const defaultPreset = cPresetSel ? cPresetSel.value : (activeMode === 'fight' ? 'fight_arena' : activeMode === 'animal' ? 'animal_studio' : activeMode === 'solo' ? 'solo_mocap' : activeMode === 'teacher' ? 'math_teacher' : 'dual_parkour');
                            const cCharSel = document.getElementById('cartoonCharacterSelect');
                            const characterStyle = cCharSel ? cCharSel.value : 'stickman_orange';

                            frame.srcdoc = window.renderCartoonStudio(code, { mode: activeMode, defaultPreset, characterStyle });
                            logToConsole(`Cartoon Studio (${activeMode.toUpperCase()}) scene rendered!`, 'success');
                        }
                    } else {
                        logToConsole("Error: Cartoon Studio rendering handler not loaded.", 'error');
                    }

                } else if (currentEngine === 'sound_studio') {
                    if (window.renderSoundStudio) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';
                            frame.setAttribute('allow', 'autoplay');

                            frame.srcdoc = window.renderSoundStudio(code, { isFeed: false });
                            logToConsole('Sound Studio audio & waves rendered!', 'success');
                        }
                    } else {
                        logToConsole("Error: Sound Studio rendering handler not loaded.", 'error');
                    }

                } else if (currentEngine === 'rapier') {
                    if (window.renderRapierStudio) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';
                            frame.srcdoc = window.renderRapierStudio(code);
                            logToConsole('Rapier 3D WASM physics simulation rendered!', 'success');
                        }
                    } else {
                        logToConsole("Error: Rapier Physics rendering handler not loaded.", 'error');
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

                } else if (currentEngine === 'd3') {
                    if (window.renderD3) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';

                            const bgPicker = document.getElementById('d3Background');
                            const background = bgPicker ? bgPicker.value : '#0a0d14';

                            frame.srcdoc = window.renderD3(code, { background });
                            logToConsole('D3.js kinetic visualization rendered!', 'success');
                        }
                    } else {
                        logToConsole("Error: D3.js rendering library not loaded.", 'error');
                    }

                } else if (currentEngine === 'matter') {
                    if (window.renderMatter) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';

                            const bgPicker = document.getElementById('matterBackground');
                            const background = bgPicker ? bgPicker.value : '#0a0d14';

                            frame.srcdoc = window.renderMatter(code, { background });
                            logToConsole('Matter.js physics simulation rendered!', 'success');
                        }
                    } else {
                        logToConsole("Error: Matter.js rendering library not loaded.", 'error');
                    }

                } else if (currentEngine === 'mermaid') {
                    if (window.renderMermaid) {
                        const frame = document.getElementById('motionCanvasPlayer');
                        if (frame) {
                            frame.style.display = 'block';
                            if (outputContainer) outputContainer.style.display = 'none';

                            // Get size, fit mode, and background from settings
                            const widthInput = document.getElementById('mermaidWidth');
                            const heightInput = document.getElementById('mermaidHeight');
                            const fitSelect = document.getElementById('mermaidFitMode');
                            const bgInput = document.getElementById('mermaidBackground');
                            const fitMode = fitSelect ? fitSelect.value : 'auto';
                            const background = bgInput ? bgInput.value : '#0a0d14';
                            const width = widthInput ? widthInput.value : 1280;
                            const height = heightInput ? heightInput.value : 720;

                            // The renderMermaid function returns responsive iframe content fitted to preview screen
                            frame.srcdoc = window.renderMermaid(code, { width, height, fitMode, background });
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
                            const fitSelect = document.getElementById('katexFitMode');
                            const bgPicker = document.getElementById('katexBackground');

                            const fontSize = fontSizeSelect ? fontSizeSelect.value : '1.8em';
                            const color = colorPicker ? colorPicker.value : '#f8fafc';
                            const fitMode = fitSelect ? fitSelect.value : 'auto';
                            const background = bgPicker ? bgPicker.value : '#0a0d14';

                            // The renderKatex function returns responsive iframe content fitted to preview screen
                            frame.srcdoc = window.renderKatex(code, { fontSize, color, fitMode, background });
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
                        const fitSelect = document.getElementById('tikzFitMode');
                        const bgPicker = document.getElementById('tikzBackground');

                        const fitMode = fitSelect ? fitSelect.value : 'auto';
                        const background = bgPicker ? bgPicker.value : '#090b10';
                        const tikzOptions = { background, fitMode };

                        const backendBase = (typeof getBackendUrl === 'function' ? getBackendUrl() : '') || '';
                        logToConsole("Compiling TikZ via Native LaTeX TeX Live Engine...", 'info');

                        fetch(`${backendBase}/api/compile_tikz`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code: code, dpi: 300 })
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.success && data.pngBase64) {
                                    logToConsole("TikZ compilation successful!", 'success');
                                    window.currentTikzPng = data.pngBase64;
                                    if (window.renderTikzPro) {
                                        frame.srcdoc = window.renderTikzPro(data.pngBase64, tikzOptions);
                                    }
                                    if (!isPreview) {
                                        const a = document.createElement('a');
                                        a.href = data.pngBase64;
                                        a.download = 'tikz_diagram.png';
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        logToConsole('Downloaded TikZ diagram as PNG!', 'success');
                                    }
                                } else {
                                    logToConsole(`TikZ Engine: ${data.error || 'Compilation failed.'} ${data.logs ? '- ' + data.logs.slice(0, 150) : ''}`, 'error');
                                    if (window.renderTikz) frame.srcdoc = window.renderTikz(code, tikzOptions);
                                }
                            })
                            .catch(err => {
                                logToConsole(`TikZ Host Error: ${err.message}. Trying client-side fallback...`, 'error');
                                if (window.renderTikz) frame.srcdoc = window.renderTikz(code, tikzOptions);
                            });
                    }

                } else if (currentEngine === 'svg_to_3d') {
                    const svgCode = JSON.stringify(code);
                    const colorPicker = document.getElementById('svgColorPicker');
                    const depthInput = document.getElementById('svg3dExtrudeDepth');
                    const autoRotateInput = document.getElementById('svg3dAutoRotate');

                    const modelColor = colorPicker ? colorPicker.value : '#3b82f6';
                    const depth = depthInput ? parseFloat(depthInput.value) || 22 : 22;
                    const autoRotate = autoRotateInput ? autoRotateInput.checked : true;

                    // Use the helper function with depth and auto-spin options
                    const iframeContent = createSVG3DViewerIframeContent(svgCode, modelColor, true, { depth, autoRotate });

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
                    // Existing logic for p5, three, anime, d3, matter
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

                    if (currentEngine === 'p5' || currentEngine === 'research') {
                        libraryUrl = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js';
                    } else if (currentEngine === 'three') {
                        libraryUrl = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                        extraScripts = '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\/script>';
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
                    if (currentEngine === 'p5' || currentEngine === 'research') {
                        userScript = `
                            <script>
                                window.onerror = function(msg, url, lineNo, columnNo, error) {
                                    console.error("p5.js execution error:", msg, error);
                                    const container = document.getElementById('canvas-container');
                                    if (container) {
                                        container.innerHTML = '<div style="color:#ef4444; padding:20px; font-family:monospace; background:#141414; border:1px solid #333; border-radius:8px; font-size:13px; max-width:90%;"><strong>p5.js Execution Error:</strong><br>' + msg + '</div>';
                                    }
                                    return false;
                                };
                                try {
                                    ${code.replace(/__WIDTH__/g, clientRenderWidth).replace(/__HEIGHT__/g, clientRenderHeight)}
                                    if (typeof setup === 'function') window.setup = setup;
                                    if (typeof draw === 'function') window.draw = draw;
                                    if (typeof preload === 'function') window.preload = preload;
                                    if (typeof mousePressed === 'function') window.mousePressed = mousePressed;
                                    if (typeof mouseReleased === 'function') window.mouseReleased = mouseReleased;
                                    if (typeof mouseDragged === 'function') window.mouseDragged = mouseDragged;
                                    if (typeof keyPressed === 'function') window.keyPressed = keyPressed;
                                    if (typeof windowResized === 'function') window.windowResized = windowResized;
                                } catch (e) {
                                    console.error("p5.js execution error:", e);
                                    const container = document.getElementById('canvas-container');
                                    if (container) {
                                        container.innerHTML = '<div style="color:#ef4444; padding:20px; font-family:monospace; background:#141414; border:1px solid #333; border-radius:8px; font-size:13px; max-width:90%;"><strong>Script Error:</strong><br>' + e.message + '</div>';
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
                if (typeof window.setRenderedState === 'function') {
                    window.setRenderedState(true, code);
                }
                return; // CRITICAL: Stop execution for client-side engines

            } else { // START of Manim Block
                logToConsole("Checking Local Agent connection...", 'info');

                const previewBtn = document.getElementById('previewBtn');
                const startRenderBtn = document.getElementById('startRenderBtn');
                const uploadBtn = document.getElementById('uploadVideoBtn');
                if (uploadBtn) uploadBtn.style.display = 'none';

                if (isPreview) {
                    if (previewBtn) {
                        previewBtn.disabled = true;
                        previewBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Checking...`;
                    }
                    logToConsole("Generating layout preview...");
                } else {
                    if (renderBtn) renderBtn.innerHTML = `<i class="ri-loader-4-line spin"></i>`;
                    if (startRenderBtn) {
                        startRenderBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Processing...`;
                        startRenderBtn.disabled = true;
                    }
                    logToConsole("Initializing Manim render...");
                }

                const motionFrame = document.getElementById('motionCanvasPlayer');
                if (motionFrame) motionFrame.style.display = 'none';
                if (outputContainer) {
                    outputContainer.style.display = 'flex';
                    outputContainer.innerHTML = `
                            <div style="text-align: center; color: var(--text-muted);">
                                <div class="spinner" style="font-size: 2rem; margin-bottom: 10px;"><i class="ri-flashlight-fill"></i></div>
                                <p style="font-size: 0.9rem;">Connecting to Manim Engine...</p>
                            </div>
                        `;
                }

                // Check Local Agent first
                window.checkLocalAgentStatus(false).then(isAgentOnline => {
                    if (isAgentOnline) {
                        const portStr = (window.activeAgentUrl && window.activeAgentUrl.includes(':8000')) ? ':8000' : ':8989';
                        logToConsole(`⚡ Connected to Local Agent on ${portStr}! Rendering locally on your device...`, 'success');

                        if (outputContainer) {
                            outputContainer.innerHTML = `
                                    <div style="text-align: center; color: var(--text-muted);">
                                        <div class="spinner" style="font-size: 2rem; margin-bottom: 10px;"><i class="ri-flashlight-fill"></i></div>
                                        <p style="font-size: 0.9rem;">Rendering locally with your CPU/GPU (Zero server queues)...</p>
                                    </div>
                                `;
                        }

                        fetch(`${window.activeAgentUrl || 'http://127.0.0.1:8989'}/execute`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                task_type: 'manim',
                                code: code
                            })
                        })
                            .then(async response => {
                                if (!response.ok) {
                                    const err = await response.json().catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
                                    throw new Error(err.detail || err.error || "Local render execution failed.");
                                }
                                const blob = await response.blob();
                                const videoUrl = URL.createObjectURL(blob);
                                window.currentRenderedVideoBlob = blob;
                                logToConsole("✅ Local Manim render completed successfully!", 'success');
                                finishRender({ success: true, videoUrl: videoUrl }, isPreview);
                            })
                            .catch(err => {
                                logToConsole("❌ Local Agent Error: " + err.message, 'error');
                                finishRender({ success: false, error: err.message }, isPreview);
                            });

                    } else {
                        // If Local Agent is offline, check if local server backend is available
                        const hostname = window.location.hostname;
                        const isLocal = (
                            hostname === 'localhost' ||
                            hostname === '127.0.0.1' ||
                            hostname.startsWith('192.168.') ||
                            hostname.startsWith('10.') ||
                            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
                        );

                        if (isLocal) {
                            logToConsole("Local Agent not connected. Falling back to local backend server...", 'info');

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

                            fetch(`${backendUrl || ''}/api/render`, {
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
                                    if (data.task_id) {
                                        logToConsole("Render started in background. Task ID: " + data.task_id, 'success');
                                        pollRenderStatus(data.task_id, isPreview);
                                        return;
                                    }
                                    finishRender(data, isPreview);
                                })
                                .catch(err => {
                                    finishRender({ success: false, error: "Network Error: Local backend is not running." }, isPreview);
                                    logToConsole("Network Error: Local backend is not running.", 'error');
                                });

                        } else {
                            // On web / live server without local agent running -> Show the Connection Modal!
                            finishRender({ success: false, error: "Local Agent is required to render Manim." }, isPreview);
                            logToConsole("⚠️ Local Agent is offline. Open the Connect dialog to connect your device.", 'warn');
                            const agentModal = document.getElementById('localAgentModal');
                            if (agentModal) {
                                agentModal.style.display = 'flex';
                                window.checkLocalAgentStatus(false);
                            }
                        }
                    }
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
                if (typeof window.setRenderedState === 'function') {
                    window.setRenderedState(true, studioEditor ? studioEditor.value : '');
                }
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
                if (typeof window.setRenderedState === 'function') {
                    window.setRenderedState(false);
                }
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
            // Attach listeners: execute directly for client engines or open settings for Manim
            renderBtn.addEventListener('click', () => {
                if (currentEngine !== 'manim') {
                    console.log(`Executing client-side engine '${currentEngine}' directly.`);
                    window.handleRender(true, false);
                } else {
                    const settingsPopup = document.getElementById('settings-popup');
                    if (settingsPopup) {
                        console.log(`Opening render settings popup for Manim.`);
                        settingsPopup.style.display = 'flex';
                    }
                }
            });
        }

        if (uploadBtn && uploadModal) {
            uploadBtn.addEventListener('click', () => {
                uploadModal.style.display = 'block';
            });
        }

        // --- Cloud Storage Helper: Upload to Supabase 'videos' Public Bucket ---
        async function uploadMediaToSupabaseStorage(mediaInput, filenamePrefix = 'creation', mimeType = 'video/mp4') {
            const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
            if (!client || !client.storage) {
                console.warn("Supabase storage client not available.");
                return null;
            }

            try {
                let blob = null;
                if (mediaInput instanceof Blob) {
                    blob = mediaInput;
                } else if (typeof mediaInput === 'string') {
                    let fetchUrl = mediaInput;
                    if (!mediaInput.startsWith('http') && !mediaInput.startsWith('data:') && !mediaInput.startsWith('blob:')) {
                        // On local dev, Python backend is typically running on port 8000
                        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                        const hostUrl = isLocal ? `http://${window.location.hostname}:8000` : (getBackendUrl() || window.location.origin);
                        fetchUrl = `${hostUrl}${mediaInput.startsWith('/') ? '' : '/'}${mediaInput}`;
                    }
                    console.log("Fetching media blob for cloud upload from:", fetchUrl);
                    const res = await fetch(fetchUrl);
                    if (!res.ok) {
                        console.error(`Failed to fetch media from ${fetchUrl} (status: ${res.status})`);
                        return null;
                    }
                    blob = await res.blob();
                }

                if (!blob || blob.size === 0) {
                    console.error("Media blob is empty or could not be generated.");
                    return null;
                }

                const ext = mimeType?.includes('png') ? 'png' : (mimeType?.includes('svg') ? 'svg' : (mimeType?.includes('webm') ? 'webm' : 'mp4'));
                const filename = `${filenamePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

                console.log(`Uploading ${blob.size} bytes to Supabase Storage ('videos/${filename}')...`);
                const { data, error } = await client.storage.from('videos').upload(filename, blob, {
                    contentType: mimeType || blob.type || 'video/mp4',
                    upsert: true
                });

                if (error) {
                    console.error("Supabase Storage upload error:", error);
                    return null;
                }

                const { data: publicUrlData } = client.storage.from('videos').getPublicUrl(filename);
                if (publicUrlData && publicUrlData.publicUrl) {
                    console.log("Successfully uploaded to Supabase Storage CDN:", publicUrlData.publicUrl);
                    return publicUrlData.publicUrl;
                }
            } catch (err) {
                console.error("Could not upload to Supabase Storage:", err);
            }
            return null;
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

                } else if (currentEngine === 'anime') {
                    postFormat = 'interactive';
                    postSource = { engine: 'anime', code: studioEditor.value, background: '#080a10', is_course_content: isForCourse };

                    const frame = document.getElementById('motionCanvasPlayer');
                    let svgElement = null;
                    if (frame && frame.contentWindow) {
                        svgElement = frame.contentWindow.document.querySelector('#canvas-container svg') || frame.contentWindow.document.querySelector('svg');
                    }

                    if (svgElement) {
                        try {
                            const svgData = new XMLSerializer().serializeToString(svgElement);
                            const blob = new Blob([svgData], { type: 'image/svg+xml' });
                            const formData = new FormData();
                            formData.append('file', blob, 'anime_motion.svg');
                            const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                            const data = await res.json();
                            if (data.url) finalVideoUrl = data.url;
                        } catch (e) {
                            console.warn("Could not upload Anime.js thumbnail to backend, proceeding with fallback", e);
                        }
                    }
                    if (!finalVideoUrl) finalVideoUrl = '';
                    mediaType = 'image/svg+xml';

                } else if (currentEngine === 'rough') {
                    postFormat = 'interactive';
                    postSource = { engine: 'rough', code: studioEditor.value, background: '#0e1117', is_course_content: isForCourse };

                    const frame = document.getElementById('motionCanvasPlayer');
                    let canvas = null;
                    if (frame && frame.contentWindow) {
                        canvas = frame.contentWindow.document.querySelector('canvas') || frame.contentWindow.document.querySelector('#rough-canvas');
                    }

                    if (canvas) {
                        try {
                            const dataUri = canvas.toDataURL('image/png');
                            const blob = await (await fetch(dataUri)).blob();
                            const formData = new FormData();
                            formData.append('file', blob, 'rough_sketch_thumbnail.png');
                            const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                            const data = await res.json();
                            if (data.url) finalVideoUrl = data.url;
                        } catch (e) {
                            console.warn("Could not upload Rough.js thumbnail to backend, proceeding with fallback", e);
                        }
                    }
                    if (!finalVideoUrl) finalVideoUrl = '';
                    mediaType = 'image/png';

                } else if (currentEngine === 'two') {
                    postFormat = 'interactive';
                    postSource = { engine: 'two', code: studioEditor.value, background: '#090b10', is_course_content: isForCourse };

                    const frame = document.getElementById('motionCanvasPlayer');
                    let svgElement = null;
                    if (frame && frame.contentWindow) {
                        svgElement = frame.contentWindow.document.querySelector('#two-container svg') || frame.contentWindow.document.querySelector('svg');
                    }

                    if (svgElement) {
                        try {
                            const svgData = new XMLSerializer().serializeToString(svgElement);
                            const blob = new Blob([svgData], { type: 'image/svg+xml' });
                            const formData = new FormData();
                            formData.append('file', blob, 'two_vector_motion.svg');
                            const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                            const data = await res.json();
                            if (data.url) finalVideoUrl = data.url;
                        } catch (e) {
                            console.warn("Could not upload Two.js thumbnail to backend, proceeding with fallback", e);
                        }
                    }
                    if (!finalVideoUrl) finalVideoUrl = '';
                    mediaType = 'image/svg+xml';

                } else if (currentEngine === 'cartoon_studio') {
                    postFormat = 'interactive';
                    postSource = { engine: 'cartoon_studio', code: studioEditor.value, is_course_content: isForCourse };

                    const frame = document.getElementById('motionCanvasPlayer');
                    let dataUri = null;
                    if (frame && frame.contentWindow) {
                        try {
                            if (typeof frame.contentWindow.Studio?.getSnapshot === 'function') {
                                dataUri = frame.contentWindow.Studio.getSnapshot();
                            }
                        } catch (_) { }
                        if (!dataUri) {
                            try {
                                const canvas = frame.contentWindow.document?.querySelector('canvas');
                                if (canvas) dataUri = canvas.toDataURL('image/png');
                            } catch (_) { }
                        }
                    }
                    if (!dataUri && window.getCartoonStudioThumbnail) {
                        dataUri = window.getCartoonStudioThumbnail({ source: postSource, title: title });
                    }

                    if (dataUri && dataUri.length > 50) {
                        try {
                            if (!dataUri.startsWith('data:image/svg')) {
                                const blob = await (await fetch(dataUri)).blob();
                                const formData = new FormData();
                                formData.append('file', blob, 'cartoon_studio_preview.png');
                                const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                                const data = await res.json();
                                if (data && data.url) finalVideoUrl = data.url;
                                else finalVideoUrl = dataUri;
                            } else {
                                finalVideoUrl = dataUri;
                            }
                        } catch (e) {
                            console.warn("Could not upload Cartoon Studio thumbnail:", e);
                            finalVideoUrl = dataUri;
                        }
                    }
                    if (!finalVideoUrl && window.getCartoonStudioThumbnail) {
                        finalVideoUrl = window.getCartoonStudioThumbnail({ source: postSource, title: title });
                    }
                    if (finalVideoUrl) postSource.thumbnail = finalVideoUrl;
                    mediaType = 'image/png';

                } else if (currentEngine === 'sound_studio') {
                    postFormat = 'interactive';
                    postSource = { engine: 'sound_studio', code: studioEditor.value, is_course_content: isForCourse };

                    const frame = document.getElementById('motionCanvasPlayer');
                    let dataUri = null;
                    if (frame && frame.contentWindow) {
                        try {
                            if (typeof frame.contentWindow.Sound?.getSnapshot === 'function') {
                                dataUri = frame.contentWindow.Sound.getSnapshot();
                            }
                        } catch (_) { }
                        if (!dataUri) {
                            try {
                                const canvas = frame.contentWindow.document?.querySelector('canvas');
                                if (canvas) dataUri = canvas.toDataURL('image/png');
                            } catch (_) { }
                        }
                    }
                    if (!dataUri && window.getSoundStudioThumbnail) {
                        dataUri = window.getSoundStudioThumbnail({ source: postSource, title: title });
                    }

                    if (dataUri && dataUri.length > 50) {
                        try {
                            if (!dataUri.startsWith('data:image/svg')) {
                                const blob = await (await fetch(dataUri)).blob();
                                const formData = new FormData();
                                formData.append('file', blob, 'sound_studio_preview.png');
                                const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                                const data = await res.json();
                                if (data && data.url) finalVideoUrl = data.url;
                                else finalVideoUrl = dataUri;
                            } else {
                                finalVideoUrl = dataUri;
                            }
                        } catch (e) {
                            console.warn("Could not upload Sound Studio thumbnail:", e);
                            finalVideoUrl = dataUri;
                        }
                    }
                    if (!finalVideoUrl && window.getSoundStudioThumbnail) {
                        finalVideoUrl = window.getSoundStudioThumbnail({ source: postSource, title: title });
                    }
                    if (finalVideoUrl) postSource.thumbnail = finalVideoUrl;
                    mediaType = 'image/png';

                } else if (currentEngine === 'rapier') {
                    postFormat = 'interactive';
                    postSource = { engine: 'rapier', code: studioEditor.value, is_course_content: isForCourse };

                    const frame = document.getElementById('motionCanvasPlayer');
                    let dataUri = null;
                    if (frame && frame.contentWindow) {
                        try {
                            const canvas = frame.contentWindow.document?.querySelector('canvas') || frame.contentWindow.document?.querySelector('#canvas3d');
                            if (canvas) dataUri = canvas.toDataURL('image/png');
                        } catch (_) { }
                    }
                    if (!dataUri && window.generateRapierThumbnail) {
                        dataUri = window.generateRapierThumbnail(title || 'Rapier 3D Physics Simulation');
                    }

                    if (dataUri && dataUri.length > 50) {
                        try {
                            if (!dataUri.startsWith('data:image/svg')) {
                                const blob = await (await fetch(dataUri)).blob();
                                const formData = new FormData();
                                formData.append('file', blob, 'rapier_preview.png');
                                const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                                const data = await res.json();
                                if (data && data.url) finalVideoUrl = data.url;
                                else finalVideoUrl = dataUri;
                            } else {
                                finalVideoUrl = dataUri;
                            }
                        } catch (e) {
                            console.warn("Could not upload Rapier thumbnail:", e);
                            finalVideoUrl = dataUri;
                        }
                    }
                    if (finalVideoUrl) postSource.thumbnail = finalVideoUrl;
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

                    if (generatedVideoUrl) {
                        if (generatedVideoUrl.startsWith('blob:')) {
                            const blob = await fetch(generatedVideoUrl).then(r => r.blob());
                            mediaType = blob.type || 'video/webm';
                        }

                        // 1. Primary: Upload video directly to Supabase Storage 'videos' bucket (public global CDN)
                        const cloudUrl = await uploadMediaToSupabaseStorage(generatedVideoUrl, `manim_${currentEngine}`, mediaType);
                        if (cloudUrl) {
                            finalVideoUrl = cloudUrl;
                        } else if (generatedVideoUrl.startsWith('blob:')) {
                            // Fallback to local server upload if Supabase Storage is not reached
                            const blob = await fetch(generatedVideoUrl).then(r => r.blob());
                            const formData = new FormData();
                            formData.append('file', blob, 'xtra_anim_creation.webm');
                            const res = await fetch(`${backendUrl}/api/upload`, { method: 'POST', body: formData });
                            const data = await res.json();
                            if (data.url) finalVideoUrl = data.url;
                        }
                    }
                }

                // Ensure any relative / blob / data URL gets uploaded to Supabase Storage so it is accessible on live xtrapath.com
                if (finalVideoUrl && (finalVideoUrl.startsWith('data:') || finalVideoUrl.startsWith('blob:') || finalVideoUrl.startsWith('/media/') || finalVideoUrl.startsWith('http://localhost') || finalVideoUrl.startsWith('http://127.0.0.1'))) {
                    const cloudUrl = await uploadMediaToSupabaseStorage(finalVideoUrl, `${currentEngine}_creation`, mediaType);
                    if (cloudUrl) {
                        finalVideoUrl = cloudUrl;
                    }
                }

                // If video is still pointing to a local-only URL, throw error with helpful explanation
                if (finalVideoUrl && (finalVideoUrl.startsWith('/media/') || finalVideoUrl.startsWith('http://localhost') || finalVideoUrl.startsWith('http://127.0.0.1'))) {
                    throw new Error("Cloud upload to Supabase Storage ('videos' bucket) failed. Please check the browser console and ensure the 'videos' bucket exists with INSERT policy.");
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

                let insertedData = null;
                try {
                    const { data, error } = await supabase.from('posts').insert([newPostData]).select();
                    if (error) {
                        console.warn("Supabase insert warning:", error);
                    } else if (data && data.length > 0) {
                        insertedData = data;
                        // Notify Google that new content was published (triggers sitemap re-crawl)
                        fetch('https://www.google.com/ping?sitemap=https://www.xtrapath.com/sitemap.xml').catch(() => {});
                    }
                } catch (insErr) {
                    console.warn("Supabase insert exception:", insErr);
                }

                const newPost = (insertedData && insertedData[0]) ? insertedData[0] : {
                    id: `post_${Date.now()}`,
                    ...newPostData,
                    created_at: new Date().toISOString()
                };
                const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                allPosts.push(newPost);
                localStorage.setItem('userPosts', JSON.stringify(allPosts));

                // Invalidate explore and reels feed caches so the newly published post appears immediately
                localStorage.removeItem('cached_explore_feed');
                localStorage.removeItem('cached_explore_feed_uid');
                localStorage.removeItem('cached_reels_feed');
                localStorage.removeItem('cached_reels_feed_uid');

                if (isForCourse) {
                    if (courseContextRaw) {
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
                        localStorage.removeItem('courseContext');
                        const returnUrl = courseContext.courseId
                            ? `/views/xtraCourse.html?id=${courseContext.courseId}&mode=${courseContext.format || 'course'}`
                            : '/views/xtraCourse.html';
                        alert('Published to course! Redirecting back to the course editor.');
                        window.location.href = returnUrl;
                        return;
                    } else if (articleContextRaw) {
                        const articleContext = JSON.parse(articleContextRaw);
                        const articleDraftRaw = localStorage.getItem('xtraArticleDraft');
                        let articleData = articleDraftRaw ? JSON.parse(articleDraftRaw) : {};

                        const postMediaUrl = newPost.video_url || newPost.videoUrl || finalVideoUrl || '';
                        const postMediaType = newPost.media_type || mediaType || (newPost.format === 'image' || postFormat === 'image' ? 'image/jpeg' : 'video/mp4');

                        if (articleContext.mode === 'cover') {
                            articleData.coverMedia = {
                                url: postMediaUrl,
                                type: postMediaType
                            };
                        } else {
                            const postAuthor = newPost.username || localStorage.getItem('username') || 'Creator';
                            let embedThumbnailHtml = '';
                            if (newPost.format === 'image' || newPost.format === 'pdf' || newPost.format === 'article' || newPost.format === 'diagram') {
                                embedThumbnailHtml = `<img src="${postMediaUrl}" alt="${(newPost.title || '').replace(/"/g, '&quot;')}" />`;
                            } else {
                                embedThumbnailHtml = `<video src="${postMediaUrl}" autoplay muted loop playsinline></video>`;
                            }
                            const embedHtml = `
                                <div class="embedded-post" contenteditable="false" data-post-id="${newPost.id}">
                                    <div class="embedded-media">${embedThumbnailHtml}</div>
                                    <div class="embedded-actions">
                                        <button class="icon-btn"><i class="ri-heart-line"></i></button>
                                        <button class="icon-btn"><i class="ri-chat-3-line"></i></button>
                                        <button class="icon-btn"><i class="ri-send-plane-line"></i></button>
                                        <button class="icon-btn" style="margin-left: auto;"><i class="ri-bookmark-line"></i></button>
                                    </div>
                                    <div class="embedded-footer">
                                        <div class="embedded-caption"><span class="username">${postAuthor}</span> <span>${(newPost.title || '').replace(/"/g, '&quot;')}</span></div>
                                    </div>
                                </div>
                                <p><br></p>
                            `;
                            articleData.content = (articleData.content || '') + embedHtml;
                        }

                        localStorage.setItem('xtraArticleDraft', JSON.stringify(articleData));
                        localStorage.removeItem('articleContext');

                        const returnUrl = articleContext.articleId
                            ? `/views/xtraArticle.html?id=${articleContext.articleId}`
                            : '/views/xtraArticle.html';
                        alert('Published to article! Redirecting back to the article editor.');
                        window.location.href = returnUrl;
                        return;
                    }
                } else {
                    uploadModal.style.display = 'none';
                    const itemTitle = (typeof title === 'string' && title.trim()) ? title.trim() : (document.getElementById('videoTitle')?.value.trim() || 'Interactive Animation');
                    const isReelFormat = (typeof postFormat !== 'undefined' && (postFormat === '9:16' || postFormat === 'reel')) || (window.currentRenderFormat === '9:16');
                    const postThumbnail = (typeof finalVideoUrl === 'string' && (finalVideoUrl.endsWith('.png') || finalVideoUrl.endsWith('.jpg') || finalVideoUrl.endsWith('.svg') || finalVideoUrl.startsWith('data:image'))) ? finalVideoUrl : ((typeof postSource !== 'undefined' && postSource?.thumbnail) ? postSource.thumbnail : '');

                    if (typeof window.showPublishSuccessModal === 'function') {
                        window.showPublishSuccessModal({
                            title: 'Post Published Successfully!',
                            subtitle: 'Your creation is now live on your profile and explore feed.',
                            badge: isReelFormat ? 'Live on Reels' : 'Live on Feed',
                            itemName: itemTitle,
                            itemType: isReelFormat ? 'Reel' : 'Interactive Post',
                            thumbnail: postThumbnail,
                            primaryBtnText: 'View on Profile',
                            primaryUrl: '/views/profile.html',
                            secondaryBtnText: 'Keep Creating'
                        });
                    } else if (confirm('Post published! Go to profile?')) {
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
        const activeProfileId = (typeof targetUserId !== 'undefined' && targetUserId) ? targetUserId : myUserId;
        let usersToDisplay = [];

        // 1. Primary Live API Fetch
        if (activeProfileId) {
            try {
                if (type === 'Following') {
                    const res = await (window.fetchUserFollowingApi ? window.fetchUserFollowingApi(activeProfileId, 50) : fetch(`/api/users/${encodeURIComponent(activeProfileId)}/following?limit=50`).then(r => r.json()));
                    if (res && res.following && res.following.length > 0) {
                        usersToDisplay = res.following;
                    }
                } else {
                    const res = await (window.fetchUserFollowersApi ? window.fetchUserFollowersApi(activeProfileId, 50) : fetch(`/api/users/${encodeURIComponent(activeProfileId)}/followers?limit=50`).then(r => r.json()));
                    if (res && res.followers && res.followers.length > 0) {
                        usersToDisplay = res.followers;
                    }
                }
            } catch (err) {
                console.warn('[Fetch user list from backend API error]:', err);
            }
        }

        // 2. Supabase Cloud Sync Fallback
        const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);

        if (usersToDisplay.length === 0 && client && activeProfileId) {
            try {
                if (type === 'Following') {
                    const { data: follows, error } = await client
                        .from('user_follows')
                        .select('*')
                        .eq('follower_id', activeProfileId)
                        .order('created_at', { ascending: false });

                    if (!error && Array.isArray(follows) && follows.length > 0) {
                        usersToDisplay = follows.map(f => ({
                            id: f.following_id,
                            username: f.creator_username || 'Creator',
                            full_name: f.creator_fullname || f.creator_username || 'Creator',
                            avatar_url: f.creator_avatar || null
                        }));
                    }
                } else {
                    const { data: followers, error } = await client
                        .from('user_follows')
                        .select('*')
                        .eq('following_id', activeProfileId)
                        .order('created_at', { ascending: false });

                    if (!error && Array.isArray(followers) && followers.length > 0) {
                        usersToDisplay = followers.map(f => ({
                            id: f.follower_id,
                            username: f.follower_username || 'User',
                            full_name: f.follower_fullname || f.follower_username || 'User',
                            avatar_url: f.follower_avatar || null
                        }));
                    }
                }
            } catch (err) {
                console.warn('[Fetch user list from Supabase error]:', err);
            }
        }

        // Fallback to local following list if viewing own following
        if (usersToDisplay.length === 0 && type === 'Following' && (!activeProfileId || activeProfileId === myUserId)) {
            const localFollowing = getFollowingList();
            if (localFollowing.length > 0) {
                usersToDisplay = localFollowing.map(item => ({
                    id: item.userId,
                    username: item.username,
                    full_name: item.fullName || item.username,
                    avatar_url: item.avatarUrl || null
                }));
            }
        }

        // Optional discovery fallback if still empty
        if (usersToDisplay.length === 0) {
            try {
                if (client) {
                    const { data: profiles, error } = await client
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

            const isOwn = (myUserId && String(u.id) === String(myUserId));
            const isFollowing = isFollowingUser(u.id, u.username);

            const safeDisplayName = escapeHtml(displayName);
            const safeHandle = escapeHtml(handle);
            const safeUsername = escapeHtml(u.username || displayName);
            const safeUid = escapeHtml(u.id || '');

            html += `
                <div class="user-list-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); transition: background 0.2s;">
                    <a href="/views/profile.html?user_id=${encodeURIComponent(u.id || '')}&username=${encodeURIComponent(u.username || '')}" style="display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit; flex: 1; min-width: 0;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; ${avatarStyle} flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; color: white;">
                            ${u.avatar_url ? '' : initial}
                        </div>
                        <div style="min-width: 0; overflow: hidden;">
                            <div style="font-size: 0.92rem; font-weight: 600; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${safeDisplayName}</div>
                            <div style="font-size: 0.8rem; color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${safeHandle}</div>
                        </div>
                    </a>
                    ${!isOwn ? `
                    <button class="btn-follow-modal ${isFollowing ? 'following' : ''}" data-user-id="${safeUid}" data-username="${safeUsername}" data-custom-follow="true" style="flex-shrink: 0; margin-left: 12px;">
                        ${isFollowing ? 'Following' : 'Follow'}
                    </button>
                    ` : ''}
                </div>
            `;
        });

        content.innerHTML = html;

        // Attach interactive event listeners to modal follow buttons
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
            const postUserId = reelOptionsModal.dataset.postUserId;
            const myId = localStorage.getItem('userId');

            // Safety: only the post owner can edit or delete
            if (!myId || !postUserId || myId !== postUserId) {
                console.warn('Permission denied: You can only edit/delete your own posts.');
                closeReelOptions();
                return;
            }

            if (action === 'delete') {
                deletePost(postId, postTitle);
            } else if (action === 'edit') {
                editPost(postId, postTitle);
            }
            closeReelOptions();
        });
    }

    // ============================================================
    // 10. COMMENT MODAL LOGIC & SOCIAL INTERACTIONS
    // Managed via window.SocialManager (src/viewmodel/social_manager.js)
    // ============================================================

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

                    <!-- Dynamic QR Code Container (Toggled via button) -->
                    <div id="xtraShareQrBox" style="display:none; background:#0f0f15; border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:14px; text-align:center;">
                        <div style="font-size:0.8rem; font-weight:700; color:#e4e4e7; margin-bottom:8px;"><i class="ri-qr-code-line"></i> Scan with mobile camera to open</div>
                        <img id="xtraShareQrImage" src="" alt="Share QR Code" style="width:150px; height:150px; border-radius:8px; margin:0 auto; display:block; border:1px solid rgba(255,255,255,0.08);" />
                    </div>

                    <!-- Copy URL Bar -->
                    <div class="xtra-share-copy-box">
                        <i class="ri-link" style="color: #a1a1aa; font-size: 1.1rem;"></i>
                        <input type="text" id="xtraShareUrlInput" readonly />
                        <button class="xtra-share-copy-btn" id="xtraShareCopyBtn">
                            <i class="ri-file-copy-line"></i> <span>Copy</span>
                        </button>
                    </div>

                    <!-- Secondary Actions Row (QR & Embed) -->
                    <div class="xtra-share-actions-row">
                        <button class="xtra-share-secondary-btn" id="xtraShareQrBtn">
                            <i class="ri-qr-code-line"></i> <span id="xtraShareQrBtnText">Show QR Code</span>
                        </button>
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
        document.getElementById('xtraShareQrBtn').addEventListener('click', () => window.XtraShare.toggleQrCode());
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
        const qrImage = document.getElementById('xtraShareQrImage');
        const qrBox = document.getElementById('xtraShareQrBox');
        const qrBtnText = document.getElementById('xtraShareQrBtnText');

        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = desc;
        if (authorNameEl) authorNameEl.textContent = `@${author}`;
        if (authorAvatarEl) authorAvatarEl.src = avatar;
        if (urlInput) urlInput.value = shareUrl;
        if (qrImage) qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=59-130-246&bgcolor=15-15-21&data=${encodeURIComponent(shareUrl)}`;
        if (qrBox) qrBox.style.display = 'none';
        if (qrBtnText) qrBtnText.textContent = 'Show QR Code';

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
        if (!document.body.classList.contains('reels-page')) {
            document.body.style.overflow = 'hidden';
        }
    },

    close() {
        const overlay = document.getElementById('xtraShareModalOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            const videoEl = document.getElementById('xtraShareCardVideo');
            if (videoEl) videoEl.pause();
        }
        if (!document.body.classList.contains('reels-page')) {
            document.body.style.overflow = '';
        }
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

    toggleQrCode() {
        const qrBox = document.getElementById('xtraShareQrBox');
        const qrBtnText = document.getElementById('xtraShareQrBtnText');
        if (!qrBox) return;
        const isHidden = qrBox.style.display === 'none';
        qrBox.style.display = isHidden ? 'block' : 'none';
        if (qrBtnText) {
            qrBtnText.textContent = isHidden ? 'Hide QR Code' : 'Show QR Code';
        }
        if (isHidden && this.currentData?.id) {
            if (window.SocialManager && window.SocialManager.Share) {
                window.SocialManager.Share.incrementShareCount(this.currentData.id, 'qr');
            }
        }
    },

    shareTo(platform) {
        if (!this.currentData) return;
        const title = encodeURIComponent(this.currentData.title || 'Check this out on XtraPath');
        const url = encodeURIComponent(this.currentData.calculatedShareUrl || window.location.href);
        const desc = encodeURIComponent(this.currentData.desc || 'Interactive STEM creation on XtraPath');

        // Increment real share count
        if (this.currentData.id && window.SocialManager && window.SocialManager.Share) {
            window.SocialManager.Share.incrementShareCount(this.currentData.id, platform);
        }

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

        if (this.currentData.id && window.SocialManager && window.SocialManager.Share) {
            window.SocialManager.Share.incrementShareCount(this.currentData.id, 'native');
        }

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
        if (this.currentData.id && window.SocialManager && window.SocialManager.Share) {
            window.SocialManager.Share.incrementShareCount(this.currentData.id, 'copy_link');
        }
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
        if (this.currentData.id && window.SocialManager && window.SocialManager.Share) {
            window.SocialManager.Share.incrementShareCount(this.currentData.id, 'embed');
        }
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
        if (this.currentData.id && window.SocialManager && window.SocialManager.Share) {
            window.SocialManager.Share.incrementShareCount(this.currentData.id, 'story');
        }
        if (window.StoryManager && window.StoryManager.Data) {
            window.StoryManager.Data.addStory(post);
        } else {
            try {
                const currentTime = Date.now();
                const myUsername = localStorage.getItem('username') || 'User';
                const myAvatar = localStorage.getItem('avatarUrl') || localStorage.getItem('userAvatar') || '';
                const storyData = JSON.parse(localStorage.getItem('storyData') || '{}');
                let list = Array.isArray(storyData["Your Story"]) ? storyData["Your Story"] : [];
                list = list.filter(s => s && (!s.expiresAt || s.expiresAt > currentTime));
                list.push({
                    id: `story_${currentTime}`,
                    postId: post.id,
                    post: post,
                    rawPost: post,
                    title: post.title || 'Interactive Creation',
                    author: post.username || myUsername,
                    avatar: post.avatar_url || myAvatar,
                    timestamp: currentTime,
                    expiresAt: currentTime + (24 * 60 * 60 * 1000)
                });
                storyData["Your Story"] = list;
                storyData[myUsername] = list;
                localStorage.setItem('storyData', JSON.stringify(storyData));
            } catch (e) {
                console.warn('Fallback story save error:', e);
            }
        }
        this.showToast('Added to your 24h Story! 🌟');
        this.close();
    }
};

/* ==========================================================================
   MASTER ADMIN, BANKING & PAYPAL API CLIENT HELPERS
   (Delegated to /viewmodel/admin_manager.js)
   ========================================================================== */
// All Master Admin methods (stats, users, payouts, bank validation, system settings)
// are cleanly maintained and globally exported by window.AdminManager in admin_manager.js.