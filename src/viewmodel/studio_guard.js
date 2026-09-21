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

    function showSubscriptionPlanPaywall() {
        if (document.getElementById('xtraSubscriptionPlanModal')) return;

        const launchModal = () => {
            if (typeof window.openSubscriptionPlanModal === 'function') {
                window.openSubscriptionPlanModal({ isGuardedPage: true }, () => {
                    localStorage.setItem('is_pro', 'true');
                    window.location.reload();
                });
            } else {
                window.location.href = '/views/settings.html?tab=billing';
            }
        };

        if (typeof window.openSubscriptionPlanModal === 'function') {
            launchModal();
        } else {
            const script = document.createElement('script');
            script.src = '/viewmodel/subscription_modal.js?v=20260921';
            script.onload = launchModal;
            script.onerror = launchModal;
            document.head.appendChild(script);
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enforceStudioGuard);
    } else {
        enforceStudioGuard();
    }

    window.enforceStudioGuard = enforceStudioGuard;
    window.isUserProOrAdmin = isUserProOrAdmin;
    window.showSubscriptionPlanPaywall = showSubscriptionPlanPaywall;
})();
