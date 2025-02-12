import { useGeneralStore } from "../stores/generalStore.js";

function setCookie(value) {
    const generalStore = useGeneralStore(); 
    document.cookie = generalStore.domainname + "=" + encodeURIComponent(value || "") + "; path=/; SameSite=None; Secure";
}


export function addToCookie(key, value) {
    const generalStore = useGeneralStore(); 
    let cookieValue = getCookie(generalStore.domainname);
    let data = cookieValue ? JSON.parse(decodeURIComponent(cookieValue)) : {}; // Ensure decodeURIComponent here
    data[key] = value;
    setCookie(JSON.stringify(data));
}


export function getFromCookie(key) {
    let cookieValue = getCookie();
    if (cookieValue) {
        try {
            let data = JSON.parse(decodeURIComponent(cookieValue));
            return data[key];
        } catch (e) {
            console.error('Invalid JSON in cookie, deleting cookie:', e);
            deleteCookie();
            return null;
        }
    }
    return null;
}


export function deleteFromCookie(key) {
    let cookieValue = getCookie();
    if (cookieValue) {
        let data = JSON.parse(decodeURIComponent(cookieValue)); // Decode before parsing
        delete data[key];
        setCookie(JSON.stringify(data));
    }
}
function deleteCookie() {
    const generalStore = useGeneralStore(); 
    document.cookie = generalStore.domainname + "=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=None; Secure";
}

function getCookie() {
    const generalStore = useGeneralStore(); 
    let nameEQ = generalStore.domainname + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length)); // Decode here
    }
    return null;
}


/* Function to apply dark mode styles to the Consent Popup */
function applyDarkModeToConsentPopup() {
    const consentPopup = document.getElementById("ConsentPopup");
    if (!consentPopup) return;

    const isDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (isDarkMode) {
        consentPopup.classList.add("dark-mode");
    } else {
        consentPopup.classList.remove("dark-mode");
    }
}

/* Listen for theme changes */
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyDarkModeToConsentPopup);

/* Apply dark mode styling on page load */
document.addEventListener("DOMContentLoaded", applyDarkModeToConsentPopup);
