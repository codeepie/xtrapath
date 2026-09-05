/**
 * XtraAnim Universal Story Manager (story_manager.js)
 * -----------------------------------------------------------------------
 * Powers the 24-Hour Ephemeral Stories system across XtraAnim:
 * - 24-Hour Expiration & Storage Engine (localStorage + Supabase sync)
 * - Dynamic Story Bar with real-time creator avatar rendering
 * - Multi-Segment Instagram-Style Story Viewer Modal with animated progress bars
 * - Video / Audio / Image / LaTeX Simulation preview rendering
 * - Touch Gestures: Tap Left (Previous), Tap Right (Next), Hold to Pause
 * - Direct "View Post / Simulation" Deep-Link CTA
 * - Story Publisher Modal (Share Simulation / Creation to 24h Story)
 * - 100% Backward-Compatible Global Bindings
 */

(function (window) {
    'use strict';

    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    function getBackendUrl() {
        if (typeof window.getBackendUrl === 'function') return window.getBackendUrl();
        return '';
    }

    // 1. Story Data Sub-Module
    const Data = {
        getStoryData() {
            try {
                const data = JSON.parse(localStorage.getItem('storyData') || '{}');
                if (data && typeof data === 'object') return data;
            } catch (_) {}
            return { "Your Story": [] };
        },

        saveStoryData(data) {
            try {
                localStorage.setItem('storyData', JSON.stringify(data));
            } catch (e) {
                console.warn('[StoryManager] LocalStorage error:', e);
            }
        },

        async syncStoriesFromBackend() {
            try {
                const bUrl = getBackendUrl();
                const resp = await fetch(`${bUrl}/api/stories`);
                if (resp.ok) {
                    const json = await resp.json();
                    if (json.success && json.stories) {
                        const localData = this.getStoryData();
                        const myUsername = (localStorage.getItem('username') || '').trim().replace(/^@/, '');
                        const myUserId = (localStorage.getItem('userId') || '').trim();

                        Object.keys(json.stories).forEach(authorKey => {
                            const remoteList = json.stories[authorKey];
                            if (Array.isArray(remoteList) && remoteList.length > 0) {
                                const cleanKey = authorKey.trim().replace(/^@/, '');
                                localData[authorKey] = remoteList;
                                localData[cleanKey] = remoteList;
                                const firstStory = remoteList[0];
                                if (firstStory) {
                                    if (firstStory.author) localData[firstStory.author.trim().replace(/^@/, '')] = remoteList;
                                    if (firstStory.username) localData[firstStory.username.trim().replace(/^@/, '')] = remoteList;
                                    if (firstStory.user_id) localData[firstStory.user_id] = remoteList;
                                }
                                if (cleanKey.toLowerCase() === myUsername.toLowerCase() || (myUserId && (cleanKey === myUserId || (firstStory && String(firstStory.user_id) === String(myUserId))))) {
                                    localData["Your Story"] = remoteList;
                                }
                            }
                        });
                        this.saveStoryData(localData);
                        Bar.render();
                        Bar.checkAndUpdateState();
                        if (typeof window.updateProfileStoryRing === 'function') {
                            window.updateProfileStoryRing();
                        }
                    }
                }
            } catch (err) {
                console.warn('[StoryManager] Sync stories from backend error:', err);
            }
        },

        getActiveStoriesForUser(usernameOrId) {
            if (!usernameOrId) return [];
            const data = this.getStoryData();
            const myUsername = (localStorage.getItem('username') || '').trim().replace(/^@/, '');
            const myUserId = (localStorage.getItem('userId') || '').trim();
            const target = String(usernameOrId).trim().replace(/^@/, '');
            const currentTime = Date.now();

            let raw = data[target];
            if (!raw) {
                // Case-insensitive lookup on keys
                const matchKey = Object.keys(data).find(k => k && k.trim().replace(/^@/, '').toLowerCase() === target.toLowerCase());
                if (matchKey) raw = data[matchKey];
            }

            const isMe = target === 'Your Story' || 
                         (myUsername && target.toLowerCase() === myUsername.toLowerCase()) || 
                         (myUserId && target === myUserId);

            if ((!raw || (Array.isArray(raw) && raw.length === 0)) && isMe) {
                raw = data["Your Story"] || (myUsername ? data[myUsername] : null) || (myUserId ? data[myUserId] : null);
            }

            // Fallback: search all story entries across all keys in storyData
            if (!raw || (Array.isArray(raw) && raw.length === 0)) {
                for (const k of Object.keys(data)) {
                    const list = Array.isArray(data[k]) ? data[k] : [data[k]];
                    const matched = list.filter(item => item && (
                        (item.author && item.author.trim().replace(/^@/, '').toLowerCase() === target.toLowerCase()) ||
                        (item.username && item.username.trim().replace(/^@/, '').toLowerCase() === target.toLowerCase()) ||
                        (item.user_id && String(item.user_id) === target)
                    ));
                    if (matched.length > 0) {
                        raw = matched;
                        break;
                    }
                }
            }

            if (!raw) return [];
            const list = Array.isArray(raw) ? raw : [raw];
            return list.filter(item => item && (!item.expiresAt || item.expiresAt > currentTime));
        },

        addStory(postOrData, authorName = null, authorAvatar = null) {
            const currentTime = Date.now();
            const myUsername = authorName || localStorage.getItem('username') || 'User';
            const myUserId = localStorage.getItem('userId') || myUsername;
            const myAvatar = authorAvatar || localStorage.getItem('avatarUrl') || localStorage.getItem('userAvatar') || '';

            // Extract real visual media / thumbnails / code from the post
            const rawPost = postOrData.rawPost || postOrData;
            const src = rawPost.source || {};
            const videoUrl = rawPost.video_url || rawPost.media_url || src.video_url || src.media_url || '';
            const imageUrl = rawPost.image_url || rawPost.thumbnail_url || rawPost.cover_url || rawPost.thumbnail || src.image_url || src.thumbnail_url || src.cover_url || '';
            const format = rawPost.format || rawPost.type || src.format || (videoUrl ? 'video' : (imageUrl ? 'image' : 'simulation'));
            const code = rawPost.code || rawPost.latex || rawPost.rawCode || src.code || src.latex || '';
            const engine = rawPost.engine || src.engine || format || 'manim';
            const title = rawPost.title || rawPost.caption || src.title || 'Interactive Creation';
            const description = rawPost.description || rawPost.caption || src.description || '';

            const storyPost = {
                id: rawPost.id || `custom_${currentTime}`,
                title: title,
                author: rawPost.username || rawPost.author || myUsername,
                avatar: rawPost.avatar_url || rawPost.avatar || myAvatar,
                video_url: videoUrl,
                image_url: imageUrl,
                thumbnail_url: imageUrl,
                format: format,
                type: rawPost.type || format,
                code: code,
                engine: engine,
                description: description,
                source: src
            };

            const newStoryItem = {
                id: `story_${currentTime}_${Math.random().toString(36).substr(2, 6)}`,
                postId: storyPost.id,
                post: storyPost,
                rawPost: rawPost,
                title: storyPost.title,
                video_url: videoUrl,
                image_url: imageUrl,
                thumbnail_url: imageUrl,
                format: format,
                engine: engine,
                code: code,
                author: storyPost.author,
                avatar: storyPost.avatar,
                description: description,
                timestamp: currentTime,
                expiresAt: currentTime + TWENTY_FOUR_HOURS_MS
            };

            const currentData = this.getStoryData();
            let myStories = currentData["Your Story"] || [];
            if (!Array.isArray(myStories)) myStories = myStories ? [myStories] : [];
            myStories = myStories.filter(s => s && (!s.expiresAt || s.expiresAt > currentTime));
            myStories.push(newStoryItem);

            currentData["Your Story"] = myStories;
            currentData[myUsername] = myStories;
            if (myUserId) currentData[myUserId] = myStories;

            this.saveStoryData(currentData);
            Bar.checkAndUpdateState();

            // Background persist to backend SQLite store
            try {
                const bUrl = getBackendUrl();
                fetch(`${bUrl}/api/stories`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: newStoryItem.id,
                        user_id: myUserId,
                        username: myUsername,
                        avatar_url: myAvatar,
                        post_id: String(storyPost.id || ''),
                        story_data: newStoryItem,
                        expires_at: newStoryItem.expiresAt
                    })
                }).catch(() => {});
            } catch (_) {}

            return newStoryItem;
        },

        deleteStory(storyId) {
            if (!storyId) return;
            const currentData = this.getStoryData();
            const myUsername = (localStorage.getItem('username') || '').trim();
            const myUserId = (localStorage.getItem('userId') || '').trim();

            Object.keys(currentData).forEach(key => {
                if (Array.isArray(currentData[key])) {
                    currentData[key] = currentData[key].filter(s => s && s.id !== storyId && s.postId !== storyId);
                }
            });

            this.saveStoryData(currentData);
            Bar.checkAndUpdateState();

            // Background delete on server
            try {
                const bUrl = getBackendUrl();
                fetch(`${bUrl}/api/stories/${encodeURIComponent(storyId)}`, {
                    method: 'DELETE'
                }).catch(() => {});
            } catch (_) {}
        }
    };

    // 2. Story Bar Sub-Module
    const Bar = {
        checkAndUpdateState() {
            const myStoryAvatar = document.querySelector('.story-bar .story-item[data-username="Your Story"] .story-avatar, .story-bar .story-item:first-child .story-avatar');
            if (myStoryAvatar) {
                const myActiveStories = Data.getActiveStoriesForUser("Your Story");
                if (myActiveStories.length > 0) {
                    myStoryAvatar.classList.remove('seen');
                } else {
                    myStoryAvatar.classList.add('seen');
                }
            }
            const userAvatar = localStorage.getItem('avatarUrl') || localStorage.getItem('userAvatar');
            const myStoryImg = document.querySelector('.story-bar .story-item[data-username="Your Story"] .story-avatar-inner img, .story-bar .story-item:first-child .story-avatar-inner img');
            if (myStoryImg && userAvatar) {
                myStoryImg.src = userAvatar;
            }
        },

        render(feedPosts = []) {
            const storyBar = document.querySelector('.story-bar');
            if (!storyBar) return;

            const myUsername = (localStorage.getItem('username') || 'User').trim().replace(/^@/, '');
            const myUserId = (localStorage.getItem('userId') || '').trim();
            const myAvatar = localStorage.getItem('avatarUrl') || localStorage.getItem('userAvatar') || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&fit=crop';
            const myStories = Data.getActiveStoriesForUser("Your Story");

            // Gather all candidate real posts
            let allPosts = [];
            if (Array.isArray(feedPosts) && feedPosts.length > 0) {
                allPosts = feedPosts;
            } else if (Array.isArray(window.allLoadedPosts) && window.allLoadedPosts.length > 0) {
                allPosts = window.allLoadedPosts;
            } else if (window._allRenderedPosts && typeof window._allRenderedPosts === 'object') {
                allPosts = Object.values(window._allRenderedPosts);
            } else {
                try {
                    const cached = JSON.parse(localStorage.getItem('cached_explore_feed') || '[]');
                    if (Array.isArray(cached) && cached.length > 0) allPosts = cached;
                } catch (_) {}
            }

            // Sync global allLoadedPosts
            if (Array.isArray(allPosts) && allPosts.length > 0) {
                window.allLoadedPosts = allPosts;
            }

            // --- 1. COLLECT CREATORS WITH REAL ACTIVE 24-HOUR STORIES (PRIORITY #1) ---
            const activeStoryMap = new Map();
            const allStoryData = Data.getStoryData();

            Object.keys(allStoryData).forEach(userKey => {
                const cleanKey = String(userKey).trim().replace(/^@/, '');
                const isSelf = cleanKey === 'Your Story' || 
                               (myUsername && cleanKey.toLowerCase() === myUsername.toLowerCase()) || 
                               (myUserId && cleanKey === myUserId);

                if (!isSelf) {
                    const stories = Data.getActiveStoriesForUser(userKey);
                    if (stories.length > 0) {
                        const firstStory = stories[0];
                        const author = (firstStory.author || firstStory.username || cleanKey).trim().replace(/^@/, '');
                        const authorId = firstStory.user_id || '';
                        const authorAvatar = firstStory.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(author)}`;

                        if (author && author.toLowerCase() !== myUsername.toLowerCase()) {
                            if (!activeStoryMap.has(author.toLowerCase())) {
                                activeStoryMap.set(author.toLowerCase(), {
                                    username: author,
                                    userId: authorId,
                                    avatar: authorAvatar,
                                    hasActive24hStory: true,
                                    stories: stories,
                                    posts: []
                                });
                            }
                        }
                    }
                }
            });

            // --- 2. COLLECT OTHER CREATORS FROM FEED (DISCOVERY) ---
            const feedCreatorMap = new Map();
            allPosts.forEach(post => {
                if (!post) return;
                const rawAuthor = (post.username || post.author || '').trim().replace(/^@/, '');
                const authorId = post.user_id;
                if (rawAuthor && rawAuthor.toLowerCase() !== myUsername.toLowerCase() && (!myUserId || String(authorId) !== String(myUserId))) {
                    const lowKey = rawAuthor.toLowerCase();
                    if (activeStoryMap.has(lowKey)) {
                        activeStoryMap.get(lowKey).posts.push(post);
                    } else {
                        if (!feedCreatorMap.has(lowKey)) {
                            feedCreatorMap.set(lowKey, {
                                username: rawAuthor,
                                userId: authorId,
                                avatar: post.avatar_url || post.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(rawAuthor)}`,
                                hasActive24hStory: false,
                                stories: [],
                                posts: [post]
                            });
                        } else {
                            feedCreatorMap.get(lowKey).posts.push(post);
                        }
                    }
                }
            });

            // Combine into unified creatorMap for lookup
            const unifiedMap = new Map();
            activeStoryMap.forEach((val) => unifiedMap.set(val.username, val));
            feedCreatorMap.forEach((val) => unifiedMap.set(val.username, val));
            Bar.creatorMap = unifiedMap;

            // --- 3. BUILD STORY BAR HTML ---
            // "Your Story" is first
            let html = `
                <div class="story-item" data-username="Your Story" onclick="window.StoryManager ? window.StoryManager.Viewer.open(this) : (window.openStory && window.openStory(this))">
                    <div class="story-avatar ${myStories.length === 0 ? 'seen' : ''}">
                        <div class="story-avatar-inner">
                            <img src="${myAvatar}" alt="Your Story" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&fit=crop'">
                        </div>
                    </div>
                    <span class="story-username">Your Story</span>
                </div>
            `;

            // Active 24h stories appear IMMEDIATELY after "Your Story" with colorful unread story ring
            activeStoryMap.forEach((creator) => {
                html += `
                    <div class="story-item active-story-item" data-username="${escapeHtml(creator.username)}" data-user-id="${escapeHtml(String(creator.userId || ''))}" onclick="window.StoryManager ? window.StoryManager.Viewer.open(this) : (window.openStory && window.openStory(this))">
                        <div class="story-avatar">
                            <div class="story-avatar-inner">
                                <img src="${creator.avatar}" alt="${escapeHtml(creator.username)}" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(creator.username)}'">
                            </div>
                        </div>
                        <span class="story-username">${escapeHtml(creator.username)}</span>
                    </div>
                `;
            });

            // Other feed creators appear next
            feedCreatorMap.forEach((creator) => {
                html += `
                    <div class="story-item" data-username="${escapeHtml(creator.username)}" data-user-id="${escapeHtml(String(creator.userId || ''))}" onclick="window.StoryManager ? window.StoryManager.Viewer.open(this) : (window.openStory && window.openStory(this))">
                        <div class="story-avatar seen">
                            <div class="story-avatar-inner">
                                <img src="${creator.avatar}" alt="${escapeHtml(creator.username)}" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(creator.username)}'">
                            </div>
                        </div>
                        <span class="story-username">${escapeHtml(creator.username)}</span>
                    </div>
                `;
            });

            storyBar.innerHTML = html;
        }
    };

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function resolveFullPost(currentStory, fallbackUsername) {
        if (!currentStory) return null;
        const pid = currentStory.postId || currentStory.id || (currentStory.post && currentStory.post.id);
        
        let foundPost = null;
        if (pid) {
            const sPid = String(pid);
            if (Array.isArray(window.allLoadedPosts)) {
                foundPost = window.allLoadedPosts.find(p => p && String(p.id) === sPid);
            }
            if (!foundPost && window._allRenderedPosts) {
                if (Array.isArray(window._allRenderedPosts)) {
                    foundPost = window._allRenderedPosts.find(p => p && String(p.id) === sPid);
                } else if (typeof window._allRenderedPosts === 'object') {
                    foundPost = window._allRenderedPosts[sPid];
                }
            }
            if (!foundPost) {
                try {
                    const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                    if (Array.isArray(localPosts)) {
                        foundPost = localPosts.find(p => p && String(p.id) === sPid);
                    }
                } catch (_) {}
            }
            if (!foundPost) {
                try {
                    const exploreFeed = JSON.parse(localStorage.getItem('cached_explore_feed') || localStorage.getItem('exploreFeed') || '[]');
                    if (Array.isArray(exploreFeed)) {
                        foundPost = exploreFeed.find(p => p && String(p.id) === sPid);
                    }
                } catch (_) {}
            }
        }

        const basePost = foundPost || currentStory.rawPost || currentStory.post || currentStory;
        const myUsername = localStorage.getItem('username') || 'User';
        const myAvatar = localStorage.getItem('avatarUrl') || localStorage.getItem('userAvatar') || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(myUsername)}`;
        
        let author = currentStory.author || basePost.author || basePost.username || fallbackUsername || myUsername;
        if (author === 'Your Story' || !author) author = myUsername;
        let avatar = currentStory.avatar || basePost.avatar || basePost.avatar_url || (author === myUsername ? myAvatar : `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(author)}`);

        const src = basePost.source || {};
        let title = currentStory.title || basePost.title || src.title || basePost.caption || 'Interactive Simulation';
        let format = currentStory.format || basePost.format || basePost.type || src.format || 'simulation';
        let engine = currentStory.engine || basePost.engine || src.engine || format || 'manim';
        let code = currentStory.code || basePost.code || basePost.latex || basePost.rawCode || src.code || src.latex || '';
        let videoUrl = currentStory.video_url || basePost.video_url || basePost.media_url || src.video_url || src.media_url || '';
        let imageUrl = currentStory.image_url || currentStory.thumbnail_url || basePost.image_url || basePost.thumbnail_url || basePost.cover_url || src.image_url || src.thumbnail_url || '';
        let description = currentStory.description || basePost.description || src.description || basePost.caption || '';

        return {
            id: pid || `story_${Date.now()}`,
            postId: pid,
            title,
            author,
            avatar,
            format,
            engine,
            code,
            video_url: videoUrl,
            image_url: imageUrl,
            thumbnail_url: imageUrl,
            description,
            source: src || { code, engine, format }
        };
    }

    function renderDynamicCanvasFallback(container, format, engine, title) {
        if (!container) return;
        container.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        let animId;
        let t = 0;

        function resize() {
            canvas.width = container.clientWidth || 340;
            canvas.height = container.clientHeight || 230;
        }
        resize();

        function draw() {
            if (!container.isConnected) {
                cancelAnimationFrame(animId);
                return;
            }
            const w = canvas.width;
            const h = canvas.height;
            ctx.fillStyle = '#090b14';
            ctx.fillRect(0, 0, w, h);

            // Draw cybernetic grid
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
            ctx.lineWidth = 1;
            for (let x = 0; x < w; x += 24) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = 0; y < h; y += 24) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            // Draw harmonic Lissajous / wave curves
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 12;

            const cx = w / 2;
            const cy = h / 2;
            const radius = Math.min(w, h) * 0.35;

            for (let theta = 0; theta < Math.PI * 2; theta += 0.04) {
                const px = cx + Math.sin(theta * 3 + t) * radius * 1.1;
                const py = cy + Math.cos(theta * 2 + t * 0.7) * (radius * 0.75);
                if (theta === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Draw orbiting particles
            for (let i = 0; i < 5; i++) {
                const pTheta = t * 1.2 + (i * (Math.PI * 2 / 5));
                const pX = cx + Math.sin(pTheta * 3 + t) * radius * 1.1;
                const pY = cy + Math.cos(pTheta * 2 + t * 0.7) * (radius * 0.75);

                ctx.fillStyle = '#38bdf8';
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(pX, pY, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;

            // Formula watermark
            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`ψ(t) = A·sin(ωt + φ) • ${format.toUpperCase()}`, cx, h - 14);

            t += 0.025;
            animId = requestAnimationFrame(draw);
        }

        draw();
    }

    // 3. Story Viewer Sub-Module
    let storyTimeout = null;
    let currentStoryIndex = 0;
    let activeStoriesList = [];

    function formatRelativeTime(dateStrOrTs) {
        if (!dateStrOrTs) return 'recently';
        const timeMs = typeof dateStrOrTs === 'number' ? dateStrOrTs : new Date(dateStrOrTs).getTime();
        if (isNaN(timeMs)) return 'recently';
        const diff = Math.max(0, Math.floor((Date.now() - timeMs) / 1000));
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    function ensureStoryViewerDOM() {
        let storyViewer = document.getElementById('storyViewer');
        if (!storyViewer) {
            storyViewer = document.createElement('div');
            storyViewer.id = 'storyViewer';
            storyViewer.className = 'story-viewer-overlay';
            storyViewer.innerHTML = `
                <div class="story-viewer-container">
                    <div class="story-progress-bars" id="storyProgressBars"></div>
                    <div class="story-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="" alt="User Avatar" class="story-viewer-avatar" id="storyViewerAvatar">
                            <div>
                                <span class="story-viewer-username" id="storyViewerUsername"></span>
                                <span id="storyViewerTime" style="font-size: 0.75rem; color: rgba(255,255,255,0.7); margin-left: 6px;"></span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; z-index: 35; position: relative;">
                            <button id="storyOptionsBtn" class="story-viewer-options-btn" title="Options" aria-label="Story options">
                                <i class="ri-more-2-fill"></i>
                            </button>
                            <div id="storyOptionsMenu" class="story-options-menu" style="display: none;">
                                <button class="story-menu-item" id="storyHighlightBtn">
                                    <i class="ri-bookmark-star-line"></i> Highlight to Profile
                                </button>
                                <button class="story-menu-item" id="storyCopyLinkBtn">
                                    <i class="ri-links-line"></i> Copy Story Link
                                </button>
                                <button class="story-menu-item story-menu-danger" id="storyDeleteBtn" style="display: none;">
                                    <i class="ri-delete-bin-line"></i> Delete Story
                                </button>
                            </div>
                            <button id="closeStoryViewer" class="story-viewer-close" aria-label="Close story">&times;</button>
                        </div>
                    </div>
                    <div class="story-nav-tap left" id="storyTapLeft"></div>
                    <div class="story-nav-tap right" id="storyTapRight"></div>
                    <div class="story-content"></div>
                    <div class="story-footer-area" id="storyFooterArea"></div>
                    
                    <!-- Viewers Bottom Sheet Modal -->
                    <div class="story-viewers-backdrop" id="storyViewersBackdrop">
                        <div class="story-viewers-sheet" id="storyViewersSheet">
                            <div class="story-sheet-drag-handle"></div>
                            <div class="story-sheet-header">
                                <div class="story-sheet-title">
                                    <span>Story Viewers</span>
                                    <span class="badge" id="storyViewersCountBadge">0</span>
                                </div>
                                <button class="story-sheet-close-btn" id="closeStoryViewersSheet" aria-label="Close viewers list">&times;</button>
                            </div>
                            <input type="text" class="story-sheet-search" id="storyViewersSearchInput" placeholder="Search viewers...">
                            <div class="story-viewers-list" id="storyViewersList">
                                <div class="story-viewers-empty">No views yet</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(storyViewer);
            if (typeof initListeners === 'function') initListeners();
        } else {
            // If storyViewer exists statically in HTML, ensure footer area and viewers sheet exist inside it
            const container = storyViewer.querySelector('.story-viewer-container') || storyViewer;
            if (!document.getElementById('storyFooterArea')) {
                const footerArea = document.createElement('div');
                footerArea.className = 'story-footer-area';
                footerArea.id = 'storyFooterArea';
                container.appendChild(footerArea);
            }
            if (!document.getElementById('storyViewersBackdrop')) {
                const backdrop = document.createElement('div');
                backdrop.className = 'story-viewers-backdrop';
                backdrop.id = 'storyViewersBackdrop';
                backdrop.innerHTML = `
                    <div class="story-viewers-sheet" id="storyViewersSheet">
                        <div class="story-sheet-drag-handle"></div>
                        <div class="story-sheet-header">
                            <div class="story-sheet-title">
                                <span>Story Viewers</span>
                                <span class="badge" id="storyViewersCountBadge">0</span>
                            </div>
                            <button class="story-sheet-close-btn" id="closeStoryViewersSheet" aria-label="Close viewers list">&times;</button>
                        </div>
                        <input type="text" class="story-sheet-search" id="storyViewersSearchInput" placeholder="Search viewers...">
                        <div class="story-viewers-list" id="storyViewersList">
                            <div class="story-viewers-empty">No views yet</div>
                        </div>
                    </div>
                `;
                container.appendChild(backdrop);
            }
        }
        return storyViewer;
    }

    const Viewer = {
        _isPaused: false,
        _remainingMs: 5000,
        _slideDurationMs: 5000,
        _startTime: 0,
        _recordedViews: new Set(),

        open(itemOrUsername) {
            if (!itemOrUsername) return;
            const storyViewer = ensureStoryViewerDOM();
            if (!storyViewer) return;

            // Sync latest multi-user stories in background
            Data.syncStoriesFromBackend();

            let avatarSrc = '';
            let username = 'User';
            let userId = '';

            if (typeof itemOrUsername === 'string') {
                username = itemOrUsername;
            } else {
                avatarSrc = itemOrUsername.querySelector?.('.story-avatar-inner img')?.src || itemOrUsername.querySelector?.('img')?.src || '';
                username = itemOrUsername.dataset?.username || itemOrUsername.querySelector?.('.story-username')?.textContent || 'User';
                userId = itemOrUsername.dataset?.userId || '';
            }

            const myUsername = localStorage.getItem('username') || 'User';
            const isMyStory = username === 'Your Story' || username === myUsername;

            activeStoriesList = Data.getActiveStoriesForUser(username);
            if (activeStoriesList.length === 0 && isMyStory) {
                activeStoriesList = Data.getActiveStoriesForUser("Your Story");
            }
            if (activeStoriesList.length === 0 && userId) {
                activeStoriesList = Data.getActiveStoriesForUser(userId);
            }

            // If creator does not have an explicit story shared, grab their REAL posts from the feed/database
            if (activeStoriesList.length === 0) {
                let creatorPosts = [];
                if (Bar.creatorMap && Bar.creatorMap.has(username)) {
                    creatorPosts = Bar.creatorMap.get(username).posts || [];
                }
                if (creatorPosts.length === 0) {
                    const loadedPosts = window.allLoadedPosts || [];
                    const profPosts = window.currentProfilePosts || window.profilePosts || [];
                    const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                    let cachedExplore = [];
                    try { cachedExplore = JSON.parse(localStorage.getItem('cached_explore_feed') || '[]'); } catch (_) {}
                    const combined = [...profPosts, ...loadedPosts, ...localPosts, ...cachedExplore];
                    const targetLookup = (username === 'Your Story' || !username) ? myUsername : username;
                    creatorPosts = combined.filter(p => p && (
                        (p.username && p.username.toLowerCase() === targetLookup.toLowerCase()) ||
                        (p.author && p.author.toLowerCase() === targetLookup.toLowerCase()) ||
                        (userId && String(p.user_id) === String(userId))
                    ));
                }

                if (creatorPosts.length > 0) {
                    activeStoriesList = creatorPosts.slice(0, 5).map((p, idx) => ({
                        id: `real_story_${p.id}`,
                        postId: p.id,
                        post: p,
                        rawPost: p,
                        title: p.title || p.caption || 'Interactive Simulation',
                        author: p.username || p.author || (username === 'Your Story' ? myUsername : username),
                        avatar: avatarSrc || p.avatar_url || p.avatar || localStorage.getItem('avatarUrl') || '',
                        video_url: p.video_url || p.media_url || (p.source && p.source.video_url) || '',
                        image_url: p.image_url || p.thumbnail_url || p.cover_url || (p.source && p.source.image_url) || '',
                        code: p.code || p.latex || (p.source && p.source.code) || '',
                        format: p.format || p.type || (p.source && p.source.format) || 'video',
                        engine: p.engine || (p.source && p.source.engine) || 'manim',
                        description: p.description || p.caption || '',
                        timestamp: Date.now() - (idx * 3600000),
                        expiresAt: Date.now() + (24 - idx) * 3600000
                    }));
                }
            }

            if (isMyStory && activeStoriesList.length === 0) {
                alert("You don't have an active story right now. Click the share icon (✈️) on any post in Explore or Reels to add it to your 24-hour story!");
                return;
            }

            if (activeStoriesList.length === 0) {
                alert(`No active stories found for @${username}.`);
                return;
            }

            currentStoryIndex = 0;
            storyViewer.style.display = 'flex';
            document.body.classList.add('story-open');

            if (typeof itemOrUsername !== 'string' && itemOrUsername.querySelector) {
                const storyAvatar = itemOrUsername.querySelector('.story-avatar');
                if (storyAvatar) storyAvatar.classList.add('seen');
            }

            const progressBarsContainer = document.getElementById('storyProgressBars');
            if (progressBarsContainer) {
                progressBarsContainer.innerHTML = '';
                activeStoriesList.forEach((_, idx) => {
                    const barCont = document.createElement('div');
                    barCont.className = 'progress-bar-container';
                    const barFill = document.createElement('div');
                    barFill.className = 'progress-bar-fill';
                    barFill.id = `storyProgressFill_${idx}`;
                    barFill.style.width = '0%';
                    barCont.appendChild(barFill);
                    progressBarsContainer.appendChild(barCont);
                });
            }

            this.playIndex(0, avatarSrc, username);
        },

        openByUsername(targetUsername, avatarUrl = '') {
            const fakeItem = {
                dataset: { username: targetUsername },
                querySelector: (sel) => {
                    if (sel.includes('img')) return { src: avatarUrl };
                    if (sel.includes('username')) return { textContent: targetUsername };
                    return null;
                }
            };
            this.open(fakeItem);
        },

        recordView(storyId, currentStory) {
            if (!storyId || Viewer._recordedViews.has(storyId)) return;
            Viewer._recordedViews.add(storyId);

            const myUsername = localStorage.getItem('username') || 'User';
            const myUserId = localStorage.getItem('userId') || myUsername;
            const myAvatar = localStorage.getItem('avatarUrl') || localStorage.getItem('userAvatar') || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(myUsername)}`;

            try {
                const bUrl = getBackendUrl();
                fetch(`${bUrl}/api/stories/${encodeURIComponent(storyId)}/view`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        viewer_id: myUserId,
                        viewer_username: myUsername,
                        viewer_avatar: myAvatar
                    })
                }).catch(() => {});
            } catch (_) {}
        },

        async loadStoryViewers(storyId) {
            const pill = document.getElementById('storySeenByPill');
            const avatarStack = document.getElementById('storySeenAvatarStack');
            const countText = document.getElementById('storySeenCountText');
            if (!pill) return;

            let viewers = [];
            try {
                const bUrl = getBackendUrl();
                const resp = await fetch(`${bUrl}/api/stories/${encodeURIComponent(storyId)}/viewers`);
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.success && Array.isArray(data.viewers)) {
                        viewers = data.viewers;
                    }
                }
            } catch (_) {}

            Viewer._currentViewers = viewers;

            if (avatarStack && countText) {
                if (viewers.length === 0) {
                    avatarStack.innerHTML = `<i class="ri-eye-line" style="font-size:1.1rem; color:#60a5fa;"></i>`;
                    countText.textContent = `0 views`;
                } else {
                    const sample = viewers.slice(0, 3);
                    avatarStack.innerHTML = sample.map(v => 
                        `<img src="${v.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(v.username)}`}" alt="${escapeHtml(v.username)}" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=user'">`
                    ).join('');
                    countText.innerHTML = `Seen by <b>${viewers.length}</b>`;
                }
            }

            pill.onclick = (e) => {
                e.stopPropagation();
                Viewer.openViewersModal(storyId, viewers);
            };
        },

        openViewersModal(storyId, viewers) {
            Viewer.pause();
            const backdrop = document.getElementById('storyViewersBackdrop');
            const list = document.getElementById('storyViewersList');
            const badge = document.getElementById('storyViewersCountBadge');
            const searchInput = document.getElementById('storyViewersSearchInput');
            if (!backdrop || !list) return;

            backdrop.classList.add('active');
            if (badge) badge.textContent = String(viewers.length);
            if (searchInput) searchInput.value = '';

            const renderList = (filter = '') => {
                const query = filter.toLowerCase().trim();
                const filtered = viewers.filter(v => !query || v.username.toLowerCase().includes(query));
                if (filtered.length === 0) {
                    list.innerHTML = `<div class="story-viewers-empty">${query ? 'No matching viewers' : 'No viewers yet'}</div>`;
                    return;
                }
                list.innerHTML = filtered.map(v => {
                    const timeStr = formatRelativeTime(v.viewed_at);
                    const queryParams = v.viewer_id ? `user=${encodeURIComponent(v.username)}&user_id=${encodeURIComponent(v.viewer_id)}` : `user=${encodeURIComponent(v.username)}`;
                    return `
                        <div class="story-viewer-row" style="cursor: pointer;" onclick="event.stopPropagation(); window.StoryManager ? window.StoryManager.Viewer.close() : (window.closeStory && window.closeStory()); window.location.href='/views/profile.html?${queryParams}'">
                            <div class="story-viewer-info">
                                <img src="${v.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(v.username)}`}" class="story-viewer-avatar-img" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=user'">
                                <div>
                                    <div class="story-viewer-username-text">@${escapeHtml(v.username)}</div>
                                    <div class="story-viewer-time-text">${timeStr}</div>
                                </div>
                            </div>
                            <i class="ri-arrow-right-s-line" style="color:#71717a;"></i>
                        </div>
                    `;
                }).join('');
            };

            renderList();

            if (searchInput) {
                searchInput.oninput = () => renderList(searchInput.value);
            }
        },

        closeViewersModal() {
            const backdrop = document.getElementById('storyViewersBackdrop');
            if (backdrop) backdrop.classList.remove('active');
            Viewer.resume();
        },

        pause() {
            Viewer._isPaused = true;
            clearTimeout(storyTimeout);
            const currentFill = document.getElementById(`storyProgressFill_${currentStoryIndex}`);
            if (currentFill) {
                const computedWidth = window.getComputedStyle(currentFill).width;
                currentFill.style.transition = 'none';
                currentFill.style.width = computedWidth;
            }
        },

        resume() {
            if (!Viewer._isPaused) return;
            Viewer._isPaused = false;
            const currentFill = document.getElementById(`storyProgressFill_${currentStoryIndex}`);
            if (currentFill) {
                currentFill.style.transition = `width 3s linear`;
                currentFill.style.width = '100%';
            }
            clearTimeout(storyTimeout);
            storyTimeout = setTimeout(() => {
                Viewer.next();
            }, 3000);
        },

        sendQuickReaction(emoji, currentStory) {
            if (typeof window.showToast === 'function') {
                window.showToast(`Reacted ${emoji} to story!`);
            }
            // Floating reaction animation
            const container = document.querySelector('.story-viewer-container');
            if (container) {
                const floater = document.createElement('div');
                floater.textContent = emoji;
                floater.style.position = 'absolute';
                floater.style.bottom = '80px';
                floater.style.right = '40px';
                floater.style.fontSize = '2.5rem';
                floater.style.zIndex = '35';
                floater.style.pointerEvents = 'none';
                floater.style.animation = 'floatPulse 1.2s ease forwards';
                container.appendChild(floater);
                setTimeout(() => floater.remove(), 1200);
            }
        },

        sendReplyMessage(text, currentStory) {
            if (typeof window.showToast === 'function') {
                window.showToast(`Reply sent: "${text}"`);
            }
        },

        playIndex(index, avatarSrc, username) {
            if (index < 0 || index >= activeStoriesList.length) {
                this.close();
                return;
            }

            clearTimeout(storyTimeout);
            currentStoryIndex = index;
            const currentStory = activeStoriesList[index];
            const now = Date.now();

            const storyViewer = document.getElementById('storyViewer');
            const viewerAvatar = document.getElementById('storyViewerAvatar');
            const viewerUsername = document.getElementById('storyViewerUsername');
            const viewerTime = document.getElementById('storyViewerTime');
            const optionsMenu = document.getElementById('storyOptionsMenu');
            const deleteBtn = document.getElementById('storyDeleteBtn');
            const storyContentContainer = storyViewer?.querySelector('.story-content');
            const footerArea = document.getElementById('storyFooterArea');

            if (optionsMenu) optionsMenu.style.display = 'none';

            // Resolve full post details and clean metadata
            const resolved = resolveFullPost(currentStory, username);

            const myUsername = localStorage.getItem('username') || 'User';
            const myAvatar = localStorage.getItem('avatarUrl') || localStorage.getItem('userAvatar') || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&fit=crop';
            const isMyStorySlide = username === 'Your Story' || 
                                   username === myUsername || 
                                   (username && myUsername && username.toLowerCase() === myUsername.toLowerCase()) ||
                                   (resolved.author && myUsername && resolved.author.toLowerCase() === myUsername.toLowerCase()) || 
                                   resolved.author === 'Your Story' || 
                                   (currentStory && (currentStory.author === myUsername || currentStory.author === 'Your Story'));
            const effectiveAvatar = isMyStorySlide
                ? (myAvatar || avatarSrc || resolved.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&fit=crop')
                : (avatarSrc || resolved.avatar || currentStory?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(resolved.author || username)}`);
            
            if (viewerAvatar) {
                viewerAvatar.src = effectiveAvatar;
                viewerAvatar.onerror = function() {
                    this.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&fit=crop';
                };
            }
            if (viewerUsername) {
                viewerUsername.textContent = isMyStorySlide ? (username === 'Your Story' ? myUsername : username) : (username || resolved.author);
            }

            if (viewerTime) {
                const hoursLeft = currentStory.expiresAt ? Math.max(1, Math.round((currentStory.expiresAt - now) / 3600000)) : 24;
                viewerTime.textContent = `• ${hoursLeft}h left • ${index + 1}/${activeStoriesList.length}`;
            }

            const storyId = currentStory.id || `story_${currentStory.postId || currentStory.id || index}`;

            // Automatically record viewing activity if watching someone else's story
            if (!isMyStorySlide && storyId) {
                Viewer.recordView(storyId, currentStory);
            }

            // Render Story Footer Area (Owner Seen-By Pill vs Non-Owner Reactions)
            if (footerArea) {
                if (isMyStorySlide) {
                    footerArea.innerHTML = `
                        <div class="story-seen-by-pill" id="storySeenByPill">
                            <div class="story-avatar-stack" id="storySeenAvatarStack">
                                <i class="ri-eye-line" style="font-size:1.1rem; color:#60a5fa;"></i>
                            </div>
                            <span class="story-seen-count-text" id="storySeenCountText">Loading views...</span>
                            <i class="ri-arrow-up-s-line" style="color:#a1a1aa; font-size:1.1rem;"></i>
                        </div>
                        <div style="font-size:0.75rem; color:rgba(255,255,255,0.6); display:flex; align-items:center; gap:4px;">
                            <i class="ri-lock-line"></i> Only you can see this
                        </div>
                    `;
                    Viewer.loadStoryViewers(storyId);
                } else {
                    footerArea.innerHTML = `
                        <div class="story-reaction-bar">
                            <div class="story-reply-input-wrap">
                                <input type="text" class="story-reply-input" placeholder="Send message..." id="storyReplyInput">
                            </div>
                            <div class="story-quick-reactions">
                                <button class="story-reaction-btn" data-reaction="❤️" title="Love">❤️</button>
                                <button class="story-reaction-btn" data-reaction="🔥" title="Fire">🔥</button>
                                <button class="story-reaction-btn" data-reaction="👏" title="Clap">👏</button>
                                <button class="story-reaction-btn" data-reaction="😂" title="Laugh">😂</button>
                            </div>
                        </div>
                    `;
                    footerArea.querySelectorAll('.story-reaction-btn').forEach(btn => {
                        btn.onclick = (e) => {
                            e.stopPropagation();
                            Viewer.sendQuickReaction(btn.dataset.reaction, currentStory);
                        };
                    });
                    const replyInput = footerArea.querySelector('#storyReplyInput');
                    if (replyInput) {
                        replyInput.onclick = (e) => e.stopPropagation();
                        replyInput.onkeydown = (e) => {
                            if (e.key === 'Enter' && replyInput.value.trim()) {
                                e.stopPropagation();
                                Viewer.sendReplyMessage(replyInput.value.trim(), currentStory);
                                replyInput.value = '';
                            }
                        };
                    }
                }
            }

            const pid = resolved.postId || resolved.id;
            const format = String(resolved.format || currentStory?.format || '').toLowerCase();
            const origin = String(resolved.origin_view || currentStory?.origin_view || resolved.feed_type || '').toLowerCase();

            let targetUrl = `/views/explore.html?id=${encodeURIComponent(pid)}`;
            if (format === 'article') {
                targetUrl = `/views/articleView.html?id=${encodeURIComponent(pid)}`;
            } else if (format === 'pdf' || format === 'book') {
                targetUrl = `/views/bookView.html?id=${encodeURIComponent(pid)}`;
            } else if (format === 'course' || format === 'asset') {
                targetUrl = `/views/courseView.html?id=${encodeURIComponent(pid)}`;
            } else if (format === 'explanation') {
                targetUrl = `/views/explainView.html?id=${encodeURIComponent(pid)}`;
            } else if (format === 'reel' || format === '9:16' || origin === 'reels') {
                targetUrl = `/views/reels.html?id=${encodeURIComponent(pid)}`;
            } else {
                targetUrl = `/views/explore.html?id=${encodeURIComponent(pid)}`;
            }

            const isMyStory = username === 'Your Story' || username === myUsername || resolved.author === myUsername;
            if (deleteBtn) {
                deleteBtn.style.display = isMyStory ? 'flex' : 'none';
            }

            // Save state for options menu actions
            Viewer._currentTargetUrl = targetUrl;
            Viewer._currentResolved = resolved;
            Viewer._currentAvatarSrc = avatarSrc;
            Viewer._currentUsername = username;

            // Update Progress Bar Fills
            activeStoriesList.forEach((_, i) => {
                const fill = document.getElementById(`storyProgressFill_${i}`);
                if (fill) {
                    fill.style.transition = 'none';
                    fill.style.width = (i < index) ? '100%' : '0%';
                }
            });

            // Render Rich Interactive Post Card in Story
            if (storyContentContainer) {
                storyContentContainer.innerHTML = '';

                // Ambient Radial Background
                const ambientBg = document.createElement('div');
                ambientBg.className = 'story-ambient-bg';
                storyContentContainer.appendChild(ambientBg);

                // Prepare Target Post Object
                const targetPost = currentStory.rawPost || currentStory.post || resolved;
                targetPost.id = targetPost.id || pid;
                targetPost.title = targetPost.title || resolved.title;
                targetPost.username = targetPost.username || targetPost.author || resolved.author;
                targetPost.author = targetPost.username;
                targetPost.avatar_url = targetPost.avatar_url || targetPost.avatar || resolved.avatar;
                targetPost.format = targetPost.format || resolved.format;
                targetPost.video_url = targetPost.video_url || resolved.video_url;
                targetPost.image_url = targetPost.image_url || resolved.image_url;
                targetPost.thumbnail_url = targetPost.thumbnail_url || resolved.thumbnail_url;
                targetPost.source = targetPost.source || resolved.source;

                let renderedWithFeedComponent = false;
                if (typeof window.createPostElement === 'function') {
                    try {
                        const postResult = window.createPostElement(targetPost, 'grid');
                        if (postResult && postResult.element) {
                            const postEl = postResult.element;
                            postEl.classList.add('story-post-card-embed');
                            // Clean up post-level author menus (Edit Details, Delete Post) inside story
                            postEl.querySelectorAll('.post-options-btn, .post-options-menu').forEach(el => el.remove());
                            
                            // Make whole card and inner components navigate directly to exact post
                            postEl.style.cursor = 'pointer';
                            const navigateToExactPost = (e) => {
                                if (e) {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }
                                Viewer.close();
                                window.location.href = targetUrl;
                            };
                            postEl.onclick = navigateToExactPost;
                            postEl.querySelectorAll('.post-media, .post-footer, .post-caption, .post-actions, .post-actions .icon-btn').forEach(el => {
                                el.style.cursor = 'pointer';
                                el.onclick = navigateToExactPost;
                            });

                            storyContentContainer.appendChild(postEl);
                            if (typeof postResult.init === 'function') postResult.init();
                            renderedWithFeedComponent = true;
                        }
                    } catch (err) {
                        console.warn('[StoryManager] createPostElement fallback triggered:', err);
                    }
                }

                if (!renderedWithFeedComponent) {
                    // Native Glassmorphic Post Card Fallback
                    const iconClass = (resolved.format === 'math' || resolved.engine === 'katex') ? 'ri-functions' :
                        (resolved.format === '3d_model' || resolved.engine === 'zdog' || resolved.engine === 'three') ? 'ri-box-3-line' :
                        (resolved.format === 'diagram' || resolved.engine === 'mermaid') ? 'ri-node-tree' :
                        (resolved.format === 'tikz' || resolved.engine === 'tikz') ? 'ri-draft-line' :
                        (resolved.code) ? 'ri-code-s-slash-line' : 'ri-sparkling-fill';

                    const postCard = document.createElement('div');
                    postCard.className = 'story-post-card';

                    postCard.innerHTML = `
                        <div class="story-post-card-header">
                            <div class="story-card-author">
                                <img src="${effectiveAvatar}" alt="${escapeHtml(resolved.author)}" class="story-card-avatar" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(resolved.author)}'">
                                <span class="story-card-username">@${escapeHtml(resolved.author)}</span>
                            </div>
                            <div class="story-card-badge">
                                <i class="${iconClass}"></i> ${escapeHtml(resolved.format)}
                            </div>
                        </div>
                        <div class="story-post-card-media" id="storyCardMedia"></div>
                        <div class="story-post-card-body">
                            <h3 class="story-post-card-title">${escapeHtml(resolved.title)}</h3>
                            <p class="story-post-card-desc">${escapeHtml(resolved.description)}</p>
                        </div>
                        <div class="story-post-card-cta">
                            <button class="story-card-btn" id="storyCardOpenBtn">
                                <span>Open Simulation</span> <i class="ri-arrow-right-line"></i>
                            </button>
                        </div>
                    `;

                    storyContentContainer.appendChild(postCard);

                    const openBtn = postCard.querySelector('#storyCardOpenBtn');
                    if (openBtn) {
                        openBtn.onclick = (e) => {
                            e.stopPropagation();
                            window.location.href = targetUrl;
                        };
                    }
                    postCard.onclick = (e) => {
                        if (e.target.closest('#storyCardOpenBtn')) return;
                        e.stopPropagation();
                        window.location.href = targetUrl;
                    };

                    const mediaContainer = postCard.querySelector('#storyCardMedia');
                    let isVideo = false;
                    let videoEl = null;

                    const rawVideoUrl = resolved.video_url || '';
                    const rawImageUrl = resolved.image_url || resolved.thumbnail_url || '';
                    const fullVideoUrl = rawVideoUrl ? (rawVideoUrl.startsWith('http') ? rawVideoUrl : `${getBackendUrl()}${rawVideoUrl}`) : '';
                    const fullImageUrl = rawImageUrl ? (rawImageUrl.startsWith('http') ? rawImageUrl : `${getBackendUrl()}${rawImageUrl}`) : '';

                    if (fullVideoUrl) {
                        isVideo = true;
                        videoEl = document.createElement('video');
                        videoEl.src = fullVideoUrl;
                        videoEl.autoplay = true;
                        videoEl.loop = true;
                        videoEl.muted = true;
                        videoEl.playsinline = true;
                        videoEl.onerror = () => {
                            renderDynamicCanvasFallback(mediaContainer, resolved.format, resolved.engine, resolved.title);
                        };
                        mediaContainer.appendChild(videoEl);
                    } else if (fullImageUrl) {
                        const imgEl = document.createElement('img');
                        imgEl.src = fullImageUrl;
                        imgEl.onerror = () => {
                            renderDynamicCanvasFallback(mediaContainer, resolved.format, resolved.engine, resolved.title);
                        };
                        mediaContainer.appendChild(imgEl);
                    } else {
                        const engineHtml = window.EngineManager?.renderHtml ? window.EngineManager.renderHtml(resolved, { isFeed: true, isInteractive: true }) : null;
                        if (engineHtml) {
                            const iframe = document.createElement('iframe');
                            iframe.srcdoc = engineHtml;
                            iframe.style.background = resolved.source?.background || '#090b10';
                            mediaContainer.appendChild(iframe);
                        } else {
                            renderDynamicCanvasFallback(mediaContainer, resolved.format, resolved.engine, resolved.title);
                        }
                    }
                }

                // Progress Bar Timeline
                const currentFill = document.getElementById(`storyProgressFill_${index}`);
                if (currentFill) {
                    currentFill.style.transition = 'none';
                    currentFill.style.width = '0%';
                    void currentFill.offsetWidth;
                }

                const startStoryProgress = (duration) => {
                    if (currentFill) {
                        currentFill.style.transition = `width ${duration}s linear`;
                        currentFill.style.width = '100%';
                    }
                    clearTimeout(storyTimeout);
                    storyTimeout = setTimeout(() => {
                        if (currentStoryIndex < activeStoriesList.length - 1) {
                            Viewer.playIndex(currentStoryIndex + 1, avatarSrc, username);
                        } else {
                            Viewer.close();
                        }
                    }, duration * 1000);
                };

                if (isVideo && videoEl) {
                    videoEl.play().catch(() => {});
                    const setDuration = () => {
                        const dur = (videoEl.duration > 0 && isFinite(videoEl.duration)) ? Math.min(videoEl.duration, 15) : 5;
                        startStoryProgress(dur);
                    };
                    videoEl.addEventListener('loadedmetadata', setDuration);
                    videoEl.addEventListener('canplay', setDuration);
                    setTimeout(() => {
                        if (currentFill && currentFill.style.width !== '100%') setDuration();
                    }, 400);
                } else {
                    startStoryProgress(5);
                }
            }
        },

        next() {
            if (currentStoryIndex < activeStoriesList.length - 1) {
                const viewerAvatar = document.getElementById('storyViewerAvatar');
                const viewerUsername = document.getElementById('storyViewerUsername');
                this.playIndex(currentStoryIndex + 1, viewerAvatar?.src || '', viewerUsername?.textContent || '');
            } else {
                this.close();
            }
        },

        prev() {
            const viewerAvatar = document.getElementById('storyViewerAvatar');
            const viewerUsername = document.getElementById('storyViewerUsername');
            if (currentStoryIndex > 0) {
                this.playIndex(currentStoryIndex - 1, viewerAvatar?.src || '', viewerUsername?.textContent || '');
            } else {
                this.playIndex(0, viewerAvatar?.src || '', viewerUsername?.textContent || '');
            }
        },

        close() {
            clearTimeout(storyTimeout);
            const storyViewer = document.getElementById('storyViewer');
            const optionsMenu = document.getElementById('storyOptionsMenu');
            if (optionsMenu) optionsMenu.style.display = 'none';
            if (storyViewer) storyViewer.style.display = 'none';
            document.body.classList.remove('story-open');
        }
    };

    // 4. StoryCreator Modal Helper
    const Creator = {
        shareToStory(postData) {
            const item = Data.addStory(postData);
            if (typeof window.showToast === 'function') {
                window.showToast('Added to your 24h Story! 🌟');
            } else {
                alert('Added to your 24h Story! 🌟');
            }
            return item;
        }
    };

    // Initialize Event Listeners
    function initListeners() {
        const closeBtn = document.getElementById('closeStoryViewer');
        if (closeBtn) closeBtn.addEventListener('click', () => Viewer.close());

        const storyViewerEl = document.getElementById('storyViewer');
        if (storyViewerEl) storyViewerEl.addEventListener('click', (e) => { if (e.target === storyViewerEl) Viewer.close(); });

        const tapRight = document.getElementById('storyTapRight');
        if (tapRight) {
            tapRight.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = document.getElementById('storyOptionsMenu');
                if (menu && menu.style.display === 'flex') {
                    menu.style.display = 'none';
                    return;
                }
                Viewer.next();
            });
        }

        const tapLeft = document.getElementById('storyTapLeft');
        if (tapLeft) {
            tapLeft.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = document.getElementById('storyOptionsMenu');
                if (menu && menu.style.display === 'flex') {
                    menu.style.display = 'none';
                    return;
                }
                Viewer.prev();
            });
        }

        // 3-Dots Options Menu Handler
        const optionsBtn = document.getElementById('storyOptionsBtn');
        const optionsMenu = document.getElementById('storyOptionsMenu');
        if (optionsBtn && optionsMenu) {
            optionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = optionsMenu.style.display === 'none' || !optionsMenu.style.display;
                if (isHidden) {
                    optionsMenu.style.display = 'flex';
                    clearTimeout(storyTimeout); // Pause timer while viewing options
                } else {
                    optionsMenu.style.display = 'none';
                }
            });

            document.addEventListener('click', (e) => {
                if (optionsMenu && optionsMenu.style.display === 'flex') {
                    if (!optionsMenu.contains(e.target) && e.target !== optionsBtn && !optionsBtn.contains(e.target)) {
                        optionsMenu.style.display = 'none';
                    }
                }
            });
        }

        // Highlight to Profile Handler
        const highlightBtn = document.getElementById('storyHighlightBtn');
        if (highlightBtn) {
            highlightBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (optionsMenu) optionsMenu.style.display = 'none';
                const currentStory = activeStoriesList[currentStoryIndex];
                if (!currentStory) return;

                const myUsername = localStorage.getItem('username') || 'User';
                const resolved = Viewer._currentResolved || resolveFullPost(currentStory, Viewer._currentUsername);
                const storyId = currentStory.id || `story_${Date.now()}`;
                const pid = resolved.postId || resolved.id;

                let highlights = [];
                try {
                    highlights = JSON.parse(localStorage.getItem('profileHighlights') || '[]');
                    if (!Array.isArray(highlights)) highlights = [];
                } catch (_) {
                    highlights = [];
                }

                const exists = highlights.some(h => (h && h.id === storyId) || (pid && h && h.postId === pid));
                if (!exists) {
                    highlights.unshift({
                        id: storyId,
                        postId: pid,
                        title: resolved.title || 'Highlight',
                        author: resolved.author || myUsername,
                        avatar: resolved.avatar || '',
                        format: resolved.format || 'simulation',
                        timestamp: Date.now(),
                        post: resolved
                    });
                    localStorage.setItem('profileHighlights', JSON.stringify(highlights));
                    if (typeof window.showToast === 'function') {
                        window.showToast('Added to Profile Highlights! ⭐');
                    } else {
                        alert('Added to Profile Highlights! ⭐');
                    }
                } else {
                    if (typeof window.showToast === 'function') {
                        window.showToast('Already in your Profile Highlights! ⭐');
                    } else {
                        alert('Already in your Profile Highlights! ⭐');
                    }
                }
            });
        }

        // Copy Link Handler
        const copyLinkBtn = document.getElementById('storyCopyLinkBtn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (optionsMenu) optionsMenu.style.display = 'none';
                const targetUrl = Viewer._currentTargetUrl || '/views/explore.html';
                const fullUrl = `${window.location.origin}${targetUrl}`;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(fullUrl).then(() => {
                        if (typeof window.showToast === 'function') {
                            window.showToast('Story link copied to clipboard! 📋');
                        } else {
                            alert('Story link copied to clipboard! 📋');
                        }
                    }).catch(() => {});
                } else {
                    if (typeof window.showToast === 'function') {
                        window.showToast('Story link: ' + fullUrl);
                    } else {
                        prompt('Story link:', fullUrl);
                    }
                }
            });
        }

        // Delete Story Handler
        const deleteBtn = document.getElementById('storyDeleteBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (optionsMenu) optionsMenu.style.display = 'none';
                const currentStory = activeStoriesList[currentStoryIndex];
                if (!currentStory) return;

                const myUsername = localStorage.getItem('username') || 'User';
                const myUserId = localStorage.getItem('userId');

                // Delete from storyData storage
                const data = Data.getStoryData();
                const filterOut = (list) => Array.isArray(list) ? list.filter(s => s && s.id !== currentStory.id && s.postId !== currentStory.postId) : [];
                
                if (data["Your Story"]) data["Your Story"] = filterOut(data["Your Story"]);
                if (data[myUsername]) data[myUsername] = filterOut(data[myUsername]);
                if (myUserId && data[myUserId]) data[myUserId] = filterOut(data[myUserId]);
                Data.saveStoryData(data);

                // Remove from activeStoriesList
                activeStoriesList.splice(currentStoryIndex, 1);

                if (typeof window.showToast === 'function') {
                    window.showToast('Story deleted 🗑️');
                } else {
                    alert('Story deleted 🗑️');
                }

                if (activeStoriesList.length === 0) {
                    Viewer.close();
                    Bar.checkAndUpdateState();
                } else {
                    const newIdx = Math.min(currentStoryIndex, activeStoriesList.length - 1);
                    const progressBarsContainer = document.getElementById('storyProgressBars');
                    if (progressBarsContainer) {
                        progressBarsContainer.innerHTML = '';
                        activeStoriesList.forEach((_, idx) => {
                            const barCont = document.createElement('div');
                            barCont.className = 'progress-bar-container';
                            const barFill = document.createElement('div');
                            barFill.className = 'progress-bar-fill';
                            barFill.id = `storyProgressFill_${idx}`;
                            barFill.style.width = idx < newIdx ? '100%' : '0%';
                            barCont.appendChild(barFill);
                            progressBarsContainer.appendChild(barCont);
                        });
                    }
                    Viewer.playIndex(newIdx, Viewer._currentAvatarSrc, Viewer._currentUsername);
                    Bar.checkAndUpdateState();
                }
            });
        }

        // Viewers Bottom Sheet Handlers
        const closeSheetBtn = document.getElementById('closeStoryViewersSheet');
        if (closeSheetBtn) {
            closeSheetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                Viewer.closeViewersModal();
            });
        }

        const viewersBackdrop = document.getElementById('storyViewersBackdrop');
        if (viewersBackdrop) {
            viewersBackdrop.addEventListener('click', (e) => {
                if (e.target === viewersBackdrop) {
                    Viewer.closeViewersModal();
                }
            });
        }

        const storyBarEl = document.querySelector('.story-bar');
        if (storyBarEl) {
            storyBarEl.addEventListener('click', (e) => {
                const item = e.target.closest('.story-item');
                if (item) Viewer.open(item);
            });
        }

        // Initial sync of community stories from server
        Data.syncStoriesFromBackend().then(() => {
            Bar.render();
            Bar.checkAndUpdateState();
        }).catch(() => {
            Bar.render();
            Bar.checkAndUpdateState();
        });

        // Periodic background sync every 15s to catch new active stories in real-time
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                Data.syncStoriesFromBackend();
            }
        }, 15000);

        // Instant sync on tab focus or app foregrounding on mobile
        window.addEventListener('focus', () => Data.syncStoriesFromBackend());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                Data.syncStoriesFromBackend();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initListeners);
    } else {
        initListeners();
    }

    // Main StoryManager Master Object
    const StoryManager = {
        Data,
        Bar,
        Viewer,
        Creator,
        initListeners
    };

    // 100% Backward Compatibility Global Bindings
    window.StoryManager = StoryManager;
    window.getActiveStoriesForUser = Data.getActiveStoriesForUser.bind(Data);
    window.renderDynamicStoryBar = Bar.render.bind(Bar);
    window.checkAndUpdateStoryBarState = Bar.checkAndUpdateState.bind(Bar);
    window.openStory = Viewer.open.bind(Viewer);
    window.openStoryByUsername = Viewer.openByUsername.bind(Viewer);
    window.closeStory = Viewer.close.bind(Viewer);

})(typeof window !== 'undefined' ? window : this);
