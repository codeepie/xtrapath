document.addEventListener('DOMContentLoaded', () => {
    const storeGrid = document.getElementById('storeGrid');
    const storeFilters = document.getElementById('storeFilters');
    let allPosts = [];
    let activeFilter = 'all';

    // --- NEW: Map technical formats to user-friendly categories ---
    const categoryMap = {
        'course': 'courses',
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
        'pdf': 'Book',
        '3d_model': '3D Model',
        'article': 'Article',
        'diagram': 'Diagram',
        'video': 'Animation',
        'image': 'Asset',
        '16:9': 'Animation',
        '9:16': 'Animation'
    };

    async function getSupabase() {
        if (window.supabaseClient) return window.supabaseClient;
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

    // 1. Fetch and prepare data
    async function loadStoreItems() {
        let items = [];
        try {
            const client = await getSupabase();
            if (client) {
                const { data, error } = await client
                    .from('posts')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (!error && data) {
                    items = data;
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
        const forSaleItems = allPosts.filter(p => p.format === 'course' || p.source?.is_for_sale === true || p.is_for_sale === true);

        // Generate filter categories dynamically
        const categories = ['All', ...new Set(forSaleItems.map(p => categoryMap[p.format]).filter(Boolean).map(c => c.charAt(0).toUpperCase() + c.slice(1)))];
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
        const forSaleItems = allPosts.filter(p => p.is_for_sale === true || p.format === 'course');
        let filteredItems;

        if (activeFilter === 'all') {
            filteredItems = forSaleItems;
        } else {
            filteredItems = forSaleItems.filter(p => (categoryMap[p.format] || 'other') === activeFilter);
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
        if (post.format === 'course') {
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

        const formatBadge = formatDisplayMap[post.format] || 'Asset';
        card.innerHTML = `
            <div class="store-item-thumbnail">
                ${thumbnailHTML}
                <div class="store-item-format-badge">${formatBadge}</div>
            </div>
            <div class="store-item-info">
                <h3 class="store-item-title">${post.title}</h3>
                <div class="store-item-author">
                    <div class="avatar"></div>
                    <span>${post.username || localStorage.getItem('username') || 'Creator'}</span>
                </div>
                <div class="store-item-footer">
                    <span class="store-item-price">$${post.price || post.source?.price || '29.99'}</span>
                    <button class="btn-primary btn-buy">View Details</button>
                </div>
            </div>
        `;

        // Add hover effect for video playback
        const video = card.querySelector('video');
        if (video) {
            card.addEventListener('mouseenter', () => video.play());
            card.addEventListener('mouseleave', () => video.pause());
        }

        card.addEventListener('click', () => {
            // This would navigate to a detailed product page. For now, it's an alert.
            alert(`Viewing details for: ${post.title}`);
        });

        return card;
    }

    // 6. Create a specific, beautiful card for courses
    function createCourseCard(post) {
        const card = document.createElement('div');
        card.className = 'glass-card course-card'; // New class for styling

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

        card.innerHTML = `
            <div class="course-card-thumbnail">
                ${thumbnailHTML}
                <div class="course-card-overlay">
                    <div class="course-card-stats">
                        <span><i class="ri-book-3-line"></i> ${sectionCount} Sections</span>
                        <span><i class="ri-file-list-3-line"></i> ${lessonCount} Lessons</span>
                    </div>
                </div>
            </div>
            <div class="course-card-info">
                <h3 class="course-card-title">${post.title}</h3>
                <div class="store-item-author">
                    <div class="avatar"></div>
                    <span>${post.username || localStorage.getItem('username') || 'Creator'}</span>
                </div>
                <div class="store-item-footer">
                    <span class="store-item-price">$${post.price || post.source?.price || '49.99'}</span>
                    <button class="btn-primary btn-buy">View Course</button>
                </div>
            </div>
        `;

        const video = card.querySelector('video');
        if (video) {
            card.addEventListener('mouseenter', () => video.play());
            card.addEventListener('mouseleave', () => video.pause());
        }

        card.addEventListener('click', () => {
            // Navigate to the new detailed course view page
            window.location.href = `/views/courseView.html?id=${post.id}`;
        });
        return card;
    }

    // Initial load
    loadStoreItems();
});