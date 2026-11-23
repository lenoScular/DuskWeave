export const frame = { width: 1440, height: 900, title: '邀请传奇与集群' };

import { Conversation } from '../components/Conversation';
import { Invitation } from '../components/Invitation';

export default function InviteFrame() {
  return (
    <div className="relative h-full">
      <div className="h-full" inert>
        <Conversation />
      </div>
      <Invitation />
    </div>
  );
}
