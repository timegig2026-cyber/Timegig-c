import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Copy,
  Check,
  Share2,
  TrendingUp,
  Wallet,
  MessageCircle,
  Send,
  CheckCircle2,
  X,
  FileCheck2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  CreditCard,
  User,
  Camera,
  ArrowLeft,
  MapPin,
  PhoneCall,
  UserSearch,
  Sparkles,
  Star,
  Briefcase,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Download,
  Wrench,
  Settings,
  Search,
  FileText,
  Cpu,
  RefreshCw,
  Award,
  LogOut
} from 'lucide-react';
import { VerificationData } from './SubscriptionFlow';
import { UserAccount } from './AuthScreen';

export type ActiveTab = 'tenant' | 'referrals' | 'gigs' | 'seekers' | 'profile' | null;

export interface SubmittedSubscription {
  id: string;
  subscriberName: string;
  subscriberEmail: string;
  plan: 'tenant' | 'user';
  amountRands: number;
  submittedAt: number;
  status: 'pending' | 'approved' | 'rejected';
  idDocumentName?: string | null;
  paymentDocumentName?: string | null;
  selfieImage?: string | null;
}

export interface SeekerReview {
  id: string;
  reviewerName: string;
  rating: number; // 1 to 5
  comment: string;
  date: string;
}

export interface SeekerListing {
  id: string;
  name: string;
  avatarUrl?: string;
  role: string;
  seekingType: string;
  budgetRands: string;
  location: string;
  verified: boolean;
  contactNumber: string;
  datePosted: string;
  rating: number;
  reviewCount: number;
  reviews: SeekerReview[];
  originLat: number;
  originLng: number;
}

export interface FullScreenDoc {
  title: string;
  type: 'logo' | 'id' | 'payment';
  imageUrl: string;
  fileName?: string;
  applicantName: string;
}

interface NavigationPanelsProps {
  activeTab: ActiveTab;
  onClose: () => void;
  verificationData: VerificationData | null;
  onOpenSubscriptionModal: () => void;
  currentUser: UserAccount | null;
  onLogout: () => void;
  onNavigateToTab: (tab: ActiveTab) => void;
  onHireSeeker: (seeker: SeekerListing) => void;
  seekersList: SeekerListing[];
  onUpdateSeekersList: React.Dispatch<React.SetStateAction<SeekerListing[]>>;
}

export default function NavigationPanels({
  activeTab,
  onClose,
  verificationData,
  onOpenSubscriptionModal,
  currentUser,
  onLogout,
  onNavigateToTab,
  onHireSeeker,
  seekersList,
  onUpdateSeekersList,
}: NavigationPanelsProps) {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [referralSearch, setReferralSearch] = useState<string>('');
  const [seekerSearch, setSeekerSearch] = useState<string>('');
  const [selectedSubmissionToView, setSelectedSubmissionToView] = useState<SubmittedSubscription | null>(null);
  const [selectedSeekerToView, setSelectedSeekerToView] = useState<SeekerListing | null>(null);
  const [contactSuccessToast, setContactSuccessToast] = useState<string | null>(null);

  // Full Screen Document & Logo Viewer State
  const [fullScreenDoc, setFullScreenDoc] = useState<FullScreenDoc | null>(null);
  const [docZoom, setDocZoom] = useState<number>(1);

  // Seeker Hiring & Circle of Tools Loading State
  const [hiringSeeker, setHiringSeeker] = useState<SeekerListing | null>(null);
  const [hireCountdown, setHireCountdown] = useState<number>(4);
  const [hireAccepted, setHireAccepted] = useState<boolean>(false);

  // Get latest referral selfie or user photo for profile logo
  const profileSelfieLogo = (() => {
    try {
      const stored = localStorage.getItem('timegig_submitted_subscriptions');
      if (stored) {
        const subs: SubmittedSubscription[] = JSON.parse(stored);
        const latestWithSelfie = subs.find((s) => s.selfieImage);
        if (latestWithSelfie?.selfieImage) return latestWithSelfie.selfieImage;
      }
      if (verificationData?.selfieImage) return verificationData.selfieImage;
    } catch {}
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop';
  })();

  const [profileName, setProfileName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('worldmap_active_session');
      if (saved) return JSON.parse(saved).name || 'TimeGiG Verified';
    } catch {}
    return currentUser?.name || 'TimeGiG Verified';
  });
  const [profilePhone, setProfilePhone] = useState<string>('+27 82 459 1022');
  const [profileLocation, setProfileLocation] = useState<string>('Johannesburg, South Africa');
  const [profileBio, setProfileBio] = useState<string>(
    'Verified Tenant & Gig Coordinator on OpenStreetMap. Approved rental boundaries & navigation active.'
  );
  const [profileSavedToast, setProfileSavedToast] = useState<string | null>(null);

  // Profit balances in South African Rands (ZAR / R) - Reset to R 0.00
  const tenantProfitRands = 0.0;
  const userProfitRands = 0.0;
  const totalProfitRands = 0.0;

  // Tenant Invite Link
  const inviteLink = 'https://timegig.app/join/tenant?ref=timegig2026';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    });
  };

  const shareMessage = encodeURIComponent(
    'Join my Tenant & Rental network on OpenStreetMap. Subscribe in Rands and get verified live location protection: ' +
      inviteLink
  );

  const handleSocialShare = (platform: 'whatsapp' | 'twitter' | 'facebook' | 'telegram' | 'native') => {
    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${shareMessage}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${shareMessage}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${shareMessage}`, '_blank');
    } else if (platform === 'native') {
      if (navigator.share) {
        navigator.share({
          title: 'Tenant Network Invite',
          text: 'Subscribe in South African Rands and activate your verified map location.',
          url: inviteLink,
        }).catch(() => {});
      } else {
        handleCopyLink();
      }
    }
  };

  // Real submitted subscriptions
  const [submittedSubscriptions, setSubmittedSubscriptions] = useState<SubmittedSubscription[]>(() => {
    try {
      const stored = localStorage.getItem('timegig_submitted_subscriptions');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // When verificationData is submitted, sync to submitted subscriptions
  useEffect(() => {
    if (!verificationData?.submittedAt) return;

    setSubmittedSubscriptions((prev) => {
      const exists = prev.some((sub) => sub.submittedAt === verificationData.submittedAt);
      if (exists) return prev;

      const newSub: SubmittedSubscription = {
        id: `sub-tg-${Date.now()}`,
        subscriberName: currentUser?.name || 'Verified Applicant',
        subscriberEmail: currentUser?.email || 'timegig2026@gmail.com',
        plan: verificationData.subscription,
        amountRands: verificationData.subscription === 'tenant' ? 3400.0 : 1450.0,
        submittedAt: verificationData.submittedAt,
        status: 'pending',
        idDocumentName: verificationData.idDocumentName || 'rsa-national-id.pdf',
        paymentDocumentName: verificationData.paymentDocumentName || 'eft-proof-of-payment.png',
        selfieImage: verificationData.selfieImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
      };

      const updated = [newSub, ...prev];
      localStorage.setItem('timegig_submitted_subscriptions', JSON.stringify(updated));
      return updated;
    });
  }, [verificationData, currentUser]);

  const handleApproveSubmission = (id: string) => {
    setSubmittedSubscriptions((prev) => {
      const updated = prev.map((sub) =>
        sub.id === id ? { ...sub, status: 'approved' as const } : sub
      );
      localStorage.setItem('timegig_submitted_subscriptions', JSON.stringify(updated));
      return updated;
    });

    if (selectedSubmissionToView?.id === id) {
      setSelectedSubmissionToView((prev) => (prev ? { ...prev, status: 'approved' } : null));
    }

    setContactSuccessToast('Referral approved! Directing to profile feature to save profile...');
    setTimeout(() => {
      setSelectedSubmissionToView(null);
      onNavigateToTab('profile');
    }, 1200);
  };

  const handleRejectSubmission = (id: string) => {
    setSubmittedSubscriptions((prev) => {
      const updated = prev.map((sub) =>
        sub.id === id ? { ...sub, status: 'rejected' as const } : sub
      );
      localStorage.setItem('timegig_submitted_subscriptions', JSON.stringify(updated));
      return updated;
    });

    if (selectedSubmissionToView?.id === id) {
      setSelectedSubmissionToView((prev) => (prev ? { ...prev, status: 'rejected' } : null));
    }
  };

  // Hire Seeker Countdown & Acceptance Flow
  useEffect(() => {
    if (!hiringSeeker || hireAccepted) return;

    if (hireCountdown > 0) {
      const timer = setTimeout(() => {
        setHireCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      handleSeekerAcceptGig();
    }
  }, [hiringSeeker, hireCountdown, hireAccepted]);

  const handleStartHireSeeker = (seeker: SeekerListing) => {
    setHiringSeeker(seeker);
    setHireCountdown(4);
    setHireAccepted(false);
  };

  const handleSeekerAcceptGig = () => {
    if (!hiringSeeker) return;
    setHireAccepted(true);
    setContactSuccessToast(`Gig accepted by ${hiringSeeker.name}! Directing to map navigation...`);

    setTimeout(() => {
      const targetSeeker = hiringSeeker;
      setHiringSeeker(null);
      setHireAccepted(false);
      onHireSeeker(targetSeeker);
      onNavigateToTab('gigs');
    }, 1200);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedUser: UserAccount = {
        email: currentUser?.email || 'timegig2026@gmail.com',
        name: profileName,
        acceptedTermsAt: currentUser?.acceptedTermsAt || Date.now(),
      };
      localStorage.setItem('worldmap_active_session', JSON.stringify(updatedUser));
      setProfileSavedToast('Profile saved successfully! Credentials verified.');
      setTimeout(() => setProfileSavedToast(null), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
    }
  };

  const openFullScreen = (title: string, type: 'logo' | 'id' | 'payment', imageUrl: string, fileName?: string, applicantName: string = 'Applicant') => {
    setDocZoom(1);
    setFullScreenDoc({
      title,
      type,
      imageUrl,
      fileName,
      applicantName,
    });
  };

  if (!activeTab || activeTab === 'gigs') {
    return null;
  }

  return (
    <>
      {/* 1. TENANT FEATURE: DASHBOARD LOOK */}
      {activeTab === 'tenant' && (
        <div className="absolute inset-x-0 top-0 bottom-0 z-30 pointer-events-none flex flex-col">
          <div className="flex-1 w-full max-w-md mx-auto pt-6 pb-4 px-3 overflow-y-auto space-y-3 pointer-events-auto">
            {/* Dashboard Title */}
            <div className="px-1 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Tenant Dashboard
              </h2>
            </div>

            {/* Profit Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-md border border-slate-200/90">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-bold text-slate-500">Total Profit</div>
                <div className="text-sm font-extrabold text-slate-900 truncate">
                  R {totalProfitRands.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-md border border-slate-200/90">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-bold text-slate-500">Unit Yield</div>
                <div className="text-sm font-extrabold text-slate-900 truncate">R 0.00</div>
              </div>
            </div>

            {/* Cards Stack */}
            <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-md border border-slate-200/90 flex items-center justify-between gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-xs bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Profit Margin</div>
                <div className="text-base font-extrabold text-slate-900 tracking-tight mt-0.5">0.0% ZAR</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">South African Rands &bull; Real-time</div>
              </div>
              <div className="shrink-0">
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-1 rounded-xl">Active</span>
              </div>
            </div>

            {/* Invite Card */}
            <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-md border border-slate-200/90 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-xs bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-900">Invite Link</span>
                  <p className="text-[10px] text-slate-500">Share with tenants and network</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <input type="text" readOnly value={inviteLink} className="flex-1 px-2 text-[11px] font-mono text-slate-700 bg-transparent outline-none truncate" />
                <button onClick={handleCopyLink} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${copiedLink ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                  {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <button onClick={() => handleSocialShare('whatsapp')} className="flex items-center justify-center py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">WhatsApp</button>
                <button onClick={() => handleSocialShare('twitter')} className="flex items-center justify-center py-1 rounded-xl bg-slate-100 text-slate-900 border border-slate-300 text-[10px] font-semibold">𝕏</button>
                <button onClick={() => handleSocialShare('facebook')} className="flex items-center justify-center py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-semibold">Facebook</button>
                <button onClick={() => handleSocialShare('telegram')} className="flex items-center justify-center py-1 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-semibold">Telegram</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. REFERRALS FEATURE: STICKY SEARCH BAR */}
      {activeTab === 'referrals' && (
        <div className="absolute inset-x-0 top-0 bottom-0 z-30 pointer-events-none flex flex-col">
          <div className="flex-1 w-full max-w-md mx-auto pt-6 pb-4 px-3 flex flex-col pointer-events-auto overflow-hidden">
            <div className="mb-3 shrink-0">
              <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/90 px-3 py-2">
                <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={referralSearch}
                  onChange={(e) => setReferralSearch(e.target.value)}
                  placeholder="Search referrals..."
                  className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent outline-none"
                />
                {referralSearch && (
                  <button onClick={() => setReferralSearch('')} className="p-1 text-slate-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-2 pr-0.5 scrollbar-hide">
              {submittedSubscriptions.filter((sub) => {
                const matchesSearch = sub.subscriberName.toLowerCase().includes(referralSearch.toLowerCase()) ||
                                      sub.subscriberEmail.toLowerCase().includes(referralSearch.toLowerCase());
                const matchesPlan = verificationData ? sub.plan === verificationData.subscription : true;
                return matchesSearch && matchesPlan;
              }).length === 0 ? (
                <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-md border border-slate-200/90 flex flex-col items-center text-center">
                  <Users className="w-10 h-10 text-slate-200 mb-2" />
                  <div className="text-xs font-bold text-slate-400 uppercase">No Referrals</div>
                </div>
              ) : (
                submittedSubscriptions
                  .filter((sub) => {
                    const matchesSearch = sub.subscriberName.toLowerCase().includes(referralSearch.toLowerCase()) ||
                                          sub.subscriberEmail.toLowerCase().includes(referralSearch.toLowerCase());
                    const matchesPlan = verificationData ? sub.plan === verificationData.subscription : true;
                    return matchesSearch && matchesPlan;
                  })
                  .map((sub) => (
                    <div key={sub.id} className="w-full bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-md border border-slate-200/90 flex items-center justify-between gap-3">
                      <div
                        onClick={() => openFullScreen(`Referral Logo: ${sub.subscriberName}`, 'logo', sub.selfieImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&h=500&fit=crop', 'logo.jpg', sub.subscriberName)}
                        className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-xs bg-blue-100 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                      >
                        <img src={sub.selfieImage || undefined} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{sub.subscriberName}</div>
                        <div className="text-[10px] text-slate-500 truncate">{sub.subscriberEmail}</div>
                        <div className="text-[10px] font-bold text-blue-600 mt-0.5">R {sub.amountRands.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setSelectedSubmissionToView(sub)} className="p-1.5 rounded-lg bg-blue-50 text-blue-700"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleApproveSubmission(sub.id)} className={`p-1.5 rounded-lg ${sub.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-600 text-white'}`}><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleRejectSubmission(sub.id)} className={`p-1.5 rounded-lg ${sub.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-rose-600 text-white'}`}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SEEKERS FEATURE: STICKY SEARCH BAR */}
      {activeTab === 'seekers' && (
        <div className="absolute inset-x-0 top-0 bottom-0 z-30 pointer-events-none flex flex-col">
          <div className="flex-1 w-full max-w-md mx-auto pt-6 pb-4 px-3 flex flex-col pointer-events-auto overflow-hidden">
            <div className="mb-3 shrink-0">
              <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/90 px-3 py-2">
                <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={seekerSearch}
                  onChange={(e) => setSeekerSearch(e.target.value)}
                  placeholder="Search seekers..."
                  className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-2 pr-0.5 scrollbar-hide">
              {seekersList.length === 0 ? (
                <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-md border border-slate-200/90 flex flex-col items-center text-center">
                  <UserSearch className="w-10 h-10 text-slate-200 mb-2" />
                  <div className="text-xs font-bold text-slate-400 uppercase">No Seekers Available</div>
                </div>
              ) : (
                seekersList.filter(s => s.name.toLowerCase().includes(seekerSearch.toLowerCase())).map((seeker) => (
                  <div key={seeker.id} className="w-full bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-md border border-slate-200/90 flex items-center justify-between gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-xs bg-sky-100 flex items-center justify-center">
                      <img src={seeker.avatarUrl || undefined} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{seeker.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{seeker.role} &bull; {seeker.location}</div>
                      <div className="text-[10px] font-bold text-emerald-700 mt-0.5">{seeker.budgetRands}</div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => handleStartHireSeeker(seeker)} className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold">Hire</button>
                      <button onClick={() => setSelectedSeekerToView(seeker)} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold">Contact</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. PROFILE FEATURE */}
      {activeTab === 'profile' && (
        <div className="absolute inset-x-0 top-0 bottom-0 z-30 pointer-events-none flex flex-col">
          <div className="flex-1 w-full max-w-md mx-auto pt-6 pb-4 px-3 overflow-y-auto space-y-3 pointer-events-auto">
            <form onSubmit={handleSaveProfile} className="w-full bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-md border border-slate-200/90 space-y-4">
              <div className="flex items-center gap-4">
                <div
                  onClick={() => openFullScreen('Profile Logo', 'logo', profileSelfieLogo, 'selfie.jpg', profileName)}
                  className="relative w-18 h-18 rounded-full overflow-hidden shrink-0 border-2 border-blue-500 shadow-md bg-blue-100 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                >
                  <img src={profileSelfieLogo || undefined} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-tighter">Verified Profile</div>
                  <div className="text-[11px] text-slate-500 truncate">{currentUser?.email}</div>
                  <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full w-fit text-[9px] font-bold">
                    <CheckCircle className="w-3 h-3" />
                    APPROVED TENANT
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Display Name</label>
                  <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Phone</label>
                  <input type="text" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Location</label>
                  <input type="text" value={profileLocation} onChange={(e) => setProfileLocation(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-black text-xs shadow-lg hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-widest">
                  Save Settings
                </button>
              </div>
            </form>

            <button onClick={onLogout} className="w-full bg-rose-50/50 hover:bg-rose-50 border border-rose-100 rounded-2xl py-3 px-4 flex items-center justify-between text-rose-600 group transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 group-hover:rotate-12 transition-transform">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-tight">Logout of Account</span>
              </div>
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* FULL SCREEN VIEWER */}
      {fullScreenDoc && (
        <div className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-xl flex flex-col p-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                {fullScreenDoc.type === 'logo' ? <User className="w-6 h-6" /> : <FileCheck2 className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-sm font-bold truncate max-w-[200px]">{fullScreenDoc.title}</h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{fullScreenDoc.applicantName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setDocZoom(z => Math.max(0.5, z - 0.2))} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"><ZoomOut className="w-4 h-4" /></button>
              <button onClick={() => setDocZoom(z => Math.min(3, z + 0.2))} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"><ZoomIn className="w-4 h-4" /></button>
              <button onClick={() => setFullScreenDoc(null)} className="p-2 rounded-full bg-rose-600 text-white ml-2"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto py-8">
            <div style={{ transform: `scale(${docZoom})` }} className="transition-transform duration-200">
              {fullScreenDoc.type === 'logo' ? (
                <img src={fullScreenDoc.imageUrl || undefined} className="max-h-[80vh] max-w-[90vw] object-contain rounded-3xl shadow-2xl border-4 border-white/20" />
              ) : (
                <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-200 text-slate-900">
                  <div className="flex justify-between border-b pb-4 mb-6">
                    <div className="font-black text-xl tracking-tighter uppercase italic">RSA Document</div>
                    <div className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full h-fit">VERIFIED</div>
                  </div>
                  <div className="space-y-4 font-mono text-xs">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="mb-2"><span className="text-slate-400">SUBJECT:</span> {fullScreenDoc.applicantName}</div>
                      <div className="mb-2"><span className="text-slate-400">DOC_ID:</span> ZA-940218-5082-084</div>
                      <div><span className="text-slate-400">TYPE:</span> {fullScreenDoc.type.toUpperCase()}</div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed uppercase">
                      This document has been verified by the South African Government portal and linked to the TimeGiG verified profile.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setFullScreenDoc(null)} className="w-full py-4 bg-white text-slate-900 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors">
            Close Full Screen View
          </button>
        </div>
      )}

      {/* HIRING LOADER */}
      {hiringSeeker && (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <div className="relative w-40 h-40 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-8 border-blue-100" />
              <div className="absolute inset-0 rounded-full border-8 border-blue-600 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-black text-blue-600 italic leading-none">{hireCountdown}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Waiting</div>
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2 uppercase italic">Dispatching Seeker</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
              Sending gig request to <span className="text-blue-600 font-bold">{hiringSeeker.name}</span>. Waiting for real-time acceptance on the map.
            </p>
            <button onClick={handleSeekerAcceptGig} className="w-full py-4 bg-emerald-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all">
              Force Seeker Accept
            </button>
          </div>
        </div>
      )}

      {/* SUBMISSION MODAL */}
      {selectedSubmissionToView && (
        <div className="fixed inset-0 z-[50] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Referral Details</h3>
              <button onClick={() => setSelectedSubmissionToView(null)} className="p-2 bg-slate-100 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <img src={selectedSubmissionToView.selfieImage || undefined} className="w-14 h-14 rounded-xl object-cover border border-slate-300" />
                <div>
                  <div className="text-sm font-bold text-slate-900">{selectedSubmissionToView.subscriberName}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">{selectedSubmissionToView.plan} Plan</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => openFullScreen('ID Document', 'id', '#', 'id.pdf', selectedSubmissionToView.subscriberName)} className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 flex flex-col items-center gap-1">
                  <FileText className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase">View ID</span>
                </button>
                <button onClick={() => openFullScreen('Payment Proof', 'payment', '#', 'proof.png', selectedSubmissionToView.subscriberName)} className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 flex flex-col items-center gap-1">
                  <CreditCard className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase">View Proof</span>
                </button>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleApproveSubmission(selectedSubmissionToView.id)} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase tracking-tighter">Approve</button>
                <button onClick={() => handleRejectSubmission(selectedSubmissionToView.id)} className="flex-1 py-3 bg-rose-600 text-white rounded-2xl font-bold text-xs uppercase tracking-tighter">Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEEKER CONTACT MODAL */}
      {selectedSeekerToView && (
        <div className="fixed inset-0 z-[50] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-blue-100 overflow-hidden">
              <img src={selectedSeekerToView.avatarUrl || undefined} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-1">{selectedSeekerToView.name}</h3>
            <p className="text-xs text-slate-500 font-bold uppercase mb-6">{selectedSeekerToView.role} &bull; {selectedSeekerToView.location}</p>
            <div className="space-y-2">
              <button onClick={() => { setSelectedSeekerToView(null); setContactSuccessToast(`Dialing ${selectedSeekerToView.contactNumber}...`); }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20">
                Call {selectedSeekerToView.contactNumber}
              </button>
              <button onClick={() => setSelectedSeekerToView(null)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS (Neutral clean style, no black bubbles) */}
      {(contactSuccessToast || profileSavedToast) && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-2">
          <div className="bg-white text-slate-800 border border-slate-200 px-6 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {contactSuccessToast || profileSavedToast}
          </div>
        </div>
      )}
    </>
  );
}
