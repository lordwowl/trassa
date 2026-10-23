// Движок событий: условия, выбор, эффекты (формат — docs/GDD.md, 8.2). Реализация — M6.

export interface GameEventDef {
  id: string;
  type: string;
  weight: number;
}
