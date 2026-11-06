import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  User,
  Camera,
  UploadCloud,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
  Wrench,
  Settings,
  Search,
  Cpu,
  RefreshCw,
  Sparkles,
  MapPin,
  X,
  FileCheck2
} from 'lucide-react';

export type SubscriptionType = 'tenant' | 'user';

export interface VerificationData {
  subscription: SubscriptionType;
  selfieImage: string | null;
  idDocumentName: string | null;
  idDocumentUrl: string | null;
  paymentDocumentName: string | null;
  paymentDocumentUrl: string | null;
  submittedAt: number | null;
}

interface SubscriptionFlowProps {
  onComplete: (data: VerificationData) => void;
  onClose?: () => void;
  initialData?: VerificationData | null;
}

export default function SubscriptionFlow({
  onComplete,
  onClose,
  initialData,
}: SubscriptionFlowProps) {
  const [currentStep, setCurrentStep] = useState<number>(
    initialData?.submittedAt ? 5 : 1
  );

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType>(
    initialData?.subscription || 'tenant'
  );

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(
    initialData?.selfieImage || null
  );

  // ID Document state
  const [idDoc, setIdDoc] = useState<{ name: string; url: string } | null>(
    initialData?.idDocumentName && initialData.idDocumentUrl
      ? { name: initialData.idDocumentName, url: initialData.idDocumentUrl }
      : null
  );

  // Payment Document state
  const [paymentDoc, setPaymentDoc] = useState<{ name: string; url: string } | null>(
    initialData?.paymentDocumentName && initialData.paymentDocumentUrl
      ? { name: initialData.paymentDocumentName, url: initialData.paymentDocumentUrl }
      : null
  );

  // Review Countdown (15 - 25 minutes; starting at 20m = 1200 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(1200);

  // Countdown timer for review
  useEffect(() => {
    if (currentStep !== 5) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStep]);

  // Clean up camera stream when leaving or unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 480 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      let msg = 'Could not access front camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. You can upload a photo below.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No front camera found. You can upload a photo below.';
      }
      setCameraPermissionError(msg);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedSelfie(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedSelfie(null);
    startCamera();
  };

  const handleSelfieFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedSelfie(event.target?.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setIdDoc({
          name: file.name,
          url: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaymentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPaymentDoc({
          name: file.name,
          url: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    const data: VerificationData = {
      subscription: selectedPlan,
      selfieImage: capturedSelfie,
      idDocumentName: idDoc?.name || null,
      idDocumentUrl: idDoc?.url || null,
      paymentDocumentName: paymentDoc?.name || null,
      paymentDocumentUrl: paymentDoc?.url || null,
      submittedAt: Date.now(),
    };
    setCurrentStep(5);
    onComplete(data);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-md">
      {/* Compact modal frame: fits naturally in viewport without scrolling */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Compact Stepper Header (Steps 1 to 4) */}
        {currentStep < 5 && (
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[11px]">
                {currentStep}
              </span>
              <div>
                <h2 className="text-xs font-bold text-slate-900 leading-none">
                  {currentStep === 1 && 'Select Subscription'}
                  {currentStep === 2 && 'Front Camera Selfie'}
                  {currentStep === 3 && 'Upload ID Document'}
                  {currentStep === 4 && 'Upload Proof of Payment'}
                </h2>
                <span className="text-[10px] text-slate-400">Step {currentStep} of 4</span>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* STEP 1: Two Subscription Boxes: Tenant Sub and User Sub (Compact) */}
        {currentStep === 1 && (
          <div className="p-4 sm:p-5 flex flex-col justify-between overflow-hidden">
            <div className="text-center mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/50 mb-1">
                <Sparkles className="w-3 h-3 text-blue-600" />
                Subscription Plans
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Choose 1 Subscription
              </h3>
              <p className="text-[11px] text-slate-500">
                Select either <strong>Tenant Sub</strong> or <strong>User Sub</strong>
              </p>
            </div>

            {/* The 2 Subscription Boxes Side-by-Side (Select Only 1) */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {/* Box 1: Tenant Sub */}
              <div
                onClick={() => setSelectedPlan('tenant')}
                className={`rounded-xl p-3 border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  selectedPlan === 'tenant'
                    ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        selectedPlan === 'tenant'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedPlan === 'tenant'
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {selectedPlan === 'tenant' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                      Rental & Property
                    </span>
                    <span className="text-[11px] font-extrabold text-blue-900">
                      R 3,400.00
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">Tenant Sub</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Dedicated verification for tenants & rental boundaries.
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1 text-[10px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Tenant territory badge</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Rental boundary alerts</span>
                  </div>
                </div>
              </div>

              {/* Box 2: User Sub */}
              <div
                onClick={() => setSelectedPlan('user')}
                className={`rounded-xl p-3 border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  selectedPlan === 'user'
                    ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        selectedPlan === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <User className="w-4 h-4" />
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedPlan === 'user'
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {selectedPlan === 'user' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                      Personal GPS
                    </span>
                    <span className="text-[11px] font-extrabold text-indigo-900">
                      R 1,450.00
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">User Sub</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Personal GPS tracking & custom world pins.
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1 text-[10px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Real-time live tracking</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Map & Satellite mode</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={() => setCurrentStep(2)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-98"
            >
              <span>Continue with {selectedPlan === 'tenant' ? 'Tenant Sub' : 'User Sub'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STEP 2: Front Camera Live Selfie (Compact) */}
        {currentStep === 2 && (
          <div className="p-4 sm:p-5 flex flex-col overflow-hidden">
            <div className="text-center mb-3">
              <h3 className="text-sm font-bold text-slate-900">Front Camera Live Selfie</h3>
              <p className="text-[11px] text-slate-500">
                Capture a live selfie or upload a portrait from your device
              </p>
            </div>

            {/* Compact Camera Frame */}
            <div className="flex flex-col items-center mb-3">
              {capturedSelfie ? (
                <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md bg-slate-950 flex items-center justify-center">
                  <img
                    src={capturedSelfie || undefined}
                    alt="Captured selfie"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 px-2 py-0.5 rounded bg-emerald-600/90 text-white text-[10px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Captured
                  </div>
                </div>
              ) : (
                <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-900 shadow-inner flex flex-col items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`w-full h-full object-cover -scale-x-100 ${
                      cameraActive ? 'block' : 'hidden'
                    }`}
                  />

                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-24 h-28 rounded-[50%] border-2 border-dashed border-white/70" />
                    </div>
                  )}

                  {!cameraActive && (
                    <div className="p-2 text-center text-slate-300">
                      <Camera className="w-6 h-6 mx-auto mb-1 text-blue-400" />
                      <p className="text-[10px] text-slate-300 font-medium">Front Camera</p>
                      <button
                        onClick={startCamera}
                        className="mt-2 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold transition-all inline-flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3" />
                        Allow Camera
                      </button>
                    </div>
                  )}
                </div>
              )}

              {cameraPermissionError && (
                <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[10px] flex items-center gap-1.5 max-w-xs text-left">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{cameraPermissionError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-2.5 flex flex-wrap gap-2 justify-center w-full max-w-xs">
                {cameraActive && !capturedSelfie && (
                  <button
                    onClick={capturePhoto}
                    className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Snap Live Selfie
                  </button>
                )}

                {capturedSelfie ? (
                  <button
                    onClick={retakePhoto}
                    className="py-1.5 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Retake
                  </button>
                ) : (
                  <label className="cursor-pointer py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-medium flex items-center gap-1">
                    <UploadCloud className="w-3 h-3 text-slate-500" />
                    <span>Upload photo file</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleSelfieFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Stepper Footer */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
              <button
                onClick={() => {
                  stopCamera();
                  setCurrentStep(1);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <button
                disabled={!capturedSelfie}
                onClick={() => {
                  stopCamera();
                  setCurrentStep(3);
                }}
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm disabled:opacity-40"
              >
                <span>Next: ID</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Upload ID Documents (Compact) */}
        {currentStep === 3 && (
          <div className="p-4 sm:p-5 flex flex-col overflow-hidden">
            <div className="text-center mb-3">
              <h3 className="text-sm font-bold text-slate-900">Upload ID Document</h3>
              <p className="text-[11px] text-slate-500">
                Passport, National ID, or Driver's License
              </p>
            </div>

            <div className="mb-4">
              {idDoc ? (
                <div className="p-3 rounded-xl border-2 border-emerald-500 bg-emerald-50/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 truncate max-w-[190px]">
                        {idDoc.name}
                      </div>
                      <div className="text-[10px] text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        ID Document Attached
                      </div>
                    </div>
                  </div>

                  <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-800 underline shrink-0 ml-2">
                    Change
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleIdFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 flex flex-col items-center justify-center text-center bg-slate-50/70 hover:bg-blue-50/40 transition-colors">
                  <FileText className="w-7 h-7 text-blue-600 mb-1.5" />
                  <div className="text-xs font-bold text-slate-800">
                    Click to select ID Document
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    JPG, PNG, or PDF (Passport, National ID, Driver's License)
                  </div>
                  <span className="mt-2.5 px-3 py-1 rounded bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold shadow-xs">
                    Browse File
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleIdFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Stepper Footer */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <button
                disabled={!idDoc}
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm disabled:opacity-40"
              >
                <span>Next: Payment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Upload Proof of Payment (Compact) */}
        {currentStep === 4 && (
          <div className="p-4 sm:p-5 flex flex-col overflow-hidden">
            <div className="text-center mb-3">
              <h3 className="text-sm font-bold text-slate-900">Upload Proof of Payment</h3>
              <p className="text-[11px] text-slate-500">
                Receipt, transfer slip, or invoice for {selectedPlan === 'tenant' ? 'Tenant Sub' : 'User Sub'}
              </p>
            </div>

            <div className="mb-3">
              {paymentDoc ? (
                <div className="p-3 rounded-xl border-2 border-emerald-500 bg-emerald-50/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 truncate max-w-[190px]">
                        {paymentDoc.name}
                      </div>
                      <div className="text-[10px] text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Proof of Payment Attached
                      </div>
                    </div>
                  </div>

                  <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-800 underline shrink-0 ml-2">
                    Change
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handlePaymentFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 flex flex-col items-center justify-center text-center bg-slate-50/70 hover:bg-blue-50/40 transition-colors">
                  <CreditCard className="w-7 h-7 text-blue-600 mb-1.5" />
                  <div className="text-xs font-bold text-slate-800">
                    Click to select Proof of Payment
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Bank slip, transaction screenshot, or remittance (JPG, PNG, PDF)
                  </div>
                  <span className="mt-2.5 px-3 py-1 rounded bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold shadow-xs">
                    Browse File
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handlePaymentFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Stepper Footer */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <button
                disabled={!paymentDoc}
                onClick={handleSubmit}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm disabled:opacity-40 active:scale-98"
              >
                <span>Submit Verification</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Circle of Tools Loading Review (Compact & Fits Screen Without Scrolling) */}
        {currentStep === 5 && (
          <div className="p-4 sm:p-5 text-center flex flex-col items-center justify-between overflow-hidden">
            {/* Top Close Icon */}
            {onClose && (
              <div className="w-full flex justify-end -mt-1 -mr-1 mb-1">
                <button
                  onClick={onClose}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Compact Animated Circle of Tools */}
            <div className="relative w-28 h-28 my-1 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping duration-1000" />
              <div className="absolute inset-1.5 rounded-full bg-blue-500/15 animate-pulse" />

              {/* Orbital Ring with 8 Rotating Tools */}
              <div className="absolute inset-0 rounded-full border border-dashed border-blue-400/60 animate-[spin_12s_linear_infinite]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-blue-600">
                  <Wrench className="w-2.5 h-2.5" />
                </div>
                <div className="absolute top-[14.6%] right-[14.6%] translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-indigo-600">
                  <Settings className="w-2.5 h-2.5" />
                </div>
                <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-2.5 h-2.5" />
                </div>
                <div className="absolute bottom-[14.6%] right-[14.6%] translate-x-1/2 translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-sky-600">
                  <Camera className="w-2.5 h-2.5" />
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-amber-600">
                  <Search className="w-2.5 h-2.5" />
                </div>
                <div className="absolute bottom-[14.6%] left-[14.6%] -translate-x-1/2 translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-purple-600">
                  <FileText className="w-2.5 h-2.5" />
                </div>
                <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-rose-600">
                  <Cpu className="w-2.5 h-2.5" />
                </div>
                <div className="absolute top-[14.6%] left-[14.6%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-blue-500">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin duration-3000" />
                </div>
              </div>

              {/* Center Core */}
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md flex flex-col items-center justify-center">
                <Clock className="w-5 h-5 animate-pulse mb-0.5 text-blue-200" />
                <span className="text-[9px] font-mono font-bold leading-none">
                  {formatTimer(secondsRemaining)}
                </span>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-base font-bold text-slate-900 mt-2 mb-1">
              Verification Review In Progress
            </h3>

            {/* Required prominent statement: Review takes 15 to 25 minutes */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs shadow-xs mb-3">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span>Review takes 15 to 25 minutes</span>
            </div>

            {/* Compact Progress Checklist */}
            <div className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-left space-y-1.5 mb-3">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Plan: <strong>{selectedPlan === 'tenant' ? 'Tenant Sub' : 'User Sub'}</strong></span>
                </div>
                <span className="text-emerald-700 font-semibold bg-emerald-100/70 px-1.5 py-0.2 rounded text-[10px]">
                  Confirmed
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Front Camera Selfie</span>
                </div>
                <span className="text-emerald-700 font-semibold bg-emerald-100/70 px-1.5 py-0.2 rounded text-[10px]">
                  Encrypted
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                  <span>ID & Payment Documents</span>
                </div>
                <span className="text-amber-800 font-semibold bg-amber-100/70 px-1.5 py-0.2 rounded text-[10px]">
                  Reviewing 15-25m
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-2 w-full">
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Explore World Map</span>
                </button>
              )}

              <button
                onClick={() => {
                  setCurrentStep(1);
                  setCapturedSelfie(null);
                  setIdDoc(null);
                  setPaymentDoc(null);
                }}
                className="py-2 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
