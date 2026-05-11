import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Filter, Download, RefreshCw, Loader2, Star, CheckCircle, Circle, X, Zap, FileText, LayoutGrid, List as ListIcon, GripVertical } from 'lucide-react';
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

const KANBAN_COLUMNS = [
  { id: 'new', label: '🆕 Nuovo', color: 'border-blue-300 bg-blue-50', aliases: ['new', null, ''] },
  { id: 'demo_creata', label: '🌐 Demo Creata', color: 'border-purple-300 bg-purple-50', aliases: ['demo_creata', 'demo_created'] },
  { id: 'contattato', label: '📞 Contattato', color: 'border-yellow-300 bg-yellow-50', aliases: ['contattato', 'contacted'] },
  { id: 'client', label: '💰 Cliente', color: 'border-green-300 bg-green-50', aliases: ['client', 'cliente'] }
];

function KanbanBoard({ leads, onMove, onView, draggingLead, setDraggingLead, updatingLead, selectedLeads = [], onToggleSelect }) {
  const grouped = KANBAN_COLUMNS.reduce((acc, c) => { acc[c.id] = []; return acc; }, {});
  leads.forEach((l) => {
    const s = l.status;
    const col = KANBAN_COLUMNS.find((c) => c.aliases.includes(s)) || KANBAN_COLUMNS[0];
    grouped[col.id].push(l);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-neutral-50 min-h-[500px]" data-testid="kanban-board">
      {KANBAN_COLUMNS.map((col) => (
        <div
          key={col.id}
          data-testid={`kanban-col-${col.id}`}
          className={`border-2 ${col.color} rounded-lg p-3`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            const currentCol = KANBAN_COLUMNS.find((c) => c.aliases.includes(draggingLead?.status));
            if (draggingLead && currentCol?.id !== col.id) {
              onMove(draggingLead.lead_id, col.id);
            }
            setDraggingLead(null);
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">{col.label}</h3>
            <span className="text-xs bg-white px-2 py-0.5 rounded-full font-semibold">{grouped[col.id].length}</span>
          </div>
          <div className="space-y-2 min-h-[300px]">
            {grouped[col.id].map((l) => {
              const isSelected = selectedLeads.includes(l.lead_id);
              return (
                <div
                  key={l.lead_id}
                  draggable
                  onDragStart={() => setDraggingLead(l)}
                  onDragEnd={() => setDraggingLead(null)}
                  data-testid={`kanban-card-${l.lead_id}`}
                  className={`bg-white border ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-neutral-200'} rounded-lg p-3 hover:shadow-md transition-shadow ${draggingLead?.lead_id === l.lead_id ? 'opacity-50' : ''} ${updatingLead === l.lead_id ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => { e.stopPropagation(); onToggleSelect(l.lead_id); }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 shrink-0"
                      data-testid={`kanban-checkbox-${l.lead_id}`}
                    />
                    <GripVertical size={14} className="text-neutral-300 shrink-0 mt-1 cursor-grab" />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(l.lead_id)}>
                      <p className="font-semibold text-sm truncate">{l.name}</p>
                      <p className="text-xs text-neutral-500 truncate">{l.category || ''}</p>
                      <p className="text-xs text-neutral-500 truncate">{l.city || ''}</p>
                      {l.rating != null && (
                        <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                          <Star size={10} fill="currentColor" />
                          <span>{l.rating}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {grouped[col.id].length === 0 && (
              <p className="text-xs text-neutral-400 text-center mt-4">Trascina qui i lead</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeadsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [updatingLead, setUpdatingLead] = useState(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [batchResult, setBatchResult] = useState(null);
  const [draggingLead, setDraggingLead] = useState(null);

  const moveLeadToColumn = async (leadId, newStatus) => {
    setUpdatingLead(leadId);
    const prevLeads = leads;
    setLeads((arr) => arr.map((l) => l.lead_id === leadId ? { ...l, status: newStatus } : l));
    try {
      await axios.patch(`${API}/leads/${leadId}`, { status: newStatus });
      toast.success('Stato aggiornato');
    } catch {
      toast.error('Errore aggiornamento');
      setLeads(prevLeads);
    } finally { setUpdatingLead(null); }
  };

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

  const openBatchModal = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Seleziona almeno un lead');
      return;
    }
    setBatchResult(null);
    setBatchModalOpen(true);
    // Load templates
    try {
      const r = await axios.get(`${API}/demos?action=templates`);
      setTemplates(r.data || []);
    } catch {
      setTemplates([]);
    }
  };

  const handleBatchGenerate = async () => {
    if (selectedLeads.length === 0) return;
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const payload = { lead_ids: selectedLeads };
      if (selectedTemplate) payload.template_id = selectedTemplate;
      const res = await axios.post(`${API}/demo/batch`, payload);
      setBatchResult(res.data?.results || null);
      const created = res.data?.results?.created?.length || 0;
      const skipped = res.data?.results?.skipped?.length || 0;
      toast.success(`${created} demo creati, ${skipped} già esistenti`);
      setSelectedLeads([]);
      setTimeout(() => loadLeads(), 1500);
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
            onClick={openBatchModal}
            disabled={selectedLeads.length === 0 || batchLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {batchLoading ? (
              <Loader2 className="mr-2 animate-spin" size={16} />
            ) : (
              <Zap className="mr-2" size={16} />
            )}
            Genera {selectedLeads.length > 0 ? `${selectedLeads.length} ` : ''}Demo Batch
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
          <KanbanBoard
            leads={leads}
            onMove={moveLeadToColumn}
            onView={(id) => navigate(`/leads/${id}`)}
            draggingLead={draggingLead}
            setDraggingLead={setDraggingLead}
            updatingLead={updatingLead}
            selectedLeads={selectedLeads}
            onToggleSelect={(id) => setSelectedLeads((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])}
          />
        </div>
      </Card>

      {/* Batch Generation Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" data-testid="batch-modal">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-neutral-200">
              <div>
                <h2 className="text-xl font-bold">Generazione Bulk Demo</h2>
                <p className="text-sm text-neutral-500">{selectedLeads.length} lead selezionati</p>
              </div>
              <button onClick={() => setBatchModalOpen(false)} data-testid="batch-modal-close" className="p-2 hover:bg-neutral-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!batchResult ? (
                <>
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <FileText size={16} />
                      Template da applicare (opzionale)
                    </Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger data-testid="batch-template-select">
                        <SelectValue placeholder="Nessun template (uso default)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nessun template (uso default)</SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.template_id} value={t.template_id}>
                            {t.name} {t.category ? `· ${t.category}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {templates.length === 0 && (
                      <p className="text-xs text-neutral-500 mt-2">
                        Nessun template salvato. Aprine uno dal SiteEditor → click "Template" → "Salva come Template".
                      </p>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <p className="font-semibold mb-1">💡 Cosa succederà</p>
                    <ul className="text-xs space-y-0.5">
                      <li>• Verranno creati {selectedLeads.length} siti demo in parallelo</li>
                      <li>• I lead con un demo già esistente verranno saltati</li>
                      <li>• {selectedTemplate ? 'Il template sarà applicato a ciascun demo' : 'Verrà usato lo stile default (blu, contenuti generici)'}</li>
                      <li>• Ciascun demo sarà disponibile su /demo/{'{id}'} per il preview</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleBatchGenerate}
                    disabled={batchLoading}
                    data-testid="batch-confirm-btn"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {batchLoading ? (
                      <><Loader2 className="mr-2 animate-spin" size={16} /> Generazione in corso...</>
                    ) : (
                      <><Zap className="mr-2" size={16} /> Genera {selectedLeads.length} Demo Ora</>
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-2xl font-bold text-green-700">{batchResult.created?.length || 0}</p>
                      <p className="text-xs text-green-600">Creati</p>
                    </div>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-700">{batchResult.skipped?.length || 0}</p>
                      <p className="text-xs text-yellow-600">Saltati</p>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-2xl font-bold text-red-700">{batchResult.errors?.length || 0}</p>
                      <p className="text-xs text-red-600">Errori</p>
                    </div>
                  </div>

                  {batchResult.created?.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                      {batchResult.created.map((c) => (
                        <div key={c.demo_id} className="flex items-center justify-between text-sm px-2 py-1 hover:bg-neutral-50 rounded">
                          <span className="truncate">{c.name}</span>
                          <a href={`/demo/${c.demo_id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline shrink-0 ml-2">
                            Apri demo →
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button onClick={() => { setBatchModalOpen(false); navigate('/demos'); }} className="w-full" data-testid="batch-goto-demos">
                    Vai ai Siti Demo
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
