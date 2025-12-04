import React, { useState, useEffect, useRef } from 'react';
import SpotifyIcon from './icons/SpotifyIcon';
import XIcon from './icons/XIcon';
import HeadphonesIcon from './icons/HeadphonesIcon';
import QrCodeIcon from './icons/QrCodeIcon';
import ArrowRightCircleIcon from './icons/ArrowRightCircleIcon';
import LoaderIcon from './icons/LoaderIcon';
import CameraIcon from './icons/CameraIcon';
import ChevronUpIcon from './icons/ChevronUpIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';

type SpotifyPlaylist = {
  id: string;
  name: string;
  color: string;
  url: string;
  icon?: string;
};

const SPOTIFY_PLAYLISTS: SpotifyPlaylist[] = [
  { id: 'deep_focus', name: 'Deep Focus', color: 'bg-blue-500', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ' },
  { id: 'lofi_beats', name: 'Lo-Fi Beats', color: 'bg-purple-500', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn' },
  { id: 'brain_food', name: 'Brain Food', color: 'bg-pink-500', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS' },
  { id: 'piano', name: 'Peaceful Piano', color: 'bg-emerald-500', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO' },
  { id: 'classical', name: 'Classical', color: 'bg-amber-500', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWEJlAGA9gs0' },
  // Updated Nature Sounds Playlist ID per user request
  { id: 'nature', name: 'Nature Sounds', color: 'bg-teal-500', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4PP3DA4J0N8' },
];

// Helper untuk konversi link biasa ke link embed
const convertToEmbedUrl = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname !== 'open.spotify.com') return null;
        
        // Jika sudah embed, return
        if (urlObj.pathname.startsWith('/embed')) return url;

        // Ubah /playlist/id menjadi /embed/playlist/id
        return `https://open.spotify.com/embed${urlObj.pathname}`;
    } catch (e) {
        return null;
    }
};

// Helper konversi file ke base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

interface MusicPlayerProps {
    onPlayStateChange?: (isPlaying: boolean) => void;
    onExpandChange?: (isExpanded: boolean) => void;
    isFocusMode?: boolean;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ onPlayStateChange, onExpandChange, isFocusMode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Expanded Mode State
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Custom Link States
  const [customLinkInput, setCustomLinkInput] = useState('');
  const [linkError, setLinkError] = useState('');

  // Scanner States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
      if (onPlayStateChange) {
          onPlayStateChange(!!currentUrl);
      }
  }, [currentUrl, onPlayStateChange]);

  // --- Handlers ---

  const handleSelectUrl = (url: string) => {
    setCurrentUrl(url);
    setIsMenuOpen(false);
    stopScanner(); // Ensure scanner is closed if active
    setRefreshKey(prev => prev + 1); // Force iframe refresh
    setIsExpanded(false); // Reset to compact view on new selection
    onExpandChange?.(false);
  };

  const handleCustomLinkSubmit = () => {
      setLinkError('');
      if (!customLinkInput.trim()) return;

      const embedUrl = convertToEmbedUrl(customLinkInput);
      if (embedUrl) {
          handleSelectUrl(embedUrl);
          setCustomLinkInput('');
      } else {
          setLinkError('Link tidak valid. Gunakan link Spotify (Playlist/Album/Track).');
      }
  };

  const handleClosePlayer = () => {
    setCurrentUrl(null);
    setIsExpanded(false);
    onExpandChange?.(false);
  };

  const toggleExpand = () => {
      const newState = !isExpanded;
      setIsExpanded(newState);
      onExpandChange?.(newState);
  };

  // --- Scanner Logic ---
  
  const startScanner = async () => {
      try {
          setScanError('');
          setIsCameraOpen(true);
          const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'environment', width: { ideal: 720 } }
          });
          streamRef.current = stream;
          
          // Delay sedikit untuk memastikan elemen video sudah render
          setTimeout(() => {
              if (videoRef.current) {
                  videoRef.current.srcObject = stream;
              }
          }, 100);
      } catch (err) {
          console.error("Camera error:", err);
          setLinkError("Gagal mengakses kamera.");
          setIsCameraOpen(false);
      }
  };

  const stopScanner = () => {
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
      }
      setIsCameraOpen(false);
      setIsScanning(false);
      setScanError('');
  };

  const captureAndScan = async () => {
      if (!videoRef.current || isScanning) return;
      setIsScanning(true);
      setScanError('');

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0);
          canvas.toBlob(async (blob) => {
              if (blob) {
                  const file = new File([blob], "scan.jpg", { type: "image/jpeg" });
                  await processScanImage(file);
              }
          }, 'image/jpeg', 0.8);
      }
  };

  const processScanImage = async (file: File) => {
      try {
          const base64String = await fileToBase64(file);
          const base64Data = base64String.split(',')[1];

          const prompt = `Analyze this image. Look for a Spotify Code (waveform) or a QR code that contains a Spotify URL. 
          If found, extract the FULL URL. 
          Return ONLY JSON: { "url": "https://open.spotify.com/..." }. 
          If no valid code is found, return { "error": "not_found" }.`;

          const response = await fetch('/api/gemini', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  model: 'gemini-2.5-flash', // Vision capable
                  contents: [
                      {
                          parts: [
                              { text: prompt },
                              { inlineData: { mimeType: file.type, data: base64Data } }
                          ]
                      }
                  ]
              })
          });

          if (!response.ok) throw new Error("AI Service Error");
          const data = await response.json();
          const text = data.text;
          
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              if (result.url) {
                  const embedUrl = convertToEmbedUrl(result.url);
                  if (embedUrl) {
                      handleSelectUrl(embedUrl);
                      // Scanner closed by handleSelectUrl
                      return;
                  }
              }
          }
          setScanError("Kode tidak terbaca. Pastikan kode ada di dalam kotak.");
      } catch (e) {
          console.error(e);
          setScanError("Gagal memproses. Coba lagi.");
      } finally {
          setIsScanning(false);
      }
  };

  return (
    <>
      {/* Top Right Toggle Button - Z-INDEX 150 to sit above focus mode (140) */}
      {!currentUrl && (
        <div className="fixed top-4 right-20 lg:right-5 lg:top-5 z-[150] font-sans">
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-all duration-300 ${
                isMenuOpen
                    ? 'bg-slate-800 text-white rotate-90 dark:bg-slate-800'
                    : 'bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
            >
                {isMenuOpen ? <XIcon className="w-5 h-5" /> : <HeadphonesIcon className="w-5 h-5" />}
            </button>
        </div>
      )}

      {/* MAIN SELECTION MODAL - Z-INDEX 151 to sit above toggle button */}
      {isMenuOpen && (
          <div className="fixed inset-0 z-[151] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in lg:pl-64" onClick={() => setIsMenuOpen(false)}>
              <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl overflow-y-auto flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']" onClick={e => e.stopPropagation()}>
                  
                  {/* Header */}
                  <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl z-10">
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Select Vibe</h2>
                      <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
                          <XIcon className="w-6 h-6" />
                      </button>
                  </div>

                  <div className="p-6 space-y-8">
                      {/* Grid Presets */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {SPOTIFY_PLAYLISTS.map(pl => (
                              <button
                                  key={pl.id}
                                  onClick={() => handleSelectUrl(pl.url)}
                                  className="relative group overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 hover:border-blue-500/30 dark:hover:border-white/20 transition-all hover:shadow-lg hover:shadow-blue-500/5 dark:hover:shadow-blue-500/10 text-left p-3 flex flex-col justify-between aspect-[4/3]"
                              >
                                  <div className={`w-8 h-8 rounded-full ${pl.color} flex items-center justify-center shadow-md mb-3 group-hover:scale-110 transition-transform`}>
                                      <SpotifyIcon className="w-4 h-4 text-white opacity-90" />
                                  </div>
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white leading-tight">
                                      {pl.name}
                                  </span>
                                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/0 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              </button>
                          ))}
                      </div>

                      {/* Custom Section */}
                      <div>
                          <div className="flex items-center mb-4">
                              <div className="flex-grow h-px bg-slate-200 dark:bg-white/10"></div>
                              <span className="px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Gunakan Playlist Anda</span>
                              <div className="flex-grow h-px bg-slate-200 dark:bg-white/10"></div>
                          </div>

                          <div className="space-y-3">
                              {/* Scan Button */}
                              <button 
                                  onClick={startScanner}
                                  className="w-full flex items-center p-4 rounded-2xl bg-slate-50 hover:bg-white dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-800 dark:hover:from-slate-800 dark:hover:to-slate-700 border border-slate-200 dark:border-white/10 hover:border-blue-500/30 dark:hover:border-blue-500/30 hover:shadow-sm transition-all group"
                              >
                                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors mr-4">
                                      <QrCodeIcon className="w-5 h-5" />
                                  </div>
                                  <div className="text-left flex-grow">
                                      <span className="block font-bold text-slate-800 dark:text-white">Scan Barcode</span>
                                      <span className="text-xs text-slate-500 dark:text-slate-400">Spotify Code atau QR Playlist</span>
                                  </div>
                                  <CameraIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-white transition-colors" />
                              </button>

                              {/* Link Input */}
                              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-white/10 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all flex items-center">
                                  <input 
                                      type="text" 
                                      placeholder="Tempel link playlist Spotify..."
                                      className="bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 px-3 py-2 flex-grow focus:outline-none min-w-0"
                                      value={customLinkInput}
                                      onChange={(e) => setCustomLinkInput(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleCustomLinkSubmit()}
                                  />
                                  <button 
                                      onClick={handleCustomLinkSubmit}
                                      disabled={!customLinkInput.trim()}
                                      className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 text-white rounded-xl font-bold text-xs transition-colors flex-shrink-0"
                                  >
                                      <ArrowRightCircleIcon className="w-5 h-5" />
                                  </button>
                              </div>
                              {linkError && <p className="text-xs text-red-500 dark:text-red-400 ml-2">{linkError}</p>}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* POPUP SCANNER MODAL (SMALL/COMPACT) - Z-INDEX 155 */}
      {isCameraOpen && (
          <div className="fixed inset-0 z-[155] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={stopScanner}>
              <div className="bg-white dark:bg-slate-900 w-full max-w-[320px] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                  {/* Header */}
                  <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                          <QrCodeIcon className="w-4 h-4 text-blue-500" />
                          Pindai Kode Spotify
                      </h3>
                      <button onClick={stopScanner} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                          <XIcon className="w-4 h-4" />
                      </button>
                  </div>

                  {/* Camera Viewfinder */}
                  <div className="relative aspect-square bg-black overflow-hidden">
                      <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover"
                      ></video>
                      
                      {/* Scanning Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-[70%] h-[70%] border-2 border-blue-500/80 rounded-xl shadow-[0_0_0_999px_rgba(0,0,0,0.6)] relative overflow-hidden">
                               {isScanning && (
                                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,1)] animate-scan"></div>
                               )}
                               <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                               <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                               <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                               <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                          </div>
                      </div>
                  </div>

                  {/* Footer / Controls */}
                  <div className="p-5 flex flex-col items-center gap-3 bg-slate-50 dark:bg-slate-900">
                      {scanError ? (
                          <p className="text-xs text-red-500 font-medium text-center bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">{scanError}</p>
                      ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                              Arahkan kamera ke Kode Spotify.
                          </p>
                      )}
                      
                      <button 
                          onClick={captureAndScan}
                          disabled={isScanning}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl px-6 py-2.5 font-bold text-sm flex items-center justify-center w-full shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                      >
                          {isScanning ? (
                              <>
                                <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                                Memproses...
                              </>
                          ) : (
                              <>
                                <CameraIcon className="w-4 h-4 mr-2" />
                                Pindai Sekarang
                              </>
                          )}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Active Player - BOTTOM CENTER - Z-INDEX 145 to sit above Focus Mode (140) */}
      {currentUrl && (
        <div className={`fixed bottom-6 left-0 right-0 ${isFocusMode ? '' : 'lg:left-64'} z-[145] flex justify-center pointer-events-none transition-all duration-500`}>
            <div 
                className={`relative w-[94%] sm:w-[340px] ${isExpanded ? 'h-[450px]' : 'h-[80px]'} bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 group pointer-events-auto transition-all duration-500 ease-in-out animate-fade-in origin-bottom [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']`}
                style={{ colorScheme: 'dark' }} // FORCE DARK SCROLLBARS regardless of app theme
            >
                
                {/* Modern Capsule Controls */}
                <div className="absolute top-2 right-2 z-20 flex items-center">
                    <div className="flex items-center bg-black/40 backdrop-blur-md border border-white/10 rounded-full p-1 shadow-lg transition-all hover:bg-black/60">
                        
                        {/* Toggle Button */}
                        <button
                            onClick={toggleExpand}
                            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors flex items-center justify-center group/btn"
                            title={isExpanded ? "Collapse Player" : "Expand Playlist"}
                            aria-label={isExpanded ? "Collapse Player" : "Expand Playlist"}
                        >
                            {isExpanded ? (
                                <ChevronDownIcon className="w-4 h-4 transition-transform group-hover/btn:translate-y-0.5" />
                            ) : (
                                <ChevronUpIcon className="w-4 h-4 transition-transform group-hover/btn:-translate-y-0.5" />
                            )}
                        </button>

                        {/* Separator */}
                        <div className="w-px h-4 bg-white/20 mx-1"></div>

                        {/* Close Button */}
                        <button
                            onClick={handleClosePlayer}
                            className="p-2 rounded-full hover:bg-red-500/20 text-white/80 hover:text-red-400 transition-colors flex items-center justify-center"
                            title="Close Player"
                            aria-label="Close Player"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <iframe
                    key={refreshKey}
                    src={currentUrl}
                    width="100%"
                    height="100%" 
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="block bg-black"
                    title="Spotify Player"
                    scrolling="no"
                    style={{ border: 0, overflow: 'hidden' }}
                ></iframe>
            </div>
        </div>
      )}
    </>
  );
};

export default MusicPlayer;