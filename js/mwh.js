var quarterBeatLength;
var barLength;
var inputTimes;
var rhythm;
var rhythmBars;

var VF = Vex.Flow;

var recording;

var tempoSlider = $('#tempo_range');
var resolutionSelector = $('#resolution_selector');
var precisionSelector = $('#precision_selector');
var precision;

var restsString;

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
    precisionSelector.val('eighth').trigger('change');

    drawStaves();
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

precisionSelector.change(function () {
    var precisionValue = $(this).val();
    switch (precisionValue) {
        case 'sixteenth':
            precision = 16;
            break;
        case 'eighth':
            precision = 8;
            break;
        case 'quarter':
            precision = 4;
            break;
        default:
    }
    drawStaves();
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
            console.log(rhythmBars.toString());
            drawNotation(rhythmBars);
        }
    }
}

function diff(time1, time2) {
    return Math.abs(time1 - time2);
}

function goodTiming(time1, time2, threshold) {
    return diff(time1, time2) < threshold;
}

function calculateRhythm() {
    rhythm = [];

    // all time in millisecond
    // startTime: ignore the first bar (it is for user to get along the beats)
    var startTime = firstBeatTime + 60 / tempo * 4 * 1000;
    var endTime = lastBeatTime;
    var timePerBeat;

    switch (precision) {
        case 16:
            timePerBeat = 60 / tempo / 4 * 1000;
            break;
        case 8:
            timePerBeat = 60 / tempo / 2 * 1000;
            break;
        case 4:
            timePerBeat = 60 / tempo * 1000;
            break;
        default:
    }
    var threshold = timePerBeat * 0.4;

    console.log("startTime = " + startTime);
    console.log("endTime = " + endTime);
    console.log("timePerBeat = " + timePerBeat);
    console.log("threshold: " + threshold);

    var beats = [];
    for (var time = startTime; time < endTime; time += timePerBeat) {
        beats.push(time);
    }

    // find the nearest beat for each input

    // handle the first input specially,
    // because it may start before any beats,
    // i.e. its time may be less than any beats
    if (inputTimes[0] < beats[0]) {
        if (goodTiming(inputTimes[0], beats[0], threshold)) {
            rhythm.push(0);
        }
    }

    for (var beatI = 0, inputI = 0; inputI < inputTimes.length; inputI++) {
        // find the nearest beat that less than input
        //   for:
        //     input: x                 X        x
        //     beats: o   o   o   o   o   o   o   o
        //   find:
        //     input: x                 X        x
        //     beats: o   o   o   o   A   B   o   o
        // and then determine, of A and B, which is nearer to X
        // i.e. compare abs(A-X) and abs(B-X).

        if (beats[beatI] < inputTimes[inputI]) {
            if (beats[beatI + 1] < inputTimes[inputI]) {
                while (beats[beatI + 1] < inputTimes[inputI]) {
                    beatI++;
                }
            }

            var diffA = diff(beats[beatI], inputTimes[inputI]);
            var diffB = diff(beats[beatI + 1], inputTimes[inputI]);

            var nearestBeatI = diffA < diffB ? beatI : beatI + 1;
            if (rhythm[rhythm.length - 1] !== nearestBeatI) {
                rhythm.push(nearestBeatI);
                console.log("nearest beat: " + nearestBeatI);
                console.log("difference  : " + diff(beats[nearestBeatI], inputTimes[inputI]));
            }
        }
    }

    // // find the those beats whose difference < threshold
    // for (var beatI = 0, inputI = 0; beatI < beats.length && inputI < inputTimes.length;) {
    //     var beat = beats[beatI];
    //     var inputTime = inputTimes[inputI];
    //
    //     console.log("beat  = " + beatI + " " + beat);
    //     console.log("input = " + inputI + " " + inputTime);
    //
    //     if (goodTiming(beat, inputTime, threshold)) {
    //         rhythm.push(beatI);
    //         console.log("timing beat: " + beatI);
    //         console.log("difference : " + diff(beat, inputTime));
    //         beatI++;
    //         inputI++;
    //     } else {
    //         // if beat < input, then move beatI, else move inputI
    //         // for moving beatI (and for moving inputI vice versa):
    //         // case 1:
    //         //   before:
    //         //     input: x         X             x
    //         //     beats: o   o   A   o   o   o   o   o
    //         //   after:
    //         //     input: x         X             x
    //         //     beats: o   o   o   A   o   o   o   o
    //         //
    //         // case 2:
    //         //   before:
    //         //     input: x         x            X
    //         //     beats: o   o   o   A   o   o   o   o
    //         //   after:
    //         //     input: x         x            X
    //         //     beats: o   o   o   o   o   A   o   o
    //         if (beat < inputTime) {
    //             if (beats[beatI + 1] < inputTime) {
    //                 while (beats[beatI + 1] < inputTime) {
    //                     beatI++;
    //                 }
    //             }
    //         } else {
    //             if (inputTimes[inputI + 1] < beat) {
    //                 while (inputTimes[inputI + 1] < beat) {
    //                     inputI++;
    //                 }
    //             }
    //         }
    //     }
    // }
}

function generateNotes() {
    rhythmBars = [];

    var bar = [];
    var barI = 0;

    for (var rhythmI = 0; rhythmI < rhythm.length; rhythmI++) {
        var beat = rhythm[rhythmI];
        console.log("beat: " + beat);

        if (beat >= (barI + 1) * precision) {
            if (bar.length === 0) {
                rhythmBars.push(restsString);
            } else {
                rhythmBars.push(generateBar(bar));
                bar = [];
            }

            barI++;
        }

        bar.push(beat % precision);
    }

    rhythmBars.push(generateBar(bar));
}

function makeBar(bar) {
    bar[0] = bar[0].slice(0, 2) + '/' + precision + bar[0].slice(2);
    return bar.join(',');
}

function generateBar(bar) {
    console.log("bar: " + bar.toString());
    // 'B4/16/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r'
    var rhythmBar = [];

    for (var ni = 0, ri = 0; ri < bar.length; ri++) {
        for (var i = ni; i < bar[ri]; i++) {
            rhythmBar.push('B4/r');
        }
        ni = bar[ri] + 1;
        rhythmBar.push('G4');
    }

    if (bar.length != 0) {
        for (i = bar[bar.length - 1] + 1; i < precision; i++) {
            rhythmBar.push('B4/r');
        }
    }

    var rhythmBarString = makeBar(rhythmBar);
    console.log("rhythmBar: " + rhythmBarString);
    return rhythmBarString;
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

// notation position
var vf;
var x, y;
function makeSystem(width) {
    var system = vf.System({x: x, y: y, width: width, spaceBetweenStaves: 10});
    x += width;
    return system;
}

function drawStaves() {
    var rests = [];
    for (var i = 0; i < precision; i++) {
        rests.push('B4/r');
    }
    restsString = makeBar(rests);
    drawNotation([restsString, restsString, restsString]);
}

function drawNotation(bars) {
    $('#notation').empty();

    var registry = new VF.Registry();
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
    score.set({time: '4/4'});

    var voice = score.voice.bind(score);
    var notes = score.notes.bind(score);
    var beam = score.beam.bind(score);

    x = 0;
    y = 0;
    var barLength = 40 + precision * 20;

    if (bars[0]) {
        var system = makeSystem(barLength + 60);
        var stave = new VF.Stave();
        system.addStave({voices: [voice(notes(bars[0]))]})
            .addClef('treble').addKeySignature('C').addTimeSignature('4/4');
    }
    if (bars[1]) {
        system = makeSystem(barLength);
        system.addStave({voices: [voice(notes(bars[1]))]});
    }
    if (bars[2]) {
        system = makeSystem(barLength);
        system.addStave({voices: [voice(notes(bars[2]))]});
    }

    // new line
    // x = 0;
    // y += 120;
    //
    // system = makeSystem(barLength);
    // system.addStave({voices: [voice(notes(bars[3]))]})
    //     .addClef('treble').addKeySignature('C');

    vf.draw();
}
