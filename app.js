/* ============================================================
   Capanna — Front-End Interactions
   Modules :
     · loader
     · curseur custom + boutons magnétiques
     · parallax au scroll
     · reveal via IntersectionObserver
     · plat 3D : rotation au scroll + au mouvement souris
     · tilt 3D sur les cartes menu
     · navbar dynamique
     · panier (LocalStorage) + sidebar + modale + WhatsApp
   ============================================================ */

const STORAGE_KEY = 'capanna_cart_v2';
const MENU_URL    = 'assets/menu.json';

const state = {
    restaurant: null,
    categories: [],
    items: [],
    activeCategory: null,
    cart: []
};

const hasPrice = item => item?.price !== null && item?.price !== undefined && Number.isFinite(Number(item.price));
const formatPrice = item => hasPrice(item) ? `${Number(item.price)} Dh` : (item?.priceLabel || 'Prix sur place');

/* ============================================================
   1. LOADER
   ============================================================ */
function hideLoader() {
    const loader = document.getElementById('loader');
    if (!loader) return;
    setTimeout(() => loader.classList.add('hidden'), 1400);
}

/* ============================================================
   2. CURSEUR CUSTOM + BOUTONS MAGNÉTIQUES
   ============================================================ */
function initCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const ring = document.querySelector('.cursor-ring');
    const dot  = document.querySelector('.cursor-dot');
    if (!ring || !dot) return;

    let mouseX = 0, mouseY = 0;
    let ringX  = 0, ringY  = 0;

    window.addEventListener('mousemove', e => {
        mouseX = e.clientX; mouseY = e.clientY;
        dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    // Easing du ring pour effet inertiel
    function tick() {
        ringX += (mouseX - ringX) * 0.18;
        ringY += (mouseY - ringY) * 0.18;
        ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
        requestAnimationFrame(tick);
    }
    tick();

    // États hover
    document.querySelectorAll('[data-cursor-hover]').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    // Boutons magnétiques : attraction douce vers la souris
    document.querySelectorAll('.magnetic').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width  / 2;
            const y = e.clientY - rect.top  - rect.height / 2;
            btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
        });
    });
}

/* Réapplique l'effet magnétique aux nouveaux boutons (cartes menu) */
function bindMagnetic(scope = document) {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    scope.querySelectorAll('.magnetic:not([data-mag-bound])').forEach(btn => {
        btn.dataset.magBound = '1';
        btn.addEventListener('mousemove', (e) => {
            const r = btn.getBoundingClientRect();
            const x = e.clientX - r.left - r.width / 2;
            const y = e.clientY - r.top  - r.height / 2;
            btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
        });
        btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate(0, 0)'; });
    });
    scope.querySelectorAll('[data-cursor-hover]:not([data-cur-bound])').forEach(el => {
        el.dataset.curBound = '1';
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
}

/* ============================================================
   3. REVEAL AU SCROLL
   ============================================================ */
function initReveal() {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('in');
                obs.unobserve(e.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('[data-reveal]').forEach(el => obs.observe(el));
}

/* ============================================================
   4. PARALLAX (translation Y selon le scroll)
   ============================================================ */
function initParallax() {
    const layers = document.querySelectorAll('.parallax');
    if (layers.length === 0) return;

    let ticking = false;

    function update() {
        const scrollY = window.scrollY;
        layers.forEach(el => {
            const speed = parseFloat(el.dataset.speed || 0.2);
            const rect  = el.getBoundingClientRect();
            const offset = (rect.top + scrollY - window.innerHeight) * speed;
            el.style.transform = `translate3d(0, ${-offset * 0.1}px, 0)`;
        });
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });

    update();
}

/* ============================================================
   5. PLAT 3D DU HÉRO : rotation continue + suivi souris + scroll
   ============================================================ */
function initDish3D() {
    const dish = document.getElementById('dish');
    if (!dish) return;

    let mx = 0, my = 0;          // position souris normalisée (-1..1)
    let scrollRot = 0;            // rotation cumulée du scroll
    let baseSpin  = 0;            // rotation lente continue

    const hero = document.getElementById('hero');

    window.addEventListener('mousemove', (e) => {
        const r = hero.getBoundingClientRect();
        mx = (e.clientX - r.left - r.width  / 2) / r.width;
        my = (e.clientY - r.top  - r.height / 2) / r.height;
    });

    window.addEventListener('scroll', () => {
        scrollRot = window.scrollY * 0.08;
    }, { passive: true });

    function loop() {
        baseSpin += 0.15;
        const rotX = (-my * 18).toFixed(2);
        const rotY = (mx * 24 + baseSpin * 0.3 + scrollRot).toFixed(2);
        const rotZ = (mx * 4).toFixed(2);
        dish.style.transform =
            `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;
        requestAnimationFrame(loop);
    }
    loop();
}

/* ============================================================
   6. TILT 3D SUR LES CARTES MENU
   ============================================================ */
function bindTilt(scope = document) {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    scope.querySelectorAll('.menu-card:not([data-tilt-bound])').forEach(card => {
        card.dataset.tiltBound = '1';
        card.addEventListener('mousemove', (e) => {
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width  - 0.5;
            const py = (e.clientY - r.top ) / r.height - 0.5;
            card.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateZ(0)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'rotateY(0) rotateX(0)';
        });
    });
}

/* ============================================================
   7. NAVBAR : état au scroll + cacher au scroll-down
   ============================================================ */
function initNavbar() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    let lastY = 0;
    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        if (y > 30) nav.classList.add('nav-scrolled');
        else nav.classList.remove('nav-scrolled');

        if (y > lastY && y > 200) nav.style.transform = 'translateY(-100%)';
        else nav.style.transform = 'translateY(0)';
        lastY = y;
    }, { passive: true });
}

/* ============================================================
   8. CHARGEMENT DU MENU
   ============================================================ */
async function loadMenu() {
    try {
        const res = await fetch(MENU_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        state.restaurant     = data.restaurant;
        state.categories     = data.categories;
        state.items          = data.items;
        state.activeCategory = data.categories[0]?.id ?? null;

        renderTabs();
        renderMenu();
    } catch (err) {
        console.error('Menu : échec du chargement.', err);
        document.getElementById('menu-grid').innerHTML =
            `<p class="col-span-full text-center text-cream/40 py-12">Impossible de charger le menu.</p>`;
    }
}

/* ============================================================
   9. ONGLETS DES CATÉGORIES
   ============================================================ */
function renderTabs() {
    const wrap = document.getElementById('menu-tabs');
    wrap.innerHTML = '';
    state.categories.forEach((cat, idx) => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn text-xs md:text-sm tracking-[0.25em] uppercase pb-2 text-cream/70';
        btn.dataset.cat = cat.id;
        btn.dataset.cursorHover = '';
        btn.textContent = cat.label;
        if (idx === 0) btn.classList.add('active');
        btn.addEventListener('click', () => {
            state.activeCategory = cat.id;
            document.querySelectorAll('#menu-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMenu();
        });
        wrap.appendChild(btn);
    });
    bindMagnetic(wrap);
}

/* ============================================================
   10. GRILLE DES PLATS (asymétrique + tilt 3D)
   ============================================================ */
function renderMenu() {
    const grid = document.getElementById('menu-grid');
    const items = state.items.filter(i => i.category === state.activeCategory);

    grid.innerHTML = '';

    items.forEach((item, idx) => {
        // Décalage vertical pour l'asymétrie
        const offsetClass = idx % 3 === 1 ? 'lg:mt-16' : (idx % 3 === 2 ? 'lg:mt-8' : '');

        const card = document.createElement('article');
        card.className = `menu-card group ${offsetClass}`;
        card.style.opacity = '0';
        card.style.transition = 'opacity 700ms ease, transform 400ms cubic-bezier(0.2,0.8,0.2,1)';

        card.innerHTML = `
            <div class="layer-img relative overflow-hidden aspect-[4/5] bg-ink">
                <img src="${item.image}" alt="${escapeHTML(item.name)}" class="w-full h-full object-cover" loading="lazy">
                <div class="absolute inset-0 bg-gradient-to-t from-espresso/60 via-transparent to-transparent"></div>
                <span class="absolute top-4 left-4 font-display text-2xl text-cream">${formatPrice(item)}</span>
            </div>
            <div class="layer-text mt-6 flex items-start justify-between gap-4">
                <div class="flex-1">
                    <h3 class="font-display text-2xl md:text-3xl font-light leading-tight">${escapeHTML(item.name)}</h3>
                    <p class="mt-3 text-sm text-cream/55 leading-relaxed">${escapeHTML(item.description)}</p>
                </div>
                <button data-id="${item.id}" class="add-btn magnetic shrink-0 mt-1 w-11 h-11 rounded-full border border-cream/30 hover:border-terraLt hover:bg-terra/10 flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none" aria-label="Ajouter ${escapeHTML(item.name)}" ${hasPrice(item) ? '' : 'disabled'} data-cursor-hover>
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                    </svg>
                </button>
            </div>`;

        grid.appendChild(card);

        // Apparition étagée
        setTimeout(() => { card.style.opacity = '1'; }, idx * 80);
    });

    grid.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            addToCart(btn.dataset.id);
        });
    });

    bindTilt(grid);
    bindMagnetic(grid);
}

/* ============================================================
   11. PANIER
   ============================================================ */
function addToCart(itemId) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    if (!hasPrice(item)) return;

    const existing = state.cart.find(c => c.id === itemId);
    if (existing) existing.qty += 1;
    else state.cart.push({ id: item.id, name: item.name, price: Number(item.price), qty: 1 });

    persistCart();
    renderCart();
    pulseBadge();
}

function changeQty(itemId, delta) {
    const line = state.cart.find(c => c.id === itemId);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) state.cart = state.cart.filter(c => c.id !== itemId);
    persistCart();
    renderCart();
}

function removeFromCart(itemId) {
    state.cart = state.cart.filter(c => c.id !== itemId);
    persistCart();
    renderCart();
}

const cartTotal = () => state.cart.reduce((s, l) => s + l.price * l.qty, 0);
const cartCount = () => state.cart.reduce((s, l) => s + l.qty, 0);

function persistCart() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart)); } catch (e) {}
}
function restoreCart() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) state.cart = JSON.parse(raw) || [];
    } catch (e) { state.cart = []; }
}

/* ============================================================
   12. RENDU DU PANIER (sidebar)
   ============================================================ */
function renderCart() {
    const wrap   = document.getElementById('cart-items');
    const empty  = document.getElementById('cart-empty');
    const total  = document.getElementById('cart-total');
    const count  = document.getElementById('cart-count');
    const submit = document.getElementById('checkout-btn');

    count.textContent = cartCount();
    total.textContent = cartTotal();
    submit.disabled   = state.cart.length === 0;

    if (state.cart.length === 0) {
        wrap.innerHTML = '';
        wrap.appendChild(empty);
        return;
    }

    wrap.innerHTML = '';
    state.cart.forEach(line => {
        const row = document.createElement('div');
        row.className = 'pb-5 border-b border-cream/10';
        row.innerHTML = `
            <div class="flex justify-between items-start gap-4">
                <p class="font-display text-xl font-light leading-snug flex-1">${escapeHTML(line.name)}</p>
                <button data-act="rm" data-id="${line.id}" class="text-cream/40 hover:text-terraLt text-xs uppercase tracking-widest" data-cursor-hover>Retirer</button>
            </div>
            <div class="mt-4 flex items-center justify-between">
                <div class="inline-flex items-center border border-cream/15 rounded-full">
                    <button data-act="dec" data-id="${line.id}" class="w-9 h-9 hover:text-terraLt transition-colors" aria-label="Diminuer" data-cursor-hover>−</button>
                    <span class="w-8 text-center text-sm">${line.qty}</span>
                    <button data-act="inc" data-id="${line.id}" class="w-9 h-9 hover:text-terraLt transition-colors" aria-label="Augmenter" data-cursor-hover>+</button>
                </div>
                <p class="font-medium">${line.price * line.qty} <span class="text-xs text-cream/50">Dh</span></p>
            </div>`;
        wrap.appendChild(row);
    });

    wrap.querySelectorAll('button[data-act]').forEach(btn => {
        btn.addEventListener('click', () => {
            const { act, id } = btn.dataset;
            if (act === 'inc') changeQty(id,  1);
            if (act === 'dec') changeQty(id, -1);
            if (act === 'rm')  removeFromCart(id);
        });
    });

    bindMagnetic(wrap);
}

function pulseBadge() {
    const badge = document.getElementById('cart-count');
    badge.classList.add('pulse');
    setTimeout(() => badge.classList.remove('pulse'), 250);
}

/* ============================================================
   13. OUVERTURE / FERMETURE SIDEBAR & MODALE
   ============================================================ */
function openCart()  { document.getElementById('cart-sidebar').classList.add('open');     document.getElementById('cart-backdrop').classList.add('open');     document.body.style.overflow = 'hidden'; }
function closeCart() { document.getElementById('cart-sidebar').classList.remove('open');  document.getElementById('cart-backdrop').classList.remove('open');  document.body.style.overflow = ''; }
function openCheckout() {
    if (state.cart.length === 0) return;
    document.getElementById('checkout-modal').classList.add('open');
}
function closeCheckout() { document.getElementById('checkout-modal').classList.remove('open'); }

/* ============================================================
   14. CHECKOUT → WHATSAPP
   ============================================================ */
function buildWhatsAppMessage(form) {
    const mode    = form.mode.value;
    const name    = form.name.value.trim();
    const phone   = form.phone.value.trim();
    const address = form.address.value.trim();
    const notes   = form.notes.value.trim();

    const lines = [];
    lines.push('Nouvelle commande — Capanna');
    lines.push('');
    lines.push('Détail :');
    state.cart.forEach(l => lines.push(`• ${l.qty} × ${l.name} — ${l.price * l.qty} Dh`));
    lines.push('');
    lines.push(`Total : ${cartTotal()} Dh`);
    lines.push('');
    lines.push(`Mode : ${mode}`);
    lines.push(`Client : ${name}`);
    lines.push(`Téléphone : ${phone}`);
    if (mode === 'Livraison' && address) lines.push(`Adresse : ${address}`);
    if (notes) lines.push(`Note : ${notes}`);
    return lines.join('\n');
}

function handleCheckout(e) {
    e.preventDefault();
    const form = e.target;
    if (!form.name.value.trim() || !form.phone.value.trim()) { form.reportValidity(); return; }
    if (form.mode.value === 'Livraison' && !form.address.value.trim()) { form.address.focus(); return; }

    const phone   = state.restaurant?.phone || '212600000000';
    const message = buildWhatsAppMessage(form);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');

    state.cart = [];
    persistCart();
    renderCart();
    closeCheckout();
    closeCart();
    form.reset();
}

/* ============================================================
   15. RÉSERVATION → WHATSAPP
   ============================================================ */
function handleReservation(e) {
    e.preventDefault();
    const f = e.target;
    if (!f.name.value.trim() || !f.phone.value.trim() || !f.date.value || !f.time.value) {
        f.reportValidity(); return;
    }
    const phone = state.restaurant?.phone || '212600000000';
    const msg = [
        'Demande de réservation — Capanna', '',
        `Nom : ${f.name.value.trim()}`,
        `Couverts : ${f.guests.value}`,
        `Date : ${f.date.value}`,
        `Heure : ${f.time.value}`,
        `Téléphone : ${f.phone.value.trim()}`
    ].join('\n');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
}

/* ============================================================
   16. UTILITAIRES
   ============================================================ */
function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
}

/* Champ adresse conditionnel selon le mode */
function watchModeRadios() {
    document.querySelectorAll('input[name="mode"]').forEach(r => {
        r.addEventListener('change', () => {
            const isDelivery = document.querySelector('input[name="mode"]:checked').value === 'Livraison';
            document.getElementById('address-field').style.display = isDelivery ? '' : 'none';
        });
    });
}

/* ============================================================
   17. BOOTSTRAP
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

    hideLoader();
    initCursor();
    initReveal();
    initParallax();
    initDish3D();
    initNavbar();

    restoreCart();
    loadMenu();
    renderCart();

    // Sidebar
    document.getElementById('open-cart-btn').addEventListener('click', openCart);
    document.getElementById('close-cart-btn').addEventListener('click', closeCart);
    document.getElementById('cart-backdrop').addEventListener('click', closeCart);

    // Modale
    document.getElementById('checkout-btn').addEventListener('click', openCheckout);
    document.getElementById('close-modal-btn').addEventListener('click', closeCheckout);
    document.getElementById('checkout-modal').addEventListener('click', (e) => {
        if (e.target.id === 'checkout-modal') closeCheckout();
    });

    // Formulaires
    document.getElementById('checkout-form').addEventListener('submit', handleCheckout);
    document.getElementById('reservation-form').addEventListener('submit', handleReservation);

    watchModeRadios();

    const dateInput = document.getElementById('r-date');
    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

    // Échap ferme tout
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeCheckout(); closeCart(); }
    });

    // Fermeture du panier sur clic d'ancre
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', () => closeCart());
    });
});
