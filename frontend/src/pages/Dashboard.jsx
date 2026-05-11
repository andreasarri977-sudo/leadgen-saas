import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { TrendingUp, Users, Globe, CheckCircle, Target, Search, Mail, RefreshCw, WifiOff, Wifi, Flame, Bell, ExternalLink, Send, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import API from '@/lib/api';

// Log URL for debugging
console.log('[LeadHunter] API_BASE_URL:', API);

const StatCard = ({ icon: Icon, label, value, trend, color, href }) => (
  <Link to={href}>
    <Card className="stat-card hover:shadow-md transition-shadow cursor-pointer" data-testid={`stat-card-${label.toLowerCase().replace(' ', '-')}`}>
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
            <TrendingUp size={16} />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-neutral-600 text-sm font-medium">{label}</p>
        <p className="text-4xl font-bold mt-1 tracking-tight">{value}</p>
      </div>
    </Card>
  </Link>
);

// Backend Status Indicator
function BackendStatus({ status, lastCheck, onRetry }) {
  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <RefreshCw size={14} className="animate-spin" />
        <span>Connessione al server...</span>
      </div>
    );
  }
  
  if (status === 'offline') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-red-600">
          <WifiOff size={14} />
          <span>Server non raggiungibile</span>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry} className="h-7 text-xs">
          <RefreshCw size={12} className="mr-1" />
          Riprova
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <Wifi size={14} />
      <span>Online</span>
      {lastCheck && (
        <span className="text-neutral-400 text-xs">
          • Ultimo check: {new Date(lastCheck).toLocaleTimeString('it-IT')}
        </span>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_leads: 0,
    demos_created: 0,
    contacted: 0,
    clients_acquired: 0,
    new_leads: 0,
    emails_sent: 0
  });
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [lastHealthCheck, setLastHealthCheck] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hotLeads, setHotLeads] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [sendingFollowups, setSendingFollowups] = useState(false);

  const loadHotLeads = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/leads?action=hot_leads`);
      setHotLeads(r.data || []);
    } catch (e) { /* silent */ }
  }, []);

  const loadFollowups = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/leads?action=followups&days=3`);
      setFollowups(r.data || []);
    } catch (e) { /* silent */ }
  }, []);

  const sendBatchFollowups = async () => {
    if (followups.length === 0) return;
    if (!window.confirm(`Inviare follow-up automatici a ${followups.length} lead?`)) return;
    setSendingFollowups(true);
    try {
      const r = await axios.post(`${API}/leads?action=send_followups`, {
        lead_ids: followups.map((l) => l.lead_id)
      });
      const d = r.data || {};
      toast.success(`Email inviate: ${d.emails_sent || 0} / WhatsApp pronti: ${d.whatsapp_ready || 0}`);
      // Open WhatsApp links sequentially with a small delay
      const waLinks = (d.results || []).filter((x) => x.whatsapp_link).map((x) => x.whatsapp_link);
      if (waLinks.length > 0 && window.confirm(`Aprire ${waLinks.length} chat WhatsApp ora?`)) {
        waLinks.forEach((url, i) => setTimeout(() => window.open(url, '_blank'), i * 400));
      }
      setTimeout(loadFollowups, 1000);
    } catch (e) {
      toast.error('Errore invio follow-up');
    } finally {
      setSendingFollowups(false);
    }
  };

  // Health check con timeout
  const checkHealth = useCallback(async () => {
    setBackendStatus('checking');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8 sec timeout
      
      const response = await axios.get(`${API}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (response.data.status === 'ok') {
        setBackendStatus('online');
        setLastHealthCheck(new Date().toISOString());
        console.log('[LeadHunter] Health check OK:', response.data);
        return true;
      }
    } catch (err) {
      console.error('[LeadHunter] Health check failed:', err.message);
      setBackendStatus('offline');
      return false;
    }
    return false;
  }, []);

  // Load stats con retry
  const loadStats = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setRetryCount(prev => prev + 1);
    }
    setLoading(true);
    setError(null);
    
    try {
      // First check health
      const isHealthy = await checkHealth();
      
      if (!isHealthy) {
        setError('Il server non è raggiungibile. Riprova tra qualche secondo.');
        setLoading(false);
        return;
      }
      
      // Then load stats with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 sec timeout
      
      console.log('[LeadHunter] Fetching stats from:', `${API}/stats`);
      const response = await axios.get(`${API}/stats`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      // Check for database configuration error
      if (response.data.error) {
        console.error('[LeadHunter] API Error:', response.data);
        if (response.data.message?.includes('MONGO_URL')) {
          setError('Database non configurato. Configura MONGO_URL su Vercel.');
        } else {
          setError(`Errore API: ${response.data.error}`);
        }
        setLoading(false);
        return;
      }
      
      setStats(response.data);
      setError(null);
      console.log('[LeadHunter] Stats loaded:', response.data);
    } catch (err) {
      console.error('[LeadHunter] Error loading stats:', err.message, err.response?.data);
      
      if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
        setError('Timeout: il server sta impiegando troppo tempo. Riprova.');
      } else if (err.response?.status === 503) {
        setError('Database non configurato. Configura MONGO_URL nelle variabili d\'ambiente Vercel.');
      } else if (err.response?.status === 500) {
        const errMsg = err.response?.data?.error || 'Errore interno del server';
        setError(`Errore: ${errMsg}`);
      } else if (err.response?.status === 404) {
        setError(`Endpoint non trovato: ${API}/stats`);
      } else {
        setError(`Impossibile caricare i dati: ${err.message}`);
      }
      setBackendStatus('offline');
    } finally {
      setLoading(false);
    }
  }, [checkHealth]);

  useEffect(() => {
    loadStats();
    loadHotLeads();
    loadFollowups();
    
    // Keep-alive ping ogni 4 minuti per mantenere il backend attivo
    const keepAliveInterval = setInterval(() => {
      checkHealth();
    }, 4 * 60 * 1000);
    
    return () => clearInterval(keepAliveInterval);
  }, [loadStats, checkHealth, loadHotLeads, loadFollowups]);

  const handleRetry = () => {
    loadStats(true);
  };

  // Error state
  if (error && !loading) {
    return (
      <div data-testid="dashboard-error">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-neutral-600 mt-2 text-lg">Panoramica delle tue attività di lead generation</p>
          </div>
          <BackendStatus status={backendStatus} lastCheck={lastHealthCheck} onRetry={handleRetry} />
        </div>
        
        <Card className="p-8 text-center border-red-200 bg-red-50">
          <WifiOff size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Connessione al Server</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleRetry} className="bg-red-600 hover:bg-red-700">
            <RefreshCw size={16} className="mr-2" />
            Riprova Connessione
          </Button>
          {retryCount > 2 && (
            <p className="text-sm text-neutral-500 mt-4">
              Se il problema persiste, attendi qualche secondo e riprova.
            </p>
          )}
        </Card>
        
        {/* Quick actions sempre visibili */}
        <Card className="mt-8 p-6" data-testid="quick-actions-card">
          <h2 className="text-2xl font-bold mb-4 tracking-tight">Azioni Rapide</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 opacity-60">
            <Link to="/search" className="p-4 border border-neutral-200 rounded-lg">
              <Search className="mb-2" size={24} />
              <h3 className="font-bold mb-1">Cerca Nuove Aziende</h3>
              <p className="text-sm text-neutral-600">Trova aziende senza sito web</p>
            </Link>
            <Link to="/leads" className="p-4 border border-neutral-200 rounded-lg">
              <Users className="mb-2" size={24} />
              <h3 className="font-bold mb-1">Gestisci Lead</h3>
              <p className="text-sm text-neutral-600">Visualizza i tuoi lead</p>
            </Link>
            <Link to="/email" className="p-4 border border-neutral-200 rounded-lg">
              <Mail className="mb-2" size={24} />
              <h3 className="font-bold mb-1">Email & WhatsApp</h3>
              <p className="text-sm text-neutral-600">Invia messaggi ai lead</p>
            </Link>
            <Link to="/demos" className="p-4 border border-neutral-200 rounded-lg">
              <Globe className="mb-2" size={24} />
              <h3 className="font-bold mb-1">Siti Demo</h3>
              <p className="text-sm text-neutral-600">Visualizza i siti demo</p>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div data-testid="dashboard-loading">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-neutral-600 mt-2 text-lg">Panoramica delle tue attività di lead generation</p>
          </div>
          <BackendStatus status={backendStatus} lastCheck={lastHealthCheck} onRetry={handleRetry} />
        </div>
        <div className="bento-grid">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="stat-card animate-pulse">
              <div className="h-20 bg-neutral-100 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const conversionRate = stats.total_leads > 0 
    ? ((stats.clients_acquired / stats.total_leads) * 100).toFixed(1)
    : 0;

  return (
    <div data-testid="dashboard-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-neutral-600 mt-2 text-lg">Panoramica delle tue attività di lead generation</p>
        </div>
        <BackendStatus status={backendStatus} lastCheck={lastHealthCheck} onRetry={handleRetry} />
      </div>

      <div className="bento-grid">
        <StatCard
          icon={Target}
          label="Nuovi Lead"
          value={stats.new_leads}
          color="bg-blue-600"
          href="/leads"
        />
        <StatCard
          icon={Users}
          label="Lead Totali"
          value={stats.total_leads}
          color="bg-neutral-800"
          href="/leads"
        />
        <StatCard
          icon={Globe}
          label="Siti Demo Creati"
          value={stats.demos_created}
          color="bg-blue-500"
          href="/demos"
        />
        <StatCard
          icon={CheckCircle}
          label="Clienti Acquisiti"
          value={stats.clients_acquired}
          trend={`${conversionRate}%`}
          color="bg-green-500"
          href="/leads?status=client"
        />
      </div>

      {/* Hot Leads + Follow-ups widgets */}
      {(hotLeads.length > 0 || followups.length > 0) && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hot Leads */}
          <Card className="p-6" data-testid="hot-leads-widget">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame size={20} className="text-orange-500" />
                <h2 className="text-xl font-bold">Lead Caldi</h2>
              </div>
              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">{hotLeads.length}</span>
            </div>
            {hotLeads.length === 0 ? (
              <p className="text-sm text-neutral-500">Ancora nessun lead ha visualizzato un sito demo. Invia i primi demo!</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {hotLeads.slice(0, 6).map((l) => (
                  <Link key={l.lead_id} to={`/leads`} className="flex items-center justify-between p-2 hover:bg-orange-50 rounded-lg" data-testid={`hot-lead-${l.lead_id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate flex items-center gap-1">
                        {l.score >= 15 && <span title="Lead bollente">🔥</span>}
                        {l.score >= 8 && l.score < 15 && <span title="Lead caldo">🌶️</span>}
                        {l.name}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {l.views} viste · {l.sessions} sessioni · {l.clicks} click
                      </p>
                    </div>
                    <ExternalLink size={14} className="text-neutral-400" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Follow-ups */}
          <Card className="p-6" data-testid="followups-widget">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-blue-500" />
                <h2 className="text-xl font-bold">Da Ricontattare</h2>
              </div>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">{followups.length}</span>
            </div>
            {followups.length === 0 ? (
              <p className="text-sm text-neutral-500">Nessun lead da ricontattare oggi.</p>
            ) : (
              <>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 mb-3">
                  {followups.slice(0, 8).map((l) => (
                    <div key={l.lead_id} className="flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg" data-testid={`followup-${l.lead_id}`}>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{l.name}</p>
                        <p className="text-xs text-neutral-500 truncate">{l.category || ''} · {l.city || ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={sendBatchFollowups}
                  disabled={sendingFollowups}
                  data-testid="send-batch-followups"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {sendingFollowups ? <Loader2 className="mr-2 animate-spin" size={14} /> : <Send className="mr-2" size={14} />}
                  Invia Follow-up a Tutti ({followups.length})
                </Button>
                <p className="text-[10px] text-neutral-500 mt-2 text-center">
                  Email automatiche via Resend + apertura sequenziale chat WhatsApp
                </p>
              </>
            )}
          </Card>
        </div>
      )}

      <Card className="mt-8 p-6" data-testid="quick-actions-card">
        <h2 className="text-2xl font-bold mb-4 tracking-tight">Azioni Rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link to="/search" className="p-4 border border-neutral-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
            <Search className="mb-2" size={24} />
            <h3 className="font-bold mb-1">Cerca Nuove Aziende</h3>
            <p className="text-sm text-neutral-600">Trova aziende senza sito web nella tua zona</p>
          </Link>
          <Link to="/leads" className="p-4 border border-neutral-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
            <Users className="mb-2" size={24} />
            <h3 className="font-bold mb-1">Gestisci Lead</h3>
            <p className="text-sm text-neutral-600">Visualizza e gestisci i tuoi lead attivi</p>
          </Link>
          <Link to="/email" className="p-4 border-2 border-purple-300 rounded-lg hover:shadow-md hover:border-purple-400 transition-all cursor-pointer bg-purple-50">
            <Mail className="mb-2 text-purple-600" size={24} />
            <h3 className="font-bold mb-1 text-purple-900">Email & WhatsApp</h3>
            <p className="text-sm text-purple-700">Invia messaggi AI ai tuoi lead</p>
          </Link>
          <Link to="/demos" className="p-4 border border-neutral-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
            <Globe className="mb-2" size={24} />
            <h3 className="font-bold mb-1">Siti Demo</h3>
            <p className="text-sm text-neutral-600">Visualizza i siti demo generati</p>
          </Link>
        </div>
      </Card>

      <Card className="mt-6 p-6 bg-blue-50 border-blue-200" data-testid="api-setup-notice">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg mb-2">Configurazione API</h3>
            <p className="text-sm text-neutral-700 mb-3">Configura le tue API keys per utilizzare tutte le funzionalità della piattaforma.</p>
            <Link to="/settings" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
              Vai alle Impostazioni API
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
