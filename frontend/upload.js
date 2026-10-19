
document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("video-file-input");
    const dropzone = document.getElementById("upload-dropzone");
    const browseButton = document.getElementById("browse-video-btn");
    const previewCard = document.getElementById("file-preview-card");
    const previewName = document.getElementById("preview-file-name");
    const previewSize = document.getElementById("preview-file-size");
    const previewDuration = document.getElementById("preview-file-duration");
    const previewPlayer = document.getElementById("video-preview-player");
    const removeButton = document.getElementById("remove-video-btn");
    const uploadButton = document.getElementById("start-processing-btn");
    const errorAlert = document.getElementById("upload-error-alert");
    const errorText = document.getElementById("upload-error-text");

    let selectedFile = null;
    let previewUrl = null;

    browseButton.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length) {
            selectVideo(fileInput.files[0]);
        }
    });

    dropzone.addEventListener("dragover", event => {
        event.preventDefault();
        dropzone.classList.add("drag-over");
    });

    dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("drag-over");
    });

    dropzone.addEventListener("drop", event => {
        event.preventDefault();
        dropzone.classList.remove("drag-over");

        const file = event.dataTransfer.files[0];
        if (file) selectVideo(file);
    });

    removeButton.addEventListener("click", clearVideo);

    uploadButton.addEventListener("click", uploadVideo);

    function selectVideo(file) {
        hideError();

        if (!file.name.toLowerCase().endsWith(".mp4") ||
            (file.type && file.type !== "video/mp4")) {
            showError("Only MP4 videos are supported.");
            return;
        }

        selectedFile = file;

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(file);

        previewName.textContent = file.name;
        previewSize.textContent = formatBytes(file.size);
        previewDuration.textContent = "Checking duration...";

        previewPlayer.src = previewUrl;
        previewCard.style.display = "block";
        dropzone.style.display = "none";

        previewPlayer.onloadedmetadata = () => {
            const duration = previewPlayer.duration;

            if (!Number.isFinite(duration)) {
                showError("Could not determine the video duration.");
                clearVideo();
                return;
            }

            if (duration > 30 * 60) {
                showError("The video must be 30 minutes or shorter.");
                clearVideo();
                return;
            }

            previewDuration.textContent = `Duration: ${formatDuration(duration)}`;
        };

        previewPlayer.onerror = () => {
            showError("Could not load the video preview. Select a valid MP4 file.");
            clearVideo();
        };
    }

    async function uploadVideo() {
        if (!selectedFile) {
            showError("Choose a video before starting processing.");
            return;
        }

        // Do not upload until the browser has checked the video duration.
        if (!Number.isFinite(previewPlayer.duration)) {
            showError("Wait for the video duration to be checked.");
            return;
        }

        if (previewPlayer.duration > 30 * 60) {
            showError("The video must be 30 minutes or shorter.");
            return;
        }

        const formData = new FormData();
        formData.append("video", selectedFile);

        uploadButton.disabled = true;
        uploadButton.textContent = "Uploading and generating blog...";
        hideError();

        try {
            const response = await fetch(`${API_BASE}/upload`, {
                method: "POST",
                credentials: "include",
                body: formData
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Video processing failed.");
            }

            if (!result.blog) {
                throw new Error("The server did not return the generated blog.");
            }

            VideoBlogStore.setCurrentBlog(result.blog);
            VideoBlogStore.setTempUploadedVideo({
                name: result.filename || selectedFile.name,
                duration: result.duration_seconds,
                public_id: result.public_id,
                video_url: result.video_url,
                blog_id: result.blog.blog_id
            });

            window.location.href =
                `blog.html?id=${encodeURIComponent(result.blog.blog_id)}`;
        } catch (error) {
            showError(error.message || "Something went wrong during upload.");
            uploadButton.disabled = false;
            uploadButton.textContent = "Start Processing →";
        }
    }

    function clearVideo() {
        selectedFile = null;
        fileInput.value = "";

        previewPlayer.pause();
        previewPlayer.removeAttribute("src");
        previewPlayer.load();

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }

        previewCard.style.display = "none";
        dropzone.style.display = "";
        hideError();
    }

    function showError(message) {
        errorText.textContent = message;
        errorAlert.style.display = "flex";
    }

    function hideError() {
        errorAlert.style.display = "none";
        errorText.textContent = "";
    }

    function formatBytes(bytes) {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }

        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
    }
});
