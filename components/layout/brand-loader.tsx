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
      aria-label="Carregando LYNK Prospect"
    >
      <div className="brand-loader__content flex flex-col items-center">
        <Image
          src="/brand/lynk-logo.png"
          alt="LYNK"
          width={210}
          height={76}
          priority
          className="brand-loader__logo h-auto w-[170px] sm:w-[210px]"
        />
        <div className="brand-loader__track mt-7 h-px w-36 overflow-hidden bg-white/10 sm:w-44"><span className="brand-loader__progress block h-full bg-primary-light" /></div>
      </div>
      <span className="sr-only">Carregando</span>
    </div>
  );
}
