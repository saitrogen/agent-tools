const { spawn } = require('child_process');

function playAudio(filePath) {
  return new Promise((resolve, reject) => {
    // macOS has afplay built-in
    const player = spawn('afplay', [filePath], { stdio: 'inherit' });

    player.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`afplay exited with code ${code}`));
      }
    });

    player.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = {
  playAudio
};
