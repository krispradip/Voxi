let movies = [];
let cinemas = [];
let selectedTime = "";


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


/* -------------------------------------------------------
   DATE SELECTOR
------------------------------------------------------- */

const formatDate = date =>
  date.toLocaleDateString("en-AE", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });


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
   SAFE TEXT
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
   POPULATE MOVIE / CINEMA SELECTORS
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


  /*
     If an external poster is broken,
     remove the card completely.

     This keeps the demo page clean instead
     of showing broken-image placeholders.
  */

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


  const bookButton =
    card.querySelector(
      ".book-card"
    );

  bookButton.addEventListener(
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


  /*
     Only show movies that actually have
     a poster value.

     If the URL itself turns out to be broken,
     createMovieCard() removes the card.
  */

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
   DISPLAY COUNT
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
   LOAD MOVIES AND CINEMAS
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


    /*
       We are no longer pretending that
       this is a continuously refreshed feed.
    */

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

const modal =
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
    !modal ||
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


  const demoTimes = [
    "11:15 AM",
    "1:45 PM",
    "4:30 PM",
    "7:15 PM",
    "10:00 PM"
  ];


  demoTimes.forEach(time => {

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


  modal.hidden =
    false;
}


/* -------------------------------------------------------
   MODAL CLOSE
------------------------------------------------------- */

const modalClose =
  document.getElementById(
    "modalClose"
  );


if (modalClose) {

  modalClose.addEventListener(
    "click",
    () => {

      if (modal) {
        modal.hidden = true;
      }
    }
  );
}


if (modal) {

  modal.addEventListener(
    "click",
    event => {

      if (
        event.target === modal
      ) {

        modal.hidden =
          true;
      }
    }
  );
}


/* -------------------------------------------------------
   CONTINUE BUTTON
------------------------------------------------------- */

const continueButton =
  document.getElementById(
    "continueBtn"
  );


if (continueButton) {

  continueButton.addEventListener(
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
        `For the final demo, the conversational bot will handle the complete booking journey.`
      );


      if (modal) {

        modal.hidden =
          true;
      }
    }
  );
}


/* -------------------------------------------------------
   QUICK BOOKING
------------------------------------------------------- */

const findButton =
  document.getElementById(
    "findBtn"
  );


if (findButton) {

  findButton.addEventListener(
    "click",
    () => {

      const selectedMovie =
        movieSelect?.value ||
        movies[0]?.title ||
        "a movie";


      const bookingResult =
        document.getElementById(
          "bookingResult"
        );


      if (bookingResult) {

        bookingResult.textContent =
          `Searching ${
            cinemaSelect?.value ||
            "all cinemas"
          } for ${selectedMovie}...`;
      }


      openBooking(
        selectedMovie
      );
    }
  );
}


/* -------------------------------------------------------
   VIEW ALL
------------------------------------------------------- */

const viewAllButton =
  document.getElementById(
    "viewAllBtn"
  );


if (viewAllButton) {

  viewAllButton.addEventListener(
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
}


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


  document
    .getElementById(
      "booking"
    )
    ?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
}


/* -------------------------------------------------------
   START
------------------------------------------------------- */

loadCatalogue();
