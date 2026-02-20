import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Download,
    Share2,
    MapPin,
    Calendar,
    ChevronRight,
    Map as MapIcon,
    CheckCircle2,
    Clock,
    Sparkles,
    TrendingUp,
    Users,
    ArrowLeft,
    Navigation,
    Heart,
    Sunrise,
    Sun,
    Moon,
    Zap,
    RefreshCw,
    Bed,
    Utensils,
    Briefcase,
    Languages
} from 'lucide-react';

const ReadinessCenter = ({ packingList, localPhrases, destination }) => {
    if ((!packingList || packingList.length === 0) && (!localPhrases || localPhrases.length === 0)) return null;

    return (
        <div className="bg-white rounded-[32px] p-6 border border-[#E2E8F0] shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <Briefcase size={22} />
                </div>
                <h3 className="text-xl font-black text-[#0F172A]">Trip Readiness</h3>
            </div>

            <div className="space-y-6">
                {packingList && packingList.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Crucial Packing List</p>
                        <div className="space-y-2">
                            {packingList.map((p, i) => {
                                const isObj = p && typeof p === 'object' && !Array.isArray(p);
                                const item = isObj ? p.item : p;
                                const category = isObj ? p.category : 'General';
                                const reason = isObj ? p.reason : `Essential for your trip to ${destination}`;

                                return (
                                    <div key={i} className="flex flex-col bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 group/pack transition-all hover:border-blue-100">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-black text-[#0F172A] group-hover/pack:text-blue-600 transition-colors">{item}</span>
                                            <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0 ml-2">
                                                {category}
                                            </span>
                                        </div>
                                        <p className="text-[9px] text-gray-400 leading-tight italic">
                                            {reason}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {localPhrases && localPhrases.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Essential Local Phrases</p>
                        <div className="space-y-3">
                            {localPhrases.map((lp, i) => (
                                <div key={i} className="bg-orange-50/50 p-3 rounded-2xl border border-orange-100/50">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-black text-[#0F172A]">{lp.phrase}</span>
                                        <span className="text-[10px] font-bold text-orange-600 px-2 py-0.5 bg-white rounded-md border border-orange-100">{lp.translation}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 italic">Used for: {lp.usage}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
        </div>
    );
};

import MapModal from '../components/MapModal';
import { getLatestTrip, isFavoritePlace, toggleFavoritePlace } from '../utils/storage';

const ConciergeCard = ({ items, title, icon, color }) => {
    if (!items || items.length === 0) return null;
    return (
        <div className="bg-white rounded-[32px] p-5 border border-[#E2E8F0] shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 ${color.bg} rounded-lg flex items-center justify-center ${color.text}`}>
                    {React.cloneElement(icon, { size: 16 })}
                </div>
                <h3 className="text-sm font-black text-[#0F172A] tracking-tight">{title}</h3>
            </div>
            <div className="space-y-4">
                {items.map((item, idx) => {
                    const seed = String(item.name || 'stay').replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, 10);
                    const fallback = `https://picsum.photos/seed/${seed}/400/300`;
                    return (
                        <div key={idx} className="flex gap-3 group/item">
                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-50 border border-gray-100 italic">
                                <img
                                    src={item.image || fallback}
                                    className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                                    alt={item.name}
                                    onError={(e) => { e.target.src = fallback; }}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[12px] font-bold text-[#0F172A] truncate mb-0.5">{item.name}</h4>
                                {item.price && <p className="text-[9px] font-black text-green-600 mb-1">{item.price}</p>}
                                <p className="text-[10px] text-[#64748B] leading-tight line-clamp-2">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
const FALLBACK_IMAGE = 'https://picsum.photos/seed/indiatravel/800/500';

const toNumber = (val) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
};

const computeTripFinance = (plan) => {
    // If backend provided the data, trust it completely (Even if budget is low)
    if (plan?.totalCost > 0) {
        return {
            totalCost: toNumber(plan.totalCost),
            entryFees: toNumber(plan.entryFees),
            transport: toNumber(plan.transport),
            foodMisc: toNumber(plan.foodMisc),
            totalPlaces: plan.totalPlaces || 0,
        };
    }

    // Fallback logic for legacy or missing data
    const activities = (plan?.itinerary || []).flatMap((day) => {
        if (!day.activities) return [];
        if (Array.isArray(day.activities)) return day.activities;
        return Object.values(day.activities);
    });
    const totalPlaces = activities.length;
    const entryFees = Math.round(
        activities.reduce((sum, activity) => sum + Math.max(0, toNumber(activity?.cost)), 0)
    );

    return {
        totalCost: entryFees + 5000, // Minimal dummy total
        entryFees: entryFees,
        transport: 2000,
        foodMisc: 3000,
        totalPlaces,
    };
};

const DashboardPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const latestTrip = getLatestTrip();
    const { plan, preferences } = location.state || (
        latestTrip
            ? { plan: latestTrip.plan, preferences: latestTrip.preferences }
            : {
                plan: {
                    itinerary: [
                        {
                            day: 1,
                            title: "Royal Forts & Palaces",
                            activities: [
                                { name: "Amber Fort (Amer Fort)", cost: 500, insight: "Experience the stunning blend of Hindu and Mughal architecture. Arrive by 9:00 AM to beat the crowd.", duration: "3 Hours", type: "Heritage", rating: 4.8, image: "https://images.unsplash.com/photo-1590050752117-23a9d7fc2030?auto=format&fit=crop&q=80&w=800" },
                                { name: "Hawa Mahal", cost: 50, insight: "The Palace of Winds is a unique 5-story structure with 953 windows. Best photographed from the street side in morning light.", duration: "1.5 Hours", type: "Heritage", rating: 4.7, image: "https://images.unsplash.com/photo-1599661046289-e318978b3941?auto=format&fit=crop&q=80&w=800" },
                                { name: "City Palace Jaipur", cost: 700, insight: "The royal residence turned museum houses an exquisite collection of royal costumes and armoury. Don't miss the Diwan-i-Khas.", duration: "2 Hours", type: "Heritage", rating: 4.6, image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&q=80&w=800" }
                            ]
                        }
                    ],
                    totalCost: 42500,
                    totalPlaces: 18,
                    entryFees: 8400,
                    transport: 12000,
                    foodMisc: 22100,
                    explanation: "This plan is optimized for a heritage-focused journey through Jaipur."
                },
                preferences: { destination: "Jaipur", days: 3, interests: ["Heritage"], adults: 2, children: 0, travelStyle: 'Comfort' }
            });

    if (!plan || !plan.itinerary) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] gap-4">
                <p className="text-xl font-bold text-[#64748B]">No itinerary data found.</p>
                <button onClick={() => navigate('/plan')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">
                    Go Plan a Trip
                </button>
            </div>
        );
    }

    const numDays = preferences?.days || plan.itinerary.length;
    const destination = preferences?.destination || 'Your Destination';
    const interests = preferences?.interests || [];
    const [mapModal, setMapModal] = useState(null); // { placeName, city, mode }
    const handleViewMap = (placeName, city) => {
        setMapModal({ placeName, city, mode: 'route' });
    };
    const tripFinance = computeTripFinance(plan);
    const allActivities = (plan.itinerary || []).flatMap((day) => {
        if (!day.activities) return [];
        if (Array.isArray(day.activities)) return day.activities;
        return Object.values(day.activities);
    });
    const paidActivities = allActivities.filter((activity) => toNumber(activity?.cost) > 0).length;
    const freeActivities = Math.max(0, allActivities.length - paidActivities);
    const avgActivitiesPerDay = (allActivities.length / Math.max(1, numDays)).toFixed(1);

    const typeCount = allActivities.reduce((acc, activity) => {
        const key = (activity?.type || 'General').trim();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    const dominantType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'mixed';

    const spendParts = [
        { label: 'Entry Fees', value: tripFinance.entryFees, color: '#93C5FD' },
        { label: 'Transport', value: tripFinance.transport, color: '#60A5FA' },
        { label: 'Food & Misc', value: tripFinance.foodMisc, color: '#1D4ED8' },
    ];
    const chartGradient = (() => {
        let offset = 0;
        const total = Math.max(1, tripFinance.totalCost);
        const segments = spendParts.map((part) => {
            const pct = (part.value / total) * 100;
            const start = offset;
            offset += pct;
            return `${part.color} ${start.toFixed(2)}% ${offset.toFixed(2)}%`;
        });
        return `conic-gradient(${segments.join(', ')})`;
    })();

    return (
        <div className="bg-[#F8FAFC] min-h-screen px-4 md:px-8 py-6 md:py-8 print:p-0">
            {/* Print Only Header */}
            <div className="print-header">
                <div className="flex justify-between items-center bg-[#0F172A] p-8 text-white rounded-b-3xl">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter mb-1">SMART YATRA</h1>
                        <p className="text-blue-300 font-bold text-xs uppercase tracking-[0.3em]">Official Trip Itinerary</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold">{destination.toUpperCase()}</p>
                        <p className="text-xs text-blue-200">{numDays} Days • {preferences.adults} Adults</p>
                    </div>
                </div>
            </div>

            {/* Embedded Map Modal */}
            {mapModal && (
                <MapModal
                    placeName={mapModal.placeName}
                    city={mapModal.city || destination}
                    places={mapModal.places}
                    mode={mapModal.mode}
                    onClose={() => setMapModal(null)}
                />
            )}
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-[13px] font-medium text-[#94A3B8] mb-6 no-print pt-12 lg:pt-0">
                <button onClick={() => navigate('/')} className="hover:text-blue-600 transition-colors">Home</button>
                <ChevronRight size={14} />
                <button onClick={() => navigate('/plan')} className="hover:text-blue-600 transition-colors">Plan</button>
                <ChevronRight size={14} />
                <span className="text-[#1E293B] font-semibold truncate max-w-[100px] sm:max-w-none">{destination} Journey</span>
            </nav>

            {/* Header */}
            <div className="flex justify-between items-start mb-10 flex-wrap gap-4 no-print">
                <div>
                    <h1 className="text-[28px] md:text-[36px] font-extrabold text-[#0F172A] mb-3 leading-tight tracking-tight capitalize">
                        Your {destination} Adventure Journey
                    </h1>
                    <div className="flex items-center gap-x-6 gap-y-3 text-[14px] md:text-[15px] font-semibold text-[#64748B] flex-wrap">
                        <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-blue-500" />
                            <span>{numDays}-Day AI Plan</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users size={18} className="text-blue-500" />
                            <span>{preferences.adults}A {preferences.children > 0 && `• ${preferences.children}C`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap size={18} className="text-orange-500" />
                            <span>{preferences.travelStyle}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => navigate('/plan')}
                        className="bg-white hover:bg-gray-50 text-[#0F172A] border border-[#E2E8F0] px-6 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all"
                    >
                        <ArrowLeft size={18} />
                        New Trip
                    </button>
                    <button
                        onClick={() => setMapModal({
                            placeName: `${destination} - Tourist Attractions`,
                            city: destination,
                            places: allActivities.map((activity) => ({ name: activity?.name })).filter((item) => item.name),
                            mode: 'multi',
                        })}
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-xl shadow-blue-500/20 transition-all transform active:scale-95"
                    >
                        <MapIcon size={20} />
                        View Map
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 md:gap-10 items-start print:block">
                {/* Main Content – All Days */}
                <div className="flex-1 space-y-12 pb-20 print:space-y-8">
                    {plan.itinerary.map((day, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            className={`flex gap-8 relative ${idx > 0 ? 'print-break-page' : ''}`}
                        >
                            {/* Timeline Number */}
                            <div className="relative flex-shrink-0">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-[#2563EB] rounded-full flex items-center justify-center text-white font-bold text-base md:text-lg sticky top-20 lg:top-8 z-10 shadow-lg shadow-blue-500/20">
                                    {day.day || idx + 1}
                                </div>
                                {idx !== plan.itinerary.length - 1 && (
                                    <div className="absolute left-1/2 top-10 w-0.5 h-[calc(100%+48px)] bg-[#E2E8F0] -translate-x-1/2 no-print" />
                                )}
                            </div>

                            {/* Day Content */}
                            <div className="flex-1 space-y-6 min-w-0">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <h2 className="text-xl md:text-2xl font-black text-[#0F172A] break-words">
                                        Day {day.day || idx + 1}: {day.title || 'Exploring Wonders'}
                                    </h2>
                                    {idx === 0 && (
                                        <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-orange-100 italic">
                                            Start Here
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-12 relative">
                                    {Array.isArray(day.activities) ? (
                                        day.activities.map((activity, aIdx) => (
                                            <ActivityCard key={aIdx} activity={activity} destination={destination} onViewMap={handleViewMap} />
                                        ))
                                    ) : (
                                        ['morning', 'afternoon', 'evening'].map((slot, sIdx) => {
                                            const activity = day.activities[slot];
                                            if (!activity) return null;

                                            const getSlotConfig = (s) => {
                                                switch (s) {
                                                    case 'morning': return { icon: <Sunrise size={14} />, label: 'Morning', color: 'text-orange-500', bg: 'bg-orange-50' };
                                                    case 'afternoon': return { icon: <Sun size={14} />, label: 'Afternoon', color: 'text-blue-500', bg: 'bg-blue-50' };
                                                    case 'evening': return { icon: <Moon size={14} />, label: 'Evening', color: 'text-indigo-500', bg: 'bg-indigo-50' };
                                                    default: return { icon: <Clock size={14} />, label: 'Activity', color: 'text-gray-500', bg: 'bg-gray-50' };
                                                }
                                            };
                                            const config = getSlotConfig(slot);

                                            return (
                                                <div key={slot} className="space-y-4 relative">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`${config.bg} ${config.color} p-2 rounded-lg`}>
                                                            {config.icon}
                                                        </div>
                                                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${config.color}`}>
                                                            {config.label}
                                                        </span>
                                                        <div className="flex-1 h-[1px] bg-gradient-to-r from-gray-100 to-transparent" />
                                                    </div>
                                                    <ActivityCard activity={activity} destination={destination} onViewMap={handleViewMap} />
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <aside className="w-full lg:w-[360px] space-y-6 lg:sticky lg:top-8 h-fit flex-shrink-0 no-print">
                    {/* Trip Summary */}
                    <div className="bg-[#2563EB] rounded-[32px] p-6 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-xl font-black mb-1">Trip Summary</h3>
                            <p className="text-blue-100 text-[11px] font-medium mb-6">
                                Quick overview of your {numDays}-day journey
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                                    <p className="text-[9px] font-black text-blue-200 uppercase mb-0.5 tracking-wider">TOTAL BUDGET</p>
                                    <p className="text-xl font-black italic">₹{Number(tripFinance.totalCost || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                                    <p className="text-[9px] font-black text-blue-200 uppercase mb-0.5 tracking-wider">TOTAL PLACES</p>
                                    <p className="text-xl font-black italic">{tripFinance.totalPlaces} Sites</p>
                                </div>
                            </div>

                            <div className="bg-white/10 rounded-xl p-4 border border-white/10 mb-4 flex items-center gap-5">
                                <div className="relative w-20 h-20 shrink-0">
                                    <div className="absolute inset-0 rounded-full border-[6px] border-white/5" />
                                    <div
                                        className="absolute inset-0 rounded-full"
                                        style={{
                                            background: chartGradient,
                                            mask: 'radial-gradient(transparent 58%, black 60%)',
                                            WebkitMask: 'radial-gradient(transparent 58%, black 60%)'
                                        }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                                        <TrendingUp size={12} className="text-blue-200 mb-0.5" />
                                        <p className="text-[10px] font-black leading-none">SPLIT</p>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    {spendParts.map((part) => {
                                        const pct = Math.round((part.value / Math.max(1, tripFinance.totalCost)) * 100);
                                        return (
                                            <div key={part.label} className="space-y-1">
                                                <div className="flex items-center justify-between text-[10px] font-black">
                                                    <span className="text-blue-100/60 uppercase tracking-tighter">{part.label}</span>
                                                    <span>{pct === 0 && part.value > 0 ? '<1' : pct}%</span>
                                                </div>
                                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-1000"
                                                        style={{ width: `${pct}%`, backgroundColor: part.color }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="space-y-3 mb-8">
                                <SummaryRow label="Entry Fees" val={tripFinance.entryFees} />
                                <SummaryRow label="Transport (Est.)" val={tripFinance.transport} />
                                <SummaryRow label="Food & Misc" val={tripFinance.foodMisc} />
                            </div>

                            {plan.explanation && (
                                <div className="bg-white/10 rounded-xl p-3 border border-white/10 mb-4">
                                    <p className="text-[11px] text-blue-100 leading-tight italic">"{plan.explanation}"</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="bg-[#0F172A] hover:bg-black py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                                >
                                    <Download size={14} />
                                    PDF
                                </button>
                                <button
                                    onClick={() => {
                                        const text = `Check out my ${numDays}-day AI-planned itinerary for ${destination}! Planned with Smart Yatra.`;
                                        if (navigator.share) {
                                            navigator.share({ title: `${destination} Itinerary`, text });
                                        } else {
                                            navigator.clipboard.writeText(text);
                                            alert('Itinerary link copied to clipboard!');
                                        }
                                    }}
                                    className="bg-white hover:bg-blue-50 text-[#0F172A] py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    <Share2 size={14} />
                                    Share
                                </button>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                    </div>

                    {/* AI Insights */}
                    <div className="bg-white rounded-[32px] p-8 border border-[#E2E8F0] shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                                <Sparkles size={22} />
                            </div>
                            <h3 className="text-xl font-black text-[#0F172A]">AI Insights</h3>
                        </div>

                        <div className="space-y-6">
                            <InsightRow
                                icon={<CheckCircle2 size={18} className="text-[#3B82F6]" />}
                                title="Route Optimized"
                                desc={`Your ${numDays}-day plan averages ${avgActivitiesPerDay} stops/day, helping keep travel time practical and your schedule balanced.`}
                            />
                            <InsightRow
                                icon={<TrendingUp size={18} className="text-orange-500" />}
                                title="Interest Matched"
                                desc={`Most activities align with ${dominantType} experiences in ${destination}${interests.length > 0 ? ` while prioritizing your ${interests.join(', ')} interests.` : '.'}`}
                            />
                            <InsightRow
                                icon={<Users size={18} className="text-green-500" />}
                                title="Budget Smart"
                                desc={`Mix includes ${paidActivities} paid and ${freeActivities} free activities. Entry fees are ${tripFinance.entryFees > 0 && Math.round((tripFinance.entryFees / Math.max(1, tripFinance.totalCost)) * 100) === 0 ? '<1' : Math.round((tripFinance.entryFees / Math.max(1, tripFinance.totalCost)) * 100)}% of the total budget.`}
                            />
                        </div>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                    </div>

                    <ReadinessCenter
                        packingList={plan.packingList}
                        localPhrases={plan.localPhrases}
                        destination={destination}
                    />

                    <ConciergeCard
                        title="Recommended Stays"
                        items={plan.accommodations}
                        icon={<Bed size={20} />}
                        color={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }}
                    />

                    <ConciergeCard
                        title="Local Eats"
                        items={plan.localEats}
                        icon={<Utensils size={20} />}
                        color={{ bg: 'bg-rose-50', text: 'text-rose-600' }}
                    />


                </aside>
            </div>

            <footer className="text-center mt-20 text-xs text-[#94A3B8] font-medium tracking-wide no-print">
                © 2024 Smart Yatra • Crafted with love for Indian Tourism
            </footer>
        </div>
    );
};

const ActivityCard = ({ activity, destination, onViewMap }) => {
    const [imgError, setImgError] = useState(false);
    const [favorite, setFavorite] = useState(() => isFavoritePlace({
        name: activity.name,
        city: destination,
    }));
    const actSeed = String(activity.name || activity.type || 'travel').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20);
    const fallbackImg = `https://picsum.photos/seed/${actSeed || 'travel'}/800/500`;

    return (
        <motion.div
            whileHover={{ x: 6 }}
            className="bg-white rounded-[24px] md:rounded-[28px] p-4 md:p-5 border border-[#F1F5F9] shadow-sm flex flex-col sm:flex-row gap-4 md:gap-5 group hover:border-blue-200 hover:shadow-md transition-all duration-300 print-card"
        >
            <div className="w-full sm:w-44 h-48 sm:h-36 rounded-2xl overflow-hidden shrink-0 bg-gray-100">
                <img
                    src={imgError ? fallbackImg : (activity.image || fallbackImg)}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500"
                    alt={activity.name}
                    loading="lazy"
                />
            </div>
            <div className="flex-1 flex flex-col space-y-3">
                <div className="flex justify-between items-start gap-2">
                    <h4 className="text-lg font-black text-[#0F172A] leading-tight">{activity.name}</h4>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider whitespace-nowrap flex-shrink-0 ${activity.cost === 0 ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                        {activity.cost === 0 ? '🎟 Free Entry' : `₹${Number(activity.cost).toLocaleString('en-IN')}`}
                    </span>
                </div>
                <p className="text-[13px] text-[#64748B] leading-relaxed">
                    <span className="font-bold text-[#3B82F6]">AI Insight: </span>
                    {activity.insight || activity.description || "A must-visit spot in the region."}
                </p>
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100 mt-auto flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5 text-[#94A3B8] font-bold text-[10px] uppercase tracking-wide">
                            <Clock size={13} className="text-[#3B82F6]" />
                            <span>{activity.duration || '2 Hours'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#94A3B8] font-bold text-[10px] uppercase tracking-wide">
                            <MapPin size={13} className="text-[#3B82F6]" />
                            <span>{activity.type || 'Sightseeing'}</span>
                        </div>
                        {activity.rating && (
                            <div className="flex items-center gap-1.5 text-[#94A3B8] font-bold text-[10px] uppercase tracking-wide">
                                <Sparkles size={13} className="text-orange-500" />
                                <span>{activity.rating} ★</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto shrink-0 no-print">
                        <button
                            onClick={() => {
                                const next = toggleFavoritePlace({
                                    name: activity.name,
                                    city: destination,
                                    image: activity.image,
                                    type: activity.type,
                                    rating: activity.rating,
                                    description: activity.insight || activity.description,
                                });
                                setFavorite(next);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${favorite
                                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                : 'bg-gray-100 text-gray-500 border border-transparent hover:text-rose-600'
                                }`}
                        >
                            <Heart size={11} fill={favorite ? 'currentColor' : 'none'} />
                            {favorite ? 'Saved' : 'Favorite'}
                        </button>
                        <button
                            onClick={() => onViewMap(activity.name, destination)}
                            className="flex items-center gap-1.5 bg-[#EFF6FF] hover:bg-[#2563EB] text-[#2563EB] hover:text-white border border-blue-200 hover:border-transparent px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 whitespace-nowrap"
                        >
                            <Navigation size={11} />
                            Get Route
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const SummaryRow = ({ label, val }) => {
    const display = val !== undefined && val !== null
        ? `₹${Number(val).toLocaleString('en-IN')}`
        : '—';
    return (
        <div className="flex justify-between items-center text-sm font-bold border-b border-white/10 pb-2">
            <span className="text-blue-200 font-medium">{label}</span>
            <span className="italic">{display}</span>
        </div>
    );
};

const InsightRow = ({ icon, title, desc }) => (
    <div className="space-y-1.5">
        <div className="flex items-center gap-2">
            {icon}
            <h5 className="font-black text-[#0F172A] text-sm uppercase tracking-tight">{title}:</h5>
        </div>
        <p className="text-[13px] text-[#64748B] leading-relaxed ml-7">{desc}</p>
    </div>
);

export default DashboardPage;

