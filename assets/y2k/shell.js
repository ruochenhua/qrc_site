/* ==========================================================================
   QRC-Eye Y2K game shell — 向游戏页面注入顶栏 + INSERT COIN 启动画面
   用法：游戏 index.html 的 <head> 加 shell.css，</body> 前加本脚本（defer）。
   游戏内部代码零改动；本脚本失败不影响游戏运行。
   ========================================================================== */
(function () {
    function handleError(error, functionName) {
        console.error('Error in ' + functionName + ':', error);
    }

    try {
        document.body.classList.add('y2k-shell');

        /* 顶栏：返回首页 + 当前页标题 */
        var bar = document.createElement('div');
        bar.id = 'y2k-topbar';

        var back = document.createElement('a');
        back.className = 'y2k-topbar-back';
        back.href = '../index.html';
        back.textContent = '◀ QRC-EYE';
        bar.appendChild(back);

        var title = document.createElement('span');
        title.className = 'y2k-topbar-title';
        title.textContent = document.title || '';
        bar.appendChild(title);

        document.body.appendChild(bar);

        /* INSERT COIN 启动画面：点击消散（每次进入都显示，街机仪式感；
           同时它的点击天然构成用户手势，利于游戏内音频解锁） */
        var boot = document.createElement('div');
        boot.id = 'y2k-boot';
        boot.setAttribute('role', 'button');
        boot.setAttribute('aria-label', '点击进入游戏');

        var inner = document.createElement('div');
        inner.className = 'y2k-boot-inner';

        var coin = document.createElement('p');
        coin.className = 'y2k-boot-coin';
        coin.textContent = 'INSERT COIN';
        inner.appendChild(coin);

        var start = document.createElement('p');
        start.className = 'y2k-boot-start';
        start.textContent = '▶ CLICK TO START';
        inner.appendChild(start);

        boot.appendChild(inner);
        boot.addEventListener('click', function () {
            boot.classList.add('y2k-boot-off');
            /* 揭示被 shell.css 藏住的游戏画面（在覆盖层淡出期间同步进行） */
            document.body.classList.add('y2k-shell-on');
            setTimeout(function () {
                if (boot.parentNode) boot.parentNode.removeChild(boot);
            }, 450);
        });
        document.body.appendChild(boot);
    } catch (error) {
        handleError(error, 'y2k-shell');
        /* 注入失败也不能让页面保持隐藏（shell.css 的防穿帮规则） */
        document.body.classList.add('y2k-shell-on');
    }
})();
