
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { SocialAccount, SocialPost, SocialPlatform } from '../types';
import TiktokIcon from './icons/TiktokIcon';
import InstagramIcon from './icons/InstagramIcon';
import YoutubeIcon from './icons/YoutubeIcon';
import FacebookIcon from './icons/FacebookIcon';
import XPlatformIcon from './icons/XPlatformIcon';
import PlusIcon from './icons/PlusIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import LoaderIcon from './icons/LoaderIcon';
import ImageIcon from './icons/ImageIcon';
import TrashIcon from './icons/TrashIcon';
import SparklesIcon from './icons/SparklesIcon';
import ClockIcon from './icons/ClockIcon';

// Helpers
const PLATFORMS: { id: SocialPlatform; name: string; icon: React.FC<{ className?: string }>; color: string }[] = [
    { id: 'tiktok', name: 'TikTok', icon: TiktokIcon, color: 'text-black dark:text-white' },
    { id: 'instagram', name: 'Instagram', icon: InstagramIcon, color: 'text-pink-600' },
    { id: 'youtube', name: 'YouTube', icon: YoutubeIcon, color: 'text-red-600' },
    { id: 'facebook', name: 'Facebook', icon: FacebookIcon, color: 'text-blue-600' },
    { id: 'x', name: 'X', icon: XPlatformIcon, color: 'text-black dark:text-white' },
];

const toCamelCase = (obj: any): any => {
    if (!obj) return obj;
    const newObj: any = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        newObj[camelKey] = obj[key];
    }
    return newObj;
};

const SocialMediaView: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'accounts'>('dashboard');
    const [accounts, setAccounts] = useState<SocialAccount[]>([]);
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Create Post State
    const [caption, setCaption] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
    const [scheduledTime, setScheduledTime] = useState('');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Data Fetching ---
    useEffect(() => {
        if (!user) return;
        fetchData();
        
        // Polling untuk simulasi "Posting"
        const interval = setInterval(checkScheduledPosts, 10000); // Cek setiap 10 detik
        return () => clearInterval(interval);
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: accData } = await supabase.from('social_accounts').select('*').eq('user_id', user?.id);
            const { data: postData } = await supabase.from('social_posts').select('*').eq('user_id', user?.id).order('scheduled_time', { ascending: false });
            
            if (accData) setAccounts(accData.map(toCamelCase));
            if (postData) setPosts(postData.map(toCamelCase));
        } catch (e) {
            console.error("Error fetching social data:", e);
        } finally {
            setLoading(false);
        }
    };

    // --- Real OAuth and Publishing Logic ---
    const checkScheduledPosts = async () => {
        const now = new Date();
        const postsToUpdate = posts.filter(p =>
            p.status === 'scheduled' && new Date(p.scheduledTime) <= now
        );

        if (postsToUpdate.length > 0) {
            for (const post of postsToUpdate) {
                // Update local state first for instant feedback
                setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'posting' } : p));

                try {
                    // Call the edge function to publish
                    const { data: session } = await supabase.auth.getSession();
                    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-publish`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.session?.access_token}`,
                        },
                        body: JSON.stringify({ postId: post.id })
                    });

                    const result = await response.json();
                    console.log('Publish result:', result);
                } catch (error) {
                    console.error('Failed to publish:', error);
                    await supabase.from('social_posts').update({
                        status: 'failed',
                        error_message: error instanceof Error ? error.message : 'Unknown error'
                    }).eq('id', post.id);
                }
            }
            fetchData(); // Refresh data
        }
    };

    const handleConnectAccount = async (platform: SocialPlatform) => {
        if (!user) return;

        try {
            // Get OAuth URL from edge function
            const { data: session } = await supabase.auth.getSession();
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-oauth-init`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.session?.access_token}`,
                },
                body: JSON.stringify({ platform })
            });

            const data = await response.json();

            if (data.error) {
                alert(`Error: ${data.error}\n\n${data.instructions || ''}`);
                return;
            }

            if (data.authUrl) {
                // Open OAuth window
                const width = 600;
                const height = 700;
                const left = window.screen.width / 2 - width / 2;
                const top = window.screen.height / 2 - height / 2;

                const authWindow = window.open(
                    data.authUrl,
                    'OAuth',
                    `width=${width},height=${height},left=${left},top=${top}`
                );

                // Listen for OAuth callback
                const handleMessage = (event: MessageEvent) => {
                    if (event.data.type === 'oauth-success' && event.data.platform === platform) {
                        window.removeEventListener('message', handleMessage);
                        fetchData(); // Refresh to show connected account
                    }
                };

                window.addEventListener('message', handleMessage);

                // Cleanup listener after 5 minutes
                setTimeout(() => {
                    window.removeEventListener('message', handleMessage);
                }, 5 * 60 * 1000);
            }
        } catch (error) {
            console.error('OAuth init error:', error);
            alert('Failed to initiate OAuth. Please try again.');
        }
    };

    const handleDisconnectAccount = async (id: string) => {
        await supabase.from('social_accounts').delete().eq('id', id);
        fetchData();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            const url = URL.createObjectURL(file);
            setMediaPreview(url);
        }
    };

    const handleGenerateHashtags = async () => {
        if (!caption.trim()) return;
        setIsGeneratingHashtags(true);
        try {
            // Use Gemini API directly
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gemini-2.5-flash',
                    contents: `Generate 10 trending and relevant hashtags for this social media caption: "${caption}". Return ONLY the hashtags separated by space.`,
                })
            });
            const data = await response.json();
            if (data.text) {
                setCaption(prev => prev + '\n\n' + data.text);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingHashtags(false);
        }
    };

    const handleCreatePost = async () => {
        if (!user || selectedPlatforms.length === 0 || !scheduledTime) return;
        setIsCreating(true);

        try {
            let mediaUrl = null;
            if (mediaFile) {
                const filename = `${user.id}/${Date.now()}_${mediaFile.name}`;
                // Using receipt bucket as temporary storage for demo, ideally creating a 'social_media' bucket
                const { error: uploadError } = await supabase.storage.from('receipts').upload(filename, mediaFile);
                if (!uploadError) {
                    const { data } = supabase.storage.from('receipts').getPublicUrl(filename);
                    mediaUrl = data.publicUrl;
                }
            }

            await supabase.from('social_posts').insert({
                user_id: user.id,
                caption,
                media_url: mediaUrl,
                platforms: selectedPlatforms, // Supabase handles array automatically if column is text[]
                scheduled_time: new Date(scheduledTime).toISOString(),
                status: 'scheduled'
            });

            // Reset form
            setCaption('');
            setMediaFile(null);
            setMediaPreview(null);
            setSelectedPlatforms([]);
            setScheduledTime('');
            setActiveTab('dashboard');
            fetchData();

        } catch (e) {
            console.error("Failed to create post:", e);
            alert("Gagal membuat postingan.");
        } finally {
            setIsCreating(false);
        }
    };

    // --- Sub-Components ---

    const StatusBadge = ({ status }: { status: string }) => {
        const colors = {
            scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            posting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 animate-pulse',
            posted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
            failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        };
        const labels = {
            scheduled: 'Terjadwal',
            posting: 'Memposting...',
            posted: 'Terposting',
            failed: 'Gagal'
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${(colors as any)[status] || colors.scheduled}`}>
                {(labels as any)[status]}
            </span>
        );
    };

    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto pb-24">
            <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-200">Social Hub <span className="text-sm align-top bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 rounded-full ml-2">PREMIUM</span></h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-1">Kelola semua konten media sosial Anda dalam satu tempat.</p>
                </div>
                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'dashboard' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>Dashboard</button>
                    <button onClick={() => setActiveTab('create')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'create' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>Buat Post</button>
                    <button onClick={() => setActiveTab('accounts')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'accounts' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>Akun</button>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-20"><LoaderIcon className="w-10 h-10 animate-spin text-blue-600" /></div>
            ) : (
                <>
                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Terjadwal</p>
                                    <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{posts.filter(p => p.status === 'scheduled').length}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Terposting</p>
                                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{posts.filter(p => p.status === 'posted').length}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Akun Terhubung</p>
                                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{accounts.length}</p>
                                </div>
                            </div>

                            {/* Recent Posts List */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Antrean Konten</h3>
                                    <button onClick={() => setActiveTab('create')} className="text-sm text-blue-600 hover:underline font-semibold">Buat Baru</button>
                                </div>
                                {posts.length === 0 ? (
                                    <div className="p-12 text-center text-slate-500">Belum ada konten terjadwal.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {posts.map(post => (
                                            <div key={post.id} className="p-4 flex flex-col sm:flex-row gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                {/* Thumbnail */}
                                                <div className="w-full sm:w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-lg flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-600">
                                                    {post.mediaUrl ? (
                                                        <img src={post.mediaUrl} alt="Media" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                            <ImageIcon className="w-8 h-8" />
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex gap-2">
                                                            {post.platforms.map(pid => {
                                                                const P = PLATFORMS.find(p => p.id === pid);
                                                                return P ? <P.icon key={pid} className={`w-4 h-4 ${P.color}`} /> : null;
                                                            })}
                                                        </div>
                                                        <StatusBadge status={post.status} />
                                                    </div>
                                                    <p className="text-sm text-slate-800 dark:text-slate-200 line-clamp-2 mb-2 font-medium">{post.caption}</p>
                                                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                                                        <ClockIcon className="w-3 h-3 mr-1" />
                                                        {new Date(post.scheduledTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ACCOUNTS TAB */}
                    {activeTab === 'accounts' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {PLATFORMS.map(platform => {
                                const connectedAccount = accounts.find(a => a.platform === platform.id);
                                return (
                                    <div key={platform.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
                                        <div className={`w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4 ${platform.color}`}>
                                            <platform.icon className="w-8 h-8" />
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{platform.name}</h3>
                                        
                                        {connectedAccount ? (
                                            <>
                                                <p className="text-sm text-green-600 font-medium flex items-center justify-center gap-1 mb-4">
                                                    <CheckCircleIcon className="w-4 h-4" /> Terhubung sebagai @{connectedAccount.username}
                                                </p>
                                                <button 
                                                    onClick={() => handleDisconnectAccount(connectedAccount.id)}
                                                    className="w-full py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    Putuskan
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm text-slate-500 mb-4">Belum terhubung</p>
                                                <button 
                                                    onClick={() => handleConnectAccount(platform.id)}
                                                    className="w-full py-2 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                                                >
                                                    Hubungkan
                                                </button>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* CREATE TAB */}
                    {activeTab === 'create' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left: Form */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Pilih Platform</label>
                                        <div className="flex flex-wrap gap-3">
                                            {PLATFORMS.map(p => {
                                                const isSelected = selectedPlatforms.includes(p.id);
                                                const isConnected = accounts.some(a => a.platform === p.id);
                                                return (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => {
                                                            if (!isConnected) return alert(`Hubungkan akun ${p.name} terlebih dahulu.`);
                                                            setSelectedPlatforms(prev => 
                                                                isSelected ? prev.filter(x => x !== p.id) : [...prev, p.id]
                                                            );
                                                        }}
                                                        disabled={!isConnected}
                                                        className={`flex items-center px-4 py-2 rounded-xl border-2 transition-all ${
                                                            isSelected 
                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                                                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                                        } ${!isConnected ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300'}`}
                                                    >
                                                        <p.icon className={`w-5 h-5 mr-2 ${isSelected ? '' : 'grayscale'}`} />
                                                        <span className="text-sm font-bold">{p.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {accounts.length === 0 && <p className="text-xs text-red-500 mt-2">*Anda belum menghubungkan akun apapun.</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Media</label>
                                        <div 
                                            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {mediaPreview ? (
                                                <div className="relative w-full aspect-video rounded-lg overflow-hidden group">
                                                    <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white font-bold">Ganti Media</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-3">
                                                        <ImageIcon className="w-6 h-6" />
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Klik untuk upload foto/video</p>
                                                    <p className="text-xs text-slate-400 mt-1">PNG, JPG, MP4 (Max 50MB)</p>
                                                </>
                                            )}
                                            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Caption</label>
                                            <button 
                                                onClick={handleGenerateHashtags}
                                                disabled={!caption.trim() || isGeneratingHashtags}
                                                className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center hover:underline disabled:opacity-50"
                                            >
                                                <SparklesIcon className="w-3 h-3 mr-1" />
                                                {isGeneratingHashtags ? 'Memproses...' : 'Generate Hashtags'}
                                            </button>
                                        </div>
                                        <textarea
                                            value={caption}
                                            onChange={e => setCaption(e.target.value)}
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[150px] dark:text-white"
                                            placeholder="Tulis caption menarik..."
                                        ></textarea>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Jadwal Posting</label>
                                        <input 
                                            type="datetime-local" 
                                            value={scheduledTime}
                                            onChange={e => setScheduledTime(e.target.value)}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                                        />
                                    </div>

                                    <button 
                                        onClick={handleCreatePost}
                                        disabled={isCreating || !scheduledTime || selectedPlatforms.length === 0}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center"
                                    >
                                        {isCreating ? <LoaderIcon className="w-5 h-5 animate-spin" /> : 'Jadwalkan Postingan'}
                                    </button>
                                </div>

                                {/* Right: Preview */}
                                <div className="hidden lg:block">
                                    <div className="sticky top-8">
                                        <h3 className="font-bold text-slate-500 dark:text-slate-400 mb-4 text-center uppercase tracking-widest text-xs">Live Preview</h3>
                                        <div className="w-[320px] mx-auto bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-2xl">
                                            {/* Fake Phone UI */}
                                            <div className="bg-slate-100 p-4 border-b flex items-center justify-between">
                                                <div className="w-20 h-4 bg-slate-300 rounded-full"></div>
                                                <div className="w-4 h-4 bg-slate-300 rounded-full"></div>
                                            </div>
                                            <div className="p-4">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                                                    <div>
                                                        <div className="w-24 h-3 bg-slate-200 rounded mb-1"></div>
                                                        <div className="w-12 h-2 bg-slate-100 rounded"></div>
                                                    </div>
                                                </div>
                                                <div className="w-full aspect-square bg-slate-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center text-slate-300">
                                                    {mediaPreview ? (
                                                        <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="w-12 h-12" />
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-sm text-slate-800 whitespace-pre-wrap">
                                                        <span className="font-bold mr-2">username</span>
                                                        {caption || "Caption akan muncul di sini..."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SocialMediaView;