import type { Scene } from '@/lib/data/types';
import { ART_HEIGHT, ART_WIDTH, buildPainting, type Accent, type Ridge } from '@/lib/scene/art';

function ridgePath(ridge: Ridge): string {
  const [first, ...rest] = ridge.points;
  let d = `M ${first.x} ${first.y}`;
  let prev = first;
  for (const point of rest) {
    const cx = (prev.x + point.x) / 2;
    const cy = (prev.y + point.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${cx} ${cy}`;
    prev = point;
  }
  d += ` L ${prev.x} ${prev.y} L ${ART_WIDTH} ${ART_HEIGHT} L 0 ${ART_HEIGHT} Z`;
  return d;
}

function AccentShape({ accent }: { accent: Accent }) {
  if (accent.kind === 'pine') {
    return (
      <g transform={`translate(${accent.x} ${accent.y}) scale(${accent.scale})`} fill={accent.color}>
        <rect x={-4} y={-110} width={8} height={110} />
        {[0, 1, 2].map((layer) => {
          const w = 52 - layer * 12;
          const top = -108 - layer * 34;
          return <path key={layer} d={`M 0 ${top - 54} L ${-w} ${top} L ${w} ${top} Z`} />;
        })}
      </g>
    );
  }

  if (accent.kind === 'temple') {
    return (
      <g transform={`translate(${accent.x} ${accent.y}) scale(${accent.scale})`} fill={accent.color}>
        {[0, 1, 2].map((tier) => {
          const y = -tier * 34;
          const w = 150 - tier * 26;
          return (
            <path
              key={tier}
              d={`M ${-w} ${y} Q ${-w * 0.4} ${y - 26} 0 ${y - 30} Q ${w * 0.4} ${y - 26} ${w} ${y} L ${w * 0.72} ${
                y + 6
              } L ${-w * 0.72} ${y + 6} Z`}
            />
          );
        })}
      </g>
    );
  }

  if (accent.kind === 'tower') {
    return (
      <g transform={`translate(${accent.x} ${accent.y}) scale(${accent.scale})`} fill={accent.color}>
        <rect x={-26} y={-96} width={52} height={96} />
        <path d="M -52 -96 Q 0 -132 52 -96 Z" />
      </g>
    );
  }

  if (accent.kind === 'boat') {
    return (
      <g transform={`translate(${accent.x} ${accent.y}) scale(${accent.scale})`} fill={accent.color}>
        <path d="M -70 0 Q 0 34 70 0 Q 0 16 -70 0 Z" />
        <rect x={-3} y={-70} width={5} height={70} />
        <path d="M 2 -68 Q 40 -40 2 -18 Z" />
      </g>
    );
  }

  return (
    <g
      transform={`translate(${accent.x} ${accent.y}) scale(${accent.scale})`}
      stroke={accent.color}
      strokeWidth={2.2}
      fill="none"
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const x = i * 14 - 28;
        return <path key={i} d={`M ${x} 0 Q ${x + 6} ${-46 - i * 8} ${x + 16} ${-78 - i * 6}`} />;
      })}
    </g>
  );
}

export interface SceneStageProps {
  scene: Scene;
  /** 同一首诗不同画面用不同前缀，避免渐变 id 冲突 */
  seedPrefix?: string;
  className?: string;
  /** 画面动效：subtle 轻微推镜 */
  motion?: boolean;
}

/**
 * 意境画面（纯 SVG，无外部图片依赖，服务端可渲染）。
 * 画面由场景的 motifs / palette 与 id 作为种子确定，同一幕每次渲染一致。
 */
export function SceneStage({ scene, seedPrefix = 'stage-', className, motion = true }: SceneStageProps) {
  const painting = buildPainting(`${seedPrefix}${scene.id}`, scene.motifs, scene.palette);
  const uid = `${seedPrefix}${scene.id}`.replace(/[^a-zA-Z0-9_-]/g, '');
  const half = Math.ceil(painting.ridges.length / 2);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${scene.lines.join('')} 的意境画面`}
      data-motion={motion ? 'on' : 'off'}
    >
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={painting.sky.top} />
          <stop offset="55%" stopColor={painting.sky.mid} />
          <stop offset="100%" stopColor={painting.sky.low} />
        </linearGradient>
        <linearGradient id={`water-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={painting.water?.color ?? '#04100f'} />
          <stop offset="100%" stopColor="#02090b" />
        </linearGradient>
        <radialGradient id={`glow-${uid}`}>
          <stop offset="0%" stopColor={painting.orb?.glow ?? '#e3c76e'} stopOpacity="0.42" />
          <stop offset="35%" stopColor={painting.orb?.glow ?? '#e3c76e'} stopOpacity="0.14" />
          <stop offset="100%" stopColor={painting.orb?.glow ?? '#e3c76e'} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`disc-${uid}`}>
          <stop offset="0%" stopColor="#fffdf2" />
          <stop offset="100%" stopColor={painting.orb?.color ?? '#f5efdc'} />
        </radialGradient>
        <linearGradient id={`mist-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e6f0ec" stopOpacity="0" />
          <stop offset="50%" stopColor="#e6f0ec" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#e6f0ec" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`vignette-${uid}`} cx="50%" cy="45%" r="72%">
          <stop offset="55%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
        </radialGradient>
      </defs>

      <rect width={ART_WIDTH} height={ART_HEIGHT} fill={`url(#sky-${uid})`} />

      {painting.stars.map((star, i) => (
        <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#f5efdc" opacity={star.opacity} />
      ))}

      {painting.orb && (
        <g>
          <circle
            cx={painting.orb.x}
            cy={painting.orb.y}
            r={painting.orb.r * 7}
            fill={`url(#glow-${uid})`}
          />
          <circle
            cx={painting.orb.x}
            cy={painting.orb.y}
            r={painting.orb.r}
            fill={`url(#disc-${uid})`}
            opacity="0.95"
          />
        </g>
      )}

      {painting.ridges.slice(0, half).map((ridge, i) => (
        <path key={`far-${i}`} d={ridgePath(ridge)} fill={ridge.color} />
      ))}

      {painting.mist.map((band, i) => (
        <rect
          key={`mist-${i}`}
          x={0}
          y={band.y - band.height / 2}
          width={ART_WIDTH}
          height={band.height}
          fill={`url(#mist-${uid})`}
          opacity={band.opacity * 2.4}
        />
      ))}

      {painting.water && (
        <g>
          <rect
            x={0}
            y={painting.water.y}
            width={ART_WIDTH}
            height={ART_HEIGHT - painting.water.y}
            fill={`url(#water-${uid})`}
          />
          {Array.from({ length: 14 }).map((_, i) => {
            const y = painting.water!.y + 16 + i * 13;
            const startX = 40 + ((i * 137) % 620);
            return (
              <line
                key={i}
                x1={startX}
                y1={y}
                x2={startX + 110 + ((i * 71) % 250)}
                y2={y}
                stroke={painting.water!.highlight}
                strokeOpacity={0.28}
                strokeWidth={1.4}
              />
            );
          })}
        </g>
      )}

      {painting.ridges.slice(half).map((ridge, i) => (
        <path key={`near-${i}`} d={ridgePath(ridge)} fill={ridge.color} />
      ))}

      {painting.accents.map((accent, i) => (
        <AccentShape key={`accent-${i}`} accent={accent} />
      ))}

      {painting.weather.kind === 'rain' &&
        painting.weather.particles.map((drop, i) => (
          <line
            key={`rain-${i}`}
            x1={drop.x}
            y1={drop.y}
            x2={drop.x - 8}
            y2={drop.y + drop.len}
            stroke="#d6e8e8"
            strokeOpacity={drop.opacity}
            strokeWidth={1.2}
          />
        ))}

      {painting.weather.kind === 'snow' &&
        painting.weather.particles.map((flake, i) => (
          <circle
            key={`snow-${i}`}
            cx={flake.x}
            cy={flake.y}
            r={flake.len}
            fill="#f0f6f4"
            opacity={flake.opacity}
          />
        ))}

      <rect width={ART_WIDTH} height={ART_HEIGHT} fill={`url(#vignette-${uid})`} />
    </svg>
  );
}
