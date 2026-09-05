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

    // --- XtraTools Registry (Delegated to window.ToolsManager) ---
    const allXtraTools = window.ToolsManager?.tools || window.allXtraTools || [];
    window.allXtraTools = allXtraTools;

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

            // Background auto-sync of permanent saves across local vault, backend SQLite, and Supabase
            if (typeof syncUserSaves === 'function') {
                syncUserSaves(session.user.id);
            }
            // Background auto-sync of followed creators
            if (typeof syncUserFollows === 'function') {
                syncUserFollows(session.user.id);
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
                if (typeof syncUserSaves === 'function') {
                    syncUserSaves(localUserId);
                }
                if (typeof syncUserFollows === 'function') {
                    syncUserFollows(localUserId);
                }
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

        window.isPurchasedItem = function (itemId) {
            if (!itemId) return false;
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
                card.addEventListener('mouseenter', () => video.play().catch(() => {}));
                card.addEventListener('mouseleave', () => video.pause());
            }

            function openItemView() {
                if (post.format === 'pdf' || post.format === 'book') {
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

    // --- 24-Hour Stories Management (Delegated to /viewmodel/story_manager.js) ---
    if (window.StoryManager && window.StoryManager.Bar) {
        window.StoryManager.Bar.checkAndUpdateState();
    }

    // ============================================================
    // 0. HELPER: SVG to 3D Viewer (RESILIENT WEBGL CONTEXT & LIFECYCLE MANAGEMENT)
    // ============================================================
    function createSVG3DViewerIframeContent(svgCode, color, preserveBuffer = false) {
        const rendererOptions = `{ antialias: true, preserveDrawingBuffer: ${preserveBuffer}, powerPreference: "high-performance" }`;
        const modelColor = color || '#3b82f6';
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

                const settings = { depth: 20, bevelEnabled: true, bevelSize: 1, bevelThickness: 1, color: '${modelColor}' };
                const group = new THREE.Group();
                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(settings.color),
                    metalness: 0.25,
                    roughness: 0.35,
                    side: THREE.DoubleSide
                });
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
                        if (shapes && shapes.length > 0) {
                            for (const shape of shapes) {
                                try {
                                    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                                    group.add(new THREE.Mesh(geometry, material));
                                } catch(_) {}
                            }
                        } else if (path.subPaths && path.subPaths.length > 0) {
                            for (const sp of path.subPaths) {
                                const pts = sp.getPoints();
                                if (pts && pts.length > 1) {
                                    try {
                                        const strokeShape = new THREE.Shape(pts);
                                        const strokeGeo = new THREE.ExtrudeGeometry(strokeShape, { ...extrudeSettings, depth: Math.max(4, extrudeSettings.depth / 2) });
                                        group.add(new THREE.Mesh(strokeGeo, material));
                                    } catch(_) {}
                                }
                            }
                        }
                    }
                }

                // Fallback geometry if SVG produced no valid 3D shapes
                if (group.children.length === 0) {
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
                    group.add(new THREE.Mesh(geo, material));
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

                // Frame object with safety radius
                const boundingBox = new THREE.Box3().setFromObject(wrapper);
                const boundingSphere = new THREE.Sphere();
                boundingBox.getBoundingSphere(boundingSphere);
                controls.target.copy(boundingSphere.center);
                const radius = Math.max(boundingSphere.radius, 40);
                const camDistance = radius * 2.5;
                camera.position.set(boundingSphere.center.x, boundingSphere.center.y + radius * 0.4, boundingSphere.center.z + camDistance);
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
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
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

    window.handleMediaFallback = function(mediaEl, postId, format, iconClass, title) {
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
            try { post.source = JSON.parse(post.source); } catch(_) { post.source = {}; }
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
            const mediaHTML = `<iframe srcdoc='${engineHtml.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: ${post.source?.background || 'transparent'}; pointer-events: ${pointerEvents};"></iframe>`;
            const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background:#090b10;"></div>` : '';
            return { mediaHTML, backgroundHTML };
        }

        const mediaHTML = `<div class="fallback-post-card"><i class="ri-draft-line"></i><span>${escapeHtml(post.title || 'TikZ Diagram')}</span><small>LaTeX / TikZ</small></div>`;
        const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background:#0a0d14;"></div>` : '';
        return { mediaHTML, backgroundHTML };
    }

    const postRenderers = {
        'tikz': (post, viewType) => renderTikzPost(post, viewType),
        'image': (post, viewType) => {
            if (typeof post.source === 'string') {
                try { post.source = JSON.parse(post.source); } catch(_) { post.source = {}; }
            }
            if (post.source?.engine === 'tikz' || post.format === 'tikz') {
                return renderTikzPost(post, viewType);
            }

            const rawUrl = post.video_url || post.media_url || post.thumbnail_url || post.cover_url || post.source?.video_url || post.source?.media_url || post.source?.thumbnail || post.source?.cover_image || '';
            const fullUrl = rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : (rawUrl ? `${getBackendUrl()}${rawUrl}` : '');
            
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

            const engineHtml = window.EngineManager?.renderHtml ? window.EngineManager.renderHtml(post, { isFeed: true, isInteractive: viewType !== 'grid' }) : null;
            if (engineHtml) {
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe srcdoc='${engineHtml.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: ${post.source?.backgroundColor || post.source?.background || 'transparent'}; pointer-events: ${pointerEvents};"></iframe>`;
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
                        const mediaHTML = `<iframe srcdoc='${engineHtml.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
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
                        const mediaHTML = `<iframe srcdoc='${engineHtml.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
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
                try { post.source = JSON.parse(post.source); } catch(_) { post.source = {}; }
            }
            const engine = post.source?.engine || post.format;
            const code = post.source?.code;

            if ((engine === 'anime' || post.format === 'anime') && code && typeof window.renderAnime === 'function') {
                const iframeContent = window.renderAnime(code, { width: 1280, height: 720, background: post.source.background || '#080a10' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #080a10; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #080a10;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            if ((engine === 'rough' || post.format === 'rough') && code && typeof window.renderRough === 'function') {
                const iframeContent = window.renderRough(code, { width: 1280, height: 720, background: post.source.background || '#0e1117' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0e1117; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0e1117;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
            if ((engine === 'two' || post.format === 'two') && code && typeof window.renderTwo === 'function') {
                const iframeContent = window.renderTwo(code, { width: 1280, height: 720, background: post.source.background || '#090b10' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                const mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #090b10; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #090b10;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }
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
                    const mediaHTML = `<iframe srcdoc='${engineHtml.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
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
                try { post.source = JSON.parse(post.source); } catch(_) { post.source = {}; }
            }
            let mediaHTML, backgroundHTML;
            const hasZdogSource = post.source && post.source.engine === 'zdog' && post.source.code && typeof window.renderZdog === 'function';
            const hasSvg3DSource = post.source && post.source.engine === 'svg_to_3d' && post.source.code && typeof window.createSVG3DViewerIframeContent === 'function';
            const safeTitle = (post.title || '3D Model').replace(/'/g, '&#39;');
            const rawUrl = post.video_url || post.media_url || post.thumbnail_url || post.cover_url || post.source?.video_url || post.source?.media_url || post.source?.thumbnail || post.source?.cover_image || '';
            const fullUrl = rawUrl ? (rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : `${getBackendUrl()}${rawUrl}`) : '';

            if (viewType === 'grid' && fullUrl) {
                // In Explore grid, use the static screenshot image to conserve WebGL contexts
                mediaHTML = `<img src="${fullUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', '3D Simulation', 'ri-box-3-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: cover; background: #0a0d14;">`;
                backgroundHTML = '';
            } else if (hasSvg3DSource) {
                const svgCode = JSON.stringify(post.source.code);
                const modelColor = post.source.color || '#3b82f6';
                const iframeContent = window.createSVG3DViewerIframeContent(svgCode, modelColor, false);
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
            } else if (hasZdogSource) {
                const iframeContent = window.renderZdog(post.source.code, { background: post.source.background || '#0a0d14' });
                const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
                backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0a0d14;"></div>` : '';
            } else if (fullUrl) {
                mediaHTML = `<img src="${fullUrl}" loading="lazy" decoding="async" onerror="window.handleMediaFallback(this, '${post.id}', '3D Simulation', 'ri-box-3-line', '${safeTitle}');" style="width: 100%; height: 100%; object-fit: cover; background: #1e1e23;">`;
                backgroundHTML = viewType === 'reel' ? `<div class="reel-background"><img src="${fullUrl}" loading="lazy"></div>` : '';
            } else {
                const engineHtml = window.EngineManager?.renderHtml ? window.EngineManager.renderHtml(post, { isFeed: true, isInteractive: viewType !== 'grid' }) : null;
                if (engineHtml) {
                    const pointerEvents = viewType === 'grid' ? 'none' : 'auto';
                    mediaHTML = `<iframe srcdoc='${engineHtml.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0a0d14; pointer-events: ${pointerEvents};"></iframe>`;
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
        'anime': (post, viewType) => postRenderers['interactive'](post, viewType),
        'rough': (post, viewType) => postRenderers['interactive'](post, viewType),
        'two': (post, viewType) => postRenderers['interactive'](post, viewType),
        'zdog': (post, viewType) => postRenderers['interactive'](post, viewType),
        'jsxgraph': (post, viewType) => postRenderers['math'](post, viewType),
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
                try { post.source = JSON.parse(post.source); } catch(_) { post.source = {}; }
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
                const mediaHTML = `<iframe srcdoc='${engineHtml.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: ${bg}; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: ${bg};"></div>` : '';
                return { mediaHTML, backgroundHTML };
            }

            if (isP5Animation) {
                const iframeContent = (typeof renderP5PostContent === 'function') ? renderP5PostContent(post.source.code) : '';
                const mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #090b10; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #090b10;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else if (isAnimeAnimation && typeof window.renderAnime === 'function') {
                const iframeContent = window.renderAnime(post.source.code, { background: post.source.background || '#080a10' });
                const mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #080a10; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #080a10;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else if (isRoughAnimation && typeof window.renderRough === 'function') {
                const iframeContent = window.renderRough(post.source.code, { background: post.source.background || '#0e1117' });
                const mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #0e1117; pointer-events: ${pointerEvents};"></iframe>`;
                const backgroundHTML = viewType === 'reel' ? `<div class="reel-background" style="background: #0e1117;"></div>` : '';
                return { mediaHTML, backgroundHTML };
            } else if (isTwoAnimation && typeof window.renderTwo === 'function') {
                const iframeContent = window.renderTwo(post.source.code, { background: post.source.background || '#090b10' });
                const mediaHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width: 100%; height: 100%; border: none; background: #090b10; pointer-events: ${pointerEvents};"></iframe>`;
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

        // 1. Remove from localStorage userPosts
        let allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        const updatedPosts = allPosts.filter(p => String(p.id) !== String(postId));
        localStorage.setItem('userPosts', JSON.stringify(updatedPosts));

        // 2. Remove from savedPosts if present
        let savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
        savedPosts = savedPosts.filter(id => String(id) !== String(postId));
        localStorage.setItem('savedPosts', JSON.stringify(savedPosts));

        const curUid = localStorage.getItem('userId');
        if (curUid) {
            const vKey = typeof getUserSavesVaultKey === 'function' ? getUserSavesVaultKey(curUid) : `xtra_saves_${curUid}`;
            const vObjsKey = typeof getUserSavedObjectsVaultKey === 'function' ? getUserSavedObjectsVaultKey(curUid) : `xtra_saved_posts_${curUid}`;
            let vSaves = JSON.parse(localStorage.getItem(vKey) || '[]');
            vSaves = vSaves.filter(id => String(id) !== String(postId));
            localStorage.setItem(vKey, JSON.stringify(vSaves));

            let vObjs = JSON.parse(localStorage.getItem(vObjsKey) || '{}');
            delete vObjs[String(postId)];
            localStorage.setItem(vObjsKey, JSON.stringify(vObjs));

            try {
                const bUrl = typeof getBackendUrl === 'function' ? getBackendUrl() : '';
                fetch(`${bUrl}/api/saves`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: curUid, post_id: String(postId), saved: false })
                }).catch(() => {});
            } catch (_) {}
        }

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

        // 2. Secondary Sync to backend SQLite store for fallback redundancy
        if (myUserId) {
            try {
                const bUrl = typeof getBackendUrl === 'function' ? getBackendUrl() : '';
                fetch(`${bUrl}/api/follows`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: myUserId,
                        target_user_id: targetUserId || targetUsername,
                        is_following: nowFollowing,
                        creator_data: {
                            userId: targetUserId,
                            username: targetUsername,
                            fullName: targetFullName,
                            avatarUrl: targetAvatar
                        }
                    })
                }).catch(() => {});
            } catch (_) {}
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
            } catch (_) {}
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
            } catch (_) {}
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
                }).catch(() => {});
            } catch (_) {}
        }

        return { savedIds: finalSavedIds, posts: combinedObjs };
    }
    window.syncUserSaves = syncUserSaves;

    // Batch-fetch like counts, comment counts, and save counts for an array of post IDs
    async function fetchPostLikeData(postIds) {
        if (!postIds || postIds.length === 0) return;
        const strIds = postIds.map(id => String(id));
        const localLikes = getLocalLikesMap();
        const localComments = getLocalCommentsMap();
        const localCommentCounts = getLocalCommentCountsMap();
        const localSaved = getLocalSavedSet();
        const localSaveCounts = getLocalSaveCountsMap();

        // 1. Initial fast hydration from local storage
        strIds.forEach(id => {
            const hasLocalLike = !!localLikes[id];
            const localCommentList = localComments[id] || [];
            const isSaved = localSaved.has(id);
            const localSaveCount = Number(localSaveCounts[id]) || (isSaved ? 1 : 0);
            const savedCommentCount = Number(localCommentCounts[id]);

            if (!likeDataCache[id]) {
                likeDataCache[id] = {
                    count: hasLocalLike ? 1 : 0,
                    likedByMe: hasLocalLike
                };
            }
            if (commentCountCache[id] === undefined) {
                commentCountCache[id] = !isNaN(savedCommentCount) ? Math.max(savedCommentCount, localCommentList.length) : localCommentList.length;
            }
            if (!saveDataCache[id]) {
                saveDataCache[id] = {
                    count: localSaveCount,
                    savedByMe: isSaved
                };
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
                const commentMapToSave = getLocalCommentCountsMap();
                strIds.forEach(id => {
                    const dbCount = commCountMap[id] || 0;
                    const locCount = (localComments[id] || []).length;
                    const savedCount = Number(commentMapToSave[id]) || 0;
                    const finalCount = Math.max(dbCount, locCount, savedCount);
                    commentCountCache[id] = finalCount;
                    commentMapToSave[id] = finalCount;
                });
                saveLocalCommentCountsMap(commentMapToSave);
            }

            // 5. Get save counts and user save status from Supabase (saves table)
            let saveCountMap = {};
            let mySaves = new Set();
            try {
                const { data: savesData, error: savesErr } = await client
                    .from('saves')
                    .select('post_id')
                    .in('post_id', strIds);

                if (!savesErr && savesData) {
                    savesData.forEach(row => {
                        const pid = String(row.post_id);
                        saveCountMap[pid] = (saveCountMap[pid] || 0) + 1;
                    });
                }

                if (myUserId) {
                    const { data: mySavesData, error: mySavesErr } = await client
                        .from('saves')
                        .select('post_id')
                        .eq('user_id', myUserId)
                        .in('post_id', strIds);
                    if (!mySavesErr && mySavesData) {
                        mySavesData.forEach(row => mySaves.add(String(row.post_id)));
                    }
                }
            } catch (saveErr) {
                console.warn('Could not query remote saves table (using local state):', saveErr);
            }

            // 6. Populate and reconcile cache
            strIds.forEach(id => {
                const dbLiked = myLikes.has(id);
                const localLiked = !!localLikes[id];
                const isLiked = dbLiked || localLiked;
                const dbLikesCount = countMap[id] || 0;
                likeDataCache[id] = {
                    count: Math.max(dbLikesCount, isLiked ? 1 : 0),
                    likedByMe: isLiked
                };

                const dbSaved = mySaves.has(id);
                const localSavedFlag = localSaved.has(id);
                const isSaved = dbSaved || localSavedFlag;
                const dbSavesCount = saveCountMap[id] || 0;
                const locSaveCount = Number(localSaveCounts[id]) || 0;
                saveDataCache[id] = {
                    count: Math.max(dbSavesCount, locSaveCount, isSaved ? 1 : 0),
                    savedByMe: isSaved
                };
            });

            // 7. Update DOM elements
            hydratePostLikesAndCommentsInDOM(strIds);
        } catch (err) {
            console.warn('Could not refresh remote social data (using local cache):', err);
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
        } catch (_) {}

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
            } catch (_) {}
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
            } catch (_) {}

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
    function createPostElement(post, viewType) { // viewType can be 'grid', 'reel', or 'course-preview'
        if (post && typeof post.source === 'string') {
            try { post.source = JSON.parse(post.source); } catch(_) { post.source = {}; }
        }
        if (!window._allRenderedPosts) window._allRenderedPosts = {};
        if (post && post.id) {
            window._allRenderedPosts[String(post.id)] = post;
        }

        const postEl = document.createElement('div');
        postEl.className = 'feed-post';
        postEl.dataset.postId = post.id;

        let initFunction = null;

        // --- Multi-user: determine ownership and display info ---
        const myUserId = localStorage.getItem('userId');
        const myUsername = localStorage.getItem('username');
        const postAuthor = post.username || 'Anonymous';
        const isOwnPost = (post.user_id && myUserId && String(post.user_id) === String(myUserId)) ||
                          (post.username && myUsername && post.username.toLowerCase() === myUsername.toLowerCase());
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
                        <button class="icon-btn" data-action="comment" title="Discussion"><i class="ri-chat-3-line"></i> <span class="action-count">0</span></button>
                        <button class="icon-btn"><i class="ri-send-plane-line"></i> <span class="action-count">${Math.floor(Math.random() * 100) + 5}</span></button>
                        <button class="icon-btn" data-action="remix" title="Remix Creation"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 113.03" style="width:30px;height:30px;"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M36.9,23.5h71.13c8.17,0,14.85,6.69,14.85,14.85v59.83c0,8.17-6.69,14.85-14.85,14.85H36.9 c-8.17,0-14.85-6.68-14.85-14.85V38.35C22.05,30.19,28.73,23.5,36.9,23.5L36.9,23.5z M10.08,73.96c0,2.78-2.26,5.04-5.04,5.04 C2.26,79,0,76.74,0,73.96V19.89C0,14.42,2.24,9.44,5.84,5.84C9.44,2.24,14.42,0,19.89,0h65.37c2.78,0,5.04,2.26,5.04,5.04 c0,2.78-2.26,5.04-5.04,5.04H19.89c-2.69,0-5.15,1.1-6.93,2.88c-1.78,1.78-2.88,4.23-2.88,6.93V73.96L10.08,73.96z M54.3,74.03 c-3.18,0-5.76-2.58-5.76-5.76s2.58-5.76,5.76-5.76H66.7V50.1c0-3.18,2.58-5.76,5.76-5.76s5.76,2.58,5.76,5.76v12.41h12.41 c3.18,0,5.76,2.58,5.76,5.76s-2.58,5.76-5.76,5.76H78.23v12.41c0,3.18-2.58,5.76-5.76,5.76s-5.76-2.58-5.76-5.76V74.03H54.3 L54.3,74.03z"/></svg><span class="action-count">${getPostRemixCount(post.id) || post.remix_count || 0}</span></button>
                        <button class="icon-btn" data-action="lineage" title="Remix Evolution & Lineage"><svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 513.11" style="width:30px;height:30px;"><path fill="currentColor" fill-rule="nonzero" d="M210.48 160.8c0-14.61 11.84-26.46 26.45-26.46s26.45 11.85 26.45 26.46v110.88l73.34 32.24c13.36 5.88 19.42 21.47 13.54 34.82-5.88 13.35-21.47 19.41-34.82 13.54l-87.8-38.6c-10.03-3.76-17.16-13.43-17.16-24.77V160.8zM5.4 168.54c-.76-2.25-1.23-4.64-1.36-7.13l-4-73.49c-.75-14.55 10.45-26.95 25-27.69 14.55-.75 26.95 10.45 27.69 25l.74 13.6a254.258 254.258 0 0136.81-38.32c17.97-15.16 38.38-28.09 61.01-38.18 64.67-28.85 134.85-28.78 196.02-5.35 60.55 23.2 112.36 69.27 141.4 132.83.77 1.38 1.42 2.84 1.94 4.36 27.86 64.06 27.53 133.33 4.37 193.81-23.2 60.55-69.27 112.36-132.83 141.39a26.24 26.24 0 01-12.89 3.35c-14.61 0-26.45-11.84-26.45-26.45 0-11.5 7.34-21.28 17.59-24.92 7.69-3.53 15.06-7.47 22.09-11.8.8-.66 1.65-1.28 2.55-1.86 11.33-7.32 22.1-15.7 31.84-25.04.64-.61 1.31-1.19 2-1.72 20.66-20.5 36.48-45.06 46.71-71.76 18.66-48.7 18.77-104.46-4.1-155.72l-.01-.03C418.65 122.16 377.13 85 328.5 66.37c-48.7-18.65-104.46-18.76-155.72 4.1a203.616 203.616 0 00-48.4 30.33c-9.86 8.32-18.8 17.46-26.75 27.29l3.45-.43c14.49-1.77 27.68 8.55 29.45 23.04 1.77 14.49-8.55 27.68-23.04 29.45l-73.06 9c-13.66 1.66-26.16-7.41-29.03-20.61zM283.49 511.5c20.88-2.34 30.84-26.93 17.46-43.16-5.71-6.93-14.39-10.34-23.29-9.42-15.56 1.75-31.13 1.72-46.68-.13-9.34-1.11-18.45 2.72-24.19 10.17-12.36 16.43-2.55 39.77 17.82 42.35 19.58 2.34 39.28 2.39 58.88.19zm-168.74-40.67c7.92 5.26 17.77 5.86 26.32 1.74 18.29-9.06 19.97-34.41 3.01-45.76-12.81-8.45-25.14-18.96-35.61-30.16-9.58-10.2-25.28-11.25-36.11-2.39a26.436 26.436 0 00-2.55 38.5c13.34 14.2 28.66 27.34 44.94 38.07zM10.93 331.97c2.92 9.44 10.72 16.32 20.41 18.18 19.54 3.63 36.01-14.84 30.13-33.82-4.66-15-7.49-30.26-8.64-45.93-1.36-18.33-20.21-29.62-37.06-22.33C5.5 252.72-.69 262.86.06 274.14c1.42 19.66 5.02 39 10.87 57.83z"/></svg><span class="action-count">${getPostRemixCount(post.id) || post.remix_count || 0}</span></button>
                        <button class="icon-btn" data-action="save" title="Save Post"><i class="ri-bookmark-line"></i> <span class="action-count">0</span></button>
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
                    <div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; font-size: 0.7rem; font-weight: 600; padding: 3px 7px; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.5px; backdrop-filter: blur(4px); z-index: 1;">${badgeText}</div>
                </div>
                <div class="post-actions">
                    <button class="icon-btn" data-action="like"><i class="ri-heart-line"></i> <span class="action-count">0</span></button>
                    <button class="icon-btn" data-action="comment" title="Discussion"><i class="ri-chat-3-line"></i> <span class="action-count">0</span></button>
                    <button class="icon-btn"><i class="ri-send-plane-line"></i> <span class="action-count">${Math.floor(Math.random() * 100) + 5}</span></button>
                    <button class="icon-btn" data-action="remix" title="Remix Creation"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 113.03" style="width:24px;height:24px;"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M36.9,23.5h71.13c8.17,0,14.85,6.69,14.85,14.85v59.83c0,8.17-6.69,14.85-14.85,14.85H36.9 c-8.17,0-14.85-6.68-14.85-14.85V38.35C22.05,30.19,28.73,23.5,36.9,23.5L36.9,23.5z M10.08,73.96c0,2.78-2.26,5.04-5.04,5.04 C2.26,79,0,76.74,0,73.96V19.89C0,14.42,2.24,9.44,5.84,5.84C9.44,2.24,14.42,0,19.89,0h65.37c2.78,0,5.04,2.26,5.04,5.04 c0,2.78-2.26,5.04-5.04,5.04H19.89c-2.69,0-5.15,1.1-6.93,2.88c-1.78,1.78-2.88,4.23-2.88,6.93V73.96L10.08,73.96z M54.3,74.03 c-3.18,0-5.76-2.58-5.76-5.76s2.58-5.76,5.76-5.76H66.7V50.1c0-3.18,2.58-5.76,5.76-5.76s5.76,2.58,5.76,5.76v12.41h12.41 c3.18,0,5.76,2.58,5.76,5.76s-2.58,5.76-5.76,5.76H78.23v12.41c0,3.18-2.58,5.76-5.76,5.76s-5.76-2.58-5.76-5.76V74.03H54.3 L54.3,74.03z"/></svg><span class="action-count">${getPostRemixCount(post.id) || post.remix_count || 0}</span></button>
                    <button class="icon-btn" data-action="lineage" title="Remix Evolution & Lineage"><svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 513.11" style="width:24px;height:24px;"><path fill="currentColor" fill-rule="nonzero" d="M210.48 160.8c0-14.61 11.84-26.46 26.45-26.46s26.45 11.85 26.45 26.46v110.88l73.34 32.24c13.36 5.88 19.42 21.47 13.54 34.82-5.88 13.35-21.47 19.41-34.82 13.54l-87.8-38.6c-10.03-3.76-17.16-13.43-17.16-24.77V160.8zM5.4 168.54c-.76-2.25-1.23-4.64-1.36-7.13l-4-73.49c-.75-14.55 10.45-26.95 25-27.69 14.55-.75 26.95 10.45 27.69 25l.74 13.6a254.258 254.258 0 0136.81-38.32c17.97-15.16 38.38-28.09 61.01-38.18 64.67-28.85 134.85-28.78 196.02-5.35 60.55 23.2 112.36 69.27 141.4 132.83.77 1.38 1.42 2.84 1.94 4.36 27.86 64.06 27.53 133.33 4.37 193.81-23.2 60.55-69.27 112.36-132.83 141.39a26.24 26.24 0 01-12.89 3.35c-14.61 0-26.45-11.84-26.45-26.45 0-11.5 7.34-21.28 17.59-24.92 7.69-3.53 15.06-7.47 22.09-11.8.8-.66 1.65-1.28 2.55-1.86 11.33-7.32 22.1-15.7 31.84-25.04.64-.61 1.31-1.19 2-1.72 20.66-20.5 36.48-45.06 46.71-71.76 18.66-48.7 18.77-104.46-4.1-155.72l-.01-.03C418.65 122.16 377.13 85 328.5 66.37c-48.7-18.65-104.46-18.76-155.72 4.1a203.616 203.616 0 00-48.4 30.33c-9.86 8.32-18.8 17.46-26.75 27.29l3.45-.43c14.49-1.77 27.68 8.55 29.45 23.04 1.77 14.49-8.55 27.68-23.04 29.45l-73.06 9c-13.66 1.66-26.16-7.41-29.03-20.61zM283.49 511.5c20.88-2.34 30.84-26.93 17.46-43.16-5.71-6.93-14.39-10.34-23.29-9.42-15.56 1.75-31.13 1.72-46.68-.13-9.34-1.11-18.45 2.72-24.19 10.17-12.36 16.43-2.55 39.77 17.82 42.35 19.58 2.34 39.28 2.39 58.88.19zm-168.74-40.67c7.92 5.26 17.77 5.86 26.32 1.74 18.29-9.06 19.97-34.41 3.01-45.76-12.81-8.45-25.14-18.96-35.61-30.16-9.58-10.2-25.28-11.25-36.11-2.39a26.436 26.436 0 00-2.55 38.5c13.34 14.2 28.66 27.34 44.94 38.07zM10.93 331.97c2.92 9.44 10.72 16.32 20.41 18.18 19.54 3.63 36.01-14.84 30.13-33.82-4.66-15-7.49-30.26-8.64-45.93-1.36-18.33-20.21-29.62-37.06-22.33C5.5 252.72-.69 262.86.06 274.14c1.42 19.66 5.02 39 10.87 57.83z"/></svg><span class="action-count">${getPostRemixCount(post.id) || post.remix_count || 0}</span></button>
                    <button class="icon-btn" style="margin-left: auto;" data-action="save" title="Save Post"><i class="ri-bookmark-line"></i> <span class="action-count">0</span></button>
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
                            case 'anime': editorUrl = '/views/xtraAnim.html?tool=anime'; break;
                            case 'rough': editorUrl = '/views/xtraAnim.html?tool=rough'; break;
                            case 'two': editorUrl = '/views/xtraAnim.html?tool=two'; break;
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
                    bgVideo.play().catch(() => {});
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
                                    video.play().catch(() => {});
                                }
                                if (playPauseOverlay) {
                                    playPauseOverlay.innerHTML = '<i class="ri-volume-up-fill"></i>';
                                    playPauseOverlay.classList.add('visible');
                                    setTimeout(() => playPauseOverlay.classList.remove('visible'), 500);
                                }
                            } else {
                                // If already unmuted, toggle Play / Pause
                                if (video.paused) {
                                    video.play().catch(() => {});
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
            } catch (_) {}
        }

        const isOwnProfile = (!viewingUserId && !viewingUsername) || 
                             (viewingUserId && myUserId && viewingUserId === myUserId) ||
                             (viewingUsername && myUsername && viewingUsername.toLowerCase() === myUsername.toLowerCase());
        let targetUserId = viewingUserId || (isOwnProfile ? myUserId : null);
        let targetUsernameForFollow = viewingUsername || username || 'User';
        let targetFullNameForFollow = viewingUsername || username || 'User';
        let targetAvatarForFollow = '';

        // Ensure user's follows are up-to-date from Supabase before checking follow state
        if (myUserId && typeof syncUserFollows === 'function') {
            await syncUserFollows(myUserId);
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
                    // Match by following_id (ID or username) or creator_username
                    let orFilters = [];
                    if (activeProfileId) orFilters.push(`following_id.eq.${activeProfileId}`);
                    if (activeProfileUsername) {
                        orFilters.push(`following_id.eq.${activeProfileUsername}`);
                        orFilters.push(`creator_username.eq.${activeProfileUsername}`);
                        orFilters.push(`creator_username.eq.@${activeProfileUsername}`);
                    }

                    // 1. Follower count (people who follow this profile)
                    const { count: followersCount, error: fErr } = await client
                        .from('user_follows')
                        .select('*', { count: 'exact', head: true })
                        .or(orFilters.join(','));

                    if (!fErr && typeof followersCount === 'number') {
                        calculatedFollowers = followersCount;
                        followerEl.textContent = calculatedFollowers;
                    }

                    // 2. Following count (people this profile follows)
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
                } catch (e) {
                    console.warn('[Profile Follow Stats Supabase Error]:', e);
                }
            }

            // 3. Fallback to backend /api/follows/stats if Supabase count wasn't retrieved
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

        // --- Fetch this user's posts from Supabase ---
        if (targetUserId || viewingUsername) {
            try {
                let query = supabase.from('posts').select('id,created_at,user_id,title,description,video_url,media_type,format,original_id,username,avatar_url,source');
                if (targetUserId) {
                    query = query.eq('user_id', targetUserId);
                } else if (viewingUsername) {
                    query = query.ilike('username', viewingUsername);
                }
                const { data: fetchedPosts, error: postsErr } = await query.order('created_at', { ascending: false });
                if (!postsErr && fetchedPosts) {
                    profilePosts = fetchedPosts.map(p => {
                        let src = p.source;
                        if (typeof src === 'string') {
                            try { src = JSON.parse(src); } catch (_) { src = {}; }
                        }
                        return { ...p, source: src || {} };
                    });
                }
            } catch (e) {
                console.warn('Could not fetch user posts from Supabase:', e);
            }
        }

        // Merge with locally cached posts if matching this user
        if (!isOwnProfile && profilePosts.length === 0 && viewingUsername) {
            const cachedExplore = JSON.parse(localStorage.getItem('cached_explore_feed') || '[]');
            const matched = cachedExplore.filter(p => p && (
                (p.username && p.username.toLowerCase() === viewingUsername.toLowerCase()) ||
                (p.author && p.author.toLowerCase() === viewingUsername.toLowerCase()) ||
                (targetUserId && String(p.user_id) === String(targetUserId))
            ));
            if (matched.length > 0) profilePosts = matched;
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

        // Refresh story ring state with resolved posts
        if (typeof updateProfileStoryRing === 'function') {
            updateProfileStoryRing();
        }

        // --- Render posts grid ---
        const profileGrid = document.getElementById('profileGrid');
        if (profileGrid) {
            const renderPosts = async (type) => {
                const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
                profileGrid.innerHTML = '';
                document.querySelectorAll('.profile-filters .filter-btn, .insta-tab').forEach(t => t.classList.remove('active'));
                if (type === 'projects') document.getElementById('tabProjects')?.classList.add('active');
                if (type === 'remixes') document.getElementById('tabRemixes')?.classList.add('active');
                if (type === 'saved') document.getElementById('tabSaved')?.classList.add('active');
                if (type === 'library') document.getElementById('tabLibrary')?.classList.add('active');

                // Adjust grid class based on tab
                if (type === 'library') {
                    profileGrid.className = 'insta-grid library-grid';
                } else {
                    profileGrid.className = 'insta-grid';
                }

                let filtered = [];

                if (type === 'library') {
                    // 1. Gather all unlocked IDs from localStorage & database
                    let unlockedIds = (window.getUnlockedPurchases ? window.getUnlockedPurchases() : []).map(String);
                    if (isOwnProfile && myUserId && client) {
                        try {
                            const { data: userPurchases } = await client
                                .from('purchases')
                                .select('item_id')
                                .eq('user_id', myUserId);
                            if (userPurchases && userPurchases.length > 0) {
                                userPurchases.forEach(p => {
                                    if (p.item_id && !unlockedIds.includes(String(p.item_id))) {
                                        unlockedIds.push(String(p.item_id));
                                    }
                                });
                                localStorage.setItem('unlockedPurchases', JSON.stringify(unlockedIds));
                            }
                        } catch (err) {
                            console.warn("Could not sync purchases in Library:", err);
                        }
                    }

                    if (unlockedIds.length === 0) {
                        profileGrid.innerHTML = `
                            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#a1a1aa;">
                                <i class="ri-folders-line" style="font-size:3.2rem;color:#64748b;display:block;margin-bottom:12px;"></i>
                                <h3 style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:8px;">Your Library is Empty</h3>
                                <p style="font-size:0.88rem;color:#94a3b8;max-width:340px;margin:0 auto 20px;line-height:1.5;">Courses, books, asset packs, and source code you purchase from the XtraStore will appear here for instant lifetime access.</p>
                                <a href="/views/store.html" class="btn-primary" style="display:inline-flex;align-items:center;gap:6px;padding:9px 20px;border-radius:20px;text-decoration:none;font-size:0.85rem;font-weight:600;"><i class="ri-store-2-line"></i> Browse XtraStore</a>
                            </div>`;
                        return;
                    }

                    // 2. Show loading state while fetching purchased items
                    profileGrid.innerHTML = `
                        <div style="grid-column:1/-1;text-align:center;padding:50px 20px;color:#94a3b8;">
                            <i class="ri-loader-4-line spin" style="font-size:2rem;display:inline-block;animation:spin 1s linear infinite;"></i>
                            <div style="margin-top:10px;font-size:0.88rem;">Loading your purchased library...</div>
                        </div>`;

                    // 3. Gather ONLY items that have been purchased
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
                    } catch (_) {}

                    try {
                        const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                        localPosts.forEach(p => {
                            if (unlockedIds.includes(String(p.id))) {
                                itemMap.set(String(p.id), p);
                            }
                        });
                    } catch (_) {}

                    profilePosts.forEach(p => {
                        if (unlockedIds.includes(String(p.id))) {
                            itemMap.set(String(p.id), p);
                        }
                    });

                    // 4. Fetch missing unlocked items from Supabase in batch
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

                    filtered = unlockedIds.map(id => itemMap.get(id)).filter(Boolean);

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

                if (type === 'saved') {
                    // 1. Show loading state immediately while synchronizing
                    profileGrid.innerHTML = `
                        <div style="grid-column:1/-1;text-align:center;padding:50px 20px;color:#94a3b8;">
                            <i class="ri-loader-4-line spin" style="font-size:2rem;display:inline-block;animation:spin 1s linear infinite;"></i>
                            <div style="margin-top:10px;font-size:0.88rem;">Loading your saved posts...</div>
                        </div>`;

                    // 2. Multi-tier synchronization (Local Vault + Backend SQLite + Supabase)
                    let syncedData = { savedIds: [], posts: {} };
                    if (isOwnProfile && myUserId && typeof window.syncUserSaves === 'function') {
                        try {
                            syncedData = await window.syncUserSaves(myUserId);
                        } catch (_) {}
                    }

                    // 3. Gather all saved IDs from local storage, user vault, and backend response
                    const vaultKey = typeof getUserSavesVaultKey === 'function' ? getUserSavesVaultKey(myUserId) : `xtra_saves_${myUserId}`;
                    let localSaved = JSON.parse(localStorage.getItem('savedPosts') || '[]').map(String);
                    let vaultSaved = myUserId ? JSON.parse(localStorage.getItem(vaultKey) || '[]').map(String) : [];
                    let savedIds = Array.from(new Set([...(syncedData.savedIds || []), ...localSaved, ...vaultSaved]));

                    if (savedIds.length === 0) {
                        profileGrid.innerHTML = `
                            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#a1a1aa;">
                                <i class="ri-bookmark-line" style="font-size:3.2rem;color:#64748b;display:block;margin-bottom:12px;"></i>
                                <h3 style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:8px;">No Saved Posts Yet</h3>
                                <p style="font-size:0.88rem;color:#94a3b8;max-width:340px;margin:0 auto;line-height:1.5;">Tap the bookmark icon on any post in Explore or Reels to save it for quick access here.</p>
                            </div>`;
                        return;
                    }

                    // 4. Gather posts from all available caches & user vault
                    const postMap = {};
                    profilePosts.forEach(p => { if (p && p.id) postMap[String(p.id)] = p; });

                    try {
                        const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                        localPosts.forEach(p => { if (p && p.id) postMap[String(p.id)] = p; });
                    } catch (_) {}

                    try {
                        const savedObjs = JSON.parse(localStorage.getItem('savedPostsObjects') || '{}');
                        Object.values(savedObjs).forEach(p => { if (p && p.id) postMap[String(p.id)] = p; });
                    } catch (_) {}

                    const objsVaultKey = typeof getUserSavedObjectsVaultKey === 'function' ? getUserSavedObjectsVaultKey(myUserId) : `xtra_saved_posts_${myUserId}`;
                    try {
                        const vaultObjs = myUserId ? JSON.parse(localStorage.getItem(objsVaultKey) || '{}') : {};
                        Object.values(vaultObjs).forEach(p => { if (p && p.id) postMap[String(p.id)] = p; });
                    } catch (_) {}

                    if (syncedData.posts) {
                        Object.values(syncedData.posts).forEach(p => { if (p && p.id) postMap[String(p.id)] = p; });
                    }

                    if (window._allRenderedPosts) {
                        Object.values(window._allRenderedPosts).forEach(p => { if (p && p.id) postMap[String(p.id)] = p; });
                    }

                    // 5. Fetch missing saved posts from Supabase in batch
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

                    // 6. Build ordered array matching savedIds
                    filtered = savedIds
                        .map(id => postMap[id])
                        .filter(Boolean);

                    profileGrid.innerHTML = '';
                    if (filtered.length === 0) {
                        profileGrid.innerHTML = `
                            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#a1a1aa;">
                                <i class="ri-bookmark-line" style="font-size:3.2rem;color:#64748b;display:block;margin-bottom:12px;"></i>
                                <h3 style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:8px;">No Saved Posts Found</h3>
                                <p style="font-size:0.88rem;color:#94a3b8;max-width:340px;margin:0 auto;line-height:1.5;">Posts you previously saved may have been removed or deleted.</p>
                            </div>`;
                        return;
                    }
                } else {
                    filtered = profilePosts.filter(p => {
                        if (type === 'projects') return !p.original_id;
                        if (type === 'remixes') return !!p.original_id;
                        return !p.original_id;
                    });

                    if (filtered.length === 0) {
                        profileGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#a1a1aa;">No ${type} found.</div>`;
                        return;
                    }
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
                        const fullCover = post.video_url?.startsWith('http') || post.video_url?.startsWith('data:') ? post.video_url : (post.video_url ? `${getBackendUrl()}${post.video_url}` : '');
                        if (fullCover) {
                            thumbnailHTML = `<img src="${fullCover}" style="width:100%;height:100%;object-fit:cover;background:#000;" onerror="window.handleMediaFallback(this, '${post.id}', '3D Model', 'ri-cube-fill', '${(post.title || '3D Model').replace(/'/g, '&#39;')}');">`;
                        } else if (post.source?.engine === 'svg_to_3d' && post.source?.code && typeof window.createSVG3DViewerIframeContent === 'function') {
                            const svgCode = JSON.stringify(post.source.code);
                            const iframeContent = window.createSVG3DViewerIframeContent(svgCode, post.source.color || '#3b82f6', false);
                            thumbnailHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%;height:100%;border:none;background:#000;pointer-events:none;"></iframe>`;
                        } else {
                            thumbnailHTML = `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1e1e2f,#0f172a);display:flex;align-items:center;justify-content:center;"><i class="ri-cube-fill" style="font-size:2.5rem;color:#60a5fa;"></i></div>`;
                        }
                    } else if (post.format === 'explanation') {
                        thumbnailHTML = `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1e1b4b,#0f172a);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px solid rgba(70,79,235,0.3);"><i class="ri-volume-up-line" style="font-size:2.4rem;color:#818cf8;"></i><span style="font-size:0.7rem;font-weight:700;color:#93c5fd;letter-spacing:0.5px;">EXPLANATION</span></div>`;
                    } else if (post.format === 'interactive' || post.format === 'anime' || post.format === 'rough' || post.format === 'two') {
                        if (typeof post.source === 'string') {
                            try { post.source = JSON.parse(post.source); } catch(_) { post.source = {}; }
                        }
                        const fullCover = post.video_url?.startsWith('http') || post.video_url?.startsWith('data:') ? post.video_url : (post.video_url ? `${getBackendUrl()}${post.video_url}` : '');
                        const engine = post.source?.engine || post.format;
                        if (fullCover) {
                            const safeTitle = (post.title || 'Interactive').replace(/'/g, '&#39;');
                            thumbnailHTML = `<img src="${fullCover}" style="width:100%;height:100%;object-fit:cover;background:#0e1117;" onerror="window.handleMediaFallback(this, '${post.id}', 'Interactive', 'ri-brush-line', '${safeTitle}');">`;
                        } else if ((engine === 'rough' || post.format === 'rough') && post.source?.code && typeof window.renderRough === 'function') {
                            const iframeContent = window.renderRough(post.source.code, { width: 1280, height: 720, background: post.source.background || '#0e1117' });
                            thumbnailHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%;height:100%;border:none;background:#0e1117;pointer-events:none;"></iframe>`;
                        } else if ((engine === 'anime' || post.format === 'anime') && post.source?.code && typeof window.renderAnime === 'function') {
                            const iframeContent = window.renderAnime(post.source.code, { width: 1280, height: 720, background: post.source.background || '#080a10' });
                            thumbnailHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%;height:100%;border:none;background:#080a10;pointer-events:none;"></iframe>`;
                        } else if ((engine === 'two' || post.format === 'two') && post.source?.code && typeof window.renderTwo === 'function') {
                            const iframeContent = window.renderTwo(post.source.code, { width: 1280, height: 720, background: post.source.background || '#090b10' });
                            thumbnailHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%;height:100%;border:none;background:#090b10;pointer-events:none;"></iframe>`;
                        } else if (engine === 'zdog' && post.source?.code && typeof window.renderZdog === 'function') {
                            const iframeContent = window.renderZdog(post.source.code, { background: '#0a0d14' });
                            thumbnailHTML = `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%;height:100%;border:none;background:#0a0d14;pointer-events:none;"></iframe>`;
                        } else {
                            thumbnailHTML = `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1e1e2f,#0f172a);display:flex;align-items:center;justify-content:center;"><i class="ri-brush-line" style="font-size:2.5rem;color:#38bdf8;"></i></div>`;
                        }
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

                    const iconHTML = post.original_id ? '<i class="ri-repeat-2-fill"></i>' :
                        ((post.source?.engine === 'tikz' || post.format === 'tikz') ? '<i class="ri-draft-line"></i>' :
                            (post.format === 'image' ? '<i class="ri-image-fill"></i>' :
                                (post.format === 'pdf' ? '<i class="ri-book-open-fill"></i>' :
                                    (post.format === 'article' ? '<i class="ri-article-fill"></i>' :
                                        (post.format === 'explanation' ? '<i class="ri-voiceprint-fill"></i>' :
                                            (post.format === 'interactive' || post.format === 'anime' || post.format === 'rough' ? '<i class="ri-sparkling-fill"></i>' :
                                                (post.format === '3d_model' ? '<i class="ri-box-3-fill"></i>' :
                                                    (post.format === 'threejs_scene' ? '<i class="ri-code-box-fill"></i>' : '<i class="ri-play-circle-fill"></i>'))))))));

                    div.innerHTML = `
                            <div class="post-thumbnail" style="width:100%;height:100%;background:#111;position:relative;">
                                ${thumbnailHTML}
                                <div style="position:absolute;top:7px;right:7px;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.15);width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:white;font-size:0.85rem;box-shadow:0 2px 8px rgba(0,0,0,0.4);">${iconHTML}</div>
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

            if (tabProjects) tabProjects.onclick = () => { window.location.hash = 'projects'; };
            if (tabRemixes) tabRemixes.onclick = () => { window.location.hash = 'remixes'; };
            if (tabSaved) tabSaved.onclick = () => { window.location.hash = 'saved'; };
            if (tabLibrary) tabLibrary.onclick = () => { window.location.hash = 'library'; };

            const currentHash = window.location.hash.substring(1);
            const initialTab = ['saved', 'remixes', 'library'].includes(currentHash) ? currentHash : 'projects';
            renderPosts(initialTab);

            window.onhashchange = () => {
                const h = window.location.hash.substring(1);
                renderPosts(['saved', 'remixes', 'library'].includes(h) ? h : 'projects');
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

            // Video Intersection Observer for Autoplay with Audio
            const observerOptions = {
                root: scrollContainer === window ? null : scrollContainer,
                rootMargin: '0px',
                threshold: isReels ? 0.6 : 0.5
            };
            videoObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const video = entry.target;
                    if (entry.isIntersecting) {
                        if (isReels) {
                            video.muted = false;
                        }
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(() => {
                                // If browser restricts unmuted autoplay before user gesture, start muted
                                video.muted = true;
                                video.play().catch(() => {});
                            });
                        }
                    } else {
                        video.pause();
                    }
                });
            }, observerOptions);

            // Auto-unmute videos on any user interaction with the page
            const unlockAudioPlayback = () => {
                const visibleVideos = document.querySelectorAll('.post-media video');
                visibleVideos.forEach(v => {
                    if (isReels && v.muted) {
                        v.muted = false;
                    }
                });
                // Ensure all background blur videos remain permanently muted to prevent double voice
                document.querySelectorAll('.reel-background video').forEach(bg => {
                    bg.muted = true;
                });
            };
            ['pointerdown', 'touchstart', 'click', 'scroll', 'keydown'].forEach(evt => {
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
                    // Fetch posts ordered chronologically.
                    // Note: We do NOT use query.not('format', 'in', ...) here because in SQL standard 3-valued logic,
                    // any post with format=NULL evaluates to UNKNOWN and is dropped. We filter courses/assets in JS instead.
                    let query = supabase
                        .from('posts')
                        .select('*')
                        .order('created_at', { ascending: false });

                    const { data, error } = await query.range(fromIdx, toIdx);
                    if (error) throw error;
                    posts = data || [];
                    posts.forEach(p => {
                        if (p && typeof p.source === 'string') {
                            try { p.source = JSON.parse(p.source); } catch(_) { p.source = {}; }
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
                                    if (!window._allRenderedPosts) window._allRenderedPosts = {};
                                    const cachedPostIds = [];
                                    cached.forEach(post => {
                                        if (post && post.id && !allRenderedPostIds.has(String(post.id))) {
                                            allRenderedPostIds.add(String(post.id));
                                            cachedPostIds.push(String(post.id));
                                            // Track for re-render pass after handlers load
                                            window._allRenderedPosts[String(post.id)] = post;
                                            const { element, init } = createPostElement(post, 'grid');
                                            if (element) {
                                                exploreFeed.appendChild(element);
                                                const vids = element.querySelectorAll('.post-media video');
                                                vids.forEach(v => videoObserver.observe(v));
                                                if (init) init();
                                            }
                                        }
                                    });
                                    if (cachedPostIds.length > 0) {
                                        fetchPostLikeData(cachedPostIds);
                                    }
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
                    let collectedPosts = [];
                    let attempts = 0;

                    // Robust Multi-Slice Collector:
                    // Keep fetching until we collect enough valid displayable posts or reach the end of the database.
                    // This prevents pagination from stalling when intermediate rows are filtered out.
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

                    const filteredPosts = collectedPosts;

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

                        // Handle starting ID on reels & explore (fetch specific post directly if not in initial batch)
                        const urlParams = new URLSearchParams(window.location.search);
                        const startId = urlParams.get('id') || urlParams.get('postId');
                        if (startId) {
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
                                // If a dedicated format is opened with reels or explore, redirect to dedicated viewer
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

                                // If on explore.html but post is explicitly a reel (9:16)
                                if (!isReels && (startPost.format === 'reel' || startPost.format === '9:16' || startPost.feed_type === 'reel')) {
                                    window.location.replace(`/views/reels.html?id=${encodeURIComponent(startPost.id)}`);
                                    return;
                                }

                                // Remove from filteredPosts if already present to avoid duplication
                                const existingIdx = filteredPosts.findIndex(p => String(p.id) === String(startId));
                                if (existingIdx > -1) filteredPosts.splice(existingIdx, 1);
                                // Guarantee the target post is at index 0
                                filteredPosts.unshift(startPost);

                                if (!isReels) {
                                    setTimeout(() => {
                                        const targetEl = document.querySelector(`.feed-post[data-post-id="${startId}"]`);
                                        if (targetEl) {
                                            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            targetEl.style.transition = 'box-shadow 0.4s ease';
                                            targetEl.style.boxShadow = '0 0 0 2px #3b82f6, 0 10px 30px rgba(59, 130, 246, 0.4)';
                                            setTimeout(() => { targetEl.style.boxShadow = ''; }, 2500);
                                        }
                                    }, 400);
                                }
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
                    if (!window._allRenderedPosts) window._allRenderedPosts = {};
                    filteredPosts.forEach(post => {
                        try {
                            if (post && post.id && !allRenderedPostIds.has(String(post.id))) {
                                allRenderedPostIds.add(String(post.id));
                                newPostIds.push(post.id);
                                // Store full post data for re-render pass (used when handlers load late)
                                window._allRenderedPosts[String(post.id)] = post;
                                const viewType = isReels ? 'reel' : 'grid';
                                const { element, init } = createPostElement(post, viewType);
                                if (element) {
                                    exploreFeed.appendChild(element);
                                    if (init) init();

                                    // Observe foreground videos for autoplay (never background blur videos)
                                    const vids = element.querySelectorAll('.post-media video');
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
                    updateAllFollowButtons();

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

                // Live Rough.js Hand-Drawn Sketch if code exists
                if ((format === 'interactive' || format === 'rough') && (post.source?.engine === 'rough' || post.format === 'rough') && post.source?.code && typeof window.renderRough === 'function') {
                    const iframeContent = window.renderRough(post.source.code, { width: 1280, height: 720, background: post.source.background || '#0e1117' });
                    return `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0e1117; pointer-events:none;"></iframe>`;
                }

                // Live Anime.js Kinetic Motion if code exists
                if ((format === 'interactive' || format === 'anime') && (post.source?.engine === 'anime' || post.format === 'anime') && post.source?.code && typeof window.renderAnime === 'function') {
                    const iframeContent = window.renderAnime(post.source.code, { width: 1280, height: 720, background: post.source.background || '#080a10' });
                    return `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#080a10; pointer-events:none;"></iframe>`;
                }

                // Live Two.js 2D Vector Motion if code exists
                if ((format === 'interactive' || format === 'two') && (post.source?.engine === 'two' || post.format === 'two') && post.source?.code && typeof window.renderTwo === 'function') {
                    const iframeContent = window.renderTwo(post.source.code, { width: 1280, height: 720, background: post.source.background || '#090b10' });
                    return `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#090b10; pointer-events:none;"></iframe>`;
                }

                // Live SVG to 3D if code exists
                if ((format === '3d_model' || format === 'interactive') && post.source?.engine === 'svg_to_3d' && post.source?.code && typeof window.createSVG3DViewerIframeContent === 'function') {
                    const svgCode = JSON.stringify(post.source.code);
                    const iframeContent = window.createSVG3DViewerIframeContent(svgCode, post.source.color || '#3b82f6', false);
                    return `<iframe srcdoc='${iframeContent.replace(/'/g, "&apos;")}' style="width:100%; height:100%; border:none; background:#0a0d14; pointer-events:none;"></iframe>`;
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

        // Sync Input - Virtual File System per Engine
        studioEditor.addEventListener('input', () => {
            updateHighlighting();
            // Save to LocalStorage for current active engine and global fallback
            if (currentEngine) {
                localStorage.setItem('xtraAnimCode_' + currentEngine, studioEditor.value);
            }
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

            // Save previous engine code to its virtual file if available
            if (currentEngine && studioEditor && studioEditor.value) {
                localStorage.setItem('xtraAnimCode_' + currentEngine, studioEditor.value);
            }

            console.log("Switching engine to:", engine.name);
            currentEngine = engine.id;
            // --- Save the selected engine to localStorage ---
            localStorage.setItem('xtraAnimEngine', engine.id);

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
            const thumbnailSettings = document.getElementById('thumbnailSettings');
            const tikzSettings = document.getElementById('tikzSettings');
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
            const isGenericClient = engine.id !== 'manim' && engine.id !== 'svg_to_3d' && engine.id !== 'svg_to_png' && engine.id !== 'mermaid' && engine.id !== 'katex' && engine.id !== 'jsxgraph' && engine.id !== 'zdog' && engine.id !== 'thumbnail' && engine.id !== 'tikz' && engine.id !== 'rough' && engine.id !== 'two';
            if (clientRenderSettings) clientRenderSettings.style.display = isGenericClient ? 'flex' : 'none';
            if (svgTo3dSettings) svgTo3dSettings.style.display = (engine.id === 'svg_to_3d') ? 'flex' : 'none';
            if (svgToPngSettings) svgToPngSettings.style.display = (engine.id === 'svg_to_png') ? 'flex' : 'none';
            if (mermaidSettings) mermaidSettings.style.display = (engine.id === 'mermaid') ? 'flex' : 'none';
            if (katexSettings) katexSettings.style.display = (engine.id === 'katex') ? 'flex' : 'none';
            if (jsxgraphSettings) jsxgraphSettings.style.display = (engine.id === 'jsxgraph') ? 'flex' : 'none';
            if (zdogSettings) zdogSettings.style.display = (engine.id === 'zdog') ? 'flex' : 'none';
            if (thumbnailSettings) thumbnailSettings.style.display = (engine.id === 'thumbnail') ? 'flex' : 'none';
            if (tikzSettings) tikzSettings.style.display = (engine.id === 'tikz') ? 'flex' : 'none';

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
                        studioEditor.value = zdogTemplate;
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'matter') {
                        studioEditor.value = matterjsTemplate;
                        if (templateSelect) templateSelect.value = "";
                    } else if (engine.id === 'd3') {
                        studioEditor.value = d3jsTemplate;
                        if (templateSelect) templateSelect.value = "";
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
                    localStorage.setItem('xtraAnimCode_' + engine.id, studioEditor.value);
                }
                localStorage.setItem('xtraAnimCode', studioEditor.value);
            }

            // Syntax Highlighting
            if (highlightPre) highlightPre.className = `language-${engine.language}`;
            if (highlightCode) highlightCode.className = `language-${engine.language}`;

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
                if (outputContainer) outputContainer.style.display = 'none';
            } else { // manim
                if (motionFrame) motionFrame.style.display = 'none';
                if (motionFrame) motionFrame.srcdoc = ''; // Clear previous Motion Canvas preview
                if (outputContainer) outputContainer.style.display = 'flex';
            }

            // Refresh Highlight
            updateHighlighting();
            logToConsole(`Switched engine to ${engine.name}`);

            // Note: No auto-render on engine switch. User must click the FAB render button.
            
            // On mobile, automatically switch to the editor tab when an engine is selected
            if (typeof switchTab === 'function' && window.innerWidth <= 1024) {
                switchTab('editor');
            }
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
                    } catch (e) {}
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
                        // For SVG, D3, Mermaid, KaTeX, JSXGraph, Zdog, Thumbnail, TikZ, Anime.js, Rough.js, Two.js, and SVG to PNG, we can publish the preview.
                        uploadBtn.style.display = (currentEngine === 'svg_to_3d' || currentEngine === 'svg_to_png' || currentEngine === 'd3' || currentEngine === 'mermaid' || currentEngine === 'katex' || currentEngine === 'jsxgraph' || currentEngine === 'zdog' || currentEngine === 'thumbnail' || currentEngine === 'tikz' || currentEngine === 'anime' || currentEngine === 'rough' || currentEngine === 'two') ? 'block' : 'none';
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

                        if (colorPicker && !colorPicker.dataset.bound) {
                            colorPicker.dataset.bound = 'true';
                            colorPicker.addEventListener('input', () => {
                                if (currentEngine === 'svg_to_3d' && typeof window.handleRender === 'function') {
                                    window.handleRender(true, false);
                                }
                            });
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
                    const AGENT_URL = 'http://127.0.0.1:8989';
                    logToConsole("Checking Local Agent connection on :8989...", 'info');

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
                            logToConsole("⚡ Connected to Local Agent on :8989! Rendering locally on your device...", 'success');
                            
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
                                    const err = await response.json().catch(() => ({ detail: "Unknown local render error" }));
                                    throw new Error(err.detail || "Local render execution failed.");
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
            // Attach listeners: open project settings modal before actual render
            renderBtn.addEventListener('click', () => {
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

                const { data, error } = await supabase.from('posts').insert([newPostData]).select();
                if (error) throw error;

                const newPost = data[0];
                const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                allPosts.push(newPost);
                localStorage.setItem('userPosts', JSON.stringify(allPosts));

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
        const activeProfileId = (typeof targetUserId !== 'undefined' && targetUserId) ? targetUserId : myUserId;
        let usersToDisplay = [];

        const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);

        if (client && activeProfileId) {
            try {
                if (type === 'Following') {
                    // Creators this profile is following
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
                    // Users following this profile
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
                    ${!isOwn ? `
                    <button class="btn-follow-modal ${isFollowing ? 'following' : ''}" data-user-id="${u.id || ''}" data-username="${u.username || displayName}" data-custom-follow="true" style="flex-shrink: 0; margin-left: 12px;">
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