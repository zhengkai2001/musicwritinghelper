var audioContext;
var playing = false;        // Are we currently playing?
var paused = false;         // Are we currently paused?

var firstBeatTime,
    lastBeatTime;

var scheduleAheadTime = 0.1;// How far ahead to schedule audio (sec)
var beforeFirstBeat = 0.1;  // Give some time to let the first beat out

var tempo = 120;            // tempo (in beats per minute)
var secondsPerBeat;         // 60.0 / tempo
var secondsPerBeatLength;   // 0.25 * secondsPerBeat

var current16thNote;        // What note is currently last scheduled?
var nextNoteTime;           // when the next note is due.
var noteResolution;         // sixteenth, eighth, quarter
var noteLength = 0.05;      // length of 'beep' (in seconds)

var canvas;                 // the canvas element
var canvasContext;          // canvasContext is the canvas' context 2D
var sideLength;             // the side length of note squares

var metronomeNotes;         // the metronomeNotes to be played
var metronomeWorker;        // The Web Worker used to fire timer messages

// beat 0 == high pitch
// quarter metronomeNotes = medium pitch
// other 16th metronomeNotes = low pitch
var beatPitch = [880, 220, 220, 220, 440, 220, 220, 220, 440, 220, 220, 220, 440, 220, 220, 220];

// First, let's shim the requestAnimationFrame API, with a setTimeout fallback
window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

function setTempo(tempoValue) {
    tempo = tempoValue;
    secondsPerBeat = 60.0 / tempo;
    secondsPerBeatLength = 0.25 * secondsPerBeat;

    metronomeWorker.postMessage({'interval': 3000 / tempo});
    // console.log('tempo = ' + tempo);
}

function setNoteResolution(noteResolutionValue) {
    noteResolution = noteResolutionValue;
    if (!playing) {
        drawDefault();
    }
}

function scheduler() {
    if (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        metronomeNotes.enqueue({note: current16thNote, time: nextNoteTime});

        // we're not playing:
        // if 'eighth': non-8th 16th metronomeNotes;
        // if 'quarter': non-quarter 8th metronomeNotes.
        if (noteResolution == 'sixteenth'
            || (noteResolution == 'eighth' && !(current16thNote % 2))
            || (noteResolution == 'quarter' && !(current16thNote % 4))) {

            var oscillator = audioContext.createOscillator();

            oscillator.connect(audioContext.destination);
            oscillator.frequency.value = beatPitch[current16thNote];
            oscillator.start(nextNoteTime);
            oscillator.stop(nextNoteTime + noteLength);

            // the actual end time
            oscillator.onended = function () {
                lastBeatTime = Date.now();
                console.log("note time: " + lastBeatTime);  // maybe "- noteLength * 1000" ?

                if (firstBeatTime === 0) {
                    firstBeatTime = lastBeatTime;
                }
            };
        }

        nextNoteTime += secondsPerBeatLength;

        current16thNote++;
        if (current16thNote == 16) {
            current16thNote = 0;
        }
    }
}

function play() {
    paused = false;
    metronomeNotes = new Queue();
    nextNoteTime = audioContext.currentTime + beforeFirstBeat;
    firstBeatTime = 0;
    requestAnimFrame(draw);
}

function playOrStopMetronome() {
    playing ? stopMetronome() : playMetronome();
    return playing ? 'Stop' : 'Play';
}

function playMetronome() {
    playing = true;
    current16thNote = 0;
    play();
    metronomeWorker.postMessage('start');
}

function stopMetronome() {
    playing = false;
    requestAnimFrame(drawDefault);
    metronomeWorker.postMessage('stop');
}

function pauseOrResumeMetronome() {
    if (playing) {
        paused ? resumeMetronome() : pauseMetronome();
    }
}

function pauseMetronome() {
    if (playing && !paused) {
        paused = true;
        metronomeWorker.postMessage('pause');
    }
}

function resumeMetronome() {
    if (playing && paused) {
        play();
        metronomeWorker.postMessage('resume');
    }
}

var canvasDiv = $('#rhythm_canvas_div');
canvasDiv.height(100);

function resizeCanvas() {
    canvas.width = canvasDiv.width();
    sideLength = Math.floor(canvas.width / 18);

    if (!playing) {
        drawDefault();
    }
}

function drawRhythm(note) {
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);

    var step;
    switch (noteResolution) {
        case 'quarter':
            step = 4;
            break;
        case 'eighth':
            step = 2;
            break;
        case 'sixteenth':
        default:
            step = 1;
            break;
    }

    for (var i = 0; i < 16; i += step) {
        canvasContext.fillStyle = (note === i) ? ((note % 4 === 0) ? 'red' : 'blue') : 'black';
        canvasContext.fillRect(sideLength * (i + 1), sideLength / 2, sideLength / 2, sideLength / 2);
    }
}

function drawDefault() {
    drawRhythm(-1);
}

function draw() {
    if (!metronomeNotes.isEmpty() && metronomeNotes.peek().time < audioContext.currentTime) {
        var currentNote = metronomeNotes.dequeue().note;
        drawRhythm(currentNote);
    }

    if (playing) {
        requestAnimFrame(draw);
    } else {
        requestAnimFrame(drawDefault);
    }
}

function initMetronome() {
    canvas = document.getElementById('rhythm_canvas');
    canvasContext = canvas.getContext('2d');

    resizeCanvas();
    window.onorientationchange = resizeCanvas;
    window.onresize = resizeCanvas;

    drawDefault();

    audioContextCreatedTime = Date.now();
    audioContext = Tone.context;

    metronomeWorker = new Worker('js/metronomeworker.js');
    metronomeWorker.onmessage = function (e) {
        if (e.data == 'tick') {
            scheduler();
        }
    };
}
