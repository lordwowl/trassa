// Руль наклоном телефона: devicemotion → угол «как у руля».
import { rollFromGravity } from './controlMath';

interface MotionPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

function screenAngle(): number {
  const a = globalThis.screen?.orientation?.angle;
  if (typeof a === 'number') return a;
  const legacy = (globalThis as { orientation?: number }).orientation;
  return typeof legacy === 'number' ? (legacy + 360) % 360 : 0;
}

export class TiltInput {
  /** Последний угол, градусы; null — данных нет или телефон плашмя. */
  roll: number | null = null;
  /** Были ли вообще события датчика. */
  hasData = false;
  private readonly onMotion = (e: DeviceMotionEvent): void => {
    const g = e.accelerationIncludingGravity;
    if (!g || g.x === null || g.y === null) return;
    this.hasData = true;
    this.roll = rollFromGravity(g.x, g.y, screenAngle());
  };

  start(): void {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;
    window.addEventListener('devicemotion', this.onMotion);
  }

  stop(): void {
    if (typeof window !== 'undefined') window.removeEventListener('devicemotion', this.onMotion);
  }

  /** iOS требует разрешение по жесту пользователя; на Android — no-op. */
  static requestPermission(): void {
    const dme = (globalThis as { DeviceMotionEvent?: MotionPermission }).DeviceMotionEvent;
    if (dme?.requestPermission) dme.requestPermission().catch(() => {});
  }
}
