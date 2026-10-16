const DEFAULT_USER = {
    user_id: null,
    name: "",
    email: "",
    isLoggedIn: false
};

const STORAGE_KEYS = {
    BLOGS: "videoblog_blogs",
    USER: "videoblog_user",
    TEMP_VIDEO: "videoblog_temp_video",
    CURRENT_BLOG_ID: "videoblog_current_blog_id"
};

const VideoBlogStore = {
    init() {
        if (!localStorage.getItem(STORAGE_KEYS.BLOGS)) {
            localStorage.setItem(STORAGE_KEYS.BLOGS, JSON.stringify([]));
        }

        if (!localStorage.getItem(STORAGE_KEYS.USER)) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_USER));
        }
    },

    getUser() {
        this.init();

        try {
            const stored = localStorage.getItem(STORAGE_KEYS.USER);
            return stored
                ? { ...DEFAULT_USER, ...JSON.parse(stored) }
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

        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userState));
    },

    clearUser() {
        localStorage.removeItem(STORAGE_KEYS.USER);
    },

    setTempUploadedVideo(video) {
        localStorage.setItem(STORAGE_KEYS.TEMP_VIDEO, JSON.stringify(video));
    },

    getTempUploadedVideo() {
        const data = localStorage.getItem(STORAGE_KEYS.TEMP_VIDEO);
        return data ? JSON.parse(data) : null;
    },

    clearTempUploadedVideo() {
        localStorage.removeItem(STORAGE_KEYS.TEMP_VIDEO);
    }
};

VideoBlogStore.init();
window.VideoBlogStore = VideoBlogStore;
