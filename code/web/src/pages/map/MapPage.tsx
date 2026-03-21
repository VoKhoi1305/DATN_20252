import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  X,
  MapPin,
  Check,
  ChevronLeft,
} from 'lucide-react';
import { getMessages } from '@/locales';
import {
  fetchGeofences,
  createGeofence,
  updateGeofence,
  deleteGeofence,
  geocodeAddress,
  type GeofenceItem,
  type GeocodeResult,
} from '@/api/geofences.api';
const MSG = getMessages().map;

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const VIETNAM_CENTER: [number, number] = [16.0471, 108.2068];
const DEFAULT_ZOOM = 6;

interface FormData {
  name: string;
  address: string;
  center_lat: number | null;
  center_lng: number | null;
  radius: number;
}

const EMPTY_FORM: FormData = {
  name: '',
  address: '',
  center_lat: null,
  center_lng: null,
  radius: 500,
};

// Component to handle map click for location selection
function MapClickHandler({
  active,
  onSelect,
}: {
  active: boolean;
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (active) {
        onSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Component to fly the map to a location
function FlyTo({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom ?? 15, { duration: 1 });
    }
  }, [center, zoom, map]);
  return null;
}

function MapPage() {
  const [geofences, setGeofences] = useState<GeofenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // null=create mode, id=edit mode
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pickingLocation, setPickingLocation] = useState(false);

  // Geocode search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  // Map fly target
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // List search
  const [listSearch, setListSearch] = useState('');

  const loadGeofences = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchGeofences({ limit: 200 });
      const d = res.data as any;
      const list = d?.data?.data ?? d?.data ?? [];
      setGeofences(Array.isArray(list) ? list : []);
    } catch {
      setGeofences([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = MSG.documentTitle;
    loadGeofences();
  }, [loadGeofences]);

  // Address geocoding
  const handleSearchAddress = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) return;
    setSearching(true);
    try {
      const res = await geocodeAddress(searchQuery.trim());
      const d = res.data as any;
      const results = d?.data ?? d ?? [];
      setSearchResults(Array.isArray(results) ? results : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectGeoResult = (result: GeocodeResult) => {
    setForm((f) => ({
      ...f,
      address: result.display_name,
      center_lat: result.lat,
      center_lng: result.lng,
    }));
    setSearchResults([]);
    setSearchQuery('');
    setFlyTarget([result.lat, result.lng]);
    setPickingLocation(false);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setForm((f) => ({
      ...f,
      center_lat: parseFloat(lat.toFixed(7)),
      center_lng: parseFloat(lng.toFixed(7)),
    }));
    setFlyTarget([lat, lng]);
    setPickingLocation(false);
  };

  const openCreateForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setSearchResults([]);
    setSearchQuery('');
  };

  const openEditForm = (g: GeofenceItem) => {
    setForm({
      name: g.name,
      address: g.address || '',
      center_lat: g.center_lat,
      center_lng: g.center_lng,
      radius: g.radius,
    });
    setEditingId(g.id);
    setShowForm(true);
    setSearchResults([]);
    setSearchQuery('');
    setFlyTarget([g.center_lat, g.center_lng]);
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.center_lat === null || form.center_lng === null) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        center_lat: form.center_lat,
        center_lng: form.center_lng,
        radius: form.radius,
      };

      if (editingId) {
        await updateGeofence(editingId, payload);
      } else {
        await createGeofence(payload);
      }

      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadGeofences();
    } catch {
      // Error handling
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGeofence(id);
      setDeleteConfirm(null);
      if (selectedId === id) setSelectedId(null);
      await loadGeofences();
    } catch {
      // Error handling
    }
  };

  const selectGeofence = (g: GeofenceItem) => {
    setSelectedId(g.id);
    setFlyTarget([g.center_lat, g.center_lng]);
  };

  const filteredGeofences = listSearch
    ? geofences.filter(
        (g) =>
          g.name.toLowerCase().includes(listSearch.toLowerCase()) ||
          g.code.toLowerCase().includes(listSearch.toLowerCase()) ||
          (g.address && g.address.toLowerCase().includes(listSearch.toLowerCase())),
      )
    : geofences;

  const isFormValid = form.name.trim() && form.center_lat !== null && form.center_lng !== null && form.radius >= 50;

  return (
    <div className="flex h-[calc(100vh-48px)] overflow-hidden">
      {/* Left Panel */}
      <div className="w-[360px] flex-shrink-0 bg-white border-r border-zinc-200 flex flex-col overflow-hidden">
        {showForm ? (
          /* Create/Edit Form */
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200">
              <button
                onClick={() => { setShowForm(false); setPickingLocation(false); }}
                className="p-1 hover:bg-zinc-100 rounded"
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-sm font-semibold text-zinc-800">
                {editingId ? MSG.geofenceEdit : MSG.geofenceAdd}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {MSG.geofenceName}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={MSG.formNamePlaceholder}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Address search */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {MSG.geofenceAddress}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
                    placeholder={MSG.formAddressPlaceholder}
                    className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  />
                  <button
                    onClick={handleSearchAddress}
                    disabled={searching}
                    className="px-3 py-2 bg-zinc-800 text-white rounded-md text-sm hover:bg-zinc-700 disabled:opacity-50 flex-shrink-0"
                  >
                    <Search size={14} />
                  </button>
                </div>

                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                  <div className="mt-1 border border-zinc-200 rounded-md bg-white shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => selectGeoResult(r)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 border-b border-zinc-100 last:border-0"
                      >
                        <MapPin size={12} className="inline mr-1.5 text-red-600" />
                        {r.display_name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Current address */}
                {form.address && (
                  <p className="mt-1.5 text-xs text-zinc-500 truncate" title={form.address}>
                    <MapPin size={10} className="inline mr-1" />
                    {form.address}
                  </p>
                )}
              </div>

              {/* Pick on map button */}
              <button
                onClick={() => setPickingLocation(!pickingLocation)}
                className={`w-full px-3 py-2 border rounded-md text-sm flex items-center justify-center gap-2 transition-colors ${
                  pickingLocation
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <MapPin size={14} />
                {pickingLocation ? 'Nhấn vào bản đồ để chọn vị trí...' : 'Chọn vị trí trên bản đồ'}
              </button>

              {/* Coordinates display */}
              {form.center_lat !== null && form.center_lng !== null && (
                <div className="bg-zinc-50 rounded-md px-3 py-2 text-xs text-zinc-600">
                  <div className="flex justify-between">
                    <span>Lat: <strong>{form.center_lat.toFixed(7)}</strong></span>
                    <span>Lng: <strong>{form.center_lng.toFixed(7)}</strong></span>
                  </div>
                </div>
              )}

              {/* Radius */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {MSG.geofenceRadius}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={50}
                    max={5000}
                    step={50}
                    value={form.radius}
                    onChange={(e) => setForm((f) => ({ ...f, radius: parseInt(e.target.value) }))}
                    className="flex-1 accent-red-600"
                  />
                  <input
                    type="number"
                    min={50}
                    max={50000}
                    value={form.radius}
                    onChange={(e) => setForm((f) => ({ ...f, radius: parseInt(e.target.value) || 500 }))}
                    className="w-20 px-2 py-1.5 border border-zinc-300 rounded-md text-sm text-center focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <span className="text-xs text-zinc-500">m</span>
                </div>
              </div>
            </div>

            {/* Form buttons */}
            <div className="px-4 py-3 border-t border-zinc-200 flex gap-2">
              <button
                onClick={() => { setShowForm(false); setPickingLocation(false); }}
                className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm text-zinc-600 hover:bg-zinc-50"
              >
                {MSG.formCancel}
              </button>
              <button
                onClick={handleSave}
                disabled={!isFormValid || saving}
                className="flex-1 px-3 py-2 bg-red-700 text-white rounded-md text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Check size={14} />
                {saving ? '...' : MSG.formSave}
              </button>
            </div>
          </div>
        ) : (
          /* Geofence List */
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-zinc-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-zinc-800">
                  {MSG.geofenceTitle}
                </h2>
                <button
                  onClick={openCreateForm}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-700 text-white rounded-md text-xs hover:bg-red-600"
                >
                  <PlusCircle size={12} />
                  {MSG.geofenceAdd}
                </button>
              </div>
              <input
                type="text"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder={MSG.listSearch}
                className="w-full px-3 py-1.5 border border-zinc-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-xs text-zinc-400">...</div>
              ) : filteredGeofences.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400">
                  {MSG.listEmpty}
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {filteredGeofences.map((g) => (
                    <div
                      key={g.id}
                      className={`px-4 py-3 cursor-pointer hover:bg-zinc-50 transition-colors ${
                        selectedId === g.id ? 'bg-red-50 border-l-2 border-red-600' : ''
                      }`}
                      onClick={() => selectGeofence(g)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-800 truncate">
                              {g.name}
                            </span>
                            <span
                              className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                                g.is_active ? 'bg-green-500' : 'bg-zinc-300'
                              }`}
                            />
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{g.code}</p>
                          {g.address && (
                            <p className="text-xs text-zinc-500 mt-1 truncate" title={g.address}>
                              <MapPin size={10} className="inline mr-1" />
                              {g.address}
                            </p>
                          )}
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {MSG.mapRadius}: <strong>{g.radius}m</strong>
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditForm(g); }}
                            className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded"
                          >
                            <Pencil size={12} />
                          </button>
                          {deleteConfirm === g.id ? (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleDelete(g.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="p-1 text-zinc-400 hover:bg-zinc-100 rounded"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(g.id); }}
                              className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        <MapContainer
          center={VIETNAM_CENTER}
          zoom={DEFAULT_ZOOM}
          className="w-full h-full"
          style={{ zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler active={pickingLocation} onSelect={handleMapClick} />
          <FlyTo center={flyTarget} />

          {/* Existing geofences */}
          {geofences.map((g) => (
            <Circle
              key={g.id}
              center={[g.center_lat, g.center_lng]}
              radius={g.radius}
              pathOptions={{
                color: selectedId === g.id ? '#dc2626' : '#3b82f6',
                fillColor: selectedId === g.id ? '#dc2626' : '#3b82f6',
                fillOpacity: selectedId === g.id ? 0.2 : 0.1,
                weight: selectedId === g.id ? 3 : 2,
              }}
              eventHandlers={{
                click: () => selectGeofence(g),
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong>{g.name}</strong>
                  <br />
                  <span className="text-zinc-500">{g.code}</span>
                  <br />
                  {MSG.mapRadius}: {g.radius}m
                  {g.address && (
                    <>
                      <br />
                      <span className="text-zinc-500">{g.address}</span>
                    </>
                  )}
                </div>
              </Popup>
            </Circle>
          ))}

          {/* Existing geofence center markers */}
          {geofences.map((g) => (
            <Marker key={`m-${g.id}`} position={[g.center_lat, g.center_lng]}>
              <Popup>
                <div className="text-xs">
                  <strong>{g.name}</strong> ({g.code})
                  <br />
                  {MSG.mapRadius}: {g.radius}m
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Preview circle for form */}
          {showForm && form.center_lat !== null && form.center_lng !== null && (
            <>
              <Circle
                center={[form.center_lat, form.center_lng]}
                radius={form.radius}
                pathOptions={{
                  color: '#f59e0b',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.2,
                  weight: 2,
                  dashArray: '8 4',
                }}
              />
              <Marker position={[form.center_lat, form.center_lng]}>
                <Popup>
                  <div className="text-xs">
                    <strong>{form.name || '(Chưa đặt tên)'}</strong>
                    <br />
                    {MSG.mapRadius}: {form.radius}m
                  </div>
                </Popup>
              </Marker>
            </>
          )}
        </MapContainer>

        {/* Picking location overlay badge */}
        {pickingLocation && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-amber-500 text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg flex items-center gap-2">
            <MapPin size={14} />
            Nhấn vào bản đồ để chọn vị trí
          </div>
        )}
      </div>
    </div>
  );
}

export default MapPage;
