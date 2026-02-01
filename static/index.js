/**
 * MARKAZUS SUNNAH | Final Production Logic
 * Includes Debugger Markers for ScrollTrigger
 */

const PRODUCT_API = '/api/products';
let currentSlide = 0;
let isAnimating = false;

// --- 1. CORE INITIALIZATION ---
window.addEventListener('load', () => {
    console.log("PRODUCTION: Assets Loaded. Initializing Engine...");
    gsap.registerPlugin(ScrollTrigger, Draggable);

    setupHeroSlider();
    setupCollectionScroll();
    initStatsCounter();
    
    // Fetch products first to ensure page height is correct
    fetchProducts().then(() => {
        // Delay to allow DOM to settle on Render's slow infrastructure
        setTimeout(() => {
            initScrollAnimations();
            ScrollTrigger.refresh();
            console.log("PRODUCTION: ScrollTrigger Refreshed with API Data.");
        }, 800);
    });

    // Language Toggle
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            const newLang = localStorage.getItem('site_lang') === 'bn' ? 'en' : 'bn';
            applyLanguage(newLang);
        });
    }

    // Safety refresh for late-loading cloud assets
    setTimeout(() => {
        ScrollTrigger.refresh();
    }, 3000);
});

// --- 2. HERO SLIDER (ZOOM-OUT RESTORED) ---
function setupHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    if (!slides.length) return;

    gsap.set(slides, { autoAlpha: 0 });
    gsap.set(slides[0], { autoAlpha: 1 });

    // Start initial zoom-out
    const firstImg = slides[0].querySelector('.hero-img');
    if (firstImg) {
        gsap.fromTo(firstImg, { scale: 1.15 }, { scale: 1, duration: 8, ease: "power2.out" });
    }

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

        const tl = gsap.timeline({ onComplete: () => { currentSlide = index; isAnimating = false; }});
        tl.to(oldSlide, { autoAlpha: 0, scale: 0.98, duration: 1.2, ease: "expo.inOut" }, 0);
        tl.fromTo(newSlide, { autoAlpha: 0, scale: 1.02 }, { autoAlpha: 1, scale: 1, duration: 1.2, ease: "expo.inOut" }, 0);
        
        const newImg = newSlide.querySelector('.hero-img');
        if (newImg) {
            tl.fromTo(newImg, { scale: 1.15 }, { scale: 1, duration: 6, ease: "power2.out" }, 0);
        }
    }

    dots.forEach((dot, i) => dot.addEventListener('click', () => changeSlide(i)));
    setInterval(() => changeSlide((currentSlide + 1) % slides.length), 8000);
}

// --- 3. SCROLL & 3D ANIMATIONS (DEBUG ENABLED) ---
function initScrollAnimations() {
    console.log("DEBUG: Initializing 3D Scene Animations...");

    // FORCE INITIAL HIDDEN STATE (Critical for Render)
    gsap.set(".item-left", { xPercent: -150, opacity: 0, rotation: -45 });
    gsap.set(".item-right", { xPercent: 150, opacity: 0, rotation: 45 });
    gsap.set(".hero-title", { autoAlpha: 0, y: 50 });

    // 3D SCENE TIMELINE
    const sceneTl = gsap.timeline({
        scrollTrigger: {
            trigger: ".scene-container",
            start: "top top",
            end: "+=200%",
            scrub: 1.5,
            pin: true,
            markers: true, // DEBUG MARKERS ENABLED
            invalidateOnRefresh: true 
        }
    });

    sceneTl
        .to(".bg-layer", { scale: 1.1, autoAlpha: 1, duration: 2 })
        .to(".hero-title", { autoAlpha: 1, y: 0, duration: 1.5 }, "-=1")
        .to(".item-left", { xPercent: 0, opacity: 1, rotation: 0, duration: 3, ease: "power2.out" }, "-=1.5")
        .to(".item-right", { xPercent: 0, opacity: 1, rotation: 0, duration: 3, ease: "power2.out" }, "-=3");

    // PRODUCT CARD REVEALS
    gsap.utils.toArray('.reveal-item').forEach(item => {
        gsap.to(item, {
            opacity: 1, y: 0, scale: 1,
            duration: 1,
            scrollTrigger: {
                trigger: item,
                start: "top 95%",
                toggleActions: "play none none none"
            }
        });
    });
}

// --- 4. DATA LOGIC ---
async function fetchProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    try {
        const response = await fetch(PRODUCT_API);
        const result = await response.json();
        if (result.status === 'success') {
            renderProductCards(result.data, grid);
            const savedLang = localStorage.getItem('site_lang') || 'en';
            applyLanguage(savedLang);
        }
    } catch (e) { console.error("API Error:", e); }
}

function renderProductCards(products, container) {
    container.innerHTML = products.map(product => `
        <div class="product-card bg-white group shadow-sm reveal-item rounded-2xl opacity-0 translate-y-10 scale-95">
            <a href="/product?id=${product.id}" class="block">
                <div class="relative overflow-hidden bg-gray-100 aspect-square mb-4 rounded-2xl">
                    <img src="${product.image || '/static/img/placeholder.webp'}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                </div>
                <div class="p-4">
                    <h3 class="heading-font text-xl font-semibold mb-2" data-bn="${product.name_bn || product.name}">${product.name}</h3>
                    <p class="text-lg font-semibold">${product.price} TK</p>
                </div>
            </a>
        </div>
    `).join('');
}

// --- 5. HELPERS ---
function initStatsCounter() {
    gsap.utils.toArray('.count-up').forEach(el => {
        const target = parseInt(el.dataset.target);
        gsap.to(el, {
            innerText: target, duration: 3, snap: { innerText: 1 },
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
