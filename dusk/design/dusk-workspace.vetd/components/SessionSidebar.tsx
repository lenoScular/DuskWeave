import { Link } from 'react-router';
import type { FolderSpace, Session } from './demo';
import { SessionActions, type HistoryAction } from './SessionHistoryActions';

export function SessionSidebar({ folders, expanded, sessions, active, query, setQuery, onToggle, onSelect, onNew, onManage, returnTo }: {
  folders: FolderSpace[];
  expanded: string[];
  sessions: Session[];
  active: string;
  query: string;
  setQuery: (value: string) => void;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onNew: (id: string | null) => void;
  onManage: (action: HistoryAction, id: string) => void;
  returnTo: string;
}) {
  const term = query.trim().toLocaleLowerCase();
  const matches = (session: Session) => !term || [session.name, ...session.messages.map((message) => message.text)].some((value) => value.toLocaleLowerCase().includes(term));
  const loose = sessions.filter((session) => session.folderId === null && matches(session));
  const byProject = folders.map((folder) => {
    const entries = sessions.filter((session) => session.folderId === folder.id);
    const nameMatches = `${folder.name} ${folder.path}`.toLocaleLowerCase().includes(term);
    return { folder, entries: nameMatches ? entries : entries.filter(matches), total: entries.length, nameMatches };
  }).filter(({ entries, nameMatches }) => nameMatches || entries.length);
  const utility = 'grid size-7 shrink-0 place-items-center rounded-control text-quiet hover:bg-raised hover:text-primary';

  function sessionRows(entries: Session[]) {
    return entries.map((entry) => (
      <li key={entry.id} className={`flex min-w-0 items-center rounded-control pr-0.5 ${active === entry.id ? 'bg-raised text-surface-foreground' : 'text-muted hover:bg-panel focus-within:bg-panel'}`}>
        <button type="button" onClick={() => onSelect(entry.id)} aria-current={active === entry.id ? 'true' : undefined} className="flex min-h-9 min-w-0 flex-1 items-center gap-1.5 rounded-control py-1.5 pl-1.5 text-left">
          <span className="icon-[lucide--message-square] size-3.5 shrink-0 text-quiet" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate" title={entry.name}>{entry.name}</span>
          {entry.when && entry.when !== '当前' && <span className="shrink-0 text-xs text-quiet">{entry.when}</span>}
        </button>
        <SessionActions name={entry.name} onAction={(action) => onManage(action, entry.id)} />
      </li>
    ));
  }

  return (
    <nav aria-label="项目与会话" className="mt-5 min-h-0 flex-1 overflow-y-auto pb-4" onScroll={(event) => {
      event.currentTarget.querySelector<HTMLElement>('[popover]:popover-open')?.hidePopover();
    }}>
      <label className="mb-4 flex h-8 items-center gap-2 rounded-control border border-line/70 px-2.5 text-quiet">
        <span className="icon-[lucide--search] size-3.5 shrink-0" aria-hidden="true" />
        <input aria-label="搜索项目与会话" placeholder="搜索项目与会话" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs text-surface-foreground outline-none placeholder:text-quiet focus-visible:outline-none" />
      </label>
      <section aria-label="临时会话">
        <div className="mb-1 flex items-center justify-between pl-2.5">
          <h2 className="text-xs font-semibold text-muted">对话 <span className="ml-1 font-normal text-quiet">不绑定项目</span></h2>
          <button type="button" onClick={() => onNew(null)} aria-label="新建临时会话" title="新建临时会话" className={utility}>
            <span className="icon-[lucide--plus] size-4" aria-hidden="true" />
          </button>
        </div>
        <ul className="space-y-0.5">{sessionRows(loose)}</ul>
        {!loose.length && !term && <p className="px-2.5 py-2 text-xs text-quiet">还没有临时会话</p>}
      </section>
      <section className="mt-5" aria-label="项目列表">
        <div className="mb-1 flex items-center justify-between pl-2.5">
          <h2 className="text-xs font-semibold text-muted">项目</h2>
          <Link to="/workspace-picker" state={{ returnTo }} aria-label="打开项目目录" title="打开项目目录" className={utility}>
            <span className="icon-[lucide--folder-plus] size-4" aria-hidden="true" />
          </Link>
        </div>
        {!folders.length && !term && <p className="px-2.5 py-2 text-xs text-quiet">还没有打开项目</p>}
        <ul className="space-y-2">
          {byProject.map(({ folder, entries, total }) => {
            const open = Boolean(term) || expanded.includes(folder.id);
            return (
              <li key={folder.id}>
                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={() => onToggle(folder.id)} disabled={Boolean(term)} aria-expanded={open} aria-controls={`project-sessions-${folder.id}`} title={folder.path} className="flex min-h-9 min-w-0 flex-1 items-center gap-1 rounded-control px-1.5 text-left hover:bg-panel">
                    <span className={`${open ? 'icon-[lucide--chevron-down]' : 'icon-[lucide--chevron-right]'} size-3.5 shrink-0 text-quiet`} aria-hidden="true" />
                    <span className={`${open ? 'icon-[lucide--folder-open]' : 'icon-[lucide--folder]'} size-4 shrink-0 text-primary`} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{folder.name}</span>
                    <span className="sr-only">{total} 场会话</span>
                  </button>
                  <button type="button" onClick={() => onNew(folder.id)} aria-label={`在${folder.name}新建会话`} title={`在${folder.name}新建会话`} className={utility}>
                    <span className="icon-[lucide--plus] size-4" aria-hidden="true" />
                  </button>
                </div>
                <ul id={`project-sessions-${folder.id}`} hidden={!open} aria-label={`${folder.name}会话`} className="ml-3.5 mt-0.5 space-y-0.5 border-l border-line/65 pl-2">
                  {sessionRows(entries)}
                  {!entries.length && <li className="px-2.5 py-2 text-xs text-quiet">还没有会话</li>}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>
      {term && !loose.length && !byProject.length && <p role="status" className="px-2.5 py-3 text-xs text-quiet">没有找到匹配的项目或会话</p>}
    </nav>
  );
}
