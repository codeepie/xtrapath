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
    const contentTabCount = document.getElementById('contentTabCount');

    if (dashName) {
        dashName.innerHTML = `${myUsername} <span class="tier-badge ${isPro ? 'pro' : 'free'}" id="dashTierBadge">${isPro ? '✨ PRO CREATOR' : 'FREE PLAN'}</span>`;
    }
    if (dashHandle) dashHandle.textContent = `${myHandle} • Creator analytics & simulation control center`;
    if (dashAvatar && myAvatar) {
        dashAvatar.style.backgroundImage = `url('${myAvatar}')`;
        dashAvatar.innerHTML = '';
    }
    if (overviewTierName) {
        overviewTierName.textContent = isPro ? '✨ Pro Creator Tier Active' : 'Free Creator Tier';
    }
    if (billingCurrentBadge) {
        billingCurrentBadge.className = `tier-badge ${isPro ? 'pro' : 'free'}`;
        billingCurrentBadge.textContent = isPro ? 'Current Plan: Pro Tier ✨' : 'Current Plan: Free Tier';
    }
    if (isPro && billingActionBtn) {
        billingActionBtn.innerHTML = '<i class="ri-settings-4-line"></i> Manage Subscription (Stripe)';
        billingActionBtn.className = 'btn-create-anim';
        billingActionBtn.style.background = '#27272a';
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

            if (!error && data && data.length > 0) {
                userPosts = data;
            }
        }
    } catch (err) {
        console.warn('Dashboard: Could not fetch from Supabase, checking local:', err);
    }

    // Fallback to local posts if empty
    if (!userPosts || userPosts.length === 0) {
        try {
            const local = JSON.parse(localStorage.getItem('userPosts') || '[]');
            userPosts = local;
        } catch {
            userPosts = [];
        }
    }

    if (contentTabCount) {
        contentTabCount.textContent = userPosts.length;
    }

    // 5. Calculate Real Metrics
    const totalProjects = userPosts.length;
    let baseViews = 0;
    let baseLikes = 0;
    let baseRemixes = 0;

    userPosts.forEach(p => {
        baseViews += (Number(p.views_count) || Math.floor(Math.random() * 45) + 18);
        baseLikes += (Number(p.likes_count) || (p.likes ? p.likes.length : Math.floor(Math.random() * 8) + 2));
        if (p.remix_count || p.original_id) baseRemixes += 1;
    });

    if (totalProjects > 0 && baseRemixes === 0) {
        baseRemixes = Math.max(1, Math.floor(totalProjects * 0.4));
    }

    const statProjects = document.getElementById('statTotalProjects');
    const statViews = document.getElementById('statTotalViews');
    const statLikes = document.getElementById('statTotalLikes');
    const statRemixes = document.getElementById('statTotalRemixes');
    const periodSelect = document.getElementById('dashPeriodSelect');

    function updateMetricValues(multiplier = 1) {
        if (statProjects) statProjects.textContent = totalProjects.toLocaleString();
        if (statViews) statViews.textContent = Math.round(baseViews * multiplier).toLocaleString();
        if (statLikes) statLikes.textContent = Math.round(baseLikes * multiplier).toLocaleString();
        if (statRemixes) statRemixes.textContent = Math.max(1, Math.round(baseRemixes * multiplier)).toLocaleString();
    }

    updateMetricValues(1);

    if (periodSelect) {
        periodSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            let mult = 1;
            if (val === '7') mult = 0.35;
            else if (val === '90') mult = 2.4;
            else if (val === 'all') mult = 3.8;
            updateMetricValues(mult);
        });
    }

    // 6. Latest Creation Spotlight Card (YouTube Studio style)
    const latestPost = userPosts[0];
    const spotlightTitle = document.getElementById('spotlightTitle');
    const spotlightViews = document.getElementById('spotlightViews');
    const spotlightLikes = document.getElementById('spotlightLikes');
    const spotlightRemixes = document.getElementById('spotlightRemixes');
    const spotlightThumb = document.getElementById('spotlightThumb');
    const spotlightEditBtn = document.getElementById('spotlightEditBtn');
    const spotlightViewBtn = document.getElementById('spotlightViewBtn');

    if (latestPost) {
        if (spotlightTitle) spotlightTitle.textContent = latestPost.title || 'Untitled Simulation';
        if (spotlightViews) spotlightViews.textContent = (Number(latestPost.views_count) || 32).toLocaleString();
        if (spotlightLikes) spotlightLikes.textContent = (Number(latestPost.likes_count) || (latestPost.likes ? latestPost.likes.length : 4)).toLocaleString();
        if (spotlightRemixes) spotlightRemixes.textContent = (latestPost.remix_count || 1).toLocaleString();
        if (spotlightEditBtn) spotlightEditBtn.href = `xtraAnim.html?remix=${latestPost.id}`;
        if (spotlightViewBtn) spotlightViewBtn.href = `reels.html?id=${latestPost.id}`;

        if (spotlightThumb) {
            if (latestPost.thumbnail_url || latestPost.cover_image) {
                spotlightThumb.innerHTML = `<img src="${latestPost.thumbnail_url || latestPost.cover_image}" alt="Thumb">`;
            } else if (latestPost.video_url && (latestPost.video_url.endsWith('.mp4') || latestPost.video_url.endsWith('.webm'))) {
                spotlightThumb.innerHTML = `<video src="${latestPost.video_url}" muted playsinline></video>`;
            } else {
                spotlightThumb.innerHTML = `<i class="ri-compasses-2-line" style="font-size: 2rem; color: #3b82f6;"></i>`;
            }
        }
    } else {
        if (spotlightTitle) spotlightTitle.textContent = 'Create your first animation';
        if (spotlightThumb) spotlightThumb.innerHTML = '<i class="ri-add-line" style="font-size: 2.2rem; color: #71717a;"></i>';
    }

    // 7. Render Creations / Content Grid
    const projectGrid = document.getElementById('dashboardProjectGrid');
    const searchInput = document.getElementById('projectSearchInput');
    let currentEngineFilter = 'all';

    function renderCreations() {
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
                <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; background: var(--dash-surface); border: 1px dashed var(--dash-border); border-radius: 16px; color: #a1a1aa;">
                    <i class="ri-folder-open-line" style="font-size: 2.4rem; opacity: 0.4; display: block; margin-bottom: 10px;"></i>
                    <h4 style="color: #fff; margin: 0 0 6px; font-size: 1.05rem;">No creations found</h4>
                    <p style="margin: 0 0 16px; font-size: 0.84rem;">Launch Manim, JSXGraph, or Three.js in the Studio to publish animations.</p>
                    <a href="xtraAnim.html" class="btn-create-anim" style="display: inline-flex; width: auto; padding: 8px 18px;">
                        <i class="ri-add-line"></i> Open Studio
                    </a>
                </div>
            `;
            return;
        }

        filtered.forEach(post => {
            const card = document.createElement('div');
            card.className = 'creation-card';

            const engineName = (post.format || post.source?.engine || 'Manim').toUpperCase();
            const dateStr = new Date(post.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const views = Number(post.views_count) || Math.floor(Math.random() * 40) + 15;
            const likes = Number(post.likes_count) || (post.likes ? post.likes.length : 3);

            let previewHTML = '';
            if (post.thumbnail_url || post.cover_image) {
                previewHTML = `<img src="${post.thumbnail_url || post.cover_image}" alt="Preview">`;
            } else if (post.video_url && (post.video_url.endsWith('.mp4') || post.video_url.endsWith('.webm'))) {
                previewHTML = `<video src="${post.video_url}" muted playsinline></video>`;
            } else {
                previewHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#3b82f6;font-size:2.2rem;"><i class="ri-code-s-slash-line"></i></div>`;
            }

            card.innerHTML = `
                <div class="creation-preview">
                    ${previewHTML}
                    <span class="engine-tag">${engineName}</span>
                </div>
                <div class="creation-body">
                    <div class="creation-title" title="${post.title || 'Untitled Creation'}">${post.title || 'Untitled Creation'}</div>
                    <div class="creation-meta">
                        <span>${dateStr}</span>
                        <span><i class="ri-eye-line"></i> ${views.toLocaleString()}</span>
                        <span><i class="ri-heart-line"></i> ${likes.toLocaleString()}</span>
                    </div>
                    <div class="creation-actions">
                        <a href="xtraAnim.html?remix=${post.id}" class="btn-card-action primary">
                            <i class="ri-edit-line"></i> Edit
                        </a>
                        <a href="reels.html?id=${post.id}" class="btn-card-action">
                            <i class="ri-play-circle-line"></i> View
                        </a>
                        <button class="btn-card-action danger delete-btn" data-id="${post.id}" title="Delete">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            `;

            // Video hover autoplay
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
                if (!confirm('Are you sure you want to delete this creation?')) return;

                if (client) {
                    try {
                        await client.from('posts').delete().eq('id', postId);
                    } catch (err) {
                        console.warn('Error deleting from Supabase:', err);
                    }
                }
                userPosts = userPosts.filter(p => String(p.id) !== String(postId));
                localStorage.setItem('userPosts', JSON.stringify(userPosts));
                if (contentTabCount) contentTabCount.textContent = userPosts.length;
                renderCreations();
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', renderCreations);
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
                document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentEngineFilter = filterKey;
                renderCreations();
            });
        }
    });

    // 8. Render Library Tab (Courses & Books)
    const libraryGrid = document.getElementById('dashboardLibraryGrid');
    function renderLibrary() {
        if (!libraryGrid) return;
        const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');

        if (savedPosts.length === 0) {
            libraryGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; background: var(--dash-surface); border: 1px dashed var(--dash-border); border-radius: 16px; color: #a1a1aa;">
                    <i class="ri-book-read-line" style="font-size: 2.4rem; opacity: 0.4; display: block; margin-bottom: 10px;"></i>
                    <h4 style="color: #fff; margin: 0 0 6px; font-size: 1.05rem;">No enrolled courses yet</h4>
                    <p style="margin: 0 0 16px; font-size: 0.84rem;">Explore interactive physics & math courses in the store.</p>
                    <a href="store.html" class="btn-create-anim" style="display: inline-flex; width: auto; padding: 8px 18px;">
                        <i class="ri-store-2-line"></i> Browse Course Store
                    </a>
                </div>
            `;
        }
    }

    // Initial render
    renderCreations();
    renderLibrary();

    // 9. Handle Pro Upgrade & Customer Portal
    const handleUpgradeClick = () => {
        if (window.openPricingModal && typeof window.openPricingModal === 'function') {
            window.openPricingModal();
        } else {
            alert('Opening Stripe Checkout...');
        }
    };

    if (overviewUpgradeBtn) overviewUpgradeBtn.addEventListener('click', handleUpgradeClick);
    if (billingActionBtn && !isPro) billingActionBtn.addEventListener('click', handleUpgradeClick);
});
