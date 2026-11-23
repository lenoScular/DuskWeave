export const frame = { width: 1440, height: 900, title: '名册 · 设计集群编制' };

import { Roster } from '../components/Roster';

export default function DesignClusterFrame() {
  return <Roster initialSelected="design" />;
}
