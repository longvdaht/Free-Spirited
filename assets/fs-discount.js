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

  /* ---------------- apply / remove ---------------- */

  function applyDiscount(code) {
    code = (code || '').trim();
    if (!code) return Promise.resolve({ ok: false, reason: 'empty' });

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
          showError(discountErrorText(applied));
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
    if (!silent) { setLoading(true); clearError(); }
    return fetch('/discount/?redirect=/cart.js', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function () {
        if (silent) return;
        return refreshFromCart().then(function () { setLoading(false); });
      })
      .catch(function (e) {
        console.error('[fs] clearDiscount failed', e);
        if (!silent) setLoading(false);
      });
  }

  function discountErrorText(applied) {
    if (!applied) return 'Discount code isn\u2019t valid.';
    // Shopify doesn't tell us why; keep it generic but honest.
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
  }

  /* ---------------- Insider discount display ---------------- */
  // In Insider mode the Shopify cart holds FULL price, so Shopify's discount
  // amount is wrong. Recompute the discount against the insider subtotal (read
  // from [data-fs-discount-data], emitted by the Liquid summary block) and write
  // the corrected figures into the drawer's discount row(s) + total.
  function recalcInsiderDiscount(cart) {
    if (currentMode() !== 'insider') return;

    var dataEl = document.querySelector('[data-fs-discount-data]');
    if (!dataEl) return;

    var data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
    if (!data || data.mode !== 'insider') return;

    var insiderSubtotal = parseInt(data.insiderSubtotal, 10) || 0; // cents, pre-discount
    var apps = data.applications || [];

    // Coupon rules the theme can verify itself (min-purchase, type, value).
    // Empty for now — populated from a metaobject/metafield in step 2. Until a
    // code has a rule here, only unconditional percentage codes are verifiable.
    var rules = getCouponRules();

    // Per application: decide whether we can VERIFY the discount will actually
    // be charged. Client rule: never show a discount CC won't charge. If we
    // can't verify, hide that row and don't subtract it from the total.
    var remaining = insiderSubtotal;
    var totalDiscount = 0;
    var perRow = []; // { verified: bool, amount: cents }

    apps.forEach(function (app) {
      var rule = findRule(rules, app);

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
      if (rule && rule.type) {
        var res = applyRule(rule, remaining);
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

    // Write each discount row: show verified amounts, hide unverifiable ones.
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
        // Not verifiable → hide the discount row entirely (don't promise it).
        row.hidden = true;
        row.classList.add('hidden');
        if (amountEl) amountEl.textContent = '';
      }
    });

    // Insider total = subtotal minus only the VERIFIED discounts.
    var totalEl = document.querySelector('[data-cart-total][data-insider-total]');
    if (totalEl) {
      var finalTotal = Math.max(0, insiderSubtotal - totalDiscount);
      totalEl.textContent = money(finalTotal);
      totalEl.setAttribute('data-insider-total-final', finalTotal);
    }
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
    if (!rules || !rules.length) return null;
    // Match by title (Shopify exposes the code as the application title).
    var code = (app.title || app.code || '').toLowerCase();
    for (var i = 0; i < rules.length; i++) {
      if ((rules[i].code || '').toLowerCase() === code) return rules[i];
    }
    return null;
  }

  function hasCondition(rule) {
    // A percentage code is only "unconditional" if there's no matching rule
    // that imposes a minimum. If a rule exists with a min > 0, treat as conditional.
    return !!(rule && parseInt(rule.min, 10) > 0);
  }

  function applyRule(rule, remaining) {
    var min = parseInt(rule.min, 10) || 0;
    if (remaining < min) {
      return { eligible: false, amount: 0, shortfall: min - remaining };
    }
    var amount = 0;
    if (rule.type === 'percent') {
      amount = Math.round(remaining * (parseFloat(rule.value) || 0) / 100);
    } else { // 'fixed' — value in cents
      amount = parseInt(rule.value, 10) || 0;
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

  function setLoading(on) {
    var r = root(); if (!r) return;
    r.classList.toggle('is-loading', !!on);
    var btn = r.querySelector('[data-fs-discount-apply]');
    if (btn) btn.disabled = !!on;
  }
  function showError(msg) {
    var el = errorEl(); if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }
  function clearError() {
    var el = errorEl(); if (!el) return;
    el.textContent = '';
    el.hidden = true;
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
        recalcInsiderDiscount();
      });
    }

    new MutationObserver(function () {
      if (currentMode() !== 'insider') return;
      if (drawer.querySelector('[data-insider-discount-amount]')) schedule();
    }).observe(drawer, { childList: true, subtree: true });

    if (currentMode() === 'insider') schedule();
  }

  function init() {
    watchDrawerForDiscount();
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
})();
