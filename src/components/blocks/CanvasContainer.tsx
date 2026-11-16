import React from 'react';
import { useNode, type UserComponent } from '@craftjs/core';

export interface CanvasContainerProps {
  backgroundColor?: string;
  paddingY?: string;
  paddingX?: string;
  children?: React.ReactNode;
}

export const CanvasContainer: UserComponent<CanvasContainerProps> = ({
  backgroundColor = 'transparent',
  paddingY = '2rem',
  paddingX = '1.5rem',
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
      className="w-full min-h-[700px] flex flex-col gap-6 transition-all duration-200"
      style={{
        backgroundColor,
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
  },
  rules: {
    canDrag: () => false,
  },
};
