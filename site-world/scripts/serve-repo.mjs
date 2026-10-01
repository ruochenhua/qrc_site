import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '../..');
const port = Number(process.env.PORT ?? 4174);
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', `http://${request.headers.host}`).pathname);
    const relativePath = pathname.replace(/^\/+/, '') || 'index.html';
    const filePath = path.resolve(repoRoot, relativePath);
    const rootPrefix = `${repoRoot}${path.sep}`;

    if (filePath !== repoRoot && !filePath.startsWith(rootPrefix)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Length': fileInfo.size,
      'Content-Type': mimeTypes.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Repository static server listening at http://127.0.0.1:${port}`);
});
