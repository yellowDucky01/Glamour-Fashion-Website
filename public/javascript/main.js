const images = [
    "../image/showcase-image-1.jpg",
    "../image/showcase-image-2.png",
    "../image/showcase-image-3.png",
    "../image/showcase-image-4.png",
];

let currentIndex = 0;


const imageShowcase = document.getElementById('showcase-image');
imageShowcase.src = images[0];

const menButton = document.getElementById('btn-male');
const womenButton = document.getElementById('btn-female');

menButton.addEventListener('click', function() {
    currentIndex = (currentIndex + 1) % images.length;

    imageShowcase.src = images[currentIndex];
});


womenButton.addEventListener('click', function() {
    currentIndex = (currentIndex + 1) % images.length;

    imageShowcase.src = images[currentIndex];
});

console.log("main.js loaded successfully!");



// Login/Sign-up modal
const loginButton = getElementById('loginBtn');

window.addEventListener('click', function() {
    
})
















