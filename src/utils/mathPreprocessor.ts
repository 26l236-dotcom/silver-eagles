const LATEX_ENV_NAMES = new Set([
  'equation',
  'equation*',
  'align',
  'align*',
  'aligned',
  'gather',
  'gather*',
  'gathered',
  'multline',
  'multline*',
  'split',
  'cases',
  'matrix',
  'pmatrix',
  'bmatrix',
  'Bmatrix',
  'vmatrix',
  'Vmatrix',
]);

const DOUBLE_ESCAPED_MACRO_RE =
  /\\\\(frac|dfrac|tfrac|sqrt|sum|prod|int|iint|iiint|oint|vec|hat|bar|dot|ddot|nabla|partial|times|cdot|pm|mp|approx|equiv|neq|leq|geq|propto|infty|to|rightarrow|leftarrow|Rightarrow|Leftrightarrow|quad|qquad|text|mathrm|mathbf|mathit|left|right|begin|end|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)\b/g;

function normalizeMathBody(raw: string): string {
  // Unescape double-escaped LaTeX macros (common in JSON outputs) without touching matrix row breaks (`\\ ` or `\\\\`)
  return raw.replace(DOUBLE_ESCAPED_MACRO_RE, '\\$1');
}

function hasTopLevelAlignment(body: string): boolean {
  if (!body.includes('&')) return false;
  if (/\\begin\{(?:align|aligned|cases|matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|array|split)/.test(body)) {
    return false;
  }
  return /(?:^|[^\\])&/.test(body);
}

function formatDisplayMath(rawInner: string, indent: string): string {
  let inner = normalizeMathBody(rawInner).trim();
  if (!inner) return '';
  if (hasTopLevelAlignment(inner)) {
    inner = `\\begin{aligned}\n${inner}\n\\end{aligned}`;
  }
  const safeIndent = indent || '';
  return `\n${safeIndent}$$\n${safeIndent}${inner.split('\n').join(`\n${safeIndent}`)}\n${safeIndent}$$\n`;
}

function formatInlineMath(rawInner: string): string {
  const collapsed = normalizeMathBody(rawInner)
    .replace(/\r?\n+/g, ' ')
    .trim();
  if (!collapsed) return '';
  return `$${collapsed}$`;
}

function looksLikeInlineDollarMath(inner: string): boolean {
  const trimmed = inner.trim();
  if (!trimmed) return false;
  const hasEdgeSpaces = inner !== trimmed;
  if (!hasEdgeSpaces) {
    // Reject obvious currency like "$50" or "$5.00 - $10" when unspaced?
    // If it starts with a digit and has spaces + prose words without math symbols, skip
    if (/^\d[\d,.\s]*(\band\b|\bor\b|\bto\b|\bfor\b)/i.test(trimmed) && !/[\\^_=<>]/.test(trimmed)) {
      return false;
    }
    return true;
  }
  // When padded with spaces like "$ x^2 $", require math indicators so "$ 5 and $ 10" isn't misread
  return /[\\^_=+\-*/<>|{}()]/.test(trimmed) || /^[a-zA-Z]$/.test(trimmed);
}

function getLineIndent(output: string): string {
  const lastNl = output.lastIndexOf('\n');
  const currentLine = lastNl === -1 ? output : output.slice(lastNl + 1);
  const match = currentLine.match(/^(\s*)(?:(?:[-*+]|\d+\.)\s+)?/);
  if (!match) return '';
  // Use pure spaces matching the list content indent so <ol>/<ul> items stay continuous
  const listPrefixMatch = currentLine.match(/^(\s*(?:[-*+]|\d+\.)\s+)/);
  if (listPrefixMatch) {
    return ' '.repeat(listPrefixMatch[1].length);
  }
  return match[1] || '';
}

function transformMathInProse(segment: string): string {
  let out = '';
  let i = 0;
  const n = segment.length;

  while (i < n) {
    // 1. Display math: $$ ... $$
    if (segment[i] === '$' && segment[i + 1] === '$' && segment[i - 1] !== '\\') {
      const closeIdx = segment.indexOf('$$', i + 2);
      if (closeIdx !== -1) {
        const inner = segment.slice(i + 2, closeIdx);
        const indent = getLineIndent(out);
        out += formatDisplayMath(inner, indent);
        i = closeIdx + 2;
        continue;
      }
      // Unclosed during streaming: pass through safely
      out += segment.slice(i);
      break;
    }

    // 2. Display math: \[ ... \] or \\[ ... \\]
    const isDoubleDisplayOpen =
      segment.startsWith('\\\\[', i) && !/^\\\\\[\s*[\d.]/.test(segment.slice(i, i + 16));
    const isSingleDisplayOpen =
      !isDoubleDisplayOpen && segment.startsWith('\\[', i) && segment[i - 1] !== '\\';

    if (isDoubleDisplayOpen || isSingleDisplayOpen) {
      const openLen = isDoubleDisplayOpen ? 3 : 2;
      const closeToken = isDoubleDisplayOpen ? '\\\\]' : '\\]';
      let closeIdx = segment.indexOf(closeToken, i + openLen);
      if (closeIdx === -1 && isDoubleDisplayOpen) {
        closeIdx = segment.indexOf('\\]', i + openLen);
      }
      if (closeIdx !== -1) {
        const usedCloseLen = segment.startsWith('\\\\]', closeIdx) ? 3 : 2;
        const inner = segment.slice(i + openLen, closeIdx);
        const indent = getLineIndent(out);
        out += formatDisplayMath(inner, indent);
        i = closeIdx + usedCloseLen;
        continue;
      }
      // Unclosed during streaming
      out += segment.slice(i);
      break;
    }

    // 3. Inline math: \( ... \) or \\( ... \\)
    const isDoubleInlineOpen = segment.startsWith('\\\\(', i);
    const isSingleInlineOpen =
      !isDoubleInlineOpen && segment.startsWith('\\(', i) && segment[i - 1] !== '\\';

    if (isDoubleInlineOpen || isSingleInlineOpen) {
      const openLen = isDoubleInlineOpen ? 3 : 2;
      const closeToken = isDoubleInlineOpen ? '\\\\)' : '\\)';
      let closeIdx = segment.indexOf(closeToken, i + openLen);
      if (closeIdx === -1 && isDoubleInlineOpen) {
        closeIdx = segment.indexOf('\\)', i + openLen);
      }
      if (closeIdx !== -1) {
        const paraBreak = segment.indexOf('\n\n', i + openLen);
        if (paraBreak === -1 || closeIdx < paraBreak) {
          const usedCloseLen = segment.startsWith('\\\\)', closeIdx) ? 3 : 2;
          const inner = segment.slice(i + openLen, closeIdx);
          out += formatInlineMath(inner);
          i = closeIdx + usedCloseLen;
          continue;
        }
      }
    }

    // 4. Standalone LaTeX environments: \begin{env} ... \end{env}
    if (segment.startsWith('\\begin{', i) && segment[i - 1] !== '\\') {
      const braceClose = segment.indexOf('}', i + 7);
      if (braceClose !== -1) {
        const envName = segment.slice(i + 7, braceClose);
        if (LATEX_ENV_NAMES.has(envName)) {
          const endToken = `\\end{${envName}}`;
          const endIdx = segment.indexOf(endToken, braceClose + 1);
          if (endIdx !== -1) {
            const fullEnv = segment.slice(i, endIdx + endToken.length);
            const indent = getLineIndent(out);
            out += formatDisplayMath(fullEnv, indent);
            i = endIdx + endToken.length;
            continue;
          }
        }
      }
    }

    // 5. Inline math: $ ... $ (trim inner padding when it's math)
    if (segment[i] === '$' && segment[i - 1] !== '\\' && segment[i + 1] !== '$') {
      let search = i + 1;
      let closeIdx = -1;
      while (search < n) {
        if (segment[search] === '\n' && segment[search + 1] === '\n') break;
        if (segment[search] === '\n') break;
        if (
          segment[search] === '$' &&
          segment[search - 1] !== '\\' &&
          segment[search + 1] !== '$'
        ) {
          closeIdx = search;
          break;
        }
        search += 1;
      }
      if (closeIdx !== -1) {
        const inner = segment.slice(i + 1, closeIdx);
        if (looksLikeInlineDollarMath(inner)) {
          out += formatInlineMath(inner);
          i = closeIdx + 1;
          continue;
        }
      }
    }

    out += segment[i];
    i += 1;
  }

  return out;
}

/**
 * Splits out fenced code blocks and inline code spans before transforming math
 * delimiters, guaranteeing code blocks are preserved verbatim.
 */
export function preprocessGeminiMath(raw: string): string {
  if (!raw) return '';

  let result = '';
  let proseStart = 0;
  let i = 0;
  const n = raw.length;

  while (i < n) {
    // Check fenced code blocks at line start (``` or ~~~)
    const atLineStart = i === 0 || raw[i - 1] === '\n';
    if (atLineStart) {
      const rest = raw.slice(i);
      const fenceMatch = rest.match(/^[ \t]{0,3}(`{3,}|~{3,})/);
      if (fenceMatch) {
        const fence = fenceMatch[1];
        const fenceChar = fence[0];
        const fenceLen = fence.length;
        // Flush preceding prose
        if (i > proseStart) {
          result += transformMathInProse(raw.slice(proseStart, i));
        }

        const headerEnd = raw.indexOf('\n', i);
        if (headerEnd === -1) {
          result += raw.slice(i);
          proseStart = n;
          break;
        }

        // Find matching closing fence
        const closeRe = new RegExp(`\\n[ \\t]{0,3}${fenceChar}{${fenceLen},}[ \\t]*(?=\\r?\\n|$)`);
        const afterHeader = raw.slice(headerEnd);
        const closeMatch = closeRe.exec(afterHeader);
        if (closeMatch) {
          const endPos = headerEnd + closeMatch.index + closeMatch[0].length;
          result += raw.slice(i, endPos);
          i = endPos;
          proseStart = i;
          continue;
        }

        // Unclosed fence (e.g. during streaming): preserve verbatim to end
        result += raw.slice(i);
        proseStart = n;
        break;
      }
    }

    // Check inline code spans (`...`)
    if (raw[i] === '`' && raw[i - 1] !== '\\') {
      let tickLen = 1;
      while (raw[i + tickLen] === '`') tickLen += 1;
      const ticks = '`'.repeat(tickLen);
      let search = i + tickLen;
      let foundClose = -1;
      while (search < n) {
        if (raw.startsWith(ticks, search) && raw[search + tickLen] !== '`') {
          foundClose = search;
          break;
        }
        if (raw[search] === '`') {
          while (raw[search] === '`') search += 1;
          continue;
        }
        search += 1;
      }
      if (foundClose !== -1) {
        if (i > proseStart) {
          result += transformMathInProse(raw.slice(proseStart, i));
        }
        const endPos = foundClose + tickLen;
        result += raw.slice(i, endPos);
        i = endPos;
        proseStart = i;
        continue;
      }
      i += tickLen;
      continue;
    }

    i += 1;
  }

  if (proseStart < n) {
    result += transformMathInProse(raw.slice(proseStart));
  }

  return result;
}
