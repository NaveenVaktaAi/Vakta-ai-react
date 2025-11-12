import React from "react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // Import KaTeX CSS

interface FormattedMessageProps {
  content: string;
}

export default function FormattedMessage({ content }: FormattedMessageProps) {
  const safeContent = typeof content === "string" ? content : String(content || "");

  // Preprocess content to convert non-standard math delimiters to standard LaTeX format
  // Backend sends: [ ... ] for display math and ( ... ) for inline math
  // Convert to: $$...$$ for display math and $...$ for inline math
  const preprocessMath = (text: string): string => {
    let processed = text;
    
    // Helper function to check if content is likely LaTeX math
    const isMathContent = (content: string): boolean => {
      // Check for LaTeX commands (like \frac, \sqrt, \omega, \text, \rho, etc.)
      const hasLaTeXCommand = /\\[a-zA-Z]+\{/.test(content) || /\\[a-zA-Z]+/.test(content);
      // Check for math symbols
      const hasMathSymbols = /[=+\-*/√∑∫∞×÷^_²³]/.test(content);
      // Check for Greek letters (Unicode or LaTeX commands like \omega, \rho, etc.)
      const hasGreek = /[αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ]|\\[a-zA-Z]+/.test(content);
      // Check for superscripts/subscripts
      const hasSubSuper = /[^_]|\\text\{|\\frac\{|\\sqrt\{/.test(content);
      
      return hasLaTeXCommand || hasMathSymbols || hasGreek || hasSubSuper;
    };
    
    // Step 1: Convert display math [ ... ] → $$ ... $$
    // Handle nested brackets by finding matching pairs
    const convertDisplayMath = (str: string): string => {
      let result = '';
        let i = 0;
      while (i < str.length) {
        if (str[i] === '[' && (i === 0 || str[i-1] !== '\\')) {
          // Find matching closing bracket (handle nested brackets)
          let depth = 1;
          let j = i + 1;
          while (j < str.length && depth > 0) {
            if (str[j] === '[' && str[j-1] !== '\\') depth++;
            if (str[j] === ']' && str[j-1] !== '\\') depth--;
            j++;
          }
          
          if (depth === 0) {
            // Found matching bracket
            const mathContent = str.substring(i + 1, j - 1);
            if (isMathContent(mathContent.trim())) {
              result += `$$${mathContent.trim()}$$`;
              i = j;
              continue;
            }
          }
        }
        result += str[i];
        i++;
      }
      return result;
          };

    processed = convertDisplayMath(processed);

    // Step 2: Convert inline math ( ... ) → $ ... $
    // Handle nested parentheses by finding matching pairs
    // But skip if inside display math (already processed)
    const convertInlineMath = (str: string): string => {
      let result = '';
      let i = 0;
      let inDisplayMath = false;
      
      while (i < str.length) {
        // Track if we're inside display math
        if (str.substring(i, i+2) === '$$') {
          inDisplayMath = !inDisplayMath;
          result += '$$';
          i += 2;
            continue;
          }

        // Skip processing if inside display math
        if (inDisplayMath) {
          result += str[i];
            i++;
            continue;
          }

        // Process inline math outside display math blocks
        if (str[i] === '(' && (i === 0 || str[i-1] !== '\\')) {
          // Find matching closing parenthesis
          let depth = 1;
          let j = i + 1;
          while (j < str.length && depth > 0) {
            if (str[j] === '(' && str[j-1] !== '\\') depth++;
            if (str[j] === ')' && str[j-1] !== '\\') depth--;
            j++;
          }

          if (depth === 0) {
            // Found matching parenthesis
            const mathContent = str.substring(i + 1, j - 1);
            const trimmed = mathContent.trim();
            
            // Convert if it's likely math
            // Check for single variables like ( I ), ( \rho ), etc.
            const isSingleVar = /^\s*\\?[a-zA-Zαβγδεζηθικλμνξοπρστυφχψω]+\s*$/.test(trimmed);
            // Check for math expressions
            const isMathExpr = trimmed.length < 100 && isMathContent(trimmed);
            
            if (isSingleVar || isMathExpr) {
              result += `$${trimmed}$`;
              i = j;
            continue;
          }
          }
        }
        result += str[i];
        i++;
      }
      return result;
    };
    
    processed = convertInlineMath(processed);
    
    return processed;
  };

  const processedContent = preprocessMath(safeContent);

  // Always use react-markdown with math plugins for consistent rendering
  // This ensures math expressions, markdown formatting, and HTML are all handled properly
  return (
    <div className="prose prose-sm max-w-none 
      [&_*]:text-gray-800 [&_*]:!text-gray-800 
      [&_p]:text-gray-800 [&_p]:leading-relaxed [&_p]:mb-3
      [&_strong]:text-gray-900 [&_strong]:font-semibold 
      [&_em]:italic [&_em]:text-gray-700
      [&_h1]:text-blue-700 [&_h1]:font-bold [&_h1]:text-2xl [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:border-b [&_h1]:border-blue-200 [&_h1]:pb-1
      [&_h2]:text-blue-600 [&_h2]:font-bold [&_h2]:text-xl [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:border-b [&_h2]:border-blue-200 [&_h2]:pb-1
      [&_h3]:text-blue-600 [&_h3]:font-bold [&_h3]:text-lg [&_h3]:mt-4 [&_h3]:mb-2
      [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_ul]:my-4
      [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 [&_ol]:my-4
      [&_li]:text-gray-800 [&_li]:leading-relaxed
      [&_code]:bg-gray-100 [&_code]:px-2 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:text-indigo-600
      [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-3
      [&_.katex]:text-gray-800 [&_.katex-display]:text-center [&_.katex-display]:my-4
      [&_.katex-display]:bg-blue-50 [&_.katex-display]:border [&_.katex-display]:border-blue-300 [&_.katex-display]:rounded-lg [&_.katex-display]:p-4">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
