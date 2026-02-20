import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Trash2 } from 'lucide-react';
import { getStoredFavorites, removeFavoritePlace } from '../utils/storage';

const FavoritesPage = () => {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState(() => getStoredFavorites());
    const hasFavorites = favorites.length > 0;

    return (
        <div className="min-h-screen bg-[#F8FAFC] px-4 md:px-8 py-10 pt-20 lg:pt-10">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">Favorites</p>
                    <h1 className="text-3xl md:text-4xl font-black text-[#0F172A] mt-2">Saved Places</h1>
                    <p className="text-[#64748B] font-medium mt-3 text-sm md:text-base">
                        Keep your favorite attractions in one place and reuse them in future itineraries.
                    </p>
                </div>

                {!hasFavorites && (
                    <div className="bg-white rounded-[28px] border border-[#E2E8F0] p-10 text-center shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-5">
                            <Heart size={28} />
                        </div>
                        <h2 className="text-2xl font-black text-[#0F172A]">No favorites yet</h2>
                        <p className="text-[#64748B] font-medium mt-2 max-w-xl mx-auto">
                            Add places from search results or itinerary cards and they will appear here.
                        </p>
                        <button
                            onClick={() => navigate('/plan')}
                            className="mt-7 bg-[#0F172A] hover:bg-black text-white px-7 py-3 rounded-2xl font-black inline-flex items-center gap-2"
                        >
                            <MapPin size={16} />
                            Explore Destinations
                        </button>
                    </div>
                )}

                {hasFavorites && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {favorites.map((place) => (
                            <div key={place.id} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                                <div className="h-40 bg-gray-100">
                                    <img
                                        src={place.image || `https://picsum.photos/seed/${encodeURIComponent(place.name)}/800/500`}
                                        alt={place.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-black text-[#0F172A] leading-tight">{place.name}</h3>
                                            <p className="text-xs text-[#64748B] font-semibold mt-1">{place.city}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                removeFavoritePlace(place.id);
                                                setFavorites(getStoredFavorites());
                                            }}
                                            className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center"
                                            title="Remove favorite"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    {place.description && (
                                        <p className="text-xs text-[#64748B] mt-3 line-clamp-3">{place.description}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FavoritesPage;
