/**
 * XtraPath Subscription Plan Selection Modal
 * Highlights all Pro tools, capabilities, and creator benefits.
 * Offers Monthly (₹99 / $9) and Yearly (₹999 / $99) plans with instant currency switching.
 */

(function () {
    const PLAN_DATA = {
        INR: {
            symbol: '₹',
            monthly: { price: 99, display: '₹99', period: '/ month', note: 'Flexible • Cancel anytime' },
            yearly: { price: 999, display: '₹999', period: '/ year', note: 'Save 16% • 2 Months Free' }
        },
        USD: {
            symbol: '$',
            monthly: { price: 9, display: '$9', period: '/ month', note: 'Flexible • Cancel anytime' },
            yearly: { price: 99, display: '$99', period: '/ year', note: 'Save 16% • 2 Months Free' }
        }
    };

    function detectUserCurrency() {
        try {
            const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
            const lang = (navigator.language || '').toLowerCase();
            if (tz.includes('calcutta') || tz.includes('kolkata') || lang.includes('en-in') || lang.includes('hi')) {
                return 'INR';
            }
        } catch (e) {}
        return 'USD';
    }

    function openSubscriptionPlanModal({ defaultPlan = 'monthly', defaultCurrency = null, isGuardedPage = false } = {}, onUnlocked) {
        let currentCurrency = defaultCurrency || detectUserCurrency();
        let selectedPlan = defaultPlan || 'monthly';

        const existingModal = document.getElementById('xtraSubscriptionPlanModal');
        if (existingModal) existingModal.remove();

        const modalHtml = `
            <div id="xtraSubscriptionPlanModal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(6,10,20,0.9);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;animation:subModalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);">
                <style>
                    @keyframes subModalFadeIn {
                        from { opacity: 0; transform: scale(0.96); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    .sub-plan-box {
                        background: radial-gradient(100% 80% at 50% 0%, rgba(30, 41, 69, 0.98) 0%, rgba(11, 15, 26, 0.99) 100%);
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        border-radius: 24px;
                        max-width: 530px;
                        width: 100%;
                        max-height: 92vh;
                        overflow-y: auto;
                        padding: 26px 22px 20px;
                        color: #fff;
                        box-shadow: 0 35px 90px rgba(0,0,0,0.85), 0 0 35px rgba(99, 102, 241, 0.22);
                        position: relative;
                        box-sizing: border-box;
                    }
                    .sub-plan-box::-webkit-scrollbar { width: 4px; }
                    .sub-plan-box::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 4px; }
                    .sub-plan-card {
                        border: 2px solid rgba(255, 255, 255, 0.08);
                        background: rgba(255, 255, 255, 0.03);
                        border-radius: 16px;
                        padding: 14px 16px;
                        cursor: pointer;
                        transition: all 0.18s ease;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        position: relative;
                    }
                    .sub-plan-card:hover {
                        border-color: rgba(56, 189, 248, 0.4);
                        background: rgba(56, 189, 248, 0.04);
                    }
                    .sub-plan-card.active {
                        border-color: #38bdf8;
                        background: rgba(56, 189, 248, 0.09);
                        box-shadow: 0 0 22px rgba(56, 189, 248, 0.22);
                    }
                    .sub-currency-btn {
                        padding: 5px 12px;
                        border-radius: 99px;
                        font-size: 0.76rem;
                        font-weight: 700;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        background: transparent;
                        color: #94a3b8;
                        cursor: pointer;
                        transition: all 0.15s;
                    }
                    .sub-currency-btn.active {
                        background: #2563eb;
                        color: #fff;
                        border-color: #3b82f6;
                        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
                    }
                    .sub-tool-row {
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        padding: 10px 12px;
                        background: rgba(255, 255, 255, 0.02);
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        border-radius: 12px;
                        transition: background 0.15s;
                    }
                    .sub-tool-row:hover {
                        background: rgba(255, 255, 255, 0.04);
                    }
                    .sub-tool-icon {
                        width: 34px;
                        height: 34px;
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.15rem;
                        flex-shrink: 0;
                    }
                </style>

                <div class="sub-plan-box">
                    <!-- Close button -->
                    <button id="closeSubModalBtn" title="Close" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:#94a3b8;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.15rem;cursor:pointer;transition:all 0.15s;">
                        <i class="ri-close-line"></i>
                    </button>

                    <!-- Top Tag & Title -->
                    <div style="text-align:center;margin-bottom:14px;">
                        <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(234,179,8,0.15);border:1px solid rgba(234,179,8,0.35);color:#facc15;font-size:0.68rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:3px 10px;border-radius:99px;">
                            <i class="ri-flashlight-fill"></i> PRO CREATOR STUDIO
                        </span>
                        <h3 style="font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;margin:8px 0 3px;letter-spacing:-0.02em;color:#fff;">
                            Unlock Full Creator Studio
                        </h3>
                        <p style="color:#94a3b8;font-size:0.83rem;margin:0;line-height:1.45;">
                            All cloud engines, high-speed 4K rendering, LaTeX publishing &amp; creator monetization.
                        </p>
                    </div>

                    <!-- Currency Selector -->
                    <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:14px;">
                        <span style="font-size:0.75rem;color:#64748b;font-weight:600;">Pricing Currency:</span>
                        <button id="subCurrencyInrBtn" class="sub-currency-btn ${currentCurrency === 'INR' ? 'active' : ''}">🇮🇳 INR (₹)</button>
                        <button id="subCurrencyUsdBtn" class="sub-currency-btn ${currentCurrency === 'USD' ? 'active' : ''}">🌐 International ($)</button>
                    </div>

                    <!-- Plan Selection Cards -->
                    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
                        <!-- Monthly Plan -->
                        <div id="planCardMonthly" class="sub-plan-card ${selectedPlan === 'monthly' ? 'active' : ''}">
                            <div>
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <div id="radioMonthly" style="width:16px;height:16px;border-radius:50%;border:2px solid ${selectedPlan === 'monthly' ? '#38bdf8' : '#64748b'};display:flex;align-items:center;justify-content:center;">
                                        <div style="width:8px;height:8px;border-radius:50%;background:${selectedPlan === 'monthly' ? '#38bdf8' : 'transparent'};"></div>
                                    </div>
                                    <span style="font-weight:700;font-size:0.95rem;color:#fff;">Monthly Pass</span>
                                </div>
                                <div id="planNoteMonthly" style="font-size:0.74rem;color:#94a3b8;margin-top:2px;margin-left:24px;">
                                    ${PLAN_DATA[currentCurrency].monthly.note}
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <div id="planPriceMonthly" style="font-size:1.35rem;font-weight:900;color:#fff;letter-spacing:-0.03em;">
                                    ${PLAN_DATA[currentCurrency].monthly.display}
                                    <span id="planPeriodMonthly" style="font-size:0.76rem;color:#94a3b8;font-weight:600;">${PLAN_DATA[currentCurrency].monthly.period}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Yearly Plan -->
                        <div id="planCardYearly" class="sub-plan-card ${selectedPlan === 'yearly' ? 'active' : ''}">
                            <div style="position:absolute;top:-8px;right:14px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:0.6rem;font-weight:800;padding:2px 8px;border-radius:99px;letter-spacing:0.04em;box-shadow:0 2px 8px rgba(16,185,129,0.4);">
                                🌟 2 MONTHS FREE
                            </div>
                            <div>
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <div id="radioYearly" style="width:16px;height:16px;border-radius:50%;border:2px solid ${selectedPlan === 'yearly' ? '#38bdf8' : '#64748b'};display:flex;align-items:center;justify-content:center;">
                                        <div style="width:8px;height:8px;border-radius:50%;background:${selectedPlan === 'yearly' ? '#38bdf8' : 'transparent'};"></div>
                                    </div>
                                    <span style="font-weight:700;font-size:0.95rem;color:#fff;">Annual Membership</span>
                                </div>
                                <div id="planNoteYearly" style="font-size:0.74rem;color:#34d399;margin-top:2px;margin-left:24px;font-weight:600;">
                                    ${PLAN_DATA[currentCurrency].yearly.note}
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <div id="planPriceYearly" style="font-size:1.35rem;font-weight:900;color:#fff;letter-spacing:-0.03em;">
                                    ${PLAN_DATA[currentCurrency].yearly.display}
                                    <span id="planPeriodYearly" style="font-size:0.76rem;color:#94a3b8;font-weight:600;">${PLAN_DATA[currentCurrency].yearly.period}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tools, Capabilities & Creator Benefits Breakdown -->
                    <div style="margin-bottom:18px;">
                        <div style="font-size:0.76rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                            <i class="ri-tools-fill" style="color:#38bdf8;"></i> What You Unlock With Pro
                        </div>

                        <div style="display:flex;flex-direction:column;gap:8px;">
                            <!-- Tool 1: XtraAnim -->
                            <div class="sub-tool-row">
                                <div class="sub-tool-icon" style="background:rgba(59,130,246,0.15);color:#60a5fa;">
                                    <i class="ri-movie-2-line"></i>
                                </div>
                                <div style="flex:1;">
                                    <div style="display:flex;align-items:center;justify-content:space-between;">
                                        <span style="font-size:0.84rem;font-weight:700;color:#fff;">XtraAnim • Cloud Manim &amp; p5.js</span>
                                        <span style="font-size:0.65rem;font-weight:700;color:#38bdf8;background:rgba(56,189,248,0.12);padding:1px 6px;border-radius:4px;">1080p60 &amp; 4K</span>
                                    </div>
                                    <p style="font-size:0.73rem;color:#94a3b8;margin:2px 0 0;line-height:1.4;">
                                        <strong>Benefit:</strong> Build viral 3Blue1Brown mathematical animations directly on our cloud GPUs without needing a high-end local graphics card.
                                    </p>
                                </div>
                            </div>

                            <!-- Tool 2: XtraBook -->
                            <div class="sub-tool-row">
                                <div class="sub-tool-icon" style="background:rgba(16,185,129,0.15);color:#34d399;">
                                    <i class="ri-book-open-line"></i>
                                </div>
                                <div style="flex:1;">
                                    <div style="display:flex;align-items:center;justify-content:space-between;">
                                        <span style="font-size:0.84rem;font-weight:700;color:#fff;">XtraBook • LaTeX &amp; Typst Publishing</span>
                                        <span style="font-size:0.65rem;font-weight:700;color:#34d399;background:rgba(16,185,129,0.12);padding:1px 6px;border-radius:4px;">Instant PDF</span>
                                    </div>
                                    <p style="font-size:0.73rem;color:#94a3b8;margin:2px 0 0;line-height:1.4;">
                                        <strong>Benefit:</strong> Compile complete textbooks, academic lecture notes, and formula sheets into publication-ready PDFs in seconds.
                                    </p>
                                </div>
                            </div>

                            <!-- Tool 3: XtraCover -->
                            <div class="sub-tool-row">
                                <div class="sub-tool-icon" style="background:rgba(168,85,247,0.15);color:#c084fc;">
                                    <i class="ri-book-2-line"></i>
                                </div>
                                <div style="flex:1;">
                                    <div style="display:flex;align-items:center;justify-content:space-between;">
                                        <span style="font-size:0.84rem;font-weight:700;color:#fff;">KDP Cover Studio • Amazon Print Ready</span>
                                        <span style="font-size:0.65rem;font-weight:700;color:#c084fc;background:rgba(168,85,247,0.12);padding:1px 6px;border-radius:4px;">300 DPI CMYK</span>
                                    </div>
                                    <p style="font-size:0.73rem;color:#94a3b8;margin:2px 0 0;line-height:1.4;">
                                        <strong>Benefit:</strong> Automated spine thickness calculation &amp; barcode guides for publishing your paperbacks on Amazon KDP with zero rejections.
                                    </p>
                                </div>
                            </div>

                            <!-- Tool 4: Cartoon Studio -->
                            <div class="sub-tool-row">
                                <div class="sub-tool-icon" style="background:rgba(244,63,94,0.15);color:#fb7185;">
                                    <i class="ri-bear-smile-line"></i>
                                </div>
                                <div style="flex:1;">
                                    <div style="display:flex;align-items:center;justify-content:space-between;">
                                        <span style="font-size:0.84rem;font-weight:700;color:#fff;">Cartoon Studio • Stick Rig &amp; MoCap</span>
                                        <span style="font-size:0.65rem;font-weight:700;color:#fb7185;background:rgba(244,63,94,0.12);padding:1px 6px;border-radius:4px;">Viral Reels</span>
                                    </div>
                                    <p style="font-size:0.73rem;color:#94a3b8;margin:2px 0 0;line-height:1.4;">
                                        <strong>Benefit:</strong> Alan Becker-style stick figure battle arena &amp; chalkboard teacher animator for high-retention YouTube Shorts and Reels.
                                    </p>
                                </div>
                            </div>

                            <!-- Tool 5: ResearchLab & 3D -->
                            <div class="sub-tool-row">
                                <div class="sub-tool-icon" style="background:rgba(6,182,212,0.15);color:#22d3ee;">
                                    <i class="ri-cube-line"></i>
                                </div>
                                <div style="flex:1;">
                                    <div style="display:flex;align-items:center;justify-content:space-between;">
                                        <span style="font-size:0.84rem;font-weight:700;color:#fff;">ResearchLab • Rapier 3D &amp; TikZ Vectors</span>
                                        <span style="font-size:0.65rem;font-weight:700;color:#22d3ee;background:rgba(6,182,212,0.12);padding:1px 6px;border-radius:4px;">WASM 3D</span>
                                    </div>
                                    <p style="font-size:0.73rem;color:#94a3b8;margin:2px 0 0;line-height:1.4;">
                                        <strong>Benefit:</strong> Interactive WebAssembly 3D physics, JSXGraph geometry, TikZ graphics, and audio frequency generators.
                                    </p>
                                </div>
                            </div>

                            <!-- Tool 6: Store Monetization -->
                            <div class="sub-tool-row">
                                <div class="sub-tool-icon" style="background:rgba(234,179,8,0.15);color:#fde047;">
                                    <i class="ri-money-dollar-circle-line"></i>
                                </div>
                                <div style="flex:1;">
                                    <div style="display:flex;align-items:center;justify-content:space-between;">
                                        <span style="font-size:0.84rem;font-weight:700;color:#fff;">Store Monetization &amp; DRM Protection</span>
                                        <span style="font-size:0.65rem;font-weight:700;color:#facc15;background:rgba(234,179,8,0.12);padding:1px 6px;border-radius:4px;">Creator Payouts</span>
                                    </div>
                                    <p style="font-size:0.73rem;color:#94a3b8;margin:2px 0 0;line-height:1.4;">
                                        <strong>Benefit:</strong> Sell your animation source code, templates, and books on the Store with Pay-to-Remix code protection and keep creator revenues.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Subscribe Button -->
                    <button id="btnSubscribePro" style="width:100%;height:50px;background:linear-gradient(135deg,#2563eb,#7c3aed);border:none;border-radius:14px;color:#fff;font-size:0.96rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 20px rgba(99,102,241,0.45);transition:transform 0.15s,box-shadow 0.15s;">
                        <i class="ri-flashlight-fill" style="color:#fde047;"></i> <span id="btnSubscribeText">Subscribe for ${PLAN_DATA[currentCurrency][selectedPlan].display}</span>
                    </button>

                    <!-- Trust Bar -->
                    <div style="display:flex;align-items:center;justify-content:center;gap:14px;font-size:0.72rem;color:#64748b;margin-top:14px;">
                        <span><i class="ri-shield-check-fill" style="color:#10b981;"></i> Secure Payment</span>
                        <span>•</span>
                        <span><i class="ri-flashlight-fill" style="color:#f59e0b;"></i> Instant Studio Access</span>
                        <span>•</span>
                        <span><i class="ri-refresh-line" style="color:#38bdf8;"></i> Cancel Anytime</span>
                    </div>

                    <!-- Free Alternatives Footer -->
                    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);font-size:0.75rem;">
                        <span style="color:#64748b;">Free Options:</span>
                        <a href="/views/xtraArticle.html" style="color:#38bdf8;text-decoration:none;font-weight:600;">Write Free Article</a>
                        <span style="color:#475569;">•</span>
                        <a href="/views/xtraGraph.html" style="color:#38bdf8;text-decoration:none;font-weight:600;">Free Desmos Graph</a>
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
        const btnInr = document.getElementById('subCurrencyInrBtn');
        const btnUsd = document.getElementById('subCurrencyUsdBtn');
        const cardMonthly = document.getElementById('planCardMonthly');
        const cardYearly = document.getElementById('planCardYearly');
        const radioMonthly = document.getElementById('radioMonthly');
        const radioYearly = document.getElementById('radioYearly');
        const btnSubscribe = document.getElementById('btnSubscribePro');
        const btnSubscribeText = document.getElementById('btnSubscribeText');

        const closeModal = () => {
            modal.remove();
            if (isGuardedPage) {
                window.location.href = '/views/explore.html';
            }
        };

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };

        const updateDisplay = () => {
            const curData = PLAN_DATA[currentCurrency];
            document.getElementById('planPriceMonthly').innerHTML = `${curData.monthly.display} <span style="font-size:0.76rem;color:#94a3b8;font-weight:600;">${curData.monthly.period}</span>`;
            document.getElementById('planPriceYearly').innerHTML = `${curData.yearly.display} <span style="font-size:0.76rem;color:#94a3b8;font-weight:600;">${curData.yearly.period}</span>`;
            document.getElementById('planNoteMonthly').textContent = curData.monthly.note;
            document.getElementById('planNoteYearly').textContent = curData.yearly.note;

            btnSubscribeText.textContent = `Subscribe for ${curData[selectedPlan].display} (${selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'})`;

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

        // Currency switcher toggles
        btnInr.onclick = () => {
            currentCurrency = 'INR';
            btnInr.classList.add('active');
            btnUsd.classList.remove('active');
            updateDisplay();
        };

        btnUsd.onclick = () => {
            currentCurrency = 'USD';
            btnUsd.classList.add('active');
            btnInr.classList.remove('active');
            updateDisplay();
        };

        // Plan clicks
        cardMonthly.onclick = () => {
            selectedPlan = 'monthly';
            updateDisplay();
        };

        cardYearly.onclick = () => {
            selectedPlan = 'yearly';
            updateDisplay();
        };

        // Subscribe trigger
        btnSubscribe.onclick = async () => {
            const planKey = selectedPlan === 'yearly' ? 'annual' : 'monthly';
            btnSubscribe.disabled = true;
            const origHtml = btnSubscribe.innerHTML;
            btnSubscribe.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 0.8s linear infinite;"></i> Connecting Gateway…';

            const onPaymentSuccess = () => {
                localStorage.setItem('is_pro', 'true');
                modal.remove();
                if (typeof onUnlocked === 'function') onUnlocked();
                else window.location.reload();
            };

            try {
                if (currentCurrency === 'INR') {
                    // Razorpay: ₹99 (monthly) or ₹999 (yearly)
                    if (window.PaymentManager && typeof window.PaymentManager.openRazorpayCheckout === 'function') {
                        modal.remove();
                        await window.PaymentManager.openRazorpayCheckout(planKey, onPaymentSuccess, 'INR');
                    } else {
                        alert('Payment Gateway is loading. Please try again in a moment.');
                    }
                } else {
                    // International ($9 or $99):
                    const usdAmount = selectedPlan === 'yearly' ? 99.00 : 9.00;
                    if (window.PaymentManager && typeof window.PaymentManager.openRazorpayCheckout === 'function') {
                        modal.remove();
                        await window.PaymentManager.openRazorpayCheckout(planKey, onPaymentSuccess, 'USD', usdAmount);
                    } else if (window.PaymentManager && typeof window.PaymentManager.openNativeInPageCheckout === 'function') {
                        modal.remove();
                        window.PaymentManager.openNativeInPageCheckout({
                            title: `XtraPath Pro (${selectedPlan.toUpperCase()})`,
                            priceUSD: usdAmount,
                            priceINR: selectedPlan === 'yearly' ? 999 : 99,
                            format: 'PRO',
                            planType: planKey
                        }, onPaymentSuccess);
                    } else {
                        window.location.href = '/views/settings.html?tab=billing';
                    }
                }
            } catch (err) {
                console.error('[Subscription Checkout Error]:', err);
            } finally {
                btnSubscribe.disabled = false;
                btnSubscribe.innerHTML = origHtml;
            }
        };
    }

    // Helper to safely open the modal anywhere
    window.openSubscriptionPlanModal = openSubscriptionPlanModal;
})();
