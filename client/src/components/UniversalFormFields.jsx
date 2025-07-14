import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
    TextField,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    FormHelperText,
    Box,
    Button,
    Typography
} from '@mui/material';

export default function UniversalFormFields({ fields = [], form: controlledForm, errors = {}, onChange, readOnlyFields = [], initialValues = {} }) {
    // Support both controlled and uncontrolled usage
    const [internalForm, setInternalForm] = useState(initialValues);
    const isControlled = typeof controlledForm !== 'undefined' && onChange;
    const form = isControlled ? controlledForm : internalForm;

    useEffect(() => {
        if (!isControlled && initialValues) {
            setInternalForm(initialValues);
        }
    }, [initialValues]);

    const handleFieldChange = (name, value) => {
        if (isControlled) {
            onChange(name, value, { ...form, [name]: value });
        } else {
            const updated = { ...form, [name]: value };
            setInternalForm(updated);
            if (onChange) onChange(name, value, updated);
        }
    };

    if (!Array.isArray(fields) || fields.length === 0) return null;
    return (
        <Box display="flex" flexDirection="column" gap={2}>
            {fields.map(field => {
                const { name, label, type, options, required, multiline, minRows, accept, render, ...rest } = field;
                // Remove 'render' from rest to avoid passing it to DOM elements
                const value = form[name] ?? '';
                const error = errors[name] || '';
                const isReadOnly = readOnlyFields.includes(name);

                if (type === 'select') {
                    return (
                        <FormControl fullWidth key={name} error={!!error} required={required} disabled={isReadOnly}>
                            <InputLabel>{label}</InputLabel>
                            <Select
                                value={value}
                                onChange={e => handleFieldChange(name, e.target.value)}
                                {...rest}
                            >
                                {options && options.map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                            {error && <FormHelperText>{error}</FormHelperText>}
                        </FormControl>
                    );
                }

                if (type === 'file') {
                    return (
                        <Box key={name}>
                            <Button variant="outlined" component="label" disabled={isReadOnly}>
                                {label}
                                <input
                                    type="file"
                                    hidden
                                    accept={accept || '*/*'}
                                    onChange={e => handleFieldChange(name, e.target.files[0])}
                                    {...rest}
                                />
                            </Button>
                            {value && <Typography variant="body2" sx={{ mt: 1 }}>{value.name}</Typography>}
                            {error && <FormHelperText error>{error}</FormHelperText>}
                        </Box>
                    );
                }

                return (
                    <TextField
                        key={name}
                        fullWidth
                        label={label}
                        name={name}
                        type={type}
                        value={value}
                        onChange={e => handleFieldChange(name, e.target.value)}
                        error={!!error}
                        helperText={error || ' '}
                        required={required}
                        multiline={multiline}
                        minRows={multiline ? (minRows || 3) : undefined}
                        InputProps={{ readOnly: isReadOnly }}
                        {...rest}
                    />
                );
            })}
        </Box>
    );
}

UniversalFormFields.propTypes = {
    fields: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        required: PropTypes.bool,
        options: PropTypes.array,
        multiline: PropTypes.bool,
        minRows: PropTypes.number,
        accept: PropTypes.string,
    })).isRequired,
    form: PropTypes.object.isRequired,
    errors: PropTypes.object,
    onChange: PropTypes.func.isRequired,
    readOnlyFields: PropTypes.arrayOf(PropTypes.string),
};
