document.addEventListener('DOMContentLoaded', () => {

    function setError(inputElement, errorElement, message) {
        if (!inputElement || !errorElement) return;

        inputElement.classList.add('is-invalid');
        errorElement.textContent = message;
        errorElement.classList.add('visible');
    }

    function clearError(inputElement, errorElement) {
        if (!inputElement || !errorElement) return;

        inputElement.classList.remove('is-invalid');
        errorElement.textContent = '';
        errorElement.classList.remove('visible');
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    async function checkSession() {

        try {

            const response = await fetch(
                'http://127.0.0.1:5000/session',
                {
                    method: 'GET',
                    credentials: 'include'
                }
            );

            const result = await response.json();

            if (result.authenticated) {

                VideoBlogStore.updateUser({
                    user_id: result.user.user_id,
                    name: result.user.name,
                    email: result.user.email,
                    isLoggedIn: true
                });

                return result.user;
            }

            VideoBlogStore.updateUser({
                user_id: null,
                name: '',
                email: '',
                isLoggedIn: false
            });

            return null;

        } catch (error) {

            console.error('Session check failed:', error);

            return null;
        }
    }

    const registerForm =
        document.getElementById('register-form');

    if (registerForm) {

        const nameInput =
            document.getElementById('reg-name');

        const emailInput =
            document.getElementById('reg-email');

        const passwordInput =
            document.getElementById('reg-password');

        const confirmPasswordInput =
            document.getElementById('reg-confirm-password');

        const nameError =
            document.getElementById('reg-name-error');

        const emailError =
            document.getElementById('reg-email-error');

        const passwordError =
            document.getElementById('reg-password-error');

        const confirmPasswordError =
            document.getElementById('reg-confirm-password-error');

        [
            nameInput,
            emailInput,
            passwordInput,
            confirmPasswordInput
        ].forEach(input => {

            if (input) {

                input.addEventListener('input', () => {

                    input.classList.remove('is-invalid');

                    const errorElement =
                        document.getElementById(
                            `${input.id}-error`
                        );

                    if (errorElement) {

                        errorElement.textContent = '';
                        errorElement.classList.remove('visible');

                    }

                });

            }

        });

        registerForm.addEventListener(
            'submit',
            async (e) => {

                e.preventDefault();

                let isValid = true;

                const name =
                    nameInput.value.trim();

                const email =
                    emailInput.value.trim();

                const password =
                    passwordInput.value;

                const confirmPassword =
                    confirmPasswordInput.value;

                if (!name) {

                    setError(
                        nameInput,
                        nameError,
                        'Name is required.'
                    );

                    isValid = false;

                } else {

                    clearError(
                        nameInput,
                        nameError
                    );

                }

                if (!email) {

                    setError(
                        emailInput,
                        emailError,
                        'Email address is required.'
                    );

                    isValid = false;

                } else if (!isValidEmail(email)) {

                    setError(
                        emailInput,
                        emailError,
                        'Please enter a valid email address.'
                    );

                    isValid = false;

                } else {

                    clearError(
                        emailInput,
                        emailError
                    );

                }

                if (!password) {

                    setError(
                        passwordInput,
                        passwordError,
                        'Password is required.'
                    );

                    isValid = false;

                } else if (password.length < 6) {

                    setError(
                        passwordInput,
                        passwordError,
                        'Password must be at least 6 characters long.'
                    );

                    isValid = false;

                } else {

                    clearError(
                        passwordInput,
                        passwordError
                    );

                }

                if (!confirmPassword) {

                    setError(
                        confirmPasswordInput,
                        confirmPasswordError,
                        'Please confirm your password.'
                    );

                    isValid = false;

                } else if (password !== confirmPassword) {

                    setError(
                        confirmPasswordInput,
                        confirmPasswordError,
                        'Passwords do not match.'
                    );

                    isValid = false;

                } else {

                    clearError(
                        confirmPasswordInput,
                        confirmPasswordError
                    );

                }

                if (!isValid) {
                    return;
                }

                const submitButton =
                    document.getElementById(
                        'register-submit-btn'
                    );

                submitButton.disabled = true;
                submitButton.textContent = 'Registering...';

                try {

                    const response = await fetch(
                        'http://127.0.0.1:5000/signup',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                name: name,
                                email: email,
                                password: password
                            })
                        }
                    );

                    const result =
                        await response.json();

                    if (!response.ok || !result.success) {

                        throw new Error(
                            result.message ||
                            'Registration failed.'
                        );

                    }

                    alert(
                        'Registration successful. Please login.'
                    );

                    window.location.href =
                        'login.html';

                } catch (error) {

                    setError(
                        emailInput,
                        emailError,
                        error.message
                    );

                } finally {

                    submitButton.disabled = false;
                    submitButton.textContent = 'Register';

                }

            }
        );
    }

    const loginForm =
        document.getElementById('login-form');

    if (loginForm) {

        const emailInput =
            document.getElementById('login-email');

        const passwordInput =
            document.getElementById('login-password');

        const emailError =
            document.getElementById('login-email-error');

        const passwordError =
            document.getElementById('login-password-error');

        [
            emailInput,
            passwordInput
        ].forEach(input => {

            if (input) {

                input.addEventListener('input', () => {

                    input.classList.remove('is-invalid');

                    const errorElement =
                        document.getElementById(
                            `${input.id}-error`
                        );

                    if (errorElement) {

                        errorElement.textContent = '';
                        errorElement.classList.remove('visible');

                    }

                });

            }

        });

        loginForm.addEventListener(
            'submit',
            async (e) => {

                e.preventDefault();

                let isValid = true;

                const email =
                    emailInput.value.trim();

                const password =
                    passwordInput.value;

                if (!email) {

                    setError(
                        emailInput,
                        emailError,
                        'Email address is required.'
                    );

                    isValid = false;

                } else if (!isValidEmail(email)) {

                    setError(
                        emailInput,
                        emailError,
                        'Please enter a valid email address.'
                    );

                    isValid = false;

                } else {

                    clearError(
                        emailInput,
                        emailError
                    );

                }

                if (!password) {

                    setError(
                        passwordInput,
                        passwordError,
                        'Password is required.'
                    );

                    isValid = false;

                } else {

                    clearError(
                        passwordInput,
                        passwordError
                    );

                }

                if (!isValid) {
                    return;
                }

                const submitButton =
                    document.getElementById(
                        'login-submit-btn'
                    );

                submitButton.disabled = true;
                submitButton.textContent = 'Logging in...';

                try {

                    const response = await fetch(
                        'http://127.0.0.1:5000/login',
                        {
                            method: 'POST',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                email: email,
                                password: password
                            })
                        }
                    );

                    const result =
                        await response.json();

                    if (!response.ok || !result.success) {

                        throw new Error(
                            result.message ||
                            'Login failed.'
                        );

                    }

                    VideoBlogStore.updateUser({
                        user_id: result.user.user_id,
                        name: result.user.name,
                        email: result.user.email,
                        isLoggedIn: true
                    });

                    window.location.href =
                        'dashboard.html';

                } catch (error) {

                    setError(
                        passwordInput,
                        passwordError,
                        error.message
                    );

                } finally {

                    submitButton.disabled = false;
                    submitButton.textContent = 'Login';

                }

            }
        );
    }

    const profileForm =
        document.getElementById('profile-form');

    if (profileForm) {

        const nameInput =
            document.getElementById('profile-name');

        const emailInput =
            document.getElementById('profile-email');

        const logoutBtn =
            document.getElementById('profile-logout-btn');

        checkSession().then(user => {

            if (!user) {

                window.location.href =
                    'login.html';

                return;
            }

            if (nameInput) {
                nameInput.value =
                    user.name || '';
            }

            if (emailInput) {
                emailInput.value =
                    user.email || '';
            }

        });

        if (logoutBtn) {

            logoutBtn.addEventListener(
                'click',
                async () => {

                    try {

                        const response =
                            await fetch(
                                'http://127.0.0.1:5000/logout',
                                {
                                    method: 'POST',
                                    credentials: 'include'
                                }
                            );

                        const result =
                            await response.json();

                        if (result.success) {

                            VideoBlogStore.updateUser({
                                user_id: null,
                                name: '',
                                email: '',
                                isLoggedIn: false
                            });

                            window.location.href =
                                'login.html';

                        }

                    } catch (error) {

                        console.error(error);

                    }

                }
            );

        }

    }

});