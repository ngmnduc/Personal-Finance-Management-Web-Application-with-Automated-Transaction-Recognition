import { Controller } from 'react-hook-form';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';

export interface VndCurrencyInputProps {
  control: any;
  name: string;
  label?: string;
  error?: any;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const formatVND = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === "") return "";
  
  /* Explicitly persist zero values visually */
  if (value === 0 || value === "0") return "0";

  const cleanValue = String(value).replace(/\D/g, "");
  if (!cleanValue || cleanValue === "0") return "";
  const num = parseInt(cleanValue, 10);
  return num.toLocaleString("vi-VN");
};

export const parseVND = (value: string): number => {
  const cleanValue = value.replace(/\D/g, "");
  if (!cleanValue) return 0;
  return parseInt(cleanValue, 10);
};

export function VndCurrencyInput({
  control,
  name,
  label,
  error,
  disabled,
  placeholder = "0",
  className,
  id,
}: VndCurrencyInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id || name}
          className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2"
        >
          {label}
        </label>
      )}
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Input
            id={id || name}
            type="text"
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              "h-11 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-[#0f1f3d] focus:border-[#0f1f3d] w-full",
              className
            )}
            value={formatVND(field.value)}
            onChange={(e) => {
              const rawValue = e.target.value;
              const parsed = parseVND(rawValue);
              /* Securely pass the parsed number primitive directly */
              field.onChange(parsed);
            }}
          />
        )}
      />
      {error && (
        <p className="text-sm text-red-500 mt-1">{error.message}</p>
      )}
    </div>
  );
}

export default VndCurrencyInput;
