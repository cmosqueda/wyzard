import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Render a divider instead of an item */
  separator?: boolean;
  /** Render a small non-clickable section title instead of an item */
  heading?: string;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

/** Floating right-click menu, positioned at the cursor and kept inside the viewport. */
export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const margin = 8;
    setPos({
      left: Math.max(margin, Math.min(x, window.innerWidth - width - margin)),
      top: Math.max(margin, Math.min(y, window.innerHeight - height - margin)),
    });
  }, [x, y, items.length]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onOtherContext = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('contextmenu', onOtherContext, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('blur', onClose);
    window.addEventListener('wheel', onClose, { passive: true, capture: true });
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('contextmenu', onOtherContext, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('wheel', onClose, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      data-no-block-drag
      data-context-menu="true"
      onContextMenu={(e) => e.preventDefault()}
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-[200] min-w-[190px] bg-white text-neo-ink border-neo border-neo-ink rounded-lg shadow-neo p-1 text-xs font-mono select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {items.map((item) => {
        if (item.separator) return <div key={item.id} className="my-1 h-px bg-neo-ink/15" />;
        if (item.heading) {
          return (
            <div
              key={item.id}
              className="px-2.5 pt-1 pb-0.5 text-[9px] uppercase tracking-wider text-gray-500 font-bold truncate max-w-[240px]"
            >
              {item.heading}
            </div>
          );
        }
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onClose();
              item.onClick?.();
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              item.danger
                ? 'text-red-600 hover:bg-red-50 disabled:hover:bg-transparent'
                : 'hover:bg-neo-yellow/50 disabled:hover:bg-transparent'
            }`}
          >
            <span className="w-4 h-4 flex items-center justify-center shrink-0">{item.icon}</span>
            <span className="flex-1 whitespace-nowrap">{item.label}</span>
            {item.shortcut && <span className="text-[10px] text-gray-400 ml-3">{item.shortcut}</span>}
          </button>
        );
      })}
    </div>,
    document.body
  );
};
