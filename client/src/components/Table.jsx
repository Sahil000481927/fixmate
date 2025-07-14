import React from 'react';
import {
    Table as MuiTable, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography
} from '@mui/material';

export default function Table({ columns, rows, emptyMessage = 'No data found.' }) {
    return (
        <TableContainer component={Paper} elevation={2}>
            <MuiTable>
                <TableHead>
                    <TableRow>
                        {columns.map((col, idx) => (
                            <TableCell key={idx} sx={{ fontWeight: 'bold' }}>{col}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} align="center">
                                <Typography variant="body2" color="text.secondary">
                                    {emptyMessage}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row, idx) => (
                            <TableRow key={idx}>
                                {columns.map((col, colIdx) => (
                                    <TableCell key={colIdx}>{row[col]}</TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </MuiTable>
        </TableContainer>
    );
}
