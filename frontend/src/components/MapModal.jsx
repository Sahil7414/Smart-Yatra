import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Navigation, Loader2, AlertCircle } from 'lucide-react';

let leafletCssInjected = false;
const injectLeafletCSS = () => {
    if (leafletCssInjected) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    leafletCssInjected = true;
};

const geocode = async (query) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=in`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
    }
    return null;
};

const getRoute = async (from, to) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const dist = (data.routes[0].distance / 1000).toFixed(1);
        const dur = Math.round(data.routes[0].duration / 60);
        return { coords, distance: dist, duration: dur };
    }
    return null;
};

const MapModal = ({ placeName, city, places, mode = 'route', onClose }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const [status, setStatus] = useState('loading');
    const [info, setInfo] = useState(null);
    const [locating, setLocating] = useState(true);
    const [retrySeed, setRetrySeed] = useState(0);
    const [highlightedCount, setHighlightedCount] = useState(0);

    const normalizedPlaces = useMemo(
        () => (Array.isArray(places) ? places : []),
        [places]
    );
    const placesSignature = useMemo(
        () => normalizedPlaces.map((p) => (typeof p === 'string' ? p : p?.name || '')).join('|'),
        [normalizedPlaces]
    );
    const multiPlaceMode = mode === 'multi' || (normalizedPlaces.length > 1 && mode !== 'route');
    const title = multiPlaceMode ? `${city} Attractions` : placeName;
    const requestedPlaceCount = multiPlaceMode ? normalizedPlaces.length : 0;

    useEffect(() => {
        injectLeafletCSS();

        let L;
        let isMounted = true;

        const initMap = async () => {
            L = (await import('leaflet')).default;

            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            if (!mapContainerRef.current || !isMounted) return;

            const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);
            mapRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
            }).addTo(map);

            const destIcon = L.divIcon({
                html: `<div style="background:#2563EB;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 14px rgba(37,99,235,0.5)"></div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 36],
                className: '',
            });

            const userIcon = L.divIcon({
                html: `<div style="background:#16a34a;width:22px;height:22px;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 14px rgba(22,163,74,0.5);animation:pulse 2s infinite"></div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11],
                className: '',
            });

            setStatus('loading');
            setInfo(null);
            setHighlightedCount(0);

            if (multiPlaceMode) {
                setLocating(false);

                const names = normalizedPlaces
                    .map((p) => (typeof p === 'string' ? p : p?.name))
                    .filter(Boolean)
                    .filter((name, index, arr) => arr.indexOf(name) === index)
                    .slice(0, 12);

                const pointsRaw = await Promise.all(
                    names.map(async (name) => {
                        const point = await geocode(`${name}, ${city}, India`);
                        return point ? { ...point, name } : null;
                    })
                );

                const points = pointsRaw.filter(Boolean);
                if (!points.length || !isMounted) {
                    setStatus('error');
                    return;
                }

                const createNumberedIcon = (num) => L.divIcon({
                    html: `<div style="width:30px;height:30px;border-radius:50%;background:#2563EB;color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 3px 10px rgba(37,99,235,0.4)">${num}</div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                    className: '',
                });

                points.forEach((point, idx) => {
                    L.marker([point.lat, point.lng], { icon: createNumberedIcon(idx + 1) })
                        .addTo(map)
                        .bindPopup(
                            `<div style="font-family:system-ui;padding:6px"><strong style="color:#1e40af;font-size:14px">${idx + 1}. ${point.name}</strong><br/><span style="color:#64748b;font-size:12px">${city}, India</span></div>`,
                            { maxWidth: 220 }
                        );
                });

                if (points.length > 1) {
                    L.polyline(
                        points.map((p) => [p.lat, p.lng]),
                        {
                            color: '#60A5FA',
                            weight: 3,
                            opacity: 0.9,
                            dashArray: '6 8',
                            lineCap: 'round',
                            lineJoin: 'round',
                        }
                    ).addTo(map);
                }

                if (points.length === 1) {
                    map.setView([points[0].lat, points[0].lng], 14);
                } else {
                    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
                    map.fitBounds(bounds, { padding: [70, 70] });
                }

                setHighlightedCount(points.length);
                setStatus('ready');
                return;
            }

            const destCoords = await geocode(`${placeName}, ${city}, India`);
            if (!destCoords || !isMounted) {
                setStatus('error');
                return;
            }

            const destMarker = L.marker([destCoords.lat, destCoords.lng], { icon: destIcon })
                .addTo(map)
                .bindPopup(
                    `<div style="font-family:system-ui;padding:6px"><strong style="color:#1e40af;font-size:14px">${placeName}</strong><br/><span style="color:#64748b;font-size:12px">${city}, India</span></div>`,
                    { maxWidth: 200 }
                );

            map.setView([destCoords.lat, destCoords.lng], 14);
            destMarker.openPopup();
            setStatus('ready');
            setHighlightedCount(1);

            const drawRouteFrom = async (startCoords, sourceLabel = 'Your Location') => {
                L.marker([startCoords.lat, startCoords.lng], { icon: userIcon })
                    .addTo(map)
                    .bindPopup(`<div style="font-family:system-ui;padding:4px"><strong style="color:#15803d">${sourceLabel}</strong></div>`)
                    .openPopup();

                try {
                    const route = await getRoute(startCoords, destCoords);
                    if (route && isMounted) {
                        L.polyline(route.coords, {
                            color: '#2563EB',
                            weight: 5,
                            opacity: 0.85,
                            lineCap: 'round',
                            lineJoin: 'round',
                        }).addTo(map);

                        const bounds = L.latLngBounds(
                            [startCoords.lat, startCoords.lng],
                            [destCoords.lat, destCoords.lng]
                        );
                        map.fitBounds(bounds, { padding: [60, 60] });
                        setInfo({ distance: route.distance, duration: route.duration });
                        return;
                    }
                } catch (e) {
                    console.warn('Routing failed:', e);
                }

                if (!isMounted) return;
                L.polyline(
                    [
                        [startCoords.lat, startCoords.lng],
                        [destCoords.lat, destCoords.lng],
                    ],
                    {
                        color: '#2563EB',
                        weight: 4,
                        opacity: 0.7,
                        dashArray: '8 8',
                    }
                ).addTo(map);
                const bounds = L.latLngBounds(
                    [startCoords.lat, startCoords.lng],
                    [destCoords.lat, destCoords.lng]
                );
                map.fitBounds(bounds, { padding: [60, 60] });
            };

            const fallbackToCityCenter = async () => {
                const cityCenter = await geocode(`${city}, India`);
                if (!cityCenter || !isMounted) return;
                await drawRouteFrom(
                    { lat: cityCenter.lat, lng: cityCenter.lng },
                    `City Center (${city})`
                );
            };

            if (!navigator.geolocation) {
                await fallbackToCityCenter();
                setLocating(false);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    if (!isMounted) return;
                    const userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };

                    await drawRouteFrom(userCoords, 'Your Location');

                    setLocating(false);
                },
                async () => {
                    await fallbackToCityCenter();
                    setLocating(false);
                },
                { timeout: 8000 }
            );
        };

        initMap().catch((e) => {
            console.error('Map init error:', e);
            if (isMounted) setStatus('error');
        });

        return () => {
            isMounted = false;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [placeName, city, retrySeed, multiPlaceMode, placesSignature]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="bg-white rounded-2xl md:rounded-3xl overflow-hidden flex flex-col"
                style={{ width: '95vw', maxWidth: 1000, height: '90vh', maxHeight: '90vh', boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}
            >
                <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 bg-white shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                            <Navigation size={16} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-[#0F172A] text-sm md:text-base leading-tight truncate break-words">{title}</h3>
                            <p className="text-[10px] md:text-[12px] text-gray-400 font-medium truncate">{city}, India</p>
                        </div>
                    </div>

                    {!multiPlaceMode && info && (
                        <div className="flex items-center gap-2 md:gap-4 bg-blue-50 border border-blue-100 rounded-xl md:rounded-2xl px-2 md:px-4 py-1.5 md:py-2 mx-2">
                            <div className="text-center">
                                <p className="hidden sm:block text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest">Dist</p>
                                <p className="text-[11px] md:text-sm font-black text-blue-600">{info.distance}km</p>
                            </div>
                            <div className="w-px h-6 md:h-8 bg-blue-200" />
                            <div className="text-center">
                                <p className="hidden sm:block text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest">Time</p>
                                <p className="text-[11px] md:text-sm font-black text-blue-600">
                                    {info.duration >= 60 ? `${Math.floor(info.duration / 60)}h${info.duration % 60}m` : `${info.duration}m`}
                                </p>
                            </div>
                        </div>
                    )}
                    {multiPlaceMode && status === 'ready' && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl md:rounded-2xl px-3 md:px-4 py-1.5 md:py-2 mx-2">
                            <p className="hidden sm:block text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest">Places</p>
                            <p className="text-[11px] md:text-sm font-black text-blue-600">{highlightedCount}</p>
                        </div>
                    )}

                    <div className="flex items-center gap-2 md:gap-3">
                        {!multiPlaceMode && locating && status === 'ready' && (
                            <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400 font-medium">
                                <Loader2 size={13} className="animate-spin text-blue-500" />
                                <span>Locating...</span>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-6 px-6 py-2 bg-gray-50 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 font-semibold">
                        <div className="w-3 h-3 rounded-full bg-blue-600" />
                        {multiPlaceMode ? 'Attraction Spot' : 'Destination'}
                    </div>
                    {multiPlaceMode && (
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-semibold">
                            <div className="w-8 h-1 rounded-full bg-blue-400" />
                            Attraction Flow
                        </div>
                    )}
                    {!multiPlaceMode && (
                        <>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-semibold">
                                <div className="w-3 h-3 rounded-full bg-green-600" />
                                Your Location
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-semibold">
                                <div className="w-8 h-1 rounded-full bg-blue-600" />
                                Route
                            </div>
                        </>
                    )}
                    <div className="ml-auto text-[11px] text-gray-400">Powered by OpenStreetMap</div>
                </div>

                <div className="relative flex-1">
                    {status === 'loading' && (
                        <div className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                                <Loader2 size={28} className="animate-spin text-blue-500" />
                            </div>
                            <p className="text-sm font-semibold text-gray-500">
                                {multiPlaceMode
                                    ? `Finding attractions in ${city} (${requestedPlaceCount} requested)...`
                                    : `Finding ${placeName}...`}
                            </p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center gap-3 p-8">
                            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                                <AlertCircle size={28} className="text-red-400" />
                            </div>
                            <p className="text-base font-black text-gray-700">Location not found</p>
                            <p className="text-sm text-gray-400 text-center">
                                {multiPlaceMode
                                    ? `Could not find attraction coordinates for ${city}. Retry with another city.`
                                    : `Could not find "${placeName}" on the map. Retry search or try another attraction.`}
                            </p>
                            <button
                                onClick={() => {
                                    setInfo(null);
                                    setLocating(true);
                                    setStatus('loading');
                                    setRetrySeed((prev) => prev + 1);
                                }}
                                className="mt-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                            >
                                Retry in app
                            </button>
                        </div>
                    )}

                    <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.4); opacity: 0.7; }
                }
            `}</style>
        </div>
    );
};

export default MapModal;
