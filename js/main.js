let focusElement = null;

function handleError(error, functionName) {
    console.error(`Error in ${functionName}:`, error);
}

function toggleMobileMenu() {
    try {
        const mobileMenu = document.getElementById('mobile-menu');
        const menuButton = document.getElementById('menu-button');
        if (mobileMenu && menuButton) {
            const isHidden = mobileMenu.classList.toggle('hidden');
            mobileMenu.setAttribute('aria-hidden', isHidden);
            menuButton.setAttribute('aria-expanded', !isHidden);
            menuButton.setAttribute('aria-label', isHidden ? '打开菜单' : '关闭菜单');
        } else {
            console.warn('Mobile menu or menu button not found');
        }
    } catch (error) {
        handleError(error, 'toggleMobileMenu');
    }
}

function handleScrollAnimations() {
    try {
        const elements = document.querySelectorAll('.animate-on-scroll');
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 120;
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('animated');
            }
        });
    } catch (error) {
        handleError(error, 'handleScrollAnimations');
    }
}

function initSmoothScroll() {
    try {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    } catch (error) {
        handleError(error, 'initSmoothScroll');
    }
}

window.addEventListener('DOMContentLoaded', function() {
    try {
        handleScrollAnimations();
        window.addEventListener('scroll', handleScrollAnimations);
        initSmoothScroll();
        console.log('QRC-Eye website loaded successfully');
    } catch (error) {
        handleError(error, 'DOMContentLoaded');
    }
});

window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
});
