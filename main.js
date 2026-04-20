/* ═══════════════════════════════════════════════════════════════
   FLYWITHUS — MAIN APPLICATION
   GSAP ScrollTrigger PIN + Canvas Frame Sequence
   FULL BOOKING SYSTEM + LIVE FLIGHT TRACKER + WORLD MAP
   ═══════════════════════════════════════════════════════════════ */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CONFIG = {
  FRAME_COUNT: 61,
  FRAME_PATH: '/frames/ezgif-frame-',
  PARTICLE_COUNT: 80,
  CURSOR_LERP: 0.15,
  SCROLL_DISTANCE: 5,
  API_BASE: '/api',
};

// ═══════════════════════════════════════════════════════════
// 1. LOADER
// ═══════════════════════════════════════════════════════════
class Loader {
  constructor() {
    this.el = document.getElementById('loader');
    this.barFill = document.getElementById('loader-bar-fill');
    this.images = [];
    this.loaded = 0;
  }

  preloadFrames() {
    return new Promise((resolve) => {
      for (let i = 1; i <= CONFIG.FRAME_COUNT; i++) {
        const img = new Image();
        const pad = String(i).padStart(3, '0');
        img.src = `${CONFIG.FRAME_PATH}${pad}.jpg`;

        const onDone = () => {
          this.loaded++;
          this.barFill.style.width = ((this.loaded / CONFIG.FRAME_COUNT) * 100) + '%';
          if (this.loaded === CONFIG.FRAME_COUNT) resolve(this.images);
        };

        img.onload = onDone;
        img.onerror = onDone;
        this.images.push(img);
      }
    });
  }

  hide() {
    gsap.to(this.el, {
      opacity: 0,
      duration: 0.8,
      ease: 'power3.inOut',
      onComplete: () => {
        this.el.classList.add('hidden');
        this.el.style.display = 'none';
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════
// 2. CUSTOM CURSOR
// ═══════════════════════════════════════════════════════════
class CustomCursor {
  constructor() {
    this.dot = document.getElementById('cursor-dot');
    this.ring = document.getElementById('cursor-ring');
    this.pos = { x: -100, y: -100 };
    this.target = { x: -100, y: -100 };
    this.visible = false;

    if (window.matchMedia('(pointer: fine)').matches) this.init();
  }

  init() {
    window.addEventListener('mousemove', (e) => {
      this.target.x = e.clientX;
      this.target.y = e.clientY;
      if (!this.visible) {
        this.visible = true;
        this.dot.style.opacity = '1';
        this.ring.style.opacity = '0.4';
      }
    });

    document.querySelectorAll('[data-hover]').forEach(el => {
      el.addEventListener('mouseenter', () => {
        this.dot.classList.add('hovering');
        this.ring.classList.add('hovering');
      });
      el.addEventListener('mouseleave', () => {
        this.dot.classList.remove('hovering');
        this.ring.classList.remove('hovering');
      });
    });

    this._raf();
  }

  _raf() {
    this.pos.x += (this.target.x - this.pos.x) * CONFIG.CURSOR_LERP;
    this.pos.y += (this.target.y - this.pos.y) * CONFIG.CURSOR_LERP;
    this.dot.style.left = this.target.x + 'px';
    this.dot.style.top = this.target.y + 'px';
    this.ring.style.left = this.pos.x + 'px';
    this.ring.style.top = this.pos.y + 'px';
    requestAnimationFrame(() => this._raf());
  }
}

// ═══════════════════════════════════════════════════════════
// 3. PARTICLES
// ═══════════════════════════════════════════════════════════
class ParticleSystem {
  constructor(id) {
    this.canvas = document.getElementById(id);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: -1000, y: -1000 };
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    this._create();
    this._raf();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _create() {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
        amp: Math.random() * 0.5 + 0.2,
        o: Math.random() * 0.4 + 0.1,
      });
    }
  }

  _raf() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const t = Date.now() * 0.001;

    this.particles.forEach(p => {
      p.x += p.vx + Math.sin(t + p.phase) * p.amp * 0.3;
      p.y += p.vy + Math.cos(t + p.phase) * p.amp * 0.2;
      const dx = p.x - this.mouse.x, dy = p.y - this.mouse.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 120) { const f = (120 - d) / 120; p.x += (dx / d) * f * 2; p.y += (dy / d) * f * 2; }
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(200, 195, 185, ${p.o})`;
      this.ctx.fill();
    });

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 140) {
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.strokeStyle = `rgba(200, 195, 185, ${0.03 * (1 - d / 140)})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    }
    requestAnimationFrame(() => this._raf());
  }
}

// ═══════════════════════════════════════════════════════════
// 4. FRAME SEQUENCE
// ═══════════════════════════════════════════════════════════
class FrameSequence {
  constructor(canvas, images) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = images;
    this.currentFrame = -1;
    this.dpr = window.devicePixelRatio || 1;

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._draw(0);
    requestAnimationFrame(() => this._draw(0));
  }

  _resize() {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * this.dpr;
    this.canvas.height = window.innerHeight * this.dpr;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    if (this.currentFrame >= 0) this._draw(this.currentFrame);
  }

  _draw(index) {
    index = Math.max(0, Math.min(index, this.images.length - 1));
    if (index === this.currentFrame) return;
    this.currentFrame = index;

    const img = this.images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = this.canvas.width;
    const ch = this.canvas.height;

    const imgR = img.naturalWidth / img.naturalHeight;
    const canR = cw / ch;
    let dw, dh, ox, oy;
    if (canR > imgR) {
      dw = cw; dh = cw / imgR; ox = 0; oy = (ch - dh) / 2;
    } else {
      dh = ch; dw = ch * imgR; ox = (cw - dw) / 2; oy = 0;
    }

    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, ox, oy, dw, dh);

    const g = this.ctx.createRadialGradient(cw / 2, ch / 2, cw * 0.25, cw / 2, ch / 2, cw * 0.75);
    g.addColorStop(0, 'rgba(8,13,26,0)');
    g.addColorStop(1, 'rgba(8,13,26,0.45)');
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, cw, ch);
  }

  setup() {
    const totalFrames = this.images.length - 1;
    const panels = document.querySelectorAll('.story__panel');
    const panelRanges = [
      { start: 0.02, end: 0.30 },
      { start: 0.33, end: 0.62 },
      { start: 0.65, end: 0.95 },
    ];

    ScrollTrigger.create({
      trigger: '.story',
      start: 'top top',
      end: `+=${window.innerHeight * CONFIG.SCROLL_DISTANCE}`,
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      onUpdate: (self) => {
        const progress = self.progress;
        const frameIndex = Math.round(progress * totalFrames);
        this._draw(frameIndex);
        panels.forEach((panel, i) => {
          const range = panelRanges[i];
          if (range && progress >= range.start && progress <= range.end) {
            panel.classList.add('active');
          } else {
            panel.classList.remove('active');
          }
        });
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════
// 5. SCROLL ANIMATIONS
// ═══════════════════════════════════════════════════════════
class ScrollAnimations {
  constructor() {
    this._navbar();
    this._hero();
    this._reveals();
    this._parallax();
    this._counters();
    this._cardEnter();
    this._ctaZoom();
  }

  _navbar() {
    ScrollTrigger.create({
      start: 'top -80px',
      onUpdate: () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 80) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
      },
    });
  }

  _hero() {
    gsap.set('.hero__tagline', { opacity: 0, y: 30 });
    gsap.set('.hero__title-line', { opacity: 0, y: 60 });
    gsap.set('.hero__desc', { opacity: 0, y: 30 });
    gsap.set('.hero__actions', { opacity: 0, y: 30 });
    gsap.set('.hero__scroll-indicator', { opacity: 0 });

    const tl = gsap.timeline({ delay: 1.5 });
    tl.to('.hero__tagline', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
      .to('.hero__title-line', { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: 'power3.out' }, '-=0.4')
      .to('.hero__desc', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5')
      .to('.hero__actions', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.4')
      .to('.hero__scroll-indicator', { opacity: 1, duration: 1, ease: 'power2.out' }, '-=0.3');

    gsap.to('.hero__scroll-indicator', {
      opacity: 0,
      scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=200', scrub: true },
    });
  }

  _reveals() {
    ['.destinations', '.experience', '.fleet', '.testimonials', '.cta-section', '.lookup-section', '.live-tracker'].forEach(sec => {
      gsap.utils.toArray(`${sec} .reveal-text`).forEach((el, i) => {
        gsap.fromTo(el,
          { opacity: 0, y: 40 },
          {
            opacity: 1, y: 0,
            duration: 0.8,
            delay: i * 0.1 + (parseFloat(el.dataset.delay) || 0),
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
          }
        );
      });
    });
  }

  _parallax() {
    const el = document.querySelector('[data-parallax]');
    if (!el) return;
    gsap.to(el, {
      y: -100,
      ease: 'none',
      scrollTrigger: { trigger: '.fleet', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  _counters() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseFloat(el.getAttribute('data-count'));
      const dec = target % 1 !== 0;
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to({ v: 0 }, {
            v: target,
            duration: 2,
            ease: 'power2.out',
            onUpdate: function () {
              el.textContent = dec ? this.targets()[0].v.toFixed(1) : Math.round(this.targets()[0].v);
            },
          });
        },
      });
    });
  }

  _cardEnter() {
    gsap.fromTo('.dest-card',
      { opacity: 0, y: 60, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: '.destinations__grid', start: 'top 80%', toggleActions: 'play none none none' },
      }
    );

    gsap.fromTo('.exp-card',
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.experience__grid', start: 'top 80%', toggleActions: 'play none none none' },
      }
    );

    gsap.fromTo('.test-card',
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: '.testimonials__track', start: 'top 80%', toggleActions: 'play none none none' },
      }
    );
  }

  _ctaZoom() {
    gsap.fromTo('.cta-section__content',
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: '.cta-section', start: 'top 70%', toggleActions: 'play none none none' },
      }
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 6. TILT + SPOTLIGHT + KINETIC
// ═══════════════════════════════════════════════════════════
class Interactions {
  constructor() {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -8;
        const ry = ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * 8;
        card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
        card.style.transition = 'transform 0.1s ease';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
        card.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)';
      });
    });

    document.querySelectorAll('.exp-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--mouse-y', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });

    document.querySelectorAll('.hero__title-line').forEach(t => {
      t.addEventListener('mouseenter', () => gsap.to(t, { scale: 1.03, letterSpacing: '3px', duration: 0.4, ease: 'power2.out' }));
      t.addEventListener('mouseleave', () => gsap.to(t, { scale: 1, letterSpacing: '0px', duration: 0.6, ease: 'power3.out' }));
    });
  }
}

// ═══════════════════════════════════════════════════════════
// 7. BOOKING SYSTEM
// ═══════════════════════════════════════════════════════════
class BookingSystem {
  constructor() {
    this.currentStep = 1;
    this.selectedFlight = null;
    this.searchParams = {};
    this.debounceTimer = null;

    this._initSearch();
    this._initNavigation();
    this._initLookup();

    // Set min date to today
    const dateInput = document.getElementById('search-date');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
      dateInput.min = today;
    }
  }

  // ─── Search & Autocomplete ───
  _initSearch() {
    const fromInput = document.getElementById('search-from');
    const toInput = document.getElementById('search-to');
    const searchBtn = document.getElementById('btn-search-flights');
    const swapBtn = document.getElementById('swap-airports');

    if (fromInput) {
      fromInput.addEventListener('input', () => this._autocomplete(fromInput, 'autocomplete-from', 'search-from-iata'));
      fromInput.addEventListener('focus', () => this._autocomplete(fromInput, 'autocomplete-from', 'search-from-iata'));
    }

    if (toInput) {
      toInput.addEventListener('input', () => this._autocomplete(toInput, 'autocomplete-to', 'search-to-iata'));
      toInput.addEventListener('focus', () => this._autocomplete(toInput, 'autocomplete-to', 'search-to-iata'));
    }

    // Close autocomplete on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.booking-form__field--auto')) {
        document.querySelectorAll('.autocomplete-results').forEach(el => el.classList.remove('visible'));
      }
    });

    if (searchBtn) searchBtn.addEventListener('click', () => this._searchFlights());
    if (swapBtn) swapBtn.addEventListener('click', () => this._swapAirports());
  }

  async _autocomplete(input, resultsId, hiddenId) {
    clearTimeout(this.debounceTimer);
    const q = input.value.trim();

    if (q.length < 2) {
      document.getElementById(resultsId).classList.remove('visible');
      return;
    }

    this.debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`${CONFIG.API_BASE}/airports/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();

        const container = document.getElementById(resultsId);
        if (!data.success || data.data.length === 0) {
          container.innerHTML = '<div class="autocomplete-item autocomplete-item--empty">No airports found</div>';
          container.classList.add('visible');
          return;
        }

        container.innerHTML = data.data.map(a => `
          <div class="autocomplete-item" data-iata="${a.iata}" data-name="${a.name}" data-city="${a.city}">
            <span class="autocomplete-item__iata">${a.iata}</span>
            <span class="autocomplete-item__name">${a.name}</span>
            <span class="autocomplete-item__city">${a.city || ''}, ${a.country || ''}</span>
          </div>
        `).join('');

        container.classList.add('visible');

        // Click handlers
        container.querySelectorAll('.autocomplete-item[data-iata]').forEach(item => {
          item.addEventListener('click', () => {
            input.value = `${item.dataset.city || item.dataset.name} (${item.dataset.iata})`;
            document.getElementById(hiddenId).value = item.dataset.iata;
            container.classList.remove('visible');
          });
        });
      } catch (err) {
        console.error('Autocomplete error:', err);
      }
    }, 300);
  }

  _swapAirports() {
    const fromInput = document.getElementById('search-from');
    const toInput = document.getElementById('search-to');
    const fromIata = document.getElementById('search-from-iata');
    const toIata = document.getElementById('search-to-iata');

    const tmpVal = fromInput.value;
    const tmpIata = fromIata.value;
    fromInput.value = toInput.value;
    fromIata.value = toIata.value;
    toInput.value = tmpVal;
    toIata.value = tmpIata;
  }

  async _searchFlights() {
    const from = document.getElementById('search-from-iata').value;
    const to = document.getElementById('search-to-iata').value;
    const date = document.getElementById('search-date').value;
    const travelClass = document.getElementById('search-class').value;
    const passengers = document.getElementById('search-passengers').value;

    if (!from || !to) {
      this._showToast('Please select departure and destination airports', 'error');
      return;
    }

    this.searchParams = { from, to, date, travelClass, passengers: Number(passengers) };

    const btn = document.getElementById('btn-search-flights');
    btn.innerHTML = '<span class="spinner"></span> Searching...';
    btn.disabled = true;

    try {
      const res = await fetch(`${CONFIG.API_BASE}/flights/search?from=${from}&to=${to}&date=${date}&travelClass=${travelClass}`);
      const data = await res.json();

      if (data.success) {
        this._showResults(data);
      } else {
        this._showToast(data.message || 'Search failed', 'error');
      }
    } catch (err) {
      this._showToast('Server unavailable. Make sure backend is running.', 'error');
    }

    btn.innerHTML = '<span>Search Flights</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    btn.disabled = false;
  }

  _showResults(data) {
    const { meta, data: flights } = data;
    const routeEl = document.getElementById('results-route');
    const countEl = document.getElementById('results-count');
    const listEl = document.getElementById('flight-results-list');
    const emptyEl = document.getElementById('no-flights');

    routeEl.textContent = `${meta.from.city || meta.from.iata} → ${meta.to.city || meta.to.iata}`;
    countEl.textContent = `${meta.totalResults} flight${meta.totalResults !== 1 ? 's' : ''} found • ${meta.date || 'Any date'} • ${this._classLabel(meta.travelClass)}`;

    if (flights.length === 0) {
      listEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
    } else {
      emptyEl.classList.add('hidden');
      listEl.classList.remove('hidden');

      listEl.innerHTML = flights.map(f => `
        <div class="flight-card" data-schedule-id="${f.scheduleId}">
          <div class="flight-card__airline">
            <div class="flight-card__airline-logo">${f.airline.id}</div>
            <div>
              <p class="flight-card__flight-no">${f.flightNumber}</p>
              <p class="flight-card__airline-name">${f.airline.name}</p>
            </div>
          </div>
          <div class="flight-card__route">
            <div class="flight-card__point">
              <span class="flight-card__time">${f.departure.time}</span>
              <span class="flight-card__iata">${f.departure.iata}</span>
            </div>
            <div class="flight-card__line">
              <div class="flight-card__duration">${Math.floor(f.duration / 60)}h ${f.duration % 60}m</div>
              <div class="flight-card__stops">${f.stops === 0 ? 'Non-stop' : f.stops + ' stop'}</div>
            </div>
            <div class="flight-card__point">
              <span class="flight-card__time">${f.arrival.time}</span>
              <span class="flight-card__iata">${f.arrival.iata}</span>
            </div>
          </div>
          <div class="flight-card__details">
            <span class="flight-card__aircraft">✈ ${f.aircraft}</span>
          </div>
          <div class="flight-card__price">
            <span class="flight-card__price-amount">$${f.selectedClassPrice}</span>
            <span class="flight-card__price-label">per person</span>
            <button class="btn btn--primary btn--sm flight-card__select" data-schedule='${JSON.stringify(f)}'>Select</button>
          </div>
        </div>
      `).join('');

      // Bind select buttons
      listEl.querySelectorAll('.flight-card__select').forEach(btn => {
        btn.addEventListener('click', () => {
          this.selectedFlight = JSON.parse(btn.dataset.schedule);
          this._goToPassengers();
        });
      });
    }

    this._setStep(2);
  }

  _goToPassengers() {
    const count = this.searchParams.passengers;
    const f = this.selectedFlight;
    const travelClass = this.searchParams.travelClass;
    const price = f.price[travelClass] || f.selectedClassPrice;

    // Summary
    const summaryEl = document.getElementById('passenger-summary');
    summaryEl.innerHTML = `
      <div class="passenger-summary__flight">
        <div class="passenger-summary__route">${f.departure.iata} → ${f.arrival.iata}</div>
        <div class="passenger-summary__detail">${f.flightNumber} • ${f.departure.time} → ${f.arrival.time} • ${this._classLabel(travelClass)}</div>
      </div>
    `;

    // Passenger forms
    const fieldsEl = document.getElementById('passenger-fields');
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="passenger-card">
          <h4>Passenger ${i + 1}</h4>
          <div class="passenger-form__row">
            <div class="booking-form__field">
              <label>First Name *</label>
              <input type="text" class="pax-first" data-pax="${i}" placeholder="John" required />
            </div>
            <div class="booking-form__field">
              <label>Last Name *</label>
              <input type="text" class="pax-last" data-pax="${i}" placeholder="Doe" required />
            </div>
          </div>
          <div class="passenger-form__row">
            <div class="booking-form__field">
              <label>Date of Birth</label>
              <input type="date" class="pax-dob" data-pax="${i}" />
            </div>
            <div class="booking-form__field">
              <label>Gender</label>
              <select class="pax-gender" data-pax="${i}">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div class="passenger-form__row">
            <div class="booking-form__field">
              <label>Passport Number</label>
              <input type="text" class="pax-passport" data-pax="${i}" placeholder="A12345678" />
            </div>
            <div class="booking-form__field">
              <label>Nationality</label>
              <input type="text" class="pax-nationality" data-pax="${i}" placeholder="Indian" />
            </div>
          </div>
        </div>
      `;
    }
    fieldsEl.innerHTML = html;

    // Price total
    const totalEl = document.getElementById('booking-total');
    totalEl.innerHTML = `
      <div class="total-breakdown">
        <div class="total-row"><span>${count} × $${price} (${this._classLabel(travelClass)})</span><span>$${count * price}</span></div>
        <div class="total-row total-row--final"><span>Total</span><span class="total-amount">$${count * price}</span></div>
      </div>
    `;

    this._setStep(3);
  }

  async _confirmBooking() {
    const passengers = [];
    const count = this.searchParams.passengers;

    for (let i = 0; i < count; i++) {
      const first = document.querySelector(`.pax-first[data-pax="${i}"]`)?.value?.trim();
      const last = document.querySelector(`.pax-last[data-pax="${i}"]`)?.value?.trim();

      if (!first || !last) {
        this._showToast(`Please fill in name for Passenger ${i + 1}`, 'error');
        return;
      }

      passengers.push({
        firstName: first,
        lastName: last,
        dateOfBirth: document.querySelector(`.pax-dob[data-pax="${i}"]`)?.value || '',
        gender: document.querySelector(`.pax-gender[data-pax="${i}"]`)?.value || 'male',
        passportNumber: document.querySelector(`.pax-passport[data-pax="${i}"]`)?.value || '',
        nationality: document.querySelector(`.pax-nationality[data-pax="${i}"]`)?.value || '',
      });
    }

    const email = document.getElementById('contact-email')?.value?.trim();
    const phone = document.getElementById('contact-phone')?.value?.trim();

    if (!email) {
      this._showToast('Please enter your contact email', 'error');
      return;
    }

    const btn = document.getElementById('btn-confirm-booking');
    btn.innerHTML = '<span class="spinner"></span> Booking...';
    btn.disabled = true;

    try {
      const res = await fetch(`${CONFIG.API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: this.selectedFlight.scheduleId,
          departureDate: this.searchParams.date,
          travelClass: this.searchParams.travelClass,
          contactEmail: email,
          contactPhone: phone,
          passengers,
        }),
      });

      const data = await res.json();

      if (data.success) {
        this._showConfirmation(data.data);
      } else {
        this._showToast(data.message || 'Booking failed', 'error');
      }
    } catch (err) {
      this._showToast('Server error. Please try again.', 'error');
    }

    btn.innerHTML = '<span>Confirm Booking</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    btn.disabled = false;
  }

  _showConfirmation(booking) {
    const pnrEl = document.getElementById('confirm-pnr');
    const detailsEl = document.getElementById('confirm-details');

    pnrEl.innerHTML = `<p class="pnr-label">Your PNR</p><p class="pnr-code">${booking.pnr}</p>`;

    detailsEl.innerHTML = `
      <div class="confirm-grid">
        <div class="confirm-item">
          <span class="confirm-item__label">Flight</span>
          <span class="confirm-item__value">${booking.flightNumber}</span>
        </div>
        <div class="confirm-item">
          <span class="confirm-item__label">Route</span>
          <span class="confirm-item__value">${booking.departure.iata} → ${booking.arrival.iata}</span>
        </div>
        <div class="confirm-item">
          <span class="confirm-item__label">Date</span>
          <span class="confirm-item__value">${new Date(booking.departureDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div class="confirm-item">
          <span class="confirm-item__label">Time</span>
          <span class="confirm-item__value">${booking.departure.time} → ${booking.arrival.time}</span>
        </div>
        <div class="confirm-item">
          <span class="confirm-item__label">Class</span>
          <span class="confirm-item__value">${this._classLabel(booking.travelClass)}</span>
        </div>
        <div class="confirm-item">
          <span class="confirm-item__label">Passengers</span>
          <span class="confirm-item__value">${booking.passengerCount}</span>
        </div>
        <div class="confirm-item confirm-item--full">
          <span class="confirm-item__label">Total Paid</span>
          <span class="confirm-item__value confirm-item__value--price">$${booking.totalPrice}</span>
        </div>
        <div class="confirm-item confirm-item--full">
          <span class="confirm-item__label">Status</span>
          <span class="confirm-item__value confirm-item__value--status">✓ ${booking.status}</span>
        </div>
      </div>
    `;

    this._setStep(4);
  }

  // ─── Navigation ───
  _initNavigation() {
    document.getElementById('btn-back-search')?.addEventListener('click', () => this._setStep(1));
    document.getElementById('btn-back-results')?.addEventListener('click', () => this._setStep(2));
    document.getElementById('btn-confirm-booking')?.addEventListener('click', () => this._confirmBooking());
    document.getElementById('btn-new-booking')?.addEventListener('click', () => {
      this.selectedFlight = null;
      this.searchParams = {};
      this._setStep(1);
    });
  }

  _setStep(step) {
    this.currentStep = step;

    // Update step indicators
    document.querySelectorAll('.booking-step').forEach(s => {
      const sn = Number(s.dataset.step);
      s.classList.toggle('active', sn === step);
      s.classList.toggle('completed', sn < step);
    });

    // Show correct panel
    for (let i = 1; i <= 4; i++) {
      const panel = document.getElementById(`booking-step-${i}`);
      if (panel) {
        panel.classList.toggle('hidden', i !== step);
      }
    }

    // Scroll to booking section
    const section = document.getElementById('book');
    if (section) {
      window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    }
  }

  // ─── Booking Lookup ───
  _initLookup() {
    document.getElementById('btn-lookup')?.addEventListener('click', async () => {
      const pnr = document.getElementById('lookup-pnr')?.value?.trim();
      const email = document.getElementById('lookup-email')?.value?.trim();

      if (!pnr || !email) {
        this._showToast('Please enter both PNR and email', 'error');
        return;
      }

      try {
        const res = await fetch(`${CONFIG.API_BASE}/bookings/lookup?pnr=${pnr}&email=${email}`);
        const data = await res.json();
        const resultEl = document.getElementById('lookup-result');

        if (data.success) {
          const b = data.data;
          resultEl.innerHTML = `
            <div class="lookup-card">
              <h4>Booking Found ✓</h4>
              <div class="confirm-grid">
                <div class="confirm-item"><span class="confirm-item__label">PNR</span><span class="confirm-item__value">${b.pnr}</span></div>
                <div class="confirm-item"><span class="confirm-item__label">Flight</span><span class="confirm-item__value">${b.flightNumber}</span></div>
                <div class="confirm-item"><span class="confirm-item__label">Route</span><span class="confirm-item__value">${b.departureIata} → ${b.destinationIata}</span></div>
                <div class="confirm-item"><span class="confirm-item__label">Date</span><span class="confirm-item__value">${new Date(b.departureDate).toLocaleDateString()}</span></div>
                <div class="confirm-item"><span class="confirm-item__label">Status</span><span class="confirm-item__value confirm-item__value--status">✓ ${b.status}</span></div>
                <div class="confirm-item"><span class="confirm-item__label">Total</span><span class="confirm-item__value confirm-item__value--price">$${b.totalPrice}</span></div>
              </div>
            </div>
          `;
          resultEl.classList.remove('hidden');
        } else {
          resultEl.innerHTML = `<div class="lookup-card lookup-card--error"><p>❌ ${data.message}</p></div>`;
          resultEl.classList.remove('hidden');
        }
      } catch (err) {
        this._showToast('Server unavailable', 'error');
      }
    });
  }

  // ─── Helpers ───
  _classLabel(c) {
    const labels = { economy: 'Economy', premiumEconomy: 'Premium Economy', business: 'Business', first: 'First Class' };
    return labels[c] || c;
  }

  _showToast(msg, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 400); }, 3500);
  }
}

// ═══════════════════════════════════════════════════════════
// 8. LIVE FLIGHT TRACKER
// ═══════════════════════════════════════════════════════════
class LiveTracker {
  constructor() {
    this.grid = document.getElementById('live-flights-grid');
    this.status = document.getElementById('tracker-status');
    this.refresh = document.getElementById('btn-refresh-tracker');

    if (this.refresh) {
      this.refresh.addEventListener('click', () => this.load());
    }

    // Load when section is visible
    if (this.grid) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          this.load();
          observer.disconnect();
        }
      }, { threshold: 0.1 });
      observer.observe(this.grid);
    }
  }

  async load() {
    if (this.status) this.status.textContent = 'Fetching live data...';

    try {
      // Fetch flights over a region (Europe for demo)
      const res = await fetch(`${CONFIG.API_BASE}/opensky/live?lamin=20&lomin=-20&lamax=60&lomax=80`);
      const data = await res.json();

      if (data.success && data.data.length > 0) {
        this._render(data.data.slice(0, 24));
        if (this.status) this.status.textContent = `${data.totalAircraft} aircraft tracked worldwide`;
      } else {
        if (this.status) this.status.textContent = 'No live data available right now';
        this._renderFallback();
      }
    } catch (err) {
      if (this.status) this.status.textContent = 'Live tracking unavailable';
      this._renderFallback();
    }
  }

  _render(flights) {
    this.grid.innerHTML = flights.map(f => `
      <div class="live-card">
        <div class="live-card__header">
          <span class="live-card__callsign">${f.callsign || 'N/A'}</span>
          <span class="live-card__country">${f.originCountry}</span>
        </div>
        <div class="live-card__info">
          <div class="live-card__stat">
            <span class="live-card__stat-label">Altitude</span>
            <span class="live-card__stat-value">${f.altitude ? f.altitude.toLocaleString() + ' m' : 'Ground'}</span>
          </div>
          <div class="live-card__stat">
            <span class="live-card__stat-label">Speed</span>
            <span class="live-card__stat-value">${f.velocity ? f.velocity + ' km/h' : '-'}</span>
          </div>
          <div class="live-card__stat">
            <span class="live-card__stat-label">Heading</span>
            <span class="live-card__stat-value">${f.heading ? f.heading + '°' : '-'}</span>
          </div>
        </div>
        <div class="live-card__status ${f.onGround ? 'live-card__status--ground' : 'live-card__status--air'}">
          ${f.onGround ? '🛬 On Ground' : '✈ In Flight'}
        </div>
      </div>
    `).join('');
  }

  _renderFallback() {
    this.grid.innerHTML = `
      <div class="live-tracker__fallback">
        <p>✈️ Connecting to live flight data...</p>
        <p class="live-tracker__fallback-sub">Real-time data will appear shortly. Auto-retrying...</p>
      </div>
    `;
    // Auto-retry every 15 seconds
    if (!this._retryTimer) {
      this._retryTimer = setInterval(() => this.load(), 15000);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 9. AUTH MANAGER — Navbar login state
// ═══════════════════════════════════════════════════════════
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = null;
    try { this.user = JSON.parse(localStorage.getItem('user')); } catch(e) {}
    this.render();
    this.bindEvents();
  }

  render() {
    const signinBtn = document.getElementById('nav-signin');
    const userEl = document.getElementById('nav-user');
    if (!signinBtn || !userEl) return;

    if (this.token && this.user) {
      signinBtn.style.display = 'none';
      userEl.style.display = 'block';
      
      // Set avatar
      const avatarEl = document.getElementById('nav-avatar');
      if (this.user.avatar) {
        avatarEl.innerHTML = `<img src="${this.user.avatar}" alt="${this.user.name}" />`;
      } else {
        avatarEl.textContent = (this.user.name || 'U')[0].toUpperCase();
      }
      
      // Set name
      const nameEl = document.getElementById('nav-user-name');
      if (nameEl) nameEl.textContent = this.user.name || this.user.email;

      // Show admin link for admins
      const adminLink = document.getElementById('nav-admin-link');
      if (adminLink && this.user.role === 'admin') {
        adminLink.style.display = 'block';
      }
    } else {
      signinBtn.style.display = 'flex';
      userEl.style.display = 'none';
    }
  }

  bindEvents() {
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
        this.render();
        window.showToast?.('Signed out successfully', 'success');
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 10. FLIGHT MAP — Leaflet.js world map with CANVAS renderer + MarkerCluster
// ═══════════════════════════════════════════════════════════
class FlightMap {
  constructor() {
    this.container = document.getElementById('flight-map-container');
    if (!this.container || typeof L === 'undefined') return;
    this.map = null;
    this.clusterGroup = null;
    this.refreshInterval = null;
    this.loading = false;
    this.init();
  }

  init() {
    // Show loading state
    this.container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#f5e6c8;font-size:16px;gap:12px;"><div class="spinner"></div> Loading flight map...</div>';

    // Create Leaflet map with canvas rendering (much faster than SVG)
    this.map = L.map('flight-map-container', {
      center: [25, 10],
      zoom: 3,
      minZoom: 2,
      maxZoom: 12,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,  // <-- KEY: use canvas renderer
    });

    // Dark tile provider
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://carto.com/">CARTO</a> | © <a href="https://www.openstreetmap.org/">OSM</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    // Use MarkerCluster if available, otherwise simple layerGroup
    if (typeof L.markerClusterGroup === 'function') {
      this.clusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: false,
        disableClusteringAtZoom: 8,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          let size = 'small';
          if (count > 100) size = 'large';
          else if (count > 30) size = 'medium';
          return L.divIcon({
            html: `<div style="
              background:rgba(74,139,181,0.85);
              color:#f5e6c8;
              border-radius:50%;
              display:flex;
              align-items:center;
              justify-content:center;
              font-weight:700;
              font-size:${size === 'large' ? '14px' : size === 'medium' ? '12px' : '11px'};
              box-shadow:0 0 12px rgba(74,139,181,0.5);
              border:2px solid rgba(245,230,200,0.3);
            ">${count}</div>`,
            className: 'plane-cluster',
            iconSize: L.point(size === 'large' ? 48 : size === 'medium' ? 40 : 32, size === 'large' ? 48 : size === 'medium' ? 40 : 32),
          });
        },
      });
    } else {
      this.clusterGroup = L.layerGroup();
    }
    this.clusterGroup.addTo(this.map);

    // Load data
    this.loadData();

    // Refresh button
    const refreshBtn = document.getElementById('btn-refresh-map');
    if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadData());

    // Auto-refresh every 45 seconds
    this.refreshInterval = setInterval(() => this.loadData(), 45000);
  }

  async loadData() {
    if (this.loading) return;
    this.loading = true;

    try {
      const res = await fetch(`${CONFIG.API_BASE}/opensky/live`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      if (data.success && data.states) {
        this.renderPlanes(data.states);
        this.updateStats(data.states);
        const updateEl = document.getElementById('map-update-time');
        if (updateEl) updateEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
      }
    } catch (err) {
      // Graceful: don't show error to user, just log quietly
      console.warn('[FlightMap] Data fetch pending, retrying...');
    } finally {
      this.loading = false;
    }
  }

  renderPlanes(states) {
    this.clusterGroup.clearLayers();

    // Cap at 2000 planes for performance
    const planes = states.slice(0, 2000);

    planes.forEach(s => {
      if (!s.latitude || !s.longitude) return;

      // Use circleMarker (canvas-rendered, lightweight)
      const marker = L.circleMarker([s.latitude, s.longitude], {
        radius: 3,
        fillColor: s.onGround ? '#edd9b4' : '#4a8bb5',
        fillOpacity: 0.9,
        color: s.onGround ? '#f5e6c8' : '#7fb8d8',
        weight: 1,
      });

      const altFt = s.altitude ? Math.round(s.altitude * 3.281) : '—';
      const speedKnots = s.velocity ? Math.round(s.velocity * 1.944) : '—';

      marker.bindPopup(`
        <div class="plane-popup">
          <div class="plane-popup__callsign">${s.callsign || s.icao24}</div>
          <div class="plane-popup__country">${s.originCountry || 'Unknown'}</div>
          <div class="plane-popup__row"><span class="plane-popup__label">Altitude</span><span>${altFt} ft</span></div>
          <div class="plane-popup__row"><span class="plane-popup__label">Speed</span><span>${speedKnots} kts</span></div>
          <div class="plane-popup__row"><span class="plane-popup__label">Heading</span><span>${Math.round(s.heading || 0)}°</span></div>
          <div class="plane-popup__row"><span class="plane-popup__label">ICAO24</span><span>${s.icao24}</span></div>
        </div>
      `, { maxWidth: 220 });

      this.clusterGroup.addLayer(marker);
    });
  }

  updateStats(states) {
    const planesEl = document.getElementById('map-stat-planes');
    const countriesEl = document.getElementById('map-stat-countries');
    const altEl = document.getElementById('map-stat-alt');
    const speedEl = document.getElementById('map-stat-speed');

    if (planesEl) planesEl.textContent = states.length.toLocaleString();

    const countries = new Set(states.map(s => s.originCountry).filter(Boolean));
    if (countriesEl) countriesEl.textContent = countries.size;

    const alts = states.filter(s => s.altitude).map(s => s.altitude);
    if (altEl && alts.length) altEl.textContent = Math.round(alts.reduce((a, b) => a + b, 0) / alts.length).toLocaleString();

    const speeds = states.filter(s => s.velocity).map(s => s.velocity * 3.6);
    if (speedEl && speeds.length) speedEl.textContent = Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length).toLocaleString();
  }
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
async function init() {
  const loader = new Loader();
  const images = await loader.preloadFrames();

  const canvas = document.getElementById('frame-canvas');
  const seq = new FrameSequence(canvas, images);
  seq.setup();

  await new Promise(r => setTimeout(r, 600));
  loader.hide();

  await new Promise(r => setTimeout(r, 300));
  new CustomCursor();
  new ParticleSystem('particles-canvas');
  new ScrollAnimations();
  new Interactions();
  new BookingSystem();
  new LiveTracker();
  new AuthManager();
  new FlightMap();

  // Smooth anchor scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
    });
  });

  console.log('[FlyWithUS] Initialized ✓ — Full Booking System Active');

  // ═══ HAMBURGER MENU ═══
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const navLinks = document.getElementById('navbar-links');
  if (hamburgerBtn && navLinks) {
    hamburgerBtn.addEventListener('click', () => {
      hamburgerBtn.classList.toggle('active');
      navLinks.classList.toggle('mobile-open');
    });
    // Close menu when a link is clicked
    navLinks.querySelectorAll('.navbar__link').forEach(link => {
      link.addEventListener('click', () => {
        hamburgerBtn.classList.remove('active');
        navLinks.classList.remove('mobile-open');
      });
    });
  }
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
