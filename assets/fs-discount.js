/* Free Spirited — cart discount code input (minicart)
 * Standalone. Does not modify global.js. Pairs with cart-mode.js.
 *
 * Mechanism:
 *   Apply : GET /discount/{code}?redirect=/cart.js  -> sets discount + returns cart JSON.
 *           Shopify accepts unknown codes into the cookie but marks them
 *           applicable:false, so we validate against cart.discount_codes.
 *   Remove: GET /discount/?redirect=/cart.js         -> clears the applied discount.
 *           (Shopify has no clean AJAX "remove code" endpoint; clearing is the
 *           supported workaround.)
 *
 * Re-render reuses the theme's "ajax-cart" section, exactly like cart-mode.js,
 * so the drawer's applied-code chip + subtotal refresh from Liquid.
 *
 * NOTE on customer-specific codes (FB-EMAIL-*):
 *   Shopify only enforces customer eligibility once the visitor is LOGGED IN.
 *   Verified on this store: anonymous -> applicable:true (leak), logged in with
 *   the assigned email -> true, logged in with another email -> false. So the
 *   theme's only job is to force a login before such a code can be applied;
 *   after that Shopify's own `applicable` flag is trustworthy and the existing
 *   applicable:false handling in applyDiscount rejects the wrong customer.
 *   Codes are recognised by a `prefix` entry in the coupon rules metafield.
 *
 * NOTE on Insider mode:
 *   The Shopify cart holds FULL price on variant.price, so Shopify computes the
 *   discount against FULL price. In Insider mode that figure is wrong for display.
 *   recalcInsiderDiscount() is the hook to override the displayed discount/subtotal
 *   using the insider metafield math — wire it once the subtotal markup is final.
 */
(function () {
  var SECTION = 'ajax-cart';

  function cfg() {
    return window.FS_INSIDER || { mode: 'insider' };
  }
  function currentMode() {
    return (cfg().mode) || 'insider';
  }

  // Customer context, emitted once in the layout (window.FS_CUSTOMER) so it is
  // available in both cart modes, not just the Insider summary block.
  function customer() {
    var c = window.FS_CUSTOMER || {};
    return {
      loggedIn: !!c.loggedIn,
      email: String(c.email || '').toLowerCase(),
      loginUrl: c.loginUrl || '/account/login'
    };
  }

  // When true, our own DOM writes (chip render / recalc) are in progress and the
  // MutationObserver must ignore them — otherwise they retrigger the observer and
  // loop, fetching /cart.js forever.
  var _selfUpdating = false;

  // The code that was last rejected, plus the message shown for it. Kept in
  // memory because renderChip/renderInput rebuild the whole block and would
  // otherwise wipe both. The customer must still see WHICH code failed —
  // especially when it was applied automatically after login and they never
  // typed it themselves.
  var _rejectedCode = '';
  var _rejectedMsg = '';

  // Why an applied code is currently earning nothing. Survives re-renders for the
  // same reason the rejected code does: the block is rebuilt from scratch.
  var _hintMsg = '';

  /* ---------------- apply / remove ---------------- */

  function applyDiscount(code) {
    code = (code || '').trim();
    if (!code) return Promise.resolve({ ok: false, reason: 'empty' });

    // Customer-specific codes: block the request entirely until the visitor is
    // logged in. Shopify would happily accept the code anonymously (applicable
    // comes back true), which lets one person's code be redeemed by anyone.
    _rejectedCode = '';
    _rejectedMsg = '';

    var gate = findRuleByCode(getCouponRules(), code);
    if (gate && gate.requiresLogin && !customer().loggedIn) {
      clearError();
      showLoginRequired(code);
      return Promise.resolve({ ok: false, reason: 'login_required' });
    }

    setLoading(true);
    clearError();

    // redirect=/cart.js makes the discount endpoint return cart JSON directly.
    return fetch('/discount/' + encodeURIComponent(code) + '?redirect=/cart.js', {
      headers: { 'Accept': 'application/json' }
    })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        var applied = (cart.discount_codes || []).find(function (d) {
          return d.code && d.code.toLowerCase() === code.toLowerCase();
        });
        // applicable can be false (invalid / doesn't meet conditions / expired)
        if (!applied || applied.applicable === false) {
          setLoading(false);
          _rejectedCode = code;
          showError(discountErrorText(applied, code));
          fillInput(code);
          // clear the bad code so it doesn't linger in the cookie
          return clearDiscount(true).then(function () { return { ok: false, reason: 'not_applicable' }; });
        }
        return refreshFromCart().then(function () {
          setLoading(false);
          return { ok: true, cart: cart };
        });
      })
      .catch(function (e) {
        console.error('[fs] applyDiscount failed', e);
        setLoading(false);
        showError('Something went wrong. Please try again.');
        return { ok: false, reason: 'network' };
      });
  }

  function clearDiscount(silent) {
    setDiscountHint('');
    if (!silent) { setLoading(true); clearError(); }
    // Confirmed on this store: /cart/update.js with an empty `discount` string
    // removes the code. (discount_codes:[] and expiring the cookie both fail —
    // the code lives in a session discount, not the cart-level discount object.)
    return fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ discount: '' })
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        // Belt and braces for the CC redirect: expiring this cookie does NOT
        // remove the discount from the Shopify cart (see above), but it does stop
        // anything that reads document.cookie from forwarding a dead code to CC.
        document.cookie = 'discount_code=; Max-Age=0; path=/';
        if (silent) return;
        return refreshFromCart().then(function () { setLoading(false); });
      })
      .catch(function (e) {
        console.error('[fs] clearDiscount failed', e);
        if (!silent) setLoading(false);
      });
  }

  function discountErrorText(applied, code) {
    if (!applied) return 'Discount code isn\u2019t valid.';
    // Shopify doesn't tell us why. For a customer-specific code the realistic
    // cause is that the code belongs to another account, so say that instead.
    var rule = findRuleByCode(getCouponRules(), code);
    if (rule && rule.requiresLogin) {
      return 'This code is linked to a different account.';
    }
    return 'This code can\u2019t be applied to your cart.';
  }

  /* ---------------- re-render (mirrors cart-mode.js) ---------------- */

  function refreshFromCart() {
    // Ask the theme to re-render the drawer section with the new discount state.
    return fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ sections: [SECTION] })
    })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        rerenderDrawer(cart);
        return cart;
      });
  }

  function rerenderDrawer(cart) {
    if (cart && cart.sections && cart.sections[SECTION]) {
      var parsed = new DOMParser().parseFromString(cart.sections[SECTION], 'text/html');
      var fresh = parsed.querySelector('[data-cart-drawer]');
      var current = document.querySelector('[data-cart-drawer]');
      if (fresh && current) current.innerHTML = fresh.innerHTML;
    }

    if (typeof sideDrawerInt === 'function') sideDrawerInt();
    var body = document.querySelector('[data-cart-drawer-body]') || document;
    if (typeof quantitySelectors === 'function') quantitySelectors(body);
    if (typeof cartItemRemoveElements === 'function') cartItemRemoveElements(document);
    if (typeof cartDrawerNoteInit === 'function') cartDrawerNoteInit();

    // Insider display correction hook (see note at top).
    recalcInsiderDiscount(cart);

    // The Liquid `applied_code` is always empty: codes applied via /discount/{code}
    // don't surface in cart.discount_codes when the section is server-rendered
    // (it comes back null). So the applied-code chip + remove button must be built
    // client-side from /cart.js, which DOES see the code.
    syncDiscountUI();
  }

  /* ---------------- applied-code chip + remove (client-side) ---------------- */
  // cart.discount_codes is null in Liquid section renders, so we render the
  // "applied" state from /cart.js instead of relying on {% if applied_code %}.
  function syncDiscountUI(done) {
    if (typeof done !== 'function') done = function () {};
    var root = document.querySelector('[data-fs-discount]');
    if (!root) { done(); return; }

    fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        var applied = (cart.discount_codes || []).find(function (d) {
          return d && d.applicable;
        });
        // Re-query: rerenderDrawer may have replaced the node since the fetch started.
        var el = document.querySelector('[data-fs-discount]');
        if (!el) { done(); return; }
        if (applied) {
          renderChip(el, applied.code);
        } else {
          renderInput(el);
        }
        // Insider mode: if the applied code isn't verifiable (e.g. under min on
        // the Insider subtotal), hide its chip too — show nothing at all.
        hideUnverifiedChips();
        done();
      })
      .catch(function (e) {
        console.error('[fs] syncDiscountUI failed', e);
        done();
      });
  }

  // Hide the applied-code chip when its code couldn't be verified in Insider mode
  // (populated by recalcInsiderDiscount -> window.__fsUnverifiedCodes).
  function hideUnverifiedChips() {
    if (currentMode() !== 'insider') return;
    var unverified = window.__fsUnverifiedCodes || [];
    var root = document.querySelector('[data-fs-discount]');
    if (!root) return;
    var applied = root.querySelector('.fs-discount__applied');
    if (!applied) return;
    var codeEl = applied.querySelector('.fs-discount__code');
    var code = codeEl ? codeEl.textContent.trim().toLowerCase() : '';
    if (code && unverified.indexOf(code) !== -1) {
      applied.hidden = true;
      applied.classList.add('hidden');
    } else {
      applied.hidden = false;
      applied.classList.remove('hidden');
    }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderChip(root, code) {
    var safe = esc(code);
    root.innerHTML =
      '<div class="fs-discount__applied" role="status">' +
        '<button type="button" class="fs-discount__remove button" data-fs-discount-remove ' +
          'aria-label="Remove discount code ' + safe + '">' +
          '<span class="fs-discount__chip">' +
            '<span class="fs-discount__code">' + safe + '</span>' +
          '</span>' +
          '<svg class="drawer-close-icon2" x="0px" y="0px" viewBox="0 0 11.8 11.8" ' +
            'style="enable-background:new 0 0 11.8 11.8;" fill="currentColor">' +
            '<path d="M11.5,10.6L6.7,5.9l4.7-4.7c0.2-0.2,0.2-0.6,0-0.8c-0.1-0.1-0.3-0.2-0.4-0.2c0,0,0,0,0,0c-0.2,0-0.3,0.1-0.4,0.2L5.9,5.1L1.2,0.3c-0.2-0.2-0.6-0.2-0.8,0c-0.2,0.2-0.2,0.6,0,0.8l4.7,4.7l-4.7,4.7c-0.1,0.1-0.2,0.3-0.2,0.4c0,0.3,0.3,0.6,0.6,0.6c0.2,0,0.3-0.1,0.4-0.2l4.7-4.7l4.7,4.7c0.1,0.1,0.3,0.2,0.4,0.2s0.3-0.1,0.4-0.2C11.7,11.3,11.7,10.9,11.5,10.6z"></path>' +
          '</svg>' +
        '</button>' +
      '</div>' +
      // Keep the input so the customer can try a different code (applying a new
      // one replaces the current code — Shopify holds a single session discount).
      '<div class="fs-discount__form">' +
        '<label class="visually-hidden" for="fs-discount-input">Discount code</label>' +
        '<input type="text" id="fs-discount-input" class="fs-discount__input" ' +
          'data-fs-discount-input placeholder="Discount code" autocomplete="off" ' +
          'autocapitalize="characters" spellcheck="false">' +
        '<button type="button" class="fs-discount__apply button" data-fs-discount-apply>Apply</button>' +
      '</div>' +
      '<p class="fs-discount__error" data-fs-discount-error hidden></p>';
    restoreRejected();
  }

  function renderInput(root) {
    // Only rebuild if it isn't already showing the input (avoid clobbering focus).
    if (root.querySelector('[data-fs-discount-input]')) return;
    root.innerHTML =
      '<div class="fs-discount__form">' +
        '<label class="visually-hidden" for="fs-discount-input">Discount code</label>' +
        '<input type="text" id="fs-discount-input" class="fs-discount__input" ' +
          'data-fs-discount-input placeholder="Discount code" autocomplete="off" ' +
          'autocapitalize="characters" spellcheck="false">' +
        '<button type="button" class="fs-discount__apply button" data-fs-discount-apply>Apply</button>' +
      '</div>' +
      '<p class="fs-discount__error" data-fs-discount-error hidden></p>';
    restoreRejected();
  }

  // Put the rejected code back in the field and re-show its message. Called
  // after any rebuild of the block.
  function restoreRejected() {
    renderHint();
    if (_rejectedCode) fillInput(_rejectedCode);
    if (_rejectedMsg) {
      var el = errorEl();
      if (el) {
        el.innerHTML = _rejectedMsg;
        el.hidden = false;
      }
    }
  }

  function fillInput(code) {
    var i = input();
    if (i) i.value = code || '';
  }

  // A code that is applied but earning nothing used to just vanish: row hidden,
  // chip hidden, no explanation. The customer sees their code accepted and no
  // discount, with nothing to act on. This says what is missing.
  function setDiscountHint(msg) {
    _hintMsg = msg || '';
    renderHint();
  }

  function renderHint() {
    var el = hintEl(!!_hintMsg);
    if (!el) return;
    if (_hintMsg) {
      el.textContent = _hintMsg;
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  }

  /* ---------------- checkout gate (what CC is allowed to charge) ---------------- */
  // The CC redirect used to read the `discount_code` cookie and forward it as
  // couponCode. Shopify's /discount/ endpoint sets that cookie even when it
  // REJECTS the code, so a code refused for belonging to another customer was
  // still charged at CC — CC does not re-validate customer eligibility.
  //
  // Scope is deliberately narrow. CC has the ordinary codes synced with their own
  // minimums and enforces them itself, so those need no gate here: if CC won't
  // honour one, it simply doesn't apply it. The gap is customer-specific codes,
  // which only Shopify can judge. So:
  //   - Shopify says applicable:false  -> never forward (this was the bug)
  //   - requiresLogin code, no session -> never forward (Shopify couldn't check)
  //   - anything else applicable       -> forward, CC applies its own rules
  function checkoutCoupon() {
    return fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        var codes = (cart.discount_codes || []).filter(function (d) {
          return d.applicable !== false && d.code;
        });
        if (!codes.length) return null;

        var rules = getCouponRules();
        var loggedIn = customer().loggedIn;

        for (var i = 0; i < codes.length; i++) {
          var code = codes[i].code;
          var rule = findRuleByCode(rules, code);
          // Personal code without a logged-in customer: applicable:true means
          // nothing here, Shopify returns true for anonymous visitors.
          if (rule && rule.requiresLogin && !loggedIn) continue;
          return code;
        }
        return null;
      })
      .catch(function (e) {
        // Network failure on the gate: send no coupon rather than an unchecked
        // one. The customer can re-apply it at CC.
        console.error('[fs] checkoutCoupon failed, sending no coupon', e);
        return null;
      });
  }

  /* ---------------- shared verification ---------------- */
  // ONE implementation of "will CC actually charge this discount?", used by both
  // the drawer display and the checkout gate. Keeping them separate is how the
  // theme ends up showing one thing and sending another.
  //
  // Returns { perRow: [{ verified, amount, reason?, shortfall? }], totalDiscount }
  // indexed to match `apps`.
  function evaluateApplications(apps, insiderSubtotal, rules) {
    var remaining = insiderSubtotal;
    var totalDiscount = 0;
    var perRow = [];
    var cust = customer();

    apps.forEach(function (app) {
      var rule = findRule(rules, app);

      // Customer-specific code with no logged-in customer: Shopify cannot have
      // checked eligibility, so we cannot trust it either. Covers the case where
      // the code was applied while logged in and the customer then logged out.
      if (rule && rule.requiresLogin && !cust.loggedIn) {
        perRow.push({ verified: false, amount: 0, reason: 'login_required' });
        return;
      }

      // Percentage with no condition: always verifiable — % applies to the
      // Insider subtotal the same way it would at CC. No minimum to fail.
      if (app.valueType === 'percentage' && !hasCondition(rule)) {
        var pct = parseFloat(app.value) || 0;
        var amt = Math.max(0, Math.min(Math.round(remaining * pct / 100), remaining));
        perRow.push({ verified: true, amount: amt });
        totalDiscount += amt;
        remaining -= amt;
        return;
      }

      // Everything else (fixed_amount, anything with a minimum, customer-specific)
      // needs a rule we can check against the Insider subtotal. Without one we
      // cannot confirm CC will apply it, so we DO NOT display it.
      // A rule may omit type/value (FB-EMAIL codes each carry their own value,
      // which Shopify already reports) — applyRule falls back to the application.
      if (rule) {
        var res = applyRule(rule, remaining, app);
        if (res.eligible) {
          perRow.push({ verified: true, amount: res.amount });
          totalDiscount += res.amount;
          remaining -= res.amount;
        } else {
          // Under minimum on the Insider subtotal → hide + optional upsell.
          perRow.push({ verified: false, amount: 0, shortfall: res.shortfall });
        }
        return;
      }

      // No rule, not a plain percentage → unverifiable → hide.
      perRow.push({ verified: false, amount: 0 });
    });

    return { perRow: perRow, totalDiscount: totalDiscount };
  }

  /* ---------------- Insider discount display ---------------- */
  // In Insider mode the Shopify cart holds FULL price, so Shopify's discount
  // amount is wrong. Recompute the discount against the insider subtotal (read
  // from [data-fs-discount-data], emitted by the Liquid summary block) and write
  // the corrected figures into the drawer's discount row(s) + total.
  // Reads the Liquid-emitted Insider summary payload. Returns null when it is
  // absent or not an Insider payload — callers must treat null as "cannot
  // verify anything".
  function insiderData() {
    var dataEl = document.querySelector('[data-fs-discount-data]');
    if (!dataEl) return null;
    var data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { return null; }
    if (!data || data.mode !== 'insider') return null;
    return data;
  }

  function recalcInsiderDiscount(cart) {
    // Full price mode: Shopify's own figures are correct there, and any Insider
    // shortfall hint is meaningless — clear it rather than leave it stale.
    if (currentMode() !== 'insider') { setDiscountHint(''); return; }

    var data = insiderData();
    if (!data) return;

    var insiderSubtotal = parseInt(data.insiderSubtotal, 10) || 0; // cents, pre-discount
    var apps = data.applications || [];

    // Coupon rules the theme can verify itself: min-purchase, type, value, and
    // whether the code is customer-specific (requiresLogin). Read from the shop
    // metafield custom.coupon_rules. A code with no rule here is only verifiable
    // when it is an unconditional percentage.
    var rules = getCouponRules();

    var evaluated = evaluateApplications(apps, insiderSubtotal, rules);
    var perRow = evaluated.perRow;
    var totalDiscount = evaluated.totalDiscount;

    setDiscountHint(hintFor(apps, perRow));

    // Write each discount row: show verified amounts, hide unverifiable ones.
    // Also collect the codes we could NOT verify so the applied-code chip for
    // them gets hidden too (an unverifiable code shows nothing at all in Insider).
    var unverifiedCodes = [];
    var rows = document.querySelectorAll('[data-insider-discount-row]');
    rows.forEach(function (row) {
      var idx = parseInt(row.getAttribute('data-discount-index'), 10) || 0;
      var entry = perRow[idx];
      var amountEl = row.querySelector('[data-insider-discount-amount]');

      if (entry && entry.verified) {
        row.hidden = false;
        row.classList.remove('hidden');
        if (amountEl) amountEl.textContent = '-' + money(entry.amount);
      } else {
        // Not verifiable (e.g. under the minimum on the Insider subtotal) → hide
        // the row entirely; don't promise a discount CC won't charge.
        row.hidden = true;
        row.classList.add('hidden');
        if (amountEl) amountEl.textContent = '';
        var app = apps[idx];
        if (app && (app.title || app.code)) {
          unverifiedCodes.push((app.title || app.code).toLowerCase());
        }
      }
    });

    // Expose unverified codes so syncDiscountUI hides their chips in Insider mode.
    window.__fsUnverifiedCodes = unverifiedCodes;
    hideUnverifiedChips();

    // Insider total = subtotal minus only the VERIFIED discounts.
    var totalEl = document.querySelector('[data-cart-total][data-insider-total]');
    if (totalEl) {
      var finalTotal = Math.max(0, insiderSubtotal - totalDiscount);
      totalEl.textContent = money(finalTotal);
      totalEl.setAttribute('data-insider-total-final', finalTotal);
    }
  }

  // First applied code that is accepted but not earning anything, phrased as the
  // thing the customer can do about it. Shortfall is measured on the Insider
  // subtotal, which is the basis CC charges on — so the number is the real gap,
  // not the full-price one Shopify would quote.
  function hintFor(apps, perRow) {
    for (var i = 0; i < perRow.length; i++) {
      var entry = perRow[i];
      if (!entry || entry.verified) continue;

      var app = apps[i] || {};
      var code = String(app.title || app.code || '').toUpperCase();

      if (entry.shortfall > 0) {
        return 'Add ' + money(entry.shortfall) + ' more to use ' + (code || 'this code') + '.';
      }
      if (entry.reason === 'login_required') {
        return 'Log in to use ' + (code || 'this code') + '.';
      }
    }
    return '';
  }

  /* ---------------- coupon rules (metaobject-driven, step 2) ---------------- */
  // Reads a JSON list of rules the theme can verify. Emitted in Liquid from a
  // metaobject/metafield (see fs-coupon-rules). Shape per entry:
  //   { code, min (cents), type: 'fixed'|'percent', value (cents or %) }
  function getCouponRules() {
    var el = document.querySelector('[data-fs-coupon-rules]');
    if (!el) return [];
    try { return JSON.parse(el.textContent) || []; } catch (e) { return []; }
  }

  function findRule(rules, app) {
    // Match by title (Shopify exposes the code as the application title).
    return findRuleByCode(rules, app.title || app.code || '');
  }

  // Exact `code` match wins over a `prefix` match, so one FB-EMAIL code can be
  // given its own entry (with its own min/value) while the rest fall back to
  // the shared prefix rule.
  function findRuleByCode(rules, code) {
    if (!rules || !rules.length) return null;
    var wanted = String(code || '').trim().toLowerCase();
    if (!wanted) return null;
    var i;
    for (i = 0; i < rules.length; i++) {
      if (rules[i].code && String(rules[i].code).trim().toLowerCase() === wanted) return rules[i];
    }
    for (i = 0; i < rules.length; i++) {
      var pre = rules[i].prefix ? String(rules[i].prefix).trim().toLowerCase() : '';
      if (pre && wanted.indexOf(pre) === 0) return rules[i];
    }
    return null;
  }

  function hasCondition(rule) {
    // A percentage code is only "unconditional" if there's no matching rule
    // that imposes a minimum. If a rule exists with a min > 0, treat as conditional.
    return !!(rule && parseInt(rule.min, 10) > 0);
  }

  function applyRule(rule, remaining, app) {
    var min = parseInt(rule.min, 10) || 0;
    if (remaining < min) {
      return { eligible: false, amount: 0, shortfall: min - remaining };
    }

    // Rule values win. When the rule has none, use what Shopify reported for
    // this application (correct for prefix rules covering many one-off codes).
    var type = rule.type;
    var value = rule.value;
    if (!type) {
      type = (app && app.valueType === 'percentage') ? 'percent' : 'fixed';
      value = app ? app.value : 0;
    }
    if (value === null || typeof value === 'undefined' || value === '') {
      return { eligible: false, amount: 0, shortfall: 0 };
    }

    var amount = 0;
    if (type === 'percent') {
      amount = Math.round(remaining * (parseFloat(value) || 0) / 100);
    } else { // 'fixed' — value in cents
      amount = parseInt(value, 10) || 0;
    }
    amount = Math.max(0, Math.min(amount, remaining));
    return { eligible: true, amount: amount };
  }

  /* ---------------- money formatting ---------------- */
  // Uses the theme's money format if available; falls back to $X.XX.
  function money(cents) {
    cents = parseInt(cents, 10) || 0;
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      var fmt = (window.theme && window.theme.moneyFormat) || '${{amount}}';
      return window.Shopify.formatMoney(cents, fmt);
    }
    return '$' + (cents / 100).toFixed(2);
  }

  /* ---------------- UI helpers ---------------- */

  function root() { return document.querySelector('[data-fs-discount]'); }
  function input() { var r = root(); return r && r.querySelector('[data-fs-discount-input]'); }
  function errorEl() { var r = root(); return r && r.querySelector('[data-fs-discount-error]'); }

  // Progress hint ("Add $5.00 more to use 10OFFVIP"). Lives in the Liquid markup
  // if a [data-fs-discount-hint] element is provided, otherwise it is appended to
  // the block so this works without touching the section.
  function hintEl(create) {
    var r = root();
    if (!r) return null;
    var el = r.querySelector('[data-fs-discount-hint]');
    if (el || !create) return el;
    el = document.createElement('p');
    el.className = 'fs-discount__hint';
    el.setAttribute('data-fs-discount-hint', '');
    el.hidden = true;
    r.appendChild(el);
    return el;
  }

  function setLoading(on) {
    var r = root(); if (!r) return;
    r.classList.toggle('is-loading', !!on);
    var btn = r.querySelector('[data-fs-discount-apply]');
    if (btn) btn.disabled = !!on;
  }
  function showError(msg) {
    _rejectedMsg = esc(msg);
    var el = errorEl(); if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }
  function clearError() {
    _rejectedMsg = '';
    var el = errorEl(); if (!el) return;
    el.textContent = '';
    el.hidden = true;
  }

  // Personal codes need an account. New customer accounts are hosted on
  // shopify.com, and on success Shopify returns the visitor to the storefront
  // HOME page (…/?country=US&shop_sign_in=true) — not to the cart — so the code
  // cannot travel in a return_url. Park it in localStorage and let the login
  // happen in this tab; applyPendingCodeAfterLogin picks it up on the way back.
  function showLoginRequired(code) {
    setPendingCode(code);
    var el = errorEl(); if (!el) return;
    el.innerHTML = 'This code is linked to your email. ' +
      '<a class="fs-discount__login" href="' + esc(customer().loginUrl) + '">Log in</a>' +
      ' \u2014 we\u2019ll apply it for you straight after.';
    el.hidden = false;
    _rejectedCode = code;
    _rejectedMsg = el.innerHTML;
    fillInput(code);
  }

  /* ---------------- pending code across the login round-trip ---------------- */

  var PENDING_KEY = 'fs_pending_discount';
  var PENDING_TTL = 30 * 60 * 1000; // 30 min — long enough for an email OTP

  function setPendingCode(code) {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify({ code: code, at: Date.now() }));
    } catch (e) { /* private mode / storage disabled: feature degrades to retyping */ }
  }

  function readPendingCode() {
    var raw;
    try { raw = localStorage.getItem(PENDING_KEY); } catch (e) { return null; }
    if (!raw) return null;
    var entry;
    try { entry = JSON.parse(raw); } catch (e) { clearPendingCode(); return null; }
    if (!entry || !entry.code) { clearPendingCode(); return null; }
    if (Date.now() - (parseInt(entry.at, 10) || 0) > PENDING_TTL) {
      clearPendingCode();
      return null;
    }
    return entry.code;
  }

  function clearPendingCode() {
    try { localStorage.removeItem(PENDING_KEY); } catch (e) {}
  }

  // window.FS_CUSTOMER comes from Liquid, so it is stale on a page that was
  // rendered before the visitor logged in elsewhere. Ask the server instead.
  // /account is no good here: with new customer accounts it redirects to
  // shopify.com (cross-origin, unreadable), so use the cart's own JSON view.
  function fetchLoginState() {
    return fetch('/cart?view=meta-data', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) { return !!(d && d.customer_logged_in); })
      .catch(function () { return false; });
  }

  var _loginWatch = false;

  // The login tab can't talk to this one, so re-check whenever the visitor
  // returns to this tab. A reload is deliberate: FS_CUSTOMER and the Liquid
  // summary both need to be re-rendered as a logged-in customer.
  function watchForLogin() {
    if (_loginWatch) return;
    _loginWatch = true;

    function recheck() {
      if (!readPendingCode()) return;
      if (customer().loggedIn) return;
      fetchLoginState().then(function (loggedIn) {
        if (loggedIn) window.location.reload();
      });
    }

    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) recheck();
    });
    // Back button: the page can come out of the back/forward cache without
    // re-running init(), and its cached FS_CUSTOMER still says logged out.
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) recheck();
    });
  }

  /* ---------------- event wiring (delegated, survives re-render) ---------------- */

  document.addEventListener('click', function (e) {
    var applyBtn = e.target.closest('[data-fs-discount-apply]');
    if (applyBtn) {
      e.preventDefault();
      var i = input();
      if (i) applyDiscount(i.value);
      return;
    }
    var removeBtn = e.target.closest('[data-fs-discount-remove]');
    if (removeBtn) {
      e.preventDefault();
      clearDiscount(false);
    }
  });

  // Typing invalidates the rejected state: from here the field is theirs again.
  document.addEventListener('input', function (e) {
    if (!e.target.closest('[data-fs-discount-input]')) return;
    _rejectedCode = '';
    clearError();
  });

  // Enter key inside the input applies the code.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var i = e.target.closest('[data-fs-discount-input]');
    if (!i) return;
    e.preventDefault();
    applyDiscount(i.value);
  });

  /* ---------------- keep insider discount in sync on ANY drawer render ---------------- */
  // The drawer re-renders on its own for several reasons the discount code path
  // doesn't control: mode switch (cart-mode.js), quantity +/-, add/remove line.
  // None of those call recalcInsiderDiscount, so without this the insider discount
  // row stays on its "—" placeholder and the total isn't reduced. Watch the drawer
  // and re-run the recompute whenever the discount row (re)appears.
  function watchDrawerForDiscount() {
    var drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer) return;

    var scheduled = false;
    function schedule() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        // Guard: syncDiscountUI/recalc mutate the drawer (which this observer
        // watches). Without this flag those mutations re-trigger schedule() and
        // loop forever, hammering /cart.js. Suppress observer while we self-update.
        _selfUpdating = true;
        recalcInsiderDiscount();
        syncDiscountUI(function () {
          // Defer re-enabling to the next frame so the observer has drained the
          // mutations we just made before it starts watching for real changes again.
          requestAnimationFrame(function () { _selfUpdating = false; });
        });
      });
    }

    new MutationObserver(function () {
      if (_selfUpdating) return;                 // ignore our own DOM writes
      if (currentMode() !== 'insider') return;
      if (drawer.querySelector('[data-insider-discount-amount]')) schedule();
    }).observe(drawer, { childList: true, subtree: true });

    if (currentMode() === 'insider') schedule();
  }

  // A code parked before login gets applied on the first page load where the
  // visitor is logged in — which is the home page, since that is where Shopify
  // drops them. If they are still anonymous, keep watching this tab (covers a
  // visitor who opened the login link in a new tab themselves).
  function applyPendingCodeAfterLogin() {
    var code = readPendingCode();
    if (!code) return;
    if (!customer().loggedIn) { watchForLogin(); return; }

    clearPendingCode();

    // They land on the home page with no idea the code was even attempted, so
    // open the cart first: the result — chip or error — has to be visible either
    // way, not just on success. Applying regardless of whether the open actually
    // succeeded means a missing drawer never swallows the code.
    if (returnedFromLogin()) {
      openCartDrawer().then(function () { applyDiscount(code); });
      return;
    }

    applyDiscount(code);
  }

  // Shopify does NOT return the visitor to the storefront after login: they are
  // left on shopify.com/{store_id}/account/orders and have to come back on their
  // own. The store link on that page carries shop_sign_in=true, so this is a
  // useful hint that they just signed in — but only a hint. The code is applied
  // on any page load once logged in, param or not.
  function returnedFromLogin() {
    try {
      return new URLSearchParams(window.location.search).get('shop_sign_in') === 'true';
    } catch (e) {
      return false;
    }
  }

  var CART_DRAWER_ID = 'cart-side-drawer';

  function cartDrawerIsOpen() {
    var panel = document.getElementById(CART_DRAWER_ID);
    return !!(panel && panel.classList.contains('show'));
  }

  // Resolves once the drawer is actually open, so callers never have to guess a
  // delay: sideDrawerInt's animation timing, a slow render or a late listener
  // binding would all break a fixed setTimeout.
  function openCartDrawer() {
    if (cartDrawerIsOpen()) return Promise.resolve(true);

    var panel = document.getElementById(CART_DRAWER_ID);
    if (!panel) return Promise.resolve(false);

    // sideDrawerInt() in global.js binds the open handler to
    // [data-sidedrawer-button] and reads data-id to pick the panel, so clicking
    // the real trigger is preferable: it also does the slick refresh and focus
    // trap that a manual open would skip.
    var trigger = document.querySelector('[data-sidedrawer-button][data-id="' + CART_DRAWER_ID + '"]');
    if (trigger) trigger.click();

    // The click is a no-op if sideDrawerInt() hasn't bound its listener yet — it
    // runs on DOMContentLoaded, same as this file, so the order isn't guaranteed.
    // Watch for the class instead of assuming, and only force the open if the
    // theme genuinely never got there.
    return waitForDrawerOpen(panel, 1200).then(function (opened) {
      if (opened) return true;
      forceOpenCartDrawer();
      return waitForDrawerOpen(panel, 1200);
    });
  }

  // Watches the panel's class list for `show`. Resolves true on open, false if
  // the deadline passes — the deadline only bounds how long we wait before
  // falling back, it never cuts off an open that already happened.
  function waitForDrawerOpen(panel, deadline) {
    if (panel.classList.contains('show')) return Promise.resolve(true);

    return new Promise(function (resolve) {
      var done = false;
      function finish(value) {
        if (done) return;
        done = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(value);
      }

      var observer = new MutationObserver(function () {
        if (panel.classList.contains('show')) finish(true);
      });
      observer.observe(panel, { attributes: true, attributeFilter: ['class'] });

      var timer = setTimeout(function () { finish(panel.classList.contains('show')); }, deadline);
    });
  }

  // Reproduce the display/class sequence sideDrawerInt uses (display first,
  // .show after, so the CSS transition runs).
  function forceOpenCartDrawer() {
    var panel = document.getElementById(CART_DRAWER_ID);
    if (!panel) return;
    document.body.classList.add('no-scroll');
    panel.style.display = 'flex';
    setTimeout(function () { panel.classList.add('show'); }, 50);
  }

  function init() {
    watchDrawerForDiscount();
    syncDiscountUI();
    applyPendingCodeAfterLogin();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // expose for debugging / manual calls (and so cart-mode.js can trigger it after a mode switch)
  window.fsApplyDiscount = applyDiscount;
  window.fsClearDiscount = clearDiscount;
  window.fsRecalcInsiderDiscount = recalcInsiderDiscount;
  window.fsSyncDiscountUI = syncDiscountUI;
  // Used by the CC redirect script (snippets/redirect-cart.liquid) to decide
  // which coupon, if any, may be forwarded to Checkout Champ.
  window.fsCheckoutCoupon = checkoutCoupon;
})();