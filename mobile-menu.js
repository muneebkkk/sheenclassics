/**
 * ========================================
 * MOBILE HAMBURGER MENU - OPTIMIZED
 * ========================================
 * - Click outside to close
 * - No lag/jank on open/close
 * - GPU accelerated animations
 * - Touch-friendly
 * - Prevents body scroll when menu open
 */

(function () {
    'use strict';

    // DOM Elements
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navOverlay = document.getElementById('nav-overlay');
    const navbar = document.getElementById('main-navbar');
    const navLinks = navMenu ? navMenu.querySelectorAll('.nav-link') : [];

    // State
    let isMenuOpen = false;
    let scrollLock = false;

    /**
     * Toggle menu open/close
     */
    function toggleMenu() {
        isMenuOpen ? closeMenu() : openMenu();
    }

    /**
     * Open menu with optimized performance
     */
    function openMenu() {
        if (isMenuOpen) return; // Prevent duplicate calls

        isMenuOpen = true;

        // Use requestAnimationFrame for optimal timing
        requestAnimationFrame(() => {
            navMenu.classList.add('active');
            navOverlay.classList.add('active');
            mobileToggle.classList.add('open');
            mobileToggle.setAttribute('aria-expanded', 'true');

            // Lock body scroll
            lockScroll();
        });
    }

    /**
     * Close menu with optimized performance
     */
    function closeMenu() {
        if (!isMenuOpen) return; // Prevent duplicate calls

        isMenuOpen = false;

        requestAnimationFrame(() => {
            navMenu.classList.remove('active');
            navOverlay.classList.remove('active');
            mobileToggle.classList.remove('open');
            mobileToggle.setAttribute('aria-expanded', 'false');

            // Unlock body scroll
            unlockScroll();
        });
    }

    /**
     * Lock body scroll (prevent scroll when menu is open)
     */
    function lockScroll() {
        if (scrollLock) return;
        scrollLock = true;

        const scrollbarWidth = getScrollbarWidth();
        document.documentElement.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.documentElement.style.paddingRight = scrollbarWidth + 'px';
        }
    }

    /**
     * Unlock body scroll
     */
    function unlockScroll() {
        if (!scrollLock) return;
        scrollLock = false;

        document.documentElement.style.overflow = '';
        document.documentElement.style.paddingRight = '';
    }

    /**
     * Get scrollbar width to prevent layout shift
     */
    function getScrollbarWidth() {
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll';
        document.body.appendChild(outer);

        const inner = document.createElement('div');
        outer.appendChild(inner);

        const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
        outer.parentNode.removeChild(outer);

        return scrollbarWidth;
    }

    /**
     * Close menu when clicking outside (on overlay)
     */
    function handleOverlayClick(event) {
        // Only close if clicking the overlay itself, not bubbled from menu
        if (event.target === navOverlay) {
            closeMenu();
        }
    }

    /**
     * Close menu when clicking a nav link
     */
    function handleNavLinkClick() {
        closeMenu();
    }

    /**
     * Close menu on Escape key
     */
    function handleEscapeKey(event) {
        if (event.key === 'Escape' && isMenuOpen) {
            closeMenu();
            mobileToggle.focus();
        }
    }

    /**
     * Handle window resize - close menu on desktop
     */
    function handleWindowResize() {
        if (window.innerWidth > 768 && isMenuOpen) {
            closeMenu();
        }
    }

    /**
     * Prevent menu from closing when clicking inside menu content
     */
    function handleMenuClick(event) {
        // Don't close if clicking buttons or interactive elements inside
        if (event.target.closest('button, a[href], input, select, textarea')) {
            // If it's a nav-link, close. Otherwise, keep menu open (for admin buttons, etc)
            if (event.target.classList.contains('nav-link')) {
                closeMenu();
            }
        }
    }

    /**
     * Initialize event listeners with passive/capture where appropriate
     */
    function initEventListeners() {
        // Hamburger toggle
        if (mobileToggle) {
            mobileToggle.addEventListener('click', toggleMenu);
        }

        // Overlay click to close
        if (navOverlay) {
            navOverlay.addEventListener('click', handleOverlayClick, { capture: false });
        }

        // Menu content clicks
        if (navMenu) {
            navMenu.addEventListener('click', handleMenuClick, { capture: false });
        }

        // Nav links
        navLinks.forEach((link) => {
            link.addEventListener('click', handleNavLinkClick);
        });

        // Keyboard - Escape to close
        document.addEventListener('keydown', handleEscapeKey, { capture: true });

        // Window resize
        window.addEventListener('resize', handleWindowResize, { passive: true });
    }

    /**
     * Clean up (for SPA navigation)
     */
    function cleanup() {
        if (mobileToggle) {
            mobileToggle.removeEventListener('click', toggleMenu);
        }

        if (navOverlay) {
            navOverlay.removeEventListener('click', handleOverlayClick);
        }

        if (navMenu) {
            navMenu.removeEventListener('click', handleMenuClick);
        }

        navLinks.forEach((link) => {
            link.removeEventListener('click', handleNavLinkClick);
        });

        document.removeEventListener('keydown', handleEscapeKey);
        window.removeEventListener('resize', handleWindowResize);

        closeMenu();
        unlockScroll();
    }

    /**
     * Initialize on DOM ready
     */
    function init() {
        // Only initialize on mobile screens
        if (window.innerWidth <= 768) {
            initEventListeners();

            // Set initial aria attributes
            if (mobileToggle) {
                mobileToggle.setAttribute('aria-expanded', 'false');
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose cleanup for SPA frameworks (optional)
    window.__mobileMenuCleanup = cleanup;
})();

/**
 * ========================================
 * NAVBAR SCROLL EFFECT (OPTIONAL)
 * ========================================
 */

(function () {
    'use strict';

    const navbar = document.getElementById('main-navbar');
    let lastScrollTop = 0;
    let ticking = false;

    function updateNavbar() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > 10) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        ticking = false;
    }

    function onScroll() {
        if (!ticking) {
            window.requestAnimationFrame(updateNavbar);
            ticking = true;
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
})();

/**
 * ========================================
 * NOTIFICATION TOAST HELPER
 * ========================================
 */

window.showNotification = function (message, type = 'success', duration = 3000) {
    const notificationEl = document.getElementById('notification');
    if (!notificationEl) return;

    const bgColor = type === 'error' ? '#c0392b' : type === 'warning' ? '#f39c12' : '#27ae60';
    const icon = type === 'error' ? '✕' : type === 'warning' ? '⚠' : '✓';

    notificationEl.innerHTML = `
        <span style="font-size:1.2rem;color:white;">${icon}</span>
        <span>${message}</span>
    `;

    notificationEl.style.display = 'flex';
    notificationEl.style.background = bgColor;
    notificationEl.style.color = 'white';
    notificationEl.style.animation = 'fadeIn 0.3s var(--ease)';

    if (duration > 0) {
        setTimeout(() => {
            notificationEl.style.animation = 'fadeOut 0.3s var(--ease)';
            setTimeout(() => {
                notificationEl.style.display = 'none';
            }, 300);
        }, duration);
    }
};
