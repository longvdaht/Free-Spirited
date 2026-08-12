/* Free Spirited — cart pricing mode (Insider / Full price)
 * Standalone. Does not modify global.js.
 * Relies on window.FS_INSIDER (rendered in theme.liquid):
 *   { freeVariantId, freeProductId, mode }
 * Section id for the drawer is "ajax-cart".
 */
(function () {
  var SECTION = 'ajax-cart';

  function cfg() {
    return window.FS_INSIDER || { freeVariantId: null, freeProductId: null, mode: 'insider' };
  }

  function currentMode() {
    return cfg().mode || 'insider';
  }

  /* --- core: set mode + membership line in one /cart/update.js call --- */
  function applyMode(mode) {
    var c = cfg();
    var body = {
      attributes: { pricing_mode: mode },
      sections: [SECTION]
    };
    // Insider => ensure the $0 line (qty 1). Full => remove it (qty 0).
    // update.js with an updates map keyed by variant id will ADD the variant
    // if it isn't in the cart yet and qty > 0.
    if (c.freeVariantId) {
      body.updates = {};
      body.updates[c.freeVariantId] = (mode === 'insider') ? 1 : 0;
    }

    return fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        c.mode = mode;
        rerenderDrawer(cart);
        return cart;
      })
      .catch(function (e) { console.error('[fs] applyMode failed', e); });
  }

  /* --- fast path: last real product + membership removed in one request --- */
  // Theme markup for a line:
  //   <div data-cart-item> … <a data-remove-item data-line="2"
  //        href="/cart/change?id=46800214032583:hash&quantity=0">Remove</a> …
  // and cartItemRemoveElements() binds a click handler on each [data-remove-item]
  // that calls updateCartItem(line, 0, …).
  //
  // Removing the last real product means the membership has to go too. Letting
  // the theme handle the click and cleaning up afterwards costs two sequential
  // requests and two renders, which is the lag. Instead: intercept the click in
  // the CAPTURE phase (so the theme's own listener, bound on the element, never
  // fires), and zero both lines in a single /cart/update.js.
  var LINE_SEL = '[data-cart-item]';
  var REMOVE_SEL = '[data-remove-item]';

  // Variant id from the remove link's href: /cart/change?id=<variantId>:<key>
  function variantIdOf(itemEl) {
    var link = itemEl.querySelector(REMOVE_SEL);
    if (!link) return null;
    var m = (link.getAttribute('href') || '').match(/[?&]id=(\d+)/);
    return m ? m[1] : null;
  }

  // Given an element inside a cart line, decide whether removing that line would
  // leave the membership stranded. Returns the ids/elements needed to do both in
  // one request, or null when this isn't that situation.
  function lastRealLineFor(el) {
    var c = cfg();
    if (!c.freeVariantId) return null;

    var drawer = document.getElementById('cart-side-drawer');
    if (!drawer || !drawer.contains(el)) return null;

    var item = el.closest(LINE_SEL);
    if (!item) return null;

    var freeId = String(c.freeVariantId);
    var clickedId = variantIdOf(item);
    // Membership acted on directly: leave it to the theme, nothing to combine.
    if (!clickedId || clickedId === freeId) return null;

    var memItem = null;
    var realCount = 0;
    Array.prototype.forEach.call(drawer.querySelectorAll(LINE_SEL), function (line) {
      if (variantIdOf(line) === freeId) memItem = line;
      else realCount++;
    });

    if (!memItem || realCount !== 1) return null;
    return { item: item, variantId: clickedId, memItem: memItem, freeId: freeId };
  }

  // Take over the event and clear both lines in one go.
  function takeOverRemoval(e, ctx) {
    e.preventDefault();
    e.stopImmediatePropagation();
    // Same visual feedback the theme gives, on both lines.
    ctx.item.classList.add('disabled');
    ctx.memItem.classList.add('disabled');
    removeLines([ctx.variantId, ctx.freeId]);
  }

  // Remove link. Capture phase: must run before the theme's element-level listener.
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var link = e.target.closest(REMOVE_SEL);
    if (!link) return;
    var ctx = lastRealLineFor(link);
    if (ctx) takeOverRemoval(e, ctx);
  }, true);

  // Quantity decrement from 1 removes the line just as surely as the remove link,
  // and was going through the slow two-request fallback because nothing here
  // recognised it as a removal.
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var btn = e.target.closest('[data-quantity-decrement]');
    if (!btn) return;

    var wrapper = btn.closest('[data-quantity-wrapper]') || btn.closest(LINE_SEL);
    var field = wrapper && wrapper.querySelector('[data-quantity-input]');
    if (!field) return;
    // Only when this press takes the line to zero.
    if ((parseInt(field.value, 10) || 0) !== 1) return;

    var ctx = lastRealLineFor(btn);
    if (ctx) takeOverRemoval(e, ctx);
  }, true);

  // Typing 0 (or below) into the quantity field is the same removal again.
  document.addEventListener('change', function (e) {
    if (!e.target || !e.target.closest) return;
    var field = e.target.closest('[data-quantity-input]');
    if (!field) return;
    if ((parseInt(field.value, 10) || 0) > 0) return;

    var ctx = lastRealLineFor(field);
    if (ctx) takeOverRemoval(e, ctx);
  }, true);

  function removeLines(variantIds) {
    var body = { updates: {}, sections: [SECTION] };
    variantIds.forEach(function (id) { body.updates[id] = 0; });

    // The observer must not launch a redundant consistency pass mid-flight.
    _checking = true;

    return fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        // Cart is empty now: drop any applied code, it lives in the session and
        // would silently return on the next add-to-cart.
        if (typeof window.fsClearDiscount === 'function') window.fsClearDiscount(true);
        rerenderDrawer(cart);
        return cart;
      })
      .catch(function (e) { console.error('[fs] removeLines failed', e); })
      .then(function () { _checking = false; });
  }

  /* --- drop the $0 membership line when the last real product is removed --- */
  // Previously the line only disappeared on a mode switch, so removing the last
  // real product left a cart holding nothing but the free membership item: it
  // looks non-empty, the empty state never renders, and checkout stays reachable
  // with a $0 cart.
  //
  // This is the FALLBACK path, for when the click interception above didn't run
  // (membership left orphaned by a quantity change, a cart-page removal, a stale
  // cart from another tab). Preferred here is clicking the theme's own control:
  // cartItemRemoveElements() then handles the request, the animation, the header
  // count and the re-render exactly as it does for any other line. Doing it
  // ourselves via /cart/update.js works but visibly double-renders the drawer.
  function removeMembership() {
    var el = findMembershipRemoveEl();
    if (el) {
      el.click();
      return Promise.resolve('clicked');
    }
    console.warn('[fs] membership remove control not found, falling back to API');
    return removeMembershipViaApi();
  }

  // The remove control lives inside the line's own wrapper. Locate the wrapper by
  // variant/product id or line index — several attribute conventions are tried
  // because this must not break when the cart-item markup is touched.
  function findMembershipRemoveEl() {
    var c = cfg();
    var drawer = document.getElementById('cart-side-drawer');
    if (!drawer || !c.freeVariantId) return null;

    var freeId = String(c.freeVariantId);
    var links = drawer.querySelectorAll(REMOVE_SEL);
    for (var i = 0; i < links.length; i++) {
      var m = (links[i].getAttribute('href') || '').match(/[?&]id=(\d+)/);
      if (m && m[1] === freeId) return links[i];
    }
    return null;
  }

  function removeMembershipViaApi() {
    var c = cfg();
    if (!c.freeVariantId) return Promise.resolve();

    var body = { updates: {}, sections: [SECTION] };
    body.updates[c.freeVariantId] = 0;

    return fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        rerenderDrawer(cart);
        return cart;
      })
      .catch(function (e) { console.error('[fs] removeMembership failed', e); });
  }

  /* --- re-render the drawer the same way the theme does after add-to-cart --- */
  function rerenderDrawer(cart) {
    var c = cfg();

    if (cart && cart.sections && cart.sections[SECTION]) {
      var parsed = new DOMParser().parseFromString(cart.sections[SECTION], 'text/html');
      var fresh = parsed.querySelector('[data-cart-drawer]');
      var current = document.querySelector('[data-cart-drawer]');
      if (fresh && current) {
        current.innerHTML = fresh.innerHTML;
      }
    }

    // Re-init theme handlers on the freshly injected markup.
    if (typeof sideDrawerInt === 'function') sideDrawerInt();
    var body = document.querySelector('[data-cart-drawer-body]') || document;
    if (typeof quantitySelectors === 'function') quantitySelectors(body);
    if (typeof cartItemRemoveElements === 'function') cartItemRemoveElements(document);
    if (typeof cartDrawerNoteInit === 'function') cartDrawerNoteInit();

    // Header count: don't count the $0 membership line.
    if (typeof cartCountUpdate === 'function' && cart) {
      var memQty = 0;
      if (cart.items && c.freeProductId) {
        cart.items.forEach(function (i) {
          if (i.product_id === c.freeProductId) memQty += i.quantity;
        });
      }
      cartCountUpdate(cart.item_count - memQty);
    }

    reflectActiveButtons();

    // Insider discount display is owned by fs-discount.js. After a mode switch
    // the drawer is fresh (discount row shows its "—" placeholder), so trigger
    // the recompute directly rather than relying on observer timing.
    if (typeof window.fsRecalcInsiderDiscount === 'function') {
      window.fsRecalcInsiderDiscount();
    }
    // The applied-code chip + remove button are rendered by JS from /cart.js
    // (Liquid can't see the code). The mode re-render replaces the drawer HTML
    // with the default input state, so rebuild the chip after switching.
    if (typeof window.fsSyncDiscountUI === 'function') {
      window.fsSyncDiscountUI();
    }
  }

  /* --- keep the two toggle buttons in sync with the active mode --- */
  function reflectActiveButtons() {
    var mode = currentMode();
    document.querySelectorAll('[data-fs-mode]').forEach(function (btn) {
      var isActive = btn.getAttribute('data-fs-mode') === mode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  /* --- make sure cart state matches the stored mode (runs on load + drawer open) --- */
  var _checking = false;

  function ensureConsistency() {
    var c = cfg();
    if (!c.freeProductId) return;
    // Every branch below re-renders the drawer, which the observer sees and would
    // answer with another pass — guard the whole thing.
    if (_checking) return;
    _checking = true;

    return fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        var mode = (cart.attributes && cart.attributes.pricing_mode) || 'insider';
        c.mode = mode;

        var hasReal = false, memLine = null;
        cart.items.forEach(function (i) {
          if (i.product_id === c.freeProductId) memLine = i;
          else hasReal = true;
        });

        // Membership is the only thing left -> the customer removed their last
        // real product, so it has nothing to attach to. Checked before the add
        // branch, which requires hasReal anyway.
        if (memLine && !hasReal) {
          // The cart is about to be empty, so drop any applied code too: it lives
          // in the session and would come back on the next add-to-cart.
          if (typeof window.fsClearDiscount === 'function') window.fsClearDiscount(true);
          return removeMembership();
        }
        // Insider + real items but no membership line -> add it.
        if (mode === 'insider' && hasReal && !memLine) {
          return applyMode('insider');
        }
        // Full price but a stray membership line exists -> remove it.
        if (mode === 'full_price' && memLine) {
          return applyMode('full_price');
        }
        reflectActiveButtons();
      })
      .catch(function (e) { console.error('[fs] ensureConsistency failed', e); })
      .then(function () { _checking = false; });
  }

  /* --- event wiring (delegated, survives drawer re-render) --- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-fs-mode]');
    if (!btn) return;
    e.preventDefault();
    var mode = btn.getAttribute('data-fs-mode');
    if (mode === currentMode()) return;
    // TODO (per spec): show confirmation modal before switching the whole cart.
    applyMode(mode);
  });

  // Re-check when the drawer is opened (catches "just added a product" case).
  function watchDrawer() {
    var drawer = document.getElementById('cart-side-drawer');
    if (!drawer) return;

    var wasShown = drawer.classList.contains('show');
    new MutationObserver(function () {
      var shown = drawer.classList.contains('show');
      if (shown && !wasShown) ensureConsistency();
      wasShown = shown;
    }).observe(drawer, { attributes: true, attributeFilter: ['class'] });

    // Line add/remove is handled by the theme, which re-renders the drawer body
    // without telling us. Observe the drawer ELEMENT ITSELF: rerenderDrawer()
    // replaces the innerHTML of [data-cart-drawer], so anything observed inside
    // it is detached on the first re-render and stops reporting — which is why
    // removing a product and adding it back didn't re-add the membership line.
    var timer = null;
    new MutationObserver(function () {
      if (_checking) return;
      clearTimeout(timer);
      // Debounced: one re-render fires a burst of mutations. Kept short because
      // this delay is on the critical path when the last real product is removed
      // (theme render -> this check -> membership removal).
      timer = setTimeout(ensureConsistency, 80);
    }).observe(drawer, { childList: true, subtree: true });
  }

  function init() {
    reflectActiveButtons();
    ensureConsistency();
    watchDrawer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // expose for debugging / manual calls
  window.fsApplyMode = applyMode;
  window.fsEnsureConsistency = ensureConsistency;
})();