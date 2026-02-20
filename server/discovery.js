// ============================================================
// SMART DISCOVERY ENGINE - FREE LinkedIn Company Discovery
// Generates rotating Google & LinkedIn search queries
// to help discover NEW companies on every refresh
// ============================================================

// ICP industries for discovery
const ICP_INDUSTRIES = [
  'FMCG', 'Consumer Goods', 'Beverages', 'Food Manufacturing',
  'Spirits', 'Brewing', 'Media', 'Publishing', 'Digital Media',
  'D2C', 'E-Commerce', 'Quick Commerce', 'Retail Tech'
];

// Cloud-heavy industries for high-fit discovery
const CLOUD_INDUSTRIES = [
  'Fintech', 'HealthTech', 'EdTech', 'Gaming', 'SaaS',
  'Logistics Tech', 'InsurTech', 'PropTech', 'AgriTech',
  'Cloud Native', 'DevOps', 'Data Engineering', 'AI ML',
  'Cybersecurity', 'API Platform', 'Developer Tools'
];

// Regions for targeted search
const REGIONS = {
  india: ['India', 'Mumbai', 'Bangalore', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Gurugram', 'Noida'],
  global: ['USA', 'UK', 'Germany', 'Singapore', 'Australia', 'Canada', 'Netherlands']
};

// Cloud keywords for signals
const CLOUD_KEYWORDS = [
  'kubernetes', 'AWS', 'GCP', 'Azure', 'DevOps', 'SRE',
  'FinOps', 'cloud migration', 'microservices', 'docker',
  'terraform', 'cloud infrastructure', 'data engineering',
  'machine learning platform', 'cloud native'
];

// Decision maker titles
const DM_TITLES = [
  'CTO', 'VP Engineering', 'Head of Technology', 'VP DevOps',
  'Head of DevOps', 'Director FinOps', 'CISO', 'CIO',
  'Head of SRE', 'VP Infrastructure', 'Head of Cloud',
  'Director Cloud Engineering', 'VP Platform Engineering'
];

// ============ RANDOM HELPERS ============
function pickRandom(arr, n = 1) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return n === 1 ? shuffled[0] : shuffled.slice(0, n);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============ DISCOVERY QUERY GENERATORS ============

// Generate LinkedIn company search URLs
export function generateLinkedInDiscoveryLinks(count = 10) {
  const links = [];

  for (let i = 0; i < count; i++) {
    const isIcp = Math.random() > 0.5;
    const industries = isIcp ? ICP_INDUSTRIES : CLOUD_INDUSTRIES;
    const industry = pickRandom(industries);
    const region = Math.random() > 0.3 ? pickRandom(REGIONS.india) : pickRandom(REGIONS.global);

    const keywords = `${industry} ${region}`;
    const url = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(keywords)}&origin=SWITCH_SEARCH_VERTICAL`;

    links.push({
      type: isIcp ? 'icp-discovery' : 'cloud-discovery',
      label: `${industry} companies in ${region}`,
      url,
      industry,
      region
    });
  }

  return links;
}

// Generate Google search URLs for LinkedIn company discovery
export function generateGoogleDiscoveryLinks(count = 15) {
  const links = [];

  const queryTemplates = [
    // ICP similar discovery
    { tpl: 'site:linkedin.com/company {industry} India', type: 'icp' },
    { tpl: 'site:linkedin.com/company {industry} company {region}', type: 'icp' },
    { tpl: '"linkedin.com/company" {industry} startup India cloud', type: 'icp' },
    // High-fit cloud discovery
    { tpl: 'site:linkedin.com/company {tech} startup India', type: 'cloud' },
    { tpl: '"linkedin.com/company" {tech} company {region} cloud infrastructure', type: 'cloud' },
    { tpl: 'site:linkedin.com/company {tech} unicorn India', type: 'cloud' },
    // Decision maker discovery
    { tpl: 'site:linkedin.com/in CTO {industry} India', type: 'dm' },
    { tpl: 'site:linkedin.com/in "VP Engineering" {tech} {region}', type: 'dm' },
    { tpl: 'site:linkedin.com/in "Head of DevOps" OR "VP DevOps" {region}', type: 'dm' },
    // Cloud spend signals
    { tpl: '{industry} company India AWS case study', type: 'signal' },
    { tpl: '{industry} company India kubernetes cloud migration', type: 'signal' },
    { tpl: '{tech} company hiring DevOps SRE India', type: 'signal' },
    // Specific discovery
    { tpl: 'top {industry} startups India 2024 2025 cloud', type: 'icp' },
    { tpl: 'Indian {industry} companies using {cloud}', type: 'cloud' },
    { tpl: '{industry} companies India series B C D funding', type: 'cloud' },
  ];

  const used = new Set();
  for (let i = 0; i < count; i++) {
    const template = pickRandom(queryTemplates);
    const industry = pickRandom([...ICP_INDUSTRIES, ...CLOUD_INDUSTRIES]);
    const tech = pickRandom(CLOUD_INDUSTRIES);
    const region = Math.random() > 0.3 ? pickRandom(REGIONS.india) : pickRandom(REGIONS.global);
    const cloud = pickRandom(['AWS', 'GCP', 'Azure']);

    let query = template.tpl
      .replace('{industry}', industry)
      .replace('{tech}', tech)
      .replace('{region}', region)
      .replace('{cloud}', cloud);

    if (used.has(query)) continue;
    used.add(query);

    links.push({
      type: template.type,
      label: query,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      query
    });
  }

  return links;
}

// Generate decision maker search links for a specific company
export function generateDMSearchLinks(company) {
  const titles = pickRandom(DM_TITLES, 5);
  return titles.map(title => ({
    title,
    linkedin: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(title)}&company=${encodeURIComponent(company)}&origin=FACETED_SEARCH`,
    google: `https://www.google.com/search?q=site:linkedin.com/in+"${encodeURIComponent(title)}"+${encodeURIComponent(company)}`
  }));
}

// Generate a batch of discovery suggestions
export function generateDiscoverySuggestions() {
  const linkedinLinks = generateLinkedInDiscoveryLinks(8);
  const googleLinks = generateGoogleDiscoveryLinks(12);

  // Build themed discovery sections
  const sections = [
    {
      title: 'Discover ICP-Similar Companies',
      description: 'Find companies in FMCG, Beverages, Media, D2C matching your ICP',
      links: [...linkedinLinks, ...googleLinks].filter(l => l.type === 'icp' || l.type === 'icp-discovery').slice(0, 8)
    },
    {
      title: 'Discover High-Fit Cloud Targets',
      description: 'Find companies with significant cloud infrastructure & spend',
      links: [...linkedinLinks, ...googleLinks].filter(l => l.type === 'cloud' || l.type === 'cloud-discovery').slice(0, 8)
    },
    {
      title: 'Find Decision Makers',
      description: 'Search for CTOs, VP Engineering, DevOps leaders at target companies',
      links: googleLinks.filter(l => l.type === 'dm').slice(0, 6)
    },
    {
      title: 'Cloud Spend Signals',
      description: 'Find companies actively investing in cloud, hiring DevOps/SRE',
      links: googleLinks.filter(l => l.type === 'signal').slice(0, 6)
    }
  ];

  return {
    generatedAt: new Date().toISOString(),
    note: 'These links are randomly generated on each refresh. Click to discover new companies on LinkedIn and Google.',
    sections
  };
}
