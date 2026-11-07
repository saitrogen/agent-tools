const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Normalizes input URL or slug into clip slug and canonical URL
 */
function parseClipInput(input) {
  if (!input) throw new Error('No clip URL or slug provided');
  const trimmed = input.trim();
  
  // Direct video file URL: https://clip.cafe/videos/<slug>.mp4
  const videoMatch = trimmed.match(/\/videos\/([^\/\.]+)\.mp4/i);
  if (videoMatch) {
    return {
      slug: videoMatch[1],
      url: `https://clip.cafe/videos/${videoMatch[1]}.mp4`,
      isDirectVideo: true
    };
  }

  // Web page URL: https://clip.cafe/<movie-slug>/<clip-slug>/ or https://clip.cafe/s/<slug>
  const urlMatch = trimmed.match(/https?:\/\/clip\.cafe\/([^\/]+)(?:\/([^\/\?#]+))?/i);
  if (urlMatch) {
    const part1 = urlMatch[1];
    const part2 = urlMatch[2];
    const slug = part2 || part1;
    return {
      slug: slug.replace(/\/$/, ''),
      url: trimmed.startsWith('http') ? trimmed : `https://clip.cafe/${trimmed.replace(/^\//, '')}`,
      isDirectVideo: false
    };
  }

  // Bare slug provided
  return {
    slug: trimmed.replace(/\/$/, ''),
    url: `https://clip.cafe/videos/${trimmed.replace(/\/$/, '')}.mp4`,
    isDirectVideo: false
  };
}

/**
 * Fetches full metadata for a clip by URL or slug
 */
async function getClipInfo(urlOrSlug) {
  const parsed = parseClipInput(urlOrSlug);
  const slug = parsed.slug;
  const directVideoUrl = `https://clip.cafe/videos/${slug}.mp4`;

  let info = {
    slug,
    title: slug.replace(/-/g, ' '),
    movieTitle: '',
    year: '',
    duration: '',
    videoFrameSize: '',
    description: '',
    transcript: '',
    director: '',
    cast: [],
    thumbnail: `https://clip.cafe/img800/${slug}.jpg`,
    thumbnails: [
      `https://clip.cafe/img720/${slug}.jpg`,
      `https://clip.cafe/img800/${slug}.jpg`,
      `https://clip.cafe/img16x9/${slug}.jpg`
    ],
    videoUrl: directVideoUrl,
    pageUrl: parsed.url,
    subtitles: []
  };

  // If input is an actual clip page URL, fetch HTML to get rich metadata
  if (!parsed.isDirectVideo) {
    try {
      const res = await fetch(parsed.url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (res.ok) {
        const html = await res.text();

        // Extract JSON-LD structured data
        const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (jsonLdMatch) {
          try {
            const data = JSON.parse(jsonLdMatch[1]);
            if (data.name) info.title = data.name;
            if (data.description) info.description = data.description;
            if (data.transcript) info.transcript = data.transcript;
            if (data.videoFrameSize) info.videoFrameSize = data.videoFrameSize;
            if (data.duration) info.duration = data.duration;
            if (data.contentUrl) info.videoUrl = data.contentUrl;
            if (data.director) {
              info.director = typeof data.director === 'object' ? (data.director.name || '') : data.director;
            }
            if (data.isPartOf && data.isPartOf.name) {
              info.movieTitle = data.isPartOf.name;
            }
            if (data.isPartOf && data.isPartOf.datePublished) {
              const yearMatch = data.isPartOf.datePublished.match(/\d{4}/);
              if (yearMatch) info.year = yearMatch[0];
            }
            if (Array.isArray(data.actor)) {
              info.cast = data.actor.map(a => (typeof a === 'object' ? a.name : a)).filter(Boolean);
            }
            if (Array.isArray(data.thumbnailUrl) && data.thumbnailUrl.length > 0) {
              info.thumbnail = data.thumbnailUrl[0];
              info.thumbnails = data.thumbnailUrl;
            }
            if (Array.isArray(data.caption)) {
              info.subtitles = data.caption.map(c => ({
                language: c.inLanguage || 'en',
                format: c.encodingFormat === 'text/vtt' ? 'vtt' : 'srt',
                url: c.contentUrl
              }));
            }
          } catch (e) {
            // fallback to regex extraction
          }
        }

        // Fallback title / movie extraction if JSON-LD was absent
        if (!info.movieTitle) {
          const titleMatch = html.match(/<title>([^<]+)<\/title>/);
          if (titleMatch) {
            info.title = titleMatch[1].replace(/ \| Clip\.Cafe$/, '').trim();
          }
        }
      }
    } catch (err) {
      // Direct video URL still valid even if page fetch failed
    }
  }

  // Ensure default subtitles exist if not detected
  if (info.subtitles.length === 0) {
    info.subtitles = [
      { language: 'en', format: 'srt', url: `https://clip.cafe/srt/${slug}.srt` },
      { language: 'en', format: 'vtt', url: `https://clip.cafe/vtt/${slug}-en.vtt` }
    ];
  }

  return info;
}

/**
 * Searches clip.cafe for quotes, movie titles, or keywords
 */
async function search(query, options = {}) {
  if (!query || !query.trim()) return [];
  const limit = options.limit || 30;
  const searchUrl = `https://clip.cafe/?s=${encodeURIComponent(query.trim())}&usersearch=1`;

  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });

  if (!res.ok) {
    throw new Error(`Search request failed with status ${res.status}`);
  }

  const html = await res.text();
  const items = [];

  // Card matching regex
  const cardRegex = /<a href="([^"]+)" class="[^"]*smallClipContainer[^"]*"[\s\S]*?<img src="([^"]+)"[\s\S]*?<span class="videoDuration">([^<]+)<\/span>[\s\S]*?<div class="clipMovie"><a[^>]*>([^<]+)<\/a>(?: • (\d{4}))?<\/div>[\s\S]*?<div class="clipTrans"><p>(?:<b>Transcript:<\/b><br>)?([\s\S]*?)<\/p><\/div>/g;

  let match;
  while ((match = cardRegex.exec(html)) !== null && items.length < limit) {
    const clipPath = match[1].replace(/^\//, '');
    const parts = clipPath.replace(/\/$/, '').split('/');
    const movieSlug = parts[0] || '';
    const clipSlug = parts[1] || parts[0];
    const thumb = match[2];
    const duration = match[3].trim();
    const movieTitle = match[4].trim();
    const year = match[5] || '';
    const transcript = match[6].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    items.push({
      clipSlug,
      movieSlug,
      movieTitle,
      year,
      duration,
      transcript,
      clipUrl: `https://clip.cafe/${clipPath}`,
      videoUrl: `https://clip.cafe/videos/${clipSlug}.mp4`,
      thumb: thumb.startsWith('http') ? thumb : `https://clip.cafe/${thumb.replace(/^\//, '')}`,
      srtUrl: `https://clip.cafe/srt/${clipSlug}.srt`
    });
  }

  return items;
}

/**
 * Downloads a video file to the specified destination
 */
async function downloadVideo(urlOrSlug, destinationPath, onProgress) {
  const parsed = parseClipInput(urlOrSlug);
  const videoUrl = parsed.isDirectVideo ? parsed.url : `https://clip.cafe/videos/${parsed.slug}.mp4`;

  const res = await fetch(videoUrl, {
    headers: {
      'User-Agent': USER_AGENT
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to download video (${res.status} ${res.statusText})`);
  }

  const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
  let downloadedBytes = 0;

  // Ensure directory exists
  const targetDir = path.dirname(destinationPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const writeStream = fs.createWriteStream(destinationPath);

  // If node-fetch or native fetch body is a ReadableStream
  const reader = res.body.getReader ? res.body.getReader() : null;

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      downloadedBytes += value.length;
      writeStream.write(value);
      if (onProgress && totalBytes > 0) {
        onProgress({ downloaded: downloadedBytes, total: totalBytes, percent: Math.round((downloadedBytes / totalBytes) * 100) });
      }
    }
    writeStream.end();
  } else {
    // Standard node stream
    const { Readable } = require('stream');
    const nodeStream = Readable.fromWeb ? Readable.fromWeb(res.body) : res.body;
    nodeStream.on('data', chunk => {
      downloadedBytes += chunk.length;
      if (onProgress && totalBytes > 0) {
        onProgress({ downloaded: downloadedBytes, total: totalBytes, percent: Math.round((downloadedBytes / totalBytes) * 100) });
      }
    });
    await pipeline(nodeStream, writeStream);
  }

  return {
    path: destinationPath,
    bytes: downloadedBytes || totalBytes
  };
}

/**
 * Downloads subtitles for a clip
 */
async function downloadSubtitles(urlOrSlug, destinationPath, lang = 'en', format = 'srt') {
  const parsed = parseClipInput(urlOrSlug);
  const slug = parsed.slug;
  const subUrl = format === 'vtt'
    ? `https://clip.cafe/vtt/${slug}-${lang}.vtt`
    : `https://clip.cafe/srt/${slug}.srt`;

  const res = await fetch(subUrl, {
    headers: { 'User-Agent': USER_AGENT }
  });

  if (!res.ok) {
    throw new Error(`Subtitles not found for ${slug} (${res.status})`);
  }

  const text = await res.text();
  const targetDir = path.dirname(destinationPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.writeFileSync(destinationPath, text, 'utf8');

  return {
    path: destinationPath,
    bytes: Buffer.byteLength(text)
  };
}

module.exports = {
  parseClipInput,
  getClipInfo,
  search,
  downloadVideo,
  downloadSubtitles
};

