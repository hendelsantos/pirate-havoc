import { Application } from 'pixi.js';
import { assetManager } from '../assets/AssetManager';
import type { GameConfig } from '../config/gameConfig';
import { InputController } from '../input/InputController';
import { GameRenderer } from '../rendering/GameRenderer';
import type { ControlAction, GameEngineEvents, HudSnapshot, MatchResult, MatchState } from './types';

interface Projectile {
  readonly id: number;
  x: number;
  y: number;
  readonly vx: number;
  readonly vy: number;
  life: number;
}

const FIXED_STEP = 1 / 60;
const MAX_FRAME_DELTA = 0.25;
const ISLAND = { x: 640, y: 350, radius: 92 } as const;

function circlesOverlap(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const radii = ar + br;
  return dx * dx + dy * dy < radii * radii;
}

export class GameEngine {
  private readonly app = new Application();
  private readonly input = new InputController();
  private renderer: GameRenderer | undefined;
  private resizeObserver: ResizeObserver | undefined;
  private state: MatchState = 'LOADING';
  private appInitialized = false;
  private disposed = false;
  private accumulator = 0;
  private elapsedActive = 0;
  private score = 0;
  private health: number;
  private player = { x: 250, y: 360, rotation: Math.PI / 2 };
  private projectiles: Projectile[] = [];
  private nextProjectileId = 1;
  private fireCooldown = 0;
  private lastHudKey = '';
  private pauseReason: HudSnapshot['pauseReason'];
  private matchId = crypto.randomUUID();

  constructor(
    private readonly host: HTMLElement,
    private readonly config: GameConfig,
    private readonly events: GameEngineEvents,
  ) {
    this.health = config.player.maxHealth;
  }

  async initialize(): Promise<void> {
    try {
      this.events.onLoadProgress(0, 'Preparing the waters');
      const textures = await assetManager.load(this.events.onLoadProgress);
      if (this.disposed) return;
      await this.app.init({
        resizeTo: this.host,
        backgroundColor: 0x031923,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      });
      this.appInitialized = true;
      if (this.disposed) {
        this.app.destroy(true);
        return;
      }
      this.app.canvas.setAttribute('aria-label', 'Pirate Havoc naval battle arena');
      this.app.canvas.setAttribute('role', 'img');
      this.host.appendChild(this.app.canvas);
      this.renderer = new GameRenderer(this.config, textures);
      this.renderer.createPlayer();
      this.app.stage.addChild(this.renderer.root);
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.host);
      this.resize();
      this.input.mount(() => this.togglePause());
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('blur', this.handleFocusLoss);
      this.app.ticker.add(this.tick);
      this.state = 'PLAYING';
      this.emitHud(true);
    } catch (error) {
      if (!this.disposed) this.events.onLoadError(error instanceof Error ? error : new Error('Unknown asset loading failure'));
    }
  }

  private readonly tick = (): void => {
    if (this.disposed || this.state !== 'PLAYING') return;
    const frameSeconds = Math.min(this.app.ticker.deltaMS / 1000, MAX_FRAME_DELTA);
    this.accumulator += frameSeconds;
    while (this.accumulator >= FIXED_STEP) {
      this.update(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
      if (this.state !== 'PLAYING') break;
    }
  };

  private update(dt: number): void {
    this.elapsedActive += dt;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    const rotationDirection = Number(this.input.isActive('right')) - Number(this.input.isActive('left'));
    this.player.rotation += rotationDirection * this.config.player.rotationSpeed * dt;
    const moving = this.input.isActive('forward');
    if (moving) {
      const nextX = this.player.x + Math.sin(this.player.rotation) * this.config.player.speed * dt;
      const nextY = this.player.y - Math.cos(this.player.rotation) * this.config.player.speed * dt;
      if (!circlesOverlap(nextX, nextY, this.config.player.radius, ISLAND.x, ISLAND.y, ISLAND.radius)) {
        this.player.x = Math.min(this.config.arena.width - this.config.player.radius, Math.max(this.config.player.radius, nextX));
        this.player.y = Math.min(this.config.arena.height - this.config.player.radius, Math.max(this.config.player.radius, nextY));
      }
    }

    if (this.input.isActive('fireFront') && this.fireCooldown === 0) this.fireFront();
    this.renderer?.updatePlayer(this.player.x, this.player.y, this.player.rotation, moving);
    this.updateProjectiles(dt);

    if (this.elapsedActive >= this.config.matchDurationSeconds) this.finish('TIME_EXPIRED');
    this.emitHud();
  }

  private fireFront(): void {
    this.fireCooldown = this.config.projectile.frontCooldownSeconds;
    const directionX = Math.sin(this.player.rotation);
    const directionY = -Math.cos(this.player.rotation);
    const muzzleDistance = 52;
    const projectile: Projectile = {
      id: this.nextProjectileId,
      x: this.player.x + directionX * muzzleDistance,
      y: this.player.y + directionY * muzzleDistance,
      vx: directionX * this.config.projectile.speed,
      vy: directionY * this.config.projectile.speed,
      life: this.config.projectile.lifetimeSeconds,
    };
    this.nextProjectileId += 1;
    this.projectiles.push(projectile);
    this.renderer?.addProjectile(projectile.id);
    this.renderer?.addMuzzleFlash(projectile.x, projectile.y);
  }

  private updateProjectiles(dt: number): void {
    const survivors: Projectile[] = [];
    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;
      const outside = projectile.x < 0 || projectile.x > this.config.arena.width || projectile.y < 0 || projectile.y > this.config.arena.height;
      const hitIsland = circlesOverlap(projectile.x, projectile.y, this.config.projectile.radius, ISLAND.x, ISLAND.y, ISLAND.radius);
      if (projectile.life <= 0 || outside || hitIsland) {
        this.renderer?.removeProjectile(projectile.id);
      } else {
        this.renderer?.updateProjectile(projectile.id, projectile.x, projectile.y);
        survivors.push(projectile);
      }
    }
    this.projectiles = survivors;
  }

  setControl(action: ControlAction, active: boolean): void {
    this.input.setAction(action, active);
  }

  togglePause(): void {
    if (this.state === 'PLAYING') this.pause('MANUAL');
    else if (this.state === 'PAUSED') this.resume();
  }

  pause(reason: NonNullable<HudSnapshot['pauseReason']>): void {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.pauseReason = reason;
    this.input.clear();
    this.accumulator = 0;
    this.emitHud(true);
  }

  resume(): void {
    if (this.state !== 'PAUSED' || document.hidden) return;
    this.state = 'PLAYING';
    this.pauseReason = undefined;
    this.accumulator = 0;
    this.emitHud(true);
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) this.pause('FOCUS_LOST');
  };

  private readonly handleFocusLoss = (): void => this.pause('FOCUS_LOST');

  private finish(endReason: MatchResult['endReason']): void {
    if (this.state === 'GAME_OVER') return;
    this.state = 'GAME_OVER';
    this.input.clear();
    this.emitHud(true);
    this.events.onMatchEnd({
      matchId: this.matchId,
      score: this.score,
      activeDurationSeconds: Math.min(this.elapsedActive, this.config.matchDurationSeconds),
      endReason,
      completedAt: new Date().toISOString(),
      config: this.config,
    });
  }

  private emitHud(force = false): void {
    const snapshot: HudSnapshot = {
      state: this.state,
      health: this.health,
      maxHealth: this.config.player.maxHealth,
      score: this.score,
      remainingSeconds: Math.max(0, Math.ceil(this.config.matchDurationSeconds - this.elapsedActive)),
      projectileCount: this.projectiles.length,
      ...(this.pauseReason ? { pauseReason: this.pauseReason } : {}),
    };
    const key = `${snapshot.state}:${snapshot.health}:${snapshot.score}:${snapshot.remainingSeconds}:${snapshot.projectileCount}:${snapshot.pauseReason ?? ''}`;
    if (!force && key === this.lastHudKey) return;
    this.lastHudKey = key;
    this.events.onHudChange(snapshot);
  }

  private resize(): void {
    this.renderer?.resize(this.host.clientWidth, this.host.clientHeight);
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.state = 'GAME_OVER';
    this.input.unmount();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleFocusLoss);
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    if (!this.appInitialized) return;
    this.app.ticker.remove(this.tick);
    this.renderer?.destroy();
    this.renderer = undefined;
    this.app.destroy(true, { children: true });
    this.appInitialized = false;
    this.projectiles = [];
  }
}

