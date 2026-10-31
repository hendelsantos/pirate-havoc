import type { ControlAction } from '../game/core/types';

interface TouchControlsProps {
  readonly onControl: (action: ControlAction, active: boolean) => void;
}

interface ControlButtonProps extends TouchControlsProps {
  readonly action: ControlAction;
  readonly label: string;
  readonly className?: string;
}

function ControlButton({ action, label, className = '', onControl }: ControlButtonProps) {
  return (
    <button
      className={`touchButton ${className}`}
      type="button"
      aria-label={label}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onControl(action, true);
      }}
      onPointerUp={() => onControl(action, false)}
      onPointerCancel={() => onControl(action, false)}
      onLostPointerCapture={() => onControl(action, false)}
    >
      {label}
    </button>
  );
}

export function TouchControls({ onControl }: TouchControlsProps) {
  return (
    <div className="touchControls" aria-label="Touch controls">
      <div className="touchCluster touchMovement">
        <ControlButton action="left" label="Turn left" onControl={onControl} />
        <ControlButton action="forward" label="Sail forward" className="forward" onControl={onControl} />
        <ControlButton action="right" label="Turn right" onControl={onControl} />
      </div>
      <div className="touchCluster touchWeapons">
        <ControlButton action="fireLeft" label="Left broadside" onControl={onControl} />
        <ControlButton action="fireFront" label="Fire forward" className="fire" onControl={onControl} />
        <ControlButton action="fireRight" label="Right broadside" onControl={onControl} />
      </div>
    </div>
  );
}

