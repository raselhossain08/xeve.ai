<script setup>
import Player from '/src/components/Player.vue';
import { usePopupStore } from '/src/stores/popupStore';
import { onMounted } from 'vue';

const popupStore = usePopupStore();
window.isIframe = true;


onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const originDomain = urlParams.get('originDomain');
  popupStore.closePopup("consent");

  new Promise(resolve => setTimeout(resolve, 400)); //timeout so that videoplayer has more time to load in background because I had problems on Smartphones

  if (!originDomain) {
    console.warn("WARNING! Please provide an originDomain as URL param 'originDomain'");
    // Optionally display a message in the UI instead of using alert
    const warningMessage = document.createElement('div');
    warningMessage.innerText = "WARNING! Please provide an originDomain as URL param 'originDomain'";
    warningMessage.style.color = 'red';
    warningMessage.style.textAlign = 'center';
    document.body.prepend(warningMessage);
  }

});

</script>
<template>

  <div style="background-color: black;">
    <Player />
  </div>

</template>

<style scoped>
::v-deep(#videoContainer) {
  position: relative;
  overflow: hidden;
  width: min(100vw, calc(100vh* var(--video-ratio)));
  height: min(calc(100vw* var(--one-through-video-ratio)), 100vh);
  box-sizing: border-box;
  margin: auto;
}
</style>