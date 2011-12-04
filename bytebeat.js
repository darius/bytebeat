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
        result.push(Math.max(0, Math.min(sample * 256, 65535)));
    }
    return result;
}

function makeAudioURI(frequency, samples) {
    var bitsPerSample = 16;    
    var channels = 1;
    return "data:audio/x-wav," + hexEncodeURI(RIFFChunk(channels, bitsPerSample,
                                                        frequency, samples));
}
    
// [255, 0] -> "%FF%00"
function hexEncodeURI(values) {
    var result = "";
    for (var i = 0; i < values.length; ++i) {
        var hex = values[i].toString(16);
        if (hex.length === 1) hex = "0" + hex;
        result += "%" + hex;
    }
    return result.toUpperCase();
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
        bytesFromU32(samples.length * channels * bitsPerSample/8),
        samplesToData(samples, bitsPerSample)
    );
}

function samplesToData(samples, bitsPerSample) {
    if (bitsPerSample === 8)
        return samples;
    if (bitsPerSample !== 16) {
        alert("Only 8 or 16 bit supported.");
        return;
    }
    var data = [];
    for (var i = 0; i < samples.length; ++i) {
        data.push(0xFF & samples[i]);
        data.push(0xFF & (samples[i] >> 8));
    }
    return data;
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
