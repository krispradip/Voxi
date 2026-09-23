/* ==========================================================
   VOX CINEMAS UAE - FINAL APP.JS
   ========================================================== */


/* ==========================================================
   STATE
   ========================================================== */

let movies = [];
let cinemas = [];

let selectedTime = "";
let hostCustomer = null;

let activeLanguage = "all";
let activeMovieTab = "now";
let showAllMovies = false;


/* ==========================================================
   EXISTING EMBED INTEGRATION
   ========================================================== */

const EMBED_CONFIG_KEY = "VoxiConfig";
const EMBED_GLOBAL_KEY = "Voxi";
const EMBED_HOST_ID = "voxi-widget-host";

const CHAT_API_BASE =
  window[EMBED_CONFIG_KEY]?.apiBase ||
  "https://concierge-api-production-3d90.up.railway.app";


/* ==========================================================
   FALLBACK DATA
   ========================================================== */

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


/* ==========================================================
   ELEMENTS
   ========================================================== */

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

const viewAllButton =
  document.getElementById("viewAllBtn");

const mobileMenu =
  document.getElementById("mobileNav");


/* ==========================================================
   PAGE CONTEXT
   ========================================================== */

function updatePageContext(patch = {}) {

  window.VOX_PAGE_CONTEXT = {
    ...(window.VOX_PAGE_CONTEXT || {}),
    ...patch
  };

  window.dispatchEvent(
    new CustomEvent(
      "vox:contextchange",
      {
        detail: window.VOX_PAGE_CONTEXT
      }
    )
  );
}


updatePageContext({
  page: "home",
  authenticated: false
});


/* ==========================================================
   SAFE HTML
   ========================================================== */

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


/* ==========================================================
   DATES
   ========================================================== */

function formatDate(date) {

  return date.toLocaleDateString(
    "en-AE",
    {
      weekday: "short",
      day: "numeric",
      month: "short"
    }
  );
}


function initialiseDates() {

  if (!dateSelect) {
    return;
  }

  dateSelect.innerHTML = "";

  for (let index = 0; index < 7; index++) {

    const date = new Date();

    date.setDate(
      date.getDate() + index
    );

    const value =
      date
        .toISOString()
        .slice(0, 10);

    const label =
      index === 0
        ? `Today • ${formatDate(date)}`
        : formatDate(date);

    dateSelect.add(
      new Option(
        label,
        value
      )
    );
  }

  updatePageContext({
    date: dateSelect.value
  });
}


initialiseDates();


/* ==========================================================
   SELECTORS
   ========================================================== */

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
      '<option value="">Select Your Cinema(s)</option>';

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


/* ==========================================================
   SELECTOR CONTEXT
   ========================================================== */

movieSelect
  ?.addEventListener(
    "change",
    () => {

      updatePageContext({
        movie:
          movieSelect.value || null,

        session:
          null
      });
    }
  );


cinemaSelect
  ?.addEventListener(
    "change",
    () => {

      updatePageContext({
        cinema:
          cinemaSelect.value || null,

        session:
          null
      });
    }
  );


dateSelect
  ?.addEventListener(
    "change",
    () => {

      updatePageContext({
        date:
          dateSelect.value || null,

        session:
          null
      });
    }
  );


/* ==========================================================
   LANGUAGE FILTERS
   ========================================================== */

function buildFilters() {

  if (!filterWrap) {
    return;
  }

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

  allButton.type = "button";
  allButton.className = "chip active";
  allButton.dataset.filter = "all";
  allButton.textContent = "All";

  filterWrap.appendChild(allButton);


  orderedLanguages.forEach(
    language => {

      const button =
        document.createElement("button");

      button.type = "button";
      button.className = "chip";
      button.dataset.filter = language;
      button.textContent = language;

      filterWrap.appendChild(button);
    }
  );


  filterWrap
    .querySelectorAll(".chip")
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            filterWrap
              .querySelectorAll(".chip")
              .forEach(
                item =>
                  item.classList.remove("active")
              );

            button.classList.add("active");

            activeLanguage =
              button.dataset.filter ||
              "all";

            showAllMovies = false;

            renderMovies();
          }
        );
      }
    );
}


/* ==========================================================
   MOVIE PAGE OVERRIDES
   ========================================================== */

const MOVIE_PAGE_OVERRIDES = {

  "Bethlehem Kudumba Unit|Malayalam":
    "https://uae.voxcinemas.com/movies/bethlehem-kudumba-unit-malayalam",

  "Bethlehem Kudumba Unit|Tamil":
    "https://uae.voxcinemas.com/movies/bethlehem-kudumba-unit-tamil",

  "Fall 2: Deadpoint|English":
    "https://uae.voxcinemas.com/movies/fall-2-deadpoint",

  "Mirzapur|Hindi":
    "https://uae.voxcinemas.com/movies/mirzapur-hindi",

  "It Ends|English":
    "https://uae.voxcinemas.com/movies/it-ends",

  "Insidious: Out Of The Further|English":
    "https://uae.voxcinemas.com/movies/insidious-out-of-the-further",

  "Coyote VS Acme|English":
    "https://uae.voxcinemas.com/movies/coyote-vs-acme",

  "Mutiny|English":
    "https://uae.voxcinemas.com/ar/movies/mutiny"
};


/* ==========================================================
   POSTER CACHE
   ========================================================== */

const POSTER_CACHE_KEY =
  "vox-poster-cache-v3";


let posterCache = {};


try {

  posterCache =
    JSON.parse(
      localStorage.getItem(
        POSTER_CACHE_KEY
      ) || "{}"
    );

}

catch {

  posterCache = {};

}


function savePosterCache() {

  try {

    localStorage.setItem(
      POSTER_CACHE_KEY,
      JSON.stringify(posterCache)
    );

  }

  catch {

    /* Ignore browser storage restrictions. */

  }
}


/* ==========================================================
   MOVIE URL HELPERS
   ========================================================== */

function getMovieKey(movie) {

  return `${
    movie.title || ""
  }|${
    movie.language || ""
  }`;
}


function movieSlug(title = "") {

  return title
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /&/g,
      " and "
    )
    .replace(
      /['’]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}


function isSpecificMovieUrl(url) {

  if (
    typeof url !== "string"
  ) {
    return false;
  }

  return (
    url.includes(
      "uae.voxcinemas.com/"
    ) &&
    url.includes(
      "/movies/"
    ) &&
    !url.endsWith(
      "/movies/whatson"
    )
  );
}


function getMoviePageCandidates(movie) {

  const key =
    getMovieKey(movie);


  const candidates = [];


  if (
    MOVIE_PAGE_OVERRIDES[key]
  ) {

    candidates.push(
      MOVIE_PAGE_OVERRIDES[key]
    );
  }


  if (
    isSpecificMovieUrl(
      movie.url
    )
  ) {

    candidates.push(
      movie.url
    );
  }


  const slug =
    movieSlug(
      movie.title
    );


  if (slug) {

    const language =
      String(
        movie.language || ""
      )
        .trim()
        .toLowerCase();


    if (
      language &&
      language !== "english"
    ) {

      candidates.push(
        `https://uae.voxcinemas.com/movies/${slug}-${language}`
      );
    }


    candidates.push(
      `https://uae.voxcinemas.com/movies/${slug}`
    );
  }


  return [
    ...new Set(candidates)
  ];
}


/* ==========================================================
   LIVE POSTER LOOKUP
   ========================================================== */

async function fetchPosterFromMoviePage(
  pageUrl
) {

  const metadataUrl =
    new URL(
      "https://api.microlink.io/"
    );


  metadataUrl.searchParams.set(
    "url",
    pageUrl
  );


  metadataUrl.searchParams.set(
    "meta",
    "true"
  );


  const response =
    await fetch(
      metadataUrl.toString(),
      {
        cache: "force-cache"
      }
    );


  if (!response.ok) {

    return null;
  }


  const payload =
    await response.json();


  const imageUrl =
    payload
      ?.data
      ?.image
      ?.url;


  if (
    typeof imageUrl !== "string" ||
    !imageUrl.startsWith("https://")
  ) {

    return null;
  }


  if (
    !imageUrl.includes(
      "assets.voxcinemas.com"
    )
  ) {

    return null;
  }


  return imageUrl;
}


/* ==========================================================
   RESOLVE MOVIE MEDIA
   ========================================================== */

async function resolveMovieMedia(movie) {

  const key =
    getMovieKey(movie);


  const pageCandidates =
    getMoviePageCandidates(movie);


  const preferredPage =
    pageCandidates[0] ||
    movie.url ||
    "https://uae.voxcinemas.com/movies/whatson";


  /*
    Local poster already supplied.
  */

  if (
    typeof movie.poster === "string" &&
    movie.poster.trim()
  ) {

    return {
      posterUrl:
        movie.poster.trim(),

      pageUrl:
        preferredPage
    };
  }


  /*
    Previously resolved poster.
  */

  if (
    posterCache[key]?.posterUrl
  ) {

    return posterCache[key];
  }


  /*
    Resolve poster from live movie page.
  */

  for (
    const pageUrl
    of pageCandidates
  ) {

    try {

      const posterUrl =
        await fetchPosterFromMoviePage(
          pageUrl
        );


      if (!posterUrl) {

        continue;
      }


      const result = {
        posterUrl,
        pageUrl
      };


      posterCache[key] =
        result;


      savePosterCache();


      return result;

    }

    catch (error) {

      console.debug(
        "Poster lookup failed:",
        movie.title,
        pageUrl
      );

    }
  }


  return {
    posterUrl: null,
    pageUrl: preferredPage
  };
}


/* ==========================================================
   POSTER PLACEHOLDER
   ========================================================== */

function createPosterPlaceholder(
  title
) {

  const placeholder =
    document.createElement(
      "div"
    );


  placeholder.className =
    "poster-placeholder";


  placeholder.textContent =
    title;


  return placeholder;
}


/* ==========================================================
   MOUNT POSTER
   ========================================================== */

function mountMoviePoster(
  posterWrap,
  movie,
  posterUrl
) {

  if (
    !posterWrap ||
    !posterUrl
  ) {

    return;
  }


  const existingImage =
    posterWrap.querySelector(
      ".movie-poster"
    );


  existingImage?.remove();


  const image =
    document.createElement(
      "img"
    );


  image.className =
    "movie-poster";


  image.src =
    posterUrl;


  image.alt =
    `${movie.title} poster`;


  image.loading =
    "lazy";


  image.decoding =
    "async";


  image.addEventListener(
    "load",
    () => {

      posterWrap
        .querySelector(
          ".poster-placeholder"
        )
        ?.remove();

    },
    {
      once: true
    }
  );


  image.addEventListener(
    "error",
    () => {

      image.remove();

    },
    {
      once: true
    }
  );


  posterWrap.prepend(
    image
  );
}


/* ==========================================================
   MOVIE CARD
   ========================================================== */

function createMovieCard(movie) {

  const card =
    document.createElement(
      "article"
    );


  card.className =
    "movie-card";


  const safeTitle =
    escapeHtml(
      movie.title
    );


  const safeLanguage =
    escapeHtml(
      movie.language ||
      "Language TBC"
    );


  const safeRating =
    escapeHtml(
      movie.rating ||
      "NR"
    );


  const pages =
    getMoviePageCandidates(
      movie
    );


  const initialMovieUrl =
    pages[0] ||
    movie.url ||
    "https://uae.voxcinemas.com/movies/whatson";


  card.innerHTML = `

    <div class="poster-wrap">

      <div class="poster-placeholder">
        ${safeTitle}
      </div>

      <span class="rating">
        ${safeRating}
      </span>

    </div>


    <div class="movie-body">

      <h3>
        ${safeTitle}
      </h3>


      <div class="meta">
        ${safeLanguage}
      </div>


      <div class="card-actions">

        <a
          class="details-card"
          href="${escapeAttr(initialMovieUrl)}"
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


  const posterWrap =
    card.querySelector(
      ".poster-wrap"
    );


  const detailsLink =
    card.querySelector(
      ".details-card"
    );


  resolveMovieMedia(movie)
    .then(
      result => {

        if (
          result?.posterUrl
        ) {

          mountMoviePoster(
            posterWrap,
            movie,
            result.posterUrl
          );
        }


        if (
          detailsLink &&
          result?.pageUrl
        ) {

          detailsLink.href =
            result.pageUrl;
        }

      }
    )
    .catch(
      error => {

        console.debug(
          "Movie media lookup failed:",
          movie.title,
          error
        );

      }
    );


  card
    .querySelector(
      ".book-card"
    )
    ?.addEventListener(
      "click",
      () => {

        if (movieSelect) {

          movieSelect.value =
            movie.title;
        }


        updatePageContext({
          movie:
            movie.title,

          language:
            movie.language ||
            null,

          rating:
            movie.rating ||
            null
        });


        openBooking(
          movie.title
        );
      }
    );


  detailsLink
    ?.addEventListener(
      "click",
      () => {

        updatePageContext({
          movie:
            movie.title,

          language:
            movie.language ||
            null,

          rating:
            movie.rating ||
            null
        });

      }
    );


  return card;
}


/* ==========================================================
   FILTERED MOVIES
   ========================================================== */

function getFilteredMovies() {

  /*
    Current local JSON contains the What's On catalogue.
    It does not provide a reliable Coming Soon flag.
  */

  if (
    activeMovieTab === "soon"
  ) {

    return [];
  }


  return movies.filter(
    movie =>
      activeLanguage === "all" ||
      movie.language === activeLanguage
  );
}


/* ==========================================================
   RENDER MOVIES
   ========================================================== */

function renderMovies() {

  if (!movieGrid) {
    return;
  }


  movieGrid.innerHTML = "";


  const filtered =
    getFilteredMovies();


  if (!filtered.length) {

    movieGrid.innerHTML = `

      <div class="empty-state">

        ${
          activeMovieTab === "soon"
            ? "Coming Soon movies are not included in the current catalogue."
            : "No movies are available for this selection."
        }

      </div>
    `;


    if (viewAllButton) {

      viewAllButton.hidden =
        true;
    }


    updateDisplayedMovieCount(0);

    return;
  }


  const visibleMovies =
    showAllMovies
      ? filtered
      : filtered.slice(0, 10);


  visibleMovies.forEach(
    movie => {

      movieGrid.appendChild(
        createMovieCard(movie)
      );

    }
  );


  if (viewAllButton) {

    viewAllButton.hidden =
      filtered.length <= 10;


    viewAllButton.textContent =
      showAllMovies
        ? "SHOW LESS"
        : "VIEW ALL MOVIES";
  }


  updateDisplayedMovieCount(
    visibleMovies.length
  );
}


/* ==========================================================
   MOVIE COUNT
   ========================================================== */

function updateDisplayedMovieCount(
  visibleCount = 0
) {

  if (!liveStatus) {
    return;
  }


  liveStatus.textContent =
    `Movie catalogue • ${visibleCount} movies`;
}


/* ==========================================================
   MOVIE TABS
   ========================================================== */

document
  .querySelectorAll(".movie-tab")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".movie-tab"
            )
            .forEach(
              item =>
                item.classList.remove(
                  "active"
                )
            );


          button.classList.add(
            "active"
          );


          activeMovieTab =
            button.dataset.movieTab ||
            "now";


          showAllMovies =
            false;


          renderMovies();
        }
      );
    }
  );


/* ==========================================================
   VIEW ALL
   ========================================================== */

viewAllButton
  ?.addEventListener(
    "click",
    () => {

      showAllMovies =
        !showAllMovies;


      renderMovies();


      if (!showAllMovies) {

        document
          .getElementById("movies")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
      }
    }
  );


/* ==========================================================
   LOAD CATALOGUE
   ========================================================== */

async function loadCatalogue() {

  if (liveStatus) {

    liveStatus.textContent =
      "Loading movie catalogue...";
  }


  try {

    const [
      movieResponse,
      cinemaResponse
    ] =
      await Promise.all([

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


    if (liveUpdated) {

      liveUpdated.textContent =
        movieData.updated_at
          ? `Updated ${movieData.updated_at}`
          : "";
    }

  }

  catch (error) {

    console.warn(
      "Using fallback catalogue:",
      error
    );


    movies =
      fallbackMovies;


    cinemas =
      fallbackCinemas;


    if (liveStatus) {

      liveStatus.textContent =
        "Demo movie catalogue";
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


/* ==========================================================
   BOOKING MODAL
   ========================================================== */

const bookingModal =
  document.getElementById("modal");

const modalTitle =
  document.getElementById("modalTitle");

const modalCopy =
  document.getElementById("modalCopy");

const showtimes =
  document.getElementById("showtimes");


function lockPage() {

  document.body.classList.add(
    "modal-open"
  );
}


function unlockPageIfClear() {

  const anyModalOpen =
    document.querySelector(
      ".modal:not([hidden])"
    );


  if (!anyModalOpen) {

    document.body.classList.remove(
      "modal-open"
    );
  }
}


function openBooking(title) {

  if (
    !bookingModal ||
    !showtimes
  ) {

    showMessage(
      `Selected ${title}.`
    );

    return;
  }


  selectedTime = "";


  const cinema =
    cinemaSelect?.value ||
    "your preferred cinema";


  const selectedDate =
    dateSelect?.value ||
    null;


  updatePageContext({
    movie: title || null,
    cinema:
      cinemaSelect?.value || null,
    date: selectedDate,
    session: null
  });


  if (modalTitle) {

    modalTitle.textContent =
      title ||
      "Choose a showtime";
  }


  if (modalCopy) {

    modalCopy.textContent =
      cinemaSelect?.value
        ? `Select a showtime at ${cinema}.`
        : "Select a showtime. You can choose your cinema during the conversation.";
  }


  showtimes.innerHTML = "";


  const demoTimes = [
    "11:15 AM",
    "1:45 PM",
    "4:30 PM",
    "7:15 PM",
    "10:00 PM"
  ];


  demoTimes.forEach(
    time => {

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
            .forEach(
              item =>
                item.classList.remove(
                  "selected"
                )
            );


          button.classList.add(
            "selected"
          );


          selectedTime =
            time;


          updatePageContext({
            session: {
              displayTime: time
            }
          });
        }
      );


      showtimes.appendChild(
        button
      );
    }
  );


  bookingModal.hidden =
    false;


  lockPage();
}


function closeBookingModal() {

  if (!bookingModal) {
    return;
  }


  bookingModal.hidden =
    true;


  unlockPageIfClear();
}


document
  .getElementById("modalClose")
  ?.addEventListener(
    "click",
    closeBookingModal
  );


bookingModal
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target === bookingModal
      ) {

        closeBookingModal();
      }
    }
  );


document
  .getElementById("continueBtn")
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
        `${selectedTime} selected. The assistant can continue the booking journey.`
      );


      closeBookingModal();
    }
  );


document
  .getElementById("findBtn")
  ?.addEventListener(
    "click",
    () => {

      const selectedMovie =
        movieSelect?.value ||
        movies[0]?.title ||
        "a movie";


      updatePageContext({
        movie:
          movieSelect?.value ||
          selectedMovie,

        cinema:
          cinemaSelect?.value ||
          null,

        date:
          dateSelect?.value ||
          null
      });


      openBooking(
        selectedMovie
      );
    }
  );


document
  .getElementById("heroBookBtn")
  ?.addEventListener(
    "click",
    () => {

      const heroMovie =
        "The Odyssey";


      if (movieSelect) {

        const exists =
          [...movieSelect.options]
            .some(
              option =>
                option.value ===
                heroMovie
            );


        if (exists) {

          movieSelect.value =
            heroMovie;
        }
      }


      updatePageContext({
        movie: heroMovie
      });


      openBooking(
        heroMovie
      );
    }
  );


/* ==========================================================
   LOGIN
   ========================================================== */

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

  if (!loginModal) {
    return;
  }


  if (siteLoginError) {

    siteLoginError.hidden = true;
    siteLoginError.textContent = "";
  }


  siteLoginForm?.reset();


  loginModal.hidden =
    false;


  lockPage();


  setTimeout(
    () =>
      siteLoginIdentifier
        ?.focus(),
    50
  );
}


function closeSiteLogin() {

  if (!loginModal) {
    return;
  }


  loginModal.hidden =
    true;


  unlockPageIfClear();
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
        event.target === loginModal
      ) {

        closeSiteLogin();
      }
    }
  );


/* ==========================================================
   VERIFY CUSTOMER
   ========================================================== */

async function verifyDemoCustomer(
  identifier,
  pin
) {

  const sessionResponse =
    await fetch(
      `${CHAT_API_BASE}/widget/session`,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json"
        },

        body:
          JSON.stringify({
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
      `${CHAT_API_BASE}/widget/login`,
      {
        method: "POST",

        headers: {

          "content-type":
            "application/json",

          authorization:
            `Bearer ${session.token}`

        },

        body:
          JSON.stringify({
            identifier,
            pin
          })
      }
    );


  let result = {};


  try {

    result =
      await loginResponse.json();

  }

  catch {

    result = {};
  }


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


  fetch(
    `${CHAT_API_BASE}/widget/logout`,
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
  )
    .catch(
      () => undefined
    );


  return result.customer;
}


/* ==========================================================
   WAIT HELPER
   ========================================================== */

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
              "Timed out waiting for the chat widget."
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


/* ==========================================================
   CONTROLLED INPUT VALUE
   ========================================================== */

function setInputValue(
  input,
  value
) {

  const prototype =
    Object.getPrototypeOf(input);


  const descriptor =
    Object.getOwnPropertyDescriptor(
      prototype,
      "value"
    );


  if (
    descriptor &&
    typeof descriptor.set ===
      "function"
  ) {

    descriptor.set.call(
      input,
      value
    );

  }

  else {

    input.value =
      value;
  }


  input.dispatchEvent(
    new Event(
      "input",
      {
        bubbles: true
      }
    )
  );


  input.dispatchEvent(
    new Event(
      "change",
      {
        bubbles: true
      }
    )
  );
}


/* ==========================================================
   SYNC LOGIN TO EXTERNAL CHAT
   ========================================================== */

async function syncChatLogin(
  identifier,
  pin
) {

  await waitFor(
    () =>
      window[EMBED_GLOBAL_KEY] &&
      document
        .getElementById(
          EMBED_HOST_ID
        )
        ?.shadowRoot
  );


  window[
    EMBED_GLOBAL_KEY
  ].login();


  const shadow =
    document
      .getElementById(
        EMBED_HOST_ID
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
      "Chat login fields were not found."
    );
  }


  setInputValue(
    identifierInput,
    identifier
  );


  setInputValue(
    pinInput,
    pin
  );


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


/* ==========================================================
   SIGN IN
   ========================================================== */

siteLoginForm
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const identifier =
        siteLoginIdentifier
          ?.value
          .trim() ||
        "";


      const pin =
        siteLoginPin
          ?.value
          .trim() ||
        "";


      if (
        !identifier ||
        !pin
      ) {

        return;
      }


      if (siteLoginError) {

        siteLoginError.hidden = true;
        siteLoginError.textContent = "";
      }


      if (siteLoginSubmit) {

        siteLoginSubmit.disabled =
          true;

        siteLoginSubmit.textContent =
          "SIGNING IN...";
      }


      try {

        const customer =
          await verifyDemoCustomer(
            identifier,
            pin
          );


        await syncChatLogin(
          identifier,
          pin
        );


        hostCustomer =
          customer;


        if (loginButton) {

          loginButton.textContent =
            customer.firstName
              ? `HI, ${customer.firstName.toUpperCase()}`
              : "ACCOUNT";


          loginButton.classList.add(
            "account-signed-in"
          );


          loginButton.title =
            "Signed in";
        }


        updatePageContext({
          authenticated: true
        });


        closeSiteLogin();


        showMessage(
          customer.firstName
            ? `Welcome ${customer.firstName}. Your customer profile is now available to the assistant.`
            : "You are now signed in."
        );


        if (siteLoginPin) {

          siteLoginPin.value = "";
        }

      }

      catch (error) {

        console.error(
          "Customer login failed:",
          error
        );


        if (siteLoginError) {

          siteLoginError.textContent =
            error.message ||
            "Could not sign in.";


          siteLoginError.hidden =
            false;
        }

      }

      finally {

        if (siteLoginSubmit) {

          siteLoginSubmit.disabled =
            false;

          siteLoginSubmit.textContent =
            "SIGN IN";
        }
      }
    }
  );


/* ==========================================================
   SIGN OUT
   ========================================================== */

async function signOutEverywhere() {

  try {

    if (
      window[
        EMBED_GLOBAL_KEY
      ]
    ) {

      window[
        EMBED_GLOBAL_KEY
      ].logout();
    }

  }

  catch (error) {

    console.warn(
      "Chat logout warning:",
      error
    );
  }


  hostCustomer = null;


  if (loginButton) {

    loginButton.textContent =
      "SIGN IN";

    loginButton.classList.remove(
      "account-signed-in"
    );

    loginButton.title = "";
  }


  updatePageContext({
    authenticated: false
  });


  showMessage(
    "You are now browsing as a guest."
  );
}


/* ==========================================================
   LOGIN BUTTON
   ========================================================== */

loginButton
  ?.addEventListener(
    "click",
    async () => {

      if (!hostCustomer) {

        openSiteLogin();

        return;
      }


      const customerName =
        hostCustomer.firstName ||
        "this account";


      const confirmed =
        window.confirm(
          `Sign out ${customerName}?`
        );


      if (confirmed) {

        await signOutEverywhere();
      }
    }
  );


/* ==========================================================
   SEARCH
   ========================================================== */

document
  .getElementById("searchBtn")
  ?.addEventListener(
    "click",
    () => {

      const query =
        window.prompt(
          "Search movies"
        );


      if (!query) {
        return;
      }


      const normalisedQuery =
        query
          .trim()
          .toLowerCase();


      const match =
        movies.find(
          movie =>
            movie.title
              .toLowerCase()
              .includes(
                normalisedQuery
              )
        );


      if (!match) {

        showMessage(
          "No matching movie found."
        );

        return;
      }


      activeMovieTab = "now";
      activeLanguage = "all";
      showAllMovies = true;


      document
        .querySelectorAll(
          ".movie-tab"
        )
        .forEach(
          button => {

            button.classList.toggle(
              "active",
              button.dataset.movieTab ===
                "now"
            );
          }
        );


      filterWrap
        ?.querySelectorAll(
          ".chip"
        )
        .forEach(
          button => {

            button.classList.toggle(
              "active",
              button.dataset.filter ===
                "all"
            );
          }
        );


      renderMovies();


      if (movieSelect) {

        movieSelect.value =
          match.title;
      }


      updatePageContext({
        movie:
          match.title,

        language:
          match.language ||
          null,

        rating:
          match.rating ||
          null
      });


      document
        .getElementById("movies")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    }
  );


/* ==========================================================
   MOBILE MENU
   ========================================================== */

document
  .getElementById("menuBtn")
  ?.addEventListener(
    "click",
    () => {

      if (!mobileMenu) {
        return;
      }


      mobileMenu.hidden =
        !mobileMenu.hidden;
    }
  );


mobileMenu
  ?.querySelectorAll("a")
  .forEach(
    link => {

      link.addEventListener(
        "click",
        () => {

          mobileMenu.hidden = true;
        }
      );
    }
  );


/* ==========================================================
   ESCAPE KEY
   ========================================================== */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key !== "Escape"
    ) {

      return;
    }


    if (
      bookingModal &&
      !bookingModal.hidden
    ) {

      closeBookingModal();
    }


    if (
      loginModal &&
      !loginModal.hidden
    ) {

      closeSiteLogin();
    }


    if (
      mobileMenu &&
      !mobileMenu.hidden
    ) {

      mobileMenu.hidden = true;
    }
  }
);


/* ==========================================================
   PAGE MESSAGE
   ========================================================== */

function showMessage(message) {

  const bookingResult =
    document.getElementById(
      "bookingResult"
    );


  if (!bookingResult) {
    return;
  }


  bookingResult.textContent =
    message;


  clearTimeout(
    showMessage.timer
  );


  showMessage.timer =
    setTimeout(
      () => {

        if (
          bookingResult.textContent ===
          message
        ) {

          bookingResult.textContent = "";
        }
      },
      7000
    );
}


/* ==========================================================
   START
   ========================================================== */

loadCatalogue();
