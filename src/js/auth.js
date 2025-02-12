import {
  sendPasswordResetEmail,
  onAuthStateChanged,
  getAuth,
  updateProfile,
  setPersistence,
  inMemoryPersistence,
  browserSessionPersistence,
} from 'https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js'

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js'
import { showNotification } from './utils.js'
import { useGeneralStore } from '../stores/generalStore.js'
import { getSubscriptionStatus } from './script_subscriptions.js'
import { openLoginOrReg } from './script_navbar.js'

export let auth = null

/**
 * Detects if IndexedDB is blocked (Safari Private Mode)
 */
const isIndexedDBDisabled = async () => {
  return new Promise((resolve) => {
    const dbName = 'testDB'
    const request = indexedDB.open(dbName)

    request.onerror = () => resolve(true) // IndexedDB is blocked
    request.onsuccess = () => {
      resolve(false) // IndexedDB is working
      request.result.close()
      indexedDB.deleteDatabase(dbName)
    }
  })
}

/**
 * Initializes Firebase authentication
 */
export async function initiateFirebaseAuth() {
  if (auth) {
    console.warn('Firebase Auth is already initialized.')
    return auth
  }

  console.log('Initializing Firebase Authentication...')
  const generalStore = useGeneralStore()
  let firebaseConfig = {}

  // ✅ Firebase Configurations
  const firebaseConfigProd = {
    apiKey: 'AIzaSyBGWw5wBMtM6t9oQLm4uyeix9ICDomeeBs',
    authDomain: 'personai-86161.firebaseapp.com',
    projectId: 'personai-86161',
    storageBucket: 'personai-86161.appspot.com',
    messagingSenderId: '976229408465',
    appId: '1:976229408465:web:ae31a631bbba50bda46ff0',
  }

  const firebaseConfigNonprod = {
    apiKey: 'AIzaSyCA5o8D0h_vw87tBibVNDj3Qvdn3OAn8bU',
    authDomain: 'nonprodpersonai.firebaseapp.com',
    projectId: 'nonprodpersonai',
    storageBucket: 'nonprodpersonai.appspot.com',
    messagingSenderId: '897937947272',
    appId: '1:897937947272:web:795dab44414b75f78cbd3d',
  }

  // ✅ Environment-based Config Selection
  if (generalStore.environment === 'locally') {
    firebaseConfig = firebaseConfigNonprod
  } else if (window.top === window.self) {
    firebaseConfig = window.location.hostname.startsWith('nonprod')
      ? firebaseConfigNonprod
      : firebaseConfigProd
  } else {
    firebaseConfig = firebaseConfigProd
  }

  // ✅ Initialize Firebase
  const app = initializeApp(firebaseConfig)
  auth = getAuth()

  // ✅ Detect Private Mode and set persistence accordingly
  const isPrivate = await isIndexedDBDisabled()

  if (isPrivate) {
    console.warn('Safari Private Mode detected: Using inMemoryPersistence.')
    await setPersistence(auth, inMemoryPersistence)
  } else {
    await setPersistence(auth, browserSessionPersistence)
  }

  // ✅ Listen for authentication changes
  onAuthStateChanged(auth, (newuser) => {
    handleAuthStateChange(newuser)
  })
}

/**
 * Handles authentication state changes
 */
async function handleAuthStateChange(newuser) {
  const generalStore = useGeneralStore()

  if (newuser) {
    generalStore.loggedInUser = newuser

    while (!window.gtag) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    window.gtag('set', { user_id: auth.currentUser.uid })
  } else {
    generalStore.loggedInUser = null
  }

  getSubscriptionStatus()
}

/**
 * Updates username for the logged-in user
 */
window.setUsername = function (username) {
  if (auth.currentUser) {
    username = username.trim()
    if (!username) {
      showNotification('bad', 'Please provide a valid username', 'veryShort')
      return
    }

    updateProfile(auth.currentUser, { displayName: username })
      .then(() => {
        console.log('Username updated successfully!')
        showNotification('good', `Username set to "${username}"`, 'veryShort')
        window.username = username
      })
      .catch((error) => {
        console.error('Error updating username:', error)
      })
  } else {
    console.warn('No user is signed in.')
  }
}

/**
 * Gets the logged-in user with updated details
 */
export async function getLoggedInUser() {
  if (auth.currentUser) {
    await auth.currentUser.reload()
    return auth.currentUser
  } else {
    showNotification('neutral', 'Please login first')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await openLoginOrReg()
    return null
  }
}

/**
 * Gets the username of the logged-in user
 */
export async function getUsername() {
  let currentUser = await getLoggedInUser()
  if (!currentUser) return null

  let username = currentUser.displayName
  if (!username) {
    await window.getUserInput(
      'Choose a username<br>(will be shown on your comments)',
      setUsername
    )
  }
}

/**
 * Handles password reset request
 */
window.forgotPassword = async function () {
  let email = document.getElementById('userChoiceInputField').value

  if (!email || !email.includes('@')) {
    showNotification('bad', 'Please enter a valid email address')
    return
  }

  sendPasswordResetEmail(auth, email)
    .then(() => {
      showNotification('good', 'Password reset email sent successfully.')
    })
    .catch((error) => {
      console.error('Error resetting password:', error)

      if (error.code === 'auth/user-not-found') {
        showNotification('bad', 'No user found with this email.')
      } else if (error.code === 'auth/invalid-email') {
        showNotification('bad', 'Invalid email. Please try again.')
      } else {
        showNotification('bad', `Failed to send reset email: ${error.message}`)
      }
    })
}
