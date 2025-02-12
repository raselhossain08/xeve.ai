<template>
    <div id="loginOrRegisterPopup" class="popup" v-show="isOpen">
        <div class="popup-content" style="text-align: center">
            <span class="close" @click.prevent="closePopup">&times;</span>
            <span class="placeholderClose">&times;</span>

            <h2 id="LoginRegTitle" class="tr">
                {{ selectedOption.length ? selectedOption : title }}
            </h2>

            <div id="loginAndRegisterRadio" v-show="!selectedOption.length">
                <div class="box">
                    <input type="radio" id="loginRadio" name="box" v-model="selectedOption" value="Login" />
                    <label class="bigButton tr" for="loginRadio" style="padding: unset; height: 100%;">Login</label>
                </div>
                <div class="box" style="margin-bottom: 10px">
                    <input type="radio" id="registerRadio" name="box" v-model="selectedOption" value="Register" />
                    <label class="bigButton tr" for="registerRadio"
                        style="padding: unset; height: 100%;">Register</label>
                </div>
            </div>

            <input v-show="selectedOption.length > 0" type="email" id="mailadressinput" placeholder="Enter your Email" 
                class="normalInput" required aria-label="Enter your email address" 
                autocomplete="email" />


            <form id="loginForm" v-show="selectedOption === 'Login'"
                style="display: flex; flex-direction: column; align-items: center" @submit.prevent="onLoginSubmit">
                <input type="password" id="passwordInputLogin" placeholder="Password" class="normalInput" required
                    aria-label="Enter your password" autocomplete="current-password"
                    />
                <button id="loginSubmitButton" type="submit" class="bigButton tr" style="margin: 10px 50px 12px 50px">
                    Login
                </button>
                <button type="button" id="registerRadio2" class="textButton tr"
                    @click.prevent="selectedOption = 'Register'">
                    Don't have an account?
                    <span style="text-decoration: underline">Register</span>
                </button>
            </form>

            <button id="forgotPasswordButton" class="textButton tr" v-show="selectedOption === 'Login'"
                style="text-decoration: underline; margin-top: 5px" @click.prevent="onForgotPasswordClicked()">
                Forgot password?
            </button>

            <form id="registrationForm" v-show="selectedOption === 'Register'"
                style="display: flex; flex-direction: column; align-items: center" @submit.prevent="onRegisterSubmit">
                <input type="password" id="passwordInputRegistration" placeholder="Set password" class="normalInput"
                    required aria-label="Set your password" autocomplete="new-password"/>
                <input type="password" id="passwordConfirmInputRegistration" placeholder="Confirm Password"
                    class="normalInput" required aria-label="Confirm your password" autocomplete="new-password" />
                <button type="button" id="loginRadio2" class="textButton tr" @click.prevent="selectedOption = 'Login'">
                    Already have an account?
                    <span style="text-decoration: underline">Login</span>
                </button>
                <div style="padding-top: 5px; font-size: 13px">
                    <input type="checkbox" id="terms" name="terms" required
                        aria-label="I agree to the Terms and Conditions" />
                    <label for="terms" class="tr">
                        I agree to the <a @click.prevent.prevent="openTerms" href="#">Terms and Conditions</a>
                    </label>
                </div>
                <button id="registrationSubmitButton" type="submit" class="bigButton tr" style="margin: 15px 70px">
                    Register
                </button>
            </form>
        </div>
    </div>
</template>

<script>
import { usePopupStore } from "@/stores/popupStore";
import { onLoginFormSubmit, onRegistrationFormSubmit } from "@/js/script_navbar";

export default {
    data() {
        return {
            selectedOption: "",
            title: "Login or Register",
        };
    },
    computed: {
        isOpen() {
            const popupStore = usePopupStore();
            return popupStore.login;
        }
    },
    watch: {
        isOpen(newVal) {
            if (newVal) { //means: if the popup is opened
                this.selectedOption = "";
            }
        }
    },
    methods: {
        closePopup() {
            const popupStore = usePopupStore();
            popupStore.closePopup("login");
        },
        onLoginSubmit() {
            onLoginFormSubmit()
        },
        onRegisterSubmit() {
            onRegistrationFormSubmit()
        },
        openTerms() {
            const popupStore = usePopupStore()
            popupStore.openPopup('terms')
        },
        onForgotPasswordClicked() {
            console.log("Forgot password clicked");
            this.selectedOption = ''
            const popupStore = usePopupStore();
            popupStore.closePopup("login");
            popupStore.openPopup("confirmation");
            window.getUserInput("Please put in your email-adress", window.forgotPassword, [])
        }
    },
};
</script>


<style scoped>
#LoginRegTitle {
    text-transform: none;
}

#loginAndRegisterRadio {
    margin-top: 25px;
}
</style>