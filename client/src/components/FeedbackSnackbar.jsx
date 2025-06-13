import React, {memo} from 'react';
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

export default memo(FeedbackSnackbar);