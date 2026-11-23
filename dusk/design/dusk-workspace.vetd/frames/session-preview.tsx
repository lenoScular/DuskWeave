export const frame = { width: 1440, height: 900, title: '会话示例 · 桥边初会' };

import { Conversation } from '../components/Conversation';
import { useEffect, useRef } from 'react';
import { useWorkspace } from './_layout';

export default function SessionPreviewFrame() {
  const { session, openDemo } = useWorkspace();
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (session.id !== 'bridge') openDemo(false);
  }, [session.id, openDemo]);
  return <Conversation />;
}
