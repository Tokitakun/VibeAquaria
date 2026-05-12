'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Store, MapPin } from 'lucide-react';

// Fix Leaflet's default icon path issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function StoreLocatorMapInner({ userLocation }: { userLocation: { lat: number; lng: number } }) {
  const map = useMap();
  
  const places = React.useMemo(() => [
    { id: 1, name: 'Vibe Aquascape Store', lat: userLocation.lat + 0.005, lng: userLocation.lng + 0.005 },
    { id: 2, name: 'Nature Aquatic', lat: userLocation.lat - 0.01, lng: userLocation.lng + 0.008 },
    { id: 3, name: 'Molly & Friends', lat: userLocation.lat + 0.012, lng: userLocation.lng - 0.007 },
    { id: 4, name: 'Aqua Design Gallery', lat: userLocation.lat - 0.008, lng: userLocation.lng - 0.01 }
  ], [userLocation.lat, userLocation.lng]);

  useEffect(() => {
    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 13);
    }
  }, [userLocation, map]);

  return (
    <>
      {places.map((place) => (
        <Marker key={place.id} position={[place.lat, place.lng]} icon={customIcon}>
          <Popup>
            <strong>{place.name}</strong><br />
            Toko Aquarium Terdekat
          </Popup>
        </Marker>
      ))}
      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/50 flex gap-3 text-sm font-sans z-[1000] pointer-events-none">
        <Store className="w-5 h-5 text-[#A3B18A] shrink-0" />
        <p className="font-medium text-[#3A3A30]">Menampilkan {places.length} toko aquarium / aquascape di sekitar Anda.</p>
      </div>
    </>
  );
}

export default function StoreLocatorMap() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let active = true;
    if (navigator.geolocation && navigator.geolocation.getCurrentPosition) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (active) {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          }
        },
        () => {
          if (active) setUserLocation({ lat: -6.2088, lng: 106.8456 }); // Jakarta
        }
      );
    } else {
      setTimeout(() => {
        if (active) setUserLocation({ lat: -6.2088, lng: 106.8456 });
      }, 0);
    }
    return () => { active = false; };
  }, []);

  if (!userLocation) return <div className="h-full flex items-center justify-center p-8 bg-white/50 rounded-3xl"><p className="text-sm text-[#5A5A40]">Mencari lokasi Anda...</p></div>;

  return (
    <MapContainer 
      center={[userLocation.lat, userLocation.lng]} 
      zoom={13} 
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      className="rounded-[32px]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <Marker position={[userLocation.lat, userLocation.lng]} icon={customIcon}>
        <Popup>Lokasi Anda Sekarang</Popup>
      </Marker>
      <StoreLocatorMapInner userLocation={userLocation} />
    </MapContainer>
  );
}
