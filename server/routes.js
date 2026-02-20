import { Router } from 'express';
import { COMPANIES, TARGET_ROLES, ICP_REFERENCE, getAllCompanies, searchCompanies } from './companies-data.js';

const router = Router();

// ============ DECISION MAKER LINKEDIN REDIRECT ============
// Returns LinkedIn search URL that directly shows decision makers at a company
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
    target_roles: TARGET_ROLES
  });
});

// ============ AUTO-GENERATE ICP SIMILAR ============
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

  if (region) {
    companies = companies.filter(c => c.region.toLowerCase() === region.toLowerCase());
  }

  // Shuffle for fresh results each time
  companies = [...companies].sort(() => Math.random() - 0.5);

  const start = (parseInt(page) - 1) * parseInt(limit);
  const paginated = companies.slice(start, start + parseInt(limit));

  res.json({
    total: companies.length,
    page: parseInt(page),
    limit: parseInt(limit),
    icp_reference: ICP_REFERENCE,
    companies: paginated
  });
});

// ============ AUTO-GENERATE HIGH-FIT CLOUD ============
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

  if (region) {
    companies = companies.filter(c => c.region.toLowerCase() === region.toLowerCase());
  }

  if (complexity) {
    companies = companies.filter(c => c.cloudComplexity.toLowerCase() === complexity.toLowerCase());
  }

  // Shuffle for fresh results each time
  companies = [...companies].sort(() => Math.random() - 0.5);

  const start = (parseInt(page) - 1) * parseInt(limit);
  const paginated = companies.slice(start, start + parseInt(limit));

  res.json({
    total: companies.length,
    page: parseInt(page),
    limit: parseInt(limit),
    companies: paginated
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
  const indianCompanies = allCompanies.filter(c => c.region === 'India');
  const globalCompanies = allCompanies.filter(c => c.region === 'Global');
  const highComplexity = allCompanies.filter(c => c.cloudComplexity === 'High');
  const verified = allCompanies.filter(c => c.verified);

  res.json({
    totalCompanies: allCompanies.length,
    icpSimilar: icpSimilar.length,
    highFit: highFit.length,
    indianCompanies: indianCompanies.length,
    globalCompanies: globalCompanies.length,
    highComplexity: highComplexity.length,
    verified: verified.length,
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
