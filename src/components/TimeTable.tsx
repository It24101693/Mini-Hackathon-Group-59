import React from 'react';
import { Clock, User, Calendar as CalendarIcon } from 'lucide-react';
import type { TimeSlot } from '../types/schedule';

interface TimeTableProps {
  timeSlots: TimeSlot[];
  title: string;
  date: string;
  assignedTo: string | 'all';
  employerName?: string;
}

// Helper function to convert time string to minutes for sorting
const timeToMinutes = (timeStr: string): number => {
  // Handle formats like "9:00 AM", "12:30 PM", "01:30 PM"
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  }
  if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return hours * 60 + minutes;
};

export const TimeTable: React.FC<TimeTableProps> = ({ 
  timeSlots, 
  title, 
  date, 
  assignedTo,
  employerName 
}) => {
  if (!timeSlots || timeSlots.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        <Clock size={32} className="mx-auto mb-2 opacity-40" />
        <p>No time slots scheduled</p>
      </div>
    );
  }

  // Sort time slots by actual time (using minutes conversion)
  const sortedSlots = [...timeSlots].sort((a, b) => {
    return timeToMinutes(a.from) - timeToMinutes(b.from);
  });

  return (
    <div className="time-table-container">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-gold">{title}</h3>
          <div className="flex items-center gap-3 text-sm text-muted mt-1">
            <span className="flex items-center gap-1">
              <CalendarIcon size={14} /> {date}
            </span>
            <span className="flex items-center gap-1">
              <User size={14} /> {assignedTo === 'all' ? 'All Employees' : `@${assignedTo}`}
            </span>
            {employerName && (
              <span className="flex items-center gap-1 text-gold">
                👤 {employerName}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="time-slots-grid">
        {sortedSlots.map((slot, index) => (
          <div 
            key={slot.id || index}
            className="time-slot-item"
            style={{ borderLeftColor: slot.color || '#d4af37' }}
          >
            <div className="time-slot-time">
              <span className="time-from">{slot.from}</span>
              <span className="time-arrow">→</span>
              <span className="time-to">{slot.to}</span>
            </div>
            <div 
              className="time-slot-task"
              style={{ backgroundColor: slot.color ? slot.color + '20' : 'rgba(212, 175, 55, 0.1)' }}
            >
              <span 
                className="task-dot"
                style={{ backgroundColor: slot.color || '#d4af37' }}
              />
              <span className="task-text">{slot.task}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .time-table-container {
          background: var(--bg-card);
          border-radius: var(--radius-md);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 1.5rem;
        }

        .time-slots-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .time-slot-item {
          display: flex;
          align-items: stretch;
          gap: 1rem;
          border-left: 4px solid var(--color-gold);
          padding-left: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: var(--radius-sm);
          transition: var(--transition-fast);
        }

        .time-slot-item:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateX(4px);
        }

        .time-slot-time {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 200px;
          padding: 0.75rem 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .time-arrow {
          color: var(--color-text-muted);
          font-weight: 300;
        }

        .time-slot-task {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.95rem;
          color: var(--color-text-primary);
        }

        .task-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .task-text {
          font-weight: 500;
        }

        @media (max-width: 640px) {
          .time-slot-item {
            flex-direction: column;
            gap: 0.25rem;
            padding-left: 0.75rem;
          }

          .time-slot-time {
            min-width: unset;
            padding: 0.5rem 0 0.25rem 0;
            font-size: 0.8rem;
          }

          .time-slot-task {
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
};