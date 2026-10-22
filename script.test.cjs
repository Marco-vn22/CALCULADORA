const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const elements = {};
const element = () => ({ textContent: '', addEventListener() {}, setAttribute() {} });
const context = vm.createContext({ document: { getElementById: id => elements[id] ??= element(), querySelector: () => element(), addEventListener() {} } });
vm.runInContext(fs.readFileSync('script.js', 'utf8'), context);
const run = code => vm.runInContext(code, context);
const cases = [
  ['2+3*4', 14], ['(2+3)*4', 20], ['2^3^2', 512], ['-2^2', -4], ['2^-3', .125],
  ['sqrt(81)', 9], ['log(1000)', 3], ['ln(e)', 1], ['5!', 120], ['0!', 1],
  ['50%', .5], ['sin(30)', .5], ['cos(60)', .5], ['tan(45)', 1],
  ['asin(0.5)', 30], ['acos(0.5)', 60], ['atan(1)', 45], ['1E-7*2', 2e-7]
];
for (const [expression, expected] of cases) {
  const actual = run(`evaluate(${JSON.stringify(expression)})`);
  assert.ok(Math.abs(actual - expected) < 1e-10, `${expression}: ${actual}`);
}
assert.ok(Math.abs(run("evaluate('sin(π/2)', false)") - 1) < 1e-10);
for (const expression of ['1/0', 'sqrt(-1)', 'ln(0)', 'tan(90)', 'asin(2)', '(-1)!', '171!', '(2+3', '2+', 'alert(1)']) {
  assert.throws(() => run(`evaluate(${JSON.stringify(expression)})`), expression);
}
run("clear(); insert('2'); insert('π'); action('equals')");
assert.ok(Math.abs(Number(elements.result.textContent.replace(',', '.')) - 2 * Math.PI) < 1e-10);
run("clear(); insert('sin('); insert('3'); insert('0'); insert(')'); action('equals')");
assert.equal(elements.result.textContent, '0,5');
run("clear(); insert('1'); insert('/'); insert('0'); action('equals')");
assert.equal(elements.result.textContent, 'Error');
run("insert('7')"); assert.equal(elements.result.textContent, '7');
run("clear(); insert('sqrt('); action('backspace')"); assert.equal(elements.result.textContent, '0');
run("clear(); insert('0'); insert('.'); insert('1'); insert('.'); insert('2')"); assert.equal(elements.result.textContent, '0,12');
run("clear(); insert('2'); insert('+'); insert('3'); action('equals'); insert('*'); insert('4'); action('equals')"); assert.equal(elements.result.textContent, '20');
console.log('36 comprobaciones superadas: parser, funciones científicas, grados/radianes, errores y controles.');
