
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.querySelector("#login-form");
    const registerForm = document.querySelector("#register-form");

    function showError(form, message) {
        let error = form.querySelector(".form-error");

        if (!error) {
            error = document.createElement("p");
            error.className = "form-error";
            form.prepend(error);
        }

        error.textContent = message;
    }

    function clearError(form) {
        const error = form.querySelector(".form-error");
        if (error) error.textContent = "";
    }

    async function sendRequest(endpoint, data) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok || result.success === false) {
            throw new Error(result.message || "Request failed.");
        }

        return result;
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async event => {
            event.preventDefault();
            clearError(loginForm);

            const email = loginForm.querySelector('[name="email"]')?.value.trim();
            const password = loginForm.querySelector('[name="password"]')?.value;

            try {
                const result = await sendRequest("/login", { email, password });

                if (result.user) {
                    sessionStorage.setItem(
                        "videoblog_user",
                        JSON.stringify(result.user)
                    );
                }

                window.location.href = "dashboard.html";
            } catch (error) {
                showError(loginForm, error.message);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", async event => {
            event.preventDefault();
            clearError(registerForm);

            const name = registerForm.querySelector('[name="name"]')?.value.trim();
            const email = registerForm.querySelector('[name="email"]')?.value.trim();
            const password = registerForm.querySelector('[name="password"]')?.value;
            const confirmPassword = registerForm.querySelector(
                '[name="confirm-password"]'
            )?.value;

            if (password !== confirmPassword) {
                showError(registerForm, "Passwords do not match.");
                return;
            }

            try {
                await sendRequest("/signup", { name, email, password });
                window.location.href = "login.html";
            } catch (error) {
                showError(registerForm, error.message);
            }
        });
    }
});

async function checkSession() {
    try {
        const response = await fetch(`${API_BASE}/session`, {
            credentials: "include"
        });

        const result = await response.json();

        if (result.logged_in && result.user) {
            sessionStorage.setItem(
                "videoblog_user",
                JSON.stringify(result.user)
            );
            return result.user;
        }

        sessionStorage.removeItem("videoblog_user");
        return null;
    } catch (error) {
        console.error("Unable to check session:", error);
        return null;
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE}/logout`, {
            method: "POST",
            credentials: "include"
        });
    } finally {
        sessionStorage.removeItem("videoblog_user");
        window.location.href = "login.html";
    }
}

window.Auth = { checkSession, logout };
