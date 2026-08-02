document.addEventListener('DOMContentLoaded', () => {

    // ============================================================
    // SUPABASE CLIENT SETUP
    // ============================================================
    const SUPABASE_URL = 'https://elhdcldoepjxcxgivohg.supabase.co'; // Paste your URL here
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsaGRjbGRvZXBqeGN4Z2l2b2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1Mzk1NTQsImV4cCI6MjEwMTExNTU1NH0.ago19dzlmxsKRy-7bg8q0JRw69o0roLES_w_dcFGt1o'; // Paste your anon key here
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        publishBtn.addEventListener('click', async () => {
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

                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                        alert("You must be logged in to publish a graph.");
                        return;
                    }

                    const newPostData = {
                        title: title,
                        desc: "An interactive graph created with XtraGraph and Desmos.",
                        videoUrl: thumbnailUrl, // Use the server URL
                        format: 'image', // New format type
                        source: {
                            engine: 'desmos',
                            state: graphState
                        },
                        originalId: remixOriginalId, // Use the stored original ID
                        user_id: user.id,
                        pdfUrl: '' // Provide a default empty value for the non-nullable column
                    };

                    const { data, error } = await supabase
                        .from('posts')
                        .insert([newPostData])
                        .select();

                    if (error) {
                        console.error("Error publishing graph:", error);
                        alert("Could not publish graph: " + error.message);
                    } else {
                        // Add the newly created post to the local cache so it appears immediately.
                        const newPost = data[0];
                        const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                        allPosts.push(newPost);
                        localStorage.setItem('userPosts', JSON.stringify(allPosts));

                        if(confirm('Graph published to your profile! Go to profile?')) window.location.href = 'profile.html';
                    }

                } catch (error) {
                    console.error("Failed to publish graph:", error);
                    alert("Failed to upload graph thumbnail. Please try again.");
                }
            });
        });
    }
});