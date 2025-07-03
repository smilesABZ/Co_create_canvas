
// FILENAME: src/features/mermaid/useMermaid.ts - VERSION: v1
// Updated to v2: Enable editing of existing Mermaid diagrams.
import { useState, useCallback } from 'react';
import { ImageElement, Tool } from '../../../types';
import { ElementManagerHook } from '../elementManager/useElementManager';
import { CanvasViewHook } from '../canvasView/useCanvasView';
import { ToolManagerHook } from '../toolManager/useToolManager';


interface UseMermaidProps {
  elementManager: ElementManagerHook;
  canvasView: CanvasViewHook;
  toolManager: ToolManagerHook;
  canvasRenderWidth: number;
  canvasRenderHeight: number;
}

export interface MermaidHook {
  showMermaidModal: boolean;
  mermaidSyntax: string;
  setMermaidSyntax: React.Dispatch<React.SetStateAction<string>>;
  mermaidError: string | null;
  isMermaidRendering: boolean;
  openMermaidModal: (initialSyntax?: string, imageIdToEdit?: string) => void; // Updated signature
  closeMermaidModal: () => void;
  renderMermaidToCanvas: () => Promise<void>;
}

declare global {
  interface Window { mermaid?: any; } // Make mermaid optional on window
}

export const useMermaid = ({
  elementManager,
  canvasView,
  toolManager,
  canvasRenderWidth,
  canvasRenderHeight,
}: UseMermaidProps): MermaidHook => {
  const { addElement, updateElement, getElementById, setSelectedElementId } = elementManager; // Added updateElement, getElementById
  const { viewBoxX, viewBoxY } = canvasView;
  const { setCurrentTool } = toolManager;

  const [showMermaidModal, setShowMermaidModal] = useState<boolean>(false);
  const [mermaidSyntax, setMermaidSyntax] = useState<string>('');
  const [mermaidError, setMermaidError] = useState<string | null>(null);
  const [isMermaidRendering, setIsMermaidRendering] = useState<boolean>(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null); // New state for editing

  const openMermaidModal = useCallback((initialSyntax?: string, imageIdToEdit?: string) => {
    setMermaidSyntax(initialSyntax || 'graph TD;\n    A-->B;\n    A-->C;\n    B-->D;\n    C-->D;');
    setEditingImageId(imageIdToEdit || null);
    setMermaidError(null);
    setShowMermaidModal(true);
  }, []);

  const closeMermaidModal = useCallback(() => {
    setShowMermaidModal(false);
    setEditingImageId(null); 
  }, []);

  const renderMermaidToCanvas = useCallback(async () => {
    const currentEditingId = editingImageId; // Capture at start of async op
    const originalSyntax = mermaidSyntax; // Capture syntax at start

    if (!originalSyntax.trim()) {
      setMermaidError("Mermaid syntax cannot be empty.");
      return;
    }
    if (!window.mermaid) {
        setMermaidError("Mermaid library is not loaded. Please ensure it's included in your HTML.");
        return;
    }

    setIsMermaidRendering(true);
    setMermaidError(null);

    let operationCompleted = false;
    const RENDER_TIMEOUT = 15000; // 15 seconds
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanupAndComplete = (errorMsg?: string) => {
        if (operationCompleted) return;
        clearTimeout(timeoutId);
        operationCompleted = true;
        setIsMermaidRendering(false);
        if (errorMsg) {
            setMermaidError(errorMsg);
        }
    };
    
    timeoutId = setTimeout(() => {
        if (!operationCompleted) {
            cleanupAndComplete("Mermaid rendering timed out. The diagram might be too complex or invalid.");
        }
    }, RENDER_TIMEOUT);

    try {
        try {
             await window.mermaid.parse(originalSyntax);
        } catch (e: unknown) {
            let parseErrorMessage = "Invalid Mermaid Syntax.";
            if (e instanceof Error) parseErrorMessage = e.message;
            else if (typeof (e as any)?.str === 'string') parseErrorMessage = (e as any).str;
            cleanupAndComplete(`Mermaid Syntax Error: ${parseErrorMessage}. Check console for details.`);
            return;
        }

        const renderId = `mermaid-render-${Date.now()}`;
        const { svg: rawSvgCode } = await window.mermaid.render(renderId, originalSyntax);
        
        let finalSvgCode = rawSvgCode;
        try { 
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(rawSvgCode, "image/svg+xml");
            const svgElement = svgDoc.documentElement;
            if (svgElement.tagName.toLowerCase() === 'parsererror' || svgElement.querySelector('parsererror')) {
                console.warn("Mermaid SVG had parsing issues, attempting to use raw output. Error:", svgElement.textContent);
            } else {
                if (!svgElement.getAttribute('viewBox') && svgElement.getAttribute('width') && svgElement.getAttribute('height')) {
                    svgElement.setAttribute('viewBox', `0 0 ${svgElement.getAttribute('width')} ${svgElement.getAttribute('height')}`);
                }
                const serializer = new XMLSerializer();
                finalSvgCode = serializer.serializeToString(svgElement);
            }
        } catch(svgProcessingError: any) {
            console.warn("Error processing raw SVG from Mermaid, using it as is:", svgProcessingError);
        }


        if (!finalSvgCode || finalSvgCode.trim() === '' || finalSvgCode.includes("<parsererror")) {
            cleanupAndComplete("Mermaid rendered an empty or invalid SVG. Check syntax/complexity.");
            return;
        }

        const svgBlob = new Blob([finalSvgCode], { type: 'image/svg+xml;charset=utf-8' });
        const reader = new FileReader();

        reader.onloadend = () => { 
            if (operationCompleted) return;
            if (reader.error) {
                console.error("FileReader error converting SVG Blob to Data URL:", reader.error);
                cleanupAndComplete("Error converting SVG to an image. Check console.");
                return;
            }

            const dataUrl = reader.result as string;
            if (!dataUrl) {
                cleanupAndComplete("Failed to generate Data URL from SVG. Check console.");
                return;
            }
            const img = new Image();

            img.onload = () => {
                if (operationCompleted) return;
                const imgNaturalWidth = img.naturalWidth || 300; 
                const imgNaturalHeight = img.naturalHeight || 200; 
                const margin = 20;
                const maxWidth = canvasRenderWidth - margin * 2;
                const maxHeight = canvasRenderHeight - margin * 2;
                let displayWidth = imgNaturalWidth;
                let displayHeight = imgNaturalHeight;

                if (displayWidth > maxWidth || displayHeight > maxHeight) {
                    const ratio = Math.min(maxWidth / displayWidth, maxHeight / displayHeight);
                    displayWidth = displayWidth * ratio;
                    displayHeight = displayHeight * ratio;
                }
                
                if (currentEditingId) {
                    const existingElement = getElementById(currentEditingId);
                    if (existingElement && existingElement.type === 'image') {
                        const updatedImageElement: ImageElement = {
                            ...existingElement,
                            src: dataUrl,
                            naturalWidth: imgNaturalWidth,
                            naturalHeight: imgNaturalHeight,
                            width: displayWidth, // Recalculate display size based on new SVG
                            height: displayHeight,
                            mermaidSyntax: originalSyntax, // Store the new syntax
                            aiSummary: undefined, // Clear summary as content changed
                            aiSummaryVisible: false,
                            aiSummaryLoading: false,
                        };
                        updateElement(updatedImageElement);
                        setSelectedElementId(currentEditingId);
                        // Trigger new summary generation for the updated element
                        if (elementManager.elements.find(el => el.id === currentEditingId)?.type === 'image' && toolManager.currentTool !== Tool.PAN) { // Check if it is still an image
                            const geminiHook = (window as any).geminiHookInstance; // Access global instance if needed
                            if (geminiHook?.triggerAutomaticSummaryGeneration) {
                                geminiHook.triggerAutomaticSummaryGeneration(updatedImageElement);
                            }
                        }
                    } else {
                        console.error("Failed to find existing image element to update:", currentEditingId);
                    }
                } else {
                    const newImageElement: ImageElement = {
                        id: `mermaid-image-${Date.now()}`, type: 'image', src: dataUrl, 
                        x: viewBoxX + Math.max(margin, (canvasRenderWidth - displayWidth) / 2),
                        y: viewBoxY + Math.max(margin, (canvasRenderHeight - displayHeight) / 2),
                        width: displayWidth, height: displayHeight,
                        naturalWidth: imgNaturalWidth, naturalHeight: imgNaturalHeight,
                        mermaidSyntax: originalSyntax, // Store the syntax
                    };
                    addElement(newImageElement);
                    setSelectedElementId(newImageElement.id);
                }
                
                closeMermaidModal();
                cleanupAndComplete();
            };
            img.onerror = () => {
                cleanupAndComplete("Failed to load rendered Mermaid diagram as image. The SVG data might be invalid.");
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(svgBlob);

    } catch (error: any) {
        console.error("Error rendering Mermaid diagram:", error);
        cleanupAndComplete(`An error occurred: ${error.message || "Unknown Mermaid rendering error"}`);
    }
  }, [
    mermaidSyntax, 
    editingImageId, // Add editingImageId to dependencies
    addElement, 
    updateElement, // Add updateElement
    getElementById, // Add getElementById
    setCurrentTool, 
    setSelectedElementId, 
    closeMermaidModal, 
    canvasRenderWidth, 
    canvasRenderHeight, 
    viewBoxX, 
    viewBoxY,
    elementManager, // For full elementManager dependency if needed for geminiHook access
    toolManager // For full toolManager dependency
  ]);

  return {
    showMermaidModal,
    mermaidSyntax,
    setMermaidSyntax,
    mermaidError,
    isMermaidRendering,
    openMermaidModal,
    closeMermaidModal,
    renderMermaidToCanvas,
  };
};