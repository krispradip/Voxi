/*
  VOXI DEMO BASELINE B2
  2026-09-08

  Responsibilities:
  - VOX mock-up catalogue
  - demo booking interaction
  - host website login
  - automatic Voxi login bridge

  IMPORTANT:
  Voxi itself remains Noorul's Railway widget.
  We do not copy or modify the widget.
*/


/* -------------------------------------------------------
   GLOBAL STATE
------------------------------------------------------- */

let movies = [];
let cinemas = [];
let selectedTime = "";
let hostCustomer = null;


/* -------------------------------------------------------
   VOXI API

   The value comes from index.html.
   There must NOT be /api at the end.
------------------------------------------------------- */

const VOXI_API_BASE =
  window.VoxiConfig?.apiBase ||
  "https://concierge-api-production-3d90.up.railway.app";


/* -------------------------------------------------------
   FALLBACK DATA
------------------------------------------------------- */

const fallbackMovies = [
  {
    title: "I'm Game",
    language: "Malayalam",
    rating: "PG15",
    poster: "assets/im-game.png",
    url: "https://uae.voxcinemas.com/movies/whatson"
  },
  {
    title: "The Odyssey",
    language: "English",
    rating: "15+",
    poster: "assets/odyssey.png",
    url: "https://uae.voxcinemas.com/movies/whatson"
  },
  {
    title: "Spider-Man: Brand New Day",
    language: "English",
    rating: "PG13",
    poster: "assets/spiderman.png",
    url: "https://uae.voxcinemas.com/movies/whatson"
  }
];


const fallbackCinemas = [
  "Mall of the Emirates",
  "City Centre Mirdif",
  "Dubai Festival City Mall",
  "Burjuman",
  "Yas Mall - Abu Dhabi"
];


/* -------------------------------------------------------
   ELEMENTS
------------------------------------------------------- */

const movieGrid =
  document.getElementById("movieGrid");

const movieSelect =
  document.getElementById("movieSelect");

const cinemaSelect =
  document.getElementById("cinemaSelect");

const dateSelect =
  document.getElementById("dateSelect");

const filterWrap =
  document.querySelector(".movie-filters");

const liveStatus =
  document.getElementById("liveStatus");

const liveUpdated =
  document.getElementById("liveUpdated");

const loginButton =
  document.getElementById("loginBtn");


/* -------------------------------------------------------
   DATE SELECTOR
------------------------------------------------------- */

const formatDate = date =>
  date.toLocaleDateString(
    "en-AE",
    {
      weekday: "short",
      day: "numeric",
      month: "short"
    }
  );


if (dateSelect) {

  dateSelect.innerHTML = "";

  for (let i = 0; i < 7; i++) {

    const date = new Date();

    date.setDate(
      date.getDate() + i
    );

    const label =
      i === 0
        ? `Today • ${formatDate(date)}`
        : formatDate(date);

    const value =
      date
        .toISOString()
        .slice(0, 10);

    dateSelect.add(
      new Option(
        label,
        value
      )
    );
  }
}


/* -------------------------------------------------------
   SAFE HTML
------------------------------------------------------- */

function escapeHtml(value = "") {

  return String(value).replace(
    /[&<>'"]/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[character]
  );
}


function escapeAttr(value = "") {
  return escapeHtml(value);
}


/* -------------------------------------------------------
   MOVIE / CINEMA SELECTORS
------------------------------------------------------- */

function populateSelectors() {

  if (movieSelect) {

    movieSelect.innerHTML =
      '<option value="">Any Movie</option>';

    movies.forEach(movie => {

      const label =
        movie.language
          ? `${movie.title} (${movie.language})`
          : movie.title;

      movieSelect.add(
        new Option(
          label,
          movie.title
        )
      );
    });
  }


  if (cinemaSelect) {

    cinemaSelect.innerHTML =
      '<option value="">Select Cinema</option>';

    cinemas.forEach(cinema => {

      cinemaSelect.add(
        new Option(
          cinema,
          cinema
        )
      );
    });
  }
}


/* -------------------------------------------------------
   LANGUAGE FILTERS
------------------------------------------------------- */

function buildFilters() {

  if (!filterWrap) return;


  const languages = [
    ...new Set(
      movies
        .map(movie => movie.language)
        .filter(Boolean)
    )
  ].sort();


  const preferredLanguages = [
    "English",
    "Arabic",
    "Hindi",
    "Malayalam",
    "Tamil"
  ];


  const orderedLanguages = [

    ...preferredLanguages.filter(
      language =>
        languages.includes(language)
    ),

    ...languages.filter(
      language =>
        !preferredLanguages.includes(language)
    )
  ];


  filterWrap.innerHTML = "";


  const allButton =
    document.createElement("button");

  allButton.className =
    "chip active";

  allButton.dataset.filter =
    "all";

  allButton.textContent =
    "All";

  filterWrap.appendChild(
    allButton
  );


  orderedLanguages.forEach(
    language => {

      const button =
        document.createElement("button");

      button.className =
        "chip";

      button.dataset.filter =
        language;

      button.textContent =
        language;

      filterWrap.appendChild(
        button
      );
    }
  );


  filterWrap
    .querySelectorAll(".chip")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          filterWrap
            .querySelectorAll(".chip")
            .forEach(item =>
              item.classList.remove(
                "active"
              )
            );

          button.classList.add(
            "active"
          );

          renderMovies(
            button.dataset.filter
          );
        }
      );
    });
}


/* -------------------------------------------------------
   MOVIE CARD
------------------------------------------------------- */

function createMovieCard(movie) {

  const card =
    document.createElement("article");

  card.className =
    "movie-card";


  card.innerHTML = `

    <div class="poster-wrap">

      <img
        class="movie-poster"
        src="${escapeAttr(movie.poster)}"
        alt="${escapeAttr(movie.title)} poster"
        loading="lazy"
      >

      <span class="rating">
        ${escapeHtml(movie.rating || "NR")}
      </span>

    </div>

    <div class="movie-body">

      <h3>
        ${escapeHtml(movie.title)}
      </h3>

      <div class="meta">
        ${escapeHtml(
          movie.language ||
          "Language TBC"
        )}
      </div>

      <div class="card-actions">

        <a
          class="details-card"
          href="${escapeAttr(
            movie.url ||
            "https://uae.voxcinemas.com/movies/whatson"
          )}"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Movie
        </a>

        <button
          class="book-card"
          type="button"
        >
          Book
        </button>

      </div>

    </div>
  `;


  const poster =
    card.querySelector(
      ".movie-poster"
    );


  poster.addEventListener(
    "error",
    () => {

      card.remove();

      updateDisplayedMovieCount();
    }
  );


  card
    .querySelector(".book-card")
    .addEventListener(
      "click",
      () => {

        openBooking(
          movie.title
        );
      }
    );


  return card;
}


/* -------------------------------------------------------
   RENDER MOVIES
------------------------------------------------------- */

function renderMovies(
  filter = "all"
) {

  if (!movieGrid) return;


  movieGrid.innerHTML = "";


  const list =
    movies.filter(movie => {

      const matchesLanguage =
        filter === "all" ||
        movie.language === filter;


      const hasPoster =
        typeof movie.poster ===
          "string" &&
        movie.poster.trim() !== "";


      return (
        matchesLanguage &&
        hasPoster
      );
    });


  list.forEach(movie => {

    movieGrid.appendChild(
      createMovieCard(movie)
    );
  });


  if (!list.length) {

    movieGrid.innerHTML = `
      <p class="empty-state">
        No movies available for this selection.
      </p>
    `;
  }


  updateDisplayedMovieCount();
}


/* -------------------------------------------------------
   MOVIE COUNT
------------------------------------------------------- */

function updateDisplayedMovieCount() {

  if (!liveStatus) return;


  const visibleCards =
    movieGrid
      ?.querySelectorAll(
        ".movie-card"
      )
      .length || 0;


  liveStatus.textContent =
    `Movie catalogue • ${visibleCards} movies`;
}


/* -------------------------------------------------------
   LOAD MOVIES / CINEMAS
------------------------------------------------------- */

async function loadCatalogue() {

  if (liveStatus) {

    liveStatus.textContent =
      "Loading movie catalogue…";
  }


  try {

    const [
      movieResponse,
      cinemaResponse
    ] = await Promise.all([

      fetch(
        "data/movies.json",
        {
          cache: "no-store"
        }
      ),

      fetch(
        "data/cinemas.json",
        {
          cache: "no-store"
        }
      )

    ]);


    if (
      !movieResponse.ok ||
      !cinemaResponse.ok
    ) {

      throw new Error(
        "Catalogue files unavailable"
      );
    }


    const movieData =
      await movieResponse.json();

    const cinemaData =
      await cinemaResponse.json();


    movies =
      Array.isArray(
        movieData.movies
      )
        ? movieData.movies
        : [];


    cinemas =
      Array.isArray(
        cinemaData.cinemas
      )
        ? cinemaData.cinemas
        : [];


    if (!movies.length) {

      throw new Error(
        "Movie catalogue is empty"
      );
    }


    if (!cinemas.length) {

      cinemas =
        fallbackCinemas;
    }


    if (liveStatus) {

      liveStatus.classList.remove(
        "warn"
      );

      liveStatus.classList.add(
        "ok"
      );
    }


    if (liveUpdated) {

      liveUpdated.textContent =
        "";
    }

  }

  catch (error) {

    console.warn(
      "Using fallback movie data:",
      error
    );


    movies =
      fallbackMovies;

    cinemas =
      fallbackCinemas;


    if (liveStatus) {

      liveStatus.textContent =
        "Demo movie catalogue";

      liveStatus.classList.remove(
        "ok"
      );

      liveStatus.classList.add(
        "warn"
      );
    }


    if (liveUpdated) {

      liveUpdated.textContent =
        "";
    }
  }


  populateSelectors();

  buildFilters();

  renderMovies();
}


/* -------------------------------------------------------
   BOOKING MODAL
------------------------------------------------------- */

const bookingModal =
  document.getElementById(
    "modal"
  );

const modalTitle =
  document.getElementById(
    "modalTitle"
  );

const modalCopy =
  document.getElementById(
    "modalCopy"
  );

const showtimes =
  document.getElementById(
    "showtimes"
  );


function openBooking(title) {

  if (
    !bookingModal ||
    !showtimes
  ) {

    showMessage(
      `Selected ${title}`
    );

    return;
  }


  selectedTime = "";


  const cinema =
    cinemaSelect?.value ||
    "your preferred cinema";


  if (modalTitle) {

    modalTitle.textContent =
      title ||
      "Choose a showtime";
  }


  if (modalCopy) {

    modalCopy.textContent =
      `Select a showtime at ${cinema}.`;
  }


  showtimes.innerHTML = "";


  [
    "11:15 AM",
    "1:45 PM",
    "4:30 PM",
    "7:15 PM",
    "10:00 PM"
  ].forEach(time => {

    const button =
      document.createElement(
        "button"
      );

    button.className =
      "showtime";

    button.type =
      "button";

    button.textContent =
      time;


    button.addEventListener(
      "click",
      () => {

        showtimes
          .querySelectorAll(
            ".showtime"
          )
          .forEach(item =>
            item.classList.remove(
              "selected"
            )
          );


        button.classList.add(
          "selected"
        );

        selectedTime =
          time;
      }
    );


    showtimes.appendChild(
      button
    );
  });


  bookingModal.hidden =
    false;
}


document
  .getElementById(
    "modalClose"
  )
  ?.addEventListener(
    "click",
    () => {

      bookingModal.hidden =
        true;
    }
  );


bookingModal
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        bookingModal
      ) {

        bookingModal.hidden =
          true;
      }
    }
  );


document
  .getElementById(
    "continueBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      if (!selectedTime) {

        showMessage(
          "Choose a showtime first."
        );

        return;
      }


      showMessage(
        `${selectedTime} selected. ` +
        `For the demo, Voxi can complete the full booking journey.`
      );


      bookingModal.hidden =
        true;
    }
  );


document
  .getElementById(
    "findBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      const selectedMovie =
        movieSelect?.value ||
        movies[0]?.title ||
        "a movie";


      openBooking(
        selectedMovie
      );
    }
  );


document
  .getElementById(
    "viewAllBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      filterWrap
        ?.querySelectorAll(
          ".chip"
        )
        .forEach(item =>
          item.classList.remove(
            "active"
          )
        );


      filterWrap
        ?.querySelector(
          '[data-filter="all"]'
        )
        ?.classList.add(
          "active"
        );


      renderMovies(
        "all"
      );


      movieGrid
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    }
  );


/* -------------------------------------------------------
   SITE LOGIN MODAL
------------------------------------------------------- */

const loginModal =
  document.getElementById(
    "loginModal"
  );

const loginClose =
  document.getElementById(
    "loginClose"
  );

const siteLoginForm =
  document.getElementById(
    "siteLoginForm"
  );

const siteLoginIdentifier =
  document.getElementById(
    "siteLoginIdentifier"
  );

const siteLoginPin =
  document.getElementById(
    "siteLoginPin"
  );

const siteLoginError =
  document.getElementById(
    "siteLoginError"
  );

const siteLoginSubmit =
  document.getElementById(
    "siteLoginSubmit"
  );


function openSiteLogin() {

  if (!loginModal) return;


  siteLoginError.hidden =
    true;

  siteLoginError.textContent =
    "";


  siteLoginForm.reset();


  loginModal.hidden =
    false;


  setTimeout(
    () =>
      siteLoginIdentifier
        ?.focus(),
    50
  );
}


function closeSiteLogin() {

  if (loginModal) {

    loginModal.hidden =
      true;
  }
}


loginClose
  ?.addEventListener(
    "click",
    closeSiteLogin
  );


loginModal
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        loginModal
      ) {

        closeSiteLogin();
      }
    }
  );


/* -------------------------------------------------------
   VERIFY CUSTOMER AGAINST EXISTING VOXI DEMO API

   This does NOT replace Voxi login.

   It only validates the same demo credentials
   and gives the host page the customer name.
------------------------------------------------------- */

async function verifyDemoCustomer(
  identifier,
  pin
) {

  const sessionResponse =
    await fetch(
      `${VOXI_API_BASE}/widget/session`,
      {
        method: "POST",
        headers: {
          "content-type":
            "application/json"
        },
        body: JSON.stringify({
          language: "en",
          modality: "text",
          channel: "web"
        })
      }
    );


  if (!sessionResponse.ok) {

    throw new Error(
      "Could not start the customer session."
    );
  }


  const session =
    await sessionResponse.json();


  const loginResponse =
    await fetch(
      `${VOXI_API_BASE}/widget/login`,
      {
        method: "POST",
        headers: {
          "content-type":
            "application/json",

          authorization:
            `Bearer ${session.token}`
        },

        body: JSON.stringify({
          identifier,
          pin
        })
      }
    );


  const result =
    await loginResponse.json();


  if (
    !loginResponse.ok ||
    !result.ok ||
    !result.customer
  ) {

    throw new Error(
      result.error ||
      "Could not sign in."
    );
  }


  /*
    Best-effort cleanup of the temporary
    validation session.

    The real authenticated session will
    belong to the Voxi widget.
  */

  fetch(
    `${VOXI_API_BASE}/widget/logout`,
    {
      method: "POST",

      headers: {
        "content-type":
          "application/json",

        authorization:
          `Bearer ${
            result.token ||
            session.token
          }`
      },

      body: "{}"
    }
  ).catch(
    () => undefined
  );


  return result.customer;
}


/* -------------------------------------------------------
   WAIT HELPER
------------------------------------------------------- */

function waitFor(
  getter,
  timeout = 10000,
  interval = 100
) {

  return new Promise(
    (resolve, reject) => {

      const started =
        Date.now();


      const check = () => {

        let result = null;

        try {

          result =
            getter();

        }

        catch {
          result = null;
        }


        if (result) {

          resolve(result);

          return;
        }


        if (
          Date.now() -
          started >=
          timeout
        ) {

          reject(
            new Error(
              "Timed out waiting for Voxi."
            )
          );

          return;
        }


        setTimeout(
          check,
          interval
        );
      };


      check();
    }
  );
}


/* -------------------------------------------------------
   AUTO-LOGIN EXISTING VOXI WIDGET

   Noorul's widget uses an OPEN Shadow DOM.

   We open its existing login sheet,
   fill the same credentials and submit.

   No changes to Noorul's code are required.
------------------------------------------------------- */

async function syncVoxiLogin(
  identifier,
  pin
) {

  await waitFor(
    () =>
      window.Voxi &&
      document
        .getElementById(
          "voxi-widget-host"
        )
        ?.shadowRoot
  );


  window.Voxi.login();


  const shadow =
    document
      .getElementById(
        "voxi-widget-host"
      )
      .shadowRoot;


  const form =
    await waitFor(
      () =>
        shadow.querySelector(
          "form.authsheet"
        )
    );


  const identifierInput =
    form.querySelector(
      'input[name="identifier"]'
    );

  const pinInput =
    form.querySelector(
      'input[name="pin"]'
    );


  if (
    !identifierInput ||
    !pinInput
  ) {

    throw new Error(
      "Voxi login fields were not found."
    );
  }


  identifierInput.value =
    identifier;

  identifierInput.dispatchEvent(
    new Event(
      "input",
      {
        bubbles: true
      }
    )
  );


  pinInput.value =
    pin;

  pinInput.dispatchEvent(
    new Event(
      "input",
      {
        bubbles: true
      }
    )
  );


  /*
    Submit Noorul's existing login form.

    This is what actually authenticates
    the Voxi conversation.
  */

  if (
    typeof form.requestSubmit ===
    "function"
  ) {

    form.requestSubmit();

  }

  else {

    form.dispatchEvent(
      new Event(
        "submit",
        {
          bubbles: true,
          cancelable: true
        }
      )
    );
  }


  /*
    Successful login changes the widget
    header from "Log in" to
    "<first name> · Log out".
  */

  await waitFor(
    () => {

      const authButton =
        shadow.querySelector(
          ".iconbtn.auth"
        );


      const text =
        authButton
          ?.textContent
          ?.trim() ||
        "";


      return /log out|خروج/i.test(
        text
      );
    },
    12000
  );


  return true;
}


/* -------------------------------------------------------
   WEBSITE + VOXI SIGN IN
------------------------------------------------------- */

siteLoginForm
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const identifier =
        siteLoginIdentifier
          .value
          .trim();

      const pin =
        siteLoginPin
          .value
          .trim();


      if (
        !identifier ||
        !pin
      ) {

        return;
      }


      siteLoginError.hidden =
        true;

      siteLoginSubmit.disabled =
        true;

      siteLoginSubmit.textContent =
        "Signing in…";


      try {

        /*
          Step 1:
          validate customer and obtain
          display information for website.
        */

        const customer =
          await verifyDemoCustomer(
            identifier,
            pin
          );


        /*
          Step 2:
          sign the SAME customer into
          Noorul's actual Voxi widget.
        */

        await syncVoxiLogin(
          identifier,
          pin
        );


        /*
          Only mark the website logged in
          after BOTH have succeeded.
        */

        hostCustomer =
          customer;


        loginButton.textContent =
          `Hi, ${customer.firstName}`;

        loginButton.classList.add(
          "account-signed-in"
        );

        loginButton.title =
          "Signed in to VOX and Voxi";


        closeSiteLogin();


        showMessage(
          `Welcome ${customer.firstName}. ` +
          `Voxi now recognises your customer profile.`
        );


        /*
          Credentials are deliberately
          NOT stored anywhere.
        */

        siteLoginPin.value =
          "";

      }

      catch (error) {

        console.error(
          "VOX/Voxi login failed:",
          error
        );


        siteLoginError.textContent =
          error.message ||
          "Could not sign in.";

        siteLoginError.hidden =
          false;
      }

      finally {

        siteLoginSubmit.disabled =
          false;

        siteLoginSubmit.textContent =
          "Sign in";
      }
    }
  );


/* -------------------------------------------------------
   WEBSITE + VOXI LOGOUT
------------------------------------------------------- */

async function signOutEverywhere() {

  try {

    if (window.Voxi) {

      window.Voxi.logout();
    }

  }

  catch (error) {

    console.warn(
      "Voxi logout warning:",
      error
    );
  }


  hostCustomer =
    null;


  loginButton.textContent =
    "Sign in";

  loginButton.classList.remove(
    "account-signed-in"
  );

  loginButton.title =
    "";


  showMessage(
    "You are now browsing as a guest."
  );
}


/* -------------------------------------------------------
   HEADER LOGIN BUTTON
------------------------------------------------------- */

loginButton
  ?.addEventListener(
    "click",
    async () => {

      if (!hostCustomer) {

        openSiteLogin();

        return;
      }


      const confirmed =
        window.confirm(
          `Sign out ${hostCustomer.firstName}?`
        );


      if (confirmed) {

        await signOutEverywhere();
      }
    }
  );


/* -------------------------------------------------------
   SEARCH
------------------------------------------------------- */

document
  .getElementById(
    "searchBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      const query =
        window.prompt(
          "Search movies"
        );


      if (!query) return;


      const match =
        movies.find(movie =>
          movie.title
            .toLowerCase()
            .includes(
              query
                .toLowerCase()
            )
        );


      if (match) {

        if (movieSelect) {

          movieSelect.value =
            match.title;
        }


        document
          .getElementById(
            "movies"
          )
          ?.scrollIntoView({
            behavior: "smooth"
          });

      }

      else {

        showMessage(
          "No matching movie found."
        );
      }
    }
  );


/* -------------------------------------------------------
   MOBILE MENU DEMO
------------------------------------------------------- */

document
  .getElementById(
    "menuBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      window.alert(
        "Movies • Experiences • Offers • Food & Drinks"
      );
    }
  );


/* -------------------------------------------------------
   MESSAGE
------------------------------------------------------- */

function showMessage(message) {

  const bookingResult =
    document.getElementById(
      "bookingResult"
    );


  if (bookingResult) {

    bookingResult.textContent =
      message;
  }
}


/* -------------------------------------------------------
   START
------------------------------------------------------- */

loadCatalogue();
