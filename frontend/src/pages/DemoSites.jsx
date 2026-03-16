import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Globe, ExternalLink, Loader2, Image } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DemoSites() {
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);

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
        {demos.map((demo) => (
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
            <h3 className="text-xl font-bold mb-2 tracking-tight">{demo.business_name}</h3>
            <p className="text-sm text-neutral-600 mb-4">{demo.content.homepage_subtitle}</p>
            
            <div className="space-y-2 text-sm text-neutral-700 mb-4">
              <p><strong>Servizi:</strong> {demo.content.services?.slice(0, 3).join(', ')}</p>
            </div>

            <Button
              data-testid={`view-demo-${demo.demo_id}`}
              asChild
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <a href={demo.demo_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2" size={16} />
                Visualizza Demo
              </a>
            </Button>
          </Card>
        ))}

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