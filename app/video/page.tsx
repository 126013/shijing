import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { VideoGallery } from '@/components/video-gallery/VideoGallery';

export const metadata = {
  title: '影片馆 · 诗境',
  description: '回看、下载与删除在阅读页生成的诗词短片。',
};

export default function VideoPage() {
  return (
    <main>
      <SiteHeader solid />
      <section style={{ paddingTop: 132, paddingBottom: 90 }}>
        <div className="wrap">
          <p className="eyebrow">FILM GALLERY · 影片馆</p>
          <h1 className="library-title">影片馆</h1>
          <p className="muted" style={{ marginTop: 14, maxWidth: 760, fontSize: 13.5 }}>
            在阅读页点「生成短片」后，逐幕画面、诗句字幕与意境配乐会在浏览器里合成为一部短片，
            保存在本机（IndexedDB），随时回看与下载，不会上传到任何服务器。
          </p>
          <div style={{ marginTop: 34 }}>
            <VideoGallery />
          </div>
          <p style={{ marginTop: 30 }}>
            <Link className="btn btn-sm" href="/library">
              ← 回书库再生成一部
            </Link>
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
