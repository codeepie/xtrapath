// --- Initial Data ---
console.log("XtraBook Script v11 Loaded");
const defaultChapters = [
    {
        id: 1,
        title: "The Distance Formula",
        content: `\\noindent
% --- EDITOR VISIBILITY CHECK ---
% If you can read this, the mobile editor is working.
\\colorbox{practicegreen}{\\parbox{\\dimexpr\\linewidth-2\\fboxsep}{\\centering\\small\\bfseries\\color{white} EXPERIMENTAL LAB: FIELD APPLICATIONS}}
\\vspace{15pt}

\\begin{enumerate}
    \\item \\textbf{Laser Rangefinder Calibration:} A surveyor places a laser at origin $(0,0)$ and a reflector at $(15, 20)$. The laser reads $24.8$ units. Calculate the theoretical distance and find the percentage error.
    \\item \\textbf{The Acoustic Localization:} Two microphones at $M_1(-5, 0)$ and $M_2(5, 0)$ detect sound. A third at $M_3(0, 12)$ detects it later. Find the source $S(0, y)$.
    \\item \\textbf{Shadow Tracking:} A pole's top is at $(0, 5)$ and its shadow is at $(3, 0)$. When the sun moves, the shadow moves to $(0, 0)$. Calculate the total distance the shadow tip traveled.
    \\item \\textbf{Tension Wire Stability:} A tower at $(0, 12)$ is secured by wires anchored at $(x, 0)$ and $(-x, 0)$. If the total length of both wires is 26, find $x$.
    \\item \\textbf{GPS Drift Analysis:} Readings at $(10, 10)$ drift to $(10.1, 9.9)$ and $(9.8, 10.2)$. Find the average distance of these drift points from the center.
\\end{enumerate}`
    },
    {
        id: 2,
        title: "Coordinate Geometry",
        content: `\\section{Introduction}
Coordinate geometry, also known as analytic geometry, is the study of geometry using a coordinate system. This contrasts with synthetic geometry.

\\section{The Cartesian Plane}
The Cartesian plane is defined by two perpendicular number lines: the x-axis, which is horizontal, and the y-axis, which is vertical.`
    }
];

// Load from LocalStorage or use Default
let chapters = JSON.parse(localStorage.getItem('xtraBookChapters')) || defaultChapters;
let currentChapterId = chapters.length > 0 ? chapters[0].id : 1;
let remixOriginalId = null; // To store the ID of the post being remixed

// --- Initialization ---
const codeTextarea = document.getElementById('code');
const chapterList = document.getElementById('chapterList');
const currentChapterTitleInput = document.getElementById('currentChapterTitle');
const addChapterBtn = document.getElementById('addChapterBtn');
const bookTitleInput = document.getElementById('bookTitle');
const bookAuthorInput = document.getElementById('bookAuthor');

// Helper to Save State
function saveBookState() {
    localStorage.setItem('xtraBookChapters', JSON.stringify(chapters));
    if (bookTitleInput) localStorage.setItem('xtraBookTitle', bookTitleInput.value);
    if (bookAuthorInput) localStorage.setItem('xtraBookAuthor', bookAuthorInput.value);
}

function renderChapterList() {
    if (!chapterList) return;
    chapterList.innerHTML = '';
    
    chapters.forEach(chap => {
        const li = document.createElement('li');
        li.className = `chapter-item ${chap.id === currentChapterId ? 'active' : ''}`;
        li.textContent = chap.title || `Chapter ${chap.id}`;
        li.onclick = () => switchChapter(chap.id);
        chapterList.appendChild(li);
    });
}

function switchChapter(id) {
    // Save current work
    const currentChap = chapters.find(c => c.id === currentChapterId);
    if (currentChap && codeTextarea && currentChapterTitleInput) {
        currentChap.content = codeTextarea.value;
        currentChap.title = currentChapterTitleInput.value;
    }
    saveBookState();

    // Load new chapter
    currentChapterId = id;
    const newChap = chapters.find(c => c.id === currentChapterId);
    if (newChap && codeTextarea && currentChapterTitleInput) {
        codeTextarea.value = newChap.content;
        currentChapterTitleInput.value = newChap.title;
    }
    
    renderChapterList();
}

function addChapter() {
    const newId = chapters.length > 0 ? Math.max(...chapters.map(c => c.id)) + 1 : 1;
    chapters.push({
        id: newId,
        title: "New Chapter",
        content: "Write your content here..."
    });
    switchChapter(newId);
    saveBookState();
}

if (addChapterBtn) {
    addChapterBtn.onclick = addChapter;
}

// Sync title input with list in real-time
if (currentChapterTitleInput) {
    currentChapterTitleInput.addEventListener('input', function() {
        const currentChap = chapters.find(c => c.id === currentChapterId);
        if (currentChap) {
            currentChap.title = this.value;
            saveBookState();
            renderChapterList();
        }
    });
}

// Initial Render
if (codeTextarea && currentChapterTitleInput) {
    const initialChap = chapters.find(c => c.id === currentChapterId);
    if (initialChap) {
        codeTextarea.value = initialChap.content;
        currentChapterTitleInput.value = initialChap.title;
    }
    
    // Restore Book Metadata
    if (bookTitleInput) {
        const savedTitle = localStorage.getItem('xtraBookTitle');
        if (savedTitle) bookTitleInput.value = savedTitle;
        bookTitleInput.addEventListener('input', saveBookState);
    }
    if (bookAuthorInput) {
        const savedAuthor = localStorage.getItem('xtraBookAuthor');
        if (savedAuthor) bookAuthorInput.value = savedAuthor;
        bookAuthorInput.addEventListener('input', saveBookState);
    }

    // Save content on typing
    if (codeTextarea) {
        codeTextarea.addEventListener('input', () => {
            const currentChap = chapters.find(c => c.id === currentChapterId);
            if (currentChap) currentChap.content = codeTextarea.value;
            saveBookState();
        });
    }
    renderChapterList();
}

// --- Handle Remixing ---
const remixMetaRaw = localStorage.getItem('remixMeta');
if (remixMetaRaw) {
    const meta = JSON.parse(remixMetaRaw);
    if (meta.source && meta.source.engine === 'latex') {
        console.log("Loading book data for remix...");
        chapters = meta.source.chapters;
        remixOriginalId = meta.originalId;
        currentChapterId = chapters.length > 0 ? chapters[0].id : 1;
        saveBookState(); // Save the new remixed content to local storage
    }
    // Clear the remix meta so it's not reused on next page load
    localStorage.removeItem('remixMeta');
}


// --- Dark Mode Toggle ---
const darkModeToggle = document.getElementById('darkModeToggle');
const darkModePreference = localStorage.getItem('darkMode');

if (darkModePreference === null || darkModePreference === 'true') {
    document.body.classList.add('dark-mode');
    if (darkModeToggle) darkModeToggle.checked = true;
}

if (darkModeToggle) {
    darkModeToggle.addEventListener('change', function() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', this.checked);
    });
}

// --- Compile Button Logic ---
const renderBtn = document.getElementById('renderBtn');
const mobileRenderBtn = document.getElementById('mobileRenderBtn');
const outputDiv = document.getElementById('output');
const publishBookBtn = document.getElementById('publishBookBtn');


if (renderBtn) {
    const compileBook = function() {
        // Save current state before compiling
        const currentChap = chapters.find(c => c.id === currentChapterId);
        if (currentChap && codeTextarea && currentChapterTitleInput) {
            currentChap.content = codeTextarea.value;
            currentChap.title = currentChapterTitleInput.value;
        }
        saveBookState();

        // Construct Full LaTeX Code
        let fullCode = "";
        chapters.forEach(chap => {
            fullCode += `\\chapter{${chap.title}}\n${chap.content}\n\n`;
        });

        // Get Settings
        const bookTitle = bookTitleInput ? bookTitleInput.value : "My XtraBook";
        const bookAuthor = bookAuthorInput ? bookAuthorInput.value : "XtraPath User";

        // Loading State
        renderBtn.disabled = true;
        renderBtn.innerHTML = '<i class="ri-loader-4-line spin"></i> Compiling on Server...';
        if (mobileRenderBtn) mobileRenderBtn.innerHTML = '<i class="ri-loader-4-line spin"></i>';
        if (publishBookBtn) publishBookBtn.style.display = 'none'; // Hide during compile
        const mobilePublishBtn = document.getElementById('mobilePublishBtn');
        if (mobilePublishBtn) mobilePublishBtn.style.display = 'none';
        
        if (outputDiv) {
            outputDiv.innerHTML = `
                <div class="loading-container">
                    <div class="spinner" style="margin-bottom:15px;"></div>
                    <p>Running pdflatex on server...</p>
                </div>
            `;
        }

        let isSuccess = false;

        // Call Backend
        // Dynamic URL to support mobile testing on local network
        let backendUrl = "";
        if (window.location.protocol === 'file:') {
            backendUrl = 'http://localhost:8000';
        } else if (window.location.port === '8000') {
            // If serving from the backend port, use relative paths
            backendUrl = ""; 
        } else {
            // If serving from frontend port (e.g. 5500), point to backend port 8000 on same host
            backendUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
        }
        
        fetch(`${backendUrl}/compile_book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: fullCode, title: bookTitle, author: bookAuthor })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                isSuccess = true;
                // Ensure the PDF URL includes the backend host if it's a relative path
                const fullPdfUrl = data.pdfUrl.startsWith('http') ? data.pdfUrl : `${backendUrl}${data.pdfUrl}`;
                // Add timestamp to prevent caching
                const cacheBustUrl = `${fullPdfUrl}?t=${new Date().getTime()}`;
                
                if (outputDiv) {
                    // Use PDF.js for consistent rendering on Mobile & Desktop
                    outputDiv.innerHTML = `
                        <div id="pdf-wrapper" style="flex: 1; width: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; background: #525659; display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 20px; position: relative;">
                            <div id="pdf-loader" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; background: rgba(0,0,0,0.7); padding: 10px 20px; border-radius: 8px; display: none; z-index: 100;">Rendering...</div>
                        </div>
                    `;

                    if (window.pdfjsLib) {
                        const pdfjsLib = window.pdfjsLib;
                        // Ensure worker is set (Critical for some browsers)
                        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                        }

                        // Show loader
                        const loader = document.getElementById('pdf-loader');
                        if(loader) loader.style.display = 'block';

                        const loadingTask = pdfjsLib.getDocument(cacheBustUrl);
                        loadingTask.promise.then(pdf => {
                            const pageCount = pdf.numPages;
                            if(loader) loader.style.display = 'none';
                            
                            const wrapper = document.getElementById('pdf-wrapper');

                            // Render all pages
                            for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
                                const canvas = document.createElement('canvas');
                                canvas.style.boxShadow = "0 5px 15px rgba(0,0,0,0.5)";
                                canvas.style.background = "white";
                                canvas.style.display = "block";
                                wrapper.appendChild(canvas);

                                pdf.getPage(pageNum).then(page => {
                                    const ctx = canvas.getContext('2d');
                                    
                                    // Responsive Scale Calculation (Robust for Mobile)
                                    // Fallback to window width if wrapper is hidden/zero
                                    let containerWidth = (wrapper && wrapper.clientWidth > 0) ? wrapper.clientWidth : (window.innerWidth || 360);
                                    
                                    // Less padding on mobile to maximize readability
                                    const padding = window.innerWidth < 768 ? 20 : 40;
                                    const desiredWidth = Math.max(containerWidth - padding, 280);
                                    
                                    const viewportRaw = page.getViewport({scale: 1});
                                    const scale = Math.min(desiredWidth / viewportRaw.width, 1.5); // Cap scale at 1.5x
                                    
                                    const viewport = page.getViewport({scale: scale});

                                    canvas.height = viewport.height;
                                    canvas.width = viewport.width;
                                    
                                    // Clear canvas before render
                                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                                    const renderContext = { canvasContext: ctx, viewport: viewport };
                                    page.render(renderContext);
                                });
                            }
                        }).catch(err => {
                            console.error("PDF Load Error:", err);
                            const wrapper = document.getElementById('pdf-wrapper');
                            if(wrapper) wrapper.innerHTML = `<div style="color: #ff6b6b; text-align: center; margin-top: 50px;">
                                <i class="ri-error-warning-line" style="font-size: 2rem;"></i><br>
                                <strong>Preview Failed</strong><br>
                                <span style="font-size: 0.8rem; opacity: 0.8;">${err.message}</span><br>
                                <a href="${fullPdfUrl}" target="_blank" class="btn-primary" style="margin-top: 15px; display: inline-block;">Download PDF</a>
                            </div>`;
                        });
                    } else {
                        outputDiv.innerHTML = `<div style="padding:20px; text-align:center; color:orange;">
                            PDF Renderer library not loaded.<br>
                            <a href="${fullPdfUrl}" target="_blank" class="btn-primary" style="margin-top:10px;">Download PDF</a>
                        </div>`;
                    }
                }

                // Convert Render Button to Download Button
                renderBtn.innerHTML = '<i class="ri-download-line"></i> Download PDF';
                renderBtn.onclick = () => window.open(fullPdfUrl, '_blank');
                if (mobileRenderBtn) mobileRenderBtn.innerHTML = '<i class="ri-download-line"></i>';

                // Show and configure the Publish button
                if (publishBookBtn) {
                    publishBookBtn.style.display = 'inline-flex';
                    
                    // Also show mobile publish button
                    const mobilePublishBtn = document.getElementById('mobilePublishBtn');
                    if (mobilePublishBtn) mobilePublishBtn.style.display = 'flex';

                    publishBookBtn.onclick = () => {
                        // Generate a thumbnail from the first page of the PDF
                        if (window.pdfjsLib) {
                            const loadingTask = pdfjsLib.getDocument(cacheBustUrl);
                            loadingTask.promise.then(pdf => {
                                return pdf.getPage(1); // Get the first page
                            }).then(page => {
                                const desiredWidth = 540; // Match graph preview width
                                const viewport = page.getViewport({ scale: 1 });
                                const scale = desiredWidth / viewport.width;
                                const scaledViewport = page.getViewport({ scale: scale });

                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                canvas.height = scaledViewport.height;
                                canvas.width = scaledViewport.width;

                                const renderContext = { canvasContext: ctx, viewport: scaledViewport };
                                return page.render(renderContext).promise.then(() => canvas.toDataURL('image/jpeg', 0.8));
                            }).then(thumbnailDataUrl => {
                                const postTitle = bookTitleInput.value || "Untitled Book";
                                const postDesc = `A new book titled '${postTitle}' by ${bookAuthorInput.value}.`;

                                const newPost = {
                                    id: Date.now(),
                                    title: postTitle,
                                    desc: postDesc,
                                    videoUrl: thumbnailDataUrl, // Use the generated image as the preview
                                    pdfUrl: fullPdfUrl, // Store the actual PDF link separately
                                    format: 'pdf', // Keep format as 'pdf' to distinguish it
                                    timestamp: new Date().toISOString(),
                                    source: {
                                        engine: 'latex',
                                        chapters: chapters
                                    },
                                    originalId: remixOriginalId // Use the stored original ID
                                };

                                const posts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                                posts.push(newPost);
                                localStorage.setItem('userPosts', JSON.stringify(posts));
                                if(confirm('Book published to your profile! Go to profile?')) window.location.href = 'profile.html';
                            });
                        }
                    };
                    if (mobilePublishBtn) {
                        mobilePublishBtn.onclick = () => {
                            publishBookBtn.click(); // Trigger the same logic
                        }
                    };
                }
            } else {
                if (outputDiv) {
                    outputDiv.innerHTML = `
                        <div style="padding: 20px; height: 100%; overflow: auto; background: #222; color: #ff6b6b;">
                            <h3>Compilation Error</h3>
                            <p>${data.error}</p>
                            <hr style="border-color:#444;">
                            <pre style="white-space: pre-wrap; font-family: monospace; font-size: 0.85em;">${data.logs}</pre>
                        </div>
                    `;
                }
            }
        })
        .catch(err => {
            console.error(err);
            if (outputDiv) {
                outputDiv.innerHTML = `<p style="color: red; padding: 20px;">Connection Failed. Is the backend server running on port 8000?</p>`;
            }
        })
        .finally(() => {
            renderBtn.disabled = false;
            if (!isSuccess) {
                renderBtn.innerHTML = '<i class="ri-play-fill"></i> Generate PDF';
                if (mobileRenderBtn) mobileRenderBtn.innerHTML = '<i class="ri-play-fill"></i>';
            }
        });
    };

    renderBtn.onclick = compileBook;

    // Revert button to "Generate" when user edits code
    if (codeTextarea) {
        codeTextarea.addEventListener('input', () => {
            if (renderBtn.innerHTML.includes('Download')) {
                renderBtn.innerHTML = '<i class="ri-play-fill"></i> Generate PDF';
                renderBtn.onclick = compileBook;
                if (mobileRenderBtn) mobileRenderBtn.innerHTML = '<i class="ri-play-fill"></i>';
                if (publishBookBtn) publishBookBtn.style.display = 'none';
                const mobilePublishBtn = document.getElementById('mobilePublishBtn');
                if (mobilePublishBtn) mobilePublishBtn.style.display = 'none';
            }
        });
    }
}