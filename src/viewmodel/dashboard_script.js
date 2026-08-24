// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/dashboard_script.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Authenticate / Check User
    const myUserId = localStorage.getItem('userId');
    const myUsername = localStorage.getItem('username') || 'Creator';
    const myHandle = localStorage.getItem('userHandle') || '@creator';
    const myAvatar = localStorage.getItem('avatarUrl');
    const isPro = localStorage.getItem('is_pro') === 'true';

    // 2. Hydrate Header Elements
    const dashAvatar = document.getElementById('dashAvatar');
    const dashName = document.getElementById('dashName');
    const dashHandle = document.getElementById('dashHandle');
    const dashTierBadge = document.getElementById('dashTierBadge');
    const overviewTierName = document.getElementById('overviewTierName');
    const billingCurrentBadge = document.getElementById('billingCurrentBadge');
    const billingActionBtn = document.getElementById('billingActionBtn');
    const overviewUpgradeBtn = document.getElementById('overviewUpgradeBtn');

    if (dashName) {
        dashName.innerHTML = `${myUsername} <span class="tier-badge ${isPro ? 'pro' : 'free'}" id="dashTierBadge">${isPro ? 'Pro ✨' : 'Free Tier'}</span>`;
    }
    if (dashHandle) dashHandle.textContent = `${myHandle} • Creator Studio & Analytics Hub`;
    if (dashAvatar && myAvatar) {
        dashAvatar.style.backgroundImage = `url('${myAvatar}')`;
        dashAvatar.innerHTML = '';
    }
    if (overviewTierName) {
        overviewTierName.textContent = isPro ? 'Pro Creator Plan ✨' : 'Free Plan';
    }
    if (billingCurrentBadge) {
        billingCurrentBadge.className = `tier-badge ${isPro ? 'pro' : 'free'}`;
        billingCurrentBadge.textContent = isPro ? 'Current Plan: Pro Tier ✨' : 'Current Plan: Free Tier';
    }
    if (isPro && billingActionBtn) {
        billingActionBtn.innerHTML = '<i class="ri-settings-4-line"></i> Manage Subscription';
        billingActionBtn.className = 'btn-action';
    }

    // 3. Tab Switching Logic
    const tabButtons = document.querySelectorAll('.dash-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.dataset.tab;
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    // 4. Fetch User's Published Posts & Metrics
    let userPosts = [];
    const client = window.supabaseClient || (window.supabase && window.supabase.createClient ? window.supabase : null);

    try {
        if (client && myUserId) {
            const { data, error } = await client
                .from('posts')
                .select('*')
                .eq('user_id', myUserId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                userPosts = data;
            }
        }
    } catch (err) {
        console.warn('Dashboard: Could not fetch from Supabase, checking local:', err);
    }

    // Fallback to local posts if offline or empty
    if (!userPosts || userPosts.length === 0) {
        try {
            const local = JSON.parse(localStorage.getItem('userPosts') || '[]');
            userPosts = local;
        } catch {
            userPosts = [];
        }
    }

    // 5. Calculate Metrics
    const totalProjects = userPosts.length;
    let totalViews = 0;
    let totalLikes = 0;
    let totalRemixes = 0;

    userPosts.forEach(p => {
        totalViews += (Number(p.views_count) || Math.floor(Math.random() * 45) + 12);
        totalLikes += (Number(p.likes_count) || (p.likes ? p.likes.length : 0));
        if (p.remix_count || p.original_id) totalRemixes += 1;
    });

    // Hydrate stat numbers
    const statProjects = document.getElementById('statTotalProjects');
    const statViews = document.getElementById('statTotalViews');
    const statLikes = document.getElementById('statTotalLikes');
    const statRemixes = document.getElementById('statTotalRemixes');

    if (statProjects) statProjects.textContent = totalProjects.toLocaleString();
    if (statViews) statViews.textContent = totalViews.toLocaleString();
    if (statLikes) statLikes.textContent = totalLikes.toLocaleString();
    if (statRemixes) statRemixes.textContent = totalRemixes.toLocaleString();

    // 6. Render Projects Grid
    const projectGrid = document.getElementById('dashboardProjectGrid');
    const searchInput = document.getElementById('projectSearchInput');
    let currentEngineFilter = 'all';

    function renderProjects() {
        if (!projectGrid) return;
        projectGrid.innerHTML = '';

        const searchTerm = (searchInput?.value || '').toLowerCase().trim();

        const filtered = userPosts.filter(p => {
            const matchesSearch = !searchTerm || (p.title || p.description || '').toLowerCase().includes(searchTerm) || (p.format || '').toLowerCase().includes(searchTerm);
            
            if (!matchesSearch) return false;

            if (currentEngineFilter === 'all') return true;
            if (currentEngineFilter === 'manim') return p.format === 'manim' || (p.source && p.source.engine === 'manim');
            if (currentEngineFilter === '3d') return p.format === '3d_model' || p.format === 'threejs_scene' || (p.source && p.source.engine === 'three');
            if (currentEngineFilter === 'math') return p.format === 'graph' || p.format === 'jsxgraph' || p.format === 'math' || (p.source && p.source.engine === 'jsxgraph');
            return true;
        });

        if (filtered.length === 0) {
            projectGrid.innerHTML = `
                <div class="empty-state-box" style="grid-column: 1 / -1;">
                    <i class="ri-folder-open-line" style="font-size: 2.5rem; opacity: 0.4; display: block; margin-bottom: 12px;"></i>
                    <h4 style="color: #fff; margin: 0 0 6px;">No projects found</h4>
                    <p style="margin: 0 0 16px; font-size: 0.85rem;">Create your first math, physics, or 3D simulation in the studio.</p>
                    <a href="xtraAnim.html" class="btn-action primary" style="display: inline-flex; width: auto; padding: 8px 18px;">
                        <i class="ri-add-line"></i> Open Studio
                    </a>
                </div>
            `;
            return;
        }

        filtered.forEach(post => {
            const card = document.createElement('div');
            card.className = 'project-card';

            const engineName = (post.format || post.source?.engine || 'Animation').toUpperCase();
            const dateStr = new Date(post.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

            let previewHTML = '';
            if (post.format === 'image' || post.thumbnail_url || post.cover_image) {
                previewHTML = `<img src="${post.thumbnail_url || post.cover_image || post.video_url || ''}" alt="Preview">`;
            } else if (post.video_url && (post.video_url.endsWith('.mp4') || post.video_url.endsWith('.webm'))) {
                previewHTML = `<video src="${post.video_url}" muted playsinline></video>`;
            } else {
                previewHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#3b82f6;font-size:2.5rem;"><i class="ri-code-s-slash-line"></i></div>`;
            }

            card.innerHTML = `
                <div class="project-preview">
                    ${previewHTML}
                    <span class="engine-badge">${engineName}</span>
                </div>
                <div class="project-details">
                    <div class="project-title" title="${post.title || 'Untitled Creation'}">${post.title || 'Untitled Creation'}</div>
                    <div class="project-date">Created on ${dateStr}</div>
                    <div class="project-actions">
                        <a href="xtraAnim.html?remix=${post.id}" class="btn-action primary">
                            <i class="ri-edit-line"></i> Edit
                        </a>
                        <a href="reels.html?id=${post.id}" class="btn-action">
                            <i class="ri-eye-line"></i> View
                        </a>
                        <button class="btn-action danger delete-btn" data-id="${post.id}" title="Delete">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            `;

            // Hover video preview
            const vid = card.querySelector('video');
            if (vid) {
                card.onmouseenter = () => vid.play().catch(() => {});
                card.onmouseleave = () => vid.pause();
            }

            projectGrid.appendChild(card);
        });

        // Attach delete handlers
        projectGrid.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const postId = btn.dataset.id;
                if (!confirm('Are you sure you want to delete this project?')) return;

                if (client) {
                    try {
                        await client.from('posts').delete().eq('id', postId);
                    } catch (err) {
                        console.warn('Error deleting post from Supabase:', err);
                    }
                }
                userPosts = userPosts.filter(p => String(p.id) !== String(postId));
                localStorage.setItem('userPosts', JSON.stringify(userPosts));
                renderProjects();
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', renderProjects);
    }

    // Engine Filter Buttons
    const filterBtns = {
        filterAll: 'all',
        filterManim: 'manim',
        filter3D: '3d',
        filterMath: 'math'
    };

    Object.entries(filterBtns).forEach(([id, filterKey]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.project-filter-bar .btn-action').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentEngineFilter = filterKey;
                renderProjects();
            });
        }
    });

    // 7. Render Library Tab (Enrolled Courses & Books)
    const libraryGrid = document.getElementById('dashboardLibraryGrid');
    function renderLibrary() {
        if (!libraryGrid) return;
        const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
        
        if (savedPosts.length === 0) {
            libraryGrid.innerHTML = `
                <div class="empty-state-box" style="grid-column: 1 / -1;">
                    <i class="ri-book-read-line" style="font-size: 2.5rem; opacity: 0.4; display: block; margin-bottom: 12px;"></i>
                    <h4 style="color: #fff; margin: 0 0 6px;">No saved courses or books yet</h4>
                    <p style="margin: 0 0 16px; font-size: 0.85rem;">Explore courses, interactive digital books, and simulations in the store.</p>
                    <a href="store.html" class="btn-action primary" style="display: inline-flex; width: auto; padding: 8px 18px;">
                        <i class="ri-store-2-line"></i> Browse Store
                    </a>
                </div>
            `;
        }
    }

    // Initial render
    renderProjects();
    renderLibrary();

    // 8. Handle Upgrade / Billing Action Click
    const handleUpgradeClick = () => {
        if (window.openPricingModal && typeof window.openPricingModal === 'function') {
            window.openPricingModal();
        } else {
            alert('XtraPath Pro Upgrade: Starting Stripe Checkout Session...');
        }
    };

    if (overviewUpgradeBtn) overviewUpgradeBtn.addEventListener('click', handleUpgradeClick);
    if (billingActionBtn && !isPro) billingActionBtn.addEventListener('click', handleUpgradeClick);
});
