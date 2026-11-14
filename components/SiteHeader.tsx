'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: '首页' },
  { href: '/library', label: '书库' },
  { href: '/video', label: '影片馆' },
];

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  const pathname = usePathname();

  return (
    <header className={`site-header${solid ? ' is-solid' : ''}`}>
      <Link href="/" className="brand" aria-label="诗境 首页">
        诗境
        <small>SHI JING · IMMERSIVE</small>
      </Link>
      <nav className="nav-links" aria-label="主导航">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
