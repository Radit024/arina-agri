import * as React from 'react';
import Box from '@mui/material/Box';

import ContentState, { type ContentStateProps } from './ContentState';

export interface ResponsiveDataViewProps<T> extends Omit<ContentStateProps, 'children' | 'state'> {
  data: readonly T[];
  getItemKey: (item: T) => React.Key;
  desktop: React.ReactNode;
  renderMobileItem: (item: T) => React.ReactNode;
  state?: ContentStateProps['state'];
}

/**
 * Composes already-built desktop content with a per-item mobile presentation.
 * Display is breakpoint-controlled while content state prevents stale branches
 * from being rendered during loading, empty, and error states.
 */
export default function ResponsiveDataView<T>({
  data,
  desktop,
  getItemKey,
  renderMobileItem,
  state = 'ready',
  ...contentStateProps
}: ResponsiveDataViewProps<T>) {
  return (
    <ContentState state={state} {...contentStateProps}>
      <Box sx={{ display: { md: 'none', xs: 'block' }, minWidth: 0 }}>
        {data.map((item) => (
          <React.Fragment key={getItemKey(item)}>{renderMobileItem(item)}</React.Fragment>
        ))}
      </Box>
      <Box sx={{ display: { md: 'block', xs: 'none' }, minWidth: 0 }}>
        {desktop}
      </Box>
    </ContentState>
  );
}
