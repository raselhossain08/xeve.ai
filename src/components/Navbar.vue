

<template>
    <div id="menuBar">
        <div id="usermenuMainButton" v-if="routeIsHome">
            <div id="menuButtonDiv">
                <i id="menuButton" class="fas fa-bars" @click="toggleMenu"></i>
            </div>
        </div>
        <a href="/" style="margin-right: 20px; text-decoration: none;">
            <p class="logo" id="logo" style="margin-bottom: 8px; margin-left: 10px;"><span
                    class="logo_a_bit_smaller">x</span><span class="logo_markup">eve</span><span
                    class="logo_smaller">.ai</span></p>
        </a>
        <div id="searchBar" class="searchBar">
            <form id="searchForm" @submit.prevent="onSearchButtonClicked()">
                <input type="text" id="searchField" placeholder="Search..." aria-label="Search input" />
                <button type="submit" id="searchButton" aria-label="Submit search">
                    <i class="fas fa-arrow-right"></i>
                </button>
            </form>
        </div>

        <div class="headerRightDiv">
            <img id="darkmodeToggle" class="darkmodeToggle" src="/darkmode_toggle.svg" alt="Toggle dark mode" v-if="!generalStore.darkModeActive" @click="toggleDarkMode" />
            <img id="darkmodeToggle" class="darkmodeToggle" src="/darkmode_toggle_dark_mode.svg" alt="Toggle dark mode" v-if="generalStore.darkModeActive" @click="toggleDarkMode" />
            <button id="becomeModelButton" class="roundButton tr" @click="openModelPopup" style="display:none">Become a model</button>
            <button id="loginButton" class="roundButton tr" v-if="!userIsLoggedIn" @click="openLoginPopup">Login / Register</button>
            <button id="logoutButton" class="roundButton tr" v-if="userIsLoggedIn" @click="logout">Logout</button>
            <div id="userIcon" v-if="userIsLoggedIn" @click="toggleUserMenu">
                <div class="userLetterCircle" v-if="userIsLoggedIn" aria-label="User icon">{{ generalStore.loggedInUser.email[0].toUpperCase() }}</div>
                <div class="nouser userLetterCircle" v-if="!userIsLoggedIn" aria-label="User icon placeholder">?</div>
            </div>
            <div class="popup" id="popupUserMenu" style="display: none;" @click="closePopupUserMenu">
                <div id="userMenu">
                    <button id="purchaseButton" class="userMenuButton tr" style="display:unset" @click="onPurchaseButtonPressed()" aria-label="Support this AI">
                        Support this AI
                    </button>
                    <button id="myAiButton" class="userMenuButton tr" @click="handleAi" aria-label="View My AIs">
                        My AIs
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { useMenuStore } from "@/stores/menuStore";
import { usePopupStore } from "@/stores/popupStore";
import { useGeneralStore } from "@/stores/generalStore";
import { onPurchaseButtonPressed, openLoginOrReg, logout, toggleDarkMode } from "@/js/script_navbar.js";
import { onMounted, computed } from 'vue'; // Import onMounted
import { marketing } from '@/js/script_marketing';

const generalStore = useGeneralStore();

const toggleMenu = () => {
    const menuStore = useMenuStore();
    menuStore.toggleMenu();
};

const openModelPopup = () => {
    const popupStore = usePopupStore();
    popupStore.openPopup('model');
};

const openLoginPopup = () => {
    openLoginOrReg()
};

const handleAi = (event) => {
    setTimeout(() => onMyAIButtonClicked(event), 100);
};

const closePopupUserMenu = () => {
    document.getElementById('popupUserMenu').style.display = "none";
}

const toggleUserMenu = () => {
    if (generalStore.routeName === "Character") {
        document.getElementById('purchaseButton').style.display = "unset";
    } else {
        document.getElementById('purchaseButton').style.display = "none";
    }
    document.getElementById('popupUserMenu').style.display = "block";
};

const userIsLoggedIn = computed(() => {
    if (generalStore.loggedInUser) {
        return true;
    } else {
        return false;
    }
});
const routeIsHome = computed(() => {
    return generalStore.routeName === "Home";
});

const onSearchButtonClicked = async (searchTerm) => {
    if(!searchTerm) {
        searchTerm = document.getElementById("searchField").value;
    }
    if (searchTerm === "") {
        return;
    }
    if(!routeIsHome.value) {
        window.location.href = "/?search=" + searchTerm;
        return;
    }
    //first remove all highlights on filter buttons
    for (const button of document.getElementsByClassName("filterButton")) {
        button.classList.remove("highlighted");
    }
    generalStore.filterList = [];
    marketing("videoGridInnerSearch", "charBoxMain", 30, [], searchTerm, 2);

    document.getElementById("videoGridInnerTitleSearch").innerText = 'Search results for: "' + searchTerm + '"';
    document.getElementById("videoGridInnerTitle").innerText = 'Other AI characters';

    document.getElementById("videoGridInnerTitleSearch").style.display = "block";
    document.getElementById("videoGridInnerSearch").style.display = "flex";
}


onMounted(() => {
    console.log(`generalStore.routeName: ${generalStore.routeName}`);
    //if redirected from char page with search term, search for it
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('search');
    if (searchTerm) {
        document.getElementById("searchField").value = searchTerm;
        onSearchButtonClicked(searchTerm);
    }
});
</script>