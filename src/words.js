window.addEventListener("load", () => {
    console.log("This function is executed once the page is fully loaded 22");
});

var tgdata;
async function words2() {
    const words = [""]
    const container = document.getElementById('text-container');

    // Split text into words and create spans
    tgdata = await loadTextGrid();
    let ii = 0
    tgdata.forEach(interval => {
        const word = interval["word"]
        const span = document.createElement("span");
        span.textContent = word + " ";
        span.className = "word";
        span.dataset.word = word;
        span.dataset.index = ii;
        console.log('Segment span' + span);
        span.addEventListener("click", spanOnClick);
        container.appendChild(span);
        ii += 1
    });
}
words2()

async function spanOnClick(event) {
    const span = event.currentTarget;
    ii = parseInt(span.dataset.index)

    // v1
    // t0 = tgdata[ii]["start"]
    // t1 = tgdata[ii]["stop"]

    // v2
    i0 = Math.max(0, ii - 1)
    i1 = Math.min(tgdata.length - 1, ii + 1)
    t0 = tgdata[i0]["start"]
    t1 = tgdata[i1]["stop"]

    // span.style.backgroundColor = "yellow";
    span.classList.toggle("highlight");
    // span.style.backgroundColor = ""
    // span.textContent = "New-Text";
    // span.style.fontWeight = "bold";
    span.setAttribute("data-active", "true");
    playSegment(t0, t1);
}
  
// TODO  Web Audio API , fade-in, fade-out
let audioContext;
let audioBuffer = null;
var playbackStartTime;
var segmentStartTime, segmentEndTime;

// Load audio and decode it (only once)
async function loadAudio(url) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  console.log("Audio loaded and decoded");
}

// Play a segment from startTime to endTime
function playSegment(startTime, endTime) {
  if (!audioBuffer) {
    console.error("Audio not loaded yet.");
    return;
  }

  const duration = endTime - startTime;
  if (duration <= 0) {
    console.warn("Invalid segment duration.");
    return;
  }

  // Create a new source each time (they can only be used once)
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  segmentStartTime = startTime
  segmentEndTime = endTime;

  // Start at the given start time and stop after duration
  playbackStartTime = audioContext.currentTime
  source.start(0, startTime, duration);

  // Start monitoring progress
  requestAnimationFrame(trackProgress);
}

function trackProgress() {
  const currentTime = (audioContext.currentTime - playbackStartTime) + segmentStartTime;
// currentTime = 3.0
console.log("BB audioContext.currentTime " + audioContext.currentTime)
// console.log("BB currentTime " + currentTime)

  // Highlight spans based on current time
  document.querySelectorAll("#text-container span").forEach(span => {
    ii = parseInt(span.dataset.index)
    t0 = tgdata[ii]["start"]
    t1 = tgdata[ii]["stop"]

    if (currentTime >= (t0 + 0.050) && currentTime < t1) {
      span.classList.add("highlight");
    } else {
      span.classList.remove("highlight");
    }
  });

  // Keep updating until audio is done
  if (currentTime < segmentEndTime) {
    requestAnimationFrame(trackProgress);
  }
}

(async () => {
    await loadAudio("lenilev-p1a.wav");
    // playSegment(5, 10); // Play from 5s to 10s
  })();

async function loadTextGrid() {
const url = "lenilev-p1a.TextGrid"
// const url = 'https://yourserver.com/path/to/yourfile.TextGrid'; // ✅ Replace with your URL

try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

//   const text = await response.text();
//   console.log("text=" + text)
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder("utf-16be");
    const text = decoder.decode(buffer);

    const tiersToExtract = ['words']; // ✅ Adjust tier names as needed
    const data = parseTextGrid(text, tiersToExtract);
    document.getElementById('output').textContent = JSON.stringify(data, null, 2);
    return data
} catch (err) {
    console.error('Failed to load TextGrid:', err);
    document.getElementById('output').textContent = 'Error loading TextGrid.';
}
}


// Simple TextGrid parser for interval tiers
function parseTextGrid(text, tierNames) {
    const lines = text.split('\n');
    const result = [];
    let inTier = false;
    let tierName = '';
    let currentTier = [];
    let xmin, xmax, textVal;
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
  
      // Check if it's a tier and one of the desired names
      if (line.startsWith('name =')) {
        tierName = line.split('=')[1].trim().replace(/"/g, '');
        inTier = tierNames.includes(tierName);
      }
  
      if (inTier) {
        if (line.startsWith('xmin =')) xmin = parseFloat(line.split('=')[1].trim());
        if (line.startsWith('xmax =')) xmax = parseFloat(line.split('=')[1].trim());
        if (line.startsWith('text =')) {
          textVal = line.split('=')[1].trim().replace(/"/g, '');
          if (textVal) {
            currentTier.push({ word: textVal, start: xmin, stop: xmax });
          }
        }
      }
  
      // End of tier
      if (line.startsWith('item [') && currentTier.length) {
        result.push(...currentTier);
        currentTier = [];
        inTier = false;
      }
    }
    // very last tier
    if (currentTier.length) {
        result.push(...currentTier);
        currentTier = [];
        inTier = false;
    }  
    return result;
  }