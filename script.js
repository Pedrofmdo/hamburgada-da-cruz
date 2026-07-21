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

// ===== Balão do WhatsApp (FAB) =====
(function() {
    var tooltip = document.getElementById('whatsappTooltip');
    var closeBtn = document.getElementById('whatsappTooltipClose');
    var fab = document.getElementById('whatsappFab');
    if (!tooltip) return;

    var DISMISS_KEY = 'hdc_wa_tooltip_dismissed';

    function dismiss() {
        tooltip.classList.add('hidden');
        try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
    }

    try {
        if (sessionStorage.getItem(DISMISS_KEY)) tooltip.classList.add('hidden');
    } catch (e) {}

    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            dismiss();
        });
    }
    if (fab) fab.addEventListener('click', dismiss);
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
        // 1024 = mesmo breakpoint do CSS onde o menu deixa de ser gaveta.
        if (window.innerWidth > 1024 && primaryNav.classList.contains('active')) {
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
        name: "Cheeseburger",
        description: "Pão artesanal, hambúrguer 100g, queijo cheddar, alface, tomate e molho especial",
        price: "R$ 18,00",
        image: "IMGS/Hamburguer sendo mostrado.jpg",
        category: "hamburguer"
    },
    {
        id: 2,
        name: "Cheeseburger Bacon",
        description: "Pão artesanal, hambúrguer 100g, queijo cheddar, bacon crocante, alface e molho da casa",
        price: "R$ 20,00",
        image: "IMGS/Hamburguer sendo mostrado.jpg",
        category: "hamburguer"
    },
    {
        id: 3,
        name: "Batata e Refrigerante",
        description: "Porção de batata frita crocante + refrigerante lata 350ml",
        price: "R$ 15,00",
        image: "IMGS/BatataRefrigerante.jpg",
        category: "acompanhamento"
    },
    {
        id: 4,
        name: "Batata",
        description: "Porção de batata frita crocante",
        price: "R$ 8,00",
        image: "IMGS/Batata.jpg",
        category: "acompanhamento"
    },
    {
        id: 5,
        name: "Coca-Cola",
        description: "Lata 350ml",
        price: "R$ 8,00",
        image: "IMGS/Refrigerante.jpg",
        category: "acompanhamento"
    },
    {
        id: 6,
        name: "Coca-Cola Zero",
        description: "Lata 350ml",
        price: "R$ 8,00",
        image: "IMGS/Refrigerante.jpg",
        category: "acompanhamento"
    },
    {
        id: 7,
        name: "Guaraná",
        description: "Lata 350ml",
        price: "R$ 8,00",
        image: "IMGS/Guarana.jpg",
        category: "acompanhamento"
    },
    {
        id: 8,
        name: "Guaraná Zero",
        description: "Lata 350ml",
        price: "R$ 8,00",
        image: "IMGS/Guarana.jpg",
        category: "acompanhamento"
    },
    {
        id: 9,
        name: "Cookie Chocochip",
        description: "Massa tradicional, com gotas de chocolate e finalizado com flor de sal",
        price: "R$ 14,00",
        image: "IMGS/Chocochip.jpeg",
        category: "cookie"
    },
    {
        id: 10,
        name: "Cookie Duplochoco",
        description: "Massa de cacau 100%, com gotas de chocolate branco",
        price: "R$ 14,00",
        image: "IMGS/Duplochoco.jpeg",
        category: "cookie"
    },
    {
        id: 11,
        name: "Cookie Nutella",
        description: "Massa tradicional, gotas de chocolate preto, recheio de nutella e finalizado com flor de sal",
        price: "R$ 18,00",
        image: "IMGS/Nutela.jpeg",
        category: "cookie"
    },
    {
        id: 12,
        name: "Cookie Limão Siciliano com Frutas Vermelhas",
        description: "Massa tradicional, gotas de chocolate branco, recheado de brigadeiro de limão siciliano e geleia de frutas vermelhas",
        price: "R$ 18,00",
        image: "IMGS/Cookie-Limão-Frutas-vermelhas.jpeg",
        category: "cookie"
    },
    {
        id: 13,
        name: "Cookie Red Fruit",
        description: "Massa red velvet e gotas de chocolate branco, recheado com brigadeiro de cream cheese e geleia de frutas vermelhas",
        price: "R$ 18,00",
        image: "IMGS/Redvelvet.jpeg",
        category: "cookie"
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
            + '<div class="bento-actions">'
            + '<span class="bento-price">' + item.price + '</span>'
            + '<button type="button" class="bento-add-btn" data-add="' + item.id + '" aria-label="Adicionar ' + item.name + ' ao carrinho">'
            + '<i class="fas fa-plus"></i><span>Adicionar</span>'
            + '</button>'
            + '</div>'
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

// ===== QR Code Pix — Doação (valor livre, sem pedido) =====
(function() {
    var el = document.getElementById('donateQr');
    if (!el || typeof qrcode === 'undefined') return;

    // BR Code estático da chave Pix, sem valor fixo (o doador digita o
    // valor no próprio app do banco). Gerado uma única vez — não muda.
    var DONATE_PIX_PAYLOAD = '00020126480014br.gov.bcb.pix0126financeirocmcc@outlook.com5204000053039865802BR5918HAMBURGADA DA CRUZ6011JOAO PESSOA62070503***6304BD9F';

    try {
        var qr = qrcode(0, 'M');
        qr.addData(DONATE_PIX_PAYLOAD);
        qr.make();
        el.innerHTML = qr.createImgTag(6, 10, 'QR Code Pix para doação');
    } catch (e) {
        el.remove();
    }

    // Botão "Copiar chave" do card de contato.
    var copyBtn = document.getElementById('donateCopyBtn');
    var keyEl = document.getElementById('donateKeyText');
    if (!copyBtn || !keyEl) return;

    copyBtn.addEventListener('click', function() {
        var key = keyEl.textContent.trim();
        function done() {
            showNotification('Chave Pix copiada! 🙏', 'success');
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(key).then(done, fallback);
        } else {
            fallback();
        }
        // Fallback para navegadores sem clipboard API (ou sem HTTPS).
        function fallback() {
            var tmp = document.createElement('textarea');
            tmp.value = key;
            tmp.setAttribute('readonly', '');
            tmp.style.position = 'fixed';
            tmp.style.opacity = '0';
            document.body.appendChild(tmp);
            tmp.select();
            try { document.execCommand('copy'); done(); } catch (e) {}
            document.body.removeChild(tmp);
        }
    });
})();

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

// ===== Cart & Checkout =====
(function() {
    var CART_KEY = 'hdc_cart';
    var MAX_QTY = 50;
    var API_CREATE_ORDER = '/api/create-order';

    // ── Helpers de preço ──
    // "R$ 18,00" -> 1800 (centavos). Usa só os dígitos.
    function priceToCents(str) {
        var digits = String(str).replace(/\D/g, '');
        return parseInt(digits, 10) || 0;
    }
    function centsToBRL(cents) {
        return 'R$ ' + (cents / 100).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    function findMenuItem(id) {
        for (var i = 0; i < menuItemsData.length; i++) {
            if (menuItemsData[i].id === id) return menuItemsData[i];
        }
        return null;
    }

    // ── Estado (localStorage) ──
    function getCart() {
        try {
            var arr = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
            if (!Array.isArray(arr)) return [];
            // sanitiza e descarta itens que não existem mais no cardápio
            return arr
                .filter(function(l) { return l && findMenuItem(l.id); })
                .map(function(l) {
                    return { id: l.id, quantity: Math.min(MAX_QTY, Math.max(1, parseInt(l.quantity, 10) || 1)) };
                });
        } catch (e) {
            return [];
        }
    }
    function saveCart(cart) {
        try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
        renderCart();
    }
    function clearCart() {
        try { localStorage.removeItem(CART_KEY); } catch (e) {}
        renderCart();
    }
    function addToCart(id) {
        var cart = getCart();
        var found = false;
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].id === id) {
                cart[i].quantity = Math.min(MAX_QTY, cart[i].quantity + 1);
                found = true;
                break;
            }
        }
        if (!found) cart.push({ id: id, quantity: 1 });
        saveCart(cart);
    }
    function setQty(id, qty) {
        var cart = getCart()
            .map(function(l) { return l.id === id ? { id: id, quantity: qty } : l; })
            .filter(function(l) { return l.quantity > 0; });
        saveCart(cart);
    }
    function removeFromCart(id) {
        saveCart(getCart().filter(function(l) { return l.id !== id; }));
    }
    function cartCount() {
        return getCart().reduce(function(n, l) { return n + l.quantity; }, 0);
    }
    function cartSubtotalCents() {
        return getCart().reduce(function(sum, l) {
            var item = findMenuItem(l.id);
            return sum + (item ? priceToCents(item.price) * l.quantity : 0);
        }, 0);
    }

    // ── DOM refs ──
    var cartBtn = document.getElementById('cartBtn');
    var cartBadge = document.getElementById('cartBadge');
    var drawer = document.getElementById('cartDrawer');
    var backdrop = document.getElementById('cartBackdrop');
    var cartClose = document.getElementById('cartClose');
    var stepItems = document.getElementById('cartStepItems');
    var stepCheckout = document.getElementById('cartStepCheckout');
    var cartItems = document.getElementById('cartItems');
    var cartEmpty = document.getElementById('cartEmpty');
    var cartFoot = document.getElementById('cartFoot');
    var cartSubtotal = document.getElementById('cartSubtotal');
    var toCheckoutBtn = document.getElementById('cartToCheckout');
    var backBtn = document.getElementById('cartBack');
    var checkoutForm = document.getElementById('checkoutForm');
    var checkoutTotal = document.getElementById('checkoutTotal');
    var checkoutSubmit = document.getElementById('checkoutSubmit');
    var stepPix = document.getElementById('cartStepPix');
    var pixQr = document.getElementById('pixQr');
    var pixCode = document.getElementById('pixCode');
    var pixTotalEl = document.getElementById('pixTotal');
    var pixCopyBtn = document.getElementById('pixCopyBtn');
    var pixWhatsapp = document.getElementById('pixWhatsapp');

    // ── Render ──
    function renderCart() {
        var count = cartCount();
        if (cartBadge) {
            cartBadge.textContent = count;
            cartBadge.hidden = count === 0;
        }
        if (cartBtn) {
            cartBtn.classList.remove('bump');
            if (count > 0) {
                // reinicia a animação de "pulo"
                void cartBtn.offsetWidth;
                cartBtn.classList.add('bump');
            }
        }

        var cart = getCart();
        if (cartItems) {
            if (cart.length === 0) {
                cartItems.innerHTML = '';
                if (cartEmpty) cartEmpty.hidden = false;
                if (cartFoot) cartFoot.hidden = true;
            } else {
                if (cartEmpty) cartEmpty.hidden = true;
                if (cartFoot) cartFoot.hidden = false;
                var html = '';
                cart.forEach(function(l) {
                    var item = findMenuItem(l.id);
                    if (!item) return;
                    var lineCents = priceToCents(item.price) * l.quantity;
                    html += '<div class="cart-item" data-id="' + item.id + '">'
                        + '<img src="' + item.image + '" alt="' + item.name + '" class="cart-item-img" loading="lazy">'
                        + '<div class="cart-item-info">'
                        + '<h4>' + item.name + '</h4>'
                        + '<span class="cart-item-price">' + centsToBRL(lineCents) + '</span>'
                        + '<div class="cart-qty">'
                        + '<button type="button" class="cart-qty-btn" data-action="dec" aria-label="Diminuir">&minus;</button>'
                        + '<span class="cart-qty-val">' + l.quantity + '</span>'
                        + '<button type="button" class="cart-qty-btn" data-action="inc" aria-label="Aumentar">+</button>'
                        + '<button type="button" class="cart-item-remove" data-action="remove" aria-label="Remover item"><i class="fas fa-trash-alt"></i></button>'
                        + '</div>'
                        + '</div>'
                        + '</div>';
                });
                cartItems.innerHTML = html;
            }
        }
        var subtotal = centsToBRL(cartSubtotalCents());
        if (cartSubtotal) cartSubtotal.textContent = subtotal;
        if (checkoutTotal) checkoutTotal.textContent = subtotal;
    }

    // ── Abrir / fechar drawer ──
    function openCart() {
        if (!drawer) return;
        showStep('items');
        drawer.classList.add('active');
        drawer.setAttribute('aria-hidden', 'false');
        if (backdrop) backdrop.hidden = false;
        document.body.classList.add('cart-open');
    }
    function closeCart() {
        if (!drawer) return;
        drawer.classList.remove('active');
        drawer.setAttribute('aria-hidden', 'true');
        if (backdrop) backdrop.hidden = true;
        document.body.classList.remove('cart-open');
    }
    function showStep(step) {
        if (!stepItems || !stepCheckout) return;
        stepItems.hidden = step !== 'items';
        stepCheckout.hidden = step !== 'checkout';
        if (stepPix) stepPix.hidden = step !== 'pix';
    }

    // ── Eventos ──
    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (cartClose) cartClose.addEventListener('click', closeCart);
    if (backdrop) backdrop.addEventListener('click', closeCart);
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && drawer && drawer.classList.contains('active')) closeCart();
    });

    // Adicionar ao carrinho (delegação — os botões nascem via populateMenu)
    document.addEventListener('click', function(e) {
        var addBtn = e.target.closest ? e.target.closest('[data-add]') : null;
        if (!addBtn) return;
        var id = parseInt(addBtn.getAttribute('data-add'), 10);
        if (!findMenuItem(id)) return;
        addToCart(id);
        var item = findMenuItem(id);
        showNotification((item ? item.name : 'Item') + ' adicionado ao carrinho! 🛒', 'success');
    });

    // Controles de quantidade / remover (delegação dentro da lista)
    if (cartItems) {
        cartItems.addEventListener('click', function(e) {
            var btn = e.target.closest ? e.target.closest('[data-action]') : null;
            if (!btn) return;
            var row = btn.closest('.cart-item');
            if (!row) return;
            var id = parseInt(row.getAttribute('data-id'), 10);
            var action = btn.getAttribute('data-action');
            var current = 0;
            getCart().forEach(function(l) { if (l.id === id) current = l.quantity; });

            if (action === 'inc') setQty(id, Math.min(MAX_QTY, current + 1));
            else if (action === 'dec') setQty(id, current - 1);
            else if (action === 'remove') removeFromCart(id);
        });
    }

    if (toCheckoutBtn) {
        toCheckoutBtn.addEventListener('click', function() {
            if (cartCount() === 0) return;
            showStep('checkout');
        });
    }
    if (backBtn) backBtn.addEventListener('click', function() { showStep('items'); });

    // Consumir no local / Retirar no local (ambos são no local — não há entrega).
    function getFulfillment() {
        var checked = checkoutForm ? checkoutForm.querySelector('input[name="fulfillment"]:checked') : null;
        return checked && checked.value === 'pickup' ? 'pickup' : 'dinein';
    }

    // ── Submit do checkout ──
    function setLoading(loading) {
        if (!checkoutSubmit) return;
        checkoutSubmit.disabled = loading;
        checkoutSubmit.classList.toggle('is-loading', loading);
        var label = checkoutSubmit.querySelector('span');
        if (label) label.textContent = loading ? 'Processando...' : 'Gerar Pix do pedido';
    }

    // Gera o objeto QR a partir do payload Pix (lib vendorizada, roda no navegador).
    function makeQr(text) {
        if (typeof qrcode === 'undefined') return null;
        // Tenta o tamanho automático (0); se a versão não aceitar, varre de 4 a 40.
        try { var q = qrcode(0, 'M'); q.addData(text); q.make(); return q; } catch (e) {}
        for (var t = 4; t <= 40; t++) {
            try { var qq = qrcode(t, 'M'); qq.addData(text); qq.make(); return qq; } catch (e2) {}
        }
        return null;
    }

    // Monta a mensagem do WhatsApp com o resumo do pedido (itens, total e se vai
    // consumir ou retirar no local) — pronta pra enviar junto com o comprovante.
    function buildOrderMessage(cart, customer, totalFormatted) {
        var lines = ['Olá! Acabei de fazer um pedido na Hamburgada da Cruz e já paguei o Pix. Segue o comprovante:', ''];

        lines.push('*Pedido:*');
        (cart || []).forEach(function(l) {
            var item = findMenuItem(l.id);
            var name = item ? item.name : ('Item #' + l.id);
            lines.push('• ' + l.quantity + 'x ' + name);
        });
        lines.push('');
        lines.push('*Total:* ' + (totalFormatted || ''));

        if (customer) {
            if (customer.name) lines.push('*Nome:* ' + customer.name);
            lines.push(customer.fulfillment === 'pickup'
                ? '*Retirar no local*'
                : '*Consumir no local*');
        }

        return lines.join('\n');
    }

    function showPix(payload, totalFormatted, cart, customer) {
        if (pixTotalEl) pixTotalEl.textContent = totalFormatted || '';
        if (pixCode) pixCode.value = payload;

        if (pixQr) {
            var qr = makeQr(payload);
            // Fallback: se o QR não gerar, o Copia e Cola ainda resolve.
            pixQr.innerHTML = qr
                ? qr.createImgTag(5, 12, 'QR Code Pix')
                : '<p class="pix-qr-fallback">Use o código Copia e Cola abaixo.</p>';
        }

        if (pixWhatsapp) {
            var msg = buildOrderMessage(cart, customer, totalFormatted);
            pixWhatsapp.href = 'https://wa.me/558388403579?text=' + encodeURIComponent(msg);
        }

        showStep('pix');
    }

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();

            var cart = getCart();
            if (cart.length === 0) {
                showNotification('Seu carrinho está vazio.', 'error');
                showStep('items');
                return;
            }

            var name = valueOf('co-name');
            var phone = valueOf('co-phone');
            var email = valueOf('co-email');
            var fulfillment = getFulfillment();

            if (name.length < 2) { showNotification('Por favor, informe seu nome.', 'error'); return; }
            if (phone.replace(/\D/g, '').length < 10) { showNotification('Informe um telefone válido com DDD.', 'error'); return; }
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showNotification('E-mail inválido.', 'error'); return; }

            var customer = { name: name, phone: phone, email: email, fulfillment: fulfillment };

            var payload = {
                items: cart.map(function(l) { return { id: l.id, quantity: l.quantity }; }),
                customer: customer
            };

            setLoading(true);
            fetch(API_CREATE_ORDER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(function(r) {
                    return r.json().then(function(data) { return { ok: r.ok, data: data }; });
                })
                .then(function(res) {
                    if (!res.ok || !res.data || !res.data.pix_payload) {
                        throw new Error((res.data && res.data.error) || 'Não foi possível gerar o pagamento.');
                    }
                    // Mostra o Pix (QR + Copia e Cola) gerado no servidor.
                    // Passa cart/customer ANTES de limpar, pra montar a mensagem do WhatsApp.
                    showPix(res.data.pix_payload, res.data.total_formatted, cart, customer);
                    clearCart(); // pedido já registrado no servidor
                    setLoading(false);
                })
                .catch(function(err) {
                    showNotification(err.message || 'Erro ao processar o pedido. Tente novamente.', 'error');
                    setLoading(false);
                });
        });
    }
    function valueOf(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    // ── Copiar o código Pix (Copia e Cola) ──
    if (pixCopyBtn) {
        pixCopyBtn.addEventListener('click', function() {
            var text = pixCode ? pixCode.value : '';
            if (!text) return;

            function done() { showNotification('Código Pix copiado! 📋', 'success'); }
            function legacyCopy() {
                if (!pixCode) return;
                pixCode.removeAttribute('readonly');
                pixCode.select();
                try { document.execCommand('copy'); done(); } catch (e) {}
                pixCode.setAttribute('readonly', 'readonly');
                if (window.getSelection) window.getSelection().removeAllRanges();
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done).catch(legacyCopy);
            } else {
                legacyCopy();
            }
        });
    }

    // Render inicial
    renderCart();
})();
