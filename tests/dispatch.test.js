/* global describe, it, beforeEach */
import expect from "expect";

import Identity from "../src/identity";
import { create } from "../src/microstates";

function Dispatch(T) {
  return class extends T {
    static get name() {
      return `Dispatch<${T.name}>`;
    }

    dispatches = create([String], []);

    dispatch(str) {
      return this.dispatches.push(str);
    }
  };
}

// This should reflect the tree and find the Dispatch nodes
// but I don't know how to do that. I believe it will be easy
// for one of you
Dispatch.findNodes = root => {
  return [...root.todos];
};

Dispatch.handlePayloads = (root, cb) => {
  Dispatch.findNodes(root).forEach(node => {
    let nodePayloads = [...node.dispatches].map(x => x.state);
    if (nodePayloads.length > 0) {
      nodePayloads.forEach(cb);
      node.dispatches.set([]);
    }
  });
};

export class Todo {
  title = String;
  completed = create(Boolean, false);

  toggle() {
    return this.completed.set(!this.completed.state);
  }

  editTitle(str) {
    return this.title.set(str).dispatch(str);
  }
}

export class TodoMVC {
  todos = [Dispatch(Todo)];
}

describe("dispatch", () => {
  let initial;
  let latest;
  let store;
  let payloads;

  beforeEach(() => {
    latest = null;
    payloads = [];
    initial = create(TodoMVC, {
      todos: [{ name: "Things" }]
    });

    store = Identity(initial, newState => {
      latest = newState;
      Dispatch.handlePayloads(latest, payload => payloads.push(payload));
    });
  });

  it("payload makes it to the top level", () => {
    [...store.todos][0].editTitle("more stuff");
    expect(payloads[0]).toEqual("more stuff");

    let todo = [...store.todos][0];
    expect([...todo.dispatches].length).toEqual(0);
  });
});
