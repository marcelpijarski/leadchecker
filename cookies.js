(function () {
  "use strict";

  const STORAGE_KEY = "leadchecker_cookie_consent";
  const CONSENT_VERSION = "1";

  let consent = readConsent();
  let banner = null;
  let overlay = null;
  let dialog = null;
  let googleCheckbox = null;
  let lastFocused = null;

  function isValidConsent(value) {
    return Boolean(
      value &&
      value.version === CONSENT_VERSION &&
      value.necessary === true &&
      typeof value.googlePlaces === "boolean"
    );
  }

  function readConsent() {
    try {
      const stored = window.localStorage.getItem(
        STORAGE_KEY
      );

      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);

      return isValidConsent(parsed)
        ? parsed
        : null;
    } catch (error) {
      return null;
    }
  }

  function getConsent() {
    return {
      version: CONSENT_VERSION,
      necessary: true,
      googlePlaces: Boolean(
        consent &&
        consent.googlePlaces
      ),
      marketing: false,
      updatedAt:
        consent &&
        consent.updatedAt
          ? consent.updatedAt
          : ""
    };
  }

  function has(category) {
    if (category === "necessary") {
      return true;
    }

    return Boolean(
      getConsent()[category]
    );
  }

  function dispatch(name) {
    document.dispatchEvent(
      new CustomEvent(name, {
        detail: getConsent()
      })
    );
  }

  function hideBanner() {
    if (banner) {
      banner.hidden = true;
    }
  }

  function showBanner() {
    if (banner) {
      banner.hidden = false;
    }
  }

  function closeSettings() {
    if (!overlay) {
      return;
    }

    overlay.hidden = true;
    document.body.classList.remove(
      "cookies-dialog-open"
    );

    if (
      lastFocused &&
      typeof lastFocused.focus === "function"
    ) {
      lastFocused.focus();
    }
  }

  function openSettings() {
    if (!overlay || !googleCheckbox) {
      return;
    }

    lastFocused =
      document.activeElement;

    googleCheckbox.checked =
      has("googlePlaces");

    overlay.hidden = false;
    document.body.classList.add(
      "cookies-dialog-open"
    );

    window.setTimeout(function () {
      googleCheckbox.focus();
    }, 30);
  }

  function saveConsent(googlePlaces) {
    const previous = consent;

    consent = {
      version: CONSENT_VERSION,
      necessary: true,
      googlePlaces: Boolean(
        googlePlaces
      ),
      marketing: false,
      updatedAt:
        new Date().toISOString()
    };

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(consent)
      );
    } catch (error) {
    }

    hideBanner();
    closeSettings();
    dispatch(
      "leadchecker:consent-changed"
    );

    if (
      previous &&
      previous.googlePlaces &&
      !consent.googlePlaces
    ) {
      window.setTimeout(function () {
        window.location.reload();
      }, 120);
    }
  }

  function createInterface() {
    banner =
      document.createElement("section");

    banner.className =
      "cookies-banner";

    banner.setAttribute(
      "aria-label",
      "Ustawienia prywatności"
    );

    banner.innerHTML =
      '<div class="cookies-panel">' +
        '<div class="cookies-copy">' +
          '<span class="cookies-label">Prywatność</span>' +
          '<h2>Ustawienia cookies i usług Google</h2>' +
          '<p>Serwis zapisuje Twoją decyzję w pamięci przeglądarki. Podpowiedzi pełnego adresu Google uruchamiamy dopiero po uzyskaniu zgody. Niezbędne funkcje strony działają zawsze. <a href="polityka-prywatnosci.html">Polityka prywatności</a></p>' +
        '</div>' +
        '<div class="cookies-actions">' +
          '<button type="button" class="cookies-button cookies-button-light" data-cookie-reject>Tylko niezbędne</button>' +
          '<button type="button" class="cookies-button cookies-button-secondary" data-cookie-open>Ustawienia</button>' +
          '<button type="button" class="cookies-button cookies-button-primary" data-cookie-accept>Akceptuję wszystkie</button>' +
        '</div>' +
      '</div>';

    overlay =
      document.createElement("div");

    overlay.className =
      "cookies-overlay";

    overlay.hidden = true;

    overlay.innerHTML =
      '<section class="cookies-dialog" role="dialog" aria-modal="true" aria-labelledby="cookiesDialogTitle">' +
        '<div class="cookies-dialog-header">' +
          '<div>' +
            '<span class="cookies-label">Prywatność</span>' +
            '<h2 id="cookiesDialogTitle">Ustawienia cookies</h2>' +
          '</div>' +
          '<button type="button" class="cookies-close" aria-label="Zamknij ustawienia">×</button>' +
        '</div>' +
        '<p class="cookies-dialog-intro">Wybierz opcjonalne funkcje, które mogą działać na stronie. Zgodę możesz później zmienić w stopce.</p>' +
        '<div class="cookies-options">' +
          '<div class="cookies-option">' +
            '<div class="cookies-option-copy">' +
              '<strong>Niezbędne</strong>' +
              '<p>Zapamiętują wybór ustawień i zapewniają podstawowe działanie serwisu.</p>' +
            '</div>' +
            '<span class="cookies-status">Zawsze aktywne</span>' +
          '</div>' +
          '<label class="cookies-option" for="cookiesGooglePlaces">' +
            '<div class="cookies-option-copy">' +
              '<strong>Google Places</strong>' +
              '<p>Włącza podpowiedzi pełnego adresu podczas korzystania z estymatora.</p>' +
            '</div>' +
            '<span class="cookies-switch">' +
              '<input type="checkbox" id="cookiesGooglePlaces">' +
              '<span class="cookies-switch-track" aria-hidden="true"></span>' +
            '</span>' +
          '</label>' +
          '<div class="cookies-option cookies-option-disabled">' +
            '<div class="cookies-option-copy">' +
              '<strong>Marketingowe</strong>' +
              '<p>Meta Pixel nie jest jeszcze aktywny. Po jego wdrożeniu serwis poprosi o nową decyzję.</p>' +
            '</div>' +
            '<span class="cookies-status">Nieaktywne</span>' +
          '</div>' +
        '</div>' +
        '<div class="cookies-dialog-actions">' +
          '<button type="button" class="cookies-button cookies-button-light" data-cookie-close>Anuluj</button>' +
          '<button type="button" class="cookies-button cookies-button-primary" data-cookie-save>Zapisz ustawienia</button>' +
        '</div>' +
      '</section>';

    document.body.appendChild(
      banner
    );

    document.body.appendChild(
      overlay
    );

    dialog =
      overlay.querySelector(
        ".cookies-dialog"
      );

    googleCheckbox =
      overlay.querySelector(
        "#cookiesGooglePlaces"
      );

    banner
      .querySelector(
        "[data-cookie-reject]"
      )
      .addEventListener(
        "click",
        function () {
          saveConsent(false);
        }
      );

    banner
      .querySelector(
        "[data-cookie-accept]"
      )
      .addEventListener(
        "click",
        function () {
          saveConsent(true);
        }
      );

    banner
      .querySelector(
        "[data-cookie-open]"
      )
      .addEventListener(
        "click",
        openSettings
      );

    overlay
      .querySelector(
        "[data-cookie-close]"
      )
      .addEventListener(
        "click",
        closeSettings
      );

    overlay
      .querySelector(
        ".cookies-close"
      )
      .addEventListener(
        "click",
        closeSettings
      );

    overlay
      .querySelector(
        "[data-cookie-save]"
      )
      .addEventListener(
        "click",
        function () {
          saveConsent(
            googleCheckbox.checked
          );
        }
      );

    overlay.addEventListener(
      "pointerdown",
      function (event) {
        if (event.target === overlay) {
          closeSettings();
        }
      }
    );

    document.addEventListener(
      "click",
      function (event) {
        const button =
          event.target.closest(
            "[data-cookie-settings]"
          );

        if (!button) {
          return;
        }

        event.preventDefault();
        openSettings();
      }
    );

    document.addEventListener(
      "keydown",
      function (event) {
        if (
          overlay.hidden ||
          !dialog
        ) {
          return;
        }

        if (event.key === "Escape") {
          closeSettings();
          return;
        }

        if (event.key !== "Tab") {
          return;
        }

        const focusable =
          Array.from(
            dialog.querySelectorAll(
              'button:not([disabled]), input:not([disabled]), a[href]'
            )
          );

        if (!focusable.length) {
          return;
        }

        const first =
          focusable[0];

        const last =
          focusable[
            focusable.length - 1
          ];

        if (
          event.shiftKey &&
          document.activeElement === first
        ) {
          event.preventDefault();
          last.focus();
          return;
        }

        if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    );

    if (consent) {
      hideBanner();
    } else {
      showBanner();
    }

    dispatch(
      "leadchecker:consent-ready"
    );
  }

  window.LeadCheckerConsent = {
    version: CONSENT_VERSION,
    get: getConsent,
    has: has,
    openSettings: openSettings
  };

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      createInterface,
      {
        once: true
      }
    );
  } else {
    createInterface();
  }
})();