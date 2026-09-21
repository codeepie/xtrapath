/**
 * XtraPath Creator Studio Payment Protection Guard
 * Restricts heavy server-side creation engines (Manim, LaTeX, KDP, 3D) to Pro subscribers.
 * Article (xtraArticle) and Desmos (xtraGraph) remain 100% free and open.
 */

(function () {
    const SUPER_ADMINS = [
        'codeepie@gmail.com',
        'admin@xtrapath.com',
        'yogendra.singh@xtrapath.io',
        'yogendra20799@gmail.com'
    ];

    function isUserProOrAdmin() {
        const email = (localStorage.getItem('userEmail') || '').toLowerCase().trim();
        if (SUPER_ADMINS.includes(email)) return true;

        const isPro = localStorage.getItem('is_pro') === 'true';
        if (isPro) return true;

        const role = (localStorage.getItem('userRole') || '').toLowerCase();
        if (role === 'admin' || role === 'superadmin') return true;

        return false;
    }

    function renderPaywallOverlay() {
        if (document.getElementById('studioPaywallOverlay')) return;

        const style = document.createElement('style');
        style.id = 'studioPaywallStyles';
        style.innerHTML = `
            #studioPaywallOverlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(8, 12, 22, 0.88);
                backdrop-filter: blur(24px);
                -webkit-backdrop-filter: blur(24px);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                box-sizing: border-box;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                animation: paywallFadeIn 0.25s ease-out;
            }
            @keyframes paywallFadeIn {
                from { opacity: 0; transform: scale(0.98); }
                to { opacity: 1; transform: scale(1); }
            }
            .studio-paywall-card {
                background: radial-gradient(100% 80% at 50% 0%, rgba(30, 41, 69, 0.95) 0%, rgba(13, 17, 28, 0.98) 100%);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 24px;
                max-width: 480px;
                width: 100%;
                padding: 32px 28px 26px;
                color: #fff;
                box-shadow: 0 35px 90px rgba(0, 0, 0, 0.85), 0 0 40px rgba(99, 102, 241, 0.2);
                text-align: center;
                position: relative;
            }
            .studio-paywall-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(234, 179, 8, 0.15);
                border: 1px solid rgba(234, 179, 8, 0.35);
                color: #facc15;
                font-size: 0.72rem;
                font-weight: 800;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                padding: 4px 12px;
                border-radius: 99px;
                margin-bottom: 14px;
            }
            .studio-paywall-title {
                font-family: 'Outfit', sans-serif;
                font-size: 1.55rem;
                font-weight: 800;
                margin: 0 0 8px;
                color: #fff;
                letter-spacing: -0.02em;
            }
            .studio-paywall-desc {
                font-size: 0.86rem;
                color: #94a3b8;
                line-height: 1.55;
                margin: 0 0 20px;
            }
            .studio-paywall-features {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.07);
                border-radius: 16px;
                padding: 14px 16px;
                margin-bottom: 22px;
                text-align: left;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .studio-feature-item {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 0.82rem;
                color: #e2e8f0;
                font-weight: 600;
            }
            .studio-feature-item i {
                font-size: 1rem;
                color: #38bdf8;
                flex-shrink: 0;
            }
            .studio-paywall-btn-unlock {
                width: 100%;
                height: 52px;
                background: linear-gradient(135deg, #2563eb, #7c3aed);
                border: none;
                border-radius: 14px;
                color: #fff;
                font-size: 0.98rem;
                font-weight: 800;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                box-shadow: 0 6px 25px rgba(99, 102, 241, 0.4);
                transition: transform 0.15s, box-shadow 0.15s;
            }
            .studio-paywall-btn-unlock:hover {
                transform: translateY(-1px);
                box-shadow: 0 8px 30px rgba(99, 102, 241, 0.55);
            }
            .studio-paywall-free-nav {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 14px;
                margin-top: 16px;
                font-size: 0.78rem;
            }
            .studio-paywall-free-nav a {
                color: #38bdf8;
                text-decoration: none;
                font-weight: 600;
                transition: color 0.15s;
            }
            .studio-paywall-free-nav a:hover {
                color: #7dd3fc;
                text-decoration: underline;
            }
            .studio-paywall-free-nav span {
                color: #475569;
            }
        `;
        document.head.appendChild(style);

        const overlay = document.createElement('div');
        overlay.id = 'studioPaywallOverlay';
        overlay.innerHTML = `
            <div class="studio-paywall-card">
                <div class="studio-paywall-badge">
                    <i class="ri-flashlight-fill"></i> Pro Creator Studio
                </div>
                <h2 class="studio-paywall-title">Cloud Compute Engines</h2>
                <p class="studio-paywall-desc">
                    High-performance cloud Manim animations, LaTeX book compilation, and 3D rendering are reserved for Pro creators.
                </p>

                <div class="studio-paywall-features">
                    <div class="studio-feature-item">
                        <i class="ri-movie-2-line" style="color:#60a5fa;"></i>
                        <span>Unlimited Cloud Manim Python Animations (1080p60 & 4K)</span>
                    </div>
                    <div class="studio-feature-item">
                        <i class="ri-book-open-line" style="color:#34d399;"></i>
                        <span>LaTeX & Typst Publishing with Amazon KDP Cover Specs</span>
                    </div>
                    <div class="studio-feature-item">
                        <i class="ri-money-dollar-circle-line" style="color:#facc15;"></i>
                        <span>Direct Monetization & Store Asset Marketplace Listing</span>
                    </div>
                    <div class="studio-feature-item">
                        <i class="ri-shield-flash-line" style="color:#a78bfa;"></i>
                        <span>Source Code Protection DRM (Pay-to-Remix)</span>
                    </div>
                </div>

                <button id="studioPaywallUnlockBtn" class="studio-paywall-btn-unlock">
                    <i class="ri-flashlight-fill" style="color:#fde047;"></i> Unlock Pro Studio Access
                </button>

                <div class="studio-paywall-free-nav">
                    <a href="/views/xtraArticle.html">Write Free Article</a>
                    <span>•</span>
                    <a href="/views/xtraGraph.html">Free Desmos Graph</a>
                    <span>•</span>
                    <a href="/views/explore.html">Back to Explore</a>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const unlockBtn = document.getElementById('studioPaywallUnlockBtn');
        if (unlockBtn) {
            unlockBtn.onclick = () => {
                if (window.PaymentManager && typeof window.PaymentManager.openRazorpayCheckout === 'function') {
                    window.PaymentManager.openRazorpayCheckout('monthly', () => {
                        localStorage.setItem('is_pro', 'true');
                        overlay.remove();
                        window.location.reload();
                    });
                } else if (window.openProductCheckoutModal) {
                    window.openProductCheckoutModal({
                        title: 'XtraPath Pro Membership (Monthly)',
                        price: 15.00,
                        format: 'pro'
                    }, () => {
                        localStorage.setItem('is_pro', 'true');
                        overlay.remove();
                        window.location.reload();
                    });
                } else {
                    window.location.href = '/views/settings.html?tab=billing';
                }
            };
        }
    }

    function enforceStudioGuard() {
        if (isUserProOrAdmin()) return;

        const uid = localStorage.getItem('userId');
        if (uid && window.supabaseClient) {
            window.supabaseClient
                .from('profiles')
                .select('is_pro, email')
                .eq('id', uid)
                .maybeSingle()
                .then(({ data: profile }) => {
                    if (profile) {
                        const email = (profile.email || '').toLowerCase();
                        if (SUPER_ADMINS.includes(email) || profile.is_pro) {
                            localStorage.setItem('is_pro', 'true');
                            const overlay = document.getElementById('studioPaywallOverlay');
                            if (overlay) overlay.remove();
                            return;
                        }
                    }
                    renderPaywallOverlay();
                })
                .catch(() => {
                    renderPaywallOverlay();
                });
        } else {
            renderPaywallOverlay();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enforceStudioGuard);
    } else {
        enforceStudioGuard();
    }

    window.enforceStudioGuard = enforceStudioGuard;
    window.isUserProOrAdmin = isUserProOrAdmin;
})();
