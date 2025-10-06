# BPMN Modeler & Viewer

This project delivers a BPMN.io powered modeler and viewer packaged in a Docker image. The modeler mirrors the [bpmn.io demo](https://demo.bpmn.io/new) experience, provides a property sidebar, and integrates with a persistent storage volume that supports nested folder structures.

## Features

- **Full BPMN modeling experience** with the BPMN.io modeler and properties panel.
- **Tree-based storage browser** to load and save diagrams from a mounted Docker volume.
- **Viewer-only page** that renders diagrams without additional UI, ideal for embedding.
- **REST API** for listing, reading, and writing BPMN diagrams inside the workspace volume.

## Getting Started

### Local development

```bash
npm install
npm run build
npm start
```

The server listens on [http://localhost:3000](http://localhost:3000) by default and uses the `./data` directory for storage if `DATA_DIR` is not set.

### Docker image

Build the container image:

```bash
docker build -t bpmn-js-extended .
```

Run the container with a mounted volume for persistent BPMN diagrams:

```bash
docker run -it --rm -p 3000:3000 -v $(pwd)/data:/data bpmn-js-extended
```

- Visit `http://localhost:3000/` for the modeler.
- Visit `http://localhost:3000/viewer?path=diagrams/example.bpmn` for the viewer (adjust the `path` parameter to the stored file).

### API endpoints

- `GET /api/storage/tree?path=<relative-folder>` – list files and folders recursively.
- `GET /api/storage/file?path=<file>` – fetch a BPMN diagram.
- `POST /api/storage/file` – save a BPMN diagram (`{ path, contents }`).
- `POST /api/storage/directory` – create a folder (`{ path }`).

## Volume layout

All read and write operations are scoped to the `DATA_DIR` (defaults to `/data`). Nested folders are supported, making it easy to organise diagrams, e.g. `diagrams/order/process.bpmn`.

## License

This project is provided under the MIT License.
