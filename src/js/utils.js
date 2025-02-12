import { usePopupStore } from "../stores/popupStore";
import { useGeneralStore } from "@/stores/generalStore";
import { auth } from './auth.js'

let APIcallsInPast = [];
let max_requests_triggered = false;
let videoSource = "";
let apiUrl = ""
let userConfirmationParams = null;
const urlParams = new URLSearchParams(window.location.search);

console.log(`window.location.hostname ${window.location.hostname}`)
let apiKey = ""
let showLogs = true;

let originDomain = ""

if (window.location.hostname === "localhost" || window.location.hostname.startsWith("192.168")) {
    // The web app is running on the local machine
    videoSource = "local" //can be: local, paiCloud. If local, the videos are expected to be in the same folder as the webapp in the structure: video_snippets/{videoname}/{videoFile}
    console.log(`Running locally  with videoSource: ${videoSource}`)
    apiUrl = 'http://localhost:3001' // WITHOUT Backslash at the end!
    apiKey = "9d93f58b-25e9-4afa-bf68-a14de78e9f8c"
    showLogs = true
} else {
    // The web app is accessed directly in cloud
    if (window.location.hostname.startsWith("nonprod")) {
        apiUrl = 'https://europe-west1-nonprodpersonai.cloudfunctions.net/nonprod_pai_api'
    }
    else {
        apiUrl = 'https://europe-west1-personai-86161.cloudfunctions.net/pai_api'
    }
    videoSource = "paicloud"
    console.log(`Running in cloud with videoSource: ${videoSource}`)
    if (window.isIframe) { //this will be "undefined" is it is not in an iFrame. Because this is set in embedding.html
        originDomain = urlParams.get('originDomain')
        console.log(`originDomain: ${originDomain}`)
        switch (originDomain) {
            case "askmeimai":
                apiKey = "paiiframe_m39kdd9d03kdidd2"
        }
        showLogs = true
    }
    else {
        apiKey = "paicloud_929jd82kj9spgu7"
        showLogs = true
    }
}


// Check if it is smartphone
let probablyIsSmartphone = null
export function mobileCheck() {
    if (probablyIsSmartphone != null) {
        return probablyIsSmartphone
    }
    let check = false;
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
    probablyIsSmartphone = check
    return check;
};

const maxRequests = 30
const requests_time = 60 //seconds. Do not make this too high because if internet connection is lost for some time and then restored, then this should allow to request again and restore

export async function callAPI(cycleOfThisInstance, endpoint, params, method, authorization = false, body_params = {}) {
    //rate limiting to avoid one single webapp to send thousands of requests to the API if something goes wrong:
    const now = Date.now()
    APIcallsInPast = APIcallsInPast.filter((time) => now - time < requests_time * 1000)
    if (APIcallsInPast.length > maxRequests || (max_requests_triggered && APIcallsInPast.length > 0)) { //the second part makes sure that max requests is only released if all requests are "free" because otherwise the webapp only has one call available but often needs 2 or 3 calls to work again normally
        max_requests_triggered = true
        await new Promise(resolve => setTimeout(resolve, 500)); // Pause for x ms 
        console.error(`The Webapp sent more than ${maxRequests} calls in the last ${requests_time} seconds. So this call will be skipped. APIcallsInPast: ${APIcallsInPast} APIcallsInPast length: ${APIcallsInPast.length}`)
    } else {
        max_requests_triggered = false
        APIcallsInPast.push(now)
    }
    let fullUrl = apiUrl + endpoint

    params.userId = window.userId
    fullUrl = fullUrl + '?' + toQueryString(params);
    logThis(cycleOfThisInstance, `CallAPI running with: videoSource ${videoSource} and url ${JSON.stringify(fullUrl)} method: ${method} `) //I use string here so that the url does not get shortened

    let token = null;
    if (authorization) {
        while(!auth.currentUser) {
            await new Promise(resolve => setTimeout(resolve, 200)); // Pause for x ms because this script might be triggered while the page loads and the user therefore is not logged in yet
        }
        if (auth.currentUser) {
            await auth.currentUser.reload();
            token = await auth.currentUser.getIdToken()
        } else {
            console.error("#1403: No user available")
            showNotification("bad", "No user available")
        }
    }
    let response = null;
    try {
        response = await fetchUrl(fullUrl, method, authorization, token, body_params)
    } catch (error) {
        //try again after x ms
        setTimeout(async function () {
            try {
                response = await fetchUrl(fullUrl, method, authorization, token, body_params)
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} ${response.statusText} ${await response.text()} ${fullUrl} ${JSON.stringify(params)} ${method} ${JSON.stringify(body_params)}`);
                }
            } catch (error) {
                //do not show an error to user just because of this because the webapp often also handels this situation: alert(`An error occured: ${error} If this happens constantly, please contact our support through the 'contact us' button`)
                logThis(cycleOfThisInstance, `ERROR! Failed to fetch from ${apiUrl}${endpoint}. Error: ${error.message}  ${JSON.stringify(params)} ${method} ${JSON.stringify(body_params)}`);
                throw error;
            }
        }, 200);
    }
    if (response.status == 200) {
        let responseJson = await response.json()
        if (endpoint == '/v1/jump') {
            await logThis(cycleOfThisInstance, `Called Endpoint: ${method} ${endpoint} ${JSON.stringify(params)} Response: ${JSON.stringify(shortenSound(responseJson))}`)
        } else if (endpoint == '/v1/transitionImages') {
            await logThis(cycleOfThisInstance, `Called Endpoint: ${method} ${endpoint} ${JSON.stringify(params)} Response: ${JSON.stringify(responseJson).substring(0, 30)}..`)
        }
        else {
            await logThis(cycleOfThisInstance, `Called Endpoint: ${method} ${endpoint} ${JSON.stringify(params)} Response: ${JSON.stringify(responseJson)}`)
        }
        return [response, responseJson];
    } else if (response.status == 204) {
        await logThis(cycleOfThisInstance, `Called Endpoint: ${method} ${endpoint} ${JSON.stringify(params)} Response: 204 No Content`)
        return [response, null];
    } else {
        await logThis(cycleOfThisInstance, `ERROR! API Error: ${method} ${endpoint} ${response.status} ${JSON.stringify(params)} ${response.statusText} ${fullUrl} ${JSON.stringify(body_params)}`)
        return [response, null];
    }
}
function fetchUrl(fullUrl, method, authorization, token, body_params) {
    const generalStore = useGeneralStore();
    const origin = generalStore.domainname

    const response = fetch(fullUrl, {
        method: method,
        headers: {
            'x-api-key': apiKey,
            'videoSource': videoSource,
            'Origin': origin, // Add the origin explicitly because on Chrome on Windows NT on askmeimai I had issues that origin was not set
            ...(authorization ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(method === "POST" || method === "PUT" ? { 'Content-Type': "application/json" } : {})
        },
        ...(method === "POST" || method === "PUT" ? { body: JSON.stringify(body_params) } : {})
    });
    return response;
}

export function importExternalScript(script, retries = 3, delay = 1000) {
    return new Promise((resolve, reject) => {
        const attempt = (retryCount) => {
            const script_element = document.createElement('script');
            script_element.type = 'text/javascript';
            script_element.src = script;

            script_element.onload = () => resolve();
            script_element.onerror = () => {
                if (retryCount > 0) {
                    console.warn(`Failed to load script: ${script}. Retrying... (${retries - retryCount + 1})`);
                    setTimeout(() => attempt(retryCount - 1), delay);
                } else {
                    reject(new Error(`Failed to load script after ${retries} attempts: ${script}`));
                }
            };

            document.head.appendChild(script_element);
        };

        attempt(retries);
    });
}



// Converts an object into a query string
export function toQueryString(params) {
    return Object.keys(params)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
        .join('&');
}

let timestampsPosted = [];
const maxLogsPosted = 4;
const timeIntervalMaxPost = 1000 * 60 * 30; // minutes

export async function logThis(cycleOfThisInstance, text) {
    let cycleInfo = "";
    let severity = "INFO"
    if (text.startsWith("ERROR")) {
        severity = "ERROR"
    } else if (text.startsWith("WARNING")) {
        severity = "WARNING"
    }

    if (cycleOfThisInstance !== null && cycleOfThisInstance !== "") { cycleInfo = `, cycleId ${cycleOfThisInstance}` }
    let now = new Date()
    const logText = `${getTimeInMyStandardShortFormat(now)}${cycleInfo}: ${text}`
    if (showLogs) {
        if (severity === "ERROR") {
            console.error(logText);
        }
        else if (severity === "WARNING") {
            console.warn(logText);
        }
        else {
            console.log(logText);
        }
    }

    if (severity === "ERROR") {
        // Rate limiting
        const currentTime = Date.now();
        timestampsPosted = timestampsPosted.filter(
            (timestamp) => currentTime - timestamp < timeIntervalMaxPost
        );
        if (timestampsPosted.length <= maxLogsPosted) {
            timestampsPosted.push(currentTime);

            //send log to API
            const device = navigator.userAgent;
            callAPI(cycleOfThisInstance, '/v1/log', {}, 'POST', false, {}, { severity: severity, message: logText, device: device })
        }
    }
}

function getTimeInMyStandardFormat(now) {
    return `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}_${now.getMilliseconds()}`
}
function getTimeInMyStandardShortFormat(now) {
    return `${now.getHours()}${now.getMinutes()}${now.getSeconds()}_${now.getMilliseconds()}`
}


export function shortenSound(jumpResponseJson) {
    let modifiedjumpResponseJson = JSON.parse(JSON.stringify(jumpResponseJson)); // deep copy
    for (let i = 0; i < modifiedjumpResponseJson.length; i++) {
        let jumpConnection = modifiedjumpResponseJson[i];
        if (typeof jumpConnection === 'string') {
            //means: this is a saying
            //jumpConnection = jumpConnection.substring(0, 10) this line would not work because js only changes the local copy of the string
            modifiedjumpResponseJson[i] = jumpConnection.substring(0, 10);
        }/* not needed anymore because no transitions in jump object else {
            
            //normal jump connection
            for (let j = 0; j < jumpConnection.length; j++) {
                jumpConnection[j] = shortenTransitionImages(jumpConnection[j])
            }
                
        }*/
    }

    return modifiedjumpResponseJson;
}


export function shortenTransition(responseJson) {
    let modifiedjumpResponseJson = [] // deep copy
    for (let i = 0; i < responseJson.length; i++) {
        modifiedjumpResponseJson[i] = responseJson[i].substring(0, 10);
    }
    return modifiedjumpResponseJson;
}


export function shortenTransitionImagesForArray(jumpConnection) {
    let modifiedjumpConnection = JSON.parse(JSON.stringify(jumpConnection)); // deep copy

    for (let j = 0; j < modifiedjumpConnection.length; j++) {
        modifiedjumpConnection[j] = shortenTransitionImages(modifiedjumpConnection[j])
    }
    return modifiedjumpConnection;
}


export function shortenTransitionImages(nextJumpOrCurrentVideo) {
    //no deep copy needed because I don't change the original object but only eventually return a new object
    const modifiedNextJumpOrCurrentVideo = nextJumpOrCurrentVideo.transitionImages && nextJumpOrCurrentVideo.transitionImages.length > 1
        ? { ...nextJumpOrCurrentVideo, transitionImages: "transition Images were shortened for logging" }
        : nextJumpOrCurrentVideo;
    return modifiedNextJumpOrCurrentVideo;
}

let isNotificationActive = false;
export function showNotification(goodOrBadOrNeutral, text, type = "short", buttonText, onClickFunction) {
    if (isNotificationActive) {
        setTimeout(() => showNotification(goodOrBadOrNeutral, text, type, buttonText, onClickFunction), 500);
        return;
    }
    isNotificationActive = true;

    const notification = document.getElementById('notification');
    notification.textContent = text;

    // Set background color and text color based on the type of notification
    let buttonbackgroundColor = "#ddd";
    let buttonColor = "#333";
    if (goodOrBadOrNeutral === "good") {
        notification.style.backgroundColor = "#007700";
        notification.style.color = "white";
    } else if (goodOrBadOrNeutral === "bad") {
        notification.style.backgroundColor = "#820000";
        notification.style.color = "white";
    } else {
        notification.style.backgroundColor = "#444";
        notification.style.color = "white";
    }

    let notificationOpen = true;

    // Optionally add a button if buttonText and onClickFunction are provided
    if (buttonText && onClickFunction) {
        const button = document.createElement('button');
        button.classList.add('notificationButton');
        button.style.backgroundColor = buttonbackgroundColor;
        button.style.color = buttonColor;
        button.textContent = buttonText;
        button.onclick = function () {
            onClickFunction();
            if (notificationOpen) {
                notification.style.animation = 'slideOut 0.5s forwards';
                notificationOpen = false;
            }
        };
        notification.appendChild(button); // Append the button to the notification
    }

    // Display notification with a sliding animation
    notification.style.animation = 'slideIn 0.5s forwards';
    let timeout = 5000; // Default timeout for "short"
    switch (type) {
        case "long":
            timeout = 9000; // Longer timeout for "long"
            break;
        case "veryShort":
            timeout = 3000; // Default timeout for "short"
            break;
    }

    // Set a timeout to hide the notification
    setTimeout(function () {
        if (notificationOpen) {
            notification.style.animation = 'slideOut 0.5s forwards';
            notificationOpen = false;
        }

        setTimeout(() => {
            isNotificationActive = false;
        }, 200); // Wait some ms before allowing the next notification
    }, timeout);
}


export async function letUserConfirm(text, callbackFunction, params) {
    document.getElementById("userChoiceYesNo").style.display = 'flex';
    document.getElementById("userChoiceInput").style.display = 'none';
    showUserConfirmation();
    document.getElementById("userconfirmationText").innerHTML = text;
    window.userConfirmationCallbackFunction = callbackFunction;
    window.userConfirmationParams = params;
}

window.getUserInput = async function(text, callbackFunction, params) {
    if (document.getElementById("userChoiceYesNo"))
        document.getElementById("userChoiceYesNo").style.display = 'none';
    if (document.getElementById("userChoiceInput"))
        document.getElementById("userChoiceInput").style.display = 'block';
    if (document.getElementById("userconfirmationText"))
        document.getElementById("userconfirmationText").innerHTML = text;
    showUserConfirmation();
    window.userConfirmationCallbackFunction = callbackFunction;
    window.userConfirmationParams = params;
}

async function showUserConfirmation() {
    const popupStore = usePopupStore(); 
    popupStore.openPopup("confirmation");
}
