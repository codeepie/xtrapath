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

    // --- Access & Protection Status Helper (Scoped Globally in View) ---
    function getAccessStatus() {
        if (!currentPost) {
            return {
                isOwn: false,
                isPro: false,
                isPurchased: false,
                isFullAccess: false,
                tier: 'public',
                price: '4.99',
                codePrice: '2.99',
                subtype: 'book',
                subtypeLabel: 'Book'
            };
        }

        const authorUserId = currentPost.user_id || '';
        const authorName = currentPost.username || currentPost.source?.author || '';
        const currentUserId = localStorage.getItem('userId') || '';
        const currentUsername = localStorage.getItem('username') || '';

        const isOwn = (currentUserId && String(currentUserId) === String(authorUserId)) ||
            (currentUsername && authorName && currentUsername.toLowerCase() === authorName.toLowerCase());
        const isPro = localStorage.getItem('is_pro') === 'true';
        const isPurchased = (window.isItemUnlocked && currentPost.id) ? window.isItemUnlocked(currentPost.id) : false;

        let tier = currentPost.source?.access_tier;
        if (!tier) {
            if (currentPost.is_for_sale || currentPost.source?.is_for_sale) tier = 'store_sale';
            else if (currentPost.source?.subscriber_only || currentPost.source?.is_premium) tier = 'subscriber_only';
            else if (currentPost.source?.is_source_protected) tier = 'protected_code';
            else tier = 'public';
        }

        const rawPrice = currentPost.price || currentPost.source?.price;
        const price = (rawPrice && Number(rawPrice) > 0) ? Number(rawPrice).toFixed(2) : '4.99';
        const rawCodePrice = currentPost.source?.code_price;
        const codePrice = (rawCodePrice && Number(rawCodePrice) > 0) ? Number(rawCodePrice).toFixed(2) : '2.99';
        const subtype = currentPost.source?.item_subtype || 'book';
        const subtypeLabel = subtype === 'worksheet' ? 'Worksheet' : (subtype === 'notes' ? 'Study Notes' : 'Book');

        return {
            isOwn,
            isPro,
            isPurchased,
            isFullAccess: isOwn || isPro || isPurchased,
            tier,
            price,
            codePrice,
            subtype,
            subtypeLabel
        };
    }

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
        } catch (e) {
            console.warn("Could not init Supabase client in bookView:", e);
        }
        return null;
    }

    // --- 1. Initialization ---
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    async function loadBook() {
        if (!postId) {
            if (bookViewTitle) bookViewTitle.textContent = "Book not found";
            if (pdfViewer) pdfViewer.innerHTML = '<div class="loading-container"><p>No book ID was provided in the URL.</p></div>';
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
            if (bookViewTitle) bookViewTitle.textContent = "Book not found";
            if (pdfViewer) pdfViewer.innerHTML = '<div class="loading-container"><p>The requested book could not be located.</p></div>';
            return;
        }

        const cleanTitle = (currentPost.title || 'Book').replace(/\s*\(Remix\)\s*/gi, '').trim();
        document.title = `${cleanTitle} | XtraPath`;
        if (bookViewTitle) bookViewTitle.textContent = cleanTitle;
        const author = currentPost.username || currentPost.source?.author || localStorage.getItem('username') || 'Author';
        if (bookViewAuthor) {
            if (author) {
                bookViewAuthor.textContent = `by ${author}`;
            } else {
                bookViewAuthor.textContent = '';
            }
        }

        // Share Book Button
        const shareBookBtn = document.getElementById('shareBookBtn');
        if (shareBookBtn) {
            shareBookBtn.onclick = () => {
                if (window.XtraShare && currentPost) {
                    window.XtraShare.open({
                        id: currentPost.id,
                        title: currentPost.title || 'Technical Book',
                        desc: currentPost.description || `Digital interactive book by ${author} on XtraPath`,
                        author: author,
                        avatar: currentPost.avatar_url || '',
                        type: 'book',
                        thumbnail: currentPost.thumbnail_url || currentPost.cover_image || currentPost.video_url || '',
                        url: window.location.href,
                        rawPost: currentPost
                    });
                }
            };
        }

        // Helper for reliable PDF file download
        function triggerPdfDownload(url, title = 'XtraPath_Book') {
            if (!url) return;
            const filename = `${title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.pdf`;
            if (url.startsWith('data:application/pdf;base64,')) {
                const base64Data = url.substring('data:application/pdf;base64,'.length);
                const binaryString = atob(base64Data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
                const blob = new Blob([bytes], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            } else {
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        }

        // Download Book Button
        const downloadBookBtn = document.getElementById('downloadBookBtn');
        if (downloadBookBtn) {
            downloadBookBtn.onclick = () => {
                const access = getAccessStatus();
                if (access.tier === 'store_sale' && !access.isFullAccess) {
                    if (confirm(`This ${access.subtypeLabel} is a paid marketplace item ($${access.price}).\n\nWould you like to purchase it now to unlock full PDF downloads?`)) {
                        if (window.openProductCheckoutModal) {
                            window.openProductCheckoutModal({
                                id: currentPost.id,
                                title: currentPost.title,
                                price: access.price,
                                format: access.subtypeLabel
                            }, () => {
                                window.location.reload();
                            });
                        }
                    }
                    return;
                }
                if (access.tier === 'subscriber_only' && !access.isOwn && !access.isPro) {
                    if (confirm(`Downloading this ${access.subtypeLabel} is exclusive to Pro members.\n\nWould you like to upgrade to Pro?`)) {
                        if (window.openPricingModal) window.openPricingModal();
                        else window.location.href = '/views/settings.html';
                    }
                    return;
                }

                if (!pdfUrl) {
                    alert("No PDF available for download.");
                    return;
                }
                triggerPdfDownload(pdfUrl, currentPost.title || 'XtraPath_Book');
            };
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

        // Prioritize portable cloud data URI if available
        let pdfUrl = currentPost.source?.pdf_data_url || currentPost.pdf_url || currentPost.pdfUrl;

        // If pdf_url is missing (e.g. from an older publish), auto-compile from LaTeX chapters!
        if (!pdfUrl && currentPost.source) {
            pdfViewer.innerHTML = `<div class="loading-container"><div class="spinner"></div><p>Rendering book pages...</p></div>`;
            try {
                let fullCode = "";
                if (currentPost.source.chapters && Array.isArray(currentPost.source.chapters)) {
                    fullCode = currentPost.source.chapters.map(c => `\\chapter{${(c.title || '').replace(/(?<!\\)&/g, '\\&')}}\n${c.content || c.code || ''}`).join('\n\n');
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
                    if (compileData.success && (compileData.pdfBase64 || compileData.pdfUrl)) {
                        pdfUrl = compileData.pdfBase64 || compileData.pdfUrl;
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
            if (pdfViewer) pdfViewer.innerHTML = '<div class="loading-container"><p style="color:red;">No PDF URL found for this book.</p></div>';
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
            let loadingTask;
            if (typeof url === 'string' && url.startsWith('data:application/pdf')) {
                // Safe and robust Base64 decoding
                const base64Index = url.indexOf(';base64,');
                const base64Data = base64Index !== -1 ? url.substring(base64Index + 8) : url;
                const cleanBase64 = base64Data.replace(/\s+/g, '');
                const binaryString = atob(cleanBase64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                loadingTask = pdfjsLib.getDocument({ data: bytes });
            } else {
                loadingTask = pdfjsLib.getDocument(url);
            }

            const pdf = await loadingTask.promise;
            pdfViewer.innerHTML = ''; // Clear loader
            pageCanvases = []; // Reset canvas array

            const pageCount = pdf.numPages;
            const access = getAccessStatus();
            const isLockedStore = (access.tier === 'store_sale' && !access.isFullAccess);
            const isLockedSubscriber = (access.tier === 'subscriber_only' && !access.isOwn && !access.isPro);
            const isRestricted = isLockedStore || isLockedSubscriber;

            // In restricted preview mode, render the first page as a sample
            const pagesToRender = isRestricted ? Math.min(1, pageCount) : pageCount;

            for (let i = 1; i <= pagesToRender; i++) {
                const page = await pdf.getPage(i);
                const canvas = document.createElement('canvas');
                canvas.dataset.pageNumber = i;
                pdfViewer.appendChild(canvas);
                pageCanvases.push(canvas);

                // --- Responsive Scaling Logic for Book View ---
                const viewportRaw = page.getViewport({ scale: 1 });
                const availableWidth = pdfViewer.clientWidth || 650;
                const scale = availableWidth / viewportRaw.width;
                const viewport = page.getViewport({ scale: scale });

                canvas.height = Math.floor(viewport.height);
                canvas.width = Math.floor(viewport.width);

                const renderContext = { canvasContext: canvas.getContext('2d'), viewport: viewport };
                await page.render(renderContext).promise;
            }

            if (isRestricted) {
                renderPaywallOverlay(access, pageCount);
            }

        } catch (err) {
            console.error("PDF Load Error:", err);

            // 1. Try embedded data URI if url was something else
            if (url !== currentPost?.source?.pdf_data_url && currentPost?.source?.pdf_data_url) {
                console.log("Retrying with portable embedded cloud PDF data URL...");
                return renderPdf(currentPost.source.pdf_data_url);
            }

            // 2. Auto-compile from LaTeX chapters/code on the fly
            if (currentPost?.source && (currentPost.source.chapters || currentPost.source.code)) {
                try {
                    let fullCode = "";
                    if (Array.isArray(currentPost.source.chapters)) {
                        fullCode = currentPost.source.chapters.map(c => `\\chapter{${(c.title || '').replace(/(?<!\\)&/g, '\\&')}}\n${c.content || c.code || ''}`).join('\n\n');
                    } else if (currentPost.source.code) {
                        fullCode = currentPost.source.code;
                    }
                    if (fullCode) {
                        pdfViewer.innerHTML = `<div class="loading-container"><div class="spinner"></div><p>Rendering high-resolution document...</p></div>`;
                        const compileRes = await fetch('/api/compile_book', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                code: fullCode,
                                title: currentPost.title || 'Book',
                                author: currentPost.username || 'Author'
                            })
                        });
                        const compileData = await compileRes.json();
                        if (compileData.success && (compileData.pdfBase64 || compileData.pdfUrl)) {
                            const newPdfUrl = compileData.pdfBase64 || compileData.pdfUrl;
                            currentPost.pdf_url = newPdfUrl;
                            return renderPdf(newPdfUrl);
                        }
                    }
                } catch (recompileErr) {
                    console.error("Auto-compile on render error failed:", recompileErr);
                }
            }

            // 3. Graceful Error Display with options
            pdfViewer.innerHTML = `<div class="loading-container" style="color: #ff6b6b; padding: 30px 20px; text-align: center;">
                <i class="ri-error-warning-line" style="font-size: 2.5rem; color: #f87171;"></i><br>
                <strong style="font-size: 1.1rem; color: white;">PDF Preview Not Available</strong><br>
                <p style="font-size: 0.85rem; color: #a1a1aa; max-width: 420px; margin: 10px auto;">
                    Could not load the requested document.
                </p>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:15px;">
                    <button id="retryDownloadBtn" class="btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                        <i class="ri-download-line"></i> Download Document
                    </button>
                    <button onclick="window.location.reload()" class="btn-glass" style="display: inline-flex; align-items: center; gap: 6px;">
                        <i class="ri-refresh-line"></i> Reload
                    </button>
                </div>
            </div>`;
            const retryDownloadBtn = document.getElementById('retryDownloadBtn');
            if (retryDownloadBtn) {
                retryDownloadBtn.onclick = () => triggerPdfDownload(url, currentPost?.title || 'Book');
            }
        }
    }

    // --- Paywall Overlay Generator ---
    function renderPaywallOverlay(access, pageCount) {
        const paywallEl = document.createElement('div');
        paywallEl.className = 'book-paywall-card';
        paywallEl.style.cssText = `
            width: 100%;
            max-width: 640px;
            margin: 20px auto 40px;
            padding: 30px 22px;
            border-radius: 18px;
            background: linear-gradient(135deg, rgba(24, 27, 36, 0.95), rgba(15, 17, 23, 0.95));
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(59, 130, 246, 0.15);
            text-align: center;
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            box-sizing: border-box;
            color: #fff;
        `;

        if (access.tier === 'store_sale') {
            paywallEl.innerHTML = `
                <div style="display:inline-flex; align-items:center; gap:6px; padding:6px 14px; border-radius:99px; background:rgba(37,99,235,0.18); border:1px solid rgba(96,165,250,0.35); color:#60a5fa; font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:14px;">
                    <i class="ri-lock-2-line"></i> Store Marketplace ${access.subtypeLabel}
                </div>
                <h2 style="font-size:1.45rem; font-weight:800; margin:0 0 8px; color:#fff;">
                    Free Sample Ended (Page 1 of ${pageCount})
                </h2>
                <p style="font-size:0.88rem; color:#a1a1aa; max-width:460px; margin:0 auto 20px; line-height:1.45;">
                    Unlock the full <strong>${currentPost.title || access.subtypeLabel}</strong> to read all ${pageCount} pages, download the complete PDF, and access interactive practice materials.
                </p>
                <div style="display:flex; gap:12px; justify-content:center; align-items:center; flex-wrap:wrap;">
                    <button id="paywallBuyBtn" style="padding:12px 26px; background:linear-gradient(135deg, #2563eb, #3b82f6); color:#fff; border:none; border-radius:12px; font-size:0.95rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 20px rgba(37,99,235,0.4); transition:all 0.2s;">
                        <i class="ri-shopping-cart-2-line"></i> Buy Now $${access.price}
                    </button>
                    <button id="paywallProBtn" style="padding:12px 20px; background:rgba(147,51,234,0.15); border:1px solid rgba(147,51,234,0.4); color:#c084fc; border-radius:12px; font-size:0.9rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all 0.2s;">
                        <i class="ri-sparkling-line"></i> Unlock with Pro ($15/mo)
                    </button>
                </div>
            `;
            pdfViewer.appendChild(paywallEl);

            const buyBtn = paywallEl.querySelector('#paywallBuyBtn');
            if (buyBtn) {
                buyBtn.onclick = () => {
                    if (window.openProductCheckoutModal) {
                        window.openProductCheckoutModal({
                            id: currentPost.id,
                            title: currentPost.title,
                            price: access.price,
                            format: access.subtypeLabel
                        }, () => {
                            window.location.reload();
                        });
                    }
                };
            }

            const proBtn = paywallEl.querySelector('#paywallProBtn');
            if (proBtn) {
                proBtn.onclick = () => {
                    if (window.openPricingModal) window.openPricingModal();
                    else window.location.href = '/views/settings.html';
                };
            }
        } else if (access.tier === 'subscriber_only') {
            paywallEl.innerHTML = `
                <div style="display:inline-flex; align-items:center; gap:6px; padding:6px 14px; border-radius:99px; background:rgba(147,51,234,0.18); border:1px solid rgba(192,132,252,0.35); color:#c084fc; font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:14px;">
                    <i class="ri-vip-crown-2-line"></i> Pro Exclusive
                </div>
                <h2 style="font-size:1.45rem; font-weight:800; margin:0 0 8px; color:#fff;">
                    Subscriber Only Content
                </h2>
                <p style="font-size:0.88rem; color:#a1a1aa; max-width:460px; margin:0 auto 20px; line-height:1.45;">
                    This ${access.subtypeLabel} is exclusive to XtraPath Pro members. Upgrade to enjoy unlimited access to all publications, interactive math & science books, and 4K GPU rendering.
                </p>
                <button id="paywallProExclusiveBtn" style="padding:12px 28px; background:linear-gradient(135deg, #8b5cf6, #3b82f6); color:#fff; border:none; border-radius:12px; font-size:0.95rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 20px rgba(139,92,246,0.4); transition:all 0.2s;">
                    <i class="ri-sparkling-line"></i> Upgrade to Pro ($15/mo)
                </button>
            `;
            pdfViewer.appendChild(paywallEl);

            const proExclusiveBtn = paywallEl.querySelector('#paywallProExclusiveBtn');
            if (proExclusiveBtn) {
                proExclusiveBtn.onclick = () => {
                    if (window.openPricingModal) window.openPricingModal();
                    else window.location.href = '/views/settings.html';
                };
            }
        }
    }

    // --- 2. UI Setup ---

    // --- 4. UI Interactions ---
    function setupFloatingActions() {
        // --- FIX: As requested, completely disable the listen/read feature on the book view page. ---
        if (listenReadBtn) {
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
            let isSaved = savedPosts.map(String).includes(String(currentPost.id));
            const saveIcon = saveBtn.querySelector('i');

            const updateSaveButton = () => {
                if (saveIcon) saveIcon.className = isSaved ? 'ri-bookmark-fill' : 'ri-bookmark-line';
                saveBtn.classList.toggle('saved', isSaved);
            };
            updateSaveButton();

            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof window.togglePostSave === 'function') {
                    window.togglePostSave(currentPost.id, saveBtn);
                    isSaved = !isSaved;
                    updateSaveButton();
                } else {
                    let currentSaved = JSON.parse(localStorage.getItem('savedPosts') || '[]');
                    if (isSaved) {
                        currentSaved = currentSaved.filter(id => String(id) !== String(currentPost.id));
                    } else {
                        currentSaved.unshift(currentPost.id);
                    }
                    localStorage.setItem('savedPosts', JSON.stringify(currentSaved));
                    isSaved = !isSaved;
                    updateSaveButton();
                }
            });
        }

        // Comment Button Logic
        if (commentBtn && currentPost && typeof openCommentModal === 'function') {
            commentBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openCommentModal(currentPost.id);
            });
        }

        // Remix & Lineage Count Calculation
        const updateRemixUI = (count) => {
            if (remixBookBtn) {
                let remixCountEl = remixBookBtn.querySelector('.action-count');
                if (!remixCountEl) {
                    remixCountEl = document.createElement('span');
                    remixCountEl.className = 'action-count';
                    remixBookBtn.appendChild(remixCountEl);
                }
                remixCountEl.textContent = count;
                remixCountEl.style.display = count > 0 ? 'inline-block' : 'none';
            }
            if (lineageBtn) {
                const lineageCountEl = lineageBtn.querySelector('.action-count');
                if (lineageCountEl) {
                    lineageCountEl.textContent = count;
                    lineageCountEl.style.display = count > 0 ? 'inline-block' : 'none';
                }
            }
        };

        let initialCount = 0;
        if (typeof window.getPostRemixCount === 'function' && currentPost) {
            initialCount = window.getPostRemixCount(currentPost.id);
        } else if (currentPost) {
            const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
            initialCount = allPosts.filter(p => String(p.original_id || p.originalId) === String(currentPost.id)).length;
        }
        updateRemixUI(initialCount);

        // Async fetch global remix count from Supabase
        (async () => {
            if (!currentPost) return;
            const client = await getSupabase();
            if (client) {
                try {
                    const { count, error: countErr } = await client
                        .from('posts')
                        .select('*', { count: 'exact', head: true })
                        .eq('original_id', currentPost.id);
                    if (!countErr && typeof count === 'number') {
                        updateRemixUI(Math.max(count, initialCount));
                    }
                } catch (e) {
                    console.warn("Could not fetch remix count from Supabase:", e);
                }
            }
        })();

        // Remix Button Logic with Protection Options
        function doRemix() {
            localStorage.setItem('remixMeta', JSON.stringify({
                source: currentPost.source,
                originalId: currentPost.id,
                title: currentPost.title,
                user_id: currentPost.user_id
            }));
            window.location.href = 'xtraBook.html';
        }

        if (remixBookBtn && currentPost) {
            remixBookBtn.onclick = () => {
                const access = getAccessStatus();

                // 1. Store Sale Document
                if (access.tier === 'store_sale' && !access.isFullAccess) {
                    if (confirm(`This ${access.subtypeLabel} is listed in the XtraStore ($${access.price}).\n\nPurchase it now to unlock the full document and LaTeX source in Studio?`)) {
                        if (window.openProductCheckoutModal) {
                            window.openProductCheckoutModal({
                                id: currentPost.id,
                                title: currentPost.title,
                                price: access.price,
                                format: access.subtypeLabel
                            }, () => {
                                doRemix();
                            });
                        }
                    }
                    return;
                }

                // 2. Subscriber Only Document
                if (access.tier === 'subscriber_only' && !access.isOwn && !access.isPro) {
                    if (confirm(`Remixing this ${access.subtypeLabel} is exclusive to Pro subscribers.\n\nUpgrade to Pro to edit and remix in Studio?`)) {
                        if (window.openPricingModal) window.openPricingModal();
                        else window.location.href = '/views/settings.html';
                    }
                    return;
                }

                // 3. Protected Source Code (Free to read, Paid to Remix)
                if (access.tier === 'protected_code' && !access.isFullAccess) {
                    if (window.openSourceCodeUnlockModal) {
                        window.openSourceCodeUnlockModal({
                            id: currentPost.id,
                            title: currentPost.title || `${access.subtypeLabel} Source Code`,
                            code_price: access.codePrice
                        }, () => {
                            doRemix();
                        });
                    } else if (window.openProductCheckoutModal) {
                        window.openProductCheckoutModal({
                            id: currentPost.id,
                            title: `${currentPost.title} (LaTeX Source)`,
                            price: access.codePrice,
                            format: 'CODE'
                        }, () => {
                            doRemix();
                        });
                    } else {
                        doRemix();
                    }
                    return;
                }

                // 4. Public Free or Already Unlocked
                doRemix();
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