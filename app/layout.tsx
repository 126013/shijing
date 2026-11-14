import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '诗境 · 中国古典诗词沉浸馆',
  description:
    '按年代、作者、题材探索古典诗词，沿诗人足迹漫游山河，在分幕画面、朗读与配乐中步入诗境。',
  applicationName: '诗境',
  openGraph: {
    title: '诗境 · 中国古典诗词沉浸馆',
    description: '诗人行迹、古典书库、分幕画面与朗读配乐。',
    locale: 'zh_CN',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#071318',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
