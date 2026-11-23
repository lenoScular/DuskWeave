import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { primary, secondary } from './SettingsParts';
import { useWorkspace } from '../frames/_layout';
import { PartyStamp } from './PartyStamp';
import { isBuiltInLegend, type Party } from './demo';

function DeleteLegendDialog({ legend, cancel, confirm }: { legend: Party; cancel: () => void; confirm: () => void }) {
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = modal.current;
    if (element && !element.open) element.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);

  return (
    <dialog ref={modal} aria-labelledby="delete-legend-title" aria-describedby="delete-legend-description" onCancel={(event) => { event.preventDefault(); cancel(); }} className="m-auto w-[440px] max-w-[calc(100%_-_32px)] rounded-control border border-line bg-panel p-6 text-surface-foreground shadow-xl backdrop:bg-scrim/75">
      <h2 id="delete-legend-title" className="break-words font-display text-2xl font-semibold">删除「{legend.name}」？</h2>
      <p id="delete-legend-description" className="mt-3 leading-relaxed text-muted">
        该传奇将从名册和已加入的会话移除，相关主控设置也会取消。历史消息和任务记录会保留。此操作无法撤销。
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className={secondary} onClick={cancel}>取消</button>
        <button type="button" className="h-9 whitespace-nowrap rounded-control bg-rose px-4 text-sm font-semibold text-scrim hover:bg-rose/85" onClick={confirm}>确认删除</button>
      </div>
    </dialog>
  );
}

export function Roster({ initialKind = 'cluster', initialSelected = 'dev' }: { initialKind?: Party['kind']; initialSelected?: string }) {
  const { parties, modelFor, setLead, defaultLegend, setDefaultLegend, deleteLegend } = useWorkspace();
  const [params] = useSearchParams();
  const [kind, setKind] = useState<Party['kind']>(params.get('kind') === 'legend' ? 'legend' : params.get('kind') === 'cluster' ? 'cluster' : initialKind);
  const [selected, setSelected] = useState(params.get('id') ?? initialSelected);
  const [query, setQuery] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [track, setTrack] = useState('');
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState<Party>();
  const [deleted, setDeleted] = useState('');
  const createLink = useRef<HTMLAnchorElement>(null);

  const matches = parties.filter((party) => party.kind === kind && `${party.name} ${party.role} ${party.note}`.includes(query.trim()));
  const detail = matches.find((party) => party.id === selected) ?? matches[0];
  const builtIn = detail ? isBuiltInLegend(detail) : false;
  const tracks = new Map<string, number>();
  for (const member of detail?.members ?? []) {
    const label = member.track || '未分组';
    tracks.set(label, (tracks.get(label) ?? 0) + 1);
  }
  const members = detail?.members.map((member, originalIndex) => ({ member, originalIndex })).filter(({ member }) => (
    (!track || (member.track || '未分组') === track) && `${member.name} ${member.role} ${member.note} ${member.track ?? ''} ${member.specialty ?? ''} ${member.gender ?? ''}`.includes(memberQuery.trim())
  )) ?? [];
  const clusterCount = parties.filter((party) => party.kind === 'cluster').length;

  useEffect(() => {
    setMemberQuery('');
    setTrack('');
    setNotice('');
  }, [detail?.id]);

  useEffect(() => {
    if (deleted) createLink.current?.focus();
  }, [deleted]);

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line/65 px-8">
        <span>智能体名册</span>
        <span className="flex items-center gap-2 text-xs text-quiet">
          <span className="icon-[lucide--flask-conical] size-3.5" aria-hidden="true" />
          演示配置
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col px-8 pb-8 pt-7">
        <div className="flex shrink-0 items-end justify-between gap-8">
          <div>
            <h1 className="font-display text-[44px] font-semibold leading-[1.14]">智能体名册</h1>
            <p className="mt-3 text-muted">传奇独立加入会话；集群由拥有各自角色卡的普通角色组成。</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <label className="flex h-9 w-56 items-center gap-2.5 rounded-control border border-line bg-panel px-3 text-muted focus-within:border-primary/50">
              <span className="icon-[lucide--search] size-4" aria-hidden="true" />
              <input aria-label="搜索名册" placeholder={kind === 'cluster' ? '搜索集群名称或职责' : '搜索传奇名称或职责'} value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-surface-foreground outline-none placeholder:text-quiet focus-visible:outline-none" />
            </label>
            <Link ref={createLink} to={`/agent-editor?kind=${kind}`} className={primary}>
              <span className="icon-[lucide--plus] size-4" aria-hidden="true" />
              {kind === 'cluster' ? '新建集群' : '新建传奇'}
            </Link>
          </div>
        </div>
        <nav className="mt-7 flex shrink-0 gap-7 border-b border-line/70" aria-label="名册类型">
          {([['cluster', '集群', clusterCount], ['legend', '传奇', parties.length - clusterCount]] as const).map(([id, label, count]) => (
            <button type="button" key={id} onClick={() => { setKind(id); setQuery(''); }} aria-pressed={kind === id} className={`flex h-10 items-center gap-2 border-b-2 px-1 ${kind === id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-surface-foreground'}`}>
              {label}
              <span className="text-xs tabular-nums text-quiet">{count}</span>
            </button>
          ))}
        </nav>
        <div className="mt-6 grid min-h-0 flex-1 grid-cols-[308px_minmax(0,1fr)] items-start gap-8">
          <section className="max-h-full overflow-y-auto" aria-label={kind === 'cluster' ? '集群列表' : '传奇列表'}>
            <p className="mb-3 px-3 text-xs text-quiet">{matches.length} 项结果</p>
            {kind === 'legend' && deleted && <p role="status" className="mb-3 break-words px-3 text-sm text-cool">已删除「{deleted}」</p>}
            {matches.length ? (
              <ul className="space-y-2">
                {matches.map((party) => (
                  <li key={party.id}>
                    <button type="button" onClick={() => setSelected(party.id)} aria-pressed={detail?.id === party.id} className={`flex min-h-[68px] w-full items-center gap-3 rounded-control px-3 py-3 text-left ${detail?.id === party.id ? 'bg-raised' : 'hover:bg-panel'}`}>
                      <PartyStamp party={party} />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2 font-semibold">
                          <span className="truncate">{party.name}</span>
                          {isBuiltInLegend(party) && <span className="shrink-0 text-xs font-normal text-quiet">内置</span>}
                          {party.id === defaultLegend?.id && <span className="shrink-0 text-xs font-normal text-primary">默认主控</span>}
                        </span>
                        <span className="mt-1 block truncate text-xs text-quiet">{party.role}{party.kind === 'cluster' ? ` · ${party.members.length} 位成员` : ' · 独立发言'}</span>
                      </span>
                      <span className="icon-[lucide--chevron-right] size-4 text-quiet" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="px-3 py-4 text-muted">没有找到匹配结果。</p>}
          </section>
          {detail && (
            <section className="max-h-full overflow-y-auto rounded-control bg-panel" aria-label="智能体详情">
              <div className="px-6 pb-6 pt-6">
                <div className="flex items-center gap-4">
                  <PartyStamp party={detail} large />
                  <div>
                    <h2 className="font-display text-[26px] font-semibold leading-tight">{detail.name}</h2>
                    <p className="mt-1 text-xs text-quiet">{detail.kind === 'cluster' ? '集群' : builtIn ? '内置传奇' : '自建传奇'} · {detail.role}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                      <Link to={`/agent-editor?id=${encodeURIComponent(detail.id)}`} className="text-primary hover:underline">编辑档案</Link>
                      {builtIn && (
                        <span className="inline-flex items-center gap-1.5 text-quiet">
                          <span className="icon-[lucide--lock-keyhole] size-3.5 shrink-0" aria-hidden="true" />
                          内置传奇不可从名册删除
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl leading-relaxed text-muted">{detail.note}</p>
                {detail.kind === 'cluster' && detail.members.length > 0 && (
                  <p className="mt-2 text-xs text-quiet">会话代表：<Link to={`/member-card?team=${encodeURIComponent(detail.id)}&i=0`} className="text-primary hover:underline">{detail.members[0].name}</Link> · 代表对外回应，成员按任务分工。</p>
                )}
              </div>
              {detail.kind === 'cluster' ? (
                <div className="border-t border-line/70 px-6 pb-5 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">普通角色编制 <span className="ml-2 text-xs font-normal text-quiet">{detail.members.length} 人</span></h3>
                      <p className="mt-1 text-xs text-muted">同岗成员可分头接单。点开查看工作卡和人物档案。</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                    {(detail.id === 'dev' || detail.id === 'design') && <Link to={`/crew-portraits?team=${encodeURIComponent(detail.id)}`} className="text-sm text-primary hover:underline">查看肖像册</Link>}
                    <Link to={`/member-card?team=${encodeURIComponent(detail.id)}`} className="flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-control border border-primary/35 px-3 text-xs text-primary hover:bg-stamp">
                      <span className="icon-[lucide--plus] size-4" aria-hidden="true" />
                      新增普通角色
                    </Link>
                    </div>
                  </div>
                  <div className="mb-3 mt-4 flex flex-wrap items-center justify-between gap-2">
                    {tracks.size > 1 && (
                      <nav aria-label="工作分组" className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {[['', detail.members.length] as const, ...tracks].map(([label, count]) => (
                          <button key={label} type="button" onClick={() => setTrack(label)} aria-pressed={track === label} className={`whitespace-nowrap rounded-control px-2.5 py-1.5 text-xs ${track === label ? 'bg-raised text-surface-foreground' : 'text-muted hover:bg-surface'}`}>
                            {label || '全部'} <span className="ml-1 tabular-nums text-quiet">{count}</span>
                          </button>
                        ))}
                      </nav>
                    )}
                    <label className="flex h-9 w-full max-w-[224px] shrink-0 items-center gap-2.5 rounded-control border border-line bg-surface px-3 text-quiet focus-within:border-primary/50">
                      <span className="icon-[lucide--search] size-3.5" aria-hidden="true" />
                      <input aria-label="搜索集群成员" placeholder="搜索名字、岗位或擅长" value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-surface-foreground outline-none placeholder:text-quiet focus-visible:outline-none" />
                    </label>
                  </div>
                  <table className="w-full table-fixed border-collapse text-left">
                    <thead className="border-b border-line/70 text-xs text-quiet">
                      <tr>
                        <th className="w-[32%] pb-3 font-normal" scope="col">角色档案</th>
                        <th className="w-[23%] pb-3 font-normal" scope="col">岗位与专长</th>
                        <th className="pb-3 font-normal" scope="col">职责</th>
                        <th className="w-[128px] pb-3 text-right font-normal" scope="col">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(({ member, originalIndex }) => (
                        <tr key={member.key ?? `${member.name}-${originalIndex}`} className="border-b border-line/50 last:border-0">
                          <th scope="row" className="py-3 pr-2 font-medium">
                            <div className="flex min-w-0 items-center gap-2">
                              <PartyStamp party={{ ...member, id: '', kind: 'legend', mark: Array.from(member.name)[0], tone: member.tone ?? 'moss', members: [] }} />
                              <div className="min-w-0">
                                <Link to={`/member-card?team=${encodeURIComponent(detail.id)}&i=${originalIndex}`} className="block break-words hover:text-primary">{member.name}</Link>
                                <span className={`mt-0.5 block text-xs font-normal ${originalIndex === 0 ? 'text-primary' : 'text-quiet'}`}>{[member.gender, originalIndex === 0 ? '会话代表' : member.track || '未分组'].filter(Boolean).join(' · ')}</span>
                              </div>
                            </div>
                          </th>
                          <td className="break-words py-3 pr-3 text-xs text-muted">{member.role}{member.specialty && <span className="mt-1 block text-quiet">{member.specialty}</span>}</td>
                          <td className="break-words py-3 text-xs text-muted">{member.note || '—'}</td>
                          <td className="py-3 text-right text-xs">
                            <Link to={`/member-card?team=${encodeURIComponent(detail.id)}&i=${originalIndex}`} aria-label={`查看${member.name}角色卡`} className="rounded-control px-1 py-1 text-muted hover:text-primary">角色卡</Link>
                            {originalIndex > 0 && (
                              <button type="button" aria-label={`将${member.name}设为代表`} onClick={() => { setLead(detail.id, originalIndex); setNotice(`已将「${member.name}」设为会话代表。`); }} className="ml-1 rounded-control px-1.5 py-1 text-muted hover:bg-raised hover:text-primary">设为代表</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!members.length && <p className="py-5 text-muted">{detail.members.length ? '没有匹配的角色。' : '尚无普通角色，添加首个角色后即可邀请集群。'}</p>}
                  {notice && <p aria-live="polite" className="mt-2 text-xs text-cool">{notice}</p>}
                </div>
              ) : (
                <div className="border-t border-line/70 px-6 py-6">
                  <div className={`grid items-start gap-6 ${detail.portrait ? 'lg:grid-cols-[minmax(0,1fr)_196px]' : ''}`}>
                    <div>
                      <h3 className="font-semibold">角色设定</h3>
                      <p className="mt-2 leading-relaxed text-muted">{detail.description || '以自己的身份参与会话。'}</p>
                      {detail.instruction && <p className="mt-3 whitespace-pre-wrap break-words leading-relaxed text-muted">{detail.instruction}</p>}
                      <p className="mt-3 text-xs text-quiet">角色用模：{modelFor(detail)?.name ?? '工作区默认（待配置）'}</p>
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-control bg-surface px-3.5 py-3">
                        <div>
                          <h3 className="text-sm font-semibold">{detail.id === defaultLegend?.id ? '已设为新会话默认主控' : '新会话默认主控'}</h3>
                          <p className="mt-1 text-xs text-quiet">新会话会自动邀请默认传奇。已有会话不变。</p>
                        </div>
                        <button type="button" className="h-8 shrink-0 rounded-control border border-primary/35 px-2.5 text-xs text-primary hover:bg-stamp" onClick={() => setDefaultLegend(detail.id === defaultLegend?.id ? '' : detail.id)}>
                          {detail.id === defaultLegend?.id ? '取消默认' : '设为默认主控'}
                        </button>
                      </div>
                    </div>
                    {detail.portrait && (
                      <figure className="w-40 lg:w-full">
                        <img src={detail.portrait.src} alt={`${detail.name}的简介照`} className="aspect-[2/3] w-full rounded-control border border-line/60 object-cover" />
                        <figcaption className="mt-2 text-xs text-quiet">{detail.portrait.name}</figcaption>
                      </figure>
                    )}
                  </div>
                  {!builtIn && (
                    <div className="mt-5 border-t border-line/65 pt-4">
                      <button type="button" onClick={() => { setDeleted(''); setDeleting(detail); }} className="inline-flex items-center gap-2 rounded-control px-2 py-1.5 text-sm text-rose hover:bg-clay">
                        <span className="icon-[lucide--trash-2] size-4" aria-hidden="true" />
                        删除传奇
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      {deleting && (
        <DeleteLegendDialog legend={deleting} cancel={() => setDeleting(undefined)} confirm={() => {
          if (deleteLegend(deleting.id)) setDeleted(deleting.name);
          setDeleting(undefined);
        }} />
      )}
    </main>
  );
}
