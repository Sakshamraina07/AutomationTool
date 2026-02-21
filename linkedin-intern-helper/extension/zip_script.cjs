const fs = require('fs');
const archiver = require('archiver');

const output = fs.createWriteStream('mainextensionv2.zip');
const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
});

output.on('close', function () {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.on('error', function (err) {
    throw err;
});

archive.pipe(output);

archive.directory('dist/', false);

archive.finalize();
