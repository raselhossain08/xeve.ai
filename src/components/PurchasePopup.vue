<template>
    <div 
      class="purchase-popup" 
      v-show="isOpen"
      style="border: 1px solid #ccc; background: #fff; padding: 20px; max-width: 600px; margin: 0 auto;"
    >
      <button @click="closePopup" aria-label="Close Purchase Popup" style="float: right;">&times;</button>
      
      <h2>Purchase Details</h2>
      <p><strong>Company Name:</strong> MyCompany LLC</p>
      <p><strong>Address:</strong> 1234 Some Street, Some City, Some Country</p>
      <p><strong>Billing Descriptor:</strong> MyBillingDescriptor &ndash; <strong>City:</strong> MyCity</p>
      
      <h3>Products &amp; Pricing (Settlement Currency: EUR)</h3>
      <ul>
        <li>Basic Plan: {{ basicPrice }}&euro; / month</li>
        <li>Premium Plan: {{ premiumPrice }}&euro; / month</li>
      </ul>
      
      <div style="margin: 10px 0;">
        <strong>Accepted Card Brands &amp; Security:</strong><br />
        <img src="visa-logo.png" alt="Visa" style="height: 24px; margin-right: 5px;" />
        <img src="mastercard-logo.png" alt="MasterCard" style="height: 24px; margin-right: 5px;" />
        <img src="vbv-logo.png" alt="Verified by Visa" style="height: 24px; margin-right: 5px;" />
        <img src="securecode-logo.png" alt="MasterCard SecureCode" style="height: 24px;" />
      </div>
      
      <p style="font-style: italic; margin-top: 20px;">
        Please consult the PCI Data Security documentation (PDF) for details. 
        We assume many technical requirements are managed on Netvalve’s side.
      </p>
  
      <div style="text-align: center; margin-top: 20px;">
        <button @click="startPurchase('basic')" style="margin-right: 10px;">Purchase Basic</button>
        <button @click="startPurchase('premium')">Purchase Premium</button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { computed } from 'vue';
  import { usePopupStore } from '@/stores/popupStore';
  import { useGeneralStore } from '@/stores/generalStore';
  import { addSubscription } from '@/js/script_subscriptions';
  
  const popupStore = usePopupStore();
  const generalStore = useGeneralStore();
  
  const isOpen = computed(() => popupStore.purchase);
  
  const basicPrice = computed(() => generalStore.pricingInCents.basic);
  const premiumPrice = computed(() => generalStore.pricingInCents.premium);
  
  function closePopup() {
    popupStore.closePopup("purchase");
  }
  
  function startPurchase(plan) {
    // Here you could verify current subscription, handle notifications, etc.
    addSubscription(plan);
    closePopup();
  }
  </script>
  
  <style scoped>
  .purchase-popup {
    position: fixed;
    top: 50px;
    left: 0;
    right: 0;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }
  </style>
  