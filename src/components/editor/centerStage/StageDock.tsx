import React, { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

export type DockSlot = 'top' | 'drawer' | 'bottom';

export interface StageDockElements {
  top: HTMLElement | null;
  drawer: HTMLElement | null;
  bottom: HTMLElement | null;
}

/** Mount points for block tools that live outside the (scaled) device frame. Provided by the stage. */
export const StageDockContext = createContext<StageDockElements>({ top: null, drawer: null, bottom: null });

/**
 * Renders children into a stage dock (full stage width, never scaled or squeezed by the device preview).
 * Falls back to rendering in place when no dock exists. React state / handlers stay in the owning block.
 */
export const StageDockPortal: React.FC<{ slot: DockSlot; children: React.ReactNode }> = ({ slot, children }) => {
  const target = useContext(StageDockContext)[slot];
  return target ? createPortal(children, target) : <>{children}</>;
};
