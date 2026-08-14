import React, { useState, useMemo } from 'react';
import { Icon } from './Icon';
import { NavTooltip } from './NavTooltip';
import {
  Goal,
  Project,
  Sprint,
  Epic,
  WorkflowColumn,
  BoardType,
  Priority,
} from '../types';
import {
  AnalyticsFilter,
  DateRangePreset,
  calculateSummaryMetrics,
  calculateCreatedVsCompletedOverTime,
  calculateStatusDistribution,
  calculatePriorityDistribution,
  calculateSprintPerformance,
  calculateEpicProgress,
  resolveDateRange,
  isGoalCompleted,
  getGoalCompletionTimestamp,
} from '../lib/analytics';
import { cn } from '../lib/utils';

export interface StatsDashboardProps {
  goals: Goal[];
  projects: Project[];
  sprints: Sprint[];
  epics: Epic[];
  workflowColumns: WorkflowColumn[];
  activeBoard: BoardType;
  onExit: () => void;
  onSelectGoal?: (goal: Goal) => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  goals,
  projects,
  sprints,
  epics,
  workflowColumns,
  activeBoard,
  onExit,
  onSelectGoal,
}) => {
  // Filter state
  const [boardFilter, setBoardFilter] = useState<BoardType | 'All'>(activeBoard);
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sprintFilter, setSprintFilter] = useState<string>('all');
  const [epicFilter, setEpicFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Active hover point for line chart
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Construct active filter object
  const activeFilter: AnalyticsFilter = useMemo(() => {
    return {
      datePreset,
      customStart: customStart ? new Date(customStart).getTime() : undefined,
      customEnd: customEnd ? new Date(customEnd).getTime() + 86_400_000 : undefined,
      board: boardFilter,
      projectId: projectFilter !== 'all' ? projectFilter : null,
      sprintId: sprintFilter !== 'all' ? sprintFilter : null,
      epicId: epicFilter !== 'all' ? epicFilter : null,
      priority: priorityFilter,
      status: statusFilter,
    };
  }, [
    datePreset,
    customStart,
    customEnd,
    boardFilter,
    projectFilter,
    sprintFilter,
    epicFilter,
    priorityFilter,
    statusFilter,
  ]);

  const dateRange = useMemo(() => {
    return resolveDateRange(
      activeFilter.datePreset,
      activeFilter.customStart,
      activeFilter.customEnd
    );
  }, [activeFilter]);

  // Aggregated Summary Metrics
  const summaryMetrics = useMemo(() => {
    return calculateSummaryMetrics({
      goals,
      projects,
      sprints,
      epics,
      columns: workflowColumns,
      filter: activeFilter,
    });
  }, [goals, projects, sprints, epics, workflowColumns, activeFilter]);

  // Filtered Goals for Chart calculations
  const filteredGoals = useMemo(() => {
    return goals.filter(goal => {
      if (activeFilter.board !== 'All' && goal.board !== activeFilter.board) return false;
      if (activeFilter.projectId && goal.projectId !== activeFilter.projectId) return false;
      if (activeFilter.sprintId && goal.sprintId !== activeFilter.sprintId) return false;
      if (activeFilter.epicId && goal.epicId !== activeFilter.epicId) return false;
      if (activeFilter.priority && activeFilter.priority !== 'all' && goal.priority !== activeFilter.priority) return false;
      if (activeFilter.status && activeFilter.status !== 'all' && goal.status !== activeFilter.status) return false;
      return true;
    });
  }, [goals, activeFilter]);

  // Time Series Data Points
  const timeBuckets = useMemo(() => {
    const numBuckets = activeFilter.datePreset === '7d' ? 7 : activeFilter.datePreset === '90d' ? 12 : 8;
    return calculateCreatedVsCompletedOverTime(filteredGoals, dateRange, numBuckets);
  }, [filteredGoals, dateRange, activeFilter.datePreset]);

  // Status Distribution
  const statusDist = useMemo(() => {
    return calculateStatusDistribution(filteredGoals, workflowColumns);
  }, [filteredGoals, workflowColumns]);

  // Priority Distribution
  const priorityDist = useMemo(() => {
    return calculatePriorityDistribution(filteredGoals);
  }, [filteredGoals]);

  // Sprint Performance
  const sprintPerformance = useMemo(() => {
    return calculateSprintPerformance(sprints, goals);
  }, [sprints, goals]);

  // Epic Progress
  const epicProgress = useMemo(() => {
    return calculateEpicProgress(epics, goals);
  }, [epics, goals]);

  // Recent Completed Goals
  const recentCompletedGoals = useMemo(() => {
    return filteredGoals
      .filter(isGoalCompleted)
      .sort((a, b) => {
        const tsA = getGoalCompletionTimestamp(a) ?? a.createdAt;
        const tsB = getGoalCompletionTimestamp(b) ?? b.createdAt;
        return tsB - tsA;
      })
      .slice(0, 5);
  }, [filteredGoals]);

  // Chart max value calculation
  const maxTimeBucketValue = useMemo(() => {
    let max = 1;
    timeBuckets.forEach(b => {
      if (b.createdCount > max) max = b.createdCount;
      if (b.completedCount > max) max = b.completedCount;
    });
    return Math.ceil(max * 1.25);
  }, [timeBuckets]);

  // SVG dimensions for Time Series Chart
  const svgWidth = 600;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const graphWidth = svgWidth - paddingX * 2;
  const graphHeight = svgHeight - paddingY * 2;

  return (
    <div className="flex-1 flex flex-col bg-background text-text overflow-y-auto min-h-screen">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20 shadow-xs">
              <Icon name="insights" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-text">Statistics & Analytics</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  Live Engine
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Actionable velocity, completion streaks, and multidimensional productivity insights.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* Board Context Selector */}
            <div className="flex items-center p-1 bg-column rounded-xl border border-border text-xs font-semibold">
              {(['Work', 'Life', 'All'] as const).map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBoardFilter(b)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    boardFilter === b
                      ? "bg-card text-accent shadow-xs font-bold ring-1 ring-border/60"
                      : "text-text-muted hover:text-text"
                  )}
                >
                  {b === 'All' ? 'All Boards' : `${b} Board`}
                </button>
              ))}
            </div>

            {/* Exit to Board Button */}
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-card border border-border hover:bg-column text-xs font-bold text-text transition-all cursor-pointer shadow-xs"
            >
              <Icon name="view_kanban" size={16} />
              <span>Back to Board</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-text-muted font-bold text-[11px] uppercase tracking-wider mr-1 shrink-0">
              Period:
            </span>
            {(
              [
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
                { id: '90d', label: '90 Days' },
                { id: 'this_year', label: 'This Year' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDatePreset(preset.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shrink-0",
                  datePreset === preset.id
                    ? "bg-accent text-white font-bold shadow-xs"
                    : "bg-column/70 text-text-muted hover:text-text hover:bg-column"
                )}
              >
                {preset.label}
              </button>
            ))}

            {datePreset === 'custom' && (
              <div className="flex items-center gap-1.5 ml-2 bg-column px-2 py-1 rounded-lg border border-border">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="bg-transparent text-[11px] text-text outline-none cursor-pointer"
                />
                <span className="text-text-muted">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="bg-transparent text-[11px] text-text outline-none cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Facet Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Project Filter */}
            {projects.length > 0 && (
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="bg-column border border-border text-text rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer font-medium"
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value as Priority | 'all')}
              className="bg-column border border-border text-text rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {/* Sprint Filter */}
            {sprints.length > 0 && (
              <select
                value={sprintFilter}
                onChange={e => setSprintFilter(e.target.value)}
                className="bg-column border border-border text-text rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer font-medium"
              >
                <option value="all">All Sprints</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            {/* Epic Filter */}
            {epics.length > 0 && (
              <select
                value={epicFilter}
                onChange={e => setEpicFilter(e.target.value)}
                className="bg-column border border-border text-text rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer font-medium"
              >
                <option value="all">All Epics</option>
                {epics.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8">
        {/* 1. Key Summary Metrics Grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Card 1: Active Work Items */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between shadow-xs relative group/metric">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">Active Items</span>
              <NavTooltip label="Items in To Do or In Progress" side="top">
                <span className="text-text-muted hover:text-text cursor-pointer">
                  <Icon name="help" size={14} />
                </span>
              </NavTooltip>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-text">{summaryMetrics.activeItems}</div>
              <div className="text-[11px] text-text-muted mt-0.5">
                {summaryMetrics.totalEligible} total work items
              </div>
            </div>
          </div>

          {/* Card 2: Completed Items */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between shadow-xs relative group/metric">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">Completed</span>
              <NavTooltip label="Total items delivered in this scope" side="top">
                <span className="text-text-muted hover:text-text cursor-pointer">
                  <Icon name="check_circle" size={14} className="text-emerald-500" />
                </span>
              </NavTooltip>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-500">
                {summaryMetrics.completedItems}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                {summaryMetrics.completionRate}% completion rate
              </div>
            </div>
          </div>

          {/* Card 3: Completion Streak */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between shadow-xs relative group/metric">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">Daily Streak</span>
              <NavTooltip label="Consecutive days with at least 1 completed goal" side="top">
                <span className="text-amber-500">
                  <Icon name="local_fire_department" size={15} filled />
                </span>
              </NavTooltip>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-500 flex items-baseline gap-1">
                <span>{summaryMetrics.currentStreakDays}</span>
                <span className="text-xs font-bold text-text-muted">days</span>
              </div>
              <div className="text-[11px] text-text-muted mt-0.5">
                Best: {summaryMetrics.longestStreakDays} days streak
              </div>
            </div>
          </div>

          {/* Card 4: Velocity (7d & 30d) */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between shadow-xs relative group/metric">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">Recent Velocity</span>
              <NavTooltip label="Items completed in the last 7 days vs 30 days" side="top">
                <span className="text-indigo-500">
                  <Icon name="bolt" size={14} />
                </span>
              </NavTooltip>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-indigo-500">
                {summaryMetrics.completedThisWeek}
              </div>
              <div className="text-[11px] text-text-muted mt-0.5">
                {summaryMetrics.completedThisMonth} in last 30 days
              </div>
            </div>
          </div>

          {/* Card 5: Overdue Items */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between shadow-xs relative group/metric">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">Overdue Items</span>
              <NavTooltip label="Active items past due date" side="top">
                <span className={cn(summaryMetrics.overdueCount > 0 ? "text-rose-500" : "text-text-muted")}>
                  <Icon name="warning" size={14} />
                </span>
              </NavTooltip>
            </div>
            <div className="mt-3">
              <div className={cn("text-2xl font-black", summaryMetrics.overdueCount > 0 ? "text-rose-500" : "text-text")}>
                {summaryMetrics.overdueCount}
              </div>
              <div className="text-[11px] text-rose-500/90 font-semibold mt-0.5">
                {summaryMetrics.overdueHighPriority > 0 ? `${summaryMetrics.overdueHighPriority} high priority` : 'None high priority'}
              </div>
            </div>
          </div>

          {/* Card 6: Average Completion Time */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between shadow-xs relative group/metric">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">Avg Completion</span>
              <NavTooltip label="Mean duration from creation/start date to completion" side="top">
                <span className="text-text-muted hover:text-text cursor-pointer">
                  <Icon name="schedule" size={14} />
                </span>
              </NavTooltip>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-text">
                {summaryMetrics.averageCompletionTimeFormatted}
              </div>
              <div className="text-[11px] text-text-muted mt-0.5">
                Turnaround speed
              </div>
            </div>
          </div>
        </section>

        {/* 2. Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Created vs. Completed Over Time (2 cols on large screen) */}
          <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-text flex items-center gap-2">
                  <Icon name="show_chart" size={18} className="text-accent" />
                  <span>Created vs. Completed Over Time</span>
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Historical throughput and completion velocity across the selected date range.
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-text-muted">Created</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-text-muted">Completed</span>
                </div>
              </div>
            </div>

            {/* Responsive SVG Chart */}
            <div className="relative w-full h-[220px] select-none">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full overflow-visible"
              >
                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = paddingY + graphHeight * (1 - ratio);
                  const val = Math.round(maxTimeBucketValue * ratio);
                  return (
                    <g key={idx}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={svgWidth - paddingX}
                        y2={y}
                        stroke="currentColor"
                        className="text-border/60"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingX - 8}
                        y={y + 3}
                        textAnchor="end"
                        className="text-[10px] fill-text-muted font-mono"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Plot Paths: Created line */}
                {timeBuckets.length > 1 && (
                  <path
                    d={timeBuckets
                      .map((b, i) => {
                        const x = paddingX + (i / (timeBuckets.length - 1)) * graphWidth;
                        const y =
                          paddingY + graphHeight * (1 - b.createdCount / maxTimeBucketValue);
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Plot Paths: Completed line */}
                {timeBuckets.length > 1 && (
                  <path
                    d={timeBuckets
                      .map((b, i) => {
                        const x = paddingX + (i / (timeBuckets.length - 1)) * graphWidth;
                        const y =
                          paddingY + graphHeight * (1 - b.completedCount / maxTimeBucketValue);
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Interactive Data Points */}
                {timeBuckets.map((b, i) => {
                  const x = paddingX + (i / (timeBuckets.length - 1)) * graphWidth;
                  const yCreated =
                    paddingY + graphHeight * (1 - b.createdCount / maxTimeBucketValue);
                  const yCompleted =
                    paddingY + graphHeight * (1 - b.completedCount / maxTimeBucketValue);

                  return (
                    <g
                      key={i}
                      onMouseEnter={() => setHoveredPointIndex(i)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                      className="cursor-pointer"
                    >
                      {/* Vertical Hover Guide Line */}
                      {hoveredPointIndex === i && (
                        <line
                          x1={x}
                          y1={paddingY}
                          x2={x}
                          y2={svgHeight - paddingY}
                          stroke="#94a3b8"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                      )}

                      {/* Created dot */}
                      <circle
                        cx={x}
                        cy={yCreated}
                        r={hoveredPointIndex === i ? 5 : 3.5}
                        fill="#6366f1"
                        className="transition-all"
                      />

                      {/* Completed dot */}
                      <circle
                        cx={x}
                        cy={yCompleted}
                        r={hoveredPointIndex === i ? 5 : 3.5}
                        fill="#10b981"
                        className="transition-all"
                      />

                      {/* X Axis Label */}
                      <text
                        x={x}
                        y={svgHeight - 10}
                        textAnchor="middle"
                        className={cn(
                          "text-[10px] font-medium fill-text-muted transition-all",
                          hoveredPointIndex === i && "fill-text font-bold"
                        )}
                      >
                        {b.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Hover Tooltip Overlay */}
              {hoveredPointIndex !== null && timeBuckets[hoveredPointIndex] && (
                <div
                  className="absolute z-30 bg-slate-900/95 text-white text-xs rounded-xl p-2.5 shadow-2xl border border-slate-700 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3"
                  style={{
                    left: `${
                      ((paddingX +
                        (hoveredPointIndex / (timeBuckets.length - 1)) * graphWidth) /
                        svgWidth) *
                      100
                    }%`,
                    top: '30%',
                  }}
                >
                  <div className="font-bold text-slate-300 mb-1">
                    {timeBuckets[hoveredPointIndex].label}
                  </div>
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>Created: {timeBuckets[hoveredPointIndex].createdCount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Completed: {timeBuckets[hoveredPointIndex].completedCount}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Status Distribution (Donut & Breakdown) */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-text flex items-center gap-2 mb-1">
                <Icon name="donut_large" size={18} className="text-accent" />
                <span>Current Status Distribution</span>
              </h2>
              <p className="text-xs text-text-muted mb-4">
                Proportion of active vs completed workflow stages.
              </p>

              {/* Status List Breakdown */}
              <div className="space-y-3 mt-4">
                {statusDist.map(stat => (
                  <div key={stat.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-text flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: stat.color }}
                        />
                        {stat.title}
                      </span>
                      <span className="text-text-muted">
                        {stat.count} items ({stat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-column h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${stat.percentage}%`,
                          backgroundColor: stat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Footer */}
            <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs text-text-muted">
              <span>Total in Scope</span>
              <span className="font-bold text-text">{filteredGoals.length} goals</span>
            </div>
          </div>
        </section>

        {/* 3. Priority Breakdown & Sprint / Epic Performance */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Priority Breakdown */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-text flex items-center gap-2">
                  <Icon name="flag" size={18} className="text-amber-500" />
                  <span>Work & Completion by Priority</span>
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Completion performance categorized by priority level.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {priorityDist.map(p => (
                <div
                  key={p.priority}
                  className="bg-column/60 border border-border/60 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.title}
                      </span>
                      <span className="text-text-muted">{p.total}</span>
                    </div>
                    <div className="text-xl font-black text-text">
                      {p.completed} <span className="text-xs font-semibold text-text-muted">/ {p.total}</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="w-full bg-card h-1.5 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${p.completionRate}%`,
                          backgroundColor: p.color,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-text-muted">
                      {p.completionRate}% completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Sprint & Epic Progress */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-text flex items-center gap-2">
                    <Icon name="rocket_launch" size={18} className="text-indigo-500" />
                    <span>Sprint Velocity & Epic Roadmap</span>
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Target delivery vs completed items across sprints and epics.
                  </p>
                </div>
              </div>

              {/* Sprints Summary */}
              <div className="space-y-3">
                {sprintPerformance.length === 0 && epicProgress.length === 0 ? (
                  <div className="py-8 text-center text-text-muted text-xs">
                    No active sprints or epics found in this project.
                  </div>
                ) : (
                  <>
                    {sprintPerformance.slice(0, 2).map(s => (
                      <div key={s.sprintId} className="bg-column/50 border border-border/50 rounded-xl p-3">
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span className="text-text font-bold flex items-center gap-1.5">
                            <Icon name="bolt" size={14} className="text-indigo-500" />
                            {s.sprintName}
                          </span>
                          <span className="text-text-muted">
                            {s.completedGoals} / {s.totalGoals} ({s.completionRate}%)
                          </span>
                        </div>
                        <div className="w-full bg-card h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${s.completionRate}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    {epicProgress.slice(0, 2).map(e => (
                      <div key={e.epicId} className="bg-column/50 border border-border/50 rounded-xl p-3">
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span className="text-text font-bold flex items-center gap-1.5">
                            <Icon name="diamond" size={14} className="text-violet-500" />
                            {e.epicName}
                          </span>
                          <span className="text-text-muted">
                            {e.completedGoals} / {e.totalGoals} ({e.completionRate}%)
                          </span>
                        </div>
                        <div className="w-full bg-card h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-violet-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${e.completionRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Recently Delivered Work Feed */}
        {recentCompletedGoals.length > 0 && (
          <section className="bg-card border border-border rounded-3xl p-6 shadow-xs">
            <h2 className="text-sm font-bold text-text flex items-center gap-2 mb-1">
              <Icon name="task_alt" size={18} className="text-emerald-500" />
              <span>Recently Delivered Milestones</span>
            </h2>
            <p className="text-xs text-text-muted mb-4">
              Recently finished goals and their completion turnaround duration.
            </p>

            <div className="divide-y divide-border/60">
              {recentCompletedGoals.map(goal => {
                const ts = getGoalCompletionTimestamp(goal) ?? goal.createdAt;
                const completedDate = new Date(ts).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={goal.id}
                    onClick={() => onSelectGoal?.(goal)}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-column/40 px-2 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <Icon name="check" size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-text group-hover:text-accent transition-colors truncate">
                          {goal.title}
                        </div>
                        <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                          <span>{goal.board} Board</span>
                          <span>•</span>
                          <span>Completed {completedDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold capitalize",
                          goal.priority === 'high' && "bg-rose-500/10 text-rose-500",
                          goal.priority === 'medium' && "bg-amber-500/10 text-amber-500",
                          goal.priority === 'low' && "bg-blue-500/10 text-blue-500"
                        )}
                      >
                        {goal.priority}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default StatsDashboard;
