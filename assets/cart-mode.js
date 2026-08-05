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
  function ensureConsistency() {
    var c = cfg();
    if (!c.freeProductId) return;

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
      .catch(function (e) { console.error('[fs] ensureConsistency failed', e); });
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
