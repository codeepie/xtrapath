/**
 * ResearchLab Engine & Collaborative Manager (research_manager.js)
 * -----------------------------------------------------------------
 * Manages interactive 12th-grade curriculum research proposals, live
 * wave optics, projectile drag kinematics, calculus Riemann sums,
 * binary search algorithms, MS Teams-style tagged discussions with
 * runnable test proofs, and living research notes.
 */

(function (window) {
    'use strict';

    // 1. Single Focused Research Proposal: 2D Kinematics Projectile Motion with Air Drag
    const RESEARCH_PROPOSALS = [
        {
            id: 'prop-physics-projectile',
            domain: 'physics',
            domainLabel: '⚡ Physics • 2D Kinematics',
            title: 'Projectile Motion: Vacuum Range $R = \\frac{v_0^2 \\sin 2\\theta}{g}$ vs Air Drag Trajectory Drop',
            author: 'galileo_gal',
            authorName: 'Dr. Galileo Galilei',
            authorRole: 'Classical Dynamics & Kinematics',
            avatar: '',
            createdAt: '4 hours ago',
            status: 'validated',
            consensusScore: { validated: 18, counter: 0, testsRun: 65 },
            hypothesis: 'In ideal vacuum, projectile range strictly maximizes at launch angle $\\theta = 45^\\circ$ with symmetric parabolic trajectory $R = \\frac{v_0^2 \\sin 2\\theta}{g}$. Linear air drag ($F_{\\text{drag}} = -k v$) distorts the trajectory into an asymmetric steep descent and shifts the optimal launch angle downward to $\\approx 38^\\circ - 42^\\circ$.',
            criteria: [
                'Vacuum trajectory follows exact parabola $y(x) = x\\tan\\theta - \\frac{g x^2}{2 v_0^2 \\cos^2\\theta}$',
                'Maximum vacuum range occurs strictly at $\\theta = 45^\\circ$',
                'Air drag causes velocity loss, reducing maximum range and time of flight'
            ],
            engine: 'projectile_canvas',
            initialParams: {
                velocity: 45, // m/s
                angle: 45, // degrees
                dragCoeff: 0.06, // air drag k
                gravity: 9.81
            },
            notes: `# 12th Grade Kinematics: Equations of Motion & Air Resistance
## 1. Ideal Vacuum Equations
- **Horizontal:** $x(t) = (v_0 \\cos\\theta) t$
- **Vertical:** $y(t) = (v_0 \\sin\\theta) t - \\frac{1}{2}gt^2$
- **Time of Flight:** $T = \\frac{2 v_0 \\sin\\theta}{g}$
- **Maximum Height:** $H_{\\max} = \\frac{v_0^2 \\sin^2\\theta}{2g}$
- **Maximum Range:** $R = \\frac{v_0^2 \\sin(2\\theta)}{g}$ (Maximum at $\\theta = 45^\\circ$)

## 2. Air Drag Effect & Numerical Differential Form
$$\\frac{d v_x}{dt} = -k v v_x, \\quad \\frac{d v_y}{dt} = -g - k v v_y$$

Air resistance continuously opposes the velocity vector $\\vec{v}$, stripping kinetic energy and causing the descent angle to become steeper than the ascent angle.`,
            discussions: [
                {
                    id: 'disc-proj-1',
                    author: 'isaac_newton',
                    authorName: 'Sir Isaac Newton',
                    authorRole: 'Cambridge Mechanics',
                    avatar: '',
                    createdAt: '1 hour ago',
                    tag: 'verification',
                    tagLabel: '#Verification',
                    text: 'Verified on live bench with initial velocity $v_0 = 45\\,\\text{m/s}$, angle $\\theta = 45^\\circ$, and zero drag. The projectile hits ground at range $R = 206.4\\,\\text{m}$ at $t = 6.49\\,\\text{s}$, matching analytical calculus $99.99\\%$.',
                    testRun: {
                        title: 'Zero Drag Vacuum Parabola Test',
                        params: { velocity: 45, angle: 45, dragCoeff: 0.00, gravity: 9.81 },
                        resultMetrics: 'Range: 206.4m | Max Height: 51.6m | Flight Time: 6.49s (Passed)',
                        status: 'pass'
                    },
                    endorsements: 21
                },
                {
                    id: 'disc-proj-2',
                    author: 'mark_ballistics',
                    authorName: 'Mark Ballistics',
                    authorRole: 'Applied Aerodynamics',
                    avatar: '',
                    createdAt: '30m ago',
                    tag: 'stress_test',
                    tagLabel: '#StressTest',
                    text: 'Tested air drag $k = 0.08$. The symmetric parabola breaks: Range drops from $206.4\\,\\text{m}$ to $138.2\\,\\text{m}$ ($33.1\\%$ reduction), and optimal angle shifts downward to $39.5^\\circ$.',
                    testRun: {
                        title: 'High Air Resistance Drag Test',
                        params: { velocity: 45, angle: 39.5, dragCoeff: 0.08, gravity: 9.81 },
                        resultMetrics: 'Range: 138.2m | Drag Energy Loss: 33.1% (Optimal at 39.5°)',
                        status: 'pass'
                    },
                    endorsements: 14
                },
                {
                    id: 'disc-proj-3',
                    author: 'leonhard_euler',
                    authorName: 'Leonhard Euler',
                    authorRole: 'Applied Mechanics Institute',
                    avatar: '',
                    createdAt: '15m ago',
                    tag: 'derivation',
                    tagLabel: '#Derivation',
                    text: 'Analytical Proof: For quadratic velocity drag, the vertical velocity satisfies $v_y(t) = v_T \\tan\\left(\\arctan(v_{y0}/v_T) - \\frac{gt}{v_T}\\right)$ where terminal velocity $v_T = \\sqrt{g/k}$. The live bench numerical integrator aligns with this closed form within $<0.15\\%$ error.',
                    testRun: {
                        title: 'Terminal Velocity & Drag Integration Proof',
                        params: { velocity: 50, angle: 45, dragCoeff: 0.05, gravity: 9.81 },
                        resultMetrics: 'Terminal Speed v_T: 14.0 m/s | Trajectory Drop: 28.4% (Verified)',
                        status: 'pass'
                    },
                    endorsements: 19
                }
            ]
        }
    ];

    // Helper to resolve currently authenticated user identity
    function resolveCurrentUserInfo() {
        let userId = null;
        let username = '';
        let displayName = '';
        let userEmail = '';
        let userBio = '';
        let userAvatar = '';

        try {
            if (typeof localStorage !== 'undefined') {
                userId = localStorage.getItem('userId') || null;
                username = localStorage.getItem('username') || '';
                displayName = localStorage.getItem('displayName') || localStorage.getItem('fullName') || '';
                userEmail = localStorage.getItem('userEmail') || '';
                userBio = localStorage.getItem('userBio') || '';
                userAvatar = localStorage.getItem('avatarUrl') || localStorage.getItem('userAvatar') || '';

                if (!username && localStorage.getItem('handle')) {
                    username = localStorage.getItem('handle').replace(/^@/, '');
                }

                // Inspect Supabase auth tokens in storage
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && ((key.startsWith('sb-') && key.endsWith('-auth-token')) || key === 'supabase.auth.token')) {
                        try {
                            const raw = JSON.parse(localStorage.getItem(key));
                            const u = raw?.user || raw?.currentSession?.user;
                            if (u) {
                                if (!userId) userId = u.id;
                                if (!userEmail) userEmail = u.email || '';
                                if (!username) {
                                    username = u.user_metadata?.username || (u.email ? u.email.split('@')[0] : '');
                                }
                                if (!displayName) {
                                    displayName = u.user_metadata?.full_name || u.user_metadata?.name || u.user_metadata?.displayName || '';
                                }
                                if (!userBio && u.user_metadata?.bio) {
                                    userBio = u.user_metadata.bio;
                                }
                                if (!userAvatar) userAvatar = u.user_metadata?.avatar_url || '';
                            }
                        } catch (_) {}
                    }
                }
            }
        } catch (_) {}

        const cleanHandle = username ? username.trim().replace(/^@/, '').replace(/\s+/g, '_').toLowerCase() : '';
        const cleanDisplay = displayName || username || (userEmail ? userEmail.split('@')[0] : 'Lead Researcher');

        return {
            userId: userId || null,
            username: cleanHandle || (userId ? `user_${userId.substring(0, 8)}` : 'researcher'),
            displayName: cleanDisplay,
            bio: userBio || 'Principal Investigator',
            avatar: userAvatar || ''
        };
    }
    if (typeof window !== 'undefined') {
        window.resolveCurrentUserInfo = resolveCurrentUserInfo;
    }

    // 2. Storage & Memory Manager
    class ResearchManager {
        constructor() {
            this.proposals = this.loadProposals();
            this.activeProposalId = 'prop-physics-projectile';
            // Background cloud sync to keep cached proposals fresh across sessions
            setTimeout(() => {
                if (typeof this.syncFromCloud === 'function') {
                    this.syncFromCloud().catch(() => {});
                }
            }, 300);
        }

        normalizeProposal(p) {
            if (!p) return p;
            const domain = p.domain || 'physics';
            const engine = p.engine || (domain === 'optics' ? 'optics_canvas' : (domain === 'math' || domain === 'calculus' ? 'calculus_canvas' : (domain === 'cs' ? 'search_canvas' : 'projectile_canvas')));

            // Extract parameter schema if present at any depth
            let parameterSchema = [];
            if (Array.isArray(p.parameterSchema) && p.parameterSchema.length > 0) {
                parameterSchema = p.parameterSchema;
            } else if (Array.isArray(p.source?.parameterSchema) && p.source.parameterSchema.length > 0) {
                parameterSchema = p.source.parameterSchema;
            } else if (Array.isArray(p.proposal?.parameterSchema) && p.proposal.parameterSchema.length > 0) {
                parameterSchema = p.proposal.parameterSchema;
            }

            // Determine default params based on author schema or domain engine defaults
            let defaultParams = {};
            if (parameterSchema.length > 0) {
                parameterSchema.forEach(param => {
                    defaultParams[param.key] = param.default !== undefined ? param.default : (param.min !== undefined ? param.min : 0);
                });
            } else if (engine === 'optics_canvas') {
                defaultParams = { wavelength: 632, slitDistance: 0.25, screenDistance: 1.5, glassThickness: 0.0 };
            } else if (engine === 'calculus_canvas') {
                defaultParams = { partitions: 12, lowerBound: 0, upperBound: 3.0 };
            } else if (p.id === 'prop-physics-projectile' || (!p.initialParams && !p.customSimulationCode && !p.source?.customSimulationCode)) {
                defaultParams = { velocity: 45, angle: 45, dragCoeff: 0.06, gravity: 9.81 };
            }

            const rawInitial = p.initialParams || p.source?.initialParams || p.proposal?.initialParams || {};
            const initialParams = Object.assign({}, defaultParams, rawInitial);

            // Compute activeParams ensuring values match initial params and respect schema bounds
            const rawActive = p.activeParams || p.source?.proposal?.activeParams || {};
            const activeParams = Object.assign({}, initialParams);

            Object.keys(initialParams).forEach(key => {
                let val = (rawActive[key] !== undefined) ? rawActive[key] : initialParams[key];
                val = (typeof val === 'number') ? val : (parseFloat(val) || 0);
                const schemaItem = parameterSchema.find(s => s.key === key);
                if (schemaItem) {
                    const min = schemaItem.min !== undefined ? Number(schemaItem.min) : -Infinity;
                    const max = schemaItem.max !== undefined ? Number(schemaItem.max) : Infinity;
                    if (val < min || val > max) {
                        val = schemaItem.default !== undefined ? Number(schemaItem.default) : Math.max(min, Math.min(max, val));
                    }
                }
                activeParams[key] = val;
            });

            let discussions = Array.isArray(p.discussions) && p.discussions.length > 0 ? p.discussions : [];
            if (discussions.length === 0) {
                if (engine === 'optics_canvas') {
                    discussions = [
                        {
                            id: 'disc-opt-1',
                            author: 'thomas_young',
                            authorName: 'Thomas Young',
                            authorRole: 'Royal Society Optics',
                            avatar: '',
                            createdAt: '2 hours ago',
                            tag: 'verification',
                            tagLabel: '#Verification',
                            text: 'Verified monochromatic wave interference at $\\lambda = 632\\,\\text{nm}$ and slit spacing $d = 0.25\\,\\text{mm}$. The fringe spacing $\\beta = \\frac{\\lambda D}{d} = 3.79\\,\\text{mm}$ matches optical bench micrometric readings perfectly.',
                            testRun: {
                                title: 'Red Laser Double Slit Verification',
                                params: { wavelength: 632, slitDistance: 0.25, screenDistance: 1.5, glassThickness: 0.0 },
                                resultMetrics: 'Fringe Width β: 3.79mm | First Dark Min: 1.89mm (Passed)',
                                status: 'pass'
                            },
                            endorsements: 16
                        },
                        {
                            id: 'disc-opt-2',
                            author: 'augustin_fresnel',
                            authorName: 'Augustin-Jean Fresnel',
                            authorRole: 'Académie des Sciences',
                            avatar: '',
                            createdAt: '45m ago',
                            tag: 'derivation',
                            tagLabel: '#Derivation',
                            text: 'Calculated secondary wavelets envelope: shifting wavelength to green $\\lambda = 532\\,\\text{nm}$ tightens fringe bands to $\\beta = 3.19\\,\\text{mm}$. Live simulation tracks the exact interference envelope.',
                            testRun: {
                                title: 'Green Wavelength Diffraction Test',
                                params: { wavelength: 532, slitDistance: 0.20, screenDistance: 1.2, glassThickness: 0.0 },
                                resultMetrics: 'Green Laser λ=532nm | Verified β: 3.19mm (Passed)',
                                status: 'pass'
                            },
                            endorsements: 12
                        }
                    ];
                } else {
                    discussions = [
                        {
                            id: 'disc-proj-1',
                            author: 'isaac_newton',
                            authorName: 'Sir Isaac Newton',
                            authorRole: 'Cambridge Mechanics',
                            avatar: '',
                            createdAt: '1 hour ago',
                            tag: 'verification',
                            tagLabel: '#Verification',
                            text: 'Verified on live bench with initial velocity $v_0 = 45\\,\\text{m/s}$, angle $\\theta = 45^\\circ$, and zero drag. The projectile hits ground at range $R = 206.4\\,\\text{m}$ at $t = 6.49\\,\\text{s}$, matching analytical calculus $99.99\\%$.',
                            testRun: {
                                title: 'Zero Drag Vacuum Parabola Test',
                                params: { velocity: 45, angle: 45, dragCoeff: 0.00, gravity: 9.81 },
                                resultMetrics: 'Range: 206.4m | Max Height: 51.6m | Flight Time: 6.49s (Passed)',
                                status: 'pass'
                            },
                            endorsements: 21
                        },
                        {
                            id: 'disc-proj-2',
                            author: 'mark_ballistics',
                            authorName: 'Mark Ballistics',
                            authorRole: 'Applied Aerodynamics',
                            avatar: '',
                            createdAt: '30m ago',
                            tag: 'stress_test',
                            tagLabel: '#StressTest',
                            text: 'Tested air drag $k = 0.08$. The symmetric parabola breaks: Range drops from $206.4\\,\\text{m}$ to $138.2\\,\\text{m}$ ($33.1\\%$ reduction), and optimal angle shifts downward to $39.5^\\circ$.',
                            testRun: {
                                title: 'High Air Resistance Drag Test',
                                params: { velocity: 45, angle: 39.5, dragCoeff: 0.08, gravity: 9.81 },
                                resultMetrics: 'Range: 138.2m | Drag Energy Loss: 33.1% (Optimal at 39.5°)',
                                status: 'pass'
                            },
                            endorsements: 14
                        },
                        {
                            id: 'disc-proj-3',
                            author: 'leonhard_euler',
                            authorName: 'Leonhard Euler',
                            authorRole: 'Applied Mechanics Institute',
                            avatar: '',
                            createdAt: '15m ago',
                            tag: 'derivation',
                            tagLabel: '#Derivation',
                            text: 'Analytical Proof: For quadratic velocity drag, the vertical velocity satisfies $v_y(t) = v_T \\tan\\left(\\arctan(v_{y0}/v_T) - \\frac{gt}{v_T}\\right)$ where terminal velocity $v_T = \\sqrt{g/k}$. The live bench numerical integrator aligns with this closed form within $<0.15\\%$ error.',
                            testRun: {
                                title: 'Terminal Velocity & Drag Integration Proof',
                                params: { velocity: 50, angle: 45, dragCoeff: 0.05, gravity: 9.81 },
                                resultMetrics: 'Terminal Speed v_T: 14.0 m/s | Trajectory Drop: 28.4% (Verified)',
                                status: 'pass'
                            },
                            endorsements: 19
                        }
                    ];
                }
            }

            if (Array.isArray(discussions)) {
                const u = resolveCurrentUserInfo();
                discussions = discussions.map(d => {
                    if (d.author === 'current_user' || d.authorName === 'Researcher (You)') {
                        const fallbackUname = (u.username && u.username !== 'researcher') ? u.username : (u.userId ? `user_${u.userId.substring(0, 8)}` : 'researcher');
                        const fallbackName = (u.displayName && u.displayName !== 'Lead Researcher') ? u.displayName : (u.username || 'Lead Researcher');
                        return Object.assign({}, d, {
                            author: fallbackUname,
                            authorName: fallbackName,
                            user_id: d.user_id || u.userId || undefined
                        });
                    }
                    return d;
                });
            }

            const consensusScore = p.consensusScore && p.consensusScore.testsRun > 1 ? p.consensusScore : { validated: 18, counter: 0, testsRun: 65 };
            const criteria = Array.isArray(p.criteria) && p.criteria.length > 0 ? p.criteria : [
                'Vacuum trajectory follows exact parabola $y(x) = x\\tan\\theta - \\frac{g x^2}{2 v_0^2 \\cos^2\\theta}$',
                'Maximum vacuum range occurs strictly at $\\theta = 45^\\circ$',
                'Air drag causes velocity loss, reducing maximum range and time of flight'
            ];

            return Object.assign({}, p, {
                domain,
                engine,
                initialParams,
                activeParams,
                parameterSchema: parameterSchema.length > 0 ? parameterSchema : (Array.isArray(p.parameterSchema) ? p.parameterSchema : undefined),
                customSimulationCode: p.customSimulationCode || p.source?.customSimulationCode || p.proposal?.customSimulationCode || '',
                discussions,
                consensusScore,
                criteria,
                status: p.status || 'validated'
            });
        }

        loadProposals() {
            let loaded = [];
            const deletedSet = new Set(JSON.parse(localStorage.getItem('xtra_deleted_post_ids') || '[]').map(String));
            try {
                const stored = localStorage.getItem('xtra_research_proposals_v15');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        loaded = parsed
                            .filter(p => p && p.id && !deletedSet.has(String(p.id)) && !deletedSet.has(String(p.proposal_id || '')))
                            .map(p => this.normalizeProposal(p));
                    }
                }
            } catch (e) {
                console.warn('[ResearchManager] Failed to load local proposals, falling back to defaults:', e);
            }

            // Also check userPosts in localStorage to ensure user-published experiments are included
            try {
                const userPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                const labUserPosts = userPosts.filter(p => p && (p.format === 'researchlab' || p.type === 'researchlab' || p.is_research_lab));
                labUserPosts.forEach(up => {
                    const prop = up.proposal || up;
                    const propId = prop.id || up.proposal_id || up.id;
                    if (propId && !deletedSet.has(String(propId)) && !loaded.some(p => p.id === propId)) {
                        loaded.unshift(this.normalizeProposal(prop));
                    }
                });
            } catch (_) {}

            if (loaded.length === 0) {
                loaded = RESEARCH_PROPOSALS.filter(p => p && p.id && !deletedSet.has(String(p.id))).map(p => this.normalizeProposal(p));
            }
            return loaded;
        }

        async getSupabaseClient() {
            if (window.supabaseClient) return window.supabaseClient;
            if (typeof supabase !== 'undefined' && typeof supabase.from === 'function') return supabase;

            // Direct fallback initialization if window.supabase is available
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                try {
                    let configRaw = sessionStorage.getItem('app_config') || localStorage.getItem('app_config');
                    let config = configRaw ? JSON.parse(configRaw) : null;
                    if (!config) {
                        const res = await fetch('/api/config');
                        if (res.ok) config = await res.json();
                    }
                    if (config && config.supabase_url && config.supabase_anon_key) {
                        window.supabaseClient = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
                        return window.supabaseClient;
                    }
                } catch(_) {}
            }

            for (let i = 0; i < 20; i++) {
                if (window.supabaseClient) return window.supabaseClient;
                await new Promise(r => setTimeout(r, 100));
            }
            return window.supabaseClient || null;
        }

        async syncFromCloud() {
            try {
                const client = await this.getSupabaseClient();
                if (!client) return this.proposals;
                const { data, error } = await client
                    .from('posts')
                    .select('*')
                    .eq('format', 'researchlab')
                    .order('created_at', { ascending: false });
                if (error || !data) return this.proposals;

                const deletedSet = new Set(JSON.parse(localStorage.getItem('xtra_deleted_post_ids') || '[]').map(String));
                let updated = false;
                data.forEach(row => {
                    if (!row || !row.id || deletedSet.has(String(row.id))) return;
                    let prop = null;
                    if (row.source) {
                        const src = typeof row.source === 'string' ? JSON.parse(row.source) : row.source;
                        prop = Object.assign({}, src.proposal || src);
                        if (src.parameterSchema && (!prop.parameterSchema || prop.parameterSchema.length === 0)) {
                            prop.parameterSchema = src.parameterSchema;
                        }
                        if (src.initialParams && (!prop.initialParams || Object.keys(prop.initialParams).length === 0)) {
                            prop.initialParams = src.initialParams;
                        }
                        if (src.customSimulationCode && !prop.customSimulationCode) {
                            prop.customSimulationCode = src.customSimulationCode;
                        }
                    }
                    if (!prop) {
                        prop = {
                            id: row.id,
                            title: row.title,
                            author: row.username,
                            authorName: row.username,
                            user_id: row.user_id,
                            avatar: row.avatar_url,
                            status: 'validated'
                        };
                    }
                    prop.id = row.id;
                    prop.proposal_id = row.id;
                    prop.title = row.title || prop.title;
                    prop.user_id = row.user_id || prop.user_id;
                    const pubUsername = row.username || prop.author;
                    if (pubUsername && pubUsername !== 'galileo_gal') {
                        prop.author = pubUsername;
                        if (!prop.authorName || prop.authorName.toLowerCase().includes('galileo')) {
                            prop.authorName = pubUsername;
                        }
                    }
                    if (deletedSet.has(String(prop.id))) return;

                    const normalized = this.normalizeProposal(prop);
                    const existingIdx = this.proposals.findIndex(p => p.id === prop.id);
                    if (existingIdx >= 0) {
                        this.proposals[existingIdx] = normalized;
                        updated = true;
                    } else {
                        this.proposals.unshift(normalized);
                        updated = true;
                    }
                });
                if (updated) {
                    this.saveProposals();
                }
            } catch (err) {
                console.warn('[ResearchManager] syncFromCloud error:', err);
            }
            return this.proposals;
        }

        async fetchProposalFromCloud(id) {
            if (!id) return null;
            try {
                const client = await this.getSupabaseClient();
                if (!client) return null;
                let data = null;
                const { data: directData, error } = await client
                    .from('posts')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle();

                if (!error && directData) {
                    data = directData;
                } else {
                    // Fallback: search posts table for matching proposal_id in source or matching researchlab post
                    const { data: searchData } = await client
                        .from('posts')
                        .select('*')
                        .eq('format', 'researchlab')
                        .order('created_at', { ascending: false })
                        .limit(25);
                    if (searchData && searchData.length > 0) {
                        data = searchData.find(row => {
                            if (row.id === id) return true;
                            if (row.source) {
                                const s = typeof row.source === 'string' ? JSON.parse(row.source) : row.source;
                                if (s?.proposal?.id === id || s?.proposal_id === id || s?.id === id) return true;
                            }
                            return false;
                        }) || null;
                    }
                }

                if (!data) return null;

                let prop = null;
                if (data.source) {
                    const src = typeof data.source === 'string' ? JSON.parse(data.source) : data.source;
                    prop = Object.assign({}, src.proposal || src);
                    if (src.parameterSchema && (!prop.parameterSchema || prop.parameterSchema.length === 0)) {
                        prop.parameterSchema = src.parameterSchema;
                    }
                    if (src.initialParams && (!prop.initialParams || Object.keys(prop.initialParams).length === 0)) {
                        prop.initialParams = src.initialParams;
                    }
                    if (src.customSimulationCode && !prop.customSimulationCode) {
                        prop.customSimulationCode = src.customSimulationCode;
                    }
                }
                if (!prop) {
                    prop = {
                        id: data.id,
                        title: data.title,
                        author: data.username,
                        authorName: data.username,
                        user_id: data.user_id,
                        avatar: data.avatar_url,
                        status: 'validated'
                    };
                }
                prop.id = data.id;
                prop.proposal_id = data.id;
                prop.title = data.title || prop.title;
                prop.user_id = data.user_id || prop.user_id;
                const pubUsername = data.username || prop.author;
                if (pubUsername && pubUsername !== 'galileo_gal') {
                    prop.author = pubUsername;
                    if (!prop.authorName || prop.authorName.toLowerCase().includes('galileo')) {
                        prop.authorName = pubUsername;
                    }
                }
                const normalized = this.normalizeProposal(prop);
                const existingIdx = this.proposals.findIndex(p => p.id === normalized.id || p.id === id);
                if (existingIdx >= 0) {
                    this.proposals[existingIdx] = normalized;
                } else {
                    this.proposals.unshift(normalized);
                }
                this.saveProposals();
                return normalized;
            } catch (err) {
                console.warn('[ResearchManager] fetchProposalFromCloud error:', err);
                return null;
            }
        }

        voteConsensus(proposalId, voteType) {
            const proposal = this.proposals.find(p => p.id === proposalId);
            if (!proposal) return;
            if (voteType === 'validate') {
                proposal.consensusScore.validated += 1;
            } else if (voteType === 'counter') {
                proposal.consensusScore.counter += 1;
            }
            proposal.consensusScore.testsRun += 1;
            if (proposal.consensusScore.counter > proposal.consensusScore.validated) {
                proposal.status = 'counter_example';
            } else if (proposal.consensusScore.validated >= 5) {
                proposal.status = 'validated';
            } else {
                proposal.status = 'testing';
            }
            this.saveProposals();
        }

        saveProposals() {
            try {
                localStorage.setItem('xtra_research_proposals_v15', JSON.stringify(this.proposals));
            } catch (e) {
                console.error('[ResearchManager] Storage error:', e);
            }
        }

        getProposals(filterDomain = 'all') {
            this.proposals = this.loadProposals();
            if (filterDomain === 'all') return this.proposals;
            return this.proposals.filter(p => p.domain === filterDomain);
        }

        getActiveProposal() {
            let p = this.proposals.find(p => p.id === this.activeProposalId) || this.proposals[0];
            return this.normalizeProposal(p);
        }

        setActiveProposal(id) {
            this.activeProposalId = id;
        }

        getProposal(id) {
            if (!id) return this.getActiveProposal();
            let proposal = this.proposals.find(p => p.id === id || p.proposal_id === id || (p.source && (p.source.proposal?.id === id || p.source.id === id)));
            if (proposal) {
                return this.normalizeProposal(proposal);
            }
            // Check storage in case it was created in another tab or editor
            try {
                const stored = localStorage.getItem('xtra_research_proposals_v15');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        const found = parsed.find(p => p.id === id || p.proposal_id === id || (p.source && (p.source.proposal?.id === id || p.source.id === id)));
                        if (found) {
                            const normalized = this.normalizeProposal(found);
                            this.proposals.unshift(normalized);
                            return normalized;
                        }
                    }
                }
            } catch (e) {}

            // Check userPosts in localStorage
            try {
                const userPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                const foundPost = userPosts.find(p => p && (String(p.id) === String(id) || String(p.proposal_id) === String(id) || String(p.source?.proposal?.id) === String(id)));
                if (foundPost) {
                    const prop = foundPost.proposal || foundPost;
                    const normalized = this.normalizeProposal(prop);
                    this.proposals.unshift(normalized);
                    return normalized;
                }
            } catch (e) {}

            // Graceful auto-provisioning for any shared proposal ID
            if (typeof id === 'string' && id.startsWith('prop-')) {
                const u = resolveCurrentUserInfo();
                const fallbackProp = this.normalizeProposal({
                    id: id,
                    domain: 'physics',
                    domainLabel: '⚡ Physics • 2D Kinematics',
                    title: 'Projectile Motion: Vacuum Range vs Air Drag Trajectory Drop',
                    author: (u.username && u.username !== 'researcher') ? u.username : 'researcher',
                    authorName: (u.displayName && u.displayName !== 'Lead Researcher') ? u.displayName : 'Lead Researcher',
                    authorRole: u.bio || 'Scientific Investigator',
                    user_id: u.userId,
                    avatar: u.avatar || '',
                    engine: 'projectile_canvas',
                    status: 'validated'
                });
                this.proposals.unshift(fallbackProp);
                this.saveProposals();
                return fallbackProp;
            }
            return null;
        }

        updateProposal(id, updatedData) {
            const u = resolveCurrentUserInfo();
            const idx = this.proposals.findIndex(p => p.id === id);
            if (idx === -1) {
                return this.createProposal(Object.assign({ id }, updatedData));
            }
            
            // Ensure author is not stuck on galileo_gal if a logged-in user is updating
            let author = updatedData.author || this.proposals[idx].author;
            let authorName = updatedData.authorName || this.proposals[idx].authorName;
            if (author === 'galileo_gal' || (authorName && authorName.toLowerCase().includes('galileo'))) {
                if (u.username && u.username !== 'researcher') {
                    author = u.username;
                    authorName = u.displayName;
                }
            }

            // If updatedData has initialParams, ensure activeParams synchronizes
            const mergedActive = updatedData.activeParams || (updatedData.initialParams ? Object.assign({}, updatedData.initialParams) : undefined);

            this.proposals[idx] = this.normalizeProposal(Object.assign({}, this.proposals[idx], updatedData, {
                author,
                authorName,
                activeParams: mergedActive,
                user_id: updatedData.user_id || this.proposals[idx].user_id || u.userId,
                avatar: updatedData.avatar || this.proposals[idx].avatar || u.avatar,
                updatedAt: 'Just now'
            }));
            this.activeProposalId = id;
            this.saveProposals();
            return this.proposals[idx];
        }

        deleteProposal(id) {
            if (!id) return;
            const strId = String(id);
            // Blacklist ID permanently
            try {
                const deletedList = JSON.parse(localStorage.getItem('xtra_deleted_post_ids') || '[]');
                if (!deletedList.includes(strId)) {
                    deletedList.push(strId);
                    localStorage.setItem('xtra_deleted_post_ids', JSON.stringify(deletedList));
                }
            } catch (_) {}

            this.proposals = this.proposals.filter(p => String(p.id) !== strId && String(p.proposal_id || '') !== strId);
            if (String(this.activeProposalId) === strId) {
                this.activeProposalId = this.proposals[0]?.id || 'prop-physics-projectile';
            }
            this.saveProposals();

            // Also clean userPosts in localStorage
            try {
                const userPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
                const filteredUserPosts = userPosts.filter(p => p && String(p.id) !== strId && String(p.proposal_id || '') !== strId);
                localStorage.setItem('userPosts', JSON.stringify(filteredUserPosts));
            } catch (_) {}
        }

        createProposal(newProposalData) {
            const u = resolveCurrentUserInfo();
            const author = (newProposalData.author && newProposalData.author !== 'galileo_gal') 
                ? newProposalData.author 
                : (u.username && u.username !== 'researcher' ? u.username : (newProposalData.author || 'researcher'));
            const authorName = (newProposalData.authorName && !newProposalData.authorName.toLowerCase().includes('galileo'))
                ? newProposalData.authorName
                : (u.displayName || 'Lead Researcher');
            const authorRole = newProposalData.authorRole || u.bio || 'STEM Research Lead';
            const userId = newProposalData.user_id || u.userId || ('usr_' + Date.now());
            const avatar = newProposalData.avatar || u.avatar || '';

            const newId = newProposalData.id || ('prop-' + Date.now());
            const fullProposal = this.normalizeProposal(Object.assign({
                id: newId,
                createdAt: 'Just now',
                status: 'validated',
                notes: `# Shared Research Scratchpad\nDrafted by @${author}.\n\n## 1. Initial Notes\nAdd shared derivations, mathematical equations, or findings here.`
            }, newProposalData, {
                id: newId,
                author,
                authorName,
                authorRole,
                user_id: userId,
                avatar
            }));

            this.proposals.unshift(fullProposal);
            this.activeProposalId = newId;
            this.saveProposals();
            return fullProposal;
        }

        addDiscussion(proposalId, discussionData) {
            const proposal = this.proposals.find(p => p.id === proposalId);
            if (!proposal) return null;

            const u = resolveCurrentUserInfo();
            let author = discussionData.author;
            let authorName = discussionData.authorName;

            if (!author || author === 'current_user') {
                author = (u.username && u.username !== 'researcher') ? u.username : (u.userId ? `user_${u.userId.substring(0, 8)}` : 'researcher');
            }
            if (!authorName || authorName === 'Researcher (You)') {
                authorName = (u.displayName && u.displayName !== 'Lead Researcher') ? u.displayName : (u.username || 'Lead Researcher');
            }

            const newDisc = Object.assign({
                id: 'disc-' + Date.now(),
                createdAt: 'Just now',
                endorsements: 0
            }, discussionData, {
                author: author,
                authorName: authorName,
                user_id: discussionData.user_id || u.userId || undefined,
                avatar: discussionData.avatar || u.avatar || ''
            });

            proposal.discussions.unshift(newDisc);

            // Update consensus score
            if (newDisc.tag === 'verification') {
                proposal.consensusScore.validated += 1;
            } else if (newDisc.tag === 'counter_example') {
                proposal.consensusScore.counter += 1;
            }
            proposal.consensusScore.testsRun += 1;

            if (proposal.consensusScore.counter > proposal.consensusScore.validated) {
                proposal.status = 'counter_example';
            } else if (proposal.consensusScore.validated >= 5) {
                proposal.status = 'validated';
            } else {
                proposal.status = 'testing';
            }

            this.saveProposals();
            return newDisc;
        }

        updateNotes(proposalId, newNotes) {
            const proposal = this.proposals.find(p => p.id === proposalId);
            if (proposal) {
                proposal.notes = newNotes;
                this.saveProposals();
            }
        }

        endorseDiscussion(proposalId, discId) {
            const proposal = this.proposals.find(p => p.id === proposalId);
            if (proposal) {
                const disc = proposal.discussions.find(d => d.id === discId);
                if (disc) {
                    disc.endorsements = (disc.endorsements || 0) + 1;
                    this.saveProposals();
                    return disc.endorsements;
                }
            }
            return 0;
        }

        /**
         * Re-Runs a peer's test attachment, updating hypothesis active test bench parameters.
         */
        reRunDiscussionTest(proposalId, discId) {
            const proposal = this.proposals.find(p => p.id === proposalId);
            if (!proposal) return null;
            const disc = proposal.discussions.find(d => d.id === discId);
            if (!disc || !disc.testRun) return null;

            this.activeProposalId = proposal.id;
            proposal.activeParams = Object.assign({}, proposal.initialParams, disc.testRun.params || {});
            proposal.activeTestRun = {
                discId: disc.id,
                author: disc.author,
                authorName: disc.authorName,
                title: disc.testRun.title,
                status: disc.testRun.status,
                params: Object.assign({}, disc.testRun.params || {}),
                resultMetrics: disc.testRun.resultMetrics
            };
            proposal.consensusScore.testsRun = (proposal.consensusScore.testsRun || 0) + 1;
            this.saveProposals();
            return { proposal, disc };
        }

        /**
         * Resets the active test bench back to the original author's baseline parameters.
         */
        resetToOriginalHypothesis(proposalId) {
            const proposal = this.proposals.find(p => p.id === proposalId);
            if (!proposal) return null;
            proposal.activeParams = Object.assign({}, proposal.initialParams);
            proposal.activeTestRun = null;
            this.saveProposals();
            return proposal;
        }

        /**
         * Live Simulation Runner Dispatcher
         */
        runSimulation(engine, params, canvasEl, outputEl, domain = null) {
            if (!canvasEl) return;

            const eng = String(engine || '').toLowerCase().trim();
            const dom = String(domain || '').toLowerCase().trim();

            if (eng.includes('optics') || dom.includes('optics')) {
                this.runOpticsSimulation(params, canvasEl, outputEl);
            } else if (eng.includes('calculus') || eng.includes('math') || dom.includes('math')) {
                this.runCalculusSimulation(params, canvasEl, outputEl);
            } else if (eng.includes('projectile') || eng.includes('physics') || eng.includes('matter') || eng.includes('kinematic') || dom.includes('physics') || dom.includes('mechanic')) {
                this.runProjectileSimulation(params, canvasEl, outputEl);
            } else if (eng.includes('search') || eng.includes('sort') || dom === 'cs' || dom === 'computer_science' || dom.startsWith('cs_') || dom.includes('algorithm')) {
                this.runSearchSimulation(params, canvasEl, outputEl);
            } else {
                // Intelligent parameter detection fallback
                if (params && (params.velocity !== undefined || params.dragCoeff !== undefined || params.angle !== undefined || (params.gravity !== undefined && params.wavelength === undefined))) {
                    this.runProjectileSimulation(params, canvasEl, outputEl);
                } else if (params && (params.wavelength !== undefined || params.slitDistance !== undefined)) {
                    this.runOpticsSimulation(params, canvasEl, outputEl);
                } else if (params && (params.partitions !== undefined || params.lowerBound !== undefined || params.dt !== undefined)) {
                    this.runCalculusSimulation(params, canvasEl, outputEl);
                } else if (params && (params.arraySize !== undefined || params.target !== undefined || params.targetIndex !== undefined)) {
                    this.runSearchSimulation(params, canvasEl, outputEl);
                } else {
                    // Universal kinematics trajectory default
                    this.runProjectileSimulation(params, canvasEl, outputEl);
                }
            }
        }

        // --- 1. Wave Optics: Young's Double Slit 60 FPS Simulation ---
        runOpticsSimulation(params, canvas, outputEl) {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const w = canvas.width = (canvas.parentElement && canvas.parentElement.clientWidth) || canvas.width || 600;
            const h = canvas.height = (canvas.parentElement && canvas.parentElement.clientHeight) || canvas.height || 320;

            const wavelengthNm = parseFloat(params.wavelength || 632); // nm
            const slitDistMm = parseFloat(params.slitDistance || 0.25); // mm
            const screenDistM = parseFloat(params.screenDistance || 1.5); // m
            const glassThickUm = parseFloat(params.glassThickness || 0.0); // um

            // Fringe width in mm: beta = (lambda * D) / d
            const lambdaM = wavelengthNm * 1e-9;
            const dM = slitDistMm * 1e-3;
            const fringeWidthMm = (lambdaM * screenDistM / dM) * 1000;
            const shiftMm = glassThickUm > 0 ? (screenDistM / dM) * (1.5 - 1.0) * (glassThickUm * 1e-6) * 1000 : 0;

            // Determine laser color
            let laserColor = '#ef4444'; // default red
            if (wavelengthNm < 480) laserColor = '#3b82f6'; // blue
            else if (wavelengthNm < 560) laserColor = '#10b981'; // green
            else if (wavelengthNm < 590) laserColor = '#fbbf24'; // yellow
            else if (wavelengthNm < 620) laserColor = '#f97316'; // orange

            let animId = null;
            let phase = 0;

            function draw() {
                if (canvas._isPaused) {
                    if (document.body.contains(canvas)) canvas._activeAnim = requestAnimationFrame(draw);
                    return;
                }
                ctx.fillStyle = '#06080e';
                ctx.fillRect(0, 0, w, h);

                const slitX = 90;
                const screenX = w - 120;
                const cy = h / 2;
                const slitSeparationPx = Math.min(80, Math.max(20, slitDistMm * 100));

                const s1Y = cy - slitSeparationPx / 2;
                const s2Y = cy + slitSeparationPx / 2;

                // 1. Draw Incoming Laser Beam
                ctx.strokeStyle = laserColor;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(20, cy);
                ctx.lineTo(slitX, cy);
                ctx.stroke();

                // 2. Draw Slit Barrier
                ctx.fillStyle = '#334155';
                ctx.fillRect(slitX, 20, 8, s1Y - 24);
                ctx.fillRect(slitX, s1Y + 4, 8, s2Y - s1Y - 8);
                ctx.fillRect(slitX, s2Y + 4, 8, h - s2Y - 24);

                // Slit labels
                ctx.fillStyle = '#94a3b8';
                ctx.font = '10px JetBrains Mono';
                ctx.fillText('S₁', slitX - 16, s1Y + 3);
                ctx.fillText('S₂', slitX - 16, s2Y + 3);
                ctx.fillText(`d=${slitDistMm}mm`, slitX - 24, cy + 3);

                // 3. Propagating Wavefront Rings
                ctx.lineWidth = 1.2;
                const maxR = screenX - slitX;
                const waveSpacing = Math.max(8, (wavelengthNm / 632) * 14);

                for (let r = (phase % waveSpacing); r < maxR; r += waveSpacing) {
                    const alpha = Math.max(0, 0.45 * (1 - r / maxR));
                    ctx.strokeStyle = laserColor;
                    ctx.globalAlpha = alpha;

                    // Wave from S1
                    ctx.beginPath();
                    ctx.arc(slitX + 8, s1Y, r, -Math.PI / 2.2, Math.PI / 2.2);
                    ctx.stroke();

                    // Wave from S2
                    ctx.beginPath();
                    ctx.arc(slitX + 8, s2Y, r, -Math.PI / 2.2, Math.PI / 2.2);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1.0;

                // 4. Draw Screen with Fringe Bands
                const screenW = 28;
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(screenX, 20, screenW, h - 40);
                ctx.strokeStyle = '#475569';
                ctx.strokeRect(screenX, 20, screenW, h - 40);

                // Draw Interference Fringes
                const pixelScale = 18 / Math.max(0.5, fringeWidthMm);
                for (let y = 22; y < h - 22; y += 2) {
                    const yDistMm = (y - cy) / pixelScale - shiftMm;
                    const deltaPhi = (2 * Math.PI / (fringeWidthMm)) * yDistMm;
                    const intensity = Math.pow(Math.cos(deltaPhi / 2), 2);

                    ctx.fillStyle = laserColor;
                    ctx.globalAlpha = intensity * 0.85;
                    ctx.fillRect(screenX + 2, y, screenW - 4, 2);
                }
                ctx.globalAlpha = 1.0;

                // 5. Draw Intensity Profile Graph on Far Right
                ctx.strokeStyle = laserColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (let y = 22; y < h - 22; y += 3) {
                    const yDistMm = (y - cy) / pixelScale - shiftMm;
                    const deltaPhi = (2 * Math.PI / (fringeWidthMm)) * yDistMm;
                    const intensity = Math.pow(Math.cos(deltaPhi / 2), 2);
                    const graphX = screenX + screenW + 10 + intensity * 45;
                    if (y === 22) ctx.moveTo(graphX, y); else ctx.lineTo(graphX, y);
                }
                ctx.stroke();

                // Screen Label
                ctx.fillStyle = '#f8fafc';
                ctx.font = '11px Plus Jakarta Sans';
                ctx.fillText(`Screen D=${screenDistM}m`, screenX - 10, h - 10);

                if (!canvas._isPaused) phase += 0.8;
                if (document.body.contains(canvas)) {
                    canvas._activeAnim = requestAnimationFrame(draw);
                }
            }

            if (canvas._activeAnim) cancelAnimationFrame(canvas._activeAnim);
            draw();

            if (outputEl) {
                outputEl.innerHTML = `<strong>Fringe Width:</strong> $\\beta = \\frac{\\lambda D}{d} = <span style="color:${laserColor}; font-weight:700;">${fringeWidthMm.toFixed(2)}\\text{ mm}</span>$ | <strong>Wavelength:</strong> ${wavelengthNm}nm | <strong>Slits:</strong> $d=${slitDistMm}\\text{ mm}$`;
            }
        }

        // --- 2D Kinematics: Studio-Grade 60/120 FPS Projectile Flight Simulator (Retina HiDPI & Sub-Pixel Interpolation) ---
        runProjectileSimulation(params, canvas, outputEl) {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const v0 = Math.max(5, parseFloat(params.velocity || 45)); // m/s
            const angleDeg = Math.min(89, Math.max(1, parseFloat(params.angle || 45)));
            const kSlider = Math.max(0, parseFloat(params.dragCoeff !== undefined ? params.dragCoeff : 0.06));
            // Physical aerodynamic drag acceleration factor: a_drag = -k_eff * v * v_vec
            // Calibrated to match standard atmospheric density & sphere cross-section (rho*A/(2m))
            const k = kSlider * 0.0485;
            const g = Math.max(1, parseFloat(params.gravity || 9.81));

            const thetaRad = (angleDeg * Math.PI) / 180;

            // 1. Analytical Vacuum Solution
            const tFlightVac = (2 * v0 * Math.sin(thetaRad)) / g;
            const rangeVac = (v0 * v0 * Math.sin(2 * thetaRad)) / g;
            const maxHVac = (v0 * v0 * Math.pow(Math.sin(thetaRad), 2)) / (2 * g);

            // 2. High-Precision Numerical Integration for Air Drag (500 steps/sec)
            const dtPhys = 0.002;
            let vx = v0 * Math.cos(thetaRad);
            let vy = v0 * Math.sin(thetaRad);
            let px = 0, py = 0;
            let tSim = 0;

            const dragSamples = [{ t: 0, x: 0, y: 0, vx, vy, speed: v0 }];
            const vacSamples = [{ t: 0, x: 0, y: 0, vx: v0 * Math.cos(thetaRad), vy: v0 * Math.sin(thetaRad), speed: v0 }];
            let maxHDrag = 0;
            let apexDragSample = null;
            let apexVacSample = null;

            // Pre-calculate full vacuum trajectory
            const nVacSteps = Math.ceil(tFlightVac / dtPhys);
            for (let i = 1; i <= nVacSteps + 10; i++) {
                const t = i * dtPhys;
                const xV = (v0 * Math.cos(thetaRad)) * t;
                const yV = (v0 * Math.sin(thetaRad)) * t - 0.5 * g * t * t;
                const vyV = (v0 * Math.sin(thetaRad)) - g * t;
                const vxV = v0 * Math.cos(thetaRad);
                const sV = Math.sqrt(vxV * vxV + vyV * vyV);
                if (yV >= 0 || vacSamples[vacSamples.length - 1].y > 0) {
                    const sample = { t, x: xV, y: Math.max(0, yV), vx: vxV, vy: vyV, speed: sV };
                    vacSamples.push(sample);
                    if (!apexVacSample || yV > apexVacSample.y) apexVacSample = sample;
                }
                if (yV < 0 && t > 0.05) break;
            }

            // Pre-calculate full drag trajectory (Runge-Kutta 4th Order RK4 for high-precision mechanics)
            const derivatives = (x, y, vX, vY) => {
                const s = Math.sqrt(vX * vX + vY * vY);
                return {
                    dx: vX,
                    dy: vY,
                    dvx: -k * s * vX,
                    dvy: -g - k * s * vY
                };
            };

            while (py >= 0 && tSim < 30) {
                const k1 = derivatives(px, py, vx, vy);
                const k2 = derivatives(
                    px + 0.5 * dtPhys * k1.dx,
                    py + 0.5 * dtPhys * k1.dy,
                    vx + 0.5 * dtPhys * k1.dvx,
                    vy + 0.5 * dtPhys * k1.dvy
                );
                const k3 = derivatives(
                    px + 0.5 * dtPhys * k2.dx,
                    py + 0.5 * dtPhys * k2.dy,
                    vx + 0.5 * dtPhys * k2.dvx,
                    vy + 0.5 * dtPhys * k2.dvy
                );
                const k4 = derivatives(
                    px + dtPhys * k3.dx,
                    py + dtPhys * k3.dy,
                    vx + dtPhys * k3.dvx,
                    vy + dtPhys * k3.dvy
                );

                px += (dtPhys / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
                py += (dtPhys / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);
                vx += (dtPhys / 6) * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx);
                vy += (dtPhys / 6) * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy);
                tSim += dtPhys;

                const curSpeed = Math.sqrt(vx * vx + vy * vy);
                if (py > maxHDrag) {
                    maxHDrag = py;
                    apexDragSample = { t: tSim, x: px, y: py, vx, vy, speed: curSpeed };
                }

                if (py >= 0 || dragSamples[dragSamples.length - 1].y > 0) {
                    dragSamples.push({
                        t: tSim,
                        x: px,
                        y: Math.max(0, py),
                        vx,
                        vy,
                        speed: curSpeed
                    });
                }
                if (py < 0 && tSim > 0.05) break;
            }

            canvas._lastDragSamples = dragSamples;
            canvas._lastVacSamples = vacSamples;

            const tFlightDrag = dragSamples[dragSamples.length - 1].t;
            const rangeDrag = dragSamples[dragSamples.length - 1].x;
            const totalDuration = Math.max(tFlightVac, tFlightDrag);

            // 3. Animation State
            let simClock = 0; // Simulated seconds elapsed
            let lastTimestamp = null;
            let pauseTimer = 0;
            const sparks = [];
            const impactRipples = [];
            let muzzleFlashTimer = 0;
            let hasLanded = false;

            // Interpolation helper for continuous smooth trajectories
            function getSampleAt(samples, t) {
                if (t <= 0) return samples[0];
                if (t >= samples[samples.length - 1].t) return samples[samples.length - 1];

                // Binary search for surrounding samples
                let low = 0, high = samples.length - 1;
                while (low <= high) {
                    const mid = (low + high) >> 1;
                    if (samples[mid].t < t) low = mid + 1;
                    else high = mid - 1;
                }
                const idx1 = Math.max(0, low - 1);
                const idx2 = Math.min(samples.length - 1, low);
                if (idx1 === idx2) return samples[idx1];

                const s1 = samples[idx1];
                const s2 = samples[idx2];
                const alpha = (t - s1.t) / (s2.t - s1.t);

                return {
                    t,
                    x: s1.x + (s2.x - s1.x) * alpha,
                    y: s1.y + (s2.y - s1.y) * alpha,
                    vx: s1.vx + (s2.vx - s1.vx) * alpha,
                    vy: s1.vy + (s2.vy - s1.vy) * alpha,
                    speed: s1.speed + (s2.speed - s1.speed) * alpha
                };
            }

            function draw(now) {
                if (canvas._isPaused) {
                    lastTimestamp = now;
                    if (document.body.contains(canvas)) canvas._activeAnim = requestAnimationFrame(draw);
                    return;
                }
                if (!lastTimestamp) lastTimestamp = now;
                const dtSeconds = Math.min(0.05, (now - lastTimestamp) / 1000);
                lastTimestamp = now;

                // Dynamic HiDPI & Responsive Viewport Auto-Scaling
                const dpr = Math.min(window.devicePixelRatio || 1, 3);
                const rect = canvas.getBoundingClientRect();
                const cssW = Math.max(100, Math.floor(rect.width) || canvas.parentElement?.clientWidth || 640);
                const cssH = Math.max(80, Math.floor(rect.height) || canvas.parentElement?.clientHeight || 360);

                if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
                    canvas.width = Math.round(cssW * dpr);
                    canvas.height = Math.round(cssH * dpr);
                }
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

                // Viewport padding tailored for responsive mobile & desktop
                const padLeft = Math.max(38, cssW * 0.08);
                const padRight = Math.max(28, cssW * 0.06);
                const padTop = Math.max(24, cssH * 0.1);
                const padBottom = Math.max(56, cssH * 0.17);

                const plotW = cssW - padLeft - padRight;
                const plotH = cssH - padTop - padBottom;

                // FIXED STABLE WORLD COORDINATE DOMAIN
                // The coordinate axes remain 100% fixed & constant so the user's focus is entirely on the dynamic graph morphing
                const worldMaxX = 400; // Fixed 400m horizontal domain
                const worldMaxY = 160; // Fixed 160m vertical domain

                const toScreenX = (xVal) => padLeft + (Math.min(xVal, worldMaxX) / worldMaxX) * plotW;
                const toScreenY = (yVal) => cssH - padBottom - (Math.min(yVal, worldMaxY) / worldMaxY) * plotH;

                const originScreenX = toScreenX(0);
                const originScreenY = toScreenY(0);

                // 1. Studio-Grade Deep Space Laboratory Background
                const bgGrad = ctx.createLinearGradient(0, 0, 0, cssH);
                bgGrad.addColorStop(0, '#050811');
                bgGrad.addColorStop(0.5, '#070c1a');
                bgGrad.addColorStop(1, '#0a1022');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, cssW, cssH);

                // 2. Precision Laboratory Blueprint Grid & Dot Crosshairs
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
                ctx.lineWidth = 1;
                const fixedAltitudes = [30, 60, 90, 120, 150];
                for (let i = 0; i < fixedAltitudes.length; i++) {
                    const altVal = fixedAltitudes[i];
                    const gy = toScreenY(altVal);
                    ctx.beginPath();
                    ctx.moveTo(padLeft - 10, gy);
                    ctx.lineTo(cssW - padRight + 10, gy);
                    ctx.stroke();

                    // Fixed Altitude Labels
                    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
                    ctx.font = '500 8.5px "JetBrains Mono", monospace';
                    ctx.textAlign = 'right';
                    ctx.fillText(`${altVal}m`, padLeft - 6, gy + 3);
                }

                const fixedDistances = [50, 100, 150, 200, 250, 300, 350];
                for (let i = 0; i < fixedDistances.length; i++) {
                    const distVal = fixedDistances[i];
                    const gx = toScreenX(distVal);
                    ctx.beginPath();
                    ctx.moveTo(gx, padTop - 5);
                    ctx.lineTo(gx, originScreenY);
                    ctx.stroke();

                    // Precision grid intersection crosshair "+"
                    for (let j = 0; j < fixedAltitudes.length; j++) {
                        const gy = toScreenY(fixedAltitudes[j]);
                        ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
                        ctx.beginPath();
                        ctx.moveTo(gx - 3, gy);
                        ctx.lineTo(gx + 3, gy);
                        ctx.moveTo(gx, gy - 3);
                        ctx.lineTo(gx, gy + 3);
                        ctx.stroke();
                        ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
                    }
                }

                // 3. Ground Plane with High-Precision Horizon Line
                const groundGrad = ctx.createLinearGradient(originScreenX, originScreenY, cssW - padRight, originScreenY);
                groundGrad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
                groundGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.7)');
                groundGrad.addColorStop(1, 'rgba(148, 163, 184, 0.2)');
                ctx.strokeStyle = groundGrad;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(padLeft - 20, originScreenY);
                ctx.lineTo(cssW - padRight + 15, originScreenY);
                ctx.stroke();

                // 4. Fixed Ground Telemetry Distance Tick Markers
                ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
                ctx.font = '500 9px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                for (let i = 0; i < fixedDistances.length; i++) {
                    const m = fixedDistances[i];
                    const sx = toScreenX(m);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(sx, originScreenY - 3);
                    ctx.lineTo(sx, originScreenY + 3);
                    ctx.stroke();
                    ctx.fillText(`${m}m`, sx, originScreenY + 14);
                }

                // Origin Reference Label (0,0)
                ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
                ctx.font = '600 8.5px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('0m', originScreenX, originScreenY + 14);

                // Get Current Dynamic Interpolated Physics States
                const curDragState = getSampleAt(dragSamples, simClock);
                const curVacState = getSampleAt(vacSamples, simClock);

                // 5. Ideal Vacuum Parabola Arc (Crisp Optical Dashed Cyan Guide)
                ctx.save();
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
                ctx.setLineDash([5, 5]);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let i = 0; i < vacSamples.length; i++) {
                    const sx = toScreenX(vacSamples[i].x);
                    const sy = toScreenY(vacSamples[i].y);
                    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
                }
                ctx.stroke();
                ctx.restore();

                // 6. Real Air Drag Trajectory (Precision Optical Laser Line)
                if (simClock > 0) {
                    // Soft Ambient Glow
                    ctx.save();
                    ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
                    ctx.lineWidth = 6;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    ctx.moveTo(originScreenX, originScreenY);
                    for (let i = 0; i < dragSamples.length && dragSamples[i].t <= simClock; i++) {
                        ctx.lineTo(toScreenX(dragSamples[i].x), toScreenY(dragSamples[i].y));
                    }
                    ctx.lineTo(toScreenX(curDragState.x), toScreenY(curDragState.y));
                    ctx.stroke();

                    // Sharp Solid Core
                    ctx.strokeStyle = '#10b981';
                    ctx.shadowColor = '#10b981';
                    ctx.shadowBlur = 8;
                    ctx.lineWidth = 2.2;
                    ctx.beginPath();
                    ctx.moveTo(originScreenX, originScreenY);
                    for (let i = 0; i < dragSamples.length && dragSamples[i].t <= simClock; i++) {
                        ctx.lineTo(toScreenX(dragSamples[i].x), toScreenY(dragSamples[i].y));
                    }
                    ctx.lineTo(toScreenX(curDragState.x), toScreenY(curDragState.y));
                    ctx.stroke();

                    // Fine Inner Core
                    ctx.strokeStyle = '#d1fae5';
                    ctx.lineWidth = 1;
                    ctx.shadowBlur = 0;
                    ctx.stroke();
                    ctx.restore();
                }

                // 7. Dynamic Vector Decompositions (vx & vy projections when airborne)
                if (simClock > 0.05 && simClock < tFlightDrag) {
                    const pxD = toScreenX(curDragState.x);
                    const pyD = toScreenY(curDragState.y);

                    // Drop lines to axes
                    ctx.save();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                    ctx.setLineDash([2, 3]);
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(pxD, pyD);
                    ctx.lineTo(pxD, originScreenY);
                    ctx.moveTo(pxD, pyD);
                    ctx.lineTo(originScreenX, pyD);
                    ctx.stroke();
                    ctx.restore();
                }

                // 8. Apex Callout Markers
                if (apexDragSample && simClock >= apexDragSample.t) {
                    const adX = toScreenX(apexDragSample.x);
                    const adY = toScreenY(apexDragSample.y);
                    ctx.fillStyle = '#10b981';
                    ctx.beginPath();
                    // Diamond reticle
                    ctx.moveTo(adX, adY - 4);
                    ctx.lineTo(adX + 4, adY);
                    ctx.lineTo(adX, adY + 4);
                    ctx.lineTo(adX - 4, adY);
                    ctx.closePath();
                    ctx.fill();

                    // Apex altitude annotation
                    ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
                    ctx.font = '600 8px "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(`Apex ${maxHDrag.toFixed(1)}m`, adX, adY - 7);
                }

                // 9. Ground Impact Shockwave Ripples
                for (let i = impactRipples.length - 1; i >= 0; i--) {
                    const rip = impactRipples[i];
                    rip.r += 1.8;
                    rip.alpha -= 0.035;
                    if (rip.alpha <= 0) {
                        impactRipples.splice(i, 1);
                        continue;
                    }
                    ctx.save();
                    ctx.strokeStyle = `rgba(110, 231, 183, ${rip.alpha})`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.ellipse(rip.x, originScreenY, rip.r * 1.5, rip.r * 0.4, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }

                // 10. Trailing Plasma Sparks
                if (simClock < tFlightDrag) {
                    const spX = toScreenX(curDragState.x);
                    const spY = toScreenY(curDragState.y);
                    if (Math.random() > 0.2) {
                        sparks.push({
                            x: spX + (Math.random() - 0.5) * 2,
                            y: spY + (Math.random() - 0.5) * 2,
                            vx: (Math.random() - 0.5) * 1.5 - (curDragState.vx / v0) * 1.8,
                            vy: (Math.random() - 0.5) * 1.5 - (curDragState.vy / v0) * 1.2,
                            alpha: 0.9,
                            size: Math.random() * 1.8 + 0.6
                        });
                    }
                }

                for (let i = sparks.length - 1; i >= 0; i--) {
                    const s = sparks[i];
                    s.x += s.vx;
                    s.y += s.vy;
                    s.alpha -= 0.04;
                    if (s.alpha <= 0) {
                        sparks.splice(i, 1);
                        continue;
                    }
                    ctx.fillStyle = `rgba(167, 243, 208, ${s.alpha})`;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                    ctx.fill();
                }

                // 11. Projectile Entities
                // A. Vacuum Reference Ghost
                if (simClock <= tFlightVac) {
                    const sxV = toScreenX(curVacState.x);
                    const syV = toScreenY(curVacState.y);

                    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(sxV, syV, 6, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.fillStyle = '#38bdf8';
                    ctx.beginPath();
                    ctx.arc(sxV, syV, 3, 0, Math.PI * 2);
                    ctx.fill();
                }

                // B. Real Drag Projectile (Precision Instrument Dot + Dynamic Velocity Vector)
                if (simClock <= tFlightDrag) {
                    const sxD = toScreenX(curDragState.x);
                    const syD = toScreenY(curDragState.y);

                    // Dynamic Velocity Vector Arrow
                    const vAngle = Math.atan2(-curDragState.vy, curDragState.vx);
                    const vLen = Math.min(28, (curDragState.speed / v0) * 22 + 5);
                    const vHeadX = sxD + Math.cos(vAngle) * vLen;
                    const vHeadY = syD + Math.sin(vAngle) * vLen;

                    ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(sxD, syD);
                    ctx.lineTo(vHeadX, vHeadY);
                    ctx.stroke();

                    // Arrowhead
                    const headLen = 4;
                    ctx.fillStyle = '#facc15';
                    ctx.beginPath();
                    ctx.moveTo(vHeadX, vHeadY);
                    ctx.lineTo(
                        vHeadX - headLen * Math.cos(vAngle - Math.PI / 6),
                        vHeadY - headLen * Math.sin(vAngle - Math.PI / 6)
                    );
                    ctx.lineTo(
                        vHeadX - headLen * Math.cos(vAngle + Math.PI / 6),
                        vHeadY - headLen * Math.sin(vAngle + Math.PI / 6)
                    );
                    ctx.closePath();
                    ctx.fill();

                    // Projectile Hot Core
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = '#10b981';
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(sxD, syD, 4.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                // Check landing trigger & range callout
                if (!hasLanded && simClock >= tFlightDrag) {
                    hasLanded = true;
                    impactRipples.push({ x: toScreenX(rangeDrag), r: 2, alpha: 1.0 });
                }

                // 12. Launch Pivot Base
                ctx.save();
                ctx.translate(originScreenX, originScreenY);

                // Cannon Barrel
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 3.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(thetaRad) * 20, -Math.sin(thetaRad) * 20);
                ctx.stroke();

                // Angle Arc
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, 0, 14, -thetaRad, 0);
                ctx.stroke();

                ctx.fillStyle = '#0f172a';
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // 13. Professional Laboratory Telemetry HUD (Top Instrument Bar)
                ctx.save();
                const hudX = padLeft;
                const hudY = Math.max(8, padTop - 16);
                const hudW = Math.min(cssW - padLeft - padRight, 310);
                const hudH = 22;

                // Glass Pill Background
                ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(hudX, hudY, hudW, hudH, 6);
                ctx.fill();
                ctx.stroke();

                // Live Pulse Dot
                ctx.fillStyle = simClock < tFlightDrag ? '#10b981' : '#64748b';
                ctx.beginPath();
                ctx.arc(hudX + 10, hudY + hudH / 2, 3, 0, Math.PI * 2);
                ctx.fill();

                // Real-time Telemetry Readout
                ctx.fillStyle = '#cbd5e1';
                ctx.font = '500 9px "JetBrains Mono", monospace';
                ctx.textAlign = 'left';
                const distStr = curDragState.x.toFixed(1);
                const altStr = curDragState.y.toFixed(1);
                const spdStr = curDragState.speed.toFixed(1);
                ctx.fillText(`x:${distStr}m  y:${altStr}m  |v|:${spdStr}m/s`, hudX + 18, hudY + 14.5);
                ctx.restore();

                // 14. Top-Right Scientific Legend (Desktop View)
                if (cssW > 480) {
                    ctx.save();
                    const legW = 200;
                    const legX = cssW - padRight - legW;
                    const legY = Math.max(8, padTop - 16);

                    ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.roundRect(legX, legY, legW, 22, 6);
                    ctx.fill();
                    ctx.stroke();

                    // Cyan Vacuum Legend
                    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
                    ctx.setLineDash([3, 3]);
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(legX + 8, legY + 11);
                    ctx.lineTo(legX + 22, legY + 11);
                    ctx.stroke();

                    ctx.fillStyle = '#94a3b8';
                    ctx.font = '500 8.5px "JetBrains Mono", monospace';
                    ctx.fillText('Vac', legX + 26, legY + 14);

                    // Emerald Drag Legend
                    ctx.setLineDash([]);
                    ctx.strokeStyle = '#10b981';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(legX + 56, legY + 11);
                    ctx.lineTo(legX + 70, legY + 11);
                    ctx.stroke();

                    ctx.fillStyle = '#10b981';
                    ctx.fillText(`Drag (k=${k.toFixed(2)})`, legX + 74, legY + 14);
                    ctx.restore();
                }

                // 15. Smooth Clock Progression & Looping
                const speedMult = canvas._simSpeed || 1.0;
                const paused = canvas._simPaused || false;

                if (!paused) {
                    if (simClock < totalDuration) {
                        simClock += dtSeconds * 1.35 * speedMult;
                    } else {
                        pauseTimer += dtSeconds;
                        if (pauseTimer > 1.2 / speedMult) {
                            simClock = 0;
                            pauseTimer = 0;
                            hasLanded = false;
                            sparks.length = 0;
                            impactRipples.length = 0;
                            muzzleFlashTimer = 1.0;
                        }
                    }
                }

                if (canvas._forceRefire) {
                    simClock = 0;
                    pauseTimer = 0;
                    hasLanded = false;
                    sparks.length = 0;
                    impactRipples.length = 0;
                    muzzleFlashTimer = 1.0;
                    canvas._forceRefire = false;
                }

                if (document.body.contains(canvas) || !canvas._detachedCount || canvas._detachedCount < 30) {
                    if (!document.body.contains(canvas)) {
                        canvas._detachedCount = (canvas._detachedCount || 0) + 1;
                    } else {
                        canvas._detachedCount = 0;
                    }
                    canvas._activeAnim = requestAnimationFrame(draw);
                }
            }

            if (canvas._activeAnim) cancelAnimationFrame(canvas._activeAnim);
            muzzleFlashTimer = 1.0;
            canvas._activeAnim = requestAnimationFrame(draw);
        }

        // --- 3. Calculus: Riemann Sums & Definite Integrals Simulation ---
        runCalculusSimulation(params, canvas, outputEl) {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const w = canvas.width = canvas.parentElement.clientWidth || 600;
            const h = canvas.height = 320;

            const n = Math.max(2, Math.min(60, parseInt(params.partitions || 12)));
            const method = params.method || 'midpoint';
            const b = parseFloat(params.upperLimit || 3.0);
            const a = 0.0;
            const dx = (b - a) / n;

            // Function f(x) = x^2, Analytical Integral on [0, 3] = 9.000
            const f = (x) => x * x;
            const exactArea = (Math.pow(b, 3) - Math.pow(a, 3)) / 3.0;

            let approxArea = 0;
            const slices = [];

            for (let i = 0; i < n; i++) {
                const xLeft = a + i * dx;
                const xRight = xLeft + dx;
                let xEval = xLeft;

                if (method === 'right') xEval = xRight;
                else if (method === 'midpoint') xEval = (xLeft + xRight) / 2.0;

                const yVal = f(xEval);
                approxArea += yVal * dx;
                slices.push({ xLeft, xRight, xEval, yVal });
            }

            ctx.fillStyle = '#06080e';
            ctx.fillRect(0, 0, w, h);

            const marginL = 50;
            const marginB = 40;
            const plotW = w - 80;
            const plotH = h - 70;

            const scaleX = plotW / 3.5;
            const scaleY = plotH / 10.0;

            // Draw Cartesian Axes
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(marginL, h - marginB); ctx.lineTo(w - 20, h - marginB); // X-axis
            ctx.moveTo(marginL, 20); ctx.lineTo(marginL, h - marginB); // Y-axis
            ctx.stroke();

            // Axis labels & ticks
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px JetBrains Mono';
            for (let xT = 1; xT <= 3; xT++) {
                const px = marginL + xT * scaleX;
                ctx.fillText(xT.toString(), px - 4, h - marginB + 16);
            }
            for (let yT = 2; yT <= 9; yT += 2) {
                const py = h - marginB - yT * scaleY;
                ctx.fillText(yT.toString(), marginL - 22, py + 4);
            }

            // 1. Draw Riemann Rectangles
            slices.forEach((s) => {
                const pxLeft = marginL + s.xLeft * scaleX;
                const pxW = (s.xRight - s.xLeft) * scaleX;
                const rectH = s.yVal * scaleY;
                const pyTop = h - marginB - rectH;

                ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
                ctx.fillRect(pxLeft, pyTop, pxW, rectH);

                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(pxLeft, pyTop, pxW, rectH);

                // Sample point dot
                const pDotX = marginL + s.xEval * scaleX;
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(pDotX, pyTop, 3.5, 0, 2 * Math.PI);
                ctx.fill();
            });

            // 2. Draw Exact Smooth Curve y = x^2
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            for (let x = 0; x <= 3.2; x += 0.05) {
                const px = marginL + x * scaleX;
                const py = h - marginB - f(x) * scaleY;
                if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            // HUD Legend
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Outfit';
            ctx.fillText(`f(x) = x² on [0, 3] | Partitions N = ${n} (${method.toUpperCase()})`, marginL + 10, 36);

            const errPct = (Math.abs(approxArea - exactArea) / exactArea * 100).toFixed(2);
            if (outputEl) {
                outputEl.innerHTML = `<strong>Riemann Sum:</strong> $S_${n} = <span style="color:#38bdf8; font-weight:700;">${approxArea.toFixed(3)}</span>$ | <strong>Exact Integral:</strong> $\\int_0^3 x^2 dx = <span style="color:#a855f7; font-weight:700;">9.000</span>$ | <strong>Error Margin:</strong> ${errPct}%`;
            }
        }

        // --- 4. Computer Science: Binary Search vs Linear Search Simulation ---
        runSearchSimulation(params, canvas, outputEl) {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const w = canvas.width = canvas.parentElement.clientWidth || 600;
            const h = canvas.height = 320;

            const n = Math.min(128, Math.max(16, parseInt(params.arraySize || 64)));
            const targetIdx = Math.min(n - 1, Math.max(0, parseInt(params.targetIndex || Math.floor(n * 0.85))));

            // Binary Search Step Simulation
            let low = 0, high = n - 1;
            const binarySteps = [];
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                binarySteps.push({ low, high, mid });
                if (mid === targetIdx) break;
                else if (mid < targetIdx) low = mid + 1;
                else high = mid - 1;
            }

            const binaryCount = binarySteps.length;
            const linearCount = targetIdx + 1;

            ctx.fillStyle = '#06080e';
            ctx.fillRect(0, 0, w, h);

            const barW = (w - 60) / n;
            const maxVal = n;

            // Draw Sorted Array Bars
            for (let i = 0; i < n; i++) {
                const barH = ((i + 1) / maxVal) * (h - 130);
                const x = 30 + i * barW;
                const y = h - 50 - barH;

                if (i === targetIdx) {
                    ctx.fillStyle = '#ef4444'; // Target bar in Red
                } else if (binarySteps.some(s => s.mid === i)) {
                    ctx.fillStyle = '#10b981'; // Binary search probe points in Emerald
                } else {
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.45)';
                }

                ctx.fillRect(x, y, Math.max(1, barW - 1), barH);
            }

            // Draw Search Window Brackets
            const lastStep = binarySteps[binarySteps.length - 1];
            const lowX = 30 + lastStep.low * barW;
            const highX = 30 + (lastStep.high + 1) * barW;

            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.strokeRect(lowX, h - 45, highX - lowX, 6);

            // HUD
            ctx.fillStyle = '#ffffff';
            ctx.font = '13px Outfit';
            ctx.fillText(`Target Value at Index: [${targetIdx}] (Array Size N = ${n})`, 30, 36);

            ctx.fillStyle = '#10b981';
            ctx.font = '12px JetBrains Mono';
            ctx.fillText(`⚡ Binary Search: ${binaryCount} comparisons (O(log₂ N))`, 30, 60);

            ctx.fillStyle = '#f59e0b';
            ctx.fillText(`🐢 Linear Search: ${linearCount} comparisons (O(N))`, 30, 80);

            const speedup = (linearCount / binaryCount).toFixed(1);
            if (outputEl) {
                outputEl.innerHTML = `<strong>Binary Search:</strong> <span style="color:#10b981; font-weight:700;">${binaryCount} steps</span> ($\le \\lceil\\log_2 ${n}\\rceil = ${Math.ceil(Math.log2(n))}$) | <strong>Linear Search:</strong> <span style="color:#f59e0b;">${linearCount} steps</span> | <strong>Speedup:</strong> ${speedup}x Faster!`;
            }
        }

        /**
         * Generates runnable p5.js animation code for the active proposal parameters.
         */
        generateStudioCode(proposal, overrideParams, testRunMeta) {
            if (!proposal) return '';
            const params = overrideParams || proposal.activeParams || proposal.initialParams || {};
            const activeTest = testRunMeta || proposal.activeTestRun;
            let codeSnippet = '';

            const headerTitle = activeTest ? `${proposal.title} [Re-Run: ${activeTest.title}]` : proposal.title;
            const authorInfo = activeTest ? `@${activeTest.author} (Re-Run on @${proposal.author}'s hypothesis)` : `@${proposal.author}`;

            if (proposal.id === 'prop-physics-optics' || proposal.engine === 'optics_canvas' || proposal.domain === 'optics') {
                const wavelength = params.wavelength || 632;
                const slitDist = params.slitDistance || 0.25;
                const screenDist = params.screenDistance || 1.5;

                codeSnippet = `// --- 12th Grade Physics: Young's Double Slit Wave Optics Animation ---
// Transferred from ResearchLab (${authorInfo})
// Hypothesis: ${headerTitle}

let wavelength = ${wavelength}; // nm
let d = ${slitDist}; // mm slit separation
let D = ${screenDist}; // m screen distance
let phase = 0;
let photons = [];

function setup() {
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  canvas.parent('canvas-container');
  frameRate(60);
}

function draw() {
  background(6, 8, 14);

  const cx = width * 0.45;
  const cy = height / 2;
  const slitX = width * 0.16;
  const screenX = width * 0.76;

  // Slit positions
  const slitSepPx = map(d, 0.1, 1.5, 30, 90);
  const s1Y = cy - slitSepPx / 2;
  const s2Y = cy + slitSepPx / 2;

  // Dynamic Laser Color based on wavelength
  let laserCol = color(239, 68, 68); // Red default
  if (wavelength < 480) laserCol = color(59, 130, 246); // Blue
  else if (wavelength < 560) laserCol = color(16, 185, 129); // Green
  else if (wavelength < 590) laserCol = color(251, 191, 36); // Yellow

  // 1. Slit Barrier Wall
  fill(51, 65, 85);
  noStroke();
  rect(slitX, 30, 8, s1Y - 34);
  rect(slitX, s1Y + 4, 8, s2Y - s1Y - 8);
  rect(slitX, s2Y + 4, 8, height - s2Y - 34);

  // 2. Incoming Continuous Laser Beam with Pulsing Wave Packets
  stroke(laserCol);
  strokeWeight(3);
  line(20, cy, slitX, cy);

  for (let x = (phase * 3) % 40 + 20; x < slitX; x += 30) {
    fill(255);
    noStroke();
    circle(x, cy, 5);
  }

  // 3. Continuous Concentric Wavefront Ripples from S1 and S2
  let waveSpacing = map(wavelength, 400, 700, 10, 18);
  let maxR = screenX - slitX;

  strokeWeight(1.2);
  noFill();
  for (let r = (phase % waveSpacing); r < maxR; r += waveSpacing) {
    let alpha = map(r, 0, maxR, 140, 10);
    stroke(red(laserCol), green(laserCol), blue(laserCol), alpha);
    arc(slitX + 8, s1Y, r * 2, r * 2, -PI / 2.2, PI / 2.2);
    arc(slitX + 8, s2Y, r * 2, r * 2, -PI / 2.2, PI / 2.2);
  }

  // 4. Moving Photon Particles travelling through slits to screen
  if (frameCount % 3 === 0 && photons.length < 60) {
    let fromS1 = random() > 0.5;
    let startY = fromS1 ? s1Y : s2Y;
    let angle = random(-0.6, 0.6);
    photons.push({
      x: slitX + 8,
      y: startY,
      vx: cos(angle) * 4.5,
      vy: sin(angle) * 4.5,
      alpha: 255
    });
  }

  for (let i = photons.length - 1; i >= 0; i--) {
    let p = photons[i];
    p.x += p.vx;
    p.y += p.vy;
    fill(red(laserCol), green(laserCol), blue(laserCol), p.alpha);
    noStroke();
    circle(p.x, p.y, 3.5);

    if (p.x >= screenX || p.y < 30 || p.y > height - 30) {
      photons.splice(i, 1);
    }
  }

  // 5. Detector Screen with Real-Time Interference Fringes
  let fringeWidthMm = (wavelength * 1e-9 * D / (d * 1e-3)) * 1000;
  let scaleFringe = 16 / max(0.5, fringeWidthMm);

  fill(15, 23, 42);
  stroke(71, 85, 105);
  rect(screenX, 30, 26, height - 60);

  for (let y = 32; y < height - 32; y += 2) {
    let yDistMm = (y - cy) / scaleFringe;
    let deltaPhi = (2 * PI / fringeWidthMm) * yDistMm;
    let intensity = pow(cos(deltaPhi / 2), 2);

    stroke(red(laserCol), green(laserCol), blue(laserCol), intensity * 255);
    line(screenX + 2, y, screenX + 24, y);
  }

  // 6. Intensity Profile Waveform
  stroke(laserCol);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let y = 32; y < height - 32; y += 3) {
    let yDistMm = (y - cy) / scaleFringe;
    let deltaPhi = (2 * PI / fringeWidthMm) * yDistMm;
    let intensity = pow(cos(deltaPhi / 2), 2);
    let gx = screenX + 32 + intensity * 45;
    vertex(gx, y);
  }
  endShape();

  phase += 0.8;

  // HUD
  fill(255);
  noStroke();
  textSize(14);
  textAlign(LEFT);
  text("Young's Double Slit Interference (60 FPS Simulation)", 24, 34);
  fill(148, 163, 184);
  textSize(12);
  text("Fringe Width β = (λ·D)/d = " + fringeWidthMm.toFixed(2) + " mm | λ = " + wavelength + "nm | d = " + d + "mm | D = " + D + "m", 24, 54);
}
`;
            } else if (proposal.id === 'prop-physics-projectile' || proposal.engine === 'projectile_canvas' || proposal.domain === 'physics' || proposal.domain === 'mechanics' || !proposal.domain) {
                const v0 = params.velocity || 45;
                const angle = params.angle || 45;
                const drag = params.dragCoeff ?? 0.06;

                codeSnippet = `// --- 12th Grade Physics: Projectile Motion (Continuous Flight Simulator) ---
// Transferred from ResearchLab (${authorInfo})
// Hypothesis: ${headerTitle}

let v0 = ${v0}; // initial velocity (m/s)
let angleDeg = ${angle}; // launch angle
let k = ${drag}; // air resistance coefficient
let g = 9.81;

// Simulation States
let simTime = 0;
let flightVacPoints = [];
let flightDragPoints = [];
let currentVacP = { x: 0, y: 0 };
let currentDragP = { x: 0, y: 0 };
let activeFlight = true;

function setup() {
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  canvas.parent('canvas-container');
  frameRate(60);
  resetSimulation();
}

function resetSimulation() {
  simTime = 0;
  flightVacPoints = [];
  flightDragPoints = [];
  currentVacP = { x: 0, y: 0 };
  currentDragP = { x: 0, y: 0 };
  activeFlight = true;
}

function draw() {
  background(6, 8, 14);

  const originX = 60;
  const originY = height - 55;
  const scale = (width - 120) / 220; // scale meters to screen pixels

  // Ground Grid & Horizon
  stroke(30, 41, 59);
  strokeWeight(1);
  for (let px = originX; px < width; px += 40) {
    line(px, 0, px, originY);
  }
  stroke(71, 85, 105);
  strokeWeight(2);
  line(30, originY, width - 20, originY);

  let rad = (angleDeg * PI) / 180;
  let rangeVac = (v0 * v0 * sin(2 * rad)) / g;

  // 1. Draw Ideal Vacuum Parabola Guide (Cyan Dashed Line)
  stroke(56, 189, 248, 90);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let xm = 0; xm <= rangeVac; xm += 3) {
    let ym = xm * tan(rad) - (g * xm * xm) / (2 * v0 * v0 * pow(cos(rad), 2));
    vertex(originX + xm * scale, originY - ym * scale);
  }
  endShape();

  // 2. Physics Numerical Step for Active Flight
  if (activeFlight) {
    let dt = 0.04;
    simTime += dt;

    // A. Vacuum Particle Position
    let xVac = (v0 * cos(rad)) * simTime;
    let yVac = (v0 * sin(rad)) * simTime - 0.5 * g * simTime * simTime;
    if (yVac >= 0) {
      currentVacP = { x: xVac, y: yVac };
      flightVacPoints.push({ x: xVac, y: yVac });
    }

    // B. Air Drag Trajectory Integration
    let vx = v0 * cos(rad);
    let vy = v0 * sin(rad);
    let xDrag = 0, yDrag = 0;

    for (let t = 0; t <= simTime && yDrag >= 0; t += dt) {
      let speed = sqrt(vx * vx + vy * vy);
      let ax = -k * speed * vx;
      let ay = -g - k * speed * vy;
      vx += ax * dt;
      vy += ay * dt;
      xDrag += vx * dt;
      yDrag += vy * dt;
    }

    if (yDrag >= 0) {
      currentDragP = { x: xDrag, y: yDrag };
      if (flightDragPoints.length === 0 || dist(flightDragPoints[flightDragPoints.length - 1].x, flightDragPoints[flightDragPoints.length - 1].y, xDrag, yDrag) > 1) {
        flightDragPoints.push({ x: xDrag, y: yDrag });
      }
    } else {
      // Impact occurred, pause and auto-reset
      if (simTime > 4.0) {
        resetSimulation();
      }
    }
  }

  // 3. Draw Solid Emerald Real Drag Trail
  stroke(16, 185, 129);
  strokeWeight(3);
  noFill();
  beginShape();
  for (let pt of flightDragPoints) {
    vertex(originX + pt.x * scale, originY - pt.y * scale);
  }
  endShape();

  // 4. Draw Moving Glowing Projectiles
  // Vacuum Projectile (Cyan)
  fill(56, 189, 248);
  noStroke();
  circle(originX + currentVacP.x * scale, originY - currentVacP.y * scale, 9);

  // Drag Projectile (Emerald)
  fill(16, 185, 129);
  circle(originX + currentDragP.x * scale, originY - currentDragP.y * scale, 10);

  // Cannon Turret
  fill(100, 116, 139);
  circle(originX, originY, 16);
  stroke(148, 163, 184);
  strokeWeight(4);
  line(originX, originY, originX + cos(rad) * 22, originY - sin(rad) * 22);

  // HUD
  fill(255);
  noStroke();
  textSize(14);
  textAlign(LEFT);
  text("2D Kinematics Projectile Flight Animation (60 FPS)", 24, 34);
  fill(56, 189, 248);
  textSize(12);
  text("• Vacuum Bullet: Range = " + rangeVac.toFixed(1) + "m (Cyan)", 24, 54);
  fill(16, 185, 129);
  text("• Real Air Drag Bullet: Range = " + currentDragP.x.toFixed(1) + "m | k = " + k + " (Emerald)", 24, 72);
}
`;
            } else if (proposal.id === 'prop-math-calculus') {
                const partitions = params.partitions || 12;

                codeSnippet = `// --- 12th Grade Calculus: Animated Riemann Sum Integration ---
// Transferred from ResearchLab (${authorInfo})
// Hypothesis: ${headerTitle}

let baseN = ${partitions};
let b = 3.0;
let exactArea = 9.000;
let animPhase = 0;

function setup() {
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  canvas.parent('canvas-container');
  frameRate(60);
}

function draw() {
  background(6, 8, 14);

  const marginL = 60;
  const marginB = 55;
  const plotW = width - 110;
  const plotH = height - 110;

  const scaleX = plotW / 3.5;
  const scaleY = plotH / 10.0;

  // Oscillating Partition count to demonstrate convergence: N -> 4 to 36
  let currentN = floor(map(sin(animPhase * 0.03), -1, 1, 4, 36));
  let dx = b / currentN;

  // 1. Cartesian Grid & Coordinate Axes
  stroke(51, 65, 85);
  strokeWeight(1.5);
  line(marginL, height - marginB, width - 30, height - marginB); // X-axis
  line(marginL, 30, marginL, height - marginB); // Y-axis

  // 2. Animated Shaded Riemann Rectangles
  let approxArea = 0;
  for (let i = 0; i < currentN; i++) {
    let xL = i * dx;
    let xR = xL + dx;
    let xMid = (xL + xR) / 2.0;
    let y = xMid * xMid;
    approxArea += y * dx;

    let px = marginL + xL * scaleX;
    let pw = dx * scaleX;
    let ph = y * scaleY;
    let py = height - marginB - ph;

    // Translucent filled rectangle
    fill(56, 189, 248, 55);
    stroke(56, 189, 248, 180);
    strokeWeight(1.2);
    rect(px, py, pw, ph);

    // Sample Point Midpoint Dot
    fill(245, 158, 11);
    noStroke();
    circle(marginL + xMid * scaleX, py, 4);
  }

  // 3. Exact Smooth Analytical Curve y = x^2
  stroke(168, 85, 247);
  strokeWeight(3);
  noFill();
  beginShape();
  for (let x = 0; x <= 3.2; x += 0.05) {
    let px = marginL + x * scaleX;
    let py = height - marginB - (x * x) * scaleY;
    vertex(px, py);
  }
  endShape();

  // 4. Floating Scan Cursor & Dynamic Integral Area
  let scanX = (animPhase * 0.02) % 3.0;
  let cursorPx = marginL + scanX * scaleX;
  stroke(245, 158, 11, 120);
  strokeWeight(1);
  line(cursorPx, height - marginB, cursorPx, height - marginB - (scanX * scanX) * scaleY);

  animPhase += 1;

  // HUD
  let errPct = (abs(approxArea - exactArea) / exactArea * 100).toFixed(2);
  fill(255);
  noStroke();
  textSize(14);
  textAlign(LEFT);
  text("Calculus: Definite Integral ∫₀³ x² dx = 9.000 (Animated Convergence)", 24, 34);
  fill(56, 189, 248);
  textSize(12);
  text("Dynamic Partitions N = " + currentN + " | Midpoint Area S_N = " + approxArea.toFixed(3) + " | Error = " + errPct + "%", 24, 54);
}
`;
            } else {
                const arraySize = params.arraySize || 64;

                codeSnippet = `// --- 12th Grade CS: Animated Binary vs Linear Search Race ---
// Transferred from ResearchLab (${authorInfo})
// Hypothesis: ${headerTitle}

let n = ${arraySize};
let target = Math.floor(n * 0.85);

// Animated Search State
let linearIdx = 0;
let binLow = 0;
let binHigh = n - 1;
let binMid = Math.floor((binLow + binHigh) / 2);
let binHistory = [];
let searchFinished = false;
let pauseTimer = 0;

function setup() {
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  canvas.parent('canvas-container');
  frameRate(20); // Steady scan cadence
  resetSearch();
}

function resetSearch() {
  target = floor(random(5, n - 2));
  linearIdx = 0;
  binLow = 0;
  binHigh = n - 1;
  binMid = Math.floor((binLow + binHigh) / 2);
  binHistory = [binMid];
  searchFinished = false;
  pauseTimer = 0;
}

function draw() {
  background(6, 8, 14);

  const barW = (width - 80) / n;
  const maxVal = n;

  // 1. Draw Array Elements
  for (let i = 0; i < n; i++) {
    let barH = ((i + 1) / maxVal) * (height - 140);
    let x = 40 + i * barW;
    let y = height - 50 - barH;

    if (i === target) {
      fill(239, 68, 68); // Red Target
    } else if (i === linearIdx) {
      fill(245, 158, 11); // Amber Linear Search Pointer
    } else if (binHistory.includes(i)) {
      fill(16, 185, 129); // Emerald Binary Search Probes
    } else if (i < binLow || i > binHigh) {
      fill(30, 41, 59, 120); // Discarded interval
    } else {
      fill(56, 189, 248, 120);
    }
    noStroke();
    rect(x, y, max(1, barW - 1), barH);
  }

  // 2. Active Binary Search Bracket Indicator
  let lowX = 40 + binLow * barW;
  let highX = 40 + (binHigh + 1) * barW;
  stroke(16, 185, 129);
  strokeWeight(2);
  noFill();
  rect(lowX, height - 42, max(6, highX - lowX), 6);

  // 3. Step Progression
  if (!searchFinished) {
    // Linear Step
    if (linearIdx < target) linearIdx++;

    // Binary Step
    if (binMid !== target && binLow <= binHigh) {
      if (binMid < target) {
        binLow = binMid + 1;
      } else {
        binHigh = binMid - 1;
      }
      binMid = Math.floor((binLow + binHigh) / 2);
      binHistory.push(binMid);
    }

    if (linearIdx === target && binMid === target) {
      searchFinished = true;
    }
  } else {
    pauseTimer++;
    if (pauseTimer > 40) {
      resetSearch();
    }
  }

  // HUD
  fill(255);
  noStroke();
  textSize(14);
  textAlign(LEFT);
  text("Search Algorithm Complexity Race (Target Index = [" + target + "])", 24, 34);
  fill(16, 185, 129);
  textSize(12);
  text("⚡ Binary Search: " + binHistory.length + " comparisons (Emerald, O(log₂ N))", 24, 54);
  fill(245, 158, 11);
  text("🐢 Linear Search: " + (linearIdx + 1) + " comparisons (Amber, O(N))", 24, 72);
}
`;
            }

            return codeSnippet;
        }

        /**
         * Transfers simulation code to XtraAnim Studio as live runnable p5.js animation.
         */
        openInStudio(proposal, overrideParams, testRunMeta) {
            const codeSnippet = this.generateStudioCode(proposal, overrideParams, testRunMeta);
            if (!codeSnippet) return;

            const title = testRunMeta ? `${proposal.title} [Re-Run: ${testRunMeta.title}]` : proposal.title;
            const remixPayload = {
                code: codeSnippet,
                engine: 'p5',
                title: title,
                author: testRunMeta ? testRunMeta.author : proposal.author
            };

            localStorage.setItem('remixMeta', JSON.stringify(remixPayload));
            localStorage.setItem('xtraAnimEngine', 'p5');
            localStorage.setItem('xtraAnimCode_p5', codeSnippet);
            localStorage.setItem('xtraAnimCode', codeSnippet);
            if (typeof window !== 'undefined' && window.location) {
                window.location.href = '/views/xtraAnim.html?tool=p5&autorun=true';
            }
        }
    }

    window.ResearchManager = new ResearchManager();

})(window);

