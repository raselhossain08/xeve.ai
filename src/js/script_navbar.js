import { set } from 'https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js';
import { deleteUser, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, onAuthStateChanged, signOut, } from 'https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js' //GoogleAuthProvider, signInWithPopup
import { callAPI, logThis, showNotification, letUserConfirm } from './utils.js' //GoogleAuthProvider, signInWithPopup
import { addToCookie, getFromCookie, deleteFromCookie } from './cookie.js' //GoogleAuthProvider, signInWithPopup
import { getSubscriptionStatus, cancelSubscription, changeUiToNoSubscription, updatePurchaseButton } from './script_subscriptions.js'
//import { getStripeElement } from './script_stripe.js';
import { getMarketingMaterial } from './script_marketing.js'
import { usePopupStore } from "../stores/popupStore";
import { useGeneralStore } from "../stores/generalStore";
import { auth } from './auth.js'

//import { doc } from 'firebase/firestore';
//import firebase from 'firebase/compat/app';
//import 'firebase/compat/auth';   
//import * as firebaseui from 'firebaseui';
//import {firebaseui} from "https://.gstatic.com/firebasejs/ui/6.0.1/firebase-ui-auth.js";

console.log("header script running")



//check where the webapp is running:
let lastSubscriptionLevel = null;
let requestPw = false;
let darkModeActive = false;


let striSessionIdEnc = null;

let stage = "notfound";
let envAdder = "notfound";

if (window.location.hostname === "localhost" || window.location.hostname.startsWith("192.168")) {
    // The web app is running on the local machine
    requestPw = false;
    stage = "locally";
    envAdder = "locally_";
} else if (window.top === window.self) {
    //normal mode
    requestPw = false;
    if (window.location.hostname.startsWith("nonprod")) {
        stage = "nonprod";
        envAdder = "nonprod_";
    } else {
        //prod
        stage = "prod";
        envAdder = "";
    }

} else {
    // The web app is loaded inside an <iframe>
}

const parts = window.location.hostname.split('.');
const domainName = parts.slice(-2).join('.');
if (domainName == "avame.ai") {
    requestPw = true;
}




export function initiateAnalytics() {
    const generalStore = useGeneralStore();
    const popupStore = usePopupStore();
    const videoname = generalStore.videoname;
    let gtagID = "";
    if (domainName == "xeve.ai" || generalStore.environment === "locally") {
        gtagID = "G-XC1C65Y6K5";
    } else {
        gtagID = "G-3W2EME5543";
    }

    //analytics (must be here because consent is also given here in header script)
    //console.log("gtagID: " + gtagID);
    var gtagScript = document.createElement('script');
    gtagScript.type = "text/javascript";
    gtagScript.async = true;
    gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=" + gtagID;
    document.head.appendChild(gtagScript);

    gtagScript.onload = function () {

        // Set the virtual page path based on the URL parameters
        let virtualPageTitle = "none";
        if (generalStore.routeName === "Home") {
            virtualPageTitle = envAdder + generalStore.routeName;
        }
        else if (generalStore.routeName === "Character") {
            virtualPageTitle = envAdder + generalStore.routeName + '_' + videoname;
        }
        else {
            virtualPageTitle = "nogeneralStore.routeNamefound";
        }
        console.log("virtualPageTitle: " + virtualPageTitle);
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { dataLayer.push(arguments); } //define it globally so that it is accessible in other scripts

        //check the cookie (must be here after the analytics script is loaded)
        if (getFromCookie('gtagConsentGiven')) {
            logThis("", "consent was already given in cookie")
            consentGiven()
            popupStore.closePopup("consent");
        }
        else {
            logThis("", "consent not given (yet)")
            window.gtag('consent', 'default', { //switches consent mode on but to denied. Will be set to consented after user consent in script_navbar.js
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'ad_storage': 'denied',
                'analytics_storage': 'denied',
                'wait_for_update': 3000,
            });
            if (Date.parse(getFromCookie("policyPopupAcceptedDate")) > new Date().getTime() - 1000 * 60 * 60 * 5) { //if more than 5 hours have passed, again show the consent popup to request consent also to non essential cookies 
                popupStore.closePopup("consent");
            }
        }
        window.gtag('js', new Date());
        window.gtag('set', {
            'page_title': virtualPageTitle,
            'currency': 'EUR'
        });
        window.gtag('config', gtagID);
    };
}

export async function consentGiven() {
    logThis("", "consent given")
    window.gtag('consent', 'update', {
        'ad_user_data': 'granted',
        'ad_personalization': 'granted',
        'ad_storage': 'granted',
        'analytics_storage': 'granted'
    });
}

function trackEventGtag(type, event_category, event_label) {
    window.gtag('event', type, {
        'event_category': event_category,
        'event_label': event_label,
        'value': 1
    });

}

export function trackPurchaseGtag(videoname, subscriptionlevel, amount) {
    if (stage == "prod") {
        logThis(null, `purchase tracked in gtag: subscriptionlevel ${subscriptionlevel}, amount ${amount}`)

        const isTest = stage == "nonprod" || stage == "locally";
        const randNrForTransactionId = Math.floor(Math.random() * 1000000000);
        window.gtag('event', 'purchase', {
            'transaction_id': `freePurch_${randNrForTransactionId}`,
            'value': isTest ? 0 : amount / 100,
            'currency': 'EUR',
            'items': [{
                'item_name': `${envAdder}${videoname}_${subscriptionlevel}_free` //items always needs an array 
            }],
            'test_purchase': isTest,
        });
    }
}



export async function logout() {
    signOut(auth).then(() => {
        document.getElementById('popupUserMenu').style.display = "none";
        showNotification("good", "Logged out successfully")
    }).catch((error) => {
        document.getElementById('popupUserMenu').style.display = "none";
        showNotification("bad", "Error during log out")
    });
}
/*
document.getElementById("becomeModelButton").addEventListener('click', function (event) {
    //if becomeModelInner is empty, load the content
    if (document.getElementById("becomeModelInner").innerHTML === "") {
        fetch('become_model.html')  // Adjust the path if your HTML file is in a different directory
            .then(response => response.text())
            .then(html => {
                document.getElementById("becomeModelInner").innerHTML = html;
                var script_element = document.createElement('script');
                script_element.src = "https://ucarecdn.com/libs/widget/3.x/uploadcare.full.min.js";
                document.head.appendChild(script_element);
                script_element.onload = () => {
                    // Define the public key
                    var script_element = document.createElement('script');
                    script_element.type = 'module'; // ES6 module
                    script_element.src = 'script_become.js';
                    document.head.appendChild(script_element);
                };
            })
    }
    //timeout
    setTimeout(() => {
        document.getElementById("becomeModel").style.display = "block";
    }, 200)
})

if (document.getElementById("closeBecomeModel")) {
    document.getElementById("closeBecomeModel").addEventListener('click', function () {
        document.getElementById("becomeModel").style.display = "none";
    })
}*/

export async function onPurchaseButtonPressed() {

    const popupStore = usePopupStore();
    const generalStore = useGeneralStore();
    const videoname = generalStore.videoname;
    const charname = generalStore.charname;
    console.log('onPurchaseButtonPressed')
    // window.exitFullscreenIfIn()

    popupStore.closePopup("subscription");
    document.getElementById('chooseSubscription').style.display = 'block';
    document.getElementById('checkout').style.display = 'none';
    document.getElementById('chooseSubscriptionlevelPopupContent').classList.remove('stripe');
    if (auth.currentUser) await auth.currentUser.reload(); //fetch the user new for the case that the verification mail was pressed meanwhile
    let paiSubscriptionItems = await getSubscriptionStatus()
    document.getElementById('popupUserMenu').style.display = "none";
    if (!auth.currentUser) {
        openLoginOrReg()
        return
    }
    if (!auth.currentUser.emailVerified) {
        sendVerificationMailAndCheckStatus(auth.currentUser)
        //don't show a notification because the successfull sending will send a notification
        return
    }
    if (paiSubscriptionItems && videoname in paiSubscriptionItems && paiSubscriptionItems[videoname]["subscriptionlevel"] === "premium" && !paiSubscriptionItems[videoname].validUntil) {
        showNotification("good", "You are already a premium supporter of this AI Character")
        return
    }
    trackEventGtag('click', 'purchase', 'chooseSubscriptionlevelPopupOpened')
    popupStore.openPopup("purchase");
    document.getElementById("titleBasic").innerHTML = `Support ${charname}<br> Basic Supporter`;
    document.getElementById("titlePremium").innerHTML = `Support ${charname} <br> Premium Supporter`;
    document.getElementById("pricetagBasic").textContent = `${(generalStore.pricingInCents.basic / 100).toFixed(2).replace('.', ',') ?? '??'} € monthly`
    document.getElementById("pricetagPremium").textContent = `${(generalStore.pricingInCents.premium / 100).toFixed(2).replace('.', ',') ?? '??'} € monthly`

}

async function pollIfMailVerified() {
    let success = false;
    let tries = 0;
    await new Promise(resolve => setTimeout(resolve, 10000));
    while (!success && tries < 8) {
        await new Promise(resolve => setTimeout(resolve, 3000 + tries * 3000));
        if (auth.currentUser) await auth.currentUser.reload();
        if (auth.currentUser && auth.currentUser.emailVerified) {
            onMailVerified();
            success = true;
        }
        tries++;
    }
}

export async function onMailVerified() {
    const generalStore = useGeneralStore();
    showNotification("good", "Email verified successfully.", "long")
    if (generalStore.routeName === "Character") onPurchaseButtonPressed() //do not open on main page because there would be no char to support
}

async function showMessageInsteadOfPayment(subscriptionlevel) {

    const popupStore = usePopupStore();
    showNotification("good", "As a promotion, this subscription is currently free. You will not get billed. Enjoy your time with your AI girlfriend!", "long")
    popupStore.closePopup("subscription");
    popupStore.closePopup("purchase");
}

window.onMyAIButtonClicked = async function (event) {
    event.preventDefault();
    document.getElementById("userSettingsContent").style.display = "none";
    shoMyAIsPopup()
}

async function shoMyAIsPopup() {
    const popupStore = usePopupStore();
    await showMyaisInMyais() //do this before opening to avoid confusion and showing outdated infos to the user
    popupStore.openPopup("subscription");
}


async function showMyaisInMyais() {
    const generalStore = useGeneralStore();
    const videoname = generalStore.videoname;
    if (videoname && videoname.length) {
        document.getElementById('purchaseButtonInMySubs').style.display = "none";
    }
    document.getElementById("nosubsfound").style.display = "block";
    if (!auth.currentUser) {
        document.getElementById("nosubsfound").innerHTML = "You're not logged in<br>Log in to support an AI"
        fillMyAIsWithPossibleAIs()
    }
    else {
        let paiSubscriptionItems = await getSubscriptionStatus()
        if (paiSubscriptionItems === null) {
            fillMyAIsWithPossibleAIs()
        } else {
            document.getElementById("nosubsfound").style.display = "none";
            window.paiSubscriptionItems = paiSubscriptionItems;

            fillMyAIsWithSubscriptions(paiSubscriptionItems)
        }
    }
}

window.onuserSettingsButtonClicked = async function (event) {
    event.preventDefault();

    //fill out the divs with id username and usermail
    if (auth.currentUser) {
        const userName = auth.currentUser.displayName;
        if (userName) {
            document.getElementById("userSettingsUsername").style.display = "block";
            document.getElementById("username").innerText = userName
        }
        else {
            document.getElementById("userSettingsUsername").style.display = "none";
        }
        document.getElementById("usermail").innerText = auth.currentUser.email
    }
    document.getElementById("userSettingsContent").style.display = "block";
    shoMyAIsPopup()

}


function fillMyAIsWithSubscriptions(paiSubscriptionItems) {
    const popupStore = usePopupStore();
    const generalStore = useGeneralStore();
    const videoname = generalStore.videoname;
    let subscriptionList = document.getElementById('subscriptionList');
    subscriptionList.innerHTML = '';
    document.getElementById("subscriptionListTitle").style.display = "flex";
    document.getElementById("subscriptionListTitleOne").style.display = "none";
    //add list of elements
    for (let [subs_videoname, subs_details] of Object.entries(paiSubscriptionItems)) {
        let subscriptionItemDiv = document.createElement('div');
        subscriptionItemDiv.classList.add('subscriptionItemDiv');
        let charname = subs_videoname.charAt(0).toUpperCase() + subs_videoname.slice(1);
        let subscriptionlevelCapitalLetter = subs_details.subscriptionlevel.charAt(0).toUpperCase() + subs_details.subscriptionlevel.slice(1);
        let innerHTML = "";
        if (subs_videoname === videoname) {
            innerHTML += `<div class="subscriptionItem subscriptionItemThick">${charname}</div>`
        }
        else {
            innerHTML +=
                `<div class="subscriptionItem subscriptionItemThick"><a style="color: inherit;" href="/${subs_videoname}"><u>${charname}</u></a></div>`
        }
        innerHTML += `<div class="subscriptionItem subscriptionItemThick" style="font-style: italic; font-size: 14px;">${subscriptionlevelCapitalLetter}</div>`;
        let validUntil = null;
        if (subs_details.validUntil) {
            validUntil = subs_details.validUntil
            const dateObj = new Date(validUntil);
            const validUntilFormatted = dateObj.getUTCDate().toString().padStart(2, '0') + '.' +
                (dateObj.getUTCMonth() + 1).toString().padStart(2, '0') + '.' +
                dateObj.getUTCFullYear().toString().slice(-2);
            innerHTML += `<div class="subscriptionItem subscriptionItemThin" style="font-size: 13px; color: var(--markup-color-bright); padding: unset;"><button class="showNotificationHowToSubsc" value="${subs_videoname}" onclick="showNotificationHowToSubsc(event.target.value)">(expires ${validUntilFormatted})</button></div>`
        }
        else {
            innerHTML += `<div class="subscriptionItem subscriptionItemThin" style="padding: unset;"><button class="smallButtonWithoutBackground" id="cancelSubscription${subs_videoname}" value="${subs_videoname}">cancel</button></div>`
        }
        subscriptionItemDiv.innerHTML = innerHTML
        subscriptionList.appendChild(subscriptionItemDiv);
        if (!validUntil) {
            document.getElementById(`cancelSubscription${subs_videoname}`).addEventListener('click', function (event) {
                popupStore.closePopup("subscription");
                letUserConfirm("Are you sure you want to cancel this subscription?", cancelSubscription, event.target.value)
            })
        }
    }
}

async function fillMyAIsWithPossibleAIs() {
    const generalStore = useGeneralStore();
    const videoname = generalStore.videoname;
    document.getElementById("subscriptionListTitle").style.display = "none";
    document.getElementById("subscriptionListTitleOne").style.display = "block";
    const availableChars = await getMarketingMaterial(5, 999);
    if (availableChars) {
        availableChars.sort(() => Math.random() - 0.5);
        let subscriptionList = document.getElementById('subscriptionList');
        subscriptionList.innerHTML = '';
        for (let charValues of availableChars) {
            const subs_videoname = charValues.videoname;
            let subscriptionItemDiv = document.createElement('div');
            subscriptionItemDiv.classList.add('availableAIDiv');
            let charname = subs_videoname.charAt(0).toUpperCase() + subs_videoname.slice(1);
            let innerHTML = "";
            if (subs_videoname === videoname) {
                innerHTML += `<div class="subscriptionItem" style="cursor:pointer" onclick="onPurchaseButtonPressed()"><u>${charname}</u></a></div>`
            } else {
                innerHTML = `<div class="subscriptionItem"><a style="color: inherit;" href="/${subs_videoname}"><u>${charname}</u></a></div>`
            }
            subscriptionItemDiv.innerHTML = innerHTML
            subscriptionList.appendChild(subscriptionItemDiv);
        }
    }
}

window.showNotificationHowToSubsc = function (buttonVideoname) {
    const popupStore = usePopupStore();
    const generalStore = useGeneralStore();
    const videoname = generalStore.videoname;
    if (buttonVideoname == videoname) {
        popupStore.closePopup("subscription")
        onPurchaseButtonPressed()
        showNotification("neutral", "To support this Char again, start a new support", "long")
    }
    else {
        showNotification("neutral", "To support this Char again, go to the page of the character and click 'Support this AI'", "long")
    }
}

export async function openLoginOrReg() {
    const popupStore = usePopupStore();
    window.pauseVideo = true;
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registrationForm').style.display = 'none';
    document.getElementById("forgotPasswordButton").style.display = 'none';
    document.getElementById('mailadressinput').style.display = 'none';
    /*document.getElementById('orInLogin').style.display = 'block';
    document.getElementById('googleLoginButton').style.display = 'unset';*/
    document.getElementById("loginAndRegisterRadio").style.display = 'block';
    document.getElementById('loginRadio').checked = false;
    document.getElementById('registerRadio').checked = false;
    popupStore.openPopup('login');

}

async function onLoginRadioPressed() {
    document.getElementById('loginForm').style.display = 'flex';
    document.getElementById("forgotPasswordButton").style.display = 'unset';
    document.getElementById('mailadressinput').style.display = 'unset';
    /*document.getElementById('orInLogin').style.display = 'block';
    document.getElementById('googleLoginButton').style.display = 'unset';*/
    document.getElementById('registrationForm').style.display = 'none';
    document.getElementById("loginAndRegisterRadio").style.display = 'none';
}
async function onRegisterRadioPressed() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById("forgotPasswordButton").style.display = 'none';
    document.getElementById('mailadressinput').style.display = 'unset';
    /*document.getElementById('orInLogin').style.display = 'block';
    document.getElementById('googleLoginButton').style.display = 'unset';*/
    document.getElementById('registrationForm').style.display = 'flex';
    document.getElementById("loginAndRegisterRadio").style.display = 'none';

}

let lastTimeloginSubmitButtonPressed = new Date().getTime();
export async function onLoginFormSubmit() {
    if (lastTimeloginSubmitButtonPressed > new Date().getTime() - 2000) return; //do it like this and not with disabling (even not with setting a param) because I had many problems with that!
    lastTimeloginSubmitButtonPressed = new Date().getTime();
    let email = document.getElementById('mailadressinput').value;
    let password = document.getElementById('passwordInputLogin').value;
    login(email, password)
}

let lastTimeRegistrationButtonPressed = new Date().getTime();
export async function onRegistrationFormSubmit() {
    if (lastTimeRegistrationButtonPressed > new Date().getTime() - 2000) return; //do it like this and not with disabling (even not with setting a param) because I had many problems with that!
    lastTimeRegistrationButtonPressed = new Date().getTime();
    let email = document.getElementById('mailadressinput').value;
    if (document.getElementById('passwordInputRegistration').value !== document.getElementById('passwordConfirmInputRegistration').value) { //do not store password as variable for security reasons
        showNotification("bad", 'Passwords do not match');
        return;
    }
    if (document.getElementById('passwordInputRegistration').value.length < 8) { //do not store password as variable for security reasons
        showNotification("bad", 'Password has to be at least 8 characters');
        return;
    }
    register(email)
    //attention: if I write code here afterwards it may not get executed because the register function sometimes stops if e.g. the mail adress is incorrect!
}

function register(mail) {
    const popupStore = usePopupStore();
    createUserWithEmailAndPassword(auth, mail, document.getElementById('passwordInputRegistration').value) //do not store password as variable for security reasons
        .then((userCredential) => {
            // Send email verification
            sendVerificationMailAndCheckStatus(userCredential.user);
            //addToCookie("returnFromCookieSessionWasSet", new Date().getTime()); //means: the app should return from the cookie session
            // Close the popup
            document.getElementById('passwordInputRegistration').value = "";
            document.getElementById('passwordConfirmInputRegistration').value = "";
            popupStore.closePopup("login");
        })
        .catch((error) => {
            // Handle specific registration errors
            switch (error.code) {
                case 'auth/email-already-in-use':
                    showNotification("neutral", `Email address already in use. Please log in.`);
                    break;
                case 'auth/invalid-email':
                    showNotification("bad", `Email address is invalid.`);
                    break;
                case 'auth/operation-not-allowed':
                    logThis("", "ERROR! during sign up.");
                    showNotification("bad", `Error during sign up.`);
                    break;
                case 'auth/weak-password':
                    showNotification("neutral", 'Password must be at least 6 characters.');
                    break;
                default:
                    logThis("", `ERROR!: #3783: error.message: ${error.message}`);
                    showNotification("bad", `Error during sign up.`);
                    break;
            }
        });
}

/*
document.getElementById('googleLoginButton').addEventListener('click', function (event) {
    event.preventDefault();
    var termsCheckbox = document.getElementById('terms');
    if (!termsCheckbox.checked) {
        showNotification("bad", "Please accept the terms and conditions");
    } else {
        googleLogin();
    }
});*/


let lastTimeDeleteAccountClicked = new Date().getTime();
window.onDeleteAccountClicked = async function () {

    const popupStore = usePopupStore();
    if (lastTimeDeleteAccountClicked > new Date().getTime() - 4000) return; //do it like this and not with disabling (even not with setting a param) because I had many problems with that!
    lastTimeDeleteAccountClicked = new Date().getTime();
    const paiSubscriptionItems = await getSubscriptionStatus();

    if (paiSubscriptionItems && Object.keys(paiSubscriptionItems).length > 0) {
        showNotification("neutral", "You have open subscriptions. Please cancel your subscriptions first.");
        return;
    }
    popupStore.closePopup("subscription");
    letUserConfirm("Are you sure you want to delete your account? This action cannot be undone.", deleteUserAccount)
};

async function deleteUserAccount() {

    // Delete the user
    if (auth.currentUser) {
        try {
            await deleteUser(auth.currentUser);
            console.log("User deleted successfully");

            // Clear cookies
            deleteFromCookie("userId");
            deleteFromCookie("striSessionIdEnc");

            showNotification("good", "Account deleted successfully. We're sorry to see you go.", "long");
        } catch (error) {
            if (error.code === "auth/requires-recent-login") {
                showNotification("bad", "You must log in newly to delete your account.");
                await logout();
                await openLoginOrReg();
            } else {
                console.error("Error deleting user:", error);
                showNotification("bad", "Error deleting account. Please try again later or contact support.");
            }
        }
    } else {
        console.log("No user is logged in.");
    }
}


const sendVerificationMailMaxEverySec = 5 * 60; //google seems to not allow re-sending verification mails in less than 2 minutes (I got a TOO_MANY_ATTEMPTS_TRY_LATER error) AND important: I had a problem when I myself tried to send because it took <2min until mail was received. So better not send too often
let lastTimeSentVerificationMail = new Date().getTime() - sendVerificationMailMaxEverySec * 1000;
async function sendVerificationMailAndCheckStatus(user) {
    const popupStore = usePopupStore();
    const generalStore = useGeneralStore();
    if (generalStore.environment === "locally") {
        showNotification("bad", "Sending verification mail does not work locally", "long")
        return
    }
    if (lastTimeSentVerificationMail > new Date().getTime() - sendVerificationMailMaxEverySec * 1000) {
        showNotification("neutral", "Please click on the link in the mail which we sent you", "long")
        return
    }
    lastTimeSentVerificationMail = new Date().getTime();
    if (!user) {
        if (auth.currentUser) await auth.currentUser.reload();
        user = auth.currentUser
    }
    console.log("sending verification mail")
    if (auth.currentUser) {
        try {
            let params = {}
            params.domain = domainName;
            console.log("params: " + JSON.stringify(params))
            console.log("auth: " + JSON.stringify(auth))

            const [response, responseJson] = await callAPI("", '/v1/mailVerification', params, 'POST', true)
            if (response.status == 200) {
                showNotification("good", "We sent you a mail. Please click on the link in the mail.");
                popupStore.closePopup("login");
                lastTimeSentVerificationMail = new Date().getTime();
                pollIfMailVerified()
            }
        }
        catch (error) {
            showNotification("bad", "Error sending verification email. Please try again later.");
            logThis("", `ERROR! #3456: error sending verification mail: ${error.code} ${error.message} `);
        }

    } else {
        showNotification("bad", "No user is currently signed in.");
    }
}


async function login(email, password) {
    const popupStore = usePopupStore();
    const generalStore = useGeneralStore();
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            showNotification("good", "Logged in successfully");
            if (generalStore.routeName === "Character") {
                onPurchaseButtonPressed();//do not use a timeout here because this can be seen as unwanted popups then (esp. on inkognito mode on mobile phones)
            }
            popupStore.closePopup("login");
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;

            // Handling specific error for invalid password
            if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-password') {
                showNotification("bad", "Invalid password. Please try again.");
            } else if (errorCode === 'auth/invalid-credential') {
                showNotification("bad", "Invalid credentials. Please try again.");
            } else if (errorCode === 'auth/user-not-found') {
                showNotification("bad", "No user found with this email. Please register first.");
            } else if (errorCode === 'auth/invalid-email') {
                showNotification("bad", "Invalid email. Please try again.");
            } else {
                logThis("", `ERROR! #3456: error.code: ${error.code} error.message: ${error.message}`);
                showNotification("bad", `Login failed: ${errorMessage}`);
            }
        });
}



// Function to handle Google Login
/*function googleLogin() {
    signInWithPopup(auth, googleAuthProvider)
        .then((result) => {
            showNotification("good", "Logged in successfully with Google");
            popupStore.closePopup("login");
                openStripePurchase(); //do not use a timeout here because this can be seen as unwanted popups then (esp. on inkognito mode on mobile phones)
        }).catch((error) => {
            var errorCode = error.code;
            var errorMessage = error.message;
            console.error("Google sign in error", errorCode, errorMessage);
            showNotification("bad", `Failed to log in with Google: ${errorMessage}`);
        });
}*/


export async function updateUiForSubscription(paiSubscriptionItems, subscriptionIsNew) {
    const generalStore = useGeneralStore();
    const videoname = generalStore.videoname;
    logThis("", "updateUiForSubscription running")

    if (generalStore.routeName === "Character") {

        logThis("", `updateUiForSubscription running and generalStore.routeName is char. paiSubscriptionItems: ${JSON.stringify(paiSubscriptionItems)}`)
        document.getElementById("purchaseButton").style.display = "unset"
        document.getElementById("purchaseButtonInMySubs").style.display = "unset"
        if (paiSubscriptionItems) {
            if (videoname in paiSubscriptionItems) {
                if (paiSubscriptionItems[videoname]["subscriptionlevel"] === "basic") {
                    if (lastSubscriptionLevel !== paiSubscriptionItems[videoname]["subscriptionlevel"]) {
                        if (subscriptionIsNew) {
                            showNotification("good", "You are now a Supporter. You can use all Supporter Features of this AI");
                            subscriptionIsNew = false;
                        }
                        else {
                            showNotification("good", "You are a Supporter. You can use all Supporter Features of this AI");
                        }
                        lastSubscriptionLevel = paiSubscriptionItems[videoname]["subscriptionlevel"];
                    } 
                    document.getElementById("supporterBadge").style.display = "block"
                    document.getElementById("premiumSupporterBadge").style.display = "none"
                }
                else if (paiSubscriptionItems[videoname]["subscriptionlevel"] === "premium") {
                    if (lastSubscriptionLevel !== paiSubscriptionItems[videoname]["subscriptionlevel"]) {
                        if (subscriptionIsNew) {
                            showNotification("good", "You are a now Premium Supporter. You can use all Features of this AI including Premium Features");
                            subscriptionIsNew = false;
                        }
                        else {
                            showNotification("good", "You are a Premium Supporter. You can use all Features of this AI including Premium Features");
                        }
                        lastSubscriptionLevel = paiSubscriptionItems[videoname]["subscriptionlevel"];
                    } else if (subscriptionIsNew) {
                        showNotification("good", "Successfully extended your support for this AI");
                    }
                    document.getElementById("supporterBadge").style.display = "none"
                    document.getElementById("premiumSupporterBadge").style.display = "block"
                    //hide the purchase button because the user is already a premium supporter
                    document.getElementById("purchaseButton").style.display = "none"
                    document.getElementById("purchaseButtonInMySubs").style.display = "none"
                }
                else {
                    logThis("", "ERROR! #27838: subscriptionlevel not found")
                }
            }
            else {
                changeUiToNoSubscription()
            }
        }
        else {
            changeUiToNoSubscription()
        }
        updatePurchaseButton(paiSubscriptionItems)

    }
}


export async function toggleDarkMode() {
    const generalStore = useGeneralStore();
    if (darkModeActive == true) {
        darkModeActive = false;
        generalStore.darkModeActive = false;
        document.body.classList.toggle('dark-mode');
    }
    else {
        darkModeActive = true;
        generalStore.darkModeActive = true;
        document.body.classList.toggle('dark-mode');
    }
    addToCookie('darkModeActive', darkModeActive);
}


