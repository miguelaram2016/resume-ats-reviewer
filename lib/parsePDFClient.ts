// Client-side PDF parsing using PDF.js
// This runs in the browser where web workers are supported

let pdfjsLib: any = null;

export async function parsePDFClientSide(file: File): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    // Dynamically import PDF.js
    if (!pdfjsLib) {
      pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 10);

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return { text: fullText, success: true };
  } catch (error) {
    console.error('Client-side PDF parsing failed:', error);
    return { 
      text: '', 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}
