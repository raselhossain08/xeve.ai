<!-- Terms and Conditions Component -->
<template>
    <div id="termsAndCond" class="policyPopup" v-show="isOpen">
        <span class="closepolicy" id="closeTermsAndCond" @click="close" aria-label="Close">&times;</span>
        <div id="termsAndCondInner" class="divWithoutStyle">
            <div v-if="loading">Loading...</div>
            <div v-html="termsContent" v-if="termsContent"></div>
        </div>
    </div>
</template>
        
<script>
import { usePopupStore } from "@/stores/popupStore";
import { useGeneralStore } from "@/stores/generalStore";

export default {
    data() {
        return {
            termsContent: "",
            loading: false
        };
    },
    computed: {
        isOpen() {
            const popupStore = usePopupStore();
            this.loadTerms();
            return popupStore.terms;
        },
        pagename() {
            const generalStore = useGeneralStore();
            return generalStore.pagename; 
        }
    },
    methods: {
        close() {
            const popupStore = usePopupStore();
            popupStore.closePopup("terms");
        },
        async loadTerms() {
            this.loading = true;
            try {
                const generalStore = useGeneralStore();
                const language = generalStore.language;
                
                const response = await fetch(`/legal/termsAndCond_${language}.html`);
                if (!response.ok) throw new Error("Failed to fetch terms");

                // Fetch the HTML content
                let termsHtml = await response.text();

                // Replace placeholders with values from generalStore
                const domainname = generalStore.domainname;
                const pagename = generalStore.pagename;

                termsHtml = termsHtml
                    .replace(/<span class="domainname">.*?<\/span>/g, `<span class="domainname">${domainname}</span>`)
                    .replace(/<span class="pagename">.*?<\/span>/g, `<span class="pagename">${pagename}</span>`);

                // Set the processed HTML to termsContent
                this.termsContent = termsHtml;
            } catch (error) {
                console.error("Error loading terms:", error);
                this.termsContent = "<p>Failed to load terms. Please try again later.</p>";
            } finally {
                this.loading = false;
            }
        }
    },
};
</script>