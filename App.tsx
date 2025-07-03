
// FILENAME: App.tsx - VERSION: v30 (Zoom Feature)
// Updated to v23 to pass groundingMetadata to GeminiDisplay modals.
// Updated to v24 to pass viewBoxX and viewBoxY to useGemini for content box placement.
// Updated to v25 to simplify getCanvasImageBase64 to capture the visible viewport.
// Updated to v26 to pass actionWords and onActionWordSelect for Gemini interaction modal.
// Updated to v27 to wire up Save/Load Session buttons in Toolbar.
// Updated to v28 to pass mermaidHook to useInteractionManager for editing.
// Updated to v29 to ensure getCanvasContentImageBase64 captures the entire logical canvas.
// Updated to v30 to implement canvas zoom functionality.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Tool, 
  WhiteboardElement, 
  Point, // Added Point for zoomAtPoint
  // ... other types ...
  TextElement, // For text input config
  FlowchartShapeElement, EmojiElement, ImageElement, ConnectorElement, ContentBoxElement, ShapeType
} from './types';
import { 
  FALLBACK_CANVAS_WIDTH, 
  FALLBACK_CANVAS_HEIGHT,
  DEFAULT_FONT_SIZE, // For text input config
  DEFAULT_FONT_FAMILY, // For text input config
  ZOOM_STEP_BUTTON, // For zoom buttons
  ZOOM_STEP_WHEEL, // For mouse wheel zoom
} from './constants';

import Toolbar from './components/Toolbar';
import DraggableModal from './components/DraggableModal'; 
import GeminiModalContent from './components/GeminiDisplay'; 
import TextInputOverlay, { TextInputConfig } from './components/TextInputOverlay';
import MermaidInputModalContent from './components/MermaidInputModalContent';
import ContentBoxEditorModal from './components/ContentBoxEditorModal'; 

import { useToolManager } from './src/features/toolManager/useToolManager';
import { useElementManager } from './src/features/elementManager/useElementManager';
import { useCanvasView } from './src/features/canvasView/useCanvasView';
import { useTextEditing } from './src/features/textEditing/useTextEditing';
import { useGemini, GeminiHook } from './src/features/gemini/useGemini'; 
import { useFileOperations } from './src/features/fileOperations/useFileOperations';
import { useMermaid, MermaidHook } from './src/features/mermaid/useMermaid';
import { useInteractionManager } from './src/features/interactions/useInteractionManager';

import { 
  drawPath, drawTextElement, drawFlowchartShape, drawConnector, 
  drawImageElement, drawEmojiElement, drawContentBoxElement, 
  drawSelectionOutline, drawResizeHandlesForElement,
  getElementBoundingBox, drawConnectorHandles, drawSnapTargetHighlight,
  drawElementActionButtons, drawAISummaryText 
} from './src/features/canvas/canvasUtils'; // Corrected path
import { doBoundingBoxesIntersect } from './src/utils/geometryUtils';
import { getTextColorForBackground } from './src/utils/colorUtils';


declare global {
  interface Window { html2canvas?: any; mermaid?: any; geminiHookInstance?: GeminiHook } 
}

const App: React.FC = () => {
  const toolManager = useToolManager();
  const elementManager = useElementManager();
  const canvasView = useCanvasView();
  const textEditing = useTextEditing();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null); 
  
  const [canvasRenderWidth, setCanvasRenderWidth] = useState<number>(FALLBACK_CANVAS_WIDTH);
  const [canvasRenderHeight, setCanvasRenderHeight] = useState<number>(FALLBACK_CANVAS_HEIGHT);

  const [isContentBoxEditorOpen, setIsContentBoxEditorOpen] = useState<boolean>(false);
  const [editingContentBoxElement, setEditingContentBoxElement] = useState<ContentBoxElement | null>(null);

  const handleOpenContentBoxEditor = useCallback((element: ContentBoxElement) => {
    setEditingContentBoxElement(element);
    setIsContentBoxEditorOpen(true);
  }, []);

  const handleCloseContentBoxEditor = useCallback(() => {
    setIsContentBoxEditorOpen(false);
    setEditingContentBoxElement(null);
  }, []);

  const geminiHook = useGemini({ 
    elementManager,
    toolManager,
    getCanvasImageBase64: () => getCanvasContentImageBase64(), 
    canvasRenderWidth, // Pass current render dimensions
    canvasRenderHeight,
    viewBoxX: canvasView.viewBoxX, 
    viewBoxY: canvasView.viewBoxY, 
  });
  
  useEffect(() => {
    (window as any).geminiHookInstance = geminiHook;
    return () => { delete (window as any).geminiHookInstance; };
  }, [geminiHook]);


  const handleSaveContentBoxEditor = useCallback((newContent: string) => {
    if (editingContentBoxElement) {
      const updatedElement = { ...editingContentBoxElement, content: newContent };
      elementManager.updateElement(updatedElement);
    }
    handleCloseContentBoxEditor();
  }, [editingContentBoxElement, elementManager, handleCloseContentBoxEditor]);

  
  const mermaidHook = useMermaid({ 
    elementManager, canvasView, toolManager,
    canvasRenderWidth, canvasRenderHeight,
  });

  const interactionManager = useInteractionManager({
    toolManager, elementManager, canvasView, textEditing,
    canvasRef, canvasRenderWidth, canvasRenderHeight,
    onEditContentBox: handleOpenContentBoxEditor,
  });

  const getCanvasContentImageBase64 = useCallback((): string | null => {
    const currentElements = elementManager.elements;
    if (currentElements.length === 0) return null;
    
    const previouslySelected = elementManager.selectedElementId;
    if (previouslySelected) elementManager.setSelectedElementId(null);

    const tempDrawingCtx = document.createElement('canvas').getContext('2d');
    if (!tempDrawingCtx) {
      if (previouslySelected) elementManager.setSelectedElementId(previouslySelected);
      return null;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    currentElements.forEach(element => {
        const bbox = getElementBoundingBox(element, tempDrawingCtx); // Uses virtual coords
        if (bbox) {
            minX = Math.min(minX, bbox.x);
            minY = Math.min(minY, bbox.y);
            maxX = Math.max(maxX, bbox.x + bbox.width);
            maxY = Math.max(maxY, bbox.y + bbox.height);
        }
    });

    if (minX === Infinity) { 
      if (previouslySelected) elementManager.setSelectedElementId(previouslySelected);
      return null; 
    }
    
    const padding = 20; // Virtual padding
    const captureCanvasWidth = Math.max(1, (maxX - minX) + padding * 2);
    const captureCanvasHeight = Math.max(1, (maxY - minY) + padding * 2);
    const captureViewBoxX = minX - padding; // This is like a viewBox for the temp canvas
    const captureViewBoxY = minY - padding;

    const tempCanvas = document.createElement('canvas');
    // For high-res capture, consider a multiplier, but for now 1:1 virtual to pixel
    tempCanvas.width = captureCanvasWidth; 
    tempCanvas.height = captureCanvasHeight;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      if (previouslySelected) elementManager.setSelectedElementId(previouslySelected);
      return null;
    }

    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw elements onto temp canvas, using a zoom level of 1 for capture
    // and the calculated captureViewBoxX/Y.
    currentElements.forEach(element => {
        tempCtx.lineCap = 'round'; tempCtx.lineJoin = 'round';
        if (element.type === 'path') drawPath(tempCtx, element, captureViewBoxX, captureViewBoxY, 1);
        else if (element.type === 'text') drawTextElement(tempCtx, element, captureViewBoxX, captureViewBoxY, 1);
        else if (element.type === 'flowchart-shape') drawFlowchartShape(tempCtx, element, captureViewBoxX, captureViewBoxY, 1);
        else if (element.type === 'connector') drawConnector(tempCtx, element, captureViewBoxX, captureViewBoxY, 1);
        else if (element.type === 'image') drawImageElement(tempCtx, element, elementManager.getImageObject(element.id), captureViewBoxX, captureViewBoxY, 1);
        else if (element.type === 'emoji') drawEmojiElement(tempCtx, element, captureViewBoxX, captureViewBoxY, 1);
        else if (element.type === 'content-box') drawContentBoxElement(tempCtx, element, captureViewBoxX, captureViewBoxY, 1);
    });
    
    const dataUrl = tempCanvas.toDataURL('image/png').split(',')[1];
    if (previouslySelected) elementManager.setSelectedElementId(previouslySelected); 
    
    return dataUrl;
  }, [elementManager.elements, elementManager.selectedElementId, elementManager.setSelectedElementId, elementManager.getImageObject]);


  const getFullAppScreenshotBase64 = useCallback(async (): Promise<string | null> => {
    if (!window.html2canvas) { console.error("html2canvas library is not loaded."); return null; }
    const appContainer = document.getElementById('app-container');
    if (!appContainer) { console.error("App container not found for screenshot."); return null; }
    try {
      const canvas = await window.html2canvas(appContainer, { allowTaint: true, useCORS: true, logging: false });
      return canvas.toDataURL('image/png').split(',')[1];
    } catch (error) { console.error("Error taking full app screenshot:", error); return null; }
  }, []);


  const fileOperationsHook = useFileOperations({
    elementManager, canvasView, geminiHook, 
    getCanvasImageBase64: getCanvasContentImageBase64,
    getFullAppScreenshotBase64: getFullAppScreenshotBase64, 
    canvasRenderWidth, canvasRenderHeight,
    setCurrentTool: toolManager.setCurrentTool,
    setSelectedElementId: elementManager.setSelectedElementId,
  });
  
  useEffect(() => {
    if (geminiHook && interactionManager.setGeminiHook) interactionManager.setGeminiHook(geminiHook);
    if (mermaidHook && interactionManager.setMermaidHook) interactionManager.setMermaidHook(mermaidHook);
  }, [geminiHook, mermaidHook, interactionManager]);


  const redrawCanvas = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current || canvasRef.current.width === 0 || canvasRef.current.height === 0) return;

    const canvas = canvasRef.current;
    ctx.fillStyle = '#FFFFFF'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // The viewBox and zoomLevel are from canvasView hook
    const currentViewBoxX = canvasView.viewBoxX;
    const currentViewBoxY = canvasView.viewBoxY;
    const currentZoomLevel = canvasView.zoomLevel;

    elementManager.elements.forEach(element => {
      const elVirtualBBox = getElementBoundingBox(element, ctx); 
      if (elVirtualBBox) {
        // Create a screen bounding box for the element to check visibility
        const screenTopLeft = canvasView.toViewportPos({x: elVirtualBBox.x, y: elVirtualBBox.y});
        const screenWidth = elVirtualBBox.width * currentZoomLevel;
        const screenHeight = elVirtualBBox.height * currentZoomLevel;
        const screenBBox = {x: screenTopLeft.x, y: screenTopLeft.y, width: screenWidth, height: screenHeight };
        
        const viewScreenBBox = { x: 0, y: 0, width: canvasRenderWidth, height: canvasRenderHeight };
        
        if (!doBoundingBoxesIntersect(screenBBox, viewScreenBBox) && !(element.type === 'path' && element.points.length < 2)) {
          if (element.type !== 'connector' && element.aiSummaryVisible && element.aiSummary) {
              drawAISummaryText(ctx, element, currentViewBoxX, currentViewBoxY, currentZoomLevel);
          }
          return; 
        }
      }

      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (element.type === 'path') drawPath(ctx, element, currentViewBoxX, currentViewBoxY, currentZoomLevel);
      else if (element.type === 'text') drawTextElement(ctx, element, currentViewBoxX, currentViewBoxY, currentZoomLevel);
      else if (element.type === 'flowchart-shape') drawFlowchartShape(ctx, element, currentViewBoxX, currentViewBoxY, currentZoomLevel);
      else if (element.type === 'connector') drawConnector(ctx, element, currentViewBoxX, currentViewBoxY, currentZoomLevel);
      else if (element.type === 'image') drawImageElement(ctx, element, elementManager.getImageObject(element.id), currentViewBoxX, currentViewBoxY, currentZoomLevel);
      else if (element.type === 'emoji') drawEmojiElement(ctx, element, currentViewBoxX, currentViewBoxY, currentZoomLevel);
      else if (element.type === 'content-box') drawContentBoxElement(ctx, element, currentViewBoxX, currentViewBoxY, currentZoomLevel);
      
      if (element.type !== 'connector' && element.aiSummaryVisible && element.aiSummary) {
        drawAISummaryText(ctx, element, currentViewBoxX, currentViewBoxY, currentZoomLevel);
      }

      if (elementManager.selectedElementId === element.id) {
        if (element.type === 'flowchart-shape' || element.type === 'emoji' || element.type === 'image' || element.type === 'content-box') {
            drawResizeHandlesForElement(ctx, element, currentViewBoxX, currentViewBoxY, currentZoomLevel);
            if (element.type === 'flowchart-shape' || element.type === 'content-box' || element.type === 'image') {
                drawConnectorHandles(ctx, element, currentViewBoxX, currentViewBoxY, currentZoomLevel);
            }
        } else {
            drawSelectionOutline(ctx, element, currentViewBoxX, currentViewBoxY, currentZoomLevel);
        }
        if (element.type !== 'connector') {
            drawElementActionButtons(ctx, element, currentViewBoxX, currentViewBoxY, currentZoomLevel);
        }
      }
    });

    if (interactionManager.isDrawingInteraction) {
        if (toolManager.currentTool === Tool.PENCIL && interactionManager.currentPathPoints.length > 0) {
            drawPath(ctx, {
                id: 'temp_pencil', type: 'path', points: interactionManager.currentPathPoints,
                color: toolManager.currentColor, strokeWidth: toolManager.currentStrokeWidth,
            }, currentViewBoxX, currentViewBoxY, currentZoomLevel);
        } else if (interactionManager.drawingInteractionState) {
            const { tool, startPoint, currentPoint } = interactionManager.drawingInteractionState; // These are virtual
            const vpStart = canvasView.toViewportPos(startPoint); // Screen coords
            const vpCurrent = canvasView.toViewportPos(currentPoint); // Screen coords
            
            // For drawing preview shapes, we need their screen position and size.
            // The interaction state's startPoint and currentPoint are virtual.
            const screenX = Math.min(vpStart.x, vpCurrent.x);
            const screenY = Math.min(vpStart.y, vpCurrent.y);
            const screenWidth = Math.abs(vpStart.x - vpCurrent.x);
            const screenHeight = Math.abs(vpStart.y - vpCurrent.y);

            ctx.globalAlpha = 0.5;
            // The drawing functions expect virtual viewBox and zoom.
            // For preview, we effectively draw directly in screen space by setting viewBox to 0,0 and zoom to 1
            // and providing the element's coordinates and dimensions as if they were virtual but already scaled.
            const previewVirtualX = screenX / currentZoomLevel;
            const previewVirtualY = screenY / currentZoomLevel;
            const previewVirtualWidth = screenWidth / currentZoomLevel;
            const previewVirtualHeight = screenHeight / currentZoomLevel;

            if (tool === Tool.RECTANGLE || tool === Tool.OVAL || tool === Tool.DIAMOND || tool === Tool.TRIANGLE || tool === Tool.PARALLELOGRAM || tool === Tool.HEXAGON || tool === Tool.CYLINDER || tool === Tool.CLOUD || tool === Tool.STAR) {
                drawFlowchartShape(ctx, {
                    id: 'temp_shape', type: 'flowchart-shape', shapeType: tool.toLowerCase() as ShapeType,
                    x: previewVirtualX, y: previewVirtualY, 
                    width: previewVirtualWidth, height: previewVirtualHeight, text: '', 
                    fillColor: toolManager.useTransparentFill ? 'transparent' : toolManager.currentColor,
                    borderColor: toolManager.useTransparentFill ? toolManager.currentColor : '#000000',
                    strokeWidth: toolManager.currentStrokeWidth, 
                    textColor: toolManager.useTransparentFill ? toolManager.currentColor : (getTextColorForBackground(toolManager.currentColor) || '#000000') 
                }, 0, 0, currentZoomLevel); // Effectively drawing at scaled size in screen space
            } else if (tool === Tool.ARROW) {
                 drawConnector(ctx, { // startPoint and currentPoint are VIRTUAL
                    id: 'temp_connector', type: 'connector',
                    startPoint: startPoint, endPoint: currentPoint,
                    color: toolManager.currentColor, strokeWidth: toolManager.currentStrokeWidth,
                    lineStyle: toolManager.currentLineStyle,
                }, currentViewBoxX, currentViewBoxY, currentZoomLevel);
            }
            ctx.globalAlpha = 1.0;
        }
    }
    
    if (interactionManager.drawingInteractionState?.tool === Tool.ARROW && interactionManager.potentialSnapTarget) {
        drawSnapTargetHighlight(ctx, interactionManager.potentialSnapTarget.targetPoint, currentViewBoxX, currentViewBoxY, currentZoomLevel );
    }

  }, [
    elementManager.elements, elementManager.selectedElementId, elementManager.getImageObject,
    canvasView.viewBoxX, canvasView.viewBoxY, canvasView.zoomLevel, canvasView.toViewportPos, // Added zoomLevel and toViewportPos
    toolManager.currentTool, toolManager.currentColor, toolManager.currentStrokeWidth, toolManager.useTransparentFill, toolManager.currentLineStyle,
    interactionManager.isDrawingInteraction, interactionManager.currentPathPoints, interactionManager.drawingInteractionState,
    interactionManager.potentialSnapTarget, 
    canvasRenderWidth, canvasRenderHeight 
  ]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasRenderWidth(width); setCanvasRenderHeight(height);
      }
    });
    resizeObserver.observe(container);
     if (container.offsetWidth > 0 && container.offsetHeight > 0) { 
        setCanvasRenderWidth(container.offsetWidth); setCanvasRenderHeight(container.offsetHeight);
    }
    return () => resizeObserver.unobserve(container);
  }, []);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvasRenderWidth > 0 && canvasRenderHeight > 0) {
      canvas.width = canvasRenderWidth; canvas.height = canvasRenderHeight;
      redrawCanvas(); 
    }
  }, [canvasRenderWidth, canvasRenderHeight, redrawCanvas]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  useEffect(() => {
    if (canvasRef.current) canvasRef.current.style.cursor = interactionManager.currentCursor;
  }, [interactionManager.currentCursor]);
  
  const handleTextSubmit = (text: string) => {
    if (!textEditing.textInputConfig) return;
    const { targetId } = textEditing.textInputConfig; 
    
    // Text is submitted in virtual units, targetId logic handles element specific updates
    if (targetId?.startsWith('text-')) { 
        // This case is deprecated by ContentBox for new text, but kept for old TextElement if any
        const { x, y, color, fontSize, fontFamily } = textEditing.textInputConfig;
        const newTextElement: TextElement = {
            id: targetId, type: 'text', x: x / canvasView.zoomLevel, y: y / canvasView.zoomLevel, text, color, // x,y were viewport
            font: `${fontSize / canvasView.zoomLevel}px ${fontFamily}`,
        };
        elementManager.addElement(newTextElement);
    } else if (targetId) { 
        const targetElement = elementManager.elements.find(el => el.id === targetId);
        if (targetElement && targetElement.type === 'flowchart-shape') {
            elementManager.updateElement({ ...targetElement, text: text.trim() });
        }
    }
    textEditing.cancelTextEditing(); 
  };

  const handleTextCancel = () => { textEditing.cancelTextEditing(); };

  // Zoom handlers for Toolbar
  const handleZoomIn = () => {
    const centerPoint: Point = { x: canvasRenderWidth / 2, y: canvasRenderHeight / 2 };
    canvasView.zoomAtPoint(centerPoint, canvasView.zoomLevel + ZOOM_STEP_BUTTON);
  };
  const handleZoomOut = () => {
    const centerPoint: Point = { x: canvasRenderWidth / 2, y: canvasRenderHeight / 2 };
    canvasView.zoomAtPoint(centerPoint, canvasView.zoomLevel - ZOOM_STEP_BUTTON);
  };
  const handleResetZoom = () => {
    const centerPoint: Point = { x: canvasRenderWidth / 2, y: canvasRenderHeight / 2 };
    canvasView.zoomAtPoint(centerPoint, 1.0); // Reset to 100%
  };

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const newZoomLevel = canvasView.zoomLevel - event.deltaY * ZOOM_STEP_WHEEL;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseViewportX = event.clientX - rect.left;
    const mouseViewportY = event.clientY - rect.top;

    canvasView.zoomAtPoint({ x: mouseViewportX, y: mouseViewportY }, newZoomLevel);
  };

  return (
    <div id="app-container" className="flex flex-col h-screen w-screen bg-gray-200 overflow-hidden">
      <Toolbar
        currentTool={toolManager.currentTool}
        setCurrentTool={toolManager.setCurrentTool}
        currentColor={toolManager.currentColor}
        setCurrentColor={toolManager.setCurrentColor}
        currentStrokeWidth={toolManager.currentStrokeWidth}
        setCurrentStrokeWidth={toolManager.setCurrentStrokeWidth}
        useTransparentFill={toolManager.useTransparentFill}
        setUseTransparentFill={toolManager.setUseTransparentFill}
        currentLineStyle={toolManager.currentLineStyle} 
        setCurrentLineStyle={toolManager.setCurrentLineStyle} 
        onSetSelectedEmojiStamp={toolManager.setSelectedEmojiStamp} 
        currentAiPersona={geminiHook.currentAiPersona}
        onSetCurrentAiPersona={geminiHook.setCurrentAiPersona}
        onClearCanvas={elementManager.clearCanvasElements}
        onOpenGeminiInteraction={geminiHook.openInteractionModal}
        onInitiateAnalysis={geminiHook.openAnalysisModal}
        onSaveCanvas={fileOperationsHook.saveCanvasAsImage}
        onSaveModelCard={fileOperationsHook.saveModelCard} 
        onSaveBriefcase={fileOperationsHook.saveBriefcaseAsZip}
        onImportImage={fileOperationsHook.triggerImageImport}
        onOpenMermaidModal={mermaidHook.openMermaidModal}
        onUndo={() => { /* TODO: Implement undo */ }}
        canUndo={false /* TODO: Implement canUndo */}
        isGeminiLoading={geminiHook.isGeminiLoading}
        isModelCardGenerating={fileOperationsHook.isModelCardGenerating}
        isBriefcaseSaving={fileOperationsHook.isBriefcaseSaving}
        sessionName={elementManager.sessionName}
        onSessionNameChange={elementManager.onSessionNameChange}
        onSaveSession={fileOperationsHook.saveSession}
        isSessionSaving={fileOperationsHook.isSessionSaving}
        currentZoomLevel={canvasView.zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
      />
      <div 
        ref={canvasContainerRef} 
        className="flex-grow relative overflow-hidden"
        onWheel={handleWheel} // Add wheel event listener here
      >
        <canvas
          ref={canvasRef}
          onMouseDown={interactionManager.handleMouseDown}
          onMouseMove={interactionManager.handleMouseMove}
          onMouseUp={interactionManager.handleMouseUp}
          onMouseLeave={interactionManager.handleMouseLeave}
          onTouchStart={interactionManager.handleMouseDown as any} 
          onTouchMove={interactionManager.handleMouseMove as any} 
          onTouchEnd={interactionManager.handleMouseUp as any} 
          onDoubleClick={interactionManager.handleDoubleClick}
          className="bg-white shadow-inner touch-none" 
        />
         {textEditing.isTextModeActive && textEditing.textInputConfig && (
          <TextInputOverlay
            {...textEditing.textInputConfig} // Props are already scaled viewport values
            onSubmit={handleTextSubmit}
            onCancel={handleTextCancel}
          />
        )}
      </div>
      <input
        type="file" ref={fileOperationsHook.fileInputRef}
        onChange={fileOperationsHook.handleFileSelected} className="hidden"
        accept={fileOperationsHook.acceptedFileTypes}
      />
       {geminiHook.showAnalysisModal && (
        <DraggableModal 
          isOpen={geminiHook.showAnalysisModal} onClose={geminiHook.closeAnalysisModal} 
          title="Gemini Whiteboard Analysis" initialPosition={{ x: window.innerWidth - 550, y: 80 }}
          width="500px" height="450px"
        >
          <GeminiModalContent
            isLoading={geminiHook.isGeminiLoading} error={geminiHook.analysisResult?.error || null}
            responseText={geminiHook.analysisResult?.analysisText || null}
            groundingMetadata={geminiHook.analysisResult?.groundingMetadata}
            showPromptInput={false} placeholderText="Analyzing whiteboard... Gemini's thoughts will appear here."
          />
        </DraggableModal>
      )}
      {geminiHook.showInteractionModal && (
        <DraggableModal 
          isOpen={geminiHook.showInteractionModal} onClose={geminiHook.closeInteractionModal} 
          title={`Interact with Gemini (${geminiHook.currentAiPersona})`}
          initialPosition={{ x: window.innerWidth - 570, y: 100 }}
          width="520px" height="auto" maxHeight="70vh"
        >
          <GeminiModalContent
            isLoading={geminiHook.isGeminiLoading} error={geminiHook.interactionResult?.error || null}
            responseText={geminiHook.interactionResult?.analysisText || null}
            groundingMetadata={geminiHook.interactionResult?.groundingMetadata}
            showPromptInput={true} userPrompt={geminiHook.interactionUserPrompt}
            onUserPromptChange={geminiHook.setInteractionUserPrompt} onSendPrompt={geminiHook.sendInteractionPrompt}
            sendButtonText="Send to Gemini" placeholderText="Ask Gemini to draw, modify, or give ideas..."
            promptAreaPlaceholder="e.g., Draw a blue circle at x:100, y:150, size:50. Then, write 'Hello' below it."
            actionWords={geminiHook.actionWords} onActionWordSelect={geminiHook.handleActionWordSelect}
          />
        </DraggableModal>
      )}
      {mermaidHook.showMermaidModal && (
        <DraggableModal
          isOpen={mermaidHook.showMermaidModal} onClose={mermaidHook.closeMermaidModal}
          title="Create Mermaid Diagram" initialPosition={{x: 100, y:100}}
          width="600px" height="auto" maxHeight="80vh"
        >
          <MermaidInputModalContent
            mermaidSyntax={mermaidHook.mermaidSyntax} onMermaidSyntaxChange={mermaidHook.setMermaidSyntax}
            onRender={mermaidHook.renderMermaidToCanvas} isLoading={mermaidHook.isMermaidRendering}
            error={mermaidHook.mermaidError}
          />
        </DraggableModal>
      )}
      {isContentBoxEditorOpen && editingContentBoxElement && (
        <DraggableModal
          isOpen={isContentBoxEditorOpen} onClose={handleCloseContentBoxEditor}
          title="Edit Content Box" initialPosition={{ x: 150, y: 150 }}
          width="700px" height="550px" maxHeight="85vh"
        >
          <ContentBoxEditorModal
            isOpen={isContentBoxEditorOpen} onClose={handleCloseContentBoxEditor}
            onSave={handleSaveContentBoxEditor} initialContent={editingContentBoxElement.content}
            contentType={editingContentBoxElement.contentType} filename={editingContentBoxElement.filename}
          />
        </DraggableModal>
      )}
    </div>
  );
};
export default App;
