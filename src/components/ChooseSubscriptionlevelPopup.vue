<template>
    <div id="chooseSubscriptionlevelPopup" class="popup" v-show="isOpen">
        <div class="popup-content" style="text-align: center" id="chooseSubscriptionlevelPopupContent">
            <span class="close" @click.prevent="closePopup" aria-label="Close Purchase Popup">&times;</span>

            <div class="creditpic">
                <div class="logoField logo" style="
                        font-size: 32px;
                        margin-bottom: 5px;
                        margin: auto;
                        padding-bottom: 6px;
                        padding-left: 2px;
                    "><span class="logo_a_bit_smaller">x</span><span class="logo_markup">eve</span><span
                        class="logo_smaller">.ai</span></div>
            </div>
            <div id="checkout" style="display: none"></div>

            <div id="chooseSubscription" style="width: 100%; display: block; position: relative">
                <div class="floatInRow">
                    <div class="twoItemsInFloatInRow">
                        <h3 style="margin: 12px 10%; margin-bottom: 0px; line-height: 21px" id="titleBasic"
                            aria-label="Basic Plan Subscription Title">
                            {{ titleBasic }}
                        </h3>

                    </div>
                    <div class="twoItemsInFloatInRow">
                        <h3 style="margin: 12px 10%; margin-bottom: 0px; line-height: 21px" id="titlePremium"
                            aria-label="Premium Plan Subscription Title">
                            {{ titlePremium }}
                        </h3>

                    </div>
                </div>

                <div class="floatInRow" style="align-items: start">
                    <div class="twoItemsInFloatInRow smallpadding" id="description1" aria-label="Basic Plan Benefits">
                        <p style="text-align: left">As a Supporter you will get:</p>
                        <ul class="green-hook-list">
                            <li>Additional "Actions"</li>
                            <li>Adult Actions of Char unlocked</li>
                            <li>Supporter Badge</li>
                            <li>Unlimited Chat Messages</li>
                            <li>Valid for human & avatar version</li>
                        </ul>
                    </div>
                    <div class="twoItemsInFloatInRow smallpadding"
                        style="border-left: 1px solid #666; padding-left: 20px" id="description2"
                        aria-label="Premium Plan Benefits">
                        <p style="text-align: left">As a Premium Supporter you will get:</p>
                        <ul class="green-hook-list">
                            <li>Everything of a normal supporter</li>
                            <li>Deeper conversations (improved AI)</li>
                            <li>Premium Supporter Badge</li>
                            <li>Valid for human & avatar version</li>
                            <li>Even more hidden Actions (find out which ones!)</li>
                        </ul>
                    </div>
                </div>

                <div class="floatInRow">
                    <div class="twoItemsInFloatInRow">
                        <div class="bigButton" id="boxBasic"
                            style="margin-top: 5px; line-height: 40px; margin-bottom: 8px" role="button" tabindex="0"
                            @click.prevent="addSubscriptionBasic" aria-label="Subscribe to Basic Plan">
                            <span id="labelforboxBasic" class="labelForBox">Support Normal</span>
                        </div>
                        <div style="font-style: italic">
                            <p class="pricetag diagonal-strike">14,90 €</p>
                            <p id="pricetagBasic" class="pricetag">{{ priceBasic }}</p>
                            <div class="row" style="font-size: 20px; margin-top: 10px">
                                <i class="fa-brands fa-cc-visa"></i>
                                <i class="fa-brands fa-cc-mastercard"></i>
                                <i style="font-size: 22px" class="fas fa-money-check"></i>
                            </div>
                        </div>
                    </div>

                    <div class="twoItemsInFloatInRow">
                        <div class="bigButton" id="boxPremium"
                            style="margin-top: 5px; line-height: 40px; margin-bottom: 8px; position: relative;"
                            role="button" tabindex="0" @click.prevent="addSubscriptionPremium()"
                            aria-label="Subscribe to Premium Plan">
                            <div id="dealBox" class="dealBox" aria-hidden="true">New customer deal</div>

                            <span id="labelforboxPremium" class="labelForBox">Support Premium</span>
                        </div>
                        <div style="font-style: italic">
                            <p class="pricetag diagonal-strike">25,90 €</p>
                            <p id="pricetagPremium" class="pricetag">{{ pricePremium }}</p>
                            <div class="row" style="font-size: 20px; margin-top: 10px">
                                <i class="fa-brands fa-cc-visa"></i>
                                <i class="fa-brands fa-cc-mastercard"></i>
                                <i style="font-size: 22px" class="fas fa-money-check"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>


<script setup>
import { ref, computed, watch } from 'vue';
import { addSubscription } from "@/js/script_subscriptions";
import { usePopupStore } from "@/stores/popupStore";
import { useGeneralStore } from "@/stores/generalStore";
import { showNotification } from "@/js/utils";

// Define props
const props = defineProps({
  open: {
    type: Boolean,
    default: false
  }
});

// Reactive data properties
const isPopupVisible = ref(false);
const titleBasic = ref("Basic Plan");
const titlePremium = ref("Premium Plan");

// Initialize stores
const popupStore = usePopupStore();
const generalStore = useGeneralStore();

// Computed properties
const isOpen = computed(() => popupStore.purchase);
const priceBasic = computed(() => generalStore.pricingInCents.basic);
const pricePremium = computed(() => generalStore.pricingInCents.premium);

// Watcher to react to prop changes
watch(
  () => props.open,
  (newVal) => {
    isPopupVisible.value = newVal;
  }
);

// Method to close the popup
const closePopup = () => {
  popupStore.closePopup("purchase");
};

// Method to add a basic subscription
const addSubscriptionBasic = () => {
  // Ensure 'videoname' is defined. Replace this with the actual source of 'videoname'.
  const videoname = generalStore.videoname;

  if (
    window.paiSubscriptionItems &&
    videoname in window.paiSubscriptionItems &&
    window.paiSubscriptionItems[videoname]["subscriptionlevel"] === "basic" 
    && !window.paiSubscriptionItems[videoname].validUntil
  ) {
    // Notify the user they are already a basic supporter
    showNotification(
      "neutral",
      "You are already a Supporter of this AI. You can upgrade to be a Premium Supporter.",
      "long"
    );
    return;
  }
  if (
    window.paiSubscriptionItems?.[videoname]?.validUntil && window.paiSubscriptionItems[videoname]["subscriptionlevel"] === "premium" ) {
    //downgrading is currently not supported so show a notification
    showNotification(
      "neutral",
      "You are already a Premium Supporter of this AI",
      "long"
    );
    return;
  }

  addSubscription("basic");
};

// Method to add a premium subscription
const addSubscriptionPremium = () => {

  addSubscription("premium");
};

</script>


<style scoped>
.labelForBox {
    font-weight: bold;
}
</style>