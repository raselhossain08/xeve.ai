import { showNotification } from './utils.js' //GoogleAuthProvider, signInWithPopup

<script>UPLOADCARE_PUBLIC_KEY = '9527d3bf9cd4d8282cbd';</script>

const urlParams = new URLSearchParams(window.location.search);
let language = urlParams.get('language')
let imageUploaded = false;

if (language == null) {
    language = 'en'
}

const texts = {
    "en": {
        "bMTitle": "Create yourself as AI Character",
        "bMText": "We're constantly looking for new Models. To create an AI version of yourself, all we need is a 2h video of you according to specific requirements. The AI will be able to do everything you do in the video plus speaking.",
        "bMcallToAction1": "Do you want to create your own AI?",
        "bMcallToAction2": "Send us a quick message and we will send you a mail with a guidance of how to create your AI.",
        "nameLabel": "Name (optional)",
        "emailLabel": "Email",
        "messageLabel": "Message (optional)",
        "confirmationMessage": "Message sent. Thank you!",
        "failureMessage": "Message not sent. Please try again.",
        "imageNotUploaded": "Please upload at least one image",
        "emailNotProvided": "Please provide an email",
        "imageUploadLabel": "Upload pictures of yourself<br>(optional)"
    }
}

// Initialize the Uploadcare widget
const widget = uploadcare.Widget('[role=uploadcare-uploader]');

// Add event listener for upload complete event
widget.onUploadComplete(function (info) {
    console.log('File uploaded:', info);
    // Dispatch a custom event with the upload info
    const event = new CustomEvent('uploadComplete', { detail: info });
    document.dispatchEvent(event);
    imageUploaded = true;
});



    document.getElementById('model-form').addEventListener('submit', function (event) {
        event.preventDefault();
        /* picture is not mandatory anymore
        if (!imageUploaded) { 
            showNotification("bad", texts[language]['imageNotUploaded']);
            return;
        }*/
        //if no email is provided
        if (!document.getElementById('user_email').value) {
            showNotification("bad", texts[language]['emailNotProvided']);
            return;
        }

            const parts = window.location.hostname.split('.');
            const domainName = parts.slice(-2).join('.');
        // these IDs from the previous steps
        var templateParams = {
            header_text: `New model request from ` + document.getElementById('user_name').value,
            body_text: `New model request from ` + document.getElementById('user_name').value + ` with email ` + document.getElementById('user_email').value + `\nThe Uploaded pics are on Uploadcare. \nThe message is: ` + document.getElementById('message').value,
            user_email: document.getElementById('user_email').value,
            domain: domainName
        };
        emailjs.send('EmailJStoGMail', 'template_0o9dvi8', templateParams)
            .then(() => {

                // Show success confirmation message
                showNotification('good', texts[language]['confirmationMessage'], 'short');

                // Optionally, wait a few seconds before closing the popup or resetting the form
                setTimeout(() => {
                    // Close the popup or reset the form
                    document.getElementById("becomeModel").style.display = "none";
                    document.getElementById('model-form').reset();
                }, 500); // Adjust as needed

            }, (error) => {
                console.log('FAILED...', error);

                // Show failure message
                showNotification('bad', texts[language]['failureMessage'], 'short');
            });
    });

document.getElementById('bMTitle').innerHTML = texts[language]['bMTitle']
document.getElementById('bMText').innerHTML = texts[language]['bMText']
// document.getElementById('bMcallToAction1').innerHTML = texts[language]['bMcallToAction1']
document.getElementById('bMcallToAction2').innerHTML = texts[language]['bMcallToAction2']
document.getElementById('nameLabel').innerHTML = `${texts[language]['nameLabel']}`
document.getElementById('emailLabel').innerHTML = `${texts[language]['emailLabel']}`
document.getElementById('messageLabel').innerHTML = `${texts[language]['messageLabel']}`
document.getElementById('imageUploadLabel').innerHTML = `${texts[language]['imageUploadLabel']}`

dataPrivacyButton2.addEventListener('click', function () {
    privacyPolicy.style.display = "block";
})
closePrivacyPolicy.addEventListener('click', function () {
    privacyPolicy.style.display = "none";
})
closeTermsAndCond.addEventListener('click', function () {
    termsAndCond.style.display = "none";
})

document.querySelector('[role=uploadcare-uploader]').addEventListener('change', function (event) {
    console.log('File selected');
    if (fileGroup) {
        uploadcare.loadFileGroup(fileGroup).done(function (fileGroupInfo) {
            console.log(fileGroupInfo);

            // Handle multiple files
            fileGroupInfo.files().forEach(fileInfo => {
                fileInfo.done(file => {
                    imageUploaded = true;

                });
            });

        });

    };

});

