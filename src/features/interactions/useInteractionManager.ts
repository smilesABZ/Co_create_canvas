
// FILENAME: src/features/interactions/useInteractionManager.ts - VERSION: v17 (Zoom Aware Interactions)
// Updated to v14 to trigger automatic summary generation and update action button logic.
// Updated to v15 to handle 'editMermaid' action button clicks.
// Updated to v16 to implement sticky connectors on element resize.
// Updated to v17 to make interactions zoom-aware.
import React, { useState, useCallback, useRef } from 'react';
import { Point, Tool, WhiteboardElement, PathElement, FlowchartShapeElement, ConnectorElement, EmojiElement, ImageElement, ContentBoxElement, ResizeHandleType, ShapeType, LineStyle } from '../../../types';
import { ToolManagerHook } from '../toolManager/useToolManager';
import { ElementManagerHook } from '../elementManager/useElementManager';
import { CanvasViewHook } from '../canvasView/useCanvasView';
import { TextEditingHook } from '../textEditing/useTextEditing';
import { GeminiHook } from '../gemini/useGemini'; 
import { MermaidHook } from '../mermaid/useMermaid'; 
import { getElementBoundingBox, isPointInElement, getHandleAtPoint, getResizeHandles, getConnectorAttachmentPoints, getElementSummaryActionButtons } from '../canvas/canvasUtils';
import { 
    ERASER_STROKE_WIDTH, MIN_SHAPE_SIZE, DEFAULT_SHAPE_WIDTH, DEFAULT_SHAPE_HEIGHT, 
    DEFAULT_FONT_SIZE, DEFAULT_FONT_FAMILY, DEFAULT_EMOJI_SIZE, TRANSPARENT_FILL_VALUE, 
    DEFAULT_SHAPE_BORDER_COLOR, MIN_IMAGE_SIZE, MIN_EMOJI_SIZE, MIN_CONTENT_BOX_SIZE, 
    DEFAULT_ONSCREEN_TEXT_BOX_WIDTH, DEFAULT_ONSCREEN_TEXT_BOX_HEIGHT, DEFAULT_CONTENT_BOX_FONT_SIZE,
    CONNECTOR_SNAP_PROXIMITY_THRESHOLD, CONNECTOR_HANDLE_RADIUS, HANDLE_SIZE
} from '../../../constants';
import { getTextColorForBackground } from '../../utils/colorUtils';
import { doBoundingBoxesIntersect } from '../../utils/geometryUtils';


interface InteractionManagerProps {
  toolManager: ToolManagerHook;
  elementManager: ElementManagerHook;
  canvasView: CanvasViewHook;
  textEditing: TextEditingHook;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  canvasRenderWidth: number;
  canvasRenderHeight: number;
  onEditContentBox: (element: ContentBoxElement) => void; 
  mermaidHook?: MermaidHook; 
}

type DrawingInteractionState = {
  tool: Tool;
  startPoint: Point; // Virtual coords
  currentPoint: Point; // Virtual coords
  elementId?: string; 
  _internal_initialStartElementId?: string; 
  _internal_initialStartAttachmentPointIndex?: number; 
} | null;

export interface InteractionManagerHook {
  handleMouseDown: (event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => void;
  handleMouseUp: (event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => void;
  handleMouseLeave: () => void;
  currentCursor: string;
  isDrawingInteraction: boolean; 
  currentPathPoints: Point[]; 
  drawingInteractionState: DrawingInteractionState; 
  handleDoubleClick: (event: React.MouseEvent) => void;
  potentialSnapTarget: { elementId: string; targetPoint: Point; targetPointIndex: number } | null;
  setGeminiHook: (hook: GeminiHook) => void; 
  setMermaidHook: (hook: MermaidHook) => void;
}

type UpdatableAISummaryElement = Exclude<WhiteboardElement, ConnectorElement>;

export const useInteractionManager = ({
  toolManager,
  elementManager,
  canvasView,
  textEditing,
  canvasRef,
  canvasRenderWidth,
  canvasRenderHeight,
  onEditContentBox,
}: InteractionManagerProps): InteractionManagerHook => {
  const { currentTool, setCurrentTool, currentColor, currentStrokeWidth, useTransparentFill, selectedEmojiStamp, currentLineStyle } = toolManager;
  const { elements, addElement, updateElement, removeElement, selectedElementId, setSelectedElementId, getElementById } = elementManager;
  const { toVirtualPos, toViewportPos, panCanvas, viewBoxX, viewBoxY, zoomLevel } = canvasView;
  const { startTextEditing, isTextModeActive: isCurrentlyEditingText } = textEditing;

  const [isDrawingInteraction, setIsDrawingInteraction] = useState<boolean>(false);
  const [currentPathPointsState, setCurrentPathPointsState] = useState<Point[]>([]);
  const [drawingInteractionStateInternal, setDrawingInteractionStateInternal] = 
    useState<DrawingInteractionState>(null);

  const [isPanningState, setIsPanningState] = useState<boolean>(false);
  const panStartPointRef = useRef<Point | null>(null); // Viewport coords
  const panStartViewBoxRef = useRef<{ x: number; y: number } | null>(null); // Virtual coords

  const [isMovingElementState, setIsMovingElementState] = useState<boolean>(false);
  const movingElementOriginalStateRef = useRef<WhiteboardElement | null>(null);
  const mouseDownPointRef = useRef<Point | null>(null); // Virtual coords
  
  const [activeResizeHandleState, setActiveResizeHandleState] = useState<ResizeHandleType | null>(null);
  const resizingElementOriginalRef = useRef<FlowchartShapeElement | EmojiElement | ImageElement | ContentBoxElement | null>(null);
  
  const [currentCursor, setCurrentCursor] = useState<string>('default');
  const lastClickTimeRef = useRef<number>(0);
  const lastClickedElementIdRef = useRef<string | null>(null);

  const [potentialSnapTarget, setPotentialSnapTarget] = useState<{ elementId: string; targetPoint: Point; targetPointIndex: number; } | null>(null);
  const [drawingConnectorState, setDrawingConnectorState] = useState<{
    startElementId: string;
    startPoint: Point; // Virtual coords
    startPointIndex: number; 
  } | null>(null);

  const geminiHookRef = useRef<GeminiHook | null>(null); 
  const mermaidHookRef = useRef<MermaidHook | null>(null);

  const setGeminiHook = useCallback((hook: GeminiHook) => { geminiHookRef.current = hook; }, []);
  const setMermaidHook = useCallback((hook: MermaidHook) => { mermaidHookRef.current = hook; }, []);

  const getMousePosition = useCallback((event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>, relativeToViewport: boolean = false): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in event) { 
        if (event.touches.length === 0) return null; 
        clientX = event.touches[0].clientX; clientY = event.touches[0].clientY;
    } else { 
        clientX = event.clientX; clientY = event.clientY;
    }
    const viewportX = Math.max(0, Math.min(clientX - rect.left, canvasRenderWidth));
    const viewportY = Math.max(0, Math.min(clientY - rect.top, canvasRenderHeight));
    if(relativeToViewport) return {x: viewportX, y: viewportY};
    return toVirtualPos({x: viewportX, y: viewportY});
  }, [canvasRef, canvasRenderWidth, canvasRenderHeight, toVirtualPos]);

  // virtualClickPos is in VIRTUAL coordinates
  const getConnectorHandleAtPoint = useCallback((element: WhiteboardElement, virtualClickPos: Point): { point: Point; index: number } | null => {
    if (element.type !== 'flowchart-shape' && element.type !== 'content-box' && element.type !== 'image') return null;
    const attachmentPointsWithIndices = getConnectorAttachmentPoints(element); // These are virtual
    const clickRadiusVirtual = CONNECTOR_HANDLE_RADIUS * 2.5; // CONNECTOR_HANDLE_RADIUS is virtual
    for (const item of attachmentPointsWithIndices) {
      const dist = Math.sqrt(Math.pow(virtualClickPos.x - item.point.x, 2) + Math.pow(virtualClickPos.y - item.point.y, 2));
      if (dist < clickRadiusVirtual) return item; 
    }
    return null;
  }, []); 

  const handleGenerateOrRegenerateElementSummary = useCallback(async (element: WhiteboardElement) => {
    if (!geminiHookRef.current) return;
    const updatableElement = element as UpdatableAISummaryElement;
    if (!elementManager.updateElement || !geminiHookRef.current.generateSummaryForElement) return;
    elementManager.updateElement({ ...updatableElement, aiSummaryLoading: true, aiSummaryVisible: false });
    try {
        const summary = await geminiHookRef.current.generateSummaryForElement(updatableElement);
        elementManager.updateElement({ ...updatableElement, aiSummary: summary || "Summary unavailable.", aiSummaryLoading: false, aiSummaryVisible: true });
    } catch (e: any) {
        elementManager.updateElement({ ...updatableElement, aiSummary: `Error: ${e.message || "Could not generate summary."}`, aiSummaryLoading: false, aiSummaryVisible: true });
    }
  }, [elementManager]);

  const handleToggleElementSummaryVisibility = useCallback((element: WhiteboardElement) => {
      if (!elementManager.updateElement) return;
      const updatableElement = element as UpdatableAISummaryElement;
      if (updatableElement.aiSummary && updatableElement.aiSummary.trim() !== "" && !updatableElement.aiSummary.startsWith("Error:")) {
          elementManager.updateElement({ ...updatableElement, aiSummaryVisible: !updatableElement.aiSummaryVisible });
      }
  }, [elementManager]);

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    if (currentTool === Tool.SELECT && !isCurrentlyEditingText) {
        const virtualPos = getMousePosition(event);
        if (!virtualPos) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        let clickedElement: WhiteboardElement | null = null;
        for (let i = elements.length - 1; i >= 0; i--) {
            if (isPointInElement(virtualPos, elements[i], ctx)) { clickedElement = elements[i]; break; }
        }
        if (clickedElement) {
            setSelectedElementId(clickedElement.id); 
            if (clickedElement.type === 'flowchart-shape') {
                const vpPos = toViewportPos({ x: clickedElement.x + 2, y: clickedElement.y + 2 });
                startTextEditing({
                    x: vpPos.x, y: vpPos.y, 
                    width: (clickedElement.width - 4) * zoomLevel, 
                    height: (clickedElement.height - 4) * zoomLevel,
                    color: clickedElement.textColor, 
                    fontSize: DEFAULT_FONT_SIZE * zoomLevel,
                    fontFamily: DEFAULT_FONT_FAMILY, initialText: clickedElement.text, centerText: true,
                    targetId: clickedElement.id,
                    backgroundColor: clickedElement.fillColor === TRANSPARENT_FILL_VALUE ? 'rgba(255,255,255,0.8)' : 'transparent',
                });
            } else if (clickedElement.type === 'text') {
                 const fontSizeVirtual = parseFloat(clickedElement.font) || DEFAULT_FONT_SIZE;
                 const fontFamily = clickedElement.font.split('px ')[1] || DEFAULT_FONT_FAMILY;
                 const vpPos = toViewportPos({ x: clickedElement.x, y: clickedElement.y });
                 startTextEditing({
                    x: vpPos.x, y: vpPos.y,
                    initialText: clickedElement.text,
                    color: clickedElement.color, 
                    fontSize: fontSizeVirtual * zoomLevel, 
                    fontFamily: fontFamily,
                    targetId: clickedElement.id
                 });
            } else if (clickedElement.type === 'content-box') {
                onEditContentBox(clickedElement);
            } else if (clickedElement.type === 'image' && clickedElement.mermaidSyntax && mermaidHookRef.current) {
                mermaidHookRef.current.openMermaidModal(clickedElement.mermaidSyntax, clickedElement.id);
            }
        }
    }
  }, [currentTool, getMousePosition, elements, startTextEditing, setSelectedElementId, onEditContentBox, isCurrentlyEditingText, canvasRef, mermaidHookRef, toViewportPos, zoomLevel]);

  const handleMouseDown = useCallback((event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    if (isCurrentlyEditingText) return;
    event.preventDefault();
    const viewportPosRaw = getMousePosition(event, true); 
    if (!viewportPosRaw) return;
    const virtualPos = toVirtualPos(viewportPosRaw); 
    mouseDownPointRef.current = virtualPos;

    if (!('touches' in event)) { 
        const now = Date.now();
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            let clickedElIdForDoubleClick: string | null = null;
            for (let i = elements.length - 1; i >= 0; i--) {
                if (isPointInElement(virtualPos, elements[i], ctx)) { clickedElIdForDoubleClick = elements[i].id; break; }
            }
            if (now - lastClickTimeRef.current < 300 && clickedElIdForDoubleClick && clickedElIdForDoubleClick === lastClickedElementIdRef.current) {
                lastClickTimeRef.current = 0; lastClickedElementIdRef.current = null;
                handleDoubleClick(event as React.MouseEvent); return; 
            }
            lastClickedElementIdRef.current = clickedElIdForDoubleClick;
        }
        lastClickTimeRef.current = now;
    }
    
    const ctx = canvasRef.current?.getContext('2d');
    if (selectedElementId && currentTool === Tool.SELECT && ctx) {
        const currentSelectedElement = elements.find(el => el.id === selectedElementId);
        if (currentSelectedElement && currentSelectedElement.type !== 'connector') {
            const actionButtons = getElementSummaryActionButtons(currentSelectedElement, viewBoxX, viewBoxY, zoomLevel, ctx); // Screen coords for buttons
            for (const button of actionButtons) {
                if (viewportPosRaw.x >= button.x && viewportPosRaw.x <= button.x + button.width &&
                    viewportPosRaw.y >= button.y && viewportPosRaw.y <= button.y + button.height) {
                    if (button.type === 'regenerateSummary') handleGenerateOrRegenerateElementSummary(currentSelectedElement);
                    else if (button.type === 'showSummary' || button.type === 'hideSummary') handleToggleElementSummaryVisibility(currentSelectedElement);
                    else if (button.type === 'editMermaid' && currentSelectedElement.type === 'image' && currentSelectedElement.mermaidSyntax && mermaidHookRef.current) {
                        mermaidHookRef.current.openMermaidModal(currentSelectedElement.mermaidSyntax, currentSelectedElement.id);
                    }
                    return; 
                }
            }
        }
    }

    if (currentTool === Tool.PAN) {
        setIsPanningState(true);
        panStartPointRef.current = viewportPosRaw; // Store viewport pos for panning
        panStartViewBoxRef.current = { x: viewBoxX, y: viewBoxY };
        setIsDrawingInteraction(true); setCurrentCursor('grabbing'); return;
    }

    if (currentTool === Tool.SELECT) {
        if (!ctx) return;
        let currentSelectedElement = elements.find(el => el.id === selectedElementId);
        if (currentSelectedElement) {
            if (currentSelectedElement.type === 'flowchart-shape' || currentSelectedElement.type === 'content-box' || currentSelectedElement.type === 'image') {
                const clickedConnectorHandle = getConnectorHandleAtPoint(currentSelectedElement, virtualPos); // virtualPos
                if (clickedConnectorHandle) {
                    setDrawingConnectorState({ startElementId: selectedElementId!, startPoint: clickedConnectorHandle.point, startPointIndex: clickedConnectorHandle.index });
                    setIsDrawingInteraction(true);
                    setDrawingInteractionStateInternal({ tool: Tool.ARROW, startPoint: clickedConnectorHandle.point, currentPoint: clickedConnectorHandle.point, elementId: selectedElementId });
                    return; 
                }
            }
            if (currentSelectedElement.type === 'flowchart-shape' || currentSelectedElement.type === 'emoji' || currentSelectedElement.type === 'image' || currentSelectedElement.type === 'content-box') {
                const handleType = getHandleAtPoint(viewportPosRaw, currentSelectedElement, ctx, viewBoxX, viewBoxY, zoomLevel); // viewportPosRaw
                if (handleType) {
                    setActiveResizeHandleState(handleType);
                    resizingElementOriginalRef.current = currentSelectedElement;
                    setIsDrawingInteraction(true); return; 
                }
            }
            if (isPointInElement(virtualPos, currentSelectedElement, ctx)) { // virtualPos
                setIsMovingElementState(true); movingElementOriginalStateRef.current = currentSelectedElement; 
                setIsDrawingInteraction(true); return; 
            }
        }
        let newlyClickedElement: WhiteboardElement | null = null;
        for (let i = elements.length - 1; i >= 0; i--) { 
            if (isPointInElement(virtualPos, elements[i], ctx)) { newlyClickedElement = elements[i]; break; } // virtualPos
        }
        if (newlyClickedElement) {
            setSelectedElementId(newlyClickedElement.id); setIsMovingElementState(true); 
            movingElementOriginalStateRef.current = newlyClickedElement; setActiveResizeHandleState(null); 
            setIsDrawingInteraction(true);
        } else {
            setSelectedElementId(null); setActiveResizeHandleState(null);
            setIsMovingElementState(false); movingElementOriginalStateRef.current = null;
        }
        return; 
    } else { 
        setSelectedElementId(null); setActiveResizeHandleState(null);
        setIsMovingElementState(false); movingElementOriginalStateRef.current = null;
    }

    if (currentTool === Tool.TEXT) {
        const newContentBox: ContentBoxElement = {
            id: `textbox-${Date.now()}`, type: 'content-box',
            x: virtualPos.x, y: virtualPos.y, // Virtual coords
            width: DEFAULT_ONSCREEN_TEXT_BOX_WIDTH, height: DEFAULT_ONSCREEN_TEXT_BOX_HEIGHT, // Virtual dimensions
            contentType: 'plaintext', filename: undefined, content: "", 
            backgroundColor: TRANSPARENT_FILL_VALUE, textColor: currentColor,
            fontSize: DEFAULT_CONTENT_BOX_FONT_SIZE, // Virtual font size
        };
        addElement(newContentBox);
        if (geminiHookRef.current?.triggerAutomaticSummaryGeneration) geminiHookRef.current.triggerAutomaticSummaryGeneration(newContentBox);
        onEditContentBox(newContentBox); 
        setCurrentTool(Tool.SELECT); setSelectedElementId(newContentBox.id); return;
    } else if (currentTool === Tool.EMOJI_STAMP && selectedEmojiStamp) {
        const newEmojiElement: EmojiElement = {
            id: `emoji-${Date.now()}`, type: 'emoji', emojiChar: selectedEmojiStamp,
            x: virtualPos.x - (DEFAULT_EMOJI_SIZE / 2), y: virtualPos.y - (DEFAULT_EMOJI_SIZE / 2), // Virtual coords
            size: DEFAULT_EMOJI_SIZE, // Virtual size
        };
        addElement(newEmojiElement);
        if (geminiHookRef.current?.triggerAutomaticSummaryGeneration) geminiHookRef.current.triggerAutomaticSummaryGeneration(newEmojiElement);
        setCurrentTool(Tool.SELECT); setSelectedElementId(newEmojiElement.id); return; 
    }
    
    if (currentTool === Tool.PENCIL) {
        setIsDrawingInteraction(true); setCurrentPathPointsState([virtualPos]); 
    } else if (currentTool === Tool.ERASER) {
        setIsDrawingInteraction(true);
    } else if (
        currentTool === Tool.RECTANGLE || currentTool === Tool.OVAL || currentTool === Tool.DIAMOND ||
        currentTool === Tool.TRIANGLE || currentTool === Tool.PARALLELOGRAM || currentTool === Tool.HEXAGON ||
        currentTool === Tool.CYLINDER || currentTool === Tool.CLOUD || currentTool === Tool.STAR ||
        currentTool === Tool.ARROW
    ) {
        setIsDrawingInteraction(true); 
        let initialStartElementId: string | undefined = undefined;
        let initialStartAttachmentPointIndex: number | undefined = undefined;
        let finalStartPoint = virtualPos;

        if (currentTool === Tool.ARROW) { 
            for (const el of elements) {
                if (el.type === 'flowchart-shape' || el.type === 'content-box' || el.type === 'image') {
                    const attachmentPointsWithIndices = getConnectorAttachmentPoints(el); // Virtual points
                    for (const item of attachmentPointsWithIndices) {
                        const dist = Math.sqrt(Math.pow(virtualPos.x - item.point.x, 2) + Math.pow(virtualPos.y - item.point.y, 2));
                        if (dist < (CONNECTOR_SNAP_PROXIMITY_THRESHOLD)) { // Virtual threshold
                            initialStartElementId = el.id; initialStartAttachmentPointIndex = item.index;
                            finalStartPoint = item.point; break;
                        }
                    }
                }
                if (initialStartElementId) break;
            }
        }
        setDrawingInteractionStateInternal({ tool: currentTool, startPoint: finalStartPoint, currentPoint: finalStartPoint, _internal_initialStartElementId: initialStartElementId, _internal_initialStartAttachmentPointIndex: initialStartAttachmentPointIndex }); 
    }
  }, [currentTool, getMousePosition, toVirtualPos, isCurrentlyEditingText, viewBoxX, viewBoxY, zoomLevel, selectedElementId, elements, setSelectedElementId, startTextEditing, currentColor, selectedEmojiStamp, addElement, setCurrentTool, canvasRef, onEditContentBox, handleDoubleClick, getConnectorHandleAtPoint, handleGenerateOrRegenerateElementSummary, handleToggleElementSummaryVisibility, currentStrokeWidth, useTransparentFill, currentLineStyle, mermaidHookRef, toViewportPos, panCanvas]);

  const handleMouseMove = useCallback((event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    const viewportPosRaw = getMousePosition(event, true); 
    if (!viewportPosRaw) return;
    const virtualPos = toVirtualPos(viewportPosRaw);
    const ctx = canvasRef.current?.getContext('2d');

    let cursorToSet = 'crosshair'; 
    if (currentTool === Tool.SELECT && ctx) {
        cursorToSet = 'default'; 
        if (selectedElementId) {
            const selectedEl = elements.find(el => el.id === selectedElementId);
            if (selectedEl && selectedEl.type !== 'connector') {
                const actionButtons = getElementSummaryActionButtons(selectedEl, viewBoxX, viewBoxY, zoomLevel, ctx); // Screen coords
                let buttonHovered = false;
                for (const button of actionButtons) {
                     if (viewportPosRaw.x >= button.x && viewportPosRaw.x <= button.x + button.width && viewportPosRaw.y >= button.y && viewportPosRaw.y <= button.y + button.height) {
                        cursorToSet = 'pointer'; buttonHovered = true; break;
                    }
                }
                if (buttonHovered && currentCursor !== 'pointer') setCurrentCursor('pointer');
                else if (!buttonHovered && currentCursor === 'pointer') setCurrentCursor('default'); // Reset if moved off a button
            }
        }

        if (cursorToSet === 'default' && currentCursor !== 'pointer') { 
            if (isDrawingInteraction && isMovingElementState) cursorToSet = 'move';
            else if (drawingConnectorState) cursorToSet = 'crosshair'; 
            else if (selectedElementId) {
                const selectedEl = elements.find(el => el.id === selectedElementId);
                if (selectedEl && (selectedEl.type === 'flowchart-shape' || selectedEl.type === 'content-box' || selectedEl.type === 'image' || selectedEl.type === 'emoji')) { 
                    if (selectedEl.type !== 'emoji' && (selectedEl.type === 'flowchart-shape' || selectedEl.type === 'content-box' || selectedEl.type === 'image')) { 
                        const connectorHandle = getConnectorHandleAtPoint(selectedEl, virtualPos); // virtualPos
                        if (connectorHandle) cursorToSet = 'crosshair'; 
                    }
                    if (cursorToSet !== 'crosshair') { 
                         const handleType = getHandleAtPoint(viewportPosRaw, selectedEl, ctx, viewBoxX, viewBoxY, zoomLevel); // viewportPosRaw
                        if (handleType) {
                            const handles = getResizeHandles(selectedEl, ctx, viewBoxX, viewBoxY, zoomLevel);
                            cursorToSet = handles.find(h => h.type === handleType)?.cursor || 'default';
                        } else if (isPointInElement(virtualPos, selectedEl, ctx)) cursorToSet = 'move'; // virtualPos
                    }
                } else if (selectedEl && isPointInElement(virtualPos, selectedEl, ctx)) cursorToSet = 'move'; // virtualPos
            } else { 
                let hoveredElement: WhiteboardElement | null = null;
                for (let i = elements.length - 1; i >= 0; i--) {
                    if (isPointInElement(virtualPos, elements[i], ctx)) { hoveredElement = elements[i]; break; } // virtualPos
                }
                if (hoveredElement) cursorToSet = 'pointer'; 
            }
        }
    } else if (currentTool === Tool.PAN) cursorToSet = isPanningState ? 'grabbing' : 'grab';
    else if (currentTool === Tool.TEXT) cursorToSet = 'text';
    else if (currentTool === Tool.ERASER) cursorToSet = 'crosshair'; 
    else if (currentTool === Tool.EMOJI_STAMP) cursorToSet = 'copy'; 
    if (currentCursor !== 'pointer' || cursorToSet === 'pointer') setCurrentCursor(cursorToSet);


    const isDrawingArrowLike = isDrawingInteraction && (drawingInteractionStateInternal?.tool === Tool.ARROW || drawingConnectorState);
    if (isDrawingArrowLike) {
        let foundSnapTargetThisMove = false;
        for (const el of elements) {
            if (drawingConnectorState && el.id === drawingConnectorState.startElementId) continue;
            if (drawingInteractionStateInternal?._internal_initialStartElementId && el.id === drawingInteractionStateInternal._internal_initialStartElementId) continue;
            if (el.type === 'flowchart-shape' || el.type === 'content-box' || el.type === 'image') {
                const attachmentPointsWithIndices = getConnectorAttachmentPoints(el); // Virtual
                for (const item of attachmentPointsWithIndices) {
                    const dist = Math.sqrt(Math.pow(virtualPos.x - item.point.x, 2) + Math.pow(virtualPos.y - item.point.y, 2));
                    if (dist < (CONNECTOR_SNAP_PROXIMITY_THRESHOLD)) { // Virtual threshold
                        setPotentialSnapTarget({ elementId: el.id, targetPoint: item.point, targetPointIndex: item.index });
                        foundSnapTargetThisMove = true; break; 
                    }
                }
            }
            if (foundSnapTargetThisMove) break; 
        }
        if (!foundSnapTargetThisMove) setPotentialSnapTarget(null);
    } else if (!isDrawingInteraction && potentialSnapTarget !== null) setPotentialSnapTarget(null);

    if (!isDrawingInteraction) return; 
    
    if (isPanningState && panStartPointRef.current && panStartViewBoxRef.current) {
        const deltaXScreen = viewportPosRaw.x - panStartPointRef.current.x; // Screen delta
        const deltaYScreen = viewportPosRaw.y - panStartPointRef.current.y; // Screen delta
        panCanvas(deltaXScreen, deltaYScreen, panStartViewBoxRef.current); // panCanvas handles zoom division
        return; 
    }
    
    if (isMovingElementState && selectedElementId && mouseDownPointRef.current && movingElementOriginalStateRef.current) {
        const deltaX = virtualPos.x - mouseDownPointRef.current.x; 
        const deltaY = virtualPos.y - mouseDownPointRef.current.y;
        const originalDragElementBase = movingElementOriginalStateRef.current;
        let newMovedElementState: WhiteboardElement;
        if (originalDragElementBase.type === 'path') newMovedElementState = { ...originalDragElementBase, points: originalDragElementBase.points.map(p => ({ x: p.x + deltaX, y: p.y + deltaY })) };
        else if (originalDragElementBase.type === 'connector') newMovedElementState = { ...originalDragElementBase, startPoint: { x: originalDragElementBase.startPoint.x + deltaX, y: originalDragElementBase.startPoint.y + deltaY }, endPoint: { x: originalDragElementBase.endPoint.x + deltaX, y: originalDragElementBase.endPoint.y + deltaY }};
        else newMovedElementState = { ...originalDragElementBase, x: originalDragElementBase.x + deltaX, y: originalDragElementBase.y + deltaY };
        const finalElementToUpdate = {...newMovedElementState}; 
        if (finalElementToUpdate.type === 'connector') {
            (finalElementToUpdate as ConnectorElement).startElementId = undefined; (finalElementToUpdate as ConnectorElement).endElementId = undefined;
            (finalElementToUpdate as ConnectorElement).startAttachmentPointIndex = undefined; (finalElementToUpdate as ConnectorElement).endAttachmentPointIndex = undefined;
        }
        updateElement(finalElementToUpdate);
        if (finalElementToUpdate.type === 'flowchart-shape' || finalElementToUpdate.type === 'image' || finalElementToUpdate.type === 'content-box') {
            const currentElementsSnapshot = elementManager.elements; 
            const movedElementAttachmentPoints = getConnectorAttachmentPoints(finalElementToUpdate);
            currentElementsSnapshot.forEach(el => {
                if (el.type === 'connector') {
                    let connectorToUpdate = { ...el }; let needsUpdate = false;
                    if (el.startElementId === selectedElementId && typeof el.startAttachmentPointIndex === 'number') {
                        const newStartPoint = movedElementAttachmentPoints.find(p => p.index === el.startAttachmentPointIndex)?.point;
                        if (newStartPoint) { connectorToUpdate.startPoint = newStartPoint; needsUpdate = true; }
                    }
                    if (el.endElementId === selectedElementId && typeof el.endAttachmentPointIndex === 'number') {
                        const newEndPoint = movedElementAttachmentPoints.find(p => p.index === el.endAttachmentPointIndex)?.point;
                        if (newEndPoint) { connectorToUpdate.endPoint = newEndPoint; needsUpdate = true; }
                    }
                    if (needsUpdate) updateElement(connectorToUpdate);
                }
            });
        }
    } else if (activeResizeHandleState && selectedElementId && resizingElementOriginalRef.current && mouseDownPointRef.current && ctx) { 
        const deltaX = virtualPos.x - mouseDownPointRef.current.x; 
        const deltaY = virtualPos.y - mouseDownPointRef.current.y;
        const originalShape = resizingElementOriginalRef.current;
        let currentElementToUpdate = getElementById(selectedElementId);
        if (!currentElementToUpdate || (currentElementToUpdate.type !== 'flowchart-shape' && currentElementToUpdate.type !== 'emoji' && currentElementToUpdate.type !== 'image' && currentElementToUpdate.type !== 'content-box')) return;
        let updatedResizedElementProperties: Partial<WhiteboardElement> = {};
        if ((currentElementToUpdate.type === 'flowchart-shape' && originalShape.type === 'flowchart-shape') || (currentElementToUpdate.type === 'content-box' && originalShape.type === 'content-box')) {
            let { x: newX, y: newY, width: newWidth, height: newHeight } = originalShape;
            const minSize = currentElementToUpdate.type === 'content-box' ? MIN_CONTENT_BOX_SIZE : MIN_SHAPE_SIZE;
            switch (activeResizeHandleState) {
                case 'nw': newX += deltaX; newY += deltaY; newWidth -= deltaX; newHeight -= deltaY; break;
                case 'n': newY += deltaY; newHeight -= deltaY; break;
                case 'ne': newY += deltaY; newWidth += deltaX; newHeight -= deltaY; break;
                case 'w': newX += deltaX; newWidth -= deltaX; break;
                case 'e': newWidth += deltaX; break;
                case 'sw': newX += deltaX; newWidth -= deltaX; newHeight += deltaY; break;
                case 's': newHeight += deltaY; break;
                case 'se': newWidth += deltaX; newHeight += deltaY; break;
            }
            if (newWidth < minSize) { if (activeResizeHandleState.includes('w')) newX = newX + newWidth - minSize; newWidth = minSize;}
            if (newHeight < minSize) { if (activeResizeHandleState.includes('n')) newY = newY + newHeight - minSize; newHeight = minSize;}
            updatedResizedElementProperties = { ...currentElementToUpdate, x: newX, y: newY, width: newWidth, height: newHeight };
        } else if (currentElementToUpdate.type === 'emoji' && originalShape.type === 'emoji') {
            const bbox = getElementBoundingBox(originalShape, ctx); if (!bbox) return;
            const centerX = bbox.x + bbox.width / 2; const centerY = bbox.y + bbox.height / 2;
            const originalDistToCorner = { x: (activeResizeHandleState.includes('e') ? bbox.width : -bbox.width) / 2, y: (activeResizeHandleState.includes('s') ? bbox.height : -bbox.height) / 2 };
            const currentVirtualMouseRelativeToCenter = { x: virtualPos.x - centerX, y: virtualPos.y - centerY };
            let scaleX = 1, scaleY = 1;
            if (Math.abs(originalDistToCorner.x) > 1) scaleX = currentVirtualMouseRelativeToCenter.x / originalDistToCorner.x;
            if (Math.abs(originalDistToCorner.y) > 1) scaleY = currentVirtualMouseRelativeToCenter.y / originalDistToCorner.y;
            let scaleFactor = 1;
            if (activeResizeHandleState === 'nw' || activeResizeHandleState === 'ne' || activeResizeHandleState === 'sw' || activeResizeHandleState === 'se') scaleFactor = Math.max(Math.abs(scaleX), Math.abs(scaleY)); 
            else if (activeResizeHandleState === 'n' || activeResizeHandleState === 's') scaleFactor = Math.abs(scaleY);
            else if (activeResizeHandleState === 'w' || activeResizeHandleState === 'e') scaleFactor = Math.abs(scaleX);
            let newSize = Math.max(MIN_EMOJI_SIZE, originalShape.size * scaleFactor);
            const newBboxEstimate = { width: bbox.width * (newSize / originalShape.size), height: bbox.height * (newSize / originalShape.size) };
            let newX = originalShape.x; let newY = originalShape.y;
            if (activeResizeHandleState.includes('w')) newX = originalShape.x + bbox.width - newBboxEstimate.width;
            if (activeResizeHandleState.includes('n')) newY = originalShape.y + bbox.height - newBboxEstimate.height;
            updatedResizedElementProperties = { ...currentElementToUpdate, x: newX, y: newY, size: newSize };
        } else if (currentElementToUpdate.type === 'image' && originalShape.type === 'image') {
             let { x: origX, y: origY, width: origW, height: origH, naturalWidth, naturalHeight } = originalShape;
            const aspectRatio = naturalWidth / naturalHeight; let newX = origX, newY = origY, newW = origW, newH = origH;
            switch (activeResizeHandleState) {
                case 'se': newW = Math.max(MIN_IMAGE_SIZE, origW + deltaX); newH = newW / aspectRatio; break;
                case 'sw': newW = Math.max(MIN_IMAGE_SIZE, origW - deltaX); newH = newW / aspectRatio; newX = origX + (origW - newW); break;
                case 'ne': newW = Math.max(MIN_IMAGE_SIZE, origW + deltaX); newH = newW / aspectRatio; newY = origY + (origH - newH); break;
                case 'nw': newW = Math.max(MIN_IMAGE_SIZE, origW - deltaX); newH = newW / aspectRatio; newX = origX + (origW - newW); newY = origY + (origH - newH); break;
                case 'n': newH = Math.max(MIN_IMAGE_SIZE, origH - deltaY); newW = newH * aspectRatio; newY = origY + deltaY; newX = origX + (origW - newW) / 2; break;
                case 's': newH = Math.max(MIN_IMAGE_SIZE, origH + deltaY); newW = newH * aspectRatio; newX = origX + (origW - newW) / 2; break;
                case 'w': newW = Math.max(MIN_IMAGE_SIZE, origW - deltaX); newH = newW / aspectRatio; newX = origX + deltaX; newY = origY + (origH - newH) / 2; break;
                case 'e': newW = Math.max(MIN_IMAGE_SIZE, origW + deltaX); newH = newW / aspectRatio; newY = origY + (origH - newH) / 2; break;
            }
            if (newW < MIN_IMAGE_SIZE) { newW = MIN_IMAGE_SIZE; newH = newW / aspectRatio; if (activeResizeHandleState.includes('w')) newX = origX + (origW - newW); if (activeResizeHandleState === 'n' || activeResizeHandleState === 's') newX = origX + (origW - newW) / 2; }
            if (newH < MIN_IMAGE_SIZE) { newH = MIN_IMAGE_SIZE; newW = newH * aspectRatio; if (activeResizeHandleState.includes('n')) newY = origY + (origH - newH); if (activeResizeHandleState === 'w' || activeResizeHandleState === 'e') newY = origY + (origH - newH) / 2; }
            updatedResizedElementProperties = { ...currentElementToUpdate, x: newX, y: newY, width: newW, height: newH };
        }
        if (Object.keys(updatedResizedElementProperties).length > 0) {
            updateElement(updatedResizedElementProperties as WhiteboardElement);
            const newlyResizedElement = { ...currentElementToUpdate, ...updatedResizedElementProperties } as WhiteboardElement; 
            if (newlyResizedElement.type === 'flowchart-shape' || newlyResizedElement.type === 'image' || newlyResizedElement.type === 'content-box') {
                const currentElementsSnapshot = elementManager.elements; 
                const resizedElementAttachmentPoints = getConnectorAttachmentPoints(newlyResizedElement);
                currentElementsSnapshot.forEach(el => {
                    if (el.type === 'connector') {
                        let connectorToUpdate = { ...el }; let needsConnectorUpdate = false;
                        if (el.startElementId === selectedElementId && typeof el.startAttachmentPointIndex === 'number') {
                            const newStartPoint = resizedElementAttachmentPoints.find(p => p.index === el.startAttachmentPointIndex)?.point;
                            if (newStartPoint && (newStartPoint.x !== el.startPoint.x || newStartPoint.y !== el.startPoint.y)) { connectorToUpdate.startPoint = newStartPoint; needsConnectorUpdate = true; }
                        }
                        if (el.endElementId === selectedElementId && typeof el.endAttachmentPointIndex === 'number') {
                            const newEndPoint = resizedElementAttachmentPoints.find(p => p.index === el.endAttachmentPointIndex)?.point;
                            if (newEndPoint && (newEndPoint.x !== el.endPoint.x || newEndPoint.y !== el.endPoint.y)) { connectorToUpdate.endPoint = newEndPoint; needsConnectorUpdate = true; }
                        }
                        if (needsConnectorUpdate) updateElement(connectorToUpdate);
                    }
                });
            }
        }
    } else if (currentTool === Tool.PENCIL) {
        setCurrentPathPointsState(prevPoints => [...prevPoints, virtualPos]);
    } else if (currentTool === Tool.ERASER && ctx) { 
        const elementsToDelete = new Set<string>();
        const eraserVirtualWidth = ERASER_STROKE_WIDTH; // ERASER_STROKE_WIDTH is virtual
        elements.forEach(element => {
            const elementBox = getElementBoundingBox(element, ctx); if (!elementBox) return; 
            const eraserHitArea = { x: virtualPos.x - eraserVirtualWidth / 2, y: virtualPos.y - eraserVirtualWidth / 2, width: eraserVirtualWidth, height: eraserVirtualWidth };
            if (doBoundingBoxesIntersect(elementBox, eraserHitArea)) elementsToDelete.add(element.id);
        });
        if (elementsToDelete.size > 0) elementsToDelete.forEach(id => removeElement(id));
    } else if (drawingInteractionStateInternal) { 
        setDrawingInteractionStateInternal(prev => prev ? { ...prev, currentPoint: virtualPos } : null);
    }
  }, [getMousePosition, toVirtualPos, currentTool, isDrawingInteraction, isMovingElementState, selectedElementId, elements, viewBoxX, viewBoxY, zoomLevel, isPanningState, panCanvas, updateElement, activeResizeHandleState, removeElement, canvasRef, drawingInteractionStateInternal, potentialSnapTarget, drawingConnectorState, getConnectorHandleAtPoint, elementManager, getElementById, currentCursor]);

  const handleMouseUp = useCallback((event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    const virtualPosUp = getMousePosition(event); 
    const finalVirtualPos = virtualPosUp || drawingInteractionStateInternal?.currentPoint || mouseDownPointRef.current; // virtual
    if (isPanningState) {
        setIsPanningState(false); panStartPointRef.current = null; panStartViewBoxRef.current = null;
        setCurrentCursor(currentTool === Tool.PAN ? 'grab' : (currentTool === Tool.SELECT ? 'default' : 'crosshair'));
    }
    if (activeResizeHandleState && selectedElementId && resizingElementOriginalRef.current && finalVirtualPos && mouseDownPointRef.current) {
        const resizedElement = getElementById(selectedElementId) as UpdatableAISummaryElement | undefined;
        if (resizedElement && geminiHookRef.current?.triggerAutomaticSummaryGeneration) {
            const origBbox = getElementBoundingBox(resizingElementOriginalRef.current!, canvasRef.current?.getContext('2d') || null);
            const finalBbox = getElementBoundingBox(resizedElement, canvasRef.current?.getContext('2d') || null);
            if (origBbox && finalBbox && (Math.abs(origBbox.width - finalBbox.width) > 5 || Math.abs(origBbox.height - finalBbox.height) > 5)) {
                if (!resizedElement.aiSummary) geminiHookRef.current.triggerAutomaticSummaryGeneration(resizedElement);
            }
        }
    } else if (isMovingElementState && selectedElementId && movingElementOriginalStateRef.current) {
         const movedElement = getElementById(selectedElementId) as UpdatableAISummaryElement | undefined;
         if (movedElement && geminiHookRef.current?.triggerAutomaticSummaryGeneration && !movedElement.aiSummary) geminiHookRef.current.triggerAutomaticSummaryGeneration(movedElement);
    }
    setIsMovingElementState(false); setActiveResizeHandleState(null);
    resizingElementOriginalRef.current = null; movingElementOriginalStateRef.current = null;
    
    if (drawingConnectorState && drawingInteractionStateInternal && finalVirtualPos) { 
        const endPoint = potentialSnapTarget ? potentialSnapTarget.targetPoint : finalVirtualPos; // virtual
        const newConnector: ConnectorElement = { 
            id: `connector-${Date.now()}`, type: 'connector', startPoint: drawingConnectorState.startPoint, endPoint: endPoint,
            color: currentColor, strokeWidth: currentStrokeWidth, lineStyle: currentLineStyle, 
            startElementId: drawingConnectorState.startElementId, startAttachmentPointIndex: drawingConnectorState.startPointIndex,
            endElementId: potentialSnapTarget ? potentialSnapTarget.elementId : undefined, endAttachmentPointIndex: potentialSnapTarget ? potentialSnapTarget.targetPointIndex : undefined,
        };
        addElement(newConnector); setDrawingConnectorState(null); setPotentialSnapTarget(null);
    } else if (isDrawingInteraction && currentTool === Tool.PENCIL) {
        if (currentPathPointsState.length > 1) {
            const newElement: PathElement = { id: Date.now().toString(), type: 'path', points: [...currentPathPointsState], color: currentColor, strokeWidth: currentStrokeWidth };
            addElement(newElement);
            if (geminiHookRef.current?.triggerAutomaticSummaryGeneration) geminiHookRef.current.triggerAutomaticSummaryGeneration(newElement);
        }
        setCurrentPathPointsState([]);
    } else if (drawingInteractionStateInternal && finalVirtualPos) { 
        const { tool, startPoint, _internal_initialStartElementId, _internal_initialStartAttachmentPointIndex } = drawingInteractionStateInternal; 
        const id = `${tool.toLowerCase()}-${Date.now()}`;
        let width = Math.abs(startPoint.x - finalVirtualPos.x); // virtual
        let height = Math.abs(startPoint.y - finalVirtualPos.y); // virtual
        const x = Math.min(startPoint.x, finalVirtualPos.x); // virtual
        const y = Math.min(startPoint.y, finalVirtualPos.y); // virtual
        const isShapeTool = tool === Tool.RECTANGLE || tool === Tool.OVAL || tool === Tool.DIAMOND || tool === Tool.TRIANGLE || tool === Tool.PARALLELOGRAM || tool === Tool.HEXAGON || tool === Tool.CYLINDER || tool === Tool.CLOUD || tool === Tool.STAR;
        if (width < MIN_SHAPE_SIZE && height < MIN_SHAPE_SIZE && tool !== Tool.ARROW) { width = DEFAULT_SHAPE_WIDTH / 1.5; height = DEFAULT_SHAPE_HEIGHT / 1.5; }
        else if (width < MIN_SHAPE_SIZE && isShapeTool) width = MIN_SHAPE_SIZE;
        else if (height < MIN_SHAPE_SIZE && isShapeTool) height = MIN_SHAPE_SIZE;
        if (isShapeTool) {
            const newShape: FlowchartShapeElement = {
                id, type: 'flowchart-shape', shapeType: tool.toLowerCase() as ShapeType, x, y, width, height, text: '',
                fillColor: useTransparentFill ? TRANSPARENT_FILL_VALUE : currentColor,
                borderColor: useTransparentFill ? currentColor : DEFAULT_SHAPE_BORDER_COLOR,
                strokeWidth: currentStrokeWidth, textColor: useTransparentFill ? currentColor : getTextColorForBackground(currentColor),
            };
            addElement(newShape);
            if (geminiHookRef.current?.triggerAutomaticSummaryGeneration) geminiHookRef.current.triggerAutomaticSummaryGeneration(newShape);
            setSelectedElementId(id);
            const vpPos = toViewportPos({ x: newShape.x + 2, y: newShape.y + 2 });
            startTextEditing({
                x: vpPos.x, y: vpPos.y, 
                width: (newShape.width - 4) * zoomLevel, height: (newShape.height - 4) * zoomLevel,
                color: newShape.textColor, fontSize: DEFAULT_FONT_SIZE * zoomLevel,
                fontFamily: DEFAULT_FONT_FAMILY, initialText: '', centerText: true,
                targetId: id, backgroundColor: useTransparentFill ? 'rgba(255,255,255,0.8)' : 'transparent',
            });
        } else if (tool === Tool.ARROW) { 
            if (width > 5 || height > 5 || potentialSnapTarget || _internal_initialStartElementId) { 
                const finalEndPoint = potentialSnapTarget ? potentialSnapTarget.targetPoint : finalVirtualPos;
                const newConnector: ConnectorElement = { 
                    id, type: 'connector', startPoint: startPoint, endPoint: finalEndPoint, color: currentColor, strokeWidth: currentStrokeWidth,
                    lineStyle: currentLineStyle, startElementId: _internal_initialStartElementId, startAttachmentPointIndex: _internal_initialStartAttachmentPointIndex,
                    endElementId: potentialSnapTarget ? potentialSnapTarget.elementId : undefined, endAttachmentPointIndex: potentialSnapTarget ? potentialSnapTarget.targetPointIndex : undefined,
                };
                addElement(newConnector);
            }
            setPotentialSnapTarget(null); 
        }
    }
    setIsDrawingInteraction(false); setDrawingInteractionStateInternal(null);
    setDrawingConnectorState(null); mouseDownPointRef.current = null;
  }, [isDrawingInteraction, currentTool, currentPathPointsState, addElement, currentColor, currentStrokeWidth, currentLineStyle, drawingInteractionStateInternal, isPanningState, useTransparentFill, setSelectedElementId, startTextEditing, getMousePosition, potentialSnapTarget, setPotentialSnapTarget, drawingConnectorState, toolManager, geminiHookRef, getElementById, canvasRef, activeResizeHandleState, isMovingElementState, selectedElementId, movingElementOriginalStateRef, resizingElementOriginalRef, toViewportPos, zoomLevel]);

  const handleMouseLeave = useCallback(() => {
    if (drawingConnectorState) { 
        setDrawingConnectorState(null); setDrawingInteractionStateInternal(null);
        setPotentialSnapTarget(null); setIsDrawingInteraction(false);
        setCurrentCursor('default'); return;
    }
    if (isDrawingInteraction) {
      if (isPanningState) { setIsPanningState(false); panStartPointRef.current = null; panStartViewBoxRef.current = null; }
      if (currentTool === Tool.PENCIL && currentPathPointsState.length > 1) {
         const newElement: PathElement = { id: Date.now().toString(), type: 'path', points: [...currentPathPointsState], color: currentColor, strokeWidth: currentStrokeWidth };
        addElement(newElement);
        if (geminiHookRef.current?.triggerAutomaticSummaryGeneration) geminiHookRef.current.triggerAutomaticSummaryGeneration(newElement);
      } else if (drawingInteractionStateInternal) { 
         const { tool, startPoint, currentPoint, _internal_initialStartElementId, _internal_initialStartAttachmentPointIndex } = drawingInteractionStateInternal;
         const finalPos = potentialSnapTarget ? potentialSnapTarget.targetPoint : currentPoint; 
         const id = `${tool.toLowerCase()}-${Date.now()}`;
         let width = Math.abs(startPoint.x - finalPos.x); let height = Math.abs(startPoint.y - finalPos.y);
         const x = Math.min(startPoint.x, finalPos.x); const y = Math.min(startPoint.y, finalPos.x); // Corrected y for min
         const isShapeTool = tool === Tool.RECTANGLE || tool === Tool.OVAL || tool === Tool.DIAMOND || tool === Tool.TRIANGLE || tool === Tool.PARALLELOGRAM || tool === Tool.HEXAGON || tool === Tool.CYLINDER || tool === Tool.CLOUD || tool === Tool.STAR;
        if (width < MIN_SHAPE_SIZE && height < MIN_SHAPE_SIZE && tool !== Tool.ARROW) { width = DEFAULT_SHAPE_WIDTH / 1.5; height = DEFAULT_SHAPE_HEIGHT / 1.5; }
        else if (width < MIN_SHAPE_SIZE && isShapeTool) width = MIN_SHAPE_SIZE;
        else if (height < MIN_SHAPE_SIZE && isShapeTool) height = MIN_SHAPE_SIZE;
         if (isShapeTool) {
            const newShape: FlowchartShapeElement = {
                id, type: 'flowchart-shape', shapeType: tool.toLowerCase() as ShapeType, x, y, width, height, text: '',
                fillColor: useTransparentFill ? TRANSPARENT_FILL_VALUE : currentColor,
                borderColor: useTransparentFill ? currentColor : DEFAULT_SHAPE_BORDER_COLOR,
                strokeWidth: currentStrokeWidth, textColor: useTransparentFill ? currentColor : getTextColorForBackground(currentColor),
            };
            addElement(newShape);
            if (geminiHookRef.current?.triggerAutomaticSummaryGeneration) geminiHookRef.current.triggerAutomaticSummaryGeneration(newShape);
         } else if (tool === Tool.ARROW && (width > 5 || height > 5 || potentialSnapTarget || _internal_initialStartElementId)) {
             const newConnector: ConnectorElement = { 
                id, type: 'connector', startPoint, endPoint: finalPos, color: currentColor, strokeWidth: currentStrokeWidth,
                lineStyle: currentLineStyle, startElementId: _internal_initialStartElementId, startAttachmentPointIndex: _internal_initialStartAttachmentPointIndex,
                endElementId: potentialSnapTarget ? potentialSnapTarget.elementId : undefined, endAttachmentPointIndex: potentialSnapTarget ? potentialSnapTarget.targetPointIndex : undefined,
            };
            addElement(newConnector);
         }
      }
    }
    setIsDrawingInteraction(false); setCurrentPathPointsState([]);
    setDrawingInteractionStateInternal(null); setIsMovingElementState(false);
    setActiveResizeHandleState(null); resizingElementOriginalRef.current = null;
    movingElementOriginalStateRef.current = null; mouseDownPointRef.current = null;
    setPotentialSnapTarget(null); 
    setCurrentCursor(currentTool === Tool.SELECT ? 'default' : (currentTool === Tool.PAN ? 'grab' : 'crosshair'));
  }, [isDrawingInteraction, isPanningState, currentTool, currentPathPointsState, drawingInteractionStateInternal, addElement, currentColor, currentStrokeWidth, currentLineStyle, useTransparentFill, potentialSnapTarget, setPotentialSnapTarget, drawingConnectorState, geminiHookRef]);

  return {
    handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave,
    currentCursor, isDrawingInteraction, currentPathPoints: currentPathPointsState,
    drawingInteractionState: drawingInteractionStateInternal, handleDoubleClick,
    potentialSnapTarget, setGeminiHook, setMermaidHook,
  };
};
