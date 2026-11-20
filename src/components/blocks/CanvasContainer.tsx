import React from 'react';
import { useNode, type UserComponent } from '@craftjs/core';

export interface CanvasContainerProps {
  backgroundColor?: string;
  paddingY?: string;
  paddingX?: string;
  /** Minimum height of the page body. Fixed-layout pages use 100% so the body fills the page region. */
  minHeight?: string;
  children?: React.ReactNode;
}

export const CanvasContainer: UserComponent<CanvasContainerProps> = ({
  backgroundColor = 'transparent',
  paddingY = '2rem',
  paddingX = '1.5rem',
  minHeight = '700px',
  children,
}) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      data-drop-zone="true"
      className="w-full flex flex-col gap-6 transition-all duration-200"
      style={{
        backgroundColor,
        minHeight,
        paddingTop: paddingY,
        paddingBottom: paddingY,
        paddingLeft: paddingX,
        paddingRight: paddingX,
      }}
    >
      {children}
    </div>
  );
};

CanvasContainer.craft = {
  displayName: 'Page Flow Canvas',
  props: {
    backgroundColor: 'transparent',
    paddingY: '2rem',
    paddingX: '1.5rem',
    minHeight: '700px',
  },
  rules: {
    canDrag: () => false,
  },
};
