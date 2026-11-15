import React from 'react';
import { useEditor } from '@craftjs/core';
import { Trash2, Box, Info } from 'lucide-react';

export const BlockInspector: React.FC = () => {
  const { selected, actions } = useEditor((state) => {
    // Collect the first selected node ID
    const [currentNodeId] = state.events.selected;
    let selectedNode;
    if (currentNodeId) {
      selectedNode = {
        id: currentNodeId,
        name: state.nodes[currentNodeId].data.displayName || state.nodes[currentNodeId].data.name,
        settings: state.nodes[currentNodeId].related && state.nodes[currentNodeId].related.toolbar,
        isDeletable: (state.nodes[currentNodeId].rules as any)?.canDelete?.(state.nodes[currentNodeId]) ?? true,
      };
    }
    return {
      selected: selectedNode,
    };
  });

  if (!selected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 h-full">
        <div className="p-3 bg-neo-bg rounded-full border border-neo-ink mb-3">
          <Box className="w-6 h-6 text-gray-400" strokeWidth={2} />
        </div>
        <p className="font-heading font-bold text-sm text-neo-ink mb-1">
          No Block Selected
        </p>
        <p className="text-xs font-mono text-gray-500 max-w-[200px]">
          Click on any block in the canvas to inspect and edit art-direction properties.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Block Type Header & Delete */}
      <div className="p-3 border-b-neo border-neo-ink bg-neo-bg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-neo-vermilion" />
          <span className="font-heading font-bold text-xs uppercase tracking-wider text-neo-ink">
            {selected.name}
          </span>
        </div>
        {selected.isDeletable && (
          <button
            onClick={() => actions.delete(selected.id)}
            className="flex items-center gap-1 text-[11px] font-mono text-red-600 hover:text-red-700 bg-white border border-red-300 hover:border-red-600 px-2 py-1 rounded shadow-neo-sm transition-all"
            title="Delete block"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>Delete</span>
          </button>
        )}
      </div>

      {/* Inspector Form (Toolbar Settings) */}
      <div className="flex-1 overflow-y-auto p-4">
        {selected.settings ? (
          React.createElement(selected.settings)
        ) : (
          <div className="text-xs font-mono text-gray-400 p-2">
            No custom properties defined for this block.
          </div>
        )}
      </div>
    </div>
  );
};
