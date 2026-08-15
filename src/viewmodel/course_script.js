document.addEventListener('DOMContentLoaded', () => {
    console.log("XtraCourse Studio Initialized");

    // In a real app, this would be fetched or initialized.
    let courseData = {
        title: "Untitled Course",
        description: "",
        coverPostId: null,
        introVideoId: null,
        sections: []
    };

    let activeLesson = { sectionIndex: null, lessonIndex: null };

    const courseTitleInput = document.getElementById('courseTitleInput');
    const courseDescriptionEditor = document.getElementById('courseDescriptionEditor');
    const courseMetaStepsContainer = document.getElementById('course-meta-steps');
    const courseSectionsContainer = document.getElementById('course-sections-container');
    const addSectionBtn = document.getElementById('addSectionBtn');
    const previewContent = document.getElementById('course-preview-content');

    // Event delegation for the deselect button, which is created dynamically.
    if (previewContent) {
        previewContent.addEventListener('click', (e) => {
            if (e.target.closest('#deselectLessonBtn')) {
                deselectActiveLesson();
            }
        });
    }

    function renderPipeline() {
        // Render Course-level steps
        courseMetaStepsContainer.innerHTML = `
            <div class="course-meta-group">
                <input type="text" id="courseTitleInput" class="course-title-input" placeholder="Course Title" value="${courseData.title}">
                <div id="courseDescriptionEditor" class="course-description-editor" contenteditable="true" placeholder="Add a course description...">${courseData.description}</div>
            </div>
            <div class="pipeline-step-group">
                ${createStepElement('cover', 'Set Course Cover', 'ri-image-add-line', !!courseData.coverPostId)}
                ${createStepElement('intro', 'Create Intro Video', 'ri-play-circle-line', !!courseData.introVideoId, true)}
            </div>
        `;

        // Render Sections and Lessons
        courseSectionsContainer.innerHTML = '';
        courseData.sections.forEach((section, sectionIndex) => {
            const sectionEl = document.createElement('div');
            sectionEl.className = 'section-card';
            sectionEl.innerHTML = `
                <div class="section-header">
                    <input type="text" class="section-title-input" placeholder="Section Title" value="${section.title}" data-section-index="${sectionIndex}">
                    <button class="add-lesson-btn" data-section-index="${sectionIndex}"><i class="ri-add-line"></i> Lesson</button>
                </div>
                <div class="lesson-list">
                    ${section.lessons.map((lesson, lessonIndex) => `
                        <div class="lesson-card ${activeLesson.sectionIndex == sectionIndex && activeLesson.lessonIndex == lessonIndex ? 'selected' : ''}" data-section-index="${sectionIndex}" data-lesson-index="${lessonIndex}">
                             <input type="text" class="lesson-title-input" placeholder="Lesson Title" value="${lesson.title}" data-section-index="${sectionIndex}" data-lesson-index="${lessonIndex}">
                             <div class="pipeline-step-group horizontal">
                                ${createStepElement('content', 'Add Video', 'ri-video-add-line', !!lesson.contentPostId)}
                                ${createStepElement('worksheet', 'Add Worksheet', 'ri-file-text-line', !!lesson.worksheetPostId, true)}
                                ${createStepElement('interactive', 'Add Interactive', 'ri-bar-chart-2-line', !!lesson.interactivePostId, true)}
                             </div>
                        </div>
                    `).join('')}
                </div>
            `;
            courseSectionsContainer.appendChild(sectionEl);
        });
        
        attachEventListeners();
    }

    function createStepElement(id, text, icon, isComplete, isOptional = false) {
        return `
            <div class="pipeline-step ${isComplete ? 'complete' : ''}" data-step-id="${id}">
                <div class="step-icon">
                    <i class="${icon}"></i>
                    ${isComplete ? '<i class="ri-check-line checkmark"></i>' : ''}
                </div>
                <div class="step-label">
                    ${text}
                    ${isOptional ? '<span class="optional-badge">Optional</span>' : ''}
                </div>
            </div>
        `;
    }
    
    function setActiveLesson(sectionIndex, lessonIndex) {
        activeLesson.sectionIndex = parseInt(sectionIndex, 10);
        activeLesson.lessonIndex = parseInt(lessonIndex, 10);
        renderPipeline(); // Re-render to show selection highlight
        renderPreview();  // Render the preview for the selected lesson

        // Automatically switch to preview tab on mobile for better UX
        if (window.innerWidth <= 768) {
            // The switchCourseTab function is defined in xtraCourse.html
            if (typeof switchCourseTab === 'function') {
                switchCourseTab('preview');
            }
        }
    }

    function attachEventListeners() {
        // Course Title/Desc
        const titleInput = document.getElementById('courseTitleInput');
        const descEditor = document.getElementById('courseDescriptionEditor');
        if(titleInput) titleInput.addEventListener('input', (e) => { courseData.title = e.target.value; saveCourse(); });
        if(descEditor) descEditor.addEventListener('input', (e) => { courseData.description = e.target.innerHTML; saveCourse(); });

        // Add Section
        if(addSectionBtn) addSectionBtn.addEventListener('click', addSection);

        // Section/Lesson Titles
        document.querySelectorAll('.section-title-input').forEach(input => {
            input.addEventListener('input', (e) => {
                courseData.sections[e.target.dataset.sectionIndex].title = e.target.value;
                saveCourse();
            });
        });
        document.querySelectorAll('.lesson-title-input').forEach(input => {
            input.addEventListener('input', (e) => {
                courseData.sections[e.target.dataset.sectionIndex].lessons[e.target.dataset.lessonIndex].title = e.target.value;
                saveCourse();
            });
        });

        // Add Lesson
        document.querySelectorAll('.add-lesson-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sectionIndex = e.currentTarget.dataset.sectionIndex;
                addLesson(sectionIndex);
            });
        });

        // Lesson Card Clicks for Preview
        document.querySelectorAll('.lesson-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Prevent step clicks and input clicks from also triggering lesson selection
                if (e.target.closest('.pipeline-step') || e.target.tagName.toLowerCase() === 'input') return;

                setActiveLesson(card.dataset.sectionIndex, card.dataset.lessonIndex);
            });
        });

        // Pipeline Step Clicks
        document.querySelectorAll('.pipeline-step').forEach(step => {
            step.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering lesson card click
                const stepId = e.currentTarget.dataset.stepId;
                const lessonCard = e.currentTarget.closest('.lesson-card');

                if (lessonCard) { // It's a lesson step ('content', 'worksheet', etc.)
                    const sectionIndex = lessonCard.dataset.sectionIndex;
                    const lessonIndex = lessonCard.dataset.lessonIndex;
                    
                    // Save context and redirect to the studio
                    const courseContext = {
                        from: 'course',
                        sectionIndex: sectionIndex,
                        lessonIndex: lessonIndex,
                        stepId: stepId
                    };
                    localStorage.setItem('courseContext', JSON.stringify(courseContext));
                    
                    // Redirect to the main studio page. The studio will handle the rest.
                    window.location.href = '/views/xtraAnim.html';

                } else { // It's a course-level step ('cover', 'intro')
                    if (stepId === 'cover' || stepId === 'intro') {
                        const courseContext = { from: 'course', stepId: stepId };
                        localStorage.setItem('courseContext', JSON.stringify(courseContext));
                        window.location.href = '/views/xtraAnim.html';
                    }
                }
            });
        });

        const publishBtn = document.getElementById('publishCourseBtn');
        if (publishBtn) {
            publishBtn.addEventListener('click', async () => {
                // 1. Validate course
                if (!courseData.title || courseData.title === "Untitled Course") {
                    alert("Please provide a course title.");
                    return;
                }
                if (!courseData.coverPostId) {
                    alert("Please set a course cover.");
                    return;
                }

                // 2. Create a new post object for the course
                const courseId = `course_${Date.now()}`;
                const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                const coverPost = allPosts.find(p => p.id == courseData.coverPostId);

                if (!coverPost) {
                    alert("The selected cover post could not be found. Please set a new cover.");
                    return;
                }

                const newCoursePost = {
                    id: courseId,
                    title: courseData.title,
                    desc: courseData.description,
                    videoUrl: coverPost.videoUrl, // Use cover post's media as thumbnail
                    mediaType: coverPost.mediaType,
                    format: 'course',
                    source: courseData, // Embed the full course structure
                    is_for_sale: true, // Make it appear in the store
                    price: 29.99, // Mock price
                    publishedAt: new Date().toISOString(),
                    user_id: null,
                    originalId: null,
                    pdfUrl: ''
                };

                // 3. Add to the main post list
                allPosts.push(newCoursePost);
                localStorage.setItem('userPosts', JSON.stringify(allPosts));

                // 4. Clear the draft
                localStorage.removeItem('xtraCourseDraft');

                // 5. Redirect to the store to see the new listing
                alert('Course published! You will now be taken to the main store page.');
                window.location.href = '/views/store.html';
            });
        }
    }

    function renderPreview() {
        if (typeof window.createPostElement !== 'function') {
            // The createPostElement function is essential for all previews.
            // If it's not ready, we show a loading state and retry.
            showPreviewLoading();
            return;
        }

        try {
            if (activeLesson.sectionIndex === null || activeLesson.lessonIndex === null) {
                // NEW: No lesson is selected, so render the full course overview.
                renderCourseOverview();
                return;
            }

            const lesson = courseData.sections[activeLesson.sectionIndex]?.lessons[activeLesson.lessonIndex];
            if (!lesson) {
                console.warn(`Preview failed: Lesson at index [${activeLesson.sectionIndex}, ${activeLesson.lessonIndex}] not found.`);
                previewContent.innerHTML = `
                    <div class="preview-placeholder-card">
                        <i class="ri-eye-off-line"></i>
                        <p>The selected lesson could not be found. It may have been deleted. Please select another lesson.</p>
                    </div>
                `;
                return;
            }

            const lessonTitle = lesson ? lesson.title : 'Untitled Lesson';

            previewContent.innerHTML = `
                <div class="lesson-preview-card">
                    <div class="lesson-preview-header">
                        <div>
                            <span class="lesson-preview-type">Lesson Preview</span>
                            <h3 class="lesson-preview-title">${lessonTitle}</h3>
                        </div>
                        <button id="deselectLessonBtn" class="icon-btn" title="Back to Course Overview"><i class="ri-close-line"></i></button>
                    </div>
                    <div class="lesson-preview-content"></div>
                    <div class="lesson-supporting-content-wrapper" style="display: none;">
                        <div class="supporting-content-header">Supporting Materials</div>
                        <div class="lesson-supporting-content"></div>
                    </div>
                </div>
            `;
            const lessonContentContainer = previewContent.querySelector('.lesson-preview-content');
            const supportingContentContainer = previewContent.querySelector('.lesson-supporting-content');
            const supportingWrapper = previewContent.querySelector('.lesson-supporting-content-wrapper');

            const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');

            const allContent = [
                { type: 'Content', id: lesson.contentPostId, key: 'content' },
                { type: 'Worksheet', id: lesson.worksheetPostId, key: 'worksheet' },
                { type: 'Interactive', id: lesson.interactivePostId, key: 'interactive' }
            ].filter(item => item.id);

            if (allContent.length === 0) {
                lessonContentContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; padding: 20px;">
                        <i class="ri-video-add-line" style="font-size: 2.5rem; margin-bottom: 15px;"></i>
                        <p style="font-weight: 500; line-height: 1.5;">This lesson has no video yet.<br>Click "Add Video" in the structure panel.</p>
                    </div>
                `;
                return; 
            }

            const primaryContent = allContent.shift();
            const secondaryContent = allContent;

            const primaryPost = allPosts.find(p => p.id == primaryContent.id);
            if (primaryPost) {
                const { element: postElement, init: initPost } = window.createPostElement(primaryPost, 'course-preview');
                lessonContentContainer.innerHTML = '';
                lessonContentContainer.appendChild(postElement);
                if (initPost) initPost();
            } else {
                lessonContentContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; padding: 20px;">
                        <i class="ri-error-warning-line" style="font-size: 2.5rem; margin-bottom: 15px; color: #ef4444;"></i>
                        <p style="font-weight: 500; line-height: 1.5; color: #ef4444;">Content Not Found</p>
                        <p style="font-size: 0.8rem;">The post with ID ${primaryContent.id} could not be found.</p>
                    </div>
                `;
            }

            if (secondaryContent.length > 0) {
                supportingWrapper.style.display = 'block';
                supportingContentContainer.innerHTML = '';

                secondaryContent.forEach(item => {
                    const post = allPosts.find(p => p.id == item.id);
                    const iconEl = document.createElement('div');
                    iconEl.className = 'supporting-material-icon';
                    
                    let iconClass = 'ri-file-line';
                    if (item.key === 'worksheet') iconClass = 'ri-file-text-line';
                    if (item.key === 'interactive') iconClass = 'ri-bar-chart-2-line';

                    if (post) {
                        iconEl.innerHTML = `
                            <div class="material-icon-box"><i class="${iconClass}"></i></div>
                            <div class="material-title">${post.title}</div>
                        `;
                        iconEl.title = `${item.type}: ${post.title}`;
                    } else {
                        iconEl.classList.add('not-found');
                        iconEl.innerHTML = `
                            <div class="material-icon-box"><i class="ri-error-warning-line"></i></div>
                            <div class="material-title">Not Found</div>
                        `;
                        iconEl.title = `${item.type}: Not Found`;
                    }
                    supportingContentContainer.appendChild(iconEl);
                });
            }

        } catch (error) {
            console.error("Failed to render course preview:", error);
            console.error("Error details:", error.message, error.stack);
            previewContent.innerHTML = `
                <div class="preview-placeholder-card">
                    <i class="ri-error-warning-line" style="font-size: 2.5rem; color: #ef4444;"></i>
                    <p style="color: #ef4444;">Preview Error</p>
                    <p style="font-size: 0.8rem;">Could not render the lesson preview. Check the console for details.</p>
                </div>
            `;
        }
    }

    function deselectActiveLesson() {
        activeLesson.sectionIndex = null;
        activeLesson.lessonIndex = null;
        renderPipeline(); // Re-render to remove selection highlight
        renderPreview();  // Re-render to show course overview
    }

    function showPreviewLoading() {
        previewContent.innerHTML = `
            <div class="preview-placeholder-card">
                <div class="spinner" style="margin-bottom: 20px;"></div>
                <p>Loading Preview...</p>
            </div>
        `;
        setTimeout(renderPreview, 200);
    }

    function renderCourseOverview() {
        previewContent.innerHTML = ''; // Clear previous content

        // Fetch all posts to find the cover and intro video
        const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        const coverPost = courseData.coverPostId ? allPosts.find(p => p.id == courseData.coverPostId) : null;
        const introPost = courseData.introVideoId ? allPosts.find(p => p.id == courseData.introVideoId) : null;

        // Use a structure similar to the lesson preview for consistency
        previewContent.innerHTML = `
            <div class="lesson-preview-card">
                <div class="lesson-preview-header">
                    <div>
                        <span class="lesson-preview-type">Course Overview</span>
                        <h3 class="lesson-preview-title">${courseData.title}</h3>
                    </div>
                    <!-- No close button needed for course overview -->
                </div>
                <div class="lesson-preview-content"></div>
                <div class="lesson-supporting-content-wrapper" style="display: none;">
                    <div class="supporting-content-header">Introduction</div>
                    <div class="lesson-supporting-content"></div>
                </div>
            </div>
        `;

        const mainContentContainer = previewContent.querySelector('.lesson-preview-content');
        const supportingContentContainer = previewContent.querySelector('.lesson-supporting-content');
        const supportingWrapper = previewContent.querySelector('.lesson-supporting-content-wrapper');

        // 1. Render Cover Post in the main content area
        let initCover = null;
        if (coverPost) {
            const result = window.createPostElement(coverPost, 'course-preview');
            mainContentContainer.innerHTML = '';
            mainContentContainer.appendChild(result.element);
            initCover = result.init;
        } else {
            mainContentContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; padding: 20px;">
                    <i class="ri-image-add-line" style="font-size: 2.5rem; margin-bottom: 15px;"></i>
                    <p style="font-weight: 500; line-height: 1.5;">This course has no cover yet.<br>Click "Set Course Cover" in the structure panel.</p>
                </div>
            `;
        }

        // 2. Render Intro Video as a supporting material icon
        if (introPost) {
            supportingWrapper.style.display = 'block';
            supportingContentContainer.innerHTML = '';

            const iconEl = document.createElement('div');
            iconEl.className = 'supporting-material-icon';
            
            const iconClass = 'ri-play-circle-line'; // Icon for video

            iconEl.innerHTML = `
                <div class="material-icon-box"><i class="${iconClass}"></i></div>
                <div class="material-title">${introPost.title}</div>
            `;
            iconEl.title = `Intro Video: ${introPost.title}`;
            
            supportingContentContainer.appendChild(iconEl);
        }

        // Call init functions now that elements are in the DOM
        if (initCover) initCover();
    }

    function addSection() {
        courseData.sections.push({
            title: `Section ${courseData.sections.length + 1}`,
            lessons: []
        });
        saveCourse();
        renderPipeline();
    }

    function addLesson(sectionIndex) {
        const section = courseData.sections[sectionIndex];
        if (section) {
            section.lessons.push({
                title: `Lesson ${section.lessons.length + 1}`,
                contentPostId: null,
                worksheetPostId: null,
                interactivePostId: null,
            });
            saveCourse();
            renderPipeline();
        }
    }

    function saveCourse() {
        localStorage.setItem('xtraCourseDraft', JSON.stringify(courseData));
        console.log("Course draft saved.", courseData);
        updatePublishButtonState();
    }

    function loadCourse() {
        const savedDraft = localStorage.getItem('xtraCourseDraft');
        if (savedDraft) {
            courseData = JSON.parse(savedDraft);
            console.log("Course draft loaded.");

            // Check if we just returned from the studio to select the correct lesson
            const courseContextRaw = localStorage.getItem('courseContext');
            if (courseContextRaw) {
                const courseContext = JSON.parse(courseContextRaw);
                // Check for lesson context specifically
                if (courseContext.from === 'course' && courseContext.sectionIndex !== undefined && courseContext.lessonIndex !== undefined) {
                    activeLesson = { 
                        sectionIndex: parseInt(courseContext.sectionIndex, 10), 
                        lessonIndex: parseInt(courseContext.lessonIndex, 10) 
                    };
                    console.log("Restored active lesson from studio context:", activeLesson);
                }
                // Clean up the context so it's not reused on a normal refresh
                localStorage.removeItem('courseContext');
            } else if (courseData.sections.length > 0 && courseData.sections[0].lessons.length > 0) {
                // Fallback to default active lesson if no context and none is active
                if(activeLesson.sectionIndex === null) activeLesson = { sectionIndex: 0, lessonIndex: 0 };
            }
        }
        renderPipeline();
        renderPreview(); // Render preview after loading and rendering pipeline
    }

    function updatePublishButtonState() {
        const publishBtn = document.getElementById('publishCourseBtn');
        if (!publishBtn) return;
        
        // As requested, the publish button is now always enabled.
        // The underlying publish logic remains unchanged.
        publishBtn.disabled = false;
    }

    // Initial Load
    loadCourse();
});