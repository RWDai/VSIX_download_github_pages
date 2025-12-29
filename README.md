# VS Code Extension Downloader

A simple web tool to download Visual Studio Code extensions (`.vsix` files) directly from the Marketplace.

## Features

- **Search Extensions**: Search for extensions by name or keyword directly within the app.
- **Direct Download**: Enter a Marketplace URL to generate a download link.
- **Version Selection**: Choose specific versions of an extension to download.

## Usage

1. Open `index.html` in your web browser.
2. **Search Mode**:
   - Type an extension name (e.g., "Python", "Prettier").
   - Click "Search".
   - Select an extension from the list.
   - Choose a version and click "Download".
3. **URL Mode**:
   - Paste a VS Code Marketplace URL (e.g., `https://marketplace.visualstudio.com/items?itemName=ms-python.python`).
   - Click "Get Versions".
   - Choose a version and click "Download".

## Technologies

- HTML5, CSS3, JavaScript (ES6+)
- [Bootstrap 5](https://getbootstrap.com/) for styling
- [Visual Studio Marketplace API](https://github.com/microsoft/vsmarketplace-api) for fetching data

## License

MIT