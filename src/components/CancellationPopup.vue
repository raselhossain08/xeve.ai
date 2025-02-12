
<template>
    <div id="cancellation" class="policyPopup" v-show="isOpen">
        <span class="closepolicy" id="closeCancellation" @click="close" aria-label="Close">&times;</span>
        <div id="CancellationInner" class="divWithoutStyle">
            <div v-if="loading">Loading...</div>
            <div v-html="cancellationContent" v-if="cancellationContent"></div>
        </div>
    </div>
</template>
        
<script>
import { usePopupStore } from "@/stores/popupStore";
import { useGeneralStore } from "@/stores/generalStore";

export default {
    data() {
        return {
            cancellationContent: "",
            loading: false
        };
    },
    computed: {
        isOpen() {
            const popupStore = usePopupStore();
            this.loadCancellation();
            return popupStore.cancellation;
        },
        pagename() {
            const generalStore = useGeneralStore();
            return generalStore.pagename; 
        }
    },
    methods: {
        close() {
            const popupStore = usePopupStore();
            popupStore.closePopup("cancellation");
        },
        async loadCancellation() {
            this.loading = true;
            try {
                const generalStore = useGeneralStore();
                const language = generalStore.language;
                
                const response = await fetch(`/legal/cancelation_policy_${language}.html`);
                if (!response.ok) throw new Error("Failed to fetch cancellation");

                // Fetch the HTML content
                let cancellationHtml = await response.text();

                // Replace placeholders with values from generalStore
                const domainname = generalStore.domainname;
                const pagename = generalStore.pagename;

                cancellationHtml = cancellationHtml
                    .replace(/<span class="domainname">.*?<\/span>/g, `<span class="domainname">${domainname}</span>`)
                    .replace(/<span class="pagename">.*?<\/span>/g, `<span class="pagename">${pagename}</span>`);

                // Set the processed HTML to cancellationContent
                this.cancellationContent = cancellationHtml;
            } catch (error) {
                console.error("Error loading cancellation:", error);
                this.cancellationContent = "<p>Failed to load cancellation. Please try again later.</p>";
            } finally {
                this.loading = false;
            }
        }
    },
};
</script>