'use client';

import type { ReactNode } from 'react';
import type { Route } from 'next';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { motion, useReducedMotion } from 'framer-motion';
import { alpha, useTheme } from '@mui/material/styles';

export interface MobileFeatureItem {
  key: string;
  icon: ReactNode;
  path: Route | null;
  action?: 'guide' | 'settings' | 'feedback';
}

export interface MobileFeatureGroup {
  key: string;
  titleKey: string;
  items: MobileFeatureItem[];
}

interface MobileFeatureSheetProps {
  open: boolean;
  title: string;
  closeLabel: string;
  groups: MobileFeatureGroup[];
  getLabel: (key: string) => string;
  pathname?: string;
  onClose: () => void;
  onSelect: (item: MobileFeatureItem) => void;
}

export default function MobileFeatureSheet({
  open,
  title,
  closeLabel,
  groups,
  getLabel,
  pathname,
  onClose,
  onSelect,
}: MobileFeatureSheetProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  const isItemActive = (item: MobileFeatureItem) => {
    if (!item.path || !pathname) return false;
    return pathname.startsWith(item.path);
  };

  const containerVariants = {
    open: { transition: { staggerChildren: 0.045, delayChildren: 0.07 } },
    closed: {},
  };

  const itemVariants = {
    open: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
    },
    closed: { opacity: 0, y: 14, scale: 0.94 },
  };

  const motionProps = reduceMotion
    ? {}
    : { variants: containerVariants, initial: 'closed', animate: open ? 'open' : 'closed' };

  const itemMotionProps = reduceMotion ? {} : { variants: itemVariants };

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      disableDiscovery={false}
      swipeAreaWidth={24}
      ModalProps={{
        keepMounted: true,
        slotProps: {
          backdrop: {
            sx: {
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              backgroundColor: alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.5 : 0.25),
            },
          },
        },
      }}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '72vh',
            height: 'auto',
            backgroundColor: 'background.paper',
            backgroundImage: 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Drag Handle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 0.5, flexShrink: 0 }}>
        <Box
          aria-hidden
          sx={{
            width: 36,
            height: 4,
            borderRadius: 999,
            backgroundColor: alpha(theme.palette.text.primary, 0.15),
          }}
        />
      </Box>

      {/* Title Bar */}
      <Box
        sx={{
          px: 2.5,
          pt: 0.5,
          pb: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <Typography
          component="h2"
          variant="subtitle1"
          sx={{ fontWeight: 700, letterSpacing: '-0.01em', fontSize: '1rem' }}
        >
          {title}
        </Typography>
        <IconButton
          aria-label={closeLabel}
          onClick={onClose}
          size="small"
          sx={{
            width: 32,
            height: 32,
            backgroundColor: alpha(theme.palette.text.primary, 0.07),
            '&:hover': { backgroundColor: alpha(theme.palette.text.primary, 0.12) },
            '&:active': { backgroundColor: alpha(theme.palette.text.primary, 0.16) },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Scrollable Content */}
      <Box sx={{ px: 2, pb: 'calc(20px + env(safe-area-inset-bottom))', overflowY: 'auto', flex: 1 }}>
        <motion.div {...motionProps}>
          {groups.map((group, groupIndex) => (
            <Box key={group.key} sx={{ mb: groupIndex < groups.length - 1 ? 0 : 0 }}>
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  color: 'text.disabled',
                  fontWeight: 700,
                  fontSize: '0.67rem',
                  letterSpacing: '0.07em',
                  px: 0.5,
                  mb: 1,
                }}
              >
                {getLabel(group.titleKey)}
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 1,
                }}
              >
                {group.items.map((item) => {
                  const active = isItemActive(item);
                  return (
                    <motion.div key={item.key} {...itemMotionProps} style={{ display: 'contents' }}>
                      <ButtonBase
                        data-guide-target={`mobile-feature-${item.key}`}
                        onClick={() => onSelect(item)}
                        focusRipple
                        sx={{
                          width: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.75,
                          py: 2,
                          px: 1,
                          borderRadius: 3,
                          backgroundColor: active
                            ? alpha(theme.palette.primary.main, 0.12)
                            : alpha(theme.palette.text.primary, 0.04),
                          color: active ? 'primary.main' : 'text.secondary',
                          border: '1.5px solid',
                          borderColor: active
                            ? alpha(theme.palette.primary.main, 0.3)
                            : 'transparent',
                          transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 120ms ease',
                          '&:hover': {
                            backgroundColor: active
                              ? alpha(theme.palette.primary.main, 0.18)
                              : alpha(theme.palette.text.primary, 0.08),
                          },
                          '&:active': {
                            transform: 'scale(0.95)',
                            backgroundColor: active
                              ? alpha(theme.palette.primary.main, 0.22)
                              : alpha(theme.palette.text.primary, 0.12),
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'inherit',
                            '& svg': { fontSize: 26 },
                          }}
                        >
                          {item.icon}
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: active ? 700 : 600,
                            fontSize: '0.71rem',
                            color: 'inherit',
                            textAlign: 'center',
                            lineHeight: 1.25,
                          }}
                        >
                          {getLabel(item.key)}
                        </Typography>
                      </ButtonBase>
                    </motion.div>
                  );
                })}
              </Box>

              {groupIndex < groups.length - 1 && (
                <Divider sx={{ my: 2, borderColor: alpha(theme.palette.divider, 0.6) }} />
              )}
            </Box>
          ))}
        </motion.div>
      </Box>
    </SwipeableDrawer>
  );
}
