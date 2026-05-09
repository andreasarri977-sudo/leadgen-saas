import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Save, RefreshCw, Clock, UtensilsCrossed, FileText, 
  Phone, Images, Search, Loader2, CheckCircle, AlertCircle, ExternalLink,
  Plus, Trash2, GripVertical, X, ImageIcon, Upload, Palette, Star, HelpCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import API from '@/lib/api';

// Color schemes
const COLOR_SCHEMES = [
  { id: 'blue', name: 'Blu', color: '#2563eb', preview: 'bg-blue-600' },
  { id: 'purple', name: 'Viola', color: '#9333ea', preview: 'bg-purple-600' },
  { id: 'green', name: 'Verde', color: '#16a34a', preview: 'bg-green-600' },
  { id: 'orange', name: 'Arancione', color: '#ea580c', preview: 'bg-orange-600' },
  { id: 'red', name: 'Rosso', color: '#dc2626', preview: 'bg-red-600' },
  { id: 'pink', name: 'Rosa', color: '#db2777', preview: 'bg-pink-600' },
  { id: 'teal', name: 'Verde Acqua', color: '#0d9488', preview: 'bg-teal-600' },
  { id: 'indigo', name: 'Indaco', color: '#4f46e5', preview: 'bg-indigo-600' },
  { id: 'slate', name: 'Ardesia', color: '#475569', preview: 'bg-slate-600' },
  { id: 'amber', name: 'Ambra', color: '#d97706', preview: 'bg-amber-600' }
];

const DAYS = [
  { code: 'mon', name: 'Lunedì' },
  { code: 'tue', name: 'Martedì' },
  { code: 'wed', name: 'Mercoledì' },
  { code: 'thu', name: 'Giovedì' },
  { code: 'fri', name: 'Venerdì' },
  { code: 'sat', name: 'Sabato' },
  { code: 'sun', name: 'Domenica' }
];

// Style Editor Component
function StyleEditor({ heroImage, colorScheme, theme, gallery, onUpdate, onSave, saving }) {
  const [selectedColor, setSelectedColor] = useState(colorScheme || 'blue');
  const [selectedHero, setSelectedHero] = useState(heroImage || '');
  
  // Find initial index based on heroImage
  const findHeroIndex = () => {
    if (!heroImage || !gallery || gallery.length === 0) return -1;
    return gallery.findIndex(img => {
      const imgUrl = typeof img === 'string' ? img : img.url;
      return imgUrl === heroImage;
    });
  };
  
  const [selectedHeroIndex, setSelectedHeroIndex] = useState(findHeroIndex());
  
  const handleColorChange = (colorId) => {
    setSelectedColor(colorId);
    onUpdate({ color_scheme: colorId, hero_image: selectedHero, theme });
  };
  
  const handleHeroChange = (imageUrl, index) => {
    setSelectedHeroIndex(index);
    setSelectedHero(imageUrl);
    onUpdate({ hero_image: imageUrl, color_scheme: selectedColor, theme });
  };
  
  const handleSave = () => {
    onSave({
      hero_image: selectedHero,
      color_scheme: selectedColor,
      theme: theme
    });
  };
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Stile del Sito</h3>
      
      {/* Color Scheme */}
      <div className="mb-8">
        <Label className="text-base font-medium mb-3 block">Colore Principale</Label>
        <p className="text-sm text-neutral-500 mb-4">Scegli il colore dei pulsanti e degli elementi principali</p>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
          {COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.id}
              onClick={() => handleColorChange(scheme.id)}
              className={`w-10 h-10 rounded-full ${scheme.preview} transition-all hover:scale-110 ${
                selectedColor === scheme.id ? 'ring-4 ring-offset-2 ring-blue-400' : ''
              }`}
              title={scheme.name}
            />
          ))}
        </div>
        <p className="text-sm text-neutral-500 mt-2">
          Selezionato: <span className="font-medium">{COLOR_SCHEMES.find(c => c.id === selectedColor)?.name}</span>
        </p>
      </div>
      
      {/* Hero Image Selection */}
      <div className="mb-8">
        <Label className="text-base font-medium mb-3 block">Immagine Hero (Sfondo principale)</Label>
        <p className="text-sm text-neutral-500 mb-4">Seleziona l'immagine da usare come sfondo nella sezione principale</p>
        
        {gallery && gallery.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {gallery.map((img, index) => {
              const imageUrl = typeof img === 'string' ? img : img.url;
              const isSelected = selectedHero === imageUrl || selectedHeroIndex === index;
              return (
                <button
                  key={index}
                  onClick={() => handleHeroChange(imageUrl, index)}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <img src={imageUrl} alt={`Opzione ${index + 1}`} className="w-full h-full object-cover" />
                  {isSelected && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <CheckCircle className="text-white" size={24} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-neutral-100 rounded-lg p-8 text-center">
            <ImageIcon className="mx-auto text-neutral-400 mb-2" size={32} />
            <p className="text-neutral-500">Nessuna immagine disponibile nella galleria</p>
            <p className="text-sm text-neutral-400 mt-1">Aggiungi immagini nella tab "Galleria"</p>
          </div>
        )}
        
        {selectedHero && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✓ Immagine hero selezionata. Clicca "Salva Stile" per applicare.
            </p>
          </div>
        )}
      </div>
      
      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="mr-2 animate-spin" size={16} />
            Salvataggio...
          </>
        ) : (
          <>
            <Save className="mr-2" size={16} />
            Salva Stile
          </>
        )}
      </Button>
    </Card>
  );
}

export default function SiteEditor() {
  const { demoId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [republishing, setRepublishing] = useState(false);
  const [siteData, setSiteData] = useState(null);
  const [hasChanges, setHasChanges] = useState({});

  // Load site data
  useEffect(() => {
    loadSiteData();
  }, [demoId]);

  const loadSiteData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/demos/${demoId}?action=editor-data`);
      setSiteData(response.data);
      setHasChanges({});
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      toast.error('Errore nel caricamento dei dati del sito');
    } finally {
      setLoading(false);
    }
  };

  // Save a section
  const saveSection = async (section, data) => {
    setSaving(prev => ({ ...prev, [section]: true }));
    try {
      const response = await axios.post(`${API}/demos/${demoId}?action=update`, {
        section,
        data
      });
      
      if (response.data.success) {
        toast.success(`Sezione "${section}" salvata!`);
        setHasChanges(prev => ({ ...prev, [section]: false }));
      } else {
        toast.error(response.data.errors?.join(', ') || 'Errore salvataggio');
      }
    } catch (error) {
      console.error('Errore salvataggio:', error);
      toast.error(error.response?.data?.detail || 'Errore durante il salvataggio');
    } finally {
      setSaving(prev => ({ ...prev, [section]: false }));
    }
  };

  // Republish
  const handleRepublish = async () => {
    setRepublishing(true);
    try {
      const response = await axios.post(`${API}/demos/${demoId}?action=republish`);
      if (response.data.success) {
        toast.success('Sito ripubblicato con successo!');
        setSiteData(prev => ({
          ...prev,
          production_url: response.data.production_url,
          publish_status: 'published'
        }));
      } else {
        toast.error(response.data.error || 'Errore durante la ripubblicazione');
      }
    } catch (error) {
      console.error('Errore ripubblicazione:', error);
      toast.error(error.response?.data?.detail || 'Errore durante la ripubblicazione');
    } finally {
      setRepublishing(false);
    }
  };

  // Update local state
  const updateSection = useCallback((section, newData) => {
    setSiteData(prev => ({
      ...prev,
      [section]: newData
    }));
    setHasChanges(prev => ({ ...prev, [section]: true }));
  }, []);

  if (loading) {
    return (
      <div data-testid="editor-loading" className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!siteData) {
    return (
      <div data-testid="editor-error" className="text-center py-12">
        <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
        <p className="text-lg">Sito non trovato</p>
        <Button onClick={() => navigate('/demos')} className="mt-4">
          Torna ai Siti Demo
        </Button>
      </div>
    );
  }

  return (
    <div data-testid="site-editor-page" className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/demos')}
            data-testid="back-to-demos"
          >
            <ArrowLeft size={20} className="mr-2" />
            Indietro
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{siteData.business_name}</h1>
            <p className="text-sm text-neutral-500">Editor Sito</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {siteData.production_url && (
            <a
              href={siteData.production_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink size={14} />
              Vedi sito live
            </a>
          )}
          <Badge variant={siteData.publish_status === 'published' ? 'default' : 'secondary'}>
            {siteData.publish_status === 'published' ? 'Online' : 'Bozza'}
          </Badge>
        </div>
      </div>

      {/* Tabs Editor */}
      <Tabs defaultValue="logo" className="w-full">
        <TabsList className="grid w-full grid-cols-5 sm:grid-cols-10 mb-6 gap-1">
          <TabsTrigger value="logo" data-testid="tab-logo" className="flex items-center gap-1 text-xs sm:text-sm">
            <ImageIcon size={14} />
            <span className="hidden sm:inline">Logo</span>
          </TabsTrigger>
          <TabsTrigger value="style" data-testid="tab-style" className="flex items-center gap-1 text-xs sm:text-sm">
            <Palette size={14} />
            <span className="hidden sm:inline">Stile</span>
          </TabsTrigger>
          <TabsTrigger value="hours" data-testid="tab-hours" className="flex items-center gap-1 text-xs sm:text-sm">
            <Clock size={14} />
            <span className="hidden sm:inline">Orari</span>
          </TabsTrigger>
          <TabsTrigger value="menu" data-testid="tab-menu" className="flex items-center gap-1 text-xs sm:text-sm">
            <UtensilsCrossed size={14} />
            <span className="hidden sm:inline">Menu</span>
          </TabsTrigger>
          <TabsTrigger value="texts" data-testid="tab-texts" className="flex items-center gap-1 text-xs sm:text-sm">
            <FileText size={14} />
            <span className="hidden sm:inline">Testi</span>
          </TabsTrigger>
          <TabsTrigger value="whyus" data-testid="tab-whyus" className="flex items-center gap-1 text-xs sm:text-sm">
            <Star size={14} />
            <span className="hidden sm:inline">Perché Noi</span>
          </TabsTrigger>
          <TabsTrigger value="faq" data-testid="tab-faq" className="flex items-center gap-1 text-xs sm:text-sm">
            <HelpCircle size={14} />
            <span className="hidden sm:inline">FAQ</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" data-testid="tab-contacts" className="flex items-center gap-1 text-xs sm:text-sm">
            <Phone size={14} />
            <span className="hidden sm:inline">Contatti</span>
          </TabsTrigger>
          <TabsTrigger value="gallery" data-testid="tab-gallery" className="flex items-center gap-1 text-xs sm:text-sm">
            <Images size={14} />
            <span className="hidden sm:inline">Galleria</span>
          </TabsTrigger>
          <TabsTrigger value="seo" data-testid="tab-seo" className="flex items-center gap-1 text-xs sm:text-sm">
            <Search size={14} />
            <span className="hidden sm:inline">SEO</span>
          </TabsTrigger>
        </TabsList>

        {/* LOGO */}
        <TabsContent value="logo">
          <LogoEditor
            logoBase64={siteData.logo_base64}
            demoId={demoId}
            onSave={saveSection}
            saving={saving.logo}
            onLogoUpdated={loadSiteData}
          />
        </TabsContent>

        {/* STILE - Hero e Colori */}
        <TabsContent value="style">
          <StyleEditor 
            heroImage={siteData.hero_image}
            colorScheme={siteData.color_scheme || 'blue'}
            theme={siteData.theme || 'modern'}
            gallery={siteData.gallery || []}
            onUpdate={(data) => {
              setSiteData(prev => ({
                ...prev,
                hero_image: data.hero_image !== undefined ? data.hero_image : prev.hero_image,
                color_scheme: data.color_scheme !== undefined ? data.color_scheme : prev.color_scheme,
                theme: data.theme !== undefined ? data.theme : prev.theme
              }));
              setHasChanges(prev => ({ ...prev, style: true }));
            }}
            onSave={(styleData) => saveSection('style', styleData)}
            saving={saving.style}
          />
        </TabsContent>

        {/* ORARI */}
        <TabsContent value="hours">
          <HoursEditor 
            hours={siteData.hours} 
            onUpdate={(data) => updateSection('hours', data)}
            onSave={() => saveSection('hours', siteData.hours)}
            saving={saving.hours}
            hasChanges={hasChanges.hours}
          />
        </TabsContent>

        {/* MENU / SERVIZI */}
        <TabsContent value="menu">
          <MenuEditor
            menu={siteData.menu}
            onUpdate={(data) => updateSection('menu', data)}
            onSave={() => saveSection('menu', siteData.menu)}
            saving={saving.menu}
            hasChanges={hasChanges.menu}
          />
        </TabsContent>

        {/* TESTI */}
        <TabsContent value="texts">
          <TextsEditor
            texts={siteData.texts}
            localeLang={siteData.locale_lang}
            onUpdate={(data) => updateSection('texts', data)}
            onSave={() => saveSection('texts', siteData.texts)}
            saving={saving.texts}
            hasChanges={hasChanges.texts}
          />
        </TabsContent>

        {/* PERCHÉ SCEGLIERCI */}
        <TabsContent value="whyus">
          <WhyUsEditor
            whyUs={siteData.why_choose_us}
            onUpdate={(data) => updateSection('why_choose_us', data)}
            onSave={() => saveSection('why_choose_us', siteData.why_choose_us)}
            saving={saving.why_choose_us}
            hasChanges={hasChanges.why_choose_us}
          />
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq">
          <FaqEditor
            faq={siteData.faq}
            onUpdate={(data) => updateSection('faq', data)}
            onSave={() => saveSection('faq', siteData.faq)}
            saving={saving.faq}
            hasChanges={hasChanges.faq}
          />
        </TabsContent>

        {/* CONTATTI */}
        <TabsContent value="contacts">
          <ContactsEditor
            contacts={siteData.contacts}
            onUpdate={(data) => updateSection('contacts', data)}
            onSave={() => saveSection('contacts', siteData.contacts)}
            saving={saving.contacts}
            hasChanges={hasChanges.contacts}
          />
        </TabsContent>

        {/* GALLERIA */}
        <TabsContent value="gallery">
          <GalleryEditor
            gallery={siteData.gallery}
            onUpdate={(data) => updateSection('gallery', data)}
            onSave={() => saveSection('gallery', { images: siteData.gallery })}
            saving={saving.gallery}
            hasChanges={hasChanges.gallery}
          />
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo">
          <SeoEditor
            seo={siteData.seo}
            localeLang={siteData.locale_lang}
            onUpdate={(data) => updateSection('seo', data)}
            onSave={() => saveSection('seo', siteData.seo)}
            saving={saving.seo}
            hasChanges={hasChanges.seo}
          />
        </TabsContent>
      </Tabs>

      {/* Republish Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-center z-50">
        <Button
          data-testid="republish-btn"
          onClick={handleRepublish}
          disabled={republishing}
          className="bg-green-600 hover:bg-green-700 px-8"
          size="lg"
        >
          {republishing ? (
            <>
              <Loader2 className="mr-2 animate-spin" size={18} />
              Ripubblicazione...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2" size={18} />
              Ripubblica su Vercel
            </>
          )}
        </Button>
      </div>

      {/* Spacer for fixed button */}
      <div className="h-24" />
    </div>
  );
}

// ========== SUB-COMPONENTS ==========

function SaveButton({ onClick, saving, hasChanges }) {
  return (
    <Button
      onClick={onClick}
      disabled={saving || !hasChanges}
      className="mt-4"
      data-testid="save-section-btn"
    >
      {saving ? (
        <Loader2 className="mr-2 animate-spin" size={16} />
      ) : hasChanges ? (
        <Save className="mr-2" size={16} />
      ) : (
        <CheckCircle className="mr-2" size={16} />
      )}
      {saving ? 'Salvataggio...' : hasChanges ? 'Salva Modifiche' : 'Salvato'}
    </Button>
  );
}

// LOGO EDITOR
function LogoEditor({ logoBase64, demoId, onSave, saving, onLogoUpdated }) {
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewBase64, setPreviewBase64] = useState(logoBase64);

  const handleUrlUpload = async () => {
    if (!logoUrl || !logoUrl.startsWith('http')) {
      toast.error('Inserisci un URL valido (inizia con http)');
      return;
    }
    
    setUploading(true);
    try {
      const response = await axios.post(`${API}/demos/${demoId}?action=update`, {
        section: 'logo',
        data: { logo_url: logoUrl }
      });
      
      if (response.data.success) {
        toast.success('Logo aggiornato!');
        setLogoUrl('');
        onLogoUpdated(); // Refresh data
      } else {
        toast.error(response.data.errors?.join(', ') || 'Errore upload');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un file immagine valido');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Il file è troppo grande (max 2MB)');
      return;
    }
    
    setUploading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result.split(',')[1]; // Remove data:image/...;base64, prefix
        
        const response = await axios.post(`${API}/demos/${demoId}?action=update`, {
          section: 'logo',
          data: { logo_base64: base64 }
        });
        
        if (response.data.success) {
          toast.success('Logo caricato!');
          onLogoUpdated();
        } else {
          toast.error(response.data.errors?.join(', ') || 'Errore upload');
        }
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error('Errore lettura file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Errore durante l\'upload');
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setUploading(true);
    try {
      const response = await axios.post(`${API}/demos/${demoId}?action=update`, {
        section: 'logo',
        data: { remove_logo: true }
      });
      
      if (response.data.success) {
        toast.success('Logo rimosso');
        onLogoUpdated();
      } else {
        toast.error('Errore rimozione logo');
      }
    } catch (error) {
      toast.error('Errore durante la rimozione');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6" data-testid="logo-editor">
      <h2 className="text-xl font-semibold mb-4">Logo Aziendale</h2>
      
      {/* Current Logo Preview */}
      <div className="mb-6">
        <Label className="text-sm text-neutral-500 mb-2 block">Logo Attuale</Label>
        <div className="flex items-center gap-4">
          {logoBase64 ? (
            <div className="relative">
              <img
                src={`data:image/png;base64,${logoBase64}`}
                alt="Logo attuale"
                className="w-32 h-32 object-contain bg-neutral-100 rounded-lg border p-2"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2"
                onClick={handleRemoveLogo}
                disabled={uploading}
              >
                <X size={14} />
              </Button>
            </div>
          ) : (
            <div className="w-32 h-32 bg-neutral-100 rounded-lg border flex items-center justify-center">
              <ImageIcon size={32} className="text-neutral-300" />
            </div>
          )}
        </div>
      </div>

      {/* Upload Options */}
      <div className="space-y-4">
        {/* Option 1: URL */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Carica da URL</Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://esempio.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              data-testid="logo-url-input"
            />
            <Button 
              onClick={handleUrlUpload} 
              disabled={uploading || !logoUrl}
              data-testid="logo-url-upload-btn"
            >
              {uploading ? <Loader2 className="animate-spin" size={16} /> : 'Carica'}
            </Button>
          </div>
        </div>

        {/* Option 2: File Upload */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Carica da File</Label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="logo-file-input"
              data-testid="logo-file-input"
            />
            <label
              htmlFor="logo-file-input"
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg cursor-pointer transition-colors"
            >
              <Upload size={16} />
              Seleziona File
            </label>
            <span className="text-xs text-neutral-500">PNG, JPG, WebP (max 2MB)</span>
          </div>
        </div>
      </div>

      {uploading && (
        <div className="mt-4 flex items-center gap-2 text-blue-600">
          <Loader2 className="animate-spin" size={16} />
          <span>Caricamento in corso...</span>
        </div>
      )}
    </Card>
  );
}

// HOURS EDITOR
function HoursEditor({ hours, onUpdate, onSave, saving, hasChanges }) {
  const updateDay = (dayCode, field, value) => {
    const newHours = { ...hours };
    newHours[dayCode] = { ...newHours[dayCode], [field]: value };
    onUpdate(newHours);
  };

  return (
    <Card className="p-6" data-testid="hours-editor">
      <h2 className="text-xl font-semibold mb-4">Orari di Apertura</h2>
      <div className="space-y-4">
        {DAYS.map(day => (
          <div key={day.code} className="flex items-center gap-4 p-3 bg-neutral-50 rounded-lg">
            <div className="w-24 font-medium">{day.name}</div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={!hours[day.code]?.closed}
                onCheckedChange={(checked) => updateDay(day.code, 'closed', !checked)}
                data-testid={`hours-${day.code}-switch`}
              />
              <span className="text-sm text-neutral-500">
                {hours[day.code]?.closed ? 'Chiuso' : 'Aperto'}
              </span>
            </div>

            {!hours[day.code]?.closed && (
              <>
                <Input
                  type="time"
                  value={hours[day.code]?.open || ''}
                  onChange={(e) => updateDay(day.code, 'open', e.target.value)}
                  className="w-32"
                  data-testid={`hours-${day.code}-open`}
                />
                <span>-</span>
                <Input
                  type="time"
                  value={hours[day.code]?.close || ''}
                  onChange={(e) => updateDay(day.code, 'close', e.target.value)}
                  className="w-32"
                  data-testid={`hours-${day.code}-close`}
                />
                <Input
                  type="text"
                  placeholder="Note (opzionale)"
                  value={hours[day.code]?.note || ''}
                  onChange={(e) => updateDay(day.code, 'note', e.target.value)}
                  className="flex-1"
                  data-testid={`hours-${day.code}-note`}
                />
              </>
            )}
          </div>
        ))}
      </div>
      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// MENU EDITOR
function MenuEditor({ menu, onUpdate, onSave, saving, hasChanges }) {
  const isMenuMode = menu?.mode === 'menu';

  const addCategory = () => {
    const newCategories = [...(menu.categories || []), { name: '', items: [''] }];
    onUpdate({ ...menu, categories: newCategories });
  };

  const updateCategory = (index, field, value) => {
    const newCategories = [...(menu.categories || [])];
    newCategories[index] = { ...newCategories[index], [field]: value };
    onUpdate({ ...menu, categories: newCategories });
  };

  const addItemToCategory = (catIndex) => {
    const newCategories = [...(menu.categories || [])];
    newCategories[catIndex].items = [...(newCategories[catIndex].items || []), ''];
    onUpdate({ ...menu, categories: newCategories });
  };

  const updateItem = (catIndex, itemIndex, value) => {
    const newCategories = [...(menu.categories || [])];
    newCategories[catIndex].items[itemIndex] = value;
    onUpdate({ ...menu, categories: newCategories });
  };

  const removeItem = (catIndex, itemIndex) => {
    const newCategories = [...(menu.categories || [])];
    newCategories[catIndex].items = newCategories[catIndex].items.filter((_, i) => i !== itemIndex);
    onUpdate({ ...menu, categories: newCategories });
  };

  const removeCategory = (index) => {
    const newCategories = (menu.categories || []).filter((_, i) => i !== index);
    onUpdate({ ...menu, categories: newCategories });
  };

  // Services mode
  const addService = () => {
    const newServices = [...(menu.services || []), ''];
    onUpdate({ ...menu, services: newServices });
  };

  const updateService = (index, value) => {
    const newServices = [...(menu.services || [])];
    newServices[index] = value;
    onUpdate({ ...menu, services: newServices });
  };

  const removeService = (index) => {
    const newServices = (menu.services || []).filter((_, i) => i !== index);
    onUpdate({ ...menu, services: newServices });
  };

  return (
    <Card className="p-6" data-testid="menu-editor">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {isMenuMode ? 'Menu' : 'Servizi'}
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className={!isMenuMode ? 'font-medium' : 'text-neutral-400'}>Servizi</span>
          <Switch
            checked={isMenuMode}
            onCheckedChange={(checked) => onUpdate({ ...menu, mode: checked ? 'menu' : 'services' })}
            data-testid="menu-mode-switch"
          />
          <span className={isMenuMode ? 'font-medium' : 'text-neutral-400'}>Menu</span>
        </div>
      </div>

      {isMenuMode ? (
        // Menu categories
        <div className="space-y-6">
          {(menu.categories || []).map((category, catIndex) => (
            <div key={catIndex} className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Input
                  placeholder="Nome categoria (es. Antipasti)"
                  value={category.name || ''}
                  onChange={(e) => updateCategory(catIndex, 'name', e.target.value)}
                  className="font-medium"
                  data-testid={`category-${catIndex}-name`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCategory(catIndex)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              
              <div className="space-y-2 ml-4">
                {(category.items || []).map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center gap-2">
                    <GripVertical size={16} className="text-neutral-300" />
                    <Input
                      placeholder="Nome piatto"
                      value={item || ''}
                      onChange={(e) => updateItem(catIndex, itemIndex, e.target.value)}
                      data-testid={`category-${catIndex}-item-${itemIndex}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(catIndex, itemIndex)}
                      className="text-neutral-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addItemToCategory(catIndex)}
                  className="text-blue-600"
                >
                  <Plus size={16} className="mr-1" />
                  Aggiungi piatto
                </Button>
              </div>
            </div>
          ))}
          
          <Button variant="outline" onClick={addCategory} data-testid="add-category-btn">
            <Plus size={16} className="mr-2" />
            Aggiungi Categoria
          </Button>
        </div>
      ) : (
        // Services list
        <div className="space-y-3">
          {(menu.services || []).map((service, index) => (
            <div key={index} className="flex items-center gap-2">
              <GripVertical size={16} className="text-neutral-300" />
              <Input
                placeholder="Nome servizio"
                value={service || ''}
                onChange={(e) => updateService(index, e.target.value)}
                data-testid={`service-${index}`}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeService(index)}
                className="text-neutral-400 hover:text-red-500"
              >
                <X size={16} />
              </Button>
            </div>
          ))}
          
          <Button variant="outline" onClick={addService} data-testid="add-service-btn">
            <Plus size={16} className="mr-2" />
            Aggiungi Servizio
          </Button>
        </div>
      )}

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// TEXTS EDITOR
function TextsEditor({ texts, localeLang, onUpdate, onSave, saving, hasChanges }) {
  const langLabel = localeLang === 'it' ? 'Italiano' : localeLang.toUpperCase();

  return (
    <Card className="p-6" data-testid="texts-editor">
      <h2 className="text-xl font-semibold mb-4">Testi del Sito</h2>
      
      <div className="space-y-6">
        {/* Tagline */}
        <div>
          <Label className="text-base font-medium">Tagline / Slogan</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <Label className="text-xs text-neutral-500">{langLabel}</Label>
              <Input
                placeholder={`Tagline in ${langLabel}`}
                value={texts?.tagline_local || ''}
                onChange={(e) => onUpdate({ ...texts, tagline_local: e.target.value })}
                data-testid="tagline-local"
              />
            </div>
            <div>
              <Label className="text-xs text-neutral-500">English</Label>
              <Input
                placeholder="Tagline in English"
                value={texts?.tagline_en || ''}
                onChange={(e) => onUpdate({ ...texts, tagline_en: e.target.value })}
                data-testid="tagline-en"
              />
            </div>
          </div>
        </div>

        {/* About */}
        <div>
          <Label className="text-base font-medium">Chi Siamo</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <Label className="text-xs text-neutral-500">{langLabel}</Label>
              <Textarea
                placeholder={`Descrizione in ${langLabel}`}
                value={texts?.about_local || ''}
                onChange={(e) => onUpdate({ ...texts, about_local: e.target.value })}
                rows={5}
                data-testid="about-local"
              />
            </div>
            <div>
              <Label className="text-xs text-neutral-500">English</Label>
              <Textarea
                placeholder="Description in English"
                value={texts?.about_en || ''}
                onChange={(e) => onUpdate({ ...texts, about_en: e.target.value })}
                rows={5}
                data-testid="about-en"
              />
            </div>
          </div>
        </div>
      </div>

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// CONTACTS EDITOR
function ContactsEditor({ contacts, onUpdate, onSave, saving, hasChanges }) {
  return (
    <Card className="p-6" data-testid="contacts-editor">
      <h2 className="text-xl font-semibold mb-4">Informazioni di Contatto</h2>
      
      <div className="space-y-4 max-w-md">
        <div>
          <Label>Telefono</Label>
          <Input
            type="tel"
            placeholder="+39 123 456 7890"
            value={contacts?.phone || ''}
            onChange={(e) => onUpdate({ ...contacts, phone: e.target.value })}
            data-testid="contact-phone"
          />
        </div>
        
        <div>
          <Label>WhatsApp</Label>
          <Input
            type="tel"
            placeholder="+39 123 456 7890"
            value={contacts?.whatsapp || ''}
            onChange={(e) => onUpdate({ ...contacts, whatsapp: e.target.value })}
            data-testid="contact-whatsapp"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Lascia vuoto per usare lo stesso numero del telefono
          </p>
        </div>
        
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="info@esempio.it"
            value={contacts?.email || ''}
            onChange={(e) => onUpdate({ ...contacts, email: e.target.value })}
            data-testid="contact-email"
          />
        </div>
        
        {/* Social Media Links */}
        <div className="pt-4 border-t">
          <h3 className="text-lg font-medium mb-3">Social Media</h3>
          <p className="text-sm text-neutral-500 mb-4">
            Aggiungi i link ai profili social dell'attività
          </p>
          
          <div className="space-y-3">
            <div>
              <Label>Instagram</Label>
              <Input
                type="url"
                placeholder="https://instagram.com/tuoprofilo"
                value={contacts?.instagram_url || ''}
                onChange={(e) => onUpdate({ ...contacts, instagram_url: e.target.value })}
                data-testid="contact-instagram"
              />
            </div>
            
            <div>
              <Label>Facebook</Label>
              <Input
                type="url"
                placeholder="https://facebook.com/tuapagina"
                value={contacts?.facebook_url || ''}
                onChange={(e) => onUpdate({ ...contacts, facebook_url: e.target.value })}
                data-testid="contact-facebook"
              />
            </div>
            
            <div>
              <Label>TikTok</Label>
              <Input
                type="url"
                placeholder="https://tiktok.com/@tuoprofilo"
                value={contacts?.tiktok_url || ''}
                onChange={(e) => onUpdate({ ...contacts, tiktok_url: e.target.value })}
                data-testid="contact-tiktok"
              />
            </div>
          </div>
        </div>
      </div>

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// GALLERY EDITOR
function GalleryEditor({ gallery, onUpdate, onSave, saving, hasChanges }) {
  const [newUrl, setNewUrl] = useState('');

  const addImage = () => {
    if (!newUrl || !newUrl.startsWith('http')) {
      toast.error('Inserisci un URL valido (inizia con http)');
      return;
    }
    const newGallery = [
      ...(gallery || []),
      { url: newUrl, caption: '', order: (gallery || []).length }
    ];
    onUpdate(newGallery);
    setNewUrl('');
  };

  const removeImage = (index) => {
    const newGallery = (gallery || []).filter((_, i) => i !== index);
    // Update order
    newGallery.forEach((img, i) => img.order = i);
    onUpdate(newGallery);
  };

  const moveImage = (index, direction) => {
    const newGallery = [...(gallery || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newGallery.length) return;
    
    [newGallery[index], newGallery[newIndex]] = [newGallery[newIndex], newGallery[index]];
    newGallery.forEach((img, i) => img.order = i);
    onUpdate(newGallery);
  };

  return (
    <Card className="p-6" data-testid="gallery-editor">
      <h2 className="text-xl font-semibold mb-4">Galleria Immagini</h2>
      
      {/* Add new image */}
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="URL immagine (https://...)"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          data-testid="gallery-new-url"
        />
        <Button onClick={addImage} data-testid="gallery-add-btn">
          <Plus size={16} className="mr-2" />
          Aggiungi
        </Button>
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {(gallery || []).map((img, index) => (
          <div key={index} className="relative group">
            <img
              src={img.url}
              alt={`Gallery ${index + 1}`}
              className="w-full h-32 object-cover rounded-lg border"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23eee" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">Errore</text></svg>';
              }}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-white"
                onClick={() => moveImage(index, -1)}
                disabled={index === 0}
              >
                ←
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white"
                onClick={() => moveImage(index, 1)}
                disabled={index === (gallery || []).length - 1}
              >
                →
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300"
                onClick={() => removeImage(index)}
                data-testid={`gallery-remove-${index}`}
              >
                <Trash2 size={16} />
              </Button>
            </div>
            <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded">
              #{index + 1}
            </span>
          </div>
        ))}
      </div>

      {(gallery || []).length === 0 && (
        <div className="text-center py-8 text-neutral-500">
          <Images size={48} className="mx-auto mb-2 opacity-50" />
          <p>Nessuna immagine nella galleria</p>
          <p className="text-sm">Aggiungi immagini tramite URL</p>
        </div>
      )}

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// WHY CHOOSE US EDITOR
function WhyUsEditor({ whyUs, onUpdate, onSave, saving, hasChanges }) {
  const items = whyUs || [];
  
  const addItem = () => {
    onUpdate([...items, { title: '', description: '' }]);
  };
  
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate(newItems);
  };
  
  const removeItem = (index) => {
    onUpdate(items.filter((_, i) => i !== index));
  };
  
  const moveItem = (index, direction) => {
    const newItems = [...items];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newItems.length) return;
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onUpdate(newItems);
  };

  return (
    <Card className="p-6" data-testid="whyus-editor">
      <h2 className="text-xl font-semibold mb-2">Perché Sceglierci</h2>
      <p className="text-sm text-neutral-500 mb-6">Aggiungi i punti di forza della tua attività che convinceranno i clienti a sceglierti.</p>
      
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="p-4 border rounded-lg bg-neutral-50">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className="h-6 w-6 p-0"
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  className="h-6 w-6 p-0"
                >
                  ↓
                </Button>
              </div>
              
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-xs text-neutral-500">Titolo (es. "Esperienza", "Qualità")</Label>
                  <Input
                    placeholder="Titolo punto di forza"
                    value={item.title || ''}
                    onChange={(e) => updateItem(index, 'title', e.target.value)}
                    data-testid={`whyus-title-${index}`}
                  />
                </div>
                <div>
                  <Label className="text-xs text-neutral-500">Descrizione</Label>
                  <Textarea
                    placeholder="Descrivi perché questo è un vantaggio per il cliente..."
                    value={item.description || ''}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    rows={2}
                    data-testid={`whyus-desc-${index}`}
                  />
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}
        
        {items.length < 6 && (
          <Button variant="outline" onClick={addItem} className="w-full" data-testid="whyus-add-btn">
            <Plus size={16} className="mr-2" />
            Aggiungi Punto di Forza
          </Button>
        )}
        
        {items.length === 0 && (
          <div className="text-center py-8 text-neutral-500">
            <Star size={48} className="mx-auto mb-2 opacity-30" />
            <p>Nessun punto di forza aggiunto</p>
            <p className="text-sm">Aggiungi i motivi per cui i clienti dovrebbero sceglierti</p>
          </div>
        )}
      </div>

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// FAQ EDITOR
function FaqEditor({ faq, onUpdate, onSave, saving, hasChanges }) {
  const items = faq || [];
  
  const addItem = () => {
    onUpdate([...items, { question: '', answer: '' }]);
  };
  
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate(newItems);
  };
  
  const removeItem = (index) => {
    onUpdate(items.filter((_, i) => i !== index));
  };
  
  const moveItem = (index, direction) => {
    const newItems = [...items];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newItems.length) return;
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onUpdate(newItems);
  };

  return (
    <Card className="p-6" data-testid="faq-editor">
      <h2 className="text-xl font-semibold mb-2">Domande Frequenti (FAQ)</h2>
      <p className="text-sm text-neutral-500 mb-6">Rispondi alle domande più comuni che i tuoi clienti potrebbero avere.</p>
      
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="p-4 border rounded-lg bg-neutral-50">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className="h-6 w-6 p-0"
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  className="h-6 w-6 p-0"
                >
                  ↓
                </Button>
              </div>
              
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-xs text-neutral-500">Domanda</Label>
                  <Input
                    placeholder="Es: Come posso prenotare?"
                    value={item.question || ''}
                    onChange={(e) => updateItem(index, 'question', e.target.value)}
                    data-testid={`faq-question-${index}`}
                  />
                </div>
                <div>
                  <Label className="text-xs text-neutral-500">Risposta</Label>
                  <Textarea
                    placeholder="Scrivi una risposta chiara e utile..."
                    value={item.answer || ''}
                    onChange={(e) => updateItem(index, 'answer', e.target.value)}
                    rows={3}
                    data-testid={`faq-answer-${index}`}
                  />
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}
        
        {items.length < 10 && (
          <Button variant="outline" onClick={addItem} className="w-full" data-testid="faq-add-btn">
            <Plus size={16} className="mr-2" />
            Aggiungi Domanda
          </Button>
        )}
        
        {items.length === 0 && (
          <div className="text-center py-8 text-neutral-500">
            <HelpCircle size={48} className="mx-auto mb-2 opacity-30" />
            <p>Nessuna FAQ aggiunta</p>
            <p className="text-sm">Aggiungi le domande frequenti dei tuoi clienti</p>
          </div>
        )}
      </div>

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// SEO EDITOR
function SeoEditor({ seo, localeLang, onUpdate, onSave, saving, hasChanges }) {
  const langLabel = localeLang === 'it' ? 'Italiano' : localeLang.toUpperCase();

  return (
    <Card className="p-6" data-testid="seo-editor">
      <h2 className="text-xl font-semibold mb-4">SEO & Meta Tags</h2>
      
      <div className="space-y-6">
        {/* Title */}
        <div>
          <Label className="text-base font-medium">Titolo Pagina (Title Tag)</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <Label className="text-xs text-neutral-500">{langLabel}</Label>
              <Input
                placeholder="Titolo pagina"
                value={seo?.title_local || ''}
                onChange={(e) => onUpdate({ ...seo, title_local: e.target.value })}
                data-testid="seo-title-local"
              />
            </div>
            <div>
              <Label className="text-xs text-neutral-500">English</Label>
              <Input
                placeholder="Page title"
                value={seo?.title_en || ''}
                onChange={(e) => onUpdate({ ...seo, title_en: e.target.value })}
                data-testid="seo-title-en"
              />
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Ideale: 50-60 caratteri
          </p>
        </div>

        {/* Meta Description */}
        <div>
          <Label className="text-base font-medium">Meta Description</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <Label className="text-xs text-neutral-500">{langLabel}</Label>
              <Textarea
                placeholder="Descrizione per i motori di ricerca"
                value={seo?.meta_local || ''}
                onChange={(e) => onUpdate({ ...seo, meta_local: e.target.value })}
                rows={3}
                data-testid="seo-meta-local"
              />
              <p className="text-xs text-neutral-500 mt-1">
                {(seo?.meta_local || '').length}/160 caratteri
              </p>
            </div>
            <div>
              <Label className="text-xs text-neutral-500">English</Label>
              <Textarea
                placeholder="Description for search engines"
                value={seo?.meta_en || ''}
                onChange={(e) => onUpdate({ ...seo, meta_en: e.target.value })}
                rows={3}
                data-testid="seo-meta-en"
              />
              <p className="text-xs text-neutral-500 mt-1">
                {(seo?.meta_en || '').length}/160 characters
              </p>
            </div>
          </div>
        </div>
      </div>

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}
