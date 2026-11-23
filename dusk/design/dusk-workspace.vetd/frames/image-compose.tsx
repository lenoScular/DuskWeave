export const frame = { width: 1440, height: 900, title: '会话 · 对话生图结果' };

import { useEffect } from 'react';
import { Conversation } from '../components/Conversation';
import { useWorkspace } from './_layout';

export default function ImageComposeFrame() {
  const { hasSession, openDemo } = useWorkspace();
  useEffect(() => {
    if (!hasSession) openDemo(false);
  }, [hasSession, openDemo]);
  return <Conversation showImageExample />;
}