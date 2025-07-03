// FILENAME: src/features/toolManager/useToolManager.ts - VERSION: v1 (Path Updated)
// Updated to v2 with lineStyle
import { useState } from 'react';
import { Tool, LineStyle } from '../../../types'; 
import { DEFAULT_COLOR, DEFAULT_STROKE_WIDTH, DEFAULT_LINE_STYLE } from '../../../constants';

export interface ToolManagerHook {
  currentTool: Tool;
  setCurrentTool: React.Dispatch<React.SetStateAction<Tool>>;
  currentColor: string;
  setCurrentColor: React.Dispatch<React.SetStateAction<string>>;
  currentStrokeWidth: number;
  setCurrentStrokeWidth: React.Dispatch<React.SetStateAction<number>>;
  useTransparentFill: boolean;
  setUseTransparentFill: React.Dispatch<React.SetStateAction<boolean>>;
  selectedEmojiStamp: string | null;
  setSelectedEmojiStamp: React.Dispatch<React.SetStateAction<string | null>>;
  currentLineStyle: LineStyle;
  setCurrentLineStyle: React.Dispatch<React.SetStateAction<LineStyle>>;
}

export const useToolManager = (): ToolManagerHook => {
  const [currentTool, setCurrentTool] = useState<Tool>(Tool.SELECT);
  const [currentColor, setCurrentColor] = useState<string>(DEFAULT_COLOR);
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(DEFAULT_STROKE_WIDTH);
  const [useTransparentFill, setUseTransparentFill] = useState<boolean>(false);
  const [selectedEmojiStamp, setSelectedEmojiStamp] = useState<string | null>(null);
  const [currentLineStyle, setCurrentLineStyle] = useState<LineStyle>(DEFAULT_LINE_STYLE);

  return {
    currentTool, setCurrentTool,
    currentColor, setCurrentColor,
    currentStrokeWidth, setCurrentStrokeWidth,
    useTransparentFill, setUseTransparentFill,
    selectedEmojiStamp, setSelectedEmojiStamp,
    currentLineStyle, setCurrentLineStyle,
  };
};