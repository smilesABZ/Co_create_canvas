
// FILENAME: components/GeminiDisplay.tsx - VERSION: v2 (Display Grounding Metadata)
// Updated to v3: Added Action Words Dropdown
import React from 'react';
import { GroundingMetadata, GroundingChunk, WebChunk } from '../types'; // Assuming types are in types.ts at root

interface GeminiModalContentProps {
  isLoading: boolean;
  error: string | null;
  responseText: string | null;
  showPromptInput: boolean;
  userPrompt?: string;
  onUserPromptChange?: (prompt: string) => void;
  onSendPrompt?: () => void;
  sendButtonText?: string;
  placeholderText?: string;
  promptAreaPlaceholder?: string;
  groundingMetadata?: GroundingMetadata;
  actionWords?: string[];
  onActionWordSelect?: (actionWord: string) => void;
}

const GeminiModalContent: React.FC<GeminiModalContentProps> = ({
  isLoading,
  error,
  responseText,
  showPromptInput,
  userPrompt,
  onUserPromptChange,
  onSendPrompt,
  sendButtonText = "Send",
  placeholderText = "Gemini's response will appear here.",
  promptAreaPlaceholder = "Type your question or drawing request...",
  groundingMetadata,
  actionWords,
  onActionWordSelect,
}) => {
  const renderGroundingChunks = (chunks: GroundingChunk[]) => {
    return (
      <div className="mt-4 pt-3 border-t border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 mb-1">Sources:</h4>
        <ul className="list-none p-0 text-xs">
          {chunks.map((chunk, index) => {
            const sourceInfo: WebChunk | undefined = chunk.web || chunk.searchResult;
            if (sourceInfo && sourceInfo.uri) {
              return (
                <li key={index} className="mb-1.5">
                  {sourceInfo.title && (
                    <a
                      href={sourceInfo.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black hover:underline focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                      title={`Open source: ${sourceInfo.title}`}
                    >
                      {sourceInfo.title}
                    </a>
                  )}
                  <span
                    className={`ml-1 text-gray-500 ${sourceInfo.title ? '(Source: ' : ''}${sourceInfo.uri}${sourceInfo.title ? ')' : ''}`}
                    aria-label={`Source URL: ${sourceInfo.uri}`}
                  >
                    {!sourceInfo.title && sourceInfo.uri} {/* Display URI if no title */}
                  </span>
                </li>
              );
            }
            return null; 
          })}
        </ul>
      </div>
    );
  };

  const handleActionSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (onActionWordSelect && event.target.value) {
      onActionWordSelect(event.target.value);
      event.target.value = ""; // Reset dropdown after selection
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-grow overflow-y-auto mb-4 prose prose-sm max-w-none">
        {isLoading && !responseText && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-gray-600">Gemini is thinking...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-3" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline ml-1">{error}</span>
          </div>
        )}

        {responseText && (
          <p className="text-gray-700 whitespace-pre-wrap">
            {responseText}
            {isLoading && <span className="italic text-gray-500 text-sm"> (Updating...)</span>}
          </p>
        )}
        
        {!isLoading && !error && !responseText && (
          <p className="text-gray-500 italic">{placeholderText}</p>
        )}

        {/* Display Grounding Metadata */}
        {groundingMetadata && groundingMetadata.groundingChunks && groundingMetadata.groundingChunks.length > 0 && (
          renderGroundingChunks(groundingMetadata.groundingChunks)
        )}
      </div>

      {showPromptInput && onUserPromptChange && onSendPrompt && (
        <div className="mt-auto pt-4 border-t border-gray-200">
          {actionWords && actionWords.length > 0 && onActionWordSelect && (
            <div className="mb-2">
              <label htmlFor="action-word-select" className="sr-only">Select an action word</label>
              <select
                id="action-word-select"
                onChange={handleActionSelect}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                aria-label="Quick actions for prompt"
                defaultValue=""
              >
                <option value="" disabled>Choose an action...</option>
                {actionWords.map(word => (
                  <option key={word} value={word}>{word}</option>
                ))}
              </select>
            </div>
          )}
          <textarea
            value={userPrompt || ''}
            onChange={(e) => onUserPromptChange(e.target.value)}
            placeholder={promptAreaPlaceholder}
            className="w-full p-2 border border-gray-300 rounded-md mb-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            rows={3}
            aria-label="Prompt to Gemini"
            disabled={isLoading}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={onSendPrompt}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:bg-blue-300 text-sm"
              disabled={isLoading || !userPrompt?.trim()}
            >
              {isLoading ? 'Sending...' : sendButtonText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeminiModalContent;
