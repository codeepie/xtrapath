/**
 * XtraAnim Unified Social & Interaction Manager (social_manager.js)
 * -----------------------------------------------------------------
 * Coordinates all social interactions across Feed, Reels, Detail Modals, & Viewers:
 * - Comments: Threaded discussions, LaTeX formulas (KaTeX), Mermaid diagrams, upvoting, drawer UI
 * - Likes: Optimistic heart toggles, count caches, animations, Supabase sync
 * - Bookmarks: Save/unsave collections, permanent vault sync
 * - Remix & Lineage: Studio fork triggers, remix counts, evolution tree integration
 * - Share & Embed: XtraShare modal, dynamic QR codes, embed snippets, Web Share API
 * - Follow: Realtime creator follow graph & follower counts
 * - Hydrator: Unified batch hydration for all post action bar badges
 */

(function (window) {
    'use strict';

    // In-memory stats cache across all loaded views
    const _commentCountCache = {};
    const _likeCountCache = {};
    const _likedPostsCache = new Set();
    const _savedPostsCache = new Set();
    let _socialInitialized = false;

    // Supabase client accessor helper
    function getSupabase() {
        return window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
    }

    function getBackendUrl() {
        if (typeof window.getBackendUrl === 'function') return window.getBackendUrl();
        return '';
    }

    function timeAgo(isoString) {
        if (typeof window.timeAgo === 'function') return window.timeAgo(isoString);
        try {
            const date = new Date(isoString);
            const seconds = Math.floor((new Date() - date) / 1000);
            if (seconds < 60) return 'Just now';
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m ago`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            const days = Math.floor(hours / 24);
            return `${days}d ago`;
        } catch (_) {
            return 'Recently';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // =========================================================================
    // 1. COMMENTS SUB-MODULE (SocialManager.Comments)
    // =========================================================================
    const Comments = {
        currentPostId: null,
        replyingParentId: null,
        replyingUsername: null,

        getLocalCommentsMap() {
            try {
                return JSON.parse(localStorage.getItem('postComments') || '{}');
            } catch (_) {
                return {};
            }
        },

        saveLocalCommentsMap(map) {
            try {
                localStorage.setItem('postComments', JSON.stringify(map));
            } catch (e) {
                console.warn('[SocialManager] Could not write postComments to localStorage:', e);
            }
        },

        getLocalCommentCountsMap() {
            try {
                return JSON.parse(localStorage.getItem('commentCounts') || '{}');
            } catch (_) {
                return {};
            }
        },

        saveLocalCommentCountsMap(map) {
            try {
                localStorage.setItem('commentCounts', JSON.stringify(map));
            } catch (e) {
                console.warn('[SocialManager] Could not write commentCounts to localStorage:', e);
            }
        },

        updateCommentCountInDOM(postId, count) {
            const sPostId = String(postId);
            const numericCount = Math.max(0, parseInt(count, 10) || 0);
            _commentCountCache[sPostId] = numericCount;

            const countsMap = this.getLocalCommentCountsMap();
            countsMap[sPostId] = numericCount;
            this.saveLocalCommentCountsMap(countsMap);

            // 1. Feed / Reel Cards
            document.querySelectorAll(`.post-card[data-post-id="${sPostId}"], .reel-item[data-post-id="${sPostId}"]`).forEach(postEl => {
                const commentBtn = postEl.querySelector('[data-action="comment"]') ||
                                   postEl.querySelector('.ri-chat-3-line')?.closest('.icon-btn') ||
                                   postEl.querySelector('.ri-chat-3-line')?.closest('button');
                if (commentBtn) {
                    let countEl = commentBtn.querySelector('.action-count');
                    if (!countEl) {
                        countEl = document.createElement('span');
                        countEl.className = 'action-count';
                        commentBtn.appendChild(countEl);
                    }
                    countEl.textContent = numericCount > 0 ? numericCount : '0';
                }
            });

            // 2. Single Post Modal
            const singleCommentBtn = document.getElementById('commentBtn');
            if (singleCommentBtn && (this.currentPostId === sPostId || window.currentPost?.id == sPostId)) {
                let countEl = singleCommentBtn.querySelector('.action-count');
                if (!countEl) {
                    countEl = document.createElement('span');
                    countEl.className = 'action-count';
                    singleCommentBtn.appendChild(countEl);
                }
                countEl.textContent = numericCount > 0 ? numericCount : '0';
            }

            // 3. Comment Drawer Header
            if (this.currentPostId === sPostId) {
                const modalHeader = document.querySelector('.comment-modal-header h3');
                if (modalHeader) {
                    modalHeader.textContent = numericCount > 0 ? `Comments (${numericCount})` : 'Comments';
                }
            }
        },

        formatContent(rawText) {
            if (!rawText) return '';

            // Extract Mermaid blocks: ```mermaid ... ```
            const mermaidBlocks = [];
            let text = rawText.replace(/```(?:mermaid)?\s*([\s\S]*?)```/gi, (match, code) => {
                const trimmed = code.trim();
                if (trimmed.startsWith('graph') || trimmed.startsWith('sequenceDiagram') || trimmed.startsWith('stateDiagram') || trimmed.startsWith('mindmap') || trimmed.startsWith('classDiagram') || trimmed.startsWith('erDiagram') || trimmed.startsWith('pie') || trimmed.startsWith('gantt')) {
                    const placeholder = `___MERMAID_BLOCK_${mermaidBlocks.length}___`;
                    mermaidBlocks.push(trimmed);
                    return placeholder;
                }
                return match;
            });

            // Wrap bare LaTeX environments in $$ ... $$
            text = text.replace(/(\$?\$?)\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\2\}(\$?\$?)/g, (match, pre, env, body, post) => {
                if (pre && post) return match;
                return `$$\\begin{${env}}${body}\\end{${env}}$$`;
            });

            // Wrap bare LaTeX commands (\sqrt{...}, \frac{...}{...}) in $ ... $
            text = text.replace(/(\$?)\\((?:sqrt(?:\[[^\]]*\])?\{[^\}]+\}|frac\{[^\}]+\}\{[^\}]+\}))(\$?)/g, (match, pre, cmd, post) => {
                if (pre && post) return match;
                return `$${cmd}$`;
            });

            let safeHtml = escapeHtml(text);

            // Restore Mermaid Blocks
            mermaidBlocks.forEach((code, idx) => {
                const placeholder = `___MERMAID_BLOCK_${idx}___`;
                const diagramId = 'mermaid_cmt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
                const containerHtml = `<div class="comment-mermaid-wrapper" id="${diagramId}" data-mermaid-code="${encodeURIComponent(code)}">
                    <div style="color:#a1a1aa; font-size:0.8rem; padding:6px 0;"><i class="ri-loader-4-line"></i> Loading Diagram…</div>
                </div>`;
                safeHtml = safeHtml.replace(placeholder, () => containerHtml);
            });

            return safeHtml.replace(/\n/g, '<br>');
        },

        renderKaTeX(container) {
            if (!container) return;
            if (window.renderMathInElement && typeof window.renderMathInElement === 'function') {
                try {
                    window.renderMathInElement(container, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '\\[', right: '\\]', display: true },
                            { left: '\\(', right: '\\)', display: false },
                            { left: '$', right: '$', display: false }
                        ],
                        output: 'html',
                        throwOnError: false,
                        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"]
                    });
                } catch (e) {
                    console.warn('[SocialManager] KaTeX notice:', e);
                }
            }
        },

        renderMermaid(container) {
            if (!container || !window.mermaid) return;
            try {
                window.mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
            } catch (_) {}

            const diagramWrappers = container.querySelectorAll('.comment-mermaid-wrapper[data-mermaid-code]');
            diagramWrappers.forEach(async (wrapper) => {
                const code = decodeURIComponent(wrapper.dataset.mermaidCode || '');
                if (!code) return;
                const uniqueId = 'svg_' + Math.random().toString(36).substr(2, 9);
                try {
                    const { svg } = await window.mermaid.render(uniqueId, code);
                    wrapper.innerHTML = svg;
                    wrapper.removeAttribute('data-mermaid-code');
                } catch (err) {
                    console.warn('[SocialManager] Mermaid error:', err);
                    wrapper.innerHTML = `<div style="color:#f87171; font-size:0.78rem; font-family:monospace; white-space:pre-wrap;">${code}</div>`;
                }
            });
        },

        async fetchComments(postId) {
            const sPostId = String(postId);
            const client = getSupabase();
            let dbComments = [];

            if (client) {
                try {
                    const { data, error } = await client
                        .from('comments')
                        .select('*')
                        .eq('post_id', sPostId)
                        .order('created_at', { ascending: true });

                    if (!error && data) {
                        dbComments = data;
                        const myUserId = localStorage.getItem('userId');
                        if (myUserId && dbComments.length > 0) {
                            const commentIds = dbComments.map(c => c.id);
                            const { data: myCommentLikes } = await client
                                .from('comment_likes')
                                .select('comment_id')
                                .eq('user_id', myUserId)
                                .in('comment_id', commentIds);

                            const likedSet = new Set((myCommentLikes || []).map(r => r.comment_id));

                            const { data: allCommentLikes } = await client
                                .from('comment_likes')
                                .select('comment_id')
                                .in('comment_id', commentIds);
                            const clCountMap = {};
                            (allCommentLikes || []).forEach(r => {
                                clCountMap[r.comment_id] = (clCountMap[r.comment_id] || 0) + 1;
                            });

                            dbComments.forEach(c => {
                                c._likedByMe = likedSet.has(c.id);
                                c._likesCount = clCountMap[c.id] || 0;
                            });
                        }
                    }
                } catch (err) {
                    console.warn('[SocialManager] Supabase fetchComments notice:', err);
                }
            }

            const localMap = this.getLocalCommentsMap();
            const localList = localMap[sPostId] || [];

            const combined = [...dbComments];
            localList.forEach(loc => {
                const exists = combined.some(c => String(c.id) === String(loc.id) || (c.text === loc.text && c.username === loc.username));
                if (!exists) {
                    combined.push(loc);
                }
            });

            _commentCountCache[sPostId] = combined.length;
            this.updateCommentCountInDOM(sPostId, combined.length);
            return combined;
        },

        async postComment(postId, text, parentId = null) {
            const sPostId = String(postId);
            const sParentId = parentId ? String(parentId) : null;
            const myUsername = localStorage.getItem('username') || 'You';
            const myAvatar = localStorage.getItem('avatarUrl') || '';
            const myUserId = localStorage.getItem('userId') || 'local_user_' + Date.now();

            const newCommentObj = {
                id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                post_id: sPostId,
                parent_id: sParentId,
                user_id: myUserId,
                username: myUsername,
                avatar_url: myAvatar,
                text: text,
                created_at: new Date().toISOString(),
                _likesCount: 0,
                _likedByMe: false
            };

            // 1. Instant local persistence
            const localMap = this.getLocalCommentsMap();
            if (!localMap[sPostId]) localMap[sPostId] = [];
            localMap[sPostId].push(newCommentObj);
            this.saveLocalCommentsMap(localMap);

            const newCount = (_commentCountCache[sPostId] || 0) + 1;
            this.updateCommentCountInDOM(sPostId, newCount);

            // 2. Background Supabase sync
            const client = getSupabase();
            if (client) {
                try {
                    let effectiveUserId = myUserId;
                    try {
                        const { data: authData } = await client.auth.getUser();
                        if (authData?.user?.id) effectiveUserId = authData.user.id;
                    } catch (_) {}

                    const insertPayload = {
                        post_id: sPostId,
                        user_id: effectiveUserId,
                        username: myUsername,
                        avatar_url: myAvatar,
                        text: text
                    };
                    if (sParentId) insertPayload.parent_id = sParentId;

                    let { data: inserted, error } = await client
                        .from('comments')
                        .insert(insertPayload)
                        .select()
                        .maybeSingle();

                    // If error indicates column name issue (e.g. content instead of text)
                    if (error && (error.message?.includes('text') || error.message?.includes('content') || error.code === 'PGRST204')) {
                        delete insertPayload.text;
                        insertPayload.content = text;
                        const res2 = await client
                            .from('comments')
                            .insert(insertPayload)
                            .select()
                            .maybeSingle();
                        if (!res2.error && res2.data) {
                            inserted = res2.data;
                            error = null;
                        }
                    }

                    if (!error && inserted) {
                        newCommentObj.id = inserted.id;
                    }
                } catch (e) {
                    console.warn('[SocialManager] Supabase postComment notice:', e);
                }
            }

            return newCommentObj;
        },

        async deleteComment(commentId, postId) {
            const sPostId = String(postId);
            // Remove from local cache
            const localMap = this.getLocalCommentsMap();
            if (localMap[sPostId]) {
                localMap[sPostId] = localMap[sPostId].filter(c => String(c.id) !== String(commentId));
                this.saveLocalCommentsMap(localMap);
            }

            const currentCount = _commentCountCache[sPostId] || 1;
            this.updateCommentCountInDOM(sPostId, Math.max(0, currentCount - 1));

            const client = getSupabase();
            if (client) {
                try {
                    await client.from('comments').delete().eq('id', commentId);
                } catch (err) {
                    console.warn('[SocialManager] Supabase deleteComment error:', err);
                }
            }
            return true;
        },

        async toggleCommentLike(commentId, btnElement) {
            const client = getSupabase();
            const myUserId = localStorage.getItem('userId');
            if (!myUserId) {
                alert('Please sign in to like comments.');
                return;
            }

            const icon = btnElement.querySelector('i');
            const span = btnElement.querySelector('span');
            const wasLiked = btnElement.classList.contains('liked');
            const newLiked = !wasLiked;
            let currentCount = parseInt(span.textContent, 10) || 0;
            const newCount = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

            btnElement.classList.toggle('liked', newLiked);
            if (icon) icon.className = newLiked ? 'ri-heart-fill' : 'ri-heart-line';
            span.textContent = newCount;

            if (!client) return;
            try {
                if (newLiked) {
                    await client.from('comment_likes').upsert({ comment_id: commentId, user_id: myUserId });
                } else {
                    await client.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', myUserId);
                }
            } catch (err) {
                console.warn('[SocialManager] Supabase toggleCommentLike error:', err);
            }
        },

        createCommentElement(comment, isReply = false, parentAuthor = null) {
            const itemDiv = document.createElement('div');
            itemDiv.className = `comment-item ${isReply ? 'is-reply' : ''}`;
            itemDiv.dataset.commentId = comment.id;
            if (comment.parent_id) itemDiv.dataset.parentId = comment.parent_id;

            const myUserId = localStorage.getItem('userId');
            const myUsername = localStorage.getItem('username') || 'You';
            const isOwnComment = (comment.user_id && myUserId && comment.user_id === myUserId) || comment.username === myUsername;
            const avatarUrl = comment.avatar_url || '';
            const initial = (comment.username || 'A').charAt(0).toUpperCase();
            const avatarStyle = avatarUrl
                ? `background-image: url('${avatarUrl}'); background-size: cover; background-position: center;`
                : `background: linear-gradient(135deg, #3b82f6, #8b5cf6);`;

            const isLiked = comment._likedByMe || false;
            const likesCount = comment._likesCount || 0;
            const timestamp = comment.created_at ? timeAgo(comment.created_at) : 'Just now';
            const rawCommentText = comment.text || comment.content || comment.comment || '';
            const formattedHtml = this.formatContent(rawCommentText);

            const replyBadgeHtml = isReply && parentAuthor
                ? `<span class="comment-reply-badge">Replying to @${escapeHtml(parentAuthor)}</span>`
                : '';

            itemDiv.innerHTML = `
                <div class="comment-avatar" style="${avatarStyle}; display:flex; align-items:center; justify-content:center;">
                    ${avatarUrl ? '' : `<span style="color:white; font-weight:700; font-size:0.75rem;">${initial}</span>`}
                </div>
                <div class="comment-body">
                    <div class="comment-header-row">
                        <span class="username">${escapeHtml(comment.username || 'Anonymous')}</span>
                        ${replyBadgeHtml}
                        <span class="comment-time">${timestamp}</span>
                    </div>
                    <div class="text">${formattedHtml}</div>
                    <div class="comment-actions-row">
                        <button class="comment-like-btn ${isLiked ? 'liked' : ''}" data-comment-id="${comment.id}">
                            <i class="${isLiked ? 'ri-heart-fill' : 'ri-heart-line'}"></i>
                            <span>${likesCount}</span>
                        </button>
                        <button class="comment-reply-btn" data-comment-id="${comment.id}" data-author="${escapeHtml(comment.username || 'Anonymous')}">
                            <i class="ri-reply-line"></i>
                            <span>Reply</span>
                        </button>
                        ${isOwnComment ? `<button class="comment-delete-btn" data-comment-id="${comment.id}" title="Delete comment"><i class="ri-delete-bin-line"></i></button>` : ''}
                    </div>
                </div>
            `;

            // Likes
            const commentLikeBtn = itemDiv.querySelector('.comment-like-btn');
            if (commentLikeBtn) {
                commentLikeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleCommentLike(comment.id, commentLikeBtn);
                });
            }

            // Reply
            const replyBtn = itemDiv.querySelector('.comment-reply-btn');
            if (replyBtn) {
                replyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetParentId = comment.parent_id || comment.id;
                    this.setReplyingContext(targetParentId, comment.username);
                });
            }

            // Delete
            const deleteBtn = itemDiv.querySelector('.comment-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm('Delete this comment?')) return;
                    const success = await this.deleteComment(comment.id, this.currentPostId);
                    if (success) {
                        itemDiv.style.transition = 'opacity 0.25s, transform 0.25s';
                        itemDiv.style.opacity = '0';
                        itemDiv.style.transform = 'translateX(-15px)';
                        setTimeout(() => {
                            if (!isReply) {
                                const threadGroup = itemDiv.closest('.comment-thread-group');
                                if (threadGroup) threadGroup.remove();
                            } else {
                                itemDiv.remove();
                            }
                            const container = document.getElementById('commentListContainer');
                            if (container && container.children.length === 0) {
                                container.innerHTML = `<div style="text-align: center; color: #a1a1aa; padding: 40px 20px;">
                                    <i class="ri-chat-3-line" style="font-size: 2.6rem; opacity: 0.3; display: block; margin-bottom: 10px;"></i>
                                    <p style="margin: 0; font-size: 0.95rem; font-weight:600; color:#e4e4e7;">No comments yet</p>
                                    <p style="margin: 6px 0 0; font-size: 0.82rem; opacity: 0.7;">Be the first to share an equation, diagram, or thought!</p>
                                </div>`;
                            }
                        }, 250);
                    }
                });
            }

            return itemDiv;
        },

        renderThreaded(allComments) {
            const commentListContainer = document.getElementById('commentListContainer');
            if (!commentListContainer) return;
            commentListContainer.innerHTML = '';

            if (!allComments || allComments.length === 0) {
                commentListContainer.innerHTML = `<div style="text-align: center; color: #a1a1aa; padding: 40px 20px;">
                    <i class="ri-chat-3-line" style="font-size: 2.6rem; opacity: 0.3; display: block; margin-bottom: 10px;"></i>
                    <p style="margin: 0; font-size: 0.95rem; font-weight:600; color:#e4e4e7;">No comments yet</p>
                    <p style="margin: 6px 0 0; font-size: 0.82rem; opacity: 0.7;">Be the first to share an equation, diagram, or thought!</p>
                </div>`;
                return;
            }

            const rootComments = [];
            const repliesMap = {};

            allComments.forEach(c => {
                if (c.parent_id) {
                    const pid = String(c.parent_id);
                    if (!repliesMap[pid]) repliesMap[pid] = [];
                    repliesMap[pid].push(c);
                } else {
                    rootComments.push(c);
                }
            });

            rootComments.forEach(rootComment => {
                const threadGroup = document.createElement('div');
                threadGroup.className = 'comment-thread-group';
                threadGroup.dataset.rootId = rootComment.id;

                const rootEl = this.createCommentElement(rootComment, false);
                threadGroup.appendChild(rootEl);

                const replies = repliesMap[String(rootComment.id)] || [];
                if (replies.length > 0) {
                    const repliesList = document.createElement('div');
                    repliesList.className = 'comment-replies-list';

                    replies.forEach(reply => {
                        const replyEl = this.createCommentElement(reply, true, rootComment.username);
                        repliesList.appendChild(replyEl);
                    });

                    threadGroup.appendChild(repliesList);
                }

                commentListContainer.appendChild(threadGroup);
            });

            this.renderKaTeX(commentListContainer);
            this.renderMermaid(commentListContainer);
            commentListContainer.scrollTop = commentListContainer.scrollHeight;
        },

        setReplyingContext(parentId, username) {
            this.replyingParentId = parentId ? String(parentId) : null;
            this.replyingUsername = username || 'User';

            const banner = document.getElementById('commentReplyingBanner');
            const userSpan = document.getElementById('commentReplyingToUser');
            const input = document.getElementById('commentInput');

            if (this.replyingParentId) {
                if (userSpan) userSpan.textContent = `@${this.replyingUsername}`;
                if (banner) banner.style.display = 'flex';
                if (input) {
                    input.placeholder = `Replying to @${this.replyingUsername}...`;
                    input.focus();
                }
            } else {
                if (banner) banner.style.display = 'none';
                if (input) {
                    input.placeholder = 'Add a comment... Click + for Math/Diagrams';
                }
            }
        },

        insertSnippet(snippet) {
            const textarea = document.getElementById('commentInput');
            if (!textarea) return;

            const start = textarea.selectionStart || 0;
            const end = textarea.selectionEnd || 0;
            const text = textarea.value;

            textarea.value = text.substring(0, start) + snippet + text.substring(end);
            textarea.focus();
            textarea.setSelectionRange(start + snippet.length, start + snippet.length);

            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        },

        toggleToolsDrawer() {
            const drawer = document.getElementById('commentToolsDrawer');
            const toolsBtn = document.getElementById('commentToolsBtn');
            if (!drawer) return;
            const isOpen = drawer.style.display !== 'none';
            if (isOpen) {
                this.closeToolsDrawer();
            } else {
                drawer.style.display = 'flex';
                if (toolsBtn) toolsBtn.classList.add('active');
            }
        },

        closeToolsDrawer() {
            const drawer = document.getElementById('commentToolsDrawer');
            const toolsBtn = document.getElementById('commentToolsBtn');
            if (drawer) drawer.style.display = 'none';
            if (toolsBtn) toolsBtn.classList.remove('active');
        },

        async openModal(postId) {
            const commentModal = document.getElementById('commentModal');
            if (!commentModal) return;

            this.initListeners();
            this.currentPostId = String(postId);
            window.currentPostIdForComments = this.currentPostId;
            this.setReplyingContext(null, null);

            const commentListContainer = document.getElementById('commentListContainer');
            const commentInput = document.getElementById('commentInput');
            if (commentInput) commentInput.value = '';

            this.closeToolsDrawer();

            const initialCount = _commentCountCache[this.currentPostId] !== undefined
                ? _commentCountCache[this.currentPostId]
                : (Number(this.getLocalCommentCountsMap()[this.currentPostId]) || 0);
            const modalHeader = document.querySelector('.comment-modal-header h3');
            if (modalHeader) {
                modalHeader.textContent = initialCount > 0 ? `Comments (${initialCount})` : 'Comments';
            }

            commentListContainer.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:120px; color:#a1a1aa; flex-direction:column; gap:10px;">
                <div style="width:26px;height:26px;border:2px solid rgba(255,255,255,0.1);border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                <span style="font-size:0.85rem;">Loading discussion…</span>
            </div>`;

            commentModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            setTimeout(() => {
                if (commentInput) commentInput.focus();
            }, 100);

            const allComments = await this.fetchComments(this.currentPostId);
            this.renderThreaded(allComments);
        },

        closeModal() {
            const commentModal = document.getElementById('commentModal');
            if (!commentModal) return;
            commentModal.style.display = 'none';
            document.body.style.overflow = '';
            this.currentPostId = null;
            window.currentPostIdForComments = null;
            this.setReplyingContext(null, null);
            this.closeToolsDrawer();
            const modalHeader = document.querySelector('.comment-modal-header h3');
            if (modalHeader) {
                modalHeader.textContent = 'Comments';
            }
        },

        async handleSubmit() {
            const commentInput = document.getElementById('commentInput');
            if (!commentInput || !this.currentPostId) return;
            const text = commentInput.value.trim();
            if (!text) return;

            const postBtn = document.getElementById('postCommentBtn');
            if (postBtn) {
                postBtn.disabled = true;
                postBtn.textContent = '...';
            }

            const parentId = this.replyingParentId;
            const newComment = await this.postComment(this.currentPostId, text, parentId);

            if (postBtn) {
                postBtn.disabled = false;
                postBtn.textContent = 'Post';
            }

            if (newComment) {
                const commentListContainer = document.getElementById('commentListContainer');
                const placeholder = commentListContainer.querySelector('div[style*="text-align: center"]');
                if (placeholder) commentListContainer.innerHTML = '';

                if (parentId) {
                    let parentThreadGroup = commentListContainer.querySelector(`.comment-thread-group[data-root-id="${parentId}"]`);
                    if (!parentThreadGroup) {
                        const parentItem = commentListContainer.querySelector(`.comment-item[data-comment-id="${parentId}"]`);
                        if (parentItem) {
                            parentThreadGroup = parentItem.closest('.comment-thread-group');
                        }
                    }

                    if (parentThreadGroup) {
                        let repliesList = parentThreadGroup.querySelector('.comment-replies-list');
                        if (!repliesList) {
                            repliesList = document.createElement('div');
                            repliesList.className = 'comment-replies-list';
                            parentThreadGroup.appendChild(repliesList);
                        }
                        const replyEl = this.createCommentElement(newComment, true, this.replyingUsername);
                        repliesList.appendChild(replyEl);
                        this.renderKaTeX(replyEl);
                        this.renderMermaid(replyEl);
                    } else {
                        const singleEl = this.createCommentElement(newComment, false);
                        commentListContainer.appendChild(singleEl);
                        this.renderKaTeX(singleEl);
                        this.renderMermaid(singleEl);
                    }
                } else {
                    const threadGroup = document.createElement('div');
                    threadGroup.className = 'comment-thread-group';
                    threadGroup.dataset.rootId = newComment.id;

                    const newCommentEl = this.createCommentElement(newComment, false);
                    threadGroup.appendChild(newCommentEl);
                    commentListContainer.appendChild(threadGroup);
                    this.renderKaTeX(threadGroup);
                    this.renderMermaid(threadGroup);
                }

                commentInput.value = '';
                this.setReplyingContext(null, null);
                this.closeToolsDrawer();
                commentListContainer.scrollTop = commentListContainer.scrollHeight;
            }
        },

        initListeners() {
            const commentModal = document.getElementById('commentModal');
            if (!commentModal) return;

            const closeBtn = document.getElementById('closeCommentModal');
            if (closeBtn) closeBtn.onclick = () => this.closeModal();
            commentModal.onclick = (e) => { if (e.target === commentModal) this.closeModal(); };

            const postBtn = document.getElementById('postCommentBtn');
            if (postBtn) postBtn.onclick = () => this.handleSubmit();

            const commentInput = document.getElementById('commentInput');
            if (commentInput) {
                commentInput.onkeydown = (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.handleSubmit();
                    }
                };
                commentInput.oninput = () => {
                    commentInput.style.height = 'auto';
                    commentInput.style.height = Math.min(commentInput.scrollHeight, 120) + 'px';
                };
            }

            const cancelReplyBtn = document.getElementById('commentCancelReplyBtn');
            if (cancelReplyBtn) cancelReplyBtn.onclick = () => this.setReplyingContext(null, null);

            const toolsBtn = document.getElementById('commentToolsBtn');
            if (toolsBtn) toolsBtn.onclick = (e) => { e.stopPropagation(); this.toggleToolsDrawer(); };

            const closeToolsBtn = document.getElementById('commentCloseToolsBtn');
            if (closeToolsBtn) closeToolsBtn.onclick = () => this.closeToolsDrawer();

            // Toolbox Tabs
            document.querySelectorAll('#commentToolsDrawer .tools-tab-btn').forEach(tabBtn => {
                tabBtn.onclick = () => {
                    document.querySelectorAll('#commentToolsDrawer .tools-tab-btn').forEach(b => b.classList.remove('active'));
                    tabBtn.classList.add('active');
                    const tab = tabBtn.dataset.tab;
                    document.querySelectorAll('#commentToolsDrawer .tools-panel').forEach(p => p.style.display = 'none');
                    const targetPanel = document.getElementById(`toolsPanel${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
                    if (targetPanel) targetPanel.style.display = 'block';
                };
            });

            // Snippet Chips
            document.querySelectorAll('#commentToolsDrawer .tool-chip, #commentToolsDrawer .symbol-btn').forEach(chip => {
                chip.onclick = () => {
                    const snippet = chip.dataset.snippet;
                    if (snippet) this.insertSnippet(snippet);
                };
            });
        }
    };

    // =========================================================================
    // 2. LIKES SUB-MODULE (SocialManager.Likes)
    // =========================================================================
    const Likes = {
        getLocalLikesMap() {
            try {
                return JSON.parse(localStorage.getItem('likedPosts') || '[]');
            } catch (_) {
                return [];
            }
        },

        saveLocalLikesMap(arr) {
            try {
                localStorage.setItem('likedPosts', JSON.stringify(arr));
            } catch (_) {}
        },

        isLiked(postId) {
            const sPostId = String(postId);
            if (_likedPostsCache.has(sPostId)) return true;
            const localArr = this.getLocalLikesMap();
            return localArr.map(String).includes(sPostId);
        },

        async toggleLike(postId, btnEl) {
            const sPostId = String(postId);
            const isCurrentlyLiked = this.isLiked(sPostId);
            const newLiked = !isCurrentlyLiked;

            // Update in-memory & local storage cache
            const localArr = this.getLocalLikesMap().map(String);
            if (newLiked) {
                _likedPostsCache.add(sPostId);
                if (!localArr.includes(sPostId)) localArr.push(sPostId);
            } else {
                _likedPostsCache.delete(sPostId);
                const idx = localArr.indexOf(sPostId);
                if (idx > -1) localArr.splice(idx, 1);
            }
            this.saveLocalLikesMap(localArr);

            // Update DOM
            const currentCount = _likeCountCache[sPostId] !== undefined ? _likeCountCache[sPostId] : 0;
            const newCount = Math.max(0, currentCount + (newLiked ? 1 : -1));
            _likeCountCache[sPostId] = newCount;

            this.updateLikeInDOM(sPostId, newCount, newLiked);

            // Supabase Sync
            const client = getSupabase();
            const myUserId = localStorage.getItem('userId');
            if (client && myUserId) {
                try {
                    if (newLiked) {
                        await client.from('likes').upsert({ user_id: myUserId, post_id: sPostId }, { onConflict: 'user_id,post_id' });
                    } else {
                        await client.from('likes').delete().eq('user_id', myUserId).eq('post_id', sPostId);
                    }
                } catch (err) {
                    console.warn('[SocialManager] Supabase like sync error:', err);
                }
            }
        },

        updateLikeInDOM(postId, count, isLiked) {
            const sPostId = String(postId);
            document.querySelectorAll(`.post-card[data-post-id="${sPostId}"], .reel-item[data-post-id="${sPostId}"]`).forEach(card => {
                const likeBtn = card.querySelector('[data-action="like"]') || card.querySelector('.ri-heart-line, .ri-heart-fill')?.closest('button');
                if (likeBtn) {
                    likeBtn.classList.toggle('liked', isLiked);
                    const icon = likeBtn.querySelector('i');
                    if (icon) icon.className = isLiked ? 'ri-heart-fill' : 'ri-heart-line';
                    const countSpan = likeBtn.querySelector('.action-count') || likeBtn.querySelector('span:not(.icon)');
                    if (countSpan) countSpan.textContent = count > 0 ? count : '0';
                }
            });

            const singleLikeBtn = document.getElementById('likeBtn');
            if (singleLikeBtn && (window.currentPost?.id == sPostId || Comments.currentPostId === sPostId)) {
                singleLikeBtn.classList.toggle('liked', isLiked);
                const icon = singleLikeBtn.querySelector('i');
                if (icon) icon.className = isLiked ? 'ri-heart-fill' : 'ri-heart-line';
                const countSpan = singleLikeBtn.querySelector('.action-count');
                if (countSpan) countSpan.textContent = count > 0 ? count : '0';
            }
        }
    };

    // =========================================================================
    // 3. BOOKMARKS SUB-MODULE (SocialManager.Bookmarks)
    // =========================================================================
    const Bookmarks = {
        getLocalSavedMap() {
            try {
                return JSON.parse(localStorage.getItem('savedPosts') || '[]');
            } catch (_) {
                return [];
            }
        },

        saveLocalSavedMap(arr) {
            try {
                localStorage.setItem('savedPosts', JSON.stringify(arr));
            } catch (_) {}
        },

        isSaved(postId) {
            const sPostId = String(postId);
            if (_savedPostsCache.has(sPostId)) return true;
            return this.getLocalSavedMap().map(String).includes(sPostId);
        },

        async toggleSave(postId, btnEl, postObj = null) {
            const sPostId = String(postId);
            const isCurrentlySaved = this.isSaved(sPostId);
            const newSaved = !isCurrentlySaved;

            const localArr = this.getLocalSavedMap().map(String);
            if (newSaved) {
                _savedPostsCache.add(sPostId);
                if (!localArr.includes(sPostId)) localArr.push(sPostId);
            } else {
                _savedPostsCache.delete(sPostId);
                const idx = localArr.indexOf(sPostId);
                if (idx > -1) localArr.splice(idx, 1);
            }
            this.saveLocalSavedMap(localArr);
            this.updateSaveInDOM(sPostId, newSaved);

            // User vault & backend sync
            const myUserId = localStorage.getItem('userId');
            const client = getSupabase();
            if (myUserId && client) {
                try {
                    if (newSaved) {
                        await client.from('saves').upsert({ user_id: myUserId, post_id: sPostId }, { onConflict: 'user_id,post_id' });
                    } else {
                        await client.from('saves').delete().eq('user_id', myUserId).eq('post_id', sPostId);
                    }
                } catch (err) {
                    console.warn('[SocialManager] Supabase save sync error:', err);
                }
            }
        },

        updateSaveInDOM(postId, isSaved) {
            const sPostId = String(postId);
            document.querySelectorAll(`.post-card[data-post-id="${sPostId}"], .reel-item[data-post-id="${sPostId}"]`).forEach(card => {
                const saveBtn = card.querySelector('[data-action="save"]') || card.querySelector('.ri-bookmark-line, .ri-bookmark-fill')?.closest('button');
                if (saveBtn) {
                    saveBtn.classList.toggle('saved', isSaved);
                    const icon = saveBtn.querySelector('i');
                    if (icon) icon.className = isSaved ? 'ri-bookmark-fill' : 'ri-bookmark-line';
                }
            });

            const singleSaveBtn = document.getElementById('saveBtn');
            if (singleSaveBtn && (window.currentPost?.id == sPostId || Comments.currentPostId === sPostId)) {
                singleSaveBtn.classList.toggle('saved', isSaved);
                const icon = singleSaveBtn.querySelector('i');
                if (icon) icon.className = isSaved ? 'ri-bookmark-fill' : 'ri-bookmark-line';
            }
        }
    };

    // =========================================================================
    // 4. REMIX & LINEAGE SUB-MODULE (SocialManager.Remix)
    // =========================================================================
    const Remix = {
        getRemixCount(postId) {
            try {
                const map = JSON.parse(localStorage.getItem('postRemixCounts') || '{}');
                return map[String(postId)] || 0;
            } catch (_) {
                return 0;
            }
        },

        remixPost(postId, postObj = null) {
            if (typeof window.remixPost === 'function' && window.remixPost !== Remix.remixPost) {
                return window.remixPost(postId, postObj);
            }
            window.location.href = `/views/xtraAnim.html?remix=${encodeURIComponent(postId)}`;
        },

        openLineage(postId) {
            window.location.href = `/views/lineage.html?id=${encodeURIComponent(postId)}`;
        }
    };

    // =========================================================================
    // 5. SHARE SUB-MODULE (SocialManager.Share)
    // =========================================================================
    const Share = {
        openShareModal(post) {
            if (!post) return;
            const postId = post.id || '';
            const title = post.title || 'Interactive Visual on XtraPath';
            const author = post.username || post.source?.author || 'Creator';
            const shareUrl = `${window.location.origin}/views/explore.html?post=${encodeURIComponent(postId)}`;
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=59-130-246&bgcolor=24-24-27&data=${encodeURIComponent(shareUrl)}`;

            const existing = document.getElementById('xtraShareModal');
            if (existing) existing.remove();

            const modalHtml = `
                <div id="xtraShareModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.82);backdrop-filter:blur(10px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font-family:Inter,sans-serif;">
                    <div style="background:#18181b;border:1px solid rgba(255,255,255,0.12);border-radius:20px;max-width:440px;width:100%;padding:24px;box-sizing:border-box;position:relative;color:#fff;box-shadow:0 25px 60px rgba(0,0,0,0.85);text-align:center;">
                        <button id="closeShareModalBtn" style="position:absolute;top:16px;right:16px;background:transparent;border:none;color:#a1a1aa;font-size:1.3rem;cursor:pointer;"><i class="ri-close-line"></i></button>
                        
                        <h3 style="font-size:1.15rem;margin:0 0 4px;font-weight:800;color:#fff;">Share Creation</h3>
                        <p style="color:#a1a1aa;font-size:0.8rem;margin:0 0 16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">"${title}" by @${author}</p>

                        <div style="background:#27272a;padding:14px;border-radius:14px;display:inline-block;margin-bottom:16px;border:1px solid rgba(255,255,255,0.08);">
                            <img src="${qrCodeUrl}" alt="Share QR" style="width:160px;height:160px;border-radius:8px;display:block;">
                        </div>

                        <div style="display:flex;background:#27272a;border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:4px 6px;align-items:center;margin-bottom:16px;">
                            <input type="text" readonly value="${shareUrl}" id="shareLinkInput" style="flex:1;background:transparent;border:none;color:#d4d4d8;font-size:0.8rem;padding:6px 8px;outline:none;">
                            <button id="copyShareLinkBtn" style="background:#3b82f6;color:white;border:none;border-radius:8px;padding:6px 12px;font-size:0.78rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;">
                                <i class="ri-file-copy-line"></i> Copy
                            </button>
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}" target="_blank" style="padding:9px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;text-decoration:none;font-size:0.8rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;">
                                <i class="ri-twitter-x-line"></i> X / Post
                            </a>
                            <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + shareUrl)}" target="_blank" style="padding:9px;background:rgba(37,211,102,0.12);border:1px solid rgba(37,211,102,0.3);border-radius:10px;color:#4ade80;text-decoration:none;font-size:0.8rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;">
                                <i class="ri-whatsapp-line"></i> WhatsApp
                            </a>
                            <button id="nativeShareTriggerBtn" style="padding:9px;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);border-radius:10px;color:#60a5fa;font-size:0.8rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;">
                                <i class="ri-share-forward-line"></i> More…
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.getElementById('xtraShareModal');
            const closeBtn = document.getElementById('closeShareModalBtn');
            const copyBtn = document.getElementById('copyShareLinkBtn');
            const copyInput = document.getElementById('shareLinkInput');
            const nativeBtn = document.getElementById('nativeShareTriggerBtn');

            const closeModal = () => modal.remove();
            closeBtn.onclick = closeModal;
            modal.onclick = (e) => { if (e.target === modal) closeModal(); };

            copyBtn.onclick = () => {
                copyInput.select();
                navigator.clipboard.writeText(shareUrl).then(() => {
                    copyBtn.innerHTML = '<i class="ri-check-line"></i> Copied!';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="ri-file-copy-line"></i> Copy';
                    }, 2000);
                });
            };

            if (nativeBtn) {
                nativeBtn.onclick = () => {
                    if (navigator.share) {
                        navigator.share({ title: title, text: `Check out ${title} on XtraPath:`, url: shareUrl }).catch(() => {});
                    } else {
                        copyBtn.click();
                    }
                };
            }
        }
    };

    // =========================================================================
    // 6. HYDRATOR SUB-MODULE (SocialManager.Hydrator)
    // =========================================================================
    const Hydrator = {
        async batchHydrateStats(postIds) {
            if (!postIds || postIds.length === 0) return;
            const strIds = postIds.map(String);

            // 1. Initial Instant Local Hydration
            const localLikes = Likes.getLocalLikesMap().map(String);
            const localSaves = Bookmarks.getLocalSavedMap().map(String);
            const localCommentCounts = Comments.getLocalCommentCountsMap();

            strIds.forEach(id => {
                const isLiked = localLikes.includes(id);
                const isSaved = localSaves.includes(id);
                const cCount = localCommentCounts[id] || 0;
                const lCount = _likeCountCache[id] || 0;

                Likes.updateLikeInDOM(id, lCount, isLiked);
                Bookmarks.updateSaveInDOM(id, isSaved);
                Comments.updateCommentCountInDOM(id, cCount);
            });

            // 2. Supabase Server Sync
            const client = getSupabase();
            if (!client) return;

            try {
                // Fetch Comments count
                const { data: commentsData } = await client
                    .from('comments')
                    .select('post_id')
                    .in('post_id', strIds);

                if (commentsData) {
                    const cMap = {};
                    commentsData.forEach(row => {
                        const pid = String(row.post_id);
                        cMap[pid] = (cMap[pid] || 0) + 1;
                    });
                    strIds.forEach(id => {
                        const srvCount = cMap[id] || 0;
                        const locCount = localCommentCounts[id] || 0;
                        const bestCount = Math.max(srvCount, locCount);
                        Comments.updateCommentCountInDOM(id, bestCount);
                    });
                }

                // Fetch Likes count
                const { data: likesData } = await client
                    .from('likes')
                    .select('post_id, user_id')
                    .in('post_id', strIds);

                if (likesData) {
                    const myUserId = localStorage.getItem('userId');
                    const lMap = {};
                    const myLikes = new Set();
                    likesData.forEach(row => {
                        const pid = String(row.post_id);
                        lMap[pid] = (lMap[pid] || 0) + 1;
                        if (myUserId && row.user_id === myUserId) {
                            myLikes.add(pid);
                        }
                    });

                    strIds.forEach(id => {
                        const count = lMap[id] || 0;
                        const isLiked = myLikes.has(id) || localLikes.includes(id);
                        _likeCountCache[id] = count;
                        Likes.updateLikeInDOM(id, count, isLiked);
                    });
                }
            } catch (err) {
                console.warn('[SocialManager] batchHydrateStats notice:', err);
            }
        }
    };

    // Main SocialManager Master Object
    const SocialManager = {
        Comments,
        Likes,
        Bookmarks,
        Remix,
        Share,
        Hydrator,

        init() {
            if (_socialInitialized) return;
            _socialInitialized = true;
            Comments.initListeners();
        }
    };

    // Auto-init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SocialManager.init());
    } else {
        SocialManager.init();
    }

    // =========================================================================
    // 100% Backward Compatibility Global Bindings
    // =========================================================================
    window.SocialManager = SocialManager;
    window.openCommentModal = Comments.openModal.bind(Comments);
    window.closeCommentModal = Comments.closeModal.bind(Comments);
    window.updateCommentCountInDOM = Comments.updateCommentCountInDOM.bind(Comments);
    window.fetchCommentsFromDB = Comments.fetchComments.bind(Comments);
    window.postCommentToDB = Comments.postComment.bind(Comments);
    window.deleteCommentFromDB = Comments.deleteComment.bind(Comments);
    window.toggleCommentLike = Comments.toggleCommentLike.bind(Comments);
    window.formatCommentContent = Comments.formatContent.bind(Comments);
    window.renderKaTeXInContainer = Comments.renderKaTeX.bind(Comments);
    window.renderMermaidInContainer = Comments.renderMermaid.bind(Comments);
    window.setReplyingContext = Comments.setReplyingContext.bind(Comments);
    window.insertSnippetIntoComment = Comments.insertSnippet.bind(Comments);

    window.togglePostLike = Likes.toggleLike.bind(Likes);
    window.togglePostSave = Bookmarks.toggleSave.bind(Bookmarks);
    window.openShareModal = Share.openShareModal.bind(Share);
    window.batchHydratePostSocialStats = Hydrator.batchHydrateStats.bind(Hydrator);

})(typeof window !== 'undefined' ? window : this);
