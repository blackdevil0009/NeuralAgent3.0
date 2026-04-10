/**
 * LocationPicker – Google Places Autocomplete with Nominatim fallback
 *
 * Props:
 *  id          – DOM id for accessibility
 *  placeholder – input placeholder
 *  value       – current display value
 *  onSelect    – callback({ address, city, state, pincode, lat, lng, formatted })
 *  onChange    – plain text change (when user types without selecting)
 *  error       – error string to show below
 *  style       – pass-through style object for the wrapper
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';

const GOOGLE_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || '';

let scriptLoaded = false;
let loadCallbacks = [];

function loadGoogleMaps(callback) {
    if (window.google && window.google.maps && window.google.maps.places) {
        callback();
        return;
    }
    loadCallbacks.push(callback);
    if (scriptLoaded) return;
    scriptLoaded = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => loadCallbacks.forEach(cb => cb());
    document.head.appendChild(script);
}

/* Nominatim (OpenStreetMap) – free, no key needed */
async function nominatimSearch(query) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=in&format=json&addressdetails=1&limit=5`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    return data.map(r => ({
        label: r.display_name,
        address: [r.address.road, r.address.suburb, r.address.neighbourhood].filter(Boolean).join(', '),
        city: r.address.city || r.address.town || r.address.village || r.address.county || '',
        state: r.address.state || '',
        pincode: r.address.postcode || '',
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        formatted: r.display_name,
    }));
}

export default function LocationPicker({ id, placeholder, value, onSelect, onChange, error, style }) {
    const inputRef = useRef(null);
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [open, setOpen] = useState(false);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [useGoogle, setUseGoogle] = useState(false);
    const debounceRef = useRef(null);
    const autocompleteRef = useRef(null);
    const wrapperRef = useRef(null);

    // Sync external value
    useEffect(() => { setQuery(value || ''); }, [value]);

    // Try to load Google Maps
    useEffect(() => {
        if (!GOOGLE_KEY) return;
        loadGoogleMaps(() => setUseGoogle(true));
    }, []);

    // Setup Google Autocomplete once Google is ready
    useEffect(() => {
        if (!useGoogle || !inputRef.current) return;
        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: 'in' },
            fields: ['address_components', 'formatted_address', 'geometry'],
        });
        autocompleteRef.current = ac;
        ac.addListener('place_changed', () => {
            const place = ac.getPlace();
            if (!place.geometry) return;
            const comp = {};
            place.address_components.forEach(c => {
                if (c.types.includes('route')) comp.route = c.long_name;
                if (c.types.includes('sublocality') || c.types.includes('neighborhood')) comp.sublocality = c.long_name;
                if (c.types.includes('locality')) comp.city = c.long_name;
                if (c.types.includes('administrative_area_level_1')) comp.state = c.long_name;
                if (c.types.includes('postal_code')) comp.pincode = c.long_name;
            });
            const formatted = place.formatted_address || '';
            const address = [comp.route, comp.sublocality].filter(Boolean).join(', ');
            setQuery(formatted);
            setSuggestions([]);
            setOpen(false);
            onSelect({ address: address || formatted, city: comp.city || '', state: comp.state || '', pincode: comp.pincode || '', lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), formatted });
        });
        return () => window.google?.maps?.event?.clearInstanceListeners(ac);
    }, [useGoogle, onSelect]);

    // Nominatim search (only if no Google)
    const nominatimSuggest = useCallback((val) => {
        if (useGoogle || val.length < 4) { setSuggestions([]); return; }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoadingSearch(true);
            try {
                const res = await nominatimSearch(val);
                setSuggestions(res);
                setOpen(res.length > 0);
            } catch { setSuggestions([]); }
            finally { setLoadingSearch(false); }
        }, 500);
    }, [useGoogle]);

    const handleInput = (e) => {
        const val = e.target.value;
        setQuery(val);
        onChange?.(val);
        nominatimSuggest(val);
    };

    const handleSelect = (s) => {
        setQuery(s.formatted);
        setSuggestions([]);
        setOpen(false);
        onSelect(s);
    };

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (!wrapperRef.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={wrapperRef} style={{ position: 'relative', ...style }}>
            <div style={{ position: 'relative' }}>
                <input
                    id={id}
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInput}
                    onFocus={() => suggestions.length > 0 && setOpen(true)}
                    placeholder={placeholder || '🔍 Search location…'}
                    aria-invalid={!!error}
                    autoComplete="off"
                    style={{
                        width: '100%', boxSizing: 'border-box',
                        paddingRight: 36,
                        border: `1.5px solid ${error ? '#e74c3c' : '#dde'}`,
                        borderRadius: 8, padding: '10px 36px 10px 14px',
                        fontSize: '0.93rem', outline: 'none',
                        background: '#fff',
                    }}
                />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none', opacity: 0.5 }}>
                    {loadingSearch ? '⏳' : '📍'}
                </span>
            </div>

            {/* Dropdown suggestions */}
            {open && suggestions.length > 0 && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                    background: '#fff', border: '1px solid #dde', borderRadius: 8,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden',
                }}>
                    {suggestions.map((s, i) => (
                        <div
                            key={i}
                            onMouseDown={() => handleSelect(s)}
                            style={{
                                padding: '10px 14px', cursor: 'pointer', fontSize: '0.87rem',
                                display: 'flex', alignItems: 'flex-start', gap: 8,
                                borderBottom: i < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f6f9ff'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                            <span style={{ marginTop: 2, flexShrink: 0 }}>📍</span>
                            <div>
                                <div style={{ fontWeight: 600, color: '#222' }}>
                                    {[s.address, s.city].filter(Boolean).join(', ')}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 2 }}>
                                    {[s.state, s.pincode].filter(Boolean).join(' – ')}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div style={{ padding: '6px 14px', fontSize: '0.7rem', color: '#aaa', background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
                        Powered by {GOOGLE_KEY ? 'Google Maps' : 'OpenStreetMap'}
                    </div>
                </div>
            )}

            {error && <div style={{ color: '#e74c3c', fontSize: '0.79rem', marginTop: 5 }}>⚠ {error}</div>}
            {!GOOGLE_KEY && (
                <div style={{ fontSize: '0.72rem', color: '#888', marginTop: 4 }}>
                    💡 Type 4+ characters to search locations from OpenStreetMap
                </div>
            )}
        </div>
    );
}
