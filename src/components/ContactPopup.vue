<template>
    <div id="imprintPopup" class="popup hidden" style="text-align: center;" v-if="isOpen">
        <div class="popup-content">
            <span id="closeImprintPopup" class="close" @click="close" aria-label="Close">&times;</span>
            <h2>Imprint</h2>
            <p style="font-size: 14px; line-height: 20px;">xeve.ai<br>Jay Web Development & Services
                <br>Daxerstraße, 82140 Olching<br>Germany</p>
            <p style="font-size: 14px; line-height: 20px;" id="imprintMail">info [aet] {{ generalStore.domainname }}
            </p>
            <h2 style="margin-top: 40px;">Contact Us</h2>
            <form id="contact-form">
                <div class="form-group" style="width: 90%; margin: auto;">
                    <input type="hidden" name="contact_number" class="contactFormInput">
                    <div class="inputDiv">
                        <p class="labelForInput tr">Name</p>
                        <input type="text" id="contact-form-username" name="user_name" class="contactFormInput" autocomplete="name">
                    </div>
                    <div class="inputDiv">
                        <p class="labelForInput tr">Email</p>
                        <input id="contact-form-email" type="email" name="user_email" class="contactFormInput" required autocomplete="email">
                    </div>
                    <input type="hidden" name="type" value="contact_form_message">
                    <div class="inputDiv">
                        <p class="labelForInput tr">Message</p>
                        <textarea id="contact-form-message" name="message" class="contactFormInput"
                            style="height:100px;"></textarea>
                    </div>
                </div>
                <button type="submit" class="bigButton tr" @click.prevent="onContactFormSubmit">Send</button>
                <p style="font-size:10px;" class="tr">Privacy Notice<br>The data you enter in the contact form will be
                    stored exclusively for the purpose of processing your inquiry and for any follow-up questions. Your
                    data
                    will not be shared with third parties without your explicit consent. By submitting the form, you
                    agree to the processing of your entered data for the stated purpose. You have the right to revoke
                    your consent at any time. An informal notification by email to us is sufficient.</p>
            </form>
        </div>
    </div>
</template>

<script setup>  
import { usePopupStore } from "@/stores/popupStore";
import { useGeneralStore } from "@/stores/generalStore";
import { showNotification } from "@/js/utils.js";
import { computed } from 'vue'

const popupStore = usePopupStore();
const generalStore = useGeneralStore();


let lastTimeContactFormSent = new Date().getTime();
function onContactFormSubmit() {
    if (new Date().getTime() < lastTimeContactFormSent + 2000) return; //do it like this and not with disabling (even not with setting a param) because I had many problems with that!
    lastTimeContactFormSent = new Date().getTime();
    const username = document.getElementById("contact-form-username").value;
    var templateParams = {
        header_text: `New contact from ` + username,
        body_text: `New contact message.\nUsername from form: ` + username + `\nUserId: ` + window.userId + `\nMessage: ` + document.getElementById("contact-form-message").value,
        user_email: document.getElementById("contact-form-email").value,
        domain: generalStore.domainname 
    };
    if (generalStore.environment === "locally") {
        showNotification('bad', "It's not possible to send the contact form when the webpage runs locally", 'short');
        return;
    }
    emailjs.send('EmailJStoGMail', 'template_0o9dvi8', templateParams)
        .then(() => {
            console.log('Contact form sent successfully!');
            showNotification('good', "Message sent successfully", 'short');

            document.getElementById("contact-form-message").value = "";
            document.getElementById("contact-form-email").value = "";
            document.getElementById("contact-form-username").value = "";

            
            document.getElementById('contact-form').reset();
            popupStore.closePopup("contact");

        }, (error) => {
            console.log('FAILED...', error);
            showNotification('bad', 'There was an error sending the message', 'short');
        });
};


function close() {
  popupStore.closePopup("contact");
}
const isOpen = computed(() => popupStore.contact);

</script>