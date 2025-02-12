
import { defineStore } from 'pinia';

export const usePopupStore = defineStore('popupStore', {
    state: () => ({
            login: false,
            audio: false,
            terms: false,
            privacyPolicy: false,
            imprint: false,
            consent: true,
            subscription: false,
            contact: false,
            confirmation: false,
            cancellation: false,
            purchase: false,
    }),
    actions: {
        openPopup(popupName) {
            if (this[popupName] !== undefined) {
                this[popupName] = true;
            }
        },
        closePopup(popupName) {
            if (this[popupName] !== undefined) {
                this[popupName] = false;
            }
        },
    },
});
