<template>
    <div id="mySubscriptions" class="popup" v-show="isOpen">
        <div id="mySubscriptionsContent" class="popup-content" style="text-align: center">
            <span class="close" @click="closePopup" aria-label="Close My Subscriptions Popup">&times;</span>
            <h2 style="font-size: 20px; margin: 35px auto;" class="tr">My AIs</h2>
            <div id="nosubsfound" style="
                align-items: center;
                display: inline-block;
                flex-direction: row;
                margin-bottom: 40px;
                align-items: center;
            " aria-label="No subscriptions found">
                <i class="fa-solid fa-magnifying-glass" style="margin: 10px; font-size: 16px" aria-hidden="true"></i>
                <span style="text-align: left" class="tr">You don't have any AIs yet</span>
            </div>

            <div id="subscriptionListTitle" style="display: none">
                <div class="subscriptionItem subscriptionItemThick subscriptionItemTitle tr" id="subscriptionItemTitle">
                    AI Char Name
                </div>
                <div class="subscriptionItem subscriptionItemThick subscriptionItemTitle tr"
                    id="subscriptionItemTitletwo">
                    Supporter Level
                </div>
            </div>

            <div id="subscriptionListTitleOne" style="display: flex" aria-label="Subscription Suggestions">
                <div class="subscriptionItem subscriptionItemTitle tr" id="subscriptionItemTitle" style="margin: auto">
                    Support AIs like these:
                </div>
            </div>

            <div id="subscriptionList"></div>
            <div>
                <button v-if="!isHomePage" id="purchaseButtonInMySubs" class="bigButton tr" 
                    style="
                        width: 150px;
                        margin-top: 25px;
                        font-size: 14px;
                        background-color: var(--markup-color);" 
                    @click="supportAi" aria-label="Support this AI">
                    Support current AI
                </button>
            </div>
            <div id="userSettingsContent" style="text-align: center; display: none; margin-top: 20px" aria-label="User Settings">
                <h2 style="font-size: 20px; margin: 30px 20px" class="tr">Settings</h2>
                <p class="tr" style="font-size: larger; padding: 3px" id="userSettingsUsername">
                    Username:
                    <span class="tr" id="username" style="color: var(--markup-color-high-contrast)" aria-label="Username not set">
                        not set
                    </span>
                </p>
                <p class="tr" style="font-size: larger; padding: 3px">
                    Mail:
                    <span class="tr" id="usermail" style="color: var(--markup-color-high-contrast)" aria-label="User email"></span>
                </p>
                <button class="tr" style="
                        margin: 5px;
                        margin-bottom: 20px;
                        color: unset;
                        background: none;
                        border: none;
                        cursor: pointer;
                    " @click="onDeleteAccountClicked" aria-label="Delete account">Delete account</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onPurchaseButtonPressed } from "@/js/script_navbar.js";
import { usePopupStore } from "@/stores/popupStore";
import { computed } from "vue";
import { useRoute } from "vue-router";

// Initialize the popup store
const popupStore = usePopupStore();

// Access the current route
const route = useRoute();

// Computed property to determine if the popup is open
const isOpen = computed(() => popupStore.subscription);

// Computed property to check if the current page is the home page
const isHomePage = computed(() => route.path === "/");

// Method to close the popup
function closePopup() {
    console.log("Close popup");
    popupStore.closePopup("subscription");
}

// Method to handle account deletion
function onDeleteAccountClicked(event) {
    event.preventDefault();
    // Handle delete account logic
    window.onDeleteAccountClicked();
    console.log("Delete account clicked", event);
}

// Method to support the AI
function supportAi() {
    popupStore.closePopup("subscription");
    onPurchaseButtonPressed();
}
</script>
