document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('video-file-input');
  const browseBtn = document.getElementById('browse-video-btn');
  const errorAlert = document.getElementById('upload-error-alert');
  const errorMessage = document.getElementById('upload-error-text');

  const previewCard = document.getElementById('file-preview-card');
  const previewVideo = document.getElementById('video-preview-player');
  const fileNameDisplay = document.getElementById('preview-file-name');
  const fileSizeDisplay = document.getElementById('preview-file-size');
  const fileDurationDisplay = document.getElementById('preview-file-duration');
  const removeVideoBtn = document.getElementById('remove-video-btn');
  const startProcessingBtn = document.getElementById('start-processing-btn');

  let currentVideoFile = null;
  let currentVideoDuration = 0;
  let currentObjectUrl = null;

  function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat(
      (bytes / Math.pow(k, i)).toFixed(dm)
    )} ${sizes[i]}`;
  }

  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function showError(msg) {
    if (errorMessage && errorAlert) {
      errorMessage.textContent = msg;
      errorAlert.style.display = 'flex';

      errorAlert.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }

  function hideError() {
    if (errorAlert) {
      errorAlert.style.display = 'none';
    }
  }

  function resetUpload() {
    currentVideoFile = null;
    currentVideoDuration = 0;

    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }

    if (fileInput) {
      fileInput.value = '';
    }

    if (previewCard) {
      previewCard.style.display = 'none';
    }

    if (dropzone) {
      dropzone.style.display = 'block';
    }

    if (previewVideo) {
      previewVideo.removeAttribute('src');
      previewVideo.load();
    }

    hideError();
  }

  function handleFile(file) {
    hideError();

    if (!file) {
      return;
    }

    const isMp4 =
      file.type === 'video/mp4' ||
      file.name.toLowerCase().endsWith('.mp4');

    if (!isMp4) {
      showError('Only MP4 videos are supported.');
      return;
    }

    const tempVideo = document.createElement('video');

    tempVideo.preload = 'metadata';

    const objectUrl = URL.createObjectURL(file);

    tempVideo.onloadedmetadata = function () {
      const duration = tempVideo.duration;

      const MAX_DURATION_SECONDS = 30 * 60;

      if (duration > MAX_DURATION_SECONDS) {
        URL.revokeObjectURL(objectUrl);

        showError(
          'Video duration must not exceed 30 minutes.'
        );

        return;
      }

      currentVideoFile = file;
      currentVideoDuration = duration;
      currentObjectUrl = objectUrl;
      if (fileNameDisplay) {
        fileNameDisplay.textContent = file.name;
      }

      if (fileSizeDisplay) {
        fileSizeDisplay.textContent = formatBytes(file.size);
      }

      if (fileDurationDisplay) {
        fileDurationDisplay.textContent =
          `Duration: ${formatDuration(duration)}`;
      }

      if (previewVideo) {
        previewVideo.src = objectUrl;
      }

      if (dropzone) {
        dropzone.style.display = 'none';
      }

      if (previewCard) {
        previewCard.style.display = 'block';
      }
    };

    tempVideo.onerror = function () {
      URL.revokeObjectURL(objectUrl);

      showError(
        'Could not read the video file. Please select a valid MP4 video.'
      );
    };

    tempVideo.src = objectUrl;
  }

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (
        e.target.files &&
        e.target.files.length > 0
      ) {
        handleFile(e.target.files[0]);
      }
    });
  }

  if (dropzone) {

    dropzone.addEventListener('click', () => {
      if (fileInput) {
        fileInput.click();
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {

      dropzone.addEventListener(eventName, (e) => {

        e.preventDefault();
        e.stopPropagation();

        dropzone.classList.add('drag-over');

      });

    });

    ['dragleave', 'drop'].forEach(eventName => {

      dropzone.addEventListener(eventName, (e) => {

        e.preventDefault();
        e.stopPropagation();

        dropzone.classList.remove('drag-over');

      });

    });

    dropzone.addEventListener('drop', (e) => {

      if (
        e.dataTransfer &&
        e.dataTransfer.files &&
        e.dataTransfer.files.length > 0
      ) {

        handleFile(
          e.dataTransfer.files[0]
        );

      }

    });
  }

  if (removeVideoBtn) {
    removeVideoBtn.addEventListener(
      'click',
      resetUpload
    );
  }

  if (startProcessingBtn) {

    startProcessingBtn.addEventListener(
      'click',
      async () => {

        if (!currentVideoFile) {

          showError(
            'Please select an MP4 video to continue.'
          );

          return;
        }

        startProcessingBtn.disabled = true;
        startProcessingBtn.textContent = 'Uploading...';

        hideError();

        try {

          const formData = new FormData();

          formData.append(
            'video',
            currentVideoFile
          );
         const response = await fetch('http://127.0.0.1:5000/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData
          });

          const result = await response.json();

          if (
            !response.ok ||
            !result.success
          ) {

            throw new Error(
              result.message ||
              'Video upload failed.'
            );
          }

       
          VideoBlogStore.setTempUploadedVideo({

            name: result.filename,

            size: formatBytes(
              currentVideoFile.size
            ),

            duration: result.duration_seconds,

            public_id: result.public_id,

            video_url: result.video_url,

            audio_file: result.audio_file,

            uploadedAt:
              new Date().toLocaleDateString(
                'en-GB',
                {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }
              )

          });

          window.location.href =
            'processing.html';

        } catch (error) {

          console.error(
            'Video upload error:',
            error
          );

          showError(
            error.message ||
            'Could not upload the video.'
          );

          startProcessingBtn.disabled = false;

          startProcessingBtn.textContent =
            'Start Processing →';
        }

      }
    );

  }

});