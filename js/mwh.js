var quarterBeatLength;
var barLength;
var inputTimes;
var rhythm;

var rhythmBars;
var rhythmStrBars;

var VF = Vex.Flow;

var recording;

var tempoSlider = $('#tempo_range');
var resolutionSelector = $('#resolution_selector');
var precisionSelector = $('#precision_selector');
var precision;

var restsString;

var bar = $('#hint_bar');
var hint = $('#hint_span');

var stopHint = 'Stopped. Press "1" to START recording!';
var preparingHint = 'Be prepared!';
var recordingHint = 'Now recording... Press "1" to stop.';

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

    // if visit from computer, hide touch input area
    // http://stackoverflow.com/questions/5899783/detect-safari-using-jquery
    var is_chrome = navigator.userAgent.indexOf('Chrome') > -1;
    var is_firefox = navigator.userAgent.indexOf('Firefox') > -1;
    var is_safari = navigator.userAgent.indexOf("Safari") > -1;
    var is_opera = navigator.userAgent.toLowerCase().indexOf("op") > -1;
    if ((is_chrome) && (is_safari)) {
        is_safari = false;
    }
    if ((is_chrome) && (is_opera)) {
        is_chrome = false;
    }

    if (!is_safari && (is_chrome || is_firefox)) {
        $('#mobile_input').remove();
    }

    // initialize hint bar
    hint.text(stopHint);
    bar.css('width', '0%');

    tempoSlider.on('input', function () {
        tempo = this.value;
        $('#tempo_input').val(tempo);
    });

    initMetronome();
    tempoSlider.slider('setValue', tempo, true, true);
    resolutionSelector.val('quarter').trigger('change');
    precisionSelector.val('sixteenth').trigger('change');

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
    $(this).focusout();
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

$('#button_export').click(function () {
    var content = generateXML();
    var blob = new Blob([content], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "Export.xml");
});

function generateXML() {
    var start = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?><!DOCTYPE score-partwise PUBLIC '-//Recordare//DTD MusicXML 2.0 Partwise//EN' 'http://www.musicxml.org/dtds/2.0/partwise.dtd'><score-partwise version=\"2.0\"><movement-title>MusicWritingHelper Export</movement-title><identification><encoding><encoding-date>2016-12-01</encoding-date><software>Guitar Pro 6</software></encoding></identification><part-list><score-part id=\"P0\"><part-name>Electric Guitar</part-name><part-abbreviation>E-Gt</part-abbreviation><midi-instrument id=\"P0\"><midi-channel>1</midi-channel><midi-bank>1</midi-bank><midi-program>28</midi-program><volume>80</volume><pan>0</pan></midi-instrument></score-part></part-list><part id=\"P0\"><measure number=\"0\"><attributes><divisions>4</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>6</staff-lines><staff-tuning line=\"1\"><tuning-step>E</tuning-step><tuning-octave>2</tuning-octave></staff-tuning><staff-tuning line=\"2\"><tuning-step>A</tuning-step><tuning-octave>2</tuning-octave></staff-tuning><staff-tuning line=\"3\"><tuning-step>D</tuning-step><tuning-octave>3</tuning-octave></staff-tuning><staff-tuning line=\"4\"><tuning-step>G</tuning-step><tuning-octave>3</tuning-octave></staff-tuning><staff-tuning line=\"5\"><tuning-step>B</tuning-step><tuning-octave>3</tuning-octave></staff-tuning><staff-tuning line=\"6\"><tuning-step>E</tuning-step><tuning-octave>4</tuning-octave></staff-tuning></staff-details><transpose><diatonic>0</diatonic><chromatic>0</chromatic><octave-change>0</octave-change></transpose></attributes><direction directive=\"yes\" placement=\"above\"><direction-type><metronome default-y=\"40\" parentheses=\"yes\"><beat-unit>quarter</beat-unit><per-minute></per-minute></metronome></direction-type><sound tempo=\"\"/></direction>";

    start = start.replace('<per-minute></per-minute>', '<per-minute>' + tempo + '</per-minute>');
    start = start.replace('<sound tempo=\"\"/>', '<sound tempo="' + tempo + '"/>');

    var content = '';

    if (rhythmBars.length > 0) {
        for (var ri = 0; ri < rhythmBars.length; ri++) {
            if (ri != 0) {
                content += "<measure number=\"" + ri + "\"><attributes><divisions>4</divisions><clef><sign>TAB</sign><line>5</line></clef></attributes>"
            }

            var rhythmBar = rhythmBars[ri];

            if (rhythmBar.length == 1) {
                // full rest
                content += '<note><rest/><duration>4</duration><voice>1</voice><type>whole</type></note>';
            } else {
                for (var i = 0; i < rhythmBar.length; i++) {
                    var note = rhythmBar[i];
                    var parts = note.split("/");

                    var duration = parts[1];
                    var durationStr1, durationStr2;
                    if (duration === '16') {
                        durationStr1 = 2;
                        durationStr2 = '16th';
                    } else if (duration === '8') {
                        durationStr1 = 2;
                        durationStr2 = 'eighth';
                    } else if (duration === '4') {
                        durationStr1 = 2;
                        durationStr2 = 'quarter';
                    } else if (duration === '2') {
                        durationStr1 = 2;
                        durationStr2 = 'half';
                    } else {
                        durationStr1 = 4;
                        durationStr2 = 'whole';
                    }

                    if (parts.length === 3) {
                        // rest
                        // <note><rest/><duration>3</duration><voice>1</voice><type>eighth</type><dot/></note>
                        content += '<note><rest/><duration>' + durationStr1 + '</duration><voice>1</voice><type>' + durationStr2 + '</type>';
                        if (parts[2].includes('.')) {
                            content += '<dot/>';
                        }
                        content += '</note>';

                    } else {
                        // note
                        // '<note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type><stem>up</stem><notations><technical><string>4</string><fret>5</fret></technical></notations></note>'
                        content += '<note><pitch><step>G</step><octave>3</octave></pitch><duration>' + durationStr1 + '</duration><voice>1</voice><type>' + durationStr2 + '</type><stem>up</stem><notations><technical><string>4</string><fret>5</fret></technical></notations>';
                        if (parts[1].includes('.')) {
                            content += '<dot/>';
                        }
                        content += '</note>';
                    }
                }
            }

            content += '</measure>';
        }
    }


    var end = '</part></score-partwise>';
    return start + content + end;
}

// bars for preparation before actual recording
var preparationBarNumber = 1;
var preparationTime;

function startRecording() {
    recording = true;

    bar.addClass('notransition');
    hint.text(preparingHint + ' The first ' + preparationBarNumber + ' bar(s) is(are) for you to catch up with the tempo.');

    preparationTime = 60 / tempo * 4 * preparationBarNumber * 1000;

    var progressBarWidth = 0;
    var id = setInterval(function () {
        if (progressBarWidth > 100) {
            clearInterval(id);
            hint.text(recordingHint);
        } else {
            progressBarWidth++;
            bar.css('width', progressBarWidth + '%');
        }
    }, preparationTime / 100);

    inputTimes = [];

    playMetronome();
}

function endRecording() {
    recording = false;

    // enable animation
    // barDiv.css('transition', 'none');
    bar.removeClass('notransition');
    bar.css('width', '0%');
    hint.text(stopHint);

    stopMetronome();

    if (inputTimes.length !== 0) {
        console.log('inputTimes: ' + inputTimes.toString());
        calculateRhythm();
        console.log('rhythm: ' + rhythm.toString());
        generateNotes();
        console.log('rhythmStrBars: ' + rhythmStrBars.toString());
        drawNotation(rhythmStrBars);
    }
}

function startOrStopRecording() {
    if (recording) {
        endRecording();
    } else {
        startRecording();
    }
}

function pauseOrResumeRecording() {
    pauseOrResumeMetronome();
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
    // startTime: ignore the first "preparationBarNumber" bar(s)
    // they are for user to get along the beats
    var startTime = firstBeatTime + preparationTime;
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
    rhythmStrBars = [];

    var bar = [];
    var barI = 0;

    for (var rhythmI = 0; rhythmI < rhythm.length; rhythmI++) {
        var beat = rhythm[rhythmI];
        console.log("beat: " + beat);

        if (beat >= (barI + 1) * precision) {
            if (bar.length === 0) {
                rhythmBars.push([restsString]);
                rhythmStrBars.push(restsString);

            } else {
                var rhythmBar = generateBar(bar);
                rhythmBars.push(rhythmBar);

                var rhythmBarStr = rhythmBar.join(',');
                rhythmStrBars.push(rhythmBarStr);
                bar = [];
            }

            barI++;
        }

        bar.push(beat % precision);
    }

    rhythmBar = generateBar(bar);
    rhythmBars.push(rhythmBar);

    rhythmBarStr = rhythmBar.join(',');
    rhythmStrBars.push(rhythmBarStr);
}

function generateBar(bar) {
    console.log("bar: " + bar.toString());

    // 'B4/16/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r, B4/r'
    var rhythmBar = [];

    for (var ni = 0, ri = 0; ri < bar.length; ri++) {
        for (var i = ni; i < bar[ri]; i++) {
            rhythmBar.push('B4/' + precision + '/r');
        }
        ni = bar[ri] + 1;
        rhythmBar.push('G4/' + precision);
    }

    if (bar.length != 0) {
        for (i = bar[bar.length - 1] + 1; i < precision; i++) {
            rhythmBar.push('B4/' + precision + '/r');
        }
    }

    // merge rest notes, to give the score a better look
    if (precision == 16) {
        var mergedRhythmBar = [];
        for (i = 0; i < rhythmBar.length;) {
            if (isRest(rhythmBar[i])) {
                if (i % 4 < 3 && i + 1 < rhythmBar.length && isRest(rhythmBar[i + 1])) {
                    if (i % 4 < 2 && i + 2 < rhythmBar.length && isRest(rhythmBar[i + 2])) {
                        if (i % 4 == 0 && i + 3 < rhythmBar.length && isRest(rhythmBar[i + 3])) {
                            mergedRhythmBar.push('B4/4/r');
                            i += 4;
                        } else {
                            mergedRhythmBar.push('B4/8/r.');
                            i += 3;
                        }
                    } else {
                        mergedRhythmBar.push('B4/8/r');
                        i += 2;
                    }
                } else {
                    mergedRhythmBar.push(rhythmBar[i]);
                    i++;
                }
            } else {
                mergedRhythmBar.push(rhythmBar[i]);
                i++;
            }
        }
        rhythmBar = mergedRhythmBar;

    } else if (precision == 8) {
        mergedRhythmBar = [];
        for (i = 0; i < rhythmBar.length;) {
            if (i % 2 == 0 && isRest(rhythmBar[i])) {
                if (i + 1 < rhythmBar.length && isRest(rhythmBar[i + 1])) {
                    mergedRhythmBar.push('B4/4/r');
                    i += 2;
                } else {
                    mergedRhythmBar.push('B4/8/r');
                    i++
                }
            } else {
                mergedRhythmBar.push(rhythmBar[i]);
                i++;
            }
        }
        rhythmBar = mergedRhythmBar;
    }

    return rhythmBar;
}

function isRest(note) {
    return note.includes('r');
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
            bar.css('background-color', '#2a8000');
            var restoreColor = setTimeout(function () {
                bar.css('background-color', '#44cc00');
            }, 100);
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
    // if (!recording) {
    //     startRecording();
    // }

    startOrStopRecording()
});

// pause recording
key('2', function () {
    pauseOrResumeRecording();
});

// stop recording
// key('3', function () {
//     if (recording) {
//         endRecording();
//     }
// });

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
    // var rests = [];
    // for (var i = 0; i < precision; i++) {
    //     rests.push('B4/16/r');
    // }
    // restsString = rests.join(',');
    restsString = 'B4/1/r';
    drawNotation([restsString, restsString, restsString]);
}

var notationDiv = $('#notation');

function drawNotation(bars) {
    notationDiv.empty();

    var width = notationDiv.width();

    var registry = new VF.Registry();
    VF.Registry.enableDefaultRegistry(registry);

    vf = new VF.Factory({
        renderer: {
            selector: 'notation',
            backend: VF.Renderer.Backends.SVG,
            width: width,
            height: 900
        }
    });

    var firstBarExtraLength = 50;
    var barLength = (width - firstBarExtraLength) / 3;

    var score = vf.EasyScore({throwOnError: true});
    score.set({time: '4/4'});

    var voice = score.voice.bind(score);
    var notes = score.notes.bind(score);

    x = 0;
    y = 0;

    var barsArrayLength = bars.length;
    if (barsArrayLength > 0) {
        var system = makeSystem(barLength + firstBarExtraLength);
        system.addStave({voices: [voice(notes(bars[0]))]})
            .addClef('treble').addKeySignature('C').addTimeSignature('4/4');

        for (var i = 1; i < barsArrayLength; i++) {
            if (i % 3 == 0) {
                x = 0;
                y += 120;
                system = makeSystem(barLength + firstBarExtraLength);
            } else {
                system = makeSystem(barLength);
            }
            system.addStave({voices: [voice(notes(bars[i]))]});
        }
    }

    vf.draw();
}
