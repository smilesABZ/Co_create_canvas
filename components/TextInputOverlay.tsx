// FILENAME: components/TextInputOverlay.tsx - VERSION: v2 (Export Config)
import React, { useState, useEffect, useRef } from 'react';

// Exporting the props interface to be used by other modules
export interface TextInputConfig {
  x: number;
  y: number;
  initialText?: string;
  color: string;
  fontSize: number;
  fontFamily: string;
  width?: number; 
  height?: number; 
  centerText?: boolean; 
  backgroundColor?: string; 
  targetId?: string; 
}
export interface TextInputOverlayProps extends TextInputConfig {
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

const TextInputOverlay: React.FC<TextInputOverlayProps> = ({ 
  x, y, initialText = '', color, fontSize, fontFamily, onSubmit, onCancel,
  width, height, centerText, backgroundColor = 'rgba(255, 255, 255, 0.95)'
  // targetId is part of TextInputConfig and thus available
}) => {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select(); 
      adjustTextareaHeight();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; 
      let newHeight = textareaRef.current.scrollHeight;
      if (height && newHeight > height - 10) { 
        newHeight = height - 10;
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };


  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    adjustTextareaHeight();
  };

  const handleSubmit = () => {
    onSubmit(text); 
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  let topPos = y;
  if (height && textareaRef.current) {
    const currentTextareaHeight = textareaRef.current.scrollHeight;
    if (currentTextareaHeight < height) {
        topPos = y + (height - currentTextareaHeight) / 2;
    } else {
        topPos = y + 5; 
    }
  } else if (height) {
     topPos = y + (height / 2) - (fontSize * 0.8); 
  }


  return (
    <textarea
      ref={textareaRef}
      value={text}
      onChange={handleTextChange}
      onKeyDown={handleKeyDown}
      onBlur={handleSubmit} 
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${topPos}px`, 
        color: color,
        fontSize: `${fontSize}px`,
        fontFamily: fontFamily,
        border: '1px dashed #3B82F6', 
        outline: 'none',
        padding: '4px',
        boxSizing: 'border-box',
        width: width ? `${width}px` : 'auto',
        minWidth: '50px',
        maxWidth: width ? `${width}px` : '300px',
        lineHeight: '1.2',
        background: backgroundColor,
        zIndex: 100,
        resize: 'none',
        overflowY: 'hidden',
        textAlign: centerText ? 'center' : 'left',
      }}
      placeholder="Type..."
      rows={1} 
    />
  );
};

export default TextInputOverlay;
