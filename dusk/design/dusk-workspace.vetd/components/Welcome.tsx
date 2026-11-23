import { Link } from 'react-router';
import { useWorkspace } from '../frames/_layout';
import forest from '../assets/dusk-forest.svg';

export function Welcome() {
  const { createTemporarySession, openDemo, defaultModel, defaultLegend } = useWorkspace();
  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line/65 px-8 text-muted">
        <span className="icon-[lucide--trees] size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>暮色工作台</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-[1040px]">
          <section className="relative isolate flex min-h-[384px] flex-col justify-center overflow-hidden rounded-control border border-line/70 bg-rail px-10 py-10" aria-labelledby="welcome-title">
            <img src={forest} alt="" className="pointer-events-none absolute inset-0 -z-10 size-full object-cover object-[64%_50%]" />
            <div className="max-w-[430px]">
              <h1 id="welcome-title" className="font-display text-[58px] font-semibold leading-tight">欢迎来到暮色</h1>
              <p className="mt-4 text-base leading-relaxed text-surface-foreground/90">打开一个项目，或者先聊一件事。<br />传奇与集群可以在你需要时加入。</p>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/workspace-picker" state={{ returnTo: '/' }} className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-control bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90">
                <span className="icon-[lucide--folder-open] size-4 shrink-0" aria-hidden="true" />
                打开项目目录
              </Link>
              <button type="button" onClick={createTemporarySession} className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-control border border-surface-foreground/35 bg-rail/75 px-4 font-medium text-surface-foreground hover:bg-raised">
                <span className="icon-[lucide--message-square-dashed] size-4 shrink-0" aria-hidden="true" />
                新建临时会话
              </button>
            </div>
          </section>
          <dl className="mt-6 grid grid-cols-2 gap-8 px-1">
            <div>
              <dt className="font-semibold">在目录里做事</dt>
              <dd className="mt-1 leading-relaxed text-muted">一个项目能开多场会话，历史按目录归在一起。</dd>
            </div>
            <div>
              <dt className="font-semibold">不打开目录也能开始</dt>
              <dd className="mt-1 leading-relaxed text-muted">临时会话不使用项目文件。{defaultLegend && `和项目会话一样，默认由${defaultLegend.name}接手。`}</dd>
            </div>
          </dl>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-line/70 px-1 pt-4">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span className="icon-[lucide--sliders-horizontal] size-4 shrink-0 text-quiet" aria-hidden="true" />
              {defaultModel ? '可在设置中调整默认模型。' : '还没配置对话模型。先建项目或会话，之后再配置也可以。'}
              <Link to="/models" className="text-primary hover:underline">模型设置</Link>
            </p>
            <button type="button" onClick={() => openDemo()} className="flex items-center gap-1.5 whitespace-nowrap rounded-control text-sm text-iris hover:underline">
              体验示例：桥边初会
              <span className="icon-[lucide--arrow-right] size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
