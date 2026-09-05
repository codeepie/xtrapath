document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id') || urlParams.get('courseId');

    const heroContainer = document.getElementById('courseGraphHero');
    const threadContainer = document.getElementById('courseThreadContainer');

    if (!courseId) {
        if (heroContainer) {
            heroContainer.innerHTML = `
                <div style="text-align:center; padding:30px 10px; color:#a1a1aa;">
                    <i class="ri-error-warning-line" style="font-size:2.5rem; color:#f87171; margin-bottom:8px;"></i>
                    <h3 style="color:white; margin:0 0 6px;">Course Not Specified</h3>
                    <p style="margin:0 0 16px; font-size:0.9rem;">Please select a course from the Store or Home page.</p>
                    <a href="/views/store.html" class="btn-primary" style="padding:8px 20px; font-size:0.85rem; text-decoration:none; display:inline-block; border-radius:10px;">Browse Store &rarr;</a>
                </div>
            `;
        }
        return;
    }

    // Helper: Supabase Client
    function getClient() {
        return window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
    }

    // Helper: Fetch Post by ID
    async function getPostById(postId) {
        if (!postId) return null;
        const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        let p = localPosts.find(x => String(x.id) === String(postId));
        if (p) {
            if (typeof p.source === 'string') {
                try { p.source = JSON.parse(p.source); } catch (_) {}
            }
            return p;
        }
        const client = getClient();
        if (client) {
            try {
                const { data, error } = await client.from('posts').select('*').eq('id', postId).single();
                if (!error && data) {
                    if (typeof data.source === 'string') {
                        try { data.source = JSON.parse(data.source); } catch (_) {}
                    }
                    return data;
                }
            } catch (e) {
                console.warn("Could not fetch post by ID:", postId, e);
            }
        }
        return null;
    }

    // 1. Fetch the main Course object
    let course = await getPostById(courseId);

    if (!course) {
        if (heroContainer) {
            heroContainer.innerHTML = `
                <div style="text-align:center; padding:30px 10px; color:#a1a1aa;">
                    <i class="ri-search-eye-line" style="font-size:2.5rem; color:#f59e0b; margin-bottom:8px;"></i>
                    <h3 style="color:white; margin:0 0 6px;">Course Not Found</h3>
                    <p style="margin:0 0 16px; font-size:0.9rem;">This course may have been removed or is unavailable.</p>
                    <a href="/views/store.html" class="btn-primary" style="padding:8px 20px; font-size:0.85rem; text-decoration:none; display:inline-block; border-radius:10px;">Return to Store</a>
                </div>
            `;
        }
        return;
    }

    const title = course.title || 'Interactive Masterclass';
    const author = course.username || course.source?.author || 'XtraPath Instructor';
    const price = course.price || course.source?.price || '24.99';
    const isUnlocked = window.isItemUnlocked ? window.isItemUnlocked(course.id) : false;
    const isAssetMode = course.format === 'asset';

    // Update document title and top header title
    document.title = `${title} - Knowledge Graph • XtraPath`;
    const pageHeaderTitle = document.getElementById('pageHeaderTitle');
    if (pageHeaderTitle) {
        pageHeaderTitle.innerHTML = `<i class="${isAssetMode ? 'ri-box-3-line' : 'ri-node-tree'}" style="color: #818cf8;"></i> ${escapeHtml(title)}`;
    }

    // 2. Render Course Hero Header
    if (heroContainer) {
        heroContainer.innerHTML = `
            <div class="hero-top-meta">
                <span class="hero-badge-pill">
                    <i class="${isAssetMode ? 'ri-box-3-line' : 'ri-git-branch-line'}"></i>
                    ${isAssetMode ? 'Asset Pack Graph' : 'Course Knowledge Graph'}
                </span>
                <span style="font-size:0.85rem; color:#a1a1aa;">
                    ${isUnlocked ? '<span style="color:#34d399; font-weight:700;"><i class="ri-checkbox-circle-fill"></i> Enrolled</span>' : `<strong style="color:#ffffff; font-size:1.05rem;">$${price}</strong>`}
                </span>
            </div>
            <h1 class="hero-title">${escapeHtml(title)}</h1>
            <div class="hero-instructor-row">
                <div class="instructor-info">
                    <div class="avatar" style="width:28px; height:28px; background:linear-gradient(135deg,#3b82f6,#8b5cf6); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:0.75rem;">
                        ${author.charAt(0).toUpperCase()}
                    </div>
                    <span>By <strong>${escapeHtml(author)}</strong></span>
                </div>
                <div class="hero-actions">
                    <a href="/views/courseView.html?id=${encodeURIComponent(course.id)}" class="btn-open-course-player">
                        <i class="ri-play-circle-fill"></i> Open Player
                    </a>
                </div>
            </div>
        `;
    }

    // 3. Collect all lessons sequentially into a flat list
    const lessonsList = [];
    const sections = course.source?.sections || [];
    const assetItems = course.source?.assetItems || [];

    if (isAssetMode && assetItems.length > 0) {
        assetItems.forEach((item, aIdx) => {
            lessonsList.push({
                sectionIndex: 0,
                lessonIndex: aIdx,
                assetIndex: aIdx,
                title: item.title || `Asset Item #${aIdx + 1}`,
                contentPostId: item.contentPostId,
                worksheetPostId: item.worksheetPostId,
                interactivePostId: item.interactivePostId
            });
        });
    } else if (sections.length > 0) {
        sections.forEach((sec, sIdx) => {
            const secTitle = sec.title || `Section ${sIdx + 1}`;
            const secLessons = sec.lessons || [];
            secLessons.forEach((les, lIdx) => {
                lessonsList.push({
                    sectionIndex: sIdx,
                    lessonIndex: lIdx,
                    sectionTitle: secTitle,
                    title: les.title || `Lesson ${sIdx + 1}.${lIdx + 1}`,
                    contentPostId: les.contentPostId,
                    worksheetPostId: les.worksheetPostId,
                    interactivePostId: les.interactivePostId
                });
            });
        });
    }

    // Fallback if course has no lessons configured yet
    if (lessonsList.length === 0) {
        if (threadContainer) {
            threadContainer.innerHTML = `
                <div style="text-align:center; padding:40px 10px; color:#a1a1aa; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.12); border-radius:16px;">
                    <i class="ri-node-tree" style="font-size:2.5rem; color:#60a5fa; margin-bottom:8px;"></i>
                    <p style="color:white; font-weight:600; margin:0 0 4px;">Curriculum Map In Progress</p>
                    <p style="font-size:0.85rem; margin:0 0 16px;">The instructor is currently constructing the chapters for this masterclass.</p>
                    <a href="/views/courseView.html?id=${encodeURIComponent(course.id)}" class="btn-open-course-player" style="display:inline-flex;">
                        <i class="ri-play-circle-line"></i> View Course Overview
                    </a>
                </div>
            `;
        }
        return;
    }

    // 4. Prefetch all lesson posts in parallel
    const postIdsToFetch = [];
    lessonsList.forEach(l => {
        if (l.contentPostId) postIdsToFetch.push(l.contentPostId);
        if (l.interactivePostId) postIdsToFetch.push(l.interactivePostId);
        if (l.worksheetPostId) postIdsToFetch.push(l.worksheetPostId);
    });

    const fetchedPostsMap = {};
    if (postIdsToFetch.length > 0) {
        const uniqueIds = Array.from(new Set(postIdsToFetch));
        const promises = uniqueIds.map(async id => {
            const p = await getPostById(id);
            if (p) fetchedPostsMap[String(id)] = p;
        });
        await Promise.all(promises);
    }

    // Helper: Render media preview thumbnail
    function renderChapterMedia(attachedPost) {
        if (!attachedPost) {
            return `<div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:linear-gradient(135deg,#1e1b4b,#090b10); color:#818cf8;">
                <i class="ri-play-circle-line" style="font-size:2.4rem; margin-bottom:4px;"></i>
            </div>`;
        }

        const format = (attachedPost.format || '').toLowerCase();
        const mediaType = (attachedPost.media_type || attachedPost.mediaType || '').toLowerCase();
        const rawUrl = attachedPost.video_url || attachedPost.videoUrl || attachedPost.cover_image || attachedPost.thumbnail_url || attachedPost.pdf_url || '';

        const isVideo = mediaType.startsWith('video') || (rawUrl && (rawUrl.endsWith('.mp4') || rawUrl.endsWith('.webm')));
        const isImage = mediaType.startsWith('image') || (rawUrl && (rawUrl.match(/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i) || rawUrl.startsWith('data:image')));

        if (isVideo && rawUrl) {
            const fullUrl = rawUrl.startsWith('http') || rawUrl.startsWith('/') || rawUrl.startsWith('data:') ? rawUrl : `${getBackendUrl()}${rawUrl}`;
            return `<video src="${fullUrl}" preload="none" muted loop playsinline onmouseover="this.play()" onmouseout="this.pause()"></video>`;
        }

        if (rawUrl) {
            const fullUrl = rawUrl.startsWith('http') || rawUrl.startsWith('/') || rawUrl.startsWith('data:') ? rawUrl : `${getBackendUrl()}${rawUrl}`;
            return `<img src="${fullUrl}" alt="${attachedPost.title || 'Chapter Thumbnail'}" loading="lazy">`;
        }

        if ((attachedPost.source?.engine === 'rough' || attachedPost.format === 'rough') && attachedPost.source?.code && typeof window.renderRough === 'function') {
            const iframe = window.renderRough(attachedPost.source.code, { width: 600, height: 600, background: '#090b10' });
            return `<iframe srcdoc='${iframe.replace(/'/g, "&apos;")}' style="pointer-events:none;"></iframe>`;
        }

        if ((attachedPost.source?.engine === 'anime' || attachedPost.format === 'anime') && attachedPost.source?.code && typeof window.renderAnime === 'function') {
            const iframe = window.renderAnime(attachedPost.source.code, { width: 600, height: 600, background: '#090b10' });
            return `<iframe srcdoc='${iframe.replace(/'/g, "&apos;")}' style="pointer-events:none;"></iframe>`;
        }

        if ((attachedPost.source?.engine === 'two' || attachedPost.format === 'two') && attachedPost.source?.code && typeof window.renderTwo === 'function') {
            const iframe = window.renderTwo(attachedPost.source.code, { width: 600, height: 600, background: '#090b10' });
            return `<iframe srcdoc='${iframe.replace(/'/g, "&apos;")}' style="pointer-events:none;"></iframe>`;
        }

        if (attachedPost.source?.engine === 'zdog' && attachedPost.source?.code && typeof window.renderZdog === 'function') {
            const iframe = window.renderZdog(attachedPost.source.code, { background: '#090b10' });
            return `<iframe srcdoc='${iframe.replace(/'/g, "&apos;")}' style="pointer-events:none;"></iframe>`;
        }

        if (attachedPost.source?.engine === 'jsxgraph' && attachedPost.source?.code && typeof window.renderJSXGraph === 'function') {
            const iframe = window.renderJSXGraph(attachedPost.source.code, { background: '#090b10' });
            return `<iframe srcdoc='${iframe.replace(/'/g, "&apos;")}' style="pointer-events:none;"></iframe>`;
        }

        if (attachedPost.source?.engine === 'katex' && attachedPost.source?.code && typeof window.renderKatex === 'function') {
            const iframe = window.renderKatex(attachedPost.source.code, { fontSize: '1.4em', color: '#ffffff' });
            return `<iframe srcdoc='${iframe.replace(/'/g, "&apos;")}' style="pointer-events:none;"></iframe>`;
        }

        return `<div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:linear-gradient(135deg,#1e1b4b,#090b10); color:#818cf8;">
            <i class="ri-sparkling-fill" style="font-size:2.2rem; margin-bottom:4px;"></i>
        </div>`;
    }

    // 5. Render Lineage-Style Thread Graph
    threadContainer.innerHTML = '';

    lessonsList.forEach((lesson, index) => {
        // First 2 chapters are Free Preview (unless course is fully unlocked, in which case all are unlocked)
        const isFreePreview = (index < 2) || isUnlocked;
        const attachedPost = lesson.contentPostId ? fetchedPostsMap[String(lesson.contentPostId)] :
                             (lesson.interactivePostId ? fetchedPostsMap[String(lesson.interactivePostId)] :
                             (lesson.worksheetPostId ? fetchedPostsMap[String(lesson.worksheetPostId)] : null));

        const chapterNumStr = String(index + 1).padStart(2, '0');
        const mediaPreviewHTML = renderChapterMedia(attachedPost);

        // Format Icon tag (Video, 3D, Worksheet)
        let formatIcon = '<i class="ri-play-circle-line"></i>';
        if (lesson.interactivePostId) formatIcon = '<i class="ri-box-3-line"></i>';
        else if (lesson.worksheetPostId && !lesson.contentPostId) formatIcon = '<i class="ri-file-text-line"></i>';

        const threadItem = document.createElement('div');
        threadItem.className = 'course-thread-item';

        const nodeSymbolHTML = isFreePreview
            ? `<div class="course-thread-node node-unlocked" title="Unlocked Chapter"><i class="ri-lock-unlock-line"></i></div>`
            : `<div class="course-thread-node node-locked" title="Locked Chapter"><i class="ri-lock-2-line"></i></div>`;

        const lockOverlayHTML = isFreePreview ? '' : `
            <div class="chapter-lock-overlay">
                <div class="chapter-lock-icon-circle">
                    <i class="ri-lock-2-fill"></i>
                </div>
                <span class="chapter-lock-text">Enroll to Unlock</span>
            </div>
        `;

        const statusTagHTML = isFreePreview ? `
            <span class="chapter-top-status status-unlocked">
                <i class="ri-lock-unlock-line"></i> Free Preview
            </span>
        ` : '';

        threadItem.innerHTML = `
            <div class="course-thread-node-col">
                ${nodeSymbolHTML}
                <div class="course-thread-line"></div>
            </div>
            <div class="course-thread-card-col">
                <div class="course-chapter-card ${isFreePreview ? 'card-unlocked' : 'card-locked'}" data-lesson-idx="${index}">
                    <div class="chapter-media-wrap">
                        ${mediaPreviewHTML}
                    </div>
                    ${lockOverlayHTML}
                    ${statusTagHTML}
                    <div class="chapter-bottom-pill">
                        <div class="chapter-title-tag">
                            ${chapterNumStr} • ${escapeHtml(lesson.title)}
                        </div>
                        <div class="chapter-format-tag">
                            ${formatIcon}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Click interaction
        const cardEl = threadItem.querySelector('.course-chapter-card');
        if (cardEl) {
            cardEl.addEventListener('click', () => {
                if (isFreePreview) {
                    // Open directly in Course Viewer at this specific lesson
                    const targetUrl = `/views/courseView.html?id=${encodeURIComponent(course.id)}&sec=${lesson.sectionIndex}&les=${lesson.lessonIndex}`;
                    window.location.href = targetUrl;
                } else {
                    // Trigger Checkout Modal for Locked Chapter
                    if (window.openProductCheckoutModal) {
                        window.openProductCheckoutModal({
                            id: course.id,
                            title: course.title,
                            price: price,
                            format: isAssetMode ? 'ASSET' : 'COURSE'
                        }, () => {
                            window.location.reload();
                        });
                    } else {
                        alert(`Enroll in ${title} to unlock this chapter and full masterclass materials.`);
                    }
                }
            });
        }

        threadContainer.appendChild(threadItem);
    });

    // Helper: Escape HTML
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Helper: Backend URL
    function getBackendUrl() {
        return window.backendUrl || '';
    }
});
