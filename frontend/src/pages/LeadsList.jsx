import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Filter, Download, RefreshCw, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import API from '@/lib/api';

const STATUS_COLORS = {
  nuovo_lead: 'bg-blue-500',
  demo_creata: 'bg-purple-500',
  contattato: 'bg-yellow-500',
  cliente_acquisito: 'bg-green-500'
};

const STATUS_LABELS = {
  nuovo_lead: 'Nuovo Lead',
  demo_creata: 'Demo Creata',
  contattato: 'Contattato',
  cliente_acquisito: 'Cliente Acquisito'
};

export default function LeadsList() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    loadLeads();
  }, [filterStatus]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const url = filterStatus === 'all' ? `${API}/leads` : `${API}/leads?status=${filterStatus}`;
      const response = await axios.get(url);
      setLeads(response.data);
    } catch (error) {
      console.error('Errore caricamento lead:', error);
      toast.error('Errore caricamento lead');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Seleziona almeno un lead');
      return;
    }

    setBatchLoading(true);
    try {
      await axios.post(`${API}/demo/batch`, { lead_ids: selectedLeads });
      toast.success(`Generazione di ${selectedLeads.length} siti demo avviata`);
      setSelectedLeads([]);
      setTimeout(() => loadLeads(), 3000);
    } catch (error) {
      console.error('Errore batch:', error);
      toast.error('Errore generazione batch');
    } finally {
      setBatchLoading(false);
    }
  };

  const toggleLeadSelection = (leadId) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  if (loading) {
    return (
      <div data-testid="leads-loading" className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div data-testid="leads-list-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">Lead</h1>
          <p className="text-neutral-600 mt-2 text-lg">{leads.length} lead totali</p>
        </div>
        <div className="flex gap-2">
          <Button
            data-testid="batch-generate-button"
            onClick={handleBatchGenerate}
            disabled={selectedLeads.length === 0 || batchLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {batchLoading ? (
              <Loader2 className="mr-2 animate-spin" size={16} />
            ) : (
              <Download className="mr-2" size={16} />
            )}
            Genera Batch ({selectedLeads.length})
          </Button>
          <Button
            data-testid="refresh-leads-button"
            onClick={loadLeads}
            variant="outline"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter size={20} />
            <Label>Filtra per stato:</Label>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger data-testid="filter-status-select" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="nuovo_lead">Nuovo Lead</SelectItem>
              <SelectItem value="demo_creata">Demo Creata</SelectItem>
              <SelectItem value="contattato">Contattato</SelectItem>
              <SelectItem value="cliente_acquisito">Cliente Acquisito</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b">
              <tr>
                <th className="p-3 text-left text-sm font-bold">
                  <input
                    type="checkbox"
                    data-testid="select-all-checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLeads(leads.map(l => l.lead_id));
                      } else {
                        setSelectedLeads([]);
                      }
                    }}
                    checked={selectedLeads.length === leads.length && leads.length > 0}
                  />
                </th>
                <th className="p-3 text-left text-sm font-bold">Nome</th>
                <th className="p-3 text-left text-sm font-bold">Categoria</th>
                <th className="p-3 text-left text-sm font-bold">Città</th>
                <th className="p-3 text-left text-sm font-bold">Rating</th>
                <th className="p-3 text-left text-sm font-bold">Stato</th>
                <th className="p-3 text-left text-sm font-bold">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.lead_id}
                  data-testid={`lead-row-${lead.lead_id}`}
                  className="border-b hover:bg-neutral-50 transition-colors"
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      data-testid={`checkbox-${lead.lead_id}`}
                      checked={selectedLeads.includes(lead.lead_id)}
                      onChange={() => toggleLeadSelection(lead.lead_id)}
                    />
                  </td>
                  <td className="p-3 font-medium">{lead.name}</td>
                  <td className="p-3 text-sm text-neutral-600">{lead.category}</td>
                  <td className="p-3 text-sm text-neutral-600">{lead.city}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500" />
                      <span className="text-sm font-medium">{lead.rating}</span>
                      <span className="text-xs text-neutral-500">({lead.reviews_count})</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge className={`${STATUS_COLORS[lead.status]} text-white`}>
                      {STATUS_LABELS[lead.status]}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Button
                      data-testid={`view-details-${lead.lead_id}`}
                      onClick={() => navigate(`/leads/${lead.lead_id}`)}
                      variant="ghost"
                      size="sm"
                    >
                      Dettagli
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {leads.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <p>Nessun lead trovato</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}