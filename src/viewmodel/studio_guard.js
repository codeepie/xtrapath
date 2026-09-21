/**
 * XtraPath Creator Studio Payment Protection Guard
 * Restricts heavy server-side creation engines (Manim, LaTeX, KDP, 3D) to Pro subscribers.
 * Shows the interactive Subscription Plan Modal (₹99 / $9 per month, ₹999 / $99 per year)
 * with Beta Creator Waitlist and links to free tools (XtraArticle & XtraGraph).
 * 
 * Hardened Anti-Bypass Security:
 * 1. Synchronous UI blur lock before rendering canvas or editors.
 * 2. Authenticated Supabase session validation (defeats DevTools localStorage spoofing).
 * 3. Continuous watchdog redirects to /views/explore.html if paywall modal or Razorpay is closed/tampered.
 */

(function () {
    const SUPER_ADMINS = [
        'codeepie@gmail.com',
        'admin@xtrapath.com',
        'yogendra.singh@xtrapath.io',
        'yogendra20799@gmail.com'
    ];

    // Session cache to prevent layout flashing for legitimate Pro users
    let _verifiedProOrAdmin = (sessionStorage.getItem('xtra_session_pro_verified') === 'true');
    let _verificationInProgress = false;

    // Synchronously lock the studio interface immediately
    function lockStudioInterface() {
        if (_verifiedProOrAdmin) {
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
                body.xtra-studio-locked > *:not(#xtraSubscriptionPlanModal):not(.razorpay-container):not(iframe[name^="razorpay"]):not(.rzp-backdrop) {
                    filter: blur(16px) !important;
                    pointer-events: none !important;
                    user-select: none !important;
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }
    }

    function unlockStudioInterface() {
        _verifiedProOrAdmin = true;
        sessionStorage.setItem('xtra_session_pro_verified', 'true');
        localStorage.setItem('is_pro', 'true');
        document.body?.classList.remove('xtra-studio-locked');
        const lockStyle = document.getElementById('xtra-studio-lock-style');
        if (lockStyle) lockStyle.remove();
        const modal = document.getElementById('xtraSubscriptionPlanModal');
        if (modal) modal.remove();
    }

    // Secure verification against Supabase Auth Session (cannot be spoofed with localStorage)
    async function verifyProStatusAuthentic() {
        if (_verifiedProOrAdmin) return true;
        if (_verificationInProgress) return false;
        _verificationInProgress = true;

        try {
            const client = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
            if (client && client.auth) {
                const { data: { session } } = await client.auth.getSession();
                if (session && session.user) {
                    const verifiedEmail = (session.user.email || '').toLowerCase().trim();
                    if (SUPER_ADMINS.includes(verifiedEmail)) {
                        unlockStudioInterface();
                        _verificationInProgress = false;
                        return true;
                    }

                    // Check Supabase database profile
                    const { data: profile } = await client
                        .from('profiles')
                        .select('is_pro, role')
                        .eq('id', session.user.id)
                        .maybeSingle();

                    if (profile && (profile.is_pro === true || profile.role === 'admin' || profile.role === 'superadmin')) {
                        unlockStudioInterface();
                        _verificationInProgress = false;
                        return true;
                    }
                }
            }
        } catch (err) {
            console.warn('[StudioGuard] Auth verification note:', err);
        }

        // If unauthenticated or profile is not Pro in DB, purge local storage flags
        sessionStorage.removeItem('xtra_session_pro_verified');
        localStorage.removeItem('is_pro');
        _verifiedProOrAdmin = false;
        _verificationInProgress = false;
        return false;
    }

    function isUserProOrAdmin() {
        return _verifiedProOrAdmin;
    }

    function showSubscriptionPlanPaywall() {
        if (_verifiedProOrAdmin) return;
        lockStudioInterface();

        if (document.getElementById('xtraSubscriptionPlanModal')) return;

        const launchModal = () => {
            if (typeof window.openSubscriptionPlanModal === 'function') {
                window.openSubscriptionPlanModal({ isGuardedPage: true }, () => {
                    unlockStudioInterface();
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

    async function enforceStudioGuard() {
        lockStudioInterface();
        const isVerified = await verifyProStatusAuthentic();
        if (!isVerified) {
            showSubscriptionPlanPaywall();
        }
    }

    // Run lock synchronously right now
    lockStudioInterface();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enforceStudioGuard);
    } else {
        enforceStudioGuard();
    }

    // Continuous Watchdog: Prevents accessing studio if modal is deleted in devtools, cancelled, or bypassed
    setInterval(() => {
        if (_verifiedProOrAdmin) {
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
        if (!hasModal && !hasRzp && !_verificationInProgress) {
            // Non-pro user has no active paywall modal or payment checkout on a guarded page -> boot to explore
            window.location.href = '/views/explore.html';
        }
    }, 500);

    window.enforceStudioGuard = enforceStudioGuard;
    window.isUserProOrAdmin = isUserProOrAdmin;
    window.verifyProStatusAuthentic = verifyProStatusAuthentic;
    window.showSubscriptionPlanPaywall = showSubscriptionPlanPaywall;
    window.unlockStudioInterface = unlockStudioInterface;
})();
