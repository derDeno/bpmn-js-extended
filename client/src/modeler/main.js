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
const diagramNameElement = document.getElementById('diagram-name');
const shareDialog = document.getElementById('share-dialog');
const shareForm = document.getElementById('share-form');
const shareModeInputs = shareForm ? Array.from(shareForm.querySelectorAll('input[name="share-mode"]')) : [];
const shareLinkGroup = document.getElementById('share-link-group');
const shareLinkInput = document.getElementById('share-link');
const copyShareLinkButton = document.getElementById('copy-share-link');
const shareErrorElement = document.getElementById('share-error');
const shareCancelButton = document.getElementById('share-cancel');
const shareGenerateButton = document.getElementById('share-generate');

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
let currentDiagramName = 'Unsaved diagram';
let currentStoragePath = null;
let shareOperationInFlight = false;

const COPY_BUTTON_DEFAULT_TEXT = 'Copy link';

function normalizeStoragePath(path) {
  return path?.replace(/\\+/g, '/') ?? '';
}

function deriveNameFromPath(path) {
  if (!path) {
    return 'Unsaved diagram';
  }

  const normalizedPath = normalizeStoragePath(path);
  const segments = normalizedPath.split('/');
  const candidate = segments.filter(Boolean).pop() ?? normalizedPath;

  return candidate || 'Unsaved diagram';
}

function setDiagramSource(path, fallbackName) {
  currentStoragePath = path ? normalizeStoragePath(path) : null;

  if (currentStoragePath) {
    currentDiagramName = deriveNameFromPath(currentStoragePath);
  } else if (typeof fallbackName === 'string') {
    currentDiagramName = fallbackName;
  }

  updateShareModeAvailability();
  updateDiagramTitle();
}

function getDiagramDisplayName() {
  return currentDiagramName?.trim() ? currentDiagramName.trim() : 'Unsaved diagram';
}

function updateDiagramTitle() {
  if (!diagramNameElement) {
    return;
  }

  const diagramTitle = getDiagramDisplayName();
  diagramNameElement.textContent = diagramTitle;
  diagramNameElement.title = currentStoragePath ?? diagramTitle;
  document.title = `${diagramTitle} - BPMN Modeler`;
}

function updateShareModeAvailability() {
  if (!shareModeInputs.length) {
    return;
  }

  const hasSource = Boolean(currentStoragePath);
  const snapshotRadio = shareModeInputs.find((input) => input.value === 'snapshot');

  shareModeInputs.forEach((input) => {
    if (input.value === 'source') {
      input.disabled = !hasSource;

      if (!hasSource && input.checked && snapshotRadio && !snapshotRadio.disabled) {
        snapshotRadio.checked = true;
      }
    }

    const optionContainer = input.closest('.share-option');

    if (optionContainer) {
      optionContainer.classList.toggle('disabled', input.disabled);
    }
  });
}

function setDefaultShareMode() {
  if (!shareModeInputs.length) {
    return;
  }

  const preferredMode = currentStoragePath ? 'source' : 'snapshot';
  let matched = false;

  for (const input of shareModeInputs) {
    if (!input.disabled && input.value === preferredMode) {
      input.checked = true;
      matched = true;
      break;
    }
  }

  if (!matched) {
    const fallback = shareModeInputs.find((input) => !input.disabled);

    if (fallback) {
      fallback.checked = true;
    }
  }
}

function clearShareFeedback() {
  if (shareLinkGroup) {
    shareLinkGroup.classList.add('hidden');
  }

  if (shareLinkInput) {
    shareLinkInput.value = '';
  }

  if (copyShareLinkButton) {
    copyShareLinkButton.disabled = true;
    copyShareLinkButton.textContent = COPY_BUTTON_DEFAULT_TEXT;
  }

  if (shareErrorElement) {
    shareErrorElement.textContent = '';
  }
}

function getSelectedShareMode() {
  const selected = shareModeInputs.find((input) => input.checked);
  return selected?.value ?? 'snapshot';
}

function ensureBpmnExtension(path) {
  return path.endsWith('.bpmn') ? path : `${path}.bpmn`;
}

async function generateSnapshotForShare() {
  const { xml } = await modeler.saveXML({ format: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sharePath = `shared/diagram-${timestamp}.bpmn`;

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

  return sharePath;
}

function focusShareLink() {
  if (!shareLinkInput) {
    return;
  }

  shareLinkInput.focus();
  shareLinkInput.select();
  shareLinkInput.setSelectionRange(0, shareLinkInput.value.length);
}

async function handleShareSubmit(event) {
  event.preventDefault();

  if (!shareForm || shareOperationInFlight) {
    return;
  }

  clearShareFeedback();

  if (!shareErrorElement) {
    return;
  }

  shareOperationInFlight = true;
  shareForm.classList.add('is-processing');

  if (shareGenerateButton) {
    shareGenerateButton.disabled = true;
  }

  try {
    const mode = getSelectedShareMode();
    let sharePath;

    if (mode === 'source') {
      if (!currentStoragePath) {
        shareErrorElement.textContent = 'Save the diagram before sharing the source file.';
        return;
      }

      sharePath = ensureBpmnExtension(currentStoragePath);
    } else {
      sharePath = await generateSnapshotForShare();
    }

    const shareUrl = new URL('/viewer', window.location.origin);
    shareUrl.searchParams.set('path', sharePath);

    if (shareLinkInput && shareLinkGroup) {
      shareLinkInput.value = shareUrl.toString();
      shareLinkGroup.classList.remove('hidden');

      if (copyShareLinkButton) {
        copyShareLinkButton.disabled = false;
      }

      focusShareLink();
    }
  } catch (error) {
    console.error(error);
    shareErrorElement.textContent = 'Unable to generate a share link. Please try again.';
  } finally {
    shareOperationInFlight = false;

    if (shareForm) {
      shareForm.classList.remove('is-processing');
    }

    if (shareGenerateButton) {
      shareGenerateButton.disabled = false;
    }
  }
}

function openShareDialog() {
  if (!shareDialog) {
    return;
  }

  if (typeof shareDialog.showModal !== 'function') {
    alert('Sharing is not supported in this browser.');
    return;
  }

  clearShareFeedback();
  updateShareModeAvailability();
  setDefaultShareMode();
  shareDialog.showModal();
}

async function handleCopyShareLink() {
  if (!shareLinkInput || !copyShareLinkButton) {
    return;
  }

  const link = shareLinkInput.value.trim();

  if (!link) {
    return;
  }

  let copied = false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(link);
      copied = true;
    } catch (error) {
      console.warn('Clipboard copy failed, falling back to manual copy.', error);
    }
  }

  if (!copied) {
    focusShareLink();

    if (typeof document.execCommand === 'function') {
      try {
        copied = document.execCommand('copy');
      } catch (error) {
        console.warn('document.execCommand copy failed.', error);
      }
    }
  }

  if (copied) {
    copyShareLinkButton.textContent = 'Copied!';

    window.setTimeout(() => {
      if (copyShareLinkButton) {
        copyShareLinkButton.textContent = COPY_BUTTON_DEFAULT_TEXT;
      }
    }, 2000);
  } else if (shareErrorElement) {
    shareErrorElement.textContent = 'Copy to clipboard is not supported in this browser.';
  }
}

updateShareModeAvailability();
setDefaultShareMode();
clearShareFeedback();

async function createNewDiagram() {
  try {
    await modeler.importXML(DEFAULT_DIAGRAM);
    const canvas = modeler.get('canvas');
    canvas.zoom('fit-viewport');
    setDiagramSource(null, 'Unsaved diagram');
    if (savePathInput) {
      savePathInput.value = '';
    }
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
    const normalizedPath = normalizeStoragePath(path);
    setDiagramSource(normalizedPath);
    if (savePathInput) {
      savePathInput.value = normalizedPath;
    }
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
    setDiagramSource(path);
    if (savePathInput) {
      savePathInput.value = path;
    }
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
    const suggestedPath = file.name.replace(/\.xml$/i, '.bpmn');
    if (savePathInput) {
      savePathInput.value = suggestedPath;
    }
    setDiagramSource(null, deriveNameFromPath(suggestedPath));
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

shareButton?.addEventListener('click', () => {
  openShareDialog();
});

shareCancelButton?.addEventListener('click', () => {
  shareDialog?.close();
});

shareForm?.addEventListener('submit', (event) => {
  void handleShareSubmit(event);
});

shareForm?.addEventListener('change', (event) => {
  const target = event.target;

  if (target instanceof HTMLInputElement && target.name === 'share-mode') {
    clearShareFeedback();
    if (shareErrorElement) {
      shareErrorElement.textContent = '';
    }
  }
});

copyShareLinkButton?.addEventListener('click', () => {
  void handleCopyShareLink();
});

shareDialog?.addEventListener('close', () => {
  shareOperationInFlight = false;

  if (shareForm) {
    shareForm.classList.remove('is-processing');
  }

  if (shareGenerateButton) {
    shareGenerateButton.disabled = false;
  }

  clearShareFeedback();
  setDefaultShareMode();
});

storageToggle?.addEventListener('click', () => toggleStorageOverlay());
closeStorage?.addEventListener('click', () => toggleStorageOverlay(false));

modeler.on('import.done', () => {
  updateDiagramTitle();
});

modeler.on('commandStack.changed', () => {
  updateDiagramTitle();
});

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
