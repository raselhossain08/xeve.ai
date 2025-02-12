import { defineStore } from 'pinia';

export const useGeneralStore = defineStore('generalStore', {
    state: () => ({
        domainname: "xeve.ai",
        environment: null,
        language: "en",
        routePath: null,
        routeName: null,
        darkModeActive: true,
        videoname: "",
        loggedInUser: null,
        filterList: [],
        pricingInCents: {
            premium: 99999,
            basic: 99999
        }
    }),
    getters: {
        pagename(state) {
            // Ensure videoname is not null or undefined before trying to manipulate it
            return state.domainname
                ? state.domainname.split('.')[0][0].toUpperCase() + state.domainname.split('.')[0].slice(1)
                : null;
        },
        charname(state) {
            // Ensure videoname is not null or undefined before trying to manipulate it
            return state.videoname
                ? state.videoname.charAt(0).toUpperCase() + state.videoname.slice(1)
                : null;
        },

    }
});


