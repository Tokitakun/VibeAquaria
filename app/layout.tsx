import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'VibeAquaria AI',
  description: 'Asisten pakar aquascape berkelanjutan yang didukung oleh Gemini AI, memberikan saran tentang identifikasi ikan/tanaman, panduan tema aquascape, dan pengecekan kecocokan spesies.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐠</text></svg>',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id">
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
