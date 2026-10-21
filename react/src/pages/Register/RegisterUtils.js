/**
 * Register Page Utility Functions and Constants
 */

// Validation functions
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password) => {
    return password.length >= 8;
};

export const validateFullName = (name) => {
    return name.trim().length >= 2;
};

export const validatePasswordMatch = (password, confirmPassword) => {
    return password === confirmPassword;
};

// Risk tolerance options
export const riskToleranceOptions = [
    { value: 0, label: 'Low', description: 'Conservative approach, minimal risk exposure', color: 'green' },
    { value: 1, label: 'Medium', description: 'Balanced approach, moderate risk tolerance', color: 'yellow' },
    { value: 2, label: 'High', description: 'Aggressive approach, higher risk for potential gains', color: 'red' },
];

// Error messages
export const errorMessages = {
    fullNameRequired: 'Full name is required',
    fullNameTooShort: 'Full name must be at least 2 characters',
    emailRequired: 'Email address is required',
    emailInvalid: 'Please enter a valid email address',
    passwordRequired: 'Password is required',
    passwordTooShort: 'Password must be at least 8 characters',
    confirmPasswordRequired: 'Please confirm your password',
    passwordsDoNotMatch: 'Passwords do not match',
    riskToleranceRequired: 'Please select your risk tolerance',
    registrationFailed: 'Registration failed. Please try again.',
};

// Password strength checker
export const getPasswordStrength = (password) => {
    if (!password) return { level: 0, label: '', color: '' };

    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 1) return { level: 1, label: 'Weak', color: 'red' };
    if (strength <= 2) return { level: 2, label: 'Fair', color: 'orange' };
    if (strength <= 3) return { level: 3, label: 'Good', color: 'yellow' };
    if (strength <= 4) return { level: 4, label: 'Strong', color: 'green' };
    return { level: 5, label: 'Very Strong', color: 'emerald' };
};
