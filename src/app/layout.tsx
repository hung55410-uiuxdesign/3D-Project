import type { Metadata } from 'next';
import { Syne, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-space-grotesk',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'edric studio® | Virtual 3D Store — Archive Y2K Brand',
  description:
    'Interactive 3D WebGL Virtual Showroom for Edric Studio® Archive Y2K Brand. Curated Drops Weekly — Rare Pieces Re-worn 24/7.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased overflow-hidden w-screen h-screen">
        {children}
      </body>
    </html>
  );
}
