"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { cn } from "./utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

// 中文本地化配置
const chineseLocale = {
  localize: {
    month: (month: number) => {
      const months = [
        '一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月'
      ];
      return months[month];
    },
    day: (day: number) => {
      const days = ['日', '一', '二', '三', '四', '五', '六'];
      return days[day];
    }
  },
  formatLong: {
    date: () => 'yyyy年MM月dd日',
    time: () => 'HH:mm:ss',
    dateTime: () => 'yyyy年MM月dd日 HH:mm:ss'
  }
};

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

// 格式化日期為中文顯示
const formatDateToChineseDisplay = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = weekdays[date.getDay()];
  
  return `${year}年${month}月${day}日 (週${weekday})`;
};

// 格式化日期為 ISO 字符串 (YYYY-MM-DD)
const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DatePicker = React.memo(function DatePicker({
  value,
  onChange,
  placeholder = "選擇日期",
  disabled,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (value) {
      try {
        return new Date(value);
      } catch (error) {
        console.error('Invalid initial date value:', value);
        return undefined;
      }
    }
    return undefined;
  });

  // 防抖更新外部值
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (value) {
        try {
          const newDate = new Date(value);
          // 只有當日期真的不同時才更新
          if (!date || newDate.getTime() !== date.getTime()) {
            setDate(newDate);
          }
        } catch (error) {
          console.error('Invalid date value:', value);
          if (date) {
            setDate(undefined);
          }
        }
      } else {
        if (date) {
          setDate(undefined);
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [value, date]);

  const handleSelect = React.useCallback((selectedDate: Date | undefined) => {
    console.log('🗓️ handleSelect 被觸發，選擇的日期：', selectedDate);
    
    // 同步更新日期狀態
    setDate(selectedDate);
    
    // 立即關閉 Popover
    setOpen(false);
    
    // 通知父組件日期變化
    if (selectedDate) {
      const isoString = formatDateToISO(selectedDate);
      onChange?.(isoString);
      console.log('🗓️ 日期已選擇並傳遞：', isoString);
    } else {
      onChange?.("");
      console.log('🗓️ 日期已清空');
    }
  }, [onChange]);

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    console.log('🗓️ Popover 開關狀態變化：', newOpen);
    setOpen(newOpen);
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            formatDateToChineseDisplay(date)
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align="start"
        side="bottom"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          disabled={disabled}
          labels={{
            labelMonthDropdown: () => '選擇月份',
            labelYearDropdown: () => '選擇年份',
            labelNext: () => '下個月',
            labelPrevious: () => '上個月',
          }}
          formatters={{
            formatCaption: (date, options) => {
              const year = date.getFullYear();
              const month = date.getMonth() + 1;
              return `${year}年${month}月`;
            },
            formatWeekdayName: (date, options) => {
              const days = ['日', '一', '二', '三', '四', '五', '六'];
              return days[date.getDay()];
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
});