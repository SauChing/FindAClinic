import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

interface CachedClinic {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  phone: string;
  programmes: string[];
  lat: number;
  lng: number;
  licenceType: string;
}

let cachedClinics: CachedClinic[] = [];
let lastFetchedTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Helper to calculate Haversine distance in meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Function to fetch clinics from data.gov.sg
async function fetchClinicsFromDataGovSg(): Promise<CachedClinic[]> {
  const datasetId = 'd_548c33ea2d99e29ec63a7cc9edcccedc';
  const apiKey = process.env.DATA_GOV_SG_API_KEY;

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const pollUrl = `https://api-open.data.gov.sg/v1/public/api/datasets/${datasetId}/poll-download`;
  const pollRes = await fetch(pollUrl, { headers });
  
  if (!pollRes.ok) {
    throw new Error(`Data.gov.sg poll API returned status ${pollRes.status}`);
  }

  const pollData = await pollRes.json();
  const downloadUrl = pollData.data?.url;
  if (!downloadUrl) {
    throw new Error('No download URL returned by data.gov.sg');
  }

  const geoRes = await fetch(downloadUrl);
  if (!geoRes.ok) {
    throw new Error(`Failed to download GeoJSON from data.gov.sg (${geoRes.status})`);
  }

  const geo = await geoRes.json();

  function parseDescription(html: string): Record<string, string> {
    const fields: Record<string, string> = {};
    const regex = /<th>([^<]+)<\/th>\s*<td>([^<]*)<\/td>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      fields[match[1].trim()] = match[2].trim();
    }
    return fields;
  }

  const clinics: CachedClinic[] = [];
  for (const f of geo.features || []) {
    const d = parseDescription(f.properties?.Description || '');
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const [lng, lat] = coords;
    if (!lat || !lng) continue;

    const block = d.BLK_HSE_NO ? (d.BLK_HSE_NO.toLowerCase().startsWith('blk') ? d.BLK_HSE_NO : `Blk ${d.BLK_HSE_NO}`) : '';
    const street = d.STREET_NAME || '';
    const bldg = d.BUILDING_NAME || '';
    const unit = d.FLOOR_NO && d.UNIT_NO ? `#${d.FLOOR_NO}-${d.UNIT_NO}` : (d.UNIT_NO ? `#${d.UNIT_NO}` : '');
    const postal = d.POSTAL_CD ? d.POSTAL_CD.padStart(6, '0') : '';

    const parts = [block, street, bldg, unit, postal ? `Singapore ${postal}` : ''].filter(Boolean);
    const fullAddress = parts.join(' ').replace(/\s+/g, ' ').trim();

    clinics.push({
      id: d.HCI_CODE || f.properties?.Name || `c-${clinics.length + 1}`,
      name: d.HCI_NAME || 'Medical Clinic',
      address: fullAddress,
      postalCode: postal,
      phone: d.HCI_TEL || '',
      programmes: d.CLINIC_PROGRAMME_CODE ? d.CLINIC_PROGRAMME_CODE.split(',').map((s: string) => s.trim()) : ['CHAS'],
      lat: Number(lat),
      lng: Number(lng),
      licenceType: d.LICENCE_TYPE || 'MC'
    });
  }

  return clinics;
}

// Ensure clinics data is loaded
async function getOrLoadClinics(): Promise<CachedClinic[]> {
  const now = Date.now();
  if (cachedClinics.length > 0 && now - lastFetchedTime < CACHE_TTL_MS) {
    return cachedClinics;
  }

  try {
    const fresh = await fetchClinicsFromDataGovSg();
    if (fresh.length > 0) {
      cachedClinics = fresh;
      lastFetchedTime = now;
      console.log(`[Data.gov.sg] Successfully loaded ${fresh.length} clinics from live API`);
      return fresh;
    }
  } catch (err) {
    console.warn('[Data.gov.sg] Live fetch error, falling back to local snapshot:', (err as Error).message);
  }

  // Fallback to local snapshot if available
  if (cachedClinics.length === 0) {
    const localSnapshotPath = path.resolve(__dirname, 'src/data/clinics.json');
    if (fs.existsSync(localSnapshotPath)) {
      const content = fs.readFileSync(localSnapshotPath, 'utf-8');
      cachedClinics = JSON.parse(content);
      lastFetchedTime = now;
      console.log(`[Data.gov.sg] Loaded ${cachedClinics.length} clinics from local snapshot`);
    }
  }

  return cachedClinics;
}

// API Route: GET /api/clinics
app.get('/api/clinics', async (req: Request, res: Response) => {
  try {
    const clinics = await getOrLoadClinics();
    const { lat, lng, search, limit } = req.query;

    let results = clinics;

    // Filter by search query if provided
    if (search && typeof search === 'string') {
      const q = search.trim().toLowerCase();
      results = results.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.postalCode.includes(q) ||
        c.programmes.some(p => p.toLowerCase().includes(q))
      );
    }

    // Sort by distance if lat & lng provided
    if (lat && lng) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);

      if (!isNaN(userLat) && !isNaN(userLng)) {
        results = results.map(c => {
          const distanceMeters = haversineDistance(userLat, userLng, c.lat, c.lng);
          return {
            ...c,
            distanceMeters,
            distanceFormatted:
              distanceMeters < 1000
                ? `${Math.max(10, Math.round(distanceMeters / 10) * 10)} m`
                : `${(distanceMeters / 1000).toFixed(1)} km`
          };
        }).sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
      }
    }

    // Apply limit if specified
    if (limit) {
      const parsedLimit = parseInt(limit as string, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        results = results.slice(0, parsedLimit);
      }
    }

    res.json({
      success: true,
      source: 'data.gov.sg',
      dataset: 'CHAS Clinics (MOH)',
      total: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error fetching clinics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve clinic data from data.gov.sg'
    });
  }
});

// Geocoding helper for postal code search
app.get('/api/geocode', async (req: Request, res: Response) => {
  const { postal } = req.query;
  if (!postal || typeof postal !== 'string') {
    return res.status(400).json({ error: 'Postal code is required' });
  }

  const clean = postal.replace(/\D/g, '').padStart(6, '0');
  
  // Try OneMap search API
  try {
    const oneMapRes = await fetch(`https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${clean}&returnGeom=Y&getAddrDetails=Y`);
    if (oneMapRes.ok) {
      const oneMapData = await oneMapRes.json();
      if (oneMapData.results && oneMapData.results.length > 0) {
        const first = oneMapData.results[0];
        return res.json({
          success: true,
          lat: parseFloat(first.LATITUDE),
          lng: parseFloat(first.LONGITUDE),
          address: first.ADDRESS || first.ROAD_NAME,
          postal: clean
        });
      }
    }
  } catch (e) {
    // Silently continue to fallback
  }

  // Fallback to checking existing clinic dataset with same postal
  const clinics = await getOrLoadClinics();
  const matched = clinics.find(c => c.postalCode === clean);
  if (matched) {
    return res.json({
      success: true,
      lat: matched.lat,
      lng: matched.lng,
      address: matched.address,
      postal: clean
    });
  }

  res.status(404).json({ error: 'Postal code coordinates not found' });
});

// Start Express server and connect Vite in development
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Clinic Finder SG server running at http://localhost:${PORT}`);
    // Preload dataset in background
    getOrLoadClinics().catch(console.error);
  });
}

startServer();
