import BpmnModeler from 'bpmn-js/lib/Modeler';
import camundaPlatformBehaviors from 'camunda-bpmn-js-behaviors/lib/camunda-platform';
import camundaModdleDescriptors from 'camunda-bpmn-moddle/resources/camunda.json';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import {
  applyTranslations,
  getAvailableLocales,
  getCurrentLocale,
  initializeLocale,
  onLocaleChange,
  setLocale,
  t
} from '../i18n/index.js';
import { ensureUiConfig, renderHeaderLogo } from '../shared/uiConfig.js';

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
  additionalModules: [
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
const appLogoContainer = document.getElementById('app-logo');
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
const languageSelect = document.getElementById('language-select');

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
  const actionLabel = isDark ? t('theme.switchToLight') : t('theme.switchToDark');
  const followSystemHint = t('theme.followSystemHint');
  themeToggle.setAttribute('aria-label', isDark ? t('theme.activateLight') : t('theme.activateDark'));
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


let currentActiveNode;
let currentDiagramName = '';
let currentStoragePath = null;
let shareOperationInFlight = false;

function normalizeStoragePath(path) {
  return path?.replace(/\\+/g, '/') ?? '';
}

function stripBpmnExtension(name) {
  if (typeof name !== 'string') {
    return '';
  }

  return name.replace(/\.bpmn$/i, '');
}

function normalizeDiagramName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';

  if (!trimmed) {
    return '';
  }

  return stripBpmnExtension(trimmed);
}

function deriveNameFromPath(path) {
  if (!path) {
    return '';
  }

  const normalizedPath = normalizeStoragePath(path);
  const segments = normalizedPath.split('/');
  const candidate = segments.filter(Boolean).pop() ?? normalizedPath;

  return normalizeDiagramName(candidate || '');
}

function setDiagramSource(path, fallbackName = '') {
  currentStoragePath = path ? normalizeStoragePath(path) : null;

  if (currentStoragePath) {
    currentDiagramName = deriveNameFromPath(currentStoragePath);
  } else if (typeof fallbackName === 'string') {
    currentDiagramName = normalizeDiagramName(fallbackName);
  } else {
    currentDiagramName = '';
  }

  updateShareModeAvailability();
  updateDiagramTitle();
  updateModelerUrl();
}

function getDiagramDisplayName() {
  if (currentDiagramName?.trim()) {
    return currentDiagramName.trim();
  }

  return t('diagram.unsaved');
}

function updateDiagramTitle() {
  if (!diagramNameElement) {
    return;
  }

  const diagramTitle = getDiagramDisplayName();
  diagramNameElement.textContent = diagramTitle;
  diagramNameElement.title = currentStoragePath ?? diagramTitle;
  document.title = `${diagramTitle} - ${t('app.modelerTitle')}`;
}

function getDiagramUrlIdentifier() {
  if (currentStoragePath?.trim()) {
    const normalizedPath = normalizeStoragePath(currentStoragePath).trim();

    if (normalizedPath) {
      const segments = normalizedPath.split('/');
      const fileName = segments.pop();
      const sanitizedFileName = normalizeDiagramName(fileName) || fileName?.trim();

      if (sanitizedFileName) {
        segments.push(sanitizedFileName);
      }

      const identifier = segments.filter(Boolean).join('/');

      if (identifier) {
        return identifier;
      }
    }
  }

  if (currentDiagramName?.trim()) {
    return currentDiagramName.trim();
  }

  return 'new';
}

function updateModelerUrl() {
  if (!window?.history?.replaceState) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const identifier = getDiagramUrlIdentifier();

  params.set('diagram', identifier);

  const query = params.toString();
  const hash = window.location.hash;
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}${hash}`;

  window.history.replaceState(null, '', newUrl);
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
    copyShareLinkButton.dataset.state = 'default';
    updateCopyShareLinkLabel();
  }

  if (shareErrorElement) {
    delete shareErrorElement.dataset.i18n;
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
        shareErrorElement.dataset.i18n = 'share.error.noSource';
        shareErrorElement.textContent = t('share.error.noSource');
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
        copyShareLinkButton.dataset.state = 'default';
        updateCopyShareLinkLabel();
      }

      focusShareLink();
    }
  } catch (error) {
    console.error(error);
    shareErrorElement.dataset.i18n = 'share.error.generic';
    shareErrorElement.textContent = t('share.error.generic');
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
    alert(t('share.alertUnsupported'));
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
    copyShareLinkButton.dataset.state = 'copied';
    updateCopyShareLinkLabel();

    window.setTimeout(() => {
      if (copyShareLinkButton) {
        copyShareLinkButton.dataset.state = 'default';
        updateCopyShareLinkLabel();
      }
    }, 2000);
  } else if (shareErrorElement) {
    shareErrorElement.dataset.i18n = 'share.error.clipboardUnsupported';
    shareErrorElement.textContent = t('share.error.clipboardUnsupported');
  }
}

function updateCopyShareLinkLabel() {
  if (!copyShareLinkButton) {
    return;
  }

  const state = copyShareLinkButton.dataset.state === 'copied' ? 'copied' : 'default';
  const key = state === 'copied' ? 'share.copied' : 'share.copyLink';
  copyShareLinkButton.textContent = t(key);
}

updateShareModeAvailability();
setDefaultShareMode();
clearShareFeedback();

onLocaleChange(() => {
  handleLocaleUpdate();
});

async function bootstrapUi() {
  try {
    await ensureUiConfig();
  } catch (error) {
    console.warn('Unable to load UI configuration. Using defaults.', error);
  }

  initializeLocale();
  initializeTheme();
  renderHeaderLogo(appLogoContainer);
  handleLocaleUpdate();
}

bootstrapUi().catch((error) => {
  console.error('Failed to initialize the modeler UI.', error);
});

async function createNewDiagram() {
  try {
    await modeler.importXML(DEFAULT_DIAGRAM);
    const canvas = modeler.get('canvas');
    canvas.zoom('fit-viewport');
    setDiagramSource(null);
    if (savePathInput) {
      savePathInput.value = '';
    }
  } catch (error) {
    console.error('Failed to import default diagram', error);
    alert(t('notifications.newDiagramFailed'));
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
    renderStorageMessage('storage.failed');
  }
}

function renderTree(nodes) {
  if (!storageTree) {
    return;
  }

  storageTree.innerHTML = '';

  if (!nodes.length) {
    renderStorageMessage('storage.empty', 'storage-hint');
    return;
  }

  const fragment = document.createDocumentFragment();

  nodes.forEach((node) => {
    fragment.appendChild(createTreeNode(node));
  });

  storageTree.appendChild(fragment);
}

function renderStorageMessage(key, className) {
  if (!storageTree) {
    return;
  }

  storageTree.innerHTML = '';
  const messageItem = document.createElement('li');

  if (className) {
    messageItem.className = className;
  }

  messageItem.dataset.i18n = key;
  messageItem.textContent = t(key);
  storageTree.appendChild(messageItem);
}

function populateLanguageSelect() {
  if (!languageSelect) {
    return;
  }

  const locales = getAvailableLocales();
  const current = getCurrentLocale();

  languageSelect.innerHTML = '';

  locales.forEach((locale) => {
    const option = document.createElement('option');
    option.value = locale;
    option.dataset.i18n = `language.options.${locale}`;
    option.textContent = t(`language.options.${locale}`);
    languageSelect.appendChild(option);
  });

  if (locales.includes(current)) {
    languageSelect.value = current;
  }
}

function handleLocaleUpdate() {
  populateLanguageSelect();
  applyTranslations();
  const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  updateThemeToggle(currentTheme);
  updateDiagramTitle();
  updateCopyShareLinkLabel();
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

    return true;
  } catch (error) {
    console.error(error);
    alert(t('notifications.loadFromStorageFailed'));

    return false;
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
    alert(t('notifications.saveSuccess'));
  } catch (error) {
    console.error(error);
    alert(t('notifications.saveFailed'));
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
    alert(t('notifications.folderCreated'));
  } catch (error) {
    console.error(error);
    alert(t('notifications.folderCreateFailed'));
  }
}

languageSelect?.addEventListener('change', (event) => {
  const target = event.target;

  if (target instanceof HTMLSelectElement) {
    setLocale(target.value);
  }
});

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
    alert(t('notifications.importFailed'));
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
    alert(t('notifications.downloadFailed'));
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
    alert(t('prompts.provideFilePath'));
    return;
  }

  await saveDiagramToStorage(path.endsWith('.bpmn') ? path : `${path}.bpmn`);
});

folderForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const path = folderPathInput.value.trim();

  if (!path) {
    alert(t('prompts.provideFolderPath'));
    return;
  }

  await createFolder(path);
  folderPathInput.value = '';
});

async function initializeDiagram() {
  const params = new URLSearchParams(window.location.search);
  const identifier = params.get('diagram');

  if (!identifier || identifier === 'new') {
    await createNewDiagram();
    return;
  }

  const normalizedIdentifier = normalizeStoragePath(identifier).trim();

  if (!normalizedIdentifier) {
    await createNewDiagram();
    return;
  }

  const candidatePath = ensureBpmnExtension(normalizedIdentifier);
  const loaded = await loadDiagramFromStorage(candidatePath);

  if (!loaded) {
    await createNewDiagram();
  }
}

void initializeDiagram();
