// FILENAME: components/DraggableModal.tsx - VERSION: v1
import React, { useState, useRef, useCallback, useEffect, ReactNode } from 'react';

interface DraggableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  initialPosition?: { x: number; y: number };
  width?: string;
  minWidth?: string;
  height?: string; 
  maxHeight?: string;
}

const DraggableModal: React.FC<DraggableModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  initialPosition = { x: 100, y: 100 },
  width = "500px",
  minWidth = "320px",
  height = "auto",
  maxHeight = "80vh",
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 }); 
  const modalStartPos = useRef({ x: 0, y: 0 }); 
  const modalRef = useRef<HTMLDivElement>(null);

  // Effect to reset position if initialPosition changes (e.g. when modal reopens)
  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y, isOpen]);


  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only allow dragging from the header itself
    const headerElement = modalRef.current?.querySelector('.draggable-header');
    if (headerElement && headerElement.contains(e.target as Node)) {
        e.preventDefault();
        setIsDragging(true);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        modalStartPos.current = position;
    }
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    let newX = modalStartPos.current.x + dx;
    let newY = modalStartPos.current.y + dy;

    const modalNode = modalRef.current;
    if (modalNode) {
        const modalWidth = modalNode.offsetWidth;
        const modalHeight = modalNode.offsetHeight;
        newX = Math.max(0, Math.min(newX, window.innerWidth - modalWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - modalHeight));
    } else { // Fallback if ref not available yet
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);
    }
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-300"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: width,
        minWidth: minWidth,
        height: height,
        maxHeight: maxHeight,
      }}
      role="dialog"
      aria-modal="true" 
      aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-title`}
    >
      <div 
        className="draggable-header flex justify-between items-center p-3 bg-gray-100 border-b border-gray-200 rounded-t-lg"
        onMouseDown={handleMouseDown} // Attach mouse down directly to header
      >
        <h2 id={`${title.replace(/\s+/g, '-').toLowerCase()}-title`} className="text-md font-semibold text-gray-700 select-none">{title}</h2>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-800 text-2xl leading-none p-1 -mr-1" // Adjusted padding for better click area
          aria-label={`Close ${title}`}
        >
          &times;
        </button>
      </div>
      <div className="p-4 flex-grow overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default DraggableModal;