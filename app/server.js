/* eslint-env node */
/* global require, process, __dirname */

const express = require('express');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const storageDir = process.env.STORAGE_PATH || path.join(__dirname, '..', 'data');
const initialDiagramPath = path.join(__dirname, '..', 'resources', 'initial.bpmn');

const textParser = express.text({
  type: '*/*',
  limit: '10mb'
});

app.use(express.json({ limit: '1mb' }));
app.use('/static', express.static(path.join(__dirname, '..', 'dist')));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use(express.static(path.join(__dirname, 'public')));

function ensureExtension(name) {
  return name.endsWith('.bpmn') ? name : `${name}.bpmn`;
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '-');
}

function sanitizePathSegments(rawPath) {
  return rawPath
    .split(/[\\/]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map(sanitizeName);
}

function resolveDiagramPath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    return null;
  }

  const segments = sanitizePathSegments(rawPath);

  if (!segments.length) {
    return null;
  }

  const fileSegments = [ ...segments.slice(0, -1), ensureExtension(segments[segments.length - 1]) ];
  const resolvedPath = path.join(storageDir, ...fileSegments);
  const relative = path.relative(storageDir, resolvedPath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  return resolvedPath;
}

function formatDiagramPath(resolvedPath) {
  const relative = path.relative(storageDir, resolvedPath);
  const withoutExtension = relative.replace(/\.bpmn$/i, '');

  return withoutExtension.split(path.sep).join('/');
}

async function buildDiagramTree(currentDir, relativeSegments = []) {
  const entries = await fsp.readdir(currentDir, { withFileTypes: true });
  const nodes = [];

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      const folderSegments = [ ...relativeSegments, entry.name ];
      const children = await buildDiagramTree(entryPath, folderSegments);

      nodes.push({
        type: 'folder',
        name: entry.name,
        path: folderSegments.join('/'),
        children
      });
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.bpmn')) {
      const stats = await fsp.stat(entryPath);
      const baseName = entry.name.replace(/\.bpmn$/i, '');
      const fileSegments = [ ...relativeSegments, baseName ];

      nodes.push({
        type: 'diagram',
        name: baseName,
        path: fileSegments.join('/'),
        updatedAt: stats.mtime
      });
    }
  }

  nodes.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }

    return a.type === 'folder' ? -1 : 1;
  });

  return nodes;
}

async function ensureStorage() {
  await fsp.mkdir(storageDir, { recursive: true });

  const files = await fsp.readdir(storageDir);
  const hasDiagrams = files.some((file) => file.toLowerCase().endsWith('.bpmn'));

  if (!hasDiagrams && fs.existsSync(initialDiagramPath)) {
    const defaultName = 'example-process.bpmn';
    await fsp.copyFile(initialDiagramPath, path.join(storageDir, defaultName));
  }
}

app.get('/api/diagrams', async (req, res) => {
  try {
    const tree = await buildDiagramTree(storageDir);

    res.json({ tree });
  } catch (error) {
    console.error('Failed to list diagrams', error);
    res.status(500).json({ error: 'Failed to list diagrams' });
  }
});

function extractPathParam(req) {
  return req.params[0] || '';
}

app.get('/api/diagrams/*', async (req, res) => {
  const diagramPath = resolveDiagramPath(extractPathParam(req));

  if (!diagramPath) {
    return res.status(400).json({ error: 'Invalid diagram name' });
  }

  try {
    const xml = await fsp.readFile(diagramPath, 'utf8');
    res.type('application/xml').send(xml);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    console.error('Failed to load diagram', error);
    res.status(500).json({ error: 'Failed to load diagram' });
  }
});

app.post('/api/diagrams', async (req, res) => {
  const { name } = req.body || {};

  const diagramPath = resolveDiagramPath(name);

  if (!diagramPath) {
    return res.status(400).json({ error: 'Invalid diagram name' });
  }

  try {
    await ensureStorage();

    try {
      await fsp.access(diagramPath, fs.constants.F_OK);
      return res.status(409).json({ error: 'Diagram already exists' });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    await fsp.mkdir(path.dirname(diagramPath), { recursive: true });
    const template = await fsp.readFile(initialDiagramPath, 'utf8');
    await fsp.writeFile(diagramPath, template, 'utf8');

    res.status(201).json({ path: formatDiagramPath(diagramPath) });
  } catch (error) {
    console.error('Failed to create diagram', error);
    res.status(500).json({ error: 'Failed to create diagram' });
  }
});

app.put('/api/diagrams/*', textParser, async (req, res) => {
  const diagramPath = resolveDiagramPath(extractPathParam(req));

  if (!diagramPath) {
    return res.status(400).json({ error: 'Invalid diagram name' });
  }

  if (typeof req.body !== 'string' || !req.body.trim()) {
    return res.status(400).json({ error: 'Diagram XML payload required' });
  }

  try {
    await ensureStorage();
    await fsp.writeFile(diagramPath, req.body, 'utf8');
    res.status(204).end();
  } catch (error) {
    console.error('Failed to save diagram', error);
    res.status(500).json({ error: 'Failed to save diagram' });
  }
});

app.get('/embed', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'embed.html'));
});

app.get('/embed/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'embed.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

ensureStorage()
  .then(() => {
    app.listen(port, () => {
      console.log(`bpmn-js extended server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize storage', error);
    process.exit(1);
  });
