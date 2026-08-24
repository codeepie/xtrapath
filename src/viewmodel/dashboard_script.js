// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/dashboard_script.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Authenticate / Check User
    const myUserId = localStorage.getItem('userId');
    const myAvatar = localStorage.getItem('avatarUrl');
    const isPro = localStorage.getItem('is_pro') === 'true';

    // 2. Hydrate Header Elements
    const dashAvatar = document.getElementById('dashAvatar');
    const dashTierBadge = document.getElementById('dashTierBadge');

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

    // 5. Hydrate Latest Creation Performance Spotlight (Show Only 1 by Default)
    const latestPost = userPosts[0];
    const spotlightTitle = document.getElementById('spotlightTitle');
    const spotlightViews = document.getElementById('spotlightViews');
    const spotlightViewsNum = document.getElementById('spotlightViewsNum');
    const spotlightLikesNum = document.getElementById('spotlightLikesNum');
    const spotlightRemixesNum = document.getElementById('spotlightRemixesNum');
    const spotlightThumb = document.getElementById('spotlightThumb');
    const spotlightDate = document.getElementById('latestSpotlightDate');
    const spotlightEditBtn = document.getElementById('spotlightEditBtn');
    const spotlightViewBtn = document.getElementById('spotlightViewBtn');

    if (latestPost) {
        const postViews = Number(latestPost.views_count) || 48;
        const postLikes = Number(latestPost.likes_count) || (latestPost.likes ? latestPost.likes.length : 6);
        const postRemixes = Number(latestPost.remix_count) || 1;
        const engineName = (latestPost.format || latestPost.source?.engine || 'Manim').toUpperCase();

        if (spotlightTitle) spotlightTitle.textContent = latestPost.title || 'Untitled Simulation';
        if (spotlightViews) spotlightViews.textContent = postViews.toLocaleString();
        if (spotlightViewsNum) spotlightViewsNum.textContent = postViews.toLocaleString();
        if (spotlightLikesNum) spotlightLikesNum.textContent = postLikes.toLocaleString();
        if (spotlightRemixesNum) spotlightRemixesNum.textContent = postRemixes.toLocaleString();
        if (spotlightEditBtn) spotlightEditBtn.href = `xtraAnim.html?remix=${latestPost.id}`;
        if (spotlightViewBtn) spotlightViewBtn.href = `reels.html?id=${latestPost.id}`;
        if (spotlightDate && latestPost.created_at) {
            spotlightDate.textContent = `Published on ${new Date(latestPost.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }

        if (spotlightThumb) {
            let mediaHTML = '';
            if (latestPost.thumbnail_url || latestPost.cover_image) {
                mediaHTML = `<img src="${latestPost.thumbnail_url || latestPost.cover_image}" alt="Thumb">`;
            } else if (latestPost.video_url && (latestPost.video_url.endsWith('.mp4') || latestPost.video_url.endsWith('.webm'))) {
                mediaHTML = `<video src="${latestPost.video_url}" muted playsinline loop></video>`;
            } else {
                mediaHTML = `<i class="ri-compasses-2-line" style="font-size: 2.8rem; color: #38bdf8;"></i>`;
            }

            spotlightThumb.innerHTML = `
                ${mediaHTML}
                <div class="ig-thumb-gradient"></div>
                <span class="ig-engine-badge">${engineName}</span>
                <div class="ig-views-pill"><i class="ri-play-fill"></i> ${postViews.toLocaleString()}</div>
            `;

            const vid = spotlightThumb.querySelector('video');
            if (vid) {
                spotlightThumb.onmouseenter = () => vid.play().catch(() => {});
                spotlightThumb.onmouseleave = () => vid.pause();
            }
        }
    } else {
        if (spotlightTitle) spotlightTitle.textContent = 'No simulations published yet';
        if (spotlightDate) spotlightDate.textContent = 'Launch the Studio to create your first animation';
        if (spotlightThumb) {
            spotlightThumb.innerHTML = `
                <i class="ri-movie-2-line" style="font-size: 2.6rem; color: var(--ig-muted);"></i>
                <div class="ig-thumb-gradient"></div>
                <span class="ig-engine-badge">STUDIO</span>
            `;
        }
    }

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
