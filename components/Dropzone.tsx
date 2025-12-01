import React, { useCallback, useState } from 'react';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const allowedTypes = [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'text/html' // .html, .htm
  ];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateAndSelect = (file: File) => {
    if (allowedTypes.includes(file.type) || file.name.match(/\.(pdf|doc|docx|html|htm)$/i)) {
      onFileSelect(file);
    } else {
      alert("Unsupported file type. Please upload PDF, Word, or HTML files.");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative w-full border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
        flex flex-col items-center justify-center gap-4 cursor-pointer group
        ${isDragging 
          ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' 
          : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 bg-white'}
      `}
    >
      <input
        type="file"
        accept=".pdf,.doc,.docx,.html,.htm"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleInputChange}
      />
      
      <div className={`p-4 rounded-full ${isDragging ? 'bg-indigo-100' : 'bg-slate-100 group-hover:bg-indigo-50'} transition-colors`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-10 h-10 ${isDragging ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      <div>
        <p className="text-lg font-medium text-slate-700">
          Drop your file here, or <span className="text-indigo-600">click to browse</span>
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Supports PDF, Word (.docx), and HTML
        </p>
      </div>
    </div>
  );
};