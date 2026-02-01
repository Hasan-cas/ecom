/**
 * MARKAZUS SUNNAH | Full Fixed Frontend Logic
 * Optimized for Render.com and Mobile/Termux environments.
 */

// --- CONFIGURATION & GLOBAL VARIABLES ---
const PRODUCT_API = '/api/products';
let currentSlide = 0;
let isAnimating = false;

// --- API FETCHING LOGIC ---
async function fetchProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    try {
        const response = await fetch(PRODUCT_API);
        // Better error handling for the 500 error seen in logs
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();

        if (result.status === 'success') {
            renderProductCards(result.data, grid);
        }
    } catch (error) {
        console.error("API Error:", error);
        grid.innerHTML = `
            <p class="col-span-full text-center text-red-500">
                Failed to load products from database.
            </p>`;
    }
}

// --- UI RENDERING ---
function renderProductCards(products, container) {
    container.innerHTML = products.map(product => `
        <div class="product-card bg-white group shadow-sm reveal-item rounded-2xl opacity-0 translate-y-8 scale-95">
            <a href="/product?id=${product.id}" class="block">
                <div class="relative overflow-hidden bg-gray-400 aspect-square mb-4 rounded-2xl">
                    <div class="product-image absolute inset-0 transition-transform duration-700 group-hover:scale-110">
                        <img src="${product.image || '/static/img/placeholder.webp'}"
                             alt="${product.name}"
                             class="w-full h-full object-cover">
                    </div>
                </div>
                <div class="p-4">
                    <p class="text-sm text-gray-500 mb-1" data-bn="মারকাযুস সুন্নাহ">
                        Markazus Sunnah
                    </p>
                    <h3 class="heading-font text-xl font-semibold mb-2"
                        data-bn="${product.name_bn || product.name}">
                        ${product.name}
                    </h3>
                    <p class="text-lg font-semibold"
                        data-bn="৳${product.price}">
                        ${product.price} taka
                    </p>
                </div>
            </a>
        </div>
    `).join('');

    // Crucial: Refresh GSAP so it "sees" the new product cards
    ScrollTrigger.refresh();
    applyLanguage(localStorage.getItem('site_lang') || 'en');
}

// --- STATS COUNTER ---
function initStatsCounter() {
    gsap.utils.toArray('.count-up').forEach(el => {
        const target = parseInt(el.dataset.target);
        gsap.to(el, {
            innerText: target,
            duration: 4,
            snap: { innerText: 1 },
            ease: "expo.out",
            scrollTrigger: {
                trigger: el,
                start: "top 90%",
                toggleActions: "play none none none"
            }
        });
    });
}

// --- SCROLL ANIMATIONS ---
function initScrollAnimations() {
    // Navbar shrink
    ScrollTrigger.create({
        start: "top -50",
        onEnter: () =>
            gsap.to("#navbar", {
                height: 65,
                backgroundColor: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(10px)",
                duration: 0.4
            }),
        onLeaveBack: () =>
            gsap.to("#navbar", {
                height: 80,
                backgroundColor: "rgba(255,255,255,1)",
                backdropFilter: "blur(0px)",
                duration: 0.4
            })
    });

    // Reveal items
    gsap.utils.toArray('.reveal-item').forEach(item => {
        gsap.to(item, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.1,
            ease: "power4.out",
            scrollTrigger: {
                trigger: item,
                start: "top 90%",
                toggleActions: "play none none none"
            }
        });
    });

    // 3D Scene
    gsap.timeline({
        scrollTrigger: {
            trigger: ".scene-container",
            start: "top top",
            end: "+=200%",
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true // Added for better mobile support
        }
    })
        .from(".bg-layer", { scale: 1.2, autoAlpha: 0, duration: 2 })
        .from(".hero-title", { x: -400, autoAlpha: 0, duration: 2 }, "-=1.5")
        .from(".item-left", { x: -300, y: 100, rotation: -30, autoAlpha: 0, duration: 2 }, "-=1.6")
        .from(".item-right", { x: 300, y: -100, rotation: 30, autoAlpha: 0, duration: 2 }, "-=1.6");
}

// --- HERO SLIDER ---
function setupHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    if (!slides.length) return;

    gsap.set(slides, { autoAlpha: 0 });
    gsap.set(slides[0], { autoAlpha: 1 });
    gsap.set(dots[0], { width: 48, backgroundColor: "white" });

    gsap.fromTo(
        slides[0].querySelector('.hero-img'),
        { scale: 1.1 },
        { scale: 1, duration: 5, ease: "power2.out" }
    );

    function changeSlide(index) {
        if (isAnimating || index === currentSlide) return;
        isAnimating = true;

        const oldSlide = slides[currentSlide];
        const newSlide = slides[index];

        dots.forEach((dot, i) => {
            gsap.to(dot, {
                width: i === index ? 48 : 12,
                backgroundColor: i === index ? "white" : "rgba(255,255,255,0.2)",
                duration: 0.5
            });
        });

        const tl = gsap.timeline({
            onComplete: () => {
                currentSlide = index;
                isAnimating = false;
            }
        });

        tl.to(oldSlide, { autoAlpha: 0, scale: 0.98, duration: 1 }, 0);
        tl.fromTo(newSlide, { autoAlpha: 0, scale: 1.02 }, { autoAlpha: 1, scale: 1, duration: 1 }, 0);
    }

    dots.forEach((dot, i) => dot.addEventListener('click', () => changeSlide(i)));
    setInterval(() => changeSlide((currentSlide + 1) % slides.length), 8000);
}

// --- COLLECTION DRAG ---
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

// --- LANGUAGE ---
function applyLanguage(lang) {
    document.body.classList.toggle('lang-bn', lang === 'bn');
    document.querySelectorAll('[data-bn]').forEach(el => {
        if (!el.dataset.en) el.dataset.en = el.innerHTML;
        el.innerHTML = lang === 'bn' ? el.dataset.bn : el.dataset.en;
    });

    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) langBtn.textContent = lang === 'bn' ? 'EN' : 'BN';
    localStorage.setItem('site_lang', lang);
}

// --- INIT ---
window.addEventListener('load', () => {
    // 1. Setup GSAP
    gsap.registerPlugin(ScrollTrigger, Draggable);

    // 2. Start all animations IMMEDIATELY 
    // This ensures your 3D Scene and Hero work even if the database is broken
    setupHeroSlider();
    setupCollectionScroll();
    initStatsCounter();
    initScrollAnimations(); 

    // 3. Fetch Data
    fetchProducts();

    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            applyLanguage(localStorage.getItem('site_lang') === 'bn' ? 'en' : 'bn');
        });
    }
});
