<script setup>
import SloganBar from '/src/components/SloganBar.vue';
import Navbar from '/src/components/Navbar.vue';
import Footer from '/src/components/Footer.vue';
</script>

<template>
  <div>
    <Navbar />
    <SloganBar />
    <div class="landingpage">
      <slot />
    </div>
    <Footer />
  </div>
</template>

<style> /* not scoped to make effect the landingpages! */
.landingpage {
    margin: 0 auto 50px auto;
    width: 80%;
    max-width: 800px;
    font-family: Arial, sans-serif;
    font-family: -apple-system, BlinkMacSystemFont, segoe ui, Roboto, Oxygen, Ubuntu, Cantarell, open sans, helvetica neue, sans-serif;
    font-size: 17px;
    line-height: 1.5;
    word-break: break-word;
}

h1 {
    line-height: 1.4em;

}

h2 {
    font-size: 1.5em;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
}

@media (max-width: 700px) {
    .landingpage {
        width: 90%;
    }
}
.img_portrait {
    border-radius: 5px;
    width: 200px;
    padding: 0 5px;
}
@media (max-width: 700px) {
    .img_portrait {
        width: 160px;
        max-width: 40%;
    }
}
.img_landscape {
    border-radius: 5px;
    width: 600px;
    max-width: 50%;
    padding: 0 5px;
}
@media (max-width: 600px) {
    .img_landscape {
        width: 100%;
        max-width: 100%;
    }
}
.left {
    float: left;
}

.right {
    float: right;
}
ul, ol {
  list-style-position: inside; /* needed because otherwise the bullet points overlap the images which are floating left */
  }
  


  
</style>
