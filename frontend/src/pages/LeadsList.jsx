import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Filter, Download, RefreshCw, Loader2, Star, CheckCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import API from '@/lib/api';

const STATUS_COLORS = {
  new: 'bg-blue-500',
  demo_created: 'bg-purple-500',
  contacted: 'bg-yellow-500',
  client: 'bg-green-500'
};

const STATUS_LABELS = {
  new: 'Nuovo Lead',
  demo_created: 'Demo Creata',
  contacted: 'Contattato',
  client: 'Cliente Acquisito'
};

export default function LeadsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [updatingLead, setUpdatingLead] = useState(null);

  useEffect(() => {
    // Sync filter with URL params
    const statusParam = searchParams.get('status');
    if (statusParam && statusParam !== filterStatus) {
      setFilterStatus(statusParam);
    }
  }, [searchParams]);

  useEffect(() => {
    loadLeads();
    // Update URL when filter changes
    if (filterStatus === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', filterStatus);
    }
    setSearchParams(searchParams, { replace: true });
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

  // Segna il lead come "cliente acquisito" (pagato)
  const toggleClientStatus = async (lead) => {
    const newStatus = lead.status === 'client' ? 'contacted' : 'client';
    setUpdatingLead(lead.lead_id);
    
    try {
      await axios.patch(`${API}/leads/${lead.lead_id}`, { status: newStatus });
      
      // Update local state
      setLeads(prev => prev.map(l => 
        l.lead_id === lead.lead_id ? { ...l, status: newStatus } : l
      ));
      
      if (newStatus === 'client') {
        toast.success(`${lead.name} segnato come cliente acquisito!`);
      } else {
        toast.info(`${lead.name} rimosso dai clienti acquisiti`);
      }
    } catch (error) {
      console.error('Errore aggiornamento stato:', error);
      toast.error('Errore aggiornamento stato');
    } finally {
      setUpdatingLead(null);
    }
  };

  if (loading) {
    return (
      <div data-testid="leads-loading" className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  // Title based on filter
  const pageTitle = filterStatus === 'client' ? 'Clienti Acquisiti' : 'Lead';
  const pageSubtitle = filterStatus === 'client' 
    ? `${leads.length} clienti che hanno pagato`
    : `${leads.length} lead totali`;

  return (
    <div data-testid="leads-list-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-neutral-600 mt-2 text-lg">{pageSubtitle}</p>
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
              <SelectItem value="new">Nuovo Lead</SelectItem>
              <SelectItem value="demo_created">Demo Creata</SelectItem>
              <SelectItem value="contacted">Contattato</SelectItem>
              <SelectItem value="client">Cliente Acquisito</SelectItem>
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
                <th className="p-3 text-left text-sm font-bold">Pagato</th>
                <th className="p-3 text-left text-sm font-bold">Nome Attività</th>
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
                  className={`border-b hover:bg-neutral-50 transition-colors ${lead.status === 'client' ? 'bg-green-50' : ''}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      data-testid={`checkbox-${lead.lead_id}`}
                      checked={selectedLeads.includes(lead.lead_id)}
                      onChange={() => toggleLeadSelection(lead.lead_id)}
                    />
                  </td>
                  <td className="p-3">
                    <button
                      data-testid={`paid-toggle-${lead.lead_id}`}
                      onClick={() => toggleClientStatus(lead)}
                      disabled={updatingLead === lead.lead_id}
                      className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-100 transition-colors"
                      title={lead.status === 'client' ? 'Rimuovi da clienti' : 'Segna come pagato'}
                    >
                      {updatingLead === lead.lead_id ? (
                        <Loader2 size={20} className="animate-spin text-neutral-400" />
                      ) : lead.status === 'client' ? (
                        <CheckCircle size={20} className="text-green-600" />
                      ) : (
                        <Circle size={20} className="text-neutral-300 hover:text-green-400" />
                      )}
                    </button>
                  </td>
                  <td className="p-3 font-medium">
                    {lead.name}
                    {lead.status === 'client' && (
                      <span className="ml-2 text-xs text-green-600 font-normal">Cliente</span>
                    )}
                  </td>
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
                    <Badge className={`${STATUS_COLORS[lead.status] || 'bg-gray-500'} text-white`}>
                      {STATUS_LABELS[lead.status] || lead.status}
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
              {filterStatus === 'client' ? (
                <div>
                  <CheckCircle size={48} className="mx-auto mb-4 text-neutral-300" />
                  <p>Nessun cliente acquisito ancora</p>
                  <p className="text-sm mt-2">Clicca sulla spunta accanto al nome per segnare un lead come "pagato"</p>
                </div>
              ) : (
                <p>Nessun lead trovato</p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
