import { useState, useEffect, useRef } from "react";
import { MessageSquareIcon } from "./icons";

interface TextSelectionPopupProps {
  onAskQuestion: (selectedText: string) => void;
}

export default function TextSelectionPopup({ onAskQuestion }: TextSelectionPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTextSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        
        if (rect) {
          const x = rect.left + rect.width / 2;
          const y = rect.top - 10;
          
          setPosition({ x, y });
          setSelectedText(text);
          setIsVisible(true);
        }
      } else {
        setIsVisible(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAskQuestion = () => {
    onAskQuestion(selectedText);
    setIsVisible(false);
    window.getSelection()?.removeAllRanges();
  };

  if (!isVisible) return null;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 flex items-center gap-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <button
        onClick={handleAskQuestion}
        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-auto rounded flex items-center gap-1 transition-colors"
      >
        <MessageSquareIcon className="w-3 h-3" />
        Ask DocSathi
      </button>
    </div>
  );
}

