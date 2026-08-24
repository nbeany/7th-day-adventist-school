import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Plus } from 'lucide-react';

const Fees: React.FC = () => {
  const [feeCategories, setFeeCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
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

  const handleAddFee = async () => {
    if (!newFee.name || !newFee.default_amount) return;
    setIsSaving(true);
    try {
      await api.post('/fee-categories/', {
        name: newFee.name,
        description: newFee.description,
        default_amount: parseFloat(newFee.default_amount)
      });
      setIsAddModalOpen(false);
      setNewFee({ name: '', description: '', default_amount: '' });
      fetchFees();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fee Structure</h1>
          <p className="text-sm text-muted-foreground">Manage standard fee categories and amounts.</p>
        </div>
        <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} className="mr-2" /> Add Fee Category
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading fees...</div>
      ) : (
        <Table columns={['Name', 'Description', 'Default Amount']}>
          {feeCategories.map(fee => (
            <tr key={fee.id} className="transition-colors hover:bg-muted/50">
              <td className="p-4 font-medium">{fee.name}</td>
              <td className="p-4 text-muted-foreground">{fee.description || '—'}</td>
              <td className="p-4">ETB {parseFloat(fee.default_amount).toFixed(2)}</td>
            </tr>
          ))}
          {feeCategories.length === 0 && (
            <tr>
              <td colSpan={3} className="p-8 text-center text-muted-foreground">No fee categories defined.</td>
            </tr>
          )}
        </Table>
      )}

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Fee Category">
        <div className="space-y-1">
          <Input label="Name" value={newFee.name} onChange={(e) => setNewFee({...newFee, name: e.target.value})} placeholder="e.g. Tuition Fee" required />
          <Input label="Description" value={newFee.description} onChange={(e) => setNewFee({...newFee, description: e.target.value})} placeholder="Optional details" />
          <Input label="Default Amount (ETB)" type="number" step="0.01" value={newFee.default_amount} onChange={(e) => setNewFee({...newFee, default_amount: e.target.value})} required />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddFee} isLoading={isSaving}>Create</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Fees;
