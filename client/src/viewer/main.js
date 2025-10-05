import BpmnViewer from 'bpmn-js/lib/Viewer';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

const container = document.getElementById('viewer');
const emptyState = document.getElementById('viewer-empty');
const label = document.getElementById('viewer-label');

const viewer = new BpmnViewer({
  container
});

async function loadDiagram(path) {
  try {
    const response = await fetch(`/api/storage/file?${new URLSearchParams({ path })}`);

    if (!response.ok) {
      throw new Error('Failed to fetch BPMN file');
    }

    const { contents } = await response.json();
    await viewer.importXML(contents);
    viewer.get('canvas').zoom('fit-viewport');
    label.textContent = path;
    emptyState.hidden = true;
  } catch (error) {
    console.error(error);
    emptyState.hidden = false;
    emptyState.textContent = 'Unable to load diagram. Check the path and try again.';
  }
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const path = params.get('path');

  if (!path) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  loadDiagram(path);
}

init();
