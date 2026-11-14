import type { Scene } from '@/lib/data/types';
import { ART_HEIGHT, ART_WIDTH, buildPainting, type Painting } from '@/lib/scene/art';

/** 用 Canvas 2D 把「绘画描述」画成画面，供短片逐帧合成使用。 */
export function paintPainting(
  ctx: CanvasRenderingContext2D,
  painting: Painting,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / ART_WIDTH, height / ART_HEIGHT);
  const offsetX = (width - ART_WIDTH * scale) / 2;
  const offsetY = (height - ART_HEIGHT * scale) / 2;

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

  // 天空
  const sky = ctx.createLinearGradient(0, 0, 0, ART_HEIGHT);
  sky.addColorStop(0, painting.sky.top);
  sky.addColorStop(0.55, painting.sky.mid);
  sky.addColorStop(1, painting.sky.low);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);

  // 星点
  for (const star of painting.stars) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(245, 239, 220, ${star.opacity})`;
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 月／日与光晕
  if (painting.orb) {
    const { x, y, r, color, glow } = painting.orb;
    const halo = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 7);
    halo.addColorStop(0, `${glow}55`);
    halo.addColorStop(0.35, `${glow}1f`);
    halo.addColorStop(1, `${glow}00`);
    ctx.fillStyle = halo;
    ctx.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);

    const disc = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
    disc.addColorStop(0, '#fffdf2');
    disc.addColorStop(1, color);
    ctx.beginPath();
    ctx.fillStyle = disc;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const drawRidges = (from: number, to: number) => {
    for (let i = from; i < to && i < painting.ridges.length; i += 1) {
      const ridge = painting.ridges[i];
      ctx.beginPath();
      ctx.moveTo(ridge.points[0].x, ridge.points[0].y);
      for (let p = 1; p < ridge.points.length; p += 1) {
        const prev = ridge.points[p - 1];
        const point = ridge.points[p];
        const cx = (prev.x + point.x) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cx, (prev.y + point.y) / 2);
      }
      const last = ridge.points[ridge.points.length - 1];
      ctx.lineTo(last.x, ART_HEIGHT);
      ctx.lineTo(0, ART_HEIGHT);
      ctx.closePath();
      ctx.fillStyle = ridge.color;
      ctx.fill();
    }
  };

  const half = Math.ceil(painting.ridges.length / 2);
  drawRidges(0, half);

  // 水汽
  for (const band of painting.mist) {
    const mist = ctx.createLinearGradient(0, band.y - band.height / 2, 0, band.y + band.height / 2);
    mist.addColorStop(0, 'rgba(230, 240, 236, 0)');
    mist.addColorStop(0.5, `rgba(230, 240, 236, ${band.opacity})`);
    mist.addColorStop(1, 'rgba(230, 240, 236, 0)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, band.y - band.height / 2, ART_WIDTH, band.height);
  }

  // 水面
  if (painting.water) {
    const { y, color, highlight } = painting.water;
    const water = ctx.createLinearGradient(0, y, 0, ART_HEIGHT);
    water.addColorStop(0, color);
    water.addColorStop(1, '#02090b');
    ctx.fillStyle = water;
    ctx.fillRect(0, y, ART_WIDTH, ART_HEIGHT - y);
    ctx.strokeStyle = `${highlight}44`;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 16; i += 1) {
      const lineY = y + 14 + i * ((ART_HEIGHT - y) / 18);
      const startX = 40 + ((i * 137) % 600);
      ctx.beginPath();
      ctx.moveTo(startX, lineY);
      ctx.lineTo(startX + 120 + ((i * 71) % 260), lineY);
      ctx.stroke();
    }
  }

  drawRidges(half, painting.ridges.length);

  // 前景点景
  for (const accent of painting.accents) {
    ctx.save();
    ctx.translate(accent.x, accent.y);
    ctx.scale(accent.scale, accent.scale);
    ctx.fillStyle = accent.color;
    ctx.strokeStyle = accent.color;

    if (accent.kind === 'pine') {
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-4, -110);
      ctx.lineTo(4, -110);
      ctx.lineTo(4, 0);
      ctx.fill();
      for (let layer = 0; layer < 3; layer += 1) {
        const w = 52 - layer * 12;
        const top = -108 - layer * 34;
        ctx.beginPath();
        ctx.moveTo(0, top - 54);
        ctx.lineTo(-w, top);
        ctx.lineTo(w, top);
        ctx.closePath();
        ctx.fill();
      }
    } else if (accent.kind === 'temple') {
      for (let tier = 0; tier < 3; tier += 1) {
        const y = -tier * 34;
        const w = 150 - tier * 26;
        ctx.beginPath();
        ctx.moveTo(-w, y);
        ctx.quadraticCurveTo(-w * 0.4, y - 26, 0, y - 30);
        ctx.quadraticCurveTo(w * 0.4, y - 26, w, y);
        ctx.lineTo(w * 0.72, y + 6);
        ctx.lineTo(-w * 0.72, y + 6);
        ctx.closePath();
        ctx.fill();
      }
    } else if (accent.kind === 'tower') {
      ctx.fillRect(-26, -96, 52, 96);
      ctx.beginPath();
      ctx.moveTo(-52, -96);
      ctx.quadraticCurveTo(0, -132, 52, -96);
      ctx.closePath();
      ctx.fill();
    } else if (accent.kind === 'boat') {
      ctx.beginPath();
      ctx.moveTo(-70, 0);
      ctx.quadraticCurveTo(0, 34, 70, 0);
      ctx.quadraticCurveTo(0, 16, -70, 0);
      ctx.fill();
      ctx.fillRect(-3, -70, 5, 70);
      ctx.beginPath();
      ctx.moveTo(2, -68);
      ctx.quadraticCurveTo(40, -40, 2, -18);
      ctx.fill();
    } else {
      for (let i = 0; i < 5; i += 1) {
        const x = i * 14 - 28;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.quadraticCurveTo(x + 6, -46 - i * 8, x + 16, -78 - i * 6);
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 雨／雪
  if (painting.weather.kind === 'rain') {
    ctx.strokeStyle = 'rgba(214, 232, 232, 0.4)';
    ctx.lineWidth = 1.2;
    for (const drop of painting.weather.particles) {
      ctx.globalAlpha = drop.opacity;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - 8, drop.y + drop.len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (painting.weather.kind === 'snow') {
    ctx.fillStyle = 'rgba(240, 246, 244, 0.85)';
    for (const flake of painting.weather.particles) {
      ctx.globalAlpha = flake.opacity;
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.len, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/** 按场景画一张完整画面（含轻微推镜），供录制的每一帧调用。 */
export function paintSceneFrame(
  ctx: CanvasRenderingContext2D,
  painting: Painting,
  progress: number,
  scale = 1.06,
): void {
  const { width, height } = ctx.canvas;
  ctx.save();
  ctx.fillStyle = '#04100f';
  ctx.fillRect(0, 0, width, height);
  const zoom = 1 + (scale - 1) * progress;
  ctx.translate(width / 2, height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-width / 2, -height / 2);
  paintPainting(ctx, painting, width, height);
  ctx.restore();
}

export function paintingForScene(scene: Scene, seedPrefix = ''): Painting {
  return buildPainting(`${seedPrefix}${scene.id}`, scene.motifs, scene.palette);
}
