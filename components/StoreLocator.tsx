'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Store } from 'lucide-react';

const StoreLocatorMapDynamic = dynamic(() => import('./StoreLocatorMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center p-8 bg-white/50 rounded-[32px]">
      <p className="text-sm font-sans text-[#5A5A40] flex items-center gap-2">Memuat Peta...</p>
    </div>
  )
});

export function StoreLocator({ height = '400px' }: { height?: string }) {
  return (
    <div style={{ height }} className="w-full relative rounded-[32px] overflow-hidden border border-[#5A5A40]/10 shadow-sm relative z-0">
      <StoreLocatorMapDynamic />
    </div>
  );
}
