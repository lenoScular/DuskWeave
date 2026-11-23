import { Link, useSearchParams } from 'react-router';
import { useWorkspace } from '../frames/_layout';
import { MemberEditor } from './RoleCardEditor';
import { secondary, SettingsPage } from './SettingsParts';
import { stampTones } from './demo';

type Pane = 'work' | 'person';
export function MemberProfile({ defaultTeam = 'dev', defaultIndex = 0, defaultPane = 'work' }: { defaultTeam?: string; defaultIndex?: number; defaultPane?: Pane }) {
  const { parties, models, defaultModel } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const team = parties.find((entry) => entry.kind === 'cluster' && entry.id === (params.get('team') ?? defaultTeam));
  const requested = params.get('i');
  if (params.get('edit') === '1' || (params.has('team') && requested === null)) return <MemberEditor />;
  const index = requested === null ? defaultIndex : /^\d+$/.test(requested) ? Number(requested) : -1;
  const member = team?.members[index];
  if (!team || !member) {
    return <SettingsPage breadcrumb="智能体名册" title="找不到角色卡" summary="请回到集群重新选择成员。"><Link to="/roster" className={secondary}>返回名册</Link></SettingsPage>;
  }

  const pane = params.get('pane') === 'person' ? 'person' : params.get('pane') === 'work' ? 'work' : defaultPane;
  const group = `/roster?kind=cluster&id=${encodeURIComponent(team.id)}`;
  const edit = `/member-card?team=${encodeURIComponent(team.id)}&i=${index}&edit=1&pane=${pane}`;
  const model = models.find((item) => item.id === member.modelId) ?? models.find((item) => item.id === defaultModel);
  const modelName = model?.enabled.find((item) => item.identifier === model.identifier)?.name;
  const modelLabel = modelName ? (model?.id === member.modelId ? `${modelName} · 角色指定` : `跟随工作区默认 · ${modelName}`) : '跟随工作区默认（待配置）';
  const tone = member.tone ?? team.tone;
  const teamAccent = team.id === 'design' ? 'text-rose' : 'text-primary';
  const contract = [['交付什么', member.deliverable], ['怎样算完成', member.acceptance], ['下一棒给谁', member.handoff]];
  const character = [['性格', member.personality], ['林间爱好', member.hobby], ['协作偏好', member.collaboration], ['遇到压力时', member.pressure]];

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden" aria-label="成员角色卡">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line/65 px-8">
        <nav aria-label="角色卡位置" className="flex min-w-0 items-center gap-2.5 text-muted">
          <Link to="/roster" className="hover:text-primary">智能体名册</Link>
          <span className="icon-[lucide--chevron-right] size-4" aria-hidden="true" />
          <Link to={group} className="truncate hover:text-primary">{team.name}</Link>
          <span className="icon-[lucide--chevron-right] size-4" aria-hidden="true" />
          <span className="text-surface-foreground">角色卡</span>
        </nav>
        <Link to={edit} className={secondary}>
          <span className="icon-[lucide--pencil] size-4" aria-hidden="true" />
          编辑角色卡
        </Link>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-9 pt-8">
        <div className={`mx-auto grid max-w-[1080px] items-start gap-9 ${member.portrait ? 'lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12' : ''}`}>
          <div className="min-w-0">
            <div className="flex items-center gap-5">
              <span className={`grid size-16 shrink-0 place-items-center overflow-hidden rounded-full font-display text-[29px] ${stampTones[tone]}`} aria-hidden="true">
                {member.avatar ? <img src={member.avatar.src} alt="" className="size-full object-cover" /> : Array.from(member.name)[0]}
              </span>
              <div className="min-w-0">
                <h1 className="break-words font-display text-[42px] font-semibold leading-tight">{member.name}</h1>
                <p className="mt-1.5 text-sm text-muted">{[team.name, member.role, member.gender].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            {member.note && <p className="mt-5 max-w-3xl text-base leading-relaxed text-surface-foreground">{member.note}</p>}
            <nav className="mt-6 flex gap-7 border-b border-line/70" aria-label="角色卡视图">
              {([['work', '工作卡'], ['person', '人物档案']] as const).map(([target, label]) => (
                <button key={target} type="button" aria-pressed={pane === target} className={`h-10 border-b-2 px-1 ${pane === target ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-surface-foreground'}`} onClick={() => {
                  const next = new URLSearchParams(params);
                  next.set('pane', target);
                  setParams(next, { replace: true });
                }}>{label}</button>
              ))}
            </nav>
            {pane === 'work' ? (
              <section className="pt-5" aria-label="工作卡内容">
                <h2 className="text-base font-semibold">接手场景{member.specialty && <span className="ml-3 text-sm font-normal text-quiet">{member.specialty}</span>}</h2>
                <p className="mt-1.5 break-words leading-relaxed text-muted">{member.description || '尚未填写接手场景。'}</p>
                <h2 className="mt-5 text-base font-semibold">工作方式与边界</h2>
                <p className="mt-1.5 whitespace-pre-wrap break-words leading-relaxed text-muted">{member.instruction || '尚未填写行为说明。'}</p>
                <h2 className={`mt-6 font-display text-[23px] font-semibold ${teamAccent}`}>交接约定</h2>
                <dl className="mt-2 grid gap-x-5 gap-y-3 md:grid-cols-3">
                  {contract.map(([label, value]) => (
                    <div key={label} className="border-t border-line/65 pt-2.5">
                      <dt className="font-semibold">{label}</dt><dd className="mt-1 break-words leading-relaxed text-muted">{value || '尚未填写'}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : (
              <section className="pt-5" aria-label="人物档案内容">
                {member.voice && <blockquote className={`max-w-2xl font-display text-xl leading-relaxed ${teamAccent}`}>{member.voice}</blockquote>}
                <dl className="mt-4 grid gap-x-7 gap-y-5 md:grid-cols-2">
                  {character.map(([label, value]) => (
                    <div key={label}>
                      <dt className="font-semibold">{label}</dt><dd className="mt-1 break-words leading-relaxed text-muted">{value || '尚未填写'}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 text-xs text-quiet">人物设定影响协作表达，不限制同岗位成员接单。</p>
              </section>
            )}
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-line/65 pt-4">
              <div><dt className="text-xs text-quiet">会话身份</dt><dd className="mt-1">{index === 0 ? '会话代表 · 汇总并对外回应' : '普通角色 · 随集群受邀'}</dd></div>
              <div><dt className="text-xs text-quiet">角色用模</dt><dd className="mt-1 break-words">{modelLabel}</dd></div>
            </dl>
            <Link to={group} className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <span className="icon-[lucide--arrow-left] size-4" aria-hidden="true" />返回{team.name}
            </Link>
          </div>
          {member.portrait && (
            <figure className="max-w-[280px] overflow-hidden rounded-control border border-line/70 bg-panel" aria-label="角色档案照">
              <img src={member.portrait.src} alt={member.portrait.name} className="block aspect-[2/3] w-full object-cover" />
              <figcaption className="px-4 py-3">
                <span className="font-semibold">{member.name}的档案照</span>
                <span className="ml-2 text-xs text-quiet">暮色森林 · {team.name}</span>
              </figcaption>
            </figure>
          )}
        </div>
      </div>
    </main>
  );
}
