const result = document.getElementById('result');
const expression = document.getElementById('expression');
const calculator = document.querySelector('.calculator');
const modeButton = document.getElementById('angle-mode');
let source = '';
let degrees = true;
let completed = false;
let hasError = false;

// Recursive descent parser: only supported mathematical tokens are accepted.
// Powers associate to the right; multiplication precedes addition.
function evaluate(text, useDegrees = true) {
  const tokens = text.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?|asin|acos|atan|sqrt|sin|cos|tan|log|ln|[πe()+*/^!%\-]/g) || [];
  if (tokens.join('') !== text.replace(/\s/g, '') || tokens.length > 500) throw Error('Expression invalide');
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];
  const finite = value => {
    if (!Number.isFinite(value)) throw Error('Resultado fuera de rango o dominio');
    return value;
  };
  function sum() {
    let value = product();
    while (peek() === '+' || peek() === '-') {
      const op = take();
      const right = product();
      value = finite(op === '+' ? value + right : value - right);
    }
    return value;
  }
  function product() {
    let value = unary();
    while (peek() === '*' || peek() === '/') {
      const op = take();
      const right = unary();
      if (op === '/' && right === 0) throw Error('No se puede dividir entre cero');
      value = finite(op === '*' ? value * right : value / right);
    }
    return value;
  }
  function unary() {
    if (peek() === '+') { take(); return unary(); }
    if (peek() === '-') { take(); return -unary(); }
    return power();
  }
  function power() {
    let value = postfix();
    if (peek() === '^') { take(); value = finite(value ** unary()); }
    return value;
  }
  function postfix() {
    let value = primary();
    while (peek() === '!' || peek() === '%') {
      if (take() === '%') value /= 100;
      else {
        if (!Number.isInteger(value) || value < 0 || value > 170) throw Error('El factorial admite enteros de 0 a 170');
        let factorial = 1;
        for (let i = 2; i <= value; i++) factorial *= i;
        value = factorial;
      }
    }
    return finite(value);
  }
  function primary() {
    const token = take();
    if (token === undefined) throw Error('Completa la expresión');
    if (/^(?:\d|\.)/.test(token)) return finite(Number(token));
    if (token === 'π') return Math.PI;
    if (token === 'e') return Math.E;
    if (token === '(') {
      const value = sum();
      if (take() !== ')') throw Error('Falta cerrar un paréntesis');
      return value;
    }
    if (['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'log', 'ln'].includes(token)) {
      if (take() !== '(') throw Error('La función necesita paréntesis');
      const value = sum();
      if (take() !== ')') throw Error('Falta cerrar un paréntesis');
      const angle = useDegrees ? value * Math.PI / 180 : value;
      if (token === 'tan' && Math.abs(Math.cos(angle)) < 1e-14) throw Error('Tangente no definida en este ángulo');
      const functions = {
        sin: () => Math.sin(angle), cos: () => Math.cos(angle), tan: () => Math.tan(angle),
        asin: () => Math.asin(value) * (useDegrees ? 180 / Math.PI : 1),
        acos: () => Math.acos(value) * (useDegrees ? 180 / Math.PI : 1),
        atan: () => Math.atan(value) * (useDegrees ? 180 / Math.PI : 1),
        sqrt: () => Math.sqrt(value), log: () => Math.log10(value), ln: () => Math.log(value)
      };
      const answer = finite(functions[token]());
      return ['sin', 'cos', 'tan'].includes(token) && Math.abs(answer) < 1e-15 ? 0 : answer;
    }
    throw Error('Revisa la expresión');
  }
  const answer = sum();
  if (position !== tokens.length) throw Error('Revisa los operadores y paréntesis');
  return finite(answer);
}

function displayText(text) {
  return text.replace(/sqrt/g, '√').replace(/asin/g, 'sin⁻¹').replace(/acos/g, 'cos⁻¹').replace(/atan/g, 'tan⁻¹').replace(/\*/g, '×').replace(/\//g, '÷').replace(/\./g, ',');
}
function render() {
  result.textContent = displayText(source || '0');
  result.scrollLeft = result.scrollWidth;
}
function clear() {
  source = '';
  completed = false;
  hasError = false;
  expression.textContent = '\u00a0';
  render();
}
function insert(value) {
  if (hasError) clear();
  if (completed) {
    if (!['+', '-', '*', '/', '^', '!', '%', '^2'].includes(value)) source = '';
    completed = false;
  }
  expression.textContent = '\u00a0';
  if (source.length > 400) return;
  const end = source.slice(-1);
  const endsOperand = /[\d)πe!%]/.test(end);
  const startsOperand = /^(?:\d|π|e|\(|sin|cos|tan|asin|acos|atan|sqrt|log|ln)/.test(value);
  if (endsOperand && startsOperand && !( /\d/.test(end) && /^\d/.test(value))) source += '*';
  if (value === '.') {
    const lastNumber = source.match(/(?:\d*\.?\d*)(?:E[+-]?\d+)?$/)?.[0] || '';
    if (lastNumber.includes('.') || lastNumber.includes('E')) return;
    if (/[)πe!%]$/.test(source)) source += '*';
    if (!/\d$/.test(source)) source += '0';
  }
  source += value;
  render();
}
function action(name) {
  if (name === 'clear') return clear();
  if (hasError) clear();
  if (name === 'backspace') {
    source = source.replace(/(?:asin|acos|atan|sqrt|sin|cos|tan|log|ln)\($|.$/, '');
    completed = false;
    expression.textContent = '\u00a0';
    render();
  } else if (name === 'sign') {
    source = source ? `-(${source})` : '-';
    completed = false;
    render();
  } else if (name === 'equals' && source) {
    try {
      const value = evaluate(source, degrees);
      expression.textContent = `${displayText(source)} =`;
      source = String(Number(value.toPrecision(12))).replace('e', 'E');
      completed = true;
      render();
    } catch (error) {
      expression.textContent = error.message;
      result.textContent = 'Error';
      hasError = true;
    }
  }
}
calculator.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button === modeButton) return;
  if (button.dataset.insert !== undefined) insert(button.dataset.insert);
  else action(button.dataset.action);
});
modeButton.addEventListener('click', () => {
  degrees = !degrees;
  modeButton.textContent = degrees ? 'DEG' : 'RAD';
  modeButton.setAttribute('aria-label', `Modo angular: ${degrees ? 'grados. Cambiar a radianes' : 'radianes. Cambiar a grados'}`);
});
document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.key === 'Tab') return;
  const shortcuts = { Enter: 'equals', '=': 'equals', Escape: 'clear', Delete: 'clear', Backspace: 'backspace' };
  if (shortcuts[event.key]) {
    event.preventDefault();
    action(shortcuts[event.key]);
  } else if (/^[0-9+\-*/^()!%.,]$/.test(event.key) || event.key === 'e') {
    event.preventDefault();
    insert(event.key === ',' ? '.' : event.key);
  }
});
