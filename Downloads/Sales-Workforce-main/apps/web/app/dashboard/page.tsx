'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  Sliders,
  DollarSign,
  TrendingUp,
  Receipt,
  UserCheck,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  BellRing,
  Plus,
  RefreshCw
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  role: string;
  baseSalary: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // States for lists
  const [salesLedger, setSalesLedger] = useState<any[]>([]);
  const [purchaseLedger, setPurchaseLedger] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'purchases' | 'expenses' | 'attendance' | 'payroll' | 'configs'>('overview');

  // Input states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Config state
  const [thresholdValue, setThresholdValue] = useState<number>(5000);

  // Expense action states
  const [actionRemark, setActionRemark] = useState<{ [key: string]: string }>({});

  // Payroll run states
  const [payrollEmp, setPayrollEmp] = useState('');
  const [payrollStart, setPayrollStart] = useState('2026-07-01');
  const [payrollEnd, setPayrollEnd] = useState('2026-07-30');
  const [payrollPreview, setPayrollPreview] = useState<any | null>(null);
  const [payrollMessage, setPayrollMessage] = useState('');

  // Load state and authenticate
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!savedToken || !savedUser) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
      return;
    }

    try {
      setToken(savedToken);
      setCurrentUser(JSON.parse(savedUser));
    } catch (e) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  }, [router]);

  // Fetch initial data once token is set
  useEffect(() => {
    if (token && currentUser) {
      fetchData();
    }
  }, [token, currentUser]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const fetchWithAuth = async (url: string) => {
        const res = await fetch(url, { headers });
        if (res.status === 401) {
          logout();
          throw new Error('Session expired');
        }
        return res;
      };

      // Load Configs
      const configRes = await fetchWithAuth('http://localhost:5001/api/config');
      if (configRes.ok) {
        const data = await configRes.json();
        setConfigs(data);
        const autoApprove = data.find((c: any) => c.key === 'EXPENSE_AUTO_APPROVE_THRESHOLD');
        if (autoApprove) setThresholdValue(Number(autoApprove.value));
      }

      // Load Sales
      if (currentUser?.role !== 'PURCHASER') {
        const salesRes = await fetchWithAuth('http://localhost:5001/api/ledger/sales');
        if (salesRes.ok) setSalesLedger(await salesRes.json());
      }

      // Load Purchases
      if (currentUser?.role !== 'SALESPERSON') {
        const purchaseRes = await fetchWithAuth('http://localhost:5001/api/ledger/purchases');
        if (purchaseRes.ok) setPurchaseLedger(await purchaseRes.json());
      }

      // Load Expenses
      const expenseRes = await fetchWithAuth('http://localhost:5001/api/expense');
      if (expenseRes.ok) setExpenses(await expenseRes.json());

      // Load Attendance
      const attRes = await fetchWithAuth('http://localhost:5001/api/attendance/history');
      if (attRes.ok) setAttendance(await attRes.json());

      // Load Notifications
      const notifRes = await fetchWithAuth('http://localhost:5001/api/notifications');
      if (notifRes.ok) setNotifications(await notifRes.json());

      // Load Payouts
      const payoutRes = await fetchWithAuth('http://localhost:5001/api/payroll/history');
      if (payoutRes.ok) setPayouts(await payoutRes.json());

      // Load Employees (Admin/TopManagement/Supervisor only)
      if (['ADMIN', 'TOP_MANAGEMENT', 'SUPERVISOR'].includes(currentUser?.role || '')) {
        const empRes = await fetchWithAuth('http://localhost:5001/api/auth/employees');
        if (empRes.ok) {
          const empList = await empRes.json();
          setEmployees(empList);
          if (empList.length > 0) setPayrollEmp(empList[0]._id);
        }
      }

    } catch (err: any) {
      if (err.message !== 'Session expired') {
        setError('Could not connect to backend server. Make sure database and api are online.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (!token) return;
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const res = await fetch('http://localhost:5001/api/config', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ key: 'EXPENSE_AUTO_APPROVE_THRESHOLD', value: thresholdValue }),
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        alert('Master auto-approval threshold updated successfully!');
        fetchData();
      } else {
        const d = await res.json();
        alert(`Error: ${d.message}`);
      }
    } catch (e) {
      alert('Network error.');
    }
  };

  const handleExpenseAction = async (id: string, action: 'approve' | 'reject') => {
    if (!token) return;
    try {
      const remark = actionRemark[id] || '';
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const res = await fetch(`http://localhost:5001/api/expense/${id}/${action}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ remark }),
      });
      if (res.status === 401) {
        logout();
        return;
      }

      if (res.ok) {
        alert(`Expense ${action}d successfully.`);
        setActionRemark({ ...actionRemark, [id]: '' });
        fetchData();
      } else {
        const d = await res.json();
        alert(`Action failed: ${d.message}`);
      }
    } catch (e) {
      alert('Network error.');
    }
  };

  const handlePayrollPreview = async () => {
    if (!token) return;
    setPayrollMessage('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`http://localhost:5001/api/payroll/preview?employeeId=${payrollEmp}&startDate=${payrollStart}&endDate=${payrollEnd}`, { headers });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        setPayrollPreview(await res.json());
      } else {
        const d = await res.json();
        setPayrollMessage(`Preview failed: ${d.message}`);
      }
    } catch (e) {
      setPayrollMessage('Error previewing payroll.');
    }
  };

  const handleRunPayroll = async () => {
    if (!token) return;
    setPayrollMessage('');
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const res = await fetch('http://localhost:5001/api/payroll/run', {
        method: 'POST',
        headers,
        body: JSON.stringify({ employeeId: payrollEmp, startDate: payrollStart, endDate: payrollEnd }),
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const d = await res.json();
      if (res.ok) {
        setPayrollMessage('Payroll run complete. Payout record generated.');
        setPayrollPreview(null);
        fetchData();
      } else {
        setPayrollMessage(`Run failed: ${d.message}`);
      }
    } catch (e) {
      setPayrollMessage('Error running payroll.');
    }
  };

  const logout = () => {
    localStorage.clear();
    router.push('/');
  };

  if (!currentUser) return <div style={{ padding: '20px' }}>Loading session...</div>;

  // Compute stats
  const totalSales = salesLedger.reduce((sum, item) => sum + item.amount, 0);
  const totalPurchases = purchaseLedger.reduce((sum, item) => sum + item.amount, 0);
  const pendingApprovalsCount = expenses.filter((e) => e.status === 'PENDING').length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'ltr' }}>
      
      {/* Sidebar Navigation */}
      <div className="glass" style={{
        width: 'var(--sidebar-w)',
        borderRight: '1px solid var(--panel-border)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        borderRadius: 0,
      }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.5px' }}>Sales & Workforce</h2>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Logged in as: <b>{currentUser.username}</b></p>
          <span style={{
            display: 'inline-block',
            marginTop: '6px',
            background: 'var(--panel-border)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--accent-primary)',
          }}>{currentUser.role}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp, roles: ['ADMIN', 'TOP_MANAGEMENT', 'SUPERVISOR', 'SALESPERSON', 'PURCHASER'] },
            { id: 'sales', label: 'Sales Ledger', icon: DollarSign, roles: ['ADMIN', 'TOP_MANAGEMENT', 'SUPERVISOR', 'SALESPERSON'] },
            { id: 'purchases', label: 'Purchase Ledger', icon: Receipt, roles: ['ADMIN', 'TOP_MANAGEMENT', 'SUPERVISOR', 'PURCHASER'] },
            { id: 'expenses', label: 'Expenses (TA/DA)', icon: FileSpreadsheet, roles: ['ADMIN', 'TOP_MANAGEMENT', 'SUPERVISOR', 'SALESPERSON', 'PURCHASER'] },
            { id: 'attendance', label: 'Attendance Logs', icon: UserCheck, roles: ['ADMIN', 'TOP_MANAGEMENT', 'SUPERVISOR', 'SALESPERSON', 'PURCHASER'] },
            { id: 'payroll', label: 'Payroll Engine', icon: Calendar, roles: ['ADMIN', 'TOP_MANAGEMENT', 'SUPERVISOR', 'SALESPERSON', 'PURCHASER'] },
            { id: 'configs', label: 'System Configurations', icon: Sliders, roles: ['ADMIN'] }
          ]
            .filter((tab) => tab.roles.includes(currentUser.role))
            .map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '12px 14px',
                    background: activeTab === tab.id ? 'var(--panel-border)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { if(activeTab !== tab.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseOut={(e) => { if(activeTab !== tab.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
        </div>

        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '12px 14px',
            background: 'transparent',
            border: '1px solid rgba(248, 81, 73, 0.3)',
            borderRadius: '8px',
            color: 'var(--error)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {/* Main Panel Area */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.75px' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Panel
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Real-time synchronization and oversight workspace.</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="glow-btn"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={14} />
            Sync Refresh
          </button>
        </div>

        {error && (
          <div className="glass" style={{ background: 'rgba(248, 81, 73, 0.1)', borderColor: 'rgba(248, 81, 73, 0.2)', padding: '16px', borderRadius: '8px', color: 'var(--error)' }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><AlertTriangle size={18} /> {error}</p>
          </div>
        )}

        {/* Tab contents */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* YoY / Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {currentUser.role !== 'PURCHASER' && (
                <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Sales Volume</span>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>${totalSales.toLocaleString()}</span>
                  <span style={{ fontSize: '11px', color: 'var(--success)' }}>+14.2% YoY growth</span>
                </div>
              )}
              {currentUser.role !== 'SALESPERSON' && (
                <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Purchase Cost</span>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>${totalPurchases.toLocaleString()}</span>
                  <span style={{ fontSize: '11px', color: 'var(--warning)' }}>Controlled expenditure</span>
                </div>
              )}
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Pending Approvals</span>
                <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>{pendingApprovalsCount}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Expenses awaiting audit</span>
              </div>
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Auto-Approval Limit</span>
                <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>${thresholdValue}</span>
                <span style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>Master configuration</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* Push notifications audit log */}
              <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BellRing size={16} color="var(--accent-primary)" />
                  Mock Push Notifications Audit Trail
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  Stub hooks in the backend push service persist records here for inspection.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', padding: '10px', textAlign: 'center' }}>No notifications sent yet.</div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif._id} style={{
                        padding: '12px',
                        background: 'rgba(0, 0, 0, 0.15)',
                        borderLeft: '3px solid var(--accent-primary)',
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, fontSize: '12px' }}>{notif.title}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            {new Date(notif.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{notif.body}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* YoY Chart Stub */}
              <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>MoM Transaction Overview (YoY stub)</h3>
                <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '8px', padding: '10px 0' }}>
                  {[
                    { month: 'Jan', val: 40 },
                    { month: 'Feb', val: 65 },
                    { month: 'Mar', val: 50 },
                    { month: 'Apr', val: 80 },
                    { month: 'May', val: 95 },
                    { month: 'Jun', val: 120 }
                  ].map((d) => (
                    <div key={d.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                      <div style={{
                        width: '100%',
                        height: `${d.val}px`,
                        background: 'linear-gradient(to top, var(--accent-primary), rgba(31,111,235,0.4))',
                        borderRadius: '4px',
                        boxShadow: '0 0 10px rgba(31,111,235,0.2)'
                      }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{d.month}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {activeTab === 'sales' && (
          <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px' }}>Salesperson</th>
                  <th style={{ padding: '12px' }}>Brand</th>
                  <th style={{ padding: '12px' }}>SKU</th>
                  <th style={{ padding: '12px' }}>Quantity</th>
                  <th style={{ padding: '12px' }}>Price</th>
                  <th style={{ padding: '12px' }}>Total Amount</th>
                  <th style={{ padding: '12px' }}>Type</th>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px' }}>Proforma Invoice</th>
                </tr>
              </thead>
              <tbody>
                {salesLedger.map((row) => (
                  <tr key={row._id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                    <td style={{ padding: '12px', fontWeight: 550 }}>{row.salespersonId?.username || 'Synced Rep'}</td>
                    <td style={{ padding: '12px' }}>{row.brand}</td>
                    <td style={{ padding: '12px' }}>{row.sku}</td>
                    <td style={{ padding: '12px' }}>{row.quantity}</td>
                    <td style={{ padding: '12px' }}>${row.price}</td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>${row.amount}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        background: row.type === 'PRIMARY' ? 'rgba(31,111,235,0.15)' : 'rgba(35,134,54,0.15)',
                        color: row.type === 'PRIMARY' ? 'var(--accent-primary)' : 'var(--success)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}>{row.type}</span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{new Date(row.date).toLocaleDateString()}</td>
                    <td style={{ padding: '12px' }}>
                      {row.invoiceUrl ? (
                        <a
                          href={`http://localhost:5001${row.invoiceUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                        >
                          View Invoice (PDF)
                        </a>
                      ) : 'Generating...'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'purchases' && (
          <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px' }}>Purchaser</th>
                  <th style={{ padding: '12px' }}>Brand</th>
                  <th style={{ padding: '12px' }}>SKU</th>
                  <th style={{ padding: '12px' }}>Quantity</th>
                  <th style={{ padding: '12px' }}>Price</th>
                  <th style={{ padding: '12px' }}>Total Amount</th>
                  <th style={{ padding: '12px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {purchaseLedger.map((row) => (
                  <tr key={row._id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                    <td style={{ padding: '12px', fontWeight: 550 }}>{row.purchaserId?.username || 'Synced Rep'}</td>
                    <td style={{ padding: '12px' }}>{row.brand}</td>
                    <td style={{ padding: '12px' }}>{row.sku}</td>
                    <td style={{ padding: '12px' }}>{row.quantity}</td>
                    <td style={{ padding: '12px' }}>${row.price}</td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>${row.amount}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{new Date(row.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {expenses.map((exp) => (
              <div key={exp._id} className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600 }}>${exp.amount}</h3>
                      <span style={{
                        background: exp.status === 'APPROVED' ? 'rgba(35,134,54,0.15)' : exp.status === 'REJECTED' ? 'rgba(248,81,73,0.15)' : 'rgba(210,153,34,0.15)',
                        color: exp.status === 'APPROVED' ? 'var(--success)' : exp.status === 'REJECTED' ? 'var(--error)' : 'var(--warning)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}>{exp.status}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Claimed by: <b>{exp.employeeId?.username}</b> ({exp.employeeId?.role}) | Category: <b>{exp.category}</b>
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Submitted on {new Date(exp.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{exp.description || 'No description provided.'}</p>

                {exp.receiptUrl && (
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Receipt Attachment:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" style={{
                        color: 'var(--accent-primary)',
                        fontSize: '12px',
                        textDecoration: 'underline',
                      }}>View receipt image</a>
                    </div>
                  </div>
                )}

                {/* Approval chain steps visual */}
                {exp.approvalChain && exp.approvalChain.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Approval Chain Progress:</span>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      {exp.approvalChain.map((step: any) => (
                        <div key={step.step} style={{
                          padding: '10px 14px',
                          background: 'rgba(0,0,0,0.2)',
                          border: '1px solid var(--panel-border)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>Step {step.step}: {step.requiredRole}</span>
                          <span style={{
                            fontSize: '10px',
                            color: step.status === 'APPROVED' ? 'var(--success)' : step.status === 'REJECTED' ? 'var(--error)' : 'var(--warning)',
                            fontWeight: 500,
                          }}>{step.status}</span>
                          {step.approverId && (
                            <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                              Approved by {step.approverId.username}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Trail logs */}
                {exp.auditTrail && exp.auditTrail.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Audit Log history:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {exp.auditTrail.map((log: any) => (
                        <div key={log._id} style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          • {new Date(log.timestamp).toLocaleString()} | <b>{log.status}</b> by {log.actorId?.username || 'System'}: <i>{log.remark}</i>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action forms for supervisor/management */}
                {exp.status === 'PENDING' && (
                  <div style={{
                    borderTop: '1px solid var(--panel-border)',
                    paddingTop: '16px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                  }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Add reviewer remark..."
                      style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
                      value={actionRemark[exp._id] || ''}
                      onChange={(e) => setActionRemark({ ...actionRemark, [exp._id]: e.target.value })}
                    />
                    <button
                      onClick={() => handleExpenseAction(exp._id, 'approve')}
                      className="glow-btn"
                      style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        background: 'var(--success)',
                        boxShadow: '0 0 10px var(--success-glow)',
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleExpenseAction(exp._id, 'reject')}
                      className="glow-btn"
                      style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        background: 'var(--error)',
                        boxShadow: 'none',
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px' }}>Employee</th>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px' }}>Check-In Time</th>
                  <th style={{ padding: '12px' }}>Check-In GPS</th>
                  <th style={{ padding: '12px' }}>Check-Out Time</th>
                  <th style={{ padding: '12px' }}>Check-Out GPS</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((row) => (
                  <tr key={row._id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                    <td style={{ padding: '12px', fontWeight: 550 }}>{row.employeeId?.username}</td>
                    <td style={{ padding: '12px' }}>{row.date}</td>
                    <td style={{ padding: '12px' }}>{new Date(row.checkInTime).toLocaleTimeString()}</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {row.gpsCheckIn?.latitude.toFixed(4)}, {row.gpsCheckIn?.longitude.toFixed(4)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {row.checkOutTime ? new Date(row.checkOutTime).toLocaleTimeString() : 'Active Shift'}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {row.gpsCheckOut ? `${row.gpsCheckOut.latitude.toFixed(4)}, ${row.gpsCheckOut.longitude.toFixed(4)}` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'payroll' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Payroll run controller console */}
            {['ADMIN', 'TOP_MANAGEMENT'].includes(currentUser.role) && (
              <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Execute Payroll Settlement Cycle</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Employee</label>
                    <select
                      className="input-field"
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                      value={payrollEmp}
                      onChange={(e) => setPayrollEmp(e.target.value)}
                    >
                      {employees.map((e) => (
                        <option key={e._id} value={e._id}>{e.username} ({e.role})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Start Date</label>
                    <input
                      type="date"
                      className="input-field"
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                      value={payrollStart}
                      onChange={(e) => setPayrollStart(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>End Date</label>
                    <input
                      type="date"
                      className="input-field"
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                      value={payrollEnd}
                      onChange={(e) => setPayrollEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button onClick={handlePayrollPreview} className="glow-btn" style={{ padding: '10px 20px', fontSize: '13px' }}>
                    Run Preview Analysis
                  </button>
                  {payrollPreview && (
                    <button
                      onClick={handleRunPayroll}
                      className="glow-btn"
                      style={{ padding: '10px 20px', fontSize: '13px', background: 'var(--success)', boxShadow: '0 0 10px var(--success-glow)' }}
                    >
                      Confirm Payout Generation
                    </button>
                  )}
                </div>

                {payrollMessage && (
                  <p style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '6px' }}>{payrollMessage}</p>
                )}

                {payrollPreview && (
                  <div className="glass" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <h4 style={{ fontWeight: 600, borderBottom: '1px solid var(--panel-border)', paddingBottom: '6px' }}>Payroll Preview Aggregation Analysis</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>Employee: <b>{payrollPreview.employeeName}</b></div>
                      <div>Base Monthly Salary: <b>${payrollPreview.baseSalary}</b></div>
                      <div>GPS Check-In Days: <b>{payrollPreview.attendanceDays} days</b></div>
                      <div>Pro-rated Salary: <b>${payrollPreview.baseSalaryPart}</b></div>
                      <div>Approved Expense claims (TA/DA): <b>${payrollPreview.expenseClaimsPart}</b></div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        Net Payout: ${payrollPreview.totalPayout}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payout History */}
            <div className="glass" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Generated Payout History logs</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px' }}>Employee</th>
                    <th style={{ padding: '12px' }}>Cycle Range</th>
                    <th style={{ padding: '12px' }}>Attendance Days</th>
                    <th style={{ padding: '12px' }}>Prorated Base</th>
                    <th style={{ padding: '12px' }}>TA/DA Additions</th>
                    <th style={{ padding: '12px' }}>Net Payout</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Audited By</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout._id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                      <td style={{ padding: '12px', fontWeight: 550 }}>{payout.employeeId?.username}</td>
                      <td style={{ padding: '12px' }}>
                        {new Date(payout.startDate).toLocaleDateString()} - {new Date(payout.endDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px' }}>{payout.attendanceDays} days</td>
                      <td style={{ padding: '12px' }}>${payout.baseSalaryPart}</td>
                      <td style={{ padding: '12px' }}>${payout.expenseClaimsPart}</td>
                      <td style={{ padding: '12px', fontWeight: 650, color: 'var(--accent-primary)' }}>${payout.totalPayout}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: payout.status === 'PAID' ? 'rgba(35,134,54,0.15)' : 'rgba(210,153,34,0.15)',
                          color: payout.status === 'PAID' ? 'var(--success)' : 'var(--warning)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}>{payout.status}</span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{payout.generatedBy?.username}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {activeTab === 'configs' && (
          <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '500px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Master Threshold Limits</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Modify the global limit below which expense claims are automatically approved. Claims exceeding this require supervisor and management approval chains.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 550, color: 'var(--text-secondary)' }}>Auto-approval Threshold ($)</label>
              <input
                type="number"
                className="input-field"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(Number(e.target.value))}
              />
            </div>

            <button onClick={handleUpdateConfig} className="glow-btn" style={{ alignSelf: 'flex-start', marginTop: '10px' }}>
              Save Master Config
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
