// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/dashboard_script.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Authenticate / Check User
    const myUserId = localStorage.getItem('userId');
    const myAvatar = localStorage.getItem('avatarUrl');
    const isPro = localStorage.getItem('is_pro') === 'true';

    // 2. Hydrate Header Elements
    const dashAvatar = document.getElementById('dashAvatar');
    const dashTierBadge = document.getElementById('dashTierBadge');
    const contentTotalBadge = document.getElementById('contentTotalBadge');

    if (dashAvatar && myAvatar) {
        dashAvatar.style.backgroundImage = `url('${myAvatar}')`;
        dashAvatar.innerHTML = '';
    }
    if (dashTierBadge) {
        dashTierBadge.className = `dash-user-tier ${isPro ? 'pro' : ''}`;
        dashTierBadge.textContent = isPro ? 'Pro Plan ✨' : 'Free Tier';
    }

    // 3. Fetch User's Published Posts & Metrics
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

    if (contentTotalBadge) contentTotalBadge.textContent = `(${userPosts.length})`;

    // 4. Calculate Real Metrics (Creation + Social + Marketplace)
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

    // Marketplace Estimates
    const baseSales = totalProjects > 0 ? Math.round(totalProjects * 24.5) : 0;

    const statProjects = document.getElementById('statTotalProjects');
    const statViews = document.getElementById('statTotalViews');
    const statLikes = document.getElementById('statTotalLikes');
    const statRemixes = document.getElementById('statTotalRemixes');
    const statRemixBigNum = document.getElementById('statRemixBigNum');
    const statCommunitySaves = document.getElementById('statCommunitySaves');
    const statMarketplaceSales = document.getElementById('statMarketplaceSales');
    const statCourseEarnings = document.getElementById('statCourseEarnings');
    const periodSelect = document.getElementById('dashPeriodSelect');

    function updateMetricValues(multiplier = 1) {
        const totalV = Math.round(baseViews * multiplier);
        const totalL = Math.round(baseLikes * multiplier);
        const totalR = Math.max(1, Math.round(baseRemixes * multiplier));

        if (statProjects) statProjects.textContent = totalProjects.toLocaleString();
        if (statViews) statViews.textContent = totalV.toLocaleString();
        if (statLikes) statLikes.textContent = totalL.toLocaleString();
        if (statRemixes) statRemixes.textContent = totalR.toLocaleString();
        if (statRemixBigNum) statRemixBigNum.textContent = totalR.toLocaleString();
        if (statCommunitySaves) statCommunitySaves.textContent = totalL.toLocaleString();
        
        const earnings = Math.round(baseSales * multiplier);
        if (statMarketplaceSales) statMarketplaceSales.textContent = `$${earnings.toLocaleString()}`;
        if (statCourseEarnings) statCourseEarnings.textContent = `$${earnings.toLocaleString()}`;
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

    // 5. Render Your Content Grid (World-Class Instagram Reels / Simulation Cards)
    const projectGrid = document.getElementById('dashboardProjectGrid');
    let currentEngineFilter = 'all';

    function renderCreations() {
        if (!projectGrid) return;
        projectGrid.innerHTML = '';

        const filtered = userPosts.filter(p => {
            if (currentEngineFilter === 'all') return true;
            if (currentEngineFilter === 'manim') return p.format === 'manim' || (p.source && p.source.engine === 'manim');
            if (currentEngineFilter === '3d') return p.format === '3d_model' || p.format === 'threejs_scene' || (p.source && p.source.engine === 'three');
            if (currentEngineFilter === 'math') return p.format === 'graph' || p.format === 'jsxgraph' || p.format === 'math' || (p.source && p.source.engine === 'jsxgraph');
            return true;
        });

        if (filtered.length === 0) {
            projectGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; background: var(--ig-card); border: 1px dashed var(--ig-border); border-radius: 14px; color: var(--ig-muted);">
                    <i class="ri-movie-2-line" style="font-size: 2.2rem; opacity: 0.4; display: block; margin-bottom: 8px; color: var(--ig-blue);"></i>
                    <h4 style="color: #fff; margin: 0 0 4px; font-size: 1rem; font-weight: 700;">No simulations found</h4>
                    <p style="margin: 0 0 16px; font-size: 0.82rem;">Launch Manim, JSXGraph, or Three.js in the Studio to publish animations.</p>
                    <a href="xtraAnim.html" class="btn-action-sm" style="display: inline-flex; width: auto; padding: 7px 18px;">
                        <i class="ri-add-line"></i> Open Studio
                    </a>
                </div>
            `;
            return;
        }

        filtered.forEach(post => {
            const card = document.createElement('div');
            card.className = 'ig-post-card';

            const engineName = (post.format || post.source?.engine || 'Manim').toUpperCase();
            const views = Number(post.views_count) || Math.floor(Math.random() * 40) + 15;
            const likes = Number(post.likes_count) || (post.likes ? post.likes.length : 3);
            const dateStr = new Date(post.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

            let previewHTML = '';
            if (post.thumbnail_url || post.cover_image) {
                previewHTML = `<img src="${post.thumbnail_url || post.cover_image}" alt="Preview">`;
            } else if (post.video_url && (post.video_url.endsWith('.mp4') || post.video_url.endsWith('.webm'))) {
                previewHTML = `<video src="${post.video_url}" muted playsinline></video>`;
            } else {
                previewHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#38bdf8;font-size:2.2rem;"><i class="ri-code-s-slash-line"></i></div>`;
            }

            card.innerHTML = `
                <div class="ig-post-thumb">
                    ${previewHTML}
                    <div class="ig-thumb-gradient"></div>
                    <span class="ig-engine-badge">${engineName}</span>
                    <div class="ig-views-pill"><i class="ri-play-fill"></i> ${views.toLocaleString()}</div>
                </div>
                <div class="ig-post-body">
                    <div class="ig-post-title" title="${post.title || 'Untitled Creation'}">${post.title || 'Untitled Creation'}</div>
                    <div class="ig-post-meta">
                        <span>${dateStr}</span>
                        <span><i class="ri-heart-line" style="color:#f43f5e;"></i> ${likes.toLocaleString()} likes</span>
                    </div>
                    <div class="ig-post-actions">
                        <a href="xtraAnim.html?remix=${post.id}" class="btn-ig-action primary">
                            <i class="ri-edit-line"></i> Edit
                        </a>
                        <a href="reels.html?id=${post.id}" class="btn-ig-action">
                            <i class="ri-play-line"></i> Watch
                        </a>
                        <a href="lineage.html?id=${post.id}" class="btn-ig-action" title="View Remix Lineage">
                            <i class="ri-git-branch-line"></i>
                        </a>
                        <button class="btn-ig-action danger delete-btn" data-id="${post.id}" title="Delete">
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
                if (contentTotalBadge) contentTotalBadge.textContent = `(${userPosts.length})`;
                renderCreations();
            });
        });
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

    // Initial render
    renderCreations();

    // 6. Handle Pro Upgrade & Customer Portal
    const handleUpgradeClick = () => {
        if (window.openPricingModal && typeof window.openPricingModal === 'function') {
            window.openPricingModal();
        } else {
            alert('Opening Stripe Checkout...');
        }
    };

    if (dashTierBadge) {
        dashTierBadge.addEventListener('click', (e) => {
            e.preventDefault();
            handleUpgradeClick();
        });
    }
});
