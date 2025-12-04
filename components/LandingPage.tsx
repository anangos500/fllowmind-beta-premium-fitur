
import React, { useState, useEffect } from 'react';
import FlowmindIcon from './icons/FlowmindIcon';
import SparklesIcon from './icons/SparklesIcon';
import ClockIcon from './icons/ClockIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import BarChartIcon from './icons/BarChartIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import MenuIcon from './icons/MenuIcon';
import XIcon from './icons/XIcon';
import WalletIcon from './icons/WalletIcon';
import SparklesBotIcon from './icons/SparklesBotIcon';
import Auth from './Auth';
import { useAuth } from '../contexts/AuthContext';

const LandingPage: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authInfo, setAuthInfo] = useState<{ isOpen: boolean; view: 'login' | 'signup' }>({ isOpen: false, view: 'login' });
  const { session } = useAuth();

  useEffect(() => {
    // Automatically close the auth popover/modal if a session is established
    if (session) {
      setAuthInfo({ isOpen: false, view: 'login' });
    }
  }, [session]);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false); // Close menu on navigation
  };

  const logos = [
    { src: "https://www.dropbox.com/scl/fi/7tubv74bkw6ujxmnzl3e1/2.png?rlkey=par23ypouj7xnaikm1bs56t7h&dl=1", alt: "Logo Inkubator" },
    { src: "https://www.dropbox.com/scl/fi/sj2f9g2u8m53w88kjs7bq/1.png?rlkey=o6iip0s1cxn31r7vds0ln3jc7&dl=1", alt: "Logo Startup Campus" },
    { src: "https://www.dropbox.com/scl/fi/t6r9cwqwqvk8bzpdwce7f/Desain-tanpa-judul-5.png?rlkey=7f2kp8s43tllpsr6akzlw1i2e&st=hn44fxwy&dl=1", alt: "Logo Partner" },
    { src: "https://www.dropbox.com/scl/fi/v0amuroqtl1fv0puuvtxa/logoo-02.png?rlkey=td14f0kgnkaevwmi0qabdkgoh&st=ehaz73kh&dl=1", alt: "Logo Partner 2" },
    { src: "https://www.dropbox.com/scl/fi/kle98vp1cb83iyim2xajz/logoo-01.png?rlkey=8llgpnl1bwsmgyom5zt8nm2n1&st=1a4huhzj&dl=1", alt: "Logo Partner 3" },
  ];
  
  // Gandakan logo secukupnya untuk gulir mulus (6x sudah cukup panjang untuk layar lebar tanpa beban berlebih)
  const scrollingLogos = [...logos, ...logos, ...logos, ...logos, ...logos, ...logos];


  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen font-sans overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-slate-50/80 backdrop-blur-md z-50 animate-fade-in">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <FlowmindIcon className="w-8 h-8 text-[#2563eb]" />
            <div className="flex items-baseline">
              <span className="text-2xl font-bold">Flowmind</span>
              <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold tracking-wider text-[#2563eb] bg-blue-100 rounded-md">beta</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex items-center space-x-6">
              <button onClick={() => scrollTo('features')} className="font-semibold text-slate-600 hover:text-blue-600 transition-colors">Fitur</button>
              <button onClick={() => scrollTo('testimonials')} className="font-semibold text-slate-600 hover:text-blue-600 transition-colors">Testimoni</button>
              <button onClick={() => scrollTo('security')} className="font-semibold text-slate-600 hover:text-blue-600 transition-colors">Keamanan & Privasi</button>
            </nav>
            <div className="hidden md:block w-px h-6 bg-slate-300"></div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => setAuthInfo({ isOpen: true, view: 'login' })}
                    className="px-4 py-2 text-sm font-semibold text-blue-600 rounded-lg hover:bg-blue-100/50 transition-colors"
                >
                    Masuk
                </button>
                 <button
                    onClick={() => setAuthInfo({ isOpen: true, view: 'signup' })}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    Daftar
                </button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-20 sm:pt-24 pb-20 bg-white animate-fade-in">
          <div className="container mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.15] md:leading-[1.15] lg:leading-[1.15] text-slate-900">
                Atur Hari Anda, Raih Tujuan Anda dengan <span className="text-blue-600">Asisten AI</span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0">
                Flowmind adalah perencana cerdas yang membantu Anda fokus, mengatur alur kerja, mengelola keuangan, dan mencapai momentum pada tujuan Anda.
              </p>
              <button
                onClick={() => setAuthInfo({ isOpen: true, view: 'signup' })}
                className="mt-12 px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-lg transform hover:scale-105"
              >
                Mulai Sekarang
              </button>
            </div>
            
            {/* Hero Visuals */}
            <div className="hidden lg:block relative w-full max-w-lg mx-auto lg:ml-auto">
                {/* Decorative BG elements */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl"></div>

                {/* Main Task Card - Matches Screenshot */}
                <div className="relative z-20 bg-white/60 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.12)] border border-white/50 transform transition-transform hover:scale-[1.01] duration-500">
                    <div className="flex items-center mb-6">
                        <div className="bg-white p-2.5 rounded-xl shadow-sm mr-4 border border-slate-100">
                             <SparklesIcon className="w-6 h-6 text-blue-600"/>
                        </div>
                        <p className="font-bold text-lg text-slate-800">Tambah Tugas dengan AI</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 mb-4">
                        <p className="text-slate-500 text-base">Rapat dengan tim desain besok jam 2 siang</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 flex items-center transform translate-x-2">
                        <div className="flex-shrink-0 bg-green-100 p-2 rounded-full mr-4">
                             <CheckCircleIcon className="w-5 h-5 text-green-600"/>
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-base">Rapat Tim Desain</p>
                            <p className="text-slate-500 text-sm font-medium">Besok, 14:00 - 15:00</p>
                        </div>
                    </div>
                </div>

                {/* Finance Visual - New Feature */}
                <div className="absolute -bottom-10 -right-10 z-30 bg-white p-5 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-slate-100 w-72 transform rotate-3 hover:rotate-0 transition-all duration-500">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
                        <div className="flex items-center">
                            <div className="bg-teal-50 p-2 rounded-lg mr-3">
                                <WalletIcon className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-slate-800">Keuangan</p>
                                <p className="text-[10px] text-slate-500">Baru saja</p>
                            </div>
                        </div>
                        <div className="text-[10px] font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                            Scan Struk
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-slate-800 text-base">Makan Siang</p>
                            <p className="text-xs text-slate-500">Makanan</p>
                        </div>
                        <p className="font-bold text-red-500 text-lg">- Rp 25.000</p>
                    </div>
                </div>
            </div>
          </div>
          
          {/* Social Proof Section */}
           <div className="container mx-auto px-4 sm:px-6 text-center mt-24">
            <p className="text-sm font-semibold text-slate-500 tracking-wider mb-8">
              Supported by
            </p>
            <div className="relative w-full overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-1/4 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
              <div className="absolute right-0 top-0 h-full w-1/4 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
              <div className="w-full inline-flex flex-nowrap">
                  <ul className="flex items-center justify-center md:justify-start [&_li]:mx-8 sm:[&_li]:mx-12 animate-infinite-scroll will-change-transform">
                    {scrollingLogos.map((logo, index) => (
                      <li key={`a-${index}`}>
                        <img src={logo.src} alt={logo.alt} className="h-16 sm:h-20 md:h-24 max-w-none" />
                      </li>
                    ))}
                  </ul>
                  <ul className="flex items-center justify-center md:justify-start [&_li]:mx-8 sm:[&_li]:mx-12 animate-infinite-scroll will-change-transform" aria-hidden="true">
                    {scrollingLogos.map((logo, index) => (
                      <li key={`b-${index}`}>
                        <img src={logo.src} alt={logo.alt} className="h-16 sm:h-20 md:h-24 max-w-none" />
                      </li>
                    ))}
                  </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 animate-fade-in [animation-delay:200ms]">
          <div className="container mx-auto px-4 sm:px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900">
              Fitur Unggulan Flowmind
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature Cards */}
              {[
                { icon: <SparklesIcon className="w-8 h-8 text-blue-600" />, title: "Penjadwalan AI", description: "Tambahkan tugas menggunakan bahasa alami. AI kami akan memahaminya dan menjadwalkannya untuk Anda." },
                { icon: <ClockIcon className="w-8 h-8 text-green-600" />, title: "Mode Fokus", description: "Gunakan teknik Pomodoro untuk tetap fokus pada tugas Anda tanpa gangguan." },
                { icon: <WalletIcon className="w-8 h-8 text-teal-600" />, title: "Manajemen Keuangan", description: "Pantau pemasukan dan pengeluaran dengan mudah. Gunakan fitur scan struk berbasis AI untuk pencatatan otomatis." },
                { icon: <BookOpenIcon className="w-8 h-8 text-purple-600" />, title: "Jurnal Harian", description: "Refleksikan kemajuan Anda setiap hari. Sistem akan otomatis merangkum tugas dan keuangan Anda dalam format PDF." },
                { icon: <BarChartIcon className="w-8 h-8 text-amber-600" />, title: "Tinjauan Produktivitas", description: "Lihat statistik dan kalender mingguan/bulanan untuk melacak kemajuan dan konsistensi Anda." },
                { icon: <SparklesBotIcon className="w-8 h-8 text-indigo-600" />, title: "Asisten Cerdas", description: "Flowie siap membantu menjawab pertanyaan tentang fitur aplikasi dan memberikan tips produktivitas." },
              ].map((feature, index) => (
                <div key={index} className="bg-white p-8 rounded-xl shadow-md text-center transform hover:-translate-y-2 transition-transform duration-300">
                  <div className="inline-block p-4 bg-slate-100 rounded-full mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-slate-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Testimonial Section */}
        <section id="testimonials" className="py-20 bg-white animate-fade-in [animation-delay:400ms]">
            <div className="container mx-auto px-4 sm:px-6">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900">
                    Apa Kata Pengguna Kami
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <div className="bg-slate-50 p-8 rounded-xl">
                        <p className="italic text-slate-600 mb-4">"Flowmind benar-benar mengubah cara saya bekerja. Fitur penjadwalan AI-nya sangat menghemat waktu dan mode fokus membantu saya menyelesaikan lebih banyak pekerjaan."</p>
                        <p className="font-bold text-slate-800">- Sarah L., Freelance Designer</p>
                    </div>
                     <div className="bg-slate-50 p-8 rounded-xl">
                        <p className="italic text-slate-600 mb-4">"Saya suka fitur jurnalnya. Sangat membantu untuk merefleksikan hari saya dan melihat semua yang telah saya capai. Sangat memotivasi!"</p>
                        <p className="font-bold text-slate-800">- Budi S., Project Manager</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Security Section */}
        <section id="security" className="py-20 bg-white animate-fade-in [animation-delay:500ms]">
          <div className="container mx-auto px-4 sm:px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900">
              Keamanan & Privasi Anda Adalah Prioritas Kami
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 max-w-4xl mx-auto">
              {[
                { icon: <CheckCircleIcon className="w-8 h-8 text-green-600" />, title: "Enkripsi Data", description: "Semua data tugas dan jurnal Anda dienkripsi saat transit dan saat disimpan, menjaga informasi Anda tetap aman." },
                { icon: <CheckCircleIcon className="w-8 h-8 text-green-600" />, title: "Kebijakan Privasi Transparan", description: "Kami berkomitmen pada privasi Anda. Kami tidak akan pernah menjual data Anda kepada pihak ketiga." },
                { icon: <CheckCircleIcon className="w-8 h-8 text-green-600" />, title: "Otentikasi Aman", description: "Akun Anda dilindungi dengan metode otentikasi yang aman dan terpercaya untuk mencegah akses tidak sah." },
                { icon: <CheckCircleIcon className="w-8 h-8 text-green-600" />, title: "Kontrol Penuh di Tangan Anda", description: "Anda memiliki kendali penuh atas data Anda, termasuk kemampuan untuk menghapus akun dan semua informasi terkait kapan saja." },
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                    <p className="text-slate-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-white"></section>

        {/* CTA Section */}
        <section className="py-20 bg-blue-500 text-white animate-fade-in [animation-delay:600ms]">
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Siap untuk Meningkatkan Produktivitas Anda?
            </h2>
            <button
              onClick={() => setAuthInfo({ isOpen: true, view: 'signup' })}
              className="px-8 py-4 text-lg font-semibold bg-white text-blue-600 rounded-lg hover:bg-slate-100 transition-colors shadow-lg transform hover:scale-105"
            >
              Daftar Gratis
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-blue-50 py-12">
        <div className="container mx-auto px-4 sm:px-6 text-center text-slate-500">
          <p className="mb-4">Ikuti Sosial Media Kami</p>
          <div className="flex justify-center items-center space-x-6 mb-4">
            <a href="https://www.tiktok.com/@aos_2110" target="_blank" rel="noopener noreferrer" aria-label="Tiktok" className="hover:text-blue-600 transition-colors">
              <img src="https://www.dropbox.com/scl/fi/xyhz3w79ne4idro388k72/Pogo-03.png?rlkey=gwkcy95hl4irnm05w17e9kucw&st=27er5s0s&dl=1" alt="Tiktok" className="w-6 h-6" />
            </a>
            <a href="https://www.threads.net/@aospheree.ai" target="_blank" rel="noopener noreferrer" aria-label="Threads" className="hover:text-blue-600 transition-colors">
              <img src="https://www.dropbox.com/scl/fi/yijukvk6bofzdcteoy0yt/Pogo-01.png?rlkey=wma1e95nrz093hoouk8zmjwoc&st=mcfm7067&dl=1" alt="Threads" className="w-6 h-6" />
            </a>
            <a href="https://www.instagram.com/aospheree.ai/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-blue-600 transition-colors">
              <img src="https://www.dropbox.com/scl/fi/9rs0e13fab5tfnbh09v2u/Pogo-02.png?rlkey=d2ac4c1p9973c2zrlei9cddhs&st=944tagxf&dl=1" alt="Instagram" className="w-6 h-6" />
            </a>
          </div>
          <p>&copy; {new Date().getFullYear()} Flowmind by Aospheree.ai. All rights reserved.</p>
        </div>
      </footer>
      {authInfo.isOpen && <Auth initialView={authInfo.view} onClose={() => setAuthInfo({ isOpen: false, view: 'login' })} />}
    </div>
  );
};

export default LandingPage;
