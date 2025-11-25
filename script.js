document.getElementById('generateBtn').addEventListener('click', () => {
    const url = document.getElementById('marketplaceUrl').value;
    const resultDiv = document.getElementById('result');

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
        const downloadUrl = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extensionName}/latest/vspackage`;

        resultDiv.innerHTML = `
            <div class="alert alert-success">
                <p><strong>Download Link:</strong></p>
                <a href="${downloadUrl}" target="_blank" rel="noopener noreferrer">${downloadUrl}</a>
                <div class="d-grid mt-2">
                    <a href="${downloadUrl}" class="btn btn-success" download>Download VSIX</a>
                </div>
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = '<div class="alert alert-danger">Invalid URL format.</div>';
    }
});
