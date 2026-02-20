import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin,
    Calendar,
    Sparkles,
    Minus,
    Plus,
    Building2,
    Mountain,
    Flower2,
    Trees,
    Palmtree,
    ShieldCheck,
    Zap,
    Clock,
    ArrowRight,
    Search,
    Star,
    Heart,
    Map as MapIcon,
    Loader2,
    IndianRupee,
    Navigation,
    LocateFixed,
    Users
} from 'lucide-react';
import axios from 'axios';
import MapModal from '../components/MapModal';
import { saveTrip, isFavoritePlace, toggleFavoritePlace } from '../utils/storage';

const FormPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [mapModal, setMapModal] = useState(null); // { placeName, city }
    const [formData, setFormData] = useState({
        destination: '',
        budget: 42500,
        days: 3,
        interests: [],
        adults: 2,
        children: 0,
        travelStyle: 'Comfort'
    });

    // Auto-update destination
    useEffect(() => {
        setFormData(prev => ({ ...prev, destination: searchQuery }));
    }, [searchQuery]);

    const interestOptions = [
        { label: 'Heritage', icon: <Building2 size={24} /> },
        { label: 'Adventure', icon: <Mountain size={24} /> },
        { label: 'Spiritual', icon: <Flower2 size={24} /> },
        { label: 'Nature', icon: <Trees size={24} /> },
        { label: 'Coastal', icon: <Palmtree size={24} /> }
    ];

    const getBudgetLabel = (val) => {
        if (val < 20000) return 'BACKPACKER';
        if (val < 60000) return 'MODERATE';
        return 'LUXURY';
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        setSearching(true);
        try {
            const response = await axios.get(`http://localhost:5002/api/search-places?city=${searchQuery}`);
            setSearchResults(response.data);
            if (response.data.length > 0) {
                setFormData(prev => ({ ...prev, destination: searchQuery }));
            }
        } catch (error) {
            console.error("Search Error:", error);
        } finally {
            setSearching(false);
        }
    };

    const toggleInterest = (interest) => {
        setFormData(prev => ({
            ...prev,
            interests: prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest]
        }));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        console.log("Submitting form with data:", formData);

        if (!formData.destination || formData.destination.trim() === '') {
            alert("Please enter a destination (city name) in the search box above first.");
            return;
        }

        if (formData.interests.length === 0) {
            alert("Please select at least one interest (Heritage, Adventure, etc.)");
            return;
        }

        setLoading(true);
        try {
            console.log("Making API call to backend...");
            const response = await axios.post('http://localhost:5002/api/generate-itinerary', formData);
            console.log("API Success:", response.data);
            saveTrip({ plan: response.data, preferences: formData });
            navigate('/dashboard', { state: { plan: response.data, preferences: formData } });
        } catch (error) {
            console.error("AI Generation Error:", error);
            alert("Error connecting to AI Server. Please make sure the backend is running on port 5002.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen py-10 px-4 md:px-8 bg-[#F8FAFC]">
            {/* Embedded Map Modal */}
            {mapModal && (
                <MapModal
                    placeName={mapModal.placeName}
                    city={mapModal.city}
                    places={mapModal.places}
                    mode={mapModal.mode}
                    onClose={() => setMapModal(null)}
                />
            )}
            <header className="text-center mb-8 md:mb-10 pt-10 lg:pt-0">
                <h1 className="text-2xl md:text-4xl font-extrabold text-[#0F172A] mb-3 leading-tight tracking-tight px-4">Plan Your Real-Time Adventure</h1>
                <p className="text-gray-500 text-base md:text-lg font-medium px-4">Search any city and our AI will fetch the latest attractions for you.</p>
            </header>

            <div className="max-w-5xl mx-auto space-y-8">
                {/* Search Card */}
                <div className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-xl shadow-blue-500/5 border border-[#E2E8F0]">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#94A3B8] transition-colors group-focus-within:text-blue-500" size={20} />
                            <input
                                type="text"
                                placeholder="Search city (e.g. Mumbai, Varanasi, Manali...)"
                                className="w-full pl-12 pr-6 py-4 md:pl-14 md:py-5 rounded-xl md:rounded-2xl border border-[#E2E8F0] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-semibold text-base md:text-lg"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={searching}
                            className="bg-[#2563EB] text-white px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-base md:text-lg shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                            {searching ? <Loader2 className="animate-spin" size={20} /> : "Search Places"}
                        </button>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em] ml-1">Popular Discoveries:</span>
                        {['Goa', 'Manali', 'Varanasi', 'Jaipur', 'Mumbai'].map((city) => (
                            <button
                                key={city}
                                type="button"
                                onClick={() => {
                                    setSearchQuery(city);
                                    setFormData(prev => ({ ...prev, destination: city }));
                                }}
                                className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-[11px] font-bold text-[#64748B] hover:bg-blue-50 hover:border-blue-100 hover:text-blue-600 transition-all active:scale-95"
                            >
                                {city}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-8 pt-8 border-t border-[#F1F5F9]"
                    >
                        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                            <h3 className="text-sm font-black text-[#1E293B] uppercase tracking-widest">Top Attractions in {searchQuery}</h3>
                            <button
                                onClick={() => setMapModal({
                                    placeName: `${searchQuery} Attractions`,
                                    city: searchQuery,
                                    places: searchResults,
                                    mode: 'multi',
                                })}
                                className="bg-[#0F172A] hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest inline-flex items-center gap-2"
                            >
                                <MapIcon size={13} />
                                View Map
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {searchResults.map((place, i) => (
                                <PlaceCard key={i} place={place} city={searchQuery} onViewMap={(p, c) => setMapModal({ placeName: p, city: c, mode: 'route' })} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Preferences Card */}
            <div className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-10 shadow-xl shadow-blue-500/5 border border-[#E2E8F0]">
                <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Days Stepper */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-[#1E293B] uppercase tracking-wider">Duration (Days)</label>
                            <div className="flex items-center bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-1 h-[60px]">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, days: Math.max(1, formData.days - 1) })}
                                    className="w-12 h-12 flex items-center justify-center rounded-xl text-gray-600 hover:bg-white hover:shadow-sm transition-all"
                                >
                                    <Minus size={20} />
                                </button>
                                <div className="flex-1 text-center font-bold text-lg text-[#1E293B]">
                                    {formData.days}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, days: Math.min(10, formData.days + 1) })}
                                    className="w-12 h-12 flex items-center justify-center rounded-xl text-gray-600 hover:bg-white hover:shadow-sm transition-all"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Budget Input */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
                                <IndianRupee size={16} className="text-blue-500" />
                                Total Budget (₹)
                            </label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    className="w-full pl-6 pr-6 py-4 rounded-2xl border border-[#E2E8F0] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-semibold text-lg bg-[#F8FAFC]"
                                    value={formData.budget === 0 ? '' : formData.budget}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, budget: val === '' ? 0 : parseInt(val) });
                                    }}
                                    placeholder="Enter amount (e.g. 50000)"
                                    min="1000"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${getBudgetLabel(formData.budget) === 'LUXURY' ? 'bg-purple-100 text-purple-600' :
                                        getBudgetLabel(formData.budget) === 'MODERATE' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        {getBudgetLabel(formData.budget)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Travelers and Style Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Travelers */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
                                <Users size={16} className="text-blue-500" />
                                Travelers (Adults & Kids)
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-1 h-[60px]">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, adults: Math.max(1, formData.adults - 1) })}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <div className="flex-1 text-center font-bold text-sm text-[#1E293B]">
                                        {formData.adults} Adults
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, adults: formData.adults + 1 })}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                <div className="flex items-center bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-1 h-[60px]">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, children: Math.max(0, formData.children - 1) })}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <div className="flex-1 text-center font-bold text-sm text-[#1E293B]">
                                        {formData.children} Kids
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, children: formData.children + 1 })}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Travel Style */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
                                <Zap size={16} className="text-orange-500" />
                                Travel Style
                            </label>
                            <div className="flex bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-1 h-[60px]">
                                {['Backpacker', 'Comfort', 'Luxury'].map((style) => (
                                    <button
                                        key={style}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, travelStyle: style })}
                                        className={`flex-1 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${formData.travelStyle === style
                                            ? 'bg-white shadow-md text-blue-600'
                                            : 'text-[#94A3B8] hover:text-[#64748B]'
                                            }`}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Interests */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-[#1E293B] uppercase tracking-wider">Interests (Select all that apply)</label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                            {interestOptions.map(opt => (
                                <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => toggleInterest(opt.label)}
                                    className={`flex flex-col items-center justify-center p-4 md:p-6 rounded-[20px] md:rounded-[24px] border-2 transition-all gap-2 md:gap-3 ${formData.interests.includes(opt.label)
                                        ? 'bg-[#F0F7FF] border-[#3B82F6] text-[#2563EB] shadow-lg shadow-blue-500/5 scale-[1.02]'
                                        : 'bg-white border-[#F1F5F9] text-[#64748B] hover:border-[#E2E8F0]'
                                        }`}
                                >
                                    <div className={`${formData.interests.includes(opt.label) ? 'text-[#3B82F6]' : 'text-[#94A3B8]'}`}>
                                        {React.cloneElement(opt.icon, { size: 20 })}
                                    </div>
                                    <span className="text-[12px] md:text-[13px] font-bold tracking-tight">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-[#0F172A] hover:bg-black text-white h-16 md:h-20 rounded-[20px] md:rounded-[24px] flex items-center justify-center gap-4 text-lg md:text-xl font-black transition-all shadow-2xl shadow-black/20 group active:scale-[0.98]"
                    >
                        {loading ? (
                            <div className="flex items-center gap-3">
                                <Loader2 className="animate-spin w-5 h-5 md:w-6 md:h-6" />
                                <span className="text-sm md:text-xl">AI is Crafting Your Trip...</span>
                            </div>
                        ) : (
                            <>
                                <Sparkles className="w-6 h-6 md:w-7 md:h-7" />
                                <span>Create My Smart Itinerary</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Footer Trust Section */}
            <div className="max-w-5xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-[#F1F5F9]">
                    <ShieldCheck className="text-blue-500" size={24} />
                    <div>
                        <h4 className="font-black text-[#1E293B] text-[13px] mb-0.5">Real-Time Data</h4>
                        <p className="text-gray-500 text-[11px] font-medium leading-relaxed">Directly fetched from AI Places engine.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-[#F1F5F9]">
                    <Zap className="text-blue-500" size={24} />
                    <div>
                        <h4 className="font-black text-[#1E293B] text-[13px] mb-0.5">Hyper Personalized</h4>
                        <p className="text-gray-500 text-[11px] font-medium leading-relaxed">No hardcoded static lists.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-[#F1F5F9]">
                    <Clock className="text-blue-500" size={24} />
                    <div>
                        <h4 className="font-black text-[#1E293B] text-[13px] mb-0.5">Always Fresh</h4>
                        <p className="text-gray-500 text-[11px] font-medium leading-relaxed">Latest ratings and trending spots.</p>
                    </div>
                </div>
            </div>

            <footer className="text-center mt-16 pb-10 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                © 2024 Smart Yatra • Real-Time Travel Intelligence
            </footer>
        </div>
    );
};

const PlaceCard = ({ place, city, onViewMap }) => {
    const [imgError, setImgError] = useState(false);
    const [favorite, setFavorite] = useState(() => isFavoritePlace({ ...place, city }));
    const seed = String(place.name || city || 'place').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20);
    const fallback = `https://picsum.photos/seed/${seed || 'travel'}/800/500`;

    return (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] group hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
            {/* Image */}
            <div className="h-36 overflow-hidden bg-gray-100 relative">
                <img
                    src={imgError ? fallback : (place.image || fallback)}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    alt={place.name}
                    loading="lazy"
                />
                {/* Category badge */}
                <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-[#2563EB] text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-blue-100">
                    {place.category || 'Heritage'}
                </span>
            </div>

            {/* Info */}
            <div className="p-4 flex flex-col flex-1 gap-2">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="font-black text-[#0F172A] text-sm leading-tight">{place.name}</h4>
                    <button
                        onClick={() => {
                            const next = toggleFavoritePlace({
                                name: place.name,
                                city,
                                image: place.image,
                                type: place.category,
                                rating: place.rating,
                                description: place.description,
                            });
                            setFavorite(next);
                        }}
                        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${favorite ? 'bg-rose-100 text-rose-500' : 'bg-gray-100 text-gray-400 hover:text-rose-500'}`}
                        title={favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        <Heart size={13} fill={favorite ? 'currentColor' : 'none'} />
                    </button>
                </div>
                <div className="flex items-center gap-1 text-orange-500">
                    <Star size={11} fill="currentColor" />
                    <span className="text-[11px] font-black text-orange-500">{place.rating || '4.5'}</span>
                    <span className="text-[10px] text-gray-400 font-medium ml-1">rating</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 flex-1">{place.description}</p>

                {/* View on Map Button — opens embedded MapModal */}
                <button
                    onClick={() => onViewMap(place.name, city)}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-[#EFF6FF] hover:bg-[#2563EB] text-[#2563EB] hover:text-white border border-blue-200 hover:border-transparent py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 active:scale-95"
                >
                    <MapIcon size={13} />
                    View on Map
                </button>
            </div>
        </div>
    );
};

export default FormPage;

