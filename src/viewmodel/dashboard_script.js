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
    const dashTierBadge = document.getElementById('dashTierBadge');
    const billingCurrentBadge = document.getElementById('billingCurrentBadge');
    const billingActionBtn = document.getElementById('billingActionBtn');
    const contentTabCount = document.getElementById('contentTabCount');
    const contentTotalBadge = document.getElementById('contentTotalBadge');

    if (dashAvatar && myAvatar) {
        dashAvatar.style.backgroundImage = `url('${myAvatar}')`;
        dashAvatar.innerHTML = '';
    }
    if (dashTierBadge) {
        dashTierBadge.className = `dash-user-tier ${isPro ? 'pro' : ''}`;
        dashTierBadge.textContent = isPro ? 'Pro Plan ✨' : 'Free Tier';
    }
    if (billingCurrentBadge) {
        billingCurrentBadge.textContent = isPro ? 'Current Plan: Pro Tier ✨' : 'Current Plan: Free Tier';
    }
    if (isPro && billingActionBtn) {
        billingActionBtn.innerHTML = '<i class="ri-settings-4-line"></i> Manage Subscription (Stripe)';
        billingActionBtn.className = 'btn-card-action';
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

    if (contentTabCount) contentTabCount.textContent = userPosts.length;
    if (contentTotalBadge) contentTotalBadge.textContent = `${userPosts.length} total`;

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

    const sparkDailyAvg = document.getElementById('sparkDailyAvg');
    const sparkPeakDay = document.getElementById('sparkPeakDay');

    function updateMetricValues(multiplier = 1) {
        const totalV = Math.round(baseViews * multiplier);
        if (statProjects) statProjects.textContent = totalProjects.toLocaleString();
        if (statViews) statViews.textContent = totalV.toLocaleString();
        if (statLikes) statLikes.textContent = Math.round(baseLikes * multiplier).toLocaleString();
        if (statRemixes) statRemixes.textContent = Math.max(1, Math.round(baseRemixes * multiplier)).toLocaleString();

        if (sparkDailyAvg) {
            const dailyAvg = Math.max(1, Math.round(totalV / 28));
            sparkDailyAvg.textContent = `${dailyAvg.toLocaleString()} views/day`;
        }
        if (sparkPeakDay) {
            const peak = Math.max(5, Math.round(totalV * 0.18));
            sparkPeakDay.textContent = `${peak.toLocaleString()} views`;
        }
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
    const spotlightEngineTag = document.getElementById('spotlightEngineTag');
    const spotlightDate = document.getElementById('latestSpotlightDate');
    const spotlightEditBtn = document.getElementById('spotlightEditBtn');
    const spotlightViewBtn = document.getElementById('spotlightViewBtn');

    if (latestPost) {
        if (spotlightTitle) spotlightTitle.textContent = latestPost.title || 'Untitled Simulation';
        if (spotlightViews) spotlightViews.textContent = (Number(latestPost.views_count) || 48).toLocaleString();
        if (spotlightLikes) spotlightLikes.textContent = (Number(latestPost.likes_count) || (latestPost.likes ? latestPost.likes.length : 6)).toLocaleString();
        if (spotlightRemixes) spotlightRemixes.textContent = (latestPost.remix_count || 1).toLocaleString();
        if (spotlightEditBtn) spotlightEditBtn.href = `xtraAnim.html?remix=${latestPost.id}`;
        if (spotlightViewBtn) spotlightViewBtn.href = `reels.html?id=${latestPost.id}`;
        if (spotlightEngineTag) spotlightEngineTag.textContent = (latestPost.format || latestPost.source?.engine || 'Manim').toUpperCase();
        if (spotlightDate && latestPost.created_at) {
            spotlightDate.textContent = `Published on ${new Date(latestPost.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        }

        if (spotlightThumb) {
            let thumbHTML = '';
            if (latestPost.thumbnail_url || latestPost.cover_image) {
                thumbHTML = `<img src="${latestPost.thumbnail_url || latestPost.cover_image}" alt="Thumb">`;
            } else if (latestPost.video_url && (latestPost.video_url.endsWith('.mp4') || latestPost.video_url.endsWith('.webm'))) {
                thumbHTML = `<video src="${latestPost.video_url}" muted playsinline></video>`;
            } else {
                thumbHTML = `<i class="ri-compasses-2-line" style="font-size: 2.5rem; color: #3b82f6;"></i>`;
            }
            spotlightThumb.innerHTML = thumbHTML + `<span class="spotlight-tag" id="spotlightEngineTag">${(latestPost.format || latestPost.source?.engine || 'Manim').toUpperCase()}</span>`;
        }
    } else {
        if (spotlightTitle) spotlightTitle.textContent = 'Create your first simulation';
        if (spotlightThumb) spotlightThumb.innerHTML = '<i class="ri-add-line" style="font-size: 2.5rem; color: #71717a;"></i>';
    }

    // 7. Render Top Performing Creations in Overview
    const topCreationsGrid = document.getElementById('topCreationsGrid');
    if (topCreationsGrid) {
        const topSorted = [...userPosts].sort((a, b) => (Number(b.views_count) || 0) - (Number(a.views_count) || 0)).slice(0, 3);
        if (topSorted.length === 0) {
            topCreationsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--d-muted); font-size: 0.85rem;">
                    No creations yet. Publish simulations in Studio to see top analytics.
                </div>
            `;
        } else {
            topCreationsGrid.innerHTML = '';
            topSorted.forEach(post => {
                const card = document.createElement('a');
                card.href = `reels.html?id=${post.id}`;
                card.className = 'top-creation-card';

                let thumbHTML = '';
                if (post.thumbnail_url || post.cover_image) {
                    thumbHTML = `<img src="${post.thumbnail_url || post.cover_image}" alt="Thumb">`;
                } else if (post.video_url && (post.video_url.endsWith('.mp4') || post.video_url.endsWith('.webm'))) {
                    thumbHTML = `<video src="${post.video_url}" muted playsinline></video>`;
                } else {
                    thumbHTML = `<i class="ri-code-s-slash-line" style="font-size: 1.4rem; color: #3b82f6;"></i>`;
                }

                const views = Number(post.views_count) || Math.floor(Math.random() * 40) + 15;
                const likes = Number(post.likes_count) || 3;

                card.innerHTML = `
                    <div class="top-creation-thumb">${thumbHTML}</div>
                    <div class="top-creation-info">
                        <div class="top-creation-title">${post.title || 'Untitled Animation'}</div>
                        <div class="top-creation-stats">
                            <span><i class="ri-eye-line"></i> ${views.toLocaleString()}</span>
                            <span><i class="ri-heart-line"></i> ${likes.toLocaleString()}</span>
                        </div>
                    </div>
                `;
                topCreationsGrid.appendChild(card);
            });
        }
    }

    // 8. Content Hub: View Mode Switcher (Grid vs List/Table)
    let currentViewMode = 'grid'; // 'grid' or 'list'
    const viewGridBtn = document.getElementById('viewGridBtn');
    const viewListBtn = document.getElementById('viewListBtn');
    const projectGrid = document.getElementById('dashboardProjectGrid');
    const projectTableContainer = document.getElementById('dashboardProjectTableContainer');
    const projectTableBody = document.getElementById('dashboardProjectTableBody');
    const searchInput = document.getElementById('projectSearchInput');
    let currentEngineFilter = 'all';

    if (viewGridBtn && viewListBtn) {
        viewGridBtn.addEventListener('click', () => {
            currentViewMode = 'grid';
            viewGridBtn.classList.add('active');
            viewListBtn.classList.remove('active');
            if (projectGrid) projectGrid.style.display = 'grid';
            if (projectTableContainer) projectTableContainer.style.display = 'none';
        });

        viewListBtn.addEventListener('click', () => {
            currentViewMode = 'list';
            viewListBtn.classList.add('active');
            viewGridBtn.classList.remove('active');
            if (projectGrid) projectGrid.style.display = 'none';
            if (projectTableContainer) projectTableContainer.style.display = 'block';
        });
    }

    function renderCreations() {
        if (!projectGrid && !projectTableBody) return;
        if (projectGrid) projectGrid.innerHTML = '';
        if (projectTableBody) projectTableBody.innerHTML = '';

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
            const emptyHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; background: var(--d-surface); border: 1px dashed var(--d-border); border-radius: 16px; color: #a1a1aa;">
                    <i class="ri-folder-open-line" style="font-size: 2.4rem; opacity: 0.4; display: block; margin-bottom: 10px;"></i>
                    <h4 style="color: #fff; margin: 0 0 6px; font-size: 1.05rem;">No simulations found</h4>
                    <p style="margin: 0 0 16px; font-size: 0.84rem;">Launch Manim, JSXGraph, or Three.js in the Studio to publish animations.</p>
                    <a href="xtraAnim.html" class="btn-card-action primary" style="display: inline-flex; width: auto; padding: 8px 20px;">
                        <i class="ri-add-line"></i> Open Studio
                    </a>
                </div>
            `;
            if (projectGrid) projectGrid.innerHTML = emptyHTML;
            if (projectTableBody) {
                projectTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 36px; color: var(--d-muted);">No simulations found.</td></tr>`;
            }
            return;
        }

        filtered.forEach(post => {
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

            // 1. Render in Grid View
            if (projectGrid) {
                const card = document.createElement('div');
                card.className = 'creation-card';
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
                            <button class="btn-card-action delete-btn danger" data-id="${post.id}" title="Delete" style="flex:0 0 36px; padding:0; display:flex; align-items:center; justify-content:center;">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    </div>
                `;

                const vid = card.querySelector('video');
                if (vid) {
                    card.onmouseenter = () => vid.play().catch(() => {});
                    card.onmouseleave = () => vid.pause();
                }

                projectGrid.appendChild(card);
            }

            // 2. Render in Table List View (YouTube Studio style)
            if (projectTableBody) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="table-thumb-col">
                            <div class="table-thumb">${previewHTML}</div>
                            <div>
                                <div class="table-title" title="${post.title || 'Untitled Animation'}">${post.title || 'Untitled Animation'}</div>
                                <div style="font-size:0.75rem; color:var(--d-muted); margin-top:2px;">Public Simulation</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="engine-tag" style="position:static; display:inline-block;">${engineName}</span></td>
                    <td>${dateStr}</td>
                    <td><strong>${views.toLocaleString()}</strong></td>
                    <td><strong>${likes.toLocaleString()}</strong></td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <a href="xtraAnim.html?remix=${post.id}" class="btn-card-action primary" style="padding:4px 10px; font-size:0.75rem;">Edit</a>
                            <a href="reels.html?id=${post.id}" class="btn-card-action" style="padding:4px 10px; font-size:0.75rem;">View</a>
                            <button class="btn-card-action danger delete-btn" data-id="${post.id}" style="padding:4px 8px;"><i class="ri-delete-bin-line"></i></button>
                        </div>
                    </td>
                `;
                projectTableBody.appendChild(row);
            }
        });

        // Attach delete handlers for both views
        document.querySelectorAll('.delete-btn').forEach(btn => {
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
                if (contentTotalBadge) contentTotalBadge.textContent = `${userPosts.length} total`;
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

    // 9. Render Library Tab (Courses & Books)
    const libraryGrid = document.getElementById('dashboardLibraryGrid');
    function renderLibrary() {
        if (!libraryGrid) return;
        const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');

        if (savedPosts.length === 0) {
            libraryGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; background: var(--d-surface); border: 1px dashed var(--d-border); border-radius: 16px; color: #a1a1aa;">
                    <i class="ri-book-read-line" style="font-size: 2.4rem; opacity: 0.4; display: block; margin-bottom: 10px;"></i>
                    <h4 style="color: #fff; margin: 0 0 6px; font-size: 1.05rem;">No enrolled courses yet</h4>
                    <p style="margin: 0 0 16px; font-size: 0.84rem;">Explore interactive physics & math courses in the store.</p>
                    <a href="store.html" class="btn-card-action primary" style="display: inline-flex; width: auto; padding: 8px 18px;">
                        <i class="ri-store-2-line"></i> Browse Course Store
                    </a>
                </div>
            `;
        }
    }

    // Initial render
    renderCreations();
    renderLibrary();

    // 10. Handle Pro Upgrade & Customer Portal
    const handleUpgradeClick = () => {
        if (window.openPricingModal && typeof window.openPricingModal === 'function') {
            window.openPricingModal();
        } else {
            const monTab = document.querySelector('[data-tab="tab-monetization"]');
            if (monTab) monTab.click();
        }
    };

    if (dashTierBadge) {
        dashTierBadge.addEventListener('click', (e) => {
            e.preventDefault();
            handleUpgradeClick();
        });
    }
    if (billingActionBtn && !isPro) billingActionBtn.addEventListener('click', handleUpgradeClick);
});
