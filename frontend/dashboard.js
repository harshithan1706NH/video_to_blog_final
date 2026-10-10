document.addEventListener('DOMContentLoaded', () => {
  const userGreeting = document.getElementById('dashboard-user-name');
  const recentBlogsContainer = document.getElementById('dashboard-recent-blogs');
  const emptyBlogsState = document.getElementById('dashboard-empty-state');
  const user = VideoBlogStore.getUser();
  if (userGreeting) {
    userGreeting.textContent = user.name ? user.name : 'User';
  }

  function renderDashboardBlogs() {
    if (!recentBlogsContainer) return;
    const blogs = VideoBlogStore.getBlogs();

    if (!blogs || blogs.length === 0) {
      recentBlogsContainer.style.display = 'none';
      if (emptyBlogsState) emptyBlogsState.style.display = 'block';
      return;
    }

    if (emptyBlogsState) emptyBlogsState.style.display = 'none';
    recentBlogsContainer.style.display = 'flex';

    
    const displayBlogs = blogs.slice(0, 4);

    recentBlogsContainer.innerHTML = displayBlogs.map(b => `
      <div class="blog-item-card">
        <div class="blog-item-info">
          <h3 class="blog-item-title">${b.title}</h3>
          <div class="blog-item-meta">
            <span>🎥 <strong>Source:</strong> ${b.sourceVideo}</span>
            <span>📅 <strong>Date:</strong> ${b.date}</span>
            <span><span class="badge badge-success"><span class="badge-dot"></span>${b.status}</span></span>
          </div>
        </div>
        <div class="blog-item-actions">
          <a href="blog.html?id=${b.id}" class="btn btn-sm btn-outline">View</a>
          <a href="edit-blog.html?id=${b.id}" class="btn btn-sm btn-secondary">Edit</a>
        </div>
      </div>
    `).join('');
  }

  renderDashboardBlogs();
});