import { Router } from 'express';
import { COMPANIES, TARGET_ROLES, ICP_REFERENCE, getAllCompanies, searchCompanies } from './companies-data.js';
import { generateDiscoverySuggestions, generateDMSearchLinks } from './discovery.js';

const router = Router();

// ============ DISCOVERY ENGINE (FREE - No API key needed) ============
router.get('/api/discover', (req, res) => {
  const suggestions = generateDiscoverySuggestions();
  res.json(suggestions);
});

// ============ DECISION MAKER DISCOVERY ============
router.get('/api/discover/decision-makers', (req, res) => {
  const { company } = req.query;
  if (!company) return res.status(400).json({ error: 'Company name required' });
  const links = generateDMSearchLinks(company);
  res.json({ company, links });
});

// ============ ICP SIMILAR ============
router.get('/api/icp-similar', (req, res) => {
  const { page = 1, limit = 50, search, region } = req.query;
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

  // Shuffle for fresh results each time
  companies = [...companies].sort(() => Math.random() - 0.5);

  const start = (parseInt(page) - 1) * parseInt(limit);
  res.json({
    total: companies.length,
    page: parseInt(page),
    limit: parseInt(limit),
    icp_reference: ICP_REFERENCE,
    companies: companies.slice(start, start + parseInt(limit))
  });
});

// ============ HIGH-FIT CLOUD ============
router.get('/api/high-fit', (req, res) => {
  const { page = 1, limit = 50, search, region, complexity } = req.query;
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

  res.json({ company, linkedin_url: linkedinUrl, google_fallback: googleFallback, target_roles: TARGET_ROLES });
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
    icpReference: ICP_REFERENCE
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
