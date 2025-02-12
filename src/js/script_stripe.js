

let stripePublicKey = "";
const stripePublicKeyNonprod = "pk_test_51PBCdjETWjlq6B4DwnRoR5ry4QKH77Pp2SHx0Tc48HO4K6Xv884QO02j11mFMjje4o7dEvEy6QSKEe4mHyJKv6JK00xlcTWfiA"
const stripePublicKeyProd = "pk_live_51PBCdjETWjlq6B4D9obhT2xeT9PvLpHXbCiLoVReGSswZcjfm1RvFpplBfHrppAift3rQSc96ZPhCrZ3d8rkbOXe00h8Zp7j5O"

if (window.location.hostname === "localhost" || window.location.hostname.startsWith("192.168")) {
    stripePublicKey = stripePublicKeyNonprod
} else if (window.top === window.self) {
    if (window.location.hostname.startsWith("nonprod")) {
        stripePublicKey = stripePublicKeyNonprod
    }
    else {
        stripePublicKey = stripePublicKeyProd
    }
} /*else {
    // The web app is loaded inside an <iframe>
    stripePublicKey = stripePublicKeyProd
}*/

export function getStripeElement(){
    var stripe = Stripe(stripePublicKey);
    return stripe;
}

