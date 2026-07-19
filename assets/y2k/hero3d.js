/* ==========================================================================
   QRC-Eye Y2K hero3d — Three.js Hero 主视觉（仅主页，仅桌面端）
   挤出金属字 QRC-EYE + 线框网格地面 + 鼠标倾斜 + 滚动缩小。
   降级链：reduced-motion / 移动端 / WebGL 不可用 / CDN 或字体加载失败
   → 保留 CSS 铬渐变静态标题（Task 2 标记），不白屏不报错。
   ========================================================================== */
window.QRC = window.QRC || {};

QRC.handleError = QRC.handleError || function handleError(error, functionName) {
    console.error(`Error in ${functionName}:`, error);
};

QRC.hero3d = (function () {
    const FONT_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json';

    function getFlags() {
        if (QRC.fx && QRC.fx.flags) return QRC.fx.flags;
        return {
            finePointer: window.matchMedia('(pointer: fine)').matches,
            isMobile: window.matchMedia('(max-width: 768px)').matches,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };
    }

    function webglAvailable() {
        try {
            const c = document.createElement('canvas');
            return !!(window.WebGLRenderingContext &&
                (c.getContext('webgl') || c.getContext('experimental-webgl')));
        } catch (error) {
            return false;
        }
    }

    function cleanup(stage, fallback) {
        const canvas = document.getElementById('hero-3d-canvas');
        if (canvas) canvas.remove();
        if (stage) stage.classList.remove('hero-3d-on');
        if (fallback) fallback.classList.remove('hero-title-hidden');
    }

    async function init() {
        const stage = document.getElementById('hero-3d-stage');
        const fallback = document.getElementById('hero-title-text');
        if (!stage) return; // 非主页

        const flags = getFlags();
        if (flags.reducedMotion || flags.isMobile || !webglAvailable()) {
            return; // 保留 CSS 降级标题
        }

        try {
            const THREE = await import('three');
            const { FontLoader } = await import('three/addons/loaders/FontLoader.js');
            const { TextGeometry } = await import('three/addons/geometries/TextGeometry.js');

            const canvas = document.createElement('canvas');
            canvas.id = 'hero-3d-canvas';
            stage.appendChild(canvas);

            const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            const scene = new THREE.Scene();
            scene.fog = new THREE.Fog(0x0a0c10, 8, 26);

            const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
            camera.position.set(0, 1.2, 9);
            camera.lookAt(0, 0, 0);

            /* 灯光：环境光 + 主光 + 霓虹绿/冷蓝点光，保证金属材质有反射层次 */
            scene.add(new THREE.AmbientLight(0x404060, 1.2));
            const key = new THREE.DirectionalLight(0xffffff, 2.0);
            key.position.set(3, 5, 4);
            scene.add(key);
            const neon = new THREE.PointLight(0x39ff6a, 12, 30);
            neon.position.set(-4, 2, 3);
            scene.add(neon);
            const blue = new THREE.PointLight(0x7da2ff, 12, 30);
            blue.position.set(4, -1, 2);
            scene.add(blue);

            /* 线框网格地面（GridHelper + Fog 实现透视消失于地平线） */
            const grid = new THREE.GridHelper(60, 60, 0x39ff6a, 0x14421f);
            grid.position.y = -2.2;
            scene.add(grid);

            /* 挤出金属立体字 */
            const font = await new FontLoader().loadAsync(FONT_URL);
            const geo = new TextGeometry('QRC-EYE', {
                font: font,
                size: 1.4,
                height: 0.4,
                curveSegments: 6,
                bevelEnabled: true,
                bevelThickness: 0.05,
                bevelSize: 0.04,
                bevelSegments: 3
            });
            geo.center();
            const mat = new THREE.MeshStandardMaterial({
                color: 0xd5d5dd,
                metalness: 0.95,
                roughness: 0.22
            });
            const logo = new THREE.Mesh(geo, mat);
            const tiltGroup = new THREE.Group();
            tiltGroup.add(logo);
            tiltGroup.position.y = 0.6;
            scene.add(tiltGroup);

            /* 交互：鼠标倾斜目标值 */
            let targetRX = 0;
            let targetRY = 0;
            window.addEventListener('mousemove', function (e) {
                targetRY = (e.clientX / window.innerWidth - 0.5) * 0.6;
                targetRX = (e.clientY / window.innerHeight - 0.5) * 0.3;
            });

            function resize() {
                const w = stage.clientWidth || 1;
                const h = stage.clientHeight || 1;
                renderer.setSize(w, h, false);
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
            }

            /* 先显示舞台再量尺寸（display:none 时 clientWidth 为 0） */
            stage.classList.add('hero-3d-on');
            if (fallback) fallback.classList.add('hero-title-hidden');
            resize();
            window.addEventListener('resize', resize);

            (function animate() {
                requestAnimationFrame(animate);
                const scroll = Math.min(1, window.scrollY / window.innerHeight);
                logo.rotation.y += 0.005;
                tiltGroup.rotation.x += (targetRX - tiltGroup.rotation.x) * 0.05;
                tiltGroup.rotation.y += (targetRY - tiltGroup.rotation.y) * 0.05;
                const scale = 1 - scroll * 0.5;
                tiltGroup.scale.set(scale, scale, scale);
                tiltGroup.position.y = 0.6 + scroll * 2;
                renderer.render(scene, camera);
            })();
        } catch (error) {
            QRC.handleError(error, 'hero3d.init');
            console.warn('hero3d: falling back to CSS static title');
            cleanup(stage, fallback);
        }
    }

    return { init: init };
})();

document.addEventListener('DOMContentLoaded', function () {
    QRC.hero3d.init().catch(function (error) {
        QRC.handleError(error, 'hero3d DOMContentLoaded');
    });
});
