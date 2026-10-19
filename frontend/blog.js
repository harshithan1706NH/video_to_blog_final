document.addEventListener("DOMContentLoaded", () => {
    const blog = VideoBlogStore.getCurrentBlog();
    const video = VideoBlogStore.getTempUploadedVideo();

    const params = new URLSearchParams(window.location.search);
    const requestedBlogId = params.get("id");

    if (
        !blog ||
        (requestedBlogId && String(blog.blog_id) !== requestedBlogId)
    ) {
        showUnavailableMessage();
        return;
    }

    setText("blog-display-title", blog.title || "Generated Blog");
    setText("blog-display-source", video?.name || "Uploaded video");
    setText("blog-display-date", formatDate(blog.created_at));

    const content = blog.content || "";
    const parsed = parseBlogContent(content);

    setText("blog-display-intro", parsed.introduction);
    setText("blog-display-conclusion", parsed.conclusion);

    renderList("blog-display-sections", parsed.sections);
    renderList("blog-display-points", parsed.points);

    hideElement("btn-save-blog");
    hideElement("btn-edit-blog");
    hideElement("btn-download-pdf");
    hideElement("btn-download-docx");

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value || "";
    }

    function hideElement(id) {
        const element = document.getElementById(id);
        if (element) element.style.display = "none";
    }

    function formatDate(value) {
        if (!value) return new Date().toLocaleDateString();

        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? String(value)
            : date.toLocaleDateString();
    }

    function parseBlogContent(text) {
        const result = {
            introduction: "",
            sections: [],
            points: [],
            conclusion: ""
        };

        let currentSection = "";
        let sectionBody = [];

        function saveSection() {
            if (currentSection && sectionBody.length) {
                result.sections.push({
                    title: currentSection,
                    content: sectionBody.join("\n").trim()
                });
            }

            currentSection = "";
            sectionBody = [];
        }

        const lines = text.split(/\r?\n/);

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            if (/^title\s*:/i.test(line)) continue;

            if (/^introduction\s*:/i.test(line)) {
                saveSection();
                currentSection = "Introduction";
                sectionBody = [line.replace(/^introduction\s*:/i, "").trim()];
                continue;
            }

            if (/^main sections?\s*:/i.test(line)) {
                saveSection();
                currentSection = "";
                continue;
            }

            if (/^important points?\s*:/i.test(line)) {
                saveSection();
                currentSection = "Important Points";
                continue;
            }

            if (/^conclusion\s*:/i.test(line)) {
                saveSection();
                currentSection = "Conclusion";
                sectionBody = [line.replace(/^conclusion\s*:/i, "").trim()];
                continue;
            }

            if (currentSection === "Important Points") {
                result.points.push(line.replace(/^[-*•]\s*/, ""));
            } else if (currentSection === "Conclusion") {
                sectionBody.push(line);
                result.conclusion = sectionBody.filter(Boolean).join("\n").trim();
            } else if (currentSection === "Introduction") {
                sectionBody.push(line);
                result.introduction = sectionBody.filter(Boolean).join("\n").trim();
            } else {
                const heading = line.match(/^#{1,6}\s+(.+)|^\*\*(.+)\*\*$/);

                if (heading) {
                    saveSection();
                    currentSection = (heading[1] || heading[2]).replace(/:$/, "");
                } else if (currentSection) {
                    sectionBody.push(line);
                } else {
                    
                    currentSection = "Blog Content";
                    sectionBody.push(line);
                }
            }
        }

        saveSection();

     
        if (
            !result.introduction &&
            result.sections.length === 0 &&
            !result.conclusion &&
            result.points.length === 0 &&
            text.trim()
        ) {
            result.sections.push({
                title: "Blog Content",
                content: text.trim()
            });
        }

        return result;
    }

    function renderList(id, items) {
        const container = document.getElementById(id);
        if (!container) return;

        container.replaceChildren();

        items.forEach(item => {
            const wrapper = document.createElement("section");

            if (typeof item === "string") {
                const paragraph = document.createElement("p");
                paragraph.textContent = item;
                wrapper.appendChild(paragraph);
            } else {
                const heading = document.createElement("h3");
                heading.textContent = item.title;

                const paragraph = document.createElement("p");
                paragraph.textContent = item.content;

                wrapper.append(heading, paragraph);
            }

            container.appendChild(wrapper);
        });
    }

    function showUnavailableMessage() {
        const container = document.getElementById("blog-view-container");

        if (container) {
            container.replaceChildren();

            const heading = document.createElement("h2");
            heading.textContent = "Blog unavailable";

            const message = document.createElement("p");
            message.textContent =
                "This blog is not available in the current browser session. " +
                "Generate the blog again to view it.";

            const link = document.createElement("a");
            link.href = "upload.html";
            link.textContent = "Upload another video";

            container.append(heading, message, link);
        }
    }
});