/**
 * XtraPath Ultra-Premium Pro Subscription Modal
 * World-class glassmorphic design inspired by Linear & Raycast Pro.
 * Features Monthly (₹99 / $9) & Annual (₹999 / $99) plans, segmented currency switcher,
 * rich engine capabilities grid, and interactive checkout triggers.
 */

(function () {
    const PLAN_DATA = {
        INR: {
            symbol: '₹',
            monthly: { price: 99, display: '₹99', period: '/month', billing: 'Billed monthly • Cancel anytime', tag: 'Standard' },
            yearly: { price: 999, display: '₹999', period: '/year', billing: '₹83/mo billed annually • Save 16%', tag: 'Best Value' }
        },
        USD: {
            symbol: '$',
            monthly: { price: 9, display: '$9', period: '/month', billing: 'Billed monthly • Cancel anytime', tag: 'Standard' },
            yearly: { price: 99, display: '$99', period: '/year', billing: '$8.25/mo billed annually • Save 16%', tag: 'Best Value' }
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

    function openSubscriptionPlanModal({ defaultPlan = 'yearly', defaultCurrency = null, isGuardedPage = false } = {}, onUnlocked) {
        let currentCurrency = defaultCurrency || detectUserCurrency();
        let selectedPlan = defaultPlan || 'yearly';

        const existingModal = document.getElementById('xtraSubscriptionPlanModal');
        if (existingModal) existingModal.remove();

        const modalHtml = `
            <div id="xtraSubscriptionPlanModal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(4,7,15,0.85);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;animation:premFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
                <style>
                    @keyframes premFadeIn {
                        from { opacity: 0; transform: scale(0.96) translateY(12px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }
                    @keyframes premGlowPulse {
                        0%, 100% { opacity: 0.4; transform: scale(1); }
                        50% { opacity: 0.7; transform: scale(1.08); }
                    }
                    @keyframes shimmerBtn {
                        0% { background-position: -200% 0; }
                        100% { background-position: 200% 0; }
                    }
                    .prem-box {
                        background: linear-gradient(180deg, rgba(26, 35, 60, 0.95) 0%, rgba(10, 14, 26, 0.98) 100%);
                        border: 1px solid rgba(255, 255, 255, 0.14);
                        border-radius: 28px;
                        max-width: 550px;
                        width: 100%;
                        max-height: 92vh;
                        overflow-y: auto;
                        padding: 28px 24px 22px;
                        color: #fff;
                        box-shadow: 0 40px 100px -15px rgba(0, 0, 0, 0.9), 0 0 50px rgba(99, 102, 241, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.2);
                        position: relative;
                        box-sizing: border-box;
                    }
                    .prem-box::-webkit-scrollbar { width: 4px; }
                    .prem-box::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
                    
                    /* Ambient Light Orbs */
                    .prem-orb-1 {
                        position: absolute;
                        top: -40px;
                        left: 20%;
                        width: 220px;
                        height: 120px;
                        background: radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, transparent 70%);
                        filter: blur(40px);
                        pointer-events: none;
                        animation: premGlowPulse 6s ease-in-out infinite;
                    }
                    .prem-orb-2 {
                        position: absolute;
                        top: 40px;
                        right: 10%;
                        width: 180px;
                        height: 100px;
                        background: radial-gradient(circle, rgba(236, 72, 153, 0.35) 0%, transparent 70%);
                        filter: blur(35px);
                        pointer-events: none;
                        animation: premGlowPulse 7s ease-in-out infinite reverse;
                    }

                    /* Currency Segmented Control */
                    .prem-segmented-ctrl {
                        display: inline-flex;
                        background: rgba(0, 0, 0, 0.45);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 999px;
                        padding: 3px;
                        gap: 2px;
                        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
                    }
                    .prem-seg-btn {
                        padding: 6px 14px;
                        border-radius: 999px;
                        font-size: 0.76rem;
                        font-weight: 700;
                        border: none;
                        background: transparent;
                        color: #94a3b8;
                        cursor: pointer;
                        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .prem-seg-btn.active {
                        background: linear-gradient(135deg, #2563eb, #3b82f6);
                        color: #fff;
                        box-shadow: 0 2px 10px rgba(37, 99, 235, 0.5);
                    }

                    /* Plan Option Cards */
                    .prem-plan-card {
                        border: 2px solid rgba(255, 255, 255, 0.08);
                        background: rgba(255, 255, 255, 0.03);
                        border-radius: 18px;
                        padding: 16px 18px;
                        cursor: pointer;
                        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        position: relative;
                    }
                    .prem-plan-card:hover {
                        border-color: rgba(56, 189, 248, 0.35);
                        background: rgba(56, 189, 248, 0.04);
                        transform: translateY(-1px);
                    }
                    .prem-plan-card.active {
                        border-color: #38bdf8;
                        background: linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%);
                        box-shadow: 0 0 26px rgba(56, 189, 248, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.15);
                    }

                    /* Tool Benefit Rows */
                    .prem-tool-item {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 9px 12px;
                        background: rgba(255, 255, 255, 0.025);
                        border: 1px solid rgba(255, 255, 255, 0.06);
                        border-radius: 13px;
                        transition: background 0.15s, border-color 0.15s;
                    }
                    .prem-tool-item:hover {
                        background: rgba(255, 255, 255, 0.05);
                        border-color: rgba(255, 255, 255, 0.12);
                    }
                    .prem-icon-box {
                        width: 36px;
                        height: 36px;
                        border-radius: 11px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.18rem;
                        flex-shrink: 0;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    }
                    .prem-pill-badge {
                        font-size: 0.62rem;
                        font-weight: 800;
                        letter-spacing: 0.04em;
                        text-transform: uppercase;
                        padding: 2px 7px;
                        border-radius: 6px;
                    }

                    /* Checkout Submit Button */
                    .prem-submit-btn {
                        width: 100%;
                        height: 52px;
                        background: linear-gradient(135deg, #2563eb, #6366f1, #9333ea);
                        background-size: 200% 100%;
                        border: none;
                        border-radius: 15px;
                        color: #fff;
                        font-size: 1rem;
                        font-weight: 800;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        box-shadow: 0 8px 25px rgba(99, 102, 241, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3);
                        transition: transform 0.15s, box-shadow 0.15s;
                    }
                    .prem-submit-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 10px 32px rgba(99, 102, 241, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
                    }
                    .prem-submit-btn:active {
                        transform: translateY(1px);
                    }
                </style>

                <div class="prem-box">
                    <div class="prem-orb-1"></div>
                    <div class="prem-orb-2"></div>

                    <!-- Close button -->
                    <button id="closeSubModalBtn" title="Close" style="position:absolute;top:18px;right:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;cursor:pointer;transition:all 0.18s;z-index:10;">
                        <i class="ri-close-line"></i>
                    </button>

                    <!-- Header Banner -->
                    <div style="text-align:center;margin-bottom:18px;position:relative;z-index:1;">
                        <div style="display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg, rgba(234,179,8,0.2) 0%, rgba(245,158,11,0.1) 100%);border:1px solid rgba(234,179,8,0.4);color:#facc15;font-size:0.7rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:999px;box-shadow:0 0 16px rgba(234,179,8,0.2);">
                            <i class="ri-sparkling-2-fill"></i> PRO CREATOR STUDIO PASS
                        </div>
                        <h2 style="font-family:'Outfit',sans-serif;font-size:1.65rem;font-weight:800;margin:10px 0 4px;letter-spacing:-0.03em;background:linear-gradient(180deg,#FFFFFF 0%,#CBD5E1 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
                            Unlock All Creator Engines
                        </h2>
                        <p style="color:#94a3b8;font-size:0.84rem;margin:0;line-height:1.5;">
                            Render 4K Manim animations, publish LaTeX books &amp; monetize on the digital store.
                        </p>
                    </div>

                    <!-- Currency Segmented Switcher -->
                    <div style="display:flex;align-items:center;justify-content:center;margin-bottom:18px;position:relative;z-index:1;">
                        <div class="prem-segmented-ctrl">
                            <button id="subCurrencyInrBtn" class="prem-seg-btn ${currentCurrency === 'INR' ? 'active' : ''}">
                                <span>🇮🇳</span> INR (₹)
                            </button>
                            <button id="subCurrencyUsdBtn" class="prem-seg-btn ${currentCurrency === 'USD' ? 'active' : ''}">
                                <span>🌐</span> Global ($)
                            </button>
                        </div>
                    </div>

                    <!-- Tier Cards Selection -->
                    <div style="display:flex;flex-direction:column;gap:11px;margin-bottom:20px;position:relative;z-index:1;">
                        <!-- Yearly Plan (Recommended) -->
                        <div id="planCardYearly" class="prem-plan-card ${selectedPlan === 'yearly' ? 'active' : ''}">
                            <div style="position:absolute;top:-10px;right:18px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:0.62rem;font-weight:800;padding:3px 9px;border-radius:999px;letter-spacing:0.05em;box-shadow:0 3px 10px rgba(16,185,129,0.45);text-transform:uppercase;">
                                🌟 2 MONTHS FREE • SAVE 16%
                            </div>
                            <div style="display:flex;align-items:center;gap:12px;">
                                <div id="radioYearly" style="width:18px;height:18px;border-radius:50%;border:2px solid ${selectedPlan === 'yearly' ? '#38bdf8' : '#64748b'};display:flex;align-items:center;justify-content:center;transition:all 0.2s;">
                                    <div style="width:9px;height:9px;border-radius:50%;background:${selectedPlan === 'yearly' ? '#38bdf8' : 'transparent'};"></div>
                                </div>
                                <div>
                                    <div style="display:flex;align-items:center;gap:6px;">
                                        <span style="font-weight:800;font-size:0.98rem;color:#fff;">Annual Membership</span>
                                        <span style="font-size:0.62rem;background:rgba(56,189,248,0.15);color:#38bdf8;padding:1px 6px;border-radius:4px;font-weight:700;">POPULAR</span>
                                    </div>
                                    <div id="planNoteYearly" style="font-size:0.75rem;color:#34d399;margin-top:2px;font-weight:600;">
                                        ${PLAN_DATA[currentCurrency].yearly.billing}
                                    </div>
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <div id="planPriceYearly" style="font-size:1.45rem;font-weight:900;color:#fff;letter-spacing:-0.03em;">
                                    ${PLAN_DATA[currentCurrency].yearly.display}
                                    <span id="planPeriodYearly" style="font-size:0.78rem;color:#94a3b8;font-weight:600;">${PLAN_DATA[currentCurrency].yearly.period}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Monthly Plan -->
                        <div id="planCardMonthly" class="prem-plan-card ${selectedPlan === 'monthly' ? 'active' : ''}">
                            <div style="display:flex;align-items:center;gap:12px;">
                                <div id="radioMonthly" style="width:18px;height:18px;border-radius:50%;border:2px solid ${selectedPlan === 'monthly' ? '#38bdf8' : '#64748b'};display:flex;align-items:center;justify-content:center;transition:all 0.2s;">
                                    <div style="width:9px;height:9px;border-radius:50%;background:${selectedPlan === 'monthly' ? '#38bdf8' : 'transparent'};"></div>
                                </div>
                                <div>
                                    <span style="font-weight:800;font-size:0.98rem;color:#fff;">Monthly Pass</span>
                                    <div id="planNoteMonthly" style="font-size:0.75rem;color:#94a3b8;margin-top:2px;">
                                        ${PLAN_DATA[currentCurrency].monthly.billing}
                                    </div>
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <div id="planPriceMonthly" style="font-size:1.45rem;font-weight:900;color:#fff;letter-spacing:-0.03em;">
                                    ${PLAN_DATA[currentCurrency].monthly.display}
                                    <span id="planPeriodMonthly" style="font-size:0.78rem;color:#94a3b8;font-weight:600;">${PLAN_DATA[currentCurrency].monthly.period}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tools, Capabilities & Creator Benefits Breakdown -->
                    <div style="margin-bottom:20px;position:relative;z-index:1;">
                        <div style="font-size:0.74rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
                            <i class="ri-flashlight-line" style="color:#facc15;"></i> Included Pro Cloud Engines &amp; Capabilities
                        </div>

                        <div style="display:flex;flex-direction:column;gap:7px;">
                            <!-- Tool 1: XtraAnim -->
                            <div class="prem-tool-item">
                                <div class="prem-icon-box" style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#93c5fd;">
                                    <i class="ri-movie-2-line"></i>
                                </div>
                                <div style="flex:1;min-width:0;">
                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                        <span style="font-size:0.86rem;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">XtraAnim • Cloud Manim &amp; p5.js</span>
                                        <span class="prem-pill-badge" style="background:rgba(56,189,248,0.15);color:#38bdf8;">1080p60 / 4K</span>
                                    </div>
                                    <div style="font-size:0.73rem;color:#cbd5e1;margin-top:1px;line-height:1.4;">
                                        <strong>Benefit:</strong> Cloud-rendered 3Blue1Brown animations without burning your local GPU.
                                    </div>
                                </div>
                            </div>

                            <!-- Tool 2: XtraBook -->
                            <div class="prem-tool-item">
                                <div class="prem-icon-box" style="background:linear-gradient(135deg,#064e3b,#10b981);color:#6ee7b7;">
                                    <i class="ri-book-open-line"></i>
                                </div>
                                <div style="flex:1;min-width:0;">
                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                        <span style="font-size:0.86rem;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">XtraBook • LaTeX &amp; Typst Publishing</span>
                                        <span class="prem-pill-badge" style="background:rgba(16,185,129,0.15);color:#34d399;">Instant PDF</span>
                                    </div>
                                    <div style="font-size:0.73rem;color:#cbd5e1;margin-top:1px;line-height:1.4;">
                                        <strong>Benefit:</strong> Complete academic textbook compiler &amp; formula layouts in seconds.
                                    </div>
                                </div>
                            </div>

                            <!-- Tool 3: XtraCover -->
                            <div class="prem-tool-item">
                                <div class="prem-icon-box" style="background:linear-gradient(135deg,#581c87,#a855f7);color:#d8b4fe;">
                                    <i class="ri-book-2-line"></i>
                                </div>
                                <div style="flex:1;min-width:0;">
                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                        <span style="font-size:0.86rem;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">KDP Cover Studio • Amazon Print Ready</span>
                                        <span class="prem-pill-badge" style="background:rgba(168,85,247,0.15);color:#c084fc;">300 DPI CMYK</span>
                                    </div>
                                    <div style="font-size:0.73rem;color:#cbd5e1;margin-top:1px;line-height:1.4;">
                                        <strong>Benefit:</strong> Auto-spine thickness &amp; ISBN barcode guides for zero KDP print rejections.
                                    </div>
                                </div>
                            </div>

                            <!-- Tool 4: Cartoon Studio -->
                            <div class="prem-tool-item">
                                <div class="prem-icon-box" style="background:linear-gradient(135deg,#881337,#f43f5e);color:#fda4af;">
                                    <i class="ri-bear-smile-line"></i>
                                </div>
                                <div style="flex:1;min-width:0;">
                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                        <span style="font-size:0.86rem;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Cartoon Studio • Stick Rig &amp; MoCap</span>
                                        <span class="prem-pill-badge" style="background:rgba(244,63,94,0.15);color:#fb7185;">Viral Shorts</span>
                                    </div>
                                    <div style="font-size:0.73rem;color:#cbd5e1;margin-top:1px;line-height:1.4;">
                                        <strong>Benefit:</strong> Alan Becker-style combat physics &amp; teacher animator for high-reach social reels.
                                    </div>
                                </div>
                            </div>

                            <!-- Tool 5: ResearchLab & 3D -->
                            <div class="prem-tool-item">
                                <div class="prem-icon-box" style="background:linear-gradient(135deg,#164e63,#06b6d4);color:#67e8f9;">
                                    <i class="ri-cube-line"></i>
                                </div>
                                <div style="flex:1;min-width:0;">
                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                        <span style="font-size:0.86rem;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">ResearchLab • Rapier 3D &amp; TikZ Vectors</span>
                                        <span class="prem-pill-badge" style="background:rgba(6,182,212,0.15);color:#22d3ee;">WASM 3D</span>
                                    </div>
                                    <div style="font-size:0.73rem;color:#cbd5e1;margin-top:1px;line-height:1.4;">
                                        <strong>Benefit:</strong> WebAssembly rigid body physics simulations &amp; vector plots embeddable anywhere.
                                    </div>
                                </div>
                            </div>

                            <!-- Tool 6: Store Monetization -->
                            <div class="prem-tool-item">
                                <div class="prem-icon-box" style="background:linear-gradient(135deg,#713f12,#eab308);color:#fef08a;">
                                    <i class="ri-money-dollar-circle-line"></i>
                                </div>
                                <div style="flex:1;min-width:0;">
                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                        <span style="font-size:0.86rem;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Store Marketplace &amp; DRM Protection</span>
                                        <span class="prem-pill-badge" style="background:rgba(234,179,8,0.15);color:#fde047;">Keep Earnings</span>
                                    </div>
                                    <div style="font-size:0.73rem;color:#cbd5e1;margin-top:1px;line-height:1.4;">
                                        <strong>Benefit:</strong> Sell your creations with Pay-to-Remix code protection &amp; automated creator payouts.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Checkout Button -->
                    <button id="btnSubscribePro" class="prem-submit-btn">
                        <i class="ri-flashlight-fill" style="color:#fde047;"></i> <span id="btnSubscribeText">Subscribe for ${PLAN_DATA[currentCurrency][selectedPlan].display} ${PLAN_DATA[currentCurrency][selectedPlan].period}</span>
                    </button>

                    <!-- Trust Bar -->
                    <div style="display:flex;align-items:center;justify-content:center;gap:14px;font-size:0.73rem;color:#64748b;margin-top:14px;">
                        <span><i class="ri-shield-check-fill" style="color:#10b981;"></i> 256-Bit SSL Encrypted</span>
                        <span>•</span>
                        <span><i class="ri-flashlight-fill" style="color:#f59e0b;"></i> Instant Activation</span>
                        <span>•</span>
                        <span><i class="ri-refresh-line" style="color:#38bdf8;"></i> Cancel Anytime</span>
                    </div>

                    <!-- Free Alternatives Footer -->
                    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);font-size:0.76rem;">
                        <span style="color:#64748b;">Free Tools:</span>
                        <a href="/views/xtraArticle.html" style="color:#38bdf8;text-decoration:none;font-weight:700;transition:color 0.15s;">Write Free Article</a>
                        <span style="color:#475569;">•</span>
                        <a href="/views/xtraGraph.html" style="color:#38bdf8;text-decoration:none;font-weight:700;transition:color 0.15s;">Free Desmos Graph</a>
                        <span style="color:#475569;">•</span>
                        <button id="subModalCancelBtn" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:0.76rem;padding:0;text-decoration:underline;">Close</button>
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
            document.getElementById('planPriceMonthly').innerHTML = `${curData.monthly.display} <span style="font-size:0.78rem;color:#94a3b8;font-weight:600;">${curData.monthly.period}</span>`;
            document.getElementById('planPriceYearly').innerHTML = `${curData.yearly.display} <span style="font-size:0.78rem;color:#94a3b8;font-weight:600;">${curData.yearly.period}</span>`;
            document.getElementById('planNoteMonthly').textContent = curData.monthly.billing;
            document.getElementById('planNoteYearly').textContent = curData.yearly.billing;

            btnSubscribeText.textContent = `Subscribe for ${curData[selectedPlan].display} ${curData[selectedPlan].period}`;

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

        // Segmented Currency Switcher
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
