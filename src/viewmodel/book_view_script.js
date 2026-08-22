document.addEventListener('DOMContentLoaded', () => {
    // --- 0. Element Cache ---
    const bookViewTitle = document.getElementById('bookViewTitle');
    const bookViewAuthor = document.getElementById('bookViewAuthor');
    const pdfViewer = document.getElementById('pdfViewer');
    const audioPlayer = document.getElementById('audioPlayer');

    const listenReadBtn = document.getElementById('listenReadBtn');
    const bookPageActions = document.querySelector('.book-page-actions');
    const mainActionBtn = document.getElementById('mainActionBtn');
    const likeBtn = document.getElementById('likeBtn');
    const commentBtn = document.getElementById('commentBtn');
    const saveBtn = document.getElementById('saveBtn');
    const remixBookBtn = document.getElementById('remixBookBtn');
    const lineageBtn = document.getElementById('lineageBtn');
    const chapterFab = document.getElementById('chapterFab');
    const chapterFabBtn = document.getElementById('chapterFabBtn');
    const chapterFabList = document.getElementById('chapterFabList');
    let currentChapterIndex = 0;
    // --- State ---
    let pageCanvases = [];
    let currentPost = null;

    // --- Supabase Helper ---
    async function getSupabase() {
        if (window.supabaseClient) return window.supabaseClient;
        try {
            const configRes = await fetch('/api/config');
            const config = await configRes.json();
            if (window.supabase && window.supabase.createClient) {
                window.supabaseClient = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
                return window.supabaseClient;
            }
        } catch(e) {
            console.warn("Could not init Supabase client in bookView:", e);
        }
        return null;
    }

    // --- 1. Initialization ---
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    async function loadBook() {
        if (!postId) {
            if(bookViewTitle) bookViewTitle.textContent = "Book not found";
            if(pdfViewer) pdfViewer.innerHTML = '<div class="loading-container"><p>No book ID was provided in the URL.</p></div>';
            return;
        }

        pdfViewer.innerHTML = `<div class="loading-container"><div class="spinner"></div><p>Loading Book...</p></div>`;

        // 1. Fetch from Supabase directly first (source of truth for UUIDs)
        const client = await getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from('posts').select('*').eq('id', postId).single();
                if (data && !error) {
                    currentPost = data;
                }
            } catch (err) {
                console.warn("Supabase fetch failed, checking localStorage:", err);
            }
        }

        // 2. Fallback to localStorage if Supabase failed or returned nothing
        if (!currentPost) {
            const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            currentPost = allPosts.find(p => String(p.id) === String(postId));
        }

        if (!currentPost || currentPost.format !== 'pdf') {
            if(bookViewTitle) bookViewTitle.textContent = "Book not found";
            if(pdfViewer) pdfViewer.innerHTML = '<div class="loading-container"><p>The requested book could not be located.</p></div>';
            return;
        }

        document.title = `${currentPost.title} | XtraPath`;
        if(bookViewTitle) bookViewTitle.textContent = currentPost.title;
        const author = currentPost.username || currentPost.source?.author || localStorage.getItem('username') || 'Author';
        if (bookViewAuthor) {
            if (author) {
                bookViewAuthor.textContent = `by ${author}`;
            } else {
                bookViewAuthor.textContent = '';
            }
        }

        // Populate the footer profile element and Follow button
        const footerUsername = document.getElementById('footerUsername');
        if (footerUsername) {
            footerUsername.textContent = author;
            footerUsername.style.cursor = 'pointer';
            if (currentPost.user_id) {
                footerUsername.onclick = () => window.location.href = `/views/profile.html?id=${currentPost.user_id}`;
            }
        }

        const bookFollowBtn = document.querySelector('.book-footer-profile .btn-follow');
        if (bookFollowBtn) {
            const authorUserId = currentPost.user_id || '';
            const isOwn = (localStorage.getItem('userId') && String(localStorage.getItem('userId')) === String(authorUserId)) || 
                          (localStorage.getItem('username') && localStorage.getItem('username').toLowerCase() === author.toLowerCase());

            if (isOwn) {
                bookFollowBtn.style.display = 'none';
            } else {
                bookFollowBtn.style.display = 'inline-block';
                bookFollowBtn.dataset.userId = authorUserId;
                bookFollowBtn.dataset.username = author;

                const isFollowing = window.isFollowingUser ? window.isFollowingUser(authorUserId, author) : false;
                bookFollowBtn.textContent = isFollowing ? 'Following' : 'Follow';
                if (isFollowing) bookFollowBtn.classList.add('following');
                else bookFollowBtn.classList.remove('following');

                bookFollowBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (window.toggleFollowUser) {
                        const nowFollowing = window.toggleFollowUser({
                            userId: authorUserId,
                            username: author,
                            fullName: author,
                            avatarUrl: currentPost.avatar_url || ''
                        });
                        bookFollowBtn.textContent = nowFollowing ? 'Following' : 'Follow';
                        if (nowFollowing) bookFollowBtn.classList.add('following');
                        else bookFollowBtn.classList.remove('following');
                    }
                };
            }
        }

        let pdfUrl = currentPost.pdf_url || currentPost.pdfUrl;

        // If pdf_url is missing (e.g. from an older publish), auto-compile from LaTeX chapters!
        if (!pdfUrl && currentPost.source) {
            pdfViewer.innerHTML = `<div class="loading-container"><div class="spinner"></div><p>Rendering book pages...</p></div>`;
            try {
                let fullCode = "";
                if (currentPost.source.chapters && Array.isArray(currentPost.source.chapters)) {
                    fullCode = currentPost.source.chapters.map(c => `\\chapter{${c.title || ''}}\n${c.content || c.code || ''}`).join('\n\n');
                } else if (currentPost.source.code) {
                    fullCode = currentPost.source.code;
                }

                if (fullCode) {
                    const compileRes = await fetch('/api/compile_book', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            code: fullCode,
                            title: currentPost.title || 'Book',
                            author: author
                        })
                    });
                    const compileData = await compileRes.json();
                    if (compileData.success && compileData.pdfUrl) {
                        pdfUrl = compileData.pdfUrl;
                        currentPost.pdf_url = pdfUrl;

                        // Save updated pdf_url back to Supabase
                        if (client) {
                            client.from('posts').update({ pdf_url: pdfUrl }).eq('id', currentPost.id);
                        }
                    }
                }
            } catch (compileErr) {
                console.error("Auto compile failed:", compileErr);
            }
        }

        if (pdfUrl) {
            renderPdf(pdfUrl);
        } else {
            if(pdfViewer) pdfViewer.innerHTML = '<div class="loading-container"><p style="color:red;">No PDF URL found for this book.</p></div>';
        }

        setupFloatingActions();
        setupChapterNav();
    }

    // --- 3. PDF Rendering ---
    async function renderPdf(url) {
        if (!window.pdfjsLib) {
            pdfViewer.innerHTML = `<div class="loading-container"><p style="color:orange;">PDF library not loaded.</p></div>`;
            return;
        };
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        pdfViewer.innerHTML = `<div class="loading-container"><div class="spinner"></div><p>Loading PDF...</p></div>`;

        try {
            const pdf = await pdfjsLib.getDocument(url).promise;
            pdfViewer.innerHTML = ''; // Clear loader
            pageCanvases = []; // Reset canvas array

            const pageCount = pdf.numPages;

            for (let i = 1; i <= pageCount; i++) {
                const page = await pdf.getPage(i);
                const canvas = document.createElement('canvas');
                canvas.dataset.pageNumber = i;
                pdfViewer.appendChild(canvas);
                pageCanvases.push(canvas);

                // --- Responsive Scaling Logic for Article View ---
                const viewportRaw = page.getViewport({ scale: 1 });
                // The container (pdfViewer) has max-width and padding, so its clientWidth is the target.
                const availableWidth = pdfViewer.clientWidth;
                const scale = availableWidth / viewportRaw.width;
                const viewport = page.getViewport({ scale: scale });

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = { canvasContext: canvas.getContext('2d'), viewport: viewport };
                await page.render(renderContext).promise;
            }

        } catch (err) {
            console.error("PDF Load Error:", err);
            pdfViewer.innerHTML = `<div class="loading-container" style="color: #ff6b6b;">
                <i class="ri-error-warning-line" style="font-size: 2rem;"></i><br>
                <strong>PDF Preview Failed</strong><br>
                <span style="font-size: 0.8rem; opacity: 0.8;">Could not load document.</span><br>
                <button onclick="window.open('${url}', '_blank')" class="btn-primary" style="margin-top: 15px;">Open in New Tab</button>
            </div>`;
        }
    }

    // --- 2. UI Setup ---

    // --- 4. UI Interactions ---
    function setupFloatingActions() {
        // --- FIX: As requested, completely disable the listen/read feature on the book view page. ---
        if(listenReadBtn) {
            listenReadBtn.style.display = 'none';
        }
        if (audioPlayer) {
            audioPlayer.style.display = 'none';
        }

        // Mobile FAB expand/collapse
        if (mainActionBtn && bookPageActions) {
            mainActionBtn.onclick = () => {
                bookPageActions.classList.toggle('active');
            };
        }

        // Like Button Logic
        if (likeBtn) {
            const likeIcon = likeBtn.querySelector('i');
            const likesCountEl = likeBtn.querySelector('.action-count');
            let isLiked = false;
            const baseLikes = 1200; // Mock count
            
            likeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                isLiked = !isLiked;
                likeBtn.classList.toggle('liked', isLiked);
                likeIcon.className = isLiked ? 'ri-heart-fill' : 'ri-heart-line';
                
                const currentLikes = isLiked ? baseLikes + 1 : baseLikes;
                likesCountEl.textContent = (currentLikes / 1000).toFixed(1) + 'k';
                if (isLiked) {
                    likeBtn.classList.add('popping');
                    setTimeout(() => likeBtn.classList.remove('popping'), 300);
                }
            });
        }

        // Save Button Logic
        if (saveBtn && currentPost) {
            const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
            let isSaved = savedPosts.includes(currentPost.id);
            const saveIcon = saveBtn.querySelector('i');

            const updateSaveButton = () => {
                saveIcon.className = isSaved ? 'ri-bookmark-fill' : 'ri-bookmark-line';
            };
            updateSaveButton();

            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                let currentSaved = JSON.parse(localStorage.getItem('savedPosts') || '[]');
                if (isSaved) {
                    currentSaved = currentSaved.filter(id => id != currentPost.id);
                } else {
                    currentSaved.unshift(currentPost.id);
                }
                localStorage.setItem('savedPosts', JSON.stringify(currentSaved));
                isSaved = !isSaved;
                updateSaveButton();
            });
        }

        // Comment Button Logic
        if (commentBtn && currentPost && typeof openCommentModal === 'function') {
            commentBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openCommentModal(currentPost.id);
            });
        }

        // Remix Button Logic
        if (remixBookBtn && currentPost) {
            remixBookBtn.onclick = () => {
                localStorage.setItem('remixMeta', JSON.stringify({
                    source: currentPost.source,
                    originalId: currentPost.id
                }));
                window.location.href = 'xtraBook.html';
            };
        }

        // Lineage Button Logic
        if (lineageBtn && currentPost) {
            lineageBtn.onclick = () => {
                const rootId = currentPost.original_id || currentPost.originalId || currentPost.id;
                window.location.href = `lineage.html?id=${rootId}`;
            };
        }
    }

    function setupChapterNav() {
        // This function is not implemented in the provided context.
    }

    // --- Run on Load ---
    loadBook();
});