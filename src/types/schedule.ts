export interface TimeSlot {
  id: string;
  from: string; // e.g., "8:30 AM"
  to: string;   // e.g., "12:00 PM"
  task: string;
  color: string; // hex color for the slot
}

export interface Schedule {
  id: string;
  title: string;
  description: string;
  assignedTo: string | 'all';
  date: string; // date for this schedule
  timeSlots: TimeSlot[];
  notes: string;
  target: Target;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Target {
  type: 'weekly' | 'monthly' | 'custom';
  value: number;
  unit: string;
  customDateRange?: {
    start: string;
    end: string;
  };
}

export const WORKING_DAYS_OPTIONS = {
  'Mon-Fri': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  'Mon-Sat': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  'Sun-Thu': ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
  'All Days': ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
};

export const PRIORITY_COLORS = {
  low: '#38a169',
  medium: '#d4af37',
  high: '#e53e3e',
};

export const TIME_SLOT_COLORS = [
  '#d4af37', // Gold
  '#00b4d8', // Blue
  '#ff7b00', // Orange
  '#38a169', // Green
  '#e53e3e', // Red
  '#9f7aea', // Purple
  '#ed64a6', // Pink
  '#68d391', // Light Green
  '#f6ad55', // Light Orange
  '#63b3ed', // Light Blue
];