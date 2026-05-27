/* ═══════════════════════════════════════════════════════════
   HAMBURGADA DA CRUZ — Cinematic Script
   ═══════════════════════════════════════════════════════════ */

// ===== Preloader =====
(function() {
    var preloader = document.getElementById('preloader');
    function hidePreloader() {
        if (!preloader || preloader.classList.contains('hidden')) return;
        preloader.classList.add('hidden');
        setTimeout(function() { if (preloader) preloader.remove(); }, 600);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(hidePreloader, 1600); });
    } else {
        setTimeout(hidePreloader, 1600);
    }
    // Fallback
    setTimeout(hidePreloader, 4000);
})();

// ===== Cursor Glow =====
(function() {
    var glow = document.getElementById('cursorGlow');
    if (!glow) return;
    var mouseX = 0, mouseY = 0;
    var glowX = 0, glowY = 0;

    document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        glowX += (mouseX - glowX) * 0.08;
        glowY += (mouseY - glowY) * 0.08;
        glow.style.left = glowX + 'px';
        glow.style.top = glowY + 'px';
        requestAnimationFrame(animate);
    }
    animate();

    // Hide on mobile
    if (window.innerWidth < 768) glow.style.display = 'none';
})();

// ===== Mobile Menu =====
(function() {
    var navToggle = document.getElementById('navToggle');
    var primaryNav = document.getElementById('primaryNav');
    if (!navToggle || !primaryNav) return;

    function setMenuState(isOpen) {
        navToggle.classList.toggle('active', isOpen);
        primaryNav.classList.toggle('active', isOpen);
        document.body.classList.toggle('nav-open', isOpen);
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        navToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    }

    navToggle.addEventListener('click', function() {
        setMenuState(!primaryNav.classList.contains('active'));
    });

    document.querySelectorAll('.nav-link').forEach(function(link) {
        link.addEventListener('click', function() {
            setMenuState(false);
        });
    });

    // Close on outside click
    document.addEventListener('click', function(e) {
        if (primaryNav.classList.contains('active') &&
            !primaryNav.contains(e.target) &&
            !navToggle.contains(e.target)) {
            setMenuState(false);
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && primaryNav.classList.contains('active')) {
            setMenuState(false);
        }
    });

    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && primaryNav.classList.contains('active')) {
            setMenuState(false);
        }
    });
})();

// ===== Header Scroll Effect =====
(function() {
    var header = document.getElementById('header');
    if (!header) return;
    var lastScroll = 0;

    window.addEventListener('scroll', function() {
        var currentScroll = window.scrollY || window.pageYOffset;

        if (currentScroll > 60) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Hide/show header on scroll direction
        if (currentScroll > lastScroll && currentScroll > 200) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        lastScroll = currentScroll;
    }, { passive: true });
})();

// ===== Smooth Scroll =====
document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
        var href = this.getAttribute('href');
        if (!href || href === '#') {
            e.preventDefault();
            return;
        }
        e.preventDefault();
        var target = document.querySelector(href);
        if (target) {
            var headerOffset = 80;
            var elementPosition = target.getBoundingClientRect().top;
            var offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    });
});

// ===== Active Nav Link on Scroll =====
(function() {
    var sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', function() {
        var scrollY = window.scrollY || window.pageYOffset;
        sections.forEach(function(section) {
            var sectionHeight = section.offsetHeight;
            var sectionTop = section.offsetTop - 150;
            var sectionId = section.getAttribute('id');
            var navLink = document.querySelector('.nav-link[href="#' + sectionId + '"]');
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                document.querySelectorAll('.nav-link').forEach(function(link) { link.classList.remove('active'); });
                if (navLink) navLink.classList.add('active');
            }
        });
    }, { passive: true });
})();

// ===== Scroll Reveal (Intersection Observer) =====
(function() {
    var revealElements = document.querySelectorAll('[data-reveal]');
    if (!revealElements.length) return;

    var revealObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    });

    revealElements.forEach(function(el) {
        revealObserver.observe(el);
    });
})();

// ===== Counter Animation =====
function animateCounter(element, target) {
    var duration = 2000;
    var startTime = null;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        var current = Math.floor(eased * target);

        var suffix = target === 98 ? '%' : '+';
        element.textContent = current.toLocaleString('pt-BR') + suffix;

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }
    requestAnimationFrame(step);
}

// Observe stat counters
(function() {
    var statObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var counter = entry.target;
                if (counter.dataset.count && !counter.animated) {
                    counter.animated = true;
                    animateCounter(counter, parseInt(counter.dataset.count));
                }
                statObserver.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-count]').forEach(function(el) {
        statObserver.observe(el);
    });
})();

// ===== Menu Data =====
var menuItemsData = [
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
        image: "IMGS/Hamburguer sendo mostrado.jpg",
        category: "combo"
    },
    {
        id: 3,
        name: "X-Bacon Individual",
        description: "Pão artesanal, hambúrguer 100g, queijo cheddar, bacon crocante, alface e molho da casa",
        price: "R$ 20,00",
        image: "IMGS/Hamburguer sendo mostrado.jpg",
        category: "individual"
    },
    {
        id: 4,
        name: "X-Bacon Combo",
        description: "X-Bacon individual + batata frita média + refrigerante 300ml",
        price: "R$ 35,00",
        image: "IMGS/Hamburguer sendo mostrado.jpg",
        category: "combo"
    }
];

// ===== Populate Menu (Bento Grid) =====
function populateMenu() {
    var menuGrid = document.getElementById('menuGrid');
    if (!menuGrid) return;

    var html = '';
    menuItemsData.forEach(function(item) {
        html += '<div class="bento-item" data-category="' + item.category + '">'
            + '<img src="' + item.image + '" alt="' + item.name + '" class="bento-img" loading="lazy">'
            + '<div class="bento-overlay">'
            + '<span class="bento-tag">' + item.category + '</span>'
            + '<h3>' + item.name + '</h3>'
            + '<p class="bento-desc">' + item.description + '</p>'
            + '<span class="bento-price">' + item.price + '</span>'
            + '</div>'
            + '</div>';
    });
    menuGrid.innerHTML = html;
}

// ===== Initialize =====
function init() {
    populateMenu();

    // ── Menu Filters ──
    var filterButtons = document.querySelectorAll('.filter-pill');
    filterButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            filterButtons.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var filter = btn.dataset.filter;

            document.querySelectorAll('.bento-item').forEach(function(item) {
                var cat = item.dataset.category;
                if (filter === 'all' || cat === filter) {
                    item.style.display = '';
                    item.style.opacity = '0';
                    item.style.transform = 'translateY(20px)';
                    setTimeout(function() {
                        item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                    }, 50);
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });


}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ===== Contact Form =====
(function() {
    var contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var name = this.elements['name'] ? this.elements['name'].value.trim() : '';
        var email = this.elements['email'] ? this.elements['email'].value.trim() : '';
        var message = this.elements['message'] ? this.elements['message'].value.trim() : '';

        if (!name || !email || !message) {
            showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showNotification('Por favor, insira um email válido.', 'error');
            return;
        }
        showNotification('Mensagem enviada com sucesso! Entraremos em contato em breve. 🙏', 'success');
        this.reset();
    });
})();

// ===== Notification System =====
function showNotification(message, type) {
    type = type || 'info';
    var notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    var icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
    notification.innerHTML = '<i class="fas fa-' + icon + '"></i><span>' + message + '</span>';
    document.body.appendChild(notification);

    setTimeout(function() {
        notification.style.animation = 'notifOut 0.4s ease forwards';
        setTimeout(function() { notification.remove(); }, 400);
    }, 3500);
}

// ===== Footer Year =====
(function() {
    var yearElement = document.getElementById('year');
    if (yearElement) yearElement.textContent = new Date().getFullYear();
})();

// ===== Parallax Orbs on Scroll =====
(function() {
    var ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(function() {
                var scrolled = window.scrollY || window.pageYOffset;
                var orbs = document.querySelectorAll('.ambient-orb');
                orbs.forEach(function(orb, i) {
                    var speed = (i + 1) * 0.03;
                    orb.style.transform = 'translateY(' + (scrolled * speed) + 'px)';
                });
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
})();

// ===== Button Magnetic Effect =====
(function() {
    if (window.innerWidth < 768) return;

    document.querySelectorAll('.btn-gold, .nav-cta-btn, .whatsapp-fab').forEach(function(btn) {
        btn.addEventListener('mousemove', function(e) {
            var rect = btn.getBoundingClientRect();
            var x = e.clientX - rect.left - rect.width / 2;
            var y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = 'translate(' + (x * 0.15) + 'px, ' + (y * 0.15) + 'px)';
        });

        btn.addEventListener('mouseleave', function() {
            btn.style.transform = '';
        });
    });
})();
