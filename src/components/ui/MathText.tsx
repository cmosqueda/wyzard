import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { hasMath, renderMathInText } from '../../utils/math';

interface MathTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** Enter commits instead of inserting a line break (used for table cells). */
  singleLine?: boolean;
  /** Extra key handling (Tab / Enter navigation). Return true to mark the key as handled. */
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  dataCell?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  /** Called with pasted plain text; return true if handled (e.g. spreadsheet paste). */
  onPasteText?: (text: string) => boolean;
}

/**
 * Plain-text editable field with LaTeX support: `$x^2$` (inline) and `$$\int f$$` (display).
 * While you edit it shows the raw source; once you leave it the math is rendered.
 */
export const MathText: React.FC<MathTextProps> = ({
  value,
  onChange,
  className = '',
  placeholder,
  singleLine = false,
  onKeyDown,
  dataCell,
  style,
  onClick,
  onPasteText,
}) => {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const showRendered = !editing && hasMath(value);

  // Keep the uncontrolled editable in sync with the stored value while it isn't focused
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement !== el && el.textContent !== value) el.textContent = value;
  }, [value, showRendered]);

  // Switching from rendered math to editing: focus the field with the caret at the end
  useEffect(() => {
    if (!editing) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing]);

  if (showRendered) {
    return (
      <div
        tabIndex={0}
        data-cell={dataCell}
        className={`${className} cursor-text`}
        style={style}
        onMouseDown={(e) => {
          e.preventDefault();
          setEditing(true);
        }}
        onFocus={() => setEditing(true)}
        onClick={onClick}
        dangerouslySetInnerHTML={{ __html: renderMathInText(value) }}
      />
    );
  }

  return (
    <div
      ref={ref}
      data-cell={dataCell}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className={`${className} focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400`}
      style={style}
      onClick={onClick}
      onFocus={() => setEditing(true)}
      onBlur={(e) => {
        const next = (e.currentTarget.textContent || '').replace(/ /g, ' ');
        setEditing(false);
        if (next !== value) onChange(next);
      }}
      onKeyDown={(e) => {
        if (singleLine && e.key === 'Enter' && !e.shiftKey) e.preventDefault();
        onKeyDown?.(e);
      }}
      onPaste={(e) => {
        // Plain text only
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (onPasteText?.(text)) return;
        document.execCommand('insertText', false, singleLine ? text.replace(/\s*\n\s*/g, ' ') : text);
      }}
    />
  );
};
