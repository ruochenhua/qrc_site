import Phaser from 'phaser';
import mapUrl from '../../maps/workshop-town.json?url';
import landmarksUrl from '../../art/landmarks.png?url';
import playerUrl from '../../art/player.png?url';
import tilesUrl from '../../art/world-tiles.png?url';
import projectManifest from '../projects/manifest.json';
import spriteRegistry from '../projects/sprite-registry.json';
import activityIds from '../projects/activity-ids.json';
import type { ProjectManifestEntry, ProjectMapAnchor } from '../projects/project-types';
import { validateProjectWorld } from '../projects/project-validation.mjs';
import { facingFromVector, normalizeMoveVector, type Facing } from '../world/movement';
import { readTiledProperty, type WorldMapObject } from '../world/map-validation';

interface WorldKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

interface PointOfInterest {
  id: string;
  label: string;
  x: number;
  y: number;
}

const WALK_SPEED = 104;
const INTERACTION_DISTANCE = 72;
const PLAYER_IDLE_FRAME: Record<Facing, number> = { down: 1, left: 4, right: 7, up: 10 };
const WALK_ANIMATION: Record<Facing, string> = {
  down: 'player-walk-down',
  left: 'player-walk-left',
  right: 'player-walk-right',
  up: 'player-walk-up',
};
const projects = projectManifest as ProjectManifestEntry[];
const projectsById = new Map(projects.map((project) => [project.id, project]));

export class WorldScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private controls?: WorldKeys;
  private interactKey?: Phaser.Input.Keyboard.Key;
  private confirmKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private points: PointOfInterest[] = [];
  private facing: Facing = 'down';
  private nearbyId: string | null = null;
  private hoveredId: string | null = null;
  private hint?: Phaser.GameObjects.Text;
  private reducedMotion = false;
  private preloadFailed = false;

  constructor() {
    super('world');
  }

  preload(): void {
    this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.preloadFailed = true;
      this.dispatch('error', { asset: file.key });
    });
    this.load.tilemapTiledJSON('workshop-town', mapUrl);
    this.load.image('world-tiles', tilesUrl);
    this.load.spritesheet('player', playerUrl, { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('landmarks', landmarksUrl, { frameWidth: 96, frameHeight: 80 });
  }

  create(): void {
    if (this.preloadFailed) return;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const map = this.make.tilemap({ key: 'workshop-town' });
    const objects = map.getObjectLayer('Objects')?.objects ?? [];
    const anchors: ProjectMapAnchor[] = objects
      .filter((object) => object.type === 'project-anchor')
      .map((object) => ({
        name: object.name ?? '',
        projectId: String(readTiledProperty(object as unknown as WorldMapObject, 'projectId') ?? ''),
        x: object.x ?? 0,
        y: object.y ?? 0,
      }));
    const manifestErrors = validateProjectWorld(
      projects,
      anchors,
      spriteRegistry,
      activityIds,
      undefined,
      { width: map.widthInPixels, height: map.heightInPixels },
    );
    if (manifestErrors.length > 0) {
      this.dispatch('error', { asset: 'project-manifest', errors: manifestErrors });
      return;
    }
    const tileset = map.addTilesetImage('world-tiles', 'world-tiles', 16, 16, 0, 0);
    if (!tileset) {
      this.dispatch('error', { asset: 'world-tiles' });
      return;
    }

    const ground = map.createLayer('Ground', tileset, 0, 0, false) as Phaser.Tilemaps.TilemapLayer;
    const details = map.createLayer('Details', tileset, 0, 0, false) as Phaser.Tilemaps.TilemapLayer;
    const blockers = map.createLayer('Blockers', tileset, 0, 0, false) as Phaser.Tilemaps.TilemapLayer;
    ground.setDepth(0);
    details.setDepth(1);
    blockers.setDepth(2);
    map.setCollisionByProperty({ solid: true }, true, false, ground);
    map.setCollisionByProperty({ solid: true }, true, false, blockers);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    const spawn = map.getObjectLayer('Objects')?.objects.find((object) => object.type === 'player-spawn');
    if (!spawn) {
      this.dispatch('error', { asset: 'player-spawn' });
      return;
    }

    this.createAnimations();
    this.createLandmarks(objects);
    const spawnX = spawn.x ?? 0;
    const spawnY = spawn.y ?? 0;
    this.player = this.physics.add.sprite(spawnX, spawnY - 12, 'player', PLAYER_IDLE_FRAME[this.facing]);
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(this.player.y + 1);
    this.player.setCollideWorldBounds(true);
    this.player.body?.setSize(10, 8);
    this.player.body?.setOffset(3, 15);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, blockers);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      const keys = keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      }, false) as WorldKeys;
      const arrows = keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      }, false) as WorldKeys;
      this.controls = {
        up: { isDown: false } as Phaser.Input.Keyboard.Key,
        down: { isDown: false } as Phaser.Input.Keyboard.Key,
        left: { isDown: false } as Phaser.Input.Keyboard.Key,
        right: { isDown: false } as Phaser.Input.Keyboard.Key,
      };
      this.controls.up = this.combineKeyState(keys.up, arrows.up);
      this.controls.down = this.combineKeyState(keys.down, arrows.down);
      this.controls.left = this.combineKeyState(keys.left, arrows.left);
      this.controls.right = this.combineKeyState(keys.right, arrows.right);
      this.interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E, false);
      this.confirmKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER, false);
      this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC, false);
    }
    this.game.canvas?.setAttribute('tabindex', '0');
    this.game.canvas?.setAttribute('aria-label', '俯视角像素小镇。使用 WASD 或方向键移动，E 或 Enter 互动。');

    this.hint = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#fff2c7',
      backgroundColor: '#203b3c',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 1).setDepth(100_000).setVisible(false);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.setRoundPixels(true);
    const host = this.game.canvas?.parentElement;
    if (host?.dataset.worldFitMap === 'true') {
      const fitCamera = () => {
        camera.setZoom(Math.max(
          this.scale.width / map.widthInPixels,
          this.scale.height / map.heightInPixels,
        ));
      };
      fitCamera();
      this.scale.on(Phaser.Scale.Events.RESIZE, fitCamera);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.scale.off(Phaser.Scale.Events.RESIZE, fitCamera);
      });
    }
    camera.startFollow(this.player, true, this.reducedMotion ? 1 : 0.14, this.reducedMotion ? 1 : 0.14);
    camera.setBackgroundColor('#355547');

    this.dispatch('ready', {
      width: map.widthInPixels,
      height: map.heightInPixels,
      anchorCount: this.points.length,
      reducedMotion: this.reducedMotion,
    });
    this.publishPlayerState();
  }

  update(): void {
    const player = this.player;
    const controls = this.controls;
    if (!player || !controls || !player.body) return;

    if (this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.dispatch('close', {});
    }

    const inputAllowed = !this.isEditingDomField();
    const horizontal = inputAllowed ? Number(controls.right.isDown) - Number(controls.left.isDown) : 0;
    const vertical = inputAllowed ? Number(controls.down.isDown) - Number(controls.up.isDown) : 0;
    const vector = normalizeMoveVector(horizontal, vertical);
    const moving = vector.x !== 0 || vector.y !== 0;

    player.setVelocity(vector.x * WALK_SPEED, vector.y * WALK_SPEED);
    if (moving) {
      this.facing = facingFromVector(vector.x, vector.y, this.facing);
      player.anims.play(WALK_ANIMATION[this.facing], true);
    } else {
      player.anims.stop();
      player.setFrame(PLAYER_IDLE_FRAME[this.facing]);
    }
    player.setDepth(player.y + 1);

    const nearestPoint = this.findNearestPoint(player.x, player.y + 10);
    const nearby = nearestPoint
      && Phaser.Math.Distance.Between(player.x, player.y + 10, nearestPoint.x, nearestPoint.y) <= INTERACTION_DISTANCE
      ? nearestPoint
      : undefined;
    const selected = this.points.find((point) => point.id === this.hoveredId) ?? nearby;
    if (nearby?.id !== this.nearbyId) {
      this.nearbyId = nearby?.id ?? null;
      this.dispatch('nearby', this.nearbyId ? { id: nearby?.id, label: nearby?.label } : { id: null });
    }
    if (selected && this.hint) {
      this.hint.setText(`E 查看 · ${selected.label}`);
      this.hint.setPosition(selected.x, selected.y - 76).setVisible(true);
    } else if (this.hint) {
      this.hint.setVisible(false);
    }

    const activate = inputAllowed && (
      (this.interactKey ? Phaser.Input.Keyboard.JustDown(this.interactKey) : false)
      || (this.confirmKey ? Phaser.Input.Keyboard.JustDown(this.confirmKey) : false)
    );
    if (activate && nearby && Phaser.Math.Distance.Between(player.x, player.y + 10, nearby.x, nearby.y) <= INTERACTION_DISTANCE) {
      this.dispatch('select', { id: nearby.id, label: nearby.label, source: 'keyboard' });
    }

    this.publishPlayerState();
  }

  private combineKeyState(
    first: Phaser.Input.Keyboard.Key,
    second: Phaser.Types.Input.Keyboard.CursorKeys[keyof Phaser.Types.Input.Keyboard.CursorKeys],
  ): Phaser.Input.Keyboard.Key {
    return {
      get isDown() { return first.isDown || second.isDown; },
    } as Phaser.Input.Keyboard.Key;
  }

  private createAnimations(): void {
    const sequences: Array<[Facing, number]> = [
      ['down', 0],
      ['left', 3],
      ['right', 6],
      ['up', 9],
    ];
    for (const [facing, firstFrame] of sequences) {
      this.anims.create({
        key: WALK_ANIMATION[facing],
        frames: this.anims.generateFrameNumbers('player', { frames: [firstFrame, firstFrame + 1, firstFrame + 2, firstFrame + 1] }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  private createLandmarks(objects: Phaser.Types.Tilemaps.TiledObject[]): void {
    for (const rawObject of objects) {
      if (rawObject.type !== 'project-anchor' && rawObject.type !== 'scenery') continue;
      const object = rawObject as unknown as WorldMapObject;
      const id = String(readTiledProperty(object, 'projectId') ?? rawObject.name);
      const project = projectsById.get(id);
      if (rawObject.type === 'project-anchor' && !project) continue;
      const frame = project ? spriteRegistry[project.spriteKey as keyof typeof spriteRegistry] : Number(readTiledProperty(object, 'spriteFrame') ?? 0);
      const label = project?.title ?? String(readTiledProperty(object, 'label') ?? rawObject.name);
      const x = rawObject.x ?? 0;
      const y = rawObject.y ?? 0;
      const image = this.add.image(x, y, 'landmarks', frame)
        .setOrigin(0.5, 1)
        .setDepth(y);
      if (rawObject.type !== 'project-anchor') continue;
      const hitArea = project?.hitArea ?? { x: 8, y: 6, width: 80, height: 68 };
      image.setInteractive(new Phaser.Geom.Rectangle(hitArea.x, hitArea.y, hitArea.width, hitArea.height), Phaser.Geom.Rectangle.Contains);
      image.on('pointerover', () => { this.hoveredId = id; });
      image.on('pointerout', () => { if (this.hoveredId === id) this.hoveredId = null; });
      image.on('pointerdown', () => this.dispatch('select', { id, label, source: 'pointer' }));
      this.points.push({ id, label, x, y });
    }
  }

  private findNearestPoint(x: number, y: number): PointOfInterest | undefined {
    let nearest: PointOfInterest | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const point of this.points) {
      const distance = Phaser.Math.Distance.Between(x, y, point.x, point.y);
      if (distance < nearestDistance) {
        nearest = point;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  private isEditingDomField(): boolean {
    const active = document.activeElement;
    if (active === this.game.canvas) return false;
    return active instanceof HTMLElement && (
      active.isContentEditable
      || active.matches('input, textarea, select, button, a, [role="textbox"], [role="button"], [tabindex]:not([tabindex="-1"])')
    );
  }

  private publishPlayerState(): void {
    if (!this.player) return;
    const host = this.game.canvas?.parentElement;
    if (!host || host.dataset.worldDebug !== 'true') return;
    host.dataset.playerX = String(Math.round(this.player.x));
    host.dataset.playerY = String(Math.round(this.player.y));
    host.dataset.playerFacing = this.facing;
    host.dataset.playerMoving = String((this.player.body?.velocity.length() ?? 0) > 0);
    host.dataset.playerFrame = String(this.player.frame.name);
    host.dataset.cameraX = String(Math.round(this.cameras.main.scrollX));
    host.dataset.cameraY = String(Math.round(this.cameras.main.scrollY));
  }

  private dispatch(type: string, detail: Record<string, unknown>): void {
    const host = this.game.canvas?.parentElement;
    if (!host) return;
    host.dispatchEvent(new CustomEvent(`qrc-world:${type}`, { detail, bubbles: true }));
  }
}
