var quarterBeatLength;
var barLength;
var inputTimes;
var rhythm;
var notes;

var VF = Vex.Flow;

var recording;

var tempoSlider = $('#tempo_range');
var resolutionSelector = $('#resolution_selector');

$(document).ready(function () {
    $('#tempo_input').keyup(function (event) {
        // 'Enter' key
        if (event.keyCode == 13) {
            tempo = this.value;
            tempoSlider.val(tempo);
            this.focusout();
        }

        event.preventDefault();
    });

    tempoSlider.on('input', function () {
        tempo = this.value;
        $('#tempo_input').val(tempo);
    });

    initMetronome();
    tempoSlider.slider('setValue', tempo, true, true);
    resolutionSelector.val('eighth').trigger('change');

    drawNotation();
});

tempoSlider.slider({
    formatter: function (value) {
        return value;
    },
    focus: true
});

tempoSlider.change(function () {
    var tempoValue = $(this).val();
    $('#tempo').text(tempoValue);

    setTempo(tempoValue);
    quarterBeatLength = tempo / 60;
    barLength = quarterBeatLength * 4;
});

resolutionSelector.change(function () {
    var noteResolutionValue = $(this).val();
    setNoteResolution(noteResolutionValue);
});

$('#play_metronome').click(function () {
    $(this).text(playOrStopMetronome());
});

function startRecording() {
    if (!recording) {
        recording = true;

        $('#record_message').text('Recording...');
        inputTimes = [];
        playMetronome();
    }
}

function pauseOrResumeRecording() {
    var message = pauseOrResumeMetronome();
    if (typeof message === 'string') {
        $('#record_message').text(message);
    }
}

function endRecording() {
    if (recording) {
        recording = false;

        $('#record_message').text('Stopped.');
        stopMetronome();

        if (inputTimes.length !== 0) {
            console.log(inputTimes.toString());
            calculateRhythm();
            console.log(rhythm.toString());
            generateNotes();
            drawNotation();
        }
    }
}

function goodTiming(time1, time2, threshold) {
    return Math.abs(time1 - time2) < threshold;
}

function calculateRhythm() {
    rhythm = [];

    // all time in millisecond
    // startTime: ignore the first bar (it is for user to get along the beats)
    var startTime = firstBeatTime + 60 / tempo * 4 * 1000;
    var endTime = lastBeatTime;
    var timePerBeat;

    switch (resolutionSelector.val()) {
        case 'sixteenth':
            timePerBeat = 60 / tempo / 4 * 1000;
            break;
        case 'eighth':
            timePerBeat = 60 / tempo / 2 * 1000;
            break;
        case 'quarter':
            timePerBeat = 60 / tempo * 1000;
            break;
        default:
    }
    var threshold = timePerBeat * 0.2;

    console.log("startTime = " + startTime);
    console.log("endTime = " + endTime);
    console.log("timePerBeat = " + timePerBeat);
    console.log("threshold: " + threshold);

    var beats = [];
    for (var time = startTime; time < endTime; time += timePerBeat) {
        beats.push(time);
    }

    for (var inputI = 0, beatI = 0; inputI < inputTimes.length && beatI < beats.length;) {
        var inputTime = inputTimes[inputI];
        var beat = beats[beatI];

        console.log("input = " + inputI + " " + inputTime);
        console.log("beat  = " + beatI + " " + beat);

        if (goodTiming(inputTime, beat, threshold)) {
            rhythm.push(beatI);
            inputI++;
            beatI++;
        } else {
            // for moving beatI: (and for moving inputI vice versa)
            // case 1:
            //   before:
            //     input: x         X             x
            //     beats: o   o   A   o   o   o   o   o
            //   after:
            //     input: x         X             x
            //     beats: o   o   o   A   o   o   o   o
            //
            // case 2:
            //   before:
            //     input: x         x            X
            //     beats: o   o   o   A   o   o   o   o
            //   after:
            //     input: x         x            X
            //     beats: o   o   o   o   o   A   o   o
            if (inputTime < beat) {
                inputI++;
                if (inputTimes[inputI] < beat) {
                    while (inputTimes[inputI] < beat) {
                        inputI++;
                    }
                    inputI--;
                }
            } else {
                beatI++;
                if (inputTime > beats[beatI]) {
                    while (inputTime > beats[beatI]) {
                        beatI++;
                    }
                    beatI--;
                }
            }
        }
    }
}

function generateNotes() {
    notes = [];

}

function generateNotesInBar(rhythmInBar) {
    var bar = [];

    for (var ni = 0, ri = 0; ri < rhythmInBar.length; ri++) {
        if (rhythmInBar[ri] > notes.length * 8) {

        }

        for (var i = ni; i < rhythmInBar[ri]; i++) {
            notes.push(new VF.StaveNote({clef: "treble", keys: ["b/4"], duration: "8r"}));
        }
        ni = rhythmInBar[ri] + 1;
        notes.push(new VF.StaveNote({clef: "treble", keys: ["c/4"], duration: "8"}));
    }

    if (rhythmInBar.length != 0) {
        for (i = rhythmInBar[rhythmInBar.length - 1]; i < 8; i++) {
            notes.push(new VF.StaveNote({clef: "treble", keys: ["b/4"], duration: "8r"}));
        }
    }

    return bar;
}

function recordTimePoint() {
    var keyboardTime = Date.now();
    inputTimes.push(keyboardTime);
    console.log("keyb time: " + keyboardTime);  // maybe "- noteLength * 1000" ?
}

var keys = 'abcdefghijklmnopqrstuvwxyz';
for (var i = 0; i < keys.length; i++) {
    key(keys.charAt(i), function () {
        if (recording) {
            recordTimePoint();
        }
    });
}

// // 从第2秒开始，每隔0.5秒发出声音，共8次
// var context = Tone.context;
// for (var i = 0; i < 8; i++) {
//     var oscillator = context.createOscillator();
//     oscillator.connect(context.destination);
//     oscillator.frequency.value = 220;
//
//     var soundStartTime = 2 + i * 0.5;
//     oscillator.start(soundStartTime);
//     oscillator.stop(soundStartTime + noteLength);
//
//     // 将后4次发出声音的时刻输出到console
//     if (i > 3) {
//         oscillator.onended = function () {
//             lastBeatTime = Date.now();
//             console.log("note time: " + lastBeatTime);  // maybe "- noteLength * 1000" ?
//         };
//     }
// }
//
// // 记录键盘“k”键的敲击时刻，输出到console
// key('k', function () {
//     recordTimePoint();
// });
//
// $(document).keypress(function (e) {
//     if (e.which === 107) {
//         recordTimePoint();
//     }
// });

// start recording
key('1', function () {
    startRecording();
});

// pause recording
key('2', function () {
    pauseOrResumeRecording();
});

// stop recording
key('3', function () {
    endRecording();
});

$('#left').mouseenter(function () {
    if (recording && !paused) {
        var time = Date.now();
        inputTimes.push(time);
        console.log('left: ' + time);
    }
});

$('#right').mouseenter(function () {
    if (recording && !paused) {
        var time = Date.now();
        inputTimes.push(time);
        console.log('right: ' + time);
    }
});

// draw notation
var registry;
var vf;
var x, y;
function makeSystem(width) {
    var system = vf.System({x: x, y: y, width: width, spaceBetweenStaves: 10});
    x += width;
    return system;
}

function concat(a, b) {
    return a.concat(b);
}

function drawNotation() {
    registry = new VF.Registry();
    VF.Registry.enableDefaultRegistry(registry);

    vf = new VF.Factory({
        renderer: {
            selector: 'notation',
            backend: VF.Renderer.Backends.SVG,
            width: 1100,
            height: 900
        }
    });

    var score = vf.EasyScore({throwOnError: true});
    score.set({time: '3/4'});

    var voice = score.voice.bind(score);
    var notes = score.notes.bind(score);
    var beam = score.beam.bind(score);

    x = 120;
    y = 80;

    /*  Measure 1 */
    var system = makeSystem(220);
    system.addStave({
        voices: [
            voice([
                notes('D5/q'),
                beam(notes('G4/8, A4, B4, C5', {stem: "up"}))
            ].reduce(concat))
        ]
    })
        .addClef('treble')
        .addKeySignature('C')
        .addTimeSignature('4/4');

    /*  Measure 2 */
    system = makeSystem(150);
    system.addStave({voices: [voice(notes('D5/q, G4, G4'))]});

    /*  Measure 3 */
    system = makeSystem(150);
    system.addStave({
        voices: [
            voice([
                notes('E5/q'),
                beam(notes('C5/8, D5, E5, F5', {stem: "down"}))
            ].reduce(concat))
        ]
    });

    /*  Measure 4 */
    system = makeSystem(150);
    system.addStave({voices: [voice(notes('G5/q, G4, G4'))]});

    /*  Measure 5 */
    system = makeSystem(150);
    system.addStave({
        voices: [
            voice([
                notes('C5/q'),
                beam(notes('D5/8, C5, B4, A4', {stem: "down"}))
            ].reduce(concat))
        ]
    });

    /*  Measure 6 */
    system = makeSystem(150);
    system.addStave({
        voices: [
            voice([
                notes('B5/q'),
                beam(notes('C5/8, B4, A4, G4', {stem: "up"}))
            ].reduce(concat))
        ]
    });

    /*  Measure 7 (New system) */
    x = 20;
    y += 120;

    system = makeSystem(220);
    system.addStave({
        voices: [
            voice([
                notes('F4/q'),
                beam(notes('G4/8, A4, B4, G4', {stem: "up"}))
            ].reduce(concat))
        ]
    }).addClef('treble').addKeySignature('C');

    /*  Measure 8 */
    system = makeSystem(180);

    system.addStave({voices: [voice(notes('A4/h.'))]});

    vf.draw();
}
