import React from 'react';
import { useNode, type UserComponent } from '@craftjs/core';

export type OrnamentType = 'asterisms' | 'solid-bar' | 'dotted' | 'diamond' | 'flourish';

export interface OrnamentDividerProps {
  type?: OrnamentType;
  spacingY?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const OrnamentDividerBlock: UserComponent<OrnamentDividerProps> = ({
  type = 'asterisms',
  spacingY = 'md',
  color = '#141414',
}) => {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
  } = useNode((node) => ({
    selected: node.events.selected,
    hovered: node.events.hovered,
  }));

  const getSpacingClass = () => {
    switch (spacingY) {
      case 'sm':
        return 'my-4';
      case 'lg':
        return 'my-12';
      case 'md':
      default:
        return 'my-8';
    }
  };

  const renderOrnament = () => {
    switch (type) {
      case 'solid-bar':
        return <div className="h-[3px] w-24 bg-neo-ink rounded-full mx-auto" style={{ backgroundColor: color }} />;
      case 'dotted':
        return (
          <div className="flex items-center justify-center gap-3">
            <span className="w-2 h-2 rounded-full bg-neo-ink" style={{ backgroundColor: color }} />
            <span className="w-2 h-2 rounded-full bg-neo-ink" style={{ backgroundColor: color }} />
            <span className="w-2 h-2 rounded-full bg-neo-ink" style={{ backgroundColor: color }} />
          </div>
        );
      case 'diamond':
        return (
          <div className="flex items-center justify-center gap-3">
            <span className="w-2.5 h-2.5 rotate-45 bg-neo-vermilion" />
            <span className="w-3.5 h-3.5 rotate-45 bg-neo-yellow border border-neo-ink" />
            <span className="w-2.5 h-2.5 rotate-45 bg-neo-teal" />
          </div>
        );
      case 'flourish':
        return (
          <div className="font-heading font-bold text-lg tracking-widest text-center" style={{ color }}>
            ~ ❦ ~
          </div>
        );
      case 'asterisms':
      default:
        return (
          <div className="flex items-center justify-center gap-4 text-base font-bold font-mono tracking-widest select-none" style={{ color }}>
            <span>✦</span>
            <span>✦</span>
            <span>✦</span>
          </div>
        );
    }
  };

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative group transition-all py-1 ${getSpacingClass()} ${
        selected ? 'ring-2 ring-neo-yellow ring-offset-2' : hovered ? 'outline outline-1 outline-dashed outline-neo-vermilion' : ''
      }`}
    >
      {renderOrnament()}
    </div>
  );
};

export const OrnamentDividerSettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as OrnamentDividerProps,
  }));

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Ornament Style
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { id: 'asterisms', label: 'Asterisms (✦ ✦ ✦)' },
              { id: 'solid-bar', label: 'Solid Bar' },
              { id: 'dotted', label: 'Dotted (• • •)' },
              { id: 'diamond', label: 'Neo Diamond' },
              { id: 'flourish', label: 'Floral (~ ❦ ~)' },
            ] as const
          ).map((orn) => (
            <button
              key={orn.id}
              type="button"
              onClick={() => setProp((p: OrnamentDividerProps) => (p.type = orn.id))}
              className={`py-1.5 text-center font-mono border-neo border-neo-ink rounded transition-all ${
                props.type === orn.id ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {orn.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Vertical Spacing
        </label>
        <div className="grid grid-cols-3 gap-1">
          {(['sm', 'md', 'lg'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setProp((p: OrnamentDividerProps) => (p.spacingY = s))}
              className={`py-1 text-center font-mono uppercase border-neo border-neo-ink rounded transition-all ${
                props.spacingY === s ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

OrnamentDividerBlock.craft = {
  displayName: 'Scene Break Ornament',
  props: {
    type: 'asterisms',
    spacingY: 'md',
    color: '#141414',
  },
  related: {
    toolbar: OrnamentDividerSettings,
  },
};
