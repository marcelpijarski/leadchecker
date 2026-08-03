(function () {
  "use strict";

  function queryAll(selector, scope) {
    return Array.from(
      (scope || document).querySelectorAll(selector)
    );
  }

  function initializeFaq() {
    const items = queryAll(".faq-element");

    items.forEach(function (item) {
      const button = item.querySelector(".faq-pytanie");
      const answer = item.querySelector(".faq-odpowiedz");

      if (!button || !answer) {
        return;
      }

      button.addEventListener("click", function () {
        const active = item.classList.contains("aktywny");

        items.forEach(function (otherItem) {
          const otherButton = otherItem.querySelector(".faq-pytanie");
          const otherAnswer = otherItem.querySelector(".faq-odpowiedz");

          otherItem.classList.remove("aktywny");

          if (otherButton) {
            otherButton.setAttribute("aria-expanded", "false");
          }

          if (otherAnswer) {
            otherAnswer.style.maxHeight = null;
          }
        });

        if (!active) {
          item.classList.add("aktywny");
          button.setAttribute("aria-expanded", "true");
          answer.style.maxHeight = answer.scrollHeight + "px";
        }
      });
    });
  }

  function initializeAgentFaq() {
    const items = queryAll(".faq-agenci-element");

    items.forEach(function (item) {
      const button = item.querySelector(".faq-agenci-pytanie");
      const answer = item.querySelector(".faq-agenci-odpowiedz");

      if (!button || !answer) {
        return;
      }

      button.addEventListener("click", function () {
        const active = item.classList.contains("aktywny");

        items.forEach(function (otherItem) {
          const otherButton = otherItem.querySelector(".faq-agenci-pytanie");
          const otherAnswer = otherItem.querySelector(".faq-agenci-odpowiedz");

          otherItem.classList.remove("aktywny");

          if (otherButton) {
            otherButton.setAttribute("aria-expanded", "false");
          }

          if (otherAnswer) {
            otherAnswer.style.maxHeight = "0px";
          }
        });

        if (!active) {
          item.classList.add("aktywny");
          button.setAttribute("aria-expanded", "true");
          answer.style.maxHeight = answer.scrollHeight + "px";
        }
      });
    });

    window.addEventListener("resize", function () {
      const openAnswer = document.querySelector(
        ".faq-agenci-element.aktywny .faq-agenci-odpowiedz"
      );

      if (openAnswer) {
        openAnswer.style.maxHeight = openAnswer.scrollHeight + "px";
      }
    });
  }

  function initializeNavigation() {
    const navigations = queryAll(".nawigacja");

    navigations.forEach(function (navigation, index) {
      const button = navigation.querySelector(".hamburger");
      const menu = navigation.querySelector("ul");

      if (!button || !menu) {
        return;
      }

      if (!menu.id) {
        menu.id = "menu-glowne-" + index;
      }

      button.setAttribute("aria-controls", menu.id);
      button.setAttribute("aria-expanded", "false");

      function closeMenu() {
        button.classList.remove("aktywny");
        menu.classList.remove("menu-otwarte");
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", "Otwórz menu");
        document.body.classList.remove("menu-zablokowane");
      }

      function openMenu() {
        button.classList.add("aktywny");
        menu.classList.add("menu-otwarte");
        button.setAttribute("aria-expanded", "true");
        button.setAttribute("aria-label", "Zamknij menu");
        document.body.classList.add("menu-zablokowane");
      }

      button.addEventListener("click", function () {
        if (menu.classList.contains("menu-otwarte")) {
          closeMenu();
        } else {
          openMenu();
        }
      });

      queryAll("a", menu).forEach(function (link) {
        link.addEventListener("click", closeMenu);
      });

      document.addEventListener("click", function (event) {
        if (!navigation.contains(event.target)) {
          closeMenu();
        }
      });

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          closeMenu();
          button.focus();
        }
      });

      window.addEventListener("resize", function () {
        if (window.innerWidth > 1100) {
          closeMenu();
        }
      });
    });
  }

  function addressComponent(components, types) {
    for (const type of types) {
      const component = components.find(function (item) {
        return Array.isArray(item.types) && item.types.includes(type);
      });

      if (component) {
        return component.long_name || component.short_name || "";
      }
    }

    return "";
  }

  function addressParts(place) {
    const components = Array.isArray(place.address_components)
      ? place.address_components
      : [];

    return {
      city: addressComponent(
        components,
        [
          "locality",
          "postal_town",
          "sublocality_level_1",
          "sublocality",
          "administrative_area_level_3",
          "administrative_area_level_4"
        ]
      ),
      street: addressComponent(components, ["route"]),
      buildingNumber: addressComponent(components, ["street_number"]),
      postalCode: addressComponent(components, ["postal_code"])
    };
  }

  function loadGooglePlaces() {
    const key = String(
      window.LEADCHECKER_GOOGLE_MAPS_KEY || ""
    ).trim();

    if (!key) {
      return Promise.resolve(false);
    }

    if (
      window.google &&
      window.google.maps &&
      window.google.maps.places
    ) {
      return Promise.resolve(true);
    }

    return new Promise(function (resolve) {
      const script = document.createElement("script");
      const params = new URLSearchParams({
        key: key,
        libraries: "places",
        language: "pl",
        region: "PL",
        v: "weekly"
      });

      script.src =
        "https://maps.googleapis.com/maps/api/js?" +
        params.toString();
      script.async = true;
      script.defer = true;

      script.addEventListener("load", function () {
        resolve(Boolean(
          window.google &&
          window.google.maps &&
          window.google.maps.places
        ));
      });

      script.addEventListener("error", function () {
        resolve(false);
      });

      document.head.appendChild(script);
    });
  }

  async function initializeHeroAddress() {
    const form = document.querySelector("#formularzAdresu");
    const input = document.querySelector("#adresNieruchomosci");
    const errorBox = document.querySelector("#bladAdresu");
    const placeIdInput = document.querySelector("#googlePlaceIdStart");

    if (!form || !input) {
      return;
    }

    let placesActive = false;
    let selectedAddress = null;

    function showError(message) {
      if (errorBox) {
        errorBox.textContent = message;
      }
    }

    function clearError() {
      showError("");
    }

    function clearSelection() {
      selectedAddress = null;

      if (placeIdInput) {
        placeIdInput.value = "";
      }
    }

    const loaded = await loadGooglePlaces();

    if (loaded) {
      placesActive = true;

      const autocomplete = new google.maps.places.Autocomplete(
        input,
        {
          componentRestrictions: {
            country: "pl"
          },
          fields: [
            "address_components",
            "formatted_address",
            "place_id",
            "name",
            "types"
          ],
          types: ["geocode"]
        }
      );

      autocomplete.addListener("place_changed", function () {
        const place = autocomplete.getPlace();

        if (!place || !place.place_id) {
          clearSelection();
          showError("Wybierz miejscowość lub adres z listy podpowiedzi.");
          return;
        }

        const parts = addressParts(place);

        if (!parts.city) {
          clearSelection();
          showError("Nie udało się rozpoznać miejscowości. Wybierz inny wynik.");
          return;
        }

        const formattedAddress = String(
          place.formatted_address || place.name || input.value
        ).trim();

        selectedAddress = {
          formattedAddress: formattedAddress,
          city: parts.city,
          street: parts.street,
          buildingNumber: parts.buildingNumber,
          postalCode: parts.postalCode,
          placeId: String(place.place_id),
          selectedAt: new Date().toISOString()
        };

        input.value = formattedAddress;

        if (placeIdInput) {
          placeIdInput.value = selectedAddress.placeId;
        }

        clearError();
      });

      input.addEventListener("input", function () {
        if (
          selectedAddress &&
          input.value === selectedAddress.formattedAddress
        ) {
          return;
        }

        clearSelection();
        clearError();
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const address = input.value.trim();

      if (placesActive && !selectedAddress) {
        showError("Wybierz miejscowość lub adres z listy podpowiedzi Google.");
        input.focus();
        return;
      }

      if (!placesActive && address.length < 5) {
        showError("Wpisz pełny adres nieruchomości.");
        input.focus();
        return;
      }

      clearError();

      sessionStorage.setItem(
        "leadcheckerAdresNieruchomosci",
        selectedAddress
          ? selectedAddress.formattedAddress
          : address
      );

      if (selectedAddress) {
        sessionStorage.setItem(
          "leadcheckerAdresGoogle",
          JSON.stringify(selectedAddress)
        );
      } else {
        sessionStorage.removeItem("leadcheckerAdresGoogle");
      }

      window.location.href = "wycena.html#estymator";
    });
  }

  function initializePage() {
    initializeFaq();
    initializeAgentFaq();
    initializeNavigation();
    initializeHeroAddress();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializePage,
      {
        once: true
      }
    );
  } else {
    initializePage();
  }
})();