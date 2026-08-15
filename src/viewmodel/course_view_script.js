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
        const coursePost = allPosts.find(p => p.id === courseId);

        if (!coursePost || coursePost.format !== 'course') {
            lessonContentDisplay.innerHTML = `<div class="loading-container"><p>Course not found.</p></div>`;
            return;
        }

        document.title = `${coursePost.title} | XtraPath`;
        currentCourse = coursePost;
        courseViewTitleHeader.textContent = coursePost.title;

        renderCurriculumPanel(coursePost);
        
        // Load the first lesson by default
        if (coursePost.source.sections.length > 0 && coursePost.source.sections[0].lessons.length > 0) {
            activateLesson(0, 0);
        } else {
            // No lessons, show an empty state
            lessonViewerTitle.textContent = "Welcome!";
            lessonContentDisplay.innerHTML = `<div class="loading-container"><p>This course has no lessons yet.</p></div>`;
        }
    }

    function renderCurriculumPanel(course) {
        if (!curriculumList || !curriculumPanelHeader) return;

        curriculumPanelHeader.innerHTML = `
            <h2>${course.title}</h2>
            <div class="store-item-author">
                <div class="avatar"></div>
                <span>${localStorage.getItem('username') || 'Dr. Nova'}</span>
            </div>
        `;

        curriculumList.innerHTML = '';
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
                        <div class="curriculum-lesson-item">
                            <i class="ri-play-circle-line"></i>
                            <span class="lesson-title">${lesson.title}</span>
                        </div>
                    `).join('')}
                </div>
            `;

            const header = sectionEl.querySelector('.curriculum-section-header');
            header.addEventListener('click', () => sectionEl.classList.toggle('active'));
            curriculumList.appendChild(sectionEl);

            section.lessons.forEach((lesson, lessonIndex) => {
                const lessonItem = sectionEl.querySelector(`.curriculum-lesson-item:nth-child(${lessonIndex + 1})`);
                lessonItem.addEventListener('click', () => activateLesson(index, lessonIndex));
            });
        });

        if (window.updateUserAvatars) window.updateUserAvatars();
    }

    function activateLesson(sectionIndex, lessonIndex, contentType = 'content') {
        activeLesson.sectionIndex = sectionIndex;
        activeLesson.lessonIndex = lessonIndex;
        activeContentType = contentType;

        document.querySelectorAll('.curriculum-lesson-item').forEach(item => item.classList.remove('active'));
        const activeItem = curriculumList.querySelector(`.curriculum-section:nth-child(${sectionIndex + 1}) .curriculum-lesson-item:nth-child(${lessonIndex + 1})`);
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

    loadCourseDetails();
});