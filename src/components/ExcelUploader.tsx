import React, { useState, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, X, Check, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Lead, Employer } from '../services/dbService';

interface ExcelUploaderProps {
  employers: Employer[];
  onImport: (leads: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({ employers, onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedEmployer, setSelectedEmployer] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      setFeedback({ type: 'error', message: 'Please upload an Excel file (.xlsx, .xls) or CSV file' });
      return;
    }

    setFileName(file.name);
    setFeedback(null);
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
          setFeedback({ type: 'error', message: 'No data found in the file' });
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
          caller: selectedEmployer,
          engineer1: '',
          engineer2: '',
          engineer3: '',
          numberNotWorking: 'no',
          deployedLink: '',
          domain: '',
          renewalDate: '',
          followUp: '',
          currency: 'USD'
        }));

        setParsedData(parsed);
        setFeedback({ type: 'success', message: `Parsed ${parsed.length} rows successfully!` });
      } catch (error: any) {
        setFeedback({ type: 'error', message: `Error parsing file: ${error.message}` });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (parsedData.length === 0) return;
    if (!selectedEmployer) {
      setFeedback({ type: 'error', message: 'Please select a caller/employer' });
      return;
    }

    setIsLoading(true);
    try {
      const leadsToImport = parsedData.map(row => ({
        ...row,
        caller: selectedEmployer
      }));
      await onImport(leadsToImport);
      setFeedback({ type: 'success', message: `Successfully imported ${parsedData.length} leads!` });
      setParsedData([]);
      setFileName('');
    } catch (error: any) {
      setFeedback({ type: 'error', message: `Import failed: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
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
    link.download = 'CodoConsole_Lead_Template.xlsx';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const clearData = () => {
    setParsedData([]);
    setFileName('');
    setFeedback(null);
  };

  return (
    <div className="glass-card">
      <h3 className="mb-4 text-gold font-bold text-lg flex items-center gap-2" style={{ color: '#d4af37', fontFamily: 'var(--font-title)' }}>
        <FileSpreadsheet size={20} />
        Excel Import
      </h3>

      <div className="mb-4 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="input-label">Assign to Caller</label>
          <select
            className="input-field"
            value={selectedEmployer}
            onChange={(e) => setSelectedEmployer(e.target.value)}
          >
            <option value="">-- Select Caller --</option>
            {employers.map(emp => (
              <option key={emp.username} value={emp.username}>@{emp.username} ({emp.fullName})</option>
            ))}
          </select>
        </div>
        <button onClick={downloadTemplate} className="btn btn-secondary self-end">
          <FileSpreadsheet size={16} /> Download Template
        </button>
      </div>

      <div
        className={`drop-zone ${isDragging ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <UploadCloud size={48} className="text-gold opacity-60" />
        <p><strong>Drop your Excel/CSV file here</strong> or click to browse</p>
        <p className="sub-text">Supports .xlsx, .xls, .csv files</p>
        {fileName && <p className="text-sm text-gold">📄 {fileName}</p>}
        <input
          id="fileInput"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {feedback && (
        <div className={`p-4 rounded mt-4 text-sm flex items-center gap-2 ${feedback.type === 'success' ? 'bg-success/10 text-success border border-success/30' : 'bg-orange-dim text-orange border border-orange'}`}>
          {feedback.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {parsedData.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-muted">{parsedData.length} rows ready to import</span>
            <div className="flex gap-2">
              <button onClick={clearData} className="btn btn-secondary text-sm">Clear</button>
              <button
                onClick={handleConfirmImport}
                className="btn btn-primary"
                disabled={isLoading || !selectedEmployer}
              >
                {isLoading ? 'Importing...' : `Import ${parsedData.length} Leads`}
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