<script setup>
import LoginPopup from './components/LoginPopup.vue';
import SubscriptionsPopup from './components/SubscriptionsPopup.vue';
import UserConfirmationPopup from './components/UserConfirmationPopup.vue';
import TermsPopup from './components/TermsPopup.vue';
import PrivacyPopup from './components/PrivacyPopup.vue';
import CancellationPopup from './components/CancellationPopup.vue';
import ConsentPopup from './components/ConsentPopup.vue';
import ChooseSubscriptionlevelPopup from './components/ChooseSubscriptionlevelPopup.vue';
import ContactPopup from './components/ContactPopup.vue';

</script>

<template>
  <main>

    <RouterView />

    <LoginPopup />

    <SubscriptionsPopup />

    <UserConfirmationPopup />

    <ChooseSubscriptionlevelPopup />

    <TermsPopup />

    <PrivacyPopup />

    <CancellationPopup />

    <ConsentPopup />

    <ContactPopup />

    <div id="notification" class="notification">
      <p id="notificationText">
        This is a notification message!
      </p>
    </div>
  </main>
</template>
