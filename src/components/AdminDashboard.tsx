import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  TableProperties, 
  Users, 
  FilePlus2, 
  DollarSign, 
  LogOut, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  AlertCircle, 
  TrendingUp, 
  UploadCloud, 
  Calendar, 
  Globe,
  ExternalLink,
  UserCheck,
  Download,
  FileSpreadsheet,
  FileJson,
  BarChart3,
  LineChart,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Layers,
  FileText,
  Settings,
  PiggyBank,
  Building2,
  Briefcase,
  Car,
  Utensils,
  ShoppingBag,
  Zap,
  Target,
  TrendingDown,
  Activity,
  Shield,
  GraduationCap,
  Wrench,
  Eye
} from 'lucide-react';
import type { Lead, Employer } from '../services/dbService';
import type { ExchangeRate } from '../services/dbService';
import { CurrencySettings } from './CurrencySettings';
import { ExcelUploader } from './ExcelUploader';
import { ScheduleManagement } from './ScheduleManagement';
import type { Schedule } from '../types/schedule';
import { SUPPORTED_CURRENCIES } from '../types';

// ============================================
// TYPES
// ============================================

interface CustomTransaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  subCategory?: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  reference?: string;
  paymentMethod?: 'cash' | 'bank' | 'card' | 'online';
  status: 'pending' | 'completed' | 'cancelled';
  recurring?: { frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'; endDate?: string; };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface DeveloperCommission {
  username: string;
  fullName: string;
  totalCommission: number;
  paidCommission: number;
  outstandingCommission: number;
  deals: {
    projectName: string;
    amount: number;
    paidAmount: number;
    role: 'caller' | 'engineer' | 'both';
    percentage: number;
    commissionPaid: number;
    commissionOutstanding: number;
  }[];
}

interface EnhancedMonthlyFinance {
  month: string;
  year: number;
  revenue: number;
  expenses: number;
  commissions: number;
  profit: number;
  subscriptionRevenue: number;
  oneTimeRevenue: number;
  totalProjectValue: number;
  outstandingPayments: number;
  customIncome: number;
  customExpenses: number;
  customProfit: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
}

interface SalaryRecord {
  id: string;
  employerUsername: string;
  employerName: string;
  baseSalary: number;
  currency: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface DeveloperSalaryDetail {
  username: string;
  fullName: string;
  baseSalary: number;
  currency: string;
  commissions: number;
  paidCommissions: number;
  outstandingCommissions: number;
  totalEarned: number;
  totalPaid: number;
  outstanding: number;
  deals: {
    projectName: string;
    amount: number;
    commission: number;
    role: string;
    percentage: number;
    paidAmount: number;
    commissionPaid: number;
    commissionOutstanding: number;
  }[];
  salaryHistory: { month: string; amount: number; paid: boolean; }[];
}

interface AdminDashboardProps {
  leads: Lead[];
  employers: Employer[];
  schedules?: Schedule[];
  onUpdateLead: (lead: Lead) => Promise<void>;
  onAddLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDeleteLead: (id: string) => Promise<void>;
  onAddEmployer: (employer: Employer) => Promise<void>;
  onDeleteEmployer: (username: string) => Promise<void>;
  onLogout: () => void;
}

// ============================================
// EDITABLE AMOUNT FIELD
// ============================================

const EditableAmountField: React.FC<{
  value: number;
  onCommit: (value: string) => void;
  className?: string;
}> = ({ value, onCommit, className }) => {
  const [localValue, setLocalValue] = useState(value ? String(value) : '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value ? String(value) : '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onCommit(newVal), 800);
  };

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onCommit(localValue);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  leads,
  employers,
  schedules = [],
  onUpdateLead,
  onAddLead,
  onDeleteLead,
  onAddEmployer,
  onDeleteEmployer,
  onLogout
}) => {
  // ============================================
  // STATE
  // ============================================

  const [activeTab, setActiveTab] = useState<'dashboard' | 'pipeline' | 'employers' | 'add' | 'wealth' | 'schedules' | 'finance' | 'transactions' | 'developers'>('dashboard');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResponse, setFilterResponse] = useState<string>('all');
  const [filterProposalSent, setFilterProposalSent] = useState<string>('all');
  const [filterProposalAccepted, setFilterProposalAccepted] = useState<string>('all');
  const [filterPaid, setFilterPaid] = useState<string>('all');
  const [filterCaller, setFilterCaller] = useState<string>('all');

  const [selectedCurrency, setSelectedCurrency] = useState('LKR');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);

  const [transactions, setTransactions] = useState<CustomTransaction[]>(() => {
    const saved = localStorage.getItem('customTransactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CustomTransaction | null>(null);
  const [transactionFilter, setTransactionFilter] = useState({
    type: 'all' as 'all' | 'income' | 'expense',
    category: 'all',
    status: 'all' as 'all' | 'pending' | 'completed' | 'cancelled',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  });

  const [newTransaction, setNewTransaction] = useState<Omit<CustomTransaction, 'id' | 'createdAt' | 'updatedAt'>>({
    type: 'expense',
    category: '',
    subCategory: '',
    amount: 0,
    currency: 'LKR',
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    paymentMethod: 'cash',
    status: 'pending',
    recurring: undefined,
    tags: []
  });

  const [selectedEmployerId, setSelectedEmployerId] = useState<string>('');

  const [financeFilterMonth, setFinanceFilterMonth] = useState<string>('all');
  const [financeFilterYear, setFinanceFilterYear] = useState<string>(String(new Date().getFullYear()));
  const [financeFilterType, setFinanceFilterType] = useState<'all' | 'subscription' | 'one-time'>('all');
  const [financeFilterStatus, setFinanceFilterStatus] = useState<'all' | 'paid' | 'partial' | 'unpaid' | 'overdue'>('all');
  const [chartView, setChartView] = useState<'revenue' | 'profit' | 'cashflow' | 'comparison'>('revenue');

  const [salaries, setSalaries] = useState<SalaryRecord[]>(() => {
    const saved = localStorage.getItem('salaryRecords');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddSalary, setShowAddSalary] = useState(false);
  const [editingSalary, setEditingSalary] = useState<SalaryRecord | null>(null);
  const [newSalary, setNewSalary] = useState<Omit<SalaryRecord, 'id' | 'createdAt' | 'updatedAt'>>({
    employerUsername: '',
    employerName: '',
    baseSalary: 0,
    currency: 'LKR',
    startDate: new Date().toISOString().split('T')[0],
    isActive: true,
    notes: ''
  });

  const [importSelectedEmployer, setImportSelectedEmployer] = useState('');
  const [rawPastedData, setRawPastedData] = useState('');
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([]);
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
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
    caller: '',
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

  const [newEmpFullName, setNewEmpFullName] = useState('');
  const [newEmpUsername, setNewEmpUsername] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [empError, setEmpError] = useState('');
  const [empSuccess, setEmpSuccess] = useState('');

  const [exportLoading, setExportLoading] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<'monthly' | 'quarterly' | 'yearly' | 'all'>('monthly');

  // Detail Modal State
  const [selectedDetailType, setSelectedDetailType] = useState<'expenses' | 'profit' | 'revenue' | 'outstanding' | 'commissions' | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    localStorage.setItem('customTransactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('salaryRecords', JSON.stringify(salaries));
  }, [salaries]);

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const convertToLKR = (amount: number, currency: string): number => {
    if (currency === 'LKR') return amount;
    const rate = exchangeRates.find(r => r.currency === currency)?.rateToLKR || 1;
    return amount * rate;
  };

  const formatCurrency = (amount: number, currency: string): string => {
    const symbol = SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '$';
    const inLKR = convertToLKR(amount, currency);
    return `${symbol}${amount.toLocaleString()} (LKR ${inLKR.toLocaleString()})`;
  };

  // ============================================
  // DEVELOPER COMMISSIONS CALCULATION
  // ============================================

  const developerCommissions = useMemo((): DeveloperCommission[] => {
    const commissionMap = new Map<string, DeveloperCommission>();

    employers.forEach(emp => {
      commissionMap.set(emp.username, {
        username: emp.username,
        fullName: emp.fullName,
        totalCommission: 0,
        paidCommission: 0,
        outstandingCommission: 0,
        deals: []
      });
    });

    leads.forEach(lead => {
      if (lead.dealClosed !== 'yes' && lead.paidAmount === 0) return;

      const totalValue = convertToLKR(lead.totalProjectValue || lead.paidAmount || 0, lead.currency || 'USD');
      const paidAmount = convertToLKR(lead.paidAmount || 0, lead.currency || 'USD');
      
      if (totalValue === 0) return;

      const roles: { username: string; role: 'caller' | 'engineer' | 'both' }[] = [];

      if (lead.caller) roles.push({ username: lead.caller, role: 'caller' });
      if (lead.engineer1) roles.push({ username: lead.engineer1, role: 'engineer' });
      if (lead.engineer2) roles.push({ username: lead.engineer2, role: 'engineer' });
      if (lead.engineer3) roles.push({ username: lead.engineer3, role: 'engineer' });

      const engineerCountMap = new Map<string, number>();
      roles.forEach(r => {
        if (r.role === 'engineer') {
          engineerCountMap.set(r.username, (engineerCountMap.get(r.username) || 0) + 1);
        }
      });

      roles.forEach(role => {
        const emp = commissionMap.get(role.username);
        if (!emp) return;

        let commission = 0;
        let roleType: 'caller' | 'engineer' | 'both' = role.role;
        let percentage = 0;

        if (role.role === 'caller') {
          commission = totalValue * 0.05;
          percentage = 5;
        } else if (role.role === 'engineer') {
          const engCount = engineerCountMap.get(role.username) || 0;
          commission = totalValue * 0.15 * engCount;
          percentage = 15 * engCount;
        }

        const isBoth = roles.some(r => r.username === role.username && r.role === 'caller') && 
                       roles.some(r => r.username === role.username && r.role === 'engineer');
        if (isBoth) {
          const callerComm = totalValue * 0.05;
          const engCount = engineerCountMap.get(role.username) || 0;
          const engComm = totalValue * 0.15 * engCount;
          commission = callerComm + engComm;
          roleType = 'both';
          percentage = 5 + (15 * engCount);
        }

        if (commission > 0) {
          const paidRatio = Math.min(1, paidAmount / totalValue);
          const commissionPaid = commission * paidRatio;
          const commissionOutstanding = commission - commissionPaid;

          emp.totalCommission += commission;
          emp.paidCommission += commissionPaid;
          emp.outstandingCommission += commissionOutstanding;
          
          emp.deals.push({
            projectName: lead.businessName,
            amount: commission,
            paidAmount: paidAmount,
            role: roleType,
            percentage: percentage,
            commissionPaid: commissionPaid,
            commissionOutstanding: commissionOutstanding
          });
        }
      });
    });

    return Array.from(commissionMap.values());
  }, [leads, employers, exchangeRates]);

  // ============================================
  // DEVELOPER SALARY DETAILS
  // ============================================

  const developerSalaryDetails = useMemo((): DeveloperSalaryDetail[] => {
    return employers.map(emp => {
      const commissions = developerCommissions.find(d => d.username === emp.username);
      const salary = salaries.find(s => s.employerUsername === emp.username && s.isActive);
      
      const totalCommission = commissions?.totalCommission || 0;
      const paidCommission = commissions?.paidCommission || 0;
      const outstandingCommission = commissions?.outstandingCommission || 0;
      const baseSalary = salary ? convertToLKR(salary.baseSalary, salary.currency) : 0;
      
      const totalEarned = baseSalary + totalCommission;
      const totalPaid = baseSalary + paidCommission;
      const outstanding = totalEarned - totalPaid;

      const salaryHistory: { month: string; amount: number; paid: boolean }[] = [];
      const now = new Date();
      
      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        salaryHistory.push({
          month: monthKey,
          amount: baseSalary / 12,
          paid: false
        });
      }

      return {
        username: emp.username,
        fullName: emp.fullName,
        baseSalary: baseSalary,
        currency: salary?.currency || 'LKR',
        commissions: totalCommission,
        paidCommissions: paidCommission,
        outstandingCommissions: outstandingCommission,
        totalEarned: totalEarned,
        totalPaid: totalPaid,
        outstanding: outstanding,
        deals: commissions?.deals.map(d => ({
          projectName: d.projectName,
          amount: d.amount,
          commission: d.amount,
          role: d.role,
          percentage: d.percentage,
          paidAmount: d.paidAmount,
          commissionPaid: d.commissionPaid,
          commissionOutstanding: d.commissionOutstanding
        })) || [],
        salaryHistory
      };
    });
  }, [employers, developerCommissions, salaries, exchangeRates]);

  // ============================================
  // SALARY FUNCTIONS
  // ============================================

  const addSalary = (salary: Omit<SalaryRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRecord: SalaryRecord = {
      ...salary,
      id: `sal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSalaries(prev => [...prev, newRecord]);
  };

  const updateSalary = (id: string, updates: Partial<SalaryRecord>) => {
    setSalaries(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    ));
  };

  const deleteSalary = (id: string) => {
    setSalaries(prev => prev.filter(s => s.id !== id));
  };

  // ============================================
  // EXPENSE BREAKDOWN
  // ============================================

  const expenseBreakdown = useMemo(() => {
    const breakdown: {
      category: string;
      amount: number;
      details: { name: string; amount: number; date?: string; }[];
    }[] = [];

    // Development costs from leads
    const devCosts: { name: string; amount: number; date?: string; }[] = [];
    leads.filter(l => l.dealClosed === 'yes' || l.paidAmount > 0).forEach(l => {
      if (l.cost > 0) {
        devCosts.push({
          name: `${l.businessName} - Development Cost`,
          amount: convertToLKR(l.cost, l.currency || 'USD'),
          date: l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : undefined
        });
      }
    });

    if (devCosts.length > 0) {
      breakdown.push({
        category: 'Development Costs',
        amount: devCosts.reduce((sum, d) => sum + d.amount, 0),
        details: devCosts
      });
    }

    // Commissions
    const commDetails: { name: string; amount: number; date?: string; }[] = [];
    leads.filter(l => l.dealClosed === 'yes' || l.paidAmount > 0).forEach(l => {
      const amt = convertToLKR(l.paidAmount, l.currency || 'USD');
      let comm = 0;
      const roles: { [username: string]: string[] } = {};
      if (l.caller) roles[l.caller] = [...(roles[l.caller] || []), 'caller'];
      if (l.engineer1) roles[l.engineer1] = [...(roles[l.engineer1] || []), 'engineer'];
      if (l.engineer2) roles[l.engineer2] = [...(roles[l.engineer2] || []), 'engineer'];
      if (l.engineer3) roles[l.engineer3] = [...(roles[l.engineer3] || []), 'engineer'];
      
      Object.entries(roles).forEach(([uname, userRoles]) => {
        const isCaller = userRoles.includes('caller');
        const isEng = userRoles.includes('engineer');
        const engCount = userRoles.filter(r => r === 'engineer').length;
        
        if (isCaller && isEng) {
          comm += amt * 0.05 + (amt * 0.15 * engCount);
        } else if (isCaller) {
          comm += amt * 0.05;
        } else if (isEng) {
          comm += amt * 0.15 * engCount;
        }
      });
      
      if (comm > 0) {
        commDetails.push({
          name: `${l.businessName} - Commissions`,
          amount: comm,
          date: l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : undefined
        });
      }
    });

    if (commDetails.length > 0) {
      breakdown.push({
        category: 'Commissions',
        amount: commDetails.reduce((sum, d) => sum + d.amount, 0),
        details: commDetails
      });
    }

    // Custom expenses from transactions
    const customExpDetails = transactions
      .filter(t => t.type === 'expense' && t.status === 'completed')
      .map(t => ({
        name: t.description,
        amount: convertToLKR(t.amount, t.currency),
        date: t.date
      }));

    if (customExpDetails.length > 0) {
      const grouped = new Map<string, { name: string; amount: number; date?: string; }[]>();
      transactions.filter(t => t.type === 'expense' && t.status === 'completed').forEach(t => {
        const key = t.category || 'Uncategorized';
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push({
          name: t.description,
          amount: convertToLKR(t.amount, t.currency),
          date: t.date
        });
      });

      grouped.forEach((details, category) => {
        breakdown.push({
          category: `Custom: ${category}`,
          amount: details.reduce((sum, d) => sum + d.amount, 0),
          details
        });
      });
    }

    // Salaries
    const salaryDetails = salaries
      .filter(s => s.isActive)
      .map(s => ({
        name: `${s.employerName} - Salary`,
        amount: convertToLKR(s.baseSalary, s.currency)
      }));

    if (salaryDetails.length > 0) {
      breakdown.push({
        category: 'Salaries',
        amount: salaryDetails.reduce((sum, d) => sum + d.amount, 0),
        details: salaryDetails
      });
    }

    return breakdown;
  }, [leads, exchangeRates, transactions, salaries]);

  // ============================================
  // PROFIT BREAKDOWN
  // ============================================

  const profitBreakdown = useMemo(() => {
    const deals = leads.filter(l => l.dealClosed === 'yes' || l.paidAmount > 0);
    
    return deals.map(l => {
      const totalValue = convertToLKR(l.totalProjectValue || l.paidAmount, l.currency || 'USD');
      const paid = convertToLKR(l.paidAmount, l.currency || 'USD');
      const cost = convertToLKR(l.cost, l.currency || 'USD');
      
      let comm = 0;
      const roles: { [username: string]: string[] } = {};
      if (l.caller) roles[l.caller] = [...(roles[l.caller] || []), 'caller'];
      if (l.engineer1) roles[l.engineer1] = [...(roles[l.engineer1] || []), 'engineer'];
      if (l.engineer2) roles[l.engineer2] = [...(roles[l.engineer2] || []), 'engineer'];
      if (l.engineer3) roles[l.engineer3] = [...(roles[l.engineer3] || []), 'engineer'];
      
      Object.entries(roles).forEach(([uname, userRoles]) => {
        const isCaller = userRoles.includes('caller');
        const isEng = userRoles.includes('engineer');
        const engCount = userRoles.filter(r => r === 'engineer').length;
        
        if (isCaller && isEng) {
          comm += paid * 0.05 + (paid * 0.15 * engCount);
        } else if (isCaller) {
          comm += paid * 0.05;
        } else if (isEng) {
          comm += paid * 0.15 * engCount;
        }
      });
      
      return {
        businessName: l.businessName,
        totalValue,
        paid,
        cost,
        commissions: comm,
        cashProfit: paid - cost - comm,
        projectProfit: totalValue - cost - comm,
        outstanding: totalValue - paid
      };
    });
  }, [leads, exchangeRates]);

  // ============================================
  // STATS CALCULATION - COMPLETE FIX
  // ============================================

  const stats = useMemo(() => {
    const total = leads.length;
    const positive = leads.filter(l => l.response === 'positive').length;
    const negative = leads.filter(l => l.response === 'negative').length;
    const withResponse = positive + negative;
    const positiveRate = withResponse > 0 ? ((positive / withResponse) * 100).toFixed(1) : '0.0';
    
    const extendedLeads = leads.map(l => ({
      ...l,
      totalProjectValue: (l as Lead).totalProjectValue || l.paidAmount,
      paidToDate: (l as Lead).paidToDate || l.paidAmount,
      paymentSchedule: (l as Lead).paymentSchedule || 'one-time',
      subscriptionStartDate: (l as Lead).subscriptionStartDate || '',
      paymentStatus: (l as Lead).paymentStatus || 'paid',
      cost: (l as Lead).cost || 0
    }));

    // ALL leads with deal closed OR with paid amount
    const allDeals = extendedLeads.filter(l => l.dealClosed === 'yes' || l.paidAmount > 0);
    
    // Total Project Value (ALL closed deals, full amount)
    const totalProjectValue = allDeals.reduce((sum, l) => {
      const val = convertToLKR(l.totalProjectValue || l.paidAmount, l.currency || 'USD');
      return sum + val;
    }, 0);

    // Total Paid To Date (ALL closed deals, what's been paid)
    const totalPaidToDate = allDeals.reduce((sum, l) => {
      const paid = convertToLKR(l.paidToDate || l.paidAmount, l.currency || 'USD');
      return sum + paid;
    }, 0);

    // Outstanding Balance (what's still owed)
    const outstandingBalance = totalProjectValue - totalPaidToDate;

    // Total Revenue = what's been PAID
    const totalRevenue = allDeals.reduce((sum, l) => {
      const amountInLKR = convertToLKR(l.paidAmount, l.currency || 'USD');
      return sum + amountInLKR;
    }, 0);
    
    // Total Base Costs (development costs from all closed deals)
    const totalBaseCosts = allDeals.reduce((sum, l) => {
      const costInLKR = convertToLKR(l.cost, l.currency || 'USD');
      return sum + costInLKR;
    }, 0);
    
    // Total Commissions (calculated on PAID amount)
    let totalCommissions = 0;
    allDeals.forEach(l => {
      const amt = convertToLKR(l.paidAmount, l.currency || 'USD');
      let dealComm = 0;
      
      const roles: { [username: string]: string[] } = {};
      if (l.caller) roles[l.caller] = [...(roles[l.caller] || []), 'caller'];
      if (l.engineer1) roles[l.engineer1] = [...(roles[l.engineer1] || []), 'engineer'];
      if (l.engineer2) roles[l.engineer2] = [...(roles[l.engineer2] || []), 'engineer'];
      if (l.engineer3) roles[l.engineer3] = [...(roles[l.engineer3] || []), 'engineer'];
      
      Object.entries(roles).forEach(([uname, userRoles]) => {
        const isCaller = userRoles.includes('caller');
        const isEng = userRoles.includes('engineer');
        const engCount = userRoles.filter(r => r === 'engineer').length;
        
        if (isCaller && isEng) {
          dealComm += amt * 0.05 + (amt * 0.15 * engCount);
        } else if (isCaller) {
          dealComm += amt * 0.05;
        } else if (isEng) {
          dealComm += amt * 0.15 * engCount;
        }
      });
      totalCommissions += dealComm;
    });

    // CASH Profit = what's been paid - costs - commissions
    const cashProfit = totalRevenue - totalBaseCosts - totalCommissions;

    // PROJECT Profit = total project value - total costs - total commissions (on full value)
    let totalProjectCommissions = 0;
    allDeals.forEach(l => {
      const totalVal = convertToLKR(l.totalProjectValue || l.paidAmount, l.currency || 'USD');
      let dealComm = 0;
      
      const roles: { [username: string]: string[] } = {};
      if (l.caller) roles[l.caller] = [...(roles[l.caller] || []), 'caller'];
      if (l.engineer1) roles[l.engineer1] = [...(roles[l.engineer1] || []), 'engineer'];
      if (l.engineer2) roles[l.engineer2] = [...(roles[l.engineer2] || []), 'engineer'];
      if (l.engineer3) roles[l.engineer3] = [...(roles[l.engineer3] || []), 'engineer'];
      
      Object.entries(roles).forEach(([uname, userRoles]) => {
        const isCaller = userRoles.includes('caller');
        const isEng = userRoles.includes('engineer');
        const engCount = userRoles.filter(r => r === 'engineer').length;
        
        if (isCaller && isEng) {
          dealComm += totalVal * 0.05 + (totalVal * 0.15 * engCount);
        } else if (isCaller) {
          dealComm += totalVal * 0.05;
        } else if (isEng) {
          dealComm += totalVal * 0.15 * engCount;
        }
      });
      totalProjectCommissions += dealComm;
    });

    const projectProfit = totalProjectValue - totalBaseCosts - totalProjectCommissions;
    const netProfit = cashProfit;

    // Subscription projects
    const subscriptionProjects = extendedLeads.filter(l => 
      l.packageType === 'subscription' && l.dealClosed === 'yes'
    );

    const monthlySubscriptionRevenue = subscriptionProjects.reduce((sum, l) => {
      const monthlyValue = convertToLKR((l.totalProjectValue || l.paidAmount) / 12, l.currency || 'USD');
      return sum + monthlyValue;
    }, 0);

    const totalPaidCount = allDeals.length;
    const conversionRate = total > 0 ? ((totalPaidCount / total) * 100).toFixed(1) : '0.0';

    // Custom transaction totals
    const customIncome = transactions.filter(t => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + convertToLKR(t.amount, t.currency), 0);
    const customExpenses = transactions.filter(t => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + convertToLKR(t.amount, t.currency), 0);
    const customNet = customIncome - customExpenses;

    // Total salary expenses
    const totalSalaries = salaries
      .filter(s => s.isActive)
      .reduce((sum, s) => sum + convertToLKR(s.baseSalary, s.currency), 0);

    // Total developer earnings
    const totalDeveloperEarnings = developerSalaryDetails.reduce((sum, d) => sum + d.totalEarned, 0);

    // Total expenses = base costs + commissions + custom expenses + salaries
    const totalExpenses = totalBaseCosts + totalCommissions + customExpenses + totalSalaries;

    return {
      total,
      positive,
      negative,
      positiveRate,
      totalPaidCount,
      conversionRate,
      totalRevenue,
      totalBaseCosts,
      totalCommissions,
      cashProfit,
      projectProfit,
      netProfit,
      totalProjectValue,
      totalPaidToDate,
      outstandingBalance,
      monthlySubscriptionRevenue,
      subscriptionProjects: subscriptionProjects.length,
      activeDeals: allDeals.length,
      customIncome,
      customExpenses,
      customNet,
      totalIncome: totalRevenue + customIncome,
      totalExpenses: totalExpenses,
      netCashFlow: cashProfit + customNet - totalSalaries,
      totalSalaries,
      totalDeveloperEarnings,
      totalDeveloperCount: employers.length,
      allDeals: allDeals.map(l => ({
        businessName: l.businessName,
        totalProjectValue: convertToLKR(l.totalProjectValue || l.paidAmount, l.currency || 'USD'),
        paidToDate: convertToLKR(l.paidToDate || l.paidAmount, l.currency || 'USD'),
        cost: convertToLKR(l.cost, l.currency || 'USD'),
        currency: l.currency,
        packageType: l.packageType
      }))
    };
  }, [leads, exchangeRates, transactions, salaries, developerSalaryDetails, employers]);

  // ============================================
  // MONTHLY FINANCE DATA - WITH EXPENSES FIXED
  // ============================================

  const monthlyFinanceData = useMemo(() => {
    const monthMap = new Map<string, EnhancedMonthlyFinance>();
    
    const now = new Date();
    for (let i = 60; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, {
        month: key,
        year: date.getFullYear(),
        revenue: 0,
        expenses: 0,
        commissions: 0,
        profit: 0,
        subscriptionRevenue: 0,
        oneTimeRevenue: 0,
        totalProjectValue: 0,
        outstandingPayments: 0,
        customIncome: 0,
        customExpenses: 0,
        customProfit: 0,
        totalIncome: 0,
        totalExpenses: 0,
        netCashFlow: 0
      });
    }

    leads.forEach(lead => {
      if (lead.paidAmount === 0 && lead.dealClosed !== 'yes') return;

      const extendedLead = lead as Lead;
      const amountInLKR = convertToLKR(lead.paidAmount || 0, lead.currency || 'USD');
      const costInLKR = convertToLKR(lead.cost || 0, lead.currency || 'USD');
      const totalValue = convertToLKR(extendedLead.totalProjectValue || lead.paidAmount || 0, lead.currency || 'USD');
      const paidToDate = convertToLKR(extendedLead.paidToDate || lead.paidAmount || 0, lead.currency || 'USD');

      let revenueDate;
      if (lead.createdAt) {
        revenueDate = new Date(lead.createdAt);
        if (isNaN(revenueDate.getTime())) revenueDate = new Date();
      } else {
        revenueDate = new Date();
      }
      
      const key = `${revenueDate.getFullYear()}-${String(revenueDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month: key,
          year: revenueDate.getFullYear(),
          revenue: 0,
          expenses: 0,
          commissions: 0,
          profit: 0,
          subscriptionRevenue: 0,
          oneTimeRevenue: 0,
          totalProjectValue: 0,
          outstandingPayments: 0,
          customIncome: 0,
          customExpenses: 0,
          customProfit: 0,
          totalIncome: 0,
          totalExpenses: 0,
          netCashFlow: 0
        });
      }
      
      const data = monthMap.get(key)!;
      
      data.revenue += amountInLKR;
      data.totalProjectValue += totalValue;
      data.expenses += costInLKR; // FIX: Expenses now include development costs
      
      if (lead.packageType === 'subscription') {
        data.subscriptionRevenue += amountInLKR;
      } else {
        data.oneTimeRevenue += amountInLKR;
      }
      
      let dealComm = 0;
      const roles: { [username: string]: string[] } = {};
      if (lead.caller) roles[lead.caller] = [...(roles[lead.caller] || []), 'caller'];
      if (lead.engineer1) roles[lead.engineer1] = [...(roles[lead.engineer1] || []), 'engineer'];
      if (lead.engineer2) roles[lead.engineer2] = [...(roles[lead.engineer2] || []), 'engineer'];
      if (lead.engineer3) roles[lead.engineer3] = [...(roles[lead.engineer3] || []), 'engineer'];
      
      Object.entries(roles).forEach(([uname, userRoles]) => {
        const isCaller = userRoles.includes('caller');
        const isEng = userRoles.includes('engineer');
        const engCount = userRoles.filter(r => r === 'engineer').length;
        
        if (isCaller && isEng) {
          dealComm += amountInLKR * 0.05 + (amountInLKR * 0.15 * engCount);
        } else if (isCaller) {
          dealComm += amountInLKR * 0.05;
        } else if (isEng) {
          dealComm += amountInLKR * 0.15 * engCount;
        }
      });
      
      data.commissions += dealComm;
      data.profit = data.revenue - data.expenses - data.commissions;
      
      if (paidToDate < totalValue) {
        data.outstandingPayments += (totalValue - paidToDate);
      }
    });

    transactions.forEach(transaction => {
      if (transaction.status === 'cancelled') return;
      
      const date = new Date(transaction.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthMap.has(key)) {
        const data = monthMap.get(key)!;
        const amountInLKR = convertToLKR(transaction.amount, transaction.currency);
        
        if (transaction.type === 'income') {
          data.customIncome += amountInLKR;
          data.totalIncome = data.revenue + data.customIncome;
        } else {
          data.customExpenses += amountInLKR;
          data.totalExpenses = data.expenses + data.commissions + data.customExpenses;
        }
        
        data.customProfit = data.customIncome - data.customExpenses;
        data.netCashFlow = data.profit + data.customProfit;
      }
    });

    return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [leads, exchangeRates, transactions]);

  // ============================================
  // TRANSACTION FUNCTIONS
  // ============================================

  const addTransaction = (transaction: Omit<CustomTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTrans: CustomTransaction = {
      ...transaction,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setTransactions(prev => [...prev, newTrans]);
  };

  const updateTransaction = (id: string, updates: Partial<CustomTransaction>) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    ));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // ============================================
  // FILTERED LEADS
  // ============================================

  const filteredLeads = useMemo(() => {
    const now = Date.now();
    const activeLeads = leads.filter(l => {
      if (l.response === 'negative') {
        const createdAt = l.createdAt || 0;
        if (now - createdAt > TWO_WEEKS_MS) {
          onDeleteLead(l.id);
          return false;
        }
      }
      return true;
    });

    return activeLeads.filter(l => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        l.businessName.toLowerCase().includes(query) ||
        l.ownerName.toLowerCase().includes(query) ||
        l.city.toLowerCase().includes(query) ||
        l.managerName.toLowerCase().includes(query) ||
        l.caller.toLowerCase().includes(query);

      const matchesResponse = filterResponse === 'all' || l.response === filterResponse;
      const matchesProposalSent = filterProposalSent === 'all' || l.proposalSent === filterProposalSent;
      const matchesProposalAccepted = filterProposalAccepted === 'all' || l.proposalAccepted === filterProposalAccepted;
      const matchesCaller = filterCaller === 'all' || l.caller === filterCaller;
      
      let matchesPaid = true;
      if (filterPaid === 'paid') {
        matchesPaid = l.paidAmount > 0 || l.dealClosed === 'yes';
      } else if (filterPaid === 'unpaid') {
        matchesPaid = l.paidAmount === 0 && l.dealClosed === 'no';
      }

      return matchesSearch && matchesResponse && matchesProposalSent && matchesProposalAccepted && matchesCaller && matchesPaid;
    });
  }, [leads, searchQuery, filterResponse, filterProposalSent, filterProposalAccepted, filterPaid, filterCaller, onDeleteLead]);

  // ============================================
  // EMPLOYER DETAILS
  // ============================================

  const employerDetails = useMemo(() => {
    if (!selectedEmployerId) return null;
    const emp = employers.find(e => e.username === selectedEmployerId);
    if (!emp) return null;

    const empLeads = leads.filter(l => 
      l.caller === selectedEmployerId ||
      l.engineer1 === selectedEmployerId ||
      l.engineer2 === selectedEmployerId ||
      l.engineer3 === selectedEmployerId
    );

    let callerComm = 0;
    let engComm = 0;

    empLeads.forEach(l => {
      if (l.paidAmount > 0 || l.dealClosed === 'yes') {
        const amt = convertToLKR(l.paidAmount, l.currency || 'USD');
        
        if (l.caller === selectedEmployerId) {
          callerComm += amt * 0.05;
        }
        
        let engSlots = 0;
        if (l.engineer1 === selectedEmployerId) engSlots++;
        if (l.engineer2 === selectedEmployerId) engSlots++;
        if (l.engineer3 === selectedEmployerId) engSlots++;
        
        engComm += amt * 0.15 * engSlots;
      }
    });

    const salary = salaries.find(s => s.employerUsername === selectedEmployerId && s.isActive);

    return {
      employer: emp,
      pipeline: empLeads,
      callerComm,
      engComm,
      totalComm: callerComm + engComm,
      totalAssigned: empLeads.length,
      closedDeals: empLeads.filter(l => l.paidAmount > 0 || l.dealClosed === 'yes').length,
      salary: salary
    };
  }, [selectedEmployerId, leads, employers, exchangeRates, salaries]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleParsePastedData = () => {
    if (!rawPastedData.trim()) {
      setImportFeedback({ type: 'error', message: 'Please paste some data first.' });
      return;
    }

    try {
      const rows = rawPastedData.trim().split(/\r?\n/);
      if (rows.length === 0) throw new Error('No rows found.');

      const firstRow = rows[0];
      const isTab = firstRow.includes('\t');
      const delimiter = isTab ? '\t' : ',';
      const headers = firstRow.split(delimiter).map(h => h.trim().toLowerCase());
      
      const parsed: any[] = [];

      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const columns = rows[i].split(delimiter).map(c => c.trim());
        
        const item: any = {
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
          notes: '',
          response: 'none',
          proposalSent: 'no',
          proposalAccepted: 'no',
          paidAmount: 0,
          dealClosed: 'no',
          packageType: 'none',
          cost: 0,
          caller: importSelectedEmployer,
          engineer1: '',
          engineer2: '',
          engineer3: '',
          numberNotWorking: 'no',
          deployedLink: '',
          domain: '',
          renewalDate: '',
          googleLink: '',
          followUp: '',
          currency: 'USD',
          totalProjectValue: 0,
          paidToDate: 0,
          paymentSchedule: 'one-time',
          subscriptionStartDate: '',
          lastPaymentDate: '',
          nextPaymentDate: '',
          paymentStatus: 'unpaid'
        };

        headers.forEach((header, idx) => {
          const val = columns[idx] || '';
          if (header.includes('business') && header.includes('name')) item.businessName = val;
          else if (header.includes('company') || header.includes('business name')) item.businessName = val;
          else if (header.includes('field') || header.includes('niche') || header.includes('industry')) item.field = val;
          else if (header.includes('owner') && header.includes('name')) item.ownerName = val;
          else if (header.includes('owner') && (header.includes('contact') || header.includes('phone'))) item.ownerContact = val;
          else if (header.includes('country')) item.country = val;
          else if (header.includes('city')) item.city = val;
          else if (header.includes('business') && (header.includes('contact') || header.includes('phone'))) item.businessContact = val;
          else if (header.includes('email') || header.includes('mail')) item.email = val;
          else if (header.includes('hours') || header.includes('working')) item.workingHours = val;
          else if (header.includes('manager')) item.managerName = val;
          else if (header.includes('notes') || header.includes('description')) item.notes = val;
          else if (header.includes('currency')) item.currency = val.toUpperCase() || 'USD';
          else if (header.includes('total') && header.includes('value')) item.totalProjectValue = Number(val) || 0;
          else if (header.includes('paid') && header.includes('date')) item.paidToDate = Number(val) || 0;
          else if (header.includes('payment') && header.includes('schedule')) item.paymentSchedule = val || 'one-time';
        });

        if (!item.businessName && columns[0]) {
          item.businessName = columns[0] || 'Unknown Business';
          item.field = columns[1] || '';
          item.ownerName = columns[2] || '';
          item.ownerContact = columns[3] || '';
          item.country = columns[4] || '';
          item.city = columns[5] || '';
          item.businessContact = columns[6] || '';
          item.email = columns[7] || '';
          item.workingHours = columns[8] || '';
          item.managerName = columns[9] || '';
          item.notes = columns[10] || '';
        }

        parsed.push(item);
      }

      setParsedImportRows(parsed);
      setImportFeedback({ type: 'success', message: `Parsed ${parsed.length} rows. Please review and import.` });
    } catch (e: any) {
      setImportFeedback({ type: 'error', message: `Parsing error: ${e.message}` });
    }
  };

  const handleConfirmImport = async () => {
    if (parsedImportRows.length === 0) return;
    try {
      for (const row of parsedImportRows) {
        await onAddLead({
          ...row,
          caller: importSelectedEmployer || row.caller,
          currency: row.currency || 'USD'
        });
      }
      setImportFeedback({ type: 'success', message: `Successfully imported ${parsedImportRows.length} leads!` });
      setRawPastedData('');
      setParsedImportRows([]);
    } catch (e: any) {
      setImportFeedback({ type: 'error', message: `Import failed: ${e.message}` });
    }
  };

  const handleRegisterEmployer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpError('');
    setEmpSuccess('');
    
    if (!newEmpFullName || !newEmpUsername || !newEmpPassword) {
      setEmpError('Please fill in all fields.');
      return;
    }
    
    const cleanUsername = newEmpUsername.toLowerCase().trim().replace(/\s+/g, '_');

    try {
      await onAddEmployer({
        fullName: newEmpFullName,
        username: cleanUsername,
        password: newEmpPassword
      });
      setEmpSuccess(`Employer ${newEmpFullName} (${cleanUsername}) registered successfully!`);
      setNewEmpFullName('');
      setNewEmpUsername('');
      setNewEmpPassword('');
    } catch (err: any) {
      setEmpError(err.message || 'Failed to register employer.');
    }
  };

  const handleOpenEdit = (lead: Lead) => {
    const extendedLead: Lead = {
      ...lead,
      totalProjectValue: (lead as Lead).totalProjectValue || lead.paidAmount,
      paidToDate: (lead as Lead).paidToDate || lead.paidAmount,
      paymentSchedule: (lead as Lead).paymentSchedule || 'one-time',
      subscriptionStartDate: (lead as Lead).subscriptionStartDate || '',
      lastPaymentDate: (lead as Lead).lastPaymentDate || '',
      nextPaymentDate: (lead as Lead).nextPaymentDate || '',
      paymentStatus: (lead as Lead).paymentStatus || 'paid'
    };
    setEditingLead(extendedLead);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLead) return;
    try {
      await onUpdateLead(editingLead as Lead);
      setIsEditModalOpen(false);
      setEditingLead(null);
    } catch (e: any) {
      alert(`Failed to save changes: ${e.message}`);
    }
  };

  const handleAddManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const leadToAdd = {
        ...newLeadForm,
        totalProjectValue: newLeadForm.totalProjectValue || newLeadForm.paidAmount,
        paidToDate: newLeadForm.paidToDate || newLeadForm.paidAmount
      };
      await onAddLead(leadToAdd as Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>);
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
        caller: '',
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

  const handleInlineChange = async (lead: Lead, field: string, value: any) => {
    const updated = { ...lead } as Lead;
    
    if (field === 'paidAmount' || field === 'cost') {
      (updated as any)[field] = Number(value) || 0;
    } else if (field === 'totalProjectValue' || field === 'paidToDate') {
      if (field === 'totalProjectValue') {
        updated.totalProjectValue = Number(value) || 0;
      } else if (field === 'paidToDate') {
        updated.paidToDate = Number(value) || 0;
      }
    } else {
      (updated as any)[field] = value;
    }
    
    if (field === 'paidAmount' && Number(value) > 0 && lead.paidAmount === 0) {
      updated.dealClosed = 'yes';
      if (!updated.totalProjectValue) {
        updated.totalProjectValue = Number(value);
      }
      if (!updated.paidToDate) {
        updated.paidToDate = Number(value);
      }
    }
    
    try {
      await onUpdateLead(updated);
    } catch (e: any) {
      console.error("Inline edit failed:", e);
    }
  };

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  const handleExportCSV = () => {
    if (filteredLeads.length === 0) return;
    const headers = ['Business Name', 'Field', 'Owner Name', 'Owner Contact', 'Country', 'City', 'Business Contact', 'Email', 'Working Hours', 'Manager Name', 'Response', 'Proposal Sent', 'Proposal Accepted', 'Paid Amount', 'Total Project Value', 'Paid To Date', 'Payment Schedule', 'Currency', 'Deal Closed', 'Package Type', 'Cost', 'Caller', 'Engineer 1', 'Engineer 2', 'Engineer 3', 'Number Not Working', 'Deployed Link', 'Domain', 'Renewal Date', 'Google Link', 'Notes', 'Follow Up'];
    const rows = filteredLeads.map(l => {
      const ext = l as Lead;
      return [
        `"${l.businessName.replace(/"/g, '""')}"`,
        `"${(l.field || '').replace(/"/g, '""')}"`,
        `"${(l.ownerName || '').replace(/"/g, '""')}"`,
        `"${(l.ownerContact || '').replace(/"/g, '""')}"`,
        `"${(l.country || '').replace(/"/g, '""')}"`,
        `"${(l.city || '').replace(/"/g, '""')}"`,
        `"${(l.businessContact || '').replace(/"/g, '""')}"`,
        `"${(l.email || '').replace(/"/g, '""')}"`,
        `"${(l.workingHours || '').replace(/"/g, '""')}"`,
        `"${(l.managerName || '').replace(/"/g, '""')}"`,
        `"${l.response}"`,
        `"${l.proposalSent}"`,
        `"${l.proposalAccepted}"`,
        l.paidAmount,
        ext.totalProjectValue || l.paidAmount,
        ext.paidToDate || l.paidAmount,
        `"${ext.paymentSchedule || 'one-time'}"`,
        `"${l.currency || 'USD'}"`,
        `"${l.dealClosed}"`,
        `"${l.packageType}"`,
        l.cost,
        `"${l.caller}"`,
        `"${l.engineer1}"`,
        `"${l.engineer2}"`,
        `"${l.engineer3}"`,
        `"${l.numberNotWorking}"`,
        `"${(l.deployedLink || '').replace(/"/g, '""')}"`,
        `"${(l.domain || '').replace(/"/g, '""')}"`,
        `"${l.renewalDate}"`,
        `"${(l.googleLink || '').replace(/"/g, '""')}"`,
        `"${(l.notes || '').replace(/"/g, '""')}"`,
        `"${(l.followUp || '').replace(/"/g, '""')}"`
      ];
    });
    const csv = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `pipeline_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportJSON = () => {
    if (filteredLeads.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLeads, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = `pipeline_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const generatePDF = async (period: 'monthly' | 'quarterly' | 'yearly' | 'all') => {
    setExportLoading(true);
    try {
      let dataToExport = [...monthlyFinanceData];
      const now = new Date();
      
      if (period === 'monthly') {
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        dataToExport = dataToExport.filter(d => d.month === monthKey);
      } else if (period === 'quarterly') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const startMonth = currentQuarter * 3;
        dataToExport = dataToExport.filter(d => {
          const date = new Date(d.year, parseInt(d.month.split('-')[1]) - 1);
          return date >= new Date(now.getFullYear(), startMonth, 1) &&
                 date <= new Date(now.getFullYear(), startMonth + 3, 0);
        });
      } else if (period === 'yearly') {
        dataToExport = dataToExport.filter(d => d.year === now.getFullYear());
      }

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background: #1a1a2e; color: #d4af37; padding: 12px; text-align: left; }
              td { padding: 10px; border-bottom: 1px solid #333; }
              .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .total { font-weight: bold; color: #d4af37; }
              .positive { color: #38a169; }
              .negative { color: #e53e3e; }
            </style>
          </head>
          <body>
            <h1>Financial Report - ${period.toUpperCase()}</h1>
            <div class="summary">
              <p>Total Revenue: LKR ${dataToExport.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}</p>
              <p>Total Expenses: LKR ${dataToExport.reduce((sum, d) => sum + (d.expenses + d.commissions), 0).toLocaleString()}</p>
              <p>Net Profit: LKR ${dataToExport.reduce((sum, d) => sum + d.profit, 0).toLocaleString()}</p>
              <p>Custom Income: LKR ${dataToExport.reduce((sum, d) => sum + d.customIncome, 0).toLocaleString()}</p>
              <p>Custom Expenses: LKR ${dataToExport.reduce((sum, d) => sum + d.customExpenses, 0).toLocaleString()}</p>
              <p>Net Cash Flow: LKR ${dataToExport.reduce((sum, d) => sum + d.netCashFlow, 0).toLocaleString()}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Revenue</th>
                  <th>Subscription</th>
                  <th>One-Time</th>
                  <th>Expenses</th>
                  <th>Commissions</th>
                  <th>Profit</th>
                  <th>Custom Income</th>
                  <th>Custom Expenses</th>
                  <th>Net Cash Flow</th>
                </tr>
              </thead>
              <tbody>
                ${dataToExport.map(d => `
                  <tr>
                    <td>${d.month}</td>
                    <td>LKR ${d.revenue.toLocaleString()}</td>
                    <td>LKR ${d.subscriptionRevenue.toLocaleString()}</td>
                    <td>LKR ${d.oneTimeRevenue.toLocaleString()}</td>
                    <td>LKR ${d.expenses.toLocaleString()}</td>
                    <td>LKR ${d.commissions.toLocaleString()}</td>
                    <td class="${d.profit >= 0 ? 'positive' : 'negative'}">LKR ${d.profit.toLocaleString()}</td>
                    <td>LKR ${d.customIncome.toLocaleString()}</td>
                    <td>LKR ${d.customExpenses.toLocaleString()}</td>
                    <td class="${d.netCashFlow >= 0 ? 'positive' : 'negative'}">LKR ${d.netCashFlow.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="font-weight: bold; border-top: 2px solid #d4af37;">
                  <td>TOTAL</td>
                  <td>LKR ${dataToExport.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}</td>
                  <td>LKR ${dataToExport.reduce((sum, d) => sum + d.subscriptionRevenue, 0).toLocaleString()}</td>
                  <td>LKR ${dataToExport.reduce((sum, d) => sum + d.oneTimeRevenue, 0).toLocaleString()}</td>
                  <td>LKR ${dataToExport.reduce((sum, d) => sum + d.expenses, 0).toLocaleString()}</td>
                  <td>LKR ${dataToExport.reduce((sum, d) => sum + d.commissions, 0).toLocaleString()}</td>
                  <td>LKR ${dataToExport.reduce((sum, d) => sum + d.profit, 0).toLocaleString()}</td>
                  <td>LKR ${dataToExport.reduce((sum, d) => sum + d.customIncome, 0).toLocaleString()}</td>
                  <td>LKR ${dataToExport.reduce((sum, d) => sum + d.customExpenses, 0).toLocaleString()}</td>
                  <td>LKR ${dataToExport.reduce((sum, d) => sum + d.netCashFlow, 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank', 'width=1200,height=800');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // ============================================
  // FILTERED TRANSACTIONS
  // ============================================

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesType = transactionFilter.type === 'all' || t.type === transactionFilter.type;
      const matchesCategory = transactionFilter.category === 'all' || t.category === transactionFilter.category;
      const matchesStatus = transactionFilter.status === 'all' || t.status === transactionFilter.status;
      
      const matchesDateFrom = !transactionFilter.dateFrom || t.date >= transactionFilter.dateFrom;
      const matchesDateTo = !transactionFilter.dateTo || t.date <= transactionFilter.dateTo;
      
      const amountInLKR = convertToLKR(t.amount, t.currency);
      const matchesMinAmount = !transactionFilter.minAmount || amountInLKR >= Number(transactionFilter.minAmount);
      const matchesMaxAmount = !transactionFilter.maxAmount || amountInLKR <= Number(transactionFilter.maxAmount);
      
      return matchesType && matchesCategory && matchesStatus && 
             matchesDateFrom && matchesDateTo && 
             matchesMinAmount && matchesMaxAmount;
    });
  }, [transactions, transactionFilter, exchangeRates]);

  // ============================================
  // CATEGORIES
  // ============================================

  const incomeCategories = [
    'Sales Revenue', 'Service Income', 'Consulting', 'Subscription Revenue',
    'Interest Income', 'Investment Income', 'Rental Income', 'Other Income'
  ];

  const expenseCategories = [
    'Office Rent', 'Utilities', 'Salaries', 'Marketing', 'Software Licenses',
    'Hardware', 'Travel', 'Meals', 'Office Supplies', 'Internet', 'Phone',
    'Insurance', 'Taxes', 'Legal Fees', 'Training', 'Events', 'Maintenance',
    'Other Expenses'
  ];

  // ============================================
  // DETAIL MODAL RENDER
  // ============================================

  const renderDetailModal = () => {
    if (!showDetailModal || !selectedDetailType) return null;

    let title = '';
    let content: React.ReactNode = null;

    switch (selectedDetailType) {
      case 'expenses':
        title = 'Expense Breakdown';
        content = (
          <div>
            {expenseBreakdown.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No expenses recorded</p>
            ) : (
              expenseBreakdown.map((category, idx) => (
                <div key={idx} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontWeight: '600' }}>{category.category}</span>
                    <span style={{ color: '#ff7b00', fontWeight: 'bold' }}>LKR {category.amount.toLocaleString()}</span>
                  </div>
                  {category.details.map((detail, didx) => (
                    <div key={didx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 1rem', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{detail.name}</span>
                      <span>LKR {detail.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ))
            )}
            <div style={{ padding: '1rem', background: 'rgba(255, 123, 0, 0.1)', borderRadius: 'var(--radius-md)', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Total Expenses</span>
                <span style={{ color: '#ff7b00' }}>LKR {stats.totalExpenses.toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
        break;

      case 'profit':
        title = 'Profit Breakdown by Deal';
        content = (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Cash Profit</div>
                <div style={{ fontWeight: 'bold', color: stats.cashProfit >= 0 ? '#38a169' : '#e53e3e' }}>LKR {stats.cashProfit.toLocaleString()}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Project Profit</div>
                <div style={{ fontWeight: 'bold', color: stats.projectProfit >= 0 ? '#38a169' : '#e53e3e' }}>LKR {stats.projectProfit.toLocaleString()}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total Revenue</div>
                <div style={{ fontWeight: 'bold', color: '#00b4d8' }}>LKR {stats.totalRevenue.toLocaleString()}</div>
              </div>
            </div>
            
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th style={{ textAlign: 'right' }}>Total Value</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Cost</th>
                    <th style={{ textAlign: 'right' }}>Commissions</th>
                    <th style={{ textAlign: 'right' }}>Cash Profit</th>
                    <th style={{ textAlign: 'right' }}>Project Profit</th>
                    <th style={{ textAlign: 'right' }}>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {profitBreakdown.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600' }}>{p.businessName}</td>
                      <td style={{ textAlign: 'right', color: '#00b4d8' }}>LKR {p.totalValue.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: '#d4af37' }}>LKR {p.paid.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: '#ff7b00' }}>LKR {p.cost.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: '#e83e8c' }}>LKR {p.commissions.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: p.cashProfit >= 0 ? '#38a169' : '#e53e3e' }}>
                        LKR {p.cashProfit.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: p.projectProfit >= 0 ? '#38a169' : '#e53e3e' }}>
                        LKR {p.projectProfit.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', color: '#ff7b00' }}>LKR {p.outstanding.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
        break;

      case 'outstanding':
        title = 'Outstanding Balance Details';
        content = (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total Project Value</div>
                <div style={{ fontWeight: 'bold', color: '#00b4d8' }}>LKR {stats.totalProjectValue.toLocaleString()}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Paid To Date</div>
                <div style={{ fontWeight: 'bold', color: '#d4af37' }}>LKR {stats.totalPaidToDate.toLocaleString()}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'rgba(255, 123, 0, 0.1)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid rgba(255, 123, 0, 0.2)' }}>
                <div style={{ fontSize: '0.65rem', color: '#ff7b00' }}>Outstanding Balance</div>
                <div style={{ fontWeight: 'bold', color: '#ff7b00' }}>LKR {stats.outstandingBalance.toLocaleString()}</div>
              </div>
            </div>
            
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th style={{ textAlign: 'right' }}>Total Value</th>
                    <th style={{ textAlign: 'right' }}>Paid To Date</th>
                    <th style={{ textAlign: 'right' }}>Outstanding</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {profitBreakdown.filter(p => p.outstanding > 0).map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600' }}>{p.businessName}</td>
                      <td style={{ textAlign: 'right', color: '#00b4d8' }}>LKR {p.totalValue.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: '#d4af37' }}>LKR {p.paid.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#ff7b00' }}>LKR {p.outstanding.toLocaleString()}</td>
                      <td>
                        <span style={{ 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '999px', 
                          fontSize: '0.6rem',
                          fontWeight: '600',
                          background: p.outstanding > p.totalValue * 0.5 ? 'rgba(229, 62, 62, 0.2)' : 'rgba(255, 123, 0, 0.2)',
                          color: p.outstanding > p.totalValue * 0.5 ? '#e53e3e' : '#ff7b00'
                        }}>
                          {p.outstanding > p.totalValue * 0.5 ? 'High Risk' : 'Partial'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {profitBreakdown.filter(p => p.outstanding > 0).length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No outstanding balances</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
        break;

      case 'revenue':
        title = 'Revenue Breakdown';
        content = (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total Revenue</div>
                <div style={{ fontWeight: 'bold', color: '#00b4d8' }}>LKR {stats.totalRevenue.toLocaleString()}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Custom Income</div>
                <div style={{ fontWeight: 'bold', color: '#d4af37' }}>LKR {stats.customIncome.toLocaleString()}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Subscription Revenue</div>
                <div style={{ fontWeight: 'bold', color: '#9b59b6' }}>LKR {stats.monthlySubscriptionRevenue.toLocaleString()}</div>
              </div>
            </div>
            
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th style={{ textAlign: 'right' }}>Total Value</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Outstanding</th>
                    <th>Package</th>
                  </tr>
                </thead>
                <tbody>
                  {profitBreakdown.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600' }}>{p.businessName}</td>
                      <td style={{ textAlign: 'right', color: '#00b4d8' }}>LKR {p.totalValue.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: '#d4af37' }}>LKR {p.paid.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: '#ff7b00' }}>LKR {p.outstanding.toLocaleString()}</td>
                      <td>
                        <span className="badge badge-neutral">
                          {leads.find(l => l.businessName === p.businessName)?.packageType || 'one-time'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
        break;

      case 'commissions':
        title = 'Commission Breakdown';
        content = (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total Commissions</div>
                <div style={{ fontWeight: 'bold', color: '#e83e8c' }}>LKR {stats.totalCommissions.toLocaleString()}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total Developers</div>
                <div style={{ fontWeight: 'bold', color: '#00b4d8' }}>{developerSalaryDetails.length}</div>
              </div>
            </div>
            
            {developerSalaryDetails.map((dev, idx) => (
              dev.commissions > 0 && (
                <div key={idx} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontWeight: '600' }}>@{dev.username} - {dev.fullName}</span>
                    <span style={{ color: '#e83e8c', fontWeight: 'bold' }}>LKR {dev.commissions.toLocaleString()}</span>
                  </div>
                  {dev.deals.map((deal, didx) => (
                    <div key={didx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 1rem', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{deal.projectName} ({deal.role})</span>
                      <span>LKR {deal.commission.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )
            ))}
          </div>
        );
        break;
    }

    return (
      <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
        <div className="modal-content glass-panel" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center border-b border-glass pb-4 mb-6">
            <h2 className="text-xl font-bold text-gold" style={{ color: '#d4af37' }}>{title}</h2>
            <button className="text-muted hover:text-white" onClick={() => setShowDetailModal(false)}>
              <X size={24} />
            </button>
          </div>
          {content}
          <div className="flex justify-end mt-6 border-t border-glass pt-4">
            <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // FINANCE DASHBOARD RENDER
  // ============================================

  const renderFinanceDashboard = () => {
    const filteredData = monthlyFinanceData.filter(d => {
      if (financeFilterYear !== 'all' && String(d.year) !== financeFilterYear) return false;
      if (financeFilterMonth !== 'all' && d.month !== financeFilterMonth) return false;
      return true;
    });

    const totals = filteredData.reduce((acc, curr) => ({
      revenue: acc.revenue + curr.revenue,
      expenses: acc.expenses + curr.expenses,
      commissions: acc.commissions + curr.commissions,
      profit: acc.profit + curr.profit,
      subscriptionRevenue: acc.subscriptionRevenue + curr.subscriptionRevenue,
      oneTimeRevenue: acc.oneTimeRevenue + curr.oneTimeRevenue,
      totalProjectValue: acc.totalProjectValue + curr.totalProjectValue,
      outstandingPayments: acc.outstandingPayments + curr.outstandingPayments,
      customIncome: acc.customIncome + curr.customIncome,
      customExpenses: acc.customExpenses + curr.customExpenses,
      customProfit: acc.customProfit + curr.customProfit,
      totalIncome: acc.totalIncome + curr.totalIncome,
      totalExpenses: acc.totalExpenses + curr.totalExpenses,
      netCashFlow: acc.netCashFlow + curr.netCashFlow
    }), { 
      revenue: 0, expenses: 0, commissions: 0, profit: 0, 
      subscriptionRevenue: 0, oneTimeRevenue: 0, totalProjectValue: 0, outstandingPayments: 0,
      customIncome: 0, customExpenses: 0, customProfit: 0, totalIncome: 0, totalExpenses: 0, netCashFlow: 0
    });

    const chartData = filteredData.slice(-12).map(d => ({
      month: d.month,
      revenue: d.revenue,
      profit: d.profit,
      subscription: d.subscriptionRevenue,
      customIncome: d.customIncome,
      customExpenses: d.customExpenses,
      netCashFlow: d.netCashFlow
    }));

    const hasData = chartData.length > 0 && totals.revenue > 0;

    return (
      <div className="finance-dashboard space-y-6">
        <div className="page-header">
          <h1 className="page-title">Finance Dashboard</h1>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => generatePDF(exportPeriod)} disabled={exportLoading}>
              <FileText size={16} /> {exportLoading ? 'Generating...' : 'Export PDF'}
            </button>
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              <FileSpreadsheet size={16} /> Export CSV
            </button>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="input-group">
              <label className="input-label text-sm">Year</label>
              <select className="input-field" value={financeFilterYear} onChange={(e) => setFinanceFilterYear(e.target.value)}>
                <option value="all">All Years</option>
                {[...new Set(monthlyFinanceData.map(d => d.year))].sort().map(year => (
                  <option key={year} value={String(year)}>{year}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label text-sm">Month</label>
              <select className="input-field" value={financeFilterMonth} onChange={(e) => setFinanceFilterMonth(e.target.value)}>
                <option value="all">All Months</option>
                {[...new Set(monthlyFinanceData.map(d => d.month))].sort().map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label text-sm">Revenue Type</label>
              <select className="input-field" value={financeFilterType} onChange={(e) => setFinanceFilterType(e.target.value as any)}>
                <option value="all">All Types</option>
                <option value="subscription">Subscription</option>
                <option value="one-time">One-Time</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label text-sm">Payment Status</label>
              <select className="input-field" value={financeFilterStatus} onChange={(e) => setFinanceFilterStatus(e.target.value as any)}>
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label text-sm">Export Period</label>
              <select className="input-field" value={exportPeriod} onChange={(e) => setExportPeriod(e.target.value as any)}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Total Revenue</p>
                <p className="text-2xl font-bold text-blue" style={{ color: '#00b4d8' }}>LKR {totals.revenue.toLocaleString()}</p>
                <p className="text-xs text-muted mt-1">+ Custom Income: LKR {totals.customIncome.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-blue/10"><TrendingUp size={24} style={{ color: '#00b4d8' }} /></div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Total Expenses</p>
                <p className="text-2xl font-bold text-orange" style={{ color: '#ff7b00' }}>LKR {totals.expenses.toLocaleString()}</p>
                <p className="text-xs text-muted mt-1">+ Custom Expenses: LKR {totals.customExpenses.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-orange/10"><TrendingDown size={24} style={{ color: '#ff7b00' }} /></div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Net Profit</p>
                <p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-success' : 'text-danger'}`}>LKR {totals.profit.toLocaleString()}</p>
                <p className="text-xs text-muted mt-1">Margin: {totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : 0}%</p>
              </div>
              <div className="p-3 rounded-full bg-gold/10"><Wallet size={24} style={{ color: '#d4af37' }} /></div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Net Cash Flow</p>
                <p className={`text-2xl font-bold ${totals.netCashFlow >= 0 ? 'text-success' : 'text-danger'}`}>LKR {totals.netCashFlow.toLocaleString()}</p>
                <p className="text-xs text-muted mt-1">Subscription: LKR {totals.subscriptionRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-purple/10"><Activity size={24} style={{ color: '#9b59b6' }} /></div>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex flex-wrap gap-2">
            <button className={`btn ${chartView === 'revenue' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setChartView('revenue')}><BarChart3 size={16} /> Revenue Chart</button>
            <button className={`btn ${chartView === 'profit' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setChartView('profit')}><LineChart size={16} /> Profit Trend</button>
            <button className={`btn ${chartView === 'cashflow' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setChartView('cashflow')}><Activity size={16} /> Cash Flow</button>
            <button className={`btn ${chartView === 'comparison' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setChartView('comparison')}><Wallet size={16} /> Comparison</button>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-gold font-bold text-lg mb-4" style={{ color: '#d4af37' }}>
            {chartView === 'revenue' && 'Revenue Trend'}
            {chartView === 'profit' && 'Profit Trend'}
            {chartView === 'cashflow' && 'Cash Flow Trend'}
            {chartView === 'comparison' && 'Revenue Composition'}
          </h3>
          
          <div className="h-80">
            {!hasData ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted">
                  <BarChart3 size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No financial data available</p>
                  <p className="text-sm mt-2">Add leads with payments or create custom transactions to see charts</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full relative">
                <svg className="w-full h-full" viewBox="0 0 900 350" preserveAspectRatio="none">
                  {[0, 1, 2, 3, 4].map(i => {
                    const y = i * 70 + 30;
                    return <line key={i} x1="20" y1={y} x2="880" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />;
                  })}
                  
                  {(() => {
                    const maxVal = Math.max(...chartData.map(d => d.revenue + d.customIncome), 1);
                    const points = chartData.map((d, i) => {
                      const x = 30 + (i / (chartData.length - 1 || 1)) * 840;
                      const y = 320 - ((d.revenue + d.customIncome) / maxVal) * 280;
                      return { x, y, value: d.revenue + d.customIncome, month: d.month };
                    });
                    
                    let areaD = `M ${points[0].x},320 `;
                    points.forEach(p => areaD += `L ${p.x},${p.y} `);
                    areaD += `L ${points[points.length-1].x},320 Z`;
                    
                    let lineD = `M ${points[0].x},${points[0].y}`;
                    for (let i = 0; i < points.length - 1; i++) {
                      const p0 = points[i], p1 = points[i + 1];
                      const cpX = (p0.x + p1.x) / 2;
                      lineD += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
                    }
                    
                    return (
                      <>
                        <path d={areaD} fill="url(#revenueGradient)" opacity="0.3" />
                        <path d={lineD} stroke="#d4af37" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        {points.map((p, i) => {
                          const isHighest = p.value === Math.max(...points.map(pt => pt.value));
                          return (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r={isHighest ? "8" : "5"} fill={isHighest ? "#f3cf59" : "#d4af37"} stroke="#fff" strokeWidth="2">
                                {isHighest && <animate attributeName="r" from="8" to="12" dur="1.5s" repeatCount="indefinite" />}
                              </circle>
                              <text x={p.x} y={p.y - 15} textAnchor="middle" fill="#a0aec0" fontSize="11" fontWeight="600">{p.value >= 1000 ? `${(p.value/1000).toFixed(1)}k` : p.value}</text>
                              <text x={p.x} y="340" textAnchor="middle" fill="#718096" fontSize="11">{p.month.slice(5)}</text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d4af37" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gold font-bold text-lg" style={{ color: '#d4af37' }}>Monthly Financial Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-glass">
                  <th className="text-left py-3 px-4 text-xs uppercase text-muted">Month</th>
                  <th className="text-right py-3 px-4 text-xs uppercase text-muted">Revenue</th>
                  <th className="text-right py-3 px-4 text-xs uppercase text-muted">Subscription</th>
                  <th className="text-right py-3 px-4 text-xs uppercase text-muted">Custom Income</th>
                  <th className="text-right py-3 px-4 text-xs uppercase text-muted">Expenses</th>
                  <th className="text-right py-3 px-4 text-xs uppercase text-muted">Commissions</th>
                  <th className="text-right py-3 px-4 text-xs uppercase text-muted">Custom Expenses</th>
                  <th className="text-right py-3 px-4 text-xs uppercase text-muted">Profit</th>
                  <th className="text-right py-3 px-4 text-xs uppercase text-muted">Cash Flow</th>
                  <th className="text-center py-3 px-4 text-xs uppercase text-muted">Margin</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(-12).map((data, index) => {
                  const margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
                  return (
                    <tr key={index} className="border-b border-glass/50 hover:bg-glass/20 transition-colors">
                      <td className="py-3 px-4 font-medium">{data.month}</td>
                      <td className="py-3 px-4 text-right text-blue" style={{ color: '#00b4d8' }}>LKR {data.revenue.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-gold" style={{ color: '#d4af37' }}>LKR {data.subscriptionRevenue.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-success" style={{ color: '#38a169' }}>LKR {data.customIncome.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-orange" style={{ color: '#ff7b00' }}>LKR {data.expenses.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-pink" style={{ color: '#e83e8c' }}>LKR {data.commissions.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-danger" style={{ color: '#e53e3e' }}>LKR {data.customExpenses.toLocaleString()}</td>
                      <td className={`py-3 px-4 text-right font-bold ${data.profit >= 0 ? 'text-success' : 'text-danger'}`}>LKR {data.profit.toLocaleString()}</td>
                      <td className={`py-3 px-4 text-right font-bold ${data.netCashFlow >= 0 ? 'text-success' : 'text-danger'}`}>LKR {data.netCashFlow.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${margin >= 20 ? 'bg-success/20 text-success' : margin >= 0 ? 'bg-gold/20 text-gold' : 'bg-danger/20 text-danger'}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredData.length === 0 && (
                  <tr><td colSpan={10} className="py-8 text-center text-muted">No financial data available for the selected filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // TRANSACTIONS TAB RENDER
  // ============================================

  const renderTransactionsTab = () => {
    const categories = transactions.length > 0 ? [...new Set(transactions.map(t => t.category))] : [];

    const totalIncome = filteredTransactions.filter(t => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + convertToLKR(t.amount, t.currency), 0);
    const totalExpenses = filteredTransactions.filter(t => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + convertToLKR(t.amount, t.currency), 0);
    const netBalance = totalIncome - totalExpenses;

    return (
      <div className="transactions-tab space-y-6">
        <div className="page-header">
          <h1 className="page-title">Custom Income & Expenses</h1>
          <button className="btn btn-primary" onClick={() => setShowAddTransaction(true)}><Plus size={16} /> Add Transaction</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted">Total Income</p><p className="text-2xl font-bold text-success" style={{ color: '#38a169' }}>LKR {totalIncome.toLocaleString()}</p></div>
              <div className="p-3 rounded-full bg-success/10"><ArrowUpRight size={24} style={{ color: '#38a169' }} /></div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted">Total Expenses</p><p className="text-2xl font-bold text-danger" style={{ color: '#e53e3e' }}>LKR {totalExpenses.toLocaleString()}</p></div>
              <div className="p-3 rounded-full bg-danger/10"><ArrowDownRight size={24} style={{ color: '#e53e3e' }} /></div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted">Net Balance</p><p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-gold' : 'text-danger'}`} style={{ color: netBalance >= 0 ? '#d4af37' : '#e53e3e' }}>LKR {netBalance.toLocaleString()}</p></div>
              <div className="p-3 rounded-full bg-gold/10"><Wallet size={24} style={{ color: '#d4af37' }} /></div>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="input-group"><label className="input-label text-sm">Type</label><select className="input-field" value={transactionFilter.type} onChange={(e) => setTransactionFilter({ ...transactionFilter, type: e.target.value as any })}><option value="all">All Types</option><option value="income">Income</option><option value="expense">Expense</option></select></div>
            <div className="input-group"><label className="input-label text-sm">Category</label><select className="input-field" value={transactionFilter.category} onChange={(e) => setTransactionFilter({ ...transactionFilter, category: e.target.value })}><option value="all">All Categories</option>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
            <div className="input-group"><label className="input-label text-sm">Status</label><select className="input-field" value={transactionFilter.status} onChange={(e) => setTransactionFilter({ ...transactionFilter, status: e.target.value as any })}><option value="all">All</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
            <div className="input-group"><label className="input-label text-sm">Date From</label><input type="date" className="input-field" value={transactionFilter.dateFrom} onChange={(e) => setTransactionFilter({ ...transactionFilter, dateFrom: e.target.value })} /></div>
            <div className="input-group"><label className="input-label text-sm">Date To</label><input type="date" className="input-field" value={transactionFilter.dateTo} onChange={(e) => setTransactionFilter({ ...transactionFilter, dateTo: e.target.value })} /></div>
            <div className="input-group"><label className="input-label text-sm">Min Amount</label><input type="number" className="input-field" placeholder="Min" value={transactionFilter.minAmount} onChange={(e) => setTransactionFilter({ ...transactionFilter, minAmount: e.target.value })} /></div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-gold font-bold text-lg mb-4" style={{ color: '#d4af37' }}>Transactions ({filteredTransactions.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-glass"><th className="text-left py-3 px-4 text-xs uppercase text-muted">Date</th><th className="text-left py-3 px-4 text-xs uppercase text-muted">Description</th><th className="text-left py-3 px-4 text-xs uppercase text-muted">Category</th><th className="text-right py-3 px-4 text-xs uppercase text-muted">Amount</th><th className="text-left py-3 px-4 text-xs uppercase text-muted">Status</th><th className="text-left py-3 px-4 text-xs uppercase text-muted">Method</th><th className="text-center py-3 px-4 text-xs uppercase text-muted">Actions</th></tr></thead>
              <tbody>
                {filteredTransactions.map((transaction) => {
                  const amountInLKR = convertToLKR(transaction.amount, transaction.currency);
                  return (
                    <tr key={transaction.id} className="border-b border-glass/50 hover:bg-glass/20 transition-colors">
                      <td className="py-3 px-4 text-sm">{transaction.date}</td>
                      <td className="py-3 px-4"><div className="flex flex-col"><span className="font-medium">{transaction.description}</span>{transaction.reference && <span className="text-xs text-muted">Ref: {transaction.reference}</span>}</div></td>
                      <td className="py-3 px-4"><span className="px-2 py-1 rounded text-xs bg-glass/30">{transaction.category}{transaction.subCategory && ` / ${transaction.subCategory}`}</span></td>
                      <td className={`py-3 px-4 text-right font-bold ${transaction.type === 'income' ? 'text-success' : 'text-danger'}`}>{transaction.type === 'income' ? '+' : '-'} {transaction.currency} {transaction.amount.toLocaleString()}<span className="block text-[10px] text-muted">LKR {amountInLKR.toLocaleString()}</span></td>
                      <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs ${transaction.status === 'completed' ? 'bg-success/20 text-success' : transaction.status === 'pending' ? 'bg-gold/20 text-gold' : 'bg-danger/20 text-danger'}`}>{transaction.status}</span></td>
                      <td className="py-3 px-4"><span className="text-xs capitalize">{transaction.paymentMethod || '-'}</span></td>
                      <td className="py-3 px-4"><div className="flex justify-center gap-2"><button className="text-blue hover:text-blue-hover" onClick={() => setEditingTransaction(transaction)}><Edit size={16} /></button><button className="text-danger hover:text-red-400" onClick={() => { if (confirm('Delete this transaction?')) deleteTransaction(transaction.id); }}><Trash2 size={16} /></button></div></td>
                    </tr>
                  );
                })}
                {filteredTransactions.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted">No transactions found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {(showAddTransaction || editingTransaction) && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel max-w-2xl">
              <div className="flex justify-between items-center border-b border-glass pb-4 mb-6">
                <h2 className="text-xl font-bold text-gold" style={{ color: '#d4af37' }}>{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</h2>
                <button onClick={() => { setShowAddTransaction(false); setEditingTransaction(null); }} className="text-muted hover:text-white"><X size={24} /></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (editingTransaction) { updateTransaction(editingTransaction.id, newTransaction); setEditingTransaction(null); } 
                else { addTransaction(newTransaction); setShowAddTransaction(false); }
                setNewTransaction({ type: 'expense', category: '', subCategory: '', amount: 0, currency: 'LKR', date: new Date().toISOString().split('T')[0], description: '', reference: '', paymentMethod: 'cash', status: 'pending', recurring: undefined, tags: [] });
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="input-group"><label className="input-label">Type *</label><select className="input-field" value={newTransaction.type} onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value as any })} required><option value="expense">Expense</option><option value="income">Income</option></select></div>
                  <div className="input-group"><label className="input-label">Category *</label><select className="input-field" value={newTransaction.category} onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })} required><option value="">Select Category</option>{(newTransaction.type === 'income' ? incomeCategories : expenseCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                  <div className="input-group"><label className="input-label">Amount *</label><input type="number" className="input-field" placeholder="0.00" value={newTransaction.amount} onChange={(e) => setNewTransaction({ ...newTransaction, amount: Number(e.target.value) })} required /></div>
                  <div className="input-group"><label className="input-label">Currency</label><select className="input-field" value={newTransaction.currency} onChange={(e) => setNewTransaction({ ...newTransaction, currency: e.target.value })}>{SUPPORTED_CURRENCIES.map(curr => <option key={curr.code} value={curr.code}>{curr.code}</option>)}</select></div>
                  <div className="input-group"><label className="input-label">Date *</label><input type="date" className="input-field" value={newTransaction.date} onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })} required /></div>
                  <div className="input-group"><label className="input-label">Payment Method</label><select className="input-field" value={newTransaction.paymentMethod || 'cash'} onChange={(e) => setNewTransaction({ ...newTransaction, paymentMethod: e.target.value as any })}><option value="cash">Cash</option><option value="bank">Bank Transfer</option><option value="card">Card Payment</option><option value="online">Online Payment</option></select></div>
                  <div className="input-group md:col-span-2"><label className="input-label">Description *</label><input type="text" className="input-field" placeholder="Describe the transaction" value={newTransaction.description} onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })} required /></div>
                  <div className="input-group"><label className="input-label">Reference</label><input type="text" className="input-field" placeholder="e.g. INV-001" value={newTransaction.reference || ''} onChange={(e) => setNewTransaction({ ...newTransaction, reference: e.target.value })} /></div>
                  <div className="input-group"><label className="input-label">Status</label><select className="input-field" value={newTransaction.status} onChange={(e) => setNewTransaction({ ...newTransaction, status: e.target.value as any })}><option value="pending">Pending</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
                </div>
                <div className="flex gap-4 mt-6 border-t border-glass pt-4"><button type="submit" className="btn btn-primary flex-1">{editingTransaction ? 'Update Transaction' : 'Add Transaction'}</button><button type="button" className="btn btn-secondary" onClick={() => { setShowAddTransaction(false); setEditingTransaction(null); }}>Cancel</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // DEVELOPERS TAB RENDER
  // ============================================

  const renderDevelopersTab = () => {
    return (
      <div className="developers-tab space-y-6">
        <div className="page-header">
          <h1 className="page-title">Developer Salary & Commission Management</h1>
          <button className="btn btn-primary" onClick={() => setShowAddSalary(true)}><Plus size={16} /> Add Salary</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted">Total Developers</p><p className="text-2xl font-bold text-blue" style={{ color: '#00b4d8' }}>{stats.totalDeveloperCount}</p></div><div className="p-3 rounded-full bg-blue/10"><Users size={24} style={{ color: '#00b4d8' }} /></div></div></div>
          <div className="glass-card p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted">Total Monthly Salaries</p><p className="text-2xl font-bold text-gold" style={{ color: '#d4af37' }}>LKR {stats.totalSalaries.toLocaleString()}</p></div><div className="p-3 rounded-full bg-gold/10"><Wallet size={24} style={{ color: '#d4af37' }} /></div></div></div>
          <div className="glass-card p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted">Total Commissions</p><p className="text-2xl font-bold text-orange" style={{ color: '#ff7b00' }}>LKR {stats.totalCommissions.toLocaleString()}</p></div><div className="p-3 rounded-full bg-orange/10"><TrendingUp size={24} style={{ color: '#ff7b00' }} /></div></div></div>
          <div className="glass-card p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted">Total Developer Earnings</p><p className="text-2xl font-bold text-success" style={{ color: '#38a169' }}>LKR {stats.totalDeveloperEarnings.toLocaleString()}</p></div><div className="p-3 rounded-full bg-success/10"><PiggyBank size={24} style={{ color: '#38a169' }} /></div></div></div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-gold font-bold text-lg mb-4" style={{ color: '#d4af37' }}>Developer Salary & Commission Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-glass"><th className="text-left py-3 px-4 text-xs uppercase text-muted">Developer</th><th className="text-right py-3 px-4 text-xs uppercase text-muted">Base Salary</th><th className="text-right py-3 px-4 text-xs uppercase text-muted">Commissions</th><th className="text-right py-3 px-4 text-xs uppercase text-muted">Total Earned</th><th className="text-right py-3 px-4 text-xs uppercase text-muted">Paid</th><th className="text-right py-3 px-4 text-xs uppercase text-muted">Outstanding</th><th className="text-center py-3 px-4 text-xs uppercase text-muted">Status</th><th className="text-center py-3 px-4 text-xs uppercase text-muted">Actions</th></tr></thead>
              <tbody>
                {developerSalaryDetails.map((dev) => {
                  const salary = salaries.find(s => s.employerUsername === dev.username && s.isActive);
                  return (
                    <tr key={dev.username} className="border-b border-glass/50 hover:bg-glass/20 transition-colors">
                      <td className="py-3 px-4"><div className="flex flex-col"><span className="font-bold">{dev.fullName}</span><span className="text-xs text-muted">@{dev.username}</span></div></td>
                      <td className="py-3 px-4 text-right text-gold" style={{ color: '#d4af37' }}>LKR {dev.baseSalary.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-orange" style={{ color: '#ff7b00' }}>LKR {dev.commissions.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-blue" style={{ color: '#00b4d8' }}>LKR {dev.totalEarned.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-success" style={{ color: '#38a169' }}>LKR {dev.totalPaid.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-danger" style={{ color: '#e53e3e' }}>LKR {dev.outstanding.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">{salary ? <span className="px-2 py-1 rounded text-xs bg-success/20 text-success">Active</span> : <span className="px-2 py-1 rounded text-xs bg-gold/20 text-gold">No Salary</span>}</td>
                      <td className="py-3 px-4"><div className="flex justify-center gap-2"><button className="text-blue hover:text-blue-hover" onClick={() => { const existing = salaries.find(s => s.employerUsername === dev.username && s.isActive); if (existing) { setEditingSalary(existing); setNewSalary({ employerUsername: existing.employerUsername, employerName: existing.employerName, baseSalary: existing.baseSalary, currency: existing.currency, startDate: existing.startDate, isActive: existing.isActive, notes: existing.notes || '' }); setShowAddSalary(true); } else { const emp = employers.find(e => e.username === dev.username); setNewSalary({ employerUsername: dev.username, employerName: emp?.fullName || dev.fullName, baseSalary: 0, currency: 'LKR', startDate: new Date().toISOString().split('T')[0], isActive: true, notes: '' }); setShowAddSalary(true); } }}><Edit size={16} /></button>{salary && <button className="text-danger hover:text-red-400" onClick={() => { if (confirm(`Remove salary for ${dev.fullName}?`)) deleteSalary(salary.id); }}><Trash2 size={16} /></button>}</div></td>
                    </tr>
                  );
                })}
                {developerSalaryDetails.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted">No developers found. Register developers in the Employers tab.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-gold font-bold text-lg mb-4" style={{ color: '#d4af37' }}>Commission Breakdown by Developer</h3>
          {developerSalaryDetails.map((dev) => {
            if (dev.deals.length === 0) return null;
            return (
              <div key={dev.username} className="mb-6 last:mb-0">
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                  <h4 className="font-bold text-blue" style={{ color: '#00b4d8' }}>@{dev.username} - {dev.fullName}</h4>
                  <div className="flex flex-wrap gap-3 text-sm"><span className="text-gold font-bold" style={{ color: '#d4af37' }}>Commission: LKR {dev.commissions.toLocaleString()}</span><span className="text-success font-bold" style={{ color: '#38a169' }}>Paid: LKR {dev.totalPaid.toLocaleString()}</span><span className="text-danger font-bold" style={{ color: '#e53e3e' }}>Outstanding: LKR {dev.outstanding.toLocaleString()}</span><span className="text-blue font-bold" style={{ color: '#00b4d8' }}>Total Earnings: LKR {dev.totalEarned.toLocaleString()}</span></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-glass"><th className="text-left py-2 px-3 text-xs uppercase text-muted">Project</th><th className="text-right py-2 px-3 text-xs uppercase text-muted">Role</th><th className="text-right py-2 px-3 text-xs uppercase text-muted">Percentage</th><th className="text-right py-2 px-3 text-xs uppercase text-muted">Total Commission</th><th className="text-right py-2 px-3 text-xs uppercase text-muted">Paid Commission</th><th className="text-right py-2 px-3 text-xs uppercase text-muted">Outstanding Commission</th></tr></thead>
                    <tbody>
                      {dev.deals.map((deal, idx) => {
                        const paidRatio = deal.paidAmount > 0 ? Math.min(1, deal.paidAmount / (deal.amount / (deal.percentage / 100))) : 0;
                        const paidCommission = deal.amount * paidRatio;
                        const outstandingCommission = deal.amount - paidCommission;
                        return (
                          <tr key={idx} className="border-b border-glass/30">
                            <td className="py-2 px-3 font-medium">{deal.projectName}</td>
                            <td className="py-2 px-3 text-right"><span className={`px-2 py-0.5 rounded text-xs ${deal.role === 'both' ? 'bg-purple/20 text-purple' : deal.role === 'caller' ? 'bg-blue/20 text-blue' : 'bg-orange/20 text-orange'}`}>{deal.role}</span></td>
                            <td className="py-2 px-3 text-right">{deal.percentage}%</td>
                            <td className="py-2 px-3 text-right text-gold font-bold" style={{ color: '#d4af37' }}>LKR {deal.amount.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right text-success" style={{ color: '#38a169' }}>LKR {paidCommission.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right text-danger" style={{ color: '#e53e3e' }}>LKR {outstandingCommission.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {developerSalaryDetails.every(d => d.deals.length === 0) && <div className="text-center text-muted py-8">No commission records found.</div>}
        </div>

        {showAddSalary && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel max-w-2xl">
              <div className="flex justify-between items-center border-b border-glass pb-4 mb-6">
                <h2 className="text-xl font-bold text-gold" style={{ color: '#d4af37' }}>{editingSalary ? 'Edit Salary' : 'Add New Salary'}</h2>
                <button onClick={() => { setShowAddSalary(false); setEditingSalary(null); }} className="text-muted hover:text-white"><X size={24} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); if (editingSalary) { updateSalary(editingSalary.id, newSalary); setEditingSalary(null); } else { addSalary(newSalary); setShowAddSalary(false); } setNewSalary({ employerUsername: '', employerName: '', baseSalary: 0, currency: 'LKR', startDate: new Date().toISOString().split('T')[0], isActive: true, notes: '' }); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="input-group"><label className="input-label">Developer *</label><select className="input-field" value={newSalary.employerUsername} onChange={(e) => { const emp = employers.find(emp => emp.username === e.target.value); setNewSalary({ ...newSalary, employerUsername: e.target.value, employerName: emp?.fullName || '' }); }} required><option value="">Select Developer</option>{employers.map(emp => <option key={emp.username} value={emp.username}>{emp.fullName} (@{emp.username})</option>)}</select></div>
                  <div className="input-group"><label className="input-label">Developer Name</label><input type="text" className="input-field" value={newSalary.employerName} onChange={(e) => setNewSalary({ ...newSalary, employerName: e.target.value })} /></div>
                  <div className="input-group"><label className="input-label">Base Salary (Monthly) *</label><input type="number" className="input-field" placeholder="0.00" value={newSalary.baseSalary} onChange={(e) => setNewSalary({ ...newSalary, baseSalary: Number(e.target.value) })} required /></div>
                  <div className="input-group"><label className="input-label">Currency</label><select className="input-field" value={newSalary.currency} onChange={(e) => setNewSalary({ ...newSalary, currency: e.target.value })}>{SUPPORTED_CURRENCIES.map(curr => <option key={curr.code} value={curr.code}>{curr.code}</option>)}</select></div>
                  <div className="input-group"><label className="input-label">Start Date *</label><input type="date" className="input-field" value={newSalary.startDate} onChange={(e) => setNewSalary({ ...newSalary, startDate: e.target.value })} required /></div>
                  <div className="input-group"><label className="input-label">Status</label><select className="input-field" value={newSalary.isActive ? 'active' : 'inactive'} onChange={(e) => setNewSalary({ ...newSalary, isActive: e.target.value === 'active' })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                  <div className="input-group md:col-span-2"><label className="input-label">Notes</label><textarea className="input-field" rows={2} placeholder="Additional notes" value={newSalary.notes || ''} onChange={(e) => setNewSalary({ ...newSalary, notes: e.target.value })} /></div>
                </div>
                <div className="flex gap-4 mt-6 border-t border-glass pt-4"><button type="submit" className="btn btn-primary flex-1">{editingSalary ? 'Update Salary' : 'Add Salary'}</button><button type="button" className="btn btn-secondary" onClick={() => { setShowAddSalary(false); setEditingSalary(null); }}>Cancel</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // MAIN RETURN
  // ============================================

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div>
          <div className="logo-container">
            <TrendingUp size={28} className="text-gold" style={{ color: '#d4af37' }} />
            <span className="logo-text">CodoConsole</span>
          </div>
          <ul className="nav-links">
            <li><button onClick={() => setActiveTab('dashboard')} className={`nav-link w-full text-left ${activeTab === 'dashboard' ? 'active' : ''}`}><LayoutDashboard size={20} /> Dashboard</button></li>
            <li><button onClick={() => setActiveTab('pipeline')} className={`nav-link w-full text-left ${activeTab === 'pipeline' ? 'active' : ''}`}><TableProperties size={20} /> Pipeline <span className="badge">{leads.length}</span></button></li>
            <li><button onClick={() => setActiveTab('finance')} className={`nav-link w-full text-left ${activeTab === 'finance' ? 'active' : ''}`}><BarChart3 size={20} /> Finance</button></li>
            <li><button onClick={() => setActiveTab('transactions')} className={`nav-link w-full text-left ${activeTab === 'transactions' ? 'active' : ''}`}><Receipt size={20} /> Transactions</button></li>
            <li><button onClick={() => setActiveTab('developers')} className={`nav-link w-full text-left ${activeTab === 'developers' ? 'active' : ''}`}><Users size={20} /> Developers</button></li>
            <li><button onClick={() => setActiveTab('employers')} className={`nav-link w-full text-left ${activeTab === 'employers' ? 'active' : ''}`}><Briefcase size={20} /> Employers</button></li>
            <li><button onClick={() => setActiveTab('add')} className={`nav-link w-full text-left ${activeTab === 'add' ? 'active' : ''}`}><FilePlus2 size={20} /> Add Pipeline</button></li>
            <li><button onClick={() => setActiveTab('wealth')} className={`nav-link w-full text-left ${activeTab === 'wealth' ? 'active' : ''}`}><DollarSign size={20} /> Wealth</button></li>
            <li><button onClick={() => setActiveTab('schedules')} className={`nav-link w-full text-left ${activeTab === 'schedules' ? 'active' : ''}`}><Calendar size={20} /> Schedules</button></li>
          </ul>
        </div>
        <div><div className="border-t border-glass pt-4 flex flex-col gap-2"><div className="px-3 py-2 text-xs text-muted">Logged in as Admin</div><button onClick={onLogout} className="btn btn-secondary w-full"><LogOut size={16} /> Logout</button></div></div>
      </aside>

      <main className="main-content">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <>
            <div className="page-header"><h1 className="page-title">Executive Dashboard</h1></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="glass-card p-4"><p className="text-sm text-muted">Total Revenue</p><p className="text-2xl font-bold text-blue" style={{ color: '#00b4d8' }}>LKR {stats.totalRevenue.toLocaleString()}</p></div>
              <div className="glass-card p-4"><p className="text-sm text-muted">Net Profit</p><p className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>LKR {stats.netProfit.toLocaleString()}</p></div>
              <div className="glass-card p-4"><p className="text-sm text-muted">Custom Income</p><p className="text-2xl font-bold text-gold" style={{ color: '#d4af37' }}>LKR {stats.customIncome.toLocaleString()}</p></div>
              <div className="glass-card p-4"><p className="text-sm text-muted">Net Cash Flow</p><p className={`text-2xl font-bold ${stats.netCashFlow >= 0 ? 'text-success' : 'text-danger'}`}>LKR {stats.netCashFlow.toLocaleString()}</p></div>
            </div>
            <div className="stats-grid">
              <div className="glass-card stats-card"><span className="stats-label">Total Leads</span><span className="stats-value gold">{stats.total}</span></div>
              <div className="glass-card stats-card"><span className="stats-label">Positive Leads</span><span className="stats-value gold">{stats.positive}</span></div>
              <div className="glass-card stats-card"><span className="stats-label">Positive Rate</span><span className="stats-value gold">{stats.positiveRate}%</span></div>
              <div className="glass-card stats-card"><span className="stats-label">Conversion Rate</span><span className="stats-value gold">{stats.conversionRate}%</span></div>
            </div>
            <div className="glass-card"><h3 className="mb-4 text-gold font-bold text-lg">Recent Pipeline Updates</h3><div className="table-container"><table className="custom-table"><thead><tr><th>Business</th><th>Field</th><th>Owner</th><th>Response</th><th>Assigned Caller</th><th>Follow Up Action</th></tr></thead><tbody>{leads.slice(0, 5).map(lead => (<tr key={lead.id}><td className="font-bold">{lead.businessName}</td><td>{lead.field}</td><td>{lead.ownerName}</td><td>{lead.response === 'positive' && <span className="badge badge-positive">Positive</span>}{lead.response === 'negative' && <span className="badge badge-negative">Negative</span>}{lead.response === 'none' && <span className="badge badge-neutral">No Response</span>}</td><td>{lead.caller ? `@${lead.caller}` : <span className="text-muted">Unassigned</span>}</td><td className="text-orange" style={{ color: '#ff7b00' }}>{lead.followUp || <span className="text-muted">None</span>}</td></tr>))}</tbody></table></div></div>
          </>
        )}

        {/* PIPELINE TAB */}
        {activeTab === 'pipeline' && (
          <>
            <div className="page-header"><h1 className="page-title">Full Pipeline</h1><div className="flex gap-2"><button onClick={handleExportCSV} className="btn btn-secondary"><FileSpreadsheet size={16} /> CSV</button><button onClick={handleExportJSON} className="btn btn-secondary"><FileJson size={16} /> JSON</button><button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary"><Plus size={16} /> Add Lead</button></div></div>
            <div className="glass-card p-3 flex items-center justify-between flex-wrap gap-2"><div className="flex items-center gap-4"><span className="text-sm text-muted">Display Currency:</span><select className="input-field py-1 px-3 text-sm w-auto" value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}>{SUPPORTED_CURRENCIES.map(curr => <option key={curr.code} value={curr.code}>{curr.code}</option>)}</select></div><span className="text-xs text-muted">Exchange rates configured in Currency Settings</span></div>
            <div className="filter-bar"><div className="flex items-center gap-2"><Search size={18} className="text-muted" /><input type="text" placeholder="Search business, owner, city..." className="input-field py-1.5 px-3 max-w-xs" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div><div className="flex items-center gap-1.5"><span className="text-xs text-muted uppercase">Status:</span><select className="input-field py-1 px-2 text-sm" value={filterResponse} onChange={(e) => setFilterResponse(e.target.value)} style={{ width: '130px' }}><option value="all">All</option><option value="none">No Response</option><option value="positive">Positive</option><option value="negative">Negative</option></select></div><div className="flex items-center gap-1.5"><span className="text-xs text-muted uppercase">Proposal:</span><select className="input-field py-1 px-2 text-sm" value={filterProposalSent} onChange={(e) => setFilterProposalSent(e.target.value)} style={{ width: '90px' }}><option value="all">All</option><option value="yes">Sent</option><option value="no">Not Sent</option></select></div><div className="flex items-center gap-1.5"><span className="text-xs text-muted uppercase">Accepted:</span><select className="input-field py-1 px-2 text-sm" value={filterProposalAccepted} onChange={(e) => setFilterProposalAccepted(e.target.value)} style={{ width: '90px' }}><option value="all">All</option><option value="yes">Yes</option><option value="no">No</option></select></div><div className="flex items-center gap-1.5"><span className="text-xs text-muted uppercase">Deals:</span><select className="input-field py-1 px-2 text-sm" value={filterPaid} onChange={(e) => setFilterPaid(e.target.value)} style={{ width: '110px' }}><option value="all">All</option><option value="paid">Paid/Closed</option><option value="unpaid">Unpaid</option></select></div><div className="flex items-center gap-1.5"><span className="text-xs text-muted uppercase">Caller:</span><select className="input-field py-1 px-2 text-sm" value={filterCaller} onChange={(e) => setFilterCaller(e.target.value)} style={{ width: '130px' }}><option value="all">All Callers</option>{employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username}</option>)}</select></div></div>
            <div className="table-wrapper"><div className="table-container"><table className="custom-table" style={{ minWidth: '4500px' }}><thead><tr><th>Business Name</th><th>Field</th><th>Owner Name</th><th>Owner Contact</th><th>Country</th><th>City</th><th>Business Contact</th><th>Email</th><th>Working Hours</th><th>Manager Name</th><th>Response</th><th>Proposal</th><th>Accepted</th><th>Paid Amount</th><th>Total Value</th><th>Paid To Date</th><th>Payment Schedule</th><th>Currency</th><th>Closed?</th><th>Caller ID</th><th>Engineer 1</th><th>Engineer 2</th><th>Engineer 3</th><th>Number Off?</th><th>Package Type</th><th>Domain</th><th>Renewal Date</th><th>Deployed Link</th><th>Google Link</th><th>Cost</th><th>Notes</th><th>Follow-up</th><th style={{ width: '120px' }}>Actions</th></tr></thead><tbody>{filteredLeads.map(lead => { const ext = lead as Lead; return (<tr key={lead.id}><td className="font-bold">{lead.businessName}</td><td>{lead.field}</td><td>{lead.ownerName || '-'}</td><td>{lead.ownerContact || '-'}</td><td>{lead.country || '-'}</td><td>{lead.city || '-'}</td><td>{lead.businessContact || '-'}</td><td>{lead.email || '-'}</td><td>{lead.workingHours || '-'}</td><td>{lead.managerName || '-'}</td><td><select className="input-field py-0.5 px-1.5 text-xs bg-transparent" value={lead.response} onChange={(e) => handleInlineChange(lead, 'response', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}><option value="none">None</option><option value="positive">Positive</option><option value="negative">Negative</option></select></td><td><select className="input-field py-0.5 px-1.5 text-xs bg-transparent" value={lead.proposalSent} onChange={(e) => handleInlineChange(lead, 'proposalSent', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}><option value="yes">Yes</option><option value="no">No</option></select></td><td><select className="input-field py-0.5 px-1.5 text-xs bg-transparent" value={lead.proposalAccepted} onChange={(e) => handleInlineChange(lead, 'proposalAccepted', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}><option value="yes">Yes</option><option value="no">No</option></select></td><td><div className="flex flex-col"><div className="flex items-center gap-1"><span className="text-xs text-muted">{SUPPORTED_CURRENCIES.find(c => c.code === (lead.currency || 'USD'))?.symbol || '$'}</span><EditableAmountField className="input-field py-0.5 px-1 text-xs bg-transparent w-20" value={lead.paidAmount} onCommit={(val) => handleInlineChange(lead, 'paidAmount', val)} /></div>{lead.currency && lead.currency !== 'LKR' && <span className="text-[9px] text-muted">LKR {convertToLKR(lead.paidAmount, lead.currency).toLocaleString()}</span>}</div></td><td><div className="flex flex-col"><div className="flex items-center gap-1"><span className="text-xs text-muted">{SUPPORTED_CURRENCIES.find(c => c.code === (lead.currency || 'USD'))?.symbol || '$'}</span><EditableAmountField className="input-field py-0.5 px-1 text-xs bg-transparent w-20" value={ext.totalProjectValue || 0} onCommit={(val) => handleInlineChange(lead, 'totalProjectValue', val)} /></div>{lead.currency && lead.currency !== 'LKR' && <span className="text-[9px] text-muted">LKR {convertToLKR(ext.totalProjectValue || lead.paidAmount, lead.currency).toLocaleString()}</span>}</div></td><td><div className="flex flex-col"><div className="flex items-center gap-1"><span className="text-xs text-muted">{SUPPORTED_CURRENCIES.find(c => c.code === (lead.currency || 'USD'))?.symbol || '$'}</span><EditableAmountField className="input-field py-0.5 px-1 text-xs bg-transparent w-20" value={ext.paidToDate || 0} onCommit={(val) => handleInlineChange(lead, 'paidToDate', val)} /></div>{lead.currency && lead.currency !== 'LKR' && <span className="text-[9px] text-muted">LKR {convertToLKR(ext.paidToDate || lead.paidAmount, lead.currency).toLocaleString()}</span>}</div></td><td><select className="input-field py-0.5 px-1.5 text-xs bg-transparent" value={ext.paymentSchedule || 'one-time'} onChange={(e) => handleInlineChange(lead as Lead, 'paymentSchedule' as keyof Lead, e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}><option value="one-time">One-time</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></td><td><select className="input-field py-0.5 px-1.5 text-xs bg-transparent" value={lead.currency || 'USD'} onChange={(e) => handleInlineChange(lead, 'currency', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}>{SUPPORTED_CURRENCIES.map(curr => <option key={curr.code} value={curr.code}>{curr.code}</option>)}</select></td><td><select className="input-field py-0.5 px-1.5 text-xs bg-transparent" value={lead.dealClosed} onChange={(e) => handleInlineChange(lead, 'dealClosed', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}><option value="yes">Yes</option><option value="no">No</option></select></td><td><select className="input-field py-0.5 px-1.5 text-xs bg-transparent" value={lead.caller} onChange={(e) => handleInlineChange(lead, 'caller', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}><option value="">Unassigned</option>{employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username}</option>)}</select></td><td><select className="input-field py-0.5 px-1 text-xs bg-transparent" value={lead.engineer1} onChange={(e) => handleInlineChange(lead, 'engineer1', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}><option value="">None</option>{employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username}</option>)}</select></td><td><select className="input-field py-0.5 px-1 text-xs bg-transparent" value={lead.engineer2} onChange={(e) => handleInlineChange(lead, 'engineer2', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}><option value="">None</option>{employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username}</option>)}</select></td><td><select className="input-field py-0.5 px-1 text-xs bg-transparent" value={lead.engineer3} onChange={(e) => handleInlineChange(lead, 'engineer3', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}><option value="">None</option>{employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username}</option>)}</select></td><td><select className="input-field py-0.5 px-1.5 text-xs bg-transparent" value={lead.numberNotWorking} onChange={(e) => handleInlineChange(lead, 'numberNotWorking', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}><option value="yes">Yes (Remove)</option><option value="no">No</option></select></td><td><select className="input-field py-0.5 px-1.5 text-xs bg-transparent" value={lead.packageType} onChange={(e) => handleInlineChange(lead, 'packageType', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}><option value="none">None</option><option value="one-time">One-time</option><option value="subscription">Subscription</option></select></td><td><input type="text" className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full" value={lead.domain || ''} onChange={(e) => handleInlineChange(lead, 'domain', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }} /></td><td><input type="date" className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full" value={lead.renewalDate || ''} onChange={(e) => handleInlineChange(lead, 'renewalDate', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }} /></td><td>{lead.deployedLink ? <a href={lead.deployedLink} target="_blank" rel="noreferrer" className="text-blue hover:text-blue-hover flex items-center gap-1 text-xs"><ExternalLink size={14} /> View</a> : <input type="text" className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full" placeholder="Enter URL" value={lead.deployedLink || ''} onChange={(e) => handleInlineChange(lead, 'deployedLink', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }} />}</td><td>{lead.googleLink ? <a href={lead.googleLink} target="_blank" rel="noreferrer" className="text-blue hover:text-blue-hover flex items-center gap-1 text-xs"><ExternalLink size={14} /> View</a> : <input type="text" className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full" placeholder="Enter URL" value={lead.googleLink || ''} onChange={(e) => handleInlineChange(lead, 'googleLink', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }} />}</td><td><div className="flex flex-col"><div className="flex items-center gap-1"><span className="text-xs text-muted">{SUPPORTED_CURRENCIES.find(c => c.code === (lead.currency || 'USD'))?.symbol || '$'}</span><input type="number" className="input-field py-0.5 px-1 text-xs bg-transparent w-14" value={lead.cost} onChange={(e) => handleInlineChange(lead, 'cost', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }} /></div>{lead.currency && lead.currency !== 'LKR' && <span className="text-[9px] text-muted">LKR {convertToLKR(lead.cost, lead.currency).toLocaleString()}</span>}</div></td><td><textarea className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full resize-y" rows={3} value={lead.notes || ''} onChange={(e) => handleInlineChange(lead, 'notes', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)', minHeight: '60px' }} /></td><td><textarea className="input-field py-0.5 px-1.5 text-xs bg-transparent w-full resize-y" rows={3} value={lead.followUp || ''} onChange={(e) => handleInlineChange(lead, 'followUp', e.target.value)} style={{ border: 'none', background: 'rgba(255,255,255,0.05)', minHeight: '60px' }} /></td><td><div className="flex gap-2 justify-center"><button onClick={() => handleOpenEdit(lead)} className="text-blue hover:text-blue-hover"><Edit size={16} /></button><button onClick={() => { if(confirm(`Delete ${lead.businessName}?`)) onDeleteLead(lead.id) }} className="text-danger hover:text-red-400"><Trash2 size={16} /></button></div></td></tr>);})}{filteredLeads.length === 0 && <tr><td colSpan={34} className="text-center py-8 text-muted">No leads match current search filters.</td></tr>}</tbody></table></div></div>
          </>
        )}

        {/* FINANCE TAB */}
        {activeTab === 'finance' && renderFinanceDashboard()}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'transactions' && renderTransactionsTab()}

        {/* DEVELOPERS TAB */}
        {activeTab === 'developers' && renderDevelopersTab()}

        {/* EMPLOYERS TAB */}
        {activeTab === 'employers' && (
          <>
            <div className="page-header"><h1 className="page-title">Employer Pipeline Management</h1></div>
            <div className="grid-2">
              <div className="glass-card"><h3 className="mb-4 text-gold font-bold text-lg">Select Employer</h3><div className="input-group"><label className="input-label">Select Registered Employer</label><select className="input-field" value={selectedEmployerId} onChange={(e) => setSelectedEmployerId(e.target.value)}><option value="">-- Choose Employer --</option>{employers.map(emp => <option key={emp.username} value={emp.username}>{emp.fullName} (@{emp.username})</option>)}</select></div>
              {employerDetails ? (<div className="mt-6 flex flex-col gap-4"><h4 className="font-bold border-b border-glass pb-2">Performance Summary: @{employerDetails.employer.username}</h4><div className="grid-2"><div className="bg-input p-3 rounded border border-glass"><span className="text-xs text-muted block">Caller Commissions (LKR)</span><span className="font-bold text-blue text-lg">LKR {employerDetails.callerComm.toLocaleString()}</span></div><div className="bg-input p-3 rounded border border-glass"><span className="text-xs text-muted block">Developer Commissions (LKR)</span><span className="font-bold text-orange text-lg">LKR {employerDetails.engComm.toLocaleString()}</span></div></div><div className="bg-gold-dim p-4 rounded border border-gold flex justify-between items-center"><div><span className="text-xs text-gold uppercase block font-semibold">Total Commission Wealth (LKR)</span><span className="text-2xl font-bold text-gold">LKR {employerDetails.totalComm.toLocaleString()}</span></div><div className="text-right"><span className="text-xs text-muted block">Assigned Leads</span><span className="font-bold">{employerDetails.totalAssigned} ({employerDetails.closedDeals} Closed)</span></div></div><button className="btn btn-secondary w-full text-danger" onClick={() => { if (confirm(`Remove @${employerDetails.employer.username}?`)) { onDeleteEmployer(employerDetails.employer.username); setSelectedEmployerId(''); } }}><Trash2 size={16} /> Delete Employer</button></div>) : (<div className="mt-8 text-center text-muted border-t border-glass pt-6"><UserCheck size={36} className="mx-auto text-muted opacity-40 mb-2" />Select an employer to view their performance.</div>)}</div>
              <div className="glass-card"><h3 className="mb-4 text-gold font-bold text-lg">Register New Employer</h3>{empError && <div className="bg-orange-dim text-orange border border-orange p-3 rounded mb-4 text-sm flex items-center gap-2"><AlertCircle size={16} /><span>{empError}</span></div>}{empSuccess && <div className="bg-success/10 text-success border border-success/30 p-3 rounded mb-4 text-sm flex items-center gap-2"><Check size={16} /><span>{empSuccess}</span></div>}<form onSubmit={handleRegisterEmployer} className="flex flex-col gap-3"><div className="input-group"><label className="input-label">Full Name</label><input type="text" className="input-field" placeholder="e.g. John Doe" value={newEmpFullName} onChange={(e) => setNewEmpFullName(e.target.value)} /></div><div className="input-group"><label className="input-label">Username</label><input type="text" className="input-field" placeholder="e.g. john_doe" value={newEmpUsername} onChange={(e) => setNewEmpUsername(e.target.value)} /></div><div className="input-group"><label className="input-label">Password</label><input type="password" className="input-field" placeholder="Password" value={newEmpPassword} onChange={(e) => setNewEmpPassword(e.target.value)} /></div><button type="submit" className="btn btn-primary"><Plus size={16} /> Register Employer</button></form></div>
            </div>
            {employerDetails && (<div className="glass-card"><h3 className="mb-4 text-gold font-bold text-lg">Assigned Pipeline for @{employerDetails.employer.username}</h3><div className="table-container"><table className="custom-table"><thead><tr><th>Business</th><th>Field</th><th>Owner</th><th>Response</th><th>Proposal Sent</th><th>Accepted</th><th>Paid Amount</th><th>Total Value</th><th>Paid To Date</th><th>Currency</th><th>Role</th><th>Renewal Date</th></tr></thead><tbody>{employerDetails.pipeline.map(lead => { const ext = lead as Lead; const roles: string[] = []; if (lead.caller === employerDetails.employer.username) roles.push('Caller'); if (lead.engineer1 === employerDetails.employer.username || lead.engineer2 === employerDetails.employer.username || lead.engineer3 === employerDetails.employer.username) roles.push('Developer'); return (<tr key={lead.id}><td className="font-bold">{lead.businessName}</td><td>{lead.field}</td><td>{lead.ownerName || '-'}</td><td>{lead.response === 'positive' && <span className="badge badge-positive">Positive</span>}{lead.response === 'negative' && <span className="badge badge-negative">Negative</span>}{lead.response === 'none' && <span className="badge badge-neutral">None</span>}</td><td>{lead.proposalSent}</td><td>{lead.proposalAccepted}</td><td className="font-bold text-blue">{lead.currency || 'USD'} {lead.paidAmount.toLocaleString()}</td><td>{lead.currency || 'USD'} {(ext.totalProjectValue || lead.paidAmount).toLocaleString()}</td><td>{lead.currency || 'USD'} {(ext.paidToDate || lead.paidAmount).toLocaleString()}</td><td>{lead.currency || 'USD'}</td><td><span className="badge badge-neutral">{roles.join(' & ')}</span></td><td>{lead.renewalDate || '-'}</td></tr>);})}{employerDetails.pipeline.length === 0 && <tr><td colSpan={12} className="text-center py-6 text-muted">No leads assigned.</td></tr>}</tbody></table></div></div>)}
          </>
        )}

        {/* ADD PIPELINE TAB */}
        {activeTab === 'add' && (
          <>
            <div className="page-header"><h1 className="page-title">Add Pipeline</h1></div>
            <ExcelUploader employers={employers} onImport={async (leadsToImport) => { for (const lead of leadsToImport) await onAddLead(lead); }} />
            <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-glass"></div></div><div className="relative flex justify-center text-xs"><span className="bg-bg-deep px-4 text-muted">OR Paste Data Below</span></div></div>
            <div className="glass-card"><h3 className="mb-4 text-gold font-bold text-lg">Paste Excel / CSV Data</h3><p className="text-sm text-secondary mb-6">Select an employer to assign as Caller ID. First row should contain columns: <strong>Business Name, Field, Owner Name, Owner Contact, Country, City, Business Contact, Email, Working Hours, Manager Name, Notes, Total Project Value, Paid To Date, Payment Schedule</strong></p>{importFeedback && <div className={`p-4 rounded mb-6 text-sm flex items-center gap-2 ${importFeedback.type === 'success' ? 'bg-success/10 text-success border border-success/30' : 'bg-orange-dim text-orange border border-orange'}`}>{importFeedback.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}<span>{importFeedback.message}</span></div>}<div className="grid-2 mb-6"><div className="input-group"><label className="input-label">Assign Caller ID to Imported Leads</label><select className="input-field" value={importSelectedEmployer} onChange={(e) => setImportSelectedEmployer(e.target.value)}><option value="">-- Select Caller --</option>{employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username} ({emp.fullName})</option>)}</select></div></div><div className="input-group mb-6"><label className="input-label">Paste Tab-Separated (Excel Copy) or CSV Data</label><textarea className="input-field font-mono text-sm" rows={8} placeholder="Business Name&#9;Field&#9;Owner Name&#9;Owner Contact..." value={rawPastedData} onChange={(e) => setRawPastedData(e.target.value)} /></div><div className="flex gap-4"><button className="btn btn-secondary flex-grow" onClick={handleParsePastedData}><UploadCloud size={16} /> Parse Pasted Text</button><button className="btn btn-primary flex-grow" onClick={handleConfirmImport} disabled={parsedImportRows.length === 0}><Check size={16} /> Confirm Import ({parsedImportRows.length})</button></div></div>
            {parsedImportRows.length > 0 && (<div className="glass-card"><h3 className="mb-4 text-gold font-bold text-lg">Preview Parsed Data</h3><div className="table-container"><table className="custom-table"><thead><tr><th>Business</th><th>Field</th><th>Owner</th><th>Location</th><th>Phone</th><th>Email</th><th>Total Value</th><th>Paid To Date</th><th>Schedule</th><th>Currency</th><th>Notes</th></tr></thead><tbody>{parsedImportRows.map((row, idx) => (<tr key={idx}><td className="font-bold">{row.businessName}</td><td>{row.field}</td><td>{row.ownerName} ({row.ownerContact})</td><td>{row.city}, {row.country}</td><td>{row.businessContact}</td><td>{row.email}</td><td className="text-blue">{row.totalProjectValue || row.paidAmount || 0}</td><td className="text-gold">{row.paidToDate || row.paidAmount || 0}</td><td>{row.paymentSchedule || 'one-time'}</td><td>{row.currency || 'USD'}</td><td className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">{row.notes}</td></tr>))}</tbody></table></div></div>)}
            <div className="glass-card"><h3 className="mb-4 text-gold font-bold text-lg">Manual Lead Entry</h3><button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}><Plus size={16} /> Add Lead Manually</button></div>
            <CurrencySettings onRatesUpdate={setExchangeRates} />
          </>
        )}

        {/* --- COMPANY WEALTH TAB --- */}
{activeTab === 'wealth' && (
  <>
    <div className="page-header">
      <div className="page-header-left">
        <h1 className="page-title">Company Wealth & Balance Sheet</h1>
        <span className="page-subtitle">Complete financial overview of your company</span>
      </div>
    </div>

    <div className="card">
      <div className="card-header">
        <div className="card-title gold">Consolidated Wealth Summary <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '400' }}>(in LKR)</span></div>
      </div>
      
      <div className="grid-3">
        <div 
          className="wealth-card"
          style={{ borderColor: 'rgba(0, 180, 216, 0.2)' }}
          onClick={() => { setSelectedDetailType('revenue'); setShowDetailModal(true); }}
        >
          <div className="wealth-label" style={{ color: '#00b4d8' }}>Total Revenue <span style={{ fontSize: '0.55rem' }}>↗</span></div>
          <div className="wealth-value blue">LKR {stats.totalRevenue.toLocaleString()}</div>
          <div className="wealth-sub">+ Custom: LKR {stats.customIncome.toLocaleString()}</div>
        </div>

        <div 
          className="wealth-card"
          style={{ borderColor: 'rgba(255, 123, 0, 0.2)' }}
          onClick={() => { setSelectedDetailType('expenses'); setShowDetailModal(true); }}
        >
          <div className="wealth-label" style={{ color: '#ff7b00' }}>Total Cost Outflows <span style={{ fontSize: '0.55rem' }}>↗</span></div>
          <div className="wealth-value orange">LKR {stats.totalExpenses.toLocaleString()}</div>
          <div className="wealth-sub">
            Dev: LKR {stats.totalBaseCosts.toLocaleString()} | Comm: LKR {stats.totalCommissions.toLocaleString()} | Sal: LKR {stats.totalSalaries.toLocaleString()}
          </div>
        </div>

        <div 
          className="wealth-card"
          style={{ borderColor: 'rgba(212, 175, 55, 0.2)' }}
          onClick={() => { setSelectedDetailType('profit'); setShowDetailModal(true); }}
        >
          <div className="wealth-label" style={{ color: '#d4af37' }}>Cash Profit <span style={{ fontSize: '0.55rem' }}>↗</span></div>
          <div className="wealth-value" style={{ color: stats.cashProfit >= 0 ? '#38a169' : '#e53e3e' }}>
            LKR {stats.cashProfit.toLocaleString()}
          </div>
          <div className="wealth-sub">Project Profit: LKR {stats.projectProfit.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid-3" style={{ marginTop: '1rem' }}>
        <div className="wealth-card" style={{ borderColor: 'rgba(0, 180, 216, 0.1)', cursor: 'default' }}>
          <div className="wealth-label" style={{ color: '#00b4d8' }}>Total Project Value</div>
          <div className="wealth-value blue">LKR {stats.totalProjectValue.toLocaleString()}</div>
        </div>

        <div className="wealth-card" style={{ borderColor: 'rgba(212, 175, 55, 0.1)', cursor: 'default' }}>
          <div className="wealth-label" style={{ color: '#d4af37' }}>Paid To Date</div>
          <div className="wealth-value gold">LKR {stats.totalPaidToDate.toLocaleString()}</div>
        </div>

        <div 
          className="wealth-card"
          style={{ borderColor: 'rgba(255, 123, 0, 0.2)' }}
          onClick={() => { setSelectedDetailType('outstanding'); setShowDetailModal(true); }}
        >
          <div className="wealth-label" style={{ color: '#ff7b00' }}>Outstanding Balance <span style={{ fontSize: '0.55rem' }}>↗</span></div>
          <div className="wealth-value orange">LKR {stats.outstandingBalance.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <div className="wealth-card" style={{ borderColor: 'rgba(212, 175, 55, 0.1)', cursor: 'default' }}>
          <div className="wealth-label" style={{ color: '#d4af37' }}>Monthly Subscription Revenue</div>
          <div className="wealth-value gold">LKR {stats.monthlySubscriptionRevenue.toLocaleString()}</div>
        </div>

        <div 
          className="wealth-card"
          style={{ borderColor: 'rgba(155, 89, 182, 0.2)' }}
          onClick={() => { setSelectedDetailType('commissions'); setShowDetailModal(true); }}
        >
          <div className="wealth-label" style={{ color: '#9b59b6' }}>Total Developer Salaries <span style={{ fontSize: '0.55rem' }}>↗</span></div>
          <div className="wealth-value purple">LKR {stats.totalSalaries.toLocaleString()}</div>
          <div className="wealth-sub">Active Projects: {stats.subscriptionProjects}</div>
        </div>
      </div>
    </div>

    <div className="card">
      <div className="card-header">
        <div className="card-title gold">Closed Deals Ledgers <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '400' }}>(in LKR)</span></div>
      </div>
      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Currency</th>
              <th>Package</th>
              <th style={{ textAlign: 'right' }}>Total Value</th>
              <th style={{ textAlign: 'right' }}>Paid To Date</th>
              <th style={{ textAlign: 'right' }}>Outstanding</th>
              <th style={{ textAlign: 'right' }}>Dev Cost</th>
              <th style={{ textAlign: 'right' }}>Commissions</th>
              <th style={{ textAlign: 'right' }}>Cash Profit</th>
              <th style={{ textAlign: 'right' }}>Project Profit</th>
            </tr>
          </thead>
          <tbody>
            {profitBreakdown.map((p, idx) => {
              const lead = leads.find(l => l.businessName === p.businessName);
              return (
                <tr key={idx}>
                  <td style={{ fontWeight: '600' }}>{p.businessName}</td>
                  <td>{lead?.currency || 'USD'}</td>
                  <td><span className="badge badge-neutral">{lead?.packageType || 'one-time'}</span></td>
                  <td style={{ textAlign: 'right', color: '#00b4d8', fontWeight: 'bold' }}>LKR {p.totalValue.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', color: '#d4af37', fontWeight: 'bold' }}>LKR {p.paid.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: p.outstanding > 0 ? '#ff7b00' : '#38a169' }}>LKR {p.outstanding.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', color: '#ff7b00' }}>LKR {p.cost.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', color: '#e83e8c' }}>LKR {p.commissions.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: p.cashProfit >= 0 ? '#38a169' : '#e53e3e' }}>LKR {p.cashProfit.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: p.projectProfit >= 0 ? '#38a169' : '#e53e3e' }}>LKR {p.projectProfit.toLocaleString()}</td>
                </tr>
              );
            })}
            {profitBreakdown.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No closed deals recorded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Detail Modal */}
    {renderDetailModal()}
  </>) }

        {/* SCHEDULES TAB */}
        {activeTab === 'schedules' && <ScheduleManagement employers={employers} currentUser="admin" isAdmin={true} />}

      </main>

      {/* EDIT MODAL */}
      {isEditModalOpen && editingLead && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="flex justify-between items-center border-b border-glass pb-4 mb-6"><h2 className="text-xl font-bold text-gold">Edit Lead: {editingLead.businessName}</h2><button onClick={() => setIsEditModalOpen(false)} className="text-muted hover:text-white"><X size={24} /></button></div>
            <div className="modal-grid">
              <div className="input-group"><label className="input-label">Business Name</label><input type="text" className="input-field" value={editingLead.businessName} onChange={(e) => setEditingLead({ ...editingLead, businessName: e.target.value })} /></div>
              <div className="input-group"><label className="input-label">Field</label><input type="text" className="input-field" value={editingLead.field} onChange={(e) => setEditingLead({ ...editingLead, field: e.target.value })} /></div>
              <div className="input-group"><label className="input-label">Owner Name</label><input type="text" className="input-field" value={editingLead.ownerName} onChange={(e) => setEditingLead({ ...editingLead, ownerName: e.target.value })} /></div>
              <div className="input-group"><label className="input-label">Owner Contact</label><input type="text" className="input-field" value={editingLead.ownerContact} onChange={(e) => setEditingLead({ ...editingLead, ownerContact: e.target.value })} /></div>
              <div className="input-group"><label className="input-label">Country</label><input type="text" className="input-field" value={editingLead.country} onChange={(e) => setEditingLead({ ...editingLead, country: e.target.value })} /></div>
              <div className="input-group"><label className="input-label">City</label><input type="text" className="input-field" value={editingLead.city} onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })} /></div>
              <div className="input-group"><label className="input-label">Business Contact</label><input type="text" className="input-field" value={editingLead.businessContact} onChange={(e) => setEditingLead({ ...editingLead, businessContact: e.target.value })} /></div>
              <div className="input-group"><label className="input-label">Email</label><input type="email" className="input-field" value={editingLead.email} onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })} /></div>
              <div className="input-group"><label className="input-label">Response</label><select className="input-field" value={editingLead.response} onChange={(e) => setEditingLead({ ...editingLead, response: e.target.value as any })}><option value="none">No Response</option><option value="positive">Positive</option><option value="negative">Negative</option></select></div>
              <div className="input-group"><label className="input-label">Package Type</label><select className="input-field" value={editingLead.packageType} onChange={(e) => setEditingLead({ ...editingLead, packageType: e.target.value as any })}><option value="none">None</option><option value="one-time">One-time</option><option value="subscription">Subscription</option></select></div>
              <div className="input-group"><label className="input-label">Paid Amount</label><input type="number" className="input-field" value={editingLead.paidAmount} onChange={(e) => setEditingLead({ ...editingLead, paidAmount: Number(e.target.value) || 0 })} /></div>
              <div className="input-group"><label className="input-label">Total Project Value</label><input type="number" className="input-field" value={editingLead.totalProjectValue || editingLead.paidAmount} onChange={(e) => setEditingLead({ ...editingLead, totalProjectValue: Number(e.target.value) || 0 })} /></div>
              <div className="input-group"><label className="input-label">Paid To Date</label><input type="number" className="input-field" value={editingLead.paidToDate || editingLead.paidAmount} onChange={(e) => setEditingLead({ ...editingLead, paidToDate: Number(e.target.value) || 0 })} /></div>
              <div className="input-group"><label className="input-label">Currency</label><select className="input-field" value={editingLead.currency || 'USD'} onChange={(e) => setEditingLead({ ...editingLead, currency: e.target.value })}>{SUPPORTED_CURRENCIES.map(curr => <option key={curr.code} value={curr.code}>{curr.code}</option>)}</select></div>
              <div className="input-group"><label className="input-label">Cost</label><input type="number" className="input-field" value={editingLead.cost} onChange={(e) => setEditingLead({ ...editingLead, cost: Number(e.target.value) || 0 })} /></div>
              <div className="input-group"><label className="input-label">Caller</label><select className="input-field" value={editingLead.caller} onChange={(e) => setEditingLead({ ...editingLead, caller: e.target.value })}><option value="">Unassigned</option>{employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username}</option>)}</select></div>
              <div className="input-group"><label className="input-label">Engineer 1</label><select className="input-field" value={editingLead.engineer1} onChange={(e) => setEditingLead({ ...editingLead, engineer1: e.target.value })}><option value="">None</option>{employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username}</option>)}</select></div>
              <div className="input-group"><label className="input-label">Engineer 2</label><select className="input-field" value={editingLead.engineer2} onChange={(e) => setEditingLead({ ...editingLead, engineer2: e.target.value })}><option value="">None</option>{employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username}</option>)}</select></div>
              <div className="input-group"><label className="input-label">Engineer 3</label><select className="input-field" value={editingLead.engineer3} onChange={(e) => setEditingLead({ ...editingLead, engineer3: e.target.value })}><option value="">None</option>{employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username}</option>)}</select></div>
              <div className="input-group" style={{ gridColumn: 'span 2' }}><label className="input-label">Notes</label><textarea className="input-field" rows={2} value={editingLead.notes} onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })} /></div>
              <div className="input-group" style={{ gridColumn: 'span 2' }}><label className="input-label">Follow-up</label><textarea className="input-field" rows={2} value={editingLead.followUp} onChange={(e) => setEditingLead({ ...editingLead, followUp: e.target.value })} /></div>
            </div>
            <div className="flex gap-4 mt-6 border-t border-glass pt-4 justify-end"><button className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button></div>
          </div>
        </div>
      )}

      {/* ADD LEAD MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="flex justify-between items-center border-b border-glass pb-4 mb-6"><h2 className="text-xl font-bold text-gold">Add New Pipeline Lead</h2><button onClick={() => setIsAddModalOpen(false)} className="text-muted hover:text-white"><X size={24} /></button></div>
            <form onSubmit={handleAddManualLead}>
              <div className="modal-grid">
                <div className="input-group"><label className="input-label">Business Name *</label><input type="text" className="input-field" required value={newLeadForm.businessName} onChange={(e) => setNewLeadForm({ ...newLeadForm, businessName: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Field</label><input type="text" className="input-field" value={newLeadForm.field} onChange={(e) => setNewLeadForm({ ...newLeadForm, field: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Owner Name</label><input type="text" className="input-field" value={newLeadForm.ownerName} onChange={(e) => setNewLeadForm({ ...newLeadForm, ownerName: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Owner Contact</label><input type="text" className="input-field" value={newLeadForm.ownerContact} onChange={(e) => setNewLeadForm({ ...newLeadForm, ownerContact: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Country</label><input type="text" className="input-field" value={newLeadForm.country} onChange={(e) => setNewLeadForm({ ...newLeadForm, country: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">City</label><input type="text" className="input-field" value={newLeadForm.city} onChange={(e) => setNewLeadForm({ ...newLeadForm, city: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Business Contact</label><input type="text" className="input-field" value={newLeadForm.businessContact} onChange={(e) => setNewLeadForm({ ...newLeadForm, businessContact: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Email</label><input type="email" className="input-field" value={newLeadForm.email} onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Response</label><select className="input-field" value={newLeadForm.response} onChange={(e) => setNewLeadForm({ ...newLeadForm, response: e.target.value as any })}><option value="none">No Response</option><option value="positive">Positive</option><option value="negative">Negative</option></select></div>
                <div className="input-group"><label className="input-label">Package Type</label><select className="input-field" value={newLeadForm.packageType} onChange={(e) => setNewLeadForm({ ...newLeadForm, packageType: e.target.value as any })}><option value="none">None</option><option value="one-time">One-time</option><option value="subscription">Subscription</option></select></div>
                <div className="input-group"><label className="input-label">Total Project Value</label><input type="number" className="input-field" value={newLeadForm.totalProjectValue} onChange={(e) => setNewLeadForm({ ...newLeadForm, totalProjectValue: Number(e.target.value) || 0 })} /></div>
                <div className="input-group"><label className="input-label">Paid To Date</label><input type="number" className="input-field" value={newLeadForm.paidToDate} onChange={(e) => setNewLeadForm({ ...newLeadForm, paidToDate: Number(e.target.value) || 0 })} /></div>
                <div className="input-group"><label className="input-label">Currency</label><select className="input-field" value={newLeadForm.currency || 'USD'} onChange={(e) => setNewLeadForm({ ...newLeadForm, currency: e.target.value })}>{SUPPORTED_CURRENCIES.map(curr => <option key={curr.code} value={curr.code}>{curr.code}</option>)}</select></div>
                <div className="input-group"><label className="input-label">Caller</label><select className="input-field" value={newLeadForm.caller} onChange={(e) => setNewLeadForm({ ...newLeadForm, caller: e.target.value })}><option value="">Unassigned</option>{employers.map(emp => <option key={emp.username} value={emp.username}>@{emp.username}</option>)}</select></div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}><label className="input-label">Notes</label><textarea className="input-field" rows={2} value={newLeadForm.notes} onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })} /></div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}><label className="input-label">Follow-up</label><textarea className="input-field" rows={2} value={newLeadForm.followUp} onChange={(e) => setNewLeadForm({ ...newLeadForm, followUp: e.target.value })} /></div>
              </div>
              <div className="flex gap-4 mt-6 border-t border-glass pt-4 justify-end"><button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create Lead</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};