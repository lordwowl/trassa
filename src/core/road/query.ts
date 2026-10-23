// Запросы к дороге по позиции z (м вдоль трассы). Трасса замкнута.

import type { Road, RoadSegment } from './types';

export function wrapZ(road: Road, z: number): number {
  const r = z % road.length;
  return r < 0 ? r + road.length : r;
}

export function segmentIndexAt(road: Road, z: number): number {
  return Math.floor(wrapZ(road, z) / road.segmentLength) % road.segments.length;
}

export function segmentAt(road: Road, z: number): RoadSegment {
  return road.segments[segmentIndexAt(road, z)] as RoadSegment;
}

export function segmentByIndex(road: Road, i: number): RoadSegment {
  const n = road.segments.length;
  return road.segments[((i % n) + n) % n] as RoadSegment;
}

/** Высота дороги в точке z, линейно между началами соседних сегментов. */
export function heightAt(road: Road, z: number): number {
  const w = wrapZ(road, z);
  const i = Math.floor(w / road.segmentLength);
  const t = w / road.segmentLength - i;
  const a = segmentByIndex(road, i).y;
  const b = segmentByIndex(road, i + 1).y;
  return a + (b - a) * t;
}
