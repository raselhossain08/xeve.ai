<template>
    <div id="audioPopup" class="popup hidden" v-if="isAudioPopupVisible">
        <div class="audiopopup-content">
            <div class="boxAroundAudioButtons">
                <button @click="useSound" class="audioButtons">Use Sound</button>
            </div>
            <div class="boxAroundAudioButtons">
                <button @click="dontUseSound" class="audioButtons">
                    Don't Use Sound
                </button>
                <p class="smallTextInAudioButton">
                    You will see subtitles of what the AI Char says
                </p>
            </div>
        </div>
    </div>
</template>
        
<script>
export default {
    data() {
        return {
            isAudioPopupVisible: true,
        };
    },
    methods: {
        useSound() {
            console.log("User chose to use sound");
            this.isAudioPopupVisible = false;
        },
        dontUseSound() {
            console.log("User chose not to use sound");
            this.isAudioPopupVisible = false;
        },
    },
};
</script>
        
<style scoped>
.audioButtons {
    padding: 10px;
    margin: 10px;
    background-color: #007bff;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 5px;
}
</style>    