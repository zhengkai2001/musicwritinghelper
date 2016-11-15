var timerID;
var interval;

self.onmessage = function (e) {
    if (e.data == 'start') {
        timerID = setInterval(tick, interval);
        // console.log('metronome starts');
    }
    else if (e.data == 'stop') {
        clearInterval(timerID);
        // console.log('metronome stops');
    }
    else if (e.data == 'resume') {
        timerID = setInterval(tick, interval);
        // console.log('metronome resumes');
    }
    else if (e.data == 'pause') {
        clearInterval(timerID);
        // console.log('metronome pauses');
    }
    else if (e.data.interval) {
        interval = e.data.interval;
        // console.log('metronome interval = ' + interval);
    }
};

function tick() {
    postMessage('tick');
    // console.log('metronome ticks!');
}

// console.log('metronome initiates');
