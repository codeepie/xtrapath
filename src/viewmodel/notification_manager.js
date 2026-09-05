// =========================================================================
// XtraPath Notification Manager (Real Users & Profile Resolution Engine)
// Fetches real social activities (Remixes, Likes, Comments, Purchases, Follows)
// Features Spark icon indicator with clean glowing red dot (no numbers)
// Allows direct profile viewing by clicking any actor's avatar or username
// =========================================================================

(function () {
    'use strict';

    function getSupabase() {
        return window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
    }

    function timeAgo(isoStringOrTimestamp) {
        if (!isoStringOrTimestamp) return 'Just now';
        try {
            const date = typeof isoStringOrTimestamp === 'number' ? new Date(isoStringOrTimestamp) : new Date(isoStringOrTimestamp);
            const seconds = Math.floor((new Date() - date) / 1000);
            if (seconds < 60) return 'Just now';
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m ago`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            const days = Math.floor(hours / 24);
            if (days === 1) return 'Yesterday';
            if (days < 30) return `${days}d ago`;
            return date.toLocaleDateString();
        } catch (_) {
            return 'Recently';
        }
    }

    class XtraNotificationManager {
        constructor() {
            this.storageKey = 'xtra_notifications_data';
            this.readIdsKey = 'xtra_notifications_read_ids';
            this.isOpen = false;
            this.activeFilter = 'all';
            this.notifications = [];
            this.isInitialized = false;
            this.myPostIds = new Set();
            this.myPostsMap = new Map();
            this.realtimeSubscribed = false;
        }

        async init() {
            if (this.isInitialized) {
                this.updateBadge();
                return;
            }
            this.isInitialized = true;
            this.injectDrawer();
            this.bindEvents();

            // Load cached notifications immediately for fast UI
            this.loadCachedNotifications();
            this.updateBadge();

            // Fetch live real notifications from Supabase & Backend
            await this.fetchRealNotifications();

            // Set up real-time listener for incoming activities
            this.setupRealtimeSubscription();
        }

        getReadIds() {
            try {
                return new Set(JSON.parse(localStorage.getItem(this.readIdsKey) || '[]'));
            } catch (_) {
                return new Set();
            }
        }

        saveReadIds(set) {
            try {
                localStorage.setItem(this.readIdsKey, JSON.stringify(Array.from(set)));
            } catch (_) {}
        }

        loadCachedNotifications() {
            try {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    this.notifications = JSON.parse(stored);
                } else {
                    this.notifications = [];
                }
            } catch (_) {
                this.notifications = [];
            }
        }

        saveNotifications() {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.notifications.slice(0, 50)));
            } catch (_) {}
        }

        getUnreadCount() {
            return this.notifications.filter(n => !n.read).length;
        }

        updateBadge() {
            const hasUnread = this.getUnreadCount() > 0;
            const notifDots = document.querySelectorAll('.notification-red-dot');
            notifDots.forEach(dot => {
                dot.style.display = hasUnread ? 'block' : 'none';
            });
        }

        // =========================================================================
        // REAL DATA SYNCHRONIZATION & PROFILE RESOLUTION ENGINE
        // =========================================================================
        async fetchRealNotifications() {
            const myUserId = localStorage.getItem('userId');
            const myUsername = (localStorage.getItem('username') || '').toLowerCase().trim().replace(/^@/, '');
            const client = getSupabase();

            if (!client) {
                this.updateBadge();
                return;
            }

            try {
                const readIds = this.getReadIds();
                const rawActivities = [];
                const actorUserIds = new Set();
                const actorUsernames = new Set();

                // 1. Fetch current user's published post IDs (by user_id OR username)
                let userPosts = [];
                try {
                    let postQuery = client.from('posts').select('id, title, format, user_id, username, created_at');
                    if (myUserId && myUsername) {
                        postQuery = postQuery.or(`user_id.eq.${myUserId},username.ilike.${myUsername}`);
                    } else if (myUserId) {
                        postQuery = postQuery.eq('user_id', myUserId);
                    } else if (myUsername) {
                        postQuery = postQuery.ilike('username', myUsername);
                    }
                    const { data: dbPosts, error: postErr } = await postQuery;
                    if (!postErr && Array.isArray(dbPosts)) {
                        userPosts = dbPosts;
                    }
                } catch (pErr) {
                    console.warn('[NotificationManager] User posts query notice:', pErr);
                }

                // Also check local cache for offline/own posts
                try {
                    const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                    localPosts.forEach(p => {
                        if (p && p.id && !userPosts.some(up => String(up.id) === String(p.id))) {
                            userPosts.push(p);
                        }
                    });
                } catch (_) {}

                this.myPostIds.clear();
                this.myPostsMap.clear();
                userPosts.forEach(p => {
                    const pid = String(p.id);
                    this.myPostIds.add(pid);
                    this.myPostsMap.set(pid, p);
                });

                const postIdsArray = Array.from(this.myPostIds);

                // 2. Fetch Real Remixes on user's posts
                if (postIdsArray.length > 0) {
                    try {
                        const { data: remixesData } = await client
                            .from('posts')
                            .select('id, title, original_id, created_at, user_id, username, avatar_url')
                            .in('original_id', postIdsArray)
                            .order('created_at', { ascending: false })
                            .limit(25);

                        if (remixesData) {
                            remixesData.forEach(remix => {
                                const remixUser = (remix.username || '').toLowerCase().replace(/^@/, '');
                                if (myUserId && String(remix.user_id) === String(myUserId)) return;
                                if (myUsername && remixUser === myUsername) return;

                                if (remix.user_id) actorUserIds.add(String(remix.user_id));
                                if (remix.username) actorUsernames.add(remix.username);

                                const originalPost = this.myPostsMap.get(String(remix.original_id));
                                const originalTitle = originalPost?.title || 'your creation';

                                rawActivities.push({
                                    id: `remix_${remix.id}`,
                                    type: 'remix',
                                    title: 'New Remix',
                                    message: `remixed your simulation "${originalTitle}".`,
                                    rawActor: {
                                        id: remix.user_id || '',
                                        username: remix.username || 'Creator',
                                        avatar: remix.avatar_url || ''
                                    },
                                    link: `/views/explore.html?postId=${encodeURIComponent(remix.id)}`,
                                    time: timeAgo(remix.created_at),
                                    timestamp: new Date(remix.created_at || Date.now()).getTime(),
                                    badgeIcon: 'ri-repeat-2-fill',
                                    badgeColor: '#38bdf8'
                                });
                            });
                        }
                    } catch (remixErr) {
                        console.warn('[NotificationManager] Remix sync notice:', remixErr);
                    }
                }

                // 3. Fetch Real Comments on user's posts (Supabase DB + Local Map)
                if (postIdsArray.length > 0) {
                    try {
                        const { data: commentsData } = await client
                            .from('comments')
                            .select('*')
                            .in('post_id', postIdsArray)
                            .order('created_at', { ascending: false })
                            .limit(30);

                        if (commentsData) {
                            commentsData.forEach(comm => {
                                const commUser = (comm.username || '').toLowerCase().replace(/^@/, '');
                                if (myUserId && String(comm.user_id) === String(myUserId)) return;
                                if (myUsername && commUser === myUsername) return;

                                if (comm.user_id) actorUserIds.add(String(comm.user_id));
                                if (comm.username) actorUsernames.add(comm.username);

                                const parentPost = this.myPostsMap.get(String(comm.post_id));
                                const postTitle = parentPost?.title || 'your post';
                                const rawText = comm.text || comm.content || comm.comment || 'New message';
                                const cleanSnippet = rawText.replace(/<[^>]*>?/gm, '').substring(0, 65);

                                rawActivities.push({
                                    id: `comment_${comm.id}`,
                                    type: 'comment',
                                    title: 'New Comment',
                                    message: `commented on "${postTitle}": "${cleanSnippet}"`,
                                    rawActor: {
                                        id: comm.user_id || '',
                                        username: comm.username || 'User',
                                        avatar: comm.avatar_url || ''
                                    },
                                    link: `/views/explore.html?postId=${encodeURIComponent(comm.post_id)}`,
                                    time: timeAgo(comm.created_at),
                                    timestamp: comm.created_at ? new Date(comm.created_at).getTime() : Date.now(),
                                    badgeIcon: 'ri-chat-3-fill',
                                    badgeColor: '#a855f7'
                                });
                            });
                        }
                    } catch (commErr) {
                        console.warn('[NotificationManager] Comments sync notice:', commErr);
                    }
                }

                // Also check local comment storage for any new comments on user's posts
                try {
                    const localCommentsMap = JSON.parse(localStorage.getItem('postComments') || '{}');
                    postIdsArray.forEach(pid => {
                        const list = localCommentsMap[pid] || [];
                        list.forEach(c => {
                            const cUser = (c.username || '').toLowerCase().replace(/^@/, '');
                            if (myUserId && String(c.user_id) === String(myUserId)) return;
                            if (myUsername && cUser === myUsername) return;
                            const cid = `comment_${c.id}`;
                            if (!rawActivities.some(a => a.id === cid)) {
                                const parentPost = this.myPostsMap.get(pid);
                                const postTitle = parentPost?.title || 'your post';
                                const snippet = (c.text || c.content || 'New message').substring(0, 65);
                                if (c.user_id) actorUserIds.add(String(c.user_id));
                                if (c.username) actorUsernames.add(c.username);

                                rawActivities.push({
                                    id: cid,
                                    type: 'comment',
                                    title: 'New Comment',
                                    message: `commented on "${postTitle}": "${snippet}"`,
                                    rawActor: {
                                        id: c.user_id || '',
                                        username: c.username || 'User',
                                        avatar: c.avatar_url || ''
                                    },
                                    link: `/views/explore.html?postId=${encodeURIComponent(pid)}`,
                                    time: timeAgo(c.created_at),
                                    timestamp: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
                                    badgeIcon: 'ri-chat-3-fill',
                                    badgeColor: '#a855f7'
                                });
                            }
                        });
                    });
                } catch (_) {}

                // 4. Fetch Real Likes on user's posts
                if (postIdsArray.length > 0) {
                    try {
                        const { data: likesData } = await client
                            .from('likes')
                            .select('*')
                            .in('post_id', postIdsArray)
                            .order('created_at', { ascending: false })
                            .limit(35);

                        if (likesData) {
                            const postLikesMap = new Map();
                            likesData.forEach(l => {
                                if (myUserId && String(l.user_id) === String(myUserId)) return;
                                const pid = String(l.post_id);
                                if (!postLikesMap.has(pid)) postLikesMap.set(pid, []);
                                postLikesMap.get(pid).push(l);
                                if (l.user_id) actorUserIds.add(String(l.user_id));
                            });

                            postLikesMap.forEach((likesList, pid) => {
                                const parentPost = this.myPostsMap.get(pid);
                                const postTitle = parentPost?.title || 'your creation';
                                const count = likesList.length;
                                const latestLike = likesList[0];

                                const msg = count === 1
                                    ? `liked your simulation "${postTitle}".`
                                    : `and ${count - 1} other${count > 2 ? 's' : ''} liked your simulation "${postTitle}".`;

                                rawActivities.push({
                                    id: `like_${pid}_${latestLike.created_at || count}`,
                                    type: 'like',
                                    title: 'New Likes',
                                    message: msg,
                                    rawActor: {
                                        id: latestLike.user_id || '',
                                        username: 'Someone',
                                        avatar: ''
                                    },
                                    link: `/views/explore.html?postId=${encodeURIComponent(pid)}`,
                                    time: timeAgo(latestLike.created_at),
                                    timestamp: latestLike.created_at ? new Date(latestLike.created_at).getTime() : Date.now(),
                                    badgeIcon: 'ri-heart-3-fill',
                                    badgeColor: '#ec4899'
                                });
                            });
                        }
                    } catch (likeErr) {
                        console.warn('[NotificationManager] Likes sync notice:', likeErr);
                    }
                }

                // 5. Fetch Real Purchases on user's products
                if (postIdsArray.length > 0) {
                    try {
                        const { data: purchaseData } = await client
                            .from('purchases')
                            .select('*')
                            .in('item_id', postIdsArray)
                            .order('created_at', { ascending: false })
                            .limit(20);

                        if (purchaseData) {
                            purchaseData.forEach(p => {
                                if (myUserId && String(p.user_id) === String(myUserId)) return;
                                if (p.user_id) actorUserIds.add(String(p.user_id));

                                const prod = this.myPostsMap.get(String(p.item_id));
                                const prodTitle = prod?.title || 'Store Product';
                                const priceText = p.price ? ` ($${p.price})` : '';

                                rawActivities.push({
                                    id: `purchase_${p.id}`,
                                    type: 'store',
                                    title: 'Store Purchase',
                                    message: `purchased "${prodTitle}"${priceText}.`,
                                    rawActor: {
                                        id: p.user_id || '',
                                        username: 'Buyer',
                                        avatar: ''
                                    },
                                    link: `/views/profile.html#library`,
                                    time: timeAgo(p.created_at),
                                    timestamp: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
                                    badgeIcon: 'ri-shopping-bag-3-fill',
                                    badgeColor: '#10b981'
                                });
                            });
                        }
                    } catch (purErr) {
                        console.warn('[NotificationManager] Purchases sync notice:', purErr);
                    }
                }

                // 6. Fetch Real Followers from user_follows table
                if (myUserId || myUsername) {
                    try {
                        let followQuery = client.from('user_follows').select('*');
                        let orFilters = [];
                        if (myUserId) orFilters.push(`following_id.eq.${myUserId}`);
                        if (myUsername) {
                            orFilters.push(`following_id.eq.${myUsername}`);
                            orFilters.push(`creator_username.ilike.${myUsername}`);
                            orFilters.push(`creator_username.ilike.@${myUsername}`);
                        }
                        if (orFilters.length > 0) {
                            followQuery = followQuery.or(orFilters.join(','));
                        }
                        const { data: followsData, error: folErr } = await followQuery.order('created_at', { ascending: false }).limit(25);

                        if (!folErr && Array.isArray(followsData)) {
                            followsData.forEach(f => {
                                const followerUid = f.follower_id ? String(f.follower_id) : '';
                                const followerName = f.follower_username || 'A creator';
                                const followerAvatar = f.follower_avatar || '';

                                if (myUserId && followerUid === String(myUserId)) return;
                                if (myUsername && followerName.toLowerCase().replace(/^@/, '') === myUsername) return;

                                if (followerUid) actorUserIds.add(followerUid);
                                if (followerName) actorUsernames.add(followerName);

                                rawActivities.push({
                                    id: `follow_${f.id || followerUid}_${f.created_at || 'recent'}`,
                                    type: 'follow',
                                    title: 'New Follower',
                                    message: 'started following your creations and simulations.',
                                    rawActor: {
                                        id: followerUid,
                                        username: followerName,
                                        avatar: followerAvatar
                                    },
                                    link: `/views/profile.html?user_id=${encodeURIComponent(followerUid)}&username=${encodeURIComponent(followerName)}`,
                                    time: timeAgo(f.created_at),
                                    timestamp: f.created_at ? new Date(f.created_at).getTime() : Date.now(),
                                    badgeIcon: 'ri-user-add-fill',
                                    badgeColor: '#6366f1'
                                });
                            });
                        }
                    } catch (folErr) {
                        console.warn('[NotificationManager] Follows sync notice:', folErr);
                    }
                }

                // 7. BATCH-RESOLVE REAL USER PROFILES (Avatars, Usernames, IDs)
                const userProfilesMap = new Map();
                const idList = Array.from(actorUserIds).filter(Boolean);
                const nameList = Array.from(actorUsernames).filter(Boolean);

                if (idList.length > 0) {
                    try {
                        const { data: profsById } = await client
                            .from('profiles')
                            .select('id, username, full_name, avatar_url')
                            .in('id', idList);
                        if (profsById) {
                            profsById.forEach(p => {
                                const avatar = p.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(p.username || p.id)}`;
                                userProfilesMap.set(String(p.id), { ...p, avatar_url: avatar });
                                if (p.username) userProfilesMap.set(p.username.toLowerCase(), { ...p, avatar_url: avatar });
                            });
                        }
                    } catch (_) {}
                }

                if (nameList.length > 0) {
                    const missingNames = nameList.filter(n => !userProfilesMap.has(n.toLowerCase()));
                    if (missingNames.length > 0) {
                        try {
                            const { data: profsByName } = await client
                                .from('profiles')
                                .select('id, username, full_name, avatar_url')
                                .in('username', missingNames);
                            if (profsByName) {
                                profsByName.forEach(p => {
                                    const avatar = p.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(p.username || p.id)}`;
                                    userProfilesMap.set(String(p.id), { ...p, avatar_url: avatar });
                                    if (p.username) userProfilesMap.set(p.username.toLowerCase(), { ...p, avatar_url: avatar });
                                });
                            }
                        } catch (_) {}
                    }
                }

                // 8. ASSEMBLE FINAL REAL NOTIFICATIONS
                const finalNotifs = rawActivities.map(act => {
                    const actorId = act.rawActor.id ? String(act.rawActor.id) : '';
                    const actorName = act.rawActor.username || '';
                    const resolvedProfile = userProfilesMap.get(actorId) || (actorName ? userProfilesMap.get(actorName.toLowerCase()) : null);

                    const finalUsername = resolvedProfile?.username || actorName || 'Creator';
                    const finalAvatar = resolvedProfile?.avatar_url || act.rawActor.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(finalUsername)}`;
                    const finalId = resolvedProfile?.id || actorId;

                    return {
                        id: act.id,
                        type: act.type,
                        title: act.title,
                        message: act.message,
                        actor: {
                            id: finalId,
                            username: finalUsername,
                            avatar: finalAvatar
                        },
                        link: act.link,
                        time: act.time,
                        timestamp: act.timestamp,
                        read: readIds.has(act.id),
                        badgeIcon: act.badgeIcon,
                        badgeColor: act.badgeColor
                    };
                });

                if (finalNotifs.length > 0) {
                    finalNotifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    this.notifications = finalNotifs;
                } else if (this.notifications.length === 0) {
                    this.notifications = [
                        {
                            id: 'welcome_spark',
                            type: 'system',
                            title: 'Welcome to XtraPath',
                            message: 'Your activity, remixes, comments, and store purchases will appear right here.',
                            actor: { id: '', username: 'XtraPath Team', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop' },
                            link: '/views/explore.html',
                            time: 'Just now',
                            timestamp: Date.now(),
                            read: false,
                            badgeIcon: 'ri-sparkling-fill',
                            badgeColor: '#3b82f6'
                        }
                    ];
                }

                this.saveNotifications();
                this.updateBadge();
                if (this.isOpen) {
                    this.renderList();
                }
            } catch (err) {
                console.warn('[NotificationManager] Global notification fetch error:', err);
            }
        }

        // =========================================================================
        // REALTIME SUBSCRIPTION
        // =========================================================================
        setupRealtimeSubscription() {
            if (this.realtimeSubscribed) return;
            const client = getSupabase();
            if (!client || typeof client.channel !== 'function') return;

            try {
                this.realtimeSubscribed = true;
                const channel = client.channel('xtra_realtime_notifications');

                // Listen to new comments
                channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
                    const row = payload.new;
                    if (row && this.myPostIds.has(String(row.post_id))) {
                        const myUserId = localStorage.getItem('userId');
                        if (myUserId && String(row.user_id) === String(myUserId)) return;

                        const parentPost = this.myPostsMap.get(String(row.post_id));
                        const rawContent = row.text || row.content || 'New comment';
                        this.addNotification({
                            id: `comment_${row.id}`,
                            type: 'comment',
                            title: 'New Comment',
                            message: `commented on "${parentPost?.title || 'your post'}": "${rawContent.substring(0, 60)}"`,
                            actor: { id: row.user_id || '', username: row.username || 'User' },
                            link: `/views/explore.html?postId=${encodeURIComponent(row.post_id)}`,
                            badgeIcon: 'ri-chat-3-fill',
                            badgeColor: '#a855f7'
                        });
                    }
                });

                // Listen to new remixes
                channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
                    const row = payload.new;
                    if (row && row.original_id && this.myPostIds.has(String(row.original_id))) {
                        const myUserId = localStorage.getItem('userId');
                        if (myUserId && String(row.user_id) === String(myUserId)) return;

                        const orig = this.myPostsMap.get(String(row.original_id));
                        this.addNotification({
                            id: `remix_${row.id}`,
                            type: 'remix',
                            title: 'New Remix',
                            message: `remixed your simulation "${orig?.title || 'your post'}".`,
                            actor: { id: row.user_id || '', username: row.username || 'Creator' },
                            link: `/views/explore.html?postId=${encodeURIComponent(row.id)}`,
                            badgeIcon: 'ri-repeat-2-fill',
                            badgeColor: '#38bdf8'
                        });
                    }
                });

                // Listen to new followers
                channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_follows' }, payload => {
                    const row = payload.new;
                    const myUserId = localStorage.getItem('userId');
                    const myUsername = (localStorage.getItem('username') || '').toLowerCase().replace(/^@/, '');
                    if (row) {
                        const isForMe = (myUserId && String(row.following_id) === String(myUserId)) ||
                                        (myUsername && (row.following_id === myUsername || row.creator_username?.toLowerCase().replace(/^@/, '') === myUsername));
                        if (isForMe && (!myUserId || String(row.follower_id) !== String(myUserId))) {
                            this.addNotification({
                                id: `follow_${row.id || row.follower_id}_${Date.now()}`,
                                type: 'follow',
                                title: 'New Follower',
                                message: 'started following your creations and simulations.',
                                actor: { id: row.follower_id || '', username: row.follower_username || 'Creator' },
                                link: `/views/profile.html?user_id=${encodeURIComponent(row.follower_id || '')}&username=${encodeURIComponent(row.follower_username || '')}`,
                                badgeIcon: 'ri-user-add-fill',
                                badgeColor: '#6366f1'
                            });
                        }
                    }
                });

                channel.subscribe();
            } catch (e) {
                console.warn('[NotificationManager] Could not start realtime notifications:', e);
            }
        }

        addNotification(item) {
            const newNotif = {
                id: item.id || ('notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
                type: item.type || 'system',
                title: item.title || 'New Activity',
                message: item.message || '',
                actor: item.actor || { id: '', username: 'Creator', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop' },
                link: item.link || '/views/explore.html',
                time: 'Just now',
                timestamp: Date.now(),
                read: false,
                badgeIcon: item.badgeIcon || 'ri-sparkling-fill',
                badgeColor: item.badgeColor || '#3b82f6'
            };

            // Remove existing with same id if any
            this.notifications = this.notifications.filter(n => n.id !== newNotif.id);
            this.notifications.unshift(newNotif);
            this.saveNotifications();
            this.updateBadge();
            if (this.isOpen) {
                this.renderList();
            }
        }

        markAsRead(id) {
            const notif = this.notifications.find(n => n.id === id);
            if (notif) {
                notif.read = true;
                const readIds = this.getReadIds();
                readIds.add(id);
                this.saveReadIds(readIds);
                this.saveNotifications();
                this.updateBadge();
                this.renderList();
            }
        }

        markAllAsRead() {
            const readIds = this.getReadIds();
            this.notifications.forEach(n => {
                n.read = true;
                readIds.add(n.id);
            });
            this.saveReadIds(readIds);
            this.saveNotifications();
            this.updateBadge();
            this.renderList();
        }

        injectDrawer() {
            if (document.getElementById('notificationDrawerOverlay')) return;

            const drawerHTML = `
                <div id="notificationDrawerOverlay" class="notification-drawer-overlay">
                    <div id="notificationDrawer" class="notification-drawer glass-panel">
                        <!-- Drawer Header -->
                        <div class="notif-drawer-header">
                            <div class="notif-header-title">
                                <i class="ri-sparkling-fill" style="color: #60a5fa; font-size: 1.25rem;"></i>
                                <span>Activity & Sparks</span>
                            </div>
                            <div class="notif-header-actions">
                                <button id="notifMarkAllReadBtn" class="notif-btn-text" title="Mark all as read">
                                    <i class="ri-check-double-line"></i> Mark all read
                                </button>
                                <button id="notifCloseDrawerBtn" class="notif-btn-icon" title="Close">
                                    <i class="ri-close-line"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Filter Tabs -->
                        <div class="notif-filter-tabs">
                            <button class="notif-tab active" data-filter="all">All</button>
                            <button class="notif-tab" data-filter="remix"><i class="ri-repeat-2-fill"></i> Remixes</button>
                            <button class="notif-tab" data-filter="comment"><i class="ri-chat-3-fill"></i> Comments</button>
                            <button class="notif-tab" data-filter="store"><i class="ri-shopping-bag-3-fill"></i> Store</button>
                        </div>

                        <!-- Notification List -->
                        <div id="notificationList" class="notif-list">
                            <!-- Items populated dynamically -->
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', drawerHTML);
        }

        bindEvents() {
            const overlay = document.getElementById('notificationDrawerOverlay');
            const closeBtn = document.getElementById('notifCloseDrawerBtn');
            const markAllBtn = document.getElementById('notifMarkAllReadBtn');

            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.close());
            }

            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) this.close();
                });
            }

            if (markAllBtn) {
                markAllBtn.addEventListener('click', () => this.markAllAsRead());
            }

            // Filter Tabs
            const tabs = document.querySelectorAll('.notif-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.activeFilter = tab.dataset.filter || 'all';
                    this.renderList();
                });
            });

            // Delegate notification click events & direct profile navigation
            const listEl = document.getElementById('notificationList');
            if (listEl) {
                listEl.addEventListener('click', (e) => {
                    // Check if clicked on user profile trigger (avatar or username)
                    const profileTrigger = e.target.closest('.notif-user-profile-trigger');
                    if (profileTrigger) {
                        e.preventDefault();
                        e.stopPropagation();
                        const uid = profileTrigger.dataset.userId || '';
                        const uname = profileTrigger.dataset.username || '';
                        this.close();

                        let targetUrl = '/views/profile.html';
                        if (uid) {
                            targetUrl += `?user_id=${encodeURIComponent(uid)}`;
                            if (uname) targetUrl += `&username=${encodeURIComponent(uname)}`;
                        } else if (uname) {
                            targetUrl += `?username=${encodeURIComponent(uname)}`;
                        }
                        window.location.href = targetUrl;
                        return;
                    }

                    // Otherwise navigate to the post link
                    const itemEl = e.target.closest('.notif-item');
                    if (!itemEl) return;
                    const id = itemEl.dataset.id;
                    const link = itemEl.dataset.link;
                    this.markAsRead(id);
                    if (link && link !== '#') {
                        this.close();
                        window.location.href = link;
                    }
                });
            }

            // Escape key closes drawer
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });
        }

        open() {
            const overlay = document.getElementById('notificationDrawerOverlay');
            if (!overlay) return;
            this.isOpen = true;
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            this.renderList();

            // Refresh live notifications in background
            this.fetchRealNotifications();

            // Mark visible unread items as read
            setTimeout(() => {
                this.markAllAsRead();
            }, 800);
        }

        close() {
            const overlay = document.getElementById('notificationDrawerOverlay');
            if (!overlay) return;
            this.isOpen = false;
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        renderList() {
            const listEl = document.getElementById('notificationList');
            if (!listEl) return;

            let filtered = this.notifications;
            if (this.activeFilter !== 'all') {
                filtered = this.notifications.filter(n => n.type === this.activeFilter);
            }

            if (filtered.length === 0) {
                listEl.innerHTML = `
                    <div class="notif-empty-state">
                        <div class="notif-empty-icon"><i class="ri-sparkling-line"></i></div>
                        <h4>All caught up!</h4>
                        <p>No activity in this category right now. Your real remixes, likes, comments, and store updates will appear here.</p>
                    </div>
                `;
                return;
            }

            listEl.innerHTML = filtered.map(item => {
                const unreadClass = item.read ? '' : 'unread';
                const badgeIcon = item.badgeIcon || 'ri-sparkling-fill';
                const badgeColor = item.badgeColor || '#3b82f6';
                const actorName = item.actor?.username || 'Creator';
                const actorId = item.actor?.id || '';
                const actorAvatar = item.actor?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(actorName)}`;

                return `
                    <div class="notif-item ${unreadClass}" data-id="${item.id}" data-link="${item.link || '#'}">
                        <div class="notif-avatar-box notif-user-profile-trigger" data-user-id="${actorId}" data-username="${actorName}" title="View @${actorName}'s profile">
                            <img src="${actorAvatar}" alt="${actorName}" class="notif-avatar" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(actorName)}'">
                            <span class="notif-badge-pill" style="background: ${badgeColor};">
                                <i class="${badgeIcon}"></i>
                            </span>
                        </div>
                        <div class="notif-content">
                            <div class="notif-text">
                                <span class="notif-username notif-user-profile-trigger" data-user-id="${actorId}" data-username="${actorName}" title="View @${actorName}'s profile">@${actorName}</span>
                                <span class="notif-message">${item.message}</span>
                            </div>
                            <div class="notif-time">${item.time || 'Recent'}</div>
                        </div>
                        ${!item.read ? '<span class="notif-item-dot"></span>' : ''}
                    </div>
                `;
            }).join('');
        }
    }

    // Export singleton instance
    window.NotificationManager = new XtraNotificationManager();

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.NotificationManager.init();
        });
    } else {
        window.NotificationManager.init();
    }
})();
