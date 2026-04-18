'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface WeatherBannerProps {
  message?: string;
}

export default function WeatherBanner({ message }: WeatherBannerProps) {
  const defaultMessage =
    '⛈️ Prakiraan hujan lebat 2 hari ke depan di wilayah Malang. Tunda pemupukan dan penyemprotan pestisida. Pastikan drainase lahan dalam kondisi baik.';

  return (
    <Alert
      severity="warning"
      icon={<WarningAmberIcon />}
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'warning.light',
        backgroundColor: '#fffbeb',
        '& .MuiAlert-icon': { color: '#f59e0b' },
      }}
    >
      <AlertTitle sx={{ fontWeight: 600, color: '#92400e' }}>Peringatan Cuaca</AlertTitle>
      <Typography variant="body2" color="#78350f">
        {message || defaultMessage}
      </Typography>
    </Alert>
  );
}
