import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { DollarSign, Send, FileText, Download } from 'lucide-react';

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateData, setGenerateData] = useState({ term_id: '', due_date: '' });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({ amount: '', payment_method: 'CASH', reference_number: '', notes: '' });

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const termRes = await api.get('/terms/');
        setTerms(termRes.data);
        fetchInvoices();
      } catch (error) {
        console.error(error);
      }
    };
    fetchInit();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/invoices/');
      setInvoices(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInvoices = async () => {
    if (!generateData.term_id || !generateData.due_date) return;
    setIsLoading(true);
    setMessage('');
    try {
      const res = await api.post('/invoices/generate_term_invoices/', generateData);
      setMessage(res.data.message);
      setIsGenerateModalOpen(false);
      fetchInvoices();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to generate invoices.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentData.amount) return;
    setIsLoading(true);
    try {
      await api.post('/payments/', {
        invoice: selectedInvoice.id,
        amount: parseFloat(paymentData.amount),
        payment_method: paymentData.payment_method,
        reference_number: paymentData.reference_number,
        notes: paymentData.notes
      });
      setIsPaymentModalOpen(false);
      setPaymentData({ amount: '', payment_method: 'CASH', reference_number: '', notes: '' });
      fetchInvoices();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/invoices/export/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'invoices_export.csv');
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Failed to export invoices', error);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'PAID') return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-success/10 text-success">PAID</span>;
    if (status === 'PARTIAL') return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-warning/10 text-warning">PARTIAL</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-destructive/10 text-destructive">UNPAID</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices & Payments</h1>
          <p className="text-sm text-muted-foreground">Manage student billing and record payments.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={invoices.length === 0}>
            <Download size={16} className="mr-2" /> Export CSV
          </Button>
          <Button variant="primary" onClick={() => setIsGenerateModalOpen(true)}>
            <FileText size={16} className="mr-2" /> Generate Invoices
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-3 text-sm border rounded-md ${message.includes('error') || message.includes('Failed') ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-success/10 text-success border-success/20'}`}>
          {message}
        </div>
      )}

      {isLoading && invoices.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">Loading invoices...</div>
      ) : (
        <Table columns={['ID', 'Student', 'Term', 'Due Date', 'Status', 'Total', 'Paid', 'Balance', 'Action']}>
          {invoices.map(inv => {
            const balance = parseFloat(inv.total_amount) - parseFloat(inv.amount_paid);
            return (
              <tr key={inv.id} className="transition-colors hover:bg-muted/50">
                <td className="p-4 font-mono text-xs text-muted-foreground">INV-{inv.id.toString().padStart(4, '0')}</td>
                <td className="p-4 font-medium">{inv.student_name}</td>
                <td className="p-4 text-muted-foreground">{inv.term_name}</td>
                <td className="p-4 text-muted-foreground">{inv.due_date}</td>
                <td className="p-4">{getStatusBadge(inv.status)}</td>
                <td className="p-4 font-medium">ETB {parseFloat(inv.total_amount).toFixed(2)}</td>
                <td className="p-4 text-success">ETB {parseFloat(inv.amount_paid).toFixed(2)}</td>
                <td className="p-4 font-bold text-destructive">ETB {balance.toFixed(2)}</td>
                <td className="p-4">
                  {inv.status !== 'PAID' && (
                    <Button variant="ghost" onClick={() => { setSelectedInvoice(inv); setIsPaymentModalOpen(true); }} className="h-8 px-2 text-primary hover:bg-primary/10">
                      <DollarSign size={14} className="mr-1" /> Pay
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={9} className="p-8 text-center text-muted-foreground">No invoices generated yet.</td>
            </tr>
          )}
        </Table>
      )}

      {/* Generate Invoices Modal */}
      <Modal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)} title="Generate Term Invoices">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            This will create invoices for all active students for the selected term, billing them for all default fee categories.
          </p>
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-medium text-muted-foreground">Term</label>
            <select className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" value={generateData.term_id} onChange={(e) => setGenerateData({...generateData, term_id: e.target.value})}>
              <option value="">Select a term...</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <Input label="Due Date" type="date" value={generateData.due_date} onChange={(e) => setGenerateData({...generateData, due_date: e.target.value})} />
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="ghost" onClick={() => setIsGenerateModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleGenerateInvoices} isLoading={isLoading}>Generate</Button>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Record Payment">
        {selectedInvoice && (
          <div className="space-y-1">
            <div className="p-3 mb-4 rounded-md bg-muted/30 border text-sm">
              <p><strong>Invoice:</strong> INV-{selectedInvoice.id.toString().padStart(4, '0')} - {selectedInvoice.student_name}</p>
              <p><strong>Outstanding Balance:</strong> ETB {(parseFloat(selectedInvoice.total_amount) - parseFloat(selectedInvoice.amount_paid)).toFixed(2)}</p>
            </div>
            
            <Input label="Payment Amount (ETB)" type="number" step="0.01" max={parseFloat(selectedInvoice.total_amount) - parseFloat(selectedInvoice.amount_paid)} value={paymentData.amount} onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})} required />
            
            <div className="flex flex-col gap-1.5 w-full mb-4">
              <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
              <select className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" value={paymentData.payment_method} onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            <Input label="Reference Number (Optional)" value={paymentData.reference_number} onChange={(e) => setPaymentData({...paymentData, reference_number: e.target.value})} placeholder="Transaction ID, Cheque No." />
            <Input label="Notes (Optional)" value={paymentData.notes} onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})} />
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleRecordPayment} isLoading={isLoading}>Submit Payment</Button>
        </div>
      </Modal>

    </div>
  );
};

export default Invoices;
