
const API_BASE = "http://127.0.0.1:5000";

const VideoBlogStore = {
    setTempUploadedVideo(video) {
        sessionStorage.setItem("videoblog_temp_video", JSON.stringify(video));
    },

    getTempUploadedVideo() {
        try {
            return JSON.parse(sessionStorage.getItem("videoblog_temp_video"));
        } catch {
            return null;
        }
    },

    clearTempUploadedVideo() {
        sessionStorage.removeItem("videoblog_temp_video");
    },

    setCurrentBlog(blog) {
        sessionStorage.setItem("videoblog_current_blog", JSON.stringify(blog));
    },

    getCurrentBlog() {
        try {
            return JSON.parse(sessionStorage.getItem("videoblog_current_blog"));
        } catch {
            return null;
        }
    },

    clearCurrentBlog() {
        sessionStorage.removeItem("videoblog_current_blog");
    }
};

window.API_BASE = API_BASE;
window.VideoBlogStore = VideoBlogStore;
