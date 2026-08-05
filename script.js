(function () {
  "use strict";

  function queryAll(selector, scope) {
    return Array.from(
      (scope || document).querySelectorAll(selector)
    );
  }

  const CITY_DATA_URL = "miejscowosci_polska.json";
  const CITY_RESULTS_LIMIT = 8;

  function normalizeSearchText(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("pl")
      .replace(/ł/g, "l")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function loadCityDatabase() {
    const response = await fetch(
      CITY_DATA_URL,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "Nie udało się pobrać bazy miejscowości."
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "Baza miejscowości ma nieprawidłowy format."
      );
    }

    return data
      .map(function (item) {
        const name = String(
          item && item.nazwa
            ? item.nazwa
            : ""
        ).trim();

        const voivodeship = String(
          item && item.wojewodztwo
            ? item.wojewodztwo
            : ""
        ).trim();

        const county = String(
          item && item.powiat
            ? item.powiat
            : ""
        ).trim();

        return {
          name: name,
          voivodeship: voivodeship,
          county: county,
          normalizedName:
            normalizeSearchText(name)
        };
      })
      .filter(function (item) {
        return Boolean(
          item.name &&
          item.normalizedName
        );
      })
      .sort(function (first, second) {
        return first.name.localeCompare(
          second.name,
          "pl"
        );
      });
  }

  function cityMatchScore(city, query) {
    if (city.normalizedName === query) {
      return 0;
    }

    if (city.normalizedName.startsWith(query)) {
      return 1;
    }

    const words =
      city.normalizedName.split(" ");

    if (
      words.some(function (word) {
        return word.startsWith(query);
      })
    ) {
      return 2;
    }

    if (city.normalizedName.includes(query)) {
      return 3;
    }

    return 99;
  }

  function findMatchingCities(cities, value) {
    const query =
      normalizeSearchText(value);

    if (query.length < 2) {
      return [];
    }

    return cities
      .map(function (city) {
        return {
          city: city,
          score: cityMatchScore(
            city,
            query
          )
        };
      })
      .filter(function (item) {
        return item.score < 99;
      })
      .sort(function (first, second) {
        if (first.score !== second.score) {
          return first.score - second.score;
        }

        if (
          first.city.name.length !==
          second.city.name.length
        ) {
          return (
            first.city.name.length -
            second.city.name.length
          );
        }

        return first.city.name.localeCompare(
          second.city.name,
          "pl"
        );
      })
      .slice(0, CITY_RESULTS_LIMIT)
      .map(function (item) {
        return item.city;
      });
  }

  function looksLikeFullAddress(value) {
    return /[0-9,]/.test(
      String(value || "")
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
        loading: "async",
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
    const messageBox = document.querySelector("#bladAdresu");
    const placeIdInput = document.querySelector("#googlePlaceIdStart");
    const cityList = document.querySelector("#heroCitySuggestions");

    if (!form || !input || !cityList) {
      return;
    }

    let cities = [];
    let cityDatabaseAvailable = false;
    let googleAvailable = false;
    let googleAutocomplete = null;
    let selectedAddress = null;
    let selectedCity = null;
    let results = [];
    let activeIndex = -1;

    function showMessage(message, type) {
      if (!messageBox) {
        return;
      }

      messageBox.textContent = message;

      messageBox.classList.toggle(
        "blad-adresu-poprawny",
        type === "success"
      );

      messageBox.classList.toggle(
        "blad-adresu-info",
        type === "info"
      );
    }

    function clearMessage() {
      showMessage("", "");
    }

    function closeCityList() {
      activeIndex = -1;
      cityList.hidden = true;

      input.setAttribute(
        "aria-expanded",
        "false"
      );

      input.setAttribute(
        "aria-activedescendant",
        ""
      );

      document.body.classList.remove(
        "lokalne-miasta-otwarte"
      );
    }

    function openCityList() {
      cityList.hidden = false;

      input.setAttribute(
        "aria-expanded",
        "true"
      );

      document.body.classList.add(
        "lokalne-miasta-otwarte"
      );
    }

    function setActiveIndex(index) {
      const options = queryAll(
        ".start-miejscowosc-opcja",
        cityList
      );

      if (!options.length) {
        activeIndex = -1;

        input.setAttribute(
          "aria-activedescendant",
          ""
        );

        return;
      }

      if (index < 0) {
        activeIndex =
          options.length - 1;
      } else if (
        index >= options.length
      ) {
        activeIndex = 0;
      } else {
        activeIndex = index;
      }

      options.forEach(function (
        option,
        optionIndex
      ) {
        const active =
          optionIndex === activeIndex;

        option.classList.toggle(
          "aktywna",
          active
        );

        option.setAttribute(
          "aria-selected",
          String(active)
        );
      });

      const activeOption =
        options[activeIndex];

      if (activeOption) {
        input.setAttribute(
          "aria-activedescendant",
          activeOption.id
        );

        activeOption.scrollIntoView({
          block: "nearest"
        });
      }
    }

    function clearSelection() {
      selectedAddress = null;
      selectedCity = null;

      if (placeIdInput) {
        placeIdInput.value = "";
      }
    }

    function selectCity(city) {
      selectedAddress = null;

      selectedCity = {
        formattedAddress: city.name,
        city: city.name,
        street: "",
        buildingNumber: "",
        postalCode: "",
        placeId: "",
        voivodeship: city.voivodeship,
        county: city.county,
        selectionSource: "city_database",
        selectedAt: new Date().toISOString()
      };

      input.value = city.name;

      if (placeIdInput) {
        placeIdInput.value = "";
      }

      closeCityList();

      showMessage(
        city.name +
        ", woj. " +
        city.voivodeship +
        ". Ulicę i numer uzupełnisz w estymatorze.",
        "success"
      );
    }

    function renderCityResults(nextResults) {
      results = nextResults;
      activeIndex = -1;
      cityList.replaceChildren();

      if (!results.length) {
        closeCityList();

        showMessage(
          "Brak miejscowości w lokalnej bazie. Wybierz podpowiedź Google albo wpisz pełny adres.",
          "info"
        );

        ensureGoogleAutocomplete();
        return;
      }

      results.forEach(function (city, index) {
        const option =
          document.createElement("button");

        const name =
          document.createElement("span");

        const context =
          document.createElement("span");

        option.type = "button";
        option.tabIndex = -1;
        option.id =
          "heroCitySuggestion" + index;

        option.className =
          "start-miejscowosc-opcja";

        option.setAttribute(
          "role",
          "option"
        );

        option.setAttribute(
          "aria-selected",
          "false"
        );

        name.className =
          "start-miejscowosc-nazwa";

        name.textContent = city.name;

        context.className =
          "start-miejscowosc-kontekst";

        context.textContent =
          "woj. " + city.voivodeship;

        option.appendChild(name);
        option.appendChild(context);

        option.addEventListener(
          "pointerdown",
          function (event) {
            event.preventDefault();
            selectCity(city);
          }
        );

        cityList.appendChild(option);
      });

      openCityList();

      showMessage(
        "Wybierz miejscowość z listy albo wpisz pełny adres.",
        "info"
      );
    }

    function connectGoogleAutocomplete() {
      if (
        googleAutocomplete ||
        !googleAvailable
      ) {
        return;
      }

      googleAutocomplete =
        new google.maps.places.Autocomplete(
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

      googleAutocomplete.addListener(
        "place_changed",
        function () {
          const place =
            googleAutocomplete.getPlace();

          if (!place || !place.place_id) {
            clearSelection();

            showMessage(
              "Wybierz miejscowość lub adres z listy podpowiedzi.",
              ""
            );

            return;
          }

          const parts =
            addressParts(place);

          if (!parts.city) {
            clearSelection();

            showMessage(
              "Nie udało się rozpoznać miejscowości. Wybierz inny wynik.",
              ""
            );

            return;
          }

          const formattedAddress = String(
            place.formatted_address ||
            place.name ||
            input.value
          ).trim();

          selectedCity = null;

          selectedAddress = {
            formattedAddress: formattedAddress,
            city: parts.city,
            street: parts.street,
            buildingNumber:
              parts.buildingNumber,
            postalCode: parts.postalCode,
            placeId: String(
              place.place_id
            ),
            selectionSource:
              "google_places",
            selectedAt:
              new Date().toISOString()
          };

          input.value =
            formattedAddress;

          if (placeIdInput) {
            placeIdInput.value =
              selectedAddress.placeId;
          }

          closeCityList();

          showMessage(
            parts.street &&
            parts.buildingNumber
              ? "Pełny adres został wybrany."
              : "Miejscowość została wybrana. Brakujące dane uzupełnisz w estymatorze.",
            "success"
          );
        }
      );
    }

    function ensureGoogleAutocomplete() {
      if (googleAvailable) {
        connectGoogleAutocomplete();
      }
    }

    try {
      cities =
        await loadCityDatabase();

      cityDatabaseAvailable = true;

      showMessage(
        "Zacznij wpisywać miejscowość albo pełny adres.",
        "info"
      );
    } catch (error) {
      console.error(error);

      showMessage(
        "Lista miejscowości jest chwilowo niedostępna. Wpisz pełny adres i wybierz podpowiedź Google.",
        "info"
      );
    }

    googleAvailable =
      await loadGooglePlaces();

    input.addEventListener(
      "input",
      function () {
        if (
          selectedAddress &&
          input.value ===
            selectedAddress.formattedAddress
        ) {
          return;
        }

        if (
          selectedCity &&
          input.value ===
            selectedCity.city
        ) {
          return;
        }

        clearSelection();
        clearMessage();

        const value =
          input.value.trim();

        const query =
          normalizeSearchText(value);

        if (
          looksLikeFullAddress(value)
        ) {
          closeCityList();
          ensureGoogleAutocomplete();

          showMessage(
            "Wybierz pełny adres z podpowiedzi Google.",
            "info"
          );

          return;
        }

        if (
          !cityDatabaseAvailable ||
          query.length < 2
        ) {
          closeCityList();
          return;
        }

        const matches =
          findMatchingCities(
            cities,
            value
          );

        renderCityResults(matches);
      }
    );

    input.addEventListener(
      "focus",
      function () {
        if (
          selectedAddress ||
          selectedCity ||
          looksLikeFullAddress(
            input.value
          )
        ) {
          return;
        }

        const query =
          normalizeSearchText(
            input.value
          );

        if (
          cityDatabaseAvailable &&
          query.length >= 2
        ) {
          renderCityResults(
            findMatchingCities(
              cities,
              input.value
            )
          );
        }
      }
    );

    input.addEventListener(
      "keydown",
      function (event) {
        if (
          event.key === "ArrowDown"
        ) {
          if (!results.length) {
            return;
          }

          event.preventDefault();

          if (cityList.hidden) {
            openCityList();
          }

          setActiveIndex(
            activeIndex + 1
          );

          return;
        }

        if (
          event.key === "ArrowUp"
        ) {
          if (!results.length) {
            return;
          }

          event.preventDefault();

          if (cityList.hidden) {
            openCityList();
          }

          setActiveIndex(
            activeIndex - 1
          );

          return;
        }

        if (
          event.key === "Enter" &&
          !cityList.hidden &&
          results.length
        ) {
          event.preventDefault();

          selectCity(
            results[
              activeIndex >= 0
                ? activeIndex
                : 0
            ]
          );

          return;
        }

        if (event.key === "Escape") {
          closeCityList();
        }
      }
    );

    input.addEventListener(
      "blur",
      function () {
        window.setTimeout(
          closeCityList,
          140
        );
      }
    );

    document.addEventListener(
      "pointerdown",
      function (event) {
        const wrapper = input.closest(
          ".start-autocomplete"
        );

        if (
          wrapper &&
          !wrapper.contains(
            event.target
          )
        ) {
          closeCityList();
        }
      }
    );

    form.addEventListener(
      "submit",
      function (event) {
        event.preventDefault();

        const address =
          input.value.trim();

        const selected =
          selectedAddress ||
          selectedCity;

        if (!selected) {
          if (
            cityDatabaseAvailable ||
            googleAvailable
          ) {
            showMessage(
              "Wybierz miejscowość z listy albo pełny adres z podpowiedzi Google.",
              ""
            );

            input.focus();
            return;
          }

          if (address.length < 2) {
            showMessage(
              "Wpisz miejscowość lub adres nieruchomości.",
              ""
            );

            input.focus();
            return;
          }
        }

        clearMessage();

        sessionStorage.setItem(
          "leadcheckerAdresNieruchomosci",
          selected
            ? selected.formattedAddress
            : address
        );

        if (selected) {
          sessionStorage.setItem(
            "leadcheckerAdresGoogle",
            JSON.stringify(
              selected
            )
          );
        } else {
          sessionStorage.removeItem(
            "leadcheckerAdresGoogle"
          );
        }

        window.location.href =
          "wycena.html#estymator";
      }
    );
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