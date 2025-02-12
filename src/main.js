import './assets/main.css'
import './assets/xevestyle.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { auth } from './js/auth'

const app = createApp(App)

const pinia = createPinia();
app.use(pinia);
app.use(router);



import { setLanguage } from '@/js/language';
import { getFromCookie, addToCookie } from '@/js/cookie';
import { initiateFirebaseAuth } from '@/js/auth';
import { initiateAnalytics } from '@/js/script_navbar';
import { useGeneralStore } from "@/stores/generalStore";
import { toggleDarkMode, onMailVerified } from "@/js/script_navbar";
import { useRoute } from 'vue-router'; // Import useRoute from Vue Router

router.beforeEach((to, from, next) => {
  const generalStore = useGeneralStore()
  const parts = window.location.hostname.split('.');

  generalStore.routePath = to.path
  generalStore.routeName = to.name

  let domainname = parts.slice(-2).join('.');
  if (window.location.hostname === "localhost" || window.location.hostname.startsWith("192.168")) {
    const testDomain = "xeve.ai";
    domainname = testDomain;
    window.testDomain = testDomain;
    generalStore.environment = "locally"
  }
  else if (window.top === window.self) {
    generalStore.environment = "cloud"
  } else {
    generalStore.environment = "iframe"
  }
  generalStore.domainname = domainname

  let videoname = ""
  if (to.name === 'Character') {
    videoname = window.location.pathname.slice(1)
    generalStore.videoname = videoname
    document.title = `${videoname} | ${domainname}`;
  } else if (to.name === 'Embedding') {
    const videoname = window.location.pathname.split('/')[2];
    generalStore.videoname = videoname;
}

  
  initiateAnalytics()
  initiateFirebaseAuth();
  //check if darkmode is active
  if (getFromCookie('darkModeActive') === true) {
    toggleDarkMode()
  }
  const urlParams = new URLSearchParams(window.location.search);
  const verifymail = urlParams.get('verifymail')

  if (verifymail === "true") {
      if (auth.currentUser && auth.currentUser.emailVerified) {
          onMailVerified()
      }
  }


  let userId = getFromCookie("userId")
  if (!userId) {
      //userId is current date with random 6 digit number
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(2, 10).replace(/-/g, '');
      userId = `${formattedDate}_${Math.floor(10000000 + Math.random() * 90000000)}`
      addToCookie("userId", userId)
  }
  window.userId = userId


  //set language
  let language = getFromCookie('language');
  if (language && language !== 'en') {
    setTimeout(() => {//should be called after page loaded and other scripts executed
      setLanguage(language);
    }, 300);
  }
  next()
});




router.isReady().then(() => { // Wait until the router is ready because otherwise accessing route in the components is
  app.mount('#app');
}); 
