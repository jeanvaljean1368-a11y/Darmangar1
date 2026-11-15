// Leaflet map picker for selecting a location
// Uses OpenStreetMap tiles (free, no API key required)

'use client'

import { useEffect, useRef } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

interface LeafletMapPickerProps {
  latitude: number | null
  longitude: number | null
  onChange: (lat: number, lng: number) => void
  height?: number
}

export function LeafletMapPicker({ latitude, longitude, onChange, height = 200 }: LeafletMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [loaded, setLoaded] = useLoadedState(false)

  useEffect(() => {
    if (loaded || !containerRef.current) return
    // Dynamically import leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Default center: Tehran (35.6892, 51.3890)
      const lat = latitude ?? 35.6892
      const lng = longitude ?? 51.3890
      const map = L.map(containerRef.current!).setView([lat, lng], 12)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      // Add a marker at the initial position
      const customIcon = L.divIcon({
        html: `<div style="background-color: #0d9488; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      })
      const marker = L.marker([lat, lng], { icon: customIcon, draggable: true }).addTo(map)
      marker.on('dragend', (e: any) => {
        const ll = e.target.getLatLng()
        onChange(ll.lat, ll.lng)
      })
      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng)
        onChange(e.latlng.lat, e.latlng.lng)
      })

      mapRef.current = map
      markerRef.current = marker
      setLoaded(true)
    })
  }, [])

  // Update marker position when lat/lng changes externally
  useEffect(() => {
    if (loaded && mapRef.current && markerRef.current && latitude !== null && longitude !== null) {
      markerRef.current.setLatLng([latitude, longitude])
      mapRef.current.panTo([latitude, longitude])
    }
  }, [latitude, longitude, loaded])

  return (
    <div className="border rounded-lg overflow-hidden bg-muted/30 relative">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
          در حال بارگذاری نقشه...
        </div>
      )}
      <div ref={containerRef} style={{ height: `${height}px`, width: '100%' }} />
      {latitude !== null && longitude !== null && (
        <div className="px-3 py-1.5 bg-white border-t text-[10px] text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3 text-primary" />
          مختصات انتخاب‌شده: <span dir="ltr" className="font-mono">{latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
        </div>
      )}
      <p className="px-3 py-1.5 bg-white border-t text-[10px] text-muted-foreground">
        برای تنظیم موقعیت، روی نقشه کلیک کنید یا نشانگر را بکشید.
      </p>
    </div>
  )
}

// Helper hook to allow state usage without importing useState
import { useState } from 'react'
function useLoadedState(initial: boolean): [boolean, (v: boolean) => void] {
  const [val, setVal] = useState(initial)
  return [val, setVal]
}
