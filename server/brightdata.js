// ============================================================
// BRIGHTDATA LINKEDIN SCRAPER SERVICE
// Live scraping of LinkedIn companies and profiles
// ============================================================
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.BRIGHTDATA_API_KEY;
const BASE_URL = 'https://api.brightdata.com/datasets/v3';

// Dataset IDs
const DATASETS = {
  COMPANY: 'gd_l1vikfnt1wgvvqz95w',     // LinkedIn Company Information
  PROFILES: 'gd_l1viktl72bvl7bjuj0',      // LinkedIn People Profiles
  COMPANY_DISCOVER: 'gd_l1vikfnt1wgvvqz95w', // Company discovery
};

// ============ CACHE (avoid re-scraping same data within session) ============
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.time < CACHE_TTL) return item.data;
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

// ============ CORE API CALLS ============
async function triggerScrape(datasetId, inputs) {
  const url = `${BASE_URL}/trigger?dataset_id=${datasetId}&format=json&uncompressed_webhook=true`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(inputs)
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('BrightData trigger error:', res.status, err);
    throw new Error(`BrightData API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.snapshot_id;
}

async function checkProgress(snapshotId) {
  const url = `${BASE_URL}/progress/${snapshotId}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  if (!res.ok) throw new Error(`Progress check failed: ${res.status}`);
  return await res.json();
}

async function getSnapshot(snapshotId) {
  const url = `${BASE_URL}/snapshot/${snapshotId}?format=json`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  if (!res.ok) throw new Error(`Snapshot fetch failed: ${res.status}`);
  return await res.json();
}

// Poll until scrape is done (with timeout)
async function waitForResults(snapshotId, maxWaitMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const progress = await checkProgress(snapshotId);
    if (progress.status === 'ready') {
      return await getSnapshot(snapshotId);
    }
    if (progress.status === 'failed') {
      throw new Error('BrightData scrape failed');
    }
    // Wait 3 seconds before polling again
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('BrightData scrape timed out');
}

// ============ LINKEDIN COMPANY SCRAPING ============
// Scrape multiple company profiles from LinkedIn
export async function scrapeCompanies(companyUrls) {
  const cacheKey = `companies:${companyUrls.sort().join(',')}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const inputs = companyUrls.map(url => ({ url }));
  const snapshotId = await triggerScrape(DATASETS.COMPANY, inputs);
  const results = await waitForResults(snapshotId);

  setCache(cacheKey, results);
  return results;
}

// ============ LINKEDIN PEOPLE SCRAPING ============
// Scrape profiles of decision makers
export async function scrapeProfiles(profileUrls) {
  const cacheKey = `profiles:${profileUrls.sort().join(',')}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const inputs = profileUrls.map(url => ({ url }));
  const snapshotId = await triggerScrape(DATASETS.PROFILES, inputs);
  const results = await waitForResults(snapshotId);

  setCache(cacheKey, results);
  return results;
}

// ============ BUILD LINKEDIN SEARCH URLS ============
// Generate LinkedIn company URLs from company names for scraping
export function buildCompanyUrls(companyNames) {
  return companyNames.map(name => {
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    return `https://www.linkedin.com/company/${slug}`;
  });
}

// ============ INDUSTRY-BASED LINKEDIN SEARCH ============
// Build LinkedIn company search URLs by industry keywords
export function buildLinkedInSearchUrls(industries, regions = ['India']) {
  const urls = [];
  for (const industry of industries) {
    for (const region of regions) {
      urls.push(
        `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(industry)}&origin=SWITCH_SEARCH_VERTICAL&geo=${encodeURIComponent(region)}`
      );
    }
  }
  return urls;
}

// ============ TRANSFORM BRIGHTDATA COMPANY RESULTS ============
// Transform raw BrightData results into our app format
export function transformCompanyResults(rawResults, category = 'high-fit') {
  if (!Array.isArray(rawResults)) return [];

  return rawResults.map(r => ({
    company: r.name || r.company_name || 'Unknown',
    industry: r.industry || r.industries?.join(', ') || 'Unknown',
    category: category,
    region: detectRegion(r),
    hq: r.headquarters || r.locations?.[0] || 'Unknown',
    estCloudSpend: 'Research needed',
    cloudComplexity: estimateComplexity(r),
    cloudProviders: 'Research needed',
    cloudSignals: buildCloudSignals(r),
    whyFit: buildWhyFit(r),
    icpSimilarity: category === 'icp-similar' ? matchICP(r) : 'Analyze',
    verified: false,
    employeeCount: r.employees_in_linkedin || r.company_size || 'Unknown',
    linkedinSlug: r.linkedin_id || r.id || '',
    linkedinUrl: r.url || '',
    followers: r.followers || 0,
    about: r.about || '',
    specialties: r.specialties || [],
    scrapedLive: true,
    scrapedAt: new Date().toISOString()
  }));
}

// ============ HELPER FUNCTIONS ============
function detectRegion(company) {
  const hq = (company.headquarters || company.locations?.[0] || '').toLowerCase();
  const country = (company.country_code || '').toLowerCase();

  const indianCities = ['mumbai', 'bangalore', 'bengaluru', 'delhi', 'gurugram', 'gurgaon', 'hyderabad', 'chennai', 'pune', 'kolkata', 'noida', 'ahmedabad', 'jaipur', 'kochi', 'indore'];

  if (country === 'in' || indianCities.some(c => hq.includes(c))) return 'India';
  return 'Global';
}

function estimateComplexity(company) {
  const employees = parseInt(company.employees_in_linkedin || '0');
  if (employees > 5000) return 'High';
  if (employees > 1000) return 'Medium';
  return 'Low';
}

function buildCloudSignals(company) {
  const parts = [];
  if (company.employees_in_linkedin) parts.push(`${company.employees_in_linkedin} LinkedIn employees`);
  if (company.followers) parts.push(`${company.followers} followers`);
  if (company.specialties?.length) parts.push(`Specialties: ${company.specialties.join(', ')}`);
  if (company.industry) parts.push(`Industry: ${company.industry}`);
  return parts.join('. ') || 'Scraped from LinkedIn - verify cloud stack';
}

function buildWhyFit(company) {
  const employees = parseInt(company.employees_in_linkedin || '0');
  const parts = [];
  if (employees > 5000) parts.push('Large enterprise with significant cloud infrastructure.');
  else if (employees > 1000) parts.push('Mid-size company likely running cloud workloads.');
  if (company.specialties?.some(s => /tech|cloud|data|ai|software|saas|digital/i.test(s))) {
    parts.push('Technology-oriented specialties suggest cloud dependency.');
  }
  return parts.join(' ') || 'LinkedIn company - analyze cloud fit.';
}

function matchICP(company) {
  const industry = (company.industry || '').toLowerCase();
  if (/food|beverage|fmcg|consumer/i.test(industry)) return 'TCPL / Coca-Cola';
  if (/media|publishing|entertainment/i.test(industry)) return 'Condé Nast';
  if (/spirits|wine|beer|brew/i.test(industry)) return 'Diageo';
  if (/ecommerce|e-commerce|retail|d2c/i.test(industry)) return 'Shaddu.com';
  return 'Analyze similarity';
}

// ============ API STATUS CHECK ============
export async function checkAPIStatus() {
  try {
    const res = await fetch(`${BASE_URL}/progress/test`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    return { connected: res.status !== 401, apiKey: API_KEY ? '***' + API_KEY.slice(-6) : 'NOT SET' };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}

export { API_KEY, DATASETS };
