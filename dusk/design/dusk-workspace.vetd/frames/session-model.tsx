export const frame = { width: 1440, height: 900, title: '会话 · 模型与推理强度' };

import { Conversation } from '../components/Conversation';

export default function SessionModelFrame() {
  return <Conversation showModelMenu />;
}
