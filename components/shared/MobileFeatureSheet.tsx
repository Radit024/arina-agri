'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { motion, useReducedMotion } from 'framer-motion';

export interface MobileFeatureItem {
  key: string;
  icon: ReactNode;
  path: string | null;
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
  onClose: () => void;
  onSelect: (item: MobileFeatureItem) => void;
}

export default function MobileFeatureSheet({
  open,
  title,
  closeLabel,
  groups,
  getLabel,
  onClose,
  onSelect,
}: MobileFeatureSheetProps) {
  const reduceMotion = useReducedMotion();
  const listVariants = {
    open: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
    closed: { opacity: 0 },
  };
  const itemVariants = {
    open: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
    closed: { opacity: 0, y: 8 },
  };
  const listMotionProps = reduceMotion
    ? {}
    : { variants: listVariants, initial: 'closed', animate: open ? 'open' : 'closed' };
  const itemMotionProps = reduceMotion ? {} : { variants: itemVariants };

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      disableDiscovery={false}
      swipeAreaWidth={24}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '60vh',
            minHeight: '40vh',
            height: 'auto',
            backgroundColor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Drag Handle */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pt: 1.5, pb: 0.5, flexShrink: 0 }}>
          <Box
            aria-hidden
            sx={{
              width: 40,
              height: 4,
              borderRadius: 999,
              backgroundColor: 'divider',
            }}
          />
        </Box>

        {/* Title Bar */}
        <Box
          sx={{
            px: 2.5,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <Typography component="h2" variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
            {title}
          </Typography>
          <IconButton aria-label={closeLabel} onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Scrollable Feature List */}
        <List sx={{ px: 2, pb: 'calc(16px + env(safe-area-inset-bottom))', overflowY: 'auto', flex: 1 }}>
          <motion.div {...listMotionProps}>
            {groups.map((group, index) => (
              <Box key={group.key}>
                <ListSubheader
                  disableSticky
                  sx={{
                    backgroundColor: 'transparent',
                    color: 'text.secondary',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '0.72rem',
                    letterSpacing: '0.04em',
                    lineHeight: 1.4,
                    py: 0.5,
                    px: 1,
                  }}
                >
                  {getLabel(group.titleKey)}
                </ListSubheader>

                {group.items.map((item) => (
                  <motion.div key={item.key} {...itemMotionProps} style={{ width: '100%' }}>
                    <ListItemButton
                      data-guide-target={`mobile-feature-${item.key}`}
                      onClick={() => onSelect(item)}
                      sx={{
                        borderRadius: 2,
                        minHeight: 50,
                        py: 1,
                        mb: 1,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={getLabel(item.key)}
                        slotProps={{
                          primary: {
                            sx: {
                              fontSize: '0.92rem',
                              fontWeight: 600,
                              color: 'text.primary',
                            },
                          },
                        }}
                      />
                    </ListItemButton>
                  </motion.div>
                ))}

                {index < groups.length - 1 && <Divider sx={{ my: 1 }} />}
              </Box>
            ))}
          </motion.div>
        </List>
      </Box>
    </SwipeableDrawer>
  );
}
