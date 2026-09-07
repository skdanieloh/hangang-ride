import { useEffect, useRef } from "react";

export type ControlState = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
};

export function useControls() {
  const controls = useRef<ControlState>({
    forward: false,
    back: false,
    left: false,
    right: false,
    drift: false,
  });

  useEffect(() => {
    const map: Record<string, keyof ControlState> = {
      ArrowUp: "forward",
      ArrowDown: "back",
      ArrowLeft: "left",
      ArrowRight: "right",
      KeyW: "forward",
      KeyS: "back",
      KeyA: "left",
      KeyD: "right",
      ShiftLeft: "drift",
      ShiftRight: "drift",
      Space: "drift",
    };

    const setKey = (e: KeyboardEvent, value: boolean) => {
      const key = map[e.code];
      if (!key) return;
      e.preventDefault();
      controls.current[key] = value;
    };

    const down = (e: KeyboardEvent) => setKey(e, true);
    const up = (e: KeyboardEvent) => setKey(e, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return controls;
}
