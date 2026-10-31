import type { NetworkScenario } from '../api/contracts';

const SCENARIO_KEY = 'pirate-havoc:network-scenario:v1';

export function getScenario(): NetworkScenario {
  return (localStorage.getItem(SCENARIO_KEY) as NetworkScenario | null) ?? 'success';
}

export function setScenario(scenario: NetworkScenario): void {
  localStorage.setItem(SCENARIO_KEY, scenario);
}

