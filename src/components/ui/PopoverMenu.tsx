import React, { useEffect, useRef, useState } from 'react';

interface PopoverMenuProps {
  title: string;
  label?: string;
  icon: React.ReactNode;
  align?: 'left' | 'right';
  buttonClassName?: string;
  children: (close: () => void) => React.ReactNode;
}

/** Small toolbar button that opens a popover menu (closes on outside click / Escape). */
export const PopoverMenu: React.FC<PopoverMenuProps> = ({
  title,
  label,
  icon,
  align = 'left',
  buttonClassName = '',
  children,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative" data-no-block-drag>
      <button
        type="button"
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className={`px-2 py-1.5 rounded flex items-center gap-1 font-bold transition-colors ${buttonClassName}`}
      >
        {icon}
        {label && <span>{label}</span>}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-40 mt-1 p-1.5 bg-white border-neo border-neo-ink rounded-lg shadow-neo ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};
