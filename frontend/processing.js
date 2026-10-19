document.addEventListener("DOMContentLoaded", () => {
    const blog = VideoBlogStore.getCurrentBlog();

    if (blog?.blog_id) {
        window.location.href =
            `blog.html?id=${encodeURIComponent(blog.blog_id)}`;
    } else {
        window.location.href = "upload.html";
    }
});