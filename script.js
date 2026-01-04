// State management
let extensionInfo = {};
let searchState = {
    query: '',
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0
};
let autocompleteTimeout = null;
let autocompleteActiveIndex = -1;

// Event Listeners
document.getElementById('urlGetVersionsBtn').addEventListener('click', getVersionsFromUrl);
document.getElementById('searchBtn').addEventListener('click', () => performSearch(1));
document.getElementById('version').addEventListener('change', generateDownloadLink);
document.getElementById('prevPageBtn').addEventListener('click', () => performSearch(searchState.pageNumber - 1));
document.getElementById('nextPageBtn').addEventListener('click', () => performSearch(searchState.pageNumber + 1));
document.getElementById('pasteBtn').addEventListener('click', pasteFromClipboard);

// Mode Toggle Listeners
document.querySelectorAll('input[name="inputMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const mode = e.target.id;
        toggleMode(mode);
    });
});

function toggleMode(modeId) {
    const searchSection = document.getElementById('search-section');
    const urlSection = document.getElementById('url-section');

    if (modeId === 'modeSearch') {
        searchSection.classList.remove('d-none');
        urlSection.classList.add('d-none');
    } else {
        searchSection.classList.add('d-none');
        urlSection.classList.remove('d-none');
    }
}

// Allow Enter key to trigger actions
document.getElementById('marketplaceUrl').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') getVersionsFromUrl();
});
document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        hideAutocomplete();
        performSearch(1);
    }
});

// Autocomplete input handler
document.getElementById('searchInput').addEventListener('input', function (e) {
    const query = e.target.value.trim();

    if (autocompleteTimeout) {
        clearTimeout(autocompleteTimeout);
    }

    if (query.length < 2) {
        hideAutocomplete();
        return;
    }

    autocompleteTimeout = setTimeout(() => {
        fetchAutocomplete(query);
    }, 300);
});

// Hide autocomplete when clicking outside
document.addEventListener('click', function (e) {
    const dropdown = document.getElementById('autocompleteDropdown');
    const searchInput = document.getElementById('searchInput');
    if (!dropdown.contains(e.target) && e.target !== searchInput) {
        hideAutocomplete();
    }
});

// Keyboard navigation for autocomplete
document.getElementById('searchInput').addEventListener('keydown', function (e) {
    const dropdown = document.getElementById('autocompleteDropdown');
    if (dropdown.classList.contains('d-none')) return;

    const items = dropdown.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        autocompleteActiveIndex = Math.min(autocompleteActiveIndex + 1, items.length - 1);
        updateAutocompleteActive(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        autocompleteActiveIndex = Math.max(autocompleteActiveIndex - 1, 0);
        updateAutocompleteActive(items);
    } else if (e.key === 'Escape') {
        hideAutocomplete();
    } else if (e.key === 'Enter' && autocompleteActiveIndex >= 0) {
        e.preventDefault();
        items[autocompleteActiveIndex].click();
    }
});

function updateAutocompleteActive(items) {
    items.forEach((item, idx) => {
        item.classList.toggle('active', idx === autocompleteActiveIndex);
    });
}

// URL input real-time parsing
document.getElementById('marketplaceUrl').addEventListener('input', function (e) {
    const value = e.target.value.trim();
    parseAndPreviewUrl(value);
});

function parseAndPreviewUrl(value) {
    const urlPreview = document.getElementById('urlPreview');
    const urlPreviewText = document.getElementById('urlPreviewText');

    if (!value) {
        urlPreview.classList.add('d-none');
        return;
    }

    const parsed = parseExtensionInput(value);
    if (parsed) {
        urlPreviewText.textContent = `${parsed.publisher}.${parsed.extensionName}`;
        urlPreview.classList.remove('d-none');
    } else {
        urlPreview.classList.add('d-none');
    }
}

function parseExtensionInput(input) {
    // Try parsing as URL first
    try {
        const urlObject = new URL(input);
        const itemName = urlObject.searchParams.get('itemName');
        if (itemName && itemName.includes('.')) {
            const [publisher, extensionName] = itemName.split('.');
            return { publisher, extensionName };
        }
    } catch (e) {
        // Not a URL, try as extension ID
    }

    // Try parsing as extension ID (publisher.extension)
    if (input.includes('.') && !input.includes('/') && !input.includes(':')) {
        const parts = input.split('.');
        if (parts.length >= 2) {
            const publisher = parts[0];
            const extensionName = parts.slice(1).join('.');
            return { publisher, extensionName };
        }
    }

    return null;
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        const urlInput = document.getElementById('marketplaceUrl');
        urlInput.value = text;
        parseAndPreviewUrl(text);
    } catch (err) {
        console.error('Failed to read clipboard:', err);
    }
}

// --- Semantic Versioning Comparison ---
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;

        if (p1 > p2) return -1;
        if (p1 < p2) return 1;
    }
    return 0;
}

// --- Autocomplete Functionality ---

async function fetchAutocomplete(query) {
    const dropdown = document.getElementById('autocompleteDropdown');
    dropdown.innerHTML = '<div class="autocomplete-loading">Searching...</div>';
    dropdown.classList.remove('d-none');
    autocompleteActiveIndex = -1;

    try {
        const results = await searchMarketplace(query, 1, 6);
        renderAutocomplete(results.extensions);
    } catch (error) {
        dropdown.innerHTML = '<div class="autocomplete-loading text-danger">Error loading suggestions</div>';
    }
}

function renderAutocomplete(extensions) {
    const dropdown = document.getElementById('autocompleteDropdown');

    if (extensions.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-loading">No results found</div>';
        return;
    }

    dropdown.innerHTML = '';
    extensions.forEach(ext => {
        const iconUrl = ext.versions && ext.versions[0] && ext.versions[0].files
            ? ext.versions[0].files.find(f => f.assetType === 'Microsoft.VisualStudio.Services.Icons.Default')?.source
            : 'https://via.placeholder.com/24';

        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `
            <img src="${iconUrl}" alt="icon">
            <div class="autocomplete-item-info">
                <div class="autocomplete-item-name">${ext.displayName}</div>
                <div class="autocomplete-item-publisher">${ext.publisher.displayName}</div>
            </div>
        `;
        item.onclick = () => {
            hideAutocomplete();
            selectExtension(ext.publisher.publisherName, ext.extensionName, ext.displayName);
        };
        dropdown.appendChild(item);
    });
}

function hideAutocomplete() {
    const dropdown = document.getElementById('autocompleteDropdown');
    dropdown.classList.add('d-none');
    dropdown.innerHTML = '';
    autocompleteActiveIndex = -1;
}

// --- Search Functionality with Pagination ---

async function performSearch(pageNumber = 1) {
    const query = document.getElementById('searchInput').value.trim();
    const searchResultsDiv = document.getElementById('searchResults');
    const loadingDiv = document.getElementById('loading');
    const paginationDiv = document.getElementById('pagination');

    // Clear previous state
    searchResultsDiv.innerHTML = '';
    paginationDiv.classList.add('d-none');
    document.getElementById('result').innerHTML = '';
    resetVersionSelect();

    if (!query) {
        searchResultsDiv.innerHTML = '<div class="alert alert-warning">Please enter a search term.</div>';
        return;
    }

    loadingDiv.style.display = 'block';
    searchState.query = query;
    searchState.pageNumber = pageNumber;

    try {
        const results = await searchMarketplace(query, pageNumber, searchState.pageSize);
        searchState.totalCount = results.totalCount;
        renderSearchResults(results.extensions);
        updatePagination();
    } catch (error) {
        searchResultsDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

async function searchMarketplace(text, pageNumber = 1, pageSize = 10) {
    const apiUrl = 'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery';
    const body = {
        filters: [{
            criteria: [
                { filterType: 10, value: text }
            ],
            pageNumber: pageNumber,
            pageSize: pageSize,
            sortBy: 0,
            sortOrder: 0
        }],
        flags: 0x2 | 0x4 | 0x100
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json;api-version=3.0-preview.1'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.results && data.results[0]) {
        return {
            extensions: data.results[0].extensions || [],
            totalCount: data.results[0].resultMetadata?.find(m => m.metadataType === 'ResultCount')?.metadataItems?.find(i => i.name === 'TotalCount')?.count || 0
        };
    }
    return { extensions: [], totalCount: 0 };
}

function renderSearchResults(extensions) {
    const searchResultsDiv = document.getElementById('searchResults');

    if (extensions.length === 0) {
        searchResultsDiv.innerHTML = '<div class="alert alert-info">No extensions found.</div>';
        return;
    }

    extensions.forEach(ext => {
        const item = document.createElement('button');
        item.className = 'list-group-item list-group-item-action';

        const iconUrl = ext.versions && ext.versions[0] && ext.versions[0].files
                        ? ext.versions[0].files.find(f => f.assetType === 'Microsoft.VisualStudio.Services.Icons.Default')?.source
                        : 'https://via.placeholder.com/40';

        item.innerHTML = `
            <div class="d-flex w-100 justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <img src="${iconUrl}" alt="icon" style="width: 40px; height: 40px; margin-right: 15px;">
                    <div>
                        <h6 class="mb-1 fw-bold">${ext.displayName}</h6>
                        <small class="text-muted">${ext.publisher.displayName} (${ext.publisher.publisherName})</small>
                    </div>
                </div>
            </div>
            <p class="mb-1 mt-2 small text-truncate">${ext.shortDescription || 'No description available.'}</p>
        `;

        item.onclick = () => selectExtension(ext.publisher.publisherName, ext.extensionName, ext.displayName);
        searchResultsDiv.appendChild(item);
    });
}

function updatePagination() {
    const paginationDiv = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');

    const totalPages = Math.ceil(searchState.totalCount / searchState.pageSize);

    if (totalPages <= 1) {
        paginationDiv.classList.add('d-none');
        return;
    }

    paginationDiv.classList.remove('d-none');

    prevBtn.disabled = searchState.pageNumber <= 1;
    nextBtn.disabled = searchState.pageNumber >= totalPages;

    const startItem = (searchState.pageNumber - 1) * searchState.pageSize + 1;
    const endItem = Math.min(searchState.pageNumber * searchState.pageSize, searchState.totalCount);
    pageInfo.textContent = `${startItem}-${endItem} of ${searchState.totalCount}`;
}

async function selectExtension(publisher, extensionName, displayName) {
    extensionInfo = { publisher, extensionName };
    updateVersionSelectPlaceholder(displayName || `${publisher}.${extensionName}`);

    await fetchAndPopulateVersions(publisher, extensionName);
}

// --- URL Functionality ---

async function getVersionsFromUrl() {
    const input = document.getElementById('marketplaceUrl').value.trim();
    const resultDiv = document.getElementById('result');

    resetVersionSelect();
    resultDiv.innerHTML = '';

    if (!input) {
        resultDiv.innerHTML = '<div class="alert alert-danger">Please enter a URL or extension ID.</div>';
        return;
    }

    const parsed = parseExtensionInput(input);
    if (!parsed) {
        resultDiv.innerHTML = '<div class="alert alert-danger">Invalid input. Use full URL or extension ID (publisher.extension).</div>';
        return;
    }

    extensionInfo = parsed;
    updateVersionSelectPlaceholder(`${parsed.publisher}.${parsed.extensionName}`);
    await fetchAndPopulateVersions(parsed.publisher, parsed.extensionName);
}

// --- Common Logic ---

function updateVersionSelectPlaceholder(extensionDisplayName) {
    const versionSelect = document.getElementById('version');
    versionSelect.querySelector('option').textContent = `Loading versions for ${extensionDisplayName}...`;
}


function resetVersionSelect() {
    const versionSelect = document.getElementById('version');
    versionSelect.innerHTML = '<option selected>Select an extension or enter URL first</option>';
    versionSelect.disabled = true;
}

async function fetchAndPopulateVersions(publisher, extensionName) {
    const loadingDiv = document.getElementById('loading');
    const versionSelect = document.getElementById('version');
    const resultDiv = document.getElementById('result');

    loadingDiv.style.display = 'block';
    versionSelect.innerHTML = '<option selected>Loading versions...</option>';
    versionSelect.disabled = true;

    try {
        const versions = await fetchExtensionVersions(publisher, extensionName);

        versionSelect.innerHTML = '';
        if (versions.length > 0) {
            versions.forEach(version => {
                const option = document.createElement('option');
                option.value = version;
                option.textContent = version;
                versionSelect.appendChild(option);
            });
            versionSelect.disabled = false;
            generateDownloadLink();
        } else {
            versionSelect.innerHTML = '<option selected>No versions found</option>';
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="alert alert-danger">Error fetching versions: ${error.message}</div>`;
        versionSelect.innerHTML = '<option selected>Error loading versions</option>';
    } finally {
        loadingDiv.style.display = 'none';
    }
}

async function fetchExtensionVersions(publisher, extensionName) {
    const apiUrl = 'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery';
    const body = {
        filters: [{
            criteria: [
                { filterType: 7, value: `${publisher}.${extensionName}` }
            ]
        }],
        flags: 0x2 | 0x4 | 0x80 | 0x100
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json;api-version=3.0-preview.1'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.results && data.results[0] && data.results[0].extensions && data.results[0].extensions[0] && data.results[0].extensions[0].versions) {
        let versions = data.results[0].extensions[0].versions.map(v => v.version);
        versions.sort(compareVersions);
        return versions;
    }

    return [];
}

function generateDownloadLink() {
    const version = document.getElementById('version').value;
    const resultDiv = document.getElementById('result');
    const { publisher, extensionName } = extensionInfo;

    if (!publisher || !extensionName || !version || version.startsWith('Select') || version.startsWith('Loading')) {
        resultDiv.innerHTML = '';
        return;
    }

    const downloadUrl = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extensionName}/${version}/vspackage`;

    resultDiv.innerHTML = `
        <div class="card mt-4">
            <div class="card-body">
                <h5 class="card-title">Download Link</h5>
                <p class="card-text">Extension: <strong>${publisher}.${extensionName}</strong></p>
                <p class="card-text">Version: <strong>${version}</strong></p>
                <a href="${downloadUrl}" class="btn btn-success w-100" download>Download .vsix</a>
                <div class="mt-2 text-center">
                    <small class="text-muted"><a href="${downloadUrl}" target="_blank" class="text-decoration-none text-muted">Direct Link</a></small>
                </div>
            </div>
        </div>
    `;
}
