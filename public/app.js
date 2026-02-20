// ============ MODE DETECTION ============
// If running on GitHub Pages (no backend), use static data
// If running with backend (localhost/Render), use API with BrightData
const isStatic = !window.location.hostname.includes('localhost') &&
  !window.location.hostname.includes('127.0.0.1') &&
  !window.location.hostname.includes('onrender.com') &&
  !window.location.hostname.includes('railway.app');

const API = isStatic ? null : '';
let brightdataEnabled = false;

// ============ STATIC DATA HELPERS ============
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getCompaniesStatic(category, { search = '', region = '', complexity = '' } = {}) {
  let list = COMPANIES_DB.filter(c => c.category === category);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(c =>
      c.company.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q) ||
      (c.cloudProviders || '').toLowerCase().includes(q)
    );
  }
  if (region) list = list.filter(c => c.region === region);
  if (complexity) list = list.filter(c => c.cloudComplexity === complexity);
  return shuffle(list);
}

function getStatsStatic() {
  const all = COMPANIES_DB;
  return {
    totalCompanies: all.length,
    icpSimilar: all.filter(c => c.category === 'icp-similar').length,
    highFit: all.filter(c => c.category === 'high-fit').length,
    indianCompanies: all.filter(c => c.region === 'India').length,
    globalCompanies: all.filter(c => c.region === 'Global').length,
    highComplexity: all.filter(c => c.cloudComplexity === 'High').length,
    targetRoles: TARGET_ROLES.length,
    verified: all.filter(c => c.verified).length
  };
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', async () => {
  loadTheme();
  buildQuickChips();

  // Check BrightData status if backend available
  if (API !== null) {
    try {
      const status = await (await fetch(`${API}/api/brightdata/status`)).json();
      brightdataEnabled = status.brightdataEnabled;
      updateBrightDataBadge();
    } catch (e) {
      console.log('Backend not available, using static mode');
    }
  }

  loadICP();
  loadHighFit();
  loadStats();

  document.getElementById('company-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchLinkedIn();
  });
});

// ============ BRIGHTDATA STATUS BADGE ============
function updateBrightDataBadge() {
  const badge = document.getElementById('bd-badge');
  if (badge) {
    if (brightdataEnabled) {
      badge.textContent = '⚡ Live LinkedIn';
      badge.className = 'bd-badge live';
      badge.title = 'BrightData connected - Live LinkedIn scraping enabled';
    } else if (API !== null) {
      badge.textContent = '📊 Static Data';
      badge.className = 'bd-badge static';
      badge.title = 'Using pre-researched company database';
    } else {
      badge.textContent = '📊 Static Data';
      badge.className = 'bd-badge static';
      badge.title = 'GitHub Pages mode - Using embedded data';
    }
  }
}

// ============ THEME ============
function toggleTheme() {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('lra-theme', t);
}
function loadTheme() {
  document.documentElement.setAttribute('data-theme', localStorage.getItem('lra-theme') || 'dark');
}

// ============ TABS ============
function switchTab(id) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-pill').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + id)?.classList.add('active');
  document.querySelector(`.nav-pill[data-tab="${id}"]`)?.classList.add('active');
  if (id === 'overview') { loadStats(); buildVerifyGrid(); }
}

// ============ LINKEDIN SEARCH ============
function searchLinkedIn() {
  const company = document.getElementById('company-input').value.trim();
  if (!company) { toast('Enter a company name'); return; }

  const role = document.getElementById('role-filter').value;
  const roleQuery = role || 'CTO OR "VP Engineering" OR "Head of Technology" OR "VP DevOps" OR "Head of DevOps" OR FinOps OR CISO OR CIO OR "Head of SRE"';

  const linkedinUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(roleQuery)}&company=${encodeURIComponent(company)}&origin=FACETED_SEARCH`;
  const googleUrl = `https://www.google.com/search?q=site:linkedin.com/in+${encodeURIComponent(company)}+${encodeURIComponent(role || 'CTO OR "VP Engineering" OR DevOps OR CISO OR CIO')}`;

  const area = document.getElementById('search-results');
  area.style.display = 'block';
  area.innerHTML = `
    <h3 style="margin-bottom:4px">Results for <span style="color:var(--accent)">${esc(company)}</span></h3>
    <p style="color:var(--text-2);font-size:0.85rem;margin-bottom:16px">Click to open LinkedIn or Google directly</p>
    <div class="result-links">
      <div class="result-link">
        <div>
          <div class="rl-label">LinkedIn People Search</div>
          <div class="rl-desc">Search for ${esc(role || 'all decision maker roles')} at ${esc(company)}</div>
        </div>
        <a href="${linkedinUrl}" target="_blank" rel="noopener">Open LinkedIn &rarr;</a>
      </div>
      <div class="result-link">
        <div>
          <div class="rl-label">Google LinkedIn Profiles</div>
          <div class="rl-desc">Find LinkedIn profiles via Google (works without LinkedIn login)</div>
        </div>
        <a href="${googleUrl}" target="_blank" rel="noopener">Open Google &rarr;</a>
      </div>
      <div class="result-link">
        <div>
          <div class="rl-label">Company LinkedIn Page</div>
          <div class="rl-desc">Visit ${esc(company)}'s company page on LinkedIn</div>
        </div>
        <a href="https://www.linkedin.com/company/${encodeURIComponent(company.toLowerCase().replace(/\s+/g, '-'))}" target="_blank" rel="noopener">Open Page &rarr;</a>
      </div>
      <div class="result-link">
        <div>
          <div class="rl-label">Google: Cloud Infrastructure</div>
          <div class="rl-desc">${esc(company)} cloud infrastructure, AWS, Azure, GCP, Kubernetes</div>
        </div>
        <a href="https://www.google.com/search?q=${encodeURIComponent(company + ' cloud infrastructure AWS Azure GCP kubernetes')}" target="_blank" rel="noopener">Verify Cloud &rarr;</a>
      </div>
      <div class="result-link">
        <div>
          <div class="rl-label">Google: Revenue & Scale</div>
          <div class="rl-desc">${esc(company)} annual revenue, financial results, company scale</div>
        </div>
        <a href="https://www.google.com/search?q=${encodeURIComponent(company + ' annual revenue financial results company size')}" target="_blank" rel="noopener">Verify Revenue &rarr;</a>
      </div>
    </div>
  `;

  window.open(linkedinUrl, '_blank');
  toast('Opening LinkedIn for ' + company);
}

// ============ QUICK CHIPS ============
function buildQuickChips() {
  const companies = [
    'Razorpay','Flipkart','Swiggy','Zomato','Dream11','Meesho','PhonePe','CRED',
    'Freshworks','Zerodha','Paytm','Ola','Nykaa','OYO','Unilever','Nestle',
    'Diageo','PepsiCo','AB InBev','Canva','Shopify','Stripe'
  ];
  const container = document.getElementById('quick-chips');
  container.innerHTML = companies.map(c =>
    `<button class="quick-chip" onclick="quickSearch('${c}')">${c}</button>`
  ).join('');
}

function quickSearch(company) {
  document.getElementById('company-input').value = company;
  searchLinkedIn();
}

// ============ ICP SIMILAR ============
async function loadICP() {
  const search = document.getElementById('icp-search-input')?.value || '';
  const region = document.getElementById('icp-region-filter')?.value || '';
  const grid = document.getElementById('icp-grid');

  // Try API mode first
  if (API !== null) {
    try {
      const params = new URLSearchParams({ limit: 200 });
      if (search) params.set('search', search);
      if (region) params.set('region', region);
      if (brightdataEnabled) params.set('live', 'true');

      grid.innerHTML = brightdataEnabled
        ? '<p style="color:var(--accent);padding:40px;text-align:center">⚡ Scraping LinkedIn live... this may take a moment</p>'
        : '';

      const data = await (await fetch(`${API}/api/icp-similar?${params}`)).json();
      document.getElementById('icp-count').textContent = data.total;

      if (data.source) {
        const srcBadge = document.getElementById('icp-source');
        if (srcBadge) srcBadge.textContent = data.source === 'hybrid' ? '⚡ Live + Static' : '📊 ' + data.source;
      }

      if (data.companies.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-3);padding:40px;text-align:center">No companies match your filters</p>';
        return;
      }
      grid.innerHTML = data.companies.map(c => companyCard(c, 'icp')).join('');
      return;
    } catch (e) {
      console.log('API unavailable, using static data');
    }
  }

  // Static fallback
  const companies = getCompaniesStatic('icp-similar', { search, region });
  document.getElementById('icp-count').textContent = companies.length;

  if (companies.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-3);padding:40px;text-align:center">No companies match your filters</p>';
    return;
  }
  grid.innerHTML = companies.map(c => companyCard(c, 'icp')).join('');
}

// ============ HIGH-FIT ============
async function loadHighFit() {
  const search = document.getElementById('hf-search-input')?.value || '';
  const region = document.getElementById('hf-region-filter')?.value || '';
  const complexity = document.getElementById('hf-complexity-filter')?.value || '';
  const grid = document.getElementById('hf-grid');

  // Try API mode first
  if (API !== null) {
    try {
      const params = new URLSearchParams({ limit: 200 });
      if (search) params.set('search', search);
      if (region) params.set('region', region);
      if (complexity) params.set('complexity', complexity);
      if (brightdataEnabled) params.set('live', 'true');

      grid.innerHTML = brightdataEnabled
        ? '<p style="color:var(--accent);padding:40px;text-align:center">⚡ Scraping LinkedIn live... this may take a moment</p>'
        : '';

      const data = await (await fetch(`${API}/api/high-fit?${params}`)).json();
      document.getElementById('hf-count').textContent = data.total;

      if (data.companies.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-3);padding:40px;text-align:center">No companies match your filters</p>';
        return;
      }
      grid.innerHTML = data.companies.map(c => companyCard(c, 'highfit')).join('');
      return;
    } catch (e) {
      console.log('API unavailable, using static data');
    }
  }

  // Static fallback
  const companies = getCompaniesStatic('high-fit', { search, region, complexity });
  document.getElementById('hf-count').textContent = companies.length;

  if (companies.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-3);padding:40px;text-align:center">No companies match your filters</p>';
    return;
  }
  grid.innerHTML = companies.map(c => companyCard(c, 'highfit')).join('');
}

// ============ CARD RENDERER ============
function companyCard(c, type) {
  const complexityClass = (c.cloudComplexity || '').toLowerCase();
  const regionClass = (c.region || '').toLowerCase();
  const linkedinCompany = c.linkedinUrl || `https://www.linkedin.com/company/${c.linkedinSlug || encodeURIComponent(c.company.toLowerCase().replace(/\s+/g, '-'))}`;
  const linkedinDM = `https://www.linkedin.com/search/results/people/?keywords=CTO+OR+"VP+Engineering"+OR+DevOps+OR+CISO+OR+CIO&company=${encodeURIComponent(c.company)}&origin=FACETED_SEARCH`;
  const googleVerify = `https://www.google.com/search?q=${encodeURIComponent(c.company + ' cloud infrastructure revenue')}`;

  const liveBadge = c.scrapedLive ? '<span class="cc-badge live-badge">⚡ LIVE</span>' : '';

  return `
    <div class="company-card ${c.scrapedLive ? 'live-scraped' : ''}">
      <div class="cc-header">
        <div>
          <div class="cc-name">${esc(c.company)} ${liveBadge}</div>
          <div class="cc-industry">${esc(c.industry)} &bull; ${esc(c.hq)}</div>
        </div>
        <div class="cc-badges">
          <span class="cc-badge ${complexityClass}">${esc(c.cloudComplexity)}</span>
          <span class="cc-badge ${regionClass}">${esc(c.region)}</span>
        </div>
      </div>

      <div class="cc-row">
        ${(c.cloudProviders || '').split(',').map(p => `<span class="cc-tag">${esc(p.trim())}</span>`).join('')}
        ${c.employeeCount ? `<span class="cc-tag">${esc(String(c.employeeCount))} employees</span>` : ''}
        ${c.followers ? `<span class="cc-tag">${Number(c.followers).toLocaleString()} followers</span>` : ''}
      </div>

      <div class="cc-section">
        <div class="cc-label">Est. Cloud Spend</div>
        <div class="cc-value spend">${esc(c.estCloudSpend)}</div>
      </div>

      <div class="cc-section">
        <div class="cc-label">Cloud Maturity Signals</div>
        <div class="cc-value">${esc(truncate(c.cloudSignals, 150))}</div>
      </div>

      <div class="cc-section">
        <div class="cc-label">Why Strong Fit for Zopnight/Zopday</div>
        <div class="cc-value">${esc(truncate(c.whyFit, 120))}</div>
      </div>

      ${type === 'icp' ? `
      <div class="cc-section">
        <div class="cc-label">ICP Similarity</div>
        <div class="cc-value">${esc(c.icpSimilarity)}</div>
      </div>` : ''}

      <div class="cc-actions">
        <a href="${linkedinDM}" target="_blank" rel="noopener" class="cc-btn primary">Decision Makers</a>
        <a href="${linkedinCompany}" target="_blank" rel="noopener" class="cc-btn">LinkedIn Page</a>
        <a href="${googleVerify}" target="_blank" rel="noopener" class="cc-btn">Verify</a>
      </div>
    </div>
  `;
}

// ============ STATS ============
async function loadStats() {
  if (API !== null) {
    try {
      const s = await (await fetch(`${API}/api/stats`)).json();
      renderStats(s);
      return;
    } catch (e) {}
  }
  renderStats(getStatsStatic());
}

function renderStats(s) {
  document.getElementById('stats-row').innerHTML = `
    <div class="stat-tile"><div class="stat-num">${s.totalCompanies}</div><div class="stat-lbl">Total Companies</div></div>
    <div class="stat-tile"><div class="stat-num">${s.icpSimilar}</div><div class="stat-lbl">ICP Match</div></div>
    <div class="stat-tile"><div class="stat-num">${s.highFit}</div><div class="stat-lbl">Cloud Targets</div></div>
    <div class="stat-tile"><div class="stat-num">${s.indianCompanies}</div><div class="stat-lbl">Indian Companies</div></div>
    <div class="stat-tile"><div class="stat-num">${s.globalCompanies}</div><div class="stat-lbl">Global Companies</div></div>
    <div class="stat-tile"><div class="stat-num">${s.highComplexity}</div><div class="stat-lbl">High Complexity</div></div>
    <div class="stat-tile"><div class="stat-num">${s.targetRoles}</div><div class="stat-lbl">Target Roles</div></div>
    <div class="stat-tile"><div class="stat-num">${s.verified}</div><div class="stat-lbl">Verified</div></div>
  `;
}

// ============ VERIFY GRID ============
function buildVerifyGrid() {
  const db = (typeof COMPANIES_DB !== 'undefined') ? COMPANIES_DB : [];
  const unique = [...new Map(db.map(c => [c.company, c])).values()];

  document.getElementById('verify-grid').innerHTML = shuffle(unique).map(c => `
    <div class="verify-card">
      <h4>${esc(c.company)}</h4>
      <div class="verify-links">
        <a class="verify-link" href="https://www.google.com/search?q=${encodeURIComponent(c.company + ' annual revenue')}" target="_blank">Revenue</a>
        <a class="verify-link" href="https://www.google.com/search?q=${encodeURIComponent(c.company + ' cloud infrastructure AWS Azure GCP')}" target="_blank">Cloud</a>
        <a class="verify-link" href="https://www.google.com/search?q=${encodeURIComponent(c.company + ' DevOps SRE hiring')}" target="_blank">DevOps</a>
        <a class="verify-link" href="https://www.google.com/search?q=${encodeURIComponent(c.company + ' technology stack')}" target="_blank">Tech</a>
        <a class="verify-link" href="https://www.linkedin.com/company/${c.linkedinSlug || encodeURIComponent(c.company.toLowerCase().replace(/\s+/g, '-'))}" target="_blank">LinkedIn</a>
      </div>
    </div>
  `).join('');
}

// ============ HELPERS ============
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function truncate(s, n) { if (!s) return ''; return s.length > n ? s.slice(0, n) + '...' : s; }
function toast(msg) {
  const box = document.getElementById('toast-box');
  const el = document.createElement('div');
  el.className = 'toast-msg';
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
