/**
 * Login Page Utility Functions and Constants
 */

// Validation functions
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password) => {
    return password.length >= 6;
};

// Error messages
export const errorMessages = {
    emailRequired: 'Email address is required',
    emailInvalid: 'Please enter a valid email address',
    passwordRequired: 'Password is required',
    passwordTooShort: 'Password must be at least 6 characters',
    loginFailed: 'Invalid email or password',
};

// Form field configurations
export const formFields = {
    email: {
        name: 'email',
        type: 'email',
        placeholder: 'Enter your email address...',
        autoComplete: 'email',
    },
    password: {
        name: 'password',
        type: 'password',
        placeholder: 'Enter your password...',
        autoComplete: 'current-password',
    },
};
