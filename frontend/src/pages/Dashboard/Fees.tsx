import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const Fees: React.FC = () => {
  const [feeCategories, setFeeCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');

  const [newFee, setNewFee] = useState({ name: '', description: '', default_amount: '' });

  const fetchFees = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/fee-categories/');
      setFeeCategories(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormError('');
    setNewFee({ name: '', description: '', default_amount: '' });
    setIsAddModalOpen(true);
  };

  const openEditModal = (fee: any) => {
    setEditingId(fee.id);
    setFormError('');
    setNewFee({ name: fee.name, description: fee.description || '', default_amount: String(fee.default_amount) });
    setIsAddModalOpen(true);
  };

  const handleSaveFee = async () => {
    if (!newFee.name || !newFee.default_amount) return;
    setIsSaving(true);
    setFormError('');
    const payload = {
      name: newFee.name,
      description: newFee.description,
      default_amount: parseFloat(newFee.default_amount)
    };
    try {
      if (editingId) {
        await api.patch(`/fee-categories/${editingId}/`, payload);
      } else {
        await api.post('/fee-categories/', payload);
      }
      setIsAddModalOpen(false);
      setNewFee({ name: '', description: '', default_amount: '' });
      setEditingId(null);
      fetchFees();
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to save fee category.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFee = async (fee: any) => {
    if (!window.confirm(`Delete "${fee.name}"? This can't be undone.`)) return;
    try {
      await api.delete(`/fee-categories/${fee.id}/`);
      fetchFees();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete fee category.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fee Structure</h1>
          <p className="text-sm text-muted-foreground">Manage standard fee categories and amounts.</p>
        </div>
        <Button variant="primary" onClick={openAddModal}>
          <Plus size={16} className="mr-2" /> Add Fee Category
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading fees...</div>
      ) : (
        <Table columns={['Name', 'Description', 'Default Amount', '']}>
          {feeCategories.map(fee => (
            <tr key={fee.id} className="transition-colors hover:bg-muted/50">
              <td className="p-4 font-medium">{fee.name}</td>
              <td className="p-4 text-muted-foreground">{fee.description || '—'}</td>
              <td className="p-4">ETB {parseFloat(fee.default_amount).toFixed(2)}</td>
              <td className="p-4 text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" className="px-2" title="Edit" onClick={() => openEditModal(fee)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" className="px-2 text-destructive hover:bg-destructive/10" title="Delete" onClick={() => handleDeleteFee(fee)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {feeCategories.length === 0 && (
            <tr>
              <td colSpan={4} className="p-8 text-center text-muted-foreground">No fee categories defined.</td>
            </tr>
          )}
        </Table>
      )}

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={editingId ? 'Edit Fee Category' : 'Add Fee Category'}>
        {formError && (
          <div className="p-3 mb-4 text-sm border rounded-md bg-destructive/10 text-destructive border-destructive/20">{formError}</div>
        )}
        <div className="space-y-1">
          <Input label="Name" value={newFee.name} onChange={(e) => setNewFee({...newFee, name: e.target.value})} placeholder="e.g. Tuition Fee" required />
          <Input label="Description" value={newFee.description} onChange={(e) => setNewFee({...newFee, description: e.target.value})} placeholder="Optional details" />
          <Input label="Default Amount (ETB)" type="number" step="0.01" value={newFee.default_amount} onChange={(e) => setNewFee({...newFee, default_amount: e.target.value})} required />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveFee} isLoading={isSaving}>{editingId ? 'Save Changes' : 'Create'}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Fees;
