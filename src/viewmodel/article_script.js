document.addEventListener('DOMContentLoaded', async () => {
    // --- 0. Element Cache ---
    // ============================================================
    // SUPABASE CLIENT SETUP
    // ============================================================
    // Fetch configuration from the backend to avoid hardcoding keys.
    let config;
    try {
        const configResponse = await fetch('/api/config');
        if (!configResponse.ok) {
            throw new Error(`Server responded with status: ${configResponse.status}`);
        }
        config = await configResponse.json();
    } catch (error) {
        console.error("Failed to load app configuration:", error);
        document.body.innerHTML = `<div style="color:red; padding: 20px; text-align: center; font-family: sans-serif;"><h2>Connection Error</h2><p>Could not load app configuration from the server. Please ensure the backend is running and properly configured.</p><pre style="text-align: left; background: #222; padding: 10px; border-radius: 5px; margin-top: 10px;">${error.message}</pre></div>`;
        return;
    }
    const SUPABASE_URL = config.supabase_url;
    const SUPABASE_ANON_KEY = config.supabase_anon_key;
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
    const embedModalTitle = document.getElementById('embedModalTitle');
    const embedModalSubtitle = document.getElementById('embedModalSubtitle');
    const materialModalIcon = document.getElementById('materialModalIcon');
    const openStudioActionBtn = document.getElementById('openStudioActionBtn');
    const createStudioDesc = document.getElementById('createStudioDesc');
    const embedGrid = document.getElementById('embedGrid');
    const embedSearchInput = document.getElementById('embedSearchInput');

    // --- NEW TIKZ & COVER CHOICE ELEMENTS ---
    const coverSourceModal = document.getElementById('coverSourceModal');
    const coverBtnUpload = document.getElementById('coverBtnUpload');
    const coverBtnSelect = document.getElementById('coverBtnSelect');

    let coverMedia = {
        url: null,
        type: null,
    };

    // --- 1. Load from localStorage or initialize ---
    async function loadArticle() {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('id');

        let articleToLoad = null;

        if (editId) {
            // Load specific article from Supabase or localStorage
            try {
                if (supabase) {
                    const { data, error } = await supabase.from('posts').select('*').eq('id', editId).single();
                    if (data && !error) {
                        articleToLoad = {
                            id: data.id,
                            title: data.title,
                            content: data.source?.content || localStorage.getItem(`article_content_${data.id}`) || data.description || '',
                            coverMedia: data.video_url ? { url: data.video_url, type: data.media_type || 'image/jpeg' } : null
                        };
                    }
                }
            } catch (e) {
                console.warn("Could not fetch article by ID from Supabase:", e);
            }

            if (!articleToLoad) {
                const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                const localPost = allPosts.find(p => String(p.id) === String(editId));
                if (localPost) {
                    articleToLoad = {
                        id: localPost.id,
                        title: localPost.title,
                        content: localPost.source?.content || localStorage.getItem(`article_content_${localPost.id}`) || localPost.description || '',
                        coverMedia: localPost.video_url ? { url: localPost.video_url, type: localPost.media_type || 'image/jpeg' } : null
                    };
                }
            }
        }

        if (!articleToLoad) {
            articleToLoad = JSON.parse(localStorage.getItem('xtraArticleDraft'));
        }

        if (articleToLoad) {
            articleTitle.value = articleToLoad.title || '';
            articleBody.innerHTML = articleToLoad.content || '<p data-placeholder="Start writing your article. Type \'/\' for commands..."><br></p>';
            if (articleToLoad.coverMedia && articleToLoad.coverMedia.url) {
                coverMedia = articleToLoad.coverMedia;
                renderCoverMedia();
            }

            // Clean up any stale Dr. Nova in embedded creations from older drafts
            articleBody.querySelectorAll('.embedded-post').forEach(embed => {
                const usernameSpan = embed.querySelector('.embedded-caption .username');
                if (usernameSpan && (usernameSpan.textContent.trim() === 'Dr. Nova' || usernameSpan.textContent.trim() === 'Dr .Nova')) {
                    const embedPostId = embed.dataset.postId;
                    const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                    const targetPost = allPosts.find(p => String(p.id) === String(embedPostId));
                    usernameSpan.textContent = targetPost ? (targetPost.username || targetPost.source?.author || localStorage.getItem('username') || 'Creator') : (localStorage.getItem('username') || 'Creator');
                }
            });
        } else {
            articleBody.innerHTML = '<p data-placeholder="Start writing your article. Type \'/\' for commands..."><br></p>';
        }

        // --- NEW: Initialize any existing Mermaid and KaTeX blocks on load ---
        setTimeout(() => {
            if (window.mermaid) {
                try {
                    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
                    articleBody.querySelectorAll('.mermaid-container').forEach(initializeMermaidBlock);
                } catch (e) {
                    console.error("Mermaid.js initialization or rendering failed on load.", e);
                }
            }
            articleBody.querySelectorAll('.katex-container').forEach(initializeKatexBlock);
        }, 100);
    }

    // --- 2. Save to localStorage ---
    function saveArticle() {
        // --- NEW: Sync textarea values to their innerHTML before saving ---
        // This is crucial because .innerHTML does not capture the live value of a textarea.
        articleBody.querySelectorAll('textarea.mermaid-code').forEach(textarea => {
            textarea.textContent = textarea.value;
        });
        articleBody.querySelectorAll('textarea.katex-code').forEach(textarea => {
            textarea.textContent = textarea.value;
        });

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
                const response = await fetch(`/api/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Upload failed with status: ' + response.statusText);
                }

                const data = await response.json();
                const fullUrl = data.url; // The server returns a relative URL

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

            // --- FIX: Sync all textarea values to their innerHTML before publishing ---
            // This ensures that the content of Mermaid and KaTeX editors is saved correctly.
            articleBody.querySelectorAll('textarea.mermaid-code, textarea.katex-code').forEach(textarea => {
                textarea.textContent = textarea.value;
            });

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
                    description: content.replace(/<[^>]+>/g, '').substring(0, 150) + '...', // Plain text snippet
                    video_url: coverMedia.url,
                    media_type: coverMedia.type,
                    format: 'article',
                    source: {
                        engine: 'article',
                        title: title,
                        content: content
                    },
                    original_id: null,
                    user_id: user.id,
                    pdf_url: '',
                    username: localStorage.getItem('username') || 'Anonymous',
                    avatar_url: localStorage.getItem('avatarUrl') || ''
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
                    window.location.href = '/views/profile.html';
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
        else if (command === 'diagram') insertMermaidBlock();
        else if (command === 'math') insertKatexBlock();
        else if (command === 'embed') openEmbedModal(); // Embed existing XtraPath creations
        else if (command === 'link') handleEmbedLink(); // Embed external links

        hideSlashMenu();
        articleBody.focus();
    }

    function insertMermaidBlock() {
        const blockId = `mermaid-block-${Date.now()}`;
        // Using contenteditable="false" on the wrapper makes the whole block non-editable,
        // except for the <textarea> inside, which is what we want.
        const mermaidHtml = `
            <div class="mermaid-container" id="${blockId}" contenteditable="false">
                <textarea class="mermaid-code" spellcheck="false" placeholder="graph TD&#10;    A --> B"></textarea>
                <div class="mermaid-output">
                    <p>Enter Mermaid code to see a preview.</p>
                </div>
            </div>
            <p><br></p> <!-- Add a new paragraph to continue writing -->
        `;

        document.execCommand('insertHTML', false, mermaidHtml);

        // A timeout is needed because execCommand can be asynchronous.
        setTimeout(() => {
            const newBlock = document.getElementById(blockId);
            if (newBlock) {
                initializeMermaidBlock(newBlock);
            }
        }, 50);
    }

    function initializeMermaidBlock(blockElement) {
        const textarea = blockElement.querySelector('.mermaid-code');
        const outputDiv = blockElement.querySelector('.mermaid-output');

        const render = () => {
            const code = textarea.value;
            if (!code.trim()) {
                outputDiv.innerHTML = '<p>Enter Mermaid code to see a preview.</p>';
                return;
            }
            const svgId = 'mermaid-svg-' + Date.now();
            mermaid.render(svgId, code).then(({ svg, bindFunctions }) => {
                outputDiv.innerHTML = svg;
                if (bindFunctions) {
                    bindFunctions(outputDiv);
                }
            }).catch(e => {
                outputDiv.innerHTML = `<pre class="mermaid-error">${e.message}</pre>`;
            });
        };

        textarea.addEventListener('input', () => {
            render();
            saveArticle(); // The content has changed
        });

        // Initial render for blocks that are already in the document on load
        render();
    }

    function insertKatexBlock() {
        const blockId = `katex-block-${Date.now()}`;
        const katexHtml = `
            <div class="katex-container" id="${blockId}" contenteditable="false">
                <textarea class="katex-code" spellcheck="false" placeholder="E = mc^2&#10;or&#10;ax^2 + bx + c = 0"></textarea>
                <div class="katex-output">
                    <p style="color: #71717a; font-size: 0.9rem;">Enter LaTeX code to see a preview.</p>
                </div>
            </div>
            <p><br></p> <!-- Add a new paragraph to continue writing -->
        `;

        document.execCommand('insertHTML', false, katexHtml);

        setTimeout(() => {
            const newBlock = document.getElementById(blockId);
            if (newBlock) {
                initializeKatexBlock(newBlock);
            }
        }, 50);
    }

    function initializeKatexBlock(blockElement) {
        const textarea = blockElement.querySelector('.katex-code');
        const outputDiv = blockElement.querySelector('.katex-output');
        if (!textarea || !outputDiv) return;

        const render = () => {
            const code = textarea.value.trim();
            if (!code) {
                outputDiv.innerHTML = '<p style="color: #71717a; font-size: 0.9rem;">Enter LaTeX code to see a preview.</p>';
                return;
            }
            if (window.katex) {
                try {
                    if (code.includes('$$') || (code.includes('$') && !code.startsWith('\\begin'))) {
                        outputDiv.innerHTML = code.replace(/\n/g, '<br/>');
                        if (window.renderMathInElement) {
                            renderMathInElement(outputDiv, {
                                delimiters: [
                                    { left: '$$', right: '$$', display: true },
                                    { left: '$', right: '$', display: false },
                                    { left: '\\[', right: '\\]', display: true },
                                    { left: '\\(', right: '\\)', display: false }
                                ],
                                output: 'html',
                                throwOnError: false
                            });
                        }
                    } else {
                        const rendered = katex.renderToString(code, {
                            displayMode: true,
                            output: 'html',
                            throwOnError: false,
                            trust: true
                        });
                        outputDiv.innerHTML = rendered;
                    }
                } catch (e) {
                    outputDiv.innerHTML = `<pre class="katex-error">${e.message}</pre>`;
                }
            } else {
                outputDiv.innerHTML = `<p>${code}</p>`;
            }
        };

        textarea.addEventListener('input', () => {
            render();
            saveArticle();
        });

        // Initial render for blocks that are already in the document on load
        render();
    }

    slashMenu.querySelectorAll('.slash-menu-item').forEach(item => {
        item.addEventListener('click', () => handleSlashCommand(item.dataset.command));
    });

    // --- NEW: Handle Direct Link Embedding ---
    function handleEmbedLink() {
        const url = prompt("Enter the URL to embed (e.g., image, YouTube, website):");
        if (!url) return;

        // Determine if it's an image or an iframe
        const isImage = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(url);
        let embedHtml = '';

        if (isImage) {
            embedHtml = `<img src="${url}" alt="Embedded Image" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />`;
        } else {
            // For other URLs, assume iframe. You might want more sophisticated parsing
            // for specific services like YouTube, Vimeo, etc.
            embedHtml = `<iframe src="${url}" style="width: 100%; height: 400px; border: 0;" allowfullscreen></iframe>`;
        }

        // Insert the embed HTML into the editor
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

        const wrapperHtml = `
            <div class="embedded-external-media" contenteditable="false" style="margin: 2em auto; max-width: 700px; border: 1px solid var(--border-glass); border-radius: 8px; overflow: hidden; background: #1a1a1a;">
                ${embedHtml}
            </div>
            <p><br></p>
        `;
        document.execCommand('insertHTML', false, wrapperHtml);
    }

    // --- Embed Modal Functions ---
    let cachedCreationsList = [];

    function openEmbedModal(mode = 'embed') {
        embedModalMode = mode;
        if (embedModalTitle) {
            embedModalTitle.textContent = mode === 'cover' ? 'Article Cover Banner' : 'Embed a Creation';
        }
        if (embedModalSubtitle) {
            embedModalSubtitle.textContent = 'Choose an option to add material to this step';
        }
        if (materialModalIcon) {
            materialModalIcon.innerHTML = mode === 'cover' ? '<i class="ri-image-add-line"></i>' : '<i class="ri-magic-line"></i>';
        }

        if (openStudioActionBtn) {
            openStudioActionBtn.onclick = () => {
                const urlParams = new URLSearchParams(window.location.search);
                const editId = urlParams.get('id');
                const articleContext = {
                    from: 'article',
                    mode: embedModalMode, // 'cover' or 'embed'
                    articleId: editId
                };
                localStorage.setItem('articleContext', JSON.stringify(articleContext));
                saveArticle();
                if (embedModal) embedModal.style.display = 'none';
                const idParam = editId ? `&articleId=${encodeURIComponent(editId)}` : '';
                if (embedModalMode === 'cover') {
                    window.location.href = `/views/xtraAnim.html?tool=thumbnail&from=article&mode=cover${idParam}`;
                } else {
                    window.location.href = `/views/xtraAnim.html?from=article&mode=embed${idParam}`;
                }
            };
        }

        if (embedModal) {
            embedModal.style.display = 'flex';
        }
        populateEmbedGrid();
    }

    function closeEmbedModal() {
        if (embedModal) embedModal.style.display = 'none';
        selectedEmbedPost = null;
        if (embedSearchInput) embedSearchInput.value = '';
        embedModalMode = 'embed'; // Reset mode
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function populateCreationsDOM(filtered) {
        if (!embedGrid) return;
        if (filtered.length === 0) {
            embedGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:20px;">No creations found. Click "Open Studio" above to create one!</div>';
            return;
        }

        embedGrid.innerHTML = '';
        filtered.forEach(post => {
            const card = document.createElement('div');
            card.style.cssText = 'background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 8px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 6px; user-select: none;';
            
            const mediaUrl = post.video_url || post.videoUrl || '';
            let thumb = '';
            const isVideo = post.media_type?.startsWith('video') || (!post.media_type && (post.format === 'animation' || post.format === 'video' || (mediaUrl && mediaUrl.endsWith('.mp4'))));

            if (isVideo && mediaUrl) {
                thumb = `<video src="${mediaUrl}" style="width:100%; height:85px; object-fit:cover; border-radius:6px; background:#000;" muted playsinline></video>`;
            } else if (mediaUrl) {
                thumb = `<img src="${mediaUrl}" style="width:100%; height:85px; object-fit:cover; border-radius:6px; background:#000;" alt="thumb">`;
            } else {
                let iconClass = 'ri-file-text-line';
                if (post.format === 'graph') iconClass = 'ri-bar-chart-2-line';
                else if (post.format === 'diagram' || post.format === 'tikz') iconClass = 'ri-draft-line';
                else if (post.format === 'simulation' || post.format === '3d') iconClass = 'ri-cube-line';
                else if (post.format === 'pdf' || post.format === 'book') iconClass = 'ri-file-pdf-line';
                else if (post.format === 'article') iconClass = 'ri-article-line';
                else if (post.format === 'animation' || post.format === 'video') iconClass = 'ri-movie-line';

                thumb = `<div style="width:100%; height:85px; display:flex; align-items:center; justify-content:center; background:#1e2230; border-radius:6px; color:#818cf8;"><i class="${iconClass}" style="font-size:1.5rem;"></i></div>`;
            }

            const postTitle = post.title || 'Untitled';
            const postFormat = post.format || 'Item';

            card.innerHTML = `
                <div style="position:relative;">
                    ${thumb}
                    <span style="position:absolute; bottom:4px; right:4px; font-size:0.65rem; background:rgba(0,0,0,0.7); color:#e4e4e7; padding:2px 5px; border-radius:4px; font-weight:600; text-transform:uppercase;">${escapeHtml(postFormat)}</span>
                </div>
                <span style="color:white; font-size:0.82rem; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(postTitle)}">${escapeHtml(postTitle)}</span>
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
                handleConfirmation(post);
            });

            embedGrid.appendChild(card);
        });
    }

    async function populateEmbedGrid(searchTerm = '') {
        if (!embedGrid) return;

        // 1. Instant local search filtering if user is searching
        if (searchTerm.trim() && cachedCreationsList.length > 0) {
            const term = searchTerm.toLowerCase().trim();
            const matched = cachedCreationsList.filter(p => (p.title || '').toLowerCase().includes(term));
            populateCreationsDOM(matched);
            return;
        }

        // 2. Instant render from local cache (0ms!)
        const localPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        const initialFiltered = localPosts.filter(p => p.format !== 'course' && p.format !== 'asset');
        if (initialFiltered.length > 0) {
            cachedCreationsList = initialFiltered;
            populateCreationsDOM(initialFiltered);
        } else {
            embedGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:20px;"><i class="ri-loader-4-line spin" style="font-size:1.5rem; display:block; margin-bottom:8px;"></i>Loading creations...</div>';
        }

        // 3. Background revalidation with Supabase
        if (supabase) {
            try {
                const { data: remotePosts, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50);
                if (!error && remotePosts) {
                    const freshFiltered = remotePosts.filter(p => p.format !== 'course' && p.format !== 'asset');
                    cachedCreationsList = freshFiltered;
                    if (embedSearchInput && embedSearchInput.value.trim()) {
                        const term = embedSearchInput.value.toLowerCase().trim();
                        populateCreationsDOM(freshFiltered.filter(p => (p.title || '').toLowerCase().includes(term)));
                    } else {
                        populateCreationsDOM(freshFiltered);
                    }
                }
            } catch (e) {
                console.warn("Background creations fetch error:", e);
            }
        }
    }

    // --- Embed Modal Event Listeners ---
    if (closeEmbedModalBtn) {
        closeEmbedModalBtn.addEventListener('click', closeEmbedModal);
    }
    if (embedModal) {
        embedModal.addEventListener('click', (e) => {
            if (e.target === embedModal) closeEmbedModal();
        });
    }
    if (embedSearchInput) {
        embedSearchInput.addEventListener('input', () => {
            populateEmbedGrid(embedSearchInput.value);
        });
    }

    function handleConfirmation(post) {
        if (!post) return;

        const postMediaUrl = post.video_url || post.videoUrl || '';
        const postMediaType = post.media_type || post.mediaType || (post.format === 'image' ? 'image/jpeg' : 'video/mp4');

        if (embedModalMode === 'cover') {
            coverMedia.url = postMediaUrl;
            coverMedia.type = postMediaType;
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
            if (post.format === 'image' || post.format === 'pdf' || post.format === 'article' || post.format === 'diagram') {
                embedThumbnailHtml = `<img src="${postMediaUrl}" alt="${post.title || ''}" />`;
            } else {
                embedThumbnailHtml = `<video src="${postMediaUrl}" autoplay muted loop playsinline></video>`;
            }

            const postAuthor = post.username || post.author || post.source?.author || localStorage.getItem('username') || 'Creator';
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
                        <div class="embedded-caption"><span class="username">${postAuthor}</span> <span>${post.title || ''}</span></div>
                    </div>
                </div>
                <p><br></p>
            `;
            document.execCommand('insertHTML', false, embedHtml);
            saveArticle();
        }

        closeEmbedModal();
    }

    // Initial load
    loadArticle();
});