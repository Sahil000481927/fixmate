import React, {memo, createContext, useContext, useState, useCallback} from 'react';
import PropTypes from 'prop-types';
import {Snackbar, Alert, Slide, useMediaQuery} from '@mui/material';
import {useTheme} from '@mui/material/styles';

const FeedbackSnackbar = ({
                              open,
                              onClose,
                              severity = 'info',
                              message = '',
                              icon = null,
                              duration = 4000,
                              sx = {}
                          }) => {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Snackbar
            open={open}
            onClose={onClose}
            TransitionComponent={(props) => <Slide {...props} direction="up"/>}
            autoHideDuration={duration}
            anchorOrigin={{
                vertical: isSmallScreen ? 'top' : 'bottom',
                horizontal: 'center'
            }}
            role="alert"
            aria-live="assertive"
        >
            <Alert
                onClose={onClose}
                severity={severity}
                icon={icon}
                variant="filled"
                sx={{width: '100%', ...sx}}
            >
                {message}
            </Alert>
        </Snackbar>
    );
};

FeedbackSnackbar.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    severity: PropTypes.oneOf(['success', 'error', 'info', 'warning']),
    message: PropTypes.string,
    icon: PropTypes.node,
    duration: PropTypes.number,
    sx: PropTypes.object
};

// Snackbar Context and Provider
const SnackbarContext = createContext();

export function SnackbarProvider({ children }) {
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info', icon: null, duration: 4000, sx: {} });
    const showSnackbar = useCallback((message, severity = 'info', options = {}) => {
        setSnackbar({
            open: true,
            message,
            severity,
            ...options
        });
    }, []);
    const handleClose = useCallback(() => {
        setSnackbar(s => ({ ...s, open: false }));
    }, []);
    return (
        <SnackbarContext.Provider value={{ showSnackbar }}>
            {children}
            <FeedbackSnackbar
                open={snackbar.open}
                onClose={handleClose}
                severity={snackbar.severity}
                message={snackbar.message}
                icon={snackbar.icon}
                duration={snackbar.duration}
                sx={snackbar.sx}
            />
        </SnackbarContext.Provider>
    );
}

export function useSnackbar() {
    const ctx = useContext(SnackbarContext);
    if (!ctx) throw new Error('useSnackbar must be used within a SnackbarProvider');
    return ctx;
}

export default memo(FeedbackSnackbar);