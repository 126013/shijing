import type { Motif, Palette } from '@/lib/data/types';

/**
 * 程序化意境画面。
 *
 * 同一份「绘画描述」同时驱动两处渲染：
 *   1. 页面上的 SVG 背景（components/scene/SceneStage.tsx）
 *   2. 短片合成时的 Canvas 逐帧绘制（lib/scene/paint.ts）
 * 因此不需要任何外部图片或图片接口，离线也能跑，画面还能逐首各不相同。
 */

export const ART_WIDTH = 1600;
export const ART_HEIGHT = 900;

export interface Ridge {
  points: { x: number; y: number }[];
  color: string;
}

export interface Accent {
  kind: 'pine' | 'temple' | 'boat' | 'reeds' | 'tower';
  x: number;
  y: number;
  scale: number;
  color: string;
}

export interface Painting {
  sky: { top: string; mid: string; low: string };
  ridges: Ridge[];
  mist: { y: number; height: number; opacity: number }[];
  water: { y: number; color: string; highlight: string } | null;
  orb: { x: number; y: number; r: number; color: string; glow: string } | null;
  stars: { x: number; y: number; r: number; opacity: number }[];
  weather: { kind: 'none' | 'rain' | 'snow'; particles: { x: number; y: number; len: number; opacity: number }[] };
  accents: Accent[];
  ground: string;
}

interface PaletteSpec {
  sky: [string, string, string];
  ridge: [string, string, string, string];
  orb: string;
  glow: string;
  water: string;
  highlight: string;
  ink: string;
  ground: string;
}

const PALETTES: Record<Palette, PaletteSpec> = {
  jade: {
    sky: ['#04191c', '#0a2e2c', '#12433a'],
    ridge: ['#1d4a45', '#153a37', '#0c2a28', '#05181a'],
    orb: '#f6ecd0',
    glow: '#e3c76e',
    water: '#0a2626',
    highlight: '#7fb6a5',
    ink: '#03100f',
    ground: '#04100f',
  },
  indigo: {
    sky: ['#050e18', '#0a2035', '#143c55'],
    ridge: ['#1c3d5a', '#152f47', '#0d2033', '#061020'],
    orb: '#f2e8cf',
    glow: '#c9b06a',
    water: '#081c2e',
    highlight: '#7fa8c9',
    ink: '#030a12',
    ground: '#030a12',
  },
  gold: {
    sky: ['#170d05', '#39240f', '#7a4a18'],
    ridge: ['#6b4018', '#4a2b12', '#2b1809', '#140b04'],
    orb: '#f7d98a',
    glow: '#e3c76e',
    water: '#3a2410',
    highlight: '#d8a959',
    ink: '#100802',
    ground: '#100802',
  },
  frost: {
    sky: ['#0a1418', '#16242c', '#33474f'],
    ridge: ['#4a646c', '#364a53', '#22323a', '#111c22'],
    orb: '#f7f4e8',
    glow: '#cdd8d6',
    water: '#1a2a31',
    highlight: '#d6e4e2',
    ink: '#0a1216',
    ground: '#0d181d',
  },
  ember: {
    sky: ['#160806', '#3d160c', '#8a3a14'],
    ridge: ['#6f3414', '#4b220d', '#2c1207', '#150804'],
    orb: '#ffd79a',
    glow: '#e08a3c',
    water: '#3a180a',
    highlight: '#e59a55',
    ink: '#120603',
    ground: '#120603',
  },
  ink: {
    sky: ['#0a0c0d', '#171b1c', '#2b3132'],
    ridge: ['#454c4d', '#323839', '#1e2324', '#0c0f10'],
    orb: '#e9e6da',
    glow: '#b9c0bd',
    water: '#151a1b',
    highlight: '#9aa5a2',
    ink: '#080a0b',
    ground: '#080a0b',
  },
};

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRidge(
  rand: () => number,
  baseY: number,
  amplitude: number,
  color: string,
  steps = 9,
): Ridge {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = (ART_WIDTH / steps) * i;
    const wave =
      Math.sin(i * 1.35 + rand() * 2) * 0.55 + Math.sin(i * 0.6 + rand() * 3) * 0.45;
    const jitter = (rand() - 0.5) * 0.5;
    points.push({
      x,
      y: Math.max(120, baseY - (wave + jitter) * amplitude),
    });
  }
  return { points, color };
}

export function buildPainting(seed: string, motifs: Motif[], palette: Palette): Painting {
  const spec = PALETTES[palette] ?? PALETTES.jade;
  const rand = mulberry32(hashSeed(`${seed}:${motifs.join('-')}:${palette}`));
  const has = (motif: Motif) => motifs.includes(motif);

  const isDesert = has('desert');
  const isSnow = has('snow');
  const isRain = has('rain');
  const isNight = has('moon') || (!isDesert && palette !== 'gold');
  const hasWater = has('river') || has('lake') || has('boat') || has('snow');

  const ridges: Ridge[] = [];
  const layerCount = isDesert ? 2 : 4;
  for (let i = 0; i < layerCount; i += 1) {
    const base = isDesert ? 560 + i * 60 : 470 + i * 52;
    const amp = isDesert ? 26 - i * 6 : 74 - i * 11;
    ridges.push(makeRidge(rand, base, Math.max(amp, 8), spec.ridge[i] ?? spec.ridge[3]));
  }

  const orb = (() => {
    if (isDesert || palette === 'gold') {
      return {
        x: 1120 + rand() * 120,
        y: 470 + rand() * 40,
        r: 86,
        color: spec.orb,
        glow: spec.glow,
      };
    }
    if (isSnow) {
      return { x: 420 + rand() * 200, y: 150 + rand() * 60, r: 54, color: spec.orb, glow: spec.glow };
    }
    if (has('moon')) {
      return { x: 1180 + rand() * 120, y: 130 + rand() * 70, r: 62, color: spec.orb, glow: spec.glow };
    }
    return null;
  })();

  const stars = isNight
    ? Array.from({ length: 46 }, () => ({
        x: rand() * ART_WIDTH,
        y: rand() * 420,
        r: rand() * 1.6 + 0.5,
        opacity: rand() * 0.55 + 0.2,
      }))
    : [];

  const mist = Array.from({ length: 3 }, (_, i) => ({
    y: 470 + i * 46 + rand() * 20,
    height: 70 + rand() * 60,
    opacity: 0.16 + rand() * 0.16,
  }));

  const weatherParticles = (() => {
    if (isRain) {
      return Array.from({ length: 110 }, () => ({
        x: rand() * ART_WIDTH,
        y: rand() * ART_HEIGHT,
        len: 18 + rand() * 30,
        opacity: 0.1 + rand() * 0.22,
      }));
    }
    if (isSnow) {
      return Array.from({ length: 90 }, () => ({
        x: rand() * ART_WIDTH,
        y: rand() * ART_HEIGHT,
        len: 1.6 + rand() * 2.6,
        opacity: 0.2 + rand() * 0.4,
      }));
    }
    return [];
  })();

  const accents: Accent[] = [];
  if (has('forest') || has('autumn')) {
    const count = has('forest') ? 4 : 2;
    for (let i = 0; i < count; i += 1) {
      accents.push({
        kind: 'pine',
        x: 120 + rand() * 1360,
        y: 700 + rand() * 90,
        scale: 0.6 + rand() * 0.7,
        color: spec.ink,
      });
    }
  }
  if (has('temple')) {
    accents.push({ kind: 'temple', x: 300 + rand() * 900, y: 700, scale: 0.9 + rand() * 0.4, color: spec.ink });
  }
  if (has('boat')) {
    accents.push({
      kind: 'boat',
      x: 420 + rand() * 700,
      y: (hasWater ? 742 : 700) + rand() * 36,
      scale: 0.8 + rand() * 0.5,
      color: spec.ink,
    });
  }
  if (has('lake') || has('river')) {
    accents.push({ kind: 'reeds', x: 60 + rand() * 120, y: 840, scale: 0.9, color: spec.ink });
  }
  if (has('mountain') && has('temple')) {
    accents.push({ kind: 'tower', x: 1240, y: 640, scale: 0.7, color: spec.ink });
  }

  return {
    sky: { top: spec.sky[0], mid: spec.sky[1], low: spec.sky[2] },
    ridges,
    mist,
    water: hasWater
      ? { y: 700, color: spec.water, highlight: spec.highlight }
      : null,
    orb,
    stars,
    weather: {
      kind: isRain ? 'rain' : isSnow ? 'snow' : 'none',
      particles: weatherParticles,
    },
    accents,
    ground: spec.ground,
  };
}
