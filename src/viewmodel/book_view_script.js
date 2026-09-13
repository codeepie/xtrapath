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
                    if (confirm(`Downloading this ${access.subtypeLabel} requires unlocking the document ($${(access.price || 4.99).toFixed(2)}).\n\nWould you like to unlock it now?`)) {
                        if (window.openProductCheckoutModal) {
                            window.openProductCheckoutModal({
                                id: currentPost.id,
                                title: currentPost.title,
                                price: access.price || 4.99,
                                format: access.subtypeLabel
                            }, () => {
                                window.location.reload();
                            });
                        }
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
                bookFollowBtn.dataset.customFollow = 'true';

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

    // --- Industry-Grade Paywall Overlay Generator ---
    function renderPaywallOverlay(access, pageCount) {
        const paywallEl = document.createElement('div');
        paywallEl.className = 'book-paywall-card';
        paywallEl.style.cssText = `
            width: 100%;
            max-width: 720px;
            margin: 0 auto 40px;
            padding: 36px 28px 30px;
            border-radius: 24px;
            background: linear-gradient(180deg, rgba(17, 24, 39, 0.94) 0%, rgba(10, 14, 26, 0.98) 100%);
            border: 1px solid rgba(255, 255, 255, 0.14);
            box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.85), 0 0 45px rgba(56, 189, 248, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2);
            text-align: center;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-sizing: border-box;
            color: #fff;
            position: relative;
            z-index: 20;
            overflow: hidden;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            animation: fadeInPaywall 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        if (access.tier === 'store_sale') {
            paywallEl.innerHTML = `
                <!-- Gradient glow background effect -->
                <div style="position:absolute; top:-50px; left:50%; transform:translateX(-50%); width:300px; height:120px; background:radial-gradient(circle, rgba(56,189,248,0.3) 0%, transparent 70%); pointer-events:none; filter:blur(30px);"></div>
                
                <div style="display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:99px; background:linear-gradient(135deg, rgba(56,189,248,0.15), rgba(99,102,241,0.15)); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:14px;">
                    <i class="ri-sparkling-fill" style="color:#facc15;"></i> Free Preview Ended • Page 1 of ${pageCount}
                </div>

                <h2 style="font-family:'Outfit', sans-serif; font-size:1.65rem; font-weight:800; margin:0 0 10px; color:#ffffff; line-height:1.25; letter-spacing:-0.02em;">
                    Unlock the Complete ${access.subtypeLabel}
                </h2>
                <p style="font-size:0.92rem; color:#94a3b8; max-width:520px; margin:0 auto 22px; line-height:1.5;">
                    Gain instant access to all <strong>${pageCount} interactive pages</strong>, complete LaTeX & code sources, high-resolution PDF download, and runnable mathematical simulations.
                </p>

                <!-- Value Props Bullet Grid -->
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; max-width:540px; margin:0 auto 24px; text-align:left;">
                    <div style="display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:8px 12px; border-radius:10px; font-size:0.8rem; color:#e2e8f0;">
                        <i class="ri-check-line" style="color:#34d399; font-size:1rem; font-weight:bold;"></i> Full ${pageCount} High-Res Pages
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:8px 12px; border-radius:10px; font-size:0.8rem; color:#e2e8f0;">
                        <i class="ri-check-line" style="color:#34d399; font-size:1rem; font-weight:bold;"></i> Offline PDF & Code Download
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:8px 12px; border-radius:10px; font-size:0.8rem; color:#e2e8f0;">
                        <i class="ri-check-line" style="color:#34d399; font-size:1rem; font-weight:bold;"></i> Interactive 3D & Math Models
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:8px 12px; border-radius:10px; font-size:0.8rem; color:#e2e8f0;">
                        <i class="ri-check-line" style="color:#34d399; font-size:1rem; font-weight:bold;"></i> Lifetime Updates Included
                    </div>
                </div>

                <!-- Dual Tier Comparison Cards -->
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:14px; max-width:580px; margin:0 auto 20px;">
                    <!-- Option 1: Single Lifetime Unlock -->
                    <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:18px 16px; display:flex; flex-direction:column; justify-content:space-between; text-align:left; transition:all 0.2s;">
                        <div>
                            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#94a3b8; letter-spacing:0.5px;">Single Book</div>
                            <div style="font-size:1.6rem; font-weight:800; color:#fff; margin:4px 0 2px;">$${access.price}</div>
                            <div style="font-size:0.78rem; color:#64748b; margin-bottom:14px;">One-time payment • Lifetime access</div>
                        </div>
                        <button id="paywallBuyBtn" style="width:100%; padding:11px; background:linear-gradient(135deg, #3b82f6, #2563eb); color:#fff; border:none; border-radius:10px; font-size:0.88rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 15px rgba(59,130,246,0.35); transition:all 0.2s;">
                            <i class="ri-shopping-cart-2-line"></i> Buy Single Book
                        </button>
                    </div>

                    <!-- Option 2: All-Access Pro (Highlighted) -->
                    <div style="background:linear-gradient(135deg, rgba(147,51,234,0.12) 0%, rgba(59,130,246,0.12) 100%); border:1.5px solid rgba(168,85,247,0.5); border-radius:16px; padding:18px 16px; display:flex; flex-direction:column; justify-content:space-between; text-align:left; position:relative; box-shadow:0 8px 25px rgba(147,51,234,0.2);">
                        <div style="position:absolute; top:-10px; right:14px; background:linear-gradient(135deg, #ec4899, #8b5cf6); color:#fff; font-size:0.68rem; font-weight:800; padding:2px 8px; border-radius:99px; text-transform:uppercase; letter-spacing:0.5px;">
                            ⭐ Most Popular
                        </div>
                        <div>
                            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#c084fc; letter-spacing:0.5px;">All-Access Pro</div>
                            <div style="font-size:1.6rem; font-weight:800; color:#fff; margin:4px 0 2px;">$15 <span style="font-size:0.85rem; font-weight:500; color:#94a3b8;">/ mo</span></div>
                            <div style="font-size:0.78rem; color:#a855f7; margin-bottom:14px;">Unlock ALL books, courses & GPU studio</div>
                        </div>
                        <button id="paywallProBtn" style="width:100%; padding:11px; background:linear-gradient(135deg, #9333ea, #6366f1); color:#fff; border:none; border-radius:10px; font-size:0.88rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 15px rgba(147,51,234,0.4); transition:all 0.2s;">
                            <i class="ri-vip-crown-2-line"></i> Unlock with Pro
                        </button>
                    </div>
                </div>

                <!-- Trust Guarantee Badge -->
                <div style="display:flex; align-items:center; justify-content:center; gap:16px; font-size:0.75rem; color:#64748b; margin-top:8px;">
                    <span><i class="ri-shield-check-line" style="color:#34d399;"></i> 256-bit Encrypted</span>
                    <span><i class="ri-flashlight-line" style="color:#facc15;"></i> Instant Activation</span>
                    <span><i class="ri-refresh-line" style="color:#38bdf8;"></i> Cancel Anytime</span>
                </div>
            `;
            pdfViewer.appendChild(paywallEl);

            const buyBtn = paywallEl.querySelector('#paywallBuyBtn');
            if (buyBtn) {
                buyBtn.onclick = () => {
                    if (window.PaymentManager?.openNativeInPageCheckout) {
                        window.PaymentManager.openNativeInPageCheckout({
                            itemId: currentPost.id,
                            title: currentPost.title,
                            priceUSD: access.price,
                            format: access.subtypeLabel || 'BOOK'
                        }, () => {
                            window.location.reload();
                        });
                    } else if (window.openProductCheckoutModal) {
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
            const unlockPrice = access.price || 4.99;
            paywallEl.innerHTML = `
                <div style="position:absolute; top:-50px; left:50%; transform:translateX(-50%); width:300px; height:120px; background:radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%); pointer-events:none; filter:blur(30px);"></div>
                
                <div style="display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:99px; background:linear-gradient(135deg, rgba(37,99,235,0.18), rgba(99,102,241,0.18)); border:1px solid rgba(96,165,250,0.4); color:#60a5fa; font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:14px;">
                    <i class="ri-lock-2-fill" style="color:#60a5fa;"></i> Premium Publication
                </div>
                <h2 style="font-family:'Outfit', sans-serif; font-size:1.65rem; font-weight:800; margin:0 0 10px; color:#fff; line-height:1.25; letter-spacing:-0.02em;">
                    Unlock Full Publication Access
                </h2>
                <p style="font-size:0.92rem; color:#94a3b8; max-width:500px; margin:0 auto 22px; line-height:1.5;">
                    This ${access.subtypeLabel} is protected by the author. Unlock lifetime permanent reading, high-res PDF export, and LaTeX source access with instant checkout.
                </p>
                <div style="max-width:340px; margin:0 auto 16px;">
                    <button id="paywallUnlockDocBtn" style="width:100%; padding:14px 24px; background:linear-gradient(135deg, #2563eb, #4f46e5); color:#fff; border:none; border-radius:12px; font-size:0.98rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 6px 25px rgba(37,99,235,0.45); transition:all 0.2s;">
                        <i class="ri-lock-unlock-line"></i> Unlock Publication ($${unlockPrice.toFixed(2)})
                    </button>
                </div>
                <div style="display:flex; align-items:center; justify-content:center; gap:16px; font-size:0.75rem; color:#64748b;">
                    <span><i class="ri-shield-check-line" style="color:#34d399;"></i> 256-bit Encrypted</span>
                    <span><i class="ri-flashlight-line" style="color:#facc15;"></i> Instant Lifetime Access</span>
                    <span><i class="ri-qr-code-line" style="color:#38bdf8;"></i> Card • UPI • PayPal</span>
                </div>
            `;
            pdfViewer.appendChild(paywallEl);

            const unlockDocBtn = paywallEl.querySelector('#paywallUnlockDocBtn');
            if (unlockDocBtn) {
                unlockDocBtn.onclick = () => {
                    if (window.openProductCheckoutModal) {
                        window.openProductCheckoutModal({
                            id: currentPost.id,
                            title: currentPost.title,
                            price: unlockPrice,
                            format: access.subtypeLabel
                        }, () => {
                            location.reload();
                        });
                    } else if (window.openPricingModal) {
                        window.openPricingModal();
                    }
                };
            }
        }

        // Add explicit scroll clearance element in DOM for mobile browsers
        const scrollSpacer = document.createElement('div');
        scrollSpacer.className = 'book-scroll-spacer';
        scrollSpacer.style.cssText = 'height: 90px; width: 100%; pointer-events: none; flex-shrink: 0;';
        pdfViewer.appendChild(scrollSpacer);
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
        if (commentBtn && currentPost) {
            let countEl = commentBtn.querySelector('.action-count');
            if (!countEl) {
                countEl = document.createElement('span');
                countEl.className = 'action-count';
                commentBtn.appendChild(countEl);
            }
            const sPostId = String(currentPost.id);
            const countsMap = JSON.parse(localStorage.getItem('commentCounts') || '{}');
            const localComments = JSON.parse(localStorage.getItem('postComments') || '{}')[sPostId] || [];
            countEl.textContent = countsMap[sPostId] !== undefined ? countsMap[sPostId] : (localComments.length || 0);

            if (typeof openCommentModal === 'function') {
                commentBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openCommentModal(currentPost.id);
                });
            }
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
                    if (window.openProductCheckoutModal) {
                        window.openProductCheckoutModal({
                            id: currentPost.id,
                            title: currentPost.title || `${access.subtypeLabel} Source Code`,
                            price: access.price || 4.99,
                            format: access.subtypeLabel
                        }, () => {
                            doRemix();
                        });
                    } else {
                        doRemix();
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