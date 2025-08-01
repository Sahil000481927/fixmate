import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button, IconButton, Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';

export default function UniversalDialog({
                                            open,
                                            onClose,
                                            title = 'Dialog Title',
                                            subtitle = '',
                                            description = '',
                                            icon = null,
                                            actions = [{ label: 'OK', color: 'primary', variant: 'contained', onClick: onClose }],
                                            children,
                                            fullWidth = true,
                                            maxWidth = 'sm',
                                            hideCloseButton = false,
                                            disableBackdropClick = false,
                                            form: controlledForm,
                                            initialForm = {},
                                            onFormChange,
                                        }) {
    // Support both controlled and uncontrolled form state for dialog
    const [internalForm, setInternalForm] = useState(initialForm);
    const isControlled = typeof controlledForm !== 'undefined' && typeof onFormChange === 'function';
    const form = isControlled ? controlledForm : internalForm;
    useEffect(() => {
        if (!isControlled && initialForm) {
            setInternalForm(initialForm);
        }
        // Only run when dialog is opened
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    const handleFormChange = (name, value, updatedForm) => {
        if (isControlled) {
            onFormChange(name, value, updatedForm);
        } else {
            setInternalForm(updatedForm);
            if (onFormChange) onFormChange(name, value, updatedForm);
        }
    };
    return (
        <Dialog
            open={open}
            onClose={disableBackdropClick ? undefined : onClose}
            fullWidth={fullWidth}
            maxWidth={maxWidth}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {icon}
                <span style={{ flexGrow: 1 }}>{title}</span>
                {!hideCloseButton && (
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                )}
            </DialogTitle>
            {subtitle && (
                <Typography variant="subtitle1" sx={{ px: 3, pb: 1, color: 'text.secondary' }}>
                    {subtitle}
                </Typography>
            )}
            <Divider />
            <DialogContent>
                {description && (
                    <Typography sx={{ mb: 2 }}>{description}</Typography>
                )}
                {typeof children === 'function' ? children({ form, onFormChange: handleFormChange }) : children}
            </DialogContent>
            <DialogActions>
                {actions.map(({ label, color, variant, onClick, loading, disabled }, idx) => (
                    <Button
                        key={idx}
                        onClick={onClick}
                        color={color || 'primary'}
                        variant={variant || 'text'}
                        disabled={!!loading || !!disabled}
                        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                    >
                        {label}
                    </Button>
                ))}
            </DialogActions>
        </Dialog>
    );
}
