document.addEventListener('DOMContentLoaded', async () => {
    // --- Initial Data ---
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

console.log("XtraBook Script v11 Loaded");

// --- DATA URI to BLOB HELPER ---
function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

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
    },
    {
        id: 3,
        title: "Kinematic Trajectories & Vector Fields",
        content: `\\definecolor{accentpurple}{RGB}{109, 40, 217}
\\definecolor{darkslate}{RGB}{30, 41, 59}

\\noindent
\\colorbox{mainblue}{%
  \\parbox{\\dimexpr\\linewidth-2\\fboxsep}{%
    \\vspace{6pt}
    \\centering\\color{white}
    {\\footnotesize\\textbf{\\textsf{CORE MODULE 03 \\textbullet\\ ADVANCED VISUAL MECHANICS}}}\\par\\vspace{2pt}
    {\\large\\textbf{\\textsf{Kinematics, Trajectory Dynamics \\& Curvilinear Motion}}}
    \\vspace{6pt}
  }%
}
\\vspace{12pt}

\\section{Orthogonal Motion Decoupling}
Under a uniform gravitational field $\\vec{g} = -g\\hat{j}$, two-dimensional motion exhibits the foundational property of orthogonal independence. The horizontal coordinate preserves constant momentum, while the vertical coordinate undergoes constant acceleration:
\\begin{align}
    x(t) &= x_0 + v_{0}\\cos(\\theta)\\,t \\\\
    y(t) &= y_0 + v_{0}\\sin(\\theta)\\,t - \\frac{1}{2}gt^2
\\end{align}

\\vspace{0.5em}

\\noindent
\\begin{tikzpicture}
  \\node[draw=mainblue, fill=mainblue!5, line width=1.2pt, rounded corners=4pt, inner sep=10pt, text width=\\dimexpr\\linewidth-24pt\\relax] {
    \\textbf{\\color{mainblue}\\large The Cartesian Trajectory Equation}\\par\\vspace{4pt}
    \\small By eliminating parameter $t$ between the orthogonal coordinates, the path through the Cartesian plane forms an inverted quadratic parabola:
    \\begin{equation*}
        y(x) = (\\tan\\theta)x - \\left[ \\frac{g}{2v_0^2 \\cos^2\\theta} \\right] x^2
    \\end{equation*}
    This establishes that every ballistic trajectory in a vacuum is rigorously quadratic.
  };
\\end{tikzpicture}

\\vspace{1em}

\\begin{figure}[h]
\\centering
\\begin{tikzpicture}[scale=0.88, >=stealth]
    % Coordinate Grid
    \\draw[very thin, gray!20, step=1] (-0.5,-0.5) grid (8.5,4.5);
    
    % Axes
    \\draw[->, thick, darkslate] (-0.5,0) -- (8.8,0) node[right] {\\footnotesize $x$ (m)};
    \\draw[->, thick, darkslate] (0,-0.5) -- (0,4.8) node[above] {\\footnotesize $y$ (m)};
    \\node[below left] at (0,0) {\\footnotesize $O$};

    % Trajectory Parabola (scaled: vertex at (4, 3.5), roots at 0 and 8)
    \\draw[line width=1.6pt, mainblue, domain=0:8, samples=60] plot (\\x, {3.5 - 0.21875*(\\x - 4)*(\\x - 4)});

    % Launch Vector
    \\draw[->, line width=1.4pt, hintorange] (0,0) -- (1.8, 1.575) node[above right] {\\small $\\vec{v}_0$};
    \\draw[dashed, hintorange!70] (1.8, 1.575) -- (1.8, 0);
    \\draw[dashed, hintorange!70] (1.8, 1.575) -- (0, 1.575);
    \\draw[->, thick, hintorange!90] (0,0) -- (1.8, 0) node[midway, below] {\\footnotesize $v_{0x}$};
    \\draw[->, thick, hintorange!90] (0,0) -- (0, 1.575) node[midway, left] {\\footnotesize $v_{0y}$};

    % Launch Angle Theta Arc
    \\draw[thick, darkslate] (0.7,0) arc (0:41.2:0.7);
    \\node at (0.95, 0.28) {\\footnotesize $\\theta$};

    % Apex / Vertex
    \\filldraw[mainblue] (4, 3.5) circle (2.5pt);
    \\draw[dashed, gray!60] (4, 0) -- (4, 3.5);
    \\draw[<->, thick, practicegreen] (-0.2, 0) -- (-0.2, 3.5) node[midway, left] {\\footnotesize $H_{\\max}$};
    \\draw[->, line width=1.2pt, mainblue] (4, 3.5) -- (5.4, 3.5) node[right] {\\footnotesize $\\vec{v}_{\\text{apex}} = v_{0x}\\hat{i}$};
    \\node[above=3pt, mainblue] at (4, 3.5) {\\footnotesize $\\left( \\frac{R}{2},\\, H_{\\max} \\right)$};

    % Gravity Vector
    \\draw[->, line width=1.2pt, red!70!black] (4, 2.6) -- (4, 1.6) node[midway, right] {\\footnotesize $\\vec{g}$};

    % In-flight arbitrary point
    \\coordinate (P) at (6.2, 2.45);
    \\filldraw[black!80] (P) circle (2pt);
    \\draw[->, thick, accentpurple] (P) -- ++(1.2, -0.96) node[right] {\\footnotesize $\\vec{v}(t)$};
    \\draw[->, thin, dashed, accentpurple] (P) -- ++(1.2, 0) node[above] {\\tiny $v_x$};
    \\draw[->, thin, dashed, accentpurple] (P) -- ++(0, -0.96) node[left] {\\tiny $v_y(t)$};

    % Impact Range
    \\filldraw[hintorange] (8, 0) circle (2.5pt);
    \\draw[<->, thick, darkslate] (0, -0.35) -- (8, -0.35) node[midway, below] {\\small Range $R = \\frac{v_0^2 \\sin(2\\theta)}{g}$};
\\end{tikzpicture}
\\caption{State-space trajectory of ballistic motion with velocity vectors and extrema.}
\\end{figure}

\\section{Three-Dimensional Vector Kinematics}
When motion extends beyond a planar constraint, we express the position, velocity, and acceleration vectors in an orthonormal Cartesian trihedron $(\\hat{i}, \\hat{j}, \\hat{k})$:
\\begin{equation}
    \\vec{r}(t) = x(t)\\hat{i} + y(t)\\hat{j} + z(t)\\hat{k}, \\quad \\vec{v}(t) = \\frac{d\\vec{r}}{dt}, \\quad \\vec{a}(t) = \\frac{d^2\\vec{r}}{dt^2}
\\end{equation}

\\begin{figure}[h]
\\centering
\\begin{tikzpicture}[x={(-0.707cm,-0.4cm)}, y={(1cm,0cm)}, z={(0cm,1cm)}, scale=0.9, >=stealth]
    % 3D Axes
    \\draw[->, thick, darkslate] (0,0,0) -- (3.5,0,0) node[left] {\\footnotesize $x$ (Depth)};
    \\draw[->, thick, darkslate] (0,0,0) -- (0,4.5,0) node[right] {\\footnotesize $y$ (Width)};
    \\draw[->, thick, darkslate] (0,0,0) -- (0,0,3.5) node[above] {\\footnotesize $z$ (Altitude)};

    % Vector Point P(2, 3, 2.5)
    \\coordinate (O) at (0,0,0);
    \\coordinate (P) at (2, 3, 2.5);
    \\coordinate (Pxy) at (2, 3, 0);
    \\coordinate (Px) at (2, 0, 0);
    \\coordinate (Py) at (0, 3, 0);
    \\coordinate (Pz) at (0, 0, 2.5);

    % Base Plane Projection Box
    \\draw[dashed, mainblue!60] (Px) -- (Pxy) -- (Py);
    \\draw[dashed, mainblue!60] (Pxy) -- (P);
    \\draw[dashed, mainblue!60] (O) -- (Pxy);

    % Resultant Space Vector
    \\draw[->, line width=1.6pt, hintorange] (O) -- (P) node[above right] {\\small $\\vec{r} = x\\hat{i} + y\\hat{j} + z\\hat{k}$};
    \\filldraw[hintorange] (P) circle (2pt);

    % Basis Unit Vectors
    \\draw[->, very thick, practicegreen] (0,0,0) -- (1,0,0) node[left] {\\footnotesize $\\hat{i}$};
    \\draw[->, very thick, practicegreen] (0,0,0) -- (0,1,0) node[below] {\\footnotesize $\\hat{j}$};
    \\draw[->, very thick, practicegreen] (0,0,0) -- (0,0,1) node[left] {\\footnotesize $\\hat{k}$};
\\end{tikzpicture}
\\caption{Three-dimensional spatial vector projection and orthonormal basis decomposition.}
\\end{figure}

\\section{Kinematic Milestone Formulations}
The table below compiles the operational parameters governing each phase of ballistic flight:

\\begin{center}
\\renewcommand{\\arraystretch}{1.3}
\\begin{tabular}{|l|c|c|c|}
\\hline
\\textbf{Phase} & \\textbf{Time $t$} & \\textbf{Velocity Vector $\\vec{v}(t)$} & \\textbf{Kinetic Energy} \\\\
\\hline
Launch & $0$ & $v_{0}\\cos\\theta\\hat{i} + v_{0}\\sin\\theta\\hat{j}$ & $\\frac{1}{2}m v_0^2$ \\\\
Vertex (Apex) & $\\frac{v_0\\sin\\theta}{g}$ & $v_{0}\\cos\\theta\\hat{i} + 0\\hat{j}$ & $\\frac{1}{2}m v_0^2 \\cos^2\\theta$ \\\\
Impact & $\\frac{2v_0\\sin\\theta}{g}$ & $v_{0}\\cos\\theta\\hat{i} - v_{0}\\sin\\theta\\hat{j}$ & $\\frac{1}{2}m v_0^2$ \\\\
\\hline
\\end{tabular}
\\end{center}

\\vspace{0.8em}

\\noindent
\\begin{tikzpicture}
  \\node[draw=practicegreen, fill=practicegreen!8, line width=1.2pt, rounded corners=4pt, inner sep=10pt, text width=\\dimexpr\\linewidth-24pt\\relax] {
    \\textbf{\\color{practicegreen}\\small WORKED VISUAL LAB: TARGET RADAR INTERCEPTION}\\par\\vspace{4pt}
    \\small An interceptor drone launches at $v_0 = 28\\,\\text{m/s}$ at an angle $\\theta = 45^\\circ$ ($g \\approx 9.8\\,\\text{m/s}^2$).
    \\begin{enumerate}
      \\item \\textbf{Maximum Altitude:} $H_{\\max} = \\frac{(28)^2 \\sin^2(45^\\circ)}{2(9.8)} = \\frac{784 \\times 0.5}{19.6} = 20.0\\,\\text{m}$.
      \\item \\textbf{Total Flight Range:} $R = \\frac{(28)^2 \\sin(90^\\circ)}{9.8} = \\frac{784 \\times 1}{9.8} = 80.0\\,\\text{m}$.
      \\item \\textbf{Vector Curvature:} At the apex, acceleration is strictly perpendicular to velocity: $\\vec{a} \\cdot \\vec{v}_{\\text{apex}} = 0$.
    \\end{enumerate}
  };
\\end{tikzpicture}`
    }
];

// Load from LocalStorage or use Default
let chapters = JSON.parse(localStorage.getItem('xtraBookChapters')) || defaultChapters;

// Auto-append Chapter 3 if user currently has only the legacy default 2 chapters in localStorage
if (Array.isArray(chapters) && chapters.length === 2 && chapters[0].id === 1 && chapters[1].id === 2 && !chapters.some(c => c.id === 3)) {
    chapters.push(defaultChapters[2]);
    localStorage.setItem('xtraBookChapters', JSON.stringify(chapters));
}
let currentChapterId = chapters.length > 0 ? chapters[0].id : 1;
let remixOriginalId = null; // Clean slate by default. Only set when an explicit remixMeta is parsed.

// --- Initialization ---
const codeTextarea = document.getElementById('code');
const chapterList = document.getElementById('chapterList');
const chapterStepper = document.querySelector('.mobile-chapter-stepper');
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

function renderChapterStepper() {
    if (!chapterStepper) return;
    chapterStepper.innerHTML = ''; // Clear the outer container

    const innerWrapper = document.createElement('div');
    innerWrapper.className = 'stepper-inner-wrapper';
    chapterStepper.appendChild(innerWrapper);

    // The line is a CSS pseudo-element, so we just add the dots.
    chapters.forEach((chap, index) => {
        const dot = document.createElement('div');
        dot.className = `stepper-dot ${chap.id === currentChapterId ? 'active' : ''}`;
        dot.title = chap.title; // Tooltip for chapter title

        let pressTimer;
        let isLongPress = false;

        const startPress = (e) => {
            // Prevent default behavior like scrolling on touch
            if (e.type === 'touchstart') e.preventDefault();
            isLongPress = false;
            pressTimer = window.setTimeout(() => {
                isLongPress = true;
                // Vibrate for feedback on mobile, if supported
                if (navigator.vibrate) navigator.vibrate(50);
                deleteChapter(chap.id);
            }, 800); // 800ms for a long press
        };

        const cancelPress = () => {
            clearTimeout(pressTimer);
        };

        const endPress = () => {
            clearTimeout(pressTimer);
            if (!isLongPress) {
                switchChapter(chap.id);
            }
        };

        // Add event listeners for both mouse and touch for comprehensive support
        dot.addEventListener('mousedown', startPress);
        dot.addEventListener('mouseup', endPress);
        dot.addEventListener('mouseleave', cancelPress);
        dot.addEventListener('touchstart', startPress, { passive: false });
        dot.addEventListener('touchend', endPress);
        dot.addEventListener('touchmove', cancelPress); // Cancel long press if finger moves

        if (chap.id === currentChapterId) {
            dot.textContent = index + 1;
        }

        innerWrapper.appendChild(dot);
    });

    // Add the '+' button at the end
    const addBtn = document.createElement('div');
    addBtn.className = 'stepper-add-btn';
    addBtn.innerHTML = '+';
    addBtn.title = 'Add New Chapter';
    addBtn.onclick = addChapter; // Reuse existing addChapter function
    innerWrapper.appendChild(addBtn);
}

function renderChapterList() {
    if (!chapterList) return;
    chapterList.innerHTML = '';
    
    chapters.forEach(chap => {
        const li = document.createElement('li');
        li.className = `chapter-item ${chap.id === currentChapterId ? 'active' : ''}`;

        const span = document.createElement('span');
        span.textContent = chap.title || `Chapter ${chap.id}`;
        span.style.flexGrow = '1';
        span.onclick = () => switchChapter(chap.id);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-chapter-btn';
        deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
        deleteBtn.title = 'Delete Chapter';
        deleteBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent switching chapter
            deleteChapter(chap.id);
        };
        
        li.appendChild(span);
        li.appendChild(deleteBtn);
        chapterList.appendChild(li);
    });

    renderChapterStepper();
}

function switchChapter(id) {
    // State is already saved via real-time input listeners.

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

function deleteChapter(id) {
    // 1. Prevent deleting the last chapter
    if (chapters.length <= 1) {
        alert("You cannot delete the last chapter.");
        return;
    }

    const chapterToDelete = chapters.find(c => c.id === id);
    if (!chapterToDelete) return;

    // 2. Confirm with the user
    if (!confirm(`Are you sure you want to delete "${chapterToDelete.title}"? This cannot be undone.`)) {
        return;
    }

    const wasActive = (currentChapterId === id);
    const deleteIndex = chapters.findIndex(c => c.id === id);

    // 3. Remove the chapter from the data model
    chapters.splice(deleteIndex, 1);

    // 4. Update the UI
    if (wasActive) {
        const newActiveIndex = Math.max(0, deleteIndex - 1);
        switchChapter(chapters[newActiveIndex].id); // This will save state and re-render the list
    } else {
        saveBookState();
        renderChapterList(); // Just re-render the list to show the change
    }
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
        let savedTitle = localStorage.getItem('xtraBookTitle');
        if (savedTitle) {
            // Permanently strip any lingering '(Remix)' from title
            savedTitle = savedTitle.replace(/\s*\(Remix\)\s*/gi, '').trim();
            localStorage.setItem('xtraBookTitle', savedTitle);
            bookTitleInput.value = savedTitle || "Physics 101: Mechanics";
        }
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
    try {
        const meta = JSON.parse(remixMetaRaw);
        const isOwn = (localStorage.getItem('userId') && String(localStorage.getItem('userId')) === String(meta.user_id));
        const isPro = localStorage.getItem('is_pro') === 'true';
        const isUnlocked = isOwn || isPro || (window.isItemUnlocked && window.isItemUnlocked(meta.originalId));

        const isSourceLocked = (meta.source?.is_source_protected || meta.source?.access_tier === 'protected_code') && !isUnlocked;
        const isStoreLocked = (meta.source?.is_for_sale || meta.source?.access_tier === 'store_sale') && !isUnlocked;
        const isSubLocked = (meta.source?.subscriber_only || meta.source?.access_tier === 'subscriber_only') && !isOwn && !isPro;

        if (isSourceLocked || isStoreLocked || isSubLocked) {
            alert("This document's source code is protected. Please unlock access from the reader.");
            localStorage.removeItem('remixMeta');
            if (meta.originalId) {
                window.location.href = `/views/bookView.html?id=${meta.originalId}`;
            }
        } else if (meta.source && (meta.source.engine === 'latex' || meta.source.chapters || meta.source.code)) {
            console.log("Loading book data for remix...", meta);
            if (Array.isArray(meta.source.chapters)) {
                chapters = meta.source.chapters;
            } else if (meta.source.code) {
                chapters = [{ id: 1, title: "Chapter 1", content: meta.source.code }];
            }
            remixOriginalId = meta.originalId || meta.original_id || null;
            window.remixOriginalId = remixOriginalId;
            if (remixOriginalId) {
                sessionStorage.setItem('xtraBookRemixOriginalId', String(remixOriginalId));
            }
            currentChapterId = chapters.length > 0 ? chapters[0].id : 1;
            if (meta.title && bookTitleInput) {
                const cleanBaseTitle = meta.title.replace(/\s*\(Remix\)\s*/gi, '').trim();
                bookTitleInput.value = cleanBaseTitle; // Keep title clean, do not append (Remix)
                localStorage.setItem('xtraBookTitle', cleanBaseTitle);
            }
            saveBookState(); // Save the new remixed content to local storage
        }
    } catch(e) {
        console.warn("Failed to parse remixMeta in book_script:", e);
    }
    // Clear the remix meta so it's not reused on next page load
    localStorage.removeItem('remixMeta');
}
if (remixOriginalId || window.remixOriginalId) console.log("Loaded book data for Remix. Original ID:", remixOriginalId || window.remixOriginalId);

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

// --- Compile Button & Render Mode Modal Logic ---
const renderBtn = document.getElementById('renderBtn');
const mobileRenderBtn = document.getElementById('mobileRenderBtn');
const outputDiv = document.getElementById('output');
const publishBookBtn = document.getElementById('publishBookBtn');

// Open/Close Render Mode Selection Modal
function openRenderModeModal() {
    if (renderBtn && renderBtn.innerHTML.includes('Download')) {
        return;
    }

    const currentChap = chapters.find(c => c.id === currentChapterId);
    const chapIndex = chapters.findIndex(c => c.id === currentChapterId) + 1;
    const chapTitle = currentChap ? (currentChap.title || `Chapter ${chapIndex}`) : `Chapter ${chapIndex}`;

    const subtitleEl = document.getElementById('renderModalSubtitle');
    if (subtitleEl) {
        subtitleEl.textContent = `Active: ${chapTitle} • ${chapters.length} Total Chapters`;
    }
    const activeChapLabel = document.getElementById('renderModalActiveChapLabel');
    if (activeChapLabel) {
        activeChapLabel.textContent = `Ch. ${chapIndex}: ${chapTitle}`;
    }

    const modal = document.getElementById('renderModeModal');
    if (modal) modal.style.display = 'flex';
}
window.openRenderModeModal = openRenderModeModal;

function closeRenderModeModal() {
    const modal = document.getElementById('renderModeModal');
    if (modal) modal.style.display = 'none';
}
window.closeRenderModeModal = closeRenderModeModal;

// Attach modal events
const closeRenderModeModalBtn = document.getElementById('closeRenderModeModalBtn');
if (closeRenderModeModalBtn) closeRenderModeModalBtn.onclick = closeRenderModeModal;

const cancelRenderModalBtn = document.getElementById('cancelRenderModalBtn');
if (cancelRenderModalBtn) cancelRenderModalBtn.onclick = closeRenderModeModal;

const renderModeModal = document.getElementById('renderModeModal');
if (renderModeModal) {
    renderModeModal.onclick = (e) => {
        if (e.target === renderModeModal) closeRenderModeModal();
    };
}

// --- LOCAL AGENT SUPPORT (PDFLaTeX) ---
window.activeAgentUrl = 'http://127.0.0.1:8989';

window.checkLocalAgentStatus = async function (showAlert = false) {
    const statusBox = document.getElementById('localAgentStatusIndicator');
    const statusText = document.getElementById('localAgentStatusText');
    const toolbarDot = document.getElementById('agentToolbarStatusDot');
    const modalDot = document.getElementById('agentModalStatusDot');
    const candidateUrls = ['http://127.0.0.1:8989', 'http://localhost:8989'];

    if (statusText) statusText.innerText = "Checking agent on :8989...";

    for (const url of candidateUrls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1200);
            const res = await fetch(`${url}/health`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                window.activeAgentUrl = url;
                if (toolbarDot) {
                    toolbarDot.style.background = '#22c55e';
                    toolbarDot.style.boxShadow = '0 0 8px #22c55e';
                }
                if (modalDot) {
                    modalDot.style.background = '#22c55e';
                    modalDot.style.boxShadow = '0 0 8px #22c55e';
                }
                if (statusBox) {
                    statusBox.style.background = 'rgba(34, 197, 94, 0.15)';
                    statusBox.style.borderColor = 'rgba(34, 197, 94, 0.35)';
                }
                if (statusText) {
                    statusText.style.color = '#86efac';
                    statusText.innerText = `Agent online on ${url}`;
                }
                if (showAlert) {
                    alert(`✅ Local Agent connected successfully on ${url}!`);
                }
                return true;
            }
        } catch (e) {}
    }

    if (toolbarDot) {
        toolbarDot.style.background = '#ef4444';
        toolbarDot.style.boxShadow = '0 0 6px rgba(239,68,68,0.7)';
    }
    if (modalDot) {
        modalDot.style.background = '#ef4444';
        modalDot.style.boxShadow = '0 0 8px rgba(239,68,68,0.8)';
    }
    if (statusBox) {
        statusBox.style.background = 'rgba(239, 68, 68, 0.12)';
        statusBox.style.borderColor = 'rgba(239, 68, 68, 0.25)';
    }
    if (statusText) {
        statusText.style.color = '#fca5a5';
        statusText.innerText = 'Agent offline on :8989';
    }
    return false;
};

// Check status on load
setTimeout(() => {
    if (typeof window.checkLocalAgentStatus === 'function') {
        window.checkLocalAgentStatus(false);
    }
}, 500);

function buildFullKdpLatexDocument(opts) {
    const trimSpecs = {
        "6x9": { width: "6in", height: "9in", top: "0.75in", bottom: "0.75in", inner: "0.75in", outer: "0.625in" },
        "8.5x11": { width: "8.5in", height: "11in", top: "0.75in", bottom: "0.75in", inner: "0.875in", outer: "0.625in" },
        "5.5x8.5": { width: "5.5in", height: "8.5in", top: "0.75in", bottom: "0.75in", inner: "0.75in", outer: "0.5in" },
        "7x10": { width: "7in", height: "10in", top: "0.75in", bottom: "0.75in", inner: "0.8in", outer: "0.625in" }
    };
    const spec = trimSpecs[opts.trimSize] || trimSpecs["6x9"];
    const cleanTitle = (opts.title || "My Book").replace(/\\&/g, '&').replace(/&/g, '\\&');
    const cleanAuthor = (opts.author || "Author").replace(/\\&/g, '&').replace(/&/g, '\\&');
    const isbnText = opts.isbn ? `\\textbf{ISBN:} ${opts.isbn}\\par\\vspace{0.1in}` : '';

    return `\\documentclass[11pt,openright,twoside]{book}
\\usepackage[paperwidth=${spec.width},paperheight=${spec.height},top=${spec.top},bottom=${spec.bottom},inner=${spec.inner},outer=${spec.outer},headheight=14pt,headsep=12pt,footskip=20pt]{geometry}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\definecolor{mainblue}{RGB}{30, 58, 138}
\\usepackage{fancyhdr}
\\usepackage{titlesec}
\\usepackage{microtype}
\\usepackage[hidelinks]{hyperref}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[LE]{\\small\\itshape ${cleanTitle}}
\\fancyhead[RO]{\\small\\itshape\\leftmark}
\\fancyfoot[LE,RO]{\\small\\thepage}
\\renewcommand{\\headrulewidth}{0.4pt}
\\renewcommand{\\footrulewidth}{0pt}

\\fancypagestyle{plain}{
  \\fancyhf{}
  \\fancyfoot[LE,RO]{\\small\\thepage}
  \\renewcommand{\\headrulewidth}{0pt}
}

\\titleformat{\\chapter}[display]
{\\normalfont\\Huge\\bfseries\\color{mainblue}}{\\flushright\\Large\\scshape Chapter \\thechapter}{1ex}
{\\titlerule[1pt]\\vspace{1ex}\\flushright}

\\begin{document}
${opts.renderMode === 'chapter' ? `
\\mainmatter
${opts.code}
\\end{document}
` : `
\\frontmatter
\\begin{titlepage}
\\centering
\\vspace*{1.2in}
{\\Huge\\bfseries\\color{mainblue} ${cleanTitle}\\par}
\\vspace{0.35in}
{\\Large\\bfseries ${cleanAuthor}\\par}
\\vspace{0.25in}
{\\color{mainblue}\\hrule height 1.5pt}
\\vfill
{\\small Published via XtraPath Publishing Studio\\par}
\\vspace*{0.4in}
\\end{titlepage}

\\thispagestyle{empty}
\\begin{flushleft}
\\vspace*{\\fill}
{\\small
\\textbf{${cleanTitle}}\\par
\\vspace{0.12in}
Copyright \\copyright\\ \\the\\year\\ by ${cleanAuthor}\\par
All rights reserved.\\par
\\vspace{0.15in}
\\textbf{First Edition: \\today}\\par
${isbnText}
Printed in the United States of America\\par
Published with Amazon Kindle Direct Publishing (KDP) Compatibility\\par
}
\\end{flushleft}
\\cleardoublepage

\\tableofcontents
\\cleardoublepage

\\mainmatter
${opts.code}
\\end{document}
`}`;
}

if (renderBtn) {
    const compileBook = async function(renderMode = 'chapter') {
        closeRenderModeModal();

        // --- Automatically switch to preview tab on mobile/tablet when render starts ---
        if (typeof switchBookTab === 'function' && window.innerWidth < 1024) {
            switchBookTab('preview');
        }

        // Save current state before compiling
        const currentChap = chapters.find(c => c.id === currentChapterId);
        if (currentChap && codeTextarea && currentChapterTitleInput) {
            currentChap.content = codeTextarea.value;
            currentChap.title = currentChapterTitleInput.value;
        }
        saveBookState();

        // Construct LaTeX Code based on renderMode
        let fullCode = "";
        let modeLabel = "Full Book";
        const isChapter = (renderMode === 'chapter');
        const chapIndex = chapters.findIndex(c => c.id === currentChapterId) + 1;

        if (isChapter) {
            const safeTitle = (currentChap ? (currentChap.title || `Chapter ${chapIndex}`) : `Chapter ${chapIndex}`)
                .replace(/\\&/g, '&').replace(/&/g, '\\&');
            fullCode = `\\setcounter{chapter}{${Math.max(0, chapIndex - 1)}}\n\\chapter{${safeTitle}}\n${currentChap ? currentChap.content : ''}\n\n`;
            modeLabel = `Chapter ${chapIndex} Proof`;
        } else {
            chapters.forEach((chap, idx) => {
                const safeTitle = (chap.title || `Chapter ${idx + 1}`).replace(/\\&/g, '&').replace(/&/g, '\\&');
                fullCode += `\\chapter{${safeTitle}}\n${chap.content}\n\n`;
            });
            modeLabel = `Full Book (${chapters.length} Ch.)`;
        }

        // Get Settings
        const bookTitle = bookTitleInput ? bookTitleInput.value : "My XtraBook";
        const bookAuthor = bookAuthorInput ? bookAuthorInput.value : "XtraPath User";
        const trimSelect = document.getElementById('bookTrimSize');
        const modalTrimSelect = document.getElementById('modalTrimSize');
        const selectedTrim = (trimSelect && trimSelect.value) || (modalTrimSelect && modalTrimSelect.value) || '6x9';
        const kdpIsbnInput = document.getElementById('modalKdpIsbn');
        const kdpIsbnVal = (kdpIsbnInput && kdpIsbnInput.value.trim()) || '';

        // Check if Local Agent is available
        const isAgentOnline = await window.checkLocalAgentStatus(false);

        const hostname = window.location.hostname;
        const isLocal = (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
        );

        if (!isAgentOnline && !isLocal) {
            const agentModal = document.getElementById('localAgentModal');
            if (agentModal) {
                agentModal.style.display = 'flex';
                window.checkLocalAgentStatus(false);
            }
            if (outputDiv) {
                outputDiv.innerHTML = `
                    <div class="loading-container" style="text-align: center; padding: 40px 20px;">
                        <i class="ri-terminal-box-line" style="font-size: 2.5rem; color: #38bdf8; margin-bottom: 12px; display: block;"></i>
                        <h4 style="color: white; margin: 0 0 8px;">Local Agent Required</h4>
                        <p style="color: #94a3b8; font-size: 0.88rem; max-width: 400px; margin: 0 auto 16px;">Run the 1-line agent command in your terminal to compile PDF books locally for free.</p>
                        <button onclick="document.getElementById('localAgentModal').style.display='flex'; window.checkLocalAgentStatus();" class="btn-primary" style="padding: 8px 18px; font-size: 0.85rem;">Connect Local Agent</button>
                    </div>
                `;
            }
            return;
        }

        // Loading State
        renderBtn.disabled = true;
        renderBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Compiling ${modeLabel}...`;
        if (mobileRenderBtn) mobileRenderBtn.innerHTML = '<i class="ri-loader-4-line spin"></i>';
        if (publishBookBtn) publishBookBtn.style.display = 'none';
        const mobilePublishBtn = document.getElementById('mobilePublishBtn');
        if (mobilePublishBtn) mobilePublishBtn.style.display = 'none';
        
        if (outputDiv) {
            outputDiv.innerHTML = `
                <div class="loading-container">
                    <div class="spinner" style="margin-bottom:15px;"></div>
                    <p>Running pdflatex for ${modeLabel}...</p>
                </div>
            `;
        }

        // Build complete LaTeX standalone document
        const completeLatexDoc = buildFullKdpLatexDocument({
            code: fullCode,
            title: bookTitle,
            author: bookAuthor,
            trimSize: selectedTrim,
            isbn: kdpIsbnVal,
            renderMode: renderMode
        });

        // 1. Compile via Local Agent if online
        if (isAgentOnline) {
            try {
                const response = await fetch(`${window.activeAgentUrl || 'http://127.0.0.1:8989'}/execute`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        task_type: 'latex',
                        code: completeLatexDoc
                    })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({ detail: "PDFLaTeX compile failed" }));
                    throw new Error(err.detail || "LaTeX compilation failed.");
                }

                const blob = await response.blob();
                const fullPdfUrl = URL.createObjectURL(blob);
                window.currentCompiledPdfBlob = blob;
                window.currentCompiledPdfUrl = fullPdfUrl;

                handleCompiledPdfSuccess(fullPdfUrl, isChapter, chapIndex, selectedTrim);
                return;

            } catch (err) {
                console.error("Local agent render failed:", err);
                if (outputDiv) {
                    outputDiv.innerHTML = `<div style="color: #ff6b6b; text-align: center; padding: 40px 20px;">
                        <i class="ri-error-warning-line" style="font-size: 2rem;"></i><br>
                        <strong>Compilation Failed</strong><br>
                        <pre style="text-align: left; background: #111; padding: 12px; border-radius: 8px; font-size: 0.75rem; max-height: 200px; overflow-y: auto; color: #fca5a5; margin-top: 10px;">${err.message}</pre>
                    </div>`;
                }
                renderBtn.disabled = false;
                renderBtn.innerHTML = '<i class="ri-play-fill"></i> Generate PDF';
                return;
            }
        }

        // 2. Fallback to Local Backend API if on local development
        fetch(`/api/compile_book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: fullCode,
                title: bookTitle,
                author: bookAuthor,
                trim_size: selectedTrim,
                is_kdp: true,
                isbn: kdpIsbnVal,
                render_mode: renderMode
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const fullPdfUrl = `${data.pdfUrl}?t=${new Date().getTime()}`;
                handleCompiledPdfSuccess(fullPdfUrl, isChapter, chapIndex, selectedTrim, data.trimName);
            } else {
                throw new Error(data.error || "Compilation Failed");
            }
        })
        .catch(err => {
            console.error("Backend compile error:", err);
            if (outputDiv) {
                outputDiv.innerHTML = `<div style="color: #ff6b6b; text-align: center; padding: 40px 20px;">
                    <i class="ri-error-warning-line" style="font-size: 2rem;"></i><br>
                    <strong>Compilation Error</strong><br>
                    <span style="font-size: 0.8rem; opacity: 0.8;">${err.message}</span>
                </div>`;
            }
            renderBtn.disabled = false;
            renderBtn.innerHTML = '<i class="ri-play-fill"></i> Generate PDF';
        });
    };

    function handleCompiledPdfSuccess(fullPdfUrl, isChapter, chapIndex, selectedTrim, trimName = null) {
        if (outputDiv) {
            outputDiv.innerHTML = `
                <div id="pdf-wrapper" style="flex: 1; width: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; background: #525659; display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 20px; position: relative;">
                    <div id="pdf-loader" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; background: rgba(0,0,0,0.7); padding: 10px 20px; border-radius: 8px; display: none; z-index: 100;">Rendering...</div>
                </div>
            `;

            if (window.pdfjsLib) {
                const pdfjsLib = window.pdfjsLib;
                if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }

                const loader = document.getElementById('pdf-loader');
                if(loader) loader.style.display = 'block';

                const loadingTask = pdfjsLib.getDocument(fullPdfUrl);
                loadingTask.promise.then(pdf => {
                    const pageCount = pdf.numPages;
                    window.lastCompiledBookPageCount = pageCount;
                    if(loader) loader.style.display = 'none';
                    
                    const wrapper = document.getElementById('pdf-wrapper');

                    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
                        const canvas = document.createElement('canvas');
                        canvas.style.boxShadow = "0 5px 15px rgba(0,0,0,0.5)";
                        canvas.style.background = "white";
                        canvas.style.display = "block";
                        wrapper.appendChild(canvas);

                        pdf.getPage(pageNum).then(page => {
                            const ctx = canvas.getContext('2d');
                            let containerWidth = (wrapper && wrapper.clientWidth > 0) ? wrapper.clientWidth : (window.innerWidth || 360);
                            const padding = window.innerWidth < 768 ? 20 : 40;
                            const desiredWidth = Math.max(containerWidth - padding, 280);
                            const viewportRaw = page.getViewport({scale: 1});
                            const scale = Math.min(desiredWidth / viewportRaw.width, 1.5);
                            const viewport = page.getViewport({scale: scale});

                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
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
                        <a href="${fullPdfUrl}" target="_blank" download="book.pdf" class="btn-primary" style="margin-top: 15px; display: inline-block;">Download PDF</a>
                    </div>`;
                });
            }
        }

        // Convert Render Button to Download Button
        const trimLabel = selectedTrim.toUpperCase();
        if (isChapter) {
            renderBtn.innerHTML = `<i class="ri-download-line"></i> Download Ch. ${chapIndex} (${trimLabel})`;
            renderBtn.title = `Chapter ${chapIndex} Proof PDF (${trimName || selectedTrim})`;
        } else {
            renderBtn.innerHTML = `<i class="ri-download-line"></i> Download KDP (${trimLabel})`;
            renderBtn.title = `Amazon KDP Print Ready (${trimName || selectedTrim})`;
        }
        renderBtn.disabled = false;
        renderBtn.onclick = () => window.open(fullPdfUrl, '_blank');

        if (mobileRenderBtn) {
            mobileRenderBtn.innerHTML = '<i class="ri-download-line"></i>';
            mobileRenderBtn.onclick = () => window.open(fullPdfUrl, '_blank');
        }

        if (publishBookBtn) {
            publishBookBtn.style.display = 'inline-flex';
            const mobilePublishBtn = document.getElementById('mobilePublishBtn');
            if (mobilePublishBtn) {
                mobilePublishBtn.style.display = (window.innerWidth <= 768) ? 'flex' : 'none';
            }

            const openPublishModal = () => {
                const bookPublishModal = document.getElementById('bookPublishModal');
                        const publishDocTitle = document.getElementById('publishDocTitle');
                        const publishDocAuthor = document.getElementById('publishDocAuthor');
                        const publishDocSubtype = document.getElementById('publishDocSubtype');
                        const publishDocDesc = document.getElementById('publishDocDesc');
                        const publishDocAccessTier = document.getElementById('publishDocAccessTier');
                        const bookPriceContainer = document.getElementById('bookPriceContainer');
                        const bookPriceLabel = document.getElementById('bookPriceLabel');
                        const bookPriceSubtext = document.getElementById('bookPriceSubtext');
                        const publishDocPrice = document.getElementById('publishDocPrice');
                        const bookPriceHint = document.getElementById('bookPriceHint');
                        const closePublishModalBtn = document.getElementById('closePublishModalBtn');
                        const cancelPublishModalBtn = document.getElementById('cancelPublishModalBtn');
                        const confirmPublishDocBtn = document.getElementById('confirmPublishDocBtn');

                        if (!bookPublishModal) return;

                        if (publishDocTitle) {
                            let rawTitle = (bookTitleInput && bookTitleInput.value) || "Untitled Document";
                            publishDocTitle.value = rawTitle.replace(/\s*\(Remix\)\s*/gi, '').trim();
                        }
                        if (publishDocAuthor) {
                            publishDocAuthor.value = (bookAuthorInput && bookAuthorInput.value) || localStorage.getItem('username') || "Author";
                        }
                        if (publishDocDesc && !publishDocDesc.value) {
                            const subtype = publishDocSubtype ? publishDocSubtype.value : 'book';
                            publishDocDesc.value = `An interactive ${subtype} created with XtraPath.`;
                        }

                        // Sync Trim Selectors
                        const headerTrimSelect = document.getElementById('bookTrimSize');
                        const modalTrim = document.getElementById('modalTrimSize');
                        if (headerTrimSelect && modalTrim) {
                            modalTrim.value = headerTrimSelect.value;
                            modalTrim.onchange = () => { 
                                headerTrimSelect.value = modalTrim.value;
                                updateCoverLink();
                            };
                            headerTrimSelect.onchange = () => { 
                                modalTrim.value = headerTrimSelect.value;
                                updateCoverLink();
                            };
                        }

                        function updateCoverLink() {
                            const coverStudioBtn = document.getElementById('openKdpCoverStudioBtn');
                            if (coverStudioBtn) {
                                const curTrim = (modalTrim && modalTrim.value) || '6x9';
                                const curTitle = (publishDocTitle && publishDocTitle.value) || 'Calculus & Dynamics';
                                const curAuthor = (publishDocAuthor && publishDocAuthor.value) || 'Author';
                                coverStudioBtn.href = `/views/xtraCover.html?trim=${encodeURIComponent(curTrim)}&title=${encodeURIComponent(curTitle)}&author=${encodeURIComponent(curAuthor)}`;
                            }
                        }
                        updateCoverLink();

                        function updatePriceVisibility() {
                            if (!publishDocAccessTier || !bookPriceContainer) return;
                            const tier = publishDocAccessTier.value;
                            if (tier === 'store_sale') {
                                bookPriceContainer.style.display = 'block';
                                if (bookPriceLabel) bookPriceLabel.textContent = 'Store Marketplace Price (USD)';
                                if (bookPriceSubtext) bookPriceSubtext.textContent = 'One-time permanent unlock';
                                if (bookPriceHint) bookPriceHint.textContent = 'Item will be listed on XtraStore with an instant checkout option for buyers worldwide.';
                                if (publishDocPrice && (!publishDocPrice.value || parseFloat(publishDocPrice.value) < 0.99)) {
                                    publishDocPrice.value = '4.99';
                                }
                            } else if (tier === 'protected_code') {
                                bookPriceContainer.style.display = 'block';
                                if (bookPriceLabel) bookPriceLabel.textContent = 'Source Code Remix Price (USD)';
                                if (bookPriceSubtext) bookPriceSubtext.textContent = 'Paid LaTeX remix unlock';
                                if (bookPriceHint) bookPriceHint.textContent = 'Readers can view the PDF for free, but must unlock LaTeX source code to edit or remix ($2.99 or Pro).';
                                if (publishDocPrice) publishDocPrice.value = '2.99';
                            } else {
                                bookPriceContainer.style.display = 'none';
                            }
                        }

                        if (publishDocAccessTier) {
                            publishDocAccessTier.onchange = updatePriceVisibility;
                        }
                        updatePriceVisibility();

                        const closeModal = () => {
                            bookPublishModal.style.display = 'none';
                        };

                        if (closePublishModalBtn) closePublishModalBtn.onclick = closeModal;
                        if (cancelPublishModalBtn) cancelPublishModalBtn.onclick = closeModal;
                        bookPublishModal.onclick = (e) => {
                            if (e.target === bookPublishModal) closeModal();
                        };

                        // Confirm Publish Action
                        if (confirmPublishDocBtn) {
                            confirmPublishDocBtn.onclick = async () => {
                                const originalBtnHtml = confirmPublishDocBtn.innerHTML;
                                const setPublishLoading = (loading) => {
                                    confirmPublishDocBtn.disabled = loading;
                                    confirmPublishDocBtn.innerHTML = loading 
                                        ? '<i class="ri-loader-4-line ri-spin"></i> Publishing to Cloud...' 
                                        : originalBtnHtml;
                                    if (publishBookBtn) {
                                        publishBookBtn.disabled = loading;
                                        publishBookBtn.innerHTML = loading 
                                            ? '<i class="ri-loader-4-line ri-spin"></i> Publishing...' 
                                            : 'Publish';
                                    }
                                };

                                try {
                                    setPublishLoading(true);

                                    const { data: { user } } = await supabase.auth.getUser();
                                    if (!user) {
                                        alert("You must be logged in to publish. Please log in to your account first.");
                                        setPublishLoading(false);
                                        return;
                                    }

                                    let chosenTitle = (publishDocTitle && publishDocTitle.value.trim()) || (bookTitleInput && bookTitleInput.value) || "Untitled Document";
                                    chosenTitle = chosenTitle.replace(/\s*\(Remix\)\s*/gi, '').trim();
                                    const chosenAuthor = (publishDocAuthor && publishDocAuthor.value.trim()) || (bookAuthorInput && bookAuthorInput.value) || localStorage.getItem('username') || "Author";
                                    const chosenSubtype = (publishDocSubtype && publishDocSubtype.value) || 'book';
                                    const chosenDesc = (publishDocDesc && publishDocDesc.value.trim()) || `A ${chosenSubtype} titled '${chosenTitle}' by ${chosenAuthor}.`;
                                    const chosenTier = (publishDocAccessTier && publishDocAccessTier.value) || 'store_sale';
                                    const rawPrice = publishDocPrice ? parseFloat(publishDocPrice.value) : 4.99;
                                    const customPrice = (!isNaN(rawPrice) && rawPrice > 0) ? rawPrice : (chosenTier === 'protected_code' ? 2.99 : 4.99);

                                    const isForSale = (chosenTier === 'store_sale');
                                    const isSubscriberOnly = (chosenTier === 'subscriber_only');
                                    const isProtectedCode = (chosenTier === 'protected_code');

                                    // 1. Generate Thumbnail from PDF
                                    const loadingTask = pdfjsLib.getDocument(cacheBustUrl);
                                    const pdf = await loadingTask.promise;
                                    const page = await pdf.getPage(1);
                                    const desiredWidth = 600;
                                    const viewport = page.getViewport({ scale: 1 });
                                    const scale = desiredWidth / viewport.width;
                                    const scaledViewport = page.getViewport({ scale: scale });
                                    const canvas = document.createElement('canvas');
                                    canvas.height = scaledViewport.height;
                                    canvas.width = scaledViewport.width;
                                    const renderContext = { canvasContext: canvas.getContext('2d'), viewport: scaledViewport };
                                    await page.render(renderContext).promise;
                                    const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.85);

                                    // 2. Obtain Full Portable PDF as Base64 Data URI
                                    let pdfDataUrl = data.pdfBase64;
                                    if (!pdfDataUrl) {
                                        const pdfBlob = await (await fetch(cacheBustUrl)).blob();
                                        pdfDataUrl = await blobToDataURL(pdfBlob);
                                    }

                                    const targetOriginalId = remixOriginalId || window.remixOriginalId || sessionStorage.getItem('xtraBookRemixOriginalId') || null;

                                    // 3. Determine Global Storage URLs (Cloud Bucket or High-Portability Data URI)
                                    let finalPdfUrl = pdfDataUrl;
                                    let finalThumbnailUrl = thumbnailDataUrl;

                                    // Optional: If Supabase Storage bucket 'books' is available, upload there
                                    try {
                                        const safeTitle = chosenTitle.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
                                        const pdfBlob = dataURItoBlob(pdfDataUrl);
                                        const pdfPath = `${user.id}/${Date.now()}_${safeTitle}.pdf`;
                                        const { data: storageData, error: storageErr } = await supabase.storage
                                            .from('books')
                                            .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true });

                                        if (!storageErr && storageData) {
                                            const { data: { publicUrl } } = supabase.storage.from('books').getPublicUrl(pdfPath);
                                            if (publicUrl) finalPdfUrl = publicUrl;
                                        }
                                    } catch (e) {
                                        console.log("Supabase storage upload bypassed, using embedded data URL:", e);
                                    }

                                    try {
                                        const thumbBlob = dataURItoBlob(thumbnailDataUrl);
                                        const thumbPath = `${user.id}/${Date.now()}_thumb.jpg`;
                                        const { data: thumbStorageData, error: thumbStorageErr } = await supabase.storage
                                            .from('books')
                                            .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg', upsert: true });

                                        if (!thumbStorageErr && thumbStorageData) {
                                            const { data: { publicUrl } } = supabase.storage.from('books').getPublicUrl(thumbPath);
                                            if (publicUrl) finalThumbnailUrl = publicUrl;
                                        }
                                    } catch (e) {
                                        console.log("Supabase storage thumbnail upload bypassed, using data URL:", e);
                                    }

                                    // Background local upload cache if local backend is up
                                    try {
                                        const formData = new FormData();
                                        formData.append('file', dataURItoBlob(thumbnailDataUrl), 'book_thumbnail.jpg');
                                        fetch(`/api/upload`, { method: 'POST', body: formData }).catch(() => {});
                                    } catch (e) {}

                                    // 4. Prepare Post Data for Supabase
                                    const postSource = {
                                        engine: 'latex',
                                        item_subtype: chosenSubtype,
                                        access_tier: chosenTier,
                                        is_premium: isSubscriberOnly,
                                        subscriber_only: isSubscriberOnly,
                                        is_source_protected: isProtectedCode,
                                        code_access: isProtectedCode ? 'paid' : 'free',
                                        code_price: isProtectedCode ? customPrice.toFixed(2) : '0.00',
                                        is_for_sale: isForSale,
                                        price: isForSale ? customPrice.toFixed(2) : '0.00',
                                        chapters: chapters,
                                        author: chosenAuthor,
                                        title: chosenTitle,
                                        is_kdp: true,
                                        trim_size: (document.getElementById('modalTrimSize') && document.getElementById('modalTrimSize').value) || selectedTrim,
                                        kdp_isbn: (document.getElementById('modalKdpIsbn') && document.getElementById('modalKdpIsbn').value.trim()) || null
                                    };

                                    const newPostData = {
                                        title: chosenTitle,
                                        description: chosenDesc,
                                        video_url: finalThumbnailUrl, // Globally visible (data: or CDN)
                                        pdf_url: finalPdfUrl,         // Globally visible (data: or CDN)
                                        media_type: 'application/pdf',
                                        format: 'pdf',
                                        source: postSource,
                                        original_id: targetOriginalId,
                                        user_id: user.id,
                                        username: chosenAuthor,
                                        avatar_url: localStorage.getItem('avatarUrl') || ''
                                    };

                                    // 5. Insert into Supabase
                                    const { data: insertedData, error: insertError } = await supabase.from('posts').insert([newPostData]).select();
                                    if (insertError) throw insertError;

                                    // 6. Update Local Cache and Redirect
                                    const newPost = {
                                        ...insertedData[0],
                                        is_for_sale: isForSale,
                                        price: isForSale ? customPrice.toFixed(2) : '0.00'
                                    };
                                    const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                                    allPosts.push(newPost);
                                    localStorage.setItem('userPosts', JSON.stringify(allPosts));
                                    sessionStorage.removeItem('xtraBookRemixOriginalId');
                                    localStorage.removeItem('xtraBookRemixOriginalId');
                                    remixOriginalId = null;
                                    window.remixOriginalId = null;
                                    if (typeof window.updateAllRemixCounters === 'function') {
                                        window.updateAllRemixCounters();
                                    }

                                    closeModal();

                                    // Check if we're in studio context (creating a worksheet/PDF for a course or asset)
                                    const studioCtx = localStorage.getItem('courseContext');
                                    if (studioCtx) {
                                        let parsedCtx = null;
                                        try {
                                            parsedCtx = JSON.parse(studioCtx);
                                            const draftRaw = localStorage.getItem('xtraCourseDraft');
                                            if (draftRaw && parsedCtx) {
                                                let draft = JSON.parse(draftRaw);
                                                if (parsedCtx.format === 'asset' && parsedCtx.assetIndex !== undefined) {
                                                    if (draft.assetItems?.[parsedCtx.assetIndex]) {
                                                        draft.assetItems[parsedCtx.assetIndex][`${parsedCtx.stepId}PostId`] = newPost.id;
                                                    }
                                                } else if (parsedCtx.sectionIndex !== undefined && parsedCtx.lessonIndex !== undefined) {
                                                    const lesson = draft.sections?.[parsedCtx.sectionIndex]?.lessons?.[parsedCtx.lessonIndex];
                                                    if (lesson) { lesson[`${parsedCtx.stepId}PostId`] = newPost.id; }
                                                }
                                                localStorage.setItem('xtraCourseDraft', JSON.stringify(draft));
                                            }
                                        } catch(e) { console.warn('Failed to update studio draft:', e); }
                                        localStorage.removeItem('courseContext');
                                        const returnUrl = (parsedCtx && parsedCtx.courseId)
                                            ? `/views/xtraCourse.html?id=${parsedCtx.courseId}&mode=${parsedCtx.format || 'course'}` 
                                            : '/views/xtraCourse.html';
                                        alert('Document ready! Returning to Creation Studio...');
                                        window.location.href = returnUrl;
                                        return;
                                    }

                                    if (isForSale) {
                                        if (confirm(`🎉 "${chosenTitle}" is now listed in the XtraStore for $${customPrice.toFixed(2)}!\n\nClick OK to view it in the Store, or Cancel to view your Profile.`)) {
                                            window.location.href = '/views/store.html';
                                        } else {
                                            window.location.href = '/views/profile.html';
                                        }
                                    } else {
                                        if (confirm(`🎉 "${chosenTitle}" published successfully and globally visible!\n\nGo to profile?`)) {
                                            window.location.href = '/views/profile.html';
                                        }
                                    }
                                } catch (error) {
                                    console.error("Failed to publish document:", error);
                                    alert(`Failed to publish document: ${error.message}`);
                                } finally {
                                    setPublishLoading(false);
                                }
                            };
                        }

                        bookPublishModal.style.display = 'flex';
                    };

                    publishBookBtn.onclick = openPublishModal;
                    if (mobilePublishBtn) {
                        mobilePublishBtn.onclick = openPublishModal;
                    }
                }
            }
        }
    };

    window.compileBookCode = (mode) => compileBook(mode || 'chapter');

    renderBtn.onclick = () => {
        if (renderBtn.innerHTML.includes('Download')) return;
        openRenderModeModal();
    };

    if (mobileRenderBtn) {
        mobileRenderBtn.onclick = () => {
            if (mobileRenderBtn.innerHTML.includes('Download')) return;
            openRenderModeModal();
        };
    }

    // Attach card clicks in modal to compileBook
    const renderChapterCard = document.getElementById('renderChapterCard');
    if (renderChapterCard) {
        renderChapterCard.onclick = () => compileBook('chapter');
    }

    const renderFullBookCard = document.getElementById('renderFullBookCard');
    if (renderFullBookCard) {
        renderFullBookCard.onclick = () => compileBook('full');
    }

    // Revert button to "Generate" when user edits code
    if (codeTextarea) {
        codeTextarea.addEventListener('input', () => {
            if (renderBtn.innerHTML.includes('Download')) {
                renderBtn.innerHTML = '<i class="ri-play-fill"></i> Generate PDF';
                renderBtn.onclick = () => openRenderModeModal();
                if (mobileRenderBtn) {
                    mobileRenderBtn.innerHTML = '<i class="ri-play-fill"></i>';
                    mobileRenderBtn.onclick = () => openRenderModeModal();
                }
                if (publishBookBtn) publishBookBtn.style.display = 'none';
                const mobilePublishBtn = document.getElementById('mobilePublishBtn');
                if (mobilePublishBtn) mobilePublishBtn.style.display = 'none';
            }
        });
    }
}

// --- SYNC LOCAL PUBLISHED BOOKS TO GLOBAL CLOUD VISIBILITY ---
async function syncLocalBooksToCloud(notify = false) {
    const syncBtn = document.getElementById('syncLocalBooksBtn');
    if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Syncing...';
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            if (notify) alert("Please log in first to sync your books.");
            return;
        }

        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', user.id)
            .eq('format', 'pdf');

        if (error || !posts || posts.length === 0) {
            if (notify) alert("No published books found for this account.");
            return;
        }

        // Find books with local /media/ paths
        const localBooks = posts.filter(p => 
            (p.pdf_url && p.pdf_url.startsWith('/media/')) ||
            (p.video_url && p.video_url.startsWith('/media/'))
        );

        if (localBooks.length === 0) {
            if (notify) alert("All your published books are already globally cloud-synced and visible to everyone!");
            return;
        }

        console.log(`[XtraBook] Found ${localBooks.length} local books to migrate to cloud visibility...`);
        let syncedCount = 0;

        for (const book of localBooks) {
            let updatedPdfUrl = book.pdf_url;
            let updatedVideoUrl = book.video_url;

            if (book.pdf_url && book.pdf_url.startsWith('/media/')) {
                try {
                    const res = await fetch(`/api/get_book_base64?path=${encodeURIComponent(book.pdf_url)}`);
                    const data = await res.json();
                    if (data.success && data.dataUri) {
                        updatedPdfUrl = data.dataUri;
                    }
                } catch (e) {
                    console.warn(`Could not read local PDF for book ${book.id}:`, e);
                }
            }

            if (book.video_url && book.video_url.startsWith('/media/')) {
                try {
                    const res = await fetch(`/api/get_book_base64?path=${encodeURIComponent(book.video_url)}`);
                    const data = await res.json();
                    if (data.success && data.dataUri) {
                        updatedVideoUrl = data.dataUri;
                    }
                } catch (e) {
                    console.warn(`Could not read local thumbnail for book ${book.id}:`, e);
                }
            }

            if (updatedPdfUrl !== book.pdf_url || updatedVideoUrl !== book.video_url) {
                const updatedSource = {
                    ...(book.source || {}),
                    pdf_data_url: updatedPdfUrl.startsWith('data:') ? updatedPdfUrl : book.source?.pdf_data_url
                };

                const { error: updateErr } = await supabase
                    .from('posts')
                    .update({
                        pdf_url: updatedPdfUrl,
                        video_url: updatedVideoUrl,
                        source: updatedSource
                    })
                    .eq('id', book.id);

                if (!updateErr) {
                    syncedCount++;
                    console.log(`[XtraBook] Successfully migrated "${book.title}" to global cloud visibility!`);
                }
            }
        }

        if (syncedCount > 0) {
            if (notify) {
                alert(`Successfully synced ${syncedCount} book(s) to global cloud visibility! They are now visible to everyone worldwide.`);
            }
        } else if (notify) {
            alert("Could not locate local book files to sync. Ensure the local server is running on port 8000.");
        }
    } catch (err) {
        console.warn("[XtraBook] Sync local books error:", err);
        if (notify) alert("Sync failed: " + err.message);
    } finally {
        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '<i class="ri-refresh-line"></i> Sync to Cloud';
        }
    }
}

// Wire manual sync button
const syncLocalBooksBtn = document.getElementById('syncLocalBooksBtn');
if (syncLocalBooksBtn) {
    syncLocalBooksBtn.onclick = () => syncLocalBooksToCloud(true);
}



// Automatically sync on studio load in background
setTimeout(() => {
    syncLocalBooksToCloud(false);
}, 2000);

});