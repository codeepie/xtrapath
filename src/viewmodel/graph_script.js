document.addEventListener('DOMContentLoaded', async () => {

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
                    let user = null;
                    const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
                    if (client && client.auth) {
                        try {
                            const { data } = await client.auth.getUser();
                            if (data && data.user) user = data.user;
                        } catch (e) {
                            console.warn("Could not get supabase auth user:", e);
                        }
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
                        alert("You must be logged in to publish a graph.");
                        return;
                    }

                    // Convert data URI to blob and upload
                    let thumbnailUrl = dataUri;
                    const blob = dataURItoBlob(dataUri);

                    // 1. Try Supabase Storage first for permanent worldwide CDN URL
                    if (client && client.storage) {
                        try {
                            const filename = `graph_${user.id}_${Date.now()}.png`;
                            const { data: storageData, error: storageErr } = await client.storage
                                .from('videos')
                                .upload(filename, blob, { contentType: 'image/png', upsert: true });

                            if (!storageErr && storageData) {
                                const { data: { publicUrl } } = client.storage.from('videos').getPublicUrl(filename);
                                if (publicUrl) thumbnailUrl = publicUrl;
                            }
                        } catch (sErr) {
                            console.warn("Supabase storage upload error:", sErr);
                        }
                    }

                    // 2. If still dataUri, try server /api/upload
                    if (thumbnailUrl.startsWith('data:')) {
                        try {
                            const formData = new FormData();
                            formData.append('file', blob, 'graph_thumbnail.png');
                            const response = await fetch(`/api/upload`, {
                                method: 'POST',
                                body: formData
                            });
                            if (response.ok) {
                                const uploadData = await response.json();
                                if (uploadData.url) thumbnailUrl = uploadData.url;
                            }
                        } catch (uploadErr) {
                            console.warn("Local upload error, keeping dataUri:", uploadErr);
                        }
                    }

                    const newPostData = {
                        title: title,
                        description: "An interactive graph created with XtraGraph and Desmos.",
                        video_url: thumbnailUrl,
                        media_type: 'image/png',
                        format: 'image',
                        source: {
                            engine: 'desmos',
                            state: graphState,
                            thumbnail: thumbnailUrl
                        },
                        original_id: remixOriginalId,
                        user_id: user.id,
                        pdf_url: '',
                        username: localStorage.getItem('username') || 'Anonymous',
                        avatar_url: localStorage.getItem('avatarUrl') || ''
                    };

                    let insertedData = null;
                    if (client && client.from) {
                        try {
                            const { data, error } = await client
                                .from('posts')
                                .insert([newPostData])
                                .select();
                            if (!error && data && data.length > 0) {
                                insertedData = data;
                            } else if (error) {
                                console.warn("Supabase insert warning:", error);
                            }
                        } catch (err) {
                            console.warn("Supabase insert exception:", err);
                        }
                    }

                    const newPost = (insertedData && insertedData[0]) ? insertedData[0] : {
                        id: `graph_${Date.now()}`,
                        ...newPostData,
                        created_at: new Date().toISOString()
                    };

                    // Add the newly created post to the local cache so it appears immediately.
                    const allPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                    allPosts.push(newPost);
                    localStorage.setItem('userPosts', JSON.stringify(allPosts));

                    // Invalidate explore and reels feed caches
                    localStorage.removeItem('cached_explore_feed');
                    localStorage.removeItem('cached_explore_feed_uid');
                    localStorage.removeItem('cached_reels_feed');
                    localStorage.removeItem('cached_reels_feed_uid');

                    if (typeof window.showPublishSuccessModal === 'function') {
                        window.showPublishSuccessModal({
                            title: 'Graph Published!',
                            subtitle: 'Your interactive graph is now live on your profile and discoverable.',
                            badge: 'Graph Live',
                            itemName: title || 'Interactive Graph',
                            itemType: 'Graph',
                            thumbnail: thumbnailUrl || '',
                            primaryBtnText: 'View on Profile',
                            primaryUrl: '/views/profile.html',
                            secondaryBtnText: 'Keep Editing'
                        });
                    } else if (confirm('Graph published to your profile! Go to profile?')) {
                        window.location.href = '/views/profile.html';
                    }

                } catch (error) {
                    console.error("Failed to publish graph:", error);
                    alert("Failed to publish graph: " + (error.message || error));
                }
            });
        });
    }
});