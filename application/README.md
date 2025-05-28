# GraphQL Subscription Client

A desktop application for real-time GraphQL subscriptions.

## System Requirements

- Windows 10 or later / macOS 10.13 or later / Linux (Ubuntu 18.04 or later)
- 4GB RAM minimum
- 100MB free disk space

## Installation

### Windows
You have two options:

#### Option 1: Installer (Recommended)
1. Download `GraphQLSubscriptionClient-1.0.0.exe`
2. Double-click the installer
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

#### Option 2: Portable Version
1. Download the `win-unpacked` folder
2. Extract it to any location
3. Run `GraphQLSubscriptionClient.exe` from the folder
4. No installation required - can be run from USB drive or any location

### macOS
1. Download `GraphQLSubscriptionClient-1.0.0-mac.zip`
2. Open the zip file (double-click or right-click and select "Open")
3. The application will be extracted to a folder
4. You'll see `GraphQLSubscriptionClient.app`
5. Move the app to your Applications folder:
   - Drag and drop `GraphQLSubscriptionClient.app` to the Applications folder
   - Or copy the app and paste it in Applications
6. First-time launch:
   - Open Applications folder
   - Find `GraphQLSubscriptionClient.app`
   - Right-click (or Control+click) and select "Open"
   - Click "Open" in the security dialog
   - This only needs to be done once
7. Subsequent launches:
   - Open from Applications folder
   - Or use Spotlight (Command + Space) and type "GraphQL Subscription Client"
   - Or add to Dock for quick access

### Linux
1. Download `GraphQLSubscriptionClient-1.0.0.AppImage`
2. Make it executable:
   ```bash
   chmod +x GraphQLSubscriptionClient-1.0.0.AppImage
   ```
3. Run the application:
   ```bash
   ./GraphQLSubscriptionClient-1.0.0.AppImage
   ```

## Connecting to GraphQL Server

1. Launch the application
2. Enter the WebSocket URL of your GraphQL server (e.g., `ws://localhost:4000/graphql-subscriptions`)
3. Click "Connect"
4. Once connected, you'll see real-time updates for:
   - New users
   - New todos

## Troubleshooting

### Connection Issues
- Ensure the GraphQL server is running
- Check if the WebSocket URL is correct
- Verify network connectivity
- Check if port 4000 is open (or your configured port)

### Application Not Starting
- Windows: 
  - Installer: Run as administrator
  - Portable: Ensure all files in win-unpacked folder are present
- macOS: 
  - If app won't open: Go to System Preferences → Security & Privacy → General
  - Click "Open Anyway" for GraphQLSubscriptionClient
  - If app is damaged: Try downloading again
  - If still having issues: Check System Requirements
- Linux: Ensure the AppImage is executable

### No Updates Received
- Verify server is sending subscription events
- Check WebSocket connection status
- Ensure correct subscription queries are being used

## Support

For issues or questions:
1. Check the troubleshooting guide above
2. Open an issue on GitHub
3. Contact support at your.email@example.com

## License

ISC License 