/* global BpmnJS */

const messageElement = document.getElementById('message');
const viewer = new BpmnJS({ container: '#canvas' });

function getDiagramPath() {
  const prefix = '/embed/';
  const rawPath = window.location.pathname.startsWith(prefix)
    ? window.location.pathname.slice(prefix.length)
    : window.location.pathname.replace(/^\/+/, '');

  return rawPath
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join('/');
}

function encodeDiagramPath(path) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function showMessage(text, variant = 'info') {
  if (!text) {
    messageElement.style.display = 'none';
    return;
  }

  messageElement.textContent = text;
  messageElement.dataset.variant = variant;
  messageElement.style.display = 'block';
}

async function loadDiagram() {
  const path = getDiagramPath();

  if (!path) {
    showMessage('No diagram specified.', 'error');
    return;
  }

  showMessage(`Loading diagram "${path}"...`);

  try {
    const response = await fetch(`/api/diagrams/${encodeDiagramPath(path)}`);

    if (!response.ok) {
      if (response.status === 404) {
        showMessage('Diagram not found.', 'error');
        return;
      }

      throw new Error('Failed to fetch diagram');
    }

    const xml = await response.text();

    await viewer.importXML(xml);
    showMessage('');
  } catch (error) {
    console.error(error);
    showMessage('Unable to load diagram.', 'error');
  }
}

loadDiagram();

