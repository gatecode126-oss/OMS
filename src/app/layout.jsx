import { Inter, Caveat } from 'next/font/google';
import '@/styles/index.css';
import ClientRoot from './client-root';

// Self-hosted at build time (no render-blocking request to Google Fonts at runtime)
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap'
});

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-caveat',
  display: 'swap'
});

export const metadata = {
  title: 'Gatecode OMS - Workforce Management Dashboard',
  icons: { icon: { url: '/react.svg', type: 'image/svg+xml' } }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${caveat.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
