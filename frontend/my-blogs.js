
const API_BASE = "http://127.0.0.1:5000";

document.addEventListener("DOMContentLoaded", loadBlogs);

async function loadBlogs() {
    const blogsContainer = document.getElementById("my-blogs-grid");
    const emptyState = document.getElementById("empty-my-blogs");

    if (!blogsContainer) {
        console.error("Element #my-blogs-grid was not found.");
        return;
    }

    blogsContainer.replaceChildren();

    if (emptyState) {
        emptyState.style.display = "none";
    }

    try {
        const response = await fetch(`${API_BASE}/blogs`, {
            method: "GET",
            credentials: "include"
        });

        const result = await response.json();

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) {
            throw new Error(result.error || `Request failed (${response.status}).`);
        }

        const blogs = Array.isArray(result.blogs) ? result.blogs : [];

        if (blogs.length === 0) {
            if (emptyState) {
                emptyState.style.display = "block";
            } else {
                blogsContainer.textContent = "No saved blogs found.";
            }
            return;
        }

        for (const blog of blogs) {
            blogsContainer.appendChild(createBlogCard(blog));
        }
    } catch (error) {
        console.error("Failed to load blogs:", error);

        const message = document.createElement("p");
        message.textContent =
            error.message === "Failed to fetch"
                ? "Cannot connect to the backend. Make sure Flask is running on port 5000."
                : error.message;

        blogsContainer.appendChild(message);
    }
}

function formatCreatedAt(value) {
    if (!value) {
        return "Creation date unavailable";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Creation date unavailable";
    }

    return `Created: ${date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    })}`;
}

function createBlogCard(blog) {
    const card = document.createElement("article");
    card.className = "blog-card";

    const title = document.createElement("h3");
    title.textContent = blog.title || "Untitled Blog";

    const date = document.createElement("p");
    date.textContent = formatCreatedAt(blog.created_at);

    const content = document.createElement("p");
    content.textContent = (blog.content || "")
        .replace(/\s+/g, " ")
        .slice(0, 180);

    const pageDirectory = window.location.pathname.replace(/[^/]*$/, "");
    const blogId = encodeURIComponent(blog.blog_id);

    const viewLink = document.createElement("a");
    viewLink.href = `${pageDirectory}blog.html?id=${blogId}`;
    viewLink.className = "btn btn-primary";
    viewLink.textContent = "View Blog Content";

    const editLink = document.createElement("a");
    editLink.href = `${pageDirectory}blog-editor.html?id=${blogId}`;
    editLink.className = "btn btn-secondary";
    editLink.textContent = "Edit Blog Content";

    card.append(title, date, content, viewLink, editLink);

    return card;
}
