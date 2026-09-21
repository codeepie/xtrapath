/**
 * XtraPath Simple & Ultra-Premium Pro Subscription Modal
 * Clean, modern, high-converting design.
 * Automatically adapts currency (₹99 / ₹999 or $9 / $99) based on location.
 */

(function () {
    const PLAN_DATA = {
        INR: {
            symbol: '₹',
            monthly: { price: 99, display: '₹99', period: '/month', billing: 'Billed monthly • Cancel anytime', subtext: 'Flexible monthly access' },
            yearly: { price: 999, display: '₹999', period: '/year', billing: '₹83/mo billed annually • Save 16%', subtext: 'Save 16% • 2 Mos Free' },
            locationLabel: '🇮🇳 Localized Pricing: INR (₹)'
        },
        USD: {
            symbol: '$',
            monthly: { price: 9, display: '$9', period: '/month', billing: 'Billed monthly • Cancel anytime', subtext: 'Flexible monthly access' },
            yearly: { price: 99, display: '$99', period: '/year', billing: '$8.25/mo billed annually • Save 16%', subtext: 'Save 16% • 2 Mos Free' },
            locationLabel: '🌐 Global Pricing: USD ($)'
        }
    };

    function detectUserCurrency() {
        try {
            // 1. Bulletproof check: Indian Standard Time (IST) offset is exactly -330 minutes (UTC+5:30)
            const offset = new Date().getTimezoneOffset();
            if (offset === -330) {
                sessionStorage.setItem('xtra_user_currency', 'INR');
                return 'INR';
            }

            // 2. Browser IANA Timezone check
            const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
            if (
                tz.includes('calcutta') ||
                tz.includes('kolkata') ||
                tz.includes('delhi') ||
                tz.includes('mumbai') ||
                tz.includes('chennai') ||
                tz.includes('asia/calcutta') ||
                tz.includes('asia/kolkata') ||
                tz.includes('india') ||
                tz.includes('ist')
            ) {
                sessionStorage.setItem('xtra_user_currency', 'INR');
                return 'INR';
            }

            // 3. Indian language / locale check
            const langs = [navigator.language, ...(navigator.languages || [])].map(l => (l || '').toLowerCase());
            if (langs.some(l => l.includes('-in') || l === 'hi' || l.startsWith('hi-') || l === 'mr' || l === 'ta' || l === 'te' || l === 'bn' || l === 'gu')) {
                sessionStorage.setItem('xtra_user_currency', 'INR');
                return 'INR';
            }

            // 4. Stored session cache
            const cached = sessionStorage.getItem('xtra_user_currency');
            if (cached === 'INR' || cached === 'USD') return cached;
        } catch (e) {}
        return 'USD';
    }

    function openSubscriptionPlanModal({ defaultPlan = 'yearly', defaultCurrency = null, isGuardedPage = false } = {}, onUnlocked) {
        let currentCurrency = defaultCurrency || detectUserCurrency();
        let selectedPlan = defaultPlan || 'yearly';

        const existingModal = document.getElementById('xtraSubscriptionPlanModal');
        if (existingModal) existingModal.remove();

        const modalHtml = `
            <div id="xtraSubscriptionPlanModal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(3,6,15,0.85);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;animation:premFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);">
                <style>
                    @keyframes premFadeIn {
                        from { opacity: 0; transform: scale(0.96) translateY(8px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }
                    @keyframes premGlowPulse {
                        0%, 100% { opacity: 0.35; transform: scale(1); }
                        50% { opacity: 0.65; transform: scale(1.08); }
                    }
                    .prem-box {
                        background: linear-gradient(180deg, rgba(20, 27, 45, 0.98) 0%, rgba(9, 13, 24, 0.99) 100%);
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        border-radius: 26px;
                        max-width: 480px;
                        width: 100%;
                        max-height: 94vh;
                        overflow-y: auto;
                        padding: 28px 24px 22px;
                        color: #fff;
                        box-shadow: 0 35px 90px -10px rgba(0, 0, 0, 0.9), 0 0 45px rgba(56, 189, 248, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.16);
                        position: relative;
                        box-sizing: border-box;
                    }
                    .prem-box::-webkit-scrollbar { width: 4px; }
                    .prem-box::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
                    
                    /* Ambient Light Orbs */
                    .prem-orb-1 {
                        position: absolute;
                        top: -30px;
                        left: 25%;
                        width: 200px;
                        height: 110px;
                        background: radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, transparent 70%);
                        filter: blur(40px);
                        pointer-events: none;
                        animation: premGlowPulse 6s ease-in-out infinite;
                    }
                    .prem-orb-2 {
                        position: absolute;
                        top: 30px;
                        right: 15%;
                        width: 180px;
                        height: 100px;
                        background: radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%);
                        filter: blur(35px);
                        pointer-events: none;
                        animation: premGlowPulse 7s ease-in-out infinite reverse;
                    }

                    /* Side-by-side Pricing Cards */
                    .prem-price-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 12px;
                        margin-bottom: 18px;
                    }
                    @media (max-width: 420px) {
                        .prem-price-grid { grid-template-columns: 1fr; }
                    }
                    .prem-price-card {
                        border: 2px solid rgba(255, 255, 255, 0.08);
                        background: rgba(255, 255, 255, 0.03);
                        border-radius: 18px;
                        padding: 16px 14px 14px;
                        cursor: pointer;
                        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        position: relative;
                        box-sizing: border-box;
                    }
                    .prem-price-card:hover {
                        border-color: rgba(56, 189, 248, 0.35);
                        background: rgba(56, 189, 248, 0.04);
                        transform: translateY(-2px);
                    }
                    .prem-price-card.active {
                        border-color: #38bdf8;
                        background: linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(99, 102, 241, 0.07) 100%);
                        box-shadow: 0 0 24px rgba(56, 189, 248, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15);
                        transform: translateY(-2px);
                    }

                    /* Checkout Submit Button */
                    .prem-submit-btn {
                        width: 100%;
                        height: 52px;
                        background: linear-gradient(135deg, #2563eb, #6366f1, #8b5cf6);
                        background-size: 200% 100%;
                        border: none;
                        border-radius: 15px;
                        color: #fff;
                        font-size: 1.02rem;
                        font-weight: 800;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        box-shadow: 0 8px 25px rgba(99, 102, 241, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.28);
                        transition: transform 0.15s, box-shadow 0.15s;
                    }
                    .prem-submit-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 12px 32px rgba(99, 102, 241, 0.58), inset 0 1px 0 rgba(255, 255, 255, 0.38);
                    }
                    .prem-submit-btn:active {
                        transform: translateY(1px);
                    }
                </style>

                <div class="prem-box">
                    <div class="prem-orb-1"></div>
                    <div class="prem-orb-2"></div>

                    <!-- Close button -->
                    <button id="closeSubModalBtn" title="Close" style="position:absolute;top:18px;right:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.15rem;cursor:pointer;transition:all 0.18s;z-index:10;">
                        <i class="ri-close-line"></i>
                    </button>

                    <!-- Header -->
                    <div style="text-align:center;margin-bottom:14px;position:relative;z-index:1;">
                        <div style="display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg, rgba(234,179,8,0.18) 0%, rgba(245,158,11,0.08) 100%);border:1px solid rgba(234,179,8,0.35);color:#facc15;font-size:0.68rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:999px;box-shadow:0 0 14px rgba(234,179,8,0.18);">
                            <i class="ri-sparkling-2-fill"></i> PRO CREATOR ACCESS
                        </div>
                        <h2 style="font-family:'Outfit',sans-serif;font-size:1.6rem;font-weight:800;margin:8px 0 4px;letter-spacing:-0.03em;background:linear-gradient(180deg,#FFFFFF 0%,#CBD5E1 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
                            Unlock Full Studio Access
                        </h2>
                        <p style="color:#94a3b8;font-size:0.82rem;margin:0;line-height:1.45;">
                            Unlimited local agent renders, full studio editing, 3D simulations &amp; KDP publishing.
                        </p>
                    </div>

                    <!-- Automatic Location Badge -->
                    <div style="display:flex;align-items:center;justify-content:center;margin-bottom:16px;position:relative;z-index:1;">
                        <div id="subGeoLocationBadge" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:4px 14px;border-radius:999px;font-size:0.72rem;color:#94a3b8;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);">
                            <i class="ri-map-pin-2-fill" style="color:#38bdf8;"></i>
                            <span id="subGeoLocationText">${PLAN_DATA[currentCurrency].locationLabel}</span>
                        </div>
                    </div>

                    <!-- Side-by-Side Pricing Cards -->
                    <div class="prem-price-grid" style="position:relative;z-index:1;">
                        <!-- Yearly Plan (Featured) -->
                        <div id="planCardYearly" class="prem-price-card ${selectedPlan === 'yearly' ? 'active' : ''}">
                            <div style="position:absolute;top:-9px;right:12px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:0.56rem;font-weight:800;padding:2px 7px;border-radius:999px;letter-spacing:0.05em;box-shadow:0 3px 8px rgba(16,185,129,0.4);text-transform:uppercase;">
                                🌟 2 MOS FREE
                            </div>
                            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;">
                                <div style="display:flex;align-items:center;gap:7px;">
                                    <div id="radioYearly" style="width:16px;height:16px;border-radius:50%;border:2px solid ${selectedPlan === 'yearly' ? '#38bdf8' : '#64748b'};display:flex;align-items:center;justify-content:center;transition:all 0.2s;">
                                        <div style="width:8px;height:8px;border-radius:50%;background:${selectedPlan === 'yearly' ? '#38bdf8' : 'transparent'};"></div>
                                    </div>
                                    <span style="font-weight:800;font-size:0.92rem;color:#fff;">Annual</span>
                                </div>
                                <span style="font-size:0.58rem;background:rgba(56,189,248,0.15);color:#38bdf8;padding:1px 5px;border-radius:4px;font-weight:700;">BEST VALUE</span>
                            </div>
                            <div>
                                <div id="planPriceYearly" style="font-size:1.55rem;font-weight:900;color:#fff;letter-spacing:-0.03em;">
                                    ${PLAN_DATA[currentCurrency].yearly.display}
                                    <span id="planPeriodYearly" style="font-size:0.75rem;color:#94a3b8;font-weight:600;">${PLAN_DATA[currentCurrency].yearly.period}</span>
                                </div>
                                <div id="planNoteYearly" style="font-size:0.7rem;color:#34d399;margin-top:2px;font-weight:600;">
                                    ${PLAN_DATA[currentCurrency].yearly.subtext}
                                </div>
                            </div>
                        </div>

                        <!-- Monthly Plan -->
                        <div id="planCardMonthly" class="prem-price-card ${selectedPlan === 'monthly' ? 'active' : ''}">
                            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;">
                                <div style="display:flex;align-items:center;gap:7px;">
                                    <div id="radioMonthly" style="width:16px;height:16px;border-radius:50%;border:2px solid ${selectedPlan === 'monthly' ? '#38bdf8' : '#64748b'};display:flex;align-items:center;justify-content:center;transition:all 0.2s;">
                                        <div style="width:8px;height:8px;border-radius:50%;background:${selectedPlan === 'monthly' ? '#38bdf8' : 'transparent'};"></div>
                                    </div>
                                    <span style="font-weight:800;font-size:0.92rem;color:#fff;">Monthly</span>
                                </div>
                                <span style="font-size:0.58rem;background:rgba(255,255,255,0.06);color:#94a3b8;padding:1px 5px;border-radius:4px;font-weight:600;">FLEXIBLE</span>
                            </div>
                            <div>
                                <div id="planPriceMonthly" style="font-size:1.55rem;font-weight:900;color:#fff;letter-spacing:-0.03em;">
                                    ${PLAN_DATA[currentCurrency].monthly.display}
                                    <span id="planPeriodMonthly" style="font-size:0.75rem;color:#94a3b8;font-weight:600;">${PLAN_DATA[currentCurrency].monthly.period}</span>
                                </div>
                                <div id="planNoteMonthly" style="font-size:0.7rem;color:#94a3b8;margin-top:2px;">
                                    ${PLAN_DATA[currentCurrency].monthly.subtext}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Clean Premium Feature Highlights -->
                    <div style="background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:13px 15px;margin-bottom:18px;display:flex;flex-direction:column;gap:9px;position:relative;z-index:1;">
                        <div style="display:flex;align-items:center;gap:10px;font-size:0.8rem;color:#e2e8f0;">
                            <i class="ri-checkbox-circle-fill" style="color:#10b981;font-size:1.05rem;flex-shrink:0;"></i>
                            <span><strong>Unlimited Local Agent Renders:</strong> Manim &amp; Publisher revisions</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;font-size:0.8rem;color:#e2e8f0;">
                            <i class="ri-checkbox-circle-fill" style="color:#10b981;font-size:1.05rem;flex-shrink:0;"></i>
                            <span><strong>1-Click Remix &amp; Source Code:</strong> Edit, fork &amp; run any STEM creation</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;font-size:0.8rem;color:#e2e8f0;">
                            <i class="ri-checkbox-circle-fill" style="color:#10b981;font-size:1.05rem;flex-shrink:0;"></i>
                            <span><strong>Physics 3D, TikZ &amp; Math Studio:</strong> WASM Rapier &amp; LaTeX plots</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;font-size:0.8rem;color:#e2e8f0;">
                            <i class="ri-checkbox-circle-fill" style="color:#10b981;font-size:1.05rem;flex-shrink:0;"></i>
                            <span><strong>Amazon KDP Ready Exports:</strong> Dual-column book &amp; 300 DPI covers</span>
                        </div>
                    </div>

                    <!-- Main Checkout Button -->
                    <button id="btnSubscribePro" class="prem-submit-btn">
                        <i class="ri-flashlight-fill" style="color:#fde047;"></i> <span id="btnSubscribeText">Subscribe for ${PLAN_DATA[currentCurrency][selectedPlan].display} ${PLAN_DATA[currentCurrency][selectedPlan].period}</span>
                    </button>

                    <!-- Trust Bar -->
                    <div style="display:flex;align-items:center;justify-content:center;gap:14px;font-size:0.72rem;color:#64748b;margin-top:13px;">
                        <span><i class="ri-shield-check-fill" style="color:#10b981;"></i> 256-Bit SSL Encrypted</span>
                        <span>•</span>
                        <span><i class="ri-flashlight-fill" style="color:#f59e0b;"></i> Instant Activation</span>
                        <span>•</span>
                        <span><i class="ri-refresh-line" style="color:#38bdf8;"></i> Cancel Anytime</span>
                    </div>

                    <!-- Free Alternatives Footer -->
                    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);font-size:0.75rem;">
                        <span style="color:#64748b;">Free Tools:</span>
                        <a href="/views/xtraArticle.html" style="color:#38bdf8;text-decoration:none;font-weight:700;transition:color 0.15s;">Write Free Article</a>
                        <span style="color:#475569;">•</span>
                        <a href="/views/xtraGraph.html" style="color:#38bdf8;text-decoration:none;font-weight:700;transition:color 0.15s;">Free Desmos Graph</a>
                        <span style="color:#475569;">•</span>
                        <button id="subModalCancelBtn" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:0.75rem;padding:0;text-decoration:underline;">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('xtraSubscriptionPlanModal');
        const closeBtn = document.getElementById('closeSubModalBtn');
        const cancelBtn = document.getElementById('subModalCancelBtn');
        const cardMonthly = document.getElementById('planCardMonthly');
        const cardYearly = document.getElementById('planCardYearly');
        const radioMonthly = document.getElementById('radioMonthly');
        const radioYearly = document.getElementById('radioYearly');
        const btnSubscribe = document.getElementById('btnSubscribePro');
        const btnSubscribeText = document.getElementById('btnSubscribeText');
        const geoText = document.getElementById('subGeoLocationText');

        const guardedPages = ['xtraanim', 'xtrabook', 'xtracover', 'researchlabeditor'];
        const currentPath = (window.location.pathname || '').toLowerCase();
        const isActuallyGuardedPage = Boolean(isGuardedPage || guardedPages.some(p => currentPath.includes(p)));

        const closeModal = () => {
            if (isActuallyGuardedPage && !window.isUserProOrAdmin?.()) {
                window.location.href = '/views/explore.html';
                return;
            }
            modal.remove();
        };

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };

        const updateDisplay = () => {
            const curData = PLAN_DATA[currentCurrency];
            const priceMonthEl = document.getElementById('planPriceMonthly');
            const priceYearEl = document.getElementById('planPriceYearly');
            const noteMonthEl = document.getElementById('planNoteMonthly');
            const noteYearEl = document.getElementById('planNoteYearly');
            const geoTextEl = document.getElementById('subGeoLocationText');
            const subTextEl = document.getElementById('btnSubscribeText');

            if (priceMonthEl) priceMonthEl.innerHTML = `${curData.monthly.display} <span style="font-size:0.75rem;color:#94a3b8;font-weight:600;">${curData.monthly.period}</span>`;
            if (priceYearEl) priceYearEl.innerHTML = `${curData.yearly.display} <span style="font-size:0.75rem;color:#94a3b8;font-weight:600;">${curData.yearly.period}</span>`;
            if (noteMonthEl) noteMonthEl.textContent = curData.monthly.subtext;
            if (noteYearEl) noteYearEl.textContent = curData.yearly.subtext;
            if (geoTextEl) geoTextEl.textContent = curData.locationLabel;

            const targetBtnText = `Subscribe for ${curData[selectedPlan].display} ${curData[selectedPlan].period}`;
            if (subTextEl) {
                subTextEl.textContent = targetBtnText;
            } else if (btnSubscribe) {
                btnSubscribe.innerHTML = `<i class="ri-flashlight-fill" style="color:#fde047;"></i> <span id="btnSubscribeText">${targetBtnText}</span>`;
            }

            // Card highlight states
            if (selectedPlan === 'monthly') {
                cardMonthly.classList.add('active');
                cardYearly.classList.remove('active');
                radioMonthly.style.borderColor = '#38bdf8';
                radioMonthly.firstElementChild.style.background = '#38bdf8';
                radioYearly.style.borderColor = '#64748b';
                radioYearly.firstElementChild.style.background = 'transparent';
            } else {
                cardYearly.classList.add('active');
                cardMonthly.classList.remove('active');
                radioYearly.style.borderColor = '#38bdf8';
                radioYearly.firstElementChild.style.background = '#38bdf8';
                radioMonthly.style.borderColor = '#64748b';
                radioMonthly.firstElementChild.style.background = 'transparent';
            }
        };

        // Async geo location check (updates only when valid edge country is detected)
        fetch('/api/geo')
            .then(res => res.json())
            .then(geo => {
                if (geo && geo.currency && geo.country && geo.country !== 'UNKNOWN' && !defaultCurrency) {
                    if (geo.currency !== currentCurrency) {
                        currentCurrency = geo.currency;
                        sessionStorage.setItem('xtra_user_currency', currentCurrency);
                        updateDisplay();
                    }
                }
            })
            .catch(() => {});

        const selectPlan = (plan) => {
            selectedPlan = (plan === 'monthly') ? 'monthly' : 'yearly';
            updateDisplay();
        };

        cardMonthly.onclick = () => selectPlan('monthly');
        cardYearly.onclick = () => selectPlan('yearly');
        radioMonthly.onclick = (e) => { e.stopPropagation(); selectPlan('monthly'); };
        radioYearly.onclick = (e) => { e.stopPropagation(); selectPlan('yearly'); };

        // Subscribe trigger
        btnSubscribe.onclick = async () => {
            const isMonthly = (selectedPlan === 'monthly');
            const planKey = isMonthly ? 'monthly' : 'annual';
            const priceINR = isMonthly ? 99 : 999;
            const priceUSD = isMonthly ? 9.00 : 99.00;

            btnSubscribe.disabled = true;
            const origHtml = btnSubscribe.innerHTML;
            btnSubscribe.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 0.8s linear infinite;"></i> Connecting Gateway…';

            const onPaymentSuccess = () => {
                sessionStorage.setItem('xtra_session_pro_verified', 'true');
                localStorage.setItem('is_pro', 'true');
                document.body?.classList.remove('xtra-studio-locked');
                modal.remove();
                if (typeof onUnlocked === 'function') onUnlocked();
                else window.location.reload();
            };

            const onPaymentCancelled = () => {
                btnSubscribe.disabled = false;
                btnSubscribe.innerHTML = origHtml;
                modal.style.display = 'flex';
                modal.style.visibility = 'visible';
                updateDisplay();

                // Display payment cancelled notification inside modal
                let alertEl = document.getElementById('subPaymentNotice');
                if (!alertEl) {
                    alertEl = document.createElement('div');
                    alertEl.id = 'subPaymentNotice';
                    alertEl.style.cssText = 'background:rgba(239,68,68,0.18);border:1px solid rgba(239,68,68,0.4);color:#fca5a5;padding:10px 14px;border-radius:10px;margin-bottom:12px;font-size:0.76rem;font-weight:600;display:flex;align-items:center;gap:8px;position:relative;z-index:2;animation:premFadeIn 0.2s ease;';
                    const targetParent = document.querySelector('.prem-box');
                    const locBadge = document.getElementById('subGeoLocationBadge')?.parentElement;
                    if (targetParent && locBadge) {
                        targetParent.insertBefore(alertEl, locBadge.nextSibling);
                    }
                }
                alertEl.innerHTML = '<i class="ri-error-warning-fill" style="color:#ef4444;font-size:1.1rem;flex-shrink:0;"></i> <span>Payment was cancelled. A Pro subscription is required to unlock this studio.</span>';
            };

            try {
                // Keep modal in DOM, temporarily hide while gateway overlay is up
                modal.style.visibility = 'hidden';

                if (currentCurrency === 'INR') {
                    // Razorpay: ₹99 (monthly) or ₹999 (yearly)
                    if (window.PaymentManager && typeof window.PaymentManager.openRazorpayCheckout === 'function') {
                        await window.PaymentManager.openRazorpayCheckout(planKey, onPaymentSuccess, 'INR', null, onPaymentCancelled, priceINR);
                    } else {
                        modal.style.visibility = 'visible';
                        btnSubscribe.disabled = false;
                        btnSubscribe.innerHTML = origHtml;
                        alert('Payment Gateway is loading. Please try again in a moment.');
                    }
                } else {
                    // International ($9 or $99):
                    if (window.PaymentManager && typeof window.PaymentManager.openRazorpayCheckout === 'function') {
                        await window.PaymentManager.openRazorpayCheckout(planKey, onPaymentSuccess, 'USD', priceUSD, onPaymentCancelled, priceUSD);
                    } else if (window.PaymentManager && typeof window.PaymentManager.openNativeInPageCheckout === 'function') {
                        window.PaymentManager.openNativeInPageCheckout({
                            title: `XtraPath Pro (${selectedPlan.toUpperCase()})`,
                            priceUSD: priceUSD,
                            priceINR: priceINR,
                            format: 'PRO',
                            planType: planKey
                        }, onPaymentSuccess, onPaymentCancelled);
                    } else {
                        window.location.href = '/views/settings.html?tab=billing';
                    }
                }
            } catch (err) {
                console.error('[Subscription Checkout Error]:', err);
                onPaymentCancelled();
            }
        };
    }

    // Helper to safely open the modal anywhere
    window.openSubscriptionPlanModal = openSubscriptionPlanModal;
})();
