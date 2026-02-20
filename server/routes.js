import { Router } from 'express';
import { COMPANIES, TARGET_ROLES, ICP_REFERENCE, getAllCompanies, searchCompanies } from './companies-data.js';
import {
  scrapeCompanies, scrapeProfiles, buildCompanyUrls,
  transformCompanyResults, checkAPIStatus, API_KEY
} from './brightdata.js';

const router = Router();

// ============ BRIGHTDATA STATUS ============
router.get('/api/brightdata/status', async (req, res) => {
  const status = await checkAPIStatus();
  res.json({
    ...status,
    brightdataEnabled: !!API_KEY,
    message: API_KEY ? 'BrightData API key configured' : 'No BrightData API key - using static data'
  });
});

// ============ LIVE SCRAPE: Companies by LinkedIn URLs ============
router.post('/api/brightdata/scrape-companies', async (req, res) => {
  try {
    if (!API_KEY) return res.status(400).json({ error: 'BrightData API key not configured' });

    const { urls, names } = req.body;
    let companyUrls = urls || [];

    // If names provided instead of URLs, build URLs from names
    if (names && names.length > 0) {
      companyUrls = buildCompanyUrls(names);
    }

    if (companyUrls.length === 0) {
      return res.status(400).json({ error: 'Provide company URLs or names' });
    }

    console.log(`[BrightData] Scraping ${companyUrls.length} companies...`);
    const raw = await scrapeCompanies(companyUrls);
    const companies = transformCompanyResults(raw);

    res.json({
      total: companies.length,
      scrapedAt: new Date().toISOString(),
      source: 'brightdata-live',
      companies
    });
  } catch (err) {
    console.error('[BrightData] Scrape error:', err.message);
    res.status(500).json({ error: err.message, fallback: 'static' });
  }
});

// ============ LIVE SCRAPE: Decision Maker Profiles ============
router.post('/api/brightdata/scrape-profiles', async (req, res) => {
  try {
    if (!API_KEY) return res.status(400).json({ error: 'BrightData API key not configured' });

    const { profileUrls } = req.body;
    if (!profileUrls || profileUrls.length === 0) {
      return res.status(400).json({ error: 'Provide LinkedIn profile URLs' });
    }

    console.log(`[BrightData] Scraping ${profileUrls.length} profiles...`);
    const raw = await scrapeProfiles(profileUrls);

    const profiles = raw.map(r => ({
      name: r.name || 'Unknown',
      position: r.position || 'Unknown',
      company: r.current_company || 'Unknown',
      city: r.city || 'Unknown',
      country: r.country_code || '',
      about: r.about || '',
      linkedinUrl: r.url || '',
      scrapedAt: new Date().toISOString()
    }));

    res.json({
      total: profiles.length,
      source: 'brightdata-live',
      profiles
    });
  } catch (err) {
    console.error('[BrightData] Profile scrape error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ HYBRID: ICP SIMILAR (Live + Static Fallback) ============
router.get('/api/icp-similar', async (req, res) => {
  const { page = 1, limit = 50, search, region, live } = req.query;

  // If live=true and BrightData configured, try live scrape
  if (live === 'true' && API_KEY) {
    try {
      const icpIndustries = [
        'FMCG India', 'Consumer Goods India', 'Beverages company India',
        'Media Publishing India', 'Food Manufacturing India',
        'D2C ecommerce India', 'Retail India',
        'FMCG', 'Consumer Goods', 'Beverages spirits', 'Media Publishing'
      ];

      // Build LinkedIn search URLs
      const companyNames = icpIndustries.flatMap(industry => {
        // Use Google to find LinkedIn company pages by industry
        return [`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(industry)}&origin=SWITCH_SEARCH_VERTICAL`];
      });

      // For now, scrape known ICP-similar company LinkedIn pages
      const knownCompanies = COMPANIES.filter(c => c.category === 'icp-similar')
        .map(c => `https://www.linkedin.com/company/${c.linkedinSlug}`);

      const raw = await scrapeCompanies(knownCompanies.slice(0, 20));
      const liveCompanies = transformCompanyResults(raw, 'icp-similar');

      // Merge live + static (live first, then static as fallback)
      const staticCompanies = getAllCompanies('icp-similar');
      const mergedMap = new Map();
      liveCompanies.forEach(c => mergedMap.set(c.company.toLowerCase(), { ...c, source: 'live' }));
      staticCompanies.forEach(c => {
        if (!mergedMap.has(c.company.toLowerCase())) {
          mergedMap.set(c.company.toLowerCase(), { ...c, source: 'static' });
        }
      });

      let companies = [...mergedMap.values()];
      if (search) {
        const q = search.toLowerCase();
        companies = companies.filter(c =>
          c.company.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)
        );
      }
      if (region) companies = companies.filter(c => c.region.toLowerCase() === region.toLowerCase());
      companies = [...companies].sort(() => Math.random() - 0.5);

      const start = (parseInt(page) - 1) * parseInt(limit);
      return res.json({
        total: companies.length,
        page: parseInt(page),
        limit: parseInt(limit),
        icp_reference: ICP_REFERENCE,
        source: 'hybrid',
        companies: companies.slice(start, start + parseInt(limit))
      });
    } catch (err) {
      console.error('[BrightData] ICP live scrape failed, falling back to static:', err.message);
    }
  }

  // Static fallback
  let companies = getAllCompanies('icp-similar');
  if (search) {
    const q = search.toLowerCase();
    companies = companies.filter(c =>
      c.company.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q) ||
      c.icpSimilarity.toLowerCase().includes(q) ||
      c.hq.toLowerCase().includes(q)
    );
  }
  if (region) companies = companies.filter(c => c.region.toLowerCase() === region.toLowerCase());
  companies = [...companies].sort(() => Math.random() - 0.5);

  const start = (parseInt(page) - 1) * parseInt(limit);
  res.json({
    total: companies.length,
    page: parseInt(page),
    limit: parseInt(limit),
    icp_reference: ICP_REFERENCE,
    source: API_KEY ? 'static (live available)' : 'static',
    companies: companies.slice(start, start + parseInt(limit))
  });
});

// ============ HYBRID: HIGH-FIT CLOUD (Live + Static Fallback) ============
router.get('/api/high-fit', async (req, res) => {
  const { page = 1, limit = 50, search, region, complexity, live } = req.query;

  if (live === 'true' && API_KEY) {
    try {
      const knownCompanies = COMPANIES.filter(c => c.category === 'high-fit')
        .map(c => `https://www.linkedin.com/company/${c.linkedinSlug}`);

      const raw = await scrapeCompanies(knownCompanies.slice(0, 20));
      const liveCompanies = transformCompanyResults(raw, 'high-fit');

      const staticCompanies = getAllCompanies('high-fit');
      const mergedMap = new Map();
      liveCompanies.forEach(c => mergedMap.set(c.company.toLowerCase(), { ...c, source: 'live' }));
      staticCompanies.forEach(c => {
        if (!mergedMap.has(c.company.toLowerCase())) {
          mergedMap.set(c.company.toLowerCase(), { ...c, source: 'static' });
        }
      });

      let companies = [...mergedMap.values()];
      if (search) {
        const q = search.toLowerCase();
        companies = companies.filter(c =>
          c.company.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)
        );
      }
      if (region) companies = companies.filter(c => c.region.toLowerCase() === region.toLowerCase());
      if (complexity) companies = companies.filter(c => c.cloudComplexity.toLowerCase() === complexity.toLowerCase());
      companies = [...companies].sort(() => Math.random() - 0.5);

      const start = (parseInt(page) - 1) * parseInt(limit);
      return res.json({
        total: companies.length,
        page: parseInt(page),
        limit: parseInt(limit),
        source: 'hybrid',
        companies: companies.slice(start, start + parseInt(limit))
      });
    } catch (err) {
      console.error('[BrightData] High-fit live scrape failed, falling back to static:', err.message);
    }
  }

  // Static fallback
  let companies = getAllCompanies('high-fit');
  if (search) {
    const q = search.toLowerCase();
    companies = companies.filter(c =>
      c.company.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q) ||
      c.cloudProviders.toLowerCase().includes(q) ||
      c.hq.toLowerCase().includes(q)
    );
  }
  if (region) companies = companies.filter(c => c.region.toLowerCase() === region.toLowerCase());
  if (complexity) companies = companies.filter(c => c.cloudComplexity.toLowerCase() === complexity.toLowerCase());
  companies = [...companies].sort(() => Math.random() - 0.5);

  const start = (parseInt(page) - 1) * parseInt(limit);
  res.json({
    total: companies.length,
    page: parseInt(page),
    limit: parseInt(limit),
    source: API_KEY ? 'static (live available)' : 'static',
    companies: companies.slice(start, start + parseInt(limit))
  });
});

// ============ DECISION MAKER LINKEDIN REDIRECT ============
router.get('/api/linkedin-search', (req, res) => {
  const { company, role } = req.query;
  if (!company) return res.status(400).json({ error: 'Company name is required' });

  const roleQuery = role || 'CTO OR "VP Engineering" OR "Head of Technology" OR "VP DevOps" OR "Head of DevOps" OR "FinOps" OR "CISO" OR "CIO" OR "VP Infrastructure" OR "Head of SRE"';
  const linkedinUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(roleQuery)}&company=${encodeURIComponent(company)}&origin=FACETED_SEARCH`;
  const googleFallback = `https://www.google.com/search?q=site:linkedin.com/in+${encodeURIComponent(company)}+${encodeURIComponent(role || 'CTO OR VP Engineering OR DevOps OR CISO OR CIO')}`;

  res.json({
    company,
    linkedin_url: linkedinUrl,
    google_fallback: googleFallback,
    target_roles: TARGET_ROLES,
    brightdataEnabled: !!API_KEY
  });
});

// ============ GLOBAL SEARCH ============
router.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query is required' });
  const results = searchCompanies(q);
  res.json({ total: results.length, results });
});

// ============ STATS ============
router.get('/api/stats', (req, res) => {
  const icpSimilar = getAllCompanies('icp-similar');
  const highFit = getAllCompanies('high-fit');
  const allCompanies = COMPANIES;

  res.json({
    totalCompanies: allCompanies.length,
    icpSimilar: icpSimilar.length,
    highFit: highFit.length,
    indianCompanies: allCompanies.filter(c => c.region === 'India').length,
    globalCompanies: allCompanies.filter(c => c.region === 'Global').length,
    highComplexity: allCompanies.filter(c => c.cloudComplexity === 'High').length,
    verified: allCompanies.filter(c => c.verified).length,
    targetRoles: TARGET_ROLES.length,
    icpReference: ICP_REFERENCE,
    brightdataEnabled: !!API_KEY
  });
});

// ============ GOOGLE VERIFY ============
router.get('/api/google-verify', (req, res) => {
  const { company } = req.query;
  if (!company) return res.status(400).json({ error: 'Company name required' });

  res.json({
    company,
    links: {
      revenue: `https://www.google.com/search?q=${encodeURIComponent(company + ' annual revenue financial results')}`,
      cloud: `https://www.google.com/search?q=${encodeURIComponent(company + ' cloud infrastructure AWS Azure GCP kubernetes')}`,
      devops: `https://www.google.com/search?q=${encodeURIComponent(company + ' DevOps SRE engineering team hiring')}`,
      finops: `https://www.google.com/search?q=${encodeURIComponent(company + ' FinOps cloud cost optimization')}`,
      tech: `https://www.google.com/search?q=${encodeURIComponent(company + ' technology stack engineering blog')}`,
      linkedin: `https://www.google.com/search?q=site:linkedin.com+${encodeURIComponent(company)}+CTO+OR+VP+Engineering`
    }
  });
});

export default router;
