# dom-max-size [![NPM Version][npm-image]][npm-url] ![File Size][filesize-image] [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependency Monitor][greenkeeper-image]][greenkeeper-url]

> Determine the maximum scalable dimensions of an `HTMLElement`.

This library works by prepending a [largely sized child element](#sizing-fixture) to the target element and forcing a [re-layout](https://developers.google.com/web/fundamentals/performance/critical-rendering-path/render-tree-construction). As such, [void elements](https://www.w3.org/TR/html5/syntax.html#void-elements) are not supported because they can never contain that child. Also, elements with a `shadowRoot` are not automatically supported because the light tree is not rendered, however there is a work-around (see below).

For the sake of performance, be conservative when using this library.


## Installation

[Node.js](http://nodejs.org) `>= 10` is required. To install, type this at the command line:
```shell
npm install dom-max-size
```


## Importing

ES Module:
```js
import {getMaxHeight, getMaxSize, getMaxWidth} from 'dom-max-size';
```

CommonJS Module:
```js
const {getMaxHeight, getMaxSize, getMaxWidth} = require('dom-max-size');
```


## Usage

Get the maximum that the web browser can possibly allow for any element:
```js
getMaxHeight(); //-> 33554428, in Chrome 75.x
getMaxWidth(); //-> 33554428, in Chrome 75.x
getMaxSize(); //-> {height:33554428, width:33554428} in Chrome 75.x
```

Get the maximum that an element can scale to within the limitations of itself and its parents:
```html
<div style="display:flex; max-height:500px; max-width:250px">
  <div id="target" style="width:50%">…</div>
</div>
```
```js
const target = document.getElementById('target');
getMaxHeight(target); //-> 500
getMaxWidth(target); //-> 125
```

When working with an element that is resized by its descendants, you'll need to provide a reference to all of them:
```html
<div style="display:flex; max-height:500px">
  <div id="target">
    <div id="sizerA">…</div>
    <div id="sizerB">…</div>
  </div>
</div>
```
```js
const target = document.getElementById('target');
const sizerA = document.getElementById('sizerA');
const sizerB = document.getElementById('sizerB');
getMaxHeight(target, sizerA, sizerB); //-> 500
```

The above example also applies when working with a `shadowRoot`:
```js
const target = document.getElementById('target');
const sizer = target.shadowRoot.querySelector('#sizer');
getMaxHeight(target, sizer); //-> number
```


## Sizing Fixture

If the temporary sizing element is not behaving as expected, resulting in incorrectly returned values, it is possible that it's caused by a CSS complication. While you should probably [create an issue](https://github.com/stevenvachon/dom-max-size/issues/new), you can—at least temporarily—add any necessary styles via:
```css
target-element > [data-sizing-fixture] {
  /* … */
}
```


## Compatibility

Depending on your target browsers, you may need polyfills/shims for the following:

* [`HTMLElement::dataset`](https://mdn.io/HTMLElement/dataset)
* [`Map`](https://mdn.io/Global_Objects/Map)
* [`Node::children`](https://mdn.io/Node/children)
* [`Node::prepend`](https://mdn.io/Node/prepend), [`Node::remove`](https://mdn.io/Node/remove)
* [`Object.assign`](https://mdn.io/Object/assign)
* [`Object.entries`](https://mdn.io/Object/entries)


[npm-image]: https://img.shields.io/npm/v/dom-max-size.svg
[npm-url]: https://npmjs.com/package/dom-max-size
[filesize-image]: https://img.shields.io/badge/size-1.5kB%20gzipped-blue.svg
[travis-image]: https://img.shields.io/travis/stevenvachon/dom-max-size.svg
[travis-url]: https://travis-ci.org/stevenvachon/dom-max-size
[coveralls-image]: https://img.shields.io/coveralls/stevenvachon/dom-max-size.svg
[coveralls-url]: https://coveralls.io/github/stevenvachon/dom-max-size
[greenkeeper-image]: https://badges.greenkeeper.io/stevenvachon/dom-max-size.svg
[greenkeeper-url]: https://greenkeeper.io/
