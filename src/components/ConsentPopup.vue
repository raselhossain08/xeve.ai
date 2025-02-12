
<template>
  <div id="topcover" v-if="isOpen"></div>
  <div
    id="ConsentPopup"
    class="popup"
    v-if="isOpen"
    :class="{ 'dark-mode': isDarkMode }"
  >
    <div
      id="ConsentPopupContent"
      class="popup-content"
      style="text-align: center; margin-top: 10vh"
    >
      <h1 class="tr" style="font-weight: normal; margin: 25px 0">
        Welcome to
        <span class="logoField logo" style="font-size: 43px">
          <span class="logo_a_bit_smaller">x</span
          ><span class="logo_markup">eve</span
          ><span class="logo_smaller">.ai</span>
        </span>
      </h1>
      <form id="consentForm" @submit.prevent="onFormSubmit">
        <div class="form-group">
          <div
            class="checkboxdiv"
            v-for="(checkbox, index) in state.checkboxes"
            :key="checkbox.id"
          >
            <input
              :id="checkbox.id"
              :name="checkbox.name"
              type="checkbox"
              v-model="checkbox.checked"
            />
            <label
              :for="checkbox.id"
              v-html="checkbox.label"
              aria-label="Consent checkbox: {{ checkbox.label }}"
            ></label>
          </div>
          <button
            type="submit"
            id="consentFormButton"
            class="bigButton tr"
            style="width: 155px"
            aria-label="Confirm and submit consent form"
          >
            I confirm that I'm over 18 years old
          </button>
          <p style="margin-bottom: 7px; font-style: italic" class="tr">
            alternatively:
          </p>
        </div>
      </form>
      <a href="https://www.google.com"
        ><u class="tr">leave {{ isDarkMode }}</u></a
      >
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, watchEffect } from "vue";
import { useGeneralStore } from "@/stores/generalStore"; // Import the store
import { usePopupStore } from "@/stores/popupStore";
import { getFromCookie, addToCookie } from "@/js/cookie";
import { consentGiven } from "@/js/script_navbar";
import { showNotification } from "@/js/utils";

const generalStore = useGeneralStore();
const popupStore = usePopupStore();

// ✅ Use global dark mode from the store
const isDarkMode = computed(() => generalStore.darkModeActive);

// Watch for changes and update body class dynamically
watchEffect(() => {
  if (isDarkMode.value) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
});

// Reactive state for checkboxes
const state = reactive({
  checkboxes: [
    {
      id: "aiConversations",
      name: "aiConversations",
      label:
        "I'm aware that this website offers AI models and that the responses of the models are made up.",
      checked: false,
    },
    {
      id: "termsConditions",
      name: "termsConditions",
      label:
        'I have read and agree to the <a href="#">Terms and Conditions</a>, <a href="#">Data Privacy Policy</a> and I consent to the use of essential cookies on this webpage.',
      checked: false,
    },
    {
      id: "nonEssentialCookies",
      name: "nonEssentialCookies",
      label:
        'I agree to the use of non-essential cookies. Learn more in our <a href="#">policy</a>.',
      checked: false,
    },
  ],
});

// Computed property for popup visibility
const isOpen = computed(() => popupStore.consent ?? false);

// Handle form submission
const onFormSubmit = async () => {
  console.log("Consent form submitted");

  const aiConversationsChecked = state.checkboxes.find(
    (cb) => cb.id === "aiConversations"
  )?.checked;
  const termsConditionsChecked = state.checkboxes.find(
    (cb) => cb.id === "termsConditions"
  )?.checked;
  const nonEssentialCookiesChecked = state.checkboxes.find(
    (cb) => cb.id === "nonEssentialCookies"
  )?.checked;

  if (!aiConversationsChecked || !termsConditionsChecked) {
    showNotification(
      "bad",
      "Please accept the terms and privacy policy to proceed.",
      "veryShort"
    );
    return;
  }

  // Update cookies and analytics
  addToCookie("policyPopupAccepted", true);
  addToCookie("policyPopupAcceptedDate", new Date().toISOString());
  if (nonEssentialCookiesChecked) {
    addToCookie("gtagConsentGiven", true);
    consentGiven();
  }

  popupStore.closePopup("consent");
};
</script>


