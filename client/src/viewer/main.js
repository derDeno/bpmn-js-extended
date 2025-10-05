import BpmnViewer from 'bpmn-js/lib/Viewer';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import {
  applyTranslations,
  initializeLocale,
  onLocaleChange,
  t
} from '../i18n/index.js';

const container = document.getElementById('viewer');
const emptyState = document.getElementById('viewer-empty');
initializeLocale();
const viewer = new BpmnViewer({
  container
});

let currentDiagramPath = null;

function updateViewerTitle(path) {
  if (path) {
    document.title = `${t('app.viewerTitle')} – ${path}`;
  } else {
    document.title = t('app.viewerTitle');
  }
}

function showEmptyState(key) {
  if (!emptyState) {
    return;
  }

  emptyState.hidden = false;
  emptyState.dataset.i18n = key;
  emptyState.textContent = t(key);
}

async function loadDiagram(path) {
  try {
    const response = await fetch(`/api/storage/file?${new URLSearchParams({ path })}`);

    if (!response.ok) {
      throw new Error('Failed to fetch BPMN file');
    }

    const { contents } = await response.json();
    await viewer.importXML(contents);
    viewer.get('canvas').zoom('fit-viewport');
    currentDiagramPath = path;
    updateViewerTitle(path);
    if (emptyState) {
      emptyState.hidden = true;
      delete emptyState.dataset.i18n;
    }
  } catch (error) {
    console.error(error);
    currentDiagramPath = null;
    showEmptyState('viewer.loadError');
    updateViewerTitle();
  }
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const path = params.get('path');

  if (!path) {
    currentDiagramPath = null;
    showEmptyState('viewer.missingPath');
    updateViewerTitle();
    return;
  }

  if (emptyState) {
    emptyState.hidden = true;
    delete emptyState.dataset.i18n;
  }
  updateViewerTitle(path);
  loadDiagram(path);
}

function handleLocaleChange() {
  applyTranslations();

  if (!emptyState?.hidden && emptyState.dataset.i18n) {
    emptyState.textContent = t(emptyState.dataset.i18n);
  }

  updateViewerTitle(currentDiagramPath);
}

handleLocaleChange();
onLocaleChange(() => {
  handleLocaleChange();
});
init();
