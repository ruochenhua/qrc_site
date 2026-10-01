import Phaser from 'phaser';
import '../styles/world.css';
import { WorldScene } from '../scenes/WorldScene';
import { normalizeWorldOptions, type WorldOptions } from './world-options';
import { attachProjectDialog } from '../ui/project-dialog';

const mountedGames = new WeakMap<HTMLElement, Phaser.Game>();
const mountedProjectDialogs = new WeakMap<HTMLElement, () => void>();

export function mountWorld(host: HTMLElement, options: WorldOptions = {}): Phaser.Game {
  const existing = mountedGames.get(host);
  if (existing) return existing;

  host.classList.add('qrc-world-host');

  const viewport = normalizeWorldOptions(options);
  if (viewport.fitMapToViewport) host.dataset.worldFitMap = 'true';
  const detachProjectDialog = attachProjectDialog(host);
  try {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: viewport.width,
      height: viewport.height,
      backgroundColor: '#355547',
      scene: [WorldScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: false,
        pixelArt: true,
        roundPixels: true,
      },
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
          fps: 60,
          gravity: { x: 0, y: 0 },
        },
      },
      banner: false,
    });

    mountedGames.set(host, game);
    mountedProjectDialogs.set(host, detachProjectDialog);
    return game;
  } catch (error) {
    detachProjectDialog();
    delete host.dataset.worldFitMap;
    host.classList.remove('qrc-world-host');
    throw error;
  }
}

export function unmountWorld(host: HTMLElement): void {
  const game = mountedGames.get(host);
  mountedProjectDialogs.get(host)?.();
  mountedProjectDialogs.delete(host);
  if (!game) return;

  game.destroy(true);
  mountedGames.delete(host);
  delete host.dataset.worldFitMap;
  host.classList.remove('qrc-world-host');
}
