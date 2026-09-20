import { useState, type MutableRefObject } from "react";
import type { ControlState } from "./useControls";

const BUTTONS: { key: keyof ControlState; label: string; extra: string }[] = [
  { key: "left", label: "←", extra: "좌" },
  { key: "right", label: "→", extra: "우" },
  { key: "forward", label: "↑", extra: "앞" },
  { key: "brake", label: "●", extra: "브레이크" },
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
      {BUTTONS.map((btn) => (
        <button
          key={btn.key}
          className={`ctrl${btn.key === "brake" ? " brake" : ""} ${active[btn.key] ? "active" : ""}`}
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
    </div>
  );
}
