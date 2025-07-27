import React, { useEffect } from "react";
import { CheckCircle, X, AlertCircle } from "lucide-react";

export interface SuccessMessageProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  autoHide?: boolean;
  duration?: number;
  type?: "success" | "error";
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({
  message,
  isVisible,
  onClose,
  autoHide = true,
  duration = 5000,
  type,
}) => {
  useEffect(() => {
    if (isVisible && autoHide) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHide, duration, onClose]);

  if (!isVisible) return null;

  const isError = type === "error";
  const bgColor = isError ? "bg-red-50" : "bg-green-50";
  const borderColor = isError ? "border-red-200" : "border-green-200";
  const textColor = isError ? "text-red-800" : "text-green-800";
  const iconColor = isError ? "text-red-600" : "text-green-600";
  const hoverColor = isError ? "hover:bg-red-100" : "hover:bg-green-100";
  const Icon = isError ? AlertCircle : CheckCircle;

  return (
    <div
      className={`${bgColor} border ${borderColor} rounded-lg shadow-lg p-4 w-full mb-4 flex items-start gap-3`}
    >
      <Icon className={`h-5 w-5 ${iconColor} mt-0.5 flex-shrink-0`} />
      <div className="flex-1">
        <p className={`${textColor} font-medium text-sm`}>{message}</p>
      </div>
      <button
        onClick={onClose}
        className={`p-1 ${hoverColor} rounded-lg transition-colors flex-shrink-0 -mr-2 -mt-2`}
      >
        <X className={`h-4 w-4 ${iconColor}`} />
      </button>
    </div>
  );
};
