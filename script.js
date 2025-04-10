// --- Constants and State ---
const LOCAL_STORAGE_KEY = 'webClipGeneratorConfig';
const iconPreview = document.getElementById('iconPreview');
const iconFileInput = document.getElementById('iconFile');
const statusDiv = document.getElementById('status');
const generateButton = document.getElementById('generateButton');
const resetButton = document.getElementById('resetButton');
const saveConfigButton = document.getElementById('saveConfigButton');
const loadConfigButton = document.getElementById('loadConfigButton');
const profileForm = document.getElementById('profileForm');
const websiteUrlInput = document.getElementById('websiteUrl');

// --- Helper Functions ---

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16).toUpperCase();
    });
}

const escapeXml = (unsafe) => {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) { case '<': return '<'; case '>': return '>'; case '&': return '&'; case '\'': return '\''; case '"': return '"'; }
    });
};

function setStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = type;
}

function clearStatus() {
    setStatus('');
}

function clearIconPreview() {
     iconPreview.src = '';
     iconPreview.classList.remove('visible');
}

function showIconPreview(dataUrl) {
    iconPreview.src = dataUrl;
    iconPreview.classList.add('visible');
}

// --- Profile Generation ---

function generateMobileConfig(label, url, iconBase64, profileDisplayName, profileOrg, isFullScreen, consentText) {
    // (This function remains unchanged from the previous version)
    const profileUUID = generateUUID();
    const payloadUUID = generateUUID();
    const profileIdentifier = `com.example.webclip.${profileUUID}`;

    const escapedLabel = escapeXml(label);
    const escapedUrl = escapeXml(url);
    const escapedProfileDisplayName = escapeXml(profileDisplayName);
    const escapedProfileOrg = escapeXml(profileOrg);
    const escapedConsentText = escapeXml(consentText);

    const consentDictString = escapedConsentText ? `
    <key>ConsentText</key>
    <dict>
        <key>default</key>
        <string>${escapedConsentText}</string>
    </dict>` : '';

    const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>${consentDictString}
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
    // (This function remains unchanged)
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

// --- Event Listeners ---

// Form Submission
profileForm.addEventListener('submit', function(event) {
    event.preventDefault();
    clearStatus();
    setStatus('Processing...', 'info');
    generateButton.disabled = true;

    const labelName = document.getElementById('labelName').value.trim();
    const websiteUrl = websiteUrlInput.value.trim();
    const iconFile = iconFileInput.files[0];
    const isFullScreen = document.getElementById('fullscreenToggle').checked;
    const profileName = document.getElementById('profileName').value.trim() || `Web Clip: ${labelName}`;
    const profileOrg = document.getElementById('profileOrg').value.trim() || 'Self-Generated';
    const consentText = document.getElementById('consentText').value.trim();

    // --- Validation ---
    if (!labelName) {
        setStatus('Error: Shortcut Name (Label) is required.', 'error');
        generateButton.disabled = false; return;
    }
    if (!websiteUrl) {
        setStatus('Error: Website URL is required.', 'error');
        generateButton.disabled = false; return;
    }
    try {
        const parsedUrl = new URL(websiteUrl);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
             throw new Error('URL must start with http:// or https://');
        }
    } catch (e) {
        setStatus(`Error: Invalid Website URL. ${e.message || ''}`, 'error');
        generateButton.disabled = false; return;
    }
    // Icon file is now always required
    if (!iconFile) {
        setStatus('Error: Please select an icon image.', 'error');
        generateButton.disabled = false; return;
    }
    if (!iconFile.type.startsWith('image/')) {
         setStatus('Error: Selected icon file must be an image (PNG or JPEG recommended).', 'error');
         generateButton.disabled = false; return;
     }
    // --- End Validation ---

    // Read the selected file
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64IconData = e.target.result.split(',')[1];
        const profileContent = generateMobileConfig(labelName, websiteUrl, base64IconData, profileName, profileOrg, isFullScreen, consentText);
        downloadMobileConfig(profileContent, labelName);
        setStatus(`Profile '${labelName}.mobileconfig' generated successfully.`, 'success');
        generateButton.disabled = false;
    };
    reader.onerror = function(e) {
        setStatus('Error reading icon file.', 'error');
        console.error("FileReader error:", e);
        generateButton.disabled = false;
    };
    reader.readAsDataURL(iconFile);
});

// Icon File Input Change (for Preview & Validation)
iconFileInput.addEventListener('change', function(event) {
    clearStatus();
    const file = event.target.files[0];

    if (file) {
        if (!file.type.startsWith('image/')) {
            setStatus('Error: Selected file must be an image (PNG or JPEG recommended).', 'error');
            clearIconPreview();
            iconFileInput.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) { showIconPreview(e.target.result); }
        reader.onerror = function(e) { setStatus('Error reading file for preview.', 'error'); console.error("Preview FileReader error:", e); clearIconPreview(); }
        reader.readAsDataURL(file);
    } else {
        clearIconPreview();
    }
});

// Reset Button
resetButton.addEventListener('click', function() {
    profileForm.reset();
    clearIconPreview();
    clearStatus();
    generateButton.disabled = false;
    iconFileInput.required = true; // Ensure file is required after reset
});

// Save Config Button
saveConfigButton.addEventListener('click', function() {
    // (This listener remains unchanged)
    clearStatus();
    const config = {
        labelName: document.getElementById('labelName').value,
        websiteUrl: websiteUrlInput.value,
        fullscreenToggle: document.getElementById('fullscreenToggle').checked,
        profileName: document.getElementById('profileName').value,
        profileOrg: document.getElementById('profileOrg').value,
        consentText: document.getElementById('consentText').value,
    };
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
        setStatus('Configuration saved successfully.', 'success');
    } catch (e) {
        setStatus('Error saving configuration to local storage.', 'error');
        console.error("Local storage save error:", e);
    }
});

// Load Config Button
loadConfigButton.addEventListener('click', function() {
    // (This listener remains unchanged, but we ensure file input is required)
    clearStatus();
    try {
        const savedConfig = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            document.getElementById('labelName').value = config.labelName || '';
            websiteUrlInput.value = config.websiteUrl || '';
            document.getElementById('fullscreenToggle').checked = config.fullscreenToggle || false;
            document.getElementById('profileName').value = config.profileName || '';
            document.getElementById('profileOrg').value = config.profileOrg || '';
            document.getElementById('consentText').value = config.consentText || '';
            iconFileInput.value = '';
            clearIconPreview();
             iconFileInput.required = true; // Ensure file is required after load
            setStatus('Configuration loaded. Please select an icon.', 'info');
        } else {
            setStatus('No saved configuration found.', 'info');
        }
    } catch (e) {
        setStatus('Error loading configuration from local storage.', 'error');
        console.error("Local storage load error:", e);
        iconFileInput.required = true; // Ensure file is required even on load error
    }
});


// Checkbox interaction code (remains the same)
document.querySelectorAll('.checkbox-container').forEach(container => {
    container.addEventListener('click', (event) => { if (event.target.type !== 'checkbox' && event.target.tagName !== 'A') { const cb = container.querySelector('input[type="checkbox"]'); if (cb) { cb.checked = !cb.checked; } } });
    container.addEventListener('keydown', (event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); const cb = container.querySelector('input[type="checkbox"]'); if (cb) { cb.checked = !cb.checked; } } });
});