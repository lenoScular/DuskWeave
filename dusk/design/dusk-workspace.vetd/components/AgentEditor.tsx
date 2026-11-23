import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useWorkspace } from '../frames/_layout';
import { area, field, primary, secondary, SettingsPage } from './SettingsParts';
import { RoleCardEditor } from './RoleCardEditor';
import { PartyStamp } from './PartyStamp';
import type { Party } from './demo';

function ClusterEditor({ team }: { team?: Party }) {
  const { parties, saveParty } = useWorkspace();
  const navigate = useNavigate();
  const [name, setName] = useState(team?.name ?? '');
  const [role, setRole] = useState(team?.role ?? '');
  const [note, setNote] = useState(team?.note ?? '');
  const [instruction, setInstruction] = useState(team?.instruction ?? '');
  const [error, setError] = useState('');
  const back = `/roster?kind=cluster${team ? `&id=${encodeURIComponent(team.id)}` : ''}`;

  return (
    <SettingsPage breadcrumb={<Link to={back} className="text-muted hover:text-primary">智能体名册 / 集群</Link>} title={team ? '编辑集群档案' : '新建集群'} summary="集群是由普通角色组成的队伍，不是另一个单独角色。">
      {!team && <Link to="/agent-editor" className="mb-4 inline-flex text-sm text-primary hover:underline">改为新建传奇</Link>}
      <div className="grid grid-cols-[minmax(0,1fr)_312px] items-start gap-7">
        <form className="rounded-control bg-panel p-6" onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || !role.trim()) return;
          if (parties.some((item) => item.id !== team?.id && item.name === name.trim())) { setError('已有同名对象，请更换名称。'); return; }
          const entry: Party = { id: team?.id ?? crypto.randomUUID(), kind: 'cluster', name: name.trim(), role: role.trim(), note: note.trim(), instruction: instruction.trim(), mark: team?.mark ?? 'network', tone: team?.tone ?? 'moss', members: team?.members ?? [] };
          saveParty(entry);
          navigate(team ? back : `/member-card?team=${encodeURIComponent(entry.id)}`);
        }}>
          <div className="grid grid-cols-2 gap-4">
            <label>集群名称<input className={field} required maxLength={24} value={name} placeholder="例如：文档集群" onChange={(event) => { setName(event.target.value); setError(''); }} /></label>
            <label>集群职责<input className={field} required maxLength={24} placeholder="例如：编写与复核" value={role} onChange={(event) => setRole(event.target.value)} /></label>
          </div>
          <label className="mt-4 block">名册简介<input className={field} maxLength={120} value={note} onChange={(event) => setNote(event.target.value)} /></label>
          <label className="mt-4 block">协作说明<textarea rows={3} className={area} maxLength={500} value={instruction} onChange={(event) => setInstruction(event.target.value)} /></label>
          {error && <p role="alert" className="mt-3 text-xs text-rose">{error}</p>}
          <div className="mt-5 flex justify-end gap-3 border-t border-line/65 pt-4">
            <Link to={back} className={secondary}>取消</Link>
            <button type="submit" className={primary} disabled={!name.trim() || !role.trim()}>{team ? '保存集群' : '保存并创建首个角色'}</button>
          </div>
        </form>
        <aside className="px-1 pt-1" aria-label="集群角色构成">
          <h2 className="font-semibold">由普通角色组成</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted">每人都有名字、职责、模型、头像和简介照。第一位角色默认担任会话代表，可以在名册更换。</p>
          {team?.members.length ? (
            <ul className="mt-4 divide-y divide-line/60">
              {team.members.slice(0, 4).map((member, at) => (
                <li key={`${member.name}-${at}`} className="flex items-center gap-2 py-2">
                  <PartyStamp party={{ ...member, id: '', kind: 'legend', mark: Array.from(member.name)[0], tone: member.tone ?? 'moss', members: [] }} />
                  <Link to={`/member-card?team=${encodeURIComponent(team.id)}&i=${at}`} className="min-w-0 text-sm hover:text-primary">
                    <span className="block truncate">{member.name}</span>
                    <span className="block truncate text-xs text-quiet">{member.role}{at === 0 ? ' · 会话代表' : ''}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 border-t border-line/65 pt-3 text-xs text-quiet">没有角色的集群不会出现在可邀请名单中。</p>}
        </aside>
      </div>
    </SettingsPage>
  );
}

export function AgentEditor() {
  const { parties } = useWorkspace();
  const [params] = useSearchParams();
  const existing = parties.find((party) => party.id === params.get('id'));
  if (existing?.kind === 'cluster' || (!existing && params.get('kind') === 'cluster')) return <ClusterEditor key={existing?.id ?? 'new-cluster'} team={existing} />;
  return <RoleCardEditor key={existing?.id ?? 'new-legend'} legend={existing} />;
}
