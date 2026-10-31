'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
function filesUnder(directory) {
  const absolute = path.join(root, directory);
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const relative = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(relative) : relative.endsWith('.js') ? [relative] : [];
  });
}
function sourceOf(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }

test('domain modules do not depend on application, ports or adapters', () => {
  for (const file of filesUnder('src/domain')) {
    const source = sourceOf(file);
    assert.doesNotMatch(source, /require\(['"][^'"]*(?:application|ports|adapters)\//, file);
    assert.doesNotMatch(source, /\b(?:document|window|localStorage|fetch)\b/, file);
  }
});

test('application modules do not depend on concrete adapters or browser APIs', () => {
  for (const file of filesUnder('src/application')) {
    const source = sourceOf(file);
    assert.doesNotMatch(source, /require\(['"][^'"]*adapters\//, file);
    assert.doesNotMatch(source, /\b(?:document|window|localStorage)\b/, file);
  }
});

test('ports do not depend on concrete adapters or browser APIs', () => {
  for (const file of filesUnder('src/ports')) {
    const source = sourceOf(file);
    assert.doesNotMatch(source, /require\(['"][^'"]*adapters\//, file);
    assert.doesNotMatch(source, /\b(?:document|window|localStorage|fetch)\b/, file);
  }
});

test('every local script referenced by index.html exists', () => {
  const html = sourceOf('index.html');
  const scripts = [...html.matchAll(/<script\s+src=["']([^"']+)["']/g)].map(match => match[1].split('?')[0]);
  for (const script of scripts) {
    if (/^(?:https?:)?\/\//.test(script)) continue;
    assert.equal(fs.existsSync(path.join(root, script)), true, 'missing script: ' + script);
  }
});

test('screen adapters and technical indicators load before the app bootstrap', () => {
  const html = sourceOf('index.html');
  const scripts = [...html.matchAll(/<script\s+src=["']([^"']+)["']/g)].map(match => match[1].split('?')[0]);
  const position = name => scripts.indexOf(name);
  assert.ok(position('technical-indicators.js') >= 0);
  assert.ok(position('src/adapters/ui/dom/opportunities-screen.js') > position('technical-indicators.js'));
  assert.ok(position('src/adapters/ui/dom/event-handlers.js') < position('app.js'));
  assert.equal(scripts[scripts.length - 1], 'app.js');
});
