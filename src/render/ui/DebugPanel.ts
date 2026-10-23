// DOM-панель слайдеров tuning.json (только при ?debug=1).
// Значения сохраняются в localStorage; «Скопировать JSON» выдаёт полный tuning.json для вставки в чат.
import {
  exportTuningJson,
  parseOverrides,
  setTuningValue,
  tuningOverrides,
  type Tuning,
} from '../../core/tuning';
import { t } from './strings';

export const TUNING_STORAGE_KEY = 'trassa.tuning.overrides';

export function loadTuningOverrides(): Record<string, number> {
  try {
    return parseOverrides(globalThis.localStorage?.getItem(TUNING_STORAGE_KEY) ?? null);
  } catch {
    return {};
  }
}

function saveOverrides(tuning: Tuning): void {
  try {
    localStorage.setItem(TUNING_STORAGE_KEY, JSON.stringify(tuningOverrides(tuning)));
  } catch {
    // localStorage недоступен (приватный режим) — значения живут до перезагрузки
  }
}

const CSS = `
#tuning-toggle{position:fixed;top:calc(env(safe-area-inset-top) + 8px);right:calc(env(safe-area-inset-right) + 8px);z-index:20;
  min-width:56px;min-height:56px;font:600 16px sans-serif;background:rgba(0,0,0,.6);color:#0f8;border:1px solid #0f8;border-radius:10px}
#tuning-panel{position:fixed;top:0;right:0;bottom:0;width:min(420px,70vw);z-index:21;overflow-y:auto;box-sizing:border-box;
  padding:calc(env(safe-area-inset-top) + 8px) calc(env(safe-area-inset-right) + 12px) 12px 12px;
  background:rgba(10,14,20,.94);color:#e8eef4;font:14px sans-serif;display:none}
#tuning-panel.open{display:block}
#tuning-panel .row{margin:10px 0}
#tuning-panel .head{display:flex;justify-content:space-between;gap:8px}
#tuning-panel .val{font-family:monospace;color:#0f8}
#tuning-panel .val.changed{color:#ffb000}
#tuning-panel input[type=range]{width:100%;height:36px}
#tuning-panel .btns{display:flex;flex-wrap:wrap;gap:8px;position:sticky;top:0;background:rgba(10,14,20,.98);padding-bottom:8px}
#tuning-panel button{min-height:48px;padding:0 14px;font:600 15px sans-serif;border-radius:8px;border:0;background:#2f7de1;color:#fff}
#tuning-panel textarea{width:100%;height:160px;font:12px monospace;display:none}
`;

function decimals(step: number): number {
  const s = String(step);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

export function mountDebugPanel(tuning: Tuning): void {
  if (typeof document === 'undefined' || document.getElementById('tuning-panel')) return;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const toggle = document.createElement('button');
  toggle.id = 'tuning-toggle';
  toggle.textContent = `⚙ ${t('debugTuning')}`;

  const panel = document.createElement('div');
  panel.id = 'tuning-panel';

  const btns = document.createElement('div');
  btns.className = 'btns';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = t('debugCopy');
  const resetBtn = document.createElement('button');
  resetBtn.textContent = t('debugReset');
  resetBtn.style.background = '#8e3b3b';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = t('debugClose');
  closeBtn.style.background = '#444';
  btns.append(copyBtn, resetBtn, closeBtn);
  panel.appendChild(btns);

  const out = document.createElement('textarea');
  out.readOnly = true;
  panel.appendChild(out);

  const refreshers: Array<() => void> = [];
  for (const [key, p] of Object.entries(tuning.data.params)) {
    const row = document.createElement('div');
    row.className = 'row';
    const head = document.createElement('div');
    head.className = 'head';
    const label = document.createElement('span');
    label.textContent = p.label;
    label.title = key;
    const val = document.createElement('span');
    val.className = 'val';
    head.append(label, val);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(p.min);
    input.max = String(p.max);
    input.step = String(p.step);
    const refresh = (): void => {
      const v = tuning.values[key] ?? p.value;
      input.value = String(v);
      val.textContent = v.toFixed(decimals(p.step));
      val.classList.toggle('changed', v !== p.value);
    };
    input.addEventListener('input', () => {
      setTuningValue(tuning, key, Number(input.value));
      refresh();
      saveOverrides(tuning);
    });
    refresh();
    refreshers.push(refresh);
    row.append(head, input);
    panel.appendChild(row);
  }

  // Панель не должна пропускать касания в игру
  for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend']) {
    panel.addEventListener(ev, (e) => e.stopPropagation());
    toggle.addEventListener(ev, (e) => e.stopPropagation());
  }

  toggle.addEventListener('click', () => panel.classList.toggle('open'));
  closeBtn.addEventListener('click', () => panel.classList.remove('open'));
  resetBtn.addEventListener('click', () => {
    for (const [key, p] of Object.entries(tuning.data.params)) tuning.values[key] = p.value;
    saveOverrides(tuning);
    refreshers.forEach((r) => r());
  });
  copyBtn.addEventListener('click', () => {
    const json = exportTuningJson(tuning);
    const showManual = (): void => {
      out.value = json;
      out.style.display = 'block';
      out.focus();
      out.select();
      copyBtn.textContent = t('debugCopyFailed');
    };
    const done = (): void => {
      copyBtn.textContent = t('debugCopied');
      setTimeout(() => (copyBtn.textContent = t('debugCopy')), 1500);
    };
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(json).then(done, showManual);
      else showManual();
    } catch {
      showManual();
    }
  });

  // Внутрь контейнера игры: он же цель fullscreen, иначе панель скроется после «Играть»
  (document.getElementById('game') ?? document.body).append(toggle, panel);
}
