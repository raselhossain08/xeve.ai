
import { useGeneralStore } from "../stores/generalStore";




const urlParams = new URLSearchParams(window.location.search);


//const apiCache = new Map();

/*
async function cachedCallAPI(url, endpoint, params, method) {
    //introduced caching because otherwise callAPI is triggered each time the user clicks a filter button
    const key = JSON.stringify({ url, endpoint, params, method });

    if (apiCache.has(key)) {
        return apiCache.get(key);
    }

    const fullresponse = await callAPI(url, endpoint, params, method);
    let [response, responseJson] = fullresponse;
    if (response.status == 200) {
        apiCache.set(key, fullresponse);
    }
    return fullresponse;
}*/

export async function marketing(charContainerName, boxClass, maxChars, filterList = [], searchTerm = "", maxMultiple = 999) {


    const innerHtmlList = await getMarketingHtml(boxClass, maxChars, filterList, searchTerm, maxMultiple);

    if (document.getElementById(charContainerName)) {
        if (innerHtmlList.length > 0) {
            document.getElementById(charContainerName).innerHTML = innerHtmlList.join('');
        }
        else {
            document.getElementById(charContainerName).innerHTML = "<div class='nosearchresult'><i class='fas fa-search' style='font-size: 18px;'></i><p>No characters found for your filter criteria</p></div>";
        }
    }
}

async function getMarketingHtml(boxClass, maxChars, filterList = [], searchTerm = "", maxMultiple = 999) {
    const generalStore = useGeneralStore(); 
    const videoname = generalStore.videoname; 

    if (videoname !== "") maxChars -= 1; //because one char will be added afterwards
    let availableChars = await getMarketingMaterial(maxChars, maxMultiple, true);

    const innerHtmlList = [];

    // Process other videos

    let numberAvatarAndHuman = {};
    for (const charValues of availableChars) {

        let showChar = true;

        //search
        if (searchTerm !== "") {
            //load the local file searchTermMapping.json
            const searchTermMapping = await fetch("/searchTermMapping.json");
            const searchTermMappingJson = await searchTermMapping.json();

            const charValuesAsString = JSON.stringify(charValues);
            if (!charValuesAsString.includes(searchTerm)) {
                // Check if there's a mapped value
                let foundInMapping = false;
                for (const [mapToValue, mapFromValues] of Object.entries(searchTermMappingJson)) {
                    if (mapFromValues.includes(searchTerm)) {
                        if (charValuesAsString.includes(mapToValue)) {
                            foundInMapping = true;
                            break;
                        }
                    }
                }

                // If neither the search term nor the mapping was found, hide the char
                if (!foundInMapping) {
                    showChar = false;
                }
            }
        }

        //filter by filter list
        if (filterList.length > 0) {
            if (filterList.includes("hard") && charValues["marketing_data"]["character"] !== "hard") {
                showChar = false;
            }
            if (filterList.includes("soft") && charValues["marketing_data"]["character"] !== "soft") {
                showChar = false;
            }
            if (filterList.includes("recommended") && charValues["marketing_data"]["recommended"] !== true) {
                showChar = false;
            }
        }
        if (!showChar) continue;
        //show avatar look
        if (filterList.includes("avatar")) {
            innerHtmlList.push(defineCharHtml(charValues, boxClass, true));
        }
        //show human look
        else if (filterList.includes("human")) {
            innerHtmlList.push(defineCharHtml(charValues, boxClass, false));
        }
        else {
            //prepare numberAvatarAndHuman
            if (!Object.keys(numberAvatarAndHuman).includes(charValues["videoname"])) {
                numberAvatarAndHuman[charValues["videoname"]] = [0, 0];
            }

            //randomly choose if I use avatar version or not
            let useAvatar = false;
            if (numberAvatarAndHuman[charValues["videoname"]][0] == numberAvatarAndHuman[charValues["videoname"]][1]) { useAvatar = Math.random() < 0.5; }
            else {
                useAvatar = numberAvatarAndHuman[charValues["videoname"]][0] < numberAvatarAndHuman[charValues["videoname"]][1];
            }

            innerHtmlList.push(defineCharHtml(charValues, boxClass, useAvatar));

            numberAvatarAndHuman[charValues["videoname"]][useAvatar ? 0 : 1]++;
        }
    }

    // Do NOT shuffle here because shuffling is done in getAndShuffleAvailableChars 
    //Shuffle each inner part of noVideos in the list
    /*const partSize = noVideos * 2
    for (let i = 0; i < innerHtmlList.length; i += partSize) {
        let innerHTMLPart = innerHtmlList.slice(i, i + partSize);
        innerHTMLPart.sort(() => Math.random() - 0.5);
        innerHtmlList.splice(i, partSize, ...innerHTMLPart);
    } */

    // Process current video variants
    if (videoname) {
        const isavatar = urlParams.get('isavatar') === "true";
        const allAvailableChars = await getMarketingMaterial(999, 1, false);
        let added = false;
        allAvailableChars.forEach(charValues => {
            if (charValues["videoname"] === videoname && !added) {
                added = true;
                //push to first position
                innerHtmlList.unshift(defineCharHtml(charValues, boxClass, !isavatar));
            }
        });
    }
    return innerHtmlList

}


function cutAwayFirstSentence(text) {
    const firstSentenceEnd = text.indexOf('.') + 1;
    return text.slice(firstSentenceEnd).trim();
}

window.showHoverImage = function (element) {
    element.classList.add("hovered");
}

window.hideHoverImage = function (element) {
    element.classList.remove("hovered");
}

function defineCharHtml(charValues, boxClass, isAvatar = false) {
    //cut away the first sentence of charValues["marketing_data"]["description"]

    let avatarDescription = `I'm the Avatar-Version of ${charValues["charname"]}. ` + cutAwayFirstSentence(charValues["marketing_data"]["description"]);
    let avatarText = isAvatar ? '<span class="avatarText"><i class="fa-solid fa-user-astronaut" style="font-size: smaller;"></i>Avatar</span>' : ""
    //let imageSrc = isAvatar ? charValues["image"].slice(0, -5) + "_av.webp" : charValues["image"]; do not do special images vor avatars because then I need to fetch them additionally which slows them down
    let imageSrc = charValues["image"];
    let imgDiv = ""
    //OLD style: imgDiv = `<img class="charImage" src="${imageSrc}">`
    const imageSrc1 = imageSrc.slice(0, -5) + "_part1" + imageSrc.slice(-5)
    const imageSrc2 = imageSrc.slice(0, -5) + "_part2" + imageSrc.slice(-5)

    return `<div class="${boxClass}" >
        <a style="text-decoration: unset; text-align: center;" href="/${charValues["videoname"]}${isAvatar ? "?isavatar=true" : ""}">
                <div class="charImageDiv" ontouchstart="showHoverImage(this)" ontouchend="hideHoverImage(this)">
                    <div class="hoverImageDiv">
                        <img class="charImage default-image" src="${imageSrc1}">    
                        <img class="charImage hover-image" src="${imageSrc2}">
                    </div>
                    <i class="fa-regular fa-comment chatBubble"></i>
                    ${avatarText}
                    <div class="charName">
                        <p class="charNameText">${charValues["charname"]}${isAvatar ? " Avatar" : ""}</p>
                        <div class="charDescription">
                            ${isAvatar ? avatarDescription : charValues["marketing_data"]["description"]}
                        </div>
                    </div>
                </div>
        </a>
    </div>`
    /* old (floating charInfo):
            bei charImageDiv: onmousemove="showCharInfo(event, this)" onmouseleave="hideCharInfo(this)"
                <div class="charInfo" style="display: none;">
                    ${isAvatar ? avatarDescription : charValues["marketing_data"]["description"]}
                </div> */
}


window.showCharInfo = async function (event, charImageDiv) {
    //get the sub-div of charImageDiv with the class charInfo
    var charInfo = charImageDiv.getElementsByClassName("charInfo")[0];
    var container = event.currentTarget;

    // Get container's bounding box
    var rect = container.getBoundingClientRect();

    // Calculate position within the container
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

    // Adjust position for the size of the info box
    var offsetX = 10; // small offset to avoid overlap with cursor
    var offsetY = 10;

    charInfo.style.left = x + offsetX + "px";
    charInfo.style.top = y + offsetY + "px";
    charInfo.style.display = "block";

}

window.hideCharInfo = async function (charImageDiv) {
    var charInfo = charImageDiv.getElementsByClassName("charInfo")[0];
    charInfo.style.display = "none";
}


export async function getMarketingMaterial(noVideos, maxMultiple, excludeCurrentVideo) {
    const generalStore = useGeneralStore(); 
    const videoname = generalStore.videoname; 
    let availableChars = []
    const availableVideosFile = await fetch("available_videos.json");
    const availableVideos = await availableVideosFile.json();

    //shuffle availableVideos Object
    let availableVideosShuffled = Object.entries(availableVideos).sort(() => Math.random() - 0.5);

    //filter for isAdult = true
    availableVideosShuffled = availableVideosShuffled.filter(([videoname, marketing_data]) => marketing_data.isAdult === true);


    let thumb_appender = "";
    for (let i = 1; i <= maxMultiple; i++) {
        let availableCharsOne = []
        let thumb_number = (i - 1) % 4 + 1; //because there are only 4 thumbnails
        if (thumb_number > 1) {
            thumb_appender = "_" + thumb_number.toString();
        }
        for (const [videoname_, marketing_data] of availableVideosShuffled) {
            if (videoname_ === videoname && excludeCurrentVideo) continue;
            if (availableCharsOne.length + availableChars.length >= noVideos) break;
            //let imageOfVideoTempPath = await getTemporaryPathFromVideoSnippetBucket(req, environment, storage, videosource, videoname_, `${videoname_}.jpg`, res, videosnippetDeployments)
            let thumbnailPath = `generated_files/${videoname_}/${videoname_}_thumb${thumb_appender}.webp`
            //video with first letter as capital
            let charname = videoname_.charAt(0).toUpperCase() + videoname_.slice(1);
            availableCharsOne.push({ "videoname": videoname_, "charname": charname, "image": thumbnailPath, "marketing_data": marketing_data })

        }
        availableChars.push(...availableCharsOne)
        if (availableChars.length >= noVideos) break;
    }
    return availableChars
}
