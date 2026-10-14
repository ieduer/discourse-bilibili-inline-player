// A deliberately small DOM for exercising the document-preview layer in
// node:test. It implements only what that layer and its tests touch: a tree,
// attributes, dataset, classList, events, focus, and a selector matcher for
// tag, #id, .class, [attr], [attr="value"], :not(...), descendant ("a b"),
// and child ("a > b") combinators.

function camelToData(name) {
  return `data-${name.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)}`;
}

function parseCompound(text) {
  const compound = { tag: null, id: null, classes: [], attributes: [], nots: [] };
  let rest = text.trim();

  const take = (re) => {
    const match = rest.match(re);

    if (match) {
      rest = rest.slice(match[0].length);
    }

    return match;
  };

  let match = take(/^[a-zA-Z][a-zA-Z0-9-]*/u);

  if (match) {
    compound.tag = match[0].toLowerCase();
  }

  while (rest) {
    if ((match = take(/^#([\w-]+)/u))) {
      compound.id = match[1];
    } else if ((match = take(/^\.([\w-]+)/u))) {
      compound.classes.push(match[1]);
    } else if ((match = take(/^\[([\w-]+)(?:="([^"]*)")?\]/u))) {
      compound.attributes.push({ name: match[1], value: match[2] });
    } else if ((match = take(/^:not\(([^)]*)\)/u))) {
      compound.nots.push(parseCompound(match[1]));
    } else if ((match = take(/^:only-child/u))) {
      compound.onlyChild = true;
    } else {
      throw new Error(`Unsupported selector part: ${rest}`);
    }
  }

  return compound;
}

function matchesCompound(element, compound) {
  if (compound.tag && element.localName !== compound.tag) {
    return false;
  }

  if (compound.id && element.id !== compound.id) {
    return false;
  }

  if (!compound.classes.every((name) => element.classList.contains(name))) {
    return false;
  }

  for (const attribute of compound.attributes) {
    const value = element.getAttribute(attribute.name);

    if (value === null || (attribute.value !== undefined && value !== attribute.value)) {
      return false;
    }
  }

  if (compound.onlyChild && element.parentNode?.children.length !== 1) {
    return false;
  }

  return !compound.nots.some((not) => matchesCompound(element, not));
}

function parseSelector(selector) {
  return selector.split(",").map((part) => {
    const tokens = part.trim().split(/\s*(>)\s*|\s+/u).filter(Boolean);
    const steps = [];
    let combinator = " ";

    for (const token of tokens) {
      if (token === ">") {
        combinator = ">";
        continue;
      }

      steps.push({ combinator, compound: parseCompound(token) });
      combinator = " ";
    }

    return steps;
  });
}

function matchesSteps(element, steps, index = steps.length - 1) {
  if (!matchesCompound(element, steps[index].compound)) {
    return false;
  }

  if (index === 0) {
    return true;
  }

  const { combinator } = steps[index];

  if (combinator === ">") {
    return Boolean(element.parentNode?.nodeType === 1 && matchesSteps(element.parentNode, steps, index - 1));
  }

  for (let ancestor = element.parentNode; ancestor?.nodeType === 1; ancestor = ancestor.parentNode) {
    if (matchesSteps(ancestor, steps, index - 1)) {
      return true;
    }
  }

  return false;
}

class FakeNode {
  constructor(ownerDocument) {
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.childNodes = [];
  }

  get nextSibling() {
    const siblings = this.parentNode?.childNodes || [];
    return siblings[siblings.indexOf(this) + 1] || null;
  }

  get previousSibling() {
    const siblings = this.parentNode?.childNodes || [];
    return siblings[siblings.indexOf(this) - 1] || null;
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  get lastChild() {
    return this.childNodes.at(-1) || null;
  }

  get isConnected() {
    let node = this;

    while (node.parentNode) {
      node = node.parentNode;
    }

    return node === this.ownerDocument;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.childNodes.splice(this.parentNode.childNodes.indexOf(this), 1);
      this.parentNode = null;
    }
  }

  appendChild(child) {
    if (child.nodeType === 11) {
      for (const node of [...child.childNodes]) {
        this.appendChild(node);
      }

      return child;
    }

    child.remove();
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  append(...children) {
    for (const child of children) {
      this.appendChild(typeof child === "string" ? this.ownerDocument.createTextNode(child) : child);
    }
  }

  prepend(...children) {
    for (const child of [...children].reverse()) {
      this.insertBefore(typeof child === "string" ? this.ownerDocument.createTextNode(child) : child, this.childNodes[0]);
    }
  }

  insertBefore(child, reference) {
    if (!reference) {
      return this.appendChild(child);
    }

    child.remove();
    child.parentNode = this;
    this.childNodes.splice(this.childNodes.indexOf(reference), 0, child);
    return child;
  }

  replaceChildren(...children) {
    for (const child of [...this.childNodes]) {
      child.remove();
    }

    this.append(...children);
  }

  get textContent() {
    return this.childNodes.map((child) => child.textContent).join("");
  }

  set textContent(value) {
    this.replaceChildren();

    if (value !== "" && value !== null && value !== undefined) {
      this.appendChild(this.ownerDocument.createTextNode(String(value)));
    }
  }
}

class FakeText extends FakeNode {
  constructor(ownerDocument, text) {
    super(ownerDocument);
    this.nodeType = 3;
    this.nodeValue = text;
  }

  get textContent() {
    return this.nodeValue;
  }

  set textContent(value) {
    this.nodeValue = String(value);
  }
}

class FakeElement extends FakeNode {
  constructor(ownerDocument, tagName) {
    super(ownerDocument);
    this.nodeType = 1;
    this.localName = tagName.toLowerCase();
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.listeners = new Map();
    this.style = {
      properties: {},
      setProperty(name, value) {
        this.properties[name] = value;
      },
    };
    const element = this;
    this.dataset = new Proxy(
      {},
      {
        get: (target, name) => (typeof name === "string" ? element.getAttribute(camelToData(name)) ?? undefined : undefined),
        set: (target, name, value) => {
          element.setAttribute(camelToData(name), String(value));
          return true;
        },
        deleteProperty: (target, name) => {
          element.removeAttribute(camelToData(name));
          return true;
        },
        has: (target, name) => element.getAttribute(camelToData(name)) !== null,
      }
    );
    this.classList = {
      contains: (name) => element.className.split(/\s+/u).includes(name),
      add: (...names) => {
        const set = new Set(element.className.split(/\s+/u).filter(Boolean));
        names.forEach((name) => set.add(name));
        element.className = [...set].join(" ");
      },
      remove: (...names) => {
        element.className = element.className
          .split(/\s+/u)
          .filter((name) => name && !names.includes(name))
          .join(" ");
      },
      toggle: (name, force) => {
        const present = element.classList.contains(name);
        const next = force === undefined ? !present : Boolean(force);
        next ? element.classList.add(name) : element.classList.remove(name);
        return next;
      },
    };
  }

  get children() {
    return this.childNodes.filter((child) => child.nodeType === 1);
  }

  get nextElementSibling() {
    let node = this.nextSibling;

    while (node && node.nodeType !== 1) {
      node = node.nextSibling;
    }

    return node;
  }

  get className() {
    return this.getAttribute("class") || "";
  }

  set className(value) {
    this.setAttribute("class", value);
  }

  get id() {
    return this.getAttribute("id") || "";
  }

  set id(value) {
    this.setAttribute("id", value);
  }

  get hidden() {
    return this.attributes.has("hidden");
  }

  set hidden(value) {
    value ? this.setAttribute("hidden", "") : this.removeAttribute("hidden");
  }

  get href() {
    const value = this.getAttribute("href");
    return value === null ? "" : new URL(value, this.ownerDocument.baseURI).href;
  }

  set href(value) {
    this.setAttribute("href", value);
  }

  get src() {
    return this.getAttribute("src") || "";
  }

  set src(value) {
    this.setAttribute("src", value);
  }

  get offsetParent() {
    return this.hidden ? null : this.parentNode;
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  matches(selector) {
    return parseSelector(selector).some((steps) => matchesSteps(this, steps));
  }

  closest(selector) {
    const parsed = parseSelector(selector);

    for (let node = this; node?.nodeType === 1; node = node.parentNode) {
      if (parsed.some((steps) => matchesSteps(node, steps))) {
        return node;
      }
    }

    return null;
  }

  querySelectorAll(selector) {
    const parsed = parseSelector(selector);
    const found = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (parsed.some((steps) => matchesSteps(child, steps))) {
          found.push(child);
        }

        walk(child);
      }
    };
    walk(this);
    return found;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  insertAdjacentElement(position, element) {
    if (position !== "afterend") {
      throw new Error(`Unsupported position ${position}`);
    }

    this.parentNode.insertBefore(element, this.nextSibling);
    return element;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }

    this.listeners.get(type).push(listener);
  }

  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((entry) => entry !== listener));
  }

  dispatchEvent(event) {
    event.target ||= this;
    event.preventDefault ||= () => {
      event.defaultPrevented = true;
    };

    for (let node = this; node; node = node.parentNode) {
      for (const listener of node.listeners?.get(event.type) || []) {
        listener.call(node, event);
      }
    }

    return !event.defaultPrevented;
  }

  click() {
    if (!this.disabled) {
      this.dispatchEvent({ type: "click" });
    }
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }
}

export class FakeDocument extends FakeNode {
  constructor(baseURI = "https://forum.example/t/topic/1") {
    super(null);
    this.ownerDocument = this;
    this.nodeType = 9;
    this.baseURI = baseURI;
    this.documentElement = this.createElement("html");
    this.appendChild(this.documentElement);
    this.head = this.createElement("head");
    this.documentElement.appendChild(this.head);
    this.body = this.createElement("body");
    this.documentElement.appendChild(this.body);
    this.activeElement = this.body;
  }

  createElement(tagName) {
    return new FakeElement(this, tagName);
  }

  createTextNode(text) {
    return new FakeText(this, text);
  }

  createDocumentFragment() {
    const fragment = new FakeNode(this);
    fragment.nodeType = 11;
    return fragment;
  }

  getElementById(id) {
    return this.documentElement.querySelector(`#${id}`);
  }

  querySelector(selector) {
    return this.documentElement.matches(selector) ? this.documentElement : this.documentElement.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this.documentElement.querySelectorAll(selector);
  }
}

/** Builds elements from a tiny literal: ["p", {class: "x"}, "text", ["a", {...}, "label"]]. */
export function build(doc, spec) {
  if (typeof spec === "string") {
    return doc.createTextNode(spec);
  }

  const [tag, attributes = {}, ...children] = spec;
  const element = doc.createElement(tag);

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }

  for (const child of children) {
    element.appendChild(build(doc, child));
  }

  return element;
}
