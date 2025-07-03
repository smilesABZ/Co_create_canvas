// FILENAME: src/features/elementManager/useElementManager.ts - VERSION: v1
import { useState, useEffect, useCallback } from 'react';
import { WhiteboardElement, ImageElement, Point } from '../../../types';
import { DEFAULT_SESSION_NAME } from '../../../constants';

export interface ElementManagerHook {
  elements: WhiteboardElement[];
  setElements: React.Dispatch<React.SetStateAction<WhiteboardElement[]>>;
  addElement: (element: WhiteboardElement) => void;
  updateElement: (updatedElement: WhiteboardElement) => void;
  removeElement: (elementId: string) => void;
  clearCanvasElements: () => void;
  selectedElementId: string | null;
  setSelectedElementId: React.Dispatch<React.SetStateAction<string | null>>;
  imageObjects: Record<string, HTMLImageElement>;
  getImageObject: (id: string) => HTMLImageElement | undefined;
  getElementById: (id: string) => WhiteboardElement | undefined; // Added
  sessionName: string;
  onSessionNameChange: (name: string) => void;
}

export const useElementManager = (): ElementManagerHook => {
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [imageObjects, setImageObjects] = useState<Record<string, HTMLImageElement>>({});
  const [sessionName, setSessionName] = useState<string>(DEFAULT_SESSION_NAME);

  const addElement = useCallback((element: WhiteboardElement) => {
    setElements(prev => [...prev, element]);
  }, []);

  const updateElement = useCallback((updatedElement: WhiteboardElement) => {
    setElements(prev => prev.map(el => el.id === updatedElement.id ? updatedElement : el));
  }, []);

  const removeElement = useCallback((elementId: string) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  }, [selectedElementId]);

  const clearCanvasElements = useCallback(() => {
    setElements([]);
    setSelectedElementId(null);
    setImageObjects({});
  }, []);

  const onSessionNameChange = (name: string) => {
    setSessionName(name);
  };
  
  const getImageObject = useCallback((id: string) => imageObjects[id], [imageObjects]);

  const getElementById = useCallback((id: string): WhiteboardElement | undefined => {
    return elements.find(el => el.id === id);
  }, [elements]);

  useEffect(() => {
    const newImageObjectsStateUpdate: Record<string, HTMLImageElement> = {};
    let changed = false;
    
    elements.forEach(el => {
      if (el.type === 'image' && el.src) {
        if (!imageObjects[el.id] || imageObjects[el.id].src !== el.src) {
          const img = new Image();
          img.onload = () => {
            setImageObjects(prev => ({ ...prev, [el.id]: img }));
          };
          img.onerror = () => {
            console.error(`Failed to load image for element ID: ${el.id}, SRC: ${el.src.substring(0,100)}...`);
             setImageObjects(prev => {
                const updated = {...prev};
                delete updated[el.id]; 
                return updated;
            });
          };
          img.src = el.src;
          newImageObjectsStateUpdate[el.id] = img; 
          changed = true;
        } else if (imageObjects[el.id]) {
          newImageObjectsStateUpdate[el.id] = imageObjects[el.id]; 
        }
      }
    });

    Object.keys(imageObjects).forEach(id => {
      if (!elements.find(el => el.type === 'image' && el.id === id)) {
        changed = true; 
      } else if (!newImageObjectsStateUpdate[id]) { 
        changed = true;
      }
    });

    if (changed) {
      const finalImageObjectsForState: Record<string, HTMLImageElement> = {};
      elements.forEach(el => {
        if (el.type === 'image') {
          if (newImageObjectsStateUpdate[el.id]) {
            finalImageObjectsForState[el.id] = newImageObjectsStateUpdate[el.id];
          } else if (imageObjects[el.id]) { 
            finalImageObjectsForState[el.id] = imageObjects[el.id];
          }
        }
      });
      setImageObjects(finalImageObjectsForState);
    }
  }, [elements, imageObjects]);

  return {
    elements,
    setElements,
    addElement,
    updateElement,
    removeElement,
    clearCanvasElements,
    selectedElementId,
    setSelectedElementId,
    imageObjects,
    getImageObject,
    getElementById, // Added
    sessionName,
    onSessionNameChange,
  };
};