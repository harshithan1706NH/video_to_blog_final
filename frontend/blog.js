
const API_BASE = "http://127.0.0.1:5000";

document.addEventListener("DOMContentLoaded", loadBlog);

async function loadBlog() {
    const params = new URLSearchParams(window.location.search);
    const blogId = params.get("id");

    if (!blogId) {
        showUnavailableMessage("No content ID was provided.");
        return;
    }

    setText("blog-display-title", "Loading blog content...");
    setText("blog-display-content", "Loading content...");

    try {
        const response = await fetch(
            `${API_BASE}/blogs/${encodeURIComponent(blogId)}`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const result = await response.json();

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to load the requested content."
            );
        }

        const blog = result.blog;

        if (!blog) {
            throw new Error("The requested content was not found.");
        }

        setText("blog-display-title", blog.title || "Untitled Blog Content");
        setText("blog-display-source", "Generated from uploaded video");
        setText("blog-display-date", formatDate(blog.created_at));
        setText("blog-display-content", blog.content || "No content available.");

        const editButton = document.getElementById("btn-edit-blog");

        if (editButton) {
            editButton.href = `blog-editor.html?id=${encodeURIComponent(blog.blog_id)}`;
        }
    } catch (error) {
        console.error("Failed to load blog content:", error);

        showUnavailableMessage(
            error.message === "Failed to fetch"
                ? "Cannot connect to the backend. Ensure Flask is running on port 5000."
                : error.message
        );
    }
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value ?? "";
    }
}

function formatDate(value) {
    if (!value) {
        return "Creation date unavailable";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Creation date unavailable";
    }

    return `Created: ${date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    })}`;
}

function showUnavailableMessage(messageText) {
    const container = document.getElementById("blog-view-container");

    if (!container) {
        console.error(messageText);
        return;
    }

    container.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = "Content Unavailable";

    const message = document.createElement("p");
    message.textContent = messageText;

    const link = document.createElement("a");
    link.href = "my-blogs.html";
    link.textContent = "Back to My Blog Content";

    container.append(heading, message, link);
}
