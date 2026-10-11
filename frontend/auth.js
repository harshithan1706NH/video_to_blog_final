const API_BASE = "http://127.0.0.1:5000";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    function setError(inputId, errorId, message) {
        const input = document.getElementById(inputId);
        const error = document.getElementById(errorId);

        if (input) input.classList.add("is-invalid");

        if (error) {
            error.textContent = message;
            error.classList.add("visible");
        }
    }

    function clearError(inputId, errorId) {
        const input = document.getElementById(inputId);
        const error = document.getElementById(errorId);

        if (input) input.classList.remove("is-invalid");

        if (error) {
            error.textContent = "";
            error.classList.remove("visible");
        }
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function bindErrorClearing(pairs) {
        pairs.forEach(([inputId, errorId]) => {
            const input = document.getElementById(inputId);

            if (input) {
                input.addEventListener("input", () => {
                    clearError(inputId, errorId);
                });
            }
        });
    }

    async function apiRequest(endpoint, options = {}) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        let result = {};

        try {
            result = await response.json();
        } catch {
          
        }

        if (!response.ok || result.success === false) {
            throw new Error(
                result.message || `Request failed (${response.status})`
            );
        }

        return result;
    }

    async function checkSession() {
        try {
            const result = await apiRequest("/session", {
                method: "GET"
            });

            if (!result.authenticated || !result.user) {
                VideoBlogStore.clearUser();

                return {
                    authenticated: false,
                    user: null
                };
            }

            VideoBlogStore.updateUser(result.user);

            return {
                authenticated: true,
                user: result.user
            };
        } catch (error) {
            
            console.error("Session check failed:", error);
            throw error;
        }
    }

    if (registerForm) {
        bindErrorClearing([
            ["reg-name", "reg-name-error"],
            ["reg-email", "reg-email-error"],
            ["reg-password", "reg-password-error"],
            ["reg-confirm-password", "reg-confirm-password-error"]
        ]);

        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const name = document.getElementById("reg-name").value.trim();
            const email = document.getElementById("reg-email").value.trim();
            const password = document.getElementById("reg-password").value;
            const confirmPassword =
                document.getElementById("reg-confirm-password").value;

            let valid = true;

            if (!name) {
                setError("reg-name", "reg-name-error", "Name is required.");
                valid = false;
            }

            if (!isValidEmail(email)) {
                setError(
                    "reg-email",
                    "reg-email-error",
                    "Enter a valid email address."
                );
                valid = false;
            }

            if (password.length < 6) {
                setError(
                    "reg-password",
                    "reg-password-error",
                    "Password must contain at least 6 characters."
                );
                valid = false;
            }

            if (password !== confirmPassword) {
                setError(
                    "reg-confirm-password",
                    "reg-confirm-password-error",
                    "Passwords do not match."
                );
                valid = false;
            }

            if (!valid) return;

            const submitButton =
                document.getElementById("register-submit-btn");

            submitButton.disabled = true;

            try {
                const result = await apiRequest("/signup", {
                    method: "POST",
                    body: JSON.stringify({
                        name,
                        email,
                        password
                    })
                });

                alert(result.message || "Registration successful.");
                window.location.href = "login.html";
            } catch (error) {
                setError(
                    "reg-email",
                    "reg-email-error",
                    error.message || "Registration failed."
                );
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    if (loginForm) {
        bindErrorClearing([
            ["login-email", "login-email-error"],
            ["login-password", "login-password-error"]
        ]);

        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const email =
                document.getElementById("login-email").value.trim();

            const password =
                document.getElementById("login-password").value;

            let valid = true;

            if (!isValidEmail(email)) {
                setError(
                    "login-email",
                    "login-email-error",
                    "Enter a valid email address."
                );
                valid = false;
            }

            if (!password) {
                setError(
                    "login-password",
                    "login-password-error",
                    "Password is required."
                );
                valid = false;
            }

            if (!valid) return;

            const submitButton =
                document.getElementById("login-submit-btn");

            submitButton.disabled = true;

            try {
                const result = await apiRequest("/login", {
                    method: "POST",
                    body: JSON.stringify({ email, password })
                });

                if (!result.user) {
                    throw new Error(
                        "The server did not return the authenticated user."
                    );
                }

                VideoBlogStore.updateUser(result.user);

                window.location.href = "dashboard.html";
            } catch (error) {
                setError(
                    "login-password",
                    "login-password-error",
                    error.message || "Login failed."
                );
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    async function logout() {
        try {
            await apiRequest("/logout", {
                method: "POST"
            });
        } finally {
       
            VideoBlogStore.clearUser();
            window.location.href = "login.html";
        }
    }

    
    window.Auth = {
        checkSession,
        logout
    };
});
