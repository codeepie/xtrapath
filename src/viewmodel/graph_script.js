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