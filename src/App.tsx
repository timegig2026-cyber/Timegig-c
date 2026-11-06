import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Crosshair,
  Globe,
  Plus,
  Minus,
  Satellite,
  Search,
  X,
  MapPin,
  Loader2,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Users,
  Flame,
  UserSearch,
  CircleUser,
  Star,
  Navigation as NavIcon,
  Flag,
  Briefcase,
  Check
} from 'lucide-react';
import SubscriptionFlow, { VerificationData } from './components/SubscriptionFlow';
import NavigationPanels, { ActiveTab, SeekerListing, SeekerReview, SubmittedSubscription } from './components/NavigationPanels';
import AuthScreen, { UserAccount } from './components/AuthScreen';
import { dataService } from './lib/dataService';

export interface ActiveGig {
  id: string;
  seekerId: string;
  seekerName: string;
  seekerAvatar?: string;
  seekerPhone: string;
  originLat: number;
  originLng: number;
  originName: string;
  destLat: number;
  destLng: number;
  destName: string;
  status: 'navigating' | 'completed';
  startedAt: number;
}

interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
}

export default function App() {
  // Main primary account: timegig2026@gmail.com
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    try {
      const saved = localStorage.getItem('worldmap_active_session');
      if (saved) return JSON.parse(saved);
    } catch {}

    const defaultMainAccount: UserAccount = {
      email: 'timegig2026@gmail.com',
      name: 'TimeGiG Main',
      acceptedTermsAt: Date.now(),
    };
    localStorage.setItem('worldmap_active_session', JSON.stringify(defaultMainAccount));
    return defaultMainAccount;
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  
  // Seekers Markers Ref to avoid re-rendering
  const seekerMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const isFetchingRef = useRef<boolean>(false);

  // Active Gig Navigation Route Refs
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const gigOriginMarkerRef = useRef<L.Marker | null>(null);
  const gigDestMarkerRef = useRef<L.Marker | null>(null);

  // Seekers List State
  const [seekersList, setSeekersList] = useState<SeekerListing[]>([]);

  // Active Gig Navigation State
  const [activeGig, setActiveGig] = useState<ActiveGig | null>(null);
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [gigOwnerRating, setGigOwnerRating] = useState<number>(5);
  const [gigOwnerComment, setGigOwnerComment] = useState<string>('Gig successfully completed! Great work and on-time arrival.');

  // States
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSatellite, setIsSatellite] = useState<boolean>(false);

  // Bottom Menu Bar Active Tab
  const [activeMenuTab, setActiveMenuTab] = useState<ActiveTab>('gigs');

  // Subscription Modal State
  const [showSubscription, setShowSubscription] = useState<boolean>(false);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);

  // Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showResultsDropdown, setShowResultsDropdown] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast((prev) => (prev?.message === message ? null : prev));
    }, 2800);
  }, []);

  // Handle Seeker Hired
  const handleHireSeeker = (seeker: SeekerListing) => {
    const destLat = location ? location.lat : -26.1076;
    const destLng = location ? location.lng : 28.0567;
    const newGig: ActiveGig = {
      id: `gig-${Date.now()}`,
      seekerId: seeker.id,
      seekerName: seeker.name,
      seekerAvatar: seeker.avatarUrl,
      seekerPhone: seeker.contactNumber,
      originLat: seeker.originLat,
      originLng: seeker.originLng,
      originName: seeker.location,
      destLat,
      destLng,
      destName: '142 Rivonia Rd, Sandton City (Gig Destination)',
      status: 'navigating',
      startedAt: Date.now(),
    };
    setActiveGig(newGig);
    setActiveMenuTab('gigs');
    showToast(`Navigating ${seeker.name} to gig destination!`, 'success');
  };

  // Gig Owner Completes Gig
  const handleCompleteGigAndRate = async () => {
    if (!activeGig) return;

    try {
      // Logic to update seeker in Supabase would go here
      // For now, update local state to reflect change immediately
      setSeekersList((prev) => {
        return prev.map((sk) => {
          if (sk.id === activeGig.seekerId) {
            const newReview: SeekerReview = {
              id: `rev-${Date.now()}`,
              reviewerName: `${currentUser?.name || 'TimeGiG'} (Gig Owner)`,
              rating: gigOwnerRating,
              comment: gigOwnerComment.trim() || 'Gig successfully completed on time!',
              date: 'Just now',
            };
            const newReviews = [newReview, ...sk.reviews];
            const totalRating = newReviews.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = totalRating / newReviews.length;
            return {
              ...sk,
              rating: parseFloat(avgRating.toFixed(1)),
              reviewCount: newReviews.length,
              reviews: newReviews,
            };
          }
          return sk;
        });
      });

      const map = mapInstanceRef.current;
      if (map) {
        if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);
        if (gigOriginMarkerRef.current) map.removeLayer(gigOriginMarkerRef.current);
        if (gigDestMarkerRef.current) map.removeLayer(gigDestMarkerRef.current);
        routePolylineRef.current = null;
        gigOriginMarkerRef.current = null;
        gigDestMarkerRef.current = null;
      }

      const completedSeekerName = activeGig.seekerName;
      setActiveGig(null);
      setShowRatingModal(false);
      showToast(`Gig completed! Rated ${gigOwnerRating}.0 ⭐`, 'success');
    } catch (err) {
      console.error('Error completing gig:', err);
    }
  };

  // Fetch Seekers from Supabase based on map bounds
  const fetchSeekersInView = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map || isFetchingRef.current) return;

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    isFetchingRef.current = true;
    try {
      const data = await dataService.fetchSeekers(sw.lat, ne.lat, sw.lng, ne.lng);
      if (data) {
        setSeekersList(data);
        updateSeekerMarkers(data);
      }
    } catch (err) {
      console.error('Fetch seekers error:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const updateSeekerMarkers = (seekers: SeekerListing[]) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove markers that are no longer in the list
    const currentIds = new Set(seekers.map(s => s.id));
    Object.keys(seekerMarkersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        map.removeLayer(seekerMarkersRef.current[id]);
        delete seekerMarkersRef.current[id];
      }
    });

    // Add or update markers
    seekers.forEach(seeker => {
      if (!seekerMarkersRef.current[seeker.id]) {
        const marker = L.marker([seeker.originLat, seeker.originLng], {
          icon: L.divIcon({
            className: 'seeker-marker',
            html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-lg bg-blue-500 overflow-hidden">
                    <img src="${seeker.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'}" class="w-full h-full object-cover" />
                   </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(map);

        marker.bindPopup(`
          <div class="p-2 min-w-[150px]">
            <div class="font-bold text-slate-900">${seeker.name}</div>
            <div class="text-[10px] text-slate-500 mb-1">${seeker.role}</div>
            <div class="text-xs font-bold text-emerald-600">${seeker.budgetRands}</div>
          </div>
        `);
        
        seekerMarkersRef.current[seeker.id] = marker;
      }
    });
  };

  // Initialize the Leaflet map
  useEffect(() => {
    if (!currentUser || !mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-28.4793, 24.6727], // South Africa
      zoom: 6,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      markerZoomAnimation: true,
      fadeAnimation: true,
      zoomAnimation: true,
      inertia: true,
    });

    const streetTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      keepBuffer: 4,
      updateWhenIdle: true,
    }).addTo(map);

    const satelliteTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      keepBuffer: 4,
      updateWhenIdle: true,
    });

    streetLayerRef.current = streetTileLayer;
    satelliteLayerRef.current = satelliteTileLayer;
    mapInstanceRef.current = map;

    // Listen for map movements to fetch markers
    map.on('moveend', fetchSeekersInView);
    map.on('zoomend', fetchSeekersInView);

    // Initial fetch
    fetchSeekersInView();

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [currentUser, fetchSeekersInView]);

  // Handle Satellite View Toggle
  const toggleSatelliteView = () => {
    const map = mapInstanceRef.current;
    if (!map || !streetLayerRef.current || !satelliteLayerRef.current) return;

    if (isSatellite) {
      map.removeLayer(satelliteLayerRef.current);
      map.addLayer(streetLayerRef.current);
      setIsSatellite(false);
      showToast('Standard Map view enabled', 'info');
    } else {
      map.removeLayer(streetLayerRef.current);
      map.addLayer(satelliteLayerRef.current);
      setIsSatellite(true);
      showToast('Satellite view enabled', 'info');
    }
  };

  // Update or create the user location marker
  const updateMapMarker = useCallback((lat: number, lng: number, accuracy: number, shouldFlyTo: boolean) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const pulseIcon = L.divIcon({
      className: 'custom-location-marker',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 -translate-x-1/2 -translate-y-1/2">
          <div class="absolute w-8 h-8 rounded-full bg-blue-500/40 animate-ping"></div>
          <div class="absolute w-6 h-6 rounded-full bg-blue-500/30"></div>
          <div class="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      userMarkerRef.current = L.marker([lat, lng], { icon: pulseIcon }).addTo(map);
    }

    if (userCircleRef.current) {
      userCircleRef.current.setLatLng([lat, lng]);
      userCircleRef.current.setRadius(accuracy);
    } else {
      userCircleRef.current = L.circle([lat, lng], {
        radius: accuracy,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(map);
    }

    if (shouldFlyTo) {
      map.flyTo([lat, lng], 15, { duration: 1.5 });
    }
  }, []);

  // Request user location
  const locateUser = useCallback((flyTo: boolean = true) => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({ lat: latitude, lng: longitude, accuracy, timestamp: position.timestamp });
        updateMapMarker(latitude, longitude, accuracy, flyTo);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    );
  }, [updateMapMarker]);

  // Background location tracking
  useEffect(() => {
    if (!currentUser) return;
    
    // Get initial location in background (no flyTo)
    locateUser(false);

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setLocation({ lat: latitude, lng: longitude, accuracy, timestamp: position.timestamp });
          updateMapMarker(latitude, longitude, accuracy, false);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [currentUser, locateUser, updateMapMarker]);

  // Draw Live Seeker Navigation Route on Leaflet Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    if (gigOriginMarkerRef.current) {
      map.removeLayer(gigOriginMarkerRef.current);
      gigOriginMarkerRef.current = null;
    }
    if (gigDestMarkerRef.current) {
      map.removeLayer(gigDestMarkerRef.current);
      gigDestMarkerRef.current = null;
    }

    if (!activeGig || activeGig.status === 'completed') return;

    const origin: [number, number] = [activeGig.originLat, activeGig.originLng];
    const dest: [number, number] = [activeGig.destLat, activeGig.destLng];

    // Calculated intermediate road waypoints for a smooth, natural driving route
    const mid1: [number, number] = [
      origin[0] + (dest[0] - origin[0]) * 0.35 + 0.005,
      origin[1] + (dest[1] - origin[1]) * 0.35 - 0.004,
    ];
    const mid2: [number, number] = [
      origin[0] + (dest[0] - origin[0]) * 0.7 - 0.003,
      origin[1] + (dest[1] - origin[1]) * 0.7 + 0.006,
    ];
    const routePoints = [origin, mid1, mid2, dest];

    const polyline = L.polyline(routePoints, {
      color: '#2563eb',
      weight: 5,
      opacity: 0.9,
      dashArray: '10, 8',
      lineCap: 'round',
    }).addTo(map);

    const seekerIcon = L.divIcon({
      className: 'custom-seeker-nav-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <div class="absolute w-10 h-10 rounded-full bg-blue-500/30 animate-ping"></div>
          <div class="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs">
            🚗
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    const destIcon = L.divIcon({
      className: 'custom-dest-nav-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full drop-shadow-xl">
          <div class="w-9 h-9 rounded-full bg-emerald-600 border-2 border-white shadow-2xl flex items-center justify-center text-white font-bold text-sm animate-bounce">
            🏁
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    const originMarker = L.marker(origin, { icon: seekerIcon }).addTo(map);
    const destMarker = L.marker(dest, { icon: destIcon }).addTo(map);

    originMarker.bindPopup(`<b>Seeker:</b> ${activeGig.seekerName}<br/><b>Origin:</b> ${activeGig.originName}`).openPopup();
    destMarker.bindPopup(`<b>Gig Destination:</b> ${activeGig.destName}`);

    routePolylineRef.current = polyline;
    gigOriginMarkerRef.current = originMarker;
    gigDestMarkerRef.current = destMarker;

    map.fitBounds(polyline.getBounds(), { padding: [90, 90], maxZoom: 14 });
  }, [activeGig]);

  // Search input handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!val.trim()) {
      setSearchResults([]);
      setShowResultsDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            val.trim()
          )}&limit=5&addressdetails=1`
        );
        if (response.ok) {
          const data: SearchResult[] = await response.json();
          setSearchResults(data);
          setShowResultsDropdown(data.length > 0);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleSelectLocation = (result: SearchResult) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    setShowResultsDropdown(false);
    setSearchQuery(result.display_name.split(',')[0]);

    const searchIcon = L.divIcon({
      className: 'custom-search-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full drop-shadow-lg">
          <div class="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center border-2 border-white shadow-xl animate-bounce">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    if (searchMarkerRef.current) {
      searchMarkerRef.current.setLatLng([lat, lon]);
    } else {
      searchMarkerRef.current = L.marker([lat, lon], { icon: searchIcon }).addTo(map);
    }

    searchMarkerRef.current
      .bindPopup(
        `<div style="font-family: system-ui, sans-serif; font-size: 13px; color: #0f172a; font-weight: 600; max-width: 200px;">
          ${result.display_name}
        </div>`
      )
      .openPopup();

    map.flyTo([lat, lon], 14, {
      duration: 1.8,
      easeLinearity: 0.25,
    });

    showToast(`Jumped to ${result.display_name.split(',')[0]}`, 'success');
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchResults.length > 0) {
      handleSelectLocation(searchResults[0]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=1`
      );
      if (response.ok) {
        const data: SearchResult[] = await response.json();
        if (data.length > 0) {
          handleSelectLocation(data[0]);
        } else {
          showToast('Location not found', 'error');
        }
      }
    } catch {
      showToast('Search failed. Try again.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResultsDropdown(false);
    if (searchMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(searchMarkerRef.current);
      searchMarkerRef.current = null;
    }
  };

  // Zoom handlers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  const handleResetWorldView = () => {
    mapInstanceRef.current?.flyTo([20, 0], 2, { duration: 1.2 });
    showToast('Reset to world view', 'info');
  };

  const handleTabClick = (tab: ActiveTab) => {
    if (tab === 'gigs') {
      setActiveMenuTab('gigs');
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 50);
    } else {
      setActiveMenuTab((prev) => (prev === tab ? 'gigs' : tab));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('worldmap_active_session');
    setCurrentUser(null as any);
    setActiveMenuTab('gigs');
  };

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // "On GiGs feature show the map as is."
  // "Let the map show as background wallpaper in all features make it blurry."
  // "In seekers and Profile show only the map in blur."
  // Note: we use pure blur without brightness reduction so the map stays completely bright!
  const isBlurredWallpaper = activeMenuTab !== 'gigs';

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-slate-100 select-none font-sans flex flex-col">
      {/* Map Container Area: Bright natural OpenStreetMap view */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#aad3df]">
        <div
          ref={mapContainerRef}
          className={`w-full h-full z-0 transition-[filter,transform] duration-300 ease-out ${
            isBlurredWallpaper
              ? 'filter blur-[10px] scale-102 pointer-events-none'
              : 'filter-none scale-100 pointer-events-auto'
          }`}
        />

        {/* Live Seeker Navigation HUD Banner (When Gig is Navigating on Map) */}
        {activeGig && activeGig.status === 'navigating' && activeMenuTab === 'gigs' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-md px-3 z-30 pointer-events-auto animate-in slide-in-from-top-3">
            <div className="bg-blue-600/95 backdrop-blur-md rounded-2xl p-2.5 shadow-2xl border border-blue-400/50 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <NavIcon className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Navigating to Gig Destination</div>
                  <div className="text-[10px] text-blue-100 truncate">
                    {activeGig.destName} &bull; 4.8 km &bull; ETA 12 min
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-white text-blue-700 px-2 py-0.5 rounded-full shrink-0">
                {activeGig.seekerName}
              </span>
            </div>
          </div>
        )}

        {/* Floating Search Bar (Only shown on GiGs map feature when not navigating) */}
        {!activeGig && activeMenuTab === 'gigs' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-20 pointer-events-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center bg-white/95 backdrop-blur-md rounded-full shadow-2xl border border-slate-200/90 hover:border-slate-300 transition-all focus-within:ring-2 focus-within:ring-blue-500/30"
            >
              <div className="pl-4 pr-2 text-slate-400 flex items-center justify-center">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchResults.length > 0 && setShowResultsDropdown(true)}
                placeholder="Search any city, country, or landmark..."
                className="w-full py-2.5 pr-9 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none rounded-full"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                  className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Search Results Dropdown */}
            {showResultsDropdown && searchResults.length > 0 && (
              <div className="mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden divide-y divide-slate-100">
                {searchResults.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => handleSelectLocation(item)}
                    className="w-full text-left px-4 py-2.5 flex items-start gap-2.5 hover:bg-blue-50/70 transition-colors group"
                  >
                    <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div className="flex-1 truncate">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {item.display_name.split(',')[0]}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.display_name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Verification Status Pill (Only on GiGs map if not approved) */}
        {verificationData?.submittedAt &&
          !showSubscription &&
          activeMenuTab === 'gigs' &&
          (() => {
            try {
              const stored = localStorage.getItem('timegig_submitted_subscriptions');
              if (stored) {
                const subs: SubmittedSubscription[] = JSON.parse(stored);
                const hasApproved = subs.some((s) => s.status === 'approved');
                if (hasApproved) return null;
              }
            } catch {}
            return (
              <div className="absolute top-18 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
                <button
                  onClick={() => setShowSubscription(true)}
                  className="px-3.5 py-1 rounded-full bg-amber-500/95 hover:bg-amber-600 text-white text-[11px] font-bold shadow-lg backdrop-blur-md border border-white/40 flex items-center gap-1.5 transition-all hover:scale-105"
                >
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Review in progress (15-25 min) &bull; View Status</span>
                </button>
              </div>
            );
          })()}

        {/* Floating Feedback Toast */}
        {feedbackToast && (
          <div className="absolute top-18 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in">
            <div
              className={`px-3 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-tight backdrop-blur-md shadow-lg flex items-center gap-1.5 border ${
                feedbackToast.type === 'success'
                  ? 'bg-white text-emerald-700 border-emerald-100'
                  : feedbackToast.type === 'error'
                  ? 'bg-white text-rose-700 border-rose-100'
                  : 'bg-white text-slate-800 border-slate-200'
              }`}
            >
              {feedbackToast.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : feedbackToast.type === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Layers className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>{feedbackToast.message}</span>
            </div>
          </div>
        )}

        {/* Map Control Icons */}
        {activeMenuTab === 'gigs' && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2.5 pointer-events-auto">
            {/* Zoom In */}
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-700 hover:text-blue-600 shadow-xl border border-white/70 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Zoom Out */}
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-700 hover:text-blue-600 shadow-xl border border-white/70 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Satellite View */}
            <button
              onClick={toggleSatelliteView}
              title={isSatellite ? 'Standard Map' : 'Satellite View'}
              className={`relative w-10 h-10 rounded-full backdrop-blur-md shadow-xl border flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                isSatellite
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-white/95 text-slate-700 hover:text-blue-600 border-white/70'
              }`}
            >
              <Satellite className="w-4 h-4" />
              <span
                className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full border border-white ${
                  isSatellite ? 'bg-emerald-400' : 'bg-slate-300'
                }`}
              />
            </button>

            {/* Locate User */}
            <button
              onClick={() => locateUser(true)}
              disabled={isLocating}
              title="My Location"
              className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-700 hover:text-blue-600 shadow-xl border border-white/70 flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              ) : (
                <Crosshair className={`w-4 h-4 ${location ? 'text-blue-600' : ''}`} />
              )}
            </button>

            {/* World View */}
            <button
              onClick={handleResetWorldView}
              title="World View"
              className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-700 hover:text-blue-600 shadow-xl border border-white/70 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            >
              <Globe className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Floating Gig Owner Action Card (Only Gig Owner Can Complete Gig) */}
        {activeGig && activeGig.status === 'navigating' && activeMenuTab === 'gigs' && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-sm px-3 z-30 pointer-events-auto animate-in slide-in-from-bottom-3">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-slate-200/90 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                  <span className="text-xs font-bold text-slate-900 truncate">
                    Gig In Progress &bull; {activeGig.seekerName}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                  Gig Owner Only
                </span>
              </div>

              <p className="text-[10px] text-slate-500 leading-snug">
                Only gig owner can click on gig completed and give a rating that will appear in seeker profile.
              </p>

              <button
                onClick={() => setShowRatingModal(true)}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Gig & Rate Seeker</span>
              </button>
            </div>
          </div>
        )}

        {/* Screen Views for Tenant, Referrals, Seekers, Profile */}
        <NavigationPanels
          activeTab={activeMenuTab}
          onClose={() => setActiveMenuTab('gigs')} // Close returns to full map
          verificationData={verificationData}
          onOpenSubscriptionModal={() => {
            setActiveMenuTab('gigs');
            setShowSubscription(true);
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
          onNavigateToTab={(tab) => setActiveMenuTab(tab)}
          onHireSeeker={handleHireSeeker}
          seekersList={seekersList}
          onUpdateSeekersList={setSeekersList}
        />
      </div>

      {/* Gig Owner Rating & Completion Modal */}
      {showRatingModal && activeGig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-sm pointer-events-auto">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Complete Gig & Rate Seeker</h3>
                <span className="text-[10px] text-slate-500">Verified Gig Owner Action</span>
              </div>
              <button
                onClick={() => setShowRatingModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-1">
              <p className="text-xs text-slate-600 mb-2">
                Rate <strong>{activeGig.seekerName}</strong>'s gig completion:
              </p>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setGigOwnerRating(star)}
                    className="p-1 text-amber-400 hover:scale-115 transition-transform"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= gigOwnerRating ? 'text-amber-500 fill-amber-400' : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-amber-700">
                {gigOwnerRating}.0 Star Verified Rating
              </span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Gig Owner Feedback
              </label>
              <textarea
                rows={3}
                value={gigOwnerComment}
                onChange={(e) => setGigOwnerComment(e.target.value)}
                placeholder="Describe how the seeker handled navigation and gig execution..."
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[9px] text-slate-400 block mt-1">
                This rating and feedback will permanently appear in {activeGig.seekerName}'s profile.
              </span>
            </div>

            <div className="pt-1 flex items-center gap-2">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteGigAndRate}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Submit & Complete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* White Bottom Menu Bar (Always Visible) - Adjusted for perfect fit with safe-area insets */}
      <footer className="w-full h-14 bg-white border-t border-slate-200 shadow-xl z-40 shrink-0 flex items-center pb-[env(safe-area-inset-bottom)]">
        <div className="w-full max-w-lg mx-auto px-2 flex items-center justify-between">
          {/* 1. Tenant Feature */}
          <button
            onClick={() => handleTabClick('tenant')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all text-black ${
              activeMenuTab === 'tenant' ? 'font-bold' : ''
            }`}
          >
            <div className="p-1.5 transition-all text-black">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">Tenant</span>
          </button>

          {/* 2. Referrals Feature */}
          <button
            onClick={() => handleTabClick('referrals')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all text-black ${
              activeMenuTab === 'referrals' ? 'font-bold' : ''
            }`}
          >
            <div className="p-1.5 transition-all text-black">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">Referrals</span>
          </button>

          {/* 3. GiGs Feature (Bigger Flame Icon Feature) */}
          <button
            onClick={() => handleTabClick('gigs')}
            className={`flex-1 flex flex-col items-center justify-center -mt-4 transition-all group ${
              activeMenuTab === 'gigs'
                ? 'text-amber-600 font-extrabold'
                : 'text-black hover:text-slate-900'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border-2 shadow-md ${
                activeMenuTab === 'gigs'
                  ? 'bg-amber-500 text-white border-white scale-110 shadow-amber-500/40 ring-2 ring-amber-400/60'
                  : 'bg-white text-amber-500 border-amber-200/90 hover:bg-amber-50/80 shadow-xs'
              }`}
            >
              <Flame
                className={`w-7 h-7 transition-transform group-hover:scale-110 ${
                  activeMenuTab === 'gigs'
                    ? 'text-white fill-amber-200'
                    : 'text-amber-500 fill-amber-400'
                }`}
              />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight font-bold text-black">GiGs</span>
          </button>

          {/* 4. Seekers Feature (Shows only map in blur) */}
          <button
            onClick={() => handleTabClick('seekers')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all text-black ${
              activeMenuTab === 'seekers' ? 'font-bold' : ''
            }`}
          >
            <div className="p-1.5 transition-all text-black">
              <UserSearch className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">Seekers</span>
          </button>

          {/* 5. Profile Feature (Shows only map in blur) */}
          <button
            onClick={() => handleTabClick('profile')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all text-black ${
              activeMenuTab === 'profile' ? 'font-bold' : ''
            }`}
          >
            <div className="p-1.5 transition-all text-black">
              <CircleUser className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">Profile</span>
          </button>
        </div>
      </footer>

      {/* Subscription, Selfie & Document Verification Flow Modal */}
      {showSubscription && (
        <SubscriptionFlow
          initialData={verificationData}
          onClose={() => setShowSubscription(false)}
          onComplete={(data) => {
            setVerificationData(data);
            showToast('Verification submitted! Review takes 15 to 25 minutes.', 'success');
          }}
        />
      )}
    </div>
  );
}
