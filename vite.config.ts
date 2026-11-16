import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));

const DEFAULT_STORAGE_DIR = path.resolve(process.cwd(), '.wyzard-data');
const CONFIG_FILE = path.resolve(process.cwd(), '.wyzard-fs-config.json');

function getConfiguredStorageDir(): string {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (raw.storageDir && typeof raw.storageDir === 'string') {
        return path.resolve(raw.storageDir);
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_STORAGE_DIR;
}

function ensureStorageDirs(baseDir: string) {
  const projectsDir = path.join(baseDir, 'projects');
  const assetsDir = path.join(baseDir, 'assets');
  fs.mkdirSync(projectsDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });
  return { projectsDir, assetsDir };
}

function wyzardLocalFsPlugin(): Plugin {
  const handleApi = (req: any, res: any, next: () => void) => {
    if (!req.url || !req.url.startsWith('/api/fs')) {
      return next();
    }

    const urlObj = new URL(req.url, 'http://localhost');
    const pathname = urlObj.pathname;
    res.setHeader('Content-Type', 'application/json');

    try {
      const storageDir = getConfiguredStorageDir();
      const { projectsDir, assetsDir } = ensureStorageDirs(storageDir);

      // GET /api/fs/status
      if (req.method === 'GET' && pathname === '/api/fs/status') {
        const projFiles = fs
          .readdirSync(projectsDir)
          .filter((f) => f.endsWith('.wyzard.json'));
        const assetFiles = fs.readdirSync(assetsDir);

        let diskBytes = 0;
        const fileEntries: { name: string; type: 'project' | 'asset'; size: number }[] = [];

        for (const f of projFiles) {
          const stat = fs.statSync(path.join(projectsDir, f));
          diskBytes += stat.size;
          fileEntries.push({ name: f, type: 'project', size: stat.size });
        }
        for (const f of assetFiles) {
          const stat = fs.statSync(path.join(assetsDir, f));
          diskBytes += stat.size;
          fileEntries.push({ name: f, type: 'asset', size: stat.size });
        }

        res.end(
          JSON.stringify({
            available: true,
            storageDir,
            defaultStorageDir: DEFAULT_STORAGE_DIR,
            projectFileCount: projFiles.length,
            assetFileCount: assetFiles.length,
            diskBytes,
            files: fileEntries,
          })
        );
        return;
      }

      // GET /api/fs/projects
      if (req.method === 'GET' && pathname === '/api/fs/projects') {
        const projFiles = fs
          .readdirSync(projectsDir)
          .filter((f) => f.endsWith('.wyzard.json'));
        const projects = projFiles
          .map((f) => {
            try {
              return JSON.parse(fs.readFileSync(path.join(projectsDir, f), 'utf-8'));
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        res.end(JSON.stringify({ projects }));
        return;
      }

      // Parse JSON body for POST/DELETE
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          // POST /api/fs/config
          if (req.method === 'POST' && pathname === '/api/fs/config') {
            const payload = JSON.parse(body || '{}');
            const targetDir = payload.storageDir
              ? path.resolve(String(payload.storageDir))
              : DEFAULT_STORAGE_DIR;
            ensureStorageDirs(targetDir);
            fs.writeFileSync(
              CONFIG_FILE,
              JSON.stringify({ storageDir: targetDir }, null, 2),
              'utf-8'
            );
            res.end(JSON.stringify({ ok: true, storageDir: targetDir }));
            return;
          }

          // POST /api/fs/project
          if (req.method === 'POST' && pathname === '/api/fs/project') {
            const payload = JSON.parse(body || '{}');
            const project = payload.project;
            if (project && project.id) {
              const safeId = String(project.id).replace(/[^a-zA-Z0-9_-]/g, '_');
              const filePath = path.join(projectsDir, `${safeId}.wyzard.json`);
              fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf-8');
              res.end(JSON.stringify({ ok: true, filePath }));
              return;
            }
          }

          // DELETE /api/fs/project
          if (req.method === 'DELETE' && pathname === '/api/fs/project') {
            const id = urlObj.searchParams.get('id');
            if (id) {
              const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
              const filePath = path.join(projectsDir, `${safeId}.wyzard.json`);
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
            }
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Not found' }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'FS error' }));
        }
      });
    } catch (err: any) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err?.message || 'FS error' }));
    }
  };

  return {
    name: 'wyzard-local-fs',
    configureServer(server) {
      server.middlewares.use(handleApi);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleApi);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wyzardLocalFsPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
