import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function BackButton() {
    const navigate = useNavigate();
    // Track navigation history stack
    const [canGoBack, setCanGoBack] = useState(false);
    const lastLength = useRef(window.history.length);

    useEffect(() => {
        // Listen for popstate to update canGoBack
        const update = () => setCanGoBack(window.history.length > 1);
        window.addEventListener('popstate', update);
        update();
        return () => window.removeEventListener('popstate', update);
    }, []);

    return (
        <Tooltip title={canGoBack ? 'Go Back' : 'No more history'}>
            <span>
                <IconButton
                    onClick={() => canGoBack && navigate(-1)}
                    disabled={!canGoBack}
                    size="large"
                    sx={{ ml: 0, mr: 2 }}
                >
                    <ArrowBackIcon />
                </IconButton>
            </span>
        </Tooltip>
    );
}
