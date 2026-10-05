// ===== State =====
let current = "0";          // value currently on screen
let previous = null;        // stored operand for binary operations
let operator = null;        // pending binary operator (+, -, *, /, pow)
let waitingForNewValue = false;
let expressionText = "";    // history line shown above the result
let angleMode = "deg";      // "deg" | "rad"
let sciNotation = false;

// ===== DOM =====
const resultEl = document.getElementById("result");
const expressionEl = document.getElementById("expression");
const angleToggle = document.getElementById("angleToggle");
const notationToggle = document.getElementById("notationToggle");

// ===== Display =====
function formatNumber(num) {
  if (num === Infinity || num === -Infinity) return "Error";
  if (Number.isNaN(num)) return "Error";

  if (sciNotation) {
    return num.toExponential(6).replace(/\.?0+e/, "e");
  }

  // avoid absurdly long decimals
  let str = String(Math.round(num * 1e10) / 1e10);
  if (str.length > 16) {
    str = num.toPrecision(10).replace(/\.?0+$/, "").replace(/\.?0+e/, "e");
  }
  return str;
}

function updateDisplay() {
  expressionEl.textContent = expressionText;
  resultEl.textContent = current;
  resultEl.classList.toggle("error", current === "Error");
}

// ===== Basic input =====
function inputDigit(d) {
  if (current === "Error") resetAll();
  if (waitingForNewValue) {
    current = d;
    waitingForNewValue = false;
  } else {
    current = current === "0" ? d : current + d;
  }
  updateDisplay();
}

function inputDecimal() {
  if (current === "Error") resetAll();
  if (waitingForNewValue) {
    current = "0.";
    waitingForNewValue = false;
    updateDisplay();
    return;
  }
  if (!current.includes(".")) {
    current += ".";
    updateDisplay();
  }
}

function clear() {
  resetAll();
  updateDisplay();
}

function resetAll() {
  current = "0";
  previous = null;
  operator = null;
  waitingForNewValue = false;
  expressionText = "";
}

function backspace() {
  if (current === "Error" || waitingForNewValue) {
    current = "0";
  } else if (current.length > 1) {
    current = current.slice(0, -1);
  } else {
    current = "0";
  }
  updateDisplay();
}

function toggleSign() {
  if (current === "Error") return;
  current = String(parseFloat(current) * -1);
  updateDisplay();
}

function percent() {
  if (current === "Error") return;
  current = formatNumber(parseFloat(current) / 100);
  updateDisplay();
}

// ===== Binary operators (+ - * / xʸ) =====
const opSymbols = { "+": "+", "-": "−", "*": "×", "/": "÷", "pow": "^" };

function chooseOperator(nextOp) {
  if (current === "Error") return;

  if (operator && !waitingForNewValue) {
    calculate();
  }

  previous = parseFloat(current);
  operator = nextOp;
  waitingForNewValue = true;
  expressionText = `${formatNumber(previous)} ${opSymbols[nextOp]}`;
  updateDisplay();
}

function calculate() {
  if (operator === null || previous === null || current === "Error") return;

  const a = previous;
  const b = parseFloat(current);
  let value;

  switch (operator) {
    case "+": value = a + b; break;
    case "-": value = a - b; break;
    case "*": value = a * b; break;
    case "/": value = b === 0 ? NaN : a / b; break;
    case "pow": value = Math.pow(a, b); break;
    default: return;
  }

  expressionText = `${formatNumber(a)} ${opSymbols[operator]} ${formatNumber(b)} =`;
  current = formatNumber(value);
  previous = null;
  operator = null;
  waitingForNewValue = true;
  updateDisplay();
}

// ===== Scientific (unary) functions =====
function toRadians(deg) {
  return deg * (Math.PI / 180);
}

function applyUnary(fn, label) {
  if (current === "Error") return;
  const x = parseFloat(current);
  let value;
  try {
    value = fn(x);
  } catch (e) {
    value = NaN;
  }
  expressionText = `${label}(${formatNumber(x)})`;
  current = formatNumber(value);
  waitingForNewValue = true;
  updateDisplay();
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity; // overflow guard
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

const scientificActions = {
  sqrt: () => applyUnary(x => (x < 0 ? NaN : Math.sqrt(x)), "√"),
  square: () => applyUnary(x => Math.pow(x, 2), "sqr"),
  log: () => applyUnary(x => (x <= 0 ? NaN : Math.log10(x)), "log"),
  ln: () => applyUnary(x => (x <= 0 ? NaN : Math.log(x)), "ln"),
  sin: () => applyUnary(x => Math.sin(angleMode === "deg" ? toRadians(x) : x), "sin"),
  cos: () => applyUnary(x => Math.cos(angleMode === "deg" ? toRadians(x) : x), "cos"),
  tan: () => applyUnary(x => Math.tan(angleMode === "deg" ? toRadians(x) : x), "tan"),
  factorial: () => applyUnary(x => factorial(x), "fact"),
  pi: () => {
    current = formatNumber(Math.PI);
    waitingForNewValue = false;
    updateDisplay();
  },
  euler: () => {
    current = formatNumber(Math.E);
    waitingForNewValue = false;
    updateDisplay();
  },
};

// ===== Mode toggles =====
angleToggle.addEventListener("click", () => {
  angleMode = angleMode === "deg" ? "rad" : "deg";
  angleToggle.textContent = angleMode.toUpperCase();
  angleToggle.classList.toggle("active", angleMode === "deg");
});

notationToggle.addEventListener("click", () => {
  sciNotation = !sciNotation;
  notationToggle.classList.toggle("active", sciNotation);
  if (current !== "Error") {
    current = formatNumber(parseFloat(current));
  }
  updateDisplay();
});

// ===== Button wiring =====
document.querySelectorAll(".btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const value = btn.dataset.value;
    const action = btn.dataset.action;

    if (value !== undefined) {
      if (["+", "-", "*", "/"].includes(value)) {
        chooseOperator(value);
      } else if (value === ".") {
        inputDecimal();
      } else {
        inputDigit(value);
      }
      return;
    }

    switch (action) {
      case "clear": clear(); break;
      case "backspace": backspace(); break;
      case "percent": percent(); break;
      case "sign": toggleSign(); break;
      case "equals": calculate(); break;
      case "pow": chooseOperator("pow"); break;
      default:
        if (scientificActions[action]) scientificActions[action]();
    }
  });
});

// ===== Keyboard support =====
document.addEventListener("keydown", (e) => {
  if (e.key >= "0" && e.key <= "9") inputDigit(e.key);
  else if (e.key === ".") inputDecimal();
  else if (["+", "-", "*", "/"].includes(e.key)) chooseOperator(e.key);
  else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); calculate(); }
  else if (e.key === "Backspace") backspace();
  else if (e.key === "Escape") clear();
});

updateDisplay();
