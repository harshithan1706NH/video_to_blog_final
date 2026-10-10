const DEFAULT_USER = {
    user_id: null,
    name: '',
    email: '',
    isLoggedIn: false
};

const STORAGE_KEYS = {
    BLOGS: 'videoblog_blogs',
    USER: 'videoblog_user',
    TEMP_VIDEO: 'videoblog_temp_video',
    CURRENT_BLOG_ID: 'videoblog_current_blog_id'
};

const VideoBlogStore = {

    init() {

        if (!localStorage.getItem(STORAGE_KEYS.BLOGS)) {
            localStorage.setItem(
                STORAGE_KEYS.BLOGS,
                JSON.stringify([])
            );
        }

        if (!localStorage.getItem(STORAGE_KEYS.USER)) {
            localStorage.setItem(
                STORAGE_KEYS.USER,
                JSON.stringify(DEFAULT_USER)
            );
        }

    },

    getUser() {

        this.init();

        try {

            const data =
                localStorage.getItem(
                    STORAGE_KEYS.USER
                );

            return data
                ? JSON.parse(data)
                : DEFAULT_USER;

        } catch (error) {

            return DEFAULT_USER;

        }

    },

    updateUser(user) {

        localStorage.setItem(
            STORAGE_KEYS.USER,
            JSON.stringify(user)
        );

    }

};

VideoBlogStore.init();