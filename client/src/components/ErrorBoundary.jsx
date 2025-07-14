import React from 'react';
import UniversalDialog from './UniversalDialog';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, errorInfo: '' };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, errorInfo: error?.toString() || 'An unexpected error occurred.' };
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <UniversalDialog
                    open={true}
                    title="Something Went Wrong"
                    subtitle="A critical error occurred in the application."
                    description={this.state.errorInfo}
                    actions={[
                        { label: 'Reload', color: 'primary', variant: 'contained', onClick: this.handleReload },
                        { label: 'Close', color: 'secondary', variant: 'outlined', onClick: () => this.setState({ hasError: false }) }
                    ]}
                    disableBackdropClick
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
