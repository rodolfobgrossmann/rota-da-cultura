import type { ReactNode } from "react";

import { Poster } from "@/components/site/ui";

export function AuthLayout({ title, footer, children }: { title: ReactNode; footer: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto grid w-full max-w-7xl flex-1 gap-10 px-5 pt-8 md:px-10 md:pt-12 lg:grid-cols-[1.08fr_1fr] lg:gap-16">
      <Poster
        circle="corner"
        className="min-h-[340px] animate-rise [--poster-size:62%] [--poster-top:-20%] [--poster-right:-14%] lg:min-h-[640px] lg:p-12"
        title={title}
        titleClassName="text-5xl sm:text-6xl xl:text-[5.2rem]"
        footer={<span className="normal-case tracking-normal text-lg">{footer}</span>}
      />
      <div className="flex items-center lg:px-6">
        <div className="w-full max-w-[34rem] animate-rise [animation-delay:80ms]">{children}</div>
      </div>
    </main>
  );
}

export function safeRedirect(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
