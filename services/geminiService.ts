
// We declare these as global because they are loaded via CDN scripts in index.html
declare global {
  interface Window {
    pdfjsLib: any;
    mammoth: any;
  }
}

interface ConversionRequest {
  file: File;
  arrayBuffer: ArrayBuffer;
  textData?: string; // For HTML
}

export const convertLocalFile = async ({ file, arrayBuffer, textData }: ConversionRequest): Promise<string> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    // 1. HTML File (Pass-through with cleanup)
    if (fileType === 'text/html' || fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      return textData || "";
    }

    // 2. Word Document (.docx) using Mammoth.js
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
      if (!window.mammoth) throw new Error("Mammoth library not loaded");
      
      const result = await window.mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
      if (result.messages.length > 0) {
        console.warn("Mammoth messages:", result.messages);
      }
      return result.value;
    }

    // 3. PDF Document using PDF.js
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      if (!window.pdfjsLib) throw new Error("PDF.js library not loaded");

      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullHtml = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Intelligent Line Reconstruction
        // PDF text items come as separate strings with coordinates.
        // We sort them by Y (top to bottom) and then X (left to right).
        // Then we check the Y difference to guess if it's a new line.
        
        const items = textContent.items.map((item: any) => ({
          str: item.str,
          y: item.transform[5], // Y coordinate
          x: item.transform[4], // X coordinate (not used heavily but good for sort)
          height: item.height || 10
        }));

        // Sort: Top to bottom (higher Y is higher up in PDF coordinates usually, but depends on origin. 
        // PDF origin is bottom-left usually. So higher Y = top of page)
        items.sort((a: any, b: any) => b.y - a.y || a.x - b.x);

        let pageHtml = "";
        let lastY = -1;
        let currentParagraph = "";

        for (const item of items) {
          // If this is the first item
          if (lastY === -1) {
            currentParagraph += item.str;
            lastY = item.y;
            continue;
          }

          // Check vertical distance. If significant (> height * 1.5), it's a new line/paragraph
          const diffY = Math.abs(item.y - lastY);
          
          if (diffY > item.height * 1.5) {
            // New paragraph
            if (currentParagraph.trim().length > 0) {
              pageHtml += `<p>${currentParagraph.trim()}</p>`;
            }
            currentParagraph = item.str;
          } else {
            // Same line or close enough
            // Add a space if it doesn't have one
            if (!currentParagraph.endsWith(" ") && !item.str.startsWith(" ")) {
               currentParagraph += " ";
            }
            currentParagraph += item.str;
          }
          lastY = item.y;
        }
        
        // Flush last paragraph
        if (currentParagraph.trim().length > 0) {
          pageHtml += `<p>${currentParagraph.trim()}</p>`;
        }

        if (pageHtml.length > 0) {
            fullHtml += `<div class="page-content">${pageHtml}</div><hr class="page-break"/>`;
        }
      }
      return fullHtml;
    }

    throw new Error("Unsupported file type for offline conversion.");

  } catch (error: any) {
    console.error("Local Conversion Error:", error);
    throw new Error(`Failed to convert locally: ${error.message}`);
  }
};