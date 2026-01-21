import React, { useRef } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFileName?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFileName }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 animate-fade-in relative overflow-hidden">
        <div className="flex items-center gap-3 mb-3">
             <div className="w-8 h-8 rounded-lg bg-[#20398B]/10 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-[#20398B]" />
             </div>
             <div>
                <h3 className="text-base font-bold text-slate-800 leading-tight">Dữ liệu đầu vào</h3>
                <p className="text-xs text-slate-500">Hỗ trợ định dạng .xlsx, .xls</p>
             </div>
        </div>

        <div 
            onClick={handleClick}
            className={`cursor-pointer group relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all bg-slate-50 hover:bg-slate-100 ${
                selectedFileName ? 'border-[#20398B] bg-[#20398B]/5' : 'border-slate-300 hover:border-[#20398B]/50'
            }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleChange}
            className="hidden"
          />
          
          {selectedFileName ? (
             <div className="flex flex-col items-center animate-fade-in">
                 <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                 <p className="text-slate-800 font-medium text-sm break-all px-2">{selectedFileName}</p>
                 <p className="text-slate-500 text-xs mt-1">Click để thay đổi file khác</p>
             </div>
          ) : (
             <div className="flex flex-col items-center pointer-events-none group-hover:transform group-hover:scale-105 transition-transform duration-200">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                    <UploadCloud className="w-5 h-5 text-[#20398B]" />
                </div>
                <p className="text-slate-700 font-medium text-sm mb-0.5">
                    Upload File Excel
                </p>
                <p className="text-slate-500 text-xs">
                   Kéo thả hoặc click để duyệt file
                </p>
             </div>
          )}
        </div>
    </div>
  );
};
