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

        if (!coursePost || coursePost.format !== 'course') {
            lessonContentDisplay.innerHTML = `<div class="loading-container"><p>Course not found.</p></div>`;
            return;
        }

        document.title = `${coursePost.title} | XtraPath`;
        currentCourse = coursePost;
        courseViewTitleHeader.textContent = coursePost.title;
        renderCurriculumPanel(coursePost);

        // Always show the course overview on initial load.
        await renderCourseOverview(coursePost);
    }

    async function renderCourseOverview(course, contentType) {
        if (!course) return;

        // Clear active lesson state when showing overview
        activeLesson = { sectionIndex: null, lessonIndex: null };
        document.querySelectorAll('.curriculum-lesson-item').forEach(item => item.classList.remove('active'));

        const coverPost = course.source?.coverPostId ? await getPostById(course.source.coverPostId) : null;
        const introPost = course.source?.introVideoId ? await getPostById(course.source.introVideoId) : null;

        lessonViewerTitle.textContent = course.title;

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
                <i class="ri-image-line"></i> Cover
            </button>
            <button class="btn-glass lesson-tab ${activeType === 'intro' ? 'active' : ''}" data-type="intro" ${!introPost ? 'disabled' : ''}>
                <i class="ri-movie-line"></i> Introduction
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
                    <i class="ri-book-open-line" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Welcome to "${course.title}"!</p>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">Select a lesson from the list to begin.</p>
                </div>
            `;
        }
    }

    function renderCurriculumPanel(course) {
        if (!curriculumList || !curriculumPanelHeader) return;
        const authorName = course.username || course.source?.author || localStorage.getItem('username') || 'Creator';
        curriculumPanelHeader.innerHTML = `
            <div class="store-item-author">
                <div class="avatar"></div>
                <span>${authorName}</span>
                <button class="btn-glass btn-follow-overlay" style="padding: 4px 10px; font-size: 0.8rem; border-radius: 6px;">
                    Follow
                </button>
            </div>
            <button id="showOverviewBtn" class="btn-glass" style="width: 100%; text-align: left; padding: 12px 15px; display: flex; align-items: center; gap: 12px; font-weight: 600;">
                <i class="ri-compass-3-line" style="font-size: 1.3rem;"></i> Course Overview
            </button>
        `;

        // Add event listener for the new button to go back to the course overview
        const showOverviewBtn = curriculumPanelHeader.querySelector('#showOverviewBtn');
        if (showOverviewBtn) {
            showOverviewBtn.addEventListener('click', async () => {
                await renderCourseOverview(course);
            });
        }
        if (window.updateUserAvatars) window.updateUserAvatars(); // Update avatar for the course creator

        curriculumList.innerHTML = ''; // Clear list to prevent duplication on potential re-renders
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

        // Event Delegation for better performance
        curriculumList.addEventListener('click', async (e) => {
            const sectionHeader = e.target.closest('.curriculum-section-header');
            if (sectionHeader) {
                sectionHeader.parentElement.classList.toggle('active');
            }

            const lessonItem = e.target.closest('.curriculum-lesson-item');
            if (lessonItem) {
                const sectionIndex = lessonItem.dataset.sectionIndex;
                const lessonIndex = lessonItem.dataset.lessonIndex;
                await activateLesson(sectionIndex, lessonIndex);
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

        lessonViewerTitle.textContent = lesson.title;

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