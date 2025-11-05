import React from "react";

interface FormattedMessageProps {
  content: string;
}

export default function FormattedMessage({ content }: FormattedMessageProps) {
  const safeContent = typeof content === "string" ? content : String(content || "");

  // Check if content contains HTML tags
  const hasHTML = /<[^>]+>/.test(safeContent);
  
  if (hasHTML) {
    // ✅ ULTRA-ROBUST HTML CLEANING - Handle ALL edge cases
    let cleanHTML = safeContent;
    
    // Step 0: Decode HTML entities FIRST (in case HTML is escaped)
    cleanHTML = cleanHTML
      .replace(/&amp;/g, '&')  // Do & first to avoid double-decoding
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
    
    // Step 1: Remove ALL attributes from opening tags (including nested quotes, malformed attributes)
    cleanHTML = cleanHTML.replace(/<(\/?)(\w+)([^>]*)>/gi, (match, closingSlash, tagName, attributes) => {
      // If it's a closing tag, return as-is
      if (closingSlash) {
        return `</${tagName}>`;
      }
      // For opening tags, remove ALL attributes - handle even malformed HTML
      return `<${tagName}>`;
    });
    
    // Step 2: Clean up any self-closing tags (img, br, hr, etc.)
    cleanHTML = cleanHTML
      .replace(/<img>/gi, '')
      .replace(/<br>/gi, '<br />')
      .replace(/<hr>/gi, '<hr />');
    
    // Step 3: Remove any remaining malformed tags or attributes that slipped through
    cleanHTML = cleanHTML
      .replace(/<\s+>/g, '')  // Remove empty tags
      .replace(/<(\w+)\s+>/g, '<$1>')  // Clean extra spaces
      .replace(/<\/\s+>/g, '');  // Remove malformed closing tags
    
    // Step 4: Now add ONLY our clean Tailwind classes (in proper order)
    cleanHTML = cleanHTML
      // Headings first (most specific)
      .replace(/<h1>/gi, '<h1 class="font-bold mt-6 mb-3 text-2xl text-blue-700 border-b border-blue-200 pb-1">')
      .replace(/<h2>/gi, '<h2 class="font-bold mt-6 mb-3 text-xl text-blue-600 border-b border-blue-200 pb-1">')
      .replace(/<h3>/gi, '<h3 class="font-bold mt-5 mb-2 text-lg text-blue-600">')
      .replace(/<h4>/gi, '<h4 class="font-bold mt-4 mb-2 text-base text-blue-600">')
      .replace(/<h5>/gi, '<h5 class="font-semibold mt-3 mb-2 text-sm text-blue-600">')
      .replace(/<h6>/gi, '<h6 class="font-semibold mt-3 mb-2 text-xs text-blue-600">')
      // Text formatting
      .replace(/<strong>/gi, '<strong class="font-semibold text-gray-900">')
      .replace(/<b>/gi, '<strong class="font-semibold text-gray-900">')
      .replace(/<em>/gi, '<em class="italic text-gray-700">')
      .replace(/<i>/gi, '<em class="italic text-gray-700">')
      // Code
      .replace(/<code>/gi, '<code class="bg-gray-100 px-2 py-0.5 rounded text-sm font-mono text-indigo-600">')
      .replace(/<pre>/gi, '<pre class="bg-gray-100 p-3 rounded-lg overflow-x-auto my-3">')
      // Lists
      .replace(/<ul>/gi, '<ul class="list-disc pl-6 space-y-2 my-3">')
      .replace(/<ol>/gi, '<ol class="list-decimal pl-6 space-y-2 my-3">')
      .replace(/<li>/gi, '<li class="text-gray-800">')
      // Other elements
      .replace(/<p>/gi, '<p class="text-gray-800 mb-3 leading-relaxed">')
      .replace(/<blockquote>/gi, '<blockquote class="border-l-4 border-blue-400 pl-4 italic text-gray-700 my-3">')
      .replace(/<span>/gi, '<span>');  // Keep spans but without classes
    
    // Step 5: Remove duplicate/nested strong tags (fixes <strong><strong>text</strong></strong>)
    cleanHTML = cleanHTML
      // Remove nested strong tags: <strong><strong>text</strong></strong> → <strong>text</strong>
      .replace(/<strong>\s*<strong>/gi, '<strong>')
      .replace(/<\/strong>\s*<\/strong>/gi, '</strong>')
      // Remove triple nesting
      .replace(/<strong>\s*<strong>\s*<strong>/gi, '<strong>')
      .replace(/<\/strong>\s*<\/strong>\s*<\/strong>/gi, '</strong>')
      // Remove nested b/strong: <strong><b>text</b></strong> → <strong>text</strong>
      .replace(/<strong>\s*<b>/gi, '<strong>')
      .replace(/<\/b>\s*<\/strong>/gi, '</strong>')
      .replace(/<b>\s*<strong>/gi, '<strong>')
      .replace(/<\/strong>\s*<\/b>/gi, '</strong>');
    
    // Step 6: Final cleanup - remove any stray attributes that might remain
    cleanHTML = cleanHTML.replace(/<(\w+)([^>]*class[^>]*)>/gi, (match, tagName) => {
      // If we find a tag with class attribute that we missed, strip it again
      return `<${tagName}>`;
    });
    
    // If content has HTML, render it safely with basic formatting
    return (
      <div className="space-y-4 text-base leading-7 text-gray-800" style={{ color: '#1f2937 !important' }}>
        <div 
          className="prose prose-sm max-w-none [&_*]:text-gray-800 [&_*]:!text-gray-800 [&_p]:text-gray-800 [&_strong]:text-gray-900 [&_strong]:font-semibold [&_em]:italic [&_h1]:text-blue-700 [&_h2]:text-blue-600 [&_h3]:text-blue-600 [&_li]:text-gray-800"
          style={{ color: '#1f2937' }}
          dangerouslySetInnerHTML={{ __html: cleanHTML }}
        />
      </div>
    );
  }

  // Split into blocks separated by double newlines for paragraphs, sections
  const blocks = safeContent.split(/\n{2,}/);

  return (
    <div className="space-y-4 text-base leading-7 text-gray-800 [&_*]:text-gray-800 [&_*]:!text-gray-800 [&_strong]:font-semibold [&_strong]:text-gray-900 [&_strong]:!text-gray-900 [&_em]:italic [&_code]:bg-gray-100 [&_code]:px-2 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:text-indigo-600 [&_h1]:text-blue-700 [&_h1]:font-bold [&_h2]:text-blue-600 [&_h2]:font-bold [&_h3]:text-blue-600 [&_h3]:font-bold [&_ul]:my-4 [&_ol]:my-4 [&_li]:text-gray-800 [&_li]:leading-relaxed" style={{ color: '#1f2937 !important' }}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        const elements: React.ReactNode[] = [];
        let i = 0;

        while (i < lines.length) {
          let line = lines[i].trim();

          if (!line) {
            i++;
            continue;
          }

          // Markdown support for bold, italic, inline code (NO inline styles/classes - handled by CSS)
          const processMarkdown = (text: string) => {
            // Skip markdown processing if text already contains HTML tags (to avoid duplicates)
            if (/<[^>]+>/.test(text)) {
              // If HTML exists, just clean attributes and return
              return text.replace(/<(\w+)([^>]*)>/gi, (match, tagName) => `<${tagName}>`);
            }
            
            // Otherwise, process markdown normally
            let processed = text
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/`(.*?)`/g, '<code>$1</code>');
            
            // Remove duplicate/nested strong tags that might be created
            processed = processed
              .replace(/<strong>\s*<strong>/gi, '<strong>')
              .replace(/<\/strong>\s*<\/strong>/gi, '</strong>')
              .replace(/<strong>\s*<b>/gi, '<strong>')
              .replace(/<\/b>\s*<\/strong>/gi, '</strong>')
              .replace(/<b>\s*<strong>/gi, '<strong>')
              .replace(/<\/strong>\s*<\/b>/gi, '</strong>');
            
            return processed;
          };

          line = processMarkdown(line);

          // Headings: Support markdown # syntax (###, ##, #)
          let headingLevel = 0;
          const hashMatch = line.match(/^(#{1,6})\s*(.+)/);
          if (hashMatch) {
            headingLevel = hashMatch[1].length;
            line = hashMatch[2].trim();
            // Process markdown in heading text (for bold, etc.)
            line = processMarkdown(line);
            // Clean HTML attributes
            line = line.replace(/<(\w+)([^>]*)>/gi, (match, tagName) => `<${tagName}>`);
          } else if (
            line.length < 50 &&
            line === line.toUpperCase() &&
            line.endsWith(":") &&
            !line.includes("→") &&
            !line.includes("=") &&
            /^[A-Z\s:]+$/.test(line)
          ) {
            headingLevel = 3;
          }
          if (headingLevel > 0) {
            const HeadingTag = `h${headingLevel}` as keyof JSX.IntrinsicElements;
            elements.push(
              <HeadingTag
                key={`heading-${blockIndex}-${i}`}
                className={`font-bold mt-6 mb-3 ${headingLevel === 1 ? 'text-2xl text-blue-700 border-b-2 border-blue-300' : headingLevel === 2 ? 'text-xl text-blue-600 border-b border-blue-200' : 'text-lg text-blue-600 border-b border-blue-200'} pb-2`}
              >
                <span dangerouslySetInnerHTML={{ __html: line.replace(/:$/, "") }} />
              </HeadingTag>
            );
            i++;
            continue;
          }

          // Handle potential category prefixes like "Chemical Reaction: "
          if (line.includes(": ") && line.split(":")[0].toLowerCase().includes("reaction")) {
            const [prefix, ...rest] = line.split(": ");
            const content = rest.join(": ").trim();
            elements.push(
              <p key={`prefix-${blockIndex}-${i}`} className="leading-relaxed">
                <strong className="text-blue-600">{prefix}:</strong> {content}
              </p>
            );
            i++;
            continue;
          }

          // Numbered lists (multi-line) - improved spacing and styling
          if (/^\d+\.\s/.test(lines[i])) {
            const listItems: string[] = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
              let itemLine = lines[i].replace(/^\d+\.\s*/, "").trim();
              itemLine = processMarkdown(itemLine);
              // Clean any HTML attributes
              itemLine = itemLine.replace(/<(\w+)([^>]*)>/gi, (match, tagName) => `<${tagName}>`);
              listItems.push(itemLine);
              i++;
            }
            elements.push(
              <ol key={`numlist-${blockIndex}-${i}`} className="list-decimal pl-6 sm:pl-8 space-y-3 my-4 text-gray-800">
                {listItems.map((item, idx) => (
                  <li key={idx} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ol>
            );
            continue;
          }

          // Bullet lists (multi-line) - improved spacing and styling
          if (/^[-*•]\s/.test(lines[i])) {
            const listItems: string[] = [];
            while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
              let itemLine = lines[i].replace(/^[-*•]\s*/, "").trim();
              itemLine = processMarkdown(itemLine);
              // Clean any HTML attributes
              itemLine = itemLine.replace(/<(\w+)([^>]*)>/gi, (match, tagName) => `<${tagName}>`);
              listItems.push(itemLine);
              i++;
            }
            elements.push(
              <ul key={`bullist-${blockIndex}-${i}`} className="list-disc pl-6 sm:pl-8 space-y-3 my-4 text-gray-800">
                {listItems.map((item, idx) => (
                  <li key={idx} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ul>
            );
            continue;
          }

          // Important notes or highlights
          if (line.includes("important") || line.includes("note") || line.includes("tip") || line.includes("key point") || line.startsWith("!")) {
            let noteContent = line.replace(/^!/, "").trim();
            while (i + 1 < lines.length && (lines[i + 1].startsWith("  ") || !/^[#-*0-9]/.test(lines[i + 1]))) {
              i++;
              noteContent += " " + lines[i].trim();
            }
            noteContent = processMarkdown(noteContent);
            // Clean any HTML attributes
            noteContent = noteContent.replace(/<(\w+)([^>]*)>/gi, (match, tagName) => `<${tagName}>`);
            elements.push(
              <div key={`note-${blockIndex}-${i}`} className="my-3 p-3 bg-yellow-100/80 border-l-4 border-yellow-400 rounded-r-md text-yellow-800 text-sm leading-relaxed">
                <strong className="block font-semibold mb-1">📌 Important Note:</strong>
                <span dangerouslySetInnerHTML={{ __html: noteContent }} />
              </div>
            );
            i++;
            continue;
          }

          // LaTeX Math Expressions - Render without hardcoded "Formula" heading
          if (/\\\[|\\\(|\$\$|\$/.test(line) || /\\(begin|end){equation}/.test(line) || /[0-9a-zA-Z]+\^/.test(line) || /∫|∑|√/.test(line)) {
            let formula = line;
            let isDisplayMath = false;
            
            if (line.includes('\\[') || line.includes('$$')) {
              isDisplayMath = true;
              while (i + 1 < lines.length && !lines[i + 1].includes('\\]') && !lines[i + 1].includes('$$')) {
                i++;
                formula += "\n" + lines[i].trim();
              }
              if (i + 1 < lines.length) {
                i++;
                formula += "\n" + lines[i].trim();
              }
            } else {
              while (i + 1 < lines.length && /[$\[\]]/.test(lines[i + 1])) {
                i++;
                formula += "\n" + lines[i].trim();
              }
            }
            
            let cleanFormula = formula
              .replace(/\\\[/g, '')
              .replace(/\\\]/g, '')
              .replace(/\\\(/g, '')
              .replace(/\\\)/g, '')
              .replace(/\$\$/g, '')
              .replace(/\$/g, '')
              .trim();
            
            // Render as simple code block without "Formula" heading
            elements.push(
              <div key={`formula-${blockIndex}-${i}`} className={`my-3 p-4 ${isDisplayMath ? 'bg-blue-50/80 border border-blue-300' : 'bg-indigo-50/80 border border-indigo-300'} rounded-lg`}>
                <div className={`${isDisplayMath ? 'text-center' : ''} text-blue-800`}>
                  <code className={`font-mono text-sm whitespace-pre-wrap ${isDisplayMath ? 'text-base' : ''}`}>
                    {cleanFormula}
                  </code>
                </div>
              </div>
            );
            i++;
            continue;
          }

          // Calculations - Render without hardcoded "Calculation" heading
          if (
            (line.includes("calculate") || line.includes("solve") || line.includes("we can find") || line.includes("using")) && 
            (/[0-9]+\s*[+\-*/=]\s*[0-9]+/.test(line) || /\\[\[\]\(\)]/.test(line)) &&
            !line.includes("→") &&
            line.length < 300
          ) {
            let calcContent = line;
            while (i + 1 < lines.length && (
              /[0-9+\-*/=]/.test(lines[i + 1]) || 
              /\\[\[\]\(\)]/.test(lines[i + 1]) ||
              lines[i + 1].includes("=") ||
              lines[i + 1].includes("m/s") ||
              lines[i + 1].trim().length < 50
            )) {
              i++;
              calcContent += "\n" + lines[i].trim();
            }
            calcContent = processMarkdown(calcContent);
            // Clean any HTML attributes
            calcContent = calcContent.replace(/<(\w+)([^>]*)>/gi, (match, tagName) => `<${tagName}>`);
            // Render as simple content without "Calculation" heading
            elements.push(
              <div key={`calc-${blockIndex}-${i}`} className="my-3 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                <div className="text-indigo-800 leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: calcContent }} />
                </div>
              </div>
            );
            i++;
            continue;
          }

          // Chemical Reactions
          if (
            line.includes("→") && 
            (/[A-Z][a-z]?\d*[A-Z][a-z]?\d*/.test(line) || /H₂O|CO₂|CH₄|NaCl|CaCO₃/.test(line))
          ) {
            let reaction = line;
            while (i + 1 < lines.length && lines[i + 1].includes("→")) {
              i++;
              reaction += " " + lines[i].trim();
            }
            const parts = reaction.split("→");
            let reactant = parts[0]?.trim() || "";
            let product = parts.slice(1).join("→").trim();
            reactant = processMarkdown(reactant);
            product = processMarkdown(product);
            // Clean any HTML attributes
            reactant = reactant.replace(/<(\w+)([^>]*)>/gi, (match, tagName) => `<${tagName}>`);
            product = product.replace(/<(\w+)([^>]*)>/gi, (match, tagName) => `<${tagName}>`);

            let condition = "";
            if (/Δ|heat/i.test(reaction)) condition = " (Heat)";
            else if (/electricity|electrolysis/i.test(reaction)) condition = " (Electricity)";
            else if (/light/i.test(reaction)) condition = " (Light)";

            elements.push(
              <div key={`reaction-${blockIndex}-${i}`} className="my-3 p-3 bg-cyan-50/80 rounded-md text-sm font-mono text-cyan-800">
                <strong className="block font-semibold text-cyan-700 mb-1">Chemical Reaction{condition}:</strong>
                <div className="flex items-center justify-center gap-4">
                  <span dangerouslySetInnerHTML={{ __html: reactant }} />
                  <span className="text-2xl">→</span>
                  <span dangerouslySetInnerHTML={{ __html: product }} />
                </div>
              </div>
            );
            i++;
            continue;
          }

          // Biology Processes - Removed hardcoded "Biology Concept" heading
          // Content will be rendered as regular paragraph instead

          // Image handling
          const imageMatch = line.match(/\[Image Reference:\s*(https?:\/\/[^\s\]]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s\]]*)?)\s*\]/i) || line.match(/(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?)/i);
          if (imageMatch) {
            const imageUrl = imageMatch[1] || imageMatch[0];
            elements.push(
              <figure key={`img-${blockIndex}-${i}`} className="my-4">
                <img
                  src={imageUrl}
                  alt="Reference Image"
                  className="max-w-full h-auto rounded-lg shadow-md mx-auto"
                  style={{ maxHeight: "400px" }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    target.parentElement!.innerHTML = `<div class="p-4 bg-gray-100 rounded border-2 border-dashed border-gray-300 text-center text-sm text-gray-600">Image could not be loaded: ${imageUrl}</div>`;
                  }}
                />
                <figcaption className="text-xs text-gray-500 mt-2 text-center">Reference Image</figcaption>
              </figure>
            );
            i++;
            continue;
          }

          // Default paragraph - clean any remaining HTML attributes and remove duplicate strong tags
          let cleanLine = line.replace(/<(\w+)([^>]*)>/gi, (match, tagName) => `<${tagName}>`);
          // Remove duplicate/nested strong tags
          cleanLine = cleanLine
            .replace(/<strong>\s*<strong>/gi, '<strong>')
            .replace(/<\/strong>\s*<\/strong>/gi, '</strong>')
            .replace(/<strong>\s*<b>/gi, '<strong>')
            .replace(/<\/b>\s*<\/strong>/gi, '</strong>')
            .replace(/<b>\s*<strong>/gi, '<strong>')
            .replace(/<\/strong>\s*<\/b>/gi, '</strong>');
          
          // ✅ Enhanced paragraph styling for AI Tutor responses
          elements.push(
            <p key={`p-${blockIndex}-${i}`} className="leading-relaxed text-gray-800 mb-3" style={{ color: '#1f2937' }} dangerouslySetInnerHTML={{ __html: cleanLine }} />
          );
          i++;
        }

        return <div key={blockIndex} className="space-y-2">{elements}</div>;
      })}
    </div>
  );
}

