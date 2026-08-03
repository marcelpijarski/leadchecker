(function () {
  "use strict";

  if (window.leadCheckerEstimatorLoaded) return;
  window.leadCheckerEstimatorLoaded = true;

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwH1LDUAUAHZJJgvwB9OdwX0mabiHGTs8OwPcYp4w1R1TjJEuSZLgwQDrO5vNdCyPXn/exec";

  const RATES = {
    apartment: {
      fallback: 12000,
      cities: {}
    },

    house: {
      fallback: 9000,
      plotFallback: 400,
      cities: {},
      plotCities: {}
    },

    plot: {
      fallback: 400,
      cities: {}
    }
  };

  const EXTRA_MULTIPLIERS = {
    parking: 0.03,
    ogrod: 0.08,
    balkon: 0.02,
    piwnica: 0.02
  };

  const state = {
    type: "apartment",
    value: 0,
    min: 0,
    max: 0,
    cityRate: 0,
    rateSource: "",
    lead: null,
    placesActive: false,
    localitySelected: false,
    addressSelected: false,
    placeId: "",
    localityPlaceId: "",
    formattedAddress: "",
    addressAutofill: false,
    progressStage: 1
  };

  const qs = (selector, scope = document) => {
    return scope.querySelector(selector);
  };

  const qsa = (selector, scope = document) => {
    return Array.from(scope.querySelectorAll(selector));
  };

  function setVisible(element, visible, display = "block") {
    if (!element) return;

    element.hidden = !visible;
    element.classList.toggle("hidden", !visible);

    element.style.setProperty(
      "display",
      visible ? display : "none",
      "important"
    );
  }

  function scrollToElement(element) {
    if (!element) return;

    window.setTimeout(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 80);
  }

  function normalizeCity(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("pl")
      .replace(/ł/g, "l")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function averageRate(rates, fallback) {
    const values = Object.values(rates)
      .map(Number)
      .filter(value => {
        return Number.isFinite(value) && value > 0;
      });

    if (!values.length) {
      return Number(fallback);
    }

    return values.reduce((sum, value) => {
      return sum + value;
    }, 0) / values.length;
  }

  function resolveRate(rates, city, fallback) {
    const cityKey = normalizeCity(city);
    const direct = Number(rates[cityKey]);

    if (Number.isFinite(direct) && direct > 0) {
      return {
        rate: direct,
        source: "stawka przypisana do miasta"
      };
    }

    const hasRates = Object.values(rates).some(value => {
      const number = Number(value);

      return Number.isFinite(number) && number > 0;
    });

    return {
      rate: averageRate(rates, fallback),
      source: hasRates
        ? "średnia stawek innych miast"
        : "stawka domyślna"
    };
  }

  function valueOf(id) {
    const input = qs("#" + id);

    return input
      ? String(input.value || "").trim()
      : "";
  }

  function selectedText(id) {
    const select = qs("#" + id);

    if (!select || select.selectedIndex < 0) {
      return "brak";
    }

    return String(
      select.options[select.selectedIndex].text || "brak"
    );
  }

  function requiredTextValue(id, label, minLength = 1) {
    const input = qs("#" + id);
    const value = input
      ? String(input.value || "").trim()
      : "";

    if (value.length < minLength) {
      if (input) {
        input.focus();
      }

      throw new Error(
        "Uzupełnij pole: " + label + "."
      );
    }

    return value;
  }

  function postalCodeValue(id, label) {
  const input = qs("#" + id);

  const digits = input
    ? String(input.value || "")
        .replace(/\D/g, "")
        .slice(0, 5)
    : "";

  if (digits.length !== 5) {
    if (input) {
      input.focus();
    }

    throw new Error(
      "Kod pocztowy musi składać się z 5 cyfr."
    );
  }

  const formatted =
    digits.slice(0, 2) +
    "-" +
    digits.slice(2);

  if (input) {
    input.value = formatted;
  }

  return formatted;
}

  function validateSelectedAddress() {
    if (!state.placesActive) {
      return;
    }

    if (!state.localitySelected) {
      const input = qs("#addressSearch");

      if (input) {
        input.focus();
      }

      throw new Error(
        "Wybierz miejscowość lub pełny adres z listy podpowiedzi Google."
      );
    }
  }


  function buildingNumberValue() {
    const input = qs("#buildingNumber");
    const value = input
      ? String(input.value || "").trim()
      : "";

    if (!value) {
      if (input) {
        input.focus();
      }

      throw new Error(
        "Uzupełnij pole: numer budynku."
      );
    }

    const match = value.match(/^(\d+)/);

    if (!match || Number(match[1]) === 0) {
      if (input) {
        input.focus();
      }

      throw new Error(
        "Numer budynku nie może mieć wartości 0."
      );
    }

    return value;
  }

  function addressPayload() {
    validateSelectedAddress();

    if (state.type === "plot") {
      return {
        street: "brak",
        buildingNumber: "brak",
        apartmentNumber: "brak",
        postalCode: "brak",
        plotStreet: valueOf("plotStreet") || "brak",
        plotNumber: requiredTextValue(
          "plotNumber",
          "numer działki"
        ),
        plotPostalCode: postalCodeValue(
          "plotPostalCode",
          "kod pocztowy działki"
        ),
        googlePlaceId: state.placeId || "brak",
        addressVerified: state.addressSelected
          ? "Tak"
          : state.localitySelected
            ? "Częściowo"
            : "Nie"
      };
    }

    return {
      street: requiredTextValue(
        "street",
        "ulica",
        3
      ),
      buildingNumber: buildingNumberValue(),
      apartmentNumber:
        valueOf("apartmentNumber") || "brak",
      postalCode: postalCodeValue(
        "postalCode",
        "kod pocztowy"
      ),
      plotStreet: "brak",
      plotNumber: "brak",
      plotPostalCode: "brak",
      googlePlaceId: state.placeId || "brak",
      addressVerified: state.addressSelected
        ? "Tak"
        : state.localitySelected
          ? "Częściowo"
          : "Nie"
    };
  }

  function numberOf(id, label, min, max) {
    const input = qs("#" + id);

    if (!input) {
      throw new Error(
        "Nie znaleziono pola: " + label + "."
      );
    }

    const value = Number(input.value);

    if (!Number.isFinite(value)) {
      input.focus();

      throw new Error(
        "Podaj poprawną wartość w polu: " + label + "."
      );
    }

    if (typeof min === "number" && value < min) {
      input.focus();

      throw new Error(
        "Minimalna wartość pola " +
        label +
        " to " +
        min +
        "."
      );
    }

    if (typeof max === "number" && value > max) {
      input.focus();

      throw new Error(
        "Maksymalna wartość pola " +
        label +
        " to " +
        max +
        "."
      );
    }

    return value;
  }

  function cityValue() {
    const input = qs("#city");
    const city = input
      ? input.value.trim()
      : "";

    if (city.length < 2) {
      if (input) {
        input.focus();
      }

      throw new Error(
        "Wpisz miejscowość nieruchomości."
      );
    }

    return city;
  }

  function reasonValue() {
    const input = qs(
      'input[name="reason"]:checked'
    );

    if (!input) {
      const first = qs(
        'input[name="reason"]'
      );

      if (first) {
        first.focus();
      }

      throw new Error(
        "Wybierz cel wykonania wyceny."
      );
    }

    return input.value;
  }

  function checkedValues(selector) {
    return qsa(selector).map(input => {
      return String(input.value || "").trim();
    });
  }

  function standardMultiplier() {
    const input = qs("#standard");
    const value = input
      ? Number(input.value)
      : 1;

    return Number.isFinite(value) && value > 0
      ? value
      : 1;
  }

  function extrasMultiplier() {
    return qsa(".extra:checked").reduce(
      (multiplier, input) => {
        const addition =
          Number(EXTRA_MULTIPLIERS[input.value]) || 0;

        return multiplier + addition;
      },
      1
    );
  }

  function validateYear() {
    if (state.type === "plot") {
      return;
    }

    const currentYear =
      new Date().getFullYear();

    numberOf(
      "year",
      "rok budowy",
      1800,
      currentYear + 1
    );
  }

  function calculate(city) {
    validateYear();

    if (state.type === "apartment") {
      numberOf(
        "rooms",
        "liczba pokoi",
        1,
        30
      );

      const area = numberOf(
        "area",
        "metraż",
        10,
        2000
      );

      const floor = numberOf(
        "floor",
        "piętro",
        0,
        100
      );

      const floors = numberOf(
        "buildingFloors",
        "liczba pięter budynku",
        1,
        100
      );

      if (floor > floors) {
        const floorInput = qs("#floor");

        if (floorInput) {
          floorInput.focus();
        }

        throw new Error(
          "Piętro mieszkania nie może być wyższe niż liczba pięter budynku."
        );
      }

      const rateData = resolveRate(
        RATES.apartment.cities,
        city,
        RATES.apartment.fallback
      );

      return {
        value:
          area *
          rateData.rate *
          standardMultiplier() *
          extrasMultiplier(),

        rate: rateData.rate,
        source: rateData.source
      };
    }

    if (state.type === "house") {
      numberOf(
        "houseRooms",
        "liczba pokoi",
        1,
        50
      );

      const area = numberOf(
        "houseArea",
        "metraż domu",
        20,
        5000
      );

      const plot = numberOf(
        "plot",
        "powierzchnia działki",
        0,
        1000000
      );

      numberOf(
        "houseFloors",
        "liczba kondygnacji",
        1,
        10
      );

      const houseRate = resolveRate(
        RATES.house.cities,
        city,
        RATES.house.fallback
      );

      const plotRate = resolveRate(
        RATES.house.plotCities,
        city,
        RATES.house.plotFallback
      );

      const buildingValue =
        area * houseRate.rate;

      const plotValue =
        plot * plotRate.rate;

      return {
        value:
          (buildingValue + plotValue) *
          standardMultiplier() *
          extrasMultiplier(),

        rate: houseRate.rate,
        source: houseRate.source
      };
    }

    if (state.type === "plot") {
      const area = numberOf(
        "plotArea",
        "powierzchnia działki",
        1,
        10000000
      );

      const rateData = resolveRate(
        RATES.plot.cities,
        city,
        RATES.plot.fallback
      );

      return {
        value: area * rateData.rate,
        rate: rateData.rate,
        source: rateData.source
      };
    }

    throw new Error(
      "Nie rozpoznano rodzaju nieruchomości."
    );
  }

  function propertyPayload() {
    if (state.type === "apartment") {
      return {
        rooms: valueOf("rooms"),
        area: valueOf("area"),
        plotArea: "brak",
        floor: valueOf("floor"),
        buildingFloors: valueOf(
          "buildingFloors"
        ),
        year: valueOf("year"),
        standard: selectedText("standard"),
        plotType: "brak",
        plotRoad: "brak",
        plotPlan: "brak"
      };
    }

    if (state.type === "house") {
      return {
        rooms: valueOf("houseRooms"),
        area: valueOf("houseArea"),
        plotArea: valueOf("plot"),
        floor: "brak",
        buildingFloors: valueOf(
          "houseFloors"
        ),
        year: valueOf("year"),
        standard: selectedText("standard"),
        plotType: "brak",
        plotRoad: "brak",
        plotPlan: "brak"
      };
    }

    const plan = qs("#plotPlan");

    return {
      rooms: "brak",
      area: "brak",
      plotArea: valueOf("plotArea"),
      floor: "brak",
      buildingFloors: "brak",
      year: "brak",
      standard: "brak",
      plotType: selectedText("plotType"),
      plotRoad: selectedText("plotRoad"),
      plotPlan:
        plan && plan.checked
          ? "Tak"
          : "Nie"
    };
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    );
  }

  function contactData() {
    const nameInput = qs("#name");
    const emailInput = qs("#email");
    const phoneInput = qs("#phone");
    const consentEstimate = qs("#consentEstimate");
    const consentPartners = qs("#consentPartners");

    const name = nameInput
      ? nameInput.value.trim()
      : "";

    const email = emailInput
      ? emailInput.value.trim().toLowerCase()
      : "";

    const phone = phoneInput
      ? phoneInput.value.trim()
      : "";

    const phoneDigits =
      phone.replace(/\D/g, "");

    if (name.length < 2) {
      if (nameInput) {
        nameInput.focus();
      }

      throw new Error(
        "Podaj imię i nazwisko."
      );
    }

    if (!validEmail(email)) {
      if (emailInput) {
        emailInput.focus();
      }

      throw new Error(
        "Podaj poprawny adres email."
      );
    }

    if (
      phoneDigits.length < 9 ||
      phoneDigits.length > 15
    ) {
      if (phoneInput) {
        phoneInput.focus();
      }

      throw new Error(
        "Podaj poprawny numer telefonu."
      );
    }

    if (!consentEstimate || !consentEstimate.checked) {
      if (consentEstimate) {
        consentEstimate.focus();
      }

      throw new Error(
        "Zaznacz zgodę potrzebną do przygotowania wyceny."
      );
    }

    return {
      name: name,
      email: email,
      phone: phone,
      consentEstimate: "Tak",
      consentPartners:
        consentPartners && consentPartners.checked
          ? "Tak"
          : "Nie",
      consentDate: new Date().toISOString(),
      privacyVersion: "2026-08-03"
    };
  }


  function setProgress(index, name) {
    const safeIndex = Math.min(5, Math.max(1, Number(index) || 1));
    const progress = qs("#formProgress");
    const text = qs("#progressStepText");
    const title = qs("#progressStepName");
    const bar = qs("#progressBar");

    state.progressStage = safeIndex;

    if (progress) {
      progress.setAttribute(
        "aria-valuenow",
        String(safeIndex)
      );
    }

    if (text) {
      text.textContent =
        "Krok " + safeIndex + " z 5";
    }

    if (title) {
      title.textContent = name || "Formularz";
    }

    if (bar) {
      bar.style.width =
        String(safeIndex * 20) + "%";
    }
  }

  function initProgress() {
    const sections = qsa(
      "#calculatorForm [data-progress-index]"
    );

    if (!("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (state.progressStage > 3) {
          return;
        }

        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((first, second) => {
            return second.intersectionRatio - first.intersectionRatio;
          });

        if (!visible.length) {
          return;
        }

        const element = visible[0].target;
        const index = Number(
          element.dataset.progressIndex
        );
        const name =
          element.dataset.progressName || "Formularz";

        setProgress(index, name);
      },
      {
        rootMargin: "-24% 0px -55% 0px",
        threshold: [0.05, 0.25, 0.5]
      }
    );

    sections.forEach(section => {
      observer.observe(section);
    });
  }

  function updatePreferenceLimit() {
    const inputs = qsa(".preference");
    const checked = inputs.filter(input => input.checked);
    const counter = qs("#preferenceCounter");
    const limitReached = checked.length >= 3;

    inputs.forEach(input => {
      input.disabled = limitReached && !input.checked;
    });

    if (counter) {
      counter.textContent =
        String(checked.length) + " z 3";
    }
  }

  function initPreferences() {
    qsa(".preference").forEach(input => {
      input.addEventListener("change", event => {
        const checked = qsa(".preference:checked");

        if (checked.length > 3) {
          event.currentTarget.checked = false;
          window.alert(
            "Możesz wybrać maksymalnie 3 opcje."
          );
        }

        updatePreferenceLimit();
      });
    });

    qsa(".preferencja-nazwa").forEach(button => {
      button.addEventListener("click", () => {
        const item = button.closest(
          ".preferencja-element"
        );

        if (!item) {
          return;
        }

        const open = !item.classList.contains(
          "opis-otwarty"
        );

        qsa(".preferencja-element.opis-otwarty").forEach(other => {
          other.classList.remove("opis-otwarty");
          const otherButton = qs(
            ".preferencja-nazwa",
            other
          );

          if (otherButton) {
            otherButton.setAttribute(
              "aria-expanded",
              "false"
            );
          }
        });

        item.classList.toggle(
          "opis-otwarty",
          open
        );

        button.setAttribute(
          "aria-expanded",
          String(open)
        );
      });
    });

    updatePreferenceLimit();
  }

  function campaignStorageKey(name) {
    return "leadchecker_campaign_" + name;
  }

  function saveCampaignValue(name, value) {
    if (!value) {
      return;
    }

    sessionStorage.setItem(
      campaignStorageKey(name),
      String(value).slice(0, 500)
    );
  }

  function readCampaignValue(name) {
    return sessionStorage.getItem(
      campaignStorageKey(name)
    ) || "brak";
  }

  function captureCampaignData() {
    const params = new URLSearchParams(
      window.location.search
    );

    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term"
    ].forEach(name => {
      saveCampaignValue(
        name,
        params.get(name)
      );
    });

    saveCampaignValue(
      "landing_page",
      window.location.href
    );

    saveCampaignValue(
      "referrer",
      document.referrer || "wejście bezpośrednie"
    );
  }

  function campaignPayload() {
    const source = readCampaignValue(
      "utm_source"
    );

    return {
      trafficSource:
        source !== "brak"
          ? source
          : readCampaignValue("referrer"),
      utmSource: source,
      utmMedium: readCampaignValue("utm_medium"),
      utmCampaign: readCampaignValue("utm_campaign"),
      utmContent: readCampaignValue("utm_content"),
      utmTerm: readCampaignValue("utm_term"),
      landingPage: readCampaignValue("landing_page"),
      referrer: readCampaignValue("referrer")
    };
  }

  function setAddressStatus(message, type) {
    const status = qs("#addressStatus");

    if (!status) {
      return;
    }

    status.textContent = message;
    status.classList.toggle(
      "poprawny",
      type === "success"
    );
    status.classList.toggle(
      "blad",
      type === "error"
    );
  }

  function setRawInputValue(id, value) {
    const input = qs("#" + id);

    if (!input) {
      return;
    }

    input.value = String(value || "");

    input.dispatchEvent(
      new Event("input", {
        bubbles: true
      })
    );
  }

  function updatePlaceIdInput() {
    const placeInput = qs("#googlePlaceId");

    if (placeInput) {
      placeInput.value = state.placeId;
    }
  }







  function clearAddressSelection(showMessage = true) {
    if (state.addressAutofill) {
      return;
    }

    state.localitySelected = false;
    state.addressSelected = false;
    state.placeId = "";
    state.localityPlaceId = "";
    state.formattedAddress = "";
    updatePlaceIdInput();

    if (showMessage && state.placesActive) {
      setAddressStatus(
        "Wybierz miejscowość lub pełny adres z listy podpowiedzi.",
        "error"
      );
    }
  }


  function addressComponent(components, types) {
    for (const type of types) {
      const component = components.find(item => {
        return Array.isArray(item.types) &&
          item.types.includes(type);
      });

      if (component) {
        return component.long_name ||
          component.short_name ||
          "";
      }
    }

    return "";
  }

  function addressParts(place) {
    const components = Array.isArray(
      place.address_components
    )
      ? place.address_components
      : [];

    const city = addressComponent(
      components,
      [
        "locality",
        "postal_town",
        "sublocality_level_1",
        "sublocality",
        "administrative_area_level_3",
        "administrative_area_level_4"
      ]
    );

    const street = addressComponent(
      components,
      ["route"]
    );

    const buildingNumber = addressComponent(
      components,
      ["street_number"]
    );

    const postalCode = addressComponent(
      components,
      ["postal_code"]
    );

    return {
      city: city,
      street: street,
      buildingNumber: buildingNumber,
      postalCode: postalCode
    };
  }







  function markLocality(place, city) {
    state.localitySelected = Boolean(city);
    state.localityPlaceId = String(
      place.place_id || ""
    );
    state.placeId = state.localityPlaceId;
    updatePlaceIdInput();
  }


  function fillAddressFromMainPlace(place) {
    const parts = addressParts(place);
    const formatted = String(
      place.formatted_address ||
      place.name ||
      ""
    );

    if (!parts.city) {
      clearAddressSelection(false);

      setAddressStatus(
        "Nie udało się rozpoznać miejscowości. Wybierz inny wynik.",
        "error"
      );
      return;
    }

    state.addressAutofill = true;

    setRawInputValue(
      "city",
      parts.city
    );

    if (parts.street) {
      setRawInputValue(
        "street",
        parts.street
      );
      setRawInputValue(
        "plotStreet",
        parts.street
      );
    } else {
      setRawInputValue(
        "street",
        ""
      );
      setRawInputValue(
        "plotStreet",
        ""
      );
    }

    if (parts.buildingNumber) {
      setRawInputValue(
        "buildingNumber",
        parts.buildingNumber
      );
    } else {
      setRawInputValue(
        "buildingNumber",
        ""
      );
    }

    if (parts.postalCode) {
      setRawInputValue(
        "postalCode",
        parts.postalCode
      );
      setRawInputValue(
        "plotPostalCode",
        parts.postalCode
      );
    }

    state.addressAutofill = false;

    markLocality(
      place,
      parts.city
    );

    state.addressSelected = Boolean(
      parts.street &&
      parts.buildingNumber
    );
    state.placeId = String(
      place.place_id ||
      state.localityPlaceId ||
      ""
    );
    state.formattedAddress = formatted;
    updatePlaceIdInput();

    const searchInput =
      qs("#addressSearch");

    if (searchInput && formatted) {
      searchInput.value = formatted;
    }

    if (
      parts.street &&
      parts.buildingNumber
    ) {
      setAddressStatus(
        "Pełny adres został wybrany. Sprawdź automatycznie uzupełnione pola.",
        "success"
      );
      return;
    }

    if (parts.street) {
      setAddressStatus(
        "Ulica została rozpoznana. Uzupełnij numer budynku i brakujące dane.",
        "success"
      );

      const buildingInput =
        qs("#buildingNumber");

      if (buildingInput) {
        window.setTimeout(() => {
          buildingInput.focus();
        }, 100);
      }
      return;
    }

    setAddressStatus(
      "Miejscowość została wybrana. Uzupełnij ulicę, numer budynku i kod pocztowy w polach poniżej.",
      "success"
    );

    const manualInput = qs(
      state.type === "plot"
        ? "#plotStreet"
        : "#street"
    );

    if (manualInput) {
      window.setTimeout(() => {
        manualInput.focus();
      }, 100);
    }
  }





  function loadGooglePlaces() {
    const key = String(
      window.LEADCHECKER_GOOGLE_MAPS_KEY || ""
    ).trim();

    if (!key) {
      console.info(
        "Brak klucza Google Places. Formularz działa w trybie ręcznym."
      );
      return Promise.resolve(false);
    }

    if (
      window.google &&
      window.google.maps &&
      window.google.maps.places
    ) {
      return Promise.resolve(true);
    }

    return new Promise(resolve => {
      const script =
        document.createElement("script");

      const params =
        new URLSearchParams({
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

      script.addEventListener(
        "load",
        () => {
          resolve(Boolean(
            window.google &&
            window.google.maps &&
            window.google.maps.places
          ));
        }
      );

      script.addEventListener(
        "error",
        () => {
          resolve(false);
        }
      );

      document.head.appendChild(script);
    });
  }




  async function initAddressAutocomplete() {
    const input = qs("#addressSearch");

    if (!input) {
      return;
    }

    const loaded =
      await loadGooglePlaces();

    if (!loaded) {
      setAddressStatus(
        "Autouzupełnianie uruchomimy po dodaniu klucza Google Places.",
        ""
      );
      return;
    }

    state.placesActive = true;

    input.placeholder =
      "Np. Warszawa, Marszałkowska 10";

    const autocomplete =
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

    autocomplete.addListener(
      "place_changed",
      () => {
        const place =
          autocomplete.getPlace();

        if (!place || !place.place_id) {
          clearAddressSelection();
          return;
        }

        fillAddressFromMainPlace(place);
      }
    );

    input.addEventListener(
      "input",
      () => {
        if (
          state.formattedAddress &&
          input.value ===
            state.formattedAddress
        ) {
          return;
        }

        clearAddressSelection();
      }
    );

    const cityInput = qs("#city");

    if (cityInput) {
      cityInput.addEventListener(
        "input",
        () => {
          clearAddressSelection();
        }
      );
    }

    [
      "street",
      "buildingNumber",
      "postalCode",
      "plotStreet",
      "plotPostalCode"
    ].forEach(id => {
      const field = qs("#" + id);

      if (!field) {
        return;
      }

      field.addEventListener(
        "input",
        () => {
          if (
            state.addressAutofill ||
            !state.localitySelected
          ) {
            return;
          }

          state.addressSelected = false;

          setAddressStatus(
            "Miejscowość jest zweryfikowana. Sprawdź ręcznie uzupełnione dane adresowe.",
            "success"
          );
        }
      );
    });

    setAddressStatus(
      "Wpisz miejscowość i adres w jednym polu, na przykład Warszawa, Marszałkowska 10. Jeśli wybierzesz tylko miejscowość, brakujące dane uzupełnisz poniżej.",
      ""
    );
  }


  async function request(payload) {
  const controller = new AbortController();

  const timeout = window.setTimeout(function () {
    controller.abort();
  }, 60000);

  try {
    console.log("Wysyłam dane do Apps Script:", payload.action);

    const startTime = performance.now();

    const response = await fetch(SCRIPT_URL, {
      method: "POST",

      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },

      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: "follow"
    });

    const responseText = await response.text();

    const requestTime = Math.round(
      performance.now() - startTime
    );

    console.log(
      "Apps Script odpowiedział po:",
      requestTime,
      "ms"
    );

    console.log(
      "Odpowiedź Apps Script:",
      responseText
    );

    if (!response.ok) {
      throw new Error(
        "Serwer zwrócił błąd HTTP " +
        response.status +
        "."
      );
    }

    if (!responseText.trim()) {
      throw new Error(
        "Serwer zwrócił pustą odpowiedź."
      );
    }

    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      console.error(
        "Nie można odczytać odpowiedzi JSON:",
        responseText
      );

      throw new Error(
        "Serwer zwrócił odpowiedź w nieprawidłowym formacie."
      );
    }

    return responseData;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "Wysyłanie trwało zbyt długo. Spróbuj ponownie za chwilę."
      );
    }

    if (
      error instanceof TypeError &&
      String(error.message).includes("fetch")
    ) {
      throw new Error(
        "Nie udało się połączyć z usługą wyceny."
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

  function loading(
    button,
    active,
    text
  ) {
    if (!button) {
      return;
    }

    if (active) {
      if (!button.dataset.originalText) {
        button.dataset.originalText =
          button.textContent.trim();
      }

      button.disabled = true;
      button.textContent = text;

      button.setAttribute(
        "aria-busy",
        "true"
      );

      return;
    }

    button.disabled = false;

    button.textContent =
      button.dataset.originalText ||
      button.textContent;

    button.removeAttribute(
      "aria-busy"
    );
  }

  function resetResult() {
    state.value = 0;
    state.min = 0;
    state.max = 0;
    state.cityRate = 0;
    state.rateSource = "";
    state.lead = null;

    setVisible(
      qs("#result"),
      false
    );

    setVisible(
      qs("#codeBox"),
      false
    );
  }

  function showType(type) {
    state.type = type;

    setVisible(
      qs("#apartmentFields"),
      type === "apartment"
    );

    setVisible(
      qs("#houseFields"),
      type === "house"
    );

    setVisible(
      qs("#plotFields"),
      type === "plot"
    );

    setVisible(
      qs("#buildingDetails"),
      type !== "plot"
    );

    setVisible(
      qs("#buildingAddressFields"),
      type !== "plot"
    );

    setVisible(
      qs("#plotAddressFields"),
      type === "plot"
    );

    [
      [
        qs("#apartmentBtn"),
        "apartment"
      ],
      [
        qs("#houseBtn"),
        "house"
      ],
      [
        qs("#plotBtn"),
        "plot"
      ]
    ].forEach(entry => {
      const button = entry[0];
      const buttonType = entry[1];

      if (!button) {
        return;
      }

      const active =
        buttonType === type;

      button.classList.toggle(
        "active",
        active
      );

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });

    resetResult();
    setProgress(
      1,
      "Lokalizacja"
    );
  }

  function initTypeButtons() {
    const apartment =
      qs("#apartmentBtn");

    const house =
      qs("#houseBtn");

    const plot =
      qs("#plotBtn");

    if (
      !apartment ||
      !house ||
      !plot
    ) {
      throw new Error(
        "Nie znaleziono przycisków rodzaju nieruchomości."
      );
    }

    apartment.addEventListener(
      "click",
      () => {
        showType("apartment");
      }
    );

    house.addEventListener(
      "click",
      () => {
        showType("house");
      }
    );

    plot.addEventListener(
      "click",
      () => {
        showType("plot");
      }
    );

    showType("apartment");
  }

  function initCalculator() {
    const form =
      qs("#calculatorForm");

    const result =
      qs("#result");

    const price =
      qs("#price");

    const leadForm =
      qs("#leadForm");

    const codeBox =
      qs("#codeBox");

    if (
      !form ||
      !result ||
      !price ||
      !leadForm ||
      !codeBox
    ) {
      throw new Error(
        "Brakuje elementów formularza estymatora."
      );
    }

    form.noValidate = true;

    form.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        try {
          const city =
            cityValue();

          addressPayload();

          const reason =
            reasonValue();

          const estimate =
            calculate(city);

          if (
            !Number.isFinite(
              estimate.value
            ) ||
            estimate.value <= 0
          ) {
            throw new Error(
              "Nie udało się obliczyć wartości nieruchomości."
            );
          }

          state.value =
            Math.round(
              estimate.value
            );

          state.min =
            Math.round(
              state.value * 0.9
            );

          state.max =
            Math.round(
              state.value * 1.1
            );

          state.cityRate =
            Math.round(
              estimate.rate
            );

          state.rateSource =
            estimate.source;

          state.lead = {
            city: city,
            reason: reason
          };

          price.innerHTML =
            "<h3>Analiza została przygotowana</h3>" +
            "<p>Podaj dane kontaktowe i potwierdź adres email, aby przekazać zgłoszenie do zespołu LeadChecker.</p>";

          setVisible(
            result,
            true
          );

          setVisible(
            leadForm,
            true,
            "grid"
          );

          setProgress(
            4,
            "Dane kontaktowe"
          );

          setVisible(
            codeBox,
            false
          );

          scrollToElement(
            result
          );
        } catch (error) {
          console.error(error);

          window.alert(
            error.message ||
            "Sprawdź wprowadzone dane."
          );
        }
      }
    );
  }

  function initLeadForm() {
    const form =
      qs("#leadForm");

    const codeBox =
      qs("#codeBox");

    if (!form || !codeBox) {
      throw new Error(
        "Brakuje formularza danych kontaktowych."
      );
    }

    form.noValidate = true;

    form.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const button = qs(
          'button[type="submit"]',
          form
        );

        try {
          if (state.value <= 0) {
            throw new Error(
              "Najpierw oblicz wartość nieruchomości."
            );
          }

          const contact =
            contactData();

          const payload =
            Object.assign(
              {
                action: "sendCode",
                type: state.type,
                city: cityValue(),
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
                value: state.value,
                minimumValue: state.min,
                maximumValue: state.max,
                cityRate: state.cityRate,
                rateSource:
                  state.rateSource,
                reason: reasonValue(),
                consentEstimate:
                  contact.consentEstimate,
                consentPartners:
                  contact.consentPartners,
                consentDate:
                  contact.consentDate,
                privacyVersion:
                  contact.privacyVersion,

                preferences:
                  checkedValues(
                    ".preference:checked"
                  ).join(", "),

                extras:
                  checkedValues(
                    ".extra:checked"
                  ).join(", "),

                plotUtilities:
                  checkedValues(
                    ".plotUtility:checked"
                  ).join(", ")
              },

              propertyPayload(),
              addressPayload(),
              campaignPayload()
            );

          state.lead = payload;

          loading(
            button,
            true,
            "Wysyłanie kodu"
          );

          const response =
            await request(payload);

          if (
            !response ||
            response.status !==
              "code_sent"
          ) {
            throw new Error(
              response &&
              response.message
                ? response.message
                : "Nie udało się wysłać kodu weryfikacyjnego."
            );
          }

          setVisible(
            form,
            false
          );

          setVisible(
            codeBox,
            true
          );

          setProgress(
            5,
            "Potwierdzenie email"
          );

          scrollToElement(
            codeBox
          );

          const codeInput =
            qs("#verifyCode");

          if (codeInput) {
            codeInput.focus();
          }
        } catch (error) {
          console.error(error);

          window.alert(
            error.message ||
            "Nie udało się wysłać kodu weryfikacyjnego."
          );
        } finally {
          loading(
            button,
            false
          );
        }
      }
    );
  }

  function showResult() {
    const result =
      qs("#result");

    const price =
      qs("#price");

    const heading =
      qs(
        ".wynik-estymatora-naglowek h2"
      );

    if (!result || !price) {
      return;
    }

    if (heading) {
      heading.textContent =
        "Dziękujemy za zgłoszenie";
    }

    price.innerHTML =
      "<h3>Adres email został potwierdzony</h3>" +
      "<p>Twoje zgłoszenie oraz dane nieruchomości zostały przekazane do zespołu LeadChecker.</p>" +
      "<p>Skontaktujemy się z Tobą w sprawie dalszych szczegółów.</p>";

    setVisible(
      result,
      true
    );

    setVisible(
      qs("#leadForm"),
      false
    );

    setVisible(
      qs("#codeBox"),
      false
    );

    setProgress(
      5,
      "Gotowe"
    );

    scrollToElement(
      result
    );
  }

  function initVerifyForm() {
    const form =
      qs("#verifyForm");

    if (!form) {
      throw new Error(
        "Brakuje formularza weryfikacji kodu."
      );
    }

    form.noValidate = true;

    form.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const button = qs(
          'button[type="submit"]',
          form
        );

        const input =
          qs("#verifyCode");

        const code = input
          ? String(
              input.value || ""
            ).trim()
          : "";

        try {
          if (
            !state.lead ||
            !state.lead.email
          ) {
            throw new Error(
              "Najpierw wyślij dane kontaktowe."
            );
          }

          if (!/^\d{6}$/.test(code)) {
            if (input) {
              input.focus();
            }

            throw new Error(
              "Kod powinien składać się z 6 cyfr."
            );
          }

          loading(
            button,
            true,
            "Sprawdzanie kodu"
          );

          const response =
            await request({
              action: "verifyCode",
              email: state.lead.email,
              code: code
            });

          if (
            response &&
            response.status ===
              "verified"
          ) {
            showResult();
            return;
          }

          if (
            response &&
            response.status ===
              "expired"
          ) {
            throw new Error(
              "Kod wygasł. Wyślij nowy kod."
            );
          }

          if (
            response &&
            response.status ===
              "wrong_code"
          ) {
            throw new Error(
              "Podany kod jest nieprawidłowy."
            );
          }

          throw new Error(
            response &&
            response.message
              ? response.message
              : "Nie udało się sprawdzić kodu."
          );
        } catch (error) {
          console.error(error);

          window.alert(
            error.message ||
            "Nie udało się sprawdzić kodu."
          );
        } finally {
          loading(
            button,
            false
          );
        }
      }
    );
  }

  window.changeValue = function (
    id,
    amount
  ) {
    const input =
      qs("#" + id);

    if (!input) {
      return;
    }

    const current =
      Number(input.value) || 0;

    const min =
      input.min !== ""
        ? Number(input.min)
        : null;

    const max =
      input.max !== ""
        ? Number(input.max)
        : null;

    let next =
      current +
      Number(amount || 0);

    if (Number.isFinite(min)) {
      next = Math.max(
        min,
        next
      );
    }

    if (Number.isFinite(max)) {
      next = Math.min(
        max,
        next
      );
    }

    input.value = next;

    input.dispatchEvent(
      new Event(
        "input",
        {
          bubbles: true
        }
      )
    );
  };

  function parseHeroAddress(rawAddress) {
  let address = String(rawAddress || "")
    .trim()
    .replace(/\s+/g, " ");

  let postalCode = "";

  const postalMatch = address.match(/\b\d{2}-\d{3}\b/);

  if (postalMatch) {
    postalCode = postalMatch[0];

    address = address
      .replace(postalMatch[0], "")
      .trim();
  }

  const parts = address
    .split(",")
    .map(function (part) {
      return part.trim();
    })
    .filter(function (part) {
      return part.length > 0;
    });

  let city = "";
  let streetPart = "";

  if (parts.length >= 2) {
    city = parts[0];
    streetPart = parts.slice(1).join(" ");
  } else {
    streetPart = address;
  }

  streetPart = streetPart
    .replace(/^(ul\.?|ulica)\s+/i, "")
    .trim();

  let street = streetPart;
  let buildingNumber = "";
  let apartmentNumber = "";

  const numberMatch = streetPart.match(
    /\s+([0-9]+[A-Za-z]?(?:\/[0-9A-Za-z]+)?)$/
  );

  if (numberMatch) {
    const fullNumber = numberMatch[1];
    const numberParts = fullNumber.split("/");

    buildingNumber = numberParts[0] || "";
    apartmentNumber = numberParts[1] || "";

    street = streetPart
      .slice(0, numberMatch.index)
      .trim();
  }

  return {
    city: city,
    street: street,
    buildingNumber: buildingNumber,
    apartmentNumber: apartmentNumber,
    postalCode: postalCode
  };
}

function setInputValue(id, value) {
  const input = qs("#" + id);

  if (!input || !value) {
    return;
  }

  input.value = value;

  input.dispatchEvent(
    new Event("input", {
      bubbles: true
    })
  );
}

function prefillAddressFromHero() {
  const savedAddress = sessionStorage.getItem(
    "leadcheckerAdresNieruchomosci"
  );

  if (!savedAddress) {
    return;
  }

  const address = parseHeroAddress(savedAddress);

  setInputValue("city", address.city);
  setInputValue("street", address.street);
  setInputValue(
    "buildingNumber",
    address.buildingNumber
  );
  setInputValue(
    "apartmentNumber",
    address.apartmentNumber
  );
  setInputValue(
    "postalCode",
    address.postalCode
  );

  setInputValue(
    "plotStreet",
    address.street
  );

  setInputValue(
    "plotPostalCode",
    address.postalCode
  );

  sessionStorage.removeItem(
    "leadcheckerAdresNieruchomosci"
  );
}

function initPostalCodeFormatting() {
  [
    "postalCode",
    "plotPostalCode"
  ].forEach(function (id) {
    const input = qs("#" + id);

    if (!input) {
      return;
    }

    input.addEventListener(
      "input",
      function () {
        const digits = String(
          input.value || ""
        )
          .replace(/\D/g, "")
          .slice(0, 5);

        input.value =
          digits.length > 2
            ? digits.slice(0, 2) +
              "-" +
              digits.slice(2)
            : digits;
      }
    );
  });
}

  function init() {
    if (!qs("#calculatorForm")) {
      return;
    }

    try {
    captureCampaignData();
    initTypeButtons();
    initPostalCodeFormatting();
    initProgress();
    initPreferences();
    initCalculator();
    initLeadForm();
    initVerifyForm();
    initAddressAutocomplete();

      console.log(
        "Estymator LeadChecker został uruchomiony."
      );
    } catch (error) {
      console.error(
        "Błąd uruchamiania estymatora:",
        error
      );
    }
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );
  } else {
    init();
  }
})();