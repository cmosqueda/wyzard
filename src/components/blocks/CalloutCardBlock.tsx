import React from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { Bookmark, Sparkles, AlertCircle, Info, Lightbulb, Quote } from 'lucide-react';

export type CalloutAccent = 'yellow' | 'vermilion' | 'teal' | 'violet' | 'ink';

export interface CalloutCardProps {
  accent?: CalloutAccent;
  icon?: 'sparkles' | 'info' | 'lightbulb' | 'quote' | 'alert';
  title?: string;
  content?: string;
  keepTogetherOnPageTurn?: boolean;
}

export const CalloutCardBlock: UserComponent<CalloutCardProps> = ({
  accent = 'yellow',
  icon = 'sparkles',
  title = 'EDITORIAL ASIDE',
  content = 'Magazine layouts rely on secondary information hierarchy. Callout boxes keep contextual notes, definitions, or lore tightly paired with primary text.',
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

  const getAccentClass = () => {
    switch (accent) {
      case 'vermilion':
        return 'bg-neo-vermilion/10 border-neo-vermilion text-neo-ink';
      case 'teal':
        return 'bg-neo-teal/15 border-neo-teal text-neo-ink';
      case 'violet':
        return 'bg-neo-violet/10 border-neo-violet text-neo-ink';
      case 'ink':
        return 'bg-neo-ink text-white border-neo-ink';
      case 'yellow':
      default:
        return 'bg-neo-yellow/25 border-neo-ink text-neo-ink';
    }
  };

  const getIconColorClass = () => {
    switch (accent) {
      case 'vermilion':
        return 'text-neo-vermilion';
      case 'teal':
        return 'text-neo-teal';
      case 'violet':
        return 'text-neo-violet';
      case 'ink':
        return 'text-neo-yellow';
      case 'yellow':
      default:
        return 'text-neo-ink';
    }
  };

  const renderIcon = () => {
    const cls = `w-4 h-4 ${getIconColorClass()}`;
    switch (icon) {
      case 'info':
        return <Info className={cls} strokeWidth={2.5} />;
      case 'lightbulb':
        return <Lightbulb className={cls} strokeWidth={2.5} />;
      case 'quote':
        return <Quote className={cls} strokeWidth={2.5} />;
      case 'alert':
        return <AlertCircle className={cls} strokeWidth={2.5} />;
      case 'sparkles':
      default:
        return <Sparkles className={cls} strokeWidth={2.5} />;
    }
  };

  return (
    <aside
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative group my-4 p-4 border-neo rounded-lg shadow-neo-sm transition-all ${getAccentClass()} ${
        selected ? 'ring-2 ring-neo-yellow ring-offset-2' : hovered ? 'outline outline-1 outline-dashed outline-neo-vermilion' : ''
      }`}
      style={{
        pageBreakInside: keepTogetherOnPageTurn ? 'avoid' : 'auto',
        breakInside: keepTogetherOnPageTurn ? 'avoid' : 'auto',
      }}
    >
      {/* Page break guardrail badge */}
      {keepTogetherOnPageTurn && (
        <span className="absolute top-2 right-2 z-10 flex items-center gap-0.5 text-[9px] font-mono bg-neo-teal text-neo-ink px-1.5 py-0.5 rounded shadow-neo-sm font-bold pointer-events-none">
          <Bookmark className="w-2.5 h-2.5" />
          Keep on Page
        </span>
      )}

      <div className="flex items-center gap-2 mb-2">
        {renderIcon()}
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            setProp((props: CalloutCardProps) => {
              props.title = e.currentTarget.textContent || '';
            });
          }}
          className="font-mono font-bold text-xs uppercase tracking-wider focus:outline-none"
        >
          {title}
        </span>
      </div>

      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          setProp((props: CalloutCardProps) => {
            props.content = e.currentTarget.textContent || '';
          });
        }}
        className="font-sans text-xs leading-relaxed focus:outline-none opacity-90"
      >
        {content}
      </div>
    </aside>
  );
};

export const CalloutCardSettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as CalloutCardProps,
  }));

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Accent Style
        </label>
        <div className="grid grid-cols-3 gap-1">
          {(['yellow', 'vermilion', 'teal', 'violet', 'ink'] as const).map((acc) => (
            <button
              key={acc}
              type="button"
              onClick={() => setProp((p: CalloutCardProps) => (p.accent = acc))}
              className={`py-1 text-center font-mono capitalize border-neo border-neo-ink rounded transition-all ${
                props.accent === acc ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {acc}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Icon
        </label>
        <div className="grid grid-cols-3 gap-1">
          {(['sparkles', 'info', 'lightbulb', 'quote', 'alert'] as const).map((ico) => (
            <button
              key={ico}
              type="button"
              onClick={() => setProp((p: CalloutCardProps) => (p.icon = ico))}
              className={`py-1 text-center font-mono capitalize border-neo border-neo-ink rounded transition-all ${
                props.icon === ico ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {ico}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer border-neo border-neo-ink p-2.5 rounded bg-neo-bg/50">
        <input
          type="checkbox"
          checked={props.keepTogetherOnPageTurn ?? true}
          onChange={(e) => setProp((p: CalloutCardProps) => (p.keepTogetherOnPageTurn = e.target.checked))}
          className="w-4 h-4 accent-neo-ink rounded mt-0.5"
        />
        <div className="flex flex-col">
          <span className="font-heading font-bold text-neo-ink flex items-center gap-1">
            <Bookmark className="w-3.5 h-3.5 text-neo-teal" />
            Keep on Same Page Turn
          </span>
          <span className="text-[10px] text-gray-500 font-mono mt-0.5">
            Prevents callout boxes from awkwardly splitting across page turns.
          </span>
        </div>
      </label>
    </div>
  );
};

CalloutCardBlock.craft = {
  displayName: 'Editorial Callout Box',
  props: {
    accent: 'yellow',
    icon: 'sparkles',
    title: 'EDITORIAL ASIDE',
    content: 'Magazine layouts rely on secondary information hierarchy. Callout boxes keep contextual notes, definitions, or lore tightly paired with primary text.',
    keepTogetherOnPageTurn: true,
  },
  related: {
    toolbar: CalloutCardSettings,
  },
};
