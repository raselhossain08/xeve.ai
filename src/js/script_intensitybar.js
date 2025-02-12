// Assuming you have a function to set intensity
function setIntensity(intensity) {
    const BoxAroundIntensityBar = document.getElementById('BoxAroundIntensityBar');
    const percentage = Math.min((intensity / 4) * 100, 100);
    const height = (percentage / 100) * 150; // 150px is the max height
    BoxAroundIntensityBar.style.height = `${height}px`;
    //console.log(`height: ${height}`);
    /* previous approach with a real bar:
    const bar = document.getElementById('bar');
    bar.style.height = `${height}px`;
    if(percentage > 0.05){
        bar.style.borderRadius = `10px 10px 0 0`;
        }
    /*

    // Change text color to red if intensity is at maximum
    /*
    const intensityText = document.getElementById('intensityText');
    if (intensity >= 4) {
        intensityText.style.color = 'red';
    } else {
        intensityText.style.color = 'white';
    }*/
}


function raiseIntensityBarOverTime() {
    let intensity = 0;
    const interval = setInterval(() => {
        intensity += 0.2;
        setIntensity(intensity);
        //console.log(`Intensity: ${intensity}`)
        if (intensity === 4) {
            clearInterval(interval);
        }
    }, 40000);
}