export type Dynasty =
  | '先秦'
  | '两汉'
  | '魏晋'
  | '南北朝'
  | '唐'
  | '五代'
  | '宋'
  | '元'
  | '明'
  | '清';

/** 意境母题：决定程序化绘制的画面构成（山、水、月、雪、雨……） */
export type Motif =
  | 'moon'
  | 'mountain'
  | 'river'
  | 'snow'
  | 'rain'
  | 'spring'
  | 'autumn'
  | 'desert'
  | 'temple'
  | 'lake'
  | 'forest'
  | 'boat';

/** 画面色板：深夜青绿为底，暖金为唯一强调色的一组变体 */
export type Palette = 'jade' | 'indigo' | 'gold' | 'frost' | 'ember' | 'ink';

export interface Scene {
  /** 场景唯一 id，同时作为程序化画面的随机种子 */
  id: string;
  /** 从 1 开始的幕序 */
  index: number;
  /** 这一幕呈现的诗句（一到两句） */
  lines: string[];
  /** 该幕的白话译文 */
  translation: string;
  /** 意境画面提示词（用于外部配图或程序化绘制时的构图参考） */
  prompt: string;
  motifs: Motif[];
  palette: Palette;
  /** 字幕时长（秒），缺省时按字数推算 */
  duration?: number;
}

export interface Poem {
  id: string;
  title: string;
  author: string;
  dynasty: Dynasty;
  /** 题材标签 */
  theme: string;
  /** 所属合集，如「唐诗」「宋词」 */
  collection: string;
  tags: string[];
  /** 与诗句相关的地点，用于行迹图连线 */
  place?: string;
  scenes: Scene[];
  note?: string;
}

export interface PoemSummary {
  id: string;
  title: string;
  author: string;
  dynasty: Dynasty;
  theme: string;
  collection: string;
  /** 首句，用于列表摘要 */
  opening: string;
  sceneCount: number;
  place?: string;
}

export interface Poet {
  id: string;
  name: string;
  dynasty: Dynasty;
  years: string;
  birthplace: string;
  /** 行迹图上的示意位置（0-100 的相对坐标，非地理坐标） */
  coord: { x: number; y: number };
  bio: string;
  poemIds: string[];
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Meta {
  total: number;
  dynasties: { name: string; count: number }[];
  themes: { name: string; count: number }[];
  collections: { name: string; count: number }[];
  /** curated：仓库内置精选集；remote：线上全量接口 */
  source: 'curated' | 'remote';
  /** 远程接口失败时的说明，便于界面显示降级状态 */
  degradedReason?: string;
}

export interface PoemQuery {
  q?: string;
  dynasty?: string;
  theme?: string;
  author?: string;
  page?: number;
  pageSize?: number;
}
