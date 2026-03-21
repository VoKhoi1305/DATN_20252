import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search } from 'lucide-react';

import PageHeader from '@/components/navigation/PageHeader';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/data-display/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { traceBycccd } from '@/api/trace.api';
import type { TraceResult } from '@/api/trace.api';
import { getMessages } from '@/locales';

// ---------------------------------------------------------------------------
// Locale
// ---------------------------------------------------------------------------
const MSG = getMessages().trace;

// ---------------------------------------------------------------------------
// Fix Leaflet default marker icon
// ---------------------------------------------------------------------------
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ---------------------------------------------------------------------------
// Colored marker icons
// ---------------------------------------------------------------------------
function createColoredIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

const ICON_SUCCESS = createColoredIcon('#16a34a');
const ICON_FAILED = createColoredIcon('#dc2626');
const ICON_WARNING = createColoredIcon('#f59e0b');

function getMarkerIcon(result: string) {
  if (result === 'SUCCESS') return ICON_SUCCESS;
  if (result === 'FAILED') return ICON_FAILED;
  return ICON_WARNING;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const HANOI_CENTER: [number, number] = [21.0048, 105.8473];
const DEFAULT_ZOOM = 14;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDate(v?: string | null): string {
  if (!v) return '—';
  return new Date(v).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeLabel(type: string): string {
  const key = `type${type}` as keyof typeof MSG;
  return (MSG[key] as string) ?? type;
}

function getResultLabel(result: string): string {
  const key = `result${result}` as keyof typeof MSG;
  return (MSG[key] as string) ?? result;
}

function getResultBadgeVariant(result: string): 'done' | 'urgent' | 'warning' {
  if (result === 'SUCCESS') return 'done';
  if (result === 'FAILED') return 'urgent';
  return 'warning';
}

// ---------------------------------------------------------------------------
// FitBounds helper component
// ---------------------------------------------------------------------------
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 15, { animate: true });
    } else {
      const bounds = L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], animate: true });
    }
  }, [positions, map]);
  return null;
}

// ---------------------------------------------------------------------------
// FlyTo helper component
// ---------------------------------------------------------------------------
function FlyToPoint({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, { duration: 0.8 });
    }
  }, [center, map]);
  return null;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function TracePage() {
  const { showToast } = useToast();

  // Search state
  const [cccd, setCccd] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // Result state
  const [data, setData] = useState<TraceResult | null>(null);

  // Map interaction
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  // Document title
  useEffect(() => {
    document.title = MSG.documentTitle;
  }, []);

  // --------------------------------------------------------------------------
  // Search handler
  // --------------------------------------------------------------------------
  const handleSearch = async () => {
    const trimmed = cccd.trim();
    if (trimmed.length !== 12 || !/^\d{12}$/.test(trimmed)) return;

    setSearching(true);
    setSearched(true);
    setData(null);
    setSelectedEventId(null);
    setFlyTarget(null);

    try {
      const res = await traceBycccd(trimmed);
      const raw = res.data as any;
      const body = (raw?.data ?? raw) as TraceResult;
      setData(body);
    } catch {
      showToast(MSG.errSystem, 'error');
      setData(null);
    } finally {
      setSearching(false);
    }
  };

  // --------------------------------------------------------------------------
  // Event row click -> pan map
  // --------------------------------------------------------------------------
  const handleEventClick = (eventId: string, lat: number | null, lng: number | null) => {
    setSelectedEventId(eventId);
    if (lat !== null && lng !== null) {
      setFlyTarget([lat, lng]);
    }
  };

  // Positions for fit bounds
  const markerPositions: [number, number][] = data
    ? data.events
        .filter((e) => e.gps_lat !== null && e.gps_lng !== null)
        .map((e) => [e.gps_lat!, e.gps_lng!])
    : [];

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="flex flex-col h-[calc(100vh-48px)] overflow-hidden">
      {/* Header + Search */}
      <div className="flex-shrink-0 px-4 pt-3 pb-3 bg-white border-b border-zinc-200">
        <PageHeader
          title={MSG.pageTitle}
          subtitle={MSG.subtitle}
          breadcrumbs={[
            { label: MSG.breadcrumbDashboard, href: '/dashboard' },
            { label: MSG.breadcrumbTrace },
          ]}
        />

        {/* Search bar */}
        <div className="flex items-end gap-3 mt-2">
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">{MSG.searchLabel}</label>
            <input
              type="text"
              maxLength={12}
              value={cccd}
              onChange={(e) => setCccd(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={MSG.searchPlaceholder}
              className="h-8 w-[240px] border border-zinc-300 rounded px-3 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-700 focus:border-red-700"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || cccd.trim().length !== 12}
            className="h-8 px-4 bg-red-700 text-white rounded text-[13px] font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Search size={14} />
            {searching ? MSG.searching : MSG.searchBtn}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Subject info + Event list */}
        <div className="w-[40%] flex-shrink-0 bg-white border-r border-zinc-200 flex flex-col overflow-hidden">
          {/* Loading */}
          {searching && (
            <div className="p-4 space-y-3">
              <Skeleton className="h-[100px] w-full" />
              <Skeleton className="h-[200px] w-full" />
            </div>
          )}

          {/* Empty state — before search */}
          {!searching && !searched && (
            <div className="flex-1 flex items-center justify-center p-4">
              <EmptyState
                title={MSG.emptyTitle}
                subtitle={MSG.emptySubtitle}
              />
            </div>
          )}

          {/* No results */}
          {!searching && searched && !data && (
            <div className="flex-1 flex items-center justify-center p-4">
              <EmptyState
                title={MSG.noResults}
                subtitle={MSG.noResultsSubtitle}
              />
            </div>
          )}

          {/* Results */}
          {!searching && data && (
            <>
              {/* Subject info card */}
              <div className="flex-shrink-0 border-b border-zinc-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[14px] font-semibold text-zinc-900">
                    {MSG.resultSubject}
                  </h3>
                  <Badge variant="info">{MSG.eventCount(data.events.length)}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-start">
                    <span className="text-[12px] text-zinc-500 w-[100px] shrink-0">{MSG.lblName}</span>
                    <span className="text-[13px] text-zinc-900 font-medium">{data.subject.full_name}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[12px] text-zinc-500 w-[100px] shrink-0">{MSG.lblCccd}</span>
                    <span className="text-[13px] text-zinc-900 font-mono">{data.subject.cccd}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[12px] text-zinc-500 w-[100px] shrink-0">{MSG.lblAddress}</span>
                    <span className="text-[13px] text-zinc-900">{data.subject.address ?? '—'}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[12px] text-zinc-500 w-[100px] shrink-0">{MSG.lblPhone}</span>
                    <span className="text-[13px] text-zinc-900">{data.subject.phone ?? '—'}</span>
                  </div>
                </div>
              </div>

              {/* Event list */}
              <div className="flex-shrink-0 px-4 py-2 border-b border-zinc-200">
                <h3 className="text-[14px] font-semibold text-zinc-900">{MSG.resultEvents}</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {data.events.length === 0 ? (
                  <div className="p-4">
                    <EmptyState title={MSG.noResults} />
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 sticky top-0">
                        <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-3 py-2">
                          {MSG.colTime}
                        </th>
                        <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-3 py-2">
                          {MSG.colType}
                        </th>
                        <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-3 py-2">
                          {MSG.colResult}
                        </th>
                        <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-3 py-2">
                          {MSG.colInGeofence}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.events.map((evt) => (
                        <tr
                          key={evt.id}
                          onClick={() => handleEventClick(evt.id, evt.gps_lat, evt.gps_lng)}
                          className={`h-9 border-b border-zinc-100 cursor-pointer transition-colors ${
                            selectedEventId === evt.id
                              ? 'bg-red-50 border-l-2 border-l-red-600'
                              : 'hover:bg-zinc-50'
                          }`}
                        >
                          <td className="px-3 text-[12px] text-zinc-600 whitespace-nowrap">
                            {fmtDate(evt.client_timestamp ?? evt.created_at)}
                          </td>
                          <td className="px-3 text-[12px] text-zinc-700 whitespace-nowrap">
                            {getTypeLabel(evt.type)}
                          </td>
                          <td className="px-3">
                            <Badge variant={getResultBadgeVariant(evt.result)}>
                              {getResultLabel(evt.result)}
                            </Badge>
                          </td>
                          <td className="px-3 text-[12px] whitespace-nowrap">
                            {evt.gps_lat === null ? (
                              <span className="text-zinc-400">{MSG.noGps}</span>
                            ) : evt.in_geofence === true ? (
                              <span className="text-green-700">{MSG.inGeofence}</span>
                            ) : evt.in_geofence === false ? (
                              <span className="text-red-700">{MSG.outGeofence}</span>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right panel: Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={HANOI_CENTER}
            zoom={DEFAULT_ZOOM}
            className="w-full h-full"
            style={{ zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Fit bounds to all markers on data load */}
            {markerPositions.length > 0 && (
              <FitBounds positions={markerPositions} />
            )}

            {/* Fly to selected event */}
            <FlyToPoint center={flyTarget} />

            {/* Event markers */}
            {data?.events
              .filter((e) => e.gps_lat !== null && e.gps_lng !== null)
              .map((evt) => (
                <Marker
                  key={evt.id}
                  position={[evt.gps_lat!, evt.gps_lng!]}
                  icon={getMarkerIcon(evt.result)}
                >
                  <Popup>
                    <div className="text-xs space-y-1 min-w-[160px]">
                      <div className="font-semibold">{getTypeLabel(evt.type)}</div>
                      <div>
                        <span className="text-zinc-500">{MSG.colResult}:</span>{' '}
                        {getResultLabel(evt.result)}
                      </div>
                      <div>
                        <span className="text-zinc-500">{MSG.colTime}:</span>{' '}
                        {fmtDate(evt.client_timestamp ?? evt.created_at)}
                      </div>
                      <div>
                        <span className="text-zinc-500">{MSG.colInGeofence}:</span>{' '}
                        {evt.in_geofence === true
                          ? MSG.inGeofence
                          : evt.in_geofence === false
                            ? MSG.outGeofence
                            : '—'}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>

          {/* Map legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-lg px-3 py-2 shadow-sm">
            <div className="text-[10px] font-semibold text-zinc-600 mb-1">{MSG.resultMap}</div>
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-600" />
                <span className="text-zinc-600">{MSG.resultSUCCESS}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600" />
                <span className="text-zinc-600">{MSG.resultFAILED}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-zinc-600">{MSG.resultWARNING}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
