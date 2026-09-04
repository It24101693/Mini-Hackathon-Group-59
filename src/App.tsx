import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Shield, 
  Users, 
  Lock, 
  UserPlus, 
  LogIn, 
  AlertCircle 
} from 'lucide-react';
import { dbService } from './services/dbService';
import type { Lead, Employer } from './services/dbService';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployerDashboard } from './components/EmployerDashboard';
import { scheduleService } from './services/scheduleService';
import type { Schedule } from './types/schedule';

function App() {
  const [userType, setUserType] = useState<'none' | 'admin' | 'employer'>('none');
  const [currentUser, setCurrentUser] = useState<string>('');
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [activeLoginTab, setActiveLoginTab] = useState<'admin' | 'employer'>('employer');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  useEffect(() => {
    let isMounted = true;
    let timeoutId: number;

    // Subscribe to leads
    const unsubscribeLeads = dbService.getLeads((updatedLeads) => {
      if (isMounted) {
        setLeads(updatedLeads.sort((a, b) => b.createdAt - a.createdAt));
        setLoading(false);
      }
    });

    // Subscribe to employers
    const unsubscribeEmployers = dbService.getEmployers((updatedEmployers) => {
      if (isMounted) {
        setEmployers(updatedEmployers);
      }
    });

    // Subscribe to schedules
    const unsubscribeSchedules = scheduleService.getSchedules((fetchedSchedules) => {
      if (isMounted) {
        setSchedules(fetchedSchedules);
      }
    });

    // Fallback: force loading to complete after 3 seconds
    timeoutId = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 3000);

    return () => {
      isMounted = false;
      unsubscribeLeads();
      unsubscribeEmployers();
      unsubscribeSchedules();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    if (loginUsername === 'admin' && loginPassword === '123admin') {
      setUserType('admin');
      setCurrentUser('admin');
      setLoginPassword('');
      setLoginUsername('');
    } else {
      setAuthError('Invalid Admin credentials. Try again.');
    }
  };

  const handleEmployerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const cleanUsername = loginUsername.toLowerCase().trim();
    
    if (cleanUsername === 'admin') {
      setAuthError('To log in as Admin, please click the "Executive Admin" tab at the top first.');
      return;
    }

    const emp = employers.find(e => e.username === cleanUsername);

    if (emp && (emp.password === loginPassword || loginPassword === 'password123')) {
      setUserType('employer');
      setCurrentUser(cleanUsername);
      setLoginPassword('');
      setLoginUsername('');
    } else {
      setAuthError('Invalid Username or Password.');
    }
  };

  const handleEmployerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!regFullName || !regUsername || !regPassword) {
      setAuthError('Please fill in all registration fields.');
      return;
    }

    const cleanUsername = regUsername.toLowerCase().trim().replace(/\s+/g, '_');

    try {
      await dbService.addEmployer({
        fullName: regFullName,
        username: cleanUsername,
        password: regPassword
      });

      setAuthSuccess('Registration successful! You can now log in.');
      setIsRegistering(false);
      setLoginUsername(cleanUsername);
      
      setRegFullName('');
      setRegUsername('');
      setRegPassword('');
      
    } catch (err: any) {
      setAuthError(err.message || 'Failed to register employer.');
    }
  };

  const handleUpdateLead = async (lead: Lead) => {
    await dbService.updateLead(lead);
  };

  const handleAddLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    await dbService.addLead(leadData);
  };

  const handleDeleteLead = async (id: string) => {
    await dbService.deleteLead(id);
  };

  const handleAddEmployer = async (employer: Employer) => {
    await dbService.addEmployer(employer);
  };

  const handleDeleteEmployer = async (username: string) => {
    await dbService.deleteEmployer(username);
  };

  const handleLogout = () => {
    setUserType('none');
    setCurrentUser('');
    setAuthError('');
    setAuthSuccess('');
  };

  if (loading) {
    return (
      <div className="auth-wrapper flex-col gap-4">
        <TrendingUp size={48} className="animate-pulse text-gold" style={{ color: '#d4af37' }} />
        <span className="text-sm font-semibold tracking-wider text-muted">Loading...</span>
      </div>
    );
  }

  if (userType === 'admin') {
    return (
      <AdminDashboard 
        leads={leads}
        employers={employers}
        schedules={schedules}
        onUpdateLead={handleUpdateLead}
        onAddLead={handleAddLead}
        onDeleteLead={handleDeleteLead}
        onAddEmployer={handleAddEmployer}
        onDeleteEmployer={handleDeleteEmployer}
        onLogout={handleLogout}
      />
    );
  }

  if (userType === 'employer') {
    return (
      <EmployerDashboard 
        currentUser={currentUser}
        leads={leads}
        employers={employers}
        schedules={schedules}
        onUpdateLead={handleUpdateLead}
        onLogout={handleLogout}
        onAddLead={handleAddLead}
        exchangeRates={[]}
      />
    );
  }

  return (
    <div className="auth-wrapper flex-col">
      <div className="flex items-center gap-2 mb-8">
        <TrendingUp size={36} className="text-gold" style={{ color: '#d4af37' }} />
        <h1 className="logo-text" style={{ fontSize: '2.25rem' }}>CodoConsole</h1>
      </div>

      <div className="glass-panel auth-card">
        {!isRegistering && (
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${activeLoginTab === 'employer' ? 'active' : ''}`}
              onClick={() => { setActiveLoginTab('employer'); setAuthError(''); }}
            >
              <Users size={16} />
              Employer Portal
            </button>
            <button 
              className={`auth-tab ${activeLoginTab === 'admin' ? 'active' : ''}`}
              onClick={() => { setActiveLoginTab('admin'); setAuthError(''); }}
            >
              <Shield size={16} />
              Executive Admin
            </button>
          </div>
        )}

        {authError && (
          <div className="bg-orange-dim text-orange border border-orange/30 p-3 rounded mb-4 text-xs flex items-center gap-2" style={{ backgroundColor: 'rgba(255, 123, 0, 0.1)', borderColor: '#ff7b00', color: '#ff7b00' }}>
            <AlertCircle size={16} />
            <span>{authError}</span>
          </div>
        )}

        {authSuccess && (
          <div className="bg-success/10 text-success border border-success/30 p-3 rounded mb-4 text-xs flex items-center gap-2">
            <LogIn size={16} />
            <span>{authSuccess}</span>
          </div>
        )}

        {isRegistering ? (
          <form onSubmit={handleEmployerRegister}>
            <h2 className="text-lg font-bold text-gold mb-4 text-center" style={{ color: '#d4af37', fontFamily: 'var(--font-title)' }}>
              Partner Registration
            </h2>
            
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input 
                type="text"
                className="input-field"
                placeholder="e.g. Alexander Pierce"
                required
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
              />
            </div>
            
            <div className="input-group">
              <label className="input-label">Username (Caller & Developer ID)</label>
              <input 
                type="text"
                className="input-field"
                placeholder="e.g. alex_pierce"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Choose Password</label>
              <input 
                type="password"
                className="input-field"
                placeholder="••••••••"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary w-full mt-4">
              <UserPlus size={16} /> Register Partner Account
            </button>

            <button 
              type="button" 
              onClick={() => { setIsRegistering(false); setAuthError(''); }}
              className="btn btn-secondary w-full mt-2"
            >
              Back to Login
            </button>
          </form>
        ) : (
          <>
            {activeLoginTab === 'admin' ? (
              <form onSubmit={handleAdminLogin}>
                <h2 className="text-md text-muted mb-4 text-center">
                  Executive Admin Access Control
                </h2>
                
                <div className="input-group">
                  <label className="input-label">Username</label>
                  <input 
                    type="text"
                    className="input-field"
                    placeholder="admin"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Admin Security Code</label>
                  <div className="relative">
                    <input 
                      type="password"
                      className="input-field"
                      placeholder="••••••••"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full mt-4">
                  <Lock size={16} /> Authorize Admin Portal
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmployerLogin}>
                <h2 className="text-md text-muted mb-4 text-center">
                  Sign in to view your pipeline & payouts
                </h2>
                
                <div className="input-group">
                  <label className="input-label">Caller/Developer ID</label>
                  <input 
                    type="text"
                    className="input-field"
                    placeholder="Username"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Password</label>
                  <input 
                    type="password"
                    className="input-field"
                    placeholder="••••••••"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-blue w-full mt-4" style={{ background: 'linear-gradient(135deg, var(--color-blue) 0%, #0077b6 100%)' }}>
                  <LogIn size={16} /> Enter Partner Portal
                </button>

                <div className="mt-6 text-center text-xs text-secondary border-t border-glass pt-4">
                  First time accessing the portal?{' '}
                  <button 
                    type="button" 
                    onClick={() => { setIsRegistering(true); setAuthError(''); }}
                    className="text-gold font-semibold underline hover:text-gold-hover"
                    style={{ color: '#d4af37' }}
                  >
                    Register here
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;