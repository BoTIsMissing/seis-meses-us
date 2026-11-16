const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '..');
class Element {
  constructor() {
    this.children = []; this.events = {}; this.attributes = {};
    this.classes = new Set();
    this.classList = {
      add: name => this.classes.add(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)
    };
  }
  get firstElementChild() { return this.children[0]; }
  addEventListener(name, fn) { this.events[name] = fn; }
  setAttribute(name, value) { this.attributes[name] = value; }
  appendChild(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
  focus() {}
  click() { if (!this.disabled) this.events.click?.(); }
}
function setup() {
  const elements = new Map();
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const [, id] of html.matchAll(/id="([^"]+)"/g)) elements.set(id, new Element());
  const timers = new Map(); let timerId = 0;
  const context = {
    window: {}, document: {
      getElementById(id) { assert(elements.has(id), `Missing HTML element: ${id}`); return elements.get(id); },
      createElement() { return new Element(); }
    },
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'personalizar.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'jogos.js'), 'utf8'), context);
  return { get: id => elements.get(id), timers, settings: context.window.PRESENTE };
}
const { get, timers, settings } = setup();
get('match-start').click();
let cards = get('match-board').children;
assert.equal(cards.length, 12);
const first = cards[0];
const different = cards.find(card => card.firstElementChild.src !== first.firstElementChild.src);
first.click(); first.click(); // A repeated click must not count as a pair.
assert.match(get('match-stats').textContent, /0 jogadas/);
different.click();
assert.match(get('match-stats').textContent, /1 jogada$/);
assert.equal(timers.size, 1);
const third = cards.find(card => card !== first && card !== different);
third.click();
assert(!third.classes.has('is-open'), 'Board must lock during a mismatch');
get('match-start').click();
assert.equal(timers.size, 0, 'Restart must cancel an old flip timer');
assert.match(get('match-stats').textContent, /0 jogadas/);
cards = get('match-board').children;
// Finish the game by matching the actual displayed image sources.
const pairs = new Map();
for (const card of cards) {
  const source = card.firstElementChild.src;
  assert(fs.existsSync(path.join(root, source)));
  if (!pairs.has(source)) pairs.set(source, []);
  pairs.get(source).push(card);
}
assert.equal(pairs.size, 6);
for (const pair of pairs.values()) {
  assert.equal(pair.length, 2);
  pair[0].click(); pair[1].click();
  assert(pair.every(card => card.disabled && card.classes.has('is-matched')));
}
assert.equal(get('match-stats').textContent, '6 de 6 pares · 6 jogadas');
assert.match(get('match-feedback').textContent, /todos os pares/);
// Play with one wrong answer, then check scoring, completion and retry.
settings.quiz.forEach((question, index) => {
  const buttons = get('quiz-options').children;
  const answer = index === 0 ? (question.resposta + 1) % question.opcoes.length : question.resposta;
  buttons[answer].click();
  buttons[question.resposta].events.click(); // Even a repeated event cannot score twice.
  assert(buttons.every(button => button.disabled));
  assert(buttons[question.resposta].classes.has('is-correct'));
  assert.equal(get('quiz-progress').value, index + 1);
  get('quiz-next').click();
});
assert(get('quiz-question').textContent.startsWith(`${settings.quiz.length - 1} de ${settings.quiz.length}.`));
assert.equal(get('quiz-restart').hidden, false);
get('quiz-restart').click();
assert.equal(get('quiz-progress').value, 0);
assert.equal(get('quiz-score').textContent, '0 acertos');
settings.quiz.forEach(question => { get('quiz-options').children[question.resposta].click(); get('quiz-next').click(); });
assert(get('quiz-question').textContent.startsWith(`${settings.quiz.length} de ${settings.quiz.length}.`));
assert.match(get('quiz-feedback').textContent, /lembrou de tudo/);
console.log('PASS: memory pairs, double clicks, mismatch lock, timer cancellation, win; quiz wrong/correct answers, duplicate scoring, progress, result and restart.');
