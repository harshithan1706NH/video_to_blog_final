
const API_BASE = "http://127.0.0.1:5000";

const form = document.getElementById("blogForm");
const titleInput = document.getElementById("blogTitle");
const contentInput = document.getElementById("blogContent");
const statusElement = document.getElementById("status");
const saveButton = document.getElementById("saveButton");
const docxButton = document.getElementById("docxButton");
const pdfButton = document.getElementById("pdfButton");

const blogId = new URLSearchParams(window.location.search).get("id");

let saving = false;
let originalTitle = "";
let originalContent = "";

function setStatus(message, error = false) {
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.style.color = error ? "#b91c1c" : "#166534";
}

function disableControls() {
    if (saveButton) saveButton.disabled = true;
    if (docxButton) docxButton.disabled = true;
    if (pdfButton) pdfButton.disabled = true;
}

async function requestApi(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        }
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json()
        : null;

    if (response.status === 401) {
        window.location.href = "login.html";
        throw new Error("Please log in to continue.");
    }

    if (!response.ok) {
        throw new Error(
            data?.error || `Request failed (${response.status}).`
        );
    }

    return { response, data };
}

async function loadBlog() {
    if (!blogId || !/^\d+$/.test(blogId)) {
        setStatus("Invalid blog ID.", true);
        disableControls();
        return;
    }

    try {
        setStatus("Loading blog...");

        const { data } = await requestApi("/blogs");

        const blogs = Array.isArray(data.blogs) ? data.blogs : [];
        const blog = blogs.find(
            item => String(item.blog_id) === blogId
        );

        if (!blog) {
            throw new Error("Blog not found.");
        }

        titleInput.value = blog.title || "";
        contentInput.value = blog.content || "";

        originalTitle = titleInput.value;
        originalContent = contentInput.value;

        setStatus("Blog Content loaded.");
    } catch (error) {
        setStatus(error.message, true);
        disableControls();
    }
}

async function saveBlog() {
    if (saving) return false;

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
        setStatus("Enter both a title and content before saving.", true);
        return false;
    }

    if (title === originalTitle && content === originalContent) {
        setStatus("No changes to save.");
        return true;
    }

    saving = true;

    if (saveButton) saveButton.disabled = true;

    setStatus("Saving...");

    try {
        const { data } = await requestApi(
            `/blogs/${encodeURIComponent(blogId)}`,
            {
                method: "PUT",
                body: JSON.stringify({ title, content })
            }
        );

        const blog = data.blog;

        originalTitle = blog?.title ?? title;
        originalContent = blog?.content ?? content;

        titleInput.value = originalTitle;
        contentInput.value = originalContent;

        setStatus("Blog saved successfully.");
        return true;
    } catch (error) {
        setStatus(error.message, true);
        return false;
    } finally {
        saving = false;

        if (saveButton) {
            saveButton.disabled = false;
        }
    }
}

if (form) {
    form.addEventListener("submit", async event => {
        event.preventDefault();
        await saveBlog();
    });
}

async function exportBlog(format) {
    if (!blogId) {
        setStatus("Missing blog ID.", true);
        return;
    }

    const button = format === "docx" ? docxButton : pdfButton;

    if (button) button.disabled = true;

    try {
        const saved = await saveBlog();

        if (!saved) return;

        setStatus(`Preparing ${format.toUpperCase()} file...`);

        const { response } = await requestApi(
            `/blogs/${encodeURIComponent(blogId)}/export/${format}`
        );

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `blog_${blogId}.${format}`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        setStatus(`${format.toUpperCase()} export started.`);
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        if (button) button.disabled = false;
    }
}

if (docxButton) {
    docxButton.addEventListener("click", () => exportBlog("docx"));
}

if (pdfButton) {
    pdfButton.addEventListener("click", () => exportBlog("pdf"));
}

loadBlog();
