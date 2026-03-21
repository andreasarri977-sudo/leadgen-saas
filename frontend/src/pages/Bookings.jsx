import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Calendar, Clock, User, Phone, Mail, MessageSquare, CheckCircle, XCircle, Loader2, Filter, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import API from '@/lib/api';

const STATUS_CONFIG = {
  pending: { label: 'In Attesa', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  confirmed: { label: 'Confermata', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  cancelled: { label: 'Annullata', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  completed: { label: 'Completata', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' }
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/bookings`);
      setBookings(response.data);
    } catch (error) {
      console.error('Errore caricamento prenotazioni:', error);
      toast.error('Errore caricamento prenotazioni');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bookingId, newStatus) => {
    setUpdating(prev => ({ ...prev, [bookingId]: true }));
    try {
      await axios.put(`${API}/bookings`, {
        booking_id: bookingId,
        status: newStatus
      });
      toast.success(`Prenotazione ${STATUS_CONFIG[newStatus].label.toLowerCase()}`);
      loadBookings();
    } catch (error) {
      console.error('Errore aggiornamento:', error);
      toast.error('Errore aggiornamento stato');
    } finally {
      setUpdating(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const deleteBooking = async (bookingId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa prenotazione?')) return;
    
    try {
      await axios.delete(`${API}/bookings?booking_id=${bookingId}`);
      toast.success('Prenotazione eliminata');
      loadBookings();
    } catch (error) {
      console.error('Errore eliminazione:', error);
      toast.error('Errore eliminazione');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr;
  };

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filter);

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div data-testid="bookings-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Prenotazioni</h1>
          <p className="text-neutral-500 mt-1">Gestisci le prenotazioni ricevute dai siti demo</p>
        </div>
        <Button onClick={loadBookings} variant="outline" className="w-fit">
          <RefreshCw size={16} className="mr-2" />
          Aggiorna
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-neutral-900">{stats.total}</p>
          <p className="text-sm text-neutral-500">Totali</p>
        </Card>
        <Card className="p-4 text-center bg-yellow-50 border-yellow-200">
          <p className="text-3xl font-bold text-yellow-700">{stats.pending}</p>
          <p className="text-sm text-yellow-600">In Attesa</p>
        </Card>
        <Card className="p-4 text-center bg-green-50 border-green-200">
          <p className="text-3xl font-bold text-green-700">{stats.confirmed}</p>
          <p className="text-sm text-green-600">Confermate</p>
        </Card>
        <Card className="p-4 text-center bg-blue-50 border-blue-200">
          <p className="text-3xl font-bold text-blue-700">{stats.completed}</p>
          <p className="text-sm text-blue-600">Completate</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('all')}
        >
          Tutte ({stats.total})
        </Button>
        <Button 
          variant={filter === 'pending' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('pending')}
          className={filter === 'pending' ? 'bg-yellow-500' : ''}
        >
          In Attesa ({stats.pending})
        </Button>
        <Button 
          variant={filter === 'confirmed' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('confirmed')}
          className={filter === 'confirmed' ? 'bg-green-500' : ''}
        >
          Confermate ({stats.confirmed})
        </Button>
        <Button 
          variant={filter === 'completed' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('completed')}
          className={filter === 'completed' ? 'bg-blue-500' : ''}
        >
          Completate ({stats.completed})
        </Button>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar size={48} className="mx-auto text-neutral-300 mb-4" />
          <h3 className="text-xl font-semibold text-neutral-700 mb-2">Nessuna prenotazione</h3>
          <p className="text-neutral-500">
            {filter === 'all' 
              ? 'Le prenotazioni dai siti demo appariranno qui'
              : `Nessuna prenotazione con stato "${STATUS_CONFIG[filter]?.label}"`
            }
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
            const isUpdating = updating[booking.booking_id];
            
            return (
              <Card 
                key={booking.booking_id} 
                data-testid={`booking-${booking.booking_id}`}
                className={`p-4 sm:p-6 ${statusConfig.bgLight} border-l-4`}
                style={{ borderLeftColor: statusConfig.color.replace('bg-', '') }}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Booking Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{booking.customer_name}</h3>
                        <p className="text-sm text-neutral-500">{booking.business_name}</p>
                      </div>
                      <Badge className={`${statusConfig.color} text-white`}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Calendar size={16} />
                        <span>{formatDate(booking.date)}</span>
                      </div>
                      {booking.time && (
                        <div className="flex items-center gap-2 text-neutral-600">
                          <Clock size={16} />
                          <span>{formatTime(booking.time)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Phone size={16} />
                        <a href={`tel:${booking.customer_phone}`} className="hover:underline">
                          {booking.customer_phone}
                        </a>
                      </div>
                      {booking.customer_email && (
                        <div className="flex items-center gap-2 text-neutral-600">
                          <Mail size={16} />
                          <a href={`mailto:${booking.customer_email}`} className="hover:underline">
                            {booking.customer_email}
                          </a>
                        </div>
                      )}
                    </div>
                    
                    {booking.service && (
                      <p className="text-sm"><span className="font-medium">Servizio:</span> {booking.service}</p>
                    )}
                    
                    {booking.guests > 1 && (
                      <p className="text-sm"><span className="font-medium">Persone:</span> {booking.guests}</p>
                    )}
                    
                    {booking.notes && (
                      <div className="flex items-start gap-2 text-sm bg-white/50 p-2 rounded">
                        <MessageSquare size={16} className="mt-0.5 flex-shrink-0" />
                        <p>{booking.notes}</p>
                      </div>
                    )}
                    
                    <p className="text-xs text-neutral-400">
                      Ricevuta: {new Date(booking.created_at).toLocaleString('it-IT')}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-wrap lg:flex-col gap-2 lg:min-w-[140px]">
                    {booking.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateStatus(booking.booking_id, 'confirmed')}
                          disabled={isUpdating}
                          className="bg-green-600 hover:bg-green-700 flex-1 lg:flex-none"
                        >
                          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} className="mr-1" />}
                          Conferma
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(booking.booking_id, 'cancelled')}
                          disabled={isUpdating}
                          className="text-red-600 border-red-200 hover:bg-red-50 flex-1 lg:flex-none"
                        >
                          <XCircle size={14} className="mr-1" />
                          Rifiuta
                        </Button>
                      </>
                    )}
                    
                    {booking.status === 'confirmed' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(booking.booking_id, 'completed')}
                        disabled={isUpdating}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} className="mr-1" />}
                        Completata
                      </Button>
                    )}
                    
                    {/* WhatsApp Contact */}
                    <a
                      href={`https://wa.me/${booking.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Ciao ${booking.customer_name}, riguardo alla tua prenotazione del ${formatDate(booking.date)}...`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md"
                    >
                      <MessageSquare size={14} />
                      WhatsApp
                    </a>
                    
                    {/* Delete */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteBooking(booking.booking_id)}
                      className="text-neutral-400 hover:text-red-600"
                    >
                      Elimina
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
