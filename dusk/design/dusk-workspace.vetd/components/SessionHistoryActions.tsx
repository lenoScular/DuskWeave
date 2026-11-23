import { useEffect, useId, useRef, useState } from 'react';
import { field, primary, secondary } from './SettingsParts';
import type { Session } from './demo';

export type HistoryAction = 'rename' | 'delete';

export function SessionActions({ name, onAction }: { name: string; onAction: (action: HistoryAction) => void }) {
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const actionsId = useId();
  function pick(action: HistoryAction) {
    menu.current?.hidePopover();
    trigger.current?.focus();
    onAction(action);
  }

  return (
    <>
      <button ref={trigger} type="button" popoverTarget={actionsId} aria-label={`会话操作：${name}`} title="会话操作"
        className="grid size-6 shrink-0 place-items-center rounded-control text-quiet hover:bg-surface hover:text-surface-foreground"
        onClick={() => {
          const anchor = trigger.current?.getBoundingClientRect();
          const surface = menu.current;
          if (!anchor || !surface) return;
          const view = surface.ownerDocument.documentElement;
          surface.style.left = `${Math.max(8, Math.min(anchor.right - 156, view.clientWidth - 164))}px`;
          surface.style.top = `${anchor.bottom + 108 < view.clientHeight ? anchor.bottom + 4 : Math.max(8, anchor.top - 96)}px`;
        }}>
        <span className="icon-[lucide--ellipsis] size-4" aria-hidden="true" />
      </button>
      <div ref={menu} id={actionsId} popover="auto" aria-label={`${name}的会话操作`} className="fixed inset-auto m-0 w-[156px] rounded-control border border-line bg-panel p-1.5 font-sans text-sm text-surface-foreground shadow-xl">
        <button type="button" autoFocus onClick={() => pick('rename')} className="flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-left hover:bg-raised">
          <span className="icon-[lucide--pencil] size-4 text-quiet" aria-hidden="true" />重命名
        </button>
        <button type="button" onClick={() => pick('delete')} className="flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-left text-rose hover:bg-clay/55">
          <span className="icon-[lucide--trash-2] size-4" aria-hidden="true" />删除会话
        </button>
      </div>
    </>
  );
}

export function SessionHistoryDialog({ action, session, scope, cancel, confirm }: { action: HistoryAction; session: Session; scope: string; cancel: () => void; confirm: (name: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const initialFocus = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(session.name);
  const removing = action === 'delete';
  const titleId = useId();
  const copyId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    initialFocus.current?.select();
    return () => { if (element?.open) element.close(); };
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={copyId}
      className="m-auto w-[448px] max-w-[calc(100%_-_32px)] rounded-control border border-line bg-panel px-6 py-5 font-sans text-sm text-surface-foreground shadow-xl backdrop:bg-scrim/75"
      onCancel={(event) => { event.preventDefault(); cancel(); }}>
      <form onSubmit={(event) => { event.preventDefault(); if (removing || name.trim()) confirm(name.trim()); }}>
        <h2 id={titleId} className="font-display text-[28px] font-semibold leading-tight">{removing ? '删除会话？' : '重命名会话'}</h2>
        <p className="mt-2 text-xs text-quiet">{scope}</p>
        {removing ? (
          <p id={copyId} className="mt-4 break-words leading-relaxed text-muted">
            「<strong className="font-semibold text-surface-foreground">{session.name}</strong>」的对话、草稿、关联任务和设计记录将被删除。项目目录、本地文件和其他会话不受影响。此操作无法撤销。
          </p>
        ) : (
          <>
            <label className="mt-4 block font-medium">会话名称
              <input ref={initialFocus} autoFocus className={field} value={name} maxLength={48} required onChange={(event) => setName(event.target.value)} />
            </label>
            <p id={copyId} className="mt-2 text-xs text-quiet">新名称会显示在侧栏和会话顶部，不影响对话记录。</p>
          </>
        )}
        <div className="mt-5 flex justify-end gap-2.5">
          <button type="button" autoFocus={removing} onClick={cancel} className={secondary}>取消</button>
          <button type="submit" disabled={!removing && !name.trim()} className={removing ? 'h-9 rounded-control bg-rose px-4 font-semibold text-scrim hover:bg-rose/85' : primary}>
            {removing ? '确认删除' : '保存名称'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
