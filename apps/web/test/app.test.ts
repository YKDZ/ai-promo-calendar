import assert from "node:assert/strict";
import { test } from "node:test";

import { createPinia, setActivePinia } from "pinia";

import { useCounterStore } from "#/stores/counter";

void test("counter store increments the count", () => {
  setActivePinia(createPinia());
  const counter = useCounterStore();

  counter.increment();

  assert.equal(counter.count, 1);
});
