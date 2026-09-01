import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

// Preset colors for quick selection
const PRESET_COLORS = [
  "#8B0000", // Dark red (Talent Red)
  "#1E5A99", // Blue (current primary)
  "#10B981", // Green
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#333333", // Dark gray
  "#6B7280", // Gray
];

export function ColorPicker({ label, value, onChange, disabled }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Validate hex color format
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-3">
        {/* Native color picker */}
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={handleColorPickerChange}
            disabled={disabled}
            className={cn(
              "w-10 h-10 rounded-md border border-input cursor-pointer",
              "appearance-none bg-transparent",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            style={{ padding: 0 }}
          />
        </div>

        {/* Hex input */}
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
          maxLength={7}
          disabled={disabled}
          className="w-28 font-mono text-sm uppercase"
        />

        {/* Preview swatch */}
        <div
          className="w-10 h-10 rounded-md border border-input shadow-sm"
          style={{ backgroundColor: value }}
        />
      </div>

      {/* Preset colors */}
      <div className="flex gap-1.5 mt-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => {
              setInputValue(color);
              onChange(color);
            }}
            disabled={disabled}
            className={cn(
              "w-6 h-6 rounded-md border-2 transition-all",
              value.toLowerCase() === color.toLowerCase()
                ? "border-primary ring-2 ring-primary/30"
                : "border-transparent hover:border-muted-foreground/30",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}
