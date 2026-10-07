const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../regole/avanzamento.js'), 'utf8'), context);
const A = context.GLCAdvancement;
test('Historical acquired talents survive absent or smaller Upgrade counts without invented spare choices', () => {
  for (const upgrade of ['', 'Veterano', '1']) {
    const c = {upgrade, talents: ['A', 'B'], uniqueTraits: {acquired: ['corpo-mostruoso']}};
    const before = JSON.stringify(c); assert.equal(A.talentChoices(c).remaining, 0);
    assert.equal(JSON.stringify(c), before);
    A.normalize(c); assert.equal(A.talentChoices(c).granted, 3);
    A.normalize(c); assert.equal(A.talentChoices(c).remaining, 0);
    assert.deepEqual(c.talents, ['A', 'B']); assert.deepEqual(c.uniqueTraits.acquired, ['corpo-mostruoso']);
  }
});
test('Normal talents and Traits share one choice, including inactive acquired prerequisites', () => {
  const c = {upgrade: '3', talents: ['A'], uniqueTraits: {acquired: ['corpo-mostruoso']}};
  A.normalize(c); assert.equal(A.canAcquire(c).remaining, 1);
  A.chooseTalent(c, 'B'); assert.equal(A.canAcquire(c).allowed, false);
  const before = JSON.stringify(c); assert.throws(() => A.chooseTalent(c, 'C'), /Upgrade/);
  assert.equal(JSON.stringify(c), before);
  A.chooseTalent(c, 'B', false); assert.equal(A.canAcquire(c).remaining, 1);
});
test('Explicit Upgrade choice grants are persistent and cannot alter acquired character data', () => {
  const c = {talents: [], prestige: {choices: {striker: ['raffica-senza-fine']}}};
  A.normalize(c); assert.equal(A.talentChoices(c).remaining, 0);
  A.grant(c); A.chooseTalent(c, 'A');
  const restored = JSON.parse(JSON.stringify(c)); A.normalize(restored);
  assert.equal(A.canAcquire(restored).remaining, 0); assert.equal(restored.prestige.choices.striker[0], 'raffica-senza-fine');
  assert.throws(() => A.setGranted(restored, 0), /acquisizioni/);
  assert.throws(() => A.setGranted(restored, -1), /intero/);
  A.setGranted(restored, 2); assert.equal(A.canAcquire(restored).remaining, 1);
});
test('A forged acquisition cannot bypass the shared budget or requirements', () => {
  const c = {talents: [], upgrade: '1'};
  const before = JSON.stringify(c); assert.throws(() => A.chooseTalent(c, 'A', true, false), /requisiti/);
  assert.equal(JSON.stringify(c), before);
  A.chooseTalent(c, 'A'); assert.throws(() => A.chooseTalent(c, 'A'), /già acquisito/);
});
