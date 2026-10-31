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
  readonly owner: 'PLAYER' | 'ENEMY';
  readonly damage: number;
  life: number;
}

interface Enemy {
  readonly id: number;
  readonly kind: 'CHASER' | 'SHOOTER';
  x: number;
  y: number;
  rotation: number;
  health: number;
  readonly maxHealth: number;
  fireCooldown: number;
  destroyed: boolean;
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

function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function rotateToward(current: number, target: number, maxStep: number): number {
  const difference = normalizeAngle(target - current);
  return current + Math.max(-maxStep, Math.min(maxStep, difference));
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
  private enemies: Enemy[] = [];
  private nextProjectileId = 1;
  private nextEnemyId = 1;
  private fireCooldown = 0;
  private broadsideCooldown = 0;
  private spawnCooldown = 0.8;
  private impactCooldown = 0;
  private randomState = 0x5ea1c0de;
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
    this.broadsideCooldown = Math.max(0, this.broadsideCooldown - dt);
    this.spawnCooldown -= dt;
    this.impactCooldown = Math.max(0, this.impactCooldown - dt);
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
    if (this.input.isActive('fireLeft') && this.broadsideCooldown === 0) this.fireBroadside(-1);
    if (this.input.isActive('fireRight') && this.broadsideCooldown === 0) this.fireBroadside(1);
    this.renderer?.updatePlayer(this.player.x, this.player.y, this.player.rotation, moving);
    if (this.spawnCooldown <= 0) {
      this.spawnEnemy();
      this.spawnCooldown = this.config.enemySpawnIntervalSeconds;
    }
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.cleanupDestroyedEnemies();

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
      owner: 'PLAYER',
      damage: this.config.projectile.damage,
      life: this.config.projectile.lifetimeSeconds,
    };
    this.nextProjectileId += 1;
    this.projectiles.push(projectile);
    this.renderer?.addProjectile(projectile.id, false);
    this.renderer?.addMuzzleFlash(projectile.x, projectile.y);
  }

  private fireBroadside(side: -1 | 1): void {
    this.broadsideCooldown = this.config.projectile.broadsideCooldownSeconds;
    const sideAngle = this.player.rotation + side * (Math.PI / 2);
    const directionX = Math.sin(sideAngle);
    const directionY = -Math.cos(sideAngle);
    const forwardX = Math.sin(this.player.rotation);
    const forwardY = -Math.cos(this.player.rotation);
    for (const offset of [-24, 0, 24]) {
      const projectile: Projectile = {
        id: this.nextProjectileId,
        x: this.player.x + directionX * 34 + forwardX * offset,
        y: this.player.y + directionY * 34 + forwardY * offset,
        vx: directionX * this.config.projectile.speed,
        vy: directionY * this.config.projectile.speed,
        owner: 'PLAYER',
        damage: this.config.projectile.damage,
        life: this.config.projectile.lifetimeSeconds,
      };
      this.nextProjectileId += 1;
      this.projectiles.push(projectile);
      this.renderer?.addProjectile(projectile.id, false);
      this.renderer?.addMuzzleFlash(projectile.x, projectile.y);
    }
  }

  private fireEnemy(enemy: Enemy): void {
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const projectile: Projectile = {
      id: this.nextProjectileId,
      x: enemy.x + (dx / length) * 42,
      y: enemy.y + (dy / length) * 42,
      vx: (dx / length) * this.config.projectile.speed * 0.72,
      vy: (dy / length) * this.config.projectile.speed * 0.72,
      owner: 'ENEMY',
      damage: this.config.enemies.shooter.projectileDamage,
      life: this.config.projectile.lifetimeSeconds * 1.25,
    };
    this.nextProjectileId += 1;
    this.projectiles.push(projectile);
    this.renderer?.addProjectile(projectile.id, true);
    this.renderer?.addMuzzleFlash(projectile.x, projectile.y);
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (enemy.destroyed) continue;
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const targetAngle = Math.atan2(dx, -dy);
      const tuning = enemy.kind === 'CHASER' ? this.config.enemies.chaser : this.config.enemies.shooter;
      enemy.rotation = rotateToward(enemy.rotation, targetAngle, tuning.rotationSpeed * dt);
      enemy.fireCooldown = Math.max(0, enemy.fireCooldown - dt);

      let moveDirection = 1;
      if (enemy.kind === 'SHOOTER' && distance < this.config.enemies.shooter.preferredRange - 55) moveDirection = -0.55;
      const shouldMove = enemy.kind === 'CHASER' || distance > this.config.enemies.shooter.preferredRange + 35 || moveDirection < 0;
      if (shouldMove) {
        const nextX = enemy.x + Math.sin(enemy.rotation) * tuning.speed * moveDirection * dt;
        const nextY = enemy.y - Math.cos(enemy.rotation) * tuning.speed * moveDirection * dt;
        if (this.canShipOccupy(nextX, nextY, tuning.radius)) {
          enemy.x = nextX;
          enemy.y = nextY;
        } else {
          enemy.rotation += enemy.id % 2 === 0 ? 0.08 : -0.08;
        }
      }

      if (enemy.kind === 'SHOOTER' && distance <= this.config.enemies.shooter.attackRange && enemy.fireCooldown === 0) {
        this.fireEnemy(enemy);
        enemy.fireCooldown = this.config.enemies.shooter.fireCooldownSeconds;
      }

      const collisionRadius = tuning.radius + this.config.player.radius;
      if (distance < collisionRadius) {
        if (enemy.kind === 'CHASER') {
          this.damagePlayer(this.config.enemies.chaser.impactDamage);
          enemy.destroyed = true;
        } else if (this.impactCooldown === 0) {
          this.damagePlayer(6);
          this.impactCooldown = 0.75;
          enemy.x -= (dx / distance) * 18;
          enemy.y -= (dy / distance) * 18;
        }
      }
      this.renderer?.updateEnemy(enemy.id, enemy.x, enemy.y, enemy.rotation);
    }
  }

  private updateProjectiles(dt: number): void {
    const survivors: Projectile[] = [];
    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;
      const outside = projectile.x < 0 || projectile.x > this.config.arena.width || projectile.y < 0 || projectile.y > this.config.arena.height;
      const hitIsland = circlesOverlap(projectile.x, projectile.y, this.config.projectile.radius, ISLAND.x, ISLAND.y, ISLAND.radius);
      let hitTarget = false;
      if (!outside && !hitIsland && projectile.owner === 'PLAYER') {
        for (const enemy of this.enemies) {
          if (enemy.destroyed) continue;
          const radius = enemy.kind === 'CHASER' ? this.config.enemies.chaser.radius : this.config.enemies.shooter.radius;
          if (!circlesOverlap(projectile.x, projectile.y, this.config.projectile.radius, enemy.x, enemy.y, radius)) continue;
          enemy.health = Math.max(0, enemy.health - projectile.damage);
          this.renderer?.setEnemyHealth(enemy.id, enemy.health, enemy.maxHealth);
          if (enemy.health === 0) {
            enemy.destroyed = true;
            this.score += 1;
          }
          hitTarget = true;
          break;
        }
      } else if (!outside && !hitIsland && projectile.owner === 'ENEMY') {
        if (circlesOverlap(projectile.x, projectile.y, this.config.projectile.radius, this.player.x, this.player.y, this.config.player.radius)) {
          this.damagePlayer(projectile.damage);
          hitTarget = true;
        }
      }
      if (projectile.life <= 0 || outside || hitIsland || hitTarget) {
        this.renderer?.removeProjectile(projectile.id);
      } else {
        this.renderer?.updateProjectile(projectile.id, projectile.x, projectile.y);
        survivors.push(projectile);
      }
    }
    this.projectiles = survivors;
  }

  private damagePlayer(amount: number): void {
    if (this.state !== 'PLAYING' || this.health <= 0) return;
    this.health = Math.max(0, this.health - amount);
    this.renderer?.setHealth(this.health, this.config.player.maxHealth);
    if (this.health === 0) this.finish('PLAYER_DESTROYED');
  }

  private canShipOccupy(x: number, y: number, radius: number): boolean {
    return x >= radius && x <= this.config.arena.width - radius
      && y >= radius && y <= this.config.arena.height - radius
      && !circlesOverlap(x, y, radius, ISLAND.x, ISLAND.y, ISLAND.radius);
  }

  private random(): number {
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return this.randomState / 0x1_0000_0000;
  }

  private spawnEnemy(): void {
    const kind: Enemy['kind'] = this.nextEnemyId % 2 === 1 ? 'CHASER' : 'SHOOTER';
    const tuning = kind === 'CHASER' ? this.config.enemies.chaser : this.config.enemies.shooter;
    let spawnX = tuning.radius;
    let spawnY = tuning.radius;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const edge = Math.floor(this.random() * 4);
      if (edge === 0 || edge === 1) {
        spawnX = edge === 0 ? tuning.radius + 18 : this.config.arena.width - tuning.radius - 18;
        spawnY = 70 + this.random() * (this.config.arena.height - 140);
      } else {
        spawnX = 70 + this.random() * (this.config.arena.width - 140);
        spawnY = edge === 2 ? tuning.radius + 18 : this.config.arena.height - tuning.radius - 18;
      }
      const farFromPlayer = Math.hypot(spawnX - this.player.x, spawnY - this.player.y) >= this.config.enemies.spawnDistanceFromPlayer;
      if (farFromPlayer && this.canShipOccupy(spawnX, spawnY, tuning.radius)) break;
    }
    const enemy: Enemy = {
      id: this.nextEnemyId,
      kind,
      x: spawnX,
      y: spawnY,
      rotation: Math.atan2(this.player.x - spawnX, -(this.player.y - spawnY)),
      health: tuning.maxHealth,
      maxHealth: tuning.maxHealth,
      fireCooldown: kind === 'SHOOTER' ? 0.5 : 0,
      destroyed: false,
    };
    this.nextEnemyId += 1;
    this.enemies.push(enemy);
    this.renderer?.addEnemy(enemy.id, enemy.kind, enemy.maxHealth);
    this.renderer?.updateEnemy(enemy.id, enemy.x, enemy.y, enemy.rotation);
  }

  private cleanupDestroyedEnemies(): void {
    const survivors: Enemy[] = [];
    for (const enemy of this.enemies) {
      if (enemy.destroyed) this.renderer?.removeEnemy(enemy.id, true);
      else survivors.push(enemy);
    }
    this.enemies = survivors;
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
      enemyCount: this.enemies.length,
      ...(this.pauseReason ? { pauseReason: this.pauseReason } : {}),
    };
    const key = `${snapshot.state}:${snapshot.health}:${snapshot.score}:${snapshot.remainingSeconds}:${snapshot.projectileCount}:${snapshot.enemyCount}:${snapshot.pauseReason ?? ''}`;
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
    this.enemies = [];
  }
}

