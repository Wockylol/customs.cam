import React, { useState, useEffect } from 'react';
import { X, AlertCircle, DollarSign, Percent } from 'lucide-react';

interface EditPayrollSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any | null;
  onSubmit: (baseSalary: number, commissionPercentage: number) => Promise<{ error: string | null }>;
}

const EditPayrollSettingsModal: React.FC<EditPayrollSettingsModalProps> = ({ isOpen, onClose, member, onSubmit }) => {
  const [baseSalary, setBaseSalary] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      // Auto-calculate base salary based on sales if not already set
      const currentBaseSalary = member.payroll_settings?.base_salary;
      let calculatedBaseSalary = 0;
      
      if (currentBaseSalary === undefined || currentBaseSalary === null || currentBaseSalary === 0) {
        // Auto-calculate based on sales threshold for chatters
        if (member.role === 'chatter') {
          calculatedBaseSalary = member.total_valid_sales >= 10000 ? 450 : 250;
        }
      } else {
        calculatedBaseSalary = currentBaseSalary;
      }
      
      setBaseSalary(String(calculatedBaseSalary));
      setCommissionPercentage(String(member.payroll_settings?.commission_percentage || 2.5));
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (Number(baseSalary) < 0) {
      setError('Base salary cannot be negative');
      return;
    }

    if (Number(commissionPercentage) < 0 || Number(commissionPercentage) > 100) {
      setError('Commission percentage must be between 0 and 100');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const { error } = await onSubmit(Number(baseSalary), Number(commissionPercentage));
    
    if (error) {
      setError(error);
    } else {
      onClose();
    }
    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={handleClose} />

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Payroll Settings
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {member.full_name}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="baseSalary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Monthly Base Salary ($)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  id="baseSalary"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  disabled={loading}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Fixed monthly salary amount
                {member.role === 'chatter' && (
                  <span className="block mt-1 text-blue-600 dark:text-blue-400">
                    Auto: ${member.total_valid_sales >= 10000 ? '450' : '250'} (based on {member.total_valid_sales >= 10000 ? '≥' : '<'} $10k sales)
                  </span>
                )}
              </p>
            </div>

            <div>
              <label htmlFor="commissionPercentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Commission Percentage (%)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Percent className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  id="commissionPercentage"
                  value={commissionPercentage}
                  onChange={(e) => setCommissionPercentage(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max="100"
                  disabled={loading}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Percentage of total valid sales (0-100%). Default: 2.5%
              </p>
            </div>

            {/* Preview Calculation */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                Current Month Preview
              </div>
              <div className="space-y-1 text-sm text-blue-800 dark:text-blue-400">
                <div className="flex justify-between">
                  <span>Base Salary:</span>
                  <span className="font-medium">${Number(baseSalary || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valid Sales:</span>
                  <span className="font-medium">${member.total_valid_sales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Commission ({commissionPercentage || 0}%):</span>
                  <span className="font-medium">
                    ${(member.total_valid_sales * (Number(commissionPercentage || 0) / 100)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-300 dark:border-blue-700 font-bold">
                  <span>Estimated Total:</span>
                  <span>
                    ${(
                      Number(baseSalary || 0) + 
                      (member.total_valid_sales * (Number(commissionPercentage || 0) / 100)) +
                      member.bonuses.reduce((sum: number, b: any) => sum + Number(b.amount), 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditPayrollSettingsModal;

