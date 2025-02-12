
<template>
    <Navbar />
    <div id="mainpage">
        <SloganBar />

        <div id="mainpageBigArea">
            <div v-if="isMenuVisible" class="menuLeft" id="menuLeft">
                <button class="menuLeftButton filterButton tr" id="filterall" @click="filterVideoGrid($event.currentTarget)"
                    aria-label="Show all videos">
                    <i class="fas fa-home"></i> Home
                </button>
                <button class="menuLeftButton tr" id="myais" onclick="onMyAIButtonClicked(event)"
                    aria-label="View My AIs">
                    <i class="fas fa-robot"></i> My AIs
                </button>

                <div class="divider"></div>
                <div class="menuLeftTitle tr">FILTERS</div>
                <button class="menuLeftButton filterButton tr" id="filterhuman" @click="filterVideoGrid($event.currentTarget)"
                    aria-label="Filter by human looks">
                    <i class="fas fa-user"></i> Human looks
                </button>
                <button class="menuLeftButton filterButton tr" id="filteravatar" @click="filterVideoGrid($event.currentTarget)"
                    aria-label="Filter by avatar looks">
                    <i class="fas fa-user-astronaut"></i> Avatar looks <span class="labelling tr"
                        style="display: none;">new</span>
                </button>
                <button class="menuLeftButton filterButton tr" id="filterhard" @click="filterVideoGrid($event.currentTarget)"
                    aria-label="Filter by hard AI characters">
                    <i class="fas fa-bolt"></i> Hard AI Chars
                </button>
                <button class="menuLeftButton filterButton tr" id="filtersoft" @click="filterVideoGrid($event.currentTarget)"
                    aria-label="Filter by soft AI characters">
                    <i class="fas fa-smile"></i> Soft AI Chars
                </button>
                <button class="menuLeftButton filterButton tr" id="filterrecommended" @click="filterVideoGrid($event.currentTarget)"
                    aria-label="Show recommended characters">
                    <i class="fas fa-thumbs-up"></i> Recommended
                </button>

                <!--<button class="superBigButton" onclick="onSupportYourAIClicked(this)">Support<br>your AI</button>-->
                <div class="divider"></div>
                <div class="settingsDiv">
                    <span v-if="showUserSettingsButton" class="flag" onclick="onuserSettingsButtonClicked(event)"
                        id="userSettingsButton" aria-label="Open user settings">
                        <i class="fas fa-gear"
                            style="display: inline; margin-right: 8px; color: var(--text-color);"></i>
                    </span>
                    <span class="flag" @click="setLanguage('nl')"
                        aria-label="Switch language to Dutch">🇳🇱</span>
                    <span class="flag" @click="setLanguage('dk')" 
                        aria-label="Switch language to Danish">🇩🇰</span>
                    <span class="flag" @click="setLanguage('en')"
                        aria-label="Switch language to English">🇬🇧</span>

                </div>
            </div>
            <!--<button class="menuLeftCloseButton" id="menuLeftCloseButton" onclick="onmenuLeftCloseButton()">
                <i class="fa-solid fa-chevron-left" style="cursor: pointer;"></i>
            </button>-->
            <div class="videoGrid" id="videoGrid">
                <button class="advertisingBanner" id="advertisingBanner" onclick="onMyAIButtonClicked(event)"
                    aria-label="Support an AI character and get a discount for new customers">
                    <i class="fa-solid fa-lightbulb" style="margin-right: 8px;"></i>
                    <span class="tr" style="font-weight: bold;">Support an AI Character & get a discount for new
                        customers!</span>
                </button>
                <h2 class="videoGridInnerTitle tr" id="videoGridInnerTitleSearch" style="display:none"
                    aria-label="Search results">
                    Search Results
                </h2>

                <div class="videoGridInner" id="videoGridInnerSearch" style="display:none">
                    <div class="pulsating-dot-inline"></div>
                </div>
                <h2 class="videoGridInnerTitle tr" id="videoGridInnerTitle" aria-label="Choose your AI adult model">
                    Choose your AI adult model
                </h2>

                <div class="videoGridInner" id="videoGridInner">
                    <div class="pulsating-dot-inline"></div>
                </div>
            </div>
        </div>
    </div>
    <Footer />
</template>

<script setup>
import { onMounted, computed } from 'vue'; // Import onMounted
import { useMenuStore } from "@/stores/menuStore";
import { useGeneralStore } from "@/stores/generalStore"; // Import generalStore
import SloganBar from '../components/SloganBar.vue';
import Navbar from '../components/Navbar.vue';
import Footer from '../components/Footer.vue';
import { setLanguage } from '@/js/language'; 
import { marketing } from '@/js/script_marketing';

// Access the menu store
const menuStore = useMenuStore();
const generalStore = useGeneralStore();
// Create a computed property for menu visibility
const isMenuVisible = computed(() => menuStore.isMenuVisible);


const filterVideoGrid = (clickedButton) => {
    clickedButton.classList.toggle("highlighted");
    const filter = clickedButton.id.replace("filter", "");
    //first remove all highlights
    for (const button of document.getElementsByClassName("filterButton")) {
        button.classList.remove("highlighted");
    }
    document.getElementById("videoGridInnerTitleSearch").style.display = "none";
    document.getElementById("videoGridInnerSearch").style.display = "none";
    if (filter === "all") {
        document.getElementById("videoGridInnerTitle").innerText = 'Choose your AI adult model';
        generalStore.filterList = [];
        clickedButton.classList.add("highlighted");
        // Remove all search parameters from URL
        let url = new URL(window.location);
        url.search = '';
        window.history.replaceState({}, '', url);

    } else {
        document.getElementById("videoGridInnerTitle").innerText = clickedButton.innerText;
        if (generalStore.filterList.includes(filter)) {
            generalStore.filterList.splice(generalStore.filterList.indexOf(filter), 1); //remove filter
            document.getElementById("videoGridInnerTitle").innerText = 'Choose your AI adult model';
        }
        else {
            /*check alternatingFilterList NOT needed anymore because I anywaa remove all filters before adding the new one
            for (const alternatingFilter of alternatingFilterList) {
                if (generalStore.filterList.includes(alternatingFilter[0])) {
                    generalStore.filterList.splice(generalStore.filterList.indexOf(alternatingFilter[0]), 1); //remove filter
                }
                if (generalStore.filterList.includes(alternatingFilter[1])) {
                    generalStore.filterList.splice(generalStore.filterList.indexOf(alternatingFilter[1]), 1); //remove filter
                    const button = document.getElementById(`filter${alternatingFilter[1]}`);
                    button.classList.remove("highlighted");
                }
            }*/

            generalStore.filterList = [filter]; //replace all filters BECAUSE if multiple filters are set, only very few results and chars are shown. That doesn't look good! 
        }
    }
    let noVideos = 20;
    if (generalStore.filterList.length == 0) {
        noVideos = 30;
    }

    marketing("videoGridInner", "charBoxMain", noVideos, generalStore.filterList, "", 2);

    //add highlights for all set filters
    for (const filter of generalStore.filterList) {
        const button = document.getElementById(`filter${filter}`);
        button.classList.add("highlighted");
    }
}


// Hide the menu on page load if the screen width is less than 600px
onMounted(() => {
    if (window.innerWidth < 600) {
        menuStore.hideMenu();
    }
    //hide advertising banner depending on if current day is odd or even
    const date = new Date();
    if (date.getDate() % 2 + 1 == 0) {
        document.getElementById("advertisingBanner").style.display = "none";
    }
    marketing("videoGridInner", "charBoxMain", 24, [], "", 3);

    //add highlight to all all buttons
    if(document.getElementById("filterall")) {
        document.getElementById("filterall").classList.add("highlighted");
    }


});
const showUserSettingsButton = computed(() => generalStore.loggedInUser !== null);



</script>
