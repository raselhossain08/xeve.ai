import { callAPI, logThis, showNotification, shortenTransitionImages, mobileCheck, shortenTransitionImagesForArray } from './utils.js' //GoogleAuthProvider, signInWithPopup
import { setVideoModeAndPlaylist, bufferRange, checkIfTimestampInBufferedRanges, checkWhyStuck } from './script_mse_hls.js'
//import { doc } from 'firebase/firestore'
import { useGeneralStore } from "../stores/generalStore";
import { addToCookie, deleteFromCookie, getFromCookie } from './cookie.js'



console.log("script_player.js running")

let stackTracePlayPause = [];

const urlParams = new URLSearchParams(window.location.search);
function pushToStackTracePlayPause(text) {
    //current time as string with MM:SS.mmm
    const now = new Date();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const milliseconds = now.getMilliseconds().toString().padStart(3, "0");
    const timeString = `${minutes}:${seconds}.${milliseconds}`
    stackTracePlayPause.push(timeString + text)
    if (stackTracePlayPause.length > 10) {
        stackTracePlayPause.shift()
    }
}

//check if browser is chrome based and therefore quick (because safari is slow)
const userAgent = navigator.userAgent;
const isChromeBased = userAgent.includes("Chrome") || userAgent.includes("Chromium");
logThis(null, `isChromeBased: ${isChromeBased}`)


function import_stylesheet(file) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = file;
    document.head.appendChild(link);
}

//Parametrisierung:
const jumpFadeTime = 250 //ms
const length_transition = 250 //ms. Do not change! Has to fit to the length of the transtion videos!
const timeToBufferNextVideoAndJump = 400 //ms. this is the minimum time between receiving a jump and jumping. This is important because the video has to buffer before jumping
const initialySayHi = true
const initialySayHi1AfterSeconds = 4 * 1000 //this MUST BE SET because this also triggers the initial showing of command field! after this time the AI will say welcome words
const initialySayHi2AfterSeconds = 2 * 60 * 1000 //after this time the AI will say welcome words
const askIfUserStillThereTime = 10 * 60 * 1000 //after this time there will be a window asking if the user is still there
const limitNumbersOfMessagesForNonsubscribers = true;
const maxChatMessages = 4;
const requests_time = 5;  // minutes
const lengthOfFlyInAnimation = 8000; //ms
const minVideoSpeed = 0.7;
const maxVideoSpeed = 1.4;
const triggerJumpFunctionBeforeJump = 5; //ms
let useTransitions = true; //deactivated 20.12.24 because looks not good. reactivate?
//Parametrisierung Ende

const ua = navigator.userAgent;
const isIphoneSafari = /iPhone/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);

if (isIphoneSafari) {
    useTransitions = false;
    logThis("", "iPhone Safari detected")
}

let lastUserInteraction = Date.now();
let jumpIsRunning = false;
let handleJumpRunning = 0;
let looksLikeAlreadyDidAction = false;
const number_of_transitionFrameShowers = 5
let mainVideoUrl = null;
//let mainVideoUrlLowQual = null;
let currentQual = "low";
let commandsInPast = [];
let isStuck = false;
let initialStartTime = null;
let sayThisNext = null;
let cssIsInFullscreen = false;
let isReturning = false;
let chatHistoryList = [];

const isavatarStr = urlParams.get('isavatar')
let isavatar = false;
if (isavatarStr && isavatarStr === "true") {
    isavatar = true;
}

//const transitionPlayer1 = document.getElementById('transitionPlayer1'); DO NOT use transition videoplayers anymore because this is too ressource intensive! On Smartphones (but also on laptops!), the videoplayer was not loaded. Probably also due to ressource optimization of browsers 
//const transitionPlayer2 = document.getElementById('transitionPlayer2');
//let nextTransitionPlayer = transitionPlayer1;
//let afterNextTransitionPlayer = transitionPlayer2;
let videoBackground = null;
let activePlayer = null;
let videoPlayerToFadeOutGlobal = null; //doesn't matter to which this is set initially 
let charSessionId = null;
let nextJumps = [];
let currentVideo;
let videoPaused = true;//is is important to set to true because otherwise the video will start playing when the page is loaded
let videoMutedByUser = false;
let showAiSayings = true; //this not the same like videoMutedByUser because just because of this I would not mute the video. But I will show speech bubbles etc. 
let jumpPrepared = false;
let alreadyPressedMic = false;
let sendButtonAlreadyClicked = false;
let quitCycleDueToPause = false;
let validCycle = null;
let lastTimestampActivePlayerMillis = null;


async function showSpeechBubble() {
    document.getElementById('speechBubble').classList.add('visible', 'bouncing');
    setTimeout(function () {
        document.getElementById('speechBubble').classList.remove('visible', 'bouncing');
    }, 10000);
}




var backgroundSound = null;
function startBackgroundNoise() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); // The second is to ensure compatibility with Safari
    backgroundSound = window.audioCtx.createBufferSource();
    fetch('background_noise.mp3')
        .then(response => {
            if (!response.ok) throw new Error("Failed to load sound file");
            return response.arrayBuffer();
        })
        .then(buffer => window.audioCtx.decodeAudioData(buffer))
        .then(decoded => {
            backgroundSound.buffer = decoded;
            backgroundSound.loop = true;

            // Catch start errors
            backgroundSound.onended = function () {
                logThis("", "ERROR! #34589 Audio playback ended");
            };
        }).catch(e => logThis("", "ERROR! #443 Error in audio handling: " + e));
}

let lastTimePressedBigPlayButton = Date.now();
async function checkIfUserInteracts() {
    const now = Date.now();
    if (now - lastUserInteraction > askIfUserStillThereTime) {
        pauseAndShowPlayButton("Are you still watching?")
    }
}

export async function pauseAndShowPlayButton(text) {
    if (videoPaused) return //only run this if it is not already paused
    textIfPaused.style.display = "block";
    textIfPaused.textContent = text;
    document.getElementById('cover').classList.remove('hidden')
    document.getElementById('bigplayButtonIfPaused').classList.remove('initially_hidden');
    document.getElementById('bigplayButtonIfPaused').classList.remove('gone')
    document.getElementById('cover').classList.remove('gone')
    document.getElementById('bigplayButtonIfPaused').classList.remove('initially_hidden');
    document.getElementById('bigplayButtonIfPaused').classList.remove('hidden');
    logThis(null, "togglePlayPauseNow is running from checkifuserinteracts!")
    togglePlayPauseNow()
}



// Function to prepare audio (e.g. saying)
async function prepareAudio(base64AudioString) {
    // Decode the base64 string to binary
    let binaryString = window.atob(base64AudioString);
    let byteNumbers = new Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        byteNumbers[i] = binaryString.charCodeAt(i);
    }
    let byteArray = new Uint8Array(byteNumbers);

    // Create an audio Blob from the byte array
    let audioBlob = new Blob([byteArray], { type: "audio/mp3" });

    // Create a file reader to read the blob as array buffer
    let reader = new FileReader();
    reader.readAsArrayBuffer(audioBlob);
    reader.onloadend = () => {
        // Decode the audio data
        if (!window.audioCtx || window.audioCtx.length == 0) {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            window.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); // The second is to ensure compatibility with Safari
            new Promise(resolve => setTimeout(resolve, 100));
        }
        window.audioCtx.decodeAudioData(reader.result, (decodedAudioData) => {
            var realAudioSource = window.audioCtx.createBufferSource();
            realAudioSource.buffer = decodedAudioData;

            //this part is to reduce the volume of the audio
            var gainNode = window.audioCtx.createGain();
            const generalStore = useGeneralStore();
            if (generalStore.domainname == "talktomeimai") { gainNode.gain.value = 0.18; } //because John is more silent
            else { gainNode.gain.value = 0.14; }

            realAudioSource.connect(gainNode);
            sayThisNext = [gainNode, realAudioSource];
        });
    };
};

async function playAudio() {
    if (!window.audioCtx || window.audioCtx.length == 0) {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        await new Promise(resolve => setTimeout(resolve, 50));
        window.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); // The second is to ensure compatibility with Safari
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!window.audioCtx || window.audioCtx.length == 0) {
        logThis("", `ERROR! #4840: Audio context or audio source not set up correctly: window.audioCtx: ${JSON.stringify(window.audioCtx)}, sayThisNext: ${sayThisNext}`);
        return;
    }
    if (!sayThisNext || sayThisNext.length < 2) {
        logThis("", `ERROR! #4841: sayThisNext is empty: ${sayThisNext} nextJumps: ${JSON.stringify(nextJumps)}`);
        return;
    }

    sayThisNext[0].connect(window.audioCtx.destination);
    sayThisNext[1].start();
}


export function onCommandFormSubmit() {
    const generalStore = useGeneralStore();
    const videoname = generalStore.videoname;
    if (handleJumpWithCommandRunning) return; // Do nothing if a request is already running. The user has to wait and then click again
    sendButtonAlreadyClicked = true;
    let paiSubscriptionItems = window.paiSubscriptionItems
    if (!paiSubscriptionItems || !(videoname in paiSubscriptionItems)) {
        //limit how often the user can send a command if he is not a supporter
        const now = Date.now();
        commandsInPast = commandsInPast.filter((time) => now - time < requests_time * 60 * 1000);
        if (limitNumbersOfMessagesForNonsubscribers && commandsInPast.length >= maxChatMessages) {
            let timeRemainingString = "";
            /* this would show remaining time BUT do NOT use because then the user is less likely to subscribe
            const oldestCommand = commandsInPast[0];
            const timeRemaining = requests_time * 60 * 1000 - (now - oldestCommand);
            const minutesRemaining = Math.floor(timeRemaining / 60000);
            const secondsRemaining = Math.floor((timeRemaining % 60000) / 1000);
            if (minutesRemaining >= 1) {
                timeRemainingString = `Next in ${minutesRemaining + 1} minutes. `;
            } else {
                timeRemainingString = `Next in ${secondsRemaining} seconds. `;
            } */
            showNotification("bad", `As a non-supporter you can only send ${maxChatMessages} messages every ${requests_time} minutes. ${timeRemainingString}Support this AI to send unlimited chat messages.`, "long", "Support AI", window.onPurchaseButtonPressed);
            return;
        } else {
            commandsInPast.push(now);
        }
    }
    command();
};


//for microphone usage:
async function checkAndRequestMicrophonePermission() {
    navigator.mediaDevices.getUserMedia({ audio: true });
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Microphone permission granted
        stream.getTracks().forEach(track => track.stop()); // stop the stream
        return true;
    } catch (error) {
        // Microphone permission denied or error occurred
        logThis("", 'ERROR! Error requesting microphone permission:' + error);
        return false;
    }
}


//const sayingofaibubble = document.getElementById('sayingofaibubble');

async function addChatInChatHistory(type, text, isNew = true) {
    //isNew is false is used when the user returns from payment
    if (isNew) {
        chatHistoryList.push([type, text])
        window.chatHistoryList = chatHistoryList
    }
    const roughWidthOfText = Math.round(text.length * 7.5 + 5); //x px per character. The +5 is needed because otherwise for very short texts like "ok" the bubble would not be enough
    let width = 0
    switch (true) {
        case (roughWidthOfText < 150):
            width = roughWidthOfText;
            break;
        case (roughWidthOfText < 300):
            width = roughWidthOfText / 2 + 5; //add a bit because the line break makes it not perfect
            break;
        case (roughWidthOfText < 450):
            width = roughWidthOfText / 3 + 10; //add a bit because the line break makes it not perfect
            break;
        default:
            width = 230;
            break;
    }
    var newSayingOfAIBubble = document.createElement('div');
    newSayingOfAIBubble.textContent = text;
    newSayingOfAIBubble.style.width = `min(90%, ${width}px)`;
    newSayingOfAIBubble.classList.add('bubbleinchathistory');
    if (isNew) newSayingOfAIBubble.classList.add('shortAnim');
    newSayingOfAIBubble.classList.add(type);
    if (document.getElementById("chatHistory").firstChild) {
        document.getElementById("chatHistory").insertBefore(newSayingOfAIBubble, document.getElementById("chatHistory").firstChild);
    } else {
        document.getElementById("chatHistory").appendChild(newSayingOfAIBubble);
    }
    /* do not make the messages look "old" because that makes them hard to read and make it look not good
    if (isNew) {
        const timeoutLengthAddOld = 10000; //ms
        setTimeout(function () { // Hide it again after another x seconds
            newSayingOfAIBubble.classList.add('old');
        }, timeoutLengthAddOld);
    }
    else {
        newSayingOfAIBubble.classList.add('old');
    } */
}


async function showSayingOfAI(text) {
    let otherinstanceSeemsToBeRunning = false;
    if (sayingofaibubble.classList.contains('visible') || document.getElementById('speechBubble').classList.contains('visible')) { //also check if speechBubble is currently shown because otherwise this overlaps each other
        otherinstanceSeemsToBeRunning = true;
    }
    while (otherinstanceSeemsToBeRunning) {
        await new Promise(resolve => setTimeout(resolve, 300)); //timeout so that videoplayer 1 will realy load and ressources of the browser are not blocked by all players trying to load at the same time
        if (sayingofaibubble.classList.contains('visible')) {
            otherinstanceSeemsToBeRunning = true;
        }
        else {
            otherinstanceSeemsToBeRunning = false;
        }
    }
    const roughWidthOfText = text.length * 8; //x px per character
    let maxWidth = 0
    switch (true) {
        case (roughWidthOfText < 300):
            maxWidth = roughWidthOfText;
            break;
        case (roughWidthOfText < 600):
            maxWidth = roughWidthOfText / 2 + 5; //add a bit because the line break makes it not perfect
            break;
        case (roughWidthOfText < 1000):
            maxWidth = roughWidthOfText / 3 + 10; //add a bit because the line break makes it not perfect
            break;
        default:
            maxWidth = 400;
            break;
    }
    sayingofaibubble.style.maxWidth = `${maxWidth}px`;
    sayingofaibubble.classList.add('visible');  // Add the fade in and bouncing effects
    sayingofaibubble.textContent = text;
    const timeoutLength = text.length * 120; //x ms per character
    setTimeout(function () { // Hide it again after another x seconds
        sayingofaibubble.classList.remove('visible');  // Remove the fade out and bouncing effects
    }, timeoutLength);
}

let isListening = false;
export function micButtonPressedWithPermissionsGranted() {
    logThis("", "mic permission ok")
    // This block will execute if the permission is granted.
    if (!isListening) {
        isListening = true;
        document.getElementById('microphoneIcon').src = 'mic.png';
        document.getElementById('microphoneBtn').classList.add('micshown');
        document.getElementById('commandField').classList.add('hidden');
        document.getElementById('sendButton').classList.add('hidden');
        startDictation(function (text) {
            // Handle the transcribed text.
            if (text !== "" && text !== undefined) {
                logThis(null, `miclog: dictated text: ${text}`);
                command(text);
            }
        });
    } else {
        isListening = false;
        document.getElementById('microphoneIcon').src = 'micmuted.png';
        document.getElementById('microphoneBtn').classList.remove('micshown');
        document.getElementById('commandField').classList.remove('hidden');
        document.getElementById('sendButton').classList.remove('hidden');
        stopDictation();
    }
}

//const togglePlayPauseImage = document.getElementById('togglePlayPauseImage');


async function prepareOnePlayer() {
    logThis(null, "prepareOnePlayer is running")
    document.getElementById('videoPlayer1').play()
    pushToStackTracePlayPause("prepareOnePlayer: videoPlayer1.play()")
    isChromeBased ? await wait(300) : await wait(800) //chrome is quicker
    document.getElementById('videoPlayer1').currentTime = 0 //set to 0 because the video will normally start at some later point and this makes sure the browser buffers from beginning
    isChromeBased ? await wait(300) : await wait(800)
    document.getElementById('videoPlayer1').currentTime = 60 * 5
    isChromeBased ? await wait(300) : await wait(800)
    try {
        document.getElementById('videoPlayer1').ready = false;
        document.getElementById('videoPlayer1').currentTime = currentVideo.startTime / 1000; //use this and not the initial time because this is more failure-free
    }
    catch (e) {
        logThis(null, `ERROR! #2332721 setting currentTime of videoPlayer1: ${e}`)
    }
    isChromeBased ? await wait(300) : await wait(800)
    if (!isChromeBased) await wait(2000) //experience showed that this is needed. Otherwise user will see the char flicker around 
}


export async function micButtonPressed() {
    const audioConstraints = {
        audio: {
            sampleRate: 16000,         // Lower sample rate to reduce data throughput and processing
            channelCount: 1,           // Use mono audio to decrease the complexity of audio processing
            volume: 0.5,
            echoCancellation: false,   // Disable echoCancellation for less processing (can be left true if needed for quality)
            noiseSuppression: false,   // Disable noise suppression to save processing power
            autoGainControl: false     // Disable automatic gain control to reduce CPU usage
        }
    };

    alreadyPressedMic = true;
    logThis("", "mic button pressed")
    let micPermissionAvailable = await checkAndRequestMicrophonePermission();
    if (micPermissionAvailable) {
        micButtonPressedWithPermissionsGranted()
    }
    else {
        micPermissionAvailable = await checkAndRequestMicrophonePermission();
        if (micPermissionAvailable) {
            micButtonPressedWithPermissionsGranted()
        }
        else {
            showNotification("neutral", "Please grant microphone access to enable voice")
        }
    }
}


let pauseStart = null
async function togglePlayPauseNow() {
    if (videoPaused) {
        logThis(null, "Starting after pause")
        //togglePlayPauseImage.src = 'pause_button.png'
        playAfterPause()
        backgroundSound.connect(window.audioCtx.destination);
    } else {
        logThis(null, "Pausing")
        pauseStart = Date.now()
        activePlayer.pause();
        pushToStackTracePlayPause("togglePlayPauseNow: activePlayer.pause()")
        //togglePlayPauseImage.src = 'play_button.png'
        videoPaused = true
        backgroundSound.disconnect(); //use disconnect instead of stop because after stop I would have to re do the whole backgroundSound
    }
}


function checkFullscreen() {
    return document.fullscreenElement || document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement || cssIsInFullscreen //the check for cssIsInFullscreen is important 
}

async function playAfterPause() {
    let cycleOfThisInstance = validCycle
    let srcSet = (!(activePlayer.src === "" || activePlayer.src === undefined || activePlayer.src === null)) || activePlayer.readyState > 0; //the later is needed because with hls in safari, the src is not set even if the video plays
    let tries = 0;
    while (!srcSet) {
        await new Promise(resolve => setTimeout(resolve, 400));
        srcSet = (!(activePlayer.src === "" || activePlayer.src === undefined || activePlayer.src === null)) || activePlayer.readyState > 0; //the later is needed because with hls in safari, the src is not set even if the video plays
        tries += 1;
        if (tries > 5) {
            logThis("", "ERROR! #57498 Error playing after pause. Could not set src of activePlayer")
            break;
        }
    }
    await activePlayer.play()
        .catch(error => logThis("", 'ERROR! #4983 Error playing activePlayer: ' + error + ` stackTrace: ${stackTracePlayPause}`));
    pushToStackTracePlayPause("playAfterPause: activePlayer.play()")
    videoPaused = false;
    if (pauseStart) {
        timePausedInCurrentVideo = Date.now() - pauseStart
        pauseStart = null
    }
    if (quitCycleDueToPause) {
        quitCycleDueToPause = false
        if (jumpPrepared) {
            initiateJump(cycleOfThisInstance)
        }
        else {
            handleJump(undefined, cycleOfThisInstance)
        }
    }
}

function enterFullscreen() {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) { // Firefox
        document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) { // Chrome, Safari and Opera
        document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
        document.documentElement.msRequestFullscreen();
    }
    setCssToFullscreen() //if the browser does not support fullscreen mode still set css to fullscreen
}

function exitFullscreen() {
    // Exit fullscreen mode
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { // Firefox
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // IE/Edge
        document.msExitFullscreen();
    }
    setCssToLeaveFullscreen()
}


export async function setCssToFullscreen() {
    cssIsInFullscreen = true;
    document.getElementById('videoContainer').classList.add('fullscreen');
    document.getElementById("body").classList.add('fullscreen');
    if (!window.isIframe) {
        document.getElementById("boxRightOfVideo").classList.add('fullscreen');
        document.getElementById("firstBlockDiv").classList.add('fullscreen');
        document.getElementById("secondBox").classList.add('fullscreen');
        document.getElementById("leaveFeedback").classList.add('fullscreen');
        document.getElementById("commentResponse").classList.add('fullscreen');
        document.getElementById("menuBar").style.display = "none";
        document.getElementById("footer").style.display = "none";
        document.getElementById("footer").style.display = "none";
        document.getElementById("badgeDiv").style.display = "none";
    }
}

export async function setCssToLeaveFullscreen() {
    cssIsInFullscreen = false;
    document.getElementById('videoContainer').classList.remove('fullscreen');
    document.getElementById("body").classList.remove('fullscreen');
    if (!window.isIframe) {
        document.getElementById("boxRightOfVideo").classList.remove('fullscreen');
        document.getElementById("firstBlockDiv").classList.remove('fullscreen');
        document.getElementById("secondBox").classList.remove('fullscreen');
        document.getElementById("leaveFeedback").classList.remove('fullscreen');
        document.getElementById("commentResponse").classList.remove('fullscreen');
        document.getElementById("menuBar").style.display = "flex";
        document.getElementById("footer").style.display = "flex";
        document.getElementById("badgeDiv").style.display = "unset";
    }
}



let timePausedInCurrentVideo = 0;
let timeStuckInCurrentVideo = 0;
async function getCurrentTimestampActivePlayerMillis(cycleOfThisInstance) {
    let plausible = false;
    let currentTimeActivePlayerMillis = null;
    let timeDiffLastJumpRough = Date.now() - lastJumpRealTime;
    let theoreticCurrentPlayerTime = currentVideo.startTime + timeDiffLastJumpRough - timePausedInCurrentVideo - timeStuckInCurrentVideo + timeAdjustmentDueToPlaybackSpeed//this is only rough because lastJumpRealTime is also only set roughly because after the jump
    // plausibility check needed because I had problems with safari giving back an "old" time. It gave back the time before the jump BUT IF it is not plausible, nothing bad should happen. here, it will only cost me 250ms or so but then it will run normally
    currentTimeActivePlayerMillis = parseInt(activePlayer.currentTime * 1000);


    // if (!plausible && !isStuck && !videoPaused) {//do not use this because can lead to realy bad jumps if sometimes the  time is set with theoretic time and sometimes with the current time
    /*if (isIphoneSafari) { // always do a theoreticCurrentPlayerTime on ios because it looks like iOS Safari does not realy update the currentTime of the video element
        logThis(cycleOfThisInstance, `Setting to theoretic player time because is iphone safari. currentTimeActivePlayerMillis: ${currentTimeActivePlayerMillis} theoreticCurrentPlayerTime: ${theoreticCurrentPlayerTime} currentVideo.startTime: ${currentVideo.startTime} timeDiffLastJumpRough: ${timeDiffLastJumpRough} theoreticCurrentPlayerTime: ${theoreticCurrentPlayerTime} lastJumpRealTime: ${lastJumpRealTime} timePausedInCurrentVideo: ${timePausedInCurrentVideo} timeStuckInCurrentVideo: ${timeStuckInCurrentVideo}`)
        checkIfPausedButShouldntBe()    //this is a workaround because on ios if the user leaves the screen and returns, then the video is paused but no play is shown
        return theoreticCurrentPlayerTime
    }*/
    if (Date.now() - lastJumpRealTime < 150) { //if last jump was in last few ms then the currentTime might not be updated yet. So use the theoretic time (I had problems with this even on chrome)
        return theoreticCurrentPlayerTime
    }
    if (currentTimeActivePlayerMillis >= currentVideo.startTime && currentTimeActivePlayerMillis >= theoreticCurrentPlayerTime - 2000 && currentTimeActivePlayerMillis <= theoreticCurrentPlayerTime + 2000) {
        plausible = true;
    }
    if (!plausible && timeDiffLastJumpRough < 1000) { //added the second condition because if it is close to a jump then the current time might not be set yet so don't give a warning
        logThis(cycleOfThisInstance, `WARNING! #233271 currentTimeActivePlayerMillis not plausible: ${currentTimeActivePlayerMillis} theoreticCurrentPlayerTime: ${theoreticCurrentPlayerTime} currentVideo.startTime: ${currentVideo.startTime} timeDiffLastJumpRough: ${timeDiffLastJumpRough} lastJumpRealTime: ${lastJumpRealTime} timePausedInCurrentVideo: ${timePausedInCurrentVideo} timeStuckInCurrentVideo: ${timeStuckInCurrentVideo}`)
    }
    return currentTimeActivePlayerMillis
}

/* async function checkVideoTime() {/Users/johanneshirschbrunn/Documents/Mega/Sicherungen Code/PersonAISicherung240829_stable.zip
     const currentTimestampActivePlayerMillis = await getCurrentTimestampActivePlayerMillis(cycleOfThisInstance)
 
     //;
     //await logThis(cycleOfThisInstance, `checkVideoTime running currentTimeStampPlayerMillis: ${currentTimeStampPlayerMillis}  currentVideo.startTime: ${currentVideo.startTime} nextonlyWhenCalledPoint: ${currentVideo.nextonlyWhenCalledPoint} handleJumpBeforeOnlyWhen:${handleJumpBeforeOnlyWhen} nextJump.jumpFrom: ${nextJump.jumpFrom} jumpPreLoadTime: ${jumpPreLoadTime} `);
     //await logThis(cycleOfThisInstance, `Log2: currentT: ${Math.round(currentTimestampActivePlayerMillis)} nextJump: ${JSON.stringify(nextJump)}`)
 
     //check if I need to jump
     if (nextJumps.length !== 0 && currentTimestampActivePlayerMillis >= (nextJumps[0].jumpFrom - jumpPreLoadTime) && preparedJump === true && !videoPaused) {
         preparedJump = false //has to be set directly at the beginning because this script may start multiple times even though the last cycle didn't finish yet
         initiatingJump = true
         await logThis(cycleOfThisInstance, `checkVideoTime running currentTimestampActivePlayerMillis: ${currentTimestampActivePlayerMillis}  currentVideo.startTime: ${currentVideo.startTime} nextonlyWhenCalledPoint: ${currentVideo.nextonlyWhenCalledPoint} handleJumpBeforeOnlyWhen:${handleJumpBeforeOnlyWhen} nextJumps.jumpFrom: ${nextJumps[0].jumpFrom} jumpPreLoadTime: ${jumpPreLoadTime} `);
         //await logThis(cycleOfThisInstance, `Log2: jump `)
         await initiateJump();
     }
 } */

let bufferRangeFunctionsRunning = []
let lastJumpRealTime = null;
let videoPlayingMode; //some browsers (Safari on iOS) do not allow custom media source extensions and therefore setting a buffer does not work. If so, I simply use normal hls (natively supported on iOS) 

export async function startAI() {
    const generalStore = useGeneralStore();
    const videoname = generalStore.videoname;
    if (videoname === "") {
        alert('Please submit a video in the params');
        return
    }

    videoBackground = document.getElementById('videoBackground');
    activePlayer = document.getElementById('videoPlayer1');
    videoPlayerToFadeOutGlobal = document.getElementById('videoPlayer1');

    for (let i = 1; i <= number_of_transitionFrameShowers; i++) {
        let transitionFrameShower = document.getElementById("transitionFrameShower" + i)
        transitionFrameShowers.push(transitionFrameShower)
    }

    let cycleOfThisInstance = 0
    validCycle = cycleOfThisInstance

    let responseJson;
    let _
    try {
        [_, responseJson] = await callAPI(cycleOfThisInstance, '/v1/startAI', { "videoname": videoname, "isavatar": isavatar, "originDomain": generalStore.domainname }, 'GET'); //MUSS so heißen weil ist global!
    } catch (error) {
        try {
            //retry
            [_, responseJson] = await callAPI(cycleOfThisInstance, '/v1/startAI', { "videoname": videoname, "isavatar": isavatar, "originDomain": generalStore.domainname }, 'GET'); //MUSS so heißen weil ist global!
        } catch (error) { logThis("", 'ERROR! #2782: Error calling startAI:' + error); }
    }

    hideCommandField()


    //first try to fetch the current video from cookie because maybe we're returning from a payment
    let returnFromCookieSessionWasSet = getFromCookie("returnFromCookieSessionWasSet")
    let currentStateFromCookie = getFromCookie("currentState")
    if (returnFromCookieSessionWasSet && new Date().getTime() - returnFromCookieSessionWasSet < 60 * 60 * 1000 && currentStateFromCookie && currentStateFromCookie.videoname === videoname) {
        //user is returning (e.g. from payment or from mail verification)
        deleteFromCookie("returnFromCookieSessionWasSet")
        for (let [type, text] of currentStateFromCookie.chatHistoryList) {
            addChatInChatHistory(type, text, false)
        }
        chatHistoryList = currentStateFromCookie.chatHistoryList
        delete currentStateFromCookie.chatHistoryList
        currentVideo = currentStateFromCookie
        window.currentVideo = currentStateFromCookie
        charSessionId = currentVideo.charSessionId
        isReturning = true
        addToCookie("returnFromCookieSessionWasSet", new Date(new Date().getTime() - 60 * 60 * 1000)) //set this to one hour ago so that this will not be used anymore
        logThis(cycleOfThisInstance, `Using currentVideo from cookie: ${JSON.stringify(currentVideo)}`)
    }
    else {
        //normal start
        currentVideo = responseJson
        window.currentVideo = responseJson
        charSessionId = responseJson.charSessionId;
    }

    mainVideoUrl = responseJson.videoUrl;
    //mainVideoUrlLowQual = responseJson.videoUrlLowQual;
    videoPlayingMode = await setVideoModeAndPlaylist(document.getElementById('videoPlayer1'), mainVideoUrl)
    if (videoPlayingMode === "MSE") {
        const abortController = new AbortController();
        let bufferUntil = Math.max(currentVideo.nextonlyWhenCalledPoint, currentVideo.runMinUntil || 0);
        bufferRange(currentVideo.startTime, bufferUntil, 2000, abortController, cycleOfThisInstance)//urgency 2s because this is roughly the time until the videoplayer will be started by the user 
        bufferRangeFunctionsRunning.push({ controller: abortController, startTime: currentVideo.startTime, endTime: currentVideo.nextonlyWhenCalledPoint });
    }
    const background_path = isavatar ? `generated_files/${videoname}/${videoname}_backg_av.webp` : `generated_files/${videoname}/${videoname}_backg.webp`;
    videoBackground.src = background_path;
    for (let transitionFrameShower of transitionFrameShowers) {
        transitionFrameShower.src = background_path;
    }

    try {
        logThis(cycleOfThisInstance, `ActivePlayer.readystate: ${activePlayer.readyState} mainVideoUrl: ${mainVideoUrl} videoPlayingMode: ${videoPlayingMode}`)
        while (!activePlayer.readyState >= 1) { // Check if metadata is already loaded
            await new Promise(resolve => {
                const onReady = () => {
                    activePlayer.removeEventListener('loadedmetadata', onReady);
                    resolve();
                };
                activePlayer.addEventListener('loadedmetadata', onReady);
            });
        }
        activePlayer.ready = false;
        activePlayer.currentTime = currentVideo.startTime / 1000;
        logThis(cycleOfThisInstance, `Setting currentTime of activePlayer to ${currentVideo.startTime / 1000}`)
    } catch (error) {
        logThis("", "ERROR! #8855 Failed to set activePlayer's currentTime: " + error);
    }

    await logThis(cycleOfThisInstance, `startAI finished ${JSON.stringify(currentVideo)} nextJumps[0]: ${JSON.stringify(nextJumps[0])}`);

    //continuouslyCallhandleJump();

    /* not needed anymore because switch to event driven
    //cyclicly check if I need to jump every x ms:
    const interval = 100; //  milliseconds
    setInterval(async function () {
        const currentTimestampActivePlayerMillis = await getCurrentTimestampActivePlayerMillis(cycleOfThisInstance)
        //check if I need to jump
 
        if (nextJumps.length !== 0 && currentTimestampActivePlayerMillis >= (nextJumps[0].jumpFrom - jumpPreLoadTime) && preparedJump === true && !videoPaused) {
            preparedJump = false //has to be set directly at the beginning because this script may start multiple times even though the last cycle didn't finish yet
            initiatingJump = true
            await logThis(cycleOfThisInstance, `checkVideoTime running currentTimestampActivePlayerMillis: ${currentTimestampActivePlayerMillis}  currentVideo.startTime: ${currentVideo.startTime} nextonlyWhenCalledPoint: ${currentVideo.nextonlyWhenCalledPoint} handleJumpBeforeOnlyWhen:${handleJumpBeforeOnlyWhen} nextJumps.jumpFrom: ${nextJumps[0].jumpFrom} jumpPreLoadTime: ${jumpPreLoadTime} `);
            //await logThis(cycleOfThisInstance, `Log2: jump `)
            await initiateJump();
        }
    }, interval);
*/
    initializeVideo()
}



async function initializeVideo() {

    // check if video was loaded and then show big play button
    const no_of_tries_video_load = 5;
    const ms_per_try = 400; //do not make this too long because the user could be confused if nothing happens
    let loaded = false
    let tries = 0
    while (!loaded && tries < no_of_tries_video_load) {
        tries++;
        if (document.getElementById('videoPlayer1').readyState >= 2) { //was 3 but changed to 2 to make the playback smoother
            loaded = true;
            break;
        }
        await wait(ms_per_try);
    }
    logThis(null, `Player is ready after ${tries} tries`)
    playText.classList.remove('initialPosition');
    document.getElementById("loadingDots").style.display = "none";
    await wait(350)
    document.getElementById('bigPlayButton').classList.remove('initially_hidden');
    document.getElementById('cover').classList.remove('fullopacity');

    //show a network message if not loaded after some time:
    const network_check_time = 10000;
    setTimeout(() => {
        if (document.getElementById('videoPlayer1').readyState < 3) {
            showNotification("neutral", "Network connection seems to be insufficient",)
        }
    }, network_check_time);
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/*
    async function continuouslyCallhandleJump() {
        while (true) {
            //ONLY FOR TESTING
            /*let addthis = instancesOfhandleJump
            let textElement = document.getElementById("dynamicText");
            let currentText = textElement.innerHTML;
            textElement.innerHTML = '';  // clear the content
            textElement.innerHTML = `${addthis} <br> ${currentText}`;
            
            let nowInS = Math.round(Date.now() / 1000)
            if (nowInS > lastTimeStampForTesting) {
                await logThis(cycleOfThisInstance, `#o continuouslyCallhandleJump running: getCurrentTimestampActivePlayerMillis: ${await Math.trunc(getCurrentTimestampActivePlayerMillis(cycleOfThisInstance))} Player1active? ${activePlayer === videoPlayer1} instancesOfhandleJump: ${instancesOfhandleJump} videoPaused: ${videoPaused} currentVideo: ${currentVideo.videoSnippetUrl}`)
                lastTimeStampForTesting = nowInS
            }
            //ONLY FOR TESTING UNTIL HERE
 
            //Continuously Call handle jump
            await logThis(cycleOfThisInstance, `instancesOfhandleJump: ${instancesOfhandleJump}`)
            if (instancesOfhandleJump === 0 && !videoPaused) { //If a command is given, handleJump will run more than once in parallel. This will start handleJump if no instance is running
                handleJump()
            }
 
            //Handle situation if e.g. response form API didn't come in time:
            handleBadSituation() //no await because this should not block the continuouslyCallhandleJump function
 
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }*/

/* async function handleBadSituation() {
     currentTime = await getCurrentTimestampActivePlayerMillis(cycleOfThisInstance)
     if (currentVideo.hasOwnProperty("nextonlyWhenCalledPoint")) {
         if (currentTime >= currentVideo.nextonlyWhenCalledPoint - 100) { //if currentTime is extremely close to nextOnlyWhen
             if (nextJumps[0].jumpFrom < currentVideo.nextonlyWhenCalledPoint && nextJumps[0].jumpFrom > currentTime) {
                 //everything is good because a jump is planned within the next milliseconds
             }
             else if (nextJumps.length > 0) {  //bad situation handling: if a jump is planned: do the jump right away
                 await logThis(cycleOfThisInstance, `WARNING! Very close to onlyWhenCalled and the planned jump is not until the nextOnlyWhen, therefore performing ugly jump. curenttime: ${currentTime}, nextonlywhen: ${nextonlyWhenCalledPoint}, nextJumps: ${nextJumps}`)
                 nextJumps[0].jumpFrom = currentTime
                 initiateJump()
             }
             else {
                 //bad situation handling: if no jump is planned: play the current video again
                 await logThis(cycleOfThisInstance, `WARNING! Very close to onlyWhenCalled and no jump is planned, therefore playing the current video again (this is pretty much an ugly jump). curenttime: ${currentTime}, nextonlywhen: ${nextonlyWhenCalledPoint}, nextJumps: ${nextJumps}`)
                 activePlayer.currentTime = 0;
                 activePlayer.play()
.catch(error => logThis("", 'ERROR! #384 Error playing activePlayer', error));
             }
         }
     } else {
         await logThis(cycleOfThisInstance, `WARNING! currentvideo has no nextonlywhen`)
 
     }
 }
 
async function setvideoRatio() {
    let success = false
    while (!success) {
        await new Promise(resolve => setTimeout(resolve, 200));
        let videoRatio = videoPlayer1.videoWidth / videoPlayer1.videoHeight;
        if (videoRatio && videoRatio > 0.5 && videoRatio < 3) { //plausibility check
            success = true
            document.body.style.setProperty('--video-ratio', videoRatio);
            document.body.style.setProperty('--one-through-video-ratio', 1 / videoRatio);
            defineFlyInAnimation()

        }
    }
}    
 */

let previousWidth = window.innerWidth;

export async function onBigPlayButtonClicked() {
    const generalStore = useGeneralStore();
    if (Date.now() - lastTimePressedBigPlayButton < 2000) return; //do not allow double clicks (this is still needed even though button will be hidden because there is a transition to hidden)
    lastTimePressedBigPlayButton = Date.now();
    document.getElementById('bigPlayButton').classList.add('hidden')

    startBackgroundNoise();
    await new Promise(resolve => setTimeout(resolve, 200));
    //This must be HERE DIRECTLY at the beginning. Otherwise safari will not allow window.audioCtx.resume() which is needed for audio to work in safari!
    if (!window.audioCtx || window.audioCtx.length == 0) {
        logThis("", "ERROR! window.audioCtx not there")
    }
    else if (window.audioCtx.state === 'suspended') {
        console.log("resuming window.audioCtx");
        await window.audioCtx.resume();
        console.log("window.audioCtx resumed");
    }

    if (initialStartTime == null) { initialStartTime = Date.now(); }

    //Prepare audio stuff here because has to be with user interaction:
    console.log("setting window.audioCtx")
    /*document.body.addEventListener('touchend', function () { // Ensure the audio context is resumed after a user gesture
        if (window.audioCtx.state === 'suspended') {
            console.log("window.audioCtx state suspended")
            window.audioCtx.resume();
        }
    });
    */
    try {
        backgroundSound.connect(window.audioCtx.destination); // Connect is synchronous, no need for .then
        backgroundSound.start(0); // Start the sound
    } catch (e) {
        logThis("", "ERROR! #656 Error in audio handling:" + e);
    }
    playAfterPause()
    lastJumpRealTime = Date.now();

    //togglePlayPauseBtn.style.display = 'block';
    soundBtn.style.display = 'block';
    fullscreenBtn.style.display = 'block';
    document.getElementById('commandFieldContainer').style.display = 'flex';

    const isHTTPS = window.location.protocol === 'https:';
    if (isHTTPS || generalStore.environment == "locally") { //only show the microphone button if the webapp is running on a secure connection because otherwise mic access is not allowed by browser
        var userAgent = navigator.userAgent || navigator.vendor || window.opera;
        // Check if the device is an iPhone, Android, or Windows Phone
        if (/android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            //Hide the mic button on Smartphones because when activated it slows down the video drastically
            document.getElementById('microphoneBtn').style.display = 'none';
        }
        else {
            //document.getElementById('microphoneBtn').style.display = 'block';
        }
    }

    //play background (KEEP this directly here to show direct relation to user interaction)

    //set up background audio (Hint: I use this complex approach because iPhone does not allow a normal audio element to play without user interaction! So this streaming approach is the only option):

    //fade out the cover:
    document.getElementById('cover').classList.add('hidden')
    playText.classList.add('hidden')
    setTimeout(function () {
        document.getElementById('cover').classList.add('gone') //important because otherwise is invisible but still on top of everything
        document.getElementById('bigPlayButton').classList.add('gone')
        playText.classList.add('gone')
        //document.getElementById('badgeDiv').classList.add('correctposition')
    }, 2000);

    handleJump(undefined, 0)
    continuouslyCheckAndSet();

    // Show the speech bubble x seconds afterwards
    if (isHTTPS || generalStore.environment == "locally") {
        setTimeout(function () {
            if (lastUserInteraction < Date.now() - 34 * 1000) { //this checks if the user has already did any interaction (means: I here check if the user sent a command in chat and if yes I will not show this)
                showSpeechBubble()
            }
        }, 35 * 1000);
        // show it again
        setTimeout(function () {
            if (lastUserInteraction < Date.now() - 3 * 60 * 1000) { //this checks if the user has already did any interaction (means: I here check if the user sent a command in chat and if yes I will not show this)
                showSpeechBubble()
            }
        }, 6 * 60 * 1000);
    }

    //show the command field after x seconds
    setTimeout(function () {
        showCommandField()
        setTimeout(function () {
            document.getElementById('commandFieldContainer').classList.add('shownslowly'); //leads to all further showings to be smooth with fading transparency (this first one here should be fast)
        }, 1000);
    }, initialySayHi1AfterSeconds + 5000);


    if (initialySayHi && !isReturning) {
        setTimeout(function () {
            {
                const currentlyInField = document.getElementById('commandField').value;
                if (sendButtonAlreadyClicked === false && currentlyInField === "") { //the second checks if the user is currently typing
                    command("welcomeUser1", true)
                }
            }
        }, initialySayHi1AfterSeconds);
        setTimeout(function () {
            {
                const currentlyInField = document.getElementById('commandField').value;
                const now = Date.now();
                let currentTimestampActivePlayerMs = getCurrentTimestampActivePlayerMillis(null)
                logThis(null, `check for welcomeUser2: now: ${now}, lastUserInteraction: ${lastUserInteraction}, now - lastUserInteraction: ${now - lastUserInteraction}`)
                if (!window.isIframe && currentlyInField === "" && !jumpIsRunning && handleJumpRunning == 0 && !looksLikeAlreadyDidAction && now - lastUserInteraction > 20000) { //the second checks if the user is currently typing and the last user interaction was long ago BECAUSE otherwise there could still be a request with command running because !handleJumpRunning is not save because multiple cycles could set that to false
                    let looksLikeActionRuns = nextJumps.length > 0 && nextJumps[0].runMinUntil !== null && nextJumps[0].runMinUntil > currentTimestampActivePlayerMs || currentVideo.runMinUntil > 0
                    if (!looksLikeActionRuns) { command("welcomeUser2", true) }
                }
                else {
                    logThis(null, `not doing welcomUser2 because currentlyInField: ${currentlyInField}, jumpIsRunning: ${jumpIsRunning}, handleJumpRunning: ${handleJumpRunning}, looksLikeAlreadyDidAction: ${looksLikeAlreadyDidAction}`)
                }
            }
        }, initialySayHi2AfterSeconds);
    }

    //if the player is still at 0s set is stuck to true
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (document.getElementById('videoPlayer1').currentTime === 0) {
        isStuck = true; //set to true to trigger the checkwhystuck test
        while (document.getElementById('videoPlayer1').currentTime === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        isStuck = false; //also reset this here because the normal resetting might not work
    }

    //check if the user interacts with the page
    setInterval(checkIfUserInteracts, 3 * 60 * 1000); //every x minutes check if the user interacts with the page
    //raiseIntensityBarOverTime()


};


export async function onBigPlayButtonIfPaused() {
    document.getElementById('cover').classList.add('hidden')
    document.getElementById('bigplayButtonIfPaused').classList.add('gone') //!important. Do not add this inside the timeout because then it can happen that if the user presses something that pauses two times, it is paused and the button not shown
    textIfPaused.style.display = "none";
    lastUserInteraction = Date.now();
    logThis(null, "togglePlayPauseNow is running from bigplayButtonIfPaused!")
    togglePlayPauseNow()
    const fadeEffect = setTimeout(function () {
        document.getElementById('cover').classList.add('gone') //important because otherwise is invisible but still on top of everything
        textIfPaused.classList.add('gone')
    }, 2000);
};


export function toggleMute() {
    if (!videoMutedByUser) {
        //mute the video
        document.getElementById('soundicon').src = 'soundmuted.png';
        activePlayer.muted = true;
        //nextTransitionPlayer.muted = true;
        //afterNextTransitionPlayer.muted = true;
        videoMutedByUser = true;
        document.getElementById('soundBtn').classList.add('disabled');
        showAiSayings = true;
        backgroundSound.disconnect(); //use disconnect instead of stop because after stop I would have to re do the whole backgroundSound
    } else {
        //unmute the video
        document.getElementById('soundicon').src = 'soundunmuted.png';
        activePlayer.muted = false;
        // nextTransitionPlayer.muted = false; //also unmute transition player because otherwise it does not get unmuted 
        // afterNextTransitionPlayer.muted = false;
        videoMutedByUser = false
        document.getElementById('soundBtn').classList.remove('disabled');
        //showAiSayings = false;
        backgroundSound.connect(window.audioCtx.destination);
    }

};


export function toggleFullscreen() {
    if (checkFullscreen()) {
        exitFullscreen()
    } else {
        enterFullscreen()
    }
};



let flyInAnimation = [];
export async function defineFlyInAnimation() {
    let transitionWidth = document.getElementById('videoContainer').offsetWidth * 0.5 - 30;
    let transitionHeight = 10;
    flyInAnimation = [];
    const offsetIncrement = 0.06;
    const lengthInitialPart = 0.04;
    const lengthWhereNothingHappensInbetween = 0.5;
    const bounceRepetitions = Math.floor((1 - lengthWhereNothingHappensInbetween - lengthInitialPart) / (offsetIncrement * 3)); // Number of times to repeat the bounce

    let current_offset = 0;
    //Let the element fly in from the bottom
    flyInAnimation.push(
        { transform: `translateX(${transitionWidth}px) translateY(${transitionHeight + 60}px)`, opacity: 0, offset: current_offset },
        { transform: `translateX(${transitionWidth}px) translateY(${transitionHeight}px)`, opacity: 1, offset: current_offset + (lengthInitialPart / 2) },
    )
    current_offset += lengthInitialPart;
    // Loop through the bouncing part multiple times
    for (let i = 0; i < bounceRepetitions; i++) {
        flyInAnimation.push(
            { transform: `translateX(${transitionWidth}px) translateY(${transitionHeight}px)`, opacity: 1, offset: current_offset },
            { transform: `translateX(${transitionWidth}px) translateY(${transitionHeight}px)`, opacity: 0.5, offset: current_offset + offsetIncrement },
            { transform: `translateX(${transitionWidth}px) translateY(${transitionHeight}px)`, opacity: 1, offset: current_offset + 2 * offsetIncrement }
        );
        current_offset += 3 * offsetIncrement; // Increment the current offset after each bounce cycle
    }

    // Transition to the final position after bouncing
    flyInAnimation.push(
        { transform: `translateX(${transitionWidth}px) translateY(${transitionHeight}px)`, opacity: 1, offset: 0.99 },
        { transform: `translateX(0) translateY(0) scale(0.8)`, offset: 1 } // Final position
    );
}

async function plausibiliseAndChooseNextJumps(cycleOfThisInstance, responseFromAPI, command) {
    let jumpsPlausibleAndNextJumpsWereSet = false
    const nextonlyWhenCalledPoint = currentVideo.nextonlyWhenCalledPoint;
    const currentTimestampActivePlayerMillis = await getCurrentTimestampActivePlayerMillis(cycleOfThisInstance) //do NOT set a delay here because then nextonlywhen does not match to currenttimestamp
    if (responseFromAPI.length === 0) {
        return false
    }
    //search a direct jump within the time till nexonlywhencalled (NOT until next planned jump because these jumps will be overridden anyways and the API takes into account that a not yet taken jump will be overridden)
    let index = 0
    if (!jumpIsRunning) {
        for (const possibleNextJumps of responseFromAPI) {
            const firstJumpJumpFrom = possibleNextJumps[0].jumpFrom
            const jumpFromAndStartTimeAreSame = firstJumpJumpFrom === possibleNextJumps[0].startTime
            if ((currentTimestampActivePlayerMillis + timeToBufferNextVideoAndJump < firstJumpJumpFrom && firstJumpJumpFrom < nextonlyWhenCalledPoint) || (jumpFromAndStartTimeAreSame && currentTimestampActivePlayerMillis < firstJumpJumpFrom && firstJumpJumpFrom < nextonlyWhenCalledPoint)) {
                jumpsPlausibleAndNextJumpsWereSet = true
                nextJumps = possibleNextJumps
                window.nextJumps = possibleNextJumps
                if (useTransitions) fetchTransitionImages(cycleOfThisInstance, nextJumps)
                prefetchVideoFragmentsForNextJumps(nextJumps, cycleOfThisInstance)
                if (possibleNextJumps.length >= 3 && !looksLikeAlreadyDidAction) looksLikeAlreadyDidAction = true
                await logThis(cycleOfThisInstance, `Received ${responseFromAPI.length - 1} or ${responseFromAPI.length} alternative jump sequences. currentTimestamp: ${currentTimestampActivePlayerMillis}. Using jump sequence with index ${index} jumpsPlausibleAndNextJumpsWereSet: ${jumpsPlausibleAndNextJumpsWereSet} nextJumps: ${JSON.stringify(shortenTransitionImagesForArray(nextJumps))}`)
                return jumpsPlausibleAndNextJumpsWereSet
            }
            index += 1
        }
    }

    index = 0
    if (jumpsPlausibleAndNextJumpsWereSet === false) {
        //there is no plausible jump yet
        if (nextJumps.length > 0) {
            //there is a planned jump so check after this
            const nextJumpsStartTime = nextJumps[0].startTime
            const nextJumpsnextonlyWhenCalledPoint = nextJumps[0].nextonlyWhenCalledPoint
            for (const possibleNextJumps of responseFromAPI) {
                const firstJumpJumpFrom = possibleNextJumps[0].jumpFrom
                if (nextJumpsStartTime < firstJumpJumpFrom && firstJumpJumpFrom < nextJumpsnextonlyWhenCalledPoint) {
                    await logThis(cycleOfThisInstance, `Received ${responseFromAPI.length - 1} or ${responseFromAPI.length} alternative jump sequences. Using jump sequence with index ${index}. currentTimestamp: ${currentTimestampActivePlayerMillis}.`)
                    jumpsPlausibleAndNextJumpsWereSet = true
                    //do the normal next jump but then also do the new nextjumps
                    nextJumps = [nextJumps[0], ...possibleNextJumps]
                    window.nextJumps = nextJumps
                    if (useTransitions) fetchTransitionImages(cycleOfThisInstance, nextJumps)
                    prefetchVideoFragmentsForNextJumps(nextJumps, cycleOfThisInstance)
                    await logThis(cycleOfThisInstance, `result from plausibiliseAndChooseNextJumps: jumpsPlausibleAndNextJumpsWereSet: ${jumpsPlausibleAndNextJumpsWereSet} nextJumps were added to an existing nextjump!: ${JSON.stringify(nextJumps)}`)
                    return jumpsPlausibleAndNextJumpsWereSet
                }
                index += 1
            }
        }
        else if (currentVideo.cyclePoint) {
            //there is no planned jump so check the cyclepoint
            const cyclePointEnd = currentVideo.cyclePoint[1]
            for (const possibleNextJumps of responseFromAPI) {
                const firstJumpJumpFrom = possibleNextJumps[0].jumpFrom
                if (cyclePointEnd < firstJumpJumpFrom && firstJumpJumpFrom < nextonlyWhenCalledPoint) { //attention: cyclePointEnd is here the smaller value (pretty much the jump to)! So this is correct! AND the nextonlyWhenCalledPoint is the same as it was
                    await logThis(cycleOfThisInstance, `Received ${responseFromAPI.length - 1} or ${responseFromAPI.length} alternative jump sequences. Using jump sequence with index ${index}. currentTimestamp: ${currentTimestampActivePlayerMillis}.`)
                    jumpsPlausibleAndNextJumpsWereSet = true
                    nextJumps = possibleNextJumps
                    window.nextJumps = possibleNextJumps
                    if (useTransitions) fetchTransitionImages(cycleOfThisInstance, nextJumps)
                    prefetchVideoFragmentsForNextJumps(nextJumps, cycleOfThisInstance)
                    await logThis(cycleOfThisInstance, `WARNING!: result from plausibiliseAndChooseNextJumps: jumpsPlausibleAndNextJumpsWereSet: ${jumpsPlausibleAndNextJumpsWereSet} nextJumps were taken after cyclepoint!: ${JSON.stringify(nextJumps)}`)
                    return jumpsPlausibleAndNextJumpsWereSet
                }
                index += 1

            }
        }
    }
    //handling of situation where no plausible but command is there are handled after this function!
    logThis(cycleOfThisInstance, `Jumps not plausible! jumpIsRunning: ${jumpIsRunning} currentTimestamp: ${currentTimestampActivePlayerMillis}. nextonlyWhenCalledPoint: ${nextonlyWhenCalledPoint}. nextJumps: ${JSON.stringify(nextJumps)}`)
    return false
}

async function setTimeoutAndCallHandleJump(cycleOfThisInstance,) {
    await new Promise(resolve => setTimeout(resolve, 20)); //this is important to make the previous changes like setting nextJumps get realized

    if (cycleOfThisInstance !== validCycle && cycleOfThisInstance != "newCommand") {
        await logThis(cycleOfThisInstance, `#3930: setTimeoutAndCallHandleJump: cycleOfThisInstance: ${cycleOfThisInstance}, validCycle: ${validCycle}  So quit this cycle.`)
        return
    }
    handleJump(undefined, cycleOfThisInstance)
}


export async function checkIfPausedButShouldntBe() {
    if (activePlayer.paused && !videoPaused && !jumpIsRunning) { //means: if the player is paused but shouldn't be 
        activePlayer.play().then(() => {
            console.log("Playback started successfully");
        }).catch(error => {
            pauseAndShowPlayButton("Resume");
        });
        pushToStackTracePlayPause("checkIfPausedButShouldntBe: activePlayer.play()")
    }
}

let stuckStart = null;
export function handleWaitingEvent() {
    if (initialStartTime !== null && !videoPaused) { //checks if the char is already running
        document.getElementById('loadingIconOverPlayer').style.display = 'block';
        isStuck = true;
        logThis("", `video is waiting. So it looks like the player is stuck.`);
    }
    stuckStart = Date.now()
}

export function handlePlayingEvent() {
    if (isStuck) {
        document.getElementById('loadingIconOverPlayer').style.display = 'none';
        isStuck = false;
        logThis("", `video is playing again.`)
        if (stuckStart) {
            timePausedInCurrentVideo = Date.now() - stuckStart
            stuckStart = null
        }
    }
}

const probablyIsSmartphone = mobileCheck();
console.log(`probablyIsSmartphone: ${probablyIsSmartphone}`)

const runCheckEveryMs = 700;
async function continuouslyCheckAndSet() {
    while (true) {
        await new Promise(resolve => setTimeout(resolve, runCheckEveryMs)); //check every 700ms so the animation will be shown max 1,4s after the player is stuck

        if (!videoPaused) {
            //check if the player is stuck
            if (isStuck) {
                await logThis(validCycle, `WARNING! Player seems to be stuck.`)
                await checkIfPausedButShouldntBe()
                const currentTimestampActivePlayerMillis = await getCurrentTimestampActivePlayerMillis(null)
                if (videoPlayingMode === "MSE") checkWhyStuck(currentTimestampActivePlayerMillis)
            }/*
            else if (!probablyIsSmartphone && initialStartTime !== null && initialStartTime + 10000 < Date.now()) {  //check if I should switch to high quality. If smartphone leave it in low quality also because probably network is not too good
                //if (currentQual === "low") { setVideoQuality("high") }
                this would calculate the buffer length BUT the buffer length is very different. e.g. in very good network conditions it will only buffer 2.5s constantly!
                const bufferedUntil = activePlayer.buffered.end(activePlayer.buffered.length-1);
                const bufferLength = bufferedUntil - activePlayer.currentTime 
                const minBufferLength = 30; // seconds of buffer considered "safe"
                console.log(`bufferLength for video quality: ${bufferLength}`)
            }*/

            //check if cyclepoint is reached
            if (nextJumps.length == 0 && currentVideo && currentVideo.cyclePoint) { // the currentVideo check is needed because this can run already before the first currentvideo was fetched
                const cyclePoint = currentVideo.cyclePoint
                const cyclePointStart = cyclePoint[0]
                const cyclePointEnd = cyclePoint[1]
                let currentTimestampActivePlayerMillis = await getCurrentTimestampActivePlayerMillis(null)
                if (currentTimestampActivePlayerMillis >= cyclePointStart - runCheckEveryMs) {
                    if (videoPlayingMode === "MSE") {
                        const abortController = new AbortController();
                        bufferRange(cyclePointEnd, cyclePointStart, 0, abortController) //already buffer the cyclepoint range to be prepared
                        bufferRangeFunctionsRunning.push({ controller: abortController, startTime: cyclePointEnd, endTime: cyclePointStart });
                    }
                    await new Promise(resolve => setTimeout(resolve, cyclePointStart - currentTimestampActivePlayerMillis - 30));
                    currentTimestampActivePlayerMillis = await getCurrentTimestampActivePlayerMillis(null)
                    if (nextJumps.length == 0 && currentVideo.cyclePoint && currentTimestampActivePlayerMillis >= cyclePointStart - 100) {
                        //situation still is the same -> use cyclePoint
                        await logThis(validCycle, `WARNING! Cyclepoint reached. So restarting the current video! currentTimestamp: ${currentTimestampActivePlayerMillis}, cyclePoint: ${cyclePoint}`)
                        try {
                            activePlayer.ready = false;
                            activePlayer.currentTime = cyclePointEnd / 1000;
                        } catch (error) {
                            logThis("", "ERROR! #2132 Failed to set activePlayer's currentTime: " + error);
                        }
                        lastJumpRealTime = Date.now() //must set this to ensure time plausibilisation is still okay
                        currentVideo.startTime = cyclePointEnd //must set this to ensure time plausibilisation is still okay
                    }
                }
            }
            //save the current state to cookie
            addToCookie("currentState", getCurrentStateForCookie());
            //alwaysEnsureCurrentTimestampIsBuffered(document.getElementById('videoPlayer1'))
        }
        if (window.pauseVideo === true) {
            pauseAndShowPlayButton("Resume")
            window.pauseVideo = false
        }
    }
}

function getCurrentStateForCookie() {
    const generalStore = useGeneralStore();
    const videoname = generalStore.videoname;
    let currentStateForCookie = JSON.parse(JSON.stringify(currentVideo)) //deep copy
    currentStateForCookie.chatHistoryList = window.chatHistoryList || []
    currentStateForCookie.videoname = videoname
    return currentStateForCookie
}
async function prefetchVideoFragmentsForNextJumps(nextJumps, cycleOfThisInstance) {
    if (videoPlayingMode !== "MSE") {
        return
    }
    if (cycleOfThisInstance !== validCycle && cycleOfThisInstance != "newCommand") {
        logThis(cycleOfThisInstance, `#3302: prefetchVideoFragmentsForNextJumps: not fetching because is not current cycle. cycleOfThisInstance: ${cycleOfThisInstance}, validCycle: ${validCycle}  So quit this cycle.`)
        return
    }
    if (!nextJumps || nextJumps.length === 0) {
        logThis(cycleOfThisInstance, `#3302: prefetchVideoFragmentsForNextJumps: not fetching because no nextjumps. cycleOfThisInstance: ${cycleOfThisInstance}, validCycle: ${validCycle}  So quit this cycle.`)
        return;
    }
    logThis(cycleOfThisInstance, `#48482: prefetchVideoFragmentsForNextJumps running for nextJumps: ${JSON.stringify(nextJumps)}`);
    if (currentVideo.nextonlyWhenCalledPoint - nextJumps[0].jumpFrom > 5000 && videoPlayingMode === "MSE") { //normally I pre-buffer until nextonlywhen so aborting only makes sense if I now jump from a point which is far earlier than nextonlywhen (normally this will happen if there was a command)
        await abortOtherBufferRangesButEnsureCurrentVideo(cycleOfThisInstance) //await this to make sure it does not abort the function which will be started in the next line
    }
    const curenttime = await getCurrentTimestampActivePlayerMillis(cycleOfThisInstance);
    let isFirstJump = true;
    for (const [index, jump] of nextJumps.entries()) {
        let urgency = 999999;
        if (isFirstJump) {
            isFirstJump = false;
            urgency = Math.max(jump.jumpFrom - curenttime, 0)

        }
        logThis(cycleOfThisInstance, `#3701: prefetchVideoFragmentsForNextJumps urgency: ${urgency}, jumpFrom: ${jump.jumpFrom}, startTime: ${jump.startTime}, nextonlyWhenCalledPoint: ${jump.nextonlyWhenCalledPoint}, currentTime: ${curenttime}`);
        let followingJump = (index + 1 < nextJumps.length) ? nextJumps[index + 1] : undefined;

        const abortController = new AbortController();

        let bufferUntil = Math.max(followingJump?.jumpFrom || jump.nextonlyWhenCalledPoint, jump.runMinUntil || 0);
        bufferRange(jump.startTime, bufferUntil, urgency, abortController, cycleOfThisInstance);
        bufferRangeFunctionsRunning.push({ controller: abortController, startTime: jump.startTime, endTime: bufferUntil });
        //timeout
        await new Promise(resolve => setTimeout(resolve, 50)); //to make sure that the request for the first jump is sent before the next one
    }

}

async function abortOtherBufferRangesButEnsureCurrentVideo(cycleOfThisInstance) {
    //this function cancels all running bufferings to ensure that not e.g. the whole time until nextonlywhen is buffered although the video has already jumped somewhere else
    let startBufferRangeNew = false;
    const currentTime = await getCurrentTimestampActivePlayerMillis("");
    for (let abortController of bufferRangeFunctionsRunning) {
        if (!abortController.controller.aborted && abortController.startTime <= currentTime && currentTime <= abortController.endTime) {
            // looks like the function is still running and is about fetching the current interval
            logThis("", `Function buffer range still running. So do the abort but fetch the currently needed areas additionally. start: ${abortController.startTime} to ${abortController.endTime}.`);
            startBufferRangeNew = true //set to true so that definetly the currently played video-part will be available even though I'm aborting the original fetch in bufferRange
        }
        logThis("", `Aborting buffer range from ${abortController.startTime} to ${abortController.endTime}.`);
        abortController.controller.abort();
    }
    bufferRangeFunctionsRunning = [];
    if (startBufferRangeNew) {
        const abortController = new AbortController();
        let additionalTimeBuffered;
        [, additionalTimeBuffered,] = await checkIfTimestampInBufferedRanges(currentTime);
        bufferRange(currentTime, nextJumps[0]?.jumpFrom || currentVideo.nextonlyWhenCalledPoint, additionalTimeBuffered, abortController, cycleOfThisInstance); //use urgency 0 here because anyways this will most probably not fetch any new buffer because this area most probably was already fetched
        bufferRangeFunctionsRunning.push({ controller: abortController, startTime: currentTime, endTime: nextJumps[0]?.jumpFrom || currentVideo.nextonlyWhenCalledPoint });
    }
}

let handleJumpWithCommandRunning = false
async function handleJump(command, cycleOfThisInstance) {
    const generalStore = useGeneralStore();
    const videoname = generalStore.videoname;
    if (handleJumpWithCommandRunning && command !== "") {
        return
    }

    handleJumpRunning += 1
    if (command !== "") handleJumpWithCommandRunning = true
    await logThis(cycleOfThisInstance, `handleJump running. cycleOfThisInstance: ${cycleOfThisInstance}, command: ${command}`)

    if (cycleOfThisInstance !== validCycle && cycleOfThisInstance != "newCommand") {
        await logThis(cycleOfThisInstance, `#28278 handleJump: cycleOfThisInstance: ${cycleOfThisInstance}, validCycle: ${validCycle}  So quit this cycle.`)
        handleJumpRunning -= 1
        if (command !== "") handleJumpWithCommandRunning = false
        return
    }

    let predefinedAIAnswer = null;
    if (generalStore.environment == "locally" || window.location.hostname.startsWith("nonprod")) {
        predefinedAIAnswer = urlParams.get('predefinedAIAnswer');
    }

    let responseFromAPI = []
    let params = {}
    let jumpsPlausibleAndNextJumpsWereSet = false
    const originDomain = generalStore.domainname;
    //check if I need to call the API
    if ((nextJumps.length === 0) || (command !== undefined)) {
        //call the API to get a new jump
        try {
            const nextonlyWhenCalledPoint = currentVideo.nextonlyWhenCalledPoint;
            const runMinUntil = currentVideo.runMinUntil;
            const currentTimestampActivePlayerMillis = await getCurrentTimestampActivePlayerMillis(cycleOfThisInstance)
            const currentTimestamp = currentTimestampActivePlayerMillis

            params = {
                charSessionId,
                currentTimestamp,
                nextonlyWhenCalledPoint,
                runMinUntil,
                originDomain
            };
            if (command !== undefined && command !== "") {
                params.command = command;
                params.subscriptionlevel = window.paiSubscriptionItems?.[videoname]?.subscriptionlevel ?? null;
                if (nextJumps.length > 0 && nextJumps[0].jumpFrom > currentTimestamp) { //the check for > currentTimestamp was introduced due to issues with this being smaller on iPhone (probably due to randomly players being not available)
                    params.nextJumpJumpFromWebApp = nextJumps[0].jumpFrom
                    params.nextJumpStartTimeWebApp = nextJumps[0].startTime
                    params.nextJumpOnlyWhenWebApp = nextJumps[0].nextonlyWhenCalledPoint
                    if (predefinedAIAnswer != null) params.predefinedAIAnswer = predefinedAIAnswer
                }

                //show loading animation while calling API
                showChatLoading().then((chat_loading_id_now) => {
                    setTimeout(async function () {
                        hideChatLoading(chat_loading_id_now)
                    }, 50 * 1000); //very long timeout because if a command comes while a transition action, it will take a long time
                })
            }

            await logThis(cycleOfThisInstance, `nextJumps before getting new nextJumps: ${JSON.stringify(shortenTransitionImagesForArray(nextJumps))}`);
            let response;

            try {
                [response, responseFromAPI] = await callAPI(cycleOfThisInstance, '/v1/jump', params, 'GET');
            } catch (error) {
                //needed because otherwise the commandfield does not work anymore after an error
                await logThis(cycleOfThisInstance, `#23418: ERROR! Calling API failed. response.ok: ${JSON.stringify(response)}`);
                handleJumpRunning -= 1
                if (command !== "") {
                    handleJumpWithCommandRunning = false
                    hideChatLoading()
                }
                if (cycleOfThisInstance == validCycle) {
                    setTimeoutAndCallHandleJump(cycleOfThisInstance)
                }

                return
            }

            //handle wrong response of API call
            if (!response.ok || !responseFromAPI || responseFromAPI.length === 0) {
                //needed because otherwise the commandfield does not work anymore after an error
                await logThis(cycleOfThisInstance, `#12322: ERROR! Calling API failed. response.ok: ${JSON.stringify(response)}`);
                handleJumpRunning -= 1
                if (command !== "") {
                    handleJumpWithCommandRunning = false
                    hideChatLoading()
                }
                if (cycleOfThisInstance == validCycle) {
                    setTimeoutAndCallHandleJump(cycleOfThisInstance)
                }
                return
            }


            //invalidate cycle if a command was given
            if (command !== undefined && command !== "") {

                //check if plausible
                if (responseFromAPI.length > 0 && responseFromAPI[0].length > 0 && responseFromAPI[0][0].hasOwnProperty("jumpFrom")) {
                    cycleOfThisInstance = validCycle + 1
                    validCycle = cycleOfThisInstance
                    logThis(cycleOfThisInstance, `Answer received from an API Call with a command -> invalidating cycle. new cycle: ${cycleOfThisInstance}`)
                }
                else {
                    await logThis(cycleOfThisInstance, `#392: ERROR! Answer received from an API Call with a command but it was not plausible. responseFromAPI: ${JSON.stringify(responseFromAPI)}`)
                    //abort:
                    handleJumpRunning -= 1
                    if (command !== "") handleJumpWithCommandRunning = false
                    if (cycleOfThisInstance == validCycle) {
                        setTimeoutAndCallHandleJump(cycleOfThisInstance)
                    }
                    return
                }


            }


            //set timeout to make the global variable take effect
            await new Promise(resolve => setTimeout(resolve, 10));


        } catch (error) {

            await logThis(cycleOfThisInstance, `#23485: ERROR! handlejump failed. Error: ${error.stack}`);
            handleJumpRunning -= 1
            if (command !== "") {
                handleJumpWithCommandRunning = false
                hideChatLoading()
            }
            if (cycleOfThisInstance == validCycle) {
                setTimeoutAndCallHandleJump(cycleOfThisInstance)
            }
            return
        }
    }

    if (cycleOfThisInstance !== validCycle && cycleOfThisInstance !== "newCommand") {
        await logThis(cycleOfThisInstance, `#9789: handleJump: cycleOfThisInstance: ${cycleOfThisInstance}, validCycle: ${validCycle} So quit this cycle.`)
        handleJumpRunning -= 1
        if (command !== "") handleJumpWithCommandRunning = false
        return
    }

    jumpsPlausibleAndNextJumpsWereSet = false
    if (responseFromAPI.length > 0) {
        jumpsPlausibleAndNextJumpsWereSet = await plausibiliseAndChooseNextJumps(cycleOfThisInstance, responseFromAPI, command);
    } else if (nextJumps.length > 0) { //this means: There was no response from API but another planned jump
        jumpsPlausibleAndNextJumpsWereSet = true
        await logThis(cycleOfThisInstance, `#482934: nextJumps length: ${nextJumps.length}, jumpsPlausibleAndNextJumpsWereSet: ${jumpsPlausibleAndNextJumpsWereSet}`)
    }

    //check if there was a command but the ai does not want to say sth. If so, hide the loading chat bubble
    if (command !== undefined && command !== "") {
        let thereIsASay = false
        for (let i = 0; i < nextJumps.length; i++) {
            if (nextJumps[i].hasOwnProperty('say') && nextJumps[i].say !== "") {
                thereIsASay = true
                break
            }
        }
        if (!thereIsASay) hideChatLoading()
    }



    /*
    Do not use this because I do the action/saying anyways even if it is not plausible
    const possibleDenyingSayings = ["I'm sorry, I didn't get that.", "I'm sorry, I didn't understand that.", "Can you repeat that?", "Sorry lovely, I didn't get that.", "Sorry, I didn't get that. Can you try again?"]
    const randomIndex = Math.floor(Math.random() * possibleDenyingSayings.length);
    const randomDenyingSaying = possibleDenyingSayings[randomIndex];
    await showSayingOfAI(randomDenyingSaying)
    await logThis(cycleOfThisInstance, `WARNING! Plausibilisation of API response failed. currentTimestamp:${currentTimestampActivePlayerMillis} nextonlywhen: ${nextonlyWhenCalledPoint}. nextJumps.length: ${nextJumps.length} responseFromAPI: ${JSON.stringify(responseFromAPI)}. jumpsPlausibleAndNextJumpsWereSet? ${jumpsPlausibleAndNextJumpsWereSet} params of the request to API: ${JSON.stringify(params)}`)
    */
    let currentTimestampActivePlayerMillis = await getCurrentTimestampActivePlayerMillis(cycleOfThisInstance)
    if (jumpsPlausibleAndNextJumpsWereSet === false) {
        //jump not plausible from this timestamp! So do bad situation handling:


        if (command !== undefined) {
            //looks like this is a jump to an action or saying. So let's do it anyways although the jump won't look good
            if (jumpIsRunning) {
                nextJumps = [nextJumps[0], ...responseFromAPI[0]]
                window.nextJumps = nextJumps
                if (useTransitions) fetchTransitionImages(cycleOfThisInstance, nextJumps)
                prefetchVideoFragmentsForNextJumps(nextJumps, cycleOfThisInstance)
                nextJumps[1].jumpFrom = nextJumps[0].startTime + timeToBufferNextVideoAndJump
            }
            else {
                nextJumps = responseFromAPI[0]
                window.nextJumps = nextJumps
                if (useTransitions) fetchTransitionImages(cycleOfThisInstance, nextJumps)
                prefetchVideoFragmentsForNextJumps(nextJumps, cycleOfThisInstance)
                nextJumps[0].jumpFrom = currentTimestampActivePlayerMillis + timeToBufferNextVideoAndJump
            }

            await logThis(cycleOfThisInstance, `#769: ALERT: possibleJumps for command not plausible. But because it's a command, do it anyways. currentTimestamp: ${currentTimestampActivePlayerMillis} nextJumps: ${JSON.stringify(nextJumps)} current nextonlyWhenCalledPoint: ${currentVideo.nextonlyWhenCalledPoint} currentTimestamp: ${currentTimestampActivePlayerMillis}`)
        }
        else {
            //looks like this was a normal jump but it's not plausible:
            await logThis(cycleOfThisInstance, `#3222: ALERT: possibleJumps for nocommand not plausible. But there is enough time to plan a new jump. nextJumps: ${JSON.stringify(nextJumps)} current nextonlyWhenCalledPoint: ${currentVideo.nextonlyWhenCalledPoint} currentTimestamp: ${currentTimestampActivePlayerMillis}`)
            if (cycleOfThisInstance == validCycle) {
                setTimeoutAndCallHandleJump(cycleOfThisInstance)
            }
            handleJumpRunning -= 1
            if (command !== "") handleJumpWithCommandRunning = false
            return
        }
    }

    if (cycleOfThisInstance !== validCycle && cycleOfThisInstance != "newCommand") {
        await logThis(cycleOfThisInstance, `#8803: handleJump: cycleOfThisInstance: ${cycleOfThisInstance}, validCycle: ${validCycle}  So quit this cycle.`)
        handleJumpRunning -= 1
        if (command !== "") handleJumpWithCommandRunning = false
        return
    }
    //prepare transitions (has to be done early because the browser needs some time to load the transitions)
    if (useTransitions) prepareTransitionImages(cycleOfThisInstance)


    //prepare audio:
    if (responseFromAPI.length > 0) {
        if (typeof responseFromAPI[responseFromAPI.length - 1] === 'string' || responseFromAPI[responseFromAPI.length - 1] instanceof String) {
            await logThis(cycleOfThisInstance, `#39305: speaklog: last element of the response is a say. Preparing audio`);
            //await prepareSpeak(responseFromAPI[responseFromAPI.length - 1])
            prepareAudio(responseFromAPI[responseFromAPI.length - 1])
        }
    }

    //prepare the next video in the next player 
    await logThis(cycleOfThisInstance, `handleJump finished currentVideo: ${JSON.stringify(shortenTransitionImages(currentVideo))}  nextJump: ${JSON.stringify(shortenTransitionImages(nextJumps[0]))} activeplayer paused: ${activePlayer.paused}`);
    if (command === undefined) {
        await logThis(cycleOfThisInstance, `prepared jump`)
    }
    else {
        await logThis(cycleOfThisInstance, `prepared jump for a command`)
    }
    jumpPrepared = true //needed for pausing


    handleJumpRunning -= 1
    if (command !== "") handleJumpWithCommandRunning = false

    await initiateJump(cycleOfThisInstance)

    await logThis(cycleOfThisInstance, "handleJump finished")

    //No setTimeoutAndCallHandleJump() needed here because this is triggered in jump()
}


function actionInJump(jumpToCheck) {
    return jumpToCheck.action !== "" && jumpToCheck.action !== undefined && jumpToCheck.action !== "undefined"
}

let actionsInHistory = []
let commandFieldShouldNotBeShown = false
let commandFieldWantsToBeShown = false

async function addToactionHistory(actionNameAndScene, roughTimeToAction) {
    actionNameAndScene = actionNameAndScene.replace("undress to underwear", "undress");
    commandFieldShouldNotBeShown = true //avoid the command field to be shown because the action will be shown
    const potentialTimeout = roughTimeToAction - 1000
    if (potentialTimeout > 0) {
        await new Promise(resolve => setTimeout(resolve, potentialTimeout))
    }; //show it 1s before the jump to the action
    let actionElementId = "action_" + actionNameAndScene;
    if (!actionsInHistory.includes(actionNameAndScene)) {
        let actionText = actionNameAndScene.split("_")[0]
        let actionCounter = 1
        for (let actionAlreadyAdded of actionsInHistory) {
            if (actionText === actionAlreadyAdded.split("_")[0]) {
                actionCounter += 1
                actionText = actionText + " " + actionCounter
            }
        }

        let actionElement = document.createElement('div');
        actionElement.textContent = actionText;
        actionElement.classList.add('bubbleinactionHistory');
        // Apply animation using the Web Animations API
        actionElement.animate(flyInAnimation, {
            duration: lengthOfFlyInAnimation,        // Animation duration in milliseconds (1 second)
            easing: 'ease-in-out', // Easing function
            fill: 'forwards'       // Keep the final state after the animation ends
        });
        actionElement.id = actionElementId;
        if (document.getElementById("actionHistoryInner").firstChild) {
            document.getElementById("actionHistoryInner").insertBefore(actionElement, document.getElementById("actionHistoryInner").firstChild);
        } else {
            document.getElementById("actionHistoryInner").appendChild(actionElement);
        }
        actionsInHistory.push(actionNameAndScene)
    }
    else {
        //the action was already shown before. So just let it bounce
        document.getElementById(actionElementId).classList.remove('bounce');
        await new Promise(resolve => setTimeout(resolve, 300)); //show it after 0.5s because otherwise this is not really visible because the browser does this in one step
        document.getElementById(actionElementId).classList.add('bounce');
    }

    setTimeout(() => {
        commandFieldShouldNotBeShown = false
        if (commandFieldWantsToBeShown) {
            showCommandField(true) //I have to set the ignore to true because the global var seems to be updated not quickly enough because of async
        }
    }, lengthOfFlyInAnimation + 500);


}

let chat_loading_id = null

async function showChatLoading() {
    await new Promise(resolve => setTimeout(resolve, 1500)); //show it after 1.5s because otherwise this pops up directly with the command bubble

    //sendButton.style.display = 'none'; don't deactivate because this makes the interaction with the ui feel harsh
    if (chat_loading_id !== null) {
        return
    }
    chat_loading_id = 'loading_' + Date.now();
    let loadingChatElement = document.createElement('div');
    loadingChatElement.textContent = " ";
    loadingChatElement.classList.add('bubbleinchathistory');
    loadingChatElement.classList.add("charMessage");
    loadingChatElement.classList.add('loadingbubbleinchathistory');
    loadingChatElement.id = chat_loading_id; //to be able to identify and remove it later
    if (document.getElementById("chatHistory").firstChild) {
        document.getElementById("chatHistory").insertBefore(loadingChatElement, document.getElementById("chatHistory").firstChild);
    } else {
        document.getElementById("chatHistory").appendChild(loadingChatElement);
    }
    //loadingIcon.style.display = 'block';
    return chat_loading_id

}

async function hideChatLoading(chat_loading_id_now = null) {
    /*
    let timeToSaying = 0
    if (nextJumps.length >= 1 && nextJumps[0].say) {
        timeToSaying = nextJumps[0].jumpFrom - getCurrentTimestampActivePlayerMillis(cycleOfThisInstance)
    } else if (nextJumps.length >= 2 && nextJumps[1].say) {
        timeToSaying = nextJumps[0].jumpFrom - getCurrentTimestampActivePlayerMillis(cycleOfThisInstance) + (nextJumps[1].jumpFrom - nextJumps[0].startTime)
    }
    if (timeToSaying === 0) {
        timeToSaying = 1000 //simply set to 1s (this is a fallback. Can happen e.g. if there is no saying but only action)
    }
    timeToSaying += 300 //add a bit to make this not be exactly at the jump because then the jump would be more visible
    await new Promise(resolve => setTimeout(resolve, timeToSaying));
    //loadingIcon.style.display = 'none';
    */
    //sendButton.style.display = 'block';


    //Attention: this function will be triggered once or twice for each command!
    if (chat_loading_id_now) {
        //this makes sure that the timeout only deletes its own loading element
        if (!!document.getElementById(chat_loading_id_now)) {
            document.getElementById(chat_loading_id_now).remove();
            if (chat_loading_id_now === chat_loading_id) {
                chat_loading_id = null
            }
        }
    }
    else {
        if (!!document.getElementById(chat_loading_id)) {
            document.getElementById(chat_loading_id).remove();
            chat_loading_id = null
        }
    }
}


async function initiateJump(cycleOfThisInstance) {

    async function calculatePotentialTimeout() {
        let potential_timeout = parseInt((nextJumps[0].jumpFrom - await getCurrentTimestampActivePlayerMillis(cycleOfThisInstance) - (jumpFadeTime / 2) - triggerJumpFunctionBeforeJump) * minVideoSpeed)
        return potential_timeout
    }


    if (cycleOfThisInstance !== validCycle && cycleOfThisInstance != "newCommand") {
        await logThis(cycleOfThisInstance, `#9309: initiatejump: cycleOfThisInstance: ${cycleOfThisInstance}, validCycle: ${validCycle}  So quit this cycle.`)
        return
    }
    let potential_timeout = await calculatePotentialTimeout()

    //add to actions
    if (nextJumps[0] && actionInJump(nextJumps[0])) {
        addToactionHistory(nextJumps[0].action, Math.floor(potential_timeout, 0))
    }
    while (potential_timeout > triggerJumpFunctionBeforeJump && videoPaused === false) {
        await logThis(cycleOfThisInstance, `jumplog: setting timeout to ${potential_timeout} activePlayer paused: ${activePlayer.paused} videoPaused: ${videoPaused},  nextJumps[0].jumpFrom: ${nextJumps[0].jumpFrom}`);
        await new Promise(resolve => setTimeout(resolve, potential_timeout));
        if (cycleOfThisInstance !== validCycle && cycleOfThisInstance != "newCommand") {     //important because this script can run mutliple times in parallel but jump should be done only for the "correct" (= newest) 
            await logThis(cycleOfThisInstance, `#96777: cycleOfThisInstance: ${cycleOfThisInstance}, validCycle: ${validCycle}  So quit this cycle.`)
            return
        }
        potential_timeout = await calculatePotentialTimeout()
    }
    if (!videoPaused) { await jump(cycleOfThisInstance); }
    else { quitCycleDueToPause = true }
}


async function jump(cycleOfThisInstance) {
    await logThis(cycleOfThisInstance, `#3837: jump running. activePlayer paused: ${activePlayer.paused}`);
    jumpIsRunning = true

    //for logs:
    let timestampBeforeJump = await getCurrentTimestampActivePlayerMillis(cycleOfThisInstance);

    if (!nextJumps[0]) {
        await logThis(cycleOfThisInstance, `#82292: ERROR! nextJumps[0] is undefined although wanted to jump! nextJumps: ${nextJumps}`)
    }

    //do the jump
    let wasWithTransition = false
    let currentJump = JSON.parse(JSON.stringify(nextJumps[0])) //deep copy
    let jump_from_to = currentJump.jumpFrom + "_" + currentJump.startTime

    try {
        console.log("Setting currentTime to " + currentJump.startTime / 1000);
        document.getElementById('videoPlayer1').ready = false;
        document.getElementById('videoPlayer1').currentTime = currentJump.startTime / 1000;
        logThis("", `jumping to ${currentJump.startTime / 1000}`);
        lastJumpRealTime = Date.now();
    } catch (error) {
        logThis("", "ERROR! #3956 Failed to set videoPlayer1's currentTime: " + error);
    }
    timeAdjustmentDueToPlaybackSpeed = 0 //reset this 
    if (currentJump.transitionExists && useTransitions && transitionsPreparedForJump === jump_from_to) {
        wasWithTransition = true
        //jump with transition video
        if (transitionFrameShowers[0].src == "") { logThis(cycleOfThisInstance, `#3837: WARNING! currentJump has transitionImages but no src set! so do the jump without transition! ${JSON.stringify(nextJumps)}`) }
        await doTransition(length_transition)
        document.getElementById('videoPlayer1').currentTime = currentJump.startTime / 1000; //set it again because I think that the player has already run a bit by now
    }

    document.getElementById('videoPlayer1').play()
        .catch(error => logThis("", 'WARNING! #242382 playing videoPlayer1: ' + error + ` stackTrace: ${stackTracePlayPause}`)); //only do this as warning and not as error because this can also happen "normally" if the user leaves the screen
    pushToStackTracePlayPause(`jumpWithOnlyOnePlayer videoPlayer1: play`)

    //say
    if (currentJump.hasOwnProperty('say') && currentJump.say !== "" && !videoPaused) {
        speak(cycleOfThisInstance, currentJump)
    }

    //set last jumped time

    //also change the transitionPlayer
    //temp = nextTransitionPlayer
    //nextTransitionPlayer = afterNextTransitionPlayer
    //afterNextTransitionPlayer = temp


    //log everything:
    let jumpTimeDiff = Math.trunc(currentJump.jumpFrom - (timestampBeforeJump + (jumpFadeTime / 2))) //would be good if close to 0
    let jumpTimeDiffOk = "BAD!!"
    if (Math.abs(jumpTimeDiff) < (1 / 27) * 1000 * 0.5) { jumpTimeDiffOk = "good" }
    await logThis(cycleOfThisInstance, `#3939 Jumping: ${jumpTimeDiffOk}(${jumpTimeDiff}) jump: ${currentJump.jumpFrom}->${currentJump.startTime} timestampBeforeJump: ${timestampBeforeJump} currentJump.transitionExists (means:should have been with transition) ${currentJump.transitionExists} wasWithTransition: ${wasWithTransition} last video: ${JSON.stringify(shortenTransitionImages(currentVideo))} now video (=currentJump =jump): ${JSON.stringify(shortenTransitionImages(currentJump))} `);
    if (jumpTimeDiff > 50) {
        await logThis(cycleOfThisInstance, `#28480: WARNING! Jump was not good. Difference was: ${jumpTimeDiff}`);
    }
    if (currentJump.hasOwnProperty('say') && currentJump.say !== "" && !videoPaused) {
        await logThis(cycleOfThisInstance, `speaklog: Speaking. currentJump: ${JSON.stringify(shortenTransitionImages(currentJump))}`);
    }

    currentVideo = currentJump
    window.currentVideo = currentJump
    timePausedInCurrentVideo = 0 //reset this 
    timeStuckInCurrentVideo = 0 //reset this 
    nextJumps.shift()
    jumpPrepared = false
    jumpIsRunning = false

    await logThis(cycleOfThisInstance, `#84546: jump finished. nextJumps: ${JSON.stringify(nextJumps)}`)

    if (cycleOfThisInstance !== validCycle && cycleOfThisInstance != "newCommand") {
        await logThis(cycleOfThisInstance, `#3830: jump: cycleOfThisInstance: ${cycleOfThisInstance}, validCycle: ${validCycle}  So quit this cycle.`)
        return
    }

    setTimeoutAndCallHandleJump(cycleOfThisInstance, true)

}


async function jumpWithOnlyOnePlayer(currentJump) {
}


let transitionFrameShowers = []

let allTransitionImages = {}
async function fetchTransitionImages(cycleOfThisInstance, nextJumps) {
    const generalStore = useGeneralStore();
    const videoname = generalStore.videoname;
    let jump_from_tos = []
    for (let i = 0; i < nextJumps.length; i++) {
        if (nextJumps[i].transitionExists) {
            jump_from_tos.push(nextJumps[i].jumpFrom + "_" + nextJumps[i].startTime)
        }
    }
    if (jump_from_tos.length === 0) {
        return
    }
    let jump_from_tos_str = JSON.stringify(jump_from_tos)
    const [_, responseJson] = await callAPI(cycleOfThisInstance, '/v1/transitionImages', { originDomain: generalStore.domainname, videoname: videoname, jump_from_tos: jump_from_tos_str }, 'GET');
    allTransitionImages = responseJson
    await new Promise(resolve => setTimeout(resolve, 10)); //make sure the global var was updated
    // await logThis(cycleOfThisInstance, `#478499: fetchTransitionImages took ${Date.now() - startFetchTransitionImages}ms`)
    prepareTransitionImages(cycleOfThisInstance)
}

let transitionsPreparedForJump = ""
async function prepareTransitionImages(cycleOfThisInstance) {
    //this function can be triggered by handlejump but also by fetchTransitionImages!

    let currentTimestampActivePlayerMillis = await getCurrentTimestampActivePlayerMillis(cycleOfThisInstance)
    let jump_from_to = ""
    let img_element_preparation_time = 150
    if (nextJumps.length === 0) {
        return
    }
    if (nextJumps[0].transitionExists && currentTimestampActivePlayerMillis + jumpFadeTime / 2 + img_element_preparation_time > nextJumps[0].jumpFrom) {
        //it's better to do a jump without transitions than to do a jump with a transition that is not ready yet. Because then it looks realy ugly because some weird images will be shown
        nextJumps[0].transitionExists = false;
        await logThis(cycleOfThisInstance, `#392: WARNING! too late to prepare transitions. So cut transitions away! currentTimestamp: ${currentTimestampActivePlayerMillis}, jumpFrom: ${nextJumps[0].jumpFrom}`)
    } else if (nextJumps[0].transitionExists) {
        jump_from_to = nextJumps[0].jumpFrom + "_" + nextJumps[0].startTime
    }
    else if (nextJumps[1] && nextJumps[1].transitionExists) {
        //already prepare the next transition
        jump_from_to = nextJumps[0].jumpFrom + "_" + nextJumps[0].startTime
    }
    else {
        return
    }
    if (transitionsPreparedForJump === jump_from_to) {
        return
    }

    if (allTransitionImages.hasOwnProperty(jump_from_to)) {
        const transitionImages = allTransitionImages[jump_from_to]
        const lengthOfImages = transitionImages.length
        logThis(cycleOfThisInstance, `preparing TransitionImages. length: ${lengthOfImages}`)
        if (lengthOfImages !== 0) {
            const difference = number_of_transitionFrameShowers - lengthOfImages
            let transitionFrameShowerNo = 1
            transitionsPreparedForJump = ""
            for (let transitionFrameShower of transitionFrameShowers) {
                let useImageNo = transitionFrameShowerNo
                if (difference > 0) {
                    useImageNo = Math.floor(((transitionFrameShowerNo - 1) / number_of_transitionFrameShowers) * lengthOfImages);
                } else if (difference < 0) {
                    // Handle scenario when there are more showers than images
                    useImageNo = (transitionFrameShowerNo - 1) % lengthOfImages; // Use modulo to wrap around the image index
                }
                else {
                    useImageNo = transitionFrameShowerNo - 1
                }
                if (useImageNo >= lengthOfImages || useImageNo < 0) {
                    logThis("", "ERROR! useImageNo is out of bounds")
                }
                // Set the src attribute to display the image
                // Ensure you use the correct data URL prefix for JPEG or PNG, whatever you encoded as
                //logThis("", `useImageNo: ${useImageNo}, lengthOfImages: ${lengthOfImages}, difference: ${difference}`)
                transitionFrameShower.src = `data:image/webp;base64,${transitionImages[useImageNo]}`;
                transitionFrameShower.offsetHeight; // Accessing this forces reflow to ensure also safari realy loads the new src
                transitionFrameShower.style.display = "block"
                transitionFrameShowerNo += 1
            }
            await new Promise(resolve => setTimeout(resolve, img_element_preparation_time)); //make sure that the images are loaded into the img elements
            transitionsPreparedForJump = jump_from_to
        }
    }
}

async function doTransition(length_transition) {
    console.log("BugJumpAfterJump: doTransition")
    const timeForEachImage = length_transition / number_of_transitionFrameShowers
    for (let transitionFrameShower of transitionFrameShowers) {
        transitionFrameShower.classList.add("active")
        await new Promise(resolve => setTimeout(resolve, timeForEachImage));
        transitionFrameShower.classList.remove("active")
    }
    console.log("BugJumpAfterJump: doTransition finished")
}

async function fadeSound(currentTimeStamp, videoPlayerToFadeOut, videoPlayerToFadeIn, currentVideo) {
    videoPlayerToFadeOutGlobal = videoPlayerToFadeOut
    //console.log("fade sound runnning")
    if (videoMutedByUser) { return; }
    if (videoPaused) {
        videoPlayerToFadeOut.muted = true;
        videoPlayerToFadeIn.volume = 1;
        return;
    }
    //videoPlayerToFadeIn.muted = false;  if the player is unmuted, the video will not start playing on iPhone because it does not allow playing without user interaction
    videoPlayerToFadeIn.volume = 0;

    // Define the duration and interval of the fade effect
    const duration = Math.min(Math.max(currentVideo.nextonlyWhenCalledPoint - currentTimeStamp, 300), 3000);
    const intervalTime = 50; // Time between each step in milliseconds
    const steps = duration / intervalTime; // Number of steps to complete the fade
    const volumeStep = 1 / steps; // Volume change per step

    for (let i = 0; i <= steps; i++) {

        // Check if the action is overridden by the user's mute action and check if this skript runs again in parallel
        if (videoMutedByUser || videoPlayerToFadeOutGlobal !== videoPlayerToFadeOut) { //the check for the global fade out is needed because this for loop runs for some time and there can be changes inbetween
            return;
        }
        if (videoPaused) {
            videoPlayerToFadeOut.muted = true;
            videoPlayerToFadeIn.volume = 1;
            return;
        }

        // Decrease the volume of the video player to fade out
        let newVolumeOut = Math.max(0, videoPlayerToFadeOut.volume - volumeStep);
        videoPlayerToFadeOut.volume = newVolumeOut;

        // Increase the volume of the video player to fade in
        // thrown out because then there is a huge silence aroung e.g. a saying which sounds weird: if(!jumpAfterwardsIsclose){// Only increase volume if the jump afterwards is not close
        let newVolumeIn = Math.min(1, videoPlayerToFadeIn.volume + volumeStep);
        videoPlayerToFadeIn.volume = newVolumeIn;

        //console.log(`fade sound: duration: ${duration} videoPlayerToFadeIn: muted ${videoPlayerToFadeIn.muted} volume: ${videoPlayerToFadeIn.volume} videoPlayerToFadeOut: muted ${videoPlayerToFadeOut.muted} volume: ${videoPlayerToFadeOut.volume}`)

        // Use setTimeout to create the delay for each step
        await new Promise((resolve) => setTimeout(resolve, intervalTime));
    }

    // After fading, ensure videoPlayerToFadeOut is muted
    videoPlayerToFadeOut.muted = true;
}

const timeStartSayingToRealOpticalStart = 1400; //john and nahir seem to need 1400ms

async function speak(cycleOfThisInstance, currentJump) {
    const distToOpticalStart = currentJump.distToOpticalStart;
    logThis(cycleOfThisInstance, `speaklog: distToOpticalStart: ${distToOpticalStart}`);
    await new Promise(resolve => setTimeout(resolve, distToOpticalStart));
    let timeStarted = Date.now();
    while (isStuck && Date.now() - timeStarted < 10000) { await new Promise(resolve => setTimeout(resolve, 100)); } //wait until the player is not stuck anymore
    await new Promise(resolve => setTimeout(resolve, timeStartSayingToRealOpticalStart * (1 / 3)));
    if (showAiSayings) {
        hideChatLoading()
        addChatInChatHistory("charMessage", currentJump.say)
    }
    await new Promise(resolve => setTimeout(resolve, timeStartSayingToRealOpticalStart * (2 / 3)));
    if (!videoMutedByUser) {
        logThis(cycleOfThisInstance, `speaklog: playing audio`);
        playAudio()
        const factor = 1 + (currentJump.lengthDiffChars / currentJump.say.length); //if lengthDiffChars is a positive value, I want the player to play faster
        const durationMs = currentJump.runMinUntil - currentJump.startTime
        adjustPlaybackSpeed(factor, durationMs)
        /*
        audioPlayer.play()
            .catch(error => logThis("", 'ERROR! Error playing audioPlayer: ' + error));
    */
    }
}

let timeAdjustmentDueToPlaybackSpeed = 0
async function adjustPlaybackSpeed(factor, durationMs) {
    const adjustedFactor = Math.max(minVideoSpeed, Math.min(maxVideoSpeed, factor)); // Limit the factor to a range to make it look more natural
    logThis("", `speaklog: Adjusting playback speed with compensation. factor: ${factor}, adjustedFactor: ${adjustedFactor} durationMs: ${durationMs}`);

    // Adjust playback speed
    const adjustedDurationMs = durationMs / adjustedFactor;
    document.getElementById('videoPlayer1').playbackRate = adjustedFactor;
    const stepMs = 100;
    for (let i = 0; i < adjustedDurationMs; i += stepMs) {
        await new Promise(resolve => setTimeout(resolve, stepMs));
        timeAdjustmentDueToPlaybackSpeed += stepMs * (adjustedFactor - 1);
    }

    // Restore original playback speed
    document.getElementById('videoPlayer1').playbackRate = 1;
}


async function prepareSpeak(base64Characters) {
    //DO NOT use this anymore because does not work on iPhone because needs to do .play without user interaction
    try {
        logThis("", "Preparing speak");
        // Decode the Base64 string into a binary string
        let binaryString = window.atob(base64Characters);

        // Convert the binary string to a byte array
        let byteNumbers = new Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            byteNumbers[i] = binaryString.charCodeAt(i);
        }
        let byteArray = new Uint8Array(byteNumbers);

        // Create an audio Blob from the byte array
        const audioBlob = new Blob([byteArray], { type: "audio/mp3" });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayer.src = audioUrl;
        audioPlayer.preload = 'auto';
    } catch (error) {
        await logThis(cycleOfThisInstance, `ERROR! Error decoding Base64 audio data: ${error.message}`);
    }
}


let commandLocked = false
async function command(predefinedText = "", isSystemCommand = false) {
    if (commandLocked) {
        logThis("", "Command locked. So do not react to new command")
        return
    } // needed for e.g. microphone input. Do not react if command so close to previous command
    lastUserInteraction = Date.now();
    let cycleOfThisInstance = "newCommand"
    let timestamp = await getCurrentTimestampActivePlayerMillis(cycleOfThisInstance)
    while (handleJumpRunning > 0 || nextJumps.length >= 2 && nextJumps[0] && nextJumps[0].jumpFrom < timestamp + 1000) { //first thing  avoids conflicts e.g. when currently the webapp requests a new jump and the user gives a new command. second thing are 2 jumps planned and in the near future. This could be the case e.g. if the AI currently speaks and has already 2 jumps to an action planned and the user gives a new command. Then I should let at least one of them get executed first
        await new Promise(resolve => setTimeout(resolve, 100)); //wait 100ms and then check again
    }
    let input = ""
    if (predefinedText !== "") {
        input = predefinedText
        await logThis(cycleOfThisInstance, `Predefined Text (from mic or from initialsayhi): ${predefinedText}`);
    }
    else {
        input = document.getElementById('commandField').value;
        document.getElementById('commandField').value = '';//empty the input-box
    }
    input = input.trim();
    if (input === "") {
        return;
    }

    document.getElementById('commandField').blur(); //remove focus from this field
    if (input === "") { return; }
    handleJump(input, cycleOfThisInstance)
    if (!isSystemCommand) {
        setTimeout(() => {
            addChatInChatHistory("userMessage", input)
        }, 500);
    }
    if (predefinedText === "") { document.activeElement.blur(); }
    if (!isSystemCommand && !isListening) {
        hideCommandField()
        commandLocked = true
        await wait(9000)
        if (actionInJump(currentVideo) || (nextJumps[0] && actionInJump(nextJumps[0])) || (nextJumps[1] && actionInJump(nextJumps[1])) || (nextJumps[2] && actionInJump(nextJumps[2]))) {
            //if action, then give it more time. This is important because sometimes the user does not realise that the char is about to do something because it takes a bit time
            console.log("setting long timeout before showing commandfield")
            await wait(25000)
            console.log("long timeout ended")
        }
        showCommandField()
        commandLocked = false
    } else if (!isSystemCommand) {
        //means: isListening. Do shorter locks and only if action to make the conversation feel natural
        commandLocked = true
        if ((nextJumps[0] && actionInJump(nextJumps[0])) || (nextJumps[1] && actionInJump(nextJumps[1])) || (nextJumps[2] && actionInJump(nextJumps[2]))) {
            //if action, then give it more time. This is important because sometimes the user does not realise that the char is about to do something because it takes a bit time
            await wait(8000); //long timeout because normally the char will also say sth before doing the action
        }
        commandLocked = false
    }
}

async function hideCommandField() {
    document.getElementById('commandField').classList.add('hidden');
    document.getElementById('sendButton').classList.add('hidden');
    document.getElementById('commandFieldContainer').classList.add('hidden');
    document.getElementById('microphoneBtn').style.display = 'none';
}

async function showCommandField(ignoreCommandFieldShouldNotBeShown = false) {
    if (commandFieldShouldNotBeShown && !ignoreCommandFieldShouldNotBeShown) {
        commandFieldWantsToBeShown = true
        return
    }
    document.getElementById('commandField').classList.remove('hidden');
    document.getElementById('sendButton').classList.remove('hidden');
    document.getElementById('commandFieldContainer').classList.remove('hidden');
    //document.getElementById('microphoneBtn').style.display = 'block';
}



