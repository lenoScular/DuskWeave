import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useWorkspace } from '../frames/_layout';
import { area, field, primary, secondary, SettingsPage } from './SettingsParts';
import { examplePortrait, loadLocalImage } from './mediaPreview';
import type { ImageAsset } from './mediaPreview';
import { stampTones } from './demo';
import type { AgentProfile, Member, Party } from './demo';

const blank: AgentProfile = { name: '', role: '', note: '', tone: 'gold' };
const tones: Array<[NonNullable<AgentProfile['tone']>, string]> = [['gold', '浅金'], ['pine', '青蓝'], ['moss', '苔绿'], ['iris', '鸢尾紫'], ['clay', '浆果粉']];
const example = '拾叶，负责整理资料与核对出处，说话简洁，遇到不确定的地方要标出来。';

function polish(description: string, current: AgentProfile): AgentProfile {
  const text = description.trim();
  const first = text.split(/[，,。；;]/u)[0]?.replace(/^(叫作|叫|名为)/u, '').trim() ?? '';
  const role = text.match(/(?:负责|擅长|专做)([^，,。；;]+)/u)?.[1]?.trim();
  return { ...current,
    name: current.name.trim() || (/^[\p{L}0-9]{2,8}$/u.test(first) ? first : '新角色'),
    role: current.role.trim() || (role?.slice(0, 24) ?? '任务协作'),
    note: current.note.trim() || text.slice(0, 120),
    instruction: current.instruction?.trim() || `遵循这段角色设定：${text}\n先完成与职责相关的工作；缺少事实时说明不确定，不自行补造。`,
    description: text,
  };
}

export function RoleCardEditor({ legend, team, index }: { legend?: Party; team?: Party; index?: number }) {
  const { parties, models, defaultModel, images, saveParty, saveMember } = useWorkspace();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const original = team && index !== undefined ? team.members[index] : legend;
  const [value, setValue] = useState<Member>(original ? { ...blank, ...original } : blank);
  const [draft, setDraft] = useState<AgentProfile>();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const label = team ? '普通角色' : '传奇';
  const cardName = team ? '普通角色卡' : '传奇角色卡';
  const teamKey = encodeURIComponent(team?.id ?? '');
  const teamPath = `/roster?kind=cluster&id=${teamKey}`;
  const memberPath = (memberIndex: number) => `/member-card?team=${teamKey}&i=${memberIndex}${params.get('pane') === 'person' ? '&pane=person' : ''}`;
  const back = team ? (index === undefined ? teamPath : memberPath(index)) : `/roster?kind=legend${legend ? `&id=${encodeURIComponent(legend.id)}` : ''}`;
  const textModel = models.find((model) => model.id === (value.modelId || defaultModel));
  const imageModel = images.available('text').find((model) => model.id === images.defaults.text) ?? images.available('text')[0];
  const tone = value.tone ?? 'gold';
  const display = value.portrait ?? examplePortrait;

  function update(change: Partial<Member>) {
    setValue((current) => ({ ...current, ...change }));
    setError('');
  }

  function apply() {
    if (!draft) return;
    update({ name: value.name.trim() || draft.name, role: value.role.trim() || draft.role, note: value.note.trim() || draft.note, instruction: value.instruction?.trim() || draft.instruction });
    setDraft(undefined);
    setNote('已填入空白字段，仍可修改。');
  }

  function save() {
    const clean = { ...value, name: value.name.trim(), role: value.role.trim(), note: value.note.trim(), instruction: value.instruction?.trim(), description: value.description?.trim() };
    if (!clean.name || !clean.role) return;
    const duplicate = team ? team.members.some((item, at) => at !== index && item.name === clean.name) : parties.some((party) => party.id !== legend?.id && party.name === clean.name);
    if (duplicate) { setError('已有同名角色，请改一个名字。'); return; }
    if (team) {
      saveMember(team.id, { ...clean, track: clean.track?.trim(), deliverable: clean.deliverable?.trim(), acceptance: clean.acceptance?.trim(), handoff: clean.handoff?.trim() }, index);
      navigate(memberPath(index ?? team.members.length));
      return;
    }
    const id = legend?.id ?? crypto.randomUUID();
    saveParty({ ...clean, id, kind: 'legend', mark: Array.from(clean.name)[0], tone, members: [] });
    navigate(`/roster?kind=legend&id=${encodeURIComponent(id)}`);
  }

  async function upload(slot: 'avatar' | 'portrait', file?: File) {
    if (!file) return;
    try { update({ [slot]: await loadLocalImage(file) }); setNote('图片已在本地选入。'); } catch (problem) { setError((problem as Error).message); }
  }

  function draw(slot: 'avatar' | 'portrait') {
    if (!imageModel) return;
    const prompt = value.description?.trim() || value.note.trim() || value.name.trim();
    const image = images.create({ mode: 'text', model: imageModel.id, ratio: slot === 'avatar' ? '1:1' : '4:5', prompt, purpose: slot });
    if (image) { update({ [slot]: image }); setNote(`已用「${imageModel.name}」填入${slot === 'avatar' ? '头像' : '简介照'}示例。`); }
  }

  return (
    <SettingsPage breadcrumb={<><Link to={team ? teamPath : back} className="text-muted hover:text-primary">{team?.name ?? '智能体名册'}</Link><span className="icon-[lucide--chevron-right] size-3.5 text-quiet" aria-hidden="true" /><span>{cardName}</span></>} title={`${original ? '编辑' : '新建'}${cardName}`} summary={team ? '成员通过集群参与会话。写清接手场景、验收条件和交接人，方便分工与复查。' : '写一句角色设定，就能从一份可修改的草稿开始。'}>
      {!team && !legend && <Link to="/agent-editor?kind=cluster" className="mb-4 inline-flex text-sm text-primary hover:underline">改为新建集群</Link>}
      <div className="grid grid-cols-[minmax(0,1fr)_312px] items-start gap-7">
        <form id="role-card-form" className="space-y-4" onSubmit={(event) => { event.preventDefault(); save(); }}>
          <section className="rounded-control bg-panel p-5" aria-label="从一句话开始">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">从一句话开始</h2>
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => { update({ description: example }); setDraft(undefined); }}>填入示例设定</button>
            </div>
            <label className="mt-3 block text-xs text-muted">{team ? '接手场景' : '角色描述'}
              <textarea rows={2} maxLength={300} className={area} value={value.description ?? ''} onChange={(event) => { update({ description: event.target.value }); setDraft(undefined); }} placeholder="例如：拾叶，负责整理资料与核对出处，语气简洁。" />
            </label>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-quiet">润色用对话模型：{textModel?.name ?? '未配置'}</span>
              <button type="button" className={primary} disabled={!textModel || !value.description?.trim()} onClick={() => { setDraft(polish(value.description ?? '', value)); setNote(''); }}>
                <span className="icon-[lucide--sparkles] size-4" aria-hidden="true" />润色角色配置
              </button>
            </div>
            {draft && (
              <div className="mt-4 rounded-control border border-primary/30 bg-stamp/35 p-3" aria-label="润色草稿">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">配置草稿（演示）</h3>
                  <button type="button" onClick={apply} className={secondary}>采用草稿</button>
                </div>
                <p className="mt-2 text-xs text-muted">{draft.name} · {draft.role}</p>
                <p className="mt-1 break-words text-xs text-muted">{draft.note}</p>
                <p className="mt-2 text-xs text-quiet">仅填入空白字段，不覆盖已写的内容，不会自动保存。</p>
              </div>
            )}
          </section>
          <section className="rounded-control bg-panel p-5" aria-label="角色配置">
            <h2 className="mb-3 text-lg font-semibold">角色配置</h2>
            <div className="grid grid-cols-2 gap-4">
              <label>角色名称<input required className={field} maxLength={24} value={value.name} onChange={(event) => update({ name: event.target.value })} /></label>
              <label>职责<input required className={field} maxLength={24} value={value.role} onChange={(event) => update({ role: event.target.value })} /></label>
            </div>
            <label className="mt-3 block">名册简介<input className={field} maxLength={120} value={value.note} onChange={(event) => update({ note: event.target.value })} /></label>
            <label className="mt-3 block">行为说明<textarea rows={2} maxLength={600} className={area} value={value.instruction ?? ''} onChange={(event) => update({ instruction: event.target.value })} /></label>
            <label className="mt-3 block">角色使用的对话模型
              <select className={field} value={value.modelId ?? ''} onChange={(event) => update({ modelId: event.target.value || undefined })}>
                <option value="">工作区默认</option>
                {models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
              </select>
            </label>
          </section>
          {team && (
            <section className="rounded-control bg-panel p-5" aria-label="交接约定">
              <h2 className="mb-3 text-lg font-semibold">交接约定</h2>
              <div className="grid grid-cols-2 gap-4">
                <label>工作分组<input className={field} maxLength={24} value={value.track ?? ''} onChange={(event) => update({ track: event.target.value })} /></label>
                <label>擅长先接<input className={field} maxLength={40} value={value.specialty ?? ''} onChange={(event) => update({ specialty: event.target.value })} /></label>
              </div>
              {([['deliverable', '交付什么'], ['acceptance', '怎样算完成'], ['handoff', '下一棒给谁']] as const).map(([key, title]) => (
                <label key={key} className="mt-3 block">{title}
                  <textarea rows={2} className={area} maxLength={240} value={value[key] ?? ''} onChange={(event) => update({ [key]: event.target.value })} />
                </label>
              ))}
            </section>
          )}
          {team && (
            <section className="rounded-control bg-panel p-5" aria-label="人物档案">
              <h2 className="mb-3 text-lg font-semibold">人物档案</h2>
              <label className="block">性别
                <select className={field} value={value.gender ?? ''} onChange={(event) => update({ gender: (event.target.value || undefined) as Member['gender'] })}>
                  <option value="">未填写</option>
                  <option value="女性">女性</option><option value="男性">男性</option><option value="非二元">非二元</option>
                </select>
              </label>
              {([['personality', '性格'], ['hobby', '林间爱好'], ['collaboration', '协作偏好'], ['pressure', '遇到压力时'], ['voice', '说话示例']] as const).map(([key, title]) => (
                <label key={key} className="mt-3 block">{title}
                  <textarea rows={2} className={area} maxLength={200} value={value[key] ?? ''} onChange={(event) => update({ [key]: event.target.value })} />
                </label>
              ))}
            </section>
          )}
        </form>
        <aside className={`min-w-0 ${team ? 'lg:sticky lg:top-0' : ''}`} aria-label="角色身份预览">
          <figure className="overflow-hidden rounded-control border border-line/70 bg-panel">
            <img src={display.src} alt={value.portrait ? '已选角色简介照' : '暮色森林角色示例肖像，尚未保存'} className="aspect-[16/9] w-full object-cover object-[50%_35%]" />
            <figcaption className="relative px-4 pb-4 pt-4">
              <div className="flex items-center gap-3">
                <span className={`grid size-12 shrink-0 place-items-center overflow-hidden rounded-full text-lg ${stampTones[tone]}`}>
                  {value.avatar ? <img src={value.avatar.src} alt="角色头像" className="size-full object-cover" /> : (Array.from(value.name.trim())[0] || (team ? '员' : '传'))}
                </span>
                <div className="min-w-0">
                  <h2 className="break-words font-display text-[24px] leading-tight">{value.name || `未命名${label}`}</h2>
                  <p className="mt-1 text-xs text-quiet">{label}{value.role ? ` · ${value.role}` : ''}</p>
                </div>
              </div>
              {value.note && <p className="mt-2 break-words text-xs leading-relaxed text-muted">{value.note}</p>}
              <p className="mt-2 text-xs text-quiet">{value.portrait ? '已选择简介照' : '上方为示例肖像，未写入角色卡'}</p>
            </figcaption>
          </figure>
          <section className="mt-4" aria-label="身份图片">
            <h2 className="font-semibold">身份图片</h2>
            <p className="mb-2 mt-1 text-xs text-quiet">{imageModel ? `生图模型：${imageModel.name}` : '暂无可用的生图模型'} · <Link to="/image-models" className="text-primary hover:underline">配置</Link></p>
            {([['avatar', '头像', '1:1'], ['portrait', '简介照', '4:5']] as const).map(([slot, title, ratio]) => (
              <div key={slot} className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 py-2.5">
                <span className="text-sm">{title} <span className="text-xs text-quiet">{ratio}</span></span>
                <div className="flex items-center gap-2">
                  <label className="relative cursor-pointer text-xs text-muted hover:text-surface-foreground">上传<input aria-label={`上传${title}`} type="file" accept="image/png,image/jpeg,image/webp" className="absolute inset-0 w-full cursor-pointer opacity-0" onChange={(event) => upload(slot, event.target.files?.[0])} /></label>
                  <button type="button" aria-label={`生成${title}示例`} disabled={!imageModel || !(value.description?.trim() || value.note.trim() || value.name.trim())} onClick={() => draw(slot)} className="rounded-control border border-iris/30 px-2 py-1 text-xs text-iris hover:bg-thicket disabled:opacity-45">生成示例</button>
                  {value[slot] && <button type="button" aria-label={`移除${title}`} className="text-xs text-quiet hover:text-rose" onClick={() => update({ [slot]: undefined })}>移除</button>}
                </div>
              </div>
            ))}
            <div className="mt-3 flex items-center gap-2" aria-label="身份色">
              {tones.map(([id, text]) => <button type="button" key={id} aria-label={text} aria-pressed={tone === id} className={`grid size-7 place-items-center rounded-full ${stampTones[id]} ${tone === id ? 'ring-1 ring-current' : ''}`} onClick={() => update({ tone: id })}>{tone === id && <span className="icon-[lucide--check] size-3.5" aria-hidden="true" />}</button>)}
            </div>
            {note && <p role="status" className="mt-3 text-xs text-cool">{note}</p>}
            {error && <p role="alert" className="mt-3 text-xs text-rose">{error}</p>}
            <div className="mt-4 flex justify-end gap-3 border-t border-line/65 pt-3">
              <Link to={back} className={secondary}>取消</Link>
              <button type="submit" form="role-card-form" className={primary} disabled={!value.name.trim() || !value.role.trim()}>保存角色卡</button>
            </div>
          </section>
        </aside>
      </div>
    </SettingsPage>
  );
}

export function MemberEditor() {
  const { parties } = useWorkspace();
  const [params] = useSearchParams();
  const team = parties.find((party) => party.kind === 'cluster' && party.id === (params.get('team') ?? 'dev'));
  const requested = params.get('i');
  const index = requested === null ? (params.has('team') ? undefined : 0) : /^\d+$/.test(requested) ? Number(requested) : -1;
  if (!team || (index !== undefined && !team.members[index])) return <SettingsPage breadcrumb="智能体名册" title="找不到角色卡" summary="请回到集群重新选择成员。"><Link to="/roster" className={secondary}>返回名册</Link></SettingsPage>;
  return <RoleCardEditor key={`${team.id}:${index ?? 'new'}`} team={team} index={index} />;
}
