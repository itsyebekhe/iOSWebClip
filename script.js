// --- Constants and State ---
const LOCAL_STORAGE_KEY = 'webClipGeneratorConfig_Multi_v2'; // Updated key for new fields
const webclipsContainer = document.getElementById('webclipsContainer');
const statusText = document.getElementById('statusText');
const loadingSpinner = document.getElementById('loadingSpinner');
const generateButton = document.getElementById('generateButton');
const resetButton = document.getElementById('resetButton');
const saveConfigButton = document.getElementById('saveConfigButton');
const loadConfigButton = document.getElementById('loadConfigButton');
const addWebclipButton = document.getElementById('addWebclipButton');
const profileForm = document.getElementById('profileForm');

// Default icon (simple globe - replace with a better Base64 encoded PNG if desired)
const DEFAULT_ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAACXBIWXMAAAsTAAALEwEAmpwYAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgpMwidZAAADvUlEQVR4Ae2bQW7bMBAgF<0xE2><0x86><0xAA>QZgAAAABJRU5ErkJggg=='; // Placeholder, find a real Base64 globe/link icon

let webclipEntryCounter = 1;

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
function showSpinner() { loadingSpinner.style.display = 'inline-block'; statusText.textContent = ''; statusText.className = ''; }
function hideSpinner() { loadingSpinner.style.display = 'none'; }
function setStatus(message, type = 'info') { hideSpinner(); statusText.textContent = message; statusText.className = type; }
function clearStatus() { hideSpinner(); setStatus(''); }
function getIconPreviewElement(entryElement) { return entryElement.querySelector('.icon-preview'); }
function clearIconPreview(entryElement) {
    const preview = getIconPreviewElement(entryElement);
    if (preview) { preview.src = ''; preview.classList.remove('visible'); }
}
function showIconPreview(entryElement, dataUrl) {
    const preview = getIconPreviewElement(entryElement);
     if (preview) { preview.src = dataUrl; preview.classList.add('visible'); }
}
function sanitizeFilename(name) {
    // Remove invalid chars, trim, replace spaces with underscores
    return (name || '').replace(/[<>:"/\\|?*\s]+/g, '_').replace(/^_|_$/g, '').trim();
}

// --- Dynamic WebClip Entry Handling ---

function createWebclipEntryElement(id) {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'webclip-entry';
    entryDiv.dataset.entryId = id;
    entryDiv.innerHTML = `
        <button type="button" class="remove-webclip-btn" title="Remove this web clip">×</button>
        <div class="input-pair">
            <label for="labelName_${id}">Shortcut Name (Label):</label>
            <input type="text" id="labelName_${id}" name="labelName" placeholder="e.g., Another Site" required>
        </div>
        <div class="input-pair">
            <label for="websiteUrl_${id}">Website URL:</label>
            <input type="url" id="websiteUrl_${id}" name="websiteUrl" placeholder="https://othersite.com" required>
        </div>
        <div class="input-pair">
             <label for="iconFile_${id}">Icon Image (PNG/JPEG, Optional):</label>
             <input type="file" id="iconFile_${id}" name="iconFile" accept="image/png, image/jpeg">
             <small style="display: block; margin-top: 3px; font-size: 0.8em;">If left blank, a default icon will be used.</small>
             <div class="icon-preview-container">
                 <img class="icon-preview" id="iconPreview_${id}" src="" alt="Icon Preview">
             </div>
         </div>
         <div class="input-pair checkbox-container" tabindex="0">
             <input type="checkbox" id="fullscreenToggle_${id}" name="fullscreenToggle">
             <label for="fullscreenToggle_${id}"> Open in Full Screen Mode?</label>
         </div>
    `;
    addListenersToEntry(entryDiv);
    return entryDiv;
}

function addListenersToEntry(entryElement) {
    const fileInput = entryElement.querySelector('input[type="file"]');
    const removeBtn = entryElement.querySelector('.remove-webclip-btn');
    const checkboxContainer = entryElement.querySelector('.checkbox-container');

    fileInput.addEventListener('change', (event) => handleFileInputChange(event, entryElement));
    removeBtn.addEventListener('click', () => { entryElement.remove(); updateRemoveButtonsState(); clearStatus(); });

    if (checkboxContainer) {
         checkboxContainer.addEventListener('click', (event) => { if (event.target.type !== 'checkbox' && event.target.tagName !== 'A') { const cb = checkboxContainer.querySelector('input[type="checkbox"]'); if (cb) { cb.checked = !cb.checked; } } });
         checkboxContainer.addEventListener('keydown', (event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); const cb = checkboxContainer.querySelector('input[type="checkbox"]'); if (cb) { cb.checked = !cb.checked; } } });
     }
}

function handleFileInputChange(event, entryElement) {
     clearStatus();
     const file = event.target.files[0];
     const fileInput = event.target;
     if (file) {
         if (!file.type.startsWith('image/')) { setStatus(`Error in entry: Selected file must be an image.`, 'error'); clearIconPreview(entryElement); fileInput.value = ''; return; }
         const reader = new FileReader();
         reader.onload = function(e) { showIconPreview(entryElement, e.target.result); }
         reader.onerror = function(e) { setStatus(`Error reading file for preview.`, 'error'); console.error("Preview FileReader error:", e); clearIconPreview(entryElement); }
         reader.readAsDataURL(file);
     } else {
         clearIconPreview(entryElement);
     }
 }

function updateRemoveButtonsState() {
    const entries = webclipsContainer.querySelectorAll('.webclip-entry');
    entries.forEach((entry) => {
        const removeBtn = entry.querySelector('.remove-webclip-btn');
        if (removeBtn) { removeBtn.disabled = (entries.length <= 1); }
    });
}

// --- Profile Generation ---

function readFileAsBase64(file) {
    return new Promise((resolve) => {
        if (!file) {
            // No file selected, use default
            resolve({ base64: DEFAULT_ICON_BASE64, error: null, usedDefault: true });
            return;
        }
        if (!file.type.startsWith('image/')) {
            resolve({ base64: null, error: 'Selected file is not an image.' });
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => resolve({ base64: e.target.result.split(',')[1], error: null, usedDefault: false });
        reader.onerror = (e) => { console.error("FileReader error:", e); resolve({ base64: null, error: 'Error reading icon file.' }); };
        reader.readAsDataURL(file);
    });
}

function generateMobileConfig(webclips, profileDisplayName, profileOrg, consentText, profileDescription) { // Added profileDescription
    const profileUUID = generateUUID();
    const profileIdentifier = `com.example.webclip.multi.${profileUUID}`;
    const escapedProfileDisplayName = escapeXml(profileDisplayName);
    const escapedProfileOrg = escapeXml(profileOrg);
    const escapedConsentText = escapeXml(consentText);
    const escapedProfileDescription = escapeXml(profileDescription); // Escape new description

    const consentDictString = escapedConsentText ? `
    <key>ConsentText</key>
    <dict>
        <key>default</key>
        <string>${escapedConsentText}</string>
    </dict>` : '';

    const payloadContentXML = webclips.map(clip => {
        const payloadUUID = generateUUID();
        const escapedLabel = escapeXml(clip.label);
        const escapedUrl = escapeXml(clip.url);
        return `
        <dict>
            <key>FullScreen</key>
            <${clip.isFullScreen ? 'true' : 'false'}/>
            <key>Icon</key>
            <data>${clip.iconBase64}</data>
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
        </dict>`;
    }).join('');

    // Use custom profile description if provided, otherwise use default
    const finalProfileDescription = escapedProfileDescription || `Adds ${webclips.length} Web Clip${webclips.length > 1 ? 's' : ''} to the Home screen`;

    const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>${consentDictString}
    <key>PayloadContent</key>
    <array>${payloadContentXML}
    </array>
    <key>PayloadDescription</key>
    <string>${finalProfileDescription}</string> <!-- Use final description -->
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

function downloadMobileConfig(content, customFilename, fallbackProfileName) {
     let filenameBase = sanitizeFilename(customFilename);
     if (!filenameBase) {
         filenameBase = sanitizeFilename(fallbackProfileName) || 'webclips_profile';
     }
     const filename = `${filenameBase}.mobileconfig`; // Add extension
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

addWebclipButton.addEventListener('click', () => {
    webclipEntryCounter++;
    const newEntry = createWebclipEntryElement(webclipEntryCounter);
    webclipsContainer.appendChild(newEntry);
    updateRemoveButtonsState();
    clearStatus();
});

profileForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    clearStatus(); showSpinner(); generateButton.disabled = true;

    const webclipEntriesData = []; const fileReadPromises = []; let validationError = null;
    const webclipEntryElements = webclipsContainer.querySelectorAll('.webclip-entry');

    webclipEntryElements.forEach((entryElement, index) => {
        if (validationError) return; // Stop processing if error found

        const label = entryElement.querySelector(`input[name="labelName"]`).value.trim();
        const url = entryElement.querySelector(`input[name="websiteUrl"]`).value.trim();
        const iconFile = entryElement.querySelector(`input[name="iconFile"]`).files[0]; // May be null
        const isFullScreen = entryElement.querySelector(`input[name="fullscreenToggle"]`).checked;
        const entryNumber = index + 1;

        if (!label) { validationError = `Error in Web Clip #${entryNumber}: Shortcut Name is required.`; return; }
        if (!url) { validationError = `Error in Web Clip #${entryNumber}: Website URL is required.`; return; }
        try { const pUrl=new URL(url); if(pUrl.protocol !=='http:'&&pUrl.protocol !=='https:')throw new Error('URL must start with http:// or https://'); }
        catch (e) { validationError = `Error in Web Clip #${entryNumber}: Invalid URL. ${e.message || ''}`; return; }

        // Note: No validation needed here for missing iconFile, handled by readFileAsBase64

        const clipData = { label, url, isFullScreen, iconBase64: null, entryNumber };
        webclipEntriesData.push(clipData);
        fileReadPromises.push(readFileAsBase64(iconFile)); // Handles null file by returning default
    });

    if (validationError) { setStatus(validationError, 'error'); generateButton.disabled = false; return; }

    try {
        const fileReadResults = await Promise.all(fileReadPromises);
        let fileReadError = null;

        fileReadResults.forEach((result, index) => {
            if (fileReadError) return; // Stop if error found
            if (result.error) { fileReadError = `Error processing icon in Web Clip #${webclipEntriesData[index].entryNumber}: ${result.error}`; }
             else { webclipEntriesData[index].iconBase64 = result.base64; }
             // Optionally show default icon preview if used
             // if(result.usedDefault) { showIconPreview(webclipEntryElements[index], `data:image/png;base64,${DEFAULT_ICON_BASE64}`); }
        });
        if (fileReadError) { setStatus(fileReadError, 'error'); generateButton.disabled = false; return; }

        const profileNameInput = document.getElementById('profileName');
        const profileOrgInput = document.getElementById('profileOrg');
        const consentTextInput = document.getElementById('consentText');
        const profileDescInput = document.getElementById('profileDescription'); // Get new input
        const downloadFilenameInput = document.getElementById('downloadFilename'); // Get new input

        const profileName = profileNameInput.value.trim() || `Web Clips (${webclipEntriesData[0]?.label || 'Profile'})`;
        const profileOrg = profileOrgInput.value.trim() || 'Self-Generated';
        const consentText = consentTextInput.value.trim();
        const profileDescription = profileDescInput.value.trim(); // Get value
        const downloadFilename = downloadFilenameInput.value.trim(); // Get value

        const profileContent = generateMobileConfig(webclipEntriesData, profileName, profileOrg, consentText, profileDescription); // Pass description
        downloadMobileConfig(profileContent, downloadFilename, profileName); // Pass custom filename and fallback
        setStatus(`Profile '${sanitizeFilename(downloadFilename || profileName)}.mobileconfig' generated successfully.`, 'success');

    } catch (error) {
        console.error("Error during profile generation:", error);
        setStatus('An unexpected error occurred during profile generation.', 'error');
    } finally {
        generateButton.disabled = false;
    }
});

resetButton.addEventListener('click', function() {
    const entries = webclipsContainer.querySelectorAll('.webclip-entry');
    entries.forEach((entry, index) => { if (index > 0) entry.remove(); });

    profileForm.reset(); // Resets all form elements within the form

    const firstEntry = webclipsContainer.querySelector('.webclip-entry');
    if(firstEntry) clearIconPreview(firstEntry);

    webclipEntryCounter = 1;
    if(firstEntry) {
       firstEntry.dataset.entryId = '1';
       // Reset IDs and fors on first element in case they were changed by load
       firstEntry.querySelectorAll('[id*="_"]').forEach(el => { el.id = el.id.replace(/_\d+$/, '_1'); });
       firstEntry.querySelectorAll('[for*="_"]').forEach(el => { el.htmlFor = el.htmlFor.replace(/_\d+$/, '_1'); });
    }
    updateRemoveButtonsState();
    clearStatus();
    generateButton.disabled = false;
});

saveConfigButton.addEventListener('click', function() {
    clearStatus();
    const webclips = [];
    webclipsContainer.querySelectorAll('.webclip-entry').forEach(entry => {
        webclips.push({
            labelName: entry.querySelector('input[name="labelName"]').value,
            websiteUrl: entry.querySelector('input[name="websiteUrl"]').value,
            fullscreenToggle: entry.querySelector('input[name="fullscreenToggle"]').checked,
        });
    });
    const config = {
        profileName: document.getElementById('profileName').value,
        profileOrg: document.getElementById('profileOrg').value,
        consentText: document.getElementById('consentText').value,
        profileDescription: document.getElementById('profileDescription').value, // Save new field
        downloadFilename: document.getElementById('downloadFilename').value, // Save new field
        webclips: webclips
    };
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
        setStatus('Configuration saved successfully.', 'success');
    } catch (e) {
        setStatus('Error saving configuration to local storage.', 'error');
        console.error("Local storage save error:", e);
    }
});

loadConfigButton.addEventListener('click', function() {
    clearStatus();
    try {
        const savedConfig = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            document.getElementById('profileName').value = config.profileName || '';
            document.getElementById('profileOrg').value = config.profileOrg || '';
            document.getElementById('consentText').value = config.consentText || '';
            document.getElementById('profileDescription').value = config.profileDescription || ''; // Load new field
            document.getElementById('downloadFilename').value = config.downloadFilename || ''; // Load new field

            webclipsContainer.innerHTML = ''; webclipEntryCounter = 0;
            if (config.webclips && config.webclips.length > 0) {
                 config.webclips.forEach(clipData => {
                     webclipEntryCounter++;
                     const newEntry = createWebclipEntryElement(webclipEntryCounter);
                     newEntry.querySelector('input[name="labelName"]').value = clipData.labelName || '';
                     newEntry.querySelector('input[name="websiteUrl"]').value = clipData.websiteUrl || '';
                     newEntry.querySelector('input[name="fullscreenToggle"]').checked = clipData.fullscreenToggle || false;
                     webclipsContainer.appendChild(newEntry);
                 });
            } else {
                 webclipEntryCounter = 1;
                 const firstEntry = createWebclipEntryElement(1);
                 webclipsContainer.appendChild(firstEntry);
            }
            updateRemoveButtonsState();
            setStatus('Configuration loaded. Please select icon(s) or use defaults.', 'info');
        } else {
            setStatus('No saved configuration found.', 'info');
            resetButton.click(); // Ensure a clean state if no config found
        }
    } catch (e) {
        setStatus('Error loading configuration from local storage.', 'error');
        console.error("Local storage load error:", e);
         resetButton.click();
    }
});

// --- Initial Setup ---
const initialEntry = webclipsContainer.querySelector('.webclip-entry');
if (initialEntry) { addListenersToEntry(initialEntry); }
updateRemoveButtonsState();