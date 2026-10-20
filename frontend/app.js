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
    CURRENT_BLOG: 'videoblog_current_blog'
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

    },

    getBlogs() {

        try {

            const data =
                localStorage.getItem(STORAGE_KEYS.BLOGS);

            return data ? JSON.parse(data) : [];

        } catch (error) {

            return [];

        }

    },

    saveBlogs(blogs) {

        localStorage.setItem(
            STORAGE_KEYS.BLOGS,
            JSON.stringify(blogs)
        );

    },

    addBlog(blog) {

        const blogs = this.getBlogs();
        blogs.unshift(blog);
        this.saveBlogs(blogs);

    },

    setTempUploadedVideo(video) {

        localStorage.setItem(
            STORAGE_KEYS.TEMP_VIDEO,
            JSON.stringify(video)
        );

    },

    getTempUploadedVideo() {

        try {

            const data =
                localStorage.getItem(STORAGE_KEYS.TEMP_VIDEO);

            return data ? JSON.parse(data) : null;

        } catch (error) {

            return null;

        }

    },

    setCurrentBlog(blog) {

        localStorage.setItem(
            STORAGE_KEYS.CURRENT_BLOG,
            JSON.stringify(blog)
        );

    },

    getCurrentBlog() {

        try {

            const data =
                localStorage.getItem(STORAGE_KEYS.CURRENT_BLOG);

            return data ? JSON.parse(data) : null;

        } catch (error) {

            return null;

        }

    }

};

VideoBlogStore.init();
