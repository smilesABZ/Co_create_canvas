// FILENAME: components/MermaidModalContent.tsx - VERSION: v1
import React from 'react';

interface MermaidInputModalContentProps {
  mermaidSyntax: string;
  onMermaidSyntaxChange: (syntax: string) => void;
  onRender: () => void;
  isLoading: boolean;
  error: string | null;
}

const MermaidInputModalContent: React.FC<MermaidInputModalContentProps> = ({
  mermaidSyntax,
  onMermaidSyntaxChange,
  onRender,
  isLoading,
  error,
}) => {
  return (
    <div className="flex flex-col h-full">
      <p className="text-sm text-gray-600 mb-2">
        Enter your Mermaid diagram syntax below. 
        For examples, visit the <a href="https://mermaid.js.org/intro/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Mermaid documentation</a>.
      </p>
      <textarea
        value={mermaidSyntax}
        onChange={(e) => onMermaidSyntaxChange(e.target.value)}
        placeholder={`graph TD;\n    A-->B;\n    A-->C;\n    B-->D;\n    C-->D;`}
        className="w-full flex-grow p-2 border border-gray-300 rounded-md mb-3 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
        rows={10}
        aria-label="Mermaid Syntax Input"
        disabled={isLoading}
      />
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-3 text-sm" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline ml-1 whitespace-pre-wrap">{error}</span>
        </div>
      )}

      <div className="mt-auto flex justify-end gap-2">
        <button
          onClick={onRender}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition disabled:bg-green-300 text-sm"
          disabled={isLoading || !mermaidSyntax.trim()}
        >
          {isLoading ? 'Rendering...' : 'Render to Whiteboard'}
        </button>
      </div>
    </div>
  );
};

export default MermaidInputModalContent;
