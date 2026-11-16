import { MathText } from '../ui/MathText';
import React, { useState } from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { ChevronDown, Bookmark, HelpCircle } from 'lucide-react';

export type AccordionAccent = 'yellow' | 'vermilion' | 'teal' | 'violet' | 'ink';

export interface AccordionBlockProps {
  title?: string;
  badge?: string;
  content?: string;
  accent?: AccordionAccent;
  defaultOpen?: boolean;
  keepTogetherOnPageTurn?: boolean;
}

export const AccordionBlock: UserComponent<AccordionBlockProps> = ({
  title = 'Historical Context: The Typography Revolution',
  badge = 'EXPLAINER',
  content = 'During the late Renaissance, the standardization of punch-cutting and movable metal type transformed reading from a luxury craft into a widespread medium of human culture. Responsive design carries this legacy into the screen era.',
  accent = 'yellow',
  defaultOpen = false,
  keepTogetherOnPageTurn = true,
}) => {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
    actions: { setProp },
  } = useNode((node) => ({
    selected: node.events.selected,
    hovered: node.events.hovered,
  }));

  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getAccentClass = () => {
    switch (accent) {
      case 'vermilion':
        return 'bg-neo-vermilion text-white';
      case 'teal':
        return 'bg-neo-teal text-neo-ink';
      case 'violet':
        return 'bg-neo-violet text-white';
      case 'ink':
        return 'bg-neo-ink text-white';
      case 'yellow':
      default:
        return 'bg-neo-yellow text-neo-ink';
    }
  };

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative group my-4 border-neo border-neo-ink rounded-lg overflow-hidden bg-white shadow-neo transition-all ${
        selected ? 'ring-2 ring-neo-yellow ring-offset-2' : hovered ? 'outline outline-1 outline-dashed outline-neo-vermilion' : ''
      }`}
      style={{
        pageBreakInside: keepTogetherOnPageTurn ? 'avoid' : 'auto',
        breakInside: keepTogetherOnPageTurn ? 'avoid' : 'auto',
      }}
    >
      {/* Header bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-3.5 flex items-center justify-between cursor-pointer select-none bg-white hover:bg-neo-bg/60 transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
          {badge && (
            <span
              contentEditable
              suppressContentEditableWarning
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                setProp((p: AccordionBlockProps) => {
                  p.badge = e.currentTarget.textContent || '';
                });
              }}
              className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-neo-sm focus:outline-none shrink-0 ${getAccentClass()}`}
            >
              {badge}
            </span>
          )}

          <h4
            contentEditable
            suppressContentEditableWarning
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => {
              setProp((p: AccordionBlockProps) => {
                p.title = e.currentTarget.textContent || '';
              });
            }}
            className="font-heading font-bold text-sm text-neo-ink truncate focus:outline-none"
          >
            {title}
          </h4>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {keepTogetherOnPageTurn && (
            <span className="hidden sm:flex items-center gap-0.5 text-[9px] font-mono bg-neo-teal text-neo-ink px-1.5 py-0.5 rounded shadow-neo-sm font-bold">
              <Bookmark className="w-2.5 h-2.5" />
              Page Break Safe
            </span>
          )}
          <div
            className={`w-7 h-7 rounded-md border-neo border-neo-ink flex items-center justify-center bg-neo-bg transition-transform duration-200 shadow-neo-sm ${
              isOpen ? 'rotate-180 bg-neo-yellow' : ''
            }`}
          >
            <ChevronDown className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Expandable Content Drawer */}
      {isOpen && (
        <div className="p-4 pt-3 border-t-neo border-neo-ink bg-neo-bg/40 animate-in fade-in slide-in-from-top-1 duration-150">
          <MathText
            value={content}
            onChange={(v) =>
              setProp((p: AccordionBlockProps) => {
                p.content = v;
              })
            }
            className="font-sans text-xs leading-relaxed text-gray-800"
          />

          <div className="mt-3 pt-2 border-t border-gray-300 flex items-center justify-between text-[10px] font-mono text-gray-500">
            <span>Dual Target: Animated JS Drawer (Web) • &lt;details&gt; (EPUB)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const AccordionSettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as AccordionBlockProps,
  }));

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      <div className="p-2.5 bg-neo-teal/15 border-neo border-neo-teal rounded-lg">
        <span className="font-heading font-bold text-neo-ink uppercase tracking-wider text-[11px] block mb-1">
          Dual-Target Behavior
        </span>
        <p className="text-[11px] text-gray-700 leading-normal">
          On the <strong>Web</strong>, this compiles to a smooth interactive drawer. In <strong>EPUB 3</strong>, it automatically compiles to semantic <code className="bg-white px-1 py-0.5 rounded border border-gray-300">&lt;details&gt;&lt;summary&gt;</code> tags without JavaScript dependencies.
        </p>
      </div>

      {/* Badge Accent */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Badge Accent Color
        </label>
        <div className="grid grid-cols-3 gap-1">
          {(['yellow', 'vermilion', 'teal', 'violet', 'ink'] as const).map((acc) => (
            <button
              key={acc}
              type="button"
              onClick={() => setProp((p: AccordionBlockProps) => (p.accent = acc))}
              className={`py-1 text-center font-mono capitalize border-neo border-neo-ink rounded transition-all ${
                props.accent === acc ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {acc}
            </button>
          ))}
        </div>
      </div>

      {/* Default State */}
      <label className="flex items-center gap-2 cursor-pointer border-neo border-neo-ink p-2 rounded bg-neo-bg/50">
        <input
          type="checkbox"
          checked={!!props.defaultOpen}
          onChange={(e) => setProp((p: AccordionBlockProps) => (p.defaultOpen = e.target.checked))}
          className="w-4 h-4 accent-neo-ink rounded"
        />
        <span className="font-heading font-semibold text-neo-ink">Expanded by Default</span>
      </label>

      {/* Page Break Guardrail */}
      <label className="flex items-start gap-2.5 cursor-pointer border-neo border-neo-ink p-2.5 rounded bg-neo-bg/50">
        <input
          type="checkbox"
          checked={props.keepTogetherOnPageTurn ?? true}
          onChange={(e) => setProp((p: AccordionBlockProps) => (p.keepTogetherOnPageTurn = e.target.checked))}
          className="w-4 h-4 accent-neo-ink rounded mt-0.5"
        />
        <div className="flex flex-col">
          <span className="font-heading font-bold text-neo-ink flex items-center gap-1">
            <Bookmark className="w-3.5 h-3.5 text-neo-teal" />
            Keep on Same Page Turn
          </span>
          <span className="text-[10px] text-gray-500 font-mono mt-0.5">
            Prevents accordion summary and expanded text from splitting across e-reader screen pages.
          </span>
        </div>
      </label>
    </div>
  );
};

AccordionBlock.craft = {
  displayName: 'Interactive Reveal Accordion',
  props: {
    title: 'Historical Context: The Typography Revolution',
    badge: 'EXPLAINER',
    content: 'During the late Renaissance, the standardization of punch-cutting and movable metal type transformed reading from a luxury craft into a widespread medium of human culture. Responsive design carries this legacy into the screen era.',
    accent: 'yellow',
    defaultOpen: false,
    keepTogetherOnPageTurn: true,
  },
  related: {
    toolbar: AccordionSettings,
  },
};
