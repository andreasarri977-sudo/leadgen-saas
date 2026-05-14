import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Globe, Eye, Rocket, Loader2, CheckCircle, AlertCircle, ExternalLink, Shield, Link2, RefreshCw, Pencil, Trash2, Copy, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import API from '@/lib/api';

// Get the base URL for demos
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

const STATUS_CONFIG = {
  draft: { label: 'Bozza', color: 'bg-neutral-500', icon: Eye },
  approved: { label: 'Approvato', color: 'bg-blue-500', icon: CheckCircle },
  publishing: { label: 'Pubblicazione...', color: 'bg-yellow-500', icon: Loader2 },
  published: { label: 'Online', color: 'bg-green-500', icon: Globe },
  error: { label: 'Errore', color: 'bg-red-500', icon: AlertCircle }
};

const DOMAIN_STATUS_CONFIG = {
  not_connected: { label: 'Non collegato', color: 'text-neutral-500', bgColor: 'bg-neutral-100' },
  pending: { label: 'DNS in attesa', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  verifying: { label: 'In verifica DNS', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  active: { label: 'Attivo', color: 'text-green-600', bgColor: 'bg-green-50' }
};

export default function DemoSites() {
  const navigate = useNavigate();
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState({});
  const [checking, setChecking] = useState({});
  const [domainInputs, setDomainInputs] = useState({});
  const [addingDomain, setAddingDomain] = useState({});
  const [deleting, setDeleting] = useState({});
  const [regenerating, setRegenerating] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [verifyingDomain, setVerifyingDomain] = useState({});
  const [removingDomain, setRemovingDomain] = useState({});

  useEffect(() => {
    loadDemos();
  }, []);

  const loadDemos = async () => {
    try {
      const response = await axios.get(`${API}/demos`);
      setDemos(response.data);
    } catch (error) {
      console.error('Errore caricamento demo:', error);
      toast.error('Errore caricamento siti demo');
    } finally {
      setLoading(false);
    }
  };

  const copyDemoLink = async (demoId, businessName) => {
    const baseUrl = getBaseUrl();
    const demoUrl = `${baseUrl}/demo/${demoId}`;
    
    try {
      await navigator.clipboard.writeText(demoUrl);
      setCopiedId(demoId);
      toast.success(`Link di "${businessName}" copiato!`);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = demoUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopiedId(demoId);
      toast.success(`Link di "${businessName}" copiato!`);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleRegenerate = async (demoId, businessName) => {
    setRegenerating(prev => ({ ...prev, [demoId]: true }));
    try {
      await axios.post(`${API}/demo/regenerate`, { demo_id: demoId });
      toast.success(`Sito "${businessName}" rigenerato con nuovi contenuti!`);
      loadDemos(); // Reload to get updated data
    } catch (error) {
      console.error('Errore rigenerazione:', error);
      toast.error('Errore durante la rigenerazione');
    } finally {
      setRegenerating(prev => ({ ...prev, [demoId]: false }));
    }
  };

  const handleDelete = async (demoId, businessName) => {
    if (!window.confirm(`Sei sicuro di voler eliminare il sito demo "${businessName}"?\n\nQuesta azione non può essere annullata.`)) {
      return;
    }
    
    setDeleting(prev => ({ ...prev, [demoId]: true }));
    try {
      await axios.delete(`${API}/demos/${demoId}`);
      toast.success(`Sito "${businessName}" eliminato`);
      // Remove from local state
      setDemos(prev => prev.filter(d => d.demo_id !== demoId));
    } catch (error) {
      console.error('Errore eliminazione:', error);
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setDeleting(prev => ({ ...prev, [demoId]: false }));
    }
  };

  const handleQualityCheck = async (demoId) => {
    setChecking(prev => ({ ...prev, [demoId]: true }));
    try {
      const response = await axios.post(`${API}/demos/${demoId}/quality-check`);
      if (response.data.passed) {
        toast.success('✅ Quality check superato!');
      } else {
        toast.error(`❌ Quality check fallito: ${response.data.errors.join(', ')}`);
      }
      if (response.data.warnings?.length > 0) {
        toast.warning(`⚠️ Warning: ${response.data.warnings.join(', ')}`);
      }
      await loadDemos();
    } catch (error) {
      toast.error('Errore quality check');
    } finally {
      setChecking(prev => ({ ...prev, [demoId]: false }));
    }
  };

  const handlePublish = async (demoId) => {
    setPublishing(prev => ({ ...prev, [demoId]: true }));
    try {
      const response = await axios.post(`${API}/demos/${demoId}?action=publish`);
      toast.success('🚀 ' + response.data.message);
      await loadDemos();
    } catch (error) {
      console.error('Errore pubblicazione:', error);
      toast.error(error.response?.data?.detail || 'Errore durante la pubblicazione');
    } finally {
      setPublishing(prev => ({ ...prev, [demoId]: false }));
    }
  };

  const handleAddDomain = async (demoId) => {
    const domain = domainInputs[demoId];
    if (!domain) {
      toast.error('Inserisci un dominio');
      return;
    }
    
    setAddingDomain(prev => ({ ...prev, [demoId]: true }));
    try {
      const response = await axios.post(`${API}/demos/${demoId}?action=connect-domain`, { domain });
      toast.success(`Dominio ${domain} aggiunto! Configura i record DNS.`);
      await loadDemos();
      setDomainInputs(prev => ({ ...prev, [demoId]: '' }));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Errore aggiunta dominio');
    } finally {
      setAddingDomain(prev => ({ ...prev, [demoId]: false }));
    }
  };

  const handleVerifyDomain = async (demoId) => {
    setVerifyingDomain(prev => ({ ...prev, [demoId]: true }));
    try {
      const response = await axios.post(`${API}/demos/${demoId}?action=verify-domain`);
      if (response.data.verified) {
        toast.success(response.data.message);
      } else {
        toast.info(response.data.message);
      }
      await loadDemos();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Errore verifica dominio');
    } finally {
      setVerifyingDomain(prev => ({ ...prev, [demoId]: false }));
    }
  };

  const handleRemoveDomain = async (demoId) => {
    if (!window.confirm('Sei sicuro di voler rimuovere il dominio custom?')) return;
    
    setRemovingDomain(prev => ({ ...prev, [demoId]: true }));
    try {
      await axios.post(`${API}/demos/${demoId}?action=remove-domain`);
      toast.success('Dominio rimosso');
      await loadDemos();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Errore rimozione dominio');
    } finally {
      setRemovingDomain(prev => ({ ...prev, [demoId]: false }));
    }
  };

  if (loading) {
    return (
      <div data-testid="demos-loading" className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div data-testid="demos-page">
      <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">Siti Demo</h1>
      <p className="text-neutral-600 mb-8 text-lg">{demos.length} siti demo generati</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {demos.map((demo) => {
          const statusConfig = STATUS_CONFIG[demo.publish_status] || STATUS_CONFIG.draft;
          const StatusIcon = statusConfig.icon;
          const domainConfig = DOMAIN_STATUS_CONFIG[demo.domain_status] || DOMAIN_STATUS_CONFIG.not_connected;
          
          return (
            <Card
              key={demo.demo_id}
              data-testid={`demo-card-${demo.demo_id}`}
              className="p-6 hover:shadow-lg transition-shadow flex flex-col relative group"
            >
              {/* Pulsante elimina rapido (top-right) */}
              <button
                type="button"
                onClick={() => handleDelete(demo.demo_id, demo.business_name)}
                disabled={deleting[demo.demo_id]}
                data-testid={`quick-delete-${demo.demo_id}`}
                title="Elimina sito"
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white border border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center shadow-sm opacity-60 group-hover:opacity-100 transition-all z-10"
              >
                {deleting[demo.demo_id] ? <Loader2 size={14} className="animate-spin" /> : <X size={16} />}
              </button>

              {/* Header con logo e status */}
              <div className="flex items-start justify-between mb-4">
                {demo.logo_base64 ? (
                  <img
                    src={`data:image/png;base64,${demo.logo_base64}`}
                    alt="Logo"
                    className="w-16 h-16 object-contain bg-neutral-50 rounded-lg p-2"
                  />
                ) : (
                  <div className="w-16 h-16 bg-neutral-100 rounded-lg flex items-center justify-center">
                    <Globe size={24} className="text-neutral-400" />
                  </div>
                )}
                <Badge className={`${statusConfig.color} text-white flex items-center gap-1`}>
                  <StatusIcon size={14} className={statusConfig.icon === Loader2 ? 'animate-spin' : ''} />
                  {statusConfig.label}
                </Badge>
              </div>

              {/* Nome e subtitle */}
              <h3 className="text-xl font-bold tracking-tight mb-1">{demo.business_name}</h3>
              <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                {demo.content?.homepage_subtitle || demo.business_data?.category}
              </p>

              {/* URL di produzione */}
              {demo.production_url && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-700 font-medium mb-1">🌐 URL Produzione</p>
                  <a 
                    href={demo.production_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-green-800 hover:underline flex items-center gap-1 break-all"
                  >
                    {demo.production_url}
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Dominio custom */}
              {demo.publish_status === 'published' && (
                <div className="mb-4">
                  {demo.custom_domain ? (
                    <div className={`p-4 ${domainConfig.bgColor} border border-neutral-200 rounded-lg`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-neutral-800">Dominio Custom</p>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${domainConfig.color} ${domainConfig.bgColor}`}>
                          {domainConfig.label}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-neutral-900 mb-3">{demo.custom_domain}</p>
                      
                      {/* DNS Instructions for pending domains */}
                      {(demo.domain_status === 'pending' || demo.domain_status === 'verifying') && demo.domain_verification && (
                        <div className="bg-white rounded-lg p-3 mb-3 border border-yellow-200">
                          <p className="text-sm font-semibold text-yellow-800 mb-2">Configura questi record DNS:</p>
                          {demo.domain_verification.map((record, i) => (
                            <div key={i} className="text-xs bg-yellow-50 p-2 rounded mb-2 font-mono">
                              <span className="font-bold text-yellow-700">{record.type}</span>
                              <span className="text-neutral-600 mx-2">→</span>
                              <span className="text-neutral-800">{record.name}</span>
                              <span className="text-neutral-600 mx-2">→</span>
                              <span className="text-yellow-800 font-semibold">{record.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Domain Actions */}
                      <div className="flex gap-2">
                        {demo.domain_status !== 'active' && (
                          <Button
                            size="sm"
                            onClick={() => handleVerifyDomain(demo.demo_id)}
                            disabled={verifyingDomain[demo.demo_id]}
                            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                          >
                            {verifyingDomain[demo.demo_id] ? (
                              <Loader2 size={14} className="animate-spin mr-1" />
                            ) : (
                              <CheckCircle size={14} className="mr-1" />
                            )}
                            Verifica DNS
                          </Button>
                        )}
                        {demo.domain_status === 'active' && (
                          <a
                            href={`https://${demo.custom_domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md font-medium"
                          >
                            <Globe size={14} />
                            Apri Sito
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveDomain(demo.demo_id)}
                          disabled={removingDomain[demo.demo_id]}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          {removingDomain[demo.demo_id] ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <X size={14} />
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-semibold text-blue-800 mb-1">Collega il tuo dominio</p>
                      <p className="text-xs text-blue-600 mb-3">Il cliente ha un dominio? Collegalo qui per metterlo online.</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={domainInputs[demo.demo_id] || ''}
                          onChange={(e) => setDomainInputs(prev => ({ ...prev, [demo.demo_id]: e.target.value }))}
                          placeholder="esempio.it"
                          className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddDomain(demo.demo_id)}
                          disabled={addingDomain[demo.demo_id]}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {addingDomain[demo.demo_id] ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Link2 size={14} />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quality check errors/warnings */}
              {demo.quality_check_errors && demo.quality_check_errors.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-700 font-medium mb-1">⚠️ Note</p>
                  {demo.quality_check_errors.map((err, i) => (
                    <p key={i} className="text-xs text-yellow-800">{err}</p>
                  ))}
                </div>
              )}

              {/* Spacer per allineare i bottoni in fondo */}
              <div className="flex-1" />

              {/* Azioni */}
              <div className="space-y-2 mt-4">
                {/* Copy Link - NEW */}
                <Button
                  data-testid={`copy-link-${demo.demo_id}`}
                  onClick={() => copyDemoLink(demo.demo_id, demo.business_name)}
                  variant="outline"
                  className={`w-full ${copiedId === demo.demo_id ? 'bg-green-50 text-green-700 border-green-300' : ''}`}
                >
                  {copiedId === demo.demo_id ? (
                    <>
                      <Check className="mr-2" size={16} />
                      Link Copiato!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2" size={16} />
                      Copia Link Demo
                    </>
                  )}
                </Button>

                {/* Preview */}
                <Button
                  data-testid={`view-demo-${demo.demo_id}`}
                  onClick={() => navigate(`/demo/${demo.demo_id}`)}
                  variant="outline"
                  className="w-full"
                >
                  <Eye className="mr-2" size={16} />
                  Anteprima Demo
                </Button>

                {/* Edit Site - sempre visibile dopo la creazione */}
                <Button
                  data-testid={`edit-demo-${demo.demo_id}`}
                  onClick={() => navigate(`/site-editor/${demo.demo_id}`)}
                  variant="outline"
                  className="w-full"
                >
                  <Pencil className="mr-2" size={16} />
                  Modifica Sito
                </Button>

                {/* Regenerate Site */}
                <Button
                  data-testid={`regenerate-demo-${demo.demo_id}`}
                  onClick={() => handleRegenerate(demo.demo_id, demo.business_name)}
                  disabled={regenerating[demo.demo_id]}
                  variant="outline"
                  className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                >
                  {regenerating[demo.demo_id] ? (
                    <Loader2 className="mr-2 animate-spin" size={16} />
                  ) : (
                    <RefreshCw className="mr-2" size={16} />
                  )}
                  Rigenera Contenuti
                </Button>

                {/* Delete Site */}
                <Button
                  data-testid={`delete-demo-${demo.demo_id}`}
                  onClick={() => handleDelete(demo.demo_id, demo.business_name)}
                  disabled={deleting[demo.demo_id]}
                  variant="outline"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  {deleting[demo.demo_id] ? (
                    <Loader2 className="mr-2 animate-spin" size={16} />
                  ) : (
                    <Trash2 className="mr-2" size={16} />
                  )}
                  Elimina Sito
                </Button>

                {/* Quality Check (solo per draft) */}
                {demo.publish_status === 'draft' && (
                  <Button
                    data-testid={`quality-check-${demo.demo_id}`}
                    onClick={() => handleQualityCheck(demo.demo_id)}
                    disabled={checking[demo.demo_id]}
                    variant="outline"
                    className="w-full"
                  >
                    {checking[demo.demo_id] ? (
                      <Loader2 className="mr-2 animate-spin" size={16} />
                    ) : (
                      <Shield className="mr-2" size={16} />
                    )}
                    Quality Check
                  </Button>
                )}

                {/* Pubblica */}
                {demo.publish_status !== 'published' && (
                  <Button
                    data-testid={`publish-demo-${demo.demo_id}`}
                    onClick={() => handlePublish(demo.demo_id)}
                    disabled={publishing[demo.demo_id]}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {publishing[demo.demo_id] ? (
                      <>
                        <Loader2 className="mr-2 animate-spin" size={16} />
                        Pubblicazione su Vercel...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2" size={16} />
                        Pubblica in Produzione
                      </>
                    )}
                  </Button>
                )}

                {/* Apri sito live */}
                {demo.publish_status === 'published' && demo.production_url && (
                  <Button
                    data-testid={`open-live-${demo.demo_id}`}
                    onClick={() => window.open(demo.production_url, '_blank')}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Globe className="mr-2" size={16} />
                    Apri Sito Live
                  </Button>
                )}

                {/* Ripubblica (per aggiornamenti) */}
                {demo.publish_status === 'published' && (
                  <Button
                    data-testid={`republish-demo-${demo.demo_id}`}
                    onClick={() => handlePublish(demo.demo_id)}
                    disabled={publishing[demo.demo_id]}
                    variant="outline"
                    className="w-full"
                  >
                    {publishing[demo.demo_id] ? (
                      <Loader2 className="mr-2 animate-spin" size={16} />
                    ) : (
                      <RefreshCw className="mr-2" size={16} />
                    )}
                    Ripubblica
                  </Button>
                )}
              </div>
            </Card>
          );
        })}

        {demos.length === 0 && (
          <div className="col-span-full text-center py-12 text-neutral-500">
            <Globe size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nessun sito demo ancora generato</p>
            <p className="text-sm mt-2">Cerca nuovi lead e genera siti demo per loro</p>
          </div>
        )}
      </div>
    </div>
  );
}
