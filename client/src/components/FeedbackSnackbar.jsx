import React, {
    memo,
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect
} from 'react';
import PropTypes from 'prop-types';
import {
    Snackbar,
    Alert,
    Slide,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

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
            TransitionComponent={(props) => <Slide {...props} direction="up" />}
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
                sx={{ width: '100%', ...sx }}
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

// Snackbar Context and Provider with queue support
const SnackbarContext = createContext();

// Global reference for non-React code (e.g., ApiClient)
let globalShowSnackbar = null;
export function setGlobalShowSnackbar(fn) {
    globalShowSnackbar = fn;
}
export function triggerGlobalSnackbar(message, severity = 'error', options = {}) {
    if (typeof globalShowSnackbar === 'function') {
        globalShowSnackbar(message, severity, options);
    }
}

export function SnackbarProvider({ children }) {
    const [queue, setQueue] = useState([]);
    const [current, setCurrent] = useState(null);

    const showSnackbar = useCallback((message, severity = 'info', options = {}) => {
        setQueue(prev => [...prev, { message, severity, ...options }]);
    }, []);

    // Set global reference for non-React code
    useEffect(() => {
        setGlobalShowSnackbar(() => showSnackbar);
        return () => setGlobalShowSnackbar(null);
    }, [showSnackbar]);

    const handleClose = useCallback(() => {
        setCurrent(null);
    }, []);

    useEffect(() => {
        if (!current && queue.length > 0) {
            setCurrent(queue[0]);
            setQueue(prev => prev.slice(1));
        }
    }, [queue, current]);

    return (
        <SnackbarContext.Provider value={{ showSnackbar }}>
            {children}
            {current && (
                <FeedbackSnackbar
                    open={!!current}
                    onClose={handleClose}
                    severity={current.severity}
                    message={current.message}
                    icon={current.icon}
                    duration={current.duration || 4000}
                    sx={current.sx}
                />
            )}
        </SnackbarContext.Provider>
    );
}

export function useSnackbar() {
    const ctx = useContext(SnackbarContext);
    if (!ctx) throw new Error('useSnackbar must be used within a SnackbarProvider');
    return ctx;
}

export default memo(FeedbackSnackbar);
