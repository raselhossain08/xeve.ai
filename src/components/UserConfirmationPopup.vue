<script setup>
    import { ref } from 'vue';
    import { usePopupStore } from '@/stores/popupStore';

    const popupStore = usePopupStore();
    const isConfirmationVisible = ref(false);
    const userInput = ref('');

    const closeConfirmation = () => {
        isConfirmationVisible.value = false;
        popupStore.closePopup('confirmation');
    };

    const onYesClick = () => {
        closeConfirmation();
        if (window.userConfirmationCallbackFunction) {
            window.userConfirmationCallbackFunction(window.userConfirmationParams);
        }
        document.getElementById('userconfirmation').style.display = 'none';
    };

    const onNoClick = () => {
        closeConfirmation();
    };

    const onConfirmInput = () => {
        const inputText = document.getElementById('userChoiceInputField').value;
        console.log('User input:', inputText);
        closeConfirmation();
        if (window.userConfirmationCallbackFunction) {
            window.userConfirmationCallbackFunction(inputText, window.userConfirmationParams);
        }
        document.getElementById('userconfirmation').style.display = 'none';
    };
</script>

<template>
    <div id="userconfirmation" class="popup" v-show="popupStore.confirmation">
        <div id="userconfirmationContent" class="popup-content" style="text-align: center">
            <span class="close" @click="closeConfirmation" aria-label="Close User Confirmation Popup">&times;</span>
            <h3 id="userconfirmationText" style="margin-bottom: 25px" aria-label="Confirmation prompt">
                User confirmation text
            </h3>

            <div id="userChoiceYesNo" style="display: flex; width: fit-content; margin: 0 auto;">
                <button
                    id="userconfirmationButtonNo"
                    class="bigButton tr"
                    style="margin: 5px; background-color: grey"
                    @click="onNoClick"
                    aria-label="Decline confirmation"
                >
                    No
                </button>
                <button
                    id="userconfirmationButtonYes"
                    class="bigButton tr"
                    style="margin: 5px"
                    @click="onYesClick"
                    aria-label="Accept confirmation"
                >
                    Yes
                </button>
            </div>
            <div id="userChoiceInput" style="display: flex">
                <input
                    id="userChoiceInputField"
                    name="contact_number"
                    class="contactFormInput"
                    v-model="userInput"
                    aria-label="Enter your confirmation input"
                />
                <button
                    id="userChoiceInputButton"
                    class="bigButton tr"
                    @click="onConfirmInput"
                    aria-label="Submit confirmation input"
                >
                    Confirm
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.confirmation {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 9999;
}
.contactFormInput {
    flex: 1;
    padding: 10px;
    margin-right: 5px;
    border: 1px solid #ccc;
    border-radius: 5px;
}
</style>
