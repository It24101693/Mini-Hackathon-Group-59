import React, { useState, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  Coins, 
  LogOut, 
  Edit, 
  Search, 
  ExternalLink,
  X,
  FileSpreadsheet,
  FileJson,
  Calendar,
  Check,
  AlertCircle,
  Plus,
  UploadCloud,
  Eye
} from 'lucide-react';
import type { Lead, Employer } from '../services/dbService';
import { SUPPORTED_CURRENCIES } from '../types';
import { ScheduleManagement } from './ScheduleManagement';
import type { Schedule } from '../types/schedule';
import * as XLSX from 'xlsx';

interface EmployerDashboardProps {
  currentUser: string;
  leads: Lead[];
  employers: Employer[];
  schedules?: Schedule[];
  onUpdateLead: (lead: Lead) => Promise<void>;
  onAddLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onLogout: () => void;
  exchangeRates?: { currency: string; rateToLKR: number }[];
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const EmployerDashboard: React.FC<EmployerDashboardProps> = ({
  currentUser,
  leads,
  employers,
  schedules = [],
  onUpdateLead,
  onAddLead,
  onLogout,
  exchangeRates = []
}) => {
  // ============================================
  // STATE
  // ============================================
  
  const [activeTab, setActiveTab] = useState<'pipeline' | 'commissions' | 'schedules'>('pipeline');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResponse, setFilterResponse] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'caller' | 'engineer'>('all');

  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: SaveStatus }>({});
  const [saveError, setSaveError] = useState<{ [key: string]: string }>({});

  // Excel Import State
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);

  // Add Lead Form State
  const [newLeadForm, setNewLeadForm] = useState<Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>>({
    businessName: '',
    field: '',
    ownerName: '',
    ownerContact: '',
    country: '',
    city: '',
    businessContact: '',
    email: '',
    workingHours: '',
    managerName: '',
    response: 'none',
    proposalSent: 'no',
    proposalAccepted: 'no',
    paidAmount: 0,
    dealClosed: 'no',
    packageType: 'none',
    cost: 0,
    caller: currentUser,
    engineer1: '',
    engineer2: '',
    engineer3: '',
    numberNotWorking: 'no',
    deployedLink: '',
    domain: '',
    renewalDate: '',
    googleLink: '',
    notes: '',
    followUp: '',
    currency: 'USD',
    totalProjectValue: 0,
    paidToDate: 0,
    paymentSchedule: 'one-time',
    subscriptionStartDate: '',
    lastPaymentDate: '',
    nextPaymentDate: '',
    paymentStatus: 'unpaid'
  });

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const employerName = useMemo(() => {
    const emp = employers.find(e => e.username === currentUser);
    return emp ? emp.fullName : currentUser;
  }, [currentUser, employers]);

  const convertToLKR = (amount: number, currency: string): number => {
    if (!currency || currency === 'LKR') return amount;
    const rate = exchangeRates.find(r => r.currency === currency)?.rateToLKR || 1;
    return amount * rate;
  };

  const myLeads = useMemo(() => {
    return leads.filter(l => 
      l.caller === currentUser ||
      l.engineer1 === currentUser ||
      l.engineer2 === currentUser ||
      l.engineer3 === currentUser
    );
  }, [leads, currentUser]);

  const filteredMyLeads = useMemo(() => {
    return myLeads.filter(l => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        l.businessName.toLowerCase().includes(query) ||
        l.ownerName.toLowerCase().includes(query) ||
        l.city.toLowerCase().includes(query);

      const matchesResponse = filterResponse === 'all' || l.response === filterResponse;
      
      let matchesRole = true;
      if (filterRole === 'caller') {
        matchesRole = l.caller === currentUser;
      } else if (filterRole === 'engineer') {
        matchesRole = l.engineer1 === currentUser || l.engineer2 === currentUser || l.engineer3 === currentUser;
      }

      return matchesSearch && matchesResponse && matchesRole;
    });
  }, [myLeads, searchQuery, filterResponse, filterRole, currentUser]);

  const commissionSummary = useMemo(() => {
    const paidLeads = myLeads.filter(l => l.paidAmount > 0 || l.dealClosed === 'yes');
    
    let totalCallerComm = 0;
    let totalEngComm = 0;
    
    const breakdownList = paidLeads.map(l => {
      const amt = convertToLKR(l.paidAmount, l.currency || 'USD');
      let callerEarned = 0;
      let engEarned = 0;
      
      const roles: string[] = [];
      
      if (l.caller === currentUser) {
        callerEarned = amt * 0.05;
        roles.push('Caller (5%)');
      }
      
      let engSlots = 0;
      if (l.engineer1 === currentUser) engSlots++;
      if (l.engineer2 === currentUser) engSlots++;
      if (l.engineer3 === currentUser) engSlots++;
      
      if (engSlots > 0) {
        engEarned = amt * 0.15 * engSlots;
        roles.push(`Developer (${15 * engSlots}%)`);
      }

      const totalEarned = callerEarned + engEarned;
      totalCallerComm += callerEarned;
      totalEngComm += engEarned;

      return {
        id: l.id,
        businessName: l.businessName,
        packageType: l.packageType,
        roles: roles.join(' & '),
        commission: totalEarned
      };
    });

    return {
      callerComm: totalCallerComm,
      engComm: totalEngComm,
      totalComm: totalCallerComm + totalEngComm,
      details: breakdownList.filter(item => item.commission > 0)
    };
  }, [myLeads, currentUser, exchangeRates]);

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  const handleDownloadCSV = () => {
    if (myLeads.length === 0) return;

    const headers = [
      'Business Name', 'Field', 'Owner Name', 'Owner Contact', 
      'Business Contact', 'Country', 'City', 'Email', 'Working Hours', 
      'Manager Name', 'Response', 'Proposal Sent', 'Proposal Accepted', 
      'Package Type', 'Caller ID', 'Engineer 1', 'Engineer 2', 'Engineer 3', 
      'Number Not Working', 'Deployed Link', 'Domain Name', 'Renewal Date', 'Google Link', 'Notes'
    ];

    const rows = myLeads.map(l => [
      `"${l.businessName.replace(/"/g, '""')}"`,
      `"${(l.field || '').replace(/"/g, '""')}"`,
      `"${(l.ownerName || '').replace(/"/g, '""')}"`,
      `"${(l.ownerContact || '').replace(/"/g, '""')}"`,
      `"${(l.businessContact || '').replace(/"/g, '""')}"`,
      `"${(l.country || '').replace(/"/g, '""')}"`,
      `"${(l.city || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.workingHours || '').replace(/"/g, '""')}"`,
      `"${(l.managerName || '').replace(/"/g, '""')}"`,
      `"${l.response}"`,
      `"${l.proposalSent}"`,
      `"${l.proposalAccepted}"`,
      `"${l.packageType}"`,
      `"${l.caller}"`,
      `"${l.engineer1}"`,
      `"${l.engineer2}"`,
      `"${l.engineer3}"`,
      `"${l.numberNotWorking}"`,
      `"${(l.deployedLink || '').replace(/"/g, '""')}"`,
      `"${(l.domain || '').replace(/"/g, '""')}"`,
      `"${l.renewalDate}"`,
      `"${(l.googleLink || '').replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentUser}_pipeline_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJSON = () => {
    if (myLeads.length === 0) return;

    const sanitizedLeads = myLeads.map(({ cost, followUp, paidAmount, currency, ...rest }) => rest);
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sanitizedLeads, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `${currentUser}_pipeline_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============================================
  // EXCEL IMPORT FUNCTIONS
  // ============================================

  const downloadEmployerTemplate = () => {
    const headers = [
      'Business Name', 'Field', 'Owner Name', 'Owner Contact', 
      'Country', 'City', 'Business Contact', 'Email', 
      'Working Hours', 'Manager Name', 'Google Link', 'Notes'
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'CodoConsole_Employer_Lead_Template.xlsx';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setImportFeedback({ type: 'error', message: 'Please upload an Excel file (.xlsx, .xls) or CSV file' });
      return;
    }

    setFileName(file.name);
    setImportFeedback(null);
    parseFile(file);
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          setImportFeedback({ type: 'error', message: 'No data found in the file' });
          return;
        }

        const parsed = jsonData.map((row: any) => ({
          businessName: row['Business Name'] || row['businessName'] || '',
          field: row['Field'] || row['field'] || '',
          ownerName: row['Owner Name'] || row['ownerName'] || '',
          ownerContact: row['Owner Contact'] || row['ownerContact'] || '',
          country: row['Country'] || row['country'] || '',
          city: row['City'] || row['city'] || '',
          businessContact: row['Business Contact'] || row['businessContact'] || '',
          email: row['Email'] || row['email'] || '',
          workingHours: row['Working Hours'] || row['workingHours'] || '',
          managerName: row['Manager Name'] || row['managerName'] || '',
          googleLink: row['Google Link'] || row['googleLink'] || row['Google Maps Link'] || row['googleMapsLink'] || '',
          notes: row['Notes'] || row['notes'] || '',
          response: 'none',
          proposalSent: 'no',
          proposalAccepted: 'no',
          paidAmount: 0,
          dealClosed: 'no',
          packageType: 'none',
          cost: 0,
          caller: currentUser,
          engineer1: '',
          engineer2: '',
          engineer3: '',
          numberNotWorking: 'no',
          deployedLink: '',
          domain: '',
          renewalDate: '',
          followUp: '',
          currency: 'USD',
          totalProjectValue: 0,
          paidToDate: 0,
          paymentSchedule: 'one-time',
          subscriptionStartDate: '',
          lastPaymentDate: '',
          nextPaymentDate: '',
          paymentStatus: 'unpaid'
        }));

        setParsedData(parsed);
        setImportFeedback({ type: 'success', message: `Parsed ${parsed.length} rows successfully!` });
      } catch (error: any) {
        setImportFeedback({ type: 'error', message: `Error parsing file: ${error.message}` });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (parsedData.length === 0) return;

    setIsImportLoading(true);
    try {
      for (const row of parsedData) {
        await onAddLead(row);
      }
      setImportFeedback({ type: 'success', message: `Successfully imported ${parsedData.length} leads!` });
      setParsedData([]);
      setFileName('');
    } catch (error: any) {
      setImportFeedback({ type: 'error', message: `Import failed: ${error.message}` });
    } finally {
      setIsImportLoading(false);
    }
  };

  const clearImportData = () => {
    setParsedData([]);
    setFileName('');
    setImportFeedback(null);
  };

  // ============================================
  // LEAD CRUD FUNCTIONS
  // ============================================

  const handleInlineChange = async (lead: Lead, field: keyof Lead, value: any) => {
    setSaveStatus(prev => ({ ...prev, [lead.id]: 'saving' }));
    setSaveError(prev => ({ ...prev, [lead.id]: '' }));

    const updated = { ...lead, [field]: value };

    if (field === 'paidAmount' || field === 'cost') {
      updated[field] = Number(value) || 0;
    }
    
    if (field === 'paidAmount' && Number(value) > 0 && lead.paidAmount === 0) {
      updated.dealClosed = 'yes';
    }

    try {
      await onUpdateLead(updated);
      setSaveStatus(prev => ({ ...prev, [lead.id]: 'saved' }));
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [lead.id]: 'idle' }));
      }, 2000);
    } catch (e: any) {
      console.error("Inline update failed:", e);
      setSaveStatus(prev => ({ ...prev, [lead.id]: 'error' }));
      setSaveError(prev => ({ ...prev, [lead.id]: e.message || 'Update failed' }));
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [lead.id]: 'idle' }));
        setSaveError(prev => ({ ...prev, [lead.id]: '' }));
      }, 3000);
    }
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead({ ...lead });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLead) return;
    try {
      await onUpdateLead(editingLead);
      setIsEditModalOpen(false);
      setEditingLead(null);
    } catch (e: any) {
      alert(`Failed to save pipeline updates: ${e.message}`);
    }
  };

  const handleAddManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const leadToAdd = {
        ...newLeadForm,
        caller: currentUser,
        totalProjectValue: newLeadForm.totalProjectValue || newLeadForm.paidAmount,
        paidToDate: newLeadForm.paidToDate || newLeadForm.paidAmount
      };
      await onAddLead(leadToAdd);
      setIsAddModalOpen(false);
      setNewLeadForm({
        businessName: '',
        field: '',
        ownerName: '',
        ownerContact: '',
        country: '',
        city: '',
        businessContact: '',
        email: '',
        workingHours: '',
        managerName: '',
        response: 'none',
        proposalSent: 'no',
        proposalAccepted: 'no',
        paidAmount: 0,
        dealClosed: 'no',
        packageType: 'none',
        cost: 0,
        caller: currentUser,
        engineer1: '',
        engineer2: '',
        engineer3: '',
        numberNotWorking: 'no',
        deployedLink: '',
        domain: '',
        renewalDate: '',
        googleLink: '',
        notes: '',
        followUp: '',
        currency: 'USD',
        totalProjectValue: 0,
        paidToDate: 0,
        paymentSchedule: 'one-time',
        subscriptionStartDate: '',
        lastPaymentDate: '',
        nextPaymentDate: '',
        paymentStatus: 'unpaid'
      });
    } catch (err: any) {
      alert(`Error adding lead: ${err.message}`);
    }
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderAddLeadModal = () => {
    if (!isAddModalOpen) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content glass-panel">
          <div className="flex justify-between items-center border-b border-glass pb-4 mb-6">
            <h2 className="text-xl font-bold text-gold" style={{ color: '#d4af37' }}>Add New Lead</h2>
            <button onClick={() => setIsAddModalOpen(false)} className="text-muted hover:text-white">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleAddManualLead}>
            <div className="modal-grid">
              <div className="input-group">
                <label className="input-label">Business Name *</label>
                <input type="text" className="input-field" required value={newLeadForm.businessName} onChange={(e) => setNewLeadForm({ ...newLeadForm, businessName: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Field</label>
                <input type="text" className="input-field" value={newLeadForm.field} onChange={(e) => setNewLeadForm({ ...newLeadForm, field: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Owner Name</label>
                <input type="text" className="input-field" value={newLeadForm.ownerName} onChange={(e) => setNewLeadForm({ ...newLeadForm, ownerName: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Owner Contact</label>
                <input type="text" className="input-field" value={newLeadForm.ownerContact} onChange={(e) => setNewLeadForm({ ...newLeadForm, ownerContact: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Country</label>
                <input type="text" className="input-field" value={newLeadForm.country} onChange={(e) => setNewLeadForm({ ...newLeadForm, country: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">City</label>
                <input type="text" className="input-field" value={newLeadForm.city} onChange={(e) => setNewLeadForm({ ...newLeadForm, city: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Business Contact</label>
                <input type="text" className="input-field" value={newLeadForm.businessContact} onChange={(e) => setNewLeadForm({ ...newLeadForm, businessContact: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input type="email" className="input-field" value={newLeadForm.email} onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Working Hours</label>
                <input type="text" className="input-field" value={newLeadForm.workingHours} onChange={(e) => setNewLeadForm({ ...newLeadForm, workingHours: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Manager Name</label>
                <input type="text" className="input-field" value={newLeadForm.managerName} onChange={(e) => setNewLeadForm({ ...newLeadForm, managerName: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Response</label>
                <select className="input-field" value={newLeadForm.response} onChange={(e) => setNewLeadForm({ ...newLeadForm, response: e.target.value as any })}>
                  <option value="none">No Response</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Package Type</label>
                <select className="input-field" value={newLeadForm.packageType} onChange={(e) => setNewLeadForm({ ...newLeadForm, packageType: e.target.value as any })}>
                  <option value="none">None</option>
                  <option value="one-time">One-time</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Currency</label>
                <select className="input-field" value={newLeadForm.currency || 'USD'} onChange={(e) => setNewLeadForm({ ...newLeadForm, currency: e.target.value })}>
                  {SUPPORTED_CURRENCIES.map(curr => <option key={curr.code} value={curr.code}>{curr.code}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Engineer 1</label>
                <select className="input-field" value={newLeadForm.engineer1} onChange={(e) => setNewLeadForm({ ...newLeadForm, engineer1: e.target.value })}>
                  <option value="">None</option>
                  {employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Engineer 2</label>
                <select className="input-field" value={newLeadForm.engineer2} onChange={(e) => setNewLeadForm({ ...newLeadForm, engineer2: e.target.value })}>
                  <option value="">None</option>
                  {employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Engineer 3</label>
                <select className="input-field" value={newLeadForm.engineer3} onChange={(e) => setNewLeadForm({ ...newLeadForm, engineer3: e.target.value })}>
                  <option value="">None</option>
                  {employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username}</option>)}
                </select>
              </div>
              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label className="input-label">Notes</label>
                <textarea className="input-field" rows={2} value={newLeadForm.notes} onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4 mt-6 border-t border-glass pt-4 justify-end">
              <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Lead</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderEditModal = () => {
    if (!isEditModalOpen || !editingLead) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content glass-panel">
          <div className="flex justify-between items-center border-b border-glass pb-4 mb-6">
            <h2 className="text-xl font-bold text-gold" style={{ color: '#d4af37' }}>
              Update Pipeline: {editingLead.businessName}
            </h2>
            <button onClick={() => setIsEditModalOpen(false)} className="text-muted hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="modal-grid">
            <div className="input-group">
              <label className="input-label">Business Name (Read Only)</label>
              <input type="text" className="input-field opacity-60 cursor-not-allowed" value={editingLead.businessName} disabled />
            </div>
            <div className="input-group">
              <label className="input-label">Field (Niche)</label>
              <input type="text" className="input-field" value={editingLead.field} onChange={(e) => setEditingLead({ ...editingLead, field: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Owner Name</label>
              <input type="text" className="input-field" value={editingLead.ownerName} onChange={(e) => setEditingLead({ ...editingLead, ownerName: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Owner Contact Phone</label>
              <input type="text" className="input-field" value={editingLead.ownerContact} onChange={(e) => setEditingLead({ ...editingLead, ownerContact: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Business Phone</label>
              <input type="text" className="input-field" value={editingLead.businessContact} onChange={(e) => setEditingLead({ ...editingLead, businessContact: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input type="email" className="input-field" value={editingLead.email} onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Working Hours</label>
              <input type="text" className="input-field" value={editingLead.workingHours} onChange={(e) => setEditingLead({ ...editingLead, workingHours: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Manager Name</label>
              <input type="text" className="input-field" value={editingLead.managerName} onChange={(e) => setEditingLead({ ...editingLead, managerName: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Response Status</label>
              <select className="input-field" value={editingLead.response} onChange={(e) => setEditingLead({ ...editingLead, response: e.target.value as any })}>
                <option value="none">No Response</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Proposal Sent</label>
              <select className="input-field" value={editingLead.proposalSent} onChange={(e) => setEditingLead({ ...editingLead, proposalSent: e.target.value as any })}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Proposal Accepted</label>
              <select className="input-field" value={editingLead.proposalAccepted} onChange={(e) => setEditingLead({ ...editingLead, proposalAccepted: e.target.value as any })}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Caller ID (Locked)</label>
              <input type="text" className="input-field opacity-60 cursor-not-allowed" value={editingLead.caller || 'Unassigned'} disabled />
            </div>
            <div className="input-group">
              <label className="input-label">Lead Developer 1</label>
              <select className="input-field" value={editingLead.engineer1} onChange={(e) => setEditingLead({ ...editingLead, engineer1: e.target.value })}>
                <option value="">None</option>
                {employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username} ({emp.fullName})</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Developer 2</label>
              <select className="input-field" value={editingLead.engineer2} onChange={(e) => setEditingLead({ ...editingLead, engineer2: e.target.value })}>
                <option value="">None</option>
                {employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username} ({emp.fullName})</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Developer 3</label>
              <select className="input-field" value={editingLead.engineer3} onChange={(e) => setEditingLead({ ...editingLead, engineer3: e.target.value })}>
                <option value="">None</option>
                {employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username} ({emp.fullName})</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Number working correctly?</label>
              <select className="input-field" value={editingLead.numberNotWorking} onChange={(e) => setEditingLead({ ...editingLead, numberNotWorking: e.target.value as any })}>
                <option value="no">Working (No issues)</option>
                <option value="yes">Number Off (Remove Lead)</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Package Type</label>
              <select className="input-field" value={editingLead.packageType} onChange={(e) => setEditingLead({ ...editingLead, packageType: e.target.value as any })}>
                <option value="none">None</option>
                <option value="one-time">One-time</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Deployed Link</label>
              <input type="text" className="input-field" value={editingLead.deployedLink} onChange={(e) => setEditingLead({ ...editingLead, deployedLink: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Domain Name</label>
              <input type="text" className="input-field" value={editingLead.domain} onChange={(e) => setEditingLead({ ...editingLead, domain: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Renewal Date</label>
              <input type="date" className="input-field" value={editingLead.renewalDate} onChange={(e) => setEditingLead({ ...editingLead, renewalDate: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Google Maps Link</label>
              <input type="text" className="input-field" value={editingLead.googleLink} onChange={(e) => setEditingLead({ ...editingLead, googleLink: e.target.value })} />
            </div>
            <div className="input-group" style={{ gridColumn: 'span 2' }}>
              <label className="input-label">Other Notes</label>
              <textarea className="input-field" rows={3} value={editingLead.notes} onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-4 mt-6 border-t border-glass pt-4 justify-end">
            <button onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSaveEdit} className="btn btn-primary">Save Changes</button>
          </div>
        </div>
      </div>
    );
  };

  const renderExcelImport = () => {
    return (
      <div className="glass-card mt-6">
        <h3 className="mb-4 text-gold font-bold text-lg flex items-center gap-2" style={{ color: '#d4af37' }}>
          <UploadCloud size={20} />
          Import Leads via Excel
        </h3>

        <div className="mb-4 flex gap-4 flex-wrap">
          <button onClick={downloadEmployerTemplate} className="btn btn-secondary">
            <FileSpreadsheet size={16} /> Download Template
          </button>
          <span className="text-xs text-muted self-center">Use this template to batch import leads</span>
        </div>

        <div
          className={`drop-zone ${isDragging ? 'dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('employerFileInput')?.click()}
        >
          <UploadCloud size={48} className="text-gold opacity-60" />
          <p><strong>Drop your Excel/CSV file here</strong> or click to browse</p>
          <p className="sub-text">Supports .xlsx, .xls, .csv files</p>
          {fileName && <p className="text-sm text-gold">📄 {fileName}</p>}
          <input
            id="employerFileInput"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {importFeedback && (
          <div className={`p-4 rounded mt-4 text-sm flex items-center gap-2 ${importFeedback.type === 'success' ? 'bg-success/10 text-success border border-success/30' : 'bg-orange-dim text-orange border border-orange'}`}>
            {importFeedback.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{importFeedback.message}</span>
          </div>
        )}

        {parsedData.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-muted">{parsedData.length} rows ready to import</span>
              <div className="flex gap-2">
                <button onClick={clearImportData} className="btn btn-secondary text-sm">Clear</button>
                <button onClick={handleConfirmImport} className="btn btn-primary" disabled={isImportLoading}>
                  {isImportLoading ? 'Importing...' : `Import ${parsedData.length} Leads`}
                </button>
              </div>
            </div>
            <div className="table-container max-h-48 overflow-auto">
              <table className="custom-table text-sm">
                <thead>
                  <tr>
                    <th>Business Name</th>
                    <th>Field</th>
                    <th>Owner</th>
                    <th>Location</th>
                    <th>Google Link</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.businessName}</td>
                      <td>{row.field}</td>
                      <td>{row.ownerName}</td>
                      <td>{row.city}, {row.country}</td>
                      <td className="max-w-[150px] truncate">{row.googleLink || '-'}</td>
                    </tr>
                  ))}
                  {parsedData.length > 5 && (
                    <tr><td colSpan={5} className="text-center text-muted text-xs">... and {parsedData.length - 5} more</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="dashboard-container employer-dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div>
          <div className="logo-container">
            <TrendingUp size={28} className="text-gold" style={{ color: '#d4af37' }} />
            <span className="logo-text">CodoConsole</span>
          </div>

          <ul className="nav-links">
            <li>
              <button 
                onClick={() => setActiveTab('pipeline')}
                className={`nav-link w-full text-left ${activeTab === 'pipeline' ? 'active' : ''}`}
              >
                <TrendingUp size={20} />
                My Pipeline
                <span className="badge">{myLeads.length}</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('commissions')}
                className={`nav-link w-full text-left ${activeTab === 'commissions' ? 'active' : ''}`}
              >
                <Coins size={20} />
                My Commissions
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('schedules')}
                className={`nav-link w-full text-left ${activeTab === 'schedules' ? 'active' : ''}`}
              >
                <Calendar size={20} />
                My Schedule
              </button>
            </li>
          </ul>
        </div>

        <div>
          <div className="border-t border-glass pt-4 flex flex-col gap-2">
            <div className="px-3 py-2 text-xs text-muted flex flex-col">
              <span className="font-semibold text-white">{employerName}</span>
              <span>@{currentUser}</span>
            </div>
            <button onClick={onLogout} className="btn btn-secondary w-full">
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        
        {/* --- MY PIPELINE TAB --- */}
        {activeTab === 'pipeline' && (
          <>
            <div className="page-header">
              <h1 className="page-title">My Sales Pipeline</h1>
              
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
                  <Plus size={16} /> Add Lead
                </button>
                <button 
                  onClick={handleDownloadCSV} 
                  className="btn btn-secondary py-2 text-sm"
                  disabled={myLeads.length === 0}
                >
                  <FileSpreadsheet size={16} /> CSV
                </button>
                <button 
                  onClick={handleDownloadJSON} 
                  className="btn btn-secondary py-2 text-sm"
                  disabled={myLeads.length === 0}
                >
                  <FileJson size={16} /> JSON
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="filter-bar">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-muted" />
                <input 
                  type="text" 
                  placeholder="Search business, owner..." 
                  className="input-field py-1.5 px-3 max-w-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted uppercase">Status:</span>
                <select 
                  className="input-field py-1 px-2 text-sm"
                  value={filterResponse}
                  onChange={(e) => setFilterResponse(e.target.value)}
                  style={{ width: '130px' }}
                >
                  <option value="all">All status</option>
                  <option value="none">No Response</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted uppercase">My Role:</span>
                <select 
                  className="input-field py-1 px-2 text-sm"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as any)}
                  style={{ width: '130px' }}
                >
                  <option value="all">Any Assigned</option>
                  <option value="caller">I am Caller</option>
                  <option value="engineer">I am Developer</option>
                </select>
              </div>
            </div>

            {/* Main Table - ALL FIELDS EDITABLE INLINE */}
            <div className="table-wrapper">
              <div className="table-container">
                <table className="custom-table" style={{ minWidth: '3200px' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '120px' }}>Business Name</th>
                      <th style={{ minWidth: '100px' }}>Field</th>
                      <th style={{ minWidth: '120px' }}>Owner Name</th>
                      <th style={{ minWidth: '120px' }}>Owner Contact</th>
                      <th style={{ minWidth: '120px' }}>Business Contact</th>
                      <th style={{ minWidth: '100px' }}>Country</th>
                      <th style={{ minWidth: '100px' }}>City</th>
                      <th style={{ minWidth: '150px' }}>Email</th>
                      <th style={{ minWidth: '100px' }}>Working Hours</th>
                      <th style={{ minWidth: '100px' }}>Manager</th>
                      <th style={{ minWidth: '100px' }}>Response</th>
                      <th style={{ minWidth: '90px' }}>Proposal</th>
                      <th style={{ minWidth: '90px' }}>Accepted</th>
                      <th style={{ minWidth: '100px' }}>Package</th>
                      <th style={{ minWidth: '100px' }}>Caller</th>
                      <th style={{ minWidth: '100px' }}>Dev 1</th>
                      <th style={{ minWidth: '100px' }}>Dev 2</th>
                      <th style={{ minWidth: '100px' }}>Dev 3</th>
                      <th style={{ minWidth: '90px' }}>Number Off?</th>
                      <th style={{ minWidth: '120px' }}>Domain</th>
                      <th style={{ minWidth: '120px' }}>Renewal Date</th>
                      <th style={{ minWidth: '120px' }}>Deployed Link</th>
                      <th style={{ minWidth: '120px' }}>Google Link</th>
                      <th style={{ minWidth: '250px' }}>Notes</th>
                      <th style={{ minWidth: '80px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMyLeads.map(lead => (
                      <tr key={lead.id}>
                        <td>
                          <input 
                            type="text"
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full font-bold"
                            value={lead.businessName}
                            onChange={(e) => handleInlineChange(lead, 'businessName', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          />
                        </td>
                        <td>
                          <input 
                            type="text"
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.field || ''}
                            onChange={(e) => handleInlineChange(lead, 'field', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          />
                        </td>
                        <td>
                          <input 
                            type="text"
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.ownerName || ''}
                            onChange={(e) => handleInlineChange(lead, 'ownerName', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          />
                        </td>
                        <td>
                          <input 
                            type="text"
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.ownerContact || ''}
                            onChange={(e) => handleInlineChange(lead, 'ownerContact', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          />
                        </td>
                        <td>
                          <input 
                            type="text"
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.businessContact || ''}
                            onChange={(e) => handleInlineChange(lead, 'businessContact', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          />
                        </td>
                        <td>
                          <input 
                            type="text"
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.country || ''}
                            onChange={(e) => handleInlineChange(lead, 'country', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          />
                        </td>
                        <td>
                          <input 
                            type="text"
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.city || ''}
                            onChange={(e) => handleInlineChange(lead, 'city', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          />
                        </td>
                        <td>
                          <input 
                            type="email"
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.email || ''}
                            onChange={(e) => handleInlineChange(lead, 'email', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          />
                        </td>
                        <td>
                          <input 
                            type="text"
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.workingHours || ''}
                            onChange={(e) => handleInlineChange(lead, 'workingHours', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          />
                        </td>
                        <td>
                          <input 
                            type="text"
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.managerName || ''}
                            onChange={(e) => handleInlineChange(lead, 'managerName', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          />
                        </td>
                        <td>
                          <select 
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.response}
                            onChange={(e) => handleInlineChange(lead, 'response', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)', color: lead.response === 'positive' ? '#d4af37' : lead.response === 'negative' ? '#ff7b00' : 'inherit' }}
                          >
                            <option value="none">None</option>
                            <option value="positive">Positive</option>
                            <option value="negative">Negative</option>
                          </select>
                        </td>
                        <td>
                          <select 
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.proposalSent}
                            onChange={(e) => handleInlineChange(lead, 'proposalSent', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </td>
                        <td>
                          <select 
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.proposalAccepted}
                            onChange={(e) => handleInlineChange(lead, 'proposalAccepted', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </td>
                        <td>
                          <select 
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.packageType}
                            onChange={(e) => handleInlineChange(lead, 'packageType', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          >
                            <option value="none">None</option>
                            <option value="one-time">One-time</option>
                            <option value="subscription">Subscription</option>
                          </select>
                        </td>
                        <td>
                          <span className="text-xs font-bold text-gold" style={{ color: '#d4af37' }}>
                            @{lead.caller || 'Unassigned'}
                          </span>
                        </td>
                        <td>
                          <select 
                            className="input-field py-0.5 px-1 text-xs bg-transparent w-full"
                            value={lead.engineer1}
                            onChange={(e) => handleInlineChange(lead, 'engineer1', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          >
                            <option value="">None</option>
                            {employers.map(emp => (
                              <option key={emp.username} value={emp.username}>@{emp.username}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select 
                            className="input-field py-0.5 px-1 text-xs bg-transparent w-full"
                            value={lead.engineer2}
                            onChange={(e) => handleInlineChange(lead, 'engineer2', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          >
                            <option value="">None</option>
                            {employers.map(emp => (
                              <option key={emp.username} value={emp.username}>@{emp.username}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select 
                            className="input-field py-0.5 px-1 text-xs bg-transparent w-full"
                            value={lead.engineer3}
                            onChange={(e) => handleInlineChange(lead, 'engineer3', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          >
                            <option value="">None</option>
                            {employers.map(emp => (
                              <option key={emp.username} value={emp.username}>@{emp.username}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select 
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.numberNotWorking}
                            onChange={(e) => handleInlineChange(lead, 'numberNotWorking', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)', color: lead.numberNotWorking === 'yes' ? '#e53e3e' : 'inherit' }}
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </td>
                        <td>
                          <input 
                            type="text"
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.domain || ''}
                            onChange={(e) => handleInlineChange(lead, 'domain', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          />
                        </td>
                        <td>
                          <input 
                            type="date"
                            className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                            value={lead.renewalDate || ''}
                            onChange={(e) => handleInlineChange(lead, 'renewalDate', e.target.value)}
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                          />
                        </td>
                        <td>
                          {lead.deployedLink ? (
                            <div className="flex items-center gap-1">
                              <input 
                                type="text"
                                className="input-field py-0.5 px-1.5 text-xs bg-transparent flex-1"
                                value={lead.deployedLink || ''}
                                onChange={(e) => handleInlineChange(lead, 'deployedLink', e.target.value)}
                                style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                              />
                              <a href={lead.deployedLink} target="_blank" rel="noreferrer" className="text-blue hover:text-blue-hover">
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          ) : (
                            <input 
                              type="text"
                              className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                              placeholder="Enter URL"
                              value={lead.deployedLink || ''}
                              onChange={(e) => handleInlineChange(lead, 'deployedLink', e.target.value)}
                              style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                            />
                          )}
                        </td>
                        <td>
                          {lead.googleLink ? (
                            <div className="flex items-center gap-1">
                              <input 
                                type="text"
                                className="input-field py-0.5 px-1.5 text-xs bg-transparent flex-1"
                                value={lead.googleLink || ''}
                                onChange={(e) => handleInlineChange(lead, 'googleLink', e.target.value)}
                                style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                              />
                              <a href={lead.googleLink} target="_blank" rel="noreferrer" className="text-blue hover:text-blue-hover">
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          ) : (
                            <input 
                              type="text"
                              className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full"
                              placeholder="Enter URL"
                              value={lead.googleLink || ''}
                              onChange={(e) => handleInlineChange(lead, 'googleLink', e.target.value)}
                              style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                            />
                          )}
                        </td>
                        <td>
                          <textarea 
                            className="input-field py-1 px-1.5 text-xs bg-transparent w-full resize-y"
                            rows={4}
                            value={lead.notes || ''}
                            onChange={(e) => handleInlineChange(lead, 'notes', e.target.value)}
                            style={{ 
                              border: 'none', 
                              background: 'rgba(255,255,255,0.05)', 
                              minHeight: '80px',
                              maxWidth: '250px',
                              overflow: 'auto'
                            }}
                            placeholder="Add notes here..."
                          />
                        </td>
                        <td>
                          <div className="flex items-center justify-center">
                            {saveStatus[lead.id] === 'saving' && (
                              <div className="text-xs text-muted animate-pulse">Saving...</div>
                            )}
                            {saveStatus[lead.id] === 'saved' && (
                              <div className="text-xs text-success flex items-center gap-1">
                                <Check size={14} /> Saved
                              </div>
                            )}
                            {saveStatus[lead.id] === 'error' && (
                              <div className="text-xs text-danger flex items-center gap-1" title={saveError[lead.id]}>
                                <AlertCircle size={14} /> Error
                              </div>
                            )}
                            {(saveStatus[lead.id] === 'idle' || !saveStatus[lead.id]) && (
                              <span className="text-[10px] text-muted">Auto-save</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMyLeads.length === 0 && (
                      <tr>
                        <td colSpan={25} className="text-center py-8 text-muted">
                          No assigned leads in your queue.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-xs text-muted mt-2 text-center">
              <span className="bg-gold/10 px-3 py-1 rounded-full border border-gold/20" style={{ borderColor: 'rgba(212, 175, 55, 0.2)' }}>
                💡 All fields auto-save when you type or select. Status indicator shows save progress.
              </span>
            </div>

            {/* Excel Import Section */}
            {renderExcelImport()}
          </>
        )}

        {/* --- COMMISSIONS TAB --- */}
        {activeTab === 'commissions' && (
          <>
            <div className="page-header">
              <h1 className="page-title">My Payout Commission Report</h1>
            </div>

            <div className="glass-card flex flex-col gap-6">
              <h3 className="text-gold font-bold text-lg border-b border-glass pb-2" style={{ color: '#d4af37' }}>
                Earnings Summary Table (in LKR)
              </h3>

              <div className="grid-3">
                <div className="bg-input p-4 rounded border border-glass">
                  <span className="text-xs text-muted block uppercase font-semibold">Caller Payout (5%)</span>
                  <span className="text-2xl font-bold text-blue" style={{ color: '#00b4d8' }}>LKR {commissionSummary.callerComm.toLocaleString()}</span>
                </div>
                <div className="bg-input p-4 rounded border border-glass">
                  <span className="text-xs text-muted block uppercase font-semibold">Developer Payout (15%)</span>
                  <span className="text-2xl font-bold text-orange" style={{ color: '#ff7b00' }}>LKR {commissionSummary.engComm.toLocaleString()}</span>
                </div>
                <div className="bg-gold-dim p-4 rounded border border-gold" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', borderColor: '#d4af37' }}>
                  <span className="text-xs text-gold block uppercase font-semibold" style={{ color: '#d4af37' }}>Total Due Commissions</span>
                  <span className="text-2xl font-bold text-gold" style={{ color: '#d4af37' }}>LKR {commissionSummary.totalComm.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="glass-card">
              <h3 className="mb-4 text-gold font-bold text-lg" style={{ color: '#d4af37' }}>Deals Ledger</h3>
              <div className="table-container">
                <table className="custom-table" style={{ minWidth: '1000px' }}>
                  <thead>
                    <tr>
                      <th>Business Name</th>
                      <th>Package Type</th>
                      <th>Your Commission Role</th>
                      <th>Commission Earned (LKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionSummary.details.map(item => (
                      <tr key={item.id}>
                        <td className="font-bold">{item.businessName}</td>
                        <td>
                          <span className="badge badge-neutral">{item.packageType}</span>
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>{item.roles}</span>
                        </td>
                        <td className="font-bold text-gold" style={{ color: '#d4af37' }}>LKR {item.commission.toLocaleString()}</td>
                      </tr>
                    ))}
                    {commissionSummary.details.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-muted">
                          No commissions calculated yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* --- SCHEDULES TAB --- */}
        {activeTab === 'schedules' && (
          <ScheduleManagement 
            employers={employers} 
            currentUser={currentUser} 
            isAdmin={false} 
          />
        )}

      </main>

      {/* MODALS */}
      {renderAddLeadModal()}
      {renderEditModal()}

    </div>
  );
};