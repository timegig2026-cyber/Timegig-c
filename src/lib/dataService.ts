import { supabase } from './supabase';
import { SeekerListing, SubmittedSubscription } from '../components/NavigationPanels';

// Local storage keys
const SEEKERS_STORAGE_KEY = 'worldmap_seekers_list';
const SUBSCRIPTIONS_STORAGE_KEY = 'timegig_submitted_subscriptions';

export const dataService = {
  // Seekers
  async fetchSeekers(latMin: number, latMax: number, lngMin: number, lngMax: number): Promise<SeekerListing[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('seekers')
          .select('*')
          .gte('originLat', latMin)
          .lte('originLat', latMax)
          .gte('originLng', lngMin)
          .lte('originLng', lngMax)
          .limit(100);
        if (error) throw error;
        return data as SeekerListing[];
      } catch (err) {
        console.error('Supabase fetch seekers error:', err);
      }
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(SEEKERS_STORAGE_KEY);
      const all = stored ? JSON.parse(stored) : [];
      return (all as SeekerListing[]).filter(s => 
        s.originLat >= latMin && s.originLat <= latMax &&
        s.originLng >= lngMin && s.originLng <= lngMax
      );
    } catch {
      return [];
    }
  },

  // Subscriptions
  async fetchSubscriptions(): Promise<SubmittedSubscription[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .order('submittedAt', { ascending: false });
        if (error) throw error;
        return data as SubmittedSubscription[];
      } catch (err) {
        console.error('Supabase fetch subs error:', err);
      }
    }

    try {
      const stored = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  async saveSubscription(sub: SubmittedSubscription): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('subscriptions').insert([sub]);
        if (!error) return;
        console.error('Supabase save sub error:', error);
      } catch (err) {
        console.error('Supabase sync error:', err);
      }
    }

    const current = await this.fetchSubscriptions();
    const updated = [sub, ...current];
    localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(updated));
  },

  async updateSubscriptionStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status })
          .eq('id', id);
        if (!error) return;
        console.error('Supabase update status error:', error);
      } catch (err) {
        console.error('Supabase update error:', err);
      }
    }

    const current = await this.fetchSubscriptions();
    const updated = current.map(s => s.id === id ? { ...s, status } : s);
    localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(updated));
  }
};
