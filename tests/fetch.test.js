/* global describe, it, beforeEach */
import expect from "expect";

import Identity from "../src/identity";
import { create } from "../src/microstates";

import { TodoMVC } from "./todomvc";
import Promise from "bluebird";

export default class FetchAttr {
  constructor() {
    this.loading = Boolean;
    this.successCount = Number;
    this.lastStatus = String;
    this.errorMessage = String;
  }
  success() {
    return this.loading
      .set(false)
      .successCount.increment()
      .lastStatus.set("success");
  }
  failure() {
    return this.loading.set(false).lastStatus.set("failure");
  }
  start() {
    if (this.loading.state) {
      // throw `Tried to start but already loading`;
    }
    return this.loading.set(true);
  }

  reset() {
    return this.loading.set(false);
  }

  get isFetching() {
    return !!this.loading.state;
  }

  get isFetched() {
    return !this.isLoading && this.lastStatus.state === "success";
  }

  get runPromise() {
    return fetchPromise => {
      this.start();
      fetchPromise.then(() => this.success(), () => this.failure());
    };
  }
}

class TodoFetch extends TodoMVC {
  fetching = FetchAttr;

  get fetchPromise() {
    return Promise.delay(50).then(() => {
      this.todos.push({ name: "whatever" });
    });
  }

  get nestedFetchPromise() {
    return Promise.delay(50).then(() => {
      Promise.delay(25).then(() => {
        this.todos.push({ name: "whatever" });
      });
      this.todos.push({ name: "whatever" });
    });
  }

  get fetch() {
    return () => {
      return this.fetching.runPromise(this.fetchPromise);
    };
  }

  get nestedFetch() {
    return () => {
      return this.fetching.runPromise(this.nestedFetchPromise);
    };
  }

  get numTodos() {
    return this.todos.length;
  }
}

class MultiTodo {
  apps = [TodoFetch];

  get app1() {
    return [...this.apps][0];
  }

  get app2() {
    return [...this.apps][1];
  }
}

describe("fetchhhh", () => {
  let initial;
  let latest;
  let store;

  const Timing = {
    BeforeBoth: 15,
    Between: 60,
    AfterBoth: 100
  };

  describe("single app", () => {
    beforeEach(() => {
      latest = null;
      initial = create(TodoFetch, {
        todos: [{ name: "Things" }]
      });

      store = Identity(initial, newState => {
        latest = newState;
      });

      expect(initial.numTodos).toEqual(1);
      expect(store.numTodos).toEqual(1);
    });

    it("success", () => {
      store.fetch();
      setTimeout(() => store.fetch(), 25);

      expect(latest.numTodos).toEqual(1);
      expect(latest.fetching.isFetching).toEqual(true);
      return Promise.all([
        Promise.delay(Timing.BeforeBoth).then(() => {
          expect(latest.fetching.isFetching).toEqual(true);
          expect(latest.fetching.isFetched).toEqual(false);
        }),

        Promise.delay(Timing.Between).then(() => {
          expect(latest.fetching.isFetching).toEqual(false);
          expect(latest.fetching.isFetched).toEqual(true);
          expect(latest.numTodos).toEqual(2);
        }),

        Promise.delay(Timing.AfterBoth).then(() => {
          expect(latest.numTodos).toEqual(3);
        })
      ]);
    });

    it("success nested", () => {
      store.nestedFetch();

      expect(latest.numTodos).toEqual(1);
      expect(latest.fetching.isFetching).toEqual(true);
      return Promise.all([
        Promise.delay(Timing.BeforeBoth).then(() => {
          expect(latest.fetching.isFetching).toEqual(true);
          expect(latest.fetching.isFetched).toEqual(false);
        }),

        Promise.delay(Timing.Between).then(() => {
          expect(latest.fetching.isFetching).toEqual(false);
          expect(latest.fetching.isFetched).toEqual(true);
          expect(latest.numTodos).toEqual(2);
        }),

        Promise.delay(Timing.AfterBoth).then(() => {
          expect(latest.numTodos).toEqual(3);
        })
      ]);
    });
  });

  describe("multi app", () => {
    beforeEach(() => {
      latest = null;
      initial = create(MultiTodo, {
        apps: [{ todos: [{ name: "Things" }] }, { todos: [] }]
      });

      store = Identity(initial, newState => {
        latest = newState;
      });

      expect(store.app1.numTodos).toEqual(1);
      expect(store.app2.numTodos).toEqual(0);
    });

    it("success", () => {
      store.app1.fetch();
      setTimeout(() => store.app2.fetch(), 25);

      expect(latest.app1.numTodos).toEqual(1);
      expect(latest.app1.fetching.isFetching).toEqual(true);
      expect(latest.app2.fetching.isFetching).toEqual(false);
      return Promise.all([
        Promise.delay(Timing.BeforeBoth).then(() => {
          expect(latest.app1.fetching.isFetching).toEqual(true);
          expect(latest.app1.fetching.isFetched).toEqual(false);
          expect(latest.app2.fetching.isFetching).toEqual(false);
          expect(latest.app2.fetching.isFetched).toEqual(false);
        }),

        Promise.delay(35).then(() => {
          expect(latest.app1.fetching.isFetching).toEqual(true);
          expect(latest.app1.fetching.isFetched).toEqual(false);
          expect(latest.app2.fetching.isFetching).toEqual(true);
          expect(latest.app2.fetching.isFetched).toEqual(false);
        }),

        Promise.delay(Timing.Between).then(() => {
          expect(latest.app1.fetching.isFetching).toEqual(false);
          expect(latest.app1.fetching.isFetched).toEqual(true);
          expect(latest.app1.numTodos).toEqual(2);
          expect(latest.app2.fetching.isFetching).toEqual(true);
          expect(latest.app2.fetching.isFetched).toEqual(false);
          expect(latest.app2.numTodos).toEqual(0);
        }),

        Promise.delay(Timing.AfterBoth).then(() => {
          expect(latest.app1.fetching.isFetching).toEqual(false);
          expect(latest.app1.fetching.isFetched).toEqual(true);
          expect(latest.app1.numTodos).toEqual(2);
          expect(latest.app2.fetching.isFetching).toEqual(false);
          expect(latest.app2.fetching.isFetched).toEqual(true);
          expect(latest.app2.numTodos).toEqual(1);
        })
      ]);
    });
  });
});
