document.addEventListener('DOMContentLoaded', () => {
  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(`tab-${btn.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });

  // Example chips
  document.querySelectorAll('.example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('urlInput').value = chip.dataset.url;
      fetchClip(chip.dataset.url);
    });
  });

  // Forms
  const urlForm = document.getElementById('urlForm');
  const searchForm = document.getElementById('searchForm');
  const urlInput = document.getElementById('urlInput');
  const searchInput = document.getElementById('searchInput');

  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (url) fetchClip(url);
  });

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (q) performSearch(q);
  });

  // Elements
  const loading = document.getElementById('loading');
  const loadingText = document.getElementById('loadingText');
  const clipShowcase = document.getElementById('clipShowcase');
  const resultsSection = document.getElementById('resultsSection');
  const resultsGrid = document.getElementById('resultsGrid');
  const resultsCount = document.getElementById('resultsCount');

  // Active clip state
  let currentClip = null;

  async function fetchClip(urlOrSlug) {
    showLoading('Extracting clip stream & metadata...');
    clipShowcase.classList.add('hidden');

    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(urlOrSlug)}`);
      if (!res.ok) throw new Error('Could not load clip details');
      const data = await res.json();
      currentClip = data;
      renderActiveClip(data);
    } catch (err) {
      alert(`Error loading clip: ${err.message}`);
    } finally {
      hideLoading();
    }
  }

  async function performSearch(query) {
    showLoading(`Searching clip database for "${query}"...`);
    resultsSection.classList.add('hidden');

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      renderSearchResults(data.results, query);
    } catch (err) {
      alert(`Search error: ${err.message}`);
    } finally {
      hideLoading();
    }
  }

  function renderActiveClip(clip) {
    document.getElementById('clipTitle').textContent = clip.title || clip.slug;
    document.getElementById('movieName').textContent = clip.movieTitle ? `${clip.movieTitle} ${clip.year ? `(${clip.year})` : ''}` : 'Clip.Cafe Scene';
    document.getElementById('clipTranscript').textContent = clip.transcript ? `"${clip.transcript}"` : clip.description || 'No transcript available.';
    document.getElementById('metaResolution').textContent = clip.videoFrameSize ? `${clip.videoFrameSize} MP4` : 'Direct HD MP4';
    document.getElementById('metaDuration').textContent = clip.duration || 'Full Scene';
    document.getElementById('metaYear').textContent = clip.year || 'Movie';
    document.getElementById('directLinkInput').value = clip.videoUrl;

    // Use stream proxy for in-browser playback
    const player = document.getElementById('videoPlayer');
    const source = document.getElementById('videoSource');
    source.src = `/api/stream?slug=${encodeURIComponent(clip.slug)}`;
    player.load();

    clipShowcase.classList.remove('hidden');
    clipShowcase.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderSearchResults(clips, query) {
    resultsGrid.innerHTML = '';
    if (!clips || clips.length === 0) {
      resultsCount.textContent = `No clips found for "${query}"`;
      resultsSection.classList.remove('hidden');
      return;
    }

    resultsCount.textContent = `Found ${clips.length} scenes for "${query}"`;

    clips.forEach(clip => {
      const card = document.createElement('div');
      card.className = 'clip-card';
      card.innerHTML = `
        <div class="card-thumb-wrap">
          <img src="${clip.thumb}" alt="${clip.movieTitle}" loading="lazy" onerror="this.src='https://clip.cafe/img/logobig2.png'">
          <span class="card-duration">${clip.duration}</span>
        </div>
        <div class="card-body">
          <div class="card-movie">${clip.movieTitle} ${clip.year ? `• ${clip.year}` : ''}</div>
          <div class="card-quote">"${clip.transcript || 'Movie dialogue quote'}"</div>
          <div class="card-actions">
            <button class="card-btn card-btn-play" data-slug="${clip.clipSlug}">Preview</button>
            <a class="card-btn card-btn-dl" href="/api/download?url=${encodeURIComponent(clip.videoUrl)}" download="${clip.clipSlug}.mp4">Download</a>
          </div>
        </div>
      `;

      card.querySelector('.card-btn-play').addEventListener('click', (e) => {
        e.stopPropagation();
        fetchClip(clip.clipUrl);
      });

      card.addEventListener('click', () => {
        fetchClip(clip.clipUrl);
      });

      resultsGrid.appendChild(card);
    });

    resultsSection.classList.remove('hidden');
  }

  // Buttons in Active Clip
  document.getElementById('downloadMp4Btn').addEventListener('click', () => {
    if (!currentClip) return;
    const downloadUrl = `/api/download?url=${encodeURIComponent(currentClip.videoUrl)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${currentClip.slug}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  document.getElementById('downloadSubBtn').addEventListener('click', () => {
    if (!currentClip) return;
    const subUrl = `/api/subtitles?slug=${encodeURIComponent(currentClip.slug)}&lang=en&format=srt`;
    const a = document.createElement('a');
    a.href = subUrl;
    a.download = `${currentClip.slug}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  document.getElementById('copyLinkBtn').addEventListener('click', () => {
    if (!currentClip) return;
    navigator.clipboard.writeText(currentClip.videoUrl).then(() => {
      showToast('Direct MP4 link copied to clipboard!');
    });
  });

  function showLoading(msg) {
    loadingText.textContent = msg;
    loading.classList.remove('hidden');
  }

  function hideLoading() {
    loading.classList.add('hidden');
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }
});

