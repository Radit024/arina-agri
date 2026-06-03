'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useAuth } from '@/context/AuthContext';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

const feedbackSchema = z.object({
  category: z.enum(['bug', 'feature', 'question']),
  message: z.string().min(5, 'Pesan terlalu singkat'),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

interface FeedbackItem {
  id: string;
  category: string;
  message: string;
  created_at: string;
  user_name?: string;
  device_type?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`feedback-tabpanel-${index}`}
      aria-labelledby={`feedback-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const t = useTranslations('FeedbackModal');
  const { session } = useAuth();
  
  const [tabValue, setTabValue] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      category: 'bug',
      message: '',
    },
  });

  const fetchFeedbacks = async () => {
    setIsFetching(true);
    try {
      const token = session?.access_token || '';
      const response = await fetch('/api/feedback', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Gagal memuat masukan');
      
      const resData = await response.json();
      setFeedbacks(resData.data || []);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: t('errorFetch'), severity: 'error' });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (open && tabValue === 1) {
      fetchFeedbacks();
    }
  }, [open, tabValue]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const onSubmit = async (data: FeedbackFormValues) => {
    setIsSubmitting(true);
    try {
      const isMobile = window.innerWidth <= 768;
      const deviceType = isMobile ? 'mobile' : 'desktop';

      const token = session?.access_token || '';

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...data,
          device_type: deviceType,
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal mengirim feedback');
      }

      setSnackbar({ open: true, message: t('success'), severity: 'success' });
      reset();
      
      // Auto-switch to list tab after submit and refresh
      setTabValue(1);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: t('error'), severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bug': return 'error';
      case 'feature': return 'primary';
      case 'question': return 'info';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    const locale = t('locale') || 'id'; // Akan kembali ke default jika tidak diset
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={isSubmitting ? undefined : onClose} 
        maxWidth="sm" 
        fullWidth
        sx={{ '& .MuiDialog-paper': { minHeight: '60vh' } }}
      >
        <DialogTitle sx={{ pb: 1 }}>{t('title')}</DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="feedback tabs">
            <Tab label={t('tabForm')} id="feedback-tab-0" aria-controls="feedback-tabpanel-0" />
            <Tab label={t('tabList')} id="feedback-tab-1" aria-controls="feedback-tabpanel-1" />
          </Tabs>
        </Box>

        <DialogContent sx={{ pt: 0 }}>
          {/* Tab Tulis Masukan */}
          <CustomTabPanel value={tabValue} index={0}>
            <Box component="form" id="feedback-form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <DialogContentText sx={{ mb: 3 }}>
                {t('subtitle')}
              </DialogContentText>

              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    label={t('fields.category')}
                    margin="normal"
                    error={!!errors.category}
                    helperText={errors.category?.message}
                  >
                    <MenuItem value="bug">{t('categories.bug')}</MenuItem>
                    <MenuItem value="feature">{t('categories.feature')}</MenuItem>
                    <MenuItem value="question">{t('categories.question')}</MenuItem>
                  </TextField>
                )}
              />

              <Controller
                name="message"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={4}
                    label={t('fields.message')}
                    placeholder={t('fields.messagePlaceholder')}
                    margin="normal"
                    error={!!errors.message}
                    helperText={errors.message?.message}
                  />
                )}
              />
            </Box>
          </CustomTabPanel>

          {/* Tab Daftar Masukan */}
          <CustomTabPanel value={tabValue} index={1}>
            {isFetching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : feedbacks.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Typography>{t('emptyList')}</Typography>
              </Box>
            ) : (
              <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                {feedbacks.map((fb, index) => (
                  <div key={fb.id}>
                    <ListItem alignItems="flex-start" sx={{ px: 0, py: 2 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                            <Chip 
                              label={t(`categories.${fb.category}` as any)} 
                              size="small" 
                              color={getCategoryColor(fb.category) as any} 
                              variant="outlined" 
                            />
                            <Typography variant="caption" color="text.secondary">
                              {fb.user_name ? `${fb.user_name} • ` : ''}{formatDate(fb.created_at)}{fb.device_type ? ` • ${fb.device_type}` : ''}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                            sx={{ display: 'block', mt: 1, wordBreak: 'break-word' }}
                          >
                            {fb.message}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < feedbacks.length - 1 && <Divider component="li" />}
                  </div>
                ))}
              </List>
            )}
          </CustomTabPanel>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isSubmitting} color="inherit">
            {t('cancel')}
          </Button>
          {tabValue === 0 && (
            <Button
              type="submit"
              form="feedback-form"
              variant="contained"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isSubmitting ? t('submitting') : t('submit')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
