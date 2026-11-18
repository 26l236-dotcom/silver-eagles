import { Check, Copy } from 'lucide-react';
import { isValidElement, useMemo, useState, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { preprocessGeminiMath } from '../utils/mathPreprocessor';

interface RichMathMarkdownProps {
  content: string;
  className?: string;
}

function CodeBlock({
  language,
  code,
}: {
  language?: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="my-3 rounded-xl overflow-hidden border"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--border-hairline)',
      }}
    >
      <div
        className="flex items-center justify-between px-3.5 py-1.5 border-b text-[11px] font-mono"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          color: 'var(--text-muted)',
        }}
      >
        <span>{language || 'code'}</span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 font-sans font-semibold hover:opacity-100 opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs sm:text-[13px] leading-relaxed font-mono">
        <code style={{ color: 'var(--text-primary)' }}>{code}</code>
      </pre>
    </div>
  );
}

function extractTextContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextContent).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractTextContent(node.props.children);
  }
  return '';
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h2
      className="font-display font-bold text-xl sm:text-2xl tracking-tight mt-4 mb-2 first:mt-0"
      style={{ color: 'var(--text-primary)' }}
    >
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3
      className="font-display font-bold text-lg sm:text-xl tracking-tight mt-3.5 mb-2 first:mt-0"
      style={{ color: 'var(--text-primary)' }}
    >
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4
      className="font-display font-bold text-base sm:text-lg mt-3 mb-1.5 first:mt-0"
      style={{ color: 'var(--text-primary)' }}
    >
      {children}
    </h4>
  ),
  h4: ({ children }) => (
    <h5
      className="font-display font-bold text-sm sm:text-base mt-2.5 mb-1 first:mt-0"
      style={{ color: 'var(--accent-primary)' }}
    >
      {children}
    </h5>
  ),
  p: ({ children }) => (
    <p className="text-sm sm:text-[15px] leading-relaxed my-2 first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>
      {children}
    </strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="list-disc pl-5 space-y-1.5 my-2.5 text-sm sm:text-[15px] leading-relaxed marker:text-[var(--accent-primary)]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 space-y-2 my-2.5 text-sm sm:text-[15px] leading-relaxed marker:font-mono marker:font-bold marker:text-xs marker:text-[var(--accent-primary)]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote
      className="my-3 pl-3.5 py-2 pr-3 rounded-r-xl border-l-2 text-sm italic"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--accent-primary)',
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr
      className="my-4 border-0 border-t"
      style={{ borderColor: 'var(--border-hairline)' }}
    />
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline font-medium hover:opacity-80"
      style={{ color: 'var(--accent-primary)' }}
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div
      className="my-3.5 overflow-x-auto rounded-xl border"
      style={{ borderColor: 'var(--border-hairline)' }}
    >
      <table className="w-full text-left border-collapse text-xs sm:text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead
      style={{
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
      }}
    >
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr
      className="border-b last:border-b-0"
      style={{ borderColor: 'var(--border-hairline)' }}
    >
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th
      className="px-3.5 py-2.5 font-semibold whitespace-nowrap border-b"
      style={{ borderColor: 'var(--border-hairline)' }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      className="px-3.5 py-2 align-top"
      style={{ color: 'var(--text-secondary)' }}
    >
      {children}
    </td>
  ),
  pre: ({ children }) => {
    if (isValidElement<{ className?: string; children?: ReactNode }>(children)) {
      const cls = children.props.className || '';
      const langMatch = cls.match(/language-([\w-]+)/);
      const rawCode = extractTextContent(children.props.children).replace(/\n$/, '');
      return <CodeBlock language={langMatch?.[1]} code={rawCode} />;
    }
    return <CodeBlock code={extractTextContent(children)} />;
  },
  code: ({ className, children, ...rest }) => {
    const isBlock = Boolean(className && /language-/.test(className));
    if (isBlock) {
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="px-1.5 py-0.5 rounded text-[0.85em] font-mono"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--accent-primary)',
        }}
        {...rest}
      >
        {children}
      </code>
    );
  },
};

export function RichMathMarkdown({ content, className = '' }: RichMathMarkdownProps) {
  const processed = useMemo(() => preprocessGeminiMath(content), [content]);

  return (
    <div className={`smartfun-markdown min-w-0 break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, trust: true }]]}
        components={markdownComponents}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
