async function getSupabaseClient() {
    if (window.supabaseClient) {
        return window.supabaseClient;
    }
    try {
        let config = {};
        const cachedConfig = sessionStorage.getItem('app_config');
        if (cachedConfig) {
            config = JSON.parse(cachedConfig);
        } else {
            const res = await fetch('/api/config');
            if (res.ok) {
                config = await res.json();
                try { sessionStorage.setItem('app_config', JSON.stringify(config)); } catch (_) {}
            }
        }
        if (config.supabase_url && config.supabase_anon_key && window.supabase && typeof window.supabase.createClient === 'function') {
            window.supabaseClient = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
            return window.supabaseClient;
        }
    } catch (e) {
        console.warn('Failed to initialize Supabase client:', e);
    }
    return window.supabaseClient || (typeof supabase !== 'undefined' && supabase.createClient ? supabase : null);
}

function initBookStudio() {
    console.log("XtraBook Studio Loaded");

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
const highlightCode = document.getElementById('highlighting-content');
const highlightPre = document.getElementById('highlighting');
const chapterList = document.getElementById('chapterList');
const chapterStepper = document.querySelector('.mobile-chapter-stepper');
const currentChapterTitleInput = document.getElementById('currentChapterTitle');
const addChapterBtn = document.getElementById('addChapterBtn');
const bookTitleInput = document.getElementById('bookTitle');
const bookAuthorInput = document.getElementById('bookAuthor');

// --- PROFESSIONAL CODEMIRROR IDE INTEGRATION ---
let cmEditor = null;
if (window.CodeMirror && codeTextarea) {
    cmEditor = CodeMirror.fromTextArea(codeTextarea, {
        lineNumbers: true,
        mode: 'stex', // Professional LaTeX syntax mode
        theme: 'material-darker',
        lineWrapping: false,
        tabSize: 4,
        indentUnit: 4,
        autoCloseBrackets: true,
        matchBrackets: true,
        extraKeys: {
            "Ctrl-Enter": function(cm) {
                if (typeof handleGeneratePdfClick === 'function') handleGeneratePdfClick();
            },
            "Cmd-Enter": function(cm) {
                if (typeof handleGeneratePdfClick === 'function') handleGeneratePdfClick();
            },
            "Tab": function(cm) {
                if (cm.somethingSelected()) {
                    cm.indentSelection("add");
                } else {
                    cm.replaceSelection("    ", "end");
                }
            }
        }
    });
    window.codeMirrorEditor = cmEditor;

    // Transparent proxy on codeTextarea.value so all existing methods continue working flawlessly
    Object.defineProperty(codeTextarea, 'value', {
        get() {
            return cmEditor ? cmEditor.getValue() : '';
        },
        set(val) {
            if (cmEditor) {
                if (cmEditor.getValue() !== (val || '')) {
                    cmEditor.setValue(val || '');
                }
            }
        },
        configurable: true
    });

    // Save to LocalStorage and update chapter content on change
    cmEditor.on('change', () => {
        const currentChap = chapters.find(c => c.id === currentChapterId);
        if (currentChap) {
            currentChap.content = cmEditor.getValue();
            saveBookState();
        }
        codeTextarea.dispatchEvent(new Event('input'));
    });

    // Proxy focus
    const origFocus = codeTextarea.focus ? codeTextarea.focus.bind(codeTextarea) : null;
    codeTextarea.focus = function() {
        if (cmEditor) cmEditor.focus();
        else if (origFocus) origFocus();
    };
}

function updateHighlighting(text) {
    if (cmEditor) {
        if (typeof text === 'string' && cmEditor.getValue() !== text) {
            cmEditor.setValue(text);
        }
        setTimeout(() => cmEditor.refresh(), 20);
    }
    if (!highlightCode) return;
    const content = (typeof text === 'string') ? text : (codeTextarea ? codeTextarea.value : '');
    const formatted = content.endsWith("\n") ? content + " " : content;
    highlightCode.textContent = formatted;
    if (window.Prism) {
        Prism.highlightElement(highlightCode);
    }
}
window.updateHighlighting = updateHighlighting;

function syncScroll() {
    if (highlightPre && codeTextarea) {
        highlightPre.scrollTop = codeTextarea.scrollTop;
        highlightPre.scrollLeft = codeTextarea.scrollLeft;
    }
}
window.syncScroll = syncScroll;

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
    if (typeof updateChapterBadges === 'function') updateChapterBadges();
}

function switchChapter(id) {
    // State is already saved via real-time input listeners.

    // Load new chapter
    currentChapterId = id;
    const newChap = chapters.find(c => c.id === currentChapterId);
    if (newChap && codeTextarea && currentChapterTitleInput) {
        codeTextarea.value = newChap.content;
        currentChapterTitleInput.value = newChap.title;
        updateHighlighting(newChap.content);
        if (window.codeMirrorEditor) {
            setTimeout(() => {
                window.codeMirrorEditor.refresh();
                window.codeMirrorEditor.clearHistory();
            }, 30);
        }
        syncScroll();
    }
    
    renderChapterList();
    if (typeof markDocumentUncompiled === 'function') markDocumentUncompiled();
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
    if (typeof markDocumentUncompiled === 'function') markDocumentUncompiled();
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
    if (typeof markDocumentUncompiled === 'function') markDocumentUncompiled();
}

    function updatePaperSheetMockup() {
        const runningBook = document.getElementById('paperRunningBookTitle');
        const runningChap = document.getElementById('paperRunningChapter');
        const chapLabel = document.getElementById('paperChapterLabel');
        const chapTitle = document.getElementById('paperChapterTitle');
        
        const bookTitleInput = document.getElementById('bookTitle');
        const bookTitle = (bookTitleInput && bookTitleInput.value.trim()) ? bookTitleInput.value.trim() : 'Book Document';
        
        const currentIndex = chapters.findIndex(c => c.id === currentChapterId);
        const chapNum = (currentIndex >= 0 ? currentIndex + 1 : 1);
        const curChap = chapters[currentIndex];
        const chapTitleText = (curChap && curChap.title && curChap.title.trim()) ? curChap.title.trim() : `Chapter ${chapNum}`;
        
        if (runningBook) runningBook.textContent = bookTitle.toUpperCase();
        if (runningChap) runningChap.textContent = `CH. ${chapNum}`;
        if (chapLabel) chapLabel.textContent = `CHAPTER ${chapNum}`;
        if (chapTitle) chapTitle.textContent = chapTitleText;
    }
    window.updatePaperSheetMockup = updatePaperSheetMockup;

    function updateChapterBadges() {
        const currentIndex = chapters.findIndex(c => c.id === currentChapterId);
        const chapNum = (currentIndex >= 0 ? currentIndex + 1 : 1);
        const total = chapters.length || 1;

        const badge = document.getElementById('currentChapterNumberBadge');
        if (badge) badge.textContent = `Ch ${chapNum}`;

        const indicator = document.getElementById('chapterCountIndicator');
        if (indicator) indicator.textContent = `${chapNum}/${total}`;

        const prevBtn = document.getElementById('prevChapterBtn');
        if (prevBtn) prevBtn.disabled = (currentIndex <= 0);

        const nextBtn = document.getElementById('nextChapterBtn');
        if (nextBtn) nextBtn.disabled = (currentIndex >= total - 1);

        updatePaperSheetMockup();
    }

    window.navPreviousChapter = function() {
        const currentIndex = chapters.findIndex(c => c.id === currentChapterId);
        if (currentIndex > 0) {
            switchChapter(chapters[currentIndex - 1].id);
        }
    };

    window.navNextChapter = function() {
        const currentIndex = chapters.findIndex(c => c.id === currentChapterId);
        if (currentIndex >= 0 && currentIndex < chapters.length - 1) {
            switchChapter(chapters[currentIndex + 1].id);
        }
    };

    window.toggleMobileChaptersDrawer = function() {
        const drawer = document.getElementById('mobileChaptersDrawer');
        if (!drawer) return;
        if (drawer.style.display === 'flex') {
            drawer.style.display = 'none';
        } else {
            drawer.style.display = 'flex';
            renderMobileChaptersDrawer();
        }
    };

    function renderMobileChaptersDrawer() {
        const list = document.getElementById('mobileDrawerChaptersList');
        const countBadge = document.getElementById('mobileDrawerCountBadge');
        if (countBadge) countBadge.textContent = chapters.length;
        if (!list) return;

        list.innerHTML = '';
        chapters.forEach((chap, idx) => {
            const item = document.createElement('div');
            const isActive = (chap.id === currentChapterId);
            item.className = `drawer-chapter-item ${isActive ? 'active' : ''}`;

            item.innerHTML = `
                <div class="drawer-chap-num">${idx + 1}</div>
                <div class="drawer-chap-info">
                    <div class="drawer-chap-title">${chap.title || `Chapter ${idx + 1}`}</div>
                </div>
                ${isActive ? '<span class="drawer-chap-active-tag">Current</span>' : ''}
                <button type="button" class="drawer-chap-del" title="Delete chapter">
                    <i class="ri-delete-bin-line"></i>
                </button>
            `;

            item.onclick = (e) => {
                if (e.target.closest('.drawer-chap-del')) {
                    e.stopPropagation();
                    deleteChapter(chap.id);
                    renderMobileChaptersDrawer();
                    return;
                }
                switchChapter(chap.id);
                const d = document.getElementById('mobileChaptersDrawer');
                if (d) d.style.display = 'none';
            };

            list.appendChild(item);
        });
    }

    window.renderMobileChaptersDrawer = renderMobileChaptersDrawer;
    window.updateChapterBadges = updateChapterBadges;
    window.switchChapter = switchChapter;
    window.addChapter = addChapter;
    window.deleteChapter = deleteChapter;
    window.renderChapterList = renderChapterList;
    window.renderChapterStepper = renderChapterStepper;

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
            if (typeof updatePaperSheetMockup === 'function') updatePaperSheetMockup();
        }
    });
}

// Initial Render
if (codeTextarea && currentChapterTitleInput) {
    const initialChap = chapters.find(c => c.id === currentChapterId);
    if (initialChap) {
        codeTextarea.value = initialChap.content;
        currentChapterTitleInput.value = initialChap.title;
        updateHighlighting(initialChap.content);
        syncScroll();
        if (typeof updateChapterBadges === 'function') updateChapterBadges();
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
        bookTitleInput.addEventListener('input', () => {
            saveBookState();
            if (typeof updatePaperSheetMockup === 'function') updatePaperSheetMockup();
            if (typeof markDocumentUncompiled === 'function') markDocumentUncompiled();
        });
    }
    if (bookAuthorInput) {
        const savedAuthor = localStorage.getItem('xtraBookAuthor');
        if (savedAuthor) bookAuthorInput.value = savedAuthor;
        bookAuthorInput.addEventListener('input', saveBookState);
    }

    // Save content on typing & synchronize syntax highlighting
    if (codeTextarea) {
        codeTextarea.addEventListener('input', () => {
            const currentChap = chapters.find(c => c.id === currentChapterId);
            if (currentChap) currentChap.content = codeTextarea.value;
            saveBookState();
            updateHighlighting(codeTextarea.value);
            syncScroll();
        });

        codeTextarea.addEventListener('scroll', syncScroll);

        // Tab key support (indent with 4 spaces)
        codeTextarea.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + 4;
                const currentChap = chapters.find(c => c.id === currentChapterId);
                if (currentChap) currentChap.content = this.value;
                saveBookState();
                updateHighlighting(this.value);
                syncScroll();
            }
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

// Initialize Publish button to disabled until compilation succeeds
if (publishBookBtn) {
    publishBookBtn.disabled = true;
    publishBookBtn.title = "Please compile your document first to enable publishing";
}

function resetOutputToMockup() {
    const output = document.getElementById('output');
    if (!output) return;
    const currentChap = chapters.find(c => c.id === currentChapterId);
    const chapIndex = chapters.findIndex(c => c.id === currentChapterId) + 1;
    const chapTitle = (currentChap && currentChap.title) ? currentChap.title : `Chapter ${chapIndex}`;
    const bookTitleInput = document.getElementById('bookTitle');
    const bookTitle = (bookTitleInput && bookTitleInput.value.trim()) ? bookTitleInput.value.trim() : 'MY BOOK TITLE';

    output.innerHTML = `
        <div class="paper-sheet" id="paperSheetMockup">
            <div class="paper-running-header">
                <span id="paperRunningBookTitle">${bookTitle.toUpperCase()}</span>
                <span id="paperRunningChapter">CH. ${chapIndex}</span>
            </div>
            <div class="paper-chapter-label" id="paperChapterLabel">CHAPTER ${chapIndex}</div>
            <div class="paper-chapter-title" id="paperChapterTitle">${chapTitle}</div>
            <div class="paper-ornament-line"></div>
            <div class="paper-preview-body">
                <div class="paper-ghost-p">
                    <span class="paper-ghost-line" style="width: 100%;"></span>
                    <span class="paper-ghost-line" style="width: 95%;"></span>
                    <span class="paper-ghost-line" style="width: 88%;"></span>
                </div>
                <div class="paper-ghost-p">
                    <span class="paper-ghost-line" style="width: 98%;"></span>
                    <span class="paper-ghost-line" style="width: 92%;"></span>
                    <span class="paper-ghost-line" style="width: 60%;"></span>
                </div>
            </div>
            <div class="paper-footer-ornament">· 1 ·</div>
        </div>
    `;
}
window.resetOutputToMockup = resetOutputToMockup;

async function handleGeneratePdfClick() {
    // 1. Check Local Agent connection FIRST
    let isAgentOnline = false;
    if (typeof window.checkLocalAgentStatus === 'function') {
        isAgentOnline = await window.checkLocalAgentStatus(false);
    }

    if (isAgentOnline) {
        // Agent already connected -> Directly open Render Mode selection
        openRenderModeModal();
    } else {
        // Agent offline -> Prompt connection modal first with seamless auto-transition to Render Mode upon connect
        window._pendingOpenRenderModalAfterConnect = true;
        openLocalAgentModal();
    }
}
window.handleGeneratePdfClick = handleGeneratePdfClick;

function markDocumentUncompiled() {
    window.currentRenderedPdfBlob = null;
    const pBtn = document.getElementById('publishBookBtn');
    if (pBtn) {
        pBtn.disabled = true;
        pBtn.title = "Please compile your document first to enable publishing";
    }
    const rBtn = document.getElementById('renderBtn');
    if (rBtn) {
        rBtn.disabled = false;
        rBtn.innerHTML = '<i class="ri-play-fill"></i> Generate PDF';
        rBtn.title = "Compile & Generate PDF";
        rBtn.onclick = handleGeneratePdfClick;
    }
    const dockRun = document.getElementById('dockManualRunBtn');
    if (dockRun) {
        dockRun.disabled = false;
        dockRun.innerHTML = '<i class="ri-play-fill"></i> Compile';
        dockRun.title = "Compile Chapter (Ctrl+Enter)";
        dockRun.onclick = handleGeneratePdfClick;
    }
    const mRenderBtn = document.getElementById('mobileRenderBtn');
    if (mRenderBtn) {
        mRenderBtn.disabled = false;
        mRenderBtn.innerHTML = '<i class="ri-play-fill"></i>';
        mRenderBtn.title = "Compile LaTeX to PDF";
        mRenderBtn.onclick = handleGeneratePdfClick;
    }
    const previewDownloadBtn = document.getElementById('previewDownloadPdfBtn');
    if (previewDownloadBtn) {
        previewDownloadBtn.style.display = 'none';
    }
}
window.markDocumentUncompiled = markDocumentUncompiled;

// Open/Close Render Mode Selection Modal
function openRenderModeModal() {
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

window.activeAgentUrl = window.activeAgentUrl || 'http://127.0.0.1:8989';
window.activeBackendType = window.activeBackendType || 'local_agent';
window.lastSelectedRenderMode = (function() {
    try { return localStorage.getItem('xtrabook_last_render_mode') || 'chapter'; } catch(e) { return 'chapter'; }
})();
window._pendingAgentCompile = false;
window._pendingOpenRenderModalAfterConnect = false;
window._isAutoCompiling = false;

let agentPollTimer = null;

function openLocalAgentModal() {
    const modal = document.getElementById('localAgentModal');
    if (modal) {
        modal.style.display = 'flex';
        if (typeof window.checkLocalAgentStatus === 'function') window.checkLocalAgentStatus(false);
        if (agentPollTimer) clearInterval(agentPollTimer);
        agentPollTimer = setInterval(() => {
            const m = document.getElementById('localAgentModal');
            if (!m || m.style.display === 'none') {
                clearInterval(agentPollTimer);
                agentPollTimer = null;
                return;
            }
            if (typeof window.checkLocalAgentStatus === 'function') window.checkLocalAgentStatus(false);
        }, 1500);
    }
}
window.openLocalAgentModal = openLocalAgentModal;

function closeLocalAgentModal() {
    const modal = document.getElementById('localAgentModal');
    if (modal) modal.style.display = 'none';
    window._pendingAgentCompile = false;
    window._pendingOpenRenderModalAfterConnect = false;
    if (agentPollTimer) {
        clearInterval(agentPollTimer);
        agentPollTimer = null;
    }
}
window.closeLocalAgentModal = closeLocalAgentModal;

window.checkLocalAgentStatus = async function (showAlert = false) {
    const statusBox = document.getElementById('localAgentStatusIndicator');
    const statusText = document.getElementById('localAgentStatusText');
    const toolbarDot = document.getElementById('agentToolbarStatusDot');
    const modalDot = document.getElementById('agentModalStatusDot');

    // Build candidate URLs: Local Agent (:8989) AND Localhost Server (:8000 / current origin)
    const hostname = window.location.hostname || '127.0.0.1';
    const isLocalHost = (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    );

    const candidateUrls = ['http://127.0.0.1:8989', 'http://localhost:8989'];
    if (isLocalHost) {
        candidateUrls.push(`http://${hostname}:8000`);
        candidateUrls.push('http://127.0.0.1:8000');
        candidateUrls.push('http://localhost:8000');
        if (window.location.origin && !candidateUrls.includes(window.location.origin)) {
            candidateUrls.push(window.location.origin);
        }
    }

    if (statusText && !window._isAutoCompiling && statusText.innerText.indexOf('online') === -1) {
        statusText.innerText = "Checking agent connection...";
    }

    for (const url of candidateUrls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1200);
            const res = await fetch(`${url}/health`, { signal: controller.signal }).catch(() => null);
            clearTimeout(timeoutId);
            if (res && res.ok) {
                const healthData = await res.json().catch(() => ({}));
                window.activeAgentUrl = url;
                window.activeBackendType = (healthData && healthData.backend === 'server.py') || url.includes(':8000') ? 'server.py' : 'local_agent';

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

                const backendName = window.activeBackendType === 'server.py' ? 'Local Server' : 'Local Agent';

                // If user clicked Generate PDF while disconnected, auto-open Render Mode selection!
                if (window._pendingOpenRenderModalAfterConnect) {
                    window._pendingOpenRenderModalAfterConnect = false;
                    if (statusText) {
                        statusText.style.color = '#86efac';
                        statusText.innerHTML = `<i class="ri-check-line"></i> Connected to ${backendName}! Opening render options...`;
                    }
                    setTimeout(() => {
                        closeLocalAgentModal();
                        openRenderModeModal();
                    }, 400);
                } else if (window._pendingAgentCompile) {
                    window._pendingAgentCompile = false;
                    window._isAutoCompiling = true;
                    if (statusText) {
                        statusText.style.color = '#86efac';
                        statusText.innerHTML = `<i class="ri-check-line"></i> Connected! Auto-compiling PDF...`;
                    }
                    setTimeout(() => {
                        window._isAutoCompiling = false;
                        closeLocalAgentModal();
                        if (typeof window.compileBook === 'function') {
                            window.compileBook(window.lastSelectedRenderMode || 'chapter');
                        }
                    }, 500);
                } else if (statusText && !window._isAutoCompiling) {
                    statusText.style.color = '#86efac';
                    statusText.innerText = `${backendName} online on ${url}`;
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
    if (statusText && !window._isAutoCompiling) {
        statusText.style.color = '#fca5a5';
        statusText.innerText = 'Backend / Agent offline';
    }
    return false;
};

function generateKdpLatexDocument(contentTex, title, author, trimSize = '6x9', renderMode = 'full', isbn = '') {
    const cleanTitle = (title || 'My Book').replace(/\\/g, '').replace(/[\{\}]/g, '');
    const cleanAuthor = (author || 'Author').replace(/\\/g, '').replace(/[\{\}]/g, '');
    
    const trimSpecs = {
        '6x9': { paperwidth: '6in', paperheight: '9in', inner: '0.75in', outer: '0.5in', top: '0.625in', bottom: '0.625in', headsep: '0.2in', footskip: '0.35in' },
        '8.5x11': { paperwidth: '8.5in', paperheight: '11in', inner: '0.875in', outer: '0.625in', top: '0.75in', bottom: '0.75in', headsep: '0.25in', footskip: '0.4in' },
        '5.5x8.5': { paperwidth: '5.5in', paperheight: '8.5in', inner: '0.75in', outer: '0.5in', top: '0.625in', bottom: '0.625in', headsep: '0.2in', footskip: '0.35in' },
        '7x10': { paperwidth: '7in', paperheight: '10in', inner: '0.8in', outer: '0.55in', top: '0.7in', bottom: '0.7in', headsep: '0.2in', footskip: '0.35in' }
    };
    const specs = trimSpecs[trimSize] || trimSpecs['6x9'];

    let doc = `\\documentclass[11pt,twoside,openright]{book}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{lmodern}
\\usepackage[paperwidth=${specs.paperwidth}, paperheight=${specs.paperheight}, inner=${specs.inner}, outer=${specs.outer}, top=${specs.top}, bottom=${specs.bottom}, headheight=14pt, headsep=${specs.headsep}, footskip=${specs.footskip}, includehead, includefoot]{geometry}
\\usepackage{amsmath, amsfonts, amssymb, xcolor, tikz, fancyhdr, graphicx}
\\usetikzlibrary{arrows.meta, calc, backgrounds, positioning, shapes.geometric}
\\usepackage[draft]{hyperref}

% Clear headers and footers on blank pages between chapters
\\makeatletter
\\def\\cleardoublepage{\\clearpage\\if@twoside \\ifodd\\c@page\\else
  \\hbox{}
  \\vspace*{\\fill}
  \\thispagestyle{empty}
  \\newpage
  \\if@twocolumn\\hbox{}\\newpage\\fi\\fi\\fi}
\\makeatother

% Palette & Styling
\\definecolor{mainblue}{RGB}{0, 80, 120}
\\definecolor{practicegreen}{RGB}{0, 120, 80}
\\definecolor{hintorange}{RGB}{200, 100, 0}
\\definecolor{accentpurple}{RGB}{109, 40, 217}
\\definecolor{darkslate}{RGB}{30, 41, 59}

% Fallback for tcolorbox if package is missing
\\newsavebox{\\dummybox}
\\newenvironment{tcolorbox}[1][]
  {\\begin{lrbox}{\\dummybox}\\begin{minipage}{\\dimexpr\\linewidth-2\\fboxsep}}
  {\\end{minipage}\\end{lrbox}\\noindent\\colorbox{practicegreen}{\\usebox{\\dummybox}}\\par\\medskip}

% Mirrored running headers & outer page numbers for Amazon KDP
\\fancypagestyle{fancy}{
    \\fancyhf{}
    \\fancyhead[LE]{\\small\\nouppercase{\\textbf{${cleanTitle}}}}
    \\fancyhead[RO]{\\small\\nouppercase{\\textbf{\\rightmark}}}
    \\renewcommand{\\headrulewidth}{0.4pt}
    \\fancyfoot[LE,RO]{\\small\\thepage}
}
\\fancypagestyle{plain}{
    \\fancyhf{}
    \\fancyfoot[C]{\\small\\thepage}
    \\renewcommand{\\headrulewidth}{0pt}
}
\\pagestyle{fancy}

\\begin{document}
`;

    if (renderMode === 'chapter') {
        doc += `\\mainmatter\n${contentTex}\n\\end{document}`;
    } else {
        doc += `\\frontmatter

% --- Title Page ---
\\begin{titlepage}
\\centering
\\vspace*{1.2in}
{\\Huge\\bfseries\\color{mainblue} ${cleanTitle}\\par}
\\vspace{0.35in}
{\\Large\\bfseries ${cleanAuthor}\\par}
\\vspace{0.25in}
{\\color{mainblue}\\hrule height 1.5pt}
\\vfill
{\\large\\bfseries XTRAPATH PUBLISHING\\par}
\\vspace{0.1in}
{\\footnotesize www.xtrapath.com\\par}
\\end{titlepage}

% --- Copyright Page ---
\\thispagestyle{empty}
\\vspace*{\\fill}
\\noindent Copyright \\copyright\\ \\the\\year\\ ${cleanAuthor}\\\\
All rights reserved.\\par\\vspace{0.4em}
${isbn ? `\\noindent ISBN: ${isbn}\\\\` : ''}
\\noindent Published by XtraPath Studio (xtrapath.com)\\\\
Typeset using \\LaTeX\\ \\& Amazon KDP Engine.\\par
\\newpage

% --- Table of Contents ---
\\tableofcontents
\\cleardoublepage

\\mainmatter
${contentTex}
\\end{document}
`;
    }
    return doc;
}

if (renderBtn) {
    const compileBook = function(renderMode = 'chapter') {
        window.lastSelectedRenderMode = renderMode || window.lastSelectedRenderMode || 'chapter';
        try { localStorage.setItem('xtrabook_last_render_mode', window.lastSelectedRenderMode); } catch(e){}
        closeRenderModeModal();

        // --- Automatically switch to preview tab on mobile/tablet when render starts (preserve side-by-side on desktop) ---
        if (typeof switchBookTab === 'function' && window.innerWidth < 1024) {
            switchBookTab('preview');
        }

        const hostname = window.location.hostname;
        const isLocal = (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
        );

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
            // Accurate chapter counter for proper numbering (e.g. Chapter 3 starts at counter 2)
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

        // Loading State
        if (renderBtn) {
            renderBtn.disabled = true;
            renderBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Compiling ${modeLabel}...`;
        }
        const dockRun = document.getElementById('dockManualRunBtn');
        if (dockRun) {
            dockRun.disabled = true;
            dockRun.innerHTML = `<i class="ri-loader-4-line spin"></i> Compiling...`;
        }
        if (mobileRenderBtn) mobileRenderBtn.innerHTML = '<i class="ri-loader-4-line spin"></i>';
        if (publishBookBtn) {
            publishBookBtn.disabled = true;
            publishBookBtn.title = `Compiling ${modeLabel}...`;
        }
        
        if (outputDiv) {
            outputDiv.innerHTML = `
                <div class="loading-container">
                    <div class="spinner" style="margin-bottom:15px;"></div>
                    <p>Running pdflatex for ${modeLabel}...</p>
                </div>
            `;
        }

        const trimSelect = document.getElementById('bookTrimSize');
        const modalTrimSelect = document.getElementById('modalTrimSize');
        const selectedTrim = (trimSelect && trimSelect.value) || (modalTrimSelect && modalTrimSelect.value) || '6x9';
        const kdpIsbnInput = document.getElementById('modalKdpIsbn');
        const kdpIsbnVal = (kdpIsbnInput && kdpIsbnInput.value.trim()) || '';

        function base64ToBlob(base64Data, contentType = 'application/pdf') {
            try {
                const rawBase64 = base64Data.replace(/^data:application\/pdf;base64,/, '').trim();
                const byteCharacters = atob(rawBase64);
                const byteArrays = [];
                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                    const slice = byteCharacters.slice(offset, offset + 512);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    byteArrays.push(new Uint8Array(byteNumbers));
                }
                return new Blob(byteArrays, { type: contentType });
            } catch (e) {
                console.warn("base64ToBlob conversion error:", e);
                return null;
            }
        }

        const handleSuccessPdf = async (fullPdfUrl, blob = null) => {
            // Convert data URIs or base64 to native blob URL
            if (typeof fullPdfUrl === 'string' && fullPdfUrl.startsWith('data:application/pdf')) {
                blob = blob || base64ToBlob(fullPdfUrl);
                if (blob) {
                    fullPdfUrl = URL.createObjectURL(blob);
                }
            }
            if (blob) window.currentRenderedPdfBlob = blob;
            renderBtn.disabled = false;
            
            const cacheBustUrl = (fullPdfUrl.startsWith('blob:') || fullPdfUrl.startsWith('data:')) 
                ? fullPdfUrl 
                : `${fullPdfUrl}${fullPdfUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

            if (outputDiv) {
                outputDiv.innerHTML = `
                    <div id="pdf-wrapper" style="flex: 1; width: 100%; height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; background: #0b0f17; background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px); background-size: 20px 20px; display: flex; flex-direction: column; align-items: center; padding: 28px 16px; gap: 24px; position: relative; box-sizing: border-box;">
                        <div id="pdf-loader" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; background: rgba(0,0,0,0.75); padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 0.9rem; z-index: 100; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                            <i class="ri-loader-4-line spin" style="font-size: 1.2rem;"></i> Loading PDF Preview...
                        </div>
                    </div>
                `;

                const loader = document.getElementById('pdf-loader');
                const wrapper = document.getElementById('pdf-wrapper');

                if (window.pdfjsLib) {
                    const pdfjsLib = window.pdfjsLib;
                    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    }

                    try {
                        let pdfSource = cacheBustUrl;
                        if (blob && typeof blob.arrayBuffer === 'function') {
                            const buffer = await blob.arrayBuffer();
                            pdfSource = { data: new Uint8Array(buffer) };
                        }

                        const pdf = await pdfjsLib.getDocument(pdfSource).promise;
                        const pageCount = pdf.numPages;
                        window.lastCompiledBookPageCount = pageCount;
                        if (loader) loader.style.display = 'none';

                        for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
                            const page = await pdf.getPage(pageNum);
                            const canvas = document.createElement('canvas');
                            canvas.style.boxShadow = "0 22px 50px -10px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.06)";
                            canvas.style.background = "#ffffff";
                            canvas.style.borderRadius = "6px";
                            canvas.style.maxWidth = "440px";
                            canvas.style.width = "100%";
                            canvas.style.height = "auto";
                            canvas.style.display = "block";
                            if (wrapper) wrapper.appendChild(canvas);

                            const ctx = canvas.getContext('2d');
                            let containerWidth = (wrapper && wrapper.clientWidth > 0) ? wrapper.clientWidth : (window.innerWidth || 360);
                            const padding = window.innerWidth < 768 ? 24 : 48;
                            const maxBookWidth = 440;
                            const desiredWidth = Math.min(Math.max(containerWidth - padding, 280), maxBookWidth);
                            const viewportRaw = page.getViewport({ scale: 1 });
                            const scale = Math.min(desiredWidth / viewportRaw.width, 1.8);
                            const viewport = page.getViewport({ scale: scale });

                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                        }
                    } catch (err) {
                        console.error("PDF.js render error, falling back to iframe:", err);
                        if (loader) loader.style.display = 'none';
                        if (wrapper) {
                            wrapper.innerHTML = `<iframe src="${fullPdfUrl}" style="width: 100%; height: 100%; border: none; min-height: 600px; flex: 1; border-radius: 8px;"></iframe>`;
                        }
                    }
                } else if (wrapper) {
                    if (loader) loader.style.display = 'none';
                    wrapper.innerHTML = `<iframe src="${fullPdfUrl}" style="width: 100%; height: 100%; border: none; min-height: 600px; flex: 1; border-radius: 8px;"></iframe>`;
                }
            }

            // Automatically switch to Preview view on mobile / responsive displays
            if (typeof window.switchBookTab === 'function') {
                window.switchBookTab('preview');
            }

            const trimLabel = selectedTrim.toUpperCase();
            const showPreviewTab = () => {
                if (typeof window.switchBookTab === 'function') {
                    window.switchBookTab('preview');
                }
            };

            if (renderBtn) {
                if (isChapter) {
                    renderBtn.innerHTML = `<i class="ri-eye-line"></i> Preview Ch. ${chapIndex} (${trimLabel})`;
                } else {
                    renderBtn.innerHTML = `<i class="ri-eye-line"></i> Preview (${trimLabel})`;
                }
                renderBtn.title = "View PDF Preview";
                renderBtn.onclick = showPreviewTab;
            }
            const dockRun = document.getElementById('dockManualRunBtn');
            if (dockRun) {
                dockRun.disabled = false;
                dockRun.innerHTML = `<i class="ri-eye-line"></i> Preview`;
                dockRun.title = "View PDF Preview";
                dockRun.onclick = showPreviewTab;
            }
            if (mobileRenderBtn) {
                mobileRenderBtn.disabled = false;
                mobileRenderBtn.innerHTML = '<i class="ri-eye-line"></i>';
                mobileRenderBtn.title = "View PDF Preview";
                mobileRenderBtn.onclick = showPreviewTab;
            }

            const previewDownloadBtn = document.getElementById('previewDownloadPdfBtn');
            if (previewDownloadBtn) {
                previewDownloadBtn.style.display = 'inline-flex';
                previewDownloadBtn.onclick = () => window.open(fullPdfUrl, '_blank');
            }

            if (publishBookBtn) {
                publishBookBtn.disabled = false;
                publishBookBtn.title = "Publish your compiled document to Community or Store";
            }
        };

        // --- Execute Compilation ---
        (async () => {
            let isAgentRunning = false;
            if (typeof window.checkLocalAgentStatus === 'function') {
                isAgentRunning = await window.checkLocalAgentStatus(false);
            }

            if (isAgentRunning) {
                try {
                    let res;
                    if (window.activeBackendType === 'server.py' || (window.activeAgentUrl && window.activeAgentUrl.includes(':8000'))) {
                        // Route through local FastAPI server.py /api/compile_book
                        res = await fetch(`${window.activeAgentUrl}/api/compile_book`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                code: fullCode,
                                title: bookTitle,
                                author: bookAuthor,
                                trim_size: selectedTrim,
                                render_mode: renderMode,
                                is_kdp: true,
                                isbn: kdpIsbnVal
                            })
                        });

                        if (!res.ok) {
                            const errData = await res.json().catch(() => ({ error: "LaTeX PDF compilation failed" }));
                            throw new Error(errData.error || errData.detail || "LaTeX PDF compilation failed");
                        }
                        const data = await res.json();
                        if (!data.success) throw new Error(data.error || "Compilation Failed");
                        
                        let pdfBlob = null;
                        let localPdfUrl = data.pdfUrl || '';
                        if (data.pdfBase64) {
                            pdfBlob = base64ToBlob(data.pdfBase64);
                            if (pdfBlob) localPdfUrl = URL.createObjectURL(pdfBlob);
                        } else if (localPdfUrl.startsWith('/')) {
                            localPdfUrl = `${window.activeAgentUrl || ''}${localPdfUrl}`;
                        }
                        handleSuccessPdf(localPdfUrl, pdfBlob);
                        return;
                    } else {
                        // Route through standalone Local Agent :8989
                        const fullLatexDoc = generateKdpLatexDocument(fullCode, bookTitle, bookAuthor, selectedTrim, renderMode, kdpIsbnVal);
                        res = await fetch(`${window.activeAgentUrl || 'http://127.0.0.1:8989'}/execute`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                task_type: 'latex',
                                code: fullLatexDoc
                            })
                        });

                        if (!res.ok) {
                            const errData = await res.json().catch(() => ({ detail: "LaTeX PDF compilation failed" }));
                            throw new Error(errData.detail || "LaTeX PDF compilation failed");
                        }

                        const pdfBlob = await res.blob();
                        const localPdfUrl = URL.createObjectURL(pdfBlob);
                        handleSuccessPdf(localPdfUrl, pdfBlob);
                        return;
                    }
                } catch (e) {
                    console.error("PDF compile error:", e);
                    if (outputDiv) {
                        outputDiv.innerHTML = `<div style="color: #ff6b6b; padding: 20px; text-align: center;"><i class="ri-error-warning-line" style="font-size: 2rem;"></i><br><strong>LaTeX Error:</strong><pre style="text-align: left; background: #222; padding: 10px; border-radius: 6px; font-size: 0.8rem; max-height: 200px; overflow: auto; margin-top: 10px;">${e.message}</pre></div>`;
                    }
                    renderBtn.disabled = false;
                    renderBtn.innerHTML = `<i class="ri-play-fill"></i> <span class="btn-label">Generate PDF</span>`;
                    if (dockRun) {
                        dockRun.disabled = false;
                        dockRun.innerHTML = `<i class="ri-play-fill"></i> Compile`;
                    }
                    if (mobileRenderBtn) {
                        mobileRenderBtn.disabled = false;
                        mobileRenderBtn.innerHTML = '<i class="ri-play-fill"></i>';
                    }
                    return;
                }
            }

            // Agent offline -> Prompt Local Agent Modal with pending auto-compile
            window._pendingAgentCompile = true;
            renderBtn.disabled = false;
            renderBtn.innerHTML = `<i class="ri-play-fill"></i> <span class="btn-label">Generate PDF</span>`;
            if (dockRun) {
                dockRun.disabled = false;
                dockRun.innerHTML = `<i class="ri-play-fill"></i> Compile`;
            }
            if (mobileRenderBtn) {
                mobileRenderBtn.disabled = false;
                mobileRenderBtn.innerHTML = '<i class="ri-play-fill"></i>';
            }
            if (outputDiv) {
                outputDiv.innerHTML = `<div class="loading-container"><p style="color: #38bdf8;"><i class="ri-terminal-box-line"></i> Please connect your Local Agent to compile LaTeX books.</p></div>`;
            }
            openLocalAgentModal();
        })();
    };
    window.compileBook = compileBook;

    const openPublishModal = () => {
        const publishBookBtn = document.getElementById('publishBookBtn');
        if (publishBookBtn && publishBookBtn.disabled) {
            alert("Please compile your document first before publishing.");
            return;
        }
        if (!window.currentRenderedPdfBlob) {
            alert("Please compile your document first to generate the book PDF before publishing.");
            return;
        }

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

                    const client = await getSupabaseClient();

                    let user = null;
                    try {
                        if (client && client.auth) {
                            const { data } = await client.auth.getUser();
                            if (data && data.user) user = data.user;
                        }
                    } catch (e) {
                        console.warn("Could not get supabase auth user:", e);
                    }

                    if (!user) {
                        const localUid = localStorage.getItem('userId');
                        if (localUid) {
                            user = {
                                id: localUid,
                                email: localStorage.getItem('userEmail') || '',
                                user_metadata: { full_name: localStorage.getItem('username') || '' }
                            };
                        }
                    }

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
                    let thumbnailDataUrl = '';
                    try {
                        const pdfDoc = await pdfjsLib.getDocument(window.currentRenderedPdfBlob ? URL.createObjectURL(window.currentRenderedPdfBlob) : '').promise;
                        const page = await pdfDoc.getPage(1);
                        const desiredWidth = 600;
                        const viewport = page.getViewport({ scale: 1 });
                        const scale = desiredWidth / viewport.width;
                        const scaledViewport = page.getViewport({ scale: scale });
                        const canvas = document.createElement('canvas');
                        canvas.height = scaledViewport.height;
                        canvas.width = scaledViewport.width;
                        const renderContext = { canvasContext: canvas.getContext('2d'), viewport: scaledViewport };
                        await page.render(renderContext).promise;
                        thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    } catch(e) {
                        console.warn("Could not generate thumbnail:", e);
                    }

                    // 2. Obtain Full Portable PDF as Base64 Data URI
                    let pdfDataUrl = '';
                    if (window.currentRenderedPdfBlob) {
                        pdfDataUrl = await blobToDataURL(window.currentRenderedPdfBlob);
                    }

                    const targetOriginalId = remixOriginalId || window.remixOriginalId || sessionStorage.getItem('xtraBookRemixOriginalId') || null;

                    // 3. Determine Global Storage URLs
                    let finalPdfUrl = pdfDataUrl;
                    let finalThumbnailUrl = thumbnailDataUrl;

                    if (pdfDataUrl && client && client.storage) {
                        try {
                            const safeTitle = chosenTitle.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
                            const pdfBlob = dataURItoBlob(pdfDataUrl);
                            const pdfPath = `${user.id}/${Date.now()}_${safeTitle}.pdf`;
                            const { data: storageData, error: storageErr } = await client.storage
                                .from('books')
                                .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true });

                            if (!storageErr && storageData) {
                                const { data: { publicUrl } } = client.storage.from('books').getPublicUrl(pdfPath);
                                if (publicUrl) finalPdfUrl = publicUrl;
                            }
                        } catch (e) {
                            console.log("Supabase storage upload bypassed:", e);
                        }
                    }

                    if (thumbnailDataUrl && client && client.storage) {
                        try {
                            const thumbBlob = dataURItoBlob(thumbnailDataUrl);
                            const thumbPath = `${user.id}/${Date.now()}_thumb.jpg`;
                            const { data: thumbStorageData, error: thumbStorageErr } = await client.storage
                                .from('books')
                                .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg', upsert: true });

                            if (!thumbStorageErr && thumbStorageData) {
                                const { data: { publicUrl } } = client.storage.from('books').getPublicUrl(thumbPath);
                                if (publicUrl) finalThumbnailUrl = publicUrl;
                            }
                        } catch (e) {
                            console.log("Supabase storage thumbnail upload bypassed:", e);
                        }
                    }

                    // 4. Prepare Post Data
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
                        trim_size: (document.getElementById('modalTrimSize') && document.getElementById('modalTrimSize').value) || '6x9',
                        kdp_isbn: (document.getElementById('modalKdpIsbn') && document.getElementById('modalKdpIsbn').value.trim()) || null
                    };

                    const newPostData = {
                        title: chosenTitle,
                        description: chosenDesc,
                        video_url: finalThumbnailUrl,
                        pdf_url: finalPdfUrl,
                        media_type: 'application/pdf',
                        format: 'pdf',
                        source: postSource,
                        original_id: targetOriginalId,
                        user_id: user.id,
                        username: chosenAuthor,
                        avatar_url: localStorage.getItem('avatarUrl') || ''
                    };

                    let insertedData = null;
                    if (client && client.from) {
                        try {
                            const res = await client.from('posts').insert([newPostData]).select();
                            if (res && res.error) {
                                console.warn("Supabase insert warning:", res.error);
                            } else if (res && res.data && res.data.length > 0) {
                                insertedData = res.data;
                                // Notify Google that new content was published (triggers sitemap re-crawl)
                                fetch('https://www.google.com/ping?sitemap=https://www.xtrapath.com/sitemap.xml').catch(() => {});
                            }
                        } catch (err) {
                            console.warn("Supabase insert exception:", err);
                        }
                    }

                    const newPost = (insertedData && insertedData[0]) ? {
                        ...insertedData[0],
                        is_for_sale: isForSale,
                        price: isForSale ? customPrice.toFixed(2) : '0.00'
                    } : {
                        id: `book_${Date.now()}`,
                        ...newPostData,
                        is_for_sale: isForSale,
                        price: isForSale ? customPrice.toFixed(2) : '0.00',
                        created_at: new Date().toISOString()
                    };

                    const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                    allPosts.push(newPost);
                    localStorage.setItem('userPosts', JSON.stringify(allPosts));

                    // Invalidate explore and reels feed caches
                    localStorage.removeItem('cached_explore_feed');
                    localStorage.removeItem('cached_explore_feed_uid');
                    localStorage.removeItem('cached_reels_feed');
                    localStorage.removeItem('cached_reels_feed_uid');

                    sessionStorage.removeItem('xtraBookRemixOriginalId');
                    localStorage.removeItem('xtraBookRemixOriginalId');
                    remixOriginalId = null;
                    window.remixOriginalId = null;
                    if (typeof window.updateAllRemixCounters === 'function') {
                        window.updateAllRemixCounters();
                    }

                    closeModal();

                    if (typeof window.showPublishSuccessModal === 'function') {
                        window.showPublishSuccessModal({
                            title: isForSale ? 'Publication Listed in Store!' : 'Book Published Successfully!',
                            subtitle: isForSale 
                                ? `"${chosenTitle}" is now listed in the XtraStore for $${customPrice.toFixed(2)}.`
                                : `"${chosenTitle}" is now live on your profile and globally visible.`,
                            badge: isForSale ? 'Store Listed' : 'Live Publication',
                            itemName: chosenTitle || 'Interactive Publication',
                            itemType: 'LaTeX Book',
                            primaryBtnText: isForSale ? 'View in Store' : 'View on Profile',
                            primaryUrl: isForSale ? '/views/store.html' : '/views/profile.html',
                            secondaryBtnText: 'Keep Editing'
                        });
                    } else if (isForSale) {
                        window.location.href = '/views/store.html';
                    } else {
                        window.location.href = '/views/profile.html';
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

    if (publishBookBtn) {
        publishBookBtn.onclick = openPublishModal;
    }
    const mobilePublishBtn = document.getElementById('mobilePublishBtn');
    if (mobilePublishBtn) {
        mobilePublishBtn.onclick = openPublishModal;
    }

    if (renderBtn) {
        renderBtn.onclick = handleGeneratePdfClick;
    }

    if (mobileRenderBtn) {
        mobileRenderBtn.onclick = handleGeneratePdfClick;
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

    // Revert button to "Compile" & disable Publish when user edits code
    if (codeTextarea) {
        codeTextarea.addEventListener('input', () => {
            if (typeof markDocumentUncompiled === 'function') {
                markDocumentUncompiled();
            }
        });
    }

    // ============================================================
    // DUAL-MODE WORKSPACE & CHATGPT BOOK ASSISTANT INTEGRATION
    // ============================================================
    window.currentEngine = 'latex';

    const manualEditorPane = document.getElementById('manualEditorPane');
    const aiChatPane = document.getElementById('aiChatPane');
    const editorModeSlider = document.getElementById('editorModeSlider');
    const modeBtnManual = document.getElementById('modeBtnManual');
    const modeBtnAi = document.getElementById('modeBtnAi');
    const chatEditorModeSelect = document.getElementById('chatEditorModeSelect');
    const aiInputRow = document.getElementById('aiInputRow');
    const aiPromptInput = document.getElementById('aiPromptInput');
    const dockManualActions = document.getElementById('dockManualActions');
    const dockAiActions = document.getElementById('dockAiActions');
    const aiSendPromptBtn = document.getElementById('aiSendPromptBtn');
    const aiAttachToolsBtn = document.getElementById('aiAttachToolsBtn');
    const aiQuickToolsMenu = document.getElementById('aiQuickToolsMenu');
    const viewEditor = document.getElementById('view-editor');
    const dockManualRunBtn = document.getElementById('dockManualRunBtn');
    const manualCopyBtn = document.getElementById('manualCopyBtn');
    const manualResetBtn = document.getElementById('manualResetBtn');
    const aiChatThread = document.getElementById('aiChatThread');
    const aiChatThreadInner = document.getElementById('aiChatThreadInner');
    const aiWelcomeScreen = document.getElementById('aiWelcomeScreen');
    const aiClearChatBtn = document.getElementById('aiClearChatBtn');
    const aiVoiceDictateBtn = document.getElementById('aiVoiceDictateBtn');

    let currentEditorMode = 'manual';

    window.switchEditorMode = function(mode) {
        currentEditorMode = (mode === 'ai') ? 'ai' : 'manual';

        if (chatEditorModeSelect && chatEditorModeSelect.value !== currentEditorMode) {
            chatEditorModeSelect.value = currentEditorMode;
        }

        if (currentEditorMode === 'manual') {
            if (editorModeSlider) {
                editorModeSlider.classList.remove('is-ai');
                if (modeBtnManual) { modeBtnManual.classList.add('active'); modeBtnManual.setAttribute('aria-checked', 'true'); }
                if (modeBtnAi) { modeBtnAi.classList.remove('active'); modeBtnAi.setAttribute('aria-checked', 'false'); }
            }
            if (aiAttachToolsBtn) aiAttachToolsBtn.style.display = 'none';
            if (aiQuickToolsMenu) aiQuickToolsMenu.classList.remove('open');
            if (viewEditor) {
                viewEditor.classList.remove('ai-mode-active');
            }
            if (manualEditorPane) manualEditorPane.style.display = 'flex';
            if (aiChatPane) aiChatPane.style.display = 'none';
            if (aiInputRow) aiInputRow.style.display = 'none';
            if (dockManualActions) dockManualActions.style.display = 'flex';
            if (dockAiActions) dockAiActions.style.display = 'none';

            if (typeof updateHighlighting === 'function') updateHighlighting();
            if (window.codeMirrorEditor) {
                setTimeout(() => {
                    window.codeMirrorEditor.refresh();
                    window.codeMirrorEditor.focus();
                }, 50);
            } else if (codeTextarea) {
                codeTextarea.focus();
            }
        } else {
            if (editorModeSlider) {
                editorModeSlider.classList.add('is-ai');
                if (modeBtnManual) { modeBtnManual.classList.remove('active'); modeBtnManual.setAttribute('aria-checked', 'false'); }
                if (modeBtnAi) { modeBtnAi.classList.add('active'); modeBtnAi.setAttribute('aria-checked', 'true'); }
            }
            if (aiAttachToolsBtn) aiAttachToolsBtn.style.display = 'inline-flex';
            if (viewEditor) {
                viewEditor.classList.add('ai-mode-active');
            }
            if (manualEditorPane) manualEditorPane.style.display = 'none';
            if (aiChatPane) aiChatPane.style.display = 'flex';
            if (aiInputRow) {
                aiInputRow.style.display = 'flex';
                if (aiPromptInput) {
                    const baseH = window.innerWidth <= 1024 ? 48 : 40;
                    aiPromptInput.style.height = baseH + 'px';
                    aiPromptInput.style.overflowY = 'hidden';
                    setTimeout(() => aiPromptInput.focus(), 50);
                }
            }
            if (dockManualActions) dockManualActions.style.display = 'none';
            if (dockAiActions) dockAiActions.style.display = 'flex';
        }
    };

    // Auto-resizing textarea & send button state
    if (aiPromptInput) {
        aiPromptInput.addEventListener('input', function() {
            const baseH = window.innerWidth <= 1024 ? 48 : 40;
            this.style.height = baseH + 'px';
            const newH = Math.min(this.scrollHeight, 180);
            this.style.height = newH + 'px';
            this.style.overflowY = this.scrollHeight > 180 ? 'auto' : 'hidden';

            if (aiSendPromptBtn) {
                if (this.value.trim().length > 0) {
                    aiSendPromptBtn.classList.add('active-btn');
                    aiSendPromptBtn.classList.remove('disabled-btn');
                } else {
                    aiSendPromptBtn.classList.remove('active-btn');
                    aiSendPromptBtn.classList.add('disabled-btn');
                }
            }
        });

        aiPromptInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                window.sendAiPrompt();
            }
        });
    }

    // Toggle authoring templates popover menu
    window.toggleAiToolsMenu = function(force) {
        if (!aiQuickToolsMenu) return;
        if (typeof force === 'boolean') {
            aiQuickToolsMenu.classList.toggle('open', force);
        } else {
            aiQuickToolsMenu.classList.toggle('open');
        }
    };

    document.addEventListener('click', function(e) {
        if (aiQuickToolsMenu && aiQuickToolsMenu.classList.contains('open')) {
            if (!aiQuickToolsMenu.contains(e.target) && (!aiAttachToolsBtn || !aiAttachToolsBtn.contains(e.target))) {
                aiQuickToolsMenu.classList.remove('open');
            }
        }
    });

    // Quick prompt sender
    window.sendAiQuickPrompt = function(promptText) {
        if (currentEditorMode !== 'ai') {
            window.switchEditorMode('ai');
        }
        window.sendAiPrompt(promptText);
    };

    // Clear chat thread
    window.clearAiChatThread = function() {
        if (!aiChatThreadInner) return;
        aiChatThreadInner.innerHTML = `
            <div class="chatgpt-welcome-screen" id="aiWelcomeScreen">
                <div class="chatgpt-logo-badge">
                    <i class="ri-sparkling-2-line" style="color: #38bdf8;"></i>
                </div>
                <h2 class="chatgpt-welcome-title">What would you like to create?</h2>
                <p class="chatgpt-welcome-desc">Select an AI template below or prompt freely to generate publication-ready books, student worksheets, research papers, or exam question papers.</p>

                <div class="chatgpt-starter-grid" id="aiStarterPills">
                    <button type="button" class="chatgpt-prompt-card" onclick="if(window.sendAiQuickPrompt) window.sendAiQuickPrompt('Generate a comprehensive textbook chapter with introduction, formal definitions, theorem with proof, intuitive diagrams, and chapter summary');">
                        <div class="card-top">
                            <i class="ri-book-2-line" style="color: #38bdf8; font-size: 1.1rem;"></i>
                            <span class="card-title">Book Chapter</span>
                        </div>
                        <span class="card-desc">Pedagogical textbook chapter with formal definitions, proofs & intuitions</span>
                    </button>
                    <button type="button" class="chatgpt-prompt-card" onclick="if(window.sendAiQuickPrompt) window.sendAiQuickPrompt('Generate an interactive classroom student worksheet with learning objectives, fill-in blanks, guided problem sets, and teacher answer key');">
                        <div class="card-top">
                            <i class="ri-file-list-3-line" style="color: #34d399; font-size: 1.1rem;"></i>
                            <span class="card-title">Classroom Worksheet</span>
                        </div>
                        <span class="card-desc">Interactive student worksheet with objectives, fill-in blanks & answer key</span>
                    </button>
                    <button type="button" class="chatgpt-prompt-card" onclick="if(window.sendAiQuickPrompt) window.sendAiQuickPrompt('Format a formal academic research paper with abstract, mathematical formulation, numerical results, and BibTeX citations');">
                        <div class="card-top">
                            <i class="ri-article-line" style="color: #818cf8; font-size: 1.1rem;"></i>
                            <span class="card-title">Research Paper</span>
                        </div>
                        <span class="card-desc">Formal AMS-LaTeX paper with abstract, mathematical model & bibliography</span>
                    </button>
                    <button type="button" class="chatgpt-prompt-card" onclick="if(window.sendAiQuickPrompt) window.sendAiQuickPrompt('Create a formal examination test paper with instructions, Section A (MCQs), Section B (Short Answer), and Section C (Analytical Proofs)');">
                        <div class="card-top">
                            <i class="ri-medal-line" style="color: #fbbf24; font-size: 1.1rem;"></i>
                            <span class="card-title">Exam / Test Paper</span>
                        </div>
                        <span class="card-desc">Structured examination paper with Section A (MCQ), Section B, and Section C</span>
                    </button>
                </div>
            </div>
        `;
    };

    // Voice dictation mic
    let voiceRecognition = null;
    let isListening = false;
    window.toggleAiVoiceDictation = function() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Voice dictation is not supported in this browser. Please use Chrome, Edge, or Safari.');
            return;
        }
        if (isListening && voiceRecognition) {
            voiceRecognition.stop();
            return;
        }

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        voiceRecognition = new SpeechRec();
        voiceRecognition.continuous = false;
        voiceRecognition.interimResults = false;
        voiceRecognition.lang = 'en-US';

        voiceRecognition.onstart = () => {
            isListening = true;
            if (aiVoiceDictateBtn) aiVoiceDictateBtn.classList.add('listening');
        };
        voiceRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (aiPromptInput) {
                aiPromptInput.value = (aiPromptInput.value + ' ' + transcript).trim();
                aiPromptInput.dispatchEvent(new Event('input'));
            }
        };
        voiceRecognition.onerror = () => {
            isListening = false;
            if (aiVoiceDictateBtn) aiVoiceDictateBtn.classList.remove('listening');
        };
        voiceRecognition.onend = () => {
            isListening = false;
            if (aiVoiceDictateBtn) aiVoiceDictateBtn.classList.remove('listening');
        };
        voiceRecognition.start();
    };

    // HTML escape helper
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // AI Prompt Dispatcher
    window.sendAiPrompt = async function(customPrompt) {
        const prompt = (customPrompt || (aiPromptInput ? aiPromptInput.value : '')).trim();
        if (!prompt) {
            if (aiPromptInput) aiPromptInput.focus();
            return;
        }

        if (aiPromptInput) {
            aiPromptInput.value = '';
            aiPromptInput.style.height = window.innerWidth <= 1024 ? '48px' : '40px';
            aiPromptInput.style.overflowY = 'hidden';
        }

        if (aiSendPromptBtn) {
            aiSendPromptBtn.classList.remove('active-btn');
            aiSendPromptBtn.classList.add('disabled-btn');
        }

        const welcome = document.getElementById('aiWelcomeScreen');
        if (welcome) welcome.style.display = 'none';

        const container = document.getElementById('aiChatThreadInner') || aiChatThread;
        if (container) {
            const userMsg = document.createElement('div');
            userMsg.className = 'chat-msg user';
            userMsg.innerHTML = `
                <div class="msg-content-bubble">${escapeHtml(prompt)}</div>
                <div class="chatgpt-user-tools">
                    <button type="button" class="chatgpt-user-tool-btn" onclick="if(window.sendAiPrompt) window.sendAiPrompt('${escapeHtml(prompt).replace(/'/g, "\\'")}');" title="Re-run message"><i class="ri-refresh-line"></i></button>
                    <button type="button" class="chatgpt-user-tool-btn" onclick="navigator.clipboard.writeText('${escapeHtml(prompt).replace(/'/g, "\\'")}');" title="Copy text"><i class="ri-file-copy-line"></i></button>
                </div>
            `;
            container.appendChild(userMsg);
            if (aiChatThread) aiChatThread.scrollTop = aiChatThread.scrollHeight;
        }

        const thinkingId = 'thinking_' + Date.now();
        if (container) {
            const thinkMsg = document.createElement('div');
            thinkMsg.id = thinkingId;
            thinkMsg.className = 'chat-msg assistant';
            thinkMsg.innerHTML = `
                <div class="ai-avatar"><i class="ri-book-open-line"></i></div>
                <div class="ai-response-body">
                    <div style="display:flex; align-items:center; gap:8px; color:#9ca3af; font-size:0.88rem; padding: 4px 0;">
                        <span class="thinking-dots"><span></span><span></span><span></span></span>
                        <span>Synthesizing LaTeX chapter content...</span>
                    </div>
                </div>
            `;
            container.appendChild(thinkMsg);
            if (aiChatThread) aiChatThread.scrollTop = aiChatThread.scrollHeight;
        }

        try {
            const currentCode = codeTextarea ? codeTextarea.value : '';
            const res = await fetch('/api/engine/ai-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    current_code: currentCode,
                    engine: 'latex',
                    action: 'generate'
                })
            });

            const data = await res.json();
            const thinkEl = document.getElementById(thinkingId);
            if (thinkEl) thinkEl.remove();

            if (data && data.success && data.code) {
                const newCode = data.code;
                const explanation = data.explanation || `Here is the LaTeX chapter content for "${prompt}".`;
                const suggested = data.suggested_prompts || [
                    'Add a practice exercise with solution',
                    'Expand with a motivating real-world analogy',
                    'Add a summary table comparing core formulas',
                    'Format with a formal theorem and proof environment'
                ];

                // Update editor and persist to active chapter
                if (codeTextarea) {
                    codeTextarea.value = newCode;
                    const currentChap = chapters.find(c => c.id === currentChapterId);
                    if (currentChap) currentChap.content = newCode;
                    saveBookState();
                    if (typeof updateHighlighting === 'function') updateHighlighting();
                }

                const responseCard = document.createElement('div');
                responseCard.className = 'chat-msg assistant';

                let pillsHtml = '';
                suggested.forEach(s => {
                    pillsHtml += `<button type="button" class="suggestion-chip" onclick="if(window.sendAiQuickPrompt) window.sendAiQuickPrompt('${escapeHtml(s).replace(/'/g, "\\'")}');">${escapeHtml(s)}</button>`;
                });

                responseCard.innerHTML = `
                    <div class="ai-avatar"><i class="ri-sparkling-fill"></i></div>
                    <div class="ai-response-body">
                        <div class="ai-explanation-text" style="color: #ececec; line-height: 1.6;">${escapeHtml(explanation)}</div>
                        <div class="chatgpt-code-block">
                            <div class="chatgpt-code-header">
                                <span class="lang-badge">latex</span>
                                <button type="button" class="copy-btn" onclick="navigator.clipboard.writeText(this.closest('.chatgpt-code-block').querySelector('pre').innerText); this.innerHTML='<i class=\\'ri-check-line\\'></i> Copied!'; setTimeout(()=>this.innerHTML='<i class=\\'ri-file-copy-line\\'></i> Copy code', 2000);"><i class="ri-file-copy-line"></i> Copy code</button>
                            </div>
                            <pre class="chatgpt-code-content"><code>${escapeHtml(newCode)}</code></pre>
                        </div>
                        <div class="chatgpt-msg-footer">
                            <div class="chatgpt-pill-actions">
                                <button type="button" class="btn-action-pill run-preview" onclick="handleGeneratePdfClick();"><i class="ri-play-fill"></i> Compile Chapter</button>
                                <button type="button" class="btn-action-pill view-code" onclick="window.switchEditorMode('manual');"><i class="ri-edit-line"></i> Edit in LaTeX</button>
                            </div>
                        </div>
                        <div class="ai-suggested-pills">${pillsHtml}</div>
                    </div>
                `;

                if (container) {
                    container.appendChild(responseCard);
                    if (aiChatThread) aiChatThread.scrollTop = aiChatThread.scrollHeight;
                }
            } else {
                throw new Error(data && data.error ? data.error : 'Failed to generate code.');
            }
        } catch (err) {
            console.error('AI Generation error:', err);
            const thinkEl = document.getElementById(thinkingId);
            if (thinkEl) thinkEl.remove();

            if (container) {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'chat-msg assistant';
                errorMsg.innerHTML = `
                    <div class="ai-avatar" style="background:#ef4444;"><i class="ri-error-warning-line"></i></div>
                    <div class="ai-response-body">
                        <div style="color: #fca5a5; font-size: 0.9rem;">${escapeHtml(err.message || 'Error communicating with AI service. Please check your local agent or connection.')}</div>
                    </div>
                `;
                container.appendChild(errorMsg);
                if (aiChatThread) aiChatThread.scrollTop = aiChatThread.scrollHeight;
            }
        } finally {
            if (aiSendPromptBtn) {
                aiSendPromptBtn.innerHTML = '<i class="ri-arrow-up-line"></i>';
                aiSendPromptBtn.classList.remove('active-btn');
                aiSendPromptBtn.classList.add('disabled-btn');
            }
        }
    };

    // Manual dock actions wiring
    if (dockManualRunBtn) {
        dockManualRunBtn.onclick = handleGeneratePdfClick;
    }

    if (manualCopyBtn) {
        manualCopyBtn.onclick = () => {
            if (!codeTextarea) return;
            navigator.clipboard.writeText(codeTextarea.value).then(() => {
                const prev = manualCopyBtn.innerHTML;
                manualCopyBtn.innerHTML = '<i class="ri-check-line" style="color: #10a37f;"></i>';
                setTimeout(() => manualCopyBtn.innerHTML = prev, 1500);
            });
        };
    }

    if (manualResetBtn) {
        manualResetBtn.onclick = () => {
            if (confirm('Reset this chapter content to the default blank LaTeX section template?')) {
                const currentChap = chapters.find(c => c.id === currentChapterId);
                const chapIndex = chapters.findIndex(c => c.id === currentChapterId) + 1;
                const chapTitle = (currentChap && currentChap.title) ? currentChap.title : `Chapter ${chapIndex}`;
                const defaultContent = `\\section{${chapTitle}}\nStart writing your chapter content here...\n`;
                if (currentChap) currentChap.content = defaultContent;
                if (codeTextarea) {
                    codeTextarea.value = defaultContent;
                }
                if (window.codeMirrorEditor) {
                    window.codeMirrorEditor.setValue(defaultContent);
                }
                saveBookState();
                if (typeof updateHighlighting === 'function') updateHighlighting();
                if (typeof markDocumentUncompiled === 'function') markDocumentUncompiled();
                if (typeof resetOutputToMockup === 'function') resetOutputToMockup();
            }
        };
    }

    // Keyboard shortcut Ctrl+Enter / Cmd+Enter to compile
    window.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag === 'textarea' || activeTag === 'input' || document.activeElement === document.body) {
                e.preventDefault();
                handleGeneratePdfClick();
            }
        }
    });

    // Default mode initialization
    window.switchEditorMode('manual');
}

// --- SYNC LOCAL PUBLISHED BOOKS TO GLOBAL CLOUD VISIBILITY ---
async function syncLocalBooksToCloud(notify = false) {
    const syncBtn = document.getElementById('syncLocalBooksBtn');
    if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Syncing...';
    }

    try {
        const client = await getSupabaseClient();
        if (!client || !client.auth) {
            if (notify) alert("Cloud database connection is currently unavailable.");
            return;
        }

        const { data: { user } } = await client.auth.getUser();
        if (!user) {
            if (notify) alert("Please log in first to sync your books.");
            return;
        }

        const { data: posts, error } = await client
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

                const { error: updateErr } = await client
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



    // Automatically sync on studio load in background and start heartbeat
    setTimeout(() => {
        syncLocalBooksToCloud(false);
        if (typeof window.checkLocalAgentStatus === 'function') {
            window.checkLocalAgentStatus(false);
            // Background periodic check every 12 seconds
            setInterval(() => {
                const modal = document.getElementById('localAgentModal');
                if (!modal || modal.style.display === 'none') {
                    window.checkLocalAgentStatus(false);
                }
            }, 12000);
        }
    }, 800);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBookStudio);
} else {
    initBookStudio();
}