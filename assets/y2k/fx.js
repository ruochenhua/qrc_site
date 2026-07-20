/* ==========================================================================
   QRC-Eye Y2K fx — 动效套件
   吸收原 js/main.js 全部行为（移动菜单 / 滚动动画 / 平滑滚动 / 全局错误
   监听），新增：定制十字光标 + Canvas 星星拖尾、随机 RGB 分离闪烁、卡片
   视差、SYSTEM BOOT 启动画面。
   降级判定集中在 QRC.fx.flags，是全站唯一判定来源（hero3d.js 复用）。
   ========================================================================== */
window.QRC = window.QRC || {};

QRC.handleError = QRC.handleError || function handleError(error, functionName) {
    console.error(`Error in ${functionName}:`, error);
};

/* 移动菜单（沿用 js/main.js 的契约：index.html 内联 onclick 调用） */
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
        QRC.handleError(error, 'toggleMobileMenu');
    }
}

QRC.fx = (function () {
    /* 降级判定唯一来源 */
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 滚动动画（来自 js/main.js，行为不变） ---------- */
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
            QRC.handleError(error, 'handleScrollAnimations');
        }
    }

    /* ---------- 平滑滚动（来自 js/main.js，行为不变） ---------- */
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
            QRC.handleError(error, 'initSmoothScroll');
        }
    }

    /* ---------- 定制十字光标 + Canvas 星星拖尾 ---------- */
    function initCursor() {
        if (!finePointer || isMobile || reducedMotion) return;
        try {
            document.body.classList.add('y2k-cursor-on');

            const cursor = document.createElement('div');
            cursor.id = 'y2k-cursor';
            cursor.setAttribute('aria-hidden', 'true');
            document.body.appendChild(cursor);

            const trail = document.createElement('canvas');
            trail.id = 'y2k-trail';
            trail.setAttribute('aria-hidden', 'true');
            document.body.appendChild(trail);
            const ctx = trail.getContext('2d');

            let stars = [];

            function resize() {
                trail.width = window.innerWidth;
                trail.height = window.innerHeight;
            }
            resize();
            window.addEventListener('resize', resize);

            window.addEventListener('mousemove', function (e) {
                cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
                stars.push({ x: e.clientX, y: e.clientY, life: 8 });
                if (stars.length > 60) stars.splice(0, stars.length - 60);
            });

            document.addEventListener('mouseover', function (e) {
                if (e.target.closest && e.target.closest('a, button')) {
                    cursor.classList.add('y2k-cursor-hover');
                } else {
                    cursor.classList.remove('y2k-cursor-hover');
                }
            });

            function drawStar(x, y, size, alpha) {
                ctx.strokeStyle = `rgba(57, 255, 106, ${alpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x - size, y);
                ctx.lineTo(x + size, y);
                ctx.moveTo(x, y - size);
                ctx.lineTo(x, y + size);
                ctx.stroke();
            }

            (function loop() {
                ctx.clearRect(0, 0, trail.width, trail.height);
                stars.forEach(s => {
                    s.life -= 1;
                    drawStar(s.x, s.y, 4, (s.life / 8) * 0.8);
                });
                stars = stars.filter(s => s.life > 0);
                requestAnimationFrame(loop);
            })();
        } catch (error) {
            QRC.handleError(error, 'fx.initCursor');
        }
    }

    /* ---------- 随机 RGB 分离闪烁（每 8-12s 一次，200ms） ---------- */
    function initGlitch() {
        if (reducedMotion) return;
        try {
            (function scheduleFlicker() {
                const delay = 8000 + Math.random() * 4000;
                setTimeout(function () {
                    try {
                        const targets = document.querySelectorAll('[data-glitch]');
                        if (targets.length) {
                            const el = targets[Math.floor(Math.random() * targets.length)];
                            el.classList.add('rgb-split');
                            setTimeout(function () {
                                el.classList.remove('rgb-split');
                            }, 200);
                        }
                    } catch (error) {
                        QRC.handleError(error, 'fx.flicker');
                    }
                    scheduleFlicker();
                }, delay);
            })();
        } catch (error) {
            QRC.handleError(error, 'fx.initGlitch');
        }
    }

    /* ---------- 卡片轻微视差（写 --parallax CSS 变量，不与 hover 变换冲突） ---------- */
    function initParallax() {
        if (isMobile || reducedMotion) return;
        try {
            const cards = document.querySelectorAll('.card-y2k');
            if (!cards.length) return;
            let ticking = false;
            function update() {
                ticking = false;
                const viewportCenter = window.innerHeight / 2;
                cards.forEach(card => {
                    const rect = card.getBoundingClientRect();
                    const cardCenter = rect.top + rect.height / 2;
                    let offset = (cardCenter - viewportCenter) * 0.03;
                    offset = Math.max(-12, Math.min(12, offset));
                    card.style.setProperty('--parallax', offset.toFixed(1) + 'px');
                });
            }
            window.addEventListener('scroll', function () {
                if (!ticking) {
                    ticking = true;
                    requestAnimationFrame(update);
                }
            });
            update();
        } catch (error) {
            QRC.handleError(error, 'fx.initParallax');
        }
    }

    /* ---------- SYSTEM BOOT 启动画面（首次访问 ~1s，可点击跳过） ---------- */
    function initBootScreen() {
        try {
            const boot = document.getElementById('boot-screen');
            if (!boot) return; // 非主页或标记未注入（Task 5 才加入）

            let alreadyBooted = false;
            try {
                alreadyBooted = !!sessionStorage.getItem('qrc-booted');
            } catch (error) {
                alreadyBooted = false;
            }
            if (reducedMotion || alreadyBooted) {
                boot.remove();
                return;
            }

            const fill = document.getElementById('boot-fill');
            const status = document.getElementById('boot-status');
            const DURATION = 1000;
            let done = false;

            function finish() {
                if (done) return;
                done = true;
                try {
                    sessionStorage.setItem('qrc-booted', '1');
                } catch (error) {
                    QRC.handleError(error, 'fx.bootScreen storage');
                }
                boot.classList.add('boot-done');
                setTimeout(function () {
                    if (boot.parentNode) boot.parentNode.removeChild(boot);
                }, 450);
            }

            boot.addEventListener('click', finish);

            const start = performance.now();
            (function tick(now) {
                if (done) return;
                const p = Math.min(1, (now - start) / DURATION);
                if (fill) fill.style.width = (p * 100).toFixed(0) + '%';
                if (status) status.textContent = 'LOADING… ' + (p * 100).toFixed(0) + '%';
                if (p < 1) {
                    requestAnimationFrame(tick);
                } else {
                    finish();
                }
            })(start);
        } catch (error) {
            QRC.handleError(error, 'fx.initBootScreen');
        }
    }

    /* ---------- dev-blog 标签筛选（仅列表页，守卫 #tag-filter 存在） ---------- */
    function initBlogFilter() {
        const filter = document.getElementById('tag-filter');
        if (!filter) return; // 非列表页或无文章（空状态无筛选条）
        try {
            const buttons = filter.querySelectorAll('.tag-filter-btn');
            const cards = document.querySelectorAll('.note-card');
            filter.addEventListener('click', function (e) {
                const btn = e.target.closest('.tag-filter-btn');
                if (!btn) return;
                const tag = btn.getAttribute('data-tag');
                buttons.forEach(function (b) {
                    b.classList.toggle('active', b === btn);
                });
                cards.forEach(function (card) {
                    const cardTags = (card.getAttribute('data-tags') || '').split(' ');
                    const show = tag === 'all' || cardTags.indexOf(tag) !== -1;
                    card.classList.toggle('note-card-hidden', !show);
                });
            });
        } catch (error) {
            QRC.handleError(error, 'fx.initBlogFilter');
        }
    }

    function init() {
        handleScrollAnimations();
        window.addEventListener('scroll', handleScrollAnimations);
        initSmoothScroll();
        initCursor();
        initGlitch();
        initParallax();
        initBootScreen();
        initBlogFilter();
    }

    return {
        init: init,
        flags: {
            finePointer: finePointer,
            isMobile: isMobile,
            reducedMotion: reducedMotion
        }
    };
})();

document.addEventListener('DOMContentLoaded', function () {
    try {
        QRC.fx.init();
        console.log('QRC-Eye Y2K fx loaded');
    } catch (error) {
        QRC.handleError(error, 'fx DOMContentLoaded');
    }
});

window.addEventListener('error', function (event) {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled promise rejection:', event.reason);
});
