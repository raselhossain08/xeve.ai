
<template>
    <div class="footer" id="footer">
      <button class="buttonsLeftBottom" @click="test">0.3.2 - Beta Testpage</button>
      <button class="buttonsRightBottom tr" id="imprintBtn" @click="handleContact">contact us</button> <!--id needed for checkly-->
      <button class="buttonsRightBottom tr" @click="openPrivacyPolicy">data privacy</button>
      <button class="buttonsRightBottom tr" @click="openTerms">terms</button>
      <button class="buttonsRightBottom tr" @click="openCancellation">cancellation & refund</button>
    </div>
</template>
  
<script setup>
import { usePopupStore } from "@/stores/popupStore";
import { useGeneralStore } from "@/stores/generalStore";

const popupStore = usePopupStore();
const generalStore = useGeneralStore();

function handleContact() {
  popupStore.openPopup("contact");
}
function openTerms() {
  popupStore.openPopup("terms");
}
function openPrivacyPolicy() {
  popupStore.openPopup("privacyPolicy");
}
function openCancellation() {
  popupStore.openPopup("cancellation");
}
function test() {
  if (generalStore.environment === "locally") {
    document.getElementById("videoPlayer1").currentTime = 1023840 / 1000;
  }
}
</script>

