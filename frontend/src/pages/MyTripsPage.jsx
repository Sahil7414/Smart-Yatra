import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Calendar, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import { getStoredTrips, removeTrip } from '../utils/storage';

const MyTripsPage = () => {
    const navigate = useNavigate();
    const [trips, setTrips] = useState(() => getStoredTrips());
    const hasTrips = trips.length > 0;
    const sortedTrips = useMemo(
        () => [...trips].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        [trips]
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] px-4 md:px-8 py-10 pt-20 lg:pt-10">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">My Trips</p>
                    <h1 className="text-3xl md:text-4xl font-black text-[#0F172A] mt-2">Your Planned Journeys</h1>
                    <p className="text-[#64748B] font-medium mt-3 text-sm md:text-base">
                        This section lists all your generated itineraries with quick reopen support.
                    </p>
                </div>

                {!hasTrips && (
                    <div className="bg-white rounded-[28px] border border-[#E2E8F0] p-10 text-center shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-5">
                            <Briefcase size={28} />
                        </div>
                        <h2 className="text-2xl font-black text-[#0F172A]">No trips saved yet</h2>
                        <p className="text-[#64748B] font-medium mt-2 max-w-xl mx-auto">
                            Create a trip plan and it will appear here automatically.
                        </p>
                        <button
                            onClick={() => navigate('/plan')}
                            className="mt-7 bg-[#0F172A] hover:bg-black text-white px-7 py-3 rounded-2xl font-black inline-flex items-center gap-2"
                        >
                            <Sparkles size={16} />
                            Plan New Trip
                        </button>
                    </div>
                )}

                {hasTrips && (
                    <div className="space-y-4">
                        {sortedTrips.map((trip) => (
                            <div key={trip.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <h3 className="text-xl font-black text-[#0F172A] capitalize">{trip.destination}</h3>
                                        <div className="mt-2 flex items-center gap-4 text-sm text-[#64748B] font-semibold flex-wrap">
                                            <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {trip.days} days</span>
                                            <span>₹{Number(trip.totalCost || 0).toLocaleString('en-IN')}</span>
                                            <span>{trip.totalPlaces || 0} places</span>
                                            <span>{new Date(trip.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => navigate('/dashboard', { state: { plan: trip.plan, preferences: trip.preferences } })}
                                            className="bg-[#0F172A] hover:bg-black text-white px-4 py-2.5 rounded-xl text-sm font-black inline-flex items-center gap-1.5"
                                        >
                                            Open <ArrowRight size={14} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                removeTrip(trip.id);
                                                setTrips(getStoredTrips());
                                            }}
                                            className="bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] px-4 py-2.5 rounded-xl text-sm font-black inline-flex items-center gap-1.5"
                                        >
                                            <Trash2 size={14} /> Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyTripsPage;
