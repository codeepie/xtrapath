document.addEventListener('DOMContentLoaded', () => {
    // --- 0. Element Cache ---
    // ============================================================
    // SUPABASE CLIENT SETUP
    // ============================================================
    const SUPABASE_URL = 'https://elhdcldoepjxcxgivohg.supabase.co'; // Paste your URL here
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsaGRjbGRvZXBqeGN4Z2l2b2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1Mzk1NTQsImV4cCI6MjEwMTExNTU1NH0.ago19dzlmxsKRy-7bg8q0JRw69o0roLES_w_dcFGt1o'; // Paste your anon key here
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const articleTitle = document.getElementById('articleTitle');
    const articleBody = document.getElementById('articleBody');
    const coverImageContainer = document.getElementById('coverImageContainer');
    const coverImageInput = document.getElementById('coverImageInput');
    const publishBtn = document.getElementById('publishArticleBtn');

    // New UI Elements
    const slashMenu = document.getElementById('slashMenu');
    const embedModal = document.getElementById('embedModal');
    const closeEmbedModalBtn = document.getElementById('closeEmbedModal');
    const embedGrid = document.getElementById('embedGrid');
    const embedSearchInput = document.getElementById('embedSearchInput');
    const embedCategoryTabs = document.querySelector('.embed-category-tabs');
    const embedPreviewContainer = document.getElementById('embedPreview');
    const embedPreviewInfo = document.getElementById('embedPreviewInfo');
    const confirmEmbedBtn = document.getElementById('confirmEmbedBtn');

    // --- NEW TIKZ & COVER CHOICE ELEMENTS ---
    const coverSourceModal = document.getElementById('coverSourceModal');
    const coverBtnUpload = document.getElementById('coverBtnUpload');
    const coverBtnSelect = document.getElementById('coverBtnSelect');

    let coverMedia = {
        url: null,
        type: null,
    };

    // --- 1. Load from localStorage or initialize ---
    function loadArticle() {
        const savedArticle = JSON.parse(localStorage.getItem('xtraArticleDraft'));
        if (savedArticle) {
            articleTitle.value = savedArticle.title || '';
            articleBody.innerHTML = savedArticle.content || '<p data-placeholder="Start writing your article. Type \'/\' for commands..."><br></p>';
            if (savedArticle.coverMedia && savedArticle.coverMedia.url) {
                coverMedia = savedArticle.coverMedia;
                renderCoverMedia();
            }
        } else {
            articleBody.innerHTML = '<p data-placeholder="Start writing your article. Type \'/\' for commands..."><br></p>';
        }
    }

    // --- 2. Save to localStorage ---
    function saveArticle() {
        const articleData = {
            title: articleTitle.value,
            content: articleBody.innerHTML,
            coverMedia: coverMedia,
        };
        localStorage.setItem('xtraArticleDraft', JSON.stringify(articleData));
    }

    function renderCoverMedia() {
        if (!coverMedia.url) return;
        if (coverMedia.type.startsWith('video')) {
            coverImageContainer.innerHTML = `<video src="${coverMedia.url}" autoplay muted loop playsinline></video>`;
        } else {
            coverImageContainer.innerHTML = `<img src="${coverMedia.url}" alt="Cover Image">`;
        }
    }

    // --- 3. Event Listeners ---
    if (articleTitle) articleTitle.addEventListener('input', saveArticle);
    if (articleBody) articleBody.addEventListener('input', saveArticle);

    // Cover Image Handling
    if (coverImageContainer) {
        coverImageContainer.addEventListener('click', () => {
            if (coverSourceModal) {
                coverSourceModal.style.display = 'flex';
            } else {
                // Fallback to original behavior if new modal doesn't exist
                coverImageInput.click();
            }
        });
    }
    if (coverImageInput) {
        coverImageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Show a temporary loading state
            coverImageContainer.innerHTML = `<div class="loading-container"><div class="spinner"></div><p>Uploading...</p></div>`;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const backendUrl = getBackendUrl();
                const response = await fetch(`${backendUrl}/api/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Upload failed with status: ' + response.statusText);
                }

                const data = await response.json();
                const fullUrl = data.url.startsWith('http') ? data.url : `${backendUrl}${data.url}`;

                coverMedia.url = fullUrl;
                coverMedia.type = file.type;
                renderCoverMedia();
                saveArticle();
            } catch (error) {
                console.error("Cover media upload failed:", error);
                alert("Failed to upload cover media. Please try again.");
                coverImageContainer.innerHTML = `<div class="placeholder"><i class="ri-image-add-line"></i><div>Click to add a cover</div></div>`;
            }
        });
    }

    // Publish Logic
    if (publishBtn) {
        publishBtn.addEventListener('click', async () => {
            console.log("Publish button clicked."); // For debugging
            const title = articleTitle.value.trim();
            const content = articleBody.innerHTML;

            if (!title) {
                alert('Please enter a title for your article.');
                return;
            }
            if (!coverMedia.url) {
                alert('Please add a cover media (image, GIF, or video).');
                return;
            }
            
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    alert("You must be logged in to publish an article.");
                    return;
                }

                const newPostData = {
                    title: title,
                    desc: content.replace(/<[^>]+>/g, '').substring(0, 150) + '...', // Plain text snippet
                    videoUrl: coverMedia.url, // Use videoUrl for the thumbnail/cover
                    mediaType: coverMedia.type, // Store media type
                    format: 'article',
                    source: {
                        engine: 'article',
                        title: title,
                        // Heavy content (content, coverMedia) is no longer stored here
                    },
                    originalId: null,
                    user_id: user.id,
                    pdfUrl: '' // Provide a default empty value for the non-nullable column
                };

                const { data, error } = await supabase
                    .from('posts')
                    .insert([newPostData])
                    .select();

                if (error) {
                    throw error;
                }

                const newPost = data[0];
                // Store the heavy content (the full HTML body) in localStorage,
                // keyed by the new post's ID, so articleView.html can find it.
                localStorage.setItem(`article_content_${newPost.id}`, content);

                // Add the newly created post to the local cache so it appears immediately.
                const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                allPosts.push(newPost);
                localStorage.setItem('userPosts', JSON.stringify(allPosts));

                // Clear the draft
                localStorage.removeItem('xtraArticleDraft');

                if(confirm('Article published to your profile! Go to profile?')) {
                    window.location.href = 'profile.html';
                }
            } catch (e) {
                console.error("Failed to publish article:", e);
                if (e.name === 'QuotaExceededError') {
                    alert('Could not publish article. Your browser storage is full. Please clear some old posts or data.');
                } else {
                    alert('An unexpected error occurred while publishing. Please check the console for details.');
                }
            }
        });
    }

    // --- Cover Source Modal Logic ---
    if (coverSourceModal) {
        coverSourceModal.addEventListener('click', (e) => {
            if (e.target === coverSourceModal) coverSourceModal.style.display = 'none';
        });

        if (coverBtnUpload && coverImageInput) {
            coverBtnUpload.addEventListener('click', () => {
                coverSourceModal.style.display = 'none';
                coverImageInput.click();
            });
        }

        if (coverBtnSelect) {
            coverBtnSelect.addEventListener('click', () => {
                coverSourceModal.style.display = 'none';
                openEmbedModal('cover');
            });
        }
    }

    // --- 4. Advanced Slash Command & Embed Logic ---
    let slashMenuVisible = false;
    let currentSlashCommandRange = null;
    let selectedEmbedPost = null;
    let embedModalMode = 'embed'; // 'embed' or 'cover'

    if (articleBody) {
        articleBody.addEventListener('input', () => {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            const node = range.startContainer;

            if (node.nodeType === Node.TEXT_NODE && node.textContent.slice(range.startOffset - 1, range.startOffset) === '/') {
                currentSlashCommandRange = range.cloneRange();
                currentSlashCommandRange.setStart(node, range.startOffset - 1);
                currentSlashCommandRange.setEnd(node, range.startOffset);
                showSlashMenu(currentSlashCommandRange.getBoundingClientRect());
            } else {
                hideSlashMenu();
            }
        });

        // Hide menu on click outside
        document.addEventListener('click', (e) => {
            if (slashMenuVisible && !slashMenu.contains(e.target)) {
                hideSlashMenu();
            }
        });
    }

    function showSlashMenu(rect) {
        slashMenu.style.display = 'block';
        slashMenu.style.left = `${rect.left}px`;
        slashMenu.style.top = `${rect.bottom + window.scrollY + 5}px`;
        slashMenuVisible = true;
    }

    function hideSlashMenu() {
        slashMenu.style.display = 'none';
        slashMenuVisible = false;
        currentSlashCommandRange = null;
    }

    function handleSlashCommand(command) {
        if (!currentSlashCommandRange) return;

        window.getSelection().removeAllRanges();
        window.getSelection().addRange(currentSlashCommandRange);
        document.execCommand('delete', false, null);

        if (command === 'h1') document.execCommand('formatBlock', false, '<h1>');
        else if (command === 'h2') document.execCommand('formatBlock', false, '<h2>');
        else if (command === 'embed') openEmbedModal();

        hideSlashMenu();
        articleBody.focus();
    }

    slashMenu.querySelectorAll('.slash-menu-item').forEach(item => {
        item.addEventListener('click', () => handleSlashCommand(item.dataset.command));
    });

    // --- Embed Modal Functions ---
    function openEmbedModal(mode = 'embed') {
        embedModalMode = mode;
        const embedModalHeaderTitle = embedModal.querySelector('.embed-modal-header h3');
        if (embedModalHeaderTitle) {
            embedModalHeaderTitle.textContent = mode === 'cover' ? 'Select Cover Media' : 'Embed a Creation';
        }
        if (confirmEmbedBtn) {
            confirmEmbedBtn.textContent = mode === 'cover' ? 'Select as Cover' : 'Embed this Creation';
        }

        // --- NEW: Rebuild modal layout for a modern, single-pane UI on first open. ---
        if (embedModal && !embedModal.dataset.layoutFixed) {
            // 1. Add main wrapper classes for consistent styling
            embedModal.classList.add('embed-modal-overlay');
            const modalContent = embedModal.querySelector('div');
            if (!modalContent) return; // Should not happen
            modalContent.classList.add('embed-modal-content');

            // 2. Find the container that holds the old layout (the columns)
            const oldBodyWrapper = Array.from(modalContent.children).find(child => !child.classList.contains('embed-modal-header'));

            if (oldBodyWrapper) {
                // 3. Create and assemble the new, clean single-pane body
                const newBody = document.createElement('div');
                newBody.className = 'embed-selection-area'; // This class now represents the full body

                const searchWrapper = document.createElement('div');
                searchWrapper.className = 'embed-search-wrapper';
                const searchIcon = document.createElement('i');
                searchIcon.className = 'ri-search-line';
                searchWrapper.appendChild(searchIcon);
                if (embedSearchInput) searchWrapper.appendChild(embedSearchInput);
                newBody.appendChild(searchWrapper);

                if (embedCategoryTabs) newBody.appendChild(embedCategoryTabs);
                if (embedGrid) newBody.appendChild(embedGrid);

                // 4. Completely replace the old layout with the new one
                oldBodyWrapper.innerHTML = '';
                oldBodyWrapper.appendChild(newBody);
            }
            embedModal.dataset.layoutFixed = 'true';
        }

        embedModal.style.display = 'flex';
        populateEmbedGrid();
    }

    function closeEmbedModal() {
        embedModal.style.display = 'none';
        selectedEmbedPost = null;
        embedGrid.innerHTML = '';
        embedSearchInput.value = '';
        embedModalMode = 'embed'; // Reset mode
    }

    function populateEmbedGrid(filter = {}) {
        embedGrid.innerHTML = '';
        const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]').reverse();

        const filteredPosts = allPosts.filter(post => {
            const matchesCategory = !filter.category || filter.category === 'all' || post.format === filter.category;
            const matchesSearch = !filter.search || post.title.toLowerCase().includes(filter.search.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        if (filteredPosts.length === 0) {
            embedGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">No creations found.</p>';
            return;
        }

        filteredPosts.forEach(post => {
            const item = document.createElement('div');
            item.className = 'embed-grid-item';
            item.dataset.postId = post.id;

            let thumbnailHTML = '';
            if (post.format === 'image' || post.format === 'pdf' || post.format === 'article') {
                thumbnailHTML = `<img src="${post.videoUrl}" alt="${post.title}">`;
            } else {
                thumbnailHTML = `<video src="${post.videoUrl}" muted loop playsinline></video>`;
            }

            item.innerHTML = `
                ${thumbnailHTML}
                <div class="title-overlay">${post.title}</div>
            `;

            item.addEventListener('click', () => {
                selectedEmbedPost = post;

                // Highlight selection
                embedGrid.querySelectorAll('.embed-grid-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');

                // Play video in the selected item
                const video = item.querySelector('video');
                if (video) video.play();

                // Confirmation dialog
                const confirmationMessage = embedModalMode === 'cover' 
                    ? `Set "${post.title}" as the article cover?` 
                    : `Embed "${post.title}" into the article?`;

                if (confirm(confirmationMessage)) {
                    // User clicked "OK"
                    handleConfirmation(post);
                }
            });

            embedGrid.appendChild(item);
        });
    }

    // --- Embed Modal Event Listeners ---
    if (embedModal) {
        closeEmbedModalBtn.addEventListener('click', closeEmbedModal);
        embedModal.addEventListener('click', (e) => {
            if (e.target === embedModal) closeEmbedModal();
        });

        embedSearchInput.addEventListener('input', () => {
            const activeTab = embedCategoryTabs.querySelector('.active');
            populateEmbedGrid({
                category: activeTab ? activeTab.dataset.category : 'all',
                search: embedSearchInput.value
            });
        });

        embedCategoryTabs.addEventListener('click', (e) => {
            if (e.target.classList.contains('embed-tab')) {
                embedCategoryTabs.querySelectorAll('.embed-tab').forEach(tab => tab.classList.remove('active'));
                e.target.classList.add('active');
                populateEmbedGrid({
                    category: e.target.dataset.category,
                    search: embedSearchInput.value
                });
            }
        });
    }

    function handleConfirmation(post) {
        if (!post) return;

        if (embedModalMode === 'cover') {
            coverMedia.url = post.videoUrl;
            coverMedia.type = post.mediaType || (post.format === 'image' ? 'image/jpeg' : 'video/mp4');
            renderCoverMedia();
            saveArticle();
        } else {
            // Embed logic
            if (currentSlashCommandRange) {
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(currentSlashCommandRange);
            } else {
                articleBody.focus();
                const range = document.createRange();
                range.selectNodeContents(articleBody);
                range.collapse(false);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
            }

            let embedThumbnailHtml = '';
            if (post.format === 'image' || post.format === 'pdf' || post.format === 'article') {
                embedThumbnailHtml = `<img src="${post.videoUrl}" alt="${post.title}" />`;
            } else {
                embedThumbnailHtml = `<video src="${post.videoUrl}" muted loop playsinline onmouseover="this.play()" onmouseout="this.pause(); this.currentTime=0;"></video>`;
            }

            const embedHtml = `
                <div class="embedded-post" contenteditable="false" data-post-id="${post.id}">
                    <div class="embedded-media">${embedThumbnailHtml}</div>
                    <div class="embedded-actions">
                        <button class="icon-btn"><i class="ri-heart-line"></i></button>
                        <button class="icon-btn"><i class="ri-chat-3-line"></i></button>
                        <button class="icon-btn"><i class="ri-send-plane-line"></i></button>
                        <button class="icon-btn" style="margin-left: auto;"><i class="ri-bookmark-line"></i></button>
                    </div>
                    <div class="embedded-footer">
                        <div class="embedded-caption"><span class="username">Dr. Nova</span> <span>${post.title}</span></div>
                    </div>
                </div>
                <p><br></p>
            `;
            document.execCommand('insertHTML', false, embedHtml);
        }

        closeEmbedModal();
    }

    // Initial load
    loadArticle();
});