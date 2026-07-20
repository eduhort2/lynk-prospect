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
      <Image
        src="/brand/lynk-logo.png"
        alt="LYNK"
        width={210}
        height={76}
        priority
        className="brand-loader__logo h-auto w-[170px] sm:w-[210px]"
      />
      <span className="sr-only">Carregando</span>
    </div>
  );
}
