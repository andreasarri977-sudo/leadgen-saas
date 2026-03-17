import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Globe, Eye, Rocket, Loader2, CheckCircle, AlertCircle, ExternalLink, Shield, Link2, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_CONFIG = {
  draft: { label: 'Bozza', color: 'bg-neutral-500', icon: Eye },
  approved: { label: 'Approvato', color: 'bg-blue-500', icon: CheckCircle },
  publishing: { label: 'Pubblicazione...', color: 'bg-yellow-500', icon: Loader2 },
  published: { label: 'Online', color: 'bg-green-500', icon: Globe },
  error: { label: 'Errore', color: 'bg-red-500', icon: AlertCircle }
};

const DOMAIN_STATUS_CONFIG = {
  not_connected: { label: 'Non collegato', color: 'text-neutral-500' },
  verifying: { label: 'In verifica DNS', color: 'text-yellow-600' },
  active: { label: 'Attivo', color: 'text-green-600' }
};

export default function DemoSites() {
  const navigate = useNavigate();
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState({});
  const [checking, setChecking] = useState({});
  const [domainInputs, setDomainInputs] = useState({});
  const [addingDomain, setAddingDomain] = useState({});

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
      const response = await axios.post(`${API}/demos/${demoId}/publish`);
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
      const response = await axios.post(`${API}/demos/${demoId}/domain`, { domain });
      if (response.data.verified) {
        toast.success('🎉 Dominio collegato e attivo!');
      } else {
        toast.info('📋 Dominio aggiunto. Configura i record DNS indicati.');
      }
      await loadDemos();
      setDomainInputs(prev => ({ ...prev, [demoId]: '' }));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore aggiunta dominio');
    } finally {
      setAddingDomain(prev => ({ ...prev, [demoId]: false }));
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
              className="p-6 hover:shadow-lg transition-shadow flex flex-col"
            >
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
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-blue-700 font-medium">🔗 Dominio Custom</p>
                        <span className={`text-xs font-medium ${domainConfig.color}`}>
                          {domainConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-blue-800 font-medium">{demo.custom_domain}</p>
                      {demo.domain_status === 'verifying' && demo.domain_verification && (
                        <div className="mt-2 text-xs text-blue-600">
                          <p className="font-medium mb-1">Configura DNS:</p>
                          {demo.domain_verification.map((record, i) => (
                            <p key={i} className="font-mono bg-white p-1 rounded mb-1">
                              {record.type}: {record.value}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                      <p className="text-xs text-neutral-600 font-medium mb-2">Collega dominio custom:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={domainInputs[demo.demo_id] || ''}
                          onChange={(e) => setDomainInputs(prev => ({ ...prev, [demo.demo_id]: e.target.value }))}
                          placeholder="www.esempio.it"
                          className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddDomain(demo.demo_id)}
                          disabled={addingDomain[demo.demo_id]}
                        >
                          {addingDomain[demo.demo_id] ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
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
