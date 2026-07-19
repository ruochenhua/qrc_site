/* ==========================================================================
   QRC-Eye Y2K sfx — WebAudio 振荡器合成 8-bit 音效（无音频文件）
   默认静音；右下角开关开启；状态存 localStorage['qrc-sfx-enabled']。
   所有 AudioContext 调用外包 try/catch（浏览器自动播放策略：首次开启
   动作本身是用户手势，可安全创建/恢复 AudioContext）。
   ========================================================================== */
window.QRC = window.QRC || {};

QRC.handleError = QRC.handleError || function handleError(error, functionName) {
    console.error(`Error in ${functionName}:`, error);
};

QRC.sfx = (function () {
    const STORAGE_KEY = 'qrc-sfx-enabled';
    let ctx = null;
    let enabled = false;
    let lastHoverTarget = null;

    function ensureCtx() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        }
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        return ctx;
    }

    function tone(freq, duration, type, delay, volume) {
        const ac = ensureCtx();
        if (!ac) return;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const t = ac.currentTime + (delay || 0);
        osc.type = type || 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume || 0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t);
        osc.stop(t + duration);
    }

    function play(name) {
        if (!enabled) return;
        try {
            if (name === 'hover') {
                tone(880, 0.06, 'square', 0, 0.05);
            } else if (name === 'click') {
                tone(660, 0.07, 'square', 0, 0.07);
                tone(990, 0.09, 'square', 0.07, 0.07);
            }
        } catch (error) {
            QRC.handleError(error, 'sfx.play');
        }
    }

    function updateToggle() {
        const btn = document.getElementById('sfx-toggle');
        if (!btn) return;
        btn.textContent = enabled ? 'SOUND: ON' : 'SOUND: OFF';
        btn.setAttribute('aria-pressed', String(enabled));
        btn.classList.toggle('sfx-on', enabled);
    }

    function setEnabled(value) {
        enabled = !!value;
        try {
            localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
        } catch (error) {
            QRC.handleError(error, 'sfx.setEnabled storage');
        }
        if (enabled) {
            try {
                ensureCtx();
                play('click');
            } catch (error) {
                QRC.handleError(error, 'sfx.setEnabled unlock');
            }
        }
        updateToggle();
    }

    function init() {
        try {
            try {
                enabled = localStorage.getItem(STORAGE_KEY) === '1';
            } catch (error) {
                enabled = false;
            }
            const btn = document.getElementById('sfx-toggle');
            if (btn) {
                btn.addEventListener('click', function () {
                    setEnabled(!enabled);
                });
            }
            document.addEventListener('mouseover', function (e) {
                const target = e.target.closest ? e.target.closest('a, button') : null;
                if (!target || target === lastHoverTarget) return;
                lastHoverTarget = target;
                play('hover');
            });
            document.addEventListener('click', function (e) {
                if (e.target.closest && e.target.closest('#sfx-toggle')) return;
                if (e.target.closest && e.target.closest('a, button')) play('click');
            });
            updateToggle();
        } catch (error) {
            QRC.handleError(error, 'sfx.init');
        }
    }

    return {
        init: init,
        play: play,
        setEnabled: setEnabled,
        get enabled() { return enabled; }
    };
})();

document.addEventListener('DOMContentLoaded', function () {
    try {
        QRC.sfx.init();
    } catch (error) {
        QRC.handleError(error, 'sfx DOMContentLoaded');
    }
});
