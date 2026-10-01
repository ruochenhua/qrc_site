import type { ActivityModule } from '../projects/activity-router';

export const miniFireworksActivity: ActivityModule = {
  mount(container, options) {
    const root = document.createElement('section');
    root.className = 'qrc-firework-preview';
    root.setAttribute('aria-labelledby', 'qrc-firework-preview-title');

    const title = document.createElement('h3');
    title.id = 'qrc-firework-preview-title';
    title.textContent = '烟花试放';

    const description = document.createElement('p');
    description.textContent = '点亮一枚暖金色的像素烟花。声音默认关闭。';

    const stage = document.createElement('div');
    stage.className = 'qrc-firework-preview__stage';
    stage.setAttribute('aria-hidden', 'true');
    const burst = document.createElement('span');
    burst.className = 'qrc-firework-preview__burst';
    stage.append(burst);

    const message = document.createElement('p');
    message.className = 'qrc-firework-preview__message';
    message.setAttribute('role', 'status');
    message.textContent = options.reducedMotion ? '减少动态效果已开启；点击后会显示静态烟花。' : '准备好了。';

    const launch = document.createElement('button');
    launch.className = 'qrc-world-button qrc-world-button--primary';
    launch.type = 'button';
    launch.textContent = '点亮一枚';

    const back = document.createElement('button');
    back.className = 'qrc-world-button';
    back.type = 'button';
    back.textContent = '返回项目介绍';

    const timers = new Set<number>();
    const launchFirework = () => {
      burst.classList.remove('is-launched');
      if (!options.reducedMotion) {
        // Force the CSS animation to restart for repeated launches.
        void burst.offsetWidth;
        burst.classList.add('is-launched');
      }
      message.textContent = options.reducedMotion ? '烟花已静态点亮。' : '烟花升空，在夜色里绽开。';
      const timer = window.setTimeout(() => {
        burst.classList.remove('is-launched');
        timers.delete(timer);
      }, 1400);
      timers.add(timer);
    };
    launch.addEventListener('click', launchFirework);
    back.addEventListener('click', options.onExit);
    root.append(title, description, stage, message, launch, back);
    container.replaceChildren(root);

    return () => {
      launch.removeEventListener('click', launchFirework);
      back.removeEventListener('click', options.onExit);
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      container.replaceChildren();
    };
  },
};
