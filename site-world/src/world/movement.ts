export type Facing = 'down' | 'left' | 'right' | 'up';

export interface MoveVector {
  x: number;
  y: number;
}

export function normalizeMoveVector(x: number, y: number): MoveVector {
  const length = Math.hypot(x, y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

export function facingFromVector(x: number, y: number, current: Facing): Facing {
  if (x === 0 && y === 0) return current;
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'up' : 'down';
}
