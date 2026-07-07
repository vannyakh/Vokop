/**
 * Shared numeric helpers (adapted from OpenCut `utils/math.ts`).
 * Used by studio inspector inputs, preview viewport zoom/snap, and UI fields.
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampRound(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

/** Number of fraction digits implied by a step (0.05 → 2, 1e-3 → 3). */
export function getFractionDigitsForStep(step: number): number {
  const normalizedStep = step.toString().toLowerCase();
  if (normalizedStep.includes('e-')) {
    return Number(normalizedStep.split('e-')[1] ?? 0);
  }
  const [, fractionalPart = ''] = normalizedStep.split('.');
  return fractionalPart.length;
}

/** Snap a value to the nearest step, avoiding float drift in the result. */
export function snapToStep(value: number, step: number): number {
  if (step <= 0) return value;
  const snappedValue = Math.round(value / step) * step;
  return Number(snappedValue.toFixed(getFractionDigitsForStep(step)));
}

export function isNearlyEqual(
  leftValue: number,
  rightValue: number,
  epsilon = 0.0001,
): boolean {
  return Math.abs(leftValue - rightValue) <= epsilon;
}

export interface FormatNumberOptions {
  /** Exact fraction digits (overrides min/max). */
  fractionDigits?: number;
  minFractionDigits?: number;
  maxFractionDigits?: number;
}

/** Format a number for display, trimming trailing zeros ("1.50" → "1.5"). */
export function formatNumberForDisplay(
  value: number,
  options: FormatNumberOptions = {},
): string {
  const { fractionDigits, minFractionDigits = 0, maxFractionDigits = 6 } = options;
  const resolvedMaxFractionDigits = Math.max(0, fractionDigits ?? maxFractionDigits);
  const resolvedMinFractionDigits = Math.min(
    Math.max(0, fractionDigits ?? minFractionDigits),
    resolvedMaxFractionDigits,
  );
  const fixedValue = value.toFixed(resolvedMaxFractionDigits);

  if (resolvedMaxFractionDigits === 0) {
    return Number(fixedValue) === 0 ? '0' : fixedValue;
  }

  const [integerPart, fractionPart = ''] = fixedValue.split('.');
  const normalizedIntegerPart = Number(fixedValue) === 0 ? '0' : integerPart;
  let trimmedFractionPart = fractionPart;

  while (
    trimmedFractionPart.length > resolvedMinFractionDigits &&
    trimmedFractionPart.endsWith('0')
  ) {
    trimmedFractionPart = trimmedFractionPart.slice(0, -1);
  }

  return trimmedFractionPart
    ? `${normalizedIntegerPart}.${trimmedFractionPart}`
    : normalizedIntegerPart;
}

/**
 * Safely evaluate a basic arithmetic expression without eval().
 * Supports +, -, *, /, parentheses, and decimal numbers.
 * Returns null when the input is not a valid expression.
 */
export function evaluateMathExpression(input: string): number | null {
  const sanitized = input.trim();
  if (!/^[\d.\s+\-*/()]+$/.test(sanitized)) return null;
  try {
    return parseExpression(sanitized);
  } catch {
    return null;
  }
}

type Token =
  | { type: 'NUMBER'; value: number }
  | { type: 'PLUS' }
  | { type: 'MINUS' }
  | { type: 'MULTIPLY' }
  | { type: 'DIVIDE' }
  | { type: 'LPAREN' }
  | { type: 'RPAREN' };

/**
 * Recursive descent parser:
 *   expression = term { ('+' | '-') term }
 *   term = factor { ('*' | '/') factor }
 *   factor = number | '-' factor | '(' expression ')'
 */
function parseExpression(input: string): number | null {
  const tokens = tokenize(input);
  if (tokens.length === 0) return null;

  let index = 0;

  function peek(): Token | null {
    return tokens[index] ?? null;
  }

  function consume(): Token | null {
    return tokens[index++] ?? null;
  }

  function parseExpressionLevel(): number {
    let left = parseTerm();
    for (;;) {
      const token = peek();
      if (token?.type === 'PLUS') {
        consume();
        left += parseTerm();
      } else if (token?.type === 'MINUS') {
        consume();
        left -= parseTerm();
      } else {
        break;
      }
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    for (;;) {
      const token = peek();
      if (token?.type === 'MULTIPLY') {
        consume();
        left *= parseFactor();
      } else if (token?.type === 'DIVIDE') {
        consume();
        const right = parseFactor();
        if (right === 0) throw new Error('Division by zero');
        left /= right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseFactor(): number {
    const token = peek();
    if (!token) throw new Error('Unexpected end of expression');

    if (token.type === 'NUMBER') {
      consume();
      return token.value;
    }

    if (token.type === 'MINUS') {
      consume();
      return -parseFactor();
    }

    if (token.type === 'LPAREN') {
      consume();
      const value = parseExpressionLevel();
      if (peek()?.type !== 'RPAREN') {
        throw new Error('Missing closing parenthesis');
      }
      consume();
      return value;
    }

    throw new Error(`Unexpected token: ${token.type}`);
  }

  const result = parseExpressionLevel();

  if (index !== tokens.length) return null;
  if (!Number.isFinite(result)) return null;
  return result;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const str = input.trim();

  while (i < str.length) {
    const char = str[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (/\d/.test(char)) {
      let numStr = '';
      while (i < str.length && (/\d/.test(str[i]) || str[i] === '.')) {
        numStr += str[i];
        i++;
      }
      const value = Number(numStr);
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid number: ${numStr}`);
      }
      tokens.push({ type: 'NUMBER', value });
      continue;
    }

    switch (char) {
      case '+':
        tokens.push({ type: 'PLUS' });
        break;
      case '-':
        tokens.push({ type: 'MINUS' });
        break;
      case '*':
        tokens.push({ type: 'MULTIPLY' });
        break;
      case '/':
        tokens.push({ type: 'DIVIDE' });
        break;
      case '(':
        tokens.push({ type: 'LPAREN' });
        break;
      case ')':
        tokens.push({ type: 'RPAREN' });
        break;
      default:
        throw new Error(`Invalid character: ${char}`);
    }
    i++;
  }

  return tokens;
}
