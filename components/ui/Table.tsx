import React from 'react';
import MuiTable from '@mui/material/Table';
import MuiTableBody from '@mui/material/TableBody';
import MuiTableCell, { TableCellProps } from '@mui/material/TableCell';
import MuiTableContainer from '@mui/material/TableContainer';
import MuiTableHead from '@mui/material/TableHead';
import MuiTableRow, { TableRowProps } from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useTheme, alpha } from '@mui/material/styles';

export interface DataTableProps {
  /**
   * Column headers.
   */
  columns: React.ReactNode[];
  /**
   * Max height of the table container for scrollable tables.
   */
  maxHeight?: number | string;
  /**
   * The content of the table body (TableRows).
   */
  children: React.ReactNode;
  /**
   * Optional loading state.
   */
  loading?: boolean;
  /**
   * Text to show when loading.
   */
  loadingText?: string;
  /**
   * Show empty state if children are empty or length is 0.
   * If true, it relies on children being an array. Alternatively, use EmptyState component directly.
   */
  isEmpty?: boolean;
  /**
   * Text or node to show when empty.
   */
  emptyContent?: React.ReactNode;
}

export function DataTable({
  columns,
  maxHeight = 520,
  children,
  loading = false,
  loadingText = 'Memuat data...',
  isEmpty = false,
  emptyContent = 'Data tidak ditemukan',
}: DataTableProps) {
  return (
    <MuiTableContainer sx={{ maxHeight }}>
      <MuiTable stickyHeader size="small">
        <MuiTableHead>
          <MuiTableRow>
            {columns.map((col, i) => (
              <MuiTableCell
                key={i}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  bgcolor: 'background.paper',
                }}
              >
                {col}
              </MuiTableCell>
            ))}
          </MuiTableRow>
        </MuiTableHead>
        <MuiTableBody>
          {loading ? (
            <MuiTableRow>
              <MuiTableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {loadingText}
                </Typography>
              </MuiTableCell>
            </MuiTableRow>
          ) : isEmpty ? (
            <MuiTableRow>
              <MuiTableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                {typeof emptyContent === 'string' ? (
                  <Typography variant="body2" color="text.secondary">
                    {emptyContent}
                  </Typography>
                ) : (
                  emptyContent
                )}
              </MuiTableCell>
            </MuiTableRow>
          ) : (
            children
          )}
        </MuiTableBody>
      </MuiTable>
    </MuiTableContainer>
  );
}

export const DataTableRow = (props: TableRowProps) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  return (
    <MuiTableRow
      {...props}
      sx={{
        '&:hover': {
          bgcolor: alpha(theme.palette.text.primary, isDarkMode ? 0.04 : 0.02),
        },
        ...props.sx,
      }}
    />
  );
};

export const DataTableCell = (props: TableCellProps) => {
  return (
    <MuiTableCell
      {...props}
      sx={{
        fontSize: '0.8rem',
        ...props.sx,
      }}
    />
  );
};
