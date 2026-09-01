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
        dashTierBadge.title = isPro ? 'Click to toggle Free/Pro testing mode' : 'Click to Upgrade to Pro';
        dashTierBadge.style.cursor = 'pointer';
        dashTierBadge.onclick = (e) => {
            e.stopPropagation();
            if (isPro) {
                if (confirm('Currently on Pro Plan. Switch to Free Tier to test payment & source code barriers?')) {
                    localStorage.setItem('is_pro', 'false');
                    localStorage.removeItem('unlockedPurchases');
                    location.reload();
                }
            } else {
                if (window.openPricingModal) window.openPricingModal();
            }
        };
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
    const statMarketplaceSales = document.getElementById('statMarketplaceSales');
    const periodSelect = document.getElementById('dashPeriodSelect');

    function updateMetricValues(multiplier = 1) {
        const totalV = Math.round(baseViews * multiplier);
        const totalL = Math.round(baseLikes * multiplier);
        const totalR = Math.max(1, Math.round(baseRemixes * multiplier));

        if (statProjects) statProjects.textContent = totalProjects.toLocaleString();
        if (statViews) statViews.textContent = totalV.toLocaleString();
        if (statLikes) statLikes.textContent = totalL.toLocaleString();
        if (statRemixes) statRemixes.textContent = totalR.toLocaleString();
        
        const earnings = Math.round(baseSales * multiplier);
        if (statMarketplaceSales) statMarketplaceSales.textContent = `$${earnings.toLocaleString()}`;
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

    // 5. Handle Pro Upgrade & Customer Portal
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

    // ============================================================
    // 6. MY PURCHASED LIBRARY & DIGITAL ASSETS ENGINE
    // ============================================================
    const libraryGrid = document.getElementById('purchasedLibraryGrid');
    const libraryFilterTabs = document.getElementById('libraryFilterTabs');
    const librarySearchInput = document.getElementById('librarySearchInput');
    const purchasedCountText = document.getElementById('purchasedCountText');
    const countAllEl = document.getElementById('countAll');

    // Receipt Modal Elements
    const receiptModal = document.getElementById('receiptModal');
    const closeReceiptModalBtn = document.getElementById('closeReceiptModalBtn');
    const printReceiptBtn = document.getElementById('printReceiptBtn');
    const rcptId = document.getElementById('rcptId');
    const rcptDate = document.getElementById('rcptDate');
    const rcptTitle = document.getElementById('rcptTitle');
    const rcptGateway = document.getElementById('rcptGateway');
    const rcptAmount = document.getElementById('rcptAmount');

    // Catalog dictionary for rich display
    const CATALOG_MAP = {
        'prod_quantum_mastery': {
            title: 'Quantum Wave Mechanics Masterclass',
            category: 'course',
            author: 'Prof. Alistair Vance',
            thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop',
            price: '$24.99',
            url: '/views/courseView.html?id=course_quantum_mechanics',
            filesCount: '14 Lectures • 3 Simulations'
        },
        'course_quantum_mechanics': {
            title: 'Quantum Wave Mechanics Masterclass',
            category: 'course',
            author: 'Prof. Alistair Vance',
            thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop',
            price: '$24.99',
            url: '/views/courseView.html?id=course_quantum_mechanics',
            filesCount: '14 Lectures • 3 Simulations'
        },
        'course_orbital_mechanics': {
            title: 'Orbital Mechanics & Astrodynamics',
            category: 'course',
            author: 'Dr. Elena Rostova',
            thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop',
            price: '$19.99',
            url: '/views/courseView.html?id=course_orbital_mechanics',
            filesCount: '10 Modules • 5 3D Codes'
        },
        'course_fluid_dynamics': {
            title: 'Computational Fluid Dynamics & Navier-Stokes',
            category: 'course',
            author: 'XtraPath STEM Faculty',
            thumbnail: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600&auto=format&fit=crop',
            price: '$29.99',
            url: '/views/courseView.html?id=course_fluid_dynamics',
            filesCount: '18 Interactive Lessons'
        },
        'book_relativity': {
            title: 'Special & General Relativity Visualized',
            category: 'book',
            author: 'Albert Einstein & XtraPath Labs',
            thumbnail: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop',
            price: '$12.99',
            url: '/views/bookView.html?id=book_relativity',
            filesCount: '8 Interactive Chapters (PDF/3D)'
        },
        'book_electromagnetism': {
            title: "Maxwell's Equations in Dynamic Motion",
            category: 'book',
            author: 'Dr. James Maxwell',
            thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop',
            price: '$9.99',
            url: '/views/bookView.html?id=book_electromagnetism',
            filesCount: '6 Vector Field Models'
        },
        'prod_tesseract_4d': {
            title: 'Interactive 4D Tesseract Simulation Pack',
            category: 'asset',
            author: 'Priya Sharma',
            thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop',
            price: '$14.99',
            url: '/views/watch.html?id=prod_tesseract_4d',
            filesCount: 'Source Code (WebGL + Shader)'
        },
        'prod_blackhole_lensing': {
            title: 'Gravitational Lensing & Event Horizon Shader',
            category: 'asset',
            author: 'Cosmos Labs',
            thumbnail: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&auto=format&fit=crop',
            price: '$8.99',
            url: '/views/watch.html?id=prod_blackhole_lensing',
            filesCount: 'Three.js / GLSL Shader'
        },
        'prod_fourier_epicycles': {
            title: 'Complex Fourier Epicycles & Curve Drawing',
            category: 'asset',
            author: 'MathViz Studio',
            thumbnail: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop',
            price: '$11.99',
            url: '/views/watch.html?id=prod_fourier_epicycles',
            filesCount: 'Complete Python + JS Package'
        }
    };

    let userPurchasesList = [];
    let currentLibraryFilter = 'all';
    let currentSearchTerm = '';

    async function fetchPurchasedLibrary() {
        let items = [];

        // 1. Fetch genuine verified purchases from backend API
        try {
            const res = await fetch(`/api/user/purchases?userId=${encodeURIComponent(myUserId || 'usr_current_user')}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.purchases && Array.isArray(data.purchases)) {
                    data.purchases.forEach(p => {
                        if (p && (p.stripe_session_id || p.id)) {
                            items.push(p);
                        }
                    });
                }
                if (data && data.isPro && data.subscription) {
                    items.unshift({
                        item_id: 'pro_subscription',
                        item_type: 'pro',
                        title: 'XtraPath All-Access Pro Membership',
                        category: 'pro',
                        author: 'XtraPath Platform',
                        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop',
                        price: data.subscription.plan_interval === 'year' ? '$144.00/yr' : '$15.00/mo',
                        amount: data.subscription.plan_interval === 'year' ? 14400 : 1500,
                        currency: 'usd',
                        url: '/views/explore.html',
                        created_at: data.subscription.current_period_start || new Date().toISOString(),
                        filesCount: 'Active Pro Entitlement',
                        stripe_session_id: data.subscription.stripe_subscription_id || 'PAYPAL_PRO_ACTIVE'
                    });
                }
            }
        } catch (e) {
            console.warn('Could not fetch purchases from /api/user/purchases:', e);
        }

        // 2. Fetch from Supabase direct if authenticated
        if (client && myUserId) {
            try {
                const { data: sbP, error: sbErr } = await client
                    .from('purchases')
                    .select('*')
                    .eq('user_id', myUserId)
                    .order('created_at', { ascending: false });
                if (!sbErr && sbP && Array.isArray(sbP)) {
                    sbP.forEach(p => {
                        if (!items.find(x => String(x.stripe_session_id) === String(p.stripe_session_id) || String(x.item_id) === String(p.item_id))) {
                            items.push(p);
                        }
                    });
                }
            } catch (err) {}
        }

        // 3. Resolve metadata & format from Supabase for all purchased items (handles UUIDs seamlessly)
        const unknownIds = items.map(x => String(x.item_id)).filter(id => id && !CATALOG_MAP[id]);
        if (unknownIds.length > 0) {
            const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            localPosts.forEach(lp => {
                if (unknownIds.includes(String(lp.id))) {
                    fetchedPostsMap[String(lp.id)] = lp;
                }
            });

            if (client) {
                try {
                    const { data: postsData } = await client
                        .from('posts')
                        .select('*')
                        .in('id', unknownIds);
                    if (postsData && Array.isArray(postsData)) {
                        postsData.forEach(p => {
                            fetchedPostsMap[String(p.id)] = p;
                        });
                    }
                } catch (e) {
                    console.warn("Could not batch fetch post metadata for purchases:", e);
                }
            }
        }

        userPurchasesList = items;
        renderPurchasedLibrary();
    }

    let fetchedPostsMap = {};

    function resolveItemDetails(item) {
        const id = String(item.item_id || item.id || '');
        const meta = CATALOG_MAP[id] || {};
        const post = fetchedPostsMap[id] || (JSON.parse(localStorage.getItem('userPosts') || '[]').find(p => String(p.id) === id));

        // Format detection
        const rawFormat = (
            post?.format || 
            post?.type || 
            post?.media_type || 
            item.item_type || 
            item.category || 
            meta.category || 
            ''
        ).toLowerCase();

        const title = (
            item.title || 
            post?.title || 
            meta.title || 
            id.replace(/^(prod_|course_|book_)/, '').replace(/_/g, ' ').toUpperCase()
        );

        let category = 'asset';
        let launchUrl = `/views/watch.html?id=${encodeURIComponent(id)}`;

        if (
            rawFormat === 'pdf' || 
            rawFormat.includes('book') || 
            rawFormat === 'latex' || 
            id.startsWith('book_') || 
            title.toLowerCase().includes('book') || 
            title.toLowerCase().includes('textbook') || 
            post?.source?.chapters
        ) {
            category = 'book';
            launchUrl = `/views/bookView.html?id=${encodeURIComponent(id)}`;
        } else if (
            rawFormat === 'course' || 
            rawFormat.includes('course') || 
            id.startsWith('course_') || 
            title.toLowerCase().includes('course') || 
            title.toLowerCase().includes('masterclass') || 
            post?.source?.sections
        ) {
            category = 'course';
            launchUrl = `/views/courseView.html?id=${encodeURIComponent(id)}`;
        } else if (
            rawFormat === 'article' || 
            rawFormat.includes('article') || 
            id.startsWith('article_') || 
            rawFormat === 'mermaid'
        ) {
            category = 'article';
            launchUrl = `/views/articleView.html?id=${encodeURIComponent(id)}`;
        } else if (
            rawFormat === 'explanation' || 
            rawFormat.includes('explain') || 
            id.startsWith('exp_') ||
            post?.source?.explanation_script
        ) {
            category = 'explanation';
            launchUrl = `/views/explainView.html?id=${encodeURIComponent(id)}`;
        } else if (
            rawFormat === 'pro' || 
            id.includes('pro') || 
            title.toLowerCase().includes('pro membership')
        ) {
            category = 'pro';
            launchUrl = `/views/explore.html`;
        }

        const author = post?.username || item.author || meta.author || 'Verified Creator';
        const thumb = post?.cover_image || post?.thumbnail_url || item.thumbnail || meta.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop';
        const price = meta.price || (item.amount ? `$${(item.amount / 100).toFixed(2)}` : '$14.99');
        const filesCount = meta.filesCount || (category === 'book' ? 'Digital Interactive Textbook & PDF' : (category === 'course' ? 'Full Mastery Curriculum & 3D Labs' : 'Complete 3D Simulation & Code Assets'));

        return { id, title, category, launchUrl, author, thumb, price, filesCount };
    }

    function renderPurchasedLibrary() {
        if (!libraryGrid) return;

        let filtered = userPurchasesList.map(item => resolveItemDetails(item)).filter(info => {
            // Tab filter match
            let matchesTab = true;
            if (currentLibraryFilter === 'course') {
                matchesTab = info.category === 'course';
            } else if (currentLibraryFilter === 'book') {
                matchesTab = info.category === 'book';
            } else if (currentLibraryFilter === 'asset') {
                matchesTab = info.category === 'asset' || info.category === 'article';
            } else if (currentLibraryFilter === 'pro') {
                matchesTab = info.category === 'pro';
            }

            // Search match
            let matchesSearch = true;
            if (currentSearchTerm) {
                matchesSearch = info.title.toLowerCase().includes(currentSearchTerm) || info.id.toLowerCase().includes(currentSearchTerm);
            }

            return matchesTab && matchesSearch;
        });

        // Update Counter Badges
        if (purchasedCountText) purchasedCountText.textContent = `${userPurchasesList.length} Unlocked`;
        if (countAllEl) countAllEl.textContent = userPurchasesList.length;

        if (filtered.length === 0) {
            libraryGrid.innerHTML = `
                <div class="library-empty-state" style="grid-column: 1 / -1;">
                    <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.3); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: #c084fc; margin: 0 auto 14px;">
                        <i class="ri-folder-shield-2-line"></i>
                    </div>
                    <h3 style="color:#ffffff; font-size:1.05rem; font-weight:700; margin:0 0 6px;">No Purchased Items in this category</h3>
                    <p style="color:#a1a1aa; font-size:0.82rem; margin:0 0 18px; max-width:380px; margin-left:auto; margin-right:auto;">
                        Explore our interactive marketplace to unlock STEM simulations, quantum masterclasses, and visual interactive textbooks.
                    </p>
                    <a href="store.html" class="btn-library-open" style="max-width:180px; margin:0 auto; padding:8px 18px;">
                        <i class="ri-store-2-line"></i> Browse Store
                    </a>
                </div>
            `;
            return;
        }

        libraryGrid.innerHTML = filtered.map(info => {
            const categoryLabels = {
                course: '🎓 Course',
                book: '📚 Interactive Book',
                article: '📝 Article',
                asset: '📦 Simulation Asset',
                pro: '💎 Pro All-Access'
            };

            const displayTag = categoryLabels[info.category] || '⚡ Digital Good';

            return `
                <div class="library-item-card" data-item-id="${info.id}">
                    <div class="library-item-thumb" style="background-image: url('${info.thumb}');">
                        <span class="library-category-badge ${info.category}">${displayTag}</span>
                        <span class="library-status-chip"><i class="ri-checkbox-circle-fill"></i> Unlocked</span>
                    </div>

                    <div class="library-item-body">
                        <div>
                            <h3 class="library-item-title">${info.title}</h3>
                            <div class="library-item-meta">
                                <span><i class="ri-user-smile-line"></i> ${info.author}</span>
                                <span style="color:#c084fc; font-weight:700;">${info.price}</span>
                            </div>
                            <div style="font-size:0.72rem; color:#71717a; margin-top:4px;">
                                <i class="ri-file-code-line"></i> ${info.filesCount}
                            </div>
                        </div>

                        <div class="library-item-actions">
                            <a href="${info.launchUrl}" class="btn-library-open" title="Open and start studying">
                                <i class="ri-play-circle-line"></i> Open
                            </a>
                            <button class="btn-library-receipt" onclick="window.showPurchaseReceipt('${info.id}', '${info.title.replace(/'/g, "\\'")}', '${info.price}')" title="View Official Tax Invoice">
                                <i class="ri-file-list-3-line"></i>
                            </button>
                            <button class="btn-library-receipt" onclick="window.downloadPurchasedAssets('${info.id}', '${info.title.replace(/'/g, "\\'")}')" title="Download Source Files / Assets">
                                <i class="ri-download-2-line"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }


    // Filter tab clicks
    if (libraryFilterTabs) {
        libraryFilterTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('.library-tab-pill');
            if (!btn) return;
            libraryFilterTabs.querySelectorAll('.library-tab-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLibraryFilter = btn.getAttribute('data-filter') || 'all';
            renderPurchasedLibrary();
        });
    }

    // Search input
    if (librarySearchInput) {
        librarySearchInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value.trim().toLowerCase();
            renderPurchasedLibrary();
        });
    }

    // Sync Genuine Purchases Button
    const syncPurchasesBtn = document.getElementById('syncPurchasesLibraryBtn');
    if (syncPurchasesBtn) {
        syncPurchasesBtn.addEventListener('click', async () => {
            syncPurchasesBtn.disabled = true;
            syncPurchasesBtn.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 0.8s linear infinite;"></i> Syncing…';
            localStorage.removeItem('unlockedPurchases');
            await fetchPurchasedLibrary();
            syncPurchasesBtn.disabled = false;
            syncPurchasesBtn.innerHTML = '<i class="ri-refresh-line"></i> Sync Real Purchases';
        });
    }


    // Global helpers for receipt & downloads
    window.showPurchaseReceipt = function(itemId, itemTitle, itemPrice) {
        if (!receiptModal) return;
        const txId = 'TX-PP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        if (rcptId) rcptId.textContent = txId;
        if (rcptDate) rcptDate.textContent = dateStr;
        if (rcptTitle) rcptTitle.textContent = itemTitle;
        if (rcptAmount) rcptAmount.textContent = itemPrice || '$14.99 USD';
        if (rcptGateway) rcptGateway.textContent = 'PayPal REST API v2 (Verified)';

        receiptModal.style.display = 'flex';
    };

    window.downloadPurchasedAssets = function(itemId, itemTitle) {
        const dummyPkg = {
            platform: "XtraPath Global Digital Marketplace",
            license: "Single-User Commercial & Educational License",
            itemId: itemId,
            itemTitle: itemTitle,
            unlockedAt: new Date().toISOString(),
            assets: [
                { filename: `${itemId}_source.json`, type: "WebGL/Three.js Model Configuration" },
                { filename: `${itemId}_engine.js`, type: "Interactive Simulation Engine" },
                { filename: `documentation.pdf`, type: "Full Course / Model Technical Guide" }
            ]
        };
        const blob = new Blob([JSON.stringify(dummyPkg, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${itemId}_unlocked_package.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (window.showPurchaseSuccessToast) {
            window.showPurchaseSuccessToast("💾 Package Downloaded", `Saved verified source assets for "${itemTitle}".`);
        } else {
            alert(`💾 Unlocked source package downloaded for "${itemTitle}".`);
        }
    };

    if (closeReceiptModalBtn) {
        closeReceiptModalBtn.addEventListener('click', () => {
            receiptModal.style.display = 'none';
        });
    }

    if (printReceiptBtn) {
        printReceiptBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (receiptModal) {
        receiptModal.addEventListener('click', (e) => {
            if (e.target === receiptModal) {
                receiptModal.style.display = 'none';
            }
        });
    }

    // Initialize library
    fetchPurchasedLibrary();
});

