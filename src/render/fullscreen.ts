// Полноэкранный режим и альбомная ориентация для веба.
// В Capacitor ориентацию и fullscreen задаёт нативная часть (AndroidManifest + MainActivity).
import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';

interface LockableOrientation {
  lock?: (o: string) => Promise<void>;
}

function lockLandscape(): void {
  try {
    const o = (globalThis.screen?.orientation ?? null) as LockableOrientation | null;
    o?.lock?.('landscape').catch(() => {
      // Браузер не поддерживает блокировку (iOS, десктоп) — не страшно
    });
  } catch {
    // ignore
  }
}

/** Вызывать только из обработчика жеста пользователя (pointerup). */
export function enterFullscreenLandscape(scene: Phaser.Scene): void {
  if (Capacitor.isNativePlatform()) return;
  const scale = scene.scale;
  if (scale.isFullscreen) {
    lockLandscape();
    return;
  }
  scale.once(Phaser.Scale.Events.ENTER_FULLSCREEN, lockLandscape);
  try {
    scale.startFullscreen();
  } catch {
    // ignore
  }
}
