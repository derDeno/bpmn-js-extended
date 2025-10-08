import BpmnModeler from 'bpmn-js/lib/Modeler';
import camundaPlatformBehaviors from 'camunda-bpmn-js-behaviors/lib/camunda-platform';
import camundaModdleDescriptors from 'camunda-bpmn-moddle/resources/camunda.json';
import { is } from 'bpmn-js/lib/util/ModelUtil';

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
const editXmlButton = document.getElementById('edit-xml');
const autoLayoutButton = document.getElementById('auto-layout');
const saveButton = document.getElementById('save-diagram');
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
const xmlDialog = document.getElementById('xml-editor-dialog');
const xmlForm = document.getElementById('xml-editor-form');
const xmlTextarea = document.getElementById('xml-editor-textarea');
const xmlErrorElement = document.getElementById('xml-editor-error');
const xmlCancelButton = document.getElementById('xml-editor-cancel');
const zoomInButton = document.getElementById('zoom-in');
const zoomOutButton = document.getElementById('zoom-out');
const zoomResetButton = document.getElementById('zoom-reset');
const moreActionsToggle = document.getElementById('more-actions-toggle');
const moreActionsMenu = document.getElementById('more-actions-menu');

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

function updateMoreActionsToggleAria() {
  if (!moreActionsToggle) {
    return;
  }

  const labelKey = isMoreActionsOpen ? 'actions.moreActions.close' : 'actions.moreActions.open';
  const label = t(labelKey);

  if (label) {
    moreActionsToggle.setAttribute('aria-label', label);
    moreActionsToggle.setAttribute('title', label);
  }
}

function setMoreActionsOpen(open) {
  if (!moreActionsToggle || !moreActionsMenu) {
    isMoreActionsOpen = false;
    return;
  }

  if (isMoreActionsOpen === open) {
    updateMoreActionsToggleAria();
    return;
  }

  isMoreActionsOpen = open;
  moreActionsToggle.setAttribute('aria-expanded', String(open));
  moreActionsMenu.classList.toggle('hidden', !open);
  moreActionsMenu.setAttribute('aria-hidden', String(!open));

  if (open) {
    document.addEventListener('pointerdown', handleMoreActionsPointerDown);
    document.addEventListener('keydown', handleMoreActionsKeydown);
  } else {
    document.removeEventListener('pointerdown', handleMoreActionsPointerDown);
    document.removeEventListener('keydown', handleMoreActionsKeydown);
  }

  updateMoreActionsToggleAria();
}

function closeMoreActionsMenu() {
  setMoreActionsOpen(false);
}

function handleMoreActionsPointerDown(event) {
  if (!moreActionsMenu || !moreActionsToggle) {
    return;
  }

  const target = event.target;

  if (target instanceof Node && (moreActionsMenu.contains(target) || moreActionsToggle.contains(target))) {
    return;
  }

  closeMoreActionsMenu();
}

function handleMoreActionsKeydown(event) {
  if (event.key !== 'Escape') {
    return;
  }

  closeMoreActionsMenu();

  if (moreActionsToggle) {
    moreActionsToggle.focus();
  }
}

function autoLayoutDiagram() {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');

  if (!elementRegistry || !modeling || !canvas) {
    return;
  }

  const rootElement = canvas.getRootElement();

  if (!rootElement) {
    return;
  }

  const flowNodes = elementRegistry.filter((element) => {
    if (!element || element === rootElement) {
      return false;
    }

    if (element.waypoints || element.labelTarget || element.host) {
      return false;
    }

    if (element.parent !== rootElement) {
      return false;
    }

    const businessObject = element.businessObject;

    return Boolean(businessObject) && is(businessObject, 'bpmn:FlowNode');
  });

  if (!flowNodes.length) {
    return;
  }

  const shapesById = new Map(flowNodes.map((shape) => [shape.id, shape]));
  const adjacency = new Map();
  const incomingCounts = new Map();
  const pendingLevels = new Map();

  flowNodes.forEach((shape) => {
    const outgoing = (shape.outgoing || []).filter((connection) => {
      return Boolean(connection.businessObject)
        && is(connection.businessObject, 'bpmn:SequenceFlow')
        && connection.target
        && shapesById.has(connection.target.id);
    }).map((connection) => connection.target);

    const incoming = (shape.incoming || []).filter((connection) => {
      return Boolean(connection.businessObject)
        && is(connection.businessObject, 'bpmn:SequenceFlow')
        && connection.source
        && shapesById.has(connection.source.id);
    });

    adjacency.set(shape.id, outgoing);
    incomingCounts.set(shape.id, incoming.length);
  });

  const queue = [];
  const levelAssignments = new Map();

  flowNodes.forEach((shape) => {
    if ((incomingCounts.get(shape.id) || 0) === 0) {
      levelAssignments.set(shape.id, 0);
      queue.push(shape);
    }
  });

  while (queue.length) {
    const shape = queue.shift();
    const currentLevel = levelAssignments.get(shape.id) ?? 0;
    const targets = adjacency.get(shape.id) || [];

    targets.forEach((target) => {
      const candidateLevel = currentLevel + 1;
      const storedLevel = pendingLevels.get(target.id) ?? 0;

      if (candidateLevel > storedLevel) {
        pendingLevels.set(target.id, candidateLevel);
      }

      const remaining = (incomingCounts.get(target.id) || 0) - 1;
      incomingCounts.set(target.id, remaining);

      if (remaining === 0) {
        levelAssignments.set(target.id, pendingLevels.get(target.id) ?? candidateLevel);
        queue.push(shapesById.get(target.id));
      }
    });
  }

  flowNodes.forEach((shape) => {
    if (!levelAssignments.has(shape.id)) {
      levelAssignments.set(shape.id, pendingLevels.get(shape.id) ?? 0);
    }
  });

  const bucketMap = new Map();

  levelAssignments.forEach((level, id) => {
    const shape = shapesById.get(id);

    if (!shape) {
      return;
    }

    const bucket = bucketMap.get(level) ?? [];
    bucket.push(shape);
    bucketMap.set(level, bucket);
  });

  bucketMap.forEach((bucket) => {
    bucket.sort((a, b) => {
      if (a.y !== b.y) {
        return a.y - b.y;
      }

      return a.id.localeCompare(b.id);
    });
  });

  const centersX = flowNodes.map((shape) => shape.x + shape.width / 2);
  const centersY = flowNodes.map((shape) => shape.y + shape.height / 2);

  const minCenterX = Math.min(...centersX);
  const minCenterY = Math.min(...centersY);

  const baseCenterX = Number.isFinite(minCenterX) ? minCenterX : 150;
  const baseCenterY = Number.isFinite(minCenterY) ? minCenterY : 150;

  const columnSpacing = 280;
  const rowSpacing = 170;

  const orderedLevels = Array.from(bucketMap.entries()).sort(([a], [b]) => a - b);
  const connectionsToLayout = new Set();

  orderedLevels.forEach(([level, bucket]) => {
    bucket.forEach((shape, index) => {
      const targetCenterX = baseCenterX + level * columnSpacing;
      const targetCenterY = baseCenterY + index * rowSpacing;

      const currentCenterX = shape.x + shape.width / 2;
      const currentCenterY = shape.y + shape.height / 2;

      const deltaX = targetCenterX - currentCenterX;
      const deltaY = targetCenterY - currentCenterY;

      if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
        modeling.moveElements([shape], { x: deltaX, y: deltaY }, rootElement);
      }

      (shape.incoming || []).forEach((connection) => {
        if (connection.businessObject && is(connection.businessObject, 'bpmn:SequenceFlow')) {
          connectionsToLayout.add(connection);
        }
      });

      (shape.outgoing || []).forEach((connection) => {
        if (connection.businessObject && is(connection.businessObject, 'bpmn:SequenceFlow')) {
          connectionsToLayout.add(connection);
        }
      });
    });
  });

  connectionsToLayout.forEach((connection) => {
    modeling.layoutConnection(connection);
  });
}


let currentActiveNode;
let currentDiagramName = '';
let currentStoragePath = null;
let shareOperationInFlight = false;
let isMoreActionsOpen = false;

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
  updateSaveButtonState();
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

function clearXmlEditorFeedback() {
  if (!xmlErrorElement) {
    return;
  }

  delete xmlErrorElement.dataset.i18n;
  xmlErrorElement.textContent = '';
}

async function openXmlEditorDialog() {
  if (!editXmlButton || !xmlDialog || !xmlTextarea) {
    return;
  }

  if (typeof xmlDialog.showModal !== 'function') {
    alert(t('xmlEditor.loadError'));
    return;
  }

  try {
    const { xml } = await modeler.saveXML({ format: true });
    xmlTextarea.value = xml;
    clearXmlEditorFeedback();
    xmlDialog.showModal();
    window.requestAnimationFrame(() => {
      xmlTextarea.focus();
      xmlTextarea.setSelectionRange(0, 0);
    });
  } catch (error) {
    console.error('Unable to load XML for editing.', error);
    alert(t('xmlEditor.loadError'));
  }
}

async function handleXmlSubmit(event) {
  event.preventDefault();

  if (!xmlTextarea) {
    return;
  }

  clearXmlEditorFeedback();

  const xml = xmlTextarea.value;

  try {
    await modeler.importXML(xml);
    const canvas = modeler.get('canvas');
    canvas.zoom('fit-viewport');
    xmlDialog?.close();
  } catch (error) {
    console.error('Failed to import XML from editor.', error);
    if (xmlErrorElement) {
      xmlErrorElement.dataset.i18n = 'xmlEditor.importError';
      xmlErrorElement.textContent = t('xmlEditor.importError');
    }
  }
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
  closeMoreActionsMenu();
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

function openStorageBrowser({ focusSaveInput = false } = {}) {
  closeMoreActionsMenu();
  toggleStorageOverlay(true);

  if (focusSaveInput) {
    focusSavePathInput();
  }
}

async function handleSaveAction({ saveAs = false } = {}) {
  if (!saveAs && currentStoragePath) {
    await saveDiagramToStorage(ensureBpmnExtension(currentStoragePath));
    return;
  }

  openStorageBrowser({ focusSaveInput: true });
}

function openFileImportPicker() {
  closeMoreActionsMenu();

  if (!fileInput) {
    console.warn('File input element is not available.');
    return;
  }

  fileInput.click();
}

async function downloadCurrentDiagram() {
  closeMoreActionsMenu();

  try {
    const { xml } = await modeler.saveXML({ format: true });
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'diagram.bpmn';
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert(t('notifications.downloadFailed'));
  }
}

function triggerUndo() {
  try {
    const commandStack = modeler.get('commandStack');
    if (typeof commandStack?.undo === 'function') {
      commandStack.undo();
    }
  } catch (error) {
    console.error('Undo operation failed.', error);
  }
}

function triggerRedo() {
  try {
    const commandStack = modeler.get('commandStack');
    if (typeof commandStack?.redo === 'function') {
      commandStack.redo();
    }
  } catch (error) {
    console.error('Redo operation failed.', error);
  }
}

function isEditableTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target instanceof HTMLInputElement) {
    const editableTypes = ['text', 'search', 'email', 'url', 'tel', 'password', 'number'];
    return editableTypes.includes(target.type) && !target.readOnly && !target.disabled;
  }

  if (target instanceof HTMLTextAreaElement) {
    return !target.readOnly && !target.disabled;
  }

  if (target.closest('[contenteditable="true"]')) {
    return true;
  }

  return false;
}

function handleKeyboardShortcuts(event) {
  const hasModifier = event.ctrlKey || event.metaKey;

  if (!hasModifier || event.defaultPrevented) {
    return;
  }

  const key = event.key.toLowerCase();
  const editableTarget = isEditableTarget(event.target);

  if (editableTarget && (key === 'z' || key === 'y')) {
    return;
  }

  switch (key) {
    case 'z':
      event.preventDefault();
      if (event.shiftKey) {
        triggerRedo();
      } else {
        triggerUndo();
      }
      break;
    case 'y':
      event.preventDefault();
      triggerRedo();
      break;
    case 's':
      event.preventDefault();
      void handleSaveAction({ saveAs: event.shiftKey });
      break;
    case 'o':
      event.preventDefault();
      if (event.shiftKey) {
        openStorageBrowser();
      } else {
        openFileImportPicker();
      }
      break;
    case 'n':
      event.preventDefault();
      createNewDiagram();
      break;
    default:
      return;
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

function focusSavePathInput() {
  if (!savePathInput) {
    return;
  }

  requestAnimationFrame(() => {
    savePathInput.focus();
    savePathInput.select();
  });
}

function updateSaveButtonState() {
  if (!saveButton) {
    return;
  }

  const hasStoragePath = Boolean(currentStoragePath);
  const ariaLabelKey = hasStoragePath ? 'actions.saveDiagram.ariaLabel' : 'actions.saveDiagram.ariaLabelUnsaved';
  const titleKey = hasStoragePath ? 'actions.saveDiagram.title' : 'actions.saveDiagram.titleUnsaved';

  saveButton.dataset.mode = hasStoragePath ? 'save' : 'save-as';
  saveButton.setAttribute('aria-label', t(ariaLabelKey));
  saveButton.setAttribute('title', t(titleKey));
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
  updateSaveButtonState();
  updateMoreActionsToggleAria();
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

moreActionsToggle?.addEventListener('click', () => {
  setMoreActionsOpen(!isMoreActionsOpen);
});

moreActionsMenu?.addEventListener('click', (event) => {
  const target = event.target;

  if (target instanceof Element) {
    const closeTrigger = target.closest('[data-close-menu]');

    if (closeTrigger) {
      closeMoreActionsMenu();
    }
  }
});

newDiagramButton?.addEventListener('click', () => {
  createNewDiagram();
});

autoLayoutButton?.addEventListener('click', () => {
  try {
    autoLayoutDiagram();
  } catch (error) {
    console.error('Failed to auto layout diagram.', error);
  }
});

importButton?.addEventListener('click', () => {
  openFileImportPicker();
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

downloadButton?.addEventListener('click', () => {
  void downloadCurrentDiagram();
});

editXmlButton?.addEventListener('click', () => {
  closeMoreActionsMenu();
  void openXmlEditorDialog();
});

saveButton?.addEventListener('click', () => {
  void handleSaveAction();
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

xmlCancelButton?.addEventListener('click', () => {
  xmlDialog?.close();
});

xmlDialog?.addEventListener('close', () => {
  clearXmlEditorFeedback();
});

xmlForm?.addEventListener('submit', (event) => {
  void handleXmlSubmit(event);
});

zoomInButton?.addEventListener('click', () => {
  try {
    const zoomScroll = modeler.get('zoomScroll');
    if (typeof zoomScroll?.stepZoom === 'function') {
      zoomScroll.stepZoom(1);
    }
  } catch (error) {
    console.error('Unable to zoom in.', error);
  }
});

zoomOutButton?.addEventListener('click', () => {
  try {
    const zoomScroll = modeler.get('zoomScroll');
    if (typeof zoomScroll?.stepZoom === 'function') {
      zoomScroll.stepZoom(-1);
    }
  } catch (error) {
    console.error('Unable to zoom out.', error);
  }
});

zoomResetButton?.addEventListener('click', () => {
  try {
    const canvas = modeler.get('canvas');
    canvas.zoom('fit-viewport');
  } catch (error) {
    console.error('Unable to reset zoom.', error);
  }
});

storageToggle?.addEventListener('click', () => toggleStorageOverlay());
closeStorage?.addEventListener('click', () => toggleStorageOverlay(false));

document.addEventListener('keydown', handleKeyboardShortcuts);

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
