import { Assets, Texture } from 'pixi.js';

export interface GameTextures {
  readonly playerShip: Texture;
  readonly island: Texture;
  readonly cannonball: Texture;
}

const FALLBACK_ASSETS = {
  playerShip: '/assets/fallback/player-ship.svg',
  island: '/assets/fallback/island.svg',
  cannonball: '/assets/fallback/cannonball.svg',
} as const;

export class AssetManager {
  private textures: GameTextures | undefined;

  async load(onProgress: (progress: number, label: string) => void): Promise<GameTextures> {
    if (this.textures) {
      onProgress(1, 'Assets ready');
      return this.textures;
    }

    if (new URLSearchParams(window.location.search).get('assetFailure') === '1') {
      throw new Error('Asset failure scenario enabled. Remove ?assetFailure=1 or retry after resetting the scenario.');
    }

    const entries = Object.entries(FALLBACK_ASSETS) as Array<[keyof GameTextures, string]>;
    const loaded = {} as Record<keyof GameTextures, Texture>;
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (!entry) continue;
      const [key, url] = entry;
      onProgress(index / entries.length, `Loading ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      loaded[key] = await Assets.load<Texture>(url);
    }
    this.textures = loaded;
    onProgress(1, 'Ready to sail');
    return loaded;
  }
}

export const assetManager = new AssetManager();

