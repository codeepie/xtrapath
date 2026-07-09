document.addEventListener('DOMContentLoaded', () => {
    
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
                { name: 'Home',    icon: 'ri-home-line',           activeIcon: 'ri-home-fill',           link: 'explore.html' },
                { name: 'Reels',   icon: 'ri-video-line',          activeIcon: 'ri-video-fill',          link: 'reels.html' },
                { name: 'Studio',  icon: 'ri-add-line',            activeIcon: 'ri-add-fill',            link: '#', id: 'studioBtn' },
                { name: 'Store',   icon: 'ri-shopping-bag-line',   activeIcon: 'ri-shopping-bag-fill',   link: 'store.html' },
                { name: 'Profile', icon: 'ri-user-line',           activeIcon: 'ri-user-fill',           link: 'profile.html' }
            ];

            const currentPath = window.location.pathname;
            const sidebarNav = document.querySelector('.sidebar .nav-links');
            const bottomNavContainer = document.querySelector('.bottom-nav');

            // Clear existing static links
            if (sidebarNav) sidebarNav.innerHTML = '';
            if (bottomNavContainer) bottomNavContainer.innerHTML = '';
            
            pages.forEach(page => {
                const isActive = currentPath.includes(page.link);
                const iconClass = isActive ? page.activeIcon : page.icon;

                // Create Sidebar Link (Desktop)
                if (sidebarNav) {
                    const a = document.createElement('a');
                    a.className = `nav-item ${isActive ? 'active' : ''}`;
                    a.href = page.link;
                    if (page.id) a.id = page.id;
                    a.innerHTML = `<i class="${iconClass}"></i> <span>${page.name}</span>`;
                    sidebarNav.appendChild(a);
                }

                // Create Bottom Nav Link (Mobile)
                if (bottomNavContainer) {
                    const a = document.createElement('a');
                    a.className = `bottom-nav-item ${isActive ? 'active' : ''}`;
                    a.href = page.link;
                    if (page.id) a.id = page.id; // Keep ID for modal logic if needed
                    a.innerHTML = `<span class="bottom-nav-icon"><i class="${iconClass}"></i></span>`;
                    bottomNavContainer.appendChild(a);
                }
            });

            // Inject and handle the "Create Choice" modal
            const modalHTML = `
                <div id="createChoiceModal" class="create-choice-overlay">
                    <div class="create-choice-modal glass-card">
                        <h3 style="text-align: center; margin-bottom: 25px; color: white;">Create New</h3>
                        <div class="create-choice-grid">
                            <a href="xtraAnim.html" class="create-choice-btn">
                                <i class="ri-movie-2-line"></i>
                                <span>Animation</span>
                            </a>
                            <a href="xtraGraph.html" class="create-choice-btn">
                                <i class="ri-bar-chart-2-line"></i>
                                <span>Graph</span>
                            </a>
                            <a href="xtraBook.html" class="create-choice-btn">
                                <i class="ri-book-open-line"></i>
                                <span>Book</span>
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

    // ============================================================
    // 0. ACCESS CONTROL & USER TYPE MANAGEMENT
    // ============================================================
    const userType = localStorage.getItem('userType');
    const username = localStorage.getItem('username');
    const userHandle = localStorage.getItem('handle');
    const currentPage = window.location.pathname;
    const userBio = localStorage.getItem('userBio');

    // --- URL HELPER ---
    // Centralizes logic for determining the backend server address.
    function getBackendUrl() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:8000';
        } else if (window.location.port === '8000') {
            // If serving from the backend port, use relative paths.
            return ""; 
        } else {
            // If serving from a different frontend port (e.g., Live Server), point to the backend.
            return `${window.location.protocol}//${window.location.hostname}:8000`;
        }
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
                    videoUrl: "/media/videos/scene_proj_1771105658215_518_1771713975_853d/PymunkIntegration/480p15/PymunkIntegration.mp4",
                    format: "16:9",
                    timestamp: new Date("2024-07-21T18:30:00Z").toISOString(),
                    code: `from manim import *\nimport pymunk\n\nclass PymunkIntegration(Scene):\n    def construct(self):\n        space = pymunk.Space()\n        space.gravity = (0, -9.81)\n        floor_body = space.static_body\n        floor_shape = pymunk.Segment(floor_body, (-6, -1), (6, -4), 0.1)\n        floor_shape.elasticity = 0.8\n        space.add(floor_shape)\n        floor_line = Line([-6, -1, 0], [6, -4, 0], stroke_width=10, color=BLUE)\n        self.add(floor_line)\n        # ... (rest of the physics code)`,
                    originalId: null,
                    engine: "manim"
                },
                {
                    id: 1721234567890,
                    title: "Kinematics Demo",
                    desc: "A simple ball drop animation demonstrating easing functions for realistic motion.",
                    videoUrl: "/media/videos/scene_default/KinematicsTemplate/480p15/KinematicsTemplate.mp4",
                    format: "16:9",
                    timestamp: new Date("2024-07-20T12:00:00Z").toISOString(),
                    code: `from manim import *\n\nclass KinematicsTemplate(Scene):\n    def construct(self):\n        ground = Line(LEFT * 3, RIGHT * 3).shift(DOWN * 2)\n        ball = Circle(radius=0.2, color=RED, fill_opacity=1).shift(UP * 2)\n        self.play(Create(ground), FadeIn(ball))\n        self.wait(0.5)\n        self.play(ball.animate.next_to(ground, UP, buff=0), rate_func=rate_functions.ease_out_bounce, run_time=2)\n        self.wait()`,
                    originalId: null,
                    engine: "manim"
                }

            ];
            localStorage.setItem('userPosts', JSON.stringify(samplePosts));
            return true; // Indicates that content was injected
        }
        return false;
    }

    function updateHeader() {
        const userType = localStorage.getItem('userType');
        const username = localStorage.getItem('username');
        let authContainer = document.getElementById('auth-buttons');

        // Fallback: If ID not found, look for the container with the Login button
        if (!authContainer) {
            const loginBtn = document.querySelector('a[href="login.html"]');
            if (loginBtn) {
                authContainer = loginBtn.parentElement;
            }
        }

        if (authContainer) {
            if (userType === 'creator' || userType === 'viewer') {
                // Remove the profile icon and dropdown entirely for a cleaner look
                authContainer.innerHTML = '';
            } else {
                // If no userType, show Login/Signup buttons
                authContainer.innerHTML = `
                    <a href="login.html" class="btn-glass" style="font-size: 0.8rem;">Log In</a>
                    <a href="signup.html" class="btn-primary" style="font-size: 0.8rem;">Sign Up</a>
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
                            // Filter posts that are in the 'savedVideos' list
                            const savedIds = JSON.parse(localStorage.getItem('savedVideos') || '[]');
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
                        
                        const fullVideoUrl = post.videoUrl.startsWith('http') ? post.videoUrl : `${getBackendUrl()}${post.videoUrl}`;

                        div.innerHTML = `
                            <div class="post-thumbnail" style="width:100%; height:100%; background: #111; position: relative;">
                                <video src="${fullVideoUrl}" muted playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
                                <div style="position: absolute; top: 8px; right: 8px; color: white; font-size: 1.2rem; text-shadow: 1px 1px 3px rgba(0,0,0,0.7);">${post.originalId ? '<i class="ri-flashlight-fill"></i>' : '<i class="ri-clapperboard-fill"></i>'}</div>
                            </div>
                            <div class="post-overlay" style="opacity:0; position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; gap:15px; transition:opacity 0.2s;">
                                <span style="color:white; font-weight:700; font-size: 0.9rem;">${post.title}</span>
                            </div>
                        `;
                        
                        // Hover effect
                        div.onmouseenter = () => div.querySelector('.post-overlay').style.opacity = '1';
                        div.onmouseleave = () => div.querySelector('.post-overlay').style.opacity = '0';

                        div.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Navigate to the new Reels feed, passing the post ID
                            window.location.href = `reels.html?id=${post.id}`;
                        };
                        profileGrid.prepend(div);
                    });
                };

                // Init Tabs
                const tabProjects = document.getElementById('tabProjects');
                const tabRemixes = document.getElementById('tabRemixes');
                const tabSaved = document.getElementById('tabSaved');
                if (tabProjects) tabProjects.onclick = () => renderPosts('projects');
                if (tabRemixes) tabRemixes.onclick = () => renderPosts('remixes');
                if (tabSaved) tabSaved.onclick = () => renderPosts('saved');
                
                // Initial Render
                renderPosts('projects');
            }
        }

        // E. Update Explore Page (Viewer Feed)
        if (currentPage.includes('explore.html') || currentPage.includes('reels.html')) {
            // Inject sample content if needed
            injectSampleContent();

            // Inject User Posts into Grid
            const savedPosts = JSON.parse(localStorage.getItem('userPosts') || '[]').reverse(); // Show newest first
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
                    const postEl = document.createElement('div');
                    postEl.className = 'feed-post';
                    
                    const fullVideoUrl = post.videoUrl.startsWith('http') ? post.videoUrl : `${getBackendUrl()}${post.videoUrl}`;
                    const likeCount = Math.floor(Math.random() * 5000) + 100;

                    // Use different HTML structure for Reels vs. Explore
                    if (currentPage.includes('reels.html')) {
                        postEl.innerHTML = `
                            <div class="post-media">
                                <video src="${fullVideoUrl}" loop muted playsinline></video>
                                <!-- Actions and Footer are now INSIDE the media container -->
                                <div class="post-actions">
                                    <button class="icon-btn"><i class="ri-heart-line"></i> <span class="action-count">${likeCount}</span></button>
                                    <button class="icon-btn"><i class="ri-chat-3-line"></i> <span class="action-count">${Math.floor(Math.random() * 500) + 10}</span></button>
                                    <button class="icon-btn"><i class="ri-send-plane-line"></i> <span class="action-count">${Math.floor(Math.random() * 100) + 5}</span></button>
                                    <button class="icon-btn"><i class="ri-bookmark-line"></i></button>
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
                                <div class="like-heart-overlay"></div>
                            </div>
                        `;
                    } else { // Original Explore Feed HTML
                        postEl.innerHTML = `
                            <div class="post-media" data-post-id="${post.id}">
                                <div class="post-header">
                                    <div class="avatar"></div>
                                    <span class="post-username">Dr. Nova</span>
                                    <button class="btn-follow-overlay">Follow</button>
                                </div>
                                <video src="${fullVideoUrl}" loop muted playsinline></video>
                            </div>
                            <div class="post-actions">
                                <button class="icon-btn"><i class="ri-heart-line"></i> <span class="action-count">${likeCount}</span></button>
                                <button class="icon-btn"><i class="ri-chat-3-line"></i> <span class="action-count">${Math.floor(Math.random() * 500) + 10}</span></button>
                                <button class="icon-btn"><i class="ri-send-plane-line"></i> <span class="action-count">${Math.floor(Math.random() * 100) + 5}</span></button>
                                <button class="icon-btn" style="margin-left: auto;"><i class="ri-bookmark-line"></i></button>
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

                    const mediaContainer = postEl.querySelector('.post-media');
                    const video = mediaContainer.querySelector('video');

                    // --- PROFESSIONAL INTERACTIONS ---
                    let lastTap = 0;
                    mediaContainer.addEventListener('click', (e) => {
                        const currentTime = new Date().getTime();
                        const tapLength = currentTime - lastTap;
                        
                        // On explore page, single tap should navigate to reels
                        if (currentPage.includes('explore.html') && tapLength > 300) {
                             setTimeout(() => {
                                if (new Date().getTime() - lastTap > 300) window.location.href = `reels.html?id=${post.id}`;
                            }, 300);
                        }

                        if (tapLength < 300 && tapLength > 0) {
                            // --- DOUBLE TAP: LIKE ---
                            e.preventDefault();
                            
                            // Trigger heart animation on video
                            const heartOverlay = postEl.querySelector('.like-heart-overlay');
                            if (heartOverlay) {
                                heartOverlay.innerHTML = '<i class="ri-heart-fill"></i>'; // Add icon on tap
                                heartOverlay.classList.add('popping');
                                setTimeout(() => heartOverlay.classList.add('fade-out'), 100);
                                setTimeout(() => {
                                    heartOverlay.classList.remove('popping', 'fade-out');
                                }, 600);
                            }

                            // Trigger the like button's logic if it's not already liked
                            const likeBtn = postEl.querySelector('.post-actions .icon-btn:nth-child(1)');
                            if (likeBtn && !likeBtn.classList.contains('liked')) {
                                likeBtn.click();
                            }

                        } else {
                            // --- SINGLE TAP: PLAY/PAUSE ---
                            // Use a short timeout to distinguish from double-tap
                            setTimeout(() => {
                                // Only play/pause on the reels page
                                if (currentPage.includes('reels.html') && (new Date().getTime() - lastTap > 300)) {
                                    if (video.paused) video.play(); else video.pause();
                                }
                            }, 300);
                        }
                        lastTap = currentTime;
                    });

                    // --- LIKE BUTTON LOGIC ---
                    const likeBtn = postEl.querySelector('.post-actions .icon-btn:nth-child(1)');
                    const likeIcon = likeBtn.querySelector('i');
                    const likesCountEl = likeBtn.querySelector('.action-count');
                    
                    let isLiked = false;
                    // Use a data attribute to store the base number of likes
                    const baseLikes = parseInt(likesCountEl.textContent);
                    likesCountEl.dataset.baseLikes = baseLikes;

                    likeBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent click from bubbling up to the post-media div
                        isLiked = !isLiked;
                        
                        likeBtn.classList.toggle('liked', isLiked);
                        likeIcon.className = isLiked ? 'ri-heart-fill' : 'ri-heart-line';
                        likesCountEl.textContent = baseLikes + (isLiked ? 1 : 0);

                        if (isLiked) {
                            // Add the animation class and remove it after the animation completes
                            likeBtn.classList.add('popping');
                            setTimeout(() => {
                                likeBtn.classList.remove('popping');
                            }, 300);
                        }
                    });

                    exploreFeed.appendChild(postEl);
                });

                // --- AUTOPLAY VIDEOS ON SCROLL (Instagram-style) ---
                const videos = exploreFeed.querySelectorAll('video');
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
                                    // We can mute the video and try again, as muted videos are usually allowed to autoplay.
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
                    const savedIds = JSON.parse(localStorage.getItem('savedVideos') || '[]');
                    const isSaved = savedIds.includes(post.id);
                    saveBtn.innerHTML = isSaved ? '<i class="ri-bookmark-fill"></i> Saved' : '<i class="ri-bookmark-line"></i> Save';
                    if (isSaved) saveBtn.style.color = '#3b82f6';

                    saveBtn.onclick = () => {
                        const currentSaved = JSON.parse(localStorage.getItem('savedVideos') || '[]');
                        if (currentSaved.includes(post.id)) {
                            const newSaved = currentSaved.filter(id => id !== post.id);
                            localStorage.setItem('savedVideos', JSON.stringify(newSaved));
                            saveBtn.innerHTML = '<i class="ri-bookmark-line"></i> Save';
                            saveBtn.style.color = '';
                        } else {
                            currentSaved.push(post.id);
                            localStorage.setItem('savedVideos', JSON.stringify(currentSaved));
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
                        if (post.code) {
                            localStorage.setItem('remixMeta', JSON.stringify({
                                code: post.code,
                                originalId: post.id,
                                engine: post.engine || 'manim'
                            }));
                            window.location.href = 'xtraAnim.html';
                        } else {
                            alert("No source code available for this video.");
                        }
                    };
                }

                // 5. Update Source Code Preview
                const codePreview = document.querySelector('.code-preview');
                if (codePreview) {
                    // Escape HTML to prevent XSS and wrap in Prism-friendly tags
                    const safeCode = (post.code || "# No source code available.").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
                            if (remix.code) {
                                localStorage.setItem('remixMeta', JSON.stringify({
                                    code: remix.code,
                                    originalId: remix.id,
                                    engine: remix.engine || 'manim'
                                }));
                                window.location.href = 'xtraAnim.html';
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

    // ============================================================
    // 1. AUTHENTICATION LOGIC (Login & Signup)
    // ============================================================
    const authForm = document.querySelector('.auth-form');

    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentPage = window.location.pathname;

            // --- SIGN UP LOGIC ---
            if (currentPage.includes('signup.html')) {
                const pass = document.getElementById('signup-password').value;
                const confirm = document.getElementById('signup-confirm').value;

                if (pass !== confirm) {
                    alert("Passwords do not match!");
                    return;
                }
                
                // Mock Success
                alert("Account created successfully! Redirecting to login...");
                window.location.href = 'login.html';
                return;
            }

            // --- LOGIN LOGIC ---
            const emailInput = document.querySelector('input[type="email"]');
            const passwordInput = document.querySelector('input[type="password"]');
            
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            // Simplified Login Logic
            if (password === 'Pass@123' && email) {
                localStorage.setItem('userType', 'creator'); // Default to creator
                localStorage.setItem('username', 'Dr. Nova');
                localStorage.setItem('handle', '@novaphysics');
                console.log('Logging in...');
                window.location.href = 'home.html'; 
            } else {
                alert('Incorrect Password. Hint: Pass@123');
            }
        });
    }

    

    // Logout Handler
    const logoutBtn = document.querySelector('a[href="login.html"]');
    if (logoutBtn && logoutBtn.innerText.includes('Log Out')) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'index.html'; // Redirect to landing page after logout
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
        
        // --- C. Console & Rendering Logic (Moved Up for Scope) ---
        const renderBtn = document.getElementById('renderBtn');
        const consoleLog = document.querySelector('.console-log');

        // --- A. Template Dictionary ---
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
        } else if (!savedCode) {
            studioEditor.value = motionCanvasTemplate;
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
            
            const templateSelect = document.getElementById('templateSelect');
            const btnMotion = document.getElementById('btn-motion');
            const btnManim = document.getElementById('btn-manim'); // This was missing
            const modalBtnMotion = document.getElementById('modal-btn-motion');
            const modalBtnManim = document.getElementById('modal-btn-manim');
            const filenameDisplay = document.getElementById('filename-display');
            
            if (engine === 'motioncanvas') {
                // UI Updates
                if(btnMotion) btnMotion.classList.add('active');
                if(btnManim) btnManim.classList.remove('active');
                if(filenameDisplay) filenameDisplay.textContent = "main.ts";
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
                if(btnManim) btnManim.classList.add('active');
                if(btnMotion) btnMotion.classList.remove('active');
                if(filenameDisplay) filenameDisplay.textContent = "main.py";
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
            logToConsole(`Switched engine to ${engine === 'manim' ? 'Manim (Python)' : 'Motion Canvas (TypeScript)'}`);
        };

        // Check for Remix Code from Watch Page (Moved here to ensure switchEngine is defined)
        const remixMetaRaw = localStorage.getItem('remixMeta');
        if (remixMetaRaw) {
            const meta = JSON.parse(remixMetaRaw);
            // Switch engine without loading default template
            switchEngine(meta.engine || 'manim', false);
            studioEditor.value = meta.code;
            remixOriginalId = meta.originalId;
            localStorage.removeItem('remixMeta'); // Clear it so it doesn't persist
            localStorage.setItem('xtraAnimCode', meta.code); // Update auto-save
            updateHighlighting();
        }

        // --- B. Handle Template Switching ---
        const templateSelect = document.getElementById('templateSelect');
        if (templateSelect) {
            templateSelect.addEventListener('change', function() {
                const key = this.value;
                if (!key) return;

                if (currentEngine === 'motioncanvas') {
                    // Load TypeScript Template
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
            if (currentEngine === 'motioncanvas') { // START of Motion Canvas Block
                const uploadBtn = document.getElementById('uploadVideoBtn');

                // If called from modal, ensure we are on the preview tab
                if (fromModal && window.switchTab) window.switchTab('preview');

                if (uploadBtn) uploadBtn.style.display = 'none';

                logToConsole("Building Client-Side Preview...");
                
                // Detect which simulation to run based on keywords in the code
                const isPendulum = code.toLowerCase().includes('pendulum');
                const isSine = code.toLowerCase().includes('sine');
                const isSpring = code.toLowerCase().includes('spring');
                const isCustom = !code.includes('import ') && !code.includes('from ');
                
                let simulationScript = '';
                
                if (isPendulum) {
                    // --- PENDULUM SIMULATION ---
                    simulationScript = `
                        const canvas = document.getElementById('simCanvas');
                        const ctx = canvas.getContext('2d');
                        let time = 0;
                        
                        const pivotX = canvas.width / 2;
                        const pivotY = 50;
                        const length = 200;
                        
                        function draw() {
                            ctx.fillStyle = '#141414';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            
                            const angle = Math.sin(time * 0.05) * 0.5; 
                            const bobX = pivotX + Math.sin(angle) * length;
                            const bobY = pivotY + Math.cos(angle) * length;
                            
                            ctx.beginPath();
                            ctx.moveTo(pivotX, pivotY);
                            ctx.lineTo(bobX, bobY);
                            ctx.strokeStyle = 'white';
                            ctx.lineWidth = 2;
                            ctx.stroke();
                            
                            ctx.beginPath();
                            ctx.arc(bobX, bobY, 20, 0, 2 * Math.PI);
                            ctx.fillStyle = '#3b82f6';
                            ctx.fill();
                            
                            time++;
                            requestAnimationFrame(draw);
                        }
                        draw();
                    `;
                } else if (isSine) {
                    // --- SINE WAVE SIMULATION ---
                    simulationScript = `
                        const canvas = document.getElementById('simCanvas');
                        const ctx = canvas.getContext('2d');
                        let time = 0;
                        
                        const cx = 150; // Circle Center X
                        const cy = canvas.height / 2; // Circle Center Y
                        const radius = 60;
                        const waveStart = 250;
                        const wavePoints = [];

                        function draw() {
                            ctx.fillStyle = '#141414';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            
                            const angle = time * 0.05;
                            const px = cx + Math.cos(angle) * radius;
                            const py = cy + Math.sin(angle) * radius;
                            
                            wavePoints.unshift(py);
                            if (wavePoints.length > (canvas.width - waveStart)) wavePoints.pop();

                            ctx.beginPath(); ctx.arc(cx, cy, radius, 0, 2 * Math.PI); ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();
                            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.strokeStyle = 'white'; ctx.stroke();
                            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(waveStart, py); ctx.strokeStyle = '#555'; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
                            ctx.beginPath(); ctx.arc(px, py, 6, 0, 2 * Math.PI); ctx.fillStyle = '#e13238'; ctx.fill();

                            ctx.beginPath();
                            for (let i = 0; i < wavePoints.length; i++) { ctx.lineTo(waveStart + i, wavePoints[i]); }
                            ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3; ctx.stroke();

                            time++;
                            requestAnimationFrame(draw);
                        }
                        draw();
                    `;
                } else if (isCustom) {
                    // --- CUSTOM RAW JS EXECUTION ---
                    simulationScript = `
                        const canvas = document.getElementById('simCanvas');
                        const ctx = canvas.getContext('2d');
                        let time = 0;
                        
                        function draw() {
                            const width = canvas.width;
                            const height = canvas.height;
                            
                            try {
                                ${code}
                            } catch (e) {
                                ctx.fillStyle = 'red';
                                ctx.font = '14px monospace';
                                ctx.fillText('Error: ' + e.message, 10, 50);
                            }
                            
                            time++;
                            requestAnimationFrame(draw);
                        }
                        draw();
                    `;
                } else {
                    // --- DEFAULT KINEMATICS (Red Circle) ---
                    simulationScript = `
                        const canvas = document.getElementById('simCanvas');
                        const ctx = canvas.getContext('2d');
                        let time = 0;
                        
                        function draw() {
                            ctx.fillStyle = '#141414';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            
                            const x = Math.sin(time * 0.05) * 150 + (canvas.width / 2); 
                            
                            ctx.beginPath();
                            ctx.arc(x, canvas.height / 2, 60, 0, 2 * Math.PI);
                            ctx.fillStyle = '#e13238';
                            ctx.fill();
                            
                            time++;
                            requestAnimationFrame(draw);
                        }
                        draw();
                    `;
                }

                // Construct a Robust Simulation for the Iframe
                const iframeContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { margin: 0; background: #000; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: white; font-family: sans-serif; }
                            canvas { border: 1px solid #333; background: #141414; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
                        </style>
                    </head>
                    <body>
                        <canvas id="simCanvas" width="640" height="360"></canvas>
                        <div style="margin-top: 15px; color: #666; font-size: 0.8rem;">
                            ⚡ Client-Side Preview • Recording...
                        </div>
                        
                        <script>
                            ${simulationScript}

                            // --- RECORDING LOGIC ---
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
                        <\/script>
                    </body>
                    </html>
                `;

                const frame = document.getElementById('motionCanvasPlayer');
                if (frame) {
                    frame.style.display = 'block';
                    
                    if(outputContainer) outputContainer.style.display = 'none';
                    
                    frame.srcdoc = iframeContent;
                    logToConsole("Motion Canvas preview loaded!", 'success');
                } else {
                    logToConsole("Error: Preview iframe not found in DOM.", 'error');
                }
                return; // CRITICAL: Stop execution for Motion Canvas

            } else { // START of Manim Block

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
                fetch(`${backendUrl}/render`, {
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
                fetch(`${backendUrl}/status/${taskId}`)
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
                        
                        const res = await fetch(`${backendUrl}/upload`, {
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

                const newPost = {
                    id: Date.now(),
                    title: title,
                    desc: desc,
                    videoUrl: finalVideoUrl,
                    format: window.currentRenderFormat || '16:9',
                    timestamp: new Date().toISOString(),
                    code: studioEditor.value, // Save code for Remix functionality
                    originalId: remixOriginalId, // Link to original video if remix
                    engine: currentEngine
                };

                const posts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                posts.push(newPost);
                localStorage.setItem('userPosts', JSON.stringify(posts));

                uploadModal.style.display = 'none';
                if(confirm('Video published! Go to profile?')) {
                    window.location.href = 'profile.html';
                }
            });
        }
    }


    // ============================================================
    // 3. XTRA BOOK EDITOR LOGIC
    // ============================================================
    const chapterList = document.getElementById('chapterList');
    const bookTitleInput = document.getElementById('currentChapterTitle');
    const latexEditor = document.getElementById('code');

    // Only run if we are in the Book Editor
    if (chapterList && bookTitleInput && !isStudio) {
        
        // --- A. Chapter Switching Mockup ---
        const chapters = document.querySelectorAll('.chapter-item');
        chapters.forEach(chap => {
            chap.addEventListener('click', function() {
                // Remove active from all
                chapters.forEach(c => c.classList.remove('active'));
                // Add active to clicked
                this.classList.add('active');
                
                // Update Inputs
                const titleText = this.querySelector('span').innerText;
                bookTitleInput.value = titleText;
                latexEditor.value = `\\section{${titleText}}\n\n% Start writing content for ${titleText} here...\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit.`;
            });
        });

        // --- B. Add Chapter Button ---
        const addBtn = document.getElementById('addChapterBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const count = chapterList.children.length + 1;
                const newLi = document.createElement('li');
                newLi.className = 'chapter-item';
                newLi.innerHTML = `<span>${count}. New Chapter</span>`;
                chapterList.appendChild(newLi);
                
                // Add click listener to new element (simplified)
                newLi.addEventListener('click', () => alert("Logic to switch to new chapter"));
            });
        }

        // --- C. Export PDF Logic ---
        const renderBookBtn = document.getElementById('renderBtn'); // Reusing ID, context aware
        const pdfOutput = document.getElementById('output');

        if (renderBookBtn) {
            // Logic handled by book_script.js
            console.log("Book logic delegated to book_script.js");
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
});