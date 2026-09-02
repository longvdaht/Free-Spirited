/* Free Spirited — cart pricing mode (Insider / Full price)
 * Standalone. Does not modify global.js.
 * Relies on window.FS_INSIDER (rendered in theme.liquid):
 *   { freeVariantId, freeProductId, mode }
 * Section id for the drawer is "ajax-cart".
 *
 * WHY THE CLUB LINE CARRIES A SOURCE PROPERTY — read before editing.
 *
 * The Insiders Club product reaches the cart two different ways:
 *   1. automatically, because merchandise is priced with Insider Pricing; and
 *   2. deliberately, because the customer added it from the Club product page.
 *
 * They are the same variant, so nothing in the cart JSON distinguishes them.
 * ensureConsistency() used to treat EVERY Club-only cart as case 1 gone stale
 * and delete the line, which silently killed standalone enrollments: the item
 * appeared for a moment and then vanished before the customer could check out.
 *
 * Every Club line is now tagged with the hidden line item property
 * `_fs_join_source` — `insider_pricing` for the automatic line, `standalone`
 * for a direct add. Line item properties cannot be assigned through
 * /cart/update.js, so the automatic line goes in via /cart/add.js with an
 * `items` payload, and the standalone one via a hidden input injected into the
 * product form.
 *
 * The tag decides ONE thing: whether a Club-only cart gets cleaned up. An
 * orphaned automatic line is dropped; a deliberate enrollment is left alone.
 * Everywhere merchandise is present the SOW rules still apply unchanged — the
 * $0 line is mandatory under Insider Pricing (removing it re-adds it) and
 * switching to Full Price is the only way to shed it, whoever put it there.
 */
(function () {
  var SECTION = 'ajax-cart';

  /* Hidden (leading underscore => not rendered) line item property. */
  var JOIN_PROP = '_fs_join_source';
  var SRC_AUTO = 'insider_pricing';
  var SRC_STANDALONE = 'standalone';

  var LINE_SEL = '[data-cart-item]';
  var REMOVE_SEL = '[data-remove-item]';

  function cfg() {
    return window.FS_INSIDER || { freeVariantId: null, freeProductId: null, mode: 'insider' };
  }

  function currentMode() {
    return cfg().mode || 'insider';
  }

  function postJSON(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  /* --- telling the two kinds of Club line apart --- */

  // Split a cart into its merchandise / Club parts.
  function inspect(cart) {
    var c = cfg();
    var out = { hasReal: false, clubLines: [] };
    if (!cart || !cart.items || !c.freeProductId) return out;
    cart.items.forEach(function (i) {
      if (i.product_id === c.freeProductId) out.clubLines.push(i);
      else out.hasReal = true;
    });
    return out;
  }

  // Origin of a Club line. `hasReal` is the rest of the cart, used only to
  // classify lines that predate this property (carts already in flight when
  // this shipped, or an add path that bypassed the form marking): the automatic
  // line is only ever created alongside merchandise, so an unmarked Club line in
  // a cart holding nothing else has to be a deliberate enrollment. Failing that
  // way round is the safe one — it keeps a line rather than deleting a purchase.
  function sourceOf(item, hasReal) {
    var v = (item && item.properties && item.properties[JOIN_PROP]) || '';
    if (v === SRC_STANDALONE || v === SRC_AUTO) return v;
    return hasReal ? SRC_AUTO : SRC_STANDALONE;
  }

  // Same question, answered from the rendered markup (see the data attributes in
  // ajax-cart-drawer.liquid) so the click fast path below doesn't need a fetch.
  function sourceOfEl(lineEl, hasReal) {
    var v = lineEl ? (lineEl.getAttribute('data-fs-join-source') || '') : '';
    if (v === SRC_STANDALONE || v === SRC_AUTO) return v;
    return hasReal ? SRC_AUTO : SRC_STANDALONE;
  }

  // Which line survives when the cart somehow holds more than one: the
  // customer's own beats the automatic one, so their intent is what is kept.
  function preferredClubLine(lines, hasReal) {
    for (var i = 0; i < lines.length; i++) {
      if (sourceOf(lines[i], hasReal) === SRC_STANDALONE) return lines[i];
    }
    return lines[0];
  }

  /* --- writing lines --- */

  // /cart/change.js addresses ONE line by key. Needed wherever two Club lines
  // could share a variant id (a duplicate), since an /cart/update.js `updates`
  // map keyed by variant id cannot tell them apart.
  function changeLine(key, quantity, withSections) {
    var body = { id: key, quantity: quantity };
    if (withSections) body.sections = [SECTION];
    return postJSON('/cart/change.js', body);
  }

  // The automatic Club line. Has to be /cart/add.js: /cart/update.js accepts no
  // line item properties, so a line added there could never be tagged.
  function addAutoMembership() {
    var c = cfg();
    if (!c.freeVariantId) return Promise.resolve();
    var props = {};
    props[JOIN_PROP] = SRC_AUTO;
    return postJSON('/cart/add.js', {
      items: [{ id: c.freeVariantId, quantity: 1, properties: props }]
    });
  }

  /* --- core: set mode + reconcile the membership line --- */
  // `cart` is an already-fetched snapshot; without one it is fetched first.
  // The attribute write is always the LAST request so its response carries both
  // the settled cart and the re-rendered section.
  function applyMode(mode, cart) {
    if (!cart) {
      return fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (fresh) { return applyMode(mode, fresh); })
        .catch(function (e) { console.error('[fs] applyMode failed', e); });
    }

    var c = cfg();
    var info = inspect(cart);
    var club = info.clubLines[0] || null;

    // Held across the whole sequence so the drawer observer doesn't launch a
    // consistency pass against a half-applied cart.
    _checking = true;

    var pre = Promise.resolve();
    if (mode === 'insider' && info.hasReal && !club) {
      // Insider Pricing on merchandise pulls the Club in automatically.
      pre = addAutoMembership();
    } else if (mode === 'full_price' && club && info.hasReal) {
      // Per the SOW, switching to Full Price is the ONE way the membership line
      // leaves a cart that holds merchandise — "Full Price is a standard
      // purchase with no Club membership" — so the source does not matter here.
      // A Club-only cart is the exception and is left to ensureConsistency,
      // which keeps a deliberate enrollment: there is no merchandise for the
      // pricing mode to apply to, and dropping the line would empty the cart.
      pre = changeLine(club.key, 0);
    }

    return pre
      .then(function () {
        return postJSON('/cart/update.js', {
          attributes: { pricing_mode: mode },
          sections: [SECTION]
        });
      })
      .then(function (fresh) {
        c.mode = mode;
        rerenderDrawer(fresh);
        return fresh;
      })
      .catch(function (e) { console.error('[fs] applyMode failed', e); })
      .then(function (r) { _checking = false; return r; });
  }

  /* --- fast path: last real product + membership removed in one request --- */
  // Theme markup for a line:
  //   <div data-cart-item> … <a data-remove-item data-line="2"
  //        href="/cart/change?id=46800214032583:hash&quantity=0">Remove</a> …
  // and cartItemRemoveElements() binds a click handler on each [data-remove-item]
  // that calls updateCartItem(line, 0, …).
  //
  // Removing the last real product means the AUTOMATIC membership has to go too.
  // Letting the theme handle the click and cleaning up afterwards costs two
  // sequential requests and two renders, which is the lag. Instead: intercept the
  // click in the CAPTURE phase (so the theme's own listener, bound on the
  // element, never fires), and zero both lines in a single /cart/update.js.

  // Variant id from the remove link's href: /cart/change?id=<variantId>:<key>
  function variantIdOf(itemEl) {
    var link = itemEl.querySelector(REMOVE_SEL);
    if (!link) return null;
    var m = (link.getAttribute('href') || '').match(/[?&]id=(\d+)/);
    return m ? m[1] : null;
  }

  // Given an element inside a cart line, decide whether removing that line would
  // leave the AUTOMATIC membership stranded. Returns the ids/elements needed to
  // do both in one request, or null when this isn't that situation.
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
    // The customer put the Club in the cart on purpose — removing their last
    // piece of merchandise must not take it with them. Hand back to the theme,
    // which removes only the line that was clicked.
    if (sourceOfEl(memItem, true) === SRC_STANDALONE) return null;
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

    return postJSON('/cart/update.js', body)
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

  /* --- drop the AUTOMATIC $0 membership line when its merchandise is gone --- */
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
  // ourselves via the Ajax API works but visibly double-renders the drawer.
  //
  // `club` is the cart line to drop — always an `insider_pricing` one. Callers
  // are responsible for that check; nothing below re-tests it.
  function removeMembership(club) {
    var el = findMembershipRemoveEl(club);
    if (el) {
      el.click();
      return Promise.resolve('clicked');
    }
    console.warn('[fs] membership remove control not found, falling back to API');
    return removeMembershipViaApi(club);
  }

  // The remove control lives inside the line's own wrapper. Match on the line
  // key first, because a duplicate Club line shares the variant id and matching
  // on that alone could pick the wrong one; fall back to the variant id so this
  // keeps working if the key attribute is ever dropped from the markup.
  function findMembershipRemoveEl(club) {
    var c = cfg();
    var drawer = document.getElementById('cart-side-drawer');
    if (!drawer || !c.freeVariantId) return null;

    if (club && club.key) {
      var byKey = drawer.querySelector(LINE_SEL + '[data-line-key="' + club.key + '"]');
      var link = byKey && byKey.querySelector(REMOVE_SEL);
      if (link) return link;
    }

    var freeId = String(c.freeVariantId);
    var links = drawer.querySelectorAll(REMOVE_SEL);
    for (var i = 0; i < links.length; i++) {
      var m = (links[i].getAttribute('href') || '').match(/[?&]id=(\d+)/);
      if (m && m[1] === freeId) return links[i];
    }
    return null;
  }

  function removeMembershipViaApi(club) {
    var c = cfg();
    if (!club && !c.freeVariantId) return Promise.resolve();

    // By key when we have one, so a duplicate line can be removed on its own.
    var request = club && club.key
      ? changeLine(club.key, 0, true)
      : (function () {
          var body = { updates: {}, sections: [SECTION] };
          body.updates[c.freeVariantId] = 0;
          return postJSON('/cart/update.js', body);
        })();

    return request
      .then(function (cart) {
        rerenderDrawer(cart);
        return cart;
      })
      .catch(function (e) { console.error('[fs] removeMembership failed', e); });
  }

  /* --- re-render the drawer the same way the theme does after add-to-cart --- */
  function rerenderDrawer(cart) {
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

    // Header count: don't count the AUTOMATIC $0 membership line, which the
    // customer never asked for. A standalone enrollment is a real purchase and
    // is counted like any other item.
    if (typeof cartCountUpdate === 'function' && cart && typeof cart.item_count === 'number') {
      var info = inspect(cart);
      var autoQty = 0;
      info.clubLines.forEach(function (line) {
        if (sourceOf(line, info.hasReal) === SRC_AUTO) autoQty += line.quantity;
      });
      cartCountUpdate(cart.item_count - autoQty);
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

  /* --- mark direct Club product-page additions --- */
  // The theme submits product forms as FormData, so a hidden
  // `properties[_fs_join_source]` input is all it takes for the resulting line to
  // arrive tagged — no change to global.js's add-to-cart path.
  //
  // The value is written at click/submit time rather than on page load because
  // the same form can switch variants underneath us.
  var JOIN_INPUT_NAME = 'properties[' + JOIN_PROP + ']';

  function selectedVariantId(form) {
    // form.elements also reaches controls associated by the `form=` attribute,
    // which is how the variant <select> is wired up in several of the templates.
    // A form carrying more than one control named "id" gives back a
    // RadioNodeList whose .value is empty for non-radio members, so fall through
    // to the first entry rather than reading it as "no variant selected".
    var el = (form.elements && form.elements.namedItem)
      ? form.elements.namedItem('id')
      : null;
    if (el && !el.value && typeof el.length === 'number') el = el[0];
    if (!el || !el.value) el = form.querySelector('[name="id"]');
    return el ? String(el.value || '') : '';
  }

  function markStandaloneForm(form) {
    var c = cfg();
    if (!form || !form.querySelector || !c.freeVariantId) return;

    var input = form.querySelector('input[name="' + JOIN_INPUT_NAME + '"]');
    if (selectedVariantId(form) !== String(c.freeVariantId)) {
      // Variant switched away from the Club: the marker must not ride along.
      if (input && input.parentNode) input.parentNode.removeChild(input);
      return;
    }
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = JOIN_INPUT_NAME;
      form.appendChild(input);
    }
    input.value = SRC_STANDALONE;
  }

  function formFor(btn) {
    var owner = btn.getAttribute && btn.getAttribute('form');
    if (owner) {
      var byId = document.getElementById(owner);
      if (byId) return byId;
    }
    return btn.closest ? btn.closest('form') : null;
  }

  // Capture phase again: global.js binds its handler on the button element, so a
  // delegated capture listener runs first and the input is in place before the
  // FormData snapshot is taken.
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var btn = e.target.closest('[data-add-to-cart], [name="add"]');
    if (!btn) return;
    markStandaloneForm(formFor(btn));
  }, true);

  // Non-JS / native submit paths.
  document.addEventListener('submit', function (e) {
    if (e.target && e.target.tagName === 'FORM') markStandaloneForm(e.target);
  }, true);

  /* --- make sure cart state matches the stored mode (runs on load + drawer open) --- */
  var _checking = false;
  var _recheck = false;

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

        var info = inspect(cart);
        var hasReal = info.hasReal;

        // Adding the Club from its product page while the automatic line is
        // already in the cart produces two lines: same variant, different
        // properties, so Shopify does not merge them. Collapse to one, keeping
        // the customer's own. Each repair pass fixes one thing and re-runs, so
        // the branches below always see a single, well-formed Club line.
        if (info.clubLines.length > 1) {
          var keep = preferredClubLine(info.clubLines, hasReal);
          _recheck = true;
          return info.clubLines.reduce(function (chain, line) {
            if (line === keep) return chain;
            // Sections on every call: the last one to resolve leaves the drawer
            // showing the deduplicated cart, so the markup is never left stale
            // if the re-entrant pass below has nothing further to change.
            return chain.then(function () { return changeLine(line.key, 0, true); });
          }, Promise.resolve()).then(rerenderDrawer);
        }

        var club = info.clubLines[0] || null;
        var source = club ? sourceOf(club, hasReal) : null;

        // One membership per cart, however the quantity stepper was used on it.
        if (club && club.quantity !== 1) {
          _recheck = true;
          return changeLine(club.key, 1, true).then(rerenderDrawer);
        }

        // Membership is the only thing left. Checked before the add branch,
        // which requires hasReal anyway.
        if (club && !hasReal) {
          // Added by the customer from the Club product page: this IS the order.
          // Leave it alone — deleting it here was the enrollment bug.
          if (source === SRC_STANDALONE) {
            reflectActiveButtons();
            return;
          }
          // Automatic line whose merchandise is gone: it has nothing to attach
          // to. The cart is about to be empty, so drop any applied code too — it
          // lives in the session and would come back on the next add-to-cart.
          if (typeof window.fsClearDiscount === 'function') window.fsClearDiscount(true);
          return removeMembership(club);
        }
        // Insider + real items but no membership line -> add it.
        if (mode === 'insider' && hasReal && !club) {
          return applyMode('insider', cart);
        }
        // Full price + merchandise -> no membership line, whatever put it there.
        // The SOW makes the mode switch the only way to shed the $0 line, so a
        // standalone enrollment cannot survive it either; the Club-only cart
        // above is the one case where the line stays. hasReal is implied here —
        // the Club-only branch already returned.
        if (mode === 'full_price' && club) {
          return removeMembership(club);
        }
        reflectActiveButtons();
      })
      .catch(function (e) { console.error('[fs] ensureConsistency failed', e); })
      .then(function () {
        _checking = false;
        // A repair pass ran; re-enter to settle the rest. Bounded: each pass
        // either removes a line or pins a quantity, so it cannot cycle.
        if (_recheck) {
          _recheck = false;
          return ensureConsistency();
        }
      });
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
