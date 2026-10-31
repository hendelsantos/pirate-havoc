import type { ControlAction } from '../core/types';

const KEY_MAP: Readonly<Record<string, ControlAction>> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'fireFront',
  KeyQ: 'fireLeft',
  KeyE: 'fireRight',
};

export class InputController {
  private readonly active = new Set<ControlAction>();
  private enabled = false;
  private onPauseRequest: (() => void) | undefined;

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled || (event.repeat && event.code === 'Escape')) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      this.onPauseRequest?.();
      return;
    }
    const action = KEY_MAP[event.code];
    if (!action) return;
    event.preventDefault();
    this.active.add(action);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const action = KEY_MAP[event.code];
    if (!action) return;
    event.preventDefault();
    this.active.delete(action);
  };

  private readonly handleBlur = (): void => this.clear();

  mount(onPauseRequest: () => void): void {
    if (this.enabled) return;
    this.enabled = true;
    this.onPauseRequest = onPauseRequest;
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp, { passive: false });
    window.addEventListener('blur', this.handleBlur);
  }

  unmount(): void {
    this.enabled = false;
    this.clear();
    this.onPauseRequest = undefined;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }

  isActive(action: ControlAction): boolean {
    return this.active.has(action);
  }

  setAction(action: ControlAction, active: boolean): void {
    if (!this.enabled) return;
    if (active) this.active.add(action);
    else this.active.delete(action);
  }

  clear(): void {
    this.active.clear();
  }
}

