import { LinkIcon, ExternalLink } from "lucide-react";
import { useState } from "react";

interface WebPreviewCardProps {
  url: string;
  title?: string;
}

export default function WebPreviewCard({ url, title }: WebPreviewCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <div 
        className="w-full h-48 bg-gray-100 bg-cover bg-center relative"
        style={{ backgroundImage: imageError ? 'none' : `url(https://api.microlink.io/screenshot?url=${encodeURIComponent(url)})` }}
      >
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
            <LinkIcon className="w-12 h-12 text-blue-400" />
          </div>
        )}
      </div>
      <div className="p-4 bg-white">
        <h3 className="font-semibold text-gray-900 truncate mb-2">
          {title || new URL(url).hostname}
        </h3>
        <p className="text-xs text-gray-500 truncate mb-3">
          {url}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Open in browser
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

