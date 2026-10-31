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

interface OfficialAssetManifest {
  readonly files: readonly { readonly path: string; readonly extension: string }[];
}

const IMAGE_EXTENSION = /\.(png|webp|jpe?g|svg)$/i;

function pickOfficialAsset(paths: readonly string[], key: keyof GameTextures): string | undefined {
  const usable = paths.filter((path) => IMAGE_EXTENSION.test(path));
  const rules: Readonly<Record<keyof GameTextures, readonly RegExp[]>> = {
    playerShip: [/player[^/]*ship/i, /ship[^/]*(blue|player|1)/i, /(^|\/)ships?\//i],
    island: [/island/i, /(^|\/)tiles?\/[^/]*(land|sand)/i],
    cannonball: [/cannon.?ball/i, /projectile/i, /bullet/i],
  };
  const rejected = /(retina|reference|preview|sheet|atlas|damage|wreck|part|icon|button|hud|ui)/i;
  for (const rule of rules[key]) {
    const preferred = usable.find((path) => rule.test(path) && !rejected.test(path));
    if (preferred) return `/assets/official/${preferred}`;
  }
  return undefined;
}

export class AssetManager {
  private textures: GameTextures | undefined;
  private failureScenarioConsumed = false;

  private async resolveCatalog(): Promise<Record<keyof GameTextures, string>> {
    try {
      const response = await fetch('/assets/official/asset-manifest.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Official manifest returned ${response.status}`);
      const manifest = await response.json() as OfficialAssetManifest;
      const paths = manifest.files.map((file) => file.path);
      return {
        playerShip: pickOfficialAsset(paths, 'playerShip') ?? FALLBACK_ASSETS.playerShip,
        island: pickOfficialAsset(paths, 'island') ?? FALLBACK_ASSETS.island,
        cannonball: pickOfficialAsset(paths, 'cannonball') ?? FALLBACK_ASSETS.cannonball,
      };
    } catch {
      return { ...FALLBACK_ASSETS };
    }
  }

  async load(onProgress: (progress: number, label: string) => void): Promise<GameTextures> {
    if (this.textures) {
      onProgress(1, 'Assets ready');
      return this.textures;
    }

    if (new URLSearchParams(window.location.search).get('assetFailure') === '1' && !this.failureScenarioConsumed) {
      this.failureScenarioConsumed = true;
      throw new Error('Asset failure scenario enabled. Remove ?assetFailure=1 or retry after resetting the scenario.');
    }

    const catalog = await this.resolveCatalog();
    const entries = Object.entries(catalog) as Array<[keyof GameTextures, string]>;
    const loaded = {} as Record<keyof GameTextures, Texture>;
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (!entry) continue;
      const [key, url] = entry;
      onProgress(index / entries.length, `Loading ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      try {
        loaded[key] = await Assets.load<Texture>(url);
      } catch {
        loaded[key] = await Assets.load<Texture>(FALLBACK_ASSETS[key]);
      }
    }
    this.textures = loaded;
    onProgress(1, 'Ready to sail');
    return loaded;
  }
}

export const assetManager = new AssetManager();

