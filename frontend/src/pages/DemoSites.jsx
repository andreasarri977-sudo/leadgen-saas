import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Globe, Eye, Rocket, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_CONFIG = {
  draft: { label: 'Bozza', color: 'bg-neutral-500', icon: Eye },
  publishing: { label: 'Pubblicazione...', color: 'bg-blue-500', icon: Loader2 },
  published: { label: 'Pubblicato', color: 'bg-green-500', icon: CheckCircle },
  error: { label: 'Errore', color: 'bg-red-500', icon: AlertCircle }
};

export default function DemoSites() {
  const navigate = useNavigate();
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState({});

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

  const handlePublish = async (demoId) => {
    setPublishing(prev => ({ ...prev, [demoId]: true }));
    try {
      const response = await axios.post(`${API}/demos/${demoId}/publish`);
      toast.success(response.data.message);
      if (response.data.note) {
        toast.info(response.data.note);
      }
      await loadDemos();
    } catch (error) {
      console.error('Errore pubblicazione:', error);
      toast.error(error.response?.data?.detail || 'Errore durante la pubblicazione');
    } finally {
      setPublishing(prev => ({ ...prev, [demoId]: false }));
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
      <h1 className="text-5xl font-bold mb-8 tracking-tight">Siti Demo</h1>
      <p className="text-neutral-600 mb-8 text-lg">{demos.length} siti demo generati</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demos.map((demo) => {
          const statusConfig = STATUS_CONFIG[demo.publish_status] || STATUS_CONFIG.draft;
          const StatusIcon = statusConfig.icon;
          
          return (
            <Card
              key={demo.demo_id}
              data-testid={`demo-card-${demo.demo_id}`}
              className="p-6 hover:shadow-lg transition-shadow"
            >
              {demo.logo_base64 && (
                <div className="mb-4 flex items-center justify-center bg-neutral-50 rounded-lg p-4">
                  <img
                    src={`data:image/png;base64,${demo.logo_base64}`}
                    alt="Logo"
                    className="w-24 h-24 object-contain"
                  />
                </div>
              )}
              
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-bold tracking-tight">{demo.business_name}</h3>
                <Badge className={`${statusConfig.color} text-white flex items-center gap-1`}>
                  <StatusIcon size={14} className={statusConfig.icon === Loader2 ? 'animate-spin' : ''} />
                  {statusConfig.label}
                </Badge>
              </div>
              
              <p className="text-sm text-neutral-600 mb-4">{demo.content.homepage_subtitle}</p>
              
              <div className="space-y-2 text-sm text-neutral-700 mb-4">
                <p><strong>Servizi:</strong> {demo.content.services?.slice(0, 3).join(', ')}</p>
              </div>

              {demo.publish_error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>Errore:</strong> {demo.publish_error}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  data-testid={`view-demo-${demo.demo_id}`}
                  onClick={() => navigate(`/demo/${demo.demo_id}`)}
                  variant="outline"
                  className="w-full"
                >
                  <Eye className="mr-2" size={16} />
                  Visualizza Demo
                </Button>

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
                        Pubblicazione...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2" size={16} />
                        Pubblica Online
                      </>
                    )}
                  </Button>
                )}

                {demo.publish_status === 'published' && demo.live_url && (
                  <Button
                    data-testid={`open-live-${demo.demo_id}`}
                    onClick={() => window.open(demo.live_url, '_blank')}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Globe className="mr-2" size={16} />
                    Apri Sito Live
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
          </div>
        )}
      </div>
    </div>
  );
}