
import React from 'react';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1F2A44]/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[14px] w-full max-w-sm overflow-hidden shadow-2xl p-8 text-center border border-[#E5EAF0]">
        <div className="w-16 h-16 bg-[#FFF7ED] text-[#FF9800] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#FFEDD5]">
          <i className="fas fa-exclamation-triangle text-2xl"></i>
        </div>
        <h3 className="text-xl font-bold text-[#1F2A44] mb-2">{title}</h3>
        <p className="text-[#1F2A44] opacity-60 text-sm mb-8 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 bg-[#E5EAF0] hover:bg-[#d1d9e2] text-[#1F2A44] rounded-[10px] font-bold transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 bg-[#1F2A44] hover:bg-[#2a3a5e] text-white rounded-[10px] font-bold transition-all shadow-md"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
