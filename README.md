# bpmn-js - BPMN 2.0 for the web

[![Build Status](https://github.com/bpmn-io/bpmn-js/workflows/CI/badge.svg)](https://github.com/bpmn-io/bpmn-js/actions?query=workflow%3ACI)

View and edit BPMN 2.0 diagrams in the browser.

[![bpmn-js screencast](./resources/screencast.gif "bpmn-js in action")](http://demo.bpmn.io/s/start)

## Installation

Use the library [pre-packaged](https://github.com/bpmn-io/bpmn-js-examples/tree/main/pre-packaged)
or include it [via npm](https://github.com/bpmn-io/bpmn-js-examples/tree/main/bundling)
into your node-style web-application.

## Usage

To get started, create a [bpmn-js](https://github.com/bpmn-io/bpmn-js) instance
and render [BPMN 2.0 diagrams](https://www.omg.org/spec/BPMN/2.0.2/) in the browser:

```javascript
const xml = '...'; // my BPMN 2.0 xml
const viewer = new BpmnJS({
  container: 'body'
});

try {
  const { warnings } = await viewer.importXML(xml);

  console.log('rendered');
} catch (err) {
  console.log('error rendering', err);
}
```

Checkout our [examples](https://github.com/bpmn-io/bpmn-js-examples) for many
more supported usage scenarios.

### Dynamic Attach/Detach

You may attach or detach the viewer dynamically to any element on the page, too:

```javascript
const viewer = new BpmnJS();

// attach it to some element
viewer.attachTo('#container');

// detach the panel
viewer.detach();
```

## Resources

* [Demo](http://demo.bpmn.io)
* [Issues](https://github.com/bpmn-io/bpmn-js/issues)
* [Examples](https://github.com/bpmn-io/bpmn-js-examples)
* [Forum](https://forum.bpmn.io)
* [Changelog](./CHANGELOG.md)

## Build and Run

Prepare the project by installing all dependencies:

```sh
npm install
```

### Dockerized modeler

This repository ships with a lightweight web application that wraps the default `bpmn-js` modeler with persistence and sharing capabilities. You can run it locally via Docker:

```sh
docker build -t bpmn-js-extended .
docker run --rm -it -p 3000:3000 -v "$(pwd)/diagrams:/data" bpmn-js-extended
```

The container exposes port `3000` and stores BPMN diagrams inside `/data`, which can be mounted to a host directory or Docker volume. When the server starts it populates the storage directory with a sample diagram if it is empty.

Within the UI you can create, load, and save diagrams. Organize them inside folders by including `/` in the diagram name (e.g. `team-a/example-process`)—the sidebar shows a collapsible tree for easy navigation. Use the **Share** button to copy an embeddable URL (e.g. `http://localhost:3000/embed/team-a/example-process`) that renders the diagram in a minimal viewer without the editor chrome—perfect for embedding in dashboards or documentation.

Then, depending on your use-case you may run any of the following commands:

```sh
# build the library and run all tests
npm run all

# spin up a single local modeler instance
npm start

# run the full development setup
npm run dev
```

You may need to perform [additional project setup](./docs/project/SETUP.md) when
building the latest development snapshot.

## Related

bpmn-js builds on top of a few powerful tools:

* [bpmn-moddle](https://github.com/bpmn-io/bpmn-moddle): Read / write support for BPMN 2.0 XML in the browsers
* [diagram-js](https://github.com/bpmn-io/diagram-js): Diagram rendering and editing toolkit

It is an extensible toolkit, complemented by many [additional utilities](https://github.com/bpmn-io/awesome-bpmn-io). 

## License

Use under the terms of the [bpmn.io license](http://bpmn.io/license).
