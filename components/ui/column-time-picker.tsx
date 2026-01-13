"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface ColumnTimePickerProps {
  value?: string; // 24-hour format "HH:MM"
  onChange?: (value: string) => void; // Returns 24-hour format
  className?: string;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ["AM", "PM"] as const;

const convertTo24Hour = (
  hour12: number,
  minutes: number,
  period: "AM" | "PM",
): string => {
  let hour24 = hour12;
  if (period === "PM" && hour24 !== 12) hour24 += 12;
  if (period === "AM" && hour24 === 12) hour24 = 0;
  return `${hour24.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

const convertFrom24Hour = (time24h: string): {
  hour12: number;
  minutes: number;
  period: "AM" | "PM";
} => {
  const [hours, minutes] = time24h.split(":").map(Number);
  const hour24 = hours;
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const period = hour24 >= 12 ? "PM" : "AM";
  return { hour12, minutes, period };
};

export function ColumnTimePicker({
  value,
  onChange,
  className,
}: ColumnTimePickerProps) {
  // Local display state is always derived from the 24h value
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedHour, setSelectedHour] = React.useState<number>(7);
  const [selectedMinute, setSelectedMinute] = React.useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = React.useState<"AM" | "PM">("AM");

  // Keep local state in sync with the external 24h value
  React.useEffect(() => {
    if (value) {
      const { hour12, minutes, period } = convertFrom24Hour(value);
      setSelectedHour(hour12);
      setSelectedMinute(minutes);
      setSelectedPeriod(period);
    }
  }, [value]);

  const handleTimeChange = (hour?: number, minute?: number, period?: "AM" | "PM") => {
    const newHour = hour ?? selectedHour;
    const newMinute = minute ?? selectedMinute;
    const newPeriod = period ?? selectedPeriod;
    const time24h = convertTo24Hour(newHour, newMinute, newPeriod);
    onChange?.(time24h);
  };

  const displayValue = value
    ? (() => {
        const { hour12, minutes, period } = convertFrom24Hour(value);
        return `${hour12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`;
      })()
    : "Select time";

  const hoursRef = React.useRef<HTMLDivElement>(null);
  const minutesRef = React.useRef<HTMLDivElement>(null);
  const periodsRef = React.useRef<HTMLDivElement>(null);

  const scrollToSelected = React.useCallback(
    (containerRef: React.RefObject<HTMLDivElement>, selectedIndex: number) => {
      if (!containerRef.current || selectedIndex < 0) return;

      const item = containerRef.current.children[selectedIndex] as HTMLElement | undefined;
      if (!item) return;

      const container = containerRef.current;
      const itemTop = item.offsetTop;
      const itemHeight = item.offsetHeight;
      const containerHeight = container.clientHeight;
      const scrollTop = itemTop - containerHeight / 2 + itemHeight / 2;

      container.scrollTop = scrollTop;
    },
    [],
  );

  React.useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        scrollToSelected(hoursRef, selectedHour - 1);
        scrollToSelected(minutesRef, selectedMinute);
        scrollToSelected(periodsRef, selectedPeriod === "AM" ? 0 : 1);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedHour, selectedMinute, selectedPeriod, scrollToSelected]);

  // Handle wheel events for better scrolling
  const handleWheel = React.useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.scrollBy({
      top: e.deltaY,
      behavior: "auto",
    });
  }, []);

  // Focus the container on mouse enter to enable scrolling
  const handleMouseEnter = React.useCallback((ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.focus();
  }, []);

  const SCROLL_CONTAINER_BASE_CLASSES =
    "h-[240px] w-16 overflow-y-scroll overscroll-contain scroll-smooth " +
    "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
    "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full " +
    "[&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 focus:outline-none";

  const OPTION_BUTTON_BASE_CLASSES =
    "w-full px-4 py-2.5 text-sm transition-colors border-b last:border-b-0 flex items-center justify-center";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="flex border rounded-md overflow-hidden">
          {/* Hours Column */}
          <div
            ref={hoursRef}
            onWheel={handleWheel}
            onMouseEnter={() => handleMouseEnter(hoursRef)}
            tabIndex={0}
            className={SCROLL_CONTAINER_BASE_CLASSES}
            style={{ scrollbarWidth: "thin" }}
          >
            {HOURS_12.map((hour) => (
              <button
                key={hour}
                type="button"
                onClick={() => {
                  setSelectedHour(hour);
                  handleTimeChange(hour, undefined, undefined);
                }}
                className={cn(
                  OPTION_BUTTON_BASE_CLASSES,
                  selectedHour === hour
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-accent hover:text-accent-foreground text-foreground"
                )}
              >
                {hour.toString().padStart(2, "0")}
              </button>
            ))}
          </div>

          {/* Minutes Column */}
          <div
            ref={minutesRef}
            onWheel={handleWheel}
            onMouseEnter={() => handleMouseEnter(minutesRef)}
            tabIndex={0}
            className={cn("border-l", SCROLL_CONTAINER_BASE_CLASSES)}
            style={{ scrollbarWidth: "thin" }}
          >
            {MINUTES.map((minute) => (
              <button
                key={minute}
                type="button"
                onClick={() => {
                  setSelectedMinute(minute);
                  handleTimeChange(undefined, minute, undefined);
                }}
                className={cn(
                  OPTION_BUTTON_BASE_CLASSES,
                  selectedMinute === minute
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-accent hover:text-accent-foreground text-foreground"
                )}
              >
                {minute.toString().padStart(2, "0")}
              </button>
            ))}
          </div>

          {/* AM/PM Column */}
          <div
            ref={periodsRef}
            onWheel={handleWheel}
            onMouseEnter={() => handleMouseEnter(periodsRef)}
            tabIndex={0}
            className={cn("border-l", SCROLL_CONTAINER_BASE_CLASSES)}
            style={{ scrollbarWidth: "thin" }}
          >
            {PERIODS.map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => {
                  setSelectedPeriod(period);
                  handleTimeChange(undefined, undefined, period);
                }}
                className={cn(
                  OPTION_BUTTON_BASE_CLASSES,
                  selectedPeriod === period
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-accent hover:text-accent-foreground text-foreground"
                )}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
