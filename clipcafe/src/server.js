const http = require('http');
const fs = require('fs');
const path = require('path');
const { search, getClipInfo, parseClipInput } = require('./api');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;

      // API: Search
      if (pathname === '/api/search') {
        const query = parsedUrl.searchParams.get('q');
        if (!query) return sendJson(res, 400, { error: 'Query parameter q is required' });
        const results = await search(query);
        return sendJson(res, 200, { results });
      }

      // API: Info
      if (pathname === '/api/info') {
        const clipUrl = parsedUrl.searchParams.get('url');
        if (!clipUrl) return sendJson(res, 400, { error: 'url parameter is required' });
        const info = await getClipInfo(clipUrl);
        return sendJson(res, 200, info);
      }

      // API: Direct Download Proxy
      if (pathname === '/api/download') {
        const clipUrl = parsedUrl.searchParams.get('url');
        if (!clipUrl) {
          res.writeHead(400);
          res.end('Missing url parameter');
          return;
        }

        const { slug } = parseClipInput(clipUrl);
        const directVideoUrl = `https://clip.cafe/videos/${slug}.mp4`;

        const upstreamRes = await fetch(directVideoUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });

        if (!upstreamRes.ok) {
          res.writeHead(upstreamRes.status);
          res.end(`Upstream error: ${upstreamRes.statusText}`);
          return;
        }

        const contentLength = upstreamRes.headers.get('content-length');
        const filename = `${slug}.mp4`;

        res.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="${filename}"`,
          ...(contentLength ? { 'Content-Length': contentLength } : {})
        });

        // Pipe upstream to client
        const { Readable } = require('stream');
        const stream = Readable.fromWeb ? Readable.fromWeb(upstreamRes.body) : upstreamRes.body;
        stream.pipe(res);
        return;
      }

      // API: Video Stream Proxy (Supports HTML5 range requests)
      if (pathname === '/api/stream') {
        const slug = parsedUrl.searchParams.get('slug');
        if (!slug) {
          res.writeHead(400);
          res.end('Missing slug');
          return;
        }

        const directVideoUrl = `https://clip.cafe/videos/${slug}.mp4`;
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        };
        if (req.headers.range) {
          headers['Range'] = req.headers.range;
        }

        const upstreamRes = await fetch(directVideoUrl, { headers });
        const status = upstreamRes.status;
        const responseHeaders = {
          'Content-Type': upstreamRes.headers.get('content-type') || 'video/mp4',
          'Accept-Ranges': 'bytes'
        };

        if (upstreamRes.headers.get('content-length')) {
          responseHeaders['Content-Length'] = upstreamRes.headers.get('content-length');
        }
        if (upstreamRes.headers.get('content-range')) {
          responseHeaders['Content-Range'] = upstreamRes.headers.get('content-range');
        }

        res.writeHead(status, responseHeaders);
        const { Readable } = require('stream');
        const stream = Readable.fromWeb ? Readable.fromWeb(upstreamRes.body) : upstreamRes.body;
        stream.pipe(res);
        return;
      }

      // API: Subtitles Proxy
      if (pathname === '/api/subtitles') {
        const slug = parsedUrl.searchParams.get('slug');
        const format = parsedUrl.searchParams.get('format') || 'srt';
        const lang = parsedUrl.searchParams.get('lang') || 'en';
        if (!slug) {
          res.writeHead(400);
          res.end('Missing slug');
          return;
        }

        const subUrl = format === 'vtt'
          ? `https://clip.cafe/vtt/${slug}-${lang}.vtt`
          : `https://clip.cafe/srt/${slug}.srt`;

        const upstreamRes = await fetch(subUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });

        if (!upstreamRes.ok) {
          res.writeHead(upstreamRes.status);
          res.end('Subtitles not found');
          return;
        }

        const subText = await upstreamRes.text();
        res.writeHead(200, {
          'Content-Type': format === 'vtt' ? 'text/vtt' : 'text/plain',
          'Content-Disposition': `attachment; filename="${slug}.${format}"`
        });
        res.end(subText);
        return;
      }

      // Serve static frontend files
      serveStatic(req, res, pathname);

    } catch (err) {
      console.error('Server error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }
  });
}

function startServer(port = 3000) {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      resolve({ server, port });
    });
    server.on('error', reject);
  });
}

module.exports = {
  createServer,
  startServer
};

