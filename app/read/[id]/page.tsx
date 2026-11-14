import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reader } from '@/components/reader/Reader';
import { getPoem } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { poem } = await getPoem(id);
  if (!poem) return { title: '未找到这首诗 · 诗境' };
  return {
    title: `${poem.title} · ${poem.author} · 诗境`,
    description: poem.scenes.map((scene) => scene.lines.join('')).join(' ').slice(0, 80),
  };
}

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { poem, source } = await getPoem(id);

  if (!poem) {
    return (
      <main className="wrap" style={{ paddingTop: 160, paddingBottom: 120, textAlign: 'center' }}>
        <h1 style={{ fontSize: 40, letterSpacing: '0.2em' }}>此境未开</h1>
        <p className="muted" style={{ margin: '18px 0 30px' }}>
          没有找到这首诗，它可能不在当前数据源里。
        </p>
        <Link className="btn" href="/library">
          回书库看看 →
        </Link>
      </main>
    );
  }

  return (
    <main>
      <Reader poem={poem} source={source} />
    </main>
  );
}
