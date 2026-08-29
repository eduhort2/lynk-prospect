"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function BrandLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="brand-loader fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      role="status"
      aria-label="Carregando LYNK Hub"
    >
      <div className="brand-loader__content flex flex-col items-center">
        <Image
          src="/brand/lynk-mark.png"
          alt="Símbolo LYNK"
          width={88}
          height={88}
          priority
          className="brand-loader__logo h-20 w-20 object-contain sm:h-24 sm:w-24"
        />
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[.28em] text-[#C3DFEA]">LYNK Hub</p>
        <div className="brand-loader__track mt-5 h-px w-36 overflow-hidden bg-white/10 sm:w-44"><span className="brand-loader__progress block h-full bg-primary-light" /></div>
      </div>
      <span className="sr-only">Carregando LYNK Hub</span>
    </div>
  );
}
