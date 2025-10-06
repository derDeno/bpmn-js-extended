import { overrideAppTitles } from '../i18n/index.js';

const DEFAULT_CONFIG = {
  titles: {
    modeler: 'BPMN Modeler',
    viewer: 'BPMN Viewer'
  },
  favicon: '/assets/favicon.svg',
  headerLogo: null,
  colors: {
    light: {},
    dark: {}
  }
};

let resolvedConfig = cloneConfig(DEFAULT_CONFIG);
let configPromise;

function cloneConfig(config) {
  return {
    titles: { ...config.titles },
    favicon: config.favicon,
    headerLogo: config.headerLogo ? { ...config.headerLogo } : null,
    colors: {
      light: { ...config.colors.light },
      dark: { ...config.colors.dark }
    }
  };
}

function sanitizeTitles(titles = {}) {
  const sanitized = {};

  if (typeof titles.modeler === 'string' && titles.modeler.trim()) {
    sanitized.modeler = titles.modeler.trim();
  }

  if (typeof titles.viewer === 'string' && titles.viewer.trim()) {
    sanitized.viewer = titles.viewer.trim();
  }

  return sanitized;
}

function sanitizeLogo(logo) {
  if (!logo || typeof logo !== 'object') {
    return null;
  }

  const { src, alt, href, height, width, newTab } = logo;

  if (typeof src !== 'string' || !src.trim()) {
    return null;
  }

  const sanitized = {
    src: src.trim()
  };

  if (typeof alt === 'string') {
    sanitized.alt = alt;
  }

  if (typeof href === 'string' && href.trim()) {
    sanitized.href = href.trim();
  }

  if (typeof height === 'string' && height.trim()) {
    sanitized.height = height.trim();
  }

  if (typeof width === 'string' && width.trim()) {
    sanitized.width = width.trim();
  }

  if (typeof newTab === 'boolean') {
    sanitized.newTab = newTab;
  }

  return sanitized;
}

function sanitizeColorMap(map) {
  if (!map || typeof map !== 'object') {
    return {};
  }

  return Object.entries(map).reduce((accumulator, [key, value]) => {
    if (typeof key === 'string' && key.startsWith('--') && typeof value === 'string') {
      accumulator[key.trim()] = value.trim();
    }

    return accumulator;
  }, {});
}

function mergeConfig(baseConfig, overrides) {
  const merged = cloneConfig(baseConfig);

  if (!overrides || typeof overrides !== 'object') {
    return merged;
  }

  if (overrides.titles) {
    merged.titles = {
      ...merged.titles,
      ...sanitizeTitles(overrides.titles)
    };
  }

  if (typeof overrides.favicon === 'string' && overrides.favicon.trim()) {
    merged.favicon = overrides.favicon.trim();
  }

  if (Object.prototype.hasOwnProperty.call(overrides, 'headerLogo')) {
    if (overrides.headerLogo === null) {
      merged.headerLogo = null;
    } else {
      const sanitizedLogo = sanitizeLogo(overrides.headerLogo);
      merged.headerLogo = sanitizedLogo;
    }
  }

  if (overrides.colors) {
    merged.colors = {
      light: {
        ...merged.colors.light,
        ...sanitizeColorMap(overrides.colors.light)
      },
      dark: {
        ...merged.colors.dark,
        ...sanitizeColorMap(overrides.colors.dark)
      }
    };
  }

  return merged;
}

function toCssVariables(variables = {}) {
  return Object.entries(variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
}

function applyColorOverrides(colors = {}) {
  const rules = [];
  const lightVariables = toCssVariables(colors.light);
  const darkVariables = toCssVariables(colors.dark);

  if (lightVariables) {
    rules.push(`:root {\n${lightVariables}\n}`);
  }

  if (darkVariables) {
    rules.push(`:root[data-theme='dark'] {\n${darkVariables}\n}`);
  }

  const existingStyle = document.getElementById('ui-config-colors');

  if (!rules.length) {
    if (existingStyle) {
      existingStyle.remove();
    }

    return;
  }

  if (existingStyle) {
    existingStyle.textContent = rules.join('\n');
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = 'ui-config-colors';
  styleElement.textContent = rules.join('\n');
  document.head.appendChild(styleElement);
}

function applyFavicon(favicon) {
  if (typeof favicon !== 'string' || !favicon.trim()) {
    return;
  }

  const href = favicon.trim();
  const relations = ['icon', 'shortcut icon'];

  relations.forEach((rel) => {
    let link = document.querySelector(`link[rel="${rel}"]`);

    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }

    link.href = href;
  });
}

async function fetchConfigOverrides() {
  try {
    const response = await fetch('/ui-config.json', { cache: 'no-store' });

    if (!response.ok) {
      if (response.status === 404) {
        return {};
      }

      throw new Error(`Unexpected status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || typeof data !== 'object') {
      return {};
    }

    return data;
  } catch (error) {
    console.warn('Unable to load UI configuration. Falling back to defaults.', error);
    return {};
  }
}

async function resolveConfig() {
  const overrides = await fetchConfigOverrides();
  const merged = mergeConfig(DEFAULT_CONFIG, overrides);

  applyColorOverrides(merged.colors);
  applyFavicon(merged.favicon);
  overrideAppTitles({
    modeler: merged.titles.modeler,
    viewer: merged.titles.viewer
  });

  resolvedConfig = merged;
  return resolvedConfig;
}

export async function ensureUiConfig() {
  if (!configPromise) {
    configPromise = resolveConfig();
  }

  return configPromise;
}

export function getUiConfig() {
  return resolvedConfig;
}

export function renderHeaderLogo(container) {
  if (!container) {
    return;
  }

  container.innerHTML = '';
  container.hidden = true;

  const { headerLogo } = resolvedConfig;

  if (!headerLogo) {
    return;
  }

  const image = document.createElement('img');
  image.src = headerLogo.src;
  image.classList.add('app-logo-image');

  if (typeof headerLogo.alt === 'string' && headerLogo.alt.trim()) {
    image.alt = headerLogo.alt;
  } else {
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
  }

  if (typeof headerLogo.height === 'string' && headerLogo.height.trim()) {
    image.style.height = headerLogo.height.trim();
  }

  if (typeof headerLogo.width === 'string' && headerLogo.width.trim()) {
    image.style.width = headerLogo.width.trim();
  }

  let elementToInsert = image;

  if (typeof headerLogo.href === 'string' && headerLogo.href.trim()) {
    const link = document.createElement('a');
    link.href = headerLogo.href.trim();
    link.classList.add('app-logo-link');

    if (headerLogo.newTab) {
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
    }

    link.appendChild(image);
    elementToInsert = link;
  }

  container.appendChild(elementToInsert);
  container.hidden = false;
}
