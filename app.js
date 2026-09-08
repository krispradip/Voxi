let movies = [];
let cinemas = [];
let selectedTime = '';

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

const movieGrid = document.getElementById('movieGrid');
const movieSelect = document.getElementById('movieSelect');
const cinemaSelect = document.getElementById('cinemaSelect');
const dateSelect = document.getElementById('dateSelect');
const filterWrap = document.querySelector('.movie-filters');
const liveStatus = document.getElementById('liveStatus');
const liveUpdated = document.getElementById('liveUpdated');


/* DATE SELECTOR */

const fmt = d =>
  d.toLocaleDateString('en-AE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

if (dateSelect) {
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);

    dateSelect.add(
      new Option(
        i === 0 ? `Today • ${fmt(d)}` : fmt(d),
        d.toISOString().slice(0, 10)
      )
    );
  }
}


/* POPULATE SELECTORS */

function populateSelectors() {

  if (movieSelect) {
    movieSelect.innerHTML =
      '<option value="">Any Movie</option>';

    movies.forEach(movie => {
      const label =
        `${movie.title}${
          movie.language ? ` (${movie.language})` : ''
        }`;

      movieSelect.add(
        new Option(label, movie.title)
      );
    });
  }

  if (cinemaSelect) {
    cinemaSelect.innerHTML =
      '<option value="">Select Cinema</option>';

    cinemas.forEach(cinema => {
      cinemaSelect.add(
        new Option(cinema, cinema)
      );
    });
  }
}


/* LANGUAGE FILTERS */

function buildFilters() {

  if (!filterWrap) return;

  const languages = [
    ...new Set(
      movies
        .map(movie => movie.language)
        .filter(Boolean)
    )
  ].sort();

  const preferred = [
    'English',
    'Arabic',
    'Hindi',
    'Malayalam',
    'Tamil'
  ];

  const ordered = [
    ...preferred.filter(
      language => languages.includes(language)
    ),
    ...languages.filter(
      language => !preferred.includes(language)
    )
  ];

  filterWrap.innerHTML = '';

  const all = document.createElement('button');

  all.className = 'chip active';
  all.dataset.filter = 'all';
  all.textContent = 'All';

  filterWrap.appendChild(all);

  ordered.forEach(language => {

    const button = document.createElement('button');

    button.className = 'chip';
    button.dataset.filter = language;
    button.textContent = language;

    filterWrap.appendChild(button);
  });

  filterWrap
    .querySelectorAll('.chip')
    .forEach(button => {

      button.onclick = () => {

        filterWrap
          .querySelectorAll('.chip')
          .forEach(item =>
            item.classList.remove('active')
          );

        button.classList.add('active');

        render(button.dataset.filter);
      };
    });
}


/* SAFE TEXT */

function escapeHtml(value = '') {

  return String(value).replace(
    /[&<>'"]/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[character]
  );
}

function escapeAttr(value = '') {
  return escapeHtml(value);
}


/* POSTER */

function posterMarkup(movie) {

  const src = movie.poster || '';

  if (!src) {
    return `
      <div class="poster-fallback">
        <span>VOX</span>
        <strong>${escapeHtml(movie.title)}</strong>
      </div>
    `;
  }

  return `
    <img
      src="${escapeAttr(src)}"
      alt="${escapeAttr(movie.title)} poster"
      loading="lazy"
      onerror="
        this.style.display='none';
        this.nextElementSibling.style.display='flex';
      "
    >

    <div class="poster-fallback hidden">
      <span>VOX</span>
      <strong>${escapeHtml(movie.title)}</strong>
    </div>
  `;
}


/* RENDER MOVIES */

function render(filter = 'all') {

  if (!movieGrid) return;

  movieGrid.innerHTML = '';

  const list = movies.filter(movie =>
    filter === 'all' ||
    movie.language === filter
  );

  list.forEach(movie => {

    const card = document.createElement('article');

    card.className = 'movie-card';

    card.innerHTML = `
      <div class="poster-wrap">

        ${posterMarkup(movie)}

        <span class="rating">
          ${escapeHtml(movie.rating || 'NR')}
        </span>

      </div>

      <div class="movie-body">

        <h3>
          ${escapeHtml(movie.title)}
        </h3>

        <div class="meta">
          ${escapeHtml(
            movie.language || 'Language TBC'
          )}
        </div>

        <div class="card-actions">

          <a
            class="details-card"
            href="${escapeAttr(
              movie.url ||
              'https://uae.voxcinemas.com/movies/whatson'
            )}"
            target="_blank"
            rel="noopener">
            View on VOX
          </a>

          <button class="book-card">
            Book
          </button>

        </div>

      </div>
    `;

    card
      .querySelector('.book-card')
      .onclick =
        () => openBooking(movie.title);

    movieGrid.appendChild(card);
  });

  if (!list.length) {

    movieGrid.innerHTML = `
      <p class="empty-state">
        No movies found for this language.
      </p>
    `;
  }
}


/* LOAD CATALOGUE */

async function loadCatalogue() {

  if (liveStatus) {
    liveStatus.textContent =
      'Loading live catalogue…';
  }

  try {

    const [
      movieResponse,
      cinemaResponse
    ] = await Promise.all([

      fetch(`data/movies.json?ts=${Date.now()}`, {
        cache: 'no-store'
      }),

      fetch(`data/cinemas.json?ts=${Date.now()}`, {
        cache: 'no-store'
      })

    ]);

    if (
      !movieResponse.ok ||
      !cinemaResponse.ok
    ) {
      throw new Error(
        'Catalogue feed unavailable'
      );
    }

    const movieData =
      await movieResponse.json();

    const cinemaData =
      await cinemaResponse.json();

    movies = movieData.movies || [];
    cinemas = cinemaData.cinemas || [];

    if (!movies.length) {
      throw new Error(
        'No movies returned'
      );
    }

    if (liveStatus) {
      liveStatus.textContent =
        `Live catalogue • ${movies.length} movies`;

      liveStatus.classList.add('ok');
    }

    const stamp =
      new Date(movieData.updated_at);

    if (liveUpdated) {
      liveUpdated.textContent =
        isNaN(stamp)
          ? ''
          : `Updated ${stamp.toLocaleString(
              'en-AE',
              {
                dateStyle: 'medium',
                timeStyle: 'short'
              }
            )}`;
    }

  } catch (error) {

    movies = fallbackMovies;
    cinemas = fallbackCinemas;

    if (liveStatus) {
      liveStatus.textContent =
        'Fallback catalogue';

      liveStatus.classList.add('warn');
    }

    if (liveUpdated) {
      liveUpdated.textContent =
        'Live feed currently unavailable';
    }

    console.warn(error);
  }

  populateSelectors();
  buildFilters();
  render();
}


/* BOOKING */

const modal =
  document.getElementById('modal');

const modalTitle =
  document.getElementById('modalTitle');

const modalCopy =
  document.getElementById('modalCopy');

const showtimes =
  document.getElementById('showtimes');


function openBooking(title) {

  if (!modal || !showtimes) return;

  selectedTime = '';

  const cinema =
    cinemaSelect?.value ||
    'your preferred cinema';

  if (modalTitle) {
    modalTitle.textContent =
      title || 'Choose a showtime';
  }

  if (modalCopy) {
    modalCopy.textContent =
      `Prototype showtimes at ${cinema}. ` +
      `The movie catalogue is live. ` +
      `Showtimes are simulated in this version.`;
  }

  showtimes.innerHTML = '';

  [
    '11:15 AM',
    '1:45 PM',
    '4:30 PM',
    '7:15 PM',
    '10:00 PM'
  ].forEach(time => {

    const button =
      document.createElement('button');

    button.className = 'showtime';
    button.textContent = time;

    button.onclick = () => {

      showtimes
        .querySelectorAll('.showtime')
        .forEach(item =>
          item.classList.remove('selected')
        );

      button.classList.add('selected');
      selectedTime = time;
    };

    showtimes.appendChild(button);
  });

  modal.hidden = false;
}


/* OPTIONAL EXISTING BUTTONS */

const modalClose =
  document.getElementById('modalClose');

if (modalClose) {
  modalClose.onclick =
    () => modal.hidden = true;
}

if (modal) {
  modal.onclick = event => {
    if (event.target === modal) {
      modal.hidden = true;
    }
  };
}


const continueBtn =
  document.getElementById('continueBtn');

if (continueBtn) {
  continueBtn.onclick = () => {

    showMessage(
      selectedTime
        ? `Prototype: ${selectedTime} selected. Seat selection and checkout would follow.`
        : 'Choose a showtime first.'
    );

    if (selectedTime && modal) {
      modal.hidden = true;
    }
  };
}


const findBtn =
  document.getElementById('findBtn');

if (findBtn) {
  findBtn.onclick = () => {

    const movie =
      movieSelect?.value ||
      movies[0]?.title ||
      'a movie';

    const bookingResult =
      document.getElementById('bookingResult');

    if (bookingResult) {
      bookingResult.textContent =
        `Searching ${
          cinemaSelect?.value ||
          'all cinemas'
        } for ${movie}...`;
    }

    openBooking(movie);
  };
}


const viewAllBtn =
  document.getElementById('viewAllBtn');

if (viewAllBtn) {
  viewAllBtn.onclick = () => {

    filterWrap
      ?.querySelectorAll('.chip')
      .forEach(item =>
        item.classList.remove('active')
      );

    filterWrap
      ?.querySelector('[data-filter="all"]')
      ?.classList.add('active');

    render('all');

    movieGrid?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };
}


function showMessage(message) {

  const bookingResult =
    document.getElementById('bookingResult');

  if (bookingResult) {
    bookingResult.textContent = message;
  }

  document
    .getElementById('booking')
    ?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
}


/* START */

loadCatalogue();
