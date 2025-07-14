import React from 'react';
import { Paper, Typography, Box, Chip, useTheme } from '@mui/material';

/**
 * Enhanced Card component for requests, dashboard, etc.
 * Props:
 * - title: string
 * - subtitle: string
 * - content: node
 * - actions: node
 * - status: string (optional)
 * - priority: string (optional)
 * - accentColor: string (optional, overrides status/priority color)
 */
export default function Card({ title, subtitle, content, actions, status, priority, accentColor }) {
    const theme = useTheme();
    // Determine accent color based on status/priority
    let borderColor = accentColor;
    if (!borderColor && priority) {
        borderColor = {
            Low: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
            Medium: theme.palette.info.main,
            High: theme.palette.warning.main,
            Critical: theme.palette.error.main
        }[priority] || theme.palette.primary.main;
    }
    if (!borderColor && status) {
        borderColor = {
            'Pending': theme.palette.warning.main,
            'In Progress': theme.palette.info.main,
            'Completed': theme.palette.success.main
        }[status] || theme.palette.primary.main;
    }
    return (
        <Paper
            elevation={theme.palette.mode === 'dark' ? 2 : 3}
            sx={{
                p: 2,
                borderRadius: 2,
                borderLeft: `6px solid ${borderColor || theme.palette.divider}`,
                background: theme.palette.mode === 'dark'
                    ? `linear-gradient(135deg, ${theme.palette.grey[900]}, ${theme.palette.grey[800]})`
                    : '#fff',
                color: theme.palette.text.primary,
                boxShadow: theme.shadows[theme.palette.mode === 'dark' ? 2 : 3],
                mb: 1,
                transition: 'box-shadow 0.2s',
                '&:hover': {
                    boxShadow: theme.shadows[theme.palette.mode === 'dark' ? 4 : 8],
                },
                minWidth: 0,
                maxWidth: '100%',
                border: theme.palette.mode === 'dark' ? `1px solid ${theme.palette.grey[700]}` : undefined,
            }}
        >
            <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                <Typography variant="h6" fontWeight={600} noWrap gutterBottom>{title}</Typography>
                {/* Show status/priority chip if provided */}
                {priority && (
                    <Chip
                        size="small"
                        label={priority}
                        color={{
                            Low: 'default',
                            Medium: 'info',
                            High: 'warning',
                            Critical: 'error'
                        }[priority] || 'default'}
                        sx={{ ml: 1 }}
                    />
                )}
                {status && !priority && (
                    <Chip
                        size="small"
                        label={status}
                        color={{
                            'Pending': 'warning',
                            'In Progress': 'info',
                            'Completed': 'success'
                        }[status] || 'default'}
                        sx={{ ml: 1 }}
                    />
                )}
            </Box>
            {subtitle && (
                <Typography variant="body2" color="text.secondary" gutterBottom noWrap>
                    {subtitle}
                </Typography>
            )}
            <Box sx={{ my: 1, wordBreak: 'break-word' }}>
                {content}
            </Box>
            {actions && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                    {actions}
                </Box>
            )}
        </Paper>
    );
}
