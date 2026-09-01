document.addEventListener('DOMContentLoaded', () => {
    console.log("XtraCourse & Asset Studio Initialized");

    // In a real app, this would be fetched or initialized.
    let courseData = {
        title: "Untitled Course",
        description: "",
        format: "course",
        coverPostId: null,
        introVideoId: null,
        sections: [],
        assetItems: []
    };

    let editingCourseId = null; // Holds existing post ID if editing published course/asset

    let activeLesson = { sectionIndex: null, lessonIndex: null };
    let activeAsset = { assetIndex: null, fileType: 'content' };
    let currentStepModalContext = null;

    const courseTitleInput = document.getElementById('courseTitleInput');
    const courseDescriptionEditor = document.getElementById('courseDescriptionEditor');
    const courseMetaStepsContainer = document.getElementById('course-meta-steps');
    const courseSectionsContainer = document.getElementById('course-sections-container');
    const addSectionBtn = document.getElementById('addSectionBtn');
    const previewContent = document.getElementById('course-preview-content');

    // Material Modal Elements
    const materialModal = document.getElementById('courseMaterialModal');
    const materialModalTitle = document.getElementById('materialModalTitle');
    const materialModalSubtitle = document.getElementById('materialModalSubtitle');
    const materialModalIcon = document.getElementById('materialModalIcon');
    const closeMaterialModalBtn = document.getElementById('closeMaterialModal');
    const currentAttachedBanner = document.getElementById('currentAttachedBanner');
    const attachedItemThumb = document.getElementById('attachedItemThumb');
    const attachedItemTitle = document.getElementById('attachedItemTitle');
    const detachMaterialBtn = document.getElementById('detachMaterialBtn');
    const openStudioActionBtn = document.getElementById('openStudioActionBtn');
    const createStudioDesc = document.getElementById('createStudioDesc');
    const materialSearchInput = document.getElementById('materialSearchInput');
    const materialCreationsGrid = document.getElementById('materialCreationsGrid');

    async function getSupabaseClient() {
        if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
            return window.supabaseClient;
        }
        if (typeof supabase !== 'undefined' && supabase && typeof supabase.from === 'function') {
            window.supabaseClient = supabase;
            return supabase;
        }
        try {
            const configRes = await fetch('/api/config');
            if (configRes.ok) {
                const config = await configRes.json();
                if (window.supabase && window.supabase.createClient) {
                    window.supabaseClient = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
                    return window.supabaseClient;
                }
            }
        } catch (e) {
            console.warn("Could not init Supabase client in course_script:", e);
        }
        return null;
    }

    async function syncUserPosts() {
        const client = await getSupabaseClient();
        if (client) {
            try {
                let user = null;
                const { data: userData } = await client.auth.getUser();
                user = userData?.user;
                let query = client.from('posts').select('*').order('created_at', { ascending: false });
                if (user) {
                    query = query.or(`user_id.eq.${user.id},format.eq.course,format.eq.asset`);
                }
                const { data, error } = await query;
                if (!error && data && data.length > 0) {
                    const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                    const mergedMap = new Map();
                    localPosts.forEach(p => mergedMap.set(String(p.id), p));
                    data.forEach(p => mergedMap.set(String(p.id), p));
                    const merged = Array.from(mergedMap.values());
                    localStorage.setItem('userPosts', JSON.stringify(merged));
                    return merged;
                }
            } catch (e) {
                console.warn("Error syncing user posts:", e);
            }
        }
        return JSON.parse(localStorage.getItem('userPosts') || '[]');
    }

    // Event delegation for preview actions (deselect, attachment switching, preview triggers)
    if (previewContent) {
        previewContent.addEventListener('click', (e) => {
            if (e.target.closest('#deselectLessonBtn')) {
                deselectActiveLesson();
            }
            if (e.target.closest('#deselectAssetBtn')) {
                deselectActiveAsset();
            }
            const previewAssetBtn = e.target.closest('.btn-preview-asset-item');
            if (previewAssetBtn) {
                const idx = previewAssetBtn.dataset.assetIndex;
                const ftype = previewAssetBtn.dataset.fileType || 'content';
                setActiveAsset(idx, ftype);
            }
            const assetTab = e.target.closest('.asset-tab-btn');
            if (assetTab) {
                const ftype = assetTab.dataset.fileType;
                if (activeAsset.assetIndex !== null) {
                    activeAsset.fileType = ftype;
                    renderPreview();
                }
            }
        });
    }

    // --- Format Type Dropdown ---
    const formatTypeSelect = document.getElementById('formatTypeSelect');
    if (formatTypeSelect) {
        formatTypeSelect.addEventListener('change', (e) => {
            courseData.format = e.target.value;
            // When switching to asset mode, set appropriate default title if untouched
            if (courseData.format === 'asset' && courseData.title === 'Untitled Course') {
                courseData.title = 'Untitled Asset Pack';
            } else if (courseData.format === 'course' && courseData.title === 'Untitled Asset Pack') {
                courseData.title = 'Untitled Course';
            }
            activeLesson = { sectionIndex: null, lessonIndex: null };
            activeAsset = { assetIndex: null, fileType: 'content' };
            updateModeLabels();
            saveCourse();
            renderPipeline();
            renderPreview();
        });
    }

    function updateModeLabels() {
        const mode = courseData.format || 'course';
        const layout = document.getElementById('courseStudioLayout');
        const badge = document.getElementById('studioModeBadge');
        const previewHeaderLabel = document.getElementById('previewHeaderLabel');
        const dividerLabel = document.getElementById('pipelineDividerLabel');
        const addBtnLabel = document.getElementById('addSectionBtnLabel');
        const publishBtn = document.getElementById('publishCourseBtn');

        if (formatTypeSelect) formatTypeSelect.value = mode;
        if (layout) layout.classList.toggle('asset-mode', mode === 'asset');

        const isEditing = !!editingCourseId;
        if (mode === 'asset') {
            if (previewHeaderLabel) {
                previewHeaderLabel.innerHTML = '<i class="ri-box-3-line"></i> Buyer Showcase & Direct Downloads';
            }
            if (dividerLabel) dividerLabel.textContent = 'Included Digital Assets & Downloads';
            if (addBtnLabel) addBtnLabel.textContent = 'Add Digital Asset Item';
            if (publishBtn) publishBtn.innerHTML = isEditing 
                ? '<i class="ri-save-3-line"></i> <span class="publish-btn-text">Save Asset Pack</span>' 
                : '<i class="ri-upload-cloud-2-line"></i> <span class="publish-btn-text">Publish Asset Pack</span>';
        } else {
            if (previewHeaderLabel) {
                previewHeaderLabel.innerHTML = '<i class="ri-eye-line"></i> Student Curriculum Preview';
            }
            if (dividerLabel) dividerLabel.textContent = 'Course Curriculum';
            if (addBtnLabel) addBtnLabel.textContent = 'Add Section';
            if (publishBtn) publishBtn.innerHTML = isEditing 
                ? '<i class="ri-save-3-line"></i> <span class="publish-btn-text">Save Course</span>' 
                : '<i class="ri-upload-cloud-2-line"></i> <span class="publish-btn-text">Publish Course</span>';
        }
    }

    function renderPipeline() {
        const isAssetMode = (courseData.format === 'asset');

        // 1. Render Meta steps (Title, Description, Cover, Demo/Intro)
        const titlePlaceholder = isAssetMode 
            ? "Asset Pack Title (e.g. 3D Sci-Fi Kit & Guidebook)" 
            : "Course Title (e.g. Master React & Three.js)";
        const descPlaceholder = isAssetMode
            ? "Describe all included digital files, formats, 3D models, textures, or PDF guidebooks..."
            : "Add a course description and syllabus for your students...";
        const coverLabel = isAssetMode ? "Asset Pack Banner" : "Set Course Cover";
        const introLabel = isAssetMode ? "Demo / Trailer Reel" : "Create Intro Video";

        courseMetaStepsContainer.innerHTML = `
            <div class="course-meta-group">
                <input type="text" id="courseTitleInput" class="course-title-input" placeholder="${titlePlaceholder}" value="${courseData.title || ''}">
                <div id="courseDescriptionEditor" class="course-description-editor" contenteditable="true" placeholder="${descPlaceholder}">${courseData.description || ''}</div>
            </div>
            <div class="pipeline-step-group">
                ${createStepElement('cover', coverLabel, 'ri-image-add-line', !!courseData.coverPostId)}
                ${createStepElement('intro', introLabel, 'ri-play-circle-line', !!courseData.introVideoId, true)}
            </div>
        `;

        // 2. Render content based on format mode
        courseSectionsContainer.innerHTML = '';

        if (isAssetMode) {
            // --- ASSET MODE: Distinct digital asset cards ---
            if (!courseData.assetItems || courseData.assetItems.length === 0) {
                courseSectionsContainer.innerHTML = `
                    <div style="padding: 24px; text-align: center; color: var(--text-muted); background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.12); border-radius: 10px;">
                        <i class="ri-box-3-line" style="font-size: 2rem; margin-bottom: 8px; color: #60a5fa; display:block;"></i>
                        <p style="margin: 0 0 6px 0; font-weight: 600; color: white;">No Digital Assets Added</p>
                        <p style="margin: 0; font-size: 0.85rem;">Click "Add Digital Asset Item" below to include downloadable 3D models, PDF books, or videos.</p>
                    </div>
                `;
            } else {
                courseData.assetItems.forEach((item, itemIndex) => {
                    const itemEl = document.createElement('div');
                    const isSelected = (activeAsset.assetIndex === itemIndex);
                    itemEl.className = `asset-item-card ${isSelected ? 'selected' : ''}`;
                    itemEl.dataset.assetIndex = itemIndex;

                    // Attached pills
                    let attachedHtml = '';
                    if (item.contentPostId) attachedHtml += `<span class="asset-file-pill video"><i class="ri-video-line"></i> Video Demo</span>`;
                    if (item.worksheetPostId) attachedHtml += `<span class="asset-file-pill pdf"><i class="ri-file-pdf-line"></i> PDF / eBook</span>`;
                    if (item.interactivePostId) attachedHtml += `<span class="asset-file-pill model"><i class="ri-cube-line"></i> 3D / Code</span>`;

                    itemEl.innerHTML = `
                        <div class="asset-card-top-row" style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="asset-index-badge"><i class="ri-box-3-line"></i> Asset #${itemIndex + 1}</span>
                            <button class="delete-asset-btn" data-asset-index="${itemIndex}" title="Remove this asset" style="background:none; border:none; color:#f87171; cursor:pointer; padding:4px;"><i class="ri-delete-bin-line"></i></button>
                        </div>
                        <input type="text" class="lesson-title-input asset-title-input" placeholder="Asset / File Name (e.g. Character_Rig.glb or Manual.pdf)" value="${item.title || ''}" data-asset-index="${itemIndex}">
                        <div class="pipeline-step-group horizontal">
                            ${createStepElement('content', 'Video Demo', 'ri-video-add-line', !!item.contentPostId, true)}
                            ${createStepElement('worksheet', 'PDF / eBook', 'ri-file-pdf-line', !!item.worksheetPostId, true)}
                            ${createStepElement('interactive', '3D / Interactive', 'ri-cube-line', !!item.interactivePostId, true)}
                        </div>
                        ${attachedHtml ? `<div class="asset-attached-pills">${attachedHtml}</div>` : ''}
                    `;
                    courseSectionsContainer.appendChild(itemEl);
                });
            }
        } else {
            // --- COURSE MODE: Sections with Lessons ---
            if (!courseData.sections || courseData.sections.length === 0) {
                courseData.sections = [{
                    title: "Section 1",
                    lessons: [{
                        title: "Lesson 1",
                        contentPostId: null,
                        worksheetPostId: null,
                        interactivePostId: null
                    }]
                }];
                saveCourse();
            }

            courseData.sections.forEach((section, sectionIndex) => {
                const sectionEl = document.createElement('div');
                sectionEl.className = 'section-card';
                sectionEl.innerHTML = `
                    <div class="section-header" style="display:flex; align-items:center; gap:8px;">
                        <input type="text" class="section-title-input" placeholder="Section Title" value="${section.title || ''}" data-section-index="${sectionIndex}" style="flex-grow:1;">
                        <button class="add-lesson-btn" data-section-index="${sectionIndex}" title="Add Lesson to this section"><i class="ri-add-line"></i> Lesson</button>
                        <button class="delete-section-btn" data-section-index="${sectionIndex}" title="Delete Section" style="background:none; border:none; color:#f87171; cursor:pointer; padding:6px; font-size:1rem; border-radius:6px; display:flex; align-items:center; justify-content:center;"><i class="ri-delete-bin-line"></i></button>
                    </div>
                    <div class="lesson-list">
                        ${(section.lessons || []).map((lesson, lessonIndex) => `
                            <div class="lesson-card ${activeLesson.sectionIndex == sectionIndex && activeLesson.lessonIndex == lessonIndex ? 'selected' : ''}" data-section-index="${sectionIndex}" data-lesson-index="${lessonIndex}">
                                 <div style="display:flex; align-items:center; gap:8px; width:100%; margin-bottom:10px;">
                                     <input type="text" class="lesson-title-input" placeholder="Lesson Title" value="${lesson.title || ''}" data-section-index="${sectionIndex}" data-lesson-index="${lessonIndex}" style="flex-grow:1;">
                                     <button class="delete-lesson-btn" data-section-index="${sectionIndex}" data-lesson-index="${lessonIndex}" title="Delete Lesson" style="background:none; border:none; color:#f87171; cursor:pointer; padding:4px 6px; font-size:0.95rem; border-radius:6px; flex-shrink:0; display:flex; align-items:center; justify-content:center;"><i class="ri-delete-bin-line"></i></button>
                                 </div>
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
        }
        
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
        activeAsset.assetIndex = null;
        renderPipeline();
        renderPreview();

        if (window.innerWidth <= 768 && typeof switchCourseTab === 'function') {
            switchCourseTab('preview');
        }
    }

    function setActiveAsset(assetIndex, fileType = 'content') {
        activeAsset.assetIndex = parseInt(assetIndex, 10);
        activeAsset.fileType = fileType;
        activeLesson.sectionIndex = null;
        activeLesson.lessonIndex = null;
        renderPipeline();
        renderPreview();

        if (window.innerWidth <= 768 && typeof switchCourseTab === 'function') {
            switchCourseTab('preview');
        }
    }

    function deselectActiveLesson() {
        activeLesson.sectionIndex = null;
        activeLesson.lessonIndex = null;
        renderPipeline();
        renderPreview();
    }

    function deselectActiveAsset() {
        activeAsset.assetIndex = null;
        activeAsset.fileType = 'content';
        renderPipeline();
        renderPreview();
    }

    function attachEventListeners() {
        // Course/Asset Title and Description
        const titleInput = document.getElementById('courseTitleInput');
        const descEditor = document.getElementById('courseDescriptionEditor');
        if(titleInput) titleInput.addEventListener('input', (e) => { courseData.title = e.target.value; saveCourse(); });
        if(descEditor) descEditor.addEventListener('input', (e) => { courseData.description = e.target.innerHTML; saveCourse(); });

        // Add Section / Add Asset button
        if(addSectionBtn) {
            addSectionBtn.onclick = addSection;
        }

        // Section Titles
        document.querySelectorAll('.section-title-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const sIdx = e.target.dataset.sectionIndex;
                if (courseData.sections[sIdx]) {
                    courseData.sections[sIdx].title = e.target.value;
                    saveCourse();
                }
            });
        });

        // Delete Section Buttons
        document.querySelectorAll('.delete-section-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sIdx = parseInt(btn.dataset.sectionIndex, 10);
                if (courseData.sections.length <= 1) {
                    alert("A course must have at least one section.");
                    return;
                }
                if (confirm(`Delete Section ${sIdx + 1} and all its lessons?`)) {
                    courseData.sections.splice(sIdx, 1);
                    if (activeLesson.sectionIndex === sIdx) {
                        activeLesson.sectionIndex = null;
                        activeLesson.lessonIndex = null;
                    } else if (activeLesson.sectionIndex > sIdx) {
                        activeLesson.sectionIndex--;
                    }
                    saveCourse();
                    renderPipeline();
                    renderPreview();
                }
            });
        });

        // Lesson Titles
        document.querySelectorAll('.lesson-title-input:not(.asset-title-input)').forEach(input => {
            input.addEventListener('input', (e) => {
                const sIdx = e.target.dataset.sectionIndex;
                const lIdx = e.target.dataset.lessonIndex;
                if (courseData.sections[sIdx]?.lessons[lIdx]) {
                    courseData.sections[sIdx].lessons[lIdx].title = e.target.value;
                    saveCourse();
                }
            });
        });

        // Delete Lesson Buttons
        document.querySelectorAll('.delete-lesson-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sIdx = parseInt(btn.dataset.sectionIndex, 10);
                const lIdx = parseInt(btn.dataset.lessonIndex, 10);
                if (confirm(`Delete this lesson?`)) {
                    courseData.sections[sIdx]?.lessons.splice(lIdx, 1);
                    if (activeLesson.sectionIndex === sIdx && activeLesson.lessonIndex === lIdx) {
                        activeLesson.sectionIndex = null;
                        activeLesson.lessonIndex = null;
                    } else if (activeLesson.sectionIndex === sIdx && activeLesson.lessonIndex > lIdx) {
                        activeLesson.lessonIndex--;
                    }
                    saveCourse();
                    renderPipeline();
                    renderPreview();
                }
            });
        });

        // Asset Title Inputs (Asset Mode)
        document.querySelectorAll('.asset-title-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = e.target.dataset.assetIndex;
                if (courseData.assetItems[idx]) {
                    courseData.assetItems[idx].title = e.target.value;
                    saveCourse();
                }
            });
        });

        // Delete Asset Item Buttons
        document.querySelectorAll('.delete-asset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const assetIndex = parseInt(btn.dataset.assetIndex, 10);
                if (confirm(`Remove Asset #${assetIndex + 1}?`)) {
                    courseData.assetItems.splice(assetIndex, 1);
                    if (activeAsset.assetIndex === assetIndex) {
                        activeAsset.assetIndex = null;
                    } else if (activeAsset.assetIndex > assetIndex) {
                        activeAsset.assetIndex--;
                    }
                    saveCourse();
                    renderPipeline();
                    renderPreview();
                }
            });
        });

        // Add Lesson in Course Mode
        document.querySelectorAll('.add-lesson-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sectionIndex = e.currentTarget.dataset.sectionIndex;
                addLesson(sectionIndex);
            });
        });

        // Lesson Card Clicks for Course Mode Preview
        document.querySelectorAll('.lesson-card:not(.asset-item-card)').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.pipeline-step') || e.target.closest('.delete-lesson-btn') || e.target.tagName.toLowerCase() === 'input') return;
                setActiveLesson(card.dataset.sectionIndex, card.dataset.lessonIndex);
            });
        });

        // Asset Item Card Clicks for Asset Mode Preview
        document.querySelectorAll('.asset-item-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.pipeline-step') || e.target.closest('.delete-asset-btn') || e.target.tagName.toLowerCase() === 'input') return;
                setActiveAsset(card.dataset.assetIndex);
            });
        });

        // Pipeline Step Clicks (Material Modal Trigger)
        document.querySelectorAll('.pipeline-step').forEach(step => {
            step.addEventListener('click', (e) => {
                e.stopPropagation();
                const stepId = e.currentTarget.dataset.stepId;
                const assetCard = e.currentTarget.closest('.asset-item-card');
                const lessonCard = e.currentTarget.closest('.lesson-card:not(.asset-item-card)');

                if (assetCard) {
                    const assetIndex = parseInt(assetCard.dataset.assetIndex, 10);
                    openMaterialModal({
                        format: 'asset',
                        stepId: stepId,
                        assetIndex: assetIndex
                    });
                } else if (lessonCard) {
                    const sectionIndex = parseInt(lessonCard.dataset.sectionIndex, 10);
                    const lessonIndex = parseInt(lessonCard.dataset.lessonIndex, 10);
                    openMaterialModal({
                        format: 'course',
                        stepId: stepId,
                        sectionIndex: sectionIndex,
                        lessonIndex: lessonIndex
                    });
                } else {
                    // Course / Asset level steps (cover, intro)
                    openMaterialModal({
                        format: courseData.format || 'course',
                        stepId: stepId
                    });
                }
            });
        });

        // Publish / Save Button
        const publishBtn = document.getElementById('publishCourseBtn');
        if (publishBtn) {
            publishBtn.onclick = handlePublish;
        }
    }

    // Material Modal Handler
    async function openMaterialModal(ctx) {
        currentStepModalContext = ctx;
        if (!materialModal) return;

        const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        let currentlyAttachedId = null;
        let stepName = 'Material';
        let stepIcon = 'ri-file-add-line';
        let studioDestination = 'xtraAnim'; // 'xtraAnim' or 'xtraBook'

        if (ctx.stepId === 'cover') {
            stepName = (ctx.format === 'asset') ? 'Asset Pack Cover Banner' : 'Course Cover Banner';
            stepIcon = 'ri-image-add-line';
            currentlyAttachedId = courseData.coverPostId;
            studioDestination = 'xtraAnim';
        } else if (ctx.stepId === 'intro') {
            stepName = (ctx.format === 'asset') ? 'Trailer / Demo Reel' : 'Course Intro Video';
            stepIcon = 'ri-play-circle-line';
            currentlyAttachedId = courseData.introVideoId;
            studioDestination = 'xtraAnim';
        } else if (ctx.format === 'asset' && ctx.assetIndex !== undefined) {
            const assetItem = courseData.assetItems?.[ctx.assetIndex];
            const itemName = assetItem?.title || `Asset #${ctx.assetIndex + 1}`;
            if (ctx.stepId === 'content') {
                stepName = `Video Demo for "${itemName}"`;
                stepIcon = 'ri-video-add-line';
                currentlyAttachedId = assetItem?.contentPostId;
                studioDestination = 'xtraAnim';
            } else if (ctx.stepId === 'worksheet') {
                stepName = `PDF / eBook for "${itemName}"`;
                stepIcon = 'ri-file-pdf-line';
                currentlyAttachedId = assetItem?.worksheetPostId;
                studioDestination = 'xtraBook';
            } else if (ctx.stepId === 'interactive') {
                stepName = `3D / Interactive for "${itemName}"`;
                stepIcon = 'ri-cube-line';
                currentlyAttachedId = assetItem?.interactivePostId;
                studioDestination = 'xtraAnim';
            }
        } else if (ctx.sectionIndex !== undefined && ctx.lessonIndex !== undefined) {
            const lesson = courseData.sections?.[ctx.sectionIndex]?.lessons?.[ctx.lessonIndex];
            const lessonName = lesson?.title || `Lesson ${ctx.lessonIndex + 1}`;
            if (ctx.stepId === 'content') {
                stepName = `Video for "${lessonName}"`;
                stepIcon = 'ri-video-add-line';
                currentlyAttachedId = lesson?.contentPostId;
                studioDestination = 'xtraAnim';
            } else if (ctx.stepId === 'worksheet') {
                stepName = `Worksheet / Notes for "${lessonName}"`;
                stepIcon = 'ri-file-text-line';
                currentlyAttachedId = lesson?.worksheetPostId;
                studioDestination = 'xtraBook';
            } else if (ctx.stepId === 'interactive') {
                stepName = `Interactive 3D / Graph for "${lessonName}"`;
                stepIcon = 'ri-bar-chart-2-line';
                currentlyAttachedId = lesson?.interactivePostId;
                studioDestination = 'xtraAnim';
            }
        }

        materialModalTitle.textContent = stepName;
        materialModalSubtitle.textContent = `Choose an option to add material to this step`;
        materialModalIcon.innerHTML = `<i class="${stepIcon}"></i>`;

        // Check if currently attached
        const attachedPost = currentlyAttachedId ? allPosts.find(p => String(p.id) === String(currentlyAttachedId)) : null;
        if (attachedPost) {
            currentAttachedBanner.style.display = 'flex';
            attachedItemTitle.textContent = attachedPost.title || 'Untitled Creation';
            const mediaUrl = attachedPost.video_url || attachedPost.videoUrl || '';
            if (attachedPost.media_type?.startsWith('video')) {
                attachedItemThumb.innerHTML = `<video src="${mediaUrl}" style="width:100%; height:100%; object-fit:cover;" muted></video>`;
            } else if (mediaUrl) {
                attachedItemThumb.innerHTML = `<img src="${mediaUrl}" style="width:100%; height:100%; object-fit:cover;" alt="thumb">`;
            } else {
                attachedItemThumb.innerHTML = `<i class="${stepIcon}" style="color:#818cf8; font-size:1.4rem;"></i>`;
            }
        } else {
            currentAttachedBanner.style.display = 'none';
        }

        // Studio Action Button
        createStudioDesc.textContent = studioDestination === 'xtraBook'
            ? 'Open XtraBook to write LaTeX equations, books, notes or export PDF'
            : 'Open XtraAnim to create 3D animations, Manim formulas, Desmos graphs, or models';
        
        openStudioActionBtn.onclick = () => {
            const courseContext = {
                from: 'course',
                format: courseData.format || 'course',
                stepId: ctx.stepId,
                sectionIndex: ctx.sectionIndex,
                lessonIndex: ctx.lessonIndex,
                assetIndex: ctx.assetIndex,
                courseId: editingCourseId
            };
            localStorage.setItem('courseContext', JSON.stringify(courseContext));
            saveCourse();
            materialModal.style.display = 'none';
            if (studioDestination === 'xtraBook') {
                window.location.href = '/views/xtraBook.html';
            } else {
                window.location.href = '/views/xtraAnim.html';
            }
        };

        // Detach Material Action
        detachMaterialBtn.onclick = () => {
            if (ctx.stepId === 'cover') {
                courseData.coverPostId = null;
            } else if (ctx.stepId === 'intro') {
                courseData.introVideoId = null;
            } else if (ctx.format === 'asset' && ctx.assetIndex !== undefined) {
                if (courseData.assetItems?.[ctx.assetIndex]) {
                    courseData.assetItems[ctx.assetIndex][`${ctx.stepId}PostId`] = null;
                }
            } else if (ctx.sectionIndex !== undefined && ctx.lessonIndex !== undefined) {
                const lesson = courseData.sections?.[ctx.sectionIndex]?.lessons?.[ctx.lessonIndex];
                if (lesson) {
                    lesson[`${ctx.stepId}PostId`] = null;
                }
            }
            saveCourse();
            renderPipeline();
            renderPreview();
            materialModal.style.display = 'none';
        };

        // Close Modal Handlers
        closeMaterialModalBtn.onclick = () => { materialModal.style.display = 'none'; };
        materialModal.onclick = (e) => { if (e.target === materialModal) materialModal.style.display = 'none'; };

        // Populate Creations Grid
        await renderCreationsGrid();

        materialModal.style.display = 'flex';
    }

    async function renderCreationsGrid(searchTerm = '') {
        if (!materialCreationsGrid) return;
        materialCreationsGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:20px;">Loading creations...</div>';

        const posts = await syncUserPosts();
        // Filter out courses and assets themselves from being attached inside lessons
        let filtered = posts.filter(p => p.format !== 'course' && p.format !== 'asset');

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(p => (p.title || '').toLowerCase().includes(term));
        }

        if (filtered.length === 0) {
            materialCreationsGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:20px;">No creations found. Click "Open Studio" above to create one!</div>';
            return;
        }

        materialCreationsGrid.innerHTML = '';
        filtered.forEach(post => {
            const card = document.createElement('div');
            card.style.cssText = 'background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 8px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 6px;';
            
            const mediaUrl = post.video_url || post.videoUrl || '';
            let thumb = '';
            if (post.media_type?.startsWith('video')) {
                thumb = `<video src="${mediaUrl}" style="width:100%; height:85px; object-fit:cover; border-radius:6px; background:#000;" muted playsinline></video>`;
            } else if (mediaUrl) {
                thumb = `<img src="${mediaUrl}" style="width:100%; height:85px; object-fit:cover; border-radius:6px; background:#000;" alt="thumb">`;
            } else {
                thumb = `<div style="width:100%; height:85px; display:flex; align-items:center; justify-content:center; background:#1e2230; border-radius:6px; color:#818cf8;"><i class="ri-file-text-line" style="font-size:1.5rem;"></i></div>`;
            }

            card.innerHTML = `
                <div style="position:relative;">
                    ${thumb}
                    <span style="position:absolute; bottom:4px; right:4px; font-size:0.65rem; background:rgba(0,0,0,0.7); color:#e4e4e7; padding:2px 5px; border-radius:4px; font-weight:600; text-transform:uppercase;">${post.format || 'Item'}</span>
                </div>
                <span style="color:white; font-size:0.82rem; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${post.title || 'Untitled'}</span>
            `;

            card.addEventListener('mouseenter', () => {
                card.style.borderColor = 'rgba(99,102,241,0.6)';
                card.style.background = 'rgba(99,102,241,0.08)';
                const vid = card.querySelector('video');
                if (vid) vid.play().catch(() => {});
            });
            card.addEventListener('mouseleave', () => {
                card.style.borderColor = 'rgba(255,255,255,0.08)';
                card.style.background = 'rgba(255,255,255,0.04)';
                const vid = card.querySelector('video');
                if (vid) vid.pause();
            });

            card.addEventListener('click', () => {
                attachPostToCurrentStep(post);
            });

            materialCreationsGrid.appendChild(card);
        });
    }

    if (materialSearchInput) {
        materialSearchInput.addEventListener('input', (e) => {
            renderCreationsGrid(e.target.value);
        });
    }

    function attachPostToCurrentStep(post) {
        if (!currentStepModalContext) return;
        const ctx = currentStepModalContext;

        if (ctx.stepId === 'cover') {
            courseData.coverPostId = post.id;
        } else if (ctx.stepId === 'intro') {
            courseData.introVideoId = post.id;
        } else if (ctx.format === 'asset' && ctx.assetIndex !== undefined) {
            if (!courseData.assetItems[ctx.assetIndex]) {
                courseData.assetItems[ctx.assetIndex] = { title: `Asset #${ctx.assetIndex + 1}` };
            }
            courseData.assetItems[ctx.assetIndex][`${ctx.stepId}PostId`] = post.id;
        } else if (ctx.sectionIndex !== undefined && ctx.lessonIndex !== undefined) {
            const lesson = courseData.sections?.[ctx.sectionIndex]?.lessons?.[ctx.lessonIndex];
            if (lesson) {
                lesson[`${ctx.stepId}PostId`] = post.id;
            }
        }

        saveCourse();
        renderPipeline();
        renderPreview();
        if (materialModal) materialModal.style.display = 'none';
    }

    async function handlePublish() {
        const isAssetMode = (courseData.format === 'asset');
        const entityName = isAssetMode ? "Asset Pack" : "Course";

        if (!courseData.title || courseData.title === "Untitled Course" || courseData.title === "Untitled Asset Pack") {
            alert(`Please provide a ${entityName} title.`);
            return;
        }
        if (!courseData.coverPostId) {
            alert(`Please set a ${entityName} cover banner.`);
            return;
        }

        const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        const coverPost = allPosts.find(p => p.id == courseData.coverPostId);

        if (!coverPost) {
            alert("The selected cover post could not be found. Please set a new cover.");
            return;
        }

        const publishBtn = document.getElementById('publishCourseBtn');
        const originalBtnHtml = publishBtn ? publishBtn.innerHTML : '';
        if (publishBtn) {
            publishBtn.disabled = true;
            publishBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> <span class="publish-btn-text">${editingCourseId ? 'Saving...' : 'Publishing...'}</span>`;
        }

        try {
            let user = null;
            const client = await getSupabaseClient();
            if (client) {
                try {
                    const { data } = await client.auth.getUser();
                    user = data?.user;
                } catch(e) {}
            }

            const newPostData = {
                title: courseData.title,
                description: courseData.description || (isAssetMode ? 'Digital Asset Pack & Downloads' : 'Interactive Course'),
                video_url: coverPost.video_url || coverPost.videoUrl || '',
                media_type: coverPost.media_type || coverPost.mediaType || 'video/mp4',
                format: courseData.format || 'course',
                source: {
                    ...courseData,
                    is_for_sale: true,
                    price: isAssetMode ? 19.99 : 29.99
                },
                user_id: user ? user.id : null,
                original_id: null,
                pdf_url: '',
                username: localStorage.getItem('username') || 'Creator',
                avatar_url: localStorage.getItem('avatarUrl') || ''
            };

            let savedPost = null;
            if (editingCourseId) {
                // Updating an existing course/asset post
                if (client && user) {
                    const { data, error } = await client
                        .from('posts')
                        .update(newPostData)
                        .eq('id', editingCourseId)
                        .select();
                    if (!error && data && data.length > 0) {
                        savedPost = data[0];
                    } else if (error) {
                        console.error("Supabase update error:", error);
                    }
                }

                if (!savedPost) {
                    savedPost = {
                        id: editingCourseId,
                        ...newPostData,
                        updated_at: new Date().toISOString()
                    };
                }

                const postIndex = allPosts.findIndex(p => String(p.id) === String(editingCourseId));
                if (postIndex > -1) {
                    allPosts[postIndex] = savedPost;
                } else {
                    allPosts.push(savedPost);
                }
                localStorage.setItem('userPosts', JSON.stringify(allPosts));
                localStorage.removeItem('xtraCourseDraft');

                alert(`${entityName} updated successfully! Taking you back to details.`);
                window.location.href = `/views/courseView.html?id=${editingCourseId}`;
            } else {
                // Publishing a brand new course/asset post
                if (client && user) {
                    const { data, error } = await client
                        .from('posts')
                        .insert([newPostData])
                        .select();
                    if (!error && data && data.length > 0) {
                        savedPost = data[0];
                    } else if (error) {
                        console.error("Supabase insert error:", error);
                    }
                }

                if (!savedPost) {
                    savedPost = {
                        id: `${courseData.format || 'course'}_${Date.now()}`,
                        ...newPostData,
                        created_at: new Date().toISOString()
                    };
                }

                allPosts.push(savedPost);
                localStorage.setItem('userPosts', JSON.stringify(allPosts));
                localStorage.removeItem('xtraCourseDraft');

                alert(`${entityName} published! You will now be taken to the store.`);
                window.location.href = '/views/store.html';
            }
        } catch (err) {
            console.error("Failed to publish:", err);
            alert("Error saving: " + err.message);
            if (publishBtn) {
                publishBtn.disabled = false;
                publishBtn.innerHTML = originalBtnHtml;
            }
        }
    }

    function renderPreview() {
        if (typeof window.createPostElement !== 'function') {
            showPreviewLoading();
            return;
        }

        try {
            if (courseData.format === 'asset') {
                renderAssetPreview();
                return;
            }

            // COURSE MODE PREVIEW
            if (activeLesson.sectionIndex === null || activeLesson.lessonIndex === null) {
                renderCourseOverview();
                return;
            }

            const lesson = courseData.sections[activeLesson.sectionIndex]?.lessons[activeLesson.lessonIndex];
            if (!lesson) {
                previewContent.innerHTML = `
                    <div class="preview-placeholder-card">
                        <i class="ri-eye-off-line"></i>
                        <p>The selected lesson could not be found. Please select another lesson.</p>
                    </div>
                `;
                return;
            }

            const lessonTitle = lesson.title || 'Untitled Lesson';

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
                        <i class="ri-video-add-line" style="font-size: 2.5rem; margin-bottom: 15px; color:#818cf8;"></i>
                        <p style="font-weight: 500; line-height: 1.5;">This lesson has no content yet.<br>Click "Add Video" in the structure panel.</p>
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
                    }
                    supportingContentContainer.appendChild(iconEl);
                });
            }

        } catch (error) {
            console.error("Failed to render preview:", error);
            previewContent.innerHTML = `
                <div class="preview-placeholder-card">
                    <i class="ri-error-warning-line" style="font-size: 2.5rem; color: #ef4444;"></i>
                    <p style="color: #ef4444;">Preview Error</p>
                </div>
            `;
        }
    }

    // --- ASSET MODE PREVIEW ENGINE ---
    function renderAssetPreview() {
        const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');

        if (activeAsset.assetIndex !== null) {
            // A SPECIFIC ASSET ITEM IS SELECTED
            const item = courseData.assetItems[activeAsset.assetIndex];
            if (!item) {
                deselectActiveAsset();
                return;
            }

            const contentPost = item.contentPostId ? allPosts.find(p => p.id == item.contentPostId) : null;
            const worksheetPost = item.worksheetPostId ? allPosts.find(p => p.id == item.worksheetPostId) : null;
            const interactivePost = item.interactivePostId ? allPosts.find(p => p.id == item.interactivePostId) : null;

            // Pick active file post based on fileType
            let activePost = null;
            let activeTypeLabel = 'Video Demo';

            if (activeAsset.fileType === 'worksheet' && worksheetPost) {
                activePost = worksheetPost;
                activeTypeLabel = 'PDF / eBook';
            } else if (activeAsset.fileType === 'interactive' && interactivePost) {
                activePost = interactivePost;
                activeTypeLabel = '3D / Interactive';
            } else if (activeAsset.fileType === 'content' && contentPost) {
                activePost = contentPost;
                activeTypeLabel = 'Video Demo';
            } else {
                // Fallback to first available
                if (contentPost) { activePost = contentPost; activeTypeLabel = 'Video Demo'; }
                else if (worksheetPost) { activePost = worksheetPost; activeTypeLabel = 'PDF / eBook'; }
                else if (interactivePost) { activePost = interactivePost; activeTypeLabel = '3D / Interactive'; }
            }

            const downloadUrl = activePost ? (activePost.pdf_url || activePost.video_url || activePost.videoUrl || '') : '';
            const downloadFilename = (item.title || 'asset_file').replace(/[^a-zA-Z0-9_-]/g, '_');

            previewContent.innerHTML = `
                <div class="lesson-preview-card" style="border: 1px solid var(--border-glass); border-radius: 12px; overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.6); max-height: 90vh;">
                    <!-- Main Viewer: Prominent and scrollable -->
                    <div class="lesson-preview-content" style="min-height: 260px; max-height: 500px; overflow-y: auto;"></div>

                    <!-- Attachment Switcher Tabs: Placed at the bottom of preview -->
                    <div class="asset-tabs-bottom" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                            <button class="asset-tab-btn ${activeTypeLabel === 'Video Demo' ? 'active' : ''}" data-file-type="content" ${!contentPost ? 'disabled style="opacity:0.35; cursor:not-allowed;"' : ''}>
                                <i class="ri-video-line"></i> Video Demo ${contentPost ? '<i class="ri-check-line" style="color:#10b981;"></i>' : ''}
                            </button>
                            <button class="asset-tab-btn ${activeTypeLabel === 'PDF / eBook' ? 'active' : ''}" data-file-type="worksheet" ${!worksheetPost ? 'disabled style="opacity:0.35; cursor:not-allowed;"' : ''}>
                                <i class="ri-file-pdf-line"></i> PDF / eBook ${worksheetPost ? '<i class="ri-check-line" style="color:#10b981;"></i>' : ''}
                            </button>
                            <button class="asset-tab-btn ${activeTypeLabel === '3D / Interactive' ? 'active' : ''}" data-file-type="interactive" ${!interactivePost ? 'disabled style="opacity:0.35; cursor:not-allowed;"' : ''}>
                                <i class="ri-cube-line"></i> 3D / Code ${interactivePost ? '<i class="ri-check-line" style="color:#10b981;"></i>' : ''}
                            </button>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
                            ${downloadUrl ? `
                                <a href="${downloadUrl}" download="${downloadFilename}" target="_blank" class="btn-download-file" style="padding:6px 14px; font-size:0.8rem;" title="Download this file">
                                    <i class="ri-download-2-line"></i> <span class="desktop-only">Download</span>
                                </a>
                            ` : ''}
                            <button id="deselectAssetBtn" class="icon-btn" title="Back to Asset Showcase" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px 10px;"><i class="ri-close-line"></i></button>
                        </div>
                    </div>
                </div>
            `;

            const mainContentContainer = previewContent.querySelector('.lesson-preview-content');

            if (activePost) {
                const { element: postElement, init: initPost } = window.createPostElement(activePost, 'course-preview');
                mainContentContainer.innerHTML = '';
                mainContentContainer.appendChild(postElement);
                if (initPost) initPost();
            } else {
                mainContentContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; padding: 30px;">
                        <i class="ri-box-3-line" style="font-size: 3rem; margin-bottom: 15px; color: #60a5fa;"></i>
                        <p style="font-weight: 600; color:white; font-size:1.1rem; margin:0 0 6px 0;">No Files Attached to this Asset</p>
                        <p style="font-size: 0.85rem; max-width: 320px; line-height: 1.5;">Click Video, PDF, or 3D buttons in the left panel to attach creation files to this asset slot.</p>
                    </div>
                `;
            }

        } else {
            // ASSET PACK SHOWCASE (OVERVIEW)
            const coverPost = courseData.coverPostId ? allPosts.find(p => p.id == courseData.coverPostId) : null;
            const introPost = courseData.introVideoId ? allPosts.find(p => p.id == courseData.introVideoId) : null;

            previewContent.innerHTML = `
                <div class="lesson-preview-card" style="border-color: rgba(59,130,246,0.3); box-shadow: 0 15px 40px rgba(0,0,0,0.6);">
                    <div class="lesson-preview-header" style="background: rgba(59,130,246,0.06);">
                        <div>
                            <span class="asset-preview-badge"><i class="ri-box-3-line"></i> Digital Asset Pack Showcase</span>
                            <h3 class="lesson-preview-title">${courseData.title || 'Untitled Asset Pack'}</h3>
                        </div>
                    </div>

                    <!-- Showcase Viewer (Banner/Trailer) -->
                    <div class="lesson-preview-content"></div>

                    <div class="lesson-supporting-content-wrapper" style="display: none;">
                        <div class="supporting-content-header">Trailer / Demo</div>
                        <div class="lesson-supporting-content"></div>
                    </div>
                </div>
            `;

            const showcaseContentContainer = previewContent.querySelector('.lesson-preview-content');
            const supportingContentContainer = previewContent.querySelector('.lesson-supporting-content');
            const supportingWrapper = previewContent.querySelector('.lesson-supporting-content-wrapper');

            if (coverPost) {
                const { element: postElement, init: initPost } = window.createPostElement(coverPost, 'course-preview');
                showcaseContentContainer.innerHTML = '';
                showcaseContentContainer.appendChild(postElement);
                if (initPost) initPost();
            } else {
                showcaseContentContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; padding: 20px;">
                        <i class="ri-image-add-line" style="font-size: 2.5rem; margin-bottom: 10px; color: #60a5fa;"></i>
                        <p style="font-weight: 500; line-height: 1.5; color: white;">This asset pack has no banner yet.<br><span style="color:var(--text-muted); font-size:0.85rem;">Click "Asset Pack Banner" in the left panel to set one.</span></p>
                    </div>
                `;
            }

            if (introPost) {
                supportingWrapper.style.display = 'block';
                supportingContentContainer.innerHTML = '';
                const iconEl = document.createElement('div');
                iconEl.className = 'supporting-material-icon';
                iconEl.innerHTML = `
                    <div class="material-icon-box"><i class="ri-movie-line"></i></div>
                    <div class="material-title">${introPost.title || 'Trailer Reel'}</div>
                `;
                iconEl.title = `Trailer: ${introPost.title}`;
                supportingContentContainer.appendChild(iconEl);
            }
        }
    }

    function renderAttachmentRow(label, post, iconClass) {
        if (!post) {
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:rgba(255,255,255,0.02); border-radius:6px; font-size:0.8rem; color:#71717a;">
                    <span><i class="${iconClass}"></i> ${label}</span>
                    <span style="font-size:0.7rem; font-style:italic;">Not attached</span>
                </div>
            `;
        }
        const url = post.pdf_url || post.video_url || post.videoUrl || '';
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:6px; font-size:0.8rem; color:white;">
                <span style="display:flex; align-items:center; gap:6px;"><i class="${iconClass}" style="color:#60a5fa;"></i> ${post.title || label}</span>
                ${url ? `
                    <a href="${url}" download="${(post.title || 'download').replace(/[^a-zA-Z0-9_-]/g, '_')}" target="_blank" class="btn-download-file" style="padding:3px 8px; font-size:0.72rem; border-radius:5px;">
                        <i class="ri-download-2-line"></i> Download
                    </a>
                ` : '<span style="color:#10b981; font-size:0.72rem;">Attached</span>'}
            </div>
        `;
    }

    function renderCourseOverview() {
        previewContent.innerHTML = '';
        const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        const coverPost = courseData.coverPostId ? allPosts.find(p => p.id == courseData.coverPostId) : null;
        const introPost = courseData.introVideoId ? allPosts.find(p => p.id == courseData.introVideoId) : null;

        previewContent.innerHTML = `
            <div class="lesson-preview-card">
                <div class="lesson-preview-header">
                    <div>
                        <span class="lesson-preview-type">Course Overview</span>
                        <h3 class="lesson-preview-title">${courseData.title}</h3>
                    </div>
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

        if (introPost) {
            supportingWrapper.style.display = 'block';
            supportingContentContainer.innerHTML = '';
            const iconEl = document.createElement('div');
            iconEl.className = 'supporting-material-icon';
            iconEl.innerHTML = `
                <div class="material-icon-box"><i class="ri-play-circle-line"></i></div>
                <div class="material-title">${introPost.title}</div>
            `;
            iconEl.title = `Intro Video: ${introPost.title}`;
            supportingContentContainer.appendChild(iconEl);
        }

        if (initCover) initCover();
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

    function addSection() {
        if (courseData.format === 'asset') {
            courseData.assetItems.push({
                title: `Asset ${courseData.assetItems.length + 1}`,
                contentPostId: null,
                worksheetPostId: null,
                interactivePostId: null
            });
        } else {
            courseData.sections.push({
                title: `Section ${courseData.sections.length + 1}`,
                lessons: []
            });
        }
        saveCourse();
        renderPipeline();
        renderPreview();
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
        console.log("Studio draft saved.", courseData);
    }

    async function loadCourse() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        const urlMode = urlParams.get('mode');

        // Sync posts from Supabase so we have all creations & cover/intro media available
        let allPosts = await syncUserPosts();

        if (urlId) {
            editingCourseId = urlId;
            let post = allPosts.find(p => String(p.id) === String(urlId));

            if (!post) {
                const client = await getSupabaseClient();
                if (client) {
                    try {
                        const { data, error } = await client.from('posts').select('*').eq('id', urlId).single();
                        if (!error && data) {
                            post = data;
                            allPosts.push(data);
                            localStorage.setItem('userPosts', JSON.stringify(allPosts));
                        }
                    } catch (e) {
                        console.warn("Could not fetch course for editing from Supabase:", e);
                    }
                }
            }

            if (post) {
                const savedDraft = localStorage.getItem('xtraCourseDraft');
                let parsedDraft = null;
                if (savedDraft) {
                    try { parsedDraft = JSON.parse(savedDraft); } catch(e) {}
                }

                if (parsedDraft && String(parsedDraft._editingId) === String(urlId)) {
                    courseData = parsedDraft;
                } else {
                    let src = post.source;
                    if (typeof src === 'string') {
                        try { src = JSON.parse(src); } catch(e) { src = {}; }
                    }
                    src = src || {};

                    courseData = {
                        title: post.title || src.title || (post.format === 'asset' ? "Untitled Asset Pack" : "Untitled Course"),
                        description: post.description || src.description || "",
                        format: post.format || src.format || urlMode || "course",
                        coverPostId: src.coverPostId || post.coverPostId || src.cover_post_id || null,
                        introVideoId: src.introVideoId || post.introVideoId || src.intro_video_id || null,
                        sections: src.sections || post.sections || [],
                        assetItems: src.assetItems || post.assetItems || [],
                        _editingId: urlId
                    };
                    saveCourse();
                }
            }
        }

        if (!editingCourseId) {
            const savedDraft = localStorage.getItem('xtraCourseDraft');
            if (savedDraft) {
                try {
                    courseData = JSON.parse(savedDraft);
                    if (courseData._editingId) {
                        editingCourseId = courseData._editingId;
                    }
                } catch(e) {}
            }
        }

        if (!courseData.format) courseData.format = urlMode || 'course';
        if (!courseData.assetItems) courseData.assetItems = [];
        if (!courseData.sections) courseData.sections = [];
        console.log("Studio loaded:", courseData, "editingCourseId:", editingCourseId);

        const courseContextRaw = localStorage.getItem('courseContext');
        if (courseContextRaw) {
            try {
                const courseContext = JSON.parse(courseContextRaw);
                if (courseContext.format === 'asset' && courseContext.assetIndex !== undefined) {
                    activeAsset = { 
                        assetIndex: parseInt(courseContext.assetIndex, 10), 
                        fileType: courseContext.stepId || 'content' 
                    };
                    console.log("Restored active asset from studio context:", activeAsset);
                } else if (courseContext.sectionIndex !== undefined && courseContext.lessonIndex !== undefined) {
                    activeLesson = { 
                        sectionIndex: parseInt(courseContext.sectionIndex, 10), 
                        lessonIndex: parseInt(courseContext.lessonIndex, 10) 
                    };
                    console.log("Restored active lesson from studio context:", activeLesson);
                }
            } catch(e) {}
            localStorage.removeItem('courseContext');
        } else if (courseData.format !== 'asset' && courseData.sections?.length > 0 && courseData.sections[0]?.lessons?.length > 0) {
            if(activeLesson.sectionIndex === null) activeLesson = { sectionIndex: 0, lessonIndex: 0 };
        }

        updateModeLabels();
        renderPipeline();
        renderPreview();
    }

    // Initial Load
    loadCourse();
});