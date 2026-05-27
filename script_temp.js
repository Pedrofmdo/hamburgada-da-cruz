// ===== Theme Toggle =====
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle?.querySelector('i');

const getCurrentTheme = () => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const setTheme = (theme) => {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        if (themeIcon) {
            themeIcon.className = 'fas fa-sun';
        }
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        if (themeIcon) {
            themeIcon.className = 'fas fa-moon';
        }
        localStorage.setItem('theme', 'light');
    }
};

setTheme(getCurrentTheme());

themeToggle?.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'light' : 'dark');
});

// ===== Mobile Menu =====
const navToggle = document.querySelector('.nav-toggle');
const primaryNav = document.querySelector('.primary-nav');

navToggle?.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    primaryNav?.classList.toggle('active');
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navToggle?.classList.remove('active');
        primaryNav?.classList.remove('active');
    });
});

// ===== Header Scroll Effect =====
const header = document.querySelector('.site-header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        header?.classList.add('scrolled');
    } else {
        header?.classList.remove('scrolled');
    }
    
    if (currentScroll > lastScroll && currentScroll > 100) {
        header?.style.transform = 'translateY(-100%)';
    } else {
        header?.style.transform = 'translateY(0)';
    }
    
    lastScroll = currentScroll;
});

// ===== Smooth Scroll =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Active Nav Link on Scroll =====
const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    
    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
        
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
            navLink?.classList.add('active');
        }
    });
});

// ===== Preloader =====
const preloader = document.getElementById('preloader');

const hidePreloader = () => {
    if (!preloader || preloader.classList.contains('hidden')) return;
    preloader.classList.add('hidden');
    setTimeout(() => preloader?.remove(), 500);
};

// Esconde o preloader quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(hidePreloader, 300));
} else {
    setTimeout(hidePreloader, 300);
}

// Fallback: garante que o preloader some após 3 segundos mesmo que algo falhe
setTimeout(hidePreloader, 3000);

// ===== Counter Animation =====
const animateCounter = function(element, target) {
    let current = 0;
    const increment = target / 60;
    const timer = setInterval(function() {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        var suffix = target === 98 ? '%' : '+';
        element.textContent = Math.floor(current).toLocaleString() + suffix;
    }, 20);
};

// ===== Menu Data =====
const menuItemsData = [
    {
        id: 1,
        name: "X-Burger Individual",
        description: "Pão artesanal, hambúrguer 100g, queijo cheddar, alface, tomate e molho especial",
        price: "R$ 18,00",
        image: "IMGS/Hamburguer sendo mostrado.jpg",
        category: "individual"
    },
    {
        id: 2,
        name: "X-Burger Combo",
        description: "X-Burger individual + batata frita média + refrigerante 300ml",
        price: "R$ 32,00",
        image: "https://images.unsplash.com/photo-1542586041-ed48d00e4e76?w=400&h=300&fit=crop&q=80",
        category: "combo"
    },
    {
        id: 3,
        name: "X-Bacon Individual",
        description: "Pão artesanal, hambúrguer 100g, queijo cheddar, bacon crocante, alface e molho da casa",
        price: "R$ 20,00",
        image: "https://images.unsplash.com/photo-1591098259321-ec6d75ecab75?w=400&h=300&fit=crop&q=80",
        category: "individual"
    },
    {
        id: 4,
        name: "X-Bacon Combo",
        description: "X-Bacon individual + batata frita média + refrigerante 300ml",
        price: "R$ 35,00",
        image: "https://images.unsplash.com/photo-1553979459-dcb5d7e1ec33?w=400&h=300&fit=crop&q=80",
        category: "combo"
    }
];

// ===== Specials Data =====
const specialsData = [
    {
        id: 1,
        name: "Hambúrguer do Chef",
        description: "Criação exclusiva com carne de pato confit, foie gras geléia de frutos vermelhos e brioche artesanal",
        price: "R$ 52,90",
        image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&h=350&fit=crop&q=80",
        tag: "Chef's Special"
    },
    {
        id: 2,
        name: "Hambúrguer Mexicano",
        description: "Carne bovina com tempero mexicano, queijo pepper jack, guacamole, jalapeños e coentro fresco",
        price: "R$ 34,90",
        image: "https://images.unsplash.com/photo-1563426311026-7968b3ee79a8?w=1200&h=350&fit=crop&q=80",
        tag: "Picante"
    },
    {
        id: 3,
        name: "Hambúrguer Japonês",
        description: "Carne wagyu 180g, molho teriyaki, alga nori, gengibre em conserva e maionese de wasabi",
        price: "R$ 39,90",
        image: "https://images.unsplash.com/photo-1572802419224-296b0a8032ef?w=1200&h=350&fit=crop&q=80",
        tag: "Fusão"
    }
];

// ===== Populate Menu =====
const populateMenu = () => {
    const menuGrid = document.getElementById('menuGrid');
    if (menuGrid) {
        menuGrid.innerHTML = menuItemsData.map(item => `
            <div class="menu-item" data-category="${item.category}">
                <div class="menu-item-badge">${item.category.toUpperCase()}</div>
                <img src="${item.image}" alt="${item.name}" loading="lazy">
                <div class="menu-item-content">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <span class="price">${item.price}</span>
                </div>
            </div>
        `).join('');
    }
};

// ===== Populate Specials Slider =====
let sliderTrack = null;
let specialsDotsContainer = null;

const populateSpecials = () => {
    sliderTrack = document.getElementById('sliderTrack');
    specialsDotsContainer = document.getElementById('specialsDots');

    if (sliderTrack && specialsDotsContainer) {
        sliderTrack.innerHTML = specialsData.map(item => `
            <div class="special-item">
                <div class="special-card">
                    <span class="special-tag">${item.tag}</span>
                    <img src="${item.image}" alt="${item.name}" loading="lazy">
                    <div class="special-content">
                        <h3 class="special-title">${item.name}</h3>
                        <p class="special-description">${item.description}</p>
                        <span class="special-price">${item.price}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        specialsDotsContainer.innerHTML = specialsData.map((_, i) => `
            <button class="${i === 0 ? 'active' : ''}" data-slide="${i}"></button>
        `).join('');
    }
};

// ===== Intersection Observer for Animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            
            // Counter animation for stats
            if (entry.target.classList.contains('stat-card')) {
                const counter = entry.target.querySelector('[data-count]');
                if (counter && !counter.animated) {
                    counter.animated = true;
                    const target = parseInt(counter.dataset.count);
                    animateCounter(counter, target);
                }
            }
            
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// ===== Initialize Everything When DOM is Ready =====
const init = () => {
    populateMenu();
    populateSpecials();
    
    // ===== Menu Filter (now that menu is populated) =====
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.dataset.filter;
            const menuItems = document.querySelectorAll('.menu-item');
            
            menuItems.forEach(item => {
                const category = item.dataset.category;
                if (filter === 'all' || category === filter) {
                    item.style.display = 'block';
                    item.style.animation = 'fadeInUp 0.5s ease forwards';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // ===== Specials Slider Controls =====
    const totalSlides = specialsData.length;
    let currentSlide = 0;

    const updateSlider = () => {
        if (sliderTrack) {
            sliderTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
        }
        const dots = document.querySelectorAll('#specialsDots button');
        dots.forEach(dot => {
            const slideIndex = parseInt(dot.dataset.slide);
            dot.classList.toggle('active', slideIndex === currentSlide);
        });
    };

    document.querySelector('.slider-prev')?.addEventListener('click', () => {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateSlider();
    });

    document.querySelector('.slider-next')?.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateSlider();
    });

    // Dots click handlers
    setTimeout(() => {
        const dots = document.querySelectorAll('#specialsDots button');
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                currentSlide = parseInt(dot.dataset.slide);
                updateSlider();
            });
        });
    }, 100);

    // ===== Observe elements for animations =====
    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
};

// Run init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ===== Contact Form =====
const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = this.elements['name']?.value.trim();
    const email = this.elements['email']?.value.trim();
    const message = this.elements['message']?.value.trim();
    
    if (!name || !email || !message) {
        showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Por favor, insira um email válido.', 'error');
        return;
    }
    
    showNotification('Obrigado por entrar em contato! Entraremos em contato em breve.', 'success');
    this.reset();
});

// ===== Notification System =====
const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 30px;
        background: ${type === 'success' ? '#00b894' : '#e74c3c'};
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

// ===== Add CSS Animations Dynamically =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===== Footer Year =====
const yearElement = document.getElementById('year');
if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}

// ===== Parallax Effect for Hero Shapes =====
let ticking = false;
window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const scrolled = window.scrollY;
            const shapes = document.querySelectorAll('.shape');
            
            shapes.forEach((shape, index) => {
                const speed = (index + 1) * 0.05;
                shape.style.transform = `translateY(${scrolled * speed}px)`;
            });
            ticking = false;
        });
        ticking = true;
    }
});
