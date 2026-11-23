import { stampTones } from './demo';
import type { Party } from './demo';

const marks: Record<string, string> = {
  'code-xml': 'icon-[lucide--code-xml]',
  network: 'icon-[lucide--network]',
  'pen-tool': 'icon-[lucide--pen-tool]',
};

export function PartyStamp({ party, large = false }: { party: Party; large?: boolean }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center overflow-hidden border border-current/10 ${large ? 'size-12 text-lg' : 'size-9 text-sm'} ${party.kind === 'legend' ? 'rounded-full font-display' : 'rounded-control'} ${stampTones[party.tone]}`}>
      {party.kind === 'legend' ? (party.avatar ? <img src={party.avatar.src} alt="" className="size-full object-cover" /> : party.mark) : <span className={`${marks[party.mark]} ${large ? 'size-6' : 'size-4'}`} />}
    </span>
  );
}
