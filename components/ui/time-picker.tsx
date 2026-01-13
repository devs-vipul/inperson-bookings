"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const generateTimes = (interval: number = 15): string[] => {
  const times: string[] = [];
  for (let hours = 0; hours < 24; hours++) {
    for (let minutes = 0; minutes < 60; minutes += interval) {
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const period = hours >= 12 ? "PM" : "AM";
      const time = `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
      times.push(time);
    }
  }
  return times;
};

const convertTo24Hour = (time12h: string): string => {
  const [time, period] = time12h.split(" ");
  const [hours, minutes] = time.split(":");
  let hour24 = parseInt(hours);
  if (period === "PM" && hour24 !== 12) hour24 += 12;
  if (period === "AM" && hour24 === 12) hour24 = 0;
  return `${hour24.toString().padStart(2, "0")}:${minutes}`;
};

const convertTo12Hour = (time24h: string): string => {
  const [hours, minutes] = time24h.split(":");
  const hour24 = parseInt(hours);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const period = hour24 >= 12 ? "PM" : "AM";
  return `${hour12}:${minutes} ${period}`;
};

interface TimePickerProps {
  value?: string; // 24-hour format "HH:MM"
  onChange?: (value: string) => void; // Returns 24-hour format
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const times = React.useMemo(() => generateTimes(15), []);

  const displayValue = value ? convertTo12Hour(value) : "Select time";

  const handleTimeSelect = (selectedTime: string) => {
    const time24h = convertTo24Hour(selectedTime);
    onChange?.(time24h);
    setIsOpen(false);
  };

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
      <PopoverContent className="w-auto p-0" align="start">
        <div className="max-h-[200px] overflow-auto p-1">
          {times.map((time) => (
            <button
              key={time}
              onClick={() => handleTimeSelect(time)}
              className={cn(
                "w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                value && convertTo12Hour(value) === time && "bg-accent"
              )}
            >
              {time}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
