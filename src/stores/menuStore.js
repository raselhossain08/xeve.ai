// stores/menuStore.js
import { defineStore } from 'pinia';

export const useMenuStore = defineStore('menuStore', {
    state: () => ({
        isMenuVisible: true, // Manage the visibility of the menu
    }),
    actions: {
        toggleMenu() {
            this.isMenuVisible = !this.isMenuVisible;
        },
        showMenu() {
            this.isMenuVisible = true;
        },
        hideMenu() {
            this.isMenuVisible = false;
        },
    },
});
