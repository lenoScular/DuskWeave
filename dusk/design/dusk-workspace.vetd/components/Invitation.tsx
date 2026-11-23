import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useWorkspace } from '../frames/_layout';
import { PartyStamp } from './PartyStamp';
import type { Party } from './demo';

const tabs = [ ['all', '全部'], ['legend', '传奇'], ['cluster', '集群'] ] as const;

export function Invitation() {
  const { session, parties, invite } = useWorkspace();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof tabs)[number][0]>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
    return () => { if (node?.open) node.close(); };
  }, []);

  const candidates = parties.filter((party) => (party.kind === 'legend' || party.members.length > 0) && (filter === 'all' || party.kind === filter) && `${party.name} ${party.role} ${party.note}`.includes(query.trim()));
  const groups = [
    { heading: '传奇', kind: 'legend', blurb: '独立参与、独立发言' },
    { heading: '集群', kind: 'cluster', blurb: '由会话代表回应' },
  ] as const;

  function select(party: Party) {
    setSelected((current) => current.includes(party.id) ? current.filter((id) => id !== party.id) : [...current, party.id]);
  }

  return (
    <dialog ref={dialog} aria-labelledby="invite-title" onCancel={(event) => { event.preventDefault(); navigate('/'); }} className="fixed inset-0 m-auto flex max-h-[calc(100%-48px)] w-[620px] max-w-[calc(100%-48px)] flex-col overflow-hidden rounded-control border border-line bg-panel p-0 text-surface-foreground shadow-xl backdrop:bg-scrim/75">
      <div className="flex items-start justify-between gap-4 px-7 pb-4 pt-6">
        <div className="min-w-0">
          <h2 id="invite-title" className="font-display text-[30px] font-semibold leading-tight">邀请参与者</h2>
          <p className="mt-2 truncate text-sm text-muted">把传奇或集群请到「{session.name}」。二者可以同时加入。</p>
        </div>
        <Link to="/" aria-label="关闭邀请" className="grid size-8 shrink-0 place-items-center rounded-control text-muted hover:bg-raised hover:text-surface-foreground">
          <span className="icon-[lucide--x] size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="shrink-0 px-7">
        <label className="flex h-10 items-center gap-2.5 rounded-control border border-line bg-surface px-3 text-muted focus-within:border-primary/50">
          <span className="icon-[lucide--search] size-4" aria-hidden="true" />
          <input autoFocus aria-label="搜索传奇和集群" placeholder="搜索名称或职责" className="min-w-0 flex-1 border-none bg-transparent text-sm text-surface-foreground outline-none placeholder:text-quiet focus-visible:outline-none" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <nav className="mt-3 flex gap-5 border-b border-line/70" aria-label="邀请筛选">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`h-9 border-b-2 px-1 ${filter === id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-surface-foreground'}`}>{label}</button>
          ))}
        </nav>
      </div>
      <div className="min-h-24 flex-1 overflow-y-auto px-7 pb-4 pt-4">
        {candidates.length ? groups.map((group) => {
          const matches = candidates.filter((party) => party.kind === group.kind);
          if (!matches.length) return null;
          return (
            <section key={group.kind} className="mb-4 last:mb-0">
              <h3 className="mb-2 flex items-baseline gap-3 text-sm font-semibold">
                {group.heading}
                <span className="text-xs font-normal text-quiet">{group.blurb}</span>
              </h3>
              {matches.map((party) => {
                const joined = session.party.includes(party.id);
                const checked = selected.includes(party.id);
                return (
                  <button type="button" key={party.id} onClick={() => select(party)} disabled={joined} aria-pressed={checked} className={`flex min-h-12 w-full items-center gap-3 rounded-control px-2.5 py-2 text-left ${checked ? 'bg-stamp/60' : 'hover:bg-raised disabled:hover:bg-transparent'}`}>
                    <PartyStamp party={party} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{party.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-quiet">{party.role}{party.kind === 'cluster' ? ` · ${party.members.length} 个普通角色` : ''}</span>
                    </span>
                    {joined ? <span className="shrink-0 text-xs text-quiet">已在会话</span> : (
                      <span className={`grid size-4 shrink-0 place-items-center rounded-sm border ${checked ? 'border-primary bg-primary text-primary-foreground' : 'border-quiet/70'}`} aria-hidden="true">
                        {checked && <span className="icon-[lucide--check] size-3.5" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </section>
          );
        }) : <p className="py-8 text-sm text-muted">没找到匹配的参与者。试试「开发」或「复核」。</p>}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line/70 px-7 py-4">
        <p className="text-xs text-muted" aria-live="polite">{selected.length ? `已选 ${selected.length} 位 / 组` : '可同时选择多位伙伴'}</p>
        <div className="flex shrink-0 items-center gap-4">
          <Link to="/" className="text-sm text-muted hover:text-surface-foreground">取消</Link>
          <button type="button" disabled={!selected.length} onClick={() => { invite(selected); navigate('/'); }} className="h-9 rounded-control bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-55">加入会话</button>
        </div>
      </div>
    </dialog>
  );
}
