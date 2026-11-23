export const frame = { width: 1440, height: 900, title: '首次启动 · 欢迎来到暮色' };

import { Conversation } from '../components/Conversation';
import { Welcome } from '../components/Welcome';
import { useWorkspace } from './_layout';

export default function StartFrame() {
  const { hasSession, folder } = useWorkspace();
  if (!hasSession && !folder) return <Welcome />;
  return <Conversation />;
}
