document.getElementById('profileForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const labelName = document.getElementById('labelName').value.trim();
    const websiteUrl = document.getElementById('websiteUrl').value.trim();
    const iconFile = document.getElementById('iconFile').files[0];
    const isFullScreen = document.getElementById('fullscreenToggle').checked;
    const profileName = document.getElementById('profileName').value.trim() || `Web Clip: ${labelName}`;
    const profileOrg = document.getElementById('profileOrg').value.trim() || 'Self-Generated';
    const consentText = document.getElementById('consentText').value.trim();
    const statusDiv = document.getElementById('status');
    const generateButton = document.getElementById('generateButton');

    statusDiv.textContent = 'Processing...';
    generateButton.disabled = true;

    if (!labelName || !websiteUrl || !iconFile) {
        statusDiv.textContent = 'Error: Please fill in all required fields (Name, URL, Icon).';
        generateButton.disabled = false;
        return;
    }

    try {
        new URL(websiteUrl);
    } catch (_) {
        statusDiv.textContent = 'Error: Invalid Website URL format.';
         generateButton.disabled = false;
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        const base64IconData = e.target.result.split(',')[1];
        const profileContent = generateMobileConfig(
            labelName,
            websiteUrl,
            base64IconData,
            profileName,
            profileOrg,
            isFullScreen,
            consentText
        );

        downloadMobileConfig(profileContent, labelName);
        statusDiv.textContent = `Profile '${labelName}.mobileconfig' generated successfully. Check your downloads.`;
        generateButton.disabled = false;
    };

    reader.onerror = function(e) {
        statusDiv.textContent = 'Error reading icon file.';
        console.error("FileReader error:", e);
        generateButton.disabled = false;
    };

    reader.readAsDataURL(iconFile);
});

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16).toUpperCase();
    });
}

// XML Escape basic characters in user input
const escapeXml = (unsafe) => {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '<';
            case '>': return '>';
            case '&': return '&';
            case '\'': return '\'';
            case '"': return '"';
        }
    });
};

function generateMobileConfig(label, url, iconBase64, profileDisplayName, profileOrg, isFullScreen, consentText) {
    const profileUUID = generateUUID();
    const payloadUUID = generateUUID();
    const profileIdentifier = `com.example.webclip.${profileUUID}`;

    const escapedLabel = escapeXml(label);
    const escapedUrl = escapeXml(url);
    const escapedProfileDisplayName = escapeXml(profileDisplayName);
    const escapedProfileOrg = escapeXml(profileOrg);
    const escapedConsentText = escapeXml(consentText); // Escape consent text

    // Conditionally create the ConsentText dictionary string
    const consentDictString = escapedConsentText ? `
    <key>ConsentText</key>
    <dict>
        <key>default</key>
        <string>${escapedConsentText}</string>
    </dict>` : '';

    // .mobileconfig XML structure
    const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>${consentDictString} <!-- Inject ConsentText dict here -->
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <${isFullScreen ? 'true' : 'false'}/>
            <key>Icon</key>
            <data>${iconBase64}</data>
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>${escapedLabel}</string>
            <key>PayloadDescription</key>
            <string>Adds a web clip for ${escapedLabel}</string>
            <key>PayloadDisplayName</key>
            <string>Web Clip (${escapedLabel})</string>
            <key>PayloadIdentifier</key>
            <string>${profileIdentifier}.webclip.${payloadUUID}</string>
            <key>PayloadOrganization</key>
            <string>${escapedProfileOrg}</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>${payloadUUID}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>${escapedUrl}</string>
        </dict>
    </array>
    <key>PayloadDescription</key>
    <string>Adds one or more Web Clips to the Home screen</string>
    <key>PayloadDisplayName</key>
    <string>${escapedProfileDisplayName}</string>
    <key>PayloadIdentifier</key>
    <string>${profileIdentifier}</string>
    <key>PayloadOrganization</key>
    <string>${escapedProfileOrg}</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadScope</key>
    <string>User</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${profileUUID}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

    return xmlString;
}

function downloadMobileConfig(content, label) {
    const filename = `${label.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'webclip'}.mobileconfig`;
    const mimeType = 'application/x-apple-aspen-config';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Checkbox interaction code
document.querySelectorAll('.checkbox-container').forEach(container => {
    container.addEventListener('click', (event) => {
        if (event.target.type !== 'checkbox' && event.target.tagName !== 'A') {
            const checkbox = container.querySelector('input[type="checkbox"]');
            if (checkbox) { checkbox.checked = !checkbox.checked; }
        }
    });
    container.addEventListener('keydown', (event) => {
        if (event.key === ' ' || event.key === 'Enter') {
             event.preventDefault();
             const checkbox = container.querySelector('input[type="checkbox"]');
            if (checkbox) { checkbox.checked = !checkbox.checked; }
        }
    });
});