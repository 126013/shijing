import { describe, expect, it } from 'vitest';
import { poems } from '@/data/poems';
import { poets } from '@/data/poets';
import {
  buildScenesFromLines,
  filterPoems,
  normalizeRemotePoem,
  paginate,
  summarize,
} from '@/lib/data/repository';
import { buildPainting } from '@/lib/scene/art';

describe('数据完整性', () => {
  it('每首诗的 id 唯一，且分幕编号连续', () => {
    const ids = new Set<string>();
    for (const poem of poems) {
      expect(ids.has(poem.id)).toBe(false);
      ids.add(poem.id);
      poem.scenes.forEach((scene, index) => {
        expect(scene.index).toBe(index + 1);
        expect(scene.lines.length).toBeGreaterThan(0);
        expect(scene.translation.length).toBeGreaterThan(0);
      });
    }
  });

  it('诗人引用的诗都真实存在', () => {
    const poemIds = new Set(poems.map((poem) => poem.id));
    for (const poet of poets) {
      for (const id of poet.poemIds) {
        expect(poemIds.has(id), `${poet.name} 引用了不存在的诗 ${id}`).toBe(true);
      }
    }
  });

  it('每首诗都能在诗人名录里找到作者', () => {
    const names = new Set(poets.map((poet) => poet.name));
    for (const poem of poems) {
      expect(names.has(poem.author), `${poem.title} 的作者 ${poem.author} 不在名录中`).toBe(true);
    }
  });

  it('行迹图坐标落在 0-100 的示意范围内', () => {
    for (const poet of poets) {
      expect(poet.coord.x).toBeGreaterThan(0);
      expect(poet.coord.x).toBeLessThan(100);
      expect(poet.coord.y).toBeGreaterThan(0);
      expect(poet.coord.y).toBeLessThan(100);
    }
  });
});

describe('书库查询', () => {
  it('按朝代筛选只返回该朝代', () => {
    const result = filterPoems(poems, { dynasty: '宋' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((poem) => poem.dynasty === '宋')).toBe(true);
  });

  it('关键词命中诗句正文', () => {
    const result = filterPoems(poems, { q: '明月' });
    expect(result.some((poem) => poem.id === 'jing-ye-si')).toBe(true);
  });

  it('作者与题材组合筛选', () => {
    const result = filterPoems(poems, { author: '王维', theme: '山水田园' });
    expect(result.map((poem) => poem.id)).toContain('shan-ju-qiu-ming');
    expect(result.every((poem) => poem.author === '王维')).toBe(true);
  });

  it('分页不会越界', () => {
    const first = paginate(poems, 1, 5);
    expect(first.items).toHaveLength(5);
    const last = paginate(poems, 999, 5);
    expect(last.page).toBe(Math.ceil(poems.length / 5));
    const empty = paginate([], 3, 5);
    expect(empty.items).toHaveLength(0);
    expect(empty.page).toBe(1);
  });

  it('摘要带首句与分幕数', () => {
    const summary = summarize(poems[0]);
    expect(summary.opening.length).toBeGreaterThan(0);
    expect(summary.sceneCount).toBe(poems[0].scenes.length);
  });
});

describe('远程数据收敛', () => {
  it('诗句数组按两句一幕拆分', () => {
    const scenes = buildScenesFromLines('remote-1', ['一句。', '二句。', '三句。']);
    expect(scenes).toHaveLength(2);
    expect(scenes[1].lines).toEqual(['三句。']);
  });

  it('空诗句给出可渲染的兜底幕', () => {
    const scenes = buildScenesFromLines('remote-2', []);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].lines.length).toBeGreaterThan(0);
  });

  it('缺少 id 或标题的条目被丢弃', () => {
    expect(normalizeRemotePoem({ title: '无 id' })).toBeNull();
    expect(normalizeRemotePoem(null)).toBeNull();
  });

  it('正常条目被收敛为统一结构', () => {
    const poem = normalizeRemotePoem({
      id: 'tang-001',
      title: '测试诗',
      author: '佚名',
      dynasty: '唐',
      lines: ['甲。', '乙。'],
    });
    expect(poem?.id).toBe('tang-001');
    expect(poem?.scenes).toHaveLength(1);
    expect(poem?.collection.length).toBeGreaterThan(0);
  });
});

describe('程序化画面', () => {
  it('同一场景种子生成相同画面（可复现）', () => {
    const a = buildPainting('scene-1', ['moon', 'mountain'], 'indigo');
    const b = buildPainting('scene-1', ['moon', 'mountain'], 'indigo');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('不同场景生成不同画面', () => {
    const a = buildPainting('scene-a', ['moon'], 'jade');
    const b = buildPainting('scene-b', ['moon'], 'jade');
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('雪景与雨景会生成天气粒子', () => {
    expect(buildPainting('s', ['snow'], 'frost').weather.kind).toBe('snow');
    expect(buildPainting('r', ['rain'], 'jade').weather.kind).toBe('rain');
    expect(buildPainting('r', ['rain'], 'jade').weather.particles.length).toBeGreaterThan(0);
  });
});
