/**
 * MARKAZUS SUNNAH | Full Enterprise Production Logic
 * Optimized for Render, Vercel, and Termux
 */

const PRODUCT_API = '/api/products';
let currentSlide = 0;
let isAnimating = false;

// --- 1. CORE INITIALIZATION ENGINE ---
window.addEventListener('load', () => {
    // Register Plugins
    gsap.registerPlugin(ScrollTrigger, Draggable);

    // Run UI Modules
    setupHeroSlider();
    setupCollectionScroll();
    initStatsCounter();
    
    // Fetch Products and refresh ScrollTrigger AFTER they land
    fetchProducts().then(() => {
        // Refresh after DOM injection
        ScrollTrigger.refresh();
    });

    // Language Toggle Setup
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            applyLanguage(localStorage.getItem('site_lang') === 'bn' ? 'en' : 'bn');
        });
    }

    // Safety Refresh for slow Render servers / image loading
    setTimeout(() => {
        ScrollTrigger.refresh();
    }, 2000);
});

// --- 2. HERO SLIDER (RESORED ZOOM-OUT) ---
function setupHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    if (!slides.length) return;

    // Initial state
    gsap.set(slides, { autoAlpha: 0 });
    gsap.set(slides[0], { autoAlpha: 1 });
    gsap.set(dots[0], { width: 48, backgroundColor: "white" });

    // Start initial zoom-out
    gsap.fromTo(slides[0].querySelector('.hero-img'),
        { scale: 1.15 },
        { scale: 1, duration: 6, ease: "power2.out" }
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

        // Transition logic
        tl.to(oldSlide, { autoAlpha: 0, scale: 0.98, duration: 1.2, ease: "expo.inOut" }, 0);
        tl.fromTo(newSlide, 
            { autoAlpha: 0, scale: 1.02 }, 
            { autoAlpha: 1, scale: 1, duration: 1.2, ease: "expo.inOut" }, 
            0
        );

        // Zoom-out logic for the new slide image
        tl.fromTo(newSlide.querySelector('.hero-img'),
            { scale: 1.15 },
            { scale: 1, duration: 6, ease: "power2.out" },
            0
        );

        // Text reveal
        tl.fromTo(newSlide.querySelector('.text-content'),
            { y: 30, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 1, ease: "power3.out" },
            0.4
        );
    }

    dots.forEach((dot, i) => dot.addEventListener('click', () => changeSlide(i)));
    setInterval(() => changeSlide((currentSlide + 1) % slides.length), 8000);
}

// --- 3. SCROLL & 3D ANIMATIONS (FIXED POSITIONING) ---
function initScrollAnimations() {
    // Navbar effect
    ScrollTrigger.create({
        start: "top -50",
        onEnter: () => gsap.to("#navbar", { height: 65, backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", duration: 0.4 }),
        onLeaveBack: () => gsap.to("#navbar", { height: 80, backgroundColor: "rgba(255,255,255,1)", backdropFilter: "blur(0px)", duration: 0.4 })
    });

    // Reveal Product Items
    gsap.utils.toArray('.reveal-item').forEach(item => {
        gsap.to(item, {
            opacity: 1, y: 0, scale: 1,
            duration: 1.1, ease: "power4.out",
            scrollTrigger: { trigger: item, start: "top 90%" }
        });
    });

    // 3D SCENE FIX: Set initial hidden positions explicitly
    gsap.set(".item-left", { x: -300, y: 100, rotation: -30, autoAlpha: 0 });
    gsap.set(".item-right", { x: 300, y: -100, rotation: 30, autoAlpha: 0 });
    gsap.set(".hero-title", { x: -400, autoAlpha: 0 });

    const sceneTl = gsap.timeline({
        scrollTrigger: {
            trigger: ".scene-container",
            start: "top top",
            end: "+=200%",
            scrub: 1.2,
            pin: true,
            invalidateOnRefresh: true
        }
    });

    sceneTl
        .to(".bg-layer", { scale: 1.1, autoAlpha: 0.8, duration: 2 })
        .to(".hero-title", { x: 0, autoAlpha: 1, duration: 2 }, "-=1.5")
        .to(".item-left", { x: 0, y: 0, rotation: 0, autoAlpha: 1, duration: 2.5, ease: "power2.out" }, "-=1.8")
        .to(".item-right", { x: 0, y: 0, rotation: 0, autoAlpha: 1, duration: 2.5, ease: "power2.out" }, "-=2.5");
}

// --- 4. API & RENDERING ---
async function fetchProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    try {
        const response = await fetch(PRODUCT_API);
        const result = await response.json();

        if (result.status === 'success') {
            renderProductCards(result.data, grid);
            // Re-init animations after products exist in DOM
            initScrollAnimations();
        }
    } catch (error) {
        console.error("API Error:", error);
    }
}

function renderProductCards(products, container) {
    container.innerHTML = products.map(product => `
        <div class="product-card bg-white group shadow-sm reveal-item rounded-2xl opacity-0 translate-y-8 scale-95 transition-all">
            <a href="/product?id=${product.id}" class="block">
                <div class="relative overflow-hidden bg-gray-400 aspect-square mb-4 rounded-2xl">
                    <img src="${product.image || '/static/img/placeholder.webp'}" alt="${product.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                </div>
                <div class="p-4">
                    <h3 class="heading-font text-xl font-semibold mb-2" data-bn="${product.name_bn || product.name}">${product.name}</h3>
                    <p class="text-lg font-semibold" data-bn="৳${product.price}">${product.price} taka</p>
                </div>
            </a>
        </div>
    `).join('');
    applyLanguage(localStorage.getItem('site_lang') || 'en');
}

// --- 5. STATS & COLLECTIONS ---
function initStatsCounter() {
    gsap.utils.toArray('.count-up').forEach(el => {
        const target = parseInt(el.dataset.target);
        gsap.to(el, {
            innerText: target, duration: 4, snap: { innerText: 1 },
            scrollTrigger: { trigger: el, start: "top 90%" }
        });
    });
}

function setupCollectionScroll() {
    const wrapper = document.getElementById('collectionsWrapper');
    if (!wrapper) return;
    Draggable.create(wrapper, {
        type: "x",
        bounds: { minX: -(wrapper.scrollWidth - wrapper.parentElement.offsetWidth), maxX: 0 },
        inertia: true
    });
}

// --- 6. LANGUAGE SYSTEM ---
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
