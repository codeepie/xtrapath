document.addEventListener('DOMContentLoaded', () => {

    // 1. Initialize Desmos Calculator
    const elt = document.getElementById('calculator');
    let remixOriginalId = null; // To store the ID of the post being remixed
    let calculator;
    
    if (elt && window.Desmos) {
        calculator = Desmos.GraphingCalculator(elt, {
            invertedColors: true, // Dark mode to match XtraPath theme
            expressions: true,
            settingsMenu: true
        });
        
        // Check for remix data
        const remixMetaRaw = localStorage.getItem('remixMeta');
        if (remixMetaRaw) {
            const meta = JSON.parse(remixMetaRaw);
            if (meta.source && meta.source.engine === 'desmos') {
                calculator.setState(meta.source.state);
                remixOriginalId = meta.originalId;
            }
            localStorage.removeItem('remixMeta');
        } else {
            // Set a default example graph if not a remix
            calculator.setExpression({ id: 'graph1', latex: 'y = x^2' });
            calculator.setExpression({ id: 'graph2', latex: 'y = \\sin(ax)' });
            calculator.setExpression({ id: 'slider1', latex: 'a=1', sliderBounds: { min: 0, max: 10 } });
        }
    }

    // 2. Recording Logic
    const recordBtn = document.getElementById('recordBtn');
    const timerDisplay = document.getElementById('recordingTimer');
    
    let mediaRecorder;
    let recordedChunks = [];
    let isRecording = false;
    let startTime;
    let timerInterval;
    let animationFrameId;

    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        });
    }

    function startRecording() {
        // Desmos uses multiple layered canvases. We must merge them.
        const grapher = document.querySelector('.dcg-grapher');
        if (!grapher) {
            alert("Could not find graph canvas to record.");
            return;
        }

        // Create a composition canvas
        const compCanvas = document.createElement('canvas');
        const pixelRatio = window.devicePixelRatio || 1;
        compCanvas.width = grapher.clientWidth * pixelRatio;
        compCanvas.height = grapher.clientHeight * pixelRatio;
        const ctx = compCanvas.getContext('2d');

        // Animation loop to keep the composition updated
        isRecording = true;
        
        function drawFrame() {
            if (!isRecording) return;
            
            // 1. Determine Theme (Dark Mode Support)
            // If Desmos is in inverted mode, we must force black background and invert layers
            const isInverted = elt && elt.classList.contains('dcg-inverted');
            const bgColor = isInverted ? '#000000' : '#FFFFFF';
            
            ctx.fillStyle = bgColor; 
            ctx.fillRect(0, 0, compCanvas.width, compCanvas.height);

            // 2. Get and Sort Canvases (Robust Z-Index + DOM Order + Opacity)
            const rawCanvases = Array.from(grapher.querySelectorAll('canvas'));
            const renderList = rawCanvases.map((c, i) => {
                const style = window.getComputedStyle(c);
                const zIndexStr = style.zIndex;
                const zIndex = (zIndexStr === 'auto' || isNaN(parseInt(zIndexStr))) ? 0 : parseInt(zIndexStr);
                const opacity = parseFloat(style.opacity);
                return {
                    canvas: c,
                    zIndex: zIndex,
                    domIndex: i,
                    opacity: isNaN(opacity) ? 1 : opacity,
                    display: style.display,
                    visibility: style.visibility,
                    filter: style.filter
                };
            });

            renderList.sort((a, b) => {
                if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
                return a.domIndex - b.domIndex;
            });

            // 3. Draw all Desmos layers with correct offsets
            const grapherRect = grapher.getBoundingClientRect();

            renderList.forEach(item => {
                if (item.display === 'none' || item.visibility === 'hidden' || item.opacity === 0) return;
                
                const c = item.canvas;
                if (c.width === 0 || c.height === 0) return;
                
                const cRect = c.getBoundingClientRect();
                const dx = (cRect.left - grapherRect.left) * pixelRatio;
                const dy = (cRect.top - grapherRect.top) * pixelRatio;
                const dw = cRect.width * pixelRatio;
                const dh = cRect.height * pixelRatio;

                ctx.globalAlpha = item.opacity;
                
                // Apply CSS filters (critical for Desmos dark mode grid inversion)
                if (item.filter && item.filter !== 'none') {
                    ctx.filter = item.filter;
                } else if (isInverted) {
                    // If global dark mode is active, invert the layer (Black Grid -> White Grid)
                    ctx.filter = 'invert(1) hue-rotate(180deg)';
                }

                ctx.drawImage(c, dx, dy, dw, dh);
                ctx.filter = 'none';
                ctx.globalAlpha = 1.0;
            });
            
            animationFrameId = requestAnimationFrame(drawFrame);
        }
        drawFrame();

        const stream = compCanvas.captureStream(30); // 30 FPS
        // Prefer MP4 (H.264) for compatibility, fallback to WebM
        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E"')) {
            mimeType = 'video/mp4; codecs="avc1.42E01E"';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
        }

        mediaRecorder = new MediaRecorder(stream, { mimeType });
        recordedChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            a.download = `xtragraph_${Date.now()}.${ext}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        };

        mediaRecorder.start();
        
        // UI Updates
        recordBtn.innerHTML = "<i class='ri-stop-circle-line'></i> Stop Recording";
        recordBtn.classList.add('recording-active');
        if (timerDisplay) timerDisplay.style.display = 'block';
        
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const diff = Math.floor((Date.now() - startTime) / 1000);
            const mins = Math.floor(diff / 60).toString().padStart(2, '0');
            const secs = (diff % 60).toString().padStart(2, '0');
            if (timerDisplay) timerDisplay.innerText = `${mins}:${secs}`;
        }, 1000);
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        
        // UI Updates
        recordBtn.innerHTML = "<i class='ri-movie-line'></i> Record Graph";
        recordBtn.classList.remove('recording-active');
        if (timerDisplay) {
            timerDisplay.innerText = "00:00";
            timerDisplay.style.display = 'none';
        }
        clearInterval(timerInterval);
    }

    // 3. Publishing Logic
    const publishBtn = document.getElementById('publishGraphBtn');
    if (publishBtn && calculator) {
        publishBtn.addEventListener('click', () => {
            const title = prompt("Enter a title for your graph:", "My Desmos Graph");
            if (!title) return;

            // Get the current state of the calculator
            const graphState = calculator.getState();

            // Take a screenshot to use as the thumbnail
            calculator.asyncScreenshot({
                width: 540,  // New portrait width
                height: 960, // New portrait height (9:16 aspect ratio)
                targetPixelRatio: 1,
            }, (dataUri) => {
                const newPost = {
                    id: Date.now(),
                    title: title,
                    desc: "An interactive graph created with XtraGraph and Desmos.",
                    videoUrl: dataUri, // Use videoUrl to store the image data URI
                    format: 'image', // New format type
                    timestamp: new Date().toISOString(),
                    source: {
                        engine: 'desmos',
                        state: graphState
                    },
                    originalId: remixOriginalId // Use the stored original ID
                };

                const posts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                posts.push(newPost);
                localStorage.setItem('userPosts', JSON.stringify(posts));
                if(confirm('Graph published to your profile! Go to profile?')) window.location.href = 'profile.html';
            });
        });
    }
});