import { Container, Graphics, Sprite, Text, TextStyle, type Texture } from 'pixi.js';
import type { GameConfig } from '../config/gameConfig';

interface PlayerView {
  readonly container: Container;
  readonly ship: Sprite;
  readonly healthFill: Graphics;
}

interface EnemyView {
  readonly container: Container;
  readonly ship: Sprite;
  readonly healthFill: Graphics;
}

export class GameRenderer {
  readonly root = new Container();
  readonly world = new Container();
  private readonly projectileLayer = new Container();
  private readonly projectileViews = new Map<number, Sprite>();
  private readonly enemyViews = new Map<number, EnemyView>();
  private playerView: PlayerView | undefined;

  constructor(
    private readonly config: GameConfig,
    private readonly textures: {
      readonly playerShip: Texture;
      readonly island: Texture;
      readonly cannonball: Texture;
    },
  ) {
    this.root.addChild(this.world);
    this.buildArena();
  }

  private buildArena(): void {
    const { width, height } = this.config.arena;
    const ocean = new Graphics()
      .rect(0, 0, width, height)
      .fill({ color: 0x0b6f83 })
      .rect(12, 12, width - 24, height - 24)
      .stroke({ color: 0x79d6d0, width: 3, alpha: 0.45 });
    this.world.addChild(ocean);

    const waveLayer = new Graphics();
    for (let y = 34; y < height; y += 54) {
      const offset = (y / 54) % 2 === 0 ? 0 : 42;
      for (let x = 20 + offset; x < width; x += 84) {
        waveLayer.moveTo(x, y).quadraticCurveTo(x + 10, y - 7, x + 20, y).quadraticCurveTo(x + 30, y + 7, x + 40, y);
      }
    }
    waveLayer.stroke({ color: 0xa8edf0, width: 2, alpha: 0.18 });
    this.world.addChild(waveLayer);

    const vignette = new Graphics().rect(0, 0, width, height).stroke({ color: 0x03141d, width: 32, alpha: 0.44 });
    this.world.addChild(vignette);

    const island = new Sprite(this.textures.island);
    island.anchor.set(0.5);
    island.position.set(640, 350);
    island.width = 230;
    island.height = 200;
    this.world.addChild(island);

    this.world.addChild(this.projectileLayer);
  }

  createPlayer(): void {
    const container = new Container();
    const wake = new Graphics().ellipse(0, 40, 25, 50).fill({ color: 0xd9ffff, alpha: 0.22 });
    const ship = new Sprite(this.textures.playerShip);
    ship.anchor.set(0.5);
    ship.width = 58;
    ship.height = 90;

    const barBack = new Graphics().roundRect(-34, -66, 68, 8, 4).fill({ color: 0x10212a, alpha: 0.9 });
    const healthFill = new Graphics();
    const label = new Text({ text: 'CAPTAIN', style: new TextStyle({ fill: 0xf7e5b2, fontSize: 11, fontWeight: '700', letterSpacing: 1 }) });
    label.anchor.set(0.5);
    label.position.set(0, -79);
    container.addChild(wake, ship, barBack, healthFill, label);
    this.world.addChild(container);
    this.playerView = { container, ship, healthFill };
    this.setHealth(100, 100);
  }

  updatePlayer(x: number, y: number, rotation: number, moving: boolean): void {
    const view = this.playerView;
    if (!view) return;
    view.container.position.set(x, y);
    view.ship.rotation = rotation;
    view.ship.alpha = moving ? 1 : 0.96;
  }

  setHealth(health: number, maxHealth: number): void {
    const view = this.playerView;
    if (!view) return;
    const ratio = Math.max(0, Math.min(1, health / maxHealth));
    const color = ratio > 0.55 ? 0x65d17a : ratio > 0.25 ? 0xf2b84b : 0xe74c3c;
    view.healthFill.clear().roundRect(-32, -64, 64 * ratio, 4, 2).fill(color);
    view.ship.tint = ratio < 0.35 ? 0xd59386 : 0xffffff;
  }

  addProjectile(id: number, hostile = false): void {
    const sprite = new Sprite(this.textures.cannonball);
    sprite.anchor.set(0.5);
    sprite.width = 16;
    sprite.height = 16;
    sprite.tint = hostile ? 0xff745f : 0xffffff;
    this.projectileLayer.addChild(sprite);
    this.projectileViews.set(id, sprite);
  }

  addEnemy(id: number, kind: 'CHASER' | 'SHOOTER', maxHealth: number): void {
    const container = new Container();
    const wake = new Graphics().ellipse(0, 35, 22, 44).fill({ color: 0xe4ffff, alpha: 0.16 });
    const ship = new Sprite(this.textures.playerShip);
    ship.anchor.set(0.5);
    ship.width = kind === 'CHASER' ? 52 : 62;
    ship.height = kind === 'CHASER' ? 80 : 94;
    ship.tint = kind === 'CHASER' ? 0xe16c4e : 0xa987d8;
    const barBack = new Graphics().roundRect(-30, -61, 60, 7, 3).fill({ color: 0x111b22, alpha: 0.92 });
    const healthFill = new Graphics();
    const label = new Text({
      text: kind === 'CHASER' ? 'CHASER' : 'GUNNER',
      style: new TextStyle({ fill: kind === 'CHASER' ? 0xffc0a8 : 0xe0caff, fontSize: 9, fontWeight: '700', letterSpacing: 1 }),
    });
    label.anchor.set(0.5);
    label.position.set(0, -72);
    container.addChild(wake, ship, barBack, healthFill, label);
    this.world.addChild(container);
    this.enemyViews.set(id, { container, ship, healthFill });
    this.setEnemyHealth(id, maxHealth, maxHealth);
  }

  updateEnemy(id: number, x: number, y: number, rotation: number): void {
    const view = this.enemyViews.get(id);
    if (!view) return;
    view.container.position.set(x, y);
    view.ship.rotation = rotation;
  }

  setEnemyHealth(id: number, health: number, maxHealth: number): void {
    const view = this.enemyViews.get(id);
    if (!view) return;
    const ratio = Math.max(0, Math.min(1, health / maxHealth));
    const color = ratio > 0.45 ? 0xe8b84c : 0xe45a49;
    view.healthFill.clear().roundRect(-28, -59, 56 * ratio, 3, 2).fill(color);
    view.ship.alpha = 0.68 + ratio * 0.32;
  }

  removeEnemy(id: number, explode: boolean): void {
    const view = this.enemyViews.get(id);
    if (!view) return;
    this.enemyViews.delete(id);
    const { x, y } = view.container.position;
    view.container.removeFromParent();
    view.container.destroy({ children: true });
    if (explode) this.addExplosion(x, y);
  }

  private addExplosion(x: number, y: number): void {
    const explosion = new Graphics()
      .circle(0, 0, 14).fill({ color: 0xfff0a1, alpha: 0.95 })
      .circle(0, 0, 8).fill({ color: 0xff6a32, alpha: 0.9 });
    explosion.position.set(x, y);
    this.world.addChild(explosion);
    let frames = 0;
    const animate = (): void => {
      frames += 1;
      explosion.scale.set(1 + frames * 0.22);
      explosion.alpha = Math.max(0, 1 - frames / 9);
      if (frames >= 9 || explosion.destroyed) {
        if (!explosion.destroyed) {
          explosion.removeFromParent();
          explosion.destroy();
        }
        return;
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  updateProjectile(id: number, x: number, y: number): void {
    this.projectileViews.get(id)?.position.set(x, y);
  }

  removeProjectile(id: number): void {
    const view = this.projectileViews.get(id);
    if (!view) return;
    this.projectileViews.delete(id);
    view.removeFromParent();
    view.destroy();
  }

  addMuzzleFlash(x: number, y: number): void {
    const flash = new Graphics().star(0, 0, 7, 18, 4).fill({ color: 0xffdb65, alpha: 0.9 });
    flash.position.set(x, y);
    this.world.addChild(flash);
    let frames = 0;
    const fade = (): void => {
      frames += 1;
      if (flash.destroyed) return;
      flash.scale.set(1 + frames * 0.1);
      flash.alpha -= 0.22;
      if (frames >= 4) {
        flash.removeFromParent();
        flash.destroy();
        return;
      }
      requestAnimationFrame(fade);
    };
    requestAnimationFrame(fade);
  }

  resize(viewWidth: number, viewHeight: number): void {
    const { width, height } = this.config.arena;
    const scale = Math.min(viewWidth / width, viewHeight / height);
    this.root.scale.set(scale);
    this.root.position.set((viewWidth - width * scale) / 2, (viewHeight - height * scale) / 2);
  }

  destroy(): void {
    this.projectileViews.clear();
    this.enemyViews.clear();
    this.root.destroy({ children: true });
  }
}

