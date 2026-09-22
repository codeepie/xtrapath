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
                src.access_tier === 'store_sale' ||
                post.access_tier === 'store_sale' ||
                src.is_for_sale ||
                post.is_for_sale ||
                (src.code_price && Number(src.code_price) > 0) ||
                (post.code_price && Number(post.code_price) > 0) ||
                (src.price && Number(src.price) > 0) ||
                (post.price && Number(post.price) > 0)
            );
        },

        // Zero-Trust: Server-verified entitlements cache
        _verifiedPurchasesSet: new Set(),
        _verifiedIsPro: null,
        _entitlementsChecked: false,

        /**
         * Cryptographically verifies user entitlements and subscriptions against backend database
         * Safe Union Merge: Never destructively overwrites client purchases if server response is missing items
         */
        async verifyEntitlements(forceRefresh = false) {
            if (this._entitlementsChecked && !forceRefresh) {
                return { isPro: !!this._verifiedIsPro, purchases: Array.from(this._verifiedPurchasesSet) };
            }
            // Always read existing local purchases first so nothing is ever lost
            const localUnlocked = this.getUnlockedPurchases().map(String);
            localUnlocked.forEach(id => this._verifiedPurchasesSet.add(id));

            try {
                let token = null;
                if (window.supabaseClient?.auth?.getSession) {
                    const s = await window.supabaseClient.auth.getSession();
                    token = s?.data?.session?.access_token;
                }
                const uid = localStorage.getItem('userId') || localStorage.getItem('user_id') || 'usr_current_user';
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const url = uid ? `/api/user/purchases?userId=${encodeURIComponent(uid)}` : '/api/user/purchases';
                const res = await fetch(url, { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.success) {
                        this._verifiedIsPro = !!data.isPro;
                        const serverItemIds = [];

                        if (Array.isArray(data.purchases)) {
                            data.purchases.forEach(p => {
                                const pid = p.item_id || p.itemId || p.post_id || p.postId;
                                if (pid) {
                                    const sPid = String(pid);
                                    this._verifiedPurchasesSet.add(sPid);
                                    if (!serverItemIds.includes(sPid)) {
                                        serverItemIds.push(sPid);
                                    }
                                }
                            });
                        }
                        
                        // SAFE SET UNION: Never destroy local purchases! Merge server items + local items
                        const mergedPurchases = Array.from(new Set([...localUnlocked, ...serverItemIds]));
                        mergedPurchases.forEach(id => this._verifiedPurchasesSet.add(id));
                        localStorage.setItem('unlockedPurchases', JSON.stringify(mergedPurchases));

                        // Self-healing: if client has verified purchases missing on server, sync them now
                        const missingOnServer = localUnlocked.filter(id => id && !serverItemIds.includes(id));
                        if (missingOnServer.length > 0) {
                            fetch('/api/user/purchases/sync', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: uid, itemIds: missingOnServer })
                            }).catch(() => {});
                        }

                        this._entitlementsChecked = true;
                        return { isPro: this._verifiedIsPro, purchases: Array.from(this._verifiedPurchasesSet) };
                    }
                }
            } catch (err) {
                console.warn('[PaymentManager] Backend entitlement verification notice:', err);
            }
            // Fallback: preserve local storage
            localUnlocked.forEach(id => this._verifiedPurchasesSet.add(String(id)));
            return { isPro: !!this._verifiedIsPro, purchases: Array.from(this._verifiedPurchasesSet) };
        },

        /**
         * Check if an item or creation is unlocked for current user
         * Zero-Trust Architecture: Prioritizes cryptographically validated server state
         */
        isItemUnlocked(itemId) {
            if (!itemId) return true;
            const sId = String(itemId);
            if (this._verifiedIsPro) return true;
            if (localStorage.getItem('is_pro') === 'true') return true;
            if (this._verifiedPurchasesSet.has(sId)) return true;

            // Strict fallback: check stored tokens
            const unlocked = this.getUnlockedPurchases();
            return unlocked.includes(sId);
        },

        /**
         * Check if user explicitly purchased an item
         */
        isPurchasedItem(itemId) {
            if (!itemId) return false;
            const sId = String(itemId);
            if (this._verifiedPurchasesSet.has(sId)) return true;
            const unlocked = this.getUnlockedPurchases();
            return unlocked.includes(sId);
        },

        /**
         * Unlock item and store in verified set & client cache & backend SQLite
         */
        async unlockItem(itemId) {
            if (!itemId) return;
            const sId = String(itemId);
            this._verifiedPurchasesSet.add(sId);
            const unlocked = this.getUnlockedPurchases().map(String);
            if (!unlocked.includes(sId)) {
                unlocked.push(sId);
                localStorage.setItem('unlockedPurchases', JSON.stringify(unlocked));
            }
            const uid = localStorage.getItem('userId') || localStorage.getItem('user_id') || 'usr_current_user';
            try {
                const res = await fetch('/api/user/purchases/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: uid, itemIds: [sId] })
                });
                if (res.ok) {
                    const syncData = await res.json().catch(() => ({}));
                    if (syncData && syncData.synced) {
                        this._verifiedPurchasesSet.add(sId);
                    }
                }
            } catch (err) {
                console.warn('[PaymentManager] unlockItem sync notice:', err);
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
         * Multi-Gateway Native In-Page Checkout Modal (Card, PayPal, UPI QR, Express)
         */
        openNativeInPageCheckout({ title, priceUSD = 4.99, priceINR = null, format = 'ITEM', itemId = '', planType = 'item', preferredMethod = null }, onUnlocked) {
            const rawUSD = (priceUSD !== undefined && priceUSD !== null && !isNaN(Number(priceUSD))) ? Number(priceUSD) : 4.99;
            const numUSD = rawUSD;
            let numINR = (priceINR !== null && priceINR !== undefined && !isNaN(Number(priceINR))) ? Number(priceINR) : Math.round(numUSD * 83);
            if (numUSD > 0 && numINR < 1) {
                numINR = 1; // Razorpay requires a minimum live transaction amount of ₹1.00 (100 paise)
            }
            const cleanItemId = String(itemId || Date.now());
            const usdDisplay = (numUSD < 0.01 && numUSD > 0) ? numUSD.toFixed(3) : numUSD.toFixed(2);

            const existingModal = document.getElementById('nativeInPageCheckoutModal');
            if (existingModal) existingModal.remove();


            const modalHtml = `
                <div id="nativeInPageCheckoutModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(3,7,18,0.8);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;">
                    <div style="background:radial-gradient(100% 70% at 50% 0%, rgba(30, 41, 69, 0.95) 0%, rgba(12, 16, 27, 0.98) 100%);border:1px solid rgba(255,255,255,0.12);border-radius:24px;max-width:410px;width:100%;padding:26px 22px 22px;box-sizing:border-box;position:relative;color:#fff;box-shadow:0 30px 80px -10px rgba(0,0,0,0.85), 0 0 35px -5px rgba(16,185,129,0.15);animation:modalScaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);">
                        
                        <button id="closeNativeCheckoutBtn" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:#94a3b8;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;cursor:pointer;transition:all 0.15s;">
                            <i class="ri-close-line"></i>
                        </button>
                        
                        <!-- Minimal Header -->
                        <div style="text-align:center;margin-bottom:18px;">
                            <span style="font-size:0.68rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#10b981;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);padding:3px 10px;border-radius:99px;">PREMIUM UNLOCK</span>
                            <h3 style="font-family:'Outfit',sans-serif;font-size:1.25rem;margin:8px 0 2px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</h3>
                            <div style="font-size:2.2rem;font-weight:900;color:#fff;letter-spacing:-0.03em;margin-top:2px;">₹${numINR} <span style="font-size:0.95rem;font-weight:600;color:#64748b;margin-left:4px;">($${usdDisplay})</span></div>
                        </div>

                        <!-- Minimal Tab Switcher -->
                        <div style="display:flex;background:rgba(255,255,255,0.05);padding:3px;border-radius:12px;gap:3px;margin-bottom:18px;border:1px solid rgba(255,255,255,0.06);">
                            <button id="tabUpiBtn" class="checkout-tab active" style="flex:1;padding:9px 0;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:9px;font-weight:700;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;box-shadow:0 2px 8px rgba(16,185,129,0.35);transition:all 0.15s;">
                                <i class="ri-flashlight-fill" style="color:#fde047;"></i> UPI
                            </button>
                            <button id="tabCardBtn" class="checkout-tab" style="flex:1;padding:9px 0;background:transparent;color:#94a3b8;border:none;border-radius:9px;font-weight:700;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:all 0.15s;">
                                <i class="ri-bank-card-fill"></i> Card
                            </button>
                            <button id="tabPaypalBtn" class="checkout-tab" style="flex:1;padding:9px 0;background:transparent;color:#94a3b8;border:none;border-radius:9px;font-weight:700;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:all 0.15s;">
                                <i class="ri-paypal-fill" style="color:#38bdf8;"></i> PayPal
                            </button>
                        </div>

                        <!-- Panel 1: UPI Checkout (Default) -->
                        <div id="panelUpi" style="display:block;text-align:center;">
                            <button id="inpageRazorpayMainBtn" style="width:100%;height:52px;background:linear-gradient(135deg, #10b981, #059669);color:#fff;border:none;border-radius:14px;font-size:0.98rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 20px rgba(16,185,129,0.4);transition:transform 0.15s,box-shadow 0.15s;">
                                <i class="ri-flashlight-fill" style="color:#fde047;font-size:1.15rem;"></i> Pay ₹${numINR} with UPI
                            </button>

                            <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:14px;font-size:0.75rem;color:#94a3b8;font-weight:600;">
                                <span>GPay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>QR</span>
                            </div>
                        </div>

                        <!-- Panel 2: Card Checkout (Real 3D-Secure) -->
                        <div id="panelCard" style="display:none;text-align:center;">
                            <button id="inpageCardSubmitBtn" style="width:100%;height:52px;background:linear-gradient(135deg, #2563eb, #1d4ed8);color:#fff;border:none;border-radius:14px;font-size:0.98rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 20px rgba(37,99,235,0.4);transition:transform 0.15s,box-shadow 0.15s;">
                                <i class="ri-bank-card-fill" style="font-size:1.15rem;"></i> Pay ₹${numINR} with Card
                            </button>

                            <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:14px;font-size:0.75rem;color:#94a3b8;font-weight:600;">
                                <span>Visa</span> • <span>Mastercard</span> • <span>RuPay</span> • <span>3D-Secure</span>
                            </div>
                        </div>

                        <!-- Panel 3: PayPal (Live) -->
                        <div id="panelPaypal" style="display:none;text-align:center;">
                            <div id="paypalButtonsRenderArea" style="min-height:50px;margin-bottom:8px;">
                                <button id="inpagePaypalSubmitBtn" style="width:100%;height:52px;background:linear-gradient(135deg, #0070ba, #003087);color:#fff;border:none;border-radius:14px;font-size:0.98rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 20px rgba(0,112,186,0.4);transition:transform 0.15s,box-shadow 0.15s;">
                                    <i class="ri-paypal-fill" style="font-size:1.15rem;"></i> Pay $${usdDisplay} USD with PayPal
                                </button>
                            </div>
                            <div id="paypalSmartContainer" style="display:none;min-height:45px;margin-bottom:8px;"></div>
                            <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:14px;font-size:0.75rem;color:#94a3b8;font-weight:600;">
                                <span>PayPal Balance</span> • <span>International Cards</span> • <span>Pay in 4</span>
                            </div>
                        </div>

                        <!-- Minimal Trust Bar -->
                        <div style="display:flex;align-items:center;justify-content:center;gap:14px;font-size:0.72rem;color:#475569;margin-top:18px;border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;">
                            <span><i class="ri-shield-check-fill" style="color:#10b981;"></i> 256-bit Encrypted</span>
                            <span>•</span>
                            <span><i class="ri-flashlight-fill" style="color:#f59e0b;"></i> Instant Unlock</span>
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
            const razorpayMainBtn = document.getElementById('inpageRazorpayMainBtn');
            const upiSubmitBtn = document.getElementById('inpageUpiConfirmBtn');

            const closeModal = () => modal.remove();
            closeBtn.onclick = closeModal;
            modal.onclick = (e) => { if (e.target === modal) closeModal(); };

            const switchTab = (activeTab, activePanel) => {
                [tabCard, tabPaypal, tabUpi].forEach(t => {
                    t.style.background = 'transparent';
                    t.style.color = '#94a3b8';
                    t.style.boxShadow = 'none';
                });
                [panelCard, panelPaypal, panelUpi].forEach(p => { p.style.display = 'none'; });

                if (activeTab === tabUpi) {
                    activeTab.style.background = 'linear-gradient(135deg, #059669, #10b981)';
                    activeTab.style.color = '#fff';
                    activeTab.style.boxShadow = '0 2px 10px rgba(16,185,129,0.35)';
                } else if (activeTab === tabPaypal) {
                    activeTab.style.background = 'linear-gradient(135deg, #0070ba, #003087)';
                    activeTab.style.color = '#fff';
                    activeTab.style.boxShadow = '0 2px 10px rgba(0,112,186,0.35)';
                } else {
                    activeTab.style.background = 'linear-gradient(135deg, #2563eb, #3b82f6)';
                    activeTab.style.color = '#fff';
                    activeTab.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)';
                }
                activePanel.style.display = 'block';
            };

            tabCard.onclick = () => switchTab(tabCard, panelCard);
            tabUpi.onclick = () => switchTab(tabUpi, panelUpi);

            // REAL PAYPAL INTEGRATION
            let paypalSdkMounted = false;
            const mountPayPalSdk = async () => {
                if (paypalSdkMounted) return;
                try {
                    const paypal = await PaymentManager.loadPayPalSdk('USD');
                    const smartContainer = document.getElementById('paypalSmartContainer');
                    const directBtnArea = document.getElementById('paypalButtonsRenderArea');
                    if (paypal && paypal.Buttons && smartContainer) {
                        smartContainer.innerHTML = '';
                        smartContainer.style.display = 'block';
                        paypal.Buttons({
                            style: {
                                layout: 'vertical',
                                color: 'gold',
                                shape: 'rect',
                                label: 'pay',
                                height: 48
                            },
                            createOrder: async () => {
                                const targetUSD = Math.max(0.01, numUSD);
                                const order = await PaymentManager.createPayPalOrder(planType, targetUSD, title, cleanItemId, (format || 'item').toLowerCase());
                                if (!order || !order.id) {
                                    throw new Error(order?.message || 'Could not initialize PayPal order.');
                                }
                                return order.id;
                            },
                            onApprove: async (data) => {
                                const targetUSD = Math.max(0.01, numUSD);
                                const capture = await PaymentManager.capturePayPalOrder(data.orderID, planType, cleanItemId, (format || 'item').toLowerCase(), targetUSD, title);
                                if (capture && capture.success) {
                                    await unlockAndFinish();
                                } else {
                                    alert('PayPal capture error: ' + (capture?.message || 'Payment could not be completed.'));
                                }
                            },
                            onError: (err) => {
                                console.warn('[PayPal Buttons Notice]:', err);
                                if (directBtnArea) directBtnArea.style.display = 'block';
                            }
                        }).render('#paypalSmartContainer');
                        paypalSdkMounted = true;
                        if (directBtnArea) directBtnArea.style.display = 'none';
                    }
                } catch (err) {
                    console.warn('[PayPal SDK Mount Notice - Using direct checkout]:', err);
                }
            };

            const paypalSubmitBtn = document.getElementById('inpagePaypalSubmitBtn');
            if (paypalSubmitBtn) {
                const origPaypalHtml = paypalSubmitBtn.innerHTML;
                paypalSubmitBtn.onclick = async () => {
                    if (numINR <= 0 && numUSD <= 0) {
                        await unlockAndFinish();
                        return;
                    }
                    paypalSubmitBtn.disabled = true;
                    paypalSubmitBtn.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 0.8s linear infinite;"></i> Connecting PayPal…';
                    try {
                        const targetUSD = Math.max(0.01, numUSD);
                        const order = await PaymentManager.createPayPalOrder(planType, targetUSD, title, cleanItemId, (format || 'item').toLowerCase());
                        if (order && order.id) {
                            const approveUrl = order.approveUrl || (order.links && order.links.find(l => l.rel === 'approve')?.href);
                            if (approveUrl) {
                                const width = 500, height = 650;
                                const left = Math.max(0, (window.screen.width - width) / 2);
                                const top = Math.max(0, (window.screen.height - height) / 2);
                                const popup = window.open(approveUrl, 'PayPalCheckout', `width=${width},height=${height},top=${top},left=${left}`);
                                
                                const checkInterval = setInterval(async () => {
                                    if (!popup || popup.closed) {
                                        clearInterval(checkInterval);
                                        try {
                                            const capture = await PaymentManager.capturePayPalOrder(order.id, planType, cleanItemId, (format || 'item').toLowerCase(), targetUSD, title);
                                            if (capture && capture.success) {
                                                await unlockAndFinish();
                                            }
                                        } catch (_) {}
                                    }
                                }, 1500);
                            } else {
                                throw new Error(order.message || 'No PayPal approval URL returned.');
                            }
                        } else {
                            throw new Error(order?.message || 'Could not create PayPal order.');
                        }
                    } catch (err) {
                        console.error('[PayPal Direct Checkout Error]:', err);
                        alert('PayPal Error: ' + (err.message || 'Could not open PayPal. Please try again or use UPI/Card.'));
                    } finally {
                        paypalSubmitBtn.disabled = false;
                        paypalSubmitBtn.innerHTML = origPaypalHtml;
                    }
                };
            }

            tabPaypal.onclick = () => {
                switchTab(tabPaypal, panelPaypal);
                mountPayPalSdk();
            };

            if (preferredMethod === 'paypal') {
                switchTab(tabPaypal, panelPaypal);
                mountPayPalSdk();
            } else if (preferredMethod === 'card') {
                switchTab(tabCard, panelCard);
            }

            const unlockAndFinish = async () => {
                await PaymentManager.unlockItem(cleanItemId);
                await PaymentManager.verifyEntitlements(true);
                closeModal();
                if (typeof onUnlocked === 'function') onUnlocked();
            };

            // REAL RAZORPAY 3D-SECURE INTEGRATION FOR CARD
            if (cardSubmitBtn) {
                const origCardHtml = cardSubmitBtn.innerHTML;
                cardSubmitBtn.onclick = async () => {
                    if (numINR <= 0 && numUSD <= 0) {
                        await unlockAndFinish();
                        return;
                    }
                    cardSubmitBtn.disabled = true;
                    cardSubmitBtn.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 0.8s linear infinite;"></i> Opening Gateway…';
                    try {
                        const targetPaise = Math.max(100, Math.round(numINR * 100));
                        await PaymentManager.openRazorpayCheckoutForItem({
                            itemId: cleanItemId,
                            itemType: (format || 'item').toLowerCase(),
                            amountPaise: targetPaise,
                            title: title,
                            preferredMethod: 'card'
                        }, async () => {
                            await unlockAndFinish();
                        });
                    } catch (err) {
                        console.warn('[Card Checkout Error]:', err);
                    } finally {
                        cardSubmitBtn.disabled = false;
                        cardSubmitBtn.innerHTML = origCardHtml;
                    }
                };
            }

            // REAL RAZORPAY UPI & QR INTEGRATION
            const handleRazorpayTrigger = async (btn) => {
                if (!btn) return;
                if (numINR <= 0 && numUSD <= 0) {
                    await unlockAndFinish();
                    return;
                }
                const origHtml = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 0.8s linear infinite;"></i> Opening Gateway…';
                try {
                    const targetPaise = Math.max(100, Math.round(numINR * 100));
                    await PaymentManager.openRazorpayCheckoutForItem({
                        itemId: cleanItemId,
                        itemType: (format || 'item').toLowerCase(),
                        amountPaise: targetPaise,
                        title: title
                    }, async () => {
                        await unlockAndFinish();
                    });
                } catch (err) {
                    console.warn('[Razorpay UPI Error]:', err);
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = origHtml;
                }
            };

            if (razorpayMainBtn) {
                razorpayMainBtn.onclick = () => handleRazorpayTrigger(razorpayMainBtn);
            }
            if (upiSubmitBtn) {
                upiSubmitBtn.onclick = () => handleRazorpayTrigger(upiSubmitBtn);
            }
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
                    name: 'XtraPath',
                    description: `Pro Access • ${planType.toUpperCase()}`,
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
                    theme: {
                        color: '#059669',
                        backdrop_color: 'rgba(3, 7, 18, 0.85)'
                    },
                    modal: {
                        confirm_close: true,
                        animation: true
                    }
                };

                const rzp = new window.Razorpay(options);
                rzp.open();
            } catch (err) {
                console.error('[Razorpay Checkout Error]:', err);
            }
        },

        /**
         * Real Razorpay Single Item / Simulation Checkout with Cryptographic Server Verification
         */
        async openRazorpayCheckoutForItem({ itemId, itemType = 'item', amountPaise = 100, title = 'XtraPath Creation', preferredMethod = null }, onUnlocked) {
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
                const uid = localStorage.getItem('userId') || 'usr_current_user';
                const finalPaise = Math.max(100, Math.round(Number(amountPaise) || 100));

                const orderRes = await fetch('/api/razorpay/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        itemId: String(itemId),
                        itemType: itemType,
                        amount: finalPaise,
                        currency: 'INR',
                        userId: uid
                    })
                });
                const orderData = await orderRes.json();
                const orderObj = orderData.order || orderData;

                const prefillData = {
                    email: localStorage.getItem('userEmail') || '',
                    name: localStorage.getItem('username') || ''
                };
                if (preferredMethod) {
                    prefillData.method = preferredMethod;
                }

                const cleanDesc = title ? (title.length > 36 ? title.slice(0, 33) + '…' : title) : 'Premium STEM Access';
                const options = {
                    key: config.keyId || config.key_id || 'rzp_test_xtrapath_dev',
                    amount: orderObj.amount || finalPaise,
                    currency: orderObj.currency || 'INR',
                    name: 'XtraPath',
                    description: cleanDesc,
                    order_id: orderObj.id,
                    handler: async function (response) {
                        const verifyRes = await fetch('/api/razorpay/verify-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                ...response,
                                userId: uid,
                                itemId: String(itemId),
                                itemType: itemType
                            })
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyData && verifyData.success) {
                            await PaymentManager.unlockItem(String(itemId));
                            await PaymentManager.verifyEntitlements(true);
                            if (typeof onUnlocked === 'function') onUnlocked();
                        }
                    },
                    prefill: prefillData,
                    theme: {
                        color: preferredMethod === 'card' ? '#2563eb' : '#059669',
                        backdrop_color: 'rgba(3, 7, 18, 0.85)'
                    },
                    modal: {
                        confirm_close: true,
                        animation: true,
                        backdropclose: false,
                        ondismiss: function () {
                            console.log('[Razorpay Checkout dismissed by user]');
                        }
                    }
                };

                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response) {
                    console.error('[Razorpay Payment Failed]:', response.error);
                    alert('Transaction Failed: ' + (response.error.description || 'Payment could not be processed'));
                });
                rzp.open();
            } catch (err) {
                console.error('[Razorpay Item Checkout Error]:', err);
                alert('Payment Gateway temporarily unavailable. Please try again.');
            }
        },

        /**
         * Checks URL search parameters for returning Stripe payments
         */
        async checkUrlPaymentReturn() {
            try {
                const params = new URLSearchParams(window.location.search);
                const sessionId = params.get('session_id');
                const itemId = params.get('item_id');
                if (sessionId) {
                    const res = await fetch(`/api/verify-checkout-session?session_id=${encodeURIComponent(sessionId)}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.success) {
                            if (itemId) await PaymentManager.unlockItem(itemId);
                            await PaymentManager.verifyEntitlements(true);
                            params.delete('session_id');
                            params.delete('payment_success');
                            params.delete('item_id');
                            const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
                            window.history.replaceState({}, document.title, newUrl);
                        }
                    }
                }
            } catch (err) {
                console.warn('[checkUrlPaymentReturn error]:', err);
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
                        await PaymentManager.unlockItem(itemId);
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
    window.openRazorpayCheckoutForItem = PaymentManager.openRazorpayCheckoutForItem.bind(PaymentManager);
    window.checkUrlPaymentReturn = PaymentManager.checkUrlPaymentReturn.bind(PaymentManager);
    window.fetchPayPalConfig = PaymentManager.fetchPayPalConfig.bind(PaymentManager);
    window.loadPayPalSdk = PaymentManager.loadPayPalSdk.bind(PaymentManager);
    window.savePayPalAccount = PaymentManager.savePayPalAccount.bind(PaymentManager);
    window.createPayPalOrder = PaymentManager.createPayPalOrder.bind(PaymentManager);
    window.capturePayPalOrder = PaymentManager.capturePayPalOrder.bind(PaymentManager);
    window.verifyEntitlements = PaymentManager.verifyEntitlements.bind(PaymentManager);

    // Automatically verify entitlements & handle payment redirect returns on load
    if (typeof window !== 'undefined') {
        const initChecks = () => {
            PaymentManager.verifyEntitlements().catch(() => {});
            PaymentManager.checkUrlPaymentReturn().catch(() => {});
        };
        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', initChecks);
        } else {
            initChecks();
        }
    }

})(typeof window !== 'undefined' ? window : this);
