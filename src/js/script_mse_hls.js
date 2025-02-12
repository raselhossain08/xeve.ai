import { logThis, importExternalScript, showNotification } from './utils.js' //GoogleAuthProvider, signInWithPopup
import { useGeneralStore } from "@/stores/generalStore";


//PARAMETRIZATION
const GOOD_RATIO_THRESHOLD = 0.5;  // Good if avgFetch/fragDuration < 0.5
const GOOD_TOTAL_THRESHOLD = 250;   // ms. Put this to something around 250ms BECAUSE I often plan jumps within just 300ms so video fetching should be available within this time!
const BAD_RATIO_THRESHOLD = 0.75;  // Bad if avgFetch/fragDuration > 0.75
const STABILITY_COUNT = 3;         // Need 3 consecutive indications to switch quality
const REMOVE_AMOUNT_MB = 10; // Remove ..MB from buffer when limit is reached
let qualityIndex = 1; // start with this quality


let videoPlayer = null;
let mediaSource = null;
let playlistUrls = [];
let sourceBuffer = null;

export async function setVideoModeAndPlaylist(videoPlayerToSet, masterPlaylistUrlToUse) {
    const generalStore = useGeneralStore();
    videoPlayer = videoPlayerToSet;

    if (generalStore.environment === "locally") {
        videoPlayerToSet.src = masterPlaylistUrlToUse;
        return "mp4";
    }

    if (typeof MediaSource === "undefined") {
        logThis("", "WARNING: MediaSource API is not supported. So custom buffering won't work");
        showNotification("neutral", `Please use Chrome Browser for a stuck-free experience`);

        // Load the official hls.js script from the CDN
        await loadHlsJsFromCDN();

        if (Hls.isSupported()) {
            logThis("", `HLS js player is supported. Loading source: ${masterPlaylistUrlToUse}`);
            const hls = new Hls();
            hls.loadSource(masterPlaylistUrlToUse);
            hls.attachMedia(videoPlayerToSet);

            return new Promise((resolve) => {
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    resolve("hlsjs");
                });

                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {

                        logThis("", `ERROR: HLS error occurred.  Type: ${data.type} Event: ${event} Data: ${JSON.stringify(data)}`);
                    }
                });
            });
        } else {
            logThis("", `ERROR! #1287: HLS is not supported and m3u8 is not supported. Falling back to mp4 (which is a workaround but not good)`);
            //fallback to mp4
            masterPlaylistUrlToUse = masterPlaylistUrlToUse.replace("playlist.m3u8", "play_480p.mp4");
            videoPlayerToSet.src = masterPlaylistUrlToUse;
            return "mp4";
        }
    } else {
        //custom buffering (preferred option)
        return new Promise((resolve, reject) => {
            mediaSource = new MediaSource();
            videoPlayer.src = URL.createObjectURL(mediaSource);

            mediaSource.addEventListener('sourceopen', async () => {
                try {
                    const masterPlaylist = await (await fetch(masterPlaylistUrlToUse)).text();
                    playlistUrls = await parseMasterPlaylist(masterPlaylist, masterPlaylistUrlToUse);

                    sourceBuffer = mediaSource.addSourceBuffer(`video/mp4; codecs="avc1.64001e,mp4a.40.2"`);
                    sourceBuffer.addEventListener('error', (e) => logThis('ERROR! SourceBuffer error:', e));
                    sourceBuffer.addEventListener("updateend", monitorBufferChanges); //ADDED THIS ON 17.1.25
                    resolve("MSE"); // Return true explicitly on success
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
}

async function loadHlsJsFromCDN() {
    const scriptUrl = "https://unpkg.com/hls.js@latest";
    const script = document.createElement("script");
    script.src = scriptUrl;
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
    });

}

let appendLock = Promise.resolve(); // Initial lock, resolved immediately
async function appendData(fmp4Data) {
    // Wait for the lock to resolve and acquire it
    await appendLock;
    // Create a new lock for the current operation
    appendLock = new Promise(async (lockResolve) => {
        try {
            // Wait until the SourceBuffer is ready
            while (!sourceBuffer || sourceBuffer.updating || mediaSource.readyState !== "open") {
                await new Promise(resolve => setTimeout(resolve, 50)); // Minimal wait time
            }
            // Append data when ready
            sourceBuffer.appendBuffer(fmp4Data);
            // Release the lock when append completes
            sourceBuffer.addEventListener("updateend", () => lockResolve(), { once: true });
        } catch (error) {
            // Handle potential errors and release the lock
            if (error.name === "QuotaExceededError") {
                try {
                    logThis("", "ERROR: Buffer limit exceeded. Consider clearing old data from the buffer.");
                    removeRangesFromBuffer();
                    bufferLimitMB = Math.max(bufferLimitMB - 10, 40); // Decrease buffer limit by 10MB because it looks like it's too high but make sure it doesn't go below 40MB
                    logThis("", `New buffer limit: ${bufferLimitMB}MB`);
                    sourceBuffer.appendBuffer(fmp4Data); //try again
                    sourceBuffer.addEventListener("updateend", () => lockResolve(), { once: true });
                } catch (error) {
                    logThis("", "ERROR: Removing from buffer also didn't work:", error);
                    lockResolve(); // Ensure lock is always released
                }
            } else {
                logThis("", "ERROR: during append operation:", error);
            }
            lockResolve(); // Ensure lock is always released
        }
    });
    // Wait for the current operation to complete before proceeding
    await appendLock;
}



const fetchDurations = [];
const MAX_FETCH_RECORDS = 15;

// Hysteresis counters for quality adaptation
let goodFetchCount = 0;
let badFetchCount = 0;

// Cache parsed fragments for each quality
const fragmentsCache = new Map();
// Track appended segments: {start:ms, end:ms, quality:index}
let appendedRanges = [];
let isFirstFragmentFetch = true;
let currentlyGettingFetched = new Map();
let maxQuality;
const possibleMismatchTime = 2000;

export async function bufferRange(from, to, urgency_ms, abortSignal) {
    const generalStore = useGeneralStore();
    const randomId = Math.floor(Math.random() * 1000000);
    currentlyGettingFetched.set(randomId, { from, to });
    try {
        const viewportWidth = document.documentElement.clientWidth; //fetch this newly every time because the user may have e.g. tilted the phone to landscape mode
        maxQuality = viewportWidth < 1000 ? 2 : 4; // Currently I have 3 quality levels in bunny so setting this to 2 decreases quality. Setting to 3 or 4 would be the same currently. Quality 2 in bunny is currently "480p (ED 842 x 480)" so until a width of 1000px this quality should be fine
        logThis("", `bufferRange function called with from=${from}, to=${to}, urgency_ms=${urgency_ms} viewportWidth=${viewportWidth} maxQuality=${maxQuality}`);

        if (generalStore.environment == "locally") {
            return;
        }
        const startTimeFunction = Date.now();
        if (abortSignal.aborted) {
            console.log("bufferRange aborted.");
            return;
        }

        from -= possibleMismatchTime; //this seems to be needed because the timestamps of the fragments are not exactly the same after attaching them to the sourceBuffer. The mismatch is normally 1.4-1.5s
        to += possibleMismatchTime;

        // Determine initial quality adjustments based on urgency_ms
        let avgFetch = getAverageFetchDuration();
        if (avgFetch === 0) {
            avgFetch = 200; // Set to a estimated value to make sure the logic below works
        }

        let fragmentsToFetchAtAdjustedQuality = 0;
        let adjustedQualityIndex = qualityIndex;

        if (urgency_ms < avgFetch * 0.6) {
            // For first 2 fragments, use lowest quality
            fragmentsToFetchAtAdjustedQuality = 2;
            adjustedQualityIndex = 0;
            //do not log this here because often this is triggered but the needed ranges are empty then. So I log below. console.log(`#1236 Adjusted quality to improve speed: ${adjustedQualityIndex}`);
        } else if (urgency_ms < avgFetch * 0.8) {
            // First 2 fragments at 2 levels lower
            fragmentsToFetchAtAdjustedQuality = 2;
            adjustedQualityIndex = Math.max(0, qualityIndex - 2);
            //do not log this here because often this is triggered but the needed ranges are empty then. So I log below. console.log(`#567 Adjusted quality to improve speed: ${adjustedQualityIndex}`);
        } else if (urgency_ms < avgFetch * 1.5) {
            // First 2 fragments at one level lower
            fragmentsToFetchAtAdjustedQuality = 2;
            adjustedQualityIndex = Math.max(0, qualityIndex - 1);
            //do not log this here because often this is triggered but the needed ranges are empty then. So I log below. console.log(`#567 Adjusted quality to improve speed: ${adjustedQualityIndex}`);
        }

        let currentTime = from;
        let qualityChangedFlag = false;

        while (currentTime < to) {
            if (abortSignal.aborted) {
                console.log("bufferRange aborted during execution.");
                return;
            }
            // Before fetching new fragments, ensure we have fragment data for the current quality
            await ensureFragmentsForQuality(adjustedQualityIndex);

            const neededRanges = getNeededRanges(currentTime, to, adjustedQualityIndex);
            if (neededRanges.length === 0) {
                // All needed ranges are already buffered at this quality or better
                logThis("", `All needed ranges are already buffered at quality > ${adjustedQualityIndex}: ${currentTime} - ${to}`);
                break;
            }

            for (const range of neededRanges) {
                currentTime = Math.max(currentTime, range.start);
                while (currentTime < range.end) {

                    if (abortSignal.aborted) {
                        console.log("bufferRange aborted during execution.");
                        return;
                    }

                    const fragments = fragmentsCache.get(adjustedQualityIndex);

                    const selectedFragments = fragments.filter(
                        frag => currentTime <= frag.startTimeMs + frag.durationMs && frag.startTimeMs <= range.end
                    );

                    if (selectedFragments.length === 0) {
                        // No fragments found for this part of the range
                        break;
                    }

                    // Fetch these fragments
                    for (const fragment of selectedFragments) {
                        if (abortSignal.aborted) {
                            console.log("bufferRange aborted during execution.");
                            return;
                        }
                        if (adjustedQualityIndex !== qualityIndex) {
                            console.log(`#437843: Fetching a fragment with adjusted quality to improve speed: ${adjustedQualityIndex}. qualityIndex=${qualityIndex} urgency_ms=${urgency_ms} fragment.startTimeMs: ${fragment.startTimeMs}`);
                        }
                        let elapsedTime = Date.now() - startTimeFunction;
                        let bufferedTime = currentTime - from;
                        while (bufferedTime > elapsedTime + 25000) { //means: the function should always have a buffer of 25 seconds DO NOT set this value too low because this is not precise also because of the line from = from - possibleMismatchTime; at the beginning of the function
                            await new Promise(resolve => setTimeout(resolve, 500));
                            elapsedTime = Date.now() - startTimeFunction;
                        }
                        const startFetch = performance.now();
                        const tsData = await (await fetch(fragment.url)).arrayBuffer();
                        const fmp4Data = await transmuxTSData(tsData);// Transmux TS -> fMP4
                        const fetchDuration = performance.now() - startFetch;
                        updateFetchDurations(fetchDuration);
                        await appendData(fmp4Data);

                        currentTime = fragment.startTimeMs + fragment.durationMs;

                        const avgFetchNow = getAverageFetchDuration();
                        const fetchRatio = avgFetchNow / fragment.durationMs;

                        recordAppendedRange(fragment.startTimeMs, fragment.startTimeMs + fragment.durationMs, adjustedQualityIndex, fmp4Data.byteLength);

                        // Handle urgency_ms adjustments for first 2 fragments
                        if (fragmentsToFetchAtAdjustedQuality > 0) {
                            fragmentsToFetchAtAdjustedQuality--;
                            if (fragmentsToFetchAtAdjustedQuality === 0) {
                                // Revert to default quality 
                                adjustedQualityIndex = qualityIndex;
                                await ensureFragmentsForQuality(adjustedQualityIndex);
                                qualityChangedFlag = true;
                                currentTime = from; // Reset this to make the parts get fetched AGAIN in high quality (if this is done before these fragments are played, the quality will be high)
                            }
                        } else {
                            // Normal adaptive logic
                            if (fetchRatio < GOOD_RATIO_THRESHOLD && avgFetchNow < GOOD_TOTAL_THRESHOLD) {
                                goodFetchCount++;
                                badFetchCount = 0;
                            } else if (fetchRatio > BAD_RATIO_THRESHOLD) {
                                badFetchCount++;
                                goodFetchCount = 0;
                            } else {
                                // Neutral area
                                goodFetchCount = 0;
                                badFetchCount = 0;
                            }

                            // Check for quality switch
                            let stabilityCount = STABILITY_COUNT;
                            if (isFirstFragmentFetch) {
                                stabilityCount = 1; // react directly on first fragment fetch to make the quality switch faster
                                isFirstFragmentFetch = false;
                            }
                            if (goodFetchCount >= stabilityCount && qualityIndex < playlistUrls.length - 1 && qualityIndex < maxQuality) {
                                // Increase quality
                                qualityIndex++;
                                if (qualityIndex < playlistUrls.length - 1 && qualityIndex < maxQuality && fetchRatio < GOOD_RATIO_THRESHOLD * 0.8 && avgFetchNow < GOOD_TOTAL_THRESHOLD * 0.8) {
                                    //Directly increase even higher (this is mainly for when the stream starts on a device with very good network)
                                    qualityIndex++;
                                }
                                console.log(`Quality increased to ${qualityIndex}`);
                                resetCounters();
                                qualityChangedFlag = true;
                            } else if (badFetchCount >= stabilityCount && qualityIndex > 0) {
                                // Decrease quality
                                qualityIndex--;
                                console.log(`Quality decreased to ${qualityIndex}`);
                                resetCounters();
                                qualityChangedFlag = true;
                            }
                        }
                        if (qualityChangedFlag) {
                            // Quality changed: break out of fragment loop and range loop to re-check with new quality
                            break;
                        }
                    }
                    if (qualityChangedFlag) {
                        // Break out of the while(range) loop
                        break;
                    }
                }
                if (qualityChangedFlag) {
                    // Break out of the for(range) loop
                    break;
                }
            }

            if (qualityChangedFlag) {
                // Quality changed: continue mainLoop to re-check neededRanges with new qualityIndex
                qualityChangedFlag = false; // Reset for next iteration
                adjustedQualityIndex = qualityIndex;
            } else {
                // If we reach here, no quality changes were made and all neededRanges processed
                break;
            }
        }
    } finally {
        abortSignal.abort();
        currentlyGettingFetched.delete(randomId);
    }
}

function recordAppendedRange(start, end, qIndex, byteLength) {
    appendedRanges.push({ start, end, qIndex, byteLength });
    mergeAppendedRanges();
}

function getBufferLimitMB() {
    const userAgent = navigator.userAgent;
    if (/Chrome/.test(userAgent) && /Android/.test(userAgent)) {
        return 90; // Chrome for Android
    } else if (/Chrome/.test(userAgent)) {
        return 140; // Chrome 
    } else if (/Safari/.test(userAgent) && /iPhone|iPad|iPod/.test(userAgent)) {
        return 90; // Safari on iOS
    } else if (/Safari/.test(userAgent)) {
        return 190; // Safari
    } else if (/Firefox/.test(userAgent) && /Android/.test(userAgent)) {
        return 90; // Firefox for Android
    } else {
        return 90; // Default to lowest common denominator
    }
}

let bufferLimitMB = getBufferLimitMB();


function mergeAppendedRanges() {
    appendedRanges.sort((a, b) => a.start - b.start);
    const merged = [];
    let current = appendedRanges[0];
    let estimatedBufferSizeMB = 0;
    estimatedBufferSizeMB += current.byteLength / 1024 / 1024;
    for (let i = 1; i < appendedRanges.length; i++) {
        const next = appendedRanges[i];
        if (next && current && next.start <= current.end && next.qIndex === current.qIndex) {
            current.end = Math.max(current.end, next.end);
        } else {
            merged.push(current);
            estimatedBufferSizeMB += next.byteLength / 1024 / 1024;
            current = next;
        }
    }
    if (current) merged.push(current);
    appendedRanges.length = 0;
    appendedRanges.push(...merged);
    //logThis("", `estimatedBufferSizeMB: ${estimatedBufferSizeMB.toFixed(2)}MB`);
    if (estimatedBufferSizeMB > bufferLimitMB) {
        removeRangesFromBuffer();
    }
}

let lastBufferedRanges = []; // Initialize to track previous buffered ranges

function monitorBufferChanges() {
    if (!videoPlayer || !videoPlayer.buffered) return;

    const currentBufferedRanges = [];
    for (let i = 0; i < videoPlayer.buffered.length; i++) {
        currentBufferedRanges.push({
            start: videoPlayer.buffered.start(i),
            end: videoPlayer.buffered.end(i),
        });
    }

    if (lastBufferedRanges.length > 0) {
        for (const lastRange of lastBufferedRanges) {
            const removed = !currentBufferedRanges.some(
                range => range.start <= lastRange.end && range.end >= lastRange.start
            );

            if (removed) {
                logThis("", `WARNING: A buffer segment was removed by the browser. Handling this situation. ${JSON.stringify(lastRange)}`);

                // Remove corresponding range from appendedRanges with ±2000ms tolerance
                const tolerance = 2000; // 2 seconds in ms
                const adjustedStart = Math.max(0, lastRange.start - tolerance);
                const adjustedEnd = Math.min(videoPlayer.duration * 1000, lastRange.end + tolerance);

                appendedRanges = appendedRanges.filter(range =>
                    range.end <= adjustedStart || range.start >= adjustedEnd
                );

                logThis(
                    "",
                    `Removed from appendedRanges with tolerance ±${tolerance}ms: { start: ${adjustedStart}, end: ${adjustedEnd} }`
                );
            }
        }
    }

    lastBufferedRanges = currentBufferedRanges;
}


function removeRangesFromBuffer() {
    let rangesNotToRemove = []
    for (const videosnippet of [window.currentVideo, ...window.nextJumps]) {
        rangesNotToRemove.push({ start: videosnippet.startTime, end: videosnippet.nextonlyWhenCalledPoint });
    }
    const rangesToRemovePotentially = appendedRanges.filter(r => !rangesNotToRemove.some(rntr => r.start <= rntr.end && r.end >= rntr.start));
    const rangesToRemove = rangesToRemovePotentially.filter(r => r.qIndex < qualityIndex && !rangesNotToRemove.some(rntr => r.start >= rntr.start && r.end <= rntr.end));
    let removedBytes = 0;
    for (const r of rangesToRemove) {
        sourceBuffer.remove(r.start, r.end);
        removedBytes += r.byteLength;
    }
    if (removedBytes / 1024 / 1024 > REMOVE_AMOUNT_MB) {
        logThis("", `Removed ${removedBytes / 1024 / 1024}MB from buffer`);
        return;
    }
    // If we didn't remove enough, we will now also remove the first ranges from same quality index
    rangesToRemovePotentially.sort((a, b) => a.start - b.start); //sort by start time to make sure the first ranges are removed because they are probably in a early scene and the player is probably already in a following scene (Info: I had the impression that the real used buffer even after playing longer in one scene is still only 20MB or so)
    let i = 0;
    while (removedBytes / 1024 / 1024 < REMOVE_AMOUNT_MB && i < rangesToRemovePotentially.length) {
        const r = rangesToRemovePotentially[i];
        if (r.qIndex === qualityIndex) {
            sourceBuffer.remove(r.start, r.end);
            removedBytes += r.byteLength;
        }
        i++;
    }
    logThis("", `Removed ${removedBytes / 1024 / 1024}MB from buffer`);

}

function getNeededRanges(from, to, qIndex) {
    // Filter for overlapping and relevant quality ranges
    const coveringRanges = appendedRanges.filter(range => {
        return range.end > from && range.start < to && range.qIndex >= qIndex;
    });
    // Start with the entire range and subtract buffered parts
    let needed = [{ start: from, end: to }];
    coveringRanges.sort((a, b) => a.start - b.start);

    for (const cr of coveringRanges) {
        needed = needed.flatMap(n => subtractRange(n, { start: cr.start, end: cr.end }));
    }
    // Remove invalid or zero-length ranges
    needed = needed.filter(range => range.end > range.start);

    return needed;
}

function subtractRange(main, sub) {
    if (sub.end <= main.start || sub.start >= main.end) {
        return [main];
    }

    const results = [];
    if (sub.start > main.start) {
        results.push({ start: main.start, end: Math.min(main.end, sub.start) });
    }
    if (sub.end < main.end) {
        results.push({ start: Math.max(main.start, sub.end), end: main.end });
    }

    return results.filter(r => r.end > r.start);
}

async function ensureFragmentsForQuality(qIndex) {
    if (!fragmentsCache.has(qIndex)) {
        if (playlistUrls.length === 0) {
            logThis("", "ERROR: No playlist URLs found");
            return;
        }
        const playlistText = await (await fetch(playlistUrls[qIndex])).text();
        const fragments = parseMediaPlaylist(playlistText, playlistUrls[qIndex]);
        fragmentsCache.set(qIndex, fragments);
    }
}

function updateFetchDurations(duration) {
    fetchDurations.push(duration);
    if (fetchDurations.length > MAX_FETCH_RECORDS) {
        fetchDurations.shift();
    }
}

function getAverageFetchDuration() {
    if (fetchDurations.length === 0) return 0;
    return fetchDurations.reduce((sum, d) => sum + d, 0) / fetchDurations.length;
}

function resetCounters() {
    goodFetchCount = 0;
    badFetchCount = 0;
}
async function parseMasterPlaylist(masterPlaylistText, masterPlaylistUrl) {
    const lines = masterPlaylistText.split('\n');
    const playlistEntries = [];
    let currentBandwidth = Infinity;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('#EXT-X-STREAM-INF')) {
            // Extract the bandwidth attribute from the EXT-X-STREAM-INF tag
            const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
            if (bandwidthMatch) {
                currentBandwidth = parseInt(bandwidthMatch[1], 10);
            }
        } else if (line && !line.startsWith('#') && line.endsWith('.m3u8')) {
            // Add the URL and its bandwidth to the entries list
            const fullUrl = new URL(line, masterPlaylistUrl).toString();
            playlistEntries.push({ url: fullUrl, bandwidth: currentBandwidth });
            currentBandwidth = Infinity; // Reset for next playlist
        }
    }

    // Sort the playlist entries by bandwidth (lowest quality first)
    playlistEntries.sort((a, b) => a.bandwidth - b.bandwidth);

    // Extract only the URLs in sorted order
    const sortedPlaylistUrls = playlistEntries.map(entry => entry.url);

    return sortedPlaylistUrls;
}


function parseMediaPlaylist(playlistText, playlistUrl) {
    const lines = playlistText.split('\n');
    const fragments = [];
    let currentTimeMs = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('#EXTINF:')) {
            const durationStr = line.split(':')[1];
            if (!durationStr) continue;
            const duration = parseFloat(durationStr) * 1000;
            const nextLine = lines[i + 1];
            if (!nextLine) continue;

            const url = new URL(nextLine, playlistUrl).toString();
            fragments.push({
                url,
                startTimeMs: currentTimeMs,
                durationMs: duration
            });
            currentTimeMs += duration;
        }
    }

    return fragments;
}


let fmp4Segments = [];
let transmuxer = null;

async function setUpTransmuxer() {

    await importExternalScript("https://unpkg.com/mux.js/dist/mux.min.js");
    //FOR TRANSMUXING because fragments are in .ts format
    transmuxer = new muxjs.mp4.Transmuxer({ keepOriginalTimestamps: true });

    // Listen for data events to get fMP4 boxes
    transmuxer.on('data', (segment) => {
        // segment contains fMP4 boxes: initSegment (ftyp+moov) and segment data (moof+mdat)
        if (segment.initSegment) {
            fmp4Segments.push(segment.initSegment);
        }
        fmp4Segments.push(segment.data);
    });
}
let transmuxerLock = null; // Shared lock variable

async function transmuxTSData(tsData) {

    // Wait for any ongoing transmux operation to complete
    while (transmuxerLock) {
        await transmuxerLock;
    }

    // Create a new lock for the current operation
    transmuxerLock = (async () => {

        if (!transmuxer) {
            await setUpTransmuxer();
        }
        fmp4Segments = [];
        transmuxer.reset();

        // Create a promise to wait for 'done' to complete
        const transmuxPromise = new Promise((resolve) => {
            transmuxer.on('done', resolve); // Add a 'done' listener
        });

        transmuxer.push(new Uint8Array(tsData));
        transmuxer.flush();  //ensures that all events of the transmuxer are processed

        // Wait for the 'done' event
        await transmuxPromise;

        // Concatenate all segment parts
        let totalLength = fmp4Segments.reduce((acc, cur) => acc + cur.byteLength, 0);
        let combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const seg of fmp4Segments) {
            combined.set(new Uint8Array(seg), offset);
            offset += seg.byteLength;
        }

        return combined.buffer;
    })();

    try {
        return await transmuxerLock;
    } finally {
        // Clear the lock after the operation
        transmuxerLock = null;
    }
}



//showBufferedRanges()
async function showBufferedRanges() {
    const videoPlayer1 = document.getElementById("videoPlayer1");
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        let bufferedRangesText;
        [, bufferedRangesText] = await getBufferedRanges();
        let currentTime = videoPlayer1.currentTime;
        logThis("", `Current time: ${currentTime} Buffered ranges: ${JSON.stringify(bufferedRangesText)}. Currently getting fetched: ${JSON.stringify(currentlyGettingFetched)}, Appended ranges: ${JSON.stringify(appendedRanges)}`);
    }
}

async function getBufferedRanges() {
    let bufferedRanges = [];
    let bufferedRangesText = [];
    if (!videoPlayer?.buffered) {
        return bufferedRanges, bufferedRangesText;
    }
    for (let i = 0; i < videoPlayer.buffered.length; i++) {
        bufferedRanges.push({ start: videoPlayer.buffered.start(i), end: videoPlayer.buffered.end(i) });
        bufferedRangesText.push(`${Math.round(videoPlayer.buffered.start(i) * 100) / 100} - ${Math.round(videoPlayer.buffered.end(i) * 100) / 100}`);
    }
    return [bufferedRanges, bufferedRangesText];
}

export async function checkIfTimestampInBufferedRanges(timestampMs) {
    const timestampSec = timestampMs / 1000
    let bufferedRanges
    [bufferedRanges,] = await getBufferedRanges();
    for (let i = 0; i < bufferedRanges.length; i++) {
        if (bufferedRanges[i].start <= timestampSec && timestampSec < bufferedRanges[i].end) {
            return [true, bufferedRanges[i].end - timestampSec, bufferedRanges];
        }
    }
    return [false, 0, bufferedRanges];
}
let stuckCounter = [];
const logErrorIfStuckForTimes = 4
const logErrorIfStuckForSeconds = 20
export async function checkWhyStuck(currentTimestampActivePlayerMillis) {
    const dateNow = Date.now();
    stuckCounter.push(dateNow); //the stuckcounter ensures that error logs get only logged if it is stuck for more than
    stuckCounter = stuckCounter.filter((timestamp) => dateNow - timestamp < logErrorIfStuckForSeconds * 1000);

    // checken ob stuck obwohl range gepuffert
    let isTimestampInBufferedRanges;
    let bufferedRanges;
    [isTimestampInBufferedRanges, , bufferedRanges] = await checkIfTimestampInBufferedRanges(currentTimestampActivePlayerMillis);
    if (isTimestampInBufferedRanges) {
        if (stuckCounter.length >= logErrorIfStuckForTimes) {
            //This is NOT an error! Because it looks like this can happen e.g. when the player is in background! 
            logThis("", `#372146: Stuck although this timestamp is already buffered. Current time: ${currentTimestampActivePlayerMillis}, bufferedRanges: ${JSON.stringify(bufferedRanges)}, appendedRanges: ${JSON.stringify(appendedRanges)}`);
            stuckCounter = [];
        }
        return;
    }

    // looks like the current timestamp is not buffered yet. Check if it is currently being fetched
    for (const [key, value] of currentlyGettingFetched.entries()) {
        if (value.from <= currentTimestampActivePlayerMillis && currentTimestampActivePlayerMillis < value.to) {
            logThis("", `INFO: #48892: Stuck because current timestamp is currently being fetched. Current time: ${currentTimestampActivePlayerMillis} currentlyGettingFetched: ${JSON.stringify([...currentlyGettingFetched])}`);
            return;
        }
    }

    //looks like is stuck but also not getting buffered
    const abortController = new AbortController();
    logThis("", `#3746: Stuck because this timestamp is not already buffered but it is also not being fetched currently! This should not happen. Current time: ${currentTimestampActivePlayerMillis} Currently getting fetched: ${JSON.stringify(currentlyGettingFetched)} bufferedRanges: ${JSON.stringify(bufferedRanges)}`);
    if (stuckCounter.length >= logErrorIfStuckForTimes) {
        logThis("", `ERROR! #38382: Stuck because this timestamp is not already buffered but it is also not being fetched currently! This should not happen. Current time: ${currentTimestampActivePlayerMillis} Currently getting fetched: ${JSON.stringify(currentlyGettingFetched)} bufferedRanges: ${JSON.stringify(bufferedRanges)}, appendedRanges: ${JSON.stringify(appendedRanges)}`);
        stuckCounter = [];
    }
    bufferRange(currentTimestampActivePlayerMillis, currentTimestampActivePlayerMillis + 20000, 0, abortController, ""); //buffer the range

}