import AgricultureIcon from '@mui/icons-material/Agriculture';
import GrassIcon from '@mui/icons-material/Grass';
import NotesIcon from '@mui/icons-material/Notes';
import ShowerIcon from '@mui/icons-material/Shower';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import type { ApiCalendarEvent } from '@/lib/api';

interface CalendarCategoryIconProps {
  jenis: ApiCalendarEvent['jenis'];
  fontSize?: 'small' | 'medium';
}

export default function CalendarCategoryIcon({ jenis, fontSize = 'small' }: CalendarCategoryIconProps) {
  if (jenis === 'pemupukan') return <GrassIcon fontSize={fontSize} aria-hidden />;
  if (jenis === 'penyemprotan') return <WaterDropIcon fontSize={fontSize} aria-hidden />;
  if (jenis === 'irigasi') return <ShowerIcon fontSize={fontSize} aria-hidden />;
  if (jenis === 'pemetikan') return <AgricultureIcon fontSize={fontSize} aria-hidden />;
  return <NotesIcon fontSize={fontSize} aria-hidden />;
}
