document.addEventListener('DOMContentLoaded', () => {
    const lessonContentDisplay = document.getElementById('lessonContentDisplay');
    const lessonViewerTitle = document.getElementById('lessonViewerTitle');
    const lessonSupportingMaterials = document.getElementById('lessonSupportingMaterials');
    const curriculumPanelHeader = document.querySelector('.curriculum-panel-header');
    const curriculumList = document.getElementById('curriculum-list');
    const courseViewTitleHeader = document.getElementById('courseViewTitleHeader');

    let currentCourse = null;
    let activeLesson = { sectionIndex: null, lessonIndex: null };
    let activeContentType = 'content'; // 'content', 'worksheet', 'interactive'

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
            console.warn("Could not init Supabase client in courseView:", e);
        }
        return null;
    }

    async function getPostById(postId) {
        if (!postId) return null;
        const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        let p = allPosts.find(x => String(x.id) === String(postId));
        if (p) return p;
        const client = await getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from('posts').select('*').eq('id', postId).single();
                if (!error && data) return data;
            } catch(e) {}
        }
        return null;
    }

    async function loadCourseDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id');

        if (!courseId) {
            lessonContentDisplay.innerHTML = `<div class="loading-container"><p>No course ID provided.</p></div>`;
            return;
        }

        const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        let coursePost = allPosts.find(p => String(p.id) === String(courseId));

        if (!coursePost) {
            const client = await getSupabase();
            if (client) {
                try {
                    const { data, error } = await client.from('posts').select('*').eq('id', courseId).single();
                    if (!error && data) {
                        coursePost = data;
                    }
                } catch(e) {
                    console.warn("Could not fetch course from Supabase:", e);
                }
            }
        }

        const postFormat = (coursePost?.format || coursePost?.type || (coursePost?.source?.assetItems ? 'asset' : 'course')).toLowerCase();
        if (!coursePost || (!['course', 'asset'].includes(postFormat) && !coursePost.source?.sections && !coursePost.source?.assetItems)) {
            lessonContentDisplay.innerHTML = `<div class="loading-container"><p>Course not found.</p></div>`;
            return;
        }

        document.title = `${coursePost.title} | XtraPath`;
        currentCourse = coursePost;
        const isAssetMode = (currentCourse.format === 'asset');
        courseViewTitleHeader.innerHTML = isAssetMode 
            ? `<i class="ri-box-3-line" style="color:#60a5fa; font-size:1.25rem;"></i> <span style="font-weight:700;">${coursePost.title}</span>`
            : `<i class="ri-graduation-cap-line" style="color:#818cf8; font-size:1.25rem;"></i> <span style="font-weight:700;">${coursePost.title}</span>`;

        // Check ownership
        const authorName = coursePost.username || coursePost.source?.author || localStorage.getItem('username') || 'Creator';
        const authorUserId = coursePost.user_id || '';
        const isOwn = (localStorage.getItem('userId') && String(localStorage.getItem('userId')) === String(authorUserId)) || 
                      (localStorage.getItem('username') && localStorage.getItem('username').toLowerCase() === authorName.toLowerCase());

        // Edit Course Button for Owner
        const editCourseBtn = document.getElementById('editCourseBtn');
        if (editCourseBtn) {
            if (isOwn) {
                editCourseBtn.style.display = 'inline-flex';
                editCourseBtn.onclick = () => {
                    window.location.href = `/views/xtraCourse.html?id=${coursePost.id}&mode=${coursePost.format || 'course'}`;
                };
            } else {
                editCourseBtn.style.display = 'none';
            }
        }

        // Share Course Button
        const shareCourseBtn = document.getElementById('shareCourseBtn');
        if (shareCourseBtn) {
            shareCourseBtn.onclick = () => {
                if (window.XtraShare && currentCourse) {
                    window.XtraShare.open({
                        id: currentCourse.id,
                        title: currentCourse.title || 'Course',
                        desc: currentCourse.description || 'Master this topic with interactive lessons on XtraPath.',
                        author: currentCourse.username || 'Instructor',
                        avatar: currentCourse.avatar_url || '',
                        type: 'course',
                        thumbnail: currentCourse.cover_image || currentCourse.thumbnail_url || '',
                        url: window.location.href,
                        rawPost: currentCourse
                    });
                }
            };
        }

        renderCurriculumPanel(coursePost);

        // Always show the course overview on initial load.
        await renderCourseOverview(coursePost);
    }

    async function renderCourseOverview(course, contentType) {
        if (!course) return;

        // Clear active lesson state when showing overview
        activeLesson = { sectionIndex: null, lessonIndex: null };
        document.querySelectorAll('.curriculum-lesson-item').forEach(item => item.classList.remove('active'));

        const isAssetMode = (course.format === 'asset');
        const coverPost = course.source?.coverPostId ? await getPostById(course.source.coverPostId) : null;
        const introPost = course.source?.introVideoId ? await getPostById(course.source.introVideoId) : null;

        if (lessonViewerTitle) {
            lessonViewerTitle.innerHTML = isAssetMode 
                ? `<i class="ri-box-3-line" style="color:#60a5fa;"></i> ${course.title}`
                : course.title;
        }

        // 1. Determine what to display and which tab should be active.
        let postToDisplay = null;
        let activeType = contentType;

        if (!activeType) {
            if (coverPost) {
                activeType = 'cover';
                postToDisplay = coverPost;
            } else if (introPost) {
                activeType = 'intro';
                postToDisplay = introPost;
            }
        } else {
            if (activeType === 'cover') {
                postToDisplay = coverPost;
            } else if (activeType === 'intro') {
                postToDisplay = introPost;
            }
        }

        // 2. Render tabs based on the final activeType.
        lessonSupportingMaterials.innerHTML = `
            <button class="btn-glass lesson-tab ${activeType === 'cover' ? 'active' : ''}" data-type="cover" ${!coverPost ? 'disabled' : ''}>
                <i class="ri-image-line"></i> ${isAssetMode ? 'Asset Banner' : 'Cover'}
            </button>
            <button class="btn-glass lesson-tab ${activeType === 'intro' ? 'active' : ''}" data-type="intro" ${!introPost ? 'disabled' : ''}>
                <i class="ri-movie-line"></i> ${isAssetMode ? 'Trailer Reel' : 'Introduction'}
            </button>
        `;
        
        lessonSupportingMaterials.querySelectorAll('.lesson-tab').forEach(tab => {
            tab.addEventListener('click', async (e) => {
                await renderCourseOverview(course, e.currentTarget.dataset.type);
            });
        });

        // 3. Render the content.
        if (postToDisplay) {
            const { element: postElement, init: initPost } = window.createPostElement(postToDisplay, 'course-preview');
            lessonContentDisplay.innerHTML = '';
            lessonContentDisplay.appendChild(postElement);
            if (initPost) initPost();
        } else {
            lessonContentDisplay.innerHTML = `
                <div class="loading-container">
                    <i class="${isAssetMode ? 'ri-box-3-line' : 'ri-book-open-line'}" style="font-size: 2.5rem; margin-bottom: 10px; color:#60a5fa;"></i>
                    <p>Welcome to "${course.title}"!</p>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">
                        ${isAssetMode ? 'Select any digital asset from the list to preview and download.' : 'Select a lesson from the curriculum to begin.'}
                    </p>
                </div>
            `;
        }
    }

    function renderCurriculumPanel(course) {
        if (!curriculumList || !curriculumPanelHeader) return;
        const authorName = course.username || course.source?.author || localStorage.getItem('username') || 'Creator';
        const authorUserId = course.user_id || '';
        const isOwn = (localStorage.getItem('userId') && String(localStorage.getItem('userId')) === String(authorUserId)) || 
                      (localStorage.getItem('username') && localStorage.getItem('username').toLowerCase() === authorName.toLowerCase());

        const isFollowing = window.isFollowingUser ? window.isFollowingUser(authorUserId, authorName) : false;
        const isAssetMode = (course.format === 'asset');

        curriculumPanelHeader.innerHTML = `
            <div class="store-item-author">
                <div class="avatar"></div>
                <span style="cursor:pointer;" onclick="${authorUserId ? `window.location.href='/views/profile.html?id=${authorUserId}'` : ''}">${authorName}</span>
                ${!isOwn ? `
                <button class="btn-follow-overlay ${isFollowing ? 'following' : ''}" data-user-id="${authorUserId}" data-username="${authorName}" style="padding: 4px 10px; font-size: 0.8rem; border-radius: 6px;">
                    ${isFollowing ? 'Following' : 'Follow'}
                </button>` : ''}
            </div>
            <button id="showOverviewBtn" class="btn-glass" style="width: 100%; text-align: left; padding: 12px 15px; display: flex; align-items: center; gap: 12px; font-weight: 600;">
                <i class="${isAssetMode ? 'ri-box-3-line' : 'ri-compass-3-line'}" style="font-size: 1.3rem; color:#60a5fa;"></i> 
                ${isAssetMode ? 'Asset Pack Showcase' : 'Course Overview'}
            </button>
        `;

        const courseFollowBtn = curriculumPanelHeader.querySelector('.btn-follow-overlay');
        if (courseFollowBtn) {
            courseFollowBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.toggleFollowUser) {
                    const nowFollowing = window.toggleFollowUser({
                        userId: authorUserId,
                        username: authorName,
                        fullName: authorName,
                        avatarUrl: course.avatar_url || ''
                    });
                    courseFollowBtn.textContent = nowFollowing ? 'Following' : 'Follow';
                    if (nowFollowing) courseFollowBtn.classList.add('following');
                    else courseFollowBtn.classList.remove('following');
                }
            });
        }

        const showOverviewBtn = curriculumPanelHeader.querySelector('#showOverviewBtn');
        if (showOverviewBtn) {
            showOverviewBtn.addEventListener('click', async () => {
                await renderCourseOverview(course);
            });
        }
        if (window.updateUserAvatars) window.updateUserAvatars();

        curriculumList.innerHTML = '';
        const courseFormat = course.format || 'course';

        if (courseFormat === 'asset') {
            // --- ASSET MODE: Flat list of downloadable items ---
            const items = course.source?.assetItems || [];
            const assetSectionEl = document.createElement('div');
            assetSectionEl.className = 'curriculum-section active';
            assetSectionEl.innerHTML = `
                <div class="curriculum-section-header">
                    <h3>📦 Included Downloads (${items.length})</h3>
                </div>
                <div class="curriculum-lesson-list">
                    ${items.map((item, idx) => `
                        <div class="curriculum-lesson-item" data-asset-index="${idx}">
                            <i class="ri-download-cloud-2-line" style="color: #60a5fa;"></i>
                            <span class="lesson-title">${item.title || `Asset ${idx + 1}`}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            curriculumList.appendChild(assetSectionEl);
        } else {
            // --- COURSE MODE: Sections with Lessons (existing behavior) ---
            const sections = course.source?.sections || [];
            sections.forEach((section, index) => {
                const sectionEl = document.createElement('div');
                sectionEl.className = 'curriculum-section';
                const lessons = section.lessons || [];
                sectionEl.innerHTML = `
                    <div class="curriculum-section-header">
                        <h3>Section ${index + 1}: ${section.title}</h3>
                        <div class="section-meta">
                            <span class="section-lesson-count">${lessons.length} lessons</span>
                            <i class="ri-arrow-down-s-line"></i>
                        </div>
                    </div>
                    <div class="curriculum-lesson-list">
                        ${lessons.map((lesson, lessonIndex) => `
                            <div class="curriculum-lesson-item" data-section-index="${index}" data-lesson-index="${lessonIndex}">
                                <i class="ri-play-circle-line"></i>
                                <span class="lesson-title">${lesson.title}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
                curriculumList.appendChild(sectionEl);
            });
        }

        // Event Delegation for curriculum list clicks
        curriculumList.addEventListener('click', async (e) => {
            const sectionHeader = e.target.closest('.curriculum-section-header');
            if (sectionHeader) {
                sectionHeader.parentElement.classList.toggle('active');
            }

            const lessonItem = e.target.closest('.curriculum-lesson-item');
            if (lessonItem) {
                if (lessonItem.dataset.assetIndex !== undefined) {
                    await activateAssetItem(parseInt(lessonItem.dataset.assetIndex, 10));
                } else {
                    const sectionIndex = lessonItem.dataset.sectionIndex;
                    const lessonIndex = lessonItem.dataset.lessonIndex;
                    await activateLesson(sectionIndex, lessonIndex);
                }
            }
        });

        if (window.updateUserAvatars) window.updateUserAvatars();
    }

    async function activateLesson(sectionIndex, lessonIndex, contentType = 'content') {
        activeLesson.sectionIndex = parseInt(sectionIndex, 10);
        activeLesson.lessonIndex = parseInt(lessonIndex, 10);
        activeContentType = contentType;

        document.querySelectorAll('.curriculum-lesson-item').forEach(item => item.classList.remove('active'));
        const activeItem = curriculumList.querySelector(`.curriculum-lesson-item[data-section-index="${sectionIndex}"][data-lesson-index="${lessonIndex}"]`);
        if (activeItem) activeItem.classList.add('active');

        await renderLessonViewer(currentCourse, sectionIndex, lessonIndex, contentType);
    }

    async function renderLessonViewer(course, sectionIndex, lessonIndex, contentType) {
        const lesson = course.source?.sections?.[sectionIndex]?.lessons?.[lessonIndex];
        if (!lesson) {
            lessonContentDisplay.innerHTML = `<div class="loading-container"><p>Lesson not found.</p></div>`;
            lessonSupportingMaterials.innerHTML = '';
            return;
        }

        if (lessonViewerTitle) lessonViewerTitle.textContent = lesson.title;

        let postIdToDisplay = null;
        if (contentType === 'content' && lesson.contentPostId) postIdToDisplay = lesson.contentPostId;
        else if (contentType === 'worksheet' && lesson.worksheetPostId) postIdToDisplay = lesson.worksheetPostId;
        else if (contentType === 'interactive' && lesson.interactivePostId) postIdToDisplay = lesson.interactivePostId;

        const postToDisplay = postIdToDisplay ? await getPostById(postIdToDisplay) : null;

        if (postToDisplay) {
            const { element: postElement, init: initPost } = window.createPostElement(postToDisplay, 'course-preview');
            lessonContentDisplay.innerHTML = '';
            lessonContentDisplay.appendChild(postElement);
            if (initPost) initPost();
        } else {
            lessonContentDisplay.innerHTML = `
                <div class="loading-container">
                    <i class="ri-file-forbid-line" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>No ${contentType} available for this lesson.</p>
                </div>
            `;
        }

        renderSupportingMaterialTabs(lesson, sectionIndex, lessonIndex);
    }

    function renderSupportingMaterialTabs(lesson, sectionIndex, lessonIndex) {
        lessonSupportingMaterials.innerHTML = `
            <button class="btn-glass lesson-tab ${activeContentType === 'content' ? 'active' : ''}" data-type="content">
                <i class="ri-play-circle-line"></i> Video
            </button>
            <button class="btn-glass lesson-tab ${activeContentType === 'worksheet' ? 'active' : ''}" data-type="worksheet" ${!lesson.worksheetPostId ? 'disabled' : ''}>
                <i class="ri-file-text-line"></i> Worksheet
            </button>
            <button class="btn-glass lesson-tab ${activeContentType === 'interactive' ? 'active' : ''}" data-type="interactive" ${!lesson.interactivePostId ? 'disabled' : ''}>
                <i class="ri-bar-chart-2-line"></i> Interactive
            </button>
        `;

        lessonSupportingMaterials.querySelectorAll('.lesson-tab').forEach(button => {
            button.addEventListener('click', async (e) => {
                const type = e.currentTarget.dataset.type;
                if (type === activeContentType) return;
                await activateLesson(sectionIndex, lessonIndex, type);
            });
        });
    }

    // --- ASSET MODE: Activate a single asset item with multi-attachment support & direct download ---
    async function activateAssetItem(assetIndex, fileType = null) {
        const items = currentCourse.source?.assetItems || [];
        const item = items[assetIndex];
        if (!item) return;

        document.querySelectorAll('.curriculum-lesson-item').forEach(el => el.classList.remove('active'));
        const activeEl = curriculumList.querySelector(`.curriculum-lesson-item[data-asset-index="${assetIndex}"]`);
        if (activeEl) activeEl.classList.add('active');

        // Fetch all 3 possible attached posts
        const contentPost = item.contentPostId ? await getPostById(item.contentPostId) : null;
        const worksheetPost = item.worksheetPostId ? await getPostById(item.worksheetPostId) : null;
        const interactivePost = item.interactivePostId ? await getPostById(item.interactivePostId) : null;

        // Choose which one to display
        let activePost = null;
        let activeType = fileType;

        if (activeType === 'worksheet' && worksheetPost) activePost = worksheetPost;
        else if (activeType === 'interactive' && interactivePost) activePost = interactivePost;
        else if (activeType === 'content' && contentPost) activePost = contentPost;
        else {
            if (contentPost) { activePost = contentPost; activeType = 'content'; }
            else if (worksheetPost) { activePost = worksheetPost; activeType = 'worksheet'; }
            else if (interactivePost) { activePost = interactivePost; activeType = 'interactive'; }
        }

        const downloadUrl = activePost ? (activePost.pdf_url || activePost.video_url || activePost.videoUrl || '') : '';
        const downloadFilename = (item.title || 'asset_file').replace(/[^a-zA-Z0-9_-]/g, '_');

        if (lessonViewerTitle) {
            lessonViewerTitle.innerHTML = `<span><i class="ri-box-3-line" style="color:#60a5fa;"></i> ${item.title || `Asset ${assetIndex + 1}`}</span>`;
        }

        if (activePost) {
            const { element, init } = window.createPostElement(activePost, 'course-preview');
            lessonContentDisplay.innerHTML = '';
            lessonContentDisplay.appendChild(element);
            if (init) init();
        } else {
            lessonContentDisplay.innerHTML = `
                <div class="loading-container">
                    <i class="ri-download-cloud-2-line" style="font-size: 2.5rem; margin-bottom: 10px; color: #60a5fa;"></i>
                    <p>No files attached to this asset item.</p>
                </div>
            `;
        }

        // Render tabs for switching between attachments and download button cleanly at the bottom
        lessonSupportingMaterials.innerHTML = `
            <div class="asset-tabs-bottom" style="border:none; padding:0; background:transparent; margin-top:0; width:100%; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                    <button class="asset-tab-btn ${activeType === 'content' ? 'active' : ''}" data-type="content" ${!contentPost ? 'disabled style="opacity:0.35; cursor:not-allowed;"' : ''}>
                        <i class="ri-video-line"></i> Video Demo ${contentPost ? '<i class="ri-check-line" style="color:#10b981;"></i>' : ''}
                    </button>
                    <button class="asset-tab-btn ${activeType === 'worksheet' ? 'active' : ''}" data-type="worksheet" ${!worksheetPost ? 'disabled style="opacity:0.35; cursor:not-allowed;"' : ''}>
                        <i class="ri-file-pdf-line"></i> PDF / eBook ${worksheetPost ? '<i class="ri-check-line" style="color:#10b981;"></i>' : ''}
                    </button>
                    <button class="asset-tab-btn ${activeType === 'interactive' ? 'active' : ''}" data-type="interactive" ${!interactivePost ? 'disabled style="opacity:0.35; cursor:not-allowed;"' : ''}>
                        <i class="ri-cube-line"></i> 3D / Code ${interactivePost ? '<i class="ri-check-line" style="color:#10b981;"></i>' : ''}
                    </button>
                </div>
                ${downloadUrl ? `
                    <a href="${downloadUrl}" download="${downloadFilename}" target="_blank" class="btn-download-file" style="padding:6px 14px; font-size:0.8rem; margin-left:auto;" title="Download File">
                        <i class="ri-download-2-line"></i> <span class="desktop-only">Download File</span>
                    </a>
                ` : ''}
            </div>
        `;

        lessonSupportingMaterials.querySelectorAll('.asset-tab-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const type = e.currentTarget.dataset.type;
                await activateAssetItem(assetIndex, type);
            });
        });
    }

    // --- Initialization with Dependency Check ---
    async function checkDependenciesAndRun() {
        if (window.createPostElement) {
            await loadCourseDetails();
        } else {
            setTimeout(checkDependenciesAndRun, 50);
        }
    }

    checkDependenciesAndRun();
});