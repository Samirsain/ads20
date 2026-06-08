"use client";

import React, { useMemo } from "react";

interface DataPoint {
  label: string;
  clicks: number;
  revenue: number;
}

interface AnalyticsChartProps {
  data: DataPoint[];
  type: "clicks" | "revenue";
}

export default function AnalyticsChart({ data, type }: AnalyticsChartProps) {
  // Grid Dimensions
  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Max value to scale chart
  const maxValue = useMemo(() => {
    const values = data.map((d) => (type === "clicks" ? d.clicks : d.revenue));
    const max = Math.max(...values, 10); // avoid division by zero
    return Math.ceil(max * 1.15); // Add 15% headroom
  }, [data, type]);

  // Map values to coordinates
  const points = useMemo(() => {
    if (data.length === 0) return [];
    return data.map((d, index) => {
      const val = type === "clicks" ? d.clicks : d.revenue;
      const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (val / maxValue) * chartHeight;
      return { x, y, value: val, label: d.label };
    });
  }, [data, type, maxValue, chartWidth, chartHeight, paddingLeft, paddingTop]);

  // Create path commands
  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      
      // Add slight bezier curvature if possible
      const prev = points[i - 1];
      const cpX1 = prev.x + (p.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (p.x - prev.x) / 2;
      const cpY2 = p.y;
      
      return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
    }, "");
  }, [points]);

  // Area Path (for gradient fill under line)
  const areaD = useMemo(() => {
    if (points.length === 0) return "";
    const first = points[0];
    const last = points[points.length - 1];
    const bottomY = paddingTop + chartHeight;
    return `${pathD} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [points, pathD, paddingTop, chartHeight]);

  return (
    <div className="w-full h-full min-h-[200px] flex flex-col justify-between">
      
      {/* SVG Container */}
      <div className="relative w-full flex-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Gradients */}
          <defs>
            <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
            
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="lineColor" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={type === "clicks" ? "#2563eb" : "#059669"} />
              <stop offset="100%" stopColor={type === "clicks" ? "#3b82f6" : "#10b981"} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + chartHeight * ratio;
            const labelValue = Math.round(maxValue * (1 - ratio));
            return (
              <g key={idx} className="opacity-70">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="9"
                  textAnchor="end"
                  className="font-mono font-normal"
                >
                  {type === "revenue" ? `₹${labelValue}` : labelValue}
                </text>
              </g>
            );
          })}

          {/* Area under the line */}
          {areaD && (
            <path
              d={areaD}
              fill={type === "clicks" ? "url(#clicksGradient)" : "url(#revenueGradient)"}
            />
          )}

          {/* Main line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="url(#lineColor)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="transition-all duration-500 ease-in-out"
            />
          )}

          {/* Data nodes */}
          {points.map((p, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill={type === "clicks" ? "#2563eb" : "#059669"}
                stroke="#ffffff"
                strokeWidth="1.5"
                className="transition-all hover:scale-150 duration-200 shadow-sm"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r="9"
                fill={type === "clicks" ? "#2563eb" : "#059669"}
                fillOpacity="0"
                className="hover:fill-opacity-10 transition-all duration-200"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* X Axis Labels */}
      <div className="flex justify-between pl-[40px] pr-[15px] pt-2 border-t border-zinc-100">
        {data.map((d, index) => (
          <span key={index} className="text-[9px] font-mono font-normal text-zinc-400">
            {d.label}
          </span>
        ))}
      </div>

    </div>
  );
}
