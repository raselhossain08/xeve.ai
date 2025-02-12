
import { callAPI, logThis, showNotification, letUserConfirm } from './utils.js' //GoogleAuthProvider, signInWithPopup
import { updateUiForSubscription } from "./script_navbar.js";
import { useGeneralStore } from "../stores/generalStore";
import { trackPurchaseGtag } from "./script_navbar.js";
import { auth } from './auth.js'

let paiSubscriptionItems = null;



async function postSubscription(subscriptionlevel) {
    const generalStore = useGeneralStore();
    const videoname = generalStore.videoname;
    if (!auth.currentUser) {
        logThis("", "ERROR! #494: no user available");
        showNotification("bad", "No user available");
        return;
    }
    let originurl = window.location.href;
    if (originurl.includes("http://localhost:3000/")) {
        originurl = originurl.replace("http://localhost:3000/", "https://nonprod.xeve.ai/");
    }
    const body_params = {
        originurl: originurl,
        videoname,
        subscriptionlevel,
        originDomain: generalStore.domainname
    };

    try {
        const [_, responseJson] = await callAPI("", "/v1/subscription", {}, "POST", true, body_params);

        if (responseJson && responseJson.redirectUrl) {
            // Redirect to the payment page
            window.location.href = responseJson.redirectUrl;
        } else {
            showNotification("bad", "Failed to create subscription. Please try again.");
        }
    } catch (error) {
        logThis("", `ERROR! Failed to create subscription: ${error.message}`);
        showNotification("bad", "An error occurred. Please try again.");
    }
}

export async function addSubscription(subscriptionlevel) {
    const generalStore = useGeneralStore();
    const charname = generalStore.charname;
    document.getElementById("mySubscriptions").style.display = "none";
    document.getElementById("chooseSubscriptionlevelPopup").style.display = "none";

    let paiSubscriptionItemsNotEmpty = false;
    if (window.paiSubscriptionItems && Object.keys(window.paiSubscriptionItems).length > 0) {
        paiSubscriptionItemsNotEmpty = true;
    }

    if (subscriptionlevel === "basic") {
        letUserConfirm(
            `Become a Supporter of ${charname} at ${(generalStore.pricingInCents.basic / 100)
                .toFixed(2)
                .replace(".", ",") ?? "??"}&nbsp;€ monthly?`,
            paiSubscriptionItemsNotEmpty ? putSubscription : postSubscription,
            subscriptionlevel
        );
    } else {
        letUserConfirm(
            `Become a Premium Supporter of ${charname} at ${(generalStore.pricingInCents.premium / 100)
                .toFixed(2)
                .replace(".", ",") ?? "??"}&nbsp;€ monthly?`,
            paiSubscriptionItemsNotEmpty ? putSubscription : postSubscription,
            subscriptionlevel
        );
    }

}
window.paiSubscriptionItems = [];

async function putSubscription(subscriptionlevel) {
    try {
        const generalStore = useGeneralStore();
        const videoname = generalStore.videoname;
        let isExtension = false;
        if (paiSubscriptionItems?.[videoname]?.subscriptionlevel === subscriptionlevel && paiSubscriptionItems?.[videoname]?.validUntil) {
            isExtension = true;
        }

        let body_params = {
            videoname: videoname,
            subscriptionlevel: subscriptionlevel
        }
        let [_, responseJson] = await callAPI("", '/v1/subscription', {}, 'PUT', true, body_params)
        paiSubscriptionItems = responseJson.paiSubscriptionItems;
        window.paiSubscriptionItems = paiSubscriptionItems;
        document.getElementById('mySubscriptions').style.display = "none";
        document.getElementById('chooseSubscriptionlevelPopup').style.display = "none";
        /*if (subscriptionlevel == "premium") {
            showNotification("good", "You're now a Premium Supporter of this AI")
        } else {
            showNotification("good", "You're now a Supporter of this AI")
        }*/
        if (auth.currentUser) await auth.currentUser.reload();
        trackPurchaseGtag(videoname, subscriptionlevel, subscriptionlevel === "basic" ? generalStore.pricingInCents.basic : generalStore.pricingInCents.premium)
        setTimeout(() => { //this timeout is important because otherwise the database was not updated yet because the update of DB runs async on the server
            getSubscriptionStatus(true)
        }, 1000);
        showNotification("good", "Successfully extended your support for this AI");
    } catch (error) {
        logThis("", `ERROR! Failed to extend subscription: ${error.message}`);
        showNotification("bad", "An error occurred. Please try again.");
    }

}


export async function getSubscriptionStatus(subscriptionIsNew = false) {
    const generalStore = useGeneralStore();
    if (auth.currentUser) await auth.currentUser.reload();
    if (!auth.currentUser) {
        await setToNoSubcription()
        return [null, null]
    }
    let [_, responseJson] = await callAPI("", '/v1/subscription', {}, 'GET', true)
    paiSubscriptionItems = responseJson.paiSubscriptionItems || null;
    window.paiSubscriptionItems = paiSubscriptionItems;
    generalStore.pricingInCents.basic = responseJson.pricingInCents.basic;
    generalStore.pricingInCents.premium = responseJson.pricingInCents.premium;
    updateUiForSubscription(paiSubscriptionItems, subscriptionIsNew)
    return paiSubscriptionItems
}

async function setToNoSubcription() {
    paiSubscriptionItems = null;
    window.paiSubscriptionItems = paiSubscriptionItems;
    changeUiToNoSubscription()
    updatePurchaseButton(null, null)
}


export async function cancelSubscription(videoname) {
    if (!videoname) {
        showNotification("bad", "Error during cancelling subscription: No videoname found. Please contact our support.")
        return
    }
    let params = {
        videoname: videoname
    }
    let [response, responseJson] = await callAPI("", '/v1/subscription', params, 'DELETE', true);
    if (response.status == 200) {
        if (responseJson.paiSubscriptionItems && responseJson.paiSubscriptionItems !== null) {
            paiSubscriptionItems = responseJson.paiSubscriptionItems;
        }
        else {
            //looks like also the whole over-subscription was canceled
            paiSubscriptionItems = null;
        }
        window.paiSubscriptionItems = paiSubscriptionItems;
        showNotification("good", "Subscription canceled successfully", "long") //WENN wieder mit payment, dann einfügen: You can still use it until the end of the billing period.
    }
    else {
        showNotification("bad", "Error during cancelling subscription. Please contact our support.")
        logThis("error", "ERROR! during cancelling subscription: " + JSON.stringify(responseJson))
    }
}

window.onload = async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentParam = urlParams.get('payment');
    const transactionID = urlParams.get('transactionID');
    if (paymentParam) {
        returnFromPayment(paymentParam, transactionID);

    }
};

async function returnFromPayment(paymentParam, transactionID) {
    if (paymentParam === "cancel") {
        showNotification("bad", "Payment canceled. Please try again.");
        removeQueryParams(["payment", "transactionID"]);
        return
    } else if (paymentParam === "failed") {
        showNotification("bad", "Payment failed. Please try again.");
        removeQueryParams(["payment", "transactionID"]);
        return
    }
    else if (paymentParam !== "success") {
        showNotification("bad", "Payment failed. Please try again.");
        logThis("", `ERROR! Unknown payment status: ${paymentParam}`);
        removeQueryParams(["payment", "transactionID"]);
        return
    }
    let videoname = "";
    let userMail = null;
    while (videoname === "" || !userMail) { //needed because this might run directly when the page is loaded and therefore the videoname is not yet set
        await new Promise(resolve => setTimeout(resolve, 400));
        const generalStore = useGeneralStore();
        videoname = generalStore.videoname;
        userMail = generalStore.loggedInUser?.email;
    };

    let responseCodeType = null;

    const params = {
        usermail: userMail,
        transactionID: transactionID
    };

    const [response, responseJson] = await callAPI("", '/v1/paymentSessionStatus', params, 'GET', true);
    //check status code if is 204
    if (response.status === 204) {
        logThis("", `#123: This order has been processed before`);
        removeQueryParams(["payment", "transactionID"]);
        return
    }
    responseCodeType = responseJson.responseCodeType;
    logThis("", `responseCodeType: ${responseCodeType}`);

    if (responseCodeType === "APPROVED") {
        logThis("", `Payment successful!`);
        showNotification("good", "Payment successful");

        paiSubscriptionItems = responseJson.paiSubscriptionItems;
        let subscriptionlevel = paiSubscriptionItems[videoname]["subscriptionlevel"];
        let price = subscriptionlevel === "basic" ? generalStore.pricingInCents.basic : generalStore.pricingInCents.premium;

        window.gtag('event', 'conversion', {
            'send_to': 'AW-CONVERSION_ID/CONVERSION_LABEL',
            'value': price,
            'currency': 'EUR'
        });
        // Refresh subscription status from the database
        getSubscriptionStatus(true);
        removeQueryParams(["payment", "transactionID"]);

    } else {
        logThis("", `WARNING! Payment failed! responseCodeType: ${JSON.stringify(responseCodeType)} `);
        showNotification("bad", "Payment failed. Please try again!");
    }

}

function removeQueryParams(paramsToRemove) {
    // Parse the current URL
    const url = new URL(window.location.href);

    // Remove each specified parameter
    paramsToRemove.forEach(param => url.searchParams.delete(param));

    // Construct the new URL without the specified parameters
    const newUrl = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash;

    // Use the History API to update the URL without reloading the page
    window.history.replaceState({ path: newUrl }, '', newUrl);
}

export async function changeUiToNoSubscription() {
    const generalStore = useGeneralStore();
    if (generalStore.routeName === "char") {
        document.getElementById("supporterBadge").style.display = "none"
        document.getElementById("premiumSupporterBadge").style.display = "none"
    }
}


export async function updatePurchaseButton(paiSubscriptionItems) {
    const generalStore = useGeneralStore();
    const videoname = generalStore.videoname;
    if (generalStore.routeName === "char") {

        //if (!sayingofaibubble.classList.contains('visible')) {
        if (paiSubscriptionItems && videoname in paiSubscriptionItems && paiSubscriptionItems[videoname]["subscriptionlevel"] === "premium") {
            //already premium supporter
            document.getElementById("purchaseButtonOverVideoDiv").style.display = "none"; //already a premium supporter
        } else if (paiSubscriptionItems && videoname in paiSubscriptionItems && paiSubscriptionItems[videoname]["subscriptionlevel"] === "basic") {
            //basic supporter
            document.getElementById("purchaseButtonOverVideoDiv").style.display = "block";
            document.getElementById("purchaseButtonOverVideo").innerText = "Get Premium";
        } else {
            //no supporter
            document.getElementById("purchaseButtonOverVideoDiv").style.display = "block";
            document.getElementById("purchaseButtonOverVideo").innerText = "Support this AI";
        }
    }
}