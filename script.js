

    const elementyFaq = document.querySelectorAll(".faq-element");

elementyFaq.forEach(function (elementFaq) {
  const przycisk = elementFaq.querySelector(".faq-pytanie");
  const odpowiedz = elementFaq.querySelector(".faq-odpowiedz");

  przycisk.addEventListener("click", function () {
    const jestAktywny = elementFaq.classList.contains("aktywny");

    elementyFaq.forEach(function (innyElement) {
      const innyPrzycisk = innyElement.querySelector(".faq-pytanie");
      const innaOdpowiedz = innyElement.querySelector(".faq-odpowiedz");

      innyElement.classList.remove("aktywny");
      innyPrzycisk.setAttribute("aria-expanded", "false");
      innaOdpowiedz.style.maxHeight = null;
    });

    if (!jestAktywny) {
      elementFaq.classList.add("aktywny");
      przycisk.setAttribute("aria-expanded", "true");
      odpowiedz.style.maxHeight = odpowiedz.scrollHeight + "px";
    }
  });
});

const elementyFaqAgentow = document.querySelectorAll(
  ".faq-agenci-element"
);

elementyFaqAgentow.forEach(function (elementFaq) {
  const przycisk = elementFaq.querySelector(
    ".faq-agenci-pytanie"
  );

  const odpowiedz = elementFaq.querySelector(
    ".faq-agenci-odpowiedz"
  );

  przycisk.addEventListener("click", function () {
    const jestOtwarty = elementFaq.classList.contains("aktywny");

    elementyFaqAgentow.forEach(function (innyElement) {
      const innyPrzycisk = innyElement.querySelector(
        ".faq-agenci-pytanie"
      );

      const innaOdpowiedz = innyElement.querySelector(
        ".faq-agenci-odpowiedz"
      );

      innyElement.classList.remove("aktywny");
      innyPrzycisk.setAttribute("aria-expanded", "false");
      innaOdpowiedz.style.maxHeight = "0px";
    });

    if (!jestOtwarty) {
      elementFaq.classList.add("aktywny");
      przycisk.setAttribute("aria-expanded", "true");
      odpowiedz.style.maxHeight = odpowiedz.scrollHeight + "px";
    }
  });
});

window.addEventListener("resize", function () {
  const otwartaOdpowiedz = document.querySelector(
    ".faq-agenci-element.aktywny .faq-agenci-odpowiedz"
  );

  if (otwartaOdpowiedz) {
    otwartaOdpowiedz.style.maxHeight =
      otwartaOdpowiedz.scrollHeight + "px";
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const navigations = document.querySelectorAll(".nawigacja");

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
      const isOpen = menu.classList.contains("menu-otwarte");

      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    menu.querySelectorAll("a").forEach(function (link) {
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
});

document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("#formularzAdresu");
  const input = document.querySelector("#adresNieruchomosci");
  const errorBox = document.querySelector("#bladAdresu");

  if (!form || !input) {
    return;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const address = input.value.trim();

    if (address.length < 5) {
      if (errorBox) {
        errorBox.textContent = "Wpisz pełny adres nieruchomości.";
      }

      input.focus();
      return;
    }

    if (errorBox) {
      errorBox.textContent = "";
    }

    sessionStorage.setItem(
      "leadcheckerAdresNieruchomosci",
      address
    );

    window.location.href = "wycena.html#estymator";
  });
});