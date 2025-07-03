
// FILENAME: components/Toolbar.tsx - VERSION: v10 (Zoom Controls)
// Updated to v9 with Save/Load Session buttons
// Updated to v10 with Zoom Controls

import React, { useState, useRef, useEffect } from 'react';
import { Tool, AiPersona, AiPersonaOption, LineStyle } from '../types'; // Changed path
import { COLORS, STROKE_WIDTHS, DEFAULT_COLOR, TRANSPARENT_FILL_VALUE, EMOJI_LIST, AI_PERSONAS_LIST, DEFAULT_AI_PERSONA, PanIcon, LINE_STYLES, DEFAULT_LINE_STYLE } from '../constants'; // Changed path

interface ToolbarProps {
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentStrokeWidth: number;
  setCurrentStrokeWidth: (width: number) => void;
  useTransparentFill: boolean;
  setUseTransparentFill: (transparent: boolean) => void;
  currentLineStyle: LineStyle; 
  setCurrentLineStyle: (style: LineStyle) => void; 
  onSetSelectedEmojiStamp: (emoji: string) => void; 
  currentAiPersona: AiPersona;
  onSetCurrentAiPersona: (persona: AiPersona) => void;
  onClearCanvas: () => void;
  onOpenGeminiInteraction: () => void;
  onInitiateAnalysis: () => void;
  onSaveCanvas: () => void;
  onSaveModelCard: () => void; 
  onSaveBriefcase: () => void; 
  onImportImage: () => void; // Used by "Import File" and "Load Session"
  onOpenMermaidModal: () => void;
  onUndo: () => void; 
  canUndo: boolean; 
  isGeminiLoading: boolean;
  isModelCardGenerating: boolean; 
  isBriefcaseSaving: boolean; 
  sessionName: string; 
  onSessionNameChange: (name: string) => void;
  // New props for Save/Load Session
  onSaveSession: () => void;
  isSessionSaving?: boolean;
  // New props for Zoom
  currentZoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

// --- Icons (ensure all used icons are defined here or imported) ---
const PencilIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/> </svg> );
const EraserIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M19 13H5v-2h14v2zm-2-4H7V7h10v2zm4-7H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 19L17.59 7.41 19 8.82 7.41 20.41A2 2 0 0 1 6 19z"/> </svg> );
const TextIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/> </svg> );
const RectangleIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"> <rect x="3" y="7" width="18" height="10" rx="1"/> </svg> );
const OvalIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"> <ellipse cx="12" cy="12" rx="9" ry="6"/> </svg> );
const DiamondIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"> <path d="M12 3L21 12L12 21L3 12Z"/> </svg> );
const ArrowIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"> <line x1="4" y1="12" x2="20" y2="12"/> <polyline points="14 8 20 12 14 16"/> </svg> );
const PlainLineIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"> <line x1="4" y1="12" x2="20" y2="12"/> </svg> );
const DottedLineIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24" strokeDasharray="4 4"> <line x1="4" y1="12" x2="20" y2="12"/> </svg> );
const TriangleIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"> <path d="M12 5L22 19H2Z"/> </svg> );
const ParallelogramIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"> <path d="M21 4H7l-4 16h14l4-16z"/> </svg> );
const HexagonIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"> <path d="M17.66 4H6.34L2 12l4.34 8h11.32L22 12l-4.34-8z"/> </svg> );
const CylinderIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24"> <ellipse cx="12" cy="6" rx="8" ry="3"/> <path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/> </svg> );
const CloudIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24"> <path d="M18 10h-1.26A8 8 0 104 16.2V16a5 5 0 015-5h4.5A4.5 4.5 0 1118 10z"/> </svg> );
const StarIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"> <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/> </svg> );
const ClearIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/> </svg> );
const GeminiIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12 17.5c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-8c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3z"/><path d="M12 6.5c.69 0 1.25.56 1.25 1.25S12.69 9 12 9s-1.25-.56-1.25-1.25S11.31 6.5 12 6.5zm0 11c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25S12.69 17.5 12 17.5zm-5-5c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25S8.25 11.21 8.25 12 7.69 12.5 7 12.5zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg> );
const AnalyzeIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M19.5 3H4.5C3.12 3 2 4.12 2 5.5v13C2 19.88 3.12 21 4.5 21h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 4.12 20.88 3 19.5 3zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM6.5 12c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5zm9 0c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5z"/> </svg> );
const SaveImageIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/> </svg> ); // This is more like a download icon
const ArchiveIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v10H3V11zm2 2v6h14v-6H5zm2 2h10v2H7v-2z"/> </svg> );
const BriefcaseIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M0 0h24v24H0z" fill="none"/> <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/> </svg> );
const ImportImageIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/> </svg> );
const SelectIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M12.21,9.88l-3.54,3.53a.51.51,0,0,0,0,.71l3.54,3.54a.5.5,0,0,0,.7-.71L10.13,14H18a.5.5,0,0,0,0-1H10.13l2.78-2.78a.5.5,0,1,0-.7-.71Z" transform="rotate(-45 12 12)"/> <path d="M6.56,3.5H17.44a3,3,0,0,1,3,3V17.44a3,3,0,0,1-3,3H6.56a3,3,0,0,1-3-3V6.5A3,3,0,0,1,6.56,3.5ZM4.56,6.5a2,2,0,0,1,2-2H17.44a2,2,0,0,1,2,2V17.44a2,2,0,0,1-2,2H6.56a2,2,0,0,1-2-2Z"/> </svg> );
const MermaidIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm5.66 7.34l-1.42 1.42A3.5 3.5 0 0113.5 9.5V7A5.5 5.5 0 008 12.5a5.5 5.5 0 005.5 5.5V16A3.5 3.5 0 0110.76 14.76l1.42-1.42A5.5 5.5 0 0013.5 14.5V18a3.5 3.5 0 01-2.74 3.41L12.2 19.8A5.5 5.5 0 0013.5 20c2.36 0 4.35-1.48 5.16-3.5h-1.82a3.5 3.5 0 01-3.34-2.5H18a5.5 5.5 0 00-2.34-4.66zM8.5 14.5V11a3.5 3.5 0 012.74-3.41L9.8 6.2A5.5 5.5 0 008.5 4C6.14 4 4.15 5.48 3.34 7.5h1.82A3.5 3.5 0 018.5 9.5H4a5.5 5.5 0 002.34 4.66L8.06 12.74A3.5 3.5 0 018.5 11v1.5a5.5 5.5 0 005.5 5.5A5.5 5.5 0 0019.5 12.5h-1.5a3.5 3.5 0 01-3.5 3.5 3.5 3.5 0 01-3.5-3.5z"/> </svg> );
const CaretDownIcon: React.FC<{className?: string}> = ({ className = "w-4 h-4" }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /> </svg> );
const NoFillIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none">
    <rect x="2" y="2" width="20" height="20" rx="1" ry="1" stroke="currentColor" strokeWidth="1.5" fill="white" />
    <line x1="3.5" y1="20.5" x2="20.5" y2="3.5" stroke="#EF4444" strokeWidth="2" />
  </svg>
);
const EmojiIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-6c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm4 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2-5c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3z"/>
  </svg>
);
const RobotIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM7.5 13.5c-.83 0-1.5-.67-1.5-1.5S6.67 10.5 7.5 10.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM12 8c-2.21 0-4 1.79-4 4h8c0-2.21-1.79-4-4-4z"/> </svg> );
const ArchitectIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4zM7.2 13.9L5.8 12.5l5.7-5.7 1.4 1.4-5.7 5.7z"/> </svg> );
const ArtistIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M12 3c-1.1 0-2 .9-2 2v1.18C8.36 6.58 7 7.95 7 9.5c0 .35.07.69.18.99L3.41 6.72c-.38-.38-1-.38-1.38 0s-.38 1 0 1.38L6.6 12.67c-.4.54-.6 1.2-.6 1.83 0 1.66 1.34 3 3 3s3-1.34 3-3V4.04c.08-.02.17-.04.25-.04.41 0 .75.34.75.75V9c0 .55.45 1 1 1s1-.45 1-1V4.75c0-.41.34-.75.75-.75.08 0 .17.02.25.04V14.5c0 1.66 1.34 3 3 3s3-1.34 3-3c0-.63-.2-1.29-.6-1.83L22 8.1c.38-.38.38-1 0-1.38s-1-.38-1.38 0l-3.77 3.77c.11-.3.18-.64.18-.99 0-1.55-1.36-2.92-3.27-3.32V5c0-1.1-.9-2-2-2zm0 15c-.55 0-1-.45-1-1V9.5c0-.83.67-1.5 1.5-1.5h.04c.07 0 .15.04.19.09.16.19.04.49-.18.6L11.5 10.2c-.56.56-.56 1.44 0 2l1.01 1.01c.16.16.42.16.58 0l.01-.01c.55-.55.55-1.44 0-1.98L12 10.2V17c0 .55-.45 1-1 1zm7-2.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5S16.67 14 17.5 14s1.5.67 1.5 1.5z"/> </svg> );
const CreativeDesignerIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-8.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm5.5 4c1.38 0 2.5-1.12 2.5-2.5S13.38 9.5 12 9.5s-2.5 1.12-2.5 2.5S10.62 14.5 12 14.5zm5.5-4c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zM12 6.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/> </svg> );
const ToolsIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4zM7.2 13.9L5.8 12.5l5.7-5.7 1.4 1.4-5.7 5.7z"/> </svg> );
const SaveSessionIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/> </svg> );
const OpenSessionIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/> </svg> );
const ZoomInIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2V7z"/> </svg> );
const ZoomOutIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm-2-5h4V7H7v2z"/> </svg> );
const ZoomResetIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"> <path d="M12 5C8.13 5 5 8.13 5 12s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm-1-8H9v1.5h2V12h1.5v-1.5H14V9h-2V7.5h-1V9zm3.5-1c.28 0 .5.22.5.5s-.22.5-.5.5-.5-.22-.5-.5.22-.5.5-.5z"/> </svg> );


const Toolbar: React.FC<ToolbarProps> = ({
  currentTool, setCurrentTool, currentColor, setCurrentColor, currentStrokeWidth, setCurrentStrokeWidth,
  useTransparentFill, setUseTransparentFill, currentLineStyle, setCurrentLineStyle, 
  onSetSelectedEmojiStamp, currentAiPersona, onSetCurrentAiPersona,
  onClearCanvas, onOpenGeminiInteraction, onInitiateAnalysis, onSaveCanvas, onSaveModelCard, onSaveBriefcase,
  onImportImage, onOpenMermaidModal, 
  isGeminiLoading, isModelCardGenerating, isBriefcaseSaving, sessionName, onSessionNameChange,
  onSaveSession, isSessionSaving,
  currentZoomLevel, onZoomIn, onZoomOut, onResetZoom,
}) => {
  
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);

  const [isEmojiSubmenuOpen, setIsEmojiSubmenuOpen] = useState(false);
  const emojiSubmenuRef = useRef<HTMLDivElement>(null);

  const [isPersonaSubmenuOpen, setIsPersonaSubmenuOpen] = useState(false);
  const personaSubmenuRef = useRef<HTMLDivElement>(null);

  const isAnyShapeTool = 
    currentTool === Tool.RECTANGLE || currentTool === Tool.OVAL || currentTool === Tool.DIAMOND ||
    currentTool === Tool.TRIANGLE || currentTool === Tool.PARALLELOGRAM || currentTool === Tool.HEXAGON ||
    currentTool === Tool.CYLINDER || currentTool === Tool.CLOUD || currentTool === Tool.STAR;

  const isDrawingToolWithStroke = isAnyShapeTool || currentTool === Tool.PENCIL || currentTool === Tool.ARROW;

  const isAnyMajorOperationInProgress = isGeminiLoading || isModelCardGenerating || isBriefcaseSaving || isSessionSaving;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isToolsMenuOpen && toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node) && toolsButtonRef.current && !toolsButtonRef.current.contains(event.target as Node)) {
        setIsToolsMenuOpen(false);
        setIsEmojiSubmenuOpen(false); 
        setIsPersonaSubmenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isToolsMenuOpen]);

  const handleToolSelect = (tool: Tool) => {
    setCurrentTool(tool);
    if (tool !== Tool.EMOJI_STAMP) setIsEmojiSubmenuOpen(false);
    if (tool as any !== 'AI_PERSONA_ACTION') setIsPersonaSubmenuOpen(false); 
    
    if (tool !== Tool.EMOJI_STAMP && tool as any !== 'AI_PERSONA_ACTION') {
      setIsToolsMenuOpen(false);
    }
  };
  
  const handleEmojiSelect = (emoji: string) => {
    onSetSelectedEmojiStamp(emoji);
    setCurrentTool(Tool.EMOJI_STAMP);
    setIsEmojiSubmenuOpen(false);
    setIsToolsMenuOpen(false); 
  };

  const handleAiPersonaSelect = (persona: AiPersona) => {
    onSetCurrentAiPersona(persona);
    setIsPersonaSubmenuOpen(false);
    setIsToolsMenuOpen(false); 
  };
  
  const handleOpenEmojiSubmenu = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setIsEmojiSubmenuOpen(true);
    setIsPersonaSubmenuOpen(false);
  }
  const handleOpenPersonaSubmenu = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setIsPersonaSubmenuOpen(true);
    setIsEmojiSubmenuOpen(false);
  }

  const mainTools = [
    { tool: Tool.SELECT, icon: SelectIcon, name: "Select" },
    { tool: Tool.PAN, icon: PanIcon, name: "Pan" },
    { tool: Tool.PENCIL, icon: PencilIcon, name: "Pencil" },
    { tool: Tool.TEXT, icon: TextIcon, name: "Text" },
  ];

  const shapeToolItems = [
    { tool: Tool.RECTANGLE, icon: RectangleIcon, name: "Rectangle" }, { tool: Tool.OVAL, icon: OvalIcon, name: "Oval" },
    { tool: Tool.DIAMOND, icon: DiamondIcon, name: "Diamond" }, { tool: Tool.TRIANGLE, icon: TriangleIcon, name: "Triangle" },
    { tool: Tool.PARALLELOGRAM, icon: ParallelogramIcon, name: "Parallelogram" }, { tool: Tool.HEXAGON, icon: HexagonIcon, name: "Hexagon" },
    { tool: Tool.CYLINDER, icon: CylinderIcon, name: "Cylinder" }, { tool: Tool.CLOUD, icon: CloudIcon, name: "Cloud" },
    { tool: Tool.STAR, icon: StarIcon, name: "Star" }, 
    { tool: Tool.ARROW, icon: ArrowIcon, name: "Arrow/Line" }, // Single entry for Arrow/Line
  ];

  const otherTools = [
    { tool: Tool.ERASER, icon: EraserIcon, name: "Eraser" },
    { tool: 'MERMAID_ACTION' as any, icon: MermaidIcon, name: "Mermaid Diagram", action: onOpenMermaidModal }, 
  ];

  const getSelectedPersonaName = () => AI_PERSONAS_LIST.find(p => p.id === currentAiPersona)?.name || DEFAULT_AI_PERSONA;
  const getSelectedPersonaIcon = (personaId: AiPersona) => {
    switch(personaId) {
      case 'mindless-robot': return <RobotIcon className="w-4 h-4" />;
      case 'architect': return <ArchitectIcon className="w-4 h-4" />;
      case 'artist': return <ArtistIcon className="w-4 h-4" />;
      case 'creative-designer': return <CreativeDesignerIcon className="w-4 h-4" />;
      default: return <GeminiIcon className="w-4 h-4" />;
    }
  };

  const toggleLineStyle = () => {
    if (currentLineStyle === 'arrow') {
      setCurrentLineStyle('plain');
    } else if (currentLineStyle === 'plain') {
      setCurrentLineStyle('dotted');
    } else { // dotted
      setCurrentLineStyle('arrow');
    }
  };

  const getCurrentLineStyleIcon = () => {
    if (currentLineStyle === 'plain') return <PlainLineIcon className="w-5 h-5" />;
    if (currentLineStyle === 'dotted') return <DottedLineIcon className="w-5 h-5" />;
    return <ArrowIcon className="w-5 h-5" />; // Default to arrow
  };

  const getCurrentLineStyleTooltip = () => {
    if (currentLineStyle === 'arrow') return "Switch to Plain Line";
    if (currentLineStyle === 'plain') return "Switch to Dotted Line";
    return "Switch to Arrow Line"; // Dotted
  };


  return (
    <div className="p-2 bg-gray-100 shadow-md flex flex-wrap items-center gap-x-3 gap-y-2 select-none text-sm">
      <div className="flex items-center gap-1">
        <button title="Import File (Image/Text)" aria-label="Import File" className="icon-button bg-yellow-400 hover:bg-yellow-500 text-black px-2 py-1.5 rounded-md disabled:opacity-50" onClick={onImportImage} disabled={!!isAnyMajorOperationInProgress}> <ImportImageIcon className="w-5 h-5" /> <span className="ml-1">Import File</span> </button>
        <button title="Load Session (.ccc)" aria-label="Load Session" className="icon-button bg-sky-500 hover:bg-sky-600 text-white px-2 py-1.5 rounded-md disabled:opacity-50" onClick={onImportImage} disabled={!!isAnyMajorOperationInProgress}> <OpenSessionIcon className="w-5 h-5" /> <span className="ml-1">Load Session</span> </button>
        <button title="Clear Canvas" aria-label="Clear Canvas" className="icon-button bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 rounded-md disabled:opacity-50" onClick={onClearCanvas} disabled={!!isAnyMajorOperationInProgress}> <ClearIcon className="w-5 h-5" /> <span className="ml-1">Clear</span> </button>
      </div>

      <div className="flex items-center gap-2 border-l border-r border-gray-300 px-3">
        <div className="relative">
          <button 
            ref={toolsButtonRef} 
            title="Select Tool" 
            aria-label="Select Tool" 
            aria-haspopup="true" 
            aria-expanded={isToolsMenuOpen} 
            className="icon-button flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50"
            onClick={() => {
              setIsToolsMenuOpen(!isToolsMenuOpen);
              if(isToolsMenuOpen) { 
                setIsEmojiSubmenuOpen(false);
                setIsPersonaSubmenuOpen(false);
              }
            }}
            disabled={!!isAnyMajorOperationInProgress}
          >
            <ToolsIcon className="w-5 h-5" /> 
            <span>TOOLS</span> 
            <CaretDownIcon className={`w-4 h-4 transition-transform ${isToolsMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {isToolsMenuOpen && (
            <div ref={toolsMenuRef} className="absolute top-full left-0 mt-1 bg-white shadow-lg rounded-md border border-gray-200 z-50 p-1 flex" style={{minWidth: isEmojiSubmenuOpen || isPersonaSubmenuOpen ? '400px' : '220px'}}>
              <div className="flex-shrink-0 w-[200px] border-r border-gray-200 pr-1">
                {mainTools.map(({ tool, icon: Icon, name }) => ( <button key={tool} title={name} aria-label={`${name} Tool`} role="menuitem" className={`icon-button w-full flex justify-start items-center gap-2 ${currentTool === tool ? 'active' : ''}`} onClick={() => handleToolSelect(tool)}> <Icon className="w-5 h-5" /> <span>{name}</span> </button> ))}
                <hr className="my-1"/>
                {shapeToolItems.map(({ tool, icon: Icon, name }) => ( <button key={tool} title={name} aria-label={`${name} Tool`} role="menuitem" className={`icon-button w-full flex justify-start items-center gap-2 ${currentTool === tool ? 'active' : ''}`} onClick={() => handleToolSelect(tool)}> <Icon className="w-5 h-5" /> <span>{name}</span> </button> ))}
                <hr className="my-1"/>
                {otherTools.map(({ tool, icon: Icon, name, action }) => ( <button key={name} title={name} aria-label={`${name} Tool`} role="menuitem" className={`icon-button w-full flex justify-start items-center gap-2 ${currentTool === tool ? 'active' : ''}`} onClick={() => action ? action() : handleToolSelect(tool)}> <Icon className="w-5 h-5" /> <span>{name}</span> </button> ))}
                 <hr className="my-1"/>
                <button title="Emoji Stamp" aria-label="Emoji Stamp Tool" role="menuitem" className={`icon-button w-full flex justify-start items-center gap-2 ${currentTool === Tool.EMOJI_STAMP ? 'active' : ''} ${isEmojiSubmenuOpen ? 'bg-gray-200' : ''}`} onClick={handleOpenEmojiSubmenu}> <EmojiIcon className="w-5 h-5" /> <span>Emoji Stamp</span> <CaretDownIcon className="ml-auto w-4 h-4" /> </button>
                <button title="Select AI Persona" aria-label="Select AI Persona" role="menuitem" className={`icon-button w-full flex justify-start items-center gap-2 ${isPersonaSubmenuOpen ? 'bg-gray-200' : ''}`} onClick={handleOpenPersonaSubmenu}> {getSelectedPersonaIcon(currentAiPersona)} <span>AI Persona</span> <CaretDownIcon className="ml-auto w-4 h-4" /> </button>
              </div>
              {isEmojiSubmenuOpen && (
                <div ref={emojiSubmenuRef} className="p-2 grid grid-cols-5 gap-1 max-h-60 overflow-y-auto w-[200px]" role="menu">
                  {EMOJI_LIST.map((emoji) => (
                    <button key={emoji} title={`Emoji ${emoji}`} aria-label={`Select emoji ${emoji}`} role="menuitem" className="text-2xl p-1 hover:bg-gray-200 rounded" onClick={() => handleEmojiSelect(emoji)}>
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              {isPersonaSubmenuOpen && (
                <div ref={personaSubmenuRef} className="p-1 w-[200px]" role="menu">
                  {AI_PERSONAS_LIST.map((persona) => (
                    <button key={persona.id} title={persona.description} aria-label={`Select ${persona.name} persona`} role="menuitem" className={`icon-button w-full flex justify-start items-center gap-2 ${currentAiPersona === persona.id ? 'active bg-gray-200' : 'hover:bg-gray-100'}`} onClick={() => handleAiPersonaSelect(persona.id)}>
                      {getSelectedPersonaIcon(persona.id)}
                      <span>{persona.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <label htmlFor="color-picker" className="font-medium text-gray-700">Color:</label>
        <input type="color" id="color-picker" aria-label="Color Picker" value={currentColor} onChange={(e) => { setCurrentColor(e.target.value); setUseTransparentFill(false); }} className="w-7 h-7 p-0.5 border border-gray-300 rounded-full cursor-pointer disabled:opacity-50" disabled={currentTool === Tool.ERASER || currentTool === Tool.SELECT || currentTool === Tool.PAN || !!isAnyMajorOperationInProgress} />
        <button title="No Fill (Transparent)" aria-label="Set shape fill to transparent" onClick={() => setUseTransparentFill(!useTransparentFill)} className={`p-0.5 icon-button ${useTransparentFill && (isAnyShapeTool || currentTool === Tool.ARROW) ? 'active ring-2 ring-blue-500 ring-offset-1' : ''} ${!(isAnyShapeTool || currentTool === Tool.ARROW) ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!(isAnyShapeTool || currentTool === Tool.ARROW) || !!isAnyMajorOperationInProgress}> <NoFillIcon className="text-gray-700" /> </button>
        <div className="flex gap-1"> {COLORS.map(color => ( <div key={color} className={`color-swatch ${!useTransparentFill && currentColor === color && currentTool !== Tool.ERASER && currentTool !== Tool.SELECT && currentTool !== Tool.PAN ? 'active' : ''} ${(currentTool === Tool.ERASER || currentTool === Tool.SELECT || currentTool === Tool.PAN || !!isAnyMajorOperationInProgress) ? 'opacity-50 cursor-not-allowed' : ''}`} style={{ backgroundColor: color }} onClick={() => { if (currentTool !== Tool.ERASER && currentTool !== Tool.SELECT && currentTool !== Tool.PAN && !isAnyMajorOperationInProgress) { setCurrentColor(color); setUseTransparentFill(false); }}} title={color} role="button" aria-label={`Select color ${color}`} /> ))} </div>
        
        <label htmlFor="stroke-width" className="font-medium text-gray-700 ml-2">Width:</label>
        <select id="stroke-width" aria-label="Stroke Width Selector" value={currentStrokeWidth} onChange={(e) => setCurrentStrokeWidth(Number(e.target.value))} className="p-1.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" disabled={currentTool === Tool.PAN || !isDrawingToolWithStroke || !!isAnyMajorOperationInProgress}> {STROKE_WIDTHS.map(width => ( <option key={width} value={width}>{width}px</option> ))} </select>
         {currentTool === Tool.ARROW && (
          <button
            title={getCurrentLineStyleTooltip()}
            aria-label={getCurrentLineStyleTooltip()}
            onClick={toggleLineStyle}
            className={`p-1.5 icon-button ml-2 ${currentLineStyle === 'plain' || currentLineStyle === 'dotted' ? 'active' : ''}`}
            disabled={!!isAnyMajorOperationInProgress}
          >
            {getCurrentLineStyleIcon()}
          </button>
        )}
      </div>
      
      {/* Zoom Controls Section */}
      <div className="flex items-center gap-1 border-l border-gray-300 px-3">
        <button title="Zoom Out" aria-label="Zoom Out" className="icon-button disabled:opacity-50" onClick={onZoomOut} disabled={!!isAnyMajorOperationInProgress}> <ZoomOutIcon className="w-5 h-5" /> </button>
        <button title="Reset Zoom" aria-label="Reset Zoom" className="icon-button px-2 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50" onClick={onResetZoom} disabled={!!isAnyMajorOperationInProgress}> <span className="text-xs">{Math.round(currentZoomLevel * 100)}%</span> </button>
        <button title="Zoom In" aria-label="Zoom In" className="icon-button disabled:opacity-50" onClick={onZoomIn} disabled={!!isAnyMajorOperationInProgress}> <ZoomInIcon className="w-5 h-5" /> </button>
      </div>


      <div className="flex items-center gap-2 flex-wrap">
        <button title="Analyze Whiteboard" aria-label="Analyze Whiteboard with Gemini" className="icon-button bg-green-500 hover:bg-green-600 text-white disabled:bg-green-300 disabled:cursor-not-allowed px-2 py-1.5 rounded-md" onClick={onInitiateAnalysis} disabled={!!isAnyMajorOperationInProgress}> <AnalyzeIcon className="w-5 h-5" /> <span className="ml-1"> {isGeminiLoading && !isModelCardGenerating && !isBriefcaseSaving && !isSessionSaving ? 'Analyzing...' : 'Analyze'} </span> </button>
        <button title="Interact with Gemini" aria-label="Interact with Gemini" className="icon-button bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-300 disabled:cursor-not-allowed px-2 py-1.5 rounded-md" onClick={onOpenGeminiInteraction} disabled={!!isAnyMajorOperationInProgress}> <GeminiIcon className="w-5 h-5" /> <span className="ml-1"> {isGeminiLoading && !isModelCardGenerating && !isBriefcaseSaving && !isSessionSaving ? 'Interacting...' : 'Interact'} </span> </button>
        <button title="Save Session" aria-label="Save Session as .ccc file" className="icon-button bg-indigo-500 hover:bg-indigo-600 text-white disabled:bg-indigo-300 disabled:cursor-not-allowed px-2 py-1.5 rounded-md" onClick={onSaveSession} disabled={!!isAnyMajorOperationInProgress}> <SaveSessionIcon className="w-5 h-5" /> <span className="ml-1"> {isSessionSaving ? 'Saving...' : 'Save Session'} </span> </button>
        <button title="Save Canvas as Image" aria-label="Save Canvas as Image" className="icon-button bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1.5 rounded-md" onClick={onSaveCanvas} disabled={!!isAnyMajorOperationInProgress}> <SaveImageIcon className="w-5 h-5" /> <span className="ml-1">Save IMG</span> </button>
        <button title="Save Model Card" aria-label="Save Model Card as ZIP" className="icon-button bg-teal-500 hover:bg-teal-600 text-white disabled:bg-teal-300 disabled:cursor-not-allowed px-2 py-1.5 rounded-md" onClick={onSaveModelCard} disabled={!!isAnyMajorOperationInProgress}> <ArchiveIcon className="w-5 h-5" /> <span className="ml-1"> {isModelCardGenerating ? 'Saving...' : 'Save Card'} </span> </button>
        <button title="Save Briefcase" aria-label="Save Briefcase as ZIP" className="icon-button bg-orange-500 hover:bg-orange-600 text-white disabled:bg-orange-300 disabled:cursor-not-allowed px-2 py-1.5 rounded-md" onClick={onSaveBriefcase} disabled={!!isAnyMajorOperationInProgress}> <BriefcaseIcon className="w-5 h-5" /> <span className="ml-1"> {isBriefcaseSaving ? 'Saving...' : 'Save Briefcase'} </span> </button>
        
        <div className="flex items-center gap-1 ml-auto"> 
            <label htmlFor="session-name" className="font-medium text-gray-700">Session:</label>
            <input type="text" id="session-name" aria-label="Session Name" value={sessionName} onChange={(e) => onSessionNameChange(e.target.value)} className="p-1.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-40" placeholder="Enter session name" disabled={!!isAnyMajorOperationInProgress} />
        </div>
      </div>
    </div>
  );
};
export default Toolbar;
