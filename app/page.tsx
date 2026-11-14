import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { PoetTrail } from '@/components/home/PoetTrail';
import { SceneStage } from '@/components/scene/SceneStage';
import { poems } from '@/data/poems';
import { poets } from '@/data/poets';
import { getMeta, summarize } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

const HERO_SCENE = poems.find((poem) => poem.id === 'shan-ju-qiu-ming')!.scenes[1];

const VERSE_COLUMNS = [
  { text: '海内存知己，天涯若比邻。', author: '王勃' },
  { text: '空山新雨后，天气晚来秋。', author: '王维' },
  { text: '野旷天低树，江清月近人。', author: '孟浩然' },
  { text: '孤舟蓑笠翁，独钓寒江雪。', author: '柳宗元' },
  { text: '大漠孤烟直，长河落日圆。', author: '王维' },
  { text: '月落乌啼霜满天，江枫渔火对愁眠。', author: '张继' },
  { text: '夕阳西下，断肠人在天涯。', author: '马致远' },
  { text: '兴尽晚回舟，误入藕花深处。', author: '李清照' },
  { text: '欲穷千里目，更上一层楼。', author: '王之涣' },
];

export default async function HomePage() {
  const meta = await getMeta();
  const featured = poems.slice(0, 6).map(summarize);

  return (
    <main>
      <SiteHeader />

      <section className="hero">
        <div className="hero-stage" aria-hidden="true">
          <SceneStage scene={HERO_SCENE} seedPrefix="hero-" motion />
        </div>
        <div className="hero-scrim" aria-hidden="true" />
        <div className="hero-verses" aria-hidden="true">
          {VERSE_COLUMNS.map((column, index) => (
            <span
              key={column.author + index}
              className="verse-column"
              style={{
                left: `${3.5 + index * 11.4}%`,
                fontSize: `${index % 3 === 0 ? 15 : 13}px`,
                animationDelay: `${index * 1.3}s`,
                height: `${52 + (index % 3) * 5}vh`,
              }}
            >
              {column.text}
              <b>{column.author}</b>
            </span>
          ))}
        </div>

        <div className="hero-inner">
          <p className="hero-sub">IMMERSIVE CLASSICAL CHINESE POETRY</p>
          <h1 className="hero-title">诗境</h1>
          <p className="hero-lede">
            按朝代、作者、题材漫游山河，检索喜欢的诗词；读诗时每一句都被拆成一幕画面，
            配以 AI 朗读、白话译文与意境配乐，最后一键合成一部可以回看的知识短片。
          </p>
          <p className="hero-lede" style={{ marginTop: 12 }}>
            <strong>{meta.total}</strong> 首精选诗词 · 唐 / 宋 / 元 · 每位诗人都有他走过的山河
          </p>
          <div className="hero-actions">
            <Link className="btn btn-gold" href="#trail">
              ✦ 步入诗人行迹
            </Link>
            <Link className="btn" href="/library">
              ≡ 漫游书库
            </Link>
            <Link className="btn" href="/read/jing-ye-si">
              ✧ 随机入一境
            </Link>
          </div>
        </div>

        <p className="scroll-hint">向下漫游 · 打开千年山河</p>
      </section>

      <section className="section" id="trail">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">POETS ON THE ROAD</p>
              <h2>诗人行迹</h2>
            </div>
            <p>
              点选一位诗人，看他生在何处、走过哪里、留下哪几首诗。
              图中节点为示意排布，不作地理依据。
            </p>
          </div>
          <PoetTrail poets={poets} />
        </div>
      </section>

      <section className="section" id="library-preview">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">CURATED LIBRARY</p>
              <h2>先读这六首</h2>
            </div>
            <div className="stat-row">
              <div className="stat">
                <b>{meta.total}</b>
                <span>精选诗词</span>
              </div>
              <div className="stat">
                <b>{poets.length}</b>
                <span>诗人</span>
              </div>
              <div className="stat">
                <b>{poems.reduce((sum, poem) => sum + poem.scenes.length, 0)}</b>
                <span>分幕画面</span>
              </div>
            </div>
          </div>

          <div className="poem-grid">
            {featured.map((poem) => (
              <Link key={poem.id} className="poem-card" href={`/read/${poem.id}`}>
                <h3>{poem.title}</h3>
                <p className="author">
                  {poem.dynasty} · {poem.author}
                </p>
                <p className="opening">{poem.opening}</p>
                <div className="card-foot">
                  <span className="tag">{poem.theme}</span>
                  <span className="tag">{poem.sceneCount} 幕</span>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
            <Link className="btn" href="/library">
              进入书库，按朝代与题材筛选 →
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
