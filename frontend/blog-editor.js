
const API_BASE = "http://127.0.0.1:5001";

const form = document.getElementById("blogForm");
const titleInput = document.getElementById("blogTitle");
const contentInput = document.getElementById("blogContent");
const statusElement = document.getElementById("status");
const saveButton = document.getElementById("saveButton");
const docxButton = document.getElementById("docxButton");
const pdfButton = document.getElementById("pdfButton");

const blogId = new URLSearchParams(window.location.search).get("id");

let saving = false;

function setStatus(message, error = false) {
    statusElement.textContent = message;
    statusElement.style.color = error ? "#b91c1c" : "#166534";
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

    if (!response.ok) {
        let message = `Request failed (${response.status})`;

        try {
            const data = await response.json();
            message = data.error || message;
        } catch (_) {}

        throw new Error(message);
    }

    return response;
}

async function loadBlog() {
    if (!blogId || !/^\d+$/.test(blogId)) {
        setStatus("Invalid blog ID. Open the editor with ?id=YOUR_BLOG_ID.", true);
        disableControls();
        return;
    }

    try {
        setStatus("Loading blog...");

        const response = await requestApi(
            `/api/blogs/${encodeURIComponent(blogId)}`
        );

        const data = await response.json();

        titleInput.value = data.blog.title || "";
        contentInput.value = data.blog.content || "";

        setStatus("Blog loaded.");
    } catch (error) {
        setStatus(error.message, true);
    }
}

function disableControls() {
    saveButton.disabled = true;
    docxButton.disabled = true;
    pdfButton.disabled = true;
}

async function saveBlog() {
    if (saving) return false;

    const title = titleInput.value.trim();
    const content = contentInput.value;

    if (!title || !content.trim()) {
        setStatus("Enter both a title and content before saving.", true);
        return false;
    }

    saving = true;
    saveButton.disabled = true;
    setStatus("Saving...");

    try {
        const response = await requestApi(
            `/api/blogs/${encodeURIComponent(blogId)}`,
            {
                method: "PUT",
                body: JSON.stringify({ title, content })
            }
        );

        const data = await response.json();

        titleInput.value = data.blog.title;
        contentInput.value = data.blog.content;

        setStatus("Blog saved successfully.");
        return true;
    } catch (error) {
        setStatus(error.message, true);
        return false;
    } finally {
        saving = false;
        saveButton.disabled = false;
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveBlog();
});

async function exportBlog(format) {
    if (!blogId) {
        setStatus("Missing blog ID.", true);
        return;
    }

    
    const saved = await saveBlog();
    if (!saved) return;

    const button = format === "docx" ? docxButton : pdfButton;
    button.disabled = true;

    try {
        setStatus(`Preparing ${format.toUpperCase()} file...`);

        const response = await requestApi(
            `/api/blogs/${encodeURIComponent(blogId)}/export/${format}`
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
        button.disabled = false;
    }
}

docxButton.addEventListener("click", () => exportBlog("docx"));
pdfButton.addEventListener("click", () => exportBlog("pdf"));

loadBlog();
