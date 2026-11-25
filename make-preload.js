/* Vercel build step: lists the .jar files in Preload/ into Preload/index.json.
   (GitHub Pages does not need this - the app asks the GitHub API instead.) */
const fs = require('fs');
if (fs.existsSync('Preload')) {
  const list = fs.readdirSync('Preload').filter(f => /\.jar$/i.test(f)).sort();
  fs.writeFileSync('Preload/index.json', JSON.stringify(list, null, 1));
  console.log('Preload: ' + list.length + ' jar(s)');
} else console.log('No Preload folder');
