// FILENAME: components/ContentBoxEditorModal.tsx - VERSION: v1
import React, { useState, useEffect } from 'react';
import { ContentType } from '../types';

interface ContentBoxEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newContent: string) => void;
  initialContent: string;
  contentType: ContentType;
  filename?: string;
  title?: string;
}

const ContentBoxEditorModal: React.FC<ContentBoxEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialContent,
  contentType,
  filename,
  title = "Edit Content"
}) => {
  const [editedContent, setEditedContent] = useState(initialContent);

  useEffect(() => {
    if (isOpen) {
      setEditedContent(initialContent);
    }
  }, [isOpen, initialContent]);

  const handleSave = () => {
    onSave(editedContent);
  };

  if (!isOpen) return null;

  const displayTitle = filename ? `${title}: ${filename} (${contentType})` : `${title}: ${contentType}`;

  return (
    <div className="flex flex-col h-full">
      <p className="text-sm text-gray-600 mb-2">
        Editing content for: <span className="font-semibold">{displayTitle}</span>
      </p>
      <textarea
        value={editedContent}
        onChange={(e) => setEditedContent(e.target.value)}
        placeholder="Enter content here..."
        className="w-full flex-grow p-2 border border-gray-300 rounded-md mb-3 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
        rows={15} // Adjust as needed
        aria-label="Content Editor"
      />
      <div className="mt-auto flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default ContentBoxEditorModal;
