import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import {
  GOOGLE_FONTS,
  FONT_CATEGORY_LABELS,
  googleFontStack,
  loadGoogleFont,
  loadGoogleFonts,
  type FontCategory,
} from '../../utils/googleFonts';

interface FontPickerProps {
  /** Selected Google Font family, or undefined for the block's built-in font. */
  value?: string;
  onChange: (family: string | undefined) => void;
  /** Label for the "no Google font" option. */
  defaultLabel?: string;
}

/** Searchable Google Fonts dropdown. Any family on fonts.google.com can be typed in. */
export const FontPicker: React.FC<FontPickerProps> = ({
  value,
  onChange,
  defaultLabel = 'Default',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FontCategory | 'all'>('all');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGoogleFont(value);
  }, [value]);

  // Load every curated family once (single request) the first time the list opens, for live previews
  useEffect(() => {
    if (open) loadGoogleFonts(GOOGLE_FONTS.map((f) => f.family));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      GOOGLE_FONTS.filter(
        (f) =>
          (category === 'all' || f.category === category) &&
          (!q || f.family.toLowerCase().includes(q))
      ),
    [q, category]
  );
  const canUseCustom = q.length > 1 && !GOOGLE_FONTS.some((f) => f.family.toLowerCase() === q);

  const choose = (family: string | undefined) => {
    onChange(family);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded shadow-neo-sm text-xs"
        style={value ? { fontFamily: googleFontStack(value) } : undefined}
      >
        <span className="truncate">{value || defaultLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-neo-surface border-neo border-neo-ink rounded-lg shadow-neo p-2 flex flex-col gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Google Fonts…"
              className="w-full pl-7 pr-2 py-1 bg-white border border-neo-ink rounded text-xs font-sans"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {(['all', 'sans', 'serif', 'display', 'handwriting', 'mono'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-1.5 py-0.5 rounded border border-neo-ink text-[10px] font-mono ${
                  category === c ? 'bg-neo-yellow font-bold' : 'bg-white hover:bg-neo-bg'
                }`}
              >
                {c === 'all' ? 'All' : FONT_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          <div className="max-h-56 overflow-y-auto flex flex-col">
            <button
              type="button"
              onClick={() => choose(undefined)}
              className="flex items-center justify-between px-2 py-1.5 rounded text-xs text-left hover:bg-neo-bg"
            >
              <span>{defaultLabel}</span>
              {!value && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
            </button>
            {filtered.map((f) => (
              <button
                key={f.family}
                type="button"
                onClick={() => choose(f.family)}
                className="flex items-center justify-between px-2 py-1.5 rounded text-sm text-left hover:bg-neo-bg"
                style={{ fontFamily: googleFontStack(f.family) }}
              >
                <span className="truncate">{f.family}</span>
                {value === f.family && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={3} />}
              </button>
            ))}
            {filtered.length === 0 && !canUseCustom && (
              <span className="px-2 py-2 text-[11px] font-mono text-gray-500">No matches</span>
            )}
            {canUseCustom && (
              <button
                type="button"
                onClick={() => choose(query.trim().replace(/\s+/g, ' '))}
                className="px-2 py-1.5 rounded text-[11px] font-mono text-left bg-neo-bg hover:bg-neo-yellow/40"
              >
                Use “{query.trim()}” from Google Fonts
              </button>
            )}
          </div>
          <span className="text-[9px] font-mono text-gray-500 leading-snug">
            Open-source fonts served by the Google Fonts API.
          </span>
        </div>
      )}
    </div>
  );
};
