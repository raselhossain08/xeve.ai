<script setup>
import { useGeneralStore } from '@/stores/generalStore';
import { computed, onMounted } from 'vue';
import { micButtonPressed, startAI, onBigPlayButtonClicked, onCommandFormSubmit, onBigPlayButtonIfPaused, defineFlyInAnimation, toggleFullscreen, toggleMute, handlePlayingEvent, setCssToFullscreen, setCssToLeaveFullscreen, checkIfPausedButShouldntBe, handleWaitingEvent } from '@/js/script_player.js';
import { onPurchaseButtonPressed } from "@/js/script_navbar.js";

const generalStore = useGeneralStore();
const onBigPlayButtonClicked_ = async function () {
    onBigPlayButtonClicked();
    highlightPurchaseButtonOverVideo();
}
const highlightPurchaseButtonOverVideo = async function () {
    // Show the purchase button x seconds afterwards
    setTimeout(function () {
        highlightPurchaseButtonOverVideoIfNotAlreadySupporter()
    }, 1 * 60 * 1000);
    // show it again
    setTimeout(function () {
        highlightPurchaseButtonOverVideoIfNotAlreadySupporter()
    }, 9 * 60 * 1000);
    setTimeout(function () {
        highlightPurchaseButtonOverVideoIfNotAlreadySupporter()
    }, 14 * 60 * 1000);
}

async function highlightPurchaseButtonOverVideoIfNotAlreadySupporter() {
    document.getElementById('purchaseButtonOverVideoArrow').classList.remove("hidden")
    document.getElementById("purchaseButtonOverVideoDivText").classList.add('bouncing');
    setTimeout(function () {
        document.getElementById("purchaseButtonOverVideoDivText").classList.remove('bouncing');
        document.getElementById('purchaseButtonOverVideoArrow').classList.add("hidden")

    }, 10000);
    //}
}

const isxeve = computed(() => generalStore.domainname === 'xeve.ai');
let previousWidth = window.innerWidth;

onMounted(() => {

    videoPlayer1.addEventListener('canplay', () => {
        videoPlayer1.ready = true;
    });

    window.exitFullscreenIfIn = function () {
        if (checkFullscreen()) {
            exitFullscreen()
        }
    }

    videoPlayer1.addEventListener('waiting', handleWaitingEvent);

    videoPlayer1.addEventListener('playing', handlePlayingEvent);

    // Check visibility of the page in case user leaves and comes back BUT THIS did not work on iPhone so I also introduced a workaround in getCurrentTimestampActivePlayerMillis
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkIfPausedButShouldntBe()
        }
    });

    //run defineFlyInAnimation if the screen size changes
    window.addEventListener('resize', function () {
        if (window.innerWidth !== previousWidth) {
            defineFlyInAnimation();
            previousWidth = window.innerWidth;
        }
    });
    document.getElementById("videoPlayer1").addEventListener('loadedmetadata', async () => {
        while (!videoPlayer1.videoWidth || !videoPlayer1.videoHeight) { //sadly this is needed because safari doesn't provide the dimensions right away
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        const videoRatio = videoPlayer1.videoWidth / videoPlayer1.videoHeight;
        if (videoRatio && videoRatio > 0.5 && videoRatio < 3) { // plausibility check
            document.body.style.setProperty('--video-ratio', videoRatio);
            document.body.style.setProperty('--one-through-video-ratio', 1 / videoRatio);
            defineFlyInAnimation();
        }
    });

    document.addEventListener('fullscreenchange', function () {
        if (document.fullscreenElement) {
            setCssToFullscreen() //could be triggered twice but needed because fullscreen can also be e.g be exited with esc key not only with the button
        } else {
            setCssToLeaveFullscreen()
        }
    });


    startAI(); //directly run startAI when the page is loaded. The play button will then only play the video
});


</script>
<template>
    <div id="cover" class="cover fullopacity">

        <div id="playText" class="playText initialPosition"><span class="tr" v-if="isxeve">Your private
                AI</span><span class="tr" v-if="!isxeve">Talk to</span><br> <span class="playTextSubtitle" id="charName">{{ generalStore.charname }}</span><span
                id="loadingDots" class="loadingDots"><span>.</span><span>.</span><span>.</span></span>
        </div>

        <button id="bigPlayButton" class="bigPlayButton initially_hidden" aria-label="Play video" @click.prevent="onBigPlayButtonClicked_">
    <i id="bigPlayButtonImage1" class="fas fa-play"></i>
</button>

    </div>
    <div class="videoContainer" id="videoContainer">


        <p id="textIfPaused" class="playText initialPosition tr" style="display:none; padding: 15px;">Are you still
            watching?</p>
            <button id="bigplayButtonIfPaused" class="bigPlayButton initially_hidden" aria-label="Resume video" @click="onBigPlayButtonIfPaused">
    <i id="bigPlayButtonImage2" class="fas fa-play"></i>
</button>

        <div id="loadingIconOverPlayer" class="pulsating-dot" style="display: none;"></div>

        <video class="active" playsinline disableRemotePlayback preload="auto" id="videoPlayer1"></video>
        <!--<video class="" playsinline disableRemotePlayback preload="auto" id="transitionPlayer1"></video>
<video class="" playsinline disableRemotePlayback preload="auto" id="transitionPlayer2"></video> -->
        <img class="videoBackground" id="transitionFrameShower1" style="filter: brightness(1.08);" src="">
        <!--filter needed because transitions are a bit darker-->
        <img class="videoBackground" id="transitionFrameShower2" style="filter: brightness(1.08);" src="">
        <img class="videoBackground" id="transitionFrameShower3" style="filter: brightness(1.08);" src="">
        <img class="videoBackground" id="transitionFrameShower4" style="filter: brightness(1.08);" src="">
        <img class="videoBackground" id="transitionFrameShower5" style="filter: brightness(1.08);" src="">
        <img class="videoBackground" id="videoBackground" style="filter: brightness(1.08);" src="">

        <span id="hintbubble"></span>

        <div id="actionHistory">
            <div id="actionHistoryInner">
            </div>
        </div>
        <div id="chatHistory">
        </div>

        <div id="steeringElements">
            <button id="soundBtn" class="control-btn left" aria-label="Toggle sound" @click="toggleMute()">
    <img id="soundicon" src="/soundunmuted.png" style="height: 100%; opacity: 60%" alt="Sound Icon">
</button>


            <div id="commandFieldContainer">
                <button id="microphoneBtn" class="microphoneBtn" style="display: none;" @click="micButtonPressed()">
                    <img id="microphoneIcon" src="/micmuted.png" style="width: 25px">
                </button>
                <form id="commandForm" @submit.prevent="onCommandFormSubmit()">
                    <span id="speechBubble" class="bubble tr">talk to the char using your mic or send a chat message. If
                        you're nice, she might even do actions.</span>
                        <input type="text" id="commandField" placeholder="Say something..." autocomplete="off" aria-label="Enter your command">
                        <div id="sendButtonContainer">
                            <button type="submit" id="sendButton" aria-label="Send message">➤</button>
                            <div id="loadingIcon" class="loading-animation" style="display: none;"></div>
                    </div>
                </form>
            </div>
            <button id="fullscreenBtn" class="control-btn right fullscreenBtn" aria-label="Enter fullscreen" @click="toggleFullscreen()">
    <img id="fullscreenImage" src="/fullscreen.png" style="height: 100%; opacity: 60%;" alt="Fullscreen Icon">
</button>

        </div>
        <!--not used anymore because now pauselayer <button id="togglePlayPause" class="control-btn third-from-left" style="line-height: 1;">
    <img id="togglePlayPauseImage" src="/pause_button.png" style="width: 16px; opacity: 45%; margin-left: 1px;">
</button>-->
        <!-- Purchase Button over Video-->
        <div class="purchaseButtonOverVideoDiv" id="purchaseButtonOverVideoDiv">
            <!--hide to make it not be shown when embedded in iframe-->
            <button id="purchaseButtonOverVideo" class="tr" aria-label="Support this AI" @click="onPurchaseButtonPressed()">Support this AI</button>

            <div class="purchaseButtonOverVideoArrow hidden" id="purchaseButtonOverVideoArrow">
                <p class="purchaseButtonOverVideoArrow">&uarr;</p>
                <p id="purchaseButtonOverVideoDivText" class="tr" aria-hidden="true">Click here to get access to all actions</p>
            </div>
        </div>
    </div>

</template>
