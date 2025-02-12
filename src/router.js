import { createWebHistory, createRouter } from 'vue-router'
import { defineAsyncComponent } from 'vue';

const Embedding = () => import('./pages/Embedding.vue');
const Home = () => import('./pages/Home.vue');
const Character = () => import('./pages/Character.vue');
const LandingAiGfs = () => import('./pages/landingpages/ai_girlfriends.vue');
const LandingAiGfVideoChat = () => import('./pages/landingpages/ai_girlfriend_video_chat.vue');
const LandingAiSexting = () => import('./pages/landingpages/ai_sexting.vue');


const routes = [
    {   path: '/', 
        component: Home,
        name: 'Home' 
    },
    { 
        path: '/AI_girlfriends', 
        component: LandingAiGfs, 
        name: "LandingAiGfs"
    },
    { 
        path: '/AI_girlfriend_video_chat', 
        component: LandingAiGfVideoChat, 
        name: "LandingAiGfVideoChat"
    },
    { 
        path: '/AI_sexting', 
        component: LandingAiSexting, 
        name: "LandingAiSexting"
    },
    { 
        path: '/embedding/:subpath?', // Optional or dynamic segment
        component: Embedding,
        name: "Embedding",
    },
    { 
        path: '/:slug(.*)',
        component: Character,
        name: "Character"
    },
];//wildcard :slug must be the last route!



const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router