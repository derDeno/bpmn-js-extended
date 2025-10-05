const FALLBACK_LOCALE = 'en';
const LANGUAGE_STORAGE_KEY = 'bpmn-language-preference';

const messages = {
  en: {
    language: {
      label: 'Language',
      options: {
        en: 'English',
        de: 'Deutsch'
      }
    },
    app: {
      modelerTitle: 'BPMN Modeler',
      viewerTitle: 'BPMN Viewer'
    },
    diagram: {
      untitled: 'Untitled diagram',
      unsaved: 'Unsaved diagram'
    },
    actions: {
      newDiagram: {
        label: 'New diagram',
        ariaLabel: 'Create a new diagram',
        title: 'Create a new diagram'
      },
      importFile: {
        label: 'Import file',
        ariaLabel: 'Import a BPMN file',
        title: 'Import a BPMN file'
      },
      downloadDiagram: {
        label: 'Download diagram',
        ariaLabel: 'Download the current BPMN diagram',
        title: 'Download the current BPMN diagram'
      },
      shareDiagram: {
        label: 'Share diagram',
        ariaLabel: 'Share the current diagram as a viewer link',
        title: 'Share the current diagram as a viewer link'
      },
      openStorage: {
        label: 'Open storage',
        ariaLabel: 'Open workspace storage',
        title: 'Open workspace storage'
      }
    },
    theme: {
      srLabel: 'Toggle theme',
      activateDark: 'Activate dark mode',
      activateLight: 'Activate light mode',
      switchToDark: 'Switch to dark mode',
      switchToLight: 'Switch to light mode',
      followSystemHint: 'Shift + click to follow system theme'
    },
    storage: {
      title: 'Workspace Storage',
      close: 'Close',
      saveHeading: 'Save Diagram',
      saveHint: 'Enter a path relative to the workspace root. Create folders as needed.',
      savePathLabel: 'File path',
      savePlaceholder: 'diagrams/example.bpmn',
      saveButton: 'Save',
      createHeading: 'Create Folder',
      folderPathLabel: 'Folder path',
      folderPlaceholder: 'diagrams/new-folder',
      createButton: 'Create',
      empty: 'Storage is empty.',
      failed: 'Failed to load storage.'
    },
    share: {
      dialogTitle: 'Share diagram',
      dialogDescription: "Choose how you'd like to share this diagram.",
      optionsLegend: 'Share options',
      sourceTitle: 'Share saved source file',
      sourceHint: 'Generate a link to the file stored in workspace storage.',
      snapshotTitle: 'Create snapshot copy',
      snapshotHint: 'Save a timestamped copy in <code>shared/</code> and share that link.',
      linkLabel: 'Share link',
      copyLink: 'Copy link',
      cancel: 'Cancel',
      generate: 'Generate link',
      copied: 'Copied!',
      error: {
        noSource: 'Save the diagram before sharing the source file.',
        generic: 'Unable to generate a share link. Please try again.',
        clipboardUnsupported: 'Copy to clipboard is not supported in this browser.'
      },
      alertUnsupported: 'Sharing is not supported in this browser.'
    },
    prompts: {
      provideFilePath: 'Provide a file path to save the diagram.',
      provideFolderPath: 'Provide a folder path.'
    },
    notifications: {
      newDiagramFailed: 'Failed to create a new diagram. Check the console for details.',
      importFailed: 'Failed to import the selected file.',
      downloadFailed: 'Failed to download the BPMN diagram.',
      loadFromStorageFailed: 'Unable to load the BPMN file from storage.',
      saveSuccess: 'Diagram saved to storage.',
      saveFailed: 'Unable to save the BPMN file.',
      folderCreated: 'Folder created.',
      folderCreateFailed: 'Unable to create the folder.'
    },
    viewer: {
      missingPath: 'No diagram path provided. Append ?path=your/file.bpmn to the URL.',
      loadError: 'Unable to load diagram. Check the path and try again.'
    }
  },
  de: {
    language: {
      label: 'Sprache',
      options: {
        en: 'Englisch',
        de: 'Deutsch'
      }
    },
    app: {
      modelerTitle: 'BPMN-Modeler',
      viewerTitle: 'BPMN-Viewer'
    },
    diagram: {
      untitled: 'Unbenanntes Diagramm',
      unsaved: 'Nicht gespeichertes Diagramm'
    },
    actions: {
      newDiagram: {
        label: 'Neues Diagramm',
        ariaLabel: 'Ein neues Diagramm erstellen',
        title: 'Ein neues Diagramm erstellen'
      },
      importFile: {
        label: 'Datei importieren',
        ariaLabel: 'Eine BPMN-Datei importieren',
        title: 'Eine BPMN-Datei importieren'
      },
      downloadDiagram: {
        label: 'Diagramm herunterladen',
        ariaLabel: 'Das aktuelle BPMN-Diagramm herunterladen',
        title: 'Das aktuelle BPMN-Diagramm herunterladen'
      },
      shareDiagram: {
        label: 'Diagramm teilen',
        ariaLabel: 'Das aktuelle Diagramm als Viewer-Link teilen',
        title: 'Das aktuelle Diagramm als Viewer-Link teilen'
      },
      openStorage: {
        label: 'Speicher öffnen',
        ariaLabel: 'Arbeitsbereichsspeicher öffnen',
        title: 'Arbeitsbereichsspeicher öffnen'
      }
    },
    theme: {
      srLabel: 'Theme umschalten',
      activateDark: 'Dunkelmodus aktivieren',
      activateLight: 'Hellmodus aktivieren',
      switchToDark: 'Zum Dunkelmodus wechseln',
      switchToLight: 'Zum Hellmodus wechseln',
      followSystemHint: 'Shift + Klick, um dem Systemthema zu folgen'
    },
    storage: {
      title: 'Arbeitsbereichsspeicher',
      close: 'Schließen',
      saveHeading: 'Diagramm speichern',
      saveHint: 'Geben Sie einen Pfad relativ zum Arbeitsbereich an. Erstellen Sie bei Bedarf Ordner.',
      savePathLabel: 'Dateipfad',
      savePlaceholder: 'diagramme/beispiel.bpmn',
      saveButton: 'Speichern',
      createHeading: 'Ordner erstellen',
      folderPathLabel: 'Ordnerpfad',
      folderPlaceholder: 'diagramme/neuer-ordner',
      createButton: 'Erstellen',
      empty: 'Der Speicher ist leer.',
      failed: 'Speicher konnte nicht geladen werden.'
    },
    share: {
      dialogTitle: 'Diagramm teilen',
      dialogDescription: 'Wählen Sie aus, wie Sie dieses Diagramm teilen möchten.',
      optionsLegend: 'Teiloptionen',
      sourceTitle: 'Gespeicherte Quelldatei teilen',
      sourceHint: 'Einen Link zur im Arbeitsbereich gespeicherten Datei erzeugen.',
      snapshotTitle: 'Schnappschusskopie erstellen',
      snapshotHint: 'Eine Version mit Zeitstempel in <code>shared/</code> speichern und diesen Link teilen.',
      linkLabel: 'Teil-Link',
      copyLink: 'Link kopieren',
      cancel: 'Abbrechen',
      generate: 'Link erzeugen',
      copied: 'Kopiert!',
      error: {
        noSource: 'Speichern Sie das Diagramm, bevor Sie die Quelldatei teilen.',
        generic: 'Teil-Link konnte nicht erzeugt werden. Bitte erneut versuchen.',
        clipboardUnsupported: 'Zwischenablage wird in diesem Browser nicht unterstützt.'
      },
      alertUnsupported: 'Teilen wird in diesem Browser nicht unterstützt.'
    },
    prompts: {
      provideFilePath: 'Geben Sie einen Dateipfad zum Speichern des Diagramms an.',
      provideFolderPath: 'Geben Sie einen Ordnerpfad an.'
    },
    notifications: {
      newDiagramFailed: 'Neues Diagramm konnte nicht erstellt werden. Details siehe Konsole.',
      importFailed: 'Ausgewählte Datei konnte nicht importiert werden.',
      downloadFailed: 'BPMN-Diagramm konnte nicht heruntergeladen werden.',
      loadFromStorageFailed: 'BPMN-Datei konnte nicht aus dem Speicher geladen werden.',
      saveSuccess: 'Diagramm im Speicher abgelegt.',
      saveFailed: 'BPMN-Datei konnte nicht gespeichert werden.',
      folderCreated: 'Ordner erstellt.',
      folderCreateFailed: 'Ordner konnte nicht erstellt werden.'
    },
    viewer: {
      missingPath: 'Kein Diagrammpfad angegeben. Hängen Sie ?path=pfad/zur/datei.bpmn an die URL an.',
      loadError: 'Diagramm konnte nicht geladen werden. Pfad überprüfen und erneut versuchen.'
    }
  }
};

let currentLocale = FALLBACK_LOCALE;
const listeners = new Set();

function getMessage(locale, key) {
  const segments = key.split('.');
  let value = messages[locale];

  for (const segment of segments) {
    if (value && typeof value === 'object' && segment in value) {
      value = value[segment];
    } else {
      return undefined;
    }
  }

  return typeof value === 'string' ? value : undefined;
}

function readStoredLocale() {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) || undefined;
  } catch (error) {
    console.warn('Unable to read locale from storage.', error);
    return undefined;
  }
}

function persistLocale(locale) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch (error) {
    console.warn('Unable to persist locale preference.', error);
  }
}

function normalizeLocale(locale) {
  if (locale && locale in messages) {
    return locale;
  }

  return FALLBACK_LOCALE;
}

function detectLocale() {
  const stored = readStoredLocale();

  if (stored && stored in messages) {
    return stored;
  }

  const navigatorLocale = typeof navigator !== 'undefined' ? navigator.language?.split('-')[0]?.toLowerCase() : undefined;

  if (navigatorLocale && navigatorLocale in messages) {
    return navigatorLocale;
  }

  return FALLBACK_LOCALE;
}

function notifyLocaleChange() {
  document.documentElement.setAttribute('lang', currentLocale);
  listeners.forEach((listener) => listener(currentLocale));
}

export function setLocale(locale) {
  const normalized = normalizeLocale(locale);

  if (normalized === currentLocale) {
    document.documentElement.setAttribute('lang', currentLocale);
    return;
  }

  currentLocale = normalized;
  persistLocale(normalized);
  notifyLocaleChange();
}

export function initializeLocale() {
  const initialLocale = detectLocale();
  currentLocale = initialLocale;
  document.documentElement.setAttribute('lang', currentLocale);
  persistLocale(currentLocale);
  notifyLocaleChange();
  return currentLocale;
}

export function t(key) {
  return getMessage(currentLocale, key) ?? getMessage(FALLBACK_LOCALE, key) ?? key;
}

export function onLocaleChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCurrentLocale() {
  return currentLocale;
}

export function getAvailableLocales() {
  return Object.keys(messages);
}

export function applyTranslations(root = document) {
  const textElements = root.querySelectorAll('[data-i18n]');
  textElements.forEach((element) => {
    const key = element.dataset.i18n;
    if (!key) {
      return;
    }

    const translation = t(key);
    if (translation !== undefined) {
      element.textContent = translation;
    }
  });

  const htmlElements = root.querySelectorAll('[data-i18n-html]');
  htmlElements.forEach((element) => {
    const key = element.dataset.i18nHtml;
    if (!key) {
      return;
    }

    const translation = t(key);
    if (translation !== undefined) {
      element.innerHTML = translation;
    }
  });

  const attrElements = root.querySelectorAll('[data-i18n-attrs]');
  attrElements.forEach((element) => {
    const config = element.dataset.i18nAttrs;
    if (!config) {
      return;
    }

    const pairs = config.split(',');

    pairs.forEach((pair) => {
      const [attr, key] = pair.split(':').map((part) => part.trim());
      if (!attr || !key) {
        return;
      }

      const translation = t(key);
      if (translation !== undefined) {
        element.setAttribute(attr, translation);
      }
    });
  });
}
