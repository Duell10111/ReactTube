import assert from "node:assert/strict";
import test from "node:test";

import {
  ROTATION_SETTLE_MS,
  classifyDeviceOrientation,
  getRotationFullscreenAction,
  initialRotationState,
  updateRotation,
} from "../src/components/video/phone/phoneRotationModel.ts";

const G = 9.81;

test("gravity along the long side is portrait, either way up", () => {
  assert.equal(classifyDeviceOrientation(0, -G, 0), "portrait");
  // Android reports the opposite sign; upside down is portrait too.
  assert.equal(classifyDeviceOrientation(0, G, 0), "portrait");
});

test("gravity along the short side is landscape, either side", () => {
  assert.equal(classifyDeviceOrientation(G, 0, 0), "landscape");
  assert.equal(classifyDeviceOrientation(-G, 0, 0), "landscape");
});

test("a phone lying flat says nothing", () => {
  assert.equal(classifyDeviceOrientation(0.5, 0.5, -G), undefined);
  assert.equal(classifyDeviceOrientation(0, 0, 0), undefined);
});

test("the band between portrait and landscape is undecided", () => {
  const angle = (45 * Math.PI) / 180;
  assert.equal(
    classifyDeviceOrientation(Math.sin(angle) * G, Math.cos(angle) * G, 0),
    undefined,
  );
  const tilted = (20 * Math.PI) / 180;
  assert.equal(
    classifyDeviceOrientation(Math.sin(tilted) * G, Math.cos(tilted) * G, 0),
    "portrait",
  );
});

function feed(samples) {
  let state = initialRotationState;
  const changes = [];
  for (const [sample, at] of samples) {
    const result = updateRotation(state, sample, at);
    state = result.state;
    if (result.changed) {
      changes.push(result.changed);
    }
  }
  return changes;
}

test("an orientation counts once it held for the settle time", () => {
  assert.deepEqual(
    feed([
      ["portrait", 0],
      ["portrait", ROTATION_SETTLE_MS],
      ["landscape", 1000],
      ["landscape", 1000 + ROTATION_SETTLE_MS - 1],
      ["landscape", 1000 + ROTATION_SETTLE_MS],
      ["landscape", 2000],
    ]),
    [
      {from: undefined, to: "portrait"},
      {from: "portrait", to: "landscape"},
    ],
  );
});

test("a short swing through landscape is ignored", () => {
  assert.deepEqual(
    feed([
      ["portrait", 0],
      ["portrait", ROTATION_SETTLE_MS],
      ["landscape", 1000],
      ["portrait", 1100],
      ["landscape", 1200],
      ["landscape", 1300],
    ]),
    [{from: undefined, to: "portrait"}],
  );
});

test("flat samples keep a pending turn pending", () => {
  assert.deepEqual(
    feed([
      ["portrait", 0],
      ["portrait", ROTATION_SETTLE_MS],
      ["landscape", 1000],
      [undefined, 1200],
      ["landscape", 1000 + ROTATION_SETTLE_MS],
    ]).at(-1),
    {from: "portrait", to: "landscape"},
  );
});

test("turning to landscape opens full screen, turning back closes it", () => {
  assert.equal(
    getRotationFullscreenAction({from: "portrait", to: "landscape"}, false),
    "enter",
  );
  assert.equal(
    getRotationFullscreenAction({from: "landscape", to: "portrait"}, true),
    "exit",
  );
});

test("a turn that matches the current state does nothing", () => {
  // Full screen opened with the button, then the phone turned to match it.
  assert.equal(
    getRotationFullscreenAction({from: "portrait", to: "landscape"}, true),
    undefined,
  );
  assert.equal(
    getRotationFullscreenAction({from: "landscape", to: "portrait"}, false),
    undefined,
  );
});

test("the first reading after opening the video is no turn", () => {
  assert.equal(
    getRotationFullscreenAction({from: undefined, to: "landscape"}, false),
    undefined,
  );
});
