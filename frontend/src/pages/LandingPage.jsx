import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Sparkles,
    ArrowRight,
    ShieldCheck,
    Zap,
    Globe,
    Navigation,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

const INDIAN_ATTRACTIONS = [
    {
        name: 'Gateway of India',
        city: 'Mumbai',
        rating: 4.7,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Gateway_of_India%2C_Mumbai.jpg/1280px-Gateway_of_India%2C_Mumbai.jpg',
        tag: 'Heritage'
    },
    {
        name: 'Taj Mahal',
        city: 'Agra',
        rating: 4.9,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Taj-Mahal.jpg/1280px-Taj-Mahal.jpg',
        tag: 'Wonder'
    },
    {
        name: 'Hawa Mahal',
        city: 'Jaipur',
        rating: 4.7,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Hawa_Mahal_2011.jpg/1280px-Hawa_Mahal_2011.jpg',
        tag: 'Architecture'
    },
    {
        name: 'Mysore Palace',
        city: 'Mysuru',
        rating: 4.8,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Mysore_Palace_Morning.jpg/1280px-Mysore_Palace_Morning.jpg',
        tag: 'Royal'
    },
    {
        name: 'Dal Lake',
        city: 'Srinagar',
        rating: 4.8,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Dal_Lake_Hazratbal_Srinagar.jpg/1280px-Dal_Lake_Hazratbal_Srinagar.jpg',
        tag: 'Scenic'
    },
    {
        name: 'Meenakshi Temple',
        city: 'Madurai',
        rating: 4.8,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Meenakshi_Amman_West_Tower.jpg/1280px-Meenakshi_Amman_West_Tower.jpg',
        tag: 'Spiritual'
    },
];

const LandingPage = () => {
    const navigate = useNavigate();
    const [activeIndex, setActiveIndex] = useState(0);
    const [failedImages, setFailedImages] = useState({});
    const directionRef = useRef(1);
    const maxIndex = INDIAN_ATTRACTIONS.length - 1;

    const fallbackImage = (seed) => {
        const safe = String(seed).replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 24) || 'indiatravel';
        return `https://picsum.photos/seed/${safe}/1400/900`;
    };

    const getCardOffset = (index) => index - activeIndex;

    const nextAttraction = () => {
        setActiveIndex((prev) => {
            if (prev >= maxIndex) {
                directionRef.current = -1;
                return Math.max(0, prev - 1);
            }
            directionRef.current = 1;
            return prev + 1;
        });
    };

    const prevAttraction = () => {
        setActiveIndex((prev) => {
            if (prev <= 0) {
                directionRef.current = 1;
                return Math.min(maxIndex, prev + 1);
            }
            directionRef.current = -1;
            return prev - 1;
        });
    };

    useEffect(() => {
        const id = setInterval(() => {
            setActiveIndex((prev) => {
                const next = prev + directionRef.current;
                if (next > maxIndex) {
                    directionRef.current = -1;
                    return Math.max(0, prev - 1);
                }
                if (next < 0) {
                    directionRef.current = 1;
                    return Math.min(maxIndex, prev + 1);
                }
                return next;
            });
        }, 3200);
        return () => clearInterval(id);
    }, [maxIndex]);

    return (
        <div className="min-h-screen bg-white relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl -mr-64 -mt-64" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl -ml-64 -mb-64" />

            <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-12 md:pt-20 pb-16 flex flex-col items-center text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-widest mb-10 border border-blue-100"
                >
                    <Sparkles size={14} />
                    The Future of Travel Planning
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-[48px] md:text-[80px] font-black text-[#0F172A] leading-[1] md:leading-[0.9] tracking-tighter mb-8 md:mb-10"
                >
                    Don't just travel.<br />
                    Travel <span className="text-blue-600 italic">Smarter.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-xl text-[#64748B] text-lg md:text-xl font-medium leading-relaxed mb-10 md:mb-12"
                >
                    The #1 AI-powered travel assistant that curates the most authentic,
                    efficient, and personalized itineraries for your Indian adventures.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
                >
                    <button
                        onClick={() => navigate('/plan')}
                        className="w-full sm:w-auto bg-[#0F172A] hover:bg-black text-white px-8 md:px-10 py-4 md:py-5 rounded-[20px] md:rounded-[24px] font-black flex items-center justify-center gap-3 transition-all shadow-2xl shadow-black/20 group text-base md:text-lg"
                    >
                        Plan My Adventure
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={() => navigate('/plan')}
                        className="w-full sm:w-auto bg-white hover:bg-gray-50 text-[#0F172A] px-8 md:px-10 py-4 md:py-5 rounded-[20px] md:rounded-[24px] font-black flex items-center justify-center gap-3 transition-all border border-[#E2E8F0] text-base md:text-lg"
                    >
                        View Demo
                    </button>
                </motion.div>

                {/* Interactive India Attractions Slider */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 w-full max-w-6xl"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-left">
                            <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.24em]">Live Attraction Feed</p>
                            <h3 className="text-2xl md:text-3xl font-black text-[#0F172A] mt-2">Top Places Across India</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={prevAttraction}
                                className="w-11 h-11 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] flex items-center justify-center transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={nextAttraction}
                                className="w-11 h-11 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] flex items-center justify-center transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="relative h-[280px] md:h-[350px]" style={{ perspective: '1400px' }}>
                        {INDIAN_ATTRACTIONS.map((place, idx) => {
                            const offset = getCardOffset(idx);
                            const absOffset = Math.abs(offset);
                            const hidden = absOffset > 2;

                            return (
                                <motion.button
                                    key={place.name}
                                    type="button"
                                    onClick={() => setActiveIndex(idx)}
                                    initial={false}
                                    animate={{
                                        x: offset * 230,
                                        scale: offset === 0 ? 1 : 0.88,
                                        rotateY: offset * -18,
                                        rotateZ: offset * 1.2,
                                        opacity: hidden ? 0 : offset === 0 ? 1 : 0.75,
                                        zIndex: 30 - absOffset,
                                    }}
                                    transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                                    className="group absolute left-1/2 top-0 h-[250px] w-[180px] md:h-[320px] md:w-[240px] -translate-x-1/2 rounded-2xl overflow-hidden shadow-2xl text-left"
                                    style={{
                                        transformStyle: 'preserve-3d',
                                        pointerEvents: hidden ? 'none' : 'auto',
                                    }}
                                >
                                    <img
                                        src={failedImages[place.name] ? fallbackImage(place.name) : place.image}
                                        alt={place.name}
                                        className="w-full h-full object-cover"
                                        loading={idx === 0 ? 'eager' : 'lazy'}
                                        onError={() => setFailedImages((prev) => ({ ...prev, [place.name]: true }))}
                                    />
                                    <div className="absolute inset-0 border border-white/60 rounded-2xl" />
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/40 transition-colors duration-300" />
                                    <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 text-white opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                        <h4 className="text-base md:text-xl font-black leading-tight">{place.name}</h4>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>

                </motion.div>

                {/* Features */}
                <div className="mt-20 md:mt-28 grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 w-full max-w-5xl">
                    <LandingFeature icon={<Zap size={24} />} title="Lightning Fast" />
                    <LandingFeature icon={<ShieldCheck size={24} />} title="Verified Data" />
                    <LandingFeature icon={<Globe size={24} />} title="Pan-India Coverage" />
                    <LandingFeature icon={<Navigation size={24} />} title="Smart Route" />
                </div>
            </div>

            <footer className="text-center py-20 border-t border-[#F1F5F9] text-xs font-bold text-[#94A3B8] uppercase tracking-widest">
                Trusted by 50,000+ travelers exploring incredible india
            </footer>
        </div>
    );
};

const LandingFeature = ({ icon, title }) => (
    <div className="flex flex-col items-center gap-4 group">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#F1F5F9] shadow-sm flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300">
            {icon}
        </div>
        <span className="font-black text-[#0F172A] uppercase tracking-tight text-xs">{title}</span>
    </div>
);

export default LandingPage;
