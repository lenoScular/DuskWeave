export const frame = { width: 1440, height: 900, title: '传奇名册 · 默认主控' };

import { Roster } from '../components/Roster';

export default function LegendsFrame() {
  return <Roster initialKind="legend" />;
}
