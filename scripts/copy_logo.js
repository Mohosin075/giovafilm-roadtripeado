const fs = require('fs');
const path = require('path');

const src = 'd:/Mohosin/projects/dashboard/giovafilm_mapping/public/logo.png';
const dest1 = 'd:/Mohosin/projects/giovafilm-roadtripeado/uploads/images/logo.png';
const dest2 = 'd:/Mohosin/projects/giovafilm-roadtripeado/uploads/logo.png';

fs.mkdirSync(path.dirname(dest1), { recursive: true });
fs.mkdirSync(path.dirname(dest2), { recursive: true });

fs.copyFileSync(src, dest1);
fs.copyFileSync(src, dest2);

console.log('COPIED_LOGO_SUCCESS');
