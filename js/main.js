let focusElement = null;

// 错误处理函数
function handleError(error, functionName) {
    console.error(`Error in ${functionName}:`, error);
    // 可以在这里添加更多错误处理逻辑，例如显示错误提示给用户
}

function showPage(pageId) {
    try {
        const pages = document.querySelectorAll('.page-content');
        if (pages.length > 0) {
            pages.forEach(p => p.classList.add('hidden'));
        }
        const targetPage = document.getElementById('page-' + pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            window.scrollTo(0, 0);
        } else {
            console.warn(`Page ${pageId} not found`);
        }
    } catch (error) {
        handleError(error, 'showPage');
    }
}

function toggleModal() {
    try {
        const modal = document.getElementById('modal');
        if (modal) {
            const isHidden = modal.classList.toggle('hidden');
            modal.setAttribute('aria-hidden', isHidden);
            
            if (!isHidden) {
                // 记录当前焦点元素
                focusElement = document.activeElement;
                // 模态框打开时，将焦点设置到模态框内的确认按钮
                const modalButton = modal.querySelector('button');
                if (modalButton) {
                    modalButton.focus();
                }
                // 阻止背景滚动
                document.body.style.overflow = 'hidden';
            } else {
                // 模态框关闭时，恢复焦点到之前的元素
                if (focusElement) {
                    try {
                        focusElement.focus();
                    } catch (e) {
                        // 忽略焦点恢复错误
                    }
                    focusElement = null;
                }
                // 恢复背景滚动
                document.body.style.overflow = '';
            }
        } else {
            console.warn('Modal element not found');
        }
    } catch (error) {
        handleError(error, 'toggleModal');
    }
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

// 滚动触发动画函数
function handleScrollAnimations() {
    try {
        const elements = document.querySelectorAll('.animate-on-scroll');
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('animated');
            }
        });
    } catch (error) {
        handleError(error, 'handleScrollAnimations');
    }
}

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', function() {
    try {
        // 初始化滚动动画
        handleScrollAnimations();
        // 监听滚动事件
        window.addEventListener('scroll', handleScrollAnimations);
        console.log('QRC-Eye website loaded successfully');
    } catch (error) {
        handleError(error, 'DOMContentLoaded');
    }
});

// 全局错误处理
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    // 可以在这里添加全局错误处理逻辑
});

// 未捕获的Promise错误处理
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    // 可以在这里添加未捕获Promise错误的处理逻辑
});