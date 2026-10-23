// Страховка масштабирования. Phaser (FIT) при повороте экрана может пересчитать размер по
// устаревшей вертикальной ширине и затем запомнить уже новую — и больше не обновляется:
// картинка остаётся маленькой, пока не перезагрузить страницу. Здесь размер перепроверяется
// после событий изменения окна и раз в секунду.
import type Phaser from 'phaser';

const RECHECK_DELAYS_MS = [150, 600];
const POLL_MS = 1000;
/** Допуск расхождения, CSS px. */
const TOLERANCE = 2;

/** Отличается ли размер canvas от вписанного (FIT) в родителя. */
export function isScaleStale(parentW: number, parentH: number, canvasW: number, canvasH: number, gameW: number, gameH: number): boolean {
  if (parentW <= 0 || parentH <= 0) return false;
  const k = Math.min(parentW / gameW, parentH / gameH);
  return Math.abs(canvasW - gameW * k) > TOLERANCE || Math.abs(canvasH - gameH * k) > TOLERANCE;
}

export function watchViewport(game: Phaser.Game): void {
  const check = (): void => {
    const scale = game.scale;
    const parent = scale.parent as HTMLElement | null;
    const canvas = game.canvas;
    if (!parent || !canvas || scale.isFullscreen) return;
    const p = parent.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    if (isScaleStale(p.width, p.height, c.width, c.height, scale.gameSize.width, scale.gameSize.height)) {
      scale.getParentBounds();
      scale.refresh();
    }
  };

  let timers: ReturnType<typeof setTimeout>[] = [];
  const schedule = (): void => {
    for (const t of timers) clearTimeout(t);
    timers = RECHECK_DELAYS_MS.map((ms) => setTimeout(check, ms));
  };

  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  screen.orientation?.addEventListener?.('change', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  setInterval(check, POLL_MS);
}
