function showAudioVisual(sound, player, viz) {
    player.src = makeAudioURI(sound);
    visualize(viz, sound, player);
}


// Sample generation

function compileComposer(text) {
    return eval("(function(t) { return "
                + text.replace(/sin|cos|tan|floor|ceil/g,
                               function(str) { return "Math."+str; })
                + "})");
}

function makeSound(composer, duration, rate) {
    var bytes = [];
    for (var t = 0; t < duration * rate; ++t)
        bytes.push(0xFF & composer(t));
    return {
        duration: duration,
        rate: rate,
        bytesPerSample: 1,
        bytes: bytes
    };
}


// URI encoding

function makeAudioURI(sound) {
    return "data:audio/x-wav," + hexEncodeURI(RIFFChunk(sound));
}

var hexCodes = (function () {
    var result = [];
    for (var b = 0; b < 256; ++b)
        result.push((b < 16 ? "%0" : "%") + b.toString(16));
    return result;
})();
    
// [255, 0] -> "%ff%00"
function hexEncodeURI(values) {
    var codes = [];
    for (var i = 0; i < values.length; ++i)
        codes.push(hexCodes[values[i]]);
    return codes.join('');
}


// WAV file format
// See https://ccrma.stanford.edu/courses/422/projects/WaveFormat/

function RIFFChunk(sound) {
    var nchannels = 1;
    return [].concat(
        // Header (length 12)
        cc("RIFF"), 
        bytesFromU32(12 + 24 + 8 + sound.bytes.length),
        cc("WAVE"),
        // "fmt " subchunk (length 24):
        cc("fmt "),
        bytesFromU32(16), // Subchunk1Size = 16 for PCM
        bytesFromU16(1),  // AudioFormat = 1 for PCM
        bytesFromU16(nchannels),
        bytesFromU32(sound.rate),
        bytesFromU32(nchannels * sound.rate * sound.bytesPerSample),
        bytesFromU16(nchannels * sound.bytesPerSample),
        bytesFromU16(8 * sound.bytesPerSample),
        // "data" subchunk (length 8 + sound.bytes.length):
        cc("data"),
        bytesFromU32(nchannels * sound.bytes.length),
        sound.bytes
    );
}

// String to array of byte values.
function cc(str) {
    var result = [];
    for (var i = 0; i < str.length; ++i)
        result.push(str.charCodeAt(i)); // XXX check that it's a byte
    return result;
}

function bytesFromU16(v) {
    return [0xFF & v, 0xFF & (v>>8)];
}
function bytesFromU32(v) {
    return [0xFF & v, 0xFF & (v>>8), 0xFF & (v>>16), 0xFF & (v>>24)];
}


// Visualization

var prev_t = null;

function visualize(canvas, sound, audio) {
    canvasUpdate(canvas, function(pixbuf, width, height) {
        var samples = sound.bytes;
        var p = 0;
        for (var y = 0; y < height; ++y) {
            for (var x = 0; x < width; ++x) {
                var s = samples[height * x + y];
                pixbuf[p++] = s;
                pixbuf[p++] = s;
                pixbuf[p++] = s;
                pixbuf[p++] = 0xFF;
            }
        }
    });
    if (audio)
        audio.ontimeupdate = function() {
            updateViz(canvas, audio, sound.rate);
        };
    prev_t = null;
}

function updateViz(canvas, audio, rate) {
    canvasUpdate(canvas, function(pixbuf, width, height) {
        if (prev_t !== null)
            flip(prev_t);
        var t = Math.floor((audio.currentTime * rate) / height);
        flip(t); prev_t = t;

        function flip(x) {
            if (x < width) {
                for (var y = 0; y < height; ++y) {
                    var p = 4 * (width * y + x);
                    pixbuf[p+3] ^= 0xC0; // Toggle translucency at (x,y)
                }
            }
        }
    });
}

function canvasUpdate(canvas, f) {
    var ctx = canvas.getContext("2d");
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    f(imageData.data, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);
}
