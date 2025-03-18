import { test } from "node:test";
import assert from "node:assert";
import Dispatcher from "./index.js";

test("default behavior", async (t) => {
  const a = t.mock.fn();
  const b = t.mock.fn();

  const c = t.mock.fn(() => {
    return "success";
  });

  const d = t.mock.fn();

  const error = t.mock.fn(() => "error");

  const dispatcher = new Dispatcher<
    [string | null],
    [string],
    [string, string],
    string
  >();

  dispatcher.on(null).do(a);

  dispatcher.on("/").do(b, c);

  dispatcher.on(null).do(d);

  dispatcher.catch(error);

  const handler = dispatcher.find("/");

  const result = await handler("1", "2");
  assert.equal(result, "success");
  assert.equal(a.mock.callCount(), 1);
  assert.deepStrictEqual(a.mock.calls[0].arguments, ["1", "2"]);
  assert.equal(b.mock.callCount(), 1);
  assert.deepStrictEqual(b.mock.calls[0].arguments, ["1", "2"]);
  assert.equal(c.mock.callCount(), 1);
  assert.deepStrictEqual(c.mock.calls[0].arguments, ["1", "2"]);
  assert.equal(d.mock.callCount(), 0);
  assert.equal(error.mock.callCount(), 0);
});

test("default behavior", async (t) => {
  const a = t.mock.fn();
  const b = t.mock.fn(() => Promise.reject("error msg"));

  const c = t.mock.fn();

  const d = t.mock.fn();

  const error = t.mock.fn(() => "error");

  const dispatcher = new Dispatcher<
    [string | null],
    [string],
    [string, string],
    string
  >();

  dispatcher.on(null).do(a);

  dispatcher.on("/").do(b, c);

  dispatcher.on(null).do(d);

  dispatcher.catch(error);

  const handler = dispatcher.find("/");

  const result = await handler("1", "2");
  assert.equal(result, "error");
  assert.equal(a.mock.callCount(), 1);
  assert.deepStrictEqual(a.mock.calls[0].arguments, ["1", "2"]);
  assert.equal(b.mock.callCount(), 1);
  assert.deepStrictEqual(b.mock.calls[0].arguments, ["1", "2"]);
  assert.equal(c.mock.callCount(), 0);
  assert.equal(d.mock.callCount(), 0);
  assert.equal(error.mock.callCount(), 1);
  assert.deepStrictEqual(error.mock.calls[0].arguments, [
    "error msg",
    "1",
    "2",
  ]);
});
