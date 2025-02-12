var isListening = false;
var AUTO_RESTART = true;
var lastStartedAt = new Date().getTime();
let recognition;

function startDictation(callback) {
    if (!recognition) { 
        recognition = window.hasOwnProperty('webkitSpeechRecognition') ? new webkitSpeechRecognition() : new SpeechRecognition();
    }

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = function(e) {
        var last = e.results.length - 1;
        var text = e.results[last][0].transcript;

        callback(text);
    };

    recognition.onend = function() {
        if (AUTO_RESTART && isListening) { 
            // Check the current time for a rough idea of when our next start is
            var timeSinceLastStart = new Date().getTime() - lastStartedAt;
            if (timeSinceLastStart < 1000) {
                // If immediately after previous end event, wait for 1 second before new start
                setTimeout(function() {
                    startDictation(callback);
                }, 1000 - timeSinceLastStart);
            } else {
                startDictation(callback);
            }
        }
    };

    recognition.onerror = function(event) {
        if (event.error == 'service-not-allowed' || event.error == 'not-allowed') {
            AUTO_RESTART = false;
        }
    };

    lastStartedAt = new Date().getTime();
    recognition.start();
}

function stopDictation() {
    if (recognition) {
        AUTO_RESTART = false;
        recognition.stop();
        isListening = false;
    }
}


function displayPopup(text) {
    alert(text);
}