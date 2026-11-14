import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { LibraryBrowser } from '@/components/library/LibraryBrowser';
import { getMeta } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '书库 · 诗境',
  description: '按朝代、题材、作者筛选古典诗词，支持关键词检索与随机入一境。',
};

export default async function LibraryPage() {
  const meta = await getMeta();

  return (
    <main>
      <SiteHeader solid />
      <section className="library-head">
        <div className="wrap">
          <p className="eyebrow">LIBRARY · 漫游书库</p>
          <h1 className="library-title">步入一首诗的电影</h1>
          <p className="muted" style={{ marginTop: 14, maxWidth: 720, fontSize: 13.5 }}>
            共收录 {meta.total} 首精选诗词 · 按朝代、作者、题材筛选，每一首都被拆成电影分镜，配以画面与朗读。
            {meta.source === 'curated' && meta.degradedReason ? ` ${meta.degradedReason}` : ''}
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: 80 }}>
        <div className="wrap">
          <LibraryBrowser initialMeta={meta} />
          <p style={{ marginTop: 26, fontSize: 12.5, color: 'var(--ink-mute)' }}>
            想看全量 344,315 首数据？把 <code>.env.example</code> 里的 <code>POETRY_API_BASE</code>{' '}
            指向线上接口即可，接口不可用时会自动回到仓库精选集并给出提示。
          </p>
          <p style={{ marginTop: 10 }}>
            <Link className="btn btn-sm" href="/">
              ← 回到首页
            </Link>
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
