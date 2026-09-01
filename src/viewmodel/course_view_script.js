document.addEventListener('DOMContentLoaded', () => {
    const lessonContentDisplay = document.getElementById('lessonContentDisplay');
    const lessonSupportingMaterials = document.getElementById('lessonSupportingMaterials');
    const curriculumPanelHeader = document.querySelector('.curriculum-panel-header');
    const curriculumList = document.getElementById('curriculum-list');
    const courseViewTitleHeader = document.getElementById('courseViewTitleHeader');

    let currentCourse = null;
    let activeLesson = { sectionIndex: null, lessonIndex: null, assetIndex: null };
    let activeContentType = 'content'; // 'content', 'worksheet', 'interactive'
    let flatLessonList = [];

    // ============================================================
    // 1. SUPABASE CLIENT & DATA HELPERS
    // ============================================================
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

    // ============================================================
    // 2. STUDENT PROGRESS & CHECKLIST ENGINE
    // ============================================================
    function getCourseProgress(courseId) {
        if (!courseId) return {};
        try {
            return JSON.parse(localStorage.getItem(`xtraCourseProgress_${courseId}`)) || {};
        } catch(e) {
            return {};
        }
    }

    function saveLessonCompleted(courseId, lessonKey, isCompleted) {
        if (!courseId || !lessonKey) return;
        const progress = getCourseProgress(courseId);
        if (isCompleted) {
            progress[lessonKey] = true;
        } else {
            delete progress[lessonKey];
        }
        localStorage.setItem(`xtraCourseProgress_${courseId}`, JSON.stringify(progress));
        updateProgressUI();
    }

    function updateProgressUI() {
        if (!currentCourse) return;
        const progress = getCourseProgress(currentCourse.id);
        const totalItems = flatLessonList.length;
        const completedCount = flatLessonList.filter(item => Boolean(progress[item.key])).length;
        const percentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

        // Circular Header Progress Ring
        const headerProgressRing = document.getElementById('headerProgressRing');
        const headerProgressText = document.getElementById('headerProgressText');
        const headerProgressCount = document.getElementById('headerProgressCount');
        const courseHeaderProgress = document.getElementById('courseHeaderProgress');

        if (headerProgressRing) {
            const circumference = 84.823; // 2 * PI * 13.5
            const offset = circumference - (percentage / 100) * circumference;
            headerProgressRing.style.strokeDashoffset = offset;
        }
        if (headerProgressText) headerProgressText.textContent = `${percentage}%`;
        if (headerProgressCount) headerProgressCount.textContent = `${completedCount} / ${totalItems}`;
        if (courseHeaderProgress) {
            courseHeaderProgress.title = `Course Progress: ${percentage}% (${completedCount} of ${totalItems} lessons completed)`;
        }

        // Update checkboxes in DOM
        document.querySelectorAll('.curriculum-lesson-item').forEach(itemEl => {
            const key = itemEl.dataset.lessonKey;
            const isDone = Boolean(progress[key]);
            itemEl.classList.toggle('completed', isDone);
            const icon = itemEl.querySelector('.lesson-check-btn i');
            if (icon) {
                icon.className = isDone ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line';
            }
        });
    }

    // ============================================================
    // 3. MAIN COURSE DETAILS LOADER
    // ============================================================
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
            // Built-in catalog courses
            const CATALOG_COURSES = {
                'course_quantum_mechanics': {
                    id: 'course_quantum_mechanics',
                    title: 'Quantum Wave Mechanics Masterclass',
                    format: 'course',
                    username: 'Prof. Alistair Vance',
                    price: '24.99',
                    description: 'Explore wave-particle duality, Schrödinger equation, wave packets, and quantum tunneling with interactive simulations.',
                    source: {
                        author: 'Prof. Alistair Vance',
                        sections: [
                            {
                                title: 'Module 1: Foundations of Quantum State',
                                lessons: [
                                    { title: '1.1 Wave-Particle Duality & De Broglie Waves', desc: 'Understanding matter waves and probabilistic wavefunctions.' },
                                    { title: '1.2 Time-Dependent Schrödinger Equation', desc: 'Derivation and Hamiltonian operator formulation.' },
                                    { title: '1.3 Interactive Wave Packet Dispersion Simulation', desc: 'Observe Gaussian wave packet spread in free space.' }
                                ]
                            },
                            {
                                title: 'Module 2: Potential Wells & Tunneling',
                                lessons: [
                                    { title: '2.1 Particle in a 1D Box (Infinite Well)', desc: 'Quantized energy levels and nodal probability densities.' },
                                    { title: '2.2 Quantum Tunneling Through Finite Barriers', desc: 'Evanescent wave attenuation and transmission coefficients.' },
                                    { title: '2.3 Harmonic Oscillator & Ladder Operators', desc: 'Hermite polynomials and ground state zero-point energy.' }
                                ]
                            }
                        ]
                    }
                },
                'prod_quantum_mastery': {
                    id: 'prod_quantum_mastery',
                    title: 'Quantum Wave Mechanics Masterclass',
                    format: 'course',
                    username: 'Prof. Alistair Vance',
                    price: '24.99',
                    description: 'Explore wave-particle duality, Schrödinger equation, wave packets, and quantum tunneling with interactive simulations.',
                    source: {
                        author: 'Prof. Alistair Vance',
                        sections: [
                            {
                                title: 'Module 1: Foundations of Quantum State',
                                lessons: [
                                    { title: '1.1 Wave-Particle Duality & De Broglie Waves', desc: 'Understanding matter waves and probabilistic wavefunctions.' },
                                    { title: '1.2 Time-Dependent Schrödinger Equation', desc: 'Derivation and Hamiltonian operator formulation.' },
                                    { title: '1.3 Interactive Wave Packet Dispersion Simulation', desc: 'Observe Gaussian wave packet spread in free space.' }
                                ]
                            },
                            {
                                title: 'Module 2: Potential Wells & Tunneling',
                                lessons: [
                                    { title: '2.1 Particle in a 1D Box (Infinite Well)', desc: 'Quantized energy levels and nodal probability densities.' },
                                    { title: '2.2 Quantum Tunneling Through Finite Barriers', desc: 'Evanescent wave attenuation and transmission coefficients.' },
                                    { title: '2.3 Harmonic Oscillator & Ladder Operators', desc: 'Hermite polynomials and ground state zero-point energy.' }
                                ]
                            }
                        ]
                    }
                },
                'course_orbital_mechanics': {
                    id: 'course_orbital_mechanics',
                    title: 'Orbital Mechanics & Astrodynamics',
                    format: 'course',
                    username: 'Dr. Elena Rostova',
                    price: '19.99',
                    description: 'Keplerian two-body dynamics, Hohmann transfer orbits, Lagrange points, and gravity assists in 3D.',
                    source: {
                        author: 'Dr. Elena Rostova',
                        sections: [
                            {
                                title: 'Module 1: Keplerian Orbits & Conic Sections',
                                lessons: [
                                    { title: '1.1 Vis-Viva Equation & Orbital Energy', desc: 'Elliptic, parabolic, and hyperbolic trajectory calculus.' },
                                    { title: '1.2 Six Classical Orbital Elements (COEs)', desc: 'Semi-major axis, eccentricity, inclination, RAAN, arg of periapsis.' }
                                ]
                            },
                            {
                                title: 'Module 2: Orbital Transfers & Interplanetary Trajectories',
                                lessons: [
                                    { title: '2.1 Hohmann & Bi-elliptic Transfers', desc: 'Calculating Delta-V budgets for coplanar orbital maneuvers.' },
                                    { title: '2.2 Three-Body Problem & Lagrange Points (L1-L5)', desc: 'Effective potential contours and halo orbits.' }
                                ]
                            }
                        ]
                    }
                },
                'course_fluid_dynamics': {
                    id: 'course_fluid_dynamics',
                    title: 'Computational Fluid Dynamics & Navier-Stokes',
                    format: 'course',
                    username: 'XtraPath STEM Faculty',
                    price: '29.99',
                    description: 'Navier-Stokes equations, Reynolds transport theorem, vorticity dynamics, and turbulent boundary layers.',
                    source: {
                        author: 'XtraPath STEM Faculty',
                        sections: [
                            {
                                title: 'Module 1: Continuum Mechanics & Governing Equations',
                                lessons: [
                                    { title: '1.1 Continuity Equation & Mass Conservation', desc: 'Incompressible velocity divergence.' },
                                    { title: '1.2 Navier-Stokes Momentum Equations', desc: 'Viscous stress tensor, convective acceleration, and pressure gradient.' }
                                ]
                            },
                            {
                                title: 'Module 2: Vorticity & Aerodynamics',
                                lessons: [
                                    { title: '2.1 Circulation & Kelvin Theorem', desc: 'Vortex filaments, Biot-Savart law, and aerodynamic lift.' }
                                ]
                            }
                        ]
                    }
                }
            };

            if (CATALOG_COURSES[courseId]) {
                coursePost = CATALOG_COURSES[courseId];
            }
        }

        const postFormat = (coursePost?.format || coursePost?.type || (coursePost?.source?.assetItems ? 'asset' : 'course')).toLowerCase();
        if (!coursePost || (!['course', 'asset'].includes(postFormat) && !coursePost.source?.sections && !coursePost.source?.assetItems)) {
            lessonContentDisplay.innerHTML = `<div class="loading-container"><p>Course or Asset Pack not found.</p></div>`;
            return;
        }


        document.title = `${coursePost.title} | XtraPath`;
        currentCourse = coursePost;
        const isAssetMode = (currentCourse.format === 'asset');
        
        courseViewTitleHeader.innerHTML = isAssetMode 
            ? `<i class="ri-box-3-line" style="color:#60a5fa; font-size:1.25rem;"></i> <span>${coursePost.title}</span>`
            : `<i class="ri-graduation-cap-line" style="color:#818cf8; font-size:1.25rem;"></i> <span>${coursePost.title}</span>`;

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

        buildFlatLessonList(coursePost);
        renderCurriculumPanel(coursePost);

        // Always show the course overview on initial load
        await renderCourseOverview(coursePost);
    }

    function buildFlatLessonList(course) {
        flatLessonList = [];
        if (course.format === 'asset') {
            const items = course.source?.assetItems || [];
            items.forEach((item, idx) => {
                flatLessonList.push({
                    type: 'asset',
                    assetIndex: idx,
                    title: item.title || `Asset ${idx + 1}`,
                    key: `asset_${idx}`
                });
            });
        } else {
            const sections = course.source?.sections || [];
            sections.forEach((sec, sIdx) => {
                const lessons = sec.lessons || [];
                lessons.forEach((les, lIdx) => {
                    flatLessonList.push({
                        type: 'course',
                        sectionIndex: sIdx,
                        lessonIndex: lIdx,
                        sectionTitle: sec.title || `Section ${sIdx + 1}`,
                        title: les.title || `Lesson ${lIdx + 1}`,
                        key: `sec_${sIdx}_les_${lIdx}`
                    });
                });
            });
        }
    }

    // ============================================================
    // 4. OVERVIEW & LESSON RENDERING
    // ============================================================
    async function renderCourseOverview(course, contentType) {
        if (!course) return;

        activeLesson = { sectionIndex: null, lessonIndex: null, assetIndex: null };
        document.querySelectorAll('.curriculum-lesson-item').forEach(item => item.classList.remove('active'));

        const isAssetMode = (course.format === 'asset');
        const coverPost = course.source?.coverPostId ? await getPostById(course.source.coverPostId) : null;
        const introPost = course.source?.introVideoId ? await getPostById(course.source.introVideoId) : null;

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
            if (activeType === 'cover') postToDisplay = coverPost;
            else if (activeType === 'intro') postToDisplay = introPost;
        }

        // 2. Render tabs
        lessonSupportingMaterials.innerHTML = `
            <div class="material-tabs-group">
                <button class="lesson-tab ${activeType === 'cover' ? 'active' : ''}" data-type="cover" ${!coverPost ? 'disabled' : ''}>
                    <i class="ri-image-line"></i> <span>${isAssetMode ? 'Asset Banner' : 'Cover Preview'}</span>
                </button>
                <button class="lesson-tab ${activeType === 'intro' ? 'active' : ''}" data-type="intro" ${!introPost ? 'disabled' : ''}>
                    <i class="ri-movie-line"></i> <span>${isAssetMode ? 'Trailer Reel' : 'Introduction Video'}</span>
                </button>
            </div>
        `;
        
        lessonSupportingMaterials.querySelectorAll('.lesson-tab').forEach(tab => {
            tab.addEventListener('click', async (e) => {
                await renderCourseOverview(course, e.currentTarget.dataset.type);
            });
        });

        // 3. Render the content
        if (postToDisplay) {
            const { element: postElement, init: initPost } = window.createPostElement(postToDisplay, 'course-preview');
            lessonContentDisplay.innerHTML = '';
            lessonContentDisplay.appendChild(postElement);
            if (initPost) initPost();
        } else {
            lessonContentDisplay.innerHTML = `
                <div class="loading-container" style="padding: 40px 20px; text-align: center;">
                    <i class="${isAssetMode ? 'ri-box-3-line' : 'ri-graduation-cap-line'}" style="font-size: 3rem; margin-bottom: 12px; color:#60a5fa;"></i>
                    <h3 style="color:white; margin:0 0 8px 0; font-size:1.3rem;">Welcome to ${course.title}</h3>
                    <p style="font-size: 0.9rem; color: #a1a1aa; max-width: 480px; margin: 0 auto 16px auto;">
                        ${course.description || (isAssetMode ? 'Select any digital asset from the right to preview and download.' : 'Select a lesson from the curriculum on the right to start learning.')}
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
        const isUnlocked = isOwn || (window.isItemUnlocked && window.isItemUnlocked(course.id));
        const price = course.price || course.source?.price || (isAssetMode ? '14.99' : '24.99');

        curriculumPanelHeader.innerHTML = `
            <div class="store-item-author" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="avatar"></div>
                    <span style="font-weight:600; color:white; cursor:pointer;" onclick="${authorUserId ? `window.location.href='/views/profile.html?id=${authorUserId}'` : ''}">${authorName}</span>
                </div>
                ${!isOwn ? `
                <button class="btn-follow-overlay ${isFollowing ? 'following' : ''}" data-user-id="${authorUserId}" data-username="${authorName}" style="padding: 4px 12px; font-size: 0.8rem; border-radius: 6px;">
                    ${isFollowing ? 'Following' : 'Follow'}
                </button>` : ''}
            </div>

            ${!isUnlocked ? `
            <button id="enrollCourseBtn" class="btn-primary" style="width: 100%; justify-content:center; padding: 12px 14px; display: flex; align-items: center; gap: 8px; font-weight: 800; margin-bottom: 12px; font-size: 0.92rem; background: linear-gradient(135deg, #0070ba, #0284c7); border: none; box-shadow: 0 4px 18px rgba(0,112,186,0.35); cursor:pointer;">
                <i class="ri-paypal-fill" style="font-size:1.15rem;"></i>
                <span>Unlock ${isAssetMode ? 'Assets' : 'Course'} ($${price})</span>
            </button>
            ` : ''}

            <button id="showOverviewBtn" class="btn-glass" style="width: 100%; text-align: left; padding: 10px 14px; display: flex; align-items: center; gap: 10px; font-weight: 600; margin-bottom: 12px; font-size: 0.85rem;">
                <i class="${isAssetMode ? 'ri-box-3-line' : 'ri-compass-3-line'}" style="font-size: 1.15rem; color:#60a5fa;"></i> 
                ${isAssetMode ? 'Asset Pack Showcase' : 'Course Overview & Syllabus'}
            </button>
        `;

        const enrollCourseBtn = curriculumPanelHeader.querySelector('#enrollCourseBtn');
        if (enrollCourseBtn) {
            enrollCourseBtn.addEventListener('click', () => {
                if (window.openProductCheckoutModal) {
                    window.openProductCheckoutModal({
                        id: course.id,
                        title: course.title,
                        price: price,
                        format: isAssetMode ? 'Asset Pack' : 'Course'
                    }, () => {
                        window.location.reload();
                    });
                }
            });
        }


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
            const items = course.source?.assetItems || [];
            const assetSectionEl = document.createElement('div');
            assetSectionEl.className = 'curriculum-section active';
            assetSectionEl.innerHTML = `
                <div class="curriculum-section-header">
                    <h3 style="font-size:0.9rem; margin:0; color:#e4e4e7;">📦 Included Asset Files (${items.length})</h3>
                </div>
                <div class="curriculum-lesson-list" style="margin-top:6px;">
                    ${items.map((item, idx) => `
                        <div class="curriculum-lesson-item" data-asset-index="${idx}" data-lesson-key="asset_${idx}">
                            <button class="lesson-check-btn" title="Toggle Download/Done"><i class="ri-checkbox-blank-circle-line"></i></button>
                            <span class="lesson-title" style="flex:1; font-size:0.85rem;">${item.title || `Asset ${idx + 1}`}</span>
                            <i class="ri-download-2-line" style="font-size:0.9rem; opacity:0.5;"></i>
                        </div>
                    `).join('')}
                </div>
            `;
            curriculumList.appendChild(assetSectionEl);
        } else {
            const sections = course.source?.sections || [];
            sections.forEach((section, index) => {
                const sectionEl = document.createElement('div');
                sectionEl.className = 'curriculum-section active';
                const lessons = section.lessons || [];
                sectionEl.innerHTML = `
                    <div class="curriculum-section-header" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:rgba(255,255,255,0.02); border-radius:6px; margin-bottom:4px;">
                        <h3 style="font-size:0.88rem; margin:0; color:#e4e4e7; font-weight:600;">Section ${index + 1}: ${section.title}</h3>
                        <div class="section-meta" style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:#71717a;">
                            <span>${lessons.length} lessons</span>
                            <i class="ri-arrow-down-s-line"></i>
                        </div>
                    </div>
                    <div class="curriculum-lesson-list" style="margin-bottom:8px;">
                        ${lessons.map((lesson, lessonIndex) => `
                            <div class="curriculum-lesson-item" data-section-index="${index}" data-lesson-index="${lessonIndex}" data-lesson-key="sec_${index}_les_${lessonIndex}">
                                <button class="lesson-check-btn" title="Mark as Completed"><i class="ri-checkbox-blank-circle-line"></i></button>
                                <span class="lesson-title" style="flex:1; font-size:0.85rem;">${lesson.title}</span>
                                <i class="ri-play-circle-line" style="font-size:0.9rem; opacity:0.5;"></i>
                            </div>
                        `).join('')}
                    </div>
                `;
                curriculumList.appendChild(sectionEl);
            });
        }

        // Checklist Checkbox Clicks & Selection
        curriculumList.addEventListener('click', async (e) => {
            const checkBtn = e.target.closest('.lesson-check-btn');
            const lessonItem = e.target.closest('.curriculum-lesson-item');
            
            if (checkBtn && lessonItem) {
                e.stopPropagation();
                const key = lessonItem.dataset.lessonKey;
                const progress = getCourseProgress(currentCourse.id);
                const isCurrentlyDone = Boolean(progress[key]);
                saveLessonCompleted(currentCourse.id, key, !isCurrentlyDone);
                return;
            }

            const sectionHeader = e.target.closest('.curriculum-section-header');
            if (sectionHeader) {
                sectionHeader.parentElement.classList.toggle('active');
            }

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

        updateProgressUI();
    }

    // ============================================================
    // 5. LESSON ACTIVATION & MATERIAL TABS
    // ============================================================
    async function activateLesson(sectionIndex, lessonIndex, contentType = 'content') {
        activeLesson.sectionIndex = parseInt(sectionIndex, 10);
        activeLesson.lessonIndex = parseInt(lessonIndex, 10);
        activeLesson.assetIndex = null;
        activeContentType = contentType;

        // Automatically mark lesson as completed upon user visit
        if (currentCourse) {
            const lessonKey = `sec_${sectionIndex}_les_${lessonIndex}`;
            saveLessonCompleted(currentCourse.id, lessonKey, true);
        }

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
                <div class="loading-container" style="padding:40px 20px; text-align:center;">
                    <i class="ri-file-forbid-line" style="font-size: 2.5rem; margin-bottom: 10px; color:#a1a1aa;"></i>
                    <p style="color:white; margin:0 0 6px 0; font-weight:600;">No ${contentType} material attached to this lesson.</p>
                    <p style="color:#71717a; font-size:0.8rem; margin:0;">The instructor has not added a ${contentType} file for this step yet.</p>
                </div>
            `;
        }

        renderSupportingMaterialTabs(lesson, sectionIndex, lessonIndex);
    }

    function renderSupportingMaterialTabs(lesson, sectionIndex, lessonIndex) {
        lessonSupportingMaterials.innerHTML = `
            <div class="material-tabs-group">
                <button class="lesson-tab ${activeContentType === 'content' ? 'active' : ''}" data-type="content" ${!lesson.contentPostId ? 'style="opacity:0.4;"' : ''}>
                    <i class="ri-play-circle-line"></i> <span>Video Lecture</span> ${lesson.contentPostId ? '<i class="ri-check-line tab-check"></i>' : ''}
                </button>
                <button class="lesson-tab ${activeContentType === 'worksheet' ? 'active' : ''}" data-type="worksheet" ${!lesson.worksheetPostId ? 'disabled' : ''}>
                    <i class="ri-file-text-line"></i> <span>PDF Worksheet</span> ${lesson.worksheetPostId ? '<i class="ri-check-line tab-check"></i>' : ''}
                </button>
                <button class="lesson-tab ${activeContentType === 'interactive' ? 'active' : ''}" data-type="interactive" ${!lesson.interactivePostId ? 'disabled' : ''}>
                    <i class="ri-bar-chart-2-line"></i> <span>3D Interactive</span> ${lesson.interactivePostId ? '<i class="ri-check-line tab-check"></i>' : ''}
                </button>
            </div>
        `;

        lessonSupportingMaterials.querySelectorAll('.lesson-tab').forEach(button => {
            button.addEventListener('click', async (e) => {
                const type = e.currentTarget.dataset.type;
                if (type === activeContentType) return;
                await activateLesson(sectionIndex, lessonIndex, type);
            });
        });
    }

    // ============================================================
    // 6. ASSET MODE ACTIVATION
    // ============================================================
    async function activateAssetItem(assetIndex, fileType = null) {
        const items = currentCourse.source?.assetItems || [];
        const item = items[assetIndex];
        if (!item) return;

        activeLesson.assetIndex = parseInt(assetIndex, 10);
        activeLesson.sectionIndex = null;
        activeLesson.lessonIndex = null;

        // Automatically mark asset as completed upon user visit
        if (currentCourse) {
            const lessonKey = `asset_${assetIndex}`;
            saveLessonCompleted(currentCourse.id, lessonKey, true);
        }

        document.querySelectorAll('.curriculum-lesson-item').forEach(el => el.classList.remove('active'));
        const activeEl = curriculumList.querySelector(`.curriculum-lesson-item[data-asset-index="${assetIndex}"]`);
        if (activeEl) activeEl.classList.add('active');

        // Fetch attached posts
        const contentPost = item.contentPostId ? await getPostById(item.contentPostId) : null;
        const worksheetPost = item.worksheetPostId ? await getPostById(item.worksheetPostId) : null;
        const interactivePost = item.interactivePostId ? await getPostById(item.interactivePostId) : null;

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

        if (activePost) {
            const { element, init } = window.createPostElement(activePost, 'course-preview');
            lessonContentDisplay.innerHTML = '';
            lessonContentDisplay.appendChild(element);
            if (init) init();
        } else {
            lessonContentDisplay.innerHTML = `
                <div class="loading-container" style="padding:40px 20px; text-align:center;">
                    <i class="ri-download-cloud-2-line" style="font-size: 2.5rem; margin-bottom: 10px; color: #60a5fa;"></i>
                    <p style="color:white; margin:0 0 6px 0;">No files attached to this asset item.</p>
                </div>
            `;
        }

        lessonSupportingMaterials.innerHTML = `
            <div class="material-tabs-group">
                <button class="lesson-tab ${activeType === 'content' ? 'active' : ''}" data-type="content" ${!contentPost ? 'disabled style="opacity:0.35;"' : ''}>
                    <i class="ri-video-line"></i> <span>Video Demo</span> ${contentPost ? '<i class="ri-check-line tab-check"></i>' : ''}
                </button>
                <button class="lesson-tab ${activeType === 'worksheet' ? 'active' : ''}" data-type="worksheet" ${!worksheetPost ? 'disabled style="opacity:0.35;"' : ''}>
                    <i class="ri-file-pdf-line"></i> <span>PDF / eBook</span> ${worksheetPost ? '<i class="ri-check-line tab-check"></i>' : ''}
                </button>
                <button class="lesson-tab ${activeType === 'interactive' ? 'active' : ''}" data-type="interactive" ${!interactivePost ? 'disabled style="opacity:0.35;"' : ''}>
                    <i class="ri-cube-line"></i> <span>3D / Code</span> ${interactivePost ? '<i class="ri-check-line tab-check"></i>' : ''}
                </button>
                ${downloadUrl ? `
                    <a href="${downloadUrl}" download="${downloadFilename}" target="_blank" class="btn-download-tab" title="Download File">
                        <i class="ri-download-2-line"></i>
                    </a>
                ` : ''}
            </div>
        `;

        lessonSupportingMaterials.querySelectorAll('.lesson-tab').forEach(button => {
            button.addEventListener('click', async (e) => {
                const type = e.currentTarget.dataset.type;
                await activateAssetItem(assetIndex, type);
            });
        });
    }

    // ============================================================
    // 7. INITIALIZATION
    // ============================================================
    async function checkDependenciesAndRun() {
        if (window.createPostElement) {
            await loadCourseDetails();
        } else {
            setTimeout(checkDependenciesAndRun, 50);
        }
    }

    checkDependenciesAndRun();
});