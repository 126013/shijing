'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Poet } from '@/lib/data/types';

const DYNASTY_ORDER = ['先秦', '两汉', '魏晋', '南北朝', '唐', '五代', '宋', '元', '明', '清'];

function trailPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  return points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const prev = points[index - 1];
      const cx = (prev.x + point.x) / 2;
      return `Q ${prev.x} ${prev.y} ${cx} ${(prev.y + point.y) / 2} T ${point.x} ${point.y}`;
    })
    .join(' ');
}

export function PoetTrail({ poets }: { poets: Poet[] }) {
  const [dynasty, setDynasty] = useState('全部');
  const [activeId, setActiveId] = useState(poets[0]?.id ?? '');
  const [cruising, setCruising] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const dynasties = useMemo(() => {
    const present = new Set(poets.map((poet) => poet.dynasty));
    return ['全部', ...DYNASTY_ORDER.filter((item) => present.has(item as Poet['dynasty']))];
  }, [poets]);

  const visible = useMemo(
    () => (dynasty === '全部' ? poets : poets.filter((poet) => poet.dynasty === dynasty)),
    [dynasty, poets],
  );

  const active = useMemo(
    () => visible.find((poet) => poet.id === activeId) ?? visible[0],
    [activeId, visible],
  );

  // 行迹顺序：按朝代、再按生年，近似一条沿时间铺开的路线
  const route = useMemo(() => {
    return [...visible]
      .sort((a, b) => {
        const byDynasty = DYNASTY_ORDER.indexOf(a.dynasty) - DYNASTY_ORDER.indexOf(b.dynasty);
        if (byDynasty !== 0) return byDynasty;
        return parseInt(a.years, 10) - parseInt(b.years, 10);
      })
      .map((poet) => ({ x: 90 + poet.coord.x * 8.2, y: 70 + poet.coord.y * 6.2 }));
  }, [visible]);

  useEffect(() => {
    if (!cruising || visible.length === 0) return;
    timer.current = setInterval(() => {
      setActiveId((current) => {
        const index = visible.findIndex((poet) => poet.id === current);
        return visible[(index + 1) % visible.length].id;
      });
    }, 3200);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [cruising, visible]);

  useEffect(() => {
    if (visible.length > 0 && !visible.some((poet) => poet.id === activeId)) {
      setActiveId(visible[0].id);
    }
  }, [activeId, visible]);

  return (
    <div className="trail">
      <div className="trail-canvas">
        <svg className="trail-svg" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid meet" role="img"
          aria-label="诗人行迹示意图">
          <defs>
            <linearGradient id="trail-ridge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#123a38" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#05171a" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="trail-halo">
              <stop offset="0%" stopColor="#e3c76e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#e3c76e" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 抽象山河：只是画面底纹，不是地图 */}
          <path d="M0 470 Q 160 400 300 452 T 640 430 T 1000 470 L1000 620 L0 620 Z" fill="url(#trail-ridge)" />
          <path d="M0 520 Q 200 470 380 512 T 720 496 T 1000 520 L1000 620 L0 620 Z" fill="#07191d" opacity="0.85" />
          {Array.from({ length: 7 }).map((_, i) => (
            <line
              key={i}
              x1={80}
              y1={90 + i * 70}
              x2={940}
              y2={90 + i * 70}
              stroke="#d7bf7a"
              strokeOpacity={0.06}
              strokeWidth={1}
            />
          ))}

          <path d={trailPath(route)} fill="none" stroke="#e3c76e" strokeOpacity={0.34} strokeWidth={1.4}
            strokeDasharray="5 7" />

          {visible.map((poet) => {
            const x = 90 + poet.coord.x * 8.2;
            const y = 70 + poet.coord.y * 6.2;
            const isActive = active?.id === poet.id;
            return (
              <g
                key={poet.id}
                className="trail-node"
                data-active={isActive}
                transform={`translate(${x} ${y})`}
                onClick={() => {
                  setActiveId(poet.id);
                  setCruising(false);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setActiveId(poet.id);
                  }
                }}
                aria-label={`${poet.name}（${poet.dynasty}）`}
              >
                {isActive && <circle r={34} fill="url(#trail-halo)" />}
                <circle className="dot" r={isActive ? 7 : 4.5} fill={isActive ? '#e3c76e' : '#cfc7ae'} opacity={isActive ? 1 : 0.7} />
                <circle r={13} fill="none" stroke="#e3c76e" strokeOpacity={isActive ? 0.55 : 0.16} />
                <text x={0} y={-18} textAnchor="middle">
                  {poet.name}
                </text>
                <text x={0} y={26} textAnchor="middle" fontSize={10} fill="#8e9c99" letterSpacing={2}>
                  {poet.dynasty}
                </text>
              </g>
            );
          })}
        </svg>
        <span className="trail-note">行迹示意图 · 节点为示意位置，非地理坐标</span>
      </div>

      <div className="trail-panel">
        <div className="filter-row">
          {dynasties.map((item) => (
            <button
              key={item}
              type="button"
              className="chip"
              data-active={dynasty === item}
              onClick={() => {
                setDynasty(item);
                setCruising(false);
              }}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            className={`chip${cruising ? ' chip-live' : ''}`}
            data-active={cruising}
            onClick={() => setCruising((value) => !value)}
          >
            {cruising ? '巡游中…' : '自动巡游'}
          </button>
        </div>

        {active ? (
          <div className="trail-detail" aria-live="polite">
            <h3>{active.name}</h3>
            <p className="poet-meta">
              {active.dynasty} · {active.years}
            </p>
            <p className="poet-meta">{active.birthplace}</p>
            <p className="poet-bio">{active.bio}</p>
            <div className="trail-poem-links">
              {active.poemIds.length === 0 && <span className="muted">代表作整理中</span>}
              {active.poemIds.map((id) => (
                <Link key={id} className="chip" href={`/read/${id}`}>
                  读一首 →
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="trail-detail">
            <p className="muted">该朝代的诗人资料仍在补充。</p>
          </div>
        )}

        <div className="poet-list">
          {poets.map((poet) => (
            <button
              key={poet.id}
              type="button"
              className="chip"
              data-active={active?.id === poet.id}
              onClick={() => {
                setDynasty('全部');
                setActiveId(poet.id);
                setCruising(false);
              }}
            >
              {poet.name} · {poet.dynasty}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
