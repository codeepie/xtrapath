document.addEventListener('DOMContentLoaded', async () => {
    
    // ============================================================
    // SUPABASE CLIENT SETUP
    // ============================================================
    // Fetch configuration from the backend to avoid hardcoding keys.
    // This is a best practice for production environments like Railway.
    let config;
    try {
        const configResponse = await fetch('/api/config');
        if (!configResponse.ok) {
            throw new Error(`Server responded with status: ${configResponse.status}`);
        }
        config = await configResponse.json();
    } catch (error) {
        console.error("Failed to load app configuration:", error);
        document.body.innerHTML = `<div style="color:red; padding: 20px; text-align: center; font-family: sans-serif;"><h2>Connection Error</h2><p>Could not load app configuration from the server. Please ensure the backend is running and properly configured.</p><pre style="text-align: left; background: #222; padding: 10px; border-radius: 5px; margin-top: 10px;">${error.message}</pre></div>`;
        return;
    }
    const SUPABASE_URL = config.supabase_url;
    const SUPABASE_ANON_KEY = config.supabase_anon_key;
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

    // --- REVISED: SESSION MANAGEMENT ---
    supabase.auth.onAuthStateChange(async (event, session) => {
        // The OAuth redirect is now handled above, so this listener focuses on managing
        // the UI based on the session state on normal page loads.

        if (event === "SIGNED_IN" && session) {
            // This logic runs for signed-in users on pages like explore.html, profile.html, etc.
            // It fetches the user profile to populate localStorage and update the UI.
            const { data: profile, error: profileError } = await supabase.from('profiles').select(`username, full_name, avatar_url, bio`).eq('id', session.user.id).single();

            if (profileError) {
                console.error("Error fetching user profile:", profileError.message);
                localStorage.setItem('username', session.user.user_metadata.full_name || session.user.email.split('@')[0]);
                localStorage.setItem('handle', '@' + (session.user.user_metadata.full_name || session.user.email.split('@')[0]).replace(/\s/g, '').toLowerCase());
                localStorage.setItem('avatarUrl', session.user.user_metadata.avatar_url || '');
            } else if (profile) {
                localStorage.setItem('username', profile.full_name || session.user.email.split('@')[0]);
                localStorage.setItem('handle', profile.username ? `@${profile.username}` : ('@' + (profile.full_name || session.user.email.split('@')[0]).replace(/\s/g, '').toLowerCase()));
                localStorage.setItem('userBio', profile.bio || '');
                localStorage.setItem('avatarUrl', profile.avatar_url || session.user.user_metadata.avatar_url || '');
            }
            localStorage.setItem('userType', 'creator');

            // Update UI elements with the new profile data
            updateHeader();
            updateUserAvatars();
        } else if (event === "SIGNED_OUT") {
            // Clear all user data on logout and redirect to login page.
            localStorage.clear();
            window.location.href = '/views/login.html';
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
                { name: 'Home',    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 112.07"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M61.44,0L0,60.18l14.99,7.87L61.04,19.7l46.85,48.36l14.99-7.87L61.44,0L61.44,0z M18.26,69.63L18.26,69.63 L61.5,26.38l43.11,43.25h0v0v42.43H73.12V82.09H49.49v29.97H18.26V69.63L18.26,69.63L18.26,69.63z"/></svg>`,           activeIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 112.07"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M61.44,0L0,60.18l14.99,7.87L61.04,19.7l46.85,48.36l14.99-7.87L61.44,0L61.44,0z M18.26,69.63L18.26,69.63 L61.5,26.38l43.11,43.25h0v0v42.43H73.12V82.09H49.49v29.97H18.26V69.63L18.26,69.63L18.26,69.63z"/></svg>`,           link: '/views/explore.html' },
                { name: 'Reels',   icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.14 122.88"><path fill="currentColor" d="M35.14 0h51.86c9.65 0 18.43 3.96 24.8 10.32 6.38 6.37 10.34 15.16 10.34 24.82v52.61c0 9.64-3.96 18.42-10.32 24.79l-0.02 0.02c-6.38 6.37-15.16 10.32-24.79 10.32H35.14c-9.66 0-18.45-3.96-24.82-10.32l-0.24-0.27C3.86 105.95 0 97.27 0 87.74V35.14C0 25.47 3.95 16.69 10.32 10.32S25.47 0 35.14 0zM91.51 31.02l0.07 0.11h21.6c-0.87-5.68-3.58-10.78-7.48-14.69-4.8-4.81-11.42-7.79-18.71-7.79h-8.87l13.38 22.36zM81.52 31.13L68.07 8.66H38.57l13.61 22.47h29.34zM42.11 31.13L28.95 9.39c-4.81 1.16-9.12 3.65-12.51 7.05-3.9 3.9-6.6 9.01-7.48 14.69h33.15zM113.48 39.79H8.66v47.96c0 7.17 2.89 13.7 7.56 18.48l0.22 0.21c4.8 4.8 11.43 7.79 18.7 7.79H87c7.28 0 13.9-2.98 18.69-7.77l0.02-0.02c4.79-4.79 7.77-11.41 7.77-18.69V39.79zM50.95 54.95l26.83 17.45c0.43 0.28 0.82 0.64 1.13 1.08 1.22 1.77 0.77 4.2-1 5.42L51.19 94.67c-0.67 0.55-1.53 0.88-2.48 0.88-2.16 0-3.91-1.75-3.91-3.91V58.15h0.02c0-0.77 0.23-1.55 0.7-2.23 1.24-1.77 3.67-2.2 5.43-1z"/></svg>`,          activeIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.14 122.88"><path fill="currentColor" d="M35.14 0h51.86c9.65 0 18.43 3.96 24.8 10.32 6.38 6.37 10.34 15.16 10.34 24.82v52.61c0 9.64-3.96 18.42-10.32 24.79l-0.02 0.02c-6.38 6.37-15.16 10.32-24.79 10.32H35.14c-9.66 0-18.45-3.96-24.82-10.32l-0.24-0.27C3.86 105.95 0 97.27 0 87.74V35.14C0 25.47 3.95 16.69 10.32 10.32S25.47 0 35.14 0zM91.51 31.02l0.07 0.11h21.6c-0.87-5.68-3.58-10.78-7.48-14.69-4.8-4.81-11.42-7.79-18.71-7.79h-8.87l13.38 22.36zM81.52 31.13L68.07 8.66H38.57l13.61 22.47h29.34zM42.11 31.13L28.95 9.39c-4.81 1.16-9.12 3.65-12.51 7.05-3.9 3.9-6.6 9.01-7.48 14.69h33.15zM113.48 39.79H8.66v47.96c0 7.17 2.89 13.7 7.56 18.48l0.22 0.21c4.8 4.8 11.43 7.79 18.7 7.79H87c7.28 0 13.9-2.98 18.69-7.77l0.02-0.02c4.79-4.79 7.77-11.41 7.77-18.69V39.79zM50.95 54.95l26.83 17.45c0.43 0.28 0.82 0.64 1.13 1.08 1.22 1.77 0.77 4.2-1 5.42L51.19 94.67c-0.67 0.55-1.53 0.88-2.48 0.88-2.16 0-3.91-1.75-3.91-3.91V58.15h0.02c0-0.77 0.23-1.55 0.7-2.23 1.24-1.77 3.67-2.2 5.43-1z"/></svg>`,          link: '/views/reels.html' },
                { name: 'Studio',  icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.875 122.648"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M108.993,47.079c7.683-0.059,13.898,6.12,13.882,13.805 c-0.018,7.683-6.26,13.959-13.942,14.019L75.24,75.138l-0.235,33.73c-0.063,7.619-6.338,13.789-14.014,13.78 c-7.678-0.01-13.848-6.197-13.785-13.818l0.233-33.497l-33.558,0.235C6.2,75.628-0.016,69.448,0,61.764 c0.018-7.683,6.261-13.959,13.943-14.018l33.692-0.236l0.236-33.73C47.935,6.161,54.209-0.009,61.885,0 c7.678,0.009,13.848,6.197,13.784,13.818l-0.233,33.497L108.993,47.079L108.993,47.079z"/></svg>`,            activeIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.875 122.648"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M108.993,47.079c7.683-0.059,13.898,6.12,13.882,13.805 c-0.018,7.683-6.26,13.959-13.942,14.019L75.24,75.138l-0.235,33.73c-0.063,7.619-6.338,13.789-14.014,13.78 c-7.678-0.01-13.848-6.197-13.785-13.818l0.233-33.497l-33.558,0.235C6.2,75.628-0.016,69.448,0,61.764 c0.018-7.683,6.261-13.959,13.943-14.018l33.692-0.236l0.236-33.73C47.935,6.161,54.209-0.009,61.885,0 c7.678,0.009,13.848,6.197,13.784,13.818l-0.233,33.497L108.993,47.079L108.993,47.079z"/></svg>`,            link: '#', id: 'studioBtn' },
                { name: 'Store',   icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 464 511.99"><path fill="currentColor" d="M232 31.996c-16.793 0-33.012 6.9-45.058 19.375-12.07 12.487-18.94 29.54-18.94 47.434v13.189h127.995V98.805c0-17.894-6.87-34.947-18.94-47.434C265.011 38.896 248.792 31.996 232 31.996zm-95.999 66.809v13.189H79.514c-20.028 0-37.952 5.902-50.869 18.825-12.832 12.838-18.752 30.622-18.837 50.566L0 378.523v.393c0 76.46 54.558 133.074 131.314 133.074h201.371c76.696 0 131.435-56.335 131.314-132.875v-.387l-9.869-197.784c-.078-19.938-5.986-37.656-18.861-50.403-12.941-12.808-30.852-18.547-50.784-18.547h-56.486V98.805c0-26.033-9.985-51.105-27.926-69.67C282.119 10.547 257.639 0 232 0c-25.64 0-50.119 10.547-68.073 29.135-17.942 18.565-27.926 43.637-27.926 69.67zm-56.487 45.19h304.971c13.939 0 22.852 3.925 28.27 9.289 5.388 5.333 9.38 14.138 9.38 28.071v.405l9.862 197.779c-.078 59.099-40.878 100.455-99.312 100.455H131.314c-58.367 0-99.137-41.514-99.312-100.691l9.808-197.101v-.4c0-13.932 4.003-22.888 9.464-28.361 5.467-5.467 14.398-9.446 28.24-9.446zm88.488 63.998c0-8.835-7.165-15.995-16-15.995s-16.001 7.16-16.001 15.995a95.98 95.98 0 0028.119 67.885A96 96 0 00232 303.997a95.998 95.998 0 0067.879-28.119 95.981 95.981 0 0028.12-67.885c0-8.835-7.166-15.995-16.002-15.995-8.834 0-16 7.16-16 15.995A64.006 64.006 0 01232 271.996a63.978 63.978 0 01-45.251-18.746 64.002 64.002 0 01-18.747-45.257z"/></svg>`, link: '/views/store.html' },
                { name: 'Profile', icon: 'ri-user-line',           activeIcon: 'ri-user-fill',           link: '/views/profile.html' }
            ];

            const currentPath = window.location.pathname;
            const sidebarNav = document.querySelector('.sidebar .nav-links');
            const bottomNavContainer = document.querySelector('.bottom-nav');

            // Clear existing static links
            if (sidebarNav) sidebarNav.innerHTML = '';
            if (bottomNavContainer) bottomNavContainer.innerHTML = '';
            
            pages.forEach(page => {
                const isActive = currentPath.includes(page.link);
                let iconHTML = isActive ? page.activeIcon : page.icon;

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
            const modalHTML = `
                <div id="createChoiceModal" class="create-choice-overlay">
                    <div class="create-choice-modal glass-card">
                        <h3 style="text-align: center; margin-bottom: 25px; color: white;">Create New</h3>
                        <div class="create-choice-grid">
                            <a href="/views/xtraAnim.html" class="create-choice-btn">
                                <i class="ri-movie-2-line"></i>
                                <span>Animation</span>
                            </a>
                            <a href="/views/xtraGraph.html" class="create-choice-btn">
                                <i class="ri-bar-chart-2-line"></i>
                                <span>Graph</span>
                            </a>
                            <a href="/views/xtraBook.html" class="create-choice-btn">
                                <i class="ri-book-open-line"></i>
                                <span>Book</span>
                            </a>
                            <a href="/views/xtraArticle.html" class="create-choice-btn">
                                <i class="ri-file-text-line"></i>
                                <span>Article</span>
                            </a>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            const studioBtns = document.querySelectorAll('#studioBtn');
            const createModal = document.getElementById('createChoiceModal');
            if (studioBtns.length > 0 && createModal) {
                studioBtns.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
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

    // --- STORY DATA MANAGEMENT ---
    let storyData = JSON.parse(localStorage.getItem('storyData'));
    if (!storyData) {
        console.log("Initializing default story data.");
        storyData = {
            "Your Story": { postId: 1771713975853 },
            "PhysicsWizard": { postId: 1721234567890 },
            "AstroGirl": { postId: 1771713975853 },
            "CodeMaster": { postId: 1721234567890 }
        };
        localStorage.setItem('storyData', JSON.stringify(storyData));
    }

    // ============================================================
    // 0. HELPER FUNCTIONS (NEW)
    // ============================================================
    function deletePost(postId, postTitle) {
        if (confirm(`Are you sure you want to delete "${postTitle}"? This cannot be undone.`)) {
            let allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            const updatedPosts = allPosts.filter(p => p.id !== Number(postId));
            localStorage.setItem('userPosts', JSON.stringify(updatedPosts));
            
            const postElToRemove = document.querySelector(`.feed-post[data-post-id="${postId}"]`);
            if (postElToRemove) {
                // For reels, scroll to next before removing
                if (postElToRemove.parentElement.classList.contains('feed-container') && postElToRemove.parentElement.style.scrollSnapType) {
                    const nextPost = postElToRemove.nextElementSibling;
                    if (nextPost) {
                        nextPost.scrollIntoView({ behavior: 'smooth' });
                        setTimeout(() => postElToRemove.remove(), 300);
                    } else {
                        postElToRemove.remove();
                    }
                } else { // For grid view
                    postElToRemove.style.transition = 'opacity 0.3s ease';
                    postElToRemove.style.opacity = '0';
                    setTimeout(() => postElToRemove.remove(), 300);
                }
            }
        }
    }

    function editPost(postId, postTitle) {
        const newTitle = prompt("Enter new title:", postTitle);
        if (newTitle !== null) {
            let allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            const postIndex = allPosts.findIndex(p => p.id === Number(postId));
            if (postIndex > -1) {
                allPosts[postIndex].title = newTitle;
                localStorage.setItem('userPosts', JSON.stringify(allPosts));

                const postElToUpdate = document.querySelector(`.feed-post[data-post-id="${postId}"]`);
                if (postElToUpdate) {
                    const titleEl = postElToUpdate.querySelector('.post-caption span:last-child') || postElToUpdate.querySelector('.post-caption span');
                    if (titleEl) titleEl.textContent = newTitle;
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

    // --- SAMPLE CONTENT INJECTOR ---
    // If no posts exist, create some beautiful samples to populate the feed.
    function injectSampleContent() {
        const posts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        if (posts.length === 0) {
            console.log("No posts found. Injecting sample content...");
            // This is a mock-up. In a real app, this data would come from a server.
            // We are including two real projects as "sample" content so they appear on all devices.
            const samplePosts = [
                {
                    id: 1771713975853,
                    title: "Physics Engine Test",
                    desc: "A simple physics simulation using Manim and the Pymunk 2D physics library. Shows collision, gravity, and bounce (elasticity).",
                    videoUrl: "https://videos.pexels.com/video-files/3209828/3209828-hd_1080_1920_25fps.mp4",
                    format: "video",
                    timestamp: new Date("2024-07-21T18:30:00Z").toISOString(),
                    source: { engine: 'manim', code: `from manim import *\nimport pymunk\n\nclass PymunkIntegration(Scene):\n    def construct(self):\n        # ... (code omitted for brevity)` },
                    originalId: null,
                },
                {
                    id: 1721234567890,
                    title: "Kinematics Demo",
                    desc: "A simple ball drop animation demonstrating easing functions for realistic motion.",
                    videoUrl: "https://videos.pexels.com/video-files/853877/853877-hd_1080_1920_30fps.mp4",
                    format: "video",
                    timestamp: new Date("2024-07-20T12:00:00Z").toISOString(),
                    source: { engine: 'manim', code: `from manim import *\n\nclass KinematicsTemplate(Scene):\n    def construct(self):\n        ground = Line(LEFT * 3, RIGHT * 3).shift(DOWN * 2)\n        ball = Circle(radius=0.2, color=RED, fill_opacity=1).shift(UP * 2)\n        self.play(Create(ground), FadeIn(ball))\n        self.wait(0.5)\n        self.play(ball.animate.next_to(ground, UP, buff=0), rate_func=rate_functions.ease_out_bounce, run_time=2)\n        self.wait()` },
                    originalId: null,
                }

            ];
            localStorage.setItem('userPosts', JSON.stringify(samplePosts));
            return true; // Indicates that content was injected
        }
        return false;
    }

    // --- PDF.js Renderer for Reels ---
    // Renders a PDF into a scrollable canvas container for a consistent mobile/desktop experience.
    function renderPdfInReel(container, pdfUrl) {
        if (!window.pdfjsLib) {
            container.innerHTML = `<div class="loading-container"><p style="color:orange;">PDF library not loaded.</p></div>`;
            return;
        }

        // Set worker source if not already set
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        container.innerHTML = `<div class="loading-container"><div class="spinner"></div><p>Loading PDF...</p></div>`;

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        loadingTask.promise.then(pdf => {
            container.innerHTML = ''; // Clear loader
            const pageCount = pdf.numPages;

            // Render all pages
            for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
                const canvas = document.createElement('canvas');
                canvas.style.display = "block";
                canvas.style.margin = "0 auto 20px auto"; // Center pages with spacing
                canvas.style.boxShadow = "0 5px 15px rgba(0,0,0,0.5)";
                container.appendChild(canvas);

                pdf.getPage(pageNum).then(page => {
                    const ctx = canvas.getContext('2d');
                    
                    // --- WIDTH-FOCUSED SCALING LOGIC for Reels ---
                    // Goal: Make the PDF page wide and readable, allowing vertical scroll for tall pages.
                    const viewportRaw = page.getViewport({ scale: 1 });

                    // Get available width from the container.
                    const availableWidth = container.clientWidth;

                    // Define horizontal padding. A smaller value makes the content wider.
                    const horizontalPadding = 0; // 10px on each side

                    // Calculate the desired width for the canvas.
                    const desiredWidth = Math.max(availableWidth - horizontalPadding, 280);

                    // Calculate scale based on width only.
                    // Height is not constrained, so tall pages will be scrollable within the container.
                    const scale = Math.min(desiredWidth / viewportRaw.width, 2.0);
                    
                    const viewport = page.getViewport({ scale: scale });
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    const renderContext = { canvasContext: ctx, viewport: viewport };
                    page.render(renderContext);
                });
            }
        }).catch(err => {
            console.error("PDF Load Error in Reel:", err);
            container.innerHTML = `<div class="loading-container" style="color: #ff6b6b;">
                <i class="ri-error-warning-line" style="font-size: 2rem;"></i><br>
                <strong>PDF Preview Failed</strong><br>
                <span style="font-size: 0.8rem; opacity: 0.8;">Could not load document.</span><br>
                <button onclick="window.open('${pdfUrl}', '_blank')" class="btn-primary" style="margin-top: 15px;">Open in New Tab</button>
            </div>`;
        });
    }

    // ============================================================
    // REUSABLE POST ELEMENT CREATOR
    // ============================================================
    function createPostElement(post, viewType) { // viewType can be 'grid' or 'reel'
        const postEl = document.createElement('div');
        postEl.className = 'feed-post';
        postEl.dataset.postId = post.id;
        
        const likeCount = Math.floor(Math.random() * 5000) + 100;

        let mediaHTML = '';
        let backgroundHTML = '';
        const currentPage = viewType === 'reel' ? 'reels.html' : 'explore.html'; // Simulate currentPage for logic

        if (post.format === 'image') { // Handle Graphs
            const kenBurnsClass = currentPage.includes('reels.html') ? 'ken-burns' : '';
            mediaHTML = `<img src="${post.videoUrl}" class="${kenBurnsClass}" style="width: 100%; height: 100%; object-fit: cover; background: #000;">`;
            backgroundHTML = `<div class="reel-background"><img src="${post.videoUrl}"></div>`;
        } else if (post.format === 'pdf') { // Handle Books
            mediaHTML = `<img src="${post.videoUrl}" style="width: 100%; height: 100%; object-fit: cover; background: #000;">`;
            if (currentPage.includes('reels.html') && post.pdfUrl) {
                const fullPdfUrl = post.pdfUrl.startsWith('http') ? post.pdfUrl : `${getBackendUrl()}${post.pdfUrl}`;
                mediaHTML = `<div class="pdf-viewer-container" data-pdf-url="${fullPdfUrl}" style="width: 100%; height: 100%; overflow-y: auto; background: #525659; -webkit-overflow-scrolling: touch;"></div>`;
            }
            backgroundHTML = `<div class="reel-background" style="background: #111;"></div>`;
        } else if (post.format === 'article') {
            if (post.mediaType && post.mediaType.startsWith('video')) {
                const fullVideoUrl = post.videoUrl.startsWith('http') ? post.videoUrl : `${getBackendUrl()}${post.videoUrl}`;
                const hoverEvents = viewType === 'grid' ? `onmouseover="this.play()" onmouseout="this.pause()"` : '';
                mediaHTML = `<video src="${fullVideoUrl}" loop muted playsinline ${hoverEvents}></video>`;
                backgroundHTML = `<div class="reel-background"><video src="${fullVideoUrl}" loop muted playsinline></video></div>`;
            } else {
                mediaHTML = `<img src="${post.videoUrl}" style="width: 100%; height: 100%; object-fit: cover; background: #000;">`;
                backgroundHTML = `<div class="reel-background"><img src="${post.videoUrl}"></div>`;
            }
        } else { // Default to Video
            const fullVideoUrl = post.videoUrl.startsWith('http') ? post.videoUrl : `${getBackendUrl()}${post.videoUrl}`;
            const hoverEvents = viewType === 'grid' ? `onmouseover="this.play()" onmouseout="this.pause()"` : '';
            mediaHTML = `<video src="${fullVideoUrl}" loop muted playsinline ${hoverEvents}></video>`;
            backgroundHTML = `<div class="reel-background"><video src="${fullVideoUrl}" loop muted playsinline></video></div>`;
        }

        if (viewType === 'reel') {
            postEl.innerHTML = `
                ${backgroundHTML}
                <div class="post-media">
                    ${mediaHTML}
                    <div class="post-actions">
                        <button class="icon-btn" data-action="like"><i class="ri-heart-line"></i> <span class="action-count">${likeCount}</span></button>
                        <button class="icon-btn"><i class="ri-chat-3-line"></i> <span class="action-count">${Math.floor(Math.random() * 500) + 10}</span></button>
                        <button class="icon-btn"><i class="ri-send-plane-line"></i> <span class="action-count">${Math.floor(Math.random() * 100) + 5}</span></button>
                        <button class="icon-btn" data-action="remix"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 113.03"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M36.9,23.5h71.13c8.17,0,14.85,6.69,14.85,14.85v59.83c0,8.17-6.69,14.85-14.85,14.85H36.9 c-8.17,0-14.85-6.68-14.85-14.85V38.35C22.05,30.19,28.73,23.5,36.9,23.5L36.9,23.5z M10.08,73.96c0,2.78-2.26,5.04-5.04,5.04 C2.26,79,0,76.74,0,73.96V19.89C0,14.42,2.24,9.44,5.84,5.84C9.44,2.24,14.42,0,19.89,0h65.37c2.78,0,5.04,2.26,5.04,5.04 c0,2.78-2.26,5.04-5.04,5.04H19.89c-2.69,0-5.15,1.1-6.93,2.88c-1.78,1.78-2.88,4.23-2.88,6.93V73.96L10.08,73.96z M54.3,74.03 c-3.18,0-5.76-2.58-5.76-5.76s2.58-5.76,5.76-5.76H66.7V50.1c0-3.18,2.58-5.76,5.76-5.76s5.76,2.58,5.76,5.76v12.41h12.41 c3.18,0,5.76,2.58,5.76,5.76s-2.58,5.76-5.76,5.76H78.23v12.41c0,3.18-2.58,5.76-5.76,5.76s-5.76-2.58-5.76-5.76V74.03H54.3 L54.3,74.03z"/></svg></button>
                        <button class="icon-btn"><svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 513.11"><path fill="currentColor" fill-rule="nonzero" d="M210.48 160.8c0-14.61 11.84-26.46 26.45-26.46s26.45 11.85 26.45 26.46v110.88l73.34 32.24c13.36 5.88 19.42 21.47 13.54 34.82-5.88 13.35-21.47 19.41-34.82 13.54l-87.8-38.6c-10.03-3.76-17.16-13.43-17.16-24.77V160.8zM5.4 168.54c-.76-2.25-1.23-4.64-1.36-7.13l-4-73.49c-.75-14.55 10.45-26.95 25-27.69 14.55-.75 26.95 10.45 27.69 25l.74 13.6a254.258 254.258 0 0136.81-38.32c17.97-15.16 38.38-28.09 61.01-38.18 64.67-28.85 134.85-28.78 196.02-5.35 60.55 23.2 112.36 69.27 141.4 132.83.77 1.38 1.42 2.84 1.94 4.36 27.86 64.06 27.53 133.33 4.37 193.81-23.2 60.55-69.27 112.36-132.83 141.39a26.24 26.24 0 01-12.89 3.35c-14.61 0-26.45-11.84-26.45-26.45 0-11.5 7.34-21.28 17.59-24.92 7.69-3.53 15.06-7.47 22.09-11.8.8-.66 1.65-1.28 2.55-1.86 11.33-7.32 22.1-15.7 31.84-25.04.64-.61 1.31-1.19 2-1.72 20.66-20.5 36.48-45.06 46.71-71.76 18.66-48.7 18.77-104.46-4.1-155.72l-.01-.03C418.65 122.16 377.13 85 328.5 66.37c-48.7-18.65-104.46-18.76-155.72 4.1a203.616 203.616 0 00-48.4 30.33c-9.86 8.32-18.8 17.46-26.75 27.29l3.45-.43c14.49-1.77 27.68 8.55 29.45 23.04 1.77 14.49-8.55 27.68-23.04 29.45l-73.06 9c-13.66 1.66-26.16-7.41-29.03-20.61zM283.49 511.5c20.88-2.34 30.84-26.93 17.46-43.16-5.71-6.93-14.39-10.34-23.29-9.42-15.56 1.75-31.13 1.72-46.68-.13-9.34-1.11-18.45 2.72-24.19 10.17-12.36 16.43-2.55 39.77 17.82 42.35 19.58 2.34 39.28 2.39 58.88.19zm-168.74-40.67c7.92 5.26 17.77 5.86 26.32 1.74 18.29-9.06 19.97-34.41 3.01-45.76-12.81-8.45-25.14-18.96-35.61-30.16-9.58-10.2-25.28-11.25-36.11-2.39a26.436 26.436 0 00-2.55 38.5c13.34 14.2 28.66 27.34 44.94 38.07zM10.93 331.97c2.92 9.44 10.72 16.32 20.41 18.18 19.54 3.63 36.01-14.84 30.13-33.82-4.66-15-7.49-30.26-8.64-45.93-1.36-18.33-20.21-29.62-37.06-22.33C5.5 252.72-.69 262.86.06 274.14c1.42 19.66 5.02 39 10.87 57.83z"/></svg></button>
                        <button class="icon-btn" data-action="save"><i class="ri-bookmark-line"></i></button>
                        <button class="icon-btn post-options-btn-reel"><i class="ri-more-2-fill"></i></button>
                    </div>
                    <div class="post-footer">
                        <div class="post-header">
                            <div class="avatar"></div>
                            <span class="post-username">Dr. Nova</span>
                            <button class="btn-follow-overlay">Follow</button>
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
        } else { // 'grid' view
            let badgeText = '';
            switch (post.format) {
                case 'article': badgeText = 'Article'; break;
                case 'image': badgeText = 'Graph'; break;
                case 'pdf': badgeText = 'Book'; break;
                case 'video':
                case '16:9': // Treat aspect ratios as videos
                case '9:16':
                    badgeText = 'Animation'; 
                    break;
                default: badgeText = post.format || 'Post';
            }

            postEl.innerHTML = `
                <div class="post-media" data-post-id="${post.id}">
                    <div class="post-header">
                        <div class="avatar"></div>
                        <span class="post-username">Dr. Nova</span>
                        <button class="btn-follow-overlay">Follow</button>
                        <button class="post-options-btn"><i class="ri-more-2-fill"></i></button>
                        <div class="post-options-menu">
                            <button class="menu-item" data-action="edit">Edit Details</button>
                            <button class="menu-item menu-item-danger" data-action="delete">Delete Post</button>
                        </div>
                    </div>
                    ${mediaHTML}
                    <div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; font-size: 0.7rem; font-weight: 600; padding: 3px 7px; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.5px; backdrop-filter: blur(4px); z-index: 1;">${badgeText}</div>
                </div>
                <div class="post-actions">
                    <button class="icon-btn" data-action="like"><i class="ri-heart-line"></i> <span class="action-count">${likeCount}</span></button>
                    <button class="icon-btn"><i class="ri-chat-3-line"></i> <span class="action-count">${Math.floor(Math.random() * 500) + 10}</span></button>
                    <button class="icon-btn"><i class="ri-send-plane-line"></i> <span class="action-count">${Math.floor(Math.random() * 100) + 5}</span></button>
                    <button class="icon-btn" style="margin-left: auto;" data-action="save"><i class="ri-bookmark-line"></i></button>
                </div>
                <div class="post-footer">
                    <div class="post-caption">
                        <span class="post-username">${post.originalId ? 'Dr. Nova (Remix)' : 'Dr. Nova'}</span>
                        <span>${post.title}</span>
                    </div>
                </div>
                <div class="like-heart-overlay"></div>
            `;
        }

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
        const video = mediaContainer.querySelector('video');
        
        const pdfContainer = postEl.querySelector('.pdf-viewer-container');
        if (pdfContainer && pdfContainer.dataset.pdfUrl) {
            renderPdfInReel(pdfContainer, pdfContainer.dataset.pdfUrl);
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

        let lastTap = 0;
        mediaContainer.addEventListener('click', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (viewType === 'grid' && tapLength > 300) {
                 setTimeout(() => {
                    if (new Date().getTime() - lastTap > 300) {
                        if (post.format === 'article') { // Use absolute paths for navigation
                            window.location.href = `/views/articleView.html?id=${post.id}`;
                        } else if (post.format === 'pdf') { // Use absolute paths for navigation
                            window.location.href = `/views/bookView.html?id=${post.id}`;
                        } else { // Use absolute paths for navigation
                            window.location.href = `/views/reels.html?id=${post.id}`;
                        }
                    }
                }, 300);
            }

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

        const likeBtn = postEl.querySelector('[data-action="like"]');
        const likeIcon = likeBtn.querySelector('i');
        const likesCountEl = likeBtn.querySelector('.action-count');
        let isLiked = false;
        const baseLikes = parseInt(likesCountEl.textContent);
        likesCountEl.dataset.baseLikes = baseLikes;
        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isLiked = !isLiked;
            likeBtn.classList.toggle('liked', isLiked);
            likeIcon.className = isLiked ? 'ri-heart-fill' : 'ri-heart-line';
            likesCountEl.textContent = baseLikes + (isLiked ? 1 : 0);
            if (isLiked) {
                likeBtn.classList.add('popping');
                setTimeout(() => likeBtn.classList.remove('popping'), 300);
            }
        });

        const remixBtn = postEl.querySelector('[data-action="remix"]');
        if (remixBtn) {
            remixBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (post.source && post.source.engine) {
                    localStorage.setItem('remixMeta', JSON.stringify({ source: post.source, originalId: post.id }));
                    let editorUrl;
                    switch (post.source.engine) { // Use absolute paths for navigation
                        case 'latex': editorUrl = '/views/xtraBook.html'; break;
                        case 'desmos': editorUrl = '/views/xtraGraph.html'; break;
                        default: editorUrl = '/views/xtraAnim.html';
                    }
                    window.location.href = editorUrl;
                } else {
                    if (post.code) { localStorage.setItem('remixMeta', JSON.stringify({ source: { engine: 'manim', code: post.code }, originalId: post.id })); window.location.href = '/views/xtraAnim.html'; }
                    else { alert("No source code available for this post to remix."); }
                }
            });
        }

        const historyBtn = postEl.querySelector('.post-actions button:nth-child(5)');
        if (historyBtn) {
            if (!historyBtn.querySelector('.action-count')) {
                const countSpan = document.createElement('span');
                countSpan.className = 'action-count';
                historyBtn.appendChild(countSpan);
            }
            const historyCountEl = historyBtn.querySelector('.action-count');
            const savedPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            const remixCount = savedPosts.filter(p => p.originalId === post.id).length;
            historyCountEl.textContent = remixCount;
            if (remixCount === 0) historyCountEl.style.display = 'none';
            historyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const rootId = post.originalId || post.id;
                window.location.href = `/views/lineage.html?id=${rootId}`;
            });
        }

        const shareBtn = postEl.querySelector('.ri-send-plane-line')?.closest('.icon-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Add this post to your Story for 24 hours?`)) {
                    // Update the story data
                    storyData["Your Story"] = { postId: post.id };
                    localStorage.setItem('storyData', JSON.stringify(storyData));

                    alert(`Post "${post.title}" has been added to your story.`);
                    const myStoryAvatar = document.querySelector('.story-bar .story-item:first-child .story-avatar');
                    if (myStoryAvatar) {
                        myStoryAvatar.classList.remove('seen');
                    }
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

        return postEl;
    }

    function updateHeader() {
        const userType = localStorage.getItem('userType');
        const username = localStorage.getItem('username');
        // FIX: Make selector more specific to the top header to prevent it from
        // breaking the login and signup pages, which do not have a .top-header.
        let authContainer = document.querySelector('.top-header #auth-buttons');

        if (authContainer) {
            if (userType === 'creator' || userType === 'viewer') {
                // Add notification icon and dropdown
                authContainer.innerHTML = `
                    <div style="position: relative;">
                        <button id="notifyBtn" style="background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 1.5rem;">
                            <i class="ri-notification-3-line"></i>
                        </button>
                        <div id="notifyDropdown" class="glass-card" style="display: none; position: absolute; top: 120%; right: 0; width: 320px; padding: 10px; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
                            <div style="padding: 10px; text-align: center; color: var(--text-muted);">No new notifications.</div>
                        </div>
                    </div>
                `;
                
                const notifyBtn = document.getElementById('notifyBtn');
                const notifyDropdown = document.getElementById('notifyDropdown');

                if (notifyBtn && notifyDropdown) {
                    notifyBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isVisible = notifyDropdown.style.display === 'block';
                        notifyDropdown.style.display = isVisible ? 'none' : 'block';
                    });

                    // Close when clicking outside
                    document.addEventListener('click', (e) => {
                        if (notifyDropdown.style.display === 'block' && !notifyDropdown.contains(e.target) && !notifyBtn.contains(e.target)) {
                            notifyDropdown.style.display = 'none';
                        }
                    });
                    
                    notifyDropdown.addEventListener('click', (e) => e.stopPropagation());
                }
            } else {
                // If no userType, show Login/Signup buttons
                authContainer.innerHTML = `
                    <a href="/views/login.html" class="btn-glass" style="font-size: 0.8rem;">Log In</a>
                    <a href="/views/signup.html" class="btn-primary" style="font-size: 0.8rem;">Sign Up</a>
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

        // C. Update Header (Log In buttons -> Profile) - GLOBAL


        // D. Update Profile Page (if viewing own profile)
        if (currentPage.includes('profile.html')) {
            // Inject sample content if needed
            injectSampleContent();

            const pHandle = document.getElementById('profileHandle');
            const pName = document.getElementById('profileName');
            if (pHandle) pHandle.textContent = userHandle || '@user';
            if (pName) pName.textContent = username || 'User';
            if (userBio) document.querySelector('.profile-bio div:nth-child(3)').textContent = userBio;

            // Cleanup: Remove any legacy modals if they exist in the DOM to prevent conflicts
            const legacyModal = document.getElementById('videoPlayerModal');
            if (legacyModal) legacyModal.remove();

            // F. Inject User Uploaded Posts (from localStorage)
            const savedPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            const profileGrid = document.getElementById('profileGrid');
            
            if (profileGrid) {
                // 1. Tabs are already in HTML (profile.html). We just attach logic.

                const renderPosts = (type) => {
                    profileGrid.innerHTML = '';
                    
                    // Update Tab Styles
                    // Remove active class from all tabs
                    document.querySelectorAll('.insta-tab').forEach(t => t.classList.remove('active'));
                    
                    // Add active class to current tab
                    if (type === 'projects') document.getElementById('tabProjects')?.classList.add('active');
                    if (type === 'remixes') document.getElementById('tabRemixes')?.classList.add('active');
                    if (type === 'saved') document.getElementById('tabSaved')?.classList.add('active');

                    // Filter Logic
                    const filtered = savedPosts.filter(p => {
                        if (type === 'projects') return !p.originalId; // All original uploads
                        if (type === 'remixes') return p.originalId;   // All remixes
                        if (type === 'saved') {
                            // Filter posts that are in the 'savedPosts' list
                            const savedIds = JSON.parse(localStorage.getItem('savedPosts') || '[]');
                            return savedIds.includes(p.id);
                        }
                        return !p.originalId;
                    });

                    if (filtered.length === 0) {
                        profileGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #a1a1aa;">No ${type} found.</div>`;
                        return;
                    }

                    filtered.forEach(post => {
                        const div = document.createElement('div');
                        // Instagram style: Square aspect ratio, relative positioning
                        div.style.aspectRatio = '1/1';
                        div.style.position = 'relative';
                        div.style.cursor = 'pointer';
                        div.style.overflow = 'hidden';
                        
                        let thumbnailHTML = '';
                        if (post.format === 'image') { // Graph posts
                            thumbnailHTML = `<img src="${post.videoUrl}" style="width: 100%; height: 100%; object-fit: cover; background: #000;">`;
                        } else if (post.format === 'pdf') { // Book posts
                            thumbnailHTML = `<img src="${post.videoUrl}" style="width: 100%; height: 100%; object-fit: cover; background: #000;">`;
                        } else if (post.format === 'article') { // Article posts
                        if (post.mediaType && post.mediaType.startsWith('video')) {
                            const fullVideoUrl = post.videoUrl.startsWith('http') ? post.videoUrl : `${getBackendUrl()}${post.videoUrl}`;
                            thumbnailHTML = `<video src="${fullVideoUrl}" muted playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>`;
                        } else {
                            thumbnailHTML = `<img src="${post.videoUrl}" style="width: 100%; height: 100%; object-fit: cover; background: #000;">`;
                        }
                        } else { // Default to video
                            const fullVideoUrl = post.videoUrl.startsWith('http') ? post.videoUrl : `${getBackendUrl()}${post.videoUrl}`;
                            thumbnailHTML = `<video src="${fullVideoUrl}" muted playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>`;
                        }

                        div.innerHTML = `
                            <div class="post-thumbnail" style="width:100%; height:100%; background: #111; position: relative;">
                                ${thumbnailHTML}
                                <div style="position: absolute; top: 8px; right: 8px; color: white; font-size: 1.2rem; text-shadow: 1px 1px 3px rgba(0,0,0,0.7);">${post.originalId ? '<i class="ri-flashlight-fill"></i>' : (post.format === 'image' ? '<i class="ri-bar-chart-fill"></i>' : (post.format === 'pdf' ? '<i class="ri-book-open-fill"></i>' : (post.format === 'article' ? '<i class="ri-file-text-fill"></i>' : '<i class="ri-clapperboard-fill"></i>')))}</div>
                            </div>
                            <div class="post-overlay" style="opacity:0; position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; gap:15px; transition:opacity 0.2s;">
                                <span style="color:white; font-weight:700; font-size: 0.9rem;">${post.title}</span>
                            </div>
                        `;
                        
                        // Hover effect
                        div.onmouseenter = () => {
                            div.querySelector('.post-overlay').style.opacity = '1';
                            const video = div.querySelector('video');
                            if (video) video.play();
                        };
                        div.onmouseleave = () => {
                            div.querySelector('.post-overlay').style.opacity = '0';
                            const video = div.querySelector('video');
                            if (video) video.pause();
                        };

                        div.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Navigate to the correct viewer based on format
                            if (post.format === 'article') { // Use absolute paths for navigation
                                window.location.href = `/views/articleView.html?id=${post.id}`;
                            } else if (post.format === 'pdf') { // Use absolute paths for navigation
                                window.location.href = `/views/bookView.html?id=${post.id}`;
                            } else { // Use absolute paths for navigation
                                window.location.href = `/views/reels.html?id=${post.id}`;
                            }
                        };
                        profileGrid.prepend(div);
                    });
                };

                // Init Tabs
                const tabProjects = document.getElementById('tabProjects');
                const tabRemixes = document.getElementById('tabRemixes');
                const tabSaved = document.getElementById('tabSaved');
                
                // Update click handlers to change hash
                if (tabProjects) tabProjects.onclick = () => { window.location.hash = 'projects'; };
                if (tabRemixes) tabRemixes.onclick = () => { window.location.hash = 'remixes'; };
                if (tabSaved) tabSaved.onclick = () => { window.location.hash = 'saved'; };
                
                // Initial Render based on hash
                const currentHash = window.location.hash.substring(1);
                if (currentHash === 'saved' || currentHash === 'remixes') {
                    renderPosts(currentHash);
                } else {
                    renderPosts('projects'); // Default view
                }

                // Re-render when hash changes (e.g., from back/forward buttons)
                window.onhashchange = () => {
                    const newHash = window.location.hash.substring(1) || 'projects';
                    renderPosts(newHash);
                };
            }
        }

        // E. Update Explore Page (Viewer Feed)
        if (currentPage.includes('explore.html') || currentPage.includes('reels.html')) {
            // Inject sample content if needed
            injectSampleContent();

            // Inject User Posts into Grid
            let savedPosts = JSON.parse(localStorage.getItem('userPosts') || '[]').reverse(); // Show newest first
            
            // --- NEW: Filter posts for Reels page ---
            if (currentPage.includes('reels.html')) {
                savedPosts = savedPosts.filter(post => 
                    post.format !== 'pdf' && post.format !== 'article'
                );
            }

            const exploreFeed = document.getElementById('exploreFeed');
            
            if (exploreFeed && savedPosts.length > 0) {
                exploreFeed.innerHTML = ''; // Clear existing content

                // If on reels page, check for a starting ID and reorder posts
                const urlParams = new URLSearchParams(window.location.search);
                const startId = urlParams.get('id');
                if (startId && currentPage.includes('reels.html')) {
                    const startIndex = savedPosts.findIndex(p => p.id == startId);
                    if (startIndex > -1) {
                        const startPost = savedPosts.splice(startIndex, 1)[0];
                        savedPosts.unshift(startPost); // Move the selected post to the top
                    }
                }

                savedPosts.forEach(post => {
                    const viewType = currentPage.includes('reels.html') ? 'reel' : 'grid';
                    const postEl = createPostElement(post, viewType);
                    exploreFeed.appendChild(postEl);
                });

                // --- AUTOPLAY VIDEOS ON SCROLL (Instagram-style) ---
                const videos = Array.from(exploreFeed.querySelectorAll('video'));
                if (videos.length > 0) {
                    const observerOptions = {
                        root: null, // Use the viewport as the root
                        rootMargin: '0px',
                        threshold: currentPage.includes('reels.html') ? 0.8 : 0.6 // Higher threshold for reels
                    };

                    const videoObserver = new IntersectionObserver((entries, observer) => {
                        entries.forEach(entry => {
                            const video = entry.target;
                            if (entry.isIntersecting) {
                                // Play the video when it enters the viewport
                                const playPromise = video.play();
                                if (playPromise !== undefined) {
                                    playPromise.catch(error => {
                                        // Autoplay was prevented. This is common.
                                        video.muted = true;
                                        video.play();
                                    });
                                }
                            } else {
                                // Pause the video when it leaves the viewport
                                video.pause();
                            }
                        });
                    });

                    // Start observing each video
                    videos.forEach(video => videoObserver.observe(video));
                }

                // --- LAYOUT FIX FOR MOBILE REFRESH ---
                // On mobile, refreshing a scroll-snap page can cause layout issues.
                // This forces the browser to re-evaluate the snap position on load.
                if (currentPage.includes('reels.html')) {
                    setTimeout(() => {
                        const feedContainer = document.getElementById('exploreFeed');
                        if (feedContainer && feedContainer.scrollTop === 0) {
                            feedContainer.scrollTop = 1;
                            feedContainer.scrollTop = 0;
                        }
                    }, 150); // A small delay ensures content is rendered.
                }
            } else if (exploreFeed) {
                exploreFeed.innerHTML = `
                    <div style="text-align: center; padding: 60px; color: #a1a1aa;">
                        <h3>Nothing to see here... yet!</h3>
                        <p>Create your first project in the Studio to see it appear here.</p>
                    </div>`;
            }

            if (userType === 'viewer') {
                // 1. Personalize Hero - REMOVED for Instagram Style
                /*
                const heroLabel = document.querySelector('.hero-content span');
                const heroTitle = document.querySelector('.hero-content h1');
                const heroDesc = document.querySelector('.hero-content p');
                const heroBtn = document.querySelector('.hero-content .btn-primary');
                
                if (heroLabel) heroLabel.textContent = "YOUR DASHBOARD";
                if (heroTitle) heroTitle.innerHTML = `Welcome back, <span style="color:#3b82f6;">${username}</span>`;
                if (heroDesc) heroDesc.textContent = "Catch up on the latest simulations from your subscribed creators.";
                if (heroBtn) heroBtn.innerHTML = '<i class="ri-play-fill"></i> Continue Watching';
                */
            }
        }
    }

    // F. Watch Page Logic (Load Video from ID)
    if (currentPage.includes('watch')) {
        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('id');
        console.log("Watch Page Loaded. ID:", videoId);
        
        if (videoId) {
            const savedPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            // Use loose equality (==) to match string ID from URL with number ID from timestamp
            const post = savedPosts.find(p => p.id == videoId);
            
            if (post) {
                console.log("Found post:", post);
                // 1. Update Player
                let player = document.querySelector('video');
                
                // Fallback: If no video tag found, try to inject one
                if (!player) {
                    const container = document.querySelector('.video-player') || document.querySelector('.video-player-wrapper') || document.querySelector('.main-content');
                    if (container) {
                        if (container.classList.contains('video-player')) {
                            container.innerHTML = `<video controls style="width: 100%; height: 100%; object-fit: contain;"></video>`;
                            player = container.querySelector('video');
                        } else {
                            // Legacy fallback
                            const wrapper = document.createElement('div');
                            wrapper.innerHTML = `<video controls style="width: 100%; aspect-ratio: 16/9; border-radius: 12px; background: black; box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin-bottom: 20px;"></video>`;
                            container.insertBefore(wrapper, container.firstChild);
                            player = wrapper.querySelector('video');
                        }
                    }
                }

                if (player) {
                    // Clear any existing source tags to ensure src attribute works
                    player.innerHTML = '';
                    const fullVideoUrl = post.videoUrl.startsWith('http') ? post.videoUrl : `${getBackendUrl()}${post.videoUrl}`; 
                    player.src = fullVideoUrl;
                    player.load(); // Force reload of the media resource
                    
                    const playPromise = player.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => console.log("Autoplay prevented (User interaction needed):", e));
                    }
                } else {
                    console.error("No <video> element found. Please add a <video> tag to watch.html");
                }

                // 2. Update Text Details
                const title = document.querySelector('h1') || document.querySelector('.video-title');
                const desc = document.querySelector('.video-description') || document.querySelector('.description') || document.querySelector('.video-info p');
                
                if (title) title.textContent = post.title;
                if (desc) desc.textContent = post.desc || "No description provided.";

                // 3. Update Metadata (Channel, Date, Views)
                const channel = document.querySelector('.channel-name') || document.querySelector('.owner-name') || document.querySelector('.channel-info h3');
                const dateEl = document.querySelector('.upload-date') || document.querySelector('.video-meta span');
                const viewsEl = document.querySelector('.view-count');

                if (channel) channel.textContent = "Dr. Nova"; // Default to creator name
                if (dateEl && post.timestamp) {
                    const d = new Date(post.timestamp);
                    dateEl.textContent = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                }
                if (viewsEl) viewsEl.textContent = "1 view";

                // 4. Handle Remix Button
                // Add Save Button Logic
                const actionsContainer = document.querySelector('.video-actions');
                if (actionsContainer && !document.getElementById('saveVideoBtn')) {
                    const saveBtn = document.createElement('button');
                    saveBtn.id = 'saveVideoBtn';
                    saveBtn.className = 'btn-glass';
                    saveBtn.style.marginRight = '10px';
                    
                    // Check if already saved
                    const savedIds = JSON.parse(localStorage.getItem('savedPosts') || '[]');
                    const isSaved = savedIds.includes(post.id);
                    saveBtn.innerHTML = isSaved ? '<i class="ri-bookmark-fill"></i> Saved' : '<i class="ri-bookmark-line"></i> Save';
                    if (isSaved) saveBtn.style.color = '#3b82f6';

                    saveBtn.onclick = () => {
                        const currentSaved = JSON.parse(localStorage.getItem('savedPosts') || '[]');
                        if (currentSaved.includes(post.id)) {
                            const newSaved = currentSaved.filter(id => id !== post.id);
                            localStorage.setItem('savedPosts', JSON.stringify(newSaved));
                            saveBtn.innerHTML = '<i class="ri-bookmark-line"></i> Save';
                            saveBtn.style.color = '';
                        } else {
                            currentSaved.unshift(post.id);
                            localStorage.setItem('savedPosts', JSON.stringify(currentSaved));
                            saveBtn.innerHTML = '<i class="ri-bookmark-fill"></i> Saved';
                            saveBtn.style.color = '#3b82f6';
                        }
                    };
                    // Insert before Remix button or at start
                    actionsContainer.insertBefore(saveBtn, actionsContainer.firstChild);
                }

                const remixBtn = document.getElementById('remixBtn');
                if (remixBtn) {
                    remixBtn.onclick = () => {
                        if (post.source) {
                            localStorage.setItem('remixMeta', JSON.stringify({
                                source: post.source,
                                originalId: post.id,
                            }));
                            
                            let editorUrl;
                            switch (post.source.engine) {
                                case 'latex': editorUrl = '/views/xtraBook.html'; break;
                                case 'desmos': editorUrl = '/views/xtraGraph.html'; break;
                                default: editorUrl = '/views/xtraAnim.html';
                            }
                            window.location.href = editorUrl;
                        } else {
                            alert("No source code available for this video.");
                        }
                    };
                }

                const codePreview = document.querySelector('.code-preview');
                if (codePreview) {
                    // Escape HTML to prevent XSS and wrap in Prism-friendly tags
                    const codeToDisplay = post.source?.code || (post.code || "# No source code available.");
                    const safeCode = (codeToDisplay).replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    codePreview.innerHTML = `<pre class="language-python" style="margin:0; background:transparent;"><code class="language-python">${safeCode}</code></pre>`;
                    if (window.Prism) window.Prism.highlightAll();
                }

                // 6. Show Remixes in Comments (Threaded Tree View)
                const commentsList = document.getElementById('commentsList');
                
                // Recursive function to render remix threads
                // Updated to match "Threads App" style
                const renderRemixTree = (parentId, container, depth = 0) => {
                    // Find posts that are remixes of the current parentId
                    const children = savedPosts.filter(p => p.originalId == parentId);
                    
                    if (children.length === 0) return;

                    children.forEach(remix => {
                        // Create a wrapper for indentation and thread line
                        const threadItem = document.createElement('div');
                        threadItem.className = 'thread-item';
                        if (depth > 0) {
                            threadItem.style.marginLeft = `${depth * 30}px`;
                            // Visual connector for nested items could be added here
                        }

                        threadItem.innerHTML = `
                            <div class="thread-avatar-col">
                                <div class="thread-avatar" style="background: #8b5cf6; display:flex; align-items:center; justify-content:center;"><i class="ri-flashlight-fill"></i></div>
                                <div class="thread-line"></div>
                            </div>
                            <div class="thread-content-col">
                                <div class="thread-header">
                                    <div class="thread-name">Dr. Nova <span style="color: #a1a1aa; font-weight: 400; font-size: 0.85rem;">@novaphysics</span></div>
                                    <div class="thread-meta">Remix</div>
                                </div>
                                <div class="thread-text">
                                    ${remix.desc || 'Created a remix of this simulation.'}
                                    <div style="margin-top: 10px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden; background: black;">
                                        <div style="padding: 10px; background: rgba(255,255,255,0.05); font-size: 0.8rem; color: #a1a1aa; display: flex; justify-content: space-between; align-items: center;">
                                            <span>${remix.title}</span>
                                            <button class="play-toggle btn-glass" style="padding: 2px 8px; font-size: 0.7rem;"><i class="ri-play-fill"></i> Play Preview</button>
                                        </div>
                                        <div class="vid-container" style="display:none;">
                                            <video controls style="width: 100%; aspect-ratio: 16/9; display: block;"></video>
                                        </div>
                                    </div>
                                </div>
                                <div class="thread-actions">
                                    <button class="thread-icon-btn like-btn"><i class="ri-heart-line"></i> <span>0</span></button>
                                    <button class="thread-icon-btn comment-btn"><i class="ri-chat-1-line"></i> <span>Reply</span></button>
                                    <button class="thread-icon-btn remix-action" title="Remix this code"><i class="ri-flashlight-line"></i> <span>Remix</span></button>
                                    <button class="thread-icon-btn share-btn"><i class="ri-share-forward-line"></i></button>
                                </div>
                            </div>
                        `;

                        // 3. Interaction Logic
                        const remixActionBtn = threadItem.querySelector('.remix-action');
                        remixActionBtn.onclick = (e) => {
                            e.stopPropagation();
                            if (remix.source) {
                                localStorage.setItem('remixMeta', JSON.stringify({ // Use absolute paths for navigation
                                    source: remix.source,
                                    originalId: remix.id,
                                }));
                                // For now, all remixes in this view go to the anim editor.
                                window.location.href = '/views/xtraAnim.html';
                            } else {
                                alert("No source code available for this remix.");
                            }
                        };

                        // Like Logic
                        const likeBtn = threadItem.querySelector('.like-btn');
                        likeBtn.onclick = function() {
                            const span = this.querySelector('span');
                            if (this.style.color === 'rgb(239, 68, 68)') {
                                this.style.color = 'white';
                                span.textContent = '0';
                            } else {
                                this.style.color = '#ef4444'; // Red
                                span.textContent = '1';
                            }
                        };

                        // Play Logic
                        const playBtn = threadItem.querySelector('.play-toggle');
                        const vidContainer = threadItem.querySelector('.vid-container');
                        const video = vidContainer.querySelector('video');

                        playBtn.onclick = (e) => {
                            e.stopPropagation();
                            const isHidden = vidContainer.style.display === 'none';
                            vidContainer.style.display = isHidden ? 'block' : 'none';
                            playBtn.innerHTML = isHidden ? '<i class="ri-arrow-down-s-line"></i>' : '<i class="ri-play-fill"></i>';
                            if (isHidden) { video.src = remix.videoUrl; video.play(); } else { video.pause(); }
                        };

                        container.appendChild(threadItem);

                        // Recursively render children of this remix
                        // For visual clarity in "Threads" style, we just append to container but indented
                        renderRemixTree(remix.id, container, depth + 1);
                    });
                };

                // Initial Render Call
                if (commentsList) {
                    const directRemixes = savedPosts.filter(p => p.originalId == videoId);
                    if (directRemixes.length > 0) {
                        // We append remixes at the end or mixed with comments
                        // For now, let's just render them
                        renderRemixTree(videoId, commentsList, 0);
                    }
                }
            } else {
                console.warn("Post not found for ID:", videoId);
                const title = document.querySelector('h1') || document.querySelector('.video-title');
                if (title) title.textContent = "Video Not Found (Check Console)";
            }
        }
    }

    // G. Lineage Page Logic
    if (currentPage.includes('lineage.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const rootId = urlParams.get('id');
        const lineageContainer = document.getElementById('lineageContainer');

        if (rootId && lineageContainer) {
            const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            const rootPost = allPosts.find(p => p.id == rootId);

            if (rootPost) {
                // Build the tree: a flat list starting with the root, then all descendants.
                const lineageTree = [rootPost];
                const toProcess = [rootPost.id];
                const processedIds = new Set([rootPost.id]);

                while (toProcess.length > 0) {
                    const currentId = toProcess.shift();
                    const children = allPosts.filter(p => p.originalId == currentId);
                    for (const child of children) {
                        if (!processedIds.has(child.id)) {
                            lineageTree.push(child);
                            toProcess.push(child.id);
                            processedIds.add(child.id);
                        }
                    }
                }

                // Render the tree
                lineageTree.forEach(post => {
                    const item = document.createElement('div');
                    item.className = 'lineage-thread-item';
                    
                    let thumbnailHTML = '';
                    if (post.format === 'image' || post.format === 'pdf') {
                        // For graphs and books, use the thumbnail image.
                        thumbnailHTML = `<img src="${post.videoUrl}" style="width: 100%; height: 100%; object-fit: cover; background: #000;">`;
                    } else {
                        // Default to video for animations.
                        const fullVideoUrl = post.videoUrl.startsWith('http') ? post.videoUrl : `${getBackendUrl()}${post.videoUrl}`;
                        thumbnailHTML = `<video src="${fullVideoUrl}" muted loop playsinline onmouseover="this.play()" onmouseout="this.pause(); this.currentTime=0;"></video>`;
                    }

                    item.innerHTML = `
                        <div class="lineage-avatar-col">
                            <div class="lineage-avatar">
                                <i class="${post.id == rootId ? 'ri-star-fill' : 'ri-flashlight-fill'}"></i>
                            </div>
                            <div class="lineage-thread-line"></div>
                        </div>
                        <div class="lineage-content-col">
                            <div class="lineage-card ${post.id == rootId ? 'original-post' : ''}">
                                <div class="lineage-thumbnail">
                                    ${thumbnailHTML}
                                </div>
                                <div class="lineage-info">
                                    <h4>${post.title}</h4>
                                    <p>${post.desc || 'No description.'}</p>
                                </div>
                            </div>
                        </div>
                    `;

                    item.querySelector('.lineage-card').onclick = () => {
                        window.location.href = `/views/reels.html?id=${post.id}`;
                    };
                    lineageContainer.appendChild(item);
                });

                // --- AUTOPLAY FOCUSED REEL ---
                const videos = lineageContainer.querySelectorAll('video');
                const scrollContainer = document.querySelector('.dashboard-scroll');

                if (videos.length > 0 && scrollContainer) {
                    const observerOptions = {
                        root: scrollContainer,
                        rootMargin: '0px',
                        threshold: 0.8 // Video must be 80% visible to play
                    };

                    const videoObserver = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            const video = entry.target;
                            if (entry.isIntersecting) {
                                const playPromise = video.play();
                                if (playPromise !== undefined) {
                                    playPromise.catch(() => { /* Autoplay was prevented, user must interact first */ });
                                }
                            } else {
                                video.pause();
                            }
                        });
                    }, observerOptions);

                    // Start observing each video
                    videos.forEach(video => videoObserver.observe(video));
                }
            }
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

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                alert("Login failed: " + error.message);
            } else {
                console.log('Login successful, redirecting...');
                window.location.href = '/views/explore.html'; // Redirect to the main feed
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
    let currentEngine = 'motioncanvas'; // Default engine
    const uploadBtn = document.getElementById('uploadVideoBtn');
    const uploadModal = document.getElementById('uploadModal');
    const confirmUpload = document.getElementById('confirmUpload');

    if (studioEditor && isStudio) {
        const backendUrl = getBackendUrl();

        // --- A. DYNAMICALLY ADD P5.JS ENGINE BUTTONS ---
        const btnMotion = document.getElementById('btn-motion');
        if (btnMotion) {
            const p5Btn = document.createElement('div');
            p5Btn.id = 'btn-p5';
            p5Btn.className = 'engine-option';
            p5Btn.innerHTML = `p5.js`;
            p5Btn.onclick = () => switchEngine('p5');
            // Insert before Motion Canvas button
            btnMotion.parentNode.insertBefore(p5Btn, btnMotion);
        }
        const modalBtnMotion = document.getElementById('modal-btn-motion');
        if (modalBtnMotion) {
            const modalP5Btn = document.createElement('div');
            modalP5Btn.id = 'modal-btn-p5';
            modalP5Btn.className = 'engine-option';
            modalP5Btn.innerHTML = `p5.js`;
            modalP5Btn.onclick = () => switchEngine('p5');
            modalP5Btn.style.flex = '1';
            modalP5Btn.style.textAlign = 'center';
            // Insert before Motion Canvas button
            modalBtnMotion.parentNode.insertBefore(modalP5Btn, modalBtnMotion);
        }
        
        // --- C. Console & Rendering Logic (Moved Up for Scope) ---
        const renderBtn = document.getElementById('renderBtn');
        const consoleLog = document.querySelector('.console-log');

        // --- A. Template Dictionary ---
        const p5Template = `// p5.js sketch: Bouncing Ball
// The 'setup' and 'draw' functions are part of the p5.js library.

function setup() {
  // Creates a 640x360 canvas. This is the drawing area.
  createCanvas(640, 360);
}

// Ball properties
let x = 50;
let y = 50;
let xspeed = 4;
let yspeed = 4;
let radius = 20;

function draw() {
  // Set a dark background for each frame
  background(20); 
  
  // Style the ball
  stroke(255);
  strokeWeight(2);
  fill(59, 130, 246); // XtraPath Blue
  
  // Draw the ball (ellipse)
  ellipse(x, y, radius * 2, radius * 2);
  
  // Move the ball
  x += xspeed;
  y += yspeed;
  
  // Check for collision with walls and reverse direction
  if (x > width - radius || x < radius) {
    xspeed *= -1;
  }
  if (y > height - radius || y < radius) {
    yspeed *= -1;
  }
}`;

        const motionCanvasTemplate = `import {makeScene2D} from '@motion-canvas/2d';
import {Circle, Rect} from '@motion-canvas/2d/lib/components';
import {all} from '@motion-canvas/core/lib/flow';

export default makeScene2D(function* (view) {
  const circle = new Circle({
    x: -300,
    width: 240,
    height: 240,
    fill: '#e13238',
  });

  view.add(circle);

  yield* all(
    circle.position.x(300, 1).to(-300, 1),
    circle.fill('#e6a700', 1).to('#e13238', 1),
  );
});`;

        // --- Motion Canvas Templates (TypeScript) ---
        const motionTemplates = {
            kinematics: motionCanvasTemplate,
            pendulum: `import {makeScene2D} from '@motion-canvas/2d';
import {Circle, Line} from '@motion-canvas/2d/lib/components';

// Pendulum Simulation
// (Client-side preview enabled)
export default makeScene2D(function* (view) {
    // The actual physics simulation runs in the preview window.
    view.add(<Circle width={10} height={10} fill="white" />);
});`,
            spring: `// --- SPRING VIBRATION SIMULATION ---
// Variables available: ctx, canvas, time, width, height

// 1. Clear Screen
ctx.fillStyle = '#141414';
ctx.fillRect(0, 0, width, height);

// 2. Physics Parameters
const anchorX = width / 2;
const anchorY = 50;
const restLength = 150;
const amplitude = 80;
const frequency = 0.1;

// Simple Harmonic Motion
const displacement = Math.sin(time * frequency) * amplitude;
const massY = anchorY + restLength + displacement;

// 3. Draw Spring
ctx.beginPath();
ctx.moveTo(anchorX, anchorY);
const numCoils = 12;
const springLength = massY - anchorY;
const coilHeight = springLength / numCoils;

for (let i = 1; i <= numCoils; i++) {
    const x = anchorX + (i % 2 === 0 ? -1 : 1) * 20;
    const y = anchorY + i * coilHeight - (coilHeight / 2);
    ctx.lineTo(x, y);
    ctx.lineTo(anchorX, anchorY + i * coilHeight);
}
ctx.strokeStyle = '#e4e4e7'; ctx.lineWidth = 2; ctx.stroke();

// 4. Draw Mass
ctx.fillStyle = '#3b82f6';
ctx.fillRect(anchorX - 25, massY, 50, 50);`,
            custom: `// --- CUSTOM ANIMATION (Raw JavaScript) ---
// Variables available: ctx, canvas, time, width, height

// 1. Clear Screen
ctx.fillStyle = '#141414';
ctx.fillRect(0, 0, width, height);

// 2. Draw Something
const x = width / 2 + Math.sin(time * 0.05) * 100;
const y = height / 2 + Math.cos(time * 0.05) * 100;

ctx.beginPath();
ctx.arc(x, y, 20, 0, Math.PI * 2);
ctx.fillStyle = '#3b82f6';
ctx.fill();

// 3. Add Text
ctx.fillStyle = 'white';
ctx.font = '16px sans-serif';
ctx.fillText("Frame: " + time, 20, 30);`
        };

        const thumbnailTemplate = `// --- ARTICLE THUMBNAIL (16:9) ---
// Create a visually interesting background for your article.

ctx.fillStyle = '#0a0a0a';
ctx.fillRect(0, 0, width, height);

for(let i = 0; i < 20; i++) {
    ctx.fillStyle = \`hsla(\${time + i * 20}, 50%, 50%, 0.5)\`;
    ctx.beginPath();
    ctx.arc(
        width / 2 + Math.sin(time * 0.01 + i) * (width/4),
        height / 2 + Math.cos(time * 0.01 + i) * (height/4),
        10 + Math.sin(time * 0.05 + i) * 5, 0, Math.PI * 2
    );
    ctx.fill();
}`;

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
        const savedCode = localStorage.getItem('xtraAnimCode');
        // Only load saved code if we aren't loading a specific template via other means
        if (savedCode && !localStorage.getItem('remixMeta')) {
            studioEditor.value = savedCode;
        }

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
            if(text[text.length-1] === "\n") {
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
            if(highlightPre) {
                highlightPre.scrollTop = studioEditor.scrollTop;
                highlightPre.scrollLeft = studioEditor.scrollLeft;
            }
            if(lineNumbers) {
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
        studioEditor.addEventListener('keydown', function(e) {
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

        window.switchEngine = function(engine, loadTemplate = true) {
            console.log("Switching engine to:", engine);
            if (engine === 'motion') engine = 'motioncanvas';
            currentEngine = engine;
            // --- NEW: Save the selected engine to localStorage ---
            localStorage.setItem('xtraAnimEngine', engine);
            
            const templateSelect = document.getElementById('templateSelect');
            const btnMotion = document.getElementById('btn-motion');
            const btnManim = document.getElementById('btn-manim'); // This was missing
            const modalBtnMotion = document.getElementById('modal-btn-motion');
            const modalBtnManim = document.getElementById('modal-btn-manim');
            const btnP5 = document.getElementById('btn-p5');
            const modalBtnP5 = document.getElementById('modal-btn-p5');
            const filenameDisplay = document.getElementById('filename-display');
            
            if (engine === 'p5') {
                // UI Updates
                if(btnP5) btnP5.classList.add('active');
                if(btnMotion) btnMotion.classList.remove('active');
                if(btnManim) btnManim.classList.remove('active');
                if(filenameDisplay) filenameDisplay.textContent = "sketch.js";
                if(modalBtnP5) modalBtnP5.classList.add('active');
                if(modalBtnMotion) modalBtnMotion.classList.remove('active');
                if(modalBtnManim) modalBtnManim.classList.remove('active');

                // Editor Updates
                if (loadTemplate) {
                    studioEditor.value = p5Template;
                    if(templateSelect) templateSelect.value = ""; // Reset dropdown
                }

                // Syntax Highlighting -> JavaScript
                if(highlightPre) highlightPre.className = "language-javascript";
                if(highlightCode) highlightCode.className = "language-javascript";

                // UI Updates for Preview Area
                if(motionFrame) motionFrame.style.display = 'block';
                if(outputContainer) outputContainer.style.display = 'none';

            } else if (engine === 'motioncanvas') {
                // UI Updates
                if(btnP5) btnP5.classList.remove('active');
                if(btnMotion) btnMotion.classList.add('active');
                if(btnManim) btnManim.classList.remove('active');
                if(filenameDisplay) filenameDisplay.textContent = "main.ts";
                if(modalBtnP5) modalBtnP5.classList.remove('active');
                if(modalBtnMotion) modalBtnMotion.classList.add('active');
                if(modalBtnManim) modalBtnManim.classList.remove('active');

                // Editor Updates
                if (loadTemplate) {
                    studioEditor.value = motionCanvasTemplate;
                    if(templateSelect) templateSelect.value = ""; // Reset dropdown
                }

                // Syntax Highlighting -> TypeScript
                if(highlightPre) highlightPre.className = "language-typescript";
                if(highlightCode) highlightCode.className = "language-typescript";

                // UI Updates for Preview Area
                if(motionFrame) motionFrame.style.display = 'block';
                if(outputContainer) outputContainer.style.display = 'none';

            } else {
                // UI Updates
                if(btnP5) btnP5.classList.remove('active');
                if(btnManim) btnManim.classList.add('active');
                if(btnMotion) btnMotion.classList.remove('active');
                if(filenameDisplay) filenameDisplay.textContent = "main.py";
                if(modalBtnP5) modalBtnP5.classList.remove('active');
                if(modalBtnManim) modalBtnManim.classList.add('active');
                if(modalBtnMotion) modalBtnMotion.classList.remove('active');

                // Editor Updates
                if (loadTemplate) {
                    studioEditor.value = templates.kinematics;
                    if(templateSelect) templateSelect.value = "kinematics";
                }

                // Syntax Highlighting -> Python
                if(highlightPre) highlightPre.className = "language-python";
                if(highlightCode) highlightCode.className = "language-python"; // This was the point of failure
                
                // UI Updates for Preview Area
                if(motionFrame) motionFrame.style.display = 'none';
                if(motionFrame) motionFrame.srcdoc = ''; // Clear previous Motion Canvas preview
                if(outputContainer) outputContainer.style.display = 'flex';
            }
            
            // Refresh Highlight
            updateHighlighting();
            logToConsole(`Switched engine to ${engine === 'manim' ? 'Manim (Python)' : (engine === 'p5' ? 'p5.js (JavaScript)' : 'Motion Canvas (TypeScript)')}`);
        };

        // --- FIX: Consolidated State Restoration on Load ---
        // This logic runs after a short delay to ensure the DOM is fully ready.
        // It correctly prioritizes remix data over saved user state.
        // Use a setTimeout to ensure this runs after the initial browser paint,
        // which can solve tricky UI update race conditions.
        setTimeout(() => {
            // Check for Remix Code from Watch Page (This takes precedence)
            const remixMetaRaw = localStorage.getItem('remixMeta');
            if (remixMetaRaw) {
                const meta = JSON.parse(remixMetaRaw);
                const source = meta.source;
                switchEngine(source.engine || 'manim', false);
                studioEditor.value = source.code;
                remixOriginalId = meta.originalId;
                localStorage.removeItem('remixMeta');
                localStorage.setItem('xtraAnimCode', source.code);
                updateHighlighting();
                logToConsole("Loaded source code for Remix.", 'success');
            } else {
                // No remix. Restore user's last saved engine and code.
                const savedEngine = localStorage.getItem('xtraAnimEngine');
                const savedCodeOnLoad = localStorage.getItem('xtraAnimCode'); // Re-fetch to be safe

                if (savedEngine) {
                    // Restore the engine UI. Load template only if no saved code was found.
                    switchEngine(savedEngine, !savedCodeOnLoad);
                    // If savedCodeOnLoad exists, ensure it's in the editor (it should be from initial load, but double-check)
                    if (savedCodeOnLoad) {
                        studioEditor.value = savedCodeOnLoad;
                    }
                } else {
                    // No saved engine, so this is likely a first visit or cleared cache.
                    // Default to Motion Canvas and load its template.
                    switchEngine('motioncanvas', true);
                }
                updateHighlighting(); // Ensure highlighting is correct after all state is set
            }
        }, 10); // A small delay to ensure the DOM is fully ready for manipulation.

        // --- B. Handle Template Switching ---
        const templateSelect = document.getElementById('templateSelect');
        if (templateSelect) {
            templateSelect.addEventListener('change', function() {
                const key = this.value;
                if (!key) return;

                if (currentEngine === 'motioncanvas') {
                    // Load TypeScript Template
                    if (key === 'thumbnail') studioEditor.value = thumbnailTemplate;
                    if (motionTemplates[key]) studioEditor.value = motionTemplates[key];
                    else studioEditor.value = `// Template '${key}' not available for Motion Canvas.\n// Try 'Pendulum'.\n\n` + motionCanvasTemplate;
                } else {
                    // Load Python Template
                    if (templates[key]) studioEditor.value = templates[key];
                }
                
                // Save the new template to local storage
                localStorage.setItem('xtraAnimCode', studioEditor.value);
                logToConsole(`Loaded template: ${key}`);
                updateHighlighting();
            });
        }

        // Listen for Motion Canvas Recording from Iframe
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'MC_RECORDING_COMPLETE') {
                generatedVideoUrl = event.data.url;
                const uploadBtn = document.getElementById('uploadVideoBtn');
                if (uploadBtn) uploadBtn.style.display = 'block';
                logToConsole("Motion Canvas recording captured. Ready to upload.", 'success');
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

            // If called from the modal, switch to preview tab and close modal
            if (fromModal) {
                // CRITICAL FIX: Ensure the preview tab is shown on mobile.
                if (typeof switchTab === 'function' && window.innerWidth <= 1024) {
                    switchTab('preview');
                }
                const settingsPopup = document.getElementById('settings-popup');
                if (settingsPopup) settingsPopup.style.display = 'none';
            }

            // --- MOTION CANVAS (CLIENT-SIDE PREVIEW) LOGIC ---
            if (currentEngine === 'motioncanvas' || currentEngine === 'p5') { // START of Client-side Block
                const uploadBtn = document.getElementById('uploadVideoBtn');

                // If called from modal, ensure we are on the preview tab
                if (fromModal && window.switchTab) window.switchTab('preview');

                if (uploadBtn) uploadBtn.style.display = 'none';

                logToConsole("Building Client-Side Preview...");
                
                let iframeContent = '';

                if (currentEngine === 'p5') {
                    iframeContent = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"><\/script>
                            <style>
                                body { margin: 0; background: #000; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: white; font-family: sans-serif; }
                                main { /* p5.js creates a <main> tag */ display: flex; align-items: center; justify-content: center; }
                                canvas { border: 1px solid #333; background: #141414; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
                            </style>
                        </head>
                        <body>
                            <script>
                                // User's p5.js code
                                try {
                                    ${code}
                                } catch (e) {
                                    console.error("p5.js execution error:", e);
                                    // Create a canvas to display the error
                                    const errCanvas = document.createElement('canvas');
                                    errCanvas.width = 640; errCanvas.height = 360;
                                    document.body.appendChild(errCanvas);
                                    const ctx = errCanvas.getContext('2d');
                                    ctx.fillStyle = '#141414';
                                    ctx.fillRect(0, 0, 640, 360);
                                    ctx.fillStyle = 'red';
                                    ctx.font = '14px monospace';
                                    ctx.fillText('Error: ' + e.message, 10, 50);
                                }
                            <\/script>
                            <script>
                                // --- RECORDING LOGIC ---
                                // Wait a moment for p5.js to create the canvas
                                setTimeout(() => {
                                    const canvas = document.querySelector('canvas');
                                    if (!canvas) {
                                        console.error("p5.js canvas not found for recording.");
                                        window.parent.postMessage({ type: 'MC_RECORDING_ERROR', message: 'p5.js canvas not found.' }, '*');
                                        return;
                                    }
                                    const stream = canvas.captureStream(30);
                                    let mimeType = 'video/webm';
                                    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4')) {
                                        mimeType = 'video/mp4';
                                    }
                                    
                                    const mediaRecorder = new MediaRecorder(stream, { mimeType });
                                    let chunks = [];

                                    mediaRecorder.ondataavailable = function(e) {
                                        if (e.data.size > 0) chunks.push(e.data);
                                    };

                                    mediaRecorder.onstop = function() {
                                        const blob = new Blob(chunks, { type: mimeType });
                                        const url = URL.createObjectURL(blob);
                                        window.parent.postMessage({ type: 'MC_RECORDING_COMPLETE', url: url }, '*');
                                    };

                                    mediaRecorder.start();
                                    setTimeout(() => {
                                        mediaRecorder.stop();
                                    }, 5000); // Record for 5 seconds
                                }, 100);
                            <\/script>
                        </body>
                        </html>
                    `;
                } else { // Motion Canvas logic
                    logToConsole("Transpiling TypeScript and building Motion Canvas project...");
                    iframeContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; background: #141414; display: flex; align-items: center; justify-content: center; height: 100vh; color: white; font-family: sans-serif; }
        motion-canvas-player { width: 100%; height: 100%; }
        .error-box { color: #ff6b6b; padding: 20px; font-family: monospace; background: #222; border-radius: 8px; max-width: 90%; }
        .error-box h3 { margin-top: 0; }
    </style>
    
    <!-- NEW: Import Map for robust dependency resolution -->
    <script type="importmap">
    {
        "imports": {
            "@motion-canvas/core": "https://esm.sh/@motion-canvas/core@3.11.0?deps=chroma-js@2.4.0",
            "@motion-canvas/core/": "https://esm.sh/@motion-canvas/core@3.11.0/?deps=chroma-js@2.4.0",
            "@motion-canvas/2d": "https://esm.sh/@motion-canvas/2d@3.11.0?deps=chroma-js@2.4.0",
            "@motion-canvas/2d/": "https://esm.sh/@motion-canvas/2d@3.11.0/?deps=chroma-js@2.4.0",
            "@motion-canvas/player": "https://esm.sh/@motion-canvas/player@3.11.0?deps=chroma-js@2.4.0"
        }
    }
    <\/script>

</head>
<body>
    <motion-canvas-player id="player"></motion-canvas-player>

    <!-- 1. Load Sucrase for TS transpilation -->
    <script src="https://unpkg.com/sucrase@3.34.0/dist/index.js"><\/script>
    
    <!-- 2. Load Motion Canvas Player and execute user code -->
    <script type="module">
        // Use a try/catch for the entire module to handle any async errors
        try {
            // Dynamically import player to show a loading message
            document.getElementById('player').textContent = 'Loading Motion Canvas Player...';
            // The importmap will resolve "@motion-canvas/player" to the correct URL
            const playerModule = await import('@motion-canvas/player');
            const player = playerModule.default;

            document.getElementById('player').textContent = 'Loading Core Libraries...';
            const { makeProject } = await import('@motion-canvas/core');

            // This is where the user's TS code will be injected
            const userCodeTS = \`
                ${code}
            \`;

            // 3. Transpile the user's code
            document.getElementById('player').textContent = 'Transpiling TypeScript...';
            let userCodeJS;
            try {
                userCodeJS = sucrase.transform(userCodeTS, {
                    transforms: ["typescript", "imports"],
                    filePath: 'scene.ts' 
                }).code;

                // The import map handles all module resolution now. No string replacement needed.

            } catch (e) {
                console.error("TypeScript Transpilation Error:", e);
                document.body.innerHTML = \`<div class="error-box"><h3>Transpilation Error</h3><pre>\${e.message}</pre></div>\`;
                throw e; // Stop execution
            }

            // 4. Dynamically import the transpiled code as a data URL
            document.getElementById('player').textContent = 'Loading Scene...';
            const sceneModule = await import('data:text/javascript,' + encodeURIComponent(userCodeJS));
            const scene = sceneModule.default;

            if (!scene) {
                throw new Error("Could not find a default export in your scene file. Make sure you have 'export default makeScene2D(...)'");
            }

            // 5. Create and set the project
            const project = makeProject({
                scenes: [scene],
            });

            const playerElement = document.getElementById('player');
            playerElement.project = project;

            // --- Recording Logic ---
            playerElement.addEventListener('present', async () => {
                try {
                    // Wait a short moment for the duration to be calculated
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const duration = playerElement.project.meta.duration.get();
                    // Use a reasonable fallback if duration is 0
                    const recordDuration = (duration > 0 && isFinite(duration)) ? duration : 5;

                    console.log('Starting recording for duration:', recordDuration);

                    const blob = await playerElement.media.capture(
                        'video/webm', 
                        {
                            range: [0, recordDuration]
                        }
                    );
                    const url = URL.createObjectURL(blob);
                    window.parent.postMessage({ type: 'MC_RECORDING_COMPLETE', url: url }, '*');
                } catch (e) {
                    console.error("Recording failed:", e);
                    window.parent.postMessage({ type: 'MC_RECORDING_ERROR', message: e.message }, '*');
                }
            });

        } catch (err) {
            console.error("Motion Canvas Player Error:", err);
            document.body.innerHTML = \`<div class="error-box"><h3>Player Error</h3><pre>\${err.message}</pre><p style="font-size: 0.8em; color: #aaa; margin-top: 10px;">Check the browser console for more details. This could be an error in your code or an issue with loading libraries.</p></div>\`;
        }
    <\/script>
</body>
</html>
`;
                }

                const frame = document.getElementById('motionCanvasPlayer');
                if (frame) {
                    frame.style.display = 'block';
                    
                    if(outputContainer) outputContainer.style.display = 'none';
                    
                    frame.srcdoc = iframeContent;
                    logToConsole("Realtime Motion Canvas preview loaded!", 'success');
                } else {
                    logToConsole("Error: Preview iframe not found in DOM.", 'error');
                }
                return; // CRITICAL: Stop execution for Motion Canvas

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
                if (!isLocal) {
                    alert("Server-side Manim rendering is disabled on the live server.\n\nYou can use the client-side p5.js and Motion Canvas engines, or run the project locally to use Manim.");
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
                    if(previewBtn) {
                        previewBtn.disabled = true;
                        previewBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Checking...`;
                    }
                    logToConsole("Generating layout preview (Fast Mode)...");
                } else {
                    if(renderBtn) renderBtn.innerHTML = `<i class="ri-loader-4-line spin"></i>`;
                    if(startRenderBtn) {
                        startRenderBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Processing...`;
                        startRenderBtn.disabled = true;
                    }
                    logToConsole("Initializing Manim render engine...");
                }
                
                // Clear previous video
                outputContainer.innerHTML = `
                    <div style="text-align: center; color: var(--text-muted);">
                        <div class="spinner" style="font-size: 2rem; margin-bottom: 10px;"><i class="ri-flashlight-fill"></i></div>
                        <p style="font-size: 0.9rem;">${isPreview ? 'Capturing layout...' : 'Rendering frame-by-frame...'}</p>
                    </div>
                `;

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
                    headers: {'Content-Type': 'application/json'},
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

            if(previewBtn) { previewBtn.disabled = false; previewBtn.innerHTML = `<i class="ri-eye-line"></i> Check Layout`; }
            if(startRenderBtn) { startRenderBtn.disabled = false; startRenderBtn.innerHTML = `Start Render`; }
            if(renderBtn) { renderBtn.disabled = false; renderBtn.innerHTML = `<span>▶</span>`; }

            // On mobile, switch to the preview tab automatically
            if (window.innerWidth <= 1024 && typeof switchTab === 'function') switchTab('preview');
            // Auto-switch handled by onclick in HTML now

            if (data.success) {
                if (isPreview && data.imageUrl) {
                        logToConsole("Layout check complete.", 'success');
                        // Fix: Prepend backendUrl if path is relative
                        const fullImageUrl = data.imageUrl.startsWith('http') ? data.imageUrl : `${backendUrl}${data.imageUrl}`;
                        const cacheBust = fullImageUrl + (fullImageUrl.includes('?') ? '&' : '?') + "t=" + Date.now();
                        outputContainer.innerHTML = `
                        <div style="width:100%; height:100%; display:flex; flex-direction:column;">
                            <img src="${cacheBust}" style="width:100%; height:100%; object-fit:contain;">
                            <div style="background:#111; color:#a1a1aa; font-size:0.7rem; padding:5px; text-align:center;">
                                Preview Mode (Last Frame) • Click Run for full video
                            </div>
                        </div>
                    `;
                } else if (data.videoUrl) {
                    logToConsole("Render complete. Output generated.", 'success');
                    // Fix: Prepend backendUrl if path is relative
                    generatedVideoUrl = data.videoUrl.startsWith('http') ? data.videoUrl : `${backendUrl}${data.videoUrl}`;
                    const uploadBtn = document.getElementById('uploadVideoBtn');
                    if(uploadBtn) uploadBtn.style.display = 'block';

                    outputContainer.innerHTML = `
                        <video controls autoplay loop style="width:100%; height:100%; object-fit:contain;">
                            <source src="${generatedVideoUrl}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    `;
                } else {
                        logToConsole("Render finished but no output URL found.", 'error');
                }
            } else {
                logToConsole("Render Failed: " + (data.error || "Unknown error"), 'error');
                if (data.logs) {
                    data.logs.split('\n').forEach(line => {
                        if(line.trim()) logToConsole(line, 'error');
                    });
                }
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
                        if(btn) btn.disabled = false;
                    });
            }, 2000);
        };

        if (renderBtn) {
            // Attach listeners
            renderBtn.addEventListener('click', () => {
                // Show the settings/render modal instead of rendering directly
                // --- CRITICAL FIX ---
                // Before showing the modal, ensure the UI state (like preview panel visibility)
                // matches the currently selected engine.
                if (currentEngine === 'manim') {
                    if(motionFrame) motionFrame.style.display = 'none';
                    if(outputContainer) outputContainer.style.display = 'flex';
                    if(highlightPre) highlightPre.className = "language-python";
                    if(highlightCode) highlightCode.className = "language-python";
                } else {
                    if(motionFrame) motionFrame.style.display = 'block';
                    if(outputContainer) outputContainer.style.display = 'none';
                    if(highlightPre) highlightPre.className = "language-typescript";
                    if(highlightCode) highlightCode.className = "language-typescript";
                }
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

        if (confirmUpload) {
            confirmUpload.addEventListener('click', async () => {
                const title = document.getElementById('videoTitle').value || "Untitled Simulation";
                const desc = document.getElementById('videoDesc').value;

                let finalVideoUrl = generatedVideoUrl;

                // CRITICAL FIX: Only upload if the URL is a local 'blob:'.
                // Manim URLs are already persistent on the server.
                if (generatedVideoUrl && generatedVideoUrl.startsWith('blob:')) {
                    // Show loading state
                    const originalBtnText = confirmUpload.innerText;
                    confirmUpload.innerHTML = `<i class="ri-loader-4-line spin"></i> Uploading...`;
                    confirmUpload.disabled = true;

                    try {
                        const blob = await fetch(generatedVideoUrl).then(r => r.blob());
                        const formData = new FormData();
                        formData.append('file', blob, 'motion_canvas_recording.webm');

                        const res = await fetch(`${backendUrl}/api/upload`, {
                            method: 'POST',
                            body: formData
                        });
                        const data = await res.json();
                        if (data.url) {
                            finalVideoUrl = data.url;
                        }
                    } catch (e) {
                        console.error("Upload failed", e);
                        alert("Failed to upload video to server. It may not play after reload.");
                    } finally {
                        confirmUpload.innerHTML = originalBtnText;
                        confirmUpload.disabled = false;
                    }
                }
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("You must be logged in to publish.");
                uploadModal.style.display = 'none';
                return;
            }

            const newPostData = {
                    title: title,
                    desc: desc,
                    videoUrl: finalVideoUrl,
                format: window.currentRenderFormat || '16:9',
                    source: { // The new generalized source object
                        engine: currentEngine,
                        code: studioEditor.value
                    },
                    originalId: remixOriginalId, // Link to original video if remix
                user_id: user.id, // Associate post with the logged-in user
                pdfUrl: '' // Provide a default empty value for the non-nullable column
                };

            const { data, error } = await supabase
                .from('posts')
                .insert([newPostData])
                .select();

            if (error) {
                console.error("Error publishing post:", error);
                alert("Could not publish post: " + error.message);
            } else {
                // Add the newly created post to the local cache so it appears immediately.
                const newPost = data[0];
                const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                allPosts.push(newPost);
                localStorage.setItem('userPosts', JSON.stringify(allPosts));

                uploadModal.style.display = 'none';
                if(confirm('Video published! Go to profile?')) {
                    window.location.href = '/views/profile.html';
                }
            }
            });
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
                if(w && h) {
                    // In a real app, store this value
                    if(consoleLog) logToConsole(`Resolution set to ${w}x${h}`);
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
            subscribeBtn.addEventListener('click', function() {
                if (this.classList.contains('active')) {
                    // Unsubscribe
                    this.classList.remove('active');
                    this.innerText = 'Subscribe';
                    this.style.background = '';
                    this.style.color = '';
                } else {
                    // Subscribe
                    this.classList.add('active');
                    this.innerText = 'Subscribed';
                    this.style.background = 'rgba(255,255,255,0.1)';
                    this.style.color = '#d4d4d8';
                }
            });
        }

        if (likeBtn) {
            likeBtn.addEventListener('click', function() {
                // Simple toggle logic
                if (this.style.background.includes('3b82f6')) {
                    this.style.background = '';
                    this.innerHTML = '<i class="ri-thumb-up-line"></i> 1.2K';
                } else {
                    this.style.background = 'rgba(59, 130, 246, 0.3)';
                    this.innerHTML = '<i class="ri-thumb-up-fill"></i> 1.2K'; // In real app, increment number
                }
                // Reset dislike
                if(dislikeBtn) dislikeBtn.style.background = '';
            });
        }

        if (dislikeBtn) {
            dislikeBtn.addEventListener('click', function() {
                if (this.style.background.includes('white')) {
                    this.style.background = '';
                } else {
                    this.style.background = 'rgba(255, 255, 255, 0.2)';
                }
                // Reset like
                if(likeBtn) likeBtn.style.background = '';
            });
        }
    }

    if (postCommentBtn && commentInput && commentsList) {
        postCommentBtn.addEventListener('click', () => {
            const text = commentInput.value.trim();
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
            threadItem.querySelector('.like-btn').onclick = function() {
                const span = this.querySelector('span');
                if (this.style.color === 'rgb(239, 68, 68)') { this.style.color = 'white'; span.textContent = '0'; }
                else { this.style.color = '#ef4444'; span.textContent = '1'; }
            };

            commentsList.prepend(threadItem);
            commentInput.value = '';
        });
    }

    // --- B. Community Upvotes ---
    const upvoteBoxes = document.querySelectorAll('.upvote-box');
    upvoteBoxes.forEach(box => {
        box.addEventListener('click', function() {
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
    window.openUserList = function(type) {
        const modal = document.getElementById('userListModal');
        const title = document.getElementById('userListTitle');
        const content = document.getElementById('userListContent');
        
        if(modal && title && content) {
            title.innerText = type;
            modal.style.display = 'block';
            
            // Mock Data Generation
            let html = '';
            for(let i=0; i<8; i++) {
                html += `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: #333;"></div>
                            <span style="font-size: 0.9rem; color: white;">User_${Math.floor(Math.random()*1000)}</span>
                        </div>
                        <button class="btn-glass" style="padding: 4px 12px; font-size: 0.75rem;">${type === 'Following' ? 'Following' : 'Follow'}</button>
                    </div>
                `;
            }
            content.innerHTML = html;
        }
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
    // 8. STORY VIEWER LOGIC
    // ============================================================
    const storyViewer = document.getElementById('storyViewer');
    const storyItems = document.querySelectorAll('.story-item');

    if (storyViewer && storyItems.length > 0) {
        const closeBtn = document.getElementById('closeStoryViewer');
        const viewerAvatar = document.getElementById('storyViewerAvatar');
        const viewerUsername = document.getElementById('storyViewerUsername');
        const progressFill = document.getElementById('storyProgressFill');
        let storyTimeout;

        const openStory = (item) => {
            // 1. Get data from the clicked story item
            const avatarSrc = item.querySelector('.story-avatar-inner img').src;
            const username = item.dataset.username || item.querySelector('.story-username').textContent;
            
            const storyInfo = storyData[username];
            const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            const post = storyInfo ? allPosts.find(p => p.id == storyInfo.postId) : null;

            if (!post) {
                console.error("Story Error: Post not found for ID:", storyInfo.postId);
                alert("This story could not be loaded.");
                return;
            }

            // 2. Populate the viewer header
            viewerAvatar.src = avatarSrc;
            viewerUsername.textContent = username;
            
            // 3. Render a simple media preview card
            const storyContentContainer = storyViewer.querySelector('.story-content');
            storyContentContainer.innerHTML = ''; // Clear previous content

            let mediaEl;
            let isVideo = false;

            if (post.format === 'image' || post.format === 'pdf') {
                mediaEl = document.createElement('img');
                mediaEl.src = post.videoUrl; // videoUrl is the thumbnail
            } else {
                isVideo = true;
                mediaEl = document.createElement('video');
                const fullVideoUrl = post.videoUrl.startsWith('http') ? post.videoUrl : `${getBackendUrl()}${post.videoUrl}`;
                mediaEl.src = fullVideoUrl;
                mediaEl.autoplay = true;
                mediaEl.loop = false; // Stories advance, they don't loop
                mediaEl.muted = true;
                mediaEl.playsinline = true;
            }
            
            mediaEl.style.width = '100%';
            mediaEl.style.height = '100%';
            mediaEl.style.objectFit = 'cover';
            storyContentContainer.appendChild(mediaEl);

            // Mark story as seen
            const storyAvatar = item.querySelector('.story-avatar');
            if (storyAvatar) storyAvatar.classList.add('seen');
            
            // 4. Show the viewer
            storyViewer.style.display = 'flex';
            document.body.classList.add('story-open');

            // 5. Start progress bar animation
            progressFill.style.transition = 'none';
            progressFill.style.width = '0%';
            void progressFill.offsetWidth; // Force reflow

            const startProgressBar = (duration) => {
                progressFill.style.transition = `width ${duration}s linear`;
                progressFill.style.width = '100%';
                clearTimeout(storyTimeout);
                storyTimeout = setTimeout(closeStory, duration * 1000);
            };

            if (isVideo) {
                mediaEl.play().catch(e => console.log("Story video autoplay prevented."));
                
                const setVideoDuration = () => {
                    const duration = (mediaEl.duration > 0 && isFinite(mediaEl.duration)) ? mediaEl.duration : 5;
                    startProgressBar(duration);
                };

                mediaEl.addEventListener('canplay', setVideoDuration);
                // Fallback in case 'canplay' doesn't fire
                setTimeout(() => {
                    if (progressFill.style.width !== '100%') {
                        setVideoDuration();
                    }
                }, 300);
            } else {
                // It's an image, use a fixed 5-second duration
                startProgressBar(5);
            }
        };

        const closeStory = () => {
            clearTimeout(storyTimeout);
            storyViewer.style.display = 'none';
            document.body.classList.remove('story-open');
            progressFill.style.width = '0%'; // Reset progress
        };

        storyItems.forEach(item => item.addEventListener('click', () => openStory(item)));
        closeBtn.addEventListener('click', closeStory);
        storyViewer.addEventListener('click', (e) => { if (e.target === storyViewer) closeStory(); });
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
    // 10. COMMENT MODAL LOGIC
    // ============================================================
    const commentModal = document.getElementById('commentModal');
    let currentPostIdForComments = null;

    function openCommentModal(postId) {
        if (!commentModal) return;
        currentPostIdForComments = postId;
        
        const commentListContainer = document.getElementById('commentListContainer');
        commentListContainer.innerHTML = ''; // Clear old comments

        // Load comments from localStorage
        const allComments = JSON.parse(localStorage.getItem('postComments') || '{}');
        const postComments = allComments[postId] || [];

        if (postComments.length === 0) {
            commentListContainer.innerHTML = '<p style="text-align: center; color: #a1a1aa; padding-top: 20px;">No comments yet.</p>';
        } else {
            postComments.forEach(comment => {
                const commentEl = createCommentElement(comment);
                commentListContainer.appendChild(commentEl);
            });
        }

        commentModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    function closeCommentModal() {
        if (!commentModal) return;
        commentModal.style.display = 'none';
        document.body.style.overflow = ''; // Restore background scroll
        currentPostIdForComments = null;
    }

    function createCommentElement(comment) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'comment-item';

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'comment-avatar';

        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'comment-body';

        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'username';
        usernameSpan.textContent = comment.username;

        const textDiv = document.createElement('div');
        textDiv.className = 'text';

        textDiv.textContent = comment.text;

        bodyDiv.appendChild(usernameSpan);
        bodyDiv.appendChild(textDiv);
        itemDiv.appendChild(avatarDiv);
        itemDiv.appendChild(bodyDiv);

        return itemDiv;
    }

    if (commentModal) {
        document.getElementById('closeCommentModal').addEventListener('click', closeCommentModal);
        commentModal.addEventListener('click', (e) => { if (e.target === commentModal) closeCommentModal(); });

        document.getElementById('postCommentBtn').addEventListener('click', () => {
            const commentInput = document.getElementById('commentInput');
            const text = commentInput.value.trim();
            if (!text || !currentPostIdForComments) return;

            const newComment = { username: localStorage.getItem('username') || 'You', text: text };
            const allComments = JSON.parse(localStorage.getItem('postComments') || '{}');
            if (!allComments[currentPostIdForComments]) allComments[currentPostIdForComments] = [];
            allComments[currentPostIdForComments].push(newComment);
            localStorage.setItem('postComments', JSON.stringify(allComments));

            const commentListContainer = document.getElementById('commentListContainer');
            if (commentListContainer.querySelector('p')) commentListContainer.innerHTML = '';
            const newCommentEl = createCommentElement(newComment);
            commentListContainer.appendChild(newCommentEl);
            commentInput.value = '';
        });
    }
});