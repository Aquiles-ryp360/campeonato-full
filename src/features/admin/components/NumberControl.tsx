"use client";

import { useEffect, useState } from "react";
import { inputClass } from "@/components/ui";

export function NumberControl({
  value,
  onChange,
  min,
  max,
  step = 1,
  integer = true,
  showSlider = true,
  ariaLabel
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  showSlider?: boolean;
  ariaLabel?: string;
}) {
  const [textValue, setTextValue] = useState(formatNumber(value));
  const [editing, setEditing] = useState(false);
  const hasSlider =
    showSlider &&
    min !== undefined &&
    max !== undefined &&
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    max > min;

  useEffect(() => {
    if (!editing) {
      setTextValue(formatNumber(value));
    }
  }, [editing, value]);

  function handleTextChange(rawValue: string) {
    setTextValue(rawValue);

    const parsed = parseNumber(rawValue, integer);
    if (parsed === null || !isInsideBounds(parsed, min, max)) return;

    onChange(parsed);
  }

  function commitTextValue() {
    const parsed = parseNumber(textValue, integer);
    const nextValue = parsed === null ? value : clampNumber(parsed, min, max);

    onChange(nextValue);
    setTextValue(formatNumber(nextValue));
    setEditing(false);
  }

  function handleSliderChange(rawValue: string) {
    const parsed = parseNumber(rawValue, integer);
    if (parsed === null) return;

    const nextValue = clampNumber(parsed, min, max);
    onChange(nextValue);
    setTextValue(formatNumber(nextValue));
  }

  return (
    <div className="grid gap-2">
      <input
        className={inputClass}
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min={min}
        max={max}
        step={step}
        value={textValue}
        onFocus={() => setEditing(true)}
        onChange={(event) => handleTextChange(event.target.value)}
        onBlur={commitTextValue}
        aria-label={ariaLabel}
      />
      {hasSlider ? (
        <input
          className="h-2 w-full cursor-pointer accent-brand-electric"
          type="range"
          min={min}
          max={max}
          step={step}
          value={clampNumber(value, min, max)}
          onChange={(event) => handleSliderChange(event.target.value)}
          aria-label={ariaLabel ? `${ariaLabel} selector` : undefined}
        />
      ) : null}
    </div>
  );
}

function parseNumber(value: string, integer: boolean) {
  if (value.trim() === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;

  return integer ? Math.round(parsed) : parsed;
}

function isInsideBounds(value: number, min?: number, max?: number) {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

function clampNumber(value: number, min?: number, max?: number) {
  let nextValue = value;
  if (min !== undefined) nextValue = Math.max(min, nextValue);
  if (max !== undefined) nextValue = Math.min(max, nextValue);
  return nextValue;
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? String(value) : "";
}
