document.addEventListener('DOMContentLoaded', () => {

    // --- URL HELPER ---
    function getBackendUrl() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:8000';
        } else if (window.location.port === '8000') {
            return ""; 
        } else {
            return `${window.location.protocol}//${window.location.hostname}:8000`;
        }
    }

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

    // Initialize Desmos Calculator
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
            }, async (dataUri) => { // Make this callback async
                try {
                    // Convert data URI to blob and upload
                    const blob = dataURItoBlob(dataUri);
                    const formData = new FormData();
                    formData.append('file', blob, 'graph_thumbnail.png');

                    const backendUrl = getBackendUrl();
                    const response = await fetch(`${backendUrl}/api/upload`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error('Thumbnail upload failed');
                    }
                    const uploadData = await response.json();
                    const thumbnailUrl = uploadData.url.startsWith('http') ? uploadData.url : `${backendUrl}${uploadData.url}`;

                    const newPost = {
                        id: Date.now(),
                        title: title,
                        desc: "An interactive graph created with XtraGraph and Desmos.",
                        videoUrl: thumbnailUrl, // Use the server URL
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

                } catch (error) {
                    console.error("Failed to publish graph:", error);
                    alert("Failed to upload graph thumbnail. Please try again.");
                }
            });
        });
    }
});