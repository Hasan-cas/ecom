/**
 * MARKAZUS SUNNAH | Full Enterprise Production Logic
 * Includes: Hero Slider, 3D Scene, Collection Drag, API Fetch, and Language Toggle
 * Optimized for: Render.com, Vercel, and Mobile (Termux)
 */

// --- CONFIGURATION & GLOBAL VARIABLES ---
const PRODUCT_API = '/api/products';
let currentSlide = 0;
let isAnimating = false;

// --- 1. THE CORE GUARANTEE: INITIALIZATION ---
window.addEventListener('load', () => {
    console.log("Assets Loaded. Initializing GSAP...");
    
    // Register Plugins
    gsap.registerPlugin(ScrollTrigger, Draggable);

    // Run UI Modules
    setupHeroSlider();
    setupCollectionScroll();
    initStatsCounter();
    
    // Fetch Products and refresh ScrollTrigger AFTER they land
    fetchProducts().then(() => {
        ScrollTrigger.refresh();
    });

    // Language Toggle Listener
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        const savedLang = localStorage.getItem('site_lang') || 'en';
        applyLanguage(savedLang);
        langBtn.addEventListener('click', () => {
            const newLang = localStorage.getItem('site_lang') === 'en' ? 'bn' : 'en';
            applyLanguage(newLang);
        });
    }

    // Safety Refresh for slow Render servers
    setTimeout(() => {
        ScrollTrigger.refresh();
        console.log("Final ScrollTrigger Refresh Complete");
    }, 2000);
});

// --- 2. API FETCHING & RENDERING ---
async function fetchProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    try {
        const response = await fetch(PRODUCT_API);
        const result = await response.json();

        if (result.status === 'success') {
            renderProductCards(result.data, grid);
        }
    } catch (error) {
        console.error("API Error:", error);
        grid.innerHTML = `<p class="col-span-full text-center text-red-500">Failed to load products.</p>`;
    }
}

function renderProductCards(products, container) {
    container.innerHTML = products.map(product => `
        <div class="product-card bg-white group shadow-sm reveal-item rounded-2xl opacity-0 translate-y-8 scale-95 transition-all">
            <a href="/product?id=${product.id}" class="block">
                <div class="relative overflow-hidden bg-gray-100 aspect-square mb-4 rounded-2xl">
                    <img src="${product.image || '/static/img/placeholder.webp'}" 
                         alt="${product.name}" 
                         class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                </div>
                <div class="p-4">
                    <p class="text-sm text-gray-500 mb-1" data-bn="মারকাযুস সুন্নাহ">Markazus Sunnah</p>
                    <h3 class="heading-font text-xl font-semibold mb-2" data-bn="${product.name_bn || product.name}">${product.name}</h3>
                    <p class="text-lg font-semibold" data-bn="৳${product.price}">${product.price} TK</p>
                </div>
            </a>
        </div>
    `).join('');

    // Re-initialize animations for new items
    initScrollAnimations();
    applyLanguage(localStorage.getItem('site_lang') || 'en');
}

// --- 3. ANIMATION MODULES ---

function initScrollAnimations() {
    // Reveal newly loaded products
    gsap.utils.toArray('.reveal-item').forEach(item => {
        gsap.to(item, {
            opacity: 1, y: 0, scale: 1,
            duration: 1.1, ease: "power4.out",
            scrollTrigger: { trigger: item, start: "top 90%" }
        });
    });

    // 3D Scene Animation (The Parallax Section)
    if(document.querySelector(".scene-container")) {
        gsap.timeline({
            scrollTrigger: {
                trigger: ".scene-container",
                start: "top top",
                end: "+=200%",
                scrub: 1,
                pin: true
            }
        })
        .from(".bg-layer", { scale: 1.2, autoAlpha: 0, duration: 2 })
        .from(".hero-title", { x: -400, autoAlpha: 0, duration: 2 }, "-=1.5")
        .from(".item-left", { x: -300, y: 100, rotation: -30, autoAlpha: 0, duration: 2 }, "-=1.6")
        .from(".item-right", { x: 300, y: -100, rotation: 30, autoAlpha: 0, duration: 2 }, "-=1.6");
    }
}

function setupHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    if (!slides.length) return;

    gsap.set(slides, { autoAlpha: 0 });
    gsap.set(slides[0], { autoAlpha: 1 });

    function changeSlide(index) {
        if (isAnimating || index === currentSlide) return;
        isAnimating = true;

        const oldSlide = slides[currentSlide];
        const newSlide = slides[index];

        dots.forEach((dot, i) => {
            gsap.to(dot, { width: i === index ? 48 : 12, backgroundColor: i === index ? "white" : "rgba(255,255,255,0.2)", duration: 0.5 });
        });

        const tl = gsap.timeline({ onComplete: () => { currentSlide = index; isAnimating = false; }});
        tl.to(oldSlide, { autoAlpha: 0, scale: 0.98, duration: 1 }, 0);
        tl.fromTo(newSlide, { autoAlpha: 0, scale: 1.02 }, { autoAlpha: 1, scale: 1, duration: 1 }, 0);
    }

    dots.forEach((dot, i) => dot.addEventListener('click', () => changeSlide(i)));
    setInterval(() => changeSlide((currentSlide + 1) % slides.length), 8000);
}

function setupCollectionScroll() {
    const wrapper = document.getElementById('collectionsWrapper');
    if (!wrapper) return;

    Draggable.create(wrapper, {
        type: "x",
        bounds: {
            minX: -(wrapper.scrollWidth - wrapper.parentElement.offsetWidth),
            maxX: 0
        },
        inertia: true
    });
}

function initStatsCounter() {
    gsap.utils.toArray('.count-up').forEach(el => {
        const target = parseInt(el.dataset.target);
        gsap.to(el, {
            innerText: target, duration: 4, snap: { innerText: 1 },
            scrollTrigger: { trigger: el, start: "top 90%" }
        });
    });
}

// --- 4. LANGUAGE SYSTEM ---
function applyLanguage(lang) {
    document.body.classList.toggle('lang-bn', lang === 'bn');
    document.querySelectorAll('[data-bn]').forEach(el => {
        if (!el.dataset.en) el.dataset.en = el.innerHTML;
        el.innerHTML = lang === 'bn' ? el.dataset.bn : el.dataset.en;
    });
    const lb = document.getElementById('lang-toggle');
    if (lb) lb.textContent = lang === 'bn' ? 'EN' : 'BN';
    localStorage.setItem('site_lang', lang);
}
