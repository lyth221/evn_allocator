import React from 'react';
import { Settings, Users, Percent, Play } from 'lucide-react';
import type { ProcessingParams } from '../types';

interface ConfigFormProps {
  params: ProcessingParams;
  onChange: (key: keyof ProcessingParams, value: number) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export const ConfigForm: React.FC<ConfigFormProps> = ({ params, onChange, onSubmit, disabled }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
        <Settings className="text-[#20398B] w-5 h-5" />
        <h2 className="text-lg font-bold text-slate-800">Cấu hình tham số</h2>
      </div>
      
      <div className="grid gap-5">
        <div className="group">
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" /> Số nhóm thi công
          </label>
          <input
            type="number"
            min="1"
            value={params.numberOfTeams}
            onChange={(e) => onChange('numberOfTeams', parseInt(e.target.value) || 1)}
            placeholder="e.g. 5"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#20398B]/20 focus:border-[#20398B] transition-all font-mono text-lg"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
             <Percent className="w-4 h-4 text-slate-400" /> Sai số cho phép (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={params.tolerancePercent}
            onChange={(e) => onChange('tolerancePercent', parseFloat(e.target.value) || 0)}
            placeholder="e.g. 10"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#20398B]/20 focus:border-[#20398B] transition-all font-mono text-lg"
          />
          <p className="text-xs text-slate-500 mt-2">
            Mục tiêu mỗi nhóm = Tổng / Số nhóm ± {params.tolerancePercent}%
          </p>
        </div>

        <button 
          onClick={onSubmit} 
          disabled={disabled}
          className="w-full mt-4 py-3.5 rounded-lg text-white font-bold text-base bg-[#20398B] hover:bg-[#1a2e72] shadow-lg shadow-indigo-900/10 active:transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? 'Đang xử lý...' : (
            <>
              <Play className="w-4 h-4 fill-current" /> Phân Nhóm Ngay
            </>
          )}
        </button>
      </div>
    </div>
  );
};
