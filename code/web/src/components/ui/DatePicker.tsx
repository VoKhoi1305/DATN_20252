import { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

/** Parse 'YYYY-MM-DD' → { year, month, day } */
function parseValue(val: string) {
  if (!val) return null;
  const [y, m, d] = val.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m - 1, day: d };
}

/** Format to YYYY-MM-DD */
function toValue(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Format for display: DD/MM/YYYY */
function toDisplay(val: string) {
  const p = parseValue(val);
  if (!p) return '';
  return `${String(p.day).padStart(2, '0')}/${String(p.month + 1).padStart(2, '0')}/${p.year}`;
}

// Generate year range
function getYearRange(minYear: number, maxYear: number) {
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }
  return years;
}

interface DatePickerProps {
  value: string;             // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
}

function DatePicker({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  className = '',
  error = false,
  disabled = false,
  minYear = 1940,
  maxYear = 2040,
}: DatePickerProps) {
  const today = new Date();
  const parsed = parseValue(value);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());
  const [selectMode, setSelectMode] = useState<'day' | 'month' | 'year'>('day');

  const containerRef = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position dropdown
  const [dropUp, setDropUp] = useState(false);

  // When opening, sync view to current value
  const handleOpen = useCallback(() => {
    if (disabled) return;
    const p = parseValue(value);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
    }
    setSelectMode('day');

    // Calculate if dropdown should open upward
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 360);
    }

    setOpen(true);
  }, [value, disabled]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Scroll to selected year when year mode opens
  useEffect(() => {
    if (selectMode === 'year' && yearListRef.current) {
      const activeEl = yearListRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'center' });
      }
    }
  }, [selectMode]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const selectDay = (day: number) => {
    onChange(toValue(viewYear, viewMonth, day));
    setOpen(false);
  };

  const selectMonth = (month: number) => {
    setViewMonth(month);
    setSelectMode('day');
  };

  const selectYear = (year: number) => {
    setViewYear(year);
    setSelectMode('month');
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const clearValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  };

  const goToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelectMode('day');
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);

  const cells: Array<{ day: number; current: boolean }> = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, current: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true });
  }

  // Next month leading days
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, current: false });
  }

  const isToday = (day: number) =>
    viewYear === today.getFullYear() &&
    viewMonth === today.getMonth() &&
    day === today.getDate();

  const isSelected = (day: number) =>
    parsed !== null &&
    viewYear === parsed.year &&
    viewMonth === parsed.month &&
    day === parsed.day;

  const years = getYearRange(minYear, maxYear);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => open ? setOpen(false) : handleOpen()}
        disabled={disabled}
        className={`w-full flex items-center gap-2 px-3 py-2 border rounded-md text-sm text-left transition-colors ${
          error
            ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
            : open
              ? 'border-red-700 ring-2 ring-red-700/20'
              : 'border-zinc-300 hover:border-zinc-400'
        } ${disabled ? 'bg-zinc-100 cursor-not-allowed text-zinc-400' : 'bg-white text-zinc-900'}`}
      >
        <Calendar size={14} className="text-zinc-400 shrink-0" />
        <span className={`flex-1 truncate ${value ? '' : 'text-zinc-400'}`}>
          {value ? toDisplay(value) : placeholder}
        </span>
        {value && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            onClick={clearValue}
            className="text-zinc-400 hover:text-zinc-600 shrink-0"
          >
            <X size={14} />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg w-[280px] ${
            dropUp ? 'bottom-full mb-1' : 'top-full'
          }`}
          style={{ left: 0 }}
        >
          {/* ── DAY VIEW ── */}
          {selectMode === 'day' && (
            <div className="p-3">
              {/* Nav header */}
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 rounded hover:bg-zinc-100 text-zinc-500 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectMode('month')}
                  className="px-2 py-1 rounded text-sm font-medium text-zinc-800 hover:bg-zinc-100 transition-colors"
                >
                  {MONTHS[viewMonth]} {viewYear}
                </button>

                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 rounded hover:bg-zinc-100 text-zinc-500 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((wd) => (
                  <div key={wd} className="text-center text-[10px] font-medium text-zinc-400 py-1">
                    {wd}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7">
                {cells.map((cell, idx) => {
                  const selected = cell.current && isSelected(cell.day);
                  const todayMark = cell.current && isToday(cell.day);

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!cell.current}
                      onClick={() => cell.current && selectDay(cell.day)}
                      className={`h-8 w-full text-[12px] rounded-md transition-colors ${
                        !cell.current
                          ? 'text-zinc-300 cursor-default'
                          : selected
                            ? 'bg-red-700 text-white font-semibold'
                            : todayMark
                              ? 'bg-red-50 text-red-700 font-semibold hover:bg-red-100'
                              : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={goToday}
                  className="text-[11px] text-red-700 hover:text-red-800 font-medium"
                >
                  Hôm nay
                </button>
                {value && (
                  <button
                    type="button"
                    onClick={clearValue}
                    className="text-[11px] text-zinc-400 hover:text-zinc-600"
                  >
                    Xoá
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── MONTH VIEW ── */}
          {selectMode === 'month' && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setViewYear(viewYear - 1)}
                  className="p-1 rounded hover:bg-zinc-100 text-zinc-500 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectMode('year')}
                  className="px-2 py-1 rounded text-sm font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors"
                >
                  {viewYear}
                </button>

                <button
                  type="button"
                  onClick={() => setViewYear(viewYear + 1)}
                  className="p-1 rounded hover:bg-zinc-100 text-zinc-500 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {MONTHS.map((name, idx) => {
                  const isCurrent = viewMonth === idx;
                  const isNow = viewYear === today.getFullYear() && idx === today.getMonth();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectMonth(idx)}
                      className={`py-2 rounded-md text-[12px] font-medium transition-colors ${
                        isCurrent
                          ? 'bg-red-700 text-white'
                          : isNow
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setSelectMode('day')}
                  className="text-[11px] text-zinc-500 hover:text-zinc-700"
                >
                  ← Quay lại
                </button>
              </div>
            </div>
          )}

          {/* ── YEAR VIEW ── */}
          {selectMode === 'year' && (
            <div className="p-3">
              <div className="text-center text-sm font-semibold text-zinc-800 mb-2">
                Chọn năm
              </div>
              <div
                ref={yearListRef}
                className="h-[240px] overflow-y-auto grid grid-cols-4 gap-1 pr-1"
              >
                {years.map((y) => {
                  const isActive = y === viewYear;
                  const isNow = y === today.getFullYear();
                  return (
                    <button
                      key={y}
                      type="button"
                      data-active={isActive ? 'true' : undefined}
                      onClick={() => selectYear(y)}
                      className={`py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                        isActive
                          ? 'bg-red-700 text-white'
                          : isNow
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setSelectMode('month')}
                  className="text-[11px] text-zinc-500 hover:text-zinc-700"
                >
                  ← Quay lại
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DatePicker;
