import { Camera, Footprints, Globe, Megaphone, MessageCircle, Search, ThumbsUp, Users } from 'lucide-react';

// lucide-react 1.51.0 no longer ships Facebook or Instagram glyphs. These are the neutral stand-ins.
const KIND = {
  'Facebook Lead Ad': ThumbsUp,
  'Boosted post': Megaphone,
  Instagram: Camera,
  'Google Ads': Search,
  'Website form': Globe,
  'Website form – QR demo': Globe,
  WhatsApp: MessageCircle,
  'Walk-in / call': Footprints,
  Referral: Users,
};

export default function SourceIcon({ source }) {
  const Icon = KIND[source] || Users;
  return (
    <span className="source-icon" title={source || ''}>
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}
