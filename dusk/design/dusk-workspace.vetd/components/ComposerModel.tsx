import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { reasoningLabels } from './chat-models';
import type { ChatModel, Reasoning } from './chat-models';

export type ChatChoice = ChatModel & { key: string; service: string; serviceName: string };

export function ComposerModel({ options, selected, level, pick, setLevel, startOpen = false }: {
  options: ChatChoice[]; selected?: ChatChoice; level?: Reasoning; pick: (key: string) => void; setLevel: (key: Reasoning) => void; startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [query, setQuery] = useState('');
  const host = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !host.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && host.current?.contains(document.activeElement)) {
        event.preventDefault(); setOpen(false); trigger.current?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);

  if (!selected) return <Link to="/models" className="rounded-control px-2 py-1.5 text-xs text-primary hover:bg-raised">选择对话模型</Link>;
  const show = options.filter((model) => `${model.name} ${model.identifier} ${model.serviceName}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return (
    <div ref={host} className="relative min-w-0">
      <button ref={trigger} type="button" aria-label="模型与推理强度" aria-expanded={open} aria-controls="composer-model-menu" onClick={() => { setQuery(''); setOpen(!open); }} className="flex h-8 max-w-full items-center gap-2 rounded-control px-2 text-xs text-muted hover:bg-raised hover:text-surface-foreground">
        <span className="max-w-40 truncate font-semibold text-surface-foreground">{selected.name}</span>
        {level && <span className="shrink-0 text-quiet">· {level === 'off' ? '不推理' : `${reasoningLabels[level]}推理`}</span>}
        <span className="icon-[lucide--chevron-down] size-3.5 shrink-0" aria-hidden="true" />
      </button>
      {open && (
        <section id="composer-model-menu" aria-label="模型与推理设置" className="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-control border border-line bg-panel text-sm shadow-xl">
          <div className="px-3 pb-2 pt-3">
            <label className="flex items-center gap-2 rounded-control bg-surface px-2.5 text-muted">
              <span className="icon-[lucide--search] size-3.5 shrink-0" aria-hidden="true" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} aria-label="搜索会话模型" placeholder="搜索已启用的模型" className="h-9 w-full min-w-0 bg-transparent text-xs text-surface-foreground outline-none placeholder:text-quiet" />
            </label>
          </div>
          <ul className="max-h-48 overflow-y-auto px-2 pb-2">
            {show.map((option) => (
              <li key={option.key}>
                <button type="button" aria-pressed={option.key === selected.key} onClick={() => pick(option.key)} className={`flex min-h-9 w-full items-center gap-2 rounded-control px-2 text-left ${option.key === selected.key ? 'bg-raised' : 'hover:bg-raised'}`}>
                  <span className="min-w-0 flex-1 truncate">{option.name}</span>
                  <span className="shrink-0 text-xs text-quiet">{option.serviceName}</span>
                  {option.key === selected.key && <span className="icon-[lucide--check] size-3.5 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              </li>
            ))}
            {!show.length && <li className="px-2 py-2 text-xs text-quiet">没有匹配的已启用模型。</li>}
          </ul>
          <div className="border-t border-line/65 px-3 py-3">
            <h3 className="text-xs font-semibold">推理强度</h3>
            {selected.levels.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="推理强度">
                {selected.levels.map((item) => (
                  <button key={item} type="button" aria-pressed={level === item} aria-label={`${reasoningLabels[item]}推理`} onClick={() => { setLevel(item); setOpen(false); trigger.current?.focus(); }} className={`rounded-control px-2.5 py-1.5 text-xs ${level === item ? 'bg-stamp text-primary' : 'text-muted hover:bg-raised'}`}>{reasoningLabels[item]}</button>
                ))}
              </div>
            ) : <p className="mt-1.5 text-xs text-quiet">此模型没有可调的推理强度。</p>}
            <p className="mt-2 text-xs text-quiet">仅影响本会话之后发送的消息。</p>
          </div>
        </section>
      )}
    </div>
  );
}
