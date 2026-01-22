/**
 * MARKAZUS SUNNAH | Frontend Logic
 * Integrated API, GSAP Animations, and Language Toggle
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
        const result = await response.json();

        if (result.status === 'success') {
            renderProductCards(result.data, grid);
        }
    } catch (error) {
        console.error("API Error:", error);
        grid.innerHTML = `<p class="col-span-full text-center text-red-500">Failed to load products. Please try again later.</p>`;
    }
}

// --- UI RENDERING & TEMPLATES ---
function renderProductCards(products, container) {
    // 1. Map products to the home.html card design
    container.innerHTML = products.map(product => `
        <div class="product-card bg-white group shadow-sm reveal-item rounded-2xl cursor-pointer" 
             onclick="window.location.href='/product?id=${product.id}'">
            <div class="relative overflow-hidden bg-gray-100 aspect-square mb-4 rounded-2xl">
                <div class="product-image absolute inset-0 flex items-center justify-center transition-transform duration-700 group-hover:scale-110">
                    <img src="${product.image || '/static/img/placeholder.webp'}" 
                         alt="${product.name}" 
                         class="w-full h-full object-cover">
                </div>
            </div>
            <div class="p-4">
                <p class="text-sm text-gray-500 mb-1" data-bn="মারকাযুস সুন্নাহ">Markazus Sunnah</p>
                <h3 class="heading-font text-xl font-semibold mb-2" 
                    data-bn="${product.name_bn || product.name}">${product.name}</h3>
                <p class="text-lg font-semibold" 
                    data-bn="৳${product.price}">${product.price} USD</p>
            </div>
        </div>
    `).join('');

    // 2. Re-trigger animations for the newly injected items
    initScrollAnimations();
    
    // 3. Apply current language to new elements
    const savedLang = localStorage.getItem('site_lang') || 'en';
    applyLanguage(savedLang);
}

// --- GSAP ANIMATIONS ---
function initScrollAnimations() {
    // Navbar Shrink
    ScrollTrigger.create({
        start: "top -50",
        onEnter: () => gsap.to("#navbar", { height: 65, backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", duration: 0.4 }),
        onLeaveBack: () => gsap.to("#navbar", { height: 80, backgroundColor: "rgba(255,255,255,1)", backdropFilter: "blur(0px)", duration: 0.4 })
    });

    // Reveal items (including new product cards)
    gsap.utils.toArray('.reveal-item').forEach((item) => {
        gsap.to(item, {
            scrollTrigger: {
                trigger: item,
                start: "top 90%",
                toggleActions: "play none none none"
            },
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.2,
            ease: "power4.out"
        });
    });

    // 3D Scene Timeline
    const sceneTl = gsap.timeline({
        scrollTrigger: {
            trigger: ".scene-container",
            start: "top top",
            end: "+=200%",
            scrub: 1,
            pin: true
        }
    });
    sceneTl.from(".bg-layer", { scale: 1.2, opacity: 0, duration: 2 })
           .from(".hero-title", { x: -500, opacity: 0, duration: 2 }, "-=1.5")
           .from(".item-left", { x: -300, y: 100, rotation: -30, opacity: 0, duration: 2 }, "-=1.8")
           .from(".item-right", { x: 300, y: -100, rotation: 30, opacity: 0, duration: 2 }, "-=1.8");
}

function setupHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    
    function changeSlide(index) {
        if (isAnimating || index === currentSlide) return;
        isAnimating = true;
        const oldSlide = slides[currentSlide];
        const newSlide = slides[index];

        dots.forEach((dot, i) => {
            gsap.to(dot, { width: i === index ? 32 : 12, backgroundColor: i === index ? "white" : "rgba(255,255,255,0.5)", duration: 0.4 });
        });

        gsap.to(oldSlide, { opacity: 0, duration: 0.8, onComplete: () => oldSlide.classList.remove('active') });
        newSlide.classList.add('active');
        gsap.to(newSlide, { opacity: 1, duration: 0.8 });
        
        gsap.fromTo(newSlide.querySelector('.hero-img'), { scale: 1.5 }, { scale: 1, duration: 3.5, ease: "expo.out" });
        gsap.fromTo(newSlide.querySelector('.text-content'), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.5, delay: 0.3, ease: "expo.out" });

        setTimeout(() => { isAnimating = false; currentSlide = index; }, 800);
    }

    dots.forEach((dot, i) => dot.addEventListener('click', () => changeSlide(i)));
    setInterval(() => changeSlide((currentSlide + 1) % slides.length), 6000);
}

// --- COLLECTIONS DRAGGABLE LOGIC ---
function setupCollectionScroll() {
    const wrapper = document.getElementById('collectionsWrapper');
    if (!wrapper) return;

    const cards = document.querySelectorAll('.collection-card');
    const stepWidth = cards[0].offsetWidth + 24; // Card + Gap
    let autoTimer;
    let startX;

    Draggable.create(wrapper, {
        type: "x",
        edgeResistance: 0.95,
        dragResistance: 0.2,
        inertia: false,
        bounds: { 
            minX: -(wrapper.scrollWidth - wrapper.parentElement.offsetWidth), 
            maxX: 0 
        },
        onDragStart: function() {
            clearInterval(autoTimer);
            startX = this.x;
        },
        onDragEnd: function() {
            const draggedDistance = this.x - startX;
            const threshold = 50;
            let targetX;
            
            if (Math.abs(draggedDistance) > threshold) {
                if (draggedDistance < 0) {
                    targetX = Math.ceil((startX - stepWidth) / stepWidth) * stepWidth;
                } else {
                    targetX = Math.floor((startX + stepWidth) / stepWidth) * stepWidth;
                }
            } else {
                targetX = startX;
            }

            gsap.to(wrapper, {
                x: targetX,
                duration: 0.6,
                ease: "power2.out",
                onComplete: startAutoStep
            });
        }
    });

    function moveNext() {
        const currentX = gsap.getProperty(wrapper, "x");
        const maxScroll = -(wrapper.scrollWidth - wrapper.parentElement.offsetWidth);
        let targetX = currentX - stepWidth;
        if (targetX < maxScroll - 10) targetX = 0;

        gsap.to(wrapper, {
            x: targetX,
            duration: 1,
            ease: "power3.inOut"
        });
    }

    function startAutoStep() {
        clearInterval(autoTimer);
        autoTimer = setInterval(moveNext, 4000);
    }

    startAutoStep();
    wrapper.addEventListener('mouseenter', () => clearInterval(autoTimer));
    wrapper.addEventListener('mouseleave', startAutoStep);
}

// --- LANGUAGE TOGGLE & LOCALSTORAGE ---
const langBtn = document.getElementById('lang-toggle');

function applyLanguage(lang) {
    const langElements = document.querySelectorAll('[data-bn]');
    langElements.forEach(el => {
        if (!el.dataset.en) el.dataset.en = el.innerHTML; // Store original English
        el.innerHTML = (lang === 'bn') ? el.dataset.bn : el.dataset.en;
    });
    langBtn.textContent = (lang === 'bn') ? 'EN' : 'BN';
    localStorage.setItem('site_lang', lang);
}

// --- INITIALIZATION ---
window.addEventListener('load', () => {
    gsap.registerPlugin(ScrollTrigger, Draggable);
    
    // 1. Initial UI Setup
    setupHeroSlider();
    setupCollectionScroll();
    
    // 2. Load API Data
    fetchProducts();
    
    // 3. Setup Lang Toggle
    langBtn.addEventListener('click', () => {
        const nextLang = localStorage.getItem('site_lang') === 'bn' ? 'en' : 'bn';
        applyLanguage(nextLang);
    });
});
