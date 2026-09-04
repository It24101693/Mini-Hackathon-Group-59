import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  FileText,
  Target as TargetIcon,
  Search,
  UserPlus,
  Save
} from 'lucide-react';
import { scheduleService } from '../services/scheduleService';
import type { Schedule, TimeSlot, Target } from '../types/schedule';
import { WORKING_DAYS_OPTIONS, PRIORITY_COLORS, TIME_SLOT_COLORS } from '../types/schedule';
import type { Employer } from '../services/dbService';
import { TimeTable } from './TimeTable';

interface ScheduleManagementProps {
  employers: Employer[];
  currentUser: string;
  isAdmin?: boolean;
}

// Helper function to create a default target
const createDefaultTarget = (): Target => ({
  type: 'weekly',
  value: 0,
  unit: 'leads'
});

// Helper function to ensure target has all required fields
const ensureTarget = (target?: Partial<Target>): Target => {
  if (!target) return createDefaultTarget();
  return {
    type: target.type || 'weekly',
    value: target.value || 0,
    unit: target.unit || 'leads'
  };
};

export const ScheduleManagement: React.FC<ScheduleManagementProps> = ({ 
  employers, 
  currentUser,
  isAdmin = false 
}) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState<Partial<Schedule>>({
    title: '',
    description: '',
    assignedTo: 'all',
    date: new Date().toISOString().split('T')[0],
    timeSlots: [],
    notes: '',
    target: createDefaultTarget()
  });

  // New time slot form state
  const [newTimeSlot, setNewTimeSlot] = useState<Partial<TimeSlot>>({
    from: '9:00 AM',
    to: '10:00 AM',
    task: '',
    color: TIME_SLOT_COLORS[0]
  });

  useEffect(() => {
    let unsubscribe: () => void;

    if (isAdmin) {
      unsubscribe = scheduleService.getSchedules((fetchedSchedules) => {
        setSchedules(fetchedSchedules);
        setLoading(false);
      });
    } else {
      unsubscribe = scheduleService.getSchedulesForUser(currentUser, (fetchedSchedules) => {
        setSchedules(fetchedSchedules);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser, isAdmin]);

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         schedule.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || schedule.assignedTo === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const handleOpenModal = (schedule?: Schedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        ...schedule,
        target: ensureTarget(schedule.target)
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        title: '',
        description: '',
        assignedTo: 'all',
        date: new Date().toISOString().split('T')[0],
        timeSlots: [],
        notes: '',
        target: createDefaultTarget()
      });
    }
    setIsModalOpen(true);
  };

  const handleAddTimeSlot = () => {
    if (!newTimeSlot.from || !newTimeSlot.to || !newTimeSlot.task) {
      alert('Please fill in all time slot fields');
      return;
    }
    const slot: TimeSlot = {
      id: Date.now().toString(),
      from: newTimeSlot.from,
      to: newTimeSlot.to,
      task: newTimeSlot.task,
      color: newTimeSlot.color || TIME_SLOT_COLORS[0]
    };
    setFormData({
      ...formData,
      timeSlots: [...(formData.timeSlots || []), slot]
    });
    setNewTimeSlot({
      from: '9:00 AM',
      to: '10:00 AM',
      task: '',
      color: TIME_SLOT_COLORS[0]
    });
  };

  const handleRemoveTimeSlot = (slotId: string) => {
    setFormData({
      ...formData,
      timeSlots: (formData.timeSlots || []).filter(s => s.id !== slotId)
    });
  };

  const handleTargetChange = (field: keyof Target, value: any) => {
    const currentTarget = ensureTarget(formData.target);
    setFormData({
      ...formData,
      target: {
        ...currentTarget,
        [field]: value
      }
    });
  };

  const handleSubmit = async () => {
    try {
      // Ensure target is complete before submitting
      const completeTarget = ensureTarget(formData.target);
      
      const scheduleData = {
        ...formData,
        target: completeTarget,
        createdBy: currentUser,
        updatedAt: Date.now()
      } as Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>;

      if (editingSchedule) {
        await scheduleService.updateSchedule({
          ...editingSchedule,
          ...scheduleData
        } as Schedule);
      } else {
        await scheduleService.addSchedule(scheduleData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule. Please try again.');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      try {
        await scheduleService.deleteSchedule(id);
      } catch (error) {
        console.error('Error deleting schedule:', error);
        alert('Failed to delete schedule. Please try again.');
      }
    }
  };

  const getEmployerName = (username: string) => {
    const emp = employers.find(e => e.username === username);
    return emp ? emp.fullName : username;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-gold">Loading schedules...</div>
      </div>
    );
  }

  return (
    <div className="schedule-management">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          {isAdmin ? '📋 Team Schedule & Targets' : '📋 My Schedule & Targets'}
        </h1>
        {isAdmin && (
          <button onClick={() => handleOpenModal()} className="btn btn-primary">
            <Plus size={16} /> Create Schedule
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-muted" />
          <input 
            type="text" 
            placeholder="Search schedules..." 
            className="input-field py-1.5 px-3 max-w-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted uppercase">Assigned To:</span>
            <select 
              className="input-field py-1 px-2 text-sm"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              style={{ width: '150px' }}
            >
              <option value="all">All Users</option>
              <option value="all_users">All Employees</option>
              {employers.map(emp => (
                <option key={emp.username} value={emp.username}>@{emp.username}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Schedules Grid */}
      <div className="grid-2">
        {filteredSchedules.map(schedule => (
          <div key={schedule.id} className="glass-card schedule-card">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold text-gold">{schedule.title}</h3>
                <p className="text-sm text-muted">{schedule.description}</p>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenModal(schedule)} 
                    className="text-blue hover:text-blue-hover"
                    title="Edit Schedule"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteSchedule(schedule.id)} 
                    className="text-danger hover:text-red-400"
                    title="Delete Schedule"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Time Table - BEAUTIFUL COLORFUL DISPLAY */}
            <TimeTable 
              timeSlots={schedule.timeSlots || []}
              title={schedule.title}
              date={schedule.date || ''}
              assignedTo={schedule.assignedTo}
              employerName={schedule.assignedTo !== 'all' ? getEmployerName(schedule.assignedTo as string) : undefined}
            />

            {/* Target Section */}
            {schedule.target && schedule.target.value > 0 && (
              <div className="mt-4 bg-gold-dim p-3 rounded border border-gold/20">
                <div className="flex items-center gap-2 text-sm">
                  <TargetIcon size={16} className="text-gold" />
                  <span className="text-gold font-semibold">
                    🎯 Target: {schedule.target.value} {schedule.target.unit} / {schedule.target.type}
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            {schedule.notes && (
              <div className="mt-3 bg-input p-3 rounded text-sm border border-glass">
                <div className="flex items-start gap-2 text-muted">
                  <FileText size={14} className="mt-0.5" />
                  <span>📝 {schedule.notes}</span>
                </div>
              </div>
            )}
          </div>
        ))}
        {filteredSchedules.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted">
            <Calendar size={48} className="mx-auto mb-4 opacity-40" />
            <p>No schedules found</p>
            {isAdmin && (
              <button onClick={() => handleOpenModal()} className="btn btn-primary mt-4">
                <Plus size={16} /> Create Your First Schedule
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '900px' }}>
            <div className="flex justify-between items-center border-b border-glass pb-4 mb-6">
              <h2 className="text-xl font-bold text-gold">
                {editingSchedule ? '✏️ Edit Schedule' : '📋 Create New Schedule'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="modal-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {/* Left Column - Basic Info */}
              <div>
                <div className="input-group">
                  <label className="input-label">Schedule Title *</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Daily Work Schedule"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea 
                    className="input-field" 
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description"
                  />
                </div>

                {isAdmin && (
                  <div className="input-group">
                    <label className="input-label">Assign To</label>
                    <select 
                      className="input-field"
                      value={formData.assignedTo || 'all'}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    >
                      <option value="all">All Employees</option>
                      {employers.map(emp => (
                        <option key={emp.username} value={emp.username}>@{emp.username} ({emp.fullName})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label">Date</label>
                  <input 
                    type="date" 
                    className="input-field"
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">🎯 Target Settings</label>
                  <div className="grid-2">
                    <select 
                      className="input-field"
                      value={formData.target?.type || 'weekly'}
                      onChange={(e) => handleTargetChange('type', e.target.value as any)}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={formData.target?.value || 0}
                      onChange={(e) => handleTargetChange('value', Number(e.target.value) || 0)}
                      placeholder="Target value"
                    />
                  </div>
                  <select 
                    className="input-field mt-2"
                    value={formData.target?.unit || 'leads'}
                    onChange={(e) => handleTargetChange('unit', e.target.value)}
                  >
                    <option value="leads">Leads</option>
                    <option value="calls">Calls</option>
                    <option value="deals">Deals</option>
                    <option value="revenue">Revenue ($)</option>
                    <option value="meetings">Meetings</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">📝 Notes / Instructions</label>
                  <textarea 
                    className="input-field" 
                    rows={2}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add notes for the team..."
                  />
                </div>
              </div>

              {/* Right Column - Time Slots */}
              <div>
                <div className="input-group">
                  <label className="input-label">⏰ Time Slots</label>
                  <div className="bg-input p-3 rounded border border-glass mb-3">
                    <div className="grid grid-cols-4 gap-2">
                      <input 
                        type="text" 
                        className="input-field col-span-1 text-sm"
                        value={newTimeSlot.from || ''}
                        onChange={(e) => setNewTimeSlot({ ...newTimeSlot, from: e.target.value })}
                        placeholder="From e.g. 9:00 AM"
                      />
                      <input 
                        type="text" 
                        className="input-field col-span-1 text-sm"
                        value={newTimeSlot.to || ''}
                        onChange={(e) => setNewTimeSlot({ ...newTimeSlot, to: e.target.value })}
                        placeholder="To e.g. 10:00 AM"
                      />
                      <input 
                        type="text" 
                        className="input-field col-span-1 text-sm"
                        value={newTimeSlot.task || ''}
                        onChange={(e) => setNewTimeSlot({ ...newTimeSlot, task: e.target.value })}
                        placeholder="Task e.g. Calls"
                      />
                      <button onClick={handleAddTimeSlot} className="btn btn-primary text-sm">
                        <Plus size={14} /> Add
                      </button>
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <span className="text-xs text-muted">Colors:</span>
                      {TIME_SLOT_COLORS.map(color => (
                        <button
                          key={color}
                          className={`w-6 h-6 rounded-full border-2 ${newTimeSlot.color === color ? 'border-white' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewTimeSlot({ ...newTimeSlot, color })}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Time Slots List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(formData.timeSlots || []).map(slot => (
                      <div 
                        key={slot.id} 
                        className="flex items-center gap-2 bg-input p-2 rounded border-l-4"
                        style={{ borderLeftColor: slot.color || '#d4af37' }}
                      >
                        <span className="text-xs font-bold text-muted min-w-[100px]">
                          {slot.from} → {slot.to}
                        </span>
                        <span className="text-sm flex-1">{slot.task}</span>
                        <button onClick={() => handleRemoveTimeSlot(slot.id)} className="text-danger hover:text-red-400">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {(formData.timeSlots || []).length === 0 && (
                      <p className="text-xs text-muted text-center py-4">No time slots added yet</p>
                    )}
                  </div>
                </div>

                {/* Preview of time table */}
                {(formData.timeSlots || []).length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted mb-2">📊 Preview:</p>
                    <div className="bg-bg-deep p-2 rounded border border-glass max-h-32 overflow-y-auto">
                      {(formData.timeSlots || []).map(slot => (
                        <div key={slot.id} className="flex items-center gap-2 text-xs py-1 border-b border-glass/20">
                          <span className="font-bold text-gold min-w-[80px]">{slot.from} → {slot.to}</span>
                          <span className="text-muted">{slot.task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-6 border-t border-glass pt-4 justify-end">
              <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleSubmit} className="btn btn-primary">
                <Save size={16} /> {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};