const diagramList = document.getElementById('diagram-list');
const newDiagramButton = document.getElementById('new-diagram');
const saveDiagramButton = document.getElementById('save-diagram');
const shareDiagramButton = document.getElementById('share-diagram');
const toggleSidebarButton = document.getElementById('toggle-sidebar');
const statusElement = document.getElementById('status');

/* global BpmnJS */

const modeler = new BpmnJS({
  container: '#canvas',
  keyboard: {
    bindTo: document
  }
});

let currentDiagramPath = null;
let isSidebarHidden = false;

function setSidebarHidden(hidden) {
  isSidebarHidden = hidden;
  document.body.classList.toggle('sidebar-hidden', hidden);
  toggleSidebarButton.textContent = hidden ? 'Show sidebar' : 'Hide sidebar';
  toggleSidebarButton.setAttribute('aria-pressed', hidden ? 'true' : 'false');
}

function encodeDiagramPath(path) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function findFirstDiagram(nodes) {
  for (const node of nodes) {
    if (node.type === 'diagram') {
      return node.path;
    }

    if (node.type === 'folder' && Array.isArray(node.children)) {
      const child = findFirstDiagram(node.children);

      if (child) {
        return child;
      }
    }
  }

  return null;
}

function renderTree(container, nodes) {
  nodes.forEach((node) => {
    const item = document.createElement('li');

    if (node.type === 'folder') {
      item.classList.add('folder');

      const details = document.createElement('details');
      details.open = true;

      const summary = document.createElement('summary');
      summary.textContent = node.name;
      details.appendChild(summary);

      const childList = document.createElement('ul');

      if (Array.isArray(node.children) && node.children.length) {
        renderTree(childList, node.children);
      } else {
        const emptyItem = document.createElement('li');
        emptyItem.classList.add('empty-folder');
        emptyItem.textContent = 'No diagrams yet';
        childList.appendChild(emptyItem);
      }

      details.appendChild(childList);
      item.appendChild(details);
    } else if (node.type === 'diagram') {
      item.classList.add('diagram');

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = node.name;
      button.dataset.path = node.path;

      if (node.path === currentDiagramPath) {
        button.classList.add('active');
      }

      button.addEventListener('click', () => {
        loadDiagram(node.path);
      });

      item.appendChild(button);
    }

    container.appendChild(item);
  });
}

function setStatus(message, variant = 'info') {
  statusElement.textContent = message || '';
  statusElement.dataset.variant = variant;
}

function renderDiagrams(tree) {
  diagramList.innerHTML = '';

  if (!tree.length) {
    const emptyItem = document.createElement('li');
    emptyItem.textContent = 'No diagrams saved yet.';
    diagramList.appendChild(emptyItem);
    return;
  }

  renderTree(diagramList, tree);
}

async function fetchDiagramList() {
  try {
    const response = await fetch('/api/diagrams');

    if (!response.ok) {
      throw new Error('Failed to load diagrams');
    }

    const { tree } = await response.json();

    renderDiagrams(tree);

    if (!currentDiagramPath) {
      const firstDiagram = findFirstDiagram(tree);

      if (firstDiagram) {
        await loadDiagram(firstDiagram);
      }
    }
  } catch (error) {
    console.error(error);
    setStatus('Unable to load diagram list', 'error');
  }
}

async function loadDiagram(path) {
  setStatus(`Loading diagram "${path}"...`);

  try {
    const response = await fetch(`/api/diagrams/${encodeDiagramPath(path)}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch diagram: ${response.statusText}`);
    }

    const xml = await response.text();

    await modeler.importXML(xml);

    currentDiagramPath = path;
    saveDiagramButton.disabled = false;
    shareDiagramButton.disabled = false;
    highlightActiveDiagram(path);
    setStatus(`Diagram "${path}" ready.`);
  } catch (error) {
    console.error(error);
    setStatus(`Could not load diagram "${path}"`, 'error');
  }
}

function highlightActiveDiagram(path) {
  const buttons = diagramList.querySelectorAll('button[data-path]');

  for (const button of buttons) {
    const isActive = button.dataset.path === path;
    button.classList.toggle('active', isActive);

    if (isActive) {
      let parent = button.parentElement;

      while (parent) {
        if (parent.tagName === 'DETAILS') {
          parent.open = true;
        }

        parent = parent.parentElement;
      }
    }
  }
}

async function createDiagram() {
  const name = prompt('Name for the new diagram (use "/" to organize in folders):');

  if (!name) {
    return;
  }

  try {
    const response = await fetch('/api/diagrams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });

    if (response.status === 409) {
      setStatus('A diagram with that name already exists.', 'error');
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to create diagram');
    }

    const { path } = await response.json();

    await fetchDiagramList();
    await loadDiagram(path);
    setStatus(`Created diagram "${path}".`);
  } catch (error) {
    console.error(error);
    setStatus('Unable to create diagram.', 'error');
  }
}

async function saveDiagram() {
  if (!currentDiagramPath) {
    return;
  }

  try {
    const { xml } = await modeler.saveXML({ format: true });

    const response = await fetch(`/api/diagrams/${encodeDiagramPath(currentDiagramPath)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/xml'
      },
      body: xml
    });

    if (!response.ok) {
      throw new Error('Failed to save');
    }

    await fetchDiagramList();
    setStatus(`Saved diagram "${currentDiagramPath}".`);
  } catch (error) {
    console.error(error);
    setStatus('Unable to save the current diagram.', 'error');
  }
}

function shareDiagram() {
  if (!currentDiagramPath) {
    return;
  }

  const encodedPath = currentDiagramPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const url = `${window.location.origin}/embed/${encodedPath}`;

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setStatus('Embed URL copied to clipboard.');
      })
      .catch((error) => {
        console.error(error);
        setStatus('Embed URL: ' + url);
      });
  } else {
    setStatus('Embed URL: ' + url);
  }
}

newDiagramButton.addEventListener('click', createDiagram);
saveDiagramButton.addEventListener('click', saveDiagram);
shareDiagramButton.addEventListener('click', shareDiagram);
toggleSidebarButton.addEventListener('click', () => {
  setSidebarHidden(!isSidebarHidden);
});

setSidebarHidden(false);

fetchDiagramList();

