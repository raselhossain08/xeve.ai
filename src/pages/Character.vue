
<template>
    <Navbar />
    <div>
      <div class="firstBlockDiv" id="firstBlockDiv">
        <div style="position: relative;" class="divWithoutStyle">
          <div id="boxAroundVideoContainer" class="boxAroundVideoContainer divWithoutStyle" style="position: relative;">
            <Player />
          </div>
  
          <!-- Badges -->
          <div class="badgeDiv" id="badgeDiv">
            <object
              type="image/svg+xml"
              data="/supporterbadge.svg"
              id="supporterBadge"
              style="display:none"
              class="badge"
              @load="changeBadgeColor"
            ></object>
            <object
              type="image/svg+xml"
              data="/premiumsupporterbadge.svg"
              id="premiumSupporterBadge"
              style="display:none"
              class="badge"
              @load="changeBadgeColor"
            ></object>
          </div>
  
          <p id="leaveFeedback">
            Help us become better. Leave your feedback <a @click="handleContact">here!</a>
          </p>
  
          <div id="secondBox" class="borderBox"></div>
  
          <div id="commentResponse">
            <form id="commentForm" @submit.prevent="sendComment()">
              <input type="text" id="commentResponseField" placeholder="Public comment.." @click="getUsername" />
              <div id="commentSendButtonContainer">
                <button type="submit" class="commentSendButton">➤</button>
              </div>
            </form>
          </div>
        </div>
  
        <div class="boxRightOfVideo" id="boxRightOfVideo"></div>
      </div>
    </div>
    <Footer />
  </template>
  
<script setup>
import { ref, onMounted } from 'vue'
import Navbar from '../components/Navbar.vue'
import Player from '../components/Player.vue'
import Footer from '../components/Footer.vue'
import { useGeneralStore } from "@/stores/generalStore"
import { usePopupStore } from "@/stores/popupStore"
import { getUsername } from "@/js/auth"
import { showNotification } from "@/js/utils"
import { marketing } from "@/js/script_marketing"

// Local state
const isAudioPopupVisible = ref(true)
let commentResponseForm = {}

// Functions
function marketingRightBox() {
  const screenWidth = window.innerWidth
  let no_of_char_boxes = 3
  if (screenWidth < 600) no_of_char_boxes = 2
  marketing("boxRightOfVideo", "charBox", no_of_char_boxes, [], "")
}

function handleContact() {
  const popupStore = usePopupStore()
  popupStore.openPopup('contact')
}

function useSound() {
  console.log("User chose to use sound")
  isAudioPopupVisible.value = false
}

function dontUseSound() {
  console.log("User chose not to use sound")
  isAudioPopupVisible.value = false
}

function changeBadgeColor() {
  const badges = document.querySelectorAll('.badge')
  for (let badge of badges) {
    let svgDoc = badge.contentDocument
    if (svgDoc) {
      let markupColor = getComputedStyle(document.body).getPropertyValue('--markup-color').trim()
      let elements = svgDoc.querySelectorAll('.st0')
      elements.forEach(el => { el.style.fill = markupColor })
    }
  }
}

async function closeAllCommentResponseForms() {
  for (const buttonId in commentResponseForm) {
    document.getElementById(buttonId)?.classList.remove('fa-times', 'positionAboveComment')
    document.getElementById(buttonId)?.classList.add('fa-reply')
    commentResponseForm[buttonId]?.remove()
    delete commentResponseForm[buttonId]
  }
}

async function showCommentResponseForm(buttonId, responseDivId, commentedPost) {
  const username = window.username
  if (!username) {
    getUsername() 
    return
  }
  // Hide if already open
  if (commentResponseForm[buttonId]) {
    closeAllCommentResponseForms()
    return
  } else {
    closeAllCommentResponseForms()
  }
  const btn = document.getElementById(buttonId)
  btn?.classList.remove('fa-reply')
  btn?.classList.add('fa-times')
  
  const responseDiv = document.getElementById(responseDivId)
  const formId = 'commentResponseForm'
  responseDiv.innerHTML += `
    <form id="${formId}" class="commentResponseForm">
      <input type="text" id="commentReponseFormsField" class="commentReponseFormsField" placeholder="Public comment..">
      <button type="submit" class="commentSendButton" style="font-size: 20px;">➤</button>
    </form>
  `
  commentResponseForm[buttonId] = document.getElementById(formId)
  commentResponseForm[buttonId]?.addEventListener("submit", e => {
    e.preventDefault()
    sendComment("commentReponseFormsField", commentedPost)
  })
}

function sendComment(commentFieldId = "commentResponseField", commentedPost = "main_post") {
  const generalStore = useGeneralStore()
  const videoname = generalStore.videoname
  const comment = document.getElementById(commentFieldId)?.value
  if (!comment) return

  const username = window.username
  if (!username) { 
    getUsername()
    return
  }
  let userMail = generalStore.loggedInUser.email
  if (!username) {
    showNotification("bad", "Please provide a username")
    return
  }
  const parts = window.location.hostname.split('.')
  const domainName = parts.slice(-2).join('.')

  if (domainName === "localhost") {
    showNotification('bad', "It's not possible to send a comment when the webpage runs locally", 'short')
    return
  }

  const templateParams = {
    header_text: `New comment from ${username}`,
    body_text: `New comment to add to comments-json.\nUsername: ${username}\nComment: ${comment}\nVideoname: ${videoname}\nCommented on: ${commentedPost}`,
    user_email: userMail,
    domain: domainName
  }

  emailjs.send('EmailJStoGMail', 'template_0o9dvi8', templateParams)
    .then(() => {
      showNotification('good', "Your comment will be published shortly")
      document.getElementById(commentFieldId).value = ""
      closeAllCommentResponseForms()
    }, error => {
      console.log('FAILED...', error)
      showNotification('bad', "Error sending message", 'short')
    })
}

async function loadComments() {
  const generalStore = useGeneralStore()
  const videoname = generalStore.videoname
  const response = await fetch('/comments.json')
  const allComments = await response.json()
  const comments = allComments[videoname]
  
  let innerHTML = ''
  let commenterColor = ""
  const commenterColorsNormal = ["#008b8b", "#004080", "#8b478b", "#8b5e00", "#468b00", "#8b0047", "#47208b", "#8b4747", "#00378b"]
  let commentNumber = 0
  let commenterToColor = {}
  let isFirstComment = true
  let buttonIds = {}

  if (comments && typeof comments === 'object') {
    for (const [commenter, comment, ...sub_comments] of comments) {
      if (commenter in commenterToColor) {
        commenterColor = commenterToColor[commenter]
      } else {
        commenterColor = commenterColorsNormal[commentNumber % 9]
      }
      commenterToColor[commenter] = commenterColor
      let addition = isFirstComment ? ` style="border: none;"` : ''
      isFirstComment = false

      const buttonId = `responseButton${commentNumber}`
      buttonIds[buttonId] = comment
      innerHTML += `
        <div class="comment"${addition}>
          <div class="commenter" style="color: ${commenterColor};">${commenter}:</div>
          <div class="commentText">${comment}</div>
          <i id="${buttonId}" class="fas fa-reply commentReponseButton"></i>
          <div id="${buttonId}_responseFormDiv"></div>
        </div>`
      commentNumber++

      // Sub comments
      for (const [subCommenter, subComment] of sub_comments) {
        if (subCommenter in commenterToColor) {
          commenterColor = commenterToColor[subCommenter]
        } else {
          commenterColor = commenterColorsNormal[commentNumber % 9]
        }
        commenterToColor[subCommenter] = commenterColor

        const subButtonId = `responseButton${commentNumber}`
        buttonIds[subButtonId] = subComment
        innerHTML += `
          <div class="subComment">
            <div class="commenter" style="color: ${commenterColor};">${subCommenter}:</div>
            <div class="commentText">${subComment}</div>
            <i id="${subButtonId}" class="fas fa-reply commentReponseButton"></i>
            <div id="${subButtonId}_responseFormDiv"></div>
          </div>`
        commentNumber++
      }
    }
    document.getElementById("secondBox").innerHTML = innerHTML
    for (const [buttonId, comment] of Object.entries(buttonIds)) {
      document.getElementById(buttonId)?.addEventListener("click", () => {
        showCommentResponseForm(buttonId, `${buttonId}_responseFormDiv`, comment)
      })
    }
  }
}

onMounted(() => {
    //trigger these here and not with @load because a div does not have a load event
    marketingRightBox()
    loadComments()
})
</script>
