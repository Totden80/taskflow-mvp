import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = normalize(join(fileURLToPath(new URL('.', import.meta.url))));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.sql': 'application/sql; charset=utf-8' };

createServer(async (req, res) => {
  try {
    const path = normalize(join(root, req.url === '/' ? 'index.html' : req.url));
    if (!path.startsWith(root)) throw Error('forbidden');
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(await readFile(path));
  } catch (error) {
    res.writeHead(error.message === 'forbidden' ? 403 : 404);
    res.end('Not found');
  }
}).listen(4173, () => console.log('TaskFlow running at http://localhost:4173'));
