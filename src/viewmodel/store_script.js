function initStore() {
    const storeGrid = document.getElementById('storeGrid');
    const storeFilters = document.getElementById('storeFilters');
    let allPosts = [];
    let activeFilter = 'all';

    // --- NEW: Map technical formats to user-friendly categories ---
    const categoryMap = {
        'course': 'courses',
        'asset': 'assets',
        'pdf': 'books',
        '3d_model': '3d models',
        'article': 'assets',
        'diagram': 'assets',
        'video': 'assets',
        'image': 'assets',
        '16:9': 'assets',
        '9:16': 'assets'
    };

    const formatDisplayMap = {
        'course': 'Course',
        'asset': 'Asset Pack',
        'pdf': 'Book',
        '3d_model': '3D Model',
        'article': 'Article',
        'diagram': 'Diagram',
        'video': 'Animation',
        'image': 'Asset',
        '16:9': 'Animation',
        '9:16': 'Animation'
    };

    // --- INSTANT RENDER FROM CACHE (Zero Loading Time) ---
    try {
        const cachedRaw = localStorage.getItem('cachedStoreItems');
        if (cachedRaw) {
            const cachedItems = JSON.parse(cachedRaw);
            if (cachedItems && cachedItems.length > 0) {
                allPosts = cachedItems;
                const categories = ['All', ...new Set(cachedItems.map(p => {
                    if (p.source?.item_subtype === 'worksheet' || p.item_subtype === 'worksheet') return 'worksheets';
                    return categoryMap[p.format];
                }).filter(Boolean).map(c => c.charAt(0).toUpperCase() + c.slice(1)))];
                renderFilters(categories);
                renderGrid(cachedItems);
            }
        }
    } catch (_) {}

    async function getSupabase() {
        if (window.supabaseClient) return window.supabaseClient;
        if (typeof supabase !== 'undefined' && supabase.from) return supabase;
        try {
            const configRes = await fetch('/api/config');
            const config = await configRes.json();
            if (window.supabase && window.supabase.createClient) {
                window.supabaseClient = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
                return window.supabaseClient;
            }
        } catch (e) {
            console.warn("Could not init Supabase client in store:", e);
        }
        return null;
    }

    // 1. Fetch and prepare data (Ultra-lightweight 28KB query)
    async function loadStoreItems() {
        let items = [];
        try {
            const client = await getSupabase();
            if (client) {
                const cols = 'id,created_at,user_id,title,description,video_url,media_type,format,username,avatar_url,source->price,source->is_for_sale,source->access_tier,source->item_subtype,source->author,source->sections,source->assetItems';
                const { data, error } = await client
                    .from('posts')
                    .select(cols)
                    .or('format.in.(course,asset),source->>is_for_sale.eq.true,source->>access_tier.eq.store_sale')
                    .order('created_at', { ascending: false });
                if (!error && data) {
                    items = data.map(p => ({
                        ...p,
                        price: p.price || p.source?.price,
                        is_for_sale: p.is_for_sale !== undefined ? p.is_for_sale : p.source?.is_for_sale,
                        source: {
                            price: p.price,
                            is_for_sale: p.is_for_sale,
                            access_tier: p.access_tier,
                            item_subtype: p.item_subtype,
                            author: p.author,
                            sections: p.sections,
                            assetItems: p.assetItems,
                            ...(p.source || {})
                        }
                    }));
                } else if (error) {
                    console.warn("Supabase store query error:", error);
                }
            }
        } catch (e) {
            console.warn("Could not fetch store items from Supabase:", e);
        }

        // Merge with local storage posts
        const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');

        const map = new Map();
        items.forEach(p => map.set(String(p.id), p));
        localPosts.forEach(p => {
            if (!map.has(String(p.id))) {
                map.set(String(p.id), p);
            }
        });

        allPosts = Array.from(map.values());
        // For sale items include courses and any post marked for sale
        let forSaleItems = allPosts.filter(p => p.format === 'course' || p.format === 'asset' || p.source?.is_for_sale === true || p.is_for_sale === true || p.source?.access_tier === 'store_sale');

        if (forSaleItems.length === 0) {
            const defaults = [
                {
                    id: "prod_tesseract_4d",
                    title: "Interactive 4D Tesseract Simulation Pack",
                    price: "14.99",
                    format: "asset",
                    username: "Priya Sharma",
                    video_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop",
                    media_type: "image",
                    is_for_sale: true,
                    description: "Complete 4-dimensional hypercube rotation and slicing engine with interactive vertex controls."
                },
                {
                    id: "prod_quantum_mastery",
                    title: "Quantum Wave Mechanics Masterclass",
                    price: "24.99",
                    format: "course",
                    username: "Dr. Rohit Verma",
                    video_url: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600&auto=format&fit=crop",
                    media_type: "image",
                    is_for_sale: true,
                    description: "12 interactive chapters covering Schrödinger wave packets, tunneling, and quantum optics."
                },
                {
                    id: "prod_relativity_book",
                    title: "Special & General Relativity Visual Guide",
                    price: "9.99",
                    format: "pdf",
                    username: "Elena Rostova",
                    video_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop",
                    media_type: "image",
                    is_for_sale: true,
                    description: "Interactive PDF e-book with spacetime diagrams, light cones, and Lorentz contraction widgets."
                },
                {
                    id: "prod_gravitational_3d",
                    title: "Gravitational Lensing 3D Engine Model",
                    price: "19.99",
                    format: "3d_model",
                    username: "Vikramaditya Sen",
                    video_url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop",
                    media_type: "image",
                    is_for_sale: true,
                    description: "Real-time ray-traced Schwarzschild black hole geodesics and photon sphere visualizer."
                }
            ];
            defaults.forEach(d => {
                map.set(d.id, d);
                forSaleItems.push(d);
            });
            allPosts = Array.from(map.values());
        }

        // Cache items in localStorage for instant 0ms loads on return visits
        try {
            localStorage.setItem('cachedStoreItems', JSON.stringify(forSaleItems));
        } catch (_) {}

        // Generate filter categories dynamically
        const categories = ['All', ...new Set(forSaleItems.map(p => {
            if (p.source?.item_subtype === 'worksheet') return 'worksheets';
            return categoryMap[p.format];
        }).filter(Boolean).map(c => c.charAt(0).toUpperCase() + c.slice(1)))];
        renderFilters(categories);

        // Initial render
        renderGrid(forSaleItems);
    }

    // 2. Render filter buttons
    function renderFilters(categories) {
        if (!storeFilters) return;
        storeFilters.innerHTML = '';
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            const filterValue = category.toLowerCase();
            button.dataset.filter = filterValue;
            button.textContent = category;
            if (filterValue === activeFilter) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                activeFilter = filterValue;
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                filterAndRender();
            });
            storeFilters.appendChild(button);
        });
    }

    // 3. Filter and re-render grid
    function filterAndRender() {
        const forSaleItems = allPosts.filter(p => p.is_for_sale === true || p.format === 'course' || p.format === 'asset');
        let filteredItems;

        if (activeFilter === 'all') {
            filteredItems = forSaleItems;
        } else {
            filteredItems = forSaleItems.filter(p => {
                const cat = (p.source?.item_subtype === 'worksheet') ? 'worksheets' : (categoryMap[p.format] || 'other');
                return cat === activeFilter;
            });
        }
        renderGrid(filteredItems);
    }

    // 4. Render the grid of items
    function renderGrid(items) {
        if (!storeGrid) return;
        storeGrid.innerHTML = '';

        if (items.length === 0) {
            storeGrid.innerHTML = `<div class="loading-container" style="grid-column: 1 / -1;">
                <i class="ri-shopping-cart-line" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>No items found for this category.</p>
            </div>`;
            return;
        }

        items.forEach(post => {
            const card = createItemCard(post);
            storeGrid.appendChild(card);
        });
        // After adding cards, update avatars using the global function
        if (window.updateUserAvatars) {
            window.updateUserAvatars();
        }
    }
    // 5. Create a single item card (Dispatcher)
    function createItemCard(post) {
        if (post.format === 'course' || post.format === 'asset') {
            return createCourseCard(post);
        }

        const card = document.createElement('div');
        card.className = 'glass-card store-item-card';

        const fullMediaUrl = post.video_url || post.videoUrl || '';
        const mediaType = post.media_type || post.mediaType || '';
        let thumbnailHTML = '';
        if (mediaType.startsWith('video')) {
            thumbnailHTML = `<video src="${fullMediaUrl}" muted loop playsinline></video>`;
        } else {
            thumbnailHTML = `<img src="${fullMediaUrl}" alt="${post.title}">`;
        }

        const isWorksheet = post.source?.item_subtype === 'worksheet';
        const isNotes = post.source?.item_subtype === 'notes';
        const formatBadge = isWorksheet ? 'Worksheet' : (isNotes ? 'Study Notes' : (formatDisplayMap[post.format] || 'Asset'));
        const authorName = post.username || post.source?.author || 'Creator';
        const authorUserId = post.user_id || '';
        const isOwn = (localStorage.getItem('userId') && String(localStorage.getItem('userId')) === String(authorUserId)) || 
                      (localStorage.getItem('username') && localStorage.getItem('username').toLowerCase() === authorName.toLowerCase());

        const optionsHTML = isOwn ? `
            <div class="card-options-dropdown" style="position: absolute; top: 10px; right: 10px; z-index: 25;">
                <button class="card-options-btn" title="Options" style="background: rgba(0,0,0,0.65); border: 1px solid rgba(255,255,255,0.25); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(8px); transition: all 0.2s;">
                    <i class="ri-more-2-fill" style="font-size: 1.1rem;"></i>
                </button>
                <div class="card-options-menu" style="display: none; position: absolute; right: 0; top: 38px; background: #181b24; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.6); overflow: hidden; min-width: 120px; z-index: 30;">
                    <button class="card-menu-item btn-edit-item" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 14px; background: transparent; border: none; color: #e4e4e7; font-size: 0.85rem; font-weight: 500; cursor: pointer; text-align: left;">
                        <i class="ri-edit-line" style="color: #60a5fa;"></i> Edit
                    </button>
                    <button class="card-menu-item btn-delete-item" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 14px; background: transparent; border: none; color: #f87171; font-size: 0.85rem; font-weight: 500; cursor: pointer; text-align: left; border-top: 1px solid rgba(255,255,255,0.06);">
                        <i class="ri-delete-bin-line"></i> Delete
                    </button>
                </div>
            </div>` : '';

        const price = post.price || post.source?.price || '29.99';
        const isUnlocked = window.isItemUnlocked ? window.isItemUnlocked(post.id) : false;
        const buyBtnText = isUnlocked ? 'Open Item' : `Buy $${price}`;

        const graphBtnHTML = `
            <button class="store-item-graph-btn" title="View Preview" style="position: absolute; top: 10px; right: ${isOwn ? '48px' : '10px'}; z-index: 20; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(147, 197, 253, 0.4); color: #93c5fd; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(8px); transition: all 0.2s;" onmouseover="this.style.transform='scale(1.1)'; this.style.borderColor='#60a5fa';" onmouseout="this.style.transform='scale(1)'; this.style.borderColor='rgba(147, 197, 253, 0.4)';">
                <i class="ri-eye-line" style="font-size: 1.15rem;"></i>
            </button>`;

        card.innerHTML = `
            <div class="store-item-thumbnail">
                ${thumbnailHTML}
                <div class="store-item-format-badge">${formatBadge}</div>
                ${graphBtnHTML}
                ${optionsHTML}
            </div>
            <div class="store-item-info">
                <h3 class="store-item-title">${post.title}</h3>
                <div class="store-item-author">
                    <div class="avatar"></div>
                    <span>${authorName}</span>
                </div>
                <div class="store-item-footer">
                    <span class="store-item-price">$${price}</span>
                    <button class="btn-primary btn-buy" id="buyBtnGeneric-${post.id}">${buyBtnText}</button>
                </div>
            </div>
        `;

        // Handle Eye Icon Click
        const graphBtn = card.querySelector('.store-item-graph-btn');
        if (graphBtn) {
            graphBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openItemView();
            });
        }

        // Add hover effect for video playback
        const video = card.querySelector('video');
        if (video) {
            card.addEventListener('mouseenter', () => video.play());
            card.addEventListener('mouseleave', () => video.pause());
        }

        if (isOwn) {
            setupCardOptionsMenu(card, post);
        }

        function openItemView() {
            if (post.format === 'pdf' || post.format === 'book') {
                window.location.href = `/views/bookView.html?id=${post.id}`;
            } else if (post.format === 'article') {
                window.location.href = `/views/articleView.html?id=${post.id}`;
            } else if (post.format === 'course') {
                window.location.href = `/views/courseGraph.html?id=${post.id}`;
            } else {
                window.location.href = `/views/reels.html?id=${post.id}`;
            }
        }

        const buyBtn = card.querySelector(`#buyBtnGeneric-${post.id}`);
        if (buyBtn) {
            buyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.isItemUnlocked && window.isItemUnlocked(post.id)) {
                    openItemView();
                } else if (window.openProductCheckoutModal) {
                    window.openProductCheckoutModal({
                        id: post.id,
                        title: post.title,
                        price: price,
                        format: formatBadge
                    }, () => {
                        openItemView();
                    });
                } else {
                    openItemView();
                }
            });
        }

        card.addEventListener('click', () => {
            if (window.isItemUnlocked && window.isItemUnlocked(post.id)) {
                openItemView();
            } else if (window.openProductCheckoutModal) {
                window.openProductCheckoutModal({
                    id: post.id,
                    title: post.title,
                    price: price,
                    format: formatBadge
                }, () => {
                    openItemView();
                });
            } else {
                openItemView();
            }
        });

        return card;
    }

    // 6. Create a specific, beautiful card for courses and digital asset packs
    function createCourseCard(post) {
        const card = document.createElement('div');
        const isAsset = (post.format === 'asset');
        card.className = `glass-card course-card ${isAsset ? 'asset-store-card' : ''}`;

        const coverPostMedia = post.video_url || post.videoUrl || '';
        const coverPostMediaType = post.media_type || post.mediaType || '';

        let thumbnailHTML = '';
        if (coverPostMediaType && coverPostMediaType.startsWith('video')) {
            thumbnailHTML = `<video src="${coverPostMedia}" muted loop playsinline></video>`;
        } else {
            thumbnailHTML = `<img src="${coverPostMedia}" alt="${post.title}">`;
        }

        const sectionCount = post.source?.sections?.length || 0;
        const lessonCount = post.source?.sections?.reduce((acc, section) => acc + (section.lessons?.length || 0), 0) || 0;
        const assetCount = post.source?.assetItems?.length || 0;

        const statsHTML = isAsset
            ? `<span><i class="ri-box-3-line" style="color:#60a5fa;"></i> ${assetCount} ${assetCount === 1 ? 'Asset Item' : 'Asset Items'}</span>
               <span><i class="ri-download-cloud-2-line" style="color:#34d399;"></i> Included Files</span>`
            : `<span><i class="ri-book-3-line" style="color:#818cf8;"></i> ${sectionCount} Sections</span>
               <span><i class="ri-file-list-3-line" style="color:#a78bfa;"></i> ${lessonCount} Lessons</span>`;

        const badgeHTML = isAsset
            ? `<div class="store-item-format-badge" style="background: rgba(37,99,235,0.85); border-color: rgba(96,165,250,0.4);"><i class="ri-box-3-line"></i> Asset Pack</div>`
            : `<div class="store-item-format-badge" style="background: rgba(99,102,241,0.85); border-color: rgba(129,140,248,0.4);"><i class="ri-graduation-cap-line"></i> Course</div>`;

        const authorName = post.username || post.source?.author || 'Creator';
        const authorUserId = post.user_id || '';
        const isOwn = (localStorage.getItem('userId') && String(localStorage.getItem('userId')) === String(authorUserId)) || 
                      (localStorage.getItem('username') && localStorage.getItem('username').toLowerCase() === authorName.toLowerCase());

        const optionsHTML = isOwn ? `
            <div class="card-options-dropdown" style="position: absolute; top: 10px; right: 10px; z-index: 25;">
                <button class="card-options-btn" title="Options" style="background: rgba(0,0,0,0.65); border: 1px solid rgba(255,255,255,0.25); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(8px); transition: all 0.2s;">
                    <i class="ri-more-2-fill" style="font-size: 1.1rem;"></i>
                </button>
                <div class="card-options-menu" style="display: none; position: absolute; right: 0; top: 38px; background: #181b24; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.6); overflow: hidden; min-width: 120px; z-index: 30;">
                    <button class="card-menu-item btn-edit-item" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 14px; background: transparent; border: none; color: #e4e4e7; font-size: 0.85rem; font-weight: 500; cursor: pointer; text-align: left;">
                        <i class="ri-edit-line" style="color: #60a5fa;"></i> Edit
                    </button>
                    <button class="card-menu-item btn-delete-item" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 14px; background: transparent; border: none; color: #f87171; font-size: 0.85rem; font-weight: 500; cursor: pointer; text-align: left; border-top: 1px solid rgba(255,255,255,0.06);">
                        <i class="ri-delete-bin-line"></i> Delete
                    </button>
                </div>
            </div>` : '';

        const graphBtnHTML = `
            <button class="store-item-graph-btn" title="View Course Knowledge Graph" style="position: absolute; top: 10px; right: ${isOwn ? '48px' : '10px'}; z-index: 24; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(147, 197, 253, 0.45); color: #93c5fd; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(8px); box-shadow: 0 4px 12px rgba(0,0,0,0.35); transition: all 0.2s;" onmouseover="this.style.transform='scale(1.1)'; this.style.borderColor='#60a5fa'; this.style.color='#ffffff';" onmouseout="this.style.transform='scale(1)'; this.style.borderColor='rgba(147, 197, 253, 0.45)'; this.style.color='#93c5fd';">
                <i class="ri-eye-line" style="font-size: 1.15rem;"></i>
            </button>`;

        const price = post.price || post.source?.price || (isAsset ? '19.99' : '49.99');
        const isUnlocked = window.isItemUnlocked ? window.isItemUnlocked(post.id) : false;
        const buyBtnText = isUnlocked ? (isAsset ? 'Open Assets' : 'Open Course') : `Buy $${price}`;

        card.innerHTML = `
            <div class="course-card-thumbnail">
                ${thumbnailHTML}
                ${badgeHTML}
                ${graphBtnHTML}
                ${optionsHTML}
                <div class="course-card-overlay">
                    <div class="course-card-stats">
                        ${statsHTML}
                    </div>
                </div>
            </div>
            <div class="course-card-info">
                <h3 class="course-card-title">${post.title}</h3>
                <div class="store-item-author">
                    <div class="avatar"></div>
                    <span>${authorName}</span>
                </div>
                <div class="store-item-footer">
                    <span class="store-item-price">$${price}</span>
                    <button class="btn-primary btn-buy" id="buyBtn-${post.id}">${buyBtnText}</button>
                </div>
            </div>
        `;

        // Handle Eye Icon Click -> Open Course Knowledge Graph
        const graphBtn = card.querySelector('.store-item-graph-btn');
        if (graphBtn) {
            graphBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                window.location.href = `/views/courseGraph.html?id=${encodeURIComponent(post.id)}`;
            });
        }

        const video = card.querySelector('video');
        if (video) {
            card.addEventListener('mouseenter', () => video.play());
            card.addEventListener('mouseleave', () => video.pause());
        }

        setupCardOptionsMenu(card, post);;

        const buyBtn = card.querySelector(`#buyBtn-${post.id}`);
        if (buyBtn) {
            buyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.isItemUnlocked && window.isItemUnlocked(post.id)) {
                    window.location.href = `/views/courseView.html?id=${post.id}`;
                } else if (window.openProductCheckoutModal) {
                    window.openProductCheckoutModal({
                        id: post.id,
                        title: post.title,
                        price: price,
                        format: isAsset ? 'Asset Pack' : 'Course'
                    }, () => {
                        window.location.href = `/views/courseView.html?id=${post.id}`;
                    });
                } else {
                    window.location.href = `/views/courseView.html?id=${post.id}`;
                }
            });
        }

        card.addEventListener('click', () => {
            if (window.isItemUnlocked && window.isItemUnlocked(post.id)) {
                window.location.href = `/views/courseView.html?id=${post.id}`;
            } else if (window.openProductCheckoutModal) {
                window.openProductCheckoutModal({
                    id: post.id,
                    title: post.title,
                    price: price,
                    format: isAsset ? 'Asset Pack' : 'Course'
                }, () => {
                    window.location.href = `/views/courseView.html?id=${post.id}`;
                });
            } else {
                window.location.href = `/views/courseView.html?id=${post.id}`;
            }
        });
        return card;
    }

    // Setup 3-dot options menu for cards
    function setupCardOptionsMenu(card, post) {
        const optionsBtn = card.querySelector('.card-options-btn');
        const optionsMenu = card.querySelector('.card-options-menu');
        const editBtn = card.querySelector('.btn-edit-item');
        const deleteBtn = card.querySelector('.btn-delete-item');

        if (!optionsBtn || !optionsMenu) return;

        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other open menus
            document.querySelectorAll('.card-options-menu').forEach(m => {
                if (m !== optionsMenu) m.style.display = 'none';
            });
            optionsMenu.style.display = optionsMenu.style.display === 'block' ? 'none' : 'block';
        });

        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                optionsMenu.style.display = 'none';
                if (post.format === 'course' || post.format === 'asset') {
                    window.location.href = `/views/xtraCourse.html?id=${post.id}&mode=${post.format}`;
                } else if (post.format === 'pdf' || post.format === 'book') {
                    window.location.href = `/views/xtraBook.html?id=${post.id}`;
                } else if (post.format === 'article') {
                    window.location.href = `/views/xtraArticle.html?id=${post.id}`;
                } else {
                    const newTitle = prompt("Edit item title:", post.title);
                    if (newTitle && newTitle.trim()) {
                        post.title = newTitle.trim();
                        const titleEl = card.querySelector('.course-card-title, .store-item-title');
                        if (titleEl) titleEl.textContent = post.title;
                        const client = window.supabaseClient || supabase;
                        if (client) {
                            client.from('posts').update({ title: post.title }).eq('id', post.id);
                        }
                    }
                }
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                optionsMenu.style.display = 'none';
                const confirmed = confirm(`Are you sure you want to delete "${post.title}"? This cannot be undone.`);
                if (!confirmed) return;

                // 1. Remove from DOM with smooth animation
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9)';
                setTimeout(() => card.remove(), 300);

                // 2. Remove from localStorage
                let localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                localPosts = localPosts.filter(p => String(p.id) !== String(post.id));
                localStorage.setItem('userPosts', JSON.stringify(localPosts));

                // 3. Delete from Supabase
                const client = window.supabaseClient || supabase;
                if (client) {
                    try {
                        const { error } = await client.from('posts').delete().eq('id', post.id);
                        if (error) console.error("Error deleting item from Supabase:", error);
                    } catch (err) {
                        console.error("Failed to delete post:", err);
                    }
                }
            });
        }
    }

    // Global listener to close options menus when clicking anywhere outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.card-options-menu').forEach(m => m.style.display = 'none');
    });

    // Initial load
    loadStoreItems();
}

// Execute immediately if DOM is already ready, otherwise on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStore);
} else {
    initStore();
}