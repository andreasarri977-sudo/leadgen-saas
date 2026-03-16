import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { TrendingUp, Users, Globe, CheckCircle, Target, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatCard = ({ icon: Icon, label, value, trend, color }) => (
  <Card className="stat-card hover:shadow-md transition-shadow" data-testid={`stat-card-${label.toLowerCase().replace(' ', '-')}`}>
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
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_leads: 0,
    demos_created: 0,
    contacted: 0,
    clients_acquired: 0,
    new_leads: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API}/stats/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Errore caricamento statistiche:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div data-testid="dashboard-loading">
        <h1 className="text-5xl font-bold mb-8 tracking-tight">Dashboard</h1>
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
      <div className="mb-8">
        <h1 className="text-5xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-neutral-600 mt-2 text-lg">Panoramica delle tue attività di lead generation</p>
      </div>

      <div className="bento-grid">
        <StatCard
          icon={Target}
          label="Nuovi Lead"
          value={stats.new_leads}
          color="bg-blue-600"
        />
        <StatCard
          icon={Users}
          label="Lead Totali"
          value={stats.total_leads}
          color="bg-neutral-800"
        />
        <StatCard
          icon={Globe}
          label="Siti Demo Creati"
          value={stats.demos_created}
          color="bg-blue-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Clienti Acquisiti"
          value={stats.clients_acquired}
          trend={`${conversionRate}%`}
          color="bg-green-500"
        />
      </div>

      <Card className="mt-8 p-6" data-testid="quick-actions-card">
        <h2 className="text-2xl font-bold mb-4 tracking-tight">Azioni Rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/search" className="p-4 border border-neutral-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
            <Search className="mb-2" size={24} />
            <h3 className="font-bold mb-1">Cerca Nuove Aziende</h3>
            <p className="text-sm text-neutral-600">Trova aziende senza sito web nella tua zona</p>
          </a>
          <a href="/leads" className="p-4 border border-neutral-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
            <Users className="mb-2" size={24} />
            <h3 className="font-bold mb-1">Gestisci Lead</h3>
            <p className="text-sm text-neutral-600">Visualizza e gestisci i tuoi lead attivi</p>
          </a>
          <a href="/demos" className="p-4 border border-neutral-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
            <Globe className="mb-2" size={24} />
            <h3 className="font-bold mb-1">Siti Demo</h3>
            <p className="text-sm text-neutral-600">Visualizza i siti demo generati</p>
          </a>
        </div>
      </Card>

      <Card className="mt-6 p-6 bg-blue-50 border-blue-200" data-testid="api-setup-notice">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg mb-2">🔑 Configurazione API</h3>
            <p className="text-sm text-neutral-700 mb-3">Configura le tue API keys per utilizzare tutte le funzionalità della piattaforma.</p>
            <a href="/settings" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
              Vai alle Impostazioni API →
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}