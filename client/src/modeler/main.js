import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule
} from 'bpmn-js-properties-panel';
import camundaPlatformBehaviors from 'camunda-bpmn-js-behaviors/lib/camunda-platform';
import camundaModdleDescriptors from 'camunda-bpmn-moddle/resources/camunda.json';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';

const DEFAULT_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

const modeler = new BpmnModeler({
  container: '#canvas',
  propertiesPanel: {
    parent: '#properties'
  },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    CamundaPlatformPropertiesProviderModule,
    camundaPlatformBehaviors
  ],
  moddleExtensions: {
    camunda: camundaModdleDescriptors
  }
});

const newDiagramButton = document.getElementById('new-diagram');
const importButton = document.getElementById('import-file');
const downloadButton = document.getElementById('download-diagram');
const shareButton = document.getElementById('share-diagram');
const storageToggle = document.getElementById('toggle-storage');
const fileBrowser = document.getElementById('file-browser');
const closeStorage = document.getElementById('close-storage');
const storageTree = document.getElementById('storage-tree');
const saveForm = document.getElementById('save-form');
const savePathInput = document.getElementById('save-path');
const folderForm = document.getElementById('folder-form');
const folderPathInput = document.getElementById('folder-path');
const fileInput = document.getElementById('file-input');
const themeToggle = document.getElementById('theme-toggle');

const THEME_STORAGE_KEY = 'bpmn-theme-preference';
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to read theme preference from storage.', error);
    return null;
  }
}

function writeStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Unable to persist theme preference.', error);
  }
}

function clearStoredTheme() {
  try {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear theme preference.', error);
  }
}

function updateThemeToggle(theme) {
  if (!themeToggle) {
    return;
  }

  const isDark = theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(isDark));
  const actionLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  const followSystemHint = 'Shift + click to follow system theme';
  themeToggle.setAttribute('aria-label', isDark ? 'Activate light mode' : 'Activate dark mode');
  themeToggle.setAttribute('title', `${actionLabel}\n${followSystemHint}`);
}

function applyTheme(theme) {
  const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = normalizedTheme;
  updateThemeToggle(normalizedTheme);
}

function initializeTheme() {
  const storedTheme = readStoredTheme();
  const initialTheme = storedTheme ?? (prefersDarkScheme.matches ? 'dark' : 'light');
  applyTheme(initialTheme);

  prefersDarkScheme.addEventListener('change', (event) => {
    if (!readStoredTheme()) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  });
}

initializeTheme();

let currentActiveNode;

async function createNewDiagram() {
  try {
    await modeler.importXML(DEFAULT_DIAGRAM);
    const canvas = modeler.get('canvas');
    canvas.zoom('fit-viewport');
  } catch (error) {
    console.error('Failed to import default diagram', error);
    alert('Failed to create a new diagram. Check the console for details.');
  }
}

function toggleStorageOverlay(force) {
  const shouldShow = typeof force === 'boolean' ? force : fileBrowser.classList.contains('hidden');
  fileBrowser.classList.toggle('hidden', !shouldShow);
  fileBrowser.setAttribute('aria-hidden', String(!shouldShow));
  if (shouldShow) {
    refreshStorageTree();
  }
}

async function refreshStorageTree() {
  try {
    const response = await fetch('/api/storage/tree');

    if (!response.ok) {
      throw new Error('Failed to load storage tree');
    }

    const tree = await response.json();
    renderTree(tree.children ?? []);
  } catch (error) {
    console.error(error);
    storageTree.innerHTML = '<li>Failed to load storage.</li>';
  }
}

function renderTree(nodes) {
  storageTree.innerHTML = '';

  if (!nodes.length) {
    storageTree.innerHTML = '<li class="storage-hint">Storage is empty.</li>';
    return;
  }

  const fragment = document.createDocumentFragment();

  nodes.forEach((node) => {
    fragment.appendChild(createTreeNode(node));
  });

  storageTree.appendChild(fragment);
}

function createTreeNode(node) {
  const li = document.createElement('li');
  const item = document.createElement('div');
  item.className = 'tree-item';
  item.dataset.path = node.path;
  item.dataset.type = node.type;

  const label = document.createElement('div');
  label.className = 'label';
  const icon = document.createElement('span');
  icon.textContent = node.type === 'directory' ? '📁' : '📄';
  const text = document.createElement('span');
  text.textContent = node.name;
  label.append(icon, text);

  item.appendChild(label);

  if (node.type === 'file') {
    item.addEventListener('click', async () => {
      await loadDiagramFromStorage(node.path);
      setActiveTreeNode(item);
      toggleStorageOverlay(false);
    });
  } else {
    item.addEventListener('click', (event) => {
      event.stopPropagation();
      setActiveTreeNode(item);
      const prefix = node.path ? `${node.path.replace(/\\/g, '/')}/` : '';
      savePathInput.value = prefix;
    });
  }

  li.appendChild(item);

  if (node.children && node.children.length) {
    const ul = document.createElement('ul');
    node.children.forEach((child) => {
      ul.appendChild(createTreeNode(child));
    });
    li.appendChild(ul);
  }

  return li;
}

function setActiveTreeNode(element) {
  if (currentActiveNode) {
    currentActiveNode.classList.remove('active');
  }

  currentActiveNode = element;

  if (currentActiveNode) {
    currentActiveNode.classList.add('active');
  }
}

async function loadDiagramFromStorage(path) {
  try {
    const response = await fetch(`/api/storage/file?${new URLSearchParams({ path })}`);

    if (!response.ok) {
      throw new Error('Failed to load diagram');
    }

    const { contents } = await response.json();
    await modeler.importXML(contents);
    modeler.get('canvas').zoom('fit-viewport');
    savePathInput.value = path;
  } catch (error) {
    console.error(error);
    alert('Unable to load the BPMN file from storage.');
  }
}

async function saveDiagramToStorage(path) {
  try {
    const { xml } = await modeler.saveXML({ format: true });
    const response = await fetch('/api/storage/file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path, contents: xml })
    });

    if (!response.ok) {
      throw new Error('Failed to save diagram');
    }

    await refreshStorageTree();
    alert('Diagram saved to storage.');
  } catch (error) {
    console.error(error);
    alert('Unable to save the BPMN file.');
  }
}

async function createFolder(path) {
  try {
    const response = await fetch('/api/storage/directory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path })
    });

    if (!response.ok) {
      throw new Error('Failed to create folder');
    }

    await refreshStorageTree();
    alert('Folder created.');
  } catch (error) {
    console.error(error);
    alert('Unable to create the folder.');
  }
}

newDiagramButton?.addEventListener('click', () => {
  createNewDiagram();
});

importButton?.addEventListener('click', () => {
  fileInput.click();
});

fileInput?.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    await modeler.importXML(text);
    modeler.get('canvas').zoom('fit-viewport');
    savePathInput.value = file.name.replace(/\.xml$/i, '.bpmn');
  } catch (error) {
    console.error(error);
    alert('Failed to import the selected file.');
  } finally {
    event.target.value = '';
  }
});

downloadButton?.addEventListener('click', async () => {
  try {
    const { xml } = await modeler.saveXML({ format: true });
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.bpmn';
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert('Failed to download the BPMN diagram.');
  }
});

async function shareCurrentDiagram() {
  if (!shareButton) {
    return;
  }

  const previousDisabledState = shareButton.disabled;
  shareButton.disabled = true;

  try {
    const shouldCreateSnapshot = window.confirm(
      'Create a new snapshot copy for sharing?\nSelect "Cancel" to share the original file instead.'
    );

    let sharePath;

    if (shouldCreateSnapshot) {
      const { xml } = await modeler.saveXML({ format: true });
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-');
      sharePath = `shared/diagram-${timestamp}.bpmn`;

      const response = await fetch('/api/storage/file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: sharePath, contents: xml })
      });

      if (!response.ok) {
        throw new Error('Failed to store shared diagram');
      }
    } else {
      const sourcePath = savePathInput.value.trim();

      if (!sourcePath) {
        alert('Provide a file path to share the source diagram.');
        return;
      }

      const normalizedPath = sourcePath.endsWith('.bpmn')
        ? sourcePath
        : `${sourcePath}.bpmn`;

      const confirmDirectShare = window.confirm(
        `The share link will point to "${normalizedPath}".\nEnsure your latest changes are saved before continuing.`
      );

      if (!confirmDirectShare) {
        return;
      }

      sharePath = normalizedPath;
    }

    const shareUrl = new URL('/viewer', window.location.origin);
    shareUrl.searchParams.set('path', sharePath);

    const urlString = shareUrl.toString();

    if (navigator.share) {
      try {
        await navigator.share({ title: 'BPMN Diagram', url: urlString });
        return;
      } catch (error) {
        // fall back to clipboard when user cancels share or share is unsupported
        if (error.name === 'AbortError') {
          return;
        }
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(urlString);
        alert(`Share link copied to clipboard.\n${urlString}`);
        return;
      } catch (error) {
        console.warn('Clipboard write failed, falling back to manual copy.', error);
      }
    }

    const manualCopy = window.prompt('Copy the share link for this diagram:', urlString);

    if (manualCopy === null) {
      alert(`Share link ready:\n${urlString}`);
    }
  } catch (error) {
    console.error(error);
    alert('Unable to share the current diagram.');
  } finally {
    shareButton.disabled = previousDisabledState;
  }
}

shareButton?.addEventListener('click', () => {
  void shareCurrentDiagram();
});

storageToggle?.addEventListener('click', () => toggleStorageOverlay());
closeStorage?.addEventListener('click', () => toggleStorageOverlay(false));

themeToggle?.addEventListener('click', (event) => {
  if (event.shiftKey) {
    clearStoredTheme();
    applyTheme(prefersDarkScheme.matches ? 'dark' : 'light');
    return;
  }

  const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  writeStoredTheme(nextTheme);
});

saveForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const path = savePathInput.value.trim();

  if (!path) {
    alert('Provide a file path to save the diagram.');
    return;
  }

  await saveDiagramToStorage(path.endsWith('.bpmn') ? path : `${path}.bpmn`);
});

folderForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const path = folderPathInput.value.trim();

  if (!path) {
    alert('Provide a folder path.');
    return;
  }

  await createFolder(path);
  folderPathInput.value = '';
});

createNewDiagram();
