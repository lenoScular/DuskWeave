import type { ReactNode } from 'react';

export const field = 'mt-2 block h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-surface-foreground placeholder:text-quiet';
export const area = 'mt-2 block w-full resize-y rounded-control border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-surface-foreground placeholder:text-quiet';
export const primary = 'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-control bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-55';
export const secondary = 'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-control border border-line px-3.5 text-sm text-muted hover:border-primary/40 hover:text-surface-foreground disabled:cursor-not-allowed disabled:opacity-55';

export function SettingsPage({ breadcrumb, title, summary, children }: { breadcrumb: ReactNode; title: string; summary: string; children: ReactNode }) {
  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line/65 px-8">
        <div className="flex items-center gap-2.5 text-sm">{breadcrumb}</div>
        <span className="flex items-center gap-2 whitespace-nowrap text-xs text-quiet">
          <span className="icon-[lucide--flask-conical] size-3.5" aria-hidden="true" />
          演示配置
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8 pt-7">
        <h1 className="font-display text-[40px] font-semibold leading-tight">{title}</h1>
        <p className="mt-2 text-muted">{summary}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
