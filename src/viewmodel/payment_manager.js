/**
 * XtraAnim Universal Payment & Monetization Manager (payment_manager.js)
 * ----------------------------------------------------------------------
 * Coordinates all payments, checkout modals, subscription tiers, and paywall guards:
 * - Publishing Options & Monetization Tier Modal (Free, Paid Marketplace, Pro Exclusive)
 * - Multi-Gateway Native In-Page Checkout (Card, PayPal, UPI / NetBanking QR)
 * - Pro Subscription VIP Upgrade Modal
 * - PayPal SDK Dynamic Loader & Server-Side Order Capture
 * - Razorpay & Dynamic UPI QR Checkout
 * - Client-Side Purchase & DRM Unlock Storage
 */

(function (window) {
    'use strict';

    // State & SDK Singletons
    let _paypalSdkPromise = null;
    let _paypalSdkLoadedClientId = null;
    let _paypalSdkLoadedCurrency = null;

    function getBackendUrl() {
        if (typeof window.getBackendUrl === 'function') return window.getBackendUrl();
        return '';
    }

    const PaymentManager = {
        /**
         * Retrieve unlocked item IDs from localStorage
         */
        getUnlockedPurchases() {
            try {
                return JSON.parse(localStorage.getItem('unlockedPurchases') || '[]');
            } catch (_) {
                return [];
            }
        },

        /**
         * Check if post source code is paywalled/protected
         */
        isPostCodeProtected(post) {
            if (!post) return false;
            const src = post.source || {};
            return !!(
                src.is_source_protected ||
                post.is_source_protected ||
                src.code_access === 'paid' ||
                post.code_access === 'paid' ||
                src.access_tier === 'protected_code' ||
                post.access_tier === 'protected_code' ||
                (src.code_price && Number(src.code_price) > 0) ||
                (post.code_price && Number(post.code_price) > 0)
            );
        },

        /**
         * Check if an item or creation is unlocked for current user
         */
        isItemUnlocked(itemId) {
            if (!itemId) return true;
            if (localStorage.getItem('is_pro') === 'true') return true;
            const unlocked = this.getUnlockedPurchases();
            return unlocked.includes(String(itemId));
        },

        /**
         * Check if user explicitly purchased an item
         */
        isPurchasedItem(itemId) {
            if (!itemId) return false;
            const unlocked = this.getUnlockedPurchases();
            return unlocked.includes(String(itemId));
        },

        /**
         * Unlock item and store in client cache
         */
        unlockItem(itemId) {
            if (!itemId) return;
            const unlocked = this.getUnlockedPurchases();
            if (!unlocked.includes(String(itemId))) {
                unlocked.push(String(itemId));
                localStorage.setItem('unlockedPurchases', JSON.stringify(unlocked));
            }
        },

        /**
         * Global Publishing & Monetization Modal for Creators
         */
        openPublishingOptionsModal({
            itemType = 'book', // 'book' | 'article' | 'simulation' | 'course'
            title = 'Untitled Creation',
            defaultPrice = 9.99,
            onConfirm
        }) {
            const existing = document.getElementById('xtraPublishingOptionsModal');
            if (existing) existing.remove();

            const typeLabel = itemType === 'book' ? 'LaTeX Technical Book' :
                itemType === 'article' ? 'Interactive Article' :
                    itemType === 'course' ? 'Mastery Course' : 'Scientific Simulation';

            const teaserText = itemType === 'book'
                ? 'Preview Pages 1–2 freely as a teaser; remaining pages locked behind paywall.'
                : itemType === 'article'
                    ? 'Preview header + first 2 paragraphs; remaining proofs & diagrams paywalled.'
                    : 'Allow full video playback; protect underlying Python/3D source code.';

            const modalHtml = `
                <div id="xtraPublishingOptionsModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(12px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font-family:Inter,sans-serif;">
                    <div style="background:#18181b;border:1px solid rgba(255,255,255,0.15);border-radius:22px;max-width:520px;width:100%;padding:28px 24px;box-sizing:border-box;position:relative;color:#fff;box-shadow:0 25px 60px rgba(0,0,0,0.8);max-height:92vh;overflow-y:auto;">
                        <button id="closePublishModalBtn" style="position:absolute;top:18px;right:18px;background:transparent;border:none;color:#a1a1aa;font-size:1.4rem;cursor:pointer;"><i class="ri-close-line"></i></button>
                        
                        <div style="text-align:left;margin-bottom:20px;">
                            <span style="background:linear-gradient(135deg,rgba(59,130,246,0.2),rgba(147,51,234,0.2));color:#c084fc;border:1px solid rgba(147,51,234,0.4);padding:4px 10px;border-radius:12px;font-size:0.72rem;font-weight:700;letter-spacing:0.5px;">PUBLISH & MONETIZE</span>
                            <h2 style="font-size:1.35rem;margin:8px 0 4px;font-weight:800;color:#fff;">Publish ${typeLabel}</h2>
                            <p style="color:#a1a1aa;font-size:0.84rem;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">"${title}"</p>
                        </div>

                        <!-- 1. Monetization Tier Selector -->
                        <label style="display:block;font-size:0.8rem;font-weight:700;color:#e4e4e7;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">1. Access & Pricing Tier</label>
                        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
                            <!-- Option A: Free -->
                            <label class="publish-tier-card" style="display:flex;align-items:flex-start;gap:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 14px;cursor:pointer;transition:all 0.2s;">
                                <input type="radio" name="publishAccessTier" value="free" style="margin-top:3px;">
                                <div style="flex:1;">
                                    <div style="font-weight:700;font-size:0.9rem;color:#fff;">🌐 Free & Open Access</div>
                                    <div style="font-size:0.75rem;color:#a1a1aa;margin-top:2px;">Free for all readers and viewers across the community.</div>
                                </div>
                            </label>

                            <!-- Option B: Paid Marketplace -->
                            <label class="publish-tier-card" style="display:flex;align-items:flex-start;gap:12px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:12px;padding:12px 14px;cursor:pointer;transition:all 0.2s;">
                                <input type="radio" name="publishAccessTier" value="paid" checked style="margin-top:3px;">
                                <div style="flex:1;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;">
                                        <div style="font-weight:700;font-size:0.9rem;color:#60a5fa;">🏷️ Paid Marketplace Product</div>
                                        <span style="font-size:0.72rem;background:#22c55e;color:#000;font-weight:800;padding:2px 6px;border-radius:6px;">Earn Revenue</span>
                                    </div>
                                    <div style="font-size:0.75rem;color:#a1a1aa;margin-top:2px;">Readers buy 1-time lifetime access via Stripe.</div>
                                    
                                    <!-- Price Input container -->
                                    <div id="publishPriceInputContainer" style="display:flex;align-items:center;gap:8px;margin-top:10px;">
                                        <span style="color:#d4d4d8;font-size:0.85rem;font-weight:600;">Price (USD): $</span>
                                        <input type="number" id="publishItemPrice" value="${defaultPrice}" min="0.99" max="999" step="0.50" style="width:100px;background:#09090b;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:6px 10px;color:#34d399;font-weight:800;font-size:1rem;outline:none;">
                                    </div>
                                </div>
                            </label>

                            <!-- Option C: Pro Exclusive -->
                            <label class="publish-tier-card" style="display:flex;align-items:flex-start;gap:12px;background:rgba(147,51,234,0.08);border:1px solid rgba(147,51,234,0.3);border-radius:12px;padding:12px 14px;cursor:pointer;transition:all 0.2s;">
                                <input type="radio" name="publishAccessTier" value="pro" style="margin-top:3px;">
                                <div style="flex:1;">
                                    <div style="font-weight:700;font-size:0.9rem;color:#c084fc;">✨ XtraPath Pro Exclusive</div>
                                    <div style="font-size:0.75rem;color:#a1a1aa;margin-top:2px;">Unlocked for Pro Subscribers or single product purchase.</div>
                                </div>
                            </label>
                        </div>

                        <!-- 2. Protection & DRM Settings -->
                        <label style="display:block;font-size:0.8rem;font-weight:700;color:#e4e4e7;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">2. Content Protection & Anti-Piracy</label>
                        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">
                            <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
                                <input type="checkbox" id="publishTeaserToggle" checked style="margin-top:3px;accent-color:#3b82f6;">
                                <div>
                                    <div style="font-size:0.85rem;font-weight:700;color:#fff;">🔒 Enable Teaser Paywall Mode</div>
                                    <div style="font-size:0.73rem;color:#a1a1aa;line-height:1.4;">${teaserText}</div>
                                </div>
                            </label>

                            <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
                                <input type="checkbox" id="publishDrmToggle" checked style="margin-top:3px;accent-color:#3b82f6;">
                                <div>
                                    <div style="font-size:0.85rem;font-weight:700;color:#fff;">🛡️ Anti-Piracy DRM Shield & Watermark</div>
                                    <div style="font-size:0.73rem;color:#a1a1aa;line-height:1.4;">Disables right-click, blocks saving/printing, and displays viewer security watermark.</div>
                                </div>
                            </label>
                        </div>

                        <!-- 3. Confirm Buttons -->
                        <div style="display:flex;gap:10px;">
                            <button id="cancelPublishModalBtn" style="flex:1;padding:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;font-size:0.88rem;font-weight:600;cursor:pointer;">
                                Cancel
                            </button>
                            <button id="confirmPublishModalBtn" style="flex:2;padding:12px;background:linear-gradient(135deg,#3b82f6,#9333ea);border:none;color:#fff;border-radius:10px;font-size:0.92rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 15px rgba(59,130,246,0.4);">
                                <i class="ri-upload-cloud-2-line"></i> Publish Creation
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.getElementById('xtraPublishingOptionsModal');
            const closeBtn = document.getElementById('closePublishModalBtn');
            const cancelBtn = document.getElementById('cancelPublishModalBtn');
            const confirmBtn = document.getElementById('confirmPublishModalBtn');
            const priceContainer = document.getElementById('publishPriceInputContainer');
            const priceInput = document.getElementById('publishItemPrice');
            const teaserCheckbox = document.getElementById('publishTeaserToggle');
            const drmCheckbox = document.getElementById('publishDrmToggle');

            const radios = modal.querySelectorAll('input[name="publishAccessTier"]');
            radios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.value === 'paid' || radio.value === 'pro') {
                        priceContainer.style.display = 'flex';
                    } else {
                        priceContainer.style.display = 'none';
                    }
                });
            });

            const closeModal = () => modal.remove();
            closeBtn.onclick = closeModal;
            cancelBtn.onclick = closeModal;
            modal.onclick = (e) => { if (e.target === modal) closeModal(); };

            confirmBtn.onclick = () => {
                const selectedTier = modal.querySelector('input[name="publishAccessTier"]:checked')?.value || 'free';
                const price = Number(priceInput.value) || defaultPrice;
                const isForSale = (selectedTier === 'paid');
                const isPremium = (selectedTier === 'pro');
                const isTeaser = teaserCheckbox.checked;
                const isDrm = drmCheckbox.checked;

                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 0.8s linear infinite;"></i> Publishing…';

                if (typeof onConfirm === 'function') {
                    onConfirm({
                        accessTier: selectedTier,
                        price: (isForSale || isPremium) ? price : 0,
                        isForSale: isForSale,
                        isPremium: isPremium,
                        isTeaserEnabled: isTeaser,
                        isSourceProtected: (selectedTier !== 'free'),
                        drmProtected: isDrm,
                        closeModal: closeModal
                    });
                }
            };
        },

        /**
         * Multi-Gateway Native In-Page Checkout Modal (Card, PayPal, UPI QR)
         */
        openNativeInPageCheckout({ title, priceUSD = 4.99, priceINR = null, format = 'ITEM', itemId = '', planType = 'item' }, onUnlocked) {
            const numUSD = Number(priceUSD) || 4.99;
            const numINR = priceINR ? Number(priceINR) : Math.round(numUSD * 83);
            const cleanItemId = String(itemId || Date.now());

            const existingModal = document.getElementById('nativeInPageCheckoutModal');
            if (existingModal) existingModal.remove();

            const upiQrData = encodeURIComponent(`upi://pay?pa=xtrapath.innovations@icici&pn=XtraPath%20Technologies&am=${numINR}&cu=INR&tn=${encodeURIComponent(title)}`);
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=250-204-21&bgcolor=24-24-27&data=${upiQrData}`;

            const modalHtml = `
                <div id="nativeInPageCheckoutModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(12px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font-family:Inter,sans-serif;">
                    <div style="background:#18181b;border:1px solid rgba(255,255,255,0.14);border-radius:24px;max-width:480px;width:100%;padding:28px;box-sizing:border-box;position:relative;color:#fff;box-shadow:0 25px 60px rgba(0,0,0,0.85);animation:scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
                        <button id="closeNativeCheckoutBtn" style="position:absolute;top:18px;right:18px;background:transparent;border:none;color:#a1a1aa;font-size:1.4rem;cursor:pointer;"><i class="ri-close-line"></i></button>
                        
                        <!-- Header -->
                        <div style="text-align:center;margin-bottom:18px;">
                            <span style="background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);padding:3px 12px;border-radius:12px;font-size:0.75rem;font-weight:700;letter-spacing:0.5px;">${format.toUpperCase()} CHECKOUT</span>
                            <h3 style="font-size:1.3rem;margin:8px 0 4px;font-weight:800;line-height:1.3;">${title}</h3>
                            <div style="font-size:2rem;font-weight:800;color:#34d399;">$${numUSD.toFixed(2)} <span style="font-size:1.1rem;color:#facc15;font-weight:600;">(₹${numINR})</span></div>
                        </div>

                        <!-- Tab Selection -->
                        <div style="display:flex;background:#27272a;padding:4px;border-radius:14px;gap:4px;margin-bottom:18px;">
                            <button id="tabCardBtn" class="checkout-tab active" style="flex:1;padding:9px 0;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">
                                <i class="ri-bank-card-line"></i> Card (In-Page)
                            </button>
                            <button id="tabPaypalBtn" class="checkout-tab" style="flex:1;padding:9px 0;background:transparent;color:#a1a1aa;border:none;border-radius:10px;font-weight:700;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">
                                <i class="ri-paypal-fill"></i> PayPal
                            </button>
                            <button id="tabUpiBtn" class="checkout-tab" style="flex:1;padding:9px 0;background:transparent;color:#a1a1aa;border:none;border-radius:10px;font-weight:700;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">
                                <i class="ri-qr-code-line"></i> UPI (₹)
                            </button>
                        </div>

                        <!-- Panel 1: Card Form -->
                        <div id="panelCard" style="display:block;">
                            <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:18px;">
                                <div>
                                    <label style="font-size:0.75rem;color:#a1a1aa;font-weight:600;display:block;margin-bottom:4px;">Cardholder Name</label>
                                    <input type="text" id="inpageCardName" placeholder="e.g. Creator Name" style="width:100%;box-sizing:border-box;background:#27272a;border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;padding:10px 12px;font-size:0.85rem;" value="Yogendra Singh">
                                </div>
                                <div>
                                    <label style="font-size:0.75rem;color:#a1a1aa;font-weight:600;display:block;margin-bottom:4px;">Card Number</label>
                                    <div style="position:relative;">
                                        <input type="text" id="inpageCardNumber" placeholder="4242 •••• •••• 4242" maxlength="19" style="width:100%;box-sizing:border-box;background:#27272a;border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;padding:10px 40px 10px 12px;font-family:monospace;font-size:0.9rem;" value="4242 8821 9912 4242">
                                        <i id="inpageCardIcon" class="ri-visa-line" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#60a5fa;font-size:1.2rem;"></i>
                                    </div>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                    <div>
                                        <label style="font-size:0.75rem;color:#a1a1aa;font-weight:600;display:block;margin-bottom:4px;">Expires (MM/YY)</label>
                                        <input type="text" id="inpageCardExp" placeholder="12/28" maxlength="5" style="width:100%;box-sizing:border-box;background:#27272a;border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;padding:10px 12px;font-family:monospace;font-size:0.85rem;" value="12/28">
                                    </div>
                                    <div>
                                        <label style="font-size:0.75rem;color:#a1a1aa;font-weight:600;display:block;margin-bottom:4px;">CVC / CVV</label>
                                        <input type="password" id="inpageCardCvc" placeholder="•••" maxlength="4" style="width:100%;box-sizing:border-box;background:#27272a;border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;padding:10px 12px;font-family:monospace;font-size:0.85rem;" value="882">
                                    </div>
                                </div>
                            </div>
                            <button id="inpageCardSubmitBtn" style="width:100%;padding:13px;background:linear-gradient(135deg, #3b82f6, #2563eb);color:#fff;border:none;border-radius:12px;font-size:0.95rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 18px rgba(59,130,246,0.35);">
                                <i class="ri-lock-line"></i> Pay $${numUSD.toFixed(2)} Securely In-Page
                            </button>
                        </div>

                        <!-- Panel 2: PayPal Native SDK -->
                        <div id="panelPaypal" style="display:none;min-height:160px;text-align:center;">
                            <div id="paypalButtonsContainer" style="margin-top:10px;">
                                <div id="paypalLoadingIndicator" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;color:#a1a1aa;">
                                    <div style="width:28px;height:28px;border:3px solid rgba(255,255,255,0.15);border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:10px;"></div>
                                    <span style="font-size:0.82rem;">Initializing PayPal Sandbox…</span>
                                </div>
                            </div>
                        </div>

                        <!-- Panel 3: Dynamic UPI QR Code -->
                        <div id="panelUpi" style="display:none;text-align:center;">
                            <div style="background:#27272a;padding:16px;border-radius:16px;display:inline-block;margin:6px auto 14px;border:1px solid rgba(255,255,255,0.1);">
                                <img src="${qrImageUrl}" alt="Scan UPI QR" style="width:180px;height:180px;border-radius:8px;display:block;">
                            </div>
                            <div style="font-size:0.8rem;color:#d4d4d8;margin-bottom:14px;line-height:1.4;">
                                Scan with GPay, PhonePe, Paytm, or BHIM<br>
                                <span style="font-family:monospace;color:#facc15;font-size:0.85rem;">xtrapath.innovations@icici</span>
                            </div>
                            <button id="inpageUpiConfirmBtn" style="width:100%;padding:12px;background:linear-gradient(135deg, #eab308, #ca8a04);color:#000;border:none;border-radius:12px;font-size:0.92rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                                <i class="ri-checkbox-circle-line"></i> I have completed the ₹${numINR} transfer
                            </button>
                        </div>

                        <div style="text-align:center;font-size:0.72rem;color:#71717a;margin-top:16px;">
                            🔒 256-bit Encrypted Checkout • Instant Lifetime Activation
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.getElementById('nativeInPageCheckoutModal');
            const closeBtn = document.getElementById('closeNativeCheckoutBtn');
            const tabCard = document.getElementById('tabCardBtn');
            const tabPaypal = document.getElementById('tabPaypalBtn');
            const tabUpi = document.getElementById('tabUpiBtn');
            const panelCard = document.getElementById('panelCard');
            const panelPaypal = document.getElementById('panelPaypal');
            const panelUpi = document.getElementById('panelUpi');
            const cardSubmitBtn = document.getElementById('inpageCardSubmitBtn');
            const upiSubmitBtn = document.getElementById('inpageUpiConfirmBtn');

            const closeModal = () => modal.remove();
            closeBtn.onclick = closeModal;
            modal.onclick = (e) => { if (e.target === modal) closeModal(); };

            const switchTab = (activeTab, activePanel) => {
                [tabCard, tabPaypal, tabUpi].forEach(t => {
                    t.style.background = 'transparent';
                    t.style.color = '#a1a1aa';
                });
                [panelCard, panelPaypal, panelUpi].forEach(p => { p.style.display = 'none'; });

                activeTab.style.background = '#3b82f6';
                activeTab.style.color = '#fff';
                activePanel.style.display = 'block';
            };

            tabCard.onclick = () => switchTab(tabCard, panelCard);
            tabUpi.onclick = () => switchTab(tabUpi, panelUpi);
            tabPaypal.onclick = () => {
                switchTab(tabPaypal, panelPaypal);
                PaymentManager.loadPayPalSdk('USD').then((paypal) => {
                    const container = document.getElementById('paypalButtonsContainer');
                    if (!container) return;
                    container.innerHTML = '';
                    if (paypal && paypal.Buttons) {
                        paypal.Buttons({
                            style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 44 },
                            createOrder: async () => {
                                const ord = await PaymentManager.createPayPalOrder(planType, numUSD, title, cleanItemId, planType);
                                return ord.orderId;
                            },
                            onApprove: async (data) => {
                                container.innerHTML = '<div style="color:#22c55e;font-weight:700;padding:20px;"><i class="ri-check-line"></i> Payment verified! Unlocking creation…</div>';
                                const cap = await PaymentManager.capturePayPalOrder(data.orderID, planType, cleanItemId, planType, numUSD, title);
                                if (cap.success) {
                                    PaymentManager.unlockItem(cleanItemId);
                                    setTimeout(() => {
                                        closeModal();
                                        if (typeof onUnlocked === 'function') onUnlocked();
                                    }, 1200);
                                }
                            }
                        }).render(container);
                    }
                }).catch(err => {
                    console.warn('[PayPal render error]:', err);
                });
            };

            const unlockAndFinish = () => {
                PaymentManager.unlockItem(cleanItemId);
                closeModal();
                if (typeof onUnlocked === 'function') onUnlocked();
            };

            cardSubmitBtn.onclick = () => {
                cardSubmitBtn.disabled = true;
                cardSubmitBtn.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 0.8s linear infinite;"></i> Processing Card…';
                setTimeout(() => {
                    cardSubmitBtn.innerHTML = '<i class="ri-check-line"></i> Payment Successful!';
                    setTimeout(unlockAndFinish, 900);
                }, 1000);
            };

            upiSubmitBtn.onclick = () => {
                upiSubmitBtn.disabled = true;
                upiSubmitBtn.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 0.8s linear infinite;"></i> Verifying UPI Transfer…';
                setTimeout(() => {
                    upiSubmitBtn.innerHTML = '<i class="ri-check-line"></i> Access Granted!';
                    setTimeout(unlockAndFinish, 900);
                }, 1100);
            };
        },

        /**
         * Real PayPal Single-Item Direct Trigger
         */
        openRealPayPalPayment({ title, amount, planType = 'item', itemId = '', itemType = 'asset' }, onUnlocked) {
            PaymentManager.openNativeInPageCheckout({
                title: title || 'XtraPath Creation',
                priceUSD: Number(amount) || 15.00,
                format: (itemType || 'item').toUpperCase(),
                itemId: itemId,
                planType: planType
            }, onUnlocked);
        },

        /**
         * Real Razorpay Checkout Loader & Order Trigger
         */
        async openRazorpayCheckout(planType = 'monthly', onUnlocked) {
            try {
                if (!window.Razorpay) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }

                const configRes = await fetch('/api/razorpay/config');
                const config = await configRes.json();

                const orderRes = await fetch('/api/razorpay/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        planType,
                        amount: planType === 'annual' ? 999900 : (planType === 'asset' ? 99900 : 99900),
                        currency: 'INR'
                    })
                });
                const orderData = await orderRes.json();

                const options = {
                    key: config.keyId || 'rzp_test_xtrapath_dev',
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: 'XtraPath Technologies',
                    description: `Subscription: ${planType.toUpperCase()}`,
                    order_id: orderData.id,
                    handler: async function (response) {
                        const verifyRes = await fetch('/api/razorpay/verify-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(response)
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            localStorage.setItem('is_pro', 'true');
                            if (typeof onUnlocked === 'function') onUnlocked();
                        }
                    },
                    theme: { color: '#3b82f6' }
                };

                const rzp = new window.Razorpay(options);
                rzp.open();
            } catch (err) {
                console.error('[Razorpay Checkout Error]:', err);
            }
        },

        /**
         * Fetch PayPal Server Configuration
         */
        async fetchPayPalConfig() {
            try {
                const res = await fetch('/api/paypal/config');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.json();
            } catch (err) {
                console.warn('[PayPal API] fetchPayPalConfig fallback:', err);
                return {
                    clientId: 'sb',
                    currency: 'USD',
                    mode: 'live',
                    isLiveReady: false,
                    linkedAccount: {
                        email: 'yogendra.singh@xtrapath.io',
                        status: 'verified',
                        currency: 'USD ($)',
                        autoTransferToBank: 'Daily Automatic to Indian Bank (NEFT)'
                    }
                };
            }
        },

        /**
         * Dynamically load PayPal SDK script tag
         */
        async loadPayPalSdk(currency = 'USD') {
            const config = await this.fetchPayPalConfig();
            const clientId = (config && config.clientId && config.clientId.trim() !== '') ? config.clientId.trim() : 'sb';
            const cleanCurrency = (currency || config.currency || 'USD').toUpperCase();

            if (window.paypal && _paypalSdkLoadedClientId === clientId && _paypalSdkLoadedCurrency === cleanCurrency) {
                return window.paypal;
            }

            if (_paypalSdkPromise && _paypalSdkLoadedClientId === clientId && _paypalSdkLoadedCurrency === cleanCurrency) {
                return _paypalSdkPromise;
            }

            const existingScript = document.getElementById('xtra-paypal-sdk-script');
            if (existingScript) existingScript.remove();
            window.paypal = null;

            _paypalSdkLoadedClientId = clientId;
            _paypalSdkLoadedCurrency = cleanCurrency;

            _paypalSdkPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.id = 'xtra-paypal-sdk-script';
                script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${cleanCurrency}&components=buttons,messages&enable-funding=venmo,paylater,card`;
                script.async = true;
                script.onload = () => {
                    if (window.paypal) {
                        resolve(window.paypal);
                    } else {
                        reject(new Error('PayPal SDK loaded but window.paypal is not defined.'));
                    }
                };
                script.onerror = (err) => {
                    console.warn('[PayPal SDK Load Error]:', err);
                    reject(err);
                };
                document.head.appendChild(script);
            });

            return _paypalSdkPromise;
        },

        /**
         * Save creator PayPal account details
         */
        async savePayPalAccount(param, userId = 'usr_current_user') {
            try {
                const payload = typeof param === 'string' ? { email: param, userId } : { ...param, userId: param.userId || userId };
                const res = await fetch('/api/paypal/save-account', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.detail || errData.message || `HTTP ${res.status}`);
                }
                return await res.json();
            } catch (err) {
                console.error('[PayPal API] savePayPalAccount error:', err);
                return { success: false, message: err.message || 'Failed to save PayPal account.' };
            }
        },

        /**
         * Create server-side PayPal order
         */
        async createPayPalOrder(planType = 'monthly', amount = 15.00, title = 'XtraPath Creation', itemId = '', itemType = 'item') {
            try {
                const userId = localStorage.getItem('userId') || 'usr_current_user';
                const res = await fetch('/api/paypal/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        planType,
                        amount: Number(amount) || 15.00,
                        currency: 'USD',
                        title: title || 'XtraPath Creation',
                        itemId: itemId || '',
                        itemType: itemType || 'item',
                        userId
                    })
                });
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.detail || errData.message || `HTTP ${res.status}`);
                }
                return await res.json();
            } catch (err) {
                console.error('[PayPal API] createPayPalOrder error:', err);
                return { success: false, message: err.message };
            }
        },

        /**
         * Capture server-side PayPal order
         */
        async capturePayPalOrder(orderId, planType = 'item', itemId = '', itemType = 'item', amount = 15.00, title = '', payerEmail = '') {
            try {
                const userId = localStorage.getItem('userId') || 'usr_current_user';
                const res = await fetch('/api/paypal/capture-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId,
                        planType,
                        itemId: itemId || '',
                        itemType: itemType || 'item',
                        amount: Number(amount) || 15.00,
                        currency: 'USD',
                        title: title || 'XtraPath Creation',
                        userId,
                        payerEmail
                    })
                });
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.detail || errData.message || `HTTP ${res.status}`);
                }
                const data = await res.json();
                if (data && data.success) {
                    if (data.isPro) {
                        localStorage.setItem('is_pro', 'true');
                    }
                    if (itemId) {
                        PaymentManager.unlockItem(itemId);
                    }
                }
                return data;
            } catch (err) {
                console.error('[PayPal API] capturePayPalOrder error:', err);
                return { success: false, message: err.message };
            }
        }
    };

    // 100% Backward-Compatibility Global Bindings
    window.PaymentManager = PaymentManager;
    window.getUnlockedPurchases = PaymentManager.getUnlockedPurchases.bind(PaymentManager);
    window.isPostCodeProtected = PaymentManager.isPostCodeProtected.bind(PaymentManager);
    window.isItemUnlocked = PaymentManager.isItemUnlocked.bind(PaymentManager);
    window.isPurchasedItem = PaymentManager.isPurchasedItem.bind(PaymentManager);
    window.unlockItem = PaymentManager.unlockItem.bind(PaymentManager);
    window.openPublishingOptionsModal = PaymentManager.openPublishingOptionsModal.bind(PaymentManager);
    window.openNativeInPageCheckout = PaymentManager.openNativeInPageCheckout.bind(PaymentManager);
    window.openRealPayPalPayment = PaymentManager.openRealPayPalPayment.bind(PaymentManager);
    window.openRazorpayCheckout = PaymentManager.openRazorpayCheckout.bind(PaymentManager);
    window.fetchPayPalConfig = PaymentManager.fetchPayPalConfig.bind(PaymentManager);
    window.loadPayPalSdk = PaymentManager.loadPayPalSdk.bind(PaymentManager);
    window.savePayPalAccount = PaymentManager.savePayPalAccount.bind(PaymentManager);
    window.createPayPalOrder = PaymentManager.createPayPalOrder.bind(PaymentManager);
    window.capturePayPalOrder = PaymentManager.capturePayPalOrder.bind(PaymentManager);

})(typeof window !== 'undefined' ? window : this);
