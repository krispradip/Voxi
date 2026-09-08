let movies = [];
let cinemas = [];
let selectedTime = '';

const fallbackMovies = [
  {title:"I'm Game",language:"Malayalam",rating:"PG15",poster:"assets/im-game.png",url:"https://uae.voxcinemas.com/movies/whatson"},
  {title:"The Odyssey",language:"English",rating:"15+",poster:"assets/odyssey.png",url:"https://uae.voxcinemas.com/movies/whatson"},
  {title:"Spider-Man: Brand New Day",language:"English",rating:"PG13",poster:"assets/spiderman.png",url:"https://uae.voxcinemas.com/movies/whatson"}
];
const fallbackCinemas = ["Mall of the Emirates","City Centre Mirdif","Dubai Festival City Mall","Burjuman","Yas Mall - Abu Dhabi"];

const movieGrid = document.getElementById('movieGrid');
const movieSelect = document.getElementById('movieSelect');
const cinemaSelect = document.getElementById('cinemaSelect');
const dateSelect = document.getElementById('dateSelect');
const filterWrap = document.querySelector('.movie-filters');
const liveStatus = document.getElementById('liveStatus');
const liveUpdated = document.getElementById('liveUpdated');

const fmt = d => d.toLocaleDateString('en-AE',{weekday:'short',day:'numeric',month:'short'});
for(let i=0;i<7;i++){
  const d=new Date(); d.setDate(d.getDate()+i);
  dateSelect.add(new Option(i===0?`Today • ${fmt(d)}`:fmt(d),d.toISOString().slice(0,10)));
}

function populateSelectors(){
  movieSelect.innerHTML='<option value="">Any Movie</option>';
  cinemaSelect.innerHTML='<option value="">Select Cinema</option>';
  movies.forEach(m=>movieSelect.add(new Option(`${m.title}${m.language?` (${m.language})`:''}`,m.title)));
  cinemas.forEach(c=>cinemaSelect.add(new Option(c,c)));
}

function buildFilters(){
  const langs=[...new Set(movies.map(m=>m.language).filter(Boolean))].sort();
  const preferred=['English','Arabic','Hindi','Malayalam','Tamil'];
  const ordered=[...preferred.filter(x=>langs.includes(x)),...langs.filter(x=>!preferred.includes(x))];
  filterWrap.innerHTML='';
  const all=document.createElement('button');
  all.className='chip active'; all.dataset.filter='all'; all.textContent='All'; filterWrap.appendChild(all);
  ordered.forEach(lang=>{const b=document.createElement('button');b.className='chip';b.dataset.filter=lang;b.textContent=lang;filterWrap.appendChild(b)});
  filterWrap.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{
    filterWrap.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); render(b.dataset.filter);
  });
}

function posterMarkup(m){
  const src=m.poster||'';
  if(!src) return `<div class="poster-fallback"><span>VOX</span><strong>${escapeHtml(m.title)}</strong></div>`;
  return `<img src="${escapeAttr(src)}" alt="${escapeAttr(m.title)} poster" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="poster-fallback hidden"><span>VOX</span><strong>${escapeHtml(m.title)}</strong></div>`;
}

function render(filter='all'){
  movieGrid.innerHTML='';
  const list=movies.filter(m=>filter==='all'||m.language===filter);
  list.forEach(m=>{
    const el=document.createElement('article'); el.className='movie-card';
    el.innerHTML=`<div class="poster-wrap">${posterMarkup(m)}<span class="rating">${escapeHtml(m.rating||'NR')}</span></div>
      <div class="movie-body"><h3>${escapeHtml(m.title)}</h3><div class="meta">${escapeHtml(m.language||'Language TBC')}</div>
      <div class="card-actions"><a class="details-card" href="${escapeAttr(m.url||'https://uae.voxcinemas.com/movies/whatson')}" target="_blank" rel="noopener">View on VOX</a><button class="book-card">Book</button></div></div>`;
    el.querySelector('.book-card').onclick=()=>openBooking(m.title);
    movieGrid.appendChild(el);
  });
  if(!list.length) movieGrid.innerHTML='<p class="empty-state">No movies found for this language.</p>';
}

function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function escapeAttr(value=''){return escapeHtml(value)}

async function loadCatalogue(){
  liveStatus.textContent='Loading live catalogue…';
  try{
    const [movieRes,cinemaRes]=await Promise.all([
      fetch(`data/movies.json?ts=${Date.now()}`,{cache:'no-store'}),
      fetch(`data/cinemas.json?ts=${Date.now()}`,{cache:'no-store'})
    ]);
    if(!movieRes.ok||!cinemaRes.ok) throw new Error('Catalogue feed unavailable');
    const movieData=await movieRes.json(); const cinemaData=await cinemaRes.json();
    movies=movieData.movies||[]; cinemas=cinemaData.cinemas||[];
    if(!movies.length) throw new Error('No movies returned');
    liveStatus.textContent=`Live catalogue • ${movies.length} movies`;
    liveStatus.classList.add('ok');
    const stamp=new Date(movieData.updated_at);
    liveUpdated.textContent=isNaN(stamp)?'':`Updated ${stamp.toLocaleString('en-AE',{dateStyle:'medium',timeStyle:'short'})}`;
  }catch(err){
    movies=fallbackMovies; cinemas=fallbackCinemas;
    liveStatus.textContent='Fallback catalogue';
    liveStatus.classList.add('warn');
    liveUpdated.textContent='Live feed will work on GitHub Pages / a local web server.';
    console.warn(err);
  }
  populateSelectors(); buildFilters(); render();
}

const modal=document.getElementById('modal'),modalTitle=document.getElementById('modalTitle'),modalCopy=document.getElementById('modalCopy'),showtimes=document.getElementById('showtimes');
function openBooking(title){
  selectedTime='';
  const cinema=cinemaSelect.value||'your preferred cinema';
  modalTitle.textContent=title||'Choose a showtime';
  modalCopy.textContent=`Prototype showtimes at ${cinema}. Live movie catalogue is connected; live showtimes remain simulated in this version.`;
  showtimes.innerHTML='';
  ['11:15 AM','1:45 PM','4:30 PM','7:15 PM','10:00 PM'].forEach(t=>{
    const b=document.createElement('button'); b.className='showtime'; b.textContent=t;
    b.onclick=()=>{showtimes.querySelectorAll('.showtime').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selectedTime=t};
    showtimes.appendChild(b);
  });
  modal.hidden=false;
}

document.getElementById('modalClose').onclick=()=>modal.hidden=true;
modal.onclick=e=>{if(e.target===modal)modal.hidden=true};
document.getElementById('continueBtn').onclick=()=>{
  showMessage(selectedTime?`Prototype: ${selectedTime} selected. Seat selection and checkout would follow.`:'Choose a showtime first.');
  if(selectedTime)modal.hidden=true;
};
document.getElementById('findBtn').onclick=()=>{
  const m=movieSelect.value||movies[0]?.title||'a movie';
  document.getElementById('bookingResult').textContent=`Searching ${cinemaSelect.value||'all cinemas'} for ${m}...`;
  openBooking(m);
};
document.getElementById('viewAllBtn').onclick=()=>{
  filterWrap.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
  filterWrap.querySelector('[data-filter="all"]')?.classList.add('active');
  render('all'); movieGrid.scrollIntoView({behavior:'smooth',block:'start'});
};
function showMessage(msg){document.getElementById('bookingResult').textContent=msg;document.getElementById('booking').scrollIntoView({behavior:'smooth',block:'center'})}
document.getElementById('loginBtn').onclick=()=>showMessage('Prototype sign-in: connect this button to the production identity flow when a backend is added.');
document.getElementById('searchBtn').onclick=()=>{
  const q=prompt('Search movies'); if(!q)return;
  const m=movies.find(x=>x.title.toLowerCase().includes(q.toLowerCase()));
  if(m){movieSelect.value=m.title;document.getElementById('movies').scrollIntoView({behavior:'smooth'});showMessage(`Found live listing: ${m.title} (${m.language}).`)}
  else showMessage('No matching movie in the current VOX catalogue.');
};
document.getElementById('menuBtn').onclick=()=>alert('Prototype menu: Movies • Experiences • Offers • Food & Drinks');

loadCatalogue();
