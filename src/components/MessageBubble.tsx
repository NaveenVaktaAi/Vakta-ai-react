import { useState } from "react";
import { BotIcon, UserIcon, CopyIcon, CheckIcon, FileTextIcon, ClockIcon, AlertCircleIcon } from "./icons";
import FormattedMessage from "./FormattedMessage";

interface MessageMetadata {
  source_documents?: string[];
  context_chunks_used?: number;
  retrieval_performed?: boolean;
  processing_time?: number;
  suggestion?: {
    suggest: boolean;
    reason: string;
    suggestion?: string;
  };
  fallback_mode?: boolean;
  error?: string;
  citation_source?: "document" | "web_search" | "ai";  // ✅ Citation source for response
}

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: string;
  metadata?: MessageMetadata;
}

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const formatUserContent = (content: string) => {
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold'>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>")
      .replace(/`(.*?)`/g, "<code class='bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded font-mono text-sm'>$1</code>")
      .replace(/^\s*#\s+(.*)$/gm, "<h3 class='font-bold text-lg mt-4 mb-2'>$1</h3>")
      .replace(/^\s*##\s+(.*)$/gm, "<h4 class='font-bold text-base mt-3 mb-1'>$1</h4>")
      .replace(/^\s*-\s+(.*)$/gm, "<li class='list-disc ml-6'>$1</li>")
      .replace(/^\s*\d+\.\s+(.*)$/gm, "<li class='list-decimal ml-6'>$1</li>");

    formatted = formatted.replace(/(?:(<li class='list-disc.*<\/li>)+)/, "<ul class='space-y-1'>$1</ul>");
    formatted = formatted.replace(/(?:(<li class='list-decimal.*<\/li>)+)/, "<ol class='space-y-1'>$1</ol>");

    formatted = formatted.replace(/\n\n/g, '</p><p class="mt-3">').replace(/\n/g, "<br>");

    return `<p class="leading-relaxed text-white">${formatted}</p>`;
  };

  const hasRAGInfo =
    message.metadata &&
    (message.metadata.source_documents?.length ||
      message.metadata.retrieval_performed ||
      message.metadata.context_chunks_used);

  return (
    <div className={`flex gap-4 group ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
      {message.sender === "bot" && (
        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full self-start flex-shrink-0 shadow-sm">
          <BotIcon className="w-5 h-5 text-white" />
        </div>
      )}
      <div className="max-w-[80%] space-y-3"> 
        <div
          className={`p-4 rounded-2xl shadow-md relative ${ 
            message.sender === "user"
              ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
              : "bg-white text-gray-900"
          }`}
        >
          <div className="text-base leading-7">
            {message.sender === "bot" ? (
              <FormattedMessage content={message.content} />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: formatUserContent(message.content) }} />
            )}
          </div>
          {message.sender === "bot" && message.metadata && (
            <div className="mt-4 space-y-3 border-t border-gray-200 pt-3">
              <div className="flex flex-wrap gap-2">
                {message.metadata.processing_time && (
                  <div className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    <ClockIcon className="w-3 h-3" />
                    {message.metadata.processing_time.toFixed(2)}s
                  </div>
                )}
                {message.metadata.context_chunks_used && (
                  <div className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    {message.metadata.context_chunks_used} chunks
                  </div>
                )}
                {message.metadata.fallback_mode && (
                  <div className="text-xs px-2 py-1 bg-gray-100 border border-gray-300 rounded">
                    Demo Mode
                  </div>
                )}
              </div>
              {message.metadata.error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertCircleIcon className="w-4 h-4" />
                  {message.metadata.error}
                </div>
              )}
              {message.metadata.suggestion?.suggest && (
                <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800 space-y-1">
                  <p className="font-medium">💡 Suggestion:</p>
                  <p>{message.metadata.suggestion.reason}</p>
                  {message.metadata.suggestion.suggestion && (
                    <p className="italic">"{message.metadata.suggestion.suggestion}"</p>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-2 mt-3 text-xs text-gray-500">
            <span className="flex-shrink-0">{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}</span>
            
            {/* ✅ Citation Badge - Next to timestamp and copy button */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              {message.sender === "bot" && message.metadata?.citation_source && (
                <span className={`
                  text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide
                  ${message.metadata.citation_source === "document" 
                    ? "bg-blue-50 text-blue-600 border border-blue-200" 
                    : message.metadata.citation_source === "web_search"
                    ? "bg-green-50 text-green-600 border border-green-200"
                    : "bg-gray-50 text-gray-500 border border-gray-200"
                  }
                `}>
                  {message.metadata.citation_source === "document" 
                    ? "📄 Document" 
                    : message.metadata.citation_source === "web_search"
                    ? "🌐 Web Search"
                    : "🤖 AI"
                  }
                </span>
              )}
              
              <button
                onClick={copyToClipboard}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0"
                title="Copy message"
              >
                {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
        {hasRAGInfo && message.sender === "bot" && (
          <button
            onClick={() => setShowSources(!showSources)}
            className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 shadow-sm flex items-center gap-1"
          >
            <FileTextIcon className="w-3 h-3 mr-1" />
            {message.metadata?.source_documents?.length || 0} sources
            {showSources ? " ▲" : " ▼"}
          </button>
        )}
        {showSources && hasRAGInfo && (
          <div className="mt-2 space-y-2">
            {message.metadata?.source_documents?.map((source, index) => (
              <div key={index} className="p-2 flex items-center gap-2 text-sm bg-white shadow-sm rounded border border-gray-200">
                <FileTextIcon className="w-4 h-4 text-blue-600" />
                <span className="truncate">{source}</span>
              </div>
            ))}
            {message.metadata?.retrieval_performed && (
              <div className="text-xs px-2 py-1 bg-gray-100 rounded">✓ Search performed</div>
            )}
          </div>
        )}
      </div>
      {message.sender === "user" && (
        <div className="p-2.5 bg-gray-200 rounded-full self-start flex-shrink-0 shadow-sm">
          <UserIcon className="w-5 h-5 text-gray-600" />
        </div>
      )}
    </div>
  );
}

