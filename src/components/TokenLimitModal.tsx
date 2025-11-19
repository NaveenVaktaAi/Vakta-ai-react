import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Crown } from 'lucide-react';

interface TokenLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    message: string;
    tokensRemaining?: number;
    service?: string;
    upgradeRequired?: boolean;
    tokensNeeded?: number;
    tokensUsed?: number;
    tokenLimit?: number;
    percentageUsed?: number;
  };
}

const TokenLimitModal: React.FC<TokenLimitModalProps> = ({ isOpen, onClose, data }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose(); // Close the modal first
    navigate('/pricing'); // Navigate to pricing page
  };

  // ✅ Get service name for display
  const serviceName = data.service === 'aiTutor' ? 'AI Tutor' : 'DocSathi';
  const serviceIcon = data.service === 'aiTutor' ? '🎓' : '📚';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Upgrade to Premium</h2>
              <p className="text-xs text-purple-100">Unlock unlimited access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Compact */}
        <div className="p-5">
          {/* Service Badge */}
          <div className="mb-4 flex items-center justify-center">
            <div className="px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full border-2 border-purple-300">
              <span className="text-2xl mr-2">{serviceIcon}</span>
              <span className="text-sm font-bold text-purple-700">
                {serviceName} Free Trial
              </span>
            </div>
          </div>

          {/* Main Message - Compact */}
          <div className="mb-4 text-center">
            <p className="text-base font-semibold text-gray-900 mb-2">
              Your {serviceName} free trial is almost over!
            </p>
            <p className="text-sm text-gray-600">
              Upgrade to Premium for unlimited access to all features.
            </p>
          </div>

          {/* Premium Benefits - Compact */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 mb-4 border border-purple-100">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-purple-600">✨</span>
                <span className="text-gray-700">Unlimited credits</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600">✨</span>
                <span className="text-gray-700">All premium features</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600">✨</span>
                <span className="text-gray-700">Priority support</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl text-sm"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenLimitModal;

