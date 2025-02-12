import { addToCookie } from "@/js/cookie";
import { useGeneralStore } from "../stores/generalStore";

export async function setLanguage(language) {
    try {
        const generalStore = useGeneralStore();
        const url = new URL(window.location);
        url.searchParams.set('language', language);
        window.history.replaceState({}, '', url);

        addToCookie('language', language);

        let translations = {};

        if (language && language !== 'en') {
            // Fetch the translation JSON file dynamically based on the selected language
            const response = await fetch(`languages/${language}.json`);
            if (!response.ok) {
                throw new Error(`Error fetching the language file for ${language}: ${response.statusText}`);
            }
            // Parse the JSON content
            translations = await response.json();
        } else {
            // For English, set the keys as values (since English is default)
            const response = await fetch(`languages/nl.json`); // using Dutch as a reference to get the keys
            if (!response.ok) {
                throw new Error(`Error fetching the language file for ${language}: ${response.statusText}`);
            }
            // Parse the JSON content
            const translationsTemp = await response.json();
            for (const key in translationsTemp) {
                translations[key] = key; // Set the key as the value for English
            }
        }

        // Get all elements that have the class 'tr'
        const elements = document.querySelectorAll('.tr');

        // Loop over each element and translate its textContent where possible
        elements.forEach(element => {
            // Iterate over the child nodes (text nodes)
            element.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) { // Only process text nodes
                    let originalText = node.nodeValue.trim(); // Get the current text from the node

                    // Check if we have stored the original text in a data attribute
                    if (element.dataset.originalText) {
                        originalText = element.dataset.originalText; // Use the original stored text
                    } else {
                        // If not stored, save the original text
                        element.dataset.originalText = originalText;
                    }

                    // Look up the translation and update the text node
                    if (translations[originalText]) {
                        node.nodeValue = translations[originalText] + ' '; // Replace text node with the translation
                    }
                }
            });
        });
        generalStore.language = language;
    } catch (error) {
        console.error('Error setting language:', error);
    }
}
