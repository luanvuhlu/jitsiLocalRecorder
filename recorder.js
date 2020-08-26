const status = document.getElementById('status');

let recorders = {};
let recorderStreams = [];

/**
 * Returns a filename based ono the Jitsi room name in the URL and timestamp
 * */
function getFilename(recorderStream) {
    const now = new Date();
    const timestamp = now.toISOString();
    const room = new RegExp(/(^.+)\s\|/).exec(document.title);
    const name = recorderStream['name']
    if (room && room[1] !== "")
        return `${room[1]}_${name}_${timestamp}`;
    else
        return `recording_${name}_${timestamp}`;
}

function mixer(stream1, stream2) {
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();

    if(stream1.getAudioTracks().length > 0)
        ctx.createMediaStreamSource(stream1).connect(dest);

    if(stream2.getAudioTracks().length > 0)
        ctx.createMediaStreamSource(stream2).connect(dest);

    let tracks = dest.stream.getTracks();
    tracks = tracks.concat(stream1.getVideoTracks()).concat(stream2.getVideoTracks());

    return new MediaStream(tracks)

}

/**
 * Start a new recording
 * */
const start = document.getElementById('recordStart');
start.addEventListener('click', async () => {
    const videos = document.querySelectorAll('.videocontainer video:not(#largeVideo)');
    videos.forEach(function (video) {
        const parent = video.parentElement;
        let name = 'Unknow';
        const parent_id = parent.getAttribute('id');
        if (parent_id.startsWith('local')) {
            name = 'me';
            return;
        } else {
            name = parent.querySelector('.displayNameContainer span').innerHTML;
        }
        const audio = video.nextSibling;
        const recorderStream = mixer(video.captureStream(), audio.captureStream());
        const recorderStreamObj = {
            'id': parent_id,
            'name': name,
            'stream': recorderStream,
            'data': []
        };
        recorderStreams.push(recorderStreamObj);
        const recorder = new MediaRecorder(recorderStream, { mimeType: 'video/webm' });

        recorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) {
                recorderStreamObj['data'].push(e.data);
            }
        };
        recorder.onStop = () => {
            recorderStream.getTracks().forEach(track => track.stop());
        };

        recorderStream.addEventListener('inactive', () => {
            console.log('Capture stream inactive');
            stopCapture();
        });

        recorder.start();
        recorders[parent_id] = recorder
    });
    console.log("started recording");
    start.innerText = "Recording";
    start.disabled = true;
    pause.disabled = false;
    stop.disabled = false;
    // play.disabled = true;
    save.disabled = true;
});

/**
 * Stop recording
 * */
const stop = document.getElementById('recordStop');
function stopCapture() {
    console.log("Stopping recording");
    Object.keys(recorders).forEach(function (id) {
        recorders[id].stop()
    })
    start.disabled = false;
    pause.disabled = true;
    stop.disabled = true;
    // play.disabled = false;
    save.disabled = false;

    start.innerText = "Record";
    pause.innerText = "Pause";

}
stop.addEventListener('click', stopCapture);

/**
 * Pause recording
 * */
const pause = document.getElementById('recordPause');
pause.addEventListener('click', () => {
    if (recorder.state === 'paused') {
        Object.keys(recorders).forEach(function (id) {
            recorders[id].resume()
        })
        pause.innerText = "Pause"
    }
    else if (recorder.state === 'recording') {
        Object.keys(recorders).forEach(function (id) {
            recorders[id].pause()
        })
        pause.innerText = "Resume"

    }
    else
        console.error(`recorder in unhandled state: ${recorder.state}`);

    console.log(`recorder ${recorder.state === 'paused' ? "paused" : "recording"}`);

});

/**
 * Play the recording in a popup window
 * */
// let isPlaying = false;
// const play = document.getElementById('recordPlay');
// play.addEventListener('click', () => {
//     alert('Not implement yet!');
    // playback.hidden = !playback.hidden;
    // if (!isPlaying && !playback.hidden) {
    //     playback.src = window.URL.createObjectURL(new Blob(recordingData, { type: 'video/webm' }));
    //     playback.play();
    //     play.innerText = "Hide";
    // }
    // else
    //     play.innerText = "Play";

// });

// const playback = document.getElementById('recordPlayback');
// Media playback handlers

// playback.addEventListener('play', () => { isPlaying = true });
// playback.addEventListener('pause', () => { isPlaying = false });
// playback.addEventListener('playing', () => { isPlaying = true });
// playback.addEventListener('ended', () => { isPlaying = false });

/**
 * Save the recording
 * */
const save = document.getElementById('recordSave');
save.addEventListener('click', () => {
    recorderStreams.forEach(function (recorderStream) {
        const recordingData = recorderStream['data']
        const blob = new Blob(recordingData, { type: recorders[recorderStream['id']].mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        // a.style.display = 'none';
        a.href = url;
        a.download = `${getFilename(recorderStream)}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            console.log(`${a.download} save option shown`);
        }, 100);
        })

    
});