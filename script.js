document.getElementById('generateBtn').addEventListener('click', getVersions);
document.getElementById('version').addEventListener('change', generateDownloadLink);

let extensionInfo = {};

async function getVersions() {
    const url = document.getElementById('marketplaceUrl').value;
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const versionSelect = document.getElementById('version');

    resultDiv.innerHTML = '';
    versionSelect.innerHTML = '<option selected>Loading versions...</option>';
    versionSelect.disabled = true;

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

        loadingDiv.style.display = 'block';

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
        resultDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

function generateDownloadLink() {
    const version = document.getElementById('version').value;
    const resultDiv = document.getElementById('result');
    const { publisher, extensionName } = extensionInfo;

    if (!publisher || !extensionName || !version) {
        resultDiv.innerHTML = '';
        return;
    }

    const downloadUrl = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extensionName}/${version}/vspackage`;

    resultDiv.innerHTML = `
        <div class="card mt-4">
            <div class="card-body">
                <h5 class="card-title">Download Link</h5>
                <p class="card-text">Version: <strong>${version}</strong></p>
                <a href="${downloadUrl}" target="_blank" rel="noopener noreferrer" class="card-link">${downloadUrl}</a>
                <div class="d-grid mt-3">
                    <a href="${downloadUrl}" class="btn btn-success" download>Download VSIX</a>
                </div>
            </div>
        </div>
    `;
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
        const versions = data.results[0].extensions[0].versions.map(v => v.version);
        return versions.reverse(); // Show latest versions first
    }

    return [];
}

