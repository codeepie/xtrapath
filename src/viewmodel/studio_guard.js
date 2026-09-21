/**
 * XtraPath Creator Studio Payment Protection Guard
 * Restricts heavy server-side creation engines (Manim, LaTeX, KDP, 3D) to Pro subscribers.
 * Shows the interactive Subscription Plan Modal (₹99 / $9 per month, ₹999 / $99 per year)
 * with Beta Creator Waitlist and links to free tools (XtraArticle & XtraGraph).
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

    function lockStudioInterface() {
        if (isUserProOrAdmin()) {
            document.body?.classList.remove('xtra-studio-locked');
            return;
        }
        if (document.body) {
            document.body.classList.add('xtra-studio-locked');
        }
        if (!document.getElementById('xtra-studio-lock-style')) {
            const style = document.createElement('style');
            style.id = 'xtra-studio-lock-style';
            style.textContent = `
                body.xtra-studio-locked {
                    overflow: hidden !important;
                }
                body.xtra-studio-locked > *:not(#xtraSubscriptionPlanModal):not(.razorpay-container):not(iframe[name^="razorpay"]) {
                    filter: blur(14px) !important;
                    pointer-events: none !important;
                    user-select: none !important;
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }
    }

    function showSubscriptionPlanPaywall() {
        if (isUserProOrAdmin()) return;
        lockStudioInterface();

        if (document.getElementById('xtraSubscriptionPlanModal')) return;

        const launchModal = () => {
            if (typeof window.openSubscriptionPlanModal === 'function') {
                window.openSubscriptionPlanModal({ isGuardedPage: true }, () => {
                    localStorage.setItem('is_pro', 'true');
                    document.body?.classList.remove('xtra-studio-locked');
                    window.location.reload();
                });
            } else {
                window.location.href = '/views/explore.html';
            }
        };

        if (typeof window.openSubscriptionPlanModal === 'function') {
            launchModal();
        } else {
            const script = document.createElement('script');
            script.src = '/viewmodel/subscription_modal.js?v=20260922';
            script.onload = launchModal;
            script.onerror = () => {
                window.location.href = '/views/explore.html';
            };
            document.head.appendChild(script);
        }
    }

    function enforceStudioGuard() {
        if (isUserProOrAdmin()) {
            document.body?.classList.remove('xtra-studio-locked');
            return;
        }

        lockStudioInterface();

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
                            document.body?.classList.remove('xtra-studio-locked');
                            const modal = document.getElementById('xtraSubscriptionPlanModal');
                            if (modal) modal.remove();
                            return;
                        }
                    }
                    showSubscriptionPlanPaywall();
                })
                .catch(() => {
                    showSubscriptionPlanPaywall();
                });
        } else {
            showSubscriptionPlanPaywall();
        }
    }

    // Run guard immediately and on ready
    lockStudioInterface();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enforceStudioGuard);
    } else {
        enforceStudioGuard();
    }

    // Continuous Watchdog: Prevents accessing studio if payment is cancelled, modal is removed, or devtools bypassed
    setInterval(() => {
        if (isUserProOrAdmin()) {
            document.body?.classList.remove('xtra-studio-locked');
            return;
        }
        lockStudioInterface();
        const hasModal = Boolean(document.getElementById('xtraSubscriptionPlanModal'));
        const hasRzp = Boolean(
            document.querySelector('.razorpay-container') ||
            document.querySelector('iframe[name^="razorpay"]') ||
            document.querySelector('.rzp-backdrop')
        );
        if (!hasModal && !hasRzp) {
            // Non-pro user has no active paywall modal or payment checkout on a guarded page -> boot to explore
            window.location.href = '/views/explore.html';
        }
    }, 600);

    window.enforceStudioGuard = enforceStudioGuard;
    window.isUserProOrAdmin = isUserProOrAdmin;
    window.showSubscriptionPlanPaywall = showSubscriptionPlanPaywall;
})();
