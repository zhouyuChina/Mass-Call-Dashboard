import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { formatPhoneNumber, getSeatStatusConfig, SeatStatusType } from './seatStatusUtils';

export type { SeatStatusType } from './seatStatusUtils';

export interface SeatStats {
  answered: number;
  hungUp: number;
  avgDuration: number;
  maxDuration: number;
  maxCallNumber: string;
  onlineTime: number;
}

export interface SeatStatusCardProps {
  seatNumber: number;
  displayLabel: string;
  agentName: string;
  status: SeatStatusType;
  stats: SeatStats;
  isSelected: boolean;
  onClick: (seatNumber: number) => void;
}

export function SeatStatusCard({
  seatNumber,
  displayLabel,
  agentName,
  status,
  stats,
  isSelected,
  onClick
}: SeatStatusCardProps) {
  const { bgColor, statusText } = getSeatStatusConfig(status);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`${bgColor} text-white rounded-lg p-2 text-center cursor-pointer hover:opacity-80 transition-all w-full h-16 flex flex-col items-center justify-center ${
            isSelected ? 'ring-4 ring-yellow-400 ring-offset-2' : ''
          }`}
          onClick={() => onClick(seatNumber)}
        >
          <div className="font-semibold text-sm">{displayLabel}</div>
          <div className="text-xs mt-1 opacity-90">{agentName}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent className="p-3">
        <div className="text-xs space-y-1">
          <div className="font-semibold text-sm mb-2 border-b pb-1">
            座席 {seatNumber.toString().padStart(2, '0')} - {statusText}
          </div>
          <div>
            接聽：<span className="font-medium">{stats.answered}</span> 通
          </div>
          <div>
            掛掉：<span className="font-medium">{stats.hungUp}</span> 通
          </div>
          <div>
            平均話時長：
            <span className="font-medium">
              {Math.floor(stats.avgDuration / 60)}分{stats.avgDuration % 60}秒
            </span>
          </div>
          <div>
            最長通話：<span className="font-medium">{Math.floor(stats.maxDuration / 60)}</span> 分鐘
          </div>
          <div>
            最長通話號碼：<span className="font-medium">{formatPhoneNumber(stats.maxCallNumber)}</span>
          </div>
          <div>
            在線時間：
            <span className="font-medium">
              {Math.floor(stats.onlineTime / 60)}小時{stats.onlineTime % 60}分
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

