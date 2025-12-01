
import React, { useState, useEffect } from 'react';
import { Dropzone } from './components/Dropzone';
import { Button } from './components/Button';
import { ConversionStatus, ConvertedFile } from './types';
import { readTextFile, createEpubBlob, createMobiBlob, readFileAsArrayBuffer } from './utils/fileHelpers';
import { convertLocalFile } from './services/geminiService';

const App: React.FC = () => {
  const [status, setStatus] = useState<ConversionStatus>(ConversionStatus.IDLE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ConvertedFile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversionTime, setConversionTime] = useState<number>(0);
  const [outputFormat, setOutputFormat] = useState<'epub' | 'azw3'>('epub');

  // Timer for UX
  useEffect(() => {
    let interval: number;
    if (status === ConversionStatus.PROCESSING) {
      interval = window.setInterval(() => {
        setConversionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setStatus(ConversionStatus.IDLE);
    setErrorMessage(null);
    setResult(null);
    setConversionTime(0);
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setStatus(ConversionStatus.PROCESSING);
    setErrorMessage(null);

    try {
      const isHtml = selectedFile.type === 'text/html' || selectedFile.name.match(/\.(html|htm)$/i);
      
      let htmlContent = "";

      // Perform Local Conversion (Extract Text/HTML)
      if (isHtml) {
        const textData = await readTextFile(selectedFile);
        htmlContent = await convertLocalFile({ file: selectedFile, arrayBuffer: new ArrayBuffer(0), textData });
      } else {
        const arrayBuffer = await readFileAsArrayBuffer(selectedFile);
        htmlContent = await convertLocalFile({ file: selectedFile, arrayBuffer });
      }

      const bookTitle = selectedFile.name.replace(/\.[^/.]+$/, "");
      let blob: Blob;
      let extension: string;

      if (outputFormat === 'azw3') {
        // Generate AZW3 (Mobi container)
        blob = await createMobiBlob(htmlContent, bookTitle);
        extension = '.azw3';
      } else {
        // Generate EPUB (Standard)
        blob = await createEpubBlob(htmlContent, bookTitle);
        extension = '.epub';
      }

      const blobUrl = URL.createObjectURL(blob);
      const newFileName = bookTitle + extension;

      setResult({
        fileName: newFileName,
        originalName: selectedFile.name,
        content: htmlContent, // Kept for preview
        blobUrl: blobUrl
      });
      
      setStatus(ConversionStatus.COMPLETED);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "An unexpected error occurred during conversion.");
      setStatus(ConversionStatus.ERROR);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setStatus(ConversionStatus.IDLE);
    setErrorMessage(null);
    setConversionTime(0);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto font-sans">
      
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl mb-4 font-serif">
          Offline <span className="text-indigo-600">Kindle</span> Converter
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Convert documents to <strong>EPUB</strong> or <strong>AZW3</strong> securely in your browser.
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Upload Stage */}
        {!selectedFile && (
          <div className="p-8 sm:p-12">
            <Dropzone onFileSelect={handleFileSelect} />
          </div>
        )}

        {/* Selected / Processing Stage */}
        {selectedFile && !result && (
          <div className="p-8 sm:p-12 flex flex-col items-center text-center animate-fadeIn">
            <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 text-indigo-600 border border-indigo-100">
               {selectedFile.name.endsWith('.pdf') && (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
               )}
               {(selectedFile.name.endsWith('.doc') || selectedFile.name.endsWith('.docx')) && (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
               )}
               {(selectedFile.name.endsWith('.html') || selectedFile.name.endsWith('.htm')) && (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
               )}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 truncate max-w-full px-4">
              {selectedFile.name}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>

            {/* Format Selection */}
            <div className="mb-8 w-full max-w-xs">
              <label className="block text-sm font-medium text-slate-700 mb-2">Output Format</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setOutputFormat('epub')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${outputFormat === 'epub' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  EPUB
                </button>
                <button 
                  onClick={() => setOutputFormat('azw3')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${outputFormat === 'azw3' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  AZW3
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {outputFormat === 'epub' 
                  ? "Recommended for 'Send to Kindle' (Email/Web)." 
                  : "Legacy format. Best for USB transfer."}
              </p>
            </div>

            {status === ConversionStatus.ERROR && errorMessage && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm w-full text-left border border-red-100">
                <strong>Conversion Failed:</strong> {errorMessage}
              </div>
            )}

            <div className="flex gap-3 w-full sm:w-auto">
              <Button 
                variant="secondary" 
                onClick={handleReset} 
                disabled={status === ConversionStatus.PROCESSING}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConvert} 
                isLoading={status === ConversionStatus.PROCESSING}
              >
                {status === ConversionStatus.PROCESSING 
                  ? `Converting... (${conversionTime}s)` 
                  : `Convert to ${outputFormat.toUpperCase()}`}
              </Button>
            </div>
            
            {status === ConversionStatus.PROCESSING && (
              <p className="mt-4 text-xs text-slate-400 max-w-sm mx-auto">
                {outputFormat === 'epub' ? 'Building standard EPUB container...' : 'Generating binary AZW3 structure...'}
              </p>
            )}
          </div>
        )}

        {/* Result Stage */}
        {result && (
          <div className="flex flex-col h-full animate-fadeIn">
            <div className="bg-green-50 p-6 border-b border-green-100 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                 </div>
                 <div>
                   <h3 className="font-bold text-slate-900">Conversion Complete</h3>
                   <p className="text-sm text-slate-600">
                     Ready for {outputFormat === 'epub' ? 'Send-to-Kindle' : 'USB Transfer'}
                   </p>
                 </div>
               </div>
               <a 
                 href={result.blobUrl} 
                 download={result.fileName}
                 className="hidden sm:inline-flex"
               >
                 <Button>Download {outputFormat.toUpperCase()}</Button>
               </a>
            </div>

            <div className="p-8 bg-slate-50 border-b border-slate-200">
               <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Content Preview
                  </h4>
                  <span className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded">
                    Text Mode
                  </span>
               </div>
               {/* Simulation Container */}
               <div className="bg-white border-4 border-slate-800 rounded-lg p-8 h-96 overflow-y-auto shadow-inner mx-auto max-w-md">
                   <div 
                      className="prose prose-slate max-w-none text-justify"
                      style={{ 
                        fontFamily: "'Merriweather', serif", 
                        fontSize: '18px',
                        lineHeight: '1.6',
                        color: '#111' 
                      }}
                      dangerouslySetInnerHTML={{ __html: result.content }} 
                   />
               </div>
            </div>

            <div className="p-6 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
              <Button variant="secondary" onClick={handleReset} className="w-full sm:w-auto">
                Convert Another
              </Button>
              <a 
                 href={result.blobUrl} 
                 download={result.fileName}
                 className="w-full sm:w-auto sm:hidden"
               >
                 <Button className="w-full">Download {outputFormat.toUpperCase()}</Button>
               </a>
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl text-center">
        <FeatureItem 
           icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
           title="Offline Secure"
           description="Everything is processed in your browser. No files are uploaded to any server."
        />
        <FeatureItem 
           icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
           title="EPUB & AZW3"
           description="Choose EPUB for modern wireless sending or AZW3 for direct USB transfer."
        />
        <FeatureItem 
           icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
           title="Smart Extraction"
           description="Intelligently detects paragraphs and formatting from PDF documents."
        />
      </div>
    </div>
  );
};

const FeatureItem: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
  <div className="flex flex-col items-center p-4">
    <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-indigo-600 mb-4 border border-indigo-50">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-slate-900 mb-2 font-serif">{title}</h3>
    <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
  </div>
);

export default App;
