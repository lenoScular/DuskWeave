export const frame = { width: 1440, height: 900, title: '暮色群像 · 初始集群肖像册' };

import { Link, useSearchParams } from 'react-router';
import { useWorkspace } from './_layout';

export default function CrewPortraitsFrame() {
  const { parties } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const teams = parties.filter((party) => party.kind === 'cluster' && (party.id === 'dev' || party.id === 'design'));
  const team = teams.find((party) => party.id === params.get('team')) ?? teams[0];
  if (!team) return <main className="p-8"><h1>暮色群像</h1><p className="mt-3 text-muted">当前没有集群照片。</p></main>;
  const people = team.members.map((member, index) => ({ member, index })).filter(({ member }) => member.portrait);

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden" aria-label="集群肖像册">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line/65 px-8">
        <span>智能体名册 / 初始集群肖像册</span>
        <Link to={`/roster?kind=cluster&id=${team.id}`} className="text-sm text-primary hover:underline">返回{team.name}</Link>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="font-display text-[42px] font-semibold leading-tight">暮色群像</h1>
            <p className="mt-2 text-muted">从头像认出同伴，点开看工作卡和人物档案。</p>
          </div>
          <nav aria-label="肖像册集群" className="flex gap-6 border-b border-line/70">
            {teams.map((party) => <button key={party.id} type="button" aria-pressed={party.id === team.id} onClick={() => setParams({ team: party.id }, { replace: true })} className={`h-10 whitespace-nowrap border-b-2 px-1 ${party.id === team.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-surface-foreground'}`}>{party.name} <span className="ml-1 text-xs text-quiet">{party.members.length} 人</span></button>)}
          </nav>
        </div>
        <ul aria-label={`${team.name}肖像`} className={`mt-5 grid gap-x-4 gap-y-4 ${team.id === 'design' ? 'grid-cols-4 xl:grid-cols-5' : 'grid-cols-5 xl:grid-cols-7'}`}>
          {people.map(({ member, index }) => (
            <li key={member.key ?? index} className="min-w-0">
              <Link to={`/member-card?team=${team.id}&i=${index}&pane=person`} className="group block rounded-control text-left">
                <img src={member.portrait!.src} alt={`${member.name}的档案照`} className="block aspect-square w-full rounded-control object-cover object-[50%_28%] ring-inset group-hover:ring-2 group-hover:ring-primary/60" />
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="truncate font-semibold group-hover:text-primary">{member.name}</span>
                  <span className="shrink-0 text-xs text-quiet">{member.gender}</span>
                </div>
                <p className="truncate text-xs text-quiet">{member.role}{index === 0 ? ' · 代表' : ''}</p>
              </Link>
            </li>
          ))}
        </ul>
        {!people.length && <p className="mt-5 text-muted">此集群还没有成员肖像。</p>}
      </div>
    </main>
  );
}
