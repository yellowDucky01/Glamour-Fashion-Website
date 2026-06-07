const images = {
    "image/showcase-image-1.png",
    "image/showcase-image-2.png",
    "image/showcase-image-3.png",
    "image/showcase-image-4.png",
};

let currentIndex = 0;

const imageShowcase = document.getElementById('showcasse-image');
const menButton = document.getElementById('btn-male');
const womenButton = document.getElementById('btn-female');

menButton.AddEventListener('click', function() {
    currentIndex = (currentIndex + 1) % images.length;

    imageShowcase.src = images[currentIndex];
});
