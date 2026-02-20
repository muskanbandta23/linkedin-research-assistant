// ============ STATIC DATA HELPERS ============
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getCompanies(category, { search = '', region = '', complexity = '' } = {}) {
  let list = COMPANIES_DB.filter(c => c.category === category);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(c =>
      c.company.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q) ||
      (c.cloudProviders || '').toLowerCase().includes(q) ||
      (c.hq || '').toLowerCase().includes(q)
    );
  }
  if (region) list = list.filter(c => c.region === region);
  if (complexity) list = list.filter(c => c.cloudComplexity === complexity);
  return shuffle(list);
}

function getStats() {
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
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  loadICP();
  loadHighFit();
  loadStats();
  buildQuickChips();

  document.getElementById('company-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchLinkedIn();
  });
});

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
  if (id === 'discover') { loadDiscovery(); }
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
function loadICP() {
  const search = document.getElementById('icp-search-input')?.value || '';
  const region = document.getElementById('icp-region-filter')?.value || '';
  const companies = getCompanies('icp-similar', { search, region });

  document.getElementById('icp-count').textContent = companies.length;

  const grid = document.getElementById('icp-grid');
  if (companies.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-3);padding:40px;text-align:center">No companies match your filters</p>';
    return;
  }
  grid.innerHTML = companies.map(c => companyCard(c, 'icp')).join('');
}

// ============ HIGH-FIT ============
function loadHighFit() {
  const search = document.getElementById('hf-search-input')?.value || '';
  const region = document.getElementById('hf-region-filter')?.value || '';
  const complexity = document.getElementById('hf-complexity-filter')?.value || '';
  const companies = getCompanies('high-fit', { search, region, complexity });

  document.getElementById('hf-count').textContent = companies.length;

  const grid = document.getElementById('hf-grid');
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
  const linkedinCompany = `https://www.linkedin.com/company/${c.linkedinSlug || encodeURIComponent(c.company.toLowerCase().replace(/\s+/g, '-'))}`;
  const linkedinDM = `https://www.linkedin.com/search/results/people/?keywords=CTO+OR+"VP+Engineering"+OR+DevOps+OR+CISO+OR+CIO&company=${encodeURIComponent(c.company)}&origin=FACETED_SEARCH`;
  const googleVerify = `https://www.google.com/search?q=${encodeURIComponent(c.company + ' cloud infrastructure revenue')}`;

  return `
    <div class="company-card">
      <div class="cc-header">
        <div>
          <div class="cc-name">${esc(c.company)}</div>
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
function loadStats() {
  const s = getStats();
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
  const unique = [...new Map(COMPANIES_DB.map(c => [c.company, c])).values()];

  document.getElementById('verify-grid').innerHTML = shuffle(unique).slice(0, 50).map(c => `
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
