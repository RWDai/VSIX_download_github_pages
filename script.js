// Event Listeners
document.getElementById('urlGetVersionsBtn').addEventListener('click', getVersionsFromUrl);
document.getElementById('searchBtn').addEventListener('click', performSearch);
document.getElementById('version').addEventListener('change', generateDownloadLink);

// Allow Enter key to trigger actions
document.getElementById('marketplaceUrl').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') getVersionsFromUrl();
});
document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') performSearch();
});


let extensionInfo = {};

// --- Semantic Versioning Comparison ---
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;

        if (p1 > p2) return -1; // v1 is newer (descending order)
        if (p1 < p2) return 1;  // v2 is newer (descending order)
    }
    return 0; // versions are equal
}


// --- Search Functionality ---

async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const searchResultsDiv = document.getElementById('searchResults');
    const loadingDiv = document.getElementById('loading');
    
    // Clear previous state
    searchResultsDiv.innerHTML = '';
    document.getElementById('result').innerHTML = '';
    resetVersionSelect();
    // hideSelectedInfo(); // No longer needed as we moved selected info to dropdown

    if (!query) {
        searchResultsDiv.innerHTML = '<div class="alert alert-warning">Please enter a search term.</div>';
        return;
    }

    loadingDiv.style.display = 'block';

    try {
        const results = await searchMarketplace(query);
        renderSearchResults(results);
    } catch (error) {
        searchResultsDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

async function searchMarketplace(text) {
    const apiUrl = 'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery';
    const body = {
        filters: [{
            criteria: [
                { filterType: 10, value: text } // FilterType.Target = 10
            ],
            pageNumber: 1,
            pageSize: 20,
            sortBy: 0, // Relevance
            sortOrder: 0
        }],
        // Flags: IncludeFiles(2) + IncludeCategoryAndTags(4) + ExcludeNonValidated(256)
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
    if (data.results && data.results[0] && data.results[0].extensions) {
        return data.results[0].extensions;
    }
    return [];
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
        
        // Ensure that ext.versions[0] exists before trying to access its properties
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

async function selectExtension(publisher, extensionName, displayName) {
    extensionInfo = { publisher, extensionName };
    updateVersionSelectPlaceholder(displayName || `${publisher}.${extensionName}`);
    
    await fetchAndPopulateVersions(publisher, extensionName);
}

// --- URL Functionality ---

async function getVersionsFromUrl() {
    const url = document.getElementById('marketplaceUrl').value;
    const resultDiv = document.getElementById('result');
    
    resetVersionSelect();
    resultDiv.innerHTML = '';

    if (!url) {
        resultDiv.innerHTML = '<div class="alert alert-danger">Please enter a URL.</div>';
        return;
    }

    try {
        const urlObject = new URL(url);
        const itemName = urlObject.searchParams.get('itemName');

        if (!itemName) {
            resultDiv.innerHTML = '<div class="alert alert-danger">Invalid URL. Make sure it contains an "itemName".</div>';
            return;
        }

        const [publisher, extensionName] = itemName.split('.');
        extensionInfo = { publisher, extensionName };
        
        updateVersionSelectPlaceholder(itemName);
        await fetchAndPopulateVersions(publisher, extensionName);

    } catch (error) {
        resultDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
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
            generateDownloadLink(); // Generate for the latest version initially
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
        versions.sort(compareVersions); // Sort versions in descending order
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