import type { PlayerIdentity } from './contracts';

const PLAYER_KEY = 'pirate-havoc:player:v1';

export function getPlayer(): PlayerIdentity {
  try {
    const stored = localStorage.getItem(PLAYER_KEY);
    if (stored) return JSON.parse(stored) as PlayerIdentity;
  } catch {
    // A new local identity is safer than blocking gameplay on corrupt storage.
  }
  const player: PlayerIdentity = { id: crypto.randomUUID(), name: 'Captain' };
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
  return player;
}

