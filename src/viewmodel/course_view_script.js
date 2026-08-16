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

    function loadCourseDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id');

        if (!courseId) {
            lessonContentDisplay.innerHTML = `<div class="loading-container"><p>No course ID provided.</p></div>`;
            return;
        }

        const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        const coursePost = allPosts.find(p => p.id == courseId);

        if (!coursePost || coursePost.format !== 'course') {
            lessonContentDisplay.innerHTML = `<div class="loading-container"><p>Course not found.</p></div>`;
            return;
        }

        document.title = `${coursePost.title} | XtraPath`;
        currentCourse = coursePost;
        courseViewTitleHeader.textContent = coursePost.title;
        renderCurriculumPanel(coursePost);

        // Always show the course overview on initial load.
        renderCourseOverview(coursePost); // No content type is passed, so the function will determine the default.
    }

    function renderCourseOverview(course, contentType) {
        if (!course) return;

        // Clear active lesson state when showing overview
        activeLesson = { sectionIndex: null, lessonIndex: null };
        document.querySelectorAll('.curriculum-lesson-item').forEach(item => item.classList.remove('active'));

        const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        const coverPost = course.source.coverPostId ? allPosts.find(p => p.id == course.source.coverPostId) : null;
        const introPost = course.source.introVideoId ? allPosts.find(p => p.id == course.source.introVideoId) : null;

        lessonViewerTitle.textContent = course.title;

        // --- REFACTORED LOGIC ---
        // 1. Determine what to display and which tab should be active.
        let postToDisplay = null;
        let activeType = contentType;

        // If no content type is specified (on initial load), determine the default.
        if (!activeType) {
            if (coverPost) {
                activeType = 'cover';
                postToDisplay = coverPost;
            } else if (introPost) {
                activeType = 'intro';
                postToDisplay = introPost;
            }
        } else {
            // If a content type was specified (from a tab click), select that post.
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
            tab.addEventListener('click', (e) => {
                renderCourseOverview(course, e.currentTarget.dataset.type);
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
        curriculumPanelHeader.innerHTML = `
            <div class="store-item-author">
                <div class="avatar"></div>
                <span>Dr. Nova</span>
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
            showOverviewBtn.addEventListener('click', () => {
                renderCourseOverview(course);
            });
        }
        if (window.updateUserAvatars) window.updateUserAvatars(); // Update avatar for the course creator

        curriculumList.innerHTML = ''; // Clear list to prevent duplication on potential re-renders
        course.source.sections.forEach((section, index) => {
            const sectionEl = document.createElement('div');
            sectionEl.className = 'curriculum-section';
            sectionEl.innerHTML = `
                <div class="curriculum-section-header">
                    <h3>Section ${index + 1}: ${section.title}</h3>
                    <div class="section-meta">
                        <span class="section-lesson-count">${section.lessons.length} lessons</span>
                        <i class="ri-arrow-down-s-line"></i>
                    </div>
                </div>
                <div class="curriculum-lesson-list">
                    ${section.lessons.map((lesson, lessonIndex) => `
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
        curriculumList.addEventListener('click', (e) => {
            const sectionHeader = e.target.closest('.curriculum-section-header');
            if (sectionHeader) {
                sectionHeader.parentElement.classList.toggle('active');
            }

            const lessonItem = e.target.closest('.curriculum-lesson-item');
            if (lessonItem) {
                const sectionIndex = lessonItem.dataset.sectionIndex;
                const lessonIndex = lessonItem.dataset.lessonIndex;
                activateLesson(sectionIndex, lessonIndex);
            }
        });

        if (window.updateUserAvatars) window.updateUserAvatars();
    }

    function activateLesson(sectionIndex, lessonIndex, contentType = 'content') {
        activeLesson.sectionIndex = parseInt(sectionIndex, 10);
        activeLesson.lessonIndex = parseInt(lessonIndex, 10);
        activeContentType = contentType;

        document.querySelectorAll('.curriculum-lesson-item').forEach(item => item.classList.remove('active'));
        const activeItem = curriculumList.querySelector(`.curriculum-lesson-item[data-section-index="${sectionIndex}"][data-lesson-index="${lessonIndex}"]`);
        if (activeItem) activeItem.classList.add('active');

        renderLessonViewer(currentCourse, sectionIndex, lessonIndex, contentType);
    }

    function renderLessonViewer(course, sectionIndex, lessonIndex, contentType) {
        const lesson = course.source.sections[sectionIndex]?.lessons[lessonIndex];
        if (!lesson) {
            lessonContentDisplay.innerHTML = `<div class="loading-container"><p>Lesson not found.</p></div>`;
            lessonSupportingMaterials.innerHTML = '';
            return;
        }

        lessonViewerTitle.textContent = lesson.title;

        const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        let postIdToDisplay = null;

        if (contentType === 'content' && lesson.contentPostId) postIdToDisplay = lesson.contentPostId;
        else if (contentType === 'worksheet' && lesson.worksheetPostId) postIdToDisplay = lesson.worksheetPostId;
        else if (contentType === 'interactive' && lesson.interactivePostId) postIdToDisplay = lesson.interactivePostId;

        const postToDisplay = postIdToDisplay ? allPosts.find(p => p.id == postIdToDisplay) : null;

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
            button.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                if (type === activeContentType) return;
                activateLesson(sectionIndex, lessonIndex, type);
            });
        });
    }

    // --- Initialization with Dependency Check ---
    // This ensures that functions from script.js (like createPostElement) are available
    // before this script tries to use them, preventing a race condition on DOMContentLoaded.
    function checkDependenciesAndRun() {
        if (window.createPostElement) {
            loadCourseDetails();
        } else {
            setTimeout(checkDependenciesAndRun, 50);
        }
    }

    checkDependenciesAndRun();
});