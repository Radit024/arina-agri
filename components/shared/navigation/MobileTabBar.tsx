'use client';

import * as React from 'react';
import Box, { type BoxProps } from '@mui/material/Box';
import Tabs, { type TabsProps } from '@mui/material/Tabs';
import Tab, { type TabProps } from '@mui/material/Tab';

export interface TabItem<T extends string | number = string | number> {
  id: T;
  label: string;
  icon?: React.ReactElement;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface MobileTabBarProps<T extends string | number = string | number> extends Omit<BoxProps, 'onChange'> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T, event: React.SyntheticEvent) => void;
  ariaLabel?: string;
  variant?: TabsProps['variant'];
  scrollButtons?: TabsProps['scrollButtons'];
  allowScrollButtonsMobile?: boolean;
  tabProps?: Partial<TabProps>;
  containerSx?: BoxProps['sx'];
}

export function MobileTabBar<T extends string | number = string | number>({
  tabs,
  value,
  onChange,
  ariaLabel = 'Navigasi Tab',
  variant = 'scrollable',
  scrollButtons = 'auto',
  allowScrollButtonsMobile = true,
  tabProps,
  sx,
  containerSx,
  ...props
}: MobileTabBarProps<T>) {
  const handleTabChange = (event: React.SyntheticEvent, newValue: T) => {
    onChange(newValue, event);
  };

  return (
    <Box
      sx={[
        {
          position: 'relative',
          width: '100%',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 24,
            pointerEvents: 'none',
            display: { xs: 'block', md: 'none' },
            background: (t) => `linear-gradient(to right, transparent, ${t.palette.background.paper})`,
            zIndex: 1,
          },
        },
        ...(Array.isArray(containerSx) ? containerSx : [containerSx]),
      ]}
      {...props}
    >
      <Tabs
        value={value}
        onChange={handleTabChange}
        aria-label={ariaLabel}
        variant={variant}
        scrollButtons={scrollButtons}
        allowScrollButtonsMobile={allowScrollButtonsMobile}
        sx={[
          {
            minHeight: 48,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTabs-scroller': {
              position: 'relative',
            },
            '& .MuiTab-root': {
              minHeight: 48,
              minWidth: { xs: 44, sm: 80 },
              px: { xs: 2, sm: 2.5 },
              textTransform: 'none',
              fontFamily: 'var(--font-sora)',
              fontWeight: 700,
              fontSize: { xs: '0.8125rem', sm: '0.875rem' },
              transition: 'color 0.18s ease-in-out',
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              bgcolor: 'primary.main',
            },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {tabs.map((item) => (
          <Tab
            key={String(item.id)}
            value={item.id}
            label={item.label}
            icon={item.icon}
            iconPosition="start"
            disabled={item.disabled}
            data-touch-target="44"
            {...tabProps}
          />
        ))}
      </Tabs>
    </Box>
  );
}

export default MobileTabBar;
