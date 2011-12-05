function audioFromExpression(code, frequency, duration) {
    return makeAudioURI(frequency,
                        makeSound(compileComposer(code),
                                  frequency * duration));
}

function compileComposer(text) {
    return eval("(function(t) { return "
                + (text
                   .replace(/sin/g, "Math.sin")
                   .replace(/cos/g, "Math.cos")
                   .replace(/tan/g, "Math.tan")
                   .replace(/floor/g, "Math.floor")
                   .replace(/ceil/g, "Math.ceil"))
                + "})");
}

function makeSound(composer, nsamples) {
    var result = [];
    for (var t = 0; t < nsamples; ++t) {
        var sample = 0xFF & composer(t);
        result.push(sample);
    }
    return result;
}

function makeAudioURI(frequency, samples) {
    var bitsPerSample = 8;
    var channels = 1;
    return "data:audio/x-wav," + hexEncodeURI(RIFFChunk(channels, bitsPerSample,
                                                        frequency, samples));
}

var hexCodes = (function () {
    var result = [];
    for (var b = 0; b < 256; ++b) {
        var hex = b.toString(16);
        if (hex.length === 1) hex = "0" + hex;
        result.push("%" + hex);
    }
    return result;
})();
    
// [255, 0] -> "%FF%00"
function hexEncodeURI(values) {
    var codes = [];
    for (var i = 0; i < values.length; ++i)
        codes.push(hexCodes[values[i]]);
    return codes.join('');
}

function RIFFChunk(channels, bitsPerSample, frequency, samples) {
    var fmt = FMTSubChunk(channels, bitsPerSample, frequency);
    var data = dataSubChunk(channels, bitsPerSample, samples);
    var header = [].concat(cc("RIFF"), chunkSize(fmt, data), cc("WAVE"));
    return [].concat(header, fmt, data);
}

function chunkSize(fmt, data) {
    return bytesFromU32(4 + (8 + fmt.length) + (8 + data.length));
}

function FMTSubChunk(channels, bitsPerSample, frequency) {
    var byteRate = frequency * channels * bitsPerSample/8;
    var blockAlign = channels * bitsPerSample/8;
    return [].concat(
        cc("fmt "),
        bytesFromU32(16), // Subchunk1Size for PCM
        [1, 0], // PCM is 1, split to 16 bit
        [channels, 0], 
        bytesFromU32(frequency),
        bytesFromU32(byteRate),
        [blockAlign, 0],
        [bitsPerSample, 0]
    );
}

function dataSubChunk(channels, bitsPerSample, samples) {
    return [].concat(
        cc("data"),
        bytesFromU32(channels * samples.length * bitsPerSample/8),
        samples
    );
}

// String to array of byte values.
function cc(str) {
    var result = [];
    for (var i = 0; i < str.length; ++i) {
        result.push(str.charCodeAt(i)); // XXX check that it's a byte
    }
    return result;
}

function bytesFromU32(v) {
    return [0xFF & v, 0xFF & (v>>8), 0xFF & (v>>16), 0xFF & (v>>24)];
}
