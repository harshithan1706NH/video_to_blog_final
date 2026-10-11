const DEFAULT_USER = {
    user_id: null,
    name: "",
    email: "",
    isLoggedIn: false
};

const STORAGE_KEYS = {
    USER: "videoblog_user"
};

const VideoBlogStore = {
    getUser() {
        try {
            const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

            return storedUser
                ? { ...DEFAULT_USER, ...JSON.parse(storedUser) }
                : { ...DEFAULT_USER };
        } catch (error) {
            console.error("Unable to read user state:", error);
            return { ...DEFAULT_USER };
        }
    },

    updateUser(user) {
        const userState = {
            user_id: user.user_id ?? null,
            name: user.name ?? "",
            email: user.email ?? "",
            isLoggedIn: true
        };

        localStorage.setItem(
            STORAGE_KEYS.USER,
            JSON.stringify(userState)
        );
    },

    clearUser() {
        localStorage.removeItem(STORAGE_KEYS.USER);
    }
};

window.VideoBlogStore = VideoBlogStore;