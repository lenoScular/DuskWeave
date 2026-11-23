export const frame = { width: 1440, height: 900, title: '人物档案 · 微澜' };

import { MemberProfile } from '../components/MemberProfile';

export default function DesignRoleFrame() {
  return <MemberProfile defaultTeam="design" defaultIndex={2} defaultPane="person" />;
}
