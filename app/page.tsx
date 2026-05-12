import VibeAquariaApp from '@/components/VibeAquariaApp';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 lg:pb-0">
      <VibeAquariaApp />
      
      {/* Footer */}
<footer className="w-full text-center py-4 text-sm text-gray-400 border-t border-gray-700">
  © 2026 VibeAquaria | Nafis · #JuaraVibeCoding
</footer>
    </main>
  );
}
