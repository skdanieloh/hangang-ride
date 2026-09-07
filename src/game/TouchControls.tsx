import { useState, type MutableRefObject } from "react";
import type { ControlState } from "./useControls";

const BUTTONS: { key: keyof ControlState; label: string; extra?: string }[] = [
  { key: "left", label: "←", extra: "좌" },
  { key: "right", label: "→", extra: "우" },
  { key: "back", label: "↓", extra: "뒤" },
  { key: "forward", label: "↑", extra: "앞" },
];

export function TouchControls({
  controls,
  canDrift = false,
}: {
  controls: MutableRefObject<ControlState>;
  canDrift?: boolean;
}) {
  const [active, setActive] = useState<Partial<ControlState>>({});

  const press = (key: keyof ControlState, value: boolean) => {
    controls.current[key] = value;
    setActive((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="controls">
      <div className="pad">
        {BUTTONS.slice(0, 2).map((btn) => (
          <button
            key={btn.key}
            className={`ctrl ${active[btn.key] ? "active" : ""}`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              press(btn.key, true);
            }}
            onPointerUp={() => press(btn.key, false)}
            onPointerCancel={() => press(btn.key, false)}
          >
            {btn.label}
            <div style={{ fontSize: 11 }}>{btn.extra}</div>
          </button>
        ))}
      </div>
      {canDrift && (
        <button
          className={`ctrl drift ${active.drift ? "active" : ""}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            press("drift", true);
          }}
          onPointerUp={() => press("drift", false)}
          onPointerCancel={() => press("drift", false)}
        >
          드리프트
        </button>
      )}
      <div className="pad">
        {BUTTONS.slice(2).map((btn) => (
          <button
            key={btn.key}
            className={`ctrl ${btn.key === "forward" ? "wide" : ""} ${active[btn.key] ? "active" : ""}`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              press(btn.key, true);
            }}
            onPointerUp={() => press(btn.key, false)}
            onPointerCancel={() => press(btn.key, false)}
          >
            {btn.label}
            <div style={{ fontSize: 11 }}>{btn.extra}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
