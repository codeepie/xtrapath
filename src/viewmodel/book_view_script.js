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

    function getBackendUrl() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:8000';
        } else if (window.location.port === '8000') {
            return ""; 
        } else {
            return `${window.location.protocol}//${window.location.hostname}:8000`;
        }
    }

    // --- 1. Initialization ---
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    function loadBook() {
        if (!postId) {
            if(bookViewTitle) bookViewTitle.textContent = "Book not found";
            if(pdfViewer) pdfViewer.innerHTML = '<div class="loading-container"><p>No book ID was provided in the URL.</p></div>';
            return;
        };
        const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        currentPost = allPosts.find(p => p.id == postId);

        if (!currentPost || currentPost.format !== 'pdf') {
            if(bookViewTitle) bookViewTitle.textContent = "Book not found";
            if(pdfViewer) pdfViewer.innerHTML = '<div class="loading-container"><p>The requested book could not be located.</p></div>';
            return;
        }

        document.title = `${currentPost.title} | XtraPath`;
        if(bookViewTitle) bookViewTitle.textContent = currentPost.title;
        const author = currentPost.source?.author || 'Dr. Nova';
        if (bookViewAuthor) {
            if (author) {
                bookViewAuthor.textContent = `by ${author}`;
            } else {
                bookViewAuthor.textContent = '';
            }
        }

        // Populate the new footer profile element
        const footerUsername = document.getElementById('footerUsername');
        if (footerUsername) footerUsername.textContent = author;

        if (currentPost.pdfUrl) {
            const fullPdfUrl = currentPost.pdfUrl.startsWith('http') ? currentPost.pdfUrl : `${getBackendUrl()}${currentPost.pdfUrl}`;
            renderPdf(fullPdfUrl);
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
                const rootId = currentPost.originalId || currentPost.id;
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