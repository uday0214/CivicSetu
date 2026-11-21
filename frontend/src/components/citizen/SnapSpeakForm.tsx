import React, { useState, useRef, useEffect } from 'react';
import exifr from 'exifr';
import L from 'leaflet';
import {
  Camera,
  Mic,
  Square,
  Sparkles,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  Trash2,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import {
  IntakeTriageResponse,
  CivicCategory,
  PriorityTier,
  IndianAgency,
  DedupCheckResult,
  ReportSubmissionRequest,
  ReportSubmissionResponse,
  CIVIC_CATEGORIES,
  PRIORITY_TIERS,
} from '../../types/api';
import { DuplicateModal } from './DuplicateModal';
import { createCustomSvgPin } from '../../utils/mapIcons';

interface SnapSpeakFormProps {
  onReportSubmitted: (result: ReportSubmissionResponse) => void;
}

export const SnapSpeakForm: React.FC<SnapSpeakFormProps> = ({ onReportSubmitted }) => {
  // Media states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>('');

  // Audio recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  // Location & landmark states (Bengaluru defaults)
  const [lat, setLat] = useState<number>(12.9716);
  const [lng, setLng] = useState<number>(77.6412);
  const [landmark, setLandmark] = useState<string>('');
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // AI Triage & submission states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [triageData, setTriageData] = useState<IntakeTriageResponse | null>(null);
  const [serverPhotoUrl, setServerPhotoUrl] = useState<string | null>(null);
  const [serverAudioUrl, setServerAudioUrl] = useState<string | null>(null);
  const [triageError, setTriageError] = useState<string | null>(null);

  // Editable fields post-triage
  const [editableTitle, setEditableTitle] = useState<string>('');
  const [editableDesc, setEditableDesc] = useState<string>('');
  const [editableCategory, setEditableCategory] = useState<CivicCategory>('Roads & Footpaths');
  const [editablePriority, setEditablePriority] = useState<PriorityTier>('P2_MEDIUM');
  const [editableAgency, setEditableAgency] = useState<IndianAgency>('ULB_MUNICIPAL');
  const [editableWard, setEditableWard] = useState<string>('Ward 14 - Indiranagar');

  // Duplicate detection & submission
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [duplicateMatch, setDuplicateMatch] = useState<DedupCheckResult | null>(null);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  // Initialize mini Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || leafletMapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const pin = createCustomSvgPin('Roads & Footpaths', 'P1_HIGH');
    const marker = L.marker([lat, lng], { icon: pin, draggable: true }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setLat(pos.lat);
      setLng(pos.lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setLat(e.latlng.lat);
      setLng(e.latlng.lng);
    });

    leafletMapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Sync marker position when lat/lng change
  useEffect(() => {
    if (leafletMapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      leafletMapRef.current.panTo([lat, lng]);
    }
  }, [lat, lng]);

  // Handle Photo Capture with EXIF extraction & canvas compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. Extract EXIF GPS coordinates BEFORE compression
      const exifData = await exifr.gps(file);
      if (exifData && exifData.latitude && exifData.longitude) {
        setLat(exifData.latitude);
        setLng(exifData.longitude);
      } else {
        // Fallback to browser geolocation if supported
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLat(pos.coords.latitude);
              setLng(pos.coords.longitude);
            },
            () => console.info('Using Bengaluru default coordinates')
          );
        }
      }

      // 2. Compress image via canvas to max width 1024px
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (event) => {
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxWidth = 1024;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                });
                setPhotoFile(compressedFile);
                setPhotoPreview(URL.createObjectURL(blob));
              }
            },
            'image/jpeg',
            0.85
          );
        };
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error processing photo:', err);
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Vernacular Voice Recorder (Browser-native MediaRecorder)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access failed:', err);
      alert('Microphone permission required to record vernacular voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  // Unified Gemini Multimodal Triage Call
  const handleAnalyzeWithGemini = async () => {
    if (!photoFile && !audioBlob && !rawText.trim()) {
      setTriageError('Please take a photo, record a voice note, or enter a text description.');
      return;
    }

    setIsAnalyzing(true);
    setTriageError(null);
    setTriageData(null);

    const formData = new FormData();
    if (photoFile) formData.append('photo', photoFile);
    if (audioBlob) {
      const mime = audioBlob.type || 'audio/webm';
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      formData.append('audio', audioBlob, `voice_note.${ext}`);
    }
    if (rawText.trim()) formData.append('text', rawText.trim());
    formData.append('lat', lat.toString());
    formData.append('lng', lng.toString());
    if (landmark.trim()) formData.append('landmark', landmark.trim());

    try {
      const result = await apiClient.triageReport(formData);
      setServerPhotoUrl(result.photo_url || null);
      setServerAudioUrl(result.audio_url || null);
      setTriageData(result.triage);

      if (result.triage.is_valid_civic_issue) {
        setEditableTitle(result.triage.title || 'Reported Civic Issue');
        setEditableDesc(result.triage.description_standardized_en || '');
        if (result.triage.category) setEditableCategory(result.triage.category);
        if (result.triage.priority) setEditablePriority(result.triage.priority);
        if (result.triage.agency) setEditableAgency(result.triage.agency);
        if (result.triage.ward_id) setEditableWard(result.triage.ward_id);
        if (result.triage.extracted_landmark && !landmark) {
          setLandmark(result.triage.extracted_landmark);
        }
      }
    } catch (err: any) {
      console.error('Triage error:', err);
      setTriageError(err.message || 'AI Triage failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Trigger submission (checks duplicate first)
  const handlePreSubmission = async () => {
    setIsSubmitting(true);
    setTriageError(null);

    try {
      const dupCheck = await apiClient.checkDuplicate({
        lat,
        lng,
        category: editableCategory,
        title: editableTitle,
        description: editableDesc,
        landmark,
      });

      if (dupCheck.has_duplicate && dupCheck.matched_incident) {
        setDuplicateMatch(dupCheck);
        setIsSubmitting(false);
        return;
      }

      // No duplicate: submit directly
      await finalizeSubmission(false, null);
    } catch (err: any) {
      console.error('Duplicate check error:', err);
      // Fallback: submit directly if dup check fails
      await finalizeSubmission(false, null);
    }
  };

  const finalizeSubmission = async (forceNew: boolean, matchedId: string | null) => {
    setIsSubmitting(true);
    setDuplicateMatch(null);

    const submissionPayload: ReportSubmissionRequest = {
      title: editableTitle || 'Civic Issue',
      description_standardized_en: editableDesc || 'Reported civic issue requiring municipal attention.',
      category: editableCategory,
      priority: editablePriority,
      agency: editableAgency,
      ward_id: editableWard,
      lat,
      lng,
      landmark: landmark || undefined,
      photo_url: serverPhotoUrl || undefined,
      audio_url: serverAudioUrl || undefined,
      raw_text: rawText || undefined,
      transcription: triageData?.transcription || undefined,
      language_detected: triageData?.language_detected || undefined,
      vernacular_response: triageData?.vernacular_acknowledgement || undefined,
      triage_trace: triageData?.triage_trace || undefined,
      force_new: forceNew,
      matched_incident_id: matchedId || undefined,
    };

    try {
      const result = await apiClient.submitReport(submissionPayload);
      setSubmissionFeedback(result.message_to_citizen);
      onReportSubmitted(result);

      // Reset form
      setPhotoFile(null);
      setPhotoPreview(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setRawText('');
      setTriageData(null);
    } catch (err: any) {
      console.error('Submission failed:', err);
      setTriageError(err.message || 'Report submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4 space-y-5 animate-fade-in pb-12">
      {/* Step A: Media Capture Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            1. Snap & Speak Intake
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            Zero Form Fatigue
          </span>
        </div>

        {/* Photo Upload Area */}
        <div>
          {photoPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
              <img src={photoPreview} alt="Civic defect preview" className="w-full h-48 object-cover" />
              <button
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="absolute top-2 right-2 p-2 rounded-full bg-slate-900/80 hover:bg-red-600 text-white transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center min-h-[140px] border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition p-4 text-center">
              <Camera className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-sm font-semibold text-slate-200">Tap to Capture Photo or Browse</span>
              <span className="text-xs text-slate-500 mt-1">Extracts EXIF GPS coordinates automatically</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Vernacular Voice Recorder */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              🎙️ Speak in Hindi, Kannada, Telugu, Tamil, or English
            </span>
            {isRecording && (
              <span className="flex items-center gap-1.5 text-xs font-mono text-red-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:
                {String(recordSeconds % 60).padStart(2, '0')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                <Mic className="w-4 h-4 text-emerald-400" />
                Record Voice Note
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-950 transition"
              >
                <Square className="w-4 h-4" />
                Stop Recording
              </button>
            )}

            {audioUrl && (
              <div className="flex-1 flex items-center gap-2">
                <audio controls src={audioUrl} className="h-9 w-full rounded-lg" />
                <button
                  onClick={() => {
                    setAudioBlob(null);
                    setAudioUrl(null);
                  }}
                  className="p-2 text-slate-400 hover:text-red-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Text Fallback Note */}
        <div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Or type a quick note / Hinglish description (e.g., Road pe bada pothole hai Indiranagar pillar 42 ke paas)..."
            rows={2}
            className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Step B: Location & Landmark Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cyan-400" />
          2. Location & Landmark
        </h3>

        {/* Mini Leaflet Pin-Drop Map */}
        <div ref={mapContainerRef} className="w-full h-40 rounded-xl overflow-hidden border border-slate-800 shadow-inner" />

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>Lat: {lat.toFixed(5)}</span>
          <span>•</span>
          <span>Lng: {lng.toFixed(5)}</span>
          <span className="text-slate-500 text-[11px]">(Drag marker to adjust)</span>
        </div>

        <input
          type="text"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          placeholder="Landmark (e.g., Near SBI ATM, opp. Indiranagar Metro Pillar 42)"
          className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Error alert */}
      {triageError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{triageError}</span>
        </div>
      )}

      {/* Step C: AI Analysis Trigger Button */}
      {!triageData?.is_valid_civic_issue && (
        <button
          onClick={handleAnalyzeWithGemini}
          disabled={isAnalyzing}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-teal-950 flex items-center justify-center gap-2 transition"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing photo & transcribing code-mixed voice note...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              Analyze & Auto-Fill with Gemini
            </>
          )}
        </button>
      )}

      {/* Sanity Gate Rejection State */}
      {triageData && !triageData.is_valid_civic_issue && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <AlertCircle className="w-4 h-4" />
            Not a Valid Civic Issue / Unclear Media
          </div>
          <p>{triageData.rejection_reason || 'Photo or note does not appear to report a civic municipal defect.'}</p>
          {triageData.suggested_user_prompt && (
            <p className="text-amber-200/90 font-medium">💡 Suggestion: {triageData.suggested_user_prompt}</p>
          )}
        </div>
      )}

      {/* AI Auto-Fill Review Card */}
      {triageData?.is_valid_civic_issue && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in">
          {/* Vernacular Confirmation Banner */}
          {triageData.vernacular_acknowledgement && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{triageData.vernacular_acknowledgement}</span>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              AI Verified Triage Details
            </span>
            <span className="text-[11px] text-slate-400">Review & edit before submission</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Title</label>
              <input
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-emerald-500 mt-1"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Standardized English Description
              </label>
              <textarea
                value={editableDesc}
                onChange={(e) => setEditableDesc(e.target.value)}
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                <select
                  value={editableCategory}
                  onChange={(e) => setEditableCategory(e.target.value as CivicCategory)}
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 mt-1"
                >
                  {CIVIC_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Priority</label>
                <select
                  value={editablePriority}
                  onChange={(e) => setEditablePriority(e.target.value as PriorityTier)}
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 mt-1"
                >
                  {PRIORITY_TIERS.map((pri) => (
                    <option key={pri} value={pri}>
                      {pri}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Routed Agency</label>
                <input
                  type="text"
                  value={editableAgency}
                  onChange={(e) => setEditableAgency(e.target.value as IndianAgency)}
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ward ID</label>
                <input
                  type="text"
                  value={editableWard}
                  onChange={(e) => setEditableWard(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 mt-1"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handlePreSubmission}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking duplicates & submitting report...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Confirm & Submit Report
              </>
            )}
          </button>
        </div>
      )}

      {/* Submission Feedback Toast */}
      {submissionFeedback && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{submissionFeedback}</span>
        </div>
      )}

      {/* Duplicate Modal */}
      {duplicateMatch && (
        <DuplicateModal
          duplicateInfo={duplicateMatch}
          onConfirmBoost={(matchedId) => finalizeSubmission(false, matchedId)}
          onSubmitSeparately={() => finalizeSubmission(true, null)}
          onCancel={() => setDuplicateMatch(null)}
        />
      )}
    </div>
  );
};
